#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { engine, loadCases, readJson } from "./case-loader.mjs";

const CHILD_MARKER = "@@MEH_PRODUCTION_EXACT_CERTIFICATE@@";
const CHILD_CASE = process.env.MEH_PRODUCTION_CERT_CHILD || "";
const CHILD_EXPECTED_STATUS = process.env.MEH_PRODUCTION_CERT_EXPECTED_STATUS || "";
const CHILD_PROBE = process.env.MEH_PRODUCTION_CERT_PROBE === "1";
const THIS_FILE = fileURLToPath(import.meta.url);
const HERE = path.dirname(THIS_FILE);
const QA_ROOT = path.resolve(HERE, "..");
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const STABLE_PREFLIGHT_CODES = new Set([
  "MESH_AXIS_LIMIT",
  "MESH_PART_GRID_LIMIT",
  "MESH_JOB_GRID_LIMIT",
  "MESH_MEMORY_LIMIT"
]);

function parseArgs(argv) {
  const options = { probe: null, timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--probe") {
      options.probe = argv[++index];
      assert.ok(
        typeof options.probe === "string" && options.probe.length > 0,
        "--probe requires a configured case ID"
      );
    }
    else if (argument === "--timeout-ms") options.timeoutMs = Number(argv[++index]);
    else if (argument === "--help") options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  assert.ok(
    Number.isSafeInteger(options.timeoutMs) && options.timeoutMs > 0,
    "--timeout-ms must be a positive safe integer"
  );
  return options;
}

function printHelp() {
  console.log(`Usage: node node/production-exact-certificate.mjs [options]

  No options       Enforce the versioned fail-closed admission matrix.
  --probe ID       Run any case in the production admission configuration
                   and print descriptive metrics if preflight admits it.
                   Probe mode does not change or weaken release expectations.
  --timeout-ms N   Bound the fresh certificate child (default ${DEFAULT_TIMEOUT_MS}).
`);
}

