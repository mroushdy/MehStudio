import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const engine = require(path.join(root, "engine.js"));

const ossePanel = {
  ...engine.TWO_ARCH.panel.defaults,
  topo: "2way",
  twoArch: "panel",
  twoFamily: "panel",
  twoDesign: "arch:panel",
  tapBasis: "model",
  style: "smooth",
  profileLaw: "osse",
  seN: 6,
  covH: 90,
  covV: 60,
  mouthW: 32,
  mouthCap: 64,
  wallT: 0.018,
  td: 1.4,
  throat: 1.4,
  cdSel: "dcx464",
  cdFloor: 300,
  nW: 2,
  panelAxis: "horizontal",
  npW: 2,
  wPre: "ndl88",
  odW: 31.5,
  dpW: 14,
  sdW: 522,
  vtcW: 180,
  xmW: 8,
  frameW: "round",
  boltNW: 8,
  bcdW: 298,
  boltDW: 7,
  cutoutW: 282,
  gasketW: 1.6,
  twoXO: 370,
  tapCRW: 4,
  driverCellConstruction: "integrated",
  osseThroatAngle: 7.5,
  osseK: 1.8,
  osseS: 0.7,
  osseTerminationN: 4,
  osseQ: 0.995
};

function radialDetachableStress(overrides = {}) {
  return {
    ...engine.TWO_ARCH.radial.defaults,
    topo: "2way",
    twoArch: "radial",
    twoFamily: "radial",
    twoDesign: "arch:radial",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
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
    nW: 4,
    npW: 1,
    wPre: "w8",
    odW: 22.5,
    dpW: 9,
    sdW: 220,
    vtcW: 80,
    xmW: 7,
    frameW: "round",
    twoXO: 400,
    tapCRW: 5,
    driverCellConstruction: "cartridge",
    mountRing: "ring",
    radialRotation: 22.5,
    adapterReachMode: "manual",
    adapterReach: 178,
    osseThroatAngle: 7.5,
    osseK: 1.8,
    osseS: 0.7,
    osseTerminationN: 4,
    osseQ: 0.995,
    ...overrides
  };
}

function panelBlindBaseStress(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
    nW: 2,
    npW: 1,
    shW: "round",
    tapShapeW: "round",
    panelAxis: "horizontal",
    driverCellConstruction: "integrated",
    mountRing: "integrated",
    wPre: "custom",
    twoXO: 400,
    tapCRW: 6,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdFloor: 300,
    phaseMargin: 1.2,
    rollR: 2,
    covH: 60,
    covV: 60,
    odW: 31.5,
    sdW: 522,
    dpW: 14,
    xmW: 8,
    mouthW: 20,
    mouthCap: 20,
    ...overrides
  };
}

test("new two-way states use conical while explicit internal oracle remains callable", () => {
  assert.equal(
    engine.migrateTwoWayState({
      ...ossePanel,
      profileLaw: undefined
    }).profileLaw,
    "conical"
  );
  assert.equal(
    engine.migrateTwoWayState({
      ...ossePanel,
      profileLaw: "regressionEasedConical"
    }).profileLaw,
    "regressionEasedConical"
  );
});

test("retired family and mount aliases do not restore pre-release semantics", () => {
  const retiredFamily = engine.migrateTwoWayState({
    ...ossePanel,
    twoArch: "distributed",
    twoFamily: "distributed",
    twoDesign: "arch:distributed",
  });
  assert.equal(retiredFamily.twoArch, "panel");
  assert.equal(retiredFamily.twoFamily, "panel");
  assert.equal(retiredFamily.twoDesign, "arch:panel");

  const retiredMount = engine.migrateTwoWayState({
    ...ossePanel,
    driverCellConstruction: undefined,
    mountRing: "ring",
  });
  assert.equal(retiredMount.driverCellConstruction, "integrated");
  assert.equal(retiredMount.mountRing, "integrated");

  const explicitCartridge = engine.migrateTwoWayState({
    ...ossePanel,
    driverCellConstruction: "cartridge",
    mountRing: "integrated",
  });
  assert.equal(explicitCartridge.driverCellConstruction, "cartridge");
  assert.equal(explicitCartridge.mountRing, "ring");
});

