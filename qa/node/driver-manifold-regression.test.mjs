import assert from "node:assert/strict";
import test from "node:test";
import { engine, loadCases } from "./case-loader.mjs";

const p01 = loadCases().find(
  (candidate) => candidate.documentName === "canonical"
    && candidate.id === "P01",
);
assert.ok(p01, "P01 canonical fixture is missing");

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const length = (value) => Math.hypot(...value);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const distance = (a, b) => length(sub(a, b));
const pathLength = (points) => points.slice(1).reduce(
  (sum, point, index) => sum + distance(point, points[index]),
  0,
);
const unit = (value) => {
  const magnitude = Math.max(1e-15, length(value));
  return value.map((item) => item / magnitude);
};
const angle = (a, b) => Math.acos(clamp(dot(unit(a), unit(b)), -1, 1));
const reflectOpposed = ([x, y, z]) => [x, -y, -z];

function close(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function panelState(overrides = {}) {
  return {
    ...p01.state,
    driverCellConstruction: "integrated",
    driverArrayMode: "manual",
    driverArrayRotationDeg: 20,
    ...overrides,
  };
}

function exactPanel(overrides = {}) {
  const solved = engine.solve(panelState(overrides));
  const plan = solved.ev.plan;
  const field = engine.twoWaySolidField(plan);
  const diagnostics = field.driverManifoldDiagnostics;
  const assembly = engine.assemblyAudit(plan, field);
  return { solved, plan, field, diagnostics, assembly };
}

function sixWooferState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    _smart2waySchema: 3,
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
    nW: 6,
    npW: 2,
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
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
    ...overrides,
  };
}

function releasedExtendedCornerState(overrides = {}) {
  return sixWooferState({
    style: "curvedFacets",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 12,
    seN: 12,
    sectionCornerRatio: 0.25,
    mouthW: 26,
    requestedMouthW: 26,
    twoXO: 500,
    tapCRW: 6,
    boltDW: 6.5,
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 72.5,
    driverAxisBlend: 0,
    ...overrides,
  });
}

test("manifold state migration is bounded and shortest cannot retain extension", () => {
  assert.equal(engine.twoWayDriverManifoldSchemaVersion, 1);
  assert.deepEqual(
    engine.twoWayDriverMountModes,
    ["shortest", "extended-manifold"],
  );

  const shortest = engine.migrateTwoWayState(panelState({
    driverMountMode: "shortest",
    driverMountExtraMm: 75,
    driverAxisBlend: 0.8,
  }));
  assert.equal(shortest.driverMountMode, "shortest");
  assert.equal(shortest.driverMountExtraMm, 0);
  assert.equal(shortest.driverAxisBlend, 0.8);

  const bounded = engine.migrateTwoWayState(panelState({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 999,
    driverAxisBlend: -2,
  }));
  assert.equal(bounded.driverMountMode, "extended-manifold");
  assert.equal(bounded.driverMountExtraMm, 250);
  assert.equal(bounded.driverAxisBlend, 0);
});

