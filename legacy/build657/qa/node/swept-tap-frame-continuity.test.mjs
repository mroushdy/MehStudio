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

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map(
  (value, index) => value - b[index],
);
const multiply = (a, scalar) => a.map((value) => value * scalar);
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.hypot(...a);
const unit = (a) => {
  const magnitude = length(a) || 1;
  return multiply(a, 1 / magnitude);
};
const clamp = (value, low, high) => Math.max(
  low,
  Math.min(high, value),
);
const degrees = (radians) => radians * 180 / Math.PI;

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

function sixW5ExtendedState() {
  return sixW5AngularState({
    driverMountMode: "extended-manifold",
    driverMountExtraMm: 10,
    driverAxisBlend: 0.5,
  });
}

function rotateAroundAxis(vector, axis, angle) {
  const normal = unit(axis);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(
    add(
      multiply(vector, cosine),
      multiply(cross(normal, vector), sine),
    ),
    multiply(normal, dot(normal, vector) * (1 - cosine)),
  );
}

function transportVector(vector, fromAxis, toAxis) {
  const from = unit(fromAxis);
  const to = unit(toAxis);
  const turnAxis = cross(from, to);
  const turnSine = length(turnAxis);
  const turnCosine = clamp(dot(from, to), -1, 1);
  if (turnSine < 1e-12) {
    if (turnCosine > 0) return vector.slice();
    const fallback = Math.abs(from[0]) < 0.8
      ? unit(cross(from, [1, 0, 0]))
      : unit(cross(from, [0, 1, 0]));
    return rotateAroundAxis(vector, fallback, Math.PI);
  }
  return rotateAroundAxis(
    vector,
    multiply(turnAxis, 1 / turnSine),
    Math.atan2(turnSine, turnCosine),
  );
}

function frame(section) {
  return {
    u: unit(section.u),
    v: unit(section.v),
    w: unit(subtract(section.b, section.a)),
  };
}

function relativePhase(previous, next) {
  const transportedU = unit(transportVector(
    previous.u,
    previous.w,
    next.w,
  ));
  const transportedV = unit(cross(next.w, transportedU));
  return Math.atan2(
    dot(next.u, transportedV),
    dot(next.u, transportedU),
  );
}

function rendererAlignedFrames(rawFrames) {
  const aligned = [];
  const flips = [];
  for (const raw of rawFrames) {
    let u = raw.u.slice();
    let v = raw.v.slice();
    let flipped = false;
    if (aligned.length) {
      const previous = aligned.at(-1);
      const score = dot(u, previous.u) + dot(v, previous.v);
      if (score < 0) {
        u = multiply(u, -1);
        v = multiply(v, -1);
        flipped = true;
      }
    }
    aligned.push({ u, v, w: raw.w.slice() });
    flips.push(flipped);
  }
  return { aligned, flips };
}

function ring(frameValue, outline) {
  return outline.map(([x, y]) => add(
    multiply(frameValue.u, x),
    multiply(frameValue.v, y),
  ));
}

function ringSetDeviation(first, second) {
  return Math.max(...first.map((point) => Math.min(
    ...second.map((candidate) => length(subtract(point, candidate))),
  )));
}

const p3 = ([x, y, z]) => [x, z, y];

