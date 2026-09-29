/* DOM interaction checks; canvas calls are stubbed, not browser/rendering QA. */
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {html,scripts}=require('./load-editor.cjs')();
function app(){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>o[k]||(()=>{})});w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 for(let i=1;i<=10;i++)w.eval(scripts[i]);
 w.MEHScene=class{constructor(){this.gl=true;this.options={};}setModel(a){this.model=a;}fit(){}draw(){}project(p){return [p[0],p[1]];}};
 w.eval(scripts[11]);const $=s=>w.document.querySelector(s),edit=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {dom,w,$,edit,e:w.__MEH_EDITOR__,close:()=>w.close()};
}
function candidate(h){const {w}=h,state=w.MEH.normalize({...h.e.state,port:50}),analysis=w.MEH.analyze(state);return {state,analysis,score:1,notes:[],acousticSummary:{perDriverVoltageRms:2.83,requestedLowHz:100,requestedHandoffHz:700,xmaxMM:6,mouthPowerRippleDB:2,rearNetVolumeTotalL:100},guided:{dimensions:{widthMM:700,depthMM:500},headroomDB:10,passed:['Sampled checks passed.'],attention:['Coverage remains unverified.'],verify:['Measure a prototype.']}};}
function result(h){return {ok:true,tested:30,candidates:[candidate(h)],guidedGoals:{priority:'balanced',distanceM:3},assumptions:[]};}
test('full startup opens goals; goal edits do not regenerate and explicit driver selection clears stale quotes',()=>{
 const h=app();try{assert.equal(h.e.guided.stage,'goals');assert.equal(h.$('#wizard').hidden,false);const before=JSON.stringify(h.e.state);h.edit('#brief-coverage','90');assert.equal(JSON.stringify(h.e.state),before);h.$('[data-action="drivers"]').click();assert.equal(h.e.guided.stage,'drivers');assert.ok(h.$('[data-pair]'));h.edit('#guided-midPrice','100');h.edit('#guided-compressionPrice','300');h.$('[data-pair]').click();assert.equal(h.$('#guided-midPrice').value,'');assert.equal(h.$('#guided-compressionPrice').value,'');h.$('#manualTab').click();h.$('#wizardToggle').click();assert.equal(h.$('#brief-coverage').value,'90');}finally{h.close();}
});
test('preview leaves saved design intact; apply, refine, undo and export preserve goals',async()=>{
 const h=app();try{const before=JSON.stringify(h.e.state);h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();assert.equal(h.e.guided.stage,'results');assert.equal(JSON.stringify(h.e.state),before);h.$('[data-preview]').click();assert.equal(JSON.stringify(h.e.designJSON().state),before);assert.match(h.$('#viewTitle').textContent,/Preview/);h.$('[data-apply]').click();assert.equal(h.e.guided.stage,'refine');assert.equal(h.e.state.port,50);assert.match(h.$('[data-assessment]').textContent,/Still to verify/);assert.equal(h.e.designJSON().assistedWorkflow.version,1);h.$('[data-action="undo"]').click();assert.equal(JSON.stringify(h.e.state),before);assert.equal(h.e.guided.stage,'goals');}finally{h.close();}
});
test('input during generation cancels late results and stale geometry cannot be applied',async()=>{
 const h=app();try{let finish;h.w.MEHAssistedFlow.generate=()=>new Promise(r=>finish=r);const p=h.e.guided.generate();h.edit('#guided-maxWidthMM','900');finish(result(h));await p;assert.equal(h.e.guided.result,null);h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();h.e.apply({...h.e.state,gap:h.e.state.gap+1},'Manual change','visual');const before=JSON.stringify(h.e.state);h.$('[data-apply]').click();assert.equal(JSON.stringify(h.e.state),before);assert.match(h.$('[data-status]').textContent,/changed/);}finally{h.close();}
});
test('imported workflow snapshot restores goals and clears previous candidates',()=>{const h=app();try{h.e.guided.reset({goals:{...h.w.MEHAssistedFlow.defaults,maxWidthMM:850,budget:700,midPrice:90,compressionPrice:250},brief:{...h.e.designJSON().wizardBrief,coverage:80}});assert.equal(h.$('#guided-maxWidthMM').value,'850');assert.equal(h.$('#brief-coverage').value,'80');assert.equal(h.e.guided.result,null);assert.equal(h.e.guided.stage,'goals');}finally{h.close();}});
