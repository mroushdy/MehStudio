import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

test("shared constructive mesher produces a closed audited subtraction", () => {
  assert.equal(typeof engine.constructiveImplicitMesh, "function");

  const sphereRadiusM = 0.025;
  const boreRadiusM = 0.006;
  const field = point => {
    const [x, y, z] = point;
    const sphere = Math.hypot(x, y, z) - sphereRadiusM;
    const axialBore = Math.hypot(y, z) - boreRadiusM;
    return Math.max(sphere, -axialBore);
  };
  const result = engine.constructiveImplicitMesh(
    field,
    {
      lo: [-0.015, -0.015, -0.015],
      hi: [0.015, 0.015, 0.015],
    },
    { quality: "display" },
  );

  assert.equal(
    result.classification,
    "constructive-sampled-manifold-candidate",
  );
  assert.equal(result.exactBooleanProviderEvidence, false);
  assert.equal(result.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
  assert.ok(result.bounds.growthPasses > 0);
  assert.ok(result.mesh.positions.length > 0);
  assert.ok(result.mesh.indices.length > 0);
  assert.equal(result.audit.badEdges, 0);
  assert.equal(result.audit.badOrientation, 0);
  assert.equal(result.audit.degenerate, 0);
  assert.equal(result.audit.nonFinite, 0);
  assert.equal(result.audit.components, 1);
  assert.ok(result.audit.volume > 0);
});

test("shared constructive mesher refuses an unbounded input contract", () => {
  assert.throws(
    () => engine.constructiveImplicitMesh(
      point => Math.hypot(...point) - 0.01,
      { lo: [0, 0, 0], hi: [0, 1, 1] },
    ),
    error => error && error.code === "MESH_BOUNDS_INVALID",
  );
});
