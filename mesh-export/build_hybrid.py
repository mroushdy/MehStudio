"""Join common horn/exterior BEM to exact traces of four independent branch FEMs.

The exterior BEM winding is INTO acoustic air (positive excluded-solid volume).
Each interface consequently has the SAME normal as its branch's outward FEM
normal. This +1 geometric normal map is distinct from opposite domain-outward
fluxes in the transmission equation. No shared rear air geometry is invented.
"""
from pathlib import Path
import argparse, hashlib, json, shutil
import numpy as np
import gmsh
from build_mesh import Boundary, oriented_check, msh22, import_check
from validate_mesh import intersection_check

EXTERIOR_TAGS={11,12,13,302}

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def cyclic_equal(a,b):return any(list(a)==list(b[k:])+list(b[:k]) for k in range(3))

def verify_provenance(manifest,branch_report,exterior_records=()):
    design=manifest.get('design_sha256')
    if not isinstance(design,str) or len(design)!=64:raise ValueError('Missing canonical design hash')
    if manifest.get('units',{}).get('length')!='m':raise ValueError('Canonical manifest must use SI meters')
    for axis,expected in zip('xyz',np.eye(3)):
        if not np.array_equal(manifest.get('axes',{}).get(axis),expected):raise ValueError('Expected canonical right-handed XYZ axes')
    if branch_report.get('passed') is not True:raise ValueError('Branch validation did not pass')
    if branch_report.get('design_sha256')!=design:raise ValueError('Branch validation design hash differs from manifest')
    for record in exterior_records:
        if 'design_sha256' in record and record['design_sha256']!=design:raise ValueError('Exterior design hash differs from manifest')
    return design

def verify_serialized_maps(node_tags,coords,element_tags,faces,physical_by_element,traces,maps):
    """Check stable Gmsh IDs, irrespective of native API array ordering."""
    points={int(t):p for t,p in zip(node_tags,coords)};node_order={int(t):i for i,t in enumerate(node_tags)}
    triangles={int(t):list(map(int,f)) for t,f in zip(element_tags,faces)};face_order={int(t):i for i,t in enumerate(element_tags)}
    if len(points)!=len(node_tags) or len(triangles)!=len(element_tags):raise ValueError('Duplicate serialized Gmsh IDs')
    for trace,mapping in zip(traces,maps):
        gids=mapping['bem_gmsh_node_tags'];eids=mapping['bem_gmsh_triangle_element_tags']
        if len(gids)!=len(trace['vertices_m']) or len(eids)!=len(trace['faces']):raise ValueError('Interface mapping length mismatch')
        err=max(np.linalg.norm(points[g]-q) for g,q in zip(gids,trace['vertices_m']))
        if err>1e-12:raise ValueError('Serialized BEM interface coordinates changed')
        for eid,f in zip(eids,trace['faces']):
            if not cyclic_equal(triangles[eid],[gids[i] for i in f]):raise ValueError('Serialized BEM facet connectivity or orientation changed')
            if physical_by_element[eid]!=trace['physical_tag']:raise ValueError('Serialized BEM interface physical tag changed')
        mapping['maximum_serialized_coordinate_error_m']=float(err)
        mapping['serialized_facet_connectivity_and_orientation_verified']=True
        mapping['bem_vertex_indices_zero_based_native_getNodes']=[node_order[t] for t in gids]
        mapping['bem_triangle_indices_zero_based_native_getElements2']=[face_order[t] for t in eids]

