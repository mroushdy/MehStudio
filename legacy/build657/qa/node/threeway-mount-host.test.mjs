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
const mountPath = path.join(appRoot, "threeway-mount-host.js");
const mountSource = fs.readFileSync(mountPath, "utf8");
const mount = require(mountPath);
const drivers = require(path.join(appRoot, "threeway-driver-db.js"));
const lumens = require(path.join(appRoot, "threeway-lumen-geometry.js"));

function driverRecord(shape = "round") {
  const frame = shape === "round"
    ? {
        shape: "round",
        diameterM: 0.26,
        depthM: 0.12,
        frontProjectionM: 0.004,
      }
    : {
        shape: "rounded-rectangle",
        widthM: 0.24,
        heightM: 0.18,
        cornerRadiusM: 0.02,
        depthM: 0.12,
        frontProjectionM: 0.004,
      };
  return drivers.validateDriverRecord({
    schemaVersion: 1,
    id: `driver-${shape}`,
    revision: 1,
    kind: "cone",
    bandIds: ["low"],
    frame,
    diaphragm: {
      effectiveAreaM2: 0.033,
      activeDiameterM: shape === "round" ? 0.22 : 0.16,
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
          diameterM: shape === "round" ? 0.22 : 0.16,
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
}

function lumenAt(
  id,
  y,
  {
    axis = [1, 0, 0],
    stationId = "station-low",
    sourceId = "source-low",
  } = {},
) {
  const unitLength = Math.hypot(...axis);
  const unit = axis.map(value => value / unitLength);
  return lumens.buildCanonicalLumen({
    id,
    ownerStationId: stationId,
    ownerSourceId: sourceId,
    driverEndpoint: {
      pointM: [0, y, 0],
      flowDirection: unit,
      surfaceNormal: unit,
      datum: "front-chamber-boundary",
    },
    hornEndpoint: {
      pointM: [0.08, y + 0.08 * unit[1], 0],
      flowDirection: unit,
      surfaceNormal: unit,
      datum: "inner-horn-surface",
    },
    path: {
      samples: 9,
      driverTangentScaleM: 0.026,
      hornTangentScaleM: 0.026,
      upHint: [0, 0, 1],
    },
    startSection: {
      family: "racetrack",
      widthM: 0.03,
      heightM: 0.01,
    },
    endSection: {
      family: "racetrack",
      widthM: 0.03,
      heightM: 0.01,
    },
    areaProgression: "constant",
    sectionSegments: 32,
    provenanceRefs: ["prov-lumen"],
  });
}

function validInput(shape = "round") {
  const rounded = shape === "rounded-rectangle";
  return {
    id: "mount-low-1",
    mode: "integrated-solid",
    ownerSourceId: "source-low",
    ownerStationId: "station-low",
    driverRecord: driverRecord(shape),
    mountDatum: {
      originM: [0, 0, 0],
      normal: [1, 0, 0],
      uAxis: [0, 1, 0],
      vAxis: [0, 0, 1],
    },
    driverAxis: [1, 0, 0],
    host: {
      thicknessM: 0.012,
      edgeExtensionM: rounded ? 0.002 : 0.005,
    },
    activeConeEnvelope: {
      shape: "round",
      diameterM: rounded ? 0.16 : 0.22,
      centerOffsetM: [0, 0],
      provenanceRefs: ["prov-driver"],
    },
    lumenNegatives: rounded
      ? [lumenAt("lumen-low-a", -0.025), lumenAt("lumen-low-b", 0.025)]
      : [lumenAt("lumen-low-a", -0.04), lumenAt("lumen-low-b", 0.04)],
    auxiliaryNegatives: [],
    constraints: {
      axisToleranceDeg: 1,
      minimumWebM: 0.006,
      minimumEdgeM: 0.006,
      datumToleranceM: 1e-6,
    },
    inspection: { segments: 64 },
  };
}

function codes(result) {
  return result.diagnostics.map(item => item.code);
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`);
  }
}

test("two taps keep one solid full-frame positive host rather than a ring or skin", () => {
  const input = validInput();
  const before = structuredClone(input);
  const result = mount.buildMountHost(input);

  assert.deepEqual(input, before, "mount builder mutated its input");
  assert.equal(result.ok, true);
  assert.equal(result.record.positiveHost.role,
    "full-face-positive-solid-host-intent");
  assert.equal(result.record.positiveHost.positiveVolumeIntended, true);
  assert.equal(result.record.positiveHost.fullFace, true);
  assert.equal(result.record.positiveHost.centerOpen, false);
  assert.equal(result.record.positiveHost.decorativeSkin, false);
  assert.equal(result.record.positiveHost.faceEnvelope.shape, "round");
  assert.equal(result.record.positiveHost.faceEnvelope.diameterM, 0.27);
  assert.equal(
    result.record.negativeIntents.acousticLumens.length,
    2,
  );
  assert.ok(
    result.record.positiveHost.faceEnvelope.diameterM >
      Math.abs(
        result.record.negativeIntents.acousticLumens[1]
          .startCenterOffsetM[0] -
        result.record.negativeIntents.acousticLumens[0]
          .startCenterOffsetM[0],
      ),
    "host collapsed to tap-pair width",
  );
  assert.equal(result.inspectionMesh.fullFace, true);
  assert.equal(result.inspectionMesh.centerOpen, false);
  assert.equal(result.inspectionMesh.negativesApplied, false);
  assert.equal(result.inspectionMesh.audit.openEdges, 0);
  assert.equal(result.inspectionMesh.audit.nonManifoldEdges, 0);
  assert.equal(result.inspectionMesh.audit.degenerateTriangles, 0);
  assert.equal(result.inspectionMesh.audit.outwardOrientation, true);
  assert.equal(result.manufacturing, false);
  assertDeepFrozen(result);
});

test("rounded-rectangle detachable host spans both frame and gasket envelopes", () => {
  const input = validInput("rounded-rectangle");
  input.mode = "detachable-gasketed";
  input.gasketEnvelope = {
    shape: "rounded-rectangle",
    widthM: 0.25,
    heightM: 0.19,
    cornerRadiusM: 0.025,
    provenanceRefs: ["prov-gasket"],
  };
  const result = mount.buildMountHost(input);

  assert.equal(result.ok, true);
  assert.equal(result.record.mode, "detachable-gasketed");
  assert.equal(result.record.positiveHost.attachmentIntent,
    "detachable-gasketed-host");
  assert.equal(result.record.positiveHost.faceEnvelope.shape,
    "rounded-rectangle");
  assert.equal(result.record.positiveHost.faceEnvelope.widthM, 0.254);
  assert.equal(result.record.positiveHost.faceEnvelope.heightM, 0.194);
  assert.equal(
    result.record.positiveHost.documentedGasketEnvelope.widthM,
    0.25,
  );
  assert.equal(result.inspectionMesh.audit.closed, true);
  assert.equal(result.inspectionMesh.audit.twoManifold, true);
});

test("central non-lumen through-hole is refused", () => {
  const input = validInput();
  input.auxiliaryNegatives.push({
    id: "forbidden-center-hole",
    type: "clearance-negative",
    ownerSourceId: "source-low",
    ownerStationId: "station-low",
    centerOffsetM: [0, 0],
    section: { family: "round", diameterM: 0.08 },
    throughHost: true,
    purpose: "central driver cutout",
  });
  const result = mount.buildMountHost(input);

  assert.equal(result.ok, false);
  assert.equal(result.inspectionMesh, null);
  assert.ok(codes(result).includes(
    "THREEWAY_MOUNT_CENTRAL_HOLE_REFUSED"));
  assert.equal(result.record.positiveHost, null);
  assert.equal(result.manufacturing, false);
});

test("funky datum rotation and driver-axis mismatch fail with stable codes", () => {
  const axisInput = validInput();
  axisInput.driverAxis = [1, 0.2, 0];
  const axisResult = mount.buildMountHost(axisInput);
  assert.equal(axisResult.ok, false);
  assert.ok(codes(axisResult).includes("THREEWAY_MOUNT_AXIS_MISMATCH"));

  const datumInput = validInput();
  datumInput.mountDatum.vAxis = [0, 0, -1];
  const datumResult = mount.buildMountHost(datumInput);
  assert.equal(datumResult.ok, false);
  assert.ok(codes(datumResult).includes("THREEWAY_MOUNT_DATUM_INVALID"));
});

test("lumen entry axis must remain perpendicular to the driver face", () => {
  const input = validInput();
  const tilted = lumenAt("lumen-tilted", 0, { axis: [1, 0.1, 0] });
  assert.equal(tilted.ok, true, "fixture lumen should be canonical itself");
  input.lumenNegatives = [tilted];
  const result = mount.buildMountHost(input);

  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    "THREEWAY_MOUNT_LUMEN_AXIS_MISMATCH"));
  assert.equal(result.inspectionMesh, null);
});

test("minimum web failure is detected between canonical lumen starts", () => {
  const input = validInput();
  input.lumenNegatives = [
    lumenAt("lumen-close-a", -0.008),
    lumenAt("lumen-close-b", 0.008),
  ];
  const result = mount.buildMountHost(input);

  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    "THREEWAY_MOUNT_MINIMUM_WEB_FAILURE"));
  assert.equal(result.inspectionMesh, null);
});

test("missing full body or face envelope fails closed", () => {
  const missingFace = validInput();
  missingFace.driverRecord = structuredClone(
    missingFace.driverRecord.record,
  );
  delete missingFace.driverRecord.frame.diameterM;
  const faceResult = mount.buildMountHost(missingFace);
  assert.equal(faceResult.ok, false);
  assert.ok(codes(faceResult).includes(
    "THREEWAY_MOUNT_ENVELOPE_MISSING"));

  const missingBody = validInput();
  missingBody.driverRecord = structuredClone(
    missingBody.driverRecord.record,
  );
  delete missingBody.driverRecord.frame.frontProjectionM;
  const bodyResult = mount.buildMountHost(missingBody);
  assert.equal(bodyResult.ok, false);
  assert.ok(codes(bodyResult).includes(
    "THREEWAY_MOUNT_ENVELOPE_MISSING"));
});

test("every lumen start must remain within the active cone", () => {
  const input = validInput();
  input.lumenNegatives = [lumenAt("lumen-outside", 0.105)];
  const result = mount.buildMountHost(input);

  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    "THREEWAY_MOUNT_LUMEN_START_OUTSIDE_ACTIVE_CONE"));
});

test("source and station ownership are never guessed", () => {
  const input = validInput();
  input.lumenNegatives = [
    lumenAt("lumen-wrong-owner", 0, { stationId: "another-station" }),
  ];
  const result = mount.buildMountHost(input);

  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(
    "THREEWAY_MOUNT_LUMEN_OWNERSHIP_MISMATCH"));
});

test("ordering is deterministic and auxiliary negatives stay non-acoustic", () => {
  const first = validInput();
  first.auxiliaryNegatives = [
    {
      id: "fastener-z",
      type: "fastener-negative",
      ownerSourceId: "source-low",
      ownerStationId: "station-low",
      centerOffsetM: [0.12, 0],
      section: { family: "round", diameterM: 0.004 },
      throughHost: true,
      purpose: "retention",
    },
    {
      id: "fastener-a",
      type: "fastener-negative",
      ownerSourceId: "source-low",
      ownerStationId: "station-low",
      centerOffsetM: [-0.12, 0],
      section: { family: "round", diameterM: 0.004 },
      throughHost: true,
      purpose: "retention",
    },
  ];
  const second = structuredClone(first);
  second.lumenNegatives.reverse();
  second.auxiliaryNegatives.reverse();

  const a = mount.buildMountHost(first);
  const b = mount.buildMountHost(second);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.hashInput, b.hashInput);
  assert.deepEqual(
    a.record.negativeIntents.acousticLumens.map(item => item.id),
    ["lumen-low-a", "lumen-low-b"],
  );
  assert.deepEqual(
    a.record.negativeIntents.auxiliary.map(item => item.id),
    ["fastener-a", "fastener-z"],
  );
  assert.ok(
    a.record.negativeIntents.auxiliary.every(item =>
      item.acoustic === false),
  );
  assert.equal(
    a.record.negativeIntents.onlyCanonicalLumensAreAcoustic,
    true,
  );
});

test("manufacturing and Boolean claims fail closed", () => {
  const result = mount.buildMountHost(validInput());
  assert.equal(result.ok, true);
  assert.equal(result.record.positiveHost.booleanUnionPerformed, false);
  assert.equal(
    result.record.negativeIntents.booleanSubtractionPerformed,
    false,
  );
  assert.equal(result.record.manufacturingValidated, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.capabilities.booleanUnion, false);
  assert.equal(result.capabilities.booleanSubtraction, false);

  const preflight = mount.manufacturingPreflight("subtract-and-export");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.available, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.booleanUnion, false);
  assert.equal(preflight.booleanSubtraction, false);
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
});

test("UMD browser path exposes the same pure builder without dependencies", () => {
  const context = vm.createContext({ globalThis: {} });
  vm.runInContext(mountSource, context, { filename: mountPath });
  const browserApi = context.globalThis.MEH3MountHost;
  assert.ok(browserApi);
  assert.equal(typeof browserApi.buildMountHost, "function");
  assert.equal(typeof browserApi.manufacturingPreflight, "function");
  assert.deepEqual(
    JSON.parse(JSON.stringify(browserApi.modes)),
    ["integrated-solid", "detachable-gasketed"],
  );
});
