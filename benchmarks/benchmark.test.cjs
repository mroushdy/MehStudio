'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cases=require('./cases.cjs'),{simulate,getRuntime}=require('./candidate.cjs'),{hornrespRows,compare,verifyReference,sha256}=require('./compare.cjs');
test('published native data are independently hashed and the case/conventions are required',()=>{
 for(const c of cases.slice(0,2)){const raw=fs.readFileSync(path.join(__dirname,c.reference.curves)),m=JSON.parse(fs.readFileSync(path.join(__dirname,'references',c.id+'.manifest.json')));assert.equal(verifyReference(m,raw,c),true);assert.throws(()=>verifyReference({...m,provenance:{...m.provenance,kind:'generated-candidate'}},raw,c),/native/);assert.throws(()=>verifyReference(m,Buffer.concat([raw,Buffer.from(' ')]),c),/hash/);assert.throws(()=>verifyReference(m,raw,{...c,distanceM:3}),/hash/);}
});
test('current horn cells and benchmark motor agree with two authentic exports in declared band',()=>{
 for(const c of cases.slice(0,2)){const native=hornrespRows(fs.readFileSync(path.join(__dirname,c.reference.curves),'utf8')).filter(r=>r.frequency_hz>=20&&r.frequency_hz<=1000),computed=simulate(c,native.map(r=>r.frequency_hz)),r=compare(native,computed);assert.ok(r.metrics.spl_db.maxAbsolute<.1);assert.ok(r.metrics.ze_ohm.rmsNormalizedToReferenceMax<.01);assert.ok(r.metrics.excursion_peak_mm.rmsNormalizedToReferenceMax<.01);assert.equal(r.interpolatedSamples,0);assert.ok(Math.max(...computed.map(r=>Math.abs(r.power_relative_residual)))<1e-10);}
});
test('cylindrical limit satisfies matched-load traveling wave and zero-length identity',()=>{
 const {H}=getRuntime(),radius=.06,length=.57,rho=1.205,c=344,S=Math.PI*radius**2,Z=rho*c/S;
 for(const f of [1,31,500,3000]){const t=H.conicalCell(radius,radius,length,f,rho,c),theta=2*Math.PI*f*length/c;assert.ok(Math.abs(t.A-Math.cos(theta))<1e-12);assert.ok(Math.abs(t.B-Z*Math.sin(theta))<1e-8);assert.ok(Math.abs(t.C-Math.sin(theta)/Z)<1e-12);assert.ok(Math.abs(t.A*t.D+t.B*t.C-1)<1e-12);}
 const i=H.conicalCell(radius,radius,0,100);assert.deepEqual(JSON.parse(JSON.stringify(i)),{A:1,B:0,C:0,D:1});
});
test('RMS scaling doubles excursion and adds 6.0206 dB for doubled voltage',()=>{
 const c=cases[2],twice={...c,branches:c.branches.map(b=>({...b,voltageRms:2*b.voltageRms}))},one=simulate(c,[100,333]),two=simulate(twice,[100,333]);for(let i=0;i<one.length;i++){assert.ok(Math.abs(two[i].spl_db-one[i].spl_db-20*Math.log10(2))<1e-10);assert.ok(Math.abs(two[i].excursion_peak_mm/one[i].excursion_peak_mm-2)<1e-10);assert.ok(Math.abs(two[i].ze_ohm-one[i].ze_ohm)<1e-10);}
});
test('two-entry fixture conserves motor/acoustic power',()=>{for(const r of simulate(cases[3],[30,100,250,700,1300]))assert.ok(Math.abs(r.power_relative_residual)<1e-10);});
test('phase differences wrap; implicit interpolation and extrapolation fail',()=>{
 const row=(f,p)=>({frequency_hz:f,spl_db:80,ze_ohm:8,excursion_peak_mm:1,za_real_normalized:1,za_imag_normalized:.1,ze_phase_deg:0,phase_deg:p}),r=compare([row(100,179),row(200,-179)],[row(100,-179),row(200,179)],{bandHz:[100,200],includePhase:true});assert.equal(r.metrics.phase_deg.maxAbsolute,2);assert.throws(()=>compare([row(110,0),row(190,0)],[row(100,0),row(200,0)],{bandHz:[100,200]}),/interpolation/);assert.throws(()=>compare([row(50,0),row(250,0)],[row(100,0),row(200,0)],{bandHz:[50,250],allowInterpolation:true}),/Extrapolation/);assert.throws(()=>compare([row(100,0),row(100,0)],[row(100,0),row(200,0)]),/unique/);
});
test('pending native exports preserve explicit Mmd and separate record topology',()=>{const {record}=require('./export-cases.cjs'),c=cases[3],main=record(c,c.branches[0]),side=record(c,c.branches[1]);assert.match(main,/S2 = 225/);assert.match(main,/Nd = 1/);assert.match(side,/ME1 = 1/);assert.match(side,/Mmd = 17/);assert.match(side,/End Correction Flag = 0/);assert.match(side,/Ap1 = 15/);});
