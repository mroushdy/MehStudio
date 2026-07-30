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
const modulePath = path.join(appRoot, "threeway-exact-kernel.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const exactKernel = require(modulePath);

const INPUT_HASH = "input-hash:exact-kernel-fixture";
const SOLUTION_HASH = "solution-hash:exact-kernel-fixture";

function tetrahedron(offset = 0) {
  return {
    units: "m",
    verticesM: [
      [offset, 0, 0],
      [offset + 0.01, 0, 0],
      [offset, 0.01, 0],
      [offset, 0, 0.01],
    ],
    triangles: [
      [0, 2, 1],
      [0, 1, 3],
      [1, 2, 3],
      [2, 0, 3],
    ],
  };
}

function solidPlanEnvelope() {
  const mesh = tetrahedron();
  delete mesh.units;
  const positiveId = "operand:positive:body-horn";
  const unionId = "operation:union:all-positive-bodies";
  const resultBase = {
    schemaVersion: 1,
    kind: "threeway-provider-neutral-solid-plan",
    inputHash: INPUT_HASH,
    solutionHash: SOLUTION_HASH,
    topology: { kind: "T3" },
    topologyId: "T3",
    constructionId: "exact-kernel-fixture",
    topologyImplementationRevision: "t3-exact-fixture-r1",
    units: "m",
    componentIds: ["body-horn"],
    lumenIds: [],
    mountHostIds: [],
    provider: {
      selected: false,
      id: null,
      version: null,
      kernelId: null,
      kernelVersion: null,
    },
    dag: {
      nodes: [
        {
          id: positiveId,
          kind: "operand",
          phase: "positive-union",
          classification: "positive",
          semanticRole: "horn-shell",
          polarity: "positive",
          acoustic: false,
          sourceRecordId: "body-horn",
          inputs: [],
          mesh,
          ownership: {
            ownerId: SOLUTION_HASH,
            sourceId: null,
            stationId: null,
            inputHash: INPUT_HASH,
            solutionHash: SOLUTION_HASH,
          },
          inputHash: INPUT_HASH,
          solutionHash: SOLUTION_HASH,
          booleanExecuted: false,
          exactSolid: false,
          manufacturing: false,
        },
        {
          id: unionId,
          kind: "operation",
          phase: "positive-union",
          classification: "derived-plan-node",
          semanticRole: "positive-union-result",
          polarity: "derived",
          acoustic: false,
          sourceRecordId: null,
          operation: "union",
          inputs: [positiveId],
          ownership: {
            ownerId: SOLUTION_HASH,
            sourceId: null,
            stationId: null,
            inputHash: INPUT_HASH,
            solutionHash: SOLUTION_HASH,
          },
          inputHash: INPUT_HASH,
          solutionHash: SOLUTION_HASH,
          booleanExecuted: false,
          exactSolid: false,
          manufacturing: false,
        },
      ],
      edges: [
        {
          id: "edge:positive-to-union",
          from: positiveId,
          to: unionId,
          inputHash: INPUT_HASH,
          solutionHash: SOLUTION_HASH,
        },
      ],
      rootNodeId: unionId,
      stages: [
        {
          id: "stage:positive-union",
          order: 0,
          operandNodeIds: [positiveId],
          operationNodeIds: [unionId],
          inputHash: INPUT_HASH,
          solutionHash: SOLUTION_HASH,
        },
        {
          id: "stage:acoustic-lumen-subtraction",
          order: 1,
          operandNodeIds: [],
          operationNodeIds: [],
          inputHash: INPUT_HASH,
          solutionHash: SOLUTION_HASH,
        },
        {
          id: "stage:auxiliary-negative-subtraction",
          order: 2,
          operandNodeIds: [],
          operationNodeIds: [],
          inputHash: INPUT_HASH,
          solutionHash: SOLUTION_HASH,
        },
      ],
    },
    expectedContacts: [],
    allowedOverlapPairs: [],
    counts: {
      positiveBodies: 1,
      hornShells: 1,
      throatInterfaces: 0,
      mountHosts: 0,
      optionalRearAndEnclosureBodies: 0,
      acousticLumenNegatives: 0,
      auxiliaryNegatives: 0,
      expectedContacts: 0,
    },
    invariants: {
      physicsSolutionOnly: true,
      renderGeometryConsumed: false,
      legacyInputConsumed: false,
      allNodeHashesMatchSolution: true,
      positiveBodiesUnionFirst: true,
      oneAcousticNegativePerAperture: true,
      eachAcousticNegativeSubtractedOnce: true,
      passageInspectionMeshesPreserved: true,
      mountInspectionMeshesPreserved: true,
      fullFaceMountHostsOnly: true,
      auxiliaryNegativesNonAcoustic: true,
      expectedContinuityContactsExplicit: true,
      geometryInferred: false,
      toleranceInferred: false,
      meshesGenerated: false,
      booleansExecuted: false,
    },
    execution: {
      providerSelected: false,
      kernelSelected: false,
      toleranceApplied: false,
      booleanUnionExecuted: false,
      booleanSubtractionExecuted: false,
      exactSolid: false,
      fabricationAudited: false,
      manufacturing: false,
      export: false,
      stl: false,
    },
  };
  const planHash =
    `meh3-solid-plan-v1\n${exactKernel.stableStringify(resultBase)}`;
  return {
    ok: true,
    code: null,
    result: { ...resultBase, planHash },
    diagnostics: [],
    inputHash: INPUT_HASH,
    solutionHash: SOLUTION_HASH,
    planHash,
    hashInput: planHash,
    booleanExecuted: false,
    exactSolid: false,
    manufacturing: false,
    export: false,
    stl: false,
    capabilities: {
      solidPlan: true,
      booleanExecution: false,
    },
  };
}

function provider(overrides = {}) {
  const base = {
    id: "fixture-exact-provider",
    version: "1.2.3",
    kernel: {
      id: "fixture-boolean-kernel",
      version: "4.5.6",
    },
    capabilities: Object.fromEntries(
      exactKernel.requiredProviderCapabilities.map(name => [name, true]),
    ),
    executeExactBoolean(request) {
      const bareMesh = tetrahedron(0.2);
      const meshIdentity = exactKernel.computeMeshIdentity(bareMesh);
      const providerIdentity = {
        id: base.id,
        version: base.version,
        kernel: structuredClone(base.kernel),
      };
      return {
        schemaVersion: 1,
        kind: "threeway-exact-boolean-provider-result",
        ok: true,
        booleanCompleted: true,
        units: "m",
        inputHash: request.inputHash,
        solutionHash: request.solutionHash,
        planHash: request.planHash,
        toleranceM: request.toleranceM,
        solidArtifactId: "fixture-solid-artifact",
        componentIds: ["fixture-solid-component"],
        provider: providerIdentity,
        meshIdentity,
        mesh: {
          ...bareMesh,
          meshIdentity,
        },
        closedManifoldAudit: {
          schemaVersion: 1,
          kind: "threeway-closed-manifold-audit",
          ok: true,
          pass: true,
          closed: true,
          twoManifold: true,
          componentCount: 1,
          componentIds: ["fixture-solid-component"],
          vertexCount: bareMesh.verticesM.length,
          triangleCount: bareMesh.triangles.length,
          openEdgeCount: 0,
          boundaryEdgeCount: 0,
          nonmanifoldEdgeCount: 0,
          degenerateFaceCount: 0,
          reversedFaceCount: 0,
          meshIdentity,
          inputHash: request.inputHash,
          solutionHash: request.solutionHash,
          planHash: request.planHash,
          provider: providerIdentity,
        },
        manufacturing: false,
        export: false,
        stl: false,
      };
    },
  };
  return Object.assign(base, overrides);
}

function execute(overrides = {}) {
  return exactKernel.executeExactBoolean({
    solidPlan: solidPlanEnvelope(),
    provider: provider(),
    toleranceM: 0.00001,
    ...overrides,
  });
}

test("no injected provider returns typed unavailable evidence without throwing", async () => {
  const result = await execute({ provider: null });
  assert.equal(result.ok, false);
  assert.equal(result.available, false);
  assert.equal(
    result.code,
    exactKernel.failureCodes.PROVIDER_UNAVAILABLE,
  );
  assert.equal(result.booleanExecuted, false);
  assert.equal(result.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});

test("explicit positive metre tolerance is mandatory and never inferred", async () => {
  const injected = provider();
  let called = false;
  injected.executeExactBoolean = () => {
    called = true;
  };
  const missing = await execute({
    provider: injected,
    toleranceM: undefined,
  });
  const zero = await execute({
    provider: injected,
    toleranceM: 0,
  });

  assert.equal(missing.code,
    exactKernel.failureCodes.TOLERANCE_REQUIRED);
  assert.equal(zero.code,
    exactKernel.failureCodes.TOLERANCE_REQUIRED);
  assert.equal(called, false);
  assert.equal(exactKernel.capabilities.toleranceInference, false);
});

test("mutated or restamped plan hashes are refused before provider execution", async () => {
  const plan = solidPlanEnvelope();
  plan.result.componentIds.push("body-forged");
  const injected = provider();
  let called = false;
  injected.executeExactBoolean = () => {
    called = true;
  };
  const result = await execute({
    solidPlan: plan,
    provider: injected,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, exactKernel.failureCodes.HASH_MISMATCH);
  assert.equal(called, false);
});

test("legacy, already-executed, and non-plan envelopes are refused", async () => {
  const legacy = await execute({
    solidPlan: {
      ok: true,
      schemaVersion: 1,
      legacyGeometry: {},
    },
  });
  const executedPlan = solidPlanEnvelope();
  executedPlan.booleanExecuted = true;
  const executed = await execute({ solidPlan: executedPlan });

  assert.equal(legacy.ok, false);
  assert.equal(legacy.code, exactKernel.failureCodes.PLAN_INVALID);
  assert.equal(executed.ok, false);
  assert.equal(executed.code, exactKernel.failureCodes.PLAN_INVALID);
});

test("all exact provider protocol capabilities are required explicitly", async () => {
  const injected = provider();
  delete injected.capabilities.closedManifoldAudit;
  const result = await execute({ provider: injected });

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    exactKernel.failureCodes.CAPABILITY_MISSING,
  );
  assert.deepEqual(
    result.diagnostics[0].details.missingCapabilities,
    ["closedManifoldAudit"],
  );
});

test("successful provider evidence yields immutable exact solid evidence only", async () => {
  const plan = solidPlanEnvelope();
  const before = structuredClone(plan);
  const result = await execute({ solidPlan: plan });

  assert.deepEqual(plan, before);
  assert.equal(result.ok, true);
  assert.equal(result.available, true);
  assert.equal(result.booleanExecuted, true);
  assert.equal(result.exactSolid, true);
  assert.equal(result.fabricationAudited, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.export, false);
  assert.equal(result.stl, false);
  assert.equal(result.result.kind, "threeway-exact-solid-evidence");
  assert.equal(result.result.inputHash, INPUT_HASH);
  assert.equal(result.result.solutionHash, SOLUTION_HASH);
  assert.equal(result.result.planHash, plan.planHash);
  assert.equal(result.result.tolerance.explicit, true);
  assert.equal(result.result.tolerance.inferred, false);
  assert.equal(result.result.closedManifoldAudit.pass, true);
  assert.deepEqual(
    result.result.componentIds,
    ["fixture-solid-component"],
  );
  assert.deepEqual(result.result.operandComponentIds, ["body-horn"]);
  assert.equal(result.result.withinResourceBudget, false);
  assert.equal(result.result.exportAuthorized, false);
  assert.match(result.solidHash, /^meh3-exact-solid-v1\n/);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.result));
  assert.ok(Object.isFrozen(result.result.mesh.verticesM));
});

