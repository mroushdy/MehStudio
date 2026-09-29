from pathlib import Path
import argparse,json,time,hashlib,sys,platform
import numpy as np
import scipy,dolfinx,gmsh
from mpi4py import MPI
from petsc4py import PETSc
from dolfinx.io import gmsh as gmshio
from dolfinx import fem,geometry
from fem_core import PortFEM,terminate_two_port


def matrix_rows(z):
    return [[{'r':float(q.real),'i':float(q.imag)} for q in row] for row in z]


def sample_pressure_basis(model, fields):
    """Evaluate both unit inward-flow fields on the identical masked centre grid."""
    xs=np.linspace(-.073,.073,241);zs=np.linspace(-.032,.021,129)
    xx,zz=np.meshgrid(xs,zs)
    points=np.column_stack([xx.ravel(),np.full(xx.size,1e-10),zz.ravel()])
    tree=geometry.bb_tree(model.domain,3)
    candidates=geometry.compute_collisions_points(tree,points)
    collisions=geometry.compute_colliding_cells(model.domain,candidates,points)
    valid=[];cells=[]
    for j in range(len(points)):
        hit=collisions.links(j)
        if len(hit):valid.append(j);cells.append(hit[0])
    sampled=[]
    f=fem.Function(model.V)
    for column in range(fields.shape[1]):
        f.x.array[:]=fields[:,column]
        sampled.append(f.eval(points[valid],np.array(cells,dtype=np.int32)).ravel())
    return {'plane':'local v=0 (evaluated at v=1e-10 m); x=u, vertical=z',
        'xM':xs.tolist(),'zM':zs.tolist(),'validFlatIndices':valid},np.column_stack(sampled)