function rendererWallDiagnostic(tool, port, frames, reverseWinding = false) {
  const outline = engine.twoWayApertureOutline(port, 64);
  const ringCount = tool.sections.length + 1;
  const ringSize = outline.length;
  const centers = [port.center.slice()];
  for (let index = 0; index < tool.sections.length - 1; index += 1) {
    centers.push(multiply(add(
      tool.sections[index].b,
      tool.sections[index + 1].a,
    ), 0.5));
  }
  centers.push(tool.sections.at(-1).b.slice());
  assert.equal(centers.length, ringCount);
  const vertices = [];
  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const basis = frames[Math.min(ringIndex, frames.length - 1)];
    for (const [x, y] of outline) {
      vertices.push(p3(add(
        centers[ringIndex],
        add(multiply(basis.u, x), multiply(basis.v, y)),
      )));
    }
  }
  const triangles = [];
  for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex += 1) {
    for (let outlineIndex = 0; outlineIndex < ringSize;
      outlineIndex += 1) {
      const next = (outlineIndex + 1) % ringSize;
      const a = ringIndex * ringSize + outlineIndex;
      const b = ringIndex * ringSize + next;
      const c = (ringIndex + 1) * ringSize + outlineIndex;
      const d = (ringIndex + 1) * ringSize + next;
      triangles.push(
        reverseWinding ? [a, b, c] : [a, c, b],
        reverseWinding ? [b, d, c] : [b, c, d],
      );
    }
  }
  const ringCenters = Array.from({ length: ringCount }, (_, ringIndex) => {
    const values = vertices.slice(
      ringIndex * ringSize,
      (ringIndex + 1) * ringSize,
    );
    return multiply(
      values.reduce((sum, value) => add(sum, value), [0, 0, 0]),
      1 / values.length,
    );
  });
  let inward = 0;
  let outward = 0;
  let tangent = 0;
  let minimumRadialDot = Infinity;
  let maximumRadialDot = -Infinity;
  for (const triangle of triangles) {
    const [a, b, c] = triangle.map((index) => vertices[index]);
    const normal = cross(subtract(b, a), subtract(c, a));
    const centroid = multiply(add(add(a, b), c), 1 / 3);
    const centerline = multiply(
      triangle.map((index) => ringCenters[Math.floor(index / ringSize)])
        .reduce((sum, value) => add(sum, value), [0, 0, 0]),
      1 / 3,
    );
    const radial = subtract(centroid, centerline);
    const radialDot = dot(normal, radial);
    minimumRadialDot = Math.min(minimumRadialDot, radialDot);
    maximumRadialDot = Math.max(maximumRadialDot, radialDot);
    const scale = length(normal) * length(radial);
    const normalized = scale > 1e-20 ? radialDot / scale : 0;
    if (normalized > 1e-8) outward += 1;
    else if (normalized < -1e-8) inward += 1;
    else tangent += 1;
  }
  const edgeCounts = new Map();
  for (const triangle of triangles) {
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      const first = triangle[edgeIndex];
      const second = triangle[(edgeIndex + 1) % 3];
      const key = first < second
        ? `${first}:${second}`
        : `${second}:${first}`;
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    }
  }
  const boundaryEdges = [...edgeCounts.entries()].filter(
    ([, count]) => count === 1,
  ).map(([key]) => key.split(":").map(Number));
  const boundaryAdjacency = new Map();
  for (const [first, second] of boundaryEdges) {
    if (!boundaryAdjacency.has(first)) boundaryAdjacency.set(first, []);
    if (!boundaryAdjacency.has(second)) boundaryAdjacency.set(second, []);
    boundaryAdjacency.get(first).push(second);
    boundaryAdjacency.get(second).push(first);
  }
  const remaining = new Set(boundaryAdjacency.keys());
  let boundaryLoopCount = 0;
  while (remaining.size) {
    boundaryLoopCount += 1;
    const stack = [remaining.values().next().value];
    while (stack.length) {
      const vertex = stack.pop();
      if (!remaining.delete(vertex)) continue;
      stack.push(...(boundaryAdjacency.get(vertex) || []));
    }
  }
  return {
    triangleCount: triangles.length,
    boundaryEdgeCount: boundaryEdges.length,
    boundaryVertexCount: boundaryAdjacency.size,
    boundaryLoopCount,
    boundaryDegreeTwo: [...boundaryAdjacency.values()].every(
      (neighbours) => neighbours.length === 2,
    ),
    nonmanifoldEdgeCount: [...edgeCounts.values()].filter(
      (count) => count > 2,
    ).length,
    inward,
    outward,
    tangent,
    minimumRadialDot,
    maximumRadialDot,
  };
}

