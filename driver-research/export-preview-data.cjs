'use strict';
const fs=require('node:fs'),path=require('node:path'),R=require('./model-runtime.js');
const output=process.argv[2];if(!output)throw Error('Supply an output JSON path.');
const records=fs.readdirSync(path.join(__dirname,'records')).filter(f=>f.endsWith('.json')).sort().map(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'records',f))));
fs.writeFileSync(output,JSON.stringify(records.map(record=>({record,model:R.makeModel(record,{segments:48})}))));
