#!/usr/bin/env node
/* v5 canonical matrix — every case must solve clean (0 fails) or refuse honestly.
   Run: node test_matrix.js   (persisted per the autopilot/testing mandate) */
const MEH2=require('./engine.js');
const WPRE={ w65:{od:16.7,dp:8.5,sd:132,vtc:45,xm:5}, w8:{od:21.0,dp:10,sd:220,vtc:80,xm:6.5},
  hpl10:{od:26.1,dp:12.2,sd:330,vtc:130,xm:8}, w15:{od:39.0,dp:17,sd:855,vtc:320,xm:10} };
const MPRE={ m3:{od:9.3,dp:6.2,sd:31,vtc:25,xm:2.5}, m4:{od:10.3,dp:6.5,sd:50,vtc:40,xm:3} };
WPRE.w5={od:13.2,dp:7,sd:85,vtc:35,xm:4.5};   // 5.25-inch class - the small-woofer multi-tap canon
const base={topo:'2way',style:'smooth',wallT:0.012,seN:6,covH:90,covV:60,mouthW:24,mouthCap:64,
  throat:1.4,rollR:2,fxHi:900,fxLo:300,cdDepth:1.7,td:1.4,coaxRing:4.5,nW:6,nM:4};
const drv=(S,w,m)=>{const W=WPRE[w];S.odW=W.od;S.dpW=W.dp;S.sdW=W.sd;S.vtcW=W.vtc;S.xmW=W.xm;
  if(m){const M=MPRE[m];S.odM=M.od;S.dpM=M.dp;S.sdM=M.sd;S.vtcM=M.vtc;S.xmM=M.xm;} return S;};
/* multi-way 2-ways ride a coax CD (DCX464 canon, floor 300) - the established
   honest-refusal resolution; one de900 2-way stays as an EXPECTED refusal. */
const cx={cdFloor:300};
const CASES=[
  ['arda-ish 2way 6x5.25 90x60 dcx', drv({...base,...cx},'w5','m4'), 'clean'],
  ['square 2way 4x10 seN12 dcx',     drv({...base,...cx,seN:12,nW:4},'hpl10','m4'), 'clean'],
  ['3way 4x10 + 4 mids',             drv({...base,topo:'3way',nW:4,fxHi:900,fxLo:250},'hpl10','m4'), 'clean'],
  ['SH96-ish 3way 4x15 + 6 mids',    drv({...base,topo:'3way',nW:4,nM:6,mouthW:34,fxLo:250},'w15','m3'), 'refuse'],
  ['round 2way 6x5.25 seN2 60x60 dcx',drv({...base,...cx,seN:2,covH:60,covV:60},'w5','m4'), 'clean'],
  ['1way coax dcx-ish',              {...base,topo:'1way',td:1.4,cdFloor:300,sdC:150,vtcC:60,xmC:4,coaxTaps:6,odC:0.22,dpC:0.11}, 'clean'],
  ['wide 2way 6x8 120x60 dcx',       drv({...base,...cx,covH:120,covV:60},'w8','m4'), 'clean'],
  ['tall 2way 4x5.25 60x90 dcx',     drv({...base,...cx,covH:60,covV:90,nW:4},'w5','m4'), 'clean'],
  ['2way 6x6.5 on a de900 (honest refusal)', drv({...base},'w65','m4'), 'refuse'],
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
