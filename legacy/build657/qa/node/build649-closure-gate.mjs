#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const ledgerPath = path.join(appRoot, "docs", "build649-closure-ledger.md");
const evidencePath = path.join(appRoot, "qa", "build649-evidence.json");
const ledger = fs.readFileSync(ledgerPath, "utf8");
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const allowOpen = process.argv.includes("--allow-open");

const required = [
  "B649-G01", "B649-G02", "B649-G03", "B649-G04", "B649-G05",
  "B649-G06", "B649-G07", "B649-G08", "B649-G09", "B649-G10",
  "B649-G11", "B649-G12",
  "B649-P01", "B649-P02", "B649-P03", "B649-P04", "B649-P05",
  "B649-P06", "B649-P07", "B649-P08", "B649-P09", "B649-P10",
  "B649-P11", "B649-P12", "B649-P13", "B649-P14", "B649-P15",
  "B649-U01", "B649-U02", "B649-U03", "B649-R01", "B649-R02",
];

const rows = new Map();
for (const line of ledger.split(/\r?\n/)) {
  const match = line.match(
    /^\|\s*(B649-[A-Z]\d{2})\s*\|.*\|\s*(PASS|IN PROGRESS|OPEN)\s*\|\s*$/,
  );
  if (!match) continue;
  assert.equal(rows.has(match[1]), false, `duplicate closure row ${match[1]}`);
  rows.set(match[1], match[2]);
}

for (const id of required) {
  assert.equal(rows.has(id), true, `closure ledger is missing ${id}`);
}
assert.equal(rows.size, required.length, "closure ledger has an unregistered row");
assert.equal(evidence.schema, "meh-build649-closure-evidence-v1");
assert.equal(evidence.build, 649);
assert.deepEqual(
  Object.keys(evidence.rows).sort(),
  [...required].sort(),
  "closure evidence IDs do not match the ledger",
);

for (const [id, status] of rows) {
  if (status !== "PASS") continue;
  const record = evidence.rows[id];
  for (const field of ["source", "numeric", "render"]) {
    assert.equal(
      Array.isArray(record[field]) && record[field].length > 0,
      true,
      `${id}=PASS is missing ${field} evidence`,
    );
  }
  for (const artifact of record.render) {
    assert.equal(
      typeof artifact, "string",
      `${id} render evidence must be a relative artifact path`,
    );
    const resolved = path.resolve(appRoot, artifact);
    assert.equal(
      resolved.startsWith(`${appRoot}${path.sep}`),
      true,
      `${id} render evidence escapes the application root`,
    );
    assert.equal(
      fs.existsSync(resolved),
      true,
      `${id} render evidence does not exist: ${artifact}`,
    );
  }
}

const pending = [...rows].filter(([, status]) => status !== "PASS");
if (!allowOpen) {
  assert.deepEqual(
    pending,
    [],
    `Build 649 closure is incomplete: ${pending
      .map(([id, status]) => `${id}=${status}`)
      .join(", ")}`,
  );
}

for (const marker of [
  "| topology | 2-way coax |",
  "| construction family | `arch:panel` |",
  "| woofer preset | `nw10` |",
  "| woofer count | 2 |",
  "| passages per woofer | 2 |",
  "| panel driver axis | horizontal |",
  "| profile law | Classic OS, plus conical and OS-SE comparisons |",
  "| mouth | 32 in |",
  "| coverage | 90 x 60 degrees |",
  "| internal LF-to-CD crossover | 430 Hz |",
]) {
  assert.match(ledger, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

console.log(
  `BUILD 649 CLOSURE ${pending.length ? "LEDGER" : "PASS"} — `
    + `${rows.size} tracked reports · ${rows.size - pending.length} closed`
    + `${pending.length ? ` · ${pending.length} pending` : ""}`,
);
