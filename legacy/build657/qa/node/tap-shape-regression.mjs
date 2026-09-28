#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { engine, finiteTree } from "./case-loader.mjs";

const SHAPES = ["slot", "oval", "round"];
const TAP_COUNTS = [1, 2];
const COVERAGES = [40, 80, 120];
const CONSTRUCTION_MODES = ["integrated", "cartridge"];
const EXACT_MARKER = "@@MEH_TAP_SHAPE_EXACT@@";
const EXACT_TIMEOUT_MS = 120_000;
const THIS_FILE = fileURLToPath(import.meta.url);
const ANALYTIC_ONLY = process.argv.includes("--analytic-only");
const PREFLIGHT_REFUSAL_CODES = new Set([
  "MESH_AXIS_LIMIT",
  "MESH_PART_GRID_LIMIT",
  "MESH_JOB_GRID_LIMIT",
  "MESH_MEMORY_LIMIT"
]);

function baseState(family, overrides = {}) {
  const architecture = engine.TWO_ARCH[family];
  if (!architecture) throw new Error(`unknown two-way family ${family}`);
  return {
    ...architecture.defaults,
    topo: "2way",
    twoArch: family,
    twoFamily: family,
    twoDesign: `arch:${family}`,
    tapBasis: "model",
    mouthW: family === "panel" ? 48 : 54,
    mouthCap: 64,
    covH: 80,
    covV: 60,
    wallT: family === "panel" ? 0.018 : 0.012,
    rollR: 2,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    wPre: "w5",
    frameW: "round",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    adapterReach: 35,
    adapterReachMode: "auto",
    tapCRW: 10,
    ...overrides
  };
}

const EXACT_CASES = [
  {
    id: "panel-oval-integrated",
    expectedComponents: 1,
    expectedToolKind: "straight",
    state: baseState("panel", {
      nW: 2,
      npW: 2,
      shW: "oval",
      driverCellConstruction: "integrated",
      covH: 80,
      mouthW: 32
    })
  },
  {
    id: "radial-oval-detachable",
    expectedComponents: 3,
    expectedToolKind: "swept-aperture",
    state: baseState("radial", {
      nW: 2,
      npW: 1,
      shW: "oval",
      driverCellConstruction: "cartridge",
      covH: 80,
      mouthW: 28
    })
  }
];

