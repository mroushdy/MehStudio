import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const transferRoot = path.resolve(projectRoot, "../..");
const engine = require(path.join(projectRoot, "engine.js"));
const profileLaws = require(path.join(projectRoot, "profile-laws.js"));
const canonical = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "qa/cases/canonical.json"), "utf8"),
);
const knownBuilds = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "reference/known-builds.json"), "utf8"),
);
const sourceStudy = fs.readFileSync(
  path.join(transferRoot, "engineering/docs/REFERENCE_LIBRARY_STUDY.md"),
  "utf8",
);
const contract = fs.readFileSync(
  path.join(projectRoot, "docs/build649-source-family-contract.md"),
  "utf8",
);

const PROFILE_FAMILIES = Object.freeze(["conical", "classicOS", "osse", "rosse"]);

function build(topology, key) {
  const record = engine.BUILDS[topology].find(entry => entry.key === key);
  assert.ok(record, `missing ${topology} source record ${key}`);
  return record;
}

function coaxCore(state) {
  const cone = engine.coneGeom(state);
  const stations = engine.stations(state);
  return {
    cone,
    tapDesign: engine.coaxTapDesign(state, cone),
    waveguideFace: stations.wgFace,
    xAdapter: stations.xAdapter,
    xTap: stations.xTap,
    taps: engine.layout(state, stations)
      .filter(entry => entry.kind === "coaxtap")
      .map(entry => ({
        x: entry.x,
        phi: entry.phi,
        tap: entry.tap,
        slot: entry.slot,
      })),
  };
}

function twoWayTapSnapshot(plan) {
  return {
    family: plan.family,
    station: plan.station,
    totalArea: plan.totalArea,
    passage: plan.passage,
    chamberV: plan.chamberV,
    compressionRatio: plan.cr,
    ports: plan.allPorts.map(port => ({
      driver: port.driver,
      index: port.index,
      center: port.center,
      sa: port.sa,
      sb: port.sb,
      area: port.area,
    })),
  };
}

test("shared math is canonical while one-way and two-way tap kernels remain separate", () => {
  assert.equal(engine.solveProfileLaw, profileLaws.solveProfileLaw);
  assert.equal(engine.PROFILE_LAW_SCHEMAS, profileLaws.PROFILE_LAW_SCHEMAS);
  for (const family of ["ellipse", "superellipse", "roundedRectangle"]) {
    assert.equal(engine.sectionFamilySchema(family)?.supported, true);
  }

  const oneWay = structuredClone(build("1way", "fhx6").s);
  const oneWayBaseline = engine.coaxTapDesign(oneWay, engine.coneGeom(oneWay));
  const pollutedOneWay = engine.coaxTapDesign({
    ...oneWay,
    tapCRW: 1.500001,
    twoXO: 19999,
    tapStationW: 0.001,
    tapAreaW: 9999,
    tapVtcW: 9999,
    npW: 2,
  }, engine.coneGeom(oneWay));
  assert.deepEqual(
    pollutedOneWay,
    oneWayBaseline,
    "two-way fields leaked into the one-way coax entry kernel",
  );

  const twoWay = structuredClone(build("2way", "jmod88").s);
  const twoWayBaseline = twoWayTapSnapshot(engine.twoWayPlan(twoWay));
  const pollutedTwoWay = twoWayTapSnapshot(engine.twoWayPlan({
    ...twoWay,
    tapCR: 31.999,
    coaxXO: 19999,
    coaxTaps: 11,
    tapVtc: 0.501,
    tapLen: 0.099,
  }));
  assert.deepEqual(
    pollutedTwoWay,
    twoWayBaseline,
    "one-way coax fields leaked into the two-way entry kernel",
  );

  assert.ok("center" in oneWayBaseline && "radialInner" in oneWayBaseline);
  assert.ok(!("drivers" in oneWayBaseline) && !("allPorts" in oneWayBaseline));
  const twoWayPlan = engine.twoWayPlan(twoWay);
  assert.ok(Array.isArray(twoWayPlan.drivers) && Array.isArray(twoWayPlan.allPorts));
  assert.ok(!("radialInner" in twoWayPlan));
});

