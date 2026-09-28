import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

function hinsonState(overrides = {}) {
  const build = engine.BUILDS["2way"].find(({ key }) => key === "hinson10");
  assert.ok(build, "Hinson two-way package is missing");
  return { ...build.s, _smart2waySchema: 3, ...overrides };
}

function inputTag(id) {
  const match = shell.match(new RegExp(`<input\\b[^>]*\\bid=["']${id}["'][^>]*>`));
  assert.ok(match, `${id} input is missing`);
  return match[0];
}

test("compact advanced UI exposes only core-owned driver mount inputs", () => {
  assert.match(
    shell,
    /<details class=["']advanced["'] id=["']twoMountRecordCtl["']>/,
  );
  assert.match(
    shell,
    /<summary id=["']twoMountRecordSummary["']>DRIVER MOUNT · CALCULATING…<\/summary>/,
  );
  for (const id of ["mountFrameDiameterMm", "mountActiveDiameterMm"]) {
    const tag = inputTag(id);
    assert.match(tag, /\breadonly\b/);
    assert.match(tag, /\baria-readonly=["']true["']/);
  }
  const bounds = {
    boltNW: { min: "4", max: "16", step: "1" },
    bcdW: { min: "20", max: "600", step: "0.5" },
    boltDW: { min: "2", max: "20", step: "0.1" },
    gasketW: { min: "0.5", max: "12", step: "0.1" },
  };
  for (const [id, expected] of Object.entries(bounds)) {
    const tag = inputTag(id);
    for (const [attribute, value] of Object.entries(expected)) {
      assert.match(
        tag,
        new RegExp(`\\b${attribute}=["']${value.replace(".", "\\.")}["']`),
        `${id} ${attribute} bound drifted`,
      );
    }
  }
  assert.doesNotMatch(shell, /id=["']cutoutW["']/);
  assert.match(shell, /function paintDriverMountRecordUI\(P=null\)/);
  assert.match(shell, /Editing this record creates calculated geometry/);
});

test("mount edits become calculated, persist through repair, and key the mesh", () => {
  const base = hinsonState();
  const baselinePlan = engine.twoWayPlan(base);
  assert.equal(baselinePlan.frame.boltN, 8);
  assert.equal(baselinePlan.frame.bcd * 1000, 244);
  assert.equal(baselinePlan.frame.boltD * 1000, 6.5);
  assert.equal(baselinePlan.frame.gasketT * 1000, 1.6);

  const cases = [
    ["boltNW", 6, (frame) => frame.boltN],
    ["bcdW", 238, (frame) => frame.bcd * 1000],
    ["boltDW", 9.5, (frame) => frame.boltD * 1000],
    ["gasketW", 4, (frame) => frame.gasketT * 1000],
  ];
  for (const [key, value, frameValue] of cases) {
    const adapted = engine.smartAdapt2way(
      hinsonState({ [key]: value }),
      key,
      {},
    );
    assert.equal(adapted.S2.twoDesign, "arch:panel", `${key} stayed documented`);
    assert.equal(adapted.S2.tapBasis, "model", `${key} kept published taps`);
    assert.equal(adapted.S2[key], value, `${key} was overwritten during adapt`);
    assert.ok(
      adapted.ledger.some(({ knob }) => knob === "twoDesign"),
      `${key} omitted the documented→calculated ledger entry`,
    );

    const solved = engine.solve(adapted.S2);
    assert.equal(solved.infeasible, false, `${key} produced an infeasible plan`);
    assert.equal(solved.S[key], value, `${key} was overwritten by repair`);
    assert.equal(frameValue(solved.ev.plan.frame), value, `${key} missed frameSpec`);
    assert.notEqual(
      engine.twoWayStateHash(adapted.S2),
      engine.twoWayStateHash(base),
      `${key} omitted the canonical state hash`,
    );
    assert.notEqual(
      engine.twoWayMeshKey(adapted.S2, "manufacturing-preview"),
      engine.twoWayMeshKey(base, "manufacturing-preview"),
      `${key} omitted the exact mesh key`,
    );
  }
});

test("driver selection refreshes mount metadata but later mount edits do not", () => {
  const selected = engine.smartAdapt2way(
    hinsonState({
      boltNW: 4,
      bcdW: 200,
      boltDW: 5,
      gasketW: 2,
    }),
    "wPre",
    {},
  ).S2;
  assert.equal(selected.boltNW, 8);
  assert.equal(selected.bcdW, 244);
  assert.equal(selected.boltDW, 6.5);
  assert.equal(selected.gasketW, 1.6);
  assert.equal("cutoutW" in selected, false);

  const edited = engine.smartAdapt2way(
    { ...selected, bcdW: 238 },
    "bcdW",
    {},
  ).S2;
  assert.equal(edited.bcdW, 238);
  assert.equal(engine.solve(edited).S.bcdW, 238);
});
