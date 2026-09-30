const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../acoustics/crossover-study.cjs')();
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function flat(db=90,phase=0){const t=C.example().mid;t.rows=t.rows.map(r=>({...r,db,phase}));return t;}
test('complex crossover filters match analytical limits and LR4 sums flat',()=>{
 for(const family of ['BW1','LR2','LR4']){const l=C.filter(700,700,'lp',family),h=C.filter(700,700,'hp',family);near(Math.hypot(l.re,l.im),family==='BW1'?Math.SQRT1_2:.5);near(Math.hypot(h.re,h.im),family==='BW1'?Math.SQRT1_2:.5);}
 for(const [family,polarity]of [['BW1',1],['LR2',-1],['LR4',1]]){const r=C.sum(flat(),flat(),{filter:family,polarityHigh:polarity});for(const row of r.rows)near(row.sumDb,90);near(r.metrics.rippleDb,0);}
});
test('polarity and milliseconds delay produce real complex cancellation',()=>{
 const r=C.sum(flat(),flat(),{filter:'none'});near(r.rows[0].sumDb,96.02059991327963);
 const nullResult=C.sum(flat(),flat(),{filter:'none',polarityHigh:-1});assert.ok(nullResult.rows.every(r=>r.sumDb===-300));
 const f=C.sum(flat(),flat(),{filter:'none',delayHighMs:1,lowHz:500,highHz:1000});assert.ok(f.rows[0].sumDb < -200);near(f.rows.at(-1).sumDb,96.02059991327963);
});
test('references gate actual summation, including phase timing voltage and source basis',()=>{
 const a=flat(),b=flat();assert.ok(C.referenceGate(a,b).allowed);
 for(const key of ['time','level','voltageRms','distanceM','window','calibration','distanceOrigin','voltageBasis','plane','phasor','angleDeg']){const t=structuredClone(b);delete t.reference[key];assert.ok(!C.referenceGate(a,t).allowed,key);assert.throws(()=>C.sum(a,t),key);}
 const b2=structuredClone(b);b2.reference.phasePreserved=false;assert.throws(()=>C.sum(a,b2),/preserved/);
 const m=structuredClone(a),s=structuredClone(b);m.provenance={};s.provenance={};m.basis='measured';s.basis='simulated';assert.throws(()=>C.sum(m,s),/source bases/);assert.equal(C.sum(m,s,{allowMixedBasis:true}).gate.basis,'mixed measured / simulated');
 assert.equal(C.compare(m,s).gate.allowed,false);
});
test('log-amplitude and unwrapped-phase interpolation avoids phasor-chord cancellation',()=>{
 const t=C.normalize({basis:'measured',rows:[{f:100,db:0,phase:170},{f:200,db:20,phase:-170}]});const z=C.interpolate(C.slice(t),Math.sqrt(20000));near(20*Math.log10(Math.hypot(z.re,z.im)),10);near(Math.abs(Math.atan2(z.im,z.re)*180/Math.PI),180);
 assert.throws(()=>C.interpolate(C.slice(t),99),/extrapolation/);assert.throws(()=>C.interpolate([{f:100,db:0,phase:0},{f:800,db:0,phase:0}],200),/gap/);
});
test('parse preserves metadata and rejects blank duplicate nonnumeric or sparse data',()=>{
 const t=flat();assert.deepEqual(C.parse(C.traceCSV(t)),t);assert.deepEqual(C.parse(JSON.stringify(t)),t);
 assert.throws(()=>C.parse('frequency_hz,magnitude_db,phase_deg\n100,1,\n200,1,0'),/Invalid/);
 assert.throws(()=>C.parse('frequency_hz,magnitude_db,phase_deg\n100,1,0\n100,1,0'),/Duplicate/);
 assert.throws(()=>C.normalize({...t,rows:[{f:1e300,db:0,phase:0},{f:1,db:0,phase:0}]}),/Invalid/);
 assert.throws(()=>C.sum(t,t,{fcHz:1e-300}),/positive/);
 assert.throws(()=>C.sum(t,t,{lowHz:50}),/complete study band/);
});
test('synthetic and generated model provenance cannot be relabelled measured',()=>{
 const t=C.example().mid;assert.throws(()=>C.normalize({...t,basis:'measured'}),/remain labelled synthetic/);
 const model=C.fromBroadband({available:true,model:'reduced',inputState:{a:1},options:{voltageRms:1,distanceM:1},rows:[{available:true,frequencyHz:100,splDb:90,phaseDeg:0},{available:true,frequencyHz:200,splDb:91,phaseDeg:10}]});assert.equal(model.basis,'simulated');assert.equal(model.reference.phasePreserved,true);assert.throws(()=>C.normalize({...model,basis:'measured'}),/remain labelled simulated/);
 assert.throws(()=>C.fromBroadband({available:true,rows:[{available:false}]}),/complete broadband/);
});
test('bounded optimization recovers the known gain/polarity alignment with explicit target',()=>{
 const a=flat(),b=flat(94,180),r=C.optimize(a,b,{filter:'LR4',fcHz:700,phaseWeight:.02},{fcLowHz:600,fcHighHz:800,gainLowDb:-6,gainHighDb:-2,delayLowMs:0,delayHighMs:0,steps:3});near(r.best.metrics.rmsErrorDb,0);assert.equal(r.best.options.gainHighDb,-4);assert.equal(r.best.options.polarityHigh,-1);assert.equal(r.evaluated,54);assert.ok(r.best.sources[0].reference);assert.ok(r.improvement>0);
 assert.throws(()=>C.optimize(a,b,{}, {steps:50}),/2–12/);assert.throws(()=>C.optimize(a,b,{}, {delayLowMs:-1}),/Delay/);
});
test('A/B keeps level calibration and reports only bracketed angular coverage',()=>{
 const a=flat(),b=flat(87);a.rows=[-45,-30,-15,0,15,30,45].flatMap(angle=>a.rows.map(r=>({...r,angle,db:90-Math.abs(angle)/5})));b.rows=[-45,-30,-15,0,15,30,45].flatMap(angle=>b.rows.map(r=>({...r,angle,db:87-Math.abs(angle)/5})));const r=C.compare(a,b,{lowHz:200,highHz:2000,polarHz:1000});near(r.metrics.meanDeltaDb,3);near(r.metrics.aBeamwidth.widthDeg,60);near(r.metrics.bBeamwidth.widthDeg,60);assert.ok(r.polar.every(x=>Math.abs(x.aNormalizedDb-x.bNormalizedDb)<1e-7));
 const q=structuredClone(b);q.reference.calibration='different';assert.equal(C.compare(a,q).gate.allowed,false);assert.deepEqual(C.compare(a,q).rows,[]);
 assert.equal(C.beamwidth([{angle:-30,normalizedDb:-6},{angle:0,normalizedDb:0},{angle:30,normalizedDb:-6}]),null);
 assert.equal(C.beamwidth([{angle:-15,normalizedDb:-2},{angle:0,normalizedDb:0},{angle:15,normalizedDb:-2}]),null);
});
test('CSV results and protocol preserve scientific scope and no false maximum-output claim',()=>{
 const r=C.sum(flat(),flat());const csv=C.resultCSV(r);assert.match(csv,/# meh_study=/);assert.match(csv,/phaseDifferenceDeg/);assert.match(csv,/synthetic/);assert.match(C.measurementProtocol(),/equal-voltage, not equal-power/);assert.equal(C.template().basis,'unspecified');assert.equal(C.referenceGate(C.template(),C.template()).allowed,false);
});
