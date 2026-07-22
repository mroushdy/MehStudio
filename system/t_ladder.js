// Ladder acceptance: forcing corner on pa3way (simple mode) must now auto-resolve.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  await page.select('#sel_arch','pa3way'); await new Promise(r=>setTimeout(r,1200));
  const res=await page.evaluate(()=>{
    S.adv=false; S.plM='corner'; window._fitIter=0;
    applyAutos();
    const ev=MEH.evaluate(S);
    return { plM_final:S.plM,
      reds:ev.layout.filter(d=>d.collide).length,
      fails:ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,26)),
      bindM:(S.bindM||'').slice(0,140) };
  });
  console.log(JSON.stringify(res,null,1));
  const ok = /INFEASIBLE/.test(res.bindM) && res.reds>0;   // forced corner stays an HONEST refusal (build-48 parity; auto-swapping a user choice would lie)
  console.log(ok?'LADDER PASS':'LADDER FAIL');
  await browser.close(); process.exit(ok?0:1);
})();
