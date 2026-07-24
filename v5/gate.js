#!/usr/bin/env node
/* ================= v5 ACCEPTANCE GATE =================
   Horn Studio ritual, ported: EVERY push runs this battery first.
   A "check" is one asserted invariant on one state. The gate sweeps a
   lattice of states (topology x form x style x coverage x placement x
   wall x drivers), asserts engine sanity on each, then runs the
   canonical matrix and the assembly/branding checks.
   Run: node gate.js        (exit 0 = pushable) */
'use strict';
const fs=require('fs');
const MEH2=require('./engine.js');

let CHECKS=0, FAILS=[], STATES=0;
const ck=(cond,msg)=>{ CHECKS++; if(!cond) FAILS.push(msg); };
const fin=v=>Number.isFinite(v);

/* ---------- 1. engine source sanity ---------- */
{
  const en=fs.readFileSync('engine.js','utf8');
  ck(en.length>20000,'engine suspiciously small');
  ck(!/window\.V3D/.test(en),'engine must not touch window.V3D (const-guard lesson)');
  ck(/module\.exports=MEH2/.test(en),'engine export missing');
  try{ new Function(en); ck(true,''); }catch(e){ ck(false,'engine syntax: '+e.message); }
}

/* ---------- 2. the state lattice ---------- */
const W={ w5:{od:13.76,dp:6.95,sd:91.6,vtc:35,xm:2.5}, w8:{od:22.5,dp:9.0,sd:220,vtc:80,xm:7}, cl10:{od:25.7,dp:10.8,sd:320,vtc:130,xm:5.5},
          hpl10:{od:26.1,dp:12.2,sd:320,vtc:130,xm:4}, w15:{od:39.0,dp:17,sd:855,vtc:320,xm:10} };   // b531 audit re-bake (KNOWN_BUILDS_AUDIT 3.1)
const M={ m3:{od:9.3,dp:6.2,sd:31,vtc:25,xm:2.5}, m4:{od:10.3,dp:6.5,sd:50,vtc:40,xm:3} };
const mk=(o)=>{
  const S={topo:'2way',style:'smooth',wallT:0.012,seN:6,covH:90,covV:60,mouthW:24,mouthCap:64,
    throat:1.4,rollR:2,fxHi:900,fxLo:300,cdDepth:1.7,td:1.4,cdFloor:300,coaxRing:4.5,nW:4,nM:4,...o};
  const w=W[S._w||'w8'], m=M[S._m||'m4'];
  S.odW=w.od;S.dpW=w.dp;S.sdW=w.sd;S.vtcW=w.vtc;S.xmW=w.xm;
  S.odM=m.od;S.dpM=m.dp;S.sdM=m.sd;S.vtcM=m.vtc;S.xmM=m.xm;
  if(S.topo==='1way'){ S.sdC=150;S.vtcC=60;S.xmC=4;S.coaxTaps=6;S.odC=0.22;S.dpC=0.11; }
  return S;
};
const lattice=[];
for(const topo of ['1way','2way','3way'])
for(const seN of [2,6,12])
for(const style of ['smooth','angular'])
for(const [covH,covV] of [[90,60],[60,60],[120,60],[60,90]])
for(const placeW of (topo==='2way'?['auto','ring','pairsH','pairsV','chamfer']: topo==='3way'?['auto','chamfer']:['auto']))
for(const wallT of (placeW==='auto'?[0.008,0.02]:[0.012]))
for(const mount of ((placeW==='auto'&&wallT===0.02)?['flush','axial']:['flush']))
for(const np of ((placeW==='auto'&&wallT===0.008)?[1,2]:[1]))          // pins #1/#23/#25: straddling pairs swept too
for(const sh of ((placeW==='auto'&&wallT===0.008&&np===2)?['slot','round']:['slot']))   // round taps (his classic-hole call)
  lattice.push(mk({topo,seN,style,covH,covV,placeW,wallT,mount,npW:np,npM:np,shW:sh,shM:sh,
    _w: covH>=120?'w8':(seN>=12?'hpl10':'w5'), _m: topo==='3way'?'m4':'m3'}));

