/* Read-only handshake with the independent mesh exporter. Does not convert an
 * exported mesh into a solved acoustic operator or collapse azimuthal sources. */
module.exports=function createGeometryManifest(M){
 const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
 function validate(manifest,input,expected={}){
  try{
   const a=input?.p?input:M.analyze(input?.state||input);
   if(manifest?.schema!=='meh-acoustic-geometry/v1'||manifest.schema_version!==1)throw Error('Unsupported mesh geometry manifest.');
   for(const key of ['design_sha256','normalized_state_sha256','source_design_file_sha256','editor_sha256'])if(!/^[a-f0-9]{64}$/.test(manifest[key]||''))throw Error('Missing manifest provenance: '+key);
   if(expected.designSha256&&expected.designSha256!==manifest.design_sha256)throw Error('Design hash mismatch.');
   if(expected.sourceDesignFileSha256&&expected.sourceDesignFileSha256!==manifest.source_design_file_sha256)throw Error('Saved design bytes differ.');
   for(const [key,value]of Object.entries({length:'m',area:'m2',volume:'m3',frequency:'Hz',velocity:'m/s',volume_flow:'m3/s',pressure:'Pa'}))if(manifest.units?.[key]!==value)throw Error('SI unit mismatch: '+key);
   if(manifest.axes?.handedness!=='right'||manifest.axes.forward!=='+Z'||manifest.conventions?.phasor!=='exp(+j omega t)'||manifest.conventions.amplitude!=='RMS')throw Error('Coordinate or phasor convention mismatch.');
   if(!near(manifest.medium?.sound_speed_m_s,a.p.soundSpeed)||!near(manifest.medium?.density_kg_m3,expected.density??1.204))throw Error('Medium mismatch.');
   if(!Array.isArray(manifest.drivers)||manifest.drivers.length!==a.p.count)throw Error('Source count mismatch.');
   const tags=new Set(),ids=new Set();for(const [i,d]of manifest.drivers.entries()){
    if(tags.has(d.source_tag)||ids.has(d.id))throw Error('Each physical driver needs a unique source ID and boundary tag.');tags.add(d.source_tag);ids.add(d.id);
    const pose=a.poses[i];if(d.driver_id!==a.p.midDriver||!near(d.nominal_sd_m2,a.p.sd*1e-4))throw Error('Catalog source area/driver mismatch.');
    if(![d.projected_mesh_area_m2,d.diaphragm_surface_area_m2,d.entry_interface_area_m2].every(x=>Number.isFinite(x)&&x>0))throw Error('Missing measured mesh source/entry area.');
    for(let k=0;k<3;k++)if(!near(d.entry_center_m?.[k],pose.P[k]*.001)||!near(d.mount_origin_m?.[k],pose.F[k]*.001)||!near(d.motion_into_front_air?.[k],-pose.n[k]))throw Error('Source location or motion mismatch: '+d.id);
    if(!near(d.entry_nominal_area_m2,a.area*1e-6))throw Error('Entry nominal area mismatch.');
    if(!manifest.boundary_groups?.some(b=>b.tag===d.source_tag&&b.kind==='independent-driver-source'))throw Error('Source boundary tag is absent.');
   }
   if(!Array.isArray(manifest.horn_stations)||manifest.horn_stations.length!==a.pro.length)throw Error('Horn station count mismatch.');
   for(let i=0;i<a.pro.length;i++){const s=manifest.horn_stations[i],r=a.pro[i];if(!near(s.z_m,r.z*.001)||!near(s.radius_m,r.r*.001)||!near(s.area_m2,Math.PI*(r.r*.001)**2))throw Error('Horn station differs at '+i);}
   if(a.p.rearLayout!=='shared'||a.p.rearConcept==='reflex'||manifest.rear?.kind!=='shared-sealed-lumped-coupling'||!near(manifest.rear.net_volume_m3,a.p.sharedBack*.001)||manifest.rear.geometric_cavity_exported!==false)throw Error('This handshake requires the shared sealed lumped rear convention.');
   const mouth=manifest.ports?.find(p=>p.tag===301),hf=manifest.ports?.find(p=>p.tag===302);if(!mouth||!hf)throw Error('Mouth/HF boundary declarations missing.');
   const s=manifest.horn_stations[mouth.meridian_station_index];if(!s||!near(mouth.center_m[2],s.z_m)||!near(mouth.radius_m,s.radius_m))throw Error('Mouth coupling plane does not match its declared station.');
   return {available:true,schema:manifest.schema,designSha256:manifest.design_sha256,sourceRecords:manifest.drivers.map(d=>({id:d.id,sourceTag:d.source_tag,positionM:d.entry_center_m,motionIntoFrontAir:d.motion_into_front_air,nominalSdM2:d.nominal_sd_m2,projectedMeshAreaM2:d.projected_mesh_area_m2,meshFlowPerCatalogFlow:d.projected_mesh_area_m2/d.nominal_sd_m2,pressureCatalogPerMeshPressure:d.projected_mesh_area_m2/d.nominal_sd_m2})),mouthCouplingPlane:{stationIndex:mouth.meridian_station_index,zM:mouth.center_m[2],radiusM:mouth.radius_m},rearComplianceM5N:manifest.rear.net_volume_m3/(manifest.medium.density_kg_m3*a.p.soundSpeed**2),acousticOperatorAvailable:false,scope:'Geometry handshake only. Full coupled front/horn/exterior operator must be separately solved and qualified. Preserve four discrete source records; cap301 requires the omitted downstream horn and exterior operator, never a pressure-release condition.'};
  }catch(e){return {available:false,reason:e.message,acousticOperatorAvailable:false};}
 }
 return {validate};
};
