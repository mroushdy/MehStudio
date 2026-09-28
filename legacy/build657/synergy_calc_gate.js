#!/usr/bin/env node
"use strict";

const Calc = require("./synergy-calc.js");

let checks = 0;
const failures = [];

function check(condition, message) {
  checks++;
  if (!condition) failures.push(message);
}

function near(actual, expected, tolerance) {
  return Math.abs(actual - expected) <= tolerance;
}

function checkNear(actual, expected, tolerance, label) {
  check(
    near(actual, expected, tolerance),
    `${label}: expected ${expected} +/- ${tolerance}, received ${actual}`
  );
}

function throwsValidation(operation, messagePattern, label) {
  let error = null;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }
  check(
    error instanceof Calc.SynergyCalcValidationError,
    `${label}: expected SynergyCalcValidationError`
  );
  if (error && messagePattern) {
    check(
      messagePattern.test(error.message),
      `${label}: unexpected message "${error.message}"`
    );
  }
}

const result = Calc.calculate();
const cells = result.workbookCells;

check(
  Calc.THROAT_CONVENTION.status === "ambiguous" &&
    Calc.THROAT_CONVENTION.generalizable === false,
  "C26/S1 convention must remain explicitly ambiguous and non-generalizable"
);
check(
  Calc.CELL_FORMULAS.C43 ===
    "(C39-C42)/(2*TAN(RADIANS(C23/2)))",
  "C43 formula must divide by the complete 2*tan term"
);
check(
  Calc.CELL_FORMULAS.C36 === "180-(90-C23/2)" &&
    Calc.CELL_FORMULAS.C38 ===
      "0.5*C27*(C23+C36)/(C23*C36*C25)",
  "recovered workbook parentheses drifted"
);

const expectedCells = {
  C33: 0.01591471771133096,
  C34: 0.7303318903318904,
  C35: 256.7206061472444,
  C36: 135,
  C37: 120,
  C38: 0.6086099086099086,
  C39: 0.3955964405964406,
  C40: 0.044116533709652954,
  C41: 0.038100076200152405,
  C42: 0.09211487011163576,
  C43: 0.15174078524240245,
  C44: 0.05990889621193745,
  C45: 0.23512406262542995,
  C46: 0.38794821830331794,
  C50: 23.9609721019721,
  C51: 15.273521354601627,
  C52: 9.21090264714242
};

for (const [cell, expected] of Object.entries(expectedCells)) {
  checkNear(cells[cell], expected, 1e-12, `default workbook ${cell}`);
}

const expectedHornresp = {
  S1Cm2: 2.532782398313514,
  S2Cm2: 55.18500193094085,
  S3Cm2: 930.1424227319469,
  S4Cm2: 2361.091296869592,
  Con12Cm: 3.8100076200152406,
  Con23Cm: 15.174078524240246,
  Con34Cm: 4.411653370965295
};

for (const [field, expected] of Object.entries(expectedHornresp)) {
  checkNear(result.hornresp[field], expected, 1e-10, `default Hornresp ${field}`);
}

checkNear(
  result.envelope.widthIn,
  23.9609721019721,
  1e-12,
  "default envelope width"
);
checkNear(
  result.envelope.heightIn,
  15.273521354601627,
  1e-12,
  "default envelope height"
);
checkNear(
  result.envelope.depthIn,
  9.21090264714242,
  1e-12,
  "default envelope depth"
);

check(
  Calc.CELL_UNITS.C38 === "m" &&
    Calc.CELL_UNITS.C50 === "in" &&
    Object.keys(result.hornresp).every(
      key => /Cm2$/.test(key) || /Cm$/.test(key)
    ),
  "public output units are not explicit"
);
check(
  Object.isFrozen(result) &&
    Object.isFrozen(result.workbookCells) &&
    Object.isFrozen(Calc.DEFAULT_INPUTS),
  "pure results and source defaults must be immutable"
);

const nonRightAngle = Calc.calculate({ thetaWidthDeg: 80 }).workbookCells;
const c43Denominator =
  2 * Math.tan((nonRightAngle.C23 / 2) * Math.PI / 180);
const correctC43 =
  (nonRightAngle.C39 - nonRightAngle.C42) / c43Denominator;
const wrongC43 =
  ((nonRightAngle.C39 - nonRightAngle.C42) / 2) *
  Math.tan((nonRightAngle.C23 / 2) * Math.PI / 180);
check(
  near(nonRightAngle.C43, correctC43, 1e-15) &&
    Math.abs(nonRightAngle.C43 - wrongC43) > 0.01,
  "C43 accidentally uses multiply-by-tan operator order"
);

throwsValidation(
  () => Calc.calculate({ c26ThroatInputIn: 1 }),
  /explicit acknowledgement/i,
  "custom C26 without convention"
);
const acknowledged = Calc.calculate({
  c26ThroatInputIn: 1,
  c26Convention: Calc.THROAT_CONVENTION.id
});
check(
  acknowledged.inputs.c26ConventionAcknowledged === true &&
    acknowledged.throatConvention.status === "ambiguous",
  "custom C26 acknowledgement must not erase ambiguity metadata"
);
checkNear(
  acknowledged.workbookCells.C33,
  Math.sqrt(Math.PI * (1 / 2) ** 2) / 39.37,
  1e-15,
  "acknowledged custom C26 literal formula"
);

throwsValidation(
  () => Calc.calculate({ throatDiameterIn: 1 }),
  /unknown input/i,
  "generic throat-diameter alias"
);
throwsValidation(
  () => Calc.calculate({ thetaWidthDeg: 180 }),
  /less than 180/i,
  "invalid coverage"
);
throwsValidation(
  () => Calc.calculate({ firstExpansionWidthRatio: 1 }),
  /less than 1/i,
  "invalid expansion ratio"
);
throwsValidation(
  () => Calc.calculate({ controlFrequencyHz: "385" }),
  /finite number/i,
  "implicit string coercion"
);

if (failures.length) {
  console.error(
    `SYNERGY CALC GATE FAIL — ${failures.length}/${checks} checks failed`
  );
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}

console.log(
  `SYNERGY CALC GATE PASS — ${checks} checks · ` +
    `envelope ${result.envelope.widthIn.toFixed(6)} × ` +
    `${result.envelope.heightIn.toFixed(6)} × ` +
    `${result.envelope.depthIn.toFixed(6)} in · ` +
    `S1-S4 ${[
      result.hornresp.S1Cm2,
      result.hornresp.S2Cm2,
      result.hornresp.S3Cm2,
      result.hornresp.S4Cm2
    ].map(value => value.toFixed(6)).join("/")} cm^2`
);
