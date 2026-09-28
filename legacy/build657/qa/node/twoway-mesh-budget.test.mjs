import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { engine, loadCases, readJson } from "./case-loader.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..", "..");
const shell = fs.readFileSync(path.join(projectRoot, "shell.html"), "utf8");
const certificateSource = fs.readFileSync(
  path.join(here, "production-exact-certificate.mjs"),
  "utf8"
);
const workerSources = Object.freeze({
  coordinator: fs.readFileSync(path.join(projectRoot, "twoway-worker.js"), "utf8"),
  mesh: fs.readFileSync(path.join(projectRoot, "twoway-mesh-worker.js"), "utf8"),
  audit: fs.readFileSync(path.join(projectRoot, "twoway-audit-worker.js"), "utf8"),
  output: fs.readFileSync(path.join(projectRoot, "twoway-output-worker.js"), "utf8")
});
const admissionMatrix = readJson("cases/exact-production-admission.json");
const canonicalCases = new Map(
  loadCases()
    .filter((candidate) => candidate.expected?.status === "valid")
    .map((candidate) => [candidate.id, candidate])
);

function admissionFixture(entry) {
  const sourceId = entry.sourceCase || entry.id;
  const source = canonicalCases.get(sourceId);
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

const syntheticPolicy = {
  step: 1,
  maxAxisSamples: 20,
  maxActivePartGridPoints: 1000,
  maxJobGridPoints: 1000,
  maxVertices: 0,
  maxTriangles: 0,
  maxStlBytes: 0,
  maxRenderBufferBytes: 0,
  maxAuditBinRefs: 0,
  bytesPerActivePlanePoint: 1,
  bytesPerMeshVertex: 0,
  bytesPerMeshTriangle: 0,
  bytesPerAuditTriangle: 0,
  bytesPerAuditBinRef: 0,
  baseOverheadBytes: 0,
  maxEstimatedPeakBytes: 1000
};

function assertOrdered(source, terms, label) {
  let cursor = -1;
  for (const term of terms) {
    const next = source.indexOf(term, cursor + 1);
    assert.ok(next > cursor, `${label}: missing or out-of-order ${term}`);
    cursor = next;
  }
}

function sliceFunction(source, startName, endName) {
  const start = source.indexOf(`function ${startName}(`);
  const end = source.indexOf(`\nfunction ${endName}(`, start + 1);
  assert.ok(start >= 0, `missing function ${startName}`);
  assert.ok(end > start, `could not isolate function ${startName}`);
  return source.slice(start, end);
}

function preflightOrRefusal(state, intent = "export") {
  try {
    return engine.twoWayMeshPreflight(state, intent);
  } catch (error) {
    assert.ok(error?.details?.budget, "preflight refusal omitted its budget");
    return error.details.budget;
  }
}

function releasedSixCornerState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    _smart2waySchema: 3,
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "curvedFacets",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 12,
    seN: 12,
    sectionCornerRatio: 0.25,
    covH: 90,
    covV: 60,
    mouthW: 26,
    requestedMouthW: 26,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    wPre: "w5",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    nW: 6,
    npW: 2,
    panelAxis: "horizontal",
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    twoXO: 500,
    tapCRW: 6,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    frameW: "round",
    boltNW: 4,
    boltDW: 6.5,
    gasketW: 1.6,
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 72.5,
    driverAxisBlend: 0,
    ...overrides,
  };
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

test("manufacturing policy uses the Build 653 fixed grid and bounded phase caps", () => {
  const limits = engine.twoWayMeshLimits.manufacturing;
  assert.equal(limits.step, 0.0025);
  assert.equal(limits.maxAxisSamples, 320);
  assert.equal(limits.maxActivePartGridPoints, 10_100_000);
  assert.equal(limits.maxJobGridPoints, 10_100_000);
  assert.equal(limits.maxEstimatedPeakBytes, 1536 * 1024 * 1024);
  assert.equal(limits.maxVertices, 1_000_000);
  assert.equal(limits.maxTriangles, 2_000_000);
  assert.equal(limits.maxStlBytes, 128 * 1024 * 1024);
  assert.equal(limits.maxRenderBufferBytes, 128 * 1024 * 1024);
  assert.equal(limits.maxAuditBinRefs, 40_000_000);
  assert.equal(limits.maxAuditBinOccupancy, 16_384);
  assert.equal(limits.maxAuditPairVisits, 250_000_000);
  assert.equal(limits.maxIntersectionPairs, 100_000_000);
  assert.equal(limits.baseOverheadBytes, 192 * 1024 * 1024);
});

