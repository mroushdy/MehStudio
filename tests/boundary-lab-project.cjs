'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildBoundaryLabProject}=require('../mesh-export/boundary-lab-project.cjs');
const {validateSurfaceMesh}=require('../mesh-export/abec-project.cjs');
function fixture({count=2,vents=0,apexY=0}={}){
 const mesh={vertices_m:[],faces:[],face_tags:[],normal_convention:'into-air'};
 const manifest={design_sha256:'a'.repeat(64),units:{length:'m'},medium:{sound_speed_m_s:350,density_kg_m3:1.19},
  observation_frame:{origin_m:[.003,.007,.051],forward:[0,0,1],horizontal:[1,0,0],vertical:[0,1,0]},
  mesh_request:{maximum_frequency_hz:1000},boundary_groups:[{tag:10,kind:'rigid-wall',id:'walls'}],drivers:[],vent_sources:[]};
 for(let i=0;i<count+vents;i++){
  const offset=mesh.vertices_m.length,isVent=i>=count,tag=isVent?151+i-count:101+i,id=(isVent?'vent_':'mid_')+(i+1);
  mesh.vertices_m.push(...[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0],[.5,apexY,1]].map(([x,y,z])=>[(x+4*i)*.05,y*.05,z*.05]));
  mesh.faces.push(...[[0,2,1],[0,3,2],[0,1,4],[1,2,4],[2,3,4],[3,0,4]].map(f=>f.map(k=>offset+k)));
  mesh.face_tags.push(10,10,tag,tag,tag,tag);
  manifest.boundary_groups.push({tag,kind:isVent?'independent-vent-source':'independent-driver-source',id});
  manifest[isVent?'vent_sources':'drivers'].push({id,source_tag:tag,motion_into_air:[0,0,1],projected_mesh_area_m2:.01,...isVent?{}:{nominal_sd_m2:.01,saved_voltage_rms:3}});
 }
 return {manifest,mesh};
}
function parseMsh(text){
 const lines=text.split('\n'),n=lines.indexOf('$Nodes'),f=lines.indexOf('$Elements');
 const rows=lines.slice(f+2,f+2+Number(lines[f+1])).map(x=>x.split(' ').map(Number));
 return {vertices_m:lines.slice(n+2,n+2+Number(lines[n+1])).map(x=>x.split(' ').slice(1).map(Number)),
  faces:rows.map(r=>r.slice(5).map(x=>x-1)),face_tags:rows.map(r=>r[3])};
}
const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('portable schema 9 configures one exterior region with explicit SI medium and independent channels',()=>{
 for(const count of [2,4,6]){
  const out=buildBoundaryLabProject(fixture({count})),project=JSON.parse(out.files['project.blab.json']),s=project.physical_system;
  assert.equal(project.schema_version,9);assert.equal(s.model_version,1);assert.equal(project.symmetry,'off');assert.equal(project.stitch_exterior_meshes,false);
  assert.equal(s.meshes[0].file,'boundary.msh');assert.equal(project.imported_meshes[0].source_file,'boundary.msh');
  assert.equal(project.imported_meshes[0].cleaned_file,'boundary.msh');
  assert.equal(s.meshes[0].scale_to_m,1);assert.equal(project.imported_meshes[0].scale_factor,1);
  assert.deepEqual(s.meshes[0].translation_m,[0,0,0]);assert.deepEqual(project.imported_meshes[0].translation_mm,[0,0,0]);
  assert.equal(s.regions.length,1);assert.equal(s.regions[0].kind,'unbounded_air');
  assert.equal(s.regions[0].sound_speed_m_per_s,350);assert.equal(s.regions[0].density_kg_per_m3,1.19);
  assert.equal(s.components.length,count);assert.equal(s.excitation_ports.length,count);assert.equal(new Set(Object.values(project.component_channel_by_id)).size,count);
  assert.ok(s.excitation_ports.every(p=>p.kind==='normal_velocity'));assert.equal(project.project_preferences.normalized_channel_correction,false);
  assert.equal(out.validation.source_projection_maximum_rounding_error,0);assert.equal(out.validation.acoustic_solve,'not run');
 }
});

