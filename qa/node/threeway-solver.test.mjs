import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const solver = require(path.join(appRoot, "threeway-solver.js"));
const solidPlan = require(path.join(appRoot, "threeway-solid-plan.js"));
const solidGeometry = require(path.join(
  appRoot,
  "threeway-solid-geometry.js",
));
const solidIntentBuilder = require(path.join(
  appRoot,
  "threeway-solid-intent.js",
));
const stateContract = require(path.join(
  appRoot,
  "threeway-state-contract.js",
));

const ANALYSIS_HASH_PREFIX = "meh3-analysis-input-v1\n";

function analysisHash(api, value) {
  return ANALYSIS_HASH_PREFIX + api.stableStringify(value);
}

function stubState(kind = "T3", entryStations = [{}]) {
  return {
    schemaVersion: 2,
    designId: `stub-${kind.toLowerCase()}`,
    revision: 4,
    topology: { kind, schemaVersion: 1 },
    sources: [],
    entryStations,
    interfaces: [],
    rearSystems: [],
    provenance: { records: [] },
    research: { notes: [], referenceCardIds: [] },
  };
}

function stubHarness({
  topology = "T3",
  chamberReuse = false,
  renderDependencies = true,
} = {}) {
  const calls = [];
  const state = stubState(
    topology,
    topology === "H3" ? [] : [{ id: "station-low" }],
  );
  const physicalApertureIds = [
    "source-low/driver-01/aperture-01",
    "source-low/driver-01/aperture-02",
    "source-low/driver-02/aperture-01",
    "source-low/driver-02/aperture-02",
  ];
  const interfaces = [
    {
      id: "interface-01",
      chamber: { id: "chamber-01", volumeM3: 0.0004 },
    },
    {
      id: "interface-02",
      chamber: {
        id: chamberReuse ? "chamber-01" : "chamber-02",
        volumeM3: 0.0004,
      },
    },
  ];
  const phase = name => {
    calls.push(name);
  };
  const skipped = name => () => {
    throw new Error(`${name} must be skipped`);
  };
  const dependencies = {
    stateContract: {
      normalizeThreeWayState(value) {
        phase("state");
        return {
          valid: true,
          state,
          hashInput: "state-hash",
          diagnostics: [],
        };
      },
    },
    driverDb: {
      createDriverRegistry(records) {
        phase("driver-registry");
        return { ok: true, canonical: JSON.stringify(records), diagnostics: [] };
      },
      resolveSourceDrivers() {
        phase("drivers");
        return {
          ok: true,
          sources: [
            {
              sourceId: "source-low",
              count: 2,
              driver: { id: "driver-low" },
            },
          ],
          diagnostics: [],
          manufacturing: false,
        };
      },
    },
    hornSurface: {
      solveHornSurface() {
        phase("horn");
        return {
          ok: true,
          kind: "threeway-horn-surface",
          surfaceHash: "surface-stub",
          stations: [
            {
              axialM: 0,
              section: { widthM: 0.04, heightM: 0.04 },
            },
            {
              axialM: 0.2,
              section: { widthM: 0.4, heightM: 0.3 },
            },
          ],
          diagnostics: [],
          manufacturing: false,
        };
      },
    },
    stationSolver: {
      solveEntryStations: topology === "H3"
        ? skipped("stations")
        : () => {
            phase("stations");
            return {
              ok: true,
              result: {
                selectedEntryStations: [
                  { stationId: "station-low", sourceCount: 2 },
                ],
              },
              diagnostics: [],
              hashInput: "stations-stub",
              manufacturing: false,
            };
          },
    },
    apertureSolver: {
      solveApertureLayout: topology === "H3"
        ? skipped("apertures")
        : () => {
            phase("apertures");
            return {
              ok: true,
              sourceOrder: ["source-low"],
              sources: [],
              diagnostics: [],
              hashInput: "apertures-stub",
              manufacturing: false,
            };
          },
    },
    chamberSolver: {
      solveFrontChamberNetwork: topology === "H3"
        ? skipped("chambers")
        : () => {
            phase("chambers");
            return {
              ok: true,
              chambers: (chamberReuse
                ? ["chamber-01"]
                : ["chamber-01", "chamber-02"]).map(id => ({
                record: { id, volumeM3: 0.0004 },
              })),
              diagnostics: [],
              hashInput: "chambers-stub",
              manufacturing: false,
            };
          },
    },
    interfacePlanner: {
      planInterfaces: topology === "H3"
        ? skipped("interfaces")
        : () => {
            phase("interfaces");
            return {
              ok: true,
              result: {
                apertureLayouts: [
                  {
                    layoutId: "layout-driver-01",
                    driverInstanceId: "source-low/driver-01",
                    selectedCandidateId: "candidate-count-2",
                    apertures: physicalApertureIds.slice(0, 2).map(
                      (id, index) => ({
                        id,
                        templateApertureId: `template-${index + 1}`,
                      }),
                    ),
                  },
                  {
                    layoutId: "layout-driver-02",
                    driverInstanceId: "source-low/driver-02",
                    selectedCandidateId: "candidate-count-2",
                    apertures: physicalApertureIds.slice(2).map(
                      (id, index) => ({
                        id,
                        templateApertureId: `template-${index + 1}`,
                      }),
                    ),
                  },
                ],
                driverChamberInterfaces: interfaces,
                mountPlans: [],
                mountApertureResult: { ok: true, sources: [] },
                manufacturing: false,
              },
              diagnostics: [],
              hashInput: "interfaces-stub",
              manufacturing: false,
            };
          },
    },
    passageSolver: {
      solveCanonicalPassages: topology === "H3"
        ? skipped("passages")
        : input => {
            phase("passages");
            assert.deepEqual(
              input.apertureLayouts.flatMap(layout =>
                layout.apertures.map(item => item.id)),
              physicalApertureIds,
            );
            return {
              ok: true,
              result: {
                passages: physicalApertureIds.map(id => ({
                  id: `passage:${id}`,
                  apertureId: id,
                  manufacturing: false,
                })),
                exactSolid: false,
                manufacturing: false,
                stl: false,
              },
              diagnostics: [],
              hashInput: "passages-stub",
              manufacturing: false,
              stl: false,
            };
          },
    },
    mountSolver: {
      solveSourceMounts: topology === "H3"
        ? skipped("mounts")
        : input => {
            phase("mounts");
            assert.deepEqual(
              input.passageResult.result.passages.map(item => item.apertureId),
              physicalApertureIds,
            );
            return {
              ok: true,
              result: {
                kind: "threeway-source-instance-mount-solution",
                mounts: ["01", "02"].map(id => ({
                  id: `mount-host:source-low/driver-${id}`,
                  instanceId: `source-low/driver-${id}`,
                  sourceId: "source-low",
                  manufacturing: false,
                })),
                manufacturing: false,
                stl: false,
              },
              diagnostics: [],
              hashInput: "mounts-stub",
              manufacturing: false,
              stl: false,
            };
          },
    },
    packageInput: {
      buildPackageInput(input) {
        phase("package-input");
        assert.equal(input.inputHash, "state-hash");
        assert.equal(
          input.mountResult.result.kind,
          "threeway-source-instance-mount-solution",
        );
        return {
          ok: true,
          result: { derived: true, manufacturing: false },
          packageInput: {
            horn: {
              id: "horn:surface-stub",
              boundsM: {
                minM: [0, -0.2, -0.15],
                maxM: [0.2, 0.2, 0.15],
              },
            },
            components: [],
            packageLimitM: { depthM: 1, widthM: 1, heightM: 1 },
            globalMarginM: 0,
          },
          diagnostics: [],
          hashInput: "package-input-stub",
          manufacturing: false,
          stl: false,
        };
      },
    },
    packageSolver: {
      solvePackageEnvelope(input) {
        phase("package");
        assert.equal(calls.at(-2), "package-input");
        assert.equal(input.horn.id, "horn:surface-stub");
        return {
          ok: true,
          result: {
            kind: "threeway-package-envelope",
            fit: true,
            manufacturing: false,
          },
          diagnostics: [],
          hashInput: "package-stub",
          manufacturing: false,
          stl: false,
        };
      },
    },
    coupledNetwork: {
      solveCoupledThreeSourceAtFrequency() {
        phase("coupled-network");
        return {
          ok: true,
          frequencyHz: 500,
          manufacturing: false,
        };
      },
    },
    analysisExport: {
      buildAnalysisReport(input) {
        phase("analysis-report");
        assert.equal(input.solution.inputHash, "state-hash");
        return {
          ok: true,
          reportKind: "stub-analysis",
          manufacturing: false,
          stl: false,
        };
      },
    },
    renderAssembly: renderDependencies
      ? {
          assembleRenderGeometry() {
            phase("render-assembly");
            return { ok: false, diagnostics: [] };
          },
        }
      : null,
    renderModel: renderDependencies
      ? {
          buildRenderModel() {
            phase("render-model");
            return { ok: false, diagnostics: [] };
          },
        }
      : null,
  };
  const api = solver.createSolver(dependencies);
  const analysisInput = {
    driverRecords: [],
    horn: {},
    stations: {},
    apertures: {},
    chambers: {},
    placementPlans: [],
    interfaceValidation: {},
    passages: {},
    mountValidation: {},
    package: {
      packageLimitM: { depthM: 1, widthM: 1, heightM: 1 },
      globalMarginM: 0,
      componentClearanceM: 0,
    },
  };
  return {
    api,
    calls,
    state,
    analysisInput,
    physicalApertureIds,
    dependencies,
  };
}