test("extended zero-reach wall-normal mode preserves shortest acoustic geometry", () => {
  const shortest = exactPanel({
    driverMountMode: "shortest",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
  });
  const zero = exactPanel({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
  });

  assert.equal(shortest.solved.infeasible, false);
  assert.equal(zero.solved.infeasible, false);
  close(
    zero.plan.driverManifold.minimumReachM,
    shortest.plan.driverManifold.minimumReachM,
    1e-12,
    "minimum reach",
  );
  close(zero.plan.driverManifold.extraReachM, 0, 1e-12, "zero extension");
  close(
    zero.plan.driverManifold.totalReachM,
    shortest.plan.driverManifold.totalReachM,
    1e-12,
    "total reach",
  );
  const shortestTools = shortest.field.tapTools.flat();
  const zeroTools = zero.field.tapTools.flat();
  assert.equal(zeroTools.length, shortestTools.length);
  for (let toolIndex = 0; toolIndex < shortestTools.length; toolIndex += 1) {
    const baseline = shortestTools[toolIndex];
    const candidate = zeroTools[toolIndex];
    assert.equal(candidate.shape, baseline.shape);
    close(candidate.sa, baseline.sa, 1e-12, `tool ${toolIndex} major radius`);
    close(candidate.sb, baseline.sb, 1e-12, `tool ${toolIndex} minor radius`);
    close(
      pathLength(candidate.centerlinePoints),
      pathLength(baseline.centerlinePoints),
      1e-12,
      `tool ${toolIndex} acoustic length`,
    );
    assert.equal(
      candidate.centerlinePoints.length,
      baseline.centerlinePoints.length,
    );
    for (let pointIndex = 0;
      pointIndex < baseline.centerlinePoints.length;
      pointIndex += 1) {
      assert.ok(
        distance(
          candidate.centerlinePoints[pointIndex],
          baseline.centerlinePoints[pointIndex],
        ) < 1e-9,
        `tool ${toolIndex} acoustic endpoint ${pointIndex} changed`,
      );
    }
  }
  for (let index = 0; index < shortest.plan.drivers.length; index += 1) {
    const baseline = shortest.plan.drivers[index];
    const candidate = zero.plan.drivers[index];
    assert.ok(distance(candidate.mountN, baseline.mountN) < 1e-12);
    assert.ok(distance(candidate.driverFace, baseline.driverFace) < 1e-12);
    close(
      zero.diagnostics.drivers[index].centerlineLengthM,
      shortest.diagnostics.drivers[index].centerlineLengthM,
      1e-12,
      `driver ${index} exact centerline`,
    );
    close(
      zero.diagnostics.drivers[index].effectiveLengthM,
      shortest.diagnostics.drivers[index].effectiveLengthM,
      1e-12,
      `driver ${index} effective length`,
    );
  }
  assert.equal(zero.diagnostics.pass, true);
  assert.equal(zero.assembly.pass, true);
  assert.equal(shortest.assembly.pass, true);
});

test("axis blend is a spherical wall-normal to radial interpolation", () => {
  const wall = exactPanel({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 20,
    driverAxisBlend: 0,
  });
  const partial = exactPanel({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 20,
    driverAxisBlend: 0.25,
  });
  const radial = exactPanel({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 20,
    driverAxisBlend: 1,
  });

  for (let index = 0; index < wall.plan.drivers.length; index += 1) {
    const wallDriver = wall.plan.drivers[index];
    const partialDriver = partial.plan.drivers[index];
    const radialDriver = radial.plan.drivers[index];
    assert.ok(distance(wallDriver.mountN, wallDriver.wallN) < 1e-12);
    assert.ok(distance(radialDriver.mountN, radialDriver.radialN) < 1e-12);
    close(dot(radialDriver.radialN, [1, 0, 0]), 0, 1e-12, "radial/CD axis");
    close(radialDriver.axisToCdDeg, 90, 1e-10, "radial axis-to-CD angle");

    const whole = angle(partialDriver.wallN, partialDriver.radialN);
    const traveled = angle(partialDriver.wallN, partialDriver.mountN);
    close(traveled / whole, 0.25, 1e-10, "spherical interpolation fraction");
  }
  assert.equal(partial.solved.infeasible, false);
  assert.equal(partial.diagnostics.pass, true);
  assert.equal(partial.assembly.pass, true);
});

test("added reach increases path mass delay phase and loss monotonically", () => {
  const sequence = [20, 40, 60].map((driverMountExtraMm) => exactPanel({
    driverMountMode: "extended-manifold",
    driverMountExtraMm,
    driverAxisBlend: 0.25,
  }));

  for (const [index, item] of sequence.entries()) {
    assert.equal(item.solved.infeasible, false, `extra step ${index}`);
    assert.equal(item.diagnostics.extensionHonored, true);
    assert.equal(item.diagnostics.equalPath, true);
    assert.equal(item.diagnostics.pass, true);
    assert.equal(item.assembly.pass, true);
    assert.equal(item.diagnostics.pathMismatchM, 0);
  }

  for (let index = 1; index < sequence.length; index += 1) {
    const prior = sequence[index - 1].diagnostics.drivers[0];
    const current = sequence[index].diagnostics.drivers[0];
    assert.ok(current.totalReachM > prior.totalReachM);
    assert.ok(current.centerlineLengthM > prior.centerlineLengthM);
    assert.ok(current.effectiveLengthM > prior.effectiveLengthM);
    assert.ok(current.acousticMassKgM4 > prior.acousticMassKgM4);
    assert.ok(current.delayS > prior.delayS);
    assert.ok(current.phaseAtCrossoverDeg > prior.phaseAtCrossoverDeg);
    assert.ok(current.lossProxy > prior.lossProxy);
    assert.ok(current.lowPassHz < prior.lowPassHz);
    assert.ok(current.quarterWaveHz < prior.quarterWaveHz);
  }
});

