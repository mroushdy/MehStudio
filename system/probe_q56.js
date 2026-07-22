// probe_q56.js - why do quadrant wall-panel rows fire after the seam-tap patch?
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,700));
  await page.select('#sel_arch','quadrant'); await new Promise(r=>setTimeout(r,1200));
  const r=await page.evaluate(()=>{
    const ev=MEH.evaluate(S);
    return {plW:S.plW, mouthW:S.mouthW, Lw:S.Lw, apW:S.apW, npW:S.npW,
      rows:ev.fit.map(rr=>rr.st+' '+rr.name+' '+rr.val).filter(x=>!/^ok/.test(x)),
      taps:ev.layout.filter(d=>d.chamfer).map(d=>(d.ports||[]).map(pr=>({x:+(pr.p[0]*1000).toFixed(0),r:+(Math.hypot(pr.p[1],pr.p[2])*1000).toFixed(0)})))[0],
      bindW:S.bindW};
  });
  console.log(JSON.stringify(r,null,1));
  await browser.close();
})();
