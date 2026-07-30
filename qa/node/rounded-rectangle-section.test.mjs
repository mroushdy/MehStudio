import assert from "node:assert/strict";
import test from "node:test";

import { engine } from "./case-loader.mjs";

const TOL = 2e-12;
const base = {
  ...engine.TWO_ARCH.radial.defaults,
  topo: "2way",
  twoArch: "radial",
  twoFamily: "radial",
  twoDesign: "arch:radial",
  style: "smooth",
  sectionFamily: "roundedRectangle",
  sectionCornerRatio: 0.3,
  throat: 1.4,
  td: 1.4,
  covH: 90,
  covV: 60,
  mouthW: 36,
  mouthCap: 64,
  profileLaw: "conical",
  placeW: "auto",
  driverCellConstruction: "integrated",
  coneProfileMode: "flat",
  coneDepthMm: 0,
  coneDepthKnown: false,
  coneAxialClearanceMm: 0,
  coneRadialClearanceMm: 0,
  wallT: 0.012,
  cdFloor: 300,
  cdDepth: 2.4,
  tapBasis: "model",
  twoXO: 500,
  tapCRW: 6,
  shW: "slot",
  nW: 4,
  npW: 1,
  odW: 13.76,
  sdW: 91.6,
  vtcW: 35,
  xmW: 2.5,
  wPre: "w5",
};

test("cardinal section points snap to exact symmetry", () => {
  assert.deepEqual(engine.snappedTrig(Math.PI), [-1, 0]);
  assert.deepEqual(engine.snappedTrig(3 * Math.PI / 2), [0, -1]);
  assert.deepEqual(engine.sePoint(0.4, 0.2, 9, Math.PI), [-0.4, 0]);
  assert.deepEqual(
    engine.roundedRectPoint(0.4, 0.2, 0.05, Math.PI),
    Object.assign([-0.4, 0], { param: Math.PI }),
  );
});

test("filleted rectangle has exact side, corner, area, and perimeter laws", () => {
  const a = 0.4;
  const b = 0.23;
  const r = 0.07;
  const side = engine.roundedRectPoint(a, b, r, 0);
  assert.equal(side[0], a);
  assert.equal(side[1], 0);

  const ring = engine.roundedRectRing(a, b, r, 257);
  for (const point of ring) {
    assert.ok(
      Math.abs(engine.roundedRectSdf(a, b, r, point[0], point[1])) < TOL,
      `ring vertex must lie on exact boundary: ${point}`,
    );
  }
  assert.ok(
    Math.abs(
      engine.sectionArea2D("roundedRectangle", a, b, 2, r)
        - (4 * a * b - (4 - Math.PI) * r * r),
    ) < 1e-15,
  );
  assert.ok(
    Math.abs(
      engine.sectionPerimeter2D("roundedRectangle", a, b, 2, r)
        - (4 * (a + b - 2 * r) + 2 * Math.PI * r),
    ) < 1e-15,
  );
});

test("corner roundness morph is legal and monotone at every solved station", () => {
  const st = engine.stations(base);
  assert.equal(st.sectionFamily, "roundedRectangle");
  assert.equal(st.pts[0].cornerRatio, 1);
  assert.ok(Math.abs(st.pts.at(-1).cornerRatio - 0.3) < 1e-12);
  for (let index = 0; index < st.pts.length; index += 1) {
    const point = st.pts[index];
    assert.ok(point.cornerR > 0);
    assert.ok(point.cornerR <= Math.min(point.a, point.b) + 1e-15);
    if (index) {
      assert.ok(
        point.cornerRatio <= st.pts[index - 1].cornerRatio + 1e-14,
        "roundness must move monotonically from circular to the selected value",
      );
    }
  }
  for (let index = 0; index <= 80; index += 1) {
    const d = engine.dimsAt(st, st.depth * index / 80);
    assert.ok(d.cornerR > 0 && d.cornerR <= Math.min(d.a, d.b) + 1e-15);
  }
});

