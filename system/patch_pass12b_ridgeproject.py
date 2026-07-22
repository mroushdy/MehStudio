#!/usr/bin/env python3
# BUILD 56b - two probe findings from the first seam-tap run (probe_q56):
#  1) Extrapolating the seam tangent across the flare KNEE drifted offset kidneys 16-36mm
#     off the ridge (the ridge is only piecewise straight). Fix: place every kidney by
#     EXACT projection - walk the station by arc length, then surfPt/surfNormal at that
#     station. On the ridge at every station by construction, knees included.
#  2) When chamfer failed, the woofer ladder stomped plW to 'edge' and grew to the 64" cap
#     (island identity destroyed silently). chamfer joins the island-defining guard like
#     plM's (fail must surface as INFEASIBLE, not as a silent placement swap).
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("""      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);
        const offS=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.006);      // kidneys stack ALONG the corner seam (his plate + slit photos)
        d.ports.push({p:vadd(d.portC,vscale(d.u,offS)), u:d.u.slice(), v:d.v.slice(), n:(d.chamfer.nOut||d.normal).slice()});
        continue; }""",
"""      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);
        const offS=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.006);      // kidneys stack ALONG the corner seam (his plate + slit photos)
        const phi3=d.chamfer.phi;
        const e4=Math.max(1e-4,st.depth*1e-3), aD=dimsAt(st,Math.max(0,d.portC[0]-e4)), bD=dimsAt(st,Math.min(st.depth,d.portC[0]+e4));
        const ds4=Math.hypot(2*e4,(bD.w-aD.w)/2,(bD.h-aD.h)/2)||1e-9, fx4=2*e4/ds4;
        const xq=Math.max(0.002, Math.min(st.depth*0.98, d.portC[0]+offS*fx4));   // arc-length step -> station
        const pq=surfPt(st,xq,phi3);                            // EXACT projection: on the ridge at every station (knees included)
        const ee2=1e-3, nq=vnorm(vadd(surfNormal(st,xq,phi3-ee2),surfNormal(st,xq,phi3+ee2)));
        const pqA=surfPt(st,Math.max(0,xq-0.004),phi3), pqB=surfPt(st,Math.min(st.depth,xq+0.004),phi3);
        const uq=vnorm(vsub(pqB,pqA)), vq=vnorm(vcross(nq,uq));
        d.ports.push({p:pq, u:uq, v:vq, n:nq});
        continue; }""")

rep("    if(!done && S.plW!=='edge' && S.plW!=='diagonal' && S.plW!=='cross' && S.shape!=='cone' && S.shape!=='os'){   // Waslo port/driver decoupling: port stays, body moves outboard",
    "    if(!done && S.plW!=='edge' && S.plW!=='diagonal' && S.plW!=='cross' && S.plW!=='chamfer' && S.shape!=='cone' && S.shape!=='os'){   // Waslo port/driver decoupling: port stays, body moves outboard (chamfer is island-defining - fail loudly, never swap it away)")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD56b ridge projection: %d -> %d chars'%(n0,len(src)))
