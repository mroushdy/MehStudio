const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'); const fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,700));
  // abuse test: on unity, try 7 mids and a 12-inch woofer - both must be rejected
  await page.evaluate(()=>{const el=document.getElementById('num_nM'); el.value=7; el.dispatchEvent(new Event('change'));});
  await new Promise(r=>setTimeout(r,300));
  await page.select('#sel_wfSel','w12'); await new Promise(r=>setTimeout(r,300));
  const abuse=await page.evaluate(()=>({nM:S.nM, wfSel:S.wfSel,
    midOpts:[...document.getElementById('sel_midSel').options].filter(o=>!o.disabled).map(o=>o.value)}));
  console.log('ABUSE', JSON.stringify(abuse));
  for(const a of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    await page.select('#sel_arch',a); await new Promise(r=>setTimeout(r,700));
    const o=await page.evaluate(()=>{const ev=MEH.evaluate(S); const selOk=document.getElementById('sel_arch').value;
      return {fails:ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,24)),reds:ev.layout.filter(d=>d.collide).length,
        sel:selOk, bindW:(S.bindW||'').slice(0,60), n:ev.layout.length, visible:[...document.querySelectorAll('[data-k]:not(.off)')].map(e=>e.getAttribute('data-k'))};});
    console.log(a.padEnd(9), JSON.stringify(o));
    const data=await page.evaluate(()=>{V3D.spin=false;V3D.yaw=Math.PI*0.78;V3D.pitch=0.42;V3D.dist=1.7;render3d();return V3D.renderer.domElement.toDataURL('image/png');});
    fs.writeFileSync('/tmp/arch_'+a+'.png',Buffer.from(data.split(',')[1],'base64'));
  }
  await browser.close();
})();
