"""Prepare a tagged exterior-only BEM surface; canonical entry seams stay fixed.

Exterior tags11/12/13/302 are extracted from a native boundary. The four entry
holes are retained with their exact canonical vertices. Diagnostic canonical
entry fans are supplied separately and temporarily sewn in for closure and
intersection validation. A coupled solver must substitute its matched FEM caps.
No independent prescribed-pressure termination is introduced.

The practical --structured mode uses only Gmsh, NumPy and SciPy. It rebuilds
the exterior from the unchanged canonical job, preserves all root seams, and
uses explicit meridian/azimuth approximations. --max-edge-mm defaults to60.
The geometric report separates retained-profile chord tolerance and sampled
wall deviation: neither establishes a global tolerance or acoustic accuracy.
Use --segments 48 and --segments 64 as a coarse/comparison pair, followed by
solved-observable convergence. Diagnostic fans are never the coupling model.
"""
from pathlib import Path
import argparse, json, hashlib, time, sys, math
import gmsh
from build_mesh import Boundary, profile_keep, lathe, disk, oriented_check, refine
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from validate_mesh import intersection_check

EXTERIOR_TAGS={11,12,13,302}

def arrays(mesh):
    v=np.asarray(mesh['vertices_m'],dtype=float);f=np.asarray(mesh['faces'],dtype=np.int64);tags=np.asarray(mesh['face_tags'],dtype=np.int64)
    if v.ndim!=2 or v.shape[1]!=3 or f.ndim!=2 or f.shape[1]!=3 or len(tags)!=len(f):raise ValueError('Expected tagged triangular SI surface')
    if not np.isfinite(v).all() or len(f)==0 or f.min()<0 or f.max()>=len(v):raise ValueError('Invalid coordinates or triangle indices')
    return v,f,tags


def topology(mesh):
    v,f,tags=arrays(mesh);tri=v[f];cr=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);areas=np.linalg.norm(cr,axis=1)/2
    if np.any(areas<1e-16):raise ValueError('Degenerate triangle')
    if len(np.unique(np.sort(f,axis=1),axis=0))!=len(f):raise ValueError('Duplicate triangle')
    directed=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]);edges,inverse,counts=np.unique(np.sort(directed,axis=1),axis=0,return_inverse=True,return_counts=True)
    if np.any(counts!=2):raise ValueError('Surface is open or nonmanifold')
    signs=np.where(directed[:,0]<directed[:,1],1,-1)
    if np.any(np.bincount(inverse,weights=signs)!=0):raise ValueError('Normals are not consistently oriented')
    graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(v),len(v)))
    used=np.unique(f);components=connected_components(graph.tocsr()[used][:,used],directed=False,return_labels=False)
    if components!=1:raise ValueError('Disconnected surface')
    volume=float(np.einsum('ij,ij->i',tri[:,0],cr).sum()/6)
    if abs(volume)<1e-15:raise ValueError('Surface has zero enclosed volume')
    return {'vertices':len(used),'triangles':len(f),'euler_characteristic':int(len(used)-len(edges)+len(f)),
            'closed':True,'connected_components':1,'oriented':True,'signed_volume_m3':volume,
            'minimum_triangle_area_m2':float(areas.min()),'maximum_edge_m':float(np.linalg.norm(v[edges[:,0]]-v[edges[:,1]],axis=1).max()),'tag_faces':{str(t):int(np.sum(tags==t)) for t in np.unique(tags)},
            'tag_areas_m2':{str(t):float(areas[tags==t].sum()) for t in np.unique(tags)}}


def write_msh(mesh,path):
    v,f,tags=arrays(mesh);names=sorted(set(tags.tolist()))
    with open(path,'w') as out:
        out.write('$MeshFormat\n2.2 0 8\n$EndMeshFormat\n$PhysicalNames\n'+str(len(names))+'\n')
        for tag in names:out.write(f'2 {tag} "boundary_{tag}"\n')
        out.write('$EndPhysicalNames\n$Nodes\n'+str(len(v))+'\n')
        for i,p in enumerate(v,1):out.write(str(i)+' '+' '.join(f'{q:.17g}' for q in p)+'\n')
        out.write('$EndNodes\n$Elements\n'+str(len(f))+'\n')
        for i,(face,tag) in enumerate(zip(f,tags),1):out.write(f'{i} 2 2 {tag} {tag} '+' '.join(str(int(q)+1) for q in face)+'\n')
        out.write('$EndElements\n')


