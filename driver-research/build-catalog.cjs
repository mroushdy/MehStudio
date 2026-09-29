/* Rebuild only the catalogue, primitives and their integration in the offline editor. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),file=path.resolve(process.argv[2]||path.join(root,'index.html'));
const json=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));
const records=fs.readdirSync(path.join(__dirname,'records')).filter(f=>f.endsWith('.json')).sort().map(f=>json('records/'+f));
const motors=Object.assign({},...['motors.json','motor-additions.json','new-motors.json'].filter(f=>fs.existsSync(path.join(__dirname,f))).map(json));
const packed=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const catalog=fs.readFileSync(path.join(__dirname,'catalog-runtime.js'),'utf8').replace('/* CATALOG_RECORDS */[]',()=>packed(records)).replace('/* CATALOG_MOTORS */{}',()=>packed(motors));
let html=fs.readFileSync(file,'utf8');
function block(start,end,replacement){const a=html.indexOf(start),b=html.indexOf(end,a);if(a<0||b<0)throw Error('Catalogue integration marker missing: '+start);html=html.slice(0,a)+replacement+html.slice(b);}
block('/* Inspected manufacturer driver catalogue','</script>',catalog);
block('/* Offline, dependency-free mechanical primitives.','</script>',fs.readFileSync(path.join(__dirname,'model-runtime.js'),'utf8'));
block('// Optional full inspected catalogue.','const midMechanicalKeys=',fs.readFileSync(path.join(__dirname,'editor-integration.js'),'utf8'));
block('const midMechanicalKeys=','function driverModel(',fs.readFileSync(path.join(__dirname,'mechanical-match.js'),'utf8'));
block('function driverModel(','const specs=',fs.readFileSync(path.join(__dirname,'driver-model-selection.js'),'utf8'));
// Preserve supported catalogue values when driver selection passes through the
// editor's general control bounds (e.g. a 10-inch model with Vas above 40 L).
const rangeMarker='// Catalogue values must survive editor normalization.';
const ranges=`${rangeMarker}\nfor(const d of Object.values(drivers.mid))if(d.available!==false)for(const [key,value]of Object.entries(d.parameters)){const range=specs[key];if(range&&Number.isFinite(value)&&value>0){range[0]=Math.min(range[0],value);range[1]=Math.max(range[1],value);}}\n`;
if(html.includes(rangeMarker))block(rangeMarker,'function normalize(input={})',ranges);
else html=html.replace('function normalize(input={})',ranges+'function normalize(input={})');
const acousticOld='for(const [id,motor] of Object.entries(reviewedCatalog?.motors||{}))catalog[id]={...motor};';
const acousticNew='for(const [id,motor] of Object.entries(reviewedCatalog?.motors||{}))if(reviewedCatalog.motorEligibility(reviewedCatalog.byId[id],motor).available)catalog[id]={...motor};';
if(html.includes(acousticOld))html=html.replace(acousticOld,acousticNew);
else if(!html.includes(acousticNew))throw Error('Acoustic motor integration marker missing.');
const displayOld="if(guide(part)||hasAppearance&&part.metadata.status==='envelope')continue;";
const displayNew="if(guide(part)||hasAppearance&&part.metadata.status==='envelope'&&part.metadata.displayRole==='clearance-only')continue;";
if(html.includes(displayOld))html=html.replace(displayOld,displayNew);
else if(!html.includes(displayNew))throw Error('Driver display integration marker missing.');
const mountingOld="['driverDepth','depth']";
const mountingNew="['driverDepth',r.dimensions.packagingEnvelopeDepth?'packagingEnvelopeDepth':'depth']";
if(html.includes(mountingOld))html=html.replace(mountingOld,mountingNew);
else if(!html.includes(mountingNew))throw Error('Mounting depth match marker missing.');
fs.writeFileSync(file,html);
console.log(`Embedded ${records.length} records and ${Object.keys(motors).length} reviewed motor entries in ${path.basename(file)}`);
