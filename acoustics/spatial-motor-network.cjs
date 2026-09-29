/* Executable adapter contract for a future full-system spatial backend.
 * This file does NOT mesh/solve the air field or provide authentic full-system
 * data. A qualified frequency-exact front+horn+exterior operator is required.
 * A common operator maps projected driver flow to power-conjugate pressure
 * and observer pressure; disconnected field/radiation results are rejected.
 *
 * Factory: createSpatialMotorNetwork(M, A, N)
 * solve(analysis, dataset, frequencyHz, options)
 * Required options: expectedDesignSha256, expectedGeometrySha256,
 * expectedBoundaryManifestSha256, observerId.
 * Dataset schema: see schema below and synthetic numerical tests.
 */
module.exports=function createSpatialMotorNetwork(M,A,N){
'use strict';
const PI=Math.PI,C=(r=0,i=0)=>({r,i}),add=(a,b)=>C(a.r+b.r,a.i+b.i),sub=(a,b)=>C(a.r-b.r,a.i-b.i),mul=(a,b)=>C(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r),scale=(a,k)=>C(a.r*k,a.i*k),abs=a=>Math.hypot(a.r,a.i),div=(a,b)=>{const d=b.r*b.r+b.i*b.i;return C((a.r*b.r+a.i*b.i)/d,(a.i*b.r-a.r*b.i)/d)},finite=a=>Number.isFinite(a?.r)&&Number.isFinite(a?.i),power=(p,q)=>p.r*q.r+p.i*q.i,phase=z=>Math.atan2(z.i,z.r)*180/PI,hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const schema={format:'MEH-full-spatial-operator-v1',scope:'front+horn+exterior',units:'SI',coordinateSystem:{handedness:'right',axialAxis:'z',origin:'horn-throat-center',lengthUnit:'m'},conventions:{phasor:'exp(+j omega t)',amplitude:'RMS',flow:'projected piston volume velocity into front domain',pressure:'power-conjugate weighted pressure',sourceBasis:'unit-projected-volume-flow',impedanceUnits:'Pa s/m3',observerTransferUnits:'Pa s/m3'}};
Object.freeze(schema.coordinateSystem);Object.freeze(schema.conventions);Object.freeze(schema);
const geometryKeys=['frontFiller','fillerClearance','fillerOpening','fillerRelief','mouth','throat','coverage','throatAngle','k','r','m','b','q','wall','tap','count','port','shape','slotL','slotW','slotAngle','neck','offset','gap','cutout','coneDepth','sd','midDriver'];
const status='Adapter implemented and tested against synthetic operators. No authentic full front+horn+exterior dataset is supplied with this prototype.';
const limits=[
 'Requires one frequency-exact operator containing the front passages, horn interior and the same solved exterior radiation domain. No independent lumped horn/front load or far-field formula is added.',
 'A supplied observer transfer is accepted only with the same operator and exterior-domain provenance as its impedance matrix. Declared hashes are matched, not independently authenticated by this synchronous adapter.',
 'Spatial operator power combines its radiation and material/boundary dissipation. They cannot be separated without additional qualified output operators.',
 'The rear chamber is a uniform sealed compliance, outside the supplied front operator. Rear ports or rear radiation are unsupported by this contract.',
 'Catalog Mms free-air loading convention remains uncertain. Explicit mass subtraction is a sensitivity and preserves catalog-derived Cms and Rms.',
 'No interpolation is provided. Synthetic tests establish coupling algebra and contract checks, not the physical accuracy of an air-field backend.'
];
function minimumEigenvalueSymmetric(matrix){
 const x=matrix.map(r=>r.slice()),n=x.length,tolerance=1e-13*Math.max(1,...x.flat().map(Math.abs));
 for(let step=0;step<100*n*n;step++){
  let p=0,q=0,largest=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(x[i][j])>largest){largest=Math.abs(x[i][j]);p=i;q=j;}
  if(largest<=tolerance)break;const angle=.5*Math.atan2(2*x[p][q],x[q][q]-x[p][p]),c=Math.cos(angle),s=Math.sin(angle),pp=x[p][p],qq=x[q][q],pq=x[p][q];
  for(let k=0;k<n;k++)if(k!==p&&k!==q){const pk=x[p][k],qk=x[q][k];x[p][k]=x[k][p]=c*pk-s*qk;x[q][k]=x[k][q]=s*pk+c*qk;}
  x[p][p]=c*c*pp-2*s*c*pq+s*s*qq;x[q][q]=s*s*pp+2*s*c*pq+c*c*qq;x[p][q]=x[q][p]=0;
 }
 return Math.min(...x.map((r,i)=>r[i]));
}
function validate(analysis,data,frequencyHz,options={}){
 try{
  const a=analysis?.p?analysis:M.analyze(analysis?.state||analysis||{}),o={density:1.204,movingMassCorrectionG:0,...options};
  if(data?.format!==schema.format||data.scope!==schema.scope||data.units!==schema.units||data.available!==true)throw Error('A full front+horn+exterior SI spatial operator is required.');
  if(!(Number.isFinite(frequencyHz)&&frequencyHz>0))throw Error('Frequency must be positive.');
  if(!(Number.isFinite(o.density)&&o.density>0))throw Error('Positive finite air density is required.');
  for(const [key,value]of Object.entries(schema.coordinateSystem))if(data.coordinateSystem?.[key]!==value)throw Error('Unsupported spatial coordinate system: '+key+'.');
  for(const [key,value]of Object.entries(schema.conventions))if(data.conventions?.[key]!==value)throw Error('Unsupported spatial convention: '+key+'.');
  for(const name of ['designSha256','geometrySha256','boundaryManifestSha256','exteriorDomainSha256','operatorSha256'])if(!hash(data[name]))throw Error('Missing or malformed '+name+'.');
  for(const [key,expectedKey]of [['designSha256','expectedDesignSha256'],['geometrySha256','expectedGeometrySha256'],['boundaryManifestSha256','expectedBoundaryManifestSha256']])if(!hash(o[expectedKey])||o[expectedKey]!==data[key])throw Error('Expected '+key+' does not match the trusted geometry/manifest.');
  if(!data.inputState||geometryKeys.some(key=>!(key in data.inputState)))throw Error('Full spatial operator lacks its normalized geometry snapshot.');
  const expected=M.normalize(data.inputState),changed=geometryKeys.filter(key=>expected[key]!==a.p[key]);if(changed.length)throw Error('Current geometry differs from the full operator: '+changed.join(', '));
  if(data.medium?.densityKgM3!==o.density||data.medium?.soundSpeedMS!==a.p.soundSpeed)throw Error('The spatial operator medium does not match.');
  if(a.p.rearConcept==='reflex')throw Error('This adapter supports sealed rear compliance only; rear radiation must join a future full operator.');
  if(data.domainCoverage?.frontPassages!==true||data.domainCoverage?.hornInterior!==true||data.domainCoverage?.commonExterior!==true||data.domainCoverage?.rearChamberIncluded!==false)throw Error('Operator domain coverage is incomplete or would double-count the rear chamber.');
  if(data.qualification?.passed!==true||data.qualification?.kind!=='numerical-convergence')throw Error('Full spatial operator needs explicit numerical convergence qualification.');
  if(!Array.isArray(data.ports)||data.ports.length!==a.p.count||data.ports.length<1||data.ports.length>16)throw Error('Spatial source count must match the installed motors.');
  const ids=new Set();for(const p of data.ports){if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Spatial source IDs must be unique.');ids.add(p.id);if(!(typeof p.boundaryTag==='string'&&p.boundaryTag.length>0)&&!(Number.isInteger(p.boundaryTag)&&p.boundaryTag>0))throw Error('Each source needs its named or numbered boundary-manifest tag.');if(p.driverId!==a.p.midDriver||!(Number.isFinite(p.projectedAreaM2)&&p.projectedAreaM2>0)||p.motion!=='rigid-piston')throw Error('Each spatial port needs matching motor identity, projected source area and rigid-piston motion.');if(!Array.isArray(p.locationM)||p.locationM.length!==3||p.locationM.some(v=>!Number.isFinite(v)))throw Error('Spatial source locations must be finite SI coordinates.');}
  const d=A.catalog[a.p.midDriver];if(!d||!A.driverMatches(a,d))throw Error('Matching catalog motor parameters are required.');
  if(!(Number.isFinite(o.movingMassCorrectionG)&&o.movingMassCorrectionG>=0&&o.movingMassCorrectionG<d.mmsG))throw Error('Mass correction must be nonnegative and below catalog Mms.');
  if(!Array.isArray(data.rows))throw Error('Frequency-exact operator rows are missing.');const same=data.rows.filter(r=>r.frequencyHz===frequencyHz);if(same.length!==1)throw Error('Exactly one matching frequency row is required; interpolation is not supported.');const row=same[0];
  if(row.available!==true||row.qualified!==true||row.qualification?.passed!==true)throw Error('The requested frequency lacks row-specific convergence qualification.');
  if(row.operatorSha256!==data.operatorSha256||row.exteriorDomainSha256!==data.exteriorDomainSha256)throw Error('Matrix row belongs to a different operator or exterior domain.');
  const n=data.ports.length,Z=row.impedance;if(!Array.isArray(Z)||Z.length!==n||Z.some(r=>!Array.isArray(r)||r.length!==n||r.some(v=>!finite(v))))throw Error('Finite n-port acoustic impedance matrix required.');
  const norm=Math.max(1,...Z.flat().map(abs)),tolerance=norm*1e-8;for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(abs(sub(Z[i][j],Z[j][i]))>tolerance)throw Error('Acoustic operator fails reciprocity.');
  const real=Z.map((r,i)=>r.map((v,j)=>(v.r+Z[j][i].r)/2)),realScale=Math.max(1,...real.flat().map(Math.abs)),minEigenvalue=minimumEigenvalueSymmetric(real);if(minEigenvalue<-realScale*1e-9)throw Error('Acoustic operator fails passive real-power qualification.');
  if(typeof o.observerId!=='string'||!o.observerId)throw Error('Choose an explicit observer from the common solved exterior.');const observers=Array.isArray(row.observers)?row.observers:[],matches=observers.filter(v=>v.id===o.observerId);if(matches.length!==1)throw Error('Exactly one matching observer transfer is required.');const observer=matches[0];
  if(observer.operatorSha256!==data.operatorSha256||observer.exteriorDomainSha256!==data.exteriorDomainSha256||observer.frequencyHz!==frequencyHz)throw Error('Observer transfer is disconnected from the impedance operator/exterior/frequency.');
  if(observer.qualified!==true||observer.pressureReferencePa!==2e-5||!Array.isArray(observer.locationM)||observer.locationM.length!==3||observer.locationM.some(v=>!Number.isFinite(v))||!Array.isArray(observer.pressurePerFlow)||observer.pressurePerFlow.length!==n||observer.pressurePerFlow.some(v=>!finite(v)))throw Error('Observer requires qualified SI pressure-per-source-flow transfer and its actual location.');
  return {available:true,analysis:a,options:o,driver:d,row,observer,minimumRealEigenvalue:minEigenvalue,sourceAreaRatios:data.ports.map(p=>p.projectedAreaM2/(d.sd*1e-4))};
 }catch(e){return {available:false,frequencyHz,reason:e.message,backendStatus:status};}
}
function solve(analysis,data,frequencyHz,options={}){
 try{
  const v=validate(analysis,data,frequencyHz,options);if(!v.available)return v;const {analysis:a,driver:d,row,observer,sourceAreaRatios:t}=v,o={voltageRms:1,sourcePhasesDeg:[],sourceDelaysMs:[],sourceVoltageScales:[],...v.options},w=2*PI*frequencyHz,n=data.ports.length;
  if(!(Number.isFinite(o.voltageRms)&&o.voltageRms>=0))throw Error('Finite nonnegative RMS drive required.');for(const key of ['sourcePhasesDeg','sourceDelaysMs','sourceVoltageScales'])if(!Array.isArray(o[key])||o[key].length>n||o[key].some(x=>!Number.isFinite(x)))throw Error('Invalid '+key+'.');if(o.sourceVoltageScales.some(x=>x<0))throw Error('Source voltage scales must be nonnegative.');
  const k=A.circuitParameters(a,d,{...o,density:o.density,endCorrection:0,rearLossQ:7,rearEndCorrectionScale:1,loadFactor:1}),Ze=C(k.Re,w*k.Le),Zm=C(k.Rms,w*(k.Mms-o.movingMassCorrectionG*1e-3)-1/(w*k.Cms)),mechanical=scale(add(Zm,div(C(k.Bl*k.Bl),Ze)),1/(k.Sd*k.Sd));
  const shared=a.p.rearLayout==='shared',rearCompliance=shared?k.rearTotalV/(k.rho*k.c*k.c):k.Crear,rearZ=C(0,-1/(w*rearCompliance));
  // Q_native = projected-area / Sd * Q_catalog, with the reciprocal pressure
  // transform. The same source transformation must enter observer pressure.
  const Z=row.impedance.map((r,i)=>r.map((z,j)=>scale(z,t[i]*t[j]))),matrix=Z.map(r=>r.map(z=>({...z}))),voltages=Array.from({length:n},(_,i)=>{const theta=(o.sourcePhasesDeg[i]||0)*PI/180-w*(o.sourceDelaysMs[i]||0)*1e-3,magnitude=o.voltageRms*(o.sourceVoltageScales[i]??1);return C(magnitude*Math.cos(theta),magnitude*Math.sin(theta));}),rhs=voltages.map(V=>div(scale(V,k.Bl/k.Sd),Ze));
  for(let i=0;i<n;i++){matrix[i][i]=add(matrix[i][i],mechanical);if(shared)for(let j=0;j<n;j++)matrix[i][j]=add(matrix[i][j],rearZ);else matrix[i][i]=add(matrix[i][i],rearZ);}
  const flow=N.linearSolve(matrix,rhs),frontPressure=Z.map(r=>r.reduce((p,z,j)=>add(p,mul(z,flow[j])),C())),nativeFlows=flow.map((q,i)=>scale(q,t[i]));
  const branches=flow.map((q,i)=>{const velocity=scale(q,1/k.Sd),current=div(sub(voltages[i],scale(velocity,k.Bl)),Ze),zElectrical=abs(current)>1e-20&&abs(voltages[i])>1e-20?div(voltages[i],current):null;return {id:data.ports[i].id,voltage:voltages[i],current,pistonFlow:q,nativeProjectedFlow:nativeFlows[i],sourceAreaRatio:t[i],frontPressure:frontPressure[i],velocityRmsMS:abs(velocity),excursionPeakMM:Math.SQRT2*abs(velocity)/w*1000,electricalImpedance:zElectrical,electricalImpedanceOhm:zElectrical?abs(zElectrical):null,inputPowerW:power(voltages[i],current),coilPowerW:k.Re*abs(current)**2,mechanicalLossW:k.Rms*abs(velocity)**2,frontPowerW:power(frontPressure[i],q)};});
  const sum=key=>branches.reduce((s,r)=>s+r[key],0),inputPowerW=sum('inputPowerW'),coilPowerW=sum('coilPowerW'),mechanicalLossW=sum('mechanicalLossW'),operatorPowerW=sum('frontPowerW'),residualPowerW=inputPowerW-coilPowerW-mechanicalLossW-operatorPowerW,scalePower=Math.max(1e-30,Math.abs(inputPowerW),coilPowerW+mechanicalLossW+Math.abs(operatorPowerW));
  if(operatorPowerW<-scalePower*1e-8||Math.abs(residualPowerW)>scalePower*1e-7)throw Error('Coupled spatial motor power balance failed.');
  const observerPressure=observer.pressurePerFlow.reduce((p,h,i)=>add(p,mul(h,nativeFlows[i])),C()),observerRmsPa=abs(observerPressure);
  return {available:true,frequencyHz,model:'Qualified full spatial operator / coupled catalog motors / sealed rear',sampleKind:'exact supplied full-spatial frequency; no interpolation',backendStatus:status,branches,observer:{id:observer.id,locationM:observer.locationM.slice(),pressureRms:observerPressure,pressureRmsPa:observerRmsPa,splDb:20*Math.log10(Math.max(observerRmsPa/2e-5,1e-20)),phaseDeg:phase(observerPressure),pressureReferencePa:2e-5,convention:'Same solved exterior operator; no extra propagation, baffle or inverse-distance factor'},inputPowerW,coilPowerW,mechanicalLossW,operatorPowerW,operatorPowerMeaning:'Combined material/boundary loss plus radiated power represented by Re(Z); not separately measured radiation',rearLossW:0,residualPowerW,relativePowerResidual:residualPowerW/scalePower,excursionPeakMM:Math.max(...branches.map(b=>b.excursionPeakMM)),massConvention:{catalogMmsG:d.mmsG,massCorrectionG:o.movingMassCorrectionG,effectiveMechanicalMassG:d.mmsG-o.movingMassCorrectionG,Cms:k.Cms,Rms:k.Rms},provenance:{designSha256:data.designSha256,geometrySha256:data.geometrySha256,boundaryManifestSha256:data.boundaryManifestSha256,exteriorDomainSha256:data.exteriorDomainSha256,operatorSha256:data.operatorSha256,qualification:row.qualification},assumptions:limits};
 }catch(e){return {available:false,frequencyHz,reason:e.message,backendStatus:status};}
}
function availableFrequencies(data){return data?.format===schema.format&&Array.isArray(data.rows)?data.rows.filter(r=>r.available===true&&r.qualified===true&&r.qualification?.passed===true).map(r=>r.frequencyHz).filter(f=>Number.isFinite(f)&&f>0).sort((a,b)=>a-b):[];}
return {schema,status,limits,validate,solve,availableFrequencies};
};