for(const S of lattice){
  STATES++;
  const tag=`[${S.topo}/${S.style}/n${S.seN}/${S.covH}x${S.covV}/${S.placeW}/w${S.wallT}]`;
  let st,L,ev;
  try{ st=MEH2.stations(S); }catch(e){ ck(false,tag+' stations threw: '+e.message); continue; }
  /* stations sanity */
  ck(st.pts.length>8, tag+' too few stations');
  let mono=true, pos=true, finOK=true, prev=-1;
  for(const p of st.pts){ if(!(fin(p.x)&&fin(p.a)&&fin(p.b))) finOK=false;
    if(p.x<=prev&&!p.roll) mono=false; if(!p.roll) prev=p.x;
    if(p.a<=0||p.b<=0) pos=false; }
  ck(finOK, tag+' non-finite station'); ck(mono, tag+' x not increasing'); ck(pos, tag+' non-positive half-axis');
  /* area monotone pre-roll + positive */
  let aPrev=0, aMono=true;
  for(let i=0;i<=16;i++){ const A=MEH2.areaAt(st, st.depth*0.95*i/16);
    ck(fin(A)&&A>0, tag+' bad area @'+i); if(A<aPrev*0.999) aMono=false; aPrev=A; }
  ck(aMono, tag+' area not monotone pre-roll');
  /* rings carry .param; se points finite */
  { const d=MEH2.dimsAt(st,st.depth*0.4), ring=MEH2.seRing(d.a,d.b,st.n,32);
    ck(ring.every(p=>fin(p[0])&&fin(p[1])), tag+' ring non-finite');
    ck(ring.every(p=>p.param!==undefined), tag+' ring missing .param'); }
  /* layout */
  try{ L=MEH2.layout(S,st); }catch(e){ ck(false,tag+' layout threw: '+e.message); continue; }
  for(const d of L){
    if(S.mount==='axial'&&d.kind!=='coaxtap') ck(!!d.mountN&&Math.abs(d.mountN[0]+1)<1e-9, tag+' axial mount lost its land axis');
    ck(d.center.every(fin)&&d.normal.every(fin)&&d.tap.every(fin), tag+' non-finite driver fields');
    const nl=Math.hypot(...d.normal); ck(Math.abs(nl-1)<0.01, tag+' normal not unit ('+nl.toFixed(3)+')');
    const dv=[d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]];
    const off=d.board? (()=>{ const al=dv[0]*d.normal[0]+dv[1]*d.normal[1]+dv[2]*d.normal[2];
        return Math.hypot(dv[0]-al*d.normal[0],dv[1]-al*d.normal[1],dv[2]-al*d.normal[2]); })()
      : Math.hypot(dv[0],dv[1],dv[2]);            // v3 boards: tap on the wall ALONG the fire axis
    ck(off<=0.0011, tag+' tap not under driver ('+(off*1000).toFixed(1)+'mm)');
    if(d.slot) ck(d.slot.ap>0&&fin(d.slot.ap), tag+' bad slot area');
  }
  if(!L.missing&&S.topo!=='1way') ck(L.filter(d=>d.kind==='woof').length===((S.nW|0)||2), tag+' woofer count wrong');
  /* pin #9 facet laws: on ANGULAR every seat sits ON a big facet, normal in the panel plane */
  if(S.style==='angular') for(const d of L){ if(d.facet===undefined||d.board) continue;   // v3 boards: center OUTSIDE the horn, facet = the slot's wall
    const F2=MEH2.facetsAt(st,d.x), f=F2[d.facet];
    ck(!f.ch || d.kind==='mid' || S.placeW==='chamfer', tag+' non-mid seat on a chamfer facet');   // SH50: diag mids own the chamfers; M7/SH96: 'chamfer' hands them to the WOOFERS
    const rel=[d.center[1]-f.p[0], d.center[2]-f.p[1]];
    const perp=Math.abs(rel[0]*f.n2[0]+rel[1]*f.n2[1]);
    ck(perp<=0.001, tag+' seat off its panel ('+(perp*1000).toFixed(1)+'mm)');
    const dv=[0,f.dir[0],f.dir[1]];
    const dot=Math.abs(d.normal[0]*dv[0]+d.normal[1]*dv[1]+d.normal[2]*dv[2]);
    ck(dot<=0.02, tag+' normal tilted across the panel ('+dot.toFixed(3)+')');
  }
  /* derived XO sanity + the 1.2x null margin by construction */
  if(S.fxDerived&&S.fxDerived.lo){
    ck(S.fxDerived.lo>20&&S.fxDerived.lo<4000, tag+' silly XO lo');
    if(S.topo==='3way'&&S.fxDerived.hi) ck(S.fxDerived.hi>=S.fxDerived.lo, tag+' XO order inverted');
    const dW2=L.find(d=>d.kind===(S.topo==='1way'?'coaxtap':'woof'));
    if(dW2){ const rT2=Math.hypot(dW2.tap[1],dW2.tap[2]);
      const path=(S.topo==='1way'? Math.hypot(dW2.x, rT2-st.throat) : dW2.x)+S.cdDepth*MEH2.IN;   // 1way: SLANT along the adapter
      const fNull=MEH2.C/(4*path);
      ck(fNull>=1.185*S.fxDerived.lo, tag+' null margin lost ('+(fNull/S.fxDerived.lo).toFixed(2)+'x)'); }
  }
  /* evaluate: rows well-formed, no NaN values */
  try{ ev=MEH2.evaluate(S); }catch(e){ ck(false,tag+' evaluate threw: '+e.message); continue; }
  ck(ev.rows.length>=(L.missing?3:4), tag+' too few law rows');   // pre-solve states may not host rings yet
  for(const r of ev.rows){ ck(!!r.sec&&!!r.name&&r.val!==undefined&&!/NaN|Infinity/.test(String(r.val)), tag+' bad row: '+r.sec+'/'+r.name+'='+r.val);
    ck(['ok','warn','fail'].includes(r.st), tag+' bad row status'); }
  /* pins #1/#25: a straddling pair rides the CROSS direction at ONE station -
     crossV must be unit, in the wall plane, and orthogonal to flow */
  for(const d of ev.layout){ if(d.kind!=='woof'&&d.kind!=='mid') continue;
    const wantNp=((d.kind==='mid'?(S.npM|0):(S.npW|0))||1);
    if(d.slot) ck(d.slot.np===wantNp, tag+' slot np='+d.slot.np+' want '+wantNp);
    if(d.slot&&d.slot.np>=2){
      ck(d.slot.offm>0, tag+' pair missing cross offset');
      ck(!!d.crossV&&!!d.flowU, tag+' pair missing flow/cross frame');
      if(d.crossV&&d.flowU){
        ck(Math.abs(Math.hypot(...d.crossV)-1)<0.01, tag+' crossV not unit');
        const dn=Math.abs(d.crossV[0]*d.normal[0]+d.crossV[1]*d.normal[1]+d.crossV[2]*d.normal[2]);
        ck(dn<0.02, tag+' crossV out of the wall plane');
        const du=Math.abs(d.crossV[0]*d.flowU[0]+d.crossV[1]*d.flowU[1]+d.crossV[2]*d.flowU[2]);
        ck(du<0.02, tag+' crossV not orthogonal to flow (ports would sit behind each other)');
      }
    }
  }
  /* response finite */
  try{ const R=MEH2.response(S,ev);
    ck(R.f.length>50, tag+' response too short');
    ck(R.sum.every(fin), tag+' response sum non-finite');
    ck(R.hf.every(fin), tag+' response hf non-finite');
  }catch(e){ ck(false, tag+' response threw: '+e.message); }
  /* M9 (build 528): the true box must contain the assembly. Containment is
     checked against a FRESH stations+layout on the post-evaluate state - the
     same geometry boxDims itself sees (evaluate converges the angular flare
     break, so the pre-evaluate st/L above can differ). */
  try{ const B=MEH2.boxDims(S);
    ck([B.hy,B.hz,B.W,B.H,B.D,B.Vinner,B.Vhorn,B.Vnet,B.x0].every(fin), tag+' box non-finite');
    ck(B.W>=2*B.hy && B.H>=2*B.hz, tag+' box outer smaller than contents');
    ck(B.Vinner>B.Vhorn, tag+' horn volume exceeds its box');
    ck(B.Vnet>0, tag+' net rear volume <= 0');
    const st2=MEH2.stations(S), L2=MEH2.layout(S,st2);
    let inside=true;
    for(const p of st2.pts){ const x=Math.max(1e-4,Math.min(st2.depth-1e-4,p.x));
      if(S.style==='angular'){
        for(const v of MEH2.offsetVerts(st2,x,S.wallT||0.012))
          if(Math.abs(v[0])>B.hy+1e-6||Math.abs(v[1])>B.hz+1e-6) inside=false;
      } else if(p.a+(S.wallT||0.012)>B.hy+1e-6||p.b+(S.wallT||0.012)>B.hz+1e-6) inside=false; }
    ck(inside, tag+' horn outside its box');
    let dIn=true;
    for(const d of L2){ if(d.kind!=='woof'&&d.kind!=='mid') continue;
      const A=d.mountN||d.normal, r2=d.od/2;
      const c1=[d.center[0]+A[0]*d.dp,d.center[1]+A[1]*d.dp,d.center[2]+A[2]*d.dp];
      const ext=i2=>{ const w=Math.sqrt(Math.max(0,1-A[i2]*A[i2]))*r2;
        return [Math.min(d.center[i2],c1[i2])-w, Math.max(d.center[i2],c1[i2])+w]; };
      const ex=ext(0), ey=ext(1), ez=ext(2);
      if(ex[0]<B.x0-1e-6) dIn=false;
      if(Math.max(-ey[0],ey[1])>B.hy+1e-6) dIn=false;
      if(Math.max(-ez[0],ez[1])>B.hz+1e-6) dIn=false; }
    ck(dIn, tag+' a driver body escapes the box');
    ck(ev.rows.some(q=>q.sec==='BOX'), tag+' BOX rows missing');
  }catch(e){ ck(false, tag+' boxDims threw: '+e.message); }
  /* solve terminates + determinism on clean states */
  try{ const r=MEH2.solve(S);
    ck(!!r&&!!r.ev, tag+' solve returned nothing');
    if(!r.infeasible){ const again=MEH2.evaluate(r.S);
      ck(again.fails===0, tag+' solve says clean but re-evaluate fails='+again.fails); }
  }catch(e){ ck(false, tag+' solve threw: '+e.message); }
}