def assemble(exterior,traces):
    b=Boundary(); pending=[]
    # Trace coordinates take precedence at the seam; original exterior points
    # can differ by floating-point roundoff only, never by a moved aperture.
    for trace in traces:
        ids=[b.point(p) for p in trace['vertices_m']]
        if len(set(ids))!=len(ids):raise ValueError('Trace nodes collapsed during seam welding')
        pending.append((trace,ids))
    for f,t in zip(exterior['faces'],exterior['face_tags']):
        if t in EXTERIOR_TAGS:b.triangle([exterior['vertices_m'][i] for i in f],t)
    if set(b.tags)!=EXTERIOR_TAGS:raise ValueError('Missing horn, enclosure, rear panel, or closed HF physical group')
    interfaces=[]
    for trace,ids in pending:
        tag=int(trace['physical_tag']);first=len(b.faces)
        for f in trace['faces']:b.triangle([trace['vertices_m'][i] for i in f],tag)
        interfaces.append({'branch_id':trace['branch_id'],'physical_tag':tag,'bem_vertex_indices_zero_based':ids,
          'bem_triangle_indices_zero_based':list(range(first,len(b.faces))),
          'bem_gmsh_node_tags':[i+1 for i in ids],'bem_gmsh_triangle_element_tags':list(range(first+1,len(b.faces)+1)),
          'bem_index_basis':'Legacy zero-based fields index exterior-into-air.json vertices_m/faces in writer order, equivalently Gmsh node/element tag minus 1. They do NOT index arbitrary imported arrays; remap using explicit Gmsh IDs.',
          'fem_node_tags':trace['gmsh_node_tags'],'fem_triangle_element_tags':trace['gmsh_triangle_element_tags'],
          'normal_sign_fem_outward_to_bem_into_air':1,'maximum_coordinate_error_m':float(np.linalg.norm(np.array(b.vertices)[ids]-np.array(trace['vertices_m']),axis=1).max()),
          'trace_vertices':len(ids),'trace_triangles':len(trace['faces'])})
    report=oriented_check(b,1)
    for (trace,ids),entry in zip(pending,interfaces):
        for fi,f in zip(entry['bem_triangle_indices_zero_based'],trace['faces']):
            if not cyclic_equal(b.faces[fi],[ids[x] for x in f]):raise ValueError('FEM outward and BEM into-air cap normals differ')
        entry['one_to_one_nodes_and_facets']=True
    return b,interfaces,report

