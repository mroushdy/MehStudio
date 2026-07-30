import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

const start = shell.indexOf("const COVERAGE_ANGLE_MIN");
const end = shell.indexOf("function paintCoverageUI", start);
assert.ok(start >= 0 && end > start);
const controls = new Function(
  `${shell.slice(start, end)}
   return {coverageAnglesFromControls,coverageControlsFromAngles};`,
)();

const near = (a, b, tolerance = 1e-10) =>
  Math.abs(a - b) <= tolerance;

test("overall coverage and log-ratio round-trip every prior H/V state", () => {
  for (const [horizontal, vertical] of [
    [90, 60],
    [120, 30],
    [30, 120],
    [75, 75],
    [40, 30],
  ]) {
    const state = controls.coverageControlsFromAngles(horizontal, vertical);
    assert.ok(near(state.h, horizontal));
    assert.ok(near(state.v, vertical));
    assert.ok(near(state.overall, Math.sqrt(horizontal * vertical)));
    assert.ok(near(state.logRatio, Math.log(horizontal / vertical)));
  }
});

test("bias is reciprocal around 1:1 and preserves geometric mean", () => {
  for (const [coverage, bias] of [
    [60, 0.5],
    [75, 0.35],
    [45, 0.2],
  ]) {
    const positive = controls.coverageAnglesFromControls(coverage, bias);
    const negative = controls.coverageAnglesFromControls(coverage, -bias);
    assert.ok(near(positive.h, negative.v));
    assert.ok(near(positive.v, negative.h));
    assert.ok(near(positive.h * positive.v, coverage ** 2));
    assert.ok(positive.h >= 30 && positive.h <= 120);
    assert.ok(positive.v >= 30 && positive.v <= 120);
  }
});

test("there is exactly one editable coverage path", () => {
  assert.match(shell, /type="range" id="coverageOverall"/);
  assert.match(shell, /type="range" id="coverageBias"/);
  assert.match(shell, /id="coverageLiveReadout"[^>]*>90° H × 60° V</);
  assert.match(shell, /id="profileCoverageReadout" type="text" disabled/);
  assert.doesNotMatch(shell, /id="(?:profileCoverageH|profileCoverageV|covH|covV)"/);
  assert.match(shell, /S\.covH=solution\.h;S\.covV=solution\.v/);
  assert.match(shell, /Math\.sqrt\(h\*v\),Math\.log\(h\/v\)/);
  assert.match(shell, /h:C\*root,v:C\/root/);
});

test("renderer exposes no duplicate editable horizontal or vertical coverage controls", () => {
  const coverageControls = [
    ...shell.matchAll(
      /<(?:input|select)\b[^>]*(?:id|name|data-key)="[^"]*(?:coverage|cov[hv])[^"]*"[^>]*>/gi,
    ),
  ].map((match) => match[0]);
  const editable = coverageControls.filter((tag) => !/\bdisabled\b/i.test(tag));
  const ids = editable.map((tag) =>
    /\bid="([^"]+)"/i.exec(tag)?.[1] ?? "(missing id)");

  assert.deepEqual(ids.sort(), ["coverageBias", "coverageOverall"]);
  assert.doesNotMatch(
    shell,
    /bind\(\s*['"]cov[HV]['"]/,
    "canonical covH/covV state must not gain a second direct edit binding",
  );
  assert.doesNotMatch(
    shell,
    /<(?:input|select)\b[^>]*(?:id|name|data-key)="[^"]*(?:profileCoverage[HV]|coverage[HV]|cov[HV])[^"]*"[^>]*(?<!disabled)>/i,
    "a duplicate editable H/V coverage widget is present",
  );
});