test("provider hash, identity, mesh, and closed-manifold audit mismatches fail closed", async () => {
  const cases = [
    raw => {
      raw.solutionHash = "forged-solution";
    },
    raw => {
      raw.meshIdentity = "forged-mesh";
    },
    raw => {
      raw.closedManifoldAudit.openEdgeCount = 1;
      raw.closedManifoldAudit.closed = false;
    },
    raw => {
      raw.provider.kernel.version = "forged-version";
    },
    raw => {
      raw.closedManifoldAudit.componentIds = [
        "different-solid-component",
      ];
    },
  ];

  for (const mutate of cases) {
    const injected = provider();
    const original = injected.executeExactBoolean;
    injected.executeExactBoolean = async request => {
      const raw = await original(request);
      mutate(raw);
      return raw;
    };
    const result = await execute({ provider: injected });
    assert.equal(result.ok, false);
    assert.equal(result.exactSolid, false);
    assert.equal(result.manufacturing, false);
  }
});

test("provider manufacturing or export claims are rejected, not propagated", async () => {
  const injected = provider();
  const original = injected.executeExactBoolean;
  injected.executeExactBoolean = request => {
    const raw = original(request);
    raw.manufacturing = true;
    raw.exportAuthorized = true;
    raw.stl = true;
    return raw;
  };
  const result = await execute({ provider: injected });

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    exactKernel.failureCodes.AUTHORITY_REFUSED,
  );
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});