/* ---------- 2.5 the placement matrix table (docs/placement_matrix.md is LAW) ---------- */
{
  const dm=(o)=>{ const S=mk({topo:'3way',nW:2,nM:4,covH:110,covV:70,
    odW:31.5,dpW:14,sdW:522,vtcW:180,xmW:9, odM:10.3,dpM:6.5,sdM:50,vtcM:40,xmM:3, ...o});
    delete S._w; delete S._m;
    const st=MEH2.stations(S); MEH2.layout(S,st);
    return {W:(S.dialectW||'').replace(' (auto)',''), M:S.dialectM||''}; };
  const T=[
    [{nW:2},                                  'pairsV','pairsH','wide 2W -> H line, 4M rows'],
    [{nW:2,covH:70,covV:110},                 'pairsH','pairsV','tall 2W -> V line, 4M side rows'],
    [{nW:2,covH:70,covV:70},                  'pairsV','diag',  'square 2W -> line, 4M diamond'],
    [{nW:4},                                  'pairsH','pairsH','wide 4W rows, 4M rows'],
    [{nW:4,covH:70,covV:70},                  'ring',  'ring',  'square 4W ring, 4M ring'],
    [{nW:2,nM:2},                             'pairsV','pairsH','2M perpendicular to W line'],
    [{nW:2,nM:6},                             'pairsV','pairsH','6M rows'],
    [{nW:2,covH:70,covV:70,style:'angular'},  'pairsV','diag',  'square angular -> chamfer-board mids'],
    [{nW:4,placeW:'chamfer',style:'angular'}, 'chamfer','ring', 'M7/SH96: corner-board woofers -> apex-ring mids'],
  ];
  for(const [o,eW,eM,why] of T){ const d=dm(o);
    ck(d.W===eW && d.M===eM, 'placement matrix: '+why+' (got '+d.W+'/'+d.M+' want '+eW+'/'+eM+')'); }
}

