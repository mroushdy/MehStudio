import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const catalog = require(path.join(appRoot, "threeway-family-catalog.js"));

function completeMount(diameterM) {
  return {
    datum: "front-frame-plane",
    cutout: {
      shape: "round",
      diameterM: diameterM * 0.78,
    },
    boltCircle: {
      count: 8,
      diameterM: diameterM * 0.88,
      holeDiameterM: 0.006,
    },
    gasket: {
      shape: "round",
      diameterM: diameterM * 0.92,
    },
    provenanceRefs: ["fixture-mount-drawing"],
  };
}

function completeTs(areaM2) {
  return {
    fsHz: 62,
    vasM3: 0.025,
    qts: 0.32,
    qes: 0.35,
    qms: 5.8,
    reOhm: 5.6,
    leH: 0.00035,
    blTm: 9.4,
    mmsKg: 0.026,
    cmsMPerN: 0.00028,
    rmsNsPerM: 1.3,
    sdM2: areaM2,
    xmaxM: 0.005,
    provenanceRefs: ["fixture-data-sheet"],
  };
}

function driverRecord({
  id,
  manufacturer,
  model,
  kind,
  bandIds,
  outputKind,
  frameDiameterM,
  frameDepthM,
  outputDiameterM,
  outputAreaM2,
  coneTerms = false,
  completeMounting = true,
  coupling = false,
}) {
  return {
    schemaVersion: 1,
    id,
    revision: 1,
    manufacturer,
    model,
    kind,
    bandIds,
    frame: {
      shape: "round",
      diameterM: frameDiameterM,
      depthM: frameDepthM,
      frontProjectionM: 0.003,
    },
    diaphragm: {
      effectiveAreaM2: outputAreaM2,
      activeDiameterM: outputDiameterM,
      maxLinearExcursionM: coneTerms ? 0.005 : 0,
      provenanceRefs: ["fixture-data-sheet"],
    },
    outputs: [
      {
        id: `${id}-output`,
        bandIds,
        kind: outputKind,
        geometry: {
          shape: "round",
          diameterM: outputDiameterM,
          areaM2: outputAreaM2,
        },
        acousticDatum: {
          kind: kind === "cone"
            ? "diaphragm"
            : "manufacturer-reference-plane",
          offsetM: kind === "cone" ? 0.022 : 0.07,
        },
        provenanceRefs: ["fixture-data-sheet"],
      },
    ],
    mounting: completeMounting ? completeMount(frameDiameterM) : {
      datum: "front-frame-plane",
      provenanceRefs: ["fixture-data-sheet"],
    },
    ts: coneTerms ? completeTs(outputAreaM2) : {},
    limits: coupling ? {
      coupling: {
        documented: true,
        terminationModesDocumented: true,
        provenanceRefs: ["fixture-coupling-measurement"],
      },
    } : {},
    provenanceRefs: ["fixture-data-sheet"],
  };
}

function cone(overrides = {}) {
  return driverRecord({
    id: "fixture-cone",
    manufacturer: "Fixture",
    model: "Cone",
    kind: "cone",
    bandIds: ["low"],
    outputKind: "front-diaphragm",
    frameDiameterM: 0.26,
    frameDepthM: 0.12,
    outputDiameterM: 0.205,
    outputAreaM2: 0.033,
    coneTerms: true,
    ...overrides,
  });
}

function compression(overrides = {}) {
  return driverRecord({
    id: "fixture-compression",
    manufacturer: "Fixture",
    model: "Compression",
    kind: "compression",
    bandIds: ["high"],
    outputKind: "throat",
    frameDiameterM: 0.15,
    frameDepthM: 0.11,
    outputDiameterM: 0.035,
    outputAreaM2: Math.PI * 0.0175 ** 2,
    ...overrides,
  });
}

function dualDiaphragm(overrides = {}) {
  return driverRecord({
    id: "fixture-dual",
    manufacturer: "Fixture",
    model: "Dual",
    kind: "dual-diaphragm",
    bandIds: ["mid", "high"],
    outputKind: "coaxial-throat",
    frameDiameterM: 0.19,
    frameDepthM: 0.16,
    outputDiameterM: 0.035,
    outputAreaM2: Math.PI * 0.0175 ** 2,
    coupling: true,
    ...overrides,
  });
}

