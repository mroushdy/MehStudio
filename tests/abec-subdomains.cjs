'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildAbecSubdomains}=require('../mesh-export/abec-subdomains.cjs');
const {buildAbecProject}=require('../mesh-export/abec-project.cjs');
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
// Four disjoint boxes with open square recesses: exact analytic volumes and
// shared root seams. A recessed, asymmetric cone optionally replaces the floor.
function fixture({cone=false,scale=.01}={}){
 const bem={vertices_m:[],faces:[],face_tags:[]},branches=[],drivers=[],groups=[{tag:10,kind:'rigid-wall',id:'branch_wall'},{tag:11,kind:'rigid-wall',id:'external_wall'}];
 for(let i=0;i<4;i++){
  const sourceTag=101+i,interfaceTag=201+i,id='mid_'+(i+1),base=bem.vertices_m.length;
  const square=(size,z)=>[[-size,-size,z],[size,-size,z],[size,size,z],[-size,size,z]];
  const points=[...square(2,-1),...square(2,1),...square(1,0),...square(1,1),...(cone?[[.2,0,-.25]]:[])].map(p=>p.map((x,k)=>(x+(k===0?6*i:0))*scale));
  bem.vertices_m.push(...points);
  function globalFace(f,tag){bem.faces.push(f.map(n=>base+n));bem.face_tags.push(tag);}
  function quad(f,tag){globalFace([f[0],f[1],f[2]],tag);globalFace([f[0],f[2],f[3]],tag);}
  for(let j=0;j<4;j++){
   const k=(j+1)%4;
   quad([j,4+j,4+k,k],11); // External faces into excluded solid.
   quad([4+j,12+j,12+k,4+k],11); // Front annulus into solid.
  }
  globalFace([0,1,2],11);globalFace([0,2,3],11);
  const branch={id,source_tag:sourceTag,entry_interface_tag:interfaceTag,vertices_m:points.slice(8).map(p=>p.slice()),faces:[],face_tags:[]};
  function branchFace(f,tag){branch.faces.push(f);branch.face_tags.push(tag);if(tag!==interfaceTag)globalFace(f.map(n=>8+n),tag);}
  for(let j=0;j<4;j++){const k=(j+1)%4;branchFace([j,k,4+k],10);branchFace([j,4+k,4+j],10);}
  if(cone)for(let j=0;j<4;j++)branchFace([j,8,(j+1)%4],sourceTag);
  else {branchFace([0,2,1],sourceTag);branchFace([0,3,2],sourceTag);}
  branchFace([4,5,6],interfaceTag);branchFace([4,6,7],interfaceTag);
  branches.push(branch);drivers.push({id,branch_id:id,source_tag:sourceTag,entry_interface_tag:interfaceTag,motion_into_front_air:[0,0,1],projected_mesh_area_m2:4*scale**2,nominal_sd_m2:4*scale**2,saved_voltage_rms:1});
  groups.push({tag:sourceTag,kind:'independent-driver-source',id},{tag:interfaceTag,kind:'diagnostic-interface',id:id+'_entry'});
 }
 const manifest={design_sha256:'a'.repeat(64),units:{length:'m'},axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},drivers,boundary_groups:groups,mesh_request:{maximum_frequency_hz:1000}};
 return {job:{manifest,parts:{branches},horn:{mouth_center_m:[0,0,scale]}},bem,scale};
}
function signedVolume(mesh,domain){return domain.face_indices.reduce((sum,i)=>{let f=mesh.faces[i];if(mesh.owners[i].interface&&domain.id===1)f=[f[0],f[2],f[1]];const [a,b,c]=f.map(j=>mesh.vertices_m[j]);return sum+dot(a,cross(b,c))/6;},0);}
function parseMsh(text){const lines=text.split('\n'),n=lines.indexOf('$Nodes'),e=lines.indexOf('$Elements');return {nodes:lines.slice(n+2,n+2+Number(lines[n+1])).map(l=>l.split(' ').map(Number)),elements:lines.slice(e+2,e+2+Number(lines[e+1])).map(l=>l.split(' ').map(Number))};}
test('five coupled domains close separately and partition analytic excluded/air volumes',()=>{
 const {job,bem,scale}=fixture(),out=buildAbecSubdomains(job,bem);
 assert.deepEqual(out.validation.domain_reports.map(d=>[d.id,d.type,d.triangles]),[[1,'Exterior',80],[11,'Interior',12],[12,'Interior',12],[13,'Interior',12],[14,'Interior',12]]);
 assert.equal(out.mesh.faces.length,120);assert.equal(out.validation.interface_count,4);assert.equal(out.validation.interface_triangles_stored_once,8);
 for(const d of out.domains){near(signedVolume(out.mesh,d),(d.id===1?128:-4)*scale**3);assert.ok(out.validation.domain_reports.find(r=>r.id===d.id).closed_two_manifold);}
 near(out.validation.domain_reports[0].excluded_volume_m3,128*scale**3);
 near(out.validation.domain_reports.slice(1).reduce((s,d)=>s+d.finite_air_volume_m3,0),16*scale**3);
 near(out.validation.partition_volume_relative_error,0);
 for(const id of [11,12,13,14])assert.match(out.files['solving.txt'],new RegExp('SubDomain='+id+'\\n  ElType=Interior'));
 assert.match(out.files['solving.txt'],/SubDomain=1\n  ElType=Exterior/);
});
test('each interface is stored once and has exactly opposite domain normals on identical geometry',()=>{
 const {job,bem}=fixture(),out=buildAbecSubdomains(job,bem);
 for(const it of out.interfaces){
  assert.equal(it.face_indices.length,2);assert.deepEqual(it.subdomains,[11+it.physical_tag-201,1]);
  assert.match(out.files['solving.txt'],new RegExp('Elements "Interface_'+it.physical_tag+'"\\n  SubDomain='+it.subdomains.join(',')));
  for(const index of it.face_indices){const domainUses=out.domains.filter(d=>d.face_indices.includes(index));assert.deepEqual(domainUses.map(d=>d.id),[1,it.subdomains[0]]);
   const f=out.mesh.faces[index],p=f.map(n=>out.mesh.vertices_m[n]),normal=cross(sub(p[1],p[0]),sub(p[2],p[0]));assert.ok(normal[2]<0); // Into the recess.
   const reversed=cross(sub(p[2],p[0]),sub(p[1],p[0]));normal.forEach((n,k)=>near(n+reversed[k],0));
   assert.equal(out.mesh.faces.filter((_,i)=>out.mesh.face_tags[i]===it.physical_tag).length,2);
  }
 }
 // The aggregate deliberately has 3 incident faces at a root edge; treating it
 // as one manufacturing shell would reject a legitimate coupled interface.
 const edges=new Map();out.mesh.faces.forEach(f=>f.forEach((a,j)=>{const k=[a,f[(j+1)%3]].sort((x,y)=>x-y).join(':');edges.set(k,(edges.get(k)||0)+1);}));
 assert.equal([...edges.values()].filter(n=>n===3).length,16);assert.ok([...edges.values()].every(n=>n===2||n===3));
});
test('mesh imports one selector per triangle; independent sources and all mutual terms survive',()=>{
 const {job,bem}=fixture(),out=buildAbecSubdomains(job,bem),parsed=parseMsh(out.files['boundary.msh']);
 assert.deepEqual(parsed.nodes.map(n=>n.slice(1)),out.mesh.vertices_m);
 const includes=[...out.files['solving.txt'].matchAll(/Mesh Include (\d+)/g)].map(m=>Number(m[1]));
 for(const e of parsed.elements){assert.equal(e[1],2);assert.equal(e[2],2);assert.equal(includes.filter(n=>n===e[4]).length,1);}
 assert.deepEqual(out.sources.map(s=>s.driving_group),[1101,1102,1103,1104]);
 for(const s of out.sources){assert.deepEqual(s.normal_velocity_multipliers,[1,1]);near(s.projected_area_m2,.0004);}
 assert.equal([...out.files['observation.txt'].matchAll(/^  \d+ 11\d+ 11\d+ ID=/gm)].length,16);
 assert.doesNotMatch(out.files['solving.txt'],/SwapNormals|Infinite_Baffle|Sym=/);
 assert.match(out.files['observation.txt'],/DrvType=Velocity; Value=1\.0/);
});
test('tilted source projection integrates independently to planar piston area',()=>{
 const {job,bem}=fixture({cone:true}),out=buildAbecSubdomains(job,bem);
 for(const source of out.sources){let area=0,projected=0;
  for(const i of source.face_indices){const [a,b,c]=out.mesh.faces[i].map(n=>out.mesh.vertices_m[n]),twice=cross(sub(b,a),sub(c,a)),weight=dot(twice,source.motion_into_air)/Math.hypot(...twice);area+=Math.hypot(...twice)/2;projected+=dot(twice,source.motion_into_air)/2;
   const group=source.projection_groups.find(g=>g.face_indices.includes(i));near(group.normal_velocity_multiplier,weight,5.1e-13);assert.ok(weight>0&&weight<1);
  }
  near(projected,.0004);near(projected,source.projected_area_m2);near(area,source.surface_area_m2);assert.ok(area>projected);assert.equal(source.projection_groups.length,3);
 }
});
test('broken interfaces and stale metadata fail before any project is emitted',()=>{
 for(const mutate of [
  x=>{x.job.parts.branches[0].faces.pop();x.job.parts.branches[0].face_tags.pop();},
  x=>x.job.parts.branches[0].faces.at(-1).reverse(),
  x=>{x.job.parts.branches[0].vertices_m[4][0]+=.0001;},
  x=>{x.job.parts.branches[0].id='wrong';},
  x=>{x.job.manifest.drivers[0].projected_mesh_area_m2=.0005;},
  x=>{x.job.parts.branches[0].entry_interface_tag=202;}
 ]){const data=fixture();mutate(data);assert.throws(()=>buildAbecSubdomains(data.job,data.bem));}
 const data=fixture();assert.throws(()=>buildAbecSubdomains(data.job,data.bem,{weldToleranceM:1e-5}),/at most 1 nm/);
});
test('inputs and stable single-exterior adapter stay unchanged',()=>{
 const {job,bem}=fixture(),before=JSON.stringify({job,bem}),baseline=()=>buildAbecProject({manifest:job.manifest,mesh:bem,horn:job.horn},{normalConvention:'air-outward'}).files;
 const first=baseline();buildAbecSubdomains(job,bem);assert.equal(JSON.stringify({job,bem}),before);assert.deepEqual(baseline(),first);
});
test('block arithmetic is bounded in meaning and is not proprietary solver verification',()=>{
 const {job,bem}=fixture(),out=buildAbecSubdomains(job,bem),v=out.validation;
 assert.equal(v.one_full_baseline_dense_matrix_bytes,16*112**2);assert.equal(v.sum_of_local_dense_matrix_bytes,16*(80**2+4*12**2));
 assert.equal(v.peak_one_local_dense_matrix_bytes,16*80**2);assert.equal(v.proprietary_solver_validation,'not run');assert.equal(v.physical_accuracy_validated,false);assert.equal(v.acoustic_convergence_validated,false);
 assert.match(v.memory_estimate_scope,/Not an AKABAK benchmark/);assert.match(out.files['README.txt'],/no coupled motor/);
});
