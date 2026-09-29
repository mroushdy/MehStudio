const midMechanicalKeys=['frame','cutout','driverDepth'];
function matchMidDriver(input={}){
 const p={...defaults,...input},explicit=Object.prototype.hasOwnProperty.call(input,'midDriver')?input.midDriver:null;
 if(explicit==='custom'||explicit&&!drivers.mid[explicit])return null;
 const matches=d=>d.available!==false&&midMechanicalKeys.every(k=>{
  if(!Number.isFinite(d.parameters[k]))return false;
  // Preserve saved designs that use the manufacturer's explicitly published
  // rounded frame envelope. This is not an arbitrary fitting tolerance.
  const values=[d.parameters[k]];
  if(k==='frame'&&Number.isFinite(d.record?.dimensions?.publishedRoundedDiameter?.value))values.push(d.record.dimensions.publishedRoundedDiameter.value);
  return values.some(v=>Math.abs(Number(p[k])-v)<1e-6);
 });
 const candidates=explicit?[[explicit,drivers.mid[explicit]]]:Object.entries(drivers.mid).filter(([,d])=>matches(d));
 // A shared chassis is not motor identity. Old unnamed imports may resolve
 // only when there is exactly one matching mechanical catalogue entry.
 if(candidates.length!==1)return null;
 const [id,driver]=candidates[0],mechanicalMatch=matches(driver),acousticMatch=mechanicalMatch&&driver.hasMotorData===true&&['sd','fs','qts','vas'].every(k=>Number.isFinite(driver.parameters[k])&&Math.abs(Number(p[k])-driver.parameters[k])<1e-6);
 return {id,driver,record:driverCatalog?.byId[driver.sourceRecordId]||null,mechanicalMatch,acousticMatch};
}