test("released six-corner manifold is the final admitted manufacturing lattice tier", () => {
  const admitted = engine.twoWayMeshPreflight(
    releasedSixCornerState(),
    "export",
  );
  assert.equal(admitted.ok, true);
  assert.equal(admitted.step, 0.0025);
  assert.equal(admitted.partCount, 1);
  assert.deepEqual(admitted.parts[0].dims, [159, 302, 210]);
  assert.equal(admitted.parts[0].gridPoints, 10_083_780);
  assert.equal(admitted.totals.gridPoints, 10_083_780);
  assert.ok(
    admitted.totals.gridPoints <= admitted.limits.maxActivePartGridPoints,
  );
  assert.ok(admitted.totals.gridPoints <= admitted.limits.maxJobGridPoints);
  assert.ok(
    admitted.totals.estimatedPeakBytes
      <= admitted.limits.maxEstimatedPeakBytes,
  );

  const nextTier = releasedSixCornerState({
    mouthW: 26.05,
    requestedMouthW: 26.05,
  });
  assert.throws(
    () => engine.twoWayMeshPreflight(nextTier, "export"),
    (error) => {
      assert.equal(error?.code, "MESH_PART_GRID_LIMIT");
      const budget = error?.details?.budget;
      assert.ok(budget, "next-tier refusal omitted its evaluated budget");
      assert.equal(budget.step, 0.0025);
      assert.deepEqual(budget.parts[0].dims, [159, 303, 210]);
      assert.equal(budget.parts[0].gridPoints, 10_117_170);
      assert.equal(budget.limits.maxActivePartGridPoints, 10_100_000);
      assert.equal(budget.limits.maxJobGridPoints, 10_100_000);
      assert.ok(
        budget.reasons.some((reason) => (
          reason.code === "MESH_PART_GRID_LIMIT"
          && reason.required === 10_117_170
          && reason.limit === 10_100_000
        )),
      );
      assert.ok(
        budget.reasons.some((reason) => (
          reason.code === "MESH_JOB_GRID_LIMIT"
          && reason.required === 10_117_170
          && reason.limit === 10_100_000
        )),
      );
      assert.ok(
        budget.totals.estimatedPeakBytes
          <= budget.limits.maxEstimatedPeakBytes,
        "next tier should refuse on bounded work, not a hidden memory expansion",
      );
      return true;
    },
  );
});

test("grid cap accepts the boundary and rejects cap plus one", () => {
  const atCap = engine.twoWayMeshBudget(
    { lo: [0, 0, 0], hi: [9, 9, 9] },
    "export",
    syntheticPolicy
  );
  assert.equal(atCap.ok, true);
  assert.equal(atCap.totals.gridPoints, 1000);
  assert.equal(atCap.step, 1);

  const overCap = engine.twoWayMeshBudget(
    { lo: [0, 0, 0], hi: [6, 10, 12] },
    "export",
    syntheticPolicy
  );
  assert.equal(overCap.ok, false);
  assert.equal(overCap.totals.gridPoints, 1001);
  assert.ok(
    overCap.reasons.some((reason) => reason.code === "MESH_PART_GRID_LIMIT")
  );
  assert.equal(overCap.step, 1, "budget must never silently coarsen resolution");
});

test("detachable-style parts share one aggregate job budget", () => {
  const part = { lo: [0, 0, 0], hi: [9, 9, 4] }; // 500 points
  const plan = engine.twoWayMeshBudget(
    [part, part, { lo: [0, 0, 0], hi: [1, 1, 1] }],
    "export",
    {
      ...syntheticPolicy,
      maxActivePartGridPoints: 1000,
      maxJobGridPoints: 1005,
      maxVertices: 10,
      maxTriangles: 20,
      maxEstimatedPeakBytes: 1005
    }
  );
  assert.equal(plan.parts[0].gridPoints, 500);
  assert.equal(plan.parts[1].gridPoints, 500);
  assert.equal(plan.parts[2].gridPoints, 27);
  assert.equal(plan.totals.packedMeshReserveBytes, 480);
  assert.equal(plan.totals.combinedMeshReserveBytes, 480);
  assert.equal(plan.ok, false);
  assert.ok(plan.reasons.some((reason) => reason.code === "MESH_JOB_GRID_LIMIT"));
});

