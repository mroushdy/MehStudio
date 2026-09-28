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
const profileLaws = require(path.join(projectRoot, "profile-laws.js"));
const shell = fs.readFileSync(path.join(projectRoot, "shell.html"), "utf8");

const FAMILIES = Object.freeze(["conical", "classicOS", "osse", "rosse"]);
const ADMITTED_FAMILIES = Object.freeze(["conical", "osse", "rosse"]);
const KEYS = Object.freeze(["fhx6", "refd"]);
const ALL_KEYS = Object.freeze(engine.BUILDS["1way"].map(entry => entry.key));

function fixture(key, family = "conical") {
  const build = engine.BUILDS["1way"].find(entry => entry.key === key);
  assert.ok(build, `missing one-way fixture ${key}`);
  return { ...structuredClone(build.s), profileLaw: family };
}

function tapsFor(state, stations) {
  return engine.layout(state, stations)
    .filter(entry => entry.kind === "coaxtap")
    .map(entry => ({
      x: entry.x,
      phi: entry.phi,
      center: entry.tap,
      slot: entry.slot,
    }));
}

for (const key of KEYS) {
  test(`${key}: profile selection cannot mutate the protected coax interface`, () => {
    const records = ADMITTED_FAMILIES.map(family => {
      const state = fixture(key, family);
      const stations = engine.stations(state);
      return {
        family,
        cone: engine.coneGeom(state),
        waveguide: stations.wgFace,
        xAdapter: stations.xAdapter,
        xTap: stations.xTap,
        taps: tapsFor(state, stations),
        dish: engine.dishMesh(state, true),
      };
    });
    const baseline = records[0];
    for (const record of records.slice(1)) {
      assert.deepEqual(record.cone, baseline.cone,
        `${record.family} changed measured driver evidence`);
      assert.deepEqual(record.waveguide, baseline.waveguide,
        `${record.family} changed the protected R-OSSE`);
      assert.equal(record.xAdapter, baseline.xAdapter);
      assert.equal(record.xTap, baseline.xTap);
      assert.deepEqual(record.taps, baseline.taps,
        `${record.family} changed the tap ring`);
      assert.deepEqual(record.dish, baseline.dish,
        `${record.family} changed the driver plate/apex mesh`);
    }
  });

  test(`${key}: admitted outer laws are distinct and join honestly`, () => {
    const stations = ADMITTED_FAMILIES
      .map(family => engine.stations(fixture(key, family)));
    assert.equal(
      new Set(stations.map(record => record.profileHash)).size,
      ADMITTED_FAMILIES.length,
    );
    assert.equal(
      new Set(stations.map(record => record.depth)).size,
      ADMITTED_FAMILIES.length,
    );

    for (let index = 0; index < stations.length; index += 1) {
      const record = stations[index];
      assert.equal(record.profileLaw.family, ADMITTED_FAMILIES[index]);
      assert.equal(record.profileScope, "post-coax-handoff");
      assert.equal(record.profileOriginX, record.xAdapter);
      assert.equal(record.profileJoin.ok, true);
      assert.equal(record.profileJoin.c0Pass, true);
      assert.equal(record.profileJoin.c1Pass, true);
      assert.equal(record.profileJoin.c2Pass, true);
      assert.equal(record.profileMonotonic.axial, true);
      assert.equal(record.profileMonotonic.radial, true);
      assert.equal(record.rollR, 0);
      assert.equal(
        record.mouthTermination,
        "flat printed baffle; no additional rollback",
      );
      assert.match(record.profileTopologyClass, /engineering approximation/);
      const handoff = engine.dimsAt(record, record.xAdapter);
      assert.equal(handoff.n, 2);
      assert.equal(handoff.a, record.wgFace.pts.at(-1).y);
      assert.equal(handoff.b, record.wgFace.pts.at(-1).y);
    }

    assert.equal(stations[0].profileJoin.mode, "direct-c1");
    for (const record of stations.slice(1)) {
      assert.equal(record.profileJoin.mode, "bounded-c2-bridge");
      assert.ok(record.profileJoin.bridgeLength >= 0.008);
      assert.ok(record.profileJoin.bridgeRise > 0);
      assert.ok(record.profileJoin.maxAbsCurvature <= 250);
      assert.equal(record.profileJoin.fitMode, "first-compatible-native-datum");
      assert.equal(record.profileJoin.slopeReversal, false);
      assert.equal(record.profileJoin.slopeOvershoot, false);
      assert.equal(record.profileJoin.tailSlopeMonotone, true);
      assert.ok(
        record.profileJoin.minimumBridgeSlope
          >= record.profileJoin.source.slope
            - Math.max(1e-7, record.profileJoin.source.slope * 1e-4),
      );
      assert.ok(record.profileJoin.compactness <= 1.25);
      assert.match(record.profileJoin.diagnostic, /TANGENT-MATCHED/);
    }
  });

  test(`${key}: preview/export canonical one-piece mesh stays watertight for every admitted law`, () => {
    for (const family of ADMITTED_FAMILIES) {
      const state = fixture(key, family);
      const mesh = engine.coaxHornMesh(state);
      const audit = engine.meshAudit(mesh);
      assert.equal(audit.badEdges, 0, `${family} has open/nonmanifold edges`);
      assert.equal(audit.badOrientation, 0);
      assert.equal(audit.orientationConflict, 0);
      assert.equal(audit.degenerate, 0);
      assert.equal(audit.duplicateFaces, 0);
      assert.equal(audit.nonFinite, 0);
      assert.equal(audit.components, 1);
      assert.ok(engine.stlBytes(mesh).byteLength > 84);
    }
  });
}

