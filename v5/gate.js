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
for(const placeW of (topo==='2way'?['auto','ring','pairsH','pairsV']:['auto']))
for(const wallT of (placeW==='auto'?[0.008,0.02]:[0.012]))
  lattice.push(mk({topo,seN,style,covH,covV,placeW,wallT,
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
    ck(d.center.every(fin)&&d.normal.every(fin)&&d.tap.every(fin), tag+' non-finite driver fields');
    const nl=Math.hypot(...d.normal); ck(Math.abs(nl-1)<0.01, tag+' normal not unit ('+nl.toFixed(3)+')');
    const off=Math.hypot(d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]);
    ck(off<=0.0011, tag+' tap not under driver ('+(off*1000).toFixed(1)+'mm)');
    if(d.slot) ck(d.slot.ap>0&&fin(d.slot.ap), tag+' bad slot area');
  }
  if(!L.missing&&S.topo!=='1way') ck(L.filter(d=>d.kind==='woof').length===((S.nW|0)||2), tag+' woofer count wrong');
  /* derived XO sanity + the 1.2x null margin by construction */
  if(S.fxDerived&&S.fxDerived.lo){
    ck(S.fxDerived.lo>20&&S.fxDerived.lo<4000, tag+' silly XO lo');
    if(S.topo==='3way'&&S.fxDerived.hi) ck(S.fxDerived.hi>=S.fxDerived.lo, tag+' XO order inverted');
    const dW2=L.find(d=>d.kind===(S.topo==='1way'?'coaxtap':'woof'));
    if(dW2){ const path=(S.topo==='1way'?Math.hypot(dW2.tap[1],dW2.tap[2]):dW2.x)+S.cdDepth*MEH2.IN;
      const fNull=MEH2.C/(4*path);
      ck(fNull>=1.185*S.fxDerived.lo, tag+' null margin lost ('+(fNull/S.fxDerived.lo).toFixed(2)+'x)'); }
  }
  /* evaluate: rows well-formed, no NaN values */
  try{ ev=MEH2.evaluate(S); }catch(e){ ck(false,tag+' evaluate threw: '+e.message); continue; }
  ck(ev.rows.length>=(L.missing?3:4), tag+' too few law rows');   // pre-solve states may not host rings yet
  for(const r of ev.rows){ ck(!!r.sec&&!!r.name&&r.val!==undefined&&!/NaN|Infinity/.test(String(r.val)), tag+' bad row: '+r.sec+'/'+r.name+'='+r.val);
    ck(['ok','warn','fail'].includes(r.st), tag+' bad row status'); }
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
  ck(/BUGPINS/.test(sh), 'BUGPINS module missing');
  ck(!/window\.V3D(?!=)/.test(sh.replace(/window\.V3D=/g,'')), 'shell window.V3D guard regression');
  /* monochrome law: red only in failure semantics */
  const reds=(sh.match(/#C8331D/gi)||[]).length, redCtx=(sh.match(/--red|fail|BUGPIN|#C8331D/gi)||[]).length;
  ck(redCtx>=reds, 'red used outside failure semantics?');
  const BRAND=/\barda\b|\bara[- ]?audio\b/i;              // word-bounded: 'charAt'/'parameter' must not trip it
  ck(!BRAND.test(sh), 'brand scrub violated in shell');
  ck(!BRAND.test(fs.readFileSync('engine.js','utf8')), 'brand scrub violated in engine');
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
