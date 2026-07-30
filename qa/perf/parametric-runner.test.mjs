import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, "parametric-runner.mjs");

function invoke(output, cache) {
  return spawnSync(process.execPath, [
    runner,
    "--stage", "solve",
    "--limit", "2",
    "--workers", "2",
    "--preview-axial", "8",
    "--preview-radial", "16",
    "--output", output,
    "--cache", cache,
    "--quiet",
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

test("parametric runner is deterministic, cacheable, and browser-free", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "meh-runner-test-"));
  const cache = path.join(root, "cache");
  const coldOutput = path.join(root, "cold");
  const warmOutput = path.join(root, "warm");

  const cold = invoke(coldOutput, cache);
  assert.equal(cold.status, 0, cold.stderr || cold.stdout);
  const coldManifest = JSON.parse(
    fs.readFileSync(path.join(coldOutput, "manifest.json"), "utf8"),
  );
  assert.equal(coldManifest.browserCreated, false);
  assert.equal(coldManifest.webglCreated, false);
  assert.equal(coldManifest.exactMeshCreated, false);
  assert.equal(coldManifest.manufacturingEvidence, false);
  assert.equal(coldManifest.summary.scenarios, 2);
  assert.equal(coldManifest.summary.computedStates, 2);
  assert.equal(coldManifest.summary.cacheHitScenarios, 0);
  assert.deepEqual(
    coldManifest.results.map((result) => result.id),
    ["panel-2-smooth-conical", "panel-2-smooth-osse"],
  );
  for (const result of coldManifest.results) {
    assert.equal(result.status, "valid");
    assert.equal(result.cacheHit, false);
    assert.ok(result.solvedStateHash.startsWith("b653-"));
    assert.ok(result.artifacts?.obj);
    const obj = fs.readFileSync(
      path.join(coldOutput, result.artifacts.obj),
      "utf8",
    );
    assert.match(obj, /^# MEH Studio browser-independent analytic preview/m);
    assert.match(obj, /^# manufacturing-evidence: false$/m);
    assert.match(obj, /^v /m);
    assert.match(obj, /^f /m);
  }

  const warm = invoke(warmOutput, cache);
  assert.equal(warm.status, 0, warm.stderr || warm.stdout);
  const warmManifest = JSON.parse(
    fs.readFileSync(path.join(warmOutput, "manifest.json"), "utf8"),
  );
  assert.equal(warmManifest.summary.computedStates, 0);
  assert.equal(warmManifest.summary.cacheHitScenarios, 2);
  assert.deepEqual(
    warmManifest.results.map((result) => result.solvedStateHash),
    coldManifest.results.map((result) => result.solvedStateHash),
  );
  assert.ok(warmManifest.results.every((result) => result.cacheHit === true));
});
