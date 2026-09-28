const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {context:c,html,scripts}=require('./load-editor.cjs')();
const M=c.MEH,A=c.MEHAcoustics,F=c.MEHFrontStudyCore;
const editor=scripts[11];
function between(start,end){const i=editor.indexOf(start);return editor.slice(i,editor.indexOf(end,i));}
const seed=editor.match(/const starter=(.*);\nfor\(let/)[1];
const starter=vm.runInContext(`(()=>{const M=MEH;${between('function seedRearLayout(','function driverLabel(')};return ${seed};})()`,c);
const study={tubeStepMM:3,volumeStepPercent:10,matchLC:false};
const options={hornLoad:'webster',voltageRms:1,endCorrection:1.4,fmin:200,fmax:700,points:17,sensitivity:false,density:1.204,loadFactor:1,mouthTermination:'baffled',throatTermination:'closed',rearLossQ:7,rearEndCorrectionScale:1};
const plain=value=>JSON.parse(JSON.stringify(value));
function near(actual,expected,relative=1e-8,absolute=1e-10,message=''){
 assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),`${message}: finite ${actual}, ${expected}`);
 assert.ok(Math.abs(actual-expected)<=Math.max(absolute,relative*Math.abs(expected)),`${message}: ${actual} != ${expected}`);
}
function geometry(patch={}){return M.analyze({...starter,...patch});}
function compare(patch={},changes={},opts={}){assert.ok(F,'MEHFrontStudyCore must be embedded in the offline editor');return F.compare(geometry(patch),{...study,...changes},{...options,...opts});}
function current(r){return r.cases.find(x=>x.id==='current');}
function availableCases(r){return r.cases.filter(x=>x.result?.available&&x.rows?.length);}
function assertNoCurves(r){for(const item of r.cases){assert.ok(!item.rows?.length,item.id);assert.ok(!item.result?.available,item.id);assert.ok(item.reason||r.reason,`${item.id}: a withheld curve needs its reason`);}}
function withAcousticSpy(run){
 const calls=[],original=A.analyze;
 A.analyze=function(a,o){calls.push({analysis:a,options:plain(o)});return original.call(A,a,o);};
 try{return run(calls);}finally{A.analyze=original;}
}

test('front study is embedded in the same self-contained 14-script offline editor',()=>{
 assert.equal(scripts.length,14);
 assert.equal(scripts.filter(s=>/root\.MEHFrontStudyCore\s*=/.test(s)).length,1);
 assert.ok(!/<script[^>]+\bsrc\s*=/i.test(html));
 for(const key of ['diagnostics','variants','compare','csv','phaseDelta','integrateAxialInertance'])assert.equal(typeof F?.[key],'function',key);
});

test('nearby alternatives achieve actual cavity targets and change only entry length and standoff',()=>{
 const a=geometry(),before=JSON.stringify(a),inputStudy={...study},inputOptions={...options};
 const studyBefore=JSON.stringify(inputStudy),optionsBefore=JSON.stringify(inputOptions),r=F.compare(a,inputStudy,inputOptions);
 assert.equal(JSON.stringify(a),before,'analysis and source state are immutable inputs');
 assert.equal(JSON.stringify(inputStudy),studyBefore);assert.equal(JSON.stringify(inputOptions),optionsBefore);
 assert.deepEqual(Array.from(r.cases,x=>x.id),['current','shorter','longer']);
 assert.equal(availableCases(r).length,3,r.cases.map(x=>x.reason).join('; '));
 for(const item of r.cases){
  assert.ok(item.analysis,item.reason);
  const checked=M.analyze(item.analysis.p);
  near(item.analysis.frontCavityV,checked.frontCavityV,1e-9,1e-7,'reported cavity is reanalyzed geometry');
  near(checked.frontCavityV,item.targetCavityCM3,1e-6,1e-5,'requested target is achieved');
  for(const key of Object.keys(a.p))if(!['neck','gap'].includes(key))assert.deepEqual(plain(item.analysis.p[key]),plain(a.p[key]),`${item.id}: fixed ${key}`);
  assert.ok(item.analysis.p.neck>=M.specs.neck[0]&&item.analysis.p.neck<=M.specs.neck[1]);
  assert.ok(item.analysis.p.gap>=M.specs.gap[0]&&item.analysis.p.gap<=M.specs.gap[1]);
  near(checked.frontV,checked.frontCavityV+checked.neckV,1e-10,1e-8);
 }
 near(r.cases[1].analysis.p.neck,a.p.neck-study.tubeStepMM);
 near(r.cases[2].analysis.p.neck,a.p.neck+study.tubeStepMM);
 near(r.cases[1].targetCavityCM3,a.frontCavityV*1.1);
 near(r.cases[2].targetCavityCM3,a.frontCavityV*.9);
});

