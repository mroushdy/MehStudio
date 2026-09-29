/* Inspected manufacturer driver catalogue; generated from driver-research/records.
 * Source dimensions are separate from acoustic motor data and approximate exterior geometry. */
(function(root){'use strict';
const records=/* CATALOG_RECORDS */[];
const motors=/* CATALOG_MOTORS */{};
const byId=Object.fromEntries(records.map(r=>[r.id,r]));
const mid={},compression={};
const sd={bc5ndl38:95,bc6ndl38:132,bc6mdn44:132,'18sound6nd410':143,'18sound6nmb420':130,'18sound6nmb900':130,faitalpro6pr160:130,sica6n25pl:122.7,beyma6p200nd:135,beyma6p200fe:135,faitalpro6pr150:137,faitalpro6fe200:131,celestiontf0615:153.94,faitalpro5pr160:85.2,beyma5p200ndn:95,beyma5p200fe:95,faitalpro5fe120:84,celestiontf0512he:78.54};
const low={bms4594he:300,bms4593he:300,bms4594nd:300,bms4593nd:300,bms4595he:300,bms4595nd:300,bms4592nd:300,bms4590:300,bms4590p:300,bcdcx464:300,bcdcx354:400,bcdcx462:300,bcde1090tn:800,bcde991tn:1000,bcde880tn:1200,faitalprohf1440:700,faitalprohf146r:900,faitalprohf148c:900,celestioncdx143045:800,celestioncdx143055:800,'18soundnsd4015n':800,'18soundnd3st':1200,bcdcm420:300};
const internal={bcdcx464:4000,bcdcx462:4000,bcdcx354:4500};
const value=(r,k)=>r.dimensions[k]?.value;
function maxDiameter(r){return Math.max(...['overallDiameter','overallDiagonal','overallWidth','overallHeight'].map(k=>typeof value(r,k)==='number'?value(r,k):0));}
function rearBound(r){let max=0;for(const p of r.geometry.parts){if(p.type==='bolt-pattern'||/guide/i.test(p.name))continue;const q=p.params;if(p.type==='lathe')for(const v of q.profile)max=Math.max(max,v[1]);else if(Number.isFinite(q.z)&&Number.isFinite(q.depth))max=Math.max(max,q.z+q.depth);}return Math.max(value(r,'rearDepth')??value(r,'mountingDepth')??value(r,'depth')??0,max);}
for(const r of records){const id=r.id==='bcdcx464'?'bcDcx464':r.id,source=r.sources.find(s=>s.id==='product')?.url||r.sources[0]?.url;const common={id,name:r.name+(r.category==='cone'?' ('+r.variant.replace('ohm','Ω')+')':''),source,sourceRecordId:r.id,modelRecordId:r.id,mechanicalStatus:r.modelStatus,category:r.category,record:r,available:true,unavailableReason:'',hasMotorData:false,hasTSData:false,acousticsReady:false,issues:[...r.unresolved],shortStatus:r.modelStatus==='dimensioned-reconstruction'?'Drawing inspected':r.modelStatus==='unresolved'?'Unresolved geometry':'Envelope only',statusDescription:r.modelStatus==='dimensioned-reconstruction'?'Source-backed dimensions; each rendered part retains its approximation status.':r.modelStatus==='unresolved'?'No reliable maximum mechanical envelope.':'Published screening envelope; detailed shape and some mounting features remain unverified.',assumptions:'Manufacturer mechanical data supports screening only. '+(r.modelStatus==='dimensioned-reconstruction'?'Undimensioned contours are approximate. ':'Body mesh is an envelope, not a solid manufacturing model. ')+r.unresolved.join(' ')};
if(r.category==='cone'){
 const frame=maxDiameter(r),cutout=value(r,'cutoutDiameter'),driverDepth=value(r,'packagingEnvelopeDepth')??value(r,'depth'),parameters={};
 for(const[k,v]of Object.entries({frame,cutout,driverDepth,sd:motors[r.id]?.sd??sd[r.id]}))if(Number.isFinite(v)&&v>0)parameters[k]=v;
 // Until measured displacement is sourced, the full frame/depth cylinder is an
 // explicitly conservative packaging allowance. It is never a motor parameter.
 if(frame&&driverDepth)parameters.driverVol=Math.round(Math.PI*(frame/2)**2*driverDepth/1e6*1000)/1000;
 const unavailable=r.modelStatus==='unresolved'||!frame||!cutout||!driverDepth||!(sd[r.id]??motors[r.id]?.sd);
 mid[id]={...common,nominalDiameterInches:motors[r.id]?.nominalDiameterIn??value(r,'nominalDiameterInches'),parameters,mechanicalKeys:['frame','cutout','driverDepth'],available:!unavailable,unavailableReason:unavailable?'Maximum frame outline or required dimensions are unresolved; manufacturer drawing needs correction.':'',assistedAvailable:!unavailable,driverVolumeIsEnvelope:true,parameterStatus:{frame:'published-envelope',cutout:r.dimensions.cutoutDiameter?.status||'unknown',driverDepth:r.dimensions.packagingEnvelopeDepth?.status||r.dimensions.depth?.status||'unknown',sd:'published',driverVol:'conservative-envelope'},acousticNote:'Motor data has not been verified for this catalogue entry. Geometry and area-ratio calculations are available; response, excursion and Qtc screening are unavailable.',sdSource:source};
}else{
 const diameterMM=maxDiameter(r),depthMM=rearBound(r),throatMM=value(r,'exitDiameter'),boltCircleMM=value(r,'boltCircleDiameter'),primaryPattern=r.geometry.parts.find(p=>p.type==='bolt-pattern'),boltCount=primaryPattern?.params.count||value(r,'boltCount'),phaseProjectionMM=value(r,'phasePlugProjection')||0;
 let unavailableReason='';if(r.audit?.fitCheckStatus==='unresolved-exact-variant-envelope')unavailableReason='The exact selected model variant lacks a verified mechanical envelope; a related model drawing cannot establish its crossover or terminal clearances.';else if(!diameterMM||!depthMM||!throatMM)unavailableReason='Required mechanical envelope or exit dimensions are unresolved.';else if(!value(r,'overallDiameter')&&!value(r,'overallDiagonal'))unavailableReason='Only body width is published; a verified maximum radial envelope is required before checking fit.';else if(!boltCircleMM||!boltCount)unavailableReason='Mounting bolt pattern is not verified; a compatible adapter cannot yet be generated.';else if(r.category==='mf-compression')unavailableReason='MF-only driver needs a separate HF driver and coupling architecture, which this horn editor does not yet represent.';else if(phaseProjectionMM>12)unavailableReason='The phase plug projects '+phaseProjectionMM+' mm ahead of the mounting face; this needs a dedicated throat coupling beyond the current 12 mm adapter.';
 compression[id]={...common,throatMM,diameterMM,depthMM,boltCircleMM,boltCount,boltThread:value(r,'boltThread')||'',boltPatterns:r.geometry.parts.filter(p=>p.type==='bolt-pattern').map(p=>({...p.params})),phaseProjectionMM,available:!unavailableReason,unavailableReason,assistedAvailable:!unavailableReason,coaxial:r.category==='coaxial-compression',hfOnly:r.category==='hf-compression',wideband:r.category==='wideband-compression',recommendedLowCrossoverHz:low[r.id]??null,recommendedInternalCrossoverHz:r.category==='coaxial-compression'?(internal[r.id]||6300):null,hasInternalPassiveCrossover:r.id==='bms4590p',acousticNote:r.category==='coaxial-compression'?'Separate MF and HF sections require measured crossover design.':'Single compression section: no internal MF/HF crossover; cone handoff must meet its measured operating range.'};
}}
// Motor completeness is independent of mechanical geometry and appearance.
function motorEligibility(record,motor){
 const required=['sd','fs','qts','vas','re','mmsG','bl','qms','xmaxMM','nominalPowerW'];
 const missing=required.filter(k=>!Number.isFinite(motor?.[k])||motor[k]<=0);
 if(!Number.isFinite(motor?.leMH)||motor.leMH<0)missing.push('leMH');
 if(!record||record.category!=='cone'||motor?.id!==record.id)missing.push('exact model identity');
 if(!motor?.source||!motor.review||motor.review.variant!==record?.variant)missing.push('reviewed impedance variant');
 return {available:missing.length===0,missing};
}
const cache=new Map();
function makeModel(record,opts={}){const key=record.id+'|'+(opts.segments||64)+'|'+(opts.envelopes!==false)+'|'+(opts.appearance!==false);if(cache.has(key))return cache.get(key);let runtime=root.DriverModels;if(!runtime&&typeof require==='function')runtime=require('../driver-research/model-runtime.js');if(!runtime)return null;const model=runtime.makeModel(record,opts);cache.set(key,model);return model;}
const api={records,byId,mid,compression,motors,motorEligibility,makeModel,meshRecord:id=>byId[id==='bcDcx464'?'bcdcx464':id]||null};
root.MEH_DRIVER_RECORDS=records;root.MEHDriverCatalog=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
