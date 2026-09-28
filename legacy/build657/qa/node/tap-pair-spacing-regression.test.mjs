import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = require(path.resolve(here, "../../engine.js"));
const shell = fs.readFileSync(path.resolve(here, "../../shell.html"), "utf8");

function build(key) {
  const record = (engine.BUILDS["2way"] || []).find((item) => item.key === key);
  assert.ok(record, `missing two-way build ${key}`);
  return record;
}

function failedLaw(solved, name) {
  return solved.ev.rows.some((row) => row.name === name && row.st === "fail");
}

function actualPairSpreads(plan) {
  return plan.drivers.map((driver) => {
    const [a, b] = driver.ports;
    return Math.hypot(
      b.center[0] - a.center[0],
      b.center[1] - a.center[1],
      b.center[2] - a.center[2],
    );
  });
}

const jmod = build("jmod88");
const baseline = engine.solve({ ...jmod.s });

test("Advanced UI and design report expose the canonical pair result", () => {
  for (const id of ["tapPairMode", "tapPairSpreadMm", "tapPairMetrics"]) {
    assert.match(shell, new RegExp(`id=[\"']${id}[\"']`));
  }
  assert.match(shell, /solvedCenterToCenter_mm/);
  assert.match(shell, /coverageBoundaryPhase_deg/);
  assert.match(shell, /limitingCode:P\.pairLimitCode/);
});

test("JMOD AUTO retains its corner target and reports real 3-D pair metrics", () => {
  assert.equal(baseline.infeasible, false);
  const plan = baseline.ev.plan;
  assert.equal(plan.pairMode, "auto");
  assert.equal(plan.pairLimitCode, "AUTO_CORNER_TARGET");
  assert.ok(plan.pairSolvedSpread > 0.16 && plan.pairSolvedSpread < 0.17);
  assert.ok(Math.abs(plan.pairSolvedSpread - plan.pairTargetSpread) <= plan.pairMatchTolerance);
  assert.ok(plan.pairSolvedSpread <= plan.pairSpreadLimit + plan.pairMatchTolerance);
  assert.ok(plan.pairWavelengthRatio < 0.25);
  assert.ok(plan.tapEdgeBias > 0.90 && plan.tapEdgeBias < 0.93);
  for (const spread of actualPairSpreads(plan)) {
    assert.ok(Math.abs(spread - plan.pairSolvedSpread) < 1e-9);
  }
  assert.equal(baseline.S.tapPairDerived.limitingCode, plan.pairLimitCode);
});

test("a valid Custom request is honored in the canonical preview/export plan", () => {
  const requestedMm = baseline.ev.plan.pairSolvedSpread * 1000 - 3;
  const solved = engine.solve({
    ...baseline.S,
    tapPairMode: "custom",
    tapPairSpreadMm: requestedMm,
  });
  const plan = solved.ev.plan;
  assert.equal(solved.infeasible, false);
  assert.equal(plan.pairMode, "custom");
  assert.equal(plan.pairCustomHonored, true);
  assert.ok(Math.abs(plan.pairSolvedSpread * 1000 - requestedMm) <= 0.25);
  assert.equal(plan.pairLimitCode, "CUSTOM_REQUEST");
  assert.ok(plan.pairWeb >= plan.minWeb);
});

test("Custom fails closed when requested centres merge the apertures", () => {
  const solved = engine.solve({
    ...baseline.S,
    tapPairMode: "custom",
    tapPairSpreadMm: 1,
  });
  assert.equal(solved.infeasible, true);
  assert.ok(failedLaw(solved, "Tap-to-tap structural web"));
  assert.equal(solved.ev.plan.pairLimitCode, "TAP_PAIR_SPREAD_WEB");
});

test("Custom fails closed when requested spread exceeds under-cone geometry", () => {
  const solved = engine.solve({
    ...baseline.S,
    tapPairMode: "custom",
    tapPairSpreadMm: 1000,
  });
  assert.equal(solved.infeasible, true);
  assert.equal(solved.ev.plan.pairCustomHonored, false);
  assert.ok(failedLaw(solved, "Custom tap-pair spread honored"));
  assert.equal(solved.ev.plan.pairLimitCode, "TAP_PAIR_SPREAD_GEOMETRY");
});

test("AUTO clamps a high-frequency pair at the actual quarter wavelength", () => {
  const targetHz = 950;
  const basePlan = baseline.ev.plan;
  const chamberM3 = basePlan.totalArea
    / (Math.pow(2 * Math.PI * targetHz / engine.C, 2) * basePlan.passage);
  const solved = engine.solve({
    ...baseline.S,
    twoDesign: "arch:panel",
    tapBasis: "manual",
    tapPairMode: "auto",
    tapVtcW: chamberM3 * 1e6,
  });
  const plan = solved.ev.plan;
  assert.equal(solved.infeasible, false);
  assert.equal(plan.pairLimitCode, "TAP_PAIR_SPREAD_WAVELENGTH");
  assert.ok(plan.pairTargetSpread > plan.pairSolvedSpread);
  assert.ok(Math.abs(plan.pairSolvedSpread - plan.pairSpreadLimit) < 0.0003);
  assert.ok(plan.pairWavelengthRatio <= 0.25 + 1e-9);
  assert.ok(plan.pairCoveragePhase <= 90 + 1e-6);
  assert.ok(plan.pairWeb >= plan.minWeb);
});
