import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

const LENGTH_TOLERANCE = 1e-8;
const ANGLE_TOLERANCE = 2e-5;
const PARALLEL_TOLERANCE = 2e-5;

const radians = (degrees) => degrees * Math.PI / 180;
const degrees = (angle) => angle * 180 / Math.PI;

function namedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is unterminated`);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function magnitude(vector) {
  return Math.hypot(...vector);
}

function unit(vector) {
  const length = magnitude(vector);
  assert.ok(length > 1e-12, "cannot normalize a zero-length vector");
  return vector.map((value) => value / length);
}

function angleBetween(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
}

function distance(a, b) {
  return magnitude(subtract(a, b));
}

function reflected(point) {
  return [point[0], -point[1], -point[2]];
}

function closeVector(actual, expected, message, tolerance = LENGTH_TOLERANCE) {
  assert.ok(Array.isArray(actual) && actual.length === 3, `${message}: missing 3-D vector`);
  assert.ok(
    distance(actual, expected) <= tolerance,
    `${message}: ${JSON.stringify(actual)} differs from ${JSON.stringify(expected)}`,
  );
}

/*
 * Six panel drivers are phased at 30 + k*60 degrees. Preserve a rectangular
 * corner at 30 degrees while varying horizontal coverage so the same four
 * drivers exercise genuinely different included dihedral angles.
 */
function verticalCoverageForThirtyDegreeCorner(horizontalCoverage) {
  return degrees(2 * Math.atan(
    Math.tan(radians(horizontalCoverage / 2)) * Math.tan(Math.PI / 6),
  ));
}

function cornerState(horizontalCoverage = 90, overrides = {}) {
  const verticalCoverage =
    verticalCoverageForThirtyDegreeCorner(horizontalCoverage);
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    _smart2waySchema: 3,
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "angular",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 12,
    seN: 12,
    covH: horizontalCoverage,
    covV: verticalCoverage,
    mouthW: 24,
    requestedMouthW: 24,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    wPre: "w5",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    nW: 6,
    npW: 2,
    panelAxis: "horizontal",
    driverArrayMode: "manual",
    driverArrayRotationDeg: 30,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    frameW: "round",
    boltNW: 4,
    boltDW: 5,
    gasketW: 1.6,
    ...overrides,
  };
}

function seamDrivers(plan) {
  const dimensions = engine.dimsAt(plan.st, plan.station);
  const vertices = engine.panelVerts(
    dimensions.a,
    dimensions.b,
    dimensions.n,
  );
  return plan.drivers.filter((driver) =>
    vertices.some((vertex) =>
      Math.hypot(
        driver.surface[1] - vertex[0],
        driver.surface[2] - vertex[1],
      ) <= LENGTH_TOLERANCE));
}

function cornerPlate(driver) {
  assert.ok(
    driver.cornerPlate && driver.cornerPlate.active,
    `driver ${driver.index} lies on a horn seam but has no active parametric corner plate`,
  );
  return driver.cornerPlate;
}

function expectedFaceNormals(plan, driver) {
  /*
   * surfN intentionally averages across a discontinuous seam. Probe well
   * inside each adjacent planar face to create an independent two-face oracle.
   */
  const probe = 0.08;
  return [
    unit(engine.surfN(plan.st, plan.station, driver.phi - probe)),
    unit(engine.surfN(plan.st, plan.station, driver.phi + probe)),
  ];
}

function matchUnorderedNormals(actual, expected, message) {
  assert.equal(actual.length, 2, `${message}: corner must own exactly two faces`);
  const direct =
    Math.abs(dot(unit(actual[0]), expected[0])) > 1 - ANGLE_TOLERANCE &&
    Math.abs(dot(unit(actual[1]), expected[1])) > 1 - ANGLE_TOLERANCE;
  const swapped =
    Math.abs(dot(unit(actual[0]), expected[1])) > 1 - ANGLE_TOLERANCE &&
    Math.abs(dot(unit(actual[1]), expected[0])) > 1 - ANGLE_TOLERANCE;
  assert.ok(direct || swapped, `${message}: recorded normals do not belong to the two underlying faces`);
}

function faceGroups(plan) {
  const groups = new Map();
  for (const driver of plan.drivers) {
    if (driver.panelPlacement?.kind !== "face") continue;
    for (const port of driver.ports) {
      assert.equal(
        port.faceGroupId,
        driver.panelPlacement.groupId,
        `driver ${driver.index}/tap-${port.index}: face-group ownership diverged`,
      );
      assert.equal(
        port.mountFaceId,
        driver.panelPlacement.faceIds[0],
        `driver ${driver.index}/tap-${port.index}: mount-face ownership diverged`,
      );
      const key = port.faceGroupId;
      const group = groups.get(key) || {
        id: key,
        faceId: port.mountFaceId,
        ports: [],
      };
      group.ports.push({ driverIndex: driver.index, port });
      groups.set(key, group);
    }
  }
  return [...groups.values()];
}

test("seam drivers solve a true two-face plate for arbitrary dihedral angles", () => {
  const solvedAngles = [];
  for (const horizontalCoverage of [70, 90, 105]) {
    const plan = engine.twoWayPlan(cornerState(horizontalCoverage));
    const drivers = seamDrivers(plan);
    assert.equal(plan.panelTopology?.schemaVersion, 1);
    assert.equal(plan.panelTopology?.station, plan.station);
    assert.equal(plan.panelTopology?.faces?.length, 4);
    assert.equal(plan.panelTopology?.seams?.length, 4);
    assert.equal(plan.cornerPlateComplete, true);
    assert.equal(plan.cornerPlateMultiSeamOverlap, false);
    assert.equal(drivers.length, 4, `${horizontalCoverage}° fixture lost its four seam drivers`);
    for (const face of plan.panelTopology.faces) {
      assert.ok(face.id);
      assert.ok(face.vertexIds?.length >= 2);
      assert.ok(Math.abs(dot(unit(face.normal), unit(face.longAxis))) <= ANGLE_TOLERANCE);
      assert.ok(Math.abs(dot(unit(face.normal), unit(face.crossAxis))) <= ANGLE_TOLERANCE);
      assert.ok(Math.abs(dot(unit(face.longAxis), unit(face.crossAxis))) <= ANGLE_TOLERANCE);
    }
    for (const driver of plan.drivers.filter((item) => !drivers.includes(item))) {
      assert.equal(driver.panelPlacement?.kind, "face");
      assert.equal(driver.panelPlacement?.faceIds?.length, 1);
      assert.equal(driver.cornerPlate?.schemaVersion, 1);
      assert.equal(driver.cornerPlate?.active, false);
      assert.equal(driver.cornerPlate?.wings?.length, 0);
    }
    for (const driver of drivers) {
      const plate = cornerPlate(driver);
      assert.equal(driver.panelPlacement?.kind, "corner");
      assert.equal(driver.panelPlacement?.faceIds?.length, 2);
      closeVector(
        driver.panelPlacement.basis?.normal,
        plate.bisectorNormal,
        `${horizontalCoverage}°/driver-${driver.index}: placement normal`,
      );
      assert.ok(
        Math.abs(dot(
          unit(driver.panelPlacement.basis?.u),
          unit(driver.panelPlacement.basis?.v),
        )) <= ANGLE_TOLERANCE,
        `${horizontalCoverage}°/driver-${driver.index}: placement basis is not orthogonal`,
      );
      assert.equal(plate.schemaVersion, 1);
      assert.equal(plate.kind, "dihedral-corner-cell");
      assert.equal(plate.complete, true);
      const seam = plan.panelTopology.seams.find((item) =>
        item.id === driver.panelPlacement.seamId);
      assert.ok(seam, `${horizontalCoverage}°/driver-${driver.index}: seam ownership missing`);
      closeVector(
        seam.point,
        driver.surface,
        `${horizontalCoverage}°/driver-${driver.index}: topology seam datum`,
      );
      closeVector(
        plate.seamDatum,
        seam.point,
        `${horizontalCoverage}°/driver-${driver.index}: plate seam datum`,
      );
      const expected = expectedFaceNormals(plan, driver);
      matchUnorderedNormals(
        plate.faceNormals,
        expected,
        `${horizontalCoverage}°/driver-${driver.index}`,
      );
      const expectedAngle = angleBetween(...expected);
      assert.ok(
        Math.abs(plate.dihedralRad - expectedAngle) <= ANGLE_TOLERANCE,
        `${horizontalCoverage}°/driver-${driver.index}: plate angle `
          + `${degrees(plate.dihedralRad).toFixed(3)}° does not match the horn's `
          + `${degrees(expectedAngle).toFixed(3)}° normal angle`,
      );
      assert.ok(Math.abs(seam.dihedralRad - plate.dihedralRad) <= ANGLE_TOLERANCE);
      matchUnorderedNormals(
        seam.faceNormals,
        plate.faceNormals.map(unit),
        `${horizontalCoverage}°/driver-${driver.index}: topology/plate faces`,
      );
      solvedAngles.push(plate.dihedralRad);
    }
  }
  assert.ok(
    Math.max(...solvedAngles) - Math.min(...solvedAngles) > radians(10),
    "corner plates collapsed different horn corners to one fixed angle",
  );
});

