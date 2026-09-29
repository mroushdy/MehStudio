'use strict';
// Original MEH implementation. Solver syntax is independently checked against
// R&D Team's AKABAK help and the official ATH distribution (see formulation doc).
// No Hornstudio implementation is copied.
const fs = require('node:fs');
const path = require('node:path');
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,k)=>a.map(x=>x*k);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const ensure=(condition,message)=>{if(!condition)throw new Error('ABEC export: '+message);};
const finiteVec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
// JavaScript's shortest round-tripping representation keeps binary64 vertices
// unchanged across a text round trip and always uses a locale-independent dot.
const number=x=>Object.is(x,-0)?'0':Number(x).toString();
const comment=s=>String(s).replace(/[\r\n\x00-\x1f]/g,' ');
const pretty=x=>JSON.stringify(x,null,2)+'\n';
function unit(v,label){ensure(finiteVec(v),label+' must be a finite vector');const n=length(v);ensure(Math.abs(n-1)<1e-7,label+' must be a unit vector');return v.map(x=>x/n);}
function canonicalMesh(input){
 const v=input.vertices_m||input.nodes;
 const f=input.faces||(input.triangles||[]).map(t=>t.nodes);
 const t=input.face_tags||(input.triangles||[]).map(t=>t.physicalTag);
 ensure(Array.isArray(v)&&v.length>=4,'vertices_m must contain at least four points in meters');
 ensure(Array.isArray(f)&&f.length>=4&&Array.isArray(t)&&t.length===f.length,'each triangular face needs exactly one physical tag');
 return {vertices_m:v.map(p=>{ensure(finiteVec(p),'non-finite vertex');return p.slice();}),faces:f.map(p=>{ensure(Array.isArray(p)&&p.length===3,'only triangle elements are supported');return p.slice();}),face_tags:t.slice()};
}
function validateSurfaceMesh(mesh){
 const {vertices_m:v,faces:f,face_tags:tags}=mesh,edges=new Map(),duplicates=new Set(),adj=f.map(()=>[]),incident=v.map(()=>[]),used=new Set();
 const normals=[],areas=[],counts={},areasByTag={};let maxEdge=0,minEdge=Infinity,minQuality=Infinity;
 f.forEach((face,i)=>{
  ensure(face.every(k=>Number.isSafeInteger(k)&&k>=0&&k<v.length),'invalid vertex index at face '+i);
  ensure(new Set(face).size===3,'repeated vertex index at face '+i);
  ensure(Number.isSafeInteger(tags[i])&&tags[i]>0,'physical tags must be positive integers');
  const key=[...face].sort((a,b)=>a-b).join(':');ensure(!duplicates.has(key),'duplicate or coincident indexed face '+i);duplicates.add(key);
  const c=cross(sub(v[face[1]],v[face[0]]),sub(v[face[2]],v[face[0]])),twiceArea=length(c);
  ensure(Number.isFinite(twiceArea)&&twiceArea>2e-18,'zero or near-zero area at face '+i);
  normals.push(mul(c,1/twiceArea));areas.push(twiceArea/2);
  let edgeSquared=0;face.forEach((a,j)=>{used.add(a);incident[a].push(i);const b=face[(j+1)%3],e=length(sub(v[a],v[b]));minEdge=Math.min(minEdge,e);maxEdge=Math.max(maxEdge,e);edgeSquared+=e*e;
   const k=Math.min(a,b)+':'+Math.max(a,b);if(!edges.has(k))edges.set(k,[]);edges.get(k).push({face:i,sign:a<b?1:-1});
  });
  minQuality=Math.min(minQuality,2*Math.sqrt(3)*twiceArea/edgeSquared);
  counts[tags[i]]=(counts[tags[i]]||0)+1;areasByTag[tags[i]]=(areasByTag[tags[i]]||0)+twiceArea/2;
 });
 for(const [key,uses] of edges){ensure(uses.length===2,'surface is not a closed two-manifold at edge '+key+' ('+uses.length+' incident faces)');ensure(uses[0].sign===-uses[1].sign,'inconsistent triangle winding at edge '+key);adj[uses[0].face].push(uses[1].face);adj[uses[1].face].push(uses[0].face);}
 // Two faces per edge is insufficient: two otherwise closed surfaces can
 // touch at one indexed vertex. Its incident-face link must be one cycle.
 incident.forEach((faces,vertex)=>{
  ensure(faces.length>0,'unused vertices are not allowed; compact the mesh before export');
  const remaining=new Set(faces),stack=[faces[0]];remaining.delete(faces[0]);
  for(let k=0;k<stack.length;k++)for(const other of adj[stack[k]])if(remaining.has(other)){remaining.delete(other);stack.push(other);}
  ensure(remaining.size===0,'nonmanifold pinched vertex '+vertex);
 });
 const seen=new Set(),components=[];
 for(let start=0;start<f.length;start++)if(!seen.has(start)){
  const queue=[start];seen.add(start);for(let k=0;k<queue.length;k++)for(const j of adj[queue[k]])if(!seen.has(j)){seen.add(j);queue.push(j);}
  const origin=v[f[start][0]],volume=queue.reduce((s,i)=>s+dot(sub(v[f[i][0]],origin),cross(sub(v[f[i][1]],origin),sub(v[f[i][2]],origin)))/6,0);
  ensure(volume>1e-18,'closed component normals must point from the excluded solid into air (positive enclosed signed volume)');
  components.push({face_count:queue.length,excluded_solid_volume_m3:volume});
 }
 ensure(used.size===v.length,'unused vertices are not allowed; compact the mesh before export');
 const bounds={min:[0,1,2].map(k=>v.reduce((n,p)=>Math.min(n,p[k]),Infinity)),max:[0,1,2].map(k=>v.reduce((n,p)=>Math.max(n,p[k]),-Infinity))};
 return {normals,areas,report:{closed_two_manifold:true,consistent_winding:true,boundary_component_count:components.length,components,vertex_count:v.length,triangle_count:f.length,edge_count:edges.size,physical_tag_triangle_counts:counts,physical_tag_area_m2:areasByTag,minimum_edge_m:minEdge,maximum_edge_m:maxEdge,minimum_triangle_quality:minQuality,bounds_m:bounds,self_intersections:'Not established by this writer; require the native geometry validation report.',acoustic_convergence:'Not established by format or topology checks.'}};
}
function encodeMsh22(mesh,groups,elementaryTags){
 const lines=['$MeshFormat','2.2 0 8','$EndMeshFormat','$PhysicalNames',String(groups.length)];
 for(const g of groups)lines.push('2 '+g.tag+' "'+g.meshName+'"');
 lines.push('$EndPhysicalNames','$Nodes',String(mesh.vertices_m.length));
 mesh.vertices_m.forEach((v,i)=>lines.push((i+1)+' '+v.map(number).join(' ')));
 lines.push('$EndNodes','$Elements',String(mesh.faces.length));
 mesh.faces.forEach((f,i)=>lines.push((i+1)+' 2 2 '+mesh.face_tags[i]+' '+elementaryTags[i]+' '+f.map(n=>n+1).join(' ')));
 lines.push('$EndElements','');return lines.join('\n');
}
function buildAbecProject(input,options={}){
 ensure(input&&typeof input==='object','input is required');const manifest=input.manifest||options.manifest;
 ensure(manifest&&manifest.units?.length==='m','manifest must explicitly declare length units m');
 ensure(typeof manifest.design_sha256==='string'&&/^[a-f0-9]{64}$/i.test(manifest.design_sha256),'manifest must contain design_sha256');
 ensure(!options.symmetry||options.symmetry==='none','only the full physical geometry is supported; symmetry is not inferred');
 ensure(!options.model||options.model==='single-exterior','this writer supports a single connected exterior acoustic domain');
 const original=input.mesh||input.bem||input,mesh=canonicalMesh(original);
 const normalConvention=options.normalConvention||original.normal_convention;
 ensure(['air-outward','into-air'].includes(normalConvention),'normalConvention must be air-outward or into-air');
 if(normalConvention==='air-outward')for(const f of mesh.faces)[f[1],f[2]]=[f[2],f[1]];
 const rawGroups=options.groups||original.groups||manifest.boundary_groups;
 ensure(Array.isArray(rawGroups),'boundary group metadata is required');
 const present=new Set(mesh.face_tags),allTags=new Set();
 const groups=rawGroups.map(g=>{
  ensure(Number.isSafeInteger(g.tag)&&g.tag>0&&!allTags.has(g.tag),'boundary group tags must be unique positive integers');allTags.add(g.tag);
  const kind=g.role||g.kind,role=['independent-driver-source','independent-vent-source'].includes(kind)?'source':kind==='independent-throat-port'&&g.default_condition==='rigid-closed for mid-only study'?'rigid-wall':kind;
  return {...g,role,source_type:kind==='independent-vent-source'?'vent':'driver',name:g.name||g.id||'boundary_'+g.tag,meshName:'MEH_'+g.tag};
 }).filter(g=>present.has(g.tag)).sort((a,b)=>a.tag-b.tag);
 ensure([...present].every(t=>groups.some(g=>g.tag===t)),'a face tag has no boundary-group definition');
 ensure(groups.every(g=>['source','rigid-wall'].includes(g.role)),'interface/diagnostic/open-port faces cannot be included in a single-exterior BEM boundary');
 ensure(!present.has(301),'mouth-interface tag 301 is FEM-only; the BEM mouth must remain open');
 const checked=validateSurfaceMesh(mesh),drivers=options.drivers||manifest.drivers||[],vents=options.ventSources||manifest.vent_sources||[],sources=[];
 ensure(Array.isArray(drivers)&&Array.isArray(vents)&&drivers.length+vents.length>0,'independent source metadata is required');
 const definitions=[...drivers.map(d=>({...d,source_type:'driver'})),...vents.map(d=>({...d,source_type:'vent'}))];
 const sourceDefinitionTags=definitions.map(d=>d.source_tag??d.tag),sourceTags=groups.filter(g=>g.role==='source').map(g=>g.tag);
 ensure(sourceDefinitionTags.every(t=>Number.isSafeInteger(t)&&t>0)&&new Set(sourceDefinitionTags).size===sourceDefinitionTags.length,'source metadata tags must be unique positive integers');
 ensure(sourceDefinitionTags.every(t=>sourceTags.includes(t)),'a declared source is missing from the boundary mesh or has no source role');
 for(const g of groups.filter(g=>g.role==='source')){
  const driver=definitions.find(d=>(d.source_tag??d.tag)===g.tag);ensure(driver,'missing independent source definition for source tag '+g.tag);
  ensure(driver.source_type===g.source_type,'source metadata and boundary role disagree for tag '+g.tag);
  ensure(typeof driver.id==='string'&&driver.id.length>0,'each source needs a stable id');
  const axis=unit(driver.motion_into_air||driver.motion_into_front_air||driver.direction,'motion_into_air for '+driver.id);
  const faceIndices=[];for(let i=0;i<mesh.faces.length;i++)if(mesh.face_tags[i]===g.tag)faceIndices.push(i);
  const multipliers=faceIndices.map(i=>dot(checked.normals[i],axis));
  ensure(multipliers.every(w=>w>0&&w<=1+1e-12),'source '+driver.id+' contains a facet facing away from its motion into air');
  const area=faceIndices.reduce((s,i)=>s+checked.areas[i],0),projected=faceIndices.reduce((s,i,k)=>s+checked.areas[i]*multipliers[k],0);
  if(driver.projected_mesh_area_m2!==undefined)ensure(Number.isFinite(driver.projected_mesh_area_m2)&&driver.projected_mesh_area_m2>0&&Math.abs(projected/driver.projected_mesh_area_m2-1)<1e-6,'source '+driver.id+' projected area does not match the geometry manifest');
  if(driver.nominal_sd_m2!==undefined)ensure(Number.isFinite(driver.nominal_sd_m2)&&driver.nominal_sd_m2>0&&Math.abs(projected/driver.nominal_sd_m2-1)<.002,'source '+driver.id+' projected area differs from nominal Sd by at least 0.2%');
  const drvGroup=driver.abec_driving_group??(1000+g.tag);ensure(Number.isSafeInteger(drvGroup)&&drvGroup>0,'invalid ABEC driving group');
  sources.push({id:driver.id,source_type:driver.source_type,velocity_basis:driver.source_type==='vent'?'prescribed vent-inlet axial velocity; rear chamber/motor loading absent':'rigid driver axial piston velocity',default_observation_weight:driver.source_type==='vent'?0:1,physical_tag:g.tag,driving_group:drvGroup,motion_into_air:axis,face_indices:faceIndices,normal_velocity_multipliers:multipliers,surface_area_m2:area,projected_area_m2:projected,nominal_sd_m2:driver.nominal_sd_m2??null,saved_voltage_rms:driver.saved_voltage_rms??null});
 }
 ensure(sources.length>0,'at least one independent source is required');
 ensure(new Set(sources.map(s=>s.id)).size===sources.length&&new Set(sources.map(s=>s.driving_group)).size===sources.length,'independent sources must have distinct ids and driving groups');
 const origin=options.mouthCenterM||manifest.observation_frame?.origin_m||input.horn?.mouth_center_m;
 ensure(finiteVec(origin),'supply mouthCenterM explicitly (meters); observer placement must not infer an axis from a bounding box');
 const forward=unit(options.forward||manifest.observation_frame?.forward||manifest.axes?.z,'observation forward'),horizontal=unit(options.horizontal||manifest.observation_frame?.horizontal||manifest.axes?.x,'observation horizontal'),vertical=unit(options.vertical||manifest.observation_frame?.vertical||manifest.axes?.y,'observation vertical');
 ensure(Math.abs(dot(forward,horizontal))<1e-8&&Math.abs(dot(forward,vertical))<1e-8&&dot(cross(horizontal,vertical),forward)>1-1e-8,'observation frame must be orthogonal and right-handed');
 const f2=options.f2??manifest.mesh_request?.maximum_frequency_hz??1000,f1=options.f1??Math.min(100,f2/2),nf=options.numFrequencies??24;
 ensure(Number.isFinite(f1)&&Number.isFinite(f2)&&f1>0&&f2>f1,'frequency range must be positive and increasing');ensure(Number.isSafeInteger(nf)&&nf>=2&&nf<=10000,'numFrequencies must be an integer from 2 to 10000');
 const meshFrequency=options.meshFrequency??f2;ensure(Number.isFinite(meshFrequency)&&meshFrequency>0,'meshFrequency must be positive');
 const medium=manifest.medium?{sound_speed_m_s:manifest.medium.sound_speed_m_s,density_kg_m3:manifest.medium.density_kg_m3}:null;
 if(medium)ensure(Object.values(medium).every(x=>Number.isFinite(x)&&x>0),'declared sound speed and density must be finite positive SI values');
 const mediumSetup=medium?'In Global > Acoustic Parameters set sound speed to '+number(medium.sound_speed_m_s)+' m/s and density to '+number(medium.density_kg_m3)+' kg/m3.':'In Global > Acoustic Parameters choose and record sound speed and density; this input has no medium declaration.';
 // Keep source physical tags stable, while selecting constant-projection
 // subsets by elementary tag. Quantizing the cosine to 12 decimal places
 // introduces <=5e-13 absolute velocity error and avoids thousands of identical
 // components on the canonical faceted cone. It does not merge geometry.
 let nextElementary=Math.max(...allTags)+1;
 const elementaryTags=mesh.face_tags.slice();
 for(const s of sources){
  const buckets=new Map();s.face_indices.forEach((i,k)=>{const key=s.normal_velocity_multipliers[k].toFixed(12);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);});
  s.projection_groups=[...buckets].sort((a,b)=>Number(a[0])-Number(b[0])).map(([key,faces])=>{
   const tag=nextElementary++;faces.forEach(i=>elementaryTags[i]=tag);return {elementary_tag:tag,normal_velocity_multiplier:Number(key),face_indices:faces};
  });
 }
 const solving=['// MEH acoustic boundary export. SI meters; normals INTO the analyzed air.',
  '// Connected front passages and exterior are ONE exterior fluid; mouth has no cap.',
  '// Source basis: prescribed axial velocity, projected onto each source facet.',
  '// Unit-velocity transfer problem, NOT the saved voltage-driven system response.',
  '// '+mediumSetup,
  '// design_sha256='+manifest.design_sha256,'','Control_Solver',
  '  f1='+number(f1)+'Hz; f2='+number(f2)+'Hz; NumFrequencies='+nf+'; Abscissa=log',
  '  Dim=3D; MeshFrequency='+number(meshFrequency)+'Hz','','MeshFile_Properties "MEHMesh"','  MeshFileAlias="M1"','  Scale=1m','',
  'SubDomain_Properties "Connected front and exterior air"','  SubDomain=1','  ElType=Exterior',''];
 for(const g of groups.filter(g=>g.role==='rigid-wall'))solving.push('// '+comment(g.name),'Elements "Wall_'+g.tag+'"','  SubDomain=1','  MeshFileAlias="M1"','  1 Mesh Include '+g.tag,'');
 for(const s of sources){
  solving.push('// Independent source '+comment(s.id)+'; physical tag '+s.physical_tag+'; DrvGroup '+s.driving_group,
   '// All facets share one group. DrvWeight = dot(normal_into_air, piston_axis).');
  s.projection_groups.forEach((projection,k)=>{
   const name='Source_'+s.physical_tag+'_Projection_'+(k+1);
   solving.push('Elements "'+name+'"','  SubDomain=1','  MeshFileAlias="M1"','  1 Mesh Include '+projection.elementary_tag,'',
    'Driving "Drive_'+s.physical_tag+'_'+(k+1)+'"','  RefElements="'+name+'"','  DrvGroup='+s.driving_group,'  DrvWeight='+number(projection.normal_velocity_multiplier),'');
  });
 }
 const nodeRows=[[1000,add(origin,forward)],[2001,origin],[2002,add(origin,mul(forward,.05))],[2003,add(origin,mul(horizontal,.1))],[2004,add(origin,mul(vertical,.1))]];
 const obs=['// Unit piston velocity on each independent source. Saved voltage is metadata only.',
  '// To isolate a source, set other weights to 0 in this ONE Driving_Values section.',
  'Driving_Values','  DrvType=Velocity; Value=1.0'];
 sources.forEach((s,i)=>obs.push('  '+(i+1)+' DrvGroup='+s.driving_group+' Weight='+s.default_observation_weight+'.0 Delay=0.0'));
 obs.push('','Nodes "FieldPoints"','  Scale=1m','  // node x y z; on-axis point is exactly 1 m forward of the supplied mouth origin');
 nodeRows.forEach(([id,p])=>obs.push('  '+id+' '+p.map(number).join(' ')));
 obs.push('','BE_Spectrum "On axis unit velocity"','  PlotType=Curves','  AnalysisType=Pressure','  RefNodes="FieldPoints"','  GraphHeader="Unit piston velocity - on axis 1m"','  BodeType=LeveldB','  Range=50dB','  1 1000 ID=1000','');
 for(const [name,id,last] of [['Horizontal',2101,2003],['Vertical',2201,2004]])obs.push('BE_Spectrum "'+name+' unit velocity"','  PlotType=Polar','  GraphHeader="'+name+' unit piston velocity - 2m"','  BodeType=LeveldB','  Range=30dB','  PolarRange=-90,90,37','  BasePlane=2001 2002 '+last+' RefNodes="FieldPoints"','  Distance=2m','  1 Inclination=0.0 ID='+id,'');
 obs.push('// Keep all self and mutual terms when coupling the source network.',
  '// Normalized impedance is a solver convention, not yet a dimensional Pa s/m3 matrix.',
  'Radiation_Impedance "Source load matrix"','  GraphHeader="Normalized self and mutual source loading"','  BodeType=Complex','  RadImpType=Normalized');
 let row=1;for(const a of sources)for(const b of sources){obs.push('  '+row+' '+a.driving_group+' '+b.driving_group+' ID='+(3000+row));row++;}obs.push('');
 const project=['[Project]','Scriptname_InfoFile=','[Solving]','Scriptname_Solving=solving.txt','[DirectSound]','Scriptname_DirectSound=','[LEScript]','Scriptname_LEScript=','[Observation]','C0=observation.txt','[MeshFiles]','C0=boundary.msh,M1',''].join('\n');
 const warnings=['AKABAK/ABEC interpretation, import, normals check and acoustic solve have not been run.','Geometry validity is necessary but does not establish acoustic accuracy or convergence.','No motor, crossover or rear acoustic loading network is included in this unit-velocity BEM project.','Acoustic medium parameters require manual entry after import; the scripts do not configure them.'];
 const denseMatrixBytes=16*mesh.faces.length*mesh.faces.length;
 if(denseMatrixBytes>4*1024**3)warnings.push('One dense complex128 matrix at this face count would require '+(denseMatrixBytes/1024**3).toFixed(1)+' GiB, before solver workspaces. This is an arithmetic size estimate, not an AKABAK memory benchmark. A verified coarse boundary mesh or coupled domain partition may be required for a practical solve.');
 if(checked.report.minimum_triangle_quality<.1)warnings.push('Some triangles have quality below 0.1; refine or remesh and check solver conditioning.');
 if(checked.report.maximum_edge_m>(manifest.mesh_request?.wavelength_maximum_edge_m??Infinity)*1.01)warnings.push('Some edges exceed the requested wavelength edge length.');
 const frame={origin_m:origin,forward,horizontal,vertical,on_axis_1m:nodeRows[0][1],polar_distance_m:2};
 const adapter={schema:'meh-abec-bundle/v1',model:'single-exterior',length_unit:'m',normal_convention:'into-air',requested_medium:medium,acoustic_medium_transfer:'manual entry required; not configured by scripts',required_solver_medium_setup:mediumSetup,source_basis:'prescribed axial velocity projected on each source triangle normal',source_projection_maximum_rounding_error:5e-13,mesh_format:'Gmsh 2.2 ASCII, linear triangles',group_selection:'numeric elementary tags; physical tags remain stable semantic ids',dense_complex128_matrix_bytes:denseMatrixBytes,observation_frame:frame,checks:checked.report,warnings,proprietary_solver_validation:'not run',syntax_provenance:'R&D Team AKABAK help (2026-02-13); official ATH 2025-06 project/script output templates; see docs/acoustic-mesh-formulation.md'};
 const readme=['MEH acoustic boundary project — review prototype','',
  'This folder contains a real text project.abec, boundary.msh (Gmsh 2.2 ASCII),',
  'solving.txt, observation.txt, source-map.json and boundary-manifest.json.',
  'No axis rotation or unit conversion is performed after the supplied SI mesh.',
  '',
  'IMPORT IN AKABAK',
  'Use Tools > Import ABEC Project, select project.abec, then Start Import.',
  'Review the interpretation log and SI units, then Apply. All files stay in this folder.',
  mediumSetup,
  'The script does not transfer these medium settings. Do not assume solver defaults match.',
  'Confirm mesh dimensions, every source group and normals pointing into the air.',
  'Cone facets belonging to one mid must remain one shared Driving Group after import.',
  'Check Global > Fixed Driving: each active source has unit piston velocity, not voltage.',
  'This export has not been interpreted or solved in proprietary AKABAK/ABEC.',
  '',
  'ACOUSTIC MODEL',
  'One exterior domain contains all front chambers, real wall openings, horn and surrounding air.',
  'The horn mouth is open. No artificial cap is a wall or zero-pressure termination.',
  'The exterior enclosure surface is an acoustic scatterer; its rear chamber air is not modeled here.',
  'The compression-driver throat is rigidly closed for this mid-only study.',
  'The saved driver voltage and rear loading are retained in the manifest only.',
  'Do not read the unit-velocity plots as the response at the saved voltage.',
  'Couple all drivers to the full complex self/mutual front load matrix and their rear',
  'loading before predicting voltage sensitivity, excursion or choosing port sizes.',
  'The impedance observation is normalized; inspect the solver area/normalization convention',
  'before converting it to a dimensional acoustic or mechanical impedance matrix.',
  '',
  'SOURCE MOTION',
  'Every physical driver has a stable physical tag and independent DrvGroup.',
  'Facets with equal cosine projection (12 decimal places) share an Elements component.',
  'Its DrvWeight applies that projection; all components of a driver share one DrvGroup.',
  'The projected source area, surface',
  'area, motion vector, facet weights and element tags are in source-map.json.',
  'The default observation drives all mids with unit axial velocity and zero delay.',
  'Independent vent-inlet sources, when present, default to zero weight. Set one to 1',
  'and all other sources to 0 to inspect its radiation transfer basis. Prescribed inlet',
  'velocity is not a solved reflex response; rear cavity and motor coupling are absent.',
  'Change the single Driving_Values table to inspect a unit-source basis.',
  '',
  'VALIDATION STILL REQUIRED',
  ...warnings.map(x=>'- '+x),
  '- Check narrow opposing surfaces and AKABAK non-uniqueness compensation settings.',
  '- Run at least three densities and compare complex loading, fields, and polars.',
  '- Use a matched simple benchmark and compare to a second solver or measurement.',
  '- Source cones, dust caps, surrounds and gap losses are provisional physical models.',
  '',
  'References: https://www.randteam.de/AKABAK3/AKABAK-Help-Instructions.html',
  'https://www.randteam.de/AKABAK3/AKABAK-KnownIssues.html',
  'https://at-horns.eu/release/ath-2025-06.zip',
  'https://gmsh.info/doc/texinfo/#MSH-file-format-version-2',
  '',
  'Original exporter implementation; Hornstudio was inspected as a reference only.',
  'See docs/acoustic-mesh-formulation.md for provenance, coupling and limits.',''].join('\n');
 const sourceMap={schema:'meh-abec-source-map/v1',design_sha256:manifest.design_sha256,sources:sources.map(s=>({...s,elementary_tags:s.face_indices.map(i=>elementaryTags[i])}))};
 return {files:{'project.abec':project,'boundary.msh':encodeMsh22(mesh,groups,elementaryTags),'solving.txt':solving.join('\n'),'observation.txt':obs.join('\n'),'source-map.json':pretty(sourceMap),'boundary-manifest.json':pretty({...manifest,abec_export:adapter}),'README.txt':readme},validation:adapter,sources:sourceMap.sources,observation_frame:frame};
}
module.exports={buildAbecProject,validateSurfaceMesh,encodeMsh22};
if(require.main===module){
 try{
  const args=process.argv.slice(2),inputFile=args.shift(),outAt=args.indexOf('--out'),manifestAt=args.indexOf('--manifest');
  ensure(inputFile&&outAt>=0&&args[outAt+1],'usage: node abec-project.cjs boundary.json --manifest geometry-job.json --out bundle-dir');
  const input=JSON.parse(fs.readFileSync(inputFile,'utf8'));
  if(manifestAt>=0){const job=JSON.parse(fs.readFileSync(args[manifestAt+1],'utf8'));input.manifest=job.manifest||job;input.horn=job.horn||input.horn;}
  const out=path.resolve(args[outAt+1]),bundle=buildAbecProject(input);fs.mkdirSync(out,{recursive:true});
  for(const [name,data] of Object.entries(bundle.files))fs.writeFileSync(path.join(out,name),data);
  process.stdout.write(pretty({out,triangles:bundle.validation.checks.triangle_count,sources:bundle.sources.map(s=>s.id),proprietary_solver_validation:'not run'}));
 }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
