/* Exercise saved user workflows across the editor boundary; no rendered browser claim. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {html,scripts}=require('./load-editor.cjs')();
function app(storage={}){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>o[k]||(()=>{})});
 w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.alert=s=>{throw Error(s);};
 w.HTMLDialogElement.prototype.close=function(){};w.HTMLDialogElement.prototype.showModal=function(){};
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 for(let i=1;i<=10;i++)w.eval(scripts[i]);
 w.MEHScene=class{constructor(){this.gl=true;this.options={};}setModel(a){this.model=a;}fit(){}draw(){}project(p){return [p[0],p[1]];}};
 w.eval(scripts[11]);
 const e=w.__MEH_EDITOR__,$=s=>w.document.querySelector(s),panels={};
 for(const key of ['fabrication','crossoverStudy','cardioidStudy']){let value=null;panels[key]={get snapshot(){return value;},restore(v){value=v;},update(a){this.geometry=a.p;},set(v){value=v;e.setEngineeringStudy(key,v);}};e.registerStudy(key,panels[key]);}
 return {w,e,$,panels,import:async d=>$('#importFile').onchange({target:{files:[{text:async()=>JSON.stringify(d)}],value:'study.json'}}),close:()=>w.close()};
}
test('engineering studies retain imported rows and print settings through JSON and named-study reloads',async()=>{
 let h=app();try{
  const data={fabrication:{buildVolume:[200,200,250],pins:true},crossoverStudy:{mid:{rows:[{f:100,db:90,phase:-25},{f:200,db:91,phase:-45}]},settings:{delayHighMs:.4}},cardioidStudy:{material:{rows:[{f:100,re:200,im:30},{f:200,re:230,im:60}]},rearVolumeL:3}};
  for(const [key,value]of Object.entries(data))h.panels[key].set(value);
  const exported=JSON.parse(JSON.stringify(h.e.designJSON()));
  for(const key of Object.keys(data))assert.deepEqual(exported[key],data[key]);
  h.$('#variantName').value='Complete prototype';h.$('#confirmSave').click();const stored=h.w.localStorage.getItem('meh-lab-variants-v2');h.close();
  h=app({'meh-lab-variants-v2':stored});h.$('[data-load="0"]').click();
  for(const key of Object.keys(data))assert.deepEqual(JSON.parse(JSON.stringify(h.e.designJSON()[key])),data[key]);
  h.e.apply({...h.e.state,mouth:h.e.state.mouth+1},'Edited','visual');
  for(const panel of Object.values(h.panels))assert.equal(panel.geometry.mouth,h.e.state.mouth);
  await h.import(exported);for(const key of Object.keys(data))assert.deepEqual(JSON.parse(JSON.stringify(h.e.designJSON()[key])),data[key]);
  const old={...exported};for(const key of Object.keys(data))delete old[key];await h.import(old);
  for(const key of Object.keys(data))assert.equal(h.e.designJSON()[key],null,'old files must clear previous study data');
  await h.import(exported);h.$('#newDesign').click();for(const key of Object.keys(data))assert.equal(h.e.designJSON()[key],null);
 }finally{h.close();}
});
test('storage failure gives a visible backup instruction instead of claiming saved measurements',()=>{
 const h=app();try{
  h.w.Storage.prototype.setItem=function(){throw Error('Quota exceeded');};h.$('#confirmSave').click();
  assert.equal(h.$('#studyStorageStatus').hidden,false);assert.match(h.$('#studyStorageStatus').textContent,/Download.*JSON/);assert.equal(h.$('#savedComparisons').open,true);
  assert.equal(h.e.designJSON().variants.length,1,'session data remains exportable');
 }finally{h.close();}
});
