"""Independent numerical checks of tagged triangular boundaries.

The BVH broad phase checks disjoint and adjacent triangle pairs. Adjacent
triangles may meet only on their shared edge or vertex; geometric folds and
intersections beyond that shared simplex are rejected. No random sampling.
"""
import numpy as np


def segment_triangle(p,q,a,b,c,tol=1e-10):
    d=q-p;e1=b-a;e2=c-a;h=np.cross(d,e2);det=np.einsum('ij,ij->i',e1,h)
    scale=np.linalg.norm(d,axis=1)*np.linalg.norm(e1,axis=1)*np.linalg.norm(e2,axis=1)
    valid=np.abs(det)>64*np.finfo(float).eps*scale;inv=np.zeros_like(det);inv[valid]=1/det[valid]
    s=p-a;u=inv*np.einsum('ij,ij->i',s,h);v=inv*np.einsum('ij,ij->i',d,np.cross(s,e1));t=inv*np.einsum('ij,ij->i',e2,np.cross(s,e1))
    return valid & (u>=-tol)&(v>=-tol)&(u+v<=1+tol)&(t>=-tol)&(t<=1+tol)


def coplanar_intersect(x,y):
    n=np.cross(x[1]-x[0],x[2]-x[0]);n=n/np.linalg.norm(n)
    if np.max(np.abs((y-x[0])@n))>1e-10:return False
    k=np.argmax(np.abs(n));a=np.delete(x,k,axis=1);b=np.delete(y,k,axis=1)
    cross=lambda u,v:u[0]*v[1]-u[1]*v[0]
    def inside(p,t):
        d=[cross(t[(i+1)%3]-t[i],p-t[i]) for i in range(3)]
        return min(d)>=-1e-14 or max(d)<=1e-14
    if any(inside(p,b) for p in a) or any(inside(p,a) for p in b):return True
    for i in range(3):
        for j in range(3):
            p=a[i];r=a[(i+1)%3]-p;q=b[j];s=b[(j+1)%3]-q;den=cross(r,s)
            if abs(den)>1e-15:
                t=cross(q-p,s)/den;u=cross(q-p,r)/den
                if -1e-10<=t<=1+1e-10 and -1e-10<=u<=1+1e-10:return True
    return False


