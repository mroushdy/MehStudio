// Reproduce Marwan's screenshot: high rear-quarter view of a square island.
// For each candidate island: render + count CAD-mesh children vs prim-only drivers.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:900,height:700}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  for(const isl of ['unity','quadrant','pa3way']){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1000));
    const info=await page.evaluate(()=>{
      // camera: high rear-quarter like his shot
      const b=V3D.bnd||1; V3D.thA=2.2; V3D.phA=0.9; V3D.dist=b*2.2; if(V3D.tgt)V3D.tgt.set(0,0,0);
      render3d();
      let cad=0, drv=0;
      V3D.scene.traverse(o=>{ if(o.userData&&o.userData.cad)cad++; });
      return {cad, n:(window.MEH&&MEH.layout?MEH.layout.length:-1)};
    });
    const data=await page.evaluate(()=>V3D.renderer.domElement.toDataURL('image/png'));
    fs.writeFileSync('/tmp/corner_'+isl+'.png',Buffer.from(data.split(',')[1],'base64'));
    console.log(isl,JSON.stringify(info));
  }
  await browser.close();
})();
