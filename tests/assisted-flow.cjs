const {test}=require('node:test'),assert=require('node:assert/strict');
const {context:c}=require('./load-editor.cjs')(),F=c.MEHAssistedFlow,O=c.MEHDesignOptimizer,M=c.MEH;
test('goals validate finite limits and preserve zero quotes without inventing prices',()=>{
 for(const patch of [{maxWidthMM:''},{distanceM:NaN},{budget:-1},{targetSPL:0}])assert.equal(F.goals(patch).ok,false);
 const g=F.goals({budget:500,midPrice:0,compressionPrice:350}).value;assert.deepEqual(JSON.parse(JSON.stringify(F.cost({count:4},g))),{known:true,total:350,within:true});assert.equal(F.cost({count:4},F.goals({budget:500}).value).within,null);
});
test('driver suggestions require exact motor identity, packaging and a documented handoff',()=>{
 const r=F.driverChoices({...O.goalDefaults,handoffHz:500},{maxWidthMM:750});assert.ok(r.choices.length>0);
 for(const p of r.choices){assert.ok(c.MEHAcoustics.catalog[p.midDriver]);assert.ok(p.minimumHandoffHz<=500);assert.ok(p.seedWidthMM<=750);assert.ok(M.drivers.compression[p.compressionDriver].available);assert.ok(p.midSource.startsWith('https://'));}
 assert.equal(F.driverChoices(O.goalDefaults,{maxWidthMM:200}).choices.length,0);assert.equal(O.goalDefaults.compressionDriver,'bcDcx464');assert.equal(O.resolveGoals({...O.goalDefaults,compressionDriver:'bms4594he'}).ok,false);assert.ok(!r.choices.some(p=>p.compressionDriver==='bms4594he'));
});
test('actual assembly bounds include the compression driver, pods and rear shell',()=>{
 for(const rearLayout of ['shared','individual']){const a=M.analyze({...O.resolveGoals({rearLayout}).state,sharedBack:100,back:4});const d=F.dimensions(a);assert.ok(d.widthMM>0&&d.depthMM>a.depth);assert.ok(d.bounds.lo[2]<=-12-a.compressionDriver.depthMM);assert.ok(F.fitReasons(a,{maxWidthMM:200,maxDepthMM:100}).length>0);}
});
test('generation preserves locks and refuses impossible constraints or stale motor identities',async()=>{
 const brief={...O.goalDefaults,lowHz:200};
 const noBudget=await F.generate(brief,{budget:1,midPrice:10,compressionPrice:20});assert.equal(noBudget.ok,false);assert.match(noBudget.errors[0],/budget/);
 const cancelled=await F.generate(brief,{}, {shouldCancel:()=>true});assert.equal(cancelled.cancelled,true);assert.equal(cancelled.candidates.length,0);
 const r=await F.generate(brief,{maxWidthMM:800,maxDepthMM:550,priority:'compact'});assert.equal(r.ok,true,JSON.stringify(r.errors));assert.ok(r.candidates.length);
 for(const v of r.candidates){assert.ok(v.guided.dimensions.widthMM<=800);assert.ok(v.guided.dimensions.depthMM<=550);assert.ok(v.guided.headroomDB>=0);assert.ok(v.guided.verify.length);}
 const first=r.candidates[0],changed=await F.generate({...brief,coverage:80},{},{currentState:first.state,lockProfile:true});assert.equal(changed.ok,false);assert.match(changed.errors[0],/Unlock/);
 const locked=await F.generate(brief,{maxWidthMM:800,maxDepthMM:550},{currentState:first.state,lockProfile:true,lockEntry:true});assert.equal(locked.ok,true,JSON.stringify(locked.errors));for(const v of locked.candidates)for(const k of [...F.profileKeys,...F.entryKeys])assert.equal(v.state[k],first.state[k],k);
});

test('8 and 10 inch filters shortlist exact nominal sizes in the expanded catalogue',()=>{for(const size of ['8','10']){const r=F.driverChoices(O.goalDefaults,{midSize:size,maxWidthMM:1500});assert.ok(r.choices.length);for(const p of r.choices)assert.equal(M.drivers.mid[p.midDriver].nominalDiameterInches,Number(size));}});
