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
  await new Promise(r=>setTimeout(r,800));
  for(const a of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    await page.select('#sel_arch',a); await new Promise(r=>setTimeout(r,900));
    const o=await page.evaluate(()=>{
      const ev=MEH.evaluate(S); const st=ev.st;
      const woofs=ev.layout.filter(d=>d.kind==='woof'), mids=ev.layout.filter(d=>d.kind==='mid');
      const IN=0.0254;
      return { bindM:(S.bindM||'').slice(0,60),
        mouth:(S.shape==='cone'||S.shape==='os')?S.mouthD+'\u00d8':S.mouthW+'x'+(st.pts[st.pts.length-1].h/IN).toFixed(1),
        depth:+(st.depth/IN).toFixed(1), XO:S.fxLo+'/'+S.fxHi, L12:S.L12, Lw:S.Lw,
        wOD:woofs[0]?+(woofs[0].od/IN).toFixed(1):0, mOD:mids[0]?+(mids[0].od/IN).toFixed(1):0,
        wFrac:woofs[0]?+((woofs[0].od/IN)/(S.mouthW||S.mouthD)).toFixed(2):0,
        LwFrac:+(S.Lw/(st.depth/IN)).toFixed(2),
        fails:ev.fit.filter(r=>r.st==='fail').length, reds:ev.layout.filter(d=>d.collide).length,
        bind:(S.bindW||'').slice(0,80)};
    });
    console.log(a.padEnd(10), JSON.stringify(o)); (global.__results=global.__results||[]).push([a,o]);
    const shot=async(yaw,pitch,dist,name)=>{const data=await page.evaluate((y,p,d)=>{V3D.spin=false;V3D.yaw=y;V3D.pitch=p;V3D.dist=d;render3d();return V3D.renderer.domElement.toDataURL('image/png');},yaw,pitch,dist);
      fs.writeFileSync('/tmp/'+name,Buffer.from(data.split(',')[1],'base64'));};
    await shot(0.0001,0.0001,2.0,'dp_'+a+'_front.png');
    await shot(Math.PI*0.78,0.42,1.7,'dp_'+a+'_rear.png');
  }
  await browser.close();
  // DEPLOY GATE: invariants that every build must satisfy
  const R=global.__results||[];
  let bad=[];
  for(const [a,o] of R){
    if(o.fails>0||o.reds>0) bad.push(a+': fails='+o.fails+' reds='+o.reds);
    if(a==='coax2' && /OVER/.test(o.bind)) bad.push('coax2: OVER advisory present');
    if(/INFEASIBLE/.test((o.bind||'')+(o.bindM||''))) bad.push(a+': INFEASIBLE pairing shipped');
    if(a==='unity' && !/1100|1050|1000/.test(o.XO)) bad.push('unity: XO drifted ('+o.XO+')');
  }
  if(bad.length){ console.log('GATE FAIL:', bad.join(' | ')); process.exit(1); }
  console.log('GATE PASS');
})();
