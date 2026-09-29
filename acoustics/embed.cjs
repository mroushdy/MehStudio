/* Keep the portable single-file editor synchronized with reviewed modules. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.join(__dirname,'..'),file=path.join(root,'index.html');
const modules=[['research-view','MEHResearchView','root'],['multiport-network','MEHMultiport','root.MEHHornAcoustics'],['coupled-system','MEHCoupledSystem','root.MEH,root.MEHAcoustics,root.MEHMultiport'],['spatial-study','MEHSpatialStudy','root.MEH,root.MEHCoupledSystem'],['pressure-field','MEHPressureField','root.MEHSpatialStudy'],['system-panel','MEHSystemPanel','root'],['broadband-engine','MEHBroadband','root.MEH,root.MEHAcoustics,root.MEHMultiport,root.MEHCoupledSystem'],['assisted-flow','MEHAssistedFlow','root.MEH,root.MEHAcoustics,root.MEHDesignOptimizer,root.MEHBroadband'],['assisted-panel','MEHAssistedPanel','root'],['workbench-panel','MEHWorkbenchPanel','root'],['geometry-manifest','MEHGeometryManifest','root.MEH'],['spatial-motor-network','MEHSpatialMotorNetwork','root.MEH,root.MEHAcoustics,root.MEHMultiport']];
let code='/* BEGIN COUPLED SYSTEM */\n(function(root){\n';
for(const [name,global,args]of modules)code+='root.'+global+'=('+fs.readFileSync(path.join(__dirname,name+'.cjs'),'utf8').replace('module.exports=','').trim().replace(/;$/,'')+')('+args+');\n';
for(const [name,key]of [['current-insert','MEHSpatialResults'],['open-baseline','MEHSpatialBaseline'],['insert-pressure-basis-700','MEHPressureBasis']]){
 const dataPath=path.join(root,'acoustics/data/'+name+'.json');
 if(fs.existsSync(dataPath))code+='root.'+key+'='+JSON.stringify(JSON.parse(fs.readFileSync(dataPath,'utf8'))).replace(/</g,'\\u003c')+';\n';
}
code+='})(typeof globalThis!=="undefined"?globalThis:this);\n/* END COUPLED SYSTEM */';
let html=fs.readFileSync(file,'utf8');
const optimizer='/* Bounded, reproducible acoustic screening from independent Assisted goals. Never a field-solver optimum. */\nwindow.MEHDesignOptimizer=('+fs.readFileSync(path.join(__dirname,'design-optimizer.cjs'),'utf8').replace('module.exports=','').trim().replace(/;$/,'' )+')(window.MEH,window.MEHAcoustics);';
html=html.replace(/\/\* Bounded, reproducible acoustic screening from independent Assisted goals\.[\s\S]*?(?=<\/script>)/,()=>optimizer);

const geometry=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)][4][1];
if(crypto.createHash('sha256').update(geometry).digest('hex')!=='cb1b9bebd9ff0f155f9a20dd4db4d707f4ef9666cce444b8141586ce626964ec')throw Error('Geometry implementation changed. Recalculate spatial data and update its provenance before embedding.');
if(html.includes('/* BEGIN COUPLED SYSTEM */'))html=html.replace(/\/\* BEGIN COUPLED SYSTEM \*\/[\s\S]*?\/\* END COUPLED SYSTEM \*\//,()=>code);
else html=html.replace('/* END FRONT CHAMBER STUDY */','/* END FRONT CHAMBER STUDY */\n'+code);
fs.writeFileSync(file,html);
