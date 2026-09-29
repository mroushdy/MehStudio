const {test}=require('node:test'),assert=require('node:assert/strict'),{context:c,html}=require('./load-editor.cjs')(),M=c.MEH,T=c.MEHSpatialStudy;
const base={...M.defaults,...M.drivers.mid.bc6ndl38.parameters,midDriver:'bc6ndl38',mouth:700,coverage:60,k:1.4,r:.2,m:.8,b:.1,q:3.5,tap:147,gap:42,port:45,count:4,offset:0,sharedBack:108,back:3,frontFiller:'offset',fillerOpening:87};
const a=M.analyze(base),C=(r=0,i=0)=>({r,i});
// Analytic reciprocal passive fixture; deliberately NOT a FEM dataset.
function fixture(){return {format:'MEH-spatial-front-v1',available:true,geometrySourceSha256:T.sourceSha256,userDesignSha256:'a'.repeat(64),airSurfaceSha256:'b'.repeat(64),meshSha256:'c'.repeat(64),inputState:{...a.p},medium:{densityKgM3:1.204,soundSpeedMS:343},conventions:{phasor:'exp(+j omega t)',amplitude:'RMS',flows:'into-domain',impedanceUnits:'Pa s/m3',domain:'cone-to-horn-entry'},coneProjectedAreaM2:.0132,convergence:{passed:true},rows:[100,300,700].map(f=>({frequencyHz:f,available:true,qualified:true,impedance:[[C(0,-1e6*300/f),C(0,-1e6*300/f)],[C(0,-1e6*300/f),C(100,-1e6*300/f+f*100)]]}))};}
test('Spatial matrices cannot survive dimension, medium, convention or provenance changes',()=>{
 const d=fixture();assert.equal(T.validate(d,a).available,true);
 for(const key of T.geometryKeys){const changed={...a,p:{...a.p,[key]:typeof a.p[key]==='number'?a.p[key]+1:'changed'}};assert.equal(T.validate(d,changed).available,false,key);}
 for(const mutate of [d=>d.geometrySourceSha256='0'.repeat(64),d=>delete d.meshSha256,d=>delete d.inputState.sd,d=>d.medium.soundSpeedMS=344,d=>d.conventions.flows='outgoing',d=>d.convergence.passed=false,d=>d.rows[0].qualified=false,d=>d.rows[0].impedance[0][0].i=NaN]){const d=fixture();mutate(d);assert.equal(T.validate(d,a).available,false);}
 assert.equal(T.validate(d,{...a,p:{...a.p,frequency:600,excursion:1,sharedBack:90,count:2}}).available,true,'non-front geometry can reuse the front two-port');
});
test('Projected-Sd conversion preserves complex power and reciprocal cross impedance',()=>{
 const d=fixture();d.coneProjectedAreaM2*=.8;const F=d.rows[0].impedance,G=T.matrix(d,a,100).impedance,q=[C(.3,.1),C(-.2,.4)],s=.8;
 const mul=(a,b)=>C(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r),dot=(F,q)=>F.map(r=>r.map((f,i)=>mul(f,q[i])).reduce((a,b)=>C(a.r+b.r,a.i+b.i),C())),power=(p,q)=>p.reduce((v,z,i)=>v+z.r*q[i].r+z.i*q[i].i,0),qf=[C(q[0].r*s,q[0].i*s),q[1]];
 assert.ok(Math.abs(power(dot(F,qf),qf)-power(dot(G,q),q))<1e-9);assert.equal(G[0][1].i,G[1][0].i);assert.ok(Math.abs(G[0][0].i/F[0][0].i-s*s)<1e-12);
});
test('Unqualified frequencies are gaps; spatial voltage doubles flow and quadruples power',()=>{
 const d=fixture();d.rows[1]={frequencyHz:300,available:false,reason:'Refinement failed'};
 const r=T.analyze(a,d,{voltageRms:1}),r2=T.analyze(a,d,{voltageRms:2});assert.equal(r.available,true,r.reason);assert.equal(r.rows[1].available,false);assert.equal(T.matrix(d,a,200).available,false,'no nearest-frequency borrowing');
 for(const i of [0,2]){assert.equal(r.rows[i].available,true,r.rows[i].reason);assert.ok(Math.abs(r2.rows[i].mouthFlowRmsLS/r.rows[i].mouthFlowRmsLS-2)<1e-9);assert.ok(Math.abs(r2.rows[i].mouthPowerW/r.rows[i].mouthPowerW-4)<1e-9);assert.ok(Math.abs(r.rows[i].relativePowerResidual)<1e-9);}
 for(const mode of ['flow','power','impedance','excursion','velocity','pressure','phase']){const svg=c.MEHSystemPanel.plotSVG(r,mode);assert.ok(!/NaN|undefined|Infinity/.test(svg));assert.match(svg,/<title>/);assert.equal((svg.match(/stroke="#315a55" stroke-width="2"/g)||[]).length,1);}
 assert.match(T.csv(r),/Refinement failed/);assert.match(T.csv(r),/Not SPL or directivity/);
});
test('No insert fallback, no geometry-error results, and imported drive retained',()=>{
 assert.equal(T.analyze(a,null).available,false);assert.equal(T.analyze({...a,errors:['bad']},fixture()).available,false);assert.equal(T.analyze(a,fixture(),{voltageRms:NaN}).available,false);
 assert.match(html,/systemPanel\?\.update\(analysis\)/);assert.match(html,/systemPanel\?\.setOptions\(d.systemAcoustics\?\.options\|\|d.acousticScreen\?\.options\)/);
});
test('Qualified open-front reference uses its own spatial matrix and exports both cases',()=>{
 const d=fixture(),open=M.analyze({...a.p,frontFiller:'none'}),od=fixture();od.inputState={...open.p};od.meshSha256='d'.repeat(64);
 for(const row of od.rows)for(const line of row.impedance)for(const v of line){v.r*=.8;v.i*=.8;}
 const r=T.analyze(a,d,{voltageRms:1}),baseline=T.analyze(open,od,{voltageRms:1,useSpatialFront:true});assert.equal(baseline.available,true,baseline.reason);assert.equal(baseline.spatial,true);r.baseline=baseline;
 assert.match(c.MEHSystemPanel.plotSVG(r),/stroke-dasharray="6 3"/);assert.match(T.csv(r),/Open-collector reference/);assert.match(T.csv(r),new RegExp('d'.repeat(64)));assert.notEqual(r.rows[0].mouthFlowRmsLS,baseline.rows[0].mouthFlowRmsLS);
});
test('System panel invalidates plotted/exportable results immediately when dimensions change',()=>{
 const nodes=new Map(),events={};function node(s){if(!nodes.has(s))nodes.set(s,{value:s.includes('drive')?'1':s.includes('mouth')?'baffled':s.includes('throat')?'closed':'flow',textContent:'',innerHTML:'',disabled:false,events:{},addEventListener(e,f){this.events[e]=f}});return nodes.get(s);}
 const host={open:false,innerHTML:'',querySelector:node,addEventListener(e,f){events[e]=f}},old=c.MEHSpatialResults;c.MEHSpatialResults=fixture();const panel=c.MEHSystemPanel.init(host);panel.update(a);host.open=true;events.toggle();assert.equal(panel.result.available,true);assert.equal(node('[data-sa-export]').disabled,false);
 host.open=false;panel.update(M.analyze({...base,fillerOpening:90}));assert.equal(panel.result,null);assert.equal(node('[data-sa-export]').disabled,true);assert.equal(node('[data-sa-plot]').innerHTML,'');host.open=true;events.toggle();assert.equal(panel.result,null);assert.match(node('[data-sa-status]').textContent,/Passage changed/);panel.dispose();c.MEHSpatialResults=old;
});
test('Bundled native insert is qualified for its exact example and closes coupled power balance',()=>{
 const data=require('../acoustics/data/current-insert.json'),example=require('../examples/offset-insert-study.json'),a=M.analyze(example.state),result=T.analyze(a,data,example.systemAcoustics.options);
 assert.equal(result.available,true,result.reason);assert.deepEqual(Array.from(result.rows,r=>r.frequencyHz),Array.from({length:19},(_,i)=>100+i*50));
 for(const row of result.rows){assert.equal(row.available,true,row.reason);assert.ok(Math.abs(row.relativePowerResidual)<1e-9);assert.equal(row.branches.length,4);}
 for(const row of data.rows){assert.equal(row.qualified,true);assert.ok(Object.values(row.qualification.checks).every(v=>v===true));assert.ok(row.qualification.convergence.mediumToFineMatrixChange<.005);}
 assert.equal(T.analyze(M.analyze({...example.state,gap:29}),data).available,false);
});
test('Portable editor embeds the reviewed source modules and unchanged geometry kernel',()=>{
 const {createHash}=require('node:crypto'),{scripts}=require('./load-editor.cjs')();assert.equal(createHash('sha256').update(scripts[4]).digest('hex'),'cb1b9bebd9ff0f155f9a20dd4db4d707f4ef9666cce444b8141586ce626964ec');
 const N=require('../acoustics/multiport-network.cjs')(c.MEHHornAcoustics),S=require('../acoustics/coupled-system.cjs')(M,c.MEHAcoustics,N),T0=require('../acoustics/spatial-study.cjs')(M,S),P=require('../acoustics/system-panel.cjs')(c);
 for(const [a,b]of [[N.solve,c.MEHMultiport.solve],[S.solve,c.MEHCoupledSystem.solve],[T0.validate,T.validate],[T0.analyze,T.analyze],[T0.csv,T.csv],[P.init,c.MEHSystemPanel.init],[P.plotSVG,c.MEHSystemPanel.plotSVG]])assert.equal(a.toString(),b.toString());
});