function requestFor(api, state, analysisInput, overrides = {}) {
  return {
    schemaVersion: 1,
    requestId: "solve-001",
    revision: 4,
    inputHash: "state-hash",
    analysisInputHash: analysisHash(api, analysisInput),
    state,
    analysisInput,
    ...overrides,
  };
}

test("default dependencies load and expose only analysis authority", () => {
  assert.equal(solver.version, 1);
  assert.equal(solver.schemaVersion, 2);
  assert.equal(typeof solver.solveThreeWay, "function");
  assert.equal(solver.capabilities.analysisJson, true);
  assert.equal(solver.capabilities.exactSolid, false);
  assert.equal(solver.capabilities.manufacturing, false);
  assert.equal(solver.capabilities.stl, false);
  const preflight = solver.manufacturingPreflight("stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.exactSolid, false);
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
});

test("stubbed T3 phases preserve physical aperture identity and package ordering", () => {
  const fixture = stubHarness();
  const result = fixture.api.solveThreeWay(requestFor(
    fixture.api,
    fixture.state,
    fixture.analysisInput,
  ));
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  assert.deepEqual(
    result.solution.apertureLayouts.flatMap(layout =>
      layout.apertures.map(item => item.id)),
    fixture.physicalApertureIds,
  );
  assert.deepEqual(
    result.solution.passages.map(item => item.apertureId),
    fixture.physicalApertureIds,
  );
  assert.equal(result.solution.mounts.length, 2);
  assert.ok(
    fixture.calls.indexOf("package-input") <
      fixture.calls.indexOf("package"),
  );
  assert.equal(result.solution.manufacturing, false);
  assert.equal(result.solution.stl, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.solution), true);
});