test("OS-SE 32-inch panel is rejected and Smart Adapt grows to first legal integer mouth", () => {
  const raw = engine.twoWayPlan(ossePanel);
  assert.equal(raw.mountEnvelopeComplete, false);
  assert.ok(raw.mountEnvelopeClearance < -0.020);
  assert.ok(raw.mountEnvelopeCoverage < 1);

  const rawEvaluation = engine.evaluate2way(ossePanel);
  const rawLaw = rawEvaluation.rows.find(
    row => row.code === "DRIVER_BEARING_ENVELOPE_INCOMPLETE"
  );
  assert.ok(rawLaw);
  assert.equal(rawLaw.st, "fail");
  assert.equal(rawLaw.grow, true);

  const solved = engine.solve(ossePanel);
  assert.equal(solved.S.mouthW, 41);
  assert.equal(solved.S.mountEnvelopeMinMouthW, 41);
  assert.equal(solved.infeasible, false);
  assert.equal(solved.ev.plan.mountEnvelopeComplete, true);
  assert.equal(solved.ev.plan.mountEnvelopeCoverage, 1);
  assert.ok(
    solved.ev.plan.mountEnvelopeClearance >=
      solved.ev.plan.mountEnvelopeRequiredClearance
  );
  assert.equal(solved.ev.plan.mountEnvelopeMinimumMouthIn, 41);
});

test("mount-envelope mouth cap refuses instead of clipping the bearing land", () => {
  const held = engine.solve({ ...ossePanel, mouthCap: 40 });
  assert.equal(held.infeasible, true);
  assert.ok(
    held.ev.rows.some(
      row => row.code === "DRIVER_BEARING_ENVELOPE_INCOMPLETE"
        && row.st === "fail"
    )
  );
  assert.equal(held.ev.plan.mountEnvelopeComplete, false);
});

test("panel boss depth cannot hide an illegal blind-pocket bearing base", () => {
  const state = panelBlindBaseStress();
  const raw = engine.twoWayPlan(state);
  assert.ok(
    Math.abs(
      raw.adapterReach
        - (
          raw.mountEnvelopeAxialStartOffset
            + raw.driverCell.frontChamber.requiredAxialDepthM
            + raw.panelRootWeb
        )
    ) < 1e-12
  );
  assert.ok(Math.abs(raw.mountEnvelopeAxialStartOffset - 0.009) < 1e-12);
  assert.ok(
    Math.abs(
      raw.mountEnvelopePanelBlindDepth
        - (
          raw.driverCell.frontChamber.requiredAxialDepthM
            + raw.panelRootWeb
        )
    ) < 1e-12
  );
  assert.ok(
    Math.abs(raw.mountEnvelopeClearance - (-0.01879656547633546)) < 1e-12
  );
  assert.equal(raw.mountEnvelopeComplete, false);

  const forced = engine.twoWayPlan({
    ...state,
    mountEnvelopeReachMm: 77
  });
  assert.equal(forced.adapterReach, raw.adapterReach);
  assert.equal(forced.mountEnvelopeClearance, raw.mountEnvelopeClearance);
  assert.equal(
    forced.mountEnvelopeAxialStartOffset,
    raw.mountEnvelopeAxialStartOffset
  );

  const held = engine.solve({
    ...state,
    mountEnvelopeReachMm: 77
  });
  assert.equal(held.infeasible, true);
  assert.equal(held.S.mouthW, 20);
  assert.equal(Object.hasOwn(held.S, "mountEnvelopeReachMm"), false);
  assert.equal(held.ev.plan.mountEnvelopeComplete, false);
  assert.throws(
    () => engine.twoWayMeshPreflight(state, "display"),
    error => {
      assert.equal(error?.code, "DRIVER_BEARING_ENVELOPE_INCOMPLETE");
      return true;
    }
  );
});