function t3Bindings() {
  return {
    "source-high": {
      count: 1,
      record: compression({
        id: "celestion-cdx1-1445-record",
        manufacturer: "Celestion",
        model: "CDX1-1445",
      }),
    },
    "source-mid": {
      count: 4,
      record: cone({
        id: "gento-sp99023a-record",
        manufacturer: "Gento",
        model: "SP99023A",
        bandIds: ["mid"],
      }),
    },
    "source-low": {
      count: 4,
      record: cone({
        id: "aurasound-ns6-record",
        manufacturer: "Aurasound",
        model: "NS6-255-8A",
      }),
    },
  };
}

function cx3Bindings() {
  return {
    "source-coax-mid-high": {
      count: 1,
      record: dualDiaphragm({
        id: "bc-dcx464-record",
        manufacturer: "B&C Speakers",
        model: "DCX464",
      }),
    },
    "source-low": {
      count: 2,
      record: cone({
        id: "bc-10nw76-record",
        manufacturer: "B&C Speakers",
        model: "10NW76",
      }),
    },
  };
}

test("catalog exposes exactly three selectable truthful families", () => {
  assert.deepEqual(catalog.selectableFamilyIds, [
    "t3-conventional-two-wall",
    "cx3-dual-diaphragm-tapped-lf",
    "h3-external-lf-shared-mid-high",
  ]);
  assert.equal(catalog.listSelectableFamilies().length, 3);
  assert.equal(catalog.listFamilies().length, 3);
  assert.equal(catalog.listFamilies({ includeResearch: true }).length, 4);

  for (const family of catalog.listSelectableFamilies()) {
    assert.equal(family.selectable, true);
    assert.deepEqual(family.bandIds, ["low", "mid", "high"]);
    assert.ok(family.sourceGroups.length > 0);
    assert.ok(family.stationIntent.length > 0);
    assert.ok(family.provenanceRefs.length > 0);
    assert.ok(family.defaultAcousticTargets);
    assert.equal(family.manufacturingReadiness, false);
    assert.equal(family.exactGeometryPassed, false);
    assert.deepEqual(Object.keys(family.driverOptions).sort(), [
      "high",
      "low",
      "mid",
    ]);
  }
});

test("source counts and station semantics do not collapse T3, CX3, and H3", () => {
  const t3 = catalog.getFamily("t3-conventional-two-wall");
  assert.equal(t3.physicalSourceCount, 9);
  assert.deepEqual(
    t3.sourceGroups.map(({ id, count }) => [id, count]),
    [["source-high", 1], ["source-mid", 4], ["source-low", 4]],
  );
  assert.deepEqual(
    t3.stationIntent.map(({ kind, order }) => [kind, order]),
    [["throat", 0], ["wall-entry", 1], ["wall-entry", 2]],
  );

  const cx3 = catalog.getFamily("cx3-dual-diaphragm-tapped-lf");
  assert.equal(cx3.physicalSourceCount, 3);
  assert.deepEqual(cx3.linkedDriverBands, [["mid", "high"]]);
  assert.equal(cx3.sourceGroups.length, 2);
  assert.equal(cx3.stationIntent.filter(({ kind }) =>
    kind === "wall-entry").length, 1);

  const h3 = catalog.getFamily("h3-external-lf-shared-mid-high");
  assert.equal(h3.physicalSourceCount, 5);
  assert.equal(h3.stationIntent.at(-1).scope, "outside-shared-horn");
  assert.equal(h3.stationIntent.at(-1).kind, "external-direct-radiator");
  assert.equal(h3.stationIntent.at(-1).order, null);
});

