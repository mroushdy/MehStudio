"""Build conforming acoustic boundaries from canonical MEH passages (SI throughout).

Gmsh triangulates a constrained meridian/azimuth chart; its holes are the actual
canonical passage roots. Weld by shared coordinates, never by concatenating the
renderer's shader-clipped horn. Requires gmsh, numpy, scipy. No runtime installs.
"""
from pathlib import Path
import argparse, collections, hashlib, json, math, subprocess, sys, time
import gmsh
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

WALL, HORN, OUTSIDE, BACK, MOUTH, THROAT = 10, 11, 12, 13, 301, 302

class Boundary:
    def __init__(self):
        self.vertices=[]; self.faces=[]; self.tags=[]; self.lookup={}
    def point(self,p):
        key=tuple(np.round(p,11))
        if key not in self.lookup:
            self.lookup[key]=len(self.vertices); self.vertices.append(list(map(float,p)))
        return self.lookup[key]
    def triangle(self,p,tag):
        f=[self.point(q) for q in p]
        if len(set(f))!=3: raise ValueError('Collapsed triangle during shared-node assembly')
        self.faces.append(f);self.tags.append(int(tag))
    def append(self,vertices,faces,tags):
        for f,t in zip(faces,tags): self.triangle([vertices[i] for i in f],t)
    def data(self):return {'vertices_m':self.vertices,'faces':self.faces,'face_tags':self.tags}


def oriented_check(mesh, desired_sign=1):
    """Enforce shared-edge orientation and reject open/multiple/nonorientable shells."""
    vertices=np.array(mesh.vertices);faces=np.array(mesh.faces);tags=np.array(mesh.tags)
    raw=collections.defaultdict(list)
    for fi,f in enumerate(faces):
        for a,b in zip(f,np.roll(f,-1)):raw[(min(a,b),max(a,b))].append((fi,1 if a<b else -1))
    bad=[(k,len(v)) for k,v in raw.items() if len(v)!=2]
    if bad:raise ValueError(f'Boundary not closed/manifold: {len(bad)} bad edges; {bad[:5]}')
    adj=[[] for _ in faces]
    for uses in raw.values():
        (a,x),(b,y)=uses;adj[a].append((b,-x*y));adj[b].append((a,-x*y))
    orient=np.zeros(len(faces),np.int8);queue=[0];orient[0]=1
    for a in queue:
        for b,rel in adj[a]:
            want=orient[a]*rel
            if orient[b] and orient[b]!=want:raise ValueError('Nonorientable boundary')
            if not orient[b]:orient[b]=want;queue.append(b)
    if len(queue)!=len(faces):raise ValueError(f'Disconnected boundary {len(queue)}/{len(faces)} faces')
    faces[orient<0]=faces[orient<0][:,[0,2,1]]
    vol=float(np.einsum('ij,ij->i',vertices[faces[:,0]],np.cross(vertices[faces[:,1]],vertices[faces[:,2]])).sum()/6)
    if vol*desired_sign<0: faces=faces[:,[0,2,1]];vol=-vol
    mesh.faces=faces.tolist()
    cross=np.cross(vertices[faces[:,1]]-vertices[faces[:,0]],vertices[faces[:,2]]-vertices[faces[:,0]])
    areas=np.linalg.norm(cross,axis=1)/2
    if not np.isfinite(areas).all() or areas.min()<1e-16: raise ValueError('Nonpositive/nonfinite triangle area')
    edges=vertices[faces[:,[1,2,0]]]-vertices[faces]
    lens=np.linalg.norm(edges,axis=2)
    q=4*np.sqrt(3)*areas/(lens*lens).sum(axis=1)
    normalized=np.sort(faces,axis=1)
    if len(np.unique(normalized,axis=0))!=len(faces):raise ValueError('Duplicate faces')
    return {'vertices':len(vertices),'triangles':len(faces),'connected_components':1,'open_or_nonmanifold_edges':0,
        'oriented_edge_incidence_two':True,'duplicate_faces':0,'signed_volume_m3':vol,
        'minimum_area_m2':float(areas.min()),'maximum_edge_m':float(lens.max()),
        'minimum_triangle_quality':float(q.min()),'mean_triangle_quality':float(q.mean()),
        'tag_areas_m2':{str(t):float(areas[tags==t].sum()) for t in sorted(set(tags))},
        'tag_faces':{str(t):int((tags==t).sum()) for t in sorted(set(tags))}}


