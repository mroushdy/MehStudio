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
function manualHarness(){
 const setup=`(()=>{const M=MEH;let state=${JSON.stringify(starter)},analysis=M.analyze(state),manualDraft=null,pending=0,title='start';const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)};const esc=s=>String(s);let updates=0,nextFrame=0;const frames=new Map();function requestAnimationFrame(fn){frames.set(++nextFrame,fn);return nextFrame}function cancelAnimationFrame(id){frames.delete(id)}function markEdited(){manualDraft=null}function syncDriverStatus(){}function fitAllViews(){}let driverFitMessage='';function update(){pending=0;analysis=M.analyze(state);state=analysis.p;updates++;renderRearEditNotice()}
 ${between('function flushPendingGeometry(','async function fitManualRearPort')}
 ${between('function renderRearEditNotice()','function seedRearLayout(')}
 ${between('function selectMidDriver(','async function fitSelectedMidDriver(')}
 return {edit:editManualParameter,apply:applyManualEdit,select:selectMidDriver,flush:flushPendingGeometry,get state(){return state},get analysis(){return analysis},get draft(){return manualDraft},get updates(){return updates},get disabled(){return $('#export').disabled||$('#save').disabled},get pendingFrames(){return frames.size},get warning(){return $('#manualWarningSummary').textContent}};})()`;
 return vm.runInContext(setup,c);
}
test('Manual warnings leave geometry, subsequent edits, saving and export live',()=>{
 const ui=manualHarness();
 ui.edit('mouth',710);assert.equal(ui.state.mouth,710);assert.ok(ui.analysis.rearIssues.length);assert.equal(ui.disabled,false);
 ui.edit('offset',70);assert.equal(ui.state.offset,70);assert.ok(ui.analysis.directCouplingIssues.length);assert.equal(ui.disabled,false);
 ui.edit('gap',42);assert.equal(ui.state.offset,70);assert.equal(ui.analysis.p.gap,42);assert.equal(ui.updates,3);
 ui.edit('offset',0);assert.equal(ui.state.gap,42);assert.equal(ui.draft,null);assert.equal(ui.disabled,false);
 ui.edit('gap',17);assert.equal(ui.analysis.p.gap,17);assert.ok(ui.analysis.directCouplingIssues.length);assert.match(ui.warning,/edits are live/);
});
test('Manual ported transitions and driver selection apply directly without implicit fitting',()=>{
 const ui=manualHarness(),back=ui.state.sharedBack;
 ui.edit('rearConcept','reflex');assert.equal(ui.state.rearConcept,'reflex');assert.equal(ui.state.sharedBack,back);
 ui.edit('offset',100);ui.select('bc10ndl64');assert.equal(ui.state.midDriver,'bc10ndl64');assert.equal(ui.state.offset,100);assert.equal(ui.analysis.p.frame,M.drivers.mid.bc10ndl64.parameters.frame);assert.equal(ui.disabled,false);
});
test('Manual sliders coalesce frames and export flushing uses the latest normalized values',()=>{
 const ui=manualHarness();ui.edit('mouth',710,{defer:true});ui.edit('mouth',720,{defer:true});ui.edit('offset',70,{defer:true});
 assert.equal(ui.updates,0);assert.equal(ui.pendingFrames,1);assert.equal(ui.state.mouth,720);
 ui.flush();assert.equal(ui.updates,1);assert.equal(ui.pendingFrames,0);assert.equal(ui.analysis.p.offset,70);assert.equal(ui.disabled,false);
 ui.edit('gap',1e6);assert.equal(ui.state.gap,M.specs.gap[1]);assert.equal(ui.analysis.p.gap,ui.state.gap);
 assert.ok(between('function designJSON()',"$('#jsonExport')").includes('flushPendingGeometry()'));
 assert.ok(!between('function syncRearManual()',"for(let el of document.querySelectorAll('[data-range]").includes('.open=true'));
});
test('Open collector preserves previous front volume and acoustic availability',()=>{
 const a=M.analyze(starter);assert.equal(a.frontFiller.enabled,false);assert.equal(a.frontFiller.volumeCM3,0);
 assert.ok(Math.abs(a.frontV-(a.collectorV+a.coneV+a.neckV))<1e-9);assert.equal(acoustic(a).available,true);
});
test('Contour insert is a closed consistently wound mesh with the reported displaced volume',()=>{
 for(const shape of ['round','slot','teardrop']){
  const a=M.analyze({...starter,frontFiller:'annular',shape,slotL:60,slotW:25,slotAngle:45}),f=a.frontFiller;
  assert.equal(f.available,true);const edges=new Map();let vol=0;
  for(const face of f.faces){const [i,j,k]=face;vol+=M.dot(f.vertices[i],M.cross(f.vertices[j],f.vertices[k]))/6000;for(let n=0;n<3;n++){const u=face[n],v=face[(n+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(u<v?1:-1);}}
  for(const [key,directions]of edges){assert.equal(directions.length,2,key);assert.equal(directions[0]+directions[1],0,key);}
  assert.ok(vol>0);assert.ok(Math.abs(vol-f.volumeCM3)<1e-7);assert.ok(Math.abs(a.frontV-(a.collectorV+a.coneV+a.neckV-f.volumeCM3))<1e-8);
  for(const [x,y,z]of f.vertices){const coneZ=a.p.coneDepth*Math.max(0,1-Math.hypot(x,y)/a.pistonR);assert.ok(coneZ-z>=a.p.fillerClearance-1e-8);}
  const bound=Math.max(...a.uv.map(([u,v])=>Math.hypot(u-a.p.offset,v)));assert.ok(f.innerR>=bound+2-1e-8);
  const meshes=c.MEHMeshes(a,true),inserts=meshes.filter(m=>m.name.startsWith('Continuous front adapter'));assert.equal(inserts.length,a.p.count);for(const mesh of meshes)assert.ok(mesh.data.every(Number.isFinite),mesh.name);
 }
});
test('Contour insert displacement decreases with larger clearance or opening',()=>{
 const base={...starter,frontFiller:'annular'};
 assert.ok(M.analyze({...base,fillerClearance:1}).frontFiller.volumeCM3>M.analyze({...base,fillerClearance:4}).frontFiller.volumeCM3);
 assert.ok(M.analyze({...base,fillerOpening:50}).frontFiller.volumeCM3>M.analyze({...base,fillerOpening:100}).frontFiller.volumeCM3);
 const bad=M.analyze({...base,offset:100});assert.equal(bad.frontFiller.available,false);assert.equal(bad.frontFiller.volumeCM3,0);assert.ok(bad.frontFiller.issues.some(i=>i.code==='filler-opening'));assert.ok(bad.frontCavityV>0);
 const tight=M.analyze({...base,fillerClearance:1,excursion:2});assert.equal(tight.frontFiller.available,true);assert.ok(tight.frontFiller.issues.some(i=>i.code==='filler-travel'));
});
test('Contour study is preserved by serialization and cannot imply a supported acoustic prediction',()=>{
 const p=M.normalize({...starter,frontFiller:'annular',fillerClearance:2.5,fillerOpening:65}),roundtrip=M.normalize(JSON.parse(JSON.stringify(p)));
 for(const key of ['frontFiller','fillerClearance','fillerOpening'])assert.equal(roundtrip[key],p[key]);
 for(const load of ['webster','resistive']){const r=acoustic(M.analyze(p),load);assert.equal(r.available,false);assert.match(r.reason,/contour|insert|narrow-gap/i);}
 assert.equal(acoustic(M.analyze({...p,frontFiller:'none'})).available,true);
 assert.equal(c.MEHDesignOptimizer.resolveGoals(c.MEHDesignOptimizer.goalDefaults).state.frontFiller,'none');
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
test('JSON exports retain acoustic choices during pending or unavailable calculations',()=>{
 const nodes=new Map(),input=(key,value)=>({dataset:{maInput:key},value,min:'0',max:'100',addEventListener(){}}),choice=(key,value)=>({dataset:{maChoice:key},value,addEventListener(){}});
 const numbers=[input('voltageRms','2.83'),input('endCorrection','1.7'),input('rearLossQ','9')],choices=[choice('hornLoad','resistive'),choice('mouthTermination','matched'),choice('throatTermination','closed')];
 for(const el of numbers)nodes.set(`[data-ma-input="${el.dataset.maInput}"]`,el);for(const el of choices)nodes.set(`[data-ma-choice="${el.dataset.maChoice}"]`,el);
 const host={querySelector(sel){if(!nodes.has(sel))nodes.set(sel,{checked:true,getContext:()=>null,addEventListener(){},setAttribute(){}});return nodes.get(sel)},querySelectorAll(sel){return sel==='[data-ma-input]'?numbers:sel==='[data-ma-choice]'?choices:[]}};
 const panel=c.MEHAcousticPanel.init(host);panel.update(M.analyze(starter),{defer:true});assert.equal(panel.result,null);assert.equal(panel.options.voltageRms,2.83);
 c.exportTestPanel=panel;c.exportTestState=M.normalize({...starter,frontFiller:'annular'});
 const value=vm.runInContext(`(()=>{const workbenchPanel={options:{voltageRms:1,endCorrection:0,targets:{lowHz:200,highHz:700}}},systemPanel={options:{voltageRms:1,mouthTermination:"baffled",throatTermination:"closed"}},acousticPanel=exportTestPanel,state=exportTestState,analysis=MEH.analyze(state),origin='visual',generation=null,variants=[];const readBrief=()=>({}),flushPendingGeometry=()=>{};${between('function designJSON()',"$('#jsonExport')")};return designJSON()})()`,c);
 assert.equal(value.acousticWorkbench.options.endCorrection,0);assert.equal(value.acousticWorkbench.options.targets.highHz,700);assert.equal(value.systemAcoustics.options.voltageRms,1);assert.equal(value.acousticScreen.options.voltageRms,2.83);assert.equal(value.acousticScreen.options.hornLoad,'resistive');assert.equal(value.validation.acousticStatus,'unavailable-or-pending');assert.equal(value.state.frontFiller,'annular');panel.dispose();delete c.exportTestPanel;delete c.exportTestState;
});
test('Offset-outlet insert follows the entry while preserving closed geometry and cone clearance',()=>{
 for(const shape of ['round','slot','teardrop'])for(const offset of [0,20,35]){
  const a=M.analyze({...starter,frontFiller:'offset',fillerOpening:20,shape,slotL:50,slotW:25,slotAngle:45,offset}),f=a.frontFiller;
  assert.equal(f.available,true,`${shape} ${offset}`);assert.equal(f.openingCenterMM[0],-offset);assert.equal(f.sectionContours.length,2);assert.ok(f.edgeMarginMM>=.5);
  const edges=new Map();let volume=0;
  for(const face of f.faces){const [i,j,k]=face,vs=face.map(i=>f.vertices[i]);volume+=M.dot(vs[0],M.cross(vs[1],vs[2]))/6000;
   for(let n=0;n<3;n++){const u=face[n],v=face[(n+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(u<v?1:-1);}
   for(const weights of [[1,0,0],[.5,.5,0],[1/3,1/3,1/3],[.1,.4,.5]]){const [x,y,z]=[0,1,2].map(d=>vs.reduce((v,p,i)=>v+p[d]*weights[i],0)),r=Math.hypot(x,y),target=Math.min(a.p.coneDepth*Math.max(0,1-r/a.pistonR),Math.max(0,a.p.coneDepth-a.p.fillerRelief));assert.ok(z<=target-a.p.fillerClearance+1e-7,`${shape}: cone clearance`);}
  }
  for(const [key,dir]of edges){assert.equal(dir.length,2,key);assert.equal(dir[0]+dir[1],0,key);}
  assert.ok(volume>0);assert.ok(Math.abs(volume-f.volumeCM3)<1e-7);assert.ok(a.frontCavityV>0);assert.ok(Math.abs(a.frontV-(a.collectorV+a.coneV+a.neckV-f.volumeCM3))<1e-7);
  // Every entry boundary point lies inside every half-plane of the aperture.
  const dense=M.portUV(a.p,256);for(const q of dense){const pt=[q[0]-offset,q[1]];for(let i=0;i<f.openingUV.length;i++){const u=f.openingUV[i],v=f.openingUV[(i+1)%f.openingUV.length],dx=v[0]-u[0],dy=v[1]-u[1];assert.ok(dx*(pt[1]-u[1])-dy*(pt[0]-u[0])>=-1e-7);}}
 }
});
test('Offset insert relief and opening remain editable, serializable and explicitly outside acoustics',()=>{
 const base={...starter,frontFiller:'offset',offset:30};
 const low=M.analyze({...base,fillerRelief:0}),high=M.analyze({...base,fillerRelief:20});assert.ok(low.frontFiller.volumeCM3>high.frontFiller.volumeCM3);
 const wide=M.analyze({...base,fillerOpening:65});assert.ok(wide.frontFiller.volumeCM3<M.analyze(base).frontFiller.volumeCM3);
 const ui=manualHarness();ui.apply({...base,fillerOpening:200});assert.equal(ui.state.frontFiller,'offset');assert.equal(ui.disabled,false);assert.equal(ui.analysis.frontFiller.available,false);assert.ok(ui.analysis.frontFiller.issues.some(i=>i.code==='filler-opening'));ui.edit('fillerOpening',50);assert.equal(ui.analysis.frontFiller.available,true);
 for(const load of ['resistive','webster'])assert.equal(acoustic(low,load).available,false);
 const roundtrip=M.normalize(JSON.parse(JSON.stringify(high.p)));assert.equal(roundtrip.frontFiller,'offset');assert.equal(roundtrip.fillerRelief,20);
 const meshes=c.MEHMeshes(low,true);assert.equal(meshes.filter(m=>m.name.startsWith('Continuous front adapter')).length,low.p.count);for(const mesh of meshes)assert.ok(mesh.data.every(Number.isFinite),mesh.name);
});
test('Front adapter is continuous with smooth endpoint slopes and mesh-consistent air volume',()=>{
 const eps=1e-5;assert.ok(M.collectorBlend(eps)/eps<1e-7);assert.ok((1-M.collectorBlend(1-eps))/eps<1e-7);
 for(const shape of ['round','slot','teardrop'])for(const offset of [0,30]){
  const a=M.analyze({...starter,shape,slotL:55,slotW:25,slotAngle:45,offset,gap:42}),ss=a.collectorSections;
  assert.equal(ss.length,25);assert.equal(ss[0].offsetMM,0);assert.equal(ss.at(-1).offsetMM,offset);assert.equal(ss[0].zMM,0);assert.ok(Math.abs(ss.at(-1).zMM-(a.p.gap-a.p.neck-9))<1e-9);
  assert.equal(JSON.stringify(ss[0].uv),JSON.stringify(a.collectorSmallUV));assert.equal(JSON.stringify(ss.at(-1).uv),JSON.stringify(a.collectorLargeUV));
  const rings=ss.map(s=>s.uv.map(([x,y])=>[x+s.offsetMM,y,s.zMM]));let v=0;
  const triangle=(a,b,c)=>{v+=M.dot(a,M.cross(b,c))/6};
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<rings[k].length;j++){const n=(j+1)%rings[k].length;triangle(rings[k][j],rings[k][n],rings[k+1][n]);triangle(rings[k][j],rings[k+1][n],rings[k+1][j]);}
  for(let j=1;j<rings[0].length-1;j++){triangle(rings[0][0],rings[0][j+1],rings[0][j]);triangle(rings.at(-1)[0],rings.at(-1)[j],rings.at(-1)[j+1]);}
  assert.ok(Math.abs(v/1000-a.collectorLoftV)<1e-7);
  const meshes=c.MEHMeshes(a,true),adapters=meshes.filter(m=>m.name.startsWith('Continuous front adapter'));assert.equal(adapters.length,a.p.count);assert.ok(!meshes.some(m=>/Entry cartridge|Integral socket|Front chamber and mounting land/.test(m.name)));
  for(const m of adapters)assert.ok(m.data.every(Number.isFinite));
 }
});
test('Assisted coverage controls the independent profile and validates its supported range',()=>{
 const O=c.MEHDesignOptimizer,depths=[];
 for(const coverage of [40,60,90,120]){const r=O.resolveGoals({...O.goalDefaults,coverage},{...starter,coverage:70});assert.equal(r.ok,true);assert.equal(r.state.coverage,coverage);assert.equal(r.state.targetCoverage,coverage);assert.equal(r.baseline.profile.coverage,coverage);assert.equal(r.baseline.nominalCoverageDegrees,coverage);assert.equal(r.brief.coverage,coverage);assert.equal(r.provenance.coverage.source,'provided');depths.push(M.analyze(r.state).depth);}
 assert.equal(new Set(depths.map(v=>v.toFixed(5))).size,4);
 const legacy={...O.goalDefaults};delete legacy.coverage;assert.equal(O.resolveGoals(legacy).state.coverage,60);
 for(const coverage of [39,121,NaN,true,'oops']){const r=O.resolveGoals({...O.goalDefaults,coverage});assert.equal(r.ok,false);assert.ok(r.issues.some(x=>x.fields.includes('coverage')));}
});
test('Assisted help opens a named dialog without submitting the form',()=>{
 const rows=[],nodes=new Map(),opened=[];
 const dollar=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:selector,before(row){rows.push(row)}});return nodes.get(selector)};
 const doc={createElement(tag){return {tag,attributes:{},setAttribute(k,v){this.attributes[k]=v},append(...children){this.children=children}}}};
 vm.runInNewContext(between('const briefHelp=','const assistedDefaults='),{$:dollar,document:doc,dialog:id=>opened.push(id)});
 assert.equal(rows.length,10);
 for(const row of rows){const [label,button]=row.children;assert.equal(button.type,'button');assert.equal(button.attributes['aria-haspopup'],'dialog');assert.equal(button.attributes['aria-controls'],'fieldHelpDialog');button.onclick();assert.equal(dollar('#fieldHelpTitle').textContent,label.textContent);assert.ok(dollar('#fieldHelpText').textContent.length>25);}
 assert.equal(opened.length,10);assert.ok(opened.every(x=>x==='fieldHelpDialog'));
});
test('Front adapter wall is closed and consistently wound after renderer precision conversion',()=>{
 const key=p=>p.map(x=>Math.round(x*100000)||0).join(',');
 for(const frontFiller of ['none','annular','offset'])for(const shape of ['round','slot','teardrop']){
  const a=M.analyze({...starter,frontFiller,fillerOpening:30,shape,slotL:55,slotW:25,slotAngle:45,offset:30,gap:42}),g=M.frontAdapterGeometry(a),m=c.MEHMeshes(a,true).find(x=>x.name.startsWith('Continuous front adapter')),edges=new Map();
  assert.equal(g.rootIntersectionFailures,0);assert.ok(a.frontV>0);
  for(let i=0;i<m.data.length;i+=18){const points=[0,6,12].map(j=>Array.from(m.data.slice(i+j,i+j+3))),keys=points.map(key);assert.equal(new Set(keys).size,3,'No collapsed triangle in the rendered tube');
   for(let j=0;j<3;j++){const u=keys[j],v=keys[(j+1)%3],id=[u,v].sort().join('|');if(!edges.has(id))edges.set(id,[]);edges.get(id).push(u<v?1:-1);}
  }
  for(const dirs of edges.values()){assert.equal(dirs.length,2,'Every wall edge has exactly two faces');assert.equal(dirs[0]+dirs[1],0,'Adjacent faces have opposing winding');}
 }
});
test('Insert passage meets its opening directly with mesh-consistent volume and no smaller passage area',()=>{
 for(const frontFiller of ['annular','offset'])for(const shape of ['round','slot','teardrop']){
  const a=M.analyze({...starter,frontFiller,fillerOpening:30,shape,slotL:55,slotW:25,slotAngle:45,offset:30,gap:42}),f=a.frontFiller,ss=a.collectorSections;
  assert.equal(f.available,true);assert.equal(JSON.stringify(ss.at(-1).uv),JSON.stringify(a.collectorOutletUV));
  const aperture=f.mode==='offset'?f.openingUV:a.collectorLargeUV.map(([x,y])=>{const r=Math.hypot(x,y);return[x*f.innerR/r,y*f.innerR/r]});
  assert.ok(Math.abs(M.polygonArea(a.collectorOutletUV)-M.polygonArea(aperture))<1e-6);
  assert.ok(M.polygonArea(a.collectorOutletUV)<a.collectorLargeArea);
  for(const s of ss)assert.ok(M.polygonArea(s.uv)>=a.collectorSmallArea-1e-6);
  if(frontFiller==='offset')for(const s of ss)for(const [x,y]of a.uv){const point=[x-s.offsetMM,y];for(let i=0;i<s.uv.length;i++){const u=s.uv[i],v=s.uv[(i+1)%s.uv.length];assert.ok((v[0]-u[0])*(point[1]-u[1])-(v[1]-u[1])*(point[0]-u[0])>=-1e-6,'Projected entry remains inside the complete passage');}}
  const rings=ss.map(s=>s.uv.map(([x,y])=>[x+s.offsetMM,y,s.zMM]));let volume=0;const tri=(a,b,c)=>volume+=M.dot(a,M.cross(b,c))/6000;
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<rings[k].length;i++){const j=(i+1)%rings[k].length;tri(rings[k][i],rings[k][j],rings[k+1][j]);tri(rings[k][i],rings[k+1][j],rings[k+1][i]);}
  for(let j=1;j<rings[0].length-1;j++){tri(rings[0][0],rings[0][j+1],rings[0][j]);tri(rings.at(-1)[0],rings.at(-1)[j],rings.at(-1)[j+1]);}
  assert.ok(Math.abs(volume-a.collectorLoftV)<1e-7);assert.equal(acoustic(a).available,false);
 }
});
test('User opening-87 case and offset nonround inserts form one joined skin without a duplicate seat',()=>{
 for(const patch of [{shape:'round',offset:0,fillerOpening:87,fillerClearance:2.75,gap:28.05},{shape:'slot',offset:40,fillerOpening:25,slotL:55,slotW:25,slotAngle:45,gap:42},{shape:'teardrop',offset:30,fillerOpening:40,slotL:55,slotW:25,slotAngle:45,gap:42}]){
  const a=M.analyze({...starter,frontFiller:'offset',...patch}),f=a.frontFiller,g=M.frontAdapterGeometry(a),meshes=c.MEHMeshes(a,true),m=meshes.find(m=>m.name==='Continuous front adapter 1');assert.equal(f.available,true);
  assert.ok(!meshes.some(m=>m.name.startsWith('Cone contour insert')),'No overlapping second insert solid in the rendered assembly');
  assert.ok(g.inner.every(r=>r.length===g.inner[0].length),'Corresponding ring vertices through the complete passage');
  const key=p=>p.map(x=>Math.round(x*10000)||0).join(','),faceKey=vs=>vs.map(key).sort().join('|'),faces=new Set(),edges=new Map();let seat=0;
  for(let i=0;i<m.data.length;i+=18){const vs=[0,6,12].map(j=>Array.from(m.data.slice(i+j,i+j+3))),ks=vs.map(key);assert.equal(new Set(ks).size,3);const id=faceKey(vs);assert.ok(!faces.has(id),'No coincident surface triangles');faces.add(id);
   if(vs.every(v=>Math.abs(M.dot(M.sub(v,a.F),a.n)+6)<1e-4))seat++;
   for(let j=0;j<3;j++){const u=ks[j],v=ks[(j+1)%3],id=[u,v].sort().join('|');if(!edges.has(id))edges.set(id,[]);edges.get(id).push(u<v?1:-1);}
  }
  assert.equal(seat,0,'The buried flat adapter/insert contact face is absent');for(const dirs of edges.values()){assert.equal(dirs.length,2);assert.equal(dirs[0]+dirs[1],0);}
  const topStart=f.vertices.length/2,world=([u,v,z])=>M.add(a.F,M.add(M.mul(a.t,u),M.add([0,v,0],M.mul(a.n,z))));
  for(const face of f.faces.filter(v=>v.every(i=>i>=topStart)))assert.ok(faces.has(faceKey(face.map(i=>Array.from(new Float32Array(world(f.vertices[i])))))),'Joined skin preserves the exact cone-clearance surface triangles');
 }
});
