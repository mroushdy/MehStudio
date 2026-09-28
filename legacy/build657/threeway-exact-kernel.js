/*
 * MEH Studio v5 — strict schema-2 three-way exact-Boolean adapter.
 *
 * The adapter executes one already-validated provider-neutral solid plan
 * through an explicitly injected provider at an explicitly supplied
 * tolerance.  It does not select/install a kernel, infer a tolerance, repair
 * meshes, perform a fabrication audit, authorize manufacturing, or export.
 */
(function attachThreeWayExactKernel(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3ExactKernel = api;
}(typeof globalThis !== "undefined" ? globalThis : this,
function createThreeWayExactKernel() {
  "use strict";

  const VERSION = 1;
  const PLAN_SCHEMA_VERSION = 1;
  const OUTPUT_SCHEMA_VERSION = 1;
  const PLAN_HASH_VERSION = "meh3-solid-plan-v1";
  const MESH_HASH_VERSION = "meh3-exact-mesh-v1";
  const SOLID_HASH_VERSION = "meh3-exact-solid-v1";
  const RESULT_KIND = "threeway-exact-boolean-provider-result";
  const AUDIT_KIND = "threeway-closed-manifold-audit";
  const REQUIRED_PROVIDER_CAPABILITIES = Object.freeze([
    "providerNeutralSolidPlanV1",
    "indexedTriangleMeshInput",
    "indexedTriangleMeshOutput",
    "explicitToleranceM",
    "metreUnits",
    "booleanUnion",
    "booleanSubtraction",
    "exactBoolean",
    "closedManifoldAudit",
    "deterministicMeshIdentity"
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const FAILURE_CODES = deepFreeze({
    INPUT_INVALID: "THREEWAY_EXACT_KERNEL_INPUT_INVALID",
    PLAN_REQUIRED: "THREEWAY_EXACT_KERNEL_PLAN_REQUIRED",
    PLAN_INVALID: "THREEWAY_EXACT_KERNEL_PLAN_INVALID",
    HASH_MISMATCH: "THREEWAY_EXACT_KERNEL_HASH_MISMATCH",
    PROVIDER_UNAVAILABLE: "THREEWAY_EXACT_KERNEL_PROVIDER_UNAVAILABLE",
    PROVIDER_INVALID: "THREEWAY_EXACT_KERNEL_PROVIDER_INVALID",
    CAPABILITY_MISSING: "THREEWAY_EXACT_KERNEL_CAPABILITY_MISSING",
    TOLERANCE_REQUIRED: "THREEWAY_EXACT_KERNEL_TOLERANCE_REQUIRED",
    PROVIDER_FAILED: "THREEWAY_EXACT_KERNEL_PROVIDER_FAILED",
    RESULT_INVALID: "THREEWAY_EXACT_KERNEL_RESULT_INVALID",
    MESH_INVALID: "THREEWAY_EXACT_KERNEL_MESH_INVALID",
    MESH_IDENTITY_MISMATCH:
      "THREEWAY_EXACT_KERNEL_MESH_IDENTITY_MISMATCH",
    AUDIT_INVALID: "THREEWAY_EXACT_KERNEL_AUDIT_INVALID",
    AUTHORITY_REFUSED: "THREEWAY_EXACT_KERNEL_AUTHORITY_REFUSED"
  });

  const CODE_ORDER = Object.freeze([
    FAILURE_CODES.INPUT_INVALID,
    FAILURE_CODES.PLAN_REQUIRED,
    FAILURE_CODES.PLAN_INVALID,
    FAILURE_CODES.HASH_MISMATCH,
    FAILURE_CODES.PROVIDER_UNAVAILABLE,
    FAILURE_CODES.PROVIDER_INVALID,
    FAILURE_CODES.CAPABILITY_MISSING,
    FAILURE_CODES.TOLERANCE_REQUIRED,
    FAILURE_CODES.PROVIDER_FAILED,
    FAILURE_CODES.RESULT_INVALID,
    FAILURE_CODES.MESH_INVALID,
    FAILURE_CODES.MESH_IDENTITY_MISMATCH,
    FAILURE_CODES.AUDIT_INVALID,
    FAILURE_CODES.AUTHORITY_REFUSED
  ]);

  const CAPABILITIES = deepFreeze({
    status: "explicit-provider-exact-boolean-adapter",
    schema2Only: true,
    providerNeutralSolidPlanV1Only: true,
    explicitProviderRequired: true,
    explicitToleranceRequired: true,
    planHashValidation: true,
    solutionHashParityValidation: true,
    exactBooleanExecution: true,
    closedManifoldEvidenceValidation: true,
    deterministicMeshIdentityValidation: true,
    providerBundled: false,
    providerSelectedByAdapter: false,
    providerInstall: false,
    toleranceInference: false,
    geometryInference: false,
    meshRepair: false,
    fabricationAudit: false,
    exportAuthorization: false,
    manufacturing: false,
    export: false,
    stl: false,
    reason:
      "An exact closed-manifold result is evidence for the separate fabrication gate, never manufacturing or export authorization."
  });

  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
  }

  function exactString(value) {
    const cleaned = cleanString(value);
    return cleaned && cleaned === value ? cleaned : null;
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value).sort()) {
        if (value[key] !== undefined) copy[key] = cloneValue(value[key]);
      }
      return copy;
    }
    if (typeof value === "number" && Object.is(value, -0)) return 0;
    return value;
  }

  function stableClone(value) {
    if (Array.isArray(value)) return value.map(stableClone);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value).sort()) {
        if (value[key] !== undefined) copy[key] = stableClone(value[key]);
      }
      return copy;
    }
    if (typeof value === "number") {
      return Number.isFinite(value)
        ? (Object.is(value, -0) ? 0 : value)
        : null;
    }
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean") {
      return value;
    }
    return null;
  }

  function stableStringify(value) {
    return JSON.stringify(stableClone(value));
  }

  function collectDataIssues(value, path, issues, ancestors) {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean") {
      return;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) issues.push(path);
      return;
    }
    if (typeof value !== "object") {
      issues.push(path);
      return;
    }
    if (ancestors.has(value)) {
      issues.push(path);
      return;
    }
    ancestors.add(value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          issues.push(`${path}[${index}]`);
        } else {
          collectDataIssues(
            value[index],
            `${path}[${index}]`,
            issues,
            ancestors
          );
        }
      }
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        issues.push(path);
      } else {
        for (const key of Reflect.ownKeys(value)) {
          if (typeof key !== "string" || value[key] === undefined) {
            issues.push(`${path}.${String(key)}`);
          } else {
            collectDataIssues(
              value[key],
              `${path}.${key}`,
              issues,
              ancestors
            );
          }
        }
      }
    }
    ancestors.delete(value);
  }

  function uniqueStrings(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(cleanString).filter(Boolean))].sort();
  }

  function stringArray(value) {
    if (!Array.isArray(value) ||
        value.some(item => !exactString(item)) ||
        new Set(value).size !== value.length) {
      return null;
    }
    return value.slice().sort();
  }

  function diagnostic(code, paths, message, details) {
    return {
      code,
      severity: "error",
      phase: "exact-kernel",
      paths: uniqueStrings(paths),
      message,
      details: isRecord(details) ? cloneValue(details) : {},
      evidenceRefs: [],
      blocksCapabilities: [
        "exactBooleanExecution",
        "exactSolid",
        "manufacturing",
        "export",
        "stl"
      ]
    };
  }

  function sortDiagnostics(diagnostics) {
    const order = new Map(CODE_ORDER.map((code, index) => [code, index]));
    return diagnostics.slice().sort((left, right) => {
      const leftOrder = order.has(left.code)
        ? order.get(left.code)
        : CODE_ORDER.length;
      const rightOrder = order.has(right.code)
        ? order.get(right.code)
        : CODE_ORDER.length;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return [
        left.code,
        left.paths.join("\u0000"),
        left.message
      ].join("\u0001").localeCompare([
        right.code,
        right.paths.join("\u0000"),
        right.message
      ].join("\u0001"));
    });
  }

  function failure(diagnostics, identity) {
    const ordered = sortDiagnostics(diagnostics);
    const ids = isRecord(identity) ? identity : {};
    return deepFreeze({
      ok: false,
      available: ordered.length > 0 &&
        ordered.every(item =>
          item.code !== FAILURE_CODES.PROVIDER_UNAVAILABLE
        ),
      code: ordered.length
        ? ordered[0].code
        : FAILURE_CODES.INPUT_INVALID,
      result: null,
      diagnostics: ordered,
      inputHash: cleanString(ids.inputHash),
      solutionHash: cleanString(ids.solutionHash),
      planHash: cleanString(ids.planHash),
      solidHash: null,
      booleanExecuted: false,
      exactSolid: false,
      fabricationAudited: false,
      manufacturing: false,
      export: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function validateIndexedMesh(
    raw,
    path,
    diagnostics,
    metreUnitsInherited
  ) {
    if (!isRecord(raw) ||
        (!metreUnitsInherited && cleanString(raw.units) !== "m") ||
        !Array.isArray(raw.verticesM) ||
        raw.verticesM.length < 4 ||
        !Array.isArray(raw.triangles) ||
        raw.triangles.length < 4) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_INVALID,
        [path],
        "The provider must return one explicit metre-unit indexed triangle mesh with at least four vertices and four faces."
      ));
      return null;
    }
    const verticesM = raw.verticesM.map((vertex, index) => {
      if (!Array.isArray(vertex) ||
          vertex.length !== 3 ||
          !vertex.every(finite)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.MESH_INVALID,
          [`${path}.verticesM[${index}]`],
          "Every exact-mesh vertex must contain three finite metre coordinates."
        ));
        return null;
      }
      return vertex.map(value => Object.is(value, -0) ? 0 : value);
    });
    const triangles = raw.triangles.map((triangle, index) => {
      if (!Array.isArray(triangle) ||
          triangle.length !== 3 ||
          triangle.some(vertexIndex =>
            !Number.isInteger(vertexIndex) ||
            vertexIndex < 0 ||
            vertexIndex >= raw.verticesM.length
          ) ||
          new Set(triangle).size !== 3) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.MESH_INVALID,
          [`${path}.triangles[${index}]`],
          "Every exact-mesh face must contain three distinct in-range integer vertex indices."
        ));
        return null;
      }
      return triangle.slice();
    });
    if (verticesM.includes(null) || triangles.includes(null)) return null;
    return {
      units: "m",
      verticesM,
      triangles
    };
  }

  function computeMeshIdentity(mesh) {
    const diagnostics = [];
    const normalized = validateIndexedMesh(mesh, "mesh", diagnostics);
    if (!normalized || diagnostics.length) return null;
    return `${MESH_HASH_VERSION}\n${stableStringify(normalized)}`;
  }

  function validatePlanEnvelope(raw) {
    const diagnostics = [];
    if (!isRecord(raw)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_REQUIRED,
        ["solidPlan"],
        "Exactly one successful three-way solid-plan envelope is required."
      ));
      return { diagnostics, plan: null, identity: {} };
    }
    const dataIssues = [];
    collectDataIssues(raw, "solidPlan", dataIssues, new Set());
    if (dataIssues.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_INVALID,
        dataIssues,
        "The solid-plan envelope must be finite, acyclic plain data."
      ));
      return { diagnostics, plan: null, identity: {} };
    }
    const result = isRecord(raw.result) ? raw.result : null;
    const identity = {
      inputHash: cleanString(raw.inputHash),
      solutionHash: cleanString(raw.solutionHash),
      planHash: cleanString(raw.planHash)
    };
    if (raw.ok !== true ||
        !result ||
        raw.code !== null ||
        !Array.isArray(raw.diagnostics) ||
        raw.diagnostics.length !== 0 ||
        raw.booleanExecuted !== false ||
        raw.exactSolid !== false ||
        raw.manufacturing !== false ||
        raw.export !== false ||
        raw.stl !== false) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_INVALID,
        ["solidPlan"],
        "Only an unexecuted successful provider-neutral solid-plan envelope may enter the exact adapter."
      ));
    }
    if (!result ||
        result.schemaVersion !== PLAN_SCHEMA_VERSION ||
        result.kind !== "threeway-provider-neutral-solid-plan" ||
        result.units !== "m" ||
        !cleanString(result.topologyId) ||
        !cleanString(result.constructionId) ||
        !cleanString(result.topologyImplementationRevision) ||
        !stringArray(result.componentIds) ||
        !stringArray(result.lumenIds) ||
        !stringArray(result.mountHostIds)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_INVALID,
        ["solidPlan.result"],
        "The envelope result is not a complete schema-1 provider-neutral three-way solid plan."
      ));
    }
    if (!result) return { diagnostics, plan: null, identity };
    if (!identity.inputHash ||
        !identity.solutionHash ||
        !identity.planHash ||
        cleanString(result.inputHash) !== identity.inputHash ||
        cleanString(result.solutionHash) !== identity.solutionHash ||
        cleanString(result.planHash) !== identity.planHash ||
        cleanString(raw.hashInput) !== identity.planHash) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.HASH_MISMATCH,
        [
          "solidPlan.inputHash",
          "solidPlan.solutionHash",
          "solidPlan.planHash",
          "solidPlan.hashInput",
          "solidPlan.result.inputHash",
          "solidPlan.result.solutionHash",
          "solidPlan.result.planHash"
        ],
        "Solid-plan envelope, result, and canonical hash identities must match exactly."
      ));
    }
    const provider = isRecord(result.provider) ? result.provider : {};
    const execution = isRecord(result.execution) ? result.execution : {};
    const invariants = isRecord(result.invariants) ? result.invariants : {};
    if (provider.selected !== false ||
        provider.id !== null ||
        provider.kernelId !== null ||
        execution.providerSelected !== false ||
        execution.kernelSelected !== false ||
        execution.toleranceApplied !== false ||
        execution.booleanUnionExecuted !== false ||
        execution.booleanSubtractionExecuted !== false ||
        execution.exactSolid !== false ||
        execution.fabricationAudited !== false ||
        execution.manufacturing !== false ||
        execution.export !== false ||
        execution.stl !== false ||
        invariants.physicsSolutionOnly !== true ||
        invariants.renderGeometryConsumed !== false ||
        invariants.legacyInputConsumed !== false ||
        invariants.allNodeHashesMatchSolution !== true ||
        invariants.geometryInferred !== false ||
        invariants.toleranceInferred !== false ||
        invariants.meshesGenerated !== false ||
        invariants.booleansExecuted !== false) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_INVALID,
        [
          "solidPlan.result.provider",
          "solidPlan.result.execution",
          "solidPlan.result.invariants"
        ],
        "The plan must remain provider-neutral, unexecuted, non-inferred, and physics-solution-owned."
      ));
    }
    const dag = isRecord(result.dag) ? result.dag : {};
    const nodes = Array.isArray(dag.nodes) ? dag.nodes : [];
    const edges = Array.isArray(dag.edges) ? dag.edges : [];
    const stages = Array.isArray(dag.stages) ? dag.stages : [];
    const nodeMap = new Map();
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      const path = `solidPlan.result.dag.nodes[${index}]`;
      const id = isRecord(node) ? cleanString(node.id) : null;
      if (!id || nodeMap.has(id) ||
          cleanString(node.inputHash) !== identity.inputHash ||
          cleanString(node.solutionHash) !== identity.solutionHash ||
          node.booleanExecuted !== false ||
          node.exactSolid !== false ||
          node.manufacturing !== false) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PLAN_INVALID,
          [path],
          "Every DAG node requires a unique ID, exact hash parity, and unexecuted status."
        ));
      }
      if (id) nodeMap.set(id, node);
    }
    if (!nodes.length || !cleanString(dag.rootNodeId) ||
        !nodeMap.has(cleanString(dag.rootNodeId)) ||
        stages.length !== 3) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_INVALID,
        ["solidPlan.result.dag"],
        "The deterministic three-stage operand DAG and its root node are required."
      ));
    }
    const expectedEdges = new Set();
    for (const [id, node] of nodeMap.entries()) {
      const path = `solidPlan.result.dag.nodes[${id}]`;
      const inputs = Array.isArray(node.inputs) ? node.inputs : null;
      if (node.kind === "operand") {
        if (!inputs || inputs.length ||
            !["positive", "negative"].includes(node.polarity)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.PLAN_INVALID,
            [path],
            "Operand nodes require zero inputs and explicit positive/negative polarity."
          ));
        }
        validateIndexedMesh(
          node.mesh,
          `${path}.mesh`,
          diagnostics,
          true
        );
      } else if (node.kind === "operation") {
        const operation = cleanString(node.operation);
        if (!inputs ||
            !["union", "subtract"].includes(operation) ||
            (operation === "union" && inputs.length < 1) ||
            (operation === "subtract" && inputs.length !== 2) ||
            inputs.some(inputId =>
              !cleanString(inputId) ||
              inputId === id ||
              !nodeMap.has(inputId)
            )) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.PLAN_INVALID,
            [path],
            "Operation nodes require explicit resolved union or binary-subtraction inputs."
          ));
        } else {
          for (const inputId of inputs) {
            expectedEdges.add(`${inputId}\u0000${id}`);
          }
        }
      } else {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PLAN_INVALID,
          [`${path}.kind`],
          "Only operand and operation DAG nodes are supported."
        ));
      }
    }
    const actualEdges = new Set();
    for (let index = 0; index < edges.length; index++) {
      const edge = isRecord(edges[index]) ? edges[index] : {};
      const key = `${cleanString(edge.from) || ""}\u0000` +
        `${cleanString(edge.to) || ""}`;
      if (!nodeMap.has(cleanString(edge.from)) ||
          !nodeMap.has(cleanString(edge.to)) ||
          cleanString(edge.inputHash) !== identity.inputHash ||
          cleanString(edge.solutionHash) !== identity.solutionHash ||
          actualEdges.has(key)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PLAN_INVALID,
          [`solidPlan.result.dag.edges[${index}]`],
          "DAG edges must be unique, resolved, and hash-identical to the solution."
        ));
      }
      actualEdges.add(key);
    }
    if (actualEdges.size !== expectedEdges.size ||
        [...expectedEdges].some(key => !actualEdges.has(key))) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLAN_INVALID,
        ["solidPlan.result.dag.edges"],
        "DAG edges must exactly represent every operation input."
      ));
    }
    for (let index = 0; index < stages.length; index++) {
      const stage = isRecord(stages[index]) ? stages[index] : {};
      if (stage.order !== index ||
          cleanString(stage.inputHash) !== identity.inputHash ||
          cleanString(stage.solutionHash) !== identity.solutionHash) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PLAN_INVALID,
          [`solidPlan.result.dag.stages[${index}]`],
          "The three solid-plan stages require deterministic order and exact hash parity."
        ));
      }
    }
    if (result.planHash) {
      const resultBase = cloneValue(result);
      delete resultBase.planHash;
      const expectedPlanHash =
        `${PLAN_HASH_VERSION}\n${stableStringify(resultBase)}`;
      if (identity.planHash !== expectedPlanHash) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HASH_MISMATCH,
          ["solidPlan.planHash", "solidPlan.result"],
          "The solid-plan hash must equal the canonical plan payload; restamped or mutated plans are refused."
        ));
      }
    }
    return {
      diagnostics,
      plan: diagnostics.length ? null : cloneValue(result),
      identity
    };
  }

  function validateProvider(provider, diagnostics) {
    if (provider === null || provider === undefined) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PROVIDER_UNAVAILABLE,
        ["provider"],
        "No exact-Boolean provider is installed or injected; execution remains unavailable."
      ));
      return null;
    }
    if (!isRecord(provider) ||
        !exactString(provider.id) ||
        !exactString(provider.version) ||
        !isRecord(provider.kernel) ||
        !exactString(provider.kernel.id) ||
        !exactString(provider.kernel.version) ||
        typeof provider.executeExactBoolean !== "function") {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PROVIDER_INVALID,
        ["provider"],
        "An explicit versioned provider/kernel and executeExactBoolean function are required."
      ));
      return null;
    }
    const capabilities = isRecord(provider.capabilities)
      ? provider.capabilities
      : {};
    const missing = REQUIRED_PROVIDER_CAPABILITIES.filter(
      capability => capabilities[capability] !== true
    );
    if (missing.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.CAPABILITY_MISSING,
        missing.map(capability => `provider.capabilities.${capability}`),
        "The injected provider lacks required exact-Boolean protocol capabilities.",
        { missingCapabilities: missing }
      ));
      return null;
    }
    return {
      id: provider.id,
      version: provider.version,
      kernel: {
        id: provider.kernel.id,
        version: provider.kernel.version
      },
      capabilities: Object.fromEntries(
        REQUIRED_PROVIDER_CAPABILITIES.map(name => [name, true])
      )
    };
  }

  function sameProviderIdentity(actual, expected) {
    return isRecord(actual) &&
      cleanString(actual.id) === expected.id &&
      cleanString(actual.version) === expected.version &&
      isRecord(actual.kernel) &&
      cleanString(actual.kernel.id) === expected.kernel.id &&
      cleanString(actual.kernel.version) === expected.kernel.version;
  }

  function validateProviderResult(
    raw,
    request,
    providerIdentity,
    diagnostics
  ) {
    const dataIssues = [];
    collectDataIssues(raw, "providerResult", dataIssues, new Set());
    if (!isRecord(raw) || dataIssues.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.RESULT_INVALID,
        dataIssues.length ? dataIssues : ["providerResult"],
        "The provider result must be finite, acyclic plain data."
      ));
      return null;
    }
    if (raw.schemaVersion !== OUTPUT_SCHEMA_VERSION ||
        raw.kind !== RESULT_KIND ||
        raw.ok !== true ||
        raw.booleanCompleted !== true ||
        raw.units !== "m" ||
        !cleanString(raw.solidArtifactId) ||
        !sameProviderIdentity(raw.provider, providerIdentity)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.RESULT_INVALID,
        ["providerResult"],
        "The provider did not return one successful versioned exact-Boolean protocol result."
      ));
    }
    if (cleanString(raw.inputHash) !== request.inputHash ||
        cleanString(raw.solutionHash) !== request.solutionHash ||
        cleanString(raw.planHash) !== request.planHash ||
        raw.toleranceM !== request.toleranceM) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.HASH_MISMATCH,
        [
          "providerResult.inputHash",
          "providerResult.solutionHash",
          "providerResult.planHash",
          "providerResult.toleranceM"
        ],
        "Provider evidence must retain exact request hash and tolerance identity."
      ));
    }
    if (raw.manufacturingAuthority === true ||
        raw.fabricationAudited === true ||
        raw.manufacturing === true ||
        raw.exportAuthorized === true ||
        raw.export === true ||
        raw.stl === true) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.AUTHORITY_REFUSED,
        ["providerResult"],
        "The exact provider may not smuggle fabrication, manufacturing, or export authority through this adapter."
      ));
    }
    const mesh = validateIndexedMesh(
      raw.mesh,
      "providerResult.mesh",
      diagnostics
    );
    const computedMeshIdentity = mesh
      ? `${MESH_HASH_VERSION}\n${stableStringify(mesh)}`
      : null;
    if (!computedMeshIdentity ||
        cleanString(raw.meshIdentity) !== computedMeshIdentity ||
        !isRecord(raw.mesh) ||
        cleanString(raw.mesh.meshIdentity) !== computedMeshIdentity) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_IDENTITY_MISMATCH,
        [
          "providerResult.meshIdentity",
          "providerResult.mesh.meshIdentity"
        ],
        "Provider and mesh identities must exactly equal the adapter's canonical indexed-mesh identity."
      ));
    }
    const audit = isRecord(raw.closedManifoldAudit)
      ? raw.closedManifoldAudit
      : {};
    const componentIds = stringArray(raw.componentIds);
    const auditedComponentIds = stringArray(audit.componentIds);
    const zeroFields = [
      "openEdgeCount",
      "boundaryEdgeCount",
      "nonmanifoldEdgeCount",
      "degenerateFaceCount",
      "reversedFaceCount"
    ];
    if (audit.schemaVersion !== 1 ||
        audit.kind !== AUDIT_KIND ||
        audit.ok !== true ||
        audit.pass !== true ||
        audit.closed !== true ||
        audit.twoManifold !== true ||
        !Number.isInteger(audit.componentCount) ||
        audit.componentCount < 1 ||
        !componentIds ||
        componentIds.length !== audit.componentCount ||
        !auditedComponentIds ||
        stableStringify(componentIds) !==
          stableStringify(auditedComponentIds) ||
        audit.vertexCount !== (mesh && mesh.verticesM.length) ||
        audit.triangleCount !== (mesh && mesh.triangles.length) ||
        zeroFields.some(field => audit[field] !== 0) ||
        cleanString(audit.meshIdentity) !== computedMeshIdentity ||
        cleanString(audit.inputHash) !== request.inputHash ||
        cleanString(audit.solutionHash) !== request.solutionHash ||
        cleanString(audit.planHash) !== request.planHash ||
        !sameProviderIdentity(audit.provider, providerIdentity)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.AUDIT_INVALID,
        ["providerResult.closedManifoldAudit"],
        "The provider must return matching zero-defect closed two-manifold audit evidence for every reported component."
      ));
    }
    if (diagnostics.length) return null;
    return {
      solidArtifactId: raw.solidArtifactId,
      componentIds,
      mesh: {
        ...mesh,
        meshIdentity: computedMeshIdentity
      },
      meshIdentity: computedMeshIdentity,
      closedManifoldAudit: cloneValue(audit)
    };
  }

  async function executeExactBoolean(input) {
    if (!isRecord(input)) {
      return failure([diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        ["input"],
        "executeExactBoolean requires one explicit input record."
      )]);
    }
    const planValidation = validatePlanEnvelope(input.solidPlan);
    if (planValidation.diagnostics.length) {
      return failure(
        planValidation.diagnostics,
        planValidation.identity
      );
    }
    const diagnostics = [];
    const providerIdentity = validateProvider(input.provider, diagnostics);
    if (!finite(input.toleranceM) || input.toleranceM <= 0) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.TOLERANCE_REQUIRED,
        ["toleranceM"],
        "A finite positive tolerance in metres must be supplied explicitly; no default or inference is permitted."
      ));
    }
    const requestedTolerance =
      planValidation.plan &&
      planValidation.plan.requestedBooleanToleranceM;
    if (finite(requestedTolerance) &&
        input.toleranceM !== requestedTolerance) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.TOLERANCE_REQUIRED,
        [
          "toleranceM",
          "solidPlan.result.requestedBooleanToleranceM"
        ],
        "Exact execution must use the source-pinned construction tolerance verbatim.",
        {
          requestedToleranceM: requestedTolerance,
          suppliedToleranceM: input.toleranceM
        }
      ));
    }
    if (diagnostics.length) {
      return failure(diagnostics, planValidation.identity);
    }
    const plan = deepFreeze(cloneValue(planValidation.plan));
    const request = deepFreeze({
      schemaVersion: 1,
      kind: "threeway-exact-boolean-request",
      units: "m",
      toleranceM: input.toleranceM,
      inputHash: planValidation.identity.inputHash,
      solutionHash: planValidation.identity.solutionHash,
      planHash: planValidation.identity.planHash,
      plan,
      provider: providerIdentity,
      toleranceInferred: false,
      geometryInferred: false,
      manufacturingRequested: false,
      exportRequested: false,
      stlRequested: false
    });
    let rawResult;
    try {
      rawResult = await Promise.resolve(
        input.provider.executeExactBoolean(request)
      );
    } catch (error) {
      return failure([diagnostic(
        FAILURE_CODES.PROVIDER_FAILED,
        ["provider.executeExactBoolean"],
        "The injected exact-Boolean provider failed without producing admissible evidence.",
        {
          providerId: providerIdentity.id,
          errorName: cleanString(error && error.name) || "Error",
          errorMessage: cleanString(error && error.message) ||
            "Provider execution failed."
        }
      )], planValidation.identity);
    }
    const evidenceDiagnostics = [];
    const evidence = validateProviderResult(
      rawResult,
      request,
      providerIdentity,
      evidenceDiagnostics
    );
    if (!evidence) {
      return failure(evidenceDiagnostics, planValidation.identity);
    }
    const solidIdentity = {
      schemaVersion: OUTPUT_SCHEMA_VERSION,
      inputHash: request.inputHash,
      solutionHash: request.solutionHash,
      planHash: request.planHash,
      topologyId: plan.topologyId,
      constructionId: plan.constructionId,
      topologyImplementationRevision:
        plan.topologyImplementationRevision,
      toleranceM: request.toleranceM,
      provider: providerIdentity,
      solidArtifactId: evidence.solidArtifactId,
      meshIdentity: evidence.meshIdentity,
      componentIds: evidence.componentIds
    };
    const hashInput =
      `${SOLID_HASH_VERSION}\n${stableStringify(solidIdentity)}`;
    const solidHash = hashInput;
    const result = deepFreeze({
      schemaVersion: OUTPUT_SCHEMA_VERSION,
      kind: "threeway-exact-solid-evidence",
      ok: true,
      exactSolid: true,
      inputHash: request.inputHash,
      solutionHash: request.solutionHash,
      planHash: request.planHash,
      solidHash,
      hashInput,
      topologyId: plan.topologyId,
      constructionId: plan.constructionId,
      topologyImplementationRevision:
        plan.topologyImplementationRevision,
      units: "m",
      solidArtifactId: evidence.solidArtifactId,
      booleanCompleted: true,
      withinResourceBudget: false,
      componentIds: cloneValue(evidence.componentIds),
      operandComponentIds: cloneValue(plan.componentIds),
      lumenIds: cloneValue(plan.lumenIds),
      mountHostIds: cloneValue(plan.mountHostIds),
      provider: providerIdentity,
      tolerance: {
        units: "m",
        valueM: request.toleranceM,
        explicit: true,
        inferred: false
      },
      meshIdentity: evidence.meshIdentity,
      mesh: evidence.mesh,
      closedManifoldAudit: evidence.closedManifoldAudit,
      fabricationAudited: false,
      manufacturing: false,
      exportAuthorized: false,
      export: false,
      stl: false
    });
    return deepFreeze({
      ok: true,
      available: true,
      code: null,
      result,
      diagnostics: [],
      inputHash: request.inputHash,
      solutionHash: request.solutionHash,
      planHash: request.planHash,
      solidHash,
      booleanExecuted: true,
      exactSolid: true,
      fabricationAudited: false,
      manufacturing: false,
      export: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function manufacturingPreflight(operation) {
    return deepFreeze({
      ok: false,
      available: false,
      operation: cleanString(operation) ||
        "manufacturing-or-export",
      code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
      reason: CAPABILITIES.reason,
      booleanExecuted: false,
      exactSolid: false,
      fabricationAudited: false,
      manufacturing: false,
      export: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  return deepFreeze({
    version: VERSION,
    planSchemaVersion: PLAN_SCHEMA_VERSION,
    outputSchemaVersion: OUTPUT_SCHEMA_VERSION,
    requiredProviderCapabilities: REQUIRED_PROVIDER_CAPABILITIES,
    failureCodes: FAILURE_CODES,
    capabilities: CAPABILITIES,
    stableStringify,
    computeMeshIdentity,
    executeExactBoolean,
    manufacturingPreflight
  });
}));
