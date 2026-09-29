'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),migration=require('../driver-research/geometry-source-migration.json'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
test('catalogue source migration preserves original native snapshot and exact qualified air surfaces',()=>{
 assert.equal(hash(fs.readFileSync(path.join(root,migration.originalNativeSnapshot.path))),migration.originalNativeSnapshot.sha256);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.equal(hash(scripts[4]),migration.currentGeometryScriptSHA256);
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'meh-catalogue-parity-'));
 try{
  const result=cp.spawnSync(process.execPath,['native-front-fem/geometry/extract-air.cjs','index.html','examples/user-saved-study.json',hash(html),directory],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  for(const row of migration.qualifiedPayloads){const current=JSON.parse(fs.readFileSync(path.join(directory,row.case+'-air.json'))),original=JSON.parse(fs.readFileSync(path.join(root,'native-front-fem/geometry',row.case+'-air.json')));const payload=x=>JSON.stringify({vertices_m:x.vertices_m,faces:x.faces,face_tags:x.face_tags});assert.match(row.payloadSHA256,/^[a-f0-9]{64}$/);assert.equal(hash(payload(current)),row.payloadSHA256);assert.equal(hash(payload(original)),row.payloadSHA256);assert.equal(current.metadata.source_state.midDriver,'bc6ndl38');assert.equal(current.metadata.source_state.compressionDriver,'bms4594he');assert.equal(current.metadata.signed_volume_m3,row.volumeM3);}
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
