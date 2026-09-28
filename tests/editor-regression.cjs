const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {context:c,html,scripts}=require('./load-editor.cjs')();const M=c.MEH;
const source=scripts[11];
function between(start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
const seed=source.match(/const starter=(.*);\nfor\(let/)[1];
const starter=vm.runInContext(`(()=>{const M=MEH;${between('function seedRearLayout(','function driverLabel(')};return ${seed};})()`,c);
function acoustic(a,hornLoad='webster'){return c.MEHAcoustics.analyze(a,{driverId:a.p.midDriver,hornLoad,points:17,fmin:100,fmax:700,sensitivity:false});}
test('single-file script syntax and external-dependency contract',()=>{
 assert.equal(scripts.length,14);assert.ok(!/<script[^>]+\bsrc\s*=/i.test(html));
 assert.ok(!/<link[^>]+rel=["']stylesheet/i.test(html));
});
test('actual visual starter fits and has a usable supported acoustic screen',()=>{
 const a=M.analyze(starter);assert.equal(M.mechanicalFitReasons(a).length,0);assert.ok(a.projectionMargin>40);
 const r=acoustic(a);assert.equal(r.available,true);assert.equal(r.rows.length,17);
});
test('oversized offsets and collapsed collectors cannot pass either acoustic model or rear-port fitting',()=>{
 for(const patch of [{offset:45},{offset:70},{offset:100},{gap:17}]){
  const a=M.analyze({...starter,rearLayout:'individual',back:4,...patch});assert.ok(a.directCouplingIssues.length);
  for(const load of ['resistive','webster'])assert.equal(acoustic(a,load).available,false,JSON.stringify(patch));
  const result=M.fitRearPort(a.p);assert.equal(result.ok,false);assert.match(result.reason,/placement/);
 }
});
test('entry footprint boundary is respected for round and rotated nonround shapes',()=>{
 const safe=M.analyze({...starter,offset:40});assert.ok(safe.projectionMargin>0);
 assert.ok(M.analyze({...safe.p,port:50.42}).projectionMargin<0);
 for(const shape of ['slot','teardrop'])for(const slotAngle of [0,45,90,180]){
  const a=M.analyze({...starter,shape,slotL:60,slotW:20,slotAngle,offset:70});
  assert.ok(a.directCouplingIssues.length);assert.equal(acoustic(a).available,false);
 }
});
for(const id of ['bc8ndl51','bc10ndl64'])for(const rearLayout of ['shared','individual'])for(const rearConcept of ['individual','reflex']){
 test(`${id}: ${rearLayout} ${rearConcept==='reflex'?'ported':'sealed'} driver fit and mounting bounds`,()=>{
  const result=M.fitMidDriver({...starter,rearLayout,rearConcept},id);assert.equal(result.ok,true,result.reason);
  const a=result.analysis;assert.equal(M.mechanicalFitReasons(a).length,0);assert.ok(a.projectionMargin>=0);
  assert.equal(a.p.midDriver,id);assert.equal(a.p.rearLayout,rearLayout);assert.equal(a.p.rearConcept,rearConcept);
  const selected=M.driverModel(a.p),all=selected.model.meshes.flatMap(m=>m.vertices.map(p=>p[2]+selected.mountOffsetMM));
  assert.ok(Math.abs(Math.min(...all))<1e-7);assert.ok(Math.abs(Math.max(...all)-a.p.driverDepth)<1e-7);
  if(rearConcept==='reflex'){
   assert.ok(a.rearPort.lengthMM>=a.rearPort.capMM);assert.equal(a.rearPort.valid,true);
   const again=M.fitRearPort(a.p);assert.equal(again.ok,true);assert.equal(JSON.stringify(again.state),JSON.stringify(a.p));
  }
 });
}
test('large-driver mesh and smooth enclosure contain finite coordinates',()=>{
 for(const id of ['bc8ndl51','bc10ndl64']){
  const a=M.fitMidDriver({...starter,rearConcept:'reflex'},id).analysis;
  const meshes=c.MEHMeshes(a,true);assert.ok(meshes.length>10);
  for(const mesh of meshes){assert.ok(mesh.data.length>0,mesh.name);assert.ok(mesh.data.every(Number.isFinite),mesh.name);}
  assert.equal(a.sharedRear.smoothJoin,true);assert.equal(a.sharedRear.valid,true);
 }
});
test('Manual edits preserve the last valid geometry, retain corrections, and block export until resolved',()=>{
 const setup=`(()=>{const M=MEH;let state=${JSON.stringify(starter)},analysis=M.analyze(state),manualDraft=null,pending=0,title='start';const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)};let updates=0;function markEdited(){manualDraft=null}function sync(){}function update(){analysis=M.analyze(state);updates++;renderRearEditNotice()}function cancelAnimationFrame(){}function fitManualRearPort(){throw Error('Unexpected fitting route')}
 ${between('function manualIssues(','async function fitManualRearPort')}
 ${between('function renderRearEditNotice()',"$('#discardRearEdits').onclick")}
 return {edit:editManualParameter,apply:applyManualEdit,get state(){return state},get draft(){return manualDraft},get updates(){return updates},get disabled(){return $('#export').disabled}};})()`;
 const ui=vm.runInContext(setup,c),original=JSON.stringify(ui.state);
 ui.edit('offset',70);assert.equal(JSON.stringify(ui.state),original);assert.equal(ui.draft.p.offset,70);assert.equal(ui.disabled,true);assert.equal(ui.updates,0);
 ui.edit('gap',42);assert.equal(ui.draft.p.offset,70);assert.equal(ui.draft.p.gap,42);assert.equal(ui.updates,0);
 ui.edit('offset',0);assert.equal(ui.draft,null);assert.equal(ui.state.gap,42);assert.equal(ui.disabled,false);assert.equal(ui.updates,1);
 ui.edit('offset',40);const safe=JSON.stringify(ui.state);
 ui.apply({...ui.state,port:50.42,shape:'round',areaLocked:false});assert.equal(JSON.stringify(ui.state),safe);assert.equal(ui.disabled,true);
 ui.edit('port',40);assert.equal(ui.draft,null);assert.equal(ui.state.port,40);assert.equal(ui.disabled,false);
 ui.edit('gap',17);assert.ok(ui.draft.directCouplingIssues.length);assert.notEqual(ui.state.gap,17);assert.equal(ui.disabled,true);
});
test('driver selectors group by nominal inches without dropping catalogue entries',()=>{
 const groups=vm.runInContext(`(()=>{const esc=s=>s;${between('function driverLabel(',"const driverControl=")};return driverOptions(MEH.drivers.mid)})()`,c);
 for(const label of ['5″ mids','6–6.5″ mids','8″ mids','10″ mids'])assert.ok(groups.includes(label),label);
 assert.equal((groups.match(/<option /g)||[]).length,Object.keys(M.drivers.mid).length);
});
test('Assisted goals ignore manual geometry and reject invalid coupling',()=>{
 const O=c.MEHDesignOptimizer,goals={...O.goalDefaults};
 const a=O.resolveGoals(goals),b=O.resolveGoals(goals,{...starter,mouth:300,offset:100,gap:15});
 assert.equal(JSON.stringify(a.state),JSON.stringify(b.state));
 assert.ok(O.geometryReasons(M.analyze({...starter,offset:70})).some(s=>s.includes('projection')));
});