test("corner bearing retains the complete frame, gasket, and every bolt land", () => {
  const plan = engine.twoWayPlan(cornerState());
  for (const driver of seamDrivers(plan)) {
    const plate = cornerPlate(driver);
    const bearing = plate.bearing;
    assert.ok(bearing?.complete, `driver ${driver.index}: bearing is incomplete`);
    assert.equal(bearing.coverage, 1, `driver ${driver.index}: bearing coverage is partial`);
    closeVector(bearing.center, driver.driverFace, `driver ${driver.index}: bearing datum`);
    closeVector(bearing.normal, plate.bisectorNormal, `driver ${driver.index}: bearing normal`);
    assert.ok(
      bearing.outerR >= plan.frame.frameR - LENGTH_TOLERANCE,
      `driver ${driver.index}: plate does not bear the complete frame`,
    );
    assert.ok(
      bearing.gasketOuterR > bearing.gasketInnerR &&
        bearing.gasketInnerR >= plan.frame.activeR - LENGTH_TOLERANCE,
      `driver ${driver.index}: gasket annulus is not completely supported`,
    );
    assert.equal(
      bearing.boltCenters?.length,
      plan.frame.boltN,
      `driver ${driver.index}: not every selected bolt owns a bearing land`,
    );
    for (const bolt of bearing.boltCenters) {
      const radius = distance(bolt, bearing.center);
      assert.ok(
        radius - plan.frame.panelPocketD / 2 - plan.minWeb >=
          bearing.innerR - LENGTH_TOLERANCE,
        `driver ${driver.index}: bolt pocket breaks through the inner bearing edge`,
      );
      assert.ok(
        radius + plan.frame.panelPocketD / 2 + plan.minWeb <=
          bearing.outerR + LENGTH_TOLERANCE,
        `driver ${driver.index}: bolt pocket breaks through the outer bearing edge`,
      );
    }
  }
});

