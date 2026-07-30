#!/usr/bin/env node
"use strict";

const M=require("./engine.js");
let checks=0;
const failures=[];
const check=(condition,message)=>{checks++;if(!condition)failures.push(message);};
const near=(a,b,tol)=>Math.abs(a-b)<=tol;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const builds=M.BUILDS["2way"]||[];
const build=key=>builds.find(b=>b.key===key);

check(JSON.stringify(Object.keys(M.TWO_ARCH))===JSON.stringify(["panel","radial"]),
  "the public family list must contain only panel and radial");
check(JSON.stringify(M.TWO_ARCH.panel.counts)===JSON.stringify([2,4,6]),
  "panel family must expose 2, 4 or 6 woofers");
check(JSON.stringify(M.TWO_ARCH.radial.counts)===JSON.stringify([2,3,4,5,6,7,8]),
  "radial family must expose 2 through 8 woofers");
check(JSON.stringify(builds.map(b=>b.key))===
    JSON.stringify(["hinson10","jmod88","syntripp","solana"]),
  "the source-bounded list must contain Hinson, JMOD, SynTripP and Solana");

for(const [key,A] of Object.entries(M.TWO_ARCH)){
  check(A.tier==="derived",key+" calculated family is not labeled derived");
  check(/calculat|derived/i.test(A.source),key+" family does not disclose its mathematical provenance");
}

for(const b of builds){
  const r=M.solve({...b.s});
  const P=r.ev.plan;
  check(!r.infeasible&&r.ev.fails===0,b.key+" does not solve");
  check(P.drivers.length===b.s.nW,b.key+" driver count changed");
  check(P.allPorts.length===b.s.nW*b.s.npW,b.key+" tap count is wrong");
  check(P.drivers.every(d=>Array.isArray(d.cavInner)&&d.branch===undefined),
    b.key+" must expose one canonical chamber-entry datum");
  check(P.drivers.every(d=>d.ports.every(q=>
      distance(q.center,M.surfPt(P.st,P.station,q.phi))<1e-9))&&
      P.maxPortReach<=P.frame.activeR-0.002+1e-9,
    b.key+" entry is detached from its horn-wall station or active cone");
  check(P.drivers.every(d=>Math.abs(d.normal[0])<0.82),
    b.key+" driver axis points forward instead of into the horn");
  const selected=M.smartAdapt2way({...b.s},"twoDesign",{}).S2;
  check(selected.twoDesign===b.key&&selected.wPre===b.s.wPre&&
      selected.odW===b.s.odW&&selected.dpW===b.s.dpW&&
      selected.sdW===b.s.sdW&&selected.tapBasis===b.s.tapBasis,
    b.key+" documented package is overwritten by generic family defaults on selection");
}
{
  const pathRow=M.solve({...build("hinson10").s}).ev.rows.find(
    row=>row.name==="Nominal equal-path target"
  );
  check(pathRow&&pathRow.name==="Nominal equal-path target"&&
      /not yet measured/.test(pathRow.val)&&!/0\.0 mm driver-to-driver/.test(pathRow.val),
    "two-way path audit still claims an unmeasured zero spread");
}

{
  const b=build("hinson10"),P=M.twoWayPlan({...b.s});
  check(b.evidence==="published"&&b.s.tapBasis==="published",
    "Hinson geometry is not marked published");
  check(near(2*P.port.sa*1000,101.6,0.05)&&near(2*P.port.sb*1000,19.1,0.05),
    "Hinson entries drifted from 101.6 × 19.1 mm");
  check(near(P.totalArea*1e4,37.24,0.03),"Hinson total open area drifted");
  check(near(P.station*1000,143.3,0.05),"Hinson tap station drifted");
  check(near(P.chamberV*1e6,700,1)&&
      near(P.chamberV*P.drivers.length*1e6,1400,2),
    "Hinson chambers drifted from 700 cm³ each / 1400 cm³ total");
  check(P.drivers.every(d=>d.mountKind==="panel-direct"),
    "Hinson does not use direct panel mounting");
  check(near(P.panelT*1000,18,0.05)&&
      P.adapterReach>=P.panelT&&
      P.drivers.every(d=>d.cell.frontChamber.geometricSpanM>=
        d.cell.frontChamber.requiredAxialDepthM-1e-9),
    "Hinson 18 mm plate no longer carries the complete conservative driver cell");
}

