'use strict';
// Separate experimental coupled-domain adapter. Existing single-exterior output
// remains unchanged. Syntax/semantics: official ATH 2025-06 output templates and
// R&D Team AKABAK CHM, Subdomain Modeling / Form - Interface. No proprietary run.
const fs=require('node:fs'),path=require('node:path');
const {buildAbecProject,validateSurfaceMesh,encodeMsh22}=require('./abec-project.cjs');
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>Math.hypot(...v);
const check=(v,m)=>{if(!v)throw Error('ABEC subdomains: '+m);};
const pretty=x=>JSON.stringify(x,null,2)+'\n';
function compact(mesh,indices,flip=false){
 const ids=new Map(),vertices_m=[],faces=[],face_tags=[];
 for(const i of indices){let f=mesh.faces[i].map(old=>{if(!ids.has(old)){ids.set(old,vertices_m.length);vertices_m.push(mesh.vertices_m[old]);}return ids.get(old);});if(flip)f=[f[0],f[2],f[1]];faces.push(f);face_tags.push(mesh.face_tags[i]);}
 return {vertices_m,faces,face_tags};
}
function welder(tolerance){
 const vertices_m=[],faces=[],face_tags=[],elementary_tags=[],owners=[],buckets=new Map();let maximumSnap=0;
 function vertex(p){
  const q=p.map(x=>Math.floor(x/tolerance));
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)for(const i of buckets.get([q[0]+a,q[1]+b,q[2]+c].join(':'))||[]){const d=norm(sub(vertices_m[i],p));if(d<=tolerance){maximumSnap=Math.max(maximumSnap,d);return i;}}
  const i=vertices_m.length;vertices_m.push(p.slice());const k=q.join(':');if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(i);return i;
 }
 return {vertices_m,faces,face_tags,elementary_tags,owners,
  triangle(points,tag,elementary,owner){const f=points.map(vertex);check(new Set(f).size===3,'welding collapsed a triangle');faces.push(f);face_tags.push(tag);elementary_tags.push(elementary);owners.push(owner);return faces.length-1;},
  maxSnap:()=>maximumSnap};
}
function buildAbecSubdomains(job,bem,options={}){
 check(job?.manifest&&Array.isArray(job.parts?.branches),'a canonical geometry job with closed branches is required');
 const branches=job.parts.branches,manifest=job.manifest,driverByTag=new Map(manifest.drivers.map(d=>[d.source_tag,d]));
 check(branches.length>0&&branches.length===driverByTag.size,'one closed front branch per independent driver is required');
 check(new Set(branches.map(b=>b.id)).size===branches.length&&new Set(branches.map(b=>b.source_tag)).size===branches.length&&new Set(branches.map(b=>b.entry_interface_tag)).size===branches.length,'branch ids, sources and interfaces must each be unique');
 // Validate the unchanged baseline independently and reuse only its project,
 // observations and explicit coordinate/source conventions.
 const baseline=buildAbecProject({manifest,mesh:bem,horn:job.horn},{...options,normalConvention:'air-outward'});
 const tolerance=options.weldToleranceM??1e-10;check(Number.isFinite(tolerance)&&tolerance>0&&tolerance<=1e-9,'welding tolerance must be at most 1 nm');
 const mesh=welder(tolerance),domains=[{id:1,name:'Horn and unbounded exterior',type:'Exterior',face_indices:[]}],interfaces=[],sources=[],components=[];
 const availableTags=new Set(manifest.boundary_groups.map(g=>g.tag));let nextElementary=Math.max(...availableTags)+1;
 const groupInfo=new Map(manifest.boundary_groups.map(g=>[g.tag,{tag:g.tag,name:g.id||g.name||String(g.tag),meshName:'MEH_'+g.tag}]));
 const exteriorTagSet=new Set(),branchSourceTags=new Set(branches.map(b=>b.source_tag));
 const exteriorSources=baseline.sources.filter(s=>!branchSourceTags.has(s.physical_tag)),exteriorSourceTags=new Set(exteriorSources.map(s=>s.physical_tag)),exteriorIndices=new Map();
 // Every rigid external surface keeps its solver-required inward-air normal.
 for(let i=0;i<bem.faces.length;i++){
  const tag=bem.face_tags[i];if(tag===10||branchSourceTags.has(tag))continue;
  check(tag!==301&&!(tag>=201&&tag<300),'the supplied baseline must have no diagnostic or coupling caps');
  check(availableTags.has(tag),'unknown exterior boundary tag');if(!exteriorSourceTags.has(tag))exteriorTagSet.add(tag);
  const f=bem.faces[i];const index=mesh.triangle([bem.vertices_m[f[0]],bem.vertices_m[f[2]],bem.vertices_m[f[1]]],tag,tag,{domain:1});domains[0].face_indices.push(index);exteriorIndices.set(i,index);
 }
 check(domains[0].face_indices.length>0,'exterior boundary is empty');
 for(const tag of exteriorTagSet)components.push({name:'Exterior_'+tag,domain:1,elementary_tag:tag,role:'rigid-wall'});
 for(const original of exteriorSources){
  const source={...original,domain:1,face_indices:original.face_indices.map(i=>exteriorIndices.get(i)),projection_groups:[]};
  check(source.face_indices.every(Number.isSafeInteger),'exterior source facet was lost during domain partition');
  source.projection_groups=original.projection_groups.map((p,k)=>{
   const tag=nextElementary++,faces=p.face_indices.map(i=>exteriorIndices.get(i));faces.forEach(i=>mesh.elementary_tags[i]=tag);
   components.push({name:'Source_'+source.physical_tag+'_Projection_'+(k+1),domain:1,elementary_tag:tag,role:'source',driving_group:source.driving_group,weight:p.normal_velocity_multiplier});
   return {...p,elementary_tag:tag,face_indices:faces};
  });
  sources.push(source);
 }
 for(let bi=0;bi<branches.length;bi++){
  const branch=branches[bi],driver=driverByTag.get(branch.source_tag),sid=11+bi,interfaceTag=branch.entry_interface_tag;
  check(driver&&branch.id===driver.branch_id,'branch/source identity mismatch');
  check(interfaceTag===driver.entry_interface_tag&&interfaceTag>=201&&interfaceTag<300,'branch interface identity mismatch');
  check(branch.faces.length===branch.face_tags.length,'branch face/tag count mismatch');
  check(branch.face_tags.every(t=>[10,branch.source_tag,interfaceTag].includes(t)),'unexpected branch physical tag');
  check(branch.face_tags.includes(interfaceTag),'branch is missing its transparent root interface');
  // Canonical branch winding is OUTWARD from finite air. This check is
  // independent of the later imported, welded per-domain reconstruction.
  const canonical=validateSurfaceMesh(branch).report;check(canonical.boundary_component_count===1,'branch must bound one connected finite air volume');
  const axis=driver.motion_into_front_air;check(Array.isArray(axis)&&axis.length===3&&Math.abs(norm(axis)-1)<1e-7,'invalid cone motion direction');
  const domain={id:sid,name:branch.id+' front air',type:'Interior',branch_id:branch.id,face_indices:[],canonical_air_volume_m3:canonical.components[0].excluded_solid_volume_m3};domains.push(domain);
  const wallElementary=nextElementary++;components.push({name:'BranchWall_'+sid,domain:sid,elementary_tag:wallElementary,role:'rigid-wall'});
  const source={id:driver.id,source_type:'driver',velocity_basis:'rigid driver axial piston velocity',default_observation_weight:1,physical_tag:branch.source_tag,driving_group:driver.abec_driving_group??(1000+branch.source_tag),domain:sid,motion_into_air:axis.slice(),face_indices:[],normal_velocity_multipliers:[],projection_groups:[],surface_area_m2:0,projected_area_m2:0,nominal_sd_m2:driver.nominal_sd_m2,saved_voltage_rms:driver.saved_voltage_rms};
  const projectionMap=new Map();const coupling={id:branch.id+'_entry',physical_tag:interfaceTag,elementary_tag:interfaceTag,subdomains:[sid,1],normal_points_into_domain:sid,face_indices:[],source_branch_id:branch.id};interfaces.push(coupling);
  for(let fi=0;fi<branch.faces.length;fi++){
   const tag=branch.face_tags[fi],f=branch.faces[fi],points=[branch.vertices_m[f[0]],branch.vertices_m[f[2]],branch.vertices_m[f[1]]];let elementary=wallElementary;
   if(tag===interfaceTag)elementary=interfaceTag;
   if(tag===branch.source_tag){
    const normal=cross(sub(points[1],points[0]),sub(points[2],points[0])),twiceArea=norm(normal),weight=dot(normal,axis)/twiceArea;
    check(weight>0&&weight<=1+1e-12,'cone facet faces away from its motion into air');const key=weight.toFixed(12);
    if(!projectionMap.has(key)){const g={elementary_tag:nextElementary++,normal_velocity_multiplier:Number(key),face_indices:[]};projectionMap.set(key,g);source.projection_groups.push(g);}
    elementary=projectionMap.get(key).elementary_tag;source.surface_area_m2+=twiceArea/2;source.projected_area_m2+=twiceArea*weight/2;source.normal_velocity_multipliers.push(weight);
   }
   const index=mesh.triangle(points,tag,elementary,tag===interfaceTag?{interface:[sid,1]}:{domain:sid});domain.face_indices.push(index);
   if(tag===interfaceTag){coupling.face_indices.push(index);domains[0].face_indices.push(index);}
   if(tag===branch.source_tag){source.face_indices.push(index);source.projection_groups.find(g=>g.elementary_tag===elementary).face_indices.push(index);}
  }
  check(source.face_indices.length>0,'branch has no moving cone');check(Math.abs(source.projected_area_m2/driver.projected_mesh_area_m2-1)<1e-6,'projected source area does not match canonical metadata');
  check(Math.abs(source.projected_area_m2/driver.nominal_sd_m2-1)<.002,'projected source area differs from catalog Sd by at least 0.2%');sources.push(source);
  source.projection_groups.forEach((p,k)=>components.push({name:'Source_'+branch.source_tag+'_Projection_'+(k+1),domain:sid,elementary_tag:p.elementary_tag,role:'source',driving_group:source.driving_group,weight:p.normal_velocity_multiplier}));
 }
 // Validate CLOSED reconstructed domain boundaries. The aggregate has three
 // faces at each shared root edge by design and is not a manufacturing shell.
 const domainReports=[];
 for(const domain of domains){
  const boundary=compact(mesh,domain.face_indices,false);
  for(let local=0;local<domain.face_indices.length;local++){
   const owner=mesh.owners[domain.face_indices[local]];
   // Shared interface is stored normal into Interior. Exterior uses its exact
   // opposite; the paired SubDomain declaration handles this in the solver.
   if(owner.interface&&domain.id===1)[boundary.faces[local][1],boundary.faces[local][2]]=[boundary.faces[local][2],boundary.faces[local][1]];
  }
  let positive=boundary;if(domain.type==='Interior')positive={...boundary,faces:boundary.faces.map(([a,b,c])=>[a,c,b])};
  const qc=validateSurfaceMesh(positive).report;const volume=qc.components.reduce((s,c)=>s+c.excluded_solid_volume_m3,0);
  if(domain.type==='Interior'){check(qc.boundary_component_count===1,'reconstructed branch has disconnected boundary');check(Math.abs(volume/domain.canonical_air_volume_m3-1)<1e-7,'welding changed branch enclosed air volume');}
  domainReports.push({id:domain.id,name:domain.name,type:domain.type,triangles:boundary.faces.length,closed_two_manifold:qc.closed_two_manifold,consistent_winding:qc.consistent_winding,boundary_component_count:qc.boundary_component_count,solver_normal_convention:'into this air domain',solver_signed_volume_m3:domain.type==='Interior'?-volume:volume,finite_air_volume_m3:domain.type==='Interior'?volume:null,excluded_volume_m3:domain.type==='Exterior'?volume:null,dense_complex128_matrix_bytes:16*boundary.faces.length**2});
 }
 const solidVolume=baseline.validation.checks.components.reduce((s,c)=>s+c.excluded_solid_volume_m3,0),airVolume=domainReports.slice(1).reduce((s,d)=>s+d.finite_air_volume_m3,0),excluded=domainReports[0].excluded_volume_m3;
 const partitionVolumeError=Math.abs(excluded-solidVolume-airVolume)/Math.max(excluded,1e-12);check(partitionVolumeError<1e-7,'branch/exterior partition volume is inconsistent with the validated full boundary');
 // Recompute source motion from final exported coordinates, independently of
 // the canonical per-face calculation above. Welding may never silently alter
 // the source velocity or projected area used by the boundary condition.
 let maximumExportedProjectionError=0;
 for(const source of sources){let area=0,projected=0;
  for(const group of source.projection_groups)for(const i of group.face_indices){
   const [a,b,c]=mesh.faces[i].map(n=>mesh.vertices_m[n]),twice=cross(sub(b,a),sub(c,a)),twiceArea=norm(twice),weight=dot(twice,source.motion_into_air)/twiceArea;
   check(weight>0,'exported source normal faces away from its motion into air');
   const error=Math.abs(weight-group.normal_velocity_multiplier);maximumExportedProjectionError=Math.max(maximumExportedProjectionError,error);check(error<5.1e-13,'welding changed a source normal projection');
   area+=twiceArea/2;projected+=dot(twice,source.motion_into_air)/2;
  }
  check(Math.abs(projected/source.projected_area_m2-1)<1e-10&&Math.abs(area/source.surface_area_m2-1)<1e-10,'welding changed the moving surface area');
 }
 const selected=new Set(components.map(c=>c.elementary_tag));interfaces.forEach(i=>selected.add(i.elementary_tag));check(selected.size===components.length+interfaces.length,'ambiguous elementary-group selection');check(mesh.elementary_tags.every(t=>selected.has(t)),'an acoustic triangle is not selected by a component');
 const header=baseline.files['solving.txt'].split('SubDomain_Properties')[0].replace('// Connected front passages and exterior are ONE exterior fluid; mouth has no cap.','// '+branches.length+' finite front branches couple to horn/exterior through transparent root interfaces.');
 const solving=[header.trimEnd(),''];
 for(const d of domains)solving.push('SubDomain_Properties "'+d.name.replace(/["\x00-\x1f]/g,' ')+'"','  SubDomain='+d.id,'  ElType='+d.type,'');
 for(const c of components){
  solving.push('Elements "'+c.name+'"','  SubDomain='+c.domain,'  MeshFileAlias="M1"','  1 Mesh Include '+c.elementary_tag,'');
  if(c.role==='source')solving.push('Driving "Drive_'+c.name+'"','  RefElements="'+c.name+'"','  DrvGroup='+c.driving_group,'  DrvWeight='+c.weight,'');
 }
 for(const i of interfaces)solving.push('// Transparent interface, not a wall or a source. Normal points INTO '+i.subdomains[0]+'.','Elements "Interface_'+i.physical_tag+'"','  SubDomain='+i.subdomains.join(','),'  MeshFileAlias="M1"','  1 Mesh Include '+i.elementary_tag,'');
 const present=[...new Set(mesh.face_tags)].sort((a,b)=>a-b),groups=present.map(tag=>{check(groupInfo.has(tag),'interface tag missing from shared manifest');return groupInfo.get(tag);});
 const localMatrixBytes=domainReports.reduce((s,d)=>s+d.dense_complex128_matrix_bytes,0),interfaceTriangles=interfaces.reduce((s,i)=>s+i.face_indices.length,0);
 const validation={schema:'meh-abec-subdomains/v1',passed_topology_and_partition_checks:true,requested_medium:baseline.validation.requested_medium,acoustic_medium_transfer:baseline.validation.acoustic_medium_transfer,required_solver_medium_setup:baseline.validation.required_solver_medium_setup,physical_tag_triangle_counts:mesh.face_tags.reduce((counts,tag)=>(counts[tag]=(counts[tag]||0)+1,counts),{}),design_sha256:manifest.design_sha256,normal_convention:'Into each domain; interfaces stored toward first (interior) domain and opposite on exterior side',domain_reports:domainReports,partition_volume_relative_error:partitionVolumeError,interface_count:interfaces.length,interface_triangles_stored_once:interfaceTriangles,shared_interface_geometry:'One shared set of triangles and vertex ids; equal/opposite domain incidence by construction',all_triangles_have_one_physical_tag_and_one_component:true,aggregate_is_manufacturing_manifold:false,weld_tolerance_m:tolerance,maximum_weld_displacement_m:mesh.maxSnap(),maximum_exported_source_projection_error:maximumExportedProjectionError,stored_nodes:mesh.vertices_m.length,stored_triangles:mesh.faces.length,one_full_baseline_dense_matrix_bytes:baseline.validation.dense_complex128_matrix_bytes,sum_of_local_dense_matrix_bytes:localMatrixBytes,peak_one_local_dense_matrix_bytes:Math.max(...domainReports.map(d=>d.dense_complex128_matrix_bytes)),memory_estimate_scope:'16*N^2 bytes per hypothetical complex128 matrix from input faces only. Excludes interface system, refinement, factorization, parallel copies and workspaces. Not an AKABAK benchmark or peak-RAM prediction.',proprietary_solver_validation:'not run',physical_accuracy_validated:false,acoustic_convergence_validated:false,interface_self_intersection_check:'Not established by this adapter. Required before solver qualification.',syntax_provenance:['Official ATH 2025-06 template: SubDomain_Properties with Interior/Exterior; Elements with paired SubDomain ids','Official R&D Team AKABAK manual: Form - Interface, Normals and Volumes - Interface Elements, Subdomain Modeling']};
 const sourceMap={schema:'meh-abec-source-map/v1',design_sha256:manifest.design_sha256,sources:sources.map(s=>({...s,elementary_tags:s.face_indices.map(i=>mesh.elementary_tags[i])}))};
 const readme=['MEH coupled front-subdomain project — experimental import candidate','',
  'The '+branches.length+' finite front air branches are Interior subdomains '+domains.slice(1).map(d=>d.id).join(', ')+'.',
  'The connected horn and free exterior are Exterior subdomain 1.',
  'Root interfaces '+interfaces.map(i=>i.physical_tag).join(', ')+' connect each branch to the horn/exterior. They are',
  'transparent pressure/flow connections, not prescribed sources, rigid caps, or',
  'independent simulations. The horn mouth is open in the exterior domain.',
  '',
  'Each interface is stored ONCE. SubDomain=interior,exterior identifies its sides.',
  'Its triangle normals point into the first named interior domain. The exterior',
  'side uses exactly the opposite normal. Both sides use identical vertices and triangles.',
  'The aggregate therefore has three incident faces along each interface rim.',
  'Inspect closure PER DOMAIN, not by treating the aggregate as a manufacturing shell.',
  '',
  'In AKABAK use Tools > Import ABEC Project, select project.abec, Start Import,',
  'review the interpretation log and SI units, then Apply. Inspect all '+domains.length+' domains,',
  interfaces.length+' Interface objects, normals, source groups and fixed driving before solving.',
  baseline.validation.required_solver_medium_setup,
  'The script does not transfer these medium settings. Do not assume solver defaults match.',
  'This .abec/script grammar is grounded in the official ATH output templates;',
  'interface physics/orientation is grounded in R&D Team manual documentation.',
  'Proprietary AKABAK/ABEC import, interpretation and solve have NOT been run.',
  '',
  'Sources remain independent axial velocity bases. All mutual loading',
  'terms remain in observation.txt. Saved electrical voltage and rear loading',
  'are metadata; this project has no coupled motor or rear-compliance LEM.',
  'Do not describe its unit-velocity plots as a 1 V sensitivity prediction.',
  'Any vent-inlet sources remain in Exterior subdomain 1 and default to zero weight.',
  'Select them individually in observation.txt for a prescribed inlet-velocity basis;',
  'this does not solve the vent flow from the rear chamber or driver motor.',
  '',
  'Domain decomposition can reduce local matrix sizes but does not guarantee a',
  'practical solve. adapter-validation.json reports arithmetic size estimates;',
  'AKABAK refinement, interface systems and solver workspaces are not included.',
  'The canonical source facets and interfaces may be refined by the solver.',
  'Converge interface density, local boundaries, complex load and fields before use.',
  'Rigid lossless walls, assumed cones and unresolved viscothermal losses remain.',
  '',
  'References:',
  'https://www.randteam.de/AKABAK3/AKABAK-Help-Instructions.html',
  'https://at-horns.eu/release/ath-2025-06.zip',
  'https://at-horns.eu/release/Ath-4.8.2-UserGuide.pdf',''].join('\n');
 const boundaryManifest={...manifest,abec_export:validation,abec_domains:domainReports,abec_interfaces:interfaces.map(({face_indices,...x})=>({...x,triangle_count:face_indices.length})),abec_source_motion:'Rigid axial piston velocity with per-facet cosine projection, grouped at 12 decimal places'};
 return {files:{'project.abec':baseline.files['project.abec'],'boundary.msh':encodeMsh22(mesh,groups,mesh.elementary_tags),'solving.txt':solving.join('\n'),'observation.txt':baseline.files['observation.txt'],'source-map.json':pretty(sourceMap),'boundary-manifest.json':pretty(boundaryManifest),'adapter-validation.json':pretty(validation),'README.txt':readme},validation,interfaces,sources:sourceMap.sources,mesh:{vertices_m:mesh.vertices_m,faces:mesh.faces,face_tags:mesh.face_tags,elementary_tags:mesh.elementary_tags,owners:mesh.owners},domains};
}
module.exports={buildAbecSubdomains};
if(require.main===module){try{const [jobFile,bemFile,...args]=process.argv.slice(2),i=args.indexOf('--out');check(jobFile&&bemFile&&i>=0&&args[i+1],'usage: node abec-subdomains.cjs geometry-job.json bem-air-outward.json --out DIR');const b=buildAbecSubdomains(JSON.parse(fs.readFileSync(jobFile,'utf8')),JSON.parse(fs.readFileSync(bemFile,'utf8'))),out=path.resolve(args[i+1]);fs.mkdirSync(out,{recursive:true});for(const[n,v]of Object.entries(b.files))fs.writeFileSync(path.join(out,n),v);process.stdout.write(pretty({out,triangles:b.validation.stored_triangles,domains:b.validation.domain_reports.map(d=>({id:d.id,type:d.type,triangles:d.triangles})),proprietary_solver_validation:'not run'}));}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}}
