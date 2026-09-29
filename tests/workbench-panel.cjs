const {test}=require('node:test'),assert=require('node:assert/strict');
const {context:c,html}=require('./load-editor.cjs')();
const saved=require('../examples/offset-insert-study.json'),B=c.MEHBroadband,P=c.MEHWorkbenchPanel;
test('broadband plots distinguish FEM points, retain broken rows and never join phase wraps',()=>{
 const a={available:true,frequencyHz:100,splDb:90,phaseDeg:170},b={...a,frequencyHz:200,phaseDeg:-170},bad={available:false,frequencyHz:300},d={...a,frequencyHz:400,phaseDeg:10};
 const svg=P.plotSVG([{label:'Reduced',rows:[a,b,bad,d]},{label:'FEM',rows:[a,b],pointsOnly:true}], 'phase');
 assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.match(svg,/<desc>.*Separate dots/);assert.equal((svg.match(/<circle/g)||[]).length,2);
 const path=svg.match(/<path d="([^"]*)" fill="none" stroke=/)[1];assert.equal((path.match(/M/g)||[]).length,3);assert.equal((path.match(/L/g)||[]).length,0);
});
function harness(){
 const nodes=new Map(),events={};const defaults={drive:'1',distance:'3',mode:'spl',low:'200',high:'700',travel:'1.75',speed:'17',end:'0',loss:'1',mass:'0',phases:'0,0,0,0',parameter:'portAreaMM2',values:'1450,1650,1900'};
 const node=s=>{const k=s.match(/data-aw-([^\]]+)/)[1];if(!nodes.has(k))nodes.set(k,{value:defaults[k]||'',textContent:'',innerHTML:'',disabled:false,events:{},addEventListener(e,fn){this.events[e]=fn;}});return nodes.get(k);};
 const host={open:false,querySelector:node,addEventListener(k,f){events[k]=f;}};const panel=P.init(host);
 return {panel,host,node:k=>node('[data-aw-'+k+']'),open(){host.open=true;events.toggle();}};
}
test('panel is lazy, imports exact drive, invalidates on edits and rejects blank phase/number input',()=>{
 const h=harness(),a=c.MEH.analyze(saved.state);h.panel.update(a);assert.equal(h.panel.result,null);h.panel.setOptions({voltageRms:1});h.open();assert.equal(h.panel.result.available,true);assert.equal(h.panel.result.options.voltageRms,1);assert.equal(h.panel.result.options.endCorrection,0);
 assert.match(h.node('legend').innerHTML,/lossless local FEM/);h.node('drive').value='';h.node('drive').events.input();assert.equal(h.panel.result,null);assert.equal(h.node('plot').innerHTML,'');assert.equal(h.node('export').disabled,true);h.open();assert.match(h.node('status').textContent,/valid numbers/);h.node('drive').value='1';h.node('phases').value='0,,0,0';h.open();assert.equal(h.panel.result,null);h.panel.dispose();
});
test('portable integration preserves saved workbench settings and geometry refresh',()=>{
 assert.match(html,/workbenchPanel\?\.update\(analysis\)/);assert.match(html,/acousticWorkbench:workbenchPanel\?\{options:workbenchPanel.options\}/);assert.match(html,/workbenchPanel\?\.setOptions\(d.acousticWorkbench\?\.options/);
 assert.match(html,/const panel=\$\('#acousticWorkbench'\)/);assert.match(html,/const systemPanel=window.MEHSystemPanel/);
});

test('applying a candidate rejects stale geometry after flushing pending edits',()=>{
 const vm=require('node:vm'),{scripts}=require('./load-editor.cjs')(),fn=scripts[11].match(/function applyAcousticCandidate[^\n]+/)[0];
 const r=vm.runInNewContext(`(()=>{let state={port:45,tap:147},analysis={},applied=0,refreshed=0,changed=true;const workbenchPanel={update(){refreshed++}};function flushPendingGeometry(){if(changed)state={...state,tap:160}}function applyManualEdit(v){state=v;applied++}${fn};const stale=applyAcousticCandidate({port:49,tap:147},'Candidate',{port:45,tap:147});changed=false;const fresh=applyAcousticCandidate({...state,port:49},'Candidate',{...state});return {stale,fresh,applied,refreshed,state};})()`);
 assert.equal(r.stale,false);assert.equal(r.fresh,true);assert.equal(r.applied,1);assert.equal(r.refreshed,1);assert.equal(r.state.tap,160);
});

test('portable broadband and sizing sources match the reviewed standalone modules',()=>{
 const N=require('../acoustics/multiport-network.cjs')(c.MEHHornAcoustics),S=require('../acoustics/coupled-system.cjs')(c.MEH,c.MEHAcoustics,N),E=require('../acoustics/broadband-engine.cjs')(c.MEH,c.MEHAcoustics,N,S),P0=require('../acoustics/workbench-panel.cjs')(c);
 for(const key of ['baseline','sweep','sparseReference','solve'])assert.equal(E[key].toString(),c.MEHBroadband[key].toString());assert.equal(P0.init.toString(),P.init.toString());
});
