const {test}=require('node:test'),assert=require('node:assert/strict'),{context:c}=require('./load-editor.cjs')(),d=c.MEHSpatialResults,basis=c.MEHPressureBasis,a=c.MEH.analyze(d.inputState),T=c.MEHSpatialStudy,F=c.MEHPressureField;
test('Qualified coupled pressure slice scales with actual motor drive and retains its field limitation',()=>{
 const r=T.analyze(a,d,{voltageRms:1}),r2=T.analyze(a,d,{voltageRms:2}),f=F.combine(a,r,d,basis),f2=F.combine(a,r2,d,basis);assert.equal(f.available,true,f.reason);assert.equal(f.frequencyHz,700);assert.equal(f.pressure.length,12497);assert.equal(f.pointwiseConverged,false);
 for(let i=0;i<f.pressure.length;i+=29){assert.ok(Math.abs(f2.pressure[i].magnitude/f.pressure[i].magnitude-2)<1e-10);assert.ok(Number.isFinite(f.pressure[i].r)&&Number.isFinite(f.pressure[i].i));}
 const svg=F.svg(f);assert.match(svg,/700 Hz/);assert.match(svg,/Pointwise field convergence is not established/);assert.ok(!/NaN|Infinity|undefined/.test(svg));
 const high=T.analyze(a,d,{voltageRms:20});assert.ok(high.warnings.length);assert.match(high.warnings[0],/clearance/);assert.equal(r.warnings.length,0);
});
test('Native unit-flow fields reproduce the independently exported reference-load slice',()=>{
 const reference=require('../native-front-fem/release/MEH_Insert_FEM_PressureSlice_700Hz.json'),native=d.rows.find(r=>r.frequencyHz===700),r=T.analyze(a,d,{voltageRms:1}),q=reference.coneFlowRmsM3S,s=basis.ports.coneProjectedAreaM2/(a.p.sd*1e-4),transfer=native.referenceLoad.outflowOverConeFlow;
 const row=r.rows.find(r=>r.frequencyHz===700);row.branches[0].pistonFlow={r:q/s,i:0};row.branches[0].entryFlow={r:q*transfer.r,i:q*transfer.i};const f=F.combine(a,r,d,basis);assert.equal(f.available,true,f.reason);
 let error=0,norm=0;for(let i=0;i<f.pressure.length;i++){error+=(f.pressure[i].r-reference.pressureRealPa[i])**2+(f.pressure[i].i-reference.pressureImagPa[i])**2;norm+=reference.pressureRealPa[i]**2+reference.pressureImagPa[i]**2;}assert.ok(Math.sqrt(error/norm)<1e-12);
});
test('Stale geometry, mesh, matrix, frequency and coupled input state cannot display a pressure map',()=>{
 const r=T.analyze(a,d,{voltageRms:1});for(const b of [{...basis,meshSha256:'0'.repeat(64)},{...basis,frequencyHz:800},{...basis,impedance:[[ {r:0,i:0},{r:0,i:0}],[{r:0,i:0},{r:0,i:0}]]}])assert.equal(F.combine(a,r,d,b).available,false);
 assert.equal(F.combine(c.MEH.analyze({...a.p,sharedBack:100}),r,d,basis).available,false);assert.equal(F.combine(c.MEH.analyze({...a.p,gap:30}),r,d,basis).available,false);
 assert.equal(require('../acoustics/pressure-field.cjs')(T).combine.toString(),F.combine.toString());
});