def import_check(mesh,path):
    import gmsh
    v,f,tags=arrays(mesh);gmsh.initialize();gmsh.option.setNumber('General.Terminal',0)
    try:
        gmsh.open(str(path));types,elements,nodes=gmsh.model.mesh.getElements(2)
        if list(types)!=[2] or len(elements[0])!=len(f):raise ValueError('Gmsh did not import every linear triangle')
        nt,coordinates,_=gmsh.model.mesh.getNodes();points=np.asarray(coordinates).reshape(-1,3)[np.argsort(nt)]
        if points.shape!=v.shape or not np.allclose(points,v,atol=1e-14,rtol=0):raise ValueError('Gmsh coordinate/unit round trip failed')
        groups=sorted(tag for dim,tag in gmsh.model.getPhysicalGroups(2))
        if groups!=sorted(set(tags.tolist())):raise ValueError('Gmsh lost physical tags')
        return {'passed':True,'format':'Gmsh2.2 ASCII','units':'m','vertices':len(v),'triangles':len(f),'physical_tags':groups}
    finally:gmsh.finalize()





def compact(mesh):
    v,f,t=arrays(mesh);used,indices=np.unique(f,return_inverse=True)
    return {'vertices_m':v[used].tolist(),'faces':indices.reshape(-1,3).tolist(),'face_tags':t.tolist()}


def boundary_signature(mesh):
    v,f,_=arrays(mesh);edges={}
    for face in f:
        for a,b in zip(face,np.roll(face,-1)):
            key=tuple(sorted((int(a),int(b))));edges.setdefault(key,[]).append((int(a),int(b)))
    if any(len(e)>2 for e in edges.values()):raise ValueError('Nonmanifold exterior patch')
    return {tuple(tuple(v[q]) for q in uses[0]) for uses in edges.values() if len(uses)==1}


def canonical_boundary_check(mesh,job):
    """Require every open edge to be exactly one canonical root-ring edge."""
    actual={tuple(sorted(edge)) for edge in boundary_signature(mesh)}
    expected=set()
    for branch in job['parts']['branches']:
        root=[tuple(p) for p in branch['root_ring_m']]
        expected.update(tuple(sorted((a,b))) for a,b in zip(root,root[1:]+root[:1]))
    if actual!=expected:raise ValueError('Open boundary differs from canonical root seams')
    return {'passed':True,'comparison':'exact floating-point coordinates and edge connectivity','open_edges':len(actual),'canonical_edges':len(expected),'loops':len(job['parts']['branches'])}


def vertex_manifold_check(mesh):
    """The link of every vertex of a closed triangular manifold is one cycle."""
    _,faces,_=arrays(mesh);links={}
    for a,b,c in faces:
        for root,x,y in ((a,b,c),(b,c,a),(c,a,b)):
            graph=links.setdefault(int(root),{})
            graph.setdefault(int(x),set()).add(int(y));graph.setdefault(int(y),set()).add(int(x))
    for graph in links.values():
        if any(len(adj)!=2 for adj in graph.values()):raise ValueError('Nonmanifold vertex link')
        visited=set();queue=[next(iter(graph))]
        while queue:
            q=queue.pop()
            if q in visited:continue
            visited.add(q);queue.extend(graph[q]-visited)
        if len(visited)!=len(graph):raise ValueError('Disconnected vertex link')
    return {'passed':True,'checked_vertices':len(links),'link_condition':'one cycle per vertex'}


