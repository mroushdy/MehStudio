#!/usr/bin/env node
'use strict';

/* Fast, focused contract for the rebuilt 1-way coax subsystem.
   The full gate remains authoritative for cross-topology regressions; this file
   lets geometry work fail in seconds rather than waiting for all 480 states. */
const MEH2=require('./engine.js');
let checks=0;
const failures=[];
const ck=(ok,msg)=>{ checks++; if(!ok) failures.push(msg); };
const mm=x=>x*1000;
const key=p=>p.map(x=>Math.round(x*1e6)).join(',');

function manifold(mesh,tag){
  const edges=new Map();
  const owners=new Map();
  mesh.tri.forEach((t,ti)=>{ for(const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
    const ka=key(mesh.pos[a]),kb=key(mesh.pos[b]),k=ka<kb?ka+'|'+kb:kb+'|'+ka;
    edges.set(k,(edges.get(k)||0)+1);
    if(!owners.has(k)) owners.set(k,[]); owners.get(k).push(ti); } });
  let bad=0; for(const n of edges.values()) if(n!==2) bad++;
  ck(bad===0,tag+' is not watertight ('+bad+' bad edges)');
  const parent=mesh.tri.map((_,i)=>i);
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
  for(const a of owners.values()) if(a.length===2) join(a[0],a[1]);
  const components=new Set(mesh.tri.map((_,i)=>root(i))).size;
  ck(components===1,tag+' contains '+components+' disconnected/hidden shells');
}

