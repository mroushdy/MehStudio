import assert from "node:assert/strict";
import test from "node:test";
import { engine } from "./case-loader.mjs";

const AUDIT_FIELDS = [
  "badEdges",
  "badOrientation",
  "degenerate",
  "duplicateFaces",
  "nonFinite",
  "components",
  "orientationConflict",
  "volume",
  "minArea",
  "maxArea"
];

function packed(mesh) {
  return engine.packedMesh(
    new Float64Array(mesh.pos.flat()),
    new Uint32Array(mesh.tri.flat())
  );
}

function auditFacts(audit) {
  return {
    ...Object.fromEntries(AUDIT_FIELDS.map((field) => [field, audit[field]])),
    flips: Array.from(audit.flips || [])
  };
}

function intersectionFacts(result) {
  return {
    count: result.count,
    tested: result.tested,
    limited: result.limited,
    firstPair: result.firstPair
  };
}

function assertTopologyEqual(legacy, candidate) {
  const vertex = [0, 0, 0];
  const triangle = [0, 0, 0];
  assert.equal(
    engine.meshVertexCount(candidate),
    engine.meshVertexCount(legacy)
  );
  assert.equal(
    engine.meshTriangleCount(candidate),
    engine.meshTriangleCount(legacy)
  );
  for (let index = 0; index < engine.meshVertexCount(legacy); index += 1) {
    assert.deepEqual(
      engine.meshVertex(candidate, index, vertex).slice(),
      engine.meshVertex(legacy, index)
    );
  }
  for (let index = 0; index < engine.meshTriangleCount(legacy); index += 1) {
    assert.deepEqual(
      engine.meshTriangle(candidate, index, triangle).slice(),
      engine.meshTriangle(legacy, index)
    );
  }
}

const tetraPositions = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
const closedTetraTriangles = [
  [0, 2, 1],
  [0, 1, 3],
  [0, 3, 2],
  [1, 2, 3]
];

const fixtures = {
  closed: {
    pos: tetraPositions,
    tri: closedTetraTriangles
  },
  open: {
    pos: tetraPositions.slice(0, 3),
    tri: [[0, 1, 2]]
  },
  orientation: {
    pos: tetraPositions,
    tri: [
      [0, 1, 2],
      ...closedTetraTriangles.slice(1)
    ]
  },
  duplicate: {
    pos: tetraPositions,
    tri: [
      ...closedTetraTriangles,
      closedTetraTriangles[0]
    ]
  },
  nonfinite: {
    pos: [
      [0, 0, 0],
      [1, 0, 0],
      [Number.NaN, 1, 0]
    ],
    tri: [[0, 1, 2]]
  },
  intersection: {
    pos: [
      [-1, -1, 0],
      [1, -1, 0],
      [0, 1, 0],
      [0, -0.5, -1],
      [0, -0.5, 1],
      [0, 0.5, 0]
    ],
    tri: [
      [0, 1, 2],
      [3, 4, 5]
    ]
  }
};

for (const [name, legacy] of Object.entries(fixtures)) {
  test(`packed ${name} topology, audit, and STL match legacy`, () => {
    const candidate = packed(legacy);
    assertTopologyEqual(legacy, candidate);
    assert.deepEqual(
      auditFacts(engine.meshAudit(candidate)),
      auditFacts(engine.meshAudit(legacy))
    );
    assert.deepEqual(
      Buffer.from(engine.stlBytes(candidate)),
      Buffer.from(engine.stlBytes(legacy))
    );
  });
}

test("packed orientation repair matches legacy topology, audit, and STL", () => {
  const legacy = engine.orientSolid(fixtures.orientation);
  const candidate = engine.orientSolid(packed(fixtures.orientation));
  assertTopologyEqual(legacy, candidate);
  assert.deepEqual(
    auditFacts(candidate.audit),
    auditFacts(legacy.audit)
  );
  assert.deepEqual(
    Buffer.from(engine.stlBytes(candidate)),
    Buffer.from(engine.stlBytes(legacy))
  );
});

test("packed deep-intersection result matches legacy", () => {
  const legacy = engine.meshSelfIntersections(fixtures.intersection, 1);
  const candidate = engine.meshSelfIntersections(
    packed(fixtures.intersection),
    1
  );
  assert.deepEqual(intersectionFacts(candidate), intersectionFacts(legacy));
  assert.equal(candidate.count, 1);
  assert.deepEqual(candidate.firstPair, [0, 1]);
});

test("packed audit rejects coordinate-welded topology outside its shared-index contract", () => {
  // These four faces describe a geometric tetrahedron, but deliberately use
  // different vertex IDs for equal coordinates across adjacent faces. Legacy
  // STL-oriented input coordinate-welds that representation. Packed production
  // meshes instead promise one shared index for each shared lattice-edge
  // vertex, so this malformed packed input must remain visibly nonmanifold.
  const coordinateWeldedOnly = {
    pos: [
      ...tetraPositions,
      ...tetraPositions
    ],
    tri: [
      [4, 6, 5],
      [4, 1, 7],
      [0, 7, 2],
      [5, 2, 3]
    ]
  };
  const legacyAudit = engine.meshAudit(coordinateWeldedOnly);
  const packedAudit = engine.meshAudit(packed(coordinateWeldedOnly));
  assert.equal(legacyAudit.badEdges, 0);
  assert.equal(legacyAudit.components, 1);
  assert.ok(packedAudit.badEdges > 0);
  assert.ok(packedAudit.components > 1);
});
