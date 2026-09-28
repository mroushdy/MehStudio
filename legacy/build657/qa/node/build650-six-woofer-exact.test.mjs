import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { componentMetrics } from "./exact-mesh-diagnostics.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

function sixWooferState() {
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
    covH: 90,
    covV: 60,
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
    shW: "slot",
    tapShapeW: "slot",
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
  };
}

test("six selected woofers produce one manufacturing manifold with twelve open passages", {
  timeout: 240_000,
}, () => {
  for (const boltDW of [5, 6.5]) {
    engine.clearTwoWayMeshCache();
    const solved = engine.solve({ ...sixWooferState(), boltDW });
  assert.equal(solved.infeasible, false);
  assert.equal(solved.S.nW, 6);
  assert.equal(solved.ev.plan.drivers.length, 6);
  assert.equal(solved.ev.plan.allPorts.length, 12);
  assert.equal(solved.ev.plan.driverCells.length, 6);
  assert.equal(solved.ev.plan.frame.generatedPanelBcd, true);
  assert.ok(solved.ev.plan.boltInnerWeb >= solved.ev.plan.boltInnerWebRequired);
  assert.equal(solved.ev.plan.boltOuterWebPass, true);

  const exact = engine.twoWayGeometry(solved.S, "test");
  const audit = engine.meshAudit(exact.mesh);
  const assembly = engine.assemblyAudit(exact.plan, exact.field);
  const components = exact.rawComponentCount === 1
    ? []
    : engine.splitMeshComponents(exact.mesh);
  const componentFacts = components.map((component) => {
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    for (let index = 0; index < engine.meshVertexCount(component); index += 1) {
      const point = engine.meshVertex(component, index);
      for (let axis = 0; axis < 3; axis += 1) {
        low[axis] = Math.min(low[axis], point[axis]);
        high[axis] = Math.max(high[axis], point[axis]);
      }
    }
    return {
      triangles: engine.meshTriangleCount(component),
      center: low.map((value, axis) => +((value + high[axis]) / 2).toFixed(4)),
      span: low.map((value, axis) => +(high[axis] - value).toFixed(4)),
    };
  });

  assert.equal(exact.plan.drivers.length, 6);
  assert.equal(exact.plan.allPorts.length, 12);
  assert.equal(exact.rawComponentCount, 1, JSON.stringify({
    boltDiameterMm: boltDW,
    rawComponentCount: exact.rawComponentCount,
    components: audit.components,
    componentFacts,
    drivers: exact.plan.drivers.map((driver) => ({
      index: driver.index,
      phi: +driver.phi.toFixed(6),
      surface: driver.surface.map((value) => +value.toFixed(4)),
      driverFace: driver.driverFace.map((value) => +value.toFixed(4)),
      outerR: +driver.outerR.toFixed(4),
      boltPhase: +driver.boltPhase.toFixed(6),
    })),
    partDiagnostics: exact.partDiagnostics,
  }));
  assert.equal(audit.components, 1);
  assert.equal(audit.badEdges, 0);
  assert.equal(audit.badOrientation, 0);
  assert.equal(audit.degenerate, 0);
  assert.equal(audit.duplicateFaces, 0);
  assert.equal(audit.nonFinite, 0);
  assert.equal(audit.orientationConflict, 0);
  assert.ok(audit.volume > 0);
  assert.equal(assembly.pass, true);
  assert.equal(
    assembly.rows.find((row) =>
      row.name === "tap cutters connect horn air to front chambers")?.pass,
    true,
  );
    engine.clearTwoWayMeshCache();
  }
});

test("the six-woofer display mesh retains the same single connected solid", {
  timeout: 180_000,
}, () => {
  for (const boltDW of [5, 6.5]) {
    engine.clearTwoWayMeshCache();
    const solved = engine.solve({ ...sixWooferState(), boltDW });
    const exact = engine.twoWayGeometry(solved.S, "display");
    const audit = engine.meshAudit(exact.mesh);
    const componentFacts = exact.rawComponentCount === 1
      ? []
      : engine.splitMeshComponents(exact.mesh)
        .map((component) => componentMetrics(component));

    const expectedDisplayStep = boltDW === 5 ? 0.0025 : 0.003;
    assert.equal(exact.budget.step, expectedDisplayStep);
    assert.equal(exact.mesh.grid.step, expectedDisplayStep);
    assert.equal(
      exact.rawComponentCount,
      1,
      JSON.stringify({
        boltDiameterMm: boltDW,
        rawComponentCount: exact.rawComponentCount,
        grid: exact.mesh.grid,
        componentFacts,
        partDiagnostics: exact.partDiagnostics,
      }),
    );
    assert.equal(audit.components, 1);
    assert.equal(audit.badEdges, 0);
    assert.equal(audit.badOrientation, 0);
    assert.equal(audit.degenerate, 0);
    assert.equal(audit.duplicateFaces, 0);
    assert.equal(audit.nonFinite, 0);
    assert.equal(audit.orientationConflict, 0);
    engine.clearTwoWayMeshCache();
  }
});

test("an exact display refuses complex woofer-fastener clearances below the certified 2.5 mm lattice floor", () => {
  const solved = engine.solve({ ...sixWooferState(), boltDW: 4 });
  assert.equal(solved.infeasible, false);
  assert.throws(
    () => engine.twoWayGeometry(solved.S, "display"),
    (error) => {
      assert.equal(error?.code, "MESH_FEATURE_BELOW_EXACT_FLOOR");
      assert.equal(error?.details?.feature, "woofer fastener");
      assert.equal(error?.details?.diameter, 0.004);
      assert.equal(error?.details?.minimumDiameter, 0.005);
      assert.equal(error?.details?.step, 0.0025);
      return true;
    },
  );
});

test("an explicit undersized woofer BCD is preserved and refused before meshing", () => {
  const state = { ...sixWooferState(), bcdW: 116 };
  const solved = engine.solve(state);
  assert.equal(solved.ev.plan.frame.explicitBcd, true);
  assert.equal(solved.ev.plan.frame.bcd, 0.116);
  assert.equal(solved.ev.plan.boltInnerWebPass, false);
  assert.equal(solved.infeasible, true);
  assert.ok(solved.ev.rows.some((row) =>
    row.code === "DRIVER_FASTENER_INNER_WEB_INSUFFICIENT"));
  assert.throws(
    () => engine.twoWayMeshPreflight(state, "test"),
    (error) => error?.code === "DRIVER_FASTENER_INNER_WEB_INSUFFICIENT",
  );
});
