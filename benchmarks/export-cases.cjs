'use strict';
// Writes parameter records in the observed native Hornresp 55.30 text syntax.
// They have NOT yet been import-roundtripped through the installed application.
const fs=require('node:fs'),path=require('node:path'),cases=require('./cases.cjs');
const template=fs.readFileSync(path.join(__dirname,'references/kolbrek/conExpSp.txt'),'latin1');
function record(c,b){
 const replaceBlock=(t,start,end,content)=>t.replace(new RegExp('\\|'+start+'[\\s\\S]*?(?=\\|'+end+')'),`|${start}\n\n${content}\n\n`),n=x=>Number(x.toPrecision(12));
 let text=template.replace(/^Comment = .*$/m,`Comment = MEH Studio benchmark ${c.id} ${b.id} - NATIVE CAPTURE PENDING`).replace(/^Ang = .*$/m,`Ang = ${b.id==='Nd'?c.solidAngleSr/Math.PI:0} x Pi`).replace(/^Eg = .*$/m,`Eg = ${b.voltageRms}`);
 let geometry='';if(b.id==='Nd'){c.segments.forEach((s,i)=>geometry+=`S${i+1} = ${n(s.area1M2*1e4)}\nS${i+2} = ${n(s.area2M2*1e4)}\n${s.type==='conical'?'Con':'Exp'} = ${n(s.lengthM*100)}\nF${i+1}${i+2} = 0.00\n`);for(let i=c.segments.length;i<4;i++)geometry+=`S${i+1} = 0.00\nS${i+2} = 0.00\nL${i+1}${i+2} = 0.00\nF${i+1}${i+2} = 0.00\n`;}else{geometry=`Ap1 = ${n(b.portAreaM2*1e4)}\nAp2 = 0.00\nLp  = ${n(b.portLengthM*100)}\nF12 = 0.00\n`;for(let i=1;i<4;i++)geometry+=`S${i+1} = 0.00\nS${i+2} = 0.00\nL${i+1}${i+2} = 0.00\nF${i+1}${i+2} = 0.00\n`;}
 text=replaceBlock(text,'HORN PARAMETER VALUES:','TRADITIONAL DRIVER PARAMETER VALUES:',geometry.trim());const d=b.driver;
 text=replaceBlock(text,'TRADITIONAL DRIVER PARAMETER VALUES:','ADVANCED DRIVER PARAMETER VALUES FOR SEMI-INDUCTANCE MODEL:',`Sd = ${n(d.SdM2*1e4)}\nBl = ${d.Bl}\nCms = ${d.CmsMPerN}\nRms = ${d.RmsNsPerM}\nMmd = ${n(d.MmdKg*1000)}\nLe = ${n(d.LeH*1000)}\nRe = ${d.ReOhm}\n${b.id} = 1`);
 text=replaceBlock(text,'CHAMBER PARAMETER VALUES:','MAXIMUM SPL PARAMETER VALUES:',`Vrc = ${n(b.rearVolumeM3*1000)}\nLrc = 16.00\nFr = 0.00\nTal = 0.00\nVtc = ${n(b.frontVolumeM3*1e6)}\nAtc = ${n(d.SdM2*1e4)}\n\nAcoustic Path Length = 0.0`);
 return text.replace(/^End Correction Flag = .*$/m,'End Correction Flag = 0').replace(/\r?\n/g,'\r\n');
}
if(require.main===module){const folder=path.join(__dirname,'cases');fs.mkdirSync(folder,{recursive:true});for(const c of cases.filter(c=>!c.reference.curves))for(const b of c.branches)fs.writeFileSync(path.join(folder,`${c.id}-${b.id}.hornresp.txt`),record(c,b),'latin1');console.log('Exported three pending native input records. Import/activation and option verification still required.');}
module.exports={record};
