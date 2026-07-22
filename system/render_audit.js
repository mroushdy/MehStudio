// render_audit.js - THE EYES RITUAL (Marwan: "you need to run the tool, adjust settings,
// look at the 3D models against a baseline of what is right").
// Captures every island from 4 angles + tuned variants (square taps, 2 ports/driver),
// stitches per-island contact sheets to /tmp/audit/. The operator LOOKS at these against
// the reference photos before ANY deploy. Not optional.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:900,height:640}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,150)));
  await page.goto('file://'+path.resolve(process.argv[2]||'meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  fs.mkdirSync('/tmp/audit',{recursive:true});
  const ANGLES=[[0.0001,0.0001,2.0,'front'],[Math.PI*0.78,0.42,1.7,'rear34'],[Math.PI*0.5,0.05,1.9,'profile'],[Math.PI*0.25,0.55,1.6,'top34']];
  const shot=async(nm)=>{
    const data=await page.evaluate((yy,pp,dd)=>{V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();return V3D.renderer.domElement.toDataURL('image/png');},...nm.slice(0,3));
    fs.writeFileSync('/tmp/audit/'+nm[3]+'.png',Buffer.from(data.split(',')[1],'base64'));
  };
  const setSel=async(id,v)=>page.evaluate((i,vv)=>{const e=document.getElementById(i); if(e&&[...e.options].some(o=>o.value===vv&&!o.disabled)){e.value=vv;e.dispatchEvent(new Event('change',{bubbles:true}));return true;}return false;},id,v);
  for(const isl of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1100));
    for(const a of ANGLES) await shot([a[0],a[1],a[2],isl+'_A_'+a[3]]);
    // tuned variant 1: square taps (both kinds where present)
    await setSel('sel_shM','sq'); await setSel('sel_shW','sq'); await new Promise(r=>setTimeout(r,700));
    await shot([0.0001,0.0001,2.0,isl+'_B_sqtaps_front']);
    await shot([Math.PI*0.25,0.55,1.6,isl+'_B_sqtaps_top34']);
    // tuned variant 2: 2 ports per mid (where mids exist)
    const hasM=await page.evaluate(()=>MEH.HAS_M(S));
    if(hasM){ await page.evaluate(()=>{const e=document.getElementById('num_npM'); if(e){e.value=2; e.dispatchEvent(new Event('change',{bubbles:true}));}}); await new Promise(r=>setTimeout(r,700));
      await shot([0.0001,0.0001,2.0,isl+'_C_np2_front']); }
  }
  await browser.close();
  console.log('captured '+fs.readdirSync('/tmp/audit').filter(f=>f.endsWith('.png')).length+' frames to /tmp/audit');
})();
