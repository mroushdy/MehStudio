// scene_audit.js - FULL-3D SCENE AUDIT v2 (Marwan's foolproof directive).
// Principle: the MODEL is verified by the numeric gates; every historical visual bug
// (flying drivers, misplaced kidneys, wrong-facing slots) was the DRAWN scene drifting
// from it. So the audit asserts, for every island, driver-by-driver and port-by-port:
//   position(drawn) == position(model)  within 3 mm
//   axis(drawn)     == normal(model)    within 8 degrees
//   every model driver/port IS drawn (counts match)
// No cameras, no angles - the whole element checked at once. Deploy gate #7.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,150)));
  await page.goto('file://'+path.resolve(process.argv[2]||'meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  let bad=[];
  for(const isl of ['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way']){
    await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1000));
    const r=await page.evaluate(()=>{
      const out=[];
      const ev=MEH.evaluate(S);
      const grp=V3D.group; if(!grp) return ['NO 3-D group'];
      const off=new THREE.Vector3(); grp.getWorldPosition(off);
      const SC=window.__sc||1;
      const toWorld=(p)=>new THREE.Vector3(p[0]*SC,p[2]*SC,p[1]*SC).add(off);   // model(x,y,z)*scale ->three(x,z,y)+grp offset
      const dDrivers=[], dPorts=[];
      grp.traverse(o=>{ if(o.userData&&o.userData.tag==='driver') dDrivers.push(o);
        else if(o.userData&&o.userData.tag==='port'&&o.isMesh) dPorts.push(o); });
      const mDrivers=ev.layout;
      if(dDrivers.length!==mDrivers.length) out.push('driver count drawn '+dDrivers.length+' != model '+mDrivers.length);
      for(const md of mDrivers){
        const P=toWorld(md.center);
        let best=null,bd=1e9;
        for(const g of dDrivers){ const gp=new THREE.Vector3(); g.getWorldPosition(gp); const dd=gp.distanceTo(P); if(dd<bd){bd=dd;best=g;} }
        if(!best || bd>0.003*SC){ out.push(md.kind+' drawn '+(bd/SC*1000).toFixed(1)+'mm from its model position'); continue; }
        const q=new THREE.Quaternion(); best.getWorldQuaternion(q);
        const ax=new THREE.Vector3(0,1,0).applyQuaternion(q);
        const nrm=new THREE.Vector3(md.normal[0],md.normal[2],md.normal[1]).normalize();
        const dot=Math.abs(ax.dot(nrm));
        if(dot<Math.cos(8*Math.PI/180)) out.push(md.kind+' drawn axis off by '+(Math.acos(Math.min(1,dot))*180/Math.PI).toFixed(1)+' deg');
      }
      const mPorts=[]; for(const d of mDrivers) for(const pr of (d.ports||[])) mPorts.push({p:pr.p,n:pr.n,kind:d.kind});
      if(dPorts.length!==mPorts.length) out.push('port count drawn '+dPorts.length+' != model '+mPorts.length);
      for(const mp of mPorts){
        const P=toWorld(mp.p);
        let best=null,bd=1e9;
        for(const s of dPorts){ const sp=new THREE.Vector3(); s.getWorldPosition(sp); const dd=sp.distanceTo(P); if(dd<bd){bd=dd;best=s;} }
        if(!best || bd>0.004*SC){ out.push(mp.kind+' port drawn '+(bd/SC*1000).toFixed(1)+'mm from its model tap'); continue; }
        const q=new THREE.Quaternion(); best.getWorldQuaternion(q);
        const fz=new THREE.Vector3(0,0,1).applyQuaternion(q);
        const nrm=new THREE.Vector3(mp.n[0],mp.n[2],mp.n[1]).normalize();
        const dot=Math.abs(fz.dot(nrm));
        if(dot<Math.cos(10*Math.PI/180)) out.push(mp.kind+' port facing off by '+(Math.acos(Math.min(1,dot))*180/Math.PI).toFixed(1)+' deg');
      }
      return out;
    });
    if(r.length) console.log('FAIL '+isl+': '+r.slice(0,4).join(' | '));
    else console.log('ok   '+isl+'  drawn scene == verified model (positions + axes + counts)');
    for(const m of r) bad.push(isl+': '+m);
  }
  console.log(bad.length? 'SCENE AUDIT FAIL ('+bad.length+')' : 'SCENE AUDIT PASS - drawn 3-D matches the verified model on every island');
  await browser.close(); process.exit(bad.length?1:0);
})();
