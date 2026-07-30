import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const quickStarts = require(path.join(appRoot, "threeway-quick-starts.js"));
const familyCatalog = require(path.join(
  appRoot,
  "threeway-family-catalog.js",
));
const stateContract = require(path.join(
  appRoot,
  "threeway-state-contract.js",
));
const solver = require(path.join(appRoot, "threeway-solver.js"));
const ANALYSIS_HASH_PREFIX = "meh3-analysis-input-v1\n";

function solveQuickStart(controls = {}) {
  const built = quickStarts.buildQuickStart(
    quickStarts.DEFAULT_ID,
    controls,
  );
  const normalized = stateContract.normalizeThreeWayState(built.state);
  assert.equal(normalized.valid, true, normalized.diagnostics?.[0]?.message);
  const result = solver.solveThreeWay({
    schemaVersion: 1,
    requestId: "threeway-quick-start-test",
    revision: 1,
    inputHash: normalized.hashInput,
    analysisInputHash:
      ANALYSIS_HASH_PREFIX + solver.stableStringify(built.analysisInput),
    state: normalized.state,
    analysisInput: built.analysisInput,
    build: "quick-start-test",
  });
  return { built, result };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

test("calculated T3 quick start solves and renders on first load", () => {
  assert.equal(quickStarts.DEFAULT_ID, "calculated-t3-study");
  assert.equal(quickStarts.listQuickStarts().length, 1);
  assert.equal(
    quickStarts.getQuickStart(quickStarts.DEFAULT_ID).classification,
    "calculated-adaptation",
  );
  const { built, result } = solveQuickStart();
  assertDeepFrozen(built);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(result.solution.topology.kind, "T3");
  assert.equal(result.solution.entryStations.length, 2);
  assert.equal(result.solution.apertureLayouts.length, 2);
  assert.equal(result.solution.passages.length, 4);
  assert.equal(result.solution.mounts.length, 2);
  assert.equal(result.readiness.preview, true);
  assert.ok(result.renderModel);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
  assert.equal(built.metadata.analysisOnly, true);
  assert.equal(built.metadata.exactSolid, false);
  assert.deepEqual(
    built.analysisInput.solidGeometry,
    familyCatalog.getPreset("t3-calculated-111").analysisInput.solidGeometry,
    "the certified candidate must consume explicit preset-owned solid input",
  );
});

test("practical controls rebuild a different solver-valid T3 preview", () => {
  const controls = {
    mouthWidthM: 0.72,
    mouthHeightM: 0.54,
    depthM: 0.34,
    coverageHorizontalDeg: 100,
    coverageVerticalDeg: 70,
    lowMidHz: 320,
    midHighHz: 1400,
    surfaceLawFamily: "classicOS",
    crossSectionFamily: "superellipse",
    crossSectionExponent: 3.5,
  };
  const first = solveQuickStart();
  const second = solveQuickStart(controls);
  assert.equal(
    second.result.ok,
    true,
    JSON.stringify(second.result.diagnostics, null, 2),
  );
  assert.equal(second.result.readiness.preview, true);
  assert.notEqual(
    second.result.solution.solutionHash,
    first.result.solution.solutionHash,
  );
  assert.deepEqual(second.built.controls, controls);
  assert.equal(second.built.state.intent.crossoversHz.lowMid, 320);
  assert.equal(second.built.state.intent.crossoversHz.midHigh, 1400);
  assert.notDeepEqual(
    second.built.analysisInput.stations,
    first.built.analysisInput.stations,
  );
  assert.equal(
    second.built.analysisInput.apertures.sources[0].upperFrequencyHz,
    320,
  );
  assert.equal(
    second.built.analysisInput.apertures.sources[1].upperFrequencyHz,
    1400,
  );
});

test("quick-start controls fail closed on invalid physical ranges", () => {
  assert.throws(
    () => quickStarts.buildQuickStart(
      quickStarts.DEFAULT_ID,
      { mouthWidthM: 0.1 },
    ),
    /Mouth width/,
  );
  assert.throws(
    () => quickStarts.buildQuickStart(
      quickStarts.DEFAULT_ID,
      { lowMidHz: 650, midHighHz: 600 },
    ),
    /Mid\/high crossover/,
  );
  assert.throws(
    () => quickStarts.buildQuickStart(
      "unknown-quick-start",
      {},
    ),
    /Unknown three-way quick start/,
  );
});
