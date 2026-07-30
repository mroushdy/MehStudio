#!/usr/bin/env node
"use strict";

/* Headless MEH development sweep.
   This intentionally exercises the same engine/two-way core used by the
   browser without creating a DOM, WebGL context, scene, camera, or GPU
   resource.  It is the fast first stage of development QA; only surviving
   states need to enter the browser render-inspection matrix. */

const fs=require("fs");
const vm=require("vm");
const path=require("path");
const M=require("./engine.js");
const shell=fs.readFileSync(path.join(__dirname,"shell.html"),"utf8");

function objectConstant(source,name){
  const marker="const "+name+"=",at=source.indexOf(marker);
  if(at<0)throw new Error("missing "+name);
  const begin=source.indexOf("{",at+marker.length);
  let depth=0,quote="",line=false,block=false;
  for(let i=begin;i<source.length;i++){
    const c=source[i],n=source[i+1];
    if(line){if(c==="\n")line=false;continue;}
    if(block){if(c==="*"&&n==="/"){block=false;i++;}continue;}
    if(quote){if(c==="\\"){i++;continue;}if(c===quote)quote="";continue;}
    if(c==="/"&&n==="/"){line=true;i++;continue;}
    if(c==="/"&&n==="*"){block=true;i++;continue;}
    if(c==="'"||c==='"'||c==="`"){quote=c;continue;}
    if(c==="{")depth++;
    if(c==="}"&&--depth===0)return vm.runInNewContext("("+source.slice(begin,i+1)+")");
  }
  throw new Error("unterminated "+name);
}

const WPRE=objectConstant(shell,"WPRE"),MPRE=objectConstant(shell,"MPRE"),
  CXPRE=objectConstant(shell,"CXPRE"),CDP=objectConstant(shell,"CDP");
const T={WPRE,MPRE,CXPRE,CDP};
const failures=[];
let scenarios=0,refusals=0;
const recommended=(family,count)=>({
  ...M.TWO_ARCH[family].defaults,topo:"2way",twoArch:family,twoFamily:family,
  twoDesign:"arch:"+family,nW:count,mouthW:52,mouthCap:64,covH:90,covV:60,
  rollR:2,wallT:0.012,wPre:"w8",odW:22.5,dpW:9,sdW:220,vtcW:80,xmW:7,
  cdSel:"dcx464",td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4
});
const adapt=(S,key)=>M.smartAdapt2way(S,key,T).S2;

function run(label,S,expectValid=true){
  scenarios++;
  try{
    const r=M.solve(S),P=r.ev.plan;
    if(!P||!Array.isArray(P.drivers)||P.drivers.length!==r.S.nW)
      failures.push(label+": incomplete design plan");
    if(!Array.isArray(P.allPorts)||P.allPorts.length!==r.S.nW*r.S.npW)
      failures.push(label+": wrong tap count");
    if(r.infeasible){
      refusals++;
      const named=(r.ev.rows||[]).filter(x=>x.st==="fail").map(x=>x.name);
      if(expectValid)failures.push(label+": refused — "+named.join(", "));
      if(!named.length)failures.push(label+": refusal has no explanatory law");
    }
  }catch(err){
    failures.push(label+": exception — "+(err&&err.stack||err));
  }
}

for(const family of ["panel","radial"]){
  for(const count of M.TWO_ARCH[family].counts){
    const B=recommended(family,count);
    run(family+" count "+count,adapt(B,"nW"));
    for(const npW of [1,2])run(family+" "+count+" · "+npW+" tap(s)",
      adapt({...B,npW},"npW"));
    for(const shW of ["round","oval","slot"])run(family+" "+count+" · "+shW,
      adapt({...B,shW},"shW"));
    for(const driverCellConstruction of ["integrated","cartridge"])
      run(family+" "+count+" · "+driverCellConstruction,
        adapt({...B,driverCellConstruction},"driverCellConstruction"),
        driverCellConstruction==="integrated");
  }
}

