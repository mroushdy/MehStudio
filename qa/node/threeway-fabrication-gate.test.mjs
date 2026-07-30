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
const modulePath = path.join(
  appRoot, "threeway-fabrication-gate.js");
const gate = require(modulePath);

const ZERO_FIELDS = [
  "openEdgeCount",
  "nonmanifoldEdgeCount",
  "reversedFaceCount",
  "degenerateFaceCount",
  "selfIntersectionCount",
  "trappedVolumeCount",
  "internalMembraneCount",
];
const THRESHOLD_FIELDS = [
  "minWallM",
  "minWebM",
  "minFeatureM",
  "minClearanceM",
];

function provider(id, version, kernelId, kernelVersion) {
  return {
    id,
    version,
    kernel: { id: kernelId, version: kernelVersion },
  };
}

function fixture() {
  const solidProvider = {
    ...provider(
      "exact-solid-provider",
      "2.4.0",
      "exact-boolean-kernel",
      "7.1.3",
    ),
    supportedFormats: ["stl"],
  };
  return {
    requestedFormat: "stl",
    stateHash: "state-hash-001",
    state: {
      schemaVersion: 2,
      designId: "fabrication-fixture",
      revision: 9,
      topology: { kind: "T3", schemaVersion: 1 },
    },
    solution: {
      schemaVersion: 2,
      ok: true,
      inputHash: "state-hash-001",
      solutionHash: "solution-hash-001",
      readiness: { analysis: true },
      exactSolid: false,
      manufacturing: false,
      stl: false,
    },
    exactSolid: {
      schemaVersion: 1,
      ok: true,
      exactSolid: true,
      inputHash: "state-hash-001",
      solutionHash: "solution-hash-001",
      planHash: "plan-hash-001",
      solidHash: "solid-hash-001",
      topologyId: "T3",
      constructionId: "integrated-solid",
      topologyImplementationRevision: "t3-integrated-r1",
      units: "m",
      solidArtifactId: "solid-artifact-001",
      booleanCompleted: true,
      withinResourceBudget: true,
      componentIds: ["solid-main"],
      lumenIds: ["lumen-low-a", "lumen-mid-a"],
      mountHostIds: ["mount-low-a", "mount-mid-a"],
      provider: solidProvider,
    },
    audit: {
      schemaVersion: 1,
      ok: true,
      pass: true,
      deep: true,
      inputHash: "state-hash-001",
      solutionHash: "solution-hash-001",
      planHash: "plan-hash-001",
      solidHash: "solid-hash-001",
      auditHash: "audit-hash-001",
      topologyId: "T3",
      constructionId: "integrated-solid",
      topologyImplementationRevision: "t3-integrated-r1",
      units: "m",
      provider: provider(
        "fabrication-audit-provider",
        "1.2.0",
        "topology-audit-kernel",
        "3.0.1",
      ),
      solidProvider: structuredClone(solidProvider),
      auditedFormats: ["stl"],
      topologyChecks: Object.fromEntries(
        ZERO_FIELDS.map(field => [field, 0]),
      ),
      components: {
        policy: "single-intended-solid",
        expectedCount: 1,
        actualCount: 1,
        componentIds: ["solid-main"],
        connectedWithinEach: true,
        documentedSetId: null,
        documentationRefs: [],
      },
      dimensionsM: {
        finite: true,
        minM: [-0.3, -0.4, -0.25],
        maxM: [0.5, 0.4, 0.25],
        sizeM: [0.8, 0.8, 0.5],
        volumeM3: 0.032,
      },
      thresholds: {
        units: "m",
        required: {
          minWallM: 0.003,
          minWebM: 0.0025,
          minFeatureM: 0.0012,
          minClearanceM: 0.0004,
        },
        measured: {
          minWallM: 0.0041,
          minWebM: 0.0032,
          minFeatureM: 0.0018,
          minClearanceM: 0.0007,
        },
      },
      lumens: {
        expectedCount: 2,
        connectedCount: 2,
        continuousCount: 2,
        allConnected: true,
        allChamberToApertureContinuous: true,
        records: [
          {
            id: "lumen-low-a",
            sourceId: "source-low",
            stationId: "station-low",
            connected: true,
            chamberToApertureContinuous: true,
          },
          {
            id: "lumen-mid-a",
            sourceId: "source-mid",
            stationId: "station-mid",
            connected: true,
            chamberToApertureContinuous: true,
          },
        ],
      },
      mountHosts: {
        expectedCount: 2,
        continuousCount: 2,
        allBodyContinuous: true,
        allHornContactsContinuous: true,
        records: [
          {
            id: "mount-low-a",
            sourceId: "source-low",
            bodyContinuous: true,
            hornContactContinuous: true,
          },
          {
            id: "mount-mid-a",
            sourceId: "source-mid",
            bodyContinuous: true,
            hornContactContinuous: true,
          },
        ],
      },
      collisions: {
        checked: true,
        count: 0,
        unallowedCount: 0,
        records: [],
      },
    },
  };
}

