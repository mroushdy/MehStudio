#!/usr/bin/env python3
# BUILD 68 - rounded-corner slot taps (his close-up photo: generous corner radius on
# every rect tap). Engine-first: the drawn unit shape changes AND T3 learns its exact
# area IN THE SAME PATCH - the unit rounded-rect's true area is measured from its own
# triangles at creation (window.__stadK), never hand-derived, so the law cannot drift
# from the geometry.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) slot draws the cached unit rounded-rect (r=0.55 of half-width; scaled anisotropically
#    the corners become elliptical arcs - exactly his printed-tap look)
rep("      const slot=new THREE.Mesh(shq?new THREE.PlaneGeometry(2,2):new THREE.CircleGeometry(1,26),",
"""      if(shq && !window.__stadG){ const r=0.55, sp=new THREE.Shape();
        sp.moveTo(-1+r,-1); sp.lineTo(1-r,-1); sp.quadraticCurveTo(1,-1,1,-1+r);
        sp.lineTo(1,1-r); sp.quadraticCurveTo(1,1,1-r,1); sp.lineTo(-1+r,1);
        sp.quadraticCurveTo(-1,1,-1,1-r); sp.lineTo(-1,-1+r); sp.quadraticCurveTo(-1,-1,-1+r,-1);
        const g0=new THREE.ShapeGeometry(sp,10); window.__stadG=g0;
        const P=g0.attributes.position.array, I=g0.index?g0.index.array:null; let A=0;
        const nT=I?I.length/3:P.length/9;
        for(let t=0;t<nT;t++){ const a3=I?I[t*3]:t*3, b3=I?I[t*3+1]:t*3+1, c3=I?I[t*3+2]:t*3+2;
          A+=Math.abs((P[b3*3]-P[a3*3])*(P[c3*3+1]-P[a3*3+1])-(P[c3*3]-P[a3*3])*(P[b3*3+1]-P[a3*3+1]))/2; }
        window.__stadK=A; }                                    // measured unit area - the law reads THIS
      const slot=new THREE.Mesh(shq?window.__stadG:new THREE.CircleGeometry(1,26),""")

# 2) T3 learns the measured constant (ShapeGeometry = the rounded-rect)
rep("      const g=s.geometry, isSq=g.type==='PlaneGeometry';\n      const A_drawn=(isSq? 4 : Math.PI)*Math.abs(s.scale.x*s.scale.y)/(sc*sc);   // plane is 2x2 units",
"      const g=s.geometry, isSq=g.type==='PlaneGeometry', isRR=g.type==='ShapeGeometry';\n      const A_drawn=(isSq? 4 : isRR? (window.__stadK||4) : Math.PI)*Math.abs(s.scale.x*s.scale.y)/(sc*sc);   // rounded-rect unit area is MEASURED at creation")

# 3) the acoustic slot sizing must account for the corner rounding so the DRAWN area
#    still equals Ap: scale up both axes by sqrt(4/K) at draw time (footprint grows
#    ~3% - well inside every clearance margin, and INSPECT T1/T5/T6 verify that claim)
rep("      if(isSeam){ slot.scale.set(sa*sc*2.3, sb*sc*0.435, 1); } else { slot.scale.set(sa*sc,sb*sc,1); }",
"      const kA=shq? Math.sqrt(4/(window.__stadK||4)) : 1;      // rounding costs area; regain it isotropically\n      if(isSeam){ slot.scale.set(sa*sc*2.3*kA, sb*sc*0.435*kA, 1); } else { slot.scale.set(sa*sc*kA,sb*sc*kA,1); }")

rep("window.MEH_BUILD=67;","window.MEH_BUILD=68;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD68 rounded slots: %d -> %d chars'%(n0,len(src)))
