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
const modulePath = path.join(appRoot, "threeway-solid-plan.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const solidPlan = require(modulePath);

const INPUT_HASH = "input-hash:solid-plan-fixture";
const SOLUTION_HASH = "solution-hash:solid-plan-fixture";

function stamped(record) {
  return {
    ...record,
    inputHash: INPUT_HASH,
    solutionHash: SOLUTION_HASH,
  };
}

function mesh(id, offset = 0) {
  return {
    role: id,
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
    audit: {
      closed: true,
      twoManifold: true,
    },
    manufacturingAuthority: false,
  };
}

function fixture({ optionalBodies = true } = {}) {
  const hornMesh = mesh("horn-shell-inspection", 0);
  const throatMesh = mesh("throat-interface-inspection", 0.1);
  const mountMesh = mesh("mount-host-inspection", 0.2);
  const rearMesh = mesh("rear-system-inspection", 0.3);
  const enclosureMesh = mesh("enclosure-inspection", 0.4);
  const lumenMeshA = mesh("canonical-lumen-negative-a", 0.5);
  const lumenMeshB = mesh("canonical-lumen-negative-b", 0.6);
  const fastenerMesh = mesh("fastener-negative", 0.7);

  const entryStations = [
    stamped({
      stationId: "station-throat",
      role: "throat",
      sourceIds: ["source-high"],
    }),
    stamped({
      stationId: "station-low",
      role: "wall-entry",
      sourceIds: ["source-low"],
    }),
  ];
  const apertures = [
    stamped({
      id: "aperture-low-01",
      sourceId: "source-low",
      stationId: "station-low",
    }),
    stamped({
      id: "aperture-low-02",
      sourceId: "source-low",
      stationId: "station-low",
    }),
  ];
  const passages = [
    stamped({
      id: "passage-low-01",
      apertureId: "aperture-low-01",
      sourceId: "source-low",
      stationId: "station-low",
      chamberId: "chamber-low-01",
      driverInstanceId: "driver-low-01",
      canonicalNegative: true,
      negativeInspectionMesh: lumenMeshA,
    }),
    stamped({
      id: "passage-low-02",
      apertureId: "aperture-low-02",
      sourceId: "source-low",
      stationId: "station-low",
      chamberId: "chamber-low-01",
      driverInstanceId: "driver-low-01",
      canonicalNegative: true,
      negativeInspectionMesh: lumenMeshB,
    }),
  ];
  const mounts = [
    stamped({
      id: "mount-low-01",
      instanceId: "driver-low-01",
      sourceId: "source-low",
      stationId: "station-low",
      mountHost: {
        positiveHost: {
          fullFace: true,
          centerOpen: false,
          booleanUnionPerformed: false,
        },
      },
      inspectionMesh: mountMesh,
      apertureBindings: [
        {
          apertureId: "aperture-low-01",
          passageId: "passage-low-01",
        },
        {
          apertureId: "aperture-low-02",
          passageId: "passage-low-02",
        },
      ],
    }),
  ];

  const positiveBodies = [
    stamped({
      id: "body-horn",
      role: "horn-shell",
      ownerId: SOLUTION_HASH,
      mesh: hornMesh,
    }),
    stamped({
      id: "body-throat",
      role: "throat-interface",
      stationId: "station-throat",
      ownerId: "station-throat",
      mesh: throatMesh,
    }),
    stamped({
      id: "body-mount-low-01",
      role: "mount-host",
      sourceId: "source-low",
      stationId: "station-low",
      ownerId: "mount-low-01",
      bodyKind: "full-face-solid-host",
      mesh: mountMesh,
    }),
  ];
  if (optionalBodies) {
    positiveBodies.push(
      stamped({
        id: "body-rear",
        role: "rear-system",
        ownerId: SOLUTION_HASH,
        mesh: rearMesh,
      }),
      stamped({
        id: "body-enclosure",
        role: "enclosure",
        ownerId: SOLUTION_HASH,
        mesh: enclosureMesh,
      }),
    );
  }

  const acousticLumenNegatives = [
    stamped({
      id: "negative-lumen-01",
      role: "acoustic-lumen",
      passageId: "passage-low-01",
      apertureId: "aperture-low-01",
      sourceId: "source-low",
      stationId: "station-low",
      ownerId: "passage-low-01",
      mesh: lumenMeshA,
      acoustic: true,
    }),
    stamped({
      id: "negative-lumen-02",
      role: "acoustic-lumen",
      passageId: "passage-low-02",
      apertureId: "aperture-low-02",
      sourceId: "source-low",
      stationId: "station-low",
      ownerId: "passage-low-02",
      mesh: lumenMeshB,
      acoustic: true,
    }),
  ];
  const auxiliaryNegatives = [
    stamped({
      id: "negative-fastener-01",
      role: "fastener-negative",
      sourceId: "source-low",
      stationId: "station-low",
      ownerId: "body-mount-low-01",
      mesh: fastenerMesh,
      acoustic: false,
    }),
  ];

  const expectedContacts = [
    {
      id: "contact-horn-throat",
      a: "body-horn",
      b: "body-throat",
      kind: "positive-union",
    },
    {
      id: "contact-horn-mount",
      a: "body-horn",
      b: "body-mount-low-01",
      kind: "positive-union",
    },
    {
      id: "contact-lumen-01-horn",
      a: "negative-lumen-01",
      b: "body-horn",
      kind: "acoustic-through",
    },
    {
      id: "contact-lumen-01-mount",
      a: "negative-lumen-01",
      b: "body-mount-low-01",
      kind: "acoustic-through",
    },
    {
      id: "contact-lumen-02-horn",
      a: "negative-lumen-02",
      b: "body-horn",
      kind: "acoustic-through",
    },
    {
      id: "contact-lumen-02-mount",
      a: "negative-lumen-02",
      b: "body-mount-low-01",
      kind: "acoustic-through",
    },
    {
      id: "contact-fastener-mount",
      a: "negative-fastener-01",
      b: "body-mount-low-01",
      kind: "auxiliary-through",
    },
  ];
  const allowedOverlapPairs = [
    { a: "body-horn", b: "body-throat" },
    { a: "body-horn", b: "body-mount-low-01" },
  ];
  if (optionalBodies) {
    expectedContacts.push(
      {
        id: "contact-horn-rear",
        a: "body-horn",
        b: "body-rear",
        kind: "positive-union",
      },
      {
        id: "contact-enclosure-rear",
        a: "body-enclosure",
        b: "body-rear",
        kind: "positive-union",
      },
    );
    allowedOverlapPairs.push(
      { a: "body-horn", b: "body-rear" },
      { a: "body-enclosure", b: "body-rear" },
    );
  }

  return {
    physicsSolution: {
      schemaVersion: 2,
      ok: true,
      inputHash: INPUT_HASH,
      solutionHash: SOLUTION_HASH,
      topology: { kind: "T3" },
      readiness: { analysis: true },
      entryStations,
      apertureLayouts: [
        stamped({
          id: "layout-low",
          sourceId: "source-low",
          stationId: "station-low",
          apertures,
        }),
      ],
      chambers: [
        stamped({
          id: "chamber-low-01",
          sourceId: "source-low",
          stationId: "station-low",
        }),
      ],
      passages,
      mounts,
      solidIntent: stamped({
        schemaVersion: 1,
        units: "m",
        constructionId: "construction:t3-fixture",
        topologyImplementationRevision: "t3-fixture-r1",
        positiveBodies,
        acousticLumenNegatives,
        auxiliaryNegatives,
        expectedContacts,
        allowedOverlapPairs,
      }),
    },
  };
}

function codes(result) {
  return result.diagnostics.map(item => item.code);
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`);
  }
}

test("module is dependency-free UMD and advertises planning-only capability", () => {
  assert.equal(solidPlan.version, 1);
  assert.equal(solidPlan.inputSchemaVersion, 2);
  assert.equal(solidPlan.planSchemaVersion, 1);
  assert.equal(solidPlan.capabilities.solidPlan, true);
  assert.equal(solidPlan.capabilities.meshGeneration, false);
  assert.equal(solidPlan.capabilities.booleanExecution, false);
  assert.equal(solidPlan.capabilities.exactSolid, false);
  assert.equal(solidPlan.capabilities.manufacturing, false);
  assert.equal(solidPlan.capabilities.stl, false);
  assert.ok(Object.isFrozen(solidPlan));

  assert.doesNotMatch(moduleSource, /\brequire\s*\(/);
  assert.doesNotMatch(
    moduleSource,
    /\bdocument\b|\bwindow\b|\bTHREE\b|engine\.js|shell\.html/,
  );
  assert.doesNotMatch(
    moduleSource,
    /verticesM\.push|triangles\.push|createMesh|generateMesh|CSG|BSP/,
  );

  const browserGlobal = {};
  const context = vm.createContext({ globalThis: browserGlobal });
  vm.runInContext(moduleSource, context, { filename: modulePath });
  assert.equal(
    typeof browserGlobal.MEH3SolidPlan.buildSolidPlan,
    "function",
  );
  assert.equal(
    browserGlobal.MEH3SolidPlan.capabilities.booleanExecution,
    false,
  );
});

test("build emits a hash-parity DAG with positives first and each lumen once", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const result = solidPlan.buildSolidPlan(input);

  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
  assert.equal(JSON.stringify(input), before, "input was mutated");
  assert.equal(result.inputHash, INPUT_HASH);
  assert.equal(result.solutionHash, SOLUTION_HASH);
  assert.equal(result.planHash, result.hashInput);
  assert.match(result.planHash, /^meh3-solid-plan-v1\n/);
  assert.equal(result.result.topologyId, "T3");
  assert.equal(
    result.result.topologyImplementationRevision,
    "t3-fixture-r1",
  );
  assert.deepEqual(result.result.componentIds, [
    "body-enclosure",
    "body-horn",
    "body-mount-low-01",
    "body-rear",
    "body-throat",
  ]);
  assert.deepEqual(result.result.lumenIds, [
    "negative-lumen-01",
    "negative-lumen-02",
  ]);
  assert.deepEqual(result.result.mountHostIds, [
    "body-mount-low-01",
  ]);
  assert.equal(result.result.counts.positiveBodies, 5);
  assert.equal(result.result.counts.hornShells, 1);
  assert.equal(result.result.counts.throatInterfaces, 1);
  assert.equal(result.result.counts.mountHosts, 1);
  assert.equal(result.result.counts.acousticLumenNegatives, 2);
  assert.equal(result.result.counts.auxiliaryNegatives, 1);

  const { nodes, stages, rootNodeId } = result.result.dag;
  assert.deepEqual(stages.map(stage => stage.order), [0, 1, 2]);
  assert.ok(
    nodes.slice(0, 5).every(node =>
      node.kind === "operand" &&
      node.classification === "positive"),
  );
  assert.equal(nodes[5].operation, "union");
  assert.equal(nodes[5].inputs.length, 5);
  const acousticOperations = nodes.filter(node =>
    node.kind === "operation" &&
    node.phase === "acoustic-lumen-subtraction");
  assert.equal(acousticOperations.length, 2);
  assert.equal(new Set(
    acousticOperations.map(node => node.id),
  ).size, 2);
  assert.deepEqual(
    acousticOperations.map(node => decodeURIComponent(
      node.id.split(":").at(-1),
    )),
    ["aperture-low-01", "aperture-low-02"],
  );
  assert.match(rootNodeId, /^operation:subtract:auxiliary:/);

  for (const node of nodes) {
    assert.equal(node.inputHash, INPUT_HASH);
    assert.equal(node.solutionHash, SOLUTION_HASH);
    assert.equal(node.ownership.inputHash, INPUT_HASH);
    assert.equal(node.ownership.solutionHash, SOLUTION_HASH);
    assert.equal(node.booleanExecuted, false);
    assert.equal(node.exactSolid, false);
    assert.equal(node.manufacturing, false);
  }

  const inputPassages = new Map(
    input.physicsSolution.passages.map(passage => [
      passage.id,
      passage,
    ]),
  );
  const acousticNodes = nodes.filter(node =>
    node.classification === "acoustic-lumen");
  for (const node of acousticNodes) {
    const passageId = node.ownership.ownerId;
    assert.deepEqual(
      node.mesh,
      inputPassages.get(passageId).negativeInspectionMesh,
    );
  }
  assert.equal(
    result.result.invariants.eachAcousticNegativeSubtractedOnce,
    true,
  );
  assert.equal(result.result.execution.booleanUnionExecuted, false);
  assert.equal(result.result.execution.booleanSubtractionExecuted, false);
  assert.equal(result.result.execution.exactSolid, false);
  assert.equal(result.result.execution.manufacturing, false);
  assert.equal(result.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.export, false);
  assert.equal(result.stl, false);
  assertDeepFrozen(result);
});

test("all array permutations produce identical node IDs, DAG, and plan hash", () => {
  const firstInput = fixture();
  const secondInput = structuredClone(firstInput);
  const solution = secondInput.physicsSolution;
  solution.entryStations.reverse();
  solution.apertureLayouts.reverse();
  for (const layout of solution.apertureLayouts) {
    layout.apertures.reverse();
  }
  solution.chambers.reverse();
  solution.passages.reverse();
  solution.mounts.reverse();
  for (const mount of solution.mounts) {
    mount.apertureBindings.reverse();
  }
  solution.solidIntent.positiveBodies.reverse();
  solution.solidIntent.acousticLumenNegatives.reverse();
  solution.solidIntent.auxiliaryNegatives.reverse();
  solution.solidIntent.expectedContacts.reverse();
  solution.solidIntent.allowedOverlapPairs.reverse();

  const first = solidPlan.buildSolidPlan(firstInput);
  const second = solidPlan.buildSolidPlan(secondInput);
  assert.equal(first.ok, true, first.diagnostics?.[0]?.message);
  assert.equal(second.ok, true, second.diagnostics?.[0]?.message);
  assert.equal(second.planHash, first.planHash);
  assert.equal(second.hashInput, first.hashInput);
  assert.deepEqual(second.result, first.result);
});

test("missing intent, legacy schema, and record hash mismatch fail closed", () => {
  const missing = fixture();
  delete missing.physicsSolution.solidIntent;
  const missingResult = solidPlan.buildSolidPlan(missing);
  assert.equal(missingResult.ok, false);
  assert.ok(codes(missingResult).includes(
    "THREEWAY_SOLID_PLAN_UNAVAILABLE",
  ));

  const legacy = fixture();
  legacy.physicsSolution.schemaVersion = 1;
  const legacyResult = solidPlan.buildSolidPlan(legacy);
  assert.equal(legacyResult.ok, false);
  assert.ok(codes(legacyResult).includes(
    "THREEWAY_SOLID_PLAN_SCHEMA_UNSUPPORTED",
  ));

  const stale = fixture();
  stale.physicsSolution.solidIntent.positiveBodies[0].solutionHash =
    "stale-solution";
  const staleResult = solidPlan.buildSolidPlan(stale);
  assert.equal(staleResult.ok, false);
  assert.ok(codes(staleResult).includes(
    "THREEWAY_SOLID_PLAN_HASH_MISMATCH",
  ));
  assert.equal(staleResult.result, null);
  assert.equal(staleResult.planHash, null);
});

test("duplicate IDs, dangling owners, and polarity ambiguity are refused", () => {
  const duplicate = fixture();
  duplicate.physicsSolution.solidIntent.positiveBodies[1].id =
    "body-horn";
  const duplicateResult = solidPlan.buildSolidPlan(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert.ok(codes(duplicateResult).includes(
    "THREEWAY_SOLID_PLAN_DUPLICATE_ID",
  ));

  const dangling = fixture();
  dangling.physicsSolution.solidIntent.auxiliaryNegatives[0].ownerId =
    "missing-positive";
  const danglingResult = solidPlan.buildSolidPlan(dangling);
  assert.equal(danglingResult.ok, false);
  assert.ok(codes(danglingResult).includes(
    "THREEWAY_SOLID_PLAN_DANGLING_OWNER",
  ));

  const ambiguous = fixture();
  ambiguous.physicsSolution.solidIntent
    .acousticLumenNegatives[0].id = "body-horn";
  const ambiguousResult = solidPlan.buildSolidPlan(ambiguous);
  assert.equal(ambiguousResult.ok, false);
  assert.ok(codes(ambiguousResult).includes(
    "THREEWAY_SOLID_PLAN_POLARITY_AMBIGUOUS",
  ));
});

test("ring or skin mounts and incomplete mount mapping are refused", () => {
  const ring = fixture();
  ring.physicsSolution.mounts[0]
    .mountHost.positiveHost.fullFace = false;
  ring.physicsSolution.mounts[0]
    .mountHost.positiveHost.centerOpen = true;
  ring.physicsSolution.solidIntent.positiveBodies.find(
    body => body.role === "mount-host",
  ).bodyKind = "ring";
  const ringResult = solidPlan.buildSolidPlan(ring);
  assert.equal(ringResult.ok, false);
  assert.ok(codes(ringResult).includes(
    "THREEWAY_SOLID_PLAN_MOUNT_HOST_INVALID",
  ));

  const missing = fixture();
  missing.physicsSolution.solidIntent.positiveBodies =
    missing.physicsSolution.solidIntent.positiveBodies.filter(
      body => body.role !== "mount-host",
    );
  const missingResult = solidPlan.buildSolidPlan(missing);
  assert.equal(missingResult.ok, false);
  assert.ok(codes(missingResult).includes(
    "THREEWAY_SOLID_PLAN_MOUNT_HOST_INVALID",
  ));
});

test("canonical passage meshes and one-negative-per-aperture are mandatory", () => {
  const missingMesh = fixture();
  delete missingMesh.physicsSolution.passages[0].negativeInspectionMesh;
  const missingResult = solidPlan.buildSolidPlan(missingMesh);
  assert.equal(missingResult.ok, false);
  assert.ok(codes(missingResult).includes(
    "THREEWAY_SOLID_PLAN_PASSAGE_MESH_MISSING",
  ));

  const changedMesh = fixture();
  const changedNegative = changedMesh.physicsSolution.solidIntent
    .acousticLumenNegatives[0];
  changedNegative.mesh = structuredClone(changedNegative.mesh);
  changedNegative.mesh.verticesM[0][0] += 0.001;
  const changedResult = solidPlan.buildSolidPlan(changedMesh);
  assert.equal(changedResult.ok, false);
  assert.ok(codes(changedResult).includes(
    "THREEWAY_SOLID_PLAN_PASSAGE_MESH_MISSING",
  ));

  const duplicateAperture = fixture();
  duplicateAperture.physicsSolution.solidIntent
    .acousticLumenNegatives[1].apertureId = "aperture-low-01";
  const coverageResult = solidPlan.buildSolidPlan(duplicateAperture);
  assert.equal(coverageResult.ok, false);
  assert.ok(codes(coverageResult).includes(
    "THREEWAY_SOLID_PLAN_APERTURE_COVERAGE_INVALID",
  ));
});

test("central non-lumen holes and acoustic auxiliary negatives are refused", () => {
  const central = fixture();
  const auxiliary =
    central.physicsSolution.solidIntent.auxiliaryNegatives[0];
  auxiliary.role = "central-hole";
  auxiliary.central = true;
  const centralResult = solidPlan.buildSolidPlan(central);
  assert.equal(centralResult.ok, false);
  assert.ok(codes(centralResult).includes(
    "THREEWAY_SOLID_PLAN_CENTRAL_HOLE_REFUSED",
  ));

  const acousticAuxiliary = fixture();
  acousticAuxiliary.physicsSolution.solidIntent
    .auxiliaryNegatives[0].acoustic = true;
  const acousticResult = solidPlan.buildSolidPlan(acousticAuxiliary);
  assert.equal(acousticResult.ok, false);
  assert.ok(codes(acousticResult).includes(
    "THREEWAY_SOLID_PLAN_INTENT_INVALID",
  ));
});

test("continuity and overlap are explicit and cannot dangle or disconnect", () => {
  const missingThrough = fixture();
  missingThrough.physicsSolution.solidIntent.expectedContacts =
    missingThrough.physicsSolution.solidIntent.expectedContacts.filter(
      contact => contact.id !== "contact-lumen-01-horn",
    );
  const throughResult = solidPlan.buildSolidPlan(missingThrough);
  assert.equal(throughResult.ok, false);
  assert.ok(codes(throughResult).includes(
    "THREEWAY_SOLID_PLAN_CONTACT_INVALID",
  ));

  const dangling = fixture();
  dangling.physicsSolution.solidIntent.expectedContacts[0].a =
    "missing-body";
  const danglingResult = solidPlan.buildSolidPlan(dangling);
  assert.equal(danglingResult.ok, false);
  assert.ok(codes(danglingResult).includes(
    "THREEWAY_SOLID_PLAN_CONTACT_INVALID",
  ));

  const undeclaredOverlap = fixture();
  undeclaredOverlap.physicsSolution.solidIntent
    .allowedOverlapPairs.pop();
  const overlapResult = solidPlan.buildSolidPlan(undeclaredOverlap);
  assert.equal(overlapResult.ok, false);
  assert.ok(codes(overlapResult).includes(
    "THREEWAY_SOLID_PLAN_CONTACT_INVALID",
  ));
});

test("inferred geometry or tolerance flags are never admitted", () => {
  const inferredGeometry = fixture();
  inferredGeometry.physicsSolution.solidIntent.geometryInferred = true;
  const geometryResult = solidPlan.buildSolidPlan(inferredGeometry);
  assert.equal(geometryResult.ok, false);
  assert.ok(codes(geometryResult).includes(
    "THREEWAY_SOLID_PLAN_INFERENCE_REFUSED",
  ));

  const inferredTolerance = fixture();
  inferredTolerance.physicsSolution.solidIntent.toleranceInferred = true;
  const toleranceResult = solidPlan.buildSolidPlan(inferredTolerance);
  assert.equal(toleranceResult.ok, false);
  assert.ok(codes(toleranceResult).includes(
    "THREEWAY_SOLID_PLAN_INFERENCE_REFUSED",
  ));
});

test("nonfinite, executable, cyclic, and direct legacy-shaped input are refused", () => {
  const nonfinite = fixture();
  nonfinite.physicsSolution.solidIntent
    .positiveBodies[0].mesh.verticesM[0][0] = Infinity;
  const nonfiniteResult = solidPlan.buildSolidPlan(nonfinite);
  assert.equal(nonfiniteResult.ok, false);
  assert.ok(codes(nonfiniteResult).includes(
    "THREEWAY_SOLID_PLAN_INPUT_INVALID",
  ));

  const executable = fixture();
  executable.physicsSolution.solidIntent.execute = () => {};
  const executableResult = solidPlan.buildSolidPlan(executable);
  assert.equal(executableResult.ok, false);
  assert.ok(codes(executableResult).includes(
    "THREEWAY_SOLID_PLAN_INPUT_INVALID",
  ));

  const cyclic = fixture();
  cyclic.physicsSolution.solidIntent.self =
    cyclic.physicsSolution.solidIntent;
  const cyclicResult = solidPlan.buildSolidPlan(cyclic);
  assert.equal(cyclicResult.ok, false);
  assert.ok(codes(cyclicResult).includes(
    "THREEWAY_SOLID_PLAN_INPUT_INVALID",
  ));

  const directSolution = fixture().physicsSolution;
  const directResult = solidPlan.buildSolidPlan(directSolution);
  assert.equal(directResult.ok, false);
  assert.ok(codes(directResult).includes(
    "THREEWAY_SOLID_PLAN_INPUT_INVALID",
  ));
});

test("Boolean execution, exact-solid, manufacturing, export, and STL preflight refuse", () => {
  const preflight = solidPlan.manufacturingPreflight(
    "execute-booleans-and-export",
  );
  assert.equal(preflight.ok, false);
  assert.equal(preflight.available, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.booleanExecuted, false);
  assert.equal(preflight.exactSolid, false);
  assert.equal(preflight.fabricationAudited, false);
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.export, false);
  assert.equal(preflight.stl, false);
  assertDeepFrozen(preflight);
});