{
  const b=build("jmod88"),P=M.twoWayPlan({...b.s});
  check(b.evidence==="hybrid"&&b.s.tapBasis==="model",
    "JMOD must disclose that unpublished tap dimensions are calculated");
  check(P.totalArea>0&&P.chamberV>0&&P.passage>0,
    "JMOD calculated tap/chamber package is incomplete");
  check(P.station<=M.C/(4*P.phaseMargin*P.xo)+1e-9,
    "JMOD station exceeds its quarter-wave budget");
  check(P.S.mountRing==="integrated"&&
      near(P.panelT*1000,18,0.05)&&P.adapterReach>=P.panelT&&
      P.drivers.every(d=>d.cell.frontChamber.geometricSpanM>=
        d.cell.frontChamber.requiredAxialDepthM-1e-9),
    "JMOD 18 mm bearing panel no longer carries the complete conservative driver cell");
}

{
  const base={...build("jmod88").s,twoDesign:"arch:panel",tapBasis:"manual",
    tapStationW:155,tapAreaW:52,tapLptW:24,tapSlotL:80,tapSlotW:28,tapVtcW:900};
  const P=M.twoWayPlan(base);
  /* Explicit aperture dimensions are the manufactured truth when a manually
     entered area conflicts with them. Two 80 × 28 mm stadiums total
     41.435 cm²; reporting 52 cm² would mislabel the exported cuts. */
  check(near(P.station*1000,155,0.01)&&near(P.totalArea*1e4,41.4350432,0.01),
    "measured station or dimension-owned aperture area is not honored");
  check(near(P.passage*1000,24,0.01)&&near(P.chamberV*1e6,900,0.1),
    "measured passage/chamber overrides are not honored");
}

for(const nW of M.TWO_ARCH.radial.counts){
  const S={...M.TWO_ARCH.radial.defaults,topo:"2way",twoArch:"radial",
    twoFamily:"radial",twoDesign:"arch:radial",nW,mouthW:44,covH:90,covV:60,
    wallT:0.012,wPre:"w8",odW:22.5,dpW:9,sdW:220,xmW:7,
    cdSel:"dcx464",td:1.4,cdFloor:300,cdDepth:2.4,mouthCap:64};
  const r=M.solve(S),P=r.ev.plan;
  check(P.drivers.length===nW,"radial "+nW+"-woofer intent was changed");
  check(!r.infeasible,"radial "+nW+"-woofer plan is infeasible");
  check(P.drivers.every(d=>{
    const toward=[-d.mountN[0],-d.mountN[1],-d.mountN[2]];
    const center=[d.surface[0]-d.driverFace[0],-d.driverFace[1],-d.driverFace[2]];
    return toward[0]*center[0]+toward[1]*center[1]+toward[2]*center[2]>0;
  }),"radial "+nW+"-woofer cones do not point toward the horn center");
  check(P.drivers.every(d=>Math.abs(d.mountN[0])<1e-9&&d.mountKind==="radial-direct"),
    "radial "+nW+"-woofer axes are not perpendicular to the HF axis");
}

{
  const S={...M.TWO_ARCH.radial.defaults,topo:"2way",twoDesign:"arch:radial",
    mouthW:30,covH:90,covV:60,wallT:0.012,cdSel:"dcx464",td:1.4,
    cdFloor:300,cdDepth:2.4,mouthCap:64};
  const P=M.twoWayPlan(S);
  check(P.S.wPre==="w5"&&near(P.frame.od*1000,137.6,0.1),
    "radial family no longer opens with the sourced compact 5.25-inch package");
  check(P.station<P.phaseBound*0.55,
    "radial hub is still parked at the quarter-wave maximum instead of near the HF hub");
  /* Build 646 made the volume-derived front chamber a real physical frustum.
     Its complete outer boundary—not only the driver frames—now owns the AUTO
     reach. The former <80 mm golden predated that safety fix and would require
     clipping most of this 579 cm³ chamber through the horn. Verify the actual
     bounded optimum instead: the solved reach passes, while removing its
     sub-millimetre search guard fails the named chamber-continuity law. */
  const shorter=M.evaluate2way({...S,adapterReach:P.adapterReach*1000-1,
    adapterReachMode:"manual"});
  check(P.minDriverGap>=0.004&&
      P.radialChamberClearance>=P.radialChamberRequiredClearance&&
      shorter.rows.some(r=>r.st==="fail"&&r.code==="RADIAL_FRONT_CHAMBER_INCOMPLETE"),
    "default radial AUTO reach is not the shortest guarded chamber/frame package");
}

