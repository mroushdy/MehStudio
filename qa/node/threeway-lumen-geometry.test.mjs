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
const lumen = require(path.join(appRoot, "threeway-lumen-geometry.js"));

function straightRacetrack() {
  return {
    id: "lumen-mid-1",
    ownerStationId: "station-mid",
    ownerSourceId: "src-mid",
    driverEndpoint: {
      pointM: [0, 0, 0],
      flowDirection: [1, 0, 0],
      surfaceNormal: [1, 0, 0],
      datum: "front-chamber-boundary",
    },
    hornEndpoint: {
      pointM: [0.08, 0, 0],
      flowDirection: [1, 0, 0],
      surfaceNormal: [1, 0, 0],
      datum: "inner-horn-surface",
    },
    path: {
      samples: 9,
      driverTangentScaleM: 0.026,
      hornTangentScaleM: 0.026,
      upHint: [0, 1, 0],
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
    provenanceRefs: ["prov-explicit"],
  };
}

test("straight racetrack is one closed two-manifold negative volume", () => {
  const input = straightRacetrack();
  const before = structuredClone(input);
  const result = lumen.buildCanonicalLumen(input);
  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.record.canonicalNegative, true);
  assert.equal(result.record.subtractedFromPositiveHosts, false);
  assert.equal(result.mesh.role, "negative-inspection-volume");
  assert.equal(result.mesh.audit.openEdges, 0);
  assert.equal(result.mesh.audit.nonManifoldEdges, 0);
  assert.equal(result.mesh.audit.degenerateTriangles, 0);
  assert.equal(result.mesh.audit.outwardOrientation, true);
  assert.equal(result.mesh.audit.vertexCount, 9 * 32 + 2);
  assert.equal(result.mesh.audit.triangleCount, 2 * 8 * 32 + 2 * 32);

  const area = lumen.sectionArea(result.record.startSection);
  assert.ok(Math.abs(result.mesh.audit.volumeM3 - area * 0.08) /
    (area * 0.08) < 0.02);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.record.frames));
});

test("driver endpoint must be perpendicular to its declared face", () => {
  const input = straightRacetrack();
  input.driverEndpoint.flowDirection = [1, 0.2, 0];
  const result = lumen.buildCanonicalLumen(input);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_LUMEN_DRIVER_AXIS_MISMATCH"));
});

test("horn endpoint must cross the surface instead of grazing it", () => {
  const input = straightRacetrack();
  input.hornEndpoint.surfaceNormal = [0, 1, 0];
  const result = lumen.buildCanonicalLumen(input);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_LUMEN_HORN_INTERSECTION_INVALID"));
});

test("tapered lumen preserves explicit monotone area policy", () => {
  const growing = straightRacetrack();
  growing.endSection = {
    family: "racetrack",
    widthM: 0.04,
    heightM: 0.012,
  };
  growing.areaProgression = "nondecreasing";
  const pass = lumen.buildCanonicalLumen(growing);
  assert.equal(pass.ok, true);
  for (let index = 1; index < pass.record.areasM2.length; index++)
    assert.ok(pass.record.areasM2[index] >=
      pass.record.areasM2[index - 1]);

  growing.areaProgression = "nonincreasing";
  const fail = lumen.buildCanonicalLumen(growing);
  assert.equal(fail.ok, false);
  assert.ok(fail.diagnostics.some(item =>
    item.code === "THREEWAY_PASSAGE_AREA_NONMONOTONIC"));
});

test("curved endpoint directions generate continuous transported frames", () => {
  const input = straightRacetrack();
  input.hornEndpoint.pointM = [0.08, 0.025, 0.015];
  input.hornEndpoint.flowDirection = [0.9, 0.4, 0.1];
  input.hornEndpoint.surfaceNormal = [0.9, 0.4, 0.1];
  input.path.samples = 33;
  const result = lumen.buildCanonicalLumen(input);
  assert.equal(result.ok, true);
  assert.ok(result.record.path.centerlineLengthM >=
    result.record.path.directLengthM);
  for (const frame of result.record.frames) {
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const length = a => Math.hypot(...a);
    assert.ok(Math.abs(dot(frame.axial, frame.u)) < 1e-9);
    assert.ok(Math.abs(dot(frame.axial, frame.v)) < 1e-9);
    assert.ok(Math.abs(dot(frame.u, frame.v)) < 1e-9);
    assert.ok(Math.abs(length(frame.axial) - 1) < 1e-9);
    assert.ok(Math.abs(length(frame.u) - 1) < 1e-9);
    assert.ok(Math.abs(length(frame.v) - 1) < 1e-9);
  }
  assert.equal(result.mesh.audit.openEdges, 0);
  assert.equal(result.mesh.audit.nonManifoldEdges, 0);
});

test("section family changes require an explicit transition split", () => {
  const input = straightRacetrack();
  input.endSection = { family: "round", diameterM: 0.015 };
  const result = lumen.buildCanonicalLumen(input);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_LUMEN_SECTION_INVALID"));
});

test("coincident endpoints fail as disconnected rather than yielding NaN", () => {
  const input = straightRacetrack();
  input.hornEndpoint.pointM = [0, 0, 0];
  const result = lumen.buildCanonicalLumen(input);
  assert.equal(result.ok, false);
  assert.equal(result.mesh, null);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_PASSAGE_DISCONNECTED"));
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test("manufacturing stays false until this negative is subtracted and audited", () => {
  const result = lumen.buildCanonicalLumen(straightRacetrack());
  assert.equal(result.ok, true);
  assert.equal(result.manufacturing, false);
  assert.equal(result.capabilities.exactBooleanSubtraction, false);
  const preflight = lumen.manufacturingPreflight("subtract");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
});

test("UMD browser path exposes the canonical builder", () => {
  const source = fs.readFileSync(
    path.join(appRoot, "threeway-lumen-geometry.js"), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  assert.equal(typeof context.globalThis.MEH3LumenGeometry
    .buildCanonicalLumen, "function");
});