test("corner plate solid remains entirely outside horn air", () => {
  const plan = engine.twoWayPlan(cornerState());
  for (const driver of seamDrivers(plan)) {
    const plate = cornerPlate(driver);
    assert.ok(
      plate.airSideClearance >= -LENGTH_TOLERANCE,
      `driver ${driver.index}: corner plate intrudes into horn air`,
    );
    assert.ok(
      Array.isArray(plate.solidWitnesses) && plate.solidWitnesses.length >= 16,
      `driver ${driver.index}: corner plate has no independently auditable solid witnesses`,
    );
    for (const point of plate.solidWitnesses) {
      assert.ok(
        engine.twoWaySdCross(plan, ...point, 0) >= -LENGTH_TOLERANCE,
        `driver ${driver.index}: plate witness ${JSON.stringify(point)} is inside horn air`,
      );
    }
  }
});

test("each corner plate owns two face-aligned attachment wings and root patches", () => {
  const plan = engine.twoWayPlan(cornerState());
  for (const driver of seamDrivers(plan)) {
    const plate = cornerPlate(driver);
    assert.equal(plate.wings?.length, 2, `driver ${driver.index}: corner plate needs two wings`);
    matchUnorderedNormals(
      plate.wings.map((wing) => wing.faceNormal),
      plate.faceNormals.map(unit),
      `driver ${driver.index}: attachment wing ownership`,
    );
    for (const [wingIndex, wing] of plate.wings.entries()) {
      assert.ok(wing.complete, `driver ${driver.index}/wing-${wingIndex}: wing is incomplete`);
      assert.ok(
        driver.panelPlacement.faceIds.includes(wing.faceId),
        `driver ${driver.index}/wing-${wingIndex}: wing does not belong to an adjacent face`,
      );
      assert.ok(
        wing.rootPatch?.points?.length >= 3,
        `driver ${driver.index}/wing-${wingIndex}: root patch has no closed area`,
      );
      assert.ok(
        wing.rootPatch.area > 0,
        `driver ${driver.index}/wing-${wingIndex}: root patch area is zero`,
      );
      assert.ok(
        wing.rootPatch.radius > 0 &&
          Number.isFinite(wing.rootPatch.radius),
        `driver ${driver.index}/wing-${wingIndex}: root radius is invalid`,
      );
      assert.ok(
        wing.bearingAnchor?.points?.length === wing.rootPatch.points.length &&
          wing.bearingAnchor.points.length >= 3,
        `driver ${driver.index}/wing-${wingIndex}: root and bearing loops are incompatible`,
      );
      assert.ok(
        wing.rootRadius > 0 &&
          wing.anchorRadius > 0 &&
          wing.bearingAnchor.radius > 0,
        `driver ${driver.index}/wing-${wingIndex}: wing radii are invalid`,
      );
      assert.ok(
        Math.abs(wing.rootRadius - wing.rootPatch.radius) <= LENGTH_TOLERANCE &&
          Math.abs(wing.anchorRadius - wing.bearingAnchor.radius) <=
            LENGTH_TOLERANCE,
        `driver ${driver.index}/wing-${wingIndex}: canonical loop radii diverged`,
      );
      closeVector(
        wing.rootPatch.normal,
        wing.faceNormal,
        `driver ${driver.index}/wing-${wingIndex}: root patch normal`,
      );
      assert.ok(
        wing.rootPatch.minimumWeb >= plan.minWeb - LENGTH_TOLERANCE,
        `driver ${driver.index}/wing-${wingIndex}: root patch lacks printable web`,
      );
    }
  }
});

