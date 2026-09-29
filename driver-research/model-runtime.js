/* Offline, dependency-free mechanical primitives. Units: mm. Appearance meshes are not manufacturing solids. */
(function(root){'use strict';
const TAU=Math.PI*2;
const area=loop=>loop.reduce((s,p,i)=>s+p[0]*loop[(i+1)%loop.length][1]-loop[(i+1)%loop.length][0]*p[1],0);
function sampleLoop(loop,n){
 if(!Array.isArray(loop)||loop.length<3)throw Error('A mechanical outline needs at least three points.');
 const ccw=area(loop)<0?loop.slice().reverse():loop;
 const lens=ccw.map((p,i)=>Math.hypot(p[0]-ccw[(i+1)%ccw.length][0],p[1]-ccw[(i+1)%ccw.length][1])),total=lens.reduce((a,b)=>a+b,0);
 if(!(total>0))throw Error('A mechanical outline must have nonzero perimeter.');
 return Array.from({length:n},(_,i)=>{let t=i*total/n,k=0;while(k<lens.length-1&&t>lens[k])t-=lens[k++];let a=ccw[k],b=ccw[(k+1)%ccw.length],f=lens[k]?t/lens[k]:0;return[a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])];});
}
// Weld axis/seam duplicates and remove zero-area pole faces. This is mesh
// housekeeping, not dimensional tolerance or a manufacturing-solid claim.
function clean(vertices,faces){
 const out=[],map=new Map(),indices=vertices.map(v=>{if(!v.every(Number.isFinite))throw Error('Nonfinite mechanical vertex.');let key=v.map(x=>Math.round(x*1e9)).join(',');if(!map.has(key)){map.set(key,out.length);out.push(v);}return map.get(key);});
 const valid=faces.map(f=>f.map(i=>indices[i])).filter(f=>{if(new Set(f).size<3)return false;const[a,b,c]=f.map(i=>out[i]),u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12;});
 return {vertices:out,faces:valid};
}
function primitive(part,segments=64){
 segments=Math.max(12,Math.min(512,Math.round(segments)||64));
 const p=part.params,vertices=[],faces=[],add=v=>(vertices.push(v),vertices.length-1),quad=(a,b,c,d)=>faces.push([a,b,c],[a,c,d]);
 function lathe(profile,closed){for(const [r,z]of profile)for(let i=0;i<segments;i++)add([r*Math.cos(TAU*i/segments),r*Math.sin(TAU*i/segments),z]);const k=closed?profile.length:profile.length-1;for(let j=0;j<k;j++)for(let i=0;i<segments;i++){let nj=(j+1)%profile.length,ni=(i+1)%segments;quad(j*segments+i,j*segments+ni,nj*segments+ni,nj*segments+i);}}
 if(part.type==='lathe')lathe(p.profile,p.closed);
 else if(part.type==='ring')lathe([[p.outerRadius,p.z],[p.outerRadius,p.z+p.depth],[p.innerRadius,p.z+p.depth],[p.innerRadius,p.z]],true);
 else if(part.type==='cylinder'){lathe([[0,p.z],[p.radius,p.z],[p.radius,p.z+p.depth],[0,p.z+p.depth]],true);if(p.center)for(const v of vertices){v[0]+=p.center[0];v[1]+=p.center[1];}}
 else if(part.type==='bolt-pattern'){
  // A guide locates a threaded axis or clearance hole; it does not subtract a
  // hole from a frame or assert that nominal thread size is a drill diameter.
  for(let i=0;i<p.count;i++){let a=TAU*i/p.count+(p.startAngleDeg||0)*Math.PI/180,c=[Math.cos(a)*p.circleDiameter/2,Math.sin(a)*p.circleDiameter/2];let m=primitive({type:'ring',params:{outerRadius:p.holeDiameter/2,innerRadius:Math.max(0,p.holeDiameter/2-.5),z:p.z,depth:p.depth}},24),off=vertices.length;vertices.push(...m.vertices.map(v=>[v[0]+c[0],v[1]+c[1],v[2]]));faces.push(...m.faces.map(f=>f.map(j=>j+off)));}
 }else if(part.type==='extruded-outline'){
  const out=sampleLoop(p.outline,segments),holes=p.holes||[];
  if(holes.length>1)throw Error('Multiple-hole outlines require a triangulator; refusing incomplete geometry.');
  if(holes.length===1){
   let inner=sampleLoop(holes[0],segments),start=0,best=Infinity;
   for(let j=0;j<segments;j++){const angle=Math.atan2(inner[j][1],inner[j][0])-Math.atan2(out[0][1],out[0][0]),d=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));if(d<best){best=d;start=j;}}
   inner=inner.map((_,j)=>inner[(j+start)%segments]);
   for(const z of[p.z,p.z+p.depth]){out.forEach(v=>add([...v,z]));inner.forEach(v=>add([...v,z]));}
   for(let i=0;i<segments;i++){let j=(i+1)%segments;quad(i,segments+i,segments+j,j);quad(2*segments+i,2*segments+j,3*segments+j,3*segments+i);quad(i,j,2*segments+j,2*segments+i);quad(segments+i,3*segments+i,3*segments+j,segments+j);}
  }else{
   // Catalogue no-hole outlines are convex terminal blocks. Reject concavity
   // instead of silently filling an arbitrary polygon with an invalid fan.
   let sign=0;for(let i=0;i<p.outline.length;i++){const a=p.outline[i],b=p.outline[(i+1)%p.outline.length],c=p.outline[(i+2)%p.outline.length],x=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(x)>1e-9){if(sign&&Math.sign(x)!==sign)throw Error('Concave solid outline requires triangulation.');sign=Math.sign(x);}}
   for(const z of[p.z,p.z+p.depth])out.forEach(v=>add([...v,z]));
   for(let i=0;i<segments;i++)quad(i,(i+1)%segments,(i+1)%segments+segments,i+segments);
   const cx=out.reduce((s,v)=>s+v[0],0)/segments,cy=out.reduce((s,v)=>s+v[1],0)/segments,a=add([cx,cy,p.z]),b=add([cx,cy,p.z+p.depth]);
   for(let i=0;i<segments;i++){let j=(i+1)%segments;faces.push([a,j,i],[b,i+segments,j+segments]);}
  }
 }else throw Error('Unsupported mechanical primitive: '+part.type);
 return {...clean(vertices,faces),metadata:{name:part.name,status:part.status,sourceIds:part.sourceIds||[],dimensionRefs:part.dimensionRefs||[],notes:part.notes,primitive:part.type,displayRole:part.displayRole||null}};
}
function makeModel(record,opts={}){
 const meshes=record.geometry.parts.filter(p=>(opts.envelopes!==false||p.status!=='envelope')&&(opts.appearance!==false||p.status!=='approximate')).map(p=>primitive(p,opts.segments||64));
 let bounds=null;for(const m of meshes)for(const v of m.vertices){if(!bounds)bounds={min:v.slice(),max:v.slice()};else for(let i=0;i<3;i++){bounds.min[i]=Math.min(bounds.min[i],v[i]);bounds.max[i]=Math.max(bounds.max[i],v[i]);}}
 return{id:record.id,units:'mm',datum:record.geometry.datum,modelStatus:record.modelStatus,meshes,bounds,unresolved:record.unresolved};
}
function obj(record,opts={}){let m=makeModel(record,opts),lines=['# '+record.name,'# millimetres; '+record.geometry.datum,'# Appearance/envelope model. Not a manufacturing solid.'],offset=1;for(const mesh of m.meshes){lines.push('o '+mesh.metadata.name.replace(/[^a-zA-Z0-9]/g,'_'),'# status='+mesh.metadata.status+'; sources='+mesh.metadata.sourceIds.join(','));for(const v of mesh.vertices)lines.push('v '+v.map(x=>x.toFixed(5)).join(' '));for(const f of mesh.faces)lines.push('f '+f.map(i=>i+offset).join(' '));offset+=mesh.vertices.length;}return lines.join('\n');}
const api={primitive,makeModel,exportOBJ:obj,records:root.MEH_DRIVER_RECORDS||[]};root.DriverModels=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