for(const family of ["panel","radial"]){
  for(const count of M.TWO_ARCH[family].counts){
    const period=360/count;
    for(const driverArrayRotationDeg of [0,period*0.25,period*0.5,period*0.75])
      run(family+" "+count+" array rotation "+driverArrayRotationDeg.toFixed(2),
        adapt({...recommended(family,count),
          driverArrayMode:"manual",driverArrayRotationDeg},
        "driverArrayRotationDeg"),false);
    run(family+" "+count+" array auto fit",
      adapt({...recommended(family,count),driverArrayMode:"auto"},
        "driverArrayMode"));
  }
}
for(const adapterReach of [35,65,120])
  run("radial adapter reach "+adapterReach,{...recommended("radial",4),adapterReach});

for(const driverMountExtraMm of [0,20,40,60])
  for(const driverAxisBlend of [0,0.25,0.5,1])
    run("printed manifold +"+driverMountExtraMm+" mm blend "
      +driverAxisBlend.toFixed(2),
    adapt({...recommended("panel",2),
      driverMountMode:"extended-manifold",
      driverMountExtraMm,driverAxisBlend},
    "driverMountExtraMm"),false);

for(const wPre of Object.keys(WPRE)){
  let S=adapt({...recommended("radial",4),wPre},"wPre");
  /* A very large frame may need the widest supported mouth; adaptation owns
     that dependent dimension but never changes radial/count intent. */
  S={...S,mouthW:Math.max(S.mouthW||0,52),mouthCap:64};
  /* Large frames remain selectable inputs, but four of the 15/18-inch
     packages cannot satisfy both the complete bearing envelope and tap-area
     law within the 64-inch product cap. They must refuse explicitly rather
     than clip a mount or silently change count. */
  const expectedRefusal=new Set(["w15","pzb18","sw18"]);
  run("LF driver "+wPre,S,!expectedRefusal.has(wPre));
  if(S.twoArch!=="radial"||S.nW!==4)failures.push("LF driver "+wPre+": family/count drift");
}

for(const [cdSel,CD] of Object.entries(CDP)){
  let S=recommended("radial",4);
  S={...S,wPre:"w5",odW:WPRE.w5.od,dpW:WPRE.w5.dp,sdW:WPRE.w5.sd,
    xmW:WPRE.w5.xm,cdSel};
  S=adapt(S,"cdSel");
  const ceiling=M.twoWayPlan(S).coneCeil;
  run("CD "+cdSel,S,CD.floor<=ceiling+1);
}

for(const [style,seN] of [["smooth",2],["smooth",6],["angular",12]])
  for(const [covH,covV] of [[40,30],[60,60],[90,60],[120,90],[120,120]])
    run(style+" n="+seN+" "+covH+"×"+covV,
      adapt({...recommended("radial",4),style,seN,covH,covV},"covH"),
      !(style==="smooth"&&seN===2&&covH===40&&covV===30));

for(const mouthW of [12,18,24,36,52,64])
  run("exploratory mouth "+mouthW,{...recommended("panel",2),mouthW},false);
for(const twoXO of [300,400,500,700,900])
  run("target XO "+twoXO,adapt({...recommended("panel",2),twoXO},"twoXO"),false);
for(const tapCRW of [1.5,2.5,4,6,8,12,16,20])
  run("Sd/Ap "+tapCRW,adapt({...recommended("panel",2),tapCRW},"tapCRW"),false);

for(const b of M.BUILDS["2way"])
  run("documented "+b.key,{...b.s});

const result={scenarios,refusals,failures:failures.length};
console.log(JSON.stringify(result,null,2));
if(failures.length){
  failures.slice(0,120).forEach(x=>console.error("✗ "+x));
  process.exit(1);
}
console.log("SETTING SWEEP PASS — every exposed two-way selection produced a complete plan or an explicit law refusal");
