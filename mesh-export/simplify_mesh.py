"""Conservative, tag-preserving BEM coarsening; never use this on a FEM volume.

The installed VTK DecimatePro proposes topology-preserving contractions with
accumulated squared error, or local squared error for explicit exterior-tag
overrides. Neither setting establishes our tolerance. An independent bidirectional triangle-interior
certificate is required before export: each source triangle is covered by
epsilon prisms over consistently oriented same-tag target triangles. Remaining
convex pieces are certified by distance of every vertex to ONE target triangle
(distance to a convex triangle is convex). This bounds entire triangle interiors,
not merely sampled vertices. A 1 nm numerical guard shrinks the allowed bound.
Failure to prove the requested bound rejects the candidate, even if it is close.

Physical-tag boundary vertices/edges are fixed exactly. Native manifold and
intersection checks run after coarsening. Density is still an acoustic-convergence
choice: a geometric tolerance does not establish a frequency band or accuracy.
Reference: https://vtk.org/doc/nightly/html/classvtkDecimatePro.html
"""
from pathlib import Path
import argparse, collections, hashlib, json, math, time, tempfile
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from vtkmodules.vtkCommonCore import vtkPoints, vtkIdList, vtkVersion
from vtkmodules.vtkCommonDataModel import vtkCellArray, vtkPolyData, vtkStaticCellLocator
from vtkmodules.vtkFiltersCore import vtkDecimatePro
from vtkmodules.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray, vtk_to_numpy


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


def tag_seams(f,tags):
    edges=collections.defaultdict(list)
    for face,tag in zip(f,tags):
        for a,b in zip(face,np.roll(face,-1)):edges[tuple(sorted((int(a),int(b))))].append(int(tag))
    return {edge:tuple(sorted(t)) for edge,t in edges.items() if len(set(t))>1}


def polydata(v,f):
    points=vtkPoints();points.SetData(numpy_to_vtk(np.ascontiguousarray(v),deep=True))
    cells=vtkCellArray();cells.SetData(numpy_to_vtkIdTypeArray(np.arange(len(f)+1,dtype=np.int64)*3,deep=True),numpy_to_vtkIdTypeArray(f.ravel(),deep=True))
    data=vtkPolyData();data.SetPoints(points);data.SetPolys(cells);return data


def candidate(mesh,tolerance_m,target_faces,feature_angle_deg=None,tag_tolerances=None):
    v,f,tags=arrays(mesh);mapping={tuple(p):i for i,p in enumerate(v)};new_faces=[];new_tags=[];patches=[]
    tag_tolerances=tag_tolerances or {}
    if len(mapping)!=len(v):raise ValueError('Input has coincident unwelded vertices')
    reduction=max(0.,min(.9999,1-target_faces/len(f)))
    for tag in np.unique(tags):
        tolerance=(tag_tolerances or {}).get(int(tag),tolerance_m)
        angle=feature_angle_deg if feature_angle_deg is not None else (.1 if tag==10 or 100<=tag<200 else 15.)
        patch=f[tags==tag];ids,inverse=np.unique(patch,return_inverse=True);local=inverse.reshape(-1,3)
        dec=vtkDecimatePro();dec.SetInputData(polydata(v[ids],local));dec.SetTargetReduction(reduction)
        dec.PreserveTopologyOn();dec.SplittingOff();dec.BoundaryVertexDeletionOff();dec.AccumulateErrorOn()
        if int(tag) in tag_tolerances:dec.AccumulateErrorOff()
        # VTK9.7 ComputeSimpleError/ComputeEdgeError use DISTANCE SQUARED;
        # its public AbsoluteError documentation does not state that unit.
        dec.SetErrorIsAbsolute(1);dec.SetAbsoluteError((tolerance*.5)**2);dec.SetFeatureAngle(angle);dec.SetOutputPointsPrecision(1)
        dec.Update();out=dec.GetOutput();ov=vtk_to_numpy(out.GetPoints().GetData());cells=out.GetPolys()
        if not np.all(np.diff(vtk_to_numpy(cells.GetOffsetsArray()))==3):raise ValueError('Decimator produced non-triangular cells')
        of=vtk_to_numpy(cells.GetConnectivityArray()).reshape(-1,3)
        try:original=np.asarray([mapping[tuple(p)] for p in ov],dtype=np.int64)
        except KeyError as e:raise ValueError('Decimator moved an original vertex') from e
        result=original[of];new_faces.extend(result.tolist());new_tags.extend([int(tag)]*len(result))
        patches.append({'tag':int(tag),'before':len(patch),'after':len(result)})
    nf=np.asarray(new_faces,dtype=np.int64);nt=np.asarray(new_tags,dtype=np.int64)
    if tag_seams(f,tags)!=tag_seams(nf,nt):raise ValueError('A physical-tag seam changed')
    used,inverse=np.unique(nf,return_inverse=True)
    return {'vertices_m':v[used].tolist(),'faces':inverse.reshape(-1,3).tolist(),'face_tags':new_tags},patches


