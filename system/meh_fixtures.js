// GOLDEN REFERENCE FIXTURES - each encodes a build from Marwan's shared reference images.
// The engine must reproduce these. Run: node meh_fixtures.js meh_studio_v4.html
const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'meh_studio_v4.html','utf8');
const m=html.match(/const MEH[\s\S]*?buildSidebar\(\);/);
const src=m[0].slice(0,m[0].lastIndexOf('buildSidebar'));
const sb={document:{getElementById:()=>null,createElement:()=>({})},localStorage:{getItem:()=>null,setItem:()=>{}},window:{},URL:{},Blob:function(){},navigator:{}};
const ctx=vm.createContext(sb); vm.runInContext(src,ctx);
vm.runInContext('globalThis.OUT={MEH,DEF}',ctx);
const {MEH,DEF}=sb.OUT;
let pass=0,fail=0;
const ck=(n,ok,detail)=>{ console.log((ok?'PASS  ':'FAIL  ')+n+(detail?'  ['+detail+']':'')); ok?pass++:fail++; };
const run=(name,S,expects)=>{
  console.log('== FIXTURE: '+name);
  const ev=MEH.evaluate(S);
  const fails=ev.fit.filter(r=>r.st==='fail').map(r=>r.name);
  const reds=ev.layout.filter(d=>d.collide).length;
  const woofs=ev.layout.filter(d=>d.kind==='woof'), mids=ev.layout.filter(d=>d.kind==='mid');
  const ctx2={ev,fails,reds,woofs,mids};
  for(const [label,fn] of expects){ let ok=false,detail='';
    try{ const r=fn(ctx2); ok=!!r; if(typeof r==='string'){detail=r;ok=false;} }catch(e){ detail=String(e).slice(0,60); }
    ck('  '+label, ok, detail||undefined); }
};

// F1 - Unity/CoSyne class (Marwan ref: tan Unity render + the Waslo calc sheet): rect ~24x15,
// small mids clustered near throat on the seams, 2 woofers one per driver wall,
// each straddling TWO ports; everything clear.
run('F1 Unity class (2 woofers x 2 ports, small mids at seams)',
  {...DEF, dwall:'topbot', plM:'diagonal', plW:'straddle', npW:2, nW:2, nM:4, L12:1.5, Lw:4.4},
  [ ['no geometric fails', c=>c.fails.length===0 || c.fails.join(',')],
    ['no red drivers', c=>c.reds===0 || 'reds='+c.reds],
    ['2 woofers, one per driver wall', c=>c.woofs.length===2 && Math.sign(c.woofs[0].center[1]*c.woofs[1].center[1] || c.woofs[0].center[2]*c.woofs[1].center[2])===-1],
    ['woofers centered on their walls', c=>c.woofs.every(d=>Math.min(Math.abs(d.center[1]),Math.abs(d.center[2]))<0.02)],
    ['mids inboard of woofers (axial)', c=>Math.max(...c.mids.map(d=>d.center[0]))<Math.min(...c.woofs.map(d=>d.center[0]))],
    ['all pair clearances >= -3mm (model tolerance, probe-verified)', c=>{let mn=1e9; const L=c.ev.layout;
        for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)mn=Math.min(mn,MEH.minRimDist(L[i],L[j]));
        return mn>=-0.003 || (mn*1000).toFixed(1)+'mm'; }] ]);

// F2 - sides canon (Marwan ref image: wide CAD, woofers enter from the SIDE walls)
run('F2 sides canon (dwall=sides)',
  {...DEF, dwall:'sides', plM:'diagonal', plW:'straddle', npW:2, nW:2, nM:4, L12:1.5, Lw:6.0},
  [ ['woofer normals y-dominant (side walls)', c=>c.woofs.every(d=>Math.abs(d.normal[1])>Math.abs(d.normal[2]))],
    ['no geometric fails', c=>c.fails.length===0 || c.fails.join(',')],
    ['no red drivers', c=>c.reds===0 || 'reds='+c.reds],
    ['woofer bodies inside the box footprint', c=>c.woofs.every(d=>d.body.every(p=>Math.abs(p[1])<(24/2+3)*0.0254)) ] ]);

run('F3 reference big-square (36in square, 4x12 on 45-deg chamfer plates - his reference photos)',
  {...DEF, mouthW:36, thW:90, thV:90, topo:'cw', threeWay:false, nM:0, nW:4, plW:'chamfer', npW:1, odW:31.5, dpW:12.0, sdW:522, coneW:25, vtcW:180, apW:69.6, Lw:3.9, L12:2.55, fxHi:600, td:1.4, cdDepth:1.7, cdBodyD:17, cdBodyL:13},
  [ ['4 woofers on 4 corner facets', c=>c.woofs.length===4 && new Set(c.woofs.map(d=>Math.sign(d.center[1])+','+Math.sign(d.center[2]))).size===4],
    ['facet normals diagonal (45-deg planes)', c=>c.woofs.every(d=>Math.abs(Math.abs(d.normal[1])-Math.abs(d.normal[2]))<0.25)],
    ['no geometric fails', c=>c.fails.length===0 || c.fails.join(',')],
    ['no red drivers', c=>c.reds===0 || 'reds='+c.reds],
    ['frames clear each other (the whole point)', c=>{let mn=1e9; for(let i=0;i<c.woofs.length;i++)for(let j=i+1;j<c.woofs.length;j++)mn=Math.min(mn,MEH.minRimDist(c.woofs[i],c.woofs[j])); return mn>=0.004 || (mn*1000).toFixed(1)+'mm';}] ]);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