function authorize(input = fixture()) {
  return gate.authorizeExport(input);
}

test("complete current evidence emits one deterministic immutable STL authorization", () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = authorize(input);

  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.exportAuthorized, true);
  assert.equal(result.exactSolid, true);
  assert.equal(result.manufacturing, true);
  assert.equal(result.stl, true);
  assert.equal(result.hardwareValidated, false);
  assert.equal(result.acousticValidated, false);
  assert.equal(result.authorization.kind,
    "threeway-export-authorization");
  assert.equal(result.authorization.stateHash, input.stateHash);
  assert.equal(
    result.authorization.solutionHash,
    input.solution.solutionHash,
  );
  assert.equal(
    result.authorization.solidHash,
    input.exactSolid.solidHash,
  );
  assert.equal(
    result.authorization.auditHash,
    input.audit.auditHash,
  );
  assert.equal(result.authorization.exportWritesPerformed, false);
  assert.match(
    result.authorization.fingerprintInput,
    /^meh3-export-authorization-v1\n/,
  );
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.authorization));
  assert.ok(Object.isFrozen(
    result.authorization.thresholds.required));
});

test("keyed evidence permutations produce the same authorization and fingerprint input", () => {
  const left = fixture();
  const right = fixture();
  right.exactSolid.lumenIds.reverse();
  right.exactSolid.mountHostIds.reverse();
  right.audit.lumens.records.reverse();
  right.audit.mountHosts.records.reverse();
  right.audit.solidProvider.supportedFormats.reverse();

  const a = authorize(left);
  const b = authorize(right);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.deepEqual(a.authorization, b.authorization);
});

test("provider, Boolean kernel, and deep audit are independently mandatory", () => {
  const cases = [
    [
      input => { delete input.exactSolid.provider; },
      "THREEWAY_FABRICATION_GATE_PROVIDER_UNAVAILABLE",
    ],
    [
      input => { delete input.exactSolid.provider.kernel; },
      "THREEWAY_FABRICATION_GATE_PROVIDER_UNAVAILABLE",
    ],
    [
      input => { delete input.audit; },
      "THREEWAY_FABRICATION_GATE_AUDIT_UNAVAILABLE",
    ],
    [
      input => { delete input.audit.provider.kernel; },
      "THREEWAY_FABRICATION_GATE_AUDIT_UNAVAILABLE",
    ],
    [
      input => { delete input.audit.solidProvider; },
      "THREEWAY_FABRICATION_GATE_PROVIDER_MISMATCH",
    ],
    [
      input => { input.audit.deep = false; },
      "THREEWAY_FABRICATION_GATE_AUDIT_UNAVAILABLE",
    ],
  ];
  for (const [mutate, expectedCode] of cases) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, expectedCode);
    assert.equal(result.authorization, null);
    assert.equal(result.exactSolid, false);
    assert.equal(result.manufacturing, false);
    assert.equal(result.stl, false);
  }
});

test("every state, solution, plan, solid, and audit hash must have exact parity", () => {
  const mutations = [
    input => { input.solution.inputHash = "stale-state"; },
    input => { input.exactSolid.inputHash = "stale-state"; },
    input => { input.audit.inputHash = "stale-state"; },
    input => { input.exactSolid.solutionHash = "stale-solution"; },
    input => { input.audit.solutionHash = "stale-solution"; },
    input => { input.audit.planHash = "stale-plan"; },
    input => { input.audit.solidHash = "stale-solid"; },
    input => { delete input.audit.auditHash; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_HASH_MISMATCH",
    );
    assert.equal(result.authorization, null);
  }
});

test("audit must name the exact provider identity, version, and kernel", () => {
  for (const mutate of [
    input => { input.audit.solidProvider.id = "other-provider"; },
    input => { input.audit.solidProvider.version = "other-version"; },
    input => { input.audit.solidProvider.kernel.id = "other-kernel"; },
    input => {
      input.audit.solidProvider.kernel.version = "other-kernel-version";
    },
  ]) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_PROVIDER_MISMATCH",
    );
  }
});

