'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const load=require('../tests/load-editor.cjs'),sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const baselinePath=process.argv[2],candidatePath=process.argv[3]||path.join(__dirname,'../index.html'),output=process.argv[4];
if(!baselinePath)throw Error('Usage: node driver-research/verify-baseline.cjs BASELINE.html [CANDIDATE.html] [REPORT.json]');
const before=load(baselinePath),after=load(candidatePath),study=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/user-saved-study.json'),'utf8'));
const cases=[['saved-insert',study.state],['saved-open',{...study.state,frontFiller:'none'}]];
const report={baselineEditorSHA256:sha(before.html),candidateEditorSHA256:sha(after.html),baselineGeometryScriptSHA256:sha(before.scripts[4]),candidateGeometryScriptSHA256:sha(after.scripts[4]),cases:[],scope:'Exact canonical front-adapter/insert/horn/pose parity on stored research state only. This does not validate old compression nose coupling or qualify any changed acoustic operator. No native source hash is rewritten.'};
for(const [id,state]of cases){const a=before.context.MEH.analyze(state),b=after.context.MEH.analyze(state);const payload=(ctx,x)=>({normalizedState:x.p,frontAdapter:ctx.MEH.frontAdapterGeometry(x),horn:x.pro,poses:x.poses,frontVolumeCM3:x.frontV,pistonRadiusMM:x.pistonR,entryAreaMM2:x.area,frontFiller:x.frontFiller});const old=payload(before.context,a),next=payload(after.context,b);const components=Object.fromEntries(Object.keys(old).map(k=>[k,{baselineSHA256:sha(old[k]),candidateSHA256:sha(next[k]),identical:sha(old[k])===sha(next[k])}]));report.cases.push({id,components,allIdentical:Object.values(components).every(v=>v.identical),compression:{before:a.compressionDriver?.available,after:b.compressionDriver?.available,reason:b.compressionDriver?.unavailableReason}});}
report.passed=report.cases.every(c=>c.allIdentical);
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
