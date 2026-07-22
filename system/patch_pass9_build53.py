#!/usr/bin/env python3
# BUILD 53 - Marwan's reload/settings report, fixed at the architecture:
#  1) STATE MIGRATION: localStorage now stores INTENT only {build, island, tuned levers,
#     (full S only for advanced users on the SAME build)}. Every load re-derives through
#     the bundle + autos - a program update can never leave stale advanced values behind.
#     Key v41 -> v42; old payloads discarded by design.
#  2) PROMOTION COMPLETED: shW appeared TWICE in advKeys (one removal missed it); crM/crW
#     also stay normal per his tap-size priority. Controls now actually visible.
#  3) CHAMFER FRONT RENDER: pocket openings drawn as recessed discs at the plate line
#     (not oversized slabs at the frame line), kidneys face the plate normal so the
#     front view reads like his reference plate photo.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 2) finish the promotion: strip the residual shW + crM/crW from the advanced-hide list
rep('"Lw","latW","dwall","sdW","coneW","odW","dpW","apW","vtcW","xmW","lptW","frW","shW","cdBodyD","cdBodyL","T","edgeR"]',
    '"Lw","latW","dwall","sdW","coneW","odW","dpW","apW","vtcW","xmW","lptW","frW","cdBodyD","cdBodyL","T","edgeR"]')
rep('const advKeys=["direct","fc","thV","td","kk","ratw","fxHi","fxLo","L12","cdDepth","knA","crM","crW","doffW",',
    'const advKeys=["direct","fc","thV","td","kk","ratw","fxHi","fxLo","L12","cdDepth","knA","doffW",')

# 1a) boot restore becomes DEF-only; the intent payload applies after ARCH exists
rep("try{const s=localStorage.getItem('mehstudio_v41'); if(s)S={...DEF,...JSON.parse(s)};}catch(e){}",
    "try{const s=localStorage.getItem('mehstudio_v42'); if(s)window.__restoreP=JSON.parse(s);}catch(e){}   // applied after ARCH exists (build 53: intent-only persistence)")

# 1b) the persister (intent-only; full S only for same-build advanced sessions)
rep("window.curArch='unity';",
"""window.MEH_BUILD=53;
window.persistS=function(){
  try{
    const ca=window.curArch||'unity';
    const keys=(window.ARCH_TUNE&&window.ARCH_TUNE[ca])||[];
    const tune={}; for(const k of keys) if(S[k]!==undefined) tune[k]=S[k];
    const p={__b:window.MEH_BUILD, arch:ca, adv:!!S.adv, tune};
    if(S.adv) p.full=S;                                     // manual work survives WITHIN a build
    localStorage.setItem('mehstudio_v42',JSON.stringify(p));
  }catch(e){}
};
{ const p=window.__restoreP;
  if(p && p.arch && window.ARCH && window.ARCH[p.arch]){
    if(p.__b===window.MEH_BUILD && p.adv && p.full){ S={...DEF, ...p.full}; }
    else { S={...DEF, ...window.ARCH[p.arch], ...(p.tune||{})}; S.adv=false; }   // program updated: re-derive from intent
    window.curArch=p.arch;
  }
  window.__restoreP=null;
}
window.curArch=window.curArch||'unity';""")
rep("window.curArch=window.curArch||'unity';\ndocument.getElementById('params')", "window.curArch=window.curArch||'unity';\ndocument.getElementById('params')", cnt=1)

# 1c) both save sites route through the persister
rep("  try{localStorage.setItem('mehstudio_v41',JSON.stringify(S));}catch(e){}\n  applicability(); drawAutoInfo();",
    "  if(window.persistS) window.persistS();\n  applicability(); drawAutoInfo();")
rep("  try{localStorage.setItem('mehstudio_v41',JSON.stringify(S));}catch(e){}\n  buildSidebar(); update();",
    "  if(window.persistS) window.persistS();\n  buildSidebar(); update();")

# 3a) ring() stores the facet normal for the kidneys
rep("        d.chamfer={dF:dF, plate:rPl, portR:rPo, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rPl)};",
    "        d.chamfer={dF:dF, plate:rPl, portR:rPo, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rPl), nOut:nOut.slice()};")

# 3b) kidneys face the plate (visible from the front, like his photo)
rep("      if(d.chamfer){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);\n        const e3=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];\n        const offR=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.004);      // reference pockets: kidneys run RADIALLY\n        d.ports.push({p:vadd(d.portC,vscale(e3,offR)), u:[1,0,0], v:vnorm(vcross(e3,[1,0,0])), n:vnorm(vcross([1,0,0],vnorm(vcross(e3,[1,0,0]))))});\n        continue; }",
    "      if(d.chamfer){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);\n        const e3=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];\n        const offR=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.004);      // reference pockets: kidneys run RADIALLY\n        const nP=vscale(vnorm(d.chamfer.nOut||d.normal),-1);   // kidneys open in the PLATE face (front-visible)\n        const uP=vnorm(vcross(nP,[1,0,0]));\n        d.ports.push({p:vadd(d.portC,vscale(e3,offR)), u:[1,0,0], v:uP, n:nP});\n        continue; }")

# 3c) the plate renders as the pocket OPENING at the plate line (not a slab at the frame line)
rep("""    if(d.chamfer){   // reference corner plate: the 45-deg facet panel itself
      const ell=d.chamfer.ell*sc, thk=0.012*sc;
      const plate=new THREE.Mesh(new THREE.BoxGeometry(ell*2.4, thk, ell*2.0),
        new THREE.MeshPhongMaterial({color:0xE9E4D8, shininess:5}));
      const e=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
      orientAlong(plate,[0,e[2],e[1]]);
      plate.position.set(d.portC[0]*sc, (d.chamfer.dF-0.007)*e[2]*sc, (d.chamfer.dF-0.007)*e[1]*sc);
      grp.add(plate);
    }""",
"""    if(d.chamfer){   // reference pocket opening: recessed disc at the plate line (his printed-plate photo)
      const e=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
      const nO=d.chamfer.nOut||d.normal;
      const pr=Math.min(MSP.padD/2000, d.chamfer.corner*0.52)*sc;
      const disc=new THREE.Mesh(new THREE.CircleGeometry(pr,34),
        new THREE.MeshPhongMaterial({color:0xCFC9BD, shininess:4, side:THREE.DoubleSide}));
      const nIn3=new THREE.Vector3(-nO[0],-nO[2],-nO[1]).normalize();
      disc.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), nIn3);
      disc.position.set(d.portC[0]*sc, d.chamfer.plate*e[2]*sc, d.chamfer.plate*e[1]*sc);
      grp.add(disc);
    }""")

# (all three v41 sites already handled above: restore line rewritten, save sites -> persistS)
rep("build 51 · sweep gate","build 53 · intent-only saved state (program updates re-derive) · reference chamfer quadrant · printed mounts · sweep gate")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD53: %d -> %d chars'%(n0,len(src)))
