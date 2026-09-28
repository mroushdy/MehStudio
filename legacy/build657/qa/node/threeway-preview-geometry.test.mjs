import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const preview = require(path.join(
  appRoot, "threeway-preview-geometry.js"));

function horn() {
  return {
    ok: true,
    kind: "threeway-horn-surface",
    surfaceHash: "surface-test",
    stations: [
      {
        axialM: 0,
        section: {
          family: "ellipse",
          exponent: 2,
          widthM: 0.04,
          heightM: 0.03,
        },
      },
      {
        axialM: 0.1,
        section: {
          family: "superellipse",
          exponent: 4,
          widthM: 0.2,
          heightM: 0.12,
        },
      },
      {
        axialM: 0.2,
        section: {
          family: "superellipse",
          exponent: 4,
          widthM: 0.4,
          heightM: 0.24,
        },
      },
    ],
  };
}

test("horn preview tessellates only the canonical stations and remains intentionally open", () => {
  const input = { hornSurface: horn(), azimuthSegments: 32 };
  const before = structuredClone(input);
  const result = preview.buildHornInnerSurface(input);
  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.geometry.verticesM.length, 3 * 32);
  assert.equal(result.geometry.triangles.length, 2 * 2 * 32);
  assert.equal(result.geometry.intentionallyOpen, true);
  assert.equal(result.geometry.cappedAtThroat, false);
  assert.equal(result.geometry.cappedAtMouth, false);
  assert.equal(result.geometry.wallThicknessM, null);
  assert.equal(result.geometry.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.ok(Object.isFrozen(result.geometry.verticesM));
});

test("ellipse and superellipse ring points preserve declared axis endpoints", () => {
  const result = preview.buildHornInnerSurface({
    hornSurface: horn(),
    azimuthSegments: 32,
  });
  const ring = result.geometry.verticesM.slice(32, 64);
  assert.deepEqual(ring[0], [0.1, 0.1, 0]);
  assert.ok(Math.abs(ring[8][1]) < 1e-12);
  assert.ok(Math.abs(ring[8][2] - 0.06) < 1e-12);
  assert.deepEqual(ring[16], [0.1, -0.1, 0]);
});

test("station or section omissions fail instead of inventing a fallback shape", () => {
  const noSurface = preview.buildHornInnerSurface({});
  assert.equal(noSurface.ok, false);
  assert.equal(noSurface.code, preview.failureCodes.HORN_INVALID);

  const unsupported = horn();
  unsupported.stations[1].section.family = "rounded-rectangle";
  const refused = preview.buildHornInnerSurface({
    hornSurface: unsupported,
    azimuthSegments: 32,
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.code, preview.failureCodes.SECTION_UNSUPPORTED);
});

test("inspection meshes are copied without relabeling them exact or manufacturing", () => {
  const result = preview.copyInspectionMesh({
    id: "lumen-a",
    role: "canonical-acoustic-lumen-inspection",
    ownerId: "source-a",
    mesh: {
      role: "negative-volume-inspection-mesh",
      verticesM: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
      triangles: [[0, 1, 2]],
      audit: { closed: false },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.geometry.inspectionOnly, true);
  assert.equal(result.geometry.exactSolid, false);
  assert.equal(result.geometry.manufacturing, false);
  assert.deepEqual(result.geometry.upstreamAudit, { closed: false });
});

test("invalid inspection indices and nonfinite vertices fail closed", () => {
  const invalidIndex = preview.copyInspectionMesh({
    id: "bad",
    role: "inspection",
    verticesM: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
    triangles: [[0, 1, 4]],
  });
  assert.equal(invalidIndex.ok, false);
  const invalidNumber = preview.copyInspectionMesh({
    id: "bad-2",
    role: "inspection",
    verticesM: [[0, 0, 0], [Infinity, 0, 0], [0, 1, 0]],
    triangles: [[0, 1, 2]],
  });
  assert.equal(invalidNumber.ok, false);
});

test("manufacturing preflight is independently unavailable", () => {
  const result = preview.manufacturingPreflight("stl");
  assert.equal(result.ok, false);
  assert.equal(result.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});