function fixtureMap() {
  return new Map(
    loadCases()
      .filter((testCase) => testCase.expected?.status === "valid")
      .map((testCase) => [testCase.id, testCase])
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function meshVertexCount(mesh) {
  return typeof engine.meshVertexCount === "function"
    ? engine.meshVertexCount(mesh)
    : mesh.pos.length;
}

function meshTriangleCount(mesh) {
  return typeof engine.meshTriangleCount === "function"
    ? engine.meshTriangleCount(mesh)
    : mesh.tri.length;
}

function summarizeBudget(budget) {
  if (!budget) return null;
  return {
    ok: Boolean(budget.ok),
    policyVersion: budget.policyVersion || null,
    quality: budget.quality || null,
    intent: budget.intent || null,
    step: budget.step,
    detachable: Boolean(budget.detachable),
    partCount: Number.isFinite(budget.partCount)
      ? budget.partCount
      : (budget.parts || []).length,
    parts: (budget.parts || []).map((part) => ({
      index: part.index,
      dimensions: part.dims,
      gridPoints: part.gridPoints,
      cells: part.cells,
      growthPasses: part.growthPasses
    })),
    totals: budget.totals
      ? {
          gridPoints: budget.totals.gridPoints,
          cells: budget.totals.cells,
          estimatedPeakBytes: budget.totals.estimatedPeakBytes,
          estimateScope: budget.totals.estimateScope || null
        }
      : null,
    reasons: (budget.reasons || []).map((reason) => ({
      code: reason.code,
      partIndex: reason.partIndex,
      required: reason.required,
      limit: reason.limit
    }))
  };
}

function assertPreflightSnapshot(actual, expected, label) {
  assert.ok(actual, `${label} omitted its preflight budget`);
  assert.equal(
    actual.partCount,
    expected.partCount,
    `${label} changed its printable-part count`
  );
  assert.equal(
    actual.totals?.gridPoints,
    expected.gridPoints,
    `${label} changed its fixed-grid sample count`
  );
  assert.deepEqual(
    actual.parts.map((part) => part.dimensions),
    expected.dimensions,
    `${label} changed its fixed-grid dimensions`
  );
  if (expected.cells !== undefined) {
    assert.equal(actual.totals?.cells, expected.cells, `${label} changed its cell count`);
  }
  if (expected.estimatedPeakBytes !== undefined) {
    assert.equal(
      actual.totals?.estimatedPeakBytes,
      expected.estimatedPeakBytes,
      `${label} changed its deterministic accounting estimate`
    );
  }
}

function describePreflightDrift(actual, expected, entry, config) {
  const differences = [];
  const compare = (field, observed, pinned) => {
    if (JSON.stringify(observed) !== JSON.stringify(pinned)) {
      differences.push({ field, expected: pinned, actual: observed });
    }
  };
  if (!actual) {
    differences.push({
      field: "preflight",
      expected: "complete summarized budget",
      actual: null
    });
  } else {
    compare("partCount", actual.partCount, expected.partCount);
    compare("totals.gridPoints", actual.totals?.gridPoints, expected.gridPoints);
    compare(
      "parts.dimensions",
      actual.parts.map((part) => part.dimensions),
      expected.dimensions
    );
    if (expected.cells !== undefined) {
      compare("totals.cells", actual.totals?.cells, expected.cells);
    }
    if (expected.estimatedPeakBytes !== undefined) {
      compare(
        "totals.estimatedPeakBytes",
        actual.totals?.estimatedPeakBytes,
        expected.estimatedPeakBytes
      );
    }
    compare("policyVersion", actual.policyVersion, config.expectedPolicyVersion);
    compare("step", actual.step, config.fixedStepMeters);
    if (entry.expectedDetachable !== undefined) {
      compare("detachable", actual.detachable, entry.expectedDetachable);
    }
  }
  return {
    matchesPinnedSnapshot: differences.length === 0,
    differences
  };
}

function resolveFixture(entry) {
  const sourceId = entry.sourceCase || entry.id;
  const source = fixtureMap().get(sourceId);
  assert.ok(source, `canonical production fixture ${sourceId} for ${entry.id} is missing`);
  const expectedComponents = entry.expectedComponents ?? source.expected.components;
  return {
    ...source,
    id: entry.id,
    sourceId,
    title: entry.title || source.title,
    state: {
      ...source.state,
      ...(entry.overrides || {})
    },
    expected: {
      ...source.expected,
      components: expectedComponents
    }
  };
}

function solveFixture(entry) {
  const fixture = resolveFixture(entry);
  const solved = engine.solve(fixture.state);
  assert.equal(
    solved.infeasible,
    false,
    `${entry.id} unexpectedly failed its design laws`
  );
  assert.equal(
    (solved.ev?.rows || []).filter((row) => row.st === "fail").length,
    0,
    `${entry.id} has failing design-law rows`
  );
  return { fixture, solved };
}

function preflightFixture(entry, intent) {
  const { fixture, solved } = solveFixture(entry);
  try {
    const budget = engine.twoWayMeshPreflight(solved.S, intent);
    return {
      fixture,
      solved,
      admitted: true,
      code: null,
      rawBudget: budget,
      budget: summarizeBudget(budget)
    };
  } catch (error) {
    assert.ok(
      STABLE_PREFLIGHT_CODES.has(String(error?.code || "")),
      `${entry.id} preflight failed with unstable code ${error?.code || "(missing)"}`
    );
    assert.ok(
      error?.details?.budget,
      `${entry.id} refusal omitted its complete budget`
    );
    return {
      fixture,
      solved,
      admitted: false,
      code: error.code,
      rawBudget: error.details.budget,
      budget: summarizeBudget(error.details.budget)
    };
  }
}

function auditSummary(audit) {
  return {
    pass: audit.pass,
    badEdges: audit.badEdges,
    badOrientation: audit.badOrientation,
    orientationConflict: audit.orientationConflict,
    degenerate: audit.degenerate,
    duplicateFaces: audit.duplicateFaces,
    nonFinite: audit.nonFinite,
    components: audit.components,
    expectedComponents: audit.expectedComponents,
    rawComponents: audit.rawComponents,
    discardedComponents: audit.discardedComponents,
    namedPartsConnected: audit.namedPartsConnected,
    volume: audit.volume,
    selfIntersections: audit.selfIntersections,
    intersectionPairs: audit.intersectionPairs,
    intersectionPairVisits: audit.intersectionPairVisits,
    auditBinReferences: audit.auditBinReferences,
    auditPeakBinOccupancy: audit.auditPeakBinOccupancy,
    auditBinsPerAxis: audit.auditBinsPerAxis
  };
}

function assertAuditPass(audit, fixture, expectedComponents) {
  assert.equal(audit.pass, true, `${fixture.id} failed its deep fabrication audit`);
  assert.equal(audit.badEdges, 0, `${fixture.id} has open/nonmanifold edges`);
  assert.equal(audit.badOrientation, 0, `${fixture.id} has reversed edge pairs`);
  assert.equal(audit.orientationConflict, 0, `${fixture.id} has orientation conflicts`);
  assert.equal(audit.degenerate, 0, `${fixture.id} has degenerate triangles`);
  assert.equal(audit.duplicateFaces, 0, `${fixture.id} has duplicate faces`);
  assert.equal(audit.nonFinite, 0, `${fixture.id} has nonfinite geometry`);
  assert.equal(
    audit.components,
    expectedComponents,
    `${fixture.id} changed its printable component count`
  );
  assert.equal(
    audit.expectedComponents,
    expectedComponents,
    `${fixture.id} audit expected the wrong component count`
  );
  assert.equal(
    audit.rawComponents,
    expectedComponents,
    `${fixture.id} raw component diagnostics changed`
  );
  assert.equal(audit.discardedComponents, 0, `${fixture.id} discarded mesh components`);
  assert.equal(audit.namedPartsConnected, true, `${fixture.id} contains a disconnected named part`);
  assert.equal(audit.selfIntersections, 0, `${fixture.id} self-intersects`);
  assert.ok(audit.volume > 0, `${fixture.id} has non-positive signed volume`);
}

function assertPartAuditPass(audit, label) {
  assert.equal(audit.badEdges, 0, `${label} has open/nonmanifold edges`);
  assert.equal(audit.badOrientation, 0, `${label} has reversed edge pairs`);
  assert.equal(audit.orientationConflict, 0, `${label} has orientation conflicts`);
  assert.equal(audit.degenerate, 0, `${label} has degenerate triangles`);
  assert.equal(audit.duplicateFaces, 0, `${label} has duplicate faces`);
  assert.equal(audit.nonFinite, 0, `${label} has nonfinite geometry`);
  assert.equal(audit.components, 1, `${label} is not one connected named part`);
  assert.ok(audit.volume > 0, `${label} has non-positive signed volume`);
}

function namedPartSummary(geometry, entry) {
  const names = entry.expectedPartNames || [];
  if (!names.length) return null;
  assert.equal(
    names.length,
    geometry.parts.length,
    `${entry.id} named-part list does not match its exact parts`
  );
  assert.equal(new Set(names).size, names.length, `${entry.id} part names are not unique`);
  assert.equal(
    geometry.partDiagnostics.length,
    names.length,
    `${entry.id} omitted per-part connectivity diagnostics`
  );
  return names.map((name, index) => {
    const diagnostic = geometry.partDiagnostics[index];
    assert.equal(
      diagnostic.partIndex,
      index,
      `${entry.id}/${name} changed its deterministic part index`
    );
    assert.equal(
      diagnostic.componentCount,
      1,
      `${entry.id}/${name} contains disconnected fragments`
    );
    const topology = engine.meshAudit(geometry.parts[index]);
    assertPartAuditPass(topology, `${entry.id}/${name}`);
    const intersections = engine.meshSelfIntersections(geometry.parts[index], 1);
    assert.equal(
      intersections.count,
      0,
      `${entry.id}/${name} self-intersects`
    );
    assert.equal(
      intersections.limited,
      false,
      `${entry.id}/${name} exhausted its deep intersection audit`
    );
    return {
      index,
      name,
      connected: true,
      vertices: meshVertexCount(geometry.parts[index]),
      triangles: meshTriangleCount(geometry.parts[index]),
      topology: {
        badEdges: topology.badEdges,
        badOrientation: topology.badOrientation,
        orientationConflict: topology.orientationConflict,
        degenerate: topology.degenerate,
        duplicateFaces: topology.duplicateFaces,
        nonFinite: topology.nonFinite,
        components: topology.components
      },
      deepAudit: {
        selfIntersections: intersections.count,
        intersectionPairs: intersections.tested,
        intersectionPairVisits: intersections.pairVisits || 0,
        auditBinReferences: intersections.binReferences || 0,
        auditPeakBinOccupancy: intersections.peakBinOccupancy || 0,
        auditBinsPerAxis: intersections.binsPerAxis || 0
      }
    };
  });
}

function retentionSummary(solved, geometry, audit, entry) {
  const expected = entry.expectedRetention;
  if (!expected) return null;
  const retention = solved.ev?.plan?.retention;
  assert.ok(retention, `${entry.id} omitted the solved retention contract`);
  assert.equal(retention.active, true, `${entry.id} retention is inactive`);
  assert.equal(retention.ok, true, `${entry.id} retention layout is invalid`);
  assert.equal(retention.pass, true, `${entry.id} retention did not pass`);
  assert.equal(retention.code, null, `${entry.id} retains a refusal code`);
  assert.equal(
    retention.cartridgeCount,
    expected.cartridgeCount,
    `${entry.id} changed its retained cartridge count`
  );
  assert.equal(
    retention.countPerCartridge,
    expected.countPerCartridge,
    `${entry.id} changed screws per cartridge`
  );
  assert.equal(
    retention.totalScrews,
    expected.totalScrews,
    `${entry.id} changed its total retention tool count`
  );
  assert.equal(
    retention.drivers.length,
    expected.cartridgeCount,
    `${entry.id} changed its per-cartridge retention layouts`
  );
  const solvedTools = retention.drivers.flatMap((driver) => driver.tools || []);
  const fieldTools = (geometry.field?.retentionTools || []).flat();
  assert.equal(
    solvedTools.length,
    expected.totalScrews,
    `${entry.id} solved the wrong retention tool count`
  );
  assert.equal(
    fieldTools.length,
    expected.totalScrews,
    `${entry.id} exact field owns the wrong retention tool count`
  );
  assert.deepEqual(
    fieldTools,
    solvedTools,
    `${entry.id} exact field changed the solved retention tools`
  );
  const ownership = {
    hornPocket: 0,
    moduleBoss: 0,
    moduleBore: 0,
    moduleCounterbore: 0
  };
  for (const [index, tool] of solvedTools.entries()) {
    assert.deepEqual(
      tool.ownership?.horn,
      ["hornPocket"],
      `${entry.id} tool ${index} changed horn ownership`
    );
    assert.deepEqual(
      tool.ownership?.module,
      ["boss", "moduleBore", "counterbore"],
      `${entry.id} tool ${index} changed cartridge ownership`
    );
    ownership.hornPocket += 1;
    ownership.moduleBoss += 1;
    ownership.moduleBore += 1;
    ownership.moduleCounterbore += 1;
  }
  assert.equal(audit.retention?.active, true, `${entry.id} audit lost retention`);
  assert.equal(audit.retention?.ok, true, `${entry.id} audit invalidated retention`);
  assert.equal(audit.retention?.pass, true, `${entry.id} retention audit failed`);
  assert.equal(
    audit.retention?.toolCount,
    expected.totalScrews,
    `${entry.id} retention audit changed its exact tool count`
  );
  assert.ok(
    (audit.retention?.rows || []).every((row) => row.pass === true),
    `${entry.id} has a failing retention audit row`
  );
  return {
    active: retention.active,
    ok: retention.ok,
    pass: retention.pass,
    code: retention.code,
    fastener: retention.fastener,
    cartridgeCount: retention.cartridgeCount,
    countPerCartridge: retention.countPerCartridge,
    totalScrews: retention.totalScrews,
    driverToolCounts: retention.drivers.map((driver) => driver.tools.length),
    exactFieldToolCount: fieldTools.length,
    ownership,
    audit: {
      active: audit.retention.active,
      ok: audit.retention.ok,
      pass: audit.retention.pass,
      code: audit.retention.code,
      toolCount: audit.retention.toolCount,
      rows: audit.retention.rows.map((row) => ({
        name: row.name,
        pass: row.pass,
        value: row.value
      }))
    }
  };
}

function emitChild(record) {
  console.log(`${CHILD_MARKER}${JSON.stringify(record)}`);
}

async function runChild(id) {
  const config = readJson("cases/exact-production-admission.json");
  const entry = config.cases.find((candidate) => candidate.id === id);
  assert.ok(entry, `certificate configuration for ${id} is missing`);
  const result = preflightFixture(entry, config.intent);
  const stateFingerprint = engine.twoWayMeshStateFingerprint(result.solved.S);
  const common = {
    schemaVersion: 2,
    kind: "meh-production-exact-certificate",
    caseId: id,
    sourceCase: result.fixture.sourceId,
    productionCandidate: true,
    intent: config.intent,
    stateFingerprintSha256: sha256(stateFingerprint),
    preflight: result.budget
  };

  if (!result.admitted) {
    emitChild({
      ...common,
      status: "refused-at-preflight",
      refusalCode: result.code
    });
    return;
  }

  if (CHILD_EXPECTED_STATUS === "refused" && !CHILD_PROBE) {
    // Fail closed without allocating geometry when a policy widens
    // unexpectedly. The parent will reject this status and require an
    // explicit probe followed by pinned certificate values.
    emitChild({
      ...common,
      status: "admitted-at-preflight-only",
      refusalCode: null
    });
    return;
  }

  if (!CHILD_PROBE) {
    assert.equal(
      result.budget.step,
      config.fixedStepMeters,
      `${id} must retain the fixed manufacturing grid`
    );
  }
  engine.clearTwoWayMeshCache?.();
  const startedAt = Date.now();
  const geometry = engine.twoWayGeometry(result.solved.S, config.intent);
  const expectedComponents =
    entry.expectedComponents ?? result.fixture.expected.components;
  const expectedDetachable = entry.expectedDetachable ?? expectedComponents > 1;
  const geometryDetachable = Boolean(
    geometry.detachable ?? geometry.mesh?.detachable
  );
  assert.equal(
    geometryDetachable,
    expectedDetachable,
    `${id} changed its integrated/detachable exact topology`
  );
  assert.equal(
    geometry.parts.length,
    expectedComponents,
    `${id} exposed the wrong exact printable-part count`
  );
  const audit = engine.fabricationAudit(result.solved.S, geometry.mesh, true);
  assertAuditPass(audit, result.fixture, expectedComponents);
  const namedParts = namedPartSummary(geometry, entry);
  const retention = retentionSummary(result.solved, geometry, audit, entry);

  const meshes = geometryDetachable ? geometry.parts : [geometry.mesh];
  const stlHash = createHash("sha256");
  const files = [];
  let totalStlBytes = 0;
  for (let index = 0; index < meshes.length; index += 1) {
    const bytes = engine.stlBytes(
      meshes[index],
      result.rawBudget.limits?.maxStlBytes
    );
    const view = bytes instanceof ArrayBuffer
      ? new Uint8Array(bytes)
      : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const fileHash = createHash("sha256").update(view).digest("hex");
    stlHash.update(view);
    totalStlBytes += view.byteLength;
    files.push({
      index,
      ...(entry.expectedPartNames
        ? { name: entry.expectedPartNames[index] }
        : {}),
      triangles: meshTriangleCount(meshes[index]),
      stlBytes: view.byteLength,
      stlSha256: fileHash
    });
  }
  const elapsedMs = Date.now() - startedAt;
  const maxRssBytes = process.resourceUsage().maxRSS * 1024;
  const vertices = meshVertexCount(geometry.mesh);
  const triangles = meshTriangleCount(geometry.mesh);

  assert.ok(
    vertices <= result.rawBudget.limits.maxVertices,
    `${id} exceeded its enforced vertex limit`
  );
  assert.ok(
    triangles <= result.rawBudget.limits.maxTriangles,
    `${id} exceeded its enforced triangle limit`
  );
  assert.ok(
    totalStlBytes <= result.rawBudget.limits.maxStlBytes,
    `${id} exceeded its enforced STL-byte limit`
  );

  emitChild({
    ...common,
    status: "certified",
    policyVersion: result.budget.policyVersion,
    detachable: geometryDetachable,
    printablePartCount: geometry.parts.length,
    vertices,
    triangles,
    stlBytes: totalStlBytes,
    stlSha256: stlHash.digest("hex"),
    files,
    ...(namedParts ? { namedParts } : {}),
    ...(retention ? { retention } : {}),
    audit: auditSummary(audit),
    elapsedMs,
    maxRssBytes,
    observedRssIsPolicyGuarantee: false
  });
}

function parseChildRecord(stdout, id) {
  const markerLine = String(stdout || "")
    .split(/\r?\n/)
    .find((line) => line.startsWith(CHILD_MARKER));
  assert.ok(markerLine, `${id} certificate child returned no structured record`);
  return JSON.parse(markerLine.slice(CHILD_MARKER.length));
}

function spawnCertificateChild(entry, options) {
  const probe = options.probe === entry.id;
  const child = spawnSync(process.execPath, [THIS_FILE], {
    cwd: QA_ROOT,
    encoding: "utf8",
    timeout: options.timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      MEH_PRODUCTION_CERT_CHILD: entry.id,
      MEH_PRODUCTION_CERT_EXPECTED_STATUS: entry.expectedStatus,
      MEH_PRODUCTION_CERT_PROBE: probe ? "1" : "0"
    }
  });
  if (child.error) throw child.error;
  assert.equal(
    child.status,
    0,
    `${entry.id} certificate child exited ${child.status ?? child.signal}\n`
      + [child.stdout, child.stderr].filter(Boolean).join("\n")
  );
  return parseChildRecord(child.stdout, entry.id);
}

function assertPinnedCertificate(record, entry) {
  const expected = entry.expectedCertificate;
  const ceilings = entry.resourceCeilings;
  assert.ok(
    expected && typeof expected === "object",
    `${entry.id} is admitted but expectedCertificate is not pinned; run --probe first`
  );
  assert.ok(
    ceilings && typeof ceilings === "object",
    `${entry.id} is admitted but resourceCeilings is not pinned`
  );
  for (const key of [
    "policyVersion",
    "stateFingerprintSha256",
    "detachable",
    "printablePartCount",
    "vertices",
    "triangles",
    "stlBytes",
    "stlSha256"
  ]) {
    assert.notEqual(expected[key], undefined, `${entry.id} omitted pinned ${key}`);
    assert.equal(record[key], expected[key], `${entry.id} changed ${key}`);
  }
  if (expected.files !== undefined) {
    assert.deepEqual(record.files, expected.files, `${entry.id} changed its STL file records`);
  }
  if (expected.namedParts !== undefined) {
    assert.deepEqual(
      record.namedParts,
      expected.namedParts,
      `${entry.id} changed its named-part deep audits`
    );
  }
  if (expected.retention !== undefined) {
    assert.deepEqual(
      record.retention,
      expected.retention,
      `${entry.id} changed its exact retention ownership certificate`
    );
  }
  if (expected.audit !== undefined) {
    for (const [key, value] of Object.entries(expected.audit)) {
      assert.equal(record.audit?.[key], value, `${entry.id} changed audit.${key}`);
    }
  }
  assert.ok(
    Number.isSafeInteger(ceilings.maxElapsedMs) && ceilings.maxElapsedMs > 0,
    `${entry.id} maxElapsedMs must be a positive safe integer`
  );
  assert.ok(
    Number.isSafeInteger(ceilings.maxRssBytes) && ceilings.maxRssBytes > 0,
    `${entry.id} maxRssBytes must be a positive safe integer`
  );
  assert.ok(
    record.elapsedMs <= ceilings.maxElapsedMs,
    `${entry.id} took ${record.elapsedMs} ms; ceiling is ${ceilings.maxElapsedMs} ms`
  );
  assert.ok(
    record.maxRssBytes <= ceilings.maxRssBytes,
    `${entry.id} used ${record.maxRssBytes} RSS bytes; ceiling is ${ceilings.maxRssBytes}`
  );
}

function assertConfig(config) {
  assert.equal(config.schemaVersion, 2, "unsupported production admission schema");
  assert.equal(config.intent, "export", "production certificate must use export intent");
  assert.equal(config.fixedStepMeters, 0.0025, "production certificate must use 2.5 mm");
  assert.match(
    String(config.expectedPolicyVersion || ""),
    /^b\d+-/,
    "production certificate must pin an exact policy version"
  );
  assert.ok(Array.isArray(config.cases) && config.cases.length > 0, "admission cases are missing");
  const ids = config.cases.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, "production admission case IDs must be unique");
  assert.ok(
    Array.isArray(config.certificateCases) && config.certificateCases.length > 0,
    "configured certificate cases are missing"
  );
  assert.equal(
    new Set(config.certificateCases).size,
    config.certificateCases.length,
    "configured certificate case IDs must be unique"
  );
  for (const id of config.certificateCases) {
    assert.ok(ids.includes(id), `configured certificate case ${id} is missing`);
  }
  for (const entry of config.cases) {
    assert.ok(
      entry.expectedStatus === "refused" || entry.expectedStatus === "admitted",
      `${entry.id} has unsupported expectedStatus ${entry.expectedStatus}`
    );
    assert.ok(entry.expectedPreflight, `${entry.id} omitted expectedPreflight`);
    if (entry.expectedStatus === "admitted") {
      assert.ok(
        config.certificateCases.includes(entry.id),
        `${entry.id} is admitted without a fresh-process certificate path`
      );
    }
    if (entry.sourceCase) {
      assert.ok(entry.overrides, `${entry.id} derived fixture omitted overrides`);
      assert.ok(
        Number.isSafeInteger(entry.expectedComponents) &&
          entry.expectedComponents > 0,
        `${entry.id} derived fixture omitted expectedComponents`
      );
    }
  }
}

