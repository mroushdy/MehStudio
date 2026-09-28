// DOM behavior harness, not rendered browser QA.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {context:c,html,scripts}=require('./load-editor.cjs')(),M=c.MEH,editor=scripts[11];
function between(start,end){const i=editor.indexOf(start);return editor.slice(i,editor.indexOf(end,i));}
const seed=editor.match(/const starter=(.*);\nfor\(let/)[1];
const starter=vm.runInContext(`(()=>{const M=MEH;${between('function seedRearLayout(','function driverLabel(')};return ${seed};})()`,c);
function harness(initialOptions={}){
 const nodes=new Map(),events={},applied=[],options={points:9,sensitivity:false,...initialOptions};
 function node(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',checked:false,disabled:false,innerHTML:'',textContent:'',events:{},addEventListener(e,fn){this.events[e]=fn;}});return nodes.get(selector);}
 node('[data-fs-step]').value='3';node('[data-fs-volume]').value='10';node('[data-fs-mode]').value='flow';
 node('[data-fs-mode]').options=['flow','phase','impedance','excursion','velocity','area'].map(value=>({value,disabled:false}));
 const host={open:false,innerHTML:'',querySelector:node,querySelectorAll:s=>s.split(',').map(node),addEventListener(e,fn){events[e]=fn;}};
 const panel=c.MEHFrontStudyPanel.init(host,{getOptions:()=>({...options}),onApply:(patch,label)=>applied.push({patch,label})});
 const open=()=>{host.open=true;events.toggle();};
 const apply=index=>events.click({target:{closest(){return {disabled:false,dataset:{fsApply:String(index)}};}}});
 return {panel,host,node,events,applied,options,open,apply};
}
test('comparison stays lazy while closed and invalidates stale curves on geometry or drive changes',()=>{
 const h=harness(),a=M.analyze(starter);h.panel.update(a);assert.equal(h.panel.result,null);assert.equal(h.node('[data-fs-export]').disabled,true);
 h.open();assert.equal(h.panel.result.cases[0].result.available,true);assert.equal(h.node('[data-fs-export]').disabled,false);
 const old=h.panel.result;h.options.voltageRms=2.83;h.panel.optionsChanged();assert.equal(h.panel.result,null);assert.equal(h.node('[data-fs-export]').disabled,true);h.apply(1);assert.equal(h.applied.length,0);
 h.open();assert.equal(h.panel.result.options.voltageRms,2.83);assert.notEqual(h.panel.result,old);
 h.panel.update(M.analyze({...starter,frontFiller:'offset'}));assert.equal(h.panel.result,null);assert.equal(h.node('[data-fs-plot]').innerHTML,'');h.panel.dispose();
});
test('insert UI retains geometry choices and Apply while withholding all response modes',()=>{
 const h=harness(),a=M.analyze({...starter,frontFiller:'offset'});h.panel.update(a);h.open();
 assert.match(h.node('[data-fs-status]').textContent,/Geometry only.*narrow-gap/i);
 assert.equal(h.node('[data-fs-match]').disabled,true);assert.equal(h.node('[data-fs-mode]').value,'area');
 for(const option of h.node('[data-fs-mode]').options)assert.equal(option.disabled,option.value!=='area');
 assert.ok(h.node('[data-fs-plot]').innerHTML.includes('Axial position'));
 assert.ok(h.panel.result.cases[1].analysis);h.apply(1);assert.equal(h.applied.length,1);
 assert.deepEqual(Object.keys(h.applied[0].patch).sort(),['gap','neck']);
 assert.equal(h.applied[0].patch.neck,h.panel.result.cases[1].analysis.p.neck);h.panel.dispose();
});
test('blank controls clear output and expose an actionable validation message',()=>{
 const h=harness();h.panel.update(M.analyze(starter));h.open();assert.ok(h.panel.result);
 h.node('[data-fs-step]').value='';h.node('[data-fs-step]').events.input();h.open();
 assert.equal(h.panel.result,null);assert.match(h.node('[data-fs-status]').textContent,/1–10 mm/);assert.equal(h.node('[data-fs-rows]').innerHTML,'');h.panel.dispose();
});
test('Apply uses a fresh actual-geometry candidate and rejects unattainable rows',()=>{
 const h=harness();h.panel.update(M.analyze({...starter,neck:5,gap:30}));h.open();
 assert.equal(h.panel.result.cases[1].analysis,null);h.apply(1);assert.equal(h.applied.length,0);
 const target=h.panel.result.cases[2];assert.ok(target.analysis,target.reason);h.apply(2);assert.equal(h.applied.length,1);assert.equal(h.applied[0].patch.gap,target.analysis.p.gap);h.panel.dispose();
});
test('every plot mode yields finite self-contained SVG and phase wrap jumps are broken',()=>{
 const r=c.MEHFrontStudyCore.compare(M.analyze(starter),{},{points:9,sensitivity:false});
 for(const mode of ['flow','phase','impedance','excursion','velocity','area']){
  const svg=c.MEHFrontStudyPanel.plotSVG(r,mode);assert.ok(svg.startsWith('<svg'),mode);assert.ok(!/NaN|Infinity|undefined/.test(svg),mode);assert.match(svg,/role="img"/);assert.match(svg,/<title>/);
  const narrow=c.MEHFrontStudyPanel.plotSVG(r,mode,320);assert.match(narrow,/viewBox="0 0 320 242"/);assert.ok(!/NaN|Infinity/.test(narrow));
 }
 const phase=c.MEHFrontStudyPanel.plotSVG({cases:[{label:'Test',rows:[{frequency:100,phaseDeltaDeg:170},{frequency:200,phaseDeltaDeg:-170},{frequency:300,phaseDeltaDeg:null},{frequency:400,phaseDeltaDeg:10}]}]},'phase');
 const data=phase.match(/<path d="([^"]*)" fill="none"/)[1];assert.equal((data.match(/M/g)||[]).length,3);assert.ok(!data.includes('L'));
});
test('editor exposes the study from Front chamber and syncs geometry and acoustic changes',()=>{
 assert.match(html,/id="frontStudy" class="panel disclosure-panel"/);
 assert.match(editor,/compareFrontButton\.textContent='Compare entry \/ cavity'/);
 assert.match(editor,/frontStudyPanel\?\.update\(analysis\)/);
 assert.match(editor,/frontStudyPanel\?\.optionsChanged\(\)/);
 assert.match(editor,/onApply:applyFrontComparison/);assert.match(editor,/applyManualEdit\(\{\.\.\.state,\.\.\.patch\}/);
 assert.match(editor,/input\.value\.trim\(\)===''\?NaN/);
 assert.match(html,/Methods &amp; sources/);assert.match(html,/eprints\.soton\.ac\.uk\/348798/);
});

test('matched LC tolerates an unused empty volume field and near-null probe differences remain unavailable',()=>{
 const h=harness();h.panel.update(M.analyze(starter));h.node('[data-fs-volume]').value='';h.node('[data-fs-match]').checked=true;h.open();assert.equal(h.panel.result.cases[0].result.available,true);assert.equal(h.node('[data-fs-volume]').disabled,true);
 const r=h.panel.result;for(const item of r.cases){if(item.rows.length)item.rows.at(-1).comparisonDb=null;}
 h.node('[data-fs-mode]').value='impedance';h.node('[data-fs-mode]').events.change();
 assert.ok(!h.node('[data-fs-rows]').innerHTML.includes('<td>0.00</td>'),'zero flow must not fabricate a zero-dB probe difference');h.panel.dispose();
});

test('front study matches the acoustic screen when inactive assumptions retain stale invalid input',()=>{
 const method=between('function frontStudyOptions(){','const frontStudyPanel=');
 const result=vm.runInContext(`(()=>{const acousticPanel={options:{hornLoad:'webster',loadFactor:0,rearLossQ:0,voltageRms:2.83,endCorrection:1.4}},state={rearConcept:'individual'},document={querySelectorAll:()=>[{dataset:{maInput:'loadFactor'},value:'0',min:'.1',max:'10'},{dataset:{maInput:'rearLossQ'},value:'0',min:'.1',max:'100'},{dataset:{maInput:'voltageRms'},value:'2.83',min:'.05',max:'100'}]};${method};return frontStudyOptions();})()`,c);
 assert.ok(!('loadFactor' in result));assert.ok(!('rearLossQ' in result));assert.ok(!result.inputError);
 const comparison=c.MEHFrontStudyCore.compare(M.analyze(starter),{},{...result,points:9,sensitivity:false});assert.equal(comparison.cases[0].result.available,true);assert.equal(comparison.options.loadFactor,1);assert.equal(comparison.options.rearLossQ,7);
});

test('Apply rechecks the baseline after flushing pending geometry edits',()=>{
 const method=between('function applyFrontComparison(','const frontStudyPanel=');
 const result=vm.runInContext(`(()=>{let state={neck:8,gap:28,mouth:700},analysis={},applied=0,refreshed=0,changed=true;const frontStudyPanel={update(){refreshed++}};function flushPendingGeometry(){if(changed)state={...state,mouth:720}}function applyManualEdit(next){state=next;applied++}${method};const stale=applyFrontComparison({neck:5,gap:30},'Shorter',{neck:8,gap:28,mouth:700});changed=false;const fresh=applyFrontComparison({neck:5,gap:30},'Shorter',{...state});return {stale,fresh,applied,refreshed,state};})()`,c);
 assert.equal(result.stale,false);assert.equal(result.fresh,true);assert.equal(result.refreshed,1);assert.equal(result.applied,1);assert.equal(result.state.mouth,720);assert.equal(result.state.neck,5);
});
