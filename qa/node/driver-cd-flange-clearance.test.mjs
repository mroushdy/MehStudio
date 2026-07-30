import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");
const core = fs.readFileSync(path.join(appRoot, "twoway-core.js"), "utf8");

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map((value, index) => value - b[index]);
const multiply = (a, scalar) => a.map((value) => value * scalar);
const dot = (a, b) =>
  a.reduce((sum, value, index) => sum + value * b[index], 0);
const length = (a) => Math.hypot(...a);
const unit = (a) => {
  const magnitude = length(a) || 1;
  return a.map((value) => value / magnitude);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function finiteCylinderField(point, start, end, radius) {
  const axis = subtract(end, start);
  const span = length(axis) || 1e-9;
  const normal = multiply(axis, 1 / span);
  const delta = subtract(point, start);
  const axial = dot(delta, normal);
  const radial =
    length(subtract(delta, multiply(normal, axial))) - radius;
  return Math.max(radial, -axial, axial - span);
}

function liveCollisionReportState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "angular",
    profileLaw: "conical",
    seN: 12,
    covH: 116.7,
    covV: 115.3,
    mouthW: 33,
    requestedMouthW: 29,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdFloor: 300,
    cdDepth: 2.4,
    cdSel: "dcx464",
    cdFlangeD: 152,
    nW: 2,
    npW: 2,
    wPre: "ndl88",
    odW: 31.5,
    dpW: 14,
    sdW: 522,
    vtcW: 180,
    xmW: 8,
    twoXO: 370,
    tapCRW: 4,
    driverCellConstruction: "integrated",
    driverArrayMode: "manual",
    driverArrayRotationDeg: 0,
    ...overrides,
  };
}

function sixW5AngularState(overrides = {}) {
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
    cdFloor: 300,
    cdDepth: 2.4,
    cdSel: "dcx464",
    nW: 6,
    npW: 2,
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
    twoXO: 500,
    tapCRW: 6,
    driverCellConstruction: "integrated",
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    driverMountMode: "shortest",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
    ...overrides,
  };
}

function denseAnnulusClearances(plan) {
  const cdStart = [-0.014, 0, 0];
  const cdEnd = [0.006, 0, 0];
  const byDriver = [];
  for (const driver of plan.drivers) {
    let minimum = Infinity;
    const normal = unit(driver.mountN);
    const rawU = subtract(
      driver.flow,
      multiply(normal, dot(driver.flow, normal)),
    );
    const u = unit(rawU);
    let v = unit(cross(normal, u));
    if (dot(v, driver.cross) < 0) v = multiply(v, -1);
    const stations =
      driver.cell?.coneProfile?.relief?.cavityStations ?? [];
    const reliefOpening = stations.length
      ? Math.max(0, Number(stations.at(-1).radiusM) || 0)
      : 0;
    const innerRadius = Math.min(
      driver.outerR - 1e-6,
      Math.max(reliefOpening, driver.frame.activeR + 0.002),
    );
    const rearDepth = Math.max(0.001, driver.flangeT || 0);
    const gasketDepth = Math.max(0.0008, driver.frame.gasketT || 0.0016);

    for (let axialIndex = 0; axialIndex <= 8; axialIndex += 1) {
      const axial =
        -rearDepth +
        ((rearDepth + gasketDepth) * axialIndex) / 8;
      const center = add(driver.driverFace, multiply(normal, axial));
      for (let radialIndex = 0; radialIndex <= 16; radialIndex += 1) {
        const radius =
          innerRadius +
          ((driver.outerR - innerRadius) * radialIndex) / 16;
        for (let angularIndex = 0; angularIndex < 360; angularIndex += 1) {
          const angle = (angularIndex * 2 * Math.PI) / 360;
          const point = add(
            center,
            add(
              multiply(u, Math.cos(angle) * radius),
              multiply(v, Math.sin(angle) * radius),
            ),
          );
          minimum = Math.min(
            minimum,
            finiteCylinderField(
              point,
              cdStart,
              cdEnd,
              plan.cdFlangeR,
            ),
          );
        }
      }
    }
    byDriver.push({
      driverIndex: driver.index,
      placement: driver.panelPlacement?.kind || null,
      clearance: minimum,
    });
  }
  return byDriver;
}

function denseAnnulusClearance(plan) {
  return Math.min(
    ...denseAnnulusClearances(plan).map((item) => item.clearance),
  );
}

