/* DOM interaction checks; canvas calls are stubbed, not browser/rendering QA. */
const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {html,scripts}=require('./load-editor.cjs')();
function app({storage={},blockedStorage=false}={}){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>o[k]||(()=>{})});w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 if(blockedStorage)Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage unavailable');}});
 w.HTMLDialogElement.prototype.close=function(){};
 for(let i=1;i<=10;i++)w.eval(scripts[i]);
 w.MEHScene=class{constructor(){this.gl=true;this.options={};}setModel(a){this.model=a;}fit(){}draw(){}project(p){return [p[0],p[1]];}};
 w.eval(scripts[11]);const $=s=>w.document.querySelector(s),edit=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {dom,w,$,edit,e:w.__MEH_EDITOR__,close:()=>w.close()};
}
function candidate(h){const {w}=h,state=w.MEH.normalize({...h.e.state,port:50}),analysis=w.MEH.analyze(state);return {state,analysis,score:1,notes:[],acousticSummary:{perDriverVoltageRms:2.83,requestedLowHz:100,requestedHandoffHz:700,xmaxMM:6,mouthPowerRippleDB:2,rearNetVolumeTotalL:100},guided:{dimensions:{widthMM:700,depthMM:500},headroomDB:10,passed:['Sampled checks passed.'],attention:['Coverage remains unverified.'],verify:['Measure a prototype.']}};}
function result(h){return {ok:true,tested:30,candidates:[candidate(h)],guidedGoals:{priority:'balanced',distanceM:3},assumptions:[]};}
test('full startup opens goals; goal edits do not regenerate and explicit driver selection clears stale quotes',()=>{
 const h=app();try{assert.equal(h.e.guided.stage,'goals');assert.equal(h.$('#wizard').hidden,false);const before=JSON.stringify(h.e.state);h.edit('#brief-coverage','90');assert.equal(JSON.stringify(h.e.state),before);h.$('[data-action="next"]').click();assert.equal(h.e.guided.stage,'drivers');assert.ok(h.$('[data-pair]'));h.edit('#guided-midPrice','100');h.edit('#guided-compressionPrice','300');h.$('[data-pair]').click();assert.equal(h.$('#guided-midPrice').value,'');assert.equal(h.$('#guided-compressionPrice').value,'');h.$('#manualTab').click();h.$('#wizardToggle').click();assert.equal(h.$('#brief-coverage').value,'90');}finally{h.close();}
});
test('preview leaves saved design intact; apply, refine, undo and export preserve goals',async()=>{
 const h=app();try{const before=JSON.stringify(h.e.state);h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();assert.equal(h.e.guided.stage,'results');assert.equal(JSON.stringify(h.e.state),before);h.$('[data-preview]').click();assert.equal(JSON.stringify(h.e.designJSON().state),before);assert.match(h.$('#viewTitle').textContent,/Preview/);h.$('[data-apply]').click();assert.equal(h.e.guided.stage,'refine');assert.equal(h.e.state.port,50);assert.match(h.$('[data-assessment]').textContent,/Still to verify/);assert.equal(h.e.designJSON().assistedWorkflow.version,1);h.$('[data-action="undo"]').click();assert.equal(JSON.stringify(h.e.state),before);assert.equal(h.e.guided.stage,'goals');}finally{h.close();}
});
test('input during generation cancels late results and stale geometry cannot be applied',async()=>{
 const h=app();try{let finish;h.w.MEHAssistedFlow.generate=()=>new Promise(r=>finish=r);const p=h.e.guided.generate();h.edit('#guided-maxWidthMM','900');finish(result(h));await p;assert.equal(h.e.guided.result,null);h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();h.e.apply({...h.e.state,gap:h.e.state.gap+1},'Manual change','visual');const before=JSON.stringify(h.e.state);h.$('[data-apply]').click();assert.equal(JSON.stringify(h.e.state),before);assert.match(h.$('[data-status]').textContent,/changed/);}finally{h.close();}
});
test('imported workflow snapshot restores goals and clears previous candidates',()=>{const h=app();try{h.e.guided.reset({goals:{...h.w.MEHAssistedFlow.defaults,maxWidthMM:850,budget:700,midPrice:90,compressionPrice:250},brief:{...h.e.designJSON().wizardBrief,coverage:80}});assert.equal(h.$('#guided-maxWidthMM').value,'850');assert.equal(h.$('#brief-coverage').value,'80');assert.equal(h.e.guided.result,null);assert.equal(h.e.guided.stage,'goals');}finally{h.close();}});

