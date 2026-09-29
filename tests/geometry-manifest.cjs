const {test}=require('node:test'),assert=require('node:assert/strict');
const {context:c}=require('./load-editor.cjs')(),V=require('../acoustics/geometry-manifest.cjs')(c.MEH),d=require('../examples/offset-insert-study.json'),manifest=require('../acoustics/geometry/mesh-export-manifest-v1.json');
test('sibling SI manifest retains four actual azimuthal sources and power-conjugate area scale',()=>{
 const r=V.validate(manifest,d,{designSha256:manifest.design_sha256});assert.equal(r.available,true,r.reason);assert.equal(r.sourceRecords.length,4);assert.equal(r.acousticOperatorAvailable,false);assert.notDeepEqual(r.sourceRecords[0].positionM,r.sourceRecords[1].positionM);
 for(const s of r.sourceRecords){assert.ok(Math.abs(s.meshFlowPerCatalogFlow-.99959845314968)<1e-10);assert.equal(s.meshFlowPerCatalogFlow,s.pressureCatalogPerMeshPressure);}
});
test('stale geometry, units, medium and collapsed source identities are rejected',()=>{
 for(const change of [m=>m.units.length='mm',m=>m.drivers[1].id=m.drivers[0].id,m=>m.drivers[2].entry_center_m[2]+=.01,m=>m.medium.sound_speed_m_s=344,m=>m.rear.geometric_cavity_exported=true,m=>m.ports.find(p=>p.tag===301).center_m[2]=0]){const m=structuredClone(manifest);change(m);assert.equal(V.validate(m,d).available,false);}
 assert.equal(V.validate(manifest,{...d.state,port:46}).available,false);assert.equal(V.validate(manifest,d,{designSha256:'0'.repeat(64)}).available,false);
});