/* ---------- 2.7 KNOWN-BUILD PRESETS (M8): every preset must land EXEMPLARY -
   solve at its stated mouth with zero fails, zero warns, zero growth ---------- */
{
  ck(!!MEH2.BUILDS && ['1way','2way','3way'].every(t=>Array.isArray(MEH2.BUILDS[t])&&MEH2.BUILDS[t].length),
    'BUILDS missing a topology group');
  for(const topo of Object.keys(MEH2.BUILDS||{})) for(const b of MEH2.BUILDS[topo]){
    const tag='[build '+topo+'/'+b.key+']';
    ck(!!b.key&&!!b.name&&!!b.s, tag+' malformed entry');
    ck(b.s.topo===topo, tag+' bundle topo does not match its group');
    const r=MEH2.solve({...b.s});
    const f=r.ev.rows.filter(q=>q.st==='fail').length, w=r.ev.rows.filter(q=>q.st==='warn').length;
    ck(!r.infeasible, tag+' infeasible');
    ck(f===0, tag+' lands with '+f+' fail(s)');
    const expW=(b.expectWarns|0)||0;   // ruling B: a preset may DECLARE its canon compromises (SH96)
    ck(w===expW, tag+' lands with '+w+' warn(s), declared '+expW);
    ck(r.S.mouthW===b.s.mouthW, tag+' mouth grew '+b.s.mouthW+'" -> '+r.S.mouthW+'" (bake the settled size)');
  }
}

