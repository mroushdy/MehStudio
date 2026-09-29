const {test}=require('node:test'),assert=require('node:assert/strict');
const create=require('../acoustics/research-view.cjs');
test('analysis view defaults to simple, preserves settings and restores an explicit preference',()=>{
 let saved=null;const calls=[],advanced=[{hidden:false},{hidden:false}];
 const buttons=['simple','advanced'].map(mode=>({dataset:{researchMode:mode},setAttribute(k,v){this[k]=v;},addEventListener(k,f){this[k]=f;}}));
 const workspace={dataset:{},querySelectorAll(s){return s==='[data-research-mode]'?buttons:advanced;}};
 const root={localStorage:{getItem(){return saved;},setItem(k,v){saved=v;}}};
 const view=create(root).init(workspace,{setViewMode(m){calls.push(m);}});
 assert.equal(view.mode,'simple');assert.ok(advanced.every(e=>e.hidden));
 buttons[1].click();assert.equal(view.mode,'advanced');assert.ok(advanced.every(e=>!e.hidden));assert.equal(buttons[1]['aria-pressed'],'true');
 assert.equal(create(root).init(workspace).mode,'advanced');
 const blocked={localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}};
 assert.equal(create(blocked).init(workspace).mode,'simple');assert.deepEqual(calls,['simple','advanced']);
});
