/* Real DOM interaction and generated artifact checks; not rendered browser or fabrication validation. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const {html,scripts}=require('./load-editor.cjs')();

function app(storage={}){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>o[k]||(()=>{})});w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.close=function(){};w.HTMLDialogElement.prototype.showModal=function(){};w.TextEncoder=TextEncoder;
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 for(let i=1;i<=10;i++)w.eval(scripts[i]);
 w.MEHScene=class{constructor(){this.gl=true;this.options={};}setModel(a){this.model=a;}fit(){}draw(){}project(p){return [p[0],p[1]];}};
 w.eval(scripts[11]);w.eval(scripts[12]);
 // Exercise the built offline file, including its licensed triangulator wrapper.
 w.eval(scripts[13]);
 const $=s=>w.document.querySelector(s),e=w.__MEH_EDITOR__,saved=[];
 const panel=w.MEHFileExportPanel.init($('#fileExports'),{getDesign:()=>e.designJSON(),onMountingChange:e.setMountingParts,exportButton:$('#export'),save:(...args)=>saved.push(args)}),mount=panel.mounting;
 function edit(selector,value){const el=$(selector);assert.ok(el,selector);if(el.type==='checkbox')el.checked=value;else el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));return el;}
 const field=(key,kind='mid')=>`[data-mount-field="${key}"][data-mount-kind="${kind}"]`;
 function apply(mid='bc6ndl38',compression='bcDcx464'){e.apply({...e.state,...w.MEH.drivers.mid[mid].parameters,midDriver:mid,compressionDriver:compression,throat:36},'Mounting test','imported');$('#export').click();}
 return {dom,w,$,e,edit,field,panel,mount,saved,apply,close:()=>w.close()};
}
test('mounting controls produce labelled previews and preserve exact dimensions in real CAD downloads',async()=>{
 const h=app();try{
  h.apply();assert.match(h.$('[data-mount-eligibility="mid"]').textContent,/available/);
  h.edit('[data-mount-enabled="mid"]',true);h.edit('[data-mount-enabled="compression"]',true);h.edit(h.field('thicknessMM'),8);
  assert.equal(h.mount.result.errors.length,0,h.mount.result.errors.join(' '));assert.equal(h.mount.result.parts.length,h.e.state.count+1);
  const svg=h.$('[data-mount-preview-kind="mid"]');assert.ok(svg);assert.equal(svg.getAttribute('role'),'img');assert.ok(svg.querySelector('title'));assert.ok(svg.querySelector('path').getAttribute('d').length>1000);assert.doesNotMatch(svg.outerHTML,/NaN|undefined|Infinity/);
  for(const el of h.$('[data-ex-mounting]').querySelectorAll('input'))assert.ok(el.closest('label')?.textContent.trim(),'every mounting control is labelled');
  const kit=await h.mount.download();assert.ok(kit);assert.equal(h.saved[0][0],'MEH_mounting_parts.zip');assert.equal(h.saved[0][2],'application/zip');assert.equal(h.saved[0][1][0],80);assert.equal(h.saved[0][1][1],75);
  const files=Object.keys(kit.files);assert.ok(files.some(p=>p.endsWith('.stl')));assert.ok(files.some(p=>p.endsWith('.step')));assert.ok(files.some(p=>p.endsWith('.obj')));assert.equal(kit.result.parts[0].spec.thicknessMM,8);assert.equal(kit.result.settings.mid.driverId,'bc6ndl38');
  const step=kit.files['MEH-mounting/'+kit.manifest.parts[0].local_step];assert.match(step,/FACETED_BREP/);assert.match(step,/CLOSED_SHELL/);
  const handoff=await h.panel.run(true);assert.ok(handoff);assert.ok(Object.keys(handoff.files).some(p=>p.includes('mount')&&p.endsWith('.stl')));assert.equal(h.saved[1][0],'MEH_CAD_handoff.zip');
 }finally{h.close();}
});
test('empty and invalid mounting values survive persistence and block downloads without stale previews',async()=>{
 const h=app();try{
  h.apply();h.edit('[data-mount-enabled="mid"]',true);assert.ok(h.mount.result.parts.length);
  h.edit(h.field('thicknessMM'),'');assert.equal(h.e.designJSON().mountingParts.mid.thicknessMM,null);assert.equal(h.$('[data-mount-download]').disabled,true);assert.equal(h.$('[data-mount-preview-kind="mid"]'),null);assert.match(h.$('[data-mount-status]').textContent,/positive number/);
  assert.equal(await h.mount.download(),undefined);assert.equal(h.saved.length,0);
  h.$('#export').click();assert.equal(h.$(h.field('thicknessMM')).value,'');
  h.edit(h.field('thicknessMM'),-1);assert.equal(h.e.designJSON().mountingParts.mid.thicknessMM,-1);assert.equal(h.$('[data-mount-download]').disabled,true);
  h.edit(h.field('thicknessMM'),6);h.edit(h.field('boltHoleDiameterMM'),80);assert.equal(h.$('[data-mount-download]').disabled,true);assert.match(h.$('[data-mount-status]').textContent,/bolt hole/i);
 }finally{h.close();}
});
test('optional bolt-head recesses update the preview and saved solid, and invalid depths block export',async()=>{
 const h=app();try{
  h.apply();h.edit('[data-mount-enabled="mid"]',true);const original=h.$('[data-mount-preview-kind="mid"] path').getAttribute('d');
  h.edit(h.field('counterboreDiameterMM'),10);assert.equal(h.$('[data-mount-download]').disabled,true);h.edit(h.field('counterboreDepthMM'),2);
  assert.equal(h.mount.result.errors.length,0,h.mount.result.errors.join(' '));assert.notEqual(h.$('[data-mount-preview-kind="mid"] path').getAttribute('d'),original);
  const design=h.e.designJSON();assert.equal(design.mountingParts.mid.counterboreDiameterMM,10);assert.equal(design.mountingParts.mid.counterboreDepthMM,2);
  const kit=await h.mount.download();assert.equal(kit.result.parts[0].spec.counterboreDepthMM,2);
  h.edit(h.field('counterboreDepthMM'),6);assert.equal(h.$('[data-mount-download]').disabled,true);assert.equal(h.$('[data-mount-preview-kind="mid"]'),null);
  h.edit(h.field('counterboreDepthMM'),0);h.edit(h.field('counterboreDiameterMM'),0);assert.equal(h.mount.result.errors.length,0);assert.equal(h.$('[data-mount-preview-kind="mid"] path').getAttribute('d'),original);
 }finally{h.close();}
});
test('measured dimensions require current-driver confirmation and are cleared when that driver changes',()=>{
 const h=app();try{
  h.apply('daytondma80_4');h.edit('[data-mount-enabled="mid"]',true);assert.equal(h.$('[data-mount-download]').disabled,true);assert.match(h.$('[data-mount-eligibility="mid"]').textContent,/unavailable/i);
  h.edit('[data-mount-measured="mid"]',true);
  const values={cutoutDiameterMM:72,outerDiameterMM:90,boltCircleDiameterMM:82,boltCount:4,startAngleDeg:45,mountOffsetMM:3};
  for(const [key,value]of Object.entries(values))h.edit(`[data-mount-override="${key}"][data-mount-kind="mid"]`,value);
  h.edit(h.field('boltHoleDiameterMM'),4);h.edit('[data-mount-note="mid"]','Measured test fixture, exact DMA80-4');assert.equal(h.$('[data-mount-download]').disabled,true);
  h.edit('[data-mount-confirm="mid"]',true);assert.equal(h.mount.result.errors.length,0,h.mount.result.errors.join(' '));assert.ok(h.$('[data-mount-preview-kind="mid"]'));assert.equal(h.e.designJSON().mountingParts.mid.override.driverId,'daytondma80_4');
  h.edit('[data-mount-override="outerDiameterMM"][data-mount-kind="mid"]',92);assert.equal(h.$('[data-mount-confirm="mid"]').checked,false);assert.equal(h.$('[data-mount-download]').disabled,true);h.edit('[data-mount-confirm="mid"]',true);
  h.apply('daytondma80_8');const changed=h.e.designJSON().mountingParts.mid;assert.equal(changed.driverId,'daytondma80_8');assert.equal(changed.enabled,false);assert.equal(changed.override,undefined);assert.equal(h.$('[data-mount-enabled="mid"]').checked,false);assert.equal(h.$('[data-mount-measured="mid"]').checked,false);assert.equal(h.$('[data-mount-download]').disabled,true);
  h.apply('daytondma80_4');assert.equal(h.e.designJSON().mountingParts.mid.override,undefined);assert.equal(h.e.designJSON().mountingParts.mid.enabled,false);
 }finally{h.close();}
});
test('mounting survives named studies, JSON import and reload; old studies and new-design reset disable it',async()=>{
 let h=app();try{
  h.apply();h.edit('[data-mount-enabled="mid"]',true);h.edit(h.field('thicknessMM'),9);const design=JSON.parse(JSON.stringify(h.e.designJSON()));
  h.$('#variantName').value='My mounts';h.$('#confirmSave').click();const saved=h.w.localStorage.getItem('meh-lab-variants-v2');assert.equal(JSON.parse(saved)[0].mountingParts.mid.thicknessMM,9);h.close();
  h=app({'meh-lab-variants-v2':saved,'meh-experimental-notice-seen':'1'});h.$('[data-load="0"]').click();h.$('#export').click();assert.equal(h.$(h.field('thicknessMM')).value,'9');assert.equal(h.$('[data-mount-enabled="mid"]').checked,true);
  const importDesign=async d=>h.$('#importFile').onchange({target:{files:[{text:async()=>JSON.stringify(d)}],value:'study.json'}});
  h.edit(h.field('thicknessMM'),12);await importDesign(design);h.$('#export').click();assert.equal(h.$(h.field('thicknessMM')).value,'9');assert.equal(h.e.designJSON().mountingParts.mid.enabled,true);
  const old={...design};delete old.mountingParts;await importDesign(old);h.$('#export').click();assert.equal(h.$('[data-mount-enabled="mid"]').checked,false);assert.equal(h.e.designJSON().mountingParts.mid.enabled,false);
  await importDesign(design);h.$('#newDesign').click();h.$('#export').click();assert.equal(h.$('[data-mount-enabled="mid"]').checked,false);assert.equal(h.w.localStorage.getItem('meh-experimental-notice-seen'),'1');
 }finally{h.close();}
});