{
  const seed={...M.TWO_ARCH.radial.defaults,topo:"2way",twoDesign:"arch:radial",
    mouthW:30,covH:90,covV:60,wallT:0.012,cdSel:"dcx464",td:1.4,
    cdFloor:300,cdDepth:2.4,mouthCap:64,nW:8};
  const r8=M.smartAdapt2way(seed,"nW",{}).S2;
  const r3=M.smartAdapt2way({...r8,nW:3},"nW",{}).S2;
  const fresh3=M.smartAdapt2way({...seed,nW:3,
    adapterReach:M.TWO_ARCH.radial.defaults.adapterReach},"nW",{}).S2;
  /* Driver count does not impose a monotonic reach law: fewer cells can own
     more chamber volume per spoke. A ratchet exists only when re-solving the
     same count retains history instead of returning to its fresh optimum. */
  check(r3.adapterReachMode==="auto"&&fresh3.adapterReachMode==="auto"&&
      near(r3.adapterReach,fresh3.adapterReach,0.01),
    "AUTO radial spoke ratchets instead of returning to the fresh count-3 chamber optimum");
  const locked=M.smartAdapt2way({...r8,nW:3,adapterReachMode:"manual"},"nW",{}).S2;
  check(locked.adapterReach>=r8.adapterReach,
    "manual radial spoke minimum is not preserved across count changes");
}

/* Exact topology is intentionally absent from this default gate. A broad
   battery used to allocate an implicit export lattice for every preset and
   could exhaust a workstation during ordinary release checks. The focused,
   explicitly named QA-only path is:

     node qa/node/bounded-exact-witness.mjs

   Keep no-allocation admission/refusal witnesses here so the safety policy
   itself remains part of the normal ritual. */
{
  const base={...M.TWO_ARCH.panel.defaults,topo:"2way",twoDesign:"arch:panel",
    twoArch:"panel",twoFamily:"panel",nW:2,npW:1,shW:"round",
    tapShapeW:"round",covH:90,covV:60,wallT:0.018,twoXO:500,tapCRW:6,
    wPre:"w5",odW:13.76,dpW:6.95,sdW:91.6,vtcW:35,xmW:2.5,
    cdSel:"dcx464",td:1.4,cdFloor:300,cdDepth:2.4,mouthCap:64};
  try{
    const production=M.twoWayMeshPreflight({...base,mouthW:19},"export");
    check(production.ok&&production.step===0.0025&&
        production.totals.gridPoints===4142592,
      "bounded production exact preflight did not admit its fixed 2.5 mm grid");
  }catch(error){
    check(false,"bounded production exact preflight failed: "+(error.code||error.message));
  }
  let refused=false;
  try{
    M.twoWayMeshPreflight({...base,mouthW:28},"export");
  }catch(error){
    refused=/^MESH_(?:AXIS|PART_GRID|JOB_GRID|MEMORY)_LIMIT$/.test(error.code||"");
  }
  check(refused,
    "held oversized exact preflight did not refuse before allocation");
  try{
    /* Use the smallest legal low-size witness. The former 1-inch synthetic
       horn was physically refused by its exact driver-plate/CD geometry, so
       admitting it would have weakened the manufacturing preflight. */
    const budget=M.twoWayMeshPreflight({...base,mouthW:13},"export");
    check(budget.ok&&budget.step===0.0025,
      "QA-only exact preflight did not retain the fixed 2.5 mm grid");
    check(budget.totals.gridPoints<=budget.limits.maxJobGridPoints,
      "QA-only exact preflight exceeds the aggregate grid budget");
    check(budget.totals.estimatedPeakBytes<=budget.limits.maxEstimatedPeakBytes,
      "QA-only exact preflight exceeds the accounting envelope");
  }catch(error){
    check(false,"QA-only exact preflight failed: "+(error.code||error.message));
  }
}

if(failures.length){
  console.error("2-WAY GATE FAIL — "+failures.length+"/"+checks);
  failures.forEach(x=>console.error("✗ "+x));
  process.exit(1);
}
console.log("2-WAY GATE PASS — "+checks+" checks · four source-bounded starts · connected tap/chamber solids");