test("every selectable profile law returns a completely retained panel bearing land", () => {
  for (const profileLaw of ["conical", "classicOS", "osse"]) {
    const solved = engine.solve({ ...ossePanel, profileLaw });
    assert.equal(solved.infeasible, false, profileLaw);
    assert.equal(solved.ev.plan.mountEnvelopeComplete, true, profileLaw);
    assert.equal(solved.ev.plan.mountEnvelopeCoverage, 1, profileLaw);
    assert.ok(
      solved.ev.plan.mountEnvelopeClearance >=
        solved.ev.plan.mountEnvelopeRequiredClearance,
      profileLaw
    );
  }
});

test("radial integrated OS-SE package grows before accepting an incomplete annulus", () => {
  const state = {
    ...engine.TWO_ARCH.radial.defaults,
    topo: "2way",
    twoArch: "radial",
    twoFamily: "radial",
    twoDesign: "arch:radial",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
    seN: 6,
    covH: 90,
    covV: 60,
    mouthW: 32,
    mouthCap: 64,
    wallT: 0.012,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    nW: 8,
    npW: 1,
    wPre: "custom",
    odW: 20.32,
    dpW: 9,
    sdW: 220,
    vtcW: 100,
    xmW: 7,
    frameW: "round",
    boltNW: 8,
    bcdW: 190,
    boltDW: 6.5,
    gasketW: 1.6,
    twoXO: 400,
    tapCRW: 5,
    driverCellConstruction: "integrated",
    adapterReachMode: "auto",
    adapterReach: 35,
    osseThroatAngle: 7.5,
    osseK: 1.8,
    osseS: 0.7,
    osseTerminationN: 4,
    osseQ: 0.995
  };
  const raw = engine.twoWayPlan(state);
  assert.equal(raw.mountEnvelopeComplete, false);
  assert.ok(raw.mountEnvelopeClearance < 0);

  const solved = engine.solve(state);
  assert.ok(solved.S.mouthW > state.mouthW);
  assert.equal(solved.infeasible, false);
  assert.equal(solved.ev.plan.mountEnvelopeComplete, true);
  assert.equal(solved.ev.plan.mountEnvelopeCoverage, 1);
  assert.ok(
    solved.ledger.some(
      item => item.knob === "mouthW"
        && /driver bearing and bolt land/.test(item.why)
    )
  );
});

test("dense commit validation repairs a coarse radial false-positive", () => {
  const state = radialDetachableStress();
  const coarse = engine.twoWayPlan(state, {
    deferRetention: true,
    coarseRadialDiagnostics: true
  });
  const dense = engine.twoWayPlan(state, { deferRetention: true });
  assert.equal(coarse.mountEnvelopeComplete, true);
  assert.equal(coarse.mountEnvelopeCoverage, 1);
  assert.equal(dense.mountEnvelopeComplete, false);
  assert.ok(dense.mountEnvelopeCoverage < 1);
  assert.ok(
    dense.mountEnvelopeClearance <
      dense.mountEnvelopeRequiredClearance
  );

  const adapted = engine.smartAdapt2way(state, "repair", {});
  assert.equal(adapted.S2.mouthW, 37);
  assert.equal(adapted.S2.adapterReach, 178);
  assert.ok(
    adapted.ledger.some(
      item => item.knob === "mouthW"
        && /dense-verified mouth/.test(item.why)
    )
  );
  const solved = engine.solve(state);
  assert.equal(solved.S.mouthW, 37);
  assert.equal(solved.S.adapterReach, 178);
  assert.equal(solved.infeasible, false);
  assert.equal(solved.ev.plan.mountEnvelopeComplete, true);
  assert.equal(solved.ev.plan.mountEnvelopeCoverage, 1);
});

test("exact preflight refuses illegal mount envelopes before mesh budgeting", () => {
  for (const state of [
    { ...ossePanel, mouthCap: 40 },
    radialDetachableStress({ mouthCap: 36 })
  ]) {
    assert.throws(
      () => engine.twoWayMeshPreflight(state, "display"),
      error => {
        assert.equal(error?.code, "DRIVER_BEARING_ENVELOPE_INCOMPLETE");
        assert.equal(error?.details?.budget, undefined);
        assert.ok(error?.details?.coverage < 1
          || error?.details?.clearance <
            error?.details?.requiredClearance);
        return true;
      }
    );
  }
});