test("corner plates and horn cuts consume the same canonical tap datums", () => {
  const plan = engine.twoWayPlan(cornerState());
  for (const driver of seamDrivers(plan)) {
    const plate = cornerPlate(driver);
    closeVector(plate.seamDatum, driver.surface, `driver ${driver.index}: seam datum`);
    assert.equal(
      plate.tapDatums?.length,
      driver.ports.length,
      `driver ${driver.index}: corner plate does not own every tap datum`,
    );
    for (const port of driver.ports) {
      const datum = plate.tapDatums.find((candidate) =>
        candidate.tapIndex === port.index);
      assert.ok(datum, `driver ${driver.index}/tap-${port.index}: shared datum missing`);
      closeVector(datum.flow, port.flow, `driver ${driver.index}/tap-${port.index}: long axis`);
      closeVector(datum.cross, port.cross, `driver ${driver.index}/tap-${port.index}: short axis`);
      assert.equal(datum.faceId, port.mountFaceId);
      assert.ok(
        Array.isArray(datum.chamberTarget) &&
          datum.chamberTarget.length === 3 &&
          datum.chamberTarget.every(Number.isFinite),
        `driver ${driver.index}/tap-${port.index}: chamber target is not a finite datum`,
      );
      assert.ok(
        Math.abs(dot(
          subtract(datum.chamberTarget, driver.cavInner),
          driver.mountN,
        )) <= LENGTH_TOLERANCE,
        `driver ${driver.index}/tap-${port.index}: chamber target left the canonical cavity plane`,
      );
      const chamberOffset = subtract(
        datum.chamberTarget,
        driver.cavInner,
      );
      const chamberRadius = magnitude(chamberOffset);
      const radialDirection = chamberRadius > LENGTH_TOLERANCE
        ? unit(chamberOffset)
        : port.flow;
      const supportU = dot(radialDirection, port.flow);
      const supportV = dot(radialDirection, port.cross);
      const projectedSupport =
        engine.twoWayApertureSupport(port, supportU, supportV) *
        Math.hypot(supportU, supportV);
      assert.ok(
        chamberRadius + projectedSupport + plan.minWeb <=
          driver.innerR + LENGTH_TOLERANCE,
        `driver ${driver.index}/tap-${port.index}: chamber target and `
          + `directional aperture support left the retained chamber bound`,
      );
    }
  }
});