def sampled_revolution_deviation(mesh,job):
    """Sample final facets against canonical axisymmetric wall support.

    Euclidean distance to a revolved meridian equals planar distance in (r,z).
    This measures samples only, and ignores the root-hole trims; it is neither
    a Hausdorff certificate nor an acoustic-accuracy qualification.
    """
    v,f,tags=arrays(mesh);checks=[]
    for tag,profile in ((11,job['horn']['inner_profile_m']),(12,job['enclosure']['outer_profile_m'])):
        tri=v[f[tags==tag]]
        samples=np.concatenate((tri.reshape(-1,3),tri.mean(axis=1),((tri+tri[:,[1,2,0]])*.5).reshape(-1,3)))
        p=np.asarray([[q['r'],q['z']] for q in profile]);a=p[:-1];d=np.diff(p,axis=0);dd=np.einsum('ij,ij->i',d,d)
        if np.any(dd<=0):raise ValueError('Repeated canonical meridian point')
        maximum=0.
        for start in range(0,len(samples),1024):
            sample=samples[start:start+1024];rz=np.column_stack((np.linalg.norm(sample[:,:2],axis=1),sample[:,2]))
            delta=rz[:,None,:]-a;u=np.clip(np.einsum('nki,ki->nk',delta,d)/dd,0.,1.)
            distances=np.linalg.norm(delta-u[:,:,None]*d,axis=2).min(axis=1)
            maximum=max(maximum,float(distances.max()))
        checks.append({'tag':tag,'samples':len(samples),'maximum_sample_distance_m':maximum})
    return {'method':'final vertices, edge midpoints and centroids to canonical axisymmetric meridian support; root-hole trims excluded','global_bound':False,'direction':'coarse samples to canonical wall support only','patches':checks}


def exterior(mesh):
    v,f,t=arrays(mesh);keep=np.isin(t,list(EXTERIOR_TAGS))
    return compact({'vertices_m':v,'faces':f[keep],'face_tags':t[keep]})


def with_caps(open_mesh,job):
    vertices=list(open_mesh['vertices_m']);faces=list(open_mesh['faces']);tags=list(open_mesh['face_tags']);mapping={tuple(np.round(v,11)):i for i,v in enumerate(vertices)};seams=[]
    for branch in job['parts']['branches']:
        local=branch['vertices_m'];interface=branch['entry_interface_tag'];root=branch['root_ring_m'];root_ids=[]
        for point in root:
            index=mapping.get(tuple(np.round(point,11)))
            if index is None or np.linalg.norm(np.asarray(vertices[index])-point)>1e-10:raise ValueError('Canonical root seam changed: '+branch['id'])
            root_ids.append(index)
        for face,tag in zip(branch['faces'],branch['face_tags']):
            if tag!=interface:continue
            ids=[]
            for i in face[::-1]:
                point=local[i];key=tuple(np.round(point,11))
                if key not in mapping:mapping[key]=len(vertices);vertices.append(point)
                ids.append(mapping[key])
            faces.append(ids);tags.append(interface)
        seams.append({'id':branch['id'],'tag':interface,'vertices':len(root_ids),'vertex_ids':root_ids,'coordinates_m':[vertices[i] for i in root_ids]})
    return {'vertices_m':vertices,'faces':faces,'face_tags':tags},seams


def certify_patches(original,coarse,tolerances,seconds=60):
    from simplify_mesh import directed_certificate, planar_certificate, piecewise_planar_certificate
    v,f,t=arrays(original);V,F,T=arrays(coarse);checks=[]
    for tag in sorted(set(t)):
        a={'vertices_m':v,'faces':f[t==tag],'face_tags':t[t==tag]};b={'vertices_m':V,'faces':F[T==tag],'face_tags':T[T==tag]};tol=tolerances[int(tag)]
        flat=planar_certificate(a,b) or piecewise_planar_certificate(a,b)
        if flat:forward=reverse=flat
        else:forward=directed_certificate(a,b,tol,max_seconds=seconds);reverse=directed_certificate(b,a,tol,max_seconds=seconds)
        checks.append({'tag':int(tag),'maximum_additional_deviation_m':tol,'original_to_coarse':forward,'coarse_to_original':reverse})
    return checks


