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
const modulePath = path.join(appRoot, "threeway-mount-solver.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const solver = require(modulePath);
const mountHost = require(path.join(appRoot, "threeway-mount-host.js"));
const apertureSolver = require(
  path.join(appRoot, "threeway-aperture-solver.js"),
);
const lumenGeometry = require(
  path.join(appRoot, "threeway-lumen-geometry.js"),
);
const driverDb = require(path.join(appRoot, "threeway-driver-db.js"));
const TAU = 2 * Math.PI;

function close(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} vs ${expected} (tolerance ${tolerance})`,
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

function length(vector) {
  return Math.hypot(...vector);
}

function normalize(vector) {
  return scale(vector, 1 / length(vector));
}

function project(vector, normal) {
  return add(vector, scale(normal, -dot(vector, normal)));
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

function driverRecord() {
  const result = driverDb.validateDriverRecord({
    schemaVersion: 1,
    id: "driver-low-explicit",
    revision: 1,
    kind: "cone",
    bandIds: ["low"],
    frame: {
      shape: "round",
      diameterM: 0.26,
      depthM: 0.12,
      frontProjectionM: 0.004,
    },
    diaphragm: {
      effectiveAreaM2: 0.033,
      activeDiameterM: 0.22,
      geometry: {
        shape: "round",
        centerOffsetM: [0, 0],
      },
      provenanceRefs: ["prov-driver"],
    },
    outputs: [
      {
        id: "cone-front",
        bandIds: ["low"],
        kind: "front-diaphragm",
        geometry: {
          shape: "round",
          diameterM: 0.22,
          areaM2: 0.033,
        },
        acousticDatum: {
          kind: "front-chamber-boundary",
          offsetM: 0.025,
        },
        provenanceRefs: ["prov-driver"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["prov-driver"],
    },
    provenanceRefs: ["prov-driver"],
  });
  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
  return result;
}

function resolvedDrivers(count) {
  const validated = driverRecord();
  const registry = driverDb.createDriverRegistry([validated.record]);
  assert.equal(registry.ok, true);
  const result = driverDb.resolveSourceDrivers({
    sources: [
      {
        id: "source-low",
        driverRef: validated.record.id,
        count,
        bandIds: ["low"],
      },
    ],
  }, registry);
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  return result;
}

function apertureInput(panelParallel = false) {
  return {
    sourceId: "source-low",
    candidatePolicy: apertureSolver.candidatePolicy,
    allowedCounts: [2],
    driverEffectiveAreaM2: 0.033,
    areaPolicy: {
      mode: "target",
      summedAreaTargetM2: 0.002,
    },
    compressionRatioBounds: {
      minimum: 15,
      maximum: 18,
    },
    host: {
      id: "source-low-active-cone",
      role: "active-cone",
      shape: "circle",
      radiusM: 0.11,
    },
    apertureShape: {
      kind: "racetrack",
      lengthToWidthRatio: 3,
    },
    limits: {
      minimumWebM: 0.006,
      minimumEdgeM: 0.006,
      maximumApertureLongAxisM: 0.08,
      maximumApertureShortAxisM: 0.04,
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
      centerSpacingM: 0.07,
    },
    upperFrequencyHz: 1000,
    speedOfSoundMps: 343,
    wavelengthSpacingPolicy: "warn",
    provenance: {
      classification: "calculated-adaptation",
      evidenceRefs: ["analytic-aperture-fixture"],
    },
  };
}

function apertureLayout(panelParallel = false) {
  const result = apertureSolver.solveApertureLayout({
    sources: [apertureInput(panelParallel)],
  });
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  assert.equal(result.sources[0].feasibleCandidates.length, 1);
  return result;
}

function mountDatum(wallFrame, axisPolicy, faceOriginM) {
  const signed = scale(wallFrame.normal, axisPolicy.normalSign);
  const axis = axisPolicy.kind === "explicit-blend"
    ? normalize(add(
        scale(signed, 1 - axisPolicy.blendFraction),
        scale(axisPolicy.targetAxis, axisPolicy.blendFraction),
      ))
    : signed;
  const uAxis = normalize(project(wallFrame.axialTangent, axis));
  return {
    originM: faceOriginM,
    normal: axis,
    uAxis,
    vAxis: normalize(cross(axis, uAxis)),
  };
}

function buildPassages(
  instanceId,
  stationId,
  sourceId,
  candidate,
  datum,
  wallOriginM,
  wallNormal,
) {
  return candidate.apertures.map(aperture => {
    const offset = add(
      scale(datum.uAxis, aperture.centerM.x),
      scale(datum.vAxis, aperture.centerM.y),
    );
    const driverPoint = add(datum.originM, offset);
    const hornPoint = add(wallOriginM, offset);
    const id = `lumen:${instanceId}:${String(
      aperture.index + 1,
    ).padStart(2, "0")}`;
    const result = lumenGeometry.buildCanonicalLumen({
      id,
      ownerStationId: stationId,
      ownerSourceId: sourceId,
      driverEndpoint: {
        pointM: driverPoint,
        flowDirection: datum.normal,
        surfaceNormal: datum.normal,
        datum: "front-chamber-boundary",
      },
      hornEndpoint: {
        pointM: hornPoint,
        flowDirection: datum.normal,
        surfaceNormal: wallNormal,
        datum: "inner-horn-surface",
      },
      path: {
        samples: 9,
        driverTangentScaleM: 0.02,
        hornTangentScaleM: 0.02,
        upHint: datum.uAxis,
      },
      startSection: {
        family: aperture.shape.kind,
        widthM: aperture.shape.longAxisM,
        heightM: aperture.shape.shortAxisM,
        rotationRad: aperture.angleRad,
      },
      endSection: {
        family: aperture.shape.kind,
        widthM: aperture.shape.longAxisM,
        heightM: aperture.shape.shortAxisM,
        rotationRad: aperture.angleRad,
      },
      areaProgression: "constant",
      sectionSegments: 32,
      provenanceRefs: ["prov-passage"],
    });
    assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
    const passage = {
      schemaVersion: 1,
      id,
      apertureId: aperture.id,
      layoutId: `layout:${sourceId}`,
      stationId,
      sourceId,
      bandId: "low",
      driverInstanceId: instanceId,
      driverRecordId: "driver-low-explicit",
      canonicalOwnership: {
        interfaceId: `interface:${instanceId}`,
        ownerCount: 1,
        canonical: true,
      },
      canonicalLumenIntent: result.record,
      negativeInspectionMesh: {
        role: result.mesh.role,
        verticesM: result.mesh.verticesM,
        triangles: result.mesh.triangles,
        audit: result.mesh.audit,
        manufacturingAuthority: false,
      },
      negativeInspectionAudit: result.mesh.audit,
      geometryHashInput: result.hashInput,
      canonicalNegative: true,
      subtractedFromPositiveHosts: false,
      exactSolid: false,
      manufacturing: false,
      stl: false,
      hashInput: `meh3-passage-v1\n${id}\n${result.hashInput}`,
    };
    return {
      passage,
      binding: {
        apertureId: aperture.id,
        passageId: id,
      },
    };
  });
}

function passageResult(passages) {
  const sortedHashes = passages
    .map(passage => passage.hashInput)
    .sort();
  return {
    ok: true,
    code: null,
    result: {
      schemaVersion: 1,
      passages,
      invariants: {
        oneCanonicalLumenPerAperture: true,
      },
      exactSolid: false,
      manufacturing: false,
      stl: false,
    },
    diagnostics: [],
    hashInput: `meh3-passage-solve-v1\n${sortedHashes.join("\n")}`,
    manufacturing: false,
    stl: false,
  };
}

function construction() {
  return {
    mode: "integrated-solid",
    host: {
      thicknessM: 0.012,
      edgeExtensionM: 0.005,
    },
    activeConeEnvelope: {
      shape: "round",
      diameterM: 0.22,
      centerOffsetM: [0, 0],
      provenanceRefs: ["prov-driver"],
    },
    constraints: {
      axisToleranceDeg: 1,
      minimumWebM: 0.006,
      minimumEdgeM: 0.006,
      datumToleranceM: 1e-7,
    },
    inspection: { segments: 32 },
  };
}

function validation() {
  return {
    positionToleranceM: 1e-7,
    sectionToleranceM: 1e-9,
    angleToleranceDeg: 1e-4,
    azimuthToleranceRad: 1e-7,
    minimumDriverClearanceM: 0.005,
  };
}

function stationResult({
  count,
  distribution,
  azimuths,
  axialSpanM,
}) {
  return {
    ok: true,
    code: null,
    result: {
      schemaVersion: 2,
      topology: "T3",
      hornSurfaceHash: "hs1-mount-fixture",
      optimization: "balanced",
      selectedEntryStations: [
        {
          stationId: "station-low",
          order: 2,
          role: "wall-entry",
          bandIds: ["low"],
          sourceIds: ["source-low"],
          sourceCount: count,
          axialM: 0.08,
          requiredAxialSpanM: axialSpanM,
          distribution,
          circumferential: {
            sourceAzimuthsRad: azimuths,
          },
          hornQuery: {
            surfaceRevision: "hs1-mount-fixture",
          },
          provenanceRefs: ["prov-station"],
        },
      ],
      manufacturing: false,
    },
    diagnostics: [],
    hashInput: `meh3-station-fixture:${distribution}:${count}`,
    manufacturing: false,
  };
}

function rotationalFixture({
  blendFraction = null,
} = {}) {
  const count = 2;
  const sourceId = "source-low";
  const stationId = "station-low";
  const apertureResult = apertureLayout(false);
  const candidate = apertureResult.sources[0].feasibleCandidates[0];
  const axisPolicy = blendFraction === null
    ? {
        kind: "wall-normal",
        normalSign: -1,
      }
    : {
        kind: "explicit-blend",
        normalSign: -1,
        blendFraction,
        targetAxis: [1, 0, 0],
      };
  const instances = [];
  const passages = [];
  for (let index = 0; index < count; index++) {
    const azimuthRad = index * Math.PI;
    const outward = rotateX([0, 1, 0], azimuthRad);
    const axial = [1, 0, 0];
    const crossTangent = rotateX([0, 0, 1], azimuthRad);
    const faceOriginM = rotateX([0.08, 0.18, 0], azimuthRad);
    const provisionalWall = {
      normal: outward,
      axialTangent: axial,
      crossTangent,
    };
    const provisionalDatum = mountDatum(
      provisionalWall,
      axisPolicy,
      faceOriginM,
    );
    const wallOriginM = blendFraction === null
      ? rotateX([0.08, 0.12, 0], azimuthRad)
      : add(faceOriginM, scale(provisionalDatum.normal, 0.06));
    const wallFrame = {
      originM: wallOriginM,
      normal: outward,
      axialTangent: axial,
      crossTangent,
    };
    const datum = mountDatum(wallFrame, axisPolicy, faceOriginM);
    const instanceId = `source-low/driver-${String(index + 1).padStart(
      2,
      "0",
    )}`;
    const passagesForInstance = buildPassages(
      instanceId,
      stationId,
      sourceId,
      candidate,
      datum,
      wallOriginM,
      outward,
    );
    passages.push(...passagesForInstance.map(item => item.passage));
    instances.push({
      id: instanceId,
      azimuthRad,
      panelId: null,
      faceOriginM,
      wallFrame,
      apertureBindings: passagesForInstance.map(item => item.binding),
      auxiliaryNegatives: [],
      provenanceRefs: ["prov-instance"],
    });
  }
  return {
    schemaVersion: 2,
    stationResult: stationResult({
      count,
      distribution: "rotational",
      azimuths: [0, Math.PI],
      axialSpanM: blendFraction === null ? 0.04 : 0.1,
    }),
    apertureResult,
    passageResult: passageResult(passages),
    resolvedDrivers: resolvedDrivers(count),
    mountPlans: [
      {
        sourceId,
        stationId,
        distributionFamily: "rotational",
        apertureCandidateId: candidate.id,
        axisPolicy,
        construction: construction(),
        instances,
        panels: [],
        provenanceRefs: ["prov-plan"],
      },
    ],
    validation: validation(),
  };
}

function panelFixture({
  pairOffsetM = 0.16,
  rotatePanelBasis = false,
} = {}) {
  const count = 4;
  const sourceId = "source-low";
  const stationId = "station-low";
  const apertureResult = apertureLayout(true);
  const candidate = apertureResult.sources[0].feasibleCandidates[0];
  const axisPolicy = {
    kind: "wall-normal",
    normalSign: -1,
  };
  const instances = [];
  const panels = [];
  const passages = [];
  for (let panelIndex = 0; panelIndex < 2; panelIndex++) {
    const azimuthRad = panelIndex * Math.PI;
    const outward = rotateX([0, 1, 0], azimuthRad);
    const driverNormal = scale(outward, -1);
    const axial = [1, 0, 0];
    const crossTangent = rotateX([0, 0, 1], azimuthRad);
    const panelOriginM = rotateX([0.08, 0.22, 0], azimuthRad);
    const panelId = `panel-${panelIndex + 1}`;
    const panelU = rotatePanelBasis
      ? rotateX([0, 0, 1], azimuthRad)
      : axial;
    const panelV = rotatePanelBasis
      ? rotateX([-1, 0, 0], azimuthRad)
      : crossTangent;
    const pairIds = [];
    for (const side of [-1, 1]) {
      const instanceOrdinal = panelIndex * 2 + (side === -1 ? 1 : 2);
      const instanceId = `source-low/driver-${String(
        instanceOrdinal,
      ).padStart(2, "0")}`;
      const faceOriginM = add(
        panelOriginM,
        scale(axial, side * pairOffsetM),
      );
      const wallOriginM = add(
        rotateX([0.08, 0.12, 0], azimuthRad),
        scale(axial, side * pairOffsetM),
      );
      const wallFrame = {
        originM: wallOriginM,
        normal: outward,
        axialTangent: axial,
        crossTangent,
      };
      const datum = mountDatum(wallFrame, axisPolicy, faceOriginM);
      const passagesForInstance = buildPassages(
        instanceId,
        stationId,
        sourceId,
        candidate,
        datum,
        wallOriginM,
        outward,
      );
      passages.push(...passagesForInstance.map(item => item.passage));
      instances.push({
        id: instanceId,
        azimuthRad,
        panelId,
        faceOriginM,
        wallFrame,
        apertureBindings: passagesForInstance.map(item => item.binding),
        auxiliaryNegatives: [],
        provenanceRefs: ["prov-instance"],
      });
      pairIds.push(instanceId);
    }
    panels.push({
      id: panelId,
      originM: panelOriginM,
      normal: driverNormal,
      uAxis: panelU,
      vAxis: panelV,
      azimuthRad,
      instanceIds: pairIds,
    });
  }
  return {
    schemaVersion: 2,
    stationResult: stationResult({
      count,
      distribution: "panel-pairs",
      azimuths: [0, 0, Math.PI, Math.PI],
      axialSpanM: 0.4,
    }),
    apertureResult,
    passageResult: passageResult(passages),
    resolvedDrivers: resolvedDrivers(count),
    mountPlans: [
      {
        sourceId,
        stationId,
        distributionFamily: "panel-pairs",
        apertureCandidateId: candidate.id,
        axisPolicy,
        construction: construction(),
        instances,
        panels,
        provenanceRefs: ["prov-plan"],
      },
    ],
    validation: validation(),
  };
}

function diagnosticCodes(result) {
  return result.diagnostics.map(item => item.code);
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`);
  }
}

