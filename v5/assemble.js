#!/usr/bin/env node
/* v5 assembly: meh5.html = shell.html with the engine inlined at /*__ENGINE__* /
   and the retired CAD slot stamped. Run BEFORE gate.js; gate validates output.
   Run: node assemble.js */
'use strict';
const fs=require('fs');
const sh=fs.readFileSync('shell.html','utf8');
const en=fs.readFileSync('engine.js','utf8');
if(!sh.includes('/*__ENGINE__*/')) throw new Error('shell engine marker missing');
const out=sh.replace('/*__ENGINE__*/',()=>en).replace('/*__CAD__*/','/* parametric */');
fs.writeFileSync('meh5.html',out);
console.log('assembled meh5.html — '+out.length+' bytes');