/* ---------- 2.8 EXPORT GATE (queue A, artifact_test pattern): the shell solid
   must be WATERTIGHT - every undirected edge shared by exactly two triangles,
   keyed by position (panels duplicate vertices on purpose) ---------- */
{
  for(const topo of Object.keys(MEH2.BUILDS)) for(const b of MEH2.BUILDS[topo]){
    const tag='[stl '+topo+'/'+b.key+']';
    const r=MEH2.solve({...b.s});
    const mh=MEH2.shellMesh(r.S);
    ck(mh.tri.length>500, tag+' too few triangles');
    let fin2=true; for(const p of mh.pos) if(!(fin(p[0])&&fin(p[1])&&fin(p[2]))) fin2=false;
    ck(fin2, tag+' non-finite vertex');
    const key=i=>{const p=mh.pos[i];return Math.round(p[0]*1e6)+','+Math.round(p[1]*1e6)+','+Math.round(p[2]*1e6);};
    const em=new Map();
    for(const t of mh.tri) for(const [a,b2] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
      const ka=key(a),kb=key(b2); const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
      em.set(k,(em.get(k)||0)+1); }
    let bad=0; for(const v of em.values()) if(v!==2) bad++;
    ck(bad===0, tag+' not watertight ('+bad+' boundary/over-shared edges)');
    const bytes=MEH2.stlBytes(mh);
    ck(bytes.byteLength===84+mh.tri.length*50, tag+' STL byte size wrong');
    /* slice 3: tap cutters - closed prisms, watertight, one per port */
    if(topo!=='1way'){
      const wantPorts=((r.S.nW|0)||2)*((r.S.npW|0)||1) + (topo==='3way'?((r.S.nM|0)||4)*((r.S.npM|0)||1):0);
      const tc=MEH2.tapCutters(r.S);
      ck(!!tc, tag+' tap cutters missing');
      if(tc){ ck(tc.tri.length===wantPorts*192, tag+' cutter count off ('+tc.tri.length+' tris for '+wantPorts+' ports)');   // b532 prism: 24-pt manifold outline x 4 rings (wide/wide/nominal/nominal) = 144 side + 48 cap tris
        const kt=i=>{const p=tc.pos[i];return Math.round(p[0]*1e6)+','+Math.round(p[1]*1e6)+','+Math.round(p[2]*1e6);};
        const et=new Map();
        for(const t of tc.tri) for(const [a,b2] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
          const ka=kt(a),kb=kt(b2); const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
          et.set(k,(et.get(k)||0)+1); }
        let badT=0; for(const v of et.values()) if(v!==2) badT++;
        ck(badT===0, tag+' cutters not watertight ('+badT+')'); }
      /* the X-pair variant must also emit clean cutters */
      const r2=MEH2.solve({...b.s, npW:2});
      if(!r2.infeasible){ const tc2=MEH2.tapCutters(r2.S);
        ck(!!tc2&&tc2.tri.length===(((r2.S.nW|0)||2)*2+(topo==='3way'?((r2.S.nM|0)||4)*((r2.S.npM|0)||1):0))*192, tag+' np2 cutter count off'); }
    }
    /* slice 4: angular presets must yield a finite panel layout with sane seams */
    if(b.s.style==='angular'){
      const pl=MEH2.panelLayout(r.S);
      ck(!!pl&&pl.panels.length>=4, tag+' panel layout missing/short');   // true square (pin #17) = 4 plates; chamfered forms = 8
      if(pl){ for(const p of pl.panels){
          ck(p.widths.every(v=>fin(v)&&v>0)&&p.slants.every(v=>fin(v)&&v>0), tag+' bad panel dims ('+p.name+')'); }
        for(const s2 of pl.seams) ck(fin(s2.deg)&&s2.deg>0&&s2.deg<180, tag+' bad seam angle'); }
    }
    /* slice 2: the Reference D dish insert must be its own watertight part */
    if(topo==='1way'){
      const dm=MEH2.dishMesh(r.S);
      ck(!!dm&&dm.tri.length>800, tag+' dish mesh missing/too small');
      if(dm){ const kd=i=>{const p=dm.pos[i];return Math.round(p[0]*1e6)+','+Math.round(p[1]*1e6)+','+Math.round(p[2]*1e6);};
        const ed=new Map();
        for(const t of dm.tri) for(const [a,b2] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
          const ka=kd(a),kb=kd(b2); const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
          ed.set(k,(ed.get(k)||0)+1); }
        let badD=0; for(const v of ed.values()) if(v!==2) badD++;
        ck(badD===0, tag+' dish not watertight ('+badD+')'); }
    }
  }
}

