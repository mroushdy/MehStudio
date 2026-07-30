import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

function sixW5AngularState() {
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
    sectionCornerRatio: 0.25,
    seN: 12,
    covH: 90,
    covV: 60,
    mouthW: 26,
    requestedMouthW: 26,
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
    frameW: "round",
    boltNW: 4,
    boltDW: 5,
    gasketW: 1.6,
    nW: 6,
    npW: 2,
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    twoXO: 500,
    tapCRW: 6,
    driverMountMode: "shortest",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
  };
}

const pathLength = (points) => points.slice(1).reduce(
  (sum, point, index) => sum + Math.hypot(
    point[0] - points[index][0],
    point[1] - points[index][1],
    point[2] - points[index][2],
  ),
  0,
);
const subtract = (a, b) => a.map(
  (value, index) => value - b[index],
);
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const unit = (value) => {
  const magnitude = Math.max(1e-15, Math.hypot(...value));
  return value.map((item) => item / magnitude);
};

test("six-W5 shortest taps share one cone-normal single-prism path law", () => {
  const state = engine.migrateTwoWayState(sixW5AngularState());
  const solved = engine.solve(state);
  assert.equal(solved.infeasible, false);
  const plan = solved.ev.plan;
  assert.equal(plan.drivers.length, 6);
  assert.equal(plan.differentialSetback.feasible, true);
  assert.ok(plan.differentialSetback.drivers.every((driver) =>
    driver.feasible && driver.intervalMinM
      <= plan.differentialSetback.targetLengthM + 0.00002
      && driver.intervalMaxM
        >= plan.differentialSetback.targetLengthM - 0.00002));

  const field = engine.twoWaySolidField(plan);
  const tools = field.tapTools.flat();
  const audit = field.tapPathGeometryAudit;
  assert.equal(tools.length, 12);
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.activeCount, tools.length);
  assert.equal(audit.pass, true);
  assert.equal(field.tapPathEqualization.feasible, true);
  assert.ok(field.tapEndpointAudit.every((record) => record.pass));

  const lengths = tools.map((tool) => pathLength(tool.centerlinePoints));
  assert.ok(Math.max(...lengths) - Math.min(...lengths) < 1e-10);
  assert.ok(Math.abs(
    lengths[0] - plan.differentialSetback.targetLengthM,
  ) < 1e-10);

  for (const record of audit.records) {
    assert.equal(record.active, true);
    assert.equal(record.kind, "straight-cone-normal");
    assert.equal(record.pass, true);
    assert.equal(record.apertureInvariant, true);
    assert.equal(record.endpointContained, true);
    assert.equal(record.maximumTurn, 0);
    assert.equal(record.sectionCount, 1);
    assert.ok(record.wallExitGuardM >= 0.001 - 1e-10);
    assert.ok(record.terminalRunM >= 0.003 - 1e-10);
    assert.ok(record.terminalAlignment >= 1 - 1e-9);
    assert.ok(record.terminalCutterClearanceM >= -1e-9);
  }

  for (const [toolIndex, tool] of tools.entries()) {
    const driver = plan.drivers[Math.floor(toolIndex / 2)];
    const port = driver.ports[toolIndex % 2];
    assert.equal(tool.kind, "swept-aperture");
    assert.equal(tool.geometryMode, "straight-cone-normal");
    assert.equal(tool.sections.length, 1);
    assert.equal(tool.centerlinePoints.length, 2);
    assert.ok(tool.sections.every((section) =>
      Math.abs(section.sa - port.sa) < 1e-12
        && Math.abs(section.sb - port.sb) < 1e-12
        && section.shape === port.shape));
    const section = tool.sections[0];
    const axis = unit(subtract(section.b, section.a));
    assert.ok(dot(axis, driver.mountN) >= 1 - 1e-12);
    assert.ok(
      dot(
        subtract(tool.centerlinePoints[0], section.a),
        driver.mountN,
      ) > 0,
      "Boolean safety tail must begin behind the acoustic wall datum",
    );
    assert.ok(
      Math.hypot(...subtract(section.b, tool.centerlinePoints[1]))
        < 1e-12,
      "single prism must terminate at the solved chamber join",
    );
    assert.equal(tool.equalizer.chamberDiscContained, true);
    assert.equal(tool.equalizer.endpointContained, true);
  }

  for (const driver of plan.drivers) {
    const clamp = driver.coneNormalPairClamp;
    assert.ok(clamp);
    assert.equal(clamp.pass, true);
    assert.ok(
      clamp.solvedAxialMismatchM
        <= clamp.permittedAxialMismatchM + 1e-10,
    );
    if (driver.panelPlacement.kind === "corner") {
      assert.equal(clamp.active, true);
      assert.ok(clamp.inwardAdjustmentPerEntryM > 0);
    } else {
      assert.equal(clamp.active, false);
    }
    const axes = field.tapTools[driver.index].map((tool) =>
      unit(subtract(tool.sections[0].b, tool.sections[0].a)));
    assert.ok(Math.abs(dot(axes[0], axes[1])) >= 1 - 1e-12);
  }

  const assembly = engine.assemblyAudit(plan, field);
  assert.equal(
    assembly.pass,
    true,
    assembly.rows.filter((row) => !row.pass)
      .map((row) => row.name).join(", "),
  );
});
