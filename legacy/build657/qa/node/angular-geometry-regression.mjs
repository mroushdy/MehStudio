#!/usr/bin/env node
import { engine, loadCases } from "./case-loader.mjs";
import { createChecks } from "./geometry-oracles.mjs";

const PANEL_TOLERANCE = 0.00025;

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function unit(vector) {
  const magnitude = Math.hypot(...vector);
  return vector.map((value) => value / magnitude);
}

function acousticPanelPlanarity(plan) {
  const stations = plan.st.pts.filter((station) =>
    station.x >= plan.throatMorphL - 1e-12
  );
  const rings = stations.map((station) => ({
    x: station.x,
    vertices: engine.panelVerts(station.a, station.b, station.n)
  }));
  if (!rings.length || rings.some((ring) => ring.vertices.length !== 4)) {
    throw new Error("Hinson angular oracle requires four rectangular panel edges");
  }

  return Array.from({ length: 4 }, (_, panelIndex) => {
    const next = (panelIndex + 1) % 4;
    const origin = [rings[0].x, ...rings[0].vertices[panelIndex]];
    const across = [rings[0].x, ...rings[0].vertices[next]];
    const axial = [rings.at(-1).x, ...rings.at(-1).vertices[panelIndex]];
    const normal = unit(cross(subtract(across, origin), subtract(axial, origin)));
    let maximum = 0;
    for (const ring of rings) {
      for (const vertexIndex of [panelIndex, next]) {
        const point = [ring.x, ...ring.vertices[vertexIndex]];
        maximum = Math.max(maximum, Math.abs(dot(subtract(point, origin), normal)));
      }
    }
    return { panelIndex, maximum, normal };
  });
}

function squareCoaxPattern(plan) {
  if (plan.drivers.length !== 1 || plan.allPorts.length !== 4) return false;
  const quadrants = new Set(plan.allPorts.map((port) =>
    `${Math.sign(port.center[1])},${Math.sign(port.center[2])}`
  ));
  return quadrants.size === 4;
}

function checkRadialPatternScope(checks) {
  const radialCases = loadCases().filter((testCase) =>
    testCase.documentName === "canonical" &&
    testCase.expected?.status === "valid" &&
    testCase.expected?.intent?.twoArch === "radial"
  );
  checks.check(radialCases.length >= 4, "radial canonical matrix is too small to guard default pattern scope");
  for (const testCase of radialCases) {
    const result = engine.solve(testCase.state);
    checks.check(!result.infeasible, `${testCase.id} radial scope fixture refused`);
    if (result.infeasible) continue;
    const plan = result.ev.plan;
    checks.check(plan.drivers.length >= 2, `${testCase.id} collapsed to a one-driver radial default`);
    checks.check(!squareCoaxPattern(plan), `${testCase.id} reused the one-driver square-coax four-tap pattern`);
    for (const [index, driver] of plan.drivers.entries()) {
      checks.check(
        driver.ports.length === result.S.npW,
        `${testCase.id} driver ${index + 1} does not own exactly the selected entries-per-woofer`
      );
      checks.check(
        driver.ports.length !== 4,
        `${testCase.id} driver ${index + 1} inherited a generic four-tap square-coax pattern`
      );
    }
  }
}

const checks = createChecks("angular-geometry");
const hinson = loadCases().find((testCase) =>
  testCase.documentName === "canonical" && testCase.id === "P01"
);
checks.check(Boolean(hinson), "canonical Hinson P01 fixture is missing");

let report = null;
if (hinson) {
  const result = engine.solve(hinson.state);
  checks.check(!result.infeasible, "canonical Hinson fixture was refused");
  checks.check(result.S.style === "angular", "Hinson fixture is not using angular geometry");
  checks.check(result.ev.plan.family === "panel", "Hinson fixture left the panel family");

  if (!result.infeasible) {
    const panels = acousticPanelPlanarity(result.ev.plan);
    for (const panel of panels) {
      checks.check(
        panel.maximum <= PANEL_TOLERANCE,
        `acoustic panel ${panel.panelIndex + 1} bows/kinks ${(panel.maximum * 1000).toFixed(3)} mm from a plane`
      );
    }

    let exactPreflight = null;
    try {
      const budget = engine.twoWayMeshPreflight(result.S, "display");
      checks.check(budget?.ok === true, "canonical Hinson exact display preflight did not admit a valid budget");
      checks.check(
        budget?.parts?.every((part) =>
          part.gridPoints <= budget.limits.maxActivePartGridPoints
        ),
        "canonical Hinson admitted a part outside the active-grid limit"
      );
      checks.check(
        budget?.totals?.estimatedPeakBytes <= budget?.limits?.maxEstimatedPeakBytes,
        "canonical Hinson admitted an exact job outside the memory envelope"
      );
      exactPreflight = {
        status: "admitted-at-preflight",
        policyVersion: budget?.policyVersion ?? null,
        quality: budget?.quality ?? "display",
        totals: budget?.totals ?? null
      };
    } catch (error) {
      const code = String(error?.code || "");
      checks.check(false,
        `four-face canonical Hinson no longer fits its exact display budget (${code || "missing code"})`);
      exactPreflight = {
        status: "refused-at-preflight",
        code,
        policyVersion: error?.details?.budget?.policyVersion ?? null,
        quality: error?.details?.budget?.quality ?? "display",
        firstReason: error?.details?.reason ?? null,
        totals: error?.details?.budget?.totals ?? null
      };
    }

    report = {
      analyticPanelLaw: {
        toleranceMm: PANEL_TOLERANCE * 1000,
        panelMaxDeviationMm: panels.map((panel) => +(panel.maximum * 1000).toFixed(3))
      },
      exactMesh: exactPreflight
    };
  }
}

checkRadialPatternScope(checks);

console.log(JSON.stringify({
  checks: checks.count,
  errors: checks.errors.length,
  warnings: checks.warnings.length,
  report
}, null, 2));
for (const warning of checks.warnings) console.warn(`WARN ${warning}`);
if (checks.errors.length) {
  for (const error of checks.errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log("ANGULAR GEOMETRY PASS — four planar faces, scoped tap patterns, and bounded exact preflight");
