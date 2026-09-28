import assert from "node:assert/strict";
import test from "node:test";

import { engine, loadCases } from "./case-loader.mjs";

const CASE_IDS = Object.freeze(["P01", "P02", "P03", "P04", "P05"]);
const TWO_PI = 2 * Math.PI;
const AXIAL_STEPS = 128;
const SECTION_RAYS = 128;
const C1_AXIAL_STEPS = 2048;
const C1_RAYS = 32;
const OUTER_AXIAL_STEPS = 24;
const OUTER_RAYS = 48;
const LENGTH_TOLERANCE = 0.5e-6;
const C0_TOLERANCE = 0.02e-6;
const C1_TOLERANCE_RAD = 0.5 * Math.PI / 180;
const THROAT_CURVATURE_TOLERANCE = 0.25;
const MIN_NORMAL_CONDITION = 1e-4;

function radiusAt(plan, x, phi) {
  const point = engine.twoWaySectionPoint(plan, x, phi);
  return Math.hypot(point[0], point[1]);
}

function rawPanelRadiusAt(plan, x, phi) {
  const dimensions = engine.dimsAt(plan.st, x);
  const point = engine.panelPoint(
    dimensions.a,
    dimensions.b,
    dimensions.n ?? plan.st.n,
    phi,
  );
  return Math.hypot(point[0], point[1]);
}

function polarArea(radii) {
  return 0.5 * (TWO_PI / radii.length) * radii.reduce(
    (total, radius) => total + radius * radius,
    0,
  );
}

function polygonArea(points) {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += point[0] * next[1] - point[1] * next[0];
  }
  return twiceArea / 2;
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1])
    - (b[1] - a[1]) * (c[0] - a[0]);
}

function properSegmentIntersection(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  const epsilon = 1e-15;
  return abC * abD < -epsilon && cdA * cdB < -epsilon;
}

function selfIntersectionCount(points) {
  let count = 0;
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (
        first === second
        || firstNext === second
        || secondNext === first
      ) {
        continue;
      }
      if (properSegmentIntersection(
        points[first],
        points[firstNext],
        points[second],
        points[secondNext],
      )) {
        count += 1;
      }
    }
  }
  return count;
}

