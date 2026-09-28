#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { engine, loadCases } from "./case-loader.mjs";

const DEFAULT_CASE = "R06";
const DEFAULT_QUALITY = "test";
const DEFAULT_TINY_TRIANGLES = 64;

function parseArgs(argv) {
  const options = {
    caseId: DEFAULT_CASE,
    quality: DEFAULT_QUALITY,
    tinyTriangles: DEFAULT_TINY_TRIANGLES,
    deep: false,
    pretty: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--case") options.caseId = argv[++index];
    else if (arg === "--quality") options.quality = argv[++index];
    else if (arg === "--tiny-max") options.tinyTriangles = Number(argv[++index]);
    else if (arg === "--deep") options.deep = true;
    else if (arg === "--pretty") options.pretty = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!["test", "display", "export"].includes(options.quality)) {
    throw new Error(`unsupported quality: ${options.quality}`);
  }
  if (!Number.isInteger(options.tinyTriangles) || options.tinyTriangles < 0) {
    throw new Error("--tiny-max must be a non-negative integer");
  }
  return options;
}

function printHelp() {
  process.stdout.write(`Usage: node node/exact-mesh-diagnostics.mjs [options]

  --case ID        Canonical valid case to load (default: ${DEFAULT_CASE})
  --quality LEVEL  test, display, or export (default: ${DEFAULT_QUALITY})
  --tiny-max N     Index components with N triangles or fewer (default: ${DEFAULT_TINY_TRIANGLES})
  --deep           Locate the first exact self-intersection and report its part
  --pretty         Pretty-print JSON; compact JSON is the default
  --help           Show this help
`);
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(vector, scalar) {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function unit(vector) {
  const magnitude = Math.hypot(...vector);
  return magnitude > 1e-15 ? scale(vector, 1 / magnitude) : null;
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(fraction * (sorted.length - 1)))
  );
  return sorted[index];
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mmVector(vector) {
  return vector.map((value) => round(value * 1000, 3));
}

/**
 * Read the lattice facts emitted by the exact two-way mesher.  This is a
 * capability gate, not an estimate from triangle density: if the worker stops
 * exposing its grid, QA refuses to claim that the preview was adequately
 * sampled.
 */
export function meshSamplingDiagnostics(mesh, { maxStep = 0.006 } = {}) {
  const grid = mesh?.grid;
  const declaredStep = grid?.step;
  const dimensions = [grid?.nx, grid?.ny, grid?.nz];
  const hasGrid = Number.isFinite(declaredStep) &&
    dimensions.every((value) => Number.isInteger(value) && value >= 3);
  return {
    hasGrid,
    dimensions,
    step: declaredStep,
    stepMm: Number.isFinite(declaredStep) ? round(declaredStep * 1000, 6) : null,
    maxStep,
    maxStepMm: round(maxStep * 1000, 6),
    excessive: !hasGrid || declaredStep > maxStep + 1e-12,
    pass: hasGrid && declaredStep <= maxStep + 1e-12
  };
}

/**
 * Diagnose faceting/striping on a region that is known to be planar.
 * Callers provide the analytic plane normal and a centroid predicate so horn
 * creases, tap lips, and intentionally curved surfaces are excluded.  Both
 * absolute plane error and edge-adjacent normal jumps are reported.
 */
export function planarNormalDiagnostics(mesh, {
  expectedNormal,
  selectCentroid = () => true,
  maxPlaneAngleDeg = 2,
  stripeJumpDeg = 5
} = {}) {
  const expected = unit(expectedNormal || []);
  if (!expected) {
    return {
      pass: false,
      error: "expectedNormal must be a finite non-zero vector",
      triangles: 0,
      adjacentPairs: 0
    };
  }

  const selected = new Map();
  const angles = [];
  const triangle = [0, 0, 0];
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0, 0];
  for (let index = 0; index < engine.meshTriangleCount(mesh); index += 1) {
    engine.meshTriangle(mesh, index, triangle);
    engine.meshVertex(mesh, triangle[0], a);
    engine.meshVertex(mesh, triangle[1], b);
    engine.meshVertex(mesh, triangle[2], c);
    const centroid = scale(add(add(a, b), c), 1 / 3);
    if (!selectCentroid(centroid, triangle, index)) continue;
    const normal = unit(cross(subtract(b, a), subtract(c, a)));
    if (!normal) continue;
    const cosine = Math.max(-1, Math.min(1, Math.abs(dot(normal, expected))));
    const angleDeg = Math.acos(cosine) * 180 / Math.PI;
    selected.set(index, { triangle: triangle.slice(), normal });
    angles.push(angleDeg);
  }

  const edgeOwners = new Map();
  const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  for (const [index, item] of selected) {
    for (const [a, b] of [
      [item.triangle[0], item.triangle[1]],
      [item.triangle[1], item.triangle[2]],
      [item.triangle[2], item.triangle[0]]
    ]) {
      const key = edgeKey(a, b);
      if (!edgeOwners.has(key)) edgeOwners.set(key, []);
      edgeOwners.get(key).push(index);
    }
  }

  const jumps = [];
  for (const owners of edgeOwners.values()) {
    if (owners.length !== 2) continue;
    const first = selected.get(owners[0]).normal;
    const second = selected.get(owners[1]).normal;
    const cosine = Math.max(-1, Math.min(1, Math.abs(dot(first, second))));
    jumps.push(Math.acos(cosine) * 180 / Math.PI);
  }
  angles.sort((a, b) => a - b);
  jumps.sort((a, b) => a - b);
  const p95PlaneAngleDeg = percentile(angles, 0.95);
  const p95NeighborJumpDeg = percentile(jumps, 0.95);
  const stripePairs = jumps.filter((value) => value > stripeJumpDeg).length;
  const stripeRate = jumps.length ? stripePairs / jumps.length : 0;
  const enoughSamples = angles.length >= 24 && jumps.length >= 24;
  const pass = enoughSamples &&
    p95PlaneAngleDeg <= maxPlaneAngleDeg + 1e-12 &&
    stripeRate <= 0.02;
  return {
    pass,
    triangles: angles.length,
    adjacentPairs: jumps.length,
    maxPlaneAngleDeg,
    stripeJumpDeg,
    p50PlaneAngleDeg: round(percentile(angles, 0.5), 6),
    p95PlaneAngleDeg: round(p95PlaneAngleDeg, 6),
    maxPlaneAngleObservedDeg: round(percentile(angles, 1), 6),
    p95NeighborJumpDeg: round(p95NeighborJumpDeg, 6),
    stripePairs,
    stripeRate: round(stripeRate, 6),
    enoughSamples
  };
}

