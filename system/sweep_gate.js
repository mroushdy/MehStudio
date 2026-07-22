// sweep_gate.js - THE BAKED ORDER (Marwan, 2026-07-20): "Always check if drivers overlap
// and if the taps are incorrect" - in EVERY UI-reachable simple-mode state, not just island
// defaults. Iterates each island x curated drivers x mouth range through the REAL pipeline
// (DOM events -> the tool's own handlers), then audits:
//   OVERLAP: worst driver-pair signed clearance (all pairs, all kinds)
//   TAPS:    every port ON its host surface (wall / seam / pod face), pair centered on its
//            tap, inside its panel; cross-driver port spacing
// VERDICT per state: clean | flagged (honest fail rows / INFEASIBLE named) | SILENT (bad
// geometry with no red/fail shown) -> SILENT anywhere = GATE FAIL, exit 1.
// Wired into deploy.sh. Run: node sweep_gate.js [html]
const puppeteer=require('puppeteer-core');
const chromium=require('@sparticuz/chromium').default;
const path=require('path'), fs=require('fs');
(async()=>{
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1100,height:900}});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{if(/three\.min\.js/.test(req.url()))req.respond({contentType:'application/javascript',body:fs.readFileSync('node_modules/three/build/three.min.js','utf8')});else req.continue();});
  page.on('pageerror',e=>console.log('PAGEERR',String(e).slice(0,200)));
  await page.goto('file://'+path.resolve(process.argv[2]||'meh_studio_v4.html'),{waitUntil:'load'});
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'load'});
  await new Promise(r=>setTimeout(r,800));

  const CAPS={unity:30,coax2:36,knuckle:36,roundprint:24,pa3way:44,quadrant:64,wide:64};
  const plan=await page.evaluate(()=>{
    const p={};
    for(const isl of Object.keys(window.ARCH)){ if(isl==='free') continue;
      const D=(window.ARCH_DRV&&window.ARCH_DRV[isl])||{};
      p[isl]={woofs:D.woof||[], mids:D.mid||[]};
    }
    return p;
  });

  const audit=()=>page.evaluate(()=>{
    const IN=0.0254;
    const ev=MEH.evaluate(S); const st=ev.st;
    const fails=ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,24));
    const reds=ev.layout.filter(d=>d.collide).length;
    const infeas=/INFEASIBLE/.test((S.bindM||'')+(S.bindW||''));
    // OVERLAP: worst pair across ALL drivers
    let worst=1e9, wPair='';
    const L=ev.layout;
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
      const g=MEH.minRimDist(L[i],L[j]);
      if(g<worst){worst=g; wPair=L[i].kind+i+'-'+L[j].kind+j;}
    }
    // TAPS: on-surface, centered pairs, spacing
    const tapBad=[];
    for(const d of L){
      const prs=d.ports||[];
      for(const pr of prs){
        if(d.knPod){
          const f=d.knPod.face, n=d.knPod.n;
          const ax=Math.abs((pr.p[0]-f[0])*n[0]+(pr.p[1]-f[1])*n[1]+(pr.p[2]-f[2])*n[2]);
          const lat=Math.hypot(pr.p[0]-f[0],pr.p[1]-f[1],pr.p[2]-f[2]);
          if(ax>0.004||lat>d.knPod.r*1.35) tapBad.push(d.kind+' pod port off-face ax'+(ax*1000).toFixed(0)+' lat'+(lat*1000).toFixed(0));
        } else if(d.chamfer){
          const nO=d.chamfer.nOut;                                 // build 56c: the tap lives ON its chamfer board
          const off=Math.abs(pr.p[0]*nO[0]+pr.p[1]*nO[1]+pr.p[2]*nO[2]-d.chamfer.c0);
          const rad=Math.hypot(pr.p[1],pr.p[2]);
          if(off>0.004) tapBad.push('chamfer kidney off its board '+(off*1000).toFixed(1)+'mm');
          if(rad<((S.td||1)*0.0254/2)) tapBad.push('chamfer kidney inside the throat '+(rad*1000).toFixed(0)+'mm');
        } else {
          const m=MEH.cavityMargin(st,pr.p);
          if(Math.abs(m)>0.007) tapBad.push(d.kind+' port off-surface '+(m*1000).toFixed(0)+'mm');
        }
      }
      if(prs.length===2){
        const mid=[(prs[0].p[0]+prs[1].p[0])/2,(prs[0].p[1]+prs[1].p[1])/2,(prs[0].p[2]+prs[1].p[2])/2];
        let dv=[mid[0]-d.portC[0],mid[1]-d.portC[1],mid[2]-d.portC[2]];
        if(st.form!=='rect'){                                    // curved wall: chord sagitta is geometry, not a defect
          const rl=Math.hypot(d.portC[1],d.portC[2])||1;
          const rad=[0,d.portC[1]/rl,d.portC[2]/rl];
          const k=dv[0]*rad[0]+dv[1]*rad[1]+dv[2]*rad[2];
          dv=[dv[0]-k*rad[0],dv[1]-k*rad[1],dv[2]-k*rad[2]];
        }
        const off=Math.hypot(dv[0],dv[1],dv[2]);
        if(off>0.004) tapBad.push(d.kind+' port pair off its tap '+(off*1000).toFixed(0)+'mm');
      }
    }
    // cross-driver port spacing (approx radii)
    const rr=(d)=>{const ap=(d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,(d.kind==='mid'?S.npM:S.npW)); return Math.sqrt(ap/Math.PI);};
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)
      for(const a of (L[i].ports||[])) for(const b of (L[j].ports||[])){
        const g=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1],a.p[2]-b.p[2])-(rr(L[i])+rr(L[j]));
        if(g<-0.002) tapBad.push('ports overlap '+L[i].kind+i+'/'+L[j].kind+j+' '+(g*1000).toFixed(0)+'mm');
      }
    const flagged=fails.length>0||infeas;
    const silent=(!flagged)&&((worst<-0.003)||tapBad.length>0||reds>0);
    return {mouth:S.shape==='cone'||S.shape==='os'?S.mouthD:S.mouthW,
      worst_mm:+(worst*1000).toFixed(1), wPair, reds, fails, infeas,
      tapBad:tapBad.slice(0,3), verdict: silent?'SILENT':(flagged?'flagged':'clean')};
  });

  const setSel=async(id,v)=>{ const ok=await page.evaluate((id2,v2)=>{
      const e=document.getElementById(id2); if(!e) return false;
      const has=[...e.options].some(o=>o.value===v2 && !o.disabled); if(!has) return false;
      e.value=v2; e.dispatchEvent(new Event('change',{bubbles:true})); return true;
    },id,v); await new Promise(r=>setTimeout(r,450)); return ok; };
  const setNum=async(id,v)=>{ await page.evaluate((id2,v2)=>{
      const e=document.getElementById(id2); if(e){ e.value=v2; e.dispatchEvent(new Event('change',{bubbles:true})); }
    },id,v); await new Promise(r=>setTimeout(r,450)); };

  let silent=0, flagged=0, clean=0, rows=[];
  for(const isl of Object.keys(plan)){
    const states=[['default',async()=>{}]];
    states.push(['mouth=cap',async()=>{ await setNum(isl==='roundprint'?'num_mouthD':'num_mouthW',CAPS[isl]||44); }]);
    states.push(['mouth=-4',async()=>{ await page.evaluate((isl2)=>{const id=(isl2==='roundprint')?'num_mouthD':'num_mouthW'; const e=document.getElementById(id); if(e){e.value=Math.max(16,(+e.value||30)-4); e.dispatchEvent(new Event('change',{bubbles:true}));}},isl); await new Promise(r=>setTimeout(r,600)); }]);
    if(isl!=='roundprint') states.push(['thW=+20',async()=>{ await page.evaluate(()=>{const e=document.getElementById('num_thW'); if(e){e.value=Math.min(120,(+e.value||90)+20); e.dispatchEvent(new Event('change',{bubbles:true}));}}); await new Promise(r=>setTimeout(r,600)); }]);
    for(const w of plan[isl].woofs) states.push(['woof='+w, async()=>{ await setSel('sel_wfSel',w); }]);
    for(const m of plan[isl].mids)  states.push(['mid='+m,  async()=>{ await setSel('sel_midSel',m); }]);
    for(const [label,apply] of states){
      await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,900));
      await apply();
      const a=await audit();
      const tag=a.verdict==='SILENT'?'SILENT ':a.verdict==='flagged'?'flag   ':'clean  ';
      if(a.verdict==='SILENT') silent++; else if(a.verdict==='flagged') flagged++; else clean++;
      rows.push([isl,label,a]);
      if(a.verdict!=='clean')
        console.log(tag+isl.padEnd(10)+' '+label.padEnd(16)+' worst '+String(a.worst_mm).padStart(6)+'mm ('+a.wPair+') reds='+a.reds+
          (a.fails.length?' fails=['+a.fails.join(',')+']':'')+(a.infeas?' INFEASIBLE':'')+(a.tapBad.length?' taps=['+a.tapBad.join(' | ')+']':''));
    }
  }
  console.log('\nSWEEP: '+rows.length+' states  ·  clean '+clean+'  ·  honestly-flagged '+flagged+'  ·  SILENT '+silent);
  console.log(silent? 'SWEEP GATE FAIL - silent bad geometry reachable from the UI' : 'SWEEP GATE PASS - nothing silently wrong in the reachable space');
  await browser.close();
  process.exit(silent?1:0);
})();