test("six-way OS-SE manifold equalizes all twelve exact tap paths", () => {
  const solved = engine.solve(sixWooferState({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 10,
    driverAxisBlend: 0,
  }));
  const plan = solved.ev.plan;
  const field = engine.twoWaySolidField(plan);
  const diagnostics = field.driverManifoldDiagnostics;
  const assembly = engine.assemblyAudit(plan, field);
  const paths = diagnostics.drivers.flatMap((driver) => driver.paths);

  assert.equal(solved.infeasible, false);
  assert.equal(plan.arrayPlacement.solvedRotationDeg, 30);
  assert.equal(plan.drivers.length, 6);
  assert.equal(paths.length, 12);
  assert.equal(field.tapPathEqualization.active, true);
  assert.equal(field.tapPathEqualization.feasible, true);
  assert.equal(field.tapPathEqualization.pathCount, 12);
  assert.deepEqual(
    diagnostics.pathEqualization,
    field.tapPathEqualization,
  );
  for (const path of paths) {
    close(
      path.centerlineLengthM,
      field.tapPathEqualization.targetLengthM,
      2e-12,
      `tap ${path.tapIndex} equalized path`,
    );
    for (let index = 1; index < path.centerlinePoints.length; index += 1) {
      const midpoint = path.centerlinePoints[index - 1].map(
        (value, axis) => (
          value + path.centerlinePoints[index][axis]
        ) / 2,
      );
      assert.ok(field(midpoint) > -1e-8, "equalized lumen is blocked");
    }
  }
  assert.ok(diagnostics.pathMismatchM < 2e-12);
  assert.equal(diagnostics.equalPath, true);
  assert.equal(diagnostics.pass, true);
  assert.equal(plan.driverManifold.exact, diagnostics);
  assert.equal(assembly.pass, true);
  for (const name of [
    "tap cutters connect horn air to front chambers",
    "solid web remains beside every tap",
    "integrated driver plates overlap the horn as one structural solid",
    "complete gasket annulus is supported except driver fastener holes",
    "exact printed-manifold acoustics satisfy path, phase and Mach laws",
  ]) {
    assert.equal(
      assembly.rows.find((row) => row.name === name)?.pass,
      true,
      name,
    );
  }

  for (let index = 0; index < 3; index += 1) {
    const driver = plan.drivers[index];
    const opposed = plan.drivers[index + 3];
    assert.ok(distance(reflectOpposed(driver.surface), opposed.surface) < 1e-9);
    assert.ok(distance(reflectOpposed(driver.mountN), opposed.mountN) < 1e-9);
  }
});

