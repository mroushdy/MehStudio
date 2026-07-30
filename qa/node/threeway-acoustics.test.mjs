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
const modulePath = path.join(appRoot, "threeway-acoustics.js");
const source = fs.readFileSync(modulePath, "utf8");
const acoustics = require(modulePath);

const close = (actual, expected, tolerance = 1e-12) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, received ${actual}`,
  );
};

function stationFixture() {
  const entryStation = {
    id: "station-mid",
    role: "wall-entry",
    sourceIds: ["source-mid"],
    bandIds: ["mid"],
    order: 1,
    apertures: { countPerSource: 2 },
    provenanceRefs: ["prov-station"],
  };
  return {
    state: {
      schemaVersion: 2,
      designId: "analytic-station-fixture",
      revision: 7,
      horn: {
        mouth: { widthM: 0.8, heightM: 0.6 },
      },
      sources: [
        {
          id: "source-mid",
          count: 2,
          bandIds: ["mid"],
        },
      ],
      entryStations: [structuredClone(entryStation)],
    },
    entryStation,
    hornQuery: {
      queryId: "horn-query-mid-001",
      stationId: "station-mid",
      axialCoordinateM: 0.14,
      localHornAreaM2: 0.02,
      surfaceRevision: "surface-law-hash-001",
      provenance: { classification: "calculated-adaptation" },
    },
    acousticInputs: {
      bandId: "mid",
      frequencyHz: 1000,
      speedOfSoundMps: 343,
      effectiveReflectionPathM: 0.1,
      quarterWaveBoundRole: acoustics.quarterWaveBoundRole,
      summedApertureAreaM2: 0.002,
      paths: [
        {
          id: "mid-path-b",
          pathToDatumM: 0.302,
          sourceId: "source-mid",
        },
        {
          id: "mid-path-a",
          pathToDatumM: 0.3,
          sourceId: "source-mid",
        },
      ],
      referencePathToDatumM: 0.301,
      maximumAllowedSpreadM: 0.003,
      axialBounds: [
        {
          id: "aperture-footprint-min",
          minimumM: 0.08,
          reason: "explicit aperture footprint lower limit",
          evidenceRefs: ["fixture-aperture"],
        },
        {
          id: "reflection-max",
          maximumM: 0.18,
          reason: "explicit reflection-bound upper limit",
          evidenceRefs: ["fixture-reflection"],
        },
        {
          id: "package-window",
          minimumM: 0.1,
          maximumM: 0.16,
          reason: "explicit package interval",
          evidenceRefs: ["fixture-package"],
        },
      ],
      passage: {
        densityKgM3: 1.2,
        effectiveLengthM: 0.1,
        effectiveAreaM2: 0.001,
        chamberVolumeM3: 0.001,
        effectiveNeckAreaM2: 0.001,
        effectiveNeckLengthM: 0.1,
        helmholtzModelAssumption: acoustics.helmholtzAssumption,
        quarterWaveBoundaryAssumption:
          acoustics.quarterWaveBoundaryAssumption,
        halfWaveBoundaryAssumption: "both-ends-open",
        provenance: { classification: "calculated-adaptation" },
      },
      provenance: {
        classification: "calculated-adaptation",
        evidenceRefs: ["analytic-fixture"],
      },
    },
  };
}

test("metadata makes the experimental, unavailable, and manufacturing boundaries explicit", () => {
  assert.equal(acoustics.version, 1);
  assert.equal(acoustics.modelMetadata.hardwareValidated, false);
  assert.equal(acoustics.modelMetadata.manufacturing, false);
  assert.equal(acoustics.capabilities.automaticStationSelection, false);
  assert.equal(acoustics.capabilities.countInference, false);
  assert.equal(acoustics.capabilities.spacingInference, false);
  assert.equal(acoustics.capabilities.mouthInference, false);
  assert.equal(acoustics.capabilities.hornSegmentAbcdProvider, false);
  assert.equal(acoustics.capabilities.mouthRadiationLoadProvider, false);
  assert.ok(Object.isFrozen(acoustics));
  assert.ok(Object.isFrozen(acoustics.equations.helmholtzEstimate));
  assert.match(
    acoustics.equations.quarterWaveReflectionBound.status,
    /heuristic-bound/,
  );
});

test("wavelength and signed path phase match analytic fixtures and require explicit sound speed", () => {
  const wavelength = acoustics.wavelength({
    frequencyHz: 343,
    speedOfSoundMps: 343,
  });
  assert.equal(wavelength.ok, true);
  assert.equal(wavelength.wavelengthM, 1);

  const phase = acoustics.pathPhase({
    frequencyHz: 343,
    deltaPathM: 0.25,
    speedOfSoundMps: 343,
  });
  assert.equal(phase.phaseDeg, 90);
  assert.equal(phase.phaseCycles, 0.25);
  assert.equal(
    acoustics.pathPhase({
      frequencyHz: 343,
      deltaPathM: -0.25,
      speedOfSoundMps: 343,
    }).phaseDeg,
    -90,
  );

  const refused = acoustics.wavelength({ frequencyHz: 343 });
  assert.equal(refused.ok, false);
  assert.equal(refused.code, acoustics.failureCodes.INPUT_REQUIRED);
  assert.ok(refused.paths.includes("input.speedOfSoundMps"));
});

test("quarter-wave relation is an estimated bound, never an automatic equality", () => {
  const shortPath = acoustics.quarterWaveReflectionBound({
    effectiveReflectionPathM: 0.25,
    speedOfSoundMps: 343,
    boundRole: acoustics.quarterWaveBoundRole,
  });
  const longPath = acoustics.quarterWaveReflectionBound({
    effectiveReflectionPathM: 0.5,
    speedOfSoundMps: 343,
    boundRole: acoustics.quarterWaveBoundRole,
  });
  assert.equal(shortPath.ok, true);
  assert.equal(shortPath.estimatedFirstCancellationHz, 343);
  assert.equal(shortPath.bound.automaticEquality, false);
  assert.equal(shortPath.bound.automaticStationSelection, false);
  assert.equal(shortPath.bound.hardBound, false);
  assert.ok(
    longPath.estimatedFirstCancellationHz <
      shortPath.estimatedFirstCancellationHz,
    "a longer effective reflection path must lower the estimate",
  );

  const noRole = acoustics.quarterWaveReflectionBound({
    effectiveReflectionPathM: 0.25,
    speedOfSoundMps: 343,
  });
  assert.equal(noRole.code, acoustics.failureCodes.INPUT_REQUIRED);
});

test("local aperture ratio uses only explicit local area and has the expected monotonic effects", () => {
  const base = acoustics.apertureToHornAreaRatio({
    summedApertureAreaM2: 0.01,
    localHornAreaM2: 0.02,
  });
  assert.equal(base.apertureToLocalHornAreaRatio, 0.5);
  assert.equal(base.percentOfLocalHornArea, 50);

  const moreAperture = acoustics.apertureToHornAreaRatio({
    summedApertureAreaM2: 0.015,
    localHornAreaM2: 0.02,
  });
  const moreHorn = acoustics.apertureToHornAreaRatio({
    summedApertureAreaM2: 0.01,
    localHornAreaM2: 0.04,
  });
  assert.ok(
    moreAperture.apertureToLocalHornAreaRatio >
      base.apertureToLocalHornAreaRatio,
  );
  assert.ok(
    moreHorn.apertureToLocalHornAreaRatio <
      base.apertureToLocalHornAreaRatio,
  );
});

test("passage inertance is dimensionally analytic and monotone in length and area", () => {
  const base = acoustics.passageInertance({
    densityKgM3: 1.2,
    effectiveLengthM: 0.1,
    effectiveAreaM2: 0.01,
  });
  assert.equal(base.ok, true);
  close(base.acousticInertancePaS2M3, 12);

  const longer = acoustics.passageInertance({
    densityKgM3: 1.2,
    effectiveLengthM: 0.2,
    effectiveAreaM2: 0.01,
  });
  const wider = acoustics.passageInertance({
    densityKgM3: 1.2,
    effectiveLengthM: 0.1,
    effectiveAreaM2: 0.02,
  });
  assert.ok(
    longer.acousticInertancePaS2M3 >
      base.acousticInertancePaS2M3,
  );
  assert.ok(
    wider.acousticInertancePaS2M3 <
      base.acousticInertancePaS2M3,
  );
});

test("ideal Helmholtz estimate requires its limitations and proves area/volume/length monotonicity", () => {
  const fixture = {
    speedOfSoundMps: 343,
    chamberVolumeM3: 0.001,
    effectiveNeckAreaM2: 0.001,
    effectiveNeckLengthM: 0.1,
    modelAssumption: acoustics.helmholtzAssumption,
  };
  const base = acoustics.helmholtzEstimate(fixture);
  assert.equal(base.ok, true);
  close(
    base.estimatedHelmholtzHz,
    343 / (2 * Math.PI) * Math.sqrt(10),
  );
  assert.equal(base.replacementForCoupledBranchModel, false);
  assert.ok(base.limitations.includes("no end correction"));

  const wider = acoustics.helmholtzEstimate({
    ...fixture,
    effectiveNeckAreaM2: 0.002,
  });
  const largerVolume = acoustics.helmholtzEstimate({
    ...fixture,
    chamberVolumeM3: 0.002,
  });
  const longer = acoustics.helmholtzEstimate({
    ...fixture,
    effectiveNeckLengthM: 0.2,
  });
  assert.ok(wider.estimatedHelmholtzHz > base.estimatedHelmholtzHz);
  assert.ok(
    largerVolume.estimatedHelmholtzHz < base.estimatedHelmholtzHz,
  );
  assert.ok(longer.estimatedHelmholtzHz < base.estimatedHelmholtzHz);

  const unstated = structuredClone(fixture);
  delete unstated.modelAssumption;
  assert.equal(
    acoustics.helmholtzEstimate(unstated).code,
    acoustics.failureCodes.BOUNDARY_ASSUMPTION_REQUIRED,
  );
});

test("passage delay and longitudinal modes carry explicit boundary labels and monotonic length effects", () => {
  const fixture = {
    speedOfSoundMps: 343,
    effectiveLengthM: 0.25,
    quarterWaveBoundaryAssumption:
      acoustics.quarterWaveBoundaryAssumption,
    halfWaveBoundaryAssumption: "both-ends-open",
  };
  const base = acoustics.passageDelayAndResonances(fixture);
  assert.equal(base.ok, true);
  close(base.oneWayDelayS, 0.25 / 343);
  assert.equal(base.modes[0].frequencyHz, 343);
  assert.equal(base.modes[1].frequencyHz, 686);
  assert.match(base.modes[0].label, /quarter-wave/);
  assert.equal(
    base.modes[0].boundaryAssumption,
    "one-end-closed-one-end-open",
  );

  const longer = acoustics.passageDelayAndResonances({
    ...fixture,
    effectiveLengthM: 0.5,
  });
  assert.ok(longer.oneWayDelayS > base.oneWayDelayS);
  assert.ok(longer.modes[0].frequencyHz < base.modes[0].frequencyHz);
  assert.ok(longer.modes[1].frequencyHz < base.modes[1].frequencyHz);

  const noBoundary = acoustics.passageDelayAndResonances({
    speedOfSoundMps: 343,
    effectiveLengthM: 0.25,
  });
  assert.equal(
    noBoundary.code,
    acoustics.failureCodes.BOUNDARY_ASSUMPTION_REQUIRED,
  );
});

test("per-band path analysis is keyed, signed to an explicit datum, and diagnoses declared spread limits", () => {
  const result = acoustics.analyzeBandPaths({
    bandId: "mid",
    frequencyHz: 1000,
    speedOfSoundMps: 400,
    paths: [
      { id: "path-b", pathToDatumM: 0.5 },
      { id: "path-a", pathToDatumM: 0.4 },
    ],
    referencePathToDatumM: 0.45,
    maximumAllowedSpreadM: 0.08,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.paths.map(item => item.id),
    ["path-a", "path-b"],
  );
  close(result.spreadM, 0.1);
  close(result.spreadDelayS, 0.1 / 400);
  close(result.spreadPhaseDeg, 90);
  close(result.paths[0].phaseFromReferenceDeg, -45);
  close(result.paths[1].phaseFromReferenceDeg, 45);
  assert.equal(result.withinDeclaredSpreadLimit, false);
  assert.ok(
    result.diagnostics.some(
      item => item.code === acoustics.failureCodes.PATH_SPREAD_EXCEEDED,
    ),
  );

  const widerSpread = acoustics.analyzeBandPaths({
    bandId: "mid",
    frequencyHz: 1000,
    speedOfSoundMps: 400,
    paths: [
      { id: "path-a", pathToDatumM: 0.4 },
      { id: "path-b", pathToDatumM: 0.6 },
    ],
  });
  assert.ok(widerSpread.spreadM > result.spreadM);
  assert.ok(widerSpread.spreadPhaseDeg > result.spreadPhaseDeg);
});

test("adjacent-band phase uses explicit paths, a declared sign, and no inferred nominal path", () => {
  const result = acoustics.analyzeAdjacentBandPhase({
    crossoverFrequencyHz: 1000,
    speedOfSoundMps: 400,
    lowerBand: {
      bandId: "low",
      paths: [
        { id: "low-a", pathToDatumM: 0.45 },
        { id: "low-b", pathToDatumM: 0.5 },
      ],
      referencePathToDatumM: 0.48,
    },
    upperBand: {
      bandId: "mid",
      paths: [
        { id: "mid-a", pathToDatumM: 0.4 },
        { id: "mid-b", pathToDatumM: 0.42 },
      ],
      referencePathToDatumM: 0.41,
    },
    maximumAllowedAbsolutePhaseDeg: 100,
  });
  assert.equal(result.ok, true);
  close(result.deltaPathRangeM[0], 0.03);
  close(result.deltaPathRangeM[1], 0.1);
  close(result.phaseRangeDeg[0], 27);
  close(result.phaseRangeDeg[1], 90);
  close(result.nominalDeltaM, 0.07);
  close(result.nominalPhaseDeg, 63);
  assert.equal(result.withinDeclaredPhaseLimit, true);
  assert.match(result.signConvention, /lower-band path is longer/);

  const noReference = acoustics.analyzeAdjacentBandPhase({
    crossoverFrequencyHz: 1000,
    speedOfSoundMps: 400,
    lowerBand: {
      bandId: "mid",
      paths: [{ id: "mid", pathToDatumM: 0.4 }],
    },
    upperBand: {
      bandId: "high",
      paths: [{ id: "high", pathToDatumM: 0.39 }],
    },
  });
  assert.equal(noReference.nominalAvailable, false);
  assert.equal(noReference.nominalDeltaM, null);
  assert.equal(noReference.nominalPhaseDeg, null);
});

test("legal axial interval intersects explicit bounds, retains reasons, and never selects a point", () => {
  const fixture = {
    stationId: "station-low",
    bounds: [
      {
        id: "minimum-acoustic",
        minimumM: 0.1,
        reason: "explicit local expansion lower bound",
        evidenceRefs: ["source-a"],
      },
      {
        id: "maximum-reflection",
        maximumM: 0.3,
        reason: "explicit reflection upper bound",
        evidenceRefs: ["source-b"],
      },
      {
        id: "package",
        minimumM: 0.12,
        maximumM: 0.25,
        reason: "explicit package interval",
        evidenceRefs: ["source-c"],
      },
    ],
  };
  const result = acoustics.intersectAxialBounds(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.legalIntervalM, {
    minimum: 0.12,
    maximum: 0.25,
  });
  assert.equal(result.selectedAxialM, null);
  assert.equal(result.automaticStationSelection, false);
  assert.deepEqual(
    result.activeMinimumBounds.map(item => item.id),
    ["package"],
  );
  assert.deepEqual(
    result.activeMaximumBounds.map(item => item.id),
    ["package"],
  );
  assert.equal(result.reasons.length, 3);

  const tightened = acoustics.intersectAxialBounds({
    ...fixture,
    bounds: [
      ...fixture.bounds,
      {
        id: "new-explicit-limit",
        minimumM: 0.15,
        maximumM: 0.2,
        reason: "tighter explicit interval",
      },
    ],
  });
  assert.ok(tightened.widthM <= result.widthM);

  const empty = acoustics.intersectAxialBounds({
    stationId: "station-low",
    bounds: [
      { id: "min", minimumM: 0.3, reason: "explicit minimum" },
      { id: "max", maximumM: 0.2, reason: "explicit maximum" },
    ],
  });
  assert.equal(empty.ok, false);
  assert.equal(
    empty.code,
    acoustics.failureCodes.AXIAL_INTERVAL_EMPTY,
  );
  assert.equal(empty.details.candidateMinimumM, 0.3);
  assert.equal(empty.details.candidateMaximumM, 0.2);
});

test("schema-2 entry-station composition uses only explicit station, horn query, and acoustic inputs", () => {
  const firstInput = stationFixture();
  const before = structuredClone(firstInput);
  const first = acoustics.analyzeEntryStation(firstInput);
  assert.deepEqual(firstInput, before, "analysis mutated caller input");
  assert.equal(first.ok, true);
  assert.equal(first.entryStationReference.id, "station-mid");
  assert.equal(first.localAreaRatio.apertureToLocalHornAreaRatio, 0.1);
  assert.deepEqual(first.legalAxialInterval.legalIntervalM, {
    minimum: 0.1,
    maximum: 0.16,
  });
  assert.equal(first.hornQueryInsideLegalInterval, true);
  assert.equal(first.automaticStationSelection, false);
  assert.deepEqual(first.inferredValues, []);
  assert.equal(first.manufacturing, false);

  const irrelevant = stationFixture();
  irrelevant.state.horn.mouth = { widthM: 4, heightM: 3 };
  irrelevant.state.sources[0].count = 99;
  irrelevant.state.entryStations[0].apertures.countPerSource = 37;
  irrelevant.entryStation.apertures.countPerSource = 37;
  const second = acoustics.analyzeEntryStation(irrelevant);
  assert.equal(second.ok, true);
  assert.deepEqual(
    {
      wavelength: second.wavelength.wavelengthM,
      ratio: second.localAreaRatio.apertureToLocalHornAreaRatio,
      inertance: second.passage.inertance.acousticInertancePaS2M3,
      paths: second.paths.spreadM,
      interval: second.legalAxialInterval.legalIntervalM,
    },
    {
      wavelength: first.wavelength.wavelengthM,
      ratio: first.localAreaRatio.apertureToLocalHornAreaRatio,
      inertance: first.passage.inertance.acousticInertancePaS2M3,
      paths: first.paths.spreadM,
      interval: first.legalAxialInterval.legalIntervalM,
    },
  );

  const noArea = stationFixture();
  delete noArea.hornQuery.localHornAreaM2;
  const refused = acoustics.analyzeEntryStation(noArea);
  assert.equal(refused.ok, false);
  assert.equal(
    refused.code,
    acoustics.failureCodes.HORN_QUERY_MISMATCH,
  );
});

test("station composition rejects schema, station identity, band, and outside-interval errors stably", () => {
  const oldSchema = stationFixture();
  oldSchema.state.schemaVersion = 1;
  assert.equal(
    acoustics.analyzeEntryStation(oldSchema).code,
    acoustics.failureCodes.STATE_SCHEMA_UNSUPPORTED,
  );

  const wrongStation = stationFixture();
  wrongStation.entryStation.sourceIds = ["different-source"];
  assert.equal(
    acoustics.analyzeEntryStation(wrongStation).code,
    acoustics.failureCodes.ENTRY_STATION_MISMATCH,
  );

  const wrongBand = stationFixture();
  wrongBand.acousticInputs.bandId = "low";
  assert.equal(
    acoustics.analyzeEntryStation(wrongBand).code,
    acoustics.failureCodes.INPUT_INVALID,
  );

  const outside = stationFixture();
  outside.hornQuery.axialCoordinateM = 0.3;
  const outsideResult = acoustics.analyzeEntryStation(outside);
  assert.equal(outsideResult.ok, true);
  assert.equal(outsideResult.hornQueryInsideLegalInterval, false);
  assert.ok(
    outsideResult.diagnostics.some(
      item =>
        item.code ===
        acoustics.failureCodes.ENTRY_STATION_QUERY_OUTSIDE_INTERVAL,
    ),
  );
});

test("invalid and missing inputs fail closed without numeric coercion or NaN output", () => {
  const cases = [
    acoustics.wavelength({
      frequencyHz: "343",
      speedOfSoundMps: 343,
    }),
    acoustics.pathPhase({
      frequencyHz: 343,
      deltaPathM: Number.NaN,
      speedOfSoundMps: 343,
    }),
    acoustics.apertureToHornAreaRatio({
      summedApertureAreaM2: 0.01,
      localHornAreaM2: 0,
    }),
    acoustics.passageInertance({
      densityKgM3: 1.2,
      effectiveLengthM: -1,
      effectiveAreaM2: 0.01,
    }),
    acoustics.analyzeBandPaths({
      bandId: "mid",
      frequencyHz: 1000,
      speedOfSoundMps: 343,
      paths: [{ id: "bad", pathToDatumM: Infinity }],
    }),
  ];
  for (const result of cases) {
    assert.equal(result.ok, false);
    assert.ok(
      [
        acoustics.failureCodes.INPUT_INVALID,
        acoustics.failureCodes.PATHS_INVALID,
      ].includes(result.code),
    );
    assert.equal(JSON.stringify(result).includes("NaN"), false);
    assert.equal(JSON.stringify(result).includes("Infinity"), false);
    assert.equal(result.manufacturing, false);
  }
  assert.equal(cases[1].details.value, null);
  assert.equal(cases[4].details.value, null);
});

test("unknown King transfer and mouth-load providers retain their stable unavailable codes", () => {
  const horn = acoustics.sourceDependencyPreflight("horn-segment-abcd");
  const branch = acoustics.sourceDependencyPreflight("branch-abcd");
  const mouth = acoustics.sourceDependencyPreflight(
    "mouth-radiation-load",
  );
  assert.equal(
    horn.code,
    "THREEWAY_MATH_TRANSFER_PROVIDER_UNAVAILABLE",
  );
  assert.equal(branch.code, horn.code);
  assert.equal(
    mouth.code,
    "THREEWAY_MATH_MOUTH_LOAD_PROVIDER_UNAVAILABLE",
  );
  assert.equal(horn.manufacturing, false);
  assert.equal(mouth.hardwareValidated, false);
});

test("all successful results are deeply immutable and manufacturing always refuses", () => {
  const result = acoustics.analyzeEntryStation(stationFixture());
  assert.equal(result.ok, true);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.passage));
  assert.ok(Object.isFrozen(result.passage.helmholtzEstimate));
  assert.ok(Object.isFrozen(result.paths.paths));
  assert.ok(Object.isFrozen(result.legalAxialInterval.bounds));
  assert.throws(
    () => {
      result.paths.paths[0].pathToDatumM = 99;
    },
    TypeError,
  );

  const manufacturing = acoustics.manufacturingPreflight(
    "export-three-way-stl",
  );
  assert.equal(manufacturing.ok, false);
  assert.equal(manufacturing.available, false);
  assert.equal(manufacturing.manufacturing, false);
  assert.equal(manufacturing.stl, false);
  assert.equal(
    manufacturing.code,
    "THREEWAY_MANUFACTURING_UNAVAILABLE",
  );
});

test("the UMD acoustics module loads without DOM, renderer, engine, state, or coupled-network globals", () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.MEH3Acoustics.version, 1);
  assert.equal(
    context.MEH3Acoustics.capabilities.manufacturingExport,
    false,
  );
  assert.equal(
    context.MEH3Acoustics.wavelength({
      frequencyHz: 343,
      speedOfSoundMps: 343,
    }).wavelengthM,
    1,
  );
  assert.equal(context.document, undefined);
  assert.equal(context.THREE, undefined);
  assert.equal(context.MEH3StateContract, undefined);
  assert.equal(context.MEH3CoupledNetwork, undefined);
});
