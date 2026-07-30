#!/usr/bin/env node
import { engine, stableValue } from "./case-loader.mjs";

const C = 344;
const SHAPES = ["slot", "oval", "round"];
const failures = [];
let assertions = 0;

function check(condition, label, detail) {
  assertions += 1;
  if (!condition) failures.push(`${label}: ${detail}`);
}

function close(actual, expected, relative = 1e-10, absolute = 1e-12) {
  return Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.abs(actual - expected)
      <= Math.max(absolute, relative * Math.max(Math.abs(actual), Math.abs(expected)));
}

function build(key) {
  const record = (engine.BUILDS["2way"] || []).find((item) => item.key === key);
  if (!record) throw new Error(`missing two-way build ${key}`);
  return record;
}

function law(solved, name) {
  return solved.ev.rows.find((row) => row.name === name);
}

function failedLaws(solved) {
  return solved.ev.rows.filter((row) => row.st === "fail").map((row) => row.name);
}

function analyticArea(port) {
  if (port.shape === "round") return Math.PI * port.sb * port.sb;
  if (port.shape === "oval") return Math.PI * port.sa * port.sb;
  return 4 * port.sb * Math.max(0, port.sa - port.sb) + Math.PI * port.sb * port.sb;
}

function calculatedState(family, overrides = {}) {
  const architecture = engine.TWO_ARCH[family];
  return {
    ...architecture.defaults,
    topo: "2way",
    twoArch: family,
    twoFamily: family,
    twoDesign: `arch:${family}`,
    tapBasis: "model",
    mouthW: family === "panel" ? 48 : 54,
    mouthCap: 64,
    covH: 90,
    covV: 60,
    wallT: family === "panel" ? 0.018 : 0.012,
    rollR: 2,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    subXO: 80,
    ...overrides
  };
}

function checkAcousticEquations(label, state, plan) {
  const expectedArea = state.sdW * 1e-4 / plan.cr;
  const expectedPassage = Math.max(0.004, state.wallT)
    + 0.85 * Math.sqrt(plan.totalArea / Math.PI);
  const expectedLowPass = C / (2 * Math.PI)
    * Math.sqrt(plan.totalArea / (plan.chamberV * plan.passage));
  const expectedConeVelocity = 2 * Math.PI * plan.velocityRefHz * state.xmW / 1000;
  const expectedEntryVelocity = plan.cr * expectedConeVelocity;
  const quarterWaveNull = C / (4 * plan.station);

  check(close(plan.totalArea, expectedArea), label,
    `Sd/Ap mismatch: ${plan.totalArea} m² != ${expectedArea} m²`);
  check(close(plan.totalArea, plan.port.area * plan.np), label,
    "per-entry aperture areas do not sum to the per-woofer area");
  check(close(plan.port.area, analyticArea(plan.port)), label,
    `${plan.port.shape} descriptor does not reproduce its analytic area`);
  check(close(plan.passage, expectedPassage), label,
    `end-corrected passage ${plan.passage} m != ${expectedPassage} m`);
  check(close(plan.fLP, expectedLowPass), label,
    `chamber+passage low-pass ${plan.fLP} Hz != ${expectedLowPass} Hz`);
  check(plan.fLP >= 1.20 * plan.xo, label,
    `front-chamber low-pass ${plan.fLP.toFixed(2)} Hz is below 1.20× XO`);
  check(close(plan.fLP, 1.35 * plan.xo, 1e-10, 1e-8), label,
    `calculated low-pass target is ${plan.fLP.toFixed(4)} Hz, not 1.35× XO`);
  check(plan.station <= plan.phaseBound + 1e-12, label,
    `tap station ${plan.station} m exceeds quarter-wave bound ${plan.phaseBound} m`);
  check(quarterWaveNull + 1e-8 >= plan.phaseMargin * plan.xo, label,
    `quarter-wave null ${quarterWaveNull.toFixed(3)} Hz misses phase margin`);
  check(close(plan.conePeakVelocity, expectedConeVelocity), label,
    "cone peak-velocity reference does not equal 2πfXmax");
  check(close(plan.tapPeakVelocity, expectedEntryVelocity), label,
    "entry velocity does not equal compression ratio × piston velocity");
  check(close(plan.tapMach, plan.tapPeakVelocity / C), label,
    "entry Mach does not equal entry velocity / speed of sound");
  check(plan.tapMach <= plan.tapMachLimit + 1e-12, label,
    `entry Mach ${plan.tapMach.toFixed(4)} exceeds ${plan.tapMachLimit.toFixed(2)}`);
  check(close(plan.minWeb, Math.max(0.0032, state.wallT * 0.30)), label,
    "minimum structural web is not tied to wall thickness and 3.2 mm floor");
}

