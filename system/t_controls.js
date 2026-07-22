// t_controls.js - THE DEAD-CONTROL GATE (Marwan: 'ports/woofer doesn't work').
// Every promoted control on every island is ACTUATED through the DOM; the state must take
// the value AND the evaluated geometry must respond (ports/shape/placement/CR). A control
// that silently does nothing fails the deploy. Run: node t_controls.js [html]
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
  let pass=0,fail=0; const bad=[];
  const ck=(n,ok,d)=>{ if(!ok){bad.push(n+(d?' ['+d+']':'')); fail++;} else pass++; };
  const ISLANDS=['unity','coax2','quadrant','knuckle','wide','roundprint','pa3way'];
  // per-key: how to nudge it + what must respond
  const NUDGE={
    npM:{kind:'num', val:2, probe:(S)=>S.npM, geo:(ev,S)=>{const m=ev.layout.filter(d=>d.kind==='mid')[0]; return m?(m.ports||[]).length:null;}},
    npW:{kind:'num', val:1, probe:(S)=>S.npW, geo:(ev,S)=>{const w=ev.layout.filter(d=>d.kind==='woof')[0]; return w?(w.ports||[]).length:null;}},
    shM:{kind:'sel', val:'sq', probe:(S)=>S.shM},
    shW:{kind:'sel', val:'sq', probe:(S)=>S.shW},
    crM:{kind:'num', val:4,  probe:(S)=>S.crM, geo:(ev,S)=>S.apM},
    crW:{kind:'num', val:6,  probe:(S)=>S.crW, geo:(ev,S)=>S.apW},
    nM: {kind:'num', val:'CNT', probe:(S)=>S.nM, geo:(ev,S)=>ev.layout.filter(d=>d.kind==='mid').length},
  };
  for(const isl of ISLANDS){
    const tune=await page.evaluate((i)=>window.ARCH_TUNE[i]||[],isl);
    for(const key of Object.keys(NUDGE)){
      if(!tune.includes(key)) continue;
      await page.select('#sel_arch',isl); await new Promise(r=>setTimeout(r,900));
      const before=await page.evaluate((k)=>{const ev=MEH.evaluate(S); const N={
        npM:(ev.layout.filter(d=>d.kind==='mid')[0]||{}).ports, npW:(ev.layout.filter(d=>d.kind==='woof')[0]||{}).ports,
        crM:S.apM, crW:S.apW, nM:ev.layout.filter(d=>d.kind==='mid').length};
        return {sv:S[k], geo:JSON.stringify(N[k]&&N[k].length!==undefined?N[k].length:N[k])};},key);
      let n=NUDGE[key];
      if(n.val==='CNT'){ const alt=await page.evaluate((i)=>{const c=(window.ARCH_CNT[i]||{}).nM||[2,4]; const cur=S.nM; return c.find(x=>x!==cur)||cur;},isl); n={...n, val:alt}; }
      const took=await page.evaluate((k,kind,v)=>{
        const id=(kind==='sel'?'sel_':'num_')+k; const e=document.getElementById(id);
        if(!e||e.offsetParent===null) return 'control hidden';
        e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); return true;
      },key,n.kind,n.val);
      await new Promise(r=>setTimeout(r,700));
      if(took!==true){ ck(isl+'.'+key+' reachable', false, String(took)); continue; }
      const after=await page.evaluate((k)=>{const ev=MEH.evaluate(S); const N={
        npM:(ev.layout.filter(d=>d.kind==='mid')[0]||{}).ports, npW:(ev.layout.filter(d=>d.kind==='woof')[0]||{}).ports,
        crM:S.apM, crW:S.apW, nM:ev.layout.filter(d=>d.kind==='mid').length};
        return {sv:S[k], geo:JSON.stringify(N[k]&&N[k].length!==undefined?N[k].length:N[k])};},key);
      ck(isl+'.'+key+' takes', String(after.sv)===String(n.val), after.sv+'!='+n.val);
      if(n.geo && String(before.sv)!==String(n.val)){
        let ok=after.geo!==before.geo;
        if(!ok && (key==='crM'||key==='crW')){
          ok=await page.evaluate(()=>/velocity-capped/.test(document.getElementById('autoinfo').innerHTML));
          if(ok) ck(isl+'.'+key+' capped BUT announced', true);
          else ck(isl+'.'+key+' geometry responds', false, 'stuck at '+after.geo+' with no cap notice');
          continue;
        }
        ck(isl+'.'+key+' geometry responds', ok, 'geo stuck at '+after.geo);
      }
    }
  }
  console.log(bad.length?('DEAD CONTROLS:\n  '+bad.join('\n  ')):'ALL CONTROLS LIVE');
  console.log(pass+' passed, '+fail+' failed');
  await browser.close(); process.exit(fail?1:0);
})();