test("flat-face slots stay parallel while corner mounts follow seam and bisector", () => {
  const plan = engine.twoWayPlan(cornerState());
  const groups = faceGroups(plan).filter((group) => group.ports.length >= 2);
  assert.ok(groups.length >= 2, "fixture no longer exercises repeated slots on planar faces");
  for (const [groupIndex, group] of groups.entries()) {
    const face = plan.panelTopology.faces.find((item) => item.id === group.faceId);
    assert.ok(face, `face group ${groupIndex}: canonical panel face missing`);
    const reference = unit(group.ports[0].port.flow);
    assert.ok(
      Math.abs(dot(reference, unit(face.longAxis))) >= 1 - PARALLEL_TOLERANCE,
      `face group ${groupIndex}: slot axis diverges from canonical face long axis`,
    );
    for (const { driverIndex, port } of group.ports.slice(1)) {
      assert.ok(
        Math.abs(dot(reference, unit(port.flow))) >= 1 - PARALLEL_TOLERANCE,
        `face group ${groupIndex}/driver-${driverIndex}/tap-${port.index}: `
          + "slot long axis is not parallel to the other slots on its planar face",
      );
    }
  }

  for (const driver of seamDrivers(plan)) {
    const plate = cornerPlate(driver);
    const normals = plate.faceNormals.map(unit);
    const expectedBisector = unit(add(normals[0], normals[1]));
    const expectedSeam = unit(cross(normals[0], normals[1]));
    assert.ok(
      Math.abs(dot(unit(plate.bisectorNormal), expectedBisector)) >=
        1 - ANGLE_TOLERANCE,
      `driver ${driver.index}: corner mount does not use the two-face bisector`,
    );
    assert.ok(
      Math.abs(dot(unit(plate.seamDirection), expectedSeam)) >=
        1 - ANGLE_TOLERANCE,
      `driver ${driver.index}: corner mount does not follow the horn seam`,
    );
    assert.ok(
      Math.abs(dot(unit(driver.mountN), expectedBisector)) >=
        1 - ANGLE_TOLERANCE,
      `driver ${driver.index}: driver axis diverges from its corner-plate bisector`,
    );
    for (const port of driver.ports) {
      assert.ok(
        Math.abs(dot(unit(port.flow), unit(plate.seamDirection))) >=
          1 - PARALLEL_TOLERANCE,
        `driver ${driver.index}/tap-${port.index}: corner slot does not follow its seam`,
      );
    }
  }
});

