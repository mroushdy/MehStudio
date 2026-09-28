const {test}=require('node:test'),assert=require('node:assert/strict'),{context:c}=require('./load-editor.cjs')(),M=c.MEH,H=c.MEHHornAcoustics,N=require('../acoustics/multiport-network.cjs')(H),a=M.analyze({...M.defaults,mouth:700,coverage:60,k:1.4,r:.2,m:.8,b:.1,q:3.5,tap:147}),C=(r=0,i=0)=>({r,i}),err=(x,y)=>Math.hypot(x.r-y.r,x.i-y.i)/Math.max(1e-20,Math.hypot(y.r,y.i));
test('One source reduces to existing independently branched Webster solution',()=>{
 for(const frequency of [50,100,370,700,1300])for(const throatTermination of ['closed','matched'])for(const mouthTermination of ['baffled','matched']){
 const opts={throatTermination,mouthTermination},ref=H.evaluate(a,frequency,opts),r=N.solve(a,frequency,[{id:'mid',zMM:147,flow:C(1)}],opts);assert.equal(r.available,true,r.reason);assert.ok(err(r.ports[0].pressure,ref.junctionImpedance)<1e-9);assert.ok(err(r.mouthFlow,ref.mouthFlowPerJunctionFlow)<1e-9);
 }
});
test('Coherent colocated sources produce N times single-source pressure and fourfold power for two sources',()=>{
 const single=N.solve(a,400,[{id:'one',zMM:147,flow:C(1)}]),pair=N.solve(a,400,[{id:'one',zMM:147,flow:C(1)},{id:'two',zMM:147,flow:C(1)}]);assert.equal(pair.available,true);assert.ok(err(pair.ports[0].pressure,C(single.ports[0].pressure.r*2,single.ports[0].pressure.i*2))<1e-10);assert.ok(Math.abs(pair.mouthPowerW/single.mouthPowerW-4)<1e-9);
});
test('Separated ports have reciprocal self/mutual impedances and phase-dependent coupled summation',()=>{
 const ports=[{id:'hf',zMM:0},{id:'mid-a',zMM:60},{id:'mid-b',zMM:147}],r=N.impedanceMatrix(a,500,ports);assert.equal(r.available,true,r.reason);for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.ok(err(r.impedance[i][j],r.impedance[j][i])<1e-9);
 const same=N.solve(a,500,ports.map(p=>({...p,flow:C(1)}))),opposite=N.solve(a,500,ports.map((p,i)=>({...p,flow:C(i?-1:1)})));assert.equal(same.available,true);assert.equal(opposite.available,true);assert.ok(Math.abs(same.mouthPowerW-opposite.mouthPowerW)>1e-3);assert.ok(Math.abs(same.relativePowerResidual)<1e-9);
});
test('Muted source retains its physical load and passive source loads balance input power',()=>{
 const active={id:'mid',zMM:147,flow:C(1)},load={id:'muted',zMM:60,flow:C(),admittance:C(.00001,.000005)},r=N.solve(a,300,[active,load]),removed=N.solve(a,300,[active]);assert.equal(r.available,true,r.reason);assert.ok(r.ports[1].passivePowerW>0);assert.ok(err(r.mouthFlow,removed.mouthFlow)>.001);assert.ok(Math.abs(r.relativePowerResidual)<1e-9);
});
test('Invalid source location, drive, identity and active passive-load input are rejected',()=>{
 for(const port of [{id:'x',zMM:-1,flow:C(1)},{id:'x',zMM:10,flow:C(NaN)},{id:'x',zMM:10,flow:C(1),admittance:C(-1)}])assert.equal(N.solve(a,100,[port]).available,false);
 assert.equal(N.solve(a,100,[{id:'x',zMM:10,flow:C(1)},{id:'x',zMM:20,flow:C(1)}]).available,false);
});