export function boundingBox(mesh) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const point = [0, 0, 0];
  for (let index = 0; index < engine.meshVertexCount(mesh); index += 1) {
    engine.meshVertex(mesh, index, point);
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }
  return { min, max, size: subtract(max, min) };
}

function surfaceCentroid(mesh) {
  let weighted = [0, 0, 0];
  let totalArea = 0;
  const triangle = [0, 0, 0];
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0, 0];
  for (let index = 0; index < engine.meshTriangleCount(mesh); index += 1) {
    engine.meshTriangle(mesh, index, triangle);
    engine.meshVertex(mesh, triangle[0], a);
    engine.meshVertex(mesh, triangle[1], b);
    engine.meshVertex(mesh, triangle[2], c);
    const area = Math.hypot(...cross(subtract(b, a), subtract(c, a))) / 2;
    weighted = add(weighted, scale(add(add(a, b), c), area / 3));
    totalArea += area;
  }
  return totalArea > 1e-20 ? scale(weighted, 1 / totalArea) : [0, 0, 0];
}

export function volumeProperties(mesh) {
  let signedVolume = 0;
  let weightedCentroid = [0, 0, 0];
  const triangle = [0, 0, 0];
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0, 0];
  for (let index = 0; index < engine.meshTriangleCount(mesh); index += 1) {
    engine.meshTriangle(mesh, index, triangle);
    engine.meshVertex(mesh, triangle[0], a);
    engine.meshVertex(mesh, triangle[1], b);
    engine.meshVertex(mesh, triangle[2], c);
    const tetraVolume = dot(a, cross(b, c)) / 6;
    signedVolume += tetraVolume;
    weightedCentroid = add(
      weightedCentroid,
      scale(add(add(a, b), c), tetraVolume / 4)
    );
  }
  const centroid = Math.abs(signedVolume) > 1e-18
    ? scale(weightedCentroid, 1 / signedVolume)
    : surfaceCentroid(mesh);
  return {
    signedVolume,
    volume: Math.abs(signedVolume),
    centroid
  };
}

