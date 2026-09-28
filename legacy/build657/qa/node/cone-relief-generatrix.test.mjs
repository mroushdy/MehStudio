import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

function panelState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    _smart2waySchema: 3,
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    mouthW: 32,
    requestedMouthW: 32,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    wPre: "custom",
    odW: 26.1,
    dpW: 11.9,
    sdW: 320,
    vtcW: 1400,
    xmW: 6.8,
    nW: 2,
    npW: 2,
    panelAxis: "horizontal",
    shW: "slot",
    tapShapeW: "slot",
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "parametric",
    coneDepthMm: 30,
    coneDepthKnown: true,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    ...overrides,
  };
}

function stationVolume(stations) {
  let volume = 0;
  for (let index = 1; index < stations.length; index += 1) {
    const a = stations[index - 1];
    const b = stations[index];
    const height = Math.abs(a.depthFromFaceM - b.depthFromFaceM);
    volume += Math.PI * height
      * (a.radiusM ** 2 + a.radiusM * b.radiusM + b.radiusM ** 2) / 3;
  }
  return volume;
}

test("nonzero parametric cone depth owns a nonlinear sampled generatrix", () => {
  const plan = engine.twoWayPlan(panelState(), { deferRetention: true });
  const relief = plan.driverCell.coneProfile.relief;
  assert.equal(relief.kind, "parametric-quarter-sine-generatrix");
  assert.equal(relief.nonlinear, true);
  assert.equal(relief.sampleCount, 17);
  assert.equal(relief.profileStations.length, 17);

  for (let index = 1; index < relief.profileStations.length; index += 1) {
    const previous = relief.profileStations[index - 1];
    const current = relief.profileStations[index];
    assert.ok(current.depthFromFaceM < previous.depthFromFaceM);
    assert.ok(current.radiusM > previous.radiusM);
  }

  const middle = relief.profileStations[8];
  const straightMiddle = relief.tipRadiusM
    + (relief.activeRadiusM - relief.tipRadiusM) * middle.u;
  assert.ok(
    Math.abs(middle.radiusM - straightMiddle) > 0.001,
    "the sampled radius law collapsed back to a straight frustum",
  );
  assert.ok(
    Math.abs(
      plan.driverCell.frontChamber.coneEnvelopeVolumeM3
        - stationVolume(relief.profileStations),
    ) < 1e-15,
    "diagnostic cone volume was not integrated from the canonical stations",
  );
  assert.ok(
    Math.abs(
      plan.driverCell.frontChamber.reliefCavityEnvelopeVolumeM3
        - stationVolume(relief.cavityStations),
    ) < 1e-15,
    "diagnostic clearance volume was not integrated from the canonical cutter",
  );
});

test("zero parametric depth collapses to the flat piston identity", () => {
  const plan = engine.twoWayPlan(panelState({
    coneProfileMode: "parametric",
    coneDepthMm: 0,
    coneDepthKnown: false,
  }), { deferRetention: true });
  const relief = plan.driverCell.coneProfile.relief;
  assert.equal(relief.kind, "flat-piston-plane");
  assert.equal(relief.nonlinear, false);
  assert.equal(relief.profileVolumeM3, 0);
  assert.deepEqual(
    [...new Set(relief.cavityStations.map((station) => station.radiusM))],
    [relief.activeRadiusM + relief.radialClearanceM],
    "zero depth must make a cylindrical clearance behind a flat piston",
  );
  assert.ok(
    relief.profileStations.every((station) => station.depthFromFaceM === 0),
  );
});

test("scalar measured depth remains a conservative cylinder without samples", () => {
  const plan = engine.twoWayPlan(panelState({
    coneProfileMode: "measured",
  }), { deferRetention: true });
  const relief = plan.driverCell.coneProfile.relief;
  assert.equal(relief.kind, "measured-scalar-cylinder-bound");
  assert.equal(relief.nonlinear, false);
  assert.equal(relief.conservativeBound, true);
  assert.equal(relief.measuredSampleCount, 0);
  assert.deepEqual(
    [...new Set(relief.profileStations.map((station) => station.radiusM))],
    [relief.activeRadiusM],
  );
  assert.match(plan.driverCell.coneProfile.envelopeModel, /cylinder bound/);
});

test("the exact field uses the same relief and keeps every tap lumen connected", () => {
  const plan = engine.twoWayPlan(panelState(), { deferRetention: true });
  const field = engine.twoWaySolidField(plan, false);
  assert.equal(field.coneReliefs.length, plan.drivers.length);
  for (const driver of plan.drivers) {
    assert.equal(
      field.coneReliefs[driver.index],
      driver.cell.coneProfile.relief,
      "exact cutter drifted from the driver-cell relief metadata",
    );
    const chamberProbe = driver.cavInner.map(
      (value, axis) => value + driver.mountN[axis] * 0.001,
    );
    assert.ok(field(chamberProbe) > -1e-8, "sampled relief root is blocked");
    for (const tool of field.tapTools[driver.index]) {
      const sections = tool.kind === "swept-aperture" ? tool.sections : [tool];
      for (const section of sections) {
        for (const t of [0.1, 0.5, 0.9]) {
          const point = section.a.map(
            (value, axis) => value + (section.b[axis] - value) * t,
          );
          assert.ok(field(point) > -1e-8, "canonical tap passage is blocked");
        }
      }
    }
  }
  assert.equal(engine.assemblyAudit(plan, field).cutterContinuous, true);
});

test("nonlinear cone relief produces finite manifold exact display geometry", {
  timeout: 120_000,
}, () => {
  engine.clearTwoWayMeshCache();
  const geometry = engine.twoWayGeometry(panelState(), "display");
  const audit = engine.meshAudit(geometry.mesh);
  assert.ok(engine.meshVertexCount(geometry.mesh) > 0);
  assert.ok(engine.meshTriangleCount(geometry.mesh) > 0);
  assert.equal(geometry.rawComponentCount, 1);
  assert.equal(audit.components, 1);
  assert.equal(audit.badEdges, 0);
  assert.equal(audit.badOrientation, 0);
  assert.equal(audit.degenerate, 0);
  assert.equal(audit.duplicateFaces, 0);
  assert.equal(audit.nonFinite, 0);
  assert.equal(audit.orientationConflict, 0);
  assert.ok(audit.volume > 0);
  engine.clearTwoWayMeshCache();
});
