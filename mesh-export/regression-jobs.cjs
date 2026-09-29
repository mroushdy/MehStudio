#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const G=require('./geometry.cjs'),{context}=require('../tests/load-editor.cjs')(path.join(__dirname,'../index.html'));
const input=path.resolve(process.argv[2]||path.join(__dirname,'../examples/offset-insert-study.json'));
const output=path.resolve(process.argv[3]||path.join(__dirname,'../work/regression-jobs'));
const bytes=fs.readFileSync(input),design=JSON.parse(bytes);
const cases=[{name:'opening83',patch:{fillerOpening:83}},{name:'offset8',patch:{offset:8}},{name:'slot50x33',patch:{shape:'slot',slotL:50,slotW:33}},{name:'teardrop50x33',patch:{shape:'teardrop',slotL:50,slotW:33}},{name:'insert-off',patch:{frontFiller:'none'}}];
fs.mkdirSync(output,{recursive:true});
const reports=[];
for(const {name,patch}of cases){
 const job=G.buildGeometry(context.MEH,{...design,state:{...design.state,...patch}});
 job.manifest.regression={case:name,patch,baseline_file_sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 const file=path.join(output,name+'.json');fs.writeFileSync(file,JSON.stringify(job));
 reports.push({case:name,file,design_sha256:job.manifest.design_sha256,branch_volume_m3:job.parts.branches[0].checks.signed_volume_m3});
}
fs.writeFileSync(path.join(output,'jobs.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