test('unattainable cavity target remains a rejected row with its original target and limit reason',()=>{
 const a=geometry({gap:M.specs.gap[1]}),r=F.compare(a,study,options),shorter=r.cases.find(x=>x.id==='shorter');
 assert.ok(shorter);assert.equal(shorter.analysis,null);assert.ok(shorter.reason.length>10);
 assert.match(shorter.reason,/volume|cavity|gap|standoff|range|attain|bound/i);
 near(shorter.targetCavityCM3,a.frontCavityV*1.1);
 assert.ok(!shorter.rows?.length);assert.ok(!shorter.result?.available);
 assert.ok(current(r).analysis,'valid current design remains visible');
});

test('entry-length bounds do not masquerade as achieved nearby alternatives',()=>{
 for(const [neck,id] of [[M.specs.neck[0],'shorter'],[M.specs.neck[1],'longer']]){
  const a=geometry({neck,gap:neck+20}),r=F.compare(a,study,options),blocked=r.cases.find(x=>x.id===id);
  assert.ok(blocked);assert.equal(blocked.analysis,null);assert.match(blocked.reason,/bound|length|tube|range|same/i);assert.ok(!blocked.rows?.length);
  for(const item of r.cases.filter(x=>x.analysis)){
   assert.ok(item.analysis.p.neck>=M.specs.neck[0]&&item.analysis.p.neck<=M.specs.neck[1]);
   assert.ok(item.analysis.p.gap>=M.specs.gap[0]&&item.analysis.p.gap<=M.specs.gap[1]);
  }
 }
});

test('a positive target below the fixed cone and mounting-land air cannot fabricate a collector',()=>{
 const r=compare({}, {volumeStepPercent:90}),longer=r.cases.find(x=>x.id==='longer');
 assert.ok(longer.targetCavityCM3>0);assert.equal(longer.analysis,null);
 assert.match(longer.reason,/transition|volume|collector/i);assert.ok(!longer.rows?.length);
});

test('matching the bare LC scale uses the selected end correction and preserves distinct loaded responses',()=>{
 for(const endCorrection of [0,1.4,2]){
  const r=compare({}, {matchLC:true},{endCorrection}),cases=availableCases(r),base=current(r);
  assert.equal(cases.length,3,r.cases.map(x=>x.reason).join('; '));
  for(const item of cases){
   near(item.diagnostics.lcHz,base.diagnostics.lcHz,2e-6,1e-5,'matched LC');
   near(item.analysis.frontCavityV,item.targetCavityCM3,1e-6,1e-5);
  }
  assert.ok(cases.slice(1).some(item=>item.rows.some((row,i)=>Math.abs(row.impedanceOhm-base.rows[i].impedanceOhm)>.001)),'equal LC does not imply equal electrical load');
  assert.ok(cases.slice(1).some(item=>item.rows.some((row,i)=>Math.abs(row.comparisonDb-base.rows[i].comparisonDb)>.001)),'equal LC does not imply equal response');
 }
});