def solve_front(surface_path,mesh_path,target,degree=1,frequencies=None,slice_output=False,eigen=False,basis_slice=False):
    started=time.perf_counter()
    surface=json.loads(Path(surface_path).read_text())
    meshmeta=json.loads(Path(str(mesh_path)+'.json').read_text())
    frequencies=np.asarray(frequencies if frequencies is not None else np.arange(100.,1001.,25.))
    meshdata=gmshio.read_from_msh(str(mesh_path),MPI.COMM_WORLD,0,gdim=3)
    md=surface['metadata']
    model=PortFEM(meshdata.mesh,meshdata.facet_tags,[{'tag':2,'name':'cone','axis':[0,0,1]},
        {'tag':3,'name':'horn_entry_interface'}],degree=degree,c=md['source_state']['soundSpeed'])
    print(json.dumps({'stage':'assembled',**model.metadata}),flush=True)
    model.verbose=True
    checkpoints=[]
    def checkpoint(index,frequency,z,diag):
        checkpoints.append({'frequencyHz':frequency,'impedance':matrix_rows(z),'diagnostics':diag})
        Path(str(target)+'.checkpoint.json').write_text(json.dumps({'available':False,
            'status':'In progress; unqualified checkpoint','meshSha256':meshmeta['meshSha256'],
            'geometrySourceSha256':md['editor_sha256'],'rows':checkpoints},indent=2))
        print(json.dumps({'stage':'checkpoint','frequencyHz':frequency,'solve_s':diag['solve_s']}),flush=True)
    model.on_row=checkpoint
    modes=model.eigenfrequencies(5).tolist() if eigen else []
    if modes: print(json.dumps({'stage':'closed_domain_modes','frequency_hz':modes}),flush=True)
    Z,diagnostics,fields=model.solve(frequencies,keep_fields=slice_output or basis_slice)
    load=model.rho*model.c/model.port_info[1]['surface_area_m2']
    zin,transfer=terminate_two_port(Z,load)
    rows=[]
    for i,f in enumerate(frequencies):
        diag=diagnostics[i]
        if modes: diag['nearest_closed_mode_relative_distance']=float(min(abs(f-n)/n for n in modes))
        diag['reference_load_power_residual_normalized']=float(abs(zin[i].real-load*abs(transfer[i])**2)/max(1.,abs(zin[i]),load*abs(transfer[i])**2))
        rows.append({'frequencyHz':float(f),'impedance':matrix_rows(Z[i]),'diagnostics':diag,
            'referenceLoad':{'resistancePaSM3':load,'inputImpedance':{'r':float(zin[i].real),'i':float(zin[i].imag)},
             'outflowOverConeFlow':{'r':float(transfer[i].real),'i':float(transfer[i].imag)}}})
    payload={'schemaVersion':1,'available':False,'qualification':'Pending independent mesh comparison',
        'geometrySourceSha256':md['editor_sha256'],'userDesignSha256':md['user_study_sha256'],
        'airSurfaceSha256':hashlib.sha256(Path(surface_path).read_bytes()).hexdigest(),
        'geometryPayloadSha256':md['geometry_sha256'],'meshSha256':meshmeta['meshSha256'],
        'inputState':md['source_state'],'case':md['case'],'model':'3D lossless pressure FEM, rigid assumed cone, real weighted two-port',
        'software':{'python':platform.python_version(),'platform':platform.system(),'machine':platform.machine(),
          'dolfinx':dolfinx.__version__,'petsc':'.'.join(map(str,PETSc.Sys.getVersion())),
          'petscScalarType':str(PETSc.ScalarType),'gmsh':gmsh.__version__,'numpy':np.__version__,
          'scipy':scipy.__version__,'linearSolver':'SciPy SuperLU, COLAMD, serial',
          'assembly':'DOLFINx/UFL with complex PETSc matrices'},
        'medium':{'densityKgM3':model.rho,'soundSpeedMS':model.c},
        'conventions':{'time':'exp(+j omega t)','amplitude':'RMS','flow':'m3/s INTO local air domain',
          'pressure':'Pa, weighted port pressure power-conjugate to the normalized motion shape','impedance':'Pa s/m3'},
        'ports':{'coneProjectedAreaM2':model.port_info[0]['signed_projected_area_m2'],
           'nominalSdM2':md['catalog_sd_m2'],'sourceBasis':'beta=n_air dot (+z) / coneProjectedAreaM2; inward rigid cone motion is along -z',
           'outletBasis':'uniform inward normal velocity over nonplanar horn-entry star-fan interface',
           'metadata':model.port_info,'interface':md['interface']},
        'assumptions':['Unmeasured conical diaphragm surrogate; no physical dust-cap/surround or breakup.',
          'Rigid walls and lossless air; no viscothermal gap losses, turbulence, or thermal compression.',
          'Uniform outlet port mode; actual horn junction scattering and nonuniform modal coupling omitted.',
          'Curved perimeter comes from canonical geometry; artificial star-fan interior defines the outlet interface.',
          'Whole front passage included; do not add neck mass or end correction again.',
          'No motor, horn exterior, crossover or far-field SPL is predicted by this dataset.'],
        'airGeometry':{'volumeM3':model.volume,'surfaceVolumeM3':md['signed_volume_m3'],
          'editorFrontVolumeM3':md['editor_front_air_cm3']*1e-6,'volumeExplanation':md['differences_from_editor_volume'],
          'checks':md['checks']},'mesh':meshmeta,'fem':model.metadata,'rows':rows,
        'closedDomainModeFrequencyHz':modes,'totalRuntimeS':time.perf_counter()-started}
    if slice_output or basis_slice:
        ind=np.flatnonzero(np.isclose(frequencies,700.))
        if len(ind):
            i=int(ind[0]);grid,sampled=sample_pressure_basis(model,fields[i])
            if slice_output:
                q=1e-5;vals=q*(sampled[:,0]-transfer[i]*sampled[:,1])
                slice_data={'frequencyHz':700.,'coneFlowRmsM3S':q,'loadResistancePaSM3':load,
                    **grid,'pressureRealPa':vals.real.tolist(),'pressureImagPa':vals.imag.tolist()}
                spath=Path(str(target)+'.slice.json');spath.write_text(json.dumps(slice_data))
                payload['pressureSliceFile']=spath.name
            if basis_slice:
                basis_data={'schemaVersion':1,'frequencyHz':700.,**grid,
                    'geometrySourceSha256':payload['geometrySourceSha256'],
                    'userDesignSha256':payload['userDesignSha256'],
                    'airSurfaceSha256':payload['airSurfaceSha256'],
                    'meshSha256':payload['meshSha256'],'fem':model.metadata,
                    'conventions':payload['conventions'],'ports':payload['ports'],
                    'basisUnits':'Pa per (m3/s RMS INTO the named port)',
                    'basis':[{'portIndex':j,'portName':model.port_info[j]['name'],
                        'pressureRealPaPerM3S':sampled[:,j].real.tolist(),
                        'pressureImagPaPerM3S':sampled[:,j].imag.tolist()} for j in range(2)],
                    'reconstruction':'p = Q1_inward * basis[0] + Q2_inward * basis[1]; for an outward horn-entry flow Qentry and catalog cone flow Qcatalog, Q1=(Sm/Sd)*Qcatalog and Q2=-Qentry',
                    'impedance':matrix_rows(Z[i]),'diagnostics':diagnostics[i],
                    'pointwiseFieldConvergenceAssessed':False,
                    'qualification':'Unit-flow fields require a matching qualified port matrix and solved boundary flows; pointwise field convergence is not assessed.'}
                bpath=Path(str(target)+'.basis-slice.json');bpath.write_text(json.dumps(basis_data))
                payload['pressureBasisSliceFile']=bpath.name
    payload['totalRuntimeS']=time.perf_counter()-started
    Path(target).write_text(json.dumps(payload,indent=2))
    print(json.dumps({'case':md['case'],'rows':len(rows),'dofs':model.metadata['dofs'],
          'runtime_s':time.perf_counter()-started,'max_reciprocity':max(d['reciprocity_error'] for d in diagnostics),
          'max_residual':max(d['relative_residual'] for d in diagnostics)}),flush=True)
    return payload


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('surface');p.add_argument('mesh');p.add_argument('target')
    p.add_argument('--degree',type=int,default=1);p.add_argument('--sample',action='store_true')
    p.add_argument('--slice',action='store_true')
    p.add_argument('--basis-slice',action='store_true',help='Export both complex unit inward-flow pressure fields at 700 Hz')
    p.add_argument('--eigen',action='store_true')
    p.add_argument('--frequencies',help='Exact comma-separated Hz; no interpolation')
    args=p.parse_args()
    solve_front(args.surface,args.mesh,args.target,args.degree,
        frequencies=[float(v) for v in args.frequencies.split(',')] if args.frequencies else ([100.,300.,500.,700.,1000.,1500.,2000.] if args.sample else None),slice_output=args.slice,eigen=args.eigen,basis_slice=args.basis_slice)
