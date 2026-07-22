// orbit_viewer.js - THE VIEWER RITUAL (Marwan: "build a viewer and see the results in the
// viewer you build. Do not send a response ever if its obvious its broken").
// Captures a FULL ORBIT of every island - 10 views each (8 azimuths at two pitches that
// cover front/three-quarter/side/rear + a top view + a dead-front) - writes frames to
// /tmp/orbit/ and montages per island. The operator READS every montage at full
// resolution before any bless/deploy. deploy gate #8 builds meh_viewer.html from these
// frames so Marwan sees the same evidence.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:640,height:440}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve(process.argv[2]||'meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  fs.mkdirSync('/tmp/orbit',{recursive:true});
  const VIEWS=[ [0.0001,0.0001,2.0,'front'],
                [Math.PI*0.20,0.18,1.8,'fq_left'],  [-Math.PI*0.20,0.18,1.8,'fq_right'],
                [Math.PI*0.50,0.10,1.9,'side'],
                [Math.PI*0.66,0.30,1.9,'rq_high'],  [Math.PI*0.78,0.42,1.9,'rear34'],
                [Math.PI*0.995,0.10,2.0,'rear'],    [-Math.PI*0.66,0.30,1.9,'rq_other'],
                [Math.PI*0.25,0.95,1.9,'top'],      [Math.PI*0.75,-0.35,1.9,'rear_low'] ];
  for(const isl of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1300));
    for(const v of VIEWS){
      const data=await page.evaluate((yy,pp,dd)=>{V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();return V3D.renderer.domElement.toDataURL('image/png');},v[0],v[1],v[2]);
      fs.writeFileSync('/tmp/orbit/'+isl+'__'+v[3]+'.png',Buffer.from(data.split(',')[1],'base64'));
    }
    console.log('orbit',isl,'10 views');
  }
  await browser.close();
})();