function apertureSdf2D(x, y, shape, sa, sb) {
  if (shape === "round") return Math.hypot(x, y) - sb;
  if (shape === "oval") {
    return (
      Math.hypot(
        x / Math.max(sa, 1e-6),
        y / Math.max(sb, 1e-6),
      ) - 1
    ) * Math.min(sa, sb);
  }
  const core = Math.max(0, sa - sb);
  const dx = Math.max(Math.abs(x) - core, 0);
  return Math.hypot(dx, y) - sb;
}

function finiteSectionSdf(point, section) {
  const axis = subtract(section.b, section.a);
  const span = length(axis) || 1e-9;
  const normal = multiply(axis, 1 / span);
  const delta = subtract(point, section.a);
  const axial = dot(delta, normal);
  const radial = subtract(delta, multiply(normal, axial));
  const aperture = apertureSdf2D(
    dot(radial, section.u),
    dot(radial, section.v),
    section.shape,
    section.sa,
    section.sb,
  );
  return Math.max(aperture, -axial, axial - span);
}

function cutterUnionSdf(point, tool) {
  return Math.min(
    ...tool.sections.map((section) => finiteSectionSdf(point, section)),
  );
}

function shaderInsideExpandedSection(point, section, edge = 0.0002) {
  const axis = subtract(section.b, section.a);
  const span = length(axis) || 1e-9;
  const normal = multiply(axis, 1 / span);
  const delta = subtract(point, section.a);
  const axial = dot(delta, normal);
  if (axial < 0 || axial > span) return false;
  const x = dot(delta, section.u);
  const y = dot(delta, section.v);
  if (section.shape === "round") {
    return x * x + y * y <= (section.sb + edge) ** 2;
  }
  if (section.shape === "oval") {
    return (x / (section.sa + edge)) ** 2
      + (y / (section.sb + edge)) ** 2 <= 1;
  }
  const core = Number.isFinite(section.core)
    ? section.core
    : Math.max(0, section.sa - section.sb);
  const dx = Math.max(Math.abs(x) - core, 0);
  return dx * dx + y * y <= (section.sb + edge) ** 2;
}

