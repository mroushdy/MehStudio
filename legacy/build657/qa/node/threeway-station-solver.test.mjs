import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const stationSolver = require(path.join(
  appRoot, "threeway-station-solver.js"));

function state() {
  return {
    schemaVersion: 2,
    designId: "station-test",
    revision: 1,
    topology: { kind: "T3", schemaVersion: 1 },
    entryStations: [
      {
        id: "station-low",
        role: "wall-entry",
        sourceIds: ["src-low"],
        bandIds: ["low"],
        order: 2,
      },
      {
        id: "station-mid",
        role: "wall-entry",
        sourceIds: ["src-mid"],
        bandIds: ["mid"],
        order: 1,
      },
    ],
  };
}

function horn(perimeterScale = 1) {
  const stations = [];
  for (let index = 0; index <= 20; index++) {
    const axialM = index * 0.02;
    const widthM = 0.04 + index * 0.02;
    const heightM = 0.03 + index * 0.015;
    stations.push({
      axialM,
      sectionAreaM2: widthM * heightM,
      sectionPerimeterM: perimeterScale * 2 * (widthM + heightM),
      section: {
        widthM,
        heightM,
        family: "superellipse",
        exponent: 4,
      },
    });
  }
  return {
    ok: true,
    kind: "threeway-horn-surface",
    surfaceHash: `surface-${perimeterScale}`,
    stations,
  };
}

function requirements() {
  return [
    {
      stationId: "station-mid",
      bandIds: ["mid"],
      sourceIds: ["src-mid"],
      sourceCount: 4,
      legalIntervalM: { minimum: 0.07, maximum: 0.22 },
      selectionMode: "solve",
      requiredAxialSpanM: 0.03,
      requiredCircumferentialSpanPerSourceM: 0.035,
      minimumCircumferentialGapM: 0.006,
      minimumAxialGapM: 0.02,
      distribution: "rotational",
    },
    {
      stationId: "station-low",
      bandIds: ["low"],
      sourceIds: ["src-low"],
      sourceCount: 2,
      legalIntervalM: { minimum: 0.2, maximum: 0.37 },
      selectionMode: "solve",
      requiredAxialSpanM: 0.05,
      requiredCircumferentialSpanPerSourceM: 0.08,
      minimumCircumferentialGapM: 0.012,
      minimumAxialGapM: 0.025,
      distribution: "rotational",
    },
  ];
}

function solve(overrides = {}) {
  return stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(),
    stationRequirements: requirements(),
    optimization: "balanced",
    inputHash: "state-hash",
    ...overrides,
  });
}

test("T3 solve is immutable, ordered, keyed, and does not mutate crossover or mouth", () => {
  const input = {
    state: state(),
    hornSurface: horn(),
    stationRequirements: requirements(),
    optimization: "balanced",
    inputHash: "state-hash",
  };
  const before = structuredClone(input);
  const result = stationSolver.solveEntryStations(input);
  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.result.selectedEntryStations.map(item => item.stationId),
    ["station-mid", "station-low"],
  );
  assert.ok(result.result.selectedEntryStations[1].axialM >
    result.result.selectedEntryStations[0].axialM);
  assert.equal(result.result.crossoverIntentMutated, false);
  assert.equal(result.result.sourceCountInferred, false);
  assert.equal(result.result.mouthMutated, false);
  assert.equal(result.result.manufacturing, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.result.selectedEntryStations));
});

test("rotational distribution emits exact source count and equal azimuth pitch", () => {
  const result = solve();
  assert.equal(result.ok, true);
  const mid = result.result.selectedEntryStations[0];
  assert.equal(mid.circumferential.sourceAzimuthsRad.length, 4);
  assert.deepEqual(mid.circumferential.sourceAzimuthsRad, [
    0, Math.PI / 2, Math.PI, 3 * Math.PI / 2,
  ]);
  assert.ok(mid.circumferential.packingMarginM >= 0);
});

test("source size/count changes recompute feasibility instead of rescaling a picture", () => {
  const baseline = solve();
  assert.equal(baseline.ok, true);
  const large = requirements();
  large[0].sourceCount = 8;
  large[0].requiredCircumferentialSpanPerSourceM = 0.12;
  const result = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(),
    stationRequirements: large,
    optimization: "balanced",
  });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_ENTRY_STATION_PACKING_UNSOLVABLE"));
});