test("module is UMD-safe, host-injected, immutable, and has no mesh implementation", () => {
  assert.equal(solver.version, 1);
  assert.equal(solver.schemaVersion, 2);
  assert.equal(solver.capabilities.driverMotion, false);
  assert.equal(solver.capabilities.driverCountInference, false);
  assert.equal(solver.capabilities.coneDimensionInference, false);
  assert.equal(solver.capabilities.lumenBending, false);
  assert.equal(solver.capabilities.booleanUnion, false);
  assert.equal(solver.capabilities.booleanSubtraction, false);
  assert.equal(solver.capabilities.manufacturing, false);
  assert.equal(solver.capabilities.stl, false);
  assert.ok(Object.isFrozen(solver));

  const requires = [...moduleSource.matchAll(
    /require\(\s*["']([^"']+)["']\s*\)/g,
  )].map(match => match[1]);
  assert.deepEqual(requires, ["./threeway-mount-host.js"]);
  assert.doesNotMatch(
    moduleSource,
    /buildInspectionMesh|triangles\.push|vertices\.push|marching|Boolean\(/,
  );
  assert.doesNotMatch(moduleSource, /\bdocument\b|\bwindow\b|THREE\./);

  const browserGlobal = { MEH3MountHost: mountHost };
  const context = vm.createContext({
    globalThis: browserGlobal,
  });
  vm.runInContext(moduleSource, context, { filename: modulePath });
  assert.equal(
    typeof browserGlobal.MEH3MountSolver.solveSourceMounts,
    "function",
  );
  assert.equal(
    browserGlobal.MEH3MountSolver.capabilities.manufacturing,
    false,
  );
});

test("rotational sources produce one delegated full-face host per physical driver", () => {
  const input = rotationalFixture();
  const before = JSON.stringify(input);
  const calls = [];
  const injected = solver.createMountSolver({
    ...mountHost,
    buildMountHost(hostInput) {
      calls.push(hostInput);
      return mountHost.buildMountHost(hostInput);
    },
  });
  const result = injected.solveSourceMounts(input);

  assert.equal(
    JSON.stringify(input),
    before,
    "mount solve mutated its input",
  );
  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
  assert.equal(calls.length, 2);
  assert.equal(result.result.mounts.length, 2);
  assert.deepEqual(
    result.result.mounts.map(item => item.instanceId),
    ["source-low/driver-01", "source-low/driver-02"],
  );
  const passagesById = new Map(
    input.passageResult.result.passages.map(passage => [
      passage.id,
      passage,
    ]),
  );
  for (const mount of result.result.mounts) {
    assert.equal(mount.mountHost.positiveHost.fullFace, true);
    assert.equal(mount.mountHost.positiveHost.centerOpen, false);
    assert.equal(
      mount.mountHost.positiveHost.booleanUnionPerformed,
      false,
    );
    assert.equal(
      mount.mountHost.negativeIntents.booleanSubtractionPerformed,
      false,
    );
    assert.equal(mount.apertureBindings.length, 2);
    assert.ok(
      mount.apertureBindings.every(binding =>
        binding.canonicalLumenThroughHostIntent === true &&
        binding.booleanSubtractionPerformed === false),
    );
    for (const binding of mount.apertureBindings) {
      const passage = passagesById.get(binding.passageId);
      assert.equal(binding.passageHashInput, passage.hashInput);
      assert.equal(
        binding.canonicalLumenHashInput,
        passage.geometryHashInput,
      );
      assert.deepEqual(
        binding.negativeInspectionMesh,
        passage.negativeInspectionMesh,
      );
    }
    assert.equal(mount.driverFaceAxisPolicy.kind, "wall-normal");
    assert.equal(mount.driverFaceAxisPolicy.normalSign, -1);
    assert.equal(mount.driverEnvelope.inferredDimensions, false);
    assert.equal(mount.hardwareValidated, false);
    assert.equal(mount.manufacturing, false);
  }
  assert.equal(
    result.result.invariants.oneFullFaceHostPerPhysicalDriver,
    true,
  );
  assert.equal(result.result.invariants.driverMoved, false);
  assert.equal(result.result.invariants.lumenPathMutated, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
  assert.match(result.hashInput, /^meh3-mount-solve-v1\n/);
  assertDeepFrozen(result);
});

test("keyed output and host records are independent of every input array permutation", () => {
  const firstInput = rotationalFixture();
  const secondInput = structuredClone(firstInput);
  secondInput.passageResult.result.passages.reverse();
  secondInput.resolvedDrivers.sources.reverse();
  secondInput.apertureResult.sources.reverse();
  secondInput.stationResult.result.selectedEntryStations.reverse();
  secondInput.mountPlans.reverse();
  for (const plan of secondInput.mountPlans) {
    plan.instances.reverse();
    plan.panels.reverse();
    for (const instance of plan.instances) {
      instance.apertureBindings.reverse();
      instance.auxiliaryNegatives.reverse();
    }
  }

  const first = solver.solveSourceMounts(firstInput);
  const second = solver.solveSourceMounts(secondInput);
  assert.equal(first.ok, true, first.diagnostics?.[0]?.message);
  assert.equal(second.ok, true, second.diagnostics?.[0]?.message);
  assert.equal(second.hashInput, first.hashInput);
  assert.deepEqual(second.result, first.result);
});

test("panel pairs preserve pair/rotational symmetry and parallel tap axes on each panel", () => {
  const input = panelFixture();
  const result = solver.solveSourceMounts(input);
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  assert.equal(result.result.mounts.length, 4);
  assert.deepEqual(
    [...new Set(result.result.mounts.map(item => item.panelId))].sort(),
    ["panel-1", "panel-2"],
  );

  for (const panelId of ["panel-1", "panel-2"]) {
    const mounts = result.result.mounts.filter(
      item => item.panelId === panelId,
    );
    assert.equal(mounts.length, 2);
    const axes = mounts.flatMap(mount =>
      mount.apertureBindings.map(binding => {
        const aperture = input.apertureResult.sources[0]
          .feasibleCandidates[0].apertures.find(
            item => item.id === binding.apertureId,
          );
        return normalize(add(
          scale(mount.mountDatum.uAxis, Math.cos(aperture.angleRad)),
          scale(mount.mountDatum.vAxis, Math.sin(aperture.angleRad)),
        ));
      }),
    );
    for (let index = 1; index < axes.length; index++) {
      close(Math.abs(dot(axes[0], axes[index])), 1, 1e-12,
        `${panelId} tap-axis parallelism`);
    }
  }
  assert.equal(result.result.invariants.panelTapAxesParallel, true);
  assert.equal(result.result.invariants.symmetryValidated, true);
});

test("explicit blend is admitted without moving faces or altering passages", () => {
  const input = rotationalFixture({ blendFraction: 0.2 });
  const faceOrigins = input.mountPlans[0].instances.map(
    item => structuredClone(item.faceOriginM),
  );
  const passageHashes = input.passageResult.result.passages.map(
    item => item.hashInput,
  );
  const result = solver.solveSourceMounts(input);

  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  for (let index = 0; index < result.result.mounts.length; index++) {
    const mount = result.result.mounts[index];
    assert.equal(mount.driverFaceAxisPolicy.kind, "explicit-blend");
    assert.equal(mount.driverFaceAxisPolicy.blendFraction, 0.2);
    assert.deepEqual(mount.mountDatum.originM, faceOrigins[index]);
  }
  assert.deepEqual(
    result.result.mounts.flatMap(mount =>
      mount.apertureBindings.map(binding => binding.passageHashInput),
    ).sort(),
    passageHashes.slice().sort(),
  );
  assert.equal(result.result.invariants.driverMoved, false);
  assert.equal(result.result.invariants.lumenBent, false);
});

test("count, ownership, and aperture/passage binding mismatches fail closed", () => {
  const missingInstance = rotationalFixture();
  missingInstance.mountPlans[0].instances.pop();
  const countResult = solver.solveSourceMounts(missingInstance);
  assert.equal(countResult.ok, false);
  assert.ok(diagnosticCodes(countResult).includes(
    "THREEWAY_MOUNT_SOLVER_COUNT_MISMATCH",
  ));
  assert.equal(countResult.result, null);

  const wrongOwner = rotationalFixture();
  wrongOwner.passageResult.result.passages[0].stationId = "other-station";
  const ownershipResult = solver.solveSourceMounts(wrongOwner);
  assert.equal(ownershipResult.ok, false);
  assert.ok(diagnosticCodes(ownershipResult).includes(
    "THREEWAY_MOUNT_SOLVER_OWNERSHIP_INVALID",
  ));

  const missingBinding = rotationalFixture();
  missingBinding.mountPlans[0].instances[0].apertureBindings.pop();
  const bindingResult = solver.solveSourceMounts(missingBinding);
  assert.equal(bindingResult.ok, false);
  assert.ok(diagnosticCodes(bindingResult).includes(
    "THREEWAY_MOUNT_SOLVER_APERTURE_BINDING_INVALID",
  ));
  assert.equal(bindingResult.manufacturing, false);
  assert.equal(bindingResult.stl, false);
});

test("unsupported axis policies and nonparallel shared-panel frames are typed refusals", () => {
  const unsupported = rotationalFixture();
  unsupported.mountPlans[0].axisPolicy = {
    kind: "radial-auto",
    normalSign: -1,
  };
  const axisResult = solver.solveSourceMounts(unsupported);
  assert.equal(axisResult.ok, false);
  assert.ok(diagnosticCodes(axisResult).includes(
    "THREEWAY_MOUNT_SOLVER_AXIS_POLICY_INVALID",
  ));

  const nonparallel = panelFixture({ rotatePanelBasis: true });
  const panelResult = solver.solveSourceMounts(nonparallel);
  assert.equal(panelResult.ok, false);
  assert.ok(diagnosticCodes(panelResult).includes(
    "THREEWAY_MOUNT_SOLVER_PANEL_ORIENTATION_INVALID",
  ));
});

test("active-cone mismatch and full driver-body collision remain stable refusals", () => {
  const activeCone = rotationalFixture();
  activeCone.mountPlans[0].construction.activeConeEnvelope.diameterM = 0.2;
  const activeResult = solver.solveSourceMounts(activeCone);
  assert.equal(activeResult.ok, false);
  assert.ok(diagnosticCodes(activeResult).includes(
    "THREEWAY_ACTIVE_CONE_COVERAGE_FAILED",
  ));

  const collision = panelFixture({ pairOffsetM: 0.05 });
  const collisionResult = solver.solveSourceMounts(collision);
  assert.equal(collisionResult.ok, false);
  assert.ok(diagnosticCodes(collisionResult).includes(
    "THREEWAY_DRIVER_COLLISION",
  ));
  assert.equal(collisionResult.result, null);
});

test("passage-solver ownership and inspection-mesh contracts fail closed", () => {
  const missingInvariant = rotationalFixture();
  delete missingInvariant.passageResult.result.invariants;
  const invariantResult = solver.solveSourceMounts(missingInvariant);
  assert.equal(invariantResult.ok, false);
  assert.ok(diagnosticCodes(invariantResult).includes(
    "THREEWAY_MOUNT_SOLVER_PASSAGE_RESULT_INVALID",
  ));

  const missingMesh = rotationalFixture();
  delete missingMesh.passageResult.result.passages[0]
    .negativeInspectionMesh;
  const meshResult = solver.solveSourceMounts(missingMesh);
  assert.equal(meshResult.ok, false);
  assert.ok(diagnosticCodes(meshResult).includes(
    "THREEWAY_MOUNT_SOLVER_PASSAGE_RESULT_INVALID",
  ));

  const sharedOwner = rotationalFixture();
  sharedOwner.passageResult.result.passages[0]
    .canonicalOwnership.ownerCount = 2;
  const ownerResult = solver.solveSourceMounts(sharedOwner);
  assert.equal(ownerResult.ok, false);
  assert.ok(diagnosticCodes(ownerResult).includes(
    "THREEWAY_MOUNT_SOLVER_OWNERSHIP_INVALID",
  ));
});

test("manufacturing, Boolean, and STL preflight always refuse", () => {
  const preflight = solver.manufacturingPreflight("union-subtract-export");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.available, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.booleanUnion, false);
  assert.equal(preflight.booleanSubtraction, false);
  assert.equal(preflight.exactSolid, false);
  assert.equal(preflight.hardwareValidated, false);
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
  assertDeepFrozen(preflight);
});