test("panel and radial integrated cells are one part; cartridges are horn plus nW", () => {
  const fixtures = [
    ["P01", "integrated", 1],
    ["P01", "cartridge", 3],
    ["R04-I", "integrated", 1],
    ["R04-I", "cartridge", 5]
  ];
  for (const [id, construction, expectedParts] of fixtures) {
    const fixture = canonicalCases.get(id);
    assert.ok(fixture, `${id} fixture is missing`);
    const solved = engine.solve({
      ...fixture.state,
      driverCellConstruction: construction
    });
    assert.equal(solved.infeasible, false, `${id}/${construction} is infeasible`);
    const budget = preflightOrRefusal(solved.S);
    assert.equal(
      budget.parts.length,
      expectedParts,
      `${id}/${construction} has the wrong printable-part count`
    );
  }
});

test("detachable horn and cell SDFs consume the same canonical tap tools", () => {
  for (const id of ["P01", "R04-I"]) {
    const fixture = canonicalCases.get(id);
    assert.ok(fixture, `${id} fixture is missing`);
    const solved = engine.solve({
      ...fixture.state,
      driverCellConstruction: "cartridge"
    });
    assert.equal(solved.infeasible, false, `${id}/cartridge is infeasible`);
    const plan = solved.ev.plan;
    const hornField = engine.twoWaySolidField(plan, true, 0);
    assert.equal(hornField.tapTools.length, plan.drivers.length);
    for (const driver of plan.drivers) {
      const cellField = engine.twoWaySolidField(plan, true, driver.index + 1);
      assert.deepEqual(
        cellField.tapTools,
        hornField.tapTools,
        `${id} horn and cell ${driver.index} use different tap cutters`
      );
      assert.equal(
        hornField.tapTools[driver.index].length,
        driver.ports.length,
        `${id} driver ${driver.index} lost a canonical tap cutter`
      );
    }
  }
});

test("panel cartridges contain the solved front chamber plus printable skin", () => {
  const fixture = canonicalCases.get("P01");
  assert.ok(fixture, "P01 fixture is missing");
  const solved = engine.solve({
    ...fixture.state,
    driverCellConstruction: "cartridge"
  });
  assert.equal(solved.infeasible, false, "P01/cartridge is infeasible");
  for (const [index, driver] of solved.ev.plan.drivers.entries()) {
    const cartridgeSpan = dot3(
      sub3(driver.driverFace, driver.cartridgeStart),
      driver.mountN
    );
    assert.ok(
      cartridgeSpan + 1e-9 >=
        driver.cell.frontChamber.designAxialDepthM + driver.cellSkin,
      `P01 cartridge ${index} cannot contain its chamber and skin`
    );
    assert.ok(
      driver.cell.frontChamber.geometricSpanM + 1e-9 >=
        driver.cell.frontChamber.requiredAxialDepthM,
      `P01 cartridge ${index} clips the moving-envelope depth`
    );
  }
});

test("unknown mesh intents fail closed", () => {
  assert.throws(
    () => engine.twoWayMeshBudget(
      { lo: [0, 0, 0], hi: [1, 1, 1] },
      "typo-quality"
    ),
    (error) => error?.code === "MESH_QUALITY_UNSUPPORTED"
  );
});