test('every emitted source facet has its exact projected motion and one independent owner',()=>{
 const input=fixture({count:4,vents:2,apexY:1e-14}),out=buildBoundaryLabProject(input);
 const project=JSON.parse(out.files['project.blab.json']),mesh=parseMsh(out.files['boundary.msh']),checked=validateSurfaceMesh(mesh);
 const sourceMap=JSON.parse(out.files['source-map.json']);
 assert.deepEqual(sourceMap.original_face_tags,input.mesh.face_tags);
 const boundaryTags=project.physical_system.boundaries.map(b=>b.group.tag);
 assert.equal(new Set(boundaryTags).size,boundaryTags.length);
 assert.ok(mesh.face_tags.every(tag=>boundaryTags.includes(tag)));
 assert.deepEqual(out.validation.checks.physical_tag_triangle_counts,checked.report.physical_tag_triangle_counts);
 assert.deepEqual(out.validation.checks.physical_tag_area_m2,checked.report.physical_tag_area_m2);
 for(const s of out.sources){
  const component=project.physical_system.components.find(c=>c.id===s.component_id),owned=[];
  near(s.projected_area_m2,.01);assert.ok(s.surface_area_m2>s.projected_area_m2);
  for(const g of s.projection_groups){
   assert.equal(component.parameters.boundary_motion_weights[g.boundary_id],g.normal_velocity_multiplier);
   assert.equal(component.parameters.motion_profile,'uniform');
   for(const index of g.face_indices){
    const expected=checked.normals[index].reduce((sum,n,k)=>sum+n*s.motion_into_air[k],0);
    assert.equal(g.normal_velocity_multiplier,expected);assert.equal(mesh.face_tags[index],g.physical_tag);owned.push(index);
   }
  }
  assert.deepEqual(owned.sort((a,b)=>a-b),s.face_indices);assert.equal(component.boundary_ids.length,s.projection_groups.length);
  assert.deepEqual(s.physical_tags,s.face_indices.map(i=>mesh.face_tags[i]));
  assert.equal(s.projection_groups[0].physical_tag,s.physical_tag);
  const distinct=new Set(s.normal_velocity_multipliers),rounded=new Set(s.normal_velocity_multipliers.map(w=>w.toFixed(12)));
  assert.equal(s.projection_groups.length,distinct.size);assert.ok(distinct.size>rounded.size,'near-equal facet projections must not be merged');
 }
});

test('mouth-frame rebase preserves connectivity and records a reversible rigid coordinate transform',()=>{
 const input=fixture();input.mesh.vertices_m=input.mesh.vertices_m.map(([x,y,z])=>[z+2,x-3,y+4]);
 input.manifest.drivers.forEach(d=>d.motion_into_air=[1,0,0]);
 input.manifest.observation_frame={origin_m:[2.051,-2.997,4.007],horizontal:[0,1,0],vertical:[0,0,1],forward:[1,0,0]};
 const before=JSON.stringify(input),out=buildBoundaryLabProject(input),mesh=parseMsh(out.files['boundary.msh']);
 const origin=input.manifest.observation_frame.origin_m;
 assert.deepEqual(mesh.vertices_m,input.mesh.vertices_m.map(p=>[p[1]-origin[1],p[2]-origin[2],p[0]-origin[0]]));
 assert.deepEqual(mesh.faces,input.mesh.faces);assert.equal(JSON.stringify(input),before);
 assert.deepEqual(out.observation_frame.on_axis_1m,[0,0,1]);assert.deepEqual(out.sources[0].motion_into_air,[0,0,1]);
 assert.deepEqual(JSON.parse(out.files['source-map.json']).coordinate_transform.rotation_rows,[[0,1,0],[0,0,1],[1,0,0]]);
});

