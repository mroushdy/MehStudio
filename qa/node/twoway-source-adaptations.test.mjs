import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const engine = require(path.join(root, "engine.js"));
const references = JSON.parse(
  fs.readFileSync(path.join(root, "reference/known-builds.json"), "utf8"),
);
const shell = fs.readFileSync(path.join(root, "shell.html"), "utf8");

function sourceBuild(key) {
  const record = engine.BUILDS["2way"].find(entry => entry.key === key);
  assert.ok(record, `missing two-way source adaptation ${key}`);
  return record;
}

test("SynTripP preserves its source complement while calculated geometry solves", () => {
  const record = sourceBuild("syntripp");
  assert.equal(record.s.twoArch, "radial");
  assert.equal(record.s.wPre, "cl10");
  assert.equal(record.s.nW, 2);
  assert.equal(record.s.npW, 2);
  assert.equal(record.s.cdSel, "cdx143050");
  assert.match(record.name, /calculated radial-mount adaptation/i);
  assert.match(record.source, /not SynTripP CAD/i);

  const solved = engine.solve(structuredClone(record.s));
  assert.equal(solved.infeasible, false);
  assert.equal(solved.ev.fails, 0);
  assert.equal(solved.ev.plan.drivers.length, 2);
  assert.equal(solved.ev.plan.allPorts.length, 4);
});

test("Solana preserves the guide complement without claiming imported source cells", () => {
  const record = sourceBuild("solana");
  assert.equal(record.s.twoArch, "radial");
  assert.equal(record.s.wPre, "w65");
  assert.equal(record.s.nW, 4);
  assert.equal(record.s.npW, 1);
  assert.equal(record.s.cdSel, "dh450");
  assert.equal(record.s.sectionFamily, "roundedRectangle");
  assert.match(record.name, /calculated radial-cell adaptation/i);
  assert.match(record.source, /does not import those solids/i);

  const solved = engine.solve(structuredClone(record.s));
  assert.equal(solved.infeasible, false);
  assert.equal(solved.ev.fails, 0);
  assert.equal(solved.ev.plan.drivers.length, 4);
  assert.equal(solved.ev.plan.allPorts.length, 4);
});

test("source CDs are selectable and the unmeasured DH350 material stays reference-only", () => {
  assert.match(shell, /option value="cdx143050"/);
  assert.match(shell, /option value="dh450"/);
  assert.match(shell, /cdx143050:\{td:1\.4,floor:1000,dep:2\.205/);
  assert.match(shell, /dh450:\{td:1\.0,floor:1000,dep:1\.89/);

  const dh350 = references.entries.find(entry => entry.id === "local-dh350-meh-half");
  assert.ok(dh350);
  assert.equal(dh350.evidence, "local-stl-and-dsp-project-only");
  assert.equal(dh350.acousticValidation, "not claimed");
  assert.equal(
    engine.BUILDS["2way"].some(record => /dh350/i.test(record.key)),
    false,
  );
});
