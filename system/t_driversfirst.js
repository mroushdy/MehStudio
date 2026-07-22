// Drivers-first acceptance: the SAWMOD complement must find the knuckle island; state restores.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  let pass=0,fail=0; const ck=(n,ok,d)=>{console.log((ok?'PASS  ':'FAIL  ')+n+(d?'  ['+d+']':''));ok?pass++:fail++;};

  ck('DF card present', await page.evaluate(()=>!!document.getElementById('df_go')));
  // SAWMOD complement: de980 + bc5nsm + bc8pe
  const r1=await page.evaluate(async ()=>{
    const before={arch:window.curArch, mouthW:S.mouthW, plM:S.plM};
    document.getElementById('df_cd').value='de980';
    document.getElementById('df_mid').value='bc5nsm';
    document.getElementById('df_wf').value='bc8pe';
    window.driversFirst();
    const rowsTxt=document.getElementById('df_out').innerText;
    const after={arch:window.curArch, mouthW:S.mouthW, plM:S.plM};
    return {rowsTxt, before, after};
  });
  ck('sweep produced a table', /lives here|fails|infeasible/.test(r1.rowsTxt), r1.rowsTxt.split('\n')[0]);
  ck('knuckle wins the SAWMOD complement', /✓\s*knuckle/.test(r1.rowsTxt));
  ck('state fully restored after sweep', JSON.stringify(r1.before)===JSON.stringify(r1.after),
     JSON.stringify(r1.before)+' -> '+JSON.stringify(r1.after));
  console.log('--- table ---\n'+r1.rowsTxt);
  // 12in woofers, no mid pick
  const r2=await page.evaluate(()=>{
    document.getElementById('df_cd').value=''; document.getElementById('df_mid').value='';
    document.getElementById('df_wf').value='bc12pe';
    window.driversFirst();
    return document.getElementById('df_out').innerText;
  });
  ck('12-inch woofers find quadrant green', /✓\s*quadrant/.test(r2));
  ck('no JS errors', errs.length===0, errs.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); process.exit(fail?1:0);
})();
