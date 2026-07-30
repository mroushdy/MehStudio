#!/usr/bin/env node
/* v5 assembly: meh5.html = shell.html with the standalone profile-law module
   inlined before the engine, then the two-way core, the schema-2 three-way
   analysis stack, and the retired CAD slot.
   Run BEFORE gate.js; gate validates output.
   Run: node assemble.js */
'use strict';
const fs=require('fs');
const sh=fs.readFileSync('shell.html','utf8');
const pl=fs.readFileSync('profile-laws.js','utf8');
const en=fs.readFileSync('engine.js','utf8');
const tw=fs.readFileSync('twoway-core.js','utf8');
/* Dependency order is intentional. In particular render-model must exist
   before threeway-solver captures its browser dependency, and the controller
   is loaded last so it receives the complete canonical solver. The retired
   schema-1 threeway-core.js is deliberately not part of Build 655. */
const THREEWAY_MODULES=Object.freeze([
  'threeway-state-contract.js',
  'threeway-reference-cards.js',
  'threeway-driver-db.js',
  'threeway-family-catalog.js',
  'threeway-analysis-presets.js',
  'threeway-quick-starts.js',
  'threeway-acoustics.js',
  'threeway-chamber-solver.js',
  'threeway-coupled-network.js',
  'threeway-horn-surface.js',
  'threeway-aperture-solver.js',
  'threeway-station-solver.js',
  'threeway-interface-planner.js',
  'threeway-lumen-geometry.js',
  'threeway-passage-solver.js',
  'threeway-mount-host.js',
  'threeway-mount-solver.js',
  'threeway-package-input.js',
  'threeway-package-solver.js',
  'threeway-preview-geometry.js',
  'threeway-solid-geometry.js',
  'threeway-solid-intent.js',
  'threeway-render-assembly.js',
  'threeway-render-model.js',
  'threeway-analysis-export.js',
  'threeway-solver.js',
  'threeway-renderer.js',
  'threeway-solid-plan.js',
  'threeway-exact-kernel.js',
  'threeway-fabrication-gate.js',
  'threeway-controller.js',
  'threeway-ui.js'
]);
const threeway=THREEWAY_MODULES.map(filename=>
  fs.readFileSync(filename,'utf8')
).join('\n\n');
if(!sh.includes('/*__PROFILE_LAWS__*/')) throw new Error('shell profile-law marker missing');
if(!sh.includes('/*__ENGINE__*/')) throw new Error('shell engine marker missing');
if(!sh.includes('/*__TWOWAY__*/')) throw new Error('shell two-way marker missing');
if(!sh.includes('/*__THREEWAY__*/')) throw new Error('shell three-way marker missing');
const out=sh.replace('/*__PROFILE_LAWS__*/',()=>pl)
  .replace('/*__ENGINE__*/',()=>en).replace('/*__TWOWAY__*/',()=>tw)
  .replace('/*__THREEWAY__*/',()=>threeway)
  .replace('/*__CAD__*/','/* parametric */');
fs.writeFileSync('meh5.html',out);
console.log('assembled meh5.html — '+out.length+' bytes');