function actualPreviewContainment(tool, port, sweptTapPassageVisual) {
  const group = sweptTapPassageVisual(
    tool,
    port,
    0.0002,
    new THREE.MeshBasicMaterial(),
    "tap-passage-wall",
  );
  assert.equal(group.children.length, 1);
  const wall = group.children[0];
  const geometry = wall.geometry;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const materials = Array.isArray(wall.material)
    ? wall.material
    : [wall.material];
  const ownerSections = materials.map(
    (material) => material.userData.canonicalUnionOwnerGeometry,
  );
  assert.ok(index, "canonical union boundary must be indexed");
  assert.equal(
    group.userData.canonicalUnionSectionCount,
    tool.sections.length,
  );
  assert.equal(
    group.userData.canonicalUnionOwnerCount,
    ownerSections.length,
  );
  assert.ok(
    ownerSections.length > 0
      && ownerSections.length <= tool.sections.length,
  );
  assert.equal(geometry.groups.length, ownerSections.length);
  assert.equal(materials.length, ownerSections.length);
  assert.equal(
    materials.reduce(
      (sum, material) => (
        sum + material.userData.canonicalUnionOwnerSourceSections
      ),
      0,
    ),
    tool.sections.length,
  );
  assert.equal(group.userData.canonicalUnionBoundary, true);
  assert.equal(group.userData.frameCorrespondenceRequired, false);
  assert.equal(group.userData.globalOpenBoundaryCount, 2);
  assert.equal(group.userData.physicalPassageBoundary, true);
  assert.equal(wall.userData.canonicalUnionBoundary, true);
  assert.equal(wall.userData.physicalPassageBoundary, true);
  const modelPoint = (vertex) => {
    /* P3 is its own inverse: display (x,z,y) returns to model (x,y,z). */
    return [
      position.getX(vertex),
      position.getZ(vertex),
      position.getY(vertex),
    ];
  };
  let sampleCount = 0;
  let shaderClippedSampleCount = 0;
  let visibleSampleCount = 0;
  let visibleOutsideCount = 0;
  let maximumVisibleOutside = -Infinity;
  let minimumVisibleDistance = Infinity;
  let maximumOwnerBoundaryError = 0;
  let maximumVisibleBoundaryError = 0;
  const ownerReports = [];
  for (let owner = 0; owner < ownerSections.length; owner += 1) {
    const section = ownerSections[owner];
    const geometryGroup = geometry.groups[owner];
    const material = materials[owner];
    assert.equal(geometryGroup.materialIndex, owner);
    assert.equal(material.userData.canonicalUnionOwnerSection, owner);
    assert.equal(
      material.userData.canonicalUnionClipSectionCount,
      ownerSections.length - 1,
    );
    assert.equal(
      material.userData.tapBooleanClip?.count,
      ownerSections.length - 1,
    );
    let ownerSamples = 0;
    let ownerClipped = 0;
    let ownerVisible = 0;
    let ownerMaximumOutside = -Infinity;
    for (
      let offset = geometryGroup.start;
      offset < geometryGroup.start + geometryGroup.count;
      offset += 3
    ) {
      const triangle = [
        modelPoint(index.getX(offset)),
        modelPoint(index.getX(offset + 1)),
        modelPoint(index.getX(offset + 2)),
      ];
      const samples = [
        ...triangle,
        multiply(add(add(triangle[0], triangle[1]), triangle[2]), 1 / 3),
        multiply(add(triangle[0], triangle[1]), 0.5),
        multiply(add(triangle[1], triangle[2]), 0.5),
        multiply(add(triangle[2], triangle[0]), 0.5),
      ];
      for (const point of samples) {
        const ownerDistance = finiteSectionSdf(point, section);
        maximumOwnerBoundaryError = Math.max(
          maximumOwnerBoundaryError,
          Math.abs(ownerDistance),
        );
        const clipped = ownerSections.some((candidate, candidateIndex) =>
          candidateIndex !== owner
            && shaderInsideExpandedSection(point, candidate));
        sampleCount += 1;
        ownerSamples += 1;
        if (clipped) {
          shaderClippedSampleCount += 1;
          ownerClipped += 1;
          continue;
        }
        const distance = cutterUnionSdf(point, tool);
        visibleSampleCount += 1;
        ownerVisible += 1;
        maximumVisibleOutside = Math.max(maximumVisibleOutside, distance);
        minimumVisibleDistance = Math.min(minimumVisibleDistance, distance);
        maximumVisibleBoundaryError = Math.max(
          maximumVisibleBoundaryError,
          Math.abs(distance),
        );
        ownerMaximumOutside = Math.max(ownerMaximumOutside, distance);
        if (distance > 1e-6) visibleOutsideCount += 1;
      }
    }
    ownerReports.push({
      owner,
      triangleCount: geometryGroup.count / 3,
      sampleCount: ownerSamples,
      shaderClippedSampleCount: ownerClipped,
      visibleSampleCount: ownerVisible,
      maximumVisibleOutside: ownerMaximumOutside,
    });
  }
  return {
    sectionCount: tool.sections.length,
    geometryGroupCount: geometry.groups.length,
    materialCount: materials.length,
    coalescedSectionCount:
      group.userData.canonicalUnionCoalescedSectionCount,
    vertexCount: position.count,
    triangleCount: index.count / 3,
    sampleCount,
    shaderClippedSampleCount,
    visibleSampleCount,
    visibleOutsideCount,
    maximumVisibleOutside,
    minimumVisibleDistance,
    maximumOwnerBoundaryError,
    maximumVisibleBoundaryError,
    ownerReports,
  };
}