test("more horn perimeter can make explicit packing feasible without changing source intent", () => {
  const crowded = requirements();
  crowded[0].sourceCount = 6;
  crowded[0].requiredCircumferentialSpanPerSourceM = 0.095;
  const narrow = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(0.7),
    stationRequirements: crowded,
  });
  const broad = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(2),
    stationRequirements: crowded,
  });
  assert.equal(narrow.ok, false);
  assert.equal(broad.ok, true);
  assert.equal(broad.result.selectedEntryStations[0].sourceCount, 6);
  assert.equal(
    broad.result.selectedEntryStations[0]
      .circumferential.requiredSpanPerSourceM,
    0.095,
  );
});

test("coupled order and physical gaps are enforced after individual feasibility", () => {
  const close = requirements();
  close[0].legalIntervalM = { minimum: 0.14, maximum: 0.25 };
  close[1].legalIntervalM = { minimum: 0.18, maximum: 0.29 };
  close[0].requiredAxialSpanM = 0.04;
  close[1].requiredAxialSpanM = 0.04;
  close[0].minimumAxialGapM = 0.08;
  close[1].minimumAxialGapM = 0.08;
  const result = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(2),
    stationRequirements: close,
  });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_ENTRY_STATION_COUPLED_UNSOLVABLE"));
});

test("documented lock is exact and cannot escape its legal interval", () => {
  const locked = requirements();
  locked[0].selectionMode = "documented-lock";
  locked[0].requestedM = 0.14;
  const pass = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(2),
    stationRequirements: locked,
  });
  assert.equal(pass.ok, true);
  assert.equal(pass.result.selectedEntryStations[0].axialM, 0.14);

  locked[0].requestedM = 0.3;
  const fail = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(2),
    stationRequirements: locked,
  });
  assert.equal(fail.ok, false);
  assert.ok(fail.diagnostics.some(item =>
    item.code === "THREEWAY_ENTRY_STATION_INTERVAL_EMPTY"));
});

test("low-distortion ranking requires explicit upstream acoustic preferences", () => {
  const missing = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(2),
    stationRequirements: requirements(),
    optimization: "low-distortion",
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.diagnostics.some(item =>
    item.code === "THREEWAY_STATION_REQUIREMENT_INVALID"));

  const explicit = requirements();
  explicit[0].preferenceM = 0.18;
  explicit[1].preferenceM = 0.31;
  const result = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(2),
    stationRequirements: explicit,
    optimization: "low-distortion",
  });
  assert.equal(result.ok, true);
  assert.ok(Math.abs(
    result.result.selectedEntryStations[0].axialM - 0.18
  ) < 1e-12);
  assert.ok(Math.abs(
    result.result.selectedEntryStations[1].axialM - 0.31
  ) < 1e-12);
});

test("state station permutation leaves the deterministic solution unchanged", () => {
  const first = solve();
  const permuted = state();
  permuted.entryStations.reverse();
  const second = stationSolver.solveEntryStations({
    state: permuted,
    hornSurface: horn(),
    stationRequirements: requirements().reverse(),
    optimization: "balanced",
    inputHash: "state-hash",
  });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.hashInput, second.hashInput);
});

test("CX3 one-LF station and H3 zero shared-horn stations are supported", () => {
  const cx = state();
  cx.topology.kind = "CX3";
  cx.entryStations = [cx.entryStations[0]];
  const cxResult = stationSolver.solveEntryStations({
    state: cx,
    hornSurface: horn(2),
    stationRequirements: [requirements()[1]],
  });
  assert.equal(cxResult.ok, true);
  assert.equal(cxResult.result.selectedEntryStations.length, 1);

  const hybrid = state();
  hybrid.topology.kind = "H3";
  hybrid.entryStations = [];
  const hybridResult = stationSolver.solveEntryStations({
    state: hybrid,
    hornSurface: horn(),
    stationRequirements: [],
  });
  assert.equal(hybridResult.ok, true);
  assert.deepEqual(hybridResult.result.selectedEntryStations, []);
});

test("compound research and incomplete requirements fail closed", () => {
  const compound = state();
  compound.topology.kind = "COMPOUND_RESEARCH";
  const unsupported = stationSolver.solveEntryStations({
    state: compound,
    hornSurface: horn(),
    stationRequirements: requirements(),
  });
  assert.equal(unsupported.ok, false);
  assert.ok(unsupported.diagnostics.some(item =>
    item.code === "THREEWAY_STATION_TOPOLOGY_UNSUPPORTED"));

  const missing = stationSolver.solveEntryStations({
    state: state(),
    hornSurface: horn(),
    stationRequirements: [requirements()[0]],
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.diagnostics.some(item =>
    item.code === "THREEWAY_ENTRY_STATION_REQUIRED"));
});

test("manufacturing remains false", () => {
  const result = solve();
  assert.equal(result.manufacturing, false);
  assert.equal(result.capabilities.mountSolid, false);
  const preflight = stationSolver.manufacturingPreflight("station-stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
});
