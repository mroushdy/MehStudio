/* Qualified spatial-front data + live coupled reduced-system evaluation.
 * A dataset is tied to its normalized geometry, medium and source snapshot.
 * No interpolation, nearest-frequency substitution or insert LC fallback.
 */
module.exports=function createSpatialStudy(M,S){
const sourceSha256='418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5';
const abs=v=>Math.hypot(v.r,v.i),finite=v=>Number.isFinite(v?.r)&&Number.isFinite(v?.i);
const geometryKeys=['frontFiller','fillerClearance','fillerOpening','fillerRelief','mouth','throat','coverage','throatAngle','k','r','m','b','q','wall','tap','port','areaTarget','areaLocked','shape','slotL','slotW','slotAngle','neck','offset','gap','cutout','coneDepth','sd'];
function validate(data,a,options={}){
 try{
  if(data?.format!=='MEH-spatial-front-v1'||data.available!==true)throw Error('Choose a qualified MEH spatial-front result.');
  if(data.geometrySourceSha256!==sourceSha256)throw Error('The result uses a different geometry implementation. Recalculate the passage.');
  for(const key of ['userDesignSha256','airSurfaceSha256','meshSha256'])if(!/^[a-f0-9]{64}$/.test(data[key]||''))throw Error('Spatial result is missing its geometry or mesh provenance.');
  if(!data.inputState||geometryKeys.some(key=>!(key in data.inputState)))throw Error('Spatial result is missing geometry inputs.');
  const expected=M.normalize(data.inputState),changed=geometryKeys.filter(key=>expected[key]!==a.p[key]);
  if(changed.length)throw Error('Passage changed ('+changed.join(', ')+'). Recalculate its spatial result.');
  const rho=options.density??1.204,c=a.p.soundSpeed;
  if(data.medium?.densityKgM3!==rho||data.medium?.soundSpeedMS!==c)throw Error('The medium changed. Recalculate the spatial result.');
  const convention=data.conventions;
  if(convention?.phasor!=='exp(+j omega t)'||convention.amplitude!=='RMS'||convention.flows!=='into-domain'||convention.impedanceUnits!=='Pa s/m3'||convention.domain!=='cone-to-horn-entry')throw Error('Unsupported spatial port or phasor convention.');
  const area=data.coneProjectedAreaM2;
  if(!Number.isFinite(area)||area<=0||data.convergence?.passed!==true||!Array.isArray(data.rows)||data.rows.length<2)throw Error('Spatial result needs a positive projected cone area and a qualified convergence study.');
  const seen=new Set();for(const row of data.rows){if(!Number.isFinite(row.frequencyHz)||row.frequencyHz<=0||seen.has(row.frequencyHz))throw Error('Spatial frequencies must be positive and unique.');seen.add(row.frequencyHz);if(row.available!==true)continue;if(row.qualified!==true||!Array.isArray(row.impedance)||row.impedance.length!==2||row.impedance.some(r=>!Array.isArray(r)||r.length!==2||r.some(v=>!finite(v))))throw Error('A spatial row lacks qualification or a finite two-port matrix.');}
  return {available:true,areaRatio:area/(a.p.sd*1e-4)};
 }catch(e){return {available:false,reason:e.message};}
}
function matrix(data,a,frequencyHz,options={}){
 const status=validate(data,a,options);if(!status.available)return status;
 const row=data.rows.find(r=>r.frequencyHz===frequencyHz);
 if(!row||row.available!==true||row.qualified!==true)return {available:false,reason:row?.reason||'No qualified spatial result at this frequency.'};
 // Q_FEM = areaRatio * Q_catalog; P_catalog = areaRatio * P_FEM.
 // The congruence transform preserves power, reciprocity and passivity.
 const t=[status.areaRatio,1];return {available:true,frequencyHz,impedance:row.impedance.map((r,i)=>r.map((v,j)=>({r:v.r*t[i]*t[j],i:v.i*t[i]*t[j]})))};
}
function analyze(a,data,options={}){
 try{
  if(!a?.p)throw Error('Generate or import a design first.');
  if(a.errors?.length)throw Error('Resolve the geometry errors before calculating acoustics.');
  if(a.directCouplingIssues?.length||a.frontFiller?.valid===false)throw Error('Resolve the front-passage fit before calculating acoustics.');
  if(options.inputError)throw Error(options.inputError);
  if(options.hornLoad&&options.hornLoad!=='webster')throw Error('Choose the actual-profile horn model in Acoustic screen.');
  const drive=options.voltageRms??1;if(!Number.isFinite(drive)||drive<.05||drive>100)throw Error('Use a drive of 0.05–100 V RMS per mid.');
  const spatial=a.p.frontFiller!=='none'||options.useSpatialFront===true;if(spatial){const v=validate(data,a,options);if(!v.available)throw Error(data?v.reason:'The insert needs a spatial passage calculation for these dimensions.');}
  const frequencies=spatial?data.rows.map(r=>r.frequencyHz).sort((a,b)=>a-b):Array.from({length:37},(_,i)=>100+25*i);
  const rows=frequencies.map(frequencyHz=>{
   const front=spatial?matrix(data,a,frequencyHz,options):undefined;if(front&&!front.available)return {available:false,frequencyHz,reason:front.reason};
   const result=S.solve(a,frequencyHz,Array.from({length:a.p.count},(_,i)=>({id:'mid-'+(i+1),analysis:a,voltage:{r:drive,i:0},frontTwoPort:front})),options);
   if(!result.available)return result;
   const branches=result.branches.map(b=>({...b,impedanceOhm:abs(b.voltage)/abs(b.current),entryPressureRmsPa:abs(b.entryPressure),entryPhaseDeg:Math.atan2(b.entryFlow.i,b.entryFlow.r)*180/Math.PI}));
   return {...result,branches,mouthFlowRmsLS:abs(result.horn.mouthFlow)*1000,mouthPowerW:result.horn.mouthPowerW};
  });
  if(!rows.some(r=>r.available))throw Error(rows[0]?.reason||'No qualified frequencies.');
  return {available:true,rows,spatial,voltageRms:drive,inputState:{...a.p},options:{density:1.204,endCorrection:1.4,rearLossQ:7,rearEndCorrectionScale:1,hornLoad:'webster',mouthTermination:'baffled',throatTermination:'closed',...options},source:spatial?{geometrySourceSha256:data.geometrySourceSha256,airSurfaceSha256:data.airSurfaceSha256,meshSha256:data.meshSha256,convergence:data.convergence}:null,assumptions:rows.find(r=>r.available).assumptions};
 }catch(e){return {available:false,reason:e.message,rows:[]};}
}
function csvBaseline(baseline){return csv({...baseline,baseline:null});}
function csv(result){
 if(!result?.available)return '';
 const escape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const lines=[['Model','Experimental coupled mids; '+(result.spatial?'spatial front passage':'lumped front passage')+' / 1D horn'],['Drive V RMS per mid',result.voltageRms],['Current normalized design',JSON.stringify(result.inputState)],['Calculation options',JSON.stringify(result.options)],['Limit','Not SPL or directivity; catalog Mms free-air loading convention unresolved'],['Mesh SHA256',result.source?.meshSha256||'not applicable'],['Geometry source SHA256',result.source?.geometrySourceSha256||'not applicable'],['Convergence',JSON.stringify(result.source?.convergence||null)],['Hz','available','mid','axial position mm','impedance ohm','excursion mm peak','entry velocity m/s peak','entry pressure Pa RMS','entry phase deg','mouth flow L/s RMS total','mouth load power W total','relative power residual','reason']];
 for(const row of result.rows)if(!row.available)lines.push([row.frequencyHz,false,'','','','','','','','','','',row.reason]);else for(const b of row.branches)lines.push([row.frequencyHz,true,b.id,b.zMM,b.impedanceOhm,b.excursionPeakMM,b.entryVelocityPeakMS,b.entryPressureRmsPa,b.entryPhaseDeg,row.mouthFlowRmsLS,row.mouthPowerW,row.relativePowerResidual,'']);
 const csv=lines.map(row=>row.map(escape).join(',')).join('\n');
 return result.baseline?.available?csv+'\n\n'+escape('Open-collector reference: same drive and external network')+'\n'+csvBaseline(result.baseline):csv;
}
return {validate,matrix,analyze,csv,geometryKeys,sourceSha256};
};