/* ---------- 2.9 ASSEMBLY INSPECTOR (build 528, his call: "evaluate how things
   work together while programming") - inspect5.js re-derives the cross-part
   truths independently; every preset AND a lattice sample must come back sane ---------- */
{
  const {inspectState}=require('./inspect5.js');
  for(const topo of Object.keys(MEH2.BUILDS)) for(const b of MEH2.BUILDS[topo]){
    const iss=inspectState({...b.s});
    ck(iss.length===0, '[inspect '+topo+'/'+b.key+'] '+iss.slice(0,3).join(' | '));
  }
  for(let i=0;i<lattice.length;i+=7){
    const S2={...lattice[i]};
    const iss=inspectState(S2);
    const tag2=`[inspect ${S2.topo}/${S2.style}/n${S2.seN}/${S2.covH}x${S2.covV}/${S2.placeW}]`;
    ck(iss.length===0, tag2+' '+iss.slice(0,3).join(' | '));
  }
}

/* ---------- 3. canonical matrix (subprocess, expectations asserted there) ---------- */
{
  const {execSync}=require('child_process');
  try{ execSync('node test_matrix.js',{stdio:'pipe'}); ck(true,''); }
  catch(e){ ck(false,'canonical matrix off expectation:\n'+String(e.stdout)); }
}