test("reported screenshot state has real 3-D bearing/CD clearance", () => {
  const plan = engine.twoWayPlan(liveCollisionReportState());
  const dense = denseAnnulusClearance(plan);

  assert.equal(plan.drivers.length, 2);
  assert.equal(plan.driverCdFlangeComplete, true);
  assert.equal(plan.driverCdFlangeCoverage, 1);
  assert.equal(
    plan.driverCdFlangeRequired,
    Math.max(0.004, plan.minWeb),
    "the CD keep-out must honor the package's canonical structural web",
  );
  assert.ok(plan.driverCdFlangeSamples >= 8000);
  assert.ok(
    plan.driverCdFlangeClearance > 0.04,
    "the screenshot state should retain over 40 mm of physical clearance",
  );
  assert.ok(
    Math.abs(plan.driverCdFlangeClearance - dense) <= 0.001,
    `plan ${plan.driverCdFlangeClearance} disagrees with dense oracle ${dense}`,
  );

  const evaluation = engine.evaluate2way(liveCollisionReportState());
  const row = evaluation.rows.find(
    (item) => item.name === "Driver bearing and gasket clear HF flange",
  );
  assert.ok(row, "the user-facing 3-D clearance row is missing");
  assert.equal(row.st, "ok");
  assert.match(row.val, /3-D minimum/);
});

test("a real bearing/CD collision fails instead of hiding behind fastener web", () => {
  /* A wider flange alone is not a collision because the physical HF flange
     is finite along the horn axis. Move the complete woofer bearing annulus
     through that finite axial interval so this fixture exercises a genuine
     3-D body overlap rather than an infinite-cylinder false positive. */
  const collision = liveCollisionReportState({
    cdFlangeD: 520,
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 40,
  });
  const plan = engine.twoWayPlan(collision);
  assert.equal(plan.driverCdFlangeComplete, false);
  assert.ok(plan.driverCdFlangeCoverage < 1);
  assert.ok(plan.driverCdFlangeClearance < plan.driverCdFlangeRequired);

  const evaluation = engine.evaluate2way(collision);
  const row = evaluation.rows.find(
    (item) => item.name === "Driver bearing and gasket clear HF flange",
  );
  assert.equal(row?.st, "fail");
  assert.equal(row?.code, "DRIVER_CD_FLANGE_CLEARANCE_INSUFFICIENT");
});

test("six-W5 face and corner bearings clear the finite CD plate in real 3-D", () => {
  const plan = engine.twoWayPlan(sixW5AngularState());
  const dense = denseAnnulusClearances(plan);
  const denseMinimum = Math.min(...dense.map((item) => item.clearance));

  assert.equal(plan.drivers.length, 6);
  assert.deepEqual(
    plan.drivers.map((driver) => driver.panelPlacement.kind),
    ["corner", "face", "corner", "corner", "face", "corner"],
  );
  assert.equal(plan.cornerPlateComplete, true);
  assert.equal(plan.cornerPlateMultiSeamOverlap, false);
  assert.equal(plan.driverCdFlangeComplete, true);
  assert.equal(plan.driverCdFlangeCoverage, 1);
  assert.equal(dense.length, 6);
  for (const item of dense) {
    assert.ok(
      item.clearance >= plan.driverCdFlangeRequired,
      `driver ${item.driverIndex} ${item.placement} bearing clears the `
        + `CD flange by only ${(item.clearance * 1000).toFixed(3)} mm`,
    );
  }
  assert.ok(
    dense.some((item) => item.placement === "corner")
      && dense.some((item) => item.placement === "face"),
    "dense oracle did not cover both face and corner plates",
  );
  assert.ok(
    Math.abs(plan.driverCdFlangeClearance - denseMinimum) <= 0.001,
    `plan ${plan.driverCdFlangeClearance} disagrees with six-W5 dense `
      + `oracle ${denseMinimum}`,
  );
  assert.ok(
    denseMinimum > 0.015,
    "six-W5 bearing package should retain over 15 mm of physical clearance",
  );
});

test("coupled solve and analytic preview consume the clearance ownership", () => {
  assert.match(
    core,
    /mountEnvelopeLegal=q=>[\s\S]{0,350}q\.driverCdFlangeComplete[\s\S]{0,250}q\.driverCdFlangeClearance/,
  );
  assert.match(
    shell,
    /partOwnership=['"]compression-driver flange['"]/,
  );
  assert.match(
    shell,
    /screen overlap is perspective only/,
  );
  assert.match(
    shell,
    /CD↔bearing [\s\S]{0,120}3-D/,
  );
  assert.match(
    shell,
    /driverBearingsClearCdFlange:/,
  );
});