test('native air-outward winding reverses exactly once and aliases and group overrides work',()=>{
 const input=fixture(),baseline=buildBoundaryLabProject(input),inverse=structuredClone(input);
 inverse.mesh.faces=inverse.mesh.faces.map(([a,b,c])=>[a,c,b]);inverse.mesh.normal_convention='air-outward';
 assert.equal(buildBoundaryLabProject(inverse).files['boundary.msh'],baseline.files['boundary.msh']);
 assert.throws(()=>buildBoundaryLabProject(inverse,{normalConvention:'into-air'}),/positive enclosed signed volume/);
 const alias={manifest:input.manifest,mesh:{nodes:input.mesh.vertices_m,triangles:input.mesh.faces.map((nodes,i)=>({nodes,physicalTag:input.mesh.face_tags[i]})),normal_convention:'into-air',groups:input.manifest.boundary_groups}};
 alias.manifest={...alias.manifest,boundary_groups:undefined};
 assert.equal(buildBoundaryLabProject(alias).files['boundary.msh'],baseline.files['boundary.msh']);
});

test('source requests select independent driver and vent bases without inventing a channel mute or voltage drive',()=>{
 const input=fixture({vents:1}),out=buildBoundaryLabProject(input),project=JSON.parse(out.files['project.blab.json']);
 for(const source of out.sources){
  const request=JSON.parse(out.files['requests/source-'+source.physical_tag+'.json']);
  assert.deepEqual(request.excitation_port_ids,[source.excitation_port_id]);assert.deepEqual(request.probes[0].points_m,[[0,0,1]]);
  assert.deepEqual(project.channel_config_by_name[source.channel_name],{voltage_v:1,level_db:0,polarity:1,delay_ms:0});
  assert.equal(source.default_observation_weight,undefined);assert.equal(source.driving_group,undefined);
 }
 assert.equal(out.sources.at(-1).source_type,'vent');assert.equal(out.sources.at(-1).nominal_sd_m2,null);
 assert.match(out.files['README.txt'],/no exact mute/);
 input.manifest.drivers.forEach(d=>d.saved_voltage_rms=50);
 assert.equal(buildBoundaryLabProject(input).files['project.blab.json'],out.files['project.blab.json']);
 assert.equal(buildBoundaryLabProject(input).sources[0].saved_voltage_rms,50);
});

test('unsafe or unsupported source, unit, surface and frequency assumptions fail closed',()=>{
 const mutations=[i=>delete i.manifest.medium,i=>i.manifest.units.length='mm',i=>i.manifest.medium.sound_speed_m_s=0,
  i=>delete i.mesh.normal_convention,i=>i.manifest.drivers[0].motion_into_air=[0,0,-1],
  i=>{i.mesh.faces.pop();i.mesh.face_tags.pop();},i=>i.manifest.drivers[0].projected_mesh_area_m2=.02,
  i=>{i.mesh.face_tags[0]=301;i.manifest.boundary_groups.push({tag:301,kind:'rigid-wall'});}];
 for(const mutate of mutations){const input=fixture();mutate(input);assert.throws(()=>buildBoundaryLabProject(input));}
 assert.throws(()=>buildBoundaryLabProject(fixture(),{f1:99.9}),/whole Hz/);
 assert.throws(()=>buildBoundaryLabProject(fixture(),{symmetry:'quarter'}),/full physical geometry/);
 const skew=fixture();skew.manifest.observation_frame.vertical=[1e-4,Math.sqrt(1-1e-8),0];
 assert.throws(()=>buildBoundaryLabProject(skew),/orthonormal/);
 const small=fixture();small.manifest.mesh_request.maximum_frequency_hz=101;
 assert.equal(JSON.parse(buildBoundaryLabProject(small).files['project.blab.json']).project_preferences.freq_min_hz,50);
});

test('source IDs that match object property names remain independent channel keys',()=>{
 const input=fixture();input.manifest.drivers[0].id='__proto__';input.manifest.drivers[1].id='constructor';
 const project=JSON.parse(buildBoundaryLabProject(input).files['project.blab.json']);
 assert.deepEqual(Object.keys(project.channel_config_by_name),['__proto__','constructor']);
});