function length(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function analyticArea(port) {
  if (port.shape === "round") return Math.PI * port.sa * port.sa;
  if (port.shape === "oval") return Math.PI * port.sa * port.sb;
  if (port.shape === "slot") {
    return 4 * port.sa * port.sb - (4 - Math.PI) * port.sb * port.sb;
  }
  return NaN;
}

function close(actual, expected, relativeTolerance = 1e-9, absoluteTolerance = 1e-12) {
  return Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.abs(actual - expected)
      <= Math.max(absoluteTolerance, relativeTolerance * Math.max(Math.abs(actual), Math.abs(expected)));
}

function apertureSupport(port, direction) {
  const directionLength = length(direction);
  if (directionLength <= 1e-12) return Math.max(port.sa, port.sb);
  const unitDirection = direction.map((value) => value / directionLength);
  let along = dot(unitDirection, port.flow);
  let across = dot(unitDirection, port.cross);
  const tangentLength = Math.hypot(along, across);
  if (tangentLength <= 1e-12) return Math.max(port.sa, port.sb);
  along /= tangentLength;
  across /= tangentLength;
  if (port.shape === "round") return port.sa;
  if (port.shape === "oval") {
    return Math.hypot(port.sa * along, port.sb * across);
  }
  return Math.max(0, port.sa - port.sb) * Math.abs(along) + port.sb;
}

function pairSupportGap(first, second) {
  const delta = subtract(second.center, first.center);
  return length(delta)
    - apertureSupport(first, delta)
    - apertureSupport(second, delta.map((value) => -value));
}

function activeConeReach(driver, port) {
  const offset = subtract(port.center, driver.surface);
  return length(offset) + apertureSupport(port, offset);
}

function failedLawNames(solved) {
  return (solved?.ev?.rows || [])
    .filter((row) => row.st === "fail")
    .map((row) => row.name);
}

function scenarioLabel({ family, nW, npW, shW, covH, driverCellConstruction }) {
  const mount = driverCellConstruction === "cartridge" ? "detachable" : "integrated";
  return `${family}/n${nW}/t${npW}/${shW}/c${covH}/${mount}`;
}

function exactToolContract(geometry) {
  const plan = geometry.plan;
  const tools = geometry.field?.tapTools;
  if (!Array.isArray(tools)) return { present: false };
  const entries = [];
  for (const driver of plan.drivers) {
    for (const port of driver.ports) {
      const tool = tools[driver.index]?.[port.index];
      if (!tool) {
        entries.push({ missing: true });
        continue;
      }
      const sections = Array.isArray(tool.sections) ? tool.sections : [];
      entries.push({
        missing: false,
        kind: tool.kind,
        shape: tool.shape,
        sa: tool.sa,
        sb: tool.sb,
        expectedSa: port.sa,
        expectedSb: port.sb,
        sections: sections.map((section) => ({
          stage: section.stage,
          shape: section.shape,
          sa: section.sa,
          sb: section.sb,
          finiteFailures: finiteTree(section),
          pathLength: length(subtract(section.b, section.a)),
          uLength: length(section.u),
          vLength: length(section.v),
          frameDot: dot(section.u, section.v)
        }))
      });
    }
  }
  return { present: true, entries };
}

function runExactChild(caseId) {
  const exactCase = EXACT_CASES.find((candidate) => candidate.id === caseId);
  if (!exactCase) throw new Error(`unknown exact tap-shape case ${caseId}`);
  const started = Date.now();
  const solved = engine.solve(exactCase.state);
  const failures = failedLawNames(solved);
  if (solved.infeasible) {
    throw new Error(`${caseId} was refused before meshing: ${failures.join(", ")}`);
  }
  const geometry = engine.twoWayGeometry(solved.S, "display");
  const audit = engine.meshAudit(geometry.mesh);
  const fabrication = engine.fabricationAudit(solved.S, geometry.mesh, false);
  const stl = engine.stlBytes(geometry.mesh);
  const result = {
    id: caseId,
    elapsedMs: Date.now() - started,
    expectedComponents: exactCase.expectedComponents,
    expectedToolKind: exactCase.expectedToolKind,
    state: {
      family: solved.S.twoArch,
      nW: solved.S.nW,
      npW: solved.S.npW,
      shape: solved.S.shW,
      coverage: solved.S.covH,
      driverCellConstruction: solved.S.driverCellConstruction,
      mountRing: solved.S.mountRing
    },
    plan: {
      finiteFailures: finiteTree(geometry.plan),
      shape: geometry.plan.port.shape,
      portShapes: geometry.plan.allPorts.map((port) => port.shape)
    },
    geometry: {
      vertices: geometry.mesh.pos.length,
      triangles: geometry.mesh.tri.length,
      rawComponents: geometry.rawComponentCount,
      discardedComponents: geometry.discardedComponents,
      exportedParts: geometry.parts.length,
      partDiagnostics: geometry.partDiagnostics,
      stlBytes: stl.byteLength,
      toolContract: exactToolContract(geometry)
    },
    audit: {
      components: audit.components,
      badEdges: audit.badEdges,
      badOrientation: audit.badOrientation,
      orientationConflict: audit.orientationConflict,
      degenerate: audit.degenerate,
      duplicateFaces: audit.duplicateFaces,
      nonFinite: audit.nonFinite,
      volume: audit.volume
    },
    fabrication: {
      pass: fabrication.pass,
      rawComponents: fabrication.rawComponents,
      discardedComponents: fabrication.discardedComponents,
      namedPartsConnected: fabrication.namedPartsConnected,
      assemblyPass: fabrication.assembly?.pass
    }
  };
  console.log(`${EXACT_MARKER}${JSON.stringify(result)}`);
}

function runMatrix(failures) {
  let scenarios = 0;
  let assertions = 0;
  let lawfulRefusals = 0;
  const check = (condition, label, message) => {
    assertions += 1;
    if (!condition) failures.push(`${label}: ${message}`);
  };

  for (const family of ["panel", "radial"]) {
    for (const nW of engine.TWO_ARCH[family].counts) {
      for (const npW of TAP_COUNTS) {
        for (const shW of SHAPES) {
          for (const covH of COVERAGES) {
            for (const driverCellConstruction of CONSTRUCTION_MODES) {
              const requested = { family, nW, npW, shW, covH, driverCellConstruction };
              const label = scenarioLabel(requested);
              scenarios += 1;
              try {
                const state = baseState(family, {
                  nW,
                  npW,
                  shW,
                  covH,
                  driverCellConstruction
                });
                const solved = engine.solve(state);
                const plan = solved?.ev?.plan;
                check(Boolean(plan), label, "solver returned no two-way plan");
                if (!plan) continue;

                const failedRows = (solved?.ev?.rows || []).filter((row) => row.st === "fail");
                const failedLaws = failedRows.map((row) => row.name);
                /* This matrix validates canonical tap plans, including plans
                   that fail closed on a separate fabrication law. Cartridge
                   retention is allowed only as the sole, stable named
                   refusal; every acoustic/tap law must still pass. */
                const lawfulRetentionRefusal = solved.infeasible
                  && driverCellConstruction === "cartridge"
                  && failedRows.length === 1
                  && failedRows[0].code === "CARTRIDGE_RETENTION_NO_LAYOUT";
                if (lawfulRetentionRefusal) lawfulRefusals += 1;
                check(
                  !solved.infeasible || lawfulRetentionRefusal,
                  label,
                  `unexpected refusal: ${failedLaws.join(", ")}`
                );
                check(
                  failedRows.length === 0 || lawfulRetentionRefusal,
                  label,
                  `unexpected failed law rows: ${failedLaws.join(", ")}`
                );
                check(finiteTree(plan).length === 0, label, "plan contains NaN or infinite values");
                check(solved.S.twoArch === family, label, `family propagated as ${solved.S.twoArch}`);
                check(solved.S.nW === nW, label, `driver count propagated as ${solved.S.nW}`);
                check(solved.S.npW === npW, label, `taps/woofer propagated as ${solved.S.npW}`);
                check(solved.S.shW === shW, label, `state shape propagated as ${solved.S.shW}`);
                check(solved.S.covH === covH, label, `coverage propagated as ${solved.S.covH}`);
                check(
                  solved.S.driverCellConstruction === driverCellConstruction,
                  label,
                  `driver-cell construction propagated as ${solved.S.driverCellConstruction}`
                );
                const expectedMountRing = driverCellConstruction === "cartridge" ? "ring" : "integrated";
                check(
                  solved.S.mountRing === expectedMountRing,
                  label,
                  `derived mount mode ${solved.S.mountRing} != ${expectedMountRing}`
                );
                check(
                  close(plan.cr, +solved.S.tapCRW),
                  label,
                  `plan compression ${plan.cr} != adapted state ${solved.S.tapCRW}`
                );
                check(
                  plan.cr >= 2.5 && plan.cr <= 12,
                  label,
                  `adapted compression ratio ${plan.cr} is outside the legal design range`
                );
                check(plan.port.shape === shW, label, `canonical port shape is ${plan.port.shape}`);
                check(plan.drivers.length === nW, label, `plan has ${plan.drivers.length} drivers`);
                check(plan.allPorts.length === nW * npW, label, `plan has ${plan.allPorts.length} taps`);

                const expectedTotalArea = plan.frame.sd / plan.cr;
                check(
                  close(plan.totalArea, expectedTotalArea),
                  label,
                  `per-driver open area ${plan.totalArea} != Sd/CR ${expectedTotalArea}`
                );
                check(
                  close(plan.port.area * npW, plan.totalArea),
                  label,
                  `canonical aperture area × count does not equal per-driver total`
                );

                for (const driver of plan.drivers) {
                  check(
                    driver.ports.length === npW,
                    label,
                    `driver ${driver.index} has ${driver.ports.length} taps`
                  );
                  const driverArea = driver.ports.reduce((sum, port) => sum + port.area, 0);
                  check(
                    close(driverArea, plan.totalArea),
                    label,
                    `driver ${driver.index} tap area ${driverArea} != ${plan.totalArea}`
                  );
                  for (const port of driver.ports) {
                    check(port.shape === shW, label, `driver ${driver.index} tap ${port.index} is ${port.shape}`);
                    check(
                      Number.isFinite(port.sa) && port.sa > 0
                        && Number.isFinite(port.sb) && port.sb > 0,
                      label,
                      `driver ${driver.index} tap ${port.index} has invalid semi-axes`
                    );
                    const calculatedArea = analyticArea(port);
                    check(
                      close(calculatedArea, port.area),
                      label,
                      `driver ${driver.index} tap ${port.index} analytic ${shW} area ${calculatedArea} != ${port.area}`
                    );
                    const supportedReach = activeConeReach(driver, port);
                    check(
                      supportedReach <= plan.frame.activeR - 0.002 + 1e-9,
                      label,
                      `driver ${driver.index} tap ${port.index} support reaches ${(supportedReach * 1000).toFixed(3)} mm outside ${(plan.frame.activeR * 1000).toFixed(3)} mm active radius`
                    );
                  }
                  if (npW === 2) {
                    const supportedGap = pairSupportGap(driver.ports[0], driver.ports[1]);
                    check(
                      supportedGap >= plan.minWeb - 1e-9,
                      label,
                      `driver ${driver.index} directional aperture gap ${(supportedGap * 1000).toFixed(3)} mm < ${(plan.minWeb * 1000).toFixed(3)} mm web`
                    );
                  }
                }

                check(
                  close(
                    plan.allPorts.reduce((sum, port) => sum + port.area, 0),
                    nW * plan.totalArea
                  ),
                  label,
                  "assembly aperture area does not equal driver count × per-driver area"
                );
                check(
                  plan.maxPortReach <= plan.frame.activeR - 0.002 + 1e-9,
                  label,
                  "planner reports a tap outside active-cone support"
                );
                check(
                  npW !== 2 || plan.pairWeb >= plan.minWeb - 1e-9,
                  label,
                  "planner reports overlapping paired taps or inadequate web"
                );
              } catch (error) {
                failures.push(`${label}: threw ${error?.stack || error}`);
              }
            }
          }
        }
      }
    }
  }
  return { scenarios, assertions, lawfulRefusals };
}

function validateExactResult(result, exactCase, failures) {
  const label = exactCase.id;
  const check = (condition, message) => {
    if (!condition) failures.push(`${label}: ${message}`);
  };
  const expected = exactCase.expectedComponents;
  check(result.state.shape === "oval", `solved shape is ${result.state.shape}`);
  check(result.plan.shape === "oval", `exact plan shape is ${result.plan.shape}`);
  check(result.plan.portShapes.every((shape) => shape === "oval"), "an exact-plan tap lost oval shape");
  check(result.plan.finiteFailures.length === 0, `exact plan has nonfinite values: ${result.plan.finiteFailures.join(", ")}`);
  check(result.geometry.vertices > 0, "exact mesh has no vertices");
  check(result.geometry.triangles > 0, "exact mesh has no triangles");
  check(result.geometry.rawComponents === expected, `raw components ${result.geometry.rawComponents} != ${expected}`);
  check(result.geometry.discardedComponents === 0, `${result.geometry.discardedComponents} exact components were discarded`);
  check(result.geometry.exportedParts === expected, `exported parts ${result.geometry.exportedParts} != ${expected}`);
  check(
    result.geometry.partDiagnostics.length === expected,
    `part diagnostics ${result.geometry.partDiagnostics.length} != ${expected}`
  );
  check(
    result.geometry.partDiagnostics.every((diagnostic) => diagnostic.componentCount === 1),
    "a named exact part contains disconnected geometry"
  );
  check(
    result.geometry.stlBytes === 84 + 50 * result.geometry.triangles,
    "binary STL length does not match triangle count"
  );
  check(result.audit.components === expected, `welded mesh components ${result.audit.components} != ${expected}`);
  for (const key of [
    "badEdges",
    "badOrientation",
    "orientationConflict",
    "degenerate",
    "duplicateFaces",
    "nonFinite"
  ]) {
    check(result.audit[key] === 0, `${key} is ${result.audit[key]}`);
  }
  check(result.audit.volume > 0, `signed exact volume is ${result.audit.volume}`);
  check(result.fabrication.rawComponents === expected, "fabrication raw-component count is wrong");
  check(result.fabrication.discardedComponents === 0, "fabrication audit reports discarded geometry");
  check(result.fabrication.namedPartsConnected === true, "fabrication audit found a disconnected named part");
  check(result.fabrication.assemblyPass === true, "tap/chamber assembly audit failed");
  check(result.fabrication.pass === true, "fabrication audit rejected the exact mesh");

  const toolContract = result.geometry.toolContract;
  check(toolContract.present === true, "exact implicit field has no tap-cutter diagnostics");
  for (const [index, entry] of (toolContract.entries || []).entries()) {
    check(!entry.missing, `tap cutter ${index} is missing`);
    check(entry.kind === exactCase.expectedToolKind, `tap cutter ${index} kind is ${entry.kind}`);
    if (exactCase.expectedToolKind === "straight") {
      check(entry.shape === "oval", `straight tap cutter ${index} shape is ${entry.shape}`);
      check(close(entry.sa, entry.expectedSa), `straight tap cutter ${index} lost oval long radius`);
      check(close(entry.sb, entry.expectedSb), `straight tap cutter ${index} lost oval short radius`);
    } else {
      check(entry.shape === "oval", `swept tap cutter ${index} shape is ${entry.shape}`);
      check(close(entry.sa, entry.expectedSa), `swept tap cutter ${index} lost oval long radius`);
      check(close(entry.sb, entry.expectedSb), `swept tap cutter ${index} lost oval short radius`);
      check(entry.sections.length >= 3, `swept oval cutter ${index} has only ${entry.sections.length} sections`);
      check(
        entry.sections.some((section) => section.stage === "wall"),
        `swept oval cutter ${index} has no wall section`
      );
      check(
        entry.sections.some((section) => section.stage === "adapter"),
        `swept oval cutter ${index} has no adapter section`
      );
      for (const [sectionIndex, section] of entry.sections.entries()) {
        const sectionLabel = `swept oval cutter ${index} section ${sectionIndex}`;
        check(
          section.finiteFailures.length === 0,
          `${sectionLabel} has nonfinite values: ${section.finiteFailures.join(", ")}`
        );
        check(section.shape === "oval", `${sectionLabel} shape is ${section.shape}`);
        check(close(section.sa, entry.expectedSa), `${sectionLabel} lost oval long radius`);
        check(close(section.sb, entry.expectedSb), `${sectionLabel} lost oval short radius`);
        check(section.pathLength > 1e-6, `${sectionLabel} has zero path length`);
        check(close(section.uLength, 1, 1e-8), `${sectionLabel} u axis is not unit length`);
        check(close(section.vLength, 1, 1e-8), `${sectionLabel} v axis is not unit length`);
        check(Math.abs(section.frameDot) <= 1e-8, `${sectionLabel} aperture axes are not orthogonal`);
      }
    }
  }
}

function runExactCases(failures) {
  const results = [];
  for (const exactCase of EXACT_CASES) {
    let solved;
    try {
      solved = engine.solve(exactCase.state);
    } catch (error) {
      failures.push(`${exactCase.id}: preflight solve threw ${error?.stack || error}`);
      continue;
    }
    const failedLaws = failedLawNames(solved);
    if (solved.infeasible || failedLaws.length) {
      failures.push(
        `${exactCase.id}: production fixture was refused by the solver before mesh policy: `
        + failedLaws.join(", ")
      );
      continue;
    }

    let preflight;
    try {
      preflight = engine.twoWayMeshPreflight(solved.S, "display");
    } catch (error) {
      const code = String(error?.code || "");
      if (!PREFLIGHT_REFUSAL_CODES.has(code)) {
        failures.push(
          `${exactCase.id}: display preflight threw unexpected ${code || "unclassified error"}: `
          + (error?.stack || error)
        );
        continue;
      }
      if (!error?.details?.budget) {
        failures.push(`${exactCase.id}: ${code} refusal omitted its mesh budget`);
        continue;
      }
      results.push({
        id: exactCase.id,
        status: "refused-by-policy",
        intent: "display",
        code
      });
      continue;
    }

    /* Cases still held by the build-642 policy stop above, before any heavy
       exact allocation. If a future bounded mesher admits one of them,
       retain the deeper child-process validation as the forward-compatible path. */
    const child = spawnSync(process.execPath, [THIS_FILE], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: EXACT_TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        MEH_TAP_SHAPE_EXACT_CASE: exactCase.id
      }
    });
    if (child.error) {
      failures.push(`${exactCase.id}: exact geometry process failed: ${child.error.message}`);
      continue;
    }
    if (child.status !== 0) {
      failures.push(
        `${exactCase.id}: exact geometry exited ${child.status ?? child.signal}: `
        + [child.stdout, child.stderr].filter(Boolean).join("\n").trim()
      );
      continue;
    }
    const markerLine = child.stdout
      .split(/\r?\n/)
      .find((line) => line.startsWith(EXACT_MARKER));
    if (!markerLine) {
      failures.push(`${exactCase.id}: exact geometry child returned no result marker`);
      continue;
    }
    try {
      const result = JSON.parse(markerLine.slice(EXACT_MARKER.length));
      validateExactResult(result, exactCase, failures);
      results.push({
        ...result,
        status: "exact-validated",
        preflight: {
          intent: preflight.intent,
          totalGridPoints: preflight.totals?.gridPoints
        }
      });
    } catch (error) {
      failures.push(`${exactCase.id}: could not parse exact geometry result: ${error.message}`);
    }
  }
  return results;
}

