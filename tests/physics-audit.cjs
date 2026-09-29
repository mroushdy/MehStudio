/* Independent physical consistency checks, not loudspeaker validation.
 * The far-field power integral uses a Bessel-series directivity reference,
 * independently of the quadrature used by the production mouth impedance.
 */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {context:c}=require('./load-editor.cjs')();
const H=c.MEHHornAcoustics,N=require('../acoustics/multiport-network.cjs')(H);
const fixture=require('../examples/offset-insert-study.json');
const a=c.MEH.analyze(fixture.state),rho=1.204,soundSpeed=343;
const near=(v,ref,rel=1e-6)=>assert.ok(Math.abs(v-ref)<=rel*Math.max(1e-15,Math.abs(ref)),`${v} differs from ${ref}`);
function j1(x){let term=x/2,sum=term;for(let n=1;n<100;n++){term*=-(x*x/4)/(n*(n+1));sum+=term;if(Math.abs(term)<1e-16)break;}return sum;}
function integral(fn,lo,hi,n=4096){const step=(hi-lo)/n;let sum=0;for(let i=0;i<=n;i++)sum+=(i===0||i===n?1:i%2?4:2)*fn(lo+i*step);return sum*step/3;}
test('RMS far-field hemisphere power equals the baffled mouth load power',()=>{
 const r=.3048373069236659;
 for(const frequency of [100,300,700,1000]){
  const k=2*Math.PI*frequency/soundSpeed;
  const angular=integral(theta=>{const x=k*r*Math.sin(theta),D=Math.abs(x)<1e-8?1:2*j1(x)/x;return D*D*Math.sin(theta);},0,Math.PI/2);
  // For RMS Q=1: p=j*rho*omega*exp(-j*k*R)/(2*pi*R)*D(theta).
  const farFieldPower=rho*soundSpeed*k*k/(2*Math.PI)*angular;
  near(H.radiationImpedance(r,frequency,rho,soundSpeed).r,farFieldPower,3e-6);
 }
});
test('Radiation reactance gives the analytical one-face low-ka added mass',()=>{
 const Sd=.0132,r=Math.sqrt(Sd/Math.PI),f=.1,w=2*Math.PI*f;
 const expected=8*rho*r**3/3;
 near(H.radiationImpedance(r,f,rho,soundSpeed).i*Sd*Sd/w,expected,2e-6);
 near(expected,.0008744426001806048,1e-12);
 // This is an assumption-based sensitivity value, not measured B&C Mmd.
 near(.017-2*expected,.015251114799638792,1e-12);
});
test('Saved horn load terminates on the retained forward profile, before the returned lip',()=>{
 const forward=a.pro.reduce((best,p)=>p.z>best.z?p:best);
 assert.ok(forward.z>a.pro.at(-1).z);
 const result=N.solve(a,700,[{id:'entry',zMM:a.p.tap,flow:{r:1e-5,i:2e-5}}]);
 assert.equal(result.available,true,result.reason);
 near(result.stationsMM.at(-1),forward.z,1e-12);
 const p=result.pressures.at(-1),q=result.mouthFlow,den=q.r*q.r+q.i*q.i;
 const inferred={r:(p.r*q.r+p.i*q.i)/den,i:(p.i*q.r-p.r*q.i)/den};
 const load=H.radiationImpedance(forward.r*.001,700,rho,soundSpeed);
 near(inferred.r,load.r,1e-10);near(inferred.i,load.i,1e-10);
 assert.ok(Math.abs(forward.r-a.p.mouth/2)>40,'This fixture has a substantial returned lip.');
});
test('FEM source area transformation preserves force and real RMS power for general complex flows',()=>{
 const data=require('../acoustics/data/current-insert.json');
 const S=require('../acoustics/spatial-study.cjs')(c.MEH,{}),s=data.coneProjectedAreaM2/(a.p.sd*1e-4);
 const q=[{r:2e-5,i:3e-5},{r:-4e-5,i:1e-5}],qm=[{r:s*q[0].r,i:s*q[0].i},q[1]];
 const mul=(x,y)=>({r:x.r*y.r-x.i*y.i,i:x.r*y.i+x.i*y.r});
 const dot=(matrix,flows)=>matrix.map(row=>row.map((z,i)=>mul(z,flows[i])).reduce((x,y)=>({r:x.r+y.r,i:x.i+y.i}),{r:0,i:0}));
 const power=(pressures,flows)=>pressures.reduce((p,v,i)=>p+v.r*flows[i].r+v.i*flows[i].i,0);
 for(const row of data.rows.filter(r=>r.available)){
  const transformed=S.matrix(data,a,row.frequencyHz);assert.equal(transformed.available,true,transformed.reason);
  const pm=dot(row.impedance,qm),pc=dot(transformed.impedance,q);
  near(pc[0].r,s*pm[0].r,1e-12);near(pc[0].i,s*pm[0].i,1e-12);
  near(pc[1].r,pm[1].r,1e-12);near(pc[1].i,pm[1].i,1e-12);
  assert.ok(Math.abs(power(pc,q)-power(pm,qm))<1e-15);
 }
 assert.ok(data.ports.metadata[0].surface_area_m2>data.coneProjectedAreaM2);
});