test("six-way shortest angular panel equalizes face and corner paths together", () => {
  const solved = engine.solve(sixWooferState({
    style: "angular",
    profileLaw: "conical",
    sectionLameN: 6,
    seN: 12,
    mouthW: 26,
    requestedMouthW: 26,
    twoXO: 500,
    tapCRW: 6,
    driverMountMode: "shortest",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
  }));
  const plan = solved.ev.plan;
  const field = engine.twoWaySolidField(plan);
  const diagnostics = field.driverManifoldDiagnostics;
  const assembly = engine.assemblyAudit(plan, field);
  const paths = diagnostics.drivers.flatMap((driver) => driver.paths);

  assert.equal(solved.infeasible, false);
  assert.equal(solved.S.wallT, 0.018);
  assert.equal(plan.drivers.length, 6);
  assert.deepEqual(
    plan.drivers.map((driver) => driver.panelPlacement.kind),
    ["corner", "face", "corner", "corner", "face", "corner"],
  );
  assert.equal(paths.length, 12);
  assert.equal(plan.cornerPlateComplete, true);
  assert.equal(plan.cornerPlateMultiSeamOverlap, false);
  assert.equal(field.integratedPlateTools.length, 6);
  assert.equal(field.integratedPlateAudit.length, 6);
  assert.equal(plan.driverManifold.mode, "shortest");
  close(
    plan.driverManifold.totalReachM,
    0.026,
    1e-12,
    "canonical shortest driver setback",
  );
  for (const driver of plan.drivers) {
    const differential = plan.differentialSetback.drivers[driver.index];
    const setback = sub(driver.driverFace, driver.surface);
    close(
      length(setback),
      differential.solvedReachM,
      1e-12,
      `driver ${driver.index} setback magnitude`,
    );
    close(
      dot(setback, driver.mountN),
      differential.solvedReachM,
      1e-12,
      `driver ${driver.index} setback along mount normal`,
    );
    assert.ok(
      distance(
        unit(setback),
        driver.mountN,
      ) < 1e-12,
      `driver ${driver.index} setback left its canonical mount normal`,
    );
    close(
      driver.cellT,
      differential.solvedReachM,
      1e-12,
      `driver ${driver.index} cell depth`,
    );
    close(
      driver.panelT,
      solved.S.wallT,
      1e-12,
      `driver ${driver.index} panel thickness`,
    );
    if (driver.panelPlacement.kind === "corner") {
      close(
        differential.additionalSetbackM,
        0,
        1e-12,
        `driver ${driver.index} corner baseline reach`,
      );
      assert.equal(driver.cornerPlate.active, true);
      assert.equal(driver.cornerPlate.complete, true);
      assert.equal(driver.cornerPlate.wings.length, 2);
      assert.equal(driver.cornerPlate.tapDatums.length, 2);
    } else {
      assert.ok(
        differential.additionalSetbackM > 0,
        `driver ${driver.index} face cell did not receive differential setback`,
      );
      assert.equal(driver.cornerPlate.active, false);
      assert.equal(driver.cornerPlate.wings.length, 0);
    }
  }
  for (let index = 0; index < 3; index += 1) {
    const driver = plan.drivers[index];
    const opposed = plan.drivers[index + 3];
    assert.ok(distance(reflectOpposed(driver.surface), opposed.surface) < 1e-9);
    assert.ok(
      distance(reflectOpposed(driver.driverFace), opposed.driverFace) < 1e-9,
    );
    assert.ok(distance(reflectOpposed(driver.mountN), opposed.mountN) < 1e-9);
  }
  assert.equal(field.tapPathEqualization.active, true);
  assert.equal(field.tapPathEqualization.feasible, true);
  assert.equal(field.tapPathEqualization.pathCount, 12);
  assert.ok(diagnostics.pathMismatchM < 2e-12);
  assert.equal(diagnostics.equalPath, true);
  assert.equal(diagnostics.pass, true);
  assert.equal(assembly.pass, true);
  assert.ok(plan.boltInnerWeb >= plan.boltInnerWebRequired - 1e-12);
  assert.ok(plan.boltOuterWeb >= plan.boltOuterWebRequired - 1e-12);
  assert.ok(plan.pairWeb >= plan.minWeb - 1e-12);
  for (const plate of field.integratedPlateAudit) {
    assert.equal(plate.connected, true);
    assert.ok(plate.overlapWitnessCount >= plate.overlapMinimumRequired);
    assert.ok(plate.overlapAngularBins >= plate.overlapAngularBinsRequired);
    assert.equal(plate.gasketSupported, true);
    close(plate.gasketCoverage, 1, 1e-12, "complete gasket coverage");
    assert.equal(plate.subtractorWhitelistPass, true);
    assert.deepEqual(plate.unknownSubtractors, []);
  }
  for (const path of paths) {
    close(
      path.centerlineLengthM,
      field.tapPathEqualization.targetLengthM,
      2e-12,
      `shortest angular tap ${path.tapIndex} equalized path`,
    );
    for (let index = 1; index < path.centerlinePoints.length; index += 1) {
      const midpoint = path.centerlinePoints[index - 1].map(
        (value, axis) => (
          value + path.centerlinePoints[index][axis]
        ) / 2,
      );
      assert.ok(field(midpoint) > -1e-8, "canonical tap lumen is blocked");
    }
  }
  for (const name of [
    "tap cutters connect horn air to front chambers",
    "solid web remains beside every tap",
    "integrated driver plates overlap the horn as one structural solid",
    "complete gasket annulus is supported except driver fastener holes",
    "integrated plate subtractors match the canonical whitelist",
    "exact printed-manifold acoustics satisfy path, phase and Mach laws",
  ]) {
    assert.equal(
      assembly.rows.find((row) => row.name === name)?.pass,
      true,
      name,
    );
  }
});