function runRegression() {
  const failures = [];
  const started = Date.now();
  const matrix = runMatrix(failures);
  const exactResults = ANALYTIC_ONLY ? [] : runExactCases(failures);
  if (failures.length) {
    for (const failure of failures.slice(0, 80)) console.error(`FAIL ${failure}`);
    if (failures.length > 80) {
      console.error(`FAIL ... ${failures.length - 80} additional failures omitted`);
    }
    process.exitCode = 1;
    return;
  }
  const exactSummary = ANALYTIC_ONLY
    ? "exact child meshes skipped (--analytic-only)"
    : exactResults
      .map((result) => result.status === "refused-by-policy"
        ? `${result.id} safely refused at ${result.intent} preflight (${result.code})`
        : `${result.id} exact fallback validated `
          + `${result.geometry.triangles.toLocaleString()} triangles/${(result.elapsedMs / 1000).toFixed(1)}s`)
      .join(" · ");
  console.log(
    `TAP SHAPE REGRESSION PASS — ${matrix.scenarios} planner states · `
    + `${matrix.assertions.toLocaleString()} analytic assertions · `
    + `${matrix.lawfulRefusals} stable retention refusals · ${exactSummary} · `
    + `${((Date.now() - started) / 1000).toFixed(1)}s total`
  );
}

const childCaseId = process.env.MEH_TAP_SHAPE_EXACT_CASE;
if (childCaseId) {
  try {
    runExactChild(childCaseId);
  } catch (error) {
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
} else {
  runRegression();
}