test("every known one-way preset admits only tangent-compatible laws without moving its protected core", () => {
  for (const key of ALL_KEYS) {
    const baselineState = fixture(key, "conical");
    const baselineStations = engine.stations(baselineState);
    const baselineCore = {
      cone: engine.coneGeom(baselineState),
      waveguide: baselineStations.wgFace,
      xAdapter: baselineStations.xAdapter,
      xTap: baselineStations.xTap,
      taps: tapsFor(baselineState, baselineStations),
    };
    const hashes = new Set();
    for (const family of ADMITTED_FAMILIES) {
      const state = fixture(key, family);
      const stations = engine.stations(state);
      hashes.add(stations.profileHash);
      assert.deepEqual(engine.coneGeom(state), baselineCore.cone);
      assert.deepEqual(stations.wgFace, baselineCore.waveguide);
      assert.equal(stations.xAdapter, baselineCore.xAdapter);
      assert.equal(stations.xTap, baselineCore.xTap);
      assert.deepEqual(tapsFor(state, stations), baselineCore.taps);
      assert.equal(stations.profileJoin.ok, true);
    }
    assert.equal(
      hashes.size,
      ADMITTED_FAMILIES.length,
      `${key} compatible laws must remain distinct`,
    );
    assert.throws(
      () => engine.stations(fixture(key, "classicOS")),
      error => (
        error?.name === "ProfileLawInterfaceRefusalError"
        && error?.code === "PROFILE_HANDOFF_TANGENT_UNMATCHED"
        && error?.profileInterface?.tangentFit?.maximumNativeSlope
          < error?.profileInterface?.tangentFit?.sourceSlope
      ),
      `${key} must refuse a Classic OS tail that cannot catch the coax tangent`,
    );
  }
});

test("large post-coax start radii are valid for every scale-invariant law", () => {
  const common = {
    throatRadius: 0.1055,
    mouthRadius: 0.2159,
    nominalHalfAngle: 35 * Math.PI / 180,
    samples: 49,
  };
  for (const family of FAMILIES) {
    const record = profileLaws.solveProfileLaw({
      ...common,
      family,
      throatHalfAngle: 7.5 * Math.PI / 180,
      k: 1.8,
      s: 0.7,
      terminationExponent: 4,
      q: 0.995,
      ...(family === "rosse" ? {
        apexRadiusFactor: 0.3,
        bending: 0.3,
        apexShift: 0.8,
        throatShape: 3.7,
      } : {}),
    });
    assert.equal(record.ok, true, `${family}: ${record.errors || ""}`);
    assert.equal(record.extent.throatRadius, common.throatRadius);
    assert.equal(record.extent.mouthRadius, common.mouthRadius);
  }
});

test("unsafe or undersized one-way profile interfaces refuse without fallback", () => {
  const state = fixture("fhx6", "osse");
  const handoffRadius = engine.coneGeom(state).rFrame + 0.012;
  const tinyMouthInches = 2 * (handoffRadius + 0.002) / engine.IN;
  assert.throws(
    () => engine.stations({ ...state, mouthW: tinyMouthInches }),
    error => (
      error?.name === "ProfileLawInterfaceRefusalError"
      && error?.code === "PROFILE_HANDOFF_TANGENT_UNMATCHED"
    ),
  );
  assert.throws(
    () => engine.stations({ ...state, profileLaw: "unknown-curvature" }),
    error => (
      error?.name === "ProfileLawInterfaceRefusalError"
      && error?.code === "PROFILE_LAW_UNSUPPORTED"
    ),
  );
  assert.throws(
    () => engine.stations({ ...state, profileLaw: "osse", covH: 30 }),
    error => (
      error?.name === "ProfileLawRefusalError"
      && error?.code === "PROFILE_INPUT_INVALID"
    ),
  );
});