test("corner plates and their taps retain exact opposed-pair symmetry", () => {
  const plan = engine.twoWayPlan(cornerState());
  const drivers = seamDrivers(plan);
  for (const driver of drivers) {
    const opposite = drivers.find((candidate) =>
      Math.abs(Math.atan2(
        Math.sin(candidate.phi - driver.phi - Math.PI),
        Math.cos(candidate.phi - driver.phi - Math.PI),
      )) < 1e-12);
    assert.ok(opposite, `driver ${driver.index}: opposed corner driver missing`);
    const plate = cornerPlate(driver);
    const oppositePlate = cornerPlate(opposite);
    closeVector(
      oppositePlate.seamDatum,
      reflected(plate.seamDatum),
      `driver ${driver.index}: opposed seam datum`,
    );
    assert.ok(Math.abs(oppositePlate.dihedralRad - plate.dihedralRad) <= ANGLE_TOLERANCE);
    assert.ok(Math.abs(oppositePlate.bearing.outerR - plate.bearing.outerR) <= LENGTH_TOLERANCE);
    assert.ok(Math.abs(oppositePlate.bearing.innerR - plate.bearing.innerR) <= LENGTH_TOLERANCE);
    assert.deepEqual(
      oppositePlate.wings.map((wing) => +wing.rootPatch.area.toFixed(12)).sort(),
      plate.wings.map((wing) => +wing.rootPatch.area.toFixed(12)).sort(),
    );
    for (const port of driver.ports) {
      assert.ok(
        opposite.ports.some((candidate) =>
          distance(candidate.center, reflected(port.center)) <= LENGTH_TOLERANCE &&
          Math.abs(dot(unit(candidate.flow), reflected(unit(port.flow)))) >=
            1 - ANGLE_TOLERANCE),
        `driver ${driver.index}/tap-${port.index}: opposed tap datum is asymmetric`,
      );
    }
  }
});

test("large six-driver preview datums remain finite and crash-safe without exact meshing", () => {
  const state = cornerState(90, {
    mouthW: 64,
    requestedMouthW: 64,
    mouthCap: 64,
    wPre: "w8",
    odW: 22.5,
    dpW: 9,
    sdW: 220,
    vtcW: 80,
    xmW: 7,
    boltNW: 8,
    bcdW: undefined,
    boltDW: 6.5,
  });
  const solved = engine.solve(state);
  assert.equal(
    solved.infeasible,
    false,
    `large preview fixture refused: ${solved.ev.rows
      .filter((row) => row.st === "fail")
      .map((row) => row.code || row.name)
      .join(", ")}`,
  );
  assert.equal(solved.ev.plan.drivers.length, 6);
  assert.equal(solved.ev.plan.cornerPlateComplete, true);

  const context = {};
  vm.runInNewContext(
    `${namedFunction(shell, "mountInterfaceSpec")}\n`
      + "this.mountInterfaceSpec = mountInterfaceSpec;",
    context,
  );
  const visualTools = engine.twoWaySolidField(solved.ev.plan);
  for (const driver of solved.ev.plan.drivers) {
    let spec;
    assert.doesNotThrow(() => {
      spec = context.mountInterfaceSpec(
        solved.ev.plan,
        driver,
        solved.S,
        visualTools,
      );
    }, `driver ${driver.index}: preview mount-interface construction crashed`);
    assert.equal(spec.mountPreviewComplete, true);
    assert.equal(spec.integratedPlateToolComplete, true);
    assert.equal(spec.integratedPlateToolMatches, true);
    for (const [name, value] of Object.entries({
      bearingReach: spec.bearingReach,
      driverReach: spec.driverReach,
      plateT: spec.plateT,
      landOuterR: spec.landOuterR,
      openingR: spec.openingR,
      gasketOuterR: spec.gasketOuterR,
      gasketInnerR: spec.gasketInnerR,
    })) {
      assert.ok(
        Number.isFinite(value),
        `driver ${driver.index}: preview ${name} is non-finite`,
      );
    }
    assert.equal(spec.sealed, true, `driver ${driver.index}: preview interface is unsealed`);
    assert.equal(
      spec.driverBehindWall,
      true,
      `driver ${driver.index}: preview driver crosses the acoustic wall`,
    );
    if (driver.panelPlacement.kind === "corner") {
      assert.equal(spec.cornerPlate, driver.cornerPlate);
      assert.equal(spec.canonicalBearing, driver.cornerPlate.bearing);
    }
  }

  const corner = solved.ev.plan.drivers.find((driver) =>
    driver.panelPlacement.kind === "corner");
  const incomplete = structuredClone(corner);
  incomplete.cornerPlate.complete = false;
  incomplete.cornerPlate.bearing.complete = false;
  const failClosed = context.mountInterfaceSpec(
    solved.ev.plan,
    incomplete,
    solved.S,
    visualTools,
  );
  assert.equal(failClosed.cornerPlateDeclared, true);
  assert.equal(failClosed.cornerPlate, null);
  assert.equal(failClosed.canonicalBearing, null);
  assert.equal(failClosed.mountPreviewComplete, false);
  assert.match(
    namedFunction(shell, "panelRelievedLand"),
    /if\s*\(\s*spec\.cornerPlateDeclared\s*\)\s*return\s+panelCornerRelievedLand/,
    "an incomplete required corner record falls back to a legacy one-face mount",
  );
});