test("only calculated 1+1+1 T3 preset owns integrated-solid design intent", () => {
  const t3 = catalog.getFamily("t3-conventional-two-wall");
  const calculated = catalog.getPreset("t3-calculated-111");
  const archived = catalog.getPreset("cosyne-t3-archived-144");
  const solid = calculated.analysisInput.solidGeometry;
  assert.deepEqual(solid, {
    schemaVersion: 1,
    constructionId: "t3-calculated-two-wall-v1",
    mode: "integrated-solid",
    wallThicknessM: 0.012,
    throatCollarLengthM: 0.025,
    lumenWallOvershootM: 0.003,
    lumenChamberOverlapM: 0.004,
    minimumPrintableWebM: 0.004,
    meshClearanceM: 0.0004,
    booleanToleranceM: 0.00001,
    inspection: { perimeterSegments: 96 },
    provenance: {
      classification: "calculated-design-intent",
      evidenceRefs: ["prov-meh3-calculated-t3-solid-v1"],
    },
  });
  assert.equal(calculated.physicalSourceCount, 3);
  assert.deepEqual(
    calculated.sourceGroups.map(({ count }) => count),
    [1, 1, 1],
  );
  assert.equal(archived.physicalSourceCount, 9);
  assert.deepEqual(
    archived.sourceGroups.map(({ count }) => count),
    [1, 4, 4],
  );
  assert.equal(archived.analysisInput, null);
  assert.equal(t3.analysisInput, null);
  assert.equal(
    catalog.getFamily("cx3-dual-diaphragm-tapped-lf").analysisInput,
    null,
  );
  assert.equal(
    catalog.getFamily("h3-external-lf-shared-mid-high").analysisInput,
    null,
  );
  assert.equal(t3.manufacturingReadiness, false);
});

test("documented driver choices remain fixed and candidates stay unvalidated", () => {
  const t3 = catalog.getFamily("t3-conventional-two-wall");
  assert.equal(t3.driverSwitchingSupported, false);
  assert.equal(t3.resolvedDriverSelectionId, "cosyne-archived-original");
  assert.equal(t3.driverOptions.high[0].recordIdentity.model, "CDX1-1445");
  assert.equal(t3.driverOptions.mid[0].recordIdentity.model, "SP99023A");
  assert.equal(t3.driverOptions.low[0].recordIdentity.model, "NS6-255-8A");
  assert.ok(t3.driverOptions.low.some(({ status }) =>
    status === "author-listed-untried-candidate"));
  assert.ok(t3.driverOptions.low.every(({ selectable }) =>
    selectable === false));

  const cx3 = catalog.getFamily("cx3-dual-diaphragm-tapped-lf");
  assert.equal(cx3.driverOptions.mid[0].recordIdentity.model, "DCX464");
  assert.equal(cx3.driverOptions.high[0], cx3.driverOptions.mid[0]);
  assert.equal(cx3.driverOptions.low[0].recordIdentity.model, "10NW76");

  const h3 = catalog.getFamily("h3-external-lf-shared-mid-high");
  assert.deepEqual(h3.driverOptions, { low: [], mid: [], high: [] });
  assert.equal(h3.driverSelectionMode, "explicit-user-records-required");
});

