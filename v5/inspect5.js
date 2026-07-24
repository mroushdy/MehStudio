#!/usr/bin/env node
/* ================= v5 ASSEMBLY INSPECTOR (build 528, his call) =================
   "Build a new way to evaluate how things work and do it while programming...
   you are messing a lot of how these MEH speakers should work together."
   gate.js asserts per-part invariants; THIS file asserts the ASSEMBLY - the
   cross-part truths that make a MEH a MEH. Every check is a relationship
   between two parts, recomputed independently of the code that placed them.
   Use WHILE CODING:  node inspect5.js '{"topo":"3way","style":"angular"}'
   Whole battery:     node inspect5.js            (all presets + default state)
   gate.js runs the battery on every push (section 2.9). Zero issues = sane. */
'use strict';
const MEH2=require('./engine.js');
const fin=v=>Number.isFinite(v);

/* is (y,z) inside the horn AIR CHANNEL at station x? (independent re-derivation:
   smooth = superellipse membership, angular = point-in-panel-polygon) */
function insideInner(S,st,x,y,z){
  if(x<1e-4||x>st.depth-1e-4) return false;
  if(S.style==='angular'){
    const F=MEH2.facetsAt(st,x), P=F.map(f=>f.p);
    let inC=false;
    for(let i=0,j=P.length-1;i<P.length;j=i++){
      if(((P[i][1]>z)!==(P[j][1]>z)) && (y < (P[j][0]-P[i][0])*(z-P[i][1])/(P[j][1]-P[i][1])+P[i][0])) inC=!inC;
    }
    return inC;
  }
  const d=MEH2.dimsAt(st,x), n=(d.n!==undefined)?d.n:st.n;
  return Math.pow(Math.abs(y/d.a),n)+Math.pow(Math.abs(z/d.b),n) < 1;
}