test("six-way corner differential is feasible only when every finite tap cutter clears its bearing", () => {
  const solved = engine.solve(releasedExtendedCornerState());
  const plan = solved.ev.plan;
  const requestedReachM = (
    plan.driverManifold.minimumReachM
    + plan.driverManifold.extraReachM
  );

  assert.equal(plan.drivers.length, 6);
  assert.deepEqual(
    plan.drivers.map((driver) => driver.panelPlacement.kind),
    ["corner", "face", "corner", "corner", "face", "corner"],
  );
  assert.equal(plan.differentialSetback.active, true);
  assert.equal(plan.differentialSetback.drivers.length, 6);
  assert.equal(plan.differentialSetback.centerlineFeasible, true);

  const cornerIndices = [0, 2, 3, 5];
  const faceIndices = [1, 4];
  for (const index of cornerIndices) {
    const item = plan.differentialSetback.drivers[index];
    close(item.baselineReachM, requestedReachM, 1e-12, `corner ${index} baseline`);
    close(item.additionalSetbackM, 0, 1e-12, `corner ${index} differential`);
    close(item.solvedReachM, requestedReachM, 1e-12, `corner ${index} reach`);
  }
  for (const index of faceIndices) {
    const item = plan.differentialSetback.drivers[index];
    close(item.baselineReachM, requestedReachM, 1e-12, `face ${index} baseline`);
    assert.ok(
      item.additionalSetbackM > 0,
      `face ${index} did not receive its required automatic differential setback`,
    );
    close(
      item.solvedReachM,
      requestedReachM + item.additionalSetbackM,
      1e-12,
      `face ${index} reach`,
    );
  }
  close(
    plan.differentialSetback.drivers[1].additionalSetbackM,
    plan.differentialSetback.drivers[4].additionalSetbackM,
    1e-12,
    "opposed face differential symmetry",
  );

  /*
   * Construct the real swept cutters before grading feasibility. A centerline
   * can sit behind the bearing while a tilted racetrack section still crosses
   * it, so the finite terminal support is part of the public packaging law.
   */
  const field = engine.twoWaySolidField(plan);
  const diagnostics = field.driverManifoldDiagnostics;
  const assembly = engine.assemblyAudit(plan, field);

  assert.equal(field.tapEndpointAudit.length, 12);
  for (const endpoint of field.tapEndpointAudit) {
    assert.equal(endpoint.pass, true);
    assert.ok(
      endpoint.terminalCutterClearanceM >= -1e-12,
      `driver ${endpoint.driverIndex}/tap-${endpoint.tapIndex} crosses its bearing by `
        + `${(-endpoint.terminalCutterClearanceM * 1000).toFixed(6)} mm`,
    );
  }
  assert.equal(plan.differentialSetback.cutterEndpointFeasible, true);
  assert.equal(plan.differentialSetback.feasible, true);
  assert.ok(
    plan.differentialSetback.drivers.every((driver) => (
      driver.centerlineFeasible
      && driver.cutterEndpointFeasible
      && driver.feasible
      && driver.paths.every((path) => (
        path.centerlineFeasible
        && path.cutterEndpointFeasible
        && path.feasible
        && path.terminalCutterClearanceM >= -1e-12
      ))
    )),
    "one or more differential cells publish feasibility without full cutter containment",
  );
  assert.equal(diagnostics.endpointContained, true);
  assert.equal(diagnostics.differentialSetback.feasible, true);
  assert.ok(diagnostics.pathMismatchM < 2e-12);
  assert.equal(diagnostics.pass, true);
  assert.equal(
    assembly.rows.find((row) => (
      row.name === "tap terminals remain inside the driver-bearing plane"
    ))?.pass,
    true,
  );
  assert.equal(assembly.pass, true);
});

