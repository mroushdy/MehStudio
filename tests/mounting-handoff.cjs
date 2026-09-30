'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {context:c}=require('./load-editor.cjs')(),P=require('../exports/mounting.cjs'),H=require('../exports/handoff.cjs'),F=require('../exports/formats.cjs');
function fixture(){
 const d=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../examples/offset-insert-study.json'),'utf8'));
 d.state.compressionDriver='bcDcx464';d.state.throat=36;
 const a=c.MEH.analyze(d.state),deps={model:c.MEH,land:c.MEHMounting,mounting:P,formats:F,buildMeshes:c.MEHMeshes};
 d.mountingParts=Object.fromEntries(Object.entries(P.inspect(a,deps)).map(([k,v])=>[k,{...v.defaults,enabled:true}]));
 return {a,d,deps};
}
test('mounting kit contains reusable local solids, correct quantities and every installed placement',()=>{
 const {a,d,deps}=fixture(),kit=H.mountingKit(a,d,deps),m=kit.manifest;
 assert.deepEqual(m.quantities,{mid:4,compression:1});assert.equal(m.parts.length,5);
 for(const name of ['mid_mount','compression_mount']){
  const stl=kit.files['MEH-mounting/'+name+'.stl'];assert.equal(new DataView(stl.buffer,stl.byteOffset).getUint32(80,true),(stl.length-84)/50);
  assert.match(kit.files['MEH-mounting/'+name+'.step'],/FACETED_BREP/);
 }
 assert.equal(kit.files['MEH-mounting/installed_mounts.obj'].split('\n').filter(l=>l.startsWith('o ')).length,5);
 const saved=JSON.parse(kit.files['MEH-mounting/MEH_design_study.json']);assert.deepEqual(saved.mountingParts,d.mountingParts);
 assert.equal(m.drivers.compression.dimensions.boltThread.value,'M6');assert.equal(m.parts.find(p=>p.kind==='compression').spec.boltHoleDiameterMM,6.5);
 assert.ok(!JSON.stringify(m).includes('localArchivePath'));assert.ok(!JSON.stringify(m).includes('/Users/'));
});
test('selected mounting solids are added to CAD handoff without presenting reference assembly as a solid',()=>{
 const {a,d,deps}=fixture(),kit=H.build(a,d,deps);
 assert.equal(kit.manifest.mounting_parts.quantities.mid,4);
 assert.ok(kit.files['MEH-CAD-handoff/mounting/mid_mount.step']);
 assert.ok(kit.manifest.parts.every(p=>p.role.includes('reference')));
 assert.match(kit.files['MEH-CAD-handoff/START_HERE.md'],/Selected mounting parts/);
 const without=H.build(a,{state:d.state},deps);assert.equal(without.manifest.mounting_parts,undefined);
 assert.ok(!Object.keys(without.files).some(p=>p.includes('/mounting/')));
});
test('invalid selected mounts block both standalone and combined export rather than disappearing',()=>{
 const {a,d,deps}=fixture();d.mountingParts.mid.boltHoleDiameterMM=80;
 assert.throws(()=>H.mountingKit(a,d,deps),/bolt hole|central opening/i);
 assert.throws(()=>H.build(a,d,deps),/bolt hole|central opening/i);
 d.mountingParts.mid.enabled=false;assert.equal(H.mountingKit(a,d,deps).manifest.quantities.compression,1);
});
