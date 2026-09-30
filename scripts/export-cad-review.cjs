/* Generate the actual CAD handoff files for independent native parser checks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),F=require('../exports/formats.cjs'),H=require('../exports/handoff.cjs'),Z=require('../exports/zip.cjs');
const {context:c}=require('../tests/load-editor.cjs')(path.join(__dirname,'../index.html'));
if(!process.argv[2])throw Error('Usage: node scripts/export-cad-review.cjs OUTPUT_DIRECTORY [DESIGN_JSON]');
const out=path.resolve(process.argv[2]),design=JSON.parse(fs.readFileSync(process.argv[3]||path.join(__dirname,'../examples/offset-insert-study.json'),'utf8'));
const a=c.MEH.analyze(design.state),kit=H.build(a,design,{formats:F,buildMeshes:c.MEHMeshes,model:c.MEH});
fs.mkdirSync(out,{recursive:true});for(const [name,data]of Object.entries(kit.files)){const file=path.join(out,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}
fs.writeFileSync(path.join(out,'MEH_CAD_handoff.zip'),Z.create(kit.files));
// The existing native STEP check compares the same horn as a solid, reference
// surface mesh and NURBS surfaces; it does not assert an assembly is a solid.
const blank=F.hornBlank(a);fs.writeFileSync(path.join(out,'horn.step'),F.facetedStep([blank]));fs.writeFileSync(path.join(out,'reference.step'),F.facetedStep([{...blank,closed:false}]));fs.writeFileSync(path.join(out,'surfaces.step'),F.nurbsStep(a));
process.stdout.write(JSON.stringify({output:out,parts:kit.manifest.parts.length,triangles:kit.manifest.parts.reduce((s,p)=>s+p.triangle_count,0),units:'mm'})+'\n');
