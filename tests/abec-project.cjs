'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildAbecProject}=require('../mesh-export/abec-project.cjs');
function fixture({scale=.05,asymmetric=false}={}){
 const mesh={vertices_m:[],faces:[],face_tags:[],normal_convention:'into-air'};
 for(let source=0;source<2;source++){
  const base=mesh.vertices_m.length,shift=source*4;
  mesh.vertices_m.push(...[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0],[asymmetric?.5:0,0,1]].map(p=>p.map((v,k)=>(v+(k===0?shift:0))*scale)));
  // Hand-wound outward faces. Two pyramid exclusion volumes, air outside.
  mesh.faces.push(...[[0,2,1],[0,3,2],[0,1,4],[1,2,4],[2,3,4],[3,0,4]].map(f=>f.map(i=>i+base)));
  mesh.face_tags.push(10,10,...Array(4).fill(101+source));
 }
 const manifest={design_sha256:'a'.repeat(64),units:{length:'m'},axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},boundary_groups:[{tag:10,kind:'rigid-wall',id:'wall'},{tag:101,kind:'independent-driver-source',id:'mid_1'},{tag:102,kind:'independent-driver-source',id:'mid_2'}],drivers:[1,2].map(i=>({id:'mid_'+i,source_tag:100+i,motion_into_front_air:[0,0,1],nominal_sd_m2:4*scale**2,saved_voltage_rms:1})),mesh_request:{maximum_frequency_hz:1000}};
 return {manifest,mesh,horn:{mouth_center_m:[0,0,scale]}};
}
function parseMsh(text){
 const lines=text.split('\n'),nodeStart=lines.indexOf('$Nodes'),faceStart=lines.indexOf('$Elements');
 return {nodes:lines.slice(nodeStart+2,nodeStart+2+Number(lines[nodeStart+1])).map(s=>s.split(' ').map(Number)),elements:lines.slice(faceStart+2,faceStart+2+Number(lines[faceStart+1])).map(s=>s.split(' ').map(Number))};
}
const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('projects preserve SI coordinates, physical sources and unambiguous elementary selectors',()=>{
 const input=fixture(),out=buildAbecProject(input),msh=parseMsh(out.files['boundary.msh']);
 assert.equal(msh.nodes.length,10);assert.equal(msh.elements.length,12);assert.match(out.files['boundary.msh'],/^\$MeshFormat\n2\.2 0 8\n/);
 assert.deepEqual(msh.nodes.map(n=>n.slice(1)),input.mesh.vertices_m);
 const includes=[...out.files['solving.txt'].matchAll(/Mesh Include (\d+)/g)].map(m=>Number(m[1]));
 for(const e of msh.elements){assert.equal(e[1],2);assert.equal(e[2],2);assert.equal(includes.filter(i=>i===e[4]).length,1);}
 assert.deepEqual(out.sources.map(s=>s.physical_tag),[101,102]);assert.deepEqual(out.sources.map(s=>s.driving_group),[1101,1102]);
 assert.equal(new Set(out.sources.flatMap(s=>s.elementary_tags)).size,2);
 assert.match(out.files['project.abec'],/\[MeshFiles\]\nC0=boundary\.msh,M1/);
 assert.match(out.files['solving.txt'],/Scale=1m/);assert.doesNotMatch(out.files['solving.txt'],/SwapNormals|Infinite_Baffle|Sym=/);
});
test('piston drive projection integrates to analytic projected area, including tilted facets',()=>{
 const out=buildAbecProject(fixture({asymmetric:true}));
 for(const s of out.sources){near(s.projected_area_m2,.01);assert.ok(s.surface_area_m2>s.projected_area_m2);assert.equal(s.projection_groups.length,3);
  assert.ok(s.normal_velocity_multipliers.every(w=>w>0&&w<1));
  for(const p of s.projection_groups)for(const i of p.face_indices){const index=s.face_indices.indexOf(i);near(p.normal_velocity_multiplier,s.normal_velocity_multipliers[index],5.1e-13);}
 }
 assert.equal(out.validation.checks.boundary_component_count,2);
 out.validation.checks.components.forEach(c=>near(c.excluded_solid_volume_m3,4*.05**3/3));
});
test('uniform geometry scaling scales source area and excluded volume without changing source weights',()=>{
 const a=buildAbecProject(fixture()),b=buildAbecProject(fixture({scale:.1}));
 a.sources.forEach((s,i)=>{near(b.sources[i].projected_area_m2/s.projected_area_m2,4);assert.deepEqual(b.sources[i].normal_velocity_multipliers,s.normal_velocity_multipliers);});
 near(b.validation.checks.components[0].excluded_solid_volume_m3/a.validation.checks.components[0].excluded_solid_volume_m3,8);
});
test('axis and polar frames follow the same explicit transformed coordinates as the mesh',()=>{
 const input=fixture();input.mesh.vertices_m=input.mesh.vertices_m.map(([x,y,z])=>[z,x,y]);input.manifest.drivers.forEach(d=>d.motion_into_front_air=[1,0,0]);
 const out=buildAbecProject(input,{mouthCenterM:[.05,.2,.3],forward:[1,0,0],horizontal:[0,1,0],vertical:[0,0,1]});
 assert.deepEqual(out.observation_frame.on_axis_1m,[1.05,.2,.3]);
 const node=out.files['observation.txt'].split('\n').find(l=>/^  1000 /.test(l)).trim().split(/\s+/).map(Number);
 assert.deepEqual(node,[1000,1.05,.2,.3]);assert.match(out.files['observation.txt'],/Distance=2m/);
 assert.match(out.files['observation.txt'],/BasePlane=2001 2002 2003/);assert.match(out.files['observation.txt'],/BasePlane=2001 2002 2004/);
});
test('saved voltage is metadata only; normalized matrix retains all self and mutual pairs',()=>{
 const a=fixture(),b=fixture();b.manifest.drivers.forEach(d=>d.saved_voltage_rms=20);
 const x=buildAbecProject(a),y=buildAbecProject(b);assert.equal(x.files['observation.txt'],y.files['observation.txt']);assert.equal(y.sources[0].saved_voltage_rms,20);
 const rows=[...x.files['observation.txt'].matchAll(/^  \d+ (11\d+) (11\d+) ID=/gm)].map(m=>m.slice(1));
 assert.deepEqual(rows,[['1101','1101'],['1101','1102'],['1102','1101'],['1102','1102']]);
});
test('air-outward input is reversed exactly once without mutating source geometry',()=>{
 const a=fixture(),b=fixture();b.mesh.faces.forEach(f=>[f[1],f[2]]=[f[2],f[1]]);b.mesh.normal_convention='air-outward';const before=JSON.stringify(b);
 assert.equal(buildAbecProject(a).files['boundary.msh'],buildAbecProject(b).files['boundary.msh']);assert.equal(JSON.stringify(b),before);
 assert.throws(()=>buildAbecProject(b,{normalConvention:'into-air'}),/positive enclosed signed volume/);
 delete b.mesh.normal_convention;assert.throws(()=>buildAbecProject(b),/normalConvention/);
});
test('open, duplicate, untagged and inconsistently wound boundaries cannot silently become acoustic walls',()=>{
 for(const mutate of [i=>{i.mesh.faces.pop();i.mesh.face_tags.pop();},i=>{i.mesh.faces.push(i.mesh.faces[0]);i.mesh.face_tags.push(10);},i=>{i.mesh.faces[0].reverse();},i=>{i.mesh.face_tags[0]=999;}]){const i=fixture();mutate(i);assert.throws(()=>buildAbecProject(i));}
 const i=fixture();i.mesh.vertices_m[0][0]=NaN;assert.throws(()=>buildAbecProject(i),/non-finite/);
 const pinched=fixture();pinched.mesh.faces=pinched.mesh.faces.map(f=>f.map(i=>i===5?0:i));
 assert.throws(()=>buildAbecProject(pinched),/pinched vertex/);
});
test('mouth interfaces, diagnostic caps, symmetry and unspecified source motion are blocked',()=>{
 const i=fixture();i.mesh.face_tags[0]=301;i.manifest.boundary_groups.push({tag:301,kind:'FEM-coupling-interface-only'});assert.throws(()=>buildAbecProject(i),/interface/);
 i.manifest.boundary_groups.at(-1).kind='rigid-wall';assert.throws(()=>buildAbecProject(i),/mouth-interface/);
 assert.throws(()=>buildAbecProject(fixture(),{symmetry:'quarter'}),/full physical geometry/);
 const j=fixture();delete j.manifest.drivers[0].motion_into_front_air;assert.throws(()=>buildAbecProject(j),/finite vector/);
 const k=fixture();k.manifest.drivers[0].motion_into_front_air=[0,0,-1];assert.throws(()=>buildAbecProject(k),/facing away/);
});
test('mesh size estimate and solver-verification status stay separate from topology',()=>{
 const out=buildAbecProject(fixture());assert.equal(out.validation.dense_complex128_matrix_bytes,16*12*12);assert.equal(out.validation.proprietary_solver_validation,'not run');assert.match(out.validation.checks.acoustic_convergence,/Not established/);
 assert.equal(out.files['boundary.msh'],buildAbecProject(fixture()).files['boundary.msh']);
});
test('a stale source-area manifest cannot silently drive a changed diaphragm',()=>{
 const input=fixture();input.manifest.drivers[0].projected_mesh_area_m2=.02;
 assert.throws(()=>buildAbecProject(input),/projected area does not match/);
 delete input.manifest.drivers[0].projected_mesh_area_m2;input.manifest.drivers[0].nominal_sd_m2=.02;
 assert.throws(()=>buildAbecProject(input),/differs from nominal Sd/);
});
