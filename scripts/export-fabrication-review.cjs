/* Produce actual fabrication files plus independent point-classification targets. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),G=require('../exports/fabrication.cjs'),F=require('../exports/formats.cjs'),Z=require('../exports/zip.cjs');
const {context:c}=require('../tests/load-editor.cjs')(path.join(__dirname,'../index.html'));
(async()=>{
 const out=path.resolve(process.argv[2]);const d=JSON.parse(fs.readFileSync(process.argv[3]||path.join(__dirname,'../examples/offset-insert-study.json'),'utf8'));
 if(!process.argv[3]){d.state.compressionDriver='bcDcx464';d.state.frontFiller='none';d.state.count=2;d.fabrication={segment:false,includeRear:false,radialSegments:48};}
 const a=c.MEH.analyze(d.state),kit=await G.kit(a,d,{model:c.MEH,land:c.MEHMounting,formats:F});
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'MEH_fabrication.zip'),Z.create(kit.files));
 const g=c.MEH.frontAdapterGeometry(a),voidPoints=[];
 for(const pose of a.poses)for(let k=0;k<g.inner.length;k+=Math.max(1,Math.floor(g.inner.length/8))){const ring=g.inner[k],center=ring.reduce((a,p)=>a.map((v,i)=>v+p[i]/ring.length),[0,0,0]);voidPoints.push(Array.from(c.MEH.rotate(center,pose.a)));}
 for(const z of [-13,-9,-3,0,10,30])voidPoints.push([0,0,z]);
 const airProbeCount=voidPoints.length;
 for(const mount of kit.manifest.mounts){const t=mount.transform;for(const center of mount.spec.boltCenters)for(const fraction of [.1,.5,.9])voidPoints.push(t.origin.map((v,i)=>v+t.basisX[i]*center[0]+t.basisY[i]*center[1]+t.basisZ[i]*mount.spec.thicknessMM*fraction));}
 fs.writeFileSync(path.join(out,'void-probes.json'),JSON.stringify({voidPoints,airProbeCount,boltProbeCount:voidPoints.length-airProbeCount},null,2));
 console.log(JSON.stringify({parts:kit.manifest.parts.map(p=>({id:p.id,triangles:p.checks.triangleCount,volume:p.checks.volumeMM3})),probes:voidPoints.length,diagnostics:kit.manifest.diagnostics},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