def profile_keep(profile,tolerance):
    p=np.array([[q['r'],q['z']] for q in profile]);keep={0,len(p)-1}
    def recurse(a,b):
        if b-a<2:return
        d=p[b]-p[a];u=np.clip((p[a+1:b]-p[a])@d/(d@d),0,1);dist=np.linalg.norm(p[a+1:b]-(p[a]+u[:,None]*d),axis=1);j=int(np.argmax(dist))+a+1
        if dist[j-a-1]>tolerance:keep.add(j);recurse(a,j);recurse(j,b)
    recurse(0,len(p)-1);return sorted(keep)

def chart_horn(profile,roots,h,count,profile_tolerance=None,azimuth_segments=None):
    """Hole edges and mouth cut are constrained; all mapped root nodes are exact."""
    p=np.array([[q['r'],q['z']] for q in profile]);s=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))]
    frontmost_i=int(np.argmax(p[:,1]));mouth_i=frontmost_i
    # A disk exactly tangent to the rollover makes a zero-angle fluid wedge.
    # Keep >=15 degrees between the FEM cap and local horn tangent. This is an
    # artificial coupling plane; downstream horn remains in the exterior model.
    while mouth_i>1 and math.atan2(p[mouth_i+1,0]-p[mouth_i-1,0],p[mouth_i+1,1]-p[mouth_i-1,1])>math.radians(75): mouth_i-=1
    sm=s[mouth_i];length=s[-1];radius=float(p[:,0].max())
    seam=-math.pi/count
    ntheta=azimuth_segments or max(64,int(math.ceil(2*math.pi*radius/h/count))*count)
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
    ring={};surfaces=[];surface_kind={}
    for x in cuts: ring[x]=[point(x,(th-seam)*radius) for th in angles]
    for a,b in zip(cuts,cuts[1:]):
        # Both seam curves share the same meridian stations after mapping.
        path=[ring[a][0],ring[b][0]]+ring[b][1:]+list(reversed(ring[a][1:]))
        includes=a<=lo and b>=hi
        sid=geo.addPlaneSurface([loop(path)]+(holes if includes else []));surfaces.append(sid)
        surface_kind[sid]='front' if b<=sm+1e-12 else 'roll'
    geo.synchronize()
    for e in edgecache.values():gmsh.model.mesh.setTransfiniteCurve(e,2)
    gmsh.option.setNumber('Mesh.MeshSizeMin',h*.15);gmsh.option.setNumber('Mesh.MeshSizeMax',h)
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


def lathe(mesh,profile,angles,tag):
    rings=[[[q['r']*math.cos(a),q['r']*math.sin(a),q['z']] for a in angles] for q in profile]
    for ra,rb in zip(rings,rings[1:]):
        for j in range(len(angles)):
            k=(j+1)%len(angles);mesh.triangle([ra[j],ra[k],rb[k]],tag);mesh.triangle([ra[j],rb[k],rb[j]],tag)
    return rings


def bridge(mesh,first,second,tag):
    """Join corresponding canonical rings without a buried return or cap."""
    if len(first)!=len(second):raise ValueError('Exterior seam correspondence differs')
    for j in range(len(first)):
        k=(j+1)%len(first)
        mesh.triangle([first[j],first[k],second[k]],tag)
        mesh.triangle([first[j],second[k],second[j]],tag)


def extruded_bridge(mesh,first,second,tag,h):
    """Resolve long straight generators before triangulation, avoiding slivers.

    Only translated rings use this path: the original ruled quads are planar,
    so intermediate rings stay exactly on the same piecewise-planar surface.
    """
    a=np.asarray(first);b=np.asarray(second);delta=b-a
    if not np.allclose(delta,delta[0],rtol=0,atol=1e-12):raise ValueError('Extrusion requires translated rings')
    steps=max(1,math.ceil(float(np.linalg.norm(delta[0]))/(h*.8)))
    last=first
    for step in range(1,steps+1):
        ring=second if step==steps else (a+delta*step/steps).tolist()
        bridge(mesh,last,ring,tag);last=ring


