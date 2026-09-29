#!/usr/bin/env node
'use strict';
// Bridge for build_mesh.py. The geometry builder owns its output directory;
// this adapter writes only the abec/ child and an adapter validation report.
const fs=require('node:fs'),path=require('node:path');
const {buildAbecProject}=require('./abec-project.cjs');
function writeBundle(directory){
 const out=path.resolve(directory),manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')),mesh=JSON.parse(fs.readFileSync(path.join(out,'bem-air-outward.json'),'utf8'));
 const last=manifest.horn_stations?.at(-1);
 if(!last||!Number.isFinite(last.z_m))throw new Error('Canonical mouth rim station is missing from manifest');
 // This is the declared canonical rolled-rim plane, not a coordinate inferred
 // from a bounding box. All axis conventions come from the source manifest.
 const mouthCenterM=manifest.observation_frame?.origin_m||[0,0,last.z_m];
 const bundle=buildAbecProject({manifest,mesh},{normalConvention:'air-outward',mouthCenterM});
 const dir=path.join(out,'abec');fs.mkdirSync(dir,{recursive:true});
 for(const [name,data]of Object.entries(bundle.files))fs.writeFileSync(path.join(dir,name),data);
 fs.writeFileSync(path.join(dir,'adapter-validation.json'),JSON.stringify(bundle.validation,null,2)+'\n');
 return {directory:dir,triangle_count:bundle.validation.checks.triangle_count,source_count:bundle.sources.length,proprietary_solver_validation:'not run'};
}
module.exports={writeBundle};
if(require.main===module){try{if(!process.argv[2])throw new Error('Usage: node mesh-export/write_bundle.cjs native-output-directory');process.stdout.write(JSON.stringify(writeBundle(process.argv[2]),null,2)+'\n');}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}}
