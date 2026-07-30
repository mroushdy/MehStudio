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
const corePath = path.join(appRoot, "threeway-core.js");
const source = fs.readFileSync(corePath, "utf8");
const core = require(corePath);

function validInput() {
  return {
    topo: "3way",
    fxDerived: { lo: 340, hi: 1360 },
    provenance: {
      classification: "calculated-adaptation",
      sourceId: "shared-horn-three-band",
      revision: "user-study-r1",
      values: { crossover: "calculated", paths: "user-measured" },
    },
    bands: {
      woofer: {
        pathsToDatumM: [0.25, 0.5],
        reflectionPathM: 0.25,
        summedApertureAreaM2: 0.01,
        localHornAreaM2: 0.02,
      },
      mf: {
        pathsToDatumM: [0.125, 0.125],
        reflectionPathM: 0.0625,
        provenance: {
          values: { paths: "user-measured" },
        },
      },
      cd: {
        pathsToDatumM: [0],
      },
    },
  };
}

test("the Stage 1 boundary is pure analysis and refuses manufacturing", () => {
  assert.equal(core.schemaVersion, 1);
  assert.equal(core.capabilities.status, "analysis-core-only");
  assert.equal(core.capabilities.inputNormalization, true);
  assert.equal(core.capabilities.pathInvariants, true);
  assert.equal(core.capabilities.manufacturingSolids, false);
  assert.equal(core.capabilities.driverMountSolids, false);
  assert.equal(core.capabilities.chamberSolids, false);
  assert.equal(core.capabilities.tapBooleanSubtraction, false);
  assert.equal(core.capabilities.manufacturingExport, false);
  assert.equal(core.capabilities.stlExport, false);
  assert.ok(Object.isFrozen(core.capabilities));

  const refusal = core.manufacturingPreflight("stl");
  assert.deepEqual(
    {
      ok: refusal.ok,
      available: refusal.available,
      operation: refusal.operation,
      code: refusal.code,
    },
    {
      ok: false,
      available: false,
      operation: "stl",
      code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
    },
  );
  assert.match(refusal.reason, /no exact Boolean-integrated/i);
  assert.ok(Object.isFrozen(refusal));

  assert.doesNotMatch(source, /shellMesh|stlBytes|THREE\./);
  assert.doesNotMatch(source, /require\(['"]\.\/(?:engine|twoway-core)/);
});

test("topology, crossovers, band aliases, and provenance normalize without mutation", () => {
  const input = validInput();
  const before = structuredClone(input);
  const normalized = core.normalizeThreeWayInput(input);

  assert.deepEqual(input, before, "normalization mutated the caller state");
  assert.equal(
    normalized.topology.canonical,
    "shared-horn-three-band",
  );
  assert.equal(normalized.topology.pathAnalysisSupported, true);
  assert.equal(normalized.crossovers.lowMidHz, 340);
  assert.equal(normalized.crossovers.midHighHz, 1360);
  assert.equal(normalized.crossovers.ordered, true);
  assert.equal(normalized.crossovers.ratio, 4);
  assert.equal(normalized.crossovers.midBandOctaves, 2);

  assert.equal(normalized.bands.low.id, "low");
  assert.equal(normalized.bands.mid.id, "mid");
  assert.equal(normalized.bands.high.id, "high");
  assert.equal(normalized.bands.low.entryRole, "wall-entry");
  assert.equal(normalized.bands.mid.entryRole, "wall-entry");
  assert.equal(normalized.bands.high.entryRole, "throat");
  assert.deepEqual(normalized.bands.low.pathsToDatumM, [0.25, 0.5]);
  assert.equal(normalized.bands.mid.referencePathToDatumM, 0.125);
  assert.equal(normalized.bands.high.referencePathToDatumM, 0);

  assert.equal(
    normalized.provenance.classification,
    "calculated-adaptation",
  );
  assert.equal(normalized.provenance.recognizedClassification, true);
  assert.equal(normalized.provenance.revision, "user-study-r1");
  assert.deepEqual(normalized.provenance.values, {
    crossover: "calculated",
    paths: "user-measured",
  });
  assert.equal(
    normalized.bands.low.provenance.sourceId,
    "shared-horn-three-band",
  );
  assert.equal(
    normalized.bands.mid.provenance.classification,
    "calculated-adaptation",
  );
  assert.equal(
    normalized.bands.mid.provenance.sourceId,
    "shared-horn-three-band",
  );
  assert.deepEqual(normalized.bands.mid.provenance.values, {
    paths: "user-measured",
  });
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.provenance.values));
  assert.ok(Object.isFrozen(normalized.bands.low.pathsToDatumM));
});

test("shared-horn invariants use only explicit paths, frequencies, and areas", () => {
  const analysis = core.analyzeThreeWay(validInput(), {
    speedOfSoundMps: 340,
  });
  const low = analysis.invariants.bandPaths.low;
  const mid = analysis.invariants.bandPaths.mid;
  const lowMid = analysis.invariants.adjacent.lowMid;
  const midHigh = analysis.invariants.adjacent.midHigh;

  assert.equal(analysis.speedOfSoundMps, 340);
  assert.equal(low.frequencyHz, 340);
  assert.equal(low.wavelengthM, 1);
  assert.equal(low.quarterWaveM, 0.25);
  assert.equal(low.spreadM, 0.25);
  assert.equal(low.spreadWavelengthRatio, 0.25);
  assert.equal(low.spreadQuarterWaveRatio, 1);
  assert.equal(low.spreadPhaseDeg, 90);
  assert.equal(low.reflectionNullHz, 340);
  assert.equal(low.reflectionNullToBoundaryRatio, 1);
  assert.equal(low.apertureToLocalHornAreaRatio, 0.5);

  assert.equal(mid.frequencyHz, 1360);
  assert.equal(mid.spreadM, 0);
  assert.equal(mid.reflectionNullHz, 1360);

  assert.deepEqual(lowMid.deltaPathRangeM, [0.125, 0.375]);
  assert.equal(lowMid.nominalDeltaM, null);
  assert.equal(lowMid.worstAbsolutePhaseDeg, 135);

  assert.deepEqual(midHigh.deltaPathRangeM, [0.125, 0.125]);
  assert.equal(midHigh.nominalDeltaM, 0.125);
  assert.equal(midHigh.nominalPhaseDeg, 180);
  assert.equal(analysis.readiness.pathAnalysis, true);
  assert.equal(analysis.readiness.manufacturing, false);
});

test("missing geometry remains unavailable instead of being inferred", () => {
  const normalized = core.normalizeThreeWayInput({
    topology: "shared-horn",
    crossovers: { lowMidHz: 300, midHighHz: 1200 },
    provenance: { classification: "documented", sourceId: "source-only" },
  });
  for (const id of core.bandIds) {
    assert.deepEqual(normalized.bands[id].pathsToDatumM, []);
    assert.equal(normalized.bands[id].referencePathToDatumM, null);
    assert.equal(normalized.bands[id].reflectionPathM, null);
    assert.equal(normalized.bands[id].summedApertureAreaM2, null);
    assert.equal(normalized.bands[id].localHornAreaM2, null);
  }
  assert.equal(
    normalized.diagnostics.filter(
      item => item.code === "BAND_PATH_INPUT_MISSING",
    ).length,
    3,
  );
  const analysis = core.analyzeThreeWay({
    topology: "shared-horn",
    crossovers: { lowMidHz: 300, midHighHz: 1200 },
  });
  assert.equal(analysis.readiness.pathAnalysis, false);
  assert.equal(analysis.invariants.bandPaths.low.pathAvailable, false);
  assert.equal(analysis.invariants.adjacent.lowMid.available, false);
});

test("source classifications are preserved and never promoted silently", () => {
  assert.deepEqual(core.provenanceClassifications, [
    "documented",
    "calculated-adaptation",
    "envelope-study",
    "adjacent",
  ]);
  const unknown = core.normalizeThreeWayInput({
    topology: "envelope-study",
    crossovers: { lowMidHz: 1200, midHighHz: 300 },
    provenance: {
      classification: "photographic-guess",
      sourceId: "unverified-photo",
      revision: { captured: "unknown" },
    },
  });
  assert.equal(unknown.provenance.classification, "photographic-guess");
  assert.equal(unknown.provenance.recognizedClassification, false);
  assert.deepEqual(unknown.provenance.revision, { captured: "unknown" });
  assert.equal(unknown.topology.analysisMode, "envelope-only");
  assert.equal(unknown.topology.pathAnalysisSupported, false);
  assert.equal(unknown.crossovers.ordered, false);
  assert.ok(
    unknown.diagnostics.some(
      item => item.code === "CROSSOVER_ORDER_INVALID",
    ),
  );
});

test("the math catalog exposes provenance without commercial geometry", () => {
  assert.equal(
    core.equationCatalog.pathPhase.equation,
    "phase_deg = 360 * f * delta_path / c",
  );
  assert.equal(
    core.equationCatalog.quarterWaveNull.status,
    "documented-design-relation",
  );
  assert.match(
    core.equationCatalog.quarterWaveNull.sources.join(" "),
    /US 6,411,718/,
  );
  assert.match(
    core.equationCatalog.apertureAreaRatio.equation,
    /summed_aperture_area \/ local_horn_area/,
  );
  assert.doesNotMatch(source, /\bSH(?:46|50|60|96)\b|CoSyne|Jericho/);
  assert.doesNotMatch(source, /driverCount|mouthWidth|coverage(?:H|V)/);
});

test("the core loads in a browser-like VM without DOM or engine globals", () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.MEH3.schemaVersion, 1);
  assert.equal(context.MEH3.capabilities.manufacturingExport, false);
  const analysis = context.MEH3.analyzeThreeWay({
    topology: "three-way",
    crossovers: { lowMidHz: 300, midHighHz: 1200 },
    bands: [
      { band: "lf", pathToDatumM: 0.2 },
      { band: "mf", pathToDatumM: 0.05 },
      { band: "hf", pathToDatumM: 0 },
    ],
  });
  assert.equal(analysis.normalized.bands.low.entryRole, "wall-entry");
  assert.equal(analysis.normalized.bands.high.entryRole, "throat");
  assert.equal(analysis.readiness.pathAnalysis, true);
});
