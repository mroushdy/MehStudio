'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('../exports/mounting.cjs'),{context:c}=require('./load-editor.cjs')(),M=c.MEH,deps={model:M,land:c.MEHMounting};
const clone=x=>JSON.parse(JSON.stringify(x));
function design(mid='bc6ndl38',compression='bcDcx464'){return M.analyze({...M.defaults,...M.drivers.mid[mid].parameters,midDriver:mid,compressionDriver:compression,throat:M.drivers.compression[compression].throatMM});}
const settings={mid:{enabled:true},compression:{enabled:true}};
function near(a,b,tolerance=1e-7){assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);}
function topology(mesh){const edges=new Map();for(const face of mesh.faces)for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],key=a<b?a+':'+b:b+':'+a;if(!edges.has(key))edges.set(key,[]);edges.get(key).push(a<b?1:-1);}for(const pair of edges.values()){assert.equal(pair.length,2);assert.equal(pair[0]+pair[1],0);}return mesh.vertices.length-edges.size+mesh.faces.length;}
function interior(p,a,b,c){const cross=(x,y,z)=>(y[0]-x[0])*(z[1]-x[1])-(y[1]-x[1])*(z[0]-x[0]),q=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return q.every(v=>v>1e-9)||q.every(v=>v< -1e-9);}
function withRecord(a,kind,edit){const base=M.driverModel(a.p,kind),record=clone(base.record);edit(record);return {...deps,model:{...M,driverModel:(p,k='mid')=>k===kind?{...base,record}:M.driverModel(p,k)}};}
function measured(id){return {driverId:id,confirmed:true,note:'Fixture measurement example, 30 September 2026',cutoutDiameterMM:75.5,outerDiameterMM:110,boltCircleDiameterMM:95.5,boltCount:4,startAngleDeg:45,mountOffsetMM:5};}

