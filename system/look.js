// look.js - THE CODING EYES (Marwan: "visually coding what is happening").
// One command -> ONE composite image + a legend: beauty views, a FALSE-COLOR
// PROVENANCE pass (every part class a flat unique color - each pixel nameable),
// and a CROSS-SECTION cut through the axis. Run after every patch:
//   node look.js [island] ['{"wfSel":"w15"}']
// Output: /tmp/look/<island>.png (2x3 grid) + color legend on stdout.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
const { execSync }=require('child_process');
(async()=>{
  const isl=process.argv[2]||'quadrant';
  const ov=process.argv[3]? JSON.parse(process.argv[3]) : null;
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:760,height:560}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,1500));
  if(ov){ await page.evaluate((o)=>{ for(const k of Object.keys(o)){
      const el=document.getElementById('sel_'+k);
      if(el){ el.value=o[k]; el.dispatchEvent(new Event('change',{bubbles:true})); }
      else S[k]=o[k]; }
      if(window.applyAutos)applyAutos(); update(); }, ov);
    await new Promise(r=>setTimeout(r,1500)); }
  fs.mkdirSync('/tmp/look',{recursive:true});
  const shots=[];
  const snap=async(name,yy,pp,dd)=>{ const d=await page.evaluate((yy,pp,dd)=>{
      V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();
      return V3D.renderer.domElement.toDataURL('image/png');},yy,pp,dd);
    const f='/tmp/look/_'+name+'.png';
    fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64')); shots.push([name,f]); };
  // 1-2-3: beauty front / rear34 / side
  await snap('front',0.0001,0.0001,2.0);
  await snap('rear34',Math.PI*0.78,0.42,1.9);
  await snap('fq',Math.PI*0.20,0.18,1.8);
  // 4: FALSE-COLOR PROVENANCE - flat unique color per class; legend to stdout
  const legend=await page.evaluate(()=>{
    const PAL=[0xE6194B,0x3CB44B,0xFFE119,0x4363D8,0xF58231,0x911EB4,0x42D4F4,0xF032E6,
               0xBFEF45,0xFABED4,0x469990,0x9A6324,0xFFFAC8,0x800000,0xAAFFC3,0x808000];
    const classes={}, saved=[];
    let ci=0;
    V3D.scene.traverse(o=>{ if(!o.isMesh) return;
      if(o.material.transparent){ saved.push([o,o.material,o.visible]); o.visible=false; return; }   // ghost helpers hide, not paint
      const key=(o.userData.tag||'untag')+':'+o.geometry.type;
      if(!(key in classes)) classes[key]=PAL[ci++ % PAL.length];
      saved.push([o,o.material,o.visible]);
      o.material=new THREE.MeshBasicMaterial({color:classes[key],side:THREE.DoubleSide});
    });
    window.__lookRestore=saved;
    V3D.spin=false;V3D.yaw=Math.PI*0.78;V3D.pitch=0.42;V3D.dist=1.9;render3d();
    window.__provPng=V3D.renderer.domElement.toDataURL('image/png');   // capture IN the render call - buffer clears between evaluates
    const out={}; for(const k in classes) out[k]='#'+classes[k].toString(16).padStart(6,'0');
    return out;
  });
  { const d=await page.evaluate(()=>window.__provPng);
    fs.writeFileSync('/tmp/look/_prov.png',Buffer.from(d.split(',')[1],'base64'));
    shots.push(['provenance','/tmp/look/_prov.png']);
    await page.evaluate(()=>{ for(const [o,m,v] of window.__lookRestore){ o.material=m; o.visible=v; } window.__lookRestore=null; }); }
  // 5: CROSS-SECTION - clip half the scene at z=0 (through the axis), look from the cut side
  { const d=await page.evaluate(()=>{
      V3D.renderer.localClippingEnabled=true;
      const pl=new THREE.Plane(new THREE.Vector3(0,0,-1),0);   // keep z<0 half
      V3D.scene.traverse(o=>{ if(o.isMesh){ o.material.clippingPlanes=[pl]; o.material.clipShadows=true; }});
      V3D.spin=false;V3D.yaw=Math.PI*0.25;V3D.pitch=0.18;V3D.dist=1.7;render3d();
      const png=V3D.renderer.domElement.toDataURL('image/png');
      V3D.scene.traverse(o=>{ if(o.isMesh&&o.material.clippingPlanes) o.material.clippingPlanes=null; });
      V3D.renderer.localClippingEnabled=false; render3d();
      return png; });
    fs.writeFileSync('/tmp/look/_section.png',Buffer.from(d.split(',')[1],'base64'));
    shots.push(['section','/tmp/look/_section.png']); }
  // 6: INSPECT-framed worst finding (or throat close-up when clean)
  { const d=await page.evaluate(()=>{
      const r=INSPECT.audit();
      if(r.length){ INSPECT.frame(r[0]); }
      else { V3D.spin=false;V3D.yaw=Math.PI*0.85;V3D.pitch=0.30;V3D.dist=0.9; if(V3D.tgt)V3D.tgt.set(0,0,0); }
      render3d(); return V3D.renderer.domElement.toDataURL('image/png'); });
    fs.writeFileSync('/tmp/look/_focus.png',Buffer.from(d.split(',')[1],'base64'));
    shots.push(['focus','/tmp/look/_focus.png']); }
  const rep=await page.evaluate(()=>{const r=INSPECT.report();
    return {mouthW:S.mouthW, shape:S.shape, fails:r.fails, warns:r.warns,
      reds:document.querySelectorAll('tr.bad,td.bad').length,
      v:r.violations.slice(0,4).map(x=>x.code+' '+x.msg.slice(0,60))};});
  await browser.close();
  // stitch 2x3 with labels
  const cells=shots.map(([n,f])=>`("${f}","${n}")`).join(',');
  execSync(`python3 - <<PYEOF
from PIL import Image, ImageDraw
cells=[${cells}]
ims=[(Image.open(f),n) for f,n in cells]
w,h=ims[0][0].size
G=Image.new('RGB',(w*3+8,h*2+30),(24,24,24))
d=ImageDraw.Draw(G)
for i,(im,n) in enumerate(ims):
    x,y=(i%3)*(w+4),(i//3)*(h+4)+26
    G.paste(im,(x,y)); d.text((x+6,y-18),n,fill=(255,255,255))
G.save('/tmp/look/${isl}.png')
PYEOF`);
  console.log('LEGEND', JSON.stringify(legend,null,1));
  console.log('STATE ', JSON.stringify(rep));
  console.log('IMAGE  /tmp/look/'+isl+'.png');
})();