test('matched-LC alternatives ignore an unused invalid volume-change input',()=>{
 const normal=compare({}, {matchLC:true}),unused=compare({}, {matchLC:true,volumeStepPercent:NaN});
 assert.equal(availableCases(unused).length,3,unused.reason);
 for(let i=0;i<normal.cases.length;i++){
  near(unused.cases[i].analysis.frontCavityV,normal.cases[i].analysis.frontCavityV);
  near(unused.cases[i].analysis.p.gap,normal.cases[i].analysis.p.gap);
  near(unused.cases[i].diagnostics.lcHz,normal.cases[i].diagnostics.lcHz);
 }
});

test('all comparison curves use the current design reference and preserve real level differences',()=>{
 for(const hornLoad of ['webster','resistive']){
  const r=compare({}, {},{hornLoad}),cases=availableCases(r),base=current(r),field=hornLoad==='webster'?'hornMouthFlowPerVoltM3s':'flowPerVoltM3s';
  const reference=Math.max(...base.result.rows.map(row=>row[field]));near(r.normalizationFlow,reference);
  for(const item of cases)for(let i=0;i<item.rows.length;i++){
   const row=item.rows[i],expected=20*Math.log10(item.result.rows[i][field]/reference);
   near(row.comparisonDb,expected,1e-8,1e-8,`${item.id}: common reference`);
  }
  near(Math.max(...base.rows.map(x=>x.comparisonDb)),0,1e-8,1e-8);
  assert.ok(cases.slice(1).some(item=>Math.abs(Math.max(...item.rows.map(x=>x.comparisonDb)))>1e-4),'candidate curves must not each be normalized to zero');
  for(const row of base.rows)if(row.phaseDeltaDeg!==null)near(row.phaseDeltaDeg,0,1e-8,1e-8);
 }
});

test('half and double positive RMS drive scale motion, flow and power but not impedance or phase',()=>{
 const low=compare({}, {},{voltageRms:.5}),high=compare({}, {},{voltageRms:2});
 for(const item of availableCases(low)){
  const other=high.cases.find(x=>x.id===item.id);assert.ok(other.result?.available,other.reason);
  for(let i=0;i<item.rows.length;i++){
   const a=item.rows[i],b=other.rows[i];
   for(const field of ['flowRmsM3s','hornMouthFlowRmsM3s','excursionPeakMM','neckVelocityPeakMS','chamberPressureRmsPa'])near(b[field],4*a[field],1e-7,1e-10,field);
   for(const field of ['coilPowerW','inputPowerW','hornMouthRadiatedPowerW'])near(b[field],16*a[field],1e-7,1e-10,field);
   for(const field of ['impedanceOhm','impedancePhaseDeg','hornMouthFlowPhaseDeg','flowPerVoltM3s','hornMouthFlowPerVoltM3s','comparisonDb'])near(b[field],a[field],1e-7,1e-9,field);
   if(a.phaseDeltaDeg!==null)near(b.phaseDeltaDeg,a.phaseDeltaDeg,1e-7,1e-8);
  }
 }
});

test('both insert modes remain diagnostics-only without calling acoustic analysis',()=>{
 for(const frontFiller of ['annular','offset'])withAcousticSpy(calls=>{
  const r=compare({frontFiller,offset:0});assert.equal(calls.length,0,frontFiller);assertNoCurves(r);
  for(const item of r.cases.filter(x=>x.analysis)){
   assert.equal(item.geometryReason,'','valid insert geometry remains applicable despite its acoustic rejection');
   assert.equal(item.diagnostics.lcHz,null);assert.equal(item.diagnostics.lcLowHz,null);assert.equal(item.diagnostics.lcHighHz,null);
   assert.ok(Number.isFinite(item.diagnostics.cavityCM3));
  }
  assert.equal(A.availability(geometry({frontFiller})).available,false,'study cannot unlock the existing acoustic screen');
 });
});

