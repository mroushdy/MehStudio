#!/usr/bin/env node
'use strict';
// Generate reproducible canonical jobs without committing multi-megabyte meshes.
// Usage: node mesh-export/regression-suite.cjs [output-directory]
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const G=require('./geometry.cjs'),repository=path.resolve(__dirname,'..');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function generate(output=path.join(repository,'work/regression-jobs'),fixtureFile=path.join(repository,'examples/mesh-export-regressions.json')){
 output=path.resolve(output);fixtureFile=path.resolve(fixtureFile);
 const definitionBytes=fs.readFileSync(fixtureFile),definition=JSON.parse(definitionBytes);
 assert.equal(definition.schema,'meh-mesh-regression-fixtures/v1','Unsupported fixture schema');
 const sourceFile=path.resolve(repository,definition.source_design.path),sourceBytes=fs.readFileSync(sourceFile),source=JSON.parse(sourceBytes);
 assert.equal(sha(sourceBytes),definition.source_design.file_sha256,'Saved design bytes changed: review geometry provenance and explicitly update the fixture baseline');
 assert.equal(G.sha256(G.stableStringify(source)),definition.source_design.canonical_design_sha256,'Saved canonical design hash changed');
 const editor=path.join(repository,'index.html'),editorHash=sha(fs.readFileSync(editor)),{context}=require('../tests/load-editor.cjs')(editor),reports=[];
 fs.mkdirSync(output,{recursive:true});
 const ids=new Set();
 for(const fixture of definition.cases){
  assert.match(fixture.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Fixture IDs must be safe filenames');assert.ok(!ids.has(fixture.id),'Duplicate fixture ID');ids.add(fixture.id);
  const design={...source,state:{...source.state,...fixture.state_patch}},options={...definition.defaults.options,...fixture.options},native={...definition.defaults.native,...fixture.native};
  const job=G.buildGeometry(context.MEH,design,options),drivers=job.manifest.drivers,vents=job.manifest.vent_sources||[];
  assert.equal(drivers.length,fixture.expected.driver_count,fixture.id+' driver count');assert.equal(vents.length,fixture.expected.vent_source_count,fixture.id+' vent count');
  if(fixture.expected.design_sha256)assert.equal(job.manifest.design_sha256,fixture.expected.design_sha256,fixture.id+' exact saved-design parity');
  const fit=context.MEH.mechanicalFitReasons(context.MEH.analyze(design.state));assert.equal(fit.length,0,fixture.id+': '+fit.join(' '));
  const sourceTags=[...drivers,...vents].map(s=>s.source_tag);assert.equal(new Set(sourceTags).size,sourceTags.length,'Independent source tags must be unique');
  job.manifest.editor_sha256=editorHash;
  job.manifest.regression={case:fixture.id,fixture_definitions_sha256:sha(definitionBytes),baseline_source_path:definition.source_design.path,baseline_file_sha256:definition.source_design.file_sha256,baseline_canonical_design_sha256:definition.source_design.canonical_design_sha256,state_patch:fixture.state_patch};
  const filename=fixture.id+'.json',file=path.join(output,filename),bytes=JSON.stringify(job);fs.writeFileSync(file,bytes);
  const nativeArguments=['--no-volume','--size-mm',String(native.size_mm),'--profile-tolerance-mm',String(native.profile_tolerance_mm)];
  reports.push({id:fixture.id,description:fixture.description,file,job:filename,job_file_sha256:sha(bytes),design_sha256:job.manifest.design_sha256,normalized_state_sha256:job.manifest.normalized_state_sha256,options,native,native_arguments:nativeArguments,expected:{...fixture.expected,source_tags:sourceTags,entry_interface_tags:drivers.map(d=>d.entry_interface_tag),independent_source_count:sourceTags.length,enclosure_kind:job.enclosure.kind,connected_air_boundary_components:1},geometry:{branch_volume_m3:job.parts.branches.map(b=>b.checks.signed_volume_m3),source_projected_area_m2:drivers.map(d=>d.projected_mesh_area_m2),vent_projected_area_m2:vents.map(v=>v.projected_mesh_area_m2),minimum_adapter_sector_clearance_m:job.enclosure.checks?.minimum_adapter_sector_clearance_m??null},validation_status:'Canonical extraction and mechanical preflight passed; native assembly/intersection validation and proprietary import/solve are not established by this generator.'});
 }
 assert.ok(ids.has(definition.density_pair.case),'Density pair must name an emitted case');
 const report={schema:'meh-mesh-regression-jobs/v1',scope:definition.scope,fixture_definitions_sha256:sha(definitionBytes),source_design:definition.source_design,editor_sha256:editorHash,density_pair:definition.density_pair,cases:reports};
 fs.writeFileSync(path.join(output,'cases.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(require.main===module){try{const report=generate(process.argv[2]);console.log(JSON.stringify({output:path.dirname(report.cases[0].file),cases:report.cases.map(c=>({id:c.id,drivers:c.expected.driver_count,vents:c.expected.vent_source_count,sources:c.expected.source_tags})),density_pair:report.density_pair},null,2));}catch(error){console.error('Regression generation failed: '+error.message);process.exitCode=1;}}
module.exports={generate};
