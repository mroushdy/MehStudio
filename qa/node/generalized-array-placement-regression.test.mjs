import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const length = (a) => Math.hypot(...a);
const distance = (a, b) => length(sub(a, b));
const reflected = ([x, y, z]) => [x, -y, -z];
const degrees = (radians) => radians * 180 / Math.PI;

function baseState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    covH: 90,
    covV: 60,
    mouthW: 32,
    requestedMouthW: 32,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    nW: 4,
    npW: 2,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    wPre: "w5",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    frameW: "round",
    boltNW: 4,
    bcdW: undefined,
    boltDW: 5,
    gasketW: 1.6,
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    adapterReach: 35,
    adapterReachMode: "auto",
    osseThroatAngle: 7.5,
    osseK: 1.8,
    osseS: 0.7,
    osseTerminationN: 4,
    osseQ: 0.995,
    driverArrayMode: "manual",
    driverArrayRotationDeg: 0,
    ...overrides,
  };
}

function assertPlacementSchema(plan, expectedCount) {
  const placement = plan.arrayPlacement;
  assert.equal(placement.schemaVersion, 1);
  assert.ok(["auto", "manual"].includes(placement.mode));
  assert.equal(placement.periodDeg, 360 / expectedCount);
  assert.ok(placement.solvedRotationDeg >= 0);
  assert.ok(placement.solvedRotationDeg < placement.periodDeg);
  assert.equal(placement.classifications.length, expectedCount);
  assert.equal(plan.drivers.length, expectedCount);
  for (let index = 0; index < expectedCount; index += 1) {
    const classification = placement.classifications[index];
    const driver = plan.drivers[index];
    assert.equal(classification.driverIndex, driver.index);
    assert.ok(
      Math.abs(classification.phiDeg - degrees(driver.phi)) < 1e-8,
    );
  }
}

function assertCompleteOpposedArray(plan) {
  const count = plan.drivers.length;
  assert.equal(count % 2, 0);
  for (let index = 0; index < count / 2; index += 1) {
    const driver = plan.drivers[index];
    const opposite = plan.drivers[index + count / 2];
    assert.ok(distance(reflected(driver.surface), opposite.surface) < 1e-8);
    assert.ok(distance(reflected(driver.mountN), opposite.mountN) < 1e-8);
    assert.equal(driver.ports.length, opposite.ports.length);
    for (const port of driver.ports) {
      assert.ok(
        Math.min(...opposite.ports.map((candidate) => (
          distance(reflected(port.center), candidate.center)
        ))) < 1e-8,
        `driver ${driver.index} tap lacks an opposed symmetric partner`,
      );
    }
  }
}

function sortedSurfaceSignature(plan) {
  return plan.drivers
    .map((driver) => driver.surface.map((value) => +value.toFixed(10)))
    .sort((a, b) => (
      a[1] - b[1] || a[2] - b[2] || a[0] - b[0]
    ));
}

test("two-driver left/right and top/bottom presets are exact manual rotations", () => {
  const leftRight = engine.twoWayPlan(baseState({
    nW: 2,
    driverArrayMode: "manual",
    driverArrayRotationDeg: 0,
  }));
  const topBottom = engine.twoWayPlan(baseState({
    nW: 2,
    driverArrayMode: "manual",
    driverArrayRotationDeg: 90,
  }));
  assertPlacementSchema(leftRight, 2);
  assertPlacementSchema(topBottom, 2);
  assert.deepEqual(
    leftRight.drivers.map((driver) => +degrees(driver.phi).toFixed(9)),
    [0, 180],
  );
  assert.deepEqual(
    topBottom.drivers.map((driver) => +degrees(driver.phi).toFixed(9)),
    [90, 270],
  );
  assert.equal(leftRight.arrayPlacement.solvedRotationDeg, 0);
  assert.equal(topBottom.arrayPlacement.solvedRotationDeg, 90);
  assertCompleteOpposedArray(leftRight);
  assertCompleteOpposedArray(topBottom);

  const migratedHorizontal = engine.migrateTwoWayState({
    ...baseState({ nW: 2 }),
    driverArrayMode: undefined,
    driverArrayRotationDeg: undefined,
    panelAxis: "horizontal",
  });
  const migratedVertical = engine.migrateTwoWayState({
    ...baseState({ nW: 2 }),
    driverArrayMode: undefined,
    driverArrayRotationDeg: undefined,
    panelAxis: "vertical",
  });
  assert.equal(migratedHorizontal.driverArrayMode, "manual");
  assert.equal(migratedHorizontal.driverArrayRotationDeg, 0);
  assert.equal(migratedVertical.driverArrayMode, "manual");
  assert.equal(migratedVertical.driverArrayRotationDeg, 90);
});

