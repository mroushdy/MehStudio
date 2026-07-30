import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

const pairs = [
  ["osseThroatAngle", "0", "25", "0.5"],
  ["osseK", "0.5", "4", "0.1"],
  ["osseS", "0", "2", "0.05"],
  ["osseTerminationN", "2", "8", "0.1"],
  ["osseQ", "0.99", "0.999", "0.001"],
  ["rosseThroatAngle", "0", "20", "0.5"],
  ["rosseK", "0.5", "4", "0.1"],
  ["rosseApexRadiusFactor", "0.05", "1", "0.05"],
  ["rosseB", "0", "1", "0.05"],
  ["rosseM", "0.4", "0.98", "0.01"],
  ["rosseQ", "2", "8", "0.1"],
  ["profilePatternHz", "200", "2000", "25"],
];

test("continuous profile fields expose bounded range and exact-number partners", () => {
  for (const [id, min, max, step] of pairs) {
    assert.match(
      shell,
      new RegExp(
        `id="${id}Range" type="range" min="${min}" max="${max}" step="${step}"`,
      ),
      `${id} range bounds`,
    );
    assert.match(
      shell,
      new RegExp(
        `id="${id}" type="number" min="${min}" max="${max}" step="${step}"`,
      ),
      `${id} exact-number bounds`,
    );
    if (id === "profilePatternHz") {
      assert.match(shell, /wirePairedNumeric\('profilePatternHz'/);
    } else {
      assert.match(
        shell,
        new RegExp(`\\['${id}',${min},${max}\\]`),
        `${id} must be admitted by the shared paired-control registry`,
      );
    }
  }
  assert.match(shell, /wirePairedNumeric\(id,value=>\{/);
});

test("paired controls synchronize during input and rebuild only after debounced commit", () => {
  assert.match(shell, /const PAIRED_NUMERIC_COMMIT_DELAY_MS=90/);
  assert.match(shell, /elements\.range\.oninput=\(\)=>\{/);
  assert.match(shell, /elements\.number\.oninput=\(\)=>syncRange/);
  assert.match(shell, /clearTimeout\(pairedNumericTimers\.get\(id\)\)/);
  assert.match(shell, /pairedNumericTimers\.set\(id,setTimeout\(\(\)=>\{/);
  assert.match(shell, /elements\.range\.onchange=\(\)=>schedule/);
  assert.match(shell, /elements\.number\.onchange=\(\)=>schedule/);
});

test("categorical and derived fields remain non-slider controls", () => {
  for (const id of [
    "profileThroatShape",
    "profileSectionReadout",
    "profileMouthTreatment",
    "profileAspect",
    "profileCoverageReadout",
  ]) {
    assert.doesNotMatch(shell, new RegExp(`id="${id}Range"`));
  }
  assert.doesNotMatch(shell, /id="profileCoverage[HV]"/);
});