def individual_exterior(mesh,job,inner_rings,angles,h,ptol):
    """Exposed outer horn + adapter shells + real cylindrical sealed pods."""
    enclosure=job['enclosure'];pods=enclosure['pods']
    gmsh.clear();gmsh.model.add('outer_horn_chart')
    facets,rings,_,qc=chart_horn(job['horn']['outer_profile_m'],
        [p['root_ring_m'] for p in pods],h,len(pods),ptol or None,len(angles))
    for tri,_ in facets:mesh.triangle(tri,OUTSIDE)
    bridge(mesh,inner_rings['lip'],rings['lip'],OUTSIDE)
    disk(mesh,rings['throat'],OUTSIDE,h)
    for index,pod in enumerate(pods):
        chain=pod['adapter_rings_m']
        for first,second in zip(chain,chain[1:]):bridge(mesh,first,second,OUTSIDE)
        extruded_bridge(mesh,chain[-1],pod['rear_ring_m'],OUTSIDE,h)
        if enclosure.get('vents'):
            vent_boundary(mesh,pod['rear_ring_m'],enclosure['vents'][index],h)
        else:disk(mesh,pod['rear_ring_m'],BACK,h)
    qc['outer_root_count']=len(pods)
    qc['join']='Exact outer-root intersections, adapter mounting rings and pod caps; no buried adapter returns'
    return qc


def vent_boundary(mesh,rear_ring,vent,h):
    """A real open duct, terminated at its inner end by an independent basis.

    No sealed rear wall covers the vent mouth. The inlet velocity basis does
    not model rear cavity pressure or an electrical motor; its load is part of
    the same exterior-connected field as the front-cone bases.
    """
    center=np.asarray(vent['mouth_center_m']);axis=np.asarray(vent['axis_into_exterior'])
    opening=vent['opening_ring_m'];inlet=vent['inlet_ring_m']
    if vent['shape'] not in ('round','rectangle'):raise ValueError('Unsupported rear vent outline')
    for ring in (rear_ring,opening):
        if np.max(np.abs((np.asarray(ring)-center)@axis))>1e-10:raise ValueError('Rear vent cap is not planar')
    # Keep the canonical 128-gon or all four rectangle corners exactly, even
    # when the enclosing rear cap has a different number of azimuth segments.
    planar_annulus(mesh,rear_ring,opening,BACK,h)
    extruded_bridge(mesh,opening,inlet,OUTSIDE,h)
    disk(mesh,inlet,vent['source_tag'],h)


def planar_annulus(mesh,outer,inner,tag,h):
    """Constrained planar cap with distinct outer/inner vertex counts."""
    gmsh.clear();gmsh.model.add('rear_cap');geo=gmsh.model.geo
    loops=[]
    for ring in (outer,inner):
        points=[geo.addPoint(*p,h) for p in ring]
        edges=[geo.addLine(a,b) for a,b in zip(points,points[1:]+points[:1])]
        loops.append(geo.addCurveLoop(edges))
    surface=geo.addPlaneSurface(loops);geo.synchronize()
    for _,edge in gmsh.model.getEntities(1):gmsh.model.mesh.setTransfiniteCurve(edge,2)
    gmsh.model.mesh.generate(2)
    ids,coords,_=gmsh.model.mesh.getNodes();positions={int(k):p for k,p in zip(ids,np.asarray(coords).reshape(-1,3))}
    types,_,nodes=gmsh.model.mesh.getElements(2,surface)
    if list(types)!=[2]:raise ValueError('Rear annulus is not triangular')
    for face in np.asarray(nodes[0]).reshape(-1,3):mesh.triangle([positions[int(i)] for i in face],tag)


def disk(mesh,ring,tag,h):
    """Concentric rings avoid high aspect-ratio center fans on large closures."""
    center=np.mean(ring,axis=0);radius=np.linalg.norm(np.array(ring[0])-center);n=max(1,int(math.ceil(radius/h)))
    last=ring
    for layer in range(n-1,0,-1):
        new=(center+(np.array(ring)-center)*layer/n).tolist()
        for j in range(len(ring)):
            k=(j+1)%len(ring);mesh.triangle([last[j],last[k],new[k]],tag);mesh.triangle([last[j],new[k],new[j]],tag)
        last=new
    for j in range(len(ring)):mesh.triangle([last[j],last[(j+1)%len(ring)],center],tag)


