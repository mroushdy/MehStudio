"use strict";

/*
 * Source-faithful acoustic geometry from Bill Waslo's "Synergy Calc v5.xls".
 *
 * This module intentionally implements only the recovered workbook chain:
 * inputs C23:C30, geometry C33:C46, envelope C50:C52, and the Hornresp
 * station outputs. It does not infer tap sizes, chambers, driver placement,
 * directivity, or manufacturing geometry beyond those workbook formulas.
 */

const INCHES_PER_METER = 39.37;
const CENTIMETERS_PER_METER = 100;

const SOURCE = deepFreeze({
  title: "Synergy Calc v5.xls",
  author: "Bill Waslo",
  workbookFormat: "Excel 97-2003 BIFF8",
  sheet: "Main Panels",
  scope: "Recovered cells C23:C30, C33:C46, C50:C52 and Hornresp outputs",
  fidelity:
    "Literal workbook formulas with recovered parentheses; no acoustic reinterpretation."
});

const THROAT_CONVENTION = deepFreeze({
  id: "workbook-c26-literal-formula-v1",
  status: "ambiguous",
  workbookCell: "C26",
  workbookLabel:
    "Side of HF throat (square); workbook guidance uses 0.707 in for a 1 in driver",
  formulaApplied:
    "C33 = SQRT(PI()*(C26/2)^2)/39.37",
  effect:
    "The workbook mathematically treats C26 as a circular diameter, then uses the equal-area square side C33.",
  warning:
    "At the documented 0.707 in default, S1 is 2.5328 cm^2: half the area of a 1 in circular exit. The workbook and guide do not explain whether this is a split-throat convention.",
  generalizable: false,
  customValuePolicy:
    "A non-default C26 value requires this convention id to be supplied explicitly. It must not be presented as a generic compression-driver throat diameter."
});

const DEFAULT_INPUTS = deepFreeze({
  thetaWidthDeg: 90,
  thetaHeightDeg: 60,
  controlFrequencyHz: 385,
  c26ThroatInputIn: 0.707,
  keeleConstantHzDegM: 25306,
  firstExpansionWidthRatio: 0.65,
  tapDistanceFromThroatIn: 1.5,
  boardThicknessIn: 0.465
});

const INPUT_CELLS = deepFreeze({
  thetaWidthDeg: "C23",
  thetaHeightDeg: "C24",
  controlFrequencyHz: "C25",
  c26ThroatInputIn: "C26",
  keeleConstantHzDegM: "C27",
  firstExpansionWidthRatio: "C28",
  tapDistanceFromThroatIn: "C29",
  boardThicknessIn: "C30"
});

const CELL_UNITS = deepFreeze({
  C23: "deg",
  C24: "deg",
  C25: "Hz",
  C26: "in (ambiguous workbook input; see THROAT_CONVENTION)",
  C27: "Hz*deg*m",
  C28: "ratio",
  C29: "in",
  C30: "in",
  C33: "m",
  C34: "m",
  C35: "Hz",
  C36: "deg",
  C37: "deg",
  C38: "m",
  C39: "m",
  C40: "m",
  C41: "m",
  C42: "m",
  C43: "m",
  C44: "m",
  C45: "m",
  C46: "m",
  C50: "in",
  C51: "in",
  C52: "in"
});

const CELL_FORMULAS = deepFreeze({
  C33: "SQRT(PI()*(C26/2)^2)/39.37",
  C34: "C27/(C23*C25)",
  C35: "10^(LOG10(C25)-0.176)",
  C36: "180-(90-C23/2)",
  C37: "180-(90-C24/2)",
  C38: "0.5*C27*(C23+C36)/(C23*C36*C25)",
  C39: "C38*C28",
  C40: "(C38-C39)/(2*TAN(RADIANS(C36/2)))",
  C41: "C29/39.37",
  C42: "2*C41*TAN(RADIANS(C23/2))+C33",
  C43: "(C39-C42)/(2*TAN(RADIANS(C23/2)))",
  C44: "2*C41*TAN(RADIANS(C24/2))+C33",
  C45: "2*C43*TAN(RADIANS(C24/2))+C44",
  C46: "2*C40*TAN(RADIANS(C37/2))+C45",
  C50: "C38*39.37",
  C51: "C46*39.37",
  C52: "(Con12+Con23+Con34)/100*39.37"
});

const HORNRESP_FORMULAS = deepFreeze({
  S1: "(100*C33)^2",
  S2: "(100*C42)*(100*C44)",
  S3: "(100*C39)*(100*C45)",
  S4: "(100*C38)*(100*C46)",
  Con12: "100*C41",
  Con23: "100*C43",
  Con34: "100*C40"
});

class SynergyCalcValidationError extends RangeError {
  constructor(message, details) {
    super(message);
    this.name = "SynergyCalcValidationError";
    this.details = details || null;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertFiniteNumber(value, key, unit) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SynergyCalcValidationError(
      `${key} must be a finite number in ${unit}.`,
      { key, value, unit }
    );
  }
}

