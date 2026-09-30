/* Notice DOM/storage contract; this is not rendered browser QA. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const {html,scripts}=require('./load-editor.cjs')();
const source=scripts[11].slice(scripts[11].indexOf('(function showExperimentalNotice(){'),scripts[11].lastIndexOf('\n})();'));
const key='meh-experimental-notice-seen';
function notice(storage,{blocked=false}={}){
 const dom=new JSDOM(html),d=dom.window.document,n=d.querySelector('#experimentalNotice');let shown=0;
 n.showModal=()=>{shown++;n.open=true;};n.close=()=>{n.open=false;n.dispatchEvent(new dom.window.Event('close'));};
 const context={$:s=>d.querySelector(s),document:d,localStorage:{getItem(k){if(blocked)throw Error('denied');return storage[k]??null;},setItem(k,v){if(blocked)throw Error('denied');storage[k]=v;}}};
 vm.runInNewContext(source,context);
 return {dom,d,n,get shown(){return shown;},close:()=>dom.window.close()};
}
test('experimental notice retains exact text and acknowledges once independently of saved designs',()=>{
 const storage={'meh-lab-variants-v2':'[{"name":"kept","state":{"mouth":700}}]','meh-editor-mode':'manual'},before={...storage};
 let h=notice(storage);try{
  assert.equal(h.shown,1);assert.equal(h.d.querySelector('#experimentalNoticeTitle').textContent,'Experimental tool.');
  assert.equal(h.d.querySelector('#experimentalNoticeText').textContent,'Acoustic predictions still need validation. Check your design before building.');
  assert.equal(h.d.querySelector('#experimentalNoticeAI').textContent,'Built using AI tools.');
  assert.equal(h.d.querySelector('#dismissExperimentalNotice').textContent,'Got it');
  h.d.querySelector('#dismissExperimentalNotice').click();assert.equal(h.n.open,false);assert.equal(storage[key],'1');
  for(const k of Object.keys(before))assert.equal(storage[k],before[k]);
 }finally{h.close();}
 h=notice(storage);try{assert.equal(h.shown,0);}finally{h.close();}
});
test('native close also acknowledges, while unavailable storage never prevents closing',()=>{
 const storage={};let h=notice(storage);try{h.n.close();assert.equal(storage[key],'1');}finally{h.close();}
 h=notice({}, {blocked:true});try{assert.equal(h.shown,1);assert.doesNotThrow(()=>h.d.querySelector('#dismissExperimentalNotice').click());assert.equal(h.n.open,false);}finally{h.close();}
});
