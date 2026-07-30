import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = require(path.resolve(here, "../../engine.js"));

function modelState(twoXO) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "classicOS",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    covH: 90,
    covV: 60,
    mouthW: 32,
    requestedMouthW: 32,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    nW: 2,
    npW: 2,
    panelAxis: "horizontal",
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    wPre: "nw10",
    odW: 26.1,
    dpW: 11.9,
    sdW: 320,
    vtcW: 1400,
    xmW: 6.8,
    frameW: "round",
    boltNW: 8,
    bcdW: 244,
    boltDW: 6.5,
    gasketW: 1.6,
    twoXO,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    adapterReach: 35,
  };
}

function build(key) {
  const record = (engine.BUILDS["2way"] || []).find((item) => item.key === key);
  assert.ok(record, `missing two-way build ${key}`);
  return record;
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`,
  );
}

test("internal XO reactively moves an unclamped calculated station and phase bound", () => {
  const low = engine.solve(modelState(380));
  const high = engine.solve(modelState(430));
  assert.equal(low.infeasible, false);
  assert.equal(high.infeasible, false);

  for (const solved of [low, high]) {
    const plan = solved.ev.plan;
    assert.ok(plan.station > plan.stationNear + 1e-4);
    assert.ok(plan.station < plan.stationMax - 1e-4);
    close(
      plan.phaseBound,
      engine.C / (4 * plan.phaseMargin * plan.xo),
    );
  }

  assert.ok(high.ev.plan.phaseBound < low.ev.plan.phaseBound);
  assert.ok(high.ev.plan.station < low.ev.plan.station);
  assert.notEqual(high.ev.plan.station, low.ev.plan.station);
});

test("every accepted fixture reports a finite legal station matching geometry", () => {
  const fixtures = [
    engine.solve(modelState(380)),
    engine.solve(modelState(430)),
    engine.solve({ ...build("hinson10").s }),
    engine.solve({ ...build("jmod88").s }),
  ];
  const finiteFields = [
    "stationNear",
    "stationMax",
    "phaseBound",
    "stationToThroatAxial",
    "stationPhaseRatio",
    "stationPhaseMarginRemaining",
    "stationNullFrequency",
    "stationNullMarginRatio",
  ];

  for (const solved of fixtures) {
    assert.equal(solved.infeasible, false);
    const plan = solved.ev.plan;
    for (const field of finiteFields) {
      assert.ok(Number.isFinite(plan[field]), `${field} must be finite`);
    }
    assert.ok(plan.station >= plan.stationNear - 1e-12);
    assert.ok(plan.station <= plan.stationMax + 1e-12);
    assert.ok(plan.stationMax <= plan.phaseBound + 1e-12);
    close(plan.stationToThroatAxial, plan.station);
    close(plan.stationPhaseRatio, plan.station / plan.phaseBound);
    close(
      plan.stationPhaseMarginRemaining,
      plan.phaseBound - plan.station,
    );
    close(plan.stationNullFrequency, engine.C / (4 * plan.station));
    close(
      plan.stationNullMarginRatio,
      plan.stationNullFrequency / (plan.phaseMargin * plan.xo) - 1,
    );
    for (const driver of plan.drivers) {
      close(driver.surface[0], plan.station);
    }
    const pathLaw = solved.ev.rows.find(
      (row) => row.name === "Tap station quarter-wave margin",
    );
    assert.equal(pathLaw?.st, "ok");
  }
});

test("paired panel diagnostics expose the edge objective and under-cone remainder", () => {
  const solved = engine.solve(modelState(430));
  const plan = solved.ev.plan;
  assert.equal(solved.infeasible, false);
  assert.equal(plan.family, "panel");
  assert.equal(plan.np, 2);

  const objectiveOffset = Math.max(
    ...plan.drivers.map((driver) => driver.pairTargetOffset),
  );
  const objectiveRatio = Math.min(
    ...plan.drivers.map(
      (driver) => driver.pairTargetOffset / driver.maxPairOffset,
    ),
  );
  const remainingUnderConeOffset = Math.min(
    ...plan.drivers.map(
      (driver) => driver.maxPairOffset - driver.pairOffset,
    ),
  );
  close(plan.pairEdgeObjectiveOffset, objectiveOffset);
  close(plan.pairEdgeObjectiveRatio, objectiveRatio);
  close(plan.pairUnderConeOffsetRemaining, remainingUnderConeOffset);
  assert.ok(plan.pairEdgeObjectiveRatio > 0.9);
  assert.ok(plan.pairUnderConeOffsetRemaining >= 0);
  assert.equal("pairSeamDistance" in plan, false);
});

test("published/manual stations stay authoritative and illegal overrides fail the existing path law", () => {
  const source = build("hinson10");
  const published = engine.solve({ ...source.s });
  assert.equal(published.infeasible, false);
  close(published.ev.plan.station, source.s.tapStationW / 1000);

  const requestedStation = published.ev.plan.stationMax + 0.01;
  const manual = engine.solve({
    ...published.S,
    tapBasis: "manual",
    tapStationW: requestedStation * 1000,
  });
  close(manual.ev.plan.station, requestedStation);
  assert.equal(manual.infeasible, true);
  const pathLaw = manual.ev.rows.find(
    (row) => row.name === "Tap station quarter-wave margin",
  );
  assert.equal(pathLaw?.st, "fail");
});