function assertRange(condition, key, value, requirement) {
  if (!condition) {
    throw new SynergyCalcValidationError(
      `${key} must be ${requirement}; received ${value}.`,
      { key, value, requirement }
    );
  }
}

function validateInputs(overrides = {}) {
  if (
    overrides === null ||
    typeof overrides !== "object" ||
    Array.isArray(overrides)
  ) {
    throw new SynergyCalcValidationError("Inputs must be a plain object.");
  }

  const allowed = new Set([...Object.keys(DEFAULT_INPUTS), "c26Convention"]);
  for (const key of Object.keys(overrides)) {
    if (!allowed.has(key)) {
      throw new SynergyCalcValidationError(
        `Unknown input "${key}". Use workbook-semantic input names only.`,
        { key, allowed: [...allowed] }
      );
    }
  }

  if (
    hasOwn(overrides, "c26Convention") &&
    overrides.c26Convention !== THROAT_CONVENTION.id
  ) {
    throw new SynergyCalcValidationError(
      `c26Convention must equal "${THROAT_CONVENTION.id}".`,
      {
        key: "c26Convention",
        value: overrides.c26Convention,
        required: THROAT_CONVENTION.id
      }
    );
  }

  const inputs = { ...DEFAULT_INPUTS };
  for (const key of Object.keys(DEFAULT_INPUTS)) {
    if (hasOwn(overrides, key)) inputs[key] = overrides[key];
  }

  const units = {
    thetaWidthDeg: "degrees",
    thetaHeightDeg: "degrees",
    controlFrequencyHz: "Hz",
    c26ThroatInputIn: "inches",
    keeleConstantHzDegM: "Hz*deg*m",
    firstExpansionWidthRatio: "unitless ratio",
    tapDistanceFromThroatIn: "inches",
    boardThicknessIn: "inches"
  };
  for (const [key, unit] of Object.entries(units)) {
    assertFiniteNumber(inputs[key], key, unit);
  }

  assertRange(
    inputs.thetaWidthDeg > 0 && inputs.thetaWidthDeg < 180,
    "thetaWidthDeg",
    inputs.thetaWidthDeg,
    "greater than 0 and less than 180 degrees"
  );
  assertRange(
    inputs.thetaHeightDeg > 0 && inputs.thetaHeightDeg < 180,
    "thetaHeightDeg",
    inputs.thetaHeightDeg,
    "greater than 0 and less than 180 degrees"
  );
  assertRange(
    inputs.controlFrequencyHz > 0,
    "controlFrequencyHz",
    inputs.controlFrequencyHz,
    "greater than 0 Hz"
  );
  assertRange(
    inputs.c26ThroatInputIn > 0,
    "c26ThroatInputIn",
    inputs.c26ThroatInputIn,
    "greater than 0 inches"
  );
  assertRange(
    inputs.keeleConstantHzDegM > 0,
    "keeleConstantHzDegM",
    inputs.keeleConstantHzDegM,
    "greater than 0 Hz*deg*m"
  );
  assertRange(
    inputs.firstExpansionWidthRatio > 0 &&
      inputs.firstExpansionWidthRatio < 1,
    "firstExpansionWidthRatio",
    inputs.firstExpansionWidthRatio,
    "greater than 0 and less than 1"
  );
  assertRange(
    inputs.tapDistanceFromThroatIn > 0,
    "tapDistanceFromThroatIn",
    inputs.tapDistanceFromThroatIn,
    "greater than 0 inches"
  );
  assertRange(
    inputs.boardThicknessIn > 0,
    "boardThicknessIn",
    inputs.boardThicknessIn,
    "greater than 0 inches"
  );

  const customC26 =
    hasOwn(overrides, "c26ThroatInputIn") &&
    inputs.c26ThroatInputIn !== DEFAULT_INPUTS.c26ThroatInputIn;
  if (
    customC26 &&
    overrides.c26Convention !== THROAT_CONVENTION.id
  ) {
    throw new SynergyCalcValidationError(
      "A non-default C26 value requires explicit acknowledgement of the workbook's ambiguous throat convention.",
      {
        key: "c26ThroatInputIn",
        value: inputs.c26ThroatInputIn,
        requiredConvention: THROAT_CONVENTION.id
      }
    );
  }

  return deepFreeze({
    ...inputs,
    c26ConventionAcknowledged:
      overrides.c26Convention === THROAT_CONVENTION.id
  });
}

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

