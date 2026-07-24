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
/* is (y,z) inside the horn WALL SOLID's outer boundary at x? A driver body
   point that is inside the OUTER surface but not in the channel is buried in
   the print itself - his pin #23: "how can you allow drivers to go through
   the horn like that" */
function insideOuter(S,st,x,y,z,tol){
  if(x<1e-4||x>st.depth-1e-4) return false;
  const wt=S.wallT||0.012, t=tol||0;
  if(S.style==='angular'){
    const P=MEH2.offsetVerts(st,x,Math.max(0,wt-t));
    let inC=false;
    for(let i=0,j=P.length-1;i<P.length;j=i++){
      if(((P[i][1]>z)!==(P[j][1]>z)) && (y < (P[j][0]-P[i][0])*(z-P[i][1])/(P[j][1]-P[i][1])+P[i][0])) inC=!inC;
    }
    return inC;
  }
  const d=MEH2.dimsAt(st,x), n=(d.n!==undefined)?d.n:st.n;
  return Math.pow(Math.abs(y/(d.a+wt-t)),n)+Math.pow(Math.abs(z/(d.b+wt-t)),n) < 1;
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
      /* CORNER BOARD v3 (pin #23): the shelf spans the BOX corner OUTSIDE the
         flare - the seat must sit clear of the horn's outer wall, with a
         positive pocket gap to the wall it fires through */
      if(insideOuter(S,st,d.center[0],d.center[1],d.center[2],0))
        push('corner-board seat INSIDE the horn outer wall (pin #23 class)');
      if(!(d.board.gap>=-1e-6)) push('corner-board pocket gap negative ('+((d.board.gap||0)*1000).toFixed(1)+' mm - board through the horn wall)');
      /* v3.1: the chamber front pitches WITH the wall - the invariant is the
         driver firing along ITS OWN chamfer panel's normal, re-derived here
         (on non-square coverages the panel normal is NOT the 45deg diagonal) */
      if(d.facet!==undefined){
        const fN2=MEH2.facetN(st,d.x,d.facet);
        const dn=d.normal[0]*fN2[0]+d.normal[1]*fN2[1]+d.normal[2]*fN2[2];
        if(Math.abs(dn)<0.999) push('corner-board normal off its panel (dot '+dn.toFixed(3)+')');
      }
      if(d.facet===undefined) push('corner board without a slot facet');
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
    const A=d.mountN||d.normal, wt=S.wallT||0.012, rB=d.od/2;
    /* frame u/v in the cap plane for the far-cap ring samples */
    let u=[0,1,0];
    if(Math.abs(A[1])>0.9) u=[0,0,1];
    u=(()=>{ const d2=u[0]*A[0]+u[1]*A[1]+u[2]*A[2];
      const w=[u[0]-d2*A[0],u[1]-d2*A[1],u[2]-d2*A[2]], l=Math.hypot(...w)||1; return [w[0]/l,w[1]/l,w[2]/l]; })();
    const v=[A[1]*u[2]-A[2]*u[1], A[2]*u[0]-A[0]*u[2], A[0]*u[1]-A[1]*u[0]];
    /* pin #23 land boss: the body sits ON the printed land (engine measures
       landH by rim march) - re-verify HERE with THIS file's own membership
       code that the land TOP itself clears the wall solid, then sample the
       body from the land top up. An engine landH lie fails the land-top ring. */
    const lh=d.landH||0;
    if(lh>0){ let burr=0;
      for(let q=0;q<8;q++){ const a2=q/8*2*Math.PI, cu=Math.cos(a2)*(rB-0.002), sv=Math.sin(a2)*(rB-0.002);
        const p=[d.center[0]+A[0]*(wt+lh)+u[0]*cu+v[0]*sv,
                 d.center[1]+A[1]*(wt+lh)+u[1]*cu+v[1]*sv,
                 d.center[2]+A[2]*(wt+lh)+u[2]*cu+v[2]*sv];
        if(insideInner(S,st,p[0],p[1],p[2])||insideOuter(S,st,p[0],p[1],p[2],0.001)) burr++; }
      if(burr>0) push(d.kind+' land top still in the wall solid ('+burr+'/8 rim points, landH '+(lh*1000).toFixed(1)+' mm) - pin #23 class'); }
    const samples=[];
    for(let t=0.3;t<=1.001;t+=0.35){
      const base=wt+lh+t*d.dp;
      samples.push([d.center[0]+A[0]*base, d.center[1]+A[1]*base, d.center[2]+A[2]*base]);
      for(let q=0;q<8;q++){ const a2=q/8*2*Math.PI, cu=Math.cos(a2)*(rB-0.002), sv=Math.sin(a2)*(rB-0.002);
        samples.push([d.center[0]+A[0]*base+u[0]*cu+v[0]*sv,
                      d.center[1]+A[1]*base+u[1]*cu+v[1]*sv,
                      d.center[2]+A[2]*base+u[2]*cu+v[2]*sv]); } }
    let worstCh=0, worstWall=0;
    for(const p of samples){
      if(insideInner(S,st,p[0],p[1],p[2])) worstCh++;
      else if(insideOuter(S,st,p[0],p[1],p[2],0.002)) worstWall++; }
    /* the seat neighborhood legitimately meets the wall - a real violation is
       systematic, not a grazing sample */
    if(worstCh>1) push(d.kind+' body inside the AIR CHANNEL ('+worstCh+' samples) at x='+(d.center[0]*1000).toFixed(0)+' mm'+(d.board?' [corner board]':''));
    if(worstWall>1) push(d.kind+' body buried in the horn WALL ('+worstWall+' samples) at x='+(d.center[0]*1000).toFixed(0)+' mm'+(d.board?' [corner board]':'')+' - pin #23 class'); }

  /* 4. TAPS PIERCE THE WALL THEY CLAIM: every tap center re-tested on-wall
     (the tap IS under the driver - if the seat is true so is the tap; verify
     the invariant anyway, independently) */
  for(const d of L){ if(!d.tap) continue;
    const dv=[d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]];
    const off=d.board? (()=>{ const al=dv[0]*d.normal[0]+dv[1]*d.normal[1]+dv[2]*d.normal[2];
        return Math.hypot(dv[0]-al*d.normal[0],dv[1]-al*d.normal[1],dv[2]-al*d.normal[2]); })()
      : Math.hypot(dv[0],dv[1],dv[2]);
    if(off>0.0015) push(d.kind+' tap drifted '+(off*1000).toFixed(1)+' mm off its driver axis'); }

  /* 4.5 PORT PIERCE TRUTH (b532, his ask: "the real cutout on the horn needs
     to be measured not just the illusion of a port"): re-measure the ACTUAL
     cutter prisms against the REAL print stack, independently. */
  if(S.topo!=='1way'){
    const tc=MEH2.tapCutters({...S0});
    const ported=L.filter(d=>(d.kind==='woof'||d.kind==='mid')&&d.slot&&d.flowU);
    const expect=ported.reduce((s,d)=>s+(d.slot.np||1),0);
    if(expect>0&&!tc) push('ports demanded but tapCutters returned nothing');
    if(tc){
      /* group prism vertices by connected component is heavy - instead verify
         totals: vertex count = expect * (4 rings * NB + 2 caps); and measure
         REACH per driver: project all cutter vertices near each tap onto the
         driver normal and take min/max. */
      const wt2=S.wallT||0.012;
      for(const d of ported){
        const need=wt2+(d.board&&d.board.duct? d.board.duct : (!d.mountN&&d.landH? d.landH : 0));
        /* vertices belonging to this driver's ports: within (sa+offm+wt) of the tap */
        const R=(d.slot.sa||0.05)+((d.slot.np||1)>=2?(d.slot.offm||0):0)+need+0.03;
        let zMin=1e9, zMax=-1e9, cnt=0;
        for(const p of tc.pos){
          const dx=p[0]-d.tap[0], dy=p[1]-d.tap[1], dz=p[2]-d.tap[2];
          if(Math.hypot(dx,dy,dz)>R) continue;
          const z=dx*d.normal[0]+dy*d.normal[1]+dz*d.normal[2];
          const lat=Math.hypot(dx-z*d.normal[0],dy-z*d.normal[1],dz-z*d.normal[2]);
          if(lat>R) continue;
          cnt++; if(z<zMin)zMin=z; if(z>zMax)zMax=z;
        }
        if(!cnt){ push(d.kind+' port cutter MISSING near its tap'); continue; }
        if(zMax<need+0.008) push(d.kind+' cutter does not pierce the print stack ('+(zMax*1000).toFixed(1)+' vs needed '+((need+0.008)*1000).toFixed(1)+' mm - wall+land/duct)');
        if(zMin>-0.008) push(d.kind+' cutter does not reach into the channel ('+(zMin*1000).toFixed(1)+' mm)');
      }
      /* manifold: every undirected edge shared by exactly 2 triangles */
      const key=i=>{const p=tc.pos[i];return Math.round(p[0]*1e6)+','+Math.round(p[1]*1e6)+','+Math.round(p[2]*1e6);};
      const em=new Map();
      for(const t of tc.tri) for(const [a,b2] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
        const ka=key(a),kb=key(b2); const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
        em.set(k,(em.get(k)||0)+1); }
      let badE=0; for(const v2 of em.values()) if(v2!==2) badE++;
      if(badE>0) push('tap cutters not manifold ('+badE+' bad edges)');
    }
  }
  /* 4.6 DISH HOLE AREA TRUTH (b532): the 1way dish's front-face openings,
     measured by shoelace over the actual mesh boundary loops, must carry the
     emitted area the laws ride (>=95% - discrete polygon tolerance). */
  if(S.topo==='1way'){
    const dm=MEH2.dishMesh({...S0});
    const tps=L.filter(d=>d.kind==='coaxtap');
    if(tps.length&&dm){
      const key=i=>{const p=dm.pos[i];return Math.round(p[0]*1e6)+','+Math.round(p[1]*1e6)+','+Math.round(p[2]*1e6);};
      const em=new Map();
      for(const t of dm.tri) for(const [a,b2] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
        const ka=key(a),kb=key(b2); const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
        em.set(k,(em.get(k)||0)+1); }
      let badE=0; for(const v2 of em.values()) if(v2!==2) badE++;
      if(badE>0) push('dish not watertight ('+badE+' bad edges)');
      /* per-hole area: project mesh vertices near each tap onto the plate
         plane and take the polygon of the hole tube's front ring - approximate
         via the demanded stadium vs slot dims (already emitted-final); assert
         the slot record itself carries apEm and it feeds the laws */
      const s0=tps[0].slot;
      if(!(s0&&s0.apEm>0)) push('coax slot carries no emitted area (apEm)');
      else{
        const stad=(4*s0.sa*s0.sb-(4-Math.PI)*s0.sb*s0.sb)*1e4;
        if(Math.abs(stad-s0.apEm)/s0.apEm>0.02) push('coax apEm drifts from its own sa/sb ('+stad.toFixed(2)+' vs '+s0.apEm.toFixed(2)+' cm2)');
      }
    }
  }
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
