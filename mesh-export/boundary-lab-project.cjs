'use strict';
// Original MEH adapter against Boundary Lab schema 9 / physical model 1.
// Reuses the completed-surface validator, never an acoustic operator or result.
const fs=require('node:fs');
const path=require('node:path');
const {buildAbecProject,encodeMsh22,validateSurfaceMesh}=require('./abec-project.cjs');
const pretty=value=>JSON.stringify(value,null,2)+'\n';
const ensure=(condition,message)=>{if(!condition)throw new Error('Boundary Lab export: '+message);};
const dot=(a,b)=>a.reduce((sum,x,k)=>sum+x*b[k],0);

function buildBoundaryLabProject(input,options={}){
 const manifest=input?.manifest||options.manifest;
 ensure(manifest?.medium,'manifest must declare sound speed and density in medium');
 const f2=options.f2??manifest.mesh_request?.maximum_frequency_hz??1000;
 const f1=options.f1??Math.max(1,Math.floor(Math.min(100,f2/2)));
 // BL ProjectPreferencesState serializes whole-Hz bounds; reject truncation.
 ensure(Number.isSafeInteger(f1)&&Number.isSafeInteger(f2),'frequency bounds must be whole Hz for schema 9');
 const checked=buildAbecProject(input,{...options,f1,f2});
 const original=input.mesh||input.bem||input;
 const frame=checked.observation_frame;
 const basis=[frame.horizontal,frame.vertical,frame.forward];
 ensure(basis.every((row,i)=>basis.every((other,j)=>Math.abs(dot(row,other)-(i===j?1:0))<1e-12)),
  'observation frame must be orthonormal for a rigid coordinate transform');
 const rotate=v=>basis.map(axis=>dot(v,axis));
 const vertices=original.vertices_m||original.nodes;
 const faces=original.faces||(original.triangles||[]).map(t=>t.nodes);
 const tags=original.face_tags||(original.triangles||[]).map(t=>t.physicalTag);
 const convention=options.normalConvention||original.normal_convention;
 const mesh={
  vertices_m:vertices.map(p=>rotate(p.map((x,k)=>x-frame.origin_m[k]))),
  faces:faces.map(([a,b,c])=>convention==='air-outward'?[a,c,b]:[a,b,c]),
  face_tags:tags.slice(),normal_convention:'into-air'
 };
 // BL's ordinary polar observations are fixed at origin/+Z. Baking this rigid
 // frame change avoids its GUI rounding fractional imported translations to mm.
 // Validate and project the actual emitted binary64 coordinates, including the
 // tiny roundoff from rebasing, rather than copying pre-transform facet weights.
 const transformSource=d=>({...d,motion_into_air:rotate(d.motion_into_air||d.motion_into_front_air||d.direction)});
 const prepared=buildAbecProject({manifest,mesh},{...options,f1,f2,normalConvention:'into-air',
  groups:options.groups||original.groups||manifest.boundary_groups,
  drivers:(options.drivers||manifest.drivers||[]).map(transformSource),
  ventSources:(options.ventSources||manifest.vent_sources||[]).map(transformSource),
  mouthCenterM:[0,0,0],horizontal:[1,0,0],vertical:[0,1,0],forward:[0,0,1]});
 const rawGroups=options.groups||original.groups||manifest.boundary_groups;
 ensure(rawGroups.every(g=>g.tag<=2147483647),'physical tags exceed Gmsh int32 range');
 const present=new Set(tags),sourceTags=new Set(prepared.sources.map(s=>s.physical_tag));
 const groups=[],boundaries=[],components=[],ports=[],sources=[];
 const meshId='mesh:meh-exterior',regionId='region:exterior-air';
 const componentChannels=Object.create(null),channels=Object.create(null);
 let nextTag=rawGroups.reduce((n,g)=>Math.max(n,g.tag),0)+1;
 const addBoundary=(tag,name,kind)=>{
  const meshName='MEH_'+tag,id='boundary:meh:'+tag;
  groups.push({tag,meshName});
  boundaries.push({id,name,region_id:regionId,group:{mesh_id:meshId,dimension:2,name:meshName,tag},kind,parameters:{}});
  return id;
 };
 for(const group of [...rawGroups].sort((a,b)=>a.tag-b.tag))if(present.has(group.tag)&&!sourceTags.has(group.tag))
  addBoundary(group.tag,group.name||group.id||'Wall '+group.tag,'rigid');
 for(const source of prepared.sources){
  const componentId='component:'+source.id,portId='excitation:'+source.id,channel=source.id;
  const originalSource=checked.sources.find(s=>s.id===source.id);
  // Map keys are exact binary64 values. Do not round or convert via dB: a
  // normal-velocity component is uniform only within each equal-weight group.
  const buckets=new Map();
  source.face_indices.forEach((face,k)=>{
   const weight=source.normal_velocity_multipliers[k];
   if(!buckets.has(weight))buckets.set(weight,[]);
   buckets.get(weight).push(face);
  });
  const weights={};
  const projections=[...buckets].sort((a,b)=>a[0]-b[0]).map(([weight,indices],k)=>{
   const tag=k===0?source.physical_tag:nextTag++;
   ensure(Number.isSafeInteger(tag)&&tag<=2147483647,'physical tags exceed Gmsh int32 range');
   const boundaryId=addBoundary(tag,source.id+' projection '+(k+1),'moving');
   weights[boundaryId]=weight;
   indices.forEach(i=>mesh.face_tags[i]=tag);
   return {physical_tag:tag,boundary_id:boundaryId,normal_velocity_multiplier:weight,face_indices:indices};
  });
  components.push({id:componentId,name:source.id+' — unit axial velocity',kind:'ideal_velocity_source',
   boundary_ids:projections.map(g=>g.boundary_id),parameters:{motion_profile:'uniform',boundary_motion_weights:weights}});
  ports.push({id:portId,name:source.id+' axial velocity (m/s)',component_id:componentId,kind:'normal_velocity'});
  componentChannels[componentId]=channel;
  channels[channel]={voltage_v:1,level_db:0,polarity:1,delay_ms:0};
  // Do not propagate ABEC-specific elementary selectors or its vent mute flag.
  const {driving_group,projection_groups,elementary_tags,default_observation_weight,...physicalSource}=source;
  sources.push({...physicalSource,original_motion_into_air:originalSource.motion_into_air,
   original_projected_area_m2:originalSource.projected_area_m2,
   component_id:componentId,excitation_port_id:portId,channel_name:channel,
   projection_groups:projections,physical_tags:source.face_indices.map(i=>mesh.face_tags[i])});
 }
 const transform={description:'p_BLab = rows(horizontal, vertical, forward) * (p_MEH - mouth_origin_m)',
  origin_m:frame.origin_m,rotation_rows:basis,mesh_translation_m:[0,0,0],scale_to_m:1};
 const metadata={exporter:'MEH Boundary Lab adapter v1',design_sha256:manifest.design_sha256,
  source_basis:'independent prescribed axial-velocity bases; facet normal velocity = axial velocity * dot(normal_into_air, motion_into_air)',
  source_projection_rounding:'none; exact equal binary64 values only',coordinate_transform:transform,
  original_observation_frame:frame,saved_design_voltage_is_metadata_only:true,
  channel_defaults:'neutral unit weights, including vents; combined channel plots are arbitrary superpositions',
  rear_chamber_and_motor_coupling:'absent',acoustic_solve:'not run'};
 const system={model_version:1,id:'system:meh-exterior',name:'MEH prescribed velocity bases',
  meshes:[{id:meshId,name:'MEH exterior',file:'boundary.msh',purpose:'bem_surface',scale_to_m:1,translation_m:[0,0,0]}],
  regions:[{id:regionId,name:'Connected front passages and exterior air',kind:'unbounded_air',mesh_ids:[meshId],volume_groups:[],
   sound_speed_m_per_s:manifest.medium.sound_speed_m_s,density_kg_per_m3:manifest.medium.density_kg_m3,loss_model:{}}],
  boundaries,components,excitation_ports:ports,interfaces:[],metadata};
 const project={schema_version:9,generator_documents:[],active_generator_document_id:null,
  imported_meshes:[{name:'MEH exterior',source_file:'boundary.msh',cleaned_file:'boundary.msh',enabled:true,scale_factor:1,translation_mm:[0,0,0]}],
  stitch_exterior_meshes:false,symmetry:'off',source_config_by_name:{},channel_config_by_name:channels,
  max_spl_limits_by_channel:{},component_channel_by_id:componentChannels,observation_planes:[],
  project_preferences:{freq_min_hz:f1,freq_max_hz:f2,freq_count:options.numFrequencies??24,
   polar_observation_distance_m:2,polar_angle_step_deg:5,normalized_channel_correction:false,
   polar_smoothing:null,horizontal_normalization_angle:0,vertical_normalization_angle:0,spherical_sampling_enabled:false},
  physical_system:system};
 const warnings=[
  'Loader/preparation validation and an acoustic solve are distinct; this writer runs neither.',
  'Unit prescribed velocity is not the saved voltage-driven system response. No motor, rear chamber or crossover coupling is included.',
  'Every source has a neutral channel, including vents. Boundary Lab schema 9 has no exact channel mute; use a one-source request for an isolated basis.',
  'Geometry validation and native preparation do not establish acoustic accuracy, convergence or validity of previous solver results.'
 ];
 const validation={schema:'meh-boundary-lab-bundle/v1',project_schema_version:9,physical_model_version:1,
  model:'single-exterior',length_unit:'m',normal_convention:'into-air',mesh_format:'Gmsh 2.2 ASCII, linear triangles',
  mesh_coordinate_transform:transform,mesh_translation_m:[0,0,0],mesh_vertices_and_connectivity:'same indexed surface under explicit rigid mouth-frame transform; winding into air',
  source_projection_maximum_rounding_error:0,source_count:sources.length,
  original_source_tags:sources.map(s=>s.physical_tag),projection_group_count:sources.reduce((n,s)=>n+s.projection_groups.length,0),
  medium:manifest.medium,checks:validateSurfaceMesh(mesh).report,observation_frame:prepared.observation_frame,
  native_preparation:'not run by writer',acoustic_solve:'not run',warnings};
 const sourceMap={schema:'meh-boundary-lab-source-map/v1',design_sha256:manifest.design_sha256,
  normal_convention:'into-air',original_face_tags:tags,coordinate_transform:transform,
  observation_frame:frame,output_observation_frame:prepared.observation_frame,sources};
 const request=ids=>({schema_version:1,excitation_port_ids:ids,include_project_observations:true,
  probes:[{id:'mouth-axis-1m',points_m:[[0,0,1]]}],retain:[]});
 const files={'project.blab.json':pretty(project),
  'boundary.msh':encodeMsh22(mesh,groups.sort((a,b)=>a.tag-b.tag),mesh.face_tags),
  'source-map.json':pretty(sourceMap),'adapter-validation.json':pretty(validation),
  'boundary-manifest.json':pretty({...manifest,boundary_lab_export:validation}),
  'requests/all-sources.json':pretty(request(ports.map(p=>p.id)))};
 for(const s of sources)files['requests/source-'+s.physical_tag+'.json']=pretty(request([s.excitation_port_id]));
 files['README.txt']=[
  'MEH BOUNDARY LAB PROJECT — prescribed axial-velocity bases',
  '', 'Open project.blab.json with boundary.msh beside it. Paths are relative.',
  'Boundary Lab project schema 9, physical model 1. Full geometry, SI meters.',
  'Coordinates are rigidly rebased into the exact mouth frame: origin at the mouth,',
  '+Z forward, +X horizontal, +Y vertical. Vertex and face indices are preserved.',
  'Mesh/import scale is 1 and translation is zero; no GUI millimeter rounding.',
  'Triangles point from the excluded solid into the air, reversing native air-outward',
  'winding once. The mouth is open; diagnostic caps are absent; HF throat is rigid.',
  '', 'Each original driver or vent remains one independent component, channel and port.',
  'Each port is a 1 m/s axial-velocity basis; normal velocity is projected per facet.',
  'Exactly equal projection values share a Gmsh physical group and a positive',
  'boundary_motion_weight. No weights are rounded. source-map.json retains the',
  'original source tag, every face index, transformed motion axis and exact weight.',
  'The original tag identifies the first subgroup; additional physical tags identify',
  'the other projections. Select the component to select the whole physical source.',
  '', 'All channels have neutral unit weight, including vent channels. The current',
  'schema has no exact mute. Combined plots are arbitrary unit-velocity sums,',
  'not a predicted system response. Normalized channel correction is disabled.',
  'Saved voltage is provenance only; voltage_v does not drive normal-velocity ports.',
  'Use requests/source-<original-tag>.json to select one independent basis.',
  '', 'Native preparation, without solving (requires Boundary Lab installed):',
  '  blab project validate project.blab.json --backend beat_cpu --json',
  '  blab project validate project.blab.json --backend beat_cpu --request requests/source-'+sources[0].physical_tag+'.json --json',
  'The request adds a 1 m on-axis probe; ordinary horizontal/vertical polars use 2 m.',
  'Medium is transferred explicitly: c='+manifest.medium.sound_speed_m_s+' m/s, rho='+manifest.medium.density_kg_m3+' kg/m3.',
  '',...warnings.map(w=>'- '+w),
  '', 'No Boundary Lab acoustic operator, cached solution or previous solver result is reused.',
  'See docs/boundary-lab-export.md in the MEH repository for schema provenance and tests.',''
 ].join('\n');
 return {files,validation,sources,observation_frame:prepared.observation_frame};
}
module.exports={buildBoundaryLabProject};
if(require.main===module){
 try{
  const args=process.argv.slice(2),inputFile=args.shift(),outAt=args.indexOf('--out'),manifestAt=args.indexOf('--manifest');
  ensure(inputFile&&outAt>=0&&args[outAt+1],'usage: node boundary-lab-project.cjs boundary.json --manifest manifest.json --out bundle-dir');
  const input=JSON.parse(fs.readFileSync(inputFile,'utf8'));
  if(manifestAt>=0){const job=JSON.parse(fs.readFileSync(args[manifestAt+1],'utf8'));input.manifest=job.manifest||job;input.horn=job.horn||input.horn;}
  const out=path.resolve(args[outAt+1]),bundle=buildBoundaryLabProject(input);
  for(const [name,data] of Object.entries(bundle.files)){const file=path.join(out,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
  process.stdout.write(pretty({out,triangles:bundle.validation.checks.triangle_count,sources:bundle.sources.map(s=>s.id),acoustic_solve:'not run'}));
 }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