def build(mesh,job,target_faces=4500,tolerance_m=.0005,verify_distance=True,seconds=60):
    from simplify_mesh import candidate
    original=exterior(mesh);coarse,patches=candidate(original,tolerance_m,target_faces,feature_angle_deg=15,tag_tolerances={11:tolerance_m,12:tolerance_m,13:tolerance_m,302:.00005})
    if boundary_signature(original)!=boundary_signature(coarse):raise ValueError('Canonical open boundary was changed')
    capped,seams=with_caps(coarse,job);qc=topology(capped)
    if qc['signed_volume_m3']>=0:raise ValueError('Exterior normals must point outward from air into the obstacle')
    tolerances={11:tolerance_m,12:tolerance_m,13:tolerance_m,302:.00005}
    proof=certify_patches(original,coarse,tolerances,seconds) if verify_distance else None
    intersections=intersection_check(capped)
    report={'schema':'meh-coarse-exterior/v1','original_faces':len(original['faces']),'exterior_faces':len(coarse['faces']),'exterior_vertices':len(coarse['vertices_m']),'target_faces':target_faces,'target_reached':len(coarse['faces'])<=target_faces,'patches':patches,'canonical_root_seams_exact':True,'root_seams':seams,'closure_with_diagnostic_canonical_caps':qc,'intersections_with_diagnostic_canonical_caps':intersections,'additional_deviation_certificate':proof,'geometric_deviation_qualified':proof is not None,'solver_status':'No acoustic solve. Replace diagnostic fans with the matching FEM cap triangulation before coupling; caps are interfaces, never independent zero-pressure loads.'}
    return coarse,capped,report


