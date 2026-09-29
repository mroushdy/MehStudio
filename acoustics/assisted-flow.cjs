/* Goals-first product policy, separate from the physical solver. */
module.exports=function(M,A,O,B){
'use strict';
const defaults={maxWidthMM:1000,maxDepthMM:1000,budget:'',midPrice:'',compressionPrice:'',targetSPL:'',distanceM:3,priority:'balanced'};
const profileKeys=['mouth','coverage','throatAngle','k','r','m','b','q'];
const entryKeys=['tap','port','gap','neck','offset'];
function goals(raw={}){
 const out={...defaults,...raw},errors=[];
 for(const [k,min,max,optional]of [['maxWidthMM',200,3000],['maxDepthMM',100,3000],['distanceM',.5,30],['targetSPL',60,150,true],['budget',0,100000,true],['midPrice',0,100000,true],['compressionPrice',0,100000,true]]){
  if(optional&&(out[k]===''||out[k]===null||out[k]===undefined)){out[k]=null;continue;}
  const v=Number(out[k]);if(out[k]===''||typeof out[k]==='boolean'||!Number.isFinite(v)||v<min||v>max)errors.push({field:k,message:`Enter ${k==='maxWidthMM'?'maximum width':k==='maxDepthMM'?'maximum depth':k==='distanceM'?'listening distance':k==='targetSPL'?'target SPL':k==='budget'?'driver budget':k==='midPrice'?'mid unit price':'compression driver price'} between ${min} and ${max}.`});else out[k]=v;
 }
 if(!['balanced','compact','headroom'].includes(out.priority))errors.push({field:'priority',message:'Choose a supported design priority.'});
 return {ok:!errors.length,value:out,errors};
}
function dimensions(a){
 // Exact support bounds of the conservative cylindrical driver/pod envelopes.
 const p=a.p,profile=M.profile(p),outer=profile.map(v=>({r:v.outerR,z:v.outerZ})),rad=Math.max(...outer.map(v=>v.r));
 const lo=[-rad,-rad,Math.min(...outer.map(v=>v.z))],hi=[rad,rad,Math.max(...outer.map(v=>v.z))];
 const cylinder=(f,n,r,l)=>{for(let k=0;k<3;k++){const t=n[k]*l,span=r*Math.sqrt(Math.max(0,1-n[k]*n[k]));lo[k]=Math.min(lo[k],f[k]+Math.min(0,t)-span);hi[k]=Math.max(hi[k],f[k]+Math.max(0,t)+span);}};
 cylinder([0,0,-12],[0,0,-1],a.compressionDriver.diameterMM/2,a.compressionDriver.depthMM);
 for(const pose of a.poses){cylinder(pose.F,pose.n,p.frame/2,p.driverDepth);if(p.rearLayout==='individual')cylinder(pose.F,pose.n,a.podOuter,a.podDepth);}
 if(p.rearLayout==='shared'){const s=a.sharedRear;for(const v of s.outerProfile||s.profile||[]){const r=v.r??v.outerR;lo[0]=Math.min(lo[0],-r);lo[1]=Math.min(lo[1],-r);hi[0]=Math.max(hi[0],r);hi[1]=Math.max(hi[1],r);lo[2]=Math.min(lo[2],v.z);hi[2]=Math.max(hi[2],v.z);}lo[2]=Math.min(lo[2],s.rearZMM);hi[2]=Math.max(hi[2],s.frontZMM+(s.frontCapMM||0));}
 if(p.rearConcept==='reflex'&&a.rearPort?.outsideLengthMM)lo[2]-=a.rearPort.outsideLengthMM;
 const widthMM=Math.max(hi[0]-lo[0],hi[1]-lo[1]),depthMM=hi[2]-lo[2];
 if(!Number.isFinite(widthMM)||!Number.isFinite(depthMM))throw Error('Assembly dimensions could not be checked.');
 return {widthMM,depthMM,bounds:{lo,hi},boxLitres:widthMM*widthMM*depthMM/1e6};
}
function fitReasons(a,g){const d=dimensions(a),r=[];if(d.widthMM>g.maxWidthMM+1e-6)r.push(`Assembly width exceeds ${g.maxWidthMM} mm.`);if(d.depthMM>g.maxDepthMM+1e-6)r.push(`Assembly depth exceeds ${g.maxDepthMM} mm.`);return r;}
function driverChoices(brief,raw){
 const check=goals(raw);if(!check.ok)return {...check,choices:[]};const g=check.value,choices=[];
 for(const midDriver of Object.keys(A.catalog))for(const [compressionDriver,cd]of Object.entries(M.drivers.compression)){
  if(!cd.available||!Number.isFinite(cd.recommendedLowCrossoverHz))continue;
  const resolved=O.resolveGoals({...brief,midDriver,compressionDriver});if(!resolved.ok)continue;
  const mid=M.drivers.mid[midDriver],seedWidth=resolved.state.mouth+2*resolved.state.wall;
  if(seedWidth>g.maxWidthMM)continue;
  const displacement=A.catalog[midDriver].sd*A.catalog[midDriver].xmaxMM*resolved.brief.count;
  choices.push({midDriver,compressionDriver,midName:mid.name,compressionName:cd.name,seedWidthMM:seedWidth,displacement,minimumHandoffHz:cd.recommendedLowCrossoverHz,midSource:mid.source,compressionSource:cd.source,score:g.priority==='headroom'?-displacement:seedWidth,notes:cd.coaxial||/459|DCX/i.test(cd.name)?'Separate compression-driver bands require a crossover.':'Crossover and high-frequency response need verification.'});
 }
 choices.sort((a,b)=>a.score-b.score||M.drivers.compression[a.compressionDriver].diameterMM-M.drivers.compression[b.compressionDriver].diameterMM||a.midDriver.localeCompare(b.midDriver)||a.compressionDriver.localeCompare(b.compressionDriver));
 // Show a spread of mid sizes before offering further compression-driver variants.
 const seen=new Set(),diverse=[];for(const c of choices)if(!seen.has(c.midDriver)){seen.add(c.midDriver);diverse.push(c);}for(const c of choices)if(!diverse.includes(c)&&diverse.length<6)diverse.push(c);
 return {ok:true,choices:diverse.slice(0,6),total:choices.length,scope:'Catalogue shortlist based on motor-data availability, packaging seed and recommended handoff. Full layout and acoustic checks happen during generation.'};
}
function cost(brief,g){const known=g.midPrice!==null&&g.compressionPrice!==null,total=known?Number(brief.count)*g.midPrice+g.compressionPrice:null;return {known,total,within:g.budget===null?null:known?total<=g.budget:null};}
function headroom(c){const q=c.acousticSummary,p=c.state,d=A.catalog[p.midDriver];return Math.min(q.xmaxMM/Math.max(q.maximumExcursionPeakMM,1e-12),p.soundSpeed*.05/Math.max(q.maximumEntryVelocityPeakMS,q.maximumRearPortVelocityPeakMS,1e-12),Math.sqrt(d.nominalPowerW/Math.max(q.maximumCoilDissipationPerDriverW,1e-12)));}
function assessment(c,g){
 const d=dimensions(c.analysis),q=c.acousticSummary,passed=[`Assembly ${Math.ceil(d.widthMM)} mm wide × ${Math.ceil(d.depthMM)} mm deep fits your limits.`,`Sampled cone movement and air speed pass at ${q.perDriverVoltageRms} V RMS per mid.`],attention=[],verify=['Actual coverage and compression-driver/crossover integration.','Prototype measurements, physical clearances and construction tolerances.'];
 const money=cost(c.state,g);if(money.known){if(money.within===true)passed.push(`Driver quote total ${money.total.toFixed(2)} is within budget.`);else if(money.within===false)attention.push('Driver quotes exceed the budget.');}else if(g.budget!==null)attention.push('Driver cost is unknown. Add unit prices to check your budget.');
 if(q.compactnessExceeded)attention.push('Part of your frequency range needs a spatial simulation; the fast model is less reliable there.');
 if(q.portedPreliminary)attention.push('Rear-vent and horn sound are not yet combined. Bass extension is unverified.');
 let output=null;
 if(g.targetSPL!==null){output=B.baseline(c.analysis,{voltageRms:q.perDriverVoltageRms,distanceM:g.distanceM,points:65,fmin:Math.max(20,q.screenLowHz),fmax:q.requestedHandoffHz,targets:{lowHz:q.requestedLowHz,highHz:q.requestedHandoffHz,maxExcursionMM:q.xmaxMM,maxPortVelocityMS:c.state.soundSpeed*.05}});if(output.available){const min=output.summary.minSplDb;attention.push(`Estimated mid-band minimum ${min.toFixed(1)} dB at ${g.distanceM} m; target ${g.targetSPL} dB. This is a baffled-aperture estimate, not verified whole-speaker loudness.`);}else attention.push('Loudness estimate unavailable: '+output.reason);}
 return {passed,attention,verify,dimensions:d,cost:money,headroomDB:20*Math.log10(headroom(c)),output:output?.available?{minSplDb:output.summary.minSplDb,targetSPL:g.targetSPL,distanceM:g.distanceM}:null};
}
async function generate(brief,raw,options={}){
 const check=goals(raw);if(!check.ok)return {ok:false,candidates:[],errors:check.errors.map(v=>v.message),issues:[]};const g=check.value,money=cost(brief,g);
 if(money.within===false)return {ok:false,candidates:[],errors:['Driver quotes exceed your budget. Choose another combination or revise the budget.'],issues:[]};
 const locks={};if(options.currentState){for(const k of options.lockProfile?profileKeys:[])locks[k]=options.currentState[k];for(const k of options.lockEntry?entryKeys:[])locks[k]=options.currentState[k];}
 if(options.lockProfile&&Number(brief.coverage)!==locks.coverage)return {ok:false,candidates:[],errors:['Unlock horn dimensions to change the coverage target.'],issues:[]};
 const result=await O.generate(brief,{...options,lockedState:locks,candidateLimit:6,constraintReasons:a=>fitReasons(a,g)});
 if(!result.ok)return result;
 for(const c of result.candidates)c.guided=assessment(c,g);
 result.candidates.sort((a,b)=>{if(g.targetSPL!==null){const deficit=c=>c.guided.output?Math.max(0,g.targetSPL-c.guided.output.minSplDb):Infinity,delta=deficit(a)-deficit(b);if(Number.isFinite(delta)&&Math.abs(delta)>.01)return delta;}return g.priority==='compact'?a.guided.dimensions.boxLitres-b.guided.dimensions.boxLitres:g.priority==='headroom'?b.guided.headroomDB-a.guided.headroomDB:a.score-b.score;});
 result.candidates=result.candidates.slice(0,3);result.guidedGoals=g;result.lockedState=locks;
 return result;
}
return {defaults,goals,dimensions,fitReasons,driverChoices,cost,headroom,assessment,generate,profileKeys,entryKeys};
};