test("topology, construction, implementation revision, and units cannot drift", () => {
  const mutations = [
    input => { input.exactSolid.topologyId = "CX3"; },
    input => { input.audit.topologyId = "CX3"; },
    input => { input.audit.constructionId = "detachable-host"; },
    input => {
      input.audit.topologyImplementationRevision = "t3-integrated-r0";
    },
    input => { input.exactSolid.units = "mm"; },
    input => { input.audit.units = "mm"; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_TOPOLOGY_MISMATCH",
    );
  }
});

test("bounded exact-solid completion and all canonical ownership IDs are required", () => {
  const mutations = [
    input => { input.exactSolid.booleanCompleted = false; },
    input => { input.exactSolid.withinResourceBudget = false; },
    input => { delete input.exactSolid.solidArtifactId; },
    input => { delete input.exactSolid.componentIds; },
    input => { delete input.exactSolid.lumenIds; },
    input => { delete input.exactSolid.mountHostIds; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_SOLID_INVALID",
    );
  }
});

test("every open, nonmanifold, reversed, degenerate, intersecting, trapped, or membrane defect refuses", () => {
  for (const field of ZERO_FIELDS) {
    const input = fixture();
    input.audit.topologyChecks[field] = 1;
    const result = authorize(input);
    assert.equal(result.ok, false, field);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_MANIFOLD_FAILED",
      field,
    );
  }
});

test("one intended component passes; an explicit documented component set also passes", () => {
  const documented = fixture();
  documented.exactSolid.componentIds = [
    "solid-horn", "solid-service-cover",
  ];
  documented.audit.components = {
    policy: "documented-set",
    expectedCount: 2,
    actualCount: 2,
    componentIds: ["solid-service-cover", "solid-horn"],
    connectedWithinEach: true,
    documentedSetId: "assembly-set-001",
    documentationRefs: ["assembly-drawing-001"],
  };
  const result = authorize(documented);
  assert.equal(result.ok, true);
  assert.equal(
    result.authorization.components.policy,
    "documented-set",
  );
  assert.deepEqual(
    result.authorization.components.componentIds,
    ["solid-horn", "solid-service-cover"],
  );

  const undocumented = structuredClone(documented);
  undocumented.audit.components.documentationRefs = [];
  const refusal = authorize(undocumented);
  assert.equal(refusal.ok, false);
  assert.equal(
    refusal.code,
    "THREEWAY_FABRICATION_GATE_COMPONENT_FAILED",
  );
});

test("finite positive bounds and volume are mandatory without inferred tolerances", () => {
  const mutations = [
    input => { input.audit.dimensionsM.finite = false; },
    input => { input.audit.dimensionsM.sizeM[1] = 0; },
    input => {
      input.audit.dimensionsM.maxM[0] =
        input.audit.dimensionsM.minM[0];
    },
    input => { input.audit.dimensionsM.volumeM3 = 0; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_DIMENSIONS_INVALID",
    );
  }
});

test("all four explicit required and measured fabrication minima must pass", () => {
  const missing = fixture();
  delete missing.audit.thresholds.required.minWebM;
  const absent = authorize(missing);
  assert.equal(absent.ok, false);
  assert.equal(
    absent.code,
    "THREEWAY_FABRICATION_GATE_THRESHOLDS_MISSING",
  );

  for (const field of THRESHOLD_FIELDS) {
    const input = fixture();
    input.audit.thresholds.measured[field] =
      input.audit.thresholds.required[field] / 2;
    const result = authorize(input);
    assert.equal(result.ok, false, field);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_THRESHOLD_FAILED",
      field,
    );
    assert.ok(result.diagnostics[0].details.failedFields.includes(field));
  }
});

test("every exact lumen must be audited continuously from chamber to aperture", () => {
  const mutations = [
    input => { input.audit.lumens.allConnected = false; },
    input => {
      input.audit.lumens.allChamberToApertureContinuous = false;
    },
    input => { input.audit.lumens.connectedCount = 1; },
    input => {
      input.audit.lumens.records[0].connected = false;
    },
    input => {
      input.audit.lumens.records[0]
        .chamberToApertureContinuous = false;
    },
    input => {
      input.exactSolid.lumenIds[0] = "uncovered-lumen";
    },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_LUMEN_CONTINUITY_FAILED",
    );
  }
});

