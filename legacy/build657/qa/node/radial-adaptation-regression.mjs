#!/usr/bin/env node
import { engine, loadCases, stableValue } from "./case-loader.mjs";
import { createChecks } from "./geometry-oracles.mjs";

const checks = createChecks("radial-adaptation");
const radialBase = loadCases().find((testCase) => testCase.id === "R06")?.state;
if (!radialBase) throw new Error("canonical R06 radial fixture is missing");

const scenarios = [
  {
    id: "count-6-compact",
    key: "nW",
    patch: {
      nW: 6,
      mouthW: 42,
      adapterReach: 185,
      adapterReachMode: "auto"
    }
  },
  {
    id: "size-8in-six-up",
    key: "odW",
    patch: {
      nW: 6,
      mouthW: 42,
      adapterReach: 185,
      adapterReachMode: "auto",
      wPre: "w8",
      odW: 22.5,
      dpW: 9,
      sdW: 220,
      vtcW: 80,
      xmW: 7
    }
  }
];

function failedRows(evaluation) {
  return (evaluation?.rows || []).filter((row) => row.st === "fail");
}

function checkMonotonicLedger(seed, adapted, scenario) {
  for (const knob of ["mouthW", "adapterReach"]) {
    const values = [Number(seed[knob])];
    for (const entry of adapted.ledger || []) {
      if (entry.knob === knob && Number.isFinite(Number(entry.to))) {
        values.push(Number(entry.to));
      }
    }
    const deltas = values
      .slice(1)
      .map((value, index) => value - values[index])
      .filter((delta) => Math.abs(delta) > 1e-9);
    const directions = new Set(deltas.map((delta) => Math.sign(delta)));
    checks.check(
      directions.size <= 1,
      `${scenario.id} reverses ${knob} during one Smart Adapt pass: ${values.join(" -> ")}`
    );
  }
}

function findMonotonicWitness(seed) {
  const startMouth = Math.ceil(Number(seed.mouthW));
  const mouthCap = Math.max(startMouth, Number(seed.mouthCap) || 64);
  const startReach = Math.ceil(Number(seed.adapterReach));
  const reachCap = Math.max(startReach, 260);
  for (let mouthW = startMouth; mouthW <= mouthCap; mouthW += 1) {
    for (let adapterReach = startReach; adapterReach <= reachCap; adapterReach += 5) {
      const candidate = {
        ...seed,
        mouthW,
        adapterReach,
        adapterReachMode: "manual"
      };
      const evaluation = engine.evaluate2way(candidate);
      if (failedRows(evaluation).length === 0) {
        return { mouthW, adapterReach, evaluation };
      }
    }
  }
  return null;
}

for (const scenario of scenarios) {
  const seed = { ...radialBase, ...scenario.patch };
  const witness = findMonotonicWitness(seed);
  checks.check(
    Boolean(witness),
    `${scenario.id} fixture has no legal monotonic mouth/reach witness and cannot test the intended regression`
  );

  const adapted = engine.smartAdapt2way(seed, scenario.key, {});
  checkMonotonicLedger(seed, adapted, scenario);

  const finalEvaluation = engine.evaluate2way(adapted.S2);
  checks.check(
    !witness || failedRows(finalEvaluation).length === 0,
    `${scenario.id} ends infeasible despite legal monotonic witness mouth=${witness?.mouthW} in, reach=${witness?.adapterReach} mm; failures: ${failedRows(finalEvaluation).map((row) => row.name).join(", ")}`
  );

  const repeated = engine.smartAdapt2way(adapted.S2, scenario.key, {});
  checks.check(
    JSON.stringify(stableValue(repeated.S2)) === JSON.stringify(stableValue(adapted.S2)),
    `${scenario.id} does not settle to a fixed state on a repeated Smart Adapt pass`
  );
}

/* The 3 × 5.25-inch chamber must remain within the requested-to-300 mm AUTO
   reach search and preserve both its complete chamber and mount envelope. */
{
  const seed = {
    ...radialBase,
    nW: 3,
    mouthW: 24,
    twoXO: 500,
    tapCRW: 6,
    adapterReach: 35,
    adapterReachMode: "auto"
  };
  const solved = engine.solve(seed);
  const plan = solved.ev.plan;
  checks.check(
    !solved.infeasible && failedRows(solved.ev).length === 0,
    `count-3-volume-chamber remains infeasible: ${failedRows(solved.ev).map((row) => row.name).join(", ")}`
  );
  checks.check(
    plan.adapterReach * 1000 >= Number(seed.adapterReach)
      && plan.adapterReach <= 0.30,
    `count-3-volume-chamber AUTO reach ${(plan.adapterReach * 1000).toFixed(3)} mm is outside the requested-to-300 mm search`
  );
  checks.check(
    plan.radialChamberClearance >= plan.radialChamberRequiredClearance
      && plan.radialChamberCoverage >= 1 - 1e-9
      && plan.mountEnvelopeComplete
      && plan.mountEnvelopeClearance >= plan.mountEnvelopeRequiredClearance
      && plan.mountEnvelopeCoverage >= 1 - 1e-9,
    "count-3-volume-chamber clipped its complete volume-derived chamber or mount envelope after AUTO reach repair"
  );
}

const manualReachSeed = {
  ...radialBase,
  nW: 8,
  adapterReach: 240,
  adapterReachMode: "manual"
};
const manualReachAdapted = engine.smartAdapt2way(manualReachSeed, "repair", {});
checks.check(
  manualReachAdapted.S2.adapterReach === manualReachSeed.adapterReach,
  `manual radial reach changed from ${manualReachSeed.adapterReach} to ${manualReachAdapted.S2.adapterReach}`
);
checks.check(
  manualReachAdapted.S2.nW === manualReachSeed.nW,
  `manual radial adaptation changed requested driver count from ${manualReachSeed.nW} to ${manualReachAdapted.S2.nW}`
);

if (checks.errors.length) {
  for (const error of checks.errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log(`RADIAL ADAPTATION PASS — ${scenarios.length} count/size scenarios · ${checks.count} assertions`);