function outerBoundaryRadius(plan, x, phi, wallThickness) {
  const cosine = Math.cos(phi);
  const sine = Math.sin(phi);
  const field = (radius) => engine.twoWaySdCross(
    plan,
    x,
    radius * cosine,
    radius * sine,
    wallThickness,
  );
  let lower = 0;
  let upper = Math.max(
    plan.throatR + wallThickness * 4,
    radiusAt(plan, Math.min(plan.throatMorphL, x), phi) + wallThickness * 4,
  );
  let upperField = field(upper);
  for (let attempt = 0; attempt < 10 && upperField <= 0; attempt += 1) {
    upper *= 2;
    upperField = field(upper);
  }
  if (!Number.isFinite(upperField) || upperField <= 0) return Number.NaN;
  for (let iteration = 0; iteration < 44; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (field(middle) <= 0) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function derivativeDiagnostics(plan) {
  const length = plan.throatMorphL;
  const h = length / 4096;
  const samplePhis = Array.from(
    { length: 16 },
    (_, index) => TWO_PI * (index + 0.173) / 16,
  );
  let maximumThroatC0 = 0;
  let maximumEndC0 = 0;
  let maximumThroatTangent = 0;
  let maximumEndTangentMismatch = 0;
  let maximumThroatCurvature = 0;
  let maximumEndCurvatureMismatch = 0;

  const curvature = (first, second) => (
    second / Math.pow(1 + first * first, 1.5)
  );

  for (const phi of samplePhis) {
    const value = (x) => radiusAt(plan, x, phi);
    const throat0 = value(0);
    const throat1 = value(h);
    const throat2 = value(2 * h);
    const throat3 = value(3 * h);
    const end0 = value(length);
    const endLeft1 = value(length - h);
    const endLeft2 = value(length - 2 * h);
    const endLeft3 = value(length - 3 * h);
    const endRight1 = value(length + h);
    const endRight2 = value(length + 2 * h);
    const endRight3 = value(length + 3 * h);

    const throatFirst = (-3 * throat0 + 4 * throat1 - throat2) / (2 * h);
    const throatSecond = (
      2 * throat0 - 5 * throat1 + 4 * throat2 - throat3
    ) / (h * h);
    const endFirstLeft = (
      3 * end0 - 4 * endLeft1 + endLeft2
    ) / (2 * h);
    const endFirstRight = (
      -3 * end0 + 4 * endRight1 - endRight2
    ) / (2 * h);
    const endSecondLeft = (
      2 * end0 - 5 * endLeft1 + 4 * endLeft2 - endLeft3
    ) / (h * h);
    const endSecondRight = (
      2 * end0 - 5 * endRight1 + 4 * endRight2 - endRight3
    ) / (h * h);

    maximumThroatC0 = Math.max(
      maximumThroatC0,
      Math.abs(throat0 - plan.throatR),
    );
    maximumEndC0 = Math.max(
      maximumEndC0,
      Math.abs(end0 - rawPanelRadiusAt(plan, length, phi)),
    );
    maximumThroatTangent = Math.max(
      maximumThroatTangent,
      Math.abs(Math.atan(throatFirst)),
    );
    maximumEndTangentMismatch = Math.max(
      maximumEndTangentMismatch,
      Math.abs(Math.atan(endFirstLeft) - Math.atan(endFirstRight)),
    );
    maximumThroatCurvature = Math.max(
      maximumThroatCurvature,
      Math.abs(curvature(throatFirst, throatSecond)),
    );
    maximumEndCurvatureMismatch = Math.max(
      maximumEndCurvatureMismatch,
      Math.abs(
        curvature(endFirstLeft, endSecondLeft)
        - curvature(endFirstRight, endSecondRight),
      ),
    );
  }

  let maximumInternalTangentJump = 0;
  const dx = length / C1_AXIAL_STEPS;
  for (let ray = 0; ray < C1_RAYS; ray += 1) {
    const phi = TWO_PI * ray / C1_RAYS;
    let previousRadius = radiusAt(plan, 0, phi);
    let previousTangent = null;
    for (let step = 1; step <= C1_AXIAL_STEPS; step += 1) {
      const nextRadius = radiusAt(plan, step * dx, phi);
      const tangent = Math.atan((nextRadius - previousRadius) / dx);
      if (previousTangent !== null) {
        maximumInternalTangentJump = Math.max(
          maximumInternalTangentJump,
          Math.abs(tangent - previousTangent),
        );
      }
      previousRadius = nextRadius;
      previousTangent = tangent;
    }
  }

  return {
    maximumThroatC0,
    maximumEndC0,
    maximumThroatTangent,
    maximumEndTangentMismatch,
    maximumInternalTangentJump,
    maximumThroatCurvature,
    maximumEndCurvatureMismatch,
  };
}

function normalDiagnostics(plan) {
  const length = plan.throatMorphL;
  const axialFractions = [0, 0.03, 0.12, 0.25, 0.5, 0.75, 0.97, 1];
  const h = length / 8192;
  const angularStep = 1e-4;
  let minimumCondition = Infinity;
  let nonFinite = 0;

  const point = (x, phi) => {
    const section = engine.twoWaySectionPoint(plan, x, phi);
    return [x, section[0], section[1]];
  };
  const subtract = (a, b) => a.map((value, index) => value - b[index]);
  const divide = (vector, scale) => vector.map((value) => value / scale);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  for (const fraction of axialFractions) {
    const x = fraction * length;
    const x0 = Math.max(0, x - h);
    const x1 = Math.min(length, x + h);
    for (let ray = 0; ray < 32; ray += 1) {
      /* Offset the rays from the intentional corners of the terminal panel. */
      const phi = TWO_PI * (ray + 0.371) / 32;
      const tangentX = divide(
        subtract(point(x1, phi), point(x0, phi)),
        x1 - x0,
      );
      const tangentPhi = divide(
        subtract(
          point(x, phi + angularStep),
          point(x, phi - angularStep),
        ),
        2 * angularStep,
      );
      const normal = cross(tangentX, tangentPhi);
      const normalMagnitude = Math.hypot(...normal);
      const denominator = Math.hypot(...tangentX) * Math.hypot(...tangentPhi);
      const condition = normalMagnitude / denominator;
      if (
        !Number.isFinite(condition)
        || !normal.every(Number.isFinite)
        || !tangentX.every(Number.isFinite)
        || !tangentPhi.every(Number.isFinite)
      ) {
        nonFinite += 1;
      } else {
        minimumCondition = Math.min(minimumCondition, condition);
      }
    }
  }
  return { minimumCondition, nonFinite };
}

function analyzeCase(testCase, failures) {
  const solved = engine.solve(testCase.state);
  const check = (condition, message) => {
    if (!condition) failures.push(`${testCase.id}: ${message}`);
  };
  check(!solved.infeasible, "canonical morph fixture was refused");
  if (solved.infeasible) return null;
  const plan = solved.ev.plan;
  check(plan.family === "panel", `expected panel family, received ${plan.family}`);
  check(solved.S.style === "angular", `expected angular style, received ${solved.S.style}`);
  check(
    Number.isFinite(plan.throatMorphL) && plan.throatMorphL > 0,
    `invalid throat morph length ${plan.throatMorphL}`,
  );

  const length = plan.throatMorphL;
  const throatArea = Math.PI * plan.throatR * plan.throatR;
  const phis = Array.from(
    { length: SECTION_RAYS },
    (_, index) => TWO_PI * index / SECTION_RAYS,
  );
  const terminalRadii = phis.map((phi) => radiusAt(plan, length, phi));
  let previousRadii = null;
  let previousEquivalentRadius = null;
  let previousAxes = null;
  let minimumArea = Infinity;
  let maximumRayBackstep = 0;
  let maximumEquivalentRadiusBackstep = 0;
  let maximumAxisBackstep = 0;
  let maximumEnvelopeOvershoot = 0;
  let maximumEnvelopeUndershoot = 0;
  let maximumOppositeRayMismatch = 0;
  let intersections = 0;

  for (let station = 0; station <= AXIAL_STEPS; station += 1) {
    const x = length * station / AXIAL_STEPS;
    const points = phis.map((phi) => engine.twoWaySectionPoint(plan, x, phi));
    const radii = points.map((point) => Math.hypot(point[0], point[1]));
    const area = polarArea(radii);
    const equivalentRadius = Math.sqrt(area / Math.PI);
    const signedPolygonArea = polygonArea(points);
    const axes = [
      radii[0],
      radii[SECTION_RAYS / 4],
      radii[SECTION_RAYS / 2],
      radii[3 * SECTION_RAYS / 4],
    ];

    check(points.every((point) => point.every(Number.isFinite)),
      `non-finite section point at ${(x * 1000).toFixed(3)} mm`);
    check(radii.every((radius) => Number.isFinite(radius) && radius > 0),
      `non-positive section radius at ${(x * 1000).toFixed(3)} mm`);
    check(Number.isFinite(area) && area > 0,
      `non-positive section area at ${(x * 1000).toFixed(3)} mm`);
    check(signedPolygonArea > 0,
      `section winding reversed at ${(x * 1000).toFixed(3)} mm`);

    minimumArea = Math.min(minimumArea, area);
    for (let ray = 0; ray < radii.length; ray += 1) {
      maximumEnvelopeOvershoot = Math.max(
        maximumEnvelopeOvershoot,
        radii[ray] - terminalRadii[ray],
      );
      maximumEnvelopeUndershoot = Math.max(
        maximumEnvelopeUndershoot,
        plan.throatR - radii[ray],
      );
      maximumOppositeRayMismatch = Math.max(
        maximumOppositeRayMismatch,
        Math.abs(radii[ray] - radii[(ray + SECTION_RAYS / 2) % SECTION_RAYS]),
      );
      if (previousRadii) {
        maximumRayBackstep = Math.max(
          maximumRayBackstep,
          previousRadii[ray] - radii[ray],
        );
      }
    }
    if (previousEquivalentRadius !== null) {
      maximumEquivalentRadiusBackstep = Math.max(
        maximumEquivalentRadiusBackstep,
        previousEquivalentRadius - equivalentRadius,
      );
    }
    if (previousAxes) {
      for (let axis = 0; axis < axes.length; axis += 1) {
        maximumAxisBackstep = Math.max(
          maximumAxisBackstep,
          previousAxes[axis] - axes[axis],
        );
      }
    }
    if (station % 8 === 0 || station === AXIAL_STEPS) {
      intersections += selfIntersectionCount(points);
    }
    previousRadii = radii;
    previousEquivalentRadius = equivalentRadius;
    previousAxes = axes;
  }

  const derivatives = derivativeDiagnostics(plan);
  const normals = normalDiagnostics(plan);

  const wallThickness = Number(plan.S.wallT);
  const outerPhis = Array.from(
    { length: OUTER_RAYS },
    (_, index) => TWO_PI * (index + 0.193) / OUTER_RAYS,
  );
  const terminalOuterRadii = outerPhis.map((phi) => (
    outerBoundaryRadius(plan, length, phi, wallThickness)
  ));
  let previousOuterRadii = null;
  let previousOuterEquivalentRadius = null;
  let minimumRadialWall = Infinity;
  let maximumOuterRayBackstep = 0;
  let maximumOuterEquivalentRadiusBackstep = 0;
  let maximumOuterEnvelopeOvershoot = 0;
  let outerIntersections = 0;
  let nonFiniteOuterRadii = 0;

  for (let station = 0; station <= OUTER_AXIAL_STEPS; station += 1) {
    const x = length * station / OUTER_AXIAL_STEPS;
    const outerRadii = outerPhis.map((phi) => (
      outerBoundaryRadius(plan, x, phi, wallThickness)
    ));
    const outerPoints = outerRadii.map((radius, index) => [
      radius * Math.cos(outerPhis[index]),
      radius * Math.sin(outerPhis[index]),
    ]);
    const outerArea = polarArea(outerRadii);
    const outerEquivalentRadius = Math.sqrt(outerArea / Math.PI);
    for (let ray = 0; ray < OUTER_RAYS; ray += 1) {
      const radius = outerRadii[ray];
      if (!Number.isFinite(radius) || radius <= 0) {
        nonFiniteOuterRadii += 1;
        continue;
      }
      minimumRadialWall = Math.min(
        minimumRadialWall,
        radius - radiusAt(plan, x, outerPhis[ray]),
      );
      maximumOuterEnvelopeOvershoot = Math.max(
        maximumOuterEnvelopeOvershoot,
        radius - terminalOuterRadii[ray],
      );
      if (previousOuterRadii) {
        maximumOuterRayBackstep = Math.max(
          maximumOuterRayBackstep,
          previousOuterRadii[ray] - radius,
        );
      }
    }
    if (previousOuterEquivalentRadius !== null) {
      maximumOuterEquivalentRadiusBackstep = Math.max(
        maximumOuterEquivalentRadiusBackstep,
        previousOuterEquivalentRadius - outerEquivalentRadius,
      );
    }
    if (station % 6 === 0 || station === OUTER_AXIAL_STEPS) {
      outerIntersections += selfIntersectionCount(outerPoints);
    }
    previousOuterRadii = outerRadii;
    previousOuterEquivalentRadius = outerEquivalentRadius;
  }

  check(
    minimumArea >= throatArea * (1 - 1e-7),
    `minimum section area pinched to ${(minimumArea / throatArea).toFixed(8)} × throat`,
  );
  check(
    maximumRayBackstep <= LENGTH_TOLERANCE,
    `a polar ray reversed by ${(maximumRayBackstep * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumEquivalentRadiusBackstep <= LENGTH_TOLERANCE,
    `equivalent radius reversed by ${(maximumEquivalentRadiusBackstep * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumAxisBackstep <= LENGTH_TOLERANCE,
    `H/V axis reversed by ${(maximumAxisBackstep * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumEnvelopeOvershoot <= LENGTH_TOLERANCE,
    `morph overshot its terminal panel by ${(maximumEnvelopeOvershoot * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumEnvelopeUndershoot <= LENGTH_TOLERANCE,
    `morph pinched inside the throat by ${(maximumEnvelopeUndershoot * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumOppositeRayMismatch <= LENGTH_TOLERANCE,
    `opposed rays differ by ${(maximumOppositeRayMismatch * 1e6).toFixed(3)} µm`,
  );
  check(intersections === 0, `${intersections} acoustic-section self-intersections`);
  check(
    derivatives.maximumThroatC0 <= C0_TOLERANCE,
    `throat C0 error ${(derivatives.maximumThroatC0 * 1e6).toFixed(3)} µm`,
  );
  check(
    derivatives.maximumEndC0 <= C0_TOLERANCE,
    `terminal C0 error ${(derivatives.maximumEndC0 * 1e6).toFixed(3)} µm`,
  );
  check(
    derivatives.maximumThroatTangent <= C1_TOLERANCE_RAD,
    `throat C1 tangent is ${(derivatives.maximumThroatTangent * 180 / Math.PI).toFixed(4)}°`,
  );
  check(
    derivatives.maximumEndTangentMismatch <= C1_TOLERANCE_RAD,
    `terminal C1 mismatch is ${(derivatives.maximumEndTangentMismatch * 180 / Math.PI).toFixed(4)}°`,
  );
  check(
    derivatives.maximumInternalTangentJump <= C1_TOLERANCE_RAD,
    `internal tangent jump is ${(derivatives.maximumInternalTangentJump * 180 / Math.PI).toFixed(4)}°`,
  );
  check(
    derivatives.maximumThroatCurvature <= THROAT_CURVATURE_TOLERANCE,
    `throat C2 curvature is ${derivatives.maximumThroatCurvature.toFixed(5)} m^-1`,
  );
  /* The profile contract makes C0/C1 hard gates and requires a numeric C2
     report. Terminal C2 remains in the report until every panel law declares
     a curvature-matched handoff; making it a hidden pass/fail tolerance here
     would be stricter than the production contract. */
  check(
    Number.isFinite(derivatives.maximumEndCurvatureMismatch),
    "terminal C2 mismatch is not finite",
  );
  check(normals.nonFinite === 0, `${normals.nonFinite} non-finite surface normals`);
  check(
    normals.minimumCondition >= MIN_NORMAL_CONDITION,
    `minimum surface-normal condition is ${normals.minimumCondition}`,
  );
  check(nonFiniteOuterRadii === 0,
    `${nonFiniteOuterRadii} non-finite outer-wall boundary radii`);
  check(
    minimumRadialWall >= wallThickness * 0.7,
    `minimum sampled radial wall is ${(minimumRadialWall * 1000).toFixed(3)} mm`,
  );
  check(
    maximumOuterRayBackstep <= LENGTH_TOLERANCE,
    `outer-wall ray reversed by ${(maximumOuterRayBackstep * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumOuterEquivalentRadiusBackstep <= LENGTH_TOLERANCE,
    `outer equivalent radius reversed by `
      + `${(maximumOuterEquivalentRadiusBackstep * 1e6).toFixed(3)} µm`,
  );
  check(
    maximumOuterEnvelopeOvershoot <= LENGTH_TOLERANCE,
    `outer morph overshot its terminal section by `
      + `${(maximumOuterEnvelopeOvershoot * 1e6).toFixed(3)} µm`,
  );
  check(outerIntersections === 0,
    `${outerIntersections} outer-wall section self-intersections`);

  return {
    id: testCase.id,
    morphLengthMm: +(length * 1000).toFixed(4),
    minimumSectionAreaRatio: +(minimumArea / throatArea).toFixed(8),
    maximumRayBackstepUm: +(maximumRayBackstep * 1e6).toFixed(4),
    maximumEquivalentRadiusBackstepUm:
      +(maximumEquivalentRadiusBackstep * 1e6).toFixed(4),
    maximumAxisBackstepUm: +(maximumAxisBackstep * 1e6).toFixed(4),
    maximumEnvelopeOvershootUm: +(maximumEnvelopeOvershoot * 1e6).toFixed(4),
    maximumOppositeRayMismatchUm:
      +(maximumOppositeRayMismatch * 1e6).toFixed(4),
    throatC0Um: +(derivatives.maximumThroatC0 * 1e6).toFixed(5),
    terminalC0Um: +(derivatives.maximumEndC0 * 1e6).toFixed(5),
    throatC1Deg:
      +(derivatives.maximumThroatTangent * 180 / Math.PI).toFixed(5),
    terminalC1MismatchDeg:
      +(derivatives.maximumEndTangentMismatch * 180 / Math.PI).toFixed(5),
    internalC1JumpDeg:
      +(derivatives.maximumInternalTangentJump * 180 / Math.PI).toFixed(5),
    throatC2InvM: +derivatives.maximumThroatCurvature.toFixed(5),
    terminalC2MismatchInvM:
      +derivatives.maximumEndCurvatureMismatch.toFixed(5),
    minimumNormalCondition: +normals.minimumCondition.toFixed(6),
    minimumRadialWallMm: +(minimumRadialWall * 1000).toFixed(4),
    maximumOuterRayBackstepUm:
      +(maximumOuterRayBackstep * 1e6).toFixed(4),
    maximumOuterEquivalentRadiusBackstepUm:
      +(maximumOuterEquivalentRadiusBackstep * 1e6).toFixed(4),
    selfIntersections: intersections + outerIntersections,
  };
}

test("round-to-panel throat morph stays monotonic, smooth, and printable", () => {
  const canonical = new Map(
    loadCases()
      .filter((testCase) => testCase.documentName === "canonical")
      .map((testCase) => [testCase.id, testCase]),
  );
  const failures = [];
  const report = [];
  for (const id of CASE_IDS) {
    const testCase = canonical.get(id);
    if (!testCase) {
      failures.push(`${id}: canonical fixture is missing`);
      continue;
    }
    const result = analyzeCase(testCase, failures);
    if (result) report.push(result);
  }
  console.log(JSON.stringify({
    contract: {
      cases: CASE_IDS,
      c0ToleranceUm: C0_TOLERANCE * 1e6,
      c1ToleranceDeg: C1_TOLERANCE_RAD * 180 / Math.PI,
      maximumBackstepUm: LENGTH_TOLERANCE * 1e6,
      terminalC2: "reported, not gated",
    },
    report,
  }, null, 2));
  assert.deepEqual(failures, [], failures.join("\n"));
});
