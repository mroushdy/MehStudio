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
const adapterPath = path.join(appRoot, "threeway-package-input.js");
const adapter = require(adapterPath);
const packageSolver = require(
  path.join(appRoot, "threeway-package-solver.js"),
);

function boxVertices(minM, maxM) {
  const result = [];
  for (const x of [minM[0], maxM[0]]) {
    for (const y of [minM[1], maxM[1]]) {
      for (const z of [minM[2], maxM[2]]) result.push([x, y, z]);
    }
  }
  return result;
}

function hornSurface() {
  return {
    ok: true,
    kind: "threeway-horn-surface",
    surfaceHash: "horn-surface-fixture",
    stations: [
      {
        axialM: 0,
        section: { widthM: 0.2, heightM: 0.1 },
      },
      {
        axialM: 0.2,
        section: { widthM: 0.4, heightM: 0.6 },
      },
      {
        axialM: 0.5,
        section: { widthM: 0.8, heightM: 0.3 },
      },
    ],
    manufacturing: false,
  };
}

function mount(instanceId = "low-1", yOffsetM = 0) {
  return {
    id: `mount-host:${instanceId}`,
    instanceId,
    sourceId: "source-low",
    stationId: "station-low",
    driverRecordId: "driver-low-documented",
    inspectionMesh: {
      verticesM: boxVertices(
        [0.1, 0.2 + yOffsetM, -0.05],
        [0.25, 0.45 + yOffsetM, 0.15],
      ),
    },
    driverEnvelope: {
      rearPointM: [0.16, 0.3 + yOffsetM, 0],
      frontPointM: [0.22, 0.32 + yOffsetM, 0.02],
      radiusM: 0.1,
      inferredDimensions: false,
      manufacturing: false,
    },
    mountHostHashInput: `mount-hash-${instanceId}`,
    provenanceRefs: ["documented-driver", "solved-mount"],
    manufacturing: false,
  };
}

function mountResult(mounts = [mount()]) {
  return {
    ok: true,
    code: null,
    result: {
      kind: "threeway-source-instance-mount-solution",
      mounts,
      manufacturing: false,
    },
    hashInput: "mount-result-hash",
    manufacturing: false,
    stl: false,
  };
}

function baseInput() {
  return {
    inputHash: "physics-input-hash",
    hornSurface: hornSurface(),
    mountResult: mountResult(),
    packageLimitM: {
      depthM: 1,
      widthM: 1.5,
      heightM: 1,
    },
    globalMarginM: 0.01,
    componentClearanceM: 0.002,
    additionalComponents: [
      {
        id: "rear-system:low",
        role: "rear-system",
        ownerId: "source-low",
        boundsM: {
          minM: [0.25, 0.2, -0.08],
          maxM: [0.4, 0.4, 0.1],
        },
        allowedOverlapIds: ["driver-body:low-1"],
        provenanceRefs: ["explicit-rear-envelope"],
        metadata: { description: "explicit test envelope" },
      },
      {
        id: "cabinet:left-wall",
        role: "cabinet-structure",
        boundsM: {
          minM: [0, -0.6, -0.4],
          maxM: [0.6, -0.5, 0.4],
        },
        clearanceM: 0.004,
        provenanceRefs: ["explicit-enclosure-envelope"],
      },
    ],
  };
}

function component(result, id) {
  return result.result.components.find(item => item.id === id);
}

function assertDeepFrozen(value) {
  assert.equal(Object.isFrozen(value), true);
  if (!value || typeof value !== "object") return;
  for (const nested of Object.values(value)) assertDeepFrozen(nested);
}

test("derives the exact canonical horn AABB from all station extents", () => {
  const input = baseInput();
  const before = structuredClone(input);
  const result = adapter.buildPackageInput(input);
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  assert.deepEqual(input, before);
  assert.deepEqual(result.result.horn, {
    id: "horn:horn-surface-fixture",
    boundsM: {
      minM: [0, -0.4, -0.3],
      maxM: [0.5, 0.4, 0.3],
    },
    provenanceRefs: [
      "threeway-horn-surface:horn-surface-fixture",
    ],
  });
});

test("derives exact mount bounds and conservative documented capsule bounds", () => {
  const result = adapter.buildPackageInput(baseInput());
  const mountHost = component(result, "mount-host:low-1");
  const driverBody = component(result, "driver-body:low-1");
  assert.deepEqual(mountHost.boundsM, {
    minM: [0.1, 0.2, -0.05],
    maxM: [0.25, 0.45, 0.15],
  });
  assert.deepEqual(driverBody.boundsM, {
    minM: [0.06, 0.19999999999999998, -0.1],
    maxM: [0.32, 0.42000000000000004, 0.12000000000000001],
  });
  assert.equal(mountHost.role, "mount-host");
  assert.equal(driverBody.role, "driver-body");
  assert.equal(mountHost.ownerId, "source-low");
  assert.equal(driverBody.ownerId, "source-low");
  assert.deepEqual(mountHost.allowedOverlapIds, ["driver-body:low-1"]);
  assert.deepEqual(driverBody.allowedOverlapIds, ["mount-host:low-1"]);
});