def refine(mesh,maxedge):
    """Conforming longest-edge bisection retains piecewise-planar canonical walls."""
    vv=list(mesh.vertices);ff=np.array(mesh.faces,dtype=np.int64);tt=np.array(mesh.tags,dtype=np.int64)
    for iteration in range(15):
        v=np.array(vv);edges=np.sort(np.concatenate([ff[:,[0,1]],ff[:,[1,2]],ff[:,[2,0]]]),axis=1)
        edges=np.unique(edges,axis=0);ll=np.linalg.norm(v[edges[:,0]]-v[edges[:,1]],axis=1)
        marked=edges[ll>maxedge*(1+1e-10)]
        if not len(marked):break
        # Splitting every selected edge with a polygon center is conforming and
        # preserves each original planar facet; only rare fully tiny facets persist.
        mid={}
        for a,b in marked:mid[(int(a),int(b))]=len(vv);vv.append(((v[a]+v[b])/2).tolist())
        nf=[];nt=[]
        for f,tag in zip(ff,tt):
            poly=[]
            for a,b in zip(f,np.roll(f,-1)):
                poly.append(int(a));key=(min(int(a),int(b)),max(int(a),int(b)))
                if key in mid:poly.append(mid[key])
            if len(poly)==3:nf.append(f.tolist());nt.append(tag);continue
            if len(poly)==4:
                # the vertex between the original endpoints is the midpoint
                j=next(j for j,x in enumerate(poly) if x>=len(v));a=poly[j];b=poly[(j+2)%4]
                nf.extend([[a,poly[(j+1)%4],b],[a,b,poly[(j+3)%4]]]);nt.extend([tag]*2)
            else:
                c=len(vv);vv.append(np.mean(v[f],axis=0).tolist())
                for a,b in zip(poly,poly[1:]+poly[:1]):nf.append([a,b,c]);nt.append(tag)
        ff=np.array(nf);tt=np.array(nt)
    else:raise ValueError('Edge refinement budget exceeded')
    mesh.vertices=vv;mesh.faces=ff.tolist();mesh.tags=tt.tolist();return iteration


def msh22(mesh,path,names):
    lines=['$MeshFormat','2.2 0 8','$EndMeshFormat','$PhysicalNames',str(len(set(mesh.tags)))]
    lines += [f'2 {t} "{names.get(t,str(t))}"' for t in sorted(set(mesh.tags))]
    lines+=['$EndPhysicalNames','$Nodes',str(len(mesh.vertices))]
    lines += [f'{i+1} '+ ' '.join(f'{x:.16g}' for x in p) for i,p in enumerate(mesh.vertices)]
    lines+=['$EndNodes','$Elements',str(len(mesh.faces))]
    lines += [f'{i+1} 2 2 {t} {t} '+ ' '.join(str(v+1) for v in f) for i,(f,t) in enumerate(zip(mesh.faces,mesh.tags))]
    lines+=['$EndElements',''];Path(path).write_text('\n'.join(lines))


def import_check(path,expected,mesh=None):
    gmsh.clear();gmsh.open(str(path));types,ets,ns=gmsh.model.mesh.getElements(2)
    n=sum(len(t) for t in ets)
    if n!=expected:raise ValueError('Gmsh import changed element count')
    groups={str(t):gmsh.model.getPhysicalName(d,t) for d,t in gmsh.model.getPhysicalGroups()}
    if mesh is not None:
        nt,xyz,_=gmsh.model.mesh.getNodes();ids=np.argsort(nt)
        if not np.array_equal(np.asarray(nt)[ids],np.arange(1,len(mesh.vertices)+1)):raise ValueError('Gmsh node identities changed')
        if not np.allclose(np.asarray(xyz).reshape(-1,3)[ids],mesh.vertices,rtol=0,atol=1e-15):raise ValueError('Gmsh coordinate/unit round trip failed')
        if set(map(int,groups))!=set(mesh.tags):raise ValueError('Gmsh lost physical groups')
        for tag in set(mesh.tags):
            elements=[];connectivity=[]
            for entity in gmsh.model.getEntitiesForPhysicalGroup(2,tag):
                typ,ets,ns=gmsh.model.mesh.getElements(2,int(entity))
                if list(typ)!=[2]:raise ValueError('Nonlinear or nontriangle import')
                elements.extend(ets[0]);connectivity.extend(np.asarray(ns[0]).reshape(-1,3))
            order=np.argsort(elements);expected_ids=np.flatnonzero(np.asarray(mesh.tags)==tag)
            if not np.array_equal(np.asarray(elements)[order],expected_ids+1) or not np.array_equal(np.asarray(connectivity)[order],np.asarray(mesh.faces)[expected_ids]+1):raise ValueError('Gmsh connectivity, winding or physical tags changed')
    return {'parser':'Gmsh '+gmsh.__version__,'triangles':n,'physical_groups':groups,
        'coordinate_connectivity_winding_and_tag_roundtrip':mesh is not None,'coordinate_absolute_tolerance_m':1e-15 if mesh is not None else None,'passed':True}


