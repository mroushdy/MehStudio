"""Exact canonical branch tetrahedra, explicit source and horn-coupling tags.

This is a bounded front-passage mesh, not an independent loudspeaker radiation
model. Source and horn interface velocities/pressures must be coupled to the
driver/rear network and horn/exterior. No zero-pressure mouth is introduced.
"""
from pathlib import Path
import argparse, hashlib, json, sys, time
import gmsh
import numpy as np


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def frame(driver):
    # The editor's t,v,n frame is left handed. t,-v,n is a proper rotation.
    basis=np.column_stack([driver['mount_tangent'], -np.array(driver['mount_azimuth']), driver['mount_to_magnet']])
    if abs(np.linalg.det(basis)-1)>1e-10:
        raise ValueError('Branch local-to-world frame is not a proper rotation')
    return np.array(driver['mount_origin_m']),basis


def mesh_quality(expected_volume):
    types,element_tags,nodes=gmsh.model.mesh.getElements(3)
    if list(types)!=[4] or not len(element_tags[0]):
        raise ValueError('Expected nonempty first-order tetrahedral mesh')
    quality=np.array(gmsh.model.mesh.getElementQualities(element_tags[0],'minSICN'))
    if not np.isfinite(quality).all() or (quality<=0).any():
        raise ValueError('Nonpositive tetrahedral Jacobian/quality; no mesh accepted')
    nt,xyz,_=gmsh.model.mesh.getNodes();v=np.array(xyz).reshape(-1,3)
    index=np.empty(int(max(nt))+1,dtype=np.int64);index[np.array(nt,dtype=np.int64)]=np.arange(len(nt))
    tet=v[index[np.array(nodes[0],dtype=np.int64).reshape(-1,4)]]
    det=np.einsum('ij,ij->i',tet[:,1]-tet[:,0],np.cross(tet[:,2]-tet[:,0],tet[:,3]-tet[:,0]))
    if (det<=0).any():
        raise ValueError('Nonpositive signed tetrahedral determinant')
    volume=float(det.sum()/6);relative=abs(volume/expected_volume-1)
    if relative>1e-8:
        raise ValueError('Tetrahedral volume differs from exact canonical branch: '+str(relative))
    groups={}
    for d,t in gmsh.model.getPhysicalGroups():
        entities=gmsh.model.getEntitiesForPhysicalGroup(d,t)
        count=sum(sum(len(x) for x in gmsh.model.mesh.getElements(d,int(entity))[1]) for entity in entities)
        groups[str(t)]={'dimension':d,'name':gmsh.model.getPhysicalName(d,t),'elements':count}
        if not count:
            raise ValueError('Empty physical group '+str(t))
    return {'nodes':len(nt),'tetrahedra':len(element_tags[0]),'minimum_SICN':float(quality.min()),'mean_SICN':float(quality.mean()),'positive_signed_Jacobians':True,'tetrahedral_volume_m3':volume,'canonical_surface_volume_m3':expected_volume,'relative_volume_error':relative,'physical_groups':groups}


