import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const modulePath = path.join(appRoot, "threeway-analysis-presets.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const presets = require(modulePath);
const cards = require(path.join(appRoot, "threeway-reference-cards.js"));
const contract = require(path.join(appRoot, "threeway-state-contract.js"));
const driverDb = require(path.join(appRoot, "threeway-driver-db.js"));
const solver = require(path.join(appRoot, "threeway-solver.js"));

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`);
  }
}

function outputFor(id, bandIds, kind, diameterM, areaM2) {
  return {
    id,
    bandIds,
    kind,
    geometry: {
      shape: "round",
      diameterM,
      areaM2,
    },
    acousticDatum: {
      kind: "documented-reference-plane",
      offsetM: 0.02,
    },
    provenanceRefs: [`prov-${id}`],
  };
}

function driverRecord({
  id,
  kind = "cone",
  bandIds,
  diameterM,
  depthM,
  effectiveAreaM2,
  outputId,
  outputDiameterM,
  outputAreaM2,
}) {
  return {
    schemaVersion: 1,
    id,
    revision: 1,
    kind,
    bandIds,
    frame: {
      shape: "round",
      diameterM,
      depthM,
      frontProjectionM: 0,
    },
    diaphragm: {
      effectiveAreaM2,
      activeDiameterM: Math.sqrt(4 * effectiveAreaM2 / Math.PI),
      provenanceRefs: [`prov-${id}`],
    },
    outputs: [
      outputFor(
        outputId,
        bandIds,
        kind === "compression" ? "throat" : "front-diaphragm",
        outputDiameterM,
        outputAreaM2,
      ),
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: [`prov-${id}`],
    },
    provenanceRefs: [`prov-${id}`],
  };
}

function h3Drivers() {
  return [
    driverRecord({
      id: "explicit-h3-low",
      bandIds: ["low"],
      diameterM: 0.38,
      depthM: 0.18,
      effectiveAreaM2: 0.085,
      outputId: "low-front",
      outputDiameterM: 0.33,
      outputAreaM2: 0.085,
    }),
    driverRecord({
      id: "explicit-h3-mid",
      bandIds: ["mid"],
      diameterM: 0.14,
      depthM: 0.075,
      effectiveAreaM2: 0.009,
      outputId: "mid-front",
      outputDiameterM: 0.107,
      outputAreaM2: 0.009,
    }),
    driverRecord({
      id: "explicit-h3-high",
      kind: "compression",
      bandIds: ["high"],
      diameterM: 0.13,
      depthM: 0.105,
      effectiveAreaM2: 0.00096,
      outputId: "high-throat",
      outputDiameterM: 0.035,
      outputAreaM2: 0.00096,
    }),
  ];
}

function h3State() {
  return cards.applyReferenceCard(
    "u15-h3-documented-topology",
  ).state;
}

function explicitHorn() {
  return {
    schemaVersion: 2,
    throat: { widthM: 0.035, heightM: 0.035 },
    mouth: { widthM: 0.6, heightM: 0.42 },
    depthM: 0.45,
    coverageDeg: { horizontal: 90, vertical: 60 },
    surfaceLaw: {
      family: "conical",
      parameters: {
        nominalHalfAngle: Math.atan(
          (Math.sqrt(0.6 * 0.42) / 2 - 0.035 / 2) / 0.45,
        ),
      },
    },
    crossSection: {
      family: "ellipse",
      parameters: {},
    },
    azimuthRad: 0,
    sampling: {
      axialStationCount: 33,
      perimeterSampleCount: 256,
    },
    provenanceRefs: ["explicit-analysis-horn"],
  };
}

function h3Input() {
  return {
    state: h3State(),
    driverRecords: h3Drivers(),
    sourceDriverRefs: {
      "source-low-external": "explicit-h3-low",
      "source-mid": "explicit-h3-mid",
      "source-high": "explicit-h3-high",
    },
    analysisOverrides: {
      horn: explicitHorn(),
      package: {
        globalMarginM: 0.01,
        componentClearanceM: 0.003,
      },
    },
  };
}

test("pure UMD/CommonJS API is immutable and contains only evidence-bounded presets", () => {
  assert.equal(presets.version, 1);
  assert.equal(presets.schemaVersion, 2);
  assert.deepEqual([...presets.presetIds], [
    "cosyne-t3",
    "hinson-cx3",
    "u15-h3",
  ]);
  assert.equal(presets.capabilities.productDimensionInference, false);
  assert.equal(presets.capabilities.stationInference, false);
  assert.equal(presets.capabilities.manufacturing, false);
  assertDeepFrozen(presets);

  assert.doesNotMatch(
    moduleSource,
    /\bwindow\b|\blocalStorage\b|\bTHREE\b/,
  );
  const browserGlobal = {
    MEH3StateContract: contract,
    MEH3DriverDB: driverDb,
    MEH3ReferenceCards: cards,
  };
  const context = vm.createContext({ globalThis: browserGlobal });
  vm.runInContext(moduleSource, context, { filename: modulePath });
  assert.equal(
    typeof browserGlobal.MEH3AnalysisPresets.buildAnalysisPreset,
    "function",
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(browserGlobal.MEH3AnalysisPresets.presetIds)),
    [...presets.presetIds],
  );
});

test("reference cards alone remain blocked instead of receiving remembered product geometry", () => {
  const cases = [
    ["cosyne-t3-documented-topology", "cosyne-t3"],
    ["hinson-cx3-documented-topology", "hinson-cx3"],
    ["u15-h3-documented-topology", "u15-h3"],
  ];
  for (const [cardId, presetId] of cases) {
    const state = cards.applyReferenceCard(cardId).state;
    const before = structuredClone(state);
    const result = presets.buildAnalysisPreset({
      state,
      driverRecords: [],
      analysisOverrides: {},
    });
    assert.deepEqual(state, before);
    assert.equal(result.ok, false);
    assert.equal(result.available, false);
    assert.equal(result.presetId, presetId);
    assert.equal(result.analysisInput, null);
    assert.ok(result.missingInputs.some(item =>
      item.path.startsWith("state.sources[")));
    assert.ok(result.missingInputs.some(item =>
      item.path === "horn.throat.widthM"));
    assert.ok(result.missingInputs.some(item =>
      item.path === "package.globalMarginM"));
    assert.equal(result.manufacturing, false);
    assert.equal(result.stl, false);
    assertDeepFrozen(result);
  }
});

test("explicit numeric inputs stay typed instead of accepting UI numeric strings", () => {
  const input = h3Input();
  input.analysisOverrides.horn.depthM = "0.45";
  input.analysisOverrides.package.globalMarginM = "0.01";
  const result = presets.buildAnalysisPreset(input);
  assert.equal(result.ok, false);
  assert.equal(result.analysisInput, null);
  assert.ok(result.missingInputs.some(item =>
    item.path === "horn.depthM"));
  assert.ok(result.missingInputs.some(item =>
    item.path === "package.globalMarginM"));
});

test("generic patent and compound cards return distinct typed refusals", () => {
  const patent = presets.buildAnalysisPreset({
    state: cards.applyReferenceCard("patent-t3-generic").state,
    driverRecords: [],
  });
  assert.equal(
    patent.code,
    presets.failureCodes.EXPLICIT_INPUTS_REQUIRED,
  );
  assert.match(
    patent.missingInputs[0].reason,
    /does not document universal source counts/i,
  );

  const compound = presets.buildAnalysisPreset({
    state: cards.applyReferenceCard(
      "compound-research-generic",
    ).state,
    driverRecords: [],
  });
  assert.equal(
    compound.code,
    presets.failureCodes.REFERENCE_CARD_UNSUPPORTED,
  );
  assert.match(compound.missingInputs[0].reason, /explicit directed graph/i);
});

test("explicit source-driver bindings are deterministic and conflicts fail closed", () => {
  const first = presets.buildAnalysisPreset(h3Input());
  const secondInput = h3Input();
  secondInput.driverRecords.reverse();
  const second = presets.buildAnalysisPreset(secondInput);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.stateHashInput, second.stateHashInput);
  assert.equal(
    presets.stableStringify(first.analysisInput),
    presets.stableStringify(second.analysisInput),
  );

  const conflict = h3Input();
  conflict.state = structuredClone(conflict.state);
  conflict.state.sources.find(item =>
    item.id === "source-high").driverRef = "different-driver";
  const refused = presets.buildAnalysisPreset(conflict);
  assert.equal(refused.ok, false);
  assert.ok(refused.diagnostics.some(item =>
    item.code === presets.failureCodes.DRIVER_BINDING_CONFLICT));
});

test("H3 becomes solver-ready only after explicit drivers, horn, and package clearances", () => {
  const built = presets.buildAnalysisPreset(h3Input());
  assert.equal(built.ok, true, JSON.stringify(built.diagnostics, null, 2));
  assert.equal(built.available, true);
  assert.equal(built.presetId, "u15-h3");
  assert.equal(built.topology, "H3");
  assert.deepEqual(built.analysisInput.stations, {
    stationRequirements: [],
  });
  assert.deepEqual(built.analysisInput.apertures, { sources: [] });
  assert.deepEqual(built.analysisInput.chambers, { chambers: [] });
  assert.deepEqual(built.analysisInput.placementPlans, []);
  assert.equal(built.readiness.solverInput, true);
  assert.equal(built.readiness.preview, false);
  assertDeepFrozen(built);

  const analysisInputHash = "meh3-analysis-input-v1\n" +
    solver.stableStringify(built.analysisInput);
  const solved = solver.solveThreeWay({
    schemaVersion: 1,
    requestId: "preset-h3-test",
    revision: built.state.revision,
    inputHash: built.stateHashInput,
    analysisInputHash,
    state: built.state,
    analysisInput: built.analysisInput,
  });
  assert.equal(solved.ok, true, JSON.stringify(solved.diagnostics, null, 2));
  assert.equal(solved.solution.topology.kind, "H3");
  assert.equal(solved.solution.entryStations.length, 0);
  assert.equal(solved.solution.passages.length, 0);
  assert.equal(solved.solution.mounts.length, 0);
  assert.equal(solved.manufacturing, false);
  assert.equal(solved.stl, false);
});

test("preview intent shape matches the canonical render assembler contract", () => {
  const input = h3Input();
  input.requirePreview = true;
  input.analysisOverrides.render = {
    renderIntents: {
      throatInterfaces: [],
      stationMarkers: [],
      sectionPlane: {},
    },
    azimuthSegments: 24,
  };
  const objectResult = presets.buildAnalysisPreset(input);
  assert.equal(objectResult.ok, true);
  assert.equal(objectResult.readiness.preview, true);

  input.analysisOverrides.render.renderIntents = [];
  const arrayResult = presets.buildAnalysisPreset(input);
  assert.equal(arrayResult.ok, false);
  assert.equal(arrayResult.analysisInput, null);
  assert.ok(
    arrayResult.missingInputs.some(item =>
      item.path === "render.renderIntents"
    ),
  );
});

test("wall-entry presets expose every missing physical phase and only copy documented driver area", () => {
  const state = cards.applyReferenceCard(
    "hinson-cx3-documented-topology",
  ).state;
  const low = driverRecord({
    id: "explicit-cx3-low",
    bandIds: ["low"],
    diameterM: 0.25,
    depthM: 0.12,
    effectiveAreaM2: 0.033,
    outputId: "low-front",
    outputDiameterM: 0.205,
    outputAreaM2: 0.033,
  });
  const coax = driverRecord({
    id: "explicit-cx3-coax",
    kind: "dual-diaphragm",
    bandIds: ["mid", "high"],
    diameterM: 0.19,
    depthM: 0.16,
    effectiveAreaM2: 0.012,
    outputId: "coax-throat",
    outputDiameterM: 0.035,
    outputAreaM2: 0.00096,
  });
  const result = presets.buildAnalysisPreset({
    state,
    driverRecords: [low, coax],
    sourceDriverRefs: {
      "source-low": low.id,
      "source-coax-mid-high": coax.id,
    },
    analysisOverrides: {
      apertures: {
        sources: [{ sourceId: "source-low" }],
      },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.analysisInputDraft.apertures.sources[0]
      .driverEffectiveAreaM2,
    0.033,
  );
  assert.deepEqual(result.derivations, [{
    path: "apertures.sources[source-low].driverEffectiveAreaM2",
    kind: "documented-driver-record-copy",
    value: 0.033,
    sourcePath:
      "driverRecords[explicit-cx3-low].diaphragm.effectiveAreaM2",
    inferredProductData: false,
  }]);
  for (const requiredPath of [
    "stations.stationRequirements",
    "chambers.chambers",
    "placementPlans[source-low]",
    "passages.acoustics.speedOfSoundMps",
    "interfaceValidation.minimumDriverClearanceM",
    "mountValidation.minimumDriverClearanceM",
  ]) {
    assert.ok(
      result.missingInputs.some(item => item.path === requiredPath),
      `missing typed requirement for ${requiredPath}`,
    );
  }
});

test("changing the documented card graph refuses the preset label", () => {
  const input = h3Input();
  input.state = structuredClone(input.state);
  input.state.sources.find(item =>
    item.id === "source-mid").count = 4;
  const result = presets.buildAnalysisPreset(input);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === presets.failureCodes.STATE_MISMATCH));
  assert.equal(result.analysisInput, null);
});