test("admitted laws preserve the protected coax core and incompatible laws fail closed", () => {
  for (const record of engine.BUILDS["1way"]) {
    const baseline = coaxCore({ ...structuredClone(record.s), profileLaw: "conical" });
    for (const profileLaw of PROFILE_FAMILIES.slice(1)) {
      let candidate;
      try {
        candidate = coaxCore({ ...structuredClone(record.s), profileLaw });
      } catch (error) {
        assert.equal(
          profileLaw,
          "classicOS",
          `${record.key}: ${profileLaw} unexpectedly refused`,
        );
        assert.equal(error?.name, "ProfileLawInterfaceRefusalError");
        assert.equal(error?.code, "PROFILE_HANDOFF_TANGENT_UNMATCHED");
        assert.equal(error?.profileInterface?.family, profileLaw);
        assert.ok(error?.profileInterface?.nativeProfileHash);
        assert.match(error?.profileInterface?.reason || "", /never provides/i);
        assert.ok(
          error.profileInterface.tangentFit.maximumNativeSlope
            < error.profileInterface.tangentFit.sourceSlope,
          `${record.key}: refusal does not prove the native tail is incompatible`,
        );
        continue;
      }
      assert.deepEqual(
        candidate,
        baseline,
        `${record.key}: ${profileLaw} moved the protected coax core`,
      );
    }
  }
});

test("Hinson and JMOD remain distinct evidence records with different tap provenance", () => {
  const hinson = build("2way", "hinson10");
  const jmod = build("2way", "jmod88");
  const hinsonPlan = engine.twoWayPlan(structuredClone(hinson.s));
  const jmodPlanA = engine.twoWayPlan(structuredClone(jmod.s));
  const jmodPlanB = engine.twoWayPlan(structuredClone(jmod.s));

  assert.equal(hinson.evidence, "published");
  assert.equal(hinson.s.tapBasis, "published");
  assert.equal(hinson.s.twoDesign, "hinson10");
  assert.match(hinson.source, /101\.6 × 19\.1 mm/);
  assert.equal(hinsonPlan.station * 1000, 143.3);
  assert.equal(hinsonPlan.port.sa * 2000, 101.6);
  assert.equal(hinsonPlan.port.sb * 2000, 19.1);
  assert.equal(hinsonPlan.passage * 1000, 18);
  assert.equal(hinsonPlan.chamberV * 1e6, 700);

  assert.equal(jmod.evidence, "hybrid");
  assert.equal(jmod.s.tapBasis, "model");
  assert.equal(jmod.s.twoDesign, "jmod88");
  assert.match(jmod.source, /not an exact JMOD replica/i);
  assert.notEqual(jmod.source, hinson.source);
  assert.deepEqual(
    twoWayTapSnapshot(jmodPlanA),
    twoWayTapSnapshot(jmodPlanB),
    "JMOD calculated passage is not deterministic",
  );
  assert.equal(jmodPlanA.totalArea, jmod.s.sdW * 1e-4 / jmodPlanA.cr);

  const hinsonReference = knownBuilds.entries.find(
    entry => entry.id === "hinson-panel-2",
  );
  const jmodReference = knownBuilds.entries.find(
    entry => entry.id === "jmod-panel-2",
  );
  assert.ok(hinsonReference && jmodReference);
  assert.notDeepEqual(hinsonReference.tapTraits, jmodReference.tapTraits);
  assert.notEqual(hinsonReference.mount, jmodReference.mount);
});

