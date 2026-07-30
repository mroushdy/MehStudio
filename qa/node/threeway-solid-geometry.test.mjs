import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const geometry = require(path.join(
  appRoot,
  "threeway-solid-geometry.js",
));

function tetrahedron(origin, size) {
  const [x, y, z] = origin;
  const verticesM = [
    [x, y, z],
    [x + size, y, z],
    [x, y + size, z],
    [x, y, z + size],
  ];
  const triangles = [
    [0, 2, 1],
    [0, 1, 3],
    [1, 2, 3],
    [2, 0, 3],
  ];
  return {
    verticesM,
    triangles,
    audit: geometry.auditMesh(verticesM, triangles),
  };
}

test("mesh-backed integrated field is one explicit positive-minus-lumen contract", () => {
  const positive = tetrahedron([0, 0, 0], 1);
  const lumen = tetrahedron([0.1, 0.1, 0.1], 0.2);
  assert.equal(positive.audit.pass, true);
  assert.equal(lumen.audit.pass, true);
  const integrated = geometry.createIntegratedField({
    positiveBodies: [{ id: "body:horn", mesh: positive }],
    acousticLumenNegatives: [
      { id: "negative:lumen:one", mesh: lumen },
    ],
    construction: {
      wallThicknessM: 0.012,
      minimumPrintableWebM: 0.004,
      meshClearanceM: 0.0004,
    },
  });
  assert.ok(integrated);
  assert.equal(typeof integrated.field, "function");
  assert.deepEqual(integrated.positiveBodyIds, ["body:horn"]);
  assert.deepEqual(
    integrated.acousticNegativeIds,
    ["negative:lumen:one"],
  );
  assert.equal(integrated.samplingContract.maximumStepM, 0.002);
  assert.ok(integrated.field([0.5, 0.1, 0.1]) < 0);
  assert.ok(integrated.field([0.14, 0.14, 0.14]) > 0);
  assert.ok(integrated.field([2, 2, 2]) > 0);
  assert.equal(integrated.exactSolid, false);
  assert.equal(integrated.manufacturing, false);
  assert.equal(integrated.stl, false);
});

test("integrated field refuses unaudited or incomplete operands", () => {
  assert.equal(geometry.createIntegratedField({}), null);
  const positive = tetrahedron([0, 0, 0], 1);
  positive.audit.pass = false;
  assert.equal(geometry.createIntegratedField({
    positiveBodies: [{ id: "body:horn", mesh: positive }],
    acousticLumenNegatives: [
      { id: "negative:lumen:one", mesh: tetrahedron(
        [0.1, 0.1, 0.1],
        0.2,
      ) },
    ],
    construction: {
      wallThicknessM: 0.012,
      minimumPrintableWebM: 0.004,
      meshClearanceM: 0.0004,
    },
  }), null);
});