def structured_horn_chart(profile,roots,h,count,profile_tolerance=None,segments=48,band_step=None):
    """Hole edges and mouth cut are constrained; all mapped root nodes are exact."""
    p=np.array([[q['r'],q['z']] for q in profile]);s=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))]
    frontmost_i=int(np.argmax(p[:,1]));mouth_i=frontmost_i
    # A disk exactly tangent to the rollover makes a zero-angle fluid wedge.
    # Keep >=15 degrees between the FEM cap and local horn tangent. This is an
    # artificial coupling plane; downstream horn remains in the exterior model.
    while mouth_i>1 and math.atan2(p[mouth_i+1,0]-p[mouth_i-1,0],p[mouth_i+1,1]-p[mouth_i-1,1])>math.radians(75): mouth_i-=1
    sm=s[mouth_i];length=s[-1];radius=float(p[:,0].max())
    seam=-math.pi/count
    ntheta=segments
    angles=np.linspace(seam,seam+2*math.pi,ntheta+1)
    coords={};known={};pointcache={};edgecache={};geo=gmsh.model.geo
    def point(x,y,world=None):
        key=(round(float(x),12),round(float(y),12))
        if key not in pointcache:
            tag=geo.addPoint(float(x),float(y),0,h);pointcache[key]=tag;coords[tag]=[x,y]
        tag=pointcache[key]
        if world is not None:known[tag]=world
        return tag
    def line(a,b):
        key=tuple(sorted([a,b]))
        if key not in edgecache:edgecache[key]=geo.addLine(*key)
        return edgecache[key] if a<b else -edgecache[key]
    def loop(points):return geo.addCurveLoop([line(a,b) for a,b in zip(points,points[1:]+points[:1])])
    def s_of_root(root):
        # Canonical roots lie on the forward branch, where z is monotone.
        return np.interp(root[2],p[:mouth_i+1,1],s[:mouth_i+1])
    holes=[];root_s=[]
    for root in roots:
        ids=[]
        for world in root:
            theta=(math.atan2(world[1],world[0])-seam)%(2*math.pi)+seam
            sr=s_of_root(world);root_s.append(sr);ids.append(point(sr,(theta-seam)*radius,world))
        xy=np.array([coords[k] for k in ids])
        if np.ptp(xy[:,1])/radius>math.pi:raise ValueError('Entry crosses the horn chart seam; move seam or reject unsupported geometry')
        area=np.sum(xy[:,0]*np.roll(xy[:,1],-1)-xy[:,1]*np.roll(xy[:,0],-1))
        if abs(area)<1e-10:raise ValueError('Degenerate horn root in parameter chart')
        if area>0:ids.reverse()
        holes.append(loop(ids))
    # Preserve every profile station outside the root band. Within the band,
    # constrained hole points have priority; chord error is reported below.
    lo,hi=min(root_s),max(root_s)
    profile_ids=profile_keep(profile,profile_tolerance) if profile_tolerance else range(len(profile))
    cuts=sorted(set([0.,float(sm),float(length)]+[float(s[i]) for i in profile_ids if s[i]<lo-h or s[i]>hi+h]))
    # Avoid tiny chart slivers at the meridian rollover endpoints.
    keep=[cuts[0]]
    for x in cuts[1:]:
        if x-keep[-1]>.00008 or x in (sm,length):keep.append(x)
    cuts=keep
    if band_step:
        # Subdivide only the structured bands. The root-hole chart must remain
        # one constrained surface; its edges are bounded conformingly below.
        cuts=sorted(set(cuts+[float(x) for a,b in zip(cuts,cuts[1:])
            if not (a<=lo and b>=hi)
            for x in np.linspace(a,b,int(math.ceil((b-a)/band_step))+1)]))
    ring={};surfaces=[];surface_kind={};surface_root={};surface_range={}
    for x in cuts: ring[x]=[point(x,(th-seam)*radius) for th in angles]
    for a,b in zip(cuts,cuts[1:]):
        # Both seam curves share the same meridian stations after mapping.
        path=[ring[a][0],ring[b][0]]+ring[b][1:]+list(reversed(ring[a][1:]))
        includes=a<=lo and b>=hi
        sid=geo.addPlaneSurface([loop(path)]+(holes if includes else []));surfaces.append(sid)
        surface_kind[sid]='front' if b<=sm+1e-12 else 'roll';surface_root[sid]=includes;surface_range[sid]=(a,b)
    geo.synchronize()
    for (a,b),edge in edgecache.items():
        # Map intermediate meridian seam nodes onto the canonical horn BEFORE
        # refinement. Subdividing a long straight chord afterward cannot
        # restore the curved horn and silently keeps a large geometric error.
        delta=np.abs(np.asarray(coords[a])-coords[b])
        seam_step=min(band_step or h,h*.4)
        nodes=max(2,int(math.ceil(delta[0]/seam_step))+1) if delta[1]<1e-12 else 2
        gmsh.model.mesh.setTransfiniteCurve(edge,nodes)
    gmsh.option.setNumber('Mesh.MeshSizeMin',h*.15);gmsh.option.setNumber('Mesh.MeshSizeMax',h)
    gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary',0);gmsh.option.setNumber('Mesh.MeshSizeFromPoints',0)
    gmsh.option.setNumber('Mesh.Algorithm',6)
    gmsh.model.mesh.generate(2)
    nt,xyz,_=gmsh.model.mesh.getNodes();uv=np.array(xyz).reshape(-1,3)[:,:2];pos={int(k):v for k,v in zip(nt,uv)}
    exact={}
    for tag,world in known.items():
        ids,_,_=gmsh.model.mesh.getNodes(0,tag)
        if len(ids)!=1:raise ValueError('Constrained root point lost')
        exact[int(ids[0])]=world
    def mapped(node):
        if node in exact:return exact[node]
        u,v=pos[node];r=np.interp(u,s,p[:,0]);z=np.interp(u,s,p[:,1]);theta=v/radius+seam
        return [r*math.cos(theta),r*math.sin(theta),z]
    facets=[];deviation=0
    for sid in surfaces:
        if not surface_root[sid]:
            a,b=surface_range[sid]
            for j in range(ntheta):
                uv4=np.array([[a,angles[j]],[b,angles[j]],[b,angles[j+1]],[a,angles[j+1]]])
                world4=np.array([[np.interp(u,s,p[:,0])*math.cos(th),np.interp(u,s,p[:,0])*math.sin(th),np.interp(u,s,p[:,1])] for u,th in uv4])
                for ids in ([0,1,2],[0,2,3]):
                    world=world4[ids];u,th=uv4[ids].mean(axis=0)
                    ideal=np.array([np.interp(u,s,p[:,0])*math.cos(th),np.interp(u,s,p[:,0])*math.sin(th),np.interp(u,s,p[:,1])])
                    deviation=max(deviation,float(np.linalg.norm(world.mean(axis=0)-ideal)))
                    facets.append((world.tolist(),surface_kind[sid]))
            continue
        types,_,nodes=gmsh.model.mesh.getElements(2,sid)
        for typ,nn in zip(types,nodes):
            if typ!=2:raise ValueError('Nontriangle chart mesh')
            for f in np.array(nn).reshape(-1,3):
                world=np.array([mapped(int(k)) for k in f]);cen=world.mean(axis=0);u,v=np.array([pos[int(k)] for k in f]).mean(axis=0)
                ideal=np.array([np.interp(u,s,p[:,0])*math.cos(v/radius+seam),np.interp(u,s,p[:,0])*math.sin(v/radius+seam),np.interp(u,s,p[:,1])])
                deviation=max(deviation,float(np.linalg.norm(cen-ideal)))
                facets.append((world.tolist(),surface_kind[sid]))
    getring=lambda x: [[float(np.interp(x,s,p[:,0]))*math.cos(th),float(np.interp(x,s,p[:,0]))*math.sin(th),float(np.interp(x,s,p[:,1]))] for th in angles[:-1]]
    return facets,{'throat':getring(0),'mouth':getring(sm),'lip':getring(length)},angles[:-1],{'chart_centroid_chord_deviation_max_m':deviation,'azimuth_segments':ntheta,'mouth_station_index':mouth_i,'geometric_frontmost_station_index':frontmost_i,'interface_kind':'artificial FEM coupling plane before tangent rollover; retain remaining horn in coupled exterior','mouth_z_m':float(p[mouth_i,1]),'mouth_radius_m':float(p[mouth_i,0])}