test('custom motor data and invalid entry geometry clear acoustic rows before any sweep',()=>{
 for(const patch of [{midDriver:'custom'},{sd:starter.sd+1},{offset:100},{gap:15}])withAcousticSpy(calls=>{
  const r=compare(patch);assert.equal(calls.length,0,JSON.stringify(patch));assertNoCurves(r);
 });
});

test('invalid drive, comparison inputs and frequency ranges fail before acoustic sweeps',()=>{
 for(const opts of [{voltageRms:0},{voltageRms:-1},{voltageRms:NaN},{density:0},{endCorrection:-1},{points:1},{fmin:700,fmax:200}])withAcousticSpy(calls=>{
  const r=compare({}, {},opts);assert.equal(calls.length,0,JSON.stringify(opts));assertNoCurves(r);
 });
 for(const change of [{tubeStepMM:0},{tubeStepMM:NaN},{volumeStepPercent:0},{volumeStepPercent:100},{matchLC:'yes'}])withAcousticSpy(calls=>{
  const r=compare({},change);assert.equal(calls.length,0,JSON.stringify(change));assertNoCurves(r);
 });
});

test('a failed or nonfinite acoustic sweep cannot leave a partial or stale comparison curve',()=>{
 assert.equal(availableCases(compare()).length,3);
 const original=A.analyze;
 try{
  A.analyze=()=>({available:false,reason:'Deliberate missing acoustic result'});
  const failed=compare();assertNoCurves(failed);assert.match(failed.reason,/missing acoustic/);
  A.analyze=(a,o)=>{const result=original.call(A,a,o);if(result.available)result.rows[0].frequency=NaN;return result;};
  const bad=compare();assertNoCurves(bad);assert.match(bad.reason,/nonfinite|nonphysical/);
 }finally{A.analyze=original;}
 assert.equal(availableCases(compare()).length,3,'recovered calculation has fresh complete rows');
});

test('failure or zero normalization in the current baseline invalidates every acoustic result',()=>{
 const original=A.analyze;
 try{
  for(const failure of ['failed','zero']){
   let candidateSweeps=0;
   A.analyze=(a,o)=>{
    if(a.p.neck===starter.neck&&failure==='failed')return {available:false,reason:'Deliberate current-only failure'};
    const result=original.call(A,a,o);
    if(a.p.neck!==starter.neck)candidateSweeps++;
    else if(result.available)for(const row of result.rows){row.hornMouthFlowPerVoltM3s=0;row.hornMouthFlowComplex={r:0,i:0};}
    return result;
   };
   const result=compare();assert.ok(candidateSweeps>=2,'candidate acoustic solves themselves succeed');
   assertNoCurves(result);assert.equal(result.normalizationFlow,null);
   assert.match(result.reason,/current|baseline/i);
   assert.ok(!F.csv(result).includes(',modeled,'),'CSV cannot claim a modeled comparison without a valid baseline');
   for(const item of result.cases)if(item.analysis)assert.equal(item.geometryReason,'','acoustic failure does not invalidate otherwise usable geometry');
  }
 }finally{A.analyze=original;}
});

test('every nominal case keeps identical driver, drive, horn boundary and sweep assumptions',()=>withAcousticSpy(calls=>{
 const opts={...options,voltageRms:2.83,endCorrection:1.7,density:1.18,loadFactor:.8,rearLossQ:9,rearEndCorrectionScale:.9,mouthTermination:'matched',throatTermination:'matched'},r=F.compare(geometry(),study,opts);
 assert.ok(calls.length>=3);assert.equal(availableCases(r).length,3);
 for(const item of availableCases(r)){
  assert.equal(item.result.options.driverId,starter.midDriver);
  for(const [key,value]of Object.entries(opts))assert.equal(item.result.options[key],value,`${item.id}: ${key}`);
  assert.deepEqual(Array.from(item.rows,x=>x.frequency),Array.from(current(r).rows,x=>x.frequency));
 }
}));

