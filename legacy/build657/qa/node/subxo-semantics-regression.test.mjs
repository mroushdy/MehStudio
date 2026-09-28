#!/usr/bin/env node
import assert from "node:assert/strict";
import { engine } from "./case-loader.mjs";

const EPS = 1e-11;

function near(actual, expected, message, tolerance = EPS) {
  assert.ok(
    Number.isFinite(actual)
      && Number.isFinite(expected)
      && Math.abs(actual - expected) <= tolerance,
    `${message}: ${actual} != ${expected}`
  );
}

function distance(a, b) {
  return Math.hypot(...a.map((value, index) => value - b[index]));
}

function pairSpread(plan) {
  const driver = plan.drivers.find((candidate) => candidate.ports.length >= 2);
  assert.ok(driver, "fixture must produce a paired-entry driver");
  return distance(driver.ports[0].center, driver.ports[1].center);
}

function assertSamePortGeometry(actual, expected, message) {
  near(actual.station, expected.station, `${message} station`);
  near(actual.xo, expected.xo, `${message} internal LF/CD crossover`);
  near(actual.totalArea, expected.totalArea, `${message} tap area`);
  near(actual.port.sa, expected.port.sa, `${message} aperture semi-length`);
  near(actual.port.sb, expected.port.sb, `${message} aperture semi-width`);
  near(pairSpread(actual), pairSpread(expected), `${message} pair spacing`);
  assert.equal(actual.S.nW, expected.S.nW, `${message} driver count`);
  near(actual.S.mouthW, expected.S.mouthW, `${message} requested mouth`);
}

const architecture = engine.TWO_ARCH.panel;
const base = {
  ...architecture.defaults,
  topo: "2way",
  twoArch: "panel",
  twoFamily: "panel",
  twoDesign: "arch:panel",
  tapBasis: "model",
  mouthW: 64,
  mouthCap: 64,
  covH: 90,
  covV: 60,
  wallT: 0.018,
  rollR: 2,
  td: 1.4,
  throat: 1.4,
  cdSel: "dcx464",
  cdFloor: 300,
  nW: 2,
  npW: 2,
  shW: "slot",
  wPre: "ndl88",
  odW: 31.5,
  dpW: 14,
  sdW: 522,
  vtcW: 180,
  xmW: 8,
  twoXO: 400,
  tapCRW: 12
};

/* At a fixed compression target, subXO is only the LF excursion/velocity
   reference. It must not directly become an internal crossover, station,
   spacing, mouth or driver-count control. */
const raw60 = engine.twoWayPlan({ ...base, subXO: 60 });
const raw100 = engine.twoWayPlan({ ...base, subXO: 100 });
assertSamePortGeometry(raw100, raw60, "fixed-compression plan");
near(raw60.velocityRefHz, 60, "60 Hz velocity reference");
near(raw100.velocityRefHz, 100, "100 Hz velocity reference");
near(
  raw100.tapMach / raw60.tapMach,
  100 / 60,
  "tap Mach must scale linearly with the LF excursion reference"
);
near(
  raw100.maxCrMach / raw60.maxCrMach,
  60 / 100,
  "maximum legal compression must scale inversely with LF reference"
);

/* Once the strict Mach law is enforced, a higher LF reference may require
   more aperture area. That packaging consequence is allowed to alter port
   dimensions and paired-entry spacing, but it still must not rewrite the
   requested count, mouth or the internal LF/CD crossover. */
const solved60 = engine.solve({ ...base, subXO: 60 });
const solved100 = engine.solve({ ...base, subXO: 100 });
assert.equal(solved60.infeasible, false, "60 Hz stress fixture must solve");
assert.equal(solved100.infeasible, false, "100 Hz stress fixture must solve");

const low = solved60.ev.plan;
const high = solved100.ev.plan;
assert.ok(high.totalArea > low.totalArea, "higher LF reference should enlarge the repaired tap area");
assert.ok(high.cr < low.cr, "higher LF reference should lower repaired compression");
assert.ok(
  Math.abs(high.port.sa - low.port.sa) > EPS
    || Math.abs(high.port.sb - low.port.sb) > EPS,
  "Mach repair should be allowed to change aperture dimensions"
);
const pairSpacingChanged = Math.abs(pairSpread(high) - pairSpread(low)) > EPS;
const bothEqualizationGuarded = [low, high].every((plan) =>
  plan.drivers.every((driver) =>
    driver.pairLimitCode === "TAP_PAIR_EQUALIZATION_GUARD"
  )
);
assert.ok(
  pairSpacingChanged || bothEqualizationGuarded,
  "paired-entry spacing stayed fixed without the cone-normal equalization guard"
);
for (const [label, plan] of [["60 Hz", low], ["100 Hz", high]]) {
  assert.ok(
    plan.pairWeb >= plan.minWeb - EPS,
    `${label} repaired pair lost structural web`
  );
  assert.ok(
    plan.maxPortReach <= plan.frame.activeR - 0.002 + EPS,
    `${label} repaired aperture left the active cone`
  );
  assert.ok(
    plan.pairSolvedSpread <=
      plan.pairSpreadLimit + plan.pairMatchTolerance + EPS,
    `${label} repaired pair exceeded its phase-spacing limit`
  );
  assert.ok(
    plan.stationNullFrequency >= plan.phaseMargin * plan.xo - EPS,
    `${label} repaired station exceeded its quarter-wave phase bound`
  );
}
near(high.xo, low.xo, "Mach repair internal LF/CD crossover");
near(high.station, low.station, "Mach repair station");
assert.equal(high.S.nW, low.S.nW, "Mach repair driver count");
near(high.S.mouthW, low.S.mouthW, "Mach repair requested mouth");
assert.ok(low.tapMach <= low.tapMachLimit + EPS, "60 Hz repaired Mach must pass");
assert.ok(high.tapMach <= high.tapMachLimit + EPS, "100 Hz repaired Mach must pass");

console.log(
  "SUBXO SEMANTICS PASS — fixed geometry keeps XO/station/spacing/count/mouth; "
    + "Mach repair may enlarge tap area and repack paired entries"
);
