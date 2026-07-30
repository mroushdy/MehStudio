import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const pkg = require(path.join(appRoot, "threeway-package-solver.js"));

function baseInput() {
  return {
    horn: {
      id: "horn-t3",
      boundsM: { minM: [0, -0.35, -0.25], maxM: [0.45, 0.35, 0.25] },
      provenanceRefs: ["prov-horn"],
    },
    components: [
      {
        id: "mount-mid",
        role: "mount-host",
        ownerId: "station-mid",
        boundsM: {
          minM: [0.12, -0.12, 0.18],
          maxM: [0.2, 0.12, 0.28],
        },
        allowedOverlapIds: ["driver-mid"],
      },
      {
        id: "driver-mid",
        role: "driver-body",
        ownerId: "src-mid",
        boundsM: {
          minM: [0.08, -0.1, 0.23],
          maxM: [0.19, 0.1, 0.36],
        },
        allowedOverlapIds: ["mount-mid"],
      },
      {
        id: "service-mid",
        role: "service-envelope",
        ownerId: "src-mid",
        boundsM: {
          minM: [0.02, -0.11, 0.3],
          maxM: [0.12, 0.11, 0.42],
        },
        allowedOverlapIds: ["driver-mid"],
      },
    ],
    packageLimitM: { depthM: 0.5, widthM: 0.8, heightM: 0.9 },
  };
}

test("package solver reports mount-driven horn growth without moving anything", () => {
  const input = baseInput();
  const before = structuredClone(input);
  const result = pkg.solvePackageEnvelope(input);
  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.result.horn.containsMountHosts, false);
  assert.ok(Math.abs(
    result.result.horn.growthRequiredM.positiveM[2] - 0.03
  ) < 1e-12);
  assert.equal(result.result.automaticHornGrowth, false);
  assert.equal(result.result.automaticComponentMotion, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_HORN_GROWTH_REQUIRED"));
});

test("larger documented driver envelope grows the package monotonically", () => {
  const small = baseInput();
  const smallResult = pkg.solvePackageEnvelope(small);
  const large = baseInput();
  const driver = large.components.find(item => item.id === "driver-mid");
  driver.boundsM.minM[0] -= 0.05;
  driver.boundsM.maxM[2] += 0.08;
  const largeResult = pkg.solvePackageEnvelope(large);
  assert.ok(largeResult.result.package.dimensionsM.depth >=
    smallResult.result.package.dimensionsM.depth);
  assert.ok(largeResult.result.package.dimensionsM.height >=
    smallResult.result.package.dimensionsM.height);
});

test("tightening package bounds cannot make an infeasible package feasible", () => {
  const roomy = baseInput();
  const roomyResult = pkg.solvePackageEnvelope(roomy);
  assert.equal(roomyResult.result.package.withinLimit, true);

  const tight = baseInput();
  tight.packageLimitM = { depthM: 0.3, widthM: 0.4, heightM: 0.3 };
  const tightResult = pkg.solvePackageEnvelope(tight);
  assert.equal(tightResult.ok, false);
  assert.equal(tightResult.result.package.withinLimit, false);
  assert.ok(tightResult.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_OUTSIDE_PACKAGE"));
});

test("unapproved overlaps are collisions while declared assembly contact is allowed", () => {
  const input = baseInput();
  const extra = {
    id: "driver-low",
    role: "driver-body",
    boundsM: {
      minM: [0.1, -0.08, 0.24],
      maxM: [0.18, 0.08, 0.34],
    },
  };
  input.components.push(extra);
  const result = pkg.solvePackageEnvelope(input);
  assert.equal(result.ok, false);
  assert.ok(result.result.collisions.some(pair =>
    pair.leftId === "driver-mid" && pair.rightId === "driver-low"));
  assert.ok(!result.result.collisions.some(pair =>
    new Set([pair.leftId, pair.rightId]).has("mount-mid") &&
    new Set([pair.leftId, pair.rightId]).has("driver-mid")));
});

test("component permutation leaves canonical keyed result unchanged", () => {
  const a = baseInput();
  const b = baseInput();
  b.components.reverse();
  const left = pkg.solvePackageEnvelope(a);
  const right = pkg.solvePackageEnvelope(b);
  assert.equal(left.hashInput, right.hashInput);
});

test("invalid or duplicate envelopes fail closed without nonfinite output", () => {
  const invalid = baseInput();
  invalid.components[0].boundsM.maxM[0] =
    invalid.components[0].boundsM.minM[0];
  const bad = pkg.solvePackageEnvelope(invalid);
  assert.equal(bad.ok, false);
  assert.equal(bad.result, null);

  const duplicate = baseInput();
  duplicate.components.push(structuredClone(duplicate.components[0]));
  const duplicated = pkg.solvePackageEnvelope(duplicate);
  assert.equal(duplicated.ok, false);
  assert.doesNotMatch(JSON.stringify(duplicated), /NaN|Infinity/);
});

test("all results remain immutable and manufacturing false", () => {
  const result = pkg.solvePackageEnvelope(baseInput());
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.result.components));
  assert.equal(result.manufacturing, false);
  const preflight = pkg.manufacturingPreflight("package-stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
});

test("UMD browser path exposes the package solver", () => {
  const source = fs.readFileSync(
    path.join(appRoot, "threeway-package-solver.js"), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  assert.equal(typeof context.globalThis.MEH3PackageSolver
    .solvePackageEnvelope, "function");
});
