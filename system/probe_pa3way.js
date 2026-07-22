// OPEN CASE #1 pair probe (pointCylSigned loop), per handoff mandate: run BEFORE any fix.
// pa3way: Ø157 bc5nsm mids (top/bottom walls) vs Ø260 w10 woofers (side walls, dwall='sides').
// Question: with plM='corner' HONESTLY applied, which primitive pair interpenetrates, and does
// 'edge' clear it? Runs in-page so the REAL driver presets are resolved by the UI.
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve('meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));
  await page.select('#sel_arch','pa3way'); await new Promise(r=>setTimeout(r,1400));

  const out=await page.evaluate(()=>{
    const IN=0.0254;
    const wallOf=(nrm)=>{const ax=['x','y','z'];let mi=0;for(let i=1;i<3;i++)if(Math.abs(nrm[i])>Math.abs(nrm[mi]))mi=i;
      return (mi===1?'side(y)':mi===2?'topbot(z)':'axial(x)')+(nrm[mi]<0?'-':'+');};
    // full-detail pair probe: for every mid x woof, find the min signed distance and WHICH prim/point.
    function pairProbe(layout){
      let best=null;
      const mids=layout.filter(d=>d.kind==='mid'), woofs=layout.filter(d=>d.kind==='woof');
      const scan=(A,B,ai,bi,aKind,bKind)=>{
        for(let pi=0;pi<A.body.length;pi++){ const p=A.body[pi];
          for(let qi=0;qi<B.prims.length;qi++){ const Q=B.prims[qi];
            const w=[p[0]-Q.c[0],p[1]-Q.c[1],p[2]-Q.c[2]];
            const dz=w[0]*Q.a[0]+w[1]*Q.a[1]+w[2]*Q.a[2];
            const rad=Math.hypot(w[0]-Q.a[0]*dz,w[1]-Q.a[1]*dz,w[2]-Q.a[2]*dz);
            const ddz=Math.abs(dz)-Q.h2, ddr=rad-Q.r;
            const d=(ddz<0&&ddr<0)?Math.max(ddz,ddr):Math.hypot(Math.max(0,ddz),Math.max(0,ddr));
            if(!best||d<best.d){best={d, d_mm:+(d*1000).toFixed(1),
              pair:aKind+'#'+ai+'('+wallOf(A.normal)+') body-pt  vs  '+bKind+'#'+bi+'('+wallOf(B.normal)+') '+(qi===0?'FRAME-puck':'MOTOR-core'),
              pt_in:p.map(x=>+(x/IN).toFixed(2)), primC_in:Q.c.map(x=>+(x/IN).toFixed(2)), primR_in:+(Q.r/IN).toFixed(2)};}
          }
        }
      };
      for(let i=0;i<mids.length;i++)for(let j=0;j<woofs.length;j++){ scan(mids[i],woofs[j],i,j,'mid','woof'); scan(woofs[j],mids[i],j,i,'woof','mid'); }
      return best;
    }
    const baseS=JSON.parse(JSON.stringify(S));
    const results={};
    for(const pl of ['diagonal','corner','edge','knuckle']){
      for(const mw of [30,34,36,38,40]){
        const S2={...baseS, adv:true, plM:pl, mouthW:mw};
        const ev=MEH.evaluate(S2);
        const mids=ev.layout.filter(d=>d.kind==='mid'), woofs=ev.layout.filter(d=>d.kind==='woof');
        let mn=1e9; for(const a of mids)for(const b of woofs){const d=MEH.minRimDist(a,b); if(d<mn)mn=d;}
        results[pl+' @'+mw+'in']={
          midwoof_mm:+(mn*1000).toFixed(1),
          reds:ev.layout.filter(d=>d.collide).length,
          fails:ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,24)),
          worstPair: pairProbe(ev.layout)
        };
      }
    }
    return {
      settled:{mouthW:baseS.mouthW,plM:baseS.plM,dwall:baseS.dwall,nM:baseS.nM,nW:baseS.nW,
        midOD_in:+(baseS.odM*0.01/IN).toFixed(2), woofOD_in:+(baseS.odW*0.01/IN).toFixed(2),
        Lw:baseS.Lw,L12:baseS.L12,fxHi:baseS.fxHi},
      results
    };
  });
  console.log(JSON.stringify(out,null,1));
  await browser.close();
})();
