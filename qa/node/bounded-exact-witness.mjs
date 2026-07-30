#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { engine, loadCases, readJson } from "./case-loader.mjs";

const EXPECTED_WITNESS_STL_SHA256 =
  "432162179c722007e895348be468d1a63ddfb1a9c2356a07bdffec3b857a560f";
const cases = loadCases();
const canonical = new Map(
  cases
    .filter((testCase) => testCase.expected?.status === "valid")
    .map((testCase) => [testCase.id, testCase])
);
const admissionMatrix = readJson("cases/exact-production-admission.json");
const admitted = [];
const refused = [];

function admissionFixture(entry) {
  const sourceId = entry.sourceCase || entry.id;
  const source = canonical.get(sourceId);
  assert.ok(source, `${entry.id} source fixture ${sourceId} is missing`);
  return {
    ...source,
    id: entry.id,
    state: {
      ...source.state,
      ...(entry.overrides || {})
    }
  };
}

function assertPreflightSnapshot(budget, expected, label) {
  assert.equal(budget.parts.length, expected.partCount, `${label} part count changed`);
  assert.equal(
    budget.totals.gridPoints,
    expected.gridPoints,
    `${label} fixed-grid sample count changed`
  );
  assert.deepEqual(
    budget.parts.map((part) => part.dims),
    expected.dimensions,
    `${label} fixed-grid dimensions changed`
  );
  if (expected.cells !== undefined) {
    assert.equal(budget.totals.cells, expected.cells, `${label} cell count changed`);
  }
  if (expected.estimatedPeakBytes !== undefined) {
    assert.equal(
      budget.totals.estimatedPeakBytes,
      expected.estimatedPeakBytes,
      `${label} deterministic phase accounting changed`
    );
  }
}

assert.equal(admissionMatrix.schemaVersion, 2);
assert.equal(admissionMatrix.intent, "export");
assert.equal(admissionMatrix.fixedStepMeters, 0.0025);
assert.deepEqual(
  admissionMatrix.certificateCases,
  ["P03", "P03-CARTRIDGE", "R02"]
);

const admittedEntries = admissionMatrix.cases.filter(
  (entry) => entry.expectedStatus === "admitted"
);
const heldEntries = admissionMatrix.cases.filter(
  (entry) => entry.expectedStatus === "refused"
);
assert.deepEqual(
  admittedEntries.map((entry) => entry.id),
  ["P03", "P03-CARTRIDGE", "R02"]
);
assert.deepEqual(
  new Set(heldEntries.map((entry) => entry.id)),
  new Set(["P01", "R03", "P04", "R04-D", "R08"])
);

// Each admitted fixture has its own fresh-process production certificate. This
// bounded witness verifies only the pinned admission envelopes and leaves full
// production mesh/audit/hash work to production-exact-certificate.mjs.
for (const entry of admittedEntries) {
  const testCase = admissionFixture(entry);
  assert.match(entry.role, /production-certificate$/);
  assert.ok(entry.expectedCertificate, `${entry.id} pinned certificate is missing`);
  const solvedProduction = engine.solve(testCase.state);
  assert.equal(
    solvedProduction.infeasible,
    false,
    `${entry.id} unexpectedly refused in the solver`
  );
  const budget = engine.twoWayMeshPreflight(
    solvedProduction.S,
    admissionMatrix.intent
  );
  assert.equal(budget.ok, true, `${entry.id} lost its certified admission`);
  assert.equal(budget.policyVersion, admissionMatrix.expectedPolicyVersion);
  assert.equal(budget.step, admissionMatrix.fixedStepMeters);
  assert.equal(budget.detachable, entry.expectedDetachable);
  assertPreflightSnapshot(budget, entry.expectedPreflight, entry.id);
  admitted.push({
    id: entry.id,
    policyVersion: budget.policyVersion,
    gridPoints: budget.totals.gridPoints,
    certificateVerifiedBy: "production-exact-certificate.mjs"
  });
}

