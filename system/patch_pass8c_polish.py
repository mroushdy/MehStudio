#!/usr/bin/env python3
# BUILD 52c - square-slot orientation + settings promotion (Marwan's two calls):
#  1) SQUARE slots had uncontrolled in-plane rotation (random diamonds on the cone).
#     Every non-seam slot now gets a deterministic basis: one edge along the port's
#     u direction (ring-tangential / facet-tangential), like the seam slits already do.
#  2) PROMOTED TO NORMAL SETTINGS: where drivers mount (plM/plW), taps per driver
#     (npM/npW), tap shape (shM/shW) - via per-island tune lists; livetest's simple-mode
#     input bound rises 12 -> 16 (deliberate: these are design choices, not arcana).
import io
FILES={}
def load(f): FILES[f]=io.open(f,encoding='utf-8').read()
def save():
    for f,s in FILES.items(): io.open(f,'w',encoding='utf-8').write(s)
def rep(f,a,b,cnt=1):
    s=FILES[f]; n=s.count(a)
    assert n==cnt, '%s anchor FAILED (%d found, want %d): %r'%(f,n,cnt,a[:70])
    FILES[f]=s.replace(a,b)
load('meh_studio_v4.html'); load('meh_livetest3.js')
H='meh_studio_v4.html'

# 1) deterministic slot basis for ALL non-round slots (edge rides the port's u direction)
rep(H, """      if(isSeam){  // long axis along the seam (meridian) direction
        const vs=new THREE.Vector3(d.v[0], d.v[2], d.v[1]);
        const sZ=nIn.clone().normalize();
        const sX=vs.clone().sub(sZ.clone().multiplyScalar(vs.dot(sZ))).normalize();
        const sY=new THREE.Vector3().crossVectors(sZ,sX);
        slot.setRotationFromMatrix(new THREE.Matrix4().makeBasis(sX,sY,sZ));
      } else {
        slot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), nIn);
      }""",
"""      if(isSeam){  // long axis along the seam (meridian) direction
        const vs=new THREE.Vector3(d.v[0], d.v[2], d.v[1]);
        const sZ=nIn.clone().normalize();
        const sX=vs.clone().sub(sZ.clone().multiplyScalar(vs.dot(sZ))).normalize();
        const sY=new THREE.Vector3().crossVectors(sZ,sX);
        slot.setRotationFromMatrix(new THREE.Matrix4().makeBasis(sX,sY,sZ));
      } else {
        const us=new THREE.Vector3((pr.u||d.u)[0], (pr.u||d.u)[2], (pr.u||d.u)[1]);   // deterministic in-plane basis:
        const sZ=nIn.clone().normalize();                                              // slot edge rides the port's u
        let sX=us.clone().sub(sZ.clone().multiplyScalar(us.dot(sZ)));
        if(sX.lengthSq()<1e-8) sX.set(1,0,0).sub(sZ.clone().multiplyScalar(sZ.x));
        sX.normalize();
        const sY=new THREE.Vector3().crossVectors(sZ,sX);
        slot.setRotationFromMatrix(new THREE.Matrix4().makeBasis(sX,sY,sZ));
      }""")

# 2) promotion: placement / count / shape are normal, per-island
rep(H, "unity:['mouthW','thW','cdSel','midSel','wfSel','nM','npM','crM','crW','shM','shW'],",
       "unity:['mouthW','thW','cdSel','midSel','wfSel','nM','plM','npM','npW','crM','crW','shM','shW'],")
rep(H, "coax2:['mouthW','thW','cdSel','wfSel','crW','shW'],",
       "coax2:['mouthW','thW','cdSel','wfSel','plW','npW','crW','shW'],")
rep(H, "quadrant:['mouthW','wfSel','cdSel','crW','shW'],",
       "quadrant:['mouthW','wfSel','cdSel','plW','npW','crW','shW'],")
rep(H, "knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA','npM','crM','crW'],",
       "knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA','plM','npM','crM','crW'],")
rep(H, "wide:['mouthW','thW','midSel','nM','npM','wfSel','cdSel','crM','crW','shM','shW'],",
       "wide:['mouthW','thW','midSel','nM','plM','npM','wfSel','plW','npW','cdSel','crM','crW','shM','shW'],")
rep(H, "roundprint:['mouthD','cdSel','midSel','nM','npM','wfSel','nW','crM','crW'],",
       "roundprint:['mouthD','cdSel','midSel','nM','plM','npM','wfSel','nW','npW','crM','crW','shM','shW'],")
rep(H, "pa3way:['mouthW','thW','cdSel','midSel','wfSel','npM','crM','crW','shM','shW']",
       "pa3way:['mouthW','thW','cdSel','midSel','wfSel','plM','npM','plW','npW','crM','crW','shM','shW']")
# pull the promoted keys out of the advanced-only set so the tune lists govern them
rep(H, 'const advKeys=["direct","fc","thV","td","kk","ratw","fxHi","fxLo","L12","cdDepth","plM","knA","crM","crW","doffW","plW","npM","npW","shM","shW",',
       'const advKeys=["direct","fc","thV","td","kk","ratw","fxHi","fxLo","L12","cdDepth","knA","crM","crW","doffW",')

# 3) livetest simple-mode bound rises deliberately
rep('meh_livetest3.js', "ck('simple mode: ≤12 visible inputs (got ' + simple.visibleParams + ')', simple.visibleParams <= 12);",
                        "ck('simple mode: ≤16 visible inputs (got ' + simple.visibleParams + ')', simple.visibleParams <= 16);")

save(); print('BUILD52c: slot basis + promotion + livetest bound')
