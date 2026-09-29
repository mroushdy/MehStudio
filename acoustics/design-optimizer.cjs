/* Bounded search. Explicit locks and constraints are supplied only by the guided workflow. */
module.exports=function(M,A){
'use strict';
const PI=Math.PI,clamp=(x,l,h)=>Math.max(l,Math.min(h,x)),uniq=a=>[...new Set(a.filter(Number.isFinite).map(v=>Math.round(v*1000)/1000))],pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const hornKeys=['mouth','throat','coverage','throatAngle','k','r','m','b','q','wall','soundSpeed'];
const goalDefaults=Object.freeze({midDriver:'bc6ndl38',compressionDriver:'bcDcx464',count:4,coverage:60,lowHz:100,handoffHz:700,designDriveVoltageRms:2.83,rearLayout:'shared',rearConcept:'individual',sharedRearShape:'teardrop'});
const freshProfile=Object.freeze({coverage:60,throatAngle:7.5,k:1.4,r:.2,m:.8,b:.1,q:3.5,wall:8,coneDepth:20,soundSpeed:343});
const policy={maximumMach:.05,minimumDriverInletDiameters:1,minimumWallInletDiameters:.5,maximumPowerRelativeResidual:1e-5,geometrySeeds:325,shortlist:8,coarsePoints:25,finalPoints:193};
const objective={mouthRipple:1,meanEfficiencyLoss:.5,mouthDeliveryLoss:.5,excursionUtilization:2,entryVelocityUtilization:2,rearVelocityUtilization:2,terminationSensitivity:.5,lowEdgeDeficit:.5};
const assumptions=[
 'This bounded search ranks a reduced electro-mechanical, lumped-cavity and one-dimensional Webster horn model. It does not establish the globally optimal or manufacture-ready MEH.',
 'Each run starts from a fresh rolled R-OSSE baseline derived only from Assisted goals. Manual geometry, motor edits and previous candidate dimensions are ignored. The baseline profile is a documented design seed, not an optimized horn family. Identical mids, equal RMS voltage and phase, and one common circumferential entry station are assumed.',
 'The entry location, round opening area, neck length, collector offset and stand-off, rear net volume, and (when selected) a round rear duct and nominal tuning are computed. Only the existing centered rear-duct routing is represented; arbitrary vent routes or asymmetric entry locations are not optimized.',
 'The complete entry footprint must lie within the equivalent active-piston projection and the collector must have positive axial depth. This conservative direct-coupling policy does not validate sideways or re-entrant collector paths; it is not a general prohibition on other MEH constructions.',
 'The objective minimizes mouth-power variation, mouth-power delivery loss per volt squared (reference 1 W/V²) and electrical-to-mouth power loss, with penalties for excursion, air speed, weak low-band output and sensitivity to unknown mouth/throat boundary conditions. Mouth power is not on-axis SPL or total front-plus-rear response.',
 'All candidates must satisfy sampled mechanical screens, electrical/acoustic power conservation, catalog Xmax and the selected conservative Mach 0.05 flow policy at the requested voltage. Coil dissipation is screened against the catalog nominal power number; no thermal time-constant or duty-cycle prediction is made.',
 'The safety sweep starts one octave below the requested low frequency or selected vent tuning, whichever is lower (no lower than 20 Hz). No protection high-pass filter is presumed. Excursion below that sweep remains unprotected.',
 'A ported candidate remains preliminary: rear radiation, front/rear phase summation and real end corrections are unresolved. It is ranked for horn-mouth delivery and motor/flow loading, never claimed to optimize bass extension.',
 'Finite chambers, cone motion, collectors and entry junctions can exceed lumped-model validity in the target band. Higher modes, directivity, cone breakup and the compression-driver/crossover transfer are absent. Boundary-scenario agreement is not independent validation.'
];
function resolveGoals(raw={},_ignoredCurrentState){
 // Intentionally ignore the legacy second argument. A Manual design must not
 // become an implicit Assisted goal, a search seed, or a physical constraint.
 const input=raw&&typeof raw==='object'?raw:{},errors=[],issues=[],provenance={},brief={},inputs={};
 for(const key of Object.keys(goalDefaults))if(Object.prototype.hasOwnProperty.call(input,key))inputs[key]=input[key];
 const bad=(fields,message)=>{errors.push(message);issues.push({fields:Array.isArray(fields)?fields:[fields],message,kind:'validation'});};
 const set=(key,value,source,reason)=>{brief[key]=value;provenance[key]={value,source,reason};};
 for(const key of ['midDriver','compressionDriver','count','rearLayout','rearConcept','sharedRearShape']){const supplied=input[key]!==undefined&&input[key]!==null&&input[key]!=='';set(key,supplied?input[key]:goalDefaults[key],supplied?'provided':'inferred','Independent Assisted system choice; never inherited from Manual.');}
 for(const [key,min,max] of [['coverage',40,120],['lowHz',40,1000],['handoffHz',300,2000],['designDriveVoltageRms',.1,100]]){
  const supplied=input[key]!==undefined&&input[key]!==null&&input[key]!=='',v=supplied?Number(input[key]):goalDefaults[key];
  if(typeof input[key]==='boolean'||!Number.isFinite(v)||v<min||v>max)bad(key,`${key==='coverage'?'Nominal coverage angle':key==='lowHz'?'Requested low frequency':key==='handoffHz'?'Requested handoff frequency':'Per-driver RMS voltage'} must be between ${min} and ${max}.`);else set(key,v,supplied?'provided':'inferred',key==='coverage'?'Nominal full included profile angle; actual beamwidth varies with frequency and is not predicted.':key==='lowHz'?'Starting requested band edge; not a promised cutoff.':key==='designDriveVoltageRms'?'RMS voltage at each mid driver, not total amplifier voltage or target SPL.':'Requested upper mid-band frequency, not a validated crossover.');
 }
 if(brief.lowHz>=brief.handoffHz)bad(['lowHz','handoffHz'],'The requested low frequency must be below the requested handoff.');
 if(![2,4,6].includes(Number(brief.count)))bad('count','Choose 2, 4 or 6 identical mid drivers.');else brief.count=Number(brief.count);
 for(const [key,allowed] of [['rearLayout',['individual','shared']],['rearConcept',['individual','reflex']],['sharedRearShape',['cylinder','teardrop']]])if(!allowed.includes(brief[key]))bad(key,`Unsupported ${key}.`);
 const mid=M.drivers.mid[brief.midDriver],cd=M.drivers.compression[brief.compressionDriver];
 if(!mid||mid.available===false)bad('midDriver','Select an available mid-driver model.');
 else if(!A.catalog[brief.midDriver]||mid.hasMotorData===false||mid.acousticsReady===false)bad('midDriver',`${mid.name}: a complete verified motor dataset is not loaded. Assisted acoustic design is unavailable; Manual geometry remains available. No other driver's motor parameters will be substituted.`);
 if(brief.compressionDriver==='bms4594he')bad('compressionDriver','The BMS 4594HE drawing shows a 26.6 mm forward nose. This adapter does not yet accommodate it; choose another compression driver for Assisted generation.');
 else if(!cd||cd.available===false)bad('compressionDriver','Select an available compression driver.');
 else if(Number.isFinite(cd.recommendedLowCrossoverHz)&&brief.handoffHz<cd.recommendedLowCrossoverHz)bad(['handoffHz','compressionDriver'],`The requested handoff is below ${cd.name}'s ${cd.recommendedLowCrossoverHz} Hz manufacturer recommendation. Its stated crossover conditions still require checking on the generated horn.`);
 const frame=mid?.parameters?.frame,packing=Number.isFinite(frame)&&[2,4,6].includes(brief.count)?(frame+17)/Math.sin(PI/brief.count)+2*frame:NaN;
 const mouth=Number.isFinite(packing)?clamp(Math.ceil(packing/25)*25,300,1000):M.defaults.mouth;
 const throat=Number.isFinite(cd?.throatMM)?cd.throatMM:M.defaults.throat;
 const entry=Number.isFinite(mid?.parameters?.sd)?clamp(Math.sqrt(4*mid.parameters.sd*100/(PI*6)),M.specs.port[0],M.specs.port[1]):45;
 // Defaults here are pristine module defaults, never live UI state. Every value
 // which defines this design family is pinned explicitly for reproducibility.
 const coverage=Number.isFinite(brief.coverage)?brief.coverage:freshProfile.coverage;
 const state={...M.defaults,...freshProfile,...mid?.parameters,coverage,midDriver:brief.midDriver,compressionDriver:brief.compressionDriver,count:brief.count,rearLayout:brief.rearLayout,rearConcept:brief.rearConcept,sharedRearShape:brief.sharedRearShape,frequency:brief.handoffHz,lowTarget:brief.lowHz,mouth,throat,tap:clamp(343000/(8*(brief.handoffHz||700)),25,180),port:entry,shape:'round',areaLocked:false,areaTarget:PI*entry*entry/4,slotL:50,slotW:20,slotAngle:0,offset:0,gap:42,neck:8,collector:50.4,back:1.636,sharedBack:100,rearPortShape:'round',rearPortDiameter:30,rearPortWidth:45,rearPortHeight:15,rearTuning:clamp(.6*(brief.lowHz||100),...M.specs.rearTuning.slice(0,2)),briefUse:'undecided',listeningDistance:3,continuousSPL:0,peakSPL:0,targetCoverage:coverage,excursion:.25};
 for(const key of hornKeys)if(!Number.isFinite(state[key])||state[key]<M.specs[key][0]||state[key]>M.specs[key][1])bad(key,`The generated baseline ${key} is outside the supported geometry range.`);
 const baseline={id:'fresh-rolled-rosse-v2',source:'assisted-goals',independentOfManual:true,profile:{...freshProfile,mouth,throat,coverage},mouthMM:mouth,throatMM:throat,nominalCoverageDegrees:coverage,summary:`Fresh horn: Ø${mouth} mm mouth, Ø${throat} mm throat, ${coverage}° nominal rolled R-OSSE profile. Dimensions start from the selected drivers and count.`,mouthBasis:'(mid frame +17 mm)/sin(π/mid count) +2×mid frame, rounded up to25 mm and limited to300–1000 mm. This is a packaging seed, not a predicted cutoff or optimized acoustic mouth.',profileBasis:`Rolled R-OSSE seed at the selected ${coverage}° nominal coverage: k1.4, r0.2, m0.8, b0.1, q3.5;7.5° throat angle,8 mm wall,20 mm cone-recess surrogate and343 m/s sound speed. Actual beamwidth is not predicted.`};
 provenance.baseline={source:'generated',value:baseline.id,reason:baseline.summary+' '+baseline.mouthBasis};
 provenance.mouth={source:'generated',value:mouth,reason:baseline.mouthBasis};
 provenance.throat={source:'generated',value:throat,reason:'Uses the selected compression driver exit diameter; no Manual throat or adapter is inherited.'};
 const goalStatus={validated:false,model:'Webster horn plus lumped driver/cavities',portedPreliminary:brief.rearConcept==='reflex',fullMEHResponseAvailable:false};
 return {ok:errors.length===0,errors,issues,brief,goals:brief,state,baseline,inputs,provenance,modelStatus:goalStatus};
}
function geometryReasons(a){
 const out=[...a.errors,...(a.directCouplingIssues||[]).map(i=>i.message),...(a.frontFiller?.issues||[]).map(i=>i.message)];
 if(!Number.isFinite(a.depth)||!Number.isFinite(a.frontV)||a.frontV<=0)out.push('Non-finite or non-positive geometry.');
 if(a.hole.fail)out.push('Entry boundary misses the forward horn.');
 if(a.minEdge<3)out.push('Entry-edge spacing is below 3 mm.');
 if(a.plateGap<0)out.push('Driver-frame / horn-wall clearance is negative.');
 if(a.envelopePairs.length)out.push('Driver or rear-pod envelopes overlap.');
 if(a.warnings.some(s=>/did not converge/.test(s)))out.push('A mechanical envelope check did not converge.');
 if(a.p.rearLayout==='individual'&&a.podDepth-(a.rearPort?.capMM||5)<a.p.driverDepth+10)out.push('Rear pod does not leave 10 mm behind the driver envelope.');
 if(out.length)return [...new Set(out)];
 const env=[];
 a.poses.forEach((pose,index)=>{for(const [type,R,L] of [['frame',a.p.frame/2,a.p.driverDepth],...(a.p.rearLayout==='shared'?[]:[['pod',a.podOuter,a.podDepth]])])env.push({type,index,center:M.add(pose.F,M.mul(pose.n,L/2)),axis:pose.n,radius:R,half:L/2});});
 const cd=a.compressionDriver,compression={center:[0,0,-12-cd.depthMM/2],axis:[0,0,1],radius:cd.diameterMM/2,half:cd.depthMM/2};
 for(const e of env){if(M.overlapCyl(compression,e)!==false){out.push('Compression-driver envelope collides with a mid or rear pod, or could not be resolved.');break;}}
 outer:for(let i=0;i<env.length;i++)for(let j=i+1;j<env.length;j++)if(env[i].index!==env[j].index&&env[i].type!==env[j].type&&M.overlapCyl(env[i],env[j])!==false){out.push('A driver envelope collides with another rear pod, or could not be resolved.');break outer;}
 return [...new Set(out)];
}
function portReasons(a){
 if(a.p.rearConcept!=='reflex')return [];
 const p=a.rearPort,D=2*p.equivalentRadiusMM,radial=p.inletRadialClearanceMM??p.radialClearanceMM,out=[];
 if(p.driverClearanceMM+1e-7<policy.minimumDriverInletDiameters*D)out.push('Rear vent inlet fails the one-diameter driver-clearance policy.');
 if(radial+1e-7<policy.minimumWallInletDiameters*D)out.push('Rear vent inlet fails the half-diameter wall-clearance policy.');
 if(p.lengthMM<p.endCorrectionMM*.5)out.push('Rear vent physical length is too small relative to the uncertain end correction.');
 return out;
}
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,db=x=>10*Math.log10(Math.max(1e-18,x));
function evaluate(a,g,points=policy.coarsePoints,scenario={}){
 const guardLow=Math.max(20,Math.min(g.lowHz/2,a.p.rearConcept==='reflex'?a.rearPort.tuningHz/2:Infinity));
 const r=A.analyze(a,{driverId:g.midDriver,hornLoad:'webster',mouthTermination:'baffled',throatTermination:'closed',voltageRms:g.designDriveVoltageRms,fmin:points>=policy.finalPoints?g.lowHz:guardLow,fmax:g.handoffHz,points,sensitivity:false,...scenario});
 if(!r.available)return {ok:false,reasons:[r.reason||'Acoustic solver unavailable.'],result:r};
 if(points>=policy.finalPoints){const guard=A.analyze(a,{...r.options,fmin:guardLow,fmax:g.lowHz,points:97,sensitivity:false});if(!guard.available)return {ok:false,reasons:[guard.reason||'The below-band safety sweep failed.']};r.rows=[...guard.rows.slice(0,-1),...r.rows];r.options.fmin=guard.options.fmin;}
 if(r.options.hornLoad!=='webster')return {ok:false,reasons:['The frequency-dependent horn solver is unavailable; no resistive-load substitute is allowed.']};
 const reasons=[],rows=r.rows,band=rows.filter(v=>v.frequency>=g.lowHz*(1-1e-8)),N=a.p.count;
 const keyset=['frequency','inputPowerW','coilPowerW','excursionPeakMM','neckVelocityPeakMS','rearPortVelocityPeakMS','powerResidualW','hornMouthRadiatedPowerW','hornThroatTerminationLossW','hornPowerResidualW','totalPowerResidualW'];
 if(!band.length||rows.some(v=>keyset.some(k=>!Number.isFinite(v[k]))))return {ok:false,reasons:['The acoustic solver returned non-finite or missing physical quantities.']};
 if(rows.some(v=>v.inputPowerW<=0||v.hornMouthRadiatedPowerW< -1e-10||v.hornThroatTerminationLossW< -1e-10))reasons.push('The acoustic result is not passive.');
 if(rows.some(v=>Math.abs(v.powerResidualW)>policy.maximumPowerRelativeResidual*Math.max(1e-8,v.inputPowerW)||Math.abs(v.totalPowerResidualW)>policy.maximumPowerRelativeResidual*Math.max(1e-8,N*v.inputPowerW)||Math.abs(v.hornPowerResidualW)>policy.maximumPowerRelativeResidual*Math.max(1e-8,N*v.loadPowerW)))reasons.push('The acoustic power-conservation check failed.');
 const maxExcursion=Math.max(...rows.map(v=>v.excursionPeakMM)),maxEntry=Math.max(...rows.map(v=>v.neckVelocityPeakMS)),maxVent=Math.max(...rows.map(v=>v.rearPortVelocityPeakMS)),maxCoil=Math.max(...rows.map(v=>v.coilPowerW)),driver=A.catalog[g.midDriver];
 if(maxExcursion>driver.xmaxMM*(1+1e-7))reasons.push('Predicted peak excursion exceeds catalog Xmax at the requested drive.');
 if(maxEntry>a.p.soundSpeed*policy.maximumMach)reasons.push('Predicted entry velocity exceeds the Mach 0.05 admission policy.');
 if(maxVent>a.p.soundSpeed*policy.maximumMach)reasons.push('Predicted rear-vent velocity exceeds the Mach 0.05 admission policy.');
 if(maxCoil>driver.nominalPowerW)reasons.push('Predicted coil dissipation exceeds the catalog nominal-power admission policy.');
 const powers=band.map(v=>v.hornMouthRadiatedPowerW),levels=powers.map(db),efficiencies=band.map(v=>v.hornMouthRadiatedPowerW/(N*v.inputPowerW));
 if(efficiencies.some(e=>!Number.isFinite(e)||e<=0||e>1.00001))reasons.push('Mouth-power efficiency is nonphysical or zero.');
 const ripple=Math.max(...levels)-Math.min(...levels),meanEfficiencyDb=mean(efficiencies.map(db)),lowEdgeDeficit=Math.max(0,mean(levels)-levels[0]),excursionRatio=maxExcursion/driver.xmaxMM,entryRatio=maxEntry/(a.p.soundSpeed*policy.maximumMach),ventRatio=maxVent/(a.p.soundSpeed*policy.maximumMach);
 const terms={mouthRipple:objective.mouthRipple*ripple,meanEfficiencyLoss:objective.meanEfficiencyLoss*Math.max(0,-meanEfficiencyDb),mouthDeliveryLoss:objective.mouthDeliveryLoss*Math.max(0,-mean(powers.map(v=>db(v/(g.designDriveVoltageRms*g.designDriveVoltageRms))))),excursionUtilization:objective.excursionUtilization*excursionRatio**2,entryVelocityUtilization:objective.entryVelocityUtilization*entryRatio**2,rearVelocityUtilization:objective.rearVelocityUtilization*ventRatio**2,terminationSensitivity:0,lowEdgeDeficit:objective.lowEdgeDeficit*lowEdgeDeficit};
 const summary={requestedLowHz:g.lowHz,requestedHandoffHz:g.handoffHz,screenLowHz:rows[0].frequency,perDriverVoltageRms:g.designDriveVoltageRms,mouthPowerRippleDB:ripple,meanElectricalToMouthEfficiency:10**(meanEfficiencyDb/10),meanElectricalToMouthEfficiencyDB:meanEfficiencyDb,lowEdgeDeficitDB:lowEdgeDeficit,meanMouthPowerPerVoltSquaredW:10**(mean(powers.map(v=>db(v/(g.designDriveVoltageRms*g.designDriveVoltageRms))))/10),mouthPowerPerVoltSquaredReference:'1 W / V² used only to make the logarithmic ranking dimensionless',minimumMouthPowerW:Math.min(...powers),maximumMouthPowerW:Math.max(...powers),maximumExcursionPeakMM:maxExcursion,xmaxMM:driver.xmaxMM,maximumEntryVelocityPeakMS:maxEntry,maximumRearPortVelocityPeakMS:maxVent,maximumCoilDissipationPerDriverW:maxCoil,rearNetVolumeTotalL:a.p.rearLayout==='shared'?a.p.sharedBack:a.p.back*N,rearVolumePerDriverL:a.p.rearLayout==='shared'?a.p.sharedBack/N:a.p.back,rearNominalTuningHz:a.p.rearConcept==='reflex'?r.summary.rearNominalTuningHz:null,rearPortDiameterMM:a.p.rearConcept==='reflex'?a.p.rearPortDiameter:null,rearPortPhysicalLengthMM:a.p.rearConcept==='reflex'?a.rearPort.lengthMM:null,compactnessReferenceHz:Math.min(r.summary.compactnessLimitHz,r.summary.modelReferenceHz??Infinity),compactnessExceeded:g.handoffHz>Math.min(r.summary.compactnessLimitHz,r.summary.modelReferenceHz??Infinity),portedPreliminary:a.p.rearConcept==='reflex',validated:false};
 return {ok:!reasons.length,reasons,result:r,score:Object.values(terms).reduce((s,v)=>s+v,0),terms,summary};
}
const compare=(x,y)=>Math.abs(x.e.score-y.e.score)>1e-9?x.e.score-y.e.score:x.a.pathSpread-y.a.pathSpread;
function rearVolumes(a,g){
 if(g.rearLayout==='shared'){const min=a.sharedRear.minimumSealedNetVolumeL;return uniq([min*1.005,min*1.15,min*1.5,min*2].map(v=>Math.ceil(v*10)/10)).filter(v=>v>=M.specs.sharedBack[0]&&v<=M.specs.sharedBack[1]);}
 const d=A.catalog[g.midDriver],minimum=Math.max(.5,PI*(a.p.frame/2+2)**2*(a.p.driverDepth+10)/1e6-a.p.driverVol);
 const alignments=[.65,.8,1].map(q=>d.vas/((q/d.qts)**2-1));
 return uniq([minimum*1.01,...alignments,M.specs.back[1]].map(v=>Math.ceil(Math.max(minimum,v)*20)/20)).filter(v=>v>=M.specs.back[0]&&v<=M.specs.back[1]);
}
async function generate(raw={},options={}){
 const checked=resolveGoals(raw),g=checked.brief,result={...checked,ok:false,candidates:[],tested:0,analyzed:0,acousticEvaluations:0,accepted:0,rejected:{},assumptions:[...assumptions],objectiveWeights:{...objective},policy:{...policy},cancelled:false};
 if(!checked.ok)return result;
 const lockKeys=['mouth','coverage','throatAngle','k','r','m','b','q','tap','port','gap','neck','offset','sharedBack','back'];
 const locks={};for(const [key,value]of Object.entries(options.lockedState||{})){if(!lockKeys.includes(key)||!Number.isFinite(value)||value<M.specs[key][0]||value>M.specs[key][1])return {...result,errors:['Invalid locked dimension: '+key],issues:[]};locks[key]=value;}
 Object.assign(checked.state,locks);
 const constraints=a=>typeof options.constraintReasons==='function'?options.constraintReasons(a):[];
 const locked=p=>({...p,...locks});

 const cancel=()=>typeof options.shouldCancel==='function'&&options.shouldCancel(),progress=(stage,total)=>{if(options.onProgress)options.onProgress({stage,tested:result.tested,total,analyzed:result.analyzed,acousticEvaluations:result.acousticEvaluations,accepted:result.accepted,rejected:{...result.rejected}});};
 const reject=reasons=>{for(const s of new Set(reasons))result.rejected[s]=(result.rejected[s]||0)+1;};
 const cancelled=()=>{result.ok=false;result.cancelled=true;result.candidates=[];return result;};
 if(cancel())return cancelled();
 // Never use the user's previous free dimension sliders as objective constraints.
 const minPod=Math.max(.5,PI*(checked.state.frame/2+2)**2*(checked.state.driverDepth+10)/1e6-checked.state.driverVol);
 const base={...checked.state,shape:'round',areaLocked:false,rearPortShape:'round',rearConcept:'individual',back:g.rearLayout==='individual'?Math.min(M.specs.back[1],Math.ceil(minPod*1.01*20)/20):checked.state.back,sharedBack:g.rearLayout==='shared'?500:checked.state.sharedBack};
 const maxTap=Math.min(180,M.frontBranch(M.profile(base)).at(-1).z-5),taps=uniq([35,65,95,125,155,180].filter(t=>t<=maxTap)),diameters=uniq([Math.sqrt(4*base.sd*100/(PI*8)),Math.sqrt(4*base.sd*100/(PI*5)),Math.max(60,Math.sqrt(4*base.sd*100/(PI*5)))].map(v=>clamp(v,M.specs.port[0],M.specs.port[1]))),offsets=uniq([0,.25*base.frame,Math.min(95,.5*base.frame)]),gaps=[25,42,62],necks=[8,16],jobs=[];
 for(const tap of taps)for(const port of diameters)for(const offset of offsets)for(const gap of gaps)for(const neck of necks)if(gap>=neck+9)jobs.push({...base,tap,port,offset,gap,neck,areaTarget:PI*port*port/4});
 // The fresh deterministic baseline contributes one extra placement seed.
 jobs.push({...base,tap:checked.state.tap,port:checked.state.port,offset:checked.state.offset,gap:checked.state.gap,neck:checked.state.neck});
 for(let j=0;j<jobs.length;j++)jobs[j]=locked(jobs[j]);
 if(Object.keys(locks).length){const unique=new Map(jobs.map(p=>[JSON.stringify(p),p]));jobs.splice(0,jobs.length,...unique.values());}
 let shortlist=[];
 progress('Searching entry and driver placement',jobs.length);await pause();
 for(let i=0;i<jobs.length;i++){
  if(cancel())return cancelled();
  let a=M.analyze(jobs[i]);result.analyzed++;result.tested++;
  const preliminary=geometryReasons(a);if(preliminary.length){reject(preliminary);}
  else {
   const volumes=rearVolumes(a,g);let best=null;
   // Two endpoint rear volumes prevent selecting geometry solely on one arbitrary compliance.
   for(const volume of uniq([volumes[0],volumes.at(-1)])){
    const trial=M.analyze(locked({...a.p,[g.rearLayout==='shared'?'sharedBack':'back']:volume}));result.analyzed++;
    const bad=[...geometryReasons(trial),...constraints(trial)];if(bad.length){reject(bad);continue;}
    const e=evaluate(trial,g);result.acousticEvaluations++;
    // Even a failing safety seed may become safe after rear optimization. Its acoustic score
    // still ranks placement, but it is never returned as an accepted candidate.
    if(e.result?.available&&Number.isFinite(e.score)){if(!best||e.score<best.e.score)best={a:trial,e};}else reject(e.reasons);
   }
   if(best){shortlist.push(best);shortlist.sort(compare);shortlist=shortlist.slice(0,policy.shortlist);}
  }
  if((i+1)%4===0||i===jobs.length-1){progress('Searching entry and driver placement',jobs.length);await pause();}
 }
 if(cancel())return cancelled();
 const finalists=[],seen=new Set();let refineJobs=[];
 for(const seed of shortlist){
  const volumes=rearVolumes(seed.a,g);
  if(g.rearConcept==='individual')for(const volume of volumes)refineJobs.push({...seed.a.p,rearConcept:'individual',[g.rearLayout==='shared'?'sharedBack':'back']:volume});
  else {
   // A 40 Hz floor excluded physically feasible longer ducts in large
   // chambers. Sample below it without relaxing inlet, flow or excursion
   // checks; the lower band sweep still includes the unprotected sub-band.
   const ds=g.rearLayout==='shared'?[20,30,40,60,80,100,120,150,180,200]:[20,30,40,50,60,80],tunings=uniq([.25*g.lowHz,.3*g.lowHz,.4*g.lowHz,.6*g.lowHz,.85*g.lowHz].map(v=>clamp(v,...M.specs.rearTuning.slice(0,2))));
   const ventVolumes=g.rearLayout==='shared'?uniq([volumes[0]*1.15,volumes[0]*1.7,volumes[0]*2.5,volumes[0]*3.5,volumes[0]*5,500].map(v=>Math.min(500,v))):volumes;
   for(const volume of ventVolumes)for(const diameter of ds)for(const tuning of tunings)refineJobs.push({...seed.a.p,rearConcept:'reflex',rearPortShape:'round',rearPortDiameter:diameter,rearTuning:tuning,[g.rearLayout==='shared'?'sharedBack':'back']:volume});
  }
 }
 progress('Sizing rear chamber and checking acoustic loading',jobs.length+refineJobs.length);await pause();
 for(let i=0;i<refineJobs.length;i++){
  if(cancel())return cancelled();const state=locked(refineJobs[i]),key=JSON.stringify(state);if(seen.has(key))continue;seen.add(key);
  result.tested++;const cheapPort=M.rearPort(state);if(state.rearConcept==='reflex'&&cheapPort.lengthMM<Math.max(cheapPort.capMM,.5*cheapPort.endCorrectionMM)){reject(['Rear vent physical length is too small relative to the uncertain end correction.']);if((i+1)%8===0){progress('Sizing rear chamber and checking acoustic loading',jobs.length+refineJobs.length);await pause();}continue;}
  const a=M.analyze(state);result.analyzed++;const bad=[...geometryReasons(a),...portReasons(a),...constraints(a)];
  if(bad.length)reject(bad);else {const e=evaluate(a,g);result.acousticEvaluations++;if(e.ok){result.accepted++;finalists.push({a,e});finalists.sort(compare);if(finalists.length>6)finalists.pop();}else reject(e.reasons);}
  if((i+1)%4===0||i===refineJobs.length-1){progress('Sizing rear chamber and checking acoustic loading',jobs.length+refineJobs.length);await pause();}
 }
 const accepted=[],finalSeen=new Set();
 for(const seed of finalists){
  if(cancel())return cancelled();const p=seed.a.p,signature=JSON.stringify([p.tap,p.port,p.gap,p.neck,p.back,p.sharedBack,p.rearTuning,p.rearPortDiameter]);if(finalSeen.has(signature))continue;finalSeen.add(signature);
  let main=evaluate(seed.a,g,policy.finalPoints);result.acousticEvaluations++;
  if(!main.ok){reject(main.reasons);continue;}
  const coarseFinal=main;main=evaluate(seed.a,g,policy.finalPoints*2-1);result.acousticEvaluations++;if(!main.ok){reject(main.reasons);continue;}
  const convergence={excursionRelativeChange:Math.abs(main.summary.maximumExcursionPeakMM/coarseFinal.summary.maximumExcursionPeakMM-1),rippleChangeDB:Math.abs(main.summary.mouthPowerRippleDB-coarseFinal.summary.mouthPowerRippleDB)};
  let densePoints=policy.finalPoints*2-1;if(convergence.excursionRelativeChange>.02||convergence.rippleChangeDB>.5){densePoints=densePoints*2-1;main=evaluate(seed.a,g,densePoints);result.acousticEvaluations++;if(!main.ok){reject(main.reasons);continue;}}
  main.summary.frequencyGridConvergence=convergence;main.summary.passbandSweepPoints=densePoints;main.summary.safetyScope='Sampled band and sub-band down to the lower of half the low target or half the vent tuning, with a 20 Hz floor; not a continuous-frequency or nonlinear guarantee.';
  const scenarios=[{mouthTermination:'baffled',throatTermination:'matched'},{mouthTermination:'matched',throatTermination:'closed'},{mouthTermination:'matched',throatTermination:'matched'}],summaries=[];let spread=0,safe=true;
  for(const scenario of scenarios){
   const alternate=evaluate(seed.a,g,densePoints,scenario);result.acousticEvaluations++;
   if(!alternate.ok){reject(alternate.reasons);safe=false;break;}
   const nominalRows=main.result.rows,rows=alternate.result.rows;
   const delta=rows.map((row,j)=>row.frequency>=g.lowHz?Math.abs(db(row.hornMouthRadiatedPowerW)-db(nominalRows[j].hornMouthRadiatedPowerW)):0);
   spread=Math.max(spread,...delta);summaries.push({scenario,...alternate.summary});
  }
  if(!safe)continue;
  let sensitivitySpread=spread;
  if(g.rearConcept==='reflex'){for(const scenario of [{rearEndCorrectionScale:.75,rearLossQ:3},{rearEndCorrectionScale:.75,rearLossQ:15},{rearEndCorrectionScale:1.25,rearLossQ:3},{rearEndCorrectionScale:1.25,rearLossQ:15}]){const alternate=evaluate(seed.a,g,densePoints,scenario);result.acousticEvaluations++;if(!alternate.ok){reject(alternate.reasons);safe=false;break;}const delta=alternate.result.rows.map((row,j)=>row.frequency>=g.lowHz?Math.abs(db(row.hornMouthRadiatedPowerW)-db(main.result.rows[j].hornMouthRadiatedPowerW)):0);sensitivitySpread=Math.max(sensitivitySpread,...delta);summaries.push({scenario,...alternate.summary});}if(!safe)continue;main.summary.rearTuningScenarioRangeHz=[Math.min(main.result.summary.rearNominalTuningHz,...summaries.map(s=>s.rearNominalTuningHz).filter(Number.isFinite)),Math.max(main.result.summary.rearNominalTuningHz,...summaries.map(s=>s.rearNominalTuningHz).filter(Number.isFinite))];}
  for(const key of ['maximumExcursionPeakMM','maximumEntryVelocityPeakMS','maximumRearPortVelocityPeakMS','maximumCoilDissipationPerDriverW'])main.summary[key]=Math.max(main.summary[key],...summaries.map(s=>s[key]));
  main.summary.safetyMetricsBasis='Worst sampled value across all tested scenarios';
  main.terms.excursionUtilization=objective.excursionUtilization*(main.summary.maximumExcursionPeakMM/A.catalog[g.midDriver].xmaxMM)**2;main.terms.entryVelocityUtilization=objective.entryVelocityUtilization*(main.summary.maximumEntryVelocityPeakMS/(seed.a.p.soundSpeed*policy.maximumMach))**2;main.terms.rearVelocityUtilization=objective.rearVelocityUtilization*(main.summary.maximumRearPortVelocityPeakMS/(seed.a.p.soundSpeed*policy.maximumMach))**2;
  main.terms.terminationSensitivity=objective.terminationSensitivity*sensitivitySpread;main.score=Object.values(main.terms).reduce((s,v)=>s+v,0);main.summary.maximumBoundaryScenarioDifferenceDB=spread;main.summary.scenarioCount=summaries.length+1;main.summary.maximumAllScenarioDifferenceDB=sensitivitySpread;main.summary.boundaryScenarioCount=4;
  const notes=[`Computed entry ${seed.a.p.port.toFixed(1)} mm at z=${seed.a.p.tap.toFixed(1)} mm; collector offset ${seed.a.p.offset.toFixed(1)} mm, stand-off ${seed.a.p.gap.toFixed(1)} mm.`,`${g.rearLayout==='shared'?'Total common':'Per-driver'} net rear volume ${(g.rearLayout==='shared'?seed.a.p.sharedBack:seed.a.p.back).toFixed(2)} L.`,`Four boundary scenarios passed the sampled requested-drive screening policy. Largest mouth-power change: ${spread.toFixed(1)} dB.`,...main.result.warnings];
  if(g.rearConcept==='reflex')notes.push('Ported design is preliminary. This search cannot certify bass tuning or front/rear acoustic summation.');
  const candidate={state:seed.a.p,params:seed.a.p,analysis:seed.a,score:main.score,proxies:main.terms,scoring:{terms:main.terms,weights:objective,lowerIsBetter:true},acousticSummary:main.summary,acousticResult:main.result,scenarioSummaries:summaries,notes,modelStatus:{...checked.modelStatus,status:'screened-provisional',compactnessExceeded:main.summary.compactnessExceeded},assumptions:[...assumptions]};
  accepted.push(candidate);progress('Checking boundary sensitivity',result.tested);await pause();
 }
 accepted.sort((a,b)=>Math.abs(a.score-b.score)>1e-9?a.score-b.score:a.analysis.pathSpread-b.analysis.pathSpread);const signatures=new Set();result.candidates=accepted.filter(c=>{const p=c.state,key=JSON.stringify([p.tap,p.port,p.gap,p.neck,p.back,p.sharedBack,p.rearTuning,p.rearPortDiameter]);if(signatures.has(key))return false;signatures.add(key);return true;}).slice(0,options.candidateLimit||3);result.ok=result.candidates.length>0;
 if(cancel())return cancelled();
 if(!result.ok){const common=Object.entries(result.rejected).sort((a,b)=>b[1]-a[1]).slice(0,5);result.errors=['No sampled design passed all mechanical and acoustic admission checks.',...common.map(([s,n])=>`${s} (${n} checks.)`),'This bounded search does not prove that no feasible design exists. Review the selected drive, band or system configuration; no design has been applied.'];result.issues=common.map(([message])=>({fields:/excursion|velocity|dissipation|power/i.test(message)?['designDriveVoltageRms','lowHz']: /vent|Rear|rear|pod/i.test(message)?['rearConcept','rearLayout','sharedRearShape']:['midDriver','count','handoffHz'],message,kind:'constraint'}));}
 else {result.errors=[];result.issues=[];result.modelStatus=result.candidates[0].modelStatus;result.provenance.computedDesign={source:'calculated',value:{tap:result.candidates[0].state.tap,port:result.candidates[0].state.port,back:result.candidates[0].state.back,sharedBack:result.candidates[0].state.sharedBack,rearTuning:result.candidates[0].state.rearTuning},reason:'Best of a bounded search under the documented acoustic objective and conservative admission checks; provisional, not a verified acoustic optimum.'};}
 return result;
}
return {resolveGoals,generate,geometryReasons,portReasons,evaluate,assumptions,objective,policy,hornKeys,goalDefaults,freshProfile};
};
