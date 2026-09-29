'use strict';
const path=require('node:path');
let runtime;
function getRuntime(){if(!runtime){const context=require('../tests/load-editor.cjs')(path.join(__dirname,'../index.html')).context;runtime={H:context.MEHHornAcoustics,N:require('../acoustics/multiport-network.cjs')(context.MEHHornAcoustics)};}return runtime;}
const z=(r=0,i=0)=>({r,i}),add=(a,b)=>z(a.r+b.r,a.i+b.i),sub=(a,b)=>z(a.r-b.r,a.i-b.i),mul=(a,b)=>z(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r),scale=(a,k)=>z(a.r*k,a.i*k),abs=a=>Math.hypot(a.r,a.i),div=(a,b)=>scale(mul(a,z(b.r,-b.i)),1/(b.r*b.r+b.i*b.i)),arg=a=>Math.atan2(a.i,a.r)*180/Math.PI,wrap=x=>((x+180)%360+360)%360-180,power=(p,u)=>p.r*u.r+p.i*u.i;
function profile(caseData,cellsPerSegment=128){
 let axial=0,pro=[];
 for(const segment of caseData.segments){const r1=Math.sqrt(segment.area1M2/Math.PI),r2=Math.sqrt(segment.area2M2/Math.PI);for(let i=pro.length?1:0;i<=cellsPerSegment;i++){const t=i/cellsPerSegment,r=segment.type==='conical'?r1+(r2-r1)*t:r1*(r2/r1)**t;pro.push({z:(axial+segment.lengthM*t)*1000,r:r*1000});}axial+=segment.lengthM;}
 return {p:{soundSpeed:caseData.medium.soundSpeedMS},pro};
}
function simulate(caseData,frequencies,{cellsPerSegment=128}={}){
 const {N}=getRuntime(),rho=caseData.medium.densityKgM3,c=caseData.medium.soundSpeedMS,horn=profile(caseData,cellsPerSegment),ports=caseData.branches.map(b=>({id:b.id,zMM:b.zM*1000})),n=ports.length;
 return frequencies.map(f=>{
  const w=2*Math.PI*f,opts={density:rho,soundSpeed:c,mouthTermination:caseData.mouthTermination,throatTermination:'closed'},network=N.impedanceMatrix(horn,f,ports,opts);if(!network.available)throw Error(network.reason);
  const A=Array.from({length:2*n},()=>Array.from({length:2*n},()=>z())),rhs=Array.from({length:2*n},()=>z()),electrical=[],motors=[];
  caseData.branches.forEach((b,i)=>{
   const d=b.driver,Ze=z(d.ReOhm,w*d.LeH),Zm=z(d.RmsNsPerM,w*d.MmdKg-1/(w*d.CmsMPerN)),Zf=z(0,-rho*c*c/(w*b.frontVolumeM3)),Zr=z(0,-rho*c*c/(w*b.rearVolumeM3)),Zn=z(0,b.portAreaM2?w*rho*b.portLengthM/b.portAreaM2:0);
   electrical.push(Ze);motors.push(Zm);
   A[i][i]=add(scale(add(Zm,div(z(d.Bl*d.Bl),Ze)),1/(d.SdM2*d.SdM2)),add(Zf,Zr));A[i][n+i]=scale(Zf,-1);rhs[i]=div(z(b.voltageRms*(b.polarity||1)*d.Bl/d.SdM2),Ze);
   A[n+i][i]=scale(Zf,-1);for(let j=0;j<n;j++)A[n+i][n+j]=network.impedance[i][j];A[n+i][n+i]=add(A[n+i][n+i],add(Zf,Zn));
  });
  const solved=N.linearSolve(A,rhs),piston=solved.slice(0,n),entry=solved.slice(n),h=N.solve(horn,f,ports.map((p,i)=>({...p,flow:entry[i]})),opts);if(!h.available)throw Error(h.reason);
  const rows=caseData.branches.map((b,i)=>{const d=b.driver,velocity=scale(piston[i],1/d.SdM2),current=div(sub(z(b.voltageRms*(b.polarity||1)),scale(velocity,d.Bl)),electrical[i]),Ze=div(z(b.voltageRms*(b.polarity||1)),current);return {id:b.id,current,Ze,excursionPeakMM:Math.SQRT2*abs(velocity)/w*1000,portVelocityPeakMS:b.portAreaM2?Math.SQRT2*abs(entry[i])/b.portAreaM2:0,inputPowerW:b.voltageRms*(b.polarity||1)*current.r,lossPowerW:d.ReOhm*abs(current)**2+d.RmsNsPerM*abs(velocity)**2};});
  const input=rows.reduce((s,b)=>s+b.inputPowerW,0),loss=rows.reduce((s,b)=>s+b.lossPowerW,0),residual=(input-loss-h.mouthPowerW)/Math.max(1e-30,input),normal=rho*c/caseData.segments[0].area1M2;
  if(Math.abs(residual)>1e-6)throw Error('Benchmark motor/network power residual '+residual);
  const result={frequency_hz:f,spl_db:10*Math.log10(h.mouthPowerW*rho*c/(caseData.solidAngleSr*caseData.distanceM**2*(20e-6)**2)),za_real_normalized:network.impedance[0][0].r/normal,za_imag_normalized:network.impedance[0][0].i/normal,ze_ohm:abs(rows[0].Ze),ze_phase_deg:arg(rows[0].Ze),excursion_peak_mm:rows[0].excursionPeakMM,phase_deg:wrap(arg(h.mouthFlow)+90),mouth_power_w:h.mouthPowerW,power_relative_residual:residual};
  for(const row of rows){result['ze_ohm_'+row.id]=abs(row.Ze);result['excursion_peak_mm_'+row.id]=row.excursionPeakMM;result['port_velocity_peak_ms_'+row.id]=row.portVelocityPeakMS;}
  return result;
 });
}
module.exports={simulate,profile,getRuntime};
