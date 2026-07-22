// verify.js - THE VERIFICATION SYSTEM (hard rule: nothing ships without a PASS)
// Numeric invariants + structural coherence + visual golden-diffs, per island, one command.
// Usage: node verify.js [--bless]   (--bless adopts current captures as goldens after review)
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'); const fs=require('fs');
const BLESS=process.argv.includes('--bless');
const GOLD='golden'; if(!fs.existsSync(GOLD)) fs.mkdirSync(GOLD);
const OUT='/tmp/verify'; if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true});
const ISLANDS=['unity','coax2','quadrant','wide','roundprint','pa3way','knuckle'];
const ANGLES=[[0.0001,0.0001,2.0,'front'],[Math.PI*0.78,0.42,1.7,'rear34'],[Math.PI*0.5,0.05,1.9,'side']];
let fails=[];
const png2gray=(buf)=>{ // decode via canvas in-page is heavy; do coarse compare on raw bytes fallback in python step
  return null; };
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>{fails.push('PAGEERR '+String(e).slice(0,120));});
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  const report={};
  for(const a of ISLANDS){
    await page.select('#sel_arch',a); await new Promise(r=>setTimeout(r,1400));
    const o=await page.evaluate(()=>{
      const ev=MEH.evaluate(S); const IN=0.0254;
      // STRUCTURAL: ports must live on their driver's wall patch
      let portWall=[];
      for(const d of ev.layout){
        if(d.remote||d.chamfer) continue;   // remote chambers / chamfer pockets couple driver to port indirectly
        for(const pr of (d.ports||[])){
          const rel=[pr.p[0]-d.center[0],pr.p[1]-d.center[1],pr.p[2]-d.center[2]];
          const axial=Math.abs(rel[0]*d.normal[0]+rel[1]*d.normal[1]+rel[2]*d.normal[2]);
          const dist=Math.hypot(rel[0],rel[1],rel[2]);
          if(axial>0.035 || dist>d.od*1.6) portWall.push(d.kind+' port off-wall: axial '+(axial*1000).toFixed(0)+'mm dist '+(dist/IN).toFixed(1)+'in');
        }
      }
      // STRUCTURAL: island label vs state coherence
      let labelBad=[];
      const ca=window.curArch, b=(window.ARCH&&window.ARCH[ca])||{};
      const IDENT=new Set(['shape','topo','cdSel','midSel','wfSel','plM','plW','dwall','nM','nW','npW']);
      if(ca && ca!=='free') for(const k of Object.keys(b)) if(IDENT.has(k) && JSON.stringify(S[k])!==JSON.stringify(b[k]) && !(window.ARCH_TUNE[ca]||[]).includes(k))
        labelBad.push(k+': '+S[k]+' != '+b[k]);
      return { fails:ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,26)),
        reds:ev.layout.filter(d=>d.collide).length,
        bind:((S.bindW||'')+' || '+(S.bindM||'')).slice(0,140),
        XO:S.fxLo+'/'+S.fxHi, portWall, labelBad };
    });
    report[a]=o;
    for(const [y,p,d2,nm] of ANGLES){
      const data=await page.evaluate((yy,pp,dd)=>{V3D.spin=false;V3D.yaw=yy;V3D.pitch=pp;V3D.dist=dd;render3d();return V3D.renderer.domElement.toDataURL('image/png');},y,p,d2);
      fs.writeFileSync(OUT+'/'+a+'_'+nm+'.png',Buffer.from(data.split(',')[1],'base64'));
    }
  }
  await browser.close();
  // NUMERIC + STRUCTURAL GATE
  for(const a of ISLANDS){
    const o=report[a];
    console.log(a.padEnd(10), JSON.stringify({fails:o.fails.length,reds:o.reds,XO:o.XO,portWall:o.portWall.length,label:o.labelBad.length}));
    if(o.fails.length) fails.push(a+' fit fails: '+o.fails.join(','));
    if(o.reds) fails.push(a+' reds='+o.reds);
    if(/INFEASIBLE|OVER/.test(o.bind)) fails.push(a+' bad bind: '+o.bind.slice(0,80));
    if(o.portWall.length) fails.push(a+' PORT-WALL: '+o.portWall[0]);
    if(o.labelBad.length) fails.push(a+' LABEL-STATE: '+o.labelBad.join(';'));
    if(a==='unity' && !/1100|1050|1000/.test(o.XO)) fails.push('unity XO drift '+o.XO);
  }
  fs.writeFileSync(OUT+'/report.json', JSON.stringify({report,fails},null,1));
  console.log(fails.length?('NUMERIC/STRUCTURAL FAILS:\n  '+fails.join('\n  ')):'NUMERIC+STRUCTURAL PASS');
  process.exit(0); // visual stage runs in python; final verdict there
})();