function calculate(overrides = {}) {
  const inputs = validateInputs(overrides);

  const C23 = inputs.thetaWidthDeg;
  const C24 = inputs.thetaHeightDeg;
  const C25 = inputs.controlFrequencyHz;
  const C26 = inputs.c26ThroatInputIn;
  const C27 = inputs.keeleConstantHzDegM;
  const C28 = inputs.firstExpansionWidthRatio;
  const C29 = inputs.tapDistanceFromThroatIn;
  const C30 = inputs.boardThicknessIn;

  // Literal recovered workbook formulas. Parentheses are intentionally explicit.
  const C33 = Math.sqrt(Math.PI * (C26 / 2) ** 2) / INCHES_PER_METER;
  const C34 = C27 / (C23 * C25);
  const C35 = 10 ** (Math.log10(C25) - 0.176);
  const C36 = 180 - (90 - C23 / 2);
  const C37 = 180 - (90 - C24 / 2);
  const C38 = (0.5 * C27 * (C23 + C36)) / (C23 * C36 * C25);
  const C39 = C38 * C28;
  const C40 = (C38 - C39) / (2 * Math.tan(radians(C36 / 2)));
  const C41 = C29 / INCHES_PER_METER;
  const C42 = 2 * C41 * Math.tan(radians(C23 / 2)) + C33;
  const C43 = (C39 - C42) / (2 * Math.tan(radians(C23 / 2)));
  const C44 = 2 * C41 * Math.tan(radians(C24 / 2)) + C33;
  const C45 = 2 * C43 * Math.tan(radians(C24 / 2)) + C44;
  const C46 = 2 * C40 * Math.tan(radians(C37 / 2)) + C45;

  const S1 = (CENTIMETERS_PER_METER * C33) ** 2;
  const S2 =
    CENTIMETERS_PER_METER * C42 * (CENTIMETERS_PER_METER * C44);
  const S3 =
    CENTIMETERS_PER_METER * C39 * (CENTIMETERS_PER_METER * C45);
  const S4 =
    CENTIMETERS_PER_METER * C38 * (CENTIMETERS_PER_METER * C46);
  const Con12 = CENTIMETERS_PER_METER * C41;
  const Con23 = CENTIMETERS_PER_METER * C43;
  const Con34 = CENTIMETERS_PER_METER * C40;

  const C50 = C38 * INCHES_PER_METER;
  const C51 = C46 * INCHES_PER_METER;
  const C52 =
    ((Con12 + Con23 + Con34) / CENTIMETERS_PER_METER) *
    INCHES_PER_METER;

  const computedPositive = {
    C33,
    C34,
    C38,
    C39,
    C40,
    C41,
    C42,
    C43,
    C44,
    C45,
    C46,
    C50,
    C51,
    C52,
    S1,
    S2,
    S3,
    S4,
    Con12,
    Con23,
    Con34
  };
  for (const [cell, value] of Object.entries(computedPositive)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new SynergyCalcValidationError(
        `Workbook geometry is invalid: ${cell} must be finite and positive; computed ${value}.`,
        { cell, value }
      );
    }
  }

  const workbookCells = {
    C23,
    C24,
    C25,
    C26,
    C27,
    C28,
    C29,
    C30,
    C33,
    C34,
    C35,
    C36,
    C37,
    C38,
    C39,
    C40,
    C41,
    C42,
    C43,
    C44,
    C45,
    C46,
    C50,
    C51,
    C52
  };

  return deepFreeze({
    source: SOURCE,
    throatConvention: THROAT_CONVENTION,
    inputs,
    workbookCells,
    unitsByCell: CELL_UNITS,
    informational: {
      nominalPatternControlWidthM: C34,
      twoThirdsFrequencyHz: C35
    },
    anglesDeg: {
      primaryWidth: C23,
      primaryHeight: C24,
      secondaryWidth: C36,
      secondaryHeight: C37
    },
    geometryM: {
      throatEqualAreaSquareSide: C33,
      finalWidth: C38,
      firstExpansionWidth: C39,
      lengthThirdToFourth: C40,
      lengthThroatToTap: C41,
      tapWidth: C42,
      lengthTapToFirstExpansion: C43,
      tapHeight: C44,
      firstExpansionHeight: C45,
      finalHeight: C46
    },
    construction: {
      boardThicknessIn: C30,
      boardThicknessM: C30 / INCHES_PER_METER
    },
    envelope: {
      widthM: C38,
      heightM: C46,
      depthM: C41 + C43 + C40,
      widthIn: C50,
      heightIn: C51,
      depthIn: C52
    },
    hornresp: {
      S1Cm2: S1,
      S2Cm2: S2,
      S3Cm2: S3,
      S4Cm2: S4,
      Con12Cm: Con12,
      Con23Cm: Con23,
      Con34Cm: Con34
    }
  });
}

module.exports = Object.freeze({
  calculate,
  validateInputs,
  SynergyCalcValidationError,
  SOURCE,
  THROAT_CONVENTION,
  DEFAULT_INPUTS,
  INPUT_CELLS,
  CELL_UNITS,
  CELL_FORMULAS,
  HORNRESP_FORMULAS,
  constants: deepFreeze({
    inchesPerMeter: INCHES_PER_METER,
    centimetersPerMeter: CENTIMETERS_PER_METER
  })
});
