import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const engine = require(path.join(projectRoot, "engine.js"));

const LENGTH_TOLERANCE = 2e-12;
const ANGLE_TOLERANCE = 2e-12;

/*
 * These are deliberate geometry anchors, not generic acoustic constants.
 * fhx6 is the measured B&C 6FHX51 B-rep handoff. refd is the explicitly
 * unmeasured BMS 5CN140 class fallback currently used by the reference build.
 * A future driver record may replace refd only by updating its evidence and
 * this reviewed fixture together; an unrelated two-way refactor must not move
 * either apex, tap ring, or round driver-sized handoff accidentally.
 */
const CASES = Object.freeze({
  fhx6: Object.freeze({
    measured: true,
    cone: Object.freeze({
      od: 0.187,
      rFrame: 0.0935,
      rCone: 0.060045,
      rWG: 0.0219355,
      rHole: 0.024542,
      rHF: 0.010033,
      depth: 0.02401,
    }),
    tap: Object.freeze({
      radius: 0.008102556018035717,
      ringRadius: 0.03684455601803572,
      station: 0.0519249915232615,
      area: 0.00020625,
    }),
    handoff: Object.freeze({
      station: 0.14508500945906294,
      radius: 0.1055,
    }),
  }),
  refd: Object.freeze({
    measured: false,
    cone: Object.freeze({
      od: 0.135,
      rFrame: 0.0675,
      rCone: 0.0433998,
      rWG: 0.016274925000000003,
      rHole: 0.017874925000000003,
      rHF: 0.0127,
      depth: 0.016877700000000002,
    }),
    tap: Object.freeze({
      radius: 0.006066677887443902,
      ringRadius: 0.028141602887443905,
      station: 0.04009815226947416,
      area: 0.000115625,
    }),
    handoff: Object.freeze({
      station: 0.10925435962716955,
      radius: 0.0795,
    }),
  }),
});

function fixture(key) {
  const record = engine.BUILDS["1way"].find((entry) => entry.key === key);
  assert.ok(record, `missing canonical one-way fixture ${key}`);
  return structuredClone(record.s);
}

function close(actual, expected, tolerance = LENGTH_TOLERANCE, message = "") {
  assert.ok(
    Number.isFinite(actual)
      && Math.abs(actual - expected) <= tolerance,
    `${message || "value"}: expected ${expected}, received ${actual}`,
  );
}

function radius(point) {
  return Math.hypot(point[1], point[2]);
}