def generate_local(branch,driver,size,target,fixed_cap=False):
    start=time.monotonic();origin,basis=frame(driver)
    vertices=(np.array(branch['vertices_m'])-origin)@basis
    faces=np.array(branch['faces']);tags=np.array(branch['face_tags'])
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0);gmsh.logger.start();gmsh.model.add('canonical_branch_local')
    try:
        geo=gmsh.model.geo
        for i,p in enumerate(vertices):geo.addPoint(*p,size,i+1)
        edges={};surfaces=[]
        for f in faces:
            chain=[]
            for a,b in zip(f,np.roll(f,-1)):
                key=(min(int(a),int(b)),max(int(a),int(b)))
                if key not in edges:edges[key]=geo.addLine(key[0]+1,key[1]+1)
                chain.append(edges[key] if a<b else -edges[key])
            surfaces.append(geo.addPlaneSurface([geo.addCurveLoop(chain)]))
        volume=geo.addVolume([geo.addSurfaceLoop(surfaces)]);geo.synchronize()
        names={10:'rigid_front_wall',branch['source_tag']:'mid_1_source',branch['entry_interface_tag']:'mid_1_horn_coupling_interface'}
        for t in sorted(set(tags)):
            gmsh.model.addPhysicalGroup(2,[surfaces[i] for i in np.flatnonzero(tags==t)],int(t));gmsh.model.setPhysicalName(2,int(t),names[int(t)])
        gmsh.model.addPhysicalGroup(3,[volume],411);gmsh.model.setPhysicalName(3,411,'mid_1_front_air')
        if fixed_cap:
            # Keep the original piecewise-planar star fan support exactly,
            # while choosing one P1 trace triangle per canonical cap facet.
            # This deliberately coarsens the pressure trace space, not the
            # geometry; volume-size refinement cannot establish cap convergence.
            for fi in np.flatnonzero(tags==branch['entry_interface_tag']):
                f=faces[fi]
                for a,b in zip(f,np.roll(f,-1)):
                    gmsh.model.mesh.setTransfiniteCurve(edges[tuple(sorted([int(a),int(b)]))],2)
                gmsh.model.mesh.setTransfiniteSurface(surfaces[fi],cornerTags=(f+1).tolist())
        # Match the independently qualified previous native-front-fem method.
        # Every canonical triangle remains a CAD face; no surface smoothing.
        gmsh.option.setNumber('Mesh.MeshSizeMax',size);gmsh.option.setNumber('Mesh.MeshSizeMin',size*.15)
        gmsh.option.setNumber('Mesh.MeshSizeFromPoints',0);gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary',0)
        gmsh.option.setNumber('Mesh.Algorithm3D',1);gmsh.option.setNumber('Mesh.Optimize',1);gmsh.option.setNumber('Mesh.MshFileVersion',4.1)
        gmsh.model.mesh.generate(3)
        report=mesh_quality(branch['checks']['signed_volume_m3'])
        if fixed_cap:
            cap_entities=gmsh.model.getEntitiesForPhysicalGroup(2,branch['entry_interface_tag'])
            cap_faces=sum(sum(len(x) for x in gmsh.model.mesh.getElements(2,int(e))[1]) for e in cap_entities)
            if cap_faces!=int((tags==branch['entry_interface_tag']).sum()):raise ValueError('Fixed cap was subdivided unexpectedly')
        gmsh.write(str(target));report.update({'file':str(target),'sha256':digest(target),'maximum_size_m':size,'runtime_seconds':time.monotonic()-start,'coordinates':'right-handed branch frame: t,-v,n; origin at driver mounting center','method':'Exact triangular PLC; Gmsh Delaunay Algorithm1; no surface smoothing; MeshSizeFromPoints0 and ExtendFromBoundary0','interface_discretization':'one linear triangle per original cap facet; trace resolution held fixed and unqualified' if fixed_cap else 'interface refined by Gmsh with the volume-size target'})
        return report
    except Exception:
        print('\n'.join(gmsh.logger.get()[-20:]),flush=True)
        raise
    finally:
        gmsh.finalize()


def export_world(local_path,driver,index,expected_volume,target):
    origin,basis=frame(driver)
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0)
    try:
        gmsh.open(str(local_path));groups=[(d,t,list(gmsh.model.getEntitiesForPhysicalGroup(d,t))) for d,t in gmsh.model.getPhysicalGroups()]
        gmsh.model.removePhysicalGroups()
        mapping={10:10,101:101+index,201:201+index,411:411+index}
        names={10:'rigid_front_wall',101:f'mid_{index+1}_source',201:f'mid_{index+1}_horn_coupling_interface',411:f'mid_{index+1}_front_air'}
        for d,t,entities in groups:
            gmsh.model.addPhysicalGroup(d,entities,mapping[t]);gmsh.model.setPhysicalName(d,mapping[t],names[t])
        affine=np.eye(4);affine[:3,:3]=basis;affine[:3,3]=origin;gmsh.model.mesh.affineTransform(affine.ravel().tolist())
        report=mesh_quality(expected_volume);gmsh.option.setNumber('Mesh.MshFileVersion',2.2);gmsh.option.setNumber('Mesh.Binary',0)
        staged=Path(target).with_suffix('.staged.msh');gmsh.write(str(staged));staged.replace(target)
        report.update({'branch_id':driver['id'],'file':str(target),'sha256':digest(target),'format':'Gmsh2.2ASCII','coordinates':'global SI, +Z forward, shared canonical manifest frame','source_tag':101+index,'horn_interface_tag':201+index,'volume_tag':411+index,'copy_method':'Proper rigid transform of independently validated canonical local mesh; no remeshing or altered boundary'})
        return report
    finally:gmsh.finalize()


