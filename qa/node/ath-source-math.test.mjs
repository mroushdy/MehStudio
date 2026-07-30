import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const applicationRoot = path.resolve(here, "../..");
const transferRoot = path.resolve(here, "../../../..");
const modulePath = path.join(applicationRoot, "ath-source-math.js");
const profileLawPath = path.join(applicationRoot, "profile-laws.js");
const math = require(modulePath);
const profileLaws = require(profileLawPath);
const deg = value => value * Math.PI / 180;

function close(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} vs ${expected} (tolerance ${tolerance})`
  );
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

test("source math is immutable, browser-safe, and pins every supplied source byte-for-byte", () => {
  assert.equal(math.API_VERSION, 1);
  assert.ok(Object.isFrozen(math));
  assert.ok(Object.isFrozen(math.SOURCE_PROVENANCE));
  assert.ok(Object.isFrozen(math.PARAMETER_CATALOG));
  assert.ok(Object.isFrozen(math.PUBLISHED_FIXTURES));
  assert.ok(Object.isFrozen(math.EQUATION_CATALOG));
  assert.ok(Object.isFrozen(math.SOURCE_LIMITATIONS));

  for (const source of Object.values(math.SOURCE_PROVENANCE)) {
    const sourcePath = path.resolve(transferRoot, source.file);
    assert.equal(fs.existsSync(sourcePath), true, `${source.file} is missing`);
    assert.equal(sha256(sourcePath), source.sha256, `${source.file} SHA-256`);
    assert.ok(Object.keys(source.locators).length > 0, `${source.id} has no locators`);
  }
  assert.equal(
    fs.existsSync(path.join(transferRoot, "research-sources/ATH/R-OSSE Waveguide rev7.pdf")),
    false,
    "the byte-identical R-OSSE source should remain deduplicated at research-sources root"
  );

  const source = fs.readFileSync(modulePath, "utf8");
  const browserContext = {};
  browserContext.globalThis = browserContext;
  vm.runInNewContext(source, browserContext, { filename: "ath-source-math.js" });
  assert.equal(typeof browserContext.MEHATHSourceMath.osseRadius, "function");
  assert.equal(browserContext.MEHATHSourceMath.API_VERSION, 1);
  assert.ok(Object.isFrozen(browserContext.MEHATHSourceMath.SOURCE_PROVENANCE));
});

test("published OS equations reproduce their limits and the PDF figure parameters", () => {
  const throatRadius = 0.0127;
  const nominalHalfAngle = deg(45);
  const throatHalfAngle = deg(15);
  const axial = 0.12;

  close(
    math.pureOSRadius({ throatRadius, nominalHalfAngle, axial }),
    0.12067017029904281,
    1e-16,
    "OS-SE PDF figure 1 pure OS"
  );
  close(
    math.shiftedOSRadius({
      throatRadius,
      nominalHalfAngle,
      throatHalfAngle,
      axial
    }),
    0.12400806078045919,
    1e-16,
    "OS-SE PDF figure 2 shifted OS"
  );
  close(
    math.generalizedOSRadius({
      throatRadius,
      nominalHalfAngle,
      throatHalfAngle,
      k: 1,
      axial
    }),
    math.shiftedOSRadius({
      throatRadius,
      nominalHalfAngle,
      throatHalfAngle,
      axial
    }),
    0,
    "k=1 shifted-OS invariant"
  );
  close(
    math.generalizedOSRadius({
      throatRadius,
      nominalHalfAngle,
      throatHalfAngle,
      k: 0,
      axial
    }),
    throatRadius + axial * Math.tan(nominalHalfAngle),
    0,
    "published k=0 conical limit"
  );
});

test("published superellipse and OS-SE termination equations preserve their endpoints", () => {
  const semiMajor = 0.12;
  const semiMinor = 0.096;
  const exponent = 5;
  for (const axial of [0, 0.03, 0.06, 0.09, 0.12]) {
    const offset = math.superellipseQuadrantOffset({
      axial,
      semiMajor,
      semiMinor,
      exponent
    });
    const complementaryRadius = semiMinor - offset;
    close(
      (axial / semiMajor) ** exponent +
        (complementaryRadius / semiMinor) ** exponent,
      1,
      2e-15,
      `translated quadrant implicit equation at ${axial}`
    );
  }
  close(
    math.superellipseQuadrantOffset({
      axial: 0,
      semiMajor,
      semiMinor,
      exponent
    }),
    0,
    0,
    "superellipse launch"
  );
  close(
    math.superellipseQuadrantOffset({
      axial: semiMajor,
      semiMajor,
      semiMinor,
      exponent
    }),
    semiMinor,
    0,
    "full quadrant endpoint"
  );

  const figure5 = {
    throatRadius: 0.0127,
    nominalHalfAngle: deg(45),
    throatHalfAngle: 0,
    k: 1,
    axialLength: 0.12,
    q: 0.998,
    aspectRatio: 0.8,
    exponent: 5
  };
  close(math.osseRadius({ ...figure5, axial: 0 }), figure5.throatRadius, 0, "OS-SE throat");
  close(
    math.osseRadius({ ...figure5, axial: figure5.axialLength }),
    0.178598300570165,
    1e-16,
    "OS-SE PDF figure 5 endpoint"
  );
  close(
    math.osseTerminationOffset({
      ...figure5,
      axial: figure5.axialLength
    }),
    0.057928130271122154,
    1e-16,
    "OS-SE PDF figure 5 termination endpoint"
  );

  /* q=1 is part of the published 0.99-1.00 range and is coordinate-finite.
     The production C2 profile contract separately refuses it because its
     endpoint derivative is singular. */
  close(
    math.osseTerminationOffset({
      axial: 0.12,
      axialLength: 0.12,
      aspectRatio: 0.8,
      exponent: 5,
      q: 1
    }),
    0.096,
    0,
    "published full-quadrant q=1 endpoint"
  );
});

test("published OS-SE morph preserves the fixed region and reaches the target mouth", () => {
  const common = {
    axialLength: 0.4,
    fixedAxial: 0.1,
    morphRate: 2,
    sourceMouthRadius: 0.2,
    targetMouthRadius: 0.3
  };
  close(
    math.morphRadius({ ...common, axial: 0.05, sourceRadius: 0.04 }),
    0.04,
    0,
    "fixed source region"
  );
  close(
    math.morphRadius({ ...common, axial: 0.1, sourceRadius: 0.06 }),
    0.06,
    0,
    "morph start continuity"
  );
  close(
    math.morphRadius({ ...common, axial: 0.4, sourceRadius: 0.2 }),
    0.3,
    0,
    "target mouth endpoint"
  );
  assert.throws(
    () => math.morphRadius({
      ...common,
      axial: 0.2,
      sourceRadius: 0.1,
      morphRate: 0.999
    }),
    error => error.code === "ATH_MORPH_RATE_INVALID"
  );
});

test("R-OSSE revision-7 ST260 fixture reproduces L, endpoints, rollback, and throat invariants", () => {
  const fixture = {
    outerRadius: 0.13,
    throatRadius: 0.0127,
    nominalHalfAngle: deg(39),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    apexRadiusFactor: 0.3,
    bending: 0.3,
    apexShift: 0.8,
    throatShape: 3.7
  };
  const constants = math.rosseConstants(fixture);
  close(constants.c1, 0.0005225795999999999, 1e-19, "ST260 c1");
  close(constants.c2, 0.006019152189695737, 1e-18, "ST260 c2");
  close(constants.c3, 0.6557501804175723, 1e-16, "ST260 c3");
  close(constants.nativeLength, 0.16623768892241927, 1e-16, "ST260 L");

  const expected = [
    [0, 0, 0.012699999999999998],
    [0.25, 0.03634663584334975, 0.03389424186636035],
    [0.5, 0.0653476884603021, 0.06840243852449396],
    [0.75, 0.07762067629474681, 0.1071679644052669],
    [1, 0.05746698478091665, 0.13]
  ];
  for (const [t, x, y] of expected) {
    const point = math.rossePoint({ ...fixture, t });
    close(point.x, x, 2e-16, `ST260 x(${t})`);
    close(point.y, y, 2e-16, `ST260 y(${t})`);
  }

  let apex = math.rossePoint({ ...fixture, t: 0 });
  for (let index = 1; index <= 10000; index += 1) {
    const point = math.rossePoint({ ...fixture, t: index / 10000 });
    if (point.x > apex.x) apex = point;
  }
  assert.ok(apex.x > 0.07769 && apex.x < 0.07771, `unexpected ST260 depth ${apex.x}`);
  assert.ok(apex.t > 0.733 && apex.t < 0.734, `unexpected ST260 apex t ${apex.t}`);
  assert.ok(
    math.rossePoint({ ...fixture, t: 1 }).x < apex.x,
    "the published native profile must retain its rollback"
  );

  const throat = math.rosseThroatInvariants(fixture);
  close(throat.dxdt, 0.1556531985497075, 2e-16, "ST260 throat dx/dt");
  close(throat.dydt, 0.02188560693979306, 2e-17, "ST260 throat dy/dt");
  close(throat.dydx, 0.14060492905838964, 2e-16, "ST260 throat dy/dx");
  assert.notEqual(throat.dydx, Math.tan(fixture.throatHalfAngle));
});

test("published AP1 meander and stated exponential-area construction preserve invariants", () => {
  assert.deepEqual(math.PUBLISHED_FIXTURES.espDemo.esp, {
    DtMm: 25.4,
    AtDeg: 0,
    AeDeg: 33,
    lengthMm: 75,
    inputVanePositions: [0.4, 0.76],
    skew: 0.65,
    cp1: [0, 0.4, 0.4],
    cp2: [0, 0.4, 0.4],
    minimumTipAngleDeg: 1,
    minimumWallThicknessMm: 0.5
  });
  const meander = {
    amplitude: 0.003,
    skew: 0.65,
    sharpness: 3
  };
  close(math.meanderValue({ ...meander, normalizedDistance: 0 }), 0, 0, "meander input");
  close(
    math.meanderValue({ ...meander, normalizedDistance: 1 }),
    0,
    1e-48,
    "meander output"
  );
  const peak = 2 ** (-1 / meander.skew);
  close(
    math.meanderValue({ ...meander, normalizedDistance: peak }),
    meander.amplitude,
    0,
    "meander peak"
  );

  close(
    math.exponentialAreaAt({
      normalizedDistance: 0,
      inputArea: 2,
      outputArea: 18
    }),
    2,
    0,
    "exponential area input"
  );
  close(
    math.exponentialAreaAt({
      normalizedDistance: 0.5,
      inputArea: 2,
      outputArea: 18
    }),
    6,
    1e-15,
    "exponential area geometric midpoint"
  );
  close(
    math.exponentialAreaAt({
      normalizedDistance: 1,
      inputArea: 2,
      outputArea: 18
    }),
    18,
    1e-14,
    "exponential area output"
  );
  assert.equal(
    math.EQUATION_CATALOG.espExponentialArea.kind,
    "standard-construction-derived-from-source-statement"
  );
});

test("published segmentizing equations preserve chord, peak, transform, and radius choices", () => {
  const sectorAngle = deg(60);
  const edgeRadius = 0.064;
  close(
    math.segmentChordRadius({ edgeRadius, sectorAngle, azimuth: 0 }),
    edgeRadius,
    0,
    "chord first edge"
  );
  close(
    math.segmentChordRadius({ edgeRadius, sectorAngle, azimuth: sectorAngle }),
    edgeRadius,
    0,
    "chord second edge"
  );
  close(
    math.segmentChordRadius({
      edgeRadius,
      sectorAngle,
      azimuth: sectorAngle / 2
    }),
    edgeRadius * Math.cos(sectorAngle / 2),
    1e-17,
    "chord midpoint"
  );

  const window = { t0: 0, t1: 0.8, skew: 0.75, sharpness: 4 };
  const peak = math.segmentWeightPeak(window);
  close(peak, 0.31748021039363994, 1e-16, "published segment peak");
  close(math.segmentWeight({ ...window, t: peak }), 1, 0, "segment unit peak");
  close(math.segmentWeight({ ...window, t: 0 }), 0, 0, "segment window start");
  close(math.segmentWeight({ ...window, t: 0.8 }), 0, 0, "segment window end");
  close(math.segmentWeight({ ...window, t: 0.9 }), 0, 0, "outside segment window");

  const referenceRadius = 0.064;
  const centerPreserving = math.segmentReferenceRadius({
    referenceRadius,
    sectorAngle,
    mode: "center-preserving"
  });
  close(
    math.segmentChordRadius({
      edgeRadius: centerPreserving,
      sectorAngle,
      azimuth: sectorAngle / 2
    }),
    referenceRadius,
    1e-17,
    "center-preserving chord"
  );
  const geometricMean = math.segmentReferenceRadius({
    referenceRadius,
    sectorAngle,
    mode: "geometric-mean"
  });
  close(
    geometricMean ** 2,
    referenceRadius * centerPreserving,
    1e-18,
    "published geometric-mean rS"
  );

  const targetRadius = 0.055;
  close(
    math.segmentizedRadius({
      baseRadius: referenceRadius,
      referenceRadius,
      targetRadius,
      weight: 1
    }),
    targetRadius,
    0,
    "exact target at tm"
  );
  close(
    math.segmentizedRadius({
      baseRadius: 0.02,
      referenceRadius,
      targetRadius,
      weight: 0
    }),
    0.02,
    0,
    "unchanged throat/mouth"
  );

  close(
    math.segmentAlternativeTarget({
      edgeRadius,
      amplitude: -0.02,
      sectorAngle,
      azimuth: sectorAngle / 2,
      skew: 1,
      sharpness: 1
    }),
    0.044,
    1e-17,
    "HTML figure 7 alternative target midpoint"
  );
  assert.ok(
    math.SOURCE_LIMITATIONS.some(item =>
      item.sourceId === "athSegmentizing2024" &&
      item.statement.includes("contradicts")
    ),
    "the source's t0/tm discrepancy must remain explicit"
  );
  assert.equal(
    math.PUBLISHED_FIXTURES.segmentizingExample.figure4.status,
    "publication-conflict-preserved"
  );
});

test("source layer and production profile laws agree wherever production claims the source equation", () => {
  const osse = profileLaws.solveProfileLaw({
    family: "osse",
    throatRadius: 0.0127,
    nominalHalfAngle: deg(45),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    s: 0.8,
    terminationExponent: 5,
    q: 0.998,
    axialLength: 0.12,
    samples: 129
  });
  assert.equal(osse.ok, true, osse.errors?.join("; "));
  for (const u of [0, 0.125, 0.5, 0.875, 1]) {
    const point = profileLaws.evaluateProfileAt(osse, u);
    close(
      point.r,
      math.osseRadius({
        throatRadius: osse.inputs.throatRadius,
        nominalHalfAngle: osse.inputs.nominalHalfAngle,
        throatHalfAngle: osse.inputs.throatHalfAngle,
        k: osse.inputs.k,
        aspectRatio: osse.inputs.s,
        exponent: osse.inputs.terminationExponent,
        q: osse.inputs.q,
        axialLength: osse.extent.axialLength,
        axial: point.x
      }),
      2e-16,
      `production/source OS-SE parity at ${u}`
    );
  }

  const rosse = profileLaws.solveProfileLaw({
    family: "rosse",
    throatRadius: 0.0127,
    mouthRadius: 0.13,
    nominalHalfAngle: deg(39),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    apexRadiusFactor: 0.3,
    bending: 0.3,
    apexShift: 0.8,
    throatShape: 3.7,
    samples: 129
  });
  assert.equal(rosse.ok, true, rosse.errors?.join("; "));
  for (const u of [0, 0.125, 0.5, 0.875, 1]) {
    const point = profileLaws.evaluateProfileAt(rosse, u);
    const published = math.rossePoint({
      outerRadius: rosse.inputs.nativeOuterRadius,
      throatRadius: rosse.inputs.throatRadius,
      nominalHalfAngle: rosse.inputs.nominalHalfAngle,
      throatHalfAngle: rosse.inputs.throatHalfAngle,
      k: rosse.inputs.k,
      apexRadiusFactor: rosse.inputs.apexRadiusFactor,
      bending: rosse.inputs.bending,
      apexShift: rosse.inputs.apexShift,
      throatShape: rosse.inputs.throatShape,
      t: rosse.inputs.monotoneParameterEnd * u
    });
    close(point.x, published.x, 2e-16, `production/source R-OSSE x parity at ${u}`);
    close(point.r, published.y, 2e-16, `production/source R-OSSE r parity at ${u}`);
  }
});

test("invalid source domains fail closed without clamping or fallback", () => {
  assert.throws(
    () => math.osseTerminationOffset({
      axial: 1,
      axialLength: 1,
      aspectRatio: 1,
      exponent: 4,
      q: 1.001
    }),
    error => error.code === "ATH_OSSE_Q_INVALID"
  );
  assert.throws(
    () => math.superellipseQuadrantOffset({
      axial: 1.01,
      semiMajor: 1,
      semiMinor: 1,
      exponent: 4
    }),
    error => error.code === "ATH_SUPERELLIPSE_AXIAL_OUT_OF_DOMAIN"
  );
  assert.throws(
    () => math.rosseConstants({
      outerRadius: 0.0127,
      throatRadius: 0.0127,
      nominalHalfAngle: deg(39),
      throatHalfAngle: deg(7.5),
      k: 1.8
    }),
    error => error.code === "ATH_ROSSE_RADIUS_ORDER_INVALID"
  );
  assert.throws(
    () => math.segmentChordRadius({
      edgeRadius: 1,
      sectorAngle: Math.PI,
      azimuth: Math.PI / 2
    }),
    error => error.code === "ATH_SEGMENT_ANGLE_INVALID"
  );
  assert.throws(
    () => math.segmentWeight({
      t: 0.5,
      t0: 0.8,
      t1: 0.8,
      skew: 0.75,
      sharpness: 4
    }),
    error => error.code === "ATH_SEGMENT_WINDOW_INVALID"
  );
  assert.throws(
    () => math.segmentAlternativeTarget({
      edgeRadius: 0.01,
      amplitude: -0.02,
      sectorAngle: deg(60),
      azimuth: deg(30),
      skew: 1,
      sharpness: 1
    }),
    error => error.code === "ATH_SEGMENT_TARGET_INVALID"
  );
});