test("two-driver seam preset follows the actual panel vertex ray", () => {
  const fixtures = [
    { covH: 90, covV: 60, expectedDeg: 30 },
    { covH: 90, covV: 90, expectedDeg: 45 },
  ];
  for (const fixture of fixtures) {
    const reference = engine.twoWayPlan(baseState({
      nW: 2,
      style: "angular",
      seN: 12,
      covH: fixture.covH,
      covV: fixture.covV,
      driverArrayMode: "manual",
      driverArrayRotationDeg: 0,
    }));
    assert.ok(
      Math.abs(
        reference.arrayPlacement.seamPresetRotationDeg - fixture.expectedDeg,
      ) < 1e-9,
      `${fixture.covH}×${fixture.covV} seam preset is not its vertex ray`,
    );
    assert.ok(reference.arrayPlacement.seamPresetMinimumGapM > 0);

    const onSeam = engine.twoWayPlan(baseState({
      nW: 2,
      style: "angular",
      seN: 12,
      covH: fixture.covH,
      covV: fixture.covV,
      driverArrayMode: "manual",
      driverArrayRotationDeg:
        reference.arrayPlacement.seamPresetRotationDeg,
    }));
    assert.ok(
      onSeam.arrayPlacement.classifications.every(
        (classification) => classification.kind === "seam-corner",
      ),
      `${fixture.covH}×${fixture.covV} seam preset missed a panel corner`,
    );
  }
});

for (const [count, rotation] of [[4, 17], [6, 11]]) {
  test(`${count} drivers rotate as one complete symmetric array`, () => {
    const plan = engine.twoWayPlan(baseState({
      nW: count,
      driverArrayMode: "manual",
      driverArrayRotationDeg: rotation,
    }));
    assertPlacementSchema(plan, count);
    assert.equal(plan.arrayPlacement.mode, "manual");
    assert.ok(
      Math.abs(plan.arrayPlacement.solvedRotationDeg - rotation) < 1e-10,
    );
    const period = 360 / count;
    for (let index = 0; index < count; index += 1) {
      assert.ok(
        Math.abs(
          degrees(plan.drivers[index].phi) - (rotation + index * period),
        ) < 1e-8,
      );
    }
    assertCompleteOpposedArray(plan);
  });
}

test("manual array rotation is periodic over exactly one symmetry interval", () => {
  for (const count of [2, 4, 6]) {
    const period = 360 / count;
    const first = engine.twoWayPlan(baseState({
      nW: count,
      driverArrayMode: "manual",
      driverArrayRotationDeg: 7.25,
    }));
    const periodic = engine.twoWayPlan(baseState({
      nW: count,
      driverArrayMode: "manual",
      driverArrayRotationDeg: 7.25 + period,
    }));
    assert.deepEqual(
      sortedSurfaceSignature(periodic),
      sortedSurfaceSignature(first),
    );
    assert.equal(
      periodic.arrayPlacement.solvedRotationDeg,
      first.arrayPlacement.solvedRotationDeg,
    );
    assert.deepEqual(
      periodic.arrayPlacement.classifications,
      first.arrayPlacement.classifications,
    );
  }
});