/* ---------- 4. shell / assembly / branding ---------- */
{
  const sh=fs.readFileSync('shell.html','utf8');
  ck(sh.includes('/*__ENGINE__*/'), 'shell engine marker missing');
  ck(sh.includes("id=\"placeW\"")||sh.includes("id='placeW'"), 'placement selector missing');
  ck(sh.includes('id="buildSel"')||sh.includes("id='buildSel'"), 'known-build selector missing');
  ck(sh.includes('id="reports"'), 'reports panel missing (queue D)');
  ck(sh.includes('id="subXO"'), 'sub-crossover control missing (M6)');
  ck(sh.includes('id="bStl"'), 'export button missing (queue A)');
  /* M8: preset driver/CD numerics must mirror the shell's datasheet tables */
  { const grab=(re)=>{ const m=sh.match(re); return m? new Function('return '+m[1])() : null; };
    const shW=grab(/const WPRE=([\s\S]*?\})\s*;[^\n]*\nconst MPRE/), shM=grab(/const MPRE=([\s\S]*?\})\s*;[^\n]*\n\/\* 1-WAY COAX/),
          shX=grab(/const CXPRE=([\s\S]*?\})\s*;[^\n]*\nconst CDP/), shC=grab(/const CDP=(\{[\s\S]*?\});/);
    ck(!!shW&&!!shM&&!!shX&&!!shC, 'could not read shell driver tables for the preset cross-check');
    if(shW&&shM&&shX&&shC) for(const topo of Object.keys(MEH2.BUILDS)) for(const b of MEH2.BUILDS[topo]){
      const s=b.s, tag='[build '+topo+'/'+b.key+']';
      if(s.wPre){ const P=(topo==='1way'? shX : shW)[s.wPre];
        ck(!!P&&P.od===s.odW&&P.dp===s.dpW&&P.sd===s.sdW&&P.vtc===s.vtcW&&P.xm===s.xmW, tag+' driver numerics drift from the shell table .'+s.wPre); }
      if(s.mPre){ const P=shM[s.mPre];
        ck(!!P&&P.od===s.odM&&P.dp===s.dpM&&P.sd===s.sdM&&P.vtc===s.vtcM&&P.xm===s.xmM, tag+' mid numerics drift from shell MPRE.'+s.mPre); }
      if(s.cdSel&&s.cdSel!=='unit'){ const P=shC[s.cdSel];
        ck(!!P&&P.td===s.td&&P.floor===s.cdFloor&&P.dep===s.cdDepth, tag+' CD numerics drift from shell CDP.'+s.cdSel); }
      else if(s.cdSel==='unit') ck(s.cdFloor===0&&s.td===1.0, tag+' one-unit coax must carry the unverified floor + 1in-class bore');
    }
  }
  /* ---------- 2.10 ADAPTIVE SETTINGS contract (his ask 2026-07-24):
     adapt(S,key,T) is pure, deterministic, idempotent, and may only touch
     DERIVED-class knobs (docs/adaptive_settings_plan.md §1) ---------- */
  { const T={WPRE:null,MPRE:null,CXPRE:null,CDP:null};
    { const grab=(re)=>{ const m=sh.match(re); return m? new Function('return '+m[1])() : null; };
      T.WPRE=grab(/const WPRE=([\s\S]*?\})\s*;[^\n]*\nconst MPRE/); T.MPRE=grab(/const MPRE=([\s\S]*?\})\s*;[^\n]*\n\/\* 1-WAY COAX/);
      T.CXPRE=grab(/const CXPRE=([\s\S]*?\})\s*;[^\n]*\nconst CDP/); T.CDP=grab(/const CDP=(\{[\s\S]*?\});/); }
    ck(!!(T.WPRE&&T.MPRE&&T.CXPRE&&T.CDP), '2.10: could not read shell tables for adapt');
    const DERIVED={ cdSel:['td','throat','cdFloor','cdDepth'],
      wPre:['odW','dpW','sdW','vtcW','xmW','sdC','vtcC','xmC','hfExit','recXO','hornType','cdDepth','mouthW'],
      mPre:['odM','dpM','sdM','vtcM','xmM'],
      odW:['wPre','dpW','sdW','vtcW','xmW'], odM:['mPre','dpM','sdM','vtcM','xmM'],
      style:['seN'], mouthW:['rollR'], covH:['rollR'], covV:['rollR'], rollR:['rollR'], nW:[] };
    for(let i=0;i<lattice.length;i+=31){
      const S0={...lattice[i]};
      for(const key of Object.keys(DERIVED)){
        const S1={...S0};
        if(key==='odW') S1.wPre='custom'; if(key==='odM') S1.mPre='custom';
        if(key==='cdSel') S1.cdSel='de900';
        if(key==='wPre') S1.wPre=(S1.topo==='1way')?'fhx12':'w8';
        if(key==='mPre') S1.mPre='m4';
        const r1=MEH2.adapt(S1,key,T), r2=MEH2.adapt(S1,key,T);
        ck(JSON.stringify(r1)===JSON.stringify(r2), '2.10 adapt not deterministic on '+key);
        for(const e of r1.ledger)
          ck(DERIVED[key].includes(e.knob)||e.knob==='mouthW', '2.10 adapt touched INTENT knob '+e.knob+' on '+key);
        const r3=MEH2.adapt(r1.S2,key,T);
        ck(r3.ledger.length===0, '2.10 adapt not idempotent on '+key+' ('+r3.ledger.map(e=>e.knob).join(',')+')');
        for(const e of r1.ledger) ck(e.why&&e.from!==e.to, '2.10 ledger entry malformed on '+key);
      }
    }
  }
  ck(/BUGPINS/.test(sh), 'BUGPINS module missing');
  ck(!/window\.V3D(?!=)/.test(sh.replace(/window\.V3D=/g,'')), 'shell window.V3D guard regression');
  /* monochrome law: red only in failure semantics */
  const reds=(sh.match(/#C8331D/gi)||[]).length, redCtx=(sh.match(/--red|fail|BUGPIN|#C8331D/gi)||[]).length;
  ck(redCtx>=reds, 'red used outside failure semantics?');
  const BRAND=/\barda\b|\bara[- ]?audio\b/i;              // word-bounded: 'charAt'/'parameter' must not trip it
  ck(!BRAND.test(sh), 'brand scrub violated in shell');
  ck(!BRAND.test(fs.readFileSync('engine.js','utf8')), 'brand scrub violated in engine');
  /* API census: every MEH2.<fn> the shell calls must exist in the engine export */
  { const en2=fs.readFileSync('engine.js','utf8');
    const exp=(en2.match(/return \{([^}]+)\};\s*\}\)\(\);/)||[])[1]||'';
    const names=new Set(exp.split(',').map(t=>t.trim().split(':')[0]).filter(Boolean));
    const used=new Set((sh.match(/MEH2\.(\w+)/g)||[]).map(t=>t.slice(5)));
    for(const u of used) ck(names.has(u), 'shell calls MEH2.'+u+' but the engine does not export it');
  }
  if(fs.existsSync('meh5.html')){
    const m5=fs.readFileSync('meh5.html','utf8');
    ck(!m5.includes('/*__ENGINE__*/'), 'meh5 not assembled (marker still present)');
    ck(m5.includes('MEH2'), 'meh5 missing engine');
    const body=m5.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
    if(body){ try{ new Function(body[1]); ck(true,'');}catch(e){ ck(false,'meh5 assembled script syntax: '+e.message); } }
  }
}

console.log(`GATE: ${CHECKS} checks over ${STATES} states — ${FAILS.length? FAILS.length+' FAILED':'ALL PASS'}`);
for(const f of FAILS.slice(0,40)) console.log('  ✗ '+f);
if(FAILS.length>40) console.log('  … '+(FAILS.length-40)+' more');
process.exit(FAILS.length?1:0);
