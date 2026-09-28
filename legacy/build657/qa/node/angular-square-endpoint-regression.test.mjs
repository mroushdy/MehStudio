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

const POINT_TOLERANCE = 1e-10;
const FIELD_EPSILON = 0.0002;

function angularState(seN) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "angular",
    profileLaw: "conical",
    seN,
    covH: 90,
    covV: 60,
    mouthW: 32,
    requestedMouthW: 32,
    mouthCap: 64,
    td: 1.4,
    throat: 1.4,
    cdFloor: 300,
    nW: 2,
    npW: 2,
    wPre: "w8",
    odW: 22.5,
    dpW: 9,
    sdW: 220,
    vtcW: 80,
    xmW: 7,
    frameW: "round",
    twoXO: 500,
    tapCRW: 6,
    driverCellConstruction: "integrated",
  };
}

function uniqueVertices(facets) {
  const vertices = [];
  for (const facet of facets) {
    for (const point of [facet.p, facet.q]) {
      if (!vertices.some((candidate) =>
        Math.hypot(
          candidate[0] - point[0],
          candidate[1] - point[1],
        ) <= POINT_TOLERANCE)) {
        vertices.push(point);
      }
    }
  }
  return vertices;
}

test("angular construction always has four continuous rectangular faces", () => {
  for (const requestedExponent of [2, 6, 11.5, 12]) {
    const plan = engine.twoWayPlan(angularState(requestedExponent));
    assert.equal(plan.S.seN, 12, "retired angular exponent was not normalized");
    for (const x of [0, plan.st.depth * 0.35, plan.st.depth]) {
      const facets = engine.facetsAt(plan.st, x);
      const dimensions = engine.dimsAt(plan.st, x);
      const vertices = uniqueVertices(facets);

      assert.equal(facets.length, 4);
      assert.equal(plan.panelTopology?.faces?.length, 4);
      assert.equal(plan.panelTopology?.seams?.length, 4);
      assert.equal(facets.filter((facet) => facet.ch).length, 0);
      assert.equal(vertices.length, 4);
      for (const facet of facets) {
        assert.ok(facet.len > 0);
        assert.ok(
          Math.min(Math.abs(facet.n2[0]), Math.abs(facet.n2[1])) <=
            POINT_TOLERANCE,
          "angular construction retained a diagonal/chamfer face",
        );
      }
      for (const [horizontal, vertical] of [
        [dimensions.a, dimensions.b],
        [dimensions.a, -dimensions.b],
        [-dimensions.a, dimensions.b],
        [-dimensions.a, -dimensions.b],
      ]) {
        assert.ok(
          vertices.some((point) =>
            Math.hypot(point[0] - horizontal, point[1] - vertical) <=
              POINT_TOLERANCE),
          `rectangular corner ${horizontal},${vertical} is missing`,
        );
      }
    }
  }
});

test("preview boundary and exact solid field share both angular endpoint topologies", () => {
  assert.match(
    shell,
    /quickTwoWayShell[\s\S]*MEH2\.twoWaySectionPoint\(P,x,th,extraA,extraB,extra\)/,
    "analytic preview no longer consumes the canonical two-way section point",
  );
  assert.match(
    core,
    /function sdCross[\s\S]*P\.S\.style===['"]angular['"][\s\S]*M\.panelVerts/,
    "exact solid field no longer consumes the canonical angular panel boundary",
  );

  for (const seN of [12, 6]) {
    const plan = engine.twoWayPlan(angularState(seN));
    const x = plan.st.depth * 0.7;
    const facets = engine.facetsAt(plan.st, x);
    for (const [index, facet] of facets.entries()) {
      const phi = Math.atan2(facet.mid[1], facet.mid[0]);
      const preview = engine.twoWaySectionPoint(plan, x, phi, 0, 0, 0);
      assert.ok(
        Math.hypot(
          preview[0] - facet.mid[0],
          preview[1] - facet.mid[1],
        ) <= POINT_TOLERANCE,
        `seN=${seN}/face-${index}: preview left the canonical face`,
      );
      assert.ok(
        Math.abs(
          engine.twoWaySdCross(
            plan,
            x,
            facet.mid[0],
            facet.mid[1],
            0,
          ),
        ) <= POINT_TOLERANCE,
        `seN=${seN}/face-${index}: exact field left the canonical face`,
      );

      const normal = engine.facetN(plan.st, x, index);
      const outside = [
        x + normal[0] * FIELD_EPSILON,
        facet.mid[0] + normal[1] * FIELD_EPSILON,
        facet.mid[1] + normal[2] * FIELD_EPSILON,
      ];
      const inside = [
        x - normal[0] * FIELD_EPSILON,
        facet.mid[0] - normal[1] * FIELD_EPSILON,
        facet.mid[1] - normal[2] * FIELD_EPSILON,
      ];
      assert.ok(
        engine.twoWaySdCross(plan, ...outside, 0) > 0,
        `seN=${seN}/face-${index}: exact field has no exterior`,
      );
      assert.ok(
        engine.twoWaySdCross(plan, ...inside, 0) < 0,
        `seN=${seN}/face-${index}: exact field has no horn-air interior`,
      );
    }
  }
});

test("the retired angular chamfer control is absent from the UI contract", () => {
  assert.match(shell, /data-v="angular"[^>]*>ANGULAR \/ 4-FACE</);
  assert.doesNotMatch(shell, /PANEL CHAMFER CHARACTER/);
  assert.match(
    shell,
    /if\(parameter\)parameter\.style\.display=[\s\S]{0,80}smooth&&family===['"]superellipse['"]/,
  );
});