export function mergeMeshes(meshes) {
  const vertexTotal = meshes.reduce(
    (sum, mesh) => sum + engine.meshVertexCount(mesh),
    0
  );
  const triangleTotal = meshes.reduce(
    (sum, mesh) => sum + engine.meshTriangleCount(mesh),
    0
  );
  const positions = new Float64Array(vertexTotal * 3);
  const indices = new Uint32Array(triangleTotal * 3);
  const point = [0, 0, 0];
  const triangle = [0, 0, 0];
  let vertexOffset = 0;
  let triangleOffset = 0;
  for (const mesh of meshes) {
    const vertices = engine.meshVertexCount(mesh);
    const triangles = engine.meshTriangleCount(mesh);
    for (let index = 0; index < vertices; index += 1) {
      engine.meshVertex(mesh, index, point);
      const target = (vertexOffset + index) * 3;
      positions[target] = point[0];
      positions[target + 1] = point[1];
      positions[target + 2] = point[2];
    }
    for (let index = 0; index < triangles; index += 1) {
      engine.meshTriangle(mesh, index, triangle);
      const target = (triangleOffset + index) * 3;
      indices[target] = triangle[0] + vertexOffset;
      indices[target + 1] = triangle[1] + vertexOffset;
      indices[target + 2] = triangle[2] + vertexOffset;
    }
    vertexOffset += vertices;
    triangleOffset += triangles;
  }
  return engine.packedMesh(positions, indices);
}

function pointBoxDistance(point, box) {
  let squared = 0;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = point[axis] < box.min[axis]
      ? box.min[axis] - point[axis]
      : point[axis] > box.max[axis]
        ? point[axis] - box.max[axis]
        : 0;
    squared += delta * delta;
  }
  return Math.sqrt(squared);
}

function driverTargets(plan) {
  return plan.drivers.flatMap((driver, index) => {
    const driverNumber = index + 1;
    const module = `driver-module-${String(driverNumber).padStart(2, "0")}`;
    const midpoint = scale(add(driver.surface, driver.driverFace), 0.5);
    return [
      { driver: driverNumber, module, anchor: "surface", point: driver.surface },
      { driver: driverNumber, module, anchor: "driverFace", point: driver.driverFace },
      { driver: driverNumber, module, anchor: "moduleCenter", point: midpoint }
    ];
  });
}

function nearestDriver(box, centroid, targets) {
  let best = null;
  for (const target of targets) {
    const boxDistance = pointBoxDistance(target.point, box);
    const centroidDistance = distance(target.point, centroid);
    if (!best || boxDistance < best.boxDistance - 1e-12 ||
      (Math.abs(boxDistance - best.boxDistance) <= 1e-12 && centroidDistance < best.centroidDistance)) {
      best = { ...target, boxDistance, centroidDistance };
    }
  }
  return best && {
    driver: best.driver,
    module: best.module,
    anchor: best.anchor,
    distanceMm: round(best.boxDistance * 1000, 3),
    centroidDistanceMm: round(best.centroidDistance * 1000, 3)
  };
}

export function componentMetrics(mesh, targets = []) {
  const box = boundingBox(mesh);
  const properties = volumeProperties(mesh);
  return {
    triangles: engine.meshTriangleCount(mesh),
    volumeMm3: round(properties.volume * 1e9, 3),
    centroidMm: mmVector(properties.centroid),
    bboxMm: {
      min: mmVector(box.min),
      max: mmVector(box.max),
      size: mmVector(box.size)
    },
    nearest: nearestDriver(box, properties.centroid, targets)
  };
}

function namedPartName(partIndex, namedPartCount) {
  return partIndex === 0
    ? namedPartCount === 1 ? "integrated-horn-assembly" : "horn"
    : `driver-module-${String(partIndex).padStart(2, "0")}`;
}