test("preserves only explicit rear and enclosure envelopes without geometry authority", () => {
  const result = adapter.buildPackageInput(baseInput());
  const rear = component(result, "rear-system:low");
  const cabinet = component(result, "cabinet:left-wall");
  assert.equal(rear.role, "rear-system");
  assert.equal(rear.ownerId, "source-low");
  assert.equal(rear.clearanceM, 0.002);
  assert.deepEqual(rear.metadata, {
    description: "explicit test envelope",
  });
  assert.equal(cabinet.role, "cabinet-structure");
  assert.equal(cabinet.clearanceM, 0.004);
  assert.equal(result.result.geometryMoved, false);
  assert.equal(result.result.geometryResized, false);
  assert.equal(result.result.manufacturing, false);
  assert.equal(result.capabilities.hornGrowth, false);
  assert.equal(result.capabilities.manufacturing, false);
  assert.equal(result.capabilities.stl, false);
});

test("output composes directly with the package solver", () => {
  const adapted = adapter.buildPackageInput(baseInput());
  const solved = packageSolver.solvePackageEnvelope(
    adapted.packageInput,
  );
  assert.equal(solved.result.driverEnvelopeCount, 1);
  assert.equal(solved.result.mountHostCount, 1);
  assert.equal(solved.result.automaticHornGrowth, false);
  assert.equal(solved.result.automaticComponentMotion, false);
  assert.ok(solved.diagnostics.some(item =>
    item.code === "THREEWAY_HORN_GROWTH_REQUIRED"));
});

test("canonical result is independent of mount and additional-component order", () => {
  const left = baseInput();
  left.mountResult = mountResult([
    mount("low-1", 0),
    mount("low-2", -0.7),
  ]);
  const right = structuredClone(left);
  right.mountResult.result.mounts.reverse();
  right.additionalComponents.reverse();
  const first = adapter.buildPackageInput(left);
  const second = adapter.buildPackageInput(right);
  assert.equal(first.ok, true, first.diagnostics?.[0]?.message);
  assert.equal(second.ok, true, second.diagnostics?.[0]?.message);
  assert.equal(first.hashInput, second.hashInput);
  assert.deepEqual(first.packageInput, second.packageInput);
});

test("missing provenance hash, stale mount failures, or inferred drivers fail closed", () => {
  const missingHash = baseInput();
  delete missingHash.inputHash;
  assert.equal(adapter.buildPackageInput(missingHash).code,
    "THREEWAY_PACKAGE_INPUT_INVALID");

  const stale = baseInput();
  stale.mountResult.ok = false;
  assert.equal(adapter.buildPackageInput(stale).code,
    "THREEWAY_PACKAGE_INPUT_MOUNT_INVALID");

  const inferred = baseInput();
  inferred.mountResult.result.mounts[0]
    .driverEnvelope.inferredDimensions = true;
  assert.equal(adapter.buildPackageInput(inferred).code,
    "THREEWAY_PACKAGE_INPUT_DRIVER_ENVELOPE_INVALID");
});

test("planar mount meshes and manufacturing-bearing extras are refused", () => {
  const planar = baseInput();
  planar.mountResult.result.mounts[0].inspectionMesh.verticesM = [
    [0, 0, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
  ];
  assert.equal(adapter.buildPackageInput(planar).code,
    "THREEWAY_PACKAGE_INPUT_MESH_INVALID");

  const authority = baseInput();
  authority.additionalComponents[0].metadata = {
    exactSolid: true,
  };
  assert.equal(adapter.buildPackageInput(authority).code,
    "THREEWAY_PACKAGE_INPUT_AUTHORITY_FORBIDDEN");
});

test("unsupported extras cannot impersonate canonical mounts or drivers", () => {
  const input = baseInput();
  input.additionalComponents.push({
    id: "fake-driver",
    role: "driver-body",
    boundsM: {
      minM: [0, 0, 0],
      maxM: [0.1, 0.1, 0.1],
    },
  });
  const result = adapter.buildPackageInput(input);
  assert.equal(result.ok, false);
  assert.equal(result.code, "THREEWAY_PACKAGE_INPUT_COMPONENT_INVALID");
});

test("results are immutable, deterministic, finite, and analysis-only", () => {
  const first = adapter.buildPackageInput(baseInput());
  const second = adapter.buildPackageInput(baseInput());
  assert.equal(first.hashInput, second.hashInput);
  assert.doesNotMatch(JSON.stringify(first), /NaN|Infinity/);
  assertDeepFrozen(first);
  assert.equal(first.manufacturing, false);
  assert.equal(first.stl, false);
  const preflight = adapter.manufacturingPreflight("package-stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
});

test("UMD browser path exposes the package-input adapter", () => {
  const source = fs.readFileSync(adapterPath, "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  assert.equal(
    typeof context.globalThis.MEH3PackageInput.buildPackageInput,
    "function",
  );
});