def export_interface(mesh_path,driver,branch,target):
    """Export the actual tetra-mesh coupling trace, never the original cap fan."""
    tag=driver['entry_interface_tag'];gmsh.initialize();gmsh.option.setNumber('General.Terminal',0)
    try:
        gmsh.open(str(mesh_path));triangle_nodes=[];triangle_tags=[];parent_surfaces=[]
        for entity in gmsh.model.getEntitiesForPhysicalGroup(2,tag):
            types,ets,nodes=gmsh.model.mesh.getElements(2,int(entity))
            if list(types)!=[2]:raise ValueError('Interface must contain linear triangles only')
            fs=np.array(nodes[0],dtype=np.int64).reshape(-1,3);triangle_nodes.extend(fs.tolist());triangle_tags.extend(ets[0].tolist());parent_surfaces.extend([int(entity)]*len(fs))
        global_ids=np.unique(np.array(triangle_nodes).ravel());lookup={int(n):i for i,n in enumerate(global_ids)}
        vertices=np.array([gmsh.model.mesh.getNode(int(n))[0] for n in global_ids]);faces=np.array([[lookup[n] for n in f] for f in triangle_nodes])
        from collections import defaultdict
        edges=defaultdict(list)
        for fi,f in enumerate(faces):
            for a,b in zip(f,np.roll(f,-1)):edges[tuple(sorted([int(a),int(b)]))].append((fi,int(a),int(b)))
        if any(len(uses)>2 for uses in edges.values()):raise ValueError('Nonmanifold interface trace')
        for uses in edges.values():
            if len(uses)==2 and uses[0][1:]==uses[1][1:]:raise ValueError('Inconsistent interface orientation')
        rim_edges=[edge for edge,uses in edges.items() if len(uses)==1];rim_ids=sorted(set(x for edge in rim_edges for x in edge));rim=vertices[rim_ids]
        neighbors=defaultdict(list)
        for a,b in rim_edges:neighbors[a].append(b);neighbors[b].append(a)
        if not rim_ids or any(len(v)!=2 for v in neighbors.values()):raise ValueError('Interface seam is not a closed polygon')
        cycle=[rim_ids[0]];previous=None;current=cycle[0]
        while True:
            nxt=next(v for v in neighbors[current] if v!=previous)
            if nxt==cycle[0]:break
            if nxt in cycle:raise ValueError('Interface seam has multiple cycles')
            cycle.append(nxt);previous,current=current,nxt
        if len(cycle)!=len(rim_ids):raise ValueError('Disconnected interface seams')
        canonical=np.array(branch['root_ring_m']);tol=1e-10
        canonical_errors=np.linalg.norm(canonical[:,None,:]-rim[None,:,:],axis=2).min(axis=1)
        seam_vertex_errors=np.linalg.norm(rim[:,None,:]-canonical[None,:,:],axis=2).min(axis=1)
        starts=canonical;delta=np.roll(canonical,-1,axis=0)-canonical
        t=np.clip(np.einsum('ijk,jk->ij',rim[:,None,:]-starts[None,:,:],delta)/np.einsum('ij,ij->i',delta,delta)[None,:],0,1)
        nearest=starts[None,:,:]+t[:,:,None]*delta[None,:,:]
        segment_errors=np.linalg.norm(rim[:,None,:]-nearest,axis=2).min(axis=1)
        if max(canonical_errors)>tol or max(segment_errors)>tol:raise ValueError('Remeshed cap seam moved from the canonical horn-root polygon')
        av=np.cross(vertices[faces[:,1]]-vertices[faces[:,0]],vertices[faces[:,2]]-vertices[faces[:,0]])/2
        projected=av@np.array(driver['mount_to_magnet'])
        if (projected>=0).any():raise ValueError('Interface normals are not outward from branch air into horn')
        data={'schema':'meh-fem-interface-trace/v1','branch_id':driver['id'],'physical_tag':tag,'units':'m','axes':'Global canonical right-handed XYZ; +Z forward','vertices_m':vertices.tolist(),'faces':faces.tolist(),'gmsh_node_tags':global_ids.tolist(),'gmsh_triangle_element_tags':triangle_tags,'gmsh_parent_surface_tags':parent_surfaces,'seam_vertex_ids':cycle,'normals':'Outward from branch FEM air into horn. The matching horn-domain normal must be reversed.','coupling':'Use these exact trace triangles/nodes on the BEM/FEM partner; original diagnostic star-fan triangles are not the remeshed trace. Pressure continuity and opposite outward flux must be enforced.','mesh_sha256':digest(mesh_path),'checks':{'trace_vertices':len(vertices),'trace_triangles':len(faces),'seam_nodes':len(rim_ids),'canonical_root_nodes':len(canonical),'new_seam_nodes':int((seam_vertex_errors>tol).sum()),'all_canonical_root_nodes_retained':bool(max(canonical_errors)<=tol),'maximum_canonical_node_error_m':float(max(canonical_errors)),'maximum_seam_edge_deviation_m':float(max(segment_errors)),'single_closed_seam':True,'outward_normal_into_horn':True,'actual_area_m2':float(np.linalg.norm(av,axis=1).sum()),'projected_area_m2':float(-projected.sum()),'conforming_coupling_established':False}}
        Path(target).write_text(json.dumps(data,separators=(',',':')))
        return {'file':str(target),'sha256':digest(target),**data['checks']}
    finally:gmsh.finalize()


