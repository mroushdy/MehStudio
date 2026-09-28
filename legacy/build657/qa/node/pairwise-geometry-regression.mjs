#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetCases = [
  "PW-004",
  "PW-014",
  "PW-020",
  "PW-031",
  "PW-038",
  "PW-043",
  "PW-044",
  "PW-046",
  "PW-057",
  "PW-063"
];

const failures = [];
for (const caseId of targetCases) {
  const result = spawnSync(
    process.execPath,
    [path.join(qaRoot, "node/plan-sweep.mjs"), "--case", caseId],
    { cwd: qaRoot, encoding: "utf8" }
  );
  if (result.status !== 0) {
    failures.push({
      caseId,
      output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim()
    });
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${failure.caseId}`);
    if (failure.output) console.error(failure.output);
  }
  process.exit(1);
}

console.log(
  `PAIRWISE GEOMETRY REGRESSION PASS — ${targetCases.length} aperture, HF-area, and mounting-land cases`
);
