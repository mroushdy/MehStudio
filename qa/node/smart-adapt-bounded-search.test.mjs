import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const engine = require(path.join(root, "engine.js"));

test("Smart Adapt rejects CD-bearing penetration and returns the first legal coupled package", () => {
  const documented = engine.BUILDS["2way"].find(
    entry => entry.key === "hinson10"
  );
  assert.ok(documented, "Hinson two-way record is missing");
  const selectedLargeDriver = {
    ...documented.s,
    _smart2waySchema: 3,
    wPre: "ndl88",
    odW: 31.5,
    dpW: 14,
    sdW: 522,
    vtcW: 180,
    xmW: 8
  };

  const started = performance.now();
  const adapted = engine.smartAdapt2way(selectedLargeDriver, "wPre", {});
  const elapsedMs = performance.now() - started;
  const plan = engine.twoWayPlan(adapted.S2, {
    deferRetention: true,
    coarseRadialDiagnostics: true
  });
  const formerlyAccepted = engine.twoWayPlan({
    ...adapted.S2,
    mouthW: 28,
    twoXO: 500,
    tapCRW: 8.5
  }, {
    deferRetention: true,
    coarseRadialDiagnostics: true
  });

  assert.equal(adapted.S2.twoDesign, "arch:panel");
  assert.equal(adapted.S2.tapBasis, "model");
  assert.equal(adapted.S2.tapCRW, 8.5);
  assert.equal(adapted.S2.mouthW, 29);
  assert.equal(adapted.S2.twoXO, 350);
  assert.ok(
    formerlyAccepted.driverCdFlangeClearance < 0,
    "the retired 28 in / 500 Hz result physically penetrates the finite CD flange"
  );
  assert.equal(formerlyAccepted.driverCdFlangeComplete, false);
  assert.ok(plan.driverCdFlangeComplete);
  assert.ok(
    plan.driverCdFlangeClearance >= plan.driverCdFlangeRequired,
    "the adapted package must preserve the full driver-bearing/CD structural web"
  );
  assert.equal(plan.mountEnvelopeComplete, true);
  assert.equal(plan.mountEnvelopeCoverage, 1);
  assert.ok(plan.tapMach <= plan.tapMachLimit + 1e-12);
  assert.ok(plan.tapFraction <= 0.5);
  assert.ok(plan.maxPortReach <= plan.frame.activeR - 0.002);
  assert.ok(
    elapsedMs < 5000,
    `first-legal Smart Adapt candidate took ${elapsedMs.toFixed(1)} ms`
  );
});