test("controller identity and analysis payload hashes fail closed", () => {
  const fixture = stubHarness();
  const missingId = requestFor(
    fixture.api,
    fixture.state,
    fixture.analysisInput,
  );
  delete missingId.requestId;
  const absent = fixture.api.solveThreeWay(missingId);
  assert.equal(absent.ok, false);
  assert.equal(
    absent.code,
    fixture.api.failureCodes.INPUT_INVALID,
  );

  const mismatch = fixture.api.solveThreeWay(requestFor(
    fixture.api,
    fixture.state,
    fixture.analysisInput,
    { analysisInputHash: "stale-analysis" },
  ));
  assert.equal(mismatch.ok, false);
  assert.equal(
    mismatch.code,
    fixture.api.failureCodes.ANALYSIS_INPUT_HASH_MISMATCH,
  );
  assert.equal(mismatch.manufacturing, false);
  assert.equal(mismatch.stl, false);
});

test("controller and solver canonicalize the same physical-analysis hash", () => {
  const fixture = stubHarness();
  assert.equal(
    fixture.api.stableStringify(fixture.analysisInput),
    stateContract.stableStringify(fixture.analysisInput),
  );
  const reordered = {
    package: fixture.analysisInput.package,
    mountValidation: {},
    passages: {},
    interfaceValidation: {},
    placementPlans: [],
    chambers: {},
    apertures: {},
    stations: {},
    horn: {},
    driverRecords: [],
  };
  assert.equal(
    analysisHash(fixture.api, reordered),
    analysisHash(fixture.api, fixture.analysisInput),
  );
});

test("typed upstream phase failures stop before downstream geometry", () => {
  const fixture = stubHarness();
  const api = solver.createSolver({
    ...fixture.dependencies,
    apertureSolver: {
      solveApertureLayout() {
        fixture.calls.push("apertures");
        return {
          ok: false,
          code: "THREEWAY_APERTURE_EXPLICIT_REFUSAL",
          diagnostics: [
            {
              code: "THREEWAY_APERTURE_EXPLICIT_REFUSAL",
              severity: "error",
              paths: ["sources[0]"],
              message: "Explicit aperture fixture refusal.",
              details: {},
            },
          ],
          manufacturing: false,
        };
      },
    },
  });
  const result = api.solveThreeWay(requestFor(
    api,
    fixture.state,
    fixture.analysisInput,
  ));
  assert.equal(result.ok, false);
  assert.equal(result.code, "THREEWAY_APERTURE_EXPLICIT_REFUSAL");
  assert.equal(fixture.calls.includes("interfaces"), false);
  assert.equal(fixture.calls.includes("package-input"), false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});

test("an upstream positive fabrication claim poisons the transaction", () => {
  const fixture = stubHarness();
  const api = solver.createSolver({
    ...fixture.dependencies,
    packageSolver: {
      solvePackageEnvelope() {
        fixture.calls.push("package");
        return {
          ok: true,
          result: {
            kind: "forbidden-package",
            manufacturing: true,
          },
          diagnostics: [],
          manufacturing: true,
          stl: false,
        };
      },
    },
  });
  const result = api.solveThreeWay(requestFor(
    api,
    fixture.state,
    fixture.analysisInput,
  ));
  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    api.failureCodes.PREMATURE_AUTHORITY,
  );
  assert.equal(result.solution, null);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});

test("one solved chamber cannot be reused by multiple physical interfaces", () => {
  const fixture = stubHarness({ chamberReuse: true });
  const result = fixture.api.solveThreeWay(requestFor(
    fixture.api,
    fixture.state,
    fixture.analysisInput,
  ));
  assert.equal(result.ok, false);
  assert.equal(result.code, fixture.api.failureCodes.CHAMBER_MISMATCH);
  assert.equal(fixture.calls.includes("passages"), false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});

test("rendering is optional and missing render adapters degrade to a warning", () => {
  const fixture = stubHarness({ renderDependencies: false });
  fixture.analysisInput.render = {
    renderIntents: {
      throat: { kind: "throat" },
      stations: [],
      sections: [],
    },
    azimuthSegments: 32,
  };
  const result = fixture.api.solveThreeWay(requestFor(
    fixture.api,
    fixture.state,
    fixture.analysisInput,
  ));
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  assert.equal(result.renderModel, null);
  assert.equal(result.readiness.preview, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === fixture.api.failureCodes.RENDER_UNAVAILABLE));
  assert.equal(result.manufacturing, false);
});

