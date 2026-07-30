#!/usr/bin/env node
import { engine, loadCases } from "./case-loader.mjs";
import { checkGeometry, checkPlan, createChecks } from "./geometry-oracles.mjs";

function parseArgs(argv) {
  const options = {
    tag: "geometry-smoke",
    quality: "test",
    deep: false,
    all: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--tag") options.tag = argv[++index];
    else if (arg === "--case") options.caseId = argv[++index];
    else if (arg === "--quality") options.quality = argv[++index];
    else if (arg === "--deep") options.deep = true;
    else if (arg === "--all") options.all = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!["test", "display", "export"].includes(options.quality)) {
    throw new Error(`unsupported quality: ${options.quality}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node node/exact-geometry-gate.mjs [options]

  --tag NAME       Select canonical cases carrying NAME (default: geometry-smoke)
  --case ID        Select one canonical case
  --all            Mesh every valid canonical case
  --quality LEVEL  test, display, or export (default: test)
  --deep           Include self-intersection detection
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

let cases = loadCases().filter((testCase) => testCase.expected?.status === "valid");
if (options.caseId) cases = cases.filter((testCase) => testCase.id === options.caseId);
else if (!options.all) cases = cases.filter((testCase) => (testCase.tags || []).includes(options.tag));
if (!cases.length) throw new Error("no geometry cases selected");

const outcomes = [];
for (const testCase of cases) {
  const checks = createChecks(testCase.id);
  const started = Date.now();
  let result;
  let details = null;
  try {
    result = engine.solve(testCase.state);
    checks.check(!result.infeasible, `solver refused geometry case: ${(result.ev.rows || []).filter((row) => row.st === "fail").map((row) => row.name).join(", ")}`);
    checkPlan(engine, result.S, result, testCase, checks);
    if (!result.infeasible) {
      const geometry = engine.twoWayGeometry(result.S, options.quality);
      details = checkGeometry(engine, result.S, geometry, testCase, checks, options);
    }
  } catch (error) {
    checks.check(false, `exception: ${error?.stack || error}`);
  }
  outcomes.push({
    id: testCase.id,
    title: testCase.title,
    elapsedMs: Date.now() - started,
    checks,
    details
  });
  console.log(`${checks.errors.length ? "FAIL" : "PASS"} ${testCase.id} · ${Date.now() - started} ms · ${details?.triangles || 0} triangles · ${checks.count} checks`);
}

const errors = outcomes.flatMap((outcome) => outcome.checks.errors);
const warnings = outcomes.flatMap((outcome) => outcome.checks.warnings);
console.log(JSON.stringify({
  cases: outcomes.length,
  quality: options.quality,
  deep: options.deep,
  triangles: outcomes.reduce((sum, outcome) => sum + (outcome.details?.triangles || 0), 0),
  checks: outcomes.reduce((sum, outcome) => sum + outcome.checks.count, 0),
  warnings: warnings.length,
  errors: errors.length,
  elapsedMs: outcomes.reduce((sum, outcome) => sum + outcome.elapsedMs, 0)
}, null, 2));

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("EXACT GEOMETRY PASS — raw components retained, manifold audited, tap connectivity checked, STL serialized");
