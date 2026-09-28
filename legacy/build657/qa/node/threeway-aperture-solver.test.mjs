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
const modulePath = path.join(appRoot, "threeway-aperture-solver.js");
const source = fs.readFileSync(modulePath, "utf8");
const solver = require(modulePath);

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, received ${actual}`,
  );
}

function sourceFixture(sourceId = "source-mid") {
  return {
    sourceId,
    candidatePolicy: solver.candidatePolicy,
    allowedCounts: [2],
    driverEffectiveAreaM2: 0.02,
    areaPolicy: {
      mode: "target",
      summedAreaTargetM2: 0.002,
    },
    compressionRatioBounds: {
      minimum: 8,
      maximum: 12,
    },
    host: {
      id: `${sourceId}-active-cone`,
      role: "active-cone",
      shape: "circle",
      radiusM: 0.18,
    },
    apertureShape: {
      kind: "racetrack",
      lengthToWidthRatio: 3,
    },
    limits: {
      minimumWebM: 0.005,
      minimumEdgeM: 0.005,
      maximumApertureLongAxisM: 0.08,
      maximumApertureShortAxisM: 0.04,
    },
    orientationPolicy: {
      mode: "driver-local-parallel",
      angleRad: 0,
    },
    placementPolicy: {
      family: "symmetric-line",
      axisAngleRad: Math.PI / 2,
      spacingMode: "explicit-center-spacing",
      centerSpacingM: 0.05,
    },
    upperFrequencyHz: 1000,
    speedOfSoundMps: 343,
    wavelengthSpacingPolicy: "warn",
    provenance: {
      classification: "calculated-adaptation",
      evidenceRefs: ["analytic-fixture"],
    },
  };
}

function candidate(result, index = 0) {
  assert.equal(result.ok, true);
  assert.ok(result.feasibleCandidates.length > index);
  return result.feasibleCandidates[index];
}

test("metadata forbids mouth/product inference and manufacturing authority", () => {
  assert.equal(solver.version, 1);
  assert.equal(solver.capabilities.countInference, false);
  assert.equal(solver.capabilities.areaInferenceFromMouth, false);
  assert.equal(solver.capabilities.spacingInferenceFromMouth, false);
  assert.equal(solver.capabilities.productNameInference, false);
  assert.equal(solver.capabilities.manufacturing, false);
  assert.equal(solver.modelMetadata.hardwareValidated, false);
  assert.equal(solver.modelMetadata.manufacturing, false);
  assert.match(
    solver.equations.quarterWavelengthSpacing.status,
    /rule-of-thumb/,
  );
  assert.ok(Object.isFrozen(solver));
});

test("round apertures have exact analytic area and perimeter", () => {
  const input = sourceFixture();
  input.apertureShape = { kind: "round" };
  const result = solver.solveSourceApertures(input);
  const solved = candidate(result);
  const expectedRadius = Math.sqrt(0.001 / Math.PI);

  assert.equal(solved.apertureShape, "round");
  assert.equal(solved.count, 2);
  close(solved.apertures[0].shape.radiusM, expectedRadius);
  close(solved.apertures[0].shape.areaM2, 0.001);
  close(
    solved.apertures[0].shape.perimeterM,
    2 * Math.PI * expectedRadius,
  );
  close(solved.summedAreaM2, 0.002);
  close(solved.compressionRatio, 10);
});

test("racetrack dimensions, area, perimeter, and two-tap parallel policy are analytic", () => {
  const result = solver.solveSourceApertures(sourceFixture());
  const solved = candidate(result);
  const coefficient = 3 - 1 + Math.PI / 4;
  const width = Math.sqrt(0.001 / coefficient);
  const length = 3 * width;
  const perimeter = 2 * (length - width) + Math.PI * width;

  assert.equal(solved.apertureShape, "racetrack");
  close(solved.apertures[0].shape.widthM, width);
  close(solved.apertures[0].shape.lengthM, length);
  close(solved.apertures[0].shape.areaM2, 0.001);
  close(solved.apertures[0].shape.perimeterM, perimeter);
  assert.equal(solved.allLongAxesParallel, true);
  assert.equal(solved.twoTapParallelPolicyPass, true);
  assert.equal(
    solved.apertures[0].angleRad,
    solved.apertures[1].angleRad,
  );
  assert.equal(solved.pairSpacing.length, 1);
  close(solved.pairSpacing[0].centerDistanceM, 0.05);
  assert.equal(solved.pairSpacing[0].structuralWebPass, true);
});

test("summed-area ranges require an explicit selection and preserve compression math", () => {
  const input = sourceFixture();
  input.areaPolicy = {
    mode: "range",
    summedAreaRangeM2: { minimum: 0.0018, maximum: 0.0022 },
    selection: "midpoint",
  };
  const midpoint = candidate(solver.solveSourceApertures(input));
  close(midpoint.summedAreaM2, 0.002);
  close(midpoint.compressionRatio, 10);

  const maximumInput = structuredClone(input);
  maximumInput.areaPolicy.selection = "maximum";
  const maximum = candidate(
    solver.solveSourceApertures(maximumInput),
  );
  close(maximum.summedAreaM2, 0.0022);
  close(maximum.compressionRatio, 0.02 / 0.0022);
  assert.ok(maximum.compressionRatio < midpoint.compressionRatio);

  const noSelection = structuredClone(input);
  delete noSelection.areaPolicy.selection;
  const refused = solver.solveSourceApertures(noSelection);
  assert.equal(refused.ok, false);
  assert.equal(
    refused.code,
    solver.failureCodes.AREA_UNSOLVABLE,
  );
});

test("quarter-wavelength spacing is a warning unless explicitly promoted to refusal", () => {
  const warningInput = sourceFixture();
  warningInput.placementPolicy.centerSpacingM = 0.1;
  const warningResult = solver.solveSourceApertures(warningInput);
  const warningCandidate = candidate(warningResult);
  close(
    warningCandidate.wavelengthSpacing.quarterWavelengthBoundM,
    343 / 4000,
  );
  assert.equal(
    warningCandidate.wavelengthSpacing.allPairsWithinBound,
    false,
  );
  assert.ok(
    warningCandidate.diagnostics.some(
      item => item.code === solver.failureCodes.SPACING_EXCEEDED,
    ),
  );

  const refusalInput = structuredClone(warningInput);
  refusalInput.wavelengthSpacingPolicy = "refuse";
  const refusal = solver.solveSourceApertures(refusalInput);
  assert.equal(refusal.ok, false);
  assert.equal(refusal.feasibleCandidates.length, 0);
  assert.equal(
    refusal.refusedCandidates[0].code,
    solver.failureCodes.SPACING_EXCEEDED,
  );
});

test("a larger active-cone host expands maximum feasible spacing without changing declared aperture area", () => {
  const smallInput = sourceFixture();
  smallInput.host.radiusM = 0.1;
  smallInput.placementPolicy = {
    family: "symmetric-line",
    axisAngleRad: Math.PI / 2,
    spacingMode: "maximize-symmetric-spacing",
  };
  const largeInput = structuredClone(smallInput);
  largeInput.host.radiusM = 0.2;

  const small = candidate(solver.solveSourceApertures(smallInput));
  const large = candidate(solver.solveSourceApertures(largeInput));
  close(small.summedAreaM2, 0.002);
  close(large.summedAreaM2, 0.002);
  close(
    small.apertures[0].shape.areaM2,
    large.apertures[0].shape.areaM2,
  );
  assert.ok(
    large.pairSpacing[0].centerDistanceM >
      small.pairSpacing[0].centerDistanceM,
  );
});

test("circular-host solutions rotate covariantly and preserve symmetry", () => {
  const firstInput = sourceFixture();
  firstInput.placementPolicy.axisAngleRad = 0;
  firstInput.placementPolicy.centerSpacingM = 0.08;
  firstInput.orientationPolicy.angleRad = 0;
  const secondInput = structuredClone(firstInput);
  secondInput.placementPolicy.axisAngleRad = Math.PI / 2;
  secondInput.orientationPolicy.angleRad = Math.PI / 2;

  const first = candidate(solver.solveSourceApertures(firstInput));
  const second = candidate(solver.solveSourceApertures(secondInput));
  for (let index = 0; index < first.apertures.length; index++) {
    const original = first.apertures[index].centerM;
    const rotated = second.apertures[index].centerM;
    close(rotated.x, -original.y);
    close(rotated.y, original.x);
  }
  close(
    first.pairSpacing[0].boundaryClearanceM,
    second.pairSpacing[0].boundaryClearanceM,
  );
  close(first.summedAreaM2, second.summedAreaM2);
});

test("source-array permutation yields the same canonical keyed layout", () => {
  const sourceA = sourceFixture("source-a");
  const sourceB = sourceFixture("source-b");
  sourceB.host.role = "front-chamber";
  sourceB.apertureShape = { kind: "round" };
  const first = solver.solveApertureLayout({
    sources: [sourceA, sourceB],
  });
  const second = solver.solveApertureLayout({
    sources: [sourceB, sourceA],
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.sourceOrder, ["source-a", "source-b"]);
  assert.deepEqual(second.sourceOrder, first.sourceOrder);
  assert.deepEqual(first.sources, second.sources);
  assert.deepEqual(first.bySource, second.bySource);
});

test("multiple drivers can share one declared panel-parallel angle while retaining local frames", () => {
  const sourceA = sourceFixture("source-panel-a");
  const sourceB = sourceFixture("source-panel-b");
  sourceA.orientationPolicy = {
    mode: "panel-parallel",
    panelAngleRad: 0.3,
    driverLocalToPanelAngleRad: 0,
  };
  sourceB.orientationPolicy = {
    mode: "panel-parallel",
    panelAngleRad: 0.3,
    driverLocalToPanelAngleRad: Math.PI / 2,
  };
  sourceA.placementPolicy.centerSpacingM = 0.1;
  sourceB.placementPolicy.centerSpacingM = 0.1;
  const result = solver.solveApertureLayout({
    sources: [sourceB, sourceA],
  });
  assert.equal(result.ok, true);
  const first = result.bySource["source-panel-a"].feasibleCandidates[0];
  const second = result.bySource["source-panel-b"].feasibleCandidates[0];
  close(first.orientationPolicy.panelAngleRad, 0.3);
  close(second.orientationPolicy.panelAngleRad, 0.3);
  assert.notEqual(
    first.orientationPolicy.driverLocalAngleRad,
    second.orientationPolicy.driverLocalAngleRad,
  );
  assert.ok(
    first.apertures.every(
      item => Math.abs(item.panelAngleRad - 0.3) <= 1e-12,
    ),
  );
  assert.ok(
    second.apertures.every(
      item => Math.abs(item.panelAngleRad - 0.3) <= 1e-12,
    ),
  );
});

test("declared aperture footprint limits fail deterministically", () => {
  const input = sourceFixture();
  input.limits.maximumApertureLongAxisM = 0.04;
  const result = solver.solveSourceApertures(input);

  assert.equal(result.ok, false);
  assert.equal(result.feasibleCandidates.length, 0);
  assert.equal(
    result.code,
    solver.failureCodes.FOOTPRINT_OUTSIDE_HOST,
  );
  assert.equal(
    result.refusedCandidates[0].code,
    solver.failureCodes.FOOTPRINT_OUTSIDE_HOST,
  );
});

test("declared structural web fails closed for overlapping/nearby capsules", () => {
  const input = sourceFixture();
  input.placementPolicy.centerSpacingM = 0.02;
  const result = solver.solveSourceApertures(input);

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    solver.failureCodes.STRUCTURAL_WEB_INSUFFICIENT,
  );
  assert.ok(
    result.refusedCandidates[0].reasons[0].details
      .boundaryClearanceM < input.limits.minimumWebM,
  );
});

test("host edge clearance refuses footprints outside circular and rectangular hosts", () => {
  const circleInput = sourceFixture();
  circleInput.host.radiusM = 0.04;
  circleInput.limits.minimumEdgeM = 0.01;
  circleInput.placementPolicy.centerSpacingM = 0.05;
  const circle = solver.solveSourceApertures(circleInput);
  assert.equal(circle.ok, false);
  assert.equal(
    circle.code,
    solver.failureCodes.FOOTPRINT_OUTSIDE_HOST,
  );

  const rectangleInput = sourceFixture();
  rectangleInput.host = {
    id: "small-front-chamber",
    role: "front-chamber",
    shape: "rectangle",
    widthM: 0.07,
    heightM: 0.06,
  };
  rectangleInput.orientationPolicy.angleRad = Math.PI / 4;
  rectangleInput.placementPolicy.centerSpacingM = 0.04;
  const rectangle = solver.solveSourceApertures(rectangleInput);
  assert.equal(rectangle.ok, false);
  assert.equal(
    rectangle.code,
    solver.failureCodes.FOOTPRINT_OUTSIDE_HOST,
  );
});

test("all declared counts are enumerated without automatic selection", () => {
  const input = sourceFixture();
  input.allowedCounts = [4, 2, 1];
  input.placementPolicy = {
    family: "symmetric-line",
    axisAngleRad: Math.PI / 2,
    spacingMode: "maximize-symmetric-spacing",
  };
  input.limits.minimumWebM = 0.001;
  const result = solver.solveSourceApertures(input);

  assert.deepEqual(result.allowedCounts, [1, 2, 4]);
  assert.equal(result.selectedCandidateId, null);
  assert.equal(result.automaticCountSelection, false);
  assert.deepEqual(
    [
      ...result.feasibleCandidates,
      ...result.refusedCandidates,
    ].map(item => item.count).sort((a, b) => a - b),
    [1, 2, 4],
  );
});

test("mouth/product fields cannot replace or alter explicit count, area, or spacing", () => {
  const missingCount = sourceFixture();
  delete missingCount.allowedCounts;
  const countRefusal = solver.solveSourceApertures(missingCount);
  assert.equal(
    countRefusal.code,
    solver.failureCodes.COUNT_INVALID,
  );

  const missingArea = sourceFixture();
  delete missingArea.areaPolicy;
  const areaRefusal = solver.solveSourceApertures(missingArea);
  assert.equal(
    areaRefusal.code,
    solver.failureCodes.INPUT_REQUIRED,
  );

  const first = sourceFixture();
  const second = sourceFixture();
  second.mouth = { widthM: 9, heightM: 4 };
  second.manufacturer = "not an input";
  second.model = "also not an input";
  const firstResult = solver.solveSourceApertures(first);
  const secondResult = solver.solveSourceApertures(second);
  assert.deepEqual(firstResult, secondResult);
});

test("inputs are not mutated, outputs are deeply frozen, and invalid numerics are sanitized", () => {
  const input = sourceFixture();
  const before = structuredClone(input);
  const result = solver.solveSourceApertures(input);
  assert.deepEqual(input, before);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.feasibleCandidates));
  assert.ok(
    Object.isFrozen(result.feasibleCandidates[0].apertures[0].shape),
  );
  assert.throws(
    () => {
      result.feasibleCandidates[0].apertures[0].centerM.x = 99;
    },
    TypeError,
  );

  const invalid = sourceFixture();
  invalid.limits.minimumWebM = Number.NaN;
  const refused = solver.solveSourceApertures(invalid);
  assert.equal(refused.ok, false);
  assert.equal(JSON.stringify(refused).includes("NaN"), false);
  assert.equal(JSON.stringify(refused).includes("Infinity"), false);
  assert.equal(refused.details.limits.minimumWebM, null);
  assert.equal(refused.manufacturing, false);

  const overflow = sourceFixture();
  overflow.driverEffectiveAreaM2 = 1e308;
  overflow.areaPolicy.summedAreaTargetM2 = 1e-308;
  overflow.compressionRatioBounds.maximum = 1e308;
  const overflowRefusal = solver.solveSourceApertures(overflow);
  assert.equal(overflowRefusal.ok, false);
  assert.equal(
    overflowRefusal.code,
    solver.failureCodes.INPUT_INVALID,
  );
  const inspect = value => {
    if (typeof value === "number") {
      assert.equal(Number.isFinite(value), true);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) inspect(child);
    }
  };
  inspect(overflowRefusal);
});

test("manufacturing always refuses and UMD loads without DOM/renderer/engine globals", () => {
  const manufacturing = solver.manufacturingPreflight(
    "export-aperture-solid",
  );
  assert.equal(manufacturing.ok, false);
  assert.equal(manufacturing.available, false);
  assert.equal(manufacturing.manufacturing, false);
  assert.equal(manufacturing.stl, false);
  assert.equal(
    manufacturing.code,
    "THREEWAY_MANUFACTURING_UNAVAILABLE",
  );

  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.MEH3ApertureSolver.version, 1);
  assert.equal(
    context.MEH3ApertureSolver.capabilities.manufacturing,
    false,
  );
  assert.equal(context.document, undefined);
  assert.equal(context.THREE, undefined);
  assert.equal(context.MEH3, undefined);
  assert.equal(context.MEH3DriverDB, undefined);
});