test("Auto fit is deterministic and preserves the requested count", () => {
  const state = baseState({
    nW: 6,
    style: "angular",
    seN: 12,
    driverArrayMode: "auto",
    driverArrayRotationDeg: 23,
  });
  const first = engine.twoWayPlan(state);
  const second = engine.twoWayPlan(state);
  assertPlacementSchema(first, 6);
  assert.equal(first.arrayPlacement.mode, "auto");
  assert.deepEqual(first.arrayPlacement, second.arrayPlacement);
  assert.deepEqual(sortedSurfaceSignature(first), sortedSurfaceSignature(second));
  assertCompleteOpposedArray(first);
});

test("faceted classification agrees with canonical face and seam ownership", () => {
  const fixtures = [
    { rotation: 0, expected: "face-center" },
    { rotation: 45, expected: "seam-corner" },
    { rotation: 15, expected: "intermediate" },
  ];
  for (const fixture of fixtures) {
    const plan = engine.twoWayPlan(baseState({
      nW: 4,
      style: "angular",
      seN: 12,
      covV: 90,
      driverArrayMode: "manual",
      driverArrayRotationDeg: fixture.rotation,
    }));
    assertPlacementSchema(plan, 4);
    assert.equal(plan.panelTopology.faces.length, 4);
    assert.ok(
      plan.arrayPlacement.classifications.every(
        (classification) => classification.kind === fixture.expected,
      ),
      `rotation ${fixture.rotation}° was not classified ${fixture.expected}`,
    );
    for (const classification of plan.arrayPlacement.classifications) {
      const driver = plan.drivers[classification.driverIndex];
      if (classification.kind === "seam-corner") {
        assert.equal(driver.panelPlacement.kind, "corner");
        assert.equal(classification.seamId, driver.panelPlacement.seamId);
        assert.deepEqual(
          classification.faceIds,
          driver.panelPlacement.faceIds,
        );
      } else {
        assert.equal(driver.panelPlacement.kind, "face");
        assert.equal(classification.seamId, null);
        assert.deepEqual(
          classification.faceIds,
          driver.panelPlacement.faceIds,
        );
      }
    }
  }
});

test("smooth elliptical rotation changes the physical layout meaningfully", () => {
  const axis = engine.twoWayPlan(baseState({
    nW: 4,
    driverArrayMode: "manual",
    driverArrayRotationDeg: 0,
  }));
  const rotated = engine.twoWayPlan(baseState({
    nW: 4,
    driverArrayMode: "manual",
    driverArrayRotationDeg: 20,
  }));
  assert.ok(
    axis.arrayPlacement.classifications.every(
      (classification) => classification.kind === "smooth-surface",
    ),
  );
  assert.ok(
    rotated.arrayPlacement.classifications.every(
      (classification) => classification.kind === "smooth-surface",
    ),
  );
  assert.ok(
    Math.max(...axis.drivers.map((driver, index) => (
      distance(driver.surface, rotated.drivers[index].surface)
    ))) > 0.01,
    "smooth ellipse rotation did not move the driver array",
  );
});

test("bearing frames stay planar while smooth paired tap axes remain shared", () => {
  const fixtures = [
    baseState({
      nW: 2,
      wPre: "nw10",
      odW: 26.1,
      dpW: 11.9,
      sdW: 320,
      vtcW: 1400,
      xmW: 6.8,
      boltNW: 8,
      bcdW: 244,
      boltDW: 6.5,
      driverArrayRotationDeg: 0,
    }),
    baseState({
      nW: 6,
      driverArrayRotationDeg: 11,
    }),
  ];
  for (const state of fixtures) {
    const plan = engine.twoWayPlan(state);
    let separated = false;
    for (const driver of plan.drivers) {
      assert.ok(Math.abs(dot(driver.mountN, driver.flow)) < 1e-10);
      assert.ok(Math.abs(dot(driver.mountN, driver.cross)) < 1e-10);
      assert.ok(Math.abs(dot(driver.flow, driver.cross)) < 1e-10);
      assert.ok(
        Math.abs(dot(driver.ports[0].flow, driver.ports[1].flow))
          > 1 - 2e-5,
      );
      separated ||= distance(driver.flow, driver.ports[0].flow) > 1e-4;
    }
    assert.equal(
      separated,
      true,
      "driver-bearing basis was aliased to the shared tap-flow axis",
    );
  }
});
