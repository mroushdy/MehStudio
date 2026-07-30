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
const modulePath = path.join(appRoot, "threeway-passage-solver.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const solver = require(modulePath);
const apertureSolver = require(path.join(
  appRoot, "threeway-aperture-solver.js"));

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, received ${actual}`,
  );
}

function selectedCandidate() {
  const result = apertureSolver.solveSourceApertures({
    sourceId: "source-mid",
    candidatePolicy: apertureSolver.candidatePolicy,
    allowedCounts: [2],
    driverEffectiveAreaM2: 0.02,
    areaPolicy: {
      mode: "target",
      summedAreaTargetM2: 0.002,
    },
    compressionRatioBounds: {
      minimum: 8,
      maximum: 12,
    },
    host: {
      id: "source-mid-active-cone",
      role: "active-cone",
      shape: "circle",
      radiusM: 0.18,
    },
    apertureShape: {
      kind: "racetrack",
      lengthToWidthRatio: 3,
    },
    limits: {
      minimumWebM: 0.005,
      minimumEdgeM: 0.005,
      maximumApertureLongAxisM: 0.08,
      maximumApertureShortAxisM: 0.04,
    },
    orientationPolicy: {
      mode: "driver-local-parallel",
      angleRad: 0,
    },
    placementPolicy: {
      family: "symmetric-line",
      axisAngleRad: Math.PI / 2,
      spacingMode: "explicit-center-spacing",
      centerSpacingM: 0.05,
    },
    upperFrequencyHz: 1000,
    speedOfSoundMps: 343,
    wavelengthSpacingPolicy: "warn",
    provenance: {
      classification: "calculated-adaptation",
      evidenceRefs: ["fixture-aperture-solve"],
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.feasibleCandidates.length, 1);
  const template = result.feasibleCandidates[0];
  const driverInstanceId = "mid-driver-instance-1";
  const physicalCandidateId =
    `${template.id}::${driverInstanceId}`;
  return {
    ...structuredClone(template),
    id: physicalCandidateId,
    physicalDriverInstanceId: driverInstanceId,
    templateCandidateId: template.id,
    templateGeometryChanged: false,
    apertures: template.apertures.map(aperture => ({
      ...structuredClone(aperture),
      id: `${aperture.id}::${driverInstanceId}`,
      physicalDriverInstanceId: driverInstanceId,
      physicalCandidateId,
      templateApertureId: aperture.id,
      templateCandidateId: template.id,
    })),
  };
}

function frame(originM) {
  return {
    originM,
    axial: [1, 0, 0],
    u: [0, 1, 0],
    v: [0, 0, 1],
  };
}

function passageSpec(aperture, index) {
  const start = [0, aperture.centerM.x, aperture.centerM.y];
  const end = [0.08, aperture.centerM.x, aperture.centerM.y];
  return {
    apertureId: aperture.id,
    templateApertureId: aperture.templateApertureId,
    physicalCandidateId: aperture.physicalCandidateId,
    templateCandidateId: aperture.templateCandidateId,
    driverEndpoint: {
      pointM: start,
      flowDirection: [1, 0, 0],
      surfaceNormal: [1, 0, 0],
      datum: "front-chamber-boundary",
      localFrame: frame(start),
      provenanceRefs: ["fixture-driver-endpoint"],
    },
    hornEndpoint: {
      pointM: end,
      flowDirection: [1, 0, 0],
      surfaceNormal: [1, 0, 0],
      datum: "inner-horn-surface",
      stationId: "station-mid",
      axialCoordinateM: 0.14,
      localFrame: frame(end),
      provenanceRefs: ["fixture-horn-endpoint"],
    },
    startSection: {
      family: "racetrack",
      widthM: aperture.shape.lengthM,
      heightM: aperture.shape.widthM,
      rotationRad: aperture.angleRad,
    },
    endSection: {
      family: "racetrack",
      widthM: aperture.shape.lengthM,
      heightM: aperture.shape.widthM,
      rotationRad: aperture.angleRad,
    },
    areaProgression: "constant",
    path: {
      samples: 9,
      driverTangentScaleM: 0.025,
      hornTangentScaleM: 0.025,
      upHint: [0, 1, 0],
    },
    sectionSegments: 32,
    effectiveAreaM2: aperture.shape.areaM2,
    upstreamPathToDriverEndpointM: 0.02,
    downstreamPathFromHornEndpointToDatumM: 0.12 + index * 0.002,
    pathDatumId: "mouth-reference-plane",
    provenanceRefs: ["fixture-passage"],
  };
}

function validInput() {
  const candidate = selectedCandidate();
  return {
    state: {
      schemaVersion: 2,
      designId: "passage-fixture",
      revision: 4,
      topology: { kind: "T3", schemaVersion: 1 },
      intent: {
        crossoversHz: { lowMid: 320, midHigh: 1250 },
        mouthLimitM: { width: 0.8, height: 0.6 },
      },
      horn: {
        mouth: { widthM: 0.72, heightM: 0.48 },
      },
      sources: [
        {
          id: "source-mid",
          count: 1,
          bandIds: ["mid"],
          driverRef: "driver-mid-explicit",
        },
      ],
      entryStations: [
        {
          id: "station-mid",
          role: "wall-entry",
          sourceIds: ["source-mid"],
          bandIds: ["mid"],
          order: 1,
        },
      ],
    },
    stationSolution: {
      ok: true,
      result: {
        schemaVersion: 2,
        topology: { kind: "T3", schemaVersion: 1 },
        selectedEntryStations: [
          {
            stationId: "station-mid",
            role: "wall-entry",
            sourceIds: ["source-mid"],
            bandIds: ["mid"],
            sourceCount: 1,
            axialM: 0.14,
            hornQuery: {
              queryId: "station-query:station-mid",
              stationId: "station-mid",
              axialCoordinateM: 0.14,
              localHornAreaM2: 0.02,
              localHornPerimeterM: 0.7,
              surfaceRevision: "fixture-horn-surface",
            },
          },
        ],
      },
    },
    apertureLayouts: [
      {
        id: "layout-mid",
        stationId: "station-mid",
        sourceId: "source-mid",
        bandId: "mid",
        driverInstanceId: "mid-driver-instance-1",
        selectedCandidateId: candidate.id,
        templateCandidateId: candidate.templateCandidateId,
        candidate,
        diagnosticFrequencyHz: 1000,
        maximumAllowedSpreadM: 0.003,
        referencePathToDatumM: 0.221,
        pathDatumId: "mouth-reference-plane",
        provenanceRefs: ["fixture-selected-layout"],
      },
    ],
    driverChamberInterfaces: [
      {
        id: "interface-mid-driver-1",
        stationId: "station-mid",
        sourceId: "source-mid",
        bandId: "mid",
        driverInstanceId: "mid-driver-instance-1",
        driverRecordId: "driver-mid-explicit",
        chamber: {
          id: "mid-front-chamber-1",
          volumeM3: 0.0012,
          provenanceRefs: ["fixture-chamber"],
        },
        driverFaceFrame: frame([0, 0, 0]),
        apertures: candidate.apertures.map(passageSpec),
        provenanceRefs: ["fixture-interface"],
      },
    ],
    acoustics: {
      densityKgM3: 1.2,
      speedOfSoundMps: 343,
      quarterWaveBoundaryAssumption:
        "one-end-closed-one-end-open",
      halfWaveBoundaryAssumption: "both-ends-open",
      provenance: {
        classification: "calculated-adaptation",
        evidenceRefs: ["fixture-acoustics"],
      },
    },
  };
}

function codes(result) {
  return result.diagnostics.map(item => item.code);
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value))
    assertDeepFrozen(child, `${label}.${key}`);
}

test("metadata forbids inference, Boolean subtraction, and manufacturing authority", () => {
  assert.equal(solver.version, 1);
  assert.equal(solver.capabilities.schema2Only, true);
  assert.equal(solver.capabilities.driverInference, false);
  assert.equal(solver.capabilities.chamberInference, false);
  assert.equal(solver.capabilities.countInference, false);
  assert.equal(solver.capabilities.apertureAreaInference, false);
  assert.equal(solver.capabilities.crossoverInference, false);
  assert.equal(solver.capabilities.mouthInference, false);
  assert.equal(solver.capabilities.meshSubtraction, false);
  assert.equal(solver.capabilities.manufacturing, false);
  assert.equal(solver.modelMetadata.hardwareValidated, false);
  assertDeepFrozen(solver);
});

test("one immutable canonical lumen intent is produced per selected aperture", () => {
  const input = validInput();
  const before = structuredClone(input);
  const result = solver.solveCanonicalPassages(input);

  assert.deepEqual(input, before, "passage solver mutated its input");
  assert.equal(result.ok, true);
  assert.equal(result.result.counts.selectedApertures, 2);
  assert.equal(result.result.counts.canonicalPassages, 2);
  assert.equal(result.result.passages.length, 2);
  assert.equal(
    new Set(result.result.passages.map(item => item.apertureId)).size,
    2,
  );
  for (const passage of result.result.passages) {
    assert.equal(passage.canonicalOwnership.ownerCount, 1);
    assert.equal(passage.canonicalOwnership.canonical, true);
    assert.equal(passage.canonicalLumenIntent.canonicalNegative, true);
    assert.equal(
      passage.canonicalLumenIntent.subtractedFromPositiveHosts,
      false,
    );
    assert.ok(passage.negativeInspectionMesh);
    assert.equal(passage.negativeInspectionMesh.audit.closed, true);
    assert.equal(
      passage.negativeInspectionMesh.manufacturingAuthority,
      false,
    );
    assert.equal(passage.negativeInspectionAudit.openEdges, 0);
    assert.equal(passage.negativeInspectionAudit.nonManifoldEdges, 0);
    assert.equal(passage.manufacturing, false);
    assert.match(passage.hashInput, /^meh3-passage-v1\n/);
  }
  assert.equal(
    result.result.invariants.oneCanonicalLumenPerAperture,
    true,
  );
  assert.equal(result.manufacturing, false);
  assert.match(result.hashInput, /^meh3-passage-solve-v1\n/);
  assertDeepFrozen(result);
});

test("acoustic length, area, inertance, delay, modes, and path spread are canonical metrics", () => {
  const result = solver.solveCanonicalPassages(validInput());
  assert.equal(result.ok, true);
  const first = result.result.passages[0];
  close(first.acousticMetrics.effectiveLengthM, 0.08, 1e-12);
  close(
    first.acousticMetrics.acousticInertancePaS2M3,
    1.2 * 0.08 / first.acousticMetrics.effectiveAreaM2,
    1e-10,
  );
  close(first.acousticMetrics.oneWayDelayS, 0.08 / 343);
  close(
    first.acousticMetrics.modes[0].frequencyHz,
    343 / (4 * 0.08),
  );
  close(
    first.acousticMetrics.modes[1].frequencyHz,
    343 / (2 * 0.08),
  );
  const spread = result.result.pathSpreadAnalyses[0];
  equalWithin(spread.pathCount, 2);
  close(spread.spreadM, 0.002);
  close(spread.spreadDelayS, 0.002 / 343);
  close(spread.spreadPhaseDeg, 360 * 1000 * 0.002 / 343);
  assert.equal(spread.withinDeclaredSpreadLimit, true);
});

function equalWithin(actual, expected) {
  assert.equal(actual, expected);
}

test("input permutation leaves stable passage and solve hashes unchanged", () => {
  const firstInput = validInput();
  const secondInput = structuredClone(firstInput);
  secondInput.apertureLayouts[0].candidate.apertures.reverse();
  secondInput.driverChamberInterfaces[0].apertures.reverse();

  const first = solver.solveCanonicalPassages(firstInput);
  const second = solver.solveCanonicalPassages(secondInput);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.hashInput, first.hashInput);
  assert.deepEqual(
    second.result.passages.map(item => item.hashInput),
    first.result.passages.map(item => item.hashInput),
  );
});

test("crossover and mouth changes are ignored rather than inferred into passages", () => {
  const firstInput = validInput();
  const secondInput = structuredClone(firstInput);
  secondInput.state.intent.crossoversHz = {
    lowMid: 111,
    midHigh: 9999,
  };
  secondInput.state.intent.mouthLimitM = {
    width: 8,
    height: 6,
  };
  secondInput.state.horn.mouth = {
    widthM: 7.2,
    heightM: 4.8,
  };
  const first = solver.solveCanonicalPassages(firstInput);
  const second = solver.solveCanonicalPassages(secondInput);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.hashInput, first.hashInput);
  assert.deepEqual(second.result.passages, first.result.passages);
});

test("missing driver, chamber, or explicit source count is refused", () => {
  const noDriver = validInput();
  delete noDriver.driverChamberInterfaces[0].driverRecordId;
  assert.equal(solver.solveCanonicalPassages(noDriver).ok, false);

  const noChamber = validInput();
  delete noChamber.driverChamberInterfaces[0].chamber;
  assert.equal(solver.solveCanonicalPassages(noChamber).ok, false);

  const noCount = validInput();
  delete noCount.state.sources[0].count;
  const refused = solver.solveCanonicalPassages(noCount);
  assert.equal(refused.ok, false);
  assert.ok(codes(refused).includes(
    solver.failureCodes.SOURCE_INVALID,
  ));
});

test("declared driver count must equal explicit physical interface count", () => {
  const input = validInput();
  input.state.sources[0].count = 2;
  input.stationSolution.result.selectedEntryStations[0].sourceCount = 2;
  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    solver.failureCodes.DRIVER_COUNT_CONFLICT,
  ));
});

test("multiple physical drivers reuse template geometry without reusing physical aperture identity", () => {
  const input = validInput();
  const firstLayout = input.apertureLayouts[0];
  const firstInterface = input.driverChamberInterfaces[0];
  const secondInstanceId = "mid-driver-instance-2";
  const secondLayout = structuredClone(firstLayout);
  secondLayout.id = "layout-mid-driver-2";
  secondLayout.driverInstanceId = secondInstanceId;
  secondLayout.candidate.id =
    `${secondLayout.templateCandidateId}::${secondInstanceId}`;
  secondLayout.selectedCandidateId = secondLayout.candidate.id;
  secondLayout.candidate.physicalDriverInstanceId = secondInstanceId;
  secondLayout.candidate.apertures =
    secondLayout.candidate.apertures.map(aperture => ({
      ...aperture,
      id: `${aperture.templateApertureId}::${secondInstanceId}`,
      physicalDriverInstanceId: secondInstanceId,
      physicalCandidateId: secondLayout.candidate.id,
    }));
  const secondInterface = structuredClone(firstInterface);
  secondInterface.id = "interface-mid-driver-2";
  secondInterface.driverInstanceId = secondInstanceId;
  secondInterface.chamber.id = "mid-front-chamber-2";
  secondInterface.apertures = secondInterface.apertures.map((spec, index) => ({
    ...spec,
    apertureId: secondLayout.candidate.apertures[index].id,
    physicalCandidateId: secondLayout.candidate.id,
  }));
  input.state.sources[0].count = 2;
  input.stationSolution.result.selectedEntryStations[0].sourceCount = 2;
  input.apertureLayouts.push(secondLayout);
  input.driverChamberInterfaces.push(secondInterface);

  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(result.result.passages.length, 4);
  assert.equal(
    new Set(result.result.passages.map(item => item.apertureId)).size,
    4,
  );
  assert.equal(
    new Set(result.result.passages.map(item => item.templateApertureId)).size,
    2,
  );
  assert.deepEqual(
    [...new Set(result.result.passages.map(
      item => item.driverInstanceId,
    ))].sort(),
    ["mid-driver-instance-1", "mid-driver-instance-2"],
  );
});

test("duplicate and missing aperture ownership both fail closed", () => {
  const duplicate = validInput();
  const extra = structuredClone(duplicate.driverChamberInterfaces[0]);
  extra.id = "interface-mid-driver-duplicate";
  extra.driverInstanceId = "mid-driver-instance-duplicate";
  extra.apertures = [extra.apertures[0]];
  duplicate.driverChamberInterfaces.push(extra);
  const duplicateResult = solver.solveCanonicalPassages(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert.ok(codes(duplicateResult).includes(
    solver.failureCodes.NONCANONICAL_DUPLICATE_OWNERSHIP,
  ));

  const missing = validInput();
  missing.driverChamberInterfaces[0].apertures.pop();
  const missingResult = solver.solveCanonicalPassages(missing);
  assert.equal(missingResult.ok, false);
  assert.ok(codes(missingResult).includes(
    solver.failureCodes.APERTURE_OWNERSHIP_CONFLICT,
  ));
});

test("aperture area and shape conflicts are rejected rather than adapted", () => {
  const input = validInput();
  input.driverChamberInterfaces[0].apertures[0]
    .startSection.widthM *= 1.1;
  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    solver.failureCodes.APERTURE_GEOMETRY_CONFLICT,
  ));
});

test("endpoint frames must be explicit, right-handed, and coincident with endpoints", () => {
  const input = validInput();
  input.driverChamberInterfaces[0].apertures[0]
    .driverEndpoint.localFrame.originM = [0.001, 0, 0];
  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    solver.failureCodes.ENDPOINT_FRAME_INVALID,
  ));
});

test("horn endpoints must name the solved station coordinate", () => {
  const input = validInput();
  input.driverChamberInterfaces[0].apertures[0]
    .hornEndpoint.axialCoordinateM = 0.15;
  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    solver.failureCodes.STATION_OWNERSHIP_CONFLICT,
  ));
});

test("disconnected lumen geometry is a conflict, never a partial passage", () => {
  const input = validInput();
  const spec = input.driverChamberInterfaces[0].apertures[0];
  spec.hornEndpoint.pointM = structuredClone(
    spec.driverEndpoint.pointM);
  spec.hornEndpoint.localFrame.originM = structuredClone(
    spec.driverEndpoint.pointM);
  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, false);
  assert.equal(result.result, null);
  assert.ok(codes(result).includes(
    solver.failureCodes.LUMEN_GEOMETRY_CONFLICT,
  ));
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test("effective acoustic area must agree with the canonical section progression", () => {
  const input = validInput();
  input.driverChamberInterfaces[0].apertures[0]
    .effectiveAreaM2 *= 2;
  const result = solver.solveCanonicalPassages(input);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    solver.failureCodes.ACOUSTIC_CONFLICT,
  ));
});

test("browser UMD path uses explicit dependency globals and fails closed without them", () => {
  const lumenSource = fs.readFileSync(
    path.join(appRoot, "threeway-lumen-geometry.js"), "utf8");
  const acousticsSource = fs.readFileSync(
    path.join(appRoot, "threeway-acoustics.js"), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(lumenSource, context);
  vm.runInNewContext(acousticsSource, context);
  vm.runInNewContext(moduleSource, context);
  assert.equal(
    typeof context.globalThis.MEH3PassageSolver
      .solveCanonicalPassages,
    "function",
  );

  const missing = { globalThis: {} };
  vm.runInNewContext(moduleSource, missing);
  const refused = missing.globalThis.MEH3PassageSolver
    .solveCanonicalPassages({});
  assert.equal(refused.ok, false);
  assert.equal(
    refused.code,
    solver.failureCodes.DEPENDENCY_UNAVAILABLE,
  );
});

test("manufacturing remains unavailable after canonical passage solving", () => {
  const solved = solver.solveCanonicalPassages(validInput());
  assert.equal(solved.ok, true);
  assert.equal(solved.result.invariants.meshesSubtracted, false);
  assert.equal(solved.capabilities.exactBooleanSubtraction, false);
  const preflight = solver.manufacturingPreflight("subtract-lumens");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.available, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
});
