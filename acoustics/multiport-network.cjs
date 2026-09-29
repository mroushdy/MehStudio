/* Coupled axial Webster network, RMS phasors exp(+j omega t), SI internally.
 * Independent source nodes and mutual loading; NOT a 3D spatial field model.
 * Source flow/admittance must be acoustic quantities, never electrical ohms.
 * Factory receives the existing tested conical-cell/radiation implementation.
 */
module.exports=function createMultiportNetwork(H){
'use strict';
const z=(r=0,i=0)=>({r,i}),add=(a,b)=>z(a.r+b.r,a.i+b.i),sub=(a,b)=>z(a.r-b.r,a.i-b.i),mul=(a,b)=>z(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r),scale=(a,x)=>z(a.r*x,a.i*x),abs=a=>Math.hypot(a.r,a.i),div=(a,b)=>{const n=b.r*b.r+b.i*b.i;return z((a.r*b.r+a.i*b.i)/n,(a.i*b.r-a.r*b.i)/n)},finite=a=>Number.isFinite(a?.r)&&Number.isFinite(a?.i),power=(p,q)=>p.r*q.r+p.i*q.i;
const assumptions=[
 'Axial, plane-wave Webster model with separate complex source and load records. Sources at the same axial plane share one pressure; azimuthal interactions are not resolved.',
 'Rigid, lossless conical horn cells. Returning rolled lip, diffraction, higher modes and local junction scattering are omitted.',
 'Prescribed acoustic source flow and admittance do not establish volts-to-SPL sensitivity, compression-driver source data, or measured crossover behavior.',
 'A zero source drive retains its specified passive load; it is not a removed driver.'
];
function linearSolve(matrix,rhs){
 const A=matrix.map((row,i)=>[...row.map(q=>({...q})),{...rhs[i]}]),N=A.length;
 for(let k=0;k<N;k++){
  let pivot=-1,best=0;for(let i=k;i<N;i++){const rowScale=Math.max(...A[i].slice(k,N).map(abs));const ratio=rowScale?abs(A[i][k])/rowScale:0;if(ratio>best){best=ratio;pivot=i;}}
  if(pivot<0||best<1e-12)throw Error('Network is singular or ill-conditioned at this frequency.');
  [A[k],A[pivot]]=[A[pivot],A[k]];
  for(let i=k+1;i<N;i++){const f=div(A[i][k],A[k][k]);A[i][k]=z();for(let j=k+1;j<=N;j++)A[i][j]=sub(A[i][j],mul(f,A[k][j]));}
 }
 const x=Array.from({length:N},()=>z());for(let i=N-1;i>=0;i--){let b=A[i][N];for(let j=i+1;j<N;j++)b=sub(b,mul(A[i][j],x[j]));x[i]=div(b,A[i][i]);if(!finite(x[i]))throw Error('Nonfinite network solution.');}return x;
}
function solve(analysis,frequencyHz,ports,options={}){
 const fail=reason=>({available:false,reason,frequencyHz,assumptions});
 try{
  const rho=options.density??1.204,c=options.soundSpeed??analysis?.p?.soundSpeed??343,mouth=options.mouthTermination??'baffled',throat=options.throatTermination??'closed';
  if(![rho,c,frequencyHz].every(x=>Number.isFinite(x)&&x>0))throw Error('Positive frequency and medium properties are required.');
  if(!['baffled','matched'].includes(mouth)||!['closed','matched'].includes(throat))throw Error('Unsupported radiation/termination model.');
  if(!Array.isArray(ports)||!ports.length||ports.length>32)throw Error('Provide 1–32 independent source records.');
  const ids=new Set();for(const p of ports){if(typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Source IDs must be nonempty and unique.');ids.add(p.id);if(!Number.isFinite(p.zMM)||!finite(p.flow)||p.admittance&&(!finite(p.admittance)||p.admittance.r<0))throw Error('Sources require a finite position, acoustic flow and passive acoustic admittance.');}
  if(!Array.isArray(analysis?.pro)||analysis.pro.length<2)throw Error('Horn profile is missing.');
  let profile=analysis.pro.map(p=>({z:p.z*.001,r:p.r*.001}));if(profile.some(p=>!Number.isFinite(p.z)||!Number.isFinite(p.r)||p.r<=0))throw Error('Invalid horn profile.');
  let end=0;for(let i=1;i<profile.length;i++)if(profile[i].z>profile[end].z)end=i;profile=profile.slice(0,end+1);
  if(profile.length<2||profile.some((p,i)=>i&&p.z<=profile[i-1].z))throw Error('Forward horn profile must have strictly increasing axial coordinates.');
  const lo=profile[0].z,hi=profile.at(-1).z;if(ports.some(p=>p.zMM*.001<lo-1e-12||p.zMM*.001>hi+1e-12))throw Error('Source position is outside the forward horn branch.');
  const stations=[lo,hi,...ports.map(p=>Math.max(lo,Math.min(hi,p.zMM*.001)))].sort((a,b)=>a-b).filter((q,i,a)=>!i||q-a[i-1]>1e-10);
  const at=s=>{if(s<=lo)return {...profile[0]};let i=profile.findIndex(p=>p.z>=s);if(i<0)i=profile.length-1;const a=profile[i-1],b=profile[i],f=(s-a.z)/(b.z-a.z);return {z:s,r:a.r+(b.r-a.r)*f};};
  const N=stations.length,E=N-1,size=N+2*E,Zref=rho*c/(Math.PI*at(stations[0]).r**2),A=Array.from({length:size},()=>Array.from({length:size},()=>z())),rhs=Array.from({length:size},()=>z());
  const stamp=(row,col,value)=>A[row][col]=add(A[row][col],value),left=e=>N+2*e,right=e=>N+2*e+1;
  let row=0;for(let e=0;e<E;e++){
   const points=[at(stations[e]),...profile.filter(p=>p.z>stations[e]+1e-12&&p.z<stations[e+1]-1e-12),at(stations[e+1])],cells=points.slice(1).map((p,j)=>({r1:points[j].r,r2:p.r,length:p.z-points[j].z})),T=H.cascade(cells,frequencyHz,rho,c);
   stamp(row,e,z(1));stamp(row,e+1,z(-T.A));stamp(row++,right(e),z(0,-T.B/Zref));
   stamp(row,left(e),z(1));stamp(row,e+1,z(0,-T.C*Zref));stamp(row++,right(e),z(-T.D));
  }
  const mouthZ=mouth==='baffled'?H.radiationImpedance(at(hi).r,frequencyHz,rho,c):z(rho*c/(Math.PI*at(hi).r**2)),throatY=throat==='matched'?z(Math.PI*at(lo).r**2/(rho*c)):z(),mouthY=div(z(1),mouthZ),portNodes=ports.map(p=>stations.reduce((b,v,i)=>Math.abs(v-p.zMM*.001)<Math.abs(stations[b]-p.zMM*.001)?i:b,0));
  for(let i=0;i<N;i++){
   if(i)stamp(row,right(i-1),z(-1));if(i<E)stamp(row,left(i),z(1));
   if(i===0)stamp(row,i,scale(throatY,Zref));if(i===N-1)stamp(row,i,scale(mouthY,Zref));
   ports.forEach((p,j)=>{if(portNodes[j]===i){stamp(row,i,scale(p.admittance||z(),Zref));rhs[row]=add(rhs[row],scale(p.flow,Zref));}});row++;
  }
  const x=linearSolve(A,rhs),pressures=x.slice(0,N),mouthFlow=mul(mouthY,pressures.at(-1)),throatFlow=mul(throatY,pressures[0]);
  const sourceResults=ports.map((p,j)=>{const pressure=pressures[portNodes[j]],passiveFlow=mul(p.admittance||z(),pressure),flow=sub(p.flow,passiveFlow);return {id:p.id,zMM:p.zMM,pressure,flow,passiveFlow,driveFlow:{...p.flow},drivePowerW:power(pressure,p.flow),passivePowerW:power(pressure,passiveFlow)};});
  const sourcePowerW=sourceResults.reduce((s,p)=>s+p.drivePowerW,0),sourceLoadPowerW=sourceResults.reduce((s,p)=>s+p.passivePowerW,0),mouthPowerW=power(pressures.at(-1),mouthFlow),throatPowerW=power(pressures[0],throatFlow),residualPowerW=sourcePowerW-sourceLoadPowerW-mouthPowerW-throatPowerW;
  // Opposing sources can make net real power arbitrarily small. Normalize
  // roundoff by the sum of individual apparent source powers as well; this
  // preserves the residual gate without rejecting coherent cancellation.
  const scalePower=Math.max(1e-30,sourceResults.reduce((s,p)=>s+abs(p.pressure)*abs(p.driveFlow),0),Math.abs(sourcePowerW),Math.abs(sourceLoadPowerW)+Math.abs(mouthPowerW)+Math.abs(throatPowerW));if(mouthPowerW<-1e-8*scalePower||sourceLoadPowerW<-1e-8*scalePower||Math.abs(residualPowerW)>1e-6*scalePower)throw Error('Passive power balance failed; solution withheld.');
  return {available:true,frequencyHz,model:'Coupled axial multiport Webster network',stationsMM:stations.map(s=>s*1000),pressures,ports:sourceResults,mouthFlow,throatFlow,mouthPowerW,throatPowerW,sourcePowerW,sourceLoadPowerW,residualPowerW,relativePowerResidual:residualPowerW/scalePower,transverseReferenceHz:1.8411837813406593*c/(2*Math.PI*Math.max(...profile.map(p=>p.r))),assumptions};
 }catch(e){return fail(e.message);}
}
function impedanceMatrix(analysis,frequencyHz,ports,options={}){
 const columns=ports.map((p,j)=>solve(analysis,frequencyHz,ports.map((q,i)=>({...q,flow:z(i===j?1:0)})),options));
 const failed=columns.find(c=>!c.available);if(failed)return failed;
 return {available:true,frequencyHz,ids:ports.map(p=>p.id),impedance:ports.map((p,i)=>columns.map(c=>c.ports[i].pressure)),mouthFlowPerSource:columns.map(c=>c.mouthFlow),assumptions};
}
return {solve,impedanceMatrix,linearSolve,assumptions};
};