test('old designs have no enabled mounting parts and mounting generation does not mutate acoustic geometry',()=>{
 const a=design(),before=JSON.stringify(a),b=G.build(a,{},deps);assert.equal(b.parts.length,0);assert.deepEqual(b.errors,[]);assert.equal(b.settings.mid.enabled,false);G.build(a,settings,deps);assert.equal(JSON.stringify(a),before);
});
test('B&C mounting sources retain exact driver identity, source status, M6 thread and separate plate clearance',()=>{
 const i=G.inspect(design(),deps);assert.equal(i.mid.available,true);assert.equal(i.compression.available,true);assert.equal(i.compression.driverId,'bcDcx464');assert.equal(i.compression.source.id,'bcdcx464');assert.equal(i.compression.spec.driverBoltThread,'M6');assert.equal(i.compression.source.dimensions.boltHoleDiameter.value,null);assert.equal(i.compression.defaults.boltHoleDiameterMM,6.5);assert.notEqual(i.compression.defaults.boltHoleDiameterMM,6);assert.equal(i.mid.spec.mountOffsetMM,11);assert.equal(i.mid.spec.startAngleDeg,45);assert.equal(i.mid.spec.cutoutDiameterMM,145);
});
test('plates have closed oriented surfaces, independent bolt passages and the correct topological genus',()=>{
 const b=G.build(design(),settings,deps);assert.deepEqual(b.errors,[]);assert.equal(b.parts.length,5);for(const p of b.parts){assert.equal(topology(p.localMesh),2-2*(1+p.spec.boltCount));assert.equal(topology(p.worldMesh),2-2*(1+p.spec.boltCount));assert.ok(G.checkMesh(p.localMesh).signedVolumeMM3>0);assert.ok(G.checkMesh(p.worldMesh).signedVolumeMM3>0);const centers=[[0,0],...p.spec.boltCenters];for(const f of p.localMesh.faces){const [a,b,c]=f.map(i=>p.localMesh.vertices[i]);if(a[2]===b[2]&&a[2]===c[2])for(const q of centers)assert.equal(interior(q,a,b,c),false,'No top or bottom face caps a through hole.');}}
});
test('HF flange volume agrees with circular area minus one throat and four clearance holes',()=>{
 const p=G.build(design(),{compression:{enabled:true}},deps).parts[0],s=p.spec,expected=Math.PI*((s.outerDiameterMM/2)**2-(s.cutoutDiameterMM/2)**2-s.boltCount*(s.boltHoleDiameterMM/2)**2)*s.thicknessMM;assert.ok(Math.abs(p.checks.signedVolumeMM3/expected-1)<0.001);near(p.checks.signedVolumeMM3,p.checks.polygonalVolumeMM3,1e-6);assert.equal(s.holeApproximation.method,'circumscribed polygons; requested diameter is minimum across flats');
 for(const [i,hole]of s.holes.entries()){const center=i===0?[0,0]:s.boltCenters[i-1],radius=(i===0?s.cutoutDiameterMM:s.boltHoleDiameterMM)/2;for(let j=0;j<hole.length;j++){const a=hole[j],b=hole[(j+1)%hole.length],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];near(Math.hypot(mid[0]-center[0],mid[1]-center[1]),radius);}}
});
test('left-handed cone placements flip face winding while HF plate grows toward the horn',()=>{
 const a=design(),b=G.build(a,settings,deps);for(const p of b.parts){near(p.checks.signedVolumeMM3,p.checks.worldSignedVolumeMM3,1e-6);if(p.kind==='mid'){const pose=a.poses[Number(p.id.split('_').at(-1))-1],axis=pose.driverN||pose.n;assert.equal(p.transform.determinant,-1);p.transform.origin.forEach((x,i)=>near(x,pose.F[i]+11*axis[i]));assert.deepEqual(p.worldMesh.faces[0],[p.localMesh.faces[0][0],p.localMesh.faces[0][2],p.localMesh.faces[0][1]]);}else{near(Math.min(...p.worldMesh.vertices.map(p=>p[2])),-12);near(Math.max(...p.worldMesh.vertices.map(p=>p[2])),-6);assert.equal(p.transform.determinant,1);}}
});
test('plate outlines keep source frame and expand only when a chosen edge allowance needs support',()=>{
 const a=design(),original=G.inspect(a,deps).mid.spec.outline,p=G.build(a,{mid:{enabled:true}},deps).parts[0];assert.deepEqual(p.spec.outline,original);assert.equal(p.spec.expandedForAllowances,false);const expanded=G.build(a,{mid:{enabled:true,edgeMarginMM:12}},deps).parts[0];assert.equal(expanded.spec.expandedForAllowances,true);assert.ok(expanded.spec.clearances.boltToOuterEdgeMM>=12-1e-7);assert.ok(expanded.spec.outerDiameterMM>p.spec.outerDiameterMM);
});
test('opening overlap, insufficient inner gasket land, invalid thickness and invalid recesses are refused',()=>{
 const a=design();for(const opt of [{thicknessMM:0},{thicknessMM:-2},{thicknessMM:'6'},{boltHoleDiameterMM:40},{gasketLandMM:20},{edgeMarginMM:-1},{counterboreDepthMM:6,counterboreDiameterMM:10},{counterboreDepthMM:2,counterboreDiameterMM:5},{counterboreDepthMM:0,counterboreDiameterMM:10},{counterboreDepthMM:2,counterboreDiameterMM:0},{counterboreDepthMM:2,counterboreDiameterMM:40}]){const b=G.build(a,{mid:{enabled:true,...opt}},deps);assert.equal(b.parts.length,0,JSON.stringify(opt));assert.ok(b.errors.length,JSON.stringify(opt));}
 const valid=G.build(a,{compression:{enabled:true,boltHoleDiameterMM:8,thicknessMM:9}},deps);assert.deepEqual(valid.errors,[]);assert.equal(valid.parts[0].spec.boltHoleDiameterMM,8);assert.equal(valid.parts[0].spec.thicknessMM,9);
});
test('source-derived output is gated on mounting datum, hole pattern orientation and resolved dimensions',()=>{
 const a=design();for(const edit of [r=>{r.dimensions.mountingFaceOffset.status='assumed';},r=>{r.dimensions.cutoutDiameter.status='conservative-envelope';},r=>{r.dimensions.boltCircleDiameter.value=null;},r=>{r.geometry.parts=r.geometry.parts.filter(p=>p.type!=='bolt-pattern');},r=>{r.geometry.parts.find(p=>p.type==='bolt-pattern').params.count=7;},r=>{r.sources=[];}]){const d=withRecord(a,'mid',edit),i=G.inspect(a,d);assert.equal(i.mid.available,false);const b=G.build(a,{mid:{enabled:true}},d);assert.equal(b.parts.length,0);assert.ok(b.errors.length);}
});
test('DMA80 unresolved seat and conflicting holes stay disabled until every measured override is supplied',()=>{
 const a=design('daytondma80_4'),i=G.inspect(a,deps);assert.equal(i.mid.available,false);assert.match(i.mid.reasons.join(' '),/offset.*unresolved/);assert.match(i.mid.reasons.join(' '),/hole diameter.*unresolved/i);const opts={mid:{enabled:true,boltHoleDiameterMM:4.2,override:measured(a.p.midDriver)}};const b=G.build(a,opts,deps);assert.deepEqual(b.errors,[]);assert.equal(b.parts.length,a.poses.length);assert.equal(b.parts[0].spec.origin,'measured-override');assert.equal(b.parts[0].spec.mountOffsetMM,5);assert.equal(b.parts[0].source.dimensions.mountingFaceOffset.status,'assumed');assert.ok(b.inspection.mid.catalogueReasons.length);
 for(const key of ['driverId','note','confirmed','cutoutDiameterMM','outerDiameterMM','boltCircleDiameterMM','boltCount','startAngleDeg','mountOffsetMM']){const settings=clone(opts);delete settings.mid.override[key];const bad=G.build(a,settings,deps);assert.equal(bad.parts.length,0,key);assert.ok(bad.errors.length,key);}
});
test('saved measured overrides and plate settings cannot silently migrate between selected drivers',()=>{
 const b=G.build(design('daytondma80_8'),{mid:{enabled:true,boltHoleDiameterMM:4.2,override:measured('daytondma80_4')}},deps);assert.equal(b.parts.length,0);assert.match(b.errors.join(' '),/another driver/);const stale=G.build(design(),{mid:{enabled:true,driverId:'bc5ndl38'}},deps);assert.equal(stale.parts.length,0);assert.match(stale.errors.join(' '),/another driver/);
});
test('unsupported projecting compression driver cannot be enabled by supplying a drilling pattern',()=>{
 const a=design('bc6ndl38','bms4594he'),b=G.build(a,{compression:{enabled:true,override:{...measured('bms4594he'),mountOffsetMM:0}}},deps);assert.equal(b.parts.length,0);assert.match(b.errors.join(' '),/phase plug|throat coupling/);
});
test('bad triangulations and invalid placement bases produce explicit failures without partial mid sets',()=>{
 const a=design();const bad=G.build(a,{mid:{enabled:true}},{...deps,triangulate:()=>[0,1,2]});assert.equal(bad.parts.length,0);assert.ok(bad.errors.length);const moved=clone(a);moved.poses[2].t=[2,0,0];const placed=G.build(moved,{mid:{enabled:true}},deps);assert.equal(placed.parts.length,0);assert.match(placed.errors.join(' '),/orthonormal/);
});
test('all automatically eligible catalogue cone plates generate valid manifold geometry',()=>{
 let eligible=0;for(const [id,d]of Object.entries(M.drivers.mid)){if(!d.parameters)continue;const a=design(id),i=G.inspect(a,deps);if(!i.mid.available)continue;eligible++;const b=G.build(a,{mid:{enabled:true}},deps);assert.deepEqual(b.errors,[],id);assert.equal(b.parts.length,a.poses.length,id);for(const p of b.parts)assert.ok(G.checkMesh(p.worldMesh).signedVolumeMM3>0,id);}assert.equal(eligible,6,'Six cone records currently have resolved datum, cutout and drill pattern.');
});

