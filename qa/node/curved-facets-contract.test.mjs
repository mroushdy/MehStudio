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
const inspection = fs.readFileSync(
  path.join(appRoot, "qa/browser/render-inspection.mjs"),
  "utf8",
);

const base = {
  ...engine.TWO_ARCH.radial.defaults,
  topo: "2way",
  twoArch: "radial",
  twoFamily: "radial",
  twoDesign: "arch:radial4",
  style: "curvedFacets",
  profileLaw: "classicOS",
  covH: 90,
  covV: 60,
  mouthW: 36,
  mouthCap: 64,
  throat: 1.4,
  td: 1.4,
  cdSel: "dcx464",
  placeW: "auto",
};

const near = (a, b, tolerance = 1e-12) =>
  Math.abs(a - b) <= tolerance;

const assertPoint = (actual, expected, message) => {
  assert.equal(actual.length, 3, message);
  for (let index = 0; index < 3; index += 1) {
    assert.ok(
      near(actual[index], expected[index]),
      `${message}: coordinate ${index} differs`,
    );
  }
};

test("curved facets are a first-class truthful form with one canonical boundary API", () => {
  assert.equal(engine.CURVED_FACET_SCHEMA.style, "curvedFacets");
  assert.equal(engine.CURVED_FACET_SCHEMA.seamCount, 4);
  assert.equal(engine.CURVED_FACET_SCHEMA.developable, true);
  assert.equal(typeof engine.curvedFacetPoint, "function");
  assert.equal(typeof engine.curvedFacetNormal, "function");
  assert.equal(typeof engine.curvedFacetFlatPattern, "function");
  assert.match(
    shell,
    /id="segStyle"[\s\S]*data-v="smooth"[\s\S]*data-v="angular"[^>]*>ANGULAR \/ 4-FACE<[\s\S]*id="facetProfileCtl"/,
    "the top-level form choice must be smooth versus angular/faceted",
  );
  assert.match(
    shell,
    /id="segFacetProfile"[\s\S]*data-v="angular"[^>]*>4 STRAIGHT FACES<[\s\S]*data-v="curvedFacets"[^>]*>4 CURVED FACES</,
    "curved faces must be nested under the angular/faceted form",
  );
  assert.match(
    shell,
    /facetControl\.style\.display=!one&&faceted/,
    "the facet-profile child control must stay hidden for smooth and one-way forms",
  );
  assert.match(shell, /DEVELOPABLE[^<]*SINGLE-AXIS FORMING REQUIRED/i);
  assert.doesNotMatch(
    shell,
    /new THREE\.Line\(geometry,seamMaterial\)/,
    "seams must be physical mesh boundaries, never unclipped line overlays",
  );
});

test("selected profile stations drive curved facets without changing the meridian hash", () => {
  const faceted = engine.stations(base);
  const smooth = engine.stations({ ...base, style: "smooth" });
  assert.equal(faceted.style, "curvedFacets");
  assert.equal(faceted.sectionFamily, "curvedFacets");
  assert.equal(faceted.profileHash, smooth.profileHash);
  assert.deepEqual(
    faceted.pts.map(({ x, a, b }) => [x, a, b]),
    smooth.pts.map(({ x, a, b }) => [x, a, b]),
  );
});

test("the four nonlinear faces meet at four bit-identical seam curves", () => {
  const stations = engine.stations(base);
  for (const station of [
    stations.pts[0],
    stations.pts[Math.floor(stations.pts.length / 2)],
    stations.pts.at(-1),
  ]) {
    const { x } = station;
    assertPoint(
      engine.curvedFacetPoint(stations, x, "top", 1),
      engine.curvedFacetPoint(stations, x, "right", 1),
      "top-right seam",
    );
    assertPoint(
      engine.curvedFacetPoint(stations, x, "right", -1),
      engine.curvedFacetPoint(stations, x, "bottom", 1),
      "right-bottom seam",
    );
    assertPoint(
      engine.curvedFacetPoint(stations, x, "bottom", -1),
      engine.curvedFacetPoint(stations, x, "left", -1),
      "bottom-left seam",
    );
    assertPoint(
      engine.curvedFacetPoint(stations, x, "left", 1),
      engine.curvedFacetPoint(stations, x, "top", -1),
      "left-top seam",
    );
  }
});