test('driver navigation populates choices and own mode hides suggestions without losing selection',()=>{const h=app();try{h.$('[data-step="drivers"]').click();assert.equal(h.e.guided.stage,'drivers');assert.ok(h.$('[data-pair]'));assert.equal(h.$('[data-driver-fields]').hidden,true);h.$('[data-action="own"]').click();assert.equal(h.$('[data-driver-fields]').hidden,false);assert.equal(h.$('[data-driver-choices]').hidden,true);assert.equal(h.$('[data-action="own"]').getAttribute('aria-pressed'),'true');h.$('[data-action="suggest"]').click();assert.equal(h.$('[data-driver-choices]').hidden,false);assert.ok(h.$('[data-selected-driver]').textContent.includes('DCX464'));}finally{h.close();}});
test('preview banner applies or cancels and excludes measurements from the saved design',async()=>{const h=app();try{h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();const before=JSON.stringify(h.e.state);h.$('[data-preview]').click();assert.equal(h.$('#previewNotice').hidden,false);assert.equal(h.$('#measure').disabled,true);assert.equal(h.$('[data-view="section"]').disabled,true);assert.equal(h.$('#overlay').innerHTML,'');h.$('#previewClose').click();assert.equal(h.$('#previewNotice').hidden,true);assert.equal(h.$('[data-view="section"]').disabled,false);assert.equal(JSON.stringify(h.e.state),before);h.$('[data-preview]').click();h.$('#previewApply').click();assert.equal(h.e.guided.stage,'refine');assert.equal(h.e.state.port,50);assert.equal(h.$('#previewNotice').hidden,true);}finally{h.close();}});
test('invalid optional goals are revealed and focused; changed goals mark earlier assessment stale',async()=>{const h=app();try{h.edit('#guided-distanceM','0');h.$('[data-action="next"]').click();assert.equal(h.e.guided.stage,'goals');assert.equal(h.$('[data-optional-goals]').open,true);assert.equal(h.w.document.activeElement.id,'guided-distanceM');h.edit('#guided-distanceM','3');h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();h.$('[data-apply]').click();h.$('[data-step="goals"]').click();h.edit('#guided-maxWidthMM','900');h.$('[data-step="refine"]').click();assert.equal(h.$('[data-goals-changed]').hidden,false);assert.equal(h.$('[data-step="results"]').disabled,true);}finally{h.close();}});
test('changing refinement locks cancels a pending run and prevents its late result being selectable',async()=>{const h=app();try{h.w.MEHAssistedFlow.generate=async()=>result(h);await h.e.guided.generate();h.$('[data-apply]').click();let finish;h.w.MEHAssistedFlow.generate=()=>new Promise(r=>finish=r);const run=h.e.guided.generate(true);h.$('[data-lock="entry"]').checked=true;h.$('[data-lock="entry"]').dispatchEvent(new h.w.Event('input',{bubbles:true}));finish(result(h));await run;assert.equal(h.e.guided.result,null);assert.equal(h.$('[data-step="results"]').disabled,true);}finally{h.close();}});

test('size filter refreshes the catalogue shortlist and more options remain optional',()=>{const h=app();try{h.$('[data-step="drivers"]').click();const size=h.$('#guided-midSize');size.value='8';size.dispatchEvent(new h.w.Event('change',{bubbles:true}));const choices=h.$('[data-driver-choices]');assert.ok(choices.querySelector('[data-pair]'));assert.ok(choices.children.length<=3);const b=h.$('[data-pair]');b.click();const id=h.$('#brief-midDriver').value;assert.equal(h.w.MEH.drivers.mid[id].nominalDiameterInches,8);assert.match(h.$('[data-selected-driver]').textContent,/8/);}finally{h.close();}});

test('new designs expose count and enclosure first and start individually sealed; saved shared choices survive',()=>{const h=app();try{const goals=h.$('section[data-stage="goals"]'),system=h.$('[data-enclosure]');assert.equal(system.closest('[data-stage]'),goals);assert.equal(goals.querySelector('fieldset'),system);for(const id of ['brief-count','brief-rearLayout','brief-rearConcept'])assert.ok(system.contains(h.$('#'+id)));assert.equal(h.$('#brief-rearLayout').value,'individual');assert.equal(h.$('#brief-rearConcept').value,'individual');assert.equal(h.e.state.rearLayout,'individual');assert.equal(h.e.state.rearConcept,'individual');assert.equal(h.w.MEHDesignOptimizer.goalDefaults.rearLayout,'individual');h.e.guided.reset({brief:{...h.e.designJSON().wizardBrief,rearLayout:'shared',rearConcept:'reflex'}});assert.equal(h.$('#brief-rearLayout').value,'shared');assert.equal(h.$('#brief-rearConcept').value,'reflex');}finally{h.close();}});

