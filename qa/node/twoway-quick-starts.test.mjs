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

function documentedBase(overrides = {}) {
  const build = engine.BUILDS["2way"].find(({ key }) => key === "hinson10");
  assert.ok(build, "Hinson two-way package is missing");
  return {
    ...JSON.parse(JSON.stringify(build.s)),
    _smart2waySchema: 3,
    ...overrides,
  };
}

const expected = {
  "compact-2x5-panel": {
    family: "panel",
    nW: 2,
    npW: 1,
    wPre: "w5",
    mouthW: 24,
    passages: 2,
  },
  "high-output-4x10-panel": {
    family: "panel",
    nW: 4,
    npW: 2,
    wPre: "hpl10",
    mouthW: 44,
    passages: 8,
  },
  "shallow-radial-4x5": {
    family: "radial",
    nW: 4,
    npW: 1,
    wPre: "w5",
    mouthW: 36,
    passages: 4,
  },
};

test("calculated quick starts stay separate from documented build evidence", () => {
  assert.deepEqual(
    engine.TWO_STARTS.map(({ key }) => key),
    Object.keys(expected),
  );
  const documentedKeys = new Set(
    engine.BUILDS["2way"].map(({ key }) => key),
  );
  for (const start of engine.TWO_STARTS) {
    assert.equal(start.evidence, "calculated");
    assert.equal(documentedKeys.has(start.key), false);
    assert.equal(start.s.twoDesign, `arch:${start.family}`);
    assert.equal(start.s.tapBasis, "model");
    assert.equal(start.s.driverCellConstruction, "integrated");
  }
});

test("each quick start proves and returns materially different calculated geometry", () => {
  const input = documentedBase({
    tapBasis: "manual",
    tapStationW: 999,
    tapAreaW: 1,
    frameW: "round",
    boltNW: 16,
    bcdW: 500,
    boltDW: 20,
    gasketW: 12,
  });
  const frozenInput = JSON.parse(JSON.stringify(input));
  const baselineHash = engine.twoWayStateHash(documentedBase());

  for (const [key, want] of Object.entries(expected)) {
    const result = engine.applyTwoWayStart(input, key);
    assert.equal(result.ok, true, `${key}: ${result.message || result.code}`);
    assert.equal(result.code, "TWO_START_READY");
    assert.deepEqual(input, frozenInput, `${key} mutated the caller`);
    assert.equal(result.solved.infeasible, false);
    assert.equal(result.solved.ev.fails, 0);
    assert.equal(result.S2.twoArch, want.family);
    assert.equal(result.S2.twoFamily, want.family);
    assert.equal(result.S2.twoDesign, `arch:${want.family}`);
    assert.equal(result.S2.tapBasis, "model");
    assert.equal(result.S2.driverCellConstruction, "integrated");
    assert.equal(result.S2.nW, want.nW);
    assert.equal(result.S2.npW, want.npW);
    assert.equal(result.S2.wPre, want.wPre);
    assert.equal(result.S2.mouthW, want.mouthW);
    assert.equal(result.solved.ev.plan.drivers.length, want.nW);
    assert.equal(result.solved.ev.plan.allPorts.length, want.passages);
    assert.equal(
      result.preflight.stateHash,
      engine.twoWayStateHash(result.S2),
    );
    assert.notEqual(result.preflight.stateHash, baselineHash);
    assert.equal("tapStationW" in result.S2, false);
    assert.equal("tapAreaW" in result.S2, false);
    assert.equal("bcdW" in result.S2, false);
  }
});

test("unknown and family-incompatible quick starts are atomic refusals", () => {
  const input = documentedBase();
  const before = JSON.parse(JSON.stringify(input));

  const unknown = engine.applyTwoWayStart(input, "not-a-start");
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, "TWO_START_UNKNOWN");
  assert.deepEqual(unknown.S2, before);
  assert.deepEqual(input, before);

  const incompatible = engine.applyTwoWayStart(
    input,
    "compact-2x5-panel",
    { requestedCount: 3 },
  );
  assert.equal(incompatible.ok, false);
  assert.equal(incompatible.code, "TWO_START_COUNT_INCOMPATIBLE");
  assert.deepEqual(incompatible.S2, before);
  assert.deepEqual(input, before);
});

test("two-way UI labels quick starts as calculated and commits only result.S2", () => {
  assert.match(shell, /id="twoQuickStarts"/);
  assert.match(shell, /solver-checked, not documented builds/i);
  assert.match(shell, /id="twoQuickStartGrid"/);
  assert.match(shell, /function applyTwoQuickStart\(key\)/);
  assert.match(shell, /MEH2\.applyTwoWayStart\(S,key\)/);
  assert.match(
    shell,
    /if\(!result\.ok\)[\s\S]*LIVE DESIGN WAS NOT CHANGED/,
  );
  assert.match(
    shell,
    /Object\.assign\(S,result\.S2\)/,
  );
});
