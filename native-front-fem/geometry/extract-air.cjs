'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const expected=process.argv[4]||'418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5';
const out=path.resolve(process.argv[5]||__dirname);
const source=path.resolve(process.argv[2]||path.join(__dirname,'editor-'+expected.slice(0,8)+'.html'));
const input=path.resolve(process.argv[3]||path.join(__dirname,'user-study.json'));
fs.mkdirSync(out,{recursive:true});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(source);assert.equal(sha(bytes),expected,'Parent editor must match READY fingerprint');
const frozen=path.join(out,'editor-'+expected.slice(0,8)+'.html');fs.writeFileSync(frozen,bytes);assert.equal(sha(fs.readFileSync(frozen)),expected);
const studyBytes=fs.readFileSync(input),studyHash=sha(studyBytes);fs.writeFileSync(path.join(out,'user-study.json'),studyBytes);
const study=JSON.parse(studyBytes),load=require('./load-editor.cjs');
const {context}=load(frozen),M=context.MEH;
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
const faceCross=(vertices,face)=>cross(sub(vertices[face[1]],vertices[face[0]]),sub(vertices[face[2]],vertices[face[0]]));
function build(kind){
 const state={...study.state,...(kind==='open'?{frontFiller:'none'}:{})},a=M.analyze(state),g=M.frontAdapterGeometry(a);
 assert.equal(a.p.offset,0,'This extraction closes the centered user surrogate');assert.equal(a.p.shape,'round');assert.equal(a.errors.length,0,JSON.stringify(a.errors));assert.equal(a.hole.fail,0);assert.equal(g.rootIntersectionFailures,0);
 assert.ok(!a.frontFiller.enabled||a.frontFiller.available);assert.ok(!a.frontFiller.enabled||a.frontFiller.valid);
 const local=world=>{const d=sub(world,a.F);return [dot(d,a.t)*.001,d[1]*.001,dot(d,a.n)*.001];};
 const rings=g.inner.map(ring=>ring.map(local)),N=rings[0].length,K=rings.length;
 assert.ok(rings.every(r=>r.length===N));if(kind==='inserted'){assert.equal(N,128);assert.equal(K,52);}
 const vertices_m=rings.flat().map(v=>Array.from(v)),faces=[],face_tags=[],face_components=[];
 const tri=(i,j,k,tag,component)=>{faces.push([i,j,k]);face_tags.push(tag);face_components.push(component);};
 const sections=a.collectorSections.length,surfaceRings=a.frontFiller.available?a.frontFiller.surfaceRings.length:0;
 for(let k=0;k<K-1;k++)for(let j=0;j<N;j++){
  const next=(j+1)%N,ids=[k*N+j,k*N+next,(k+1)*N+next,(k+1)*N+j];
  const component=k===0?'entry_tube_wall':k<sections?'collector_wall':surfaceRings?(k===sections?'insert_opening_wall':k<sections+surfaceRings?'insert_cone_facing_wall':'outer_gap_rim'):'mounting_land_wall';
  tri(ids[0],ids[1],ids[2],1,component);tri(ids[0],ids[2],ids[3],1,component);
 }
 // Add a driven conical surrogate and the stationary cutout annulus. Angular
 // stations match the canonical rim; the active circle is tessellated at Rp.
 const activeStart=vertices_m.length,R=a.pistonR*.001;
 for(const p of rings[K-1]){assert.ok(Math.abs(p[2])<1e-12);const r=Math.hypot(p[0],p[1]);assert.ok(r>R);vertices_m.push([p[0]*R/r,p[1]*R/r,0]);}
 for(let j=0;j<N;j++){const next=(j+1)%N,o=(K-1)*N+j,on=(K-1)*N+next,i=activeStart+j,inn=activeStart+next;tri(o,i,inn,1,'mounting_annulus_rigid');tri(o,inn,on,1,'mounting_annulus_rigid');}
 const apex=vertices_m.length;vertices_m.push([0,0,a.p.coneDepth*.001]);
 for(let j=0;j<N;j++)tri(activeStart+j,apex,activeStart+(j+1)%N,2,'diaphragm_active');
 // The artificial port is a nonplanar star fan through P on the actual horn.
 // It preserves every canonical perimeter point and the whole physical tube.
 const capCenter=local(a.P),capIndex=vertices_m.length;vertices_m.push(capCenter);
 const starCross=rings[0].map((p,j)=>{const q=rings[0][(j+1)%N];return (p[0]-capCenter[0])*(q[1]-capCenter[1])-(p[1]-capCenter[1])*(q[0]-capCenter[0]);});
 assert.ok(starCross.every(x=>x>1e-14),'Port perimeter must be a positive star-shaped projected polygon about P');
 for(let j=0;j<N;j++)tri(j,capIndex,(j+1)%N,3,'entry_interface_fan');
 // Orient the assembled AIR boundary by topology, not the left-handed world
 // frame or solid-wall rendering normals. Canonical diagonals are unchanged.
 const edges=new Map();
 faces.forEach((face,f)=>face.forEach((u,j)=>{const v=face[(j+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');if(!edges.has(key))edges.set(key,[]);edges.get(key).push({f,sign:u<v?1:-1});}));
 for(const [edge,uses]of edges)assert.equal(uses.length,2,'Nonmanifold/boundary edge '+edge);
 const adjacency=faces.map(()=>[]);
 for(const uses of edges.values()){const [a,b]=uses;adjacency[a.f].push([b.f,-a.sign*b.sign]);adjacency[b.f].push([a.f,-a.sign*b.sign]);}
 const orientation=new Int8Array(faces.length),queue=[0];orientation[0]=1;
 for(let q=0;q<queue.length;q++){const face=queue[q];for(const [next,relation]of adjacency[face]){const required=orientation[face]*relation;if(orientation[next])assert.equal(orientation[next],required,'Inconsistent orientation');else{orientation[next]=required;queue.push(next);}}}
 assert.equal(queue.length,faces.length,'Air boundary must be connected');
 for(let i=0;i<faces.length;i++)if(orientation[i]<0)[faces[i][1],faces[i][2]]=[faces[i][2],faces[i][1]];
 const volume=()=>faces.reduce((sum,f)=>sum+dot(vertices_m[f[0]],cross(vertices_m[f[1]],vertices_m[f[2]]))/6,0);
 if(volume()<0)for(const face of faces)[face[1],face[2]]=[face[2],face[1]];
 const volumeM3=volume();assert.ok(volumeM3>0);
 let minArea=Infinity,sourceProjectedAreaM2=0,sourceAreaM2=0,portAreaM2=0,portProjectedAreaM2=0;
 const counts={},componentAreasM2={};
 faces.forEach((f,i)=>{const c=faceCross(vertices_m,f),area=norm(c)/2;assert.ok(Number.isFinite(area)&&area>1e-15,'Zero/nonfinite surface area');minArea=Math.min(minArea,area);counts[face_components[i]]=(counts[face_components[i]]||0)+1;componentAreasM2[face_components[i]]=(componentAreasM2[face_components[i]]||0)+area;if(face_tags[i]===2){assert.ok(c[2]>0,'Cone air-outward normal must point toward +local z');sourceProjectedAreaM2+=c[2]/2;sourceAreaM2+=area;}if(face_tags[i]===3){assert.ok(c[2]<0,'Port air-outward normal must point toward -local z');portProjectedAreaM2-=c[2]/2;portAreaM2+=area;}});
 const orientedEdges=new Map();faces.forEach(f=>f.forEach((u,j)=>{const v=f[(j+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');orientedEdges.set(key,(orientedEdges.get(key)||0)+(u<v?1:-1));}));assert.ok([...orientedEdges.values()].every(sum=>sum===0));
 const SdM2=a.p.sd*1e-4,areaError=(sourceProjectedAreaM2-SdM2)/SdM2;
 assert.ok(Math.abs(areaError)<.002,'Projected source discretization must stay within 0.2% of Sd');
 const fingerprint=sha(JSON.stringify({vertices_m,faces,face_tags}));
 const metadata={
  format:'MEH-front-air-surface-v1',case:kind,units:'m',cone_axis:[0,0,1],cone_axis_convention:'Mounting plane toward magnet; cone outward-air-normal projection is positive. Motion toward horn is along negative local z.',
  editor_sha256:expected,user_study_sha256:studyHash,geometry_sha256:fingerprint,source_state:a.p,
  source_file:path.basename(frozen),user_study_file:'user-study.json',source_tag:2,port_tag:3,wall_tag:1,
  ring_count:K,vertices_per_ring:N,collector_section_count:sections,insert_surface_ring_count:surfaceRings,
  original_world_frame_mm:{origin:a.F,u:a.t,v:[0,1,0],z:a.n,determinant:-1,entry_center:a.P},
  interface:{kind:'nonplanar-canonical-perimeter-star-fan',center_m:capCenter,plane_basis_local:[[1,0,0],[0,1,0]],projected_star_cross_min_m2:Math.min(...starCross),minimum_local_z_m:Math.min(...rings[0].map(v=>v[2])),maximum_local_z_m:Math.max(...rings[0].map(v=>v[2])),actual_area_m2:portAreaM2,projected_area_m2:portProjectedAreaM2,notes:'Artificial port surface joins canonical horn-cut perimeter to P. Boundary is exact; fan interior is an interface approximation, not the exact curved horn patch. Whole physical tube retained.'},
  checks:{watertight_edges:true,oriented_edge_incidence_two:true,connected_surface:true,positive_signed_volume:true,minimum_triangle_area_m2:minArea,surface_self_intersection_test:'Not yet performed; canonical walls plus star-shaped cap are constructed without a global intersection certification.'},
  signed_volume_m3:volumeM3,volume_cm3:volumeM3*1e6,editor_front_air_cm3:a.frontV,volume_difference_cm3:volumeM3*1e6-a.frontV,
  source_projected_area_m2:sourceProjectedAreaM2,source_surface_area_m2:sourceAreaM2,catalog_sd_m2:SdM2,source_projected_area_relative_error:areaError,
  face_component_counts:counts,face_component_areas_m2:componentAreasM2,geometry_errors:a.errors,geometry_warnings:a.warnings,
  diaphragm:'Analytical conical surrogate tessellated at canonical rim angles. Active radius sqrt(Sd/pi); no measured dust cap or surround shape. Outside active radius is stationary mounting annulus.',
  differences_from_editor_volume:'Canonical tube starts at curved horn-cut perimeter; editor neck air uses a flat nominal length. Cone closure is polygonal whereas editor cone volume is analytical. Interface star fan is declared rather than hidden.',
  losses:'Geometry export only: no viscous/thermal loss or acoustic accuracy claim.',
  saved_drive_voltage_rms:study.acousticScreen?.options?.voltageRms,brief_drive_voltage_rms:Number(study.wizardBrief?.designDriveVoltageRms),design_low_target_hz:a.p.lowTarget,brief_low_target_hz:Number(study.wizardBrief?.lowHz)
 };
 const result={vertices_m,faces,face_tags,cone_axis:[0,0,1],metadata};
 fs.writeFileSync(path.join(out,kind+'-air.json'),JSON.stringify(result));
 fs.writeFileSync(path.join(out,kind+'-rings.json'),JSON.stringify({inner_rings_m:rings,metadata:{editor_sha256:expected,user_study_sha256:studyHash,case:kind,source_state:a.p,original_world_frame_mm:metadata.original_world_frame_mm,units:'m'}}));
 return {case:kind,file:kind+'-air.json',vertices:vertices_m.length,faces:faces.length,...metadata};
}
const reports=[build('inserted'),build('open')];
fs.writeFileSync(path.join(out,'extraction-report.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.map(r=>({case:r.case,vertices:r.vertices,faces:r.faces,rings:r.ring_count,ringVertices:r.vertices_per_ring,volume_cm3:r.volume_cm3,editor_front_air_cm3:r.editor_front_air_cm3,volume_difference_cm3:r.volume_difference_cm3,projected_area_m2:r.source_projected_area_m2,Sd_relative_error:r.source_projected_area_relative_error,root_depth_span_mm:(r.interface.maximum_local_z_m-r.interface.minimum_local_z_m)*1000,minimum_triangle_area_m2:r.checks.minimum_triangle_area_m2,geometry_sha256:r.geometry_sha256})),null,2));
