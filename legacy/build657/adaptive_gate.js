#!/usr/bin/env node
"use strict";

const fs=require("fs");
const vm=require("vm");
const path=require("path");
const M=require("./engine.js");
const shell=fs.readFileSync(path.join(__dirname,"shell.html"),"utf8");
let checks=0;
const failures=[];
const check=(condition,message)=>{checks++;if(!condition)failures.push(message);};

function objectConstant(source,name){
  const marker="const "+name+"=",at=source.indexOf(marker);
  if(at<0) throw new Error("missing "+name);
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

const WPRE=objectConstant(shell,"WPRE");
const MPRE=objectConstant(shell,"MPRE");
const CXPRE=objectConstant(shell,"CXPRE");
const CDP=objectConstant(shell,"CDP");
const T={WPRE,MPRE,CXPRE,CDP};
const adapt=(S,key)=>M.smartAdapt2way(S,key,T);
const base=(family,count)=>({
  ...M.TWO_ARCH[family].defaults,topo:"2way",twoArch:family,twoFamily:family,
  twoDesign:"arch:"+family,nW:count,mouthW:44,mouthCap:64,covH:90,covV:60,
  wallT:0.012,wPre:"w8",odW:22.5,dpW:9,sdW:220,xmW:7,
  cdSel:"dcx464",td:1.4,cdFloor:300,cdDepth:2.4
});

check(/id="buildSel"/.test(shell),"design basis selector is missing");
check(!/id="twoArch"/.test(shell),"a second architecture selector leaked into the UI");
check(/<select id="nW"/.test(shell),"woofer count is not a dropdown");
check(/INSPECT: LITERAL TAP HOLES/.test(shell)&&
  /INSPECT: MOUNTING PLATES \+ GASKETS — NO DRIVERS/.test(shell),
  "tap and mount inspectors are missing");
check(/taps\/chambers included/.test(shell),"fabrication badge does not say cavities are included");
check(/no cutter file or hidden subtraction step/.test(shell),
  "two-way STL still asks the user to perform hidden boolean work");

for(const [family,counts] of [["panel",[2,4,6]],["radial",[2,3,4,5,6,7,8]]]){
  for(const nW of counts){
    const start=base(family,nW);
    const res=adapt(start,"nW"),r=M.solve(res.S2);
    check(res.S2.twoArch===family,family+" "+nW+" silently changed family");
    check(res.S2.nW===nW,family+" "+nW+" silently changed count");
    check(!r.infeasible,family+" "+nW+" supported state refuses");
    check(r.ev.plan.drivers.length===nW,family+" "+nW+" renderer plan has wrong count");
  }
}

{
  const start=base("radial",6);
  const next=adapt({...start,wPre:"ndl88"},"wPre");
  check(next.S2.twoArch==="radial"&&next.S2.nW===6,
    "driver selection silently repacked family/count");
  check(next.S2.bcdW===WPRE.ndl88.bcd&&next.S2.boltNW===WPRE.ndl88.boltN,
    "driver mounting record did not propagate");
  check(next.S2.twoXO>=next.S2.cdFloor,"driver change left crossover below CD floor");
  check(!("tapStationW" in next.S2)&&!("tapAreaW" in next.S2),
    "calculated package retained stale tap overrides");
}

{
  const start={...base("panel",4),cdSel:"de500",cdFloor:900,td:1};
  const next=adapt({...start,cdSel:"dcx464"},"cdSel");
  check(next.S2.twoArch==="panel"&&next.S2.nW===4,
    "CD selection silently repacked family/count");
  check(next.S2.cdBCD===CDP.dcx464.bcd&&next.S2.cdBoltN===CDP.dcx464.boltN,
    "CD mounting record did not propagate");
}

{
  const start=base("panel",4),integrated=adapt({...start,mountRing:"integrated"},"mountRing").S2;
  const detachable=adapt({...integrated,mountRing:"ring"},"mountRing").S2;
  check(integrated.twoArch===detachable.twoArch&&integrated.nW===detachable.nW,
    "mount mode changed acoustic family/count");
  check(M.twoWayPlan(integrated).drivers.length===M.twoWayPlan(detachable).drivers.length,
    "mount mode changed driver layout");
}

{
  const start=base("radial",7);
  const panel=adapt({...start,twoArch:"panel",twoFamily:"panel",twoDesign:"arch:panel"},"twoDesign");
  check(panel.S2.twoArch==="panel"&&M.TWO_ARCH.panel.counts.includes(panel.S2.nW),
    "explicit family change did not choose a supported panel count");
  check(panel.ledger.some(x=>x.knob==="nW"),
    "explicit count consequence was not disclosed in the adaptation ledger");
}

{
  const start=base("radial",5),p0=M.twoWayPlan(start);
  const changed=adapt({...start,twoXO:p0.xo+100},"twoXO").S2,p1=M.twoWayPlan(changed);
  check(p1.station<p0.station,"higher crossover did not move the quarter-wave station inward");
  check(p1.drivers.length===5&&changed.twoArch==="radial",
    "crossover change repacked user intent");
}

if(failures.length){
  console.error("ADAPTIVE GATE FAIL — "+failures.length+"/"+checks);
  failures.forEach(x=>console.error("✗ "+x));
  process.exit(1);
}
console.log("ADAPTIVE GATE PASS — "+checks+" checks · intent preserved · dependent geometry recomputed");
