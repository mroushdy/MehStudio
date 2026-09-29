const {test}=require('node:test'),assert=require('node:assert/strict'),{context:c}=require('./load-editor.cjs')();
const M=c.MEH,A=c.MEHAcoustics,N=require('../acoustics/multiport-network.cjs')(c.MEHHornAcoustics),makeS=require('../acoustics/coupled-system.cjs'),S=makeS(M,A,N),makeE=require('../acoustics/broadband-engine.cjs'),E=makeE(M,A,N,S),design=require('../examples/offset-insert-study.json'),native=require('../acoustics/data/current-insert.json'),PI=Math.PI,abs=x=>Math.hypot(x.r,x.i),complexError=(x,y)=>Math.hypot(x.r-y.r,x.i-y.i)/Math.max(1e-25,abs(y)),near=(x,y,tol=1e-8)=>assert.ok(Math.abs(x-y)<=tol*Math.max(1e-20,Math.abs(y)),`${x} != ${y}`);
test('Saved baseline uses RMS 1V, actual polygon sections and retained forward mouth',()=>{
 const b=E.baseline(design,{points:41});assert.equal(b.available,true,b.reason);assert.equal(b.options.voltageRms,1);assert.equal(b.options.endCorrection,0,'legacy two-ended LC coefficient must not silently enter new model');assert.equal(b.options.distanceM,3);near(b.geometry.frontCavityCM3,181.11103939489084);near(b.geometry.nominalPortAreaMM2,1650);near(b.geometry.neckAreaMM2,1647.350748508768);near(b.geometry.mouthRadiusM,.3048373069236659,1e-9);assert.equal(b.geometry.rolledLipExcluded,true);assert.equal(b.geometry.analysis,undefined);assert.ok(b.rows.some(r=>r.frequencyHz===200));assert.ok(b.rows.some(r=>r.frequencyHz===700));
 for(const r of b.rows){assert.equal(r.available,true,r.reason);assert.ok(r.splDb!==null);assert.ok(Math.abs(r.relativePowerResidual)<1e-10);for(const x of r.branches)near(x.portVelocityPeakMS,Math.SQRT2*abs(x.entryFlow)/(b.geometry.neckAreaMM2*1e-6));}
 assert.ok(b.summary.maxVoltageAllowed<b.summary.maxVoltageInTargetBandAllowed,'unfiltered low-frequency excursion must not disappear from headroom');
});
test('Front zero-frequency limit stores the actual full local air volume and stays reciprocal/passive',()=>{
 const g=E.geometry(design),f=.01,F=E.frontTwoPort(g,f,{lossScale:0,endCorrection:0}),rho=1.204,w=2*PI*f,c0=g.analysis.p.soundSpeed;assert.equal(F.available,true,F.reason);const compliance=g.frontTotalCM3*1e-6/(rho*c0*c0);near(F.impedance[0][1].i,-1/(w*compliance),2e-8);
 for(const hz of [80,200,700,1000,1800]){const q=E.frontTwoPort(g,hz);near(q.impedance[0][1].r,q.impedance[1][0].r);near(q.impedance[0][1].i,q.impedance[1][0].i);const z=q.impedance;assert.ok(z[0][0].r>=-1e-8&&z[1][1].r>=-1e-8);assert.ok(z[0][0].r*z[1][1].r-z[0][1].r*z[1][0].r>=-1e-5);}
});
test('Segment ladder converges to analytic lossless cylindrical duct two-port',()=>{
 const frequency=900,length=.15,area=.003,rho=1.204,c0=343,k=2*PI*frequency/c0,Z=rho*c0/area,expected={r:0,i:-Z/Math.sin(k*length)},errors=[];
 for(const count of [12,24,48]){const g={available:true,analysis:{p:{soundSpeed:c0}},residualCavityM3:0,collectionInertanceKgM4:0,neckAreaM2:area,segments:Array.from({length:count},()=>({lengthM:length/count,areaM2:area,volumeM3:area*length/count,perimeterM:2*Math.sqrt(PI*area)}))},r=E.frontTwoPort(g,frequency,{lossScale:0,endCorrection:0});assert.equal(r.available,true,r.reason);errors.push(complexError(r.impedance[0][1],expected));}
 assert.ok(errors[2]<.001);assert.ok(errors[0]/errors[1]>3.8);assert.ok(errors[1]/errors[2]>3.8);
});
test('Voltage doubling, external propagation distance and source delay have correct amplitudes/phases',()=>{
 const r=E.solve(design,400),r2=E.solve(design,400,{voltageRms:2}),delayed=E.solve(design,400,{sourceDelaysMs:[.625,.625,.625,.625]}),far=E.solve(design,400,{distanceM:30}),far2=E.solve(design,400,{distanceM:60});
 for(const x of [r,r2,delayed,far,far2])assert.equal(x.available,true,x.reason);near(r2.excursionPeakMM/r.excursionPeakMM,2);near(r2.portVelocityPeakMS/r.portVelocityPeakMS,2);near(r2.splDb-r.splDb,20*Math.log10(2));near(r2.inputPowerW/r.inputPowerW,4);near(abs(delayed.mouthFlow),abs(r.mouthFlow));assert.ok(complexError(delayed.mouthFlow,{r:r.mouthFlow.i,i:-r.mouthFlow.r})<1e-8);near(far2.splDb-far.splDb,-20*Math.log10(2),1e-4);
});
test('Moving-mass sensitivity equals direct mechanical mass change while preserving Cms and Rms',()=>{
 const correctionG=1.7488852,Ac={...A,circuitParameters:(a,d,o)=>{const k=A.circuitParameters(a,d,o);return {...k,Mms:k.Mms-correctionG*.001};}},Ec=makeE(M,Ac,N,makeS(M,Ac,N));
 for(const f of [100,300,700]){const r=E.solve(design,f,{movingMassCorrectionG:correctionG}),ref=Ec.solve(design,f);assert.equal(r.available,true,r.reason);assert.equal(ref.available,true,ref.reason);assert.ok(complexError(r.mouthFlow,ref.mouthFlow)<1e-9);assert.ok(complexError(r.branches[0].pistonPressure,ref.branches[0].pistonPressure)<1e-9);}
});
test('Actual geometry is recomputed in all four tuning sweeps and impossible dimensions are rejected',()=>{
 for(const [parameter,values]of [['portAreaMM2',[1320,1650,1980]],['neckMM',[5,8,12]],['frontVolumeCM3',[170,181.11103939489084,210]],['entryZMM',[137,147,157]]]){const r=E.sweep(design,{parameter,values},{frequenciesHz:[100,200,400,700,1000],endCorrection:.4});assert.equal(r.available,true,r.reason);assert.ok(r.candidates.some(c=>c.available));for(const c of r.candidates.filter(c=>c.available)){assert.equal(c.result.options.endCorrection,.4);if(parameter==='portAreaMM2')near(c.geometry.nominalPortAreaMM2,c.value);if(parameter==='frontVolumeCM3')near(c.geometry.frontCavityCM3,c.value,1e-5);}}
 const impossible=E.sweep(design,{parameter:'neckMM',values:[30]});assert.equal(impossible.candidates[0].available,false);assert.match(impossible.candidates[0].reason,/collector depth/);
 const clamped=E.sweep(design,{parameter:'portAreaMM2',values:[10000]});assert.equal(clamped.candidates[0].available,false);assert.match(clamped.candidates[0].reason,/bounds/);
});
test('High drive is infeasible despite a passing target-band limit; metadata cannot claim local gap maximum',()=>{
 const r=E.baseline(design,{voltageRms:10,frequenciesHz:[80,200,400,700]});assert.equal(r.available,true,r.reason);assert.equal(r.summary.bandConstraintsPassed,true);assert.equal(r.summary.constraintsPassed,false);assert.equal(r.rows[0].branches[0].maximumPassageVelocityPeakMS,undefined);
});
test('Spatial reference is exact only, retains native end convention, and rejects stale geometry',()=>{
 const r=E.sparseReference(design,native,{endCorrection:3});assert.equal(r.available,true,r.reason);assert.equal(r.noInterpolation,true);assert.deepEqual(r.rows.map(v=>v.frequencyHz),native.rows.filter(v=>v.qualified).map(v=>v.frequencyHz));assert.equal(r.frontOptionsApplied.endCorrection,0);
 const stale=E.sparseReference({...design.state,port:46},native);assert.equal(stale.available,false);assert.match(stale.reason,/geometry differs/);
 const changed=E.sparseReference(design,{...native,conventions:{...native.conventions,amplitude:'peak'}});assert.equal(changed.available,false);
});
test('Mixed source phases retain individual load and invalid input is rejected',()=>{
 const coherent=E.solve(design,500),phase=E.solve(design,500,{sourcePhasesDeg:[0,90,180,270]});assert.equal(phase.available,true,phase.reason);assert.ok(abs(phase.mouthFlow)<abs(coherent.mouthFlow)*1e-8);assert.ok(phase.branches.some(b=>b.excursionPeakMM>0));
 for(const o of [{distanceM:0},{sourcePhasesDeg:[0,0,0,0,0]},{segmentCount:2},{movingMassCorrectionG:17},{sourceVoltageScales:[-1]},{heatCapacityRatio:.8}])assert.equal(E.solve(design,300,o).available,false);
});

test('Independent axial source network accepts exact opposing drives with passive load still present',()=>{
 const a=M.analyze(design.state),r=N.solve(a,500,[{id:'a',zMM:147,flow:{r:1e-4,i:0}},{id:'b',zMM:147,flow:{r:-1e-4,i:0}},{id:'passive',zMM:100,flow:{r:0,i:0},admittance:{r:1e-6,i:2e-6}}]);assert.equal(r.available,true,r.reason);assert.ok(abs(r.mouthFlow)<1e-18);assert.ok(Math.abs(r.relativePowerResidual)<1e-10);
});

test('Offset insert collector follows actual air-section centroid, not its translated frame twice',()=>{
 const g=E.geometry({...design.state,offset:20});assert.equal(g.available,true,g.reason);const length=g.segments.filter(s=>s.kind==='collector').reduce((sum,s)=>sum+s.lengthM,0);assert.ok(length>.011&&length<.0125,`Expected nearly axial collector at this translated opening, got ${length} m`);
 const open=E.geometry({...design.state,offset:20,frontFiller:'none'});assert.equal(open.available,true,open.reason);assert.ok(open.segments.filter(s=>s.kind==='collector').reduce((sum,s)=>sum+s.lengthM,0)>.023);
});
