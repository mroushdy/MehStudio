'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const runtime=require('../driver-research/model-runtime.js');
const motors=require('../driver-research/new-motors.json');
const expected=['bc8ndl64','bc8cl51','bc10cl51','bc10nw64','faitalpro8pr200','faitalpro10pr300','faitalpro8fe200','faitalpro10fe400'];
assert.deepEqual(Object.keys(motors).sort(),expected.slice().sort(),'exactly eight independent additions');
const outputRoot=process.argv[2];
for(const id of expected){
 const r=require('../driver-research/records/'+id+'.json'),m=motors[id],d=r.dimensions;
 assert.equal(r.variant,'8 ohm'); assert.equal(m.review.variant,r.variant);
 assert.ok(!['bc8ndl51','bc10ndl64'].includes(id));
 assert.ok([8,10].includes(m.nominalDiameterIn));
 for(const k of ['sd','fs','qts','vas','re','leMH','mmsG','bl','qms','qes','xmaxMM','nominalPowerW','driverVol'])assert.ok(Number.isFinite(m[k])&&m[k]>0,id+' motor '+k);
 assert.ok(Math.abs(m.qts-(m.qes*m.qms)/(m.qes+m.qms))<.012,id+' Qts identity within manufacturer rounding');
 const qes=2*Math.PI*m.fs*(m.mmsG/1000)*m.re/(m.bl*m.bl);
 assert.ok(Math.abs(qes/m.qes-1)<.055,id+' force/mass/resistance identity rejects mixed motor sets');
 assert.equal(m.driverVol,d.driverDisplacement.value,id+' occupied volume must be explicit manufacturer value');
 assert.equal(d.driverDisplacement.status,'published');
 assert.equal(d.driverDisplacement.unit,'L');
 assert.ok(!('coneDepth' in d)&&!('coneDepth' in m),id+' undimensioned cone profile must remain absent');
 assert.ok(Math.abs(d.depth.value-d.mountingFaceOffset.value-d.rearProjection.value)<1e-9,id+' front/back datum');
 for(const s of r.sources){
  assert.match(s.url,/^https:\/\/(bcspeakers\.com|faitalpro\.com)\//);
  assert.match(s.sha256,/^[0-9a-f]{64}$/);
  assert.equal(s.accessDate,'2026-09-29');
  if(outputRoot){
   const filename=path.join(outputRoot,s.localArchivePath);
   assert.ok(fs.existsSync(filename),'missing original '+filename);
   assert.equal(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),s.sha256,'original source hash mismatch');
  }
 }
 for(const p of r.geometry.parts){
  for(const id of p.sourceIds)assert.ok(r.sources.some(s=>s.id===id));
  for(const key of p.dimensionRefs)assert.ok(key in d,'missing dimensional provenance '+key);
  const mesh=runtime.primitive(p,32);
  assert.ok(mesh.vertices.length&&mesh.faces.length,'rendered '+p.type);
  for(const v of mesh.vertices){assert.equal(v.length,3);assert.ok(v.every(Number.isFinite));assert.ok(v[2]>=-d.mountingFaceOffset.value-1e-4&&v[2]<=d.rearProjection.value+1e-4,'z datum bounds');}
  for(const f of mesh.faces)assert.ok(f.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.vertices.length));
 }
 const model=runtime.makeModel(r,{segments:32});
 assert.ok(Math.abs(model.bounds.min[2]+d.mountingFaceOffset.value)<1e-5);
 assert.ok(Math.abs(model.bounds.max[2]-d.rearProjection.value)<1e-5);
 if(d.boltSlotWidth){assert.ok(!d.boltHoleDiameter,'do not coerce a slot width into round diameter');if(d.boltSlotLength.value)assert.ok(r.geometry.parts.some(p=>p.name.includes('slot')&&p.type==='extruded-outline'));}
}
const rec=id=>require('../driver-research/records/'+id+'.json');
assert.equal(rec('bc8ndl64').dimensions.depth.value,98);
assert.equal(rec('bc8ndl64').dimensions.specificationTableDepth.value,95);
assert.equal(rec('faitalpro10fe400').dimensions.rearProjection.value,104);
assert.equal(rec('faitalpro10fe400').dimensions.depth.value,111);
assert.equal(rec('bc8cl51').dimensions.boltSlotLength.value,null);
assert.equal(rec('faitalpro8pr200').dimensions.magnetDiameter.value,null);
assert.equal(rec('faitalpro10pr300').dimensions.magnetDiameter.value,null);
console.log('PASS: 8 exact-variant motor datasets, datum conversions, geometry primitives, slot provenance'+(outputRoot?' and original source hashes':'')+'.');
