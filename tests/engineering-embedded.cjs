/* Execute the delivered single-file editor, including its embedded WASM bytes.
 * This is DOM/runtime verification; canvas is stubbed and no browser rendering is claimed. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {html,scripts}=require('./load-editor.cjs')();
function app(storage={}){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,downloads=[],network=[],errors=[];
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>o[k]||(()=>{})});
 w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.alert=s=>{throw Error(s);};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:embedded-test-'+downloads.length;};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 // A real browser exposes WebAssembly but has no Node process/require. Any
 // accidental network dependency makes this harness fail instead of fetching it.
 Object.defineProperty(w,'WebAssembly',{value:WebAssembly,configurable:true});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.fetch=async url=>{network.push(String(url));throw Error('Unexpected network fetch: '+url);};
 w.XMLHttpRequest=class{open(method,url){network.push(String(url));throw Error('Unexpected XHR: '+url);}};
 w.addEventListener('error',event=>{errors.push(event.error||event.message);event.preventDefault();});
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 for(let i=1;i<=10;i++)w.eval(scripts[i]);
 w.MEHScene=class{constructor(){this.gl=true;this.options={};}setModel(a){this.model=a;}fit(){}draw(){}project(p){return [p[0],p[1]];}};
 for(let i=11;i<=13;i++)w.eval(scripts[i]);
 const e=w.__MEH_EDITOR__,$=s=>w.document.querySelector(s),click=s=>$(s).click(),change=(s,type='change')=>$(s).dispatchEvent(new w.Event(type,{bubbles:true}));
 return {w,e,$,click,change,downloads,network,errors,import:async d=>$('#importFile').onchange({target:{files:[{text:async()=>JSON.stringify(d)}],value:'study.json'}}),close:()=>w.close()};
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('delivered editor mounts all three panels closed and keeps crossover/cardioid reachable in Simple',()=>{
 const h=app();try{
  assert.equal(h.$('#researchWorkspace').dataset.researchMode,'simple');
  for(const selector of ['#crossoverStudy','#cardioidStudy','#fabricationExport']){const panel=h.$(selector);assert.ok(panel,selector);assert.equal(panel.open,false,selector+' should start collapsed');assert.equal(panel.hidden,false,selector+' should not have a hidden flag');assert.ok(panel.querySelector('summary'),selector+' is initialized');}
  for(const selector of ['#crossoverStudy','#cardioidStudy'])assert.equal(h.$(selector).closest('[data-research-advanced]'),null,'new study does not require Advanced');
  assert.ok(h.$('#fabricationExport').closest('#exportDialog'),'fabrication lives with the export workflow');
  assert.equal(h.$('#responsePanel').hidden,true,'legacy duplicate stays hidden only after replacement initialization');
  assert.equal(typeof h.w.MEHCrossoverStudy.sum,'function');assert.equal(typeof h.w.MEHCardioid.solve,'function');assert.equal(typeof h.w.MEHFabrication.runtime,'function');assert.deepEqual(h.errors,[]);assert.deepEqual(h.network,[]);
 }finally{h.close();}
});
test('actual synthetic crossover traces survive named-study reload, JSON import and new-design reset',async()=>{
 let h=app();try{
  h.click('#crossoverStudy [data-cs-example]');assert.match(h.$('#crossoverStudy [data-cs-status]').textContent,/synthetic/);
  h.$('#crossoverStudy [data-cs-option="gainHighDb"]').value='-2';h.change('#crossoverStudy [data-cs-option="gainHighDb"]','input');h.click('#crossoverStudy [data-cs-freeze]');h.click('#crossoverStudy [data-cs-calculate]');
  const exported=plain(h.e.designJSON()),expected=exported.crossoverStudy;assert.equal(expected.options.gainHighDb,-2);assert.equal(expected.traces.mid.basis,'synthetic');assert.ok(expected.traces.mid.rows.length>100);assert.ok(expected.baselineMid);
  h.$('#variantName').value='Synthetic crossover persistence';h.click('#confirmSave');const stored=h.w.localStorage.getItem('meh-lab-variants-v2');assert.ok(stored.includes('generatedSynthetic'));assert.deepEqual(h.errors,[]);h.close();
  h=app({'meh-lab-variants-v2':stored});h.click('[data-load="0"]');assert.deepEqual(plain(h.e.designJSON().crossoverStudy),expected);h.click('#crossoverStudy [data-cs-calculate]');assert.match(h.$('#crossoverStudy [data-cs-status]').textContent,/synthetic/);assert.match(h.$('#crossoverStudy [data-cs-legend]').textContent,/Frozen/);
  h.click('#newDesign');let reset=h.e.designJSON().crossoverStudy;assert.equal(reset.traces.mid,null);assert.equal(reset.traces.high,null);assert.equal(reset.baselineMid,null);
  await h.import(exported);assert.deepEqual(plain(h.e.designJSON().crossoverStudy),expected);h.click('#crossoverStudy [data-cs-calculate]');assert.match(h.$('#crossoverStudy [data-cs-status]').textContent,/synthetic/);
  const old={...exported};delete old.crossoverStudy;await h.import(old);reset=h.e.designJSON().crossoverStudy;assert.equal(reset.traces.mid,null,'old designs cannot inherit prior response imports');assert.deepEqual(h.errors,[]);assert.equal(h.downloads.length,0);
 }finally{h.close();}
});
test('actual cardioid controls persist in the design without causing a file download',async()=>{
 const h=app();try{
  h.$('#cardioidStudy [data-cs-volume]').value='6';h.change('#cardioidStudy [data-cs-volume]');
  h.$('#cardioidStudy [data-cs-frequency]').value='80';h.change('#cardioidStudy [data-cs-frequency]');
  const saved=plain(h.e.designJSON());assert.equal(saved.cardioidStudy.config.rear.netVolumeM3,.006);assert.equal(saved.cardioidStudy.frequencyHz,80);assert.equal(h.downloads.length,0,'changing a setting must not call the file-saving callback');
  h.click('#newDesign');assert.equal(h.e.designJSON().cardioidStudy.config.rear.netVolumeM3,.008);
  await h.import(saved);assert.equal(h.$('#cardioidStudy [data-cs-volume]').value,'6');assert.equal(h.$('#cardioidStudy [data-cs-frequency]').value,'80');h.click('#cardioidStudy [data-cs-run]');assert.match(h.$('#cardioidStudy [data-cs-status]').textContent,/calculated/);assert.ok(!/NaN|Infinity/.test(h.$('#cardioidStudy [data-cs-polar]').innerHTML));assert.equal(h.downloads.length,0);assert.deepEqual(h.errors,[]);
 }finally{h.close();}
});
test('embedded fabrication WASM initializes without Node globals or network and computes a solid',async()=>{
 const h=app();try{
  assert.equal(h.w.process,undefined);assert.equal(h.w.require,undefined);assert.equal(typeof h.w.WebAssembly.instantiate,'function');assert.ok(h.w.MEHFabricationWasmBase64.length>100000);
  const engine=await h.w.MEHFabrication.runtime();const cube=engine.Manifold.cube(h.w.Array.of(2,3,4));try{assert.equal(cube.status(),'NoError');assert.ok(Math.abs(cube.volume()-24)<1e-8);}finally{cube.delete();}
  assert.deepEqual(h.network,[]);assert.deepEqual(h.errors,[]);assert.equal(h.downloads.length,0);
 }finally{h.close();}
});
test('named-study reload restores the sound-check context of a linked simulated mid capture',()=>{
 let h=app();try{
  const phases=Array.from({length:h.e.state.count},(_,i)=>i*15),fields={drive:'2.83',distance:'2',end:'.4',loss:'1.5',mass:'.1',phases:phases.join(', ')};
  for(const [name,value]of Object.entries(fields)){const selector='#acousticWorkbench [data-aw-'+name+']';h.$(selector).value=value;h.change(selector,'input');}
  const original=h.e.getBroadband();assert.equal(original.available,true,original.reason);assert.equal(original.options.voltageRms,2.83);assert.equal(original.options.distanceM,2);assert.deepEqual(plain(original.options.sourcePhasesDeg),phases);
  h.click('#crossoverStudy [data-cs-capture]');const captured=plain(h.e.designJSON().crossoverStudy.traces.mid);assert.equal(captured.basis,'simulated');assert.equal(captured.provenance.linkedGeometry,true);assert.equal(captured.provenance.stale,false);
  h.$('#variantName').value='Model with acoustic context';h.click('#confirmSave');const stored=h.w.localStorage.getItem('meh-lab-variants-v2');h.close();h=app({'meh-lab-variants-v2':stored});h.click('[data-load="0"]');
  const restored=h.e.getBroadband();assert.equal(restored.available,true,restored.reason);assert.deepEqual(plain(restored.options),plain(original.options));
  const loaded=plain(h.e.designJSON().crossoverStudy.traces.mid);assert.deepEqual(loaded.provenance.options,captured.provenance.options);assert.equal(loaded.provenance.stale,false);
  h.click('#crossoverStudy [data-cs-calculate]');assert.equal(h.e.designJSON().crossoverStudy.traces.mid.provenance.stale,false,'missing HF does not make a compatible restored mid stale');assert.doesNotMatch(h.$('#crossoverStudy [data-cs-status]').textContent,/earlier geometry or acoustic settings/);assert.deepEqual(h.errors,[]);
 }finally{h.close();}
});
test('browser-realm offline fabrication builds and serializes the complete serviceable prototype',async()=>{
 const h=app();try{
  const fs=require('node:fs'),path=require('node:path'),design=h.w.JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/fabrication-prototype-study.json'),'utf8'));
  design.fabrication.segment=false;design.fabrication.includeRear=true;design.fabrication.radialSegments=48;
  const analysis=h.w.MEH.analyze(design.state),result=await h.w.MEHFabrication.build(analysis,design);assert.equal(result.parts.length,5);
  assert.equal(result.parts.filter(p=>p.role==='horn-assembly').length,1);assert.equal(result.parts.filter(p=>p.role==='driver-support').length,2);assert.equal(result.parts.filter(p=>p.role==='rear-enclosure').length,2);
  assert.equal(result.diagnostics.airPassagesChecked,true);assert.equal(result.diagnostics.sourceBoltPassagesChecked,true);
  for(const part of result.parts){
   assert.ok(part.checks.volumeMM3>0,part.id);assert.equal(part.checks.closed,true,part.id);assert.equal(part.localMesh.closed,true,part.id);
   // Supply the mesh array from the browser's realm too: Manifold and exporter
   // wrappers deliberately see the same types as they do in the delivered app.
   const bytes=h.w.MEHFileFormats.stl(h.w.Array.of(part.localMesh)),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),triangles=view.getUint32(80,true);assert.equal(triangles,part.localMesh.faces.length);assert.equal(bytes.byteLength,84+50*triangles);assert.ok(triangles>0);
   let volume=0;const edges=new Map();
   for(let i=0;i<triangles;i++){const start=84+50*i;for(let field=0;field<12;field++)assert.ok(Number.isFinite(view.getFloat32(start+4*field,true)),part.id+' serialized float is finite');const vertices=[12,24,36].map(offset=>[0,4,8].map(j=>view.getFloat32(start+offset+j,true))),[a,b,c]=vertices;
    volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(let side=0;side<3;side++){const a=vertices[side].join(','),b=vertices[(side+1)%3].join(','),key=a<b?a+'|'+b:b+'|'+a;if(!edges.has(key))edges.set(key,[]);edges.get(key).push(a<b?1:-1);}
   }
   assert.ok(volume>0,part.id+' packed STL has positive volume');assert.ok(Math.abs(volume-part.checks.volumeMM3)/part.checks.volumeMM3<1e-5,part.id+' packed volume matches the solid');for(const directions of edges.values()){assert.equal(directions.length,2,part.id+' packed STL edge is closed');assert.equal(directions[0]+directions[1],0,part.id+' packed STL edge is consistently oriented');}
  }
  assert.deepEqual(h.network,[]);assert.deepEqual(h.errors,[]);assert.equal(h.downloads.length,0);
 }finally{h.close();}
});