def clip(poly,abc):
    """Split convex polygon by a*x+b*y+c <= 0, with no tolerance inflation."""
    if not len(poly):return [],[]
    inside=[];outside=[];p=poly[-1];dp=float(np.dot(abc[:2],p)+abc[2])
    for q in poly:
        dq=float(np.dot(abc[:2],q)+abc[2])
        if (dp<0)<(dq<0) or (dq<0)<(dp<0):
            x=p+(q-p)*(dp/(dp-dq));inside.append(x);outside.append(x)
        (inside if dq<=0 else outside).append(q);p=q;dp=dq
    def clean(points):
        unique=[]
        for point in points:
            if not unique or not np.array_equal(point,unique[-1]):unique.append(point)
        if len(unique)>1 and np.array_equal(unique[0],unique[-1]):unique.pop()
        # The removed target prism is CLOSED. Isolated zero-area clipping
        # remnants on its boundary are covered by closure of adjacent pieces;
        # they are not an untested positive-area portion of the source face.
        if len(unique)<3:return []
        a=np.asarray(unique);area=np.sum(a[:,0]*np.roll(a[:,1],-1)-a[:,1]*np.roll(a[:,0],-1))
        return unique if area!=0 else []
    return clean(inside),clean(outside)


def triangle_distances(points,tri):
    """Distances of P points to K closed triangles, P x K."""
    p=np.asarray(points)[:,None,:];a=tri[None,:,0];e=tri[None,:,1]-a;g=tri[None,:,2]-a;w=p-a
    ee=np.sum(e*e,axis=2);gg=np.sum(g*g,axis=2);eg=np.sum(e*g,axis=2);we=np.sum(w*e,axis=2);wg=np.sum(w*g,axis=2);det=ee*gg-eg*eg
    u=(gg*we-eg*wg)/det;z=(ee*wg-eg*we)/det;normal=np.cross(e,g);normal/=np.linalg.norm(normal,axis=2)[...,None]
    d2=np.where((u>=0)&(z>=0)&(u+z<=1),np.sum(w*normal,axis=2)**2,np.inf)
    for j in range(3):
        a=tri[None,:,j];edge=tri[None,:,(j+1)%3]-a;w=p-a;t=np.clip(np.sum(w*edge,axis=2)/np.sum(edge*edge,axis=2),0,1)
        d2=np.minimum(d2,np.sum((w-t[...,None]*edge)**2,axis=2))
    return np.sqrt(np.maximum(d2,0))


