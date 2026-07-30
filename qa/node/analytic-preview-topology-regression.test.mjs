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
const THREE = require("three");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

const BOUNDARY_TOLERANCE = 1e-9;

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
    if (character === "'" || character === "\"" || character === "`") {
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

function sixW5State() {
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

let cachedFixture;
function sixW5Fixture() {
  if (cachedFixture) return cachedFixture;
  const state = engine.migrateTwoWayState(sixW5State());
  const solved = engine.solve(state);
  assert.ok(!solved.infeasible, "six-W5 angular fixture was refused");
  assert.equal(solved.ev.plan.drivers.length, 6, "six-W5 fixture lost a driver");
  cachedFixture = {
    plan: solved.ev.plan,
    field: engine.twoWaySolidField(solved.ev.plan),
  };
  return cachedFixture;
}

let cachedExtendedFixture;
function sixW5ExtendedFixture() {
  if (cachedExtendedFixture) return cachedExtendedFixture;
  const state = engine.migrateTwoWayState({
    ...sixW5State(),
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 10,
    driverAxisBlend: 0.5,
  });
  const plan = engine.twoWayPlan(state);
  assert.equal(plan.drivers.length, 6,
    "six-W5 extended renderer fixture lost a driver");
  cachedExtendedFixture = {
    plan,
    field: engine.twoWaySolidField(plan),
  };
  return cachedExtendedFixture;
}

function distance2(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pointSegmentDistance(point, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1]];
  const denominator = Math.max(1e-18, ab[0] ** 2 + ab[1] ** 2);
  const t = Math.max(0, Math.min(1,
    ((point[0] - a[0]) * ab[0] + (point[1] - a[1]) * ab[1])
      / denominator));
  return distance2(point, [a[0] + ab[0] * t, a[1] + ab[1] * t]);
}

test("angular quick shell preserves all rectangle corners at station and mouth", () => {
  const { plan } = sixW5Fixture();
  const quickTwoWayShell = vm.runInNewContext(
    `(${namedFunction(shell, "quickTwoWayShell")})`,
    { MEH2: engine },
  );
  const mesh = quickTwoWayShell(plan);

  for (const [label, x] of [
    ["woofer station", plan.station],
    ["mouth", plan.st.depth],
  ]) {
    const dimensions = engine.dimsAt(plan.st, x);
    const corners = engine.panelVerts(
      dimensions.a,
      dimensions.b,
      dimensions.n,
    );
    const stationPoints = mesh.pos
      .filter((point) => Math.abs(point[0] - x) <= BOUNDARY_TOLERANCE);
    const nearestStationDistance = Math.min(
      ...mesh.pos.map((point) => Math.abs(point[0] - x)),
    );
    assert.ok(
      stationPoints.length >= 8,
      `${label}: quick shell has no ring at the required axial datum; `
        + `nearest ring is ${(nearestStationDistance * 1000).toFixed(6)} mm away`,
    );
    /*
     * quickTwoWayShell emits one inner and one outer ring at each x. Select
     * the half nearest the zero-offset canonical field instead of depending
     * on a particular sample count or on the two rings' storage order.
     */
    const innerBoundary = stationPoints
      .map((point) => ({
        point,
        residual: Math.abs(engine.twoWaySdCross(
          plan,
          x,
          point[1],
          point[2],
          0,
        )),
      }))
      .sort((a, b) => a.residual - b.residual)
      .slice(0, Math.floor(stationPoints.length / 2))
      .sort((a, b) =>
        Math.atan2(a.point[2], a.point[1])
          - Math.atan2(b.point[2], b.point[1]))
      .map(({ point }) => [point[1], point[2]]);

    assert.ok(
      innerBoundary.length >= 4,
      `${label}: quick shell has no identifiable inner perimeter`,
    );
    const missingVertex = corners.map((corner) =>
      Math.min(...innerBoundary.map((point) => distance2(corner, point))));
    const chordCut = corners.map((corner) =>
      Math.min(...innerBoundary.map((point, index) =>
        pointSegmentDistance(
          corner,
          point,
          innerBoundary[(index + 1) % innerBoundary.length],
        ))));
    const maximumMissingVertex = Math.max(...missingVertex);
    const maximumChordCut = Math.max(...chordCut);

    assert.ok(
      maximumMissingVertex <= BOUNDARY_TOLERANCE
        && maximumChordCut <= BOUNDARY_TOLERANCE,
      `${label}: all four exact corner vertices and zero corner chord are required; `
        + `worst missing vertex=${(maximumMissingVertex * 1000).toFixed(6)} mm, `
        + `worst chord cut=${(maximumChordCut * 1000).toFixed(6)} mm`,
    );
  }
});

test("tap clipping keeps horn wall-only but sweeps the complete integrated cell", () => {
  const { plan, field } = sixW5ExtendedFixture();
  assert.ok(
    field.tapTools.flat().every((tool) =>
      tool.kind === "swept-aperture" && tool.sections.length > 1),
    "fixture no longer contains multi-section canonical swept taps",
  );

  const applyTapBooleanClip = vm.runInNewContext(
    `(${namedFunction(shell, "applyTapBooleanClip")})`,
    {
      THREE,
      P3: (point) => new THREE.Vector3(point[0], point[2], point[1]),
    },
  );
  for (const [driverIndex, driver] of plan.drivers.entries()) {
    const tools = field.tapTools[driverIndex];
    assert.equal(tools.length, driver.ports.length);
    const canonicalSectionCount = tools.reduce(
      (sum, tool) => sum + tool.sections.length,
      0,
    );
    const wallSectionCount = tools.reduce(
      (sum, tool) =>
        sum + tool.sections
          .filter((section) => section.stage === "wall").length,
      0,
    );
    assert.ok(
      canonicalSectionCount > wallSectionCount,
      `driver ${driverIndex}: fixture cannot distinguish complete swept `
        + "clipping from wall-only clipping",
    );

    const clipRecord = (role) => {
      const material = new THREE.MeshBasicMaterial();
      applyTapBooleanClip(material, plan, role, field, false, driverIndex);
      return material.userData.tapBooleanClip;
    };
    const horn = clipRecord("horn-shell");
    const integrated = clipRecord("horn-and-integrated-cell");

    assert.equal(
      horn.count,
      wallSectionCount,
      `driver ${driverIndex}: horn shell must consume only each tap's wall section`,
    );
    assert.equal(
      horn.sweptSections,
      wallSectionCount,
      `driver ${driverIndex}: horn shell reported non-wall swept sections`,
    );
    assert.equal(
      integrated.count,
      canonicalSectionCount,
      `driver ${driverIndex}: integrated support must consume every canonical swept section`,
    );
    assert.equal(
      integrated.sweptSections,
      canonicalSectionCount,
      `driver ${driverIndex}: integrated support dropped canonical swept sections`,
    );
  }

  const shortest = sixW5Fixture();
  for (const [driverIndex, driver] of shortest.plan.drivers.entries()) {
    const tools = shortest.field.tapTools[driverIndex];
    assert.ok(tools.every((tool) =>
      tool.geometryMode === "straight-cone-normal"
        && tool.sections.length === 1),
    `driver ${driverIndex}: shortest fixture lost its one-section topology`);
    const material = new THREE.MeshBasicMaterial();
    applyTapBooleanClip(
      material,
      shortest.plan,
      "horn-shell",
      shortest.field,
      false,
      driverIndex,
    );
    assert.equal(
      material.userData.tapBooleanClip.count,
      driver.ports.length,
      `driver ${driverIndex}: horn clipper dropped the sole straight `
        + "section that owns each shortest acoustic opening",
    );
    assert.equal(
      material.userData.tapBooleanClip.sweptSections,
      driver.ports.length,
      `driver ${driverIndex}: shortest horn openings lost swept authority`,
    );
  }
});

test("flat cone relief previews its canonical cylinder and finite solid floor", () => {
  const { plan } = sixW5Fixture();
  const driver = plan.drivers[0];
  const stations = driver.cell.coneProfile.relief.cavityStations;
  assert.ok(stations.length >= 2, "fixture lost its canonical relief stations");
  assert.ok(
    stations.every((station) =>
      Math.abs(station.radiusM - stations[0].radiusM) <= 1e-12),
    "flat fixture no longer exercises the cylindrical relief regression",
  );

  const canonicalReliefPreviewRings = vm.runInNewContext(
    `(${namedFunction(shell, "canonicalReliefPreviewRings")})`,
  );
  const rings = canonicalReliefPreviewRings(
    driver,
    driver.cavInner,
    driver.driverFace,
    driver.coneTipR,
    stations.at(-1).radiusM,
  );
  assert.equal(
    rings.length,
    stations.length,
    "preview added a fictitious cone station to the flat relief",
  );
  for (let index = 0; index < stations.length; index += 1) {
    const station = stations[index];
    assert.ok(
      Math.abs(rings[index].radius - station.radiusM) <= 1e-12,
      `station ${index}: preview radius diverges from the exact relief`,
    );
    const expected = driver.driverFace.map((value, coordinate) =>
      value - driver.mountN[coordinate] * station.depthFromFaceM);
    assert.ok(
      Math.hypot(...rings[index].center.map((value, coordinate) =>
        value - expected[coordinate])) <= 1e-12,
      `station ${index}: preview depth diverges from the exact relief`,
    );
  }

  const supportSource = namedFunction(shell, "relievedSupportVisual");
  assert.match(
    supportSource,
    /canonical-chamber-floor[\s\S]*canonicalChamberFloorCount=1/,
    "preview does not own one canonical finite chamber floor",
  );
  assert.match(
    supportSource,
    /structural-root-closure[\s\S]*structuralRootClosureCount=1/,
    "preview leaves the annular support root open below the bearing plate",
  );
  assert.match(
    supportSource,
    /exteriorMat\.side=THREE\.DoubleSide[\s\S]*twoSidedStructuralExteriorCount=2/,
    "closed support exterior still vanishes in underside inspection",
  );
  assert.match(
    supportSource,
    /solidContinuousPreview=\s*rootClosureTriangles\.length===N\*2/,
    "preview claims solid continuity without checking its root closure",
  );
  assert.match(
    supportSource,
    /fakeCapCount=0/,
    "preview still reports an invented chamber cap",
  );
  assert.match(
    supportSource,
    /\{weldNormals:true,preserveModelWinding:true\}/,
    "chamber surfaces are not indexed/smoothed with corrected display winding",
  );
  assert.match(
    supportSource,
    /const N=96/,
    "chamber preview angular resolution regressed below its smooth witness",
  );
  const cartridgeSource = namedFunction(shell, "panelCartridgeVisual");
  assert.doesNotMatch(
    cartridgeSource,
    /chamberCap\s*=\s*profileClippedDisc/,
    "cartridge stacks the obsolete coneTipR cap over the canonical floor",
  );
});

test("shortest swept preview is one shader-free open prism with trimmed global overtravel", () => {
  const { plan, field } = sixW5Fixture();
  const sweptTapPassageVisual = vm.runInNewContext(
    `(()=>{
      ${namedFunction(shell, "applyTapBooleanClip")}
      return (${namedFunction(shell, "sweptTapPassageVisual")});
    })()`,
    {
      THREE,
      MEH2: engine,
      add3: (a, b, scale = 1) =>
        a.map((value, index) => value + b[index] * scale),
      P3: (point) => new THREE.Vector3(point[0], point[2], point[1]),
    },
  );
  let inwardTriangles = 0;
  let outwardTriangles = 0;

  for (const [driverIndex, driver] of plan.drivers.entries()) {
    for (const [tapIndex, tap] of driver.ports.entries()) {
      const tool = field.tapTools[driverIndex][tapIndex];
      assert.equal(tool.geometryMode, "straight-cone-normal");
      assert.equal(tool.sections.length, 1);
      const material = new THREE.MeshBasicMaterial();
      const group = sweptTapPassageVisual(
        tool,
        tap,
        0.0002,
        material,
        "driver-cell-tap-interface",
      );
      assert.equal(group.userData.singleSectionFastPath, true);
      assert.equal(group.userData.canonicalUnionBoundary, true);
      assert.equal(group.userData.frameCorrespondenceRequired, false);
      assert.equal(group.userData.globalOpenBoundaryCount, 2);
      assert.equal(group.userData.canonicalUnionSectionCount, 1);
      assert.equal(group.userData.canonicalUnionMaterialCount, 1);
      assert.equal(group.userData.canonicalUnionShaderCount, 0);
      assert.equal(group.userData.canonicalUnionBooleanClipCount, 0);
      assert.equal(group.userData.internalCapCount, 0);
      assert.equal(group.children.length, 1);
      const mesh = group.children[0];
      assert.equal(mesh.userData.singleContinuousSurface, true);
      assert.equal(mesh.material, material);
      assert.equal(mesh.geometry.groups.length, 0);
      assert.equal(material.userData.tapBooleanClip, undefined);
      assert.equal(mesh.userData.sharedCallerMaterial, true);
      assert.equal(mesh.userData.internalCapCount, 0);

      const position = mesh.geometry.getAttribute("position");
      const index = mesh.geometry.getIndex();
      const section = tool.sections[0];
      const outline = engine.twoWayApertureOutline(section, 64);
      const ringSize = outline.length;
      assert.equal(position.count, ringSize * 2);
      assert.equal(index.count, ringSize * 6);
      const modelPoint = (vertex) => [
        position.getX(vertex),
        position.getZ(vertex),
        position.getY(vertex),
      ];
      const ringCenters = [0, 1].map((ring) =>
        Array.from({ length: ringSize }, (_, point) =>
          modelPoint(ring * ringSize + point))
          .reduce((sum, point) =>
            sum.map((value, coordinate) => value + point[coordinate]),
          [0, 0, 0])
          .map((value) => value / ringSize));
      const sectionAxis = section.b.map(
        (value, coordinate) => value - section.a[coordinate]);
      const renderAxis = ringCenters[1].map(
        (value, coordinate) => value - ringCenters[0][coordinate]);
      const sectionLength = Math.hypot(...sectionAxis);
      const renderLength = Math.hypot(...renderAxis);
      const axisCosine = sectionAxis.reduce((sum, value, coordinate) =>
        sum + value * renderAxis[coordinate], 0)
        / (sectionLength * renderLength);
      assert.ok(
        axisCosine > 1 - 1e-8,
        `driver ${driverIndex}/tap ${tapIndex}: global endpoint trim `
          + "sheared the canonical straight section axis",
      );
      for (const [ring, center] of ringCenters.entries()) {
        const expected = ring === 0
          ? mesh.userData.renderEndpoints.a
          : mesh.userData.renderEndpoints.b;
        assert.ok(
          Math.hypot(...center.map((value, coordinate) =>
            value - expected[coordinate])) < 1e-7,
          `driver ${driverIndex}/tap ${tapIndex}: render ring ${ring} `
            + "left its declared global trim endpoint",
        );
        const fromCutterA = center.map(
          (value, coordinate) => value - section.a[coordinate]);
        const axial = fromCutterA.reduce((sum, value, coordinate) =>
          sum + value * sectionAxis[coordinate], 0)
          / (sectionLength * sectionLength);
        assert.ok(
          Math.hypot(...fromCutterA.map((value, coordinate) =>
            value - sectionAxis[coordinate] * axial)) < 1e-7,
          `driver ${driverIndex}/tap ${tapIndex}: render ring ${ring} `
            + "left the exact canonical section centreline",
        );
        for (let point = 0; point < ringSize; point += 1) {
          const delta = modelPoint(ring * ringSize + point)
            .map((value, coordinate) => value - center[coordinate]);
          assert.ok(
            Math.abs(delta.reduce((sum, value, coordinate) =>
              sum + value * section.u[coordinate], 0) - outline[point][0])
              < 1e-7
            && Math.abs(delta.reduce((sum, value, coordinate) =>
              sum + value * section.v[coordinate], 0) - outline[point][1])
              < 1e-7,
            `driver ${driverIndex}/tap ${tapIndex}: canonical section `
              + "frame or cross-section changed in the fast renderer",
          );
        }
      }
      for (const endpoint of ["a", "b"]) assert.ok(
        mesh.userData.canonicalCutterEndpoints[endpoint]
          .every((value, coordinate) =>
            value === section[endpoint][coordinate]),
        `canonical cutter ${endpoint} endpoint was not retained as metadata`,
      );
      assert.ok(
        Math.hypot(...mesh.userData.renderEndpoints.a.map(
          (value, coordinate) => value - section.a[coordinate])) > 0.0001,
        "front Boolean safety backoff was mistaken for physical lumen wall",
      );
      assert.ok(
        Math.hypot(...mesh.userData.renderEndpoints.b.map(
          (value, coordinate) => value - section.b[coordinate])) > 0.0001,
        "terminal Boolean overlap was mistaken for physical lumen wall",
      );

      const edgeCounts = new Map();
      for (let item = 0; item < index.count; item += 3) {
        const triangle = [
          index.getX(item), index.getX(item + 1), index.getX(item + 2)];
        const points = triangle.map((vertex) => new THREE.Vector3(
          position.getX(vertex), position.getY(vertex), position.getZ(vertex)));
        const normal = points[1].clone().sub(points[0])
          .cross(points[2].clone().sub(points[0]));
        const axisCenter = new THREE.Vector3(
          ...ringCenters[0].map((value, coordinate) =>
            (value + ringCenters[1][coordinate]) / 2));
        /* Convert the model centre through P3 before comparing it with
           display-space triangle positions. */
        axisCenter.set(
          (ringCenters[0][0] + ringCenters[1][0]) / 2,
          (ringCenters[0][2] + ringCenters[1][2]) / 2,
          (ringCenters[0][1] + ringCenters[1][1]) / 2,
        );
        const radial = points[0].clone().add(points[1]).add(points[2])
          .multiplyScalar(1 / 3).sub(axisCenter);
        if (normal.dot(radial) < 0) inwardTriangles += 1;
        else outwardTriangles += 1;
        for (let edge = 0; edge < 3; edge += 1) {
          const first = triangle[edge];
          const second = triangle[(edge + 1) % 3];
          const key = first < second
            ? `${first}:${second}` : `${second}:${first}`;
          edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
        }
      }
      const boundaryEdges = [...edgeCounts.entries()]
        .filter(([, count]) => count === 1)
        .map(([edge]) => edge.split(":").map(Number));
      assert.equal(
        [...edgeCounts.values()].filter((count) => count > 2).length,
        0,
        "single open prism acquired a nonmanifold edge",
      );
      assert.equal(boundaryEdges.length, ringSize * 2);
      assert.ok(boundaryEdges.every(([a, b]) =>
        (a < ringSize) === (b < ringSize)),
      "the only boundaries must be the two global end rings");
    }
  }
  assert.ok(
    inwardTriangles > 0.9 * (inwardTriangles + outwardTriangles),
    `exact prism winding must expose the lumen interior; got ${inwardTriangles} `
      + `inward vs ${outwardTriangles} outward triangles`,
  );
});

test("no-driver CD throat cue is not an opaque flat CircleGeometry plug", () => {
  const renderSource = namedFunction(shell, "renderTwoWay");
  assert.doesNotMatch(
    renderSource,
    /new\s+THREE\.Mesh\(\s*new\s+THREE\.CircleGeometry\(\s*P\.throatR\b[^)]*\)\s*,\s*apertureMat\s*\)/s,
    "NODRV compression throat still uses the opaque aperture material on a flat circle",
  );
});