export function diagnoseNamedParts(geometry, tinyTriangles) {
  const diagnostics = geometry.partDiagnostics || geometry.mesh?.partDiagnostics;
  if (!Array.isArray(diagnostics) || !diagnostics.length) {
    throw new Error("twoWayGeometry did not expose named-part diagnostics");
  }
  if (!Array.isArray(geometry.parts)) {
    throw new Error("twoWayGeometry did not expose component meshes");
  }

  const targets = driverTargets(geometry.plan);
  const parts = [];
  let cursor = 0;
  for (const diagnostic of diagnostics) {
    const sourceMeshes = geometry.parts.slice(cursor, cursor + diagnostic.componentCount);
    cursor += diagnostic.componentCount;
    if (sourceMeshes.length !== diagnostic.componentCount) {
      throw new Error(`named part ${diagnostic.partIndex} is missing component meshes`);
    }
    const components = engine.splitMeshComponents(mergeMeshes(sourceMeshes));
    const name = namedPartName(diagnostic.partIndex, diagnostics.length);
    const componentRows = components.map((component, index) => ({
      id: `${name}/component-${String(index + 1).padStart(2, "0")}`,
      ...componentMetrics(component, targets)
    }));
    parts.push({
      index: diagnostic.partIndex,
      name,
      declaredComponents: diagnostic.componentCount,
      components: componentRows.length,
      triangles: componentRows.reduce((sum, row) => sum + row.triangles, 0),
      fragments: componentRows
    });
  }
  if (cursor !== geometry.parts.length) {
    throw new Error(`${geometry.parts.length - cursor} component meshes were not assigned to a named part`);
  }

  const allFragments = parts.flatMap((part) =>
    part.fragments.map((fragment) => ({ part: part.name, ...fragment }))
  );
  const tinyFragments = allFragments
    .filter((fragment) => fragment.triangles <= tinyTriangles)
    .sort((a, b) => a.triangles - b.triangles || a.id.localeCompare(b.id));

  return {
    parts,
    totals: {
      namedParts: parts.length,
      components: allFragments.length,
      triangles: allFragments.reduce((sum, fragment) => sum + fragment.triangles, 0),
      volumeMm3: round(allFragments.reduce((sum, fragment) => sum + fragment.volumeMm3, 0), 3)
    },
    tinyFragments
  };
}

export function runDiagnostics(options) {
  const testCase = loadCases().find((candidate) =>
    candidate.documentName === "canonical" &&
    candidate.id === options.caseId &&
    candidate.expected?.status === "valid"
  );
  if (!testCase) throw new Error(`canonical valid case not found: ${options.caseId}`);

  const started = Date.now();
  const result = engine.solve(testCase.state);
  if (result.infeasible) {
    const failures = (result.ev.rows || [])
      .filter((row) => row.st === "fail")
      .map((row) => row.name);
    throw new Error(`solver refused ${testCase.id}: ${failures.join(", ")}`);
  }
  const geometry = engine.twoWayGeometry(result.S, options.quality);
  const report = diagnoseNamedParts(geometry, options.tinyTriangles);
  const sampling = meshSamplingDiagnostics(geometry.mesh, {
    maxStep: options.quality === "display" ? 0.006 : 0.0025
  });
  let selfIntersection = null;
  if (options.deep) {
    const result = engine.meshSelfIntersections(geometry.mesh, 1);
    const partNames = [];
    let componentCursor = 0;
    for (const diagnostic of geometry.partDiagnostics || []) {
      const name = namedPartName(diagnostic.partIndex,
        geometry.partDiagnostics.length);
      for (let index = 0; index < diagnostic.componentCount; index += 1) {
        const part = geometry.parts[componentCursor++];
        partNames.push({
          name,
          triangles: part ? engine.meshTriangleCount(part) : 0
        });
      }
    }
    const owner = (triangleIndex) => {
      let first = 0;
      for (const part of partNames) {
        const last = first + part.triangles;
        if (triangleIndex >= first && triangleIndex < last) {
          return { name: part.name, localTriangle: triangleIndex - first };
        }
        first = last;
      }
      return { name: "unassigned", localTriangle: triangleIndex };
    };
    const pair = result.firstPair;
    selfIntersection = {
      count: result.count,
      testedPairs: result.tested,
      limited: result.limited,
      pair: pair && pair.map((triangleIndex) => {
        const triangle = engine.meshTriangle(geometry.mesh, triangleIndex);
        return {
          triangleIndex,
          ...owner(triangleIndex),
          pointsMm: triangle.map((vertexIndex) =>
            mmVector(engine.meshVertex(geometry.mesh, vertexIndex)))
        };
      })
    };
  }
  return {
    schema: "meh-exact-mesh-components/v1",
    case: testCase.id,
    title: testCase.title,
    quality: options.quality,
    units: { coordinates: "mm", volume: "mm3" },
    elapsedMs: Date.now() - started,
    grid: geometry.mesh.grid && {
      nx: geometry.mesh.grid.nx,
      ny: geometry.mesh.grid.ny,
      nz: geometry.mesh.grid.nz,
      stepMm: round(geometry.mesh.grid.step * 1000, 6)
    },
    sampling,
    tinyMaxTriangles: options.tinyTriangles,
    selfIntersection,
    ...report
  };
}

function isMain() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isMain()) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const report = runDiagnostics(options);
      process.stdout.write(`${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`);
    }
  } catch (error) {
    process.stderr.write(`exact-mesh-diagnostics: ${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