def planar_certificate(source,target):
    """Same oriented planar boundary + positive triangle Jacobians fixes support.

    Interior triangulations can differ. Their projected oriented boundary chains
    are identical, so their winding-number coverage is identical. Strictly
    positive triangle normals preclude cancellation of covered regions.
    """
    sv,sf,st=arrays(source);tv,tf,tt=arrays(target)
    if len(set(st.tolist()))!=1 or set(st.tolist())!=set(tt.tolist()):return None
    a=sv[sf[0,0]];n=np.cross(sv[sf[0,1]]-a,sv[sf[0,2]]-a);n/=np.linalg.norm(n)
    errors=[];boundaries=[];boundary_error=0.
    for vertices,faces in [(sv,sf),(tv,tf)]:
        tri=vertices[faces];cr=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);length=np.linalg.norm(cr,axis=1)
        if np.any(length<1e-16) or np.any(cr@n < length*(1-1e-10)):return None
        error=float(np.max(np.abs((vertices[np.unique(faces)]-a)@n)))
        if error>1e-12:return None
        errors.append(error);edges=collections.defaultdict(list)
        for face in faces:
            p=[tuple(vertices[i]) for i in face]
            for x,y in zip(p,p[1:]+p[:1]):edges[tuple(sorted((x,y)))].append((x,y))
        boundary=set()
        for uses in edges.values():
            if len(uses)==1:boundary.add(uses[0])
            elif len(uses)!=2 or uses[0]!=(uses[1][1],uses[1][0]):return None
        # VTK may remove intermediate points on a straight feature edge.
        # Canonicalize those chains while retaining a sum of displacement
        # bounds; corners and orientation must match exactly afterwards.
        links={x:y for x,y in boundary}
        if len(links)!=len(boundary) or len(set(links.values()))!=len(boundary):return None
        loops=[];unseen=set(links)
        while unseen:
            start=next(iter(unseen));point=start;loop=[]
            while point in unseen:unseen.remove(point);loop.append(point);point=links[point]
            if point!=start:return None
            changed=True
            while changed and len(loop)>3:
                changed=False
                for i in range(len(loop)):
                    A=np.asarray(loop[i-1]);B=np.asarray(loop[i]);C=np.asarray(loop[(i+1)%len(loop)]);edge=C-A;length=float(edge@edge)
                    if length==0:continue
                    t=float((B-A)@edge/length);distance=float(np.linalg.norm(B-(A+t*edge)))
                    if 0<=t<=1 and distance<=1e-14:
                        boundary_error+=distance;loop.pop(i);changed=True;break
            loops.append(min(tuple(loop[k:]+loop[:k]) for k in range(len(loop))))
        boundaries.append(set(loops))
    if not boundaries[0] or boundaries[0]!=boundaries[1]:return None
    return {'passed':True,'method':'same oriented planar boundary (straight-chain reduction) and positive projected triangle Jacobians','certified_upper_bound_m':sum(errors)+boundary_error+1e-12,'maximum_plane_deviations_m':errors,'boundary_chain_error_bound_m':boundary_error,'runtime_s':0.}


def piecewise_planar_certificate(source,target):
    """Fast exact-support certificate for subdivided cone sectors and facets."""
    sv,sf,st=arrays(source);tv,tf,tt=arrays(target);groups=[];started=time.monotonic()
    for vertices,faces,tags in [(sv,sf,st),(tv,tf,tt)]:
        tri=vertices[faces];normals=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);normals/=np.linalg.norm(normals,axis=1)[:,None];offset=np.einsum('ij,ij->i',normals,tri[:,0])
        values=np.c_[normals,offset];group=collections.defaultdict(list)
        for i,key in enumerate(np.round(values,7)):group[(int(tags[i]),*key)].append(i)
        groups.append(group)
    if groups[0].keys()!=groups[1].keys():return None
    maximum=0.
    for key,indices in groups[0].items():
        other=groups[1][key]
        a={'vertices_m':sv,'faces':sf[indices],'face_tags':st[indices]};b={'vertices_m':tv,'faces':tf[other],'face_tags':tt[other]}
        proof=planar_certificate(a,b)
        if proof is None:return None
        maximum=max(maximum,proof['certified_upper_bound_m'])
    return {'passed':True,'method':'complete same-plane patch partition, matching oriented boundaries, positive triangle Jacobians','patches_certified':len(groups[0]),'certified_upper_bound_m':maximum,'runtime_s':time.monotonic()-started}