test("historical admission matrix remains pinned while current preflights identify the Build 653 policy", () => {
  assert.equal(admissionMatrix.schemaVersion, 2);
  assert.equal(admissionMatrix.expectedBuild, 649);
  assert.equal(admissionMatrix.expectedPolicyVersion, "b648-mount-envelope-v2");
  assert.notEqual(
    engine.twoWayMeshPolicyVersion,
    admissionMatrix.expectedPolicyVersion,
  );
  assert.equal(admissionMatrix.intent, "export");
  assert.equal(admissionMatrix.fixedStepMeters, 0.0025);
  assert.deepEqual(
    admissionMatrix.certificateCases,
    ["P03", "P03-CARTRIDGE", "R02"]
  );

  const admitted = admissionMatrix.cases.filter((entry) => entry.expectedStatus === "admitted");
  const held = admissionMatrix.cases.filter((entry) => entry.expectedStatus === "refused");
  assert.deepEqual(
    admitted.map((entry) => entry.id),
    ["P03", "P03-CARTRIDGE", "R02"]
  );
  assert.deepEqual(
    new Set(held.map((entry) => entry.id)),
    new Set(["P01", "R03", "P04", "R04-D", "R08"])
  );

  /* The Build 649 fixture dimensions, grid counts and STL hashes are an
     immutable historical record. Builds 650 through 652 deliberately changed
     mount/manifold geometry and policy, so replaying those values as current
     certification would be a false assertion. Current preflight/topology is
     covered by the Build 653 release gates; the named Build 650 exact tests
     remain historical geometry witnesses. */
});

