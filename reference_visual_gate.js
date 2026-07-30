#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");
const E=require("./engine.js");
const M=require("./twoway-core.js")(E);
const root=path.join(__dirname,"reference");
const audit=JSON.parse(fs.readFileSync(path.join(root,"visual-audit.json"),"utf8"));
const library=JSON.parse(fs.readFileSync(path.join(root,"known-builds.json"),"utf8"));
const referenceIds=new Set(library.entries.map(x=>x.id));
const failures=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg);};
const base={topo:"2way",mouthW:32,mouthCap:64,covH:90,covV:60,wallT:0.012,
  cdSel:"dcx464",td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4};

function stateFor(c){
  if(c.design.kind==="build"){
    const b=(M.BUILDS["2way"]||[]).find(x=>x.key===c.design.key);
    check(!!b,c.id+": missing build "+c.design.key);
    return b?JSON.parse(JSON.stringify(b.s)):base;
  }
  const A=M.TWO_ARCH[c.design.key];
  check(!!A,c.id+": missing architecture "+c.design.key);
  return {...base,...JSON.parse(JSON.stringify(A&&A.defaults||{})),
    ...(c.design.overrides||{}),twoDesign:"arch:"+c.design.key};
}

function pngSize(file){
  const b=fs.readFileSync(file);
  if(b.length<24||b.toString("hex",0,8)!=="89504e470d0a1a0a")return null;
  /* Browser captures can contain an Apple CgBI chunk before IHDR, so do not
     assume IHDR starts at byte 8. Walk the public PNG chunk table. */
  for(let at=8;at+12<=b.length;){
    const n=b.readUInt32BE(at),type=b.toString("ascii",at+4,at+8);
    if(type==="IHDR"&&n>=8)return {w:b.readUInt32BE(at+8),h:b.readUInt32BE(at+12)};
    at+=12+n;
  }
  return null;
}

check(audit.build>=619,"visual audit must use the clean capture renderer");
check(audit.cases.length>=5,"visual audit lost required known/calculated cases");
check(fs.existsSync(path.join(root,"comparison.html")),"missing visual comparison board");
check(fs.existsSync(path.join(root,"comparison-report.md")),"missing visual comparison report");
for(const c of audit.cases){
  for(const id of c.referenceIds)check(referenceIds.has(id),c.id+": missing reference "+id);
  check(c.status==="pass",c.id+": visual review is not passing");
  check(c.checks.length>=4&&c.checks.every(x=>x.status==="pass"),
    c.id+": incomplete or failing visual findings");
  const views=new Set(c.renders.map(x=>x.view));
  for(const required of ["full","mount"])check(views.has(required),c.id+": missing "+required+" render");
  for(const render of c.renders){
    const file=path.join(root,render.path);
    check(fs.existsSync(file),c.id+": missing generated render "+render.path);
    if(fs.existsSync(file)){
      const size=pngSize(file);
      check(size&&size.w>=500&&size.h>=700,c.id+": render is not a full fixed-view capture");
    }
  }
  /* Match the application path: every dropdown state passes through the same
     deterministic repair/adaptation solver before it is rendered. */
  const solved=M.solve(stateFor(c)),P=solved.ev.plan,x=c.expected;
  check(P.family===x.family,c.id+": family mismatch");
  check(P.drivers.length===x.count,c.id+": driver-count mismatch");
  check(P.np===x.entriesPerWoofer,c.id+": entries-per-woofer mismatch");
  check(P.S.mountRing===x.mountRing,c.id+": mount-system mismatch");
  check(P.S.style===x.style,c.id+": surface-style mismatch");
  /* Detachable cartridges carry exact, owned retention tools.  The
     plan-only audit cannot see those tools and therefore correctly refuses
     to certify the assembly; exercise the same solid-backed audit used by
     fabrication QA. */
  const detachable=P.S.driverCellConstruction==="cartridge";
  const assembly=M.assemblyAudit(P,M.twoWaySolidField(P,detachable));
  check(assembly.pass,c.id+": analytic assembly/contact audit failed");
  check(P.minDriverGap>=0.004,c.id+": complete driver frames overlap");
  check(P.minMountSide>0,c.id+": mounting face entered horn air path");
}

const shell=fs.readFileSync(path.join(__dirname,"shell.html"),"utf8");
check(shell.includes("body.capture-mode"),"fixed-camera capture CSS missing");
check(shell.includes("BOOT_VIEW"),"fixed-camera view bootstrap missing");
/* FULL suppresses analytic mount surrogates that can otherwise show through
   the opaque horn.  Check the executable visibility guards rather than a
   comment phrase so wording changes cannot invalidate the visual contract. */
const fullViewHardwareGuards=[
  /adapter\.visible=selected&&!focusedMount&&view!=='full';/,
  /jointGasket\.visible=selected&&!focusedMount&&view!=='full';/,
  /feature\.visible=[\s\S]{0,160}!focusedMount&&view!=='full';/,
  /gasket\.visible=selected&&!focusedMount&&view!=='full';/,
  /pocketRoot\.visible=selected&&!focusedMount&&view!=='full';/
];
check(fullViewHardwareGuards.every(pattern=>pattern.test(shell)),
  "full-view external-hardware guard missing");

if(failures.length){
  console.error("REFERENCE VISUAL GATE FAIL - "+failures.length);
  failures.forEach(x=>console.error("x "+x));
  process.exit(1);
}
const renders=audit.cases.reduce((n,c)=>n+c.renders.length,0);
console.log("REFERENCE VISUAL GATE PASS - "+audit.cases.length+
  " comparison cases - "+renders+" fixed-view renders - assembly/contact constraints pass");