def adjacent_intersections(tri, faces, pairs, tol=1e-10):
    """Return adjacent pairs meeting beyond their common topological simplex.

    An edge-sharing noncoplanar pair can intersect only on that edge. Coplanar
    edge neighbors must lie on opposite sides. Vertex neighbors are tested by
    intersection intervals on the two-plane line, or coplanar edge/containment
    tests. Metric tolerances are in metres, not arbitrary triangle area units.
    """
    if not len(pairs):
        return []
    pairs=np.asarray(pairs,dtype=np.int64)
    a=tri[pairs[:,0]];b=tri[pairs[:,1]]
    common=faces[pairs[:,0],:,None]==faces[pairs[:,1],None,:]
    sa=common.any(axis=2);sb=common.any(axis=1);count=sa.sum(axis=1)
    if (count==0).any():
        raise ValueError('Adjacent check received a disjoint pair')
    na=np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0]);nb=np.cross(b[:,1]-b[:,0],b[:,2]-b[:,0])
    la=np.linalg.norm(na,axis=1);lb=np.linalg.norm(nb,axis=1)
    if (la<=0).any() or (lb<=0).any():
        raise ValueError('Degenerate triangle in adjacent test')
    na=na/la[:,None];nb=nb/lb[:,None]
    row=np.arange(len(pairs));origin=a[row,np.argmax(sa,axis=1)]
    line=np.cross(na,nb);line_norm=np.linalg.norm(line,axis=1)
    plane_distance=np.max(np.abs(np.einsum('ijk,ik->ij',b-origin[:,None,:],na)),axis=1)
    coplanar=(line_norm<=1e-9)&(plane_distance<=tol)
    hit=count==3  # Duplicate triangles, irrespective of winding.
    edge=np.flatnonzero((count==2)&coplanar)
    if len(edge):
        ai=np.argmax(~sa[edge],axis=1);bi=np.argmax(~sb[edge],axis=1)
        e0=np.argmax(sa[edge],axis=1);e1=3-ai-e0;idx=np.arange(len(edge))
        aa=a[edge];bb=b[edge];base=aa[idx,e0];direction=aa[idx,e1]-base
        direction/=np.linalg.norm(direction,axis=1)[:,None]
        side_a=np.einsum('ij,ij->i',np.cross(direction,aa[idx,ai]-base),na[edge])
        side_b=np.einsum('ij,ij->i',np.cross(direction,bb[idx,bi]-base),na[edge])
        hit[edge]=((side_a>tol)&(side_b>tol))|((side_a<-tol)&(side_b<-tol))
    vertex=np.flatnonzero((count==1)&~coplanar&(line_norm>1e-12))
    if len(vertex):
        direction=line[vertex]/line_norm[vertex,None];o=origin[vertex]
        # Plane distance is not distance to the intersection line. For nearly
        # parallel planes, using the metre tolerance directly can project a
        # vertex micrometres sideways onto that line and invent an overlap.
        # Divide by sin(dihedral), equivalently scale this plane tolerance.
        line_plane_tolerance=tol*line_norm[vertex]
        def interval(vertices,other_normal):
            q=vertices-o[:,None,:]
            d=np.einsum('ijk,ik->ij',q,other_normal)
            t=np.einsum('ijk,ik->ij',q,direction)
            candidates=[np.where(np.abs(d)<=line_plane_tolerance[:,None],t,0.)]
            for k in range(3):
                j=(k+1)%3;crosses=((d[:,k]>line_plane_tolerance)&(d[:,j]<-line_plane_tolerance))|((d[:,k]<-line_plane_tolerance)&(d[:,j]>line_plane_tolerance))
                frac=np.divide(d[:,k],d[:,k]-d[:,j],out=np.zeros(len(d)),where=crosses)
                candidates.append(np.where(crosses,t[:,k]+frac*(t[:,j]-t[:,k]),0.)[:,None])
            values=np.concatenate(candidates,axis=1)
            return values.min(axis=1),values.max(axis=1)
        alo,ahi=interval(a[vertex],nb[vertex]);blo,bhi=interval(b[vertex],na[vertex])
        hit[vertex]=np.minimum(ahi,bhi)-np.maximum(alo,blo)>tol
    planar=np.flatnonzero((count==1)&coplanar)
    if len(planar):
        aa=a[planar];bb=b[planar];normal=na[planar];o=origin[planar]
        found=np.zeros(len(planar),dtype=bool)
        def contains_nonshared(points,target):
            edges=np.roll(target,-1,axis=1)-target
            edge_lengths=np.linalg.norm(edges,axis=2)
            found=np.zeros(len(points),dtype=bool)
            for k in range(3):
                side=np.einsum('ijk,ik->ij',np.cross(edges,points[:,k,None,:]-target),normal)/edge_lengths
                inside=np.all(side>=-tol,axis=1)|np.all(side<=tol,axis=1)
                found|=inside&(np.linalg.norm(points[:,k]-o,axis=1)>tol)
            return found
        found|=contains_nonshared(aa,bb)|contains_nonshared(bb,aa)
        for i in range(3):
            p=aa[:,i];r=aa[:,(i+1)%3]-p
            for j in range(3):
                q=bb[:,j];s=bb[:,(j+1)%3]-q;delta=q-p
                den=np.einsum('ij,ij->i',np.cross(r,s),normal)
                # A fixed determinant cutoff makes collinear mesh edges at
                # ordinary float roundoff look like crossing lines. Scale the
                # numerical threshold with both edge lengths before dividing.
                rlen=np.linalg.norm(r,axis=1);slen=np.linalg.norm(s,axis=1)
                nonparallel=np.abs(den)>64*np.finfo(float).eps*rlen*slen
                # Segments already sharing the topological vertex cannot
                # cross elsewhere unless collinear. Containment above catches
                # collinear overlap. Avoid dividing nearly collinear opposite
                # rays, whose numerator/determinant roundoff invents a second
                # intersection near their one exact common endpoint.
                both_incident=(sa[planar,i]|sa[planar,(i+1)%3])&(sb[planar,j]|sb[planar,(j+1)%3])
                nonparallel&=~both_incident
                t=np.divide(np.einsum('ij,ij->i',np.cross(delta,s),normal),den,out=np.zeros(len(den)),where=nonparallel)
                u=np.divide(np.einsum('ij,ij->i',np.cross(delta,r),normal),den,out=np.zeros(len(den)),where=nonparallel)
                te=tol/rlen;ue=tol/slen
                meets=nonparallel&(t>=-te)&(t<=1+te)&(u>=-ue)&(u<=1+ue)
                found|=meets&(np.linalg.norm(p+t[:,None]*r-o,axis=1)>tol)
        hit[planar]=found
    return pairs[hit].tolist()