def resources(started,face_count):
    peak=None
    try:
        import resource
        peak=int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)*(1 if sys.platform=='darwin' else 1024)
    except (ImportError,AttributeError):pass
    return {'native_elapsed_seconds_before_adapter':time.monotonic()-started,
        'native_process_peak_rss_bytes':peak,'rss_scope':'Native Python/Gmsh process only; excludes Node adapter and solver',
        'one_dense_complex128_face_matrix_bytes':16*face_count**2,
        'matrix_estimate_scope':'Arithmetic face-count estimate only; excludes solver refinement, factorization and workspaces; not measured AKABAK RAM',
        'proprietary_solver_run':False}


def tetrahedralize(mesh,path,h,gap_size=None):
    gmsh.clear();gmsh.model.add('connected_front_air');geo=gmsh.model.geo
    # Exact PLC triangles become CAD faces: all interfaces and insert diagonals
    # survive. Mesh size is bounded globally and reduced in front-chamber air by
    # the existing canonical boundary triangulation.
    v=np.array(mesh.vertices);f=np.array(mesh.faces);tags=np.array(mesh.tags)
    local_vertices=set(f[(tags==10)|((tags>=101)&(tags<200))].ravel().tolist())
    for i,p in enumerate(v):geo.addPoint(*p,min(h,gap_size) if gap_size and i in local_vertices else h,i+1)
    edges={};surfaces=[]
    for face in f:
        chain=[]
        for a,b in zip(face,np.roll(face,-1)):
            key=(min(int(a),int(b)),max(int(a),int(b)))
            if key not in edges:edges[key]=geo.addLine(key[0]+1,key[1]+1)
            chain.append(edges[key] if a<b else -edges[key])
        surfaces.append(geo.addPlaneSurface([geo.addCurveLoop(chain)]))
    volume=geo.addVolume([geo.addSurfaceLoop(surfaces)]);geo.synchronize()
    for tag in sorted(set(tags)):
        gmsh.model.addPhysicalGroup(2,[surfaces[i] for i in np.flatnonzero(tags==tag)],int(tag));gmsh.model.setPhysicalName(2,int(tag),'boundary_'+str(tag))
    gmsh.model.addPhysicalGroup(3,[volume],401);gmsh.model.setPhysicalName(3,401,'connected_front_air')
    gmsh.option.setNumber('Mesh.MeshSizeMin',h*.02);gmsh.option.setNumber('Mesh.MeshSizeMax',h)
    gmsh.option.setNumber('Mesh.MeshSizeFromPoints',1);gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary',1)
    gmsh.option.setNumber('Mesh.Algorithm3D',10);gmsh.option.setNumber('Mesh.Optimize',1)
    gmsh.option.setNumber('Mesh.MshFileVersion',4.1);gmsh.model.mesh.generate(3)
    types,et,nodes=gmsh.model.mesh.getElements(3)
    if list(types)!=[4]:raise ValueError('Expected linear tetrahedra')
    qual=np.array(gmsh.model.mesh.getElementQualities(et[0],'minSICN'))
    if not len(qual) or (qual<=0).any():raise ValueError('Nonpositive tet Jacobian/quality')
    gmsh.write(str(path))
    return {'tetrahedra':len(et[0]),'nodes':len(gmsh.model.mesh.getNodes()[0]),'minimum_SICN':float(qual.min()),'mean_SICN':float(qual.mean()),'positive_jacobians':True}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('job');parser.add_argument('--out',required=True);parser.add_argument('--size-mm',type=float);parser.add_argument('--no-volume',action='store_true');parser.add_argument('--volume',action='store_true');parser.add_argument('--gap-divisions',type=float,default=2);parser.add_argument('--skip-intersections',action='store_true');parser.add_argument('--profile-tolerance-mm',type=float,default=0)
    args=parser.parse_args();started=time.monotonic();job=json.loads(Path(args.job).read_text());out=Path(args.out)
    if out.exists() and any(out.iterdir()):raise ValueError('Output directory is not empty; choose a new folder to avoid mixing old and new meshes')
    out.mkdir(parents=True,exist_ok=True)
    manifest=job['manifest'];parts=job['parts'];options=job.get('options',{})
    freq=float(options.get('maxFrequencyHz',1000));epw=float(options.get('elementsPerWavelength',8));c=float(manifest.get('medium',{}).get('sound_speed_m_s',job['normalized_state']['soundSpeed']))
    h=min(c/(freq*epw),.025) if args.size_mm is None else args.size_mm*.001
    if not .0005<=h<=.06:raise ValueError('Edge target must be 0.5–60 mm')
    (out/'INCOMPLETE.txt').write_text('Export in progress or failed. Do not use this directory as a validated solver bundle.\n')
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0);gmsh.model.add('horn_chart')
    try:
        branches=parts['branches'];horn=job['horn'];exterior=job['enclosure']
        roots=[b['root_ring_m'] for b in branches]
        ptol=args.profile_tolerance_mm*.001
        if ptol<0 or ptol>.0002:raise ValueError('Profile tolerance must be0–0.2mm')
        facets,rings,angles,horn_qc=chart_horn(horn['inner_profile_m'],roots,h,len(branches),ptol or None)
        horn_qc['meridian_coarsening_tolerance_m']=ptol
        bem=Boundary();front=Boundary()
        for branch in branches:
            fs=[f for f,t in zip(branch['faces'],branch['face_tags']) if not 201<=t<300];ts=[t for t in branch['face_tags'] if not 201<=t<300]
            bem.append(branch['vertices_m'],fs,ts);front.append(branch['vertices_m'],fs,ts)
        for tri,kind in facets:
            bem.triangle(tri,HORN)
            if kind=='front':front.triangle(tri,HORN)
        disk(bem,rings['throat'],THROAT,h);disk(front,rings['throat'],THROAT,h);disk(front,rings['mouth'],MOUTH,h)
        exterior_qc={}
        if exterior['kind'] in ('individual-sealed-pods','individual-vented-pods'):
            exterior_qc=individual_exterior(bem,job,rings,angles,h,ptol)
        else:
            outer=exterior['outer_profile_m']
            if ptol:outer=[outer[i] for i in profile_keep(outer,ptol)]
            lathe(bem,outer,angles,OUTSIDE)
            rear_ring=[[outer[0]['r']*math.cos(a),outer[0]['r']*math.sin(a),outer[0]['z']] for a in angles]
            if exterior.get('vents'):vent_boundary(bem,rear_ring,exterior['vents'][0],h)
            else:disk(bem,rear_ring,BACK,h)
        # Exterior fluid's outward normal points INTO the enclosed obstacle;
        # therefore its signed enclosed volume is negative.
        refine(bem,h);refine(front,h)
        checks={'bem':oriented_check(bem,-1),'front':oriented_check(front,1),'horn':horn_qc,'exterior':exterior_qc}
        for label,mesh in [('bem',bem),('front',front)]:
            v=np.array(mesh.vertices);f=np.array(mesh.faces);tt=np.array(mesh.tags)
            source_checks=[]
            sources=manifest['drivers']+(manifest.get('vent_sources',[]) if label=='bem' else [])
            for driver in sources:
                sf=f[tt==driver['source_tag']]
                if not len(sf):raise ValueError('Missing independent source '+driver['id'])
                av=np.cross(v[sf[:,1]]-v[sf[:,0]],v[sf[:,2]]-v[sf[:,0]])/2
                flux=np.einsum('ij,j->i',av,np.asarray(driver.get('motion_into_front_air',driver.get('motion_into_air'))))
                if not np.all(flux<0):raise ValueError('Source outward-air normal inconsistent with inward motion')
                projected=float(-flux.sum());target=driver.get('nominal_sd_m2',driver['projected_mesh_area_m2']);relative=abs(projected/target-1)
                if relative>.002:raise ValueError('Source projected area differs from declared area by more than 0.2%')
                source_checks.append({'id':driver['id'],'source_tag':driver['source_tag'],'projected_area_m2':projected,'relative_declared_area_error':relative,'all_inward_drive_projections_positive':True})
            checks[label]['source_checks']=source_checks
        print(json.dumps({'stage':'assembled','bem':checks['bem']['triangles'],'front':checks['front']['triangles']}),flush=True)
        names={WALL:'front_rigid_wall',HORN:'horn_rigid_wall',OUTSIDE:'enclosure_exterior',BACK:'rear_panel',MOUTH:'mouth_coupling_interface',THROAT:'closed_HF_throat',**{101+i:f'mid_{i+1:02d}' for i in range(len(branches))},**{v['source_tag']:v['id'] for v in manifest.get('vent_sources',[])}}
        for label,mesh in [('bem-air-outward',bem),('front-boundary',front)]:
            path=out/(label+'.msh');msh22(mesh,path,names);checks[label+'_import']=import_check(path,len(mesh.faces),mesh);(out/(label+'.json')).write_text(json.dumps(mesh.data(),separators=(',',':')))
        if not args.skip_intersections:
            from validate_mesh import intersection_check
            checks['bem']['self_intersection']=intersection_check(bem.data());checks['front']['self_intersection']=intersection_check(front.data())
        if (args.volume or options.get('volumeMesh',False)) and not args.no_volume:
            print(json.dumps({'stage':'tetrahedralizing'}),flush=True);checks['volume']=tetrahedralize(front,out/'front-air.msh',h,job['normalized_state']['fillerClearance']*.001/args.gap_divisions if job['normalized_state']['frontFiller']!='none' else h*.12)
        for port in manifest['ports']:
            if port['tag']==MOUTH:
                port.update(center_m=[0,0,horn_qc['mouth_z_m']],radius_m=horn_qc['mouth_radius_m'],area_m2=math.pi*horn_qc['mouth_radius_m']**2,meridian_station_index=horn_qc['mouth_station_index'],usage=horn_qc['interface_kind'])
        manifest['mesh_export']={'method':'canonical PLC + constrained meridian chart; shared root nodes','normals':'outward from acoustic air; BEM negative solid volume','max_edge_m':h,'max_frequency_hz':freq,'elements_per_wavelength':epw,'gap_divisions_requested':args.gap_divisions,'achieved_elements_per_wavelength_at_requested_max':c/(freq*h),'nominal_frequency_for_requested_epw_hz':c/(epw*h),'edge_override_exceeds_wavelength_target':h>c/(freq*epw),'intersection_validation_skipped':args.skip_intersections,'density_status':'initial wavelength and geometry target; not acoustic convergence qualification','checks':checks}
        manifest['mesh_export']['provenance']={'job_sha256':hashlib.sha256(Path(args.job).read_bytes()).hexdigest(),'builder_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'python':sys.version.split()[0],'gmsh':gmsh.__version__,'numpy':np.__version__}
        checks['resources']=resources(started,len(bem.faces))
        (out/'manifest.json').write_text(json.dumps(manifest,indent=2));(out/'validation.json').write_text(json.dumps(checks,indent=2))
        script=Path(__file__).with_name('write_bundle.cjs')
        if script.exists():subprocess.run(['node',str(script),str(out)],check=True)
        if args.skip_intersections:
            (out/'INCOMPLETE.txt').write_text('Diagnostic output only: exhaustive intersection validation was skipped. Rebuild in a new folder without --skip-intersections.\n')
        else:(out/'INCOMPLETE.txt').unlink()
        print(json.dumps({'out':str(out),'runtime_s':time.monotonic()-started,'checks':checks}),flush=True)
    finally:gmsh.finalize()

if __name__=='__main__':main()
