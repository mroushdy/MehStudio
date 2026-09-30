'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {context:c}=require('./load-editor.cjs')(),M=c.MEH,A=c.MEHAcoustics,O=c.MEHDesignOptimizer,F=c.MEHAssistedFlow,C=c.MEHDriverCatalog;
const id4='daytondma80_4',id8='daytondma80_8';
const study=()=>M.normalize({...M.defaults,...M.drivers.mid[id4].parameters,midDriver:id4,compressionDriver:'bcde1090tn',throat:36,mouth:375,coverage:60,throatAngle:7.5,k:1.4,r:.2,m:.8,b:.1,q:3.5,wall:8,count:2,tap:125,port:60,shape:'round',neck:8,offset:0,gap:25,back:.5,lowTarget:200,frequency:1000});
test('DMA80 exact variants retain independent manufacturer data and inconsistent -8 motor stays unavailable',()=>{
 const r4=C.byId[id4],r8=C.byId[id8];assert.equal(r4.variant,'4 ohm');assert.equal(r8.variant,'8 ohm');
 assert.equal(C.motors[id4].re,4);assert.equal(C.motors[id4].bl,3.7);assert.equal(C.motors[id4].nominalDiameterIn,3);
 assert.ok(Math.abs(r4.acousticSource.qesFromPublishedMotor/r4.acousticSource.qes-1)<.02);
 assert.ok(Math.abs(r8.acousticSource.qesFromPublishedMotor/r8.acousticSource.qes-1)>.20);
 assert.equal(r8.acousticSource.bl,5.1);assert.equal(r8.acousticSource.qes,.61);assert.equal(r8.acousticSource.vas,1.34);
 assert.equal(C.motors[id8],undefined);assert.equal(A.catalog[id8],undefined);assert.equal(M.drivers.mid[id8].available,true);assert.equal(M.drivers.mid[id8].acousticsReady,false);
 assert.equal(O.resolveGoals({midDriver:id8}).ok,false);assert.match(O.resolveGoals({midDriver:id8}).errors.join(' '),/0\.477.*0\.61/);
 assert.equal(A.analyze(M.analyze({...study(),midDriver:id8}),{driverId:id8}).available,false);
 for(const r of [r4,r8])for(const s of r.sources){assert.match(s.url,/^https:\/\/www\.daytonaudio\.com\//);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.equal(s.accessDate,'2026-09-30');}
});
test('small geometry preserves units and bounds; unresolved mounting conflicts never become drill guides',()=>{
 for(const id of [id4,id8]){const d=M.drivers.mid[id],p=M.normalize({...study(),...d.parameters,midDriver:id}),r=d.record;
  assert.equal(p.midDriver,id);assert.equal(p.sd,31.2);assert.equal(p.cutout,75);assert.equal(p.driverDepth,45.1);assert.ok(Math.abs(p.frame-Math.SQRT2*80.5)<1e-9);
  assert.equal(d.driverVolumeIsEnvelope,true);assert.equal(d.parameterStatus.driverVol,'conservative-envelope');assert.equal(d.parameterStatus.frame,'conservative-envelope');
  assert.equal(r.dimensions.drawingBoltCircleDiameter.value,95.5);assert.equal(r.dimensions.drawingBoltHoleDiameter.value,3.8);assert.equal(r.dimensions.cadBoltHoleDiameter.value,4);
  assert.equal(M.mounting(p).boltPattern,null);assert.equal(M.driverModel(p).mountOffsetMM,0);assert.equal(r.dimensions.mountingFaceOffset.status,'assumed');assert.equal(r.geometry.parts.some(p=>p.type==='bolt-pattern'),false);
  assert.equal(M.normalize(JSON.parse(JSON.stringify(p))).midDriver,id);
 }
 const ambiguous={...study()};delete ambiguous.midDriver;assert.equal(M.matchMidDriver(ambiguous),null,'same chassis cannot identify impedance');assert.equal(M.normalize(ambiguous).midDriver,'custom');
});
test('small mids retain mechanical gates across counts, minimum volumes, oversized entries and vents',()=>{
 for(const count of [2,4,6]){const r=M.fitMidDriver({...study(),count},id4);assert.equal(r.ok,true,r.reason);assert.equal(r.state.count,count);assert.equal(r.state.back,.5);assert.equal(M.mechanicalFitReasons(M.analyze(r.state)).length,0);}
 for(const patch of [{port:90},{offset:60},{rearConcept:'reflex',rearPortDiameter:120}]){const a=M.analyze({...study(),...patch});assert.ok(M.mechanicalFitReasons(a).length);assert.equal(A.analyze(a,{driverId:id4,hornLoad:'webster'}).available,false);}
 const a=M.analyze(study()),r=A.analyze(a,{driverId:id4,hornLoad:'webster',voltageRms:1,fmin:100,fmax:1000,points:33,sensitivity:false});assert.equal(r.available,true,r.reason);assert.ok(a.pistonR<32);
 for(const row of r.rows){assert.ok(Number.isFinite(row.impedanceOhm));assert.ok(row.excursionPeakMM>=0);assert.ok(Math.abs(row.totalPowerResidualW)<1e-8);}
});
test('3-inch Assisted filter and reduced-model generation work without admitting geometry-only or reclassifying 5-inch drivers',async()=>{
 assert.equal(F.goals({midSize:'3'}).ok,true);const brief={midDriver:id4,compressionDriver:'bcde1090tn',count:2,lowHz:200,handoffHz:1000,designDriveVoltageRms:1};
 const choices=F.driverChoices(brief,{midSize:'3',maxWidthMM:700});assert.ok(choices.choices.length);assert.ok(choices.choices.every(p=>p.midDriver===id4));assert.ok(F.driverChoices(brief,{midSize:'5'}).choices.every(p=>M.drivers.mid[p.midDriver].nominalDiameterInches>=5));
 const r=await F.generate(brief,{midSize:'3',maxWidthMM:700,maxDepthMM:600});assert.equal(r.ok,true,JSON.stringify(r.errors));assert.ok(r.candidates.length);
 for(const p of r.candidates){assert.equal(p.state.midDriver,id4);assert.ok(p.guided.dimensions.widthMM<=700);assert.ok(p.acousticSummary.maximumExcursionPeakMM<=2.5);assert.equal(p.acousticSummary.validated,false);assert.ok(p.guided.verify.length);}
});