def solve_local(mesh_path,manifest,frequencies,cache_path):
    # Read existing solver code without changing its cache or source tree.
    sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'native-front-fem'))
    import fem_core
    from dolfinx.io import gmsh as gmshio
    from mpi4py import MPI
    fem_core.JIT={'cache_dir':str(cache_path)}
    data=gmshio.read_from_msh(str(mesh_path),MPI.COMM_WORLD,0,gdim=3)
    model=fem_core.PortFEM(data.mesh,data.facet_tags,[{'tag':101,'name':'cone','axis':[0,0,1]},{'tag':201,'name':'horn_entry_interface'}],degree=1,rho=manifest['medium']['density_kg_m3'],c=manifest['medium']['sound_speed_m_s'])
    z,diagnostics,_=model.solve(frequencies)
    for d in diagnostics:
        if d['relative_residual']>1e-7 or d['reciprocity_error']>1e-7 or d['passivity_min_normalized']<-1e-8:
            raise ValueError('Native branch solve failed residual/reciprocity/passivity gates')
    reference=model.rho*model.c/model.port_info[1]['surface_area_m2'];zin,transfer=fem_core.terminate_two_port(z,reference)
    rows=[]
    for i,f in enumerate(frequencies):
        power=abs(zin[i].real-reference*abs(transfer[i])**2)/max(1,abs(zin[i]),reference*abs(transfer[i])**2)
        if power>1e-7:raise ValueError('Reference terminated power balance failed')
        rows.append({'frequency_hz':f,'impedance_Pa_s_m3':fem_core.complex_json(z[i]),'diagnostics':diagnostics[i],'reference_only_load_Pa_s_m3':reference,'reference_input_impedance':fem_core.complex_json(zin[i]),'reference_outflow_over_cone_inflow':fem_core.complex_json(transfer[i]),'reference_power_residual_normalized':float(power)})
    return {'model':'Lossless pressure FEM; rigid cone translation and uniform horn-interface velocity basis','metadata':model.metadata,'rows':rows,'conventions':{'phasor':'exp(+j omega t)','amplitude':'RMS','flows':'m3/s INTO each local air port','source_basis':'n_air dot local +Z divided by projected cone mesh area','interface_basis':'uniform inward normal velocity normalized by the nonplanar interface area'},'qualification':'Native numerical demonstration of the branch two-port only; no horn/exterior solve or acoustic-band qualification','limitations':['Actual diaphragm geometry and motion are not measured.','Viscothermal narrow-gap losses are omitted.','Uniform interface basis omits nonuniform junction coupling.','Reference resistance is a numerical power-balance test, not the physical horn load.','The complete tube is already included; do not add neck inertance or end corrections again.']}


def compare_solutions(levels):
    comparisons=[]
    for coarse,fine in zip(levels,levels[1:]):
        if 'solve' not in coarse or 'solve' not in fine:continue
        rows=[]
        for a,b in zip(coarse['solve']['rows'],fine['solve']['rows']):
            def cm(value):return np.array(value['real'])+1j*np.array(value['imag'])
            za,zb=cm(a['impedance_Pa_s_m3']),cm(b['impedance_Pa_s_m3']);ta,tb=cm(a['reference_outflow_over_cone_inflow']),cm(b['reference_outflow_over_cone_inflow']);ia,ib=cm(a['reference_input_impedance']),cm(b['reference_input_impedance'])
            rows.append({'frequency_hz':b['frequency_hz'],'matrix_relative_change':float(np.linalg.norm(zb-za)/np.linalg.norm(zb)),'reference_transfer_relative_change':float(abs(tb-ta)/abs(tb)),'reference_input_impedance_relative_change':float(abs(ib-ia)/abs(ib))})
        comparisons.append({'coarse_size_m':coarse['maximum_size_m'],'fine_size_m':fine['maximum_size_m'],'rows':rows})
    return {'scope':'Fixed canonical triangular boundary and lossless two-port at explicit samples; not physical validation or a horn radiation model','threshold':.005,'comparisons':comparisons,'all_reported_changes_below_half_percent':bool(comparisons) and all(max(r[k] for k in ['matrix_relative_change','reference_transfer_relative_change','reference_input_impedance_relative_change'])<.005 for c in comparisons for r in c['rows'])}