for(const build of MEH2.BUILDS['1way']){
  const tag='['+build.key+']';
  const solved=MEH2.solve({...build.s});
  if(build.key==='fhx6') ck(!solved.infeasible,tag+' flagship preset is refused');
  const S=solved.S,ev=MEH2.evaluate(S),cg=MEH2.coneGeom(S),wg=ev.st.wgFace;
  const taps=ev.layout.filter(d=>d.kind==='coaxtap');
  ck(ev.layout.coax.mountX<ev.st.xAdapter-0.003,
    tag+' coax driver frame is inside the MEH flare');
  ck(ev.layout.coax.rearX<ev.layout.coax.mountX,
    tag+' coax driver body points forward into the horn');
  ck(cg.rHF<cg.rWG&&cg.rWG<cg.rHole&&cg.rHole<cg.rCone&&cg.rCone<cg.rFrame,
    tag+' diameter order must be CD throat < cone-plane ID < clearance < cone < frame');
  ck(!!wg&&wg.ok,tag+' printed face is not R-OSSE');
  if(wg&&wg.ok){
    ck(Math.abs(wg.pts[0].y-cg.rWG)<1e-8,tag+' R-OSSE does not start at the exposed silver coax mouth');
    ck(Math.abs(wg.pts[wg.pts.length-1].y-(cg.rFrame+0.012))<1e-7,tag+' R-OSSE rim radius drift');
    ck(!!wg.ownHorn,tag+' replacement is still constrained by the removed OEM horn');
    ck(Math.abs(ev.st.xAdapter-wg.depth)<2e-7,tag+' large horn does not start at the replacement-horn mouth');
    const rAtX=x=>{ const p=wg.pts;
      for(let i=1;i<p.length;i++) if(p[i].x>=x){ const a=p[i-1],b=p[i],f=(x-a.x)/Math.max(1e-12,b.x-a.x);
        return a.y+(b.y-a.y)*f; } return p[p.length-1].y; };
    ck(rAtX(cg.coneX)>=cg.rHole,tag+' replacement horn collides with the measured cone-plane clearance');
    ck(rAtX(cg.coneX)<=cg.rFrame+0.012,tag+' replacement horn exceeds its baffle handoff before the cone plane');
    for(let i=1;i<wg.pts.length;i++) ck(wg.pts[i].y>=wg.pts[i-1].y-1e-10,tag+' R-OSSE radius reversed');
    const n=wg.pts.length, exitSlope=(wg.pts[n-1].y-wg.pts[n-2].y)/
      Math.max(1e-12,wg.pts[n-1].x-wg.pts[n-2].x);
    const exitDeg=Math.atan(exitSlope)*180/Math.PI;
    ck(Math.abs(exitDeg-S.covH/2)<5,tag+' R-OSSE does not blend into the woofer horn');
    if(build.key==='fhx6') ck(Math.abs(exitDeg-S.covH/2)<0.5,
      '[fhx6] R-OSSE/woofer-horn tangent seam is visible'); }
  ck(taps.length===(S.coaxTaps|0),tag+' tap count drift');
  for(const d of taps){
    ck(Math.abs(d.slot.sa-d.slot.sb)<1e-10,tag+' non-circular coax port');
    ck(d.slot.sb>=0.0015,tag+' port diameter below printable minimum');
    const r=Math.hypot(d.tap[1],d.tap[2]);
    ck(r-d.slot.sb>=cg.rHole-1e-4&&r+d.slot.sb<=cg.rCone+1e-4,
      tag+' circular port leaves the exposed cone band'); }
  const dish=MEH2.dishMesh(S);
  ck(!!dish&&dish.pos.length>1000,tag+' dish mesh missing');
  if(dish){
    manifold(dish,tag+' dish');
    let rMin=Infinity; for(const p of dish.pos) rMin=Math.min(rMin,Math.hypot(p[1],p[2]));
    ck(Math.abs(rMin-cg.rWG)<2e-5,tag+' generated horn does not meet the silver coax mouth'); }
  const one=MEH2.coaxHornMesh(S);
  ck(!!one&&one.pos.length>2000,tag+' one-piece coax horn missing');
  if(one){ manifold(one,tag+' one-piece coax horn');
    const a=MEH2.fabricationAudit(S,one,true);
    ck(a.badOrientation===0,tag+' one-piece coax horn has '+a.badOrientation+' reversed edge pairs');
    ck(a.degenerate===0,tag+' one-piece coax horn has zero-area triangles');
    ck(a.duplicateFaces===0,tag+' one-piece coax horn has duplicate faces');
    ck(a.nonFinite===0,tag+' one-piece coax horn has invalid coordinates');
    ck(a.orientationConflict===0,tag+' one-piece coax horn is non-orientable');
    ck(a.volume>0,tag+' one-piece coax horn does not enclose positive material volume');
    ck(a.selfIntersections===0,tag+' one-piece coax horn intersects itself');
    ck(a.pass,tag+' one-piece coax horn failed the fabrication release audit'); }
  if(build.key==='fhx6'){
    const td=MEH2.coaxTapDesign(S,cg);
    ck(Math.abs(td.fx-2500)<1,'[fhx6] tap solver ignored the requested crossover');
    ck(td.fit&&td.coherent&&td.circumference,'[fhx6] crossover-derived lateral bores are infeasible');
    ck(2*td.r>0.015&&2*td.r<0.018,'[fhx6] Sd/compression-derived bore diameter left the expected scale');
    ck(td.cr===16&&td.VreqCc>12&&td.VreqCc<20,
      '[fhx6] coupled compression/chamber calculation drifted');
    ck(Math.abs(mm(2*cg.rCone)-120.09)<0.05,'[fhx6] cone diameter is not the measured CAD value');
    ck(Math.abs(mm(cg.dep)-24.01)<0.05,'[fhx6] cone depth is not the measured CAD value');
    ck(Math.abs(mm(2*cg.rHF)-20.066)<0.02,'[fhx6] CD throat is not the measured CAD value');
    ck(Math.abs(mm(2*cg.rWG)-43.871)<0.02,'[fhx6] cone-plane acoustic ID is not the measured CAD value');
    ck(Math.abs(mm(2*cg.rHole)-49.084)<0.02,'[fhx6] cone-plane clearance OD is not the measured CAD value');
    ck(Math.abs(mm(2*cg.rStock)-91.88)<0.02,'[fhx6] stock mouth datum is not the measured CAD value'); }
}

console.log('COAX GATE: '+checks+' checks — '+(failures.length?failures.length+' FAILED':'ALL PASS'));
for(const f of failures) console.log('  ✗ '+f);
process.exit(failures.length?1:0);
