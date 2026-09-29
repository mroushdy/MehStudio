// Optional full inspected catalogue. Mechanical records own dimensions; motor
// eligibility is separate and never inferred from the presence of a model name.
const driverCatalog=root.MEHDriverCatalog||(typeof require==='function'?require('./driver-catalog.js'):null);
if(driverCatalog){
 for(const [id,d] of Object.entries(driverCatalog.mid)){
  const baseline=drivers.mid[id];
  drivers.mid[id]={...baseline,...d,parameters:{...baseline?.parameters,...d.parameters}};
 }
 for(const [id,d] of Object.entries(driverCatalog.compression))drivers.compression[id]={...drivers.compression[id],...d};
}
for(const [id,motor] of Object.entries(driverCatalog?.motors||{})){
 const d=drivers.mid[id],eligibility=driverCatalog.motorEligibility(d?.record,motor);
 if(!d||d.available===false||!eligibility.available)continue;
 const publishedDisplacement=Number.isFinite(motor.driverVol)&&motor.driverVol>0;
 const values=Object.fromEntries(['sd','fs','qts','vas'].map(k=>[k,motor[k]]));
 if(publishedDisplacement)values.driverVol=motor.driverVol;
 drivers.mid[id]={...d,nominalDiameterInches:motor.nominalDiameterIn,
  parameters:{...d.parameters,...values},
  nominalPowerW:motor.nominalPowerW,xmaxMM:motor.xmaxMM,reOhm:motor.re,leMH:motor.leMH,mmsG:motor.mmsG,blTm:motor.bl,
  hasMotorData:true,hasTSData:true,acousticsReady:true,driverVolumeIsEnvelope:!publishedDisplacement,
  parameterStatus:{...d.parameterStatus,driverVol:publishedDisplacement?'published':'conservative-envelope',sd:'published',fs:'published',qts:'published',vas:'published'},
  acousticNote:'Reviewed manufacturer '+motor.review.variant+' motor dataset; acoustic predictions remain screening estimates.'+(publishedDisplacement?'':' Driver displacement remains a conservative packaging allowance.'),motorSource:motor.source};
}