def refine_max_edge(mesh,maximum_edge_m):
    """Conforming midpoint splits preserve the accepted piecewise-linear surface."""
    v,f,tags=arrays(mesh);vertices=v.tolist();faces=f.tolist();face_tags=tags.tolist();before=len(faces);iterations=0
    while True:
        values=np.asarray(vertices);tri=np.asarray(faces,dtype=np.int64);edge=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]);edge=np.unique(np.sort(edge,axis=1),axis=0)
        length=np.linalg.norm(values[edge[:,0]]-values[edge[:,1]],axis=1);marked=edge[length>maximum_edge_m*(1+1e-12)]
        if not len(marked):break
        iterations+=1
        if iterations>25:raise ValueError('Conforming edge refinement did not converge')
        mids={}
        for a,b in marked:mids[(int(a),int(b))]=len(vertices);vertices.append(((values[a]+values[b])/2).tolist())
        nf=[];nt=[]
        for face,tag in zip(faces,face_tags):
            mids_for=[mids.get(tuple(sorted((face[i],face[(i+1)%3])))) for i in range(3)];count=sum(m is not None for m in mids_for)
            if count==0:children=[face]
            elif count==3:
                a,b,c=face;ab,bc,ca=mids_for;children=[[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]]
            else:
                start=next(i for i,m in enumerate(mids_for) if m is not None) if count==1 else (next(i for i,m in enumerate(mids_for) if m is None)+1)%3
                a,b,c=face[start:]+face[:start];ab=mids_for[start]
                if count==1:children=[[a,ab,c],[ab,b,c]]
                else:bc=mids_for[(start+1)%3];children=[[b,bc,ab],[a,ab,c],[ab,bc,c]]
            nf.extend(children);nt.extend([tag]*len(children))
        faces,face_tags=nf,nt
    return {'vertices_m':vertices,'faces':faces,'face_tags':face_tags},{'maximum_edge_m':maximum_edge_m,'before_triangles':before,'after_triangles':len(faces),'iterations':iterations,'method':'conforming midpoint subdivision on accepted planar facets','support_roundoff_guard_m':1e-12}


def cover_triangle(source,target,tolerance_m,max_pieces=1000,deadline=None):
    """Certify complete triangle against union of epsilon target-triangle prisms."""
    A=source[0];E=source[1]-A;G=source[2]-A
    distances=triangle_distances(source,target)
    if np.min(np.max(distances,axis=0))<=tolerance_m:return True,0
    if np.max(np.min(distances,axis=1))>tolerance_m:return False,1
    # Reject prisms separated from the source by one of their halfplanes in
    # one vectorized pass. This is only a broad phase, never acceptance.
    e=target[:,1]-target[:,0];g=target[:,2]-target[:,0];delta=source[:,None,:]-target[None,:,0]
    ee=np.sum(e*e,axis=1);gg=np.sum(g*g,axis=1);eg=np.sum(e*g,axis=1);det=ee*gg-eg*eg
    we=np.sum(delta*e[None,:,:],axis=2);wg=np.sum(delta*g[None,:,:],axis=2)
    u=(gg*we-eg*wg)/det;w=(ee*wg-eg*we)/det;n=np.cross(e,g);n/=np.linalg.norm(n,axis=1)[:,None];d=np.sum(delta*n[None,:,:],axis=2)
    keep=~(np.all(u<0,axis=0)|np.all(w<0,axis=0)|np.all(u+w>1,axis=0)|np.all(d>tolerance_m,axis=0)|np.all(d<-tolerance_m,axis=0))
    prisms=target[keep];order=np.argsort(triangle_distances([source.mean(axis=0)],prisms)[0]) if len(prisms) else []
    remaining=[[np.array([0.,0.]),np.array([1.,0.]),np.array([0.,1.])]]
    for tri in prisms[order]:
        if deadline is not None and time.monotonic()>deadline:raise ValueError('Complete triangle coverage exceeded its time budget; preserve original tag')
        a=tri[0];e=tri[1]-a;g=tri[2]-a;n=np.cross(e,g);n/=np.linalg.norm(n)
        ee=e@e;gg=g@g;eg=e@g;det=ee*gg-eg*eg
        # Barycentric projection u,v and signed plane distance are affine in
        # source-triangle barycentrics. Each prism therefore clips by 5 lines.
        base=np.array([E,G,A-a]);we=base@e;wg=base@g
        u=(gg*we-eg*wg)/det;w=(ee*wg-eg*we)/det;d=base@n
        constraints=[-u,-w,u+w-np.array([0.,0.,1.]),d-np.array([0.,0.,tolerance_m]),-d-np.array([0.,0.,tolerance_m])]
        leftovers=[]
        for polygon in remaining:
            current=polygon
            for constraint in constraints:
                current,outside=clip(current,constraint)
                if outside:leftovers.append(outside)
                if not current:break
        remaining=leftovers
        if not remaining:return True,0
        if len(remaining)>max_pieces:return False,len(remaining)
    # Convex distance bound also covers thin remnants near projected mesh edges.
    for polygon in remaining:
        uv=np.asarray(polygon);points=A+uv[:,0,None]*E+uv[:,1,None]*G
        if np.min(np.max(triangle_distances(points,target),axis=0))>tolerance_m:return False,len(remaining)
    return True,len(remaining)