test('all automatically eligible compression flanges retain open apertures and valid solids',()=>{
 let eligible=0;for(const [id,d]of Object.entries(M.drivers.compression)){const a=design('bc6ndl38',id),i=G.inspect(a,deps);if(!i.compression.available)continue;eligible++;const b=G.build(a,{compression:{enabled:true}},deps);assert.deepEqual(b.errors,[],id);assert.equal(b.parts.length,1,id);assert.equal(topology(b.parts[0].localMesh),2-2*(1+b.parts[0].spec.boltCount));}assert.equal(eligible,12);
});

test('real counterbores remove the correct stepped volume and retain manifold open through holes',()=>{
 const a=design(),b=G.build(a,{mid:{enabled:true,counterboreDiameterMM:10,counterboreDepthMM:2},compression:{enabled:true,counterboreDiameterMM:12,counterboreDepthMM:3}},deps);assert.deepEqual(b.errors,[]);assert.equal(b.parts.length,5);
 for(const p of b.parts){const s=p.spec,z=s.thicknessMM-s.counterboreDepthMM,shoelace=ring=>Math.abs(ring.reduce((total,q,i)=>{const next=ring[(i+1)%ring.length];return total+q[0]*next[1]-q[1]*next[0];},0)/2),area=shoelace(s.outline),holeArea=s.holes.reduce((n,q)=>n+shoelace(q),0),topArea=s.topHoles.reduce((n,q)=>n+shoelace(q),0);assert.equal(s.hasCounterbores,true);assert.ok(topArea>holeArea);near(p.checks.signedVolumeMM3,(area-holeArea)*s.thicknessMM-(topArea-holeArea)*s.counterboreDepthMM,1e-6);near(p.checks.signedVolumeMM3,p.checks.worldSignedVolumeMM3,1e-6);assert.equal(topology(p.localMesh),2-2*(1+s.boltCount));assert.equal(topology(p.worldMesh),2-2*(1+s.boltCount));assert.ok(s.clearances.boltToOuterEdgeMM>=s.edgeMarginMM-1e-7);
  const shoulder=p.localMesh.faces.filter(f=>f.every(i=>p.localMesh.vertices[i][2]===z));assert.equal(shoulder.length,s.boltCount*48*2);for(const f of shoulder){const [a,b,c]=f.map(i=>p.localMesh.vertices[i]);assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0,'Shoulder normals face local +Z.');for(const center of [[0,0],...s.boltCenters])assert.equal(interior(center,a,b,c),false,'Counterbore shoulder does not cap a hole.');}
  for(const [i,ring]of s.topHoles.entries()){if(!i)continue;const center=s.boltCenters[i-1];near(Math.hypot(ring[0][0]-center[0],ring[0][1]-center[1]),s.counterboreDiameterMM/2/Math.cos(Math.PI/48));}
 }
});
test('zero recess settings reproduce the original straight-through plate',()=>{
 const a=design(),base=G.build(a,{mid:{enabled:true}},deps),explicit=G.build(a,{mid:{enabled:true,counterboreDiameterMM:0,counterboreDepthMM:0}},deps);assert.deepEqual(explicit.errors,[]);assert.deepEqual(explicit.parts.map(p=>p.localMesh),base.parts.map(p=>p.localMesh));assert.equal(explicit.parts[0].spec.hasCounterbores,false);
});