def verify_fem(path,trace):
    if sha(path)!=trace['mesh_sha256']:raise ValueError(f'FEM hash no longer matches trace: {path}')
    gmsh.clear();gmsh.open(str(path));tags,coords,_=gmsh.model.mesh.getNodes();coords=np.array(coords).reshape(-1,3)
    xyz={int(t):p for t,p in zip(tags,coords)};order={int(t):i for i,t in enumerate(sorted(tags))}
    actual=np.array([xyz[t] for t in trace['gmsh_node_tags']]);delta=float(np.linalg.norm(actual-np.array(trace['vertices_m']),axis=1).max())
    if delta>1e-12:raise ValueError('Trace coordinates differ from actual FEM file')
    index=int(trace['branch_id'].split('_')[-1]);expected_groups={(2,10),(2,100+index),(2,200+index),(3,410+index)}
    if set(gmsh.model.getPhysicalGroups())!=expected_groups:raise ValueError('FEM physical groups must be exactly wall, independent source, interface and volume')
    supports={}
    for entity in gmsh.model.getEntitiesForPhysicalGroup(2,int(trace['physical_tag'])):
        kinds,eids,nodes=gmsh.model.mesh.getElements(2,int(entity))
        for kind,ee,nn in zip(kinds,eids,nodes):
            if kind!=2:raise ValueError('Interface is not linear triangular')
            for eid,f in zip(ee,np.array(nn).reshape(-1,3)):supports[int(eid)]=list(map(int,f))
    expected={int(e):[trace['gmsh_node_tags'][i] for i in f] for e,f in zip(trace['gmsh_triangle_element_tags'],trace['faces'])}
    if set(supports)!=set(expected) or any(not cyclic_equal(supports[e],f) for e,f in expected.items()):raise ValueError('Trace triangle connectivity or winding differs from actual FEM file')
    voltag=410+int(trace['branch_id'].split('_')[-1]);groups=set(gmsh.model.getPhysicalGroups())
    if (3,voltag) not in groups:raise ValueError('Missing branch FEM volume group')
    kinds,eids,tet_nodes=gmsh.model.mesh.getElements(3)
    if list(kinds)!=[4]:raise ValueError('Expected linear tetrahedra')
    q=np.array(gmsh.model.mesh.getElementQualities(eids[0],'minSICN'))
    if not len(q) or not np.isfinite(q).all() or np.min(q)<=0:raise ValueError('Nonpositive FEM tetrahedron quality')
    # Independently verify trace normals against the incident tetrahedron,
    # not only against the surface element's potentially arbitrary ordering.
    tets=np.asarray(tet_nodes[0]).reshape(-1,4);wanted={tuple(sorted(f)):f for f in expected.values()};found={}
    candidates=tets[np.isin(tets,trace['gmsh_node_tags']).sum(axis=1)>=3]
    for tet in candidates:
        for opposite in range(4):
            key=tuple(sorted(map(int,np.delete(tet,opposite))))
            if key not in wanted:continue
            if key in found:raise ValueError('Interface facet is not on the FEM exterior boundary')
            f=wanted[key];a,b,c=(xyz[t] for t in f)
            if np.dot(np.cross(b-a,c-a),xyz[int(tet[opposite])]-a)>=0:raise ValueError('Interface normal is not outward from FEM air')
            found[key]=True
    if set(found)!=set(wanted):raise ValueError('Interface facet has no incident tetrahedron')
    return {'nodes':len(tags),'tetrahedra':len(q),'minimum_SICN':float(np.min(q)),'positive_jacobians':True,'trace_coordinate_error_m':delta,
        'exact_physical_groups_verified':True,'trace_winding_matches_native_surface':True,'trace_outward_from_incident_tetrahedron':True,
        'fem_vertex_indices_zero_based_sorted_node_tags':[order[t] for t in trace['gmsh_node_tags']]}

