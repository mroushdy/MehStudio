// PROBE (before any patch): does the SH96-corrected pa3way layout SOLVE with the
// existing machinery? Corner woofers (plW=chamfer, nW=4, w15) + near-throat diagonal
// mids (plM=diagonal, nM=4, m4). Tables overridden in-page; verdict = INSPECT + reds.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:900,height:700}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,160)));
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  await page.select('#sel_arch','pa3way'); await new Promise(r=>setTimeout(r,900));
  await page.evaluate(()=>{
    ARCH_PL.pa3way={plM:['diagonal','chamfer','edge','corner'],plW:['chamfer','straddle','cross','remote','edge']};
    ARCH_CNT.pa3way={nM:[4],nW:[4]};
    if(ARCH_DRV.pa3way.woof.indexOf('w15')<0) ARCH_DRV.pa3way.woof.push('w15');
    S.plM='diagonal'; S.plW='chamfer'; S.nW=4; S.nM=4; S.wfSel='w15'; S.midSel='m4';
    if(window.applyAutos)applyAutos(); update();
  });
  await new Promise(r=>setTimeout(r,1800));
  const st=await page.evaluate(()=>{const r=INSPECT.report();
    const reds=document.querySelectorAll('tr.bad,td.bad').length;
    return {plM:S.plM,plW:S.plW,nW:S.nW,nM:S.nM,wf:S.wfSel,mouthW:S.mouthW,
      fails:r.fails,warns:r.warns,reds,
      v:r.violations.slice(0,5).map(x=>'['+x.sev+'] '+x.code+' '+x.msg.slice(0,70))};});
  console.log(JSON.stringify(st,null,1));
  for(const [yy,pp,dd,tag] of [[0.0001,0.0001,2.0,'front'],[Math.PI*0.78,0.42,1.9,'rear34']]){
    const d=await page.evaluate((yy,pp,dd)=>{V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();return V3D.renderer.domElement.toDataURL('image/png');},yy,pp,dd);
    fs.writeFileSync('/tmp/sh96probe_'+tag+'.png',Buffer.from(d.split(',')[1],'base64'));
  }
  await browser.close();
})();
