// probe_tapsurface.js - are chamfer kidney taps ON the horn boundary or floating in air?
// cavityMargin(st, p) is the law (0 = on surface, + outside, - inside the cavity).
// Suspicion from the eyes ritual: kidneys at radial rPo sit INSIDE the cross-section on
// the diagonal ray, i.e. in open air (the "misplaced kidneys" class, surviving because
// sweep's chamfer branch only checks rad <= corner and scene-audit checks drawn==model).
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
  for(const isl of ['quadrant','pa3way']){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1000));
    const r=await page.evaluate(()=>{
      const ev=MEH.evaluate(S), st=ev.st, out=[];
      for(const d of ev.layout){ if(!d.chamfer) continue;
        for(const pr of (d.ports||[])){
          const rad=Math.hypot(pr.p[1],pr.p[2]);
          out.push({kind:d.kind, x:+(pr.p[0]*1000).toFixed(0), rad:+(rad*1000).toFixed(0),
            corner:+(d.chamfer.corner*1000).toFixed(0),
            cavM:+(MEH.cavityMargin(st,pr.p)*1000).toFixed(1)});
        }
      }
      return out;
    });
    console.log(isl, JSON.stringify(r));
  }
  await browser.close();
})();