test('reported SI compliance and tube inertance use cavity-only volume, polygon area and physical allowance',()=>{
 const a=geometry(),d=F.diagnostics(a,options),area=a.collectorSmallArea*1e-6,rho=options.density,c0=a.p.soundSpeed;
 near(d.physicalTubeMM,a.p.neck+3);
 near(d.cavityCM3,a.frontCavityV);near(d.totalCM3,a.frontV);near(d.tubeAirCM3,a.neckV);
 near(d.tubeAirCM3,a.collectorSmallArea*(a.p.neck+3)/1000);
 near(d.totalCM3,d.cavityCM3+d.tubeAirCM3);
 near(d.endCorrectionMM,options.endCorrection*Math.sqrt(area/Math.PI)*1000);
 near(d.effectiveTubeMM,d.physicalTubeMM+d.endCorrectionMM);
 near(d.tubeInertance,rho*d.effectiveTubeMM*.001/area);
 near(d.cavityCompliance,a.frontCavityV*1e-6/(rho*c0*c0),1e-9,1e-18);
 near(d.lcHz,1/(2*Math.PI*Math.sqrt(d.tubeInertance*d.cavityCompliance)));
 const dense=F.diagnostics(a,{...options,density:2*rho});near(dense.tubeInertance,2*d.tubeInertance);near(dense.cavityCompliance,d.cavityCompliance/2,1e-9,1e-18);near(dense.lcHz,d.lcHz);
});

function square(width,offset=0){const h=width/2;return [[offset-h,-h],[offset+h,-h],[offset+h,h],[offset-h,h]];}
function stations(n,widthAt,offsetAt=()=>0,length=20){return Array.from({length:n+1},(_,i)=>({zMM:length*i/n,uv:square(widthAt(i/n),offsetAt(i/n))}));}
function simpson(f,n=8192){let sum=f(0)+f(1);for(let i=1;i<n;i++)sum+=(i%2?4:2)*f(i/n);return sum/(3*n);}
test('axial inertance equals rho L/A for a duct and obeys length/area scaling',()=>{
 const rho=1.204,base=F.integrateAxialInertance(stations(4,()=>10),rho);
 near(base,rho*.020/.0001);
 near(F.integrateAxialInertance(stations(4,()=>10,()=>0,40),rho),base*2);
 near(F.integrateAxialInertance(stations(4,()=>20),rho),base/4);
 near(F.integrateAxialInertance(stations(4,()=>10,t=>30*t),rho),base,1e-9,1e-9,'axial proxy does not invent offset path physics');
});

test('smooth collector integration converges against independent high-resolution quadrature',()=>{
 const rho=1.204,width=t=>10+20*(3*t*t-2*t*t*t),truth=rho*.020*simpson(t=>1/(width(t)*width(t)*1e-6));
 const errors=[4,8,16,32].map(n=>Math.abs(F.integrateAxialInertance(stations(n,width),rho)-truth));
 assert.ok(errors[3]<errors[0]/8,JSON.stringify(errors));
 assert.ok(errors[3]/truth<.002,`fine quadrature error ${errors[3]/truth}`);
 for(const bad of [[],[{zMM:0,uv:square(10)}],stations(2,()=>0),[{zMM:10,uv:square(10)},{zMM:0,uv:square(10)}],[{zMM:0,uv:square(10)},{zMM:NaN,uv:square(10)}]])assert.equal(F.integrateAxialInertance(bad,rho),null);
});

test('phase differences wrap correctly and do not create a phase at a zero-flow sample',()=>{
 const z=degrees=>({r:Math.cos(degrees*Math.PI/180),i:Math.sin(degrees*Math.PI/180)});
 near(F.phaseDelta(z(-179),z(179)),2,1e-8,1e-8);
 near(F.phaseDelta(z(179),z(-179)),-2,1e-8,1e-8);
 assert.equal(F.phaseDelta({r:0,i:0},z(1)),null);
 assert.equal(F.phaseDelta(z(1),{r:0,i:0}),null);
 assert.equal(F.phaseDelta({r:1e-20,i:0},z(1),1e-12),null);
});

