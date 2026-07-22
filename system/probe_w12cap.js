// probe_w12cap.js - would pa3way + 12" woofers land clean if the growth cap allowed 46-48"?
// (sweep flags it honestly at the 44" cap: ring -8.1mm. The cap is a solver allowance, not
// physics - probe before moving it.)
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,700));
  await page.select('#sel_arch','pa3way'); await new Promise(r=>setTimeout(r,900));
  for(const mw of [44,46,48,50]){
    const r=await page.evaluate((MW)=>{
      S.wfSel='w12'; if(window.applyDriver) applyDriver('woof');   // resolve woofer params
      const e=document.getElementById('sel_wfSel'); if(e){e.value='w12'; e.dispatchEvent(new Event('change',{bubbles:true}));}
      S.mouthW=MW; S.adv=false; window._fitIter=14;                // pin mouth; growth denied (probe the mouth directly)
      applyAutos();
      const ev=MEH.evaluate(S);
      const row=ev.fit.find(r2=>/Mid ring vs woofer ring/.test(r2.name));
      return {mouthW:S.mouthW, Lw:S.Lw, ring:row?row.val:'?', st:row?row.st:'?',
        fails:ev.fit.filter(r2=>r2.st==='fail').map(r2=>r2.name.slice(0,28)), reds:ev.layout.filter(d=>d.collide).length};
    },mw);
    console.log(JSON.stringify(r));
  }
  await browser.close();
})();
