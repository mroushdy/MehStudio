// DOM behavior and portable-source checks. This is not rendered browser QA.
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Panel=require('../mesh-export/panel.cjs'),root=path.join(__dirname,'..');
function harness({getDesign=()=>({format:'MEH-Lab-v2',state:{mouth:720}}),buildJob=(design,options)=>({manifest:{designHash:'test'},design,options})}={}){
 const nodes=new Map(),saved=[],exportButton={events:{},addEventListener(event,fn){this.events[event]=fn;},removeEventListener(event,fn){if(this.events[event]===fn)delete this.events[event];}};
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',checked:false,disabled:false,hidden:false,textContent:'',attributes:{},events:{},setAttribute(key,value){this.attributes[key]=value;},addEventListener(event,fn){this.events[event]=fn;}});return nodes.get(selector);};
 node('[data-mx-frequency]').value='1000';node('[data-mx-density]').value='8';node('[data-mx-volume]').checked=Panel.defaults.volumeMesh;node('[data-mx-info]').hidden=true;
 const host={innerHTML:'',querySelector:node},panel=Panel.init(host,{getDesign,buildJob,save:(...args)=>saved.push(args),exportButton});
 return {host,node,panel,saved,exportButton};
}
test('frequency and density controls reject blank or nonphysical settings',()=>{
 assert.deepEqual(Panel.readOptions('1000','8',true),{maxFrequencyHz:1000,elementsPerWavelength:8,volumeMesh:true});
 for(const bad of ['',' ',0,99,10001,'bad','Infinity'])assert.throws(()=>Panel.readOptions(bad,8,true),/100 to 10,000/);
 for(const bad of ['',' ',0,5,21,6.5,'bad','Infinity'])assert.throws(()=>Panel.readOptions(1000,bad,true),/6 to 20/);
 assert.equal(Panel.readOptions(100,6,false).volumeMesh,false);
});
test('download reads the current design each time and retains native meshing settings',async()=>{
 let mouth=720,reads=0;const h=harness({getDesign:()=>{reads++;return {state:{mouth},systemAcoustics:{options:{voltageRms:1}}};}});
 await h.node('[data-mx-download]').events.click();assert.equal(reads,1);assert.equal(h.saved.length,1);
 assert.equal(h.saved[0][0],'MEH_acoustic_geometry.json');assert.equal(h.saved[0][2],'application/json');
 const first=JSON.parse(h.saved[0][1]);assert.equal(first.design.state.mouth,720);assert.equal(first.design.systemAcoustics.options.voltageRms,1);
 assert.deepEqual(first.options,Panel.defaults);assert.match(h.node('[data-mx-status]').textContent,/no response has been calculated/);
 mouth=740;h.node('[data-mx-frequency]').value='2000';h.node('[data-mx-density]').value='12';h.node('[data-mx-volume]').checked=false;
 h.exportButton.events.click();assert.equal(h.panel.job,null);await h.panel.run();
 const second=JSON.parse(h.saved[1][1]);assert.equal(second.design.state.mouth,740);assert.deepEqual(second.options,{maxFrequencyHz:2000,elementsPerWavelength:12,volumeMesh:false});
});
test('a blank control blocks export before geometry or design is read',async()=>{
 let reads=0,builds=0;const h=harness({getDesign:()=>{reads++;return {};},buildJob:()=>{builds++;return {manifest:{}};}});
 h.node('[data-mx-frequency]').value='';assert.equal(await h.panel.run(),null);assert.equal(reads,0);assert.equal(builds,0);assert.equal(h.saved.length,0);
 assert.match(h.node('[data-mx-status]').textContent,/Export unavailable: Enter a highest frequency/);assert.equal(h.node('[data-mx-status]').attributes['data-error'],'true');assert.equal(h.node('[data-mx-download]').disabled,false);
});
test('native geometry errors clear previous output and expose their exact reason as text',async()=>{
 let failure=false;const h=harness({buildJob:()=>{if(failure)throw Error('Rear reflex needs connected vent geometry.');return {manifest:{}};}});
 await h.panel.run();assert.ok(h.panel.job);failure=true;await h.panel.run();assert.equal(h.panel.job,null);assert.equal(h.saved.length,1);
 assert.equal(h.node('[data-mx-status]').textContent,'Export unavailable: Rear reflex needs connected vent geometry.');
});
test('one click cannot launch overlapping geometry exports',async()=>{
 let resolve,builds=0;const h=harness({buildJob:()=>{builds++;return new Promise(done=>resolve=done);}});
 const pending=h.panel.run();assert.equal(h.node('[data-mx-download]').disabled,true);assert.equal(await h.panel.run(),null);assert.equal(builds,1);resolve({manifest:{}});await pending;
 assert.equal(h.saved.length,1);assert.equal(h.node('[data-mx-download]').disabled,false);
});
test('information disclosure stays concise and reports expanded state',()=>{
 const h=harness();h.node('[data-mx-help]').events.click();assert.equal(h.node('[data-mx-info]').hidden,false);assert.equal(h.node('[data-mx-help]').attributes['aria-expanded'],'true');
 h.node('[data-mx-help]').events.click();assert.equal(h.node('[data-mx-info]').hidden,true);assert.equal(h.node('[data-mx-help]').attributes['aria-expanded'],'false');
 assert.match(h.host.innerHTML,/Independent inside and outside simulations/);assert.match(h.host.innerHTML,/requires review in AKABAK/);
 assert.match(h.host.innerHTML,/build_mesh\.py MEH_acoustic_geometry\.json --out/);assert.match(h.host.innerHTML,/href="https:\/\/github.com\/mroushdy\/MehStudio\/tree\/main\/mesh-export"/);assert.doesNotMatch(h.host.innerHTML,/<script[^>]+src=/);
 h.panel.dispose();assert.equal(h.exportButton.events.click,undefined);
});
test('portable HTML embeds reviewed modules while preserving existing script indices and count',()=>{
 const {source}=require('../mesh-export/embed.cjs'),{context,html,scripts}=require('./load-editor.cjs')();
 assert.equal(scripts.at(-1).slice(scripts.at(-1).indexOf('/* BEGIN ACOUSTIC MESH EXPORT */')),source());assert.match(scripts[11],/function designJSON\(\)\{flushPendingGeometry\(\)/);assert.match(scripts[12],/Optional measured-response workbench/);
 assert.match(scripts[13],/MEHResponse\.init/);assert.match(scripts[13],/BEGIN ACOUSTIC MESH EXPORT/);assert.equal(scripts.length,14);
 assert.equal((html.match(/id="meshExport"/g)||[]).length,1);assert.match(html,/<dialog id="exportDialog">[\s\S]*?<details id="meshExport"><\/details><\/dialog>/);
 context.document={getElementById:()=>null};vm.runInContext(scripts.at(-1),context);
 assert.equal(typeof context.MEHMeshGeometry.buildJob,'function');assert.equal(typeof context.MEHMeshExportPanel.init,'function');
});
test('embedded panel exports the exact saved design through canonical geometry',async()=>{
 const {context,scripts}=require('./load-editor.cjs')();context.document={getElementById:()=>null};vm.runInContext(scripts.at(-1),context);
 const design=JSON.parse(fs.readFileSync(path.join(root,'examples/offset-insert-study.json'),'utf8'));
 const h=harness({getDesign:()=>design,buildJob:context.MEHMeshGeometry.buildJob});const job=await h.panel.run();
 assert.ok(job,h.node('[data-mx-status]').textContent);assert.ok(job.manifest);assert.equal(h.saved.length,1);
 assert.equal(job.manifest.mesh_request.maximum_frequency_hz,1000);assert.equal(job.manifest.mesh_request.elements_per_wavelength,8);assert.equal(job.manifest.mesh_request.volume_mesh,false);
 assert.equal(job.manifest.drivers.length,4);assert.ok(job.manifest.drivers.every(driver=>driver.saved_voltage_rms===1));
 assert.equal(job.manifest.units.length,'m');assert.equal(job.manifest.axes.forward,'+Z');assert.equal(job.source_design.state.fillerOpening,design.state.fillerOpening);
 assert.ok(h.saved[0][1].length>1000);assert.ok(!/NaN|Infinity/.test(h.saved[0][1]));
});