def main():
    p=argparse.ArgumentParser();p.add_argument('job');p.add_argument('--out',required=True);p.add_argument('--sizes-mm',default='3,2,1.4');p.add_argument('--solve-frequencies',default='');p.add_argument('--no-rotated-copies',action='store_true');p.add_argument('--copies-all-levels',action='store_true',help='Export all driver poses at every requested density');p.add_argument('--fixed-cap',action='store_true',help='Keep one linear triangle on each canonical interface facet; pressure-trace convergence is not established');a=p.parse_args()
    started=time.monotonic();job=json.loads(Path(a.job).read_text());out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    sizes=[float(v)*.001 for v in a.sizes_mm.split(',')];frequencies=[float(v) for v in a.solve_frequencies.split(',') if v];drivers=job['manifest']['drivers'];branches=job['parts']['branches']
    if not sizes or any(not .0005<=s<=.02 for s in sizes) or any(a<=b for a,b in zip(sizes,sizes[1:])):
        raise ValueError('Mesh sizes must decrease strictly and lie between 0.5 and 20 mm')
    if any(not np.isfinite(f) or f<=0 for f in frequencies):raise ValueError('Solve frequencies must be positive and finite')
    base_origin,base_basis=frame(drivers[0]);base_vertices=(np.array(branches[0]['vertices_m'])-base_origin)@base_basis
    for driver,branch in zip(drivers[1:],branches[1:]):
        origin,basis=frame(driver);vertices=(np.array(branch['vertices_m'])-origin)@basis
        if vertices.shape!=base_vertices.shape or not np.array_equal(branch['faces'],branches[0]['faces']) or np.max(np.abs(vertices-base_vertices))>1e-10:
            raise ValueError('Branches are not exact rigid copies; each distinct branch requires independent meshing')
    report={'schema':'meh-branch-fem/v1','job_sha256':digest(a.job),'design_sha256':job['manifest']['design_sha256'],'software':{'gmsh':gmsh.__version__},'coupling_required':'These are four independent FRONT SUBDOMAINS, each bounded by its cone, rigid wall and tagged horn interface. They must be coupled at those interfaces to a common horn/exterior and via their drivers to the shared rear load. No independent radiation solve is implied.','source_file_sha256':digest(__file__),'levels':[],'rotated_copies':[]}
    try:
        for size in sizes:
            label=f'{size*1000:g}mm';local=out/f'mid_1_local_{label}.msh';level=generate_local(branches[0],drivers[0],size,local,fixed_cap=a.fixed_cap)
            level['world_mesh']=export_world(local,drivers[0],0,branches[0]['checks']['signed_volume_m3'],out/f'mid_1_world_{label}.msh')
            level['world_mesh']['interface_trace']=export_interface(Path(level['world_mesh']['file']),drivers[0],branches[0],out/f'mid_1_interface_{label}.json')
            print(json.dumps({'stage':'mesh','size_m':size,'nodes':level['nodes'],'tetrahedra':level['tetrahedra'],'minimum_SICN':level['minimum_SICN']}),flush=True)
            if frequencies:
                level['solve']=solve_local(local,job['manifest'],frequencies,out/'ffcx-cache')
                print(json.dumps({'stage':'solve','size_m':size,'rows':len(level['solve']['rows']),'dofs':level['solve']['metadata']['dofs']}),flush=True)
            report['levels'].append(level);(out/'validation.json').write_text(json.dumps(report,indent=2))
        if not a.no_rotated_copies:
            copied_levels=report['levels'] if a.copies_all_levels else [min(report['levels'],key=lambda x:x['maximum_size_m'])]
            for fine in copied_levels:
                for i in range(1,len(drivers)):
                    copy=export_world(Path(fine['file']),drivers[i],i,branches[i]['checks']['signed_volume_m3'],out/f'mid_{i+1}_world_{fine["maximum_size_m"]*1000:g}mm.msh')
                    copy['maximum_size_m']=fine['maximum_size_m'];copy['interface_trace']=export_interface(Path(copy['file']),drivers[i],branches[i],out/f'mid_{i+1}_interface_{fine["maximum_size_m"]*1000:g}mm.json');report['rotated_copies'].append(copy)
        report['two_port_refinement']=compare_solutions(report['levels']);report['passed']=True
    except Exception as error:
        report['passed']=False;report['error']=str(error);raise
    finally:
        report['runtime_seconds']=time.monotonic()-started;(out/'validation.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'stage':'complete','passed':report['passed'],'levels':len(report['levels']),'rotated_copies':len(report['rotated_copies']),'runtime_seconds':report['runtime_seconds'],'refinement':report['two_port_refinement']}),flush=True)


if __name__=='__main__':main()
