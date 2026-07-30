#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");
const E=require("./engine.js");
const M=require("./twoway-core.js")(E);
const root=path.join(__dirname,"reference");
const lib=JSON.parse(fs.readFileSync(path.join(root,"known-builds.json"),"utf8"));
const failures=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg);};

check(Array.isArray(lib.entries)&&lib.entries.length>=4,
  "reference library must retain the core panel and radial exemplars");
for(const ref of lib.entries){
  check(["panel","radial"].includes(ref.family),ref.id+": unknown family");
  check(ref.tapTraits&&ref.tapTraits.length,ref.id+": no tap traits");
  check(ref.forbiddenTraits&&ref.forbiddenTraits.length,ref.id+": no negative visual traits");
  for(const image of ref.images||[])
    check(fs.existsSync(path.join(root,image)),ref.id+": missing image "+image);
}

const hinson=M.twoWayPlan(M.BUILDS["2way"].find(x=>x.key==="hinson10").s);
check(hinson.family==="panel"&&hinson.S.style==="angular",
  "Hinson comparison lost its true panel family");
check(hinson.np===2&&hinson.pairEdgeObjectiveRatio>=0.90&&
    hinson.tapEdgeBias>=0.50&&
    Math.abs(hinson.pairWavelengthRatio-0.25)<1e-9&&
    hinson.drivers.every(driver=>
      driver.pairLimitCode==="TAP_PAIR_SPREAD_WAVELENGTH"),
  "Hinson entries lost their edge target or quarter-wave pair-spacing limit");
check(hinson.minDriverGap>=0.004&&hinson.minMountSide>0,
  "Hinson reference comparison finds floating/intersecting drivers");

const radialSeed={...M.TWO_ARCH.radial.defaults,topo:"2way",twoDesign:"arch:radial",
  nW:4,mouthW:30,mouthCap:64,covH:90,covV:60,wallT:0.012,
  cdSel:"dcx464",td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4};
const radial=M.twoWayPlan(radialSeed);
check(radial.family==="radial"&&radial.drivers.length===4,
  "radial four-driver comparison changed family or count");
check(radial.drivers.every(d=>Math.abs(d.mountN[0])<1e-9),
  "radial driver axes are not perpendicular to the HF axis");
check(radial.minDriverGap>=0.004&&radial.minMountSide>0,
  "radial reference comparison finds floating/intersecting drivers");

if(failures.length){
  console.error("REFERENCE GATE FAIL — "+failures.length);
  failures.forEach(x=>console.error("✗ "+x));
  process.exit(1);
}
console.log("REFERENCE GATE PASS — "+lib.entries.length+
  " known-build records · panel/radial construction traits retained");
