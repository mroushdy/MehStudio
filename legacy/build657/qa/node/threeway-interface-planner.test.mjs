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
const modulePath = path.join(appRoot, "threeway-interface-planner.js");
const sourceText = fs.readFileSync(modulePath, "utf8");
const planner = require(modulePath);
const apertureSolver = require(path.join(
  appRoot,
  "threeway-aperture-solver.js",
));
const driverDb = require(path.join(appRoot, "threeway-driver-db.js"));
const passageSolver = require(path.join(
  appRoot,
  "threeway-passage-solver.js",
));
const mountSolver = require(path.join(
  appRoot,
  "threeway-mount-solver.js",
));

const TAU = 2 * Math.PI;

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`,
  );
}

function add(left, right) {
  return left.map((value, index) => value + right[index]);
}

function scale(vector, amount) {
  return vector.map(value => value * amount);
}

function dot(left, right) {
  return left.reduce(
    (sum, value, index) => sum + value * right[index],
    0,
  );
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function rotateX(vector, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    vector[0],
    cosine * vector[1] - sine * vector[2],
    sine * vector[1] + cosine * vector[2],
  ];
}

function normalize(vector) {
  const magnitude = Math.hypot(...vector);
  return vector.map(value => value / magnitude);
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`);
  }
}

function driverRecord() {
  const result = driverDb.validateDriverRecord({
    schemaVersion: 1,
    id: "driver-low-explicit",
    revision: 1,
    kind: "cone",
    bandIds: ["low"],
    frame: {
      shape: "round",
      diameterM: 0.12,
      depthM: 0.08,
      frontProjectionM: 0.002,
    },
    diaphragm: {
      effectiveAreaM2: 0.007,
      activeDiameterM: 0.1,
      geometry: {
        shape: "round",
        centerOffsetM: [0, 0],
      },
      provenanceRefs: ["driver-datasheet"],
    },
    outputs: [
      {
        id: "cone-front",
        bandIds: ["low"],
        kind: "front-diaphragm",
        geometry: {
          shape: "round",
          diameterM: 0.1,
          areaM2: 0.007,
        },
        acousticDatum: {
          kind: "front-chamber-boundary",
          offsetM: 0.012,
        },
        provenanceRefs: ["driver-datasheet"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["driver-datasheet"],
    },
    provenanceRefs: ["driver-datasheet"],
  });
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  return result.record;
}

function resolvedDrivers(count) {
  const driver = driverRecord();
  return {
    ok: true,
    code: null,
    hashInput: `driver-resolution:${count}`,
    sources: [
      {
        sourceId: "source-low",
        driverRef: driver.id,
        count,
        bandIds: ["low"],
        driver,
        totalEffectiveAreaM2: count * driver.diaphragm.effectiveAreaM2,
      },
    ],
    diagnostics: [],
    manufacturing: false,
  };
}

function apertureResult(panelParallel = false) {
  const result = apertureSolver.solveApertureLayout({
    sources: [
      {
        sourceId: "source-low",
        candidatePolicy: apertureSolver.candidatePolicy,
        allowedCounts: [2],
        driverEffectiveAreaM2: 0.007,
        areaPolicy: {
          mode: "target",
          summedAreaTargetM2: 0.0005,
        },
        compressionRatioBounds: {
          minimum: 10,
          maximum: 20,
        },
        host: {
          id: "source-low-active-cone",
          role: "active-cone",
          shape: "circle",
          radiusM: 0.05,
        },
        apertureShape: {
          kind: "racetrack",
          lengthToWidthRatio: 3,
        },
        limits: {
          minimumWebM: 0.003,
          minimumEdgeM: 0.003,
          maximumApertureLongAxisM: 0.04,
          maximumApertureShortAxisM: 0.02,
        },
        orientationPolicy: panelParallel
          ? {
              mode: "panel-parallel",
              panelAngleRad: 0,
              driverLocalToPanelAngleRad: 0,
            }
          : {
              mode: "driver-local-parallel",
              angleRad: 0,
            },
        placementPolicy: {
          family: "symmetric-line",
          axisAngleRad: Math.PI / 2,
          spacingMode: "explicit-center-spacing",
          centerSpacingM: 0.035,
        },
        upperFrequencyHz: 1000,
        speedOfSoundMps: 343,
        wavelengthSpacingPolicy: "warn",
        provenance: {
          classification: "calculated-adaptation",
          evidenceRefs: ["aperture-fixture"],
        },
      },
    ],
  });
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  return {
    ...result,
    hashInput: `aperture-layout:${panelParallel ? "panel" : "rotational"}`,
  };
}

function hornSurface() {
  const slope = 0.25;
  const axial = normalize([1, slope, 0]);
  const normal = normalize([-slope, 1, 0]);
  const crossTangent = [0, 0, 1];
  function station(index, axialM, radiusM, widthM, heightM) {
    return {
      index,
      axialM,
      wallPointM: { xM: axialM, yM: radiusM, zM: 0 },
      sectionAreaM2: Math.PI * radiusM ** 2,
      sectionPerimeterM: 2 * Math.PI * radiusM,
      section: {
        family: "superellipse",
        exponent: 2,
        widthM,
        heightM,
        semiWidthM: widthM / 2,
        semiHeightM: heightM / 2,
        aspectRatio: widthM / heightM,
      },
      localFrame: {
        normal: { x: normal[0], y: normal[1], z: normal[2] },
        axialTangent: { x: axial[0], y: axial[1], z: axial[2] },
        crossTangent: {
          x: crossTangent[0],
          y: crossTangent[1],
          z: crossTangent[2],
        },
        handedness: "crossTangent-x-axialTangent=normal",
        normalOrientation: "outward",
      },
    };
  }
  return {
    ok: true,
    apiVersion: 1,
    schemaVersion: 2,
    kind: "threeway-horn-surface",
    surfaceHash: "horn-surface-fixture",
    azimuth: {
      declaredRad: 0,
      canonicalRad: 0,
    },
    stations: [
      station(0, 0, 0.08, 0.16, 0.16),
      station(1, 0.2, 0.13, 0.26, 0.26),
    ],
    manufacturing: false,
  };
}

function state(count) {
  return {
    schemaVersion: 2,
    designId: "interface-planner-fixture",
    revision: 1,
    topology: { kind: "T3", schemaVersion: 1 },
    intent: {
      crossoversHz: { lowMid: 300, midHigh: 1200 },
      mouthLimitM: { width: 0.8, height: 0.6 },
    },
    horn: {
      mouth: { widthM: 0.7, heightM: 0.5 },
    },
    sources: [
      {
        id: "source-low",
        role: "wall-source",
        count,
        bandIds: ["low"],
        driverRef: "driver-low-explicit",
        provenanceRefs: ["source-fixture"],
      },
    ],
    interfaces: [],
    entryStations: [
      {
        id: "station-low",
        role: "wall-entry",
        sourceIds: ["source-low"],
        bandIds: ["low"],
        order: 1,
        provenanceRefs: ["station-fixture"],
      },
    ],
    rearSystems: [],
    provenance: { records: [] },
    research: { notes: [], referenceCardIds: [] },
  };
}

function solvedAzimuths(count, distribution) {
  if (distribution === "panel-pairs") {
    assert.equal(count, 4);
    return [0, 0, Math.PI, Math.PI];
  }
  return Array.from({ length: count }, (_, index) => TAU * index / count);
}

function stationResult(count, distribution, axialSpanM) {
  return {
    ok: true,
    code: null,
    result: {
      schemaVersion: 2,
      inputHash: "state-hash-fixture",
      topology: { kind: "T3", schemaVersion: 1 },
      hornSurfaceHash: "horn-surface-fixture",
      optimization: "balanced",
      selectedEntryStations: [
        {
          stationId: "station-low",
          order: 1,
          role: "wall-entry",
          bandIds: ["low"],
          sourceIds: ["source-low"],
          sourceCount: count,
          axialM: 0.1,
          requiredAxialSpanM: axialSpanM,
          distribution,
          circumferential: {
            sourceAzimuthsRad: solvedAzimuths(count, distribution),
          },
          hornQuery: {
            queryId: "station-query:station-low",
            stationId: "station-low",
            axialCoordinateM: 0.1,
            surfaceRevision: "horn-surface-fixture",
          },
          provenanceRefs: ["station-fixture"],
        },
      ],
      manufacturing: false,
    },
    diagnostics: [],
    hashInput: `station-solve:${distribution}:${count}`,
    manufacturing: false,
  };
}

function construction() {
  return {
    mode: "integrated-solid",
    host: {
      thicknessM: 0.01,
      edgeExtensionM: 0.004,
    },
    activeConeEnvelope: {
      shape: "round",
      diameterM: 0.1,
      centerOffsetM: [0, 0],
      provenanceRefs: ["driver-datasheet"],
    },
    constraints: {
      axisToleranceDeg: 1,
      minimumWebM: 0.003,
      minimumEdgeM: 0.003,
      datumToleranceM: 1e-7,
    },
    inspection: {
      segments: 32,
    },
  };
}

function pathSettings() {
  return {
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
    provenanceRefs: ["path-fixture"],
  };
}

function instances(count, distribution) {
  const azimuths = solvedAzimuths(count, distribution);
  return azimuths.map((azimuthRad, index) => {
    const side = distribution === "panel-pairs"
      ? (index % 2 === 0 ? -1 : 1)
      : 0;
    return {
      id: `source-low/driver-${String(index + 1).padStart(2, "0")}`,
      azimuthRad,
      axialOffsetM: side * 0.07,
      panelId: distribution === "panel-pairs"
        ? `panel-${Math.floor(index / 2) + 1}`
        : null,
      chamber: {
        id: `front-chamber-${index + 1}`,
        volumeM3: 0.0005,
        provenanceRefs: ["chamber-fixture"],
      },
      upstreamPathToDriverEndpointM: 0.012,
      downstreamPathFromHornEndpointToDatumM: 0.2,
      auxiliaryNegatives: [],
      provenanceRefs: ["instance-fixture"],
    };
  });
}

function panels(distribution) {
  if (distribution !== "panel-pairs") return [];
  return [0, 1].map(index => ({
    id: `panel-${index + 1}`,
    azimuthRad: index * Math.PI,
    instanceIds: [
      `source-low/driver-${String(index * 2 + 1).padStart(2, "0")}`,
      `source-low/driver-${String(index * 2 + 2).padStart(2, "0")}`,
    ],
    provenanceRefs: ["panel-fixture"],
  }));
}

function fixture({
  count = 1,
  distribution = "rotational",
  panelParallel = distribution === "panel-pairs",
} = {}) {
  const axialSpanM = distribution === "panel-pairs" ? 0.28 : 0.16;
  return {
    schemaVersion: 2,
    stateHash: "state-hash-fixture",
    state: state(count),
    hornSurface: hornSurface(),
    stationResult: stationResult(count, distribution, axialSpanM),
    apertureResult: structuredClone(apertureResult(panelParallel)),
    resolvedDrivers: structuredClone(resolvedDrivers(count)),
    placementPlans: [
      {
        sourceId: "source-low",
        stationId: "station-low",
        bandId: "low",
        driverOutputId: "cone-front",
        apertureCandidateId:
          "source-low/candidate-count-2",
        mountSetbackM: 0.06,
        distributionFamily: distribution,
        axisPolicy: {
          kind: "wall-normal",
          normalSign: -1,
        },
        diagnosticFrequencyHz: 1000,
        maximumAllowedSpreadM: 0.005,
        referencePathToDatumM: 0.3,
        pathDatumId: "mouth-reference-plane",
        pathSettings: pathSettings(),
        construction: construction(),
        instances: instances(count, distribution),
        panels: panels(distribution),
        provenanceRefs: ["plan-fixture"],
      },
    ],
    validation: {
      positionToleranceM: 1e-7,
      sectionToleranceM: 1e-9,
      angleToleranceDeg: 0.01,
      azimuthToleranceRad: 1e-7,
      minimumDriverClearanceM: 0.005,
    },
  };
}

function codes(result) {
  return result.diagnostics.map(item => item.code);
}

test("module is pure UMD/CommonJS analysis geometry with no engine or mesh implementation", () => {
  assert.equal(planner.version, 1);
  assert.equal(planner.schemaVersion, 2);
  assert.equal(planner.capabilities.canonicalPhysicalApertureIdentity, true);
  assert.equal(planner.capabilities.productInference, false);
  assert.equal(planner.capabilities.mouthInference, false);
  assert.equal(planner.capabilities.crossoverInference, false);
  assert.equal(planner.capabilities.sourceCountInference, false);
  assert.equal(planner.capabilities.apertureMotion, false);
  assert.equal(planner.capabilities.apertureRotation, false);
  assert.equal(planner.capabilities.apertureRescaling, false);
  assert.equal(planner.capabilities.meshGeneration, false);
  assert.equal(planner.capabilities.manufacturing, false);
  assertDeepFrozen(planner);

  assert.doesNotMatch(sourceText, /\brequire\s*\(/);
  assert.doesNotMatch(
    sourceText,
    /\bTHREE\b|\bdocument\b|\bwindow\b|\blocalStorage\b|vertices\.push|triangles\.push/,
  );
  const context = { globalThis: {} };
  vm.runInNewContext(sourceText, context);
  assert.equal(
    typeof context.globalThis.MEH3InterfacePlanner.planInterfaces,
    "function",
  );
});

test("one physical driver produces deterministic immutable canonical downstream records", () => {
  const input = fixture();
  const before = structuredClone(input);
  const first = planner.planInterfaces(input);
  const second = planner.planInterfaces(structuredClone(input));

  assert.deepEqual(input, before, "planner mutated its input");
  assert.equal(first.ok, true, JSON.stringify(first.diagnostics, null, 2));
  assert.equal(second.hashInput, first.hashInput);
  assert.deepEqual(second.result, first.result);
  assert.equal(first.result.counts.physicalDrivers, 1);
  assert.equal(first.result.counts.physicalLayouts, 1);
  assert.equal(first.result.counts.physicalApertures, 2);
  assert.equal(first.result.counts.driverChamberInterfaces, 1);
  assert.equal(first.result.downstreamCompatibility.passageSolverV1, true);
  assert.equal(first.result.downstreamCompatibility.mountSolverV1, true);
  assert.equal(first.result.invariants.templateApertureGeometryChanged, false);
  assert.equal(first.manufacturing, false);
  assertDeepFrozen(first);
});

test("physical apertures preserve exact template geometry while qualifying every identity", () => {
  const input = fixture();
  const result = planner.planInterfaces(input);
  assert.equal(result.ok, true);
  const template = input.apertureResult.sources[0].feasibleCandidates[0];
  const layout = result.result.apertureLayouts[0];
  assert.notEqual(layout.selectedCandidateId, template.id);
  assert.equal(layout.templateCandidateId, template.id);
  assert.equal(layout.driverInstanceId, "source-low/driver-01");
  assert.equal(layout.candidate.templateCandidateId, template.id);
  for (let index = 0; index < template.apertures.length; index++) {
    const physical = layout.candidate.apertures[index];
    const source = template.apertures[index];
    assert.notEqual(physical.id, source.id);
    assert.equal(physical.templateApertureId, source.id);
    assert.deepEqual(physical.centerM, source.centerM);
    assert.equal(physical.angleRad, source.angleRad);
    assert.deepEqual(physical.shape, source.shape);
  }
  const physicalIds = new Set(
    layout.candidate.apertures.map(item => item.id),
  );
  assert.equal(layout.candidate.pairSpacing.length, 1);
  assert.ok(physicalIds.has(
    layout.candidate.pairSpacing[0].firstApertureId,
  ));
  assert.ok(physicalIds.has(
    layout.candidate.pairSpacing[0].secondApertureId,
  ));
  assert.equal(
    layout.candidate.pairSpacing[0].templatePairSpacingId,
    template.pairSpacing[0].id,
  );
  assert.equal(
    layout.candidate.pairSpacing[0].centerDistanceM,
    template.pairSpacing[0].centerDistanceM,
  );
});

test("one-instance output composes through the existing passage and mount solvers", () => {
  const input = fixture();
  const planned = planner.planInterfaces(input);
  assert.equal(planned.ok, true, JSON.stringify(planned.diagnostics, null, 2));

  const passages = passageSolver.solveCanonicalPassages({
    state: input.state,
    stationSolution: input.stationResult,
    apertureLayouts: planned.result.apertureLayouts,
    driverChamberInterfaces: planned.result.driverChamberInterfaces,
    acoustics: {
      densityKgM3: 1.2,
      speedOfSoundMps: 343,
      quarterWaveBoundaryAssumption: "one-end-closed-one-end-open",
      halfWaveBoundaryAssumption: "both-ends-open",
      provenance: {
        classification: "calculated-adaptation",
        evidenceRefs: ["acoustics-fixture"],
      },
    },
  });
  assert.equal(passages.ok, true, JSON.stringify(passages.diagnostics, null, 2));
  assert.equal(passages.result.passages.length, 2);

  const mounts = mountSolver.solveSourceMounts({
    schemaVersion: 2,
    stationResult: input.stationResult,
    apertureResult: planned.result.mountApertureResult,
    passageResult: passages,
    resolvedDrivers: input.resolvedDrivers,
    mountPlans: planned.result.mountPlans,
    validation: input.validation,
  });
  assert.equal(mounts.ok, true, JSON.stringify(mounts.diagnostics, null, 2));
  assert.equal(mounts.result.mounts.length, 1);
  assert.equal(mounts.result.mounts[0].apertureBindings.length, 2);
});

test("multi-instance physical aperture identities compose through passage and mount solvers", () => {
  const input = fixture({ count: 2 });
  const planned = planner.planInterfaces(input);
  assert.equal(planned.ok, true, JSON.stringify(planned.diagnostics, null, 2));

  const passages = passageSolver.solveCanonicalPassages({
    state: input.state,
    stationSolution: input.stationResult,
    apertureLayouts: planned.result.apertureLayouts,
    driverChamberInterfaces: planned.result.driverChamberInterfaces,
    acoustics: {
      densityKgM3: 1.2,
      speedOfSoundMps: 343,
      quarterWaveBoundaryAssumption: "one-end-closed-one-end-open",
      halfWaveBoundaryAssumption: "both-ends-open",
      provenance: {
        classification: "calculated-adaptation",
        evidenceRefs: ["acoustics-fixture"],
      },
    },
  });
  assert.equal(passages.ok, true, JSON.stringify(passages.diagnostics, null, 2));
  assert.equal(passages.result.passages.length, 4);

  const mounts = mountSolver.solveSourceMounts({
    schemaVersion: 2,
    stationResult: input.stationResult,
    apertureResult: planned.result.mountApertureResult,
    passageResult: passages,
    resolvedDrivers: input.resolvedDrivers,
    mountPlans: planned.result.mountPlans,
    validation: input.validation,
  });
  assert.equal(mounts.ok, true, JSON.stringify(mounts.diagnostics, null, 2));
  assert.equal(mounts.result.mounts.length, 2);
  assert.equal(
    new Set(mounts.result.mounts.flatMap(mount =>
      mount.apertureBindings.map(binding => binding.apertureId)
    )).size,
    4,
  );
  assert.equal(
    new Set(mounts.result.mounts.flatMap(mount =>
      mount.apertureBindings.map(binding => binding.templateApertureId)
    )).size,
    2,
  );
});

test("wall interpolation and solved-azimuth rotation are covariant about the horn x-axis", () => {
  const input = fixture({ count: 2 });
  input.stationResult.result.selectedEntryStations[0].requiredAxialSpanM = 0.16;
  const result = planner.planInterfaces(input);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  const instancesOut = result.result.mountPlans[0].instances;
  assert.equal(instancesOut.length, 2);
  const [first, second] = instancesOut;
  for (const key of ["faceOriginM", "driverAxis"]) {
    const expected = rotateX(first[key], Math.PI);
    second[key].forEach((value, index) => close(value, expected[index]));
  }
  for (const key of ["originM", "normal", "axialTangent", "crossTangent"]) {
    const expected = rotateX(first.wallFrame[key], Math.PI);
    second.wallFrame[key].forEach(
      (value, index) => close(value, expected[index]),
    );
  }
  assert.equal(
    codes(result).includes(
      planner.failureCodes.INSTANCE_APERTURE_CONTRACT_UNSUPPORTED,
    ),
    false,
  );
  assert.equal(result.result.downstreamCompatibility.passageSolverV1, true);
  assert.equal(result.result.downstreamCompatibility.mountSolverV1, true);
});

test("driver faces are outside the wall and every passage leaves perpendicular to that face", () => {
  const result = planner.planInterfaces(fixture());
  assert.equal(result.ok, true);
  const mount = result.result.mountPlans[0].instances[0];
  const outwardOffset = dot(
    add(mount.faceOriginM, scale(mount.wallFrame.originM, -1)),
    mount.wallFrame.normal,
  );
  assert.ok(outwardOffset > 0);
  close(outwardOffset, 0.06);
  const iface = result.result.driverChamberInterfaces[0];
  for (const aperture of iface.apertures) {
    close(dot(
      aperture.driverEndpoint.flowDirection,
      aperture.driverEndpoint.surfaceNormal,
    ), 1);
    assert.deepEqual(
      aperture.driverEndpoint.localFrame.axial,
      aperture.driverEndpoint.flowDirection,
    );
  }
});

test("multi-instance templates get unique layouts, candidates, apertures, interfaces, passages, and chambers", () => {
  const result = planner.planInterfaces(fixture({ count: 2 }));
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  const layouts = result.result.apertureLayouts;
  assert.equal(layouts.length, 2);
  assert.equal(new Set(layouts.map(item => item.id)).size, 2);
  assert.equal(
    new Set(layouts.map(item => item.selectedCandidateId)).size,
    2,
  );
  const physicalApertures = layouts.flatMap(item => item.candidate.apertures);
  assert.equal(new Set(physicalApertures.map(item => item.id)).size, 4);
  assert.equal(
    new Set(physicalApertures.map(item => item.templateApertureId)).size,
    2,
  );
  const interfaces = result.result.driverChamberInterfaces;
  assert.equal(new Set(interfaces.map(item => item.id)).size, 2);
  assert.equal(new Set(interfaces.map(item => item.chamber.id)).size, 2);
  const bindings = result.result.mountPlans[0].instances.flatMap(
    item => item.apertureBindings,
  );
  assert.equal(new Set(bindings.map(item => item.apertureId)).size, 4);
  assert.equal(new Set(bindings.map(item => item.passageId)).size, 4);
  assert.ok(bindings.every(item => item.templateApertureId));
});

test("panel-pair records are explicit, parallel, right-handed, and consume every instance", () => {
  const result = planner.planInterfaces(fixture({
    count: 4,
    distribution: "panel-pairs",
  }));
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  const plan = result.result.mountPlans[0];
  assert.equal(plan.instances.length, 4);
  assert.equal(plan.panels.length, 2);
  assert.deepEqual(
    plan.panels.flatMap(item => item.instanceIds).sort(),
    plan.instances.map(item => item.id).sort(),
  );
  for (const panel of plan.panels) {
    close(dot(cross(panel.uAxis, panel.vAxis), panel.normal), 1);
    const pair = panel.instanceIds.map(id =>
      plan.instances.find(item => item.id === id)
    );
    close(dot(pair[0].driverAxis, panel.normal), 1);
    close(dot(pair[1].driverAxis, panel.normal), 1);
    const midpoint = scale(add(
      pair[0].faceOriginM,
      pair[1].faceOriginM,
    ), 0.5);
    assert.deepEqual(midpoint, panel.originM);
  }
});

test("input permutations cannot change canonical physical identities or hash", () => {
  const firstInput = fixture({
    count: 4,
    distribution: "panel-pairs",
  });
  const secondInput = structuredClone(firstInput);
  secondInput.placementPlans[0].instances.reverse();
  secondInput.placementPlans[0].panels.reverse();
  secondInput.placementPlans[0].panels.forEach(panel =>
    panel.instanceIds.reverse()
  );
  secondInput.apertureResult.sources[0]
    .feasibleCandidates[0].apertures.reverse();

  const first = planner.planInterfaces(firstInput);
  const second = planner.planInterfaces(secondInput);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.hashInput, first.hashInput);
  assert.deepEqual(second.result, first.result);
});

test("state, station, driver, output, aperture, distribution, and count ownership fail closed", () => {
  const mutations = [
    input => { input.placementPlans[0].sourceId = "missing-source"; },
    input => { input.placementPlans[0].stationId = "missing-station"; },
    input => { input.placementPlans[0].bandId = "mid"; },
    input => { input.placementPlans[0].driverOutputId = "missing-output"; },
    input => { input.placementPlans[0].apertureCandidateId = "missing"; },
    input => { input.placementPlans[0].distributionFamily = "panel-pairs"; },
    input => { input.resolvedDrivers.sources[0].count = 2; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    assert.equal(
      planner.planInterfaces(input).ok,
      false,
      mutate.toString(),
    );
  }
});

test("state/station hashes are preserved exactly and conflicting aliases are refused", () => {
  const success = planner.planInterfaces(fixture());
  assert.equal(success.ok, true);
  assert.equal(success.preservedHashes.stateHash, "state-hash-fixture");
  assert.equal(
    success.preservedHashes.stationInputHash,
    "state-hash-fixture",
  );
  assert.equal(
    success.preservedHashes.hornSurfaceHash,
    "horn-surface-fixture",
  );
  assert.equal(
    success.preservedHashes.apertureHashInput,
    "aperture-layout:rotational",
  );

  const aliasConflict = fixture();
  aliasConflict.stateHashInput = "different-state-hash";
  const refusedAlias = planner.planInterfaces(aliasConflict);
  assert.equal(refusedAlias.ok, false);
  assert.ok(codes(refusedAlias).includes(
    planner.failureCodes.HASH_CONFLICT,
  ));

  const stationConflict = fixture();
  stationConflict.stationResult.result.inputHash = "different-state-hash";
  assert.equal(planner.planInterfaces(stationConflict).ok, false);
});

test("active-cone and documented output conflicts never become adapted geometry", () => {
  const host = fixture();
  host.placementPlans[0].construction.activeConeEnvelope.diameterM = 0.11;
  const hostResult = planner.planInterfaces(host);
  assert.equal(hostResult.ok, false);
  assert.ok(codes(hostResult).includes(
    planner.failureCodes.ACTIVE_CONE_CONFLICT,
  ));

  const output = fixture();
  output.resolvedDrivers.sources[0].driver.outputs[0].bandIds = ["mid"];
  const outputResult = planner.planInterfaces(output);
  assert.equal(outputResult.ok, false);
  assert.ok(codes(outputResult).includes(
    planner.failureCodes.OUTPUT_CONFLICT,
  ));
});

test("setback and axis policy are explicit and must place the face outside", () => {
  const missing = fixture();
  delete missing.placementPlans[0].mountSetbackM;
  assert.equal(planner.planInterfaces(missing).ok, false);

  const outward = fixture();
  outward.placementPlans[0].axisPolicy.normalSign = 1;
  assert.equal(planner.planInterfaces(outward).ok, false);

  const tangent = fixture();
  tangent.placementPlans[0].axisPolicy = {
    kind: "explicit-blend",
    normalSign: -1,
    blendFraction: 1,
    targetAxis: [1, 0.25, 0],
  };
  const tangentResult = planner.planInterfaces(tangent);
  assert.equal(tangentResult.ok, false);
  assert.ok(codes(tangentResult).includes(
    planner.failureCodes.SETBACK_INVALID,
  ));
});

test("host axial span and conservative full-driver clearance are enforced", () => {
  const span = fixture();
  span.stationResult.result.selectedEntryStations[0].requiredAxialSpanM =
    0.1;
  const spanResult = planner.planInterfaces(span);
  assert.equal(spanResult.ok, false);
  assert.ok(codes(spanResult).includes(
    planner.failureCodes.HOST_SPAN_INVALID,
  ));

  const collision = fixture({ count: 2 });
  collision.stationResult.result.selectedEntryStations[0]
    .circumferential.sourceAzimuthsRad = [0, 0];
  collision.placementPlans[0].instances[1].azimuthRad = 0;
  const collisionResult = planner.planInterfaces(collision);
  assert.equal(collisionResult.ok, false);
  assert.ok(codes(collisionResult).includes(
    planner.failureCodes.DRIVER_COLLISION,
  ));
});

test("curved paths require explicit permission and endpoint-tangent representation", () => {
  const hiddenCurve = fixture();
  hiddenCurve.placementPlans[0].pathSettings.family = "cubic-hermite";
  const refused = planner.planInterfaces(hiddenCurve);
  assert.equal(refused.ok, false);
  assert.ok(codes(refused).includes(
    planner.failureCodes.CURVED_PATH_UNREPRESENTED,
  ));

  const explicit = fixture();
  explicit.placementPlans[0].pathSettings = {
    ...pathSettings(),
    family: "cubic-hermite",
    representation: "cubic-hermite-endpoint-tangents",
    curvedAllowed: true,
    hornFlowDirectionLocal: [0.8, 0.6, 0],
  };
  const accepted = planner.planInterfaces(explicit);
  assert.equal(accepted.ok, true, JSON.stringify(accepted.diagnostics, null, 2));
  const aperture = accepted.result.driverChamberInterfaces[0].apertures[0];
  assert.equal(aperture.path.family, "cubic-hermite");
  assert.equal(aperture.path.curvedAllowed, true);
  assert.deepEqual(
    aperture.driverEndpoint.flowDirection,
    aperture.driverEndpoint.surfaceNormal,
  );
  assert.notDeepEqual(
    aperture.hornEndpoint.flowDirection,
    aperture.driverEndpoint.flowDirection,
  );
});

test("mouth, crossover, and product metadata cannot alter planned geometry", () => {
  const firstInput = fixture();
  const secondInput = structuredClone(firstInput);
  secondInput.state.intent.crossoversHz = { lowMid: 99, midHigh: 9999 };
  secondInput.state.intent.mouthLimitM = { width: 9, height: 8 };
  secondInput.state.horn.mouth = { widthM: 7, heightM: 6 };
  secondInput.state.sources[0].manufacturer = "ignored";
  secondInput.state.sources[0].model = "ignored";
  const first = planner.planInterfaces(firstInput);
  const second = planner.planInterfaces(secondInput);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(second.result.apertureLayouts, first.result.apertureLayouts);
  assert.deepEqual(
    second.result.driverChamberInterfaces,
    first.result.driverChamberInterfaces,
  );
  assert.deepEqual(second.result.mountPlans, first.result.mountPlans);
});

test("nonfinite, executable, cyclic, undefined, and class-instance inputs fail closed", () => {
  const nonfinite = fixture();
  nonfinite.placementPlans[0].mountSetbackM = Infinity;
  assert.equal(planner.planInterfaces(nonfinite).ok, false);

  const executable = fixture();
  executable.callback = () => {};
  assert.equal(planner.planInterfaces(executable).ok, false);

  const undefinedValue = fixture();
  undefinedValue.bad = undefined;
  assert.equal(planner.planInterfaces(undefinedValue).ok, false);

  const cyclic = fixture();
  cyclic.self = cyclic;
  assert.equal(planner.planInterfaces(cyclic).ok, false);

  const classInput = fixture();
  class Evidence {}
  classInput.evidence = new Evidence();
  assert.equal(planner.planInterfaces(classInput).ok, false);
});

test("analysis output contains no mesh, Boolean, manufacturing, or validation authority", () => {
  const result = planner.planInterfaces(fixture());
  assert.equal(result.ok, true);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(
    serialized,
    /verticesM|triangles|inspectionMesh|booleanUnionPerformed|booleanSubtractionPerformed/,
  );
  assert.equal(result.result.hardwareValidated, false);
  assert.equal(result.result.acousticValidated, false);
  assert.equal(result.result.exactSolid, false);
  assert.equal(result.result.manufacturing, false);
  assert.equal(result.result.stl, false);
  const preflight = planner.manufacturingPreflight("stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.exactSolid, false);
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
});
