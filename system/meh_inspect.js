// meh_inspect.js - THE DEV-LOOP EYES (Marwan: "discover error during the development
// phase"). Drives the in-tool INSPECT engine headless: for every island (plus any state
// overrides passed as JSON argv), runs the tap-scale invariant audit and, for each
// violation, FLIES THE CAMERA TO IT and saves an evidence crop to /tmp/inspect/.
// Run after EVERY patch, before any gate: node meh_inspect.js [html] ['{"wfSel":"w12"}']
// Exit code = number of FAILs. The operator reads the evidence crops - they are already
// framed on the defect, no angle-hunting.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:760,height:560}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve(process.argv[2]||'meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  fs.mkdirSync('/tmp/inspect',{recursive:true});
  const override=process.argv[3]? JSON.parse(process.argv[3]) : null;
  const FULL=process.argv.includes('--full');   // full reachable-space sweep (~10 min); default = canon islands (the deploy gate)
  let fails=0, warns=0;
  // REACHABLE-SPACE sweep: every island x every UI-offered placement (both kinds) x mouth cap.
  // His screenshots all came from off-canon states my canon-only audit never visited.
  const STATES=[];
  for(const isl of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    STATES.push([isl,null]);
    if(FULL){ for(const k of ['plM','plW']) for(const v of ['chamfer','knuckle','corner','diagonal','edge','straddle','remote','cross'])
        STATES.push([isl,{[k]:v}]);
      STATES.push([isl,{__cap:1}]); }
  }
  for(const [isl,ov] of STATES){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1000));
    if(ov){ const applied=await page.evaluate((o)=>{
        if(o.__cap){ const CAPS={unity:30,coax2:36,knuckle:36,roundprint:24,pa3way:50,quadrant:64,wide:64};
          S.mouthW=CAPS[window.curArch]||44; }
        else { const k=Object.keys(o)[0], el=document.getElementById('sel_'+k);
          if(!el||![...el.options].some(op=>op.value===o[k]&&!op.disabled)) return false;   // not offered here - skip
          el.value=o[k]; el.dispatchEvent(new Event('change',{bubbles:true})); return true; }
        if(window.applyAutos)applyAutos(); update(); return true; },ov);
      if(applied===false) continue;
      await new Promise(r=>setTimeout(r,900)); }
    const rep=await page.evaluate(()=>INSPECT.report());
    const tag=isl+(ov? ('_'+(ov.__cap?'cap':Object.entries(ov)[0].join('='))) : '');
    if(!rep.violations.length){ console.log('clean  '+tag); continue; }
    const silent=rep.violations.filter(v=>v.sev==='fail'&&v.code!=='F1').length;   // F1 = the model refusing honestly
    console.log((silent?'FAIL   ':(rep.fails?'honest ':'warn   '))+tag+'  '+rep.fails+' fail ('+silent+' silent) / '+rep.warns+' warn');
    rep.fails=silent;
    for(let i=0;i<rep.violations.length&&i<6;i++){
      const v=rep.violations[i];
      console.log('   ['+v.sev+'] '+v.code+' '+v.msg);
      const data=await page.evaluate((idx)=>{ const r2=INSPECT.audit(); INSPECT.frame(r2[idx]);
        return V3D.renderer.domElement.toDataURL('image/png'); },i);
      fs.writeFileSync('/tmp/inspect/'+tag+'_'+i+'_'+v.code+'.png',Buffer.from(data.split(',')[1],'base64'));
    }
    await page.evaluate(()=>INSPECT.reset());
    fails+=rep.fails; warns+=rep.warns;
  }
  console.log(fails? ('INSPECT: '+fails+' FAILS (evidence in /tmp/inspect)') : 'INSPECT: all islands clean ('+warns+' warns)');
  await browser.close(); process.exit(Math.min(99,fails));
})();
