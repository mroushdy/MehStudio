// Engine-sandbox test of the knuckle branch v2 (folded passage): rect + sup.
const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'meh_studio_v4.html','utf8');
const m=html.match(/const MEH[\s\S]*?buildSidebar\(\);/);
const src=m[0].slice(0,m[0].lastIndexOf('buildSidebar'));
const sb={document:{getElementById:()=>null,createElement:()=>({})},localStorage:{getItem:()=>null,setItem:()=>{}},window:{},URL:{},Blob:function(){},navigator:{}};
const ctx=vm.createContext(sb); vm.runInContext(src,ctx);
vm.runInContext('globalThis.OUT={MEH,DEF}',ctx);
const {MEH,DEF}=sb.OUT; const IN=0.0254;
let pass=0,fail=0; const ck=(n,ok,d)=>{console.log((ok?'PASS  ':'FAIL  ')+n+(d?'  ['+d+']':''));ok?pass++:fail++;};

for(const [name,S] of [
  ['rect knuckle 4 mids (DEF drivers)', {...DEF, plM:'knuckle', nM:4, nW:2, dwall:'sides', mouthW:30, L12:2.0, Lw:6.0}],
  ['sup knuckle 2 mids + remote woofs (SAWMOD)',  {...DEF, shape:'sup', plM:'knuckle', plW:'remote', dwall:'topbot', nM:2, nW:2, mouthW:32, L12:2.0, Lw:5.6}],
]){
  console.log('== '+name);
  const ev=MEH.evaluate(S);
  const mids=ev.layout.filter(d=>d.kind==='mid');
  ck('mids placed', mids.length===S.nM, 'got '+mids.length);
  ck('all mids carry knPod', mids.every(d=>d.knPod));
  // drivers stay seated on the wall; only the small passage reaches inward
  const faceAx=mids.map(d=>Math.hypot(d.knPod.face[1],d.knPod.face[2]));
  const seatAx=mids.map(d=>Math.hypot(d.knPod.base[1],d.knPod.base[2]));
  ck('injection faces inboard of seats', faceAx.every((a,i)=>a<seatAx[i]-0.004),
     faceAx.map((a,i)=>(a*1000).toFixed(0)+'<'+(seatAx[i]*1000).toFixed(0)).join(' '));
  ck('ports at the injection face', mids.every(d=>d.ports.every(pr=>
     Math.hypot(pr.p[0]-d.knPod.face[0],pr.p[1]-d.knPod.face[1],pr.p[2]-d.knPod.face[2])<=d.knPod.r*1.2+1e-6)));
  ck('pod radius is a channel, not a frame', mids.every(d=>d.knPod.r < d.od*0.45),
     'r='+(mids[0].knPod.r*1000).toFixed(0)+'mm vs od='+(mids[0].od*1000).toFixed(0));
  const rows=ev.fit.map(r=>r.name);
  ck('passage check present', rows.some(n=>/HF jet/.test(n)));
  ck('area displacement present', rows.some(n=>/area displacement/.test(n)));
  const pas=ev.fit.find(r=>/HF jet/.test(r.name)), ar=ev.fit.find(r=>/area displacement/.test(r.name));
  console.log('   passage: '+pas.val+' ('+pas.st+')   area: '+ar.val+' ('+ar.st+')');
  ck('conformity row ACTIVE for knuckle mids', rows.some(n=>/Mid frames conform/.test(n)));
  const fails=ev.fit.filter(r=>r.st==='fail').map(r=>r.name.slice(0,26));
  const midFails=ev.fit.filter(r=>r.st==='fail'&&(r.sec==='MID'||/Mid ring vs woofer/.test(r.name))).map(r=>r.name.slice(0,26));
  const reds=ev.layout.filter(d=>d.collide).length;
  console.log('   all-fails=['+fails.join(',')+'] reds='+reds);
  ck('knuckle mid-side is clean (raw config, no solver)', midFails.length===0 && reds===0, 'midFails='+midFails.length+' reds='+reds);
}
console.log('\n'+pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
