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
for(const [patch,pattern]of [[{rearConcept:'reflex'},/Rear reflex/],[{rearLayout:'individual'},/shared rear enclosure/],[{fillerOpening:200},/Resolve geometry/],[{gap:15},/Resolve geometry/]])assert.throws(()=>G.buildGeometry(M,{...design,state:{...design.state,...patch}}),pattern);
assert.throws(()=>G.buildGeometry(M,design,{maxFrequencyHz:0}),/frequency/);assert.throws(()=>G.buildGeometry(M,design,{elementsPerWavelength:2}),/elements per wavelength/);
const browser={MEH:M};vm.createContext(browser);vm.runInContext(fs.readFileSync(path.join(__dirname,'../mesh-export/geometry.cjs'),'utf8'),browser);const browserJob=browser.MEHMeshGeometry.buildJob(design,{maxFrequencyHz:2000,elementsPerWavelength:8,volumeMesh:true});assert.equal(JSON.stringify(browserJob),JSON.stringify(exact));
const withSystem=G.buildGeometry(M,{...design,systemAcoustics:{options:{voltageRms:2}}});assert.ok(withSystem.manifest.drivers.every(d=>d.saved_voltage_rms===2));
const slower=G.buildGeometry(M,{...design,state:{...design.state,soundSpeed:320}});assert.equal(slower.manifest.medium.sound_speed_m_s,320);
console.log(JSON.stringify({passed:true,exact_design_sha256:exact.manifest.design_sha256,exact_volume_cm3:exact.parts.branches[0].checks.signed_volume_m3*1e6,regressions:results,browser_parity:true},null,2));
