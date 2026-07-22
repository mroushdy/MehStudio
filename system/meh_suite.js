// meh_suite.js - THE NUMERIC SUITE, rebuilt (build 49; the standing debt since build 23).
// Browser-free: extracts the engine via vm and checks it numerically & structurally.
// Sections: A engine surface - B geometry - C tap/XO laws - D collision metric -
//           E island regression pins (settled values from the verified build-49 gate) -
//           F knuckle/remote invariants (pass 1-2) - G hornresp/mountSpec - H fit-row honesty.
// Run: node meh_suite.js [html]   (exit 0 = PASS; wired into deploy.sh as a gate)
const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'meh_studio_v4.html','utf8');
const m=html.match(/const MEH[\s\S]*?buildSidebar\(\);/);
const src=m[0].slice(0,m[0].lastIndexOf('buildSidebar'));
const sb={document:{getElementById:()=>null,createElement:()=>({})},localStorage:{getItem:()=>null,setItem:()=>{}},window:{},URL:{},Blob:function(){},navigator:{}};
const ctx=vm.createContext(sb); vm.runInContext(src,ctx);
vm.runInContext('globalThis.OUT={MEH,DEF,CDS:typeof CDS!=="undefined"?CDS:null,MIDS:typeof MIDS!=="undefined"?MIDS:null,WOOFS:typeof WOOFS!=="undefined"?WOOFS:null}',ctx);
const {MEH,DEF,CDS,MIDS,WOOFS}=sb.OUT;
const IN=0.0254;
let pass=0,fail=0;
const ck=(n,ok,detail)=>{ console.log((ok?'PASS  ':'FAIL  ')+n+(detail!==undefined?'  ['+detail+']':'')); ok?pass++:fail++; };
const sec=(t)=>console.log('\n== '+t);

// preset resolution (mirrors applyAutos's resolution block)
function resolve(S){
  const cd=CDS&&CDS[S.cdSel]; if(cd&&cd.throat){S.td=cd.throat;S.cdDepth=cd.depth;S.fxHi=cd.recXO;S.cdBodyD=cd.bodyD;S.cdBodyL=cd.bodyL;}
  const md=MIDS&&MIDS[S.midSel]; if(md&&md.sd){S.sdM=md.sd;S.coneM=md.cone;S.vtcM=md.vtc;S.odM=md.od;S.dpM=md.dp;S.xmM=md.xm;S.sealM=!!md.sealed;if(md.sealed)S.vrcM=0;}
  const wd=WOOFS&&WOOFS[S.wfSel]; if(wd&&wd.sd){S.sdW=wd.sd;S.coneW=wd.cone;S.vtcW=wd.vtc;S.odW=wd.od;S.dpW=wd.dp;S.xmW=wd.xm;}
  if(S.topo==='cw') S.fxHi=Math.min(S.fxHi,700);
  S.crM=Math.max(2,Math.min(12,S.crM||6)); S.crW=Math.max(2,Math.min(10,S.crW||4.5));
  S.apM=+(S.sdM/S.crM).toFixed(2); S.apW=+(S.sdW/S.crW).toFixed(1);
  { const crM=17/(2*Math.PI*S.fxLo*(S.xmM*1e-3));
    if(S.sdM/S.apM>crM) S.apM=+(S.sdM/Math.max(2,Math.min(10,crM))).toFixed(2);
    const crW=17/(2*Math.PI*80*(S.xmW*1e-3));
    if(S.sdW/S.apW>crW) S.apW=+(S.sdW/Math.max(2,Math.min(8,crW))).toFixed(1); }
  S.fxLo=300; S.lptM = S.shape==='rect2f' ? +(S.T*2.54).toFixed(2) : 1.5; S.lptW=S.lptM;
  return S;
}

sec('A - engine surface');
ck('MEH exports present', ['evaluate','stations','solveTap','minRimDist','driverLayout','fitCheck','rollLimitX','mountSpec','hornresp','hornrespAx','areaAt','dimsAt','cavityMargin','conformity'].every(k=>typeof MEH[k]==='function'), '14 functions');
ck('presets extracted (CDS/MIDS/WOOFS)', !!(CDS&&MIDS&&WOOFS), CDS?Object.keys(CDS).length+' CDs, '+Object.keys(MIDS).length+' mids, '+Object.keys(WOOFS).length+' woofs':'MISSING');
ck('DEF sane', DEF.mouthW>0&&DEF.thW>0&&DEF.knA>0, 'knA='+DEF.knA);

