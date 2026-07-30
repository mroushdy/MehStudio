import assert from "node:assert/strict";
import test from "node:test";
import { engine } from "./case-loader.mjs";
import {
  boundingBox,
  componentMetrics,
  mergeMeshes,
  meshSamplingDiagnostics,
  planarNormalDiagnostics,
  volumeProperties
} from "./exact-mesh-diagnostics.mjs";

function tetra(offset = [0, 0, 0]) {
  const pos = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ].map((point) => point.map((value, axis) => value + offset[axis]));
  return {
    pos,
    tri: [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3]
    ]
  };
}

function packed(mesh) {
  return engine.packedMesh(
    new Float64Array(mesh.pos.flat()),
    new Uint32Array(mesh.tri.flat()),
    mesh.grid ? { grid: mesh.grid } : undefined
  );
}

test("volume centroid and bounds are exact for a tetrahedron", () => {
  const mesh = tetra([0.002, 0.003, 0.004]);
  const properties = volumeProperties(mesh);
  const box = boundingBox(mesh);

  assert.ok(Math.abs(properties.volume - 1 / 6) < 1e-12);
  assert.deepEqual(properties.centroid.map((value) => Number(value.toFixed(6))), [0.252, 0.253, 0.254]);
  assert.deepEqual(box.min, [0.002, 0.003, 0.004]);
  assert.deepEqual(box.max, [1.002, 1.003, 1.004]);
});

test("component metrics expose millimetre location and nearest module", () => {
  const mesh = tetra();
  const metrics = componentMetrics(mesh, [
    {
      driver: 2,
      module: "driver-module-02",
      anchor: "driverFace",
      point: [0.25, 0.25, 0.25]
    }
  ]);

  assert.equal(metrics.triangles, 4);
  assert.equal(metrics.volumeMm3, 166666666.667);
  assert.deepEqual(metrics.centroidMm, [250, 250, 250]);
  assert.equal(metrics.nearest.module, "driver-module-02");
  assert.equal(metrics.nearest.distanceMm, 0);
});

test("mergeMeshes preserves disconnected triangle sets", () => {
  const merged = mergeMeshes([packed(tetra()), tetra([2, 0, 0])]);
  assert.equal(merged.packed, true);
  assert.equal(engine.meshVertexCount(merged), 8);
  assert.equal(engine.meshTriangleCount(merged), 8);
  let maximumIndex = -1;
  const triangle = [0, 0, 0];
  for (let index = 0; index < engine.meshTriangleCount(merged); index += 1) {
    engine.meshTriangle(merged, index, triangle);
    maximumIndex = Math.max(maximumIndex, ...triangle);
  }
  assert.equal(maximumIndex, 7);
});

test("geometric diagnostics consume packed meshes through accessors", () => {
  const legacy = tetra([0.002, 0.003, 0.004]);
  const candidate = packed(legacy);
  assert.deepEqual(boundingBox(candidate), boundingBox(legacy));
  assert.deepEqual(volumeProperties(candidate), volumeProperties(legacy));
  assert.deepEqual(
    componentMetrics(candidate),
    componentMetrics(legacy)
  );
});

function griddedSurface(zAt, rows = 8, columns = 8) {
  const pos = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      pos.push([column / columns, row / rows, zAt(row, column)]);
    }
  }
  const at = (row, column) => row * (columns + 1) + column;
  const tri = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      tri.push(
        [at(row, column), at(row, column + 1), at(row + 1, column)],
        [at(row, column + 1), at(row + 1, column + 1), at(row + 1, column)]
      );
    }
  }
  return { pos, tri };
}

test("mesh sampling diagnostics use the worker lattice facts", () => {
  const adequate = meshSamplingDiagnostics({
    grid: { nx: 20, ny: 30, nz: 40, step: 0.006 }
  });
  assert.equal(adequate.pass, true);
  assert.equal(adequate.stepMm, 6);

  const excessive = meshSamplingDiagnostics({
    grid: { nx: 20, ny: 30, nz: 40, step: 0.009 }
  });
  assert.equal(excessive.pass, false);
  assert.equal(excessive.excessive, true);

  assert.equal(meshSamplingDiagnostics({}).pass, false);
});

test("planar normal diagnostic distinguishes a clean panel from striping", () => {
  const cleanMesh = griddedSurface(() => 0);
  const clean = planarNormalDiagnostics(
    cleanMesh,
    { expectedNormal: [0, 0, 1] }
  );
  assert.equal(clean.pass, true);
  assert.equal(clean.stripePairs, 0);
  assert.deepEqual(
    planarNormalDiagnostics(packed(cleanMesh), {
      expectedNormal: [0, 0, 1]
    }),
    clean
  );

  const striped = planarNormalDiagnostics(
    griddedSurface((row) => row % 2 ? 0.03 : 0),
    { expectedNormal: [0, 0, 1] }
  );
  assert.equal(striped.pass, false);
  assert.ok(striped.p95PlaneAngleDeg > 2);
  assert.ok(striped.stripePairs > 0);
});