test("every mount host must remain a continuous positive body with horn contact", () => {
  const mutations = [
    input => { input.audit.mountHosts.allBodyContinuous = false; },
    input => {
      input.audit.mountHosts.allHornContactsContinuous = false;
    },
    input => { input.audit.mountHosts.continuousCount = 1; },
    input => {
      input.audit.mountHosts.records[0].bodyContinuous = false;
    },
    input => {
      input.audit.mountHosts.records[0].hornContactContinuous = false;
    },
    input => {
      input.exactSolid.mountHostIds[0] = "uncovered-mount";
    },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_MOUNT_CONTINUITY_FAILED",
    );
  }
});

test("collisions require an explicit allowance and documentation or they refuse", () => {
  const collision = {
    id: "contact-mount-horn",
    leftId: "mount-low-a",
    rightId: "solid-main",
    overlapM3: 0,
    allowed: true,
    allowanceId: "declared-assembly-contact",
    documentationRefs: ["assembly-contact-drawing-001"],
  };
  const allowed = fixture();
  allowed.audit.collisions = {
    checked: true,
    count: 1,
    unallowedCount: 0,
    records: [collision],
  };
  const admitted = authorize(allowed);
  assert.equal(admitted.ok, true);
  assert.equal(admitted.authorization.collisions.count, 1);

  for (const mutate of [
    input => { input.audit.collisions.records[0].allowed = false; },
    input => {
      delete input.audit.collisions.records[0].allowanceId;
    },
    input => {
      input.audit.collisions.records[0].documentationRefs = [];
    },
    input => { input.audit.collisions.unallowedCount = 1; },
  ]) {
    const input = structuredClone(allowed);
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_COLLISION_FAILED",
    );
  }
});

test("format must be supported by the gate, solid provider, and deep audit", () => {
  const cases = [
    input => { input.requestedFormat = "obj"; },
    input => { input.exactSolid.provider.supportedFormats = ["3mf"]; },
    input => { input.audit.auditedFormats = ["3mf"]; },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_FORMAT_UNSUPPORTED",
    );
  }
});

test("schema-1, legacy state, failed physics, and premature authority claims refuse", () => {
  const cases = [
    input => { input.state.schemaVersion = 1; },
    input => { input.legacyState = {}; },
    input => { input.solution.schemaVersion = 1; },
    input => { input.solution.ok = false; },
    input => { input.solution.readiness.analysis = false; },
    input => { input.solution.manufacturing = true; },
    input => { input.solution.exactSolid = true; },
    input => { input.solution.stl = true; },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.ok([
      "THREEWAY_FABRICATION_GATE_STATE_INVALID",
      "THREEWAY_FABRICATION_GATE_SOLUTION_INVALID",
    ].includes(result.code));
  }
});

test("nonfinite, undefined, executable, cyclic, and class-instance evidence is rejected", () => {
  const cases = [
    input => { input.audit.dimensionsM.volumeM3 = Infinity; },
    input => { input.audit.callback = () => true; },
    input => { input.audit.optional = undefined; },
    input => { input.audit.generatedAt = new Date(); },
    input => { input.audit.loop = input.audit; },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    const result = authorize(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      "THREEWAY_FABRICATION_GATE_NONFINITE_VALUE",
    );
    assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
  }
});

test("success is evidence-only: no mesh, bytes, write, hardware, or acoustic claim exists", () => {
  const result = authorize();
  assert.equal(result.ok, true);
  const text = JSON.stringify(result.authorization);
  assert.doesNotMatch(
    text,
    /"mesh"|"vertices"|"indices"|"bytes"|"filePath"|"timestamp"/,
  );
  assert.equal(result.authorization.hardwareValidated, false);
  assert.equal(result.authorization.acousticValidated, false);
  assert.equal(result.authorization.exportWritesPerformed, false);
});

test("CommonJS and browser UMD expose a pure gate without file, DOM, Three, or legacy access", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /\brequire\s*\(/);
  assert.doesNotMatch(source, /\bTHREE\b|\bMEH2\b/);
  assert.doesNotMatch(source, /\bdocument\s*\.|\bwindow\s*\./);
  assert.doesNotMatch(source, /\blocalStorage\s*[.\[]/);
  assert.doesNotMatch(
    source,
    /\bwriteFile\b|\bcreateWriteStream\b|\bBlob\b|\bdownload\b/,
  );

  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  const browserApi = context.globalThis.MEH3FabricationGate;
  assert.equal(typeof browserApi.authorizeExport, "function");
  const result = browserApi.authorizeExport(fixture());
  assert.equal(result.ok, true);
  assert.equal(result.authorization.format, "stl");
});