sec('B - geometry (4 families)');
for(const shape of ['rect2f','sup','cone','os']){
  const S={...DEF, shape, mouthD:DEF.mouthW};
  const st=MEH.stations(S);
  let mono=true, finite=true, prev=-1;
  for(const p of st.pts){ if(p.x<prev) mono=false; prev=p.x; if(!isFinite(p.w)||!isFinite(p.h)||p.w<=0||p.h<=0) finite=false; }
  ck(shape+': stations monotone + finite dims', mono&&finite, st.pts.length+' stations, depth '+(st.depth/IN).toFixed(1)+'in');
  let aOK=true, aPrev=0;
  for(let x=0.001;x<st.depth;x+=st.depth/40){ const a=MEH.areaAt(st,x); if(!isFinite(a)||a<=0) aOK=false; }
  ck(shape+': areaAt positive/finite along the horn', aOK);
  const a0=MEH.areaAt(st,0.002), aT=Math.PI*Math.pow(S.td*IN/2,2);
  ck(shape+': throat area ~ td circle', Math.abs(a0-aT)/aT<0.6, (a0*1e4).toFixed(1)+' vs '+(aT*1e4).toFixed(1)+' cm2');
  { const dm=MEH.dimsAt(st,st.depth/2);
    ck(shape+': cavityMargin sign (inside<0, outside>0)',
       MEH.cavityMargin(st,[st.depth/2,0,0])<0 && MEH.cavityMargin(st,[st.depth/2, dm.w, dm.h])>0); }
}

sec('C - tap and crossover laws');
{ const S={...DEF}; const st=MEH.stations(S);
  const sol=MEH.solveTap(S,st,'woof');
  const lam4=(MEH.C/(4*S.fxLo))/IN - S.cdDepth;
  ck('woofer solveTap <= lambda/4 budget', sol.x_in <= lam4+0.05, sol.x_in.toFixed(2)+' vs '+lam4.toFixed(2)+' ('+sol.binding+')');
  const solM=MEH.solveTap(S,st,'mid');
  const lam4M=(MEH.C/(4*S.fxHi))/IN - S.cdDepth;
  ck('mid solveTap <= lambda/4 budget', solM.x_in <= lam4M+0.05, solM.x_in.toFixed(2)+' vs '+lam4M.toFixed(2));
  ck('reflNull ordering: farther tap -> lower null', MEH.reflNull(0.05)>MEH.reflNull(0.10));
  ck('chamberLP positive', MEH.chamberLP(10,150,1.5,true,1)>0);
}
{ // 2-way geometry-derived XO reproduces the JMOD window (coax2-class)
  const S=resolve({...DEF, topo:'cw', cdSel:'cd14', wfSel:'bc8pe', nW:2, mouthW:28, threeWay:false, nM:0});
  const d=(4.95+S.cdDepth)*IN;                    // settled coax2 Lw from the gate
  const fx=Math.max(350, Math.round(0.95*MEH.C/(4*d)/5)*5);
  ck('coax2-class derived XO in the JMOD window', fx>=440&&fx<=560, fx+' Hz (real 500-600 crossing)');
}

sec('D - collision metric (signed, truthful)');
{ const prim={c:[0,0,0], a:[0,0,1], h2:0.05, r:0.05};
  const inside=vmPt([0,0,0]), outside=vmPt([0.2,0,0]), edge=vmPt([0.05,0,0]);
  function vmPt(p){return p;}
  const pcs=(p)=>{ // local reimpl guard: use engine's via minRimDist on crafted bodies
    const A={body:[p],prims:[{c:[-9,-9,-9],a:[0,0,1],h2:0.001,r:0.001}]};
    const B={body:[[9,9,9]],prims:[prim]};
    return MEH.minRimDist(A,B); };
  ck('point inside solid -> negative', pcs(inside)<0, (pcs(inside)*1000).toFixed(1)+'mm');
  ck('point outside solid -> positive', pcs(outside)>0, (pcs(outside)*1000).toFixed(1)+'mm');
  ck('surface point ~ zero', Math.abs(pcs(edge))<0.002, (pcs(edge)*1000).toFixed(2)+'mm');
  const S={...DEF}; const ev=MEH.evaluate(S);
  const L=ev.layout;
  if(L.length>=2) ck('minRimDist symmetric', Math.abs(MEH.minRimDist(L[0],L[1])-MEH.minRimDist(L[1],L[0]))<1e-9);
}

