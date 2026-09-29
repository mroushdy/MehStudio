/* Broadband engineering surrogate, NOT a full-field or measurement-validated model.
 * SI, RMS complex amplitudes, exp(+j omega t). Only this module creates the
 * explicitly labelled equivalent passage; existing spatial-only APIs retain
 * their no-fallback contract. Factory is also embedded in the offline editor.
 */
module.exports=function createBroadbandEngine(M,A,N,S){
'use strict';
const PI=Math.PI,C=(r=0,i=0)=>({r,i}),add=(a,b)=>C(a.r+b.r,a.i+b.i),sub=(a,b)=>C(a.r-b.r,a.i-b.i),mul=(a,b)=>C(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r),scale=(a,k)=>C(a.r*k,a.i*k),abs=a=>Math.hypot(a.r,a.i),div=(a,b)=>{const d=b.r*b.r+b.i*b.i;return C((a.r*b.r+a.i*b.i)/d,(a.i*b.r-a.r*b.i)/d)},phase=a=>Math.atan2(a.i,a.r)*180/PI,polar=(r,p)=>C(r*Math.cos(p),r*Math.sin(p)),finite=a=>Number.isFinite(a?.r)&&Number.isFinite(a?.i),db=a=>20*Math.log10(Math.max(a,1e-20));
const defaults={density:1.204,dynamicViscosity:1.84e-5,heatCapacityRatio:1.4,prandtl:0.71,voltageRms:1,distanceM:3,minHz:80,maxHz:1800,points:121,segmentCount:48,lossScale:1,endCorrection:0,rearLossQ:7,rearEndCorrectionScale:1,mouthTermination:'baffled',throatTermination:'closed',movingMassCorrectionG:0,sourcePhasesDeg:[],sourceDelaysMs:[],sourceEntryZMM:[],sourceVoltageScales:[]};
const assumptions=[
 'Engineering surrogate: uniform-pressure residual cone cavity, energy-equivalent insert collection inertance, geometry-derived segmented collector and physical neck, coupled to the existing axial Webster horn and shared rear network.',
 'Insert collection uses an equal-area concentric approximation, not resolved eccentric or azimuthal flow. Its distributed cone source is reduced to one equivalent impedance. This is not an axisymmetric FEM or 3D solution.',
 'Four entries retain independent motor drives, source phase/delay, axial position and mutual loading. At one axial plane they share pressure; azimuthal modes and four-side-port interference are unresolved.',
 'Linear duct loss is an explicit circular-equivalent viscous and thermal estimate; nonlinear turbulence, vena contracta, separation, leaks and thermal compression are absent. Loss scale and junction end correction require measurement or higher-order calibration.',
 'Catalog Mms includes free-air loading. Default correction is zero; an explicit movingMassCorrectionG sensitivity subtracts inertial air mass while preserving catalog-derived Cms and Rms. The actual measurement air loading and Mmd are unknown.',
 'The forward horn terminates at maximum axial coordinate. Returning lip and its extra aperture are omitted. Uniform circular baffled mouth radiation and its on-axis integral use that same retained radius.',
 'SPL is modeled mid-only radiation. Compression-driver motor/source data, passive HF loading and crossover are absent; the saved HF model name alone does not define them.',
 'All response points are explicit reduced-model evaluations. Joining them is visual interpolation, not evidence of physical or spatial convergence. Qualified spatial samples are separate and never interpolated.',
 'A native Hornresp benchmark and measured loudspeaker validation remain separate requirements.'
];
const geometryKeys=['frontFiller','fillerClearance','fillerOpening','fillerRelief','mouth','throat','coverage','throatAngle','k','r','m','b','q','wall','tap','port','shape','slotL','slotW','slotAngle','neck','offset','gap','cutout','coneDepth','sd'];
const polygonArea=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2),polygonPerimeter=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+Math.hypot(a[0]-b[0],a[1]-b[1])},0);
function polygonCentroid(p){let cross=0,u=0,v=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],c=a[0]*b[1]-b[0]*a[1];cross+=c;u+=(a[0]+b[0])*c;v+=(a[1]+b[1])*c;}if(Math.abs(cross)<1e-20)throw Error('Degenerate collector cross-section.');return [u/(3*cross),v/(3*cross)];}
const matmul=(a,b)=>({A:add(mul(a.A,b.A),mul(a.B,b.C)),B:add(mul(a.A,b.B),mul(a.B,b.D)),C:add(mul(a.C,b.A),mul(a.D,b.C)),D:add(mul(a.C,b.B),mul(a.D,b.D))});
const identity=()=>({A:C(1),B:C(),C:C(),D:C(1)}),series=z=>({A:C(1),B:z,C:C(),D:C(1)}),shunt=y=>({A:C(1),B:C(),C:y,D:C(1)});
function inputAnalysis(input){if(input?.p&&input?.pro)return input;return M.analyze(input?.state||input||{});}
function optionsFor(input,options={}){const a=inputAnalysis(input),legacy={...(input?.acousticScreen?.options||{}),...(input?.systemAcoustics?.options||{})},saved={};for(const k of ['voltageRms','mouthTermination','throatTermination','rearLossQ','rearEndCorrectionScale'])if(legacy[k]!==undefined)saved[k]=legacy[k];return {...defaults,...saved,distanceM:a.p.listeningDistance||defaults.distanceM,...(input?.acousticWorkbench?.options||{}),...options};}
function validateOptions(o,a){
 for(const k of ['density','dynamicViscosity','prandtl','distanceM','rearLossQ'])if(!(Number.isFinite(o[k])&&o[k]>0))throw Error('Positive '+k+' is required.');
 for(const k of ['voltageRms','lossScale','endCorrection','movingMassCorrectionG'])if(!(Number.isFinite(o[k])&&o[k]>=0))throw Error('Nonnegative '+k+' is required.');
 if(!Number.isFinite(o.heatCapacityRatio)||o.heatCapacityRatio<1)throw Error('Heat-capacity ratio must be at least one.');
 if(!Number.isInteger(o.segmentCount)||o.segmentCount<4||o.segmentCount>384)throw Error('Use 4–384 passage segments.');
 const d=A.catalog[a.p.midDriver];if(!d||!A.driverMatches(a,d))throw Error('Matching, complete catalog motor data are required.');
 if(o.movingMassCorrectionG>=d.mmsG)throw Error('Moving mass correction must be smaller than catalog Mms.');
 if(o.mouthTermination!=='baffled'&&o.mouthTermination!=='matched')throw Error('Unsupported mouth termination.');
 for(const key of ['sourcePhasesDeg','sourceDelaysMs','sourceEntryZMM','sourceVoltageScales'])if(!Array.isArray(o[key])||o[key].some(x=>!Number.isFinite(x)))throw Error(key+' must contain finite numbers.');
 for(const key of ['sourcePhasesDeg','sourceDelaysMs','sourceEntryZMM','sourceVoltageScales'])if(o[key].length>a.p.count)throw Error(key+' has more values than installed drivers.');
 if(o.sourceVoltageScales.some(v=>v<0))throw Error('Source voltage scales must be nonnegative.');
}
function geometry(input,options={}){
 try{
  const a=inputAnalysis(input),o=optionsFor(input,options);validateOptions(o,a);
  const reasons=[...(a.errors||[]),...(a.directCouplingIssues||[]).map(v=>v.message),...(a.frontFiller?.issues||[]).map(v=>v.message)];
  if(a.frontFiller.enabled&&a.frontFiller.valid===false)reasons.push('The insert fails its clearance/fit checks.');
  if(a.frontFiller.enabled&&!a.frontFiller.available)reasons.push('The insert geometry is unavailable.');
  if(a.envelopePairs?.length)reasons.push('Driver/rear envelopes overlap: '+a.envelopePairs.join(', '));
  if(a.minEdge<3)reasons.push('Entry-edge spacing is below the provisional 3 mm minimum.');
  if(a.plateGap<0)reasons.push('Frame-rim / horn-wall clearance proxy is negative.');
  if(reasons.length)throw Error([...new Set(reasons)].join(' '));
  const sections=a.collectorSections;if(!Array.isArray(sections)||sections.length<2)throw Error('Collector section geometry is missing.');
  function at(f){const x=f*(sections.length-1),i=Math.min(sections.length-2,Math.floor(x)),t=x-i,l=sections[i],r=sections[i+1];const uv=l.uv.map((v,j)=>[v[0]+(r.uv[j][0]-v[0])*t,v[1]+(r.uv[j][1]-v[1])*t]),centroid=polygonCentroid(uv),offset=l.offsetMM+(r.offsetMM-l.offsetMM)*t;return {z:l.zMM+(r.zMM-l.zMM)*t,offset,u:offset+centroid[0],v:centroid[1],uv};}
  // Inertance follows the actual polygon-area-centroid centreline;
  // section frame offset alone double-counts translated insert outlines.
  // volume remains the actual axial
  // cross-section integral, rather than expanding by the centreline stretch.
  const segments=[];for(let j=o.segmentCount-1;j>=0;j--){const l=at(j/o.segmentCount),r=at((j+1)/o.segmentCount),m=at((j+.5)/o.segmentCount),lengthM=Math.hypot(r.z-l.z,r.u-l.u,r.v-l.v)*1e-3,areaM2=polygonArea(m.uv)*1e-6,volumeM3=(r.z-l.z)*(polygonArea(l.uv)+4*polygonArea(m.uv)+polygonArea(r.uv))/6*1e-9;segments.push({kind:'collector',lengthM,areaM2,volumeM3,perimeterM:polygonPerimeter(m.uv)*1e-3});}
  const sumV=segments.reduce((s,v)=>s+v.volumeM3,0),scaleV=a.collectorLoftV*1e-6/sumV;segments.forEach(v=>v.volumeM3*=scaleV);
  const neckAreaM2=a.collectorSmallArea*1e-6,neckLengthM=(a.p.neck+3)*1e-3,neckN=Math.max(2,Math.round(o.segmentCount/4));
  for(let j=0;j<neckN;j++)segments.push({kind:'neck',lengthM:neckLengthM/neckN,areaM2:neckAreaM2,volumeM3:neckAreaM2*neckLengthM/neckN,perimeterM:polygonPerimeter(a.collectorSmallUV)*1e-3});
  const residualCavityM3=(a.frontCavityV-a.collectorLoftV)*1e-6;if(!(residualCavityM3>0))throw Error('Residual cone-side volume must be positive.');
  // Kinetic-energy reduction for uniform piston injection into a thin annular
  // gap: M = integral rho/A(r) * [Q_cross(r)/Q_piston]^2 ds. Actual eccentric
  // geometry is explicitly not resolved by this equivalent concentric term.
  const pistonRadiusM=a.pistonR*1e-3,openingRadiusM=(a.frontFiller.enabled?a.frontFiller.effectiveOpeningMM/2:a.pistonR)*1e-3,gapM=a.p.fillerClearance*1e-3;
  let collectionInertance=0;const radialN=128;if(a.frontFiller.enabled&&openingRadiusM<pistonRadiusM){const dr=(pistonRadiusM-openingRadiusM)/radialN,slope=a.p.coneDepth/a.pistonR;for(let j=0;j<radialN;j++){const r=openingRadiusM+(j+.5)*dr,q=1-r*r/(pistonRadiusM*pistonRadiusM);collectionInertance+=o.density*dr*(1+slope*slope)/(2*PI*r*gapM)*q*q;}}
  let end=0;for(let i=1;i<a.pro.length;i++)if(a.pro[i].z>a.pro[end].z)end=i;const mouth=a.pro[end];
  return {available:true,analysis:a,inputState:{...a.p},segments,residualCavityM3,frontCavityCM3:a.frontCavityV,frontTotalCM3:a.frontV,collectorVolumeCM3:a.collectorLoftV,neckAreaMM2:a.collectorSmallArea,nominalPortAreaMM2:a.area,neckAreaM2,neckLengthMM:neckLengthM*1000,effectiveNeckLengthMM:(neckLengthM+o.endCorrection*Math.sqrt(neckAreaM2/PI))*1000,collectionInertanceKgM4:collectionInertance,requestedOpeningMM:a.p.fillerOpening,effectiveOpeningMM:a.frontFiller.effectiveOpeningMM||null,openingRadiusM,gapM,mouthRadiusM:mouth.r*1e-3,mouthZMM:mouth.z,nominalMouthDiameterMM:a.p.mouth,rolledLipExcluded:end<a.pro.length-1,transverseReferenceHz:1.8411837813406593*a.p.soundSpeed/(2*PI*mouth.r*1e-3),pistonAreaM2:a.p.sd*1e-4,sourceCount:a.p.count,clearanceTravelLimitMM:a.frontFiller.enabled?a.p.fillerClearance-1:Infinity,warnings:a.warnings.filter(v=>!v.includes('outside the acoustic model')),feasible:true};
 }catch(e){return {available:false,feasible:false,reason:e.message};}
}
function frontTwoPort(g,frequencyHz,options={}){
 try{
  if(!g.available)throw Error(g.reason);if(!(frequencyHz>0))throw Error('Positive frequency required.');const o={...defaults,...options},w=2*PI*frequencyHz,c=g.analysis.p.soundSpeed,rho=o.density,viscousDepth=Math.sqrt(2*o.dynamicViscosity/(rho*w)),thermalDepth=viscousDepth/Math.sqrt(o.prandtl),elements=[];
  const addElement=t=>elements.push(t);addElement(shunt(C(0,w*g.residualCavityM3/(rho*c*c))));
  const mg=g.collectionInertanceKgM4;if(mg>0){const resistance=o.lossScale*mg*Math.max(12*o.dynamicViscosity/(rho*g.gapM*g.gapM),w*viscousDepth/g.gapM);addElement(series(C(resistance,w*mg)));}
  for(const s of g.segments){const mass=rho*s.lengthM/s.areaM2,compliance=s.volumeM3/(rho*c*c),lossFraction=viscousDepth*s.perimeterM/(2*s.areaM2),r=o.lossScale*Math.max(8*PI*o.dynamicViscosity*s.lengthM/(s.areaM2*s.areaM2),w*mass*lossFraction),thermalFraction=(o.heatCapacityRatio-1)*thermalDepth*s.perimeterM/(2*s.areaM2),z=C(r,w*mass),y=C(o.lossScale*w*compliance*thermalFraction,w*compliance);addElement(matmul(matmul(series(scale(z,.5)),shunt(y)),series(scale(z,.5))));}
  addElement(series(C(0,w*rho*o.endCorrection*Math.sqrt(g.neckAreaM2/PI)/g.neckAreaM2)));
  let T=identity();for(const el of elements)T=matmul(T,el);if(abs(T.C)<1e-20)throw Error('Passage two-port is singular.');const off=div(C(1),T.C),impedance=[[div(T.A,T.C),off],[{...off},div(T.D,T.C)]];
  if(impedance.flat().some(v=>!finite(v)))throw Error('Nonfinite passage matrix.');
  return {available:true,frequencyHz,impedance,elements,model:'Unvalidated geometry-derived passive segmented equivalent passage',sampleKind:'reduced-model evaluation',viscousDepthMM:viscousDepth*1000};
 }catch(e){return {available:false,frequencyHz,reason:e.message};}
}
function targetsFor(g,options={}){const d=A.catalog[g.analysis.p.midDriver],t={lowHz:g.analysis.p.lowTarget,highHz:700,maxExcursionMM:Math.min(d.xmaxMM,g.clearanceTravelLimitMM),maxPortVelocityMS:17,...options.targets};for(const k of Object.keys(t))if(!Number.isFinite(t[k])||t[k]<=0)throw Error('Positive target '+k+' is required.');if(t.highHz<=t.lowHz)throw Error('Target band upper edge must exceed lower edge.');return t;}
function prepared(input,options={}){
 const o=optionsFor(input,options),g=geometry(input,o);if(!g.available)throw Error(g.reason);const a=g.analysis;
 const geometries=Array.from({length:a.p.count},(_,i)=>o.sourceEntryZMM[i]===undefined||o.sourceEntryZMM[i]===a.p.tap?g:geometry({...a.p,tap:o.sourceEntryZMM[i]},o));
 for(let i=0;i<geometries.length;i++){const gg=geometries[i];if(!gg.available)throw Error('Source '+(i+1)+': '+gg.reason);if(o.sourceEntryZMM[i]!==undefined&&Math.abs(gg.analysis.p.tap-o.sourceEntryZMM[i])>1e-8)throw Error('Source '+(i+1)+' position is outside allowed geometry.');}
 return {o,g,geometries,targets:targetsFor(g,o)};
}
function massAdjusted(front,g,f,o){if(!(o.movingMassCorrectionG>0))return front;const out={...front,impedance:front.impedance.map(row=>row.map(v=>({...v})))};out.impedance[0][0].i-=2*PI*f*o.movingMassCorrectionG*1e-3/(g.pistonAreaM2*g.pistonAreaM2);return out;}
function evaluated(p,f,frontProvider){
 try{
  const {o,g,geometries}=p,a=g.analysis,w=2*PI*f;
  const fronts=geometries.map(gg=>frontProvider?frontProvider(gg,f):frontTwoPort(gg,f,o));const bad=fronts.find(v=>!v.available);if(bad)throw Error(bad.reason);
  const branches=geometries.map((gg,i)=>({id:'mid-'+(i+1),analysis:gg.analysis,voltage:polar(o.voltageRms*(o.sourceVoltageScales[i]??1),(o.sourcePhasesDeg[i]||0)*PI/180-w*(o.sourceDelaysMs[i]||0)*1e-3),frontTwoPort:massAdjusted(fronts[i],gg,f,o)}));
  const r=S.solve(a,f,branches,{...o,hornLoad:'webster',loadFactor:1});if(!r.available)return r;
  // Uniform baffled disk Rayleigh integral on its axis, evaluated exactly at
  // distance measured from the retained mouth plane. Same disk as its load.
  const radius=g.mouthRadiusM,d=o.distanceM,k=w/a.p.soundSpeed,area=PI*radius*radius,q=r.horn.mouthFlow;
  const pressureRms=o.mouthTermination==='baffled'?scale(mul(q,sub(polar(1,-k*d),polar(1,-k*Math.sqrt(d*d+radius*radius)))),o.density*a.p.soundSpeed/area):null;
  const powerSplDb=10*Math.log10(Math.max(r.horn.mouthPowerW*o.density*a.p.soundSpeed/(2*PI*d*d*4e-10),1e-30));
  const rows=r.branches.map((b,i)=>{
   const gg=geometries[i],correction=C(0,w*o.movingMassCorrectionG*1e-3/(gg.pistonAreaM2*gg.pistonAreaM2)),truePistonPressure=add(b.pistonPressure,mul(correction,b.pistonFlow)),zin=abs(b.current)>1e-20?div(b.voltage,b.current):null,za=abs(b.entryFlow)>1e-20?div(b.entryPressure,b.entryFlow):null,zp=abs(b.pistonFlow)>1e-20?div(truePistonPressure,b.pistonFlow):null;
   const front=fronts[i];
   return {...b,pistonPressure:truePistonPressure,electricalImpedance:zin,electricalImpedanceOhm:zin?abs(zin):null,electricalPhaseDeg:zin?phase(zin):null,acousticImpedance:za,acousticImpedanceMagnitudePaSM3:za?abs(za):null,pistonAcousticImpedance:zp,pistonAcousticImpedanceMagnitudePaSM3:zp?abs(zp):null,portVelocityRmsMS:abs(b.entryFlow)/gg.neckAreaM2,portVelocityPeakMS:Math.SQRT2*abs(b.entryFlow)/gg.neckAreaM2,entryPhaseDeg:phase(b.entryFlow),frontModel:front.model||'Qualified spatial two-port at exact frequency'};
  });
  const first=rows[0];return {available:true,frequencyHz:f,sampleKind:frontProvider?'qualified spatial front sample with reduced horn/rear coupling':'explicit reduced-model evaluation',splDb:pressureRms?db(abs(pressureRms)/2e-5):null,phaseDeg:pressureRms?phase(pressureRms):null,pressureRms,pressureRmsPa:pressureRms?abs(pressureRms):null,powerSplDb,mouthFlow:r.horn.mouthFlow,mouthFlowRmsM3s:abs(r.horn.mouthFlow),mouthFlowPhaseDeg:phase(r.horn.mouthFlow),mouthPowerW:r.horn.mouthPowerW,electricalImpedance:first.electricalImpedance,electricalImpedanceOhm:first.electricalImpedanceOhm,acousticImpedance:first.acousticImpedance,acousticImpedanceMagnitudePaSM3:first.acousticImpedanceMagnitudePaSM3,excursionPeakMM:Math.max(...rows.map(v=>v.excursionPeakMM)),portVelocityPeakMS:Math.max(...rows.map(v=>v.portVelocityPeakMS)),inputPowerW:r.inputPowerW,lossPowerW:r.lossPowerW,relativePowerResidual:r.relativePowerResidual,powerResidual:r.relativePowerResidual,branches:rows,horn:r.horn};
 }catch(e){return {available:false,frequencyHz:f,reason:e.message};}
}
function solve(input,frequencyHz,options={}){try{return evaluated(prepared(input,options),frequencyHz)}catch(e){return {available:false,frequencyHz,reason:e.message};}}
function frequencies(o,targets){if(o.frequenciesHz){if(!Array.isArray(o.frequenciesHz)||!o.frequenciesHz.length||o.frequenciesHz.some(f=>!Number.isFinite(f)||f<=0))throw Error('Frequencies must be positive.');return [...new Set(o.frequenciesHz)].sort((a,b)=>a-b);}if(!(o.minHz>0&&o.maxHz>o.minHz&&Number.isInteger(o.points)&&o.points>=3&&o.points<=2001))throw Error('Choose positive increasing frequency bounds and 3–2001 samples.');return [...new Set([...Array.from({length:o.points},(_,i)=>o.minHz*Math.pow(o.maxHz/o.minHz,i/(o.points-1))),...[targets?.lowHz,targets?.highHz].filter(f=>f>=o.minHz&&f<=o.maxHz)])].sort((a,b)=>a-b);}
function summary(rows,p){
 const good=rows.filter(r=>r.available),band=good.filter(r=>r.frequencyHz>=p.targets.lowHz*(1-1e-10)&&r.frequencyHz<=p.targets.highHz*(1+1e-10));if(!good.length)throw Error(rows[0]?.reason||'No available samples.');if(!band.length)throw Error('No samples fall in the target band.');
 const max=(key,array=band)=>Math.max(...array.map(v=>v[key])),min=(key,array=band)=>Math.min(...array.map(v=>v[key])),levels=band.map(r=>r.splDb===null?r.powerSplDb:r.splDb),mean=levels.reduce((a,b)=>a+b,0)/levels.length,x=max('excursionPeakMM'),v=max('portVelocityPeakMS'),physicalExcursionLimit=Math.min(p.targets.maxExcursionMM,p.g.clearanceTravelLimitMM,A.catalog[p.g.analysis.p.midDriver].xmaxMM),xf=physicalExcursionLimit/Math.max(x,1e-30),vf=p.targets.maxPortVelocityMS/Math.max(v,1e-30),headroom=Math.min(xf,vf),bad=rows.filter(r=>!r.available),complete=bad.length===0;
 const inputNominal=p.o.voltageRms,xa=max('excursionPeakMM',good),va=max('portVelocityPeakMS',good),xfa=physicalExcursionLimit/Math.max(xa,1e-30),vfa=p.targets.maxPortVelocityMS/Math.max(va,1e-30),fullHeadroom=Math.min(xfa,vfa);return {bandLowHz:p.targets.lowHz,bandHighHz:p.targets.highHz,bandSamples:band.length,bandRippleDb:Math.max(...levels)-Math.min(...levels),meanSplDb:mean,minSplDb:Math.min(...levels),maximumExcursionPeakMM:x,maximumPortVelocityPeakMS:v,maximumExcursionAcrossSpectrumMM:max('excursionPeakMM',good),maximumPortVelocityAcrossSpectrumMS:max('portVelocityPeakMS',good),minimumElectricalImpedanceOhm:min('electricalImpedanceOhm',good),maximumRelativePowerResidual:Math.max(...good.map(r=>Math.abs(r.relativePowerResidual))),maxVoltageAllowed:inputNominal>0?inputNominal*fullHeadroom:null,maxVoltageInTargetBandAllowed:inputNominal>0?inputNominal*headroom:null,voltageLimitScope:'All simulated frequencies; peak between samples may be missed. No crossover assumed.',voltageHeadroomDb:inputNominal>0?db(fullHeadroom):null,limitingConstraint:xfa<vfa?'excursion/insert clearance':'entry velocity',effectiveExcursionLimitMM:physicalExcursionLimit,constraintsPassed:complete&&xa<=physicalExcursionLimit&&va<=p.targets.maxPortVelocityMS,bandConstraintsPassed:complete&&x<=physicalExcursionLimit&&v<=p.targets.maxPortVelocityMS,allSamplesAvailable:complete,unavailableSamples:bad.length,score:(Math.max(...levels)-Math.min(...levels))+20*Math.max(0,Math.log10(x/physicalExcursionLimit))+20*Math.max(0,Math.log10(v/p.targets.maxPortVelocityMS)),scoreMeaning:'Lower = less sampled in-band SPL ripple plus excursion/velocity over-limit penalties; not a global optimum.',inputDriveV:inputNominal};
}
function assemble(p,rows,model,extra={}){
 const s=summary(rows,p),{analysis,...publicGeometry}=p.g;return {available:true,model,qualification:'Unvalidated system-level engineering model; no native Hornresp or measurement equivalence claim',rows,summary:s,geometry:publicGeometry,inputState:{...p.g.analysis.p},options:p.o,targets:p.targets,assumptions:[...assumptions],warnings:[...p.g.warnings,...(p.o.sourceEntryZMM.some(z=>z!==p.g.analysis.p.tap)?['Custom per-source axial positions are a network study: individual station fits are checked, but mixed-station driver collisions need joint CAD verification.']:[]),...(!s.allSamplesAvailable?['Some frequencies are unavailable; do not interpolate through them.']:[]),...(!s.constraintsPassed?['Linear excursion or velocity constraint exceeded within the simulated spectrum; candidate is not feasible at this drive.']:[])],reference:{amplitude:'RMS',phasor:'exp(+j omega t)',distanceM:p.o.distanceM,distanceOrigin:'retained mouth plane',spl:'Uniform baffled circular aperture, on-axis finite distance, re 20 µPa RMS',powerSpl:'Hemisphere-equivalent pressure from solved acoustic power; not on-axis SPL',electricalImpedance:'Per-driver terminal V/I; first branch shown in scalar summary',velocity:'Peak cross-section average at the polygonal entry; not local maximum flow',hf:'No HF motor, passive load or crossover supplied'},...extra};
}
function baseline(input,options={}){try{const p=prepared(input,options),rows=frequencies(p.o,p.targets).map(f=>evaluated(p,f));return assemble(p,rows,'Broadband segmented-passage / coupled 1D MEH surrogate')}catch(e){return {available:false,reason:e.message,rows:[]};}}
function sparseReference(input,data,options={}){
 try{
  const p=prepared(input,{...options,lossScale:0,endCorrection:0}),a=p.g.analysis;if(data?.format!=='MEH-spatial-front-v1'||data.available!==true||data.convergence?.passed!==true)throw Error('A qualified spatial-front dataset is required.');
  if(data.geometrySourceSha256!=='418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5')throw Error('Spatial geometry implementation does not match this editor.');
  for(const key of ['userDesignSha256','airSurfaceSha256','meshSha256'])if(!/^[a-f0-9]{64}$/.test(data[key]||''))throw Error('Spatial data provenance is missing.');
  const expected=M.normalize(data.inputState);for(const gg of p.geometries){const changed=geometryKeys.filter(k=>gg.analysis.p[k]!==expected[k]);if(changed.length)throw Error('Spatial dataset geometry differs: '+changed.join(', '));}
  if(data.medium?.densityKgM3!==p.o.density||data.medium?.soundSpeedMS!==a.p.soundSpeed)throw Error('Spatial medium differs.');
  if(data.conventions?.phasor!=='exp(+j omega t)'||data.conventions.amplitude!=='RMS'||data.conventions.flows!=='into-domain'||data.conventions.impedanceUnits!=='Pa s/m3'||data.conventions.domain!=='cone-to-horn-entry')throw Error('Spatial matrix conventions differ.');
  if(!(data.coneProjectedAreaM2>0))throw Error('Spatial source projected area missing.');
  const qualified=data.rows.filter(r=>r.available===true&&r.qualified===true);if(!qualified.length)throw Error('No qualified spatial frequencies.');
  const rows=qualified.map(row=>evaluated(p,row.frequencyHz,gg=>{const ratio=data.coneProjectedAreaM2/gg.pistonAreaM2,t=[ratio,1];return {available:true,frequencyHz:row.frequencyHz,impedance:row.impedance.map((r,i)=>r.map((v,j)=>scale(v,t[i]*t[j]))),model:'Qualified lossless 3D front matrix; physical tube retained, no extra end correction'};}));
  return assemble(p,rows,'Exact spatial-front samples / coupled 1D MEH network',{source:{meshSha256:data.meshSha256,geometrySourceSha256:data.geometrySourceSha256,qualifiedFrequencyHz:qualified.map(r=>r.frequencyHz)},noInterpolation:true,frontOptionsApplied:{lossScale:0,endCorrection:0},qualification:'Front two-port numerically qualified at listed frequencies only; coupled horn/rear and radiation remain reduced models.'});
 }catch(e){return {available:false,reason:e.message,rows:[]};}
}
function sweep(input,spec,options={}){
 try{
  if(!spec||!Array.isArray(spec.values)||!spec.values.length||spec.values.length>81)throw Error('Provide 1–81 explicit sweep values.');
  const p=prepared(input,options),base=p.g.analysis.p,allowed=['portAreaMM2','neckMM','frontVolumeCM3','entryZMM','gapMM'];if(!allowed.includes(spec.parameter))throw Error('Sweep parameter must be '+allowed.join(', '));
  const candidates=spec.values.map(value=>{let state={...base},a=null;try{
   if(!(Number.isFinite(value)&&value>0))throw Error('Positive finite sweep value required.');
   if(spec.parameter==='portAreaMM2'){const factor=Math.sqrt(value/p.g.nominalPortAreaMM2);state={...state,areaLocked:false,areaTarget:value,...(base.shape==='round'?{port:base.port*factor}:{slotL:base.slotL*factor,slotW:base.slotW*factor})};}
   if(spec.parameter==='neckMM')state.neck=value;if(spec.parameter==='entryZMM')state.tap=value;if(spec.parameter==='gapMM')state.gap=value;
   if(spec.parameter==='frontVolumeCM3'){const probe=M.analyze({...base,gap:base.gap<69?base.gap+1:base.gap-1}),derivative=(probe.frontCavityV-p.g.frontCavityCM3)/(probe.p.gap-base.gap);if(!(derivative>0))throw Error('Front-volume change cannot be mapped to a valid standoff.');state.gap=base.gap+(value-p.g.frontCavityCM3)/derivative;}
   a=M.analyze(state);if(['neck','tap','gap','port','slotL','slotW'].some(k=>Math.abs(a.p[k]-state[k])>1e-7))throw Error('Requested candidate exceeds editor geometry bounds; it was not silently clamped.');
   if(spec.parameter==='portAreaMM2'&&Math.abs(a.area-value)>1e-5*Math.max(1,value))throw Error('Requested port area cannot be realized.');if(spec.parameter==='frontVolumeCM3'&&Math.abs(a.frontCavityV-value)>1e-4*Math.max(1,value))throw Error('Requested front volume cannot be realized by standoff.');
   const result=baseline(a,p.o);if(!result.available)throw Error(result.reason);return {value,label:spec.parameter+' = '+Number(value.toFixed(3)),state:{...a.p},geometry:result.geometry,available:true,feasible:result.summary.constraintsPassed,reason:result.summary.constraintsPassed?'':'Simulated-spectrum excursion or velocity constraint failed.',result,summary:result.summary,score:result.summary.score};
  }catch(e){return {value,label:spec.parameter+' = '+value,state:a?.p||state,available:false,feasible:false,reason:e.message,result:null,score:null};}});
  const ranked=candidates.filter(c=>c.available&&c.feasible).sort((a,b)=>a.score-b.score);return {available:true,parameter:spec.parameter,candidates,targets:p.targets,bestValue:ranked[0]?.value??null,ranking:'Feasible sampled candidates only; minimum sampled band ripple plus over-limit penalties. Model uncertainty is not included.',assumptions};
 }catch(e){return {available:false,reason:e.message,candidates:[]};}
}
function csv(result){if(!result?.available)return '';const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"',rows=[['Model',result.model],['Qualification',result.qualification],['Options',JSON.stringify(result.options)],['Targets',JSON.stringify(result.targets)],['Reference',JSON.stringify(result.reference)],['frequency_Hz','available','on_axis_SPL_dB','power_equivalent_SPL_dB','on_axis_phase_deg','mouth_Q_RMS_m3_s','mouth_Q_phase_deg','mid1_Ze_real_ohm','mid1_Ze_imag_ohm','mid1_Za_real_Pa_s_m3','mid1_Za_imag_Pa_s_m3','max_excursion_peak_mm','max_entry_velocity_peak_m_s','mouth_power_W','relative_power_residual','sample_kind','reason']];for(const r of result.rows)rows.push([r.frequencyHz,r.available,r.splDb,r.powerSplDb,r.phaseDeg,r.mouthFlowRmsM3s,r.mouthFlowPhaseDeg,r.electricalImpedance?.r,r.electricalImpedance?.i,r.acousticImpedance?.r,r.acousticImpedance?.i,r.excursionPeakMM,r.portVelocityPeakMS,r.mouthPowerW,r.relativePowerResidual,r.sampleKind,r.reason]);return rows.map(row=>row.map(quote).join(',')).join('\n');}
return {defaults,assumptions,geometry,frontTwoPort,solve,baseline,sweep,sparseReference,targetsFor,csv};
};
