// Probes for Marwan's live reports #3 (coax2 wide-coverage taps 'cut') and #4 (quadrant
// 'drivers still touching'). Numbers before fixes - the standing discipline.
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

  // #4 QUADRANT: true worst pair gap among woofers + vs CD, from the settled island
  await page.select('#sel_arch','quadrant'); await new Promise(r=>setTimeout(r,1400));
  const q=await page.evaluate(()=>{
    const ev=MEH.evaluate(S);
    const woofs=ev.layout.filter(d=>d.kind==='woof');
    let worst=1e9, pair='';
    for(let i=0;i<woofs.length;i++)for(let j=i+1;j<woofs.length;j++){
      const d=MEH.minRimDist(woofs[i],woofs[j]);
      if(d<worst){worst=d; pair='woof#'+i+'-woof#'+j;}
    }
    const row=ev.fit.find(r=>/Woofer ring spacing/.test(r.name));
    return {mouthW:S.mouthW, Lw:S.Lw, odW_in:+(S.odW*0.01/0.0254).toFixed(1),
      worst_mm:+(worst*1000).toFixed(1), pair, row:row?row.val+' ('+row.st+')':'no row',
      fails:ev.fit.filter(r=>r.st==='fail').length, reds:ev.layout.filter(d=>d.collide).length};
  });
  console.log('QUADRANT settled:', JSON.stringify(q));

  // #4b: what does the gap become at 40/44in mouth?
  for(const mw of [40,44]){
    const g=await page.evaluate((mw2)=>{
      const ev=MEH.evaluate({...S, mouthW:mw2});
      const woofs=ev.layout.filter(d=>d.kind==='woof');
      let worst=1e9;
      for(let i=0;i<woofs.length;i++)for(let j=i+1;j<woofs.length;j++)
        worst=Math.min(worst,MEH.minRimDist(woofs[i],woofs[j]));
      return +(worst*1000).toFixed(1);
    },mw);
    console.log('quadrant @'+mw+'in worst pair gap: '+g+' mm');
  }

  // #3 COAX2: coverage sweep - where does the panel floor become infeasible; does crW rescue?
  await page.select('#sel_arch','coax2'); await new Promise(r=>setTimeout(r,1400));
  for(const th of [90,100,110,120]){
    const r=await page.evaluate((th2)=>{
      S.thW=th2; window._fitIter=0; applyAutos();
      const ev=MEH.evaluate(S);
      return {thW:S.thW, mouthW:S.mouthW, Lw:S.Lw,
        portRow:(ev.fit.find(r=>/Woofer ports within/.test(r.name))||{}).st||'-',
        bindW:(S.bindW||'').slice(0,70),
        fails:ev.fit.filter(r=>r.st==='fail').length};
    },th);
    console.log('coax2 thW='+th+':', JSON.stringify(r));
    await page.select('#sel_arch','coax2'); await new Promise(r=>setTimeout(r,900)); // reset island
  }
  // crW rescue at 120?
  const rescue=await page.evaluate(()=>{
    const out=[];
    for(const cr of [4.5,6,8]){
      const S2={...S, thW:120, crW:cr}; // raw evaluate at higher CR: smaller ports
      S2.apW=+(S2.sdW/cr).toFixed(1);
      const ev=MEH.evaluate(S2);
      out.push({crW:cr, apW:S2.apW,
        portRow:(ev.fit.find(r=>/Woofer ports within/.test(r.name))||{}).st||'-',
        fails:ev.fit.filter(r=>r.st==='fail').length});
    }
    return out;
  });
  console.log('coax2 @120 crW rescue:', JSON.stringify(rescue));
  await browser.close();
})();
