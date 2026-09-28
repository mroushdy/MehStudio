/* Simultaneous motor/front-passage/horn/shared-rear system.
 * A supplied front two-port uses pressures at piston/entry and flows INTO
 * the local air domain. Neck flow OUT of that domain is therefore negative.
 * Spatial insert matrices must resolve their own geometry; no volume-only
 * fallback is permitted for an insert. RMS, exp(+j omega t), SI quantities.
 */
module.exports=function createCoupledSystem(M,A,N){
const C=(r=0,i=0)=>({r,i}),add=(a,b)=>C(a.r+b.r,a.i+b.i),sub=(a,b)=>C(a.r-b.r,a.i-b.i),mul=(a,b)=>C(a.r*b.r-a.i*b.i,a.r*b.i+a.i*b.r),scale=(a,k)=>C(a.r*k,a.i*k),abs=a=>Math.hypot(a.r,a.i),div=(a,b)=>{const d=b.r*b.r+b.i*b.i;return C((a.r*b.r+a.i*b.i)/d,(a.i*b.r-a.r*b.i)/d)},finite=q=>Number.isFinite(q?.r)&&Number.isFinite(q?.i),power=(p,q)=>p.r*q.r+p.i*q.i;
function solve(horn,frequencyHz,branches,options={}){
 try{
  const o={density:1.204,endCorrection:1.4,rearLossQ:7,rearEndCorrectionScale:1,loadFactor:1,hornLoad:'webster',mouthTermination:'baffled',throatTermination:'closed',...options},w=2*Math.PI*frequencyHz;
  if(!Array.isArray(branches)||!branches.length||branches.length>16||!(frequencyHz>0))throw Error('Provide 1–16 mid branches and a positive frequency.');
  if(![o.density,o.rearLossQ,o.rearEndCorrectionScale].every(x=>Number.isFinite(x)&&x>0)||!Number.isFinite(o.endCorrection)||o.endCorrection<0)throw Error('Invalid medium, end correction or rear loss assumption.');
  const ks=[],front=[],drivers=[];
  for(const [i,b]of branches.entries()){
   const a=b.analysis,d=A.catalog[a?.p?.midDriver];if(!d||!A.driverMatches(a,d))throw Error('Each branch needs matching verified motor parameters.');if(!finite(b.voltage))throw Error('Each branch needs a finite complex RMS voltage.');
   for(const key of ['mouth','throat','coverage','throatAngle','k','r','m','b','q','soundSpeed'])if(a.p[key]!==horn.p[key])throw Error('All source branches must reference the same horn profile.');
   const k=A.circuitParameters(a,d,o);if(![k.Sd,k.Mms,k.Cms,k.Re,k.Bl,k.frontV,k.area].every(x=>Number.isFinite(x)&&x>0))throw Error('Nonphysical motor or cavity parameter.');
   const spatial=typeof b.frontTwoPort==='function'?b.frontTwoPort(frequencyHz):b.frontTwoPort;
   if(a.p.frontFiller!=='none'&&!spatial)throw Error('Insert requires a solved spatial front-passage matrix; no volume-only fallback.');
   if(spatial&&(!Array.isArray(spatial.impedance)||spatial.available===false||!Number.isFinite(spatial.frequencyHz)||Math.abs(spatial.frequencyHz-frequencyHz)>1e-8*Math.max(1,frequencyHz)))throw Error('Spatial matrix must be available and match the requested frequency.');
   const compliance=C(0,-1/(w*k.Cfront)),F=spatial?.impedance||[[compliance,compliance],[compliance,add(compliance,C(0,w*k.Mneck))]];
   if(F.length!==2||F.some(row=>row.length!==2||row.some(v=>!finite(v))))throw Error('Invalid front acoustic two-port.');
   const norm=Math.max(1,...F.flat().map(abs)),tol=norm*1e-8;
   if(abs(sub(F[0][1],F[1][0]))>tol||F[0][0].r<-tol||F[1][1].r<-tol||F[0][0].r*F[1][1].r-F[0][1].r**2 < -tol*norm)throw Error('Front acoustic matrix fails reciprocity/passivity.');
   ks.push(k);front.push(F);drivers.push(d);
  }
  const shared=branches[0].analysis.p.rearLayout==='shared';
  if(branches.some(b=>(b.analysis.p.rearLayout==='shared')!==shared))throw Error('A coupled group must share one rear-layout convention.');
  if(shared){const ref=branches[0].analysis.p;for(const b of branches)for(const key of ['sharedBack','rearConcept','rearPortShape','rearPortDiameter','rearPortWidth','rearPortHeight','rearTuning'])if(b.analysis.p[key]!==ref[key])throw Error('Shared rear chamber parameters must agree across branches.');}
  const rear=k=>{const compliance=shared?k.rearTotalV/(k.rho*k.c*k.c):k.Crear;if(!k.rearVented)return C(0,-1/(w*compliance));const vent=C(shared?k.RphysicalRearPort:k.RrearPort,w*(shared?k.MphysicalRearPort:k.MrearPort));return div(vent,add(C(1),mul(C(0,w*compliance),vent)));};
  const rearZ=ks.map(rear),ports=branches.map((b,i)=>({id:b.id||'mid-'+i,zMM:b.analysis.p.tap,admittance:C()})),external=options.acousticSources||[];
  for(const s of external){if(!finite(s.flow))throw Error('External acoustic source needs a calibrated or explicitly normalized flow.');ports.push({...s});}
  const hz=N.impedanceMatrix(horn,frequencyHz,ports,o);if(!hz.available)throw Error(hz.reason);
  const n=branches.length,mat=Array.from({length:2*n},()=>Array.from({length:2*n},()=>C())),rhs=Array.from({length:2*n},()=>C()),Ze=[],Zmotor=[];
  for(let i=0;i<n;i++){
   const k=ks[i],F=front[i],ze=C(k.Re,w*k.Le),zm=C(k.Rms,w*k.Mms-1/(w*k.Cms));Ze.push(ze);Zmotor.push(zm);
   const mechanical=scale(add(zm,div(C(k.Bl*k.Bl),ze)),1/(k.Sd*k.Sd));
   mat[i][i]=add(mechanical,F[0][0]);mat[i][n+i]=scale(F[0][1],-1);rhs[i]=div(scale(branches[i].voltage,k.Bl/k.Sd),ze);
   if(shared)for(let j=0;j<n;j++)mat[i][j]=add(mat[i][j],rearZ[0]);else mat[i][i]=add(mat[i][i],rearZ[i]);
   mat[n+i][i]=scale(F[1][0],-1);for(let j=0;j<n;j++)mat[n+i][n+j]=hz.impedance[i][j];mat[n+i][n+i]=add(mat[n+i][n+i],F[1][1]);
   external.forEach((s,j)=>rhs[n+i]=sub(rhs[n+i],mul(hz.impedance[i][n+j],s.flow)));
  }
  const result=N.linearSolve(mat,rhs),piston=result.slice(0,n),entry=result.slice(n),totalPiston=piston.reduce(add,C()),hornResult=N.solve(horn,frequencyHz,[...ports.slice(0,n).map((p,i)=>({...p,flow:entry[i]})),...external],o);
  if(!hornResult.available)throw Error(hornResult.reason);
  const rows=branches.map((b,i)=>{const k=ks[i],F=front[i],velocity=scale(piston[i],1/k.Sd),current=div(sub(b.voltage,scale(velocity,k.Bl)),Ze[i]),pistonPressure=sub(mul(F[0][0],piston[i]),mul(F[0][1],entry[i])),entryPressure=sub(mul(F[1][0],piston[i]),mul(F[1][1],entry[i]));return {id:ports[i].id,zMM:ports[i].zMM,voltage:{...b.voltage},current,pistonFlow:piston[i],entryFlow:entry[i],pistonPressure,entryPressure,excursionPeakMM:Math.SQRT2*abs(velocity)/w*1000,entryVelocityPeakMS:Math.SQRT2*abs(entry[i])/k.area,inputPowerW:power(b.voltage,current),coilPowerW:k.Re*abs(current)**2,mechanicalPowerW:k.Rms*abs(velocity)**2,frontLossW:power(pistonPressure,piston[i])-power(entryPressure,entry[i]),frontModel:b.frontTwoPort?'supplied spatial two-port':'lumped compliance and inertance'};});
  const sum=key=>rows.reduce((s,r)=>s+r[key],0),rearLossW=shared?rearZ[0].r*abs(totalPiston)**2:rearZ.reduce((s,r,i)=>s+r.r*abs(piston[i])**2,0),externalDrivePowerW=hornResult.ports.slice(n).reduce((s,p)=>s+p.drivePowerW,0),externalLoadPowerW=hornResult.ports.slice(n).reduce((s,p)=>s+p.passivePowerW,0),inputPowerW=sum('inputPowerW')+externalDrivePowerW,lossPowerW=sum('coilPowerW')+sum('mechanicalPowerW')+sum('frontLossW')+rearLossW+externalLoadPowerW,outputPowerW=hornResult.mouthPowerW+hornResult.throatPowerW,residualPowerW=inputPowerW-lossPowerW-outputPowerW,powerScale=Math.max(1e-20,Math.abs(inputPowerW),Math.abs(lossPowerW)+Math.abs(outputPowerW));
  if(Math.abs(residualPowerW)>powerScale*1e-6)throw Error('Coupled electrical/acoustic power balance failed.');
  return {available:true,frequencyHz,model:'Coupled motor / front two-port / axial horn / rear network',branches:rows,horn:hornResult,rearLossW,inputPowerW,lossPowerW,outputPowerW,residualPowerW,relativePowerResidual:residualPowerW/powerScale,assumptions:[...N.assumptions,'Motor Mms follows the catalog and includes free-air loading; coupling to spatial air requires an audited moving-mass convention.','Shared rear pressure is uniform. Rear radiation, circumferential interaction and full exterior fields are not solved.']};
 }catch(e){return {available:false,frequencyHz,reason:e.message};}
}
return {solve};
};