test("curved faces are transversely straight and developable, not double-curved", () => {
  const stations = engine.stations(base);
  const x = stations.depth * 0.53;
  for (const face of ["top", "right", "bottom", "left"]) {
    const minus = engine.curvedFacetPoint(stations, x, face, -1);
    const centre = engine.curvedFacetPoint(stations, x, face, 0);
    const plus = engine.curvedFacetPoint(stations, x, face, 1);
    assertPoint(
      centre,
      minus.map((value, index) => (value + plus[index]) / 2),
      `${face} transverse generator`,
    );
    assertPoint(
      engine.curvedFacetNormal(stations, x, face, -0.7),
      engine.curvedFacetNormal(stations, x, face, 0.7),
      `${face} normal must be independent of transverse coordinate`,
    );
    const pattern = engine.curvedFacetFlatPattern(stations, face);
    assert.equal(pattern.developable, true);
    assert.ok(pattern.points.length >= stations.pts.length * 2);
  }
});

test("conical facets degenerate to planes while Classic OS visibly bows each face", () => {
  const deviation = (profileLaw) => {
    const stations = engine.stations({ ...base, profileLaw });
    const first = engine.curvedFacetPoint(stations, 0, "top", 0);
    const last = engine.curvedFacetPoint(
      stations,
      stations.depth,
      "top",
      0,
    );
    let maximum = 0;
    for (const station of stations.pts) {
      const expected =
        first[2] +
        (last[2] - first[2]) * (station.x / stations.depth);
      maximum = Math.max(maximum, Math.abs(station.b - expected));
    }
    return maximum;
  };
  assert.ok(deviation("conical") <= 0.00001);
  assert.ok(deviation("classicOS") > 0.00025);
});

test("nonlinear facets refuse an unformed flat-sheet manufacturing claim", () => {
  assert.throws(
    () => engine.curvedFacetLayout(base, { forming: false }),
    (error) =>
      error?.name === "CurvedFacetManufacturingRefusal" &&
      error?.code === "CURVED_FACET_FORMING_REQUIRED" &&
      error?.details?.maxChordDeviation > error?.details?.limit,
  );
  const conical = engine.curvedFacetLayout(
    { ...base, profileLaw: "conical" },
    { forming: false },
  );
  assert.equal(conical.requiresForming, false);
  assert.equal(conical.seamCount, 4);
});

test("preview and exact solid consume the same curved-facet section boundary", () => {
  assert.match(core, /style===['"]curvedFacets['"]/);
  assert.match(core, /section(?:Polar)?Point2D/);
  assert.match(core, /sectionLevel2D/);
  assert.match(shell, /quickTwoWayShell/);
  assert.match(shell, /curvedFacets/);
  const stations = engine.stations(base);
  const x = stations.depth * 0.71;
  for (let index = 0; index < 64; index += 1) {
    const parameter = (index / 64) * Math.PI * 2;
    const point = engine.surfPt(stations, x, parameter);
    const dims = engine.dimsAt(stations, x);
    assert.ok(
      near(Math.abs(point[1]), dims.a, 1e-10) ||
        near(Math.abs(point[2]), dims.b, 1e-10),
      "canonical point left the exact rectangular boundary",
    );
  }
});

test("fixed-camera browser QA distinguishes smooth, angular, and curved facets", () => {
  assert.match(inspection, /--wall-topologies/);
  assert.match(inspection, /wall-topology-fixed/);
  assert.match(inspection, /curvedFacets/);
  assert.match(inspection, /pairwisePixelMismatch/);
  assert.match(inspection, /profileHash/);
});
