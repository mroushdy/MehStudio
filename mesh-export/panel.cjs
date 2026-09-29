/* Offline export controls. This creates a native meshing input, not a solver mesh. */
(function(root){
'use strict';
const defaults=Object.freeze({maxFrequencyHz:1000,elementsPerWavelength:8,volumeMesh:false,rearVentBasis:false});
function readOptions(frequency,density,volumeMesh,rearVentBasis){
 const number=value=>String(value).trim()===''?NaN:Number(value),maxFrequencyHz=number(frequency),elementsPerWavelength=number(density);
 if(!Number.isFinite(maxFrequencyHz)||maxFrequencyHz<100||maxFrequencyHz>10000)throw Error('Enter a highest frequency from 100 to 10,000 Hz.');
 if(!Number.isInteger(elementsPerWavelength)||elementsPerWavelength<6||elementsPerWavelength>20)throw Error('Enter 6 to 20 elements per wavelength.');
 return {maxFrequencyHz,elementsPerWavelength,volumeMesh:volumeMesh===true,rearVentBasis:rearVentBasis===true};
}
function download(name,text,type){
 const url=root.URL.createObjectURL(new root.Blob([text],{type})),link=root.document.createElement('a');
 link.href=url;link.download=name;link.click();root.setTimeout(()=>root.URL.revokeObjectURL(url),1000);
}
function init(host,{getDesign,buildJob,save=download,exportButton,runnerPackage=root.MEHMeshRunnerPackage}={}){
 if(!host)return null;
 if(typeof getDesign!=='function')throw Error('Acoustic export requires the current saved design.');
 if(host.__mehMeshExportPanel)return host.__mehMeshExportPanel;
 let busy=false,lastJob=null,disposed=false;
 host.innerHTML=`<style>
 #meshExport{border-top:1px solid var(--line,#d9dfd9);margin-top:20px;padding-top:14px}#meshExport>summary{font-size:14px;cursor:pointer}#meshExport .mx-head{display:flex;align-items:center;gap:12px;margin-top:12px}#meshExport p{font-size:12px;line-height:1.5;color:var(--muted,#526360);margin:8px 0}#meshExport .mx-head p{margin:0}#meshExport .mx-controls{display:flex;flex-wrap:wrap;gap:12px 20px;margin:16px 0}#meshExport label{font-size:12px;display:flex;flex-direction:column;gap:6px}#meshExport input[type=number]{box-sizing:border-box;width:145px;padding:7px}#meshExport .mx-check{display:flex;flex-direction:row;align-items:center;gap:7px}#meshExport .mx-check input{margin:0}#meshExport details{margin-top:12px;font-size:12px}#meshExport details summary{cursor:pointer}#meshExport pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;background:var(--soft,#edf1ed);padding:10px;border-radius:4px}#meshExport .mx-info{padding:4px 12px;margin:10px 0;background:var(--soft,#edf1ed);border-radius:4px}#meshExport [hidden]{display:none!important}#meshExport button:disabled{opacity:.5;cursor:default}#meshExport .mx-state[data-error=true]{color:#9a4529}@media(max-width:500px){#meshExport .mx-controls{gap:12px}#meshExport input[type=number]{width:130px}}
 </style>
 <summary>Acoustic solver export <span class="tag">Prototype</span></summary>
 <div class="mx-head"><p>Download a geometry job, then build solver files on your computer.</p><button class="field-info" type="button" data-mx-help aria-label="About acoustic solver export" aria-expanded="false" aria-controls="meshExportInfo">i</button></div>
 <div class="mx-info" id="meshExportInfo" data-mx-info hidden><p>The geometry job is not a mesh. The downloadable local runner creates the Gmsh boundary and ABEC project, then checks joins, normals, intersections and source tags. Setup requires Python and Node.js; meshing runs on your computer.</p><p>The horn mouth couples the inside pressure field to exterior radiation. Independent inside and outside simulations do not preserve that loading. Manufacturing surfaces and display meshes are not acoustic domains.</p><p>Sealed designs retain rear loading as metadata. Rear-vent bases prescribe independent velocity at vent inlets; they require rear-cavity and motor coupling before predicting a ported loudspeaker response. Unsupported geometry is rejected with a reason.</p><p>Assumed cone geometry and lossless rigid walls still need physical validation. The ABEC project requires review in AKABAK; native AKABAK import and solve are unverified; exporting a mesh does not calculate a response.</p></div>
 <div class="mx-controls"><label>Highest frequency (Hz)<input data-mx-frequency type="number" min="100" max="10000" step="100" value="1000"></label><label>Elements / wavelength<input data-mx-density type="number" min="6" max="20" step="1" value="8"></label></div>
 <label class="mx-check"><input data-mx-vent-basis type="checkbox">Rear-vent velocity bases (ported designs)</label>
 <label class="mx-check"><input data-mx-volume type="checkbox">Try whole-front FEM mesh (experimental)</label>
 <p><button type="button" data-mx-download>Download geometry job</button> <button type="button" data-mx-runner>Download local runner</button></p>
 <p class="mx-state" data-mx-status role="status" aria-live="polite">Native meshing is required to produce solver files.</p>
 <details><summary>Build solver files · 3 steps</summary><p>1. Download the geometry job and local runner ZIP above.<br>2. Extract the runner and follow START_HERE.md to install Python, Node.js and the meshing libraries once.<br>3. Put the job in the runner folder and run:</p><pre>python3 run.py MEH_acoustic_geometry.json</pre><p>On Windows use <code>py -3.12</code> instead of <code>python3</code>. Open the completed bundle’s <code>abec/project.abec</code> in AKABAK for inspection/import. The runner preserves your job, writes a log and withholds completion when a check fails. <a href="https://github.com/mroushdy/MehStudio/tree/main/mesh-export" target="_blank" rel="noopener">Full exporter guide</a>.</p><p>Density is a starting point, not a validated frequency band. Exact narrow gaps may need substantial memory. Whole-front FEM is experimental; failed volumes are withheld.</p></details>`;
 const q=selector=>host.querySelector(selector),button=q('[data-mx-download]'),status=q('[data-mx-status]');
 function message(text,error=false){status.textContent=text;status.setAttribute('data-error',String(error));}
 function options(){return readOptions(q('[data-mx-frequency]').value,q('[data-mx-density]').value,q('[data-mx-volume]').checked,q('[data-mx-vent-basis]').checked);}
 function refresh(){if(busy||disposed)return;lastJob=null;message('The download will use the current design and drive settings. Native meshing is required.');}
 async function run(){
  if(busy||disposed)return null;
  busy=true;lastJob=null;button.disabled=true;message('Preparing current acoustic geometry…');
  try{
   const configuration=options();
   // Re-read the design at the moment of export; the editor flushes pending edits here.
   const design=getDesign();
   const create=buildJob||root.MEHMeshGeometry?.buildJob;
   if(typeof create!=='function')throw Error('The canonical geometry exporter is unavailable.');
   const job=await create(design,configuration);
   if(disposed)return null;
   if(!job||!job.manifest)throw Error('The geometry exporter returned no boundary manifest.');
   save('MEH_acoustic_geometry.json',JSON.stringify(job),'application/json');lastJob=job;
   message('Geometry job downloaded. Download the local runner and follow START_HERE.md to build solver files; no response has been calculated.');
   return job;
  }catch(error){if(!disposed)message('Export unavailable: '+(error?.message||String(error)),true);return null;}
  finally{busy=false;if(!disposed)button.disabled=false;}
 }
 function saveRunner(){try{if(!runnerPackage?.base64)throw Error('The local runner is missing. Download a current copy of MEH Studio.');const bytes=Uint8Array.from(root.atob(runnerPackage.base64),c=>c.charCodeAt(0));save(runnerPackage.filename,bytes,'application/zip');message('Local runner downloaded. Extract the ZIP and follow START_HERE.md; setup is required once.');}catch(error){message('Runner unavailable: '+(error?.message||String(error)),true);}}
 const showHelp=()=>{const info=q('[data-mx-info]');info.hidden=!info.hidden;q('[data-mx-help]').setAttribute('aria-expanded',String(!info.hidden));};
 q('[data-mx-help]').addEventListener('click',showHelp);button.addEventListener('click',run);q('[data-mx-runner]').addEventListener('click',saveRunner);
 for(const selector of ['[data-mx-frequency]','[data-mx-density]','[data-mx-volume]','[data-mx-vent-basis]'])q(selector).addEventListener('input',refresh);
 exportButton?.addEventListener('click',refresh);
 const api={run,refresh,get options(){return options();},get job(){return lastJob;},dispose(){disposed=true;exportButton?.removeEventListener('click',refresh);delete host.__mehMeshExportPanel;}};
 host.__mehMeshExportPanel=api;return api;
}
const api={defaults,readOptions,init};root.MEHMeshExportPanel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