function diagnosticRecord(plan, field) {
  const records = [];
  for (const driver of plan.drivers) {
    for (const port of driver.ports) {
      const tool = field.tapTools[driver.index][port.index];
      assert.equal(tool.kind, "swept-aperture");
      const rawFrames = tool.sections.map(frame);
      const { aligned: alignedFrames, flips } = rendererAlignedFrames(
        rawFrames,
      );
      const outline = engine.twoWayApertureOutline(port, 64);
      const ringLocusDeviation = Math.max(...rawFrames.map(
        (raw, index) => ringSetDeviation(
          ring(raw, outline),
          ring(alignedFrames[index], outline),
        ),
      ));
      const currentWinding = rendererWallDiagnostic(
        tool,
        port,
        alignedFrames,
        false,
      );
      const reversedWinding = rendererWallDiagnostic(
        tool,
        port,
        alignedFrames,
        true,
      );
      const rawJoints = rawFrames.slice(1).map((next, index) => {
        const previous = rawFrames[index];
        return {
          joint: index,
          phaseDeg: degrees(relativePhase(previous, next)),
          uDot: dot(previous.u, next.u),
          vDot: dot(previous.v, next.v),
          axisDot: dot(previous.w, next.w),
          handedness: dot(cross(next.w, next.u), next.v),
        };
      });
      const alignedJoints = alignedFrames.slice(1).map((next, index) => {
        const previous = alignedFrames[index];
        return {
          joint: index,
          phaseDeg: degrees(relativePhase(previous, next)),
          uDot: dot(previous.u, next.u),
          vDot: dot(previous.v, next.v),
          axisDot: dot(previous.w, next.w),
          handedness: dot(cross(next.w, next.u), next.v),
        };
      });
      records.push({
        driverIndex: driver.index,
        tapIndex: port.index,
        placement: driver.panelPlacement.kind,
        sectionCount: tool.sections.length,
        rawJoints,
        alignedJoints,
        flips,
        ringLocusDeviation,
        currentWinding,
        reversedWinding,
      });
    }
  }
  return records;
}

