/* Reconstruct a local pressure slice from unit-flow FEM fields and the
 * actual coupled motor/horn solution. Never reuse a reference-load image.
 */
module.exports=function createPressureField(T){
function combine(a,result,data,basis){
 try{
  const check=T.validate(data,a,result?.options);if(!check.available)throw Error(check.reason);
  if(!result?.available||!result.spatial||basis?.schemaVersion!==1||basis.matchingPortResponseQualified!==true||basis.basisUnits!=='Pa per (m3/s RMS INTO the named port)')throw Error('No matching spatial pressure basis.');
  for(const key of ['geometrySourceSha256','userDesignSha256','airSurfaceSha256','meshSha256'])if(basis[key]!==data[key])throw Error('Pressure basis belongs to a different spatial solve.');
  if(!result.inputState||Object.keys(result.inputState).some(key=>!['frequency','excursion'].includes(key)&&result.inputState[key]!==a.p[key]))throw Error('Coupled result is stale for these design inputs.');
  if(result.source?.meshSha256!==data.meshSha256)throw Error('Coupled result uses a different spatial matrix.');
  const row=result.rows.find(r=>r.frequencyHz===basis.frequencyHz&&r.available),native=data.rows.find(r=>r.frequencyHz===basis.frequencyHz&&r.available&&r.qualified);
  if(!row||!native)throw Error('No qualified coupled result at the field frequency.');
  if(basis.conventions?.time!=='exp(+j omega t)'||basis.conventions.amplitude!=='RMS'||basis.conventions.flow!=='m3/s INTO local air domain'||basis.ports?.coneProjectedAreaM2!==data.coneProjectedAreaM2)throw Error('Pressure basis convention or cone area mismatch.');
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){const v=native.impedance[i][j],b=basis.impedance?.[i]?.[j];if(!b||!Number.isFinite(b.r)||!Number.isFinite(b.i)||Math.hypot(v.r-b.r,v.i-b.i)>1e-9*Math.max(1,Math.hypot(v.r,v.i)))throw Error('Pressure basis matrix does not match the qualified matrix.');}
  const x=basis.xM,z=basis.zM,indices=basis.validFlatIndices,fields=basis.basis;
  if(![x,z].every(axis=>Array.isArray(axis)&&axis.length>=2&&axis.length<=2000&&axis.every((v,i)=>Number.isFinite(v)&&(!i||v>axis[i-1]))))throw Error('Invalid field sampling axes.');
  if(x.length*z.length>1000000||!Array.isArray(indices)||!indices.length||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=x.length*z.length))throw Error('Invalid field sample indices.');
  if(!Array.isArray(fields)||fields.length!==2||fields.some((f,i)=>f.portIndex!==i||['pressureRealPaPerM3S','pressureImagPaPerM3S'].some(key=>!Array.isArray(f[key])||f[key].length!==indices.length||!f[key].every(Number.isFinite))))throw Error('Invalid unit-flow field samples.');
  const b=row.branches[0],q=[{r:b.pistonFlow.r*check.areaRatio,i:b.pistonFlow.i*check.areaRatio},{r:-b.entryFlow.r,i:-b.entryFlow.i}],pressure=indices.map((_,k)=>{
   let r=0,i=0;for(let j=0;j<2;j++){const pr=fields[j].pressureRealPaPerM3S[k],pi=fields[j].pressureImagPaPerM3S[k];r+=q[j].r*pr-q[j].i*pi;i+=q[j].r*pi+q[j].i*pr;}return {r,i,magnitude:Math.hypot(r,i)};
  });
  if(pressure.some(p=>!Number.isFinite(p.magnitude)))throw Error('Nonfinite coupled pressure field.');
  return {available:true,frequencyHz:basis.frequencyHz,voltageRms:result.voltageRms,branchId:b.id,xM:x,zM:z,indices,pressure,maxPressurePa:Math.max(...pressure.map(p=>p.magnitude)),pointwiseConverged:basis.pointwiseFieldConvergenceAssessed===true};
 }catch(e){return {available:false,reason:e.message};}
}
function svg(field){
 if(!field?.available)return '';
 const W=680,H=335,L=55,R=660,T=30,B=250,nx=field.xM.length,nz=field.zM.length,x0=field.xM[0],x1=field.xM.at(-1),z0=field.zM[0],z1=field.zM.at(-1),x=v=>L+(v-x0)/(x1-x0)*(R-L),y=v=>B-(v-z0)/(z1-z0)*(B-T),dx=(R-L)/(nx-1),dy=(B-T)/(nz-1),max=Math.max(1e-12,field.maxPressurePa),paths=Array.from({length:64},()=>'');
 const stops=[[22,45,61],[34,125,145],[146,197,176],[241,215,131]],color=t=>{const u=t*3,k=Math.min(2,Math.floor(u)),f=u-k;return 'rgb('+stops[k].map((v,i)=>Math.round(v+(stops[k+1][i]-v)*f)).join(',')+')';};
 field.indices.forEach((index,k)=>{const ix=index%nx,iz=Math.floor(index/nx),bucket=Math.min(63,Math.floor(field.pressure[k].magnitude/max*63));paths[bucket]+=`M${(x(field.xM[ix])-dx/2).toFixed(2)},${(y(field.zM[iz])-dy/2).toFixed(2)}h${dx.toFixed(2)}v${dy.toFixed(2)}h-${dx.toFixed(2)}z`;});
 let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"><title>Pressure magnitude in one front passage at ${field.frequencyHz} Hz, ${field.voltageRms} V RMS per mid</title><desc>Local center section. Pressure magnitude in pascals RMS under the coupled horn load. White areas are outside the sampled air. Pointwise field convergence is not established.</desc><rect x="${L}" y="${T}" width="${R-L}" height="${B-T}" fill="white"/>`;
 paths.forEach((d,i)=>{if(d)out+=`<path d="${d}" fill="${color(i/63)}"/>`;});
 for(let i=0;i<=4;i++){const xx=x0+(x1-x0)*i/4;out+=`<text x="${x(xx)}" y="${B+18}" text-anchor="middle">${(xx*1000).toFixed(0)}</text>`;}
 for(let i=0;i<=3;i++){const zz=z0+(z1-z0)*i/3;out+=`<text x="${L-8}" y="${y(zz)+4}" text-anchor="end">${(zz*1000).toFixed(0)}</text>`;}
 out+='<text x="5" y="17">Axial position (mm)</text><text x="660" y="288" text-anchor="end">Across passage (mm)</text>';
 for(let i=0;i<64;i++)out+=`<rect x="${L+i*3}" y="297" width="3.1" height="9" fill="${color(i/63)}"/>`;
 return out+`<text x="${L}" y="322">0</text><text x="${L+200}" y="306">${field.maxPressurePa.toFixed(2)} Pa RMS</text><text x="660" y="17" text-anchor="end">${field.frequencyHz} Hz · ${field.voltageRms} V RMS per mid</text></svg>`;
}
return {combine,svg};
};