test("provider exceptions become typed failures without leaked executable state", async () => {
  const injected = provider({
    executeExactBoolean() {
      throw new TypeError("fixture provider stopped");
    },
  });
  const result = await execute({ provider: injected });

  assert.equal(result.ok, false);
  assert.equal(result.code, exactKernel.failureCodes.PROVIDER_FAILED);
  assert.equal(result.diagnostics[0].details.errorName, "TypeError");
  assert.equal(
    result.diagnostics[0].details.errorMessage,
    "fixture provider stopped",
  );
});

test("manufacturing preflight always refuses and performs no export", () => {
  const result = exactKernel.manufacturingPreflight("stl");
  assert.equal(result.ok, false);
  assert.equal(result.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(result.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.export, false);
  assert.equal(result.stl, false);
});

test("browser script exposes the same fail-closed API without CommonJS", () => {
  const context = { globalThis: {} };
  vm.runInNewContext(moduleSource, context, {
    filename: "threeway-exact-kernel.js",
  });

  assert.equal(context.globalThis.MEH3ExactKernel.version, 1);
  assert.equal(
    context.globalThis.MEH3ExactKernel.capabilities.providerBundled,
    false,
  );
  assert.equal(
    typeof context.globalThis.MEH3ExactKernel.executeExactBoolean,
    "function",
  );
});
