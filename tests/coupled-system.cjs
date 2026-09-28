const {test}=require('node:test'),assert=require('node:assert/strict'),{context:c}=require('./load-editor.cjs')(),M=c.MEH,A=c.MEHAcoustics,N=require('../acoustics/multiport-network.cjs')(c.MEHHornAcoustics),S=require('../acoustics/coupled-system.cjs')(M,A,N),C=(r=0,i=0)=>({r,i}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8*Math.max(1e-8,Math.abs(y)),`${x} != ${y}`),base={...M.defaults,...M.drivers.mid.bc6ndl38.parameters,midDriver:'bc6ndl38',mouth:700,coverage:60,k:1.4,r:.2,m:.8,b:.1,q:3.5,tap:147,gap:42,port:45,count:4,sharedBack:108,back:3};
test('Independent coupled motor branches reduce to existing equal-drive model',()=>{
 for(const rearLayout of ['shared','individual'])for(const rearConcept of ['individual','reflex'])for(const f of [100,300,700]){
  const a=M.analyze({...base,rearLayout,rearConcept}),opts={density:1.204,endCorrection:1.4,rearLossQ:7,rearEndCorrectionScale:1,hornLoad:'webster',mouthTermination:'baffled',throatTermination:'closed',loadFactor:1},k=A.circuitParameters(a,A.catalog.bc6ndl38,opts);k.hornNetwork=c.MEHHornAcoustics.buildNetwork(a);k.hornOptions=opts;
  const ref=A.solve(f,k,1),r=S.solve(a,f,Array.from({length:4},(_,i)=>({id:'m'+i,analysis:a,voltage:C(1)})),opts);assert.equal(r.available,true,r.reason);for(const b of r.branches){near(b.excursionPeakMM,ref.excursionPeakMM);near(Math.hypot(b.entryFlow.r,b.entryFlow.i),ref.flowRmsM3s);near(b.inputPowerW,ref.inputPowerW);}near(r.horn.mouthPowerW,ref.hornMouthRadiatedPowerW);assert.ok(Math.abs(r.relativePowerResidual)<1e-9);
 }
});
test('A muted driver remains coupled and separate axial locations change its response',()=>{
 const a=M.analyze({...base,rearLayout:'shared'}),b=M.analyze({...base,rearLayout:'shared',tap:110}),r=S.solve(a,400,[{id:'driven',analysis:a,voltage:C(1)},{id:'muted',analysis:b,voltage:C()}]);assert.equal(r.available,true,r.reason);assert.ok(Math.hypot(r.branches[1].pistonFlow.r,r.branches[1].pistonFlow.i)>1e-8);assert.ok(Math.abs(r.relativePowerResidual)<1e-9);
});
test('Insert acoustic output requires a supplied spatial two-port',()=>{
 const a=M.analyze({...base,frontFiller:'offset'}),r=S.solve(a,300,[{analysis:a,voltage:C(1)}]);assert.equal(r.available,false);assert.match(r.reason,/spatial/);
});
test('Independent throat source drives the same coupled system with passive energy balance',()=>{
 const a=M.analyze({...base,rearLayout:'shared'}),r=S.solve(a,500,[{id:'mid',analysis:a,voltage:C()}],{acousticSources:[{id:'normalized-throat',zMM:0,flow:C(1e-4),admittance:C(1e-6)}]});assert.equal(r.available,true,r.reason);assert.ok(r.branches[0].excursionPeakMM>0);assert.ok(r.horn.mouthPowerW>0);assert.ok(Math.abs(r.relativePowerResidual)<1e-9);
});

test('Missing/stale spatial matrices and incompatible horn profiles cannot produce results',()=>{
 const a=M.analyze({...base,frontFiller:'offset'});for(const frontTwoPort of [{},{available:false,frequencyHz:300,impedance:[[C(),C()],[C(),C()]]},{frequencyHz:400,impedance:[[C(),C()],[C(),C()]]}])assert.equal(S.solve(a,300,[{analysis:a,voltage:C(1),frontTwoPort}]).available,false);
 const b=M.analyze({...base,mouth:600});assert.equal(S.solve(a,300,[{analysis:b,voltage:C(1)}]).available,false);
});