def directed_certificate(source,target,tolerance_m,normal_angle_deg=20,max_seconds=180):
    sv,sf,st=arrays(source);tv,tf,tt=arrays(target);guard=max(1e-9,tolerance_m*1e-8);bound=tolerance_m-guard
    if bound<=0:raise ValueError('Tolerance must exceed the 1 nm numerical guard')
    total=0;fallback=0;worst_vertex=0.;cosine=math.cos(math.radians(normal_angle_deg));started=time.monotonic()
    for tag in np.unique(st):
        original=sv[sf[st==tag]];target_faces=tf[tt==tag]
        if not len(target_faces):raise ValueError('Missing physical tag '+str(tag))
        triangles=tv[target_faces];normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]);normals/=np.linalg.norm(normals,axis=1)[:,None]
        def oriented_key(triangle):
            p=tuple(tuple(q) for q in triangle);return min(p,p[1:]+p[:1],p[2:]+p[:2])
        exact_faces={oriented_key(tri) for tri in triangles}
        data=polydata(tv,target_faces);locator=vtkStaticCellLocator();locator.SetDataSet(data);locator.BuildLocator();ids=vtkIdList()
        for j,triangle in enumerate(original):
            if j%128==0 and time.monotonic()-started>max_seconds:raise ValueError(f'Complete triangle certificate exceeded {max_seconds:g} seconds; preserve original tag')
            if oriented_key(triangle) in exact_faces:total+=1;continue
            lo=triangle.min(axis=0)-tolerance_m;hi=triangle.max(axis=0)+tolerance_m
            locator.FindCellsWithinBounds([lo[0],hi[0],lo[1],hi[1],lo[2],hi[2]],ids)
            candidates=np.fromiter((ids.GetId(i) for i in range(ids.GetNumberOfIds())),dtype=np.int64)
            n=np.cross(triangle[1]-triangle[0],triangle[2]-triangle[0]);n/=np.linalg.norm(n)
            candidates=candidates[normals[candidates]@n>=cosine]
            if not len(candidates):raise ValueError(f'No consistently oriented target coverage for tag {tag}, face {j}')
            target_triangles=triangles[candidates];distances=triangle_distances(triangle,target_triangles)
            worst_vertex=max(worst_vertex,float(np.max(np.min(distances,axis=1))))
            passed,pieces=cover_triangle(triangle,target_triangles,bound,deadline=started+max_seconds)
            if not passed:raise ValueError(f'Cannot certify complete triangle within {tolerance_m*1000:g} mm: tag {tag}, face {j}, {pieces} remaining pieces')
            total+=1;fallback+=pieces>0
    return {'passed':True,'triangles_certified':total,'certified_upper_bound_m':tolerance_m,'numerical_guard_m':guard,'maximum_vertex_distance_m':worst_vertex,'convex_remnant_checks':fallback,'normal_agreement_degrees_maximum':normal_angle_deg,'runtime_s':time.monotonic()-started}


