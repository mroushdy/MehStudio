import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(here, "../../profile-laws.js");
const laws = require(modulePath);
const deg = value => value * Math.PI / 180;

function close(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} vs ${expected} (tolerance ${tolerance})`
  );
}

function baseExtent(family) {
  return {
    family,
    throatRadius: 0.01778,
    mouthRadius: 0.3048,
    nominalHalfAngle: deg(45)
  };
}

test("profile-law module is immutable, browser-safe, and exposes distinct schemas", () => {
  assert.equal(laws.API_VERSION, 1);
  assert.deepEqual(
    Object.keys(laws.PROFILE_LAW_SCHEMAS),
    ["regressionEasedConical", "conical", "classicOS", "osse", "rosse"]
  );
  for (const [family, schema] of Object.entries(laws.PROFILE_LAW_SCHEMAS)) {
    assert.equal(schema.family, family);
    assert.equal(schema.coverageClaim, false);
    assert.equal(schema.nativeDomain, "monotone-axial");
    assert.ok(Object.isFrozen(schema));
  }
  /* The pinned 72/28 oracle is intentionally available only through its exact
     internal-regression key. Old and generic names must not become product
     laws, migration paths, or defaults. */
  assert.equal(laws.profileLawSchema("legacy"), null);
  assert.equal(laws.profileLawSchema("legacy-eased-conical"), null);
  assert.equal(laws.profileLawSchema("eased-conical"), null);
  assert.equal(laws.profileLawSchema("legacyEasedConical"), null);
  const retiredExactKey = laws.solveProfileLaw(baseExtent("legacyEasedConical"));
  assert.equal(retiredExactKey.ok, false);
  assert.equal(retiredExactKey.code, "PROFILE_LAW_UNSUPPORTED");
  assert.equal(
    laws.profileLawSchema("regressionEasedConical"),
    laws.PROFILE_LAW_SCHEMAS.regressionEasedConical
  );
  assert.equal(laws.profileLawSchema("classic-os"), laws.PROFILE_LAW_SCHEMAS.classicOS);
  assert.equal(laws.profileLawSchema("r-osse"), laws.PROFILE_LAW_SCHEMAS.rosse);
  assert.ok(Object.isFrozen(laws));

  const source = fs.readFileSync(modulePath, "utf8");
  const browserContext = {};
  browserContext.globalThis = browserContext;
  vm.runInNewContext(source, browserContext, { filename: "profile-laws.js" });
  assert.equal(typeof browserContext.MEHProfileLaws.solveProfileLaw, "function");
  assert.equal(browserContext.MEHProfileLaws.API_VERSION, 1);
});

test("internal regression oracle reproduces the pinned 72/28 equation exactly", () => {
  const config = baseExtent("regressionEasedConical");
  const result = laws.solveProfileLaw(config);
  assert.equal(result.ok, true, result.errors?.join("; "));
  const expectedLength = Math.max(
    0.06,
    (config.mouthRadius - config.throatRadius) /
      Math.tan(config.nominalHalfAngle)
  );
  close(result.extent.axialLength, expectedLength, 1e-15, "oracle axial length");
  close(result.stations[0].r, config.throatRadius, 1e-15, "oracle throat");
  close(result.stations.at(-1).r, config.mouthRadius, 1e-15, "oracle mouth");

  for (const u of [0, 0.125, 0.25, 0.5, 0.875, 1]) {
    const point = laws.evaluateProfileAt(result, u);
    const smoothstep = u * u * (3 - 2 * u);
    const expectedRadius = config.throatRadius +
      (config.mouthRadius - config.throatRadius) *
      (0.72 * u + 0.28 * smoothstep);
    close(point.r, expectedRadius, 1e-15, `oracle radius at u=${u}`);
  }

  const shallow = laws.solveProfileLaw({
    family: "regressionEasedConical",
    throatRadius: 0.0127,
    mouthRadius: 0.04,
    nominalHalfAngle: deg(60)
  });
  assert.equal(shallow.ok, true);
  close(shallow.extent.axialLength, 0.06, 1e-15, "oracle minimum length");
  assert.equal(result.source.includes("72/28"), true);
});

test("conical law has constant analytic slope and zero curvature", () => {
  const config = baseExtent("conical");
  const result = laws.solveProfileLaw(config);
  assert.equal(result.ok, true, result.errors?.join("; "));
  const tangent = Math.tan(config.nominalHalfAngle);
  close(
    result.extent.axialLength,
    (config.mouthRadius - config.throatRadius) / tangent,
    1e-15,
    "conical length"
  );
  for (const u of [0, 0.1, 0.5, 0.9, 1]) {
    const point = laws.evaluateProfileAt(result, u);
    close(point.slope, tangent, 1e-15, `conical slope at ${u}`);
    close(point.curvature, 0, 0, `conical curvature at ${u}`);
  }
  assert.equal(result.monotonic.axial, true);
  assert.equal(result.monotonic.radial, true);
  assert.equal(result.compatibility.monotoneAxialConsumer, true);
});

test("classic OS preserves its analytic throat, endpoint, derivatives, and curvature", () => {
  const config = baseExtent("classicOS");
  const result = laws.solveProfileLaw(config);
  assert.equal(result.ok, true, result.errors?.join("; "));
  const tangent = Math.tan(config.nominalHalfAngle);
  const expectedLength = Math.sqrt(
    config.mouthRadius ** 2 - config.throatRadius ** 2
  ) / tangent;
  close(result.extent.axialLength, expectedLength, 1e-14, "classic OS length");
  close(result.endpoints.throat.slope, 0, 0, "classic OS throat slope");
  close(
    result.endpoints.throat.curvature,
    tangent ** 2 / config.throatRadius,
    1e-12,
    "classic OS throat curvature"
  );

  const point = laws.evaluateProfileAt(result, 0.4);
  const expectedRadius = Math.sqrt(
    config.throatRadius ** 2 + (point.x * tangent) ** 2
  );
  const expectedSlope = point.x * tangent ** 2 / expectedRadius;
  const expectedSecond = config.throatRadius ** 2 * tangent ** 2 /
    expectedRadius ** 3;
  close(point.r, expectedRadius, 1e-15, "classic OS radius");
  close(point.slope, expectedSlope, 1e-15, "classic OS slope");
  close(
    point.curvature,
    expectedSecond / (1 + expectedSlope ** 2) ** 1.5,
    1e-13,
    "classic OS curvature"
  );
});

test("OS-SE solves the requested endpoint and keeps finite analytic C2 data", () => {
  const config = {
    ...baseExtent("osse"),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    s: 0.7,
    terminationExponent: 4,
    q: 0.995,
    samples: 321
  };
  const result = laws.solveProfileLaw(config);
  assert.equal(result.ok, true, result.errors?.join("; "));
  close(result.endpoints.throat.r, config.throatRadius, 1e-15, "OS-SE throat");
  close(result.endpoints.mouth.r, config.mouthRadius, 1e-12, "OS-SE mouth");
  close(
    result.endpoints.throat.slope,
    Math.tan(config.throatHalfAngle),
    1e-14,
    "OS-SE launch slope"
  );
  assert.equal(result.diagnostics.finite, true);
  assert.equal(result.diagnostics.c2Finite, true);
  assert.equal(result.monotonic.axial, true);
  assert.equal(result.monotonic.radial, true);
  assert.ok(Number.isFinite(result.endpoints.mouth.slope));
  assert.ok(Number.isFinite(result.endpoints.mouth.curvature));
  assert.equal(result.nativeTermination, "flat/large-baffle steepening");
  assert.equal(result.terminationPolicy, "native-profile-law");

  const point = laws.evaluateProfileAt(result, 0.37);
  const h = 1e-6;
  const before = laws.evaluateProfileAt(result, 0.37 - h);
  const after = laws.evaluateProfileAt(result, 0.37 + h);
  const finiteDifferenceSlope = (after.r - before.r) / (after.x - before.x);
  close(point.slope, finiteDifferenceSlope, 2e-9, "OS-SE analytic slope");
});

test("equivalent extent declarations preserve the deterministic geometry hash", () => {
  const mouthSolved = laws.solveProfileLaw({
    ...baseExtent("osse"),
    throatHalfAngle: deg(5),
    k: 1.5,
    s: 0.5,
    terminationExponent: 3.7,
    q: 0.995,
    samples: 129
  });
  assert.equal(mouthSolved.ok, true);
  const lengthSolved = laws.solveProfileLaw({
    family: "osse",
    throatRadius: mouthSolved.inputs.throatRadius,
    nominalHalfAngle: mouthSolved.inputs.nominalHalfAngle,
    throatHalfAngle: mouthSolved.inputs.throatHalfAngle,
    k: mouthSolved.inputs.k,
    s: mouthSolved.inputs.s,
    terminationExponent: mouthSolved.inputs.terminationExponent,
    q: mouthSolved.inputs.q,
    axialLength: mouthSolved.extent.axialLength,
    samples: 513
  });
  assert.equal(lengthSolved.ok, true);
  assert.equal(lengthSolved.profileHash, mouthSolved.profileHash);
  assert.notEqual(lengthSolved.sampleHash, mouthSolved.sampleHash);
  close(
    lengthSolved.extent.mouthRadius,
    mouthSolved.extent.mouthRadius,
    1e-13,
    "equivalent OS-SE endpoint"
  );
});

test("cross-section, termination, mount, and sampling fields are profile-orthogonal", () => {
  const baseline = laws.solveProfileLaw(baseExtent("classicOS"));
  const decorated = laws.solveProfileLaw({
    ...baseExtent("classicOS"),
    crossSection: "superellipse",
    lameExponent: 6,
    aspect: 1.5,
    mouthTermination: "bullnose",
    mouthRoundoverRadius: 0.02,
    tapCount: 4,
    driverPlateThickness: 0.008,
    samples: 1025
  });
  assert.equal(baseline.ok, true);
  assert.equal(decorated.ok, true);
  assert.equal(decorated.profileHash, baseline.profileHash);
  assert.notEqual(decorated.sampleHash, baseline.sampleHash);
  assert.deepEqual(decorated.inputs, baseline.inputs);
  assert.equal(decorated.compatibility.crossSectionLayer, "orthogonal-not-applied");
  assert.equal(
    decorated.compatibility.additionalMouthTreatment,
    "orthogonal-not-applied"
  );
});

test("R-OSSE admits its exact monotone body while native rollback still refuses", () => {
  const result = laws.solveProfileLaw({
    family: "r-osse",
    throatRadius: 0.0127,
    mouthRadius: 0.13,
    nominalHalfAngle: deg(45),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    apexRadiusFactor: 0.3,
    bending: 0.34,
    apexShift: 0.53,
    throatShape: 3.7
  });
  assert.equal(result.ok, true, result.errors?.join("; "));
  assert.equal(result.family, "rosse");
  assert.equal(result.compatibility.monotoneAxialConsumer, true);
  assert.equal(result.compatibility.nativeRollbackIncluded, false);
  assert.equal(result.truncation.mode, "monotone-forward-branch-flat-baffle");
  assert.equal(result.truncation.nativeRollbackIncluded, false);
  assert.match(result.nativeTermination, /flat-baffle truncation/i);
  close(result.endpoints.mouth.r, 0.13, 1e-12, "truncated R-OSSE mouth");

  const nativeRollback = laws.solveProfileLaw({
    family: "rollback-rosse",
    throatRadius: 0.0127
  });
  assert.equal(nativeRollback.ok, false);
  assert.equal(nativeRollback.code, "PROFILE_NATIVE_ROLLBACK_UNSUPPORTED");
  assert.equal(nativeRollback.family, "rosse");
  assert.equal(nativeRollback.requiresParametricDomain, true);
  assert.equal(nativeRollback.compatibility.monotoneAxialConsumer, false);
  assert.match(nativeRollback.compatibility.reason, /non-monotone/i);

  const missing = laws.solveProfileLaw({ throatRadius: 0.0127 });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "PROFILE_LAW_REQUIRED");

  const unknown = laws.solveProfileLaw({
    ...baseExtent("mystery-smooth")
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, "PROFILE_LAW_UNSUPPORTED");
  assert.match(unknown.errors[0], /no fallback/i);
});

test("bounds and inconsistent extents fail closed with compatibility reasons", () => {
  const qOne = laws.solveProfileLaw({
    ...baseExtent("osse"),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    s: 0.7,
    terminationExponent: 4,
    q: 1
  });
  assert.equal(qOne.ok, false);
  assert.equal(qOne.code, "PROFILE_INPUT_INVALID");
  assert.match(qOne.errors.join(" "), /endpoint derivatives remain finite/i);
  assert.match(qOne.compatibility.reason, /q must/i);

  const inconsistent = laws.solveProfileLaw({
    ...baseExtent("conical"),
    axialLength: 0.5
  });
  assert.equal(inconsistent.ok, false);
  assert.equal(inconsistent.code, "PROFILE_EXTENT_INVALID");

  const invalidAngle = laws.solveProfileLaw({
    ...baseExtent("classicOS"),
    nominalHalfAngle: deg(80)
  });
  assert.equal(invalidAngle.ok, false);
  assert.equal(invalidAngle.code, "PROFILE_INPUT_INVALID");
});

test("arbitrary evaluation is deterministic and guards its normalized domain", () => {
  const first = laws.solveProfileLaw({
    ...baseExtent("regressionEasedConical"),
    samples: 257
  });
  const second = laws.solveProfileLaw({
    ...baseExtent("regressionEasedConical"),
    samples: 257
  });
  assert.deepEqual(second, first);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.stations));
  assert.equal(first.lawId, first.family);
  assert.match(first.profileHash, /^pl1-[0-9a-f]{8}$/);
  assert.match(first.sampleHash, /^pls1-[0-9a-f]{8}$/);

  const station = first.stations[64];
  const evaluated = laws.evaluateProfileAt(first, station.u);
  for (const key of [
    "x",
    "r",
    "dxdu",
    "drdu",
    "d2xdu2",
    "d2rdu2",
    "slope",
    "tangentAngle",
    "curvature"
  ]) {
    close(evaluated[key], station[key], 0, `station evaluator ${key}`);
  }
  assert.throws(() => laws.evaluateProfileAt(first, -0.01), RangeError);
  assert.throws(() => laws.evaluateProfileAt(first, 1.01), RangeError);
  assert.throws(() => laws.evaluateProfileAt({ ok: false }, 0.5), TypeError);
});