/* Published Hinson tap CAD is a hard numeric lock. */
const hinson = build("hinson10");
const hinsonPlan = engine.twoWayPlan({ ...hinson.s });
const hinsonSolved = engine.solve({ ...hinson.s });
check(hinson.s.tapBasis === "published", "Hinson lock", "tap provenance is not published");
check(hinsonSolved.S.twoDesign === "hinson10", "Hinson lock", "solve detached the named build");
check(hinsonSolved.S.tapBasis === "published", "Hinson lock", "solve demoted published tap CAD");
check(close(hinsonPlan.station * 1000, 143.3, 0, 0.0001), "Hinson lock",
  `station changed to ${(hinsonPlan.station * 1000).toFixed(4)} mm`);
check(close(hinsonPlan.totalArea * 1e4, 37.24542207978047, 0, 1e-9), "Hinson lock",
  "published racetrack area changed");
check(close(hinsonPlan.port.sa * 2000, 101.6, 0, 0.0001), "Hinson lock",
  "published slot length changed");
check(close(hinsonPlan.port.sb * 2000, 19.1, 0, 0.0001), "Hinson lock",
  "published slot width changed");
check(close(hinsonPlan.passage * 1000, 18, 0, 0.0001), "Hinson lock",
  "published passage length changed");
check(close(hinsonPlan.chamberV * 1e6, 700, 0, 0.001), "Hinson lock",
  "published per-woofer chamber changed");
check(close(hinsonPlan.panelT * 1000, 18, 0, 0.0001), "Hinson lock",
  "published bearing panel changed");
check(!hinsonSolved.infeasible, "Hinson lock",
  `published design failed: ${failedLaws(hinsonSolved).join(", ")}`);

/* JMOD's sourced package is locked; its source does not publish tap CAD, so
   the gate intentionally verifies deterministic calculated Sd/Ap geometry
   without falsely relabeling it as a published replica. */
const jmod = build("jmod88");
const jmodSolvedA = engine.solve({ ...jmod.s });
const jmodSolvedB = engine.solve({ ...jmod.s });
const jmodLockedFields = [
  "twoDesign", "tapBasis", "wPre", "odW", "dpW", "sdW", "vtcW", "xmW",
  "nW", "npW", "twoXO", "covH", "covV", "mouthW", "wallT", "rearFb"
];
check(jmod.s.tapBasis === "model", "JMOD provenance",
  "JMOD must remain calculated until source manufacturing tap CAD exists");
for (const field of jmodLockedFields) {
  check(jmodSolvedA.S[field] === jmod.s[field], "JMOD package lock",
    `${field} changed from ${jmod.s[field]} to ${jmodSolvedA.S[field]}`);
}
check(!jmodSolvedA.infeasible, "JMOD package lock",
  `documented package failed: ${failedLaws(jmodSolvedA).join(", ")}`);
check(close(
  jmodSolvedA.ev.plan.totalArea,
  jmod.s.sdW * 1e-4 / jmodSolvedA.ev.plan.cr
),
  "JMOD calculated tap", "generated aperture area is not Sd/Ap");
check(JSON.stringify(stableValue({
  station: jmodSolvedA.ev.plan.station,
  area: jmodSolvedA.ev.plan.totalArea,
  passage: jmodSolvedA.ev.plan.passage,
  chamber: jmodSolvedA.ev.plan.chamberV
})) === JSON.stringify(stableValue({
  station: jmodSolvedB.ev.plan.station,
  area: jmodSolvedB.ev.plan.totalArea,
  passage: jmodSolvedB.ev.plan.passage,
  chamber: jmodSolvedB.ev.plan.chamberV
})), "JMOD calculated tap", "repeated solves are not dimensionally deterministic");