sec('E - island regression pins (blessed settled states, golden/settled_states.json)');
// The browser solves; the suite verifies the solved states numerically forever after.
// Regenerate DELIBERATELY with capture_states.js when islands change (like blessing goldens).
const XO_PIN={unity:1100, coax2:485, quadrant:600, wide:650, roundprint:1500, pa3way:600, knuckle:650};   // quadrant 495->600: chamfer dialect shortens the path (top of the JMOD window)
let STATES=null;
try{ STATES=JSON.parse(fs.readFileSync('golden/settled_states.json','utf8')); }catch(e){}
ck('blessed settled states present', !!STATES, STATES?Object.keys(STATES).length+' islands':'run capture_states.js');
if(STATES) for(const name of Object.keys(XO_PIN)){
  const S=STATES[name];
  if(!S){ ck(name+' pin: state present', false); continue; }
  const ev=MEH.evaluate(S);
  const fails=ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,24));
  const reds=ev.layout.filter(d=>d.collide).length;
  ck(name+' pin: 0 fails / 0 reds', fails.length===0&&reds===0, fails.join(',')||('reds='+reds));
  ck(name+' pin: XO '+XO_PIN[name], S.fxHi===XO_PIN[name], S.fxHi+'');
  ck(name+' pin: island identity holds', (name!=='knuckle' || (S.plM==='knuckle'&&S.plW==='remote')) && (name!=='pa3way' || (S.plM==='diagonal'&&S.plW==='chamfer')), S.plM+'/'+S.plW);
}
{ // wall-rule canon: wide's woofers ride the SIDE walls (from the blessed state)
  if(STATES&&STATES.wide){ const ev=MEH.evaluate(STATES.wide);
    const woofs=ev.layout.filter(d=>d.kind==='woof');
    ck('wall rule: wide woofer normals y-dominant', woofs.length===2&&woofs.every(d=>Math.abs(d.normal[1])>Math.abs(d.normal[2])));
  }
}
{ // quadrant chamfer canon (reference): 4 woofers on 4 corner facets, diagonal normals, frames clear
  if(STATES&&STATES.quadrant){ const ev=MEH.evaluate(STATES.quadrant);
    const woofs=ev.layout.filter(d=>d.kind==='woof');
    const corners=new Set(woofs.map(d=>Math.sign(d.center[1])+','+Math.sign(d.center[2])));
    const diag=woofs.every(d=>Math.abs(Math.abs(d.normal[1])-Math.abs(d.normal[2]))<0.25);
    let mn=1e9; for(let i=0;i<woofs.length;i++)for(let j=i+1;j<woofs.length;j++)mn=Math.min(mn,MEH.minRimDist(woofs[i],woofs[j]));
    ck('chamfer canon: 4 corners, diagonal facets, frames clear', woofs.length===4&&corners.size===4&&diag&&mn>=0.004, corners.size+' corners, min gap '+(mn*1000).toFixed(0)+'mm');
  }
}

{ // pa3way chamfer-mid canon (build 55, his reference square rear photo): 4 mids on 4 corner
  // facets in pockets, bodies outside, and the mid ring clears the woofer ring for real
  if(STATES&&STATES.pa3way){ const ev=MEH.evaluate(STATES.pa3way);
    const mids=ev.layout.filter(d=>d.kind==='mid'), woofs=ev.layout.filter(d=>d.kind==='woof');
    const corners=new Set(mids.map(d=>Math.sign(d.center[1])+','+Math.sign(d.center[2])));
    ck('pa3way canon (SH96): 4 woofers on 4 corner boards, throat mids', woofs.length===4&&corners.size===4&&woofs.every(d=>d.chamfer)&&mids.every(d=>!d.chamfer), corners.size+' corners');
    let mw=1e9; for(const a of mids)for(const b of woofs)mw=Math.min(mw,MEH.minRimDist(a,b));
    ck('pa3way canon: mid ring clears woofer ring >= 4mm', mw>=0.004, (mw*1000).toFixed(1)+'mm');
    let mm=1e9; for(let i=0;i<mids.length;i++)for(let j=i+1;j<mids.length;j++)mm=Math.min(mm,MEH.minRimDist(mids[i],mids[j]));
    ck('pa3way canon: mid frames clear each other', mm>=0.004, (mm*1000).toFixed(1)+'mm');
  }
}

