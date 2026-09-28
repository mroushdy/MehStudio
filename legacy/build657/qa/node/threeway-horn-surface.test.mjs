import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.resolve(here, "../../threeway-horn-surface.js");
const profilePath = path.resolve(here, "../../profile-laws.js");
const surface = require(modulePath);
const profileLaws = require(profilePath);
const deg = value => value * Math.PI / 180;

function close(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} vs ${expected} (tolerance ${tolerance})`
  );
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function circularRequestFor(config, requestedFamily = config.family) {
  const witness = profileLaws.solveProfileLaw({
    ...config,
    samples: 65
  });
  assert.equal(witness.ok, true, witness.errors?.join("; "));
  const parameters = {};
  for (const [key, value] of Object.entries(config)) {
    if (![
      "family",
      "throatRadius",
      "mouthRadius",
      "axialLength",
      "samples"
    ].includes(key)) {
      parameters[key] = value;
    }
  }
  return {
    witness,
    input: {
      schemaVersion: 2,
      throat: {
        widthM: 2 * witness.endpoints.throat.r,
        heightM: 2 * witness.endpoints.throat.r
      },
      mouth: {
        widthM: 2 * witness.endpoints.mouth.r,
        heightM: 2 * witness.endpoints.mouth.r
      },
      depthM: witness.extent.axialLength,
      coverageDeg: { horizontal: 90, vertical: 60 },
      surfaceLaw: {
        family: requestedFamily,
        parameters
      },
      crossSection: {
        family: "ellipse",
        parameters: {}
      },
      azimuthRad: 0,
      sampling: {
        axialStationCount: 65,
        perimeterSampleCount: 512
      },
      provenanceRefs: ["test-profile-witness"]
    }
  };
}

function vector(record) {
  return [record.x, record.y, record.z];
}

function dot(left, right) {
  return left[0] * right[0] +
    left[1] * right[1] +
    left[2] * right[2];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0]
  ];
}

function length(value) {
  return Math.hypot(...value);
}

test("module is pure, browser-safe, immutable, and depends only on profile-laws", () => {
  assert.equal(surface.API_VERSION, 1);
  assert.equal(surface.SCHEMA_VERSION, 2);
  assert.equal(surface.CAPABILITIES.hornSurfaceAnalysis, true);
  assert.equal(surface.CAPABILITIES.driverCountInference, false);
  assert.equal(surface.CAPABILITIES.entryStationInference, false);
  assert.equal(surface.CAPABILITIES.coverageClaim, false);
  assert.equal(surface.CAPABILITIES.hardwareValidated, false);
  assert.equal(surface.CAPABILITIES.manufacturing, false);
  assert.equal(surface.CROSS_SECTION_SCHEMAS.roundedRectangle.supported, false);
  assert.ok(Object.isFrozen(surface));
  assert.ok(Object.isFrozen(surface.CAPABILITIES));

  const source = fs.readFileSync(modulePath, "utf8");
  const requires = [...source.matchAll(
    /require\(\s*["']([^"']+)["']\s*\)/g
  )].map(match => match[1]);
  assert.deepEqual(requires, ["./profile-laws.js"]);
  assert.doesNotMatch(source, /require\([^)]*(engine|shell|three|solid)/i);
  assert.doesNotMatch(source, /\bdocument\b|\bwindow\b|THREE\./);

  const browserContext = { MEHProfileLaws: profileLaws };
  browserContext.globalThis = browserContext;
  vm.runInNewContext(source, browserContext, {
    filename: "threeway-horn-surface.js"
  });
  assert.equal(
    typeof browserContext.MEH3HornSurface.solveHornSurface,
    "function"
  );
  assert.equal(browserContext.MEH3HornSurface.CAPABILITIES.manufacturing, false);

  const { input } = circularRequestFor({
    family: "conical",
    throatRadius: 0.02,
    mouthRadius: 0.12,
    nominalHalfAngle: deg(30)
  });
  const frozenInput = deepFreeze(structuredClone(input));
  const result = surface.solveHornSurface(frozenInput);
  assert.equal(result.ok, true, result.diagnostics[0]?.message);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.stations));
  assert.ok(Object.isFrozen(result.stations[0]));
  assert.ok(Object.isFrozen(result.stations[0].section));
  assert.ok(Object.isFrozen(result.stations[0].localFrame));
  assert.equal(result.hardwareValidated, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.provenance.crossSection.hardwareValidated, false);
  assert.equal(result.provenance.crossSection.manufacturing, false);
});

test("all four admitted profile families preserve exact endpoints and remain distinct", () => {
  const fixtures = [
    circularRequestFor({
      family: "conical",
      throatRadius: 0.01778,
      mouthRadius: 0.15,
      nominalHalfAngle: deg(45)
    }, "cone"),
    circularRequestFor({
      family: "classicOS",
      throatRadius: 0.01778,
      mouthRadius: 0.15,
      nominalHalfAngle: deg(45)
    }, "classic-os"),
    circularRequestFor({
      family: "osse",
      throatRadius: 0.01778,
      mouthRadius: 0.15,
      nominalHalfAngle: deg(45),
      throatHalfAngle: deg(7.5),
      k: 1.8,
      s: 0.7,
      terminationExponent: 4,
      q: 0.995
    }, "os-se"),
    circularRequestFor({
      family: "rosse",
      throatRadius: 0.01778,
      mouthRadius: 0.15,
      nominalHalfAngle: deg(45),
      throatHalfAngle: deg(7.5),
      k: 1.8,
      apexRadiusFactor: 0.3,
      bending: 0.34,
      apexShift: 0.53,
      throatShape: 3.7
    }, "r-osse")
  ];

  const results = fixtures.map(({ input }) => surface.solveHornSurface(input));
  const expectedFamilies = ["conical", "classicOS", "osse", "rosse"];
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const { input, witness } = fixtures[index];
    assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
    assert.equal(result.profile.family, expectedFamilies[index]);
    assert.equal(result.profile.provider, "profile-laws.js");
    assert.equal(result.profile.source, witness.source);
    const canonicalThroatRadius = Math.sqrt(
      Math.PI * input.throat.widthM * input.throat.heightM / 4 / Math.PI
    );
    const canonicalMouthRadius = Math.sqrt(
      Math.PI * input.mouth.widthM * input.mouth.heightM / 4 / Math.PI
    );
    const canonicalWitness = profileLaws.solveProfileLaw({
      family: input.surfaceLaw.family,
      ...input.surfaceLaw.parameters,
      throatRadius: canonicalThroatRadius,
      mouthRadius: canonicalMouthRadius,
      axialLength: input.depthM,
      samples: input.sampling.axialStationCount
    });
    assert.equal(canonicalWitness.ok, true);
    assert.equal(result.profile.profileHash, canonicalWitness.profileHash);
    assert.equal(result.stations.length, 65);
    close(result.endpoints.throat.axialM, 0, 0, "throat axial endpoint");
    close(
      result.endpoints.mouth.axialM,
      input.depthM,
      2e-13,
      "mouth axial endpoint"
    );
    close(
      result.endpoints.throat.section.widthM,
      input.throat.widthM,
      2e-14,
      "throat width"
    );
    close(
      result.endpoints.throat.section.heightM,
      input.throat.heightM,
      2e-14,
      "throat height"
    );
    close(
      result.endpoints.mouth.section.widthM,
      input.mouth.widthM,
      2e-13,
      "mouth width"
    );
    close(
      result.endpoints.mouth.section.heightM,
      input.mouth.heightM,
      2e-13,
      "mouth height"
    );
    close(
      result.endpoints.throat.localEquivalentRadiusM,
      witness.endpoints.throat.r,
      2e-15,
      "throat equivalent radius"
    );
    close(
      result.endpoints.mouth.localEquivalentRadiusM,
      witness.endpoints.mouth.r,
      2e-13,
      "mouth equivalent radius"
    );
    assert.equal(result.coverage.claim, false);
    assert.equal(result.coverage.derivedFromGeometry, false);
    assert.deepEqual(
      result.coverage.declaredDeg,
      input.coverageDeg
    );
  }

  assert.equal(
    new Set(results.map(result => result.profile.profileHash)).size,
    4
  );
  const normalizedMidpointWitnesses = results.map(result => {
    const throat = result.endpoints.throat.localEquivalentRadiusM;
    const mouth = result.endpoints.mouth.localEquivalentRadiusM;
    const midpoint = result.stations[32].localEquivalentRadiusM;
    return ((midpoint - throat) / (mouth - throat)).toFixed(10);
  });
  assert.equal(new Set(normalizedMidpointWitnesses).size, 4);
});

test("ellipse endpoints, perimeter, declared wall point, and local frame are canonical", () => {
  const { input } = circularRequestFor({
    family: "conical",
    throatRadius: 0.02,
    mouthRadius: 0.12,
    nominalHalfAngle: deg(30)
  });
  input.azimuthRad = Math.PI / 3;
  const result = surface.solveHornSurface(input);
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);

  const throat = result.endpoints.throat;
  close(
    throat.sectionAreaM2,
    Math.PI * 0.02 ** 2,
    2e-18,
    "ellipse throat area"
  );
  close(
    throat.sectionPerimeterM,
    2 * Math.PI * 0.02,
    1e-10,
    "sampled circle perimeter"
  );
  close(throat.wallPointM.xM, 0, 0, "wall point x");
  close(
    throat.wallPointM.yM,
    0.02 * Math.cos(Math.PI / 3),
    2e-15,
    "wall point y"
  );
  close(
    throat.wallPointM.zM,
    0.02 * Math.sin(Math.PI / 3),
    2e-15,
    "wall point z"
  );

  const axial = vector(throat.localFrame.axialTangent);
  const section = vector(throat.localFrame.crossTangent);
  const normal = vector(throat.localFrame.normal);
  close(length(axial), 1, 2e-15, "unit axial tangent");
  close(length(section), 1, 2e-15, "unit cross tangent");
  close(length(normal), 1, 2e-15, "unit normal");
  close(dot(axial, section), 0, 2e-15, "axial/cross orthogonal");
  close(dot(axial, normal), 0, 2e-15, "axial/normal orthogonal");
  close(dot(section, normal), 0, 2e-15, "cross/normal orthogonal");
  const handed = cross(section, axial);
  close(handed[0], normal[0], 2e-15, "frame handedness x");
  close(handed[1], normal[1], 2e-15, "frame handedness y");
  close(handed[2], normal[2], 2e-15, "frame handedness z");
  assert.ok(
    dot(normal, [0, throat.wallPointM.yM, throat.wallPointM.zM]) > 0
  );
});

test("Lamé exponent 6 preserves equivalent area while explicitly stretching axes", () => {
  const exponent = 6;
  const areaCoefficient = 3.855242593320003;
  const throatRadiusM = 0.015;
  const mouthRadiusM = 0.14;
  const throatAspect = 1.2;
  const mouthAspect = 1.8;
  const dimensions = (radiusM, aspect) => ({
    widthM: 2 * radiusM * Math.sqrt(Math.PI * aspect / areaCoefficient),
    heightM: 2 * radiusM * Math.sqrt(
      Math.PI / (areaCoefficient * aspect)
    )
  });
  const depthM = 0.25;
  const input = {
    schemaVersion: 2,
    throat: dimensions(throatRadiusM, throatAspect),
    mouth: dimensions(mouthRadiusM, mouthAspect),
    depthM,
    coverageDeg: { horizontal: 100, vertical: 50 },
    surfaceLaw: {
      family: "conical",
      parameters: {
        nominalHalfAngle: Math.atan(
          (mouthRadiusM - throatRadiusM) / depthM
        )
      }
    },
    crossSection: {
      family: "superellipse",
      parameters: { exponent }
    },
    azimuthRad: 0.37,
    sampling: {
      axialStationCount: 65,
      perimeterSampleCount: 1024
    },
    provenanceRefs: ["lame-area-fixture"]
  };
  const result = surface.solveHornSurface(input);
  assert.equal(result.ok, true, result.diagnostics?.[0]?.message);
  close(
    result.crossSection.areaCoefficient,
    areaCoefficient,
    2e-14,
    "Lamé area coefficient"
  );
  close(
    result.endpoints.throat.section.widthM,
    input.throat.widthM,
    2e-14,
    "Lamé throat width"
  );
  close(
    result.endpoints.throat.section.heightM,
    input.throat.heightM,
    2e-14,
    "Lamé throat height"
  );
  close(
    result.endpoints.mouth.section.widthM,
    input.mouth.widthM,
    2e-13,
    "Lamé mouth width"
  );
  close(
    result.endpoints.mouth.section.heightM,
    input.mouth.heightM,
    2e-13,
    "Lamé mouth height"
  );
  close(
    result.endpoints.throat.sectionAreaM2,
    Math.PI * throatRadiusM ** 2,
    2e-18,
    "Lamé throat equivalent area"
  );
  close(
    result.endpoints.mouth.sectionAreaM2,
    Math.PI * mouthRadiusM ** 2,
    2e-16,
    "Lamé mouth equivalent area"
  );

  for (const station of result.stations) {
    assert.ok(Number.isFinite(station.sectionPerimeterM));
    assert.ok(station.sectionPerimeterM > 0);
    assert.ok(station.sectionPerimeterErrorEstimateM >= 0);
    close(
      station.sectionAreaM2,
      areaCoefficient *
        station.section.semiWidthM *
        station.section.semiHeightM,
      2e-15,
      `Lamé station ${station.index} area`
    );
  }
  const midpoint = result.stations[32];
  const normalizedBoundary =
    Math.abs(midpoint.wallPointM.yM / midpoint.section.semiWidthM) **
      exponent +
    Math.abs(midpoint.wallPointM.zM / midpoint.section.semiHeightM) **
      exponent;
  close(normalizedBoundary, 1, 3e-14, "Lamé wall point equation");
  close(
    Math.atan2(midpoint.wallPointM.zM, midpoint.wallPointM.yM),
    input.azimuthRad,
    2e-15,
    "declared polar azimuth"
  );
  assert.equal(result.sectionMapping.kind, "cross-section-mapping");
  assert.equal(result.sectionMapping.coverageClaim, false);
  assert.match(result.sectionMapping.note, /not a rectangular coverage claim/i);
  assert.equal(result.coverage.claim, false);
  assert.deepEqual(result.coverage.declaredDeg, input.coverageDeg);
  assert.equal(
    result.diagnostics.some(diagnostic =>
      diagnostic.code === "THREEWAY_SECTION_MAPPING_NOT_COVERAGE"
    ),
    true
  );
});

test("rounded rectangle and unsupported profiles refuse with stable diagnostics", () => {
  const fixture = circularRequestFor({
    family: "conical",
    throatRadius: 0.02,
    mouthRadius: 0.12,
    nominalHalfAngle: deg(30)
  });
  const rounded = structuredClone(fixture.input);
  rounded.crossSection = {
    family: "roundedRectangle",
    parameters: {}
  };
  const roundedResult = surface.solveHornSurface(rounded);
  assert.equal(roundedResult.ok, false);
  assert.equal(
    roundedResult.code,
    "THREEWAY_HORN_CROSS_SECTION_UNSUPPORTED"
  );
  assert.match(roundedResult.diagnostics[0].message, /no reusable.*exact/i);
  assert.equal(roundedResult.hardwareValidated, false);
  assert.equal(roundedResult.manufacturing, false);
  assert.ok(Object.isFrozen(roundedResult));

  const unknownProfile = structuredClone(fixture.input);
  unknownProfile.surfaceLaw.family = "mystery-smooth";
  const unknownResult = surface.solveHornSurface(unknownProfile);
  assert.equal(unknownResult.ok, false);
  assert.equal(unknownResult.code, "THREEWAY_HORN_PROFILE_REFUSED");
  assert.equal(
    unknownResult.diagnostics[0].causeCode,
    "PROFILE_LAW_UNSUPPORTED"
  );
  assert.equal(unknownResult.capabilities.hornSurfaceAnalysis, false);
});

test("missing intent, topology leakage, and inconsistent R-OSSE depth fail closed", () => {
  const fixture = circularRequestFor({
    family: "rosse",
    throatRadius: 0.01778,
    mouthRadius: 0.15,
    nominalHalfAngle: deg(45),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    apexRadiusFactor: 0.3,
    bending: 0.34,
    apexShift: 0.53,
    throatShape: 3.7
  }, "r-osse");

  const missingCoverage = structuredClone(fixture.input);
  delete missingCoverage.coverageDeg;
  const missingResult = surface.solveHornSurface(missingCoverage);
  assert.equal(missingResult.ok, false);
  assert.equal(missingResult.code, "THREEWAY_HORN_INPUT_INVALID");
  assert.equal(
    missingResult.diagnostics.some(diagnostic =>
      diagnostic.paths.includes("coverageDeg")
    ),
    true
  );

  const topologyLeak = structuredClone(fixture.input);
  topologyLeak.sources = [{ count: 99 }];
  topologyLeak.entryStations = [{ axial: { mode: "solve" } }];
  topologyLeak.driverCount = 99;
  const topologyResult = surface.solveHornSurface(topologyLeak);
  assert.equal(topologyResult.ok, false);
  assert.equal(topologyResult.code, "THREEWAY_HORN_INPUT_INVALID");
  const paths = topologyResult.diagnostics.flatMap(
    diagnostic => diagnostic.paths
  );
  assert.equal(paths.includes("sources"), true);
  assert.equal(paths.includes("entryStations"), true);
  assert.equal(paths.includes("driverCount"), true);
  assert.equal(topologyResult.capabilities.driverCountInference, false);
  assert.equal(topologyResult.capabilities.entryStationInference, false);

  const inconsistent = structuredClone(fixture.input);
  inconsistent.depthM *= 1.05;
  const inconsistentResult = surface.solveHornSurface(inconsistent);
  assert.equal(inconsistentResult.ok, false);
  assert.equal(inconsistentResult.code, "THREEWAY_HORN_PROFILE_REFUSED");
  assert.equal(
    inconsistentResult.diagnostics[0].causeCode,
    "PROFILE_EXTENT_INVALID"
  );
});

test("surface records are deterministic and axis/area monotonicity is enforced", () => {
  const fixture = circularRequestFor({
    family: "osse",
    throatRadius: 0.01778,
    mouthRadius: 0.15,
    nominalHalfAngle: deg(45),
    throatHalfAngle: deg(7.5),
    k: 1.8,
    s: 0.7,
    terminationExponent: 4,
    q: 0.995
  }, "os-se");
  const first = surface.solveHornSurface(fixture.input);
  const second = surface.solveHornSurface(structuredClone(fixture.input));
  assert.equal(first.ok, true);
  assert.deepEqual(second, first);
  assert.match(first.surfaceHash, /^hs1-[0-9a-f]{8}$/);

  for (let index = 1; index < first.stations.length; index++) {
    const previous = first.stations[index - 1];
    const current = first.stations[index];
    assert.ok(current.axialM > previous.axialM);
    assert.ok(current.sectionAreaM2 >= previous.sectionAreaM2);
    assert.ok(current.section.widthM >= previous.section.widthM);
    assert.ok(current.section.heightM >= previous.section.heightM);
  }

  const shrinkingAxis = structuredClone(fixture.input);
  shrinkingAxis.mouth.heightM = shrinkingAxis.throat.heightM * 0.9;
  const refused = surface.solveHornSurface(shrinkingAxis);
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "THREEWAY_HORN_SECTION_NONMONOTONIC");
});
