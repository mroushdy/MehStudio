#!/usr/bin/env node
/* v5 assembly: meh5.html = shell.html with the standalone profile-law module
   inlined before the engine, then the two-way core and retired CAD slot.
   Run BEFORE gate.js; gate validates output.
   Run: node assemble.js */
'use strict';
const fs=require('fs');
const sh=fs.readFileSync('shell.html','utf8');
const pl=fs.readFileSync('profile-laws.js','utf8');
const en=fs.readFileSync('engine.js','utf8');
const tw=fs.readFileSync('twoway-core.js','utf8');
if(!sh.includes('/*__PROFILE_LAWS__*/')) throw new Error('shell profile-law marker missing');
if(!sh.includes('/*__ENGINE__*/')) throw new Error('shell engine marker missing');
if(!sh.includes('/*__TWOWAY__*/')) throw new Error('shell two-way marker missing');
const out=sh.replace('/*__PROFILE_LAWS__*/',()=>pl)
  .replace('/*__ENGINE__*/',()=>en).replace('/*__TWOWAY__*/',()=>tw)
  .replace('/*__CAD__*/','/* parametric */');
fs.writeFileSync('meh5.html',out);
console.log('assembled meh5.html — '+out.length+' bytes');
