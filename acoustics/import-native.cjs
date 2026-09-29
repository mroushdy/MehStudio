/* Convert reviewed native schema v1 into the portable browser contract.
 * This does not qualify a solve. Native row-by-row qualification is required.
 */
const fs=require('node:fs'),path=require('node:path');
function convert(raw){
 if(raw.schemaVersion!==1||raw.available!==true)throw Error('Native result must be available, qualified schema v1.');
 const c=raw.conventions;
 if(c?.time!=='exp(+j omega t)'||c.amplitude!=='RMS'||c.flow!=='m3/s INTO local air domain'||c.impedance!=='Pa s/m3')throw Error('Unreviewed native convention.');
 if(raw.ports?.sourceBasis!=='beta=n_air dot (+z) / coneProjectedAreaM2; inward rigid cone motion is along -z'||raw.ports.outletBasis!=='uniform inward normal velocity over nonplanar horn-entry star-fan interface')throw Error('Unreviewed source or outlet basis.');
 if(!raw.assumptions?.includes('Whole front passage included; do not add neck mass or end correction again.'))throw Error('Native domain extent is missing.');
 const required=['threeMeshFrequencyMatch','matrixChange','decreasingMatrixChange','loadedTransferChange','loadedPhaseChange','reciprocity','passivity','linearResidual','powerBalance','meshVolume','awayFromClosedMode'];
 const rows=raw.rows.map(row=>{
  const checks=row.qualification?.checks,qualified=row.available===true&&row.qualification?.qualified===true&&required.every(key=>checks?.[key]===true)&&Object.values(checks).every(value=>value===true);
  if(row.available===true&&!qualified)throw Error('An available native row lacks all required checks.');
  return {...row,available:qualified,qualified,reason:qualified?'':'Native qualification failed: '+required.filter(key=>checks?.[key]!==true).join(', ')};
 });
 if(rows.filter(row=>row.available).length<2)throw Error('Need at least two independently qualified frequencies.');
 return {...raw,format:'MEH-spatial-front-v1',nativeConventions:c,conventions:{phasor:c.time,amplitude:c.amplitude,flows:'into-domain',impedanceUnits:c.impedance,domain:'cone-to-horn-entry'},coneProjectedAreaM2:raw.ports.coneProjectedAreaM2,convergence:{...raw.convergence,passed:true},rows};
}
module.exports={convert};
if(require.main===module){
 const source=process.argv[2],destination=process.argv[3]||path.join(__dirname,'data/current-insert.json');
 if(!source)throw Error('Usage: node acoustics/import-native.cjs qualified-native.json [destination.json]');
 const data=convert(JSON.parse(fs.readFileSync(source,'utf8'))),{context:c}=require('../tests/load-editor.cjs')(path.join(__dirname,'../index.html')),a=c.MEH.analyze(data.inputState),check=c.MEHSpatialStudy.validate(data,a);
 if(!check.available)throw Error(check.reason);
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({destination,qualifiedHz:data.rows.filter(r=>r.available).map(r=>r.frequencyHz)}));
}