test("production certificate compares the audited component count to the fixture contract", () => {
  assert.match(
    certificateSource,
    /assert\.equal\(\s*audit\.expectedComponents,\s*expectedComponents,/,
    "certificate does not compare audit.expectedComponents to the entry contract"
  );
  assert.doesNotMatch(
    certificateSource,
    /assert\.equal\(\s*audit\.expectedComponents,\s*audit\.expectedComponents,/,
    "certificate self-compares audit.expectedComponents"
  );
  assert.match(
    certificateSource,
    /assert\.equal\(\s*geometryDetachable,\s*expectedDetachable,/,
    "certificate does not pin retained detachable topology"
  );
});

test("phase accounting uses the maximum of mutually exclusive worker lifetimes", () => {
  const fixture = canonicalCases.get("P03");
  assert.ok(fixture, "P03 fixture is missing");
  const solved = engine.solve({ ...fixture.state });
  assert.equal(solved.infeasible, false);
  const plan = engine.twoWayMeshPreflight(solved.S, "export");
  assert.equal(plan.ok, true);
  assert.equal(plan.step, 0.0025);
  assert.equal(plan.totals.gridPoints, 7_171_515);
  assert.ok(plan.totals.gridPoints <= plan.limits.maxJobGridPoints);
  assert.ok(plan.totals.estimatedPeakBytes <= plan.limits.maxEstimatedPeakBytes);
  assert.equal(
    plan.totals.estimatedPeakBytes,
    Math.max(
      plan.totals.meshPhaseBytes,
      plan.totals.auditPhaseBytes,
      plan.totals.outputPhaseBytes
    )
  );
  assert.equal(plan.totals.gridBytes, plan.totals.activePlaneBytes);
  assert.equal(plan.totals.maxActivePlanePoints, 299 * 205);
  assert.equal(
    plan.totals.meshPhaseBytes,
    plan.totals.baseOverheadBytes
      + plan.totals.activePlaneBytes
      + plan.totals.vertexReserveBytes
      + plan.totals.triangleReserveBytes
  );
  assert.equal(
    plan.totals.auditPhaseBytes,
    plan.totals.baseOverheadBytes
      + plan.totals.packedMeshReserveBytes
      + plan.totals.combinedMeshReserveBytes
      + plan.totals.auditTriangleReserveBytes
      + plan.totals.auditBinReserveBytes
  );
  assert.equal(
    plan.totals.outputPhaseBytes,
    plan.totals.baseOverheadBytes
      + plan.totals.packedMeshReserveBytes
      + plan.totals.combinedMeshReserveBytes
      + plan.totals.outputReserveBytes
  );
  assert.equal(plan.totals.combinedMeshReserveBytes, 0);
  assert.match(plan.totals.estimateScope, /maximum of terminated .* phase/i);
  assert.match(plan.totals.estimateScope, /not an OS RSS guarantee/i);
});

test("mesh identity fingerprints the complete migrated state canonically", () => {
  const fixture = loadCases().find((candidate) => candidate.id === "P03");
  assert.ok(fixture, "P03 fixture is missing");
  const state = engine.solve(fixture.state).S;
  const baseline = engine.twoWayMeshKey(state, "export");
  const reordered = Object.fromEntries(Object.entries(state).reverse());

  assert.equal(
    engine.twoWayMeshKey(reordered, "export"),
    baseline,
    "property insertion order must not alter mesh identity"
  );
  for (const [key, value] of [
    ["subXO", (state.subXO || 80) + 5],
    ["phaseMargin", (state.phaseMargin || 1.2) + 0.05],
    ["flangeTW", (state.flangeTW || 10) + 1]
  ]) {
    assert.notEqual(
      engine.twoWayMeshKey({ ...state, [key]: value }, "export"),
      baseline,
      `${key} must invalidate an exact mesh`
    );
  }
});

test("ordinary two-way rendering cannot start an exact worker", () => {
  const renderStart = shell.indexOf("function renderTwoWay(");
  const renderEnd = shell.indexOf("\nfunction add3(", renderStart);
  assert.ok(renderStart >= 0 && renderEnd > renderStart);
  const renderSource = shell.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderSource, /startTwoWayPreview\s*\(/);
  assert.match(shell, /id="bExact">GENERATE EXACT MESH/);
  assert.match(shell, /exactButton\.onclick=/);
  assert.match(shell, /function cancelTwoWayMesh\(/);
  assert.match(
    shell,
    /addEventListener\('pagehide',event=>\{[\s\S]*?cancelTwoWayMesh\('Page closed',true\);[\s\S]*?if\(!event\.persisted\)releaseRendererResources\('pagehide'\);/,
    "page exit must cancel exact work and release non-BFCache renderer resources",
  );
});

test("worker completion and STL download both reject stale state identity", () => {
  assert.match(shell, /function currentTwoWayMeshKey\(kind\)/);
  assert.match(shell, /if\(!twoWayMeshJobIsCurrent\(job\)\)/);
  assert.match(shell, /MESH_STALE_RESULT/);

  const exportHandler = shell.indexOf("document.getElementById('bStl').onclick");
  const exportStart = shell.indexOf("if(S.topo==='2way'){", exportHandler);
  const exportGuard = shell.indexOf(
    "if(currentTwoWayMeshKey('export')!==exportKey)",
    exportStart
  );
  const firstDownload = shell.indexOf("dlBuffer(f.buffer", exportGuard);
  assert.ok(exportHandler >= 0, "STL export handler is missing");
  assert.ok(exportStart > exportHandler, "two-way export branch is missing");
  assert.ok(exportGuard > exportStart, "final stale-export guard is missing");
  assert.ok(
    firstDownload > exportGuard,
    "stale identity must be checked before the first STL download"
  );
  for (const [name, source] of Object.entries(workerSources)) {
    assert.match(
      source,
      /MEH2\.twoWayMeshStateFingerprint\(state\)/,
      `${name} worker does not use the complete state fingerprint`
    );
    assert.doesNotMatch(source, /const keys=\[['"]topo['"]/);
  }
});

test("page validates worker identity before allocation and cleans clone failures", () => {
  const lifecycle = sliceFunction(shell, "startTwoWayMeshJob", "quickTwoWayShell");
  assertOrdered(
    lifecycle,
    [
      "expectedKey=MEH2.twoWayMeshKey(options.state,intent)",
      "if(options.key!==expectedKey)",
      "stateDigest=MEH2.twoWayMeshStateFingerprint(options.state)",
      "worker=new Worker('twoway-worker.js?build='+MEH_BUILD)"
    ],
    "page worker admission"
  );
  assert.match(lifecycle, /worker\.onmessageerror=/);
  assert.match(lifecycle, /try\{\s*worker\.postMessage\(/);
  assert.match(lifecycle, /catch\(cause\)\{\s*worker\.terminate\(\)/);
  assert.match(shell, /TWO_MESH_TIMEOUT_MS=Object\.freeze\(\{preview:600000,export:900000\}\)/);
  assert.match(lifecycle, /armTwoWayMeshTimeout\(job,m\.phase\)/);
});

test("all four workers share one provenance-bound, one-shot phase protocol", () => {
  for (const [name, source] of Object.entries(workerSources)) {
    assert.match(source, /b642-phased-packed-mesh-v1/, `${name} kernel drifted`);
    assert.match(source, /policyVersion/, `${name} omits policy provenance`);
    assert.match(source, /stateDigest/, `${name} omits state provenance`);
  }
  for (const name of ["mesh", "audit", "output"]) {
    assert.match(workerSources[name], /let started=false/);
    assert.match(workerSources[name], /self\.close\(\)/);
  }
  assert.match(workerSources.coordinator, /The exact-mesh coordinator accepts one job only/);
});

test("coordinator terminates each owner before starting the next allocation phase", () => {
  const meshToAudit = sliceFunction(
    workerSources.coordinator,
    "startAuditPhase",
    "startMeshPhase"
  );
  assertOrdered(
    meshToAudit,
    [
      "validateProvenance(meshMessage,'mesh-ready')",
      "partTransferList(meshMessage.parts)",
      "terminateChild()",
      "spawnPhaseWorker('twoway-audit-worker.js')"
    ],
    "mesh-to-audit transition"
  );

  const auditToOutput = sliceFunction(
    workerSources.coordinator,
    "startOutput",
    "startAuditPhase"
  );
  assertOrdered(
    auditToOutput,
    [
      "validateProvenance(auditMessage,'audit-ready')",
      "validateAuditCertificate(auditMessage)",
      "partTransferList(auditMessage.parts)",
      "terminateChild()",
      "spawnPhaseWorker('twoway-output-worker.js')"
    ],
    "audit-to-output transition"
  );

  assert.match(workerSources.coordinator, /activeChild\.terminate\(\);\s*activeChild=null/);
  assert.match(workerSources.coordinator, /certificate\.pass!==true/);
  assert.match(workerSources.coordinator, /certificate\.audit\.pass!==true/);
});

test("mesh, audit, and output responsibilities are separated and fail closed", () => {
  assertOrdered(
    workerSources.mesh,
    [
      "MEH2.twoWayMeshPreflight(message.state,intent)",
      "provenance(message,'budget')",
      "provenance(message,'meshing')",
      "MEH2.twoWayGeometry(message.state,intent)",
      "provenance(message,'mesh-ready')"
    ],
    "mesh worker"
  );
  assert.match(workerSources.mesh, /mesh\.packed!==true/);
  assert.match(workerSources.mesh, /self\.postMessage\([\s\S]*?,transfer\)/);

  assertOrdered(
    workerSources.audit,
    [
      "MEH2.fabricationAudit(message.state,mesh,deep)",
      "if(audit.pass!==true)",
      "MESH_AUDIT_FAILED",
      "const certificate={",
      "pass:true",
      "provenance(message,'audit-ready')"
    ],
    "audit worker"
  );
  assert.match(workerSources.audit, /\bdeep=message\.mode==='export'/);
  assert.doesNotMatch(workerSources.audit, /twoway-output-worker\.js/);

  assertOrdered(
    workerSources.output,
    [
      "const certificate=validateCertificate(message)",
      "validateAndReconstructParts(message,certificate)",
      "if(message.mode==='export')",
      "MEH2.stlBytes(part,stlLimit)"
    ],
    "output worker"
  );
  assert.match(workerSources.output, /MESH_AUDIT_CERTIFICATE_INVALID/);
  assert.match(workerSources.output, /geometryDigest\(message\.parts\)!==certificate\.geometryDigest/);
  assert.match(workerSources.output, /MESH_RENDER_BUFFER_LIMIT/);
  assert.match(workerSources.output, /MESH_STL_LIMIT/);
  assert.doesNotMatch(workerSources.output, /fabricationAudit\s*\(/);
});

test("audit failure cannot reach output-worker creation", () => {
  const auditHandlerStart = workerSources.coordinator.indexOf(
    "child.onmessage=event=>{",
    workerSources.coordinator.indexOf("function startAuditPhase(")
  );
  const auditHandlerEnd = workerSources.coordinator.indexOf(
    "\n  child.postMessage(",
    auditHandlerStart
  );
  const auditHandler = workerSources.coordinator.slice(auditHandlerStart, auditHandlerEnd);
  assertOrdered(
    auditHandler,
    [
      "if(message.phase==='audit-ready')",
      "startOutput(message)",
      "if(message.phase==='error')",
      "fail(error)"
    ],
    "coordinator audit handler"
  );
  assert.equal(
    (workerSources.coordinator.match(/spawnPhaseWorker\('twoway-output-worker\.js'\)/g) || []).length,
    1,
    "output worker must have one certificate-gated creation site"
  );
});
