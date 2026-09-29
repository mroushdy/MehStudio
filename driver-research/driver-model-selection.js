function driverModel(input,kind='mid',opts={}){
 if(!driverCatalog)return null;let entry,id;
 if(kind==='mid'){const m=matchMidDriver(input);if(!m?.mechanicalMatch||Math.abs(Number(input.coneDepth??defaults.coneDepth)-defaults.coneDepth)>1e-6)return null;entry=m.driver;id=m.id;}
 else{
  entry=drivers.compression[input.compressionDriver];id=input.compressionDriver;if(!entry)return null;
  const exits=[entry.throatMM,entry.record?.dimensions?.nominalExitDiameter?.value].filter(Number.isFinite);
  if(!exits.some(v=>Math.abs(Number(input.throat??entry.throatMM)-v)<1e-6))return null;
  // Unsupported coupling must remain visibly inspectable in an imported study.
  // Showing a sourced body does not change its mechanical/acoustic eligibility.
 }
 const record=driverCatalog.byId[entry.sourceRecordId];if(!record?.geometry.parts.length)return null;
 const mountOffsetMM=kind==='mid'?(record.dimensions.mountingFaceOffset?.value??record.dimensions.flangeThickness?.value??0):0;
 return {id,entry,record,mountOffsetMM,model:driverCatalog.makeModel(record,opts),status:record.modelStatus,approximate:record.geometry.parts.some(p=>p.status==='approximate'),envelopeOnly:!record.geometry.parts.some(p=>p.status==='approximate'&&p.type!=='bolt-pattern'&&!/guide/i.test(p.name))};
}
