'use strict';
// Solve at the source's exact sample frequencies. This does not certify provenance.
const fs=require('node:fs'),{simulate}=require('./candidate.cjs'),{hornrespRows,csv}=require('./compare.cjs');
if(require.main===module){try{const [caseFile,nativeFile,outFile]=process.argv.slice(2);if(!outFile)throw Error('Usage: node benchmarks/sample.cjs case.json native.txt candidate.csv');const c=JSON.parse(fs.readFileSync(caseFile)),reference=hornrespRows(fs.readFileSync(nativeFile,'utf8')),candidate=simulate(c,reference.map(r=>r.frequency_hz));fs.writeFileSync(outFile,csv(candidate));console.log('Solved '+candidate.length+' candidate points at exact native frequencies.');}catch(e){console.error(e.message);process.exitCode=1;}}
