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
 #meshExport{border-top:1px solid var(--line,#d9dfd9);margin-top:20px;padding-top:14px}#meshExport>summary{font-size:14px;cursor:pointer}#meshExport .mx-head{display:flex;align-items:center;gap:12px;margin-top:12px}#meshExport p{font-size:12px;line-height:1.5;color:var(--muted,#526360);margin:8px 0}#meshExport .mx-head p{margin:0}#meshExport .mx-controls{display:flex;flex-wrap:wrap;gap:12px 20px;margin:16px 0}#meshExport label{font-size:12px;display:flex;flex-direction:column;gap:6px}#meshExport input[type=number]{box-sizing:border-box;width:145px;padding:7px}#meshExport .mx-check{display:flex;flex-direction:row;align-items:center;gap:7px}#meshExport .mx-check input{margin:0}#meshExport details{margin-top:12px;font-size:12px}#meshExport details summary{cursor:pointer}#meshExport pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;background:var(--soft,#edf1ed);padding:10px;border-radius:4px}#meshExport .mx-info{padding:4px 12px;margin:10px 0;background:var(--soft,#edf1ed);border-radius:4px}#meshExport .mx-steps{padding-left:22px;font-size:13px;line-height:1.8}#meshExport .mx-target{max-width:330px;margin-top:16px}#meshExport .mx-target select{padding:9px;width:100%;background:var(--paper,#fff);color:inherit;border:1px solid var(--line);border-radius:6px}#meshExport [hidden]{display:none!important}#meshExport button:disabled{opacity:.5;cursor:default}#meshExport .mx-state[data-error=true]{color:#9a4529}@media(max-width:500px){#meshExport .mx-controls{gap:12px}#meshExport input[type=number]{width:130px}}
 </style>
 <summary>Acoustic simulation files</summary>
 <div class="mx-head"><p>One ZIP contains your design, the mesh builder and setup instructions.</p><button class="field-info" type="button" data-mx-help aria-label="About acoustic solver export" aria-expanded="false" aria-controls="meshExportInfo">i</button></div>
 <div class="mx-info" id="meshExportInfo" data-mx-info hidden><p>The geometry job is not a mesh. The downloadable local runner creates the Gmsh boundary and ABEC project, then checks joins, normals, intersections and source tags. Setup requires Python and Node.js; meshing runs on your computer.</p><p>The horn mouth couples the inside pressure field to exterior radiation. Independent inside and outside simulations do not preserve that loading. Manufacturing surfaces and display meshes are not acoustic domains.</p><p>Sealed designs retain rear loading as metadata. Rear-vent bases prescribe independent velocity at vent inlets; they require rear-cavity and motor coupling before predicting a ported loudspeaker response. Unsupported geometry is rejected with a reason.</p><p>Assumed cone geometry and lossless rigid walls still need physical validation. The ABEC project requires review in AKABAK; native AKABAK import and solve are unverified; exporting a mesh does not calculate a response.</p></div>
 <label class="mx-target">Open the result in<select data-mx-target><option value="akabak">AKABAK / ABEC</option><option value="blab">Boundary Lab</option></select></label>
 <p><button type="button" class="primary" data-mx-kit>Download AKABAK export kit (.zip)</button></p>
 <ol class="mx-steps"><li>Download and extract the ZIP.</li><li>Open <strong>OPEN_FIRST.html</strong> for one-time setup and the build command.</li><li>Open the generated project in your solver.</li></ol>
 <p>The ZIP builds the mesh locally; it does not include or install AKABAK or Boundary Lab.</p>
 <details><summary>Mesh settings &amp; separate downloads</summary>
 <div class="mx-controls"><label>Highest frequency (Hz)<input data-mx-frequency type="number" min="100" max="10000" step="100" value="1000"></label><label>Elements / wavelength<input data-mx-density type="number" min="6" max="20" step="1" value="8"></label></div>
 <label class="mx-check"><input data-mx-vent-basis type="checkbox">Rear-vent velocity bases (ported designs)</label>
 <label class="mx-check"><input data-mx-volume type="checkbox">Try whole-front FEM mesh (experimental)</label>
 <p><button type="button" data-mx-download>Geometry job only (.json)</button> <button type="button" data-mx-runner>Mesh builder only (.zip)</button></p></details>
 <p class="mx-state" data-mx-status role="status" aria-live="polite">Ready to package your current design.</p>
 <details><summary>Manual setup instructions</summary><p>1. Download the geometry job and local runner ZIP above.<br>2. Extract the runner and follow START_HERE.md to install Python, Node.js and the meshing libraries once.<br>3. Put the job in the runner folder and run:</p><pre>python3 run.py MEH_acoustic_geometry.json</pre><p>On Windows use <code>py -3.12</code> instead of <code>python3</code>. Open the completed bundle’s <code>abec/project.abec</code> in AKABAK for inspection/import. The runner preserves your job, writes a log and withholds completion when a check fails. <a href="https://github.com/mroushdy/MehStudio/tree/main/mesh-export" target="_blank" rel="noopener">Full exporter guide</a>.</p><p>Density is a starting point, not a validated frequency band. Exact narrow gaps may need substantial memory. Whole-front FEM is experimental; failed volumes are withheld.</p></details>
 <details><summary>1D AKABAK script (.aks)</summary><p>Sealed mids with open collectors. Includes the driver parameters, front/rear volumes and a segmented horn network. Native AKABAK parsing and numerical agreement remain unverified.</p><button type="button" data-mx-aks>Download 1D AKABAK script (.aks)</button></details>`;
 const q=selector=>host.querySelector(selector),button=q('[data-mx-download]'),status=q('[data-mx-status]');
 function message(text,error=false){status.textContent=text;status.setAttribute('data-error',String(error));}
 function options(){return readOptions(q('[data-mx-frequency]').value,q('[data-mx-density]').value,q('[data-mx-volume]').checked,q('[data-mx-vent-basis]').checked);}
 function refresh(){if(busy||disposed)return;lastJob=null;message('The download will use the current design and drive settings. Native meshing is required.');}
 async function run(asKit=false){
  if(busy||disposed)return null;
  busy=true;lastJob=null;button.disabled=true;q('[data-mx-kit]').disabled=true;message('Preparing current acoustic geometry…');
  try{
   const configuration=options();
   // Re-read the design at the moment of export; the editor flushes pending edits here.
   const design=getDesign();
   const create=buildJob||root.MEHMeshGeometry?.buildJob;
   if(typeof create!=='function')throw Error('The canonical geometry exporter is unavailable.');
   const job=await create(design,configuration);
   if(disposed)return null;
   if(!job||!job.manifest)throw Error('The geometry exporter returned no boundary manifest.');
   if(asKit===true)saveKit(job,design);else save('MEH_acoustic_geometry.json',JSON.stringify(job),'application/json');lastJob=job;
   message(asKit===true?'Export kit downloaded. Extract it and open OPEN_FIRST.html. The mesh still needs to be built; no response has been calculated.':'Geometry job downloaded. Download the local runner and follow START_HERE.md to build solver files; no response has been calculated.');
   return job;
  }catch(error){if(!disposed)message('Export unavailable: '+(error?.message||String(error)),true);return null;}
  finally{busy=false;if(!disposed){button.disabled=false;q('[data-mx-kit]').disabled=false;}}
 }
 function saveKit(job,design){
  if(!runnerPackage?.base64||!root.MEHDownloadZip)throw Error('The bundled mesh builder is missing. Download the current MEH Studio editor.');
  const target=q('[data-mx-target]').value==='blab'?'Boundary Lab':'AKABAK',project=target==='Boundary Lab'?'boundary-lab/project.blab.json':'abec/project.abec',runner=Uint8Array.from(root.atob(runnerPackage.base64),c=>c.charCodeAt(0));
  const guide='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Build your MEH acoustic mesh</title><style>body{max-width:740px;margin:50px auto;padding:0 24px;font:16px/1.6 system-ui;color:#203331}pre{padding:14px;background:#eef2ee;white-space:pre-wrap}h1{font-size:28px}</style><h1>Your '+target+' export kit</h1><p>Your saved design and mesh builder are together in this folder. This kit creates solver files; it does not calculate an acoustic response.</p><h2>1. One-time setup</h2><p>Install <a href="https://www.python.org/downloads/">Python 3.12</a> and <a href="https://nodejs.org/">Node.js 22 or newer</a>. Open a terminal in this extracted MEH-local-runner folder. Run:</p><pre>python3 run.py --setup</pre><p>On Windows, replace <code>python3</code> with <code>py -3.12</code>. Setup downloads meshing libraries into this folder.</p><h2>2. Build the files</h2><pre>python3 run.py MEH_acoustic_geometry.json</pre><p>The runner prints the output folder and reports any failed geometry checks. Large designs can take time and memory. Keep the completed bundle together.</p><h2>3. Open in '+target+'</h2><p>Use <code>'+project+'</code> inside the completed output folder.'+(target==='AKABAK'?' In AKABAK, use Tools → Import ABEC Project.':' Open the project in Boundary Lab.')+'</p><p>Get your solver separately: <a href="https://www.randteam.de/AKABAK3/Index.html">AKABAK</a> or <a href="https://github.com/JWSound/boundary-lab/releases/latest">Boundary Lab</a>. See START_HERE.md for details. Native AKABAK import and solving have not been verified. These are prescribed-velocity source models; motor and rear-load coupling are not solved here.</p><p><a href="START_HERE.md">Full local-runner guide</a> · <a href="MEH_design_study.json">Saved design</a></p></html>';
  const files={'MEH-local-runner/MEH_acoustic_geometry.json':JSON.stringify(job),'MEH-local-runner/MEH_design_study.json':JSON.stringify(design,null,2),'MEH-local-runner/OPEN_FIRST.html':guide};
  save('MEH_'+(target==='Boundary Lab'?'Boundary_Lab':'AKABAK')+'_export_kit.zip',root.MEHDownloadZip.append(runner,files),'application/zip');
 }
 function exportAks(){try{const design=getDesign(),a=root.MEH.analyze(design.state),data=root.MEHFileFormats.aks(a,root.MEHAcoustics,root.MEH);save('MEH_sealed_mids_review.aks',data,'text/plain');message('1D script downloaded. Review it in AKABAK; native import and numerical agreement are unverified.');}catch(e){message('Script unavailable: '+e.message,true);}}
 function saveRunner(){try{if(!runnerPackage?.base64)throw Error('The local runner is missing. Download a current copy of MEH Studio.');const bytes=Uint8Array.from(root.atob(runnerPackage.base64),c=>c.charCodeAt(0));save(runnerPackage.filename,bytes,'application/zip');message('Local runner downloaded. Extract the ZIP and follow START_HERE.md; setup is required once.');}catch(error){message('Runner unavailable: '+(error?.message||String(error)),true);}}
 const showHelp=()=>{const info=q('[data-mx-info]');info.hidden=!info.hidden;q('[data-mx-help]').setAttribute('aria-expanded',String(!info.hidden));};
 q('[data-mx-help]').addEventListener('click',showHelp);button.addEventListener('click',()=>run());q('[data-mx-kit]').addEventListener('click',()=>run(true));q('[data-mx-aks]').addEventListener('click',exportAks);q('[data-mx-target]').addEventListener('change',()=>{q('[data-mx-kit]').textContent=q('[data-mx-target]').value==='blab'?'Download Boundary Lab export kit (.zip)':'Download AKABAK export kit (.zip)';refresh();});q('[data-mx-runner]').addEventListener('click',saveRunner);
 for(const selector of ['[data-mx-frequency]','[data-mx-density]','[data-mx-volume]','[data-mx-vent-basis]'])q(selector).addEventListener('input',refresh);
 exportButton?.addEventListener('click',refresh);
 const api={run,refresh,get options(){return options();},get job(){return lastJob;},dispose(){disposed=true;exportButton?.removeEventListener('click',refresh);delete host.__mehMeshExportPanel;}};
 host.__mehMeshExportPanel=api;return api;
}
const api={defaults,readOptions,init};root.MEHMeshExportPanel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
