/* Build a portable exact-user-case review without changing repository starter. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),input=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]),d=JSON.parse(fs.readFileSync(input));
if(d.format!=='MEH-Lab-v2'||!d.state)throw Error('Expected saved MEH design.');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const literal=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const before='renderComparisons();clearDesign(false);';if(!html.includes(before))throw Error('Startup marker changed.');
const initialize=`applyState(${literal(d.state)},'Saved insert study · acoustic review','imported');workbenchPanel?.setOptions({voltageRms:${Number(d.acousticScreen?.options?.voltageRms)||1},distanceM:${Number(d.state.listeningDistance)||3},endCorrection:0});workbenchPanel?.setBrief(${literal(d.wizardBrief||null)});writeBrief(${literal(d.wizardBrief||{})});systemPanel?.setOptions(${literal(d.acousticScreen?.options||{})});$('#acousticWorkbench').open=true;`;
html=html.replace(before,()=>before+initialize);
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);for(const [i,s]of scripts.entries())new vm.Script(s,{filename:'portable-script-'+i});
if(crypto.createHash('sha256').update(scripts[4]).digest('hex')!==require('../driver-research/geometry-source-migration.json').currentGeometryScriptSHA256)throw Error('Geometry kernel changed.');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);console.log(JSON.stringify({output,sourceDesignSha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),htmlSha256:crypto.createHash('sha256').update(html).digest('hex'),verification:'All embedded scripts compile; reviewed catalogue geometry source hash. Browser-rendered QA unavailable.'},null,2));