test("complete T3 records pass topology, acoustic, mount, and identity checks only", () => {
  const result = catalog.evaluateDriverBindings(
    "t3-conventional-two-wall",
    t3Bindings(),
    { selectionId: "cosyne-archived-original" },
  );

  assert.equal(result.ok, true);
  assert.equal(result.topologyCompatible, true);
  assert.equal(result.acousticInputReady, true);
  assert.equal(result.mountInputReady, true);
  assert.equal(result.selectionMatched, true);
  assert.equal(result.exactGeometryPassed, false);
  assert.equal(result.manufacturingReadiness, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
  assert.deepEqual(result.diagnostics, []);
});

test("documented CX3 set requires one coupled throat record and two LF cones", () => {
  const result = catalog.evaluateDriverBindings(
    "cx3-dual-diaphragm-tapped-lf",
    cx3Bindings(),
    { selectionId: "hinson-documented-dcx464-10nw76" },
  );

  assert.equal(result.ok, true);
  assert.equal(result.topologyCompatible, true);
  assert.equal(result.acousticInputReady, true);
  assert.equal(result.mountInputReady, true);
  assert.equal(result.selectionMatched, true);
  assert.equal(result.manufacturingReadiness, false);
});

test("missing coupling, T-S, and mount evidence are typed readiness warnings", () => {
  const bindings = cx3Bindings();
  bindings["source-coax-mid-high"].record.limits = {};
  bindings["source-coax-mid-high"].record.mounting = {
    datum: "front-frame-plane",
  };
  bindings["source-low"].record.ts = {};

  const result = catalog.evaluateDriverBindings(
    "cx3-dual-diaphragm-tapped-lf",
    bindings,
  );
  assert.equal(result.ok, true);
  assert.equal(result.topologyCompatible, true);
  assert.equal(result.acousticInputReady, false);
  assert.equal(result.mountInputReady, false);
  assert.ok(result.diagnostics.some(({ code }) =>
    code === "THREEWAY_FAMILY_COUPLING_EVIDENCE_INCOMPLETE"));
  assert.ok(result.diagnostics.some(({ code }) =>
    code === "THREEWAY_FAMILY_ACOUSTIC_EVIDENCE_INCOMPLETE"));
  assert.ok(result.diagnostics.some(({ code }) =>
    code === "THREEWAY_FAMILY_MOUNT_EVIDENCE_INCOMPLETE"));
});

test("wrong count, kind, output, band, and selection identity fail closed", () => {
  const bindings = t3Bindings();
  bindings["source-mid"].count = 2;
  bindings["source-high"].record = cone({
    id: "wrong-high",
    manufacturer: "Not Celestion",
    model: "Wrong",
    bandIds: ["high"],
  });

  const result = catalog.evaluateDriverBindings(
    "t3-conventional-two-wall",
    bindings,
    { selectionId: "cosyne-archived-original" },
  );
  assert.equal(result.ok, false);
  assert.equal(result.topologyCompatible, false);
  assert.equal(result.manufacturingReadiness, false);
  for (const code of [
    "THREEWAY_FAMILY_DRIVER_COUNT_MISMATCH",
    "THREEWAY_FAMILY_DRIVER_KIND_UNSUPPORTED",
    "THREEWAY_FAMILY_DRIVER_OUTPUT_UNSUPPORTED",
    "THREEWAY_DRIVER_SELECTION_IDENTITY_MISMATCH",
  ]) {
    assert.ok(result.diagnostics.some((item) => item.code === code), code);
  }
});

test("external-LF H3 accepts explicit compatible records without product cloning", () => {
  const result = catalog.evaluateDriverBindings(
    "h3-external-lf-shared-mid-high",
    {
      "source-low-external": {
        count: 1,
        record: cone({
          id: "explicit-external-low",
          manufacturer: "User documented",
          model: "LF",
        }),
      },
      "source-mid": {
        count: 3,
        record: cone({
          id: "explicit-mid",
          manufacturer: "User documented",
          model: "MF",
          bandIds: ["mid"],
        }),
      },
      "source-high": {
        count: 1,
        record: compression({
          id: "explicit-high",
          manufacturer: "User documented",
          model: "HF",
        }),
      },
    },
  );
  assert.equal(result.ok, true);
  assert.equal(result.acousticInputReady, true);
  assert.equal(result.mountInputReady, true);
  assert.equal(result.manufacturingReadiness, false);
});

test("research architecture and unknown IDs return typed refusals", () => {
  const research = catalog.evaluateDriverBindings(
    "compound-combiner-research",
    {},
  );
  assert.equal(research.ok, false);
  assert.equal(research.code, "THREEWAY_FAMILY_NOT_SELECTABLE");
  assert.equal(research.manufacturingReadiness, false);

  const unknown = catalog.evaluateDriverBindings("not-a-family", {});
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, "THREEWAY_FAMILY_UNKNOWN");
  assert.equal(unknown.manufacturingReadiness, false);
});

test("catalog, records, and deterministic serialization are immutable", () => {
  const family = catalog.getFamily("t3-conventional-two-wall");
  const preset = catalog.getPreset("t3-calculated-111");
  assert.ok(Object.isFrozen(catalog));
  assert.ok(Object.isFrozen(family));
  assert.ok(Object.isFrozen(family.driverOptions.low));
  assert.ok(Object.isFrozen(preset));
  assert.ok(Object.isFrozen(preset.analysisInput.solidGeometry));

  const first = catalog.serializeCatalog();
  const second = catalog.serializeCatalog();
  assert.equal(first, second);
  assert.match(first, /^meh3-family-catalog-v1\n/);
  assert.equal(
    catalog.serializeFamily("not-a-family"),
    null,
  );
});