async function runParent(options) {
  const config = readJson("cases/exact-production-admission.json");
  assertConfig(config);
  if (options.probe) {
    const entry = config.cases.find((candidate) => candidate.id === options.probe);
    assert.ok(
      entry,
      `probe case ${options.probe} is not present in the production admission configuration`
    );
    const record = spawnCertificateChild(entry, options);
    const preflightDrift = describePreflightDrift(
      record.preflight,
      entry.expectedPreflight,
      entry,
      config
    );
    console.log(JSON.stringify({
      kind: "meh-production-exact-certificate-probe",
      probe: options.probe,
      configuredExpectation: {
        role: entry.role || null,
        expectedStatus: entry.expectedStatus,
        expectedRefusalCode: entry.expectedRefusalCode ?? null,
        certificateCase: config.certificateCases.includes(entry.id)
      },
      observedOutcome: {
        status: record.status,
        refusalCode: record.refusalCode ?? null
      },
      preflightDrift,
      reports: [record]
    }, null, 2));
    console.log(
      record.status === "certified"
        ? `PRODUCTION EXACT PROBE COMPLETE — pin ${options.probe} counts, hashes, and ceilings before admission`
        : `PRODUCTION EXACT PROBE REFUSED — ${options.probe} remains outside the current policy`
    );
    return;
  }

  const reports = [];
  const certificateCases = new Set(config.certificateCases);
  for (const entry of config.cases) {
    if (certificateCases.has(entry.id)) {
      const record = spawnCertificateChild(entry, options);
      assertPreflightSnapshot(record.preflight, entry.expectedPreflight, entry.id);
      if (entry.expectedDetachable !== undefined) {
        assert.equal(
          record.preflight.detachable,
          entry.expectedDetachable,
          `${entry.id} changed its preflight detachable topology`
        );
      }
      assert.equal(
        record.preflight.policyVersion,
        config.expectedPolicyVersion,
        `${entry.id} changed its pinned mesh policy`
      );
      if (entry.expectedStatus === "refused") {
        assert.equal(
          record.status,
          "refused-at-preflight",
          `${entry.id} became admitted without a pinned production certificate`
        );
        assert.equal(
          record.refusalCode,
          entry.expectedRefusalCode,
          `${entry.id} changed its stable refusal code`
        );
      } else {
        assert.equal(record.status, "certified", `${entry.id} did not complete its certificate`);
        assertPinnedCertificate(record, entry);
      }
      reports.push(record);
      continue;
    }

    assert.equal(
      entry.expectedStatus,
      "refused",
      `${entry.id} is marked admitted without a certificate path`
    );
    const result = preflightFixture(entry, config.intent);
    assert.equal(
      result.admitted,
      false,
      `${entry.id} unexpectedly entered production exact allocation`
    );
    assert.equal(
      result.code,
      entry.expectedRefusalCode,
      `${entry.id} changed its stable refusal code`
    );
    assertPreflightSnapshot(result.budget, entry.expectedPreflight, entry.id);
    assert.equal(
      result.budget.policyVersion,
      config.expectedPolicyVersion,
      `${entry.id} changed its pinned mesh policy`
    );
    reports.push({
      caseId: entry.id,
      status: "refused-at-preflight",
      refusalCode: result.code,
      preflight: result.budget
    });
  }

  console.log(JSON.stringify({
    kind: "meh-production-exact-admission-gate",
    probe: null,
    reports
  }, null, 2));
  const admitted = reports.filter((report) => report.status === "certified").length;
  console.log(
    `PRODUCTION EXACT ADMISSION PASS — ${admitted} certified · `
      + `${reports.length - admitted} held fail-closed`
  );
}

if (CHILD_CASE) {
  await runChild(CHILD_CASE);
} else {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) printHelp();
  else await runParent(options);
}