def intersection_check(mesh):
    v=np.array(mesh['vertices_m']);f=np.array(mesh['faces']);tri=v[f];lo=tri.min(axis=1);hi=tri.max(axis=1);cent=(lo+hi)/2
    class Node:
        def __init__(self,ids):
            self.lo=lo[ids].min(axis=0);self.hi=hi[ids].max(axis=0);self.ids=ids;self.children=None
            if len(ids)>12:
                axis=np.argmax(self.hi-self.lo);ids=ids[np.argsort(cent[ids,axis])];mid=len(ids)//2
                self.children=(Node(ids[:mid]),Node(ids[mid:]))
    root=Node(np.arange(len(f)));pairs=[];adjacent=[]
    def overlap(a,b):return np.all(a.hi>=b.lo-1e-12) and np.all(b.hi>=a.lo-1e-12)
    def walk(a,b,same=False):
        if not overlap(a,b):return
        if same and a.children:
            x,y=a.children;walk(x,x,True);walk(x,y);walk(y,y,True);return
        if a.children and (not b.children or len(a.ids)>len(b.ids)):
            for c in a.children:walk(c,b)
            return
        if b.children:
            for c in b.children:walk(a,c)
            return
        aa,bb=np.meshgrid(a.ids,b.ids,indexing='ij');aa=aa.ravel();bb=bb.ravel()
        ok=(aa<bb if same else aa!=bb)&np.all(hi[aa]>=lo[bb]-1e-12,axis=1)&np.all(hi[bb]>=lo[aa]-1e-12,axis=1)
        aa=aa[ok];bb=bb[ok]
        if len(aa):
            disjoint=~np.any(f[aa,:,None]==f[bb,None,:],axis=(1,2))
            pairs.extend(zip(aa[disjoint].tolist(),bb[disjoint].tolist()))
            adjacent.extend(zip(aa[~disjoint].tolist(),bb[~disjoint].tolist()))
    walk(root,root,True)
    hits=[]
    for start in range(0,len(pairs),50000):
        block=np.array(pairs[start:start+50000]);a=tri[block[:,0]];b=tri[block[:,1]];hit=np.zeros(len(block),bool)
        for k in range(3):
            hit|=segment_triangle(a[:,k],a[:,(k+1)%3],b[:,0],b[:,1],b[:,2])
            hit|=segment_triangle(b[:,k],b[:,(k+1)%3],a[:,0],a[:,1],a[:,2])
        na=np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0]);nb=np.cross(b[:,1]-b[:,0],b[:,2]-b[:,0])
        parallel=np.linalg.norm(np.cross(na,nb),axis=1)<=1e-9*np.linalg.norm(na,axis=1)*np.linalg.norm(nb,axis=1)
        for k in np.flatnonzero(parallel&~hit):hit[k]=coplanar_intersect(a[k],b[k])
        hits.extend(block[hit].tolist())
    adjacent_hits=[]
    for start in range(0,len(adjacent),50000):
        adjacent_hits.extend(adjacent_intersections(tri,f,adjacent[start:start+50000]))
    result={'method':'exhaustive BVH AABB; nonlocal segment/triangle and coplanar overlap; adjacent shared-simplex exclusion',
        'candidate_pairs':len(pairs),'intersecting_nonlocal_pairs':len(hits),'examples':hits[:12],
        'adjacent_candidate_pairs':len(adjacent),'intersecting_adjacent_pairs':len(adjacent_hits),'adjacent_examples':adjacent_hits[:12],
        'adjacent_one_ring_pairs':'geometrically tested; only intersection on the common edge or vertex is permitted',
        'adjacent_metric_tolerance_m':1e-10,'passed':not hits and not adjacent_hits}
    if hits or adjacent_hits:raise ValueError('Surface self-intersections: '+str(result))
    return result
