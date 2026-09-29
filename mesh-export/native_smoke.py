#!/usr/bin/env python3
"""Native import/assembly/solve check, not a radiating-horn prediction.

exp(+j omega t), SI, RMS, rigid walls. Every source Q is INTO the air.
The artificial front truncation plane gets a LOCAL plane-wave Robin load
(dp/dn=-ikp), not a coupled exterior or a validated mouth impedance.
Run using the read-only research environment; all JIT/output files are local.
"""
from pathlib import Path
import argparse, hashlib, json, platform, time
import numpy as np
import scipy.sparse as sp
from scipy.sparse.csgraph import connected_components
from mpi4py import MPI
from petsc4py import PETSc
import dolfinx
from dolfinx import fem
from dolfinx.fem import petsc as fp
from dolfinx.io import gmsh as gmshio
import ufl


def matrix_json(a):
    return {'real': np.asarray(a).real.tolist(), 'imag': np.asarray(a).imag.tolist()}


def write(report, output):
    Path(output).write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')


def run(mesh_path, manifest_path, output, frequencies=(100.,700.), max_iterations=1200):
    started=time.monotonic();output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    manifest=json.loads(Path(manifest_path).read_text())
    report={'schema':'meh-native-mesh-smoke/v1','passed':False,'status':'in progress',
            'design_sha256':manifest['design_sha256'],
            'mesh_sha256':hashlib.sha256(Path(mesh_path).read_bytes()).hexdigest(),
            'scope':'Native format, connected volume, boundary coverage, P1 Helmholtz assembly and algebraic checks only.',
            'exterior_coupling':'NONE: local plane-wave Robin condition on an artificial FEM truncation plane.',
            'physical_accuracy_validated':False,'convergence_validated':False,
            'source_amplitude':'1 m3/s RMS INTO front air per independent cone-motion basis; not saved electrical voltage',
            'phasor':'exp(+j omega t)','rows':[],
            'software':{'python':platform.python_version(),'dolfinx':dolfinx.__version__,'petsc':'.'.join(map(str,PETSc.Sys.getVersion())),'petsc_scalar':str(PETSc.ScalarType)}}
    write(report,output)
    try:
        if MPI.COMM_WORLD.size!=1:raise ValueError('This inspection prototype requires serial execution.')
        if not np.issubdtype(PETSc.ScalarType,np.complexfloating):raise ValueError('Complex PETSc is required.')
        md=gmshio.read_from_msh(str(mesh_path),MPI.COMM_WORLD,0,gdim=3)
        domain,ft,ct=md.mesh,md.facet_tags,md.cell_tags
        if ft is None or ct is None:raise ValueError('Missing physical boundary or volume tags.')
        # P1 cell geometry; orientation may be permuted by the importer, so use
        # the determinant magnitude for degeneracy, not a vertex-order sign.
        xyz=domain.geometry.x[domain.geometry.dofmaps[0]]
        determinants=np.einsum('ij,ij->i',xyz[:,1]-xyz[:,0],np.cross(xyz[:,2]-xyz[:,0],xyz[:,3]-xyz[:,0]))
        if not np.isfinite(determinants).all() or np.min(np.abs(determinants))<=1e-24:raise ValueError('Zero, nonfinite or numerically degenerate tetrahedral Jacobian.')
        minimum_tet_volume=float(np.min(np.abs(determinants))/6)
        del xyz,determinants
        td=domain.topology.dim;domain.topology.create_connectivity(td-1,td)
        link=domain.topology.connectivity(td-1,td);sizes=np.diff(link.offsets)
        if np.any((sizes<1)|(sizes>2)):raise ValueError('Nonmanifold volume facet adjacency.')
        interior=np.flatnonzero(sizes==2);boundary=np.flatnonzero(sizes==1)
        rows=link.array[link.offsets[interior]];cols=link.array[link.offsets[interior]+1]
        cells=domain.topology.index_map(td).size_local
        graph=sp.csr_matrix((np.ones(len(rows),dtype=np.uint8),(rows,cols)),shape=(cells,cells))
        components,_=connected_components(graph,directed=False)
        if components!=1:raise ValueError(f'Air volume contains {components} disconnected cell components.')
        tagged=np.asarray(ft.indices);tag_values=np.asarray(ft.values)
        if len(np.unique(tagged))!=len(tagged):raise ValueError('Multiply tagged physical boundary facet.')
        if len(np.setdiff1d(boundary,tagged)) or len(np.setdiff1d(tagged,boundary)):raise ValueError('Boundary tags do not cover exactly all exterior cell facets.')
        if len(np.unique(ct.indices))!=cells:raise ValueError('Physical volume tag does not cover every cell.')
        allowed={10,11,301,302}|{int(d['source_tag'])for d in manifest['drivers']}
        if set(map(int,tag_values))!=allowed:raise ValueError('Unexpected or missing front boundary tags: '+str(sorted(set(tag_values))))
        del graph,rows,cols,interior
        jit={'cache_dir':str(output.parent/'native-smoke-cache')}
        V=fem.functionspace(domain,('Lagrange',1));trial,test=ufl.TrialFunction(V),ufl.TestFunction(V)
        ds=ufl.Measure('ds',domain=domain,subdomain_data=ft)
        def scalar(form):return fem.assemble_scalar(fem.form(form,jit_options=jit))
        def matrix(form):
            a=fp.assemble_matrix(fem.form(form,jit_options=jit));a.assemble();return a
        def vector(form):
            b=fp.assemble_vector(fem.form(form,jit_options=jit));b.ghostUpdate(addv=PETSc.InsertMode.ADD,mode=PETSc.ScatterMode.REVERSE);return b
        area_by_tag={str(t):float(scalar(1*ds(t)).real)for t in sorted(allowed)}
        volume=float(scalar(1*ufl.dx(domain)).real)
        if not volume>0 or any(v<=0 for v in area_by_tag.values()):raise ValueError('Nonpositive integrated volume or tagged boundary area.')
        report['mesh']={'tetrahedra':cells,'pressure_dofs':V.dofmap.index_map.size_local,'connected_cell_components':int(components),'boundary_facets':len(boundary),'exact_boundary_tag_coverage':True,'volume_tag_coverage':True,'volume_tags':np.unique(ct.values).tolist(),'volume_m3':volume,'minimum_tetrahedron_volume_m3':minimum_tet_volume,'boundary_area_m2':area_by_tag}
        print(json.dumps({'stage':'native-import','tetrahedra':cells,'dofs':report['mesh']['pressure_dofs']}),flush=True);write(report,output)
        K=matrix(ufl.inner(ufl.grad(trial),ufl.grad(test))*ufl.dx)
        M=matrix(ufl.inner(trial,test)*ufl.dx)
        C=matrix(ufl.inner(trial,test)*ds(301))
        normals=ufl.FacetNormal(domain);basis=[];ports=[]
        for driver in manifest['drivers']:
            tag=int(driver['source_tag']);axis=ufl.as_vector(driver['motion_into_front_air'])
            shape=-ufl.dot(normals,axis)
            projected=float(scalar(shape*ds(tag)).real)
            expected=float(driver['projected_mesh_area_m2'])
            if not projected>0 or abs(projected/expected-1)>.002:raise ValueError('Source projection differs from canonical cone '+driver['id'])
            b=vector((shape/projected)*ufl.conj(test)*ds(tag))
            if abs(b.sum()-1)>1e-8:raise ValueError('Source basis does not integrate to unit volume flow.')
            basis.append(b);ports.append({'id':driver['id'],'tag':tag,'projected_area_m2':projected,'surface_area_m2':area_by_tag[str(tag)],'basis_integral':float(b.sum().real)})
        report['ports']=ports;report['assembly_s']=time.monotonic()-started
        report['solver']='PETSc GMRES, positive shifted-Laplace GAMG preconditioner, independent true residual check'
        print(json.dumps({'stage':'native-assembled','seconds':report['assembly_s']}),flush=True);write(report,output)
        rho=float(manifest.get('medium',{}).get('density_kg_m3',1.204));c=float(manifest.get('medium',{}).get('sound_speed_m_s',343.))
        report['medium']={'density_kg_m3':rho,'sound_speed_m_s':c}
        for frequency in frequencies:
            if not np.isfinite(frequency) or frequency<=0:raise ValueError('Frequency must be finite and positive.')
            now=time.monotonic();omega=2*np.pi*frequency;k=omega/c
            A=K.copy();A.axpy(-k*k,M,structure=PETSc.Mat.Structure.SAME_NONZERO_PATTERN);A.axpy(1j*k,C,structure=PETSc.Mat.Structure.SUBSET_NONZERO_PATTERN);A.assemble()
            P=K.copy();P.axpy(k*k+1,M,structure=PETSc.Mat.Structure.SAME_NONZERO_PATTERN);P.assemble()
            solver=PETSc.KSP().create(domain.comm);solver.setOptionsPrefix('meh_smoke_');solver.setOperators(A,P);solver.setType('gmres');solver.setPCSide(PETSc.PC.Side.RIGHT);solver.setNormType(PETSc.KSP.NormType.UNPRECONDITIONED);solver.setGMRESRestart(100);solver.setTolerances(rtol=1e-9,atol=1e-11,max_it=max_iterations);solver.getPC().setType('gamg')
            opts=PETSc.Options();opts['meh_smoke_mg_levels_ksp_type']='richardson';opts['meh_smoke_mg_levels_ksp_max_it']=2;opts['meh_smoke_mg_levels_pc_type']='jacobi';opts['meh_smoke_mg_coarse_ksp_type']='preonly';opts['meh_smoke_mg_coarse_pc_type']='lu';solver.setFromOptions()
            Z=np.zeros((len(basis),len(basis)),dtype=complex);residuals=[];powers=[];iterations=[]
            for column,b in enumerate(basis):
                rhs=b.copy();rhs.scale(1j*omega*rho);solution=rhs.duplicate();solution.set(0);solver.solve(rhs,solution)
                residual=rhs.duplicate();A.mult(solution,residual);residual.axpy(-1,rhs);relative=float(residual.norm()/rhs.norm())
                if solver.getConvergedReason()<=0 or not np.isfinite(relative) or relative>1e-7:raise RuntimeError(f'GMRES did not converge at {frequency} Hz source {column}: reason {solver.getConvergedReason()}, true residual {relative}')
                for row,brow in enumerate(basis):Z[row,column]=brow.dot(solution)
                work=solution.duplicate();C.mult(solution,work);radiated=float(solution.dot(work).real/(rho*c));supplied=float(Z[column,column].real)
                powers.append({'input_w_for_unit_flow':supplied,'robin_outflow_w_for_unit_flow':radiated,'relative_power_balance_error':abs(supplied-radiated)/max(abs(supplied),abs(radiated),1.)});residuals.append(relative);iterations.append(solver.getIterationNumber())
                print(json.dumps({'stage':'native-source','frequency_hz':frequency,'source':column+1,'iterations':iterations[-1],'true_residual':relative}),flush=True)
                rhs.destroy();solution.destroy();residual.destroy();work.destroy()
            scale=max(float(np.linalg.norm(Z)),1.);reciprocity=float(np.linalg.norm(Z-Z.T)/scale);passivity=np.linalg.eigvalsh((Z+Z.conj().T)/2)
            row={'frequency_hz':frequency,'impedance_Pa_s_m3':matrix_json(Z),'true_relative_residuals':residuals,'iterations':iterations,'reciprocity_relative_error':reciprocity,'hermitian_real_eigenvalues':passivity.tolist(),'passivity_minimum_normalized':float(passivity[0]/scale),'power_balance':powers,'solve_s':time.monotonic()-now}
            row['passed']=bool(reciprocity<1e-5 and passivity[0]/scale>-1e-6 and max(x['relative_power_balance_error']for x in powers)<1e-5)
            report['rows'].append(row);write(report,output);solver.destroy();A.destroy();P.destroy()
            if not row['passed']:raise RuntimeError(f'Algebraic reciprocity/passivity/power check failed at {frequency} Hz')
        for a in [K,M,C,*basis]:a.destroy()
        report['passed']=True;report['status']='completed numerical smoke checks; not acoustically validated';report['runtime_s']=time.monotonic()-started;write(report,output)
        return report
    except Exception as e:
        report['status']='failed';report['error']=str(e);report['runtime_s']=time.monotonic()-started;write(report,output);raise