const panelState = calculatedState("panel", {
  nW: 4,
  npW: 2,
  shW: "slot",
  wPre: "hpl10",
  odW: 26.1,
  dpW: 12.2,
  sdW: 320,
  vtcW: 130,
  xmW: 4,
  twoXO: 450,
  tapCRW: 7
});
const radialState = calculatedState("radial", {
  nW: 4,
  npW: 2,
  shW: "oval",
  wPre: "w5",
  odW: 13.76,
  dpW: 6.95,
  sdW: 91.6,
  vtcW: 35,
  xmW: 2.5,
  twoXO: 500,
  tapCRW: 5,
  adapterReach: 35,
  adapterReachMode: "auto"
});

const familyMetrics = {};
for (const [family, state] of [["panel", panelState], ["radial", radialState]]) {
  const plans = SHAPES.map((shape) => engine.twoWayPlan({ ...state, shW: shape }));
  const reference = plans[0];
  familyMetrics[family] = {
    totalAreaCm2: reference.totalArea * 1e4,
    compression: reference.cr,
    lowPassHz: reference.fLP,
    quarterWaveNullHz: C / (4 * reference.station),
    mach: reference.tapMach,
    minWebMm: reference.minWeb * 1000
  };

  for (const plan of plans) {
    checkAcousticEquations(`${family}/${plan.port.shape}`, { ...state, shW: plan.port.shape }, plan);
    check(close(plan.totalArea, reference.totalArea), `${family}/equal-area`,
      `${plan.port.shape} changed total aperture area`);
    check(close(plan.cr, reference.cr), `${family}/equal-area`,
      `${plan.port.shape} changed compression ratio`);
    check(close(plan.passage, reference.passage), `${family}/equal-area`,
      `${plan.port.shape} changed passage mass length`);
    check(close(plan.chamberV, reference.chamberV), `${family}/equal-area`,
      `${plan.port.shape} changed chamber volume`);
    check(close(plan.fLP, reference.fLP), `${family}/equal-area`,
      `${plan.port.shape} changed chamber/passage low-pass`);
    check(close(plan.tapMach, reference.tapMach), `${family}/equal-area`,
      `${plan.port.shape} changed entry velocity/Mach`);
  }
}

/* A shape may preserve area yet be mechanically illegal. The solver must
   refuse an insufficient web instead of silently exporting touching taps. */
const webStressState = {
  ...radialState,
  nW: 6,
  shW: "slot"
};
const webBefore = engine.twoWayPlan(webStressState);
const webAfter = engine.solve(webStressState);
check(webBefore.pairWeb < webBefore.minWeb, "Minimum-web enforcement",
  "stress fixture does not begin below the manufacturing web");
check(!webAfter.infeasible, "Minimum-web enforcement",
  `repairable web was refused: ${failedLaws(webAfter).join(", ")}`);
check(webAfter.ev.plan.pairWeb >= webAfter.ev.plan.minWeb, "Minimum-web enforcement",
  `Smart Adapt left ${(webAfter.ev.plan.pairWeb * 1000).toFixed(2)} mm web below `
    + `${(webAfter.ev.plan.minWeb * 1000).toFixed(2)} mm`);
check(webAfter.ev.plan.cr > webBefore.cr, "Minimum-web enforcement",
  "Smart Adapt did not reduce aperture envelope by increasing compression");

const lockedWebState = {
  ...webStressState,
  tapBasis: "manual",
  tapShapeW: "slot",
  tapStationW: webBefore.station * 1000,
  tapAreaW: webBefore.totalArea * 1e4,
  tapLptW: webBefore.passage * 1000,
  tapSlotL: webBefore.port.sa * 2000,
  tapSlotW: webBefore.port.sb * 2000,
  tapVtcW: webBefore.chamberV * 1e6
};
const lockedWeb = engine.solve(lockedWebState);
const lockedWebLaw = law(lockedWeb, "Symmetric entry spacing");
check(lockedWebLaw !== undefined, "Minimum-web enforcement", "web law row is missing");
check(lockedWeb.infeasible && lockedWebLaw?.st === "fail", "Minimum-web enforcement",
  `locked insufficient web was not refused (${lockedWebLaw?.val || "no row"})`);

/* A high-compression, high-excursion request is repairable by enlarging Ap.
   Smart Adapt must lower compression to the Mach ceiling, never waive it. */