test('all returned plot samples are finite and source acoustic rows remain untouched',()=>withAcousticSpy(calls=>{
 const r=compare();
 for(const item of availableCases(r))for(const row of item.rows){
  for(const [key,value]of Object.entries(row)){
   if(typeof value==='number')assert.ok(Number.isFinite(value),`${item.id} ${row.frequency} ${key}`);
   else if(value&&typeof value==='object'&&'r'in value&&'i'in value)assert.ok(Number.isFinite(value.r)&&Number.isFinite(value.i),key);
  }
  assert.ok(row.phaseDeltaDeg===null||Math.abs(row.phaseDeltaDeg)<=180+1e-7);
 }
 for(const item of availableCases(r))for(const row of item.result.rows){assert.ok(!Object.hasOwn(row,'comparisonDb'));assert.ok(!Object.hasOwn(row,'phaseDeltaDeg'));}
 assert.ok(calls.length>=3);
}));

test('CSV carries actual comparison values and explicit withheld cases',()=>{
 const r=compare(),csv=F.csv(r);
 assert.equal(typeof csv,'string');assert.ok(csv.length>100);assert.match(csv,/frequency/i);assert.match(csv,/comparisonDb|common.*dB/i);
 for(const item of r.cases)assert.ok(csv.includes(item.id),item.id);
 const unavailable=compare({frontFiller:'offset'}),blocked=F.csv(unavailable);
 assert.ok(blocked.includes('offset')||/insert|geometry/i.test(blocked));
 assert.ok(!/\b(?:NaN|Infinity)\b/.test(csv));
});

function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(char==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(char===','&&!quoted){row.push(field);field='';}
  else if(char==='\n'&&!quoted){row.push(field);rows.push(row);row=[];field='';}
  else field+=char;
 }
 if(field||row.length){row.push(field);rows.push(row);}assert.equal(quoted,false,'closed CSV quotes');return rows;
}

test('CSV metadata reconstructs the geometry and numerical comparison without sharing mutable input state',()=>{
 const input=geometry(),settings={...study,tubeStepMM:2,volumeStepPercent:12},opts={...options,endCorrection:1.7,voltageRms:2.83};
 const result=F.compare(input,settings,opts),metadata=new Map(parseCSV(F.csv(result)).filter(row=>row[0].startsWith('#')).map(row=>[row[0],row[1]]));
 const exportedState=JSON.parse(metadata.get('# baseline_state')),exportedSettings=JSON.parse(metadata.get('# study_settings')),exportedOptions=JSON.parse(metadata.get('# options'));
 assert.deepEqual(exportedState,plain(input.p));assert.deepEqual(exportedSettings,settings);assert.deepEqual(exportedOptions,plain(result.options));
 const restored=F.compare(M.analyze(exportedState),exportedSettings,exportedOptions);
 near(restored.normalizationFlow,result.normalizationFlow);
 for(let i=0;i<result.cases.length;i++){
  const before=result.cases[i],after=restored.cases[i];
  assert.equal(after.reason,before.reason);near(after.analysis.p.neck,before.analysis.p.neck);near(after.analysis.p.gap,before.analysis.p.gap);
  near(after.analysis.frontCavityV,before.analysis.frontCavityV);
  for(let j=0;j<before.rows.length;j++){near(after.rows[j].comparisonDb,before.rows[j].comparisonDb);near(after.rows[j].excursionPeakMM,before.rows[j].excursionPeakMM);}
 }
 input.p.neck=29;settings.tubeStepMM=9;opts.voltageRms=50;
 assert.equal(result.baselineState.neck,starter.neck);assert.equal(result.studySettings.tubeStepMM,2);assert.equal(result.options.voltageRms,2.83);
 result.baselineState.offset=17;assert.equal(input.p.offset,starter.offset,'export snapshot cannot mutate the source geometry');
});