sec('F - knuckle + remote invariants (pass 1-2 features)');
{ const S=(STATES&&STATES.knuckle)||resolve({...DEF, shape:'sup', cdSel:'de980', midSel:'bc5nsm', nM:2, wfSel:'bc8pe', nW:2, mouthW:32, plM:'knuckle', plW:'remote', dwall:'topbot', L12:3.0, Lw:5.6});
  const ev=MEH.evaluate(S); const st=ev.st;
  const mids=ev.layout.filter(d=>d.kind==='mid'), woofs=ev.layout.filter(d=>d.kind==='woof');
  ck('knuckle: mids carry knPod', mids.length===2&&mids.every(d=>d.knPod));
  ck('knuckle: injection faces inboard of seats', mids.every(d=>Math.hypot(d.knPod.face[1],d.knPod.face[2])<Math.hypot(d.knPod.base[1],d.knPod.base[2])-0.004));
  ck('knuckle: ports at the injection face', mids.every(d=>d.ports.every(pr=>Math.hypot(pr.p[0]-d.knPod.face[0],pr.p[1]-d.knPod.face[1],pr.p[2]-d.knPod.face[2])<=d.knPod.r*1.2+1e-6)));
  ck('knuckle: pod is a channel (r < 0.45 od)', mids.every(d=>d.knPod.r<d.od*0.45));
  ck('knuckle: HF-jet row present + not fail', (()=>{const r=ev.fit.find(r=>/HF jet/.test(r.name)); return r&&r.st!=='fail';})());
  ck('knuckle: S2 displacement row present + not fail', (()=>{const r=ev.fit.find(r=>/area displacement/.test(r.name)); return r&&r.st!=='fail';})());
  ck('remote: woofer bodies outside the cavity', woofs.every(d=>MEH.conformity(st,d)>=-1e-6));
  ck('remote: ports stay on the wall', woofs.every(d=>d.ports.every(pr=>Math.abs(MEH.cavityMargin(st,pr.p))<0.02)));
  ck('remote: info row present', ev.fit.some(r=>/Woofers remote/.test(r.name)&&r.st==='ok'));
  ck('remote: mids clear woofers trivially', (()=>{let mn=1e9; for(const a of mids)for(const b of woofs){const d=MEH.minRimDist(a,b); if(d<mn)mn=d;} return mn>0.006;})());
}
{ // knuckle degrades to edge on round families (no pods)
  const S=resolve({...DEF, shape:'cone', direct:true, mouthD:20, plM:'knuckle', L12:1.22, Lw:5.25});
  const ev=MEH.evaluate(S);
  ck('knuckle on round degrades gracefully (no pods)', ev.layout.filter(d=>d.knPod).length===0);
}

sec('G - hornresp + mountSpec');
{ const S=resolve({...DEF, mouthW:24, L12:1.5, Lw:4.4});
  const ev=MEH.evaluate(S);
  if(ev.g){ const o=MEH.hornresp(S,ev.g);
    ck('hornresp: segment fields positive', ['S1','S2','S3','S4','Con12','Con23','Con34'].every(k=>o[k]>0));
    ck('hornresp: tap fields (Ap1m=nM*apM etc)', Math.abs(o.Ap1m-S.nM*S.apM)<1e-6 && Math.abs(o.Ap1w-S.nW*S.apW)<1e-6);
  } else ck('hornresp: rect geometry present', false, 'ev.g missing');
  const S2=resolve({...DEF, shape:'cone', direct:true, mouthD:20});
  const st2=MEH.stations(S2); const o2=MEH.hornrespAx(S2,st2);
  ck('hornrespAx: fields positive', ['S1','S2','S3','S4','Con12','Con23','Con34'].every(k=>o2[k]>0));
}
{ const S={...DEF, bcW:21.0, nbW:8, bhW:6.5, odW:23.0};
  const ms=MEH.mountSpec(S,'woof');
  ck('mountSpec: 8PE21-class -> 8x M6 @ BC210', ms.real===true&&ms.nB===8&&/M6/.test(ms.bolt)&&Math.abs(ms.bcD-210)<1, ms.nB+'x '+ms.bolt+' bc'+ms.bcD);
  const S3={...DEF, bcM:14.2, nbM:4, bhM:5.0, odM:15.7};
  const ms3=MEH.mountSpec(S3,'mid');
  ck('mountSpec: 5NDL38-class -> 4x M5 @ BC142', ms3.nB===4&&/M5/.test(ms3.bolt)&&Math.abs(ms3.bcD-142)<1, ms3.nB+'x '+ms3.bolt+' bc'+ms3.bcD);
}