test("six-W5 prism-union renderer does not depend on cross-joint ring phase", () => {
  const plan = engine.twoWayPlan(sixW5ExtendedState());
  const field = engine.twoWaySolidField(plan, false);
  const records = diagnosticRecord(plan, field);
  const rawJoints = records.flatMap((record) => record.rawJoints.map(
    (joint) => ({
      ...joint,
      driverIndex: record.driverIndex,
      tapIndex: record.tapIndex,
      placement: record.placement,
    }),
  ));
  const alignedJoints = records.flatMap(
    (record) => record.alignedJoints.map((joint) => ({
      ...joint,
      driverIndex: record.driverIndex,
      tapIndex: record.tapIndex,
      placement: record.placement,
    })),
  );
  const worstRawPhase = rawJoints.reduce((worst, item) => (
    Math.abs(item.phaseDeg) > Math.abs(worst.phaseDeg) ? item : worst
  ));
  const worstAlignedPhase = alignedJoints.reduce((worst, item) => (
    Math.abs(item.phaseDeg) > Math.abs(worst.phaseDeg) ? item : worst
  ));
  const rawHalfTurns = rawJoints.filter(
    (joint) => Math.abs(joint.phaseDeg) > 90,
  );
  const alignedHalfTurns = alignedJoints.filter(
    (joint) => Math.abs(joint.phaseDeg) > 90,
  );
  const flipCount = records.reduce(
    (sum, record) => sum + record.flips.filter(Boolean).length,
    0,
  );
  const maximumRingLocusDeviation = Math.max(
    ...records.map((record) => record.ringLocusDeviation),
  );
  assert.equal(records.length, 12);
  assert.ok(records.every((record) => record.sectionCount >= 3));
  assert.ok(rawJoints.every((joint) => (
    Math.abs(joint.handedness - 1) < 1e-9
  )));
  /* Extended manifolds remain a multi-owner finite-prism union.  Whether a
     particular route happens to contain a half-turn is not a renderer
     precondition: every section owns its canonical frame independently. */
  assert.ok(rawJoints.length > 0);
  assert.equal(alignedHalfTurns.length, 0);
  assert.ok(Math.abs(worstAlignedPhase.phaseDeg) < 20.2);
  assert.ok(maximumRingLocusDeviation < 1e-12);
  assert.ok(records.every((record) => (
    record.flips[0] === false && record.flips.at(-1) === false
  )));
  assert.match(
    shell,
    /canonical cutter is the UNION of overlapping finite aperture prisms/,
    "the renderer must declare the exact finite-prism union authority",
  );
  assert.match(
    shell,
    /group\.userData\.frameCorrespondenceRequired=false/,
    "independent prism owners must not claim ring correspondence",
  );
  assert.match(
    shell,
    /canonicalUnionMethod='collinear-equivalent section surfaces GPU-trimmed by other exact sections'/,
    "the renderer must expose its exact owner-fragment clipping method",
  );
  assert.match(
    shell,
    /idx\.push\(a,b,c,b,d,c\)/,
    "the P3 handedness swap must retain inward-facing prism side winding",
  );
  console.log(JSON.stringify({
    fixture: "six-W5 angular",
    pathCount: records.length,
    jointCount: rawJoints.length,
    rawHalfTurnCount: rawHalfTurns.length,
    alignedHalfTurnCount: alignedHalfTurns.length,
    framePhaseFlipCount: flipCount,
    worstRawPhase,
    worstAlignedPhase,
    maximumRingLocusDeviation,
    rendererAuthority: "independent exact finite-prism union",
    frameCorrespondenceRequired: false,
  }, null, 2));
});