test("a root footprint spanning a second seam is explicitly refused", () => {
  const state = cornerState(90, {
    tapBasis: "manual",
    tapStationW: 55,
    tapAreaW: 57,
    tapLptW: 25,
    tapVtcW: 320,
    mouthW: 24,
    requestedMouthW: 24,
    mouthCap: 24,
    wPre: "custom",
    odW: 39,
    dpW: 17,
    sdW: 855,
    vtcW: 320,
    xmW: 10,
    boltNW: 8,
    bcdW: 370,
    boltDW: 6.5,
  });
  const plan = engine.twoWayPlan(state);
  assert.equal(plan.station, 0.055);
  assert.equal(plan.cornerPlateMultiSeamOverlap, true);
  assert.equal(plan.cornerPlateComplete, false);
  assert.ok(
    seamDrivers(plan).some((driver) =>
      driver.cornerPlate?.multiSeamOverlap === true &&
      driver.cornerPlate?.overlappedSeamIds?.length > 1 &&
      driver.cornerPlate.overlappedSeamIds.every((id, index, list) =>
        index === 0 || String(list[index - 1]).localeCompare(String(id)) <= 0)),
    "stress fixture did not expose its multi-seam corner-root overlap",
  );

  const evaluated = engine.evaluate2way(state);
  const refusal = evaluated.rows.find((row) =>
    row.code === "CORNER_PLATE_MULTI_SEAM_OVERLAP");
  assert.ok(refusal, "multi-seam overlap has no stable refusal code");
  assert.equal(refusal.name, "Corner plate root owns exactly one seam");
  assert.equal(refusal.st, "fail");
  assert.equal(refusal.grow, false);
  assert.throws(
    () => engine.twoWayMeshPreflight(state, "display"),
    (error) => error?.code === "CORNER_PLATE_MULTI_SEAM_OVERLAP",
  );
});

test("an undersized corner package grows or refuses; it never clips a plate", () => {
  const undersized = cornerState(90, {
    mouthW: 14,
    requestedMouthW: 14,
    mouthCap: 64,
  });
  const grown = engine.solve(undersized);
  assert.equal(grown.infeasible, false);
  assert.ok(grown.S.mouthW > undersized.mouthW);
  assert.ok(
    grown.ledger.some((entry) =>
      entry.knob === "mouthW" &&
      /corner|bearing|bolt|mount/i.test(entry.why)),
    "corner package growth is absent from the adaptation ledger",
  );
  assert.equal(seamDrivers(grown.ev.plan).length, 4);
  assert.equal(grown.ev.plan.cornerPlateComplete, true);
  assert.equal(grown.ev.plan.cornerPlateMultiSeamOverlap, false);
  assert.ok(
    seamDrivers(grown.ev.plan).every((driver) => cornerPlate(driver).complete),
    "grown mouth still contains an incomplete corner plate",
  );

  const cappedState = {
    ...undersized,
    mouthCap: undersized.mouthW,
  };
  const capped = engine.solve(cappedState);
  assert.equal(capped.infeasible, true);
  assert.ok(
    capped.ev.rows.some((row) =>
      row.st === "fail" &&
      (
        row.code === "CORNER_PLATE_ENVELOPE_INCOMPLETE" ||
        row.code === "DRIVER_BEARING_ENVELOPE_INCOMPLETE"
      )),
    "capped corner package lacks a stable named bearing-envelope refusal",
  );
  assert.throws(
    () => engine.twoWayMeshPreflight(cappedState, "display"),
    (error) =>
      error?.code === "CORNER_PLATE_ENVELOPE_INCOMPLETE" ||
      error?.code === "DRIVER_BEARING_ENVELOPE_INCOMPLETE",
  );
});
