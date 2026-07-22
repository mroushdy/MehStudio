// PROBE: do fixture meshes (adapters/collars/pods) protrude past the mouth plane or
// into the horn air on pa3way build 72? Samples every fixture vertex in world space.
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
  await page.select('#sel_arch','pa3way'); await new Promise(r=>setTimeout(r,2000));
  const out=await page.evaluate(()=>{
    const st=MEH.stations(S), sc=window.__sc, res=[];
    const gp=new THREE.Vector3();
    V3D.group.traverse(o=>{ if(!o.isMesh||!o.userData||o.userData.tag!=='fixture') return;
      const pos=o.geometry.attributes.position; let worstX=-1e9, inAir=0, n=0;
      for(let i=0;i<pos.count;i+=3){ gp.set(pos.getX(i),pos.getY(i),pos.getZ(i)); o.localToWorld(gp);
        const mx=gp.x/sc, my=gp.z/sc, mz=gp.y/sc;  // scene (x,z,y) -> model
        worstX=Math.max(worstX, mx-st.depth);
        const d=MEH.dimsAt(st,Math.max(0,Math.min(st.depth,mx)));
        if(mx>0&&mx<st.depth&&Math.abs(my)<d.w/2-0.002&&Math.abs(mz)<d.h/2-0.002) inAir++;
        n++; }
      res.push({geo:o.geometry.type, pastMouth_mm:(worstX*1000|0), inAirVerts:inAir, verts:n});
    });
    return {depth:st.depth, res};
  });
  console.log(JSON.stringify(out,null,1));
  await browser.close();
})();