test("station perimeter, normals, outer offset, preview, and two-way SDF share the family", () => {
  const st = engine.stations(base);
  for (const fraction of [0.2, 0.5, 1]) {
    const x = st.depth * fraction;
    const d = engine.dimsAt(st, x);
    for (const phi of [0, 0.37, Math.PI / 2, 2.1, Math.PI]) {
      const point = engine.surfPt(st, x, phi);
      assert.ok(
        Math.abs(engine.sectionLevel2D(
          "roundedRectangle",
          d.a,
          d.b,
          d.n,
          d.cornerR,
          point[1],
          point[2],
        )) < TOL,
      );
      assert.ok(engine.surfN(st, x, phi).every(Number.isFinite));
    }
    const wall = 0.012;
    for (const point of engine.offsetRing(st, x, wall, 127)) {
      assert.ok(
        Math.abs(engine.sectionLevel2D(
          "roundedRectangle",
          d.a + wall,
          d.b + wall,
          d.n,
          d.cornerR + wall,
          point[0],
          point[1],
        )) < TOL,
      );
    }
  }

  const visual = engine.interiorVisualMesh(base);
  assert.ok(visual.pos.length > 1000 && visual.tri.length > 1000);
  const plan = engine.twoWayPlan(base, {
    deferRetention: true,
    coarseRadialDiagnostics: true,
  });
  assert.equal(plan.st.sectionFamily, "roundedRectangle");
  const x = plan.st.depth;
  const d = engine.dimsAt(plan.st, x);
  for (const phi of [0, 0.41, Math.PI / 2, 2.7, Math.PI]) {
    const boundary = engine.twoWaySectionPoint(plan, x, phi);
    assert.ok(Math.abs(engine.twoWaySdCross(
      plan,
      x,
      boundary[0],
      boundary[1],
      0,
    )) < TOL);
    assert.ok(engine.twoWaySdCross(
      plan,
      x,
      boundary[0] * 0.9,
      boundary[1] * 0.9,
      0,
    ) < 0);
  }
  assert.ok(Math.abs(
    engine.areaAt(plan.st, x)
      - engine.sectionArea2D(
        "roundedRectangle",
        d.a,
        d.b,
        d.n,
        d.cornerR,
      ),
  ) < 1e-15);
});

test("radial mounts size the generated BCD from the real insert pocket and preserve explicit refusals", () => {
  const generated = engine.twoWayPlan(base);
  assert.equal(generated.frame.generatedRadialBcd, true);
  assert.equal(generated.boltInnerWebPass, true);
  assert.equal(generated.boltOuterWeb, 0);
  assert.equal(Number.isFinite(generated.boltOuterWeb), true);
  assert.equal(generated.boltOuterWebPass, true);
  assert.ok(generated.frame.bcd >= generated.frame.minimumRadialBcd - 1e-12);

  const declaredState = { ...base, bcdW: 116 };
  const declared = engine.twoWayPlan(declaredState);
  assert.equal(declared.frame.explicitBcd, true);
  assert.equal(declared.frame.bcd, 0.116);
  assert.equal(declared.boltInnerWebPass, false);
  assert.throws(
    () => engine.twoWayMeshPreflight(declaredState, "display"),
    (error) => error?.code === "DRIVER_FASTENER_INNER_WEB_INSUFFICIENT",
  );
});

test("rounded-rectangle production solid is one watertight audited export component", {
  timeout: 120_000,
}, () => {
  engine.clearTwoWayMeshCache();
  const geometry = engine.twoWayGeometry(base, "display");
  const audit = engine.fabricationAudit(base, geometry.mesh, false);
  assert.equal(geometry.plan.st.sectionFamily, "roundedRectangle");
  assert.equal(geometry.plan.frame.generatedRadialBcd, true);
  assert.equal(geometry.plan.boltInnerWebPass, true);
  assert.equal(geometry.rawComponentCount, 1);
  assert.equal(geometry.partDiagnostics.length, 1);
  assert.equal(geometry.partDiagnostics[0].componentCount, 1);
  assert.ok(engine.meshVertexCount(geometry.mesh) > 10_000);
  assert.ok(engine.meshTriangleCount(geometry.mesh) > 20_000);
  assert.equal(audit.expectedComponents, 1);
  assert.equal(audit.components, 1);
  assert.equal(audit.badEdges, 0);
  assert.equal(audit.badOrientation, 0);
  assert.equal(audit.degenerate, 0);
  assert.equal(audit.duplicateFaces, 0);
  assert.equal(audit.nonFinite, 0);
  assert.equal(audit.orientationConflict, 0);
  assert.equal(audit.assembly.pass, true);
  assert.equal(audit.pass, true);
  engine.clearTwoWayMeshCache();
});
