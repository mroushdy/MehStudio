#!/usr/bin/env node
'use strict';

/* Release matrix for the one-piece coax print.
   Every browser coax class is exercised as ROUND and SQUARE at the two useful
   shell gauges. This is deliberately deeper than coax_gate.js: it runs the
   spatial triangle-intersection audit on every emitted body. */
const M=require('./engine.js');
const base=JSON.parse(JSON.stringify(M.BUILDS['1way'][0].s));
const drivers=[
  ['BMS 5CN140',{odW:13.5,dpW:8.2,sdW:74,sdC:74,xmW:3.5,xmC:3.5,
    recXO:1900,coaxXO:1900,hfExit:25.4,coaxTaps:4}],
  ['B&C 6FHX51',{}],
  ['B&C 6HCX51',{odW:18.7,dpW:10.4,sdW:132,sdC:132,xmW:3.5,xmC:3.5,
    recXO:2200,coaxXO:2200,hfExit:20.1,coaxTaps:4}],
  ['B&C 12FHX76',{odW:31.5,dpW:16.9,sdW:522,sdC:522,xmW:4.25,xmC:4.25,
    recXO:1200,coaxXO:1200,hfExit:33,coaxTaps:6}],
  ['B&C 12HCX76',{odW:31.5,dpW:16.8,sdW:522,sdC:522,xmW:4.25,xmC:4.25,
    recXO:1200,coaxXO:1200,hfExit:33,coaxTaps:6}],
  ['B&C 15FHX76',{odW:39.3,dpW:19.9,sdW:855,sdC:855,xmW:4.25,xmC:4.25,
    recXO:1200,coaxXO:1200,hfExit:33,coaxTaps:6}]
];
const cad=['coneD','coneDepth','coneMouthD','coneClearanceD','stockHornMouthD',
  'bdepD','stockHornDepth','coneGeomSrc'];
const failures=[];
let states=0,triangles=0,pairs=0;
for(const [driver,over] of drivers) for(const style of ['smooth','angular'])
  for(const wallT of [0.008,0.012]){
    const S={...base,...over,style,seN:style==='smooth'?2:12,wallT,tapCR:16,
      mouthW:Math.max(base.mouthW,Math.round(2.35*(over.odW||base.odW)/2.54))};
    if(driver!=='B&C 6FHX51') for(const key of cad) delete S[key];
    const solved=M.solve(S),mesh=M.coaxHornMesh(solved.S);
    const audit=M.fabricationAudit(solved.S,mesh,true);
    const taps=M.coaxTapDesign(solved.S,M.coneGeom(solved.S));
    states++; triangles+=mesh.tri.length; pairs+=audit.intersectionPairs;
    if(!audit.pass||!taps.structural) failures.push({
      driver,style,wall_mm:wallT*1000,bad_edges:audit.badEdges,
      reversed:audit.badOrientation,shells:audit.components,
      self_intersections:audit.selfIntersections,
      min_web_mm:+(Math.min(taps.radialInner,taps.radialOuter,taps.circumWeb)*1000).toFixed(2)
    });
  }
console.log('FABRICATION MATRIX: '+states+' solids · '+triangles+' triangles · '
  +pairs+' candidate intersections tested — '+(failures.length?failures.length+' FAILED':'ALL PASS'));
for(const f of failures) console.log('  ✗ '+JSON.stringify(f));
process.exit(failures.length?1:0);
