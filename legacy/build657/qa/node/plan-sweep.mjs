#!/usr/bin/env node
import crypto from "node:crypto";
import {
  engine,
  finiteTree,
  loadCases,
  planSignature,
  readJson,
  stableValue
} from "./case-loader.mjs";
import { checkPlan, createChecks } from "./geometry-oracles.mjs";

function parseArgs(argv) {
  const options = {
    pairwise: true,
    canonical: true,
    refusals: true
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--no-pairwise") options.pairwise = false;
    else if (arg === "--pairwise-only") {
      options.pairwise = true;
      options.canonical = false;
      options.refusals = false;
    } else if (arg === "--canonical-only") {
      options.pairwise = false;
      options.canonical = true;
      options.refusals = true;
    } else if (arg === "--case") options.caseId = argv[++index];
    else if (arg === "--diagnose-idempotence") options.diagnoseIdempotence = true;
    else if (arg === "--diagnose-geometry") options.diagnoseGeometry = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function changedFields(left, right) {
  const fields = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  return [...fields].sort().flatMap((field) => {
    const before = stableValue(left?.[field]);
    const after = stableValue(right?.[field]);
    return JSON.stringify(before) === JSON.stringify(after)
      ? []
      : [{ field, before, after }];
  });
}

/*
 * These are solver-emitted diagnostics, not settled input knobs.  In
 * particular, mountEnvelopeMinMouthW records the mouth at which the current
 * adaptation pass first established bearing-envelope containment.  A later
 * exact-retention repair may grow mouthW without changing the acoustic or
 * manufacturing plan, so this explanatory datum is allowed to be recomputed
 * when the already-settled state is solved again.
 */
function idempotenceState(state) {
  const comparable = { ...(state || {}) };
  delete comparable.mountEnvelopeMinMouthW;
  return comparable;
}

function mergeIntent(...intents) {
  return Object.assign({}, ...intents.filter(Boolean));
}

function normalizedText(value) {
  return String(value || "").toLowerCase();
}

function checkFixtureOracles(testCase, checks) {
  const hardPackaging = testCase.expected?.hardPackaging;
  if (!hardPackaging) return;

  checks.check(testCase.expected?.refusalClass === "hard-packaging", "hard packaging oracle is missing its refusal class");
  checks.check(String(testCase.expected?.reason || "").trim().length > 0, "hard packaging refusal has no explicit reason");
  checks.check(hardPackaging.layout === "radial-ring", `unsupported hard packaging oracle: ${hardPackaging.layout}`);
  checks.check(testCase.state.nW === hardPackaging.driverCount, "hard packaging driver count differs from the requested state");
  checks.check(
    Math.abs(testCase.state.odW * 10 - hardPackaging.driverOuterDiameterMm) <= 0.01,
    "hard packaging frame diameter differs from the requested state"
  );
  checks.check(
    Math.abs(testCase.state.mouthCap * 25.4 - hardPackaging.availableEnvelopeDiameterMm) <= 0.01,
    "hard packaging envelope differs from the requested mouth cap"
  );

  const count = hardPackaging.driverCount;
  const frame = hardPackaging.driverOuterDiameterMm;
  const clearance = hardPackaging.minimumFrameClearanceMm;
  const pitchRadius = (frame + clearance) / (2 * Math.sin(Math.PI / count));
  const requiredEnvelopeDiameter = 2 * (pitchRadius + frame / 2);
  checks.check(
    hardPackaging.availableEnvelopeDiameterMm + 1e-9 < requiredEnvelopeDiameter,
    `hard packaging fixture is not impossible under its radial-ring lower bound (${requiredEnvelopeDiameter.toFixed(1)} mm required)`
  );
}

function evaluate(testCase) {
  const checks = createChecks(testCase.id);
  checkFixtureOracles(testCase, checks);
  let result;
  try {
    result = engine.solve(testCase.state);
  } catch (error) {
    checks.check(false, `exception: ${error?.stack || error}`);
    return { testCase, checks, result: null, status: "exception" };
  }

  const failRows = (result.ev?.rows || []).filter((row) => row.st === "fail");
  const valid = !result.infeasible && failRows.length === 0;
  const expectedStatus = testCase.expected?.status || "either";

  if (expectedStatus === "valid") checks.check(valid, `expected a valid design, got refusal: ${failRows.map((row) => row.name).join(", ")}`);
  if (expectedStatus === "refused") {
    const reason = String(testCase.expected?.reason || "").trim();
    checks.check(!valid, `expected an explicit refusal, but the state solved${reason ? ` — ${reason}` : ""}`);
    checks.check(failRows.length > 0, "refusal has no named failing law");
    const lawAny = testCase.expected?.lawAny || [];
    if (lawAny.length) {
      const haystack = failRows.map((row) => `${row.name} ${row.why || ""}`).join(" ").toLowerCase();
      checks.check(lawAny.some((law) => haystack.includes(normalizedText(law))), `refusal did not match any expected law: ${lawAny.join(" | ")}`);
    }
  }
  if (expectedStatus === "either" && !valid) checks.check(failRows.every((row) => String(row.name || "").trim().length > 0), "pairwise refusal contains an unnamed law");

  if (result.ev?.plan) checkPlan(engine, result.S, result, testCase, checks, { allowInvalid: !valid });
  else checks.check(false, "solver returned no plan");

  const intent = testCase.expected?.intent || {};
  for (const [key, requested] of Object.entries(intent)) {
    checks.check(result.S[key] === requested, `intent ${key} changed from ${JSON.stringify(requested)} to ${JSON.stringify(result.S[key])}`);
  }
  const expectedMountRing = result.S.driverCellConstruction === "cartridge"
    ? "ring"
    : "integrated";
  checks.check(
    result.S.mountRing === expectedMountRing,
    `derived mountRing ${JSON.stringify(result.S.mountRing)} disagrees with authoritative driverCellConstruction ${JSON.stringify(result.S.driverCellConstruction)}`
  );

  const second = engine.solve(result.S);
  if (options.diagnoseIdempotence) {
    const stateChanges = changedFields(
      idempotenceState(result.S),
      idempotenceState(second.S)
    );
    const planChanges = changedFields(planSignature(result), planSignature(second));
    if (stateChanges.length || planChanges.length) {
      console.error(`DIAG ${testCase.id} ${testCase.title}`);
      console.error(`DIAG ${testCase.id} input ${JSON.stringify(stableValue(testCase.state))}`);
      console.error(`DIAG ${testCase.id} pass1-ledger ${JSON.stringify(stableValue(result.ledger || []))}`);
      console.error(`DIAG ${testCase.id} pass2-ledger ${JSON.stringify(stableValue(second.ledger || []))}`);
      console.error(`DIAG ${testCase.id} state ${JSON.stringify(stateChanges)}`);
      console.error(`DIAG ${testCase.id} plan-fields ${JSON.stringify(planChanges.map((change) => change.field))}`);
      console.error(`DIAG ${testCase.id} plan-digests ${digest(planSignature(result))} ${digest(planSignature(second))}`);
    }
  }
  checks.check(
    digest(planSignature(result)) === digest(planSignature(second)),
    "same solved state produced a different normalized plan"
  );
  checks.check(
    digest(idempotenceState(result.S)) === digest(idempotenceState(second.S)),
    "adaptation is not idempotent after the first settled solve"
  );

  const ledgerFields = new Set((result.ledger || []).map((entry) => entry.knob));
  const adaptiveFields = [
    "mouthW",
    "twoXO",
    "tapCRW",
    "adapterReach",
    "twoDesign",
    "tapBasis",
    "nW",
    "twoArch",
    "twoFamily",
    "npW",
    "shW",
    "wPre",
    "style"
  ];
  for (const field of adaptiveFields) {
    if (testCase.state[field] !== undefined && result.S[field] !== testCase.state[field]) {
      checks.check(ledgerFields.has(field), `${field} changed without an adaptation-ledger entry`);
    }
  }

  return {
    testCase,
    checks,
    result,
    status: valid ? "valid" : "refused",
    failRows
  };
}

function pairKey(factorA, valueA, factorB, valueB) {
  return factorA < factorB
    ? `${factorA}\u0000${valueA}\u0000${factorB}\u0000${valueB}`
    : `${factorB}\u0000${valueB}\u0000${factorA}\u0000${valueA}`;
}

function seededRank(seed, ...parts) {
  return crypto.createHash("sha256").update([seed, ...parts].join("|")).digest().readUInt32LE(0);
}

function pairwiseRows(document) {
  const factors = document.factors;
  const uncovered = new Map();
  for (let a = 0; a < factors.length; a += 1) {
    for (let b = a + 1; b < factors.length; b += 1) {
      for (const av of factors[a].values) {
        for (const bv of factors[b].values) {
          const key = pairKey(factors[a].key, av.id, factors[b].key, bv.id);
          uncovered.set(key, {
            a: factors[a].key,
            av: av.id,
            b: factors[b].key,
            bv: bv.id
          });
        }
      }
    }
  }
  const totalPairs = uncovered.size;
  const rows = [];
  while (uncovered.size) {
    const target = [...uncovered.values()].sort((left, right) =>
      seededRank(document.seed, left.a, left.av, left.b, left.bv)
      - seededRank(document.seed, right.a, right.av, right.b, right.bv)
    )[0];
    const selected = new Map([[target.a, target.av], [target.b, target.bv]]);
    for (const factor of factors) {
      if (selected.has(factor.key)) continue;
      const ranked = factor.values.map((value) => {
        let score = 0;
        for (const [otherKey, otherValue] of selected) {
          if (uncovered.has(pairKey(factor.key, value.id, otherKey, otherValue))) score += 1;
        }
        return {
          value,
          score,
          rank: seededRank(document.seed, rows.length, factor.key, value.id)
        };
      }).sort((left, right) => right.score - left.score || left.rank - right.rank);
      selected.set(factor.key, ranked[0].value.id);
    }
    const row = {};
    for (const factor of factors) row[factor.key] = factor.values.find((value) => value.id === selected.get(factor.key));
    rows.push(row);
    for (let a = 0; a < factors.length; a += 1) {
      for (let b = a + 1; b < factors.length; b += 1) {
        uncovered.delete(pairKey(
          factors[a].key,
          row[factors[a].key].id,
          factors[b].key,
          row[factors[b].key].id
        ));
      }
    }
  }
  return { rows, totalPairs };
}

function pairwiseCases() {
  const document = readJson("cases/factors.json");
  const generated = pairwiseRows(document);
  return {
    ...generated,
    cases: generated.rows.map((row, index) => {
      const choices = document.factors.map((factor) => row[factor.key]);
      const state = Object.assign({}, document.baseState, ...choices.map((choice) => choice.patch));
      const intent = {};
      for (const field of document.intentFields || []) {
        if (state[field] !== undefined) intent[field] = state[field];
      }
      return {
        id: `PW-${String(index + 1).padStart(3, "0")}`,
        title: choices.map((choice) => choice.id).join(" · "),
        tags: ["plan", "pairwise"],
        state,
        expected: {
          status: "either",
          intent: mergeIntent(intent)
        }
      };
    })
  };
}

function printHelp() {
  console.log(`Usage: node node/plan-sweep.mjs [options]

  --canonical-only  Run canonical valid and expected-refusal cases only
  --pairwise-only   Run generated pairwise cases only
  --no-pairwise     Skip generated pairwise coverage
  --case ID         Run one named case
  --diagnose-idempotence
                    Print pass-to-pass state and normalized-plan differences
  --diagnose-geometry
                    Print the settled state and key plan-law measurements
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

let cases = loadCases().filter((testCase) =>
  (testCase.documentName === "canonical" && options.canonical)
  || (testCase.documentName === "expected-refusals" && options.refusals)
);
let pairwise = null;
if (options.pairwise && (!options.caseId || options.caseId.startsWith("PW-"))) {
  pairwise = pairwiseCases();
  cases.push(...pairwise.cases);
}
if (options.caseId) cases = cases.filter((testCase) => testCase.id === options.caseId);
if (!cases.length) throw new Error("no cases selected");

const outcomes = cases.map(evaluate);
if (options.diagnoseGeometry) {
  for (const outcome of outcomes) {
    const plan = outcome.result?.ev?.plan;
    console.error(`GEOM ${outcome.testCase.id} ${outcome.testCase.title}`);
    console.error(`GEOM ${outcome.testCase.id} input ${JSON.stringify(stableValue(outcome.testCase.state))}`);
    console.error(`GEOM ${outcome.testCase.id} settled ${JSON.stringify(stableValue(outcome.result?.S || {}))}`);
    console.error(`GEOM ${outcome.testCase.id} ledger ${JSON.stringify(stableValue(outcome.result?.ledger || []))}`);
    console.error(`GEOM ${outcome.testCase.id} failures ${JSON.stringify(
      stableValue(outcome.failRows || [])
    )}`);
    const measurements = plan ? {
      family: plan.family,
      station: plan.station,
      cr: plan.cr,
      tapFraction: plan.tapFraction,
      localArea: plan.localArea,
      totalArea: plan.totalArea,
      maxPortReach: plan.maxPortReach,
      activeR: plan.frame?.activeR,
      minMountSide: plan.minMountSide,
      adapterReach: plan.adapterReach,
      mouthW: outcome.result.S?.mouthW,
      twoXO: outcome.result.S?.twoXO,
      tapCRW: outcome.result.S?.tapCRW
    } : {};
    console.error(`GEOM ${outcome.testCase.id} plan ${JSON.stringify(stableValue(measurements))}`);
    console.error(`GEOM ${outcome.testCase.id} nonfinite ${JSON.stringify(
      plan ? finiteTree(plan) : []
    )}`);
  }
}
const errors = outcomes.flatMap((outcome) => outcome.checks.errors);
const warnings = outcomes.flatMap((outcome) => outcome.checks.warnings);
const counts = outcomes.reduce((summary, outcome) => {
  summary[outcome.status] = (summary[outcome.status] || 0) + 1;
  summary.checks += outcome.checks.count;
  return summary;
}, { valid: 0, refused: 0, exception: 0, checks: 0 });

console.log(JSON.stringify({
  cases: outcomes.length,
  canonical: outcomes.filter((outcome) => !outcome.testCase.id.startsWith("PW-")).length,
  pairwiseRows: outcomes.filter((outcome) => outcome.testCase.id.startsWith("PW-")).length,
  pairwisePairs: pairwise?.totalPairs || 0,
  ...counts,
  warnings: warnings.length,
  errors: errors.length
}, null, 2));

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length) {
  for (const error of errors.slice(0, 200)) console.error(`FAIL ${error}`);
  if (errors.length > 200) console.error(`FAIL ... ${errors.length - 200} additional errors`);
  process.exit(1);
}
console.log(`PLAN SWEEP PASS — deterministic plans, stable refusals, preserved intent${pairwise ? ", and pairwise coverage" : ""}`);
