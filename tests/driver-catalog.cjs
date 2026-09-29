'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../driver-research/model-runtime.js');
const records=fs.readdirSync(path.join(__dirname,'../driver-research/records')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../driver-research/records',f))));
const {context:c}=require('./load-editor.cjs')();
function topology(mesh){
 let volume=0;const edges=new Map();
 for(const f of mesh.faces){assert.equal(new Set(f).size,3);const [a,b,d]=f.map(i=>mesh.vertices[i]);assert.ok([a,b,d].flat().every(Number.isFinite));const u=b.map((x,i)=>x-a[i]),v=d.map((x,i)=>x-a[i]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12,'nonzero triangle');volume+=(a[0]*(b[1]*d[2]-b[2]*d[1])+a[1]*(b[2]*d[0]-b[0]*d[2])+a[2]*(b[0]*d[1]-b[1]*d[0]))/6;
  for(let j=0;j<3;j++){const x=f[j],y=f[(j+1)%3],key=[Math.min(x,y),Math.max(x,y)].join(':');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(x<y?1:-1);}
 }
 return {volume,edges};
}
test('closed primitives have outward winding, manifold edges and finite nondegenerate triangles',()=>{
 const examples=[{type:'cylinder',params:{radius:10,z:-2,depth:20}},{type:'ring',params:{outerRadius:10,innerRadius:8,z:0,depth:3}},{type:'extruded-outline',params:{outline:[[-10,-10],[10,-10],[10,10],[-10,10]],z:0,depth:2}},{type:'extruded-outline',params:{outline:[[-10,-10],[10,-10],[10,10],[-10,10]],holes:[[[-4,-4],[4,-4],[4,4],[-4,4]]],z:0,depth:2}}];
 for(const p of examples){const {volume,edges}=topology(R.primitive(p));assert.ok(volume>0,p.type);for(const signs of edges.values()){assert.equal(signs.length,2);assert.equal(signs[0]+signs[1],0);}}
 assert.throws(()=>R.primitive({type:'invented',params:{}}),/Unsupported/);
});
test('every catalogue primitive renders without NaNs or zero-area faces',()=>{
 for(const r of records){const model=R.makeModel(r);assert.equal(model.units,'mm');for(const mesh of model.meshes)topology(mesh);}
});
test('closed catalogue frame and envelope surfaces are consistently wound',()=>{
 for(const r of records)for(const p of r.geometry.parts.filter(p=>['cylinder','ring','extruded-outline'].includes(p.type))){const {volume,edges}=topology(R.primitive(p));assert.ok(volume>0,`${r.id}: ${p.name}`);for(const signs of edges.values()){assert.equal(signs.length,2,`${r.id}: ${p.name}`);assert.equal(signs[0]+signs[1],0,`${r.id}: ${p.name}`);}}
});
test('all dimension references resolve and units stay explicit',()=>{
 for(const r of records){assert.equal(r.geometry.units,'mm');assert.ok(r.variant);const sources=new Set(r.sources.map(s=>s.id));for(const [k,v]of Object.entries(r.dimensions)){assert.ok(v.unit,`${r.id}.${k}`);if(typeof v.value==='number')assert.ok(Number.isFinite(v.value));if(v.sourceId)assert.ok(sources.has(v.sourceId),`${r.id}.${k} source ${v.sourceId}`);}for(const p of r.geometry.parts){for(const key of p.dimensionRefs||[])assert.ok(r.dimensions[key],`${r.id}.${p.name}.${key}`);for(const id of p.sourceIds||[])assert.ok(sources.has(id),`${r.id}.${p.name} source ${id}`);}}
});
test('catalogue motors have exact identity, reviewed variant and complete fields before eligibility',()=>{
 const C=c.MEHDriverCatalog;
 for(const [id,m]of Object.entries(C.motors)){assert.equal(C.motorEligibility(C.byId[id],m).available,true,id);assert.equal(C.motorEligibility(C.byId[id],{...m,id:'other'}).available,false);assert.equal(C.motorEligibility(C.byId[id],{...m,leMH:undefined}).available,false);assert.equal(C.motorEligibility(C.byId[id],{...m,review:{...m.review,variant:'4 ohm'}}).available,false);}
});
test('selecting supported drivers preserves source values through normalization and keeps displacement provenance',()=>{
 const M=c.MEH;
 for(const [id,d]of Object.entries(M.drivers.mid)){if(!d.available)continue;const p=M.normalize({...M.defaults,...d.parameters,midDriver:id});assert.equal(p.midDriver,id);for(const [key,value]of Object.entries(d.parameters))assert.equal(p[key],value,`${id}.${key}`);const m=c.MEHDriverCatalog.motors[id];if(d.hasMotorData){assert.equal(d.acousticsReady,true);assert.equal(d.driverVolumeIsEnvelope,!Number.isFinite(m?.driverVol),id);assert.equal(d.parameterStatus.driverVol,Number.isFinite(m?.driverVol)?'published':'conservative-envelope');}}
});
test('motor unit conversions and exact identity survive acoustic preparation',()=>{
 const A=c.MEHAcoustics;
 for(const [id,m]of Object.entries(c.MEHDriverCatalog.motors)){assert.equal(A.catalog[id].id,id);assert.equal(A.catalog[id].mmsG,m.mmsG);assert.equal(A.catalog[id].leMH,m.leMH);assert.equal(A.catalog[id].sd,m.sd);}
});
test('unsupported projecting compression drivers remain inspectable without gaining fit eligibility',()=>{
 const M=c.MEH,d=M.drivers.compression.bms4594he;
 assert.equal(d.available,false);assert.equal(d.phaseProjectionMM,26.6);assert.equal(d.depthMM,94.2);
 const selected=M.driverModel({...M.defaults,compressionDriver:'bms4594he',throat:36},'compression');
 assert.ok(selected);assert.equal(selected.record.id,'bms4594he');assert.ok(Math.abs(selected.model.bounds.min[2]+26.6)<1e-8);
 assert.equal(M.drivers.compression.bms4593he.available,false);
});
test('saved manufacturer-rounded frame values preserve exact model identity while unknown explicit IDs cannot borrow motors',()=>{
 const M=c.MEH,d=M.drivers.mid.bc6ndl38,p={...M.defaults,...d.parameters,frame:187,midDriver:'bc6ndl38'};
 assert.equal(M.matchMidDriver(p).id,'bc6ndl38');assert.equal(M.matchMidDriver(p).acousticMatch,true);
 assert.equal(M.matchMidDriver({...p,midDriver:'unlisted-model'}),null);
 assert.equal(M.matchMidDriver({...p,frame:187.01}).mechanicalMatch,false);
});
test('conflicting same-model depths use larger packaging bounds without rewriting the drawing',()=>{
 for(const [id,drawing,envelope]of [['18sound6nmb420',71,73],['beyma6p200fe',87,87.5]]){
  const d=c.MEH.drivers.mid[id];assert.equal(d.record.dimensions.depth.value,drawing);assert.equal(d.parameters.driverDepth,envelope);assert.equal(d.parameterStatus.driverDepth,'conservative-envelope');
  const a=c.MEH.analyze({...c.MEH.defaults,...d.parameters,midDriver:id});assert.equal(a.p.midDriver,id);assert.notEqual(a.mounting.status,'custom-envelope');
 }
});
test('a shared family drawing cannot enable the unresolved passive-crossover variant',()=>{
 const d=c.MEH.drivers.compression.bms4590p;assert.equal(d.available,false);assert.match(d.unavailableReason,/exact selected model variant/);assert.equal(c.MEH.drivers.compression.bms4590.available,true);
});
