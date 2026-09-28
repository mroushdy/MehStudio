#!/usr/bin/env node
/* v5 canonical matrix — every case must solve clean (0 fails) or refuse honestly.
   Run: node test_matrix.js   (persisted per the autopilot/testing mandate) */
const MEH2=require('./engine.js');
const WPRE={ w65:{od:18.7,dp:8.5,sd:132,vtc:45,xm:6}, w8:{od:22.5,dp:9.0,sd:220,vtc:80,xm:7},
  hpl10:{od:26.1,dp:12.2,sd:320,vtc:130,xm:4}, w15:{od:39.0,dp:17,sd:855,vtc:320,xm:10} };   // b531 audit re-bake
const MPRE={ m3:{od:9.3,dp:6.2,sd:31,vtc:25,xm:2.5}, m4:{od:10.3,dp:6.5,sd:50,vtc:40,xm:3} };
WPRE.w5={od:13.76,dp:6.95,sd:91.6,vtc:35,xm:2.5};   // Dayton DC130A-8 (b531: the 5.25in fiction is retired)
const base={topo:'2way',twoArch:'panel',twoFamily:'panel',twoDesign:'arch:panel',
  tapBasis:'model',style:'angular',wallT:0.012,seN:12,covH:90,covV:60,mouthW:28,mouthCap:64,
  throat:1.4,rollR:2,fxHi:900,fxLo:300,cdDepth:2.4,td:1.4,coaxRing:4.5,
  cdFloor:300,twoXO:500,tapCRW:6,nW:2,npW:2,shW:'slot',mountRing:'integrated',nM:4};
const drv=(S,w,m)=>{const W=WPRE[w];S.odW=W.od;S.dpW=W.dp;S.sdW=W.sd;S.vtcW=W.vtc;S.xmW=W.xm;
  if(m){const M=MPRE[m];S.odM=M.od;S.dpM=M.dp;S.sdM=M.sd;S.vtcM=M.vtc;S.xmM=M.xm;} return S;};
const CASES=[
  ['calculated panel 2×5.25 — direct chamber plates', drv({...base},'w5','m4'), 'clean'],
  ['calculated panel 4×10 — four local wall chambers',drv({...base,nW:4,mouthW:34},'hpl10','m4'), 'clean'],
  ['calculated radial 3×5.25 — printed equal paths',
    drv({...base,twoArch:'radial',twoFamily:'radial',twoDesign:'arch:radial',
      style:'smooth',seN:6,nW:3,npW:1,mountRing:'ring',mouthW:24},'w5','m4'), 'clean'],
  ['calculated radial 6×5.25 — printed equal paths',
    drv({...base,twoArch:'radial',twoFamily:'radial',twoDesign:'arch:radial',
      style:'smooth',seN:6,nW:6,npW:1,mountRing:'ring',mouthW:28},'w5','m4'), 'clean'],
  ['radial 8×15 in a 24-inch mouth — honest packing refusal',
    drv({...base,twoArch:'radial',twoFamily:'radial',twoDesign:'arch:radial',
      style:'smooth',seN:6,nW:8,npW:1,mountRing:'ring',mouthW:24},'w15','m4'), 'refuse'],
  ['CD floor above the woofer path ceiling — honest overlap refusal',
    drv({...base,cdFloor:1500,twoXO:500,npW:1},'w65','m4'), 'refuse'],
  ['3way 4x10 + 4 mids',             drv({...base,topo:'3way',nW:4,fxHi:900,fxLo:250},'hpl10','m4'), 'clean'],
  ['1way coax dcx-ish',              {...base,topo:'1way',td:1.4,cdFloor:300,sdC:150,vtcC:60,xmC:4,coaxTaps:6,odC:0.22,dpC:0.11}, 'clean'],
  ['tall panel 4×5.25 60×90',         drv({...base,covH:60,covV:90,nW:4},'w5','m4'), 'clean'],
  /* RULING B preserves the spacing tolerance, but the generic 4×15 stress
     state still refuses its 27:1 low-frequency compression ratio. */
  ['SH96 corner-board stress state — CR refusal',
    drv({...base,topo:'3way',style:'angular',seN:12,nW:4,nM:6,mouthW:34,fxLo:250,placeW:'chamfer',cdFloor:300},'w15','m3'), 'refuse'],
];
let bad=0;
for(const [name,S0,expect] of CASES){
  const r=MEH2.solve(S0);
  const f=r.ev.rows.filter(q=>q.st==='fail'), w=r.ev.rows.filter(q=>q.st==='warn');
  const fx=r.S.fxDerived||{};
  const clean=!r.infeasible&&!f.length;
  const pass=(expect==='clean')?clean:!clean;
  console.log(`${pass?'PASS':'** BAD'} ${clean?'clean ':'refuse'} ${name}  mouth ${r.S.mouthW}"  XO ${fx.hi||'-'}${fx.hi!==fx.lo?'/'+(fx.lo||'-'):''} Hz  dialect ${r.S.dialectW||'-'}  fails ${f.length} warns ${w.length}`);
  for(const q of f) console.log(`    FAIL  [${q.sec}] ${q.name} = ${q.val}`);
  if(!pass) for(const q of w) console.log(`    warn  [${q.sec}] ${q.name} = ${q.val}`);
  if(!pass) bad++;
}
console.log(bad? `\n${bad} case(s) off expectation`:'\nMATRIX AS EXPECTED');
process.exit(bad?1:0);