test("H3 skips every wall-entry phase and keeps direct arrays empty", () => {
  const fixture = stubHarness({ topology: "H3" });
  const result = fixture.api.solveThreeWay(requestFor(
    fixture.api,
    fixture.state,
    fixture.analysisInput,
  ));
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  assert.deepEqual(result.solution.entryStations, []);
  assert.deepEqual(result.solution.apertureLayouts, []);
  assert.deepEqual(result.solution.driverChamberInterfaces, []);
  assert.deepEqual(result.solution.chambers, []);
  assert.deepEqual(result.solution.passages, []);
  assert.deepEqual(result.solution.mounts, []);
  for (const phase of [
    "stations", "apertures", "chambers",
    "interfaces", "passages", "mounts",
  ]) assert.equal(fixture.calls.includes(phase), false);
  assert.equal(result.solution.manufacturing, false);
  assert.equal(result.solution.stl, false);
});

function coneDriver() {
  return {
    schemaVersion: 1,
    id: "driver-low-real",
    revision: 1,
    kind: "cone",
    bandIds: ["low"],
    frame: {
      shape: "round",
      diameterM: 0.2,
      depthM: 0.1,
      frontProjectionM: 0.003,
    },
    diaphragm: {
      effectiveAreaM2: 0.02,
      activeDiameterM: 0.17,
      provenanceRefs: ["real-test-datasheet"],
    },
    outputs: [
      {
        id: "cone-front",
        bandIds: ["low"],
        kind: "front-diaphragm",
        geometry: {
          shape: "round",
          diameterM: 0.17,
          areaM2: 0.02,
        },
        acousticDatum: { kind: "diaphragm", offsetM: 0.02 },
        provenanceRefs: ["real-test-datasheet"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["real-test-datasheet"],
    },
    provenanceRefs: ["real-test-datasheet"],
  };
}

function sharedThroatDriver() {
  return {
    schemaVersion: 1,
    id: "driver-mid-high-real",
    revision: 1,
    kind: "dual-diaphragm",
    bandIds: ["mid", "high"],
    frame: {
      shape: "round",
      diameterM: 0.16,
      depthM: 0.12,
    },
    diaphragm: {
      effectiveAreaM2: 0.01,
      activeDiameterM: 0.11,
      provenanceRefs: ["real-test-datasheet"],
    },
    outputs: [
      {
        id: "shared-throat",
        bandIds: ["mid", "high"],
        kind: "coaxial-throat",
        geometry: {
          shape: "round",
          diameterM: 0.04,
          areaM2: Math.PI * 0.02 ** 2,
        },
        acousticDatum: {
          kind: "manufacturer-reference-plane",
          offsetM: 0.06,
        },
        provenanceRefs: ["real-test-datasheet"],
      },
    ],
    provenanceRefs: ["real-test-datasheet"],
  };
}

function realH3State() {
  return {
    schemaVersion: 2,
    designId: "real-h3-composition",
    revision: 1,
    topology: { kind: "H3", schemaVersion: 1 },
    intent: {
      crossoversHz: { lowMid: 300, midHigh: 1200 },
      mouthLimitM: { width: 0.6, height: 0.6 },
    },
    horn: {
      surfaceLaw: {
        family: "conical",
        parameters: { nominalHalfAngle: Math.PI / 4 },
      },
      mouth: { widthM: 0.4, heightM: 0.4 },
    },
    sources: [
      {
        id: "src-low-external",
        driverRef: "driver-low-real",
        bandIds: ["low"],
        role: "external-to-shared-horn",
        count: 2,
        provenanceRefs: ["real-test-datasheet"],
      },
      {
        id: "src-mid-high",
        driverRef: "driver-mid-high-real",
        bandIds: ["mid", "high"],
        role: "throat-module",
        count: 1,
        provenanceRefs: ["real-test-datasheet"],
      },
    ],
    interfaces: [
      {
        id: "if-mid-high",
        kind: "shared-throat",
        sourceIds: ["src-mid-high"],
        bandIds: ["mid", "high"],
        geometry: {
          shape: "round",
          areaM2: Math.PI * 0.02 ** 2,
        },
        provenanceRefs: ["real-test-datasheet"],
      },
    ],
    entryStations: [],
    rearSystems: [],
    provenance: {
      records: [
        {
          id: "real-test-datasheet",
          classification: "documented",
          sourceUrl: "https://example.test/real-h3-driver",
          valuePaths: [
            "sources[src-low-external].driverRef",
            "sources[src-mid-high].driverRef",
          ],
        },
      ],
    },
    research: { notes: [], referenceCardIds: [] },
  };
}

test("real default modules compose a complete H3 analysis transaction", () => {
  const stateResult = stateContract.normalizeThreeWayState(realH3State());
  assert.equal(stateResult.valid, true, stateResult.diagnostics?.[0]?.message);
  const analysisInput = {
    driverRecords: [coneDriver(), sharedThroatDriver()],
    horn: {
      schemaVersion: 2,
      throat: { widthM: 0.04, heightM: 0.04 },
      mouth: { widthM: 0.4, heightM: 0.4 },
      depthM: 0.18,
      coverageDeg: { horizontal: 90, vertical: 90 },
      surfaceLaw: {
        family: "conical",
        parameters: { nominalHalfAngle: Math.PI / 4 },
      },
      crossSection: { family: "ellipse", parameters: {} },
      azimuthRad: 0,
      sampling: {
        axialStationCount: 33,
        perimeterSampleCount: 256,
      },
      provenanceRefs: ["real-solver-composition-test"],
    },
    package: {
      packageLimitM: { depthM: 1, widthM: 1, heightM: 1 },
      globalMarginM: 0,
      componentClearanceM: 0,
      additionalComponents: [],
    },
  };
  const result = solver.solveThreeWay({
    schemaVersion: 1,
    requestId: "real-h3-solve",
    revision: 1,
    inputHash: stateResult.hashInput,
    analysisInputHash: analysisHash(solver, analysisInput),
    state: stateResult.state,
    analysisInput,
    build: "solver-test",
  });
  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
  assert.equal(result.solution.topology.kind, "H3");
  assert.equal(result.solution.resolvedDrivers.length, 2);
  assert.equal(result.solution.hornSurface.kind, "threeway-horn-surface");
  assert.deepEqual(result.solution.entryStations, []);
  assert.deepEqual(result.solution.passages, []);
  assert.deepEqual(result.solution.mounts, []);
  assert.equal(result.readiness.analysis, true);
  assert.equal(result.readiness.analysisJson, true);
  assert.equal(result.readiness.preview, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
  assert.equal(result.analysisReport.ok, true);
});

function t3WallDriver(id, bandId, effectiveAreaM2, activeDiameterM) {
  return {
    schemaVersion: 1,
    id,
    revision: 1,
    kind: "cone",
    bandIds: [bandId],
    frame: {
      shape: "round",
      diameterM: activeDiameterM + 0.02,
      depthM: 0.07,
      frontProjectionM: 0.002,
    },
    diaphragm: {
      effectiveAreaM2,
      activeDiameterM,
      geometry: { shape: "round", centerOffsetM: [0, 0] },
      provenanceRefs: ["t3-composition-datasheet"],
    },
    outputs: [
      {
        id: `${bandId}-front`,
        bandIds: [bandId],
        kind: "front-diaphragm",
        geometry: {
          shape: "round",
          diameterM: activeDiameterM,
          areaM2: effectiveAreaM2,
        },
        acousticDatum: {
          kind: "front-chamber-boundary",
          offsetM: 0.012,
        },
        provenanceRefs: ["t3-composition-datasheet"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["t3-composition-datasheet"],
    },
    provenanceRefs: ["t3-composition-datasheet"],
  };
}

function t3HighDriver() {
  return {
    schemaVersion: 1,
    id: "driver-high-real",
    revision: 1,
    kind: "compression",
    bandIds: ["high"],
    frame: {
      shape: "round",
      diameterM: 0.12,
      depthM: 0.1,
      frontProjectionM: 0.002,
    },
    diaphragm: {
      effectiveAreaM2: 0.0012,
      activeDiameterM: 0.04,
      provenanceRefs: ["t3-composition-datasheet"],
    },
    outputs: [
      {
        id: "high-throat",
        bandIds: ["high"],
        kind: "compression-throat",
        geometry: {
          shape: "round",
          diameterM: 0.04,
          areaM2: Math.PI * 0.02 ** 2,
        },
        acousticDatum: {
          kind: "manufacturer-reference-plane",
          offsetM: 0.05,
        },
        provenanceRefs: ["t3-composition-datasheet"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["t3-composition-datasheet"],
    },
    provenanceRefs: ["t3-composition-datasheet"],
  };
}

function realT3State() {
  return {
    schemaVersion: 2,
    designId: "real-t3-composition",
    revision: 1,
    topology: { kind: "T3", schemaVersion: 1 },
    intent: {
      crossoversHz: { lowMid: 300, midHigh: 1200 },
      mouthLimitM: { width: 0.8, height: 0.8 },
    },
    horn: {
      surfaceLaw: {
        family: "conical",
        parameters: { nominalHalfAngle: Math.PI / 4 },
      },
      mouth: { widthM: 0.64, heightM: 0.64 },
    },
    sources: [
      {
        id: "src-high",
        driverRef: "driver-high-real",
        bandIds: ["high"],
        role: "throat-source",
        count: 1,
        provenanceRefs: [],
      },
      {
        id: "src-low",
        driverRef: "driver-low-t3-real",
        bandIds: ["low"],
        role: "wall-source",
        count: 1,
        provenanceRefs: [],
      },
      {
        id: "src-mid",
        driverRef: "driver-mid-t3-real",
        bandIds: ["mid"],
        role: "wall-source",
        count: 1,
        provenanceRefs: [],
      },
    ],
    interfaces: [
      {
        id: "if-high",
        kind: "throat",
        sourceIds: ["src-high"],
        bandIds: ["high"],
        geometry: {
          shape: "round",
          areaM2: Math.PI * 0.02 ** 2,
        },
        provenanceRefs: [],
      },
    ],
    entryStations: [
      {
        id: "station-mid",
        role: "wall-entry",
        sourceIds: ["src-mid"],
        bandIds: ["mid"],
        order: 1,
        provenanceRefs: [],
      },
      {
        id: "station-low",
        role: "wall-entry",
        sourceIds: ["src-low"],
        bandIds: ["low"],
        order: 2,
        provenanceRefs: [],
      },
    ],
    rearSystems: [],
    provenance: { records: [] },
    research: { notes: [], referenceCardIds: [] },
  };
}

function apertureSource({
  sourceId,
  effectiveAreaM2,
  apertureAreaM2,
  activeDiameterM,
  upperFrequencyHz,
}) {
  return {
    sourceId,
    candidatePolicy: "enumerate-all-declared-counts",
    allowedCounts: [2],
    driverEffectiveAreaM2: effectiveAreaM2,
    areaPolicy: {
      mode: "target",
      summedAreaTargetM2: apertureAreaM2,
    },
    compressionRatioBounds: { minimum: 10, maximum: 20 },
    host: {
      id: `${sourceId}-active-cone`,
      role: "active-cone",
      shape: "circle",
      radiusM: activeDiameterM / 2,
    },
    apertureShape: { kind: "racetrack", lengthToWidthRatio: 3 },
    limits: {
      minimumWebM: 0.003,
      minimumEdgeM: 0.003,
      maximumApertureLongAxisM: 0.04,
      maximumApertureShortAxisM: 0.02,
    },
    orientationPolicy: {
      mode: "driver-local-parallel",
      angleRad: 0,
    },
    placementPolicy: {
      family: "symmetric-line",
      axisAngleRad: Math.PI / 2,
      spacingMode: "explicit-center-spacing",
      centerSpacingM: 0.035,
    },
    upperFrequencyHz,
    speedOfSoundMps: 343,
    wavelengthSpacingPolicy: "warn",
    provenance: {
      classification: "calculated-adaptation",
      evidenceRefs: ["t3-composition-aperture"],
    },
  };
}

function stationRequirement(
  stationId,
  sourceId,
  bandId,
  requestedM,
) {
  return {
    stationId,
    bandIds: [bandId],
    sourceIds: [sourceId],
    sourceCount: 1,
    legalIntervalM: {
      minimum: Math.max(0, requestedM - 0.08),
      maximum: Math.min(0.3, requestedM + 0.08),
    },
    selectionMode: "documented-lock",
    requestedM,
    requiredAxialSpanM: 0.12,
    requiredCircumferentialSpanPerSourceM: 0.14,
    minimumCircumferentialGapM: 0.006,
    minimumAxialGapM: 0.02,
    distribution: "rotational",
  };
}

function placementPlan({
  sourceId,
  stationId,
  bandId,
  outputId,
  activeDiameterM,
  chamberId,
  chamberVolumeM3,
}) {
  return {
    sourceId,
    stationId,
    bandId,
    driverOutputId: outputId,
    apertureCandidateId: `${sourceId}/candidate-count-2`,
    mountSetbackM: 0.06,
    distributionFamily: "rotational",
    axisPolicy: { kind: "wall-normal", normalSign: -1 },
    diagnosticFrequencyHz: 1000,
    maximumAllowedSpreadM: 0.005,
    referencePathToDatumM: 0.3,
    pathDatumId: "mouth-reference-plane",
    pathSettings: {
      family: "straight",
      representation: "collinear-endpoint-tangents",
      curvedAllowed: false,
      samples: 9,
      driverTangentScaleM: 0.02,
      hornTangentScaleM: 0.02,
      upHintPolicy: "driver-face-u",
      sectionPolicy: "selected-aperture-exact-constant",
      effectiveAreaPolicy: "selected-aperture-area",
      areaProgression: "constant",
      areaProgressionTolerance: 1e-8,
      sectionSegments: 32,
      driverAxisToleranceDeg: 1,
      hornCrossingMinimumDeg: 15,
      provenanceRefs: ["t3-composition-path"],
    },
    construction: {
      mode: "integrated-solid",
      host: { thicknessM: 0.01, edgeExtensionM: 0.004 },
      activeConeEnvelope: {
        shape: "round",
        diameterM: activeDiameterM,
        centerOffsetM: [0, 0],
        provenanceRefs: ["t3-composition-datasheet"],
      },
      constraints: {
        axisToleranceDeg: 1,
        minimumWebM: 0.003,
        minimumEdgeM: 0.003,
        datumToleranceM: 1e-7,
      },
      inspection: { segments: 32 },
    },
    instances: [
      {
        id: `${sourceId}/driver-01`,
        azimuthRad: 0,
        axialOffsetM: 0,
        panelId: null,
        chamber: {
          id: chamberId,
          volumeM3: chamberVolumeM3,
          provenanceRefs: ["t3-composition-chamber"],
        },
        upstreamPathToDriverEndpointM: 0.012,
        downstreamPathFromHornEndpointToDatumM: 0.2,
        auxiliaryNegatives: [],
        provenanceRefs: ["t3-composition-instance"],
      },
    ],
    panels: [],
    provenanceRefs: ["t3-composition-plan"],
  };
}

test("real T3 solve emits deterministic canonical solid intent accepted by the solid planner", () => {
  const normalized = stateContract.normalizeThreeWayState(realT3State());
  assert.equal(normalized.valid, true, normalized.diagnostics?.[0]?.message);
  const lowArea = 0.007;
  const midArea = 0.004;
  const lowApertureArea = 0.0005;
  const midApertureArea = 0.0003;
  const chamberVolumeM3 = 0.0004;
  const analysisInput = {
    solidGeometry: {
      schemaVersion: 1,
      constructionId: "t3-calculated-two-wall-v1",
      mode: "integrated-solid",
      wallThicknessM: 0.012,
      throatCollarLengthM: 0.025,
      lumenWallOvershootM: 0.003,
      lumenChamberOverlapM: 0.004,
      minimumPrintableWebM: 0.003,
      meshClearanceM: 0.0004,
      booleanToleranceM: 1e-5,
      inspection: { perimeterSegments: 96 },
      provenance: {
        classification: "calculated-design-intent",
        evidenceRefs: ["t3-composition-solid-geometry"],
      },
    },
    driverRecords: [
      t3WallDriver("driver-low-t3-real", "low", lowArea, 0.1),
      t3WallDriver("driver-mid-t3-real", "mid", midArea, 0.08),
      t3HighDriver(),
    ],
    horn: {
      schemaVersion: 2,
      throat: { widthM: 0.04, heightM: 0.04 },
      mouth: { widthM: 0.64, heightM: 0.64 },
      depthM: 0.3,
      coverageDeg: { horizontal: 90, vertical: 90 },
      surfaceLaw: {
        family: "conical",
        parameters: { nominalHalfAngle: Math.PI / 4 },
      },
      crossSection: { family: "ellipse", parameters: {} },
      azimuthRad: 0,
      sampling: {
        axialStationCount: 33,
        perimeterSampleCount: 256,
      },
      provenanceRefs: ["t3-composition-horn"],
    },
    stations: {
      stationRequirements: [
        stationRequirement("station-mid", "src-mid", "mid", 0.06),
        stationRequirement("station-low", "src-low", "low", 0.24),
      ],
      optimization: "balanced",
    },
    apertures: {
      sources: [
        apertureSource({
          sourceId: "src-low",
          effectiveAreaM2: lowArea,
          apertureAreaM2: lowApertureArea,
          activeDiameterM: 0.1,
          upperFrequencyHz: 500,
        }),
        apertureSource({
          sourceId: "src-mid",
          effectiveAreaM2: midArea,
          apertureAreaM2: midApertureArea,
          activeDiameterM: 0.08,
          upperFrequencyHz: 1500,
        }),
      ],
    },
    chambers: {
      chambers: [
        {
          id: "chamber-low-01",
          sourceId: "src-low",
          stationId: "station-low",
          bandIds: ["low"],
          sourceCount: 1,
          driverEffectiveAreaM2: lowArea,
          summedApertureAreaM2: lowApertureArea,
          air: { densityKgM3: 1.204, speedOfSoundMps: 343 },
          passage: { physicalLengthM: 0.04, endCorrectionM: 0.01 },
          volumePolicy: {
            mode: "explicit",
            volumeM3: chamberVolumeM3,
          },
          volumeBoundsM3: { minimum: 0.0002, maximum: 0.001 },
          resonancePolicy: { minimumAllowedHz: 300, action: "warn" },
          provenanceRefs: ["t3-composition-chamber"],
        },
        {
          id: "chamber-mid-01",
          sourceId: "src-mid",
          stationId: "station-mid",
          bandIds: ["mid"],
          sourceCount: 1,
          driverEffectiveAreaM2: midArea,
          summedApertureAreaM2: midApertureArea,
          air: { densityKgM3: 1.204, speedOfSoundMps: 343 },
          passage: { physicalLengthM: 0.035, endCorrectionM: 0.008 },
          volumePolicy: {
            mode: "explicit",
            volumeM3: chamberVolumeM3,
          },
          volumeBoundsM3: { minimum: 0.0002, maximum: 0.001 },
          resonancePolicy: { minimumAllowedHz: 600, action: "warn" },
          provenanceRefs: ["t3-composition-chamber"],
        },
      ],
    },
    placementPlans: [
      placementPlan({
        sourceId: "src-low",
        stationId: "station-low",
        bandId: "low",
        outputId: "low-front",
        activeDiameterM: 0.1,
        chamberId: "chamber-low-01",
        chamberVolumeM3,
      }),
      placementPlan({
        sourceId: "src-mid",
        stationId: "station-mid",
        bandId: "mid",
        outputId: "mid-front",
        activeDiameterM: 0.08,
        chamberId: "chamber-mid-01",
        chamberVolumeM3,
      }),
    ],
    interfaceValidation: {
      positionToleranceM: 1e-7,
      sectionToleranceM: 1e-9,
      angleToleranceDeg: 0.01,
      azimuthToleranceRad: 1e-7,
      minimumDriverClearanceM: 0.005,
    },
    passages: {
      acoustics: {
        densityKgM3: 1.2,
        speedOfSoundMps: 343,
        quarterWaveBoundaryAssumption: "one-end-closed-one-end-open",
        halfWaveBoundaryAssumption: "both-ends-open",
        provenance: {
          classification: "calculated-adaptation",
          evidenceRefs: ["t3-composition-acoustics"],
        },
      },
    },
    mountValidation: {
      positionToleranceM: 1e-7,
      sectionToleranceM: 1e-9,
      angleToleranceDeg: 0.01,
      azimuthToleranceRad: 1e-7,
      minimumDriverClearanceM: 0.005,
    },
    package: {
      packageLimitM: { depthM: 1, widthM: 1, heightM: 1 },
      globalMarginM: 0,
      componentClearanceM: 0,
      additionalComponents: [],
    },
  };
  const result = solver.solveThreeWay({
    schemaVersion: 1,
    requestId: "real-t3-solve",
    revision: 1,
    inputHash: normalized.hashInput,
    analysisInputHash: analysisHash(solver, analysisInput),
    state: normalized.state,
    analysisInput,
    build: "solver-test",
  });
  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
  assert.equal(result.solution.topology.kind, "T3");
  assert.equal(result.solution.entryStations.length, 2);
  assert.equal(result.solution.apertureLayouts.length, 2);
  assert.equal(result.solution.passages.length, 4);
  assert.equal(result.solution.mounts.length, 2);
  assert.equal(
    new Set(result.solution.passages.map(item => item.apertureId)).size,
    4,
  );
  assert.equal(result.readiness.analysis, true);
  assert.equal(result.readiness.analysisJson, true);
  assert.equal(
    result.readiness.solidPlanInput,
    true,
    JSON.stringify(
      solidGeometry.buildClosedSolidGeometry({
        physicsSolution: result.solution,
        solidGeometry: analysisInput.solidGeometry,
      }).diagnostics,
      null,
      2,
    ),
  );
  assert.ok(result.solution.solidIntent);
  assert.equal(
    result.solution.solidIntent.hornOperandStatus,
    "closed-material-shell",
  );
  assert.equal(result.solution.solidIntent.invariants.booleanExecuted, false);
  assert.equal(result.solution.solidIntent.invariants.exactSolid, false);
  assert.equal(result.solution.solidIntent.invariants.manufacturing, false);
  assert.equal(result.solution.solidIntent.invariants.stl, false);
  for (const collection of [
    result.solution.entryStations,
    result.solution.apertureLayouts,
    result.solution.chambers,
    result.solution.passages,
    result.solution.mounts,
  ]) {
    for (const record of collection) {
      assert.equal(record.inputHash, result.inputHash);
      assert.equal(record.solutionHash, result.solution.solutionHash);
    }
  }
  const plan = solidPlan.buildSolidPlan({
    physicsSolution: result.solution,
  });
  assert.equal(
    plan.ok,
    true,
    JSON.stringify(plan.diagnostics, null, 2),
  );
  assert.equal(plan.solutionHash, result.solution.solutionHash);
  assert.equal(plan.result.counts.hornShells, 1);
  assert.equal(plan.result.counts.throatInterfaces, 1);
  assert.equal(plan.result.counts.mountHosts, 2);
  assert.equal(plan.result.counts.mountAdapters, 2);
  assert.equal(plan.result.counts.acousticLumenNegatives, 4);
  assert.equal(plan.result.invariants.closedOperandAuditsPassed, true);
  assert.equal(plan.result.invariants.passageSolidMeshesPreserved, true);
  assert.equal(plan.result.invariants.oneSolidAdapterPerMount, true);
  assert.equal(plan.result.invariants.eachAcousticNegativeSubtractedOnce, true);
  assert.equal(plan.booleanExecuted, false);
  assert.equal(plan.exactSolid, false);
  assert.equal(plan.manufacturing, false);
  assert.equal(plan.stl, false);

  const repeated = solver.solveThreeWay({
    schemaVersion: 1,
    requestId: "real-t3-solve-repeat",
    revision: 1,
    inputHash: normalized.hashInput,
    analysisInputHash: analysisHash(solver, analysisInput),
    state: normalized.state,
    analysisInput,
    build: "solver-test",
  });
  assert.equal(
    repeated.ok,
    true,
    JSON.stringify(repeated.diagnostics, null, 2),
  );
  const repeatedPlan = solidPlan.buildSolidPlan({
    physicsSolution: repeated.solution,
  });
  assert.equal(repeatedPlan.ok, true);
  assert.equal(
    repeated.solution.solidIntent.intentHash,
    result.solution.solidIntent.intentHash,
  );
  assert.equal(repeatedPlan.planHash, plan.planHash);

  const permutedSolution = structuredClone(result.solution);
  permutedSolution.entryStations.reverse();
  permutedSolution.apertureLayouts.reverse();
  for (const layout of permutedSolution.apertureLayouts) {
    layout.apertures.reverse();
  }
  permutedSolution.chambers.reverse();
  permutedSolution.passages.reverse();
  permutedSolution.mounts.reverse();
  for (const mount of permutedSolution.mounts) {
    mount.apertureBindings.reverse();
  }
  const permutedIntent = solidIntentBuilder.buildSolidIntent({
    physicsSolution: permutedSolution,
    solidGeometry: analysisInput.solidGeometry,
  });
  assert.equal(
    permutedIntent.ok,
    true,
    JSON.stringify(permutedIntent.diagnostics, null, 2),
  );
  assert.equal(
    permutedIntent.solidIntent.intentHash,
    result.solution.solidIntent.intentHash,
  );
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});
