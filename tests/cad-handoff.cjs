// Source/DOM and artifact parsing checks, not rendered browser or production CAD validation.
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),vm=require('node:vm');
const F=require('../exports/formats.cjs'),H=require('../exports/handoff.cjs'),Z=require('../exports/zip.cjs'),{context:c}=require('./load-editor.cjs')();
const design=JSON.parse(fs.readFileSync(path.join(__dirname,'../examples/offset-insert-study.json'))),a=c.MEH.analyze(design.state);
let kit;
function handoff(){return kit||(kit=H.build(a,design,{formats:F,model:c.MEH,buildMeshes:c.MEHMeshes}));}
test('CAD handoff has unique named physical reference parts and excludes the ghost comparison profile',()=>{
 const k=handoff(),parts=k.manifest.parts,objs=k.files['MEH-CAD-handoff/assembly_reference.obj'].split('\n').filter(l=>l.startsWith('o ')).map(l=>l.slice(2));
 assert.ok(parts.length>10);assert.equal(new Set(objs).size,objs.length);assert.deepEqual(objs,Array.from(parts,p=>p.obj_object));assert.ok(parts.every(p=>p.vertex_count>0&&p.triangle_count>0));assert.ok(parts.some(p=>p.provenance.driverModelId==='bc6ndl38'));assert.ok(parts.some(p=>p.name==='Continuous front adapter 1'));assert.ok(!parts.some(p=>/original.*profile/i.test(p.name)));
 assert.equal(k.manifest.units.length,'mm');assert.equal(k.manifest.axes.forward,'+Z');assert.match(k.files['MEH-CAD-handoff/START_HERE.md'],/not a fused printable/);assert.match(k.files['MEH-CAD-handoff/START_HERE.md'],/No drilling template/);
});
test('CAD handoff preserves exact source dimensions and reconstructs the displayed mid datum without certifying it',()=>{
 const m=handoff().manifest,record=c.MEH.drivers.mid.bc6ndl38.record;
 assert.equal(m.drivers.mid.variant,'8 ohm');assert.deepEqual(m.drivers.mid.dimensions,JSON.parse(JSON.stringify(record.dimensions)));assert.ok(m.drivers.mid.sources.every(s=>s.url&&s.sha256));assert.ok(m.drivers.mid.sources.every(s=>!Object.hasOwn(s,'localArchivePath')));
 for(let i=0;i<a.poses.length;i++){const p=a.poses[i],x=m.mid_mounts[i];assert.equal(x.driver_id,'bc6ndl38');assert.equal(x.catalogue_datum_offset_from_front_rim_mm,11);assert.equal(x.catalogue_datum_offset_status,'drawing-verified');for(let k=0;k<3;k++)assert.ok(Math.abs(x.catalogue_datum_origin_mm[k]-p.F[k]-11*p.n[k])<1e-10);assert.ok(Math.abs(x.basis_determinant+1)<1e-12);assert.match(x.datum_note,/not a verified fabrication datum/);}
 const altered=c.MEH.analyze({...a.p,coneDepth:a.p.coneDepth+1}),custom=H.build(altered,{state:altered.p},{formats:F,model:c.MEH,buildMeshes:()=>c.MEHMeshes(altered,true)}).manifest;
 assert.ok(custom.mid_mounts.every(p=>p.catalogue_datum_origin_mm===null&&!p.catalogue_model_placed));
});
test('entry outlines close every distinct loop at the actual applied inner-wall coordinates',()=>{
 const rows=handoff().files['MEH-CAD-handoff/entry_outlines_mm.csv'].trim().split('\n').slice(1).map(l=>l.split(','));
 for(let i=0;i<a.poses.length;i++){const points=rows.filter(r=>r[0]==='mid_'+(i+1));assert.equal(points.length,a.poses[i].edge.length+1);assert.deepEqual(points[0].slice(2),points.at(-1).slice(2));for(let j=0;j<a.poses[i].edge.length;j++)for(let k=0;k<3;k++)assert.ok(Math.abs(Number(points[j][k+2])-a.poses[i].edge[j][k])<1e-8);}
});
test('small-driver CAD handoffs keep exact impedance variants and unresolved mounting evidence',()=>{
 for(const id of ['daytondma80_4','daytondma80_8']){
  const d=c.MEH.drivers.mid[id],state=c.MEH.normalize({...c.MEH.defaults,...d.parameters,midDriver:id,compressionDriver:'bcde1090tn',mouth:375,throat:36,count:2,tap:125,port:60,neck:8,offset:0,gap:25,back:.5}),analysis=c.MEH.analyze(state);
  const k=H.build(analysis,{state},{formats:F,model:c.MEH,buildMeshes:x=>c.MEHMeshes(x,true)}),r=k.manifest.drivers.mid;
  assert.equal(r.id,id);assert.equal(r.variant,id.endsWith('_4')?'4 ohm':'8 ohm');assert.equal(r.dimensions.drawingBoltHoleDiameter.value,3.8);assert.equal(r.dimensions.cadBoltHoleDiameter.value,4);assert.equal(r.mounting_patterns.length,0);assert.equal(k.manifest.mid_mounts[0].catalogue_datum_offset_status,'assumed');assert.ok(r.sources.some(s=>s.id==='cad'&&s.url.endsWith('.zip')));
  assert.match(k.files['MEH-CAD-handoff/START_HERE.md'],/Exact installed mounting-seat datum is unresolved/);assert.match(k.files['MEH-CAD-handoff/START_HERE.md'],/no automatic drilling guides/);
 }
});
test('CAD ZIP extracts with valid CRC, parseable JSON/OBJ and a binary STL with matching triangle data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'meh-cad-')),file=path.join(dir,'handoff.zip');
 try{fs.writeFileSync(file,Z.create(handoff().files));const result=cp.spawnSync('python3',['-c',`
import zipfile,json,struct,sys,math
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
p='MEH-CAD-handoff/'
m=json.loads(z.read(p+'CAD_handoff.json')); d=json.loads(z.read(p+'MEH_design_study.json'))
assert m['normalized_design_state']['midDriver']==d['state']['midDriver']
raw=z.read(p+'horn_blank_uncut.stl'); n=struct.unpack_from('<I',raw,80)[0]; assert len(raw)==84+50*n
for i in range(n): assert all(math.isfinite(v) for v in struct.unpack_from('<12f',raw,84+50*i))
vertices=0; objects=0; faces=0
for line in z.read(p+'assembly_reference.obj').decode().splitlines():
 if line.startswith('v '):
  v=list(map(float,line.split()[1:])); assert len(v)==3 and all(map(math.isfinite,v)); vertices+=1
 elif line.startswith('f '):
  ids=list(map(int,line.split()[1:])); assert len(ids)==3 and min(ids)>=1 and max(ids)<=vertices; faces+=1
 elif line.startswith('o '): objects+=1
assert objects==len(m['parts']) and vertices==sum(p['vertex_count'] for p in m['parts']) and faces==sum(p['triangle_count'] for p in m['parts'])
`,file],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CAD handoff action exports the freshly applied design and keeps individual export choices available',async()=>{
 const {context,scripts}=require('./load-editor.cjs')();context.document={getElementById:()=>null};context.TextEncoder=TextEncoder;vm.runInContext(scripts.at(-1),context);
 const nodes=new Map(),saved=[];const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:selector==='[data-ex-format]'?'stl':'blank',events:{},addEventListener(k,fn){this.events[k]=fn;}});return nodes.get(selector);};
 let reads=0;const host={querySelector:node};const panel=context.MEHFileExportPanel.init(host,{getDesign:()=>{reads++;return design;},save:(...args)=>saved.push(args)});
 const result=await panel.run(true);assert.ok(result);assert.equal(reads,1);assert.equal(saved[0][0],'MEH_CAD_handoff.zip');assert.equal(saved[0][2],'application/zip');assert.match(host.innerHTML,/Individual CAD files/);assert.match(node('[data-ex-status]').textContent,/Import geometry as mm/);
});
