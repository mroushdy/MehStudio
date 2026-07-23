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
const W={ w5:{od:13.2,dp:7,sd:85,vtc:35,xm:4.5}, w8:{od:21.0,dp:10,sd:220,vtc:80,xm:6.5},
          hpl10:{od:26.1,dp:12.2,sd:330,vtc:130,xm:8}, w15:{od:39.0,dp:17,sd:855,vtc:320,xm:10} };
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
  lattice.push(mk({topo,seN,style,covH,covV,placeW,wallT,mount,npW:np,npM:np,
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
    const off=Math.hypot(d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]);
    ck(off<=0.0011, tag+' tap not under driver ('+(off*1000).toFixed(1)+'mm)');
    if(d.slot) ck(d.slot.ap>0&&fin(d.slot.ap), tag+' bad slot area');
  }
  if(!L.missing&&S.topo!=='1way') ck(L.filter(d=>d.kind==='woof').length===((S.nW|0)||2), tag+' woofer count wrong');
  /* pin #9 facet laws: on ANGULAR every seat sits ON a big facet, normal in the panel plane */
  if(S.style==='angular') for(const d of L){ if(d.facet===undefined) continue;
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
    ck(w===0, tag+' lands with '+w+' warn(s) - presets must be exemplary');
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
  /* M8: preset driver/CD numerics must mirror the shell's datasheet tables */
  { const grab=(re)=>{ const m=sh.match(re); return m? new Function('return '+m[1])() : null; };
    const shW=grab(/const WPRE=([\s\S]*?);\nconst MPRE/), shM=grab(/const MPRE=([\s\S]*?);\nconst CDP/),
          shC=grab(/const CDP=(\{.*?\});/);
    ck(!!shW&&!!shM&&!!shC, 'could not read shell driver tables for the preset cross-check');
    if(shW&&shM&&shC) for(const topo of Object.keys(MEH2.BUILDS)) for(const b of MEH2.BUILDS[topo]){
      const s=b.s, tag='[build '+topo+'/'+b.key+']';
      if(s.wPre){ const P=shW[s.wPre];
        ck(!!P&&P.od===s.odW&&P.dp===s.dpW&&P.sd===s.sdW&&P.vtc===s.vtcW&&P.xm===s.xmW, tag+' woofer numerics drift from shell WPRE.'+s.wPre); }
      if(s.mPre){ const P=shM[s.mPre];
        ck(!!P&&P.od===s.odM&&P.dp===s.dpM&&P.sd===s.sdM&&P.vtc===s.vtcM&&P.xm===s.xmM, tag+' mid numerics drift from shell MPRE.'+s.mPre); }
      if(s.cdSel){ const P=shC[s.cdSel];
        ck(!!P&&P.td===s.td&&P.floor===s.cdFloor&&P.dep===s.cdDepth, tag+' CD numerics drift from shell CDP.'+s.cdSel); }
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