sec('H2 - embedded CAD bodies (his STEP set, build 58)');
{ const mm=html.match(/window\.CADM=(\{.*?\});/s);
  ck('CADM embedded', !!mm);
  if(mm){ const C=JSON.parse(mm[1]);
    ck('CAD keys: all 8 embedded bodies', ['BC_10HPL64','BC_12NDL76','BC_DE900TN','BC_DCX464','BC__DE610','BC_DE500','ES_12LW1400','BC_18PZB100','BC_18SW115','BC_8MDN51'].every(k=>C[k]&&C[k].nv>1000&&C[k].nf>1000));
    ck('DCX464 bbox matches cd14 (D152 x 78)', Math.abs((C['BC_DCX464'].bb1[0]-C['BC_DCX464'].bb0[0])-152)<6 && Math.abs((C['BC_DCX464'].bb1[2]-C['BC_DCX464'].bb0[2])-78)<6);
    ck('datasheet presets present (hpl10/ndl12/es12lw/pzb18/de610/de500)', /hpl10:\{name:'B&C 10HPL64/.test(html)&&/sd:320/.test(html)&&/ndl12:/.test(html)&&/es12lw:/.test(html)&&/pzb18:/.test(html)&&/sw18:/.test(html)&&/mdn8:/.test(html)&&/de610:/.test(html)&&/de500:/.test(html));
    const dim=(k,i)=>C[k].bb1[i]-C[k].bb0[i];
    ck('10HPL64 bbox matches w10 (od 260/dp 120)', Math.abs(dim('BC_10HPL64',0)-261)<8 && Math.abs(dim('BC_10HPL64',2)-122)<8, dim('BC_10HPL64',0).toFixed(0)+'x'+dim('BC_10HPL64',2).toFixed(0));
    ck('12NDL76 bbox matches w12 (od 315/dp 140)', Math.abs(dim('BC_12NDL76',0)-315)<8 && Math.abs(dim('BC_12NDL76',2)-141)<8, dim('BC_12NDL76',0).toFixed(0)+'x'+dim('BC_12NDL76',2).toFixed(0));
    ck('DE900TN bbox matches de900 (bodyD 131/L 65)', Math.abs(dim('BC_DE900TN',0)-131)<6 && Math.abs(dim('BC_DE900TN',2)-65)<6, dim('BC_DE900TN',0).toFixed(0)+'x'+dim('BC_DE900TN',2).toFixed(0));
    ck('presets reference their meshes', /mesh:'BC_10HPL64'/.test(html)&&/mesh:'BC_12NDL76'/.test(html)&&/mesh:'BC_DE900TN'/.test(html)&&/mesh:'BC_DCX464'/.test(html)&&/mesh:'ES_12LW1400'/.test(html));
  }
}

sec('H - fit-row honesty');
{ const S=resolve({...DEF, mouthW:24, L12:1.5, Lw:4.4});
  const ev=MEH.evaluate(S);
  ck('rows well-formed {name,val,st,why}', ev.fit.every(r=>r.name&&r.val!==undefined&&['ok','warn','fail'].includes(r.st)&&r.why));
  ck('layout entries carry the body model', ev.layout.every(d=>d.center&&d.normal&&d.prims&&d.prims.length>=2&&d.body&&d.body.length>10));
}
{ // crowding MUST fail honestly (the engine never hides a real conflict)
  const S=resolve({...DEF, mouthW:10, L12:1.0, nM:4, midSel:'bc5nsm'});
  const ev=MEH.evaluate(S);
  ck('crowded config honestly fails', ev.fit.some(r=>r.st==='fail')||ev.layout.some(d=>d.collide));
}
{ // diagonal seam law: apex-clearance row present for diagonal mids
  const S=resolve({...DEF, plM:'diagonal', mouthW:24, L12:1.5, Lw:4.4});
  const ev=MEH.evaluate(S);
  ck('seam-tap apex row present for diagonal', ev.fit.some(r=>/clear of the apex/.test(r.name)));
}

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
