(function(root){'use strict';
const kinds=['mid','compression'],labels={mid:'Cone driver mounting rings',compression:'Compression driver mounting plate'};
const fields=[['thicknessMM','Plate thickness / mm'],['boltHoleDiameterMM','Through-hole diameter / mm'],['edgeMarginMM','Minimum outer edge margin / mm'],['gasketLandMM','Minimum gasket land / mm']];
const recessFields=[['counterboreDiameterMM','Bolt-head recess diameter / mm'],['counterboreDepthMM','Bolt-head recess depth / mm']];
const overrideFields=[['cutoutDiameterMM','Cutout diameter / mm'],['outerDiameterMM','Outer diameter / mm'],['boltCircleDiameterMM','Bolt circle diameter / mm'],['boltCount','Bolt count'],['startAngleDeg','First bolt angle / degrees'],['mountOffsetMM','Mounting seat offset / mm']];
const copy=x=>JSON.parse(JSON.stringify(x)),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const messages=list=>(list||[]).map(x=>typeof x==='string'?x:x.message||x.reason||JSON.stringify(x));
function numberField(kind,key,label,override=false){return `<label>${label}<input type="number" step="${key==='boltCount'?'1':'any'}" data-mount-${override?'override':'field'}="${key}" data-mount-kind="${kind}"></label>`;}
function previewSVG(part){
 const s=part.spec,outline=s?.outline,bolts=s?.boltCenters;
 if(!Array.isArray(outline)||outline.length<3||!Array.isArray(bolts)||![...outline,...bolts].every(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)))return '';
 const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]),pad=Math.max(3,(Math.max(...xs)-Math.min(...xs))*.06),x=Math.min(...xs)-pad,y=Math.min(...ys)-pad,w=Math.max(...xs)-x+pad,h=Math.max(...ys)-y+pad;
 const hole=s.boltHoleDiameterMM,cut=s.cutoutDiameterMM;
 if(![x,y,w,h,hole,cut].every(Number.isFinite)||w<=0||h<=0)return '';
 const holes=s.topHoles||s.holes;
 if(!Array.isArray(holes)||!holes.every(loop=>loop.every(p=>p.length===2&&p.every(Number.isFinite))))return '';
 const path=loops=>loops.map(loop=>loop.map((p,i)=>(i?'L':'M')+p.join(',')).join('')+'Z').join(''),d=path([outline,...holes]);
 const shoulders=s.hasCounterbores?holes.slice(1).map((loop,i)=>`<path d="${path([loop,s.holes[i+1]])}" fill="#ecf1ed" fill-rule="evenodd" stroke="#879a91" stroke-width="${Math.max(w,h)*.002}"/>`).join(''):'';
 return `<svg viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${esc(labels[part.kind])}: actual plate outline, cutout and ${bolts.length} through holes${s.hasCounterbores?' with bolt-head recesses':''}" data-mount-preview-kind="${esc(part.kind)}" style="display:block;width:100%;max-width:240px;max-height:220px;margin:auto"><title>${esc(labels[part.kind])} — ${part.kind==='mid'?'rear face':'horn-facing face'}, millimetres</title><path d="${d}" fill="#dce9e6" fill-rule="evenodd" stroke="#267367" stroke-width="${Math.max(w,h)*.004}"/>${shoulders}</svg>`;
}
function init(host,{getDesign,onChange,save,exportButton}={}){
 if(!host?.querySelector||typeof getDesign!=='function')return null;
 host.innerHTML=`<h4>Driver mounting</h4><p class="note">Generate separate mounting parts with real cutouts and through holes. Selected parts are also included in the CAD handoff. Dimensions are in millimetres.</p>${kinds.map(kind=>`<fieldset data-mount-card="${kind}"><legend>${labels[kind]}</legend><p class="note" data-mount-driver="${kind}"></p><label class="mounting-choice"><input type="checkbox" data-mount-enabled="${kind}"> Include ${kind==='mid'?'one ring for each cone driver':'compression mounting plate'}</label><p class="note" data-mount-eligibility="${kind}"></p><div class="mounting-fields">${fields.map(([key,label])=>numberField(kind,key,label)).join('')}</div><details><summary>Bolt-head recesses (optional)</summary><p class="note">Enter diameter and depth to add flat-bottomed recesses; use zero for both to omit them. Recesses are on the rear face of cone-driver plates and the horn-facing face of the compression flange.</p><div class="mounting-fields">${recessFields.map(([key,label])=>numberField(kind,key,label)).join('')}</div></details><details data-mount-measured-details="${kind}"><summary>Use measured mounting dimensions</summary><p class="note">Use a circular plate and bolt circle measured for this exact driver. This replaces the catalogue pattern. The mounting seat offset is measured from the editor's front-rim datum toward the magnet for a cone driver, or zero at the compression driver's mounting face.</p><label class="mounting-choice"><input type="checkbox" data-mount-measured="${kind}"> Use my measured dimensions</label><div class="mounting-fields">${overrideFields.map(([key,label])=>numberField(kind,key,label,true)).join('')}<label class="mounting-wide">Measurement source / note<input type="text" maxlength="500" data-mount-note="${kind}" placeholder="For example: actual driver measured on 30 September"></label></div><label class="mounting-choice"><input type="checkbox" data-mount-confirm="${kind}"> I checked these dimensions against this driver</label></details><div data-mount-preview="${kind}"></div><p class="note" data-mount-check="${kind}"></p></fieldset>`).join('')}<p class="note">These are separate plates and rings with through holes and optional bolt-head recesses. Joining them to the horn or collector, print segmentation and structural checks remain CAD work.</p><button type="button" data-mount-download>Download mounting parts (.zip)</button><p class="note" data-mount-status role="status" aria-live="polite"></p>`;
 const q=s=>host.querySelector(s),button=q('[data-mount-download]'),status=q('[data-mount-status]');
 let settings={},analysis=null,inspection=null,result=null,busy=false;
 function dependencies(){return {model:root.MEH,land:root.MEHMounting,triangulate:root.MEHEarcut};}
 function persist(){onChange?.(copy(settings));}
 function read(){
  const design=getDesign();analysis=root.MEH.analyze(design.state);inspection=root.MEHMountParts.inspect(analysis,dependencies());
  const old=design.mountingParts||{};settings={};
  for(const kind of kinds){const item=inspection[kind],id=analysis.p[kind==='mid'?'midDriver':'compressionDriver'],saved=old[kind];settings[kind]={enabled:false,driverId:id,thicknessMM:6,boltHoleDiameterMM:5.5,edgeMarginMM:3,gasketLandMM:2,counterboreDiameterMM:0,counterboreDepthMM:0,...item?.defaults,...(saved?.driverId===id?saved:{})};}
  return design;
 }
 function fill(){for(const kind of kinds){
  const item=inspection[kind],s=settings[kind],o=s.override;
  q(`[data-mount-driver="${kind}"]`).textContent=[item?.name||s.driverId,item?.variant].filter(Boolean).join(' · ');
  q(`[data-mount-enabled="${kind}"]`).checked=s.enabled===true;
  q(`[data-mount-eligibility="${kind}"]`).textContent=item?.available?'Catalogue mounting pattern available. Review the generated part and source dimensions before fabrication.':'Catalogue mounting unavailable: '+(messages(item?.reasons).join(' ')||'Exact mounting geometry is not established for this driver.');
  for(const [key]of [...fields,...recessFields])q(`[data-mount-field="${key}"][data-mount-kind="${kind}"]`).value=s[key]??'';
  q(`[data-mount-measured="${kind}"]`).checked=!!o;
  for(const [key]of overrideFields)q(`[data-mount-override="${key}"][data-mount-kind="${kind}"]`).value=o?.[key]??'';
  q(`[data-mount-note="${kind}"]`).value=o?.note||'';q(`[data-mount-confirm="${kind}"]`).checked=o?.confirmed===true;
  if(o)q(`[data-mount-measured-details="${kind}"]`).open=true;
  enableOverride(kind);
 }}
 function enableOverride(kind){const enabled=!!settings[kind].override;for(const input of host.querySelectorAll(`[data-mount-override][data-mount-kind="${kind}"],[data-mount-note="${kind}"],[data-mount-confirm="${kind}"]`))input.disabled=!enabled;}
 function evaluate(){
  try{result=root.MEHMountParts.build(analysis,settings,dependencies());const errors=messages(result.errors),warnings=messages(result.warnings);
   for(const kind of kinds){const parts=result.parts.filter(p=>p.kind===kind),preview=q(`[data-mount-preview="${kind}"]`);preview.innerHTML=parts.length?previewSVG(parts[0]):'';
    q(`[data-mount-check="${kind}"]`).textContent=parts.length?`${parts.length} ${parts.length===1?'part':'parts'} · ${parts[0].spec.thicknessMM??settings[kind].thicknessMM} mm thick · ${parts[0].spec.boltCenters.length} through holes per part. ${kind==='mid'?'Rear-face':'Horn-facing'} preview; installed locations are in the OBJ.`:settings[kind].enabled?'No valid part generated.':'Not included.';
   }
   button.disabled=busy||!result.parts.length||errors.length>0;
   status.textContent=errors.length?errors.join(' '):result.parts.length?`${result.parts.length} mounting parts ready. ${warnings.join(' ')}`:'Choose the mounting parts to include.';
  }catch(e){result=null;button.disabled=true;for(const kind of kinds)q(`[data-mount-preview="${kind}"]`).innerHTML='';status.textContent='Mounting unavailable: '+e.message;}
 }
 function refresh(){try{read();fill();evaluate();}catch(e){result=null;button.disabled=true;status.textContent='Mounting unavailable: '+e.message;}return result;}
 function changed(event){const el=event.target;if(!el.matches('input'))return;
  const kind=el.dataset.mountKind||el.dataset.mountEnabled||el.dataset.mountMeasured||el.dataset.mountNote||el.dataset.mountConfirm;if(!kinds.includes(kind))return;
  const s=settings[kind];if(!s)return;
  if(el.hasAttribute('data-mount-enabled'))s.enabled=el.checked;
  else if(el.hasAttribute('data-mount-measured')){s.override=el.checked?{driverId:s.driverId,confirmed:false,note:'',cutoutDiameterMM:null,outerDiameterMM:null,boltCircleDiameterMM:null,boltCount:null,startAngleDeg:0,mountOffsetMM:kind==='compression'?0:null}:null;fill();}
  else if(el.hasAttribute('data-mount-field'))s[el.dataset.mountField]=Number.isFinite(el.valueAsNumber)?el.valueAsNumber:null;
  else if(el.hasAttribute('data-mount-override')&&s.override){s.override[el.dataset.mountOverride]=Number.isFinite(el.valueAsNumber)?el.valueAsNumber:null;s.override.confirmed=false;q(`[data-mount-confirm="${kind}"]`).checked=false;}
  else if(el.hasAttribute('data-mount-note')&&s.override)s.override.note=el.value;
  else if(el.hasAttribute('data-mount-confirm')&&s.override)s.override.confirmed=el.checked;
  persist();evaluate();
 }
 async function download(){if(busy)return;refresh();if(button.disabled)return;busy=true;button.disabled=true;status.textContent='Preparing mounting parts…';await new Promise(resolve=>root.setTimeout(resolve,0));try{const design=getDesign(),a=root.MEH.analyze(design.state),kit=root.MEHCADHandoff.mountingKit(a,{...design,mountingParts:copy(settings)});save('MEH_mounting_parts.zip',root.MEHDownloadZip.create(kit.files),'application/zip');status.textContent='Mounting parts downloaded. Extract the ZIP for separate STL and STEP solids, installed OBJ and the source/dimension manifest.';return kit;}catch(e){status.textContent='Mounting export unavailable: '+e.message;}finally{busy=false;button.disabled=!result?.parts.length||!!result?.errors.length;}}
 host.addEventListener('input',changed);button.addEventListener('click',download);exportButton?.addEventListener('click',refresh);refresh();
 return {refresh,download,get settings(){return copy(settings);},get result(){return result;}};
}
const api={init,previewSVG};root.MEHMountingPanel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
