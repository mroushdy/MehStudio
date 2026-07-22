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
  // structural probe of the DEFAULT state
  const o=await page.evaluate(()=>{
    const ev=MEH.evaluate(S);
    const dr=ev.layout.map(d=>({k:d.kind,c:d.center.map(v=>+(v/0.0254).toFixed(2)),n:d.normal.map(v=>+v.toFixed(2)),od:+(d.od/0.0254).toFixed(1),dp:+(d.dp/0.0254).toFixed(1),stand:+((d.stand||0)*1000).toFixed(0),red:d.collide}));
    return {dwall:S.dwall,plM:S.plM,plW:S.plW,nM:S.nM,nW:S.nW,npW:S.npW,L12:S.L12,Lw:S.Lw,
      fails:ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,26)),reds:ev.layout.filter(d=>d.collide).length,
      depth:+(ev.st.depth/0.0254).toFixed(2), drivers:dr};
  });
  console.log(JSON.stringify(o,null,1));
  const shot=async(yaw,pitch,dist,name)=>{const data=await page.evaluate((y,p,d)=>{V3D.spin=false;V3D.yaw=y;V3D.pitch=p;V3D.dist=d;render3d();return V3D.renderer.domElement.toDataURL('image/png');},yaw,pitch,dist);
    fs.writeFileSync('/tmp/'+name,Buffer.from(data.split(',')[1],'base64'));console.log('shot',name);};
  await shot(Math.PI*0.78, 0.42, 1.7, 'an_rear34.png');     // the Unity-reference 3/4 rear angle
  await shot(Math.PI*0.999, 0.001, 1.9, 'an_rear.png');      // dead rear
  await shot(0.0001, 0.0001, 2.0, 'an_front.png');           // dead front (into the mouth)
  await shot(Math.PI*0.5, 0.9, 1.8, 'an_top.png');           // top-down
  await browser.close();
})();