for (const [key, expected] of Object.entries(CASES)) {
  test(`${key}: driver evidence fixes the coax apex and round handoff`, () => {
    const state = fixture(key);
    const cone = engine.coneGeom(state);
    const stations = engine.stations(state);
    const first = stations.wgFace.pts[0];
    const last = stations.wgFace.pts.at(-1);
    const throatSection = engine.dimsAt(stations, 0);
    const handoffSection = engine.dimsAt(stations, stations.xAdapter);
    const mouthSection = engine.dimsAt(stations, stations.depth);

    assert.equal(cone.bad, false);
    assert.equal(cone.meas, expected.measured);
    close(cone.od, expected.cone.od, LENGTH_TOLERANCE, "driver OD");
    close(cone.rFrame, expected.cone.rFrame, LENGTH_TOLERANCE, "frame radius");
    close(cone.rCone, expected.cone.rCone, LENGTH_TOLERANCE, "cone radius");
    close(cone.rWG, expected.cone.rWG, LENGTH_TOLERANCE, "exposed HF mouth");
    close(cone.rHole, expected.cone.rHole, LENGTH_TOLERANCE, "physical clearance");
    close(cone.rHF, expected.cone.rHF, LENGTH_TOLERANCE, "internal HF exit");
    close(cone.dep, expected.cone.depth, LENGTH_TOLERANCE, "LF cone datum");

    /*
     * The printable horn starts at the exposed silver mouth (rWG), not at the
     * recessed compression-driver exit (rHF) and not at the physical clearance
     * land (rHole). It remains circular through the complete driver-sized
     * handoff; a square/superellipse morph may begin only downstream.
     */
    close(first.x, 0, LENGTH_TOLERANCE, "apex station");
    close(first.y, cone.rWG, LENGTH_TOLERANCE, "apex radius");
    close(throatSection.a, cone.rWG, LENGTH_TOLERANCE, "throat half-width");
    close(throatSection.b, cone.rWG, LENGTH_TOLERANCE, "throat half-height");
    close(throatSection.n, 2, LENGTH_TOLERANCE, "throat section exponent");

    close(stations.xAdapter, expected.handoff.station,
      LENGTH_TOLERANCE, "driver handoff station");
    close(last.x, expected.handoff.station,
      LENGTH_TOLERANCE, "waveguide handoff station");
    close(last.y, expected.handoff.radius,
      LENGTH_TOLERANCE, "waveguide handoff radius");
    close(handoffSection.a, expected.handoff.radius,
      LENGTH_TOLERANCE, "handoff half-width");
    close(handoffSection.b, expected.handoff.radius,
      LENGTH_TOLERANCE, "handoff half-height");
    close(handoffSection.n, 2, LENGTH_TOLERANCE,
      "handoff remains circular");
    assert.ok(mouthSection.n > 2, "angular mouth morph must occur after the handoff");

    let priorX = -Infinity;
    let priorRadius = -Infinity;
    for (const point of stations.wgFace.pts) {
      assert.ok(point.x >= priorX - LENGTH_TOLERANCE,
        "coax waveguide must remain forward-only");
      assert.ok(point.y >= priorRadius - LENGTH_TOLERANCE,
        "coax waveguide radius must remain monotone");
      priorX = point.x;
      priorRadius = point.y;
    }
  });

  test(`${key}: tap law and emitted diagonal ring retain verified coordinates`, () => {
    const state = fixture(key);
    const cone = engine.coneGeom(state);
    const design = engine.coaxTapDesign(state, cone);
    const stations = engine.stations(state);
    const taps = engine.layout(state, stations)
      .filter((entry) => entry.kind === "coaxtap");

    assert.equal(design.ok, true);
    assert.equal(design.N, 4);
    close(design.r, expected.tap.radius, LENGTH_TOLERANCE, "tap radius");
    close(design.center, expected.tap.ringRadius,
      LENGTH_TOLERANCE, "tap-ring radius");
    close(design.area, expected.tap.area, LENGTH_TOLERANCE, "per-tap area");
    close(design.totalArea, design.sd / design.cr,
      LENGTH_TOLERANCE, "total compression-ratio area");
    close(design.area, design.totalArea / design.N,
      LENGTH_TOLERANCE, "equal per-tap area");
    close(design.center, cone.rHole + design.minWeb + design.r,
      LENGTH_TOLERANCE, "clearance-to-ring construction");
    close(design.radialInner, design.minWeb,
      LENGTH_TOLERANCE, "inner printable web");
    assert.ok(design.radialOuter >= design.minWeb - LENGTH_TOLERANCE);

    assert.equal(taps.length, design.N);
    for (let index = 0; index < taps.length; index += 1) {
      const tap = taps[index];
      const expectedPhi = (index + 0.5) * 2 * Math.PI / design.N;
      close(tap.phi, expectedPhi, ANGLE_TOLERANCE, `tap ${index} azimuth`);
      /* The driver-owned coax interface remains circular through its
       * registered handoff. An angular downstream horn must not move diagonal
       * tap centers to the corners of a panel section. */
      close(radius(tap.tap), expected.tap.ringRadius,
        LENGTH_TOLERANCE, `tap ${index} ring radius`);
      close(radius(tap.tap), design.center,
        LENGTH_TOLERANCE, `tap ${index} canonical ring radius`);
      close(Math.hypot(...tap.normal), 1,
        LENGTH_TOLERANCE, `tap ${index} unit normal`);
      const radial = [
        0,
        tap.tap[1] / design.center,
        tap.tap[2] / design.center,
      ];
      const tangent = [0, -radial[2], radial[1]];
      assert.ok(
        tap.normal[1] * radial[1] + tap.normal[2] * radial[2] > 0,
        `tap ${index} normal must point radially outward`,
      );
      close(
        tap.normal[1] * tangent[1] + tap.normal[2] * tangent[2],
        0,
        ANGLE_TOLERANCE,
        `tap ${index} normal must not contain an angular-panel tangent`,
      );
      assert.ok(tap.normal[0] < 0,
        `tap ${index} normal must face back toward the driver`);
      close(tap.tap[0], expected.tap.station,
        LENGTH_TOLERANCE, `tap ${index} station`);
      close(tap.slot.sa, design.r,
        LENGTH_TOLERANCE, `tap ${index} aperture semi-axis A`);
      close(tap.slot.sb, design.r,
        LENGTH_TOLERANCE, `tap ${index} aperture semi-axis B`);
      close(tap.slot.ap * 1e-4, design.area,
        LENGTH_TOLERANCE, `tap ${index} declared area`);
      close(tap.slot.apEm * 1e-4, design.area,
        LENGTH_TOLERANCE, `tap ${index} emitted area`);
      assert.deepEqual(tap.slot.design, design,
        "layout must carry the complete canonical coax tap design");
      assert.ok(tap.slot.band.rIn < design.center - design.r);
      assert.ok(tap.slot.band.rOut > design.center + design.r);
      assert.ok(tap.slot.band.rIn > cone.rHole);
      assert.ok(tap.slot.band.rOut < cone.rFrame + 0.012);
    }
  });

  test(`${key}: apex dish and outer horn form one watertight printable solid`, () => {
    const state = fixture(key);
    const cone = engine.coneGeom(state);
    const stations = engine.stations(state);
    const dish = engine.dishMesh(state, true);
    const horn = engine.coaxHornMesh(state);
    const audit = engine.meshAudit(horn);
    const expectedRadius = cone.rFrame + 0.012;
    const wall = state.wallT || 0.012;

    assert.ok(dish?.seam, "open coax dish must expose its registered handoff seam");
    assert.equal(dish.seam.front.length, dish.seam.back.length);
    assert.ok(dish.seam.front.length >= 64);
    for (let index = 0; index < dish.seam.front.length; index += 1) {
      const front = dish.pos[dish.seam.front[index]];
      const back = dish.pos[dish.seam.back[index]];
      close(front[0], stations.xAdapter,
        LENGTH_TOLERANCE, `front seam ${index} station`);
      close(back[0], stations.xAdapter - wall,
        LENGTH_TOLERANCE, `rear seam ${index} station`);
      close(radius(front), expectedRadius,
        LENGTH_TOLERANCE, `front seam ${index} radius`);
      close(radius(back), expectedRadius,
        LENGTH_TOLERANCE, `rear seam ${index} radius`);
    }

    assert.ok(dish.boreTri[1] > dish.boreTri[0],
      "dish must own physical through-bore walls");
    assert.deepEqual(horn.boreTri, dish.boreTri,
      "one-piece horn must retain the dish bore-wall triangle range");
    assert.equal(audit.badEdges, 0);
    assert.equal(audit.badOrientation, 0);
    assert.equal(audit.orientationConflict, 0);
    assert.equal(audit.degenerate, 0);
    assert.equal(audit.duplicateFaces, 0);
    assert.equal(audit.nonFinite, 0);
    assert.equal(audit.components, 1);
    assert.ok(audit.volume > 0);
  });
}

test("printable throat ID and radial collar thickness are independent owners", () => {
  const measured = fixture("fhx6");
  const measuredCone = engine.coneGeom(measured);
  close(
    measuredCone.throatCollarT,
    (measured.coneClearanceD - measured.coneMouthD) / 2000,
    LENGTH_TOLERANCE,
    "measured diameter pair converts to radial collar",
  );

  const custom = {
    ...measured,
    coneMouthD: 75.9,
    throatCollarT: 1.6,
  };
  delete custom.coneClearanceD;
  const first = engine.coneGeom(custom);
  custom.coneMouthD = 92.0;
  const second = engine.coneGeom(custom);
  close(first.throatCollarT, 0.0016);
  close(second.throatCollarT, 0.0016);
  close(first.rHole - first.rWG, 0.0016);
  close(second.rHole - second.rWG, 0.0016);
  close(2 * first.rHole * 1000, 75.9 + 2 * 1.6);
  close(2 * second.rHole * 1000, 92.0 + 2 * 1.6);
});