/* the battery: returns a list of issue strings (empty = the assembly is sane) */
function inspectState(S0){
  const S={...S0}, issues=[];
  const push=m=>issues.push(m);
  let st,L,ev;
  try{ ev=MEH2.evaluate(S); st=ev.st; L=ev.layout; }
  catch(e){ return ['evaluate threw: '+e.message]; }

  /* 1. COUNT TRUTH: what the user asked for is what landed */
  if(!L.missing&&S.topo!=='1way'){
    const nw=L.filter(d=>d.kind==='woof').length;
    if(nw!==((S.nW|0)||2)) push('asked '+S.nW+' woofers, landed '+nw);
    if(S.topo==='3way'){ const nm=L.filter(d=>d.kind==='mid').length;
      if(nm!==((S.nM|0)||4)) push('asked '+S.nM+' mids, landed '+nm); } }
  if(S.topo==='1way'){
    const nt=L.filter(d=>d.kind==='coaxtap').length;
    if(nt!==((S.coaxTaps|0)||6)) push('asked '+S.coaxTaps+' coax taps, landed '+nt); }

  /* 2. SEATS LIVE ON THE WALL: every driver center re-tested against the
     surface it claims to sit on (drivers must never float or bury - pin #18) */
  for(const d of L){ if(d.kind!=='woof'&&d.kind!=='mid') continue;
    if(d.board){
      /* CORNER BOARD (SH96/M7): its own 45° shelf, not a horn facet. The seat
         must ride the corner diagonal with a pocket deep enough for the body */
      const rC=Math.hypot(d.center[1],d.center[2]);
      const dm=MEH2.dimsAt(st,d.x);
      const rCorner=(dm.a+dm.b)/Math.SQRT2;
      if(rC>=rCorner) push('corner board past its own corner');
      const nd=Math.abs(d.normal[1]*Math.cos(d.phi)+d.normal[2]*Math.sin(d.phi));
      if(Math.abs(nd-1)>0.01) push('corner-board normal off the diagonal');
      continue;
    }
    if(S.style==='angular'){
      const F=MEH2.facetsAt(st,d.x), f=F[d.facet];
      if(!f){ push(d.kind+' seat claims facet '+d.facet+' which does not exist'); continue; }
      const perp=Math.abs((d.center[1]-f.p[0])*f.n2[0]+(d.center[2]-f.p[1])*f.n2[1]);
      if(perp>0.0015) push(d.kind+' seat floats '+(perp*1000).toFixed(1)+' mm off its panel');
    } else {
      const dm=MEH2.dimsAt(st,d.x), n=(dm.n!==undefined)?dm.n:st.n;
      const m=Math.pow(Math.abs(d.center[1]/dm.a),n)+Math.pow(Math.abs(d.center[2]/dm.b),n);
      if(Math.abs(m-1)>0.03) push(d.kind+' seat off the wall (membership '+m.toFixed(3)+')');
    } }

  /* 3. BODIES STAY OUT OF THE AIR PATH: the magnet hangs OUTSIDE the horn
     channel - sample the mount axis and the far end cap ring */
  for(const d of L){ if(d.kind!=='woof'&&d.kind!=='mid') continue;
    const A=d.mountN||d.normal;
    for(let t=0.25;t<=1.001;t+=0.25){
      const p=[d.center[0]+A[0]*d.dp*t, d.center[1]+A[1]*d.dp*t, d.center[2]+A[2]*d.dp*t];
      if(d.board){
        /* pocket-side test: the body lives BEHIND the board plane (the corner
           pocket is walled off the channel by the board itself) */
        const side=(p[1]-d.center[1])*d.normal[1]+(p[2]-d.center[2])*d.normal[2]+(p[0]-d.center[0])*d.normal[0];
        if(side<-1e-4) push('woof body crosses its corner board into the channel (t='+t.toFixed(2)+')');
      } else if(insideInner(S,st,p[0],p[1],p[2]))
        push(d.kind+' body point INSIDE the air channel at x='+(p[0]*1000).toFixed(0)+' mm (t='+t.toFixed(2)+')'); } }

  /* 4. TAPS PIERCE THE WALL THEY CLAIM: every tap center re-tested on-wall
     (the tap IS under the driver - if the seat is true so is the tap; verify
     the invariant anyway, independently) */
  for(const d of L){ if(!d.tap) continue;
    const off=Math.hypot(d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]);
    if(off>0.0015) push(d.kind+' tap drifted '+(off*1000).toFixed(1)+' mm from its driver'); }

  /* 5. THE 1WAY NEST: dish ring on the exposed cone annulus, unit face at the
     seat plane, bore wide enough for the TRUE HF exit (all re-derived) */
  if(S.topo==='1way'){
    if(st.xAdapter===undefined) push('1way without an adapter station');
    if(!L.coax||!(L.coax.od>0)||!(L.coax.dp>0)) push('coax unit body missing from layout');
    const rCone=(S.odW||22)*MEH2.CM/2, lo=0.60*rCone-1e-4, hi=0.72*rCone+1e-4;
    for(const d of L){ if(d.kind!=='coaxtap') continue;
      const rT=Math.hypot(d.tap[1],d.tap[2]);
      if(rT<lo||rT>hi) push('coax tap ring at '+(rT*1000).toFixed(1)+' mm - off the exposed cone annulus ['+(lo*1000).toFixed(0)+','+(hi*1000).toFixed(0)+'] (6FHX51 CAD)'); }
    const rHF=((S.hfExit||20.1)/1000)/2;
    if(st.throat<rHF-0.0005) push('horn throat '+(st.throat*1000).toFixed(1)+' mm narrower than the HF exit '+(rHF*1000).toFixed(1)+' mm'); }

  /* 6. THE BOX HOLDS EVERYTHING (fresh, via the same boxDims the viewer draws) */
  try{ const B=MEH2.boxDims(S);
    if(!(B.Vnet>0)) push('box net volume '+(B.Vnet*1000).toFixed(1)+' L <= 0');
    for(const d of L){ if(d.kind!=='woof'&&d.kind!=='mid') continue;
      const A=d.mountN||d.normal;
      const c1=[d.center[0]+A[0]*d.dp,d.center[1]+A[1]*d.dp,d.center[2]+A[2]*d.dp];
      if(c1[0]<B.x0-1e-6||Math.abs(c1[1])>B.hy+d.od/2+1e-6||Math.abs(c1[2])>B.hz+d.od/2+1e-6)
        push(d.kind+' magnet outside the box'); }
  }catch(e){ push('boxDims threw: '+e.message); }

  /* 7. NaN SWEEP across every layout field the viewer will draw */
  for(const d of L){ for(const k of ['center','normal','tap'])
      if(d[k]&&!d[k].every(fin)) push(d.kind+'.'+k+' non-finite');
    if(d.slot&&!(fin(d.slot.sa)&&fin(d.slot.sb))) push(d.kind+' slot dims non-finite'); }

  /* 8. LAW-ROW / GEOMETRY AGREEMENT: a fail row must not coexist with a
     clean solve claim (refusal honesty - pin #22) */
  const fails=ev.rows.filter(r=>r.st==='fail').length;
  const r2=MEH2.solve({...S0});
  if(!r2.infeasible){ const again=MEH2.evaluate(r2.S);
    const f2=again.rows.filter(r=>r.st==='fail').length;
    if(f2>0) push('solve claims clean but '+f2+' law row(s) still fail'); }
  return issues;
}

module.exports={inspectState,insideInner};

/* ---- CLI ---- */
if(require.main===module){
  const arg=process.argv[2];
  const base={topo:'2way',style:'smooth',wallT:0.012,seN:6,covH:90,covV:60,mouthW:24,mouthCap:64,
    throat:1.4,rollR:2,fxHi:900,fxLo:300,cdDepth:2.4,td:1.4,cdFloor:300,coaxRing:4.5,subXO:80,
    nW:4,odW:16.7,dpW:8.5,sdW:132,vtcW:45,xmW:5, nM:4,odM:10.3,dpM:6.5,sdM:50,vtcM:40,xmM:3};
  let total=0, bad=0;
  const run=(name,S)=>{ total++;
    const iss=inspectState(S);
    if(iss.length){ bad++; console.log('✗ '+name); for(const i of iss) console.log('    '+i); }
    else console.log('✓ '+name); };
  if(arg){ run('override', {...base, ...JSON.parse(arg)}); }
  else{
    run('default 2way', {...base});
    for(const topo of Object.keys(MEH2.BUILDS)) for(const b of MEH2.BUILDS[topo])
      run('preset '+topo+'/'+b.key, {...b.s});
  }
  console.log('INSPECT: '+total+' states, '+(bad? bad+' WITH ISSUES':'ALL SANE'));
  process.exit(bad?1:0);
}