def analytic_duct(directory,frequencies=(100.,700.),size_mm=10.):
    """Reproducible normal-incidence anechoic duct benchmark: Z=rho*c/S.

    Artificial side tags 11/302 exercise the same complete-coverage reader as
    the MEH model; they are both rigid here. No horn geometry is represented.
    """
    import gmsh
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    if not .5<=size_mm<=25:raise ValueError('Duct benchmark size must be 0.5–25 mm.')
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0);gmsh.model.add('analytic_duct')
    try:
        volume=gmsh.model.occ.addBox(0,0,0,.1,.1,.1);gmsh.model.occ.synchronize();groups={}
        for _,tag in gmsh.model.getBoundary([(3,volume)],oriented=False):
            x,y,z=gmsh.model.occ.getCenterOfMass(2,tag)
            physical=101 if z<1e-8 else 301 if z>.09999 else 11 if x<1e-8 else 302 if x>.09999 else 10
            groups.setdefault(physical,[]).append(tag)
        for physical,surfaces in groups.items():gmsh.model.addPhysicalGroup(2,surfaces,physical)
        gmsh.model.addPhysicalGroup(3,[volume],401);gmsh.option.setNumber('Mesh.MeshSizeMax',size_mm*.001);gmsh.option.setNumber('Mesh.MeshSizeMin',size_mm*.001);gmsh.model.mesh.generate(3);gmsh.write(str(directory/'duct.msh'))
    finally:gmsh.finalize()
    manifest={'design_sha256':hashlib.sha256(b'analytic 0.1 m square duct, 0.1 m long, anechoic plane load').hexdigest(),'drivers':[{'id':'piston','source_tag':101,'motion_into_front_air':[0,0,1],'projected_mesh_area_m2':.01}]}
    mp=directory/'manifest.json';mp.write_text(json.dumps(manifest,indent=2)+'\n');output=directory/'report.json'
    result=run(directory/'duct.msh',mp,output,frequencies)
    exact=1.204*343/.01;comparisons=[]
    for row in result['rows']:
        measured=complex(row['impedance_Pa_s_m3']['real'][0][0],row['impedance_Pa_s_m3']['imag'][0][0])
        comparisons.append({'frequency_hz':row['frequency_hz'],'relative_complex_impedance_error':abs(measured/exact-1)})
    result['analytic_benchmark']={'geometry':'0.1 m square uniform duct, 0.1 m long','target_edge_mm':size_mm,'exact_input_impedance_Pa_s_m3':exact,'reference':'Exact normal-incidence plane-wave solution Z=rho*c/S for an anechoically terminated rigid duct','comparisons':comparisons,'passed':max(r['relative_complex_impedance_error']for r in comparisons)<.01,'scope':'Checks this numerical formulation; not a validation of the MEH geometry or its radiation.'}
    result['passed']=result['passed'] and result['analytic_benchmark']['passed'];write(result,output)
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('mesh',nargs='?');p.add_argument('--manifest');p.add_argument('--out');p.add_argument('--frequencies',default='100,700');p.add_argument('--max-iterations',type=int,default=1200);p.add_argument('--analytic-duct',help='Generate and solve a separate exact plane-wave duct benchmark in this directory');p.add_argument('--benchmark-size-mm',type=float,default=10.);a=p.parse_args()
    if a.analytic_duct:result=analytic_duct(a.analytic_duct,[float(x)for x in a.frequencies.split(',')],a.benchmark_size_mm)
    else:
        if not a.mesh or not a.manifest or not a.out:p.error('mesh, --manifest and --out are required for a native mesh solve')
        result=run(a.mesh,a.manifest,a.out,[float(x)for x in a.frequencies.split(',')],a.max_iterations)
    print(json.dumps({'passed':result['passed'],'dofs':result['mesh']['pressure_dofs'],'runtime_s':result['runtime_s'],'physical_accuracy_validated':False}),flush=True)
    if not result['passed']:raise SystemExit(1)
