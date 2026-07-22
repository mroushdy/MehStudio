#!/usr/bin/env python3
# BUILD 60 - THE INSPECT ENGINE (Marwan: "build a tool that allows you to inspect the taps,
# the face geometry, the driver collisions... a 3D coding assistant... fix this development
# process once and for all").
# window.INSPECT lives INSIDE the tool: a contract-based geometric auditor that
#   - checks invariants at TAP SCALE (where every regression has lived):
#       T1 tap-on-boundary (facet-aware) - T2 port-port world clearance (drawn radii)
#       T3 drawn-slot truth (area==Ap, aspect==shape; catches slivers + size drift)
#       D1 driver rim pairs vs flags - D2 floating parts (seat contact unless declared)
#       M1 CAD mesh bbox vs preset dims - C1 drawn-vs-model counts
#   - returns violations WITH a camera pose framed on the offending pair, and
#   - flies the camera there (V3D.tgt orbit target added) + flashes the meshes.
# Headless CLI (meh_inspect.js) drives the same engine after every patch; the INSPECT
# button gives Marwan the same eyes live. The core takes only {entities, taps, solids}
# style contracts + THREE - liftable into any project.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) orbit target: render3d orbits V3D.tgt (default origin) - fly-to needs it
rep("""function render3d(){
  if(!V3D.ready)return;
  const cp=Math.cos(V3D.pitch), r=V3D.dist;
  V3D.camera.position.set(r*cp*Math.cos(V3D.yaw), r*Math.sin(V3D.pitch), r*cp*Math.sin(V3D.yaw));
  V3D.camera.lookAt(0,0,0);
  V3D.renderer.render(V3D.scene,V3D.camera);
}""",
"""function render3d(){
  if(!V3D.ready)return;
  const t=V3D.tgt||{x:0,y:0,z:0};
  const cp=Math.cos(V3D.pitch), r=V3D.dist;
  V3D.camera.position.set(t.x+r*cp*Math.cos(V3D.yaw), t.y+r*Math.sin(V3D.pitch), t.z+r*cp*Math.sin(V3D.yaw));
  V3D.camera.lookAt(t.x,t.y,t.z);
  V3D.renderer.render(V3D.scene,V3D.camera);
}
/* ================= INSPECT - the in-tool geometric auditor (build 60) =================
   Contract: audit() reads the CURRENT state (S -> MEH.evaluate) and the CURRENT drawn
   scene (V3D.group, tagged meshes) and returns violations:
   {code, sev:'fail'|'warn', msg, at:[x,y,z] model-m, span_m, ids}. frame(v) flies there. */
window.INSPECT={
  audit(){
    const V=[], ev=MEH.evaluate(S), st=ev.st, sc=window.__sc||1;
    const L=ev.layout;
    const push=(code,sev,msg,at,span,ids)=>V.push({code,sev,msg,at,span:span||0.08,ids:ids||[]});
    // ---- T1: every tap ON the horn boundary (chamfer taps: on their board) ----
    for(const d of L){ for(const pr of (d.ports||[])){
      let off, how;
      if(d.chamfer&&d.chamfer.c0!==undefined){ const nO=d.chamfer.nOut;
        off=Math.abs(pr.p[0]*nO[0]+pr.p[1]*nO[1]+pr.p[2]*nO[2]-d.chamfer.c0); how='board'; }
      else if(d.knPod){ const f=d.knPod.face,n=d.knPod.n;
        off=Math.abs((pr.p[0]-f[0])*n[0]+(pr.p[1]-f[1])*n[1]+(pr.p[2]-f[2])*n[2]); how='pod face'; }
      else { off=Math.abs(MEH.cavityMargin(st,pr.p)); how='surface'; }
      if(off>0.006) push('T1','fail',d.kind+' tap '+(off*1000).toFixed(1)+'mm off its '+how,pr.p,0.10);
      else if(off>0.004) push('T1','warn',d.kind+' tap '+(off*1000).toFixed(1)+'mm off its '+how,pr.p,0.10);
    }}
    // ---- T2: port-port clearance across ALL drivers (model positions, drawn radii) ----
    const taps=[];
    for(const d of L){ const np=Math.max(1,((d.kind==='mid'?S.npM:S.npW)|0)||1);
      const Ap=(d.kind==='mid'?S.apM:S.apW)*1e-4/np, sh=(d.kind==='mid'?S.shM:S.shW)||'round';
      const sa=sh==='round'?Math.sqrt(Ap/Math.PI):Math.sqrt(Ap/Math.PI*2.2), sb=sh==='round'?sa:sa/2.2;
      const isSeam=((d.kind==='mid'?S.plM:S.plW)==='diagonal');
      for(const pr of (d.ports||[])) taps.push({d,p:pr.p,rMax:isSeam?sa*2.3:Math.max(sa,sb),rMin:isSeam?sb*0.435:Math.min(sa,sb)});
    }
    for(let i=0;i<taps.length;i++)for(let j=i+1;j<taps.length;j++){
      const a=taps[i],b=taps[j];
      const dd=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1],a.p[2]-b.p[2]);
      const need=(a.rMin+b.rMin)*1.0+0.004;                      // conservative floor: minor radii + 4mm
      if(dd<need) push('T2', a.d===b.d?'warn':'fail', 'taps '+(dd*1000).toFixed(0)+'mm apart ('+(need*1000).toFixed(0)+' needed)',
        [(a.p[0]+b.p[0])/2,(a.p[1]+b.p[1])/2,(a.p[2]+b.p[2])/2], Math.max(0.10,dd*2.4));
    }
    // ---- T3: drawn slots tell the truth (area + aspect) ----
    const slots=[]; V3D.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.tag==='port') slots.push(o); });
    for(const s of slots){
      const kind=s.userData.kind||'mid';
      const np=Math.max(1,((kind==='mid'?S.npM:S.npW)|0)||1);
      const Ap=(kind==='mid'?S.apM:S.apW)*1e-4/np;
      const g=s.geometry, isSq=g.type==='PlaneGeometry';
      const A_drawn=(isSq? (1.772*1.772) : Math.PI)*Math.abs(s.scale.x*s.scale.y)/(sc*sc);
      const pl=(kind==='mid'?S.plM:S.plW);
      const expect=(pl==='diagonal')? Ap*1.0007 : Ap;             // slit basis is area-true too
      const gp=new THREE.Vector3(); s.getWorldPosition(gp);
      const off=new THREE.Vector3(); V3D.group.getWorldPosition(off); gp.sub(off).multiplyScalar(1/sc);
      const at=[gp.x,gp.z,gp.y];
      if(Math.abs(A_drawn-expect)/expect>0.12)
        push('T3','fail',kind+' slot drawn '+(A_drawn*1e4).toFixed(1)+'cm2 vs Ap '+(expect*1e4).toFixed(1),at,0.12);
      const asp=Math.abs(s.scale.x/(s.scale.y||1e-9));
      const aspLim=(pl==='diagonal')?7:2.6;
      if(asp>aspLim||asp<1/aspLim)
        push('T3','fail',kind+' slot degenerate aspect '+asp.toFixed(1)+':1 (sliver)',at,0.12);
    }
    // ---- D1: driver rim pairs (model metric) ----
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
      const m=MEH.minRimDist(L[i],L[j]);
      if(m<-0.003) push('D1','fail','frames overlap '+(m*1000).toFixed(1)+'mm ('+L[i].kind+'-'+L[j].kind+')',
        [(L[i].center[0]+L[j].center[0])/2,(L[i].center[1]+L[j].center[1])/2,(L[i].center[2]+L[j].center[2])/2],0.35);
      else if(m<0) push('D1','warn','frames snug '+(m*1000).toFixed(1)+'mm ('+L[i].kind+'-'+L[j].kind+')',
        [(L[i].center[0]+L[j].center[0])/2,(L[i].center[1]+L[j].center[1])/2,(L[i].center[2]+L[j].center[2])/2],0.35);
    }
    // ---- D2: no floating parts - every driver seats (unless declared remote/pocketed) ----
    for(const d of L){
      if(d.remote||d.chamfer||d.knPod) continue;                  // declared standoffs carry pods/blocks
      const gap=MEH.conformity? Math.abs(MEH.cavityMargin(st,d.portC)) : 0;
      const seat=Math.abs(MEH.cavityMargin(st,d.center))-(d.stand||0.012);
      if(seat>0.05) push('D2','fail',d.kind+' floats '+(seat*1000).toFixed(0)+'mm off its seat',d.center,0.3);
    }
    // ---- M1: embedded CAD bodies match their presets ----
    if(window.CADM){ const chk=(pre,kindTxt)=>{ if(!pre||!pre.mesh||!CADM[pre.mesh])return;
        const M=CADM[pre.mesh], D=(M.bb1[0]-M.bb0[0])/10, DEP=(M.bb1[2]-M.bb0[2])/10;
        const od=pre.od||pre.bodyD, dp=pre.dp||pre.bodyL;
        if(od&&Math.abs(D-od)/od>0.05) push('M1','fail',kindTxt+' CAD body D'+D.toFixed(1)+' vs preset '+od,[0,0,0],0.5);
        if(dp&&Math.abs(DEP-dp)/dp>0.08) push('M1','fail',kindTxt+' CAD depth '+DEP.toFixed(1)+' vs preset '+dp,[0,0,0],0.5); };
      chk(WOOFS[S.wfSel],'woofer'); chk(MIDS[S.midSel],'mid'); chk(CDS[S.cdSel],'CD'); }
    // ---- C1: drawn counts match the model ----
    let dDrv=0,dPort=0; V3D.group.traverse(o=>{const t=o.userData&&o.userData.tag;
      if(t==='driver'&&!o.isMesh)dDrv++; if(t==='port'&&o.isMesh)dPort++;});
    const mPort=L.reduce((a,d)=>a+(d.ports||[]).length,0);
    if(dDrv!==L.length) push('C1','fail','drawn drivers '+dDrv+' != model '+L.length,[0,0,0],1.2);
    if(dPort!==mPort) push('C1','fail','drawn ports '+dPort+' != model '+mPort,[0,0,0],1.2);
    return V;
  },
  frame(v){                                                        // fly the camera to the violation
    const sc=window.__sc||1, off=new THREE.Vector3(); V3D.group.getWorldPosition(off);
    V3D.tgt={x:v.at[0]*sc+off.x, y:v.at[2]*sc+off.y, z:v.at[1]*sc+off.z};
    V3D.spin=false; V3D.dist=Math.max(0.18, v.span*sc*3.2);
    V3D.yaw=(V3D.yaw||0.6)+0.0001; V3D.pitch=0.35; render3d();
  },
  reset(){ V3D.tgt=null; V3D.dist=2.0; render3d(); },
  report(){ const v=this.audit();
    return {fails:v.filter(x=>x.sev==='fail').length, warns:v.filter(x=>x.sev==='warn').length, violations:v};
  }
};""")

