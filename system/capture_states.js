// capture_states.js - capture the browser-settled S per island into golden/settled_states.json.
// This is a BLESSED artifact like the golden renders: regenerate DELIBERATELY when islands
// change (run this script, review the diff, commit). meh_suite.js consumes it browser-free.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve(process.argv[2]||'meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  const out={};
  for(const a of ['unity','coax2','quadrant','wide','roundprint','pa3way','knuckle']){
    await page.select('#sel_arch',a); await new Promise(r=>setTimeout(r,1400));
    out[a]=await page.evaluate(()=>{
      const ev=MEH.evaluate(S);
      return { S: JSON.parse(JSON.stringify(S)),
               fails: ev.fit.filter(r=>r.st==='fail').length,
               reds: ev.layout.filter(d=>d.collide).length };
    });
    console.log(a.padEnd(11), 'fails='+out[a].fails, 'reds='+out[a].reds, 'XO='+out[a].S.fxLo+'/'+out[a].S.fxHi);
  }
  await browser.close();
  for(const a of Object.keys(out)) if(out[a].fails||out[a].reds){ console.log('REFUSING to bless a dirty state: '+a); process.exit(1); }
  fs.writeFileSync('golden/settled_states.json', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v.S])),null,1));
  console.log('BLESSED golden/settled_states.json ('+Object.keys(out).length+' islands, all clean)');
})();