test("an excessive radial extension is refused without clipping its request", () => {
  const item = exactPanel({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 80,
    driverAxisBlend: 1,
  });
  assert.equal(item.solved.infeasible, true);
  assert.equal(item.plan.driverManifold.extensionHonored, true);
  close(item.plan.driverManifold.extraReachM, 0.08, 1e-12, "honored extension");
  close(
    item.plan.driverManifold.totalReachM,
    item.plan.driverManifold.minimumReachM + 0.08,
    1e-12,
    "unclipped total reach",
  );
  assert.equal(item.diagnostics.equalPath, true);
  assert.equal(item.diagnostics.phaseLegal, false);
  assert.equal(item.diagnostics.pass, false);
  assert.ok(
    item.diagnostics.minimumQuarterWaveHz
      < item.plan.phaseMargin * item.plan.xo,
  );
  assert.equal(
    item.assembly.rows.find((row) => (
      row.name
        === "exact printed-manifold acoustics satisfy path, phase and Mach laws"
    ))?.pass,
    false,
  );
  assert.ok(
    item.solved.ev.rows.some((row) => (
      row.st === "fail"
      && row.name === "Complete driver bearing and bolt lands"
    )),
    "packaging refusal is missing",
  );
});

test("a compact circular OS-SE panel admits the complete radial-axis endpoint", () => {
  const state = {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
    sectionFamily: "ellipse",
    sectionLameN: 2,
    seN: 2,
    covH: 90,
    covV: 90,
    mouthW: 18,
    requestedMouthW: 18,
    mouthCap: 50,
    wallT: 0.012,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    nW: 2,
    npW: 1,
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    wPre: "custom",
    odW: 8,
    dpW: 4,
    sdW: 35,
    vtcW: 15,
    xmW: 2,
    frameW: "round",
    boltNW: 4,
    bcdW: undefined,
    boltDW: 5,
    gasketW: 1.6,
    shW: "round",
    tapShapeW: "round",
    tapPairMode: "auto",
    twoXO: 300,
    tapCRW: 5,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    adapterReach: 35,
    adapterReachMode: "auto",
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 60,
    driverAxisBlend: 1,
    osseThroatAngle: 7.5,
    osseK: 1.8,
    osseS: 0.7,
    osseTerminationN: 4,
    osseQ: 0.995,
  };
  const solved = engine.solve(state);
  const plan = solved.ev.plan;
  const field = engine.twoWaySolidField(plan);
  const diagnostics = field.driverManifoldDiagnostics;
  const assembly = engine.assemblyAudit(plan, field);

  assert.equal(solved.infeasible, false);
  assert.equal(solved.S.mouthW, 18);
  assert.equal(plan.frame.generatedPanelBcd, true);
  close(diagnostics.totalReachM, 0.082, 1e-12, "radial endpoint reach");
  assert.deepEqual(
    diagnostics.drivers.map((driver) => driver.axisToCdDeg),
    [90, 90],
  );
  assert.ok(
    diagnostics.drivers.every((driver) => (
      distance(driver.axis, driver.radialAxis) < 1e-12
      && Math.abs(dot(driver.axis, [1, 0, 0])) < 1e-12
    )),
  );
  close(
    diagnostics.minimumQuarterWaveHz,
    781.2234687166899,
    1e-9,
    "radial endpoint quarter wave",
  );
  assert.equal(diagnostics.equalPath, true);
  assert.equal(diagnostics.phaseLegal, true);
  assert.equal(diagnostics.pass, true);
  assert.equal(assembly.pass, true);
  const preflight = engine.twoWayMeshPreflight(solved.S, "preview");
  assert.equal(preflight.ok, true);
  assert.equal(preflight.step, 0.0025);
  assert.equal(preflight.parts.length, 1);
});
