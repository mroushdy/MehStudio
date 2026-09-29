"""Serial pressure-acoustics FEM prototype, exp(+j omega t), SI and RMS.

Ports use real normal-motion shapes beta, normalized by integral(beta)=1.
U is volume velocity INTO the domain. p_port = integral(beta*p).
K p - k² M p = +j omega rho B U. Z = B.T A^-1 j omega rho B.
Only passive rigid walls and lossless air here; no hidden damping.
"""
from pathlib import Path
import time
import json
import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import splu, eigsh
from mpi4py import MPI
from petsc4py import PETSc
from dolfinx import fem, mesh
from dolfinx.fem import petsc as fp
import ufl

CACHE = str(Path(__file__).parent / 'cache' / 'ffcx')
JIT = {'cache_dir': CACHE}


def _csr(form):
    obj = fp.assemble_matrix(fem.form(form, jit_options=JIT))
    obj.assemble()
    row, col, val = obj.getValuesCSR()
    out = sp.csr_matrix((val.copy(), col.copy(), row.copy()), shape=obj.getSize())
    obj.destroy()
    return out


def _vector(form):
    obj = fp.assemble_vector(fem.form(form, jit_options=JIT))
    obj.ghostUpdate(addv=PETSc.InsertMode.ADD, mode=PETSc.ScatterMode.REVERSE)
    out = obj.array.copy()
    obj.destroy()
    return out


class PortFEM:
    def __init__(self, domain, facet_tags, port_specs, degree=1, rho=1.204, c=343.):
        started = time.perf_counter()
        assert MPI.COMM_WORLD.size == 1, 'Prototype matrix extraction is serial only.'
        assert np.issubdtype(PETSc.ScalarType, np.complexfloating)
        self.domain = domain
        self.verbose = False
        self.tags = facet_tags
        self.rho, self.c, self.degree = rho, c, degree
        self.V = fem.functionspace(domain, ('Lagrange', degree))
        p, v = ufl.TrialFunction(self.V), ufl.TestFunction(self.V)
        self.ds = ufl.Measure('ds', domain=domain, subdomain_data=facet_tags)
        self.K = _csr(ufl.inner(ufl.grad(p), ufl.grad(v))*ufl.dx)
        self.M = _csr(ufl.inner(p,v)*ufl.dx)
        self.volume = float(fem.assemble_scalar(fem.form(1*ufl.dx(domain), jit_options=JIT)).real)
        self.port_info, columns = [], []
        n = ufl.FacetNormal(domain)
        for spec in port_specs:
            tag = spec['tag']
            area = float(fem.assemble_scalar(fem.form(1*self.ds(tag), jit_options=JIT)).real)
            assert area > 0, f'Empty port tag {tag}'
            shape = ufl.dot(n, ufl.as_vector(spec['axis'])) if 'axis' in spec else 1
            projected = float(fem.assemble_scalar(fem.form(shape*self.ds(tag), jit_options=JIT)).real)
            assert abs(projected) > 1e-12
            vec = _vector((shape/projected)*ufl.conj(v)*self.ds(tag))
            columns.append(vec)
            self.port_info.append({'name':spec['name'], 'tag':tag,'surface_area_m2':area,
                'signed_projected_area_m2':projected,'shape_integral':float(vec.sum().real)})
        self.B = np.column_stack(columns)
        self.metadata = {'dofs':self.K.shape[0], 'cells':domain.topology.index_map(domain.topology.dim).size_local,
            'degree':degree,'volume_m3':self.volume,'ports':self.port_info,
            'assembly_s':time.perf_counter()-started}

    def solve(self, frequencies, keep_fields=False):
        matrices, diagnostics, fields = [], [], []
        for index,frequency in enumerate(frequencies):
            started = time.perf_counter()
            omega = 2*np.pi*frequency
            A = (self.K-(omega/self.c)**2*self.M).tocsc()
            rhs = 1j*omega*self.rho*self.B
            # This explicitly lossless model has real K/M and real port bases.
            # Factoring the same real operator avoids unnecessary complex LU.
            # Keep a complex fallback if this core is later given complex data.
            real_operator = not np.any(A.data.imag) and not np.any(self.B.imag)
            if real_operator:
                Ar = sp.csc_matrix((np.ascontiguousarray(A.data.real),A.indices.copy(),A.indptr.copy()),shape=A.shape)
                lu = splu(Ar)
                P = 1j*lu.solve(omega*self.rho*self.B.real)
            else:
                lu = splu(A)
                P = lu.solve(rhs)
            Z = self.B.T@P
            scale = max(float(np.linalg.norm(Z)),1.)
            reciprocity = float(np.linalg.norm(Z-Z.T)/scale)
            H = (Z+Z.conj().T)/2
            passive = np.linalg.eigvalsh(H)
            residual = float(np.linalg.norm(A@P-rhs)/np.linalg.norm(rhs))
            matrices.append(Z)
            diagnostics.append({'frequency_hz':float(frequency),'solve_s':time.perf_counter()-started,
                'relative_residual':residual,'reciprocity_error':reciprocity,
                'factorization':'real SuperLU; imaginary source' if real_operator else 'complex SuperLU',
                'hermitian_real_eigenvalues':passive.tolist(),'passivity_min_normalized':float(passive[0]/scale)})
            if keep_fields: fields.append(P)
            callback=getattr(self,'on_row',None)
            if callback is not None: callback(index,float(frequency),Z,diagnostics[-1])
            if self.verbose and (index%5==0 or index==len(frequencies)-1):
                print(json.dumps({'stage':'frequency','hz':float(frequency),'solve_s':diagnostics[-1]['solve_s']}),flush=True)
        return np.array(matrices), diagnostics, fields

    def eigenfrequencies(self, number=8):
        values = eigsh(self.K.real, M=self.M.real, k=number+1, sigma=1e-5,
                       which='LM', return_eigenvectors=False)
        values = np.sort(values)
        return self.c/(2*np.pi)*np.sqrt(values[values>1e-4])[:number]

    def save_field(self, coeff, filename):
        from dolfinx.io import VTXWriter
        f = fem.Function(self.V)
        f.name = 'pressure_pa_per_m3_s'
        f.x.array[:] = coeff
        with VTXWriter(self.domain.comm, str(filename), [f], engine='BP4') as writer:
            writer.write(0.)


def box_mesh(length, width, height, subdivisions):
    domain = mesh.create_box(MPI.COMM_WORLD, [np.zeros(3), [length,width,height]],
        subdivisions, mesh.CellType.tetrahedron)
    dim = domain.topology.dim-1
    a = mesh.locate_entities_boundary(domain, dim, lambda x: np.isclose(x[0],0.,atol=1e-10))
    b = mesh.locate_entities_boundary(domain, dim, lambda x: np.isclose(x[0],length,atol=1e-10))
    ids = np.concatenate([a,b]).astype(np.int32)
    vals = np.concatenate([np.ones(len(a))*2,np.ones(len(b))*3]).astype(np.int32)
    ix=np.argsort(ids)
    tags = mesh.meshtags(domain,dim,ids[ix],vals[ix])
    return domain,tags


def terminate_two_port(Z, load):
    """Terminate port 1 by outward flow into load; returns input Z, Uout/Uin."""
    transfer = Z[...,1,0]/(Z[...,1,1]+load)
    return Z[...,0,0]-Z[...,0,1]*transfer, transfer


def complex_json(value):
    a = np.asarray(value)
    return {'real':a.real.tolist(),'imag':a.imag.tolist()}
