/* Deterministic ZIP of the reviewed local runner. No npm archive dependency. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const FILES=['run.py','requirements.txt','START_HERE.md','build_mesh.py','validate_mesh.py','write_bundle.cjs','abec-project.cjs','boundary-lab-project.cjs'];
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(files){
 const local=[],central=[];let offset=0;
 for(const [name,bytes]of Object.entries(files)){
  const filename=Buffer.from('MEH-local-runner/'+name),data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes),compressed=zlib.deflateRawSync(data,{level:9}),crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(8,8);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(filename.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);
  local.push(h,filename,compressed);central.push(c,filename);offset+=h.length+filename.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
function buildPackage(){
 const files=Object.fromEntries(FILES.map(name=>[name,fs.readFileSync(path.join(__dirname,name))]));
 const manifest={schema:'meh-local-runner/v1',geometry_job_schema:'meh-acoustic-geometry/v1',files:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,{sha256:sha256(bytes),bytes:bytes.length}]))};
 files['package-manifest.json']=JSON.stringify(manifest,null,2)+'\n';
 const bytes=zip(files);return {bytes,sha256:sha256(bytes),manifest};
}
function browserSource(){const bundle=buildPackage();return `/* Local runner is embedded so this download works offline. */\nglobalThis.MEHMeshRunnerPackage=Object.freeze({filename:'MEH-local-runner.zip',sha256:'${bundle.sha256}',base64:'${bundle.bytes.toString('base64')}'});`;}
if(require.main===module){const destination=process.argv[2];if(!destination)throw Error('Usage: node mesh-export/runner-package.cjs OUTPUT.zip');const bundle=buildPackage();fs.mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});fs.writeFileSync(destination,bundle.bytes);console.log(JSON.stringify({file:destination,bytes:bundle.bytes.length,sha256:bundle.sha256}));}
module.exports={FILES,buildPackage,browserSource};