def simplify(mesh,tolerance_m=.00005,target_faces=15000,normal_angle_deg=20,check_intersections=True,tag_tolerances=None,progress=None,certificate_seconds=180,maximum_edge_m=None):
    if not np.isfinite(tolerance_m) or not 1e-6<=tolerance_m<=.00005:raise ValueError('Default/critical tolerance must be 0.001–0.05 mm; use explicit exterior tag overrides')
    if not isinstance(target_faces,int) or target_faces<4:raise ValueError('Target must be at least 4 faces')
    if not np.isfinite(certificate_seconds) or certificate_seconds<=0:raise ValueError('Certificate budget must be a positive finite number of seconds')
    tag_tolerances=tag_tolerances or {}
    for tag,tolerance in tag_tolerances.items():
        maximum={11:.0002,12:.0005,13:.0005}.get(tag,.00005)
        if not np.isfinite(tolerance) or not 1e-6<=tolerance<=maximum:raise ValueError(f'Tag {tag} tolerance must not exceed {maximum*1000:g} mm')
    before=topology(mesh);proposal,patches=candidate(mesh,tolerance_m,target_faces,tag_tolerances=tag_tolerances)
    if progress:progress({'stage':'candidate','triangles':len(proposal['faces']),'patches':patches})
    v,f,tags=arrays(mesh);pv,pf,pt=arrays(proposal);vertices=[];faces=[];result_tags=[];lookup={};certificates=[]
    for patch in patches:
        tag=patch['tag'];tolerance=tag_tolerances.get(tag,tolerance_m)
        original={'vertices_m':v.tolist(),'faces':f[tags==tag].tolist(),'face_tags':[tag]*int(np.sum(tags==tag))}
        proposed={'vertices_m':pv.tolist(),'faces':pf[pt==tag].tolist(),'face_tags':[tag]*int(np.sum(pt==tag))}
        try:
            if len(np.unique(np.sort(proposed['faces'],axis=1),axis=0))!=len(proposed['faces']):raise ValueError('Proposal contains duplicate triangles')
            flat=planar_certificate(original,proposed) or piecewise_planar_certificate(original,proposed)
            if flat and flat['certified_upper_bound_m']>tolerance:flat=None
            forward=flat or directed_certificate(original,proposed,tolerance,normal_angle_deg,certificate_seconds)
            if progress:progress({'stage':'forward_certified','tag':tag,'seconds':forward['runtime_s']})
            reverse=flat or directed_certificate(proposed,original,tolerance,normal_angle_deg,certificate_seconds)
            chosen=proposed;status='certified-simplification';reason=None
        except ValueError as error:
            chosen=original;status='original-preserved';reason=str(error)
            forward=reverse={'passed':True,'certified_upper_bound_m':0.,'method':'identical original tagged surface'}
        certificates.append({'tag':tag,'status':status,'tolerance_m':tolerance,'reason':reason,'original_to_coarse':forward,'coarse_to_original':reverse})
        patch['accepted_after']=len(chosen['faces'])
        if progress:progress({'stage':'patch_certified','tag':tag,'status':status,'triangles':patch['accepted_after'],'reason':reason})
        for face in chosen['faces']:
            ids=[]
            for i in face:
                point=tuple(chosen['vertices_m'][i])
                if point not in lookup:lookup[point]=len(vertices);vertices.append(list(point))
                ids.append(lookup[point])
            faces.append(ids);result_tags.append(tag)
    result={'vertices_m':vertices,'faces':faces,'face_tags':result_tags}
    maximum_edge_m=before['maximum_edge_m'] if maximum_edge_m is None else maximum_edge_m
    if not np.isfinite(maximum_edge_m) or maximum_edge_m<before['maximum_edge_m']*(1-1e-12):raise ValueError('Maximum edge must be at least the original maximum; regenerate the original mesh for finer density')
    result,refinement=refine_max_edge(result,maximum_edge_m);after=topology(result)
    if after['triangles']>before['triangles']:
        # Long, thin decimated facets can cost more after density restoration.
        # Keep the exact input instead of calling that an improvement.
        result=mesh;after=before.copy();refinement['original_preserved_because_refinement_increased_count']=True;refinement['final_triangles']=before['triangles']
    for patch in patches:patch['final_after']=after['tag_faces'][str(patch['tag'])]
    if before['euler_characteristic']!=after['euler_characteristic'] or before['signed_volume_m3']*after['signed_volume_m3']<=0:raise ValueError('Topology or global orientation changed')
    report={'schema':'meh-bem-simplification/v1','method':'VTK DecimatePro per tag, fixed boundary edges, local/accumulated absolute squared-error proposal + independent complete triangle coverage','vtk_version':vtkVersion.GetVTKVersion(),'tolerance_m':tolerance_m,'tag_tolerances_m':tag_tolerances,'target_faces':target_faces,'target_reached':after['triangles']<=target_faces,'before':before,'after':after,'patches':patches,'tag_seams_preserved_exactly':True,'patch_certificates':certificates}
    report['original_to_coarse']={'passed':True,'method':'same-tag complete triangle coverage or identical retained original','per_tag_bounds_m':{str(q['tag']):q['original_to_coarse']['certified_upper_bound_m'] for q in certificates}}
    report['coarse_to_original']={'passed':True,'method':'same-tag complete triangle coverage or identical retained original','per_tag_bounds_m':{str(q['tag']):q['coarse_to_original']['certified_upper_bound_m'] for q in certificates}}
    report['edge_density']=refinement
    if check_intersections:
        from validate_mesh import intersection_check
        report['intersections']=intersection_check(result)
    else:report['intersections']={'passed':False,'status':'not run; tests only; not export-qualified'}
    report['qualified_geometry']=check_intersections
    report['acoustic_accuracy']='Unqualified: wavelength, mesh-density and solved-observable convergence remain necessary.'
    return result,report


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


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mesh');parser.add_argument('--out',required=True,help='Output filename stem');parser.add_argument('--tolerance-mm',type=float,default=.05);parser.add_argument('--target-faces',type=int,default=15000);parser.add_argument('--require-target',action='store_true');parser.add_argument('--tag-tolerance-mm',action='append',default=[],help='Explicit override TAG=MM; horn11 up to0.2mm, exterior12/rear13 up to0.5mm');parser.add_argument('--certificate-seconds',type=float,default=180,help='Per tag/direction budget; expiration preserves original patch');parser.add_argument('--max-edge-mm',type=float,help='Defaults to original maximum edge; never silently weakens source density');args=parser.parse_args()
    tag_tolerances={int(item.split('=')[0]):float(item.split('=')[1])*.001 for item in args.tag_tolerance_mm}
    raw=Path(args.mesh).read_bytes();mesh=json.loads(raw);result,report=simplify(mesh,args.tolerance_mm*.001,args.target_faces,tag_tolerances=tag_tolerances,progress=lambda p:print(json.dumps(p),flush=True),certificate_seconds=args.certificate_seconds,maximum_edge_m=None if args.max_edge_mm is None else args.max_edge_mm*.001)
    if args.require_target and not report['target_reached']:raise ValueError('Geometric tolerance prevents the required triangle target')
    report['source_sha256']=hashlib.sha256(raw).hexdigest();stem=Path(args.out);stem.parent.mkdir(parents=True,exist_ok=True)
    data=json.dumps(result,separators=(',',':')).encode();report['mesh_sha256']=hashlib.sha256(data).hexdigest()
    # Parse a temporary mesh before any deliverable is written.
    with tempfile.TemporaryDirectory(prefix='meh-bem-import-',dir=stem.parent) as folder:
        temporary=Path(folder)/'candidate.msh';write_msh(result,temporary);report['gmsh_import']=import_check(result,temporary)
        stem.with_suffix('.json').write_bytes(data);stem.with_suffix('.msh').write_bytes(temporary.read_bytes());stem.with_suffix('.validation.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report),flush=True)


if __name__=='__main__':main()
