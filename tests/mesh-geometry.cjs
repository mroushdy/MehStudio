'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const G=require('../mesh-export/geometry.cjs'),{context}=require('./load-editor.cjs')(),M=context.MEH,design=require('../examples/offset-insert-study.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),near=(a,b,t=1e-11)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
for(const s of ['', 'abc', 'MEH 🧪 音声', G.stableStringify(design)])assert.equal(G.sha256(s),sha(s));
assert.equal(G.stableStringify({z:1,a:{d:2,b:3}}),G.stableStringify({a:{b:3,d:2},z:1}));
const exact=G.buildGeometry(M,design,{maxFrequencyHz:2000,elementsPerWavelength:8,volumeMesh:true}),a=M.analyze(design.state),canonical=M.frontAdapterGeometry(a);
assert.equal(exact.schema,'meh-acoustic-geometry/v1');assert.equal(exact.manifest.drivers.length,4);assert.equal(exact.manifest.rear.net_volume_m3,.108);assert.deepEqual(exact.options,{maxFrequencyHz:2000,elementsPerWavelength:8,volumeMesh:true});
assert.equal(exact.manifest.design_sha256,sha(G.stableStringify(design)));assert.equal(exact.horn.inner_profile_m.length,321);assert.equal(exact.enclosure.outer_profile_m.length,97);
assert.deepEqual(exact.manifest.axes.z,[0,0,1]);assert.equal(exact.manifest.axes.handedness,'right');
assert.ok(exact.horn.radiation_interface.center_m[2]>exact.horn.terminal_lip.center_m[2]);
assert.equal(exact.horn.radiation_interface.station_index,a.branch.length-1);near(exact.horn.radiation_interface.center_m[2],a.depth*.001);
near(exact.horn.terminal_lip.radius_m,exact.enclosure.lip_r_m);near(exact.horn.terminal_lip.center_m[2],exact.enclosure.lip_z_m);
assert.equal(exact.horn.fem_coupling_interface.station_index,239);assert.ok(exact.horn.fem_coupling_interface.center_m[2]<exact.horn.radiation_interface.center_m[2]);
const entry=exact.manifest.ports[0],mouth=exact.manifest.ports.find(p=>p.tag===301);
near(mouth.center_m[2],exact.horn.fem_coupling_interface.center_m[2]);
near(entry.tube.user_neck_setting_m,.008);near(entry.tube.canonical_nominal_physical_length_m,.011);
assert.ok(entry.tube.wall_length_range_m[0]<entry.tube.wall_length_range_m[1]);
near(entry.entry_area.analytic_m2,.0016500000000000002);near(entry.entry_area.canonical_polygon_section_m2,.001647350748508768);
near(entry.insert.requested_equivalent_opening_diameter_m,.087);near(entry.insert.effective_equivalent_opening_diameter_m,.09100160760766167);
near(entry.insert.axial_rest_clearance_m,.00275);near(entry.volumes.editor_total_front_air_m3,.00019923189762848727);
near(entry.volumes.canonical_closed_branch_m3,.0002003918960784298);assert.equal(entry.collector_stations.length,25);
near(entry.collector_stations[0].axial_position_from_nominal_entry_m,.011);near(entry.collector_stations.at(-1).axial_position_from_nominal_entry_m,.02205);
assert.equal(exact.manifest.medium.sound_speed_m_s,343);
for(let k=0;k<4;k++){
 const part=exact.parts.branches[k],driver=exact.manifest.drivers[k],N=part.ring_vertex_count;
 assert.equal(driver.source_tag,101+k);assert.equal(part.entry_interface_tag,201+k);assert.equal(driver.saved_voltage_rms,1);
 assert.equal(part.checks.euler_characteristic,2);assert.equal(part.faces.length,13568);assert.equal(part.vertices_m.length,6786);
 near(part.checks.signed_volume_m3,0.00020039189607842849);near(part.source_projected_area_m2,.01319469958157574);
 near(part.checks.minimum_insert_vertex_axial_clearance_m,.00275);assert.equal(part.source_face_indices.length,N);assert.equal(part.interface_face_indices.length,N);
 assert.equal(part.face_tags.filter(t=>t===10).length+N*2,part.faces.length);
 for(let j=0;j<N;j++){const expected=M.rotate(canonical.inner[0][j],a.poses[k].a);for(let d=0;d<3;d++)near(part.root_ring_m[j][d],expected[d]*.001);}
 // Production branch boundary has exactly its intended open root; no cap.
 const edgeUses=new Map();for(let i=0;i<part.faces.length;i++)if(part.face_tags[i]!==part.entry_interface_tag){const face=part.faces[i];for(let j=0;j<3;j++){const u=face[j],v=face[(j+1)%3],key=[u,v].sort((a,b)=>a-b).join(':');edgeUses.set(key,(edgeUses.get(key)||0)+1);}}
 const boundary=[...edgeUses].filter(([,n])=>n===1);assert.equal(boundary.length,N);assert.ok([...edgeUses.values()].every(n=>n===1||n===2));assert.ok(boundary.every(([key])=>key.split(':').every(v=>+v<N)));
}
const cases=[{name:'opening',fillerOpening:83},{name:'offset',offset:8},{name:'slot',shape:'slot',slotL:50,slotW:33},{name:'teardrop',shape:'teardrop',slotL:50,slotW:33},{name:'insert-off',frontFiller:'none'},{name:'offset-slot',shape:'slot',offset:8,slotL:50,slotW:33},{name:'annular',frontFiller:'annular',fillerOpening:50}];
const results=[];
for(const item of cases){const {name,...patch}=item,changed={...design,state:{...design.state,...patch}},job=G.buildGeometry(M,changed),branch=job.parts.branches[0];
 assert.notEqual(job.manifest.design_sha256,exact.manifest.design_sha256);assert.notEqual(job.manifest.normalized_state_sha256,exact.manifest.normalized_state_sha256);
 assert.notEqual(branch.checks.signed_volume_m3,exact.parts.branches[0].checks.signed_volume_m3);assert.ok(branch.checks.minimum_triangle_area_m2>0);assert.equal(branch.checks.euler_characteristic,2);
 if(patch.frontFiller==='none'){assert.equal(branch.ring_count,27);assert.equal(branch.checks.minimum_insert_vertex_axial_clearance_m,null);assert.equal(branch.component_face_counts.insert_cone_facing_wall,undefined);}else assert.ok(branch.checks.minimum_insert_vertex_axial_clearance_m>=.00275-1e-12);
 results.push({case:name,vertices:branch.vertices_m.length,triangles:branch.faces.length,volume_cm3:branch.checks.signed_volume_m3*1e6});
}
// All offered counts retain separate sources in both enclosure layouts.
// Individual six-driver packaging requires the smaller driver and more space.
const individualFixtures=[{count:2},{count:4,gap:50},{...M.drivers.mid.bc5ndl38.parameters,midDriver:'bc5ndl38',count:6,tap:180,gap:70}];
const individualResults=[];
for(const patch of individualFixtures){
 const saved={...design,state:{...design.state,...patch,rearLayout:'individual'}},job=G.buildGeometry(M,saved),analysis=M.analyze(saved.state),shell=M.frontAdapterGeometry(analysis),before=G.stableStringify(shell.outer),shared=G.buildGeometry(M,{...saved,state:{...saved.state,rearLayout:'shared'}});
 assert.equal(job.enclosure.kind,'individual-sealed-pods');assert.equal(job.enclosure.pods.length,patch.count);assert.equal(job.manifest.drivers.length,patch.count);assert.equal(shared.manifest.drivers.length,patch.count);
 assert.equal(G.stableStringify(job.parts.branches),G.stableStringify(shared.parts.branches),'Rear layout must not change canonical front-air branches');
 assert.equal(job.manifest.rear.kind,'individual-sealed-lumped-coupling');assert.equal(job.manifest.rear.net_volume_per_driver_m3,analysis.p.back*.001);assert.equal(job.manifest.rear.total_net_volume_m3,analysis.p.back*patch.count*.001);assert.equal(job.manifest.rear.chambers.length,patch.count);
 assert.ok(job.enclosure.checks.minimum_adapter_sector_clearance_m>0);assert.equal(new Set(job.manifest.drivers.map(d=>d.source_tag)).size,patch.count);
 for(let i=0;i<patch.count;i++){
  const pod=job.enclosure.pods[i],pose=analysis.poses[i];
  assert.equal(pod.branch_id,'mid_'+(i+1));near(pod.depth_m,analysis.podDepth*.001);near(pod.radius_m,analysis.podOuter*.001);assert.equal(pod.root_provenance.canonical_outer_rings_sha256,sha(before));
  near(pod.root_provenance.correction_range_m[0],.0005);near(pod.root_provenance.correction_range_m[1],.0005);assert.ok(pod.root_provenance.maximum_meridian_residual_m<1e-10);
  for(let k=0;k<pod.adapter_rings_m.length;k++)for(let j=0;j<pod.adapter_rings_m[k].length;j++){
   const actual=pod.adapter_rings_m[k][j],display=M.rotate(shell.outer[k][j],pose.a);
   for(let d=0;d<3;d++)near(actual[d],display[d]*.001+(k===0?.0005*pose.n[d]:0));
   if(k===0){const segment=pod.root_provenance.horn_segment_indices[j],a=job.horn.outer_profile_m[segment],b=job.horn.outer_profile_m[segment+1],f=(actual[2]-a.z)/(b.z-a.z);assert.ok(f>=-1e-9&&f<=1+1e-9);near(Math.hypot(actual[0],actual[1]),a.r+f*(b.r-a.r));}
  }
  assert.deepEqual(pod.mounting_ring_m,pod.adapter_rings_m.at(-1));
  for(let j=0;j<pod.rear_ring_m.length;j++)for(let d=0;d<3;d++)near(pod.rear_ring_m[j][d],pod.mounting_ring_m[j][d]+pose.n[d]*pod.depth_m);
  assert.equal(job.manifest.drivers[i].source_tag,101+i);assert.ok(job.parts.branches[i].checks.oriented);assert.equal(job.parts.branches[i].checks.euler_characteristic,2);
 }
 assert.equal(G.stableStringify(shell.outer),before,'Extraction must not mutate the canonical display shell');
 individualResults.push({count:patch.count,sector_clearance_mm:job.enclosure.checks.minimum_adapter_sector_clearance_m*1000,root_correction_mm:job.enclosure.pods[0].root_provenance.correction_range_m.map(x=>x*1000)});
}
// Rear ducts are an explicit independent radiation-basis export. The exact
// rectangle corners and physical length survive; rear motor response is absent.
const ventResults=[];
for(const patch of [{rearLayout:'individual',rearPortDiameter:20},{rearLayout:'individual',rearPortDiameter:30},{rearLayout:'individual',rearPortDiameter:40,rearTuning:160},{rearLayout:'individual',rearPortShape:'slot'},{rearLayout:'shared',rearPortDiameter:80,rearTuning:40}]){
 const saved={...design,state:{...design.state,gap:50,rearConcept:'reflex',...patch}},job=G.buildGeometry(M,saved,{rearVentBasis:true}),analysis=M.analyze(saved.state),count=patch.rearLayout==='shared'?1:4;
 assert.equal(job.enclosure.vents.length,count);assert.equal(job.manifest.vent_sources.length,count);assert.equal(job.options.rearVentBasis,true);assert.equal(job.manifest.rear.motor_coupling_solved,false);assert.equal(job.manifest.rear.rear_compliance_solved,false);assert.match(job.manifest.rear.note,/does not predict voltage response/);
 assert.equal(new Set([...job.manifest.drivers,...job.manifest.vent_sources].map(d=>d.source_tag)).size,4+count);
 for(let i=0;i<count;i++){
  const vent=job.enclosure.vents[i],source=job.manifest.vent_sources[i],area=vent.opening_ring_m.reduce((total,p,j)=>{const q=vent.opening_ring_m[(j+1)%vent.opening_ring_m.length],a=M.sub(p,vent.mouth_center_m),b=M.sub(q,vent.mouth_center_m);return total+M.dot(M.cross(a,b),vent.axis_into_exterior)/2;},0);
  assert.equal(source.source_tag,151+i);assert.equal(vent.source_tag,151+i);assert.equal(vent.shape,patch.rearPortShape==='slot'?'rectangle':'round');assert.equal(vent.opening_ring_m.length,vent.shape==='rectangle'?4:128);
  near(vent.physical_length_m,analysis.rearPort.lengthMM*.001);near(vent.cap_thickness_m,analysis.rearPort.capMM*.001);near(source.projected_mesh_area_m2,Math.abs(area));assert.ok(Math.abs(source.projected_mesh_area_m2/source.nominal_area_m2-1)<.0005);if(vent.shape==='rectangle')near(Math.abs(area),vent.width_m*vent.height_m);
  for(let d=0;d<3;d++)near(vent.mouth_center_m[d]-vent.inlet_center_m[d],vent.axis_into_exterior[d]*vent.physical_length_m);
  assert.ok(job.manifest.boundary_groups.some(g=>g.tag===vent.source_tag&&g.kind==='independent-vent-source'));assert.deepEqual(source.motion_into_air,vent.axis_into_exterior);
 }
 ventResults.push({layout:patch.rearLayout,shape:job.enclosure.vents[0].shape,width_mm:analysis.rearPort.innerWidthMM,source_count:count,length_mm:analysis.rearPort.lengthMM});
}
for(const [patch,pattern]of [[{rearConcept:'reflex'},/Rear reflex.*rearVentBasis/],[{fillerOpening:200},/Resolve geometry/],[{gap:15},/Resolve geometry/],[{rearLayout:'individual'},/Adjacent adapter exterior shells/],[{rearLayout:'individual',count:6},/envelopes overlap/],[{rearLayout:'individual',gap:50,wall:12},/wall consumes.*neck/],[{rearLayout:'individual',back:.5},/Sealed rear pod leaves/]])assert.throws(()=>G.buildGeometry(M,{...design,state:{...design.state,...patch}}),pattern);
assert.throws(()=>G.buildGeometry(M,{...design,state:{...design.state,rearLayout:'individual',gap:50,rearConcept:'reflex',rearPortDiameter:200}},{rearVentBasis:true}),/Rear-port outside dimensions/);
assert.throws(()=>G.buildGeometry(M,design,{maxFrequencyHz:0}),/frequency/);assert.throws(()=>G.buildGeometry(M,design,{elementsPerWavelength:2}),/elements per wavelength/);
const browser={MEH:M};vm.createContext(browser);vm.runInContext(fs.readFileSync(path.join(__dirname,'../mesh-export/geometry.cjs'),'utf8'),browser);const browserJob=browser.MEHMeshGeometry.buildJob(design,{maxFrequencyHz:2000,elementsPerWavelength:8,volumeMesh:true});assert.equal(JSON.stringify(browserJob),JSON.stringify(exact));
const withSystem=G.buildGeometry(M,{...design,systemAcoustics:{options:{voltageRms:2}}});assert.ok(withSystem.manifest.drivers.every(d=>d.saved_voltage_rms===2));
const slower=G.buildGeometry(M,{...design,state:{...design.state,soundSpeed:320}});assert.equal(slower.manifest.medium.sound_speed_m_s,320);
console.log(JSON.stringify({passed:true,exact_design_sha256:exact.manifest.design_sha256,exact_volume_cm3:exact.parts.branches[0].checks.signed_volume_m3*1e6,regressions:results,individual_pods:individualResults,vent_bases:ventResults,browser_parity:true},null,2));
