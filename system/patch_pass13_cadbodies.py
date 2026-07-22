#!/usr/bin/env python3
# BUILD 58 - TRUE MANUFACTURER CAD BODIES (Marwan's upload: 7 STEP models).
# The queued-since-build-49 item lands. Dimensional matches, verified from the STEP bboxes:
#   B&C 10HPL64  D261 x 122 mm  ->  w10 preset (od 260, dp 120)  - pa3way's canon woofer
#   B&C 12NDL76  D315 x 141 mm  ->  w12 preset (od 315, dp 140)  - the 12" class
#   B&C DE900TN  D131 x 65 mm   ->  NEW de900 CD preset (DE980TN sibling; body dims from CAD)
# Meshes: decimated ~5.2k tris, TRUE bbox restored (per-axis rescale <=2%), uint16-quantized,
# base64-embedded (~220 KB). RENDER-ONLY: the collision model keeps its verified prims.
# DE500 / DE610 / ES 12LW1400 converted + shipped in system/cad/ awaiting datasheet T/S.
import io, json, base64
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

M=json.load(open('/tmp/spk/meshes.json'))
KEEP=['BC_10HPL64','BC_12NDL76','BC_DE900TN']
tab={k:M[k] for k in KEEP}
cadm='window.CADM='+json.dumps(tab,separators=(',',':'))+';\n'

# 1) presets: attach meshes / add de900
rep("  w10:{name:'10\" woofer', od:26.0, dp:12,   sd:330, cone:21,   vtc:130, xm:8},",
    "  w10:{name:'10\" woofer \\u2014 B&C 10HPL64 CAD body', od:26.0, dp:12,   sd:330, cone:21,   vtc:130, xm:8, mesh:'BC_10HPL64'},")
rep("  w12:{name:'12\" woofer', od:31.5, dp:14,   sd:480, cone:25,   vtc:190, xm:9},",
    "  w12:{name:'12\" woofer \\u2014 B&C 12NDL76 CAD body', od:31.5, dp:14,   sd:480, cone:25,   vtc:190, xm:9, mesh:'BC_12NDL76'},")
rep("  dcm420:{name:'B&C DCM420 coax mid body (2\" · 4×M6 Ø102)', throat:2.0, depth:2.4, bodyD:15.2, bodyL:9.5, recXO:600},",
    "  dcm420:{name:'B&C DCM420 coax mid body (2\" · 4×M6 Ø102)', throat:2.0, depth:2.4, bodyD:15.2, bodyL:9.5, recXO:600},\n"
    "  de900:{name:'B&C DE900TN 1.4\" (true CAD body)', throat:1.4, depth:1.7, bodyD:13.1, bodyL:6.5, recXO:650, mesh:'BC_DE900TN'},")

# 2) curate de900 beside de980
rep("  knuckle:   {mid:['bc5nsm','bc5ndl'], woof:['bc8pe','bc8nw'], cd:['de980','cd14']},",
    "  knuckle:   {mid:['bc5nsm','bc5ndl'], woof:['bc8pe','bc8nw'], cd:['de980','de900','cd14']},")
rep("  wide:      {mid:['m2','m3','bc5ndl','bc5nsm'], woof:['w8','bc8pe','bc8nw','w10'], cd:['cd075','cd1','cd14','de980']},",
    "  wide:      {mid:['m2','m3','bc5ndl','bc5nsm'], woof:['w8','bc8pe','bc8nw','w10'], cd:['cd075','cd1','cd14','de980','de900']},")
rep("  roundprint:{mid:['m2','m3'], woof:['w65','w8'], cd:['cd075','cd1','cd14','de980']},",
    "  roundprint:{mid:['m2','m3'], woof:['w65','w8'], cd:['cd075','cd1','cd14','de980','de900']},")

# 3) CADM table + decoder before mesh3d
rep("function mesh3d(ev){",
cadm+"""window.__cadCache={};
function cadMesh(key,col){                       // decode-once cache of the embedded CAD bodies
  let g=window.__cadCache[key];
  if(!g){ const Mm=CADM[key];
    const pb=Uint8Array.from(atob(Mm.p),c=>c.charCodeAt(0));
    const q=new Uint16Array(pb.buffer,0,Mm.nv*3);
    const ib=Uint8Array.from(atob(Mm.i),c=>c.charCodeAt(0));
    const idx=new Uint16Array(ib.buffer,0,Mm.nf*3);
    const pos=new Float32Array(Mm.nv*3);
    for(let k=0;k<3;k++){const lo=Mm.bb0[k], sp=Mm.bb1[k]-Mm.bb0[k];
      for(let j=0;j<Mm.nv;j++) pos[j*3+k]=lo+q[j*3+k]/65535*sp;}
    g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setIndex(new THREE.BufferAttribute(idx,1));
    g.rotateX(-Math.PI/2);                        // CAD +z (body, behind flange) -> local +y
    g.computeVertexNormals();
    window.__cadCache[key]=g; }
  return new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:col,specular:0x151515,shininess:12,side:THREE.DoubleSide}));
}
function mesh3d(ev){""")

# 4) driver body: CAD mesh path (render-only; collision prims untouched)
rep("    if(kd.p3 && kd.p3.length){          // body traced from the B&C mechanical drawing",
"""    const PRE=(d.kind==='mid'? MIDS[S.midSel] : WOOFS[S.wfSel])||{};
    if(PRE.mesh && window.CADM && CADM[PRE.mesh]){   // TRUE manufacturer body (his STEP upload)
      const cm=cadMesh(PRE.mesh,col); cm.scale.setScalar(sc/1000); sub.add(cm);
    } else if(kd.p3 && kd.p3.length){          // body traced from the B&C mechanical drawing""")

# 5) CD body: CAD mesh path
rep("""    const body=cyl(R,R*0.92,L,0x9a9a98);
    orientAlong(body,[1,0,0]); body.position.set(-L/2-0.01*sc/MEH.CM*MEH.CM,0,0);
    body.position.x=-(L/2+0.004); grp.add(body);""",
"""    const CDP=CDS[S.cdSel]||{};
    if(CDP.mesh && window.CADM && CADM[CDP.mesh]){   // TRUE CD body (his STEP upload)
      const cm=cadMesh(CDP.mesh,0x9a9a98); cm.scale.setScalar(sc/1000);
      orientAlong(cm,[-1,0,0]); cm.position.x=-0.004; grp.add(cm);
    } else {
    const body=cyl(R,R*0.92,L,0x9a9a98);
    orientAlong(body,[1,0,0]); body.position.set(-L/2-0.01*sc/MEH.CM*MEH.CM,0,0);
    body.position.x=-(L/2+0.004); grp.add(body); }""")

# 6) build bump
rep("window.MEH_BUILD=57;","window.MEH_BUILD=58;")
rep("build 57 · conformal pocket cups (sector-safe; orbit-reviewed)",
    "build 58 · TRUE B&C CAD bodies embedded (10HPL64 · 12NDL76 · DE900TN, from his STEP set) · conformal pocket cups (sector-safe; orbit-reviewed)")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD58 CAD bodies: %d -> %d chars'%(n0,len(src)))
