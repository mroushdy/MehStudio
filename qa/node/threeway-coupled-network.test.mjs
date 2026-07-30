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
const modulePath = path.join(appRoot, "threeway-coupled-network.js");
const source = fs.readFileSync(modulePath, "utf8");
const network = require(modulePath);

const C = (re, im = 0) => ({ re, im });
const add = (a, b) => C(a.re + b.re, a.im + b.im);
const mul = (a, b) => C(
  a.re * b.re - a.im * b.im,
  a.re * b.im + a.im * b.re,
);
const magnitude = value => Math.hypot(value.re, value.im);
const difference = (a, b) => C(a.re - b.re, a.im - b.im);

function multiplyMatrixVector(matrix, vector) {
  return matrix.map(row => row.reduce(
    (sum, value, index) => add(sum, mul(value, vector[index])),
    C(0, 0),
  ));
}

function assertComplexClose(actual, expected, tolerance = 1e-10) {
  assert.ok(
    magnitude(difference(actual, expected)) <= tolerance,
    `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
  );
}

function transferMetadata(toPort, fromPort) {
  return {
    stateOrder: ["volumeVelocity", "pressure"],
    units: { volumeVelocity: "m^3/s", pressure: "Pa" },
    coefficientUnits: {
      A: "1",
      B: "(m^3/s)/Pa",
      C: "Pa/(m^3/s)",
      D: "1",
    },
    orientation: {
      positiveVolumeVelocity: "from mouth toward throat",
    },
    toPort,
    fromPort,
  };
}

function acousticMetadata() {
  return {
    units: {
      pressure: "Pa",
      volumeVelocity: "m^3/s",
      acousticImpedance: "Pa*s/m^3",
    },
    orientation: {
      pressure: "positive compression at each source plane",
      volumeVelocity: "positive from source into shared horn",
    },
  };
}

function syntheticImpedanceMatrix() {
  return [
    [C(2, 1), C(0.5, -0.2), C(0.1, 0.05)],
    [C(0.5, -0.2), C(3, 0.5), C(0.25, 0.1)],
    [C(0.1, 0.05), C(0.25, 0.1), C(4, 2)],
  ];
}

function impedanceRecord(matrix = syntheticImpedanceMatrix()) {
  return {
    sourceOrder: ["high", "mid", "low"],
    matrix,
    ...acousticMetadata(),
    provenance: {
      classification: "synthetic-analytic-fixture",
      hardwareValidated: false,
    },
  };
}

test("complex arithmetic is explicit and preserves real/imaginary parts", () => {
  assert.deepEqual(network.complex(1, 2), C(1, 2));
  assert.deepEqual(
    network.complexAdd(C(1, 2), C(3, -4)),
    C(4, -2),
  );
  assert.deepEqual(
    network.complexMultiply(C(1, 2), C(3, -4)),
    C(11, 2),
  );
  const quotient = network.complexDivide(C(11, 2), C(3, -4));
  assertComplexClose(quotient, C(1, 2));
  assert.deepEqual(network.complexConjugate(C(1, 2)), C(1, -2));
  assert.equal(network.complexMagnitude(C(3, 4)), 5);
  assert.equal(network.complex(Number.NaN, 0), null);
  assert.equal(network.complexDivide(C(1, 0), C(0, 0)), null);
});

test("deterministic complex partial pivoting solves an analytic system and reports residuals", () => {
  const matrix = [
    [C(0, 0), C(2, 0), C(0, 0)],
    [C(1, 1), C(0, 0), C(1, 0)],
    [C(2, 0), C(1, -1), C(3, 0)],
  ];
  const expected = [C(1, 1), C(-2, 0.5), C(0.25, -1)];
  const rhs = multiplyMatrixVector(matrix, expected);
  const first = network.solveComplexLinearSystem(matrix, rhs);
  const second = network.solveComplexLinearSystem(matrix, rhs);

  assert.equal(first.ok, true);
  first.solution.forEach((value, index) =>
    assertComplexClose(value, expected[index]),
  );
  assert.ok(first.residual.maxAbs < 1e-12);
  assert.ok(first.residual.backwardRelative < 1e-12);
  assert.equal(
    first.pivotReport.method,
    "deterministic-complex-partial-pivot",
  );
  assert.equal(first.pivotReport.selectedPivotRows[0], 2);
  assert.deepEqual(first.pivotReport, second.pivotReport);
  assert.deepEqual(first.solution, second.solution);
  assert.ok(Object.isFrozen(first.solution));
  assert.ok(Object.isFrozen(first.residual));
});

test("linear solve fails closed with stable singular and invalid codes", () => {
  const singular = network.solveComplexLinearSystem(
    [[1, 2], [2, 4]],
    [1, 2],
  );
  assert.equal(singular.ok, false);
  assert.equal(
    singular.code,
    network.failureCodes.SINGULAR_SYSTEM,
  );
  assert.equal(singular.details.rank, 1);

  const dimensions = network.solveComplexLinearSystem(
    [[1, 0], [0, 1]],
    [1],
  );
  assert.equal(
    dimensions.code,
    network.failureCodes.DIMENSION_MISMATCH,
  );

  const invalid = network.solveComplexLinearSystem(
    [[1, 0], [0, C(Number.NaN, 0)]],
    [1, 2],
  );
  assert.equal(invalid.code, network.failureCodes.INVALID_INPUT);
});

test("2x2 transfer matrices cascade in documented [U,p] order and preserve metadata", () => {
  const first = {
    matrix: [[1, 2], [0, 1]],
    metadata: transferMetadata("point-0", "point-1"),
  };
  const second = {
    matrix: [[2, 0], [1, 1]],
    metadata: transferMetadata("point-1", "point-2"),
  };
  const cascade = network.cascadeTransferMatrices([first, second]);
  assert.equal(cascade.ok, true);
  assert.deepEqual(cascade.transfer.matrix, [
    [C(4, 0), C(2, 0)],
    [C(1, 0), C(1, 0)],
  ]);
  assert.equal(cascade.transfer.metadata.toPort, "point-0");
  assert.equal(cascade.transfer.metadata.fromPort, "point-2");
  assert.equal(cascade.transfer.metadata.segments.length, 2);
  assert.equal(
    cascade.transfer.metadata.coefficientUnits.B,
    "(m^3/s)/Pa",
  );

  const applied = network.applyTransferMatrix(
    cascade.transfer,
    [C(1, 1), C(2, 0)],
  );
  assert.equal(applied.ok, true);
  assertComplexClose(applied.state[0], C(8, 4));
  assertComplexClose(applied.state[1], C(3, 1));
  assert.equal(applied.metadata.atPort, "point-0");
  assert.equal(applied.metadata.units.pressure, "Pa");

  const incompatible = structuredClone(second);
  incompatible.metadata.orientation.positiveVolumeVelocity =
    "from throat toward mouth";
  assert.equal(
    network.cascadeTransferMatrices([first, incompatible]).code,
    network.failureCodes.TRANSFER_INVALID,
  );
  const incompatibleUnits = structuredClone(second);
  incompatibleUnits.metadata.coefficientUnits.B = "unknown";
  assert.equal(
    network.cascadeTransferMatrices([first, incompatibleUnits]).code,
    network.failureCodes.TRANSFER_INVALID,
  );
});

test("branch helpers enforce pressure continuity and caller-declared signed volume conservation", () => {
  const metadata = {
    units: { volumeVelocity: "m^3/s", pressure: "Pa" },
    orientation: {
      volumeVelocitySigns: { minus: 1, plus: -1, branch: -1 },
      description: "U_plus = U_minus - U_branch",
    },
  };
  const split = network.splitBranchState({
    minusState: [C(3, 1), C(5, 2)],
    branchVolumeVelocity: C(1, -0.5),
    metadata,
  });
  assert.equal(split.ok, true);
  assertComplexClose(split.states.plus[0], C(2, 1.5));
  assertComplexClose(split.states.plus[1], C(5, 2));
  assertComplexClose(split.states.branch[1], C(5, 2));
  assert.ok(split.residuals.magnitudes.signedVolumeVelocity < 1e-15);

  const broken = network.checkBranchContinuity({
    states: {
      minus: [C(3, 1), C(5, 2)],
      plus: [C(2, 1.5), C(4, 2)],
      branch: [C(1, -0.5), C(5, 2)],
    },
    metadata,
  });
  assert.equal(broken.ok, false);
  assert.equal(
    broken.code,
    network.failureCodes.BRANCH_CONTINUITY_FAILED,
  );
  assert.equal(broken.residuals.magnitudes.pressureMinusPlus, 1);
});

test("published three-excitation column structure maps self/cross terms into rows and columns", () => {
  /*
   * Published equation structure, synthetic values:
   *
   * [p_h, p_m, p_l]^T = Z [U_h, U_m, U_l]^T.
   *
   * Each column drives one source at unit volume velocity and holds the
   * other two source velocities at zero. Values are deliberately distinct
   * labels-as-numbers; they are not a King design prediction.
   */
  const result =
    network.constructAcousticImpedanceMatrixFromUnitExcitations({
      sourceOrder: ["high", "mid", "low"],
      ...acousticMetadata(),
      columns: [
        {
          sourceId: "low",
          volumeVelocities: [0, 0, 1],
          pressures: [13, 23, 33],
          metadata: { fixture: "synthetic source-structure only" },
        },
        {
          sourceId: "high",
          volumeVelocities: [1, 0, 0],
          pressures: [11, 21, 31],
          metadata: { fixture: "synthetic source-structure only" },
        },
        {
          sourceId: "mid",
          volumeVelocities: [0, 1, 0],
          pressures: [12, 22, 32],
          metadata: { fixture: "synthetic source-structure only" },
        },
      ],
      provenance: {
        equationSource:
          "King 2026 three-driver algorithm, unit-source column method",
        numericValues: "synthetic",
        hardwareValidated: false,
      },
    });

  assert.equal(result.ok, true);
  assert.deepEqual(result.matrix, [
    [C(11, 0), C(12, 0), C(13, 0)],
    [C(21, 0), C(22, 0), C(23, 0)],
    [C(31, 0), C(32, 0), C(33, 0)],
  ]);
  assert.equal(result.matrix[0][1].re, 12, "Z_high_mid");
  assert.equal(result.matrix[2][0].re, 31, "Z_low_high");
  assert.equal(
    result.matrixConvention.row,
    "pressure at sourceOrder[row]",
  );
  assert.equal(
    result.construction.otherSourceBoundary,
    "volume velocity held at zero",
  );
  assert.equal(result.validationStatus.includes("not-hardware"), true);
  assert.equal(result.manufacturing, false);

  const notUnit =
    network.constructAcousticImpedanceMatrixFromUnitExcitations({
      sourceOrder: ["high", "mid", "low"],
      ...acousticMetadata(),
      columns: [
        {
          sourceId: "high",
          volumeVelocities: [2, 0, 0],
          pressures: [1, 2, 3],
        },
        {
          sourceId: "mid",
          volumeVelocities: [0, 1, 0],
          pressures: [1, 2, 3],
        },
        {
          sourceId: "low",
          volumeVelocities: [0, 0, 1],
          pressures: [1, 2, 3],
        },
      ],
    });
  assert.equal(
    notUnit.code,
    network.failureCodes.IMPEDANCE_COLUMNS_INVALID,
  );
});

test("direct acoustic impedance acceptance preserves units, orientation, and symmetry residual", () => {
  const matrix = syntheticImpedanceMatrix();
  const accepted = network.acceptAcousticImpedanceMatrix(
    impedanceRecord(matrix),
  );
  assert.equal(accepted.ok, true);
  assert.deepEqual(accepted.sourceOrder, ["high", "mid", "low"]);
  assert.deepEqual(accepted.matrix, matrix);
  assert.equal(accepted.units.acousticImpedance, "Pa*s/m^3");
  assert.equal(
    accepted.orientation.volumeVelocity,
    "positive from source into shared horn",
  );
  assert.ok(accepted.symmetry.maxAbs < 1e-15);
  assert.equal(accepted.symmetry.enforced, false);
  assert.ok(Object.isFrozen(accepted.matrix));
});

test("coupled three-source solve recovers an analytic solution from explicit driver terms", () => {
  const acoustic = syntheticImpedanceMatrix();
  const self = [C(1, 0.1), C(2, 0.2), C(3, 0.3)];
  const system = acoustic.map((row, rowIndex) =>
    row.map((value, columnIndex) =>
      rowIndex === columnIndex ? add(value, self[rowIndex]) : value,
    ),
  );
  const expectedVelocity = [
    C(1, 0.5),
    C(-0.5, 0.25),
    C(0.2, -0.1),
  ];
  const drive = multiplyMatrixVector(system, expectedVelocity);
  const unitRecord = (sourceId, drivePressure, selfValue) => ({
    sourceId,
    drivePressure,
    selfImpedanceTerms: [
      {
        id: "explicit-combined-driver-self",
        value: selfValue,
        metadata: {
          note:
            "synthetic total excluding shared-horn acoustic impedance",
        },
      },
    ],
    units: {
      drivePressure: "Pa",
      selfImpedance: "Pa*s/m^3",
    },
  });

  const result = network.solveCoupledThreeSourceAtFrequency({
    frequencyHz: 800,
    acousticImpedance: impedanceRecord(acoustic),
    drivers: [
      unitRecord("low", drive[2], self[2]),
      unitRecord("high", drive[0], self[0]),
      unitRecord("mid", drive[1], self[1]),
    ],
    provenance: {
      fixture: "synthetic analytic",
      hardwareValidated: false,
    },
  });

  assert.equal(result.ok, true);
  result.volumeVelocities.forEach((value, index) =>
    assertComplexClose(value, expectedVelocity[index]),
  );
  assert.ok(result.system.residual.maxAbs < 1e-12);
  assert.equal(result.frequencyHz, 800);
  assert.equal(result.units.volumeVelocity, "m^3/s");
  assert.equal(result.bySource.mid.selfImpedanceTerms.length, 1);
  assert.equal(
    result.validationStatus,
    "experimental-author-model-not-hardware-validated",
  );
  assert.equal(result.manufacturing, false);
  assert.ok(Object.isFrozen(result.bySource));
});

test("driver solve refuses missing terms, mismatched IDs, units, and frequency", () => {
  const validDriver = sourceId => ({
    sourceId,
    drivePressure: 1,
    selfImpedanceTerms: [{ id: "explicit-zero", value: 0 }],
    units: {
      drivePressure: "Pa",
      selfImpedance: "Pa*s/m^3",
    },
  });
  const base = {
    frequencyHz: 500,
    acousticImpedance: impedanceRecord(),
    drivers: [
      validDriver("high"),
      validDriver("mid"),
      validDriver("low"),
    ],
  };
  const missingTerm = structuredClone(base);
  missingTerm.drivers[0].selfImpedanceTerms = [];
  assert.equal(
    network.solveCoupledThreeSourceAtFrequency(missingTerm).code,
    network.failureCodes.DRIVER_TERMS_INVALID,
  );

  const wrongId = structuredClone(base);
  wrongId.drivers[2].sourceId = "woofer";
  assert.equal(
    network.solveCoupledThreeSourceAtFrequency(wrongId).code,
    network.failureCodes.DRIVER_TERMS_INVALID,
  );

  const wrongUnits = structuredClone(base);
  wrongUnits.drivers[1].units.drivePressure = "V";
  assert.equal(
    network.solveCoupledThreeSourceAtFrequency(wrongUnits).code,
    network.failureCodes.DRIVER_TERMS_INVALID,
  );

  const wrongFrequency = structuredClone(base);
  wrongFrequency.frequencyHz = 0;
  assert.equal(
    network.solveCoupledThreeSourceAtFrequency(wrongFrequency).code,
    network.failureCodes.FREQUENCY_INVALID,
  );
});

test("source status and manufacturing refusal are explicit", () => {
  assert.equal(
    network.modelMetadata.classification,
    "experimental-author-model",
  );
  assert.equal(network.modelMetadata.hardwareValidated, false);
  assert.equal(network.modelMetadata.manufacturing, false);
  assert.equal(network.capabilities.geometryInference, false);
  assert.equal(network.capabilities.driverParameterInference, false);
  assert.equal(network.capabilities.hornSegmentAbcdProvider, false);
  assert.equal(network.capabilities.branchAbcdProvider, false);
  assert.equal(network.capabilities.mouthRadiationLoadProvider, false);
  assert.equal(network.capabilities.manufacturingSolids, false);
  assert.equal(network.capabilities.manufacturingExport, false);

  const hornProvider =
    network.sourceDependencyPreflight("horn-segment-abcd");
  assert.equal(hornProvider.ok, false);
  assert.equal(
    hornProvider.code,
    network.failureCodes.TRANSFER_PROVIDER_UNAVAILABLE,
  );
  const branchProvider =
    network.sourceDependencyPreflight("branch-abcd");
  assert.equal(
    branchProvider.code,
    network.failureCodes.TRANSFER_PROVIDER_UNAVAILABLE,
  );
  const mouthProvider =
    network.sourceDependencyPreflight("mouth-radiation-load");
  assert.equal(
    mouthProvider.code,
    network.failureCodes.MOUTH_LOAD_PROVIDER_UNAVAILABLE,
  );
  assert.match(mouthProvider.reason, /does not supply/i);

  const refusal = network.manufacturingPreflight("stl");
  assert.deepEqual(
    {
      ok: refusal.ok,
      available: refusal.available,
      code: refusal.code,
      manufacturing: refusal.manufacturing,
      stl: refusal.stl,
    },
    {
      ok: false,
      available: false,
      code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
      manufacturing: false,
      stl: false,
    },
  );
});

test("the King matrix boundary refuses noncanonical band indexing", () => {
  const swapped = impedanceRecord();
  swapped.sourceOrder = ["low", "mid", "high"];
  const result = network.acceptAcousticImpedanceMatrix(swapped);
  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    network.failureCodes.IMPEDANCE_MATRIX_INVALID,
  );
  assert.deepEqual(network.sourceOrderDefault, ["high", "mid", "low"]);
});

test("the UMD math module loads without DOM, renderer, engine, or state-contract globals", () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.MEH3CoupledNetwork.version, 1);
  assert.equal(
    context.MEH3CoupledNetwork.capabilities.manufacturingExport,
    false,
  );
  assert.doesNotMatch(source, /require\(['"].*(?:engine|twoway|state-contract)/);
  assert.doesNotMatch(source, /\bTHREE\.|document\.|window\./);
});
