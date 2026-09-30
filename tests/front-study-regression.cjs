const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {context:c,html,scripts}=require('./load-editor.cjs')();
const M=c.MEH,A=c.MEHAcoustics,F=c.MEHFrontStudyCore;
const editor=scripts[11];
function between(start,end){const i=editor.indexOf(start);return editor.slice(i,editor.indexOf(end,i));}
const seed=editor.match(/const starter=(.*);\nfor\(let/)[1];
// Hold the shared rear fixture fixed while exercising front passage variations.
const starter=vm.runInContext(`(()=>{const M=MEH;${between('function seedRearLayout(','function driverLabel(')};return seedRearLayout('shared',${seed});})()`,c);
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

test('insert alternatives attain actual cavity targets across openings and offsets without changing fixed inputs',()=>withAcousticSpy(calls=>{
 let accepted=0,rejected=0;
 for(const frontFiller of ['annular','offset'])for(const offset of [0,20,35])for(const fillerOpening of [30,70,100]){
  const a=geometry({frontFiller,offset,fillerOpening}),before=JSON.stringify(a),r=F.compare(a,study,options),label=`${frontFiller}/${offset}/${fillerOpening}`;
  assertNoCurves(r);assert.equal(JSON.stringify(a),before,`${label}: inputs are immutable`);
  if(!a.frontFiller.available){
   rejected++;assert.ok(current(r).geometryReason,`${label}: unavailable insert retains geometry reason`);
   for(const item of r.cases.slice(1)){assert.equal(item.analysis,null);assert.ok(item.geometryReason,item.id);}
   continue;
  }
  accepted++;
  // Measure the cavity slope independently by changing only standoff. This
  // catches using the full driver cutout instead of the active insert outlet.
  const slope=M.analyze({...a.p,gap:a.p.gap+1}).frontCavityV-a.frontCavityV;
  assert.ok(slope>0,label);
  const open=M.analyze({...a.p,frontFiller:'none'}),openSlope=M.analyze({...open.p,gap:open.p.gap+1}).frontCavityV-open.frontCavityV;
  assert.ok(slope<openSlope*.95,`${label}: fixture distinguishes active and open collectors`);
  for(const [i,item]of r.cases.entries()){
   assert.ok(item.analysis,`${label}/${item.id}: ${item.reason}`);assert.equal(item.geometryReason,'',`${label}/${item.id}`);
   const checked=M.analyze(item.analysis.p),target=a.frontCavityV*(i===1?1.1:i===2?.9:1);
   near(checked.frontCavityV,target,1e-7,1e-6,`${label}/${item.id}: actual target`);
   near(item.targetCavityCM3,target);near(item.diagnostics.cavityCM3,target,1e-7,1e-6);
   near(checked.p.gap,a.p.gap+(checked.p.neck-a.p.neck)+(target-a.frontCavityV)/slope,1e-8,1e-7,`${label}: measured volume slope`);
   for(const key of Object.keys(a.p))if(!['neck','gap'].includes(key))assert.deepEqual(plain(checked.p[key]),plain(a.p[key]),`${label}/${item.id}: fixed ${key}`);
   near(checked.frontV,checked.frontCavityV+checked.neckV);
   near(checked.neckV,checked.collectorSmallArea*(checked.p.neck+3)/1000);
   near(checked.frontCavityV,checked.collectorLoftV+6*checked.collectorLargeArea/1000+checked.coneV-checked.frontFiller.volumeCM3);
   assert.equal(item.diagnostics.lcHz,null);assert.equal(item.diagnostics.lcLowHz,null);assert.equal(item.diagnostics.lcHighHz,null);
  }
 }
 assert.ok(accepted>=12,`meaningful valid coverage: ${accepted}`);assert.ok(rejected>=3,`invalid aperture coverage: ${rejected}`);
 assert.equal(calls.length,0,'even valid geometry alternatives must not invoke the acoustic model');
}));

test('nonround inserted alternatives use their corresponding actual passage and keep LC matching unavailable',()=>withAcousticSpy(calls=>{
 for(const frontFiller of ['annular','offset'])for(const shape of ['slot','teardrop']){
  const a=geometry({frontFiller,shape,slotL:55,slotW:25,slotAngle:45,offset:30,gap:42,fillerOpening:30}),r=F.compare(a,study,options);
  assert.ok(a.frontFiller.available,`${frontFiller}/${shape}`);assertNoCurves(r);
  for(const item of r.cases){
   assert.ok(item.analysis,item.reason);assert.equal(item.geometryReason,'');
   near(M.analyze(item.analysis.p).frontCavityV,item.targetCavityCM3,1e-7,1e-6);
   for(const key of Object.keys(a.p))if(!['neck','gap'].includes(key))assert.deepEqual(plain(item.analysis.p[key]),plain(a.p[key]),`${frontFiller}/${shape}: ${key}`);
   assert.deepEqual(plain(item.analysis.collectorSections.at(-1).uv),plain(item.analysis.collectorOutletUV));
   near(item.diagnostics.collectorInertance,F.integrateAxialInertance(item.analysis.collectorSections,options.density));
  }
  const matched=F.compare(a,{...study,matchLC:true},options);assertNoCurves(matched);
  for(const item of matched.cases.slice(1)){assert.equal(item.analysis,null);assert.match(item.reason,/Matched LC.*unavailable/i);}
 }
 assert.equal(calls.length,0);
}));

test('insert passage-area SVG follows the actual aperture and excludes the full mounting land',()=>{
 for(const frontFiller of ['annular','offset'])for(const shape of ['round','teardrop']){
  const a=geometry({frontFiller,shape,slotL:55,slotW:25,slotAngle:45,offset:20,fillerOpening:30,gap:42}),d=F.diagnostics(a,options);
  assert.ok(a.frontFiller.available);
  const aperture=frontFiller==='offset'?a.frontFiller.openingUV:a.collectorLargeUV.map(([u,v])=>{const scale=a.frontFiller.innerR/Math.hypot(u,v);return [u*scale,v*scale];});
  const outletArea=M.polygonArea(aperture)/100,sections=a.collectorSections;
  near(M.polygonArea(sections.at(-1).uv)/100,outletArea,1e-8,1e-8,'actual aperture area at plot endpoint');
  assert.ok(outletArea<a.collectorLargeArea/100*.8,'fixture separates insert aperture from full cutout');
  const result={cases:[{label:'Current',analysis:a,diagnostics:d,rows:[]}]},svg=c.MEHFrontStudyPanel.plotSVG(result,'area',720);
  assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.match(svg,/cone-facing gap excluded/);
  const path=svg.match(/<path d="([^"]*)" fill="none"/)[1],points=[...path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m=>[+m[1],+m[2]]);
  const values=[{x:0,y:a.collectorSmallArea/100},{x:a.p.neck+3,y:a.collectorSmallArea/100},...sections.map(s=>({x:a.p.neck+3+s.zMM,y:M.polygonArea(s.uv)/100}))];
  const maxX=a.p.neck+3+a.collectorLoftLength,maxY=Math.max(...values.map(p=>p.y))*1.06;
  assert.equal(points.length,values.length);
  for(let i=0;i<values.length;i++){
   near(points[i][0],63+values[i].x/maxX*(700-63),0,.0051,'axial plot coordinate');
   near(points[i][1],203-values[i].y/maxY*(203-25),0,.0051,'actual section area coordinate');
  }
  near(values.at(-1).x,a.p.gap-6);near(values.at(-1).y,outletArea,1e-8,1e-8);
  // The plotted passage cannot silently substitute the larger mounting rim.
  const changed={...a,collectorLargeUV:a.collectorLargeUV.map(([u,v])=>[u*2,v*2]),collectorLargeArea:a.collectorLargeArea*4};
  assert.equal(c.MEHFrontStudyPanel.plotSVG({cases:[{...result.cases[0],analysis:changed}]},'area',720),svg);
 }
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

test('target bare LC sizes actual cavities at three tube lengths without equating their loaded responses',()=>{
 const a=geometry(),before=JSON.stringify(a),r=F.compare(a,{...study,targetLCHz:550,volumeStepPercent:NaN,bandLowHz:200,bandHighHz:700,crossoverHz:650},{...options,fmin:100,fmax:1000,points:65});
 assert.equal(JSON.stringify(a),before);assert.equal(r.cases.length,4);assert.equal(availableCases(r).length,4,r.cases.map(c=>c.reason).join('; '));
 for(const item of r.cases.slice(1)){
  const checked=M.analyze(item.analysis.p);near(F.diagnostics(checked,options).lcHz,550,1e-7,1e-7);near(checked.frontCavityV,item.targetCavityCM3,1e-7,1e-7);
  for(const key of Object.keys(a.p))if(!['neck','gap'].includes(key))assert.deepEqual(plain(checked.p[key]),plain(a.p[key]),key);
  assert.equal(M.mechanicalFitReasons(checked).length,0);assert.equal(item.context.bandCovered,true);assert.equal(item.context.bandAboveReference,true);
 }
 assert.equal(r.cases[1].analysis.p.neck,a.p.neck);assert.equal(r.cases[2].analysis.p.neck,a.p.neck-study.tubeStepMM);assert.equal(r.cases[3].analysis.p.neck,a.p.neck+study.tubeStepMM);
 const left=r.cases[2],right=r.cases[3];
 assert.ok(left.rows.some((v,i)=>Math.abs(v.comparisonDb-right.rows[i].comparisonDb)>.1));
 assert.ok(left.rows.some((v,i)=>Math.abs(v.phaseDeltaDeg-right.rows[i].phaseDeltaDeg)>1));
 assert.ok(left.rows.some((v,i)=>Math.abs(v.impedanceOhm-right.rows[i].impedanceOhm)>.01));
 assert.ok(Math.abs(left.context.sampledMaximumHz-550)>10,'loaded sampled maximum must not be relabeled as the target reference');
});

test('target sizing honors physical bounds and keeps rejected target volumes inspectable',()=>{
 for(const targetLCHz of [300,900]){
  const r=compare({}, {targetLCHz});assert.equal(current(r).result.available,true);
  for(const item of r.cases.slice(1)){assert.equal(item.analysis,null);assert.ok(item.targetCavityCM3>0);assert.match(item.reason,/standoff|transition/);assert.equal(item.rows.length,0);}
 }
 const r=compare({neck:M.specs.neck[0]}, {targetLCHz:600});
 assert.equal(r.cases.find(c=>c.id==='shorter').analysis,null);assert.match(r.cases.find(c=>c.id==='shorter').reason,/bound/);
 assert.ok(r.cases.find(c=>c.id==='target').analysis,'a same-tube cavity target remains available at a tube bound');
});

test('target LC retains insert and motor gates and invalid target/context never starts a sweep',()=>{
 for(const frontFiller of ['annular','offset'])withAcousticSpy(calls=>{
  const r=compare({frontFiller},{targetLCHz:550});assertNoCurves(r);assert.equal(calls.length,0);
  for(const item of r.cases.slice(1)){assert.equal(item.analysis,null);assert.match(item.reason,/Target LC.*unavailable/);}
 });
 withAcousticSpy(calls=>{const r=compare({midDriver:'custom'},{targetLCHz:550});assertNoCurves(r);assert.equal(calls.length,0);assert.ok(r.cases.some(c=>c.analysis));});
 for(const input of [{targetLCHz:0},{targetLCHz:Infinity},{targetLCHz:NaN},{targetLCHz:550,matchLC:true},{bandLowHz:700,bandHighHz:200},{bandLowHz:900},{bandHighHz:0},{crossoverHz:NaN},{crossoverHz:-1}])withAcousticSpy(calls=>{const r=compare({},input);assertNoCurves(r);assert.equal(calls.length,0,JSON.stringify(input));});
});

test('band and crossover are context only, with missing/incomplete samples explicitly withheld',()=>{
 const opts={...options,fmin:100,fmax:1000,points:33},a=geometry(),r=F.compare(a,{...study,bandLowHz:200,bandHighHz:700,crossoverHz:650},opts),unchanged=F.compare(a,study,opts);
 for(let i=0;i<r.cases.length;i++){
  const item=r.cases[i],b=item.context;assert.equal(JSON.stringify(item.analysis.p),JSON.stringify(unchanged.cases[i].analysis.p));
  assert.equal(JSON.stringify(item.rows),JSON.stringify(unchanged.cases[i].rows),'context must not filter or recalculate the circuit');
  const rows=item.rows.filter(row=>row.frequency>=200&&row.frequency<=700),lo=Math.min(...rows.map(x=>x.comparisonDb)),hi=Math.max(...rows.map(x=>x.comparisonDb));
  near(b.sampledVariationDb,hi-lo);assert.equal(b.sampleCount,rows.length);
  const nearest=item.rows.reduce((best,row)=>Math.abs(Math.log(row.frequency/650))<Math.abs(Math.log(best.frequency/650))?row:best,item.rows[0]);
  assert.equal(b.crossoverSampleHz,nearest.frequency);assert.equal(b.crossoverComparisonDb,nearest.comparisonDb);assert.equal(b.crossoverPhaseDeltaDeg,nearest.phaseDeltaDeg);assert.notEqual(b.crossoverSampleHz,650);
 }
 const partial=F.compare(a,{...study,bandLowHz:50,bandHighHz:700,crossoverHz:1500},opts).cases[0].context;
 assert.equal(partial.bandCovered,false);assert.equal(partial.sampledVariationDb,null);assert.equal(partial.crossoverSampleHz,null);assert.equal(partial.crossoverPhaseDeltaDeg,null);
 const tiny=F.compare(a,{...study,bandLowHz:500,bandHighHz:500.01},opts).cases[0].context;assert.equal(tiny.sampledVariationDb,null);
 const nullFlow=F.contextSummary([{frequency:100,comparisonDb:null,phaseDeltaDeg:null},{frequency:200,comparisonDb:-1,phaseDeltaDeg:0}],{bandLowHz:100,bandHighHz:200,crossoverHz:100},150);
 assert.equal(nullFlow.sampledVariationDb,null);assert.equal(nullFlow.crossoverComparisonDb,null);assert.equal(nullFlow.crossoverPhaseDeltaDeg,null);
 const middleNull=F.contextSummary([{frequency:100,comparisonDb:0},{frequency:200,comparisonDb:null},{frequency:300,comparisonDb:0}],{bandLowHz:100,bandHighHz:300,crossoverHz:null},1000);assert.equal(middleNull.bandCovered,true);assert.equal(middleNull.sampleCount,2);assert.equal(middleNull.missingSampleCount,1);assert.equal(middleNull.sampledVariationDb,null,'finite endpoints around a null cannot claim flat response');
});

test('target and crossover CSV metadata reproduce geometry, context and loaded response',()=>{
 const settings={...study,targetLCHz:600,bandLowHz:250,bandHighHz:650,crossoverHz:620},r=compare({},settings,{fmin:100,fmax:1000,points:33}),csv=F.csv(r),parsed=parseCSV(csv),meta=new Map(parsed.filter(row=>row[0].startsWith('#')).map(row=>[row[0],row[1]]));
 const saved=JSON.parse(meta.get('# study_settings'));assert.deepEqual(saved,settings);assert.deepEqual(JSON.parse(meta.get('# band_and_crossover_context')),plain(r.context));
 const restored=F.compare(M.analyze(JSON.parse(meta.get('# baseline_state'))),saved,JSON.parse(meta.get('# options')));
 for(let i=0;i<r.cases.length;i++){near(restored.cases[i].analysis.p.gap,r.cases[i].analysis.p.gap);assert.deepEqual(plain(restored.cases[i].context),plain(r.cases[i].context));}
 assert.equal(parsed.filter(row=>row[0]==='# sampled_context').length,4);assert.match(csv,/No crossover summation/);
});
