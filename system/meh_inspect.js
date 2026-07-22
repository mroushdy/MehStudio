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
  let fails=0, warns=0;
  for(const isl of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1200));
    if(override){ await page.evaluate((ov)=>{ Object.assign(S,ov); if(window.applyAutos)applyAutos(); update(); },override);
      await new Promise(r=>setTimeout(r,900)); }
    const rep=await page.evaluate(()=>INSPECT.report());
    const tag=isl+(override?'_ov':'');
    if(!rep.violations.length){ console.log('clean  '+tag); continue; }
    console.log((rep.fails?'FAIL   ':'warn   ')+tag+'  '+rep.fails+' fail / '+rep.warns+' warn');
    for(let i=0;i<rep.violations.length&&i<10;i++){
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
