'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const wrap=x=>((x+180)%360+360)%360-180;
function parseDelimited(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()&&!x.trim().startsWith('#')),delimiter=lines[0]?.includes('\t')?'\t':',';
 if(!lines.length)throw Error('Empty curve file');
 const split=s=>s.split(delimiter).map(x=>x.trim().replace(/^"(.*)"$/,'$1')),headers=split(lines.shift());
 const rows=lines.map((line,index)=>{const values=split(line);if(values.length!==headers.length)throw Error('Column count mismatch on data line '+(index+1));const row={};headers.forEach((header,i)=>{if(!values[i]||!Number.isFinite(Number(values[i])))throw Error('Missing/nonfinite value in '+header+' at data line '+(index+1));row[header]=Number(values[i]);});return row;});
 return {headers,rows};
}
function hornrespRows(text){
 const {headers,rows}=parseDelimited(text),required=['Freq (hertz)','Ra (norm)','Xa (norm)','SPL (dB)','Ze (ohms)','Xd (mm)','WPhase (deg)','ZePhase (deg)'];
 for(const key of required)if(!headers.includes(key))throw Error('Missing native Hornresp column '+key);
 return rows.map(r=>({frequency_hz:r['Freq (hertz)'],za_real_normalized:r['Ra (norm)'],za_imag_normalized:r['Xa (norm)'],spl_db:r['SPL (dB)'],ze_ohm:r['Ze (ohms)'],excursion_peak_mm:r['Xd (mm)'],phase_deg:r['WPhase (deg)'],ze_phase_deg:r['ZePhase (deg)']}));
}
function validateRows(rows){if(rows.length<2)throw Error('Need at least two sampled frequencies');rows.forEach((r,i)=>{if(!(r.frequency_hz>0)||i&&r.frequency_hz<=rows[i-1].frequency_hz)throw Error('Frequency samples must be positive, unique, increasing');});}
function interpolate(rows,f,key,phase=false){
 if(f<rows[0].frequency_hz||f>rows.at(-1).frequency_hz)throw Error('Extrapolation is forbidden');
 const hi=rows.findIndex(r=>r.frequency_hz>=f),a=rows[Math.max(0,hi-1)],b=rows[hi];if(!Number.isFinite(a[key])||!Number.isFinite(b[key]))throw Error('Missing comparison column '+key);
 if(a.frequency_hz===b.frequency_hz)return a[key];const t=Math.log(f/a.frequency_hz)/Math.log(b.frequency_hz/a.frequency_hz);return a[key]+t*(phase?wrap(b[key]-a[key]):b[key]-a[key]);
}
function compare(reference,candidate,{bandHz=[20,1000],includePhase=false,allowInterpolation=false}={}){
 validateRows(reference);validateRows(candidate);
 const fields=['spl_db','ze_ohm','excursion_peak_mm','za_real_normalized','za_imag_normalized','ze_phase_deg',...(includePhase?['phase_deg']:[])],selected=reference.filter(r=>r.frequency_hz>=bandHz[0]&&r.frequency_hz<=bandHz[1]);if(selected.length<2)throw Error('Fewer than two reference samples in comparison band');
 const exact=new Map(candidate.map(r=>[r.frequency_hz,r])),metrics={},differences=[];let interpolatedSamples=0;
 for(const r of selected){const match=exact.get(r.frequency_hz);if(!match&&!allowInterpolation)throw Error('Candidate must be solved at native reference frequencies; interpolation was not authorized');if(!match)interpolatedSamples++;const out={frequency_hz:r.frequency_hz};for(const key of fields){const v=match?match[key]:interpolate(candidate,r.frequency_hz,key,key.includes('phase'));if(!Number.isFinite(v)||!Number.isFinite(r[key]))throw Error('Nonfinite comparison '+key);out[key]=key.includes('phase')?wrap(v-r[key]):v-r[key];}differences.push(out);}
 for(const key of fields){const values=differences.map(r=>r[key]),max=Math.max(...values.map(Math.abs)),ix=values.findIndex(x=>Math.abs(x)===max);metrics[key]={maxAbsolute:max,rms:Math.sqrt(values.reduce((s,x)=>s+x*x,0)/values.length),meanSigned:values.reduce((s,x)=>s+x,0)/values.length,worstFrequencyHz:differences[ix].frequency_hz};if(!key.includes('db')&&!key.includes('phase')){const scale=Math.max(...selected.map(r=>Math.abs(r[key])));metrics[key].rmsNormalizedToReferenceMax=metrics[key].rms/Math.max(1e-20,scale);}}
 return {sampleCount:selected.length,bandHz,interpolatedSamples,phaseCompared:includePhase,metrics,differences};
}
function csv(rows){const headers=Object.keys(rows[0]);return headers.join(',')+'\n'+rows.map(row=>headers.map(k=>row[k]).join(',')).join('\n')+'\n';}
function verifyReference(manifest,raw,caseData){
 if(manifest.schema!=='meh-hornresp-reference/v1'||manifest.provenance?.kind!=='native-hornresp-export')throw Error('Reference must declare native Hornresp export provenance');
 for(const key of ['version','source','rawSha256'])if(!manifest.provenance[key])throw Error('Missing reference provenance '+key);
 if(sha256(raw)!==manifest.provenance.rawSha256)throw Error('Raw reference hash mismatch');
 if(manifest.caseId!==caseData.id)throw Error('Case ID mismatch');
 if(manifest.caseSha256!==sha256(JSON.stringify(caseData)))throw Error('Case definition hash mismatch');
 for(const key of ['driveConvention','massConvention','distanceM','solidAngleSr','radiationModel'])if(manifest.conventions?.[key]!==caseData[key])throw Error('Reference convention mismatch: '+key);
 if(manifest.conventions.densityKgM3!==caseData.medium.densityKgM3||manifest.conventions.soundSpeedMS!==caseData.medium.soundSpeedMS)throw Error('Medium mismatch');
 return true;
}
if(require.main===module){
 try{const [referenceFile,candidateFile,manifestFile,caseFile,outFile]=process.argv.slice(2);if(!outFile)throw Error('Usage: node benchmarks/compare.cjs reference.txt candidate.csv manifest.json case.json report.json');const raw=fs.readFileSync(referenceFile),m=JSON.parse(fs.readFileSync(manifestFile)),c=JSON.parse(fs.readFileSync(caseFile));verifyReference(m,raw,c);const result=compare(hornrespRows(raw.toString('utf8')),parseDelimited(fs.readFileSync(candidateFile,'utf8')).rows,{bandHz:c.comparisonBandHz,includePhase:m.conventions.phaseVerified===true});fs.writeFileSync(outFile,JSON.stringify({status:'native-reference-compared',reference:manifestFile,...result},null,2)+'\n');console.log(JSON.stringify({status:'native-reference-compared',samples:result.sampleCount,metrics:result.metrics},null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={parseDelimited,hornrespRows,compare,csv,sha256,verifyReference};
