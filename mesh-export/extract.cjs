#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const geometry=require('./geometry.cjs');
function extract(input,output,options={}){
 const source=path.resolve(options.editor||path.join(__dirname,'../index.html'));
 const bytes=fs.readFileSync(input),design=JSON.parse(bytes),{context}=require('../tests/load-editor.cjs')(source);
 const result=geometry.buildGeometry(context.MEH,design,options);
 result.manifest.source_design_file_sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 result.manifest.editor_sha256=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
 result.manifest.source_design_filename=path.basename(input);
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result));
 return result;
}
if(require.main===module){
 const {values,positionals:args}=require('node:util').parseArgs({allowPositionals:true,options:{volume:{type:'boolean'},'rear-vent-basis':{type:'boolean'},help:{type:'boolean'}}});
 if(values.help){console.log('Usage: node mesh-export/extract.cjs DESIGN.json JOB.json [MAX_HZ] [ELEMENTS_PER_WAVELENGTH] [--volume] [--rear-vent-basis]');process.exit(0);}
 const input=path.resolve(args[0]||path.join(__dirname,'../examples/acoustic-mesh-study.json')),output=path.resolve(args[1]||path.join(__dirname,'../work/acoustic-geometry.json'));
 const result=extract(input,output,{maxFrequencyHz:args[2]?Number(args[2]):1000,elementsPerWavelength:args[3]?Number(args[3]):8,volumeMesh:values.volume===true,rearVentBasis:values['rear-vent-basis']===true});
 console.log(JSON.stringify({output,schema:result.schema,design_sha256:result.manifest.design_sha256,branches:result.parts.branches.map(b=>({id:b.id,vertices:b.vertices_m.length,triangles:b.faces.length,volume_cm3:b.checks.signed_volume_m3*1e6,source_projected_cm2:b.source_projected_area_m2*1e4,minimum_insert_vertex_clearance_mm:b.checks.minimum_insert_vertex_axial_clearance_m*1000})),horn_stations:result.horn.inner_profile_m.length,enclosure:result.enclosure.kind,enclosure_stations:result.enclosure.outer_profile_m?.length??null},null,2));
}
module.exports={extract};
