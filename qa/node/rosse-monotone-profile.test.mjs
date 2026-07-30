import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const engine = require(path.join(projectRoot, "engine.js"));
const profileLaws = require(path.join(projectRoot, "profile-laws.js"));
const deg = value => value * Math.PI / 180;

const directBase = Object.freeze({
  family: "rosse",
  throatRadius: 0.01778,
  mouthRadius: 0.4572,
  nominalHalfAngle: deg(45),
  throatHalfAngle: deg(7.5),
  k: 1.8,
  apexRadiusFactor: 0.3,
  bending: 0.3,
  apexShift: 0.8,
  throatShape: 3.7,
  samples: 129,
});

const engineBase = Object.freeze({
  ...engine.TWO_ARCH.radial.defaults,
  topo: "2way",
  twoDesign: "arch:radial",
  twoArch: "radial",
  twoFamily: "radial",
  style: "smooth",
  seN: 6,
  covH: 90,
  covV: 60,
  mouthW: 36,
  mouthCap: 64,
  wallT: 0.012,
  td: 1.4,
  throat: 1.4,
  cdSel: "dcx464",
  cdFloor: 300,
  cdDepth: 2.4,
  profileLaw: "r-osse",
});

function close(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} vs ${expected} (tolerance ${tolerance})`,
  );
}

function publishedPoint(profile, u) {
  const {
    throatRadius: r0,
    nominalHalfAngle: a,
    throatHalfAngle: a0,
    k,
    apexRadiusFactor: rr,
    bending: b,
    apexShift: m,
    throatShape: q,
    nativeOuterRadius: R,
    monotoneParameterEnd,
  } = profile.inputs;
  const t = monotoneParameterEnd * u;
  const c1 = (k * r0) ** 2;
  const c2 = 2 * k * r0 * Math.tan(a0);
  const c3 = Math.tan(a) ** 2;
  const L = (
    Math.sqrt(c2 * c2 - 4 * c3 * (c1 - (R + r0 * (k - 1)) ** 2)) - c2
  ) / (2 * c3);
  const A1 = Math.hypot(rr, m);
  const A2 = Math.hypot(rr, 1 - m);
  const x = L * (A1 - Math.hypot(rr, t - m)) +
    b * L * (A2 - A1) * t * t;
  const r = (1 - t ** q) * (
    Math.sqrt(c1 + c2 * L * t + c3 * L * L * t * t) + r0 * (1 - k)
  ) + t ** q * (
    R + L * (1 - Math.sqrt(1 + c3 * (t - 1) ** 2))
  );
  return { x, r };
}

test("monotone R-OSSE retains the published rev.7 body and names its truncation", () => {
  const profile = profileLaws.solveProfileLaw(directBase);
  assert.equal(profile.ok, true, profile.errors?.join("; "));
  assert.equal(profile.family, "rosse");
  assert.equal(profile.exactness, "exact-axisymmetric-retained-native-body");
  assert.equal(profile.nativeDomain, "monotone-axial");
  assert.match(profile.nativeTermination, /flat-baffle truncation/i);
  assert.equal(profile.truncation.active, true);
  assert.equal(profile.truncation.nativeRollbackIncluded, false);
  assert.ok(profile.truncation.nativeParameterEnd > 0);
  assert.ok(profile.truncation.nativeParameterEnd < 1);
  assert.equal(profile.monotonic.axial, true);
  assert.equal(profile.monotonic.radial, true);
  assert.equal(profile.diagnostics.finite, true);
  assert.equal(profile.diagnostics.c2Finite, true);
  assert.ok(profile.diagnostics.minDxDu > 0);
  close(profile.endpoints.throat.r, directBase.throatRadius, 1e-14, "throat");
  close(profile.endpoints.mouth.r, directBase.mouthRadius, 1e-12, "mouth");

  for (const u of [0, 0.125, 0.37, 0.75, 1]) {
    const expected = publishedPoint(profile, u);
    const actual = profileLaws.evaluateProfileAt(profile, u);
    close(actual.x, expected.x, 2e-15, `published x at ${u}`);
    close(actual.r, expected.r, 2e-15, `published r at ${u}`);
  }
  assert.ok(
    profile.stations.some(station => Math.abs(station.d2xdu2) > 1e-9),
    "R-OSSE was flattened into a linear axial parameter",
  );
});

test("every explicit R-OSSE state field materially changes production geometry", () => {
  const defaults = engine.PROFILE_LAW_DEFAULTS;
  assert.deepEqual({
    rosseThroatAngle: defaults.rosseThroatAngle,
    rosseK: defaults.rosseK,
    rosseApexRadiusFactor: defaults.rosseApexRadiusFactor,
    rosseB: defaults.rosseB,
    rosseM: defaults.rosseM,
    rosseQ: defaults.rosseQ,
  }, {
    rosseThroatAngle: 7.5,
    rosseK: 1.8,
    rosseApexRadiusFactor: 0.3,
    rosseB: 0.3,
    rosseM: 0.8,
    rosseQ: 3.7,
  });

  const baseline = engine.stations(engineBase);
  const variants = {
    rosseThroatAngle: 3,
    rosseK: 2.4,
    rosseApexRadiusFactor: 0.6,
    rosseB: 0.55,
    rosseM: 0.65,
    rosseQ: 5.2,
  };
  const hashes = new Set([baseline.profileHash]);
  for (const [field, value] of Object.entries(variants)) {
    const stations = engine.stations({ ...engineBase, [field]: value });
    assert.equal(stations.profileLaw.family, "rosse");
    assert.notEqual(stations.profileHash, baseline.profileHash, `${field} was inert`);
    assert.notDeepEqual(
      stations.pts.map(point => [point.x, point.a]),
      baseline.pts.map(point => [point.x, point.a]),
      `${field} did not reach consumed stations`,
    );
    assert.equal(stations.profileMonotonic.axial, true);
    assert.equal(stations.profileMonotonic.radial, true);
    hashes.add(stations.profileHash);
  }
  assert.equal(hashes.size, Object.keys(variants).length + 1);
});

test("R, a, and r0 remain owned by mouth, coverage, and throat state", () => {
  const baseline = engine.stations(engineBase);
  for (const patch of [
    { mouthW: 40 },
    { covH: 80 },
    { throat: 2, td: 2 },
  ]) {
    const changed = engine.stations({ ...engineBase, ...patch });
    assert.notEqual(changed.profileHash, baseline.profileHash);
    assert.equal(changed.profileLaw.family, "rosse");
    assert.equal(changed.profileMonotonic.axial, true);
    assert.equal(changed.profileMonotonic.radial, true);
  }
});

test("production R-OSSE reaches two-way and one-way exact geometry without claiming rollback", () => {
  const plan = engine.twoWayPlan(engineBase);
  assert.equal(plan.st.profileLaw.family, "rosse");
  assert.equal(plan.st.profileLaw.truncation.nativeRollbackIncluded, false);
  assert.equal(plan.st.mouthTermination, "flat printed baffle; no additional rollback");
  const exactField = engine.twoWaySolidField(plan, false);
  for (const point of [
    [0, 0, 0],
    [plan.st.depth * 0.5, 0.05, 0.03],
    [plan.st.depth, plan.st.pts.at(-1).a, 0],
  ]) {
    assert.ok(Number.isFinite(exactField(point)), `non-finite exact SDF at ${point}`);
  }

  const build = engine.BUILDS["1way"].find(entry => entry.key === "fhx6");
  assert.ok(build);
  const conical = engine.stations({ ...structuredClone(build.s), profileLaw: "conical" });
  const rosse = engine.stations({ ...structuredClone(build.s), profileLaw: "rosse" });
  assert.deepEqual(rosse.wgFace, conical.wgFace);
  assert.equal(rosse.xAdapter, conical.xAdapter);
  assert.equal(rosse.xTap, conical.xTap);
  assert.equal(rosse.profileLaw.family, "rosse");
  assert.equal(rosse.profileJoin.ok, true);
  assert.equal(rosse.profileJoin.mode, "bounded-c2-bridge");
  assert.equal(rosse.profileLaw.truncation.nativeRollbackIncluded, false);

  const mesh = engine.coaxHornMesh({
    ...structuredClone(build.s),
    profileLaw: "rosse",
  });
  const audit = engine.meshAudit(mesh);
  assert.equal(audit.badEdges, 0);
  assert.equal(audit.badOrientation, 0);
  assert.equal(audit.nonFinite, 0);
  assert.equal(audit.components, 1);
});

test("unsafe curvature and native rollback requests still fail closed", () => {
  const singularQ = profileLaws.solveProfileLaw({
    ...directBase,
    throatShape: 1.5,
  });
  assert.equal(singularQ.ok, false);
  assert.equal(singularQ.code, "PROFILE_INPUT_INVALID");
  assert.match(singularQ.errors.join(" "), /curvature remains finite/i);

  const nativeRollback = profileLaws.solveProfileLaw({
    family: "rollback-rosse",
  });
  assert.equal(nativeRollback.ok, false);
  assert.equal(nativeRollback.code, "PROFILE_NATIVE_ROLLBACK_UNSUPPORTED");
  assert.equal(nativeRollback.requiresParametricDomain, true);
  assert.equal(nativeRollback.compatibility.monotoneAxialConsumer, false);

  const baseline = profileLaws.solveProfileLaw(directBase);
  const inconsistentLength = profileLaws.solveProfileLaw({
    ...directBase,
    axialLength: baseline.extent.axialLength * 1.1,
  });
  assert.equal(inconsistentLength.ok, false);
  assert.equal(inconsistentLength.code, "PROFILE_EXTENT_INVALID");
});