test('export menus produce downloads from applied state and force honest horn scope for NURBS and quarter cloud',async()=>{const h=app();try{
 h.w.TextEncoder=TextEncoder;h.w.eval(scripts[12]);h.w.eval(scripts[13]);
 const saved=[];h.w.MEHFileExportPanel.init(h.$('#fileExports'),{getDesign:()=>h.e.designJSON(),save:(...args)=>saved.push(args)});
 const format=h.$('[data-ex-format]'),scope=h.$('[data-ex-scope]');scope.value='assembly';format.value='nurbs';format.dispatchEvent(new h.w.Event('change'));
 assert.equal(scope.value,'blank');assert.equal(scope.disabled,true);assert.equal(h.$('#meshExport').open,true);
 const api=h.w.MEHFileExportPanel.init(h.$('#fileExports'),{getDesign:()=>h.e.designJSON(),save:(...args)=>saved.push(args)});
 h.$('[data-ex-format]').value='nurbs';api.sync();await api.run();assert.equal(saved.length,1);assert.equal(saved[0][0],'MEH_horn_uncut_NURBS_surfaces.step');assert.match(saved[0][1],/RATIONAL_B_SPLINE_SURFACE/);
 h.$('[data-ex-format]').value='quarter';api.sync();assert.equal(h.$('[data-ex-scope]').disabled,true);assert.match(h.$('[data-ex-scope-note]').textContent,/no solver boundaries/);
 }finally{h.close();}});


test('mode preference survives reload, keyboard order matches tabs, and unavailable storage is harmless',()=>{
 let h=app();try{
  assert.equal(h.$('.design-tabs button').id,'wizardToggle');
  h.$('#manualTab').click();const mode=h.w.localStorage.getItem('meh-editor-mode');assert.equal(mode,'manual');h.close();
  h=app({storage:{'meh-editor-mode':mode}});assert.equal(h.$('#wizard').hidden,true);
  h.$('#manualTab').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(h.$('#wizard').hidden,false);
  h.$('#wizardToggle').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(h.$('#wizard').hidden,true);
  h.$('#newDesign').click();assert.equal(h.$('#wizard').hidden,false);h.close();
  h=app({blockedStorage:true});assert.equal(h.$('#wizard').hidden,false);h.$('#manualTab').click();assert.equal(h.$('#wizard').hidden,true);
 }finally{h.close();}
});
test('saved studies retain mode and goals across reload and JSON imports; old files open in Manual',async()=>{
 let h=app();try{
  h.edit('#brief-coverage','80');h.edit('#guided-maxWidthMM','850');h.$('#variantName').value='My assisted study';h.$('#confirmSave').click();
  const saved=h.w.localStorage.getItem('meh-lab-variants-v2'),design=JSON.parse(JSON.stringify(h.e.designJSON()));assert.equal(design.editorMode,'assisted');const state=JSON.stringify(design.state);h.close();
  h=app({storage:{'meh-editor-mode':'manual','meh-lab-variants-v2':saved}});h.$('[data-load="0"]').click();
  assert.equal(h.$('#wizard').hidden,false);assert.equal(h.$('#brief-coverage').value,'80');assert.equal(h.$('#guided-maxWidthMM').value,'850');assert.equal(JSON.stringify(h.e.state),state);
  async function importDesign(d){await h.$('#importFile').onchange({target:{files:[{text:async()=>JSON.stringify(d)}],value:'study.json'}});}
  h.$('#manualTab').click();await importDesign(design);assert.equal(h.$('#wizard').hidden,false);assert.equal(h.$('#guided-maxWidthMM').value,'850');assert.equal(JSON.stringify(h.e.state),state);
  design.editorMode='manual';await importDesign(design);assert.equal(h.$('#wizard').hidden,true);assert.equal(h.e.designJSON().editorMode,'manual');
  delete design.editorMode;await importDesign(design);assert.equal(h.$('#wizard').hidden,true);assert.equal(h.$('#brief-coverage').value,'80');
 }finally{h.close();}
});