test("one-way profile UI is visible, scoped, schema-reset and shares coaxHornMesh", () => {
  assert.match(shell, /window\.MEH_BUILD=654/);
  assert.match(shell, /const TWO_WAY_STATE_SCHEMA=3/);
  assert.match(
    shell,
    /candidate&&candidate\._smart2waySchema===TWO_WAY_STATE_SCHEMA/,
  );
  assert.match(
    shell,
    /SHARED OUTER HORN PROFILE — DOWNSTREAM OF FIXED COAX CORE/,
  );
  assert.match(shell, /CD EXIT Ø/);
  assert.match(shell, /PRINTED HORN THROAT ID Ø/);
  assert.match(shell, /THROAT COLLAR/);
  assert.match(
    shell,
    /show\('profileLawCtl',one\|\|S\.style==='smooth'\|\|S\.style==='curvedFacets'\)/,
  );
  assert.match(shell, /show\('rollCtl',false\)/);
  assert.match(shell, /BOUNDED C2 BRIDGE/);
  assert.match(
    shell,
    /S\.topo==='1way'\?MEH2\.coaxHornMesh\(S\):MEH2\.shellMesh\(S\)/,
  );
  assert.match(
    shell,
    /S\.topo==='1way'\?MEH2\.coaxHornMesh\(r\.S\):MEH2\.shellMesh\(r\.S\)/,
  );
  for (const build of engine.BUILDS["1way"]) {
    assert.equal(build.s.profileLaw, "conical",
      `${build.key} must own its pre-release profile default`);
  }
});

test("round equal-axis mapping is exact; square/stretch mapping is labelled approximate", () => {
  const round = engine.stations({
    ...fixture("fhx6", "osse"),
    style: "smooth",
    seN: 2,
    covH: 70,
    covV: 70,
  });
  const square = engine.stations(fixture("fhx6", "osse"));
  assert.equal(round.profileTopologyClass, "exact axisymmetric round");
  assert.match(square.profileTopologyClass, /engineering approximation/);
  assert.equal(round.profileLaw.coverageClaim, false);
  assert.equal(square.profileLaw.coverageClaim, false);
});

test("48-inch OS-SE round state trims the low-slope prefix instead of drawing a pinched S", () => {
  const state = {
    ...fixture("fhx6", "osse"),
    style: "smooth",
    sectionFamily: "ellipse",
    seN: 2,
    covH: 90,
    covV: 90,
    mouthW: 48,
    coaxXO: 2500,
    osseThroatAngle: 7,
    osseK: 0.5,
    osseS: 0.75,
    osseTerminationN: 2,
    osseQ: 0.995,
  };
  const stations = engine.stations(state);
  const join = stations.profileJoin;

  assert.equal(stations.profileTopologyClass, "exact axisymmetric round");
  assert.equal(join.fitMode, "first-compatible-native-datum");
  assert.ok(Math.abs(join.bridgeLength - 0.05061433602987719) <= 2e-12);
  assert.ok(Math.abs(join.nativeStartU - 0.23193359375) <= 2e-12);
  assert.ok(join.requestedNativeThroatSlope < 0.13);
  assert.ok(join.source.slope > 0.99);
  assert.ok(join.target.slope >= join.source.slope);
  assert.equal(join.slopeReversal, false);
  assert.equal(join.slopeOvershoot, false);
  assert.equal(join.tailSlopeMonotone, true);
  assert.ok(join.compactness <= join.compactnessLimit);
  assert.ok(join.maxAbsCurvature < 2);

  let previousArea = -Infinity;
  for (const point of stations.pts) {
    assert.ok(Math.abs(point.a - point.b) <= 1e-12);
    const area = Math.PI * point.a * point.b;
    assert.ok(area >= previousArea - 1e-12);
    previousArea = area;
  }

  const audit = engine.meshAudit(engine.coaxHornMesh(state));
  assert.equal(audit.badEdges, 0);
  assert.equal(audit.badOrientation, 0);
  assert.equal(audit.nonFinite, 0);
  assert.equal(audit.components, 1);
});