# 2) INSPECT button + panel in the 3-D card
rep('<button id="v3dmode" class="act" style="position:absolute;left:8px;top:8px;z-index:2;">View: assembly</button>',
    '<button id="v3dmode" class="act" style="position:absolute;left:8px;top:8px;z-index:2;">View: assembly</button>'
    '<button id="v3dinspect" class="act" style="position:absolute;left:8px;top:44px;z-index:2;">Inspect</button>'
    '<div id="insppanel" style="display:none;position:absolute;right:8px;top:8px;bottom:8px;width:270px;overflow:auto;background:rgba(255,255,255,0.96);border:1px solid #999;z-index:3;font-size:11px;padding:8px;"></div>')

rep("  cv.addEventListener('pointerdown',e=>{drag=true;V3D.spin=false;px=e.clientX;py=e.clientY;cv.setPointerCapture(e.pointerId);});",
"""  cv.addEventListener('pointerdown',e=>{drag=true;V3D.spin=false;px=e.clientX;py=e.clientY;cv.setPointerCapture(e.pointerId);});
  { const bI=document.getElementById('v3dinspect'), pI=document.getElementById('insppanel');
    if(bI) bI.addEventListener('click',()=>{
      if(pI.style.display==='block'){ pI.style.display='none'; INSPECT.reset(); return; }
      const r=INSPECT.report();
      pI.innerHTML='<b>INSPECT</b> — '+r.fails+' fail · '+r.warns+' warn'
        +(r.violations.length?'':'<br><span style="color:#2c7a2c;">clean: taps on their surfaces, clearances hold, drawn sizes truthful, counts match</span>')
        +'<div>'+r.violations.map((v,i)=>'<div style="margin:5px 0;padding:4px;border-left:3px solid '+(v.sev==='fail'?'#C8331D':'#A8842C')+';cursor:pointer;" onclick="INSPECT.frame(INSPECT._last['+i+'])"><b>'+v.code+'</b> '+v.msg+'</div>').join('')+'</div>'
        +'<div style="margin-top:6px;color:#666;cursor:pointer;" onclick="INSPECT.reset()">↺ reset view</div>';
      INSPECT._last=r.violations; pI.style.display='block';
      if(r.violations.length) INSPECT.frame(r.violations[0]);
    }); }""")

rep("window.MEH_BUILD=59;","window.MEH_BUILD=60;")
rep("build 59 · 8 TRUE CAD bodies + datasheet presets",
    "build 60 · INSPECT engine in-tool (tap-scale invariants · fly-to-violation evidence · live panel) · 8 TRUE CAD bodies + datasheet presets")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD60 INSPECT: %d -> %d chars'%(n0,len(src)))
