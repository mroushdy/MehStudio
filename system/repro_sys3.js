const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'); const fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1000,height:860}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
  const probe=async(tag)=>{const o=await page.evaluate(()=>{const ev=MEH.evaluate(S);
    return {L12:S.L12,Lw:S.Lw,plM:S.plM,plW:S.plW,latW:S.latW,bindM:S.bindM,bindW:S.bindW,
      fails:ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,30)),
      warns:ev.fit.filter(r=>r.st==='warn').length,
      reds:ev.layout.filter(d=>d.collide).length,
      pastMouth:(Math.max(0,...ev.layout.flatMap(d=>d.rim.concat(d.magRim).map(p=>p[0]-ev.st.depth)))*1000).toFixed(1)};});
    console.log(tag,JSON.stringify(o));};
  const shot=async(yaw,pitch,dist,name)=>{const data=await page.evaluate((y,p,d)=>{V3D.spin=false;V3D.yaw=y;V3D.pitch=p;V3D.dist=d;render3d();return V3D.renderer.domElement.toDataURL('image/png');},yaw,pitch,dist);
    fs.writeFileSync('/tmp/'+name,Buffer.from(data.split(',')[1],'base64'));};
  const load=async()=>{await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
    await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,600));};
  // A. CoSyne rect default (must stay healthy)
  await load(); await probe('A rect-DEF   ');
  // B. Marwan's screenshot state: rect 2-way, DE980TN, 2x 8PE21

  await page.evaluate(()=>{const el=document.getElementById('sel_topo'); el.value='cw'; el.dispatchEvent(new Event('change'));}); await new Promise(r=>setTimeout(r,300));
  await page.select('#sel_cdSel','de980'); await new Promise(r=>setTimeout(r,250));
  await page.select('#sel_wfSel','bc8pe'); await new Promise(r=>setTimeout(r,250));
  await page.evaluate(()=>{for(const kv of [['nW',2],['mouthW',28]]){const el=document.getElementById('num_'+kv[0]); el.value=kv[1]; el.dispatchEvent(new Event('change'));}});
  await page.evaluate(()=>{const el=document.getElementById('sel_topo'); el.value='cmw'; el.dispatchEvent(new Event('change'));}); await new Promise(r=>setTimeout(r,500));
  await new Promise(r=>setTimeout(r,500));
  await probe('B 3way-restore');
  await shot(Math.PI*0.85,0.35,1.8,'sys_rear.png'); await shot(0.0001,0.0001,2.0,'sys_front.png');
  const slots=await page.evaluate(()=>{let n=0,pos=[];V3D.scene.traverse(x=>{if(x.isMesh&&x.geometry.type==='CircleGeometry'){n++;pos.push([x.position.x.toFixed(2),x.position.y.toFixed(2),x.position.z.toFixed(2)]);}});
    const ys=MEH.evaluate(S).layout.map(d=>(d.center[1]*39.37).toFixed(2));
    return {slotMeshes:n,slotPos:pos,driverLateral_in:ys};});
  console.log('SLOTS',JSON.stringify(slots));
  await browser.close();
})();