test("SynTripP and Solana are source-bounded radial adaptations, not recovered CAD", () => {
  const syntripp = build("2way", "syntripp");
  assert.equal(syntripp.evidence, "hybrid");
  assert.equal(syntripp.s.twoArch, "radial");
  assert.equal(syntripp.s.wPre, "cl10");
  assert.equal(syntripp.s.nW, 2);
  assert.equal(syntripp.s.cdSel, "cdx143050");
  assert.match(syntripp.source, /not SynTripP CAD or validated acoustic performance/i);
  const syntrippSolve = engine.solve(structuredClone(syntripp.s));
  assert.equal(syntrippSolve.infeasible, false);
  assert.equal(syntrippSolve.ev.plan.drivers.length, 2);
  assert.equal(syntrippSolve.ev.plan.allPorts.length, 4);

  assert.match(sourceStudy, /Solana waveguide\s+module/);
  assert.match(sourceStudy, /remote rear \(bandpass\) volume/);
  assert.match(
    sourceStudy,
    /front chamber volume\/port dims themselves \(baked into the model/,
  );
  assert.match(contract, /remote-bandpass \/ integrated printed-cell reference/);
  assert.match(contract, /not\s+Hinson panel CAD, not JMOD panel CAD/);
  assert.match(contract, /generic radial-cell adaptation/);

  const solana = build("2way", "solana");
  assert.equal(solana.evidence, "hybrid");
  assert.equal(solana.s.twoArch, "radial");
  assert.equal(solana.s.wPre, "w65");
  assert.equal(solana.s.nW, 4);
  assert.equal(solana.s.npW, 1);
  assert.equal(solana.s.cdSel, "dh450");
  assert.match(solana.source, /not claim an exact Solana replica or validated acoustics/i);
  const solanaSolve = engine.solve(structuredClone(solana.s));
  assert.equal(solanaSolve.infeasible, false);
  assert.equal(solanaSolve.ev.plan.drivers.length, 4);
  assert.equal(solanaSolve.ev.plan.allPorts.length, 4);

  const solanaReference = knownBuilds.entries.find(
    entry => entry.id === "solana-rev103-radial-adaptation",
  );
  assert.ok(solanaReference);
  assert.equal(solanaReference.family, "radial");
  assert.equal(solanaReference.acousticValidation, "not claimed by the MEH Studio adaptation");

  const admitted = engine.migrateTwoWayState({
    ...structuredClone(solana.s),
    _smart2waySchema: 3,
  });
  assert.equal(admitted.twoDesign, "solana");

  for (const [field, value] of [
    ["twoArch", "solana"],
    ["twoFamily", "solana"],
  ]) {
    assert.throws(
      () => engine.migrateTwoWayState({
        _smart2waySchema: 3,
        topo: "2way",
        twoArch: field === "twoArch" ? value : "panel",
        twoFamily: field === "twoFamily" ? value : "panel",
        twoDesign: field === "twoDesign" ? value : "arch:panel",
      }),
      error => (
        error?.code === "CURRENT_STATE_ENUM_UNSUPPORTED"
        && error?.details?.value === "solana"
      ),
      `current-schema ${field}=solana did not refuse`,
    );
  }

  const dh350 = knownBuilds.entries.find(
    entry => entry.id === "local-dh350-meh-half",
  );
  assert.ok(dh350);
  assert.deepEqual(dh350.wooferCounts, []);
  assert.equal(dh350.acousticValidation, "not claimed");
  assert.equal(
    engine.BUILDS["2way"].some(record => /dh350/i.test(record.key)),
    false,
    "the unmeasured DH350 reference became a runnable preset",
  );
});

test("calculated family bounds keep compact and large valid panel witnesses", () => {
  assert.deepEqual(engine.TWO_ARCH.panel.counts, [2, 4, 6]);
  assert.deepEqual(engine.TWO_ARCH.radial.counts, [2, 3, 4, 5, 6, 7, 8]);
  assert.match(engine.TWO_ARCH.panel.source, /Hinson and JMOD are separate sourced records/);
  assert.match(engine.TWO_ARCH.radial.source, /Calculated construction family/);

  for (const [id, count] of [["P03", 2], ["P04", 4]]) {
    const fixture = canonical.cases.find(entry => entry.id === id);
    assert.ok(fixture, `missing canonical calculated witness ${id}`);
    const result = engine.solve({
      ...structuredClone(canonical.baseState),
      ...structuredClone(fixture.overrides),
      topo: "2way",
      twoArch: "panel",
      twoFamily: "panel",
    });
    assert.equal(result.infeasible, false, `${id} failed its package/path laws`);
    assert.equal(result.S.nW, count);
    assert.equal(result.ev.plan.family, "panel");
    assert.equal(result.ev.plan.drivers.length, count);
    assert.equal(result.ev.plan.allPorts.length, count * result.S.npW);
  }
});