def build_structured(job,segments=48,profile_tolerance_m=.0005,root_band_size_m=.06,maximum_edge_m=.06):
    if not all(math.isfinite(x) and x>0 for x in (profile_tolerance_m,root_band_size_m,maximum_edge_m)):
        raise ValueError('Profile tolerance, root-band spacing and maximum edge must be positive finite values')
    if segments<16 or segments%4 or maximum_edge_m<=0:raise ValueError('Use a positive edge limit and an azimuth count divisible by four, at least16')
    radius=max(q['r'] for q in job['enclosure']['outer_profile_m'])
    angular=2*radius*math.sin(math.pi/segments)
    if angular>=maximum_edge_m:raise ValueError('Azimuth segments too sparse for the requested maximum edge')
    band_step=.96*math.sqrt(maximum_edge_m**2-angular**2)
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0);gmsh.model.add('coarse_exterior')
    try:
        roots=[b['root_ring_m'] for b in job['parts']['branches']]
        facets,rings,angles,chart=structured_horn_chart(job['horn']['inner_profile_m'],roots,root_band_size_m,len(roots),profile_tolerance_m,segments,band_step)
        surface=Boundary()
        for points,_ in facets:surface.triangle(points,11)
        profile=job['enclosure']['outer_profile_m'];outer=[profile[i] for i in profile_keep(profile,profile_tolerance_m)]
        subdivided=[outer[0]]
        for a,b in zip(outer,outer[1:]):
            length=math.hypot(b['r']-a['r'],b['z']-a['z'])
            count=max(1,int(math.ceil(length/band_step)))
            subdivided.extend([{'r':a['r']+(b['r']-a['r'])*i/count,'z':a['z']+(b['z']-a['z'])*i/count} for i in range(1,count+1)])
        outer=subdivided
        lathe(surface,outer,angles,12)
        disk(surface,rings['throat'],302,root_band_size_m)
        rear=[[outer[0]['r']*math.cos(a),outer[0]['r']*math.sin(a),outer[0]['z']] for a in angles]
        disk(surface,rear,13,root_band_size_m)
        refinement_iterations=refine(surface,maximum_edge_m)
        coarse=surface.data();canonical_boundary_check(coarse,job)
        capped,seams=with_caps(coarse,job)
        closed=Boundary();closed.append(capped['vertices_m'],capped['faces'],capped['face_tags']);oriented_check(closed,-1);capped=closed.data()
        # Transfer the globally checked orientation to the open exterior.
        coarse=exterior(capped);capped,seams=with_caps(coarse,job);qc=topology(capped)
        canonical_boundary=canonical_boundary_check(coarse,job)
        qc['manifold_vertices']=vertex_manifold_check(capped)
        if qc['maximum_edge_m']>maximum_edge_m*(1+1e-9):raise ValueError('Surface exceeds requested maximum edge')
        intersections=intersection_check(capped)
        report={'schema':'meh-coarse-exterior/v1','method':'structured meridian bands; constrained Gmsh chart only through the four root openings','exterior_faces':len(coarse['faces']),'exterior_vertices':len(coarse['vertices_m']),'azimuth_segments':segments,'root_band_size_m':root_band_size_m,'maximum_edge_requested_m':maximum_edge_m,'conforming_refinement_iterations':refinement_iterations,'canonical_boundary_check':canonical_boundary,'canonical_root_seams_exact':True,'root_seams':seams,'closure_with_diagnostic_canonical_caps':qc,'intersections_with_diagnostic_canonical_caps':intersections,
                'approximation':{'retained_profile_rdp_tolerance_m':profile_tolerance_m,'profile_tolerance_scope':'Canonical meridian polyline to retained RDP chords; the horn root band uses a separate constrained chart and is excluded from this bound.','maximum_azimuth_circle_chord_sagitta_m':max(q['r'] for q in profile)*(1-math.cos(math.pi/segments)),'pre_refinement_horn_centroid_mapping_deviation_sample_max_m':chart['chart_centroid_chord_deviation_max_m'],'centroid_value_is_global_bound':False,'final_surface_samples':sampled_revolution_deviation(coarse,job),'root_band_note':'Unstructured root-band triangles are sampled against the canonical meridian mapping; the sampled maximum is not a certified Hausdorff bound. All128 vertices of every entry remain exact.'},
                'solver_status':'Geometry approximation for native solver import and convergence studies. No acoustic solve or proprietary AKABAK verification. Canonical design is unchanged; diagnostic entry fans must be replaced by matched FEM interface caps.'}
        return coarse,capped,report
    finally:gmsh.finalize()


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mesh');p.add_argument('job');p.add_argument('--out',required=True);p.add_argument('--target-faces',type=int,default=4500);p.add_argument('--tolerance-mm',type=float,default=.5);p.add_argument('--certificate-seconds',type=float,default=60);p.add_argument('--structured',action='store_true');p.add_argument('--segments',type=int,default=48);p.add_argument('--max-edge-mm',type=float,default=60);p.add_argument('--root-band-mm',type=float,default=60,help='Constrained horn root-band chart spacing in structured mode');args=p.parse_args()
    raw=Path(args.mesh).read_bytes();source=json.loads(raw);job=json.loads(Path(args.job).read_text());out=Path(args.out)
    coarse,capped,report=build_structured(job,args.segments,args.tolerance_mm*.001,root_band_size_m=args.root_band_mm*.001,maximum_edge_m=args.max_edge_mm*.001) if args.structured else build(source,job,args.target_faces,args.tolerance_mm*.001,seconds=args.certificate_seconds)
    out.mkdir(parents=True,exist_ok=True);report['input_mesh_sha256']=hashlib.sha256(raw).hexdigest();report['design_sha256']=job['manifest']['design_sha256'];report['geometry_input']='canonical job' if args.structured else 'existing boundary mesh';report['builder_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    for name,data in [('exterior-open',coarse),('exterior-diagnostic-capped',capped)]:
        path=out/(name+'.msh');write_msh(data,path);report[name+'_gmsh_import']=import_check(data,path);encoded=json.dumps(data,separators=(',',':')).encode();(out/(name+'.json')).write_bytes(encoded);report[name+'_sha256']=hashlib.sha256(encoded).hexdigest()
    (out/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps({key:value for key,value in report.items() if key!='root_seams'}),flush=True)


if __name__=='__main__':main()