// Only matrix entries explicitly held by build-642 are expected to refuse.
// Each must fail in preflight before scalar-lattice or topology allocation.
for (const entry of heldEntries) {
  const testCase = admissionFixture(entry);
  assert.equal(entry.role, "held-production-case");
  const solvedProduction = engine.solve(testCase.state);
  assert.equal(
    solvedProduction.infeasible,
    false,
    `${entry.id} unexpectedly refused in the solver`
  );
  assert.throws(
    () => engine.twoWayMeshPreflight(solvedProduction.S, admissionMatrix.intent),
    (error) => {
      const budget = error?.details?.budget;
      assert.equal(
        error?.code,
        entry.expectedRefusalCode,
        `${entry.id} changed its stable pre-allocation refusal code`
      );
      assert.ok(budget, `${entry.id} refusal omitted its budget`);
      assert.equal(budget.policyVersion, admissionMatrix.expectedPolicyVersion);
      assertPreflightSnapshot(budget, entry.expectedPreflight, entry.id);
      refused.push({ id: entry.id, code: error.code });
      return true;
    }
  );
}

const source = canonical.get("P03");
assert.ok(source, "P03 source fixture is missing");

// This sub-UI state is an internal algorithm/resource witness only. A five-inch
// mouth is outside the application's 10–64 inch control range and is not a
// product design, acoustic recommendation, or manufacturing candidate. It is
// the smallest integer witness that preserves Build 649's post-transition
// tap-station interval; the former one-inch witness correctly refuses because
// its horn ends before that interval begins.
const solved = engine.solve({ ...source.state, mouthW: 5 });
assert.equal(solved.infeasible, false, "QA-only exact witness did not solve");

const preflight = engine.twoWayMeshPreflight(solved.S, "export");
assert.equal(preflight.totals.gridPoints, 1_050_672);
assert.deepEqual(preflight.parts[0].dims, [84, 106, 118]);
assert.ok(preflight.totals.estimatedPeakBytes <= preflight.limits.maxEstimatedPeakBytes);

engine.clearTwoWayMeshCache?.();
const startedAt = Date.now();
const geometry = engine.twoWayGeometry(solved.S, "export");
const audit = engine.fabricationAudit(solved.S, geometry.mesh, true);
const stl = engine.stlBytes(geometry.mesh, preflight.limits.maxStlBytes);
const elapsedMs = Date.now() - startedAt;
const stlView = stl instanceof ArrayBuffer
  ? new Uint8Array(stl)
  : new Uint8Array(stl.buffer, stl.byteOffset, stl.byteLength);
const stlSha256 = createHash("sha256").update(stlView).digest("hex");
const vertices = typeof engine.meshVertexCount === "function"
  ? engine.meshVertexCount(geometry.mesh)
  : geometry.mesh.pos.length;
const triangles = typeof engine.meshTriangleCount === "function"
  ? engine.meshTriangleCount(geometry.mesh)
  : geometry.mesh.tri.length;

assert.equal(vertices, 103_044);
assert.equal(triangles, 206_132);
assert.equal(stlView.byteLength, 10_306_684);
assert.equal(stlSha256, EXPECTED_WITNESS_STL_SHA256);
assert.equal(audit.selfIntersections, 0);
assert.equal(audit.pass, true, "QA-only exact witness failed fabrication audit");
assert.equal(audit.components, 1);
assert.equal(audit.rawComponents, 1);
assert.equal(audit.discardedComponents, 0);
assert.ok(vertices <= preflight.limits.maxVertices);
assert.ok(triangles <= preflight.limits.maxTriangles);
assert.ok(stlView.byteLength <= preflight.limits.maxStlBytes);

const maxRssBytes = process.resourceUsage().maxRSS * 1024;
console.log(JSON.stringify({
  kind: "qa-only-sub-ui-exact-witness",
  productionCandidate: false,
  productionAdmission: admitted,
  heldProductionPreflightRefusals: refused,
  gridPoints: preflight.totals.gridPoints,
  dimensions: preflight.parts[0].dims,
  vertices,
  triangles,
  stlBytes: stlView.byteLength,
  stlSha256,
  intersectionPairs: audit.intersectionPairs,
  selfIntersections: audit.selfIntersections,
  accountedBytes: preflight.totals.estimatedPeakBytes,
  accountingCeilingBytes: preflight.limits.maxEstimatedPeakBytes,
  observedProcessMaxRssBytes: maxRssBytes,
  observedRssIsPolicyGuarantee: false,
  elapsedMs
}, null, 2));
console.log(
  "BOUNDED EXACT WITNESS PASS — integrated/retained P03 admissions pinned for separate certificates; "
    + "held production cases refused before allocation; QA-only mesh "
    + "deep-audited, hash-pinned, and STL-serialized"
);