test("displayed physical lumen wall stays on the canonical cutter-union boundary", () => {
  const plan = engine.twoWayPlan(sixW5ExtendedState());
  const field = engine.twoWaySolidField(plan, false);
  const rendererContext = {
    THREE,
    MEH2: engine,
    add3: (a, b, scale = 1) => a.map(
      (value, index) => value + b[index] * scale,
    ),
    P3: (point) => new THREE.Vector3(
      point[0],
      point[2],
      point[1],
    ),
  };
  rendererContext.applyTapBooleanClip = vm.runInNewContext(
    `(${namedFunction(shell, "applyTapBooleanClip")})`,
    rendererContext,
  );
  const sweptTapPassageVisual = vm.runInNewContext(
    `(${namedFunction(shell, "sweptTapPassageVisual")})`,
    rendererContext,
  );
  const reports = [];
  for (const driver of plan.drivers) {
    for (const port of driver.ports) {
      const tool = field.tapTools[driver.index][port.index];
      reports.push({
        driverIndex: driver.index,
        tapIndex: port.index,
        placement: driver.panelPlacement.kind,
        ...actualPreviewContainment(
          tool,
          port,
          sweptTapPassageVisual,
        ),
      });
    }
  }
  const worstOutside = reports.reduce((worst, report) => (
    report.maximumVisibleOutside > worst.maximumVisibleOutside
      ? report
      : worst
  ));
  const sampleCount = reports.reduce(
    (sum, report) => sum + report.sampleCount,
    0,
  );
  const shaderClippedSampleCount = reports.reduce(
    (sum, report) => sum + report.shaderClippedSampleCount,
    0,
  );
  const visibleSampleCount = reports.reduce(
    (sum, report) => sum + report.visibleSampleCount,
    0,
  );
  const visibleOutsideCount = reports.reduce(
    (sum, report) => sum + report.visibleOutsideCount,
    0,
  );
  const maximumOwnerBoundaryError = Math.max(
    ...reports.map((report) => report.maximumOwnerBoundaryError),
  );
  const maximumVisibleBoundaryError = Math.max(
    ...reports.map((report) => report.maximumVisibleBoundaryError),
  );
  const minimumVisibleDistance = Math.min(
    ...reports.map((report) => report.minimumVisibleDistance),
  );
  const summary = {
    outsideToleranceMm: 0.001,
    polygonSagToleranceMm: 0.05,
    pathCount: reports.length,
    sampleCount,
    shaderClippedSampleCount,
    visibleSampleCount,
    visibleOutsideCount,
    maximumVisibleOutsideMm:
      worstOutside.maximumVisibleOutside * 1000,
    maximumVisibleOutsideWitness: {
      driverIndex: worstOutside.driverIndex,
      tapIndex: worstOutside.tapIndex,
      placement: worstOutside.placement,
    },
    minimumVisibleBoundaryDistanceMm: minimumVisibleDistance * 1000,
    maximumOwnerBoundaryErrorMm: maximumOwnerBoundaryError * 1000,
    maximumVisibleBoundaryErrorMm: maximumVisibleBoundaryError * 1000,
    perPath: reports.map((report) => ({
      driverIndex: report.driverIndex,
      tapIndex: report.tapIndex,
      placement: report.placement,
      sectionCount: report.sectionCount,
      geometryGroupCount: report.geometryGroupCount,
      materialCount: report.materialCount,
      coalescedSectionCount: report.coalescedSectionCount,
      vertexCount: report.vertexCount,
      triangleCount: report.triangleCount,
      shaderClippedSampleCount: report.shaderClippedSampleCount,
      visibleSampleCount: report.visibleSampleCount,
      visibleOutsideCount: report.visibleOutsideCount,
      maximumVisibleOutsideMm:
        report.maximumVisibleOutside * 1000,
      minimumVisibleBoundaryDistanceMm:
        report.minimumVisibleDistance * 1000,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));

  assert.equal(reports.length, 12);
  assert.ok(reports.every((report) => (
    report.sectionCount >= 3
      && report.geometryGroupCount > 0
      && report.geometryGroupCount <= report.sectionCount
      && report.materialCount === report.geometryGroupCount
      && report.coalescedSectionCount
        === report.sectionCount - report.geometryGroupCount
      && report.vertexCount
        === 128 * report.geometryGroupCount
          + 2 * (report.geometryGroupCount - 1)
      && report.triangleCount
        === 128 * report.geometryGroupCount
          + 128 * (report.geometryGroupCount - 1)
  )));
  assert.ok(
    shaderClippedSampleCount > 0,
    "owner surfaces never exercise the inter-prism fragment clip",
  );
  assert.ok(
    visibleSampleCount > 0 && visibleSampleCount < sampleCount,
    "the renderer does not retain a nonempty, clipped union boundary",
  );
  assert.ok(reports.every((report) => (
    report.ownerReports.every((owner) => owner.visibleSampleCount > 0)
  )));
  assert.equal(
    visibleOutsideCount,
    0,
    "a visible owner fragment leaves the canonical cutter union",
  );
  assert.ok(
    worstOutside.maximumVisibleOutside <= 1e-6,
    `visible owner fragment is `
      + `${(worstOutside.maximumVisibleOutside * 1000).toFixed(6)} mm `
      + "outside the canonical union",
  );
  /* The 64-point racetrack/ellipse outline is inscribed, so triangle
     centroids may sit a few microns inside the smooth analytic SDF. It may
     never sit outside, and its bounded chord sag stays below 0.05 mm. */
  assert.ok(
    minimumVisibleDistance >= -0.00005,
    `visible polygon boundary lies `
      + `${(-minimumVisibleDistance * 1000).toFixed(6)} mm inside the `
      + "smooth aperture",
  );
  assert.ok(
    maximumOwnerBoundaryError <= 0.00005
      && maximumVisibleBoundaryError <= 0.00005,
    "the prism-owner mesh exceeds the bounded 64-point outline sag",
  );
});