def main():
    p=argparse.ArgumentParser();p.add_argument('exterior');p.add_argument('--branches',required=True);p.add_argument('--size-mm',default='1.4');p.add_argument('--manifest',required=True);p.add_argument('--out',required=True);a=p.parse_args()
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True);(out/'INCOMPLETE.txt').write_text('Assembly/validation incomplete.\n')
    manifest=json.loads(Path(a.manifest).read_text());root=Path(a.branches);branch_report=json.loads((root/'validation.json').read_text())
    if len(manifest.get('drivers',[]))!=4 or manifest.get('vent_sources') or manifest.get('rear',{}).get('kind')!='shared-sealed-lumped-coupling':
        raise ValueError('The experimental hybrid adapter is qualified only as a geometric contract for four shared-sealed branches. Use build_mesh.py for individual, reflex-basis or other driver-count surface exports.')
    exterior_records=[json.loads(p.read_text()) for p in (Path(a.exterior).parent/'manifest.json',Path(a.exterior).parent/'validation.json') if p.exists()]
    design=verify_provenance(manifest,branch_report,exterior_records)
    traces=[json.loads((root/f'mid_{i}_interface_{a.size_mm}mm.json').read_text()) for i in range(1,5)]
    for i,trace in enumerate(traces,1):
        if trace.get('branch_id')!=f'mid_{i}' or trace.get('physical_tag')!=200+i or trace.get('units')!='m':raise ValueError('Branch trace identity, interface tag or SI units mismatch')
    exterior=json.loads(Path(a.exterior).read_text());b,maps,report=assemble(exterior,traces)
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0)
    try:
        for i,(trace,mapping) in enumerate(zip(traces,maps),1):
            path=root/f'mid_{i}_world_{a.size_mm}mm.msh';check=verify_fem(path,trace)
            mapping['fem_validation']=check;mapping['fem_mesh']=path.name;mapping['fem_sha256']=sha(path)
            shutil.copy2(path,out/path.name);(out/f'mid_{i}_interface.json').write_text(json.dumps(trace,separators=(',',':')))
        names={11:'horn_rigid_wall',12:'enclosure_exterior',13:'sealed_rear_panel',302:'closed_HF_throat',**{200+i:f'mid_{i}_fem_interface' for i in range(1,5)}}
        msh22(b,out/'exterior-into-air.msh',names);report['gmsh_import']=import_check(out/'exterior-into-air.msh',len(b.faces))
        report['self_intersection']=intersection_check(b.data())
        # Check file serialization preserves every cap coordinate and connectivity.
        gmsh.clear();gmsh.open(str(out/'exterior-into-air.msh'));nt,xyz,_=gmsh.model.mesh.getNodes();types,et,fn=gmsh.model.mesh.getElements(2)
        if list(types)!=[2] or set(gmsh.model.getPhysicalGroups())!={(2,t) for t in names}:raise ValueError('Serialized BEM element types or physical groups changed')
        physical={}
        for tag in names:
            for entity in gmsh.model.getEntitiesForPhysicalGroup(2,tag):
                for ids in gmsh.model.mesh.getElements(2,int(entity))[1]:
                    for eid in ids:
                        if int(eid) in physical:raise ValueError('BEM facet has multiple physical groups')
                        physical[int(eid)]=tag
        if len(physical)!=len(b.faces):raise ValueError('BEM physical groups do not cover all facets')
        verify_serialized_maps(nt,np.asarray(xyz).reshape(-1,3),et[0],np.asarray(fn[0]).reshape(-1,3),physical,traces,maps)
    finally:gmsh.finalize()
    (out/'exterior-into-air.json').write_text(json.dumps(b.data(),separators=(',',':')))
    shutil.copy2(a.manifest,out/'geometry-manifest.json')
    contract={'schema':'meh-hybrid-mesh/v1','units':'m','axes':'+Z forward, canonical right-handed XYZ','geometry_manifest_sha256':sha(a.manifest),
      'design_sha256':design,'branch_validation_sha256':sha(root/'validation.json'),
      'exterior_mesh':'exterior-into-air.msh','exterior_sha256':sha(out/'exterior-into-air.msh'),'source_exterior_sha256':sha(a.exterior),
      'exterior_geometry_json':'exterior-into-air.json','exterior_geometry_sha256':sha(out/'exterior-into-air.json'),
      'index_contract':'Use explicit Gmsh node and triangle element IDs to map into the target reader. Legacy BEM indices are writer/JSON order; native_getNodes/getElements2 indices record this Gmsh import only, not a portable engine array order.',
      'bem_normals':'Into acoustic air; outward from excluded solid; positive solid volume','fem_normals':'Outward from each front-branch acoustic air domain',
      'interfaces':maps,'symmetry':'none; all four branches and sources independent','source_tags':[101,102,103,104],'volume_tags':[411,412,413,414],
      'rigid_bem_tags':[11,12,13,302],'interface_tags':[201,202,203,204],
      'rear_model':'108 L shared lumped compliance belongs in external motor network; no rear spatial air domain supplied',
      'drive':'Independent unit-velocity acoustic bases. Saved electrical RMS voltage is metadata until coupled motor/front/rear equations are solved.',
      'qualification':'Geometric conformity and positive volume quality only. No full coupled radiation solve/convergence is claimed by this builder.',
      'validation':report}
    (out/'coupling.json').write_text(json.dumps(contract,indent=2));(out/'INCOMPLETE.txt').unlink()
    print(json.dumps({'out':str(out),'vertices':report['vertices'],'triangles':report['triangles'],'interfaces':[{k:v for k,v in m.items() if k in ('branch_id','trace_vertices','trace_triangles','maximum_coordinate_error_m')} for m in maps]}))
if __name__=='__main__':main()