const velocityStressState = calculatedState("panel", {
  nW: 2,
  npW: 2,
  shW: "slot",
  wPre: "ndl88",
  odW: 31.5,
  dpW: 14,
  sdW: 522,
  vtcW: 180,
  xmW: 8,
  mouthW: 64,
  mouthCap: 64,
  twoXO: 400,
  tapCRW: 12,
  subXO: 100
});
const velocityBefore = engine.twoWayPlan(velocityStressState);
const velocityAfter = engine.solve(velocityStressState);
const velocityLaw = law(velocityAfter, "Peak entry velocity / Mach at LF reference");
check(velocityBefore.tapMach > velocityBefore.tapMachLimit, "Velocity stress",
  "stress fixture does not exceed the hard Mach limit before adaptation");
check(!velocityAfter.infeasible, "Velocity stress",
  `repairable velocity case was refused: ${failedLaws(velocityAfter).join(", ")}`);
check(velocityAfter.ev.plan.cr < velocityBefore.cr, "Velocity stress",
  "Smart Adapt did not enlarge aperture area by lowering compression");
check(velocityAfter.ev.plan.tapMach <= velocityAfter.ev.plan.tapMachLimit + 1e-12,
  "Velocity stress", `adapted Mach is ${velocityAfter.ev.plan.tapMach}`);
check(velocityLaw?.st === "ok", "Velocity stress", "Mach law is not a strict passing row");
check(close(
  velocityAfter.ev.plan.totalArea,
  velocityStressState.sdW * 1e-4 / velocityAfter.ev.plan.cr
), "Velocity stress", "adapted aperture no longer obeys Sd/Ap");

/* Negative controls prove the two acoustic release laws are active. */
const manualBad = {
  ...panelState,
  tapBasis: "manual",
  tapStationW: 260,
  tapAreaW: 45.71428571428572,
  tapLptW: 80,
  tapSlotL: 90,
  tapSlotW: 18,
  tapVtcW: 5000
};
const badSolved = engine.solve(manualBad);
const badNames = failedLaws(badSolved);
check(badSolved.infeasible, "Negative controls", "bad manual acoustic geometry passed");
check(badNames.includes("Tap station quarter-wave margin"), "Negative controls",
  `quarter-wave failure missing from: ${badNames.join(", ")}`);
check(badNames.includes("Front chamber acoustic low-pass"), "Negative controls",
  `chamber+passage low-pass failure missing from: ${badNames.join(", ")}`);

if (failures.length) {
  console.error(`TWO-WAY AUDIO GOLDEN RULES: FAIL — ${failures.length}/${assertions} assertions`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`TWO-WAY AUDIO GOLDEN RULES: PASS — ${assertions} assertions`);
console.log(
  `Hinson locked: station ${(hinsonPlan.station * 1000).toFixed(1)} mm · `
  + `2× ${(hinsonPlan.port.sa * 2000).toFixed(1)} × ${(hinsonPlan.port.sb * 2000).toFixed(1)} mm · `
  + `${(hinsonPlan.totalArea * 1e4).toFixed(3)} cm² · `
  + `${(hinsonPlan.chamberV * 1e6).toFixed(0)} cm³/woofer · `
  + `${(hinsonPlan.passage * 1000).toFixed(0)} mm passage`
);
console.log(
  `JMOD package locked: ${jmodSolvedA.S.nW}× ${jmodSolvedA.S.wPre} · `
  + `${jmodSolvedA.S.covH}×${jmodSolvedA.S.covV} · `
  + `calculated Sd/Ap ${(jmodSolvedA.ev.plan.totalArea * 1e4).toFixed(3)} cm²`
);
for (const family of ["panel", "radial"]) {
  const metric = familyMetrics[family];
  console.log(
    `${family} invariance: ${metric.totalAreaCm2.toFixed(3)} cm² · `
    + `${metric.compression.toFixed(2)}:1 · LP ${metric.lowPassHz.toFixed(2)} Hz · `
    + `quarter-wave ${metric.quarterWaveNullHz.toFixed(2)} Hz · `
    + `M ${metric.mach.toFixed(4)} · min web ${metric.minWebMm.toFixed(1)} mm`
  );
}
console.log(
  `Mach repair: ${velocityBefore.cr.toFixed(2)}:1 / M ${velocityBefore.tapMach.toFixed(4)}`
  + ` → ${velocityAfter.ev.plan.cr.toFixed(2)}:1 / M ${velocityAfter.ev.plan.tapMach.toFixed(4)}`
);
console.log("Negative controls: insufficient web, quarter-wave, and chamber/passage LP all refused");
