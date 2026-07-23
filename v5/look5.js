// look5.js - the v5 coding eyes: load v5/meh5.html headless, apply an optional
// state override, snap beauty views + the full page (checks panel + chart).
//   node look5.js ['{"topo":"3way"}'] [outname]
// Output: /tmp/look5/<outname>.png (2x2 grid).
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
const { execSync }=require('child_process');
(async()=>{
  const ov=process.argv[2]? JSON.parse(process.argv[2]) : null;
  const name=process.argv[3]||'v5';
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three(\.min)?\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('/root/hs/node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,300)));
  await page.goto('file://'+path.resolve('/root/hs/v5/meh5.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,900));
  if(ov){ await page.evaluate((o)=>{ Object.assign(S,o); rebuild(); }, ov);
    await new Promise(r=>setTimeout(r,900)); }
  fs.mkdirSync('/tmp/look5',{recursive:true});
  const shots=[];
  const snap=async(nm,yy,pp,dd)=>{ const d=await page.evaluate((yy,pp,dd)=>{
      V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();
      return V3D.renderer.domElement.toDataURL('image/png');},yy,pp,dd);
    const f='/tmp/look5/_'+nm+'.png';
    fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64')); shots.push(f); };
  await snap('front',0.0001,0.0001,2.1);
  await snap('rear34',Math.PI*0.78,0.42,2.0);
  await snap('fq',Math.PI*0.20,0.18,1.9);
  await page.screenshot({path:'/tmp/look5/_page.png',fullPage:false});
  shots.push('/tmp/look5/_page.png');
  const out='/tmp/look5/'+name+'.png';
  execSync(`cd /tmp/look5 && montage ${shots.join(' ')} -tile 2x2 -geometry +4+4 -background '#222' ${out}`);
  const summary=await page.evaluate(()=>{
    const rows=(window.__lastEv&&__lastEv.rows)||[];
    return { build:document.title.slice(0,50),
      fails:rows.filter(r=>r.st==='fail').map(r=>r.sec+'/'+r.name+'='+r.val),
      warns:rows.filter(r=>r.st==='warn').map(r=>r.sec+'/'+r.name+'='+r.val),
      xo:(typeof S!=='undefined')&&S.fxDerived, dialect:(typeof S!=='undefined')&&S.dialectW };
  });
  console.log(JSON.stringify(summary,null,1));
  console.log('WROTE '+out);
  await browser.close();
})();
