import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const engine = require(path.join(projectRoot, "engine.js"));
const shell = fs.readFileSync(path.join(projectRoot, "shell.html"), "utf8");
const assembler = fs.readFileSync(path.join(projectRoot, "assemble.js"), "utf8");

const smoothBase = {
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
  rollR: 2,
  td: 1.4,
  throat: 1.4,
  cdSel: "dcx464",
  cdFloor: 300,
  cdDepth: 2.4,
  profileLaw: "regressionEasedConical",
  osseThroatAngle: 7.5,
  osseK: 1.8,
  osseS: 0.7,
  osseTerminationN: 4,
  osseQ: 0.995,
  rosseThroatAngle: 7.5,
  rosseK: 1.8,
  rosseApexRadiusFactor: 0.3,
  rosseB: 0.3,
  rosseM: 0.8,
  rosseQ: 3.7
};

function coordinates(points) {
  return points.map(point => [point.x, point.h, point.v]);
}

test("single-file source order loads profile laws before engine and CommonJS exposes them", () => {
  const profileMarker = shell.indexOf("/*__PROFILE_LAWS__*/");
  const engineMarker = shell.indexOf("/*__ENGINE__*/");
  assert.ok(profileMarker >= 0);
  assert.ok(engineMarker > profileMarker);
  assert.match(assembler, /readFileSync\('profile-laws\.js'/);
  assert.ok(
    assembler.indexOf("replace('/*__PROFILE_LAWS__*/'") <
      assembler.indexOf("replace('/*__ENGINE__*/'"),
    "assembler must inline profile-laws.js before engine.js"
  );
  assert.equal(typeof engine.solveProfileLaw, "function");
  assert.equal(
    engine.PROFILE_LAW_SCHEMAS.regressionEasedConical.family,
    "regressionEasedConical"
  );
  for (const filename of [
    "twoway-worker.js",
    "twoway-mesh-worker.js",
    "twoway-audit-worker.js",
    "twoway-output-worker.js"
  ]) {
    const worker = fs.readFileSync(path.join(projectRoot, filename), "utf8");
    const profile = worker.indexOf("'profile-laws.js'+workerCacheKey");
    const engineImport = worker.indexOf("'engine.js'+workerCacheKey");
    assert.ok(profile >= 0 && engineImport > profile,
      `${filename} must load profile laws before engine`);
  }
});

test("internal regression stations retain every pinned acoustic-body coordinate", () => {
  const profile = engine.profile(smoothBase);
  assert.equal(profile.pts.length, 49);
  const throatRadius = smoothBase.throat * engine.IN / 2;
  const mouthRadius = smoothBase.mouthW * engine.IN / 2;
  const depth = Math.max(
    0.06,
    (mouthRadius - throatRadius) /
      Math.tan(smoothBase.covH * Math.PI / 360)
  );
  for (let index = 0; index <= 48; index += 1) {
    const u = index / 48;
    const smoothstep = u * u * (3 - 2 * u);
    assert.equal(profile.pts[index].x, u * depth);
    assert.equal(
      profile.pts[index].h,
      throatRadius + (mouthRadius - throatRadius) *
        (0.72 * u + 0.28 * smoothstep)
    );
    assert.equal(profile.pts[index].roll, undefined);
  }
  assert.equal(profile.rollR, 0);
  assert.equal(profile.mouthTermination, "flat printed baffle; no additional rollback");
});

test("every supported selection changes the actual stations consumed by twoway-core", () => {
  const laws = ["regressionEasedConical", "conical", "classicOS", "osse", "rosse"];
  const plans = new Map();
  for (const family of laws) {
    const plan = engine.twoWayPlan({ ...smoothBase, profileLaw: family });
    plans.set(family, plan);
    assert.equal(plan.st.profileLaw.family, family);
    assert.equal(plan.st.profileLaw.lawId, family);
    assert.equal(plan.st.profileHash, plan.st.profileLaw.profileHash);
    assert.equal(plan.st.profileMonotonic.axial, true);
    assert.equal(plan.st.profileMonotonic.radial, true);
    assert.equal(plan.st.pts.length, 49);
    assert.equal(plan.st.pts.some(point => point.roll), false);
    assert.equal(plan.st.mouthTermination, "flat printed baffle; no additional rollback");

    const direct = engine.stations({ ...smoothBase, profileLaw: family });
    assert.equal(direct.profileHash, plan.st.profileHash);
    assert.deepEqual(coordinates(direct.pts), coordinates(plan.st.pts));
  }

  const hashes = new Set([...plans.values()].map(plan => plan.st.profileHash));
  assert.equal(hashes.size, laws.length, "each law needs a distinct canonical geometry hash");
  const oracleQuarter = plans.get("regressionEasedConical").st.pts[12].a;
  for (const family of laws.slice(1)) {
    assert.notEqual(
      plans.get(family).st.pts[12].a,
      oracleQuarter,
      `${family} did not reach downstream station geometry`
    );
  }
});

test("cross-section and obsolete two-way roll settings cannot mutate the meridian hash", () => {
  const baseline = engine.twoWayPlan({
    ...smoothBase,
    profileLaw: "classicOS",
    seN: 2,
    rollR: 0.5
  });
  const decorated = engine.twoWayPlan({
    ...smoothBase,
    profileLaw: "classicOS",
    seN: 10,
    rollR: 4
  });
  assert.equal(decorated.st.profileHash, baseline.st.profileHash);
  assert.deepEqual(
    decorated.st.pts.map(point => [point.x, point.a]),
    baseline.st.pts.map(point => [point.x, point.a])
  );
  assert.notDeepEqual(
    decorated.st.pts.map(point => point.n),
    baseline.st.pts.map(point => point.n),
    "cross-section topology must remain independently selectable"
  );
  assert.equal(decorated.st.rollR, 0);
});

test("documented angular panels remain independent of the smooth-law selector", () => {
  const angular = {
    ...smoothBase,
    style: "angular",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "hinson10",
    seN: 12,
    covH: 90,
    covV: 60,
    mouthW: 28
  };
  const regressionOracle = engine.profile({
    ...angular,
    profileLaw: "regressionEasedConical"
  });
  const deferred = engine.profile({
    ...angular,
    profileLaw: "r-osse",
    osseK: 4,
    osseS: 2
  });
  assert.deepEqual(deferred, regressionOracle);
  assert.equal(regressionOracle.panelProfile, "single-plane");
  assert.equal(regressionOracle.profileLaw, undefined);
});

test("smooth monotone R-OSSE runs while native rollback and unknown states refuse", () => {
  const rosse = engine.stations({ ...smoothBase, profileLaw: "r-osse" });
  assert.equal(rosse.profileLaw.family, "rosse");
  assert.equal(rosse.profileLaw.truncation.nativeRollbackIncluded, false);
  assert.equal(rosse.profileMonotonic.axial, true);
  assert.equal(rosse.profileMonotonic.radial, true);
  assert.throws(
    () => engine.stations({ ...smoothBase, profileLaw: "rollback-rosse" }),
    error => (
      error?.name === "ProfileLawRefusalError" &&
      error?.code === "PROFILE_NATIVE_ROLLBACK_UNSUPPORTED" &&
      error?.profileLaw?.requiresParametricDomain === true
    )
  );
  assert.throws(
    () => engine.twoWayPlan({ ...smoothBase, profileLaw: "unknown-curved" }),
    error => (
      error?.name === "ProfileLawRefusalError" &&
      error?.code === "PROFILE_LAW_UNSUPPORTED" &&
      /no fallback/i.test(error?.profileLaw?.errors?.[0] || "")
    )
  );
});

test("every R-OSSE UI owner changes canonical station geometry", () => {
  const baseline = engine.twoWayPlan({
    ...smoothBase,
    _smart2waySchema: 3,
    profileLaw: "rosse",
  });
  const mutations = {
    rosseThroatAngle: 9,
    rosseK: 2.1,
    rosseApexRadiusFactor: 0.4,
    rosseB: 0.4,
    rosseM: 0.85,
    rosseQ: 4.2,
  };
  const hashes = new Set([baseline.st.profileHash]);
  for (const [field, value] of Object.entries(mutations)) {
    const state = {
      ...smoothBase,
      _smart2waySchema: 3,
      profileLaw: "rosse",
      [field]: value,
    };
    const migrated = engine.migrateTwoWayState(state);
    const changed = engine.twoWayPlan(state);
    assert.equal(migrated.profileLaw, "rosse");
    assert.equal(migrated[field], value);
    assert.equal(changed.st.profileLaw.family, "rosse");
    assert.notEqual(
      changed.st.profileHash,
      baseline.st.profileHash,
      `${field} did not change the canonical profile hash`,
    );
    assert.notDeepEqual(
      coordinates(changed.st.pts),
      coordinates(baseline.st.pts),
      `${field} did not change canonical station coordinates`,
    );
    hashes.add(changed.st.profileHash);
  }
  assert.equal(hashes.size, Object.keys(mutations).length + 1);
});

test("pre-release UI exposes every acoustically explicit law and R-OSSE owners", () => {
  assert.equal(engine.PROFILE_LAW_DEFAULTS.profileLaw, "conical");
  for (const family of [
    "conical",
    "classicOS",
    "osse",
    "rosse",
  ]) {
    assert.match(shell, new RegExp(`<option value=["']${family}["']`));
  }
  assert.doesNotMatch(
    shell,
    /<option value=["'](?:legacyEasedConical|regressionEasedConical)["']/
  );
  const selector = shell.slice(
    shell.indexOf('<select id="profileLaw">'),
    shell.indexOf("</select>", shell.indexOf('<select id="profileLaw">')),
  );
  assert.doesNotMatch(selector, /value=["']rosse["'][^>]*disabled/);
  for (const [id, value] of Object.entries({
    rosseThroatAngle: 7.5,
    rosseK: 1.8,
    rosseApexRadiusFactor: 0.3,
    rosseB: 0.3,
    rosseM: 0.8,
    rosseQ: 3.7,
  })) {
    assert.match(shell, new RegExp(`id=["']${id}["'][^>]*type=["']number["']`));
    assert.match(shell, new RegExp(`${id}:${String(value).replace(".", "\\.")}`));
  }
  assert.match(shell, /RETAINED PUBLISHED FORWARD BODY/);
  assert.match(shell, /FLAT-BAFFLE TRUNCATION BEFORE ROLLBACK/);
  assert.match(shell, /NATIVE ROLLBACK NOT INCLUDED/);
  assert.match(shell, /id="profileLawNote"/);
  assert.match(shell, /HORN PROFILE LAW/);
  assert.match(shell, /profileHash/);
  assert.match(shell, /Cross-section \/ Lamé shaping is a separate engineering topology/);
});
