// probe_pa3way2.js - BEFORE-FIX probe of Marwan's "big format still messed up" report.
// Renders pa3way settled state (34"/90 - the exact state in his screenshot), dumps
// fitCheck rows, the signed worst-pair matrix (frame-vs-frame distances), and each
// driver's center/normal/od so the fix is designed against numbers, not vibes.
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
  await page.select('#sel_arch','pa3way'); await new Promise(r=>setTimeout(r,1200));
  const info=await page.evaluate(()=>{
    const ev=MEH.evaluate(S);
    const L=ev.layout.map((d,i)=>({i, kind:d.kind, od:+(d.od*1000).toFixed(0),
      c:d.center.map(v=>+(v*1000).toFixed(0)), n:d.normal.map(v=>+v.toFixed(2)),
      pl:d.pl||null, remote:!!d.remote, mount:d.mount? +(d.mount.h*1000).toFixed(0):null,
      nports:(d.ports||[]).length}));
    // pairwise frame clearance: center distance minus sum of frame radii (od/2), mm.
    // crude but the same first-order metric the fitCheck uses before the fine pass.
    const pairs=[];
    for(let a=0;a<ev.layout.length;a++)for(let b=a+1;b<ev.layout.length;b++){
      const A=ev.layout[a],B=ev.layout[b];
      const dc=Math.hypot(A.center[0]-B.center[0],A.center[1]-B.center[1],A.center[2]-B.center[2]);
      pairs.push({a:A.kind+a,b:B.kind+b, gap:+((dc-(A.od+B.od)/2)*1000).toFixed(1)});
    }
    pairs.sort((x,y)=>x.gap-y.gap);
    const rows=(ev.fit||[]).map(r=>({s:r.status||r.cls||'', t:(r.label||r.name||r.t||'')+' :: '+(r.detail||r.val||r.v||'')}));
    return {S:{mouthW:S.mouthW,thW:S.thW,nM:S.nM,nW:S.nW,plM:S.plM,plW:S.plW,L12:S.L12,Lw:S.Lw,odM:S.odM,odW:S.odW}, L, pairs:pairs.slice(0,8), rows};
  });
  console.log(JSON.stringify(info,null,1));
  const shot=async(y,p,d,nm)=>{const data=await page.evaluate((yy,pp,dd)=>{V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();return V3D.renderer.domElement.toDataURL('image/png');},y,p,d);
    fs.writeFileSync(nm,Buffer.from(data.split(',')[1],'base64'));};
  await shot(Math.PI*0.78,0.42,1.35,'/tmp/p3_after_rear.png');
  await shot(0.0001,0.0001,2.0,'/tmp/p3_after_front.png');
  await shot(Math.PI*0.5,0.05,1.5,'/tmp/p3_after_profile.png');
  await browser.close();
})();
