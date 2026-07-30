import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const engine = require(path.resolve(here, "../../engine.js"));
const deg = value => value * Math.PI / 180;
const close = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${message}: ${actual} vs ${expected} (tol ${tolerance})`);

function assertFiniteContinuous(points, maxStep) {
  assert.ok(points.length >= 2);
  for (const point of points) {
    assert.ok(Number.isFinite(point.x));
    assert.ok(Number.isFinite(point.y));
    assert.ok(point.y > 0);
  }
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y
    ) <= maxStep, `point jump ${index - 1}->${index} exceeds ${maxStep} m`);
  }
}

test("radial family schemas are distinct, bounded, exact-round records", () => {
  const schemas = engine.RADIAL_PROFILE_SCHEMAS;
  assert.deepEqual(Object.keys(schemas), ["classicOS", "osse", "rosse", "jmlc"]);
  assert.equal(schemas.classicOS.synthesis, "analytic");
  assert.equal(schemas.osse.termination, "native flat/large-baffle termination");
  assert.equal(schemas.rosse.synthesis, "analytic_parametric");
  assert.equal(schemas.jmlc.synthesis, "validation_only");
  assert.equal(schemas.jmlc.directivityInput, null);
  for (const schema of Object.values(schemas)) {
    assert.equal(schema.geometryMode, "exact_round");
    assert.equal(schema.coverageClaim, false);
    assert.ok(Object.isFrozen(schema));
  }
  assert.equal(engine.radialProfileSchema("classic-os"), schemas.classicOS);
  assert.equal(engine.radialProfileSchema("r-osse"), schemas.rosse);
  assert.equal(engine.radialProfileSchema("unknown"), null);
});

test("classic OS satisfies analytic throat, mouth, slope, and continuity", () => {
  const throatRadius = 0.0127;
  const nominalHalfAngle = deg(45);
  const mouthRadius = 0.18;
  const result = engine.classicOSProfile({
    throatRadius, nominalHalfAngle, mouthRadius, samples: 257
  });
  assert.equal(result.ok, true, result.errors?.join("; "));
  close(result.pts[0].x, 0, 1e-15, "classic OS throat x");
  close(result.pts[0].y, throatRadius, 1e-15, "classic OS throat radius");
  close(result.mouthRadius, mouthRadius, 1e-10, "classic OS mouth radius");
  const expectedLength = Math.sqrt(mouthRadius ** 2 - throatRadius ** 2) /
    Math.tan(nominalHalfAngle);
  close(result.L, expectedLength, 1e-10, "classic OS solved length");
  const h = 1e-7;
  const throatSlope = (
    engine.classicOSRadiusAt({ throatRadius, nominalHalfAngle }, h) - throatRadius
  ) / h;
  assert.ok(Math.abs(throatSlope) < 1e-4, `classic OS throat slope is ${throatSlope}`);
  assertFiniteContinuous(result.pts, 0.002);
});

test("OS-SE keeps the published throat slope and solves a finite mouth endpoint", () => {
  const config = {
    throatRadius: 0.0127,
    nominalHalfAngle: deg(45),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    s: 0.7,
    terminationExponent: 4,
    q: 0.995,
    mouthRadius: 0.18,
    samples: 321
  };
  const result = engine.osseProfile(config);
  assert.equal(result.ok, true, result.errors?.join("; "));
  close(result.pts[0].x, 0, 1e-15, "OS-SE throat x");
  close(result.pts[0].y, config.throatRadius, 1e-15, "OS-SE throat radius");
  close(result.mouthRadius, config.mouthRadius, 1e-9, "OS-SE mouth radius");
  const h = 1e-7;
  const slope = (
    engine.osseRadiusAt(config, h, result.L) - config.throatRadius
  ) / h;
  close(slope, Math.tan(config.throatHalfAngle), 3e-5, "OS-SE launch slope");
  const beforeMouth = engine.osseRadiusAt(config, result.L * (1 - 1e-8), result.L);
  assert.ok(Number.isFinite(beforeMouth));
  assert.ok(Math.abs(beforeMouth - result.mouthRadius) < 1e-5);
  const mouthSlope = (result.mouthRadius - beforeMouth) / (result.L * 1e-8);
  assert.ok(Number.isFinite(mouthSlope));
  /* The native superellipse termination intentionally steepens into its
     baffle. This bound detects a discontinuity without treating that legitimate
     terminal slope as though it were a uniform-display-mesh requirement. */
  assertFiniteContinuous(result.pts, 0.006);
});

test("R-OSSE preserves rev.7 parametric endpoints and bounded continuity", () => {
  const config = {
    throatRadius: 0.0127,
    outerRadius: 0.13,
    nominalHalfAngle: deg(39),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    apexRadiusFactor: 0.3,
    bending: 0.3,
    apexShift: 0.8,
    throatShape: 3.7,
    samples: 401
  };
  const result = engine.rosseProfile(config);
  assert.equal(result.ok, true, result.errors?.join("; "));
  close(result.pts[0].x, 0, 1e-12, "R-OSSE throat x");
  close(result.pts[0].y, config.throatRadius, 1e-12, "R-OSSE throat radius");
  close(result.pts.at(-1).y, config.outerRadius, 1e-12, "R-OSSE outer radius");
  assert.ok(result.maxDepth >= result.depth);
  assert.equal(result.coverageClaim, false);
  assertFiniteContinuous(result.pts, 0.003);
});

test("JMLC validates its native controls, rejects coverage, and refuses fake synthesis", () => {
  const config = {
    family: "jmlc",
    throatRadius: 0.01778,
    cutoffFrequency: 400,
    T0: 0.7,
    entryMode: "natural",
    endWallAngle: deg(175),
    additionalNativeSweep: 0
  };
  const validation = engine.validateJMLCProfile(config);
  assert.equal(validation.ok, true, validation.errors.join("; "));
  assert.ok(validation.naturalEntryHalfAngle > 0);
  assert.ok(validation.seedArea > Math.PI * config.throatRadius ** 2);
  const area0 = engine.jmlcAreaAt(config, 0);
  close(area0, validation.seedArea, 1e-15, "JMLC seed area");
  assert.ok(engine.jmlcAreaAt(config, 0.1) > area0);

  const refused = engine.radialProfile(config);
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "JMLC_WAVEFRONT_MARCH_NOT_IMPLEMENTED");
  assert.equal(refused.synthesisSupported, false);
  assert.match(refused.errors[0], /wavefront march/i);

  const falseCoverage = engine.validateJMLCProfile({
    ...config,
    nominalIncludedAngle: deg(90)
  });
  assert.equal(falseCoverage.ok, false);
  assert.match(falseCoverage.errors.join(" "), /coverage requires analysis/i);
});

test("radial dispatch requires an explicit family and does not invent one", () => {
  const missing = engine.radialProfile({
    throatRadius: 0.0127,
    nominalHalfAngle: deg(45),
    mouthRadius: 0.18
  });
  assert.equal(missing.ok, false);
  assert.match(missing.errors[0], /explicitly select/i);
});

test("family bounds reject impossible inputs instead of silently borrowing defaults", () => {
  const badClassic = engine.classicOSProfile({
    throatRadius: 0.0127,
    nominalHalfAngle: deg(75),
    mouthRadius: 0.18
  });
  assert.equal(badClassic.ok, false);
  assert.match(badClassic.errors.join(" "), /15–70/);

  const badOsse = engine.osseProfile({
    throatRadius: 0.0127,
    nominalHalfAngle: deg(45),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    s: 0.7,
    terminationExponent: 12,
    q: 0.995,
    mouthRadius: 0.18
  });
  assert.equal(badOsse.ok, false);
  assert.match(badOsse.errors.join(" "), /2–8/);

  const badRosse = engine.rosseProfile({
    throatRadius: 0.0127,
    outerRadius: 0.13,
    nominalHalfAngle: deg(39),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    apexRadiusFactor: 0.3,
    bending: 1.2,
    apexShift: 0.8,
    throatShape: 3.7
  });
  assert.equal(badRosse.ok, false);
  assert.match(badRosse.errors.join(" "), /bending/);
});

test("the explicit internal smooth oracle remains exact for regression comparisons", () => {
  const state = {
    topo: "2way",
    style: "smooth",
    profileLaw: "regressionEasedConical",
    covH: 90,
    covV: 60,
    throat: 1.4,
    mouthW: 24,
    rollR: 1,
    seN: 6,
    placeW: "auto"
  };
  const result = engine.profile(state);
  const throatRadius = state.throat * engine.IN / 2;
  const mouthRadius = state.mouthW * engine.IN / 2;
  const expectedDepth = Math.max(
    0.06,
    (mouthRadius - throatRadius) / Math.tan(deg(state.covH / 2))
  );
  close(result.depth, expectedDepth, 1e-15, "oracle smooth depth");
  close(result.pts[0].h, throatRadius, 1e-15, "oracle smooth throat");
  assert.equal(result.pts.length, 49);
  for (let index = 0; index <= 48; index += 1) {
    const u = index / 48;
    const smoothstep = u * u * (3 - 2 * u);
    close(result.pts[index].x, u * expectedDepth, 1e-15,
      `oracle smooth x[${index}]`);
    close(
      result.pts[index].h,
      throatRadius + (mouthRadius - throatRadius) *
        (0.72 * u + 0.28 * smoothstep),
      1e-15,
      `oracle smooth radius[${index}]`
    );
    assert.equal(result.pts[index].roll, undefined);
  }
  close(result.pts[48].h, mouthRadius, 1e-15, "oracle smooth mouth");
  assert.equal(result.rollR, 0);
  assert.equal(result.profileLaw.family, "regressionEasedConical");
  assert.match(result.profileHash, /^pl1-[0-9a-f]{8}$/);
});

test("a new smooth state defaults to the conical pre-release product law", () => {
  const result = engine.profile({
    topo: "2way",
    style: "smooth",
    covH: 90,
    covV: 60,
    throat: 1.4,
    mouthW: 24,
    seN: 6,
    placeW: "auto"
  });
  assert.equal(result.profileLaw.family, "conical");
});
