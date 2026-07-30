/*
 * MEH Studio v5 — usable, provenance-labelled three-way quick starts.
 *
 * This module owns no Boolean or manufacturing authority.  It converts a
 * deliberately small set of user controls into the same explicit schema-2
 * state and physical analysis input exercised by the canonical T3 solver.
 * The default is a calculated study, not a clone of a commercial product.
 */
(function attachThreeWayQuickStarts(root, factory) {
  "use strict";
  const profileLaws = typeof module === "object" && module.exports
    ? require("./profile-laws.js")
    : root && root.MEHProfileLaws;
  const familyCatalog = typeof module === "object" && module.exports
    ? require("./threeway-family-catalog.js")
    : root && root.MEH3FamilyCatalog;
  const api = factory(profileLaws, familyCatalog);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3QuickStarts = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createApi(
  profileLaws,
  familyCatalog,
) {
  "use strict";

  if (!profileLaws || typeof profileLaws.solveProfileLaw !== "function") {
    throw new TypeError(
      "threeway-quick-starts.js requires the profile-laws.js API.",
    );
  }
  if (!familyCatalog || typeof familyCatalog.getPreset !== "function") {
    throw new TypeError(
      "threeway-quick-starts.js requires the threeway-family-catalog.js API.",
    );
  }

  const API_VERSION = 1;
  const DEFAULT_ID = "calculated-t3-study";
  const PROFILE_FAMILIES = Object.freeze([
    "conical",
    "classicOS",
  ]);
  const SECTION_FAMILIES = Object.freeze(["ellipse", "superellipse"]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") {
      const copy = {};
      for (const key of Object.keys(value).sort()) copy[key] = clone(value[key]);
      return copy;
    }
    return typeof value === "number" && Object.is(value, -0) ? 0 : value;
  }

  function finite(value, fallback, minimum, maximum, name) {
    const number = value === undefined || value === null || value === ""
      ? fallback
      : Number(value);
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      throw new RangeError(`${name} must be from ${minimum} through ${maximum}.`);
    }
    return number;
  }

  function choice(value, fallback, values, name) {
    const selected = value === undefined || value === null || value === ""
      ? fallback
      : String(value);
    if (!values.includes(selected)) {
      throw new RangeError(`${name} must be one of: ${values.join(", ")}.`);
    }
    return selected;
  }

  const DEFAULT_CONTROLS = deepFreeze({
    mouthWidthM: 0.64,
    mouthHeightM: 0.64,
    depthM: 0.3,
    coverageHorizontalDeg: 90,
    coverageVerticalDeg: 90,
    lowMidHz: 300,
    midHighHz: 1200,
    surfaceLawFamily: "conical",
    crossSectionFamily: "ellipse",
    crossSectionExponent: 2,
  });

  const QUICK_STARTS = deepFreeze([
    {
      id: DEFAULT_ID,
      label: "Calculated T3 study — 3 bands / 2 wall stations",
      topology: "T3",
      classification: "calculated-adaptation",
      description:
        "A solver-valid three-band study with one high-frequency throat " +
        "source and explicit mid/low wall entries. It is intended for " +
        "interactive analysis and preview, not manufacturing.",
      evidenceRefs: [
        "MEH Studio canonical schema-2 solver composition",
        "MEH Studio three-way research manifest",
      ],
      limitations: [
        "Calculated study; not a documented product replica.",
        "Preview geometry is analysis-only and is not an exact Boolean solid.",
        "Manufacturing, STL, and verified acoustic performance are not claimed.",
      ],
      defaults: DEFAULT_CONTROLS,
    },
  ]);

  function normalizeControls(input) {
    const controls = input && typeof input === "object" ? input : {};
    const lowMid = finite(
      controls.lowMidHz === undefined
        ? controls.lowMidCrossoverHz
        : controls.lowMidHz,
      DEFAULT_CONTROLS.lowMidHz,
      150,
      700,
      "Low/mid crossover",
    );
    const midHigh = finite(
      controls.midHighHz === undefined
        ? controls.midHighCrossoverHz
        : controls.midHighHz,
      DEFAULT_CONTROLS.midHighHz,
      700,
      2500,
      "Mid/high crossover",
    );
    if (!(midHigh > lowMid)) {
      throw new RangeError("Mid/high crossover must exceed low/mid crossover.");
    }
    const crossSectionFamily = choice(
      controls.crossSectionFamily === undefined
        ? controls.sectionFamily
        : controls.crossSectionFamily,
      DEFAULT_CONTROLS.crossSectionFamily,
      SECTION_FAMILIES,
      "Cross-section family",
    );
    return deepFreeze({
      mouthWidthM: finite(
        controls.mouthWidthM,
        DEFAULT_CONTROLS.mouthWidthM,
        0.4,
        1.2,
        "Mouth width",
      ),
      mouthHeightM: finite(
        controls.mouthHeightM,
        DEFAULT_CONTROLS.mouthHeightM,
        0.4,
        1.2,
        "Mouth height",
      ),
      depthM: finite(
        controls.depthM,
        DEFAULT_CONTROLS.depthM,
        0.3,
        0.6,
        "Horn depth",
      ),
      coverageHorizontalDeg: finite(
        controls.coverageHorizontalDeg,
        DEFAULT_CONTROLS.coverageHorizontalDeg,
        40,
        120,
        "Horizontal coverage",
      ),
      coverageVerticalDeg: finite(
        controls.coverageVerticalDeg,
        DEFAULT_CONTROLS.coverageVerticalDeg,
        40,
        120,
        "Vertical coverage",
      ),
      lowMidHz: lowMid,
      midHighHz: midHigh,
      surfaceLawFamily: choice(
        controls.surfaceLawFamily === undefined
          ? controls.profileFamily
          : controls.surfaceLawFamily,
        DEFAULT_CONTROLS.surfaceLawFamily,
        PROFILE_FAMILIES,
        "Profile family",
      ),
      crossSectionFamily,
      crossSectionExponent: crossSectionFamily === "ellipse"
        ? 2
        : finite(
          controls.crossSectionExponent === undefined
            ? controls.sectionExponent
            : controls.crossSectionExponent,
          3.5,
          2,
          12,
          "Superellipse exponent",
        ),
    });
  }

  function logGamma(value) {
    const coefficients = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7,
    ];
    const z = value - 1;
    let sum = 0.99999999999980993;
    for (let index = 0; index < coefficients.length; index += 1) {
      sum += coefficients[index] / (z + index + 1);
    }
    const t = z + coefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) +
      (z + 0.5) * Math.log(t) - t + Math.log(sum);
  }

  function areaCoefficient(exponent) {
    return exponent === 2
      ? Math.PI
      : 4 * Math.exp(
        2 * logGamma(1 + 1 / exponent) -
        logGamma(1 + 2 / exponent),
      );
  }

  function profileBaseParameters(family, nominalHalfAngle) {
    if (family === "conical" || family === "classicOS") {
      return { nominalHalfAngle };
    }
    if (family === "osse") {
      return {
        k: 1.5,
        nominalHalfAngle,
        q: 0.995,
        s: 0.5,
        terminationExponent: 4,
        throatHalfAngle: Math.min(Math.PI / 18, nominalHalfAngle * 0.4),
      };
    }
    return {
      apexRadiusFactor: 0.5,
      apexShift: 0.53,
      bending: 0.34,
      k: 1.5,
      nominalHalfAngle,
      throatHalfAngle: Math.min(Math.PI / 18, nominalHalfAngle * 0.4),
      throatShape: 3.7,
    };
  }

  function fittedProfileParameters(
    controls,
    throatRadius,
    mouthRadius,
  ) {
    const family = controls.surfaceLawFamily;
    const minimum = (family === "conical" || family === "classicOS")
      ? Math.PI / 12
      : Math.PI / 9;
    const maximum = family === "rosse" ? Math.PI / 3 : 7 * Math.PI / 18;
    const extentAt = angle => {
      const result = profileLaws.solveProfileLaw({
        family,
        ...profileBaseParameters(family, angle),
        throatRadius,
        mouthRadius,
        samples: 33,
      });
      return result && result.ok && result.extent
        ? result.extent.axialLength
        : NaN;
    };
    let low = minimum;
    let high = maximum;
    let lowLength = extentAt(low);
    let highLength = extentAt(high);
    if (!Number.isFinite(lowLength) || !Number.isFinite(highLength)) {
      throw new RangeError(`Profile ${family} could not derive a finite extent.`);
    }
    const target = controls.depthM;
    const smallest = Math.min(lowLength, highLength);
    const largest = Math.max(lowLength, highLength);
    if (target < smallest - 1e-9 || target > largest + 1e-9) {
      throw new RangeError(
        `Depth ${target.toFixed(3)} m is outside the ${family} extent ` +
        `range ${smallest.toFixed(3)}–${largest.toFixed(3)} m for this mouth.`,
      );
    }
    for (let iteration = 0; iteration < 90; iteration += 1) {
      const middle = (low + high) / 2;
      const middleLength = extentAt(middle);
      if (!Number.isFinite(middleLength)) {
        throw new RangeError(`Profile ${family} extent fitting failed.`);
      }
      if ((lowLength - target) * (middleLength - target) <= 0) {
        high = middle;
        highLength = middleLength;
      } else {
        low = middle;
        lowLength = middleLength;
      }
    }
    const nominalHalfAngle = (low + high) / 2;
    return profileBaseParameters(family, nominalHalfAngle);
  }

  function matrix(x, y, z) {
    return {
      matrix4: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1,
      ],
    };
  }

  function wallDriver(id, bandId, effectiveAreaM2, activeDiameterM) {
    return {
      schemaVersion: 1,
      id,
      revision: 1,
      kind: "cone",
      bandIds: [bandId],
      frame: {
        shape: "round",
        diameterM: activeDiameterM + 0.02,
        depthM: 0.07,
        frontProjectionM: 0.002,
      },
      diaphragm: {
        effectiveAreaM2,
        activeDiameterM,
        geometry: { shape: "round", centerOffsetM: [0, 0] },
        provenanceRefs: ["calculated-t3-study-driver-assumption"],
      },
      outputs: [{
        id: `${bandId}-front`,
        bandIds: [bandId],
        kind: "front-diaphragm",
        geometry: {
          shape: "round",
          diameterM: activeDiameterM,
          areaM2: effectiveAreaM2,
        },
        acousticDatum: {
          kind: "front-chamber-boundary",
          offsetM: 0.012,
        },
        provenanceRefs: ["calculated-t3-study-driver-assumption"],
      }],
      mounting: {
        datum: "front-frame-plane",
        provenanceRefs: ["calculated-t3-study-driver-assumption"],
      },
      provenanceRefs: ["calculated-t3-study-driver-assumption"],
    };
  }

  function highDriver() {
    return {
      schemaVersion: 1,
      id: "driver-high-t3-study",
      revision: 1,
      kind: "compression",
      bandIds: ["high"],
      frame: {
        shape: "round",
        diameterM: 0.12,
        depthM: 0.1,
        frontProjectionM: 0.002,
      },
      diaphragm: {
        effectiveAreaM2: 0.0012,
        activeDiameterM: 0.04,
        provenanceRefs: ["calculated-t3-study-driver-assumption"],
      },
      outputs: [{
        id: "high-throat",
        bandIds: ["high"],
        kind: "compression-throat",
        geometry: {
          shape: "round",
          diameterM: 0.04,
          areaM2: Math.PI * 0.02 ** 2,
        },
        acousticDatum: {
          kind: "manufacturer-reference-plane",
          offsetM: 0.05,
        },
        provenanceRefs: ["calculated-t3-study-driver-assumption"],
      }],
      mounting: {
        datum: "front-frame-plane",
        provenanceRefs: ["calculated-t3-study-driver-assumption"],
      },
      provenanceRefs: ["calculated-t3-study-driver-assumption"],
    };
  }

  function apertureSource(
    sourceId,
    effectiveAreaM2,
    apertureAreaM2,
    activeDiameterM,
    upperFrequencyHz,
    minimumPrintableWebM,
  ) {
    return {
      sourceId,
      candidatePolicy: "enumerate-all-declared-counts",
      allowedCounts: [2],
      driverEffectiveAreaM2: effectiveAreaM2,
      areaPolicy: { mode: "target", summedAreaTargetM2: apertureAreaM2 },
      compressionRatioBounds: { minimum: 10, maximum: 20 },
      host: {
        id: `${sourceId}-active-cone`,
        role: "active-cone",
        shape: "circle",
        radiusM: activeDiameterM / 2,
      },
      apertureShape: { kind: "racetrack", lengthToWidthRatio: 3 },
      limits: {
        minimumWebM: minimumPrintableWebM,
        minimumEdgeM: minimumPrintableWebM,
        maximumApertureLongAxisM: 0.04,
        maximumApertureShortAxisM: 0.02,
      },
      orientationPolicy: {
        mode: "driver-local-parallel",
        angleRad: 0,
      },
      placementPolicy: {
        family: "symmetric-line",
        axisAngleRad: Math.PI / 2,
        spacingMode: "explicit-center-spacing",
        centerSpacingM: 0.035,
      },
      upperFrequencyHz,
      speedOfSoundMps: 343,
      wavelengthSpacingPolicy: "warn",
      provenance: {
        classification: "calculated-adaptation",
        evidenceRefs: ["calculated-t3-study-aperture"],
      },
    };
  }

  function stationRequirement(
    stationId,
    sourceId,
    bandId,
    requestedM,
    depthM,
  ) {
    return {
      stationId,
      bandIds: [bandId],
      sourceIds: [sourceId],
      sourceCount: 1,
      legalIntervalM: {
        minimum: Math.max(0, requestedM - 0.08),
        maximum: Math.min(depthM, requestedM + 0.08),
      },
      selectionMode: "documented-lock",
      requestedM,
      requiredAxialSpanM: Math.min(0.12, depthM * 0.4),
      requiredCircumferentialSpanPerSourceM: 0.14,
      minimumCircumferentialGapM: 0.006,
      minimumAxialGapM: 0.02,
      distribution: "rotational",
    };
  }

  function placementPlan(
    sourceId,
    stationId,
    bandId,
    outputId,
    activeDiameterM,
    chamberId,
    chamberVolumeM3,
    depthM,
    minimumPrintableWebM,
  ) {
    return {
      sourceId,
      stationId,
      bandId,
      driverOutputId: outputId,
      apertureCandidateId: `${sourceId}/candidate-count-2`,
      mountSetbackM: 0.06,
      distributionFamily: "rotational",
      axisPolicy: { kind: "wall-normal", normalSign: -1 },
      diagnosticFrequencyHz: 1000,
      maximumAllowedSpreadM: 0.005,
      referencePathToDatumM: depthM,
      pathDatumId: "mouth-reference-plane",
      pathSettings: {
        family: "straight",
        representation: "collinear-endpoint-tangents",
        curvedAllowed: false,
        samples: 9,
        driverTangentScaleM: 0.02,
        hornTangentScaleM: 0.02,
        upHintPolicy: "driver-face-u",
        sectionPolicy: "selected-aperture-exact-constant",
        effectiveAreaPolicy: "selected-aperture-area",
        areaProgression: "constant",
        areaProgressionTolerance: 1e-8,
        sectionSegments: 32,
        driverAxisToleranceDeg: 1,
        hornCrossingMinimumDeg: 15,
        provenanceRefs: ["calculated-t3-study-path"],
      },
      construction: {
        mode: "integrated-solid",
        host: { thicknessM: 0.01, edgeExtensionM: 0.004 },
        activeConeEnvelope: {
          shape: "round",
          diameterM: activeDiameterM,
          centerOffsetM: [0, 0],
          provenanceRefs: ["calculated-t3-study-driver-assumption"],
        },
        constraints: {
          axisToleranceDeg: 1,
          minimumWebM: minimumPrintableWebM,
          minimumEdgeM: minimumPrintableWebM,
          datumToleranceM: 1e-7,
        },
        inspection: { segments: 32 },
      },
      instances: [{
        id: `${sourceId}/driver-01`,
        azimuthRad: 0,
        axialOffsetM: 0,
        panelId: null,
        chamber: {
          id: chamberId,
          volumeM3: chamberVolumeM3,
          provenanceRefs: ["calculated-t3-study-chamber"],
        },
        upstreamPathToDriverEndpointM: 0.012,
        downstreamPathFromHornEndpointToDatumM: depthM * 2 / 3,
        auxiliaryNegatives: [],
        provenanceRefs: ["calculated-t3-study-instance"],
      }],
      panels: [],
      provenanceRefs: ["calculated-t3-study-plan"],
    };
  }

  function buildCalculatedT3(controlsInput) {
    const controls = normalizeControls(controlsInput);
    const preset = familyCatalog.getPreset("t3-calculated-111");
    const solidGeometry = preset && preset.analysisInput &&
      preset.analysisInput.solidGeometry;
    if (!solidGeometry) {
      throw new TypeError(
        "Calculated T3 requires explicit catalog-owned solidGeometry input.",
      );
    }
    const minimumPrintableWebM = solidGeometry.minimumPrintableWebM;
    const lowArea = 0.007;
    const midArea = 0.004;
    const lowApertureArea = 0.0005;
    const midApertureArea = 0.0003;
    const chamberVolumeM3 = 0.0004;
    const midStationM = controls.depthM * Math.min(
      0.25,
      Math.max(
        0.15,
        0.2 * (1200 / controls.midHighHz) ** 0.15,
      ),
    );
    const lowStationM = controls.depthM * Math.min(
      0.84,
      Math.max(
        0.72,
        0.8 * (300 / controls.lowMidHz) ** 0.15,
      ),
    );
    const sectionCoefficient = areaCoefficient(controls.crossSectionExponent);
    const throatRadius = Math.sqrt(
      sectionCoefficient * 0.04 * 0.04 / (4 * Math.PI),
    );
    const mouthRadius = Math.sqrt(
      sectionCoefficient *
      controls.mouthWidthM *
      controls.mouthHeightM /
      (4 * Math.PI),
    );
    const surfaceLaw = {
      family: controls.surfaceLawFamily,
      parameters: fittedProfileParameters(
        controls,
        throatRadius,
        mouthRadius,
      ),
    };
    const state = {
      schemaVersion: 2,
      designId: "calculated-t3-study",
      revision: 1,
      topology: { kind: "T3", schemaVersion: 1 },
      intent: {
        crossoversHz: {
          lowMid: controls.lowMidHz,
          midHigh: controls.midHighHz,
        },
        mouthLimitM: {
          width: controls.mouthWidthM * 1.25,
          height: controls.mouthHeightM * 1.25,
        },
      },
      horn: {
        surfaceLaw: clone(surfaceLaw),
        mouth: {
          widthM: controls.mouthWidthM,
          heightM: controls.mouthHeightM,
        },
      },
      sources: [
        {
          id: "src-high",
          driverRef: "driver-high-t3-study",
          bandIds: ["high"],
          role: "throat-source",
          count: 1,
          provenanceRefs: ["calculated-t3-study"],
        },
        {
          id: "src-low",
          driverRef: "driver-low-t3-study",
          bandIds: ["low"],
          role: "wall-source",
          count: 1,
          provenanceRefs: ["calculated-t3-study"],
        },
        {
          id: "src-mid",
          driverRef: "driver-mid-t3-study",
          bandIds: ["mid"],
          role: "wall-source",
          count: 1,
          provenanceRefs: ["calculated-t3-study"],
        },
      ],
      interfaces: [{
        id: "if-high",
        kind: "throat",
        sourceIds: ["src-high"],
        bandIds: ["high"],
        geometry: {
          shape: "round",
          areaM2: Math.PI * 0.02 ** 2,
        },
        provenanceRefs: ["calculated-t3-study"],
      }],
      entryStations: [
        {
          id: "station-mid",
          role: "wall-entry",
          sourceIds: ["src-mid"],
          bandIds: ["mid"],
          order: 1,
          provenanceRefs: ["calculated-t3-study"],
        },
        {
          id: "station-low",
          role: "wall-entry",
          sourceIds: ["src-low"],
          bandIds: ["low"],
          order: 2,
          provenanceRefs: ["calculated-t3-study"],
        },
      ],
      rearSystems: [],
      provenance: {
        records: [{
          id: "calculated-t3-study",
          classification: "calculated-adaptation",
          title: "MEH Studio calculated T3 study",
          note:
            "Solver-valid educational composition; not a documented product.",
        }],
      },
      research: {
        notes: [
          "Analysis-only calculated composition.",
          "No exact-solid, fabrication, or measured-performance claim.",
        ],
        referenceCardIds: [],
      },
    };
    const analysisInput = {
      solidGeometry: clone(solidGeometry),
      driverRecords: [
        wallDriver("driver-low-t3-study", "low", lowArea, 0.1),
        wallDriver("driver-mid-t3-study", "mid", midArea, 0.08),
        highDriver(),
      ],
      horn: {
        schemaVersion: 2,
        throat: { widthM: 0.04, heightM: 0.04 },
        mouth: {
          widthM: controls.mouthWidthM,
          heightM: controls.mouthHeightM,
        },
        depthM: controls.depthM,
        coverageDeg: {
          horizontal: controls.coverageHorizontalDeg,
          vertical: controls.coverageVerticalDeg,
        },
        surfaceLaw: clone(surfaceLaw),
        crossSection: {
          family: controls.crossSectionFamily,
          parameters: controls.crossSectionFamily === "superellipse"
            ? { exponent: controls.crossSectionExponent }
            : {},
        },
        azimuthRad: 0,
        sampling: { axialStationCount: 33, perimeterSampleCount: 256 },
        provenanceRefs: ["calculated-t3-study-horn"],
      },
      stations: {
        stationRequirements: [
          stationRequirement(
            "station-mid",
            "src-mid",
            "mid",
            midStationM,
            controls.depthM,
          ),
          stationRequirement(
            "station-low",
            "src-low",
            "low",
            lowStationM,
            controls.depthM,
          ),
        ],
        optimization: "balanced",
      },
      apertures: {
        sources: [
        apertureSource(
          "src-low",
          lowArea,
          lowApertureArea,
          0.1,
          controls.lowMidHz,
          minimumPrintableWebM,
        ),
        apertureSource(
          "src-mid",
          midArea,
          midApertureArea,
          0.08,
          controls.midHighHz,
          minimumPrintableWebM,
          ),
        ],
      },
      chambers: {
        chambers: [
          {
            id: "chamber-low-01",
            sourceId: "src-low",
            stationId: "station-low",
            bandIds: ["low"],
            sourceCount: 1,
            driverEffectiveAreaM2: lowArea,
            summedApertureAreaM2: lowApertureArea,
            air: { densityKgM3: 1.204, speedOfSoundMps: 343 },
            passage: { physicalLengthM: 0.04, endCorrectionM: 0.01 },
            volumePolicy: { mode: "explicit", volumeM3: chamberVolumeM3 },
            volumeBoundsM3: { minimum: 0.0002, maximum: 0.001 },
            resonancePolicy: {
              minimumAllowedHz: controls.lowMidHz,
              action: "warn",
            },
            provenanceRefs: ["calculated-t3-study-chamber"],
          },
          {
            id: "chamber-mid-01",
            sourceId: "src-mid",
            stationId: "station-mid",
            bandIds: ["mid"],
            sourceCount: 1,
            driverEffectiveAreaM2: midArea,
            summedApertureAreaM2: midApertureArea,
            air: { densityKgM3: 1.204, speedOfSoundMps: 343 },
            passage: { physicalLengthM: 0.035, endCorrectionM: 0.008 },
            volumePolicy: { mode: "explicit", volumeM3: chamberVolumeM3 },
            volumeBoundsM3: { minimum: 0.0002, maximum: 0.001 },
            resonancePolicy: {
              minimumAllowedHz: controls.midHighHz,
              action: "warn",
            },
            provenanceRefs: ["calculated-t3-study-chamber"],
          },
        ],
      },
      placementPlans: [
        placementPlan(
          "src-low",
          "station-low",
          "low",
          "low-front",
          0.1,
          "chamber-low-01",
          chamberVolumeM3,
          controls.depthM,
          minimumPrintableWebM,
        ),
        placementPlan(
          "src-mid",
          "station-mid",
          "mid",
          "mid-front",
          0.08,
          "chamber-mid-01",
          chamberVolumeM3,
          controls.depthM,
          minimumPrintableWebM,
        ),
      ],
      interfaceValidation: {
        positionToleranceM: 1e-7,
        sectionToleranceM: 1e-9,
        angleToleranceDeg: 0.01,
        azimuthToleranceRad: 1e-7,
        minimumDriverClearanceM: 0.005,
      },
      passages: {
        acoustics: {
          densityKgM3: 1.2,
          speedOfSoundMps: 343,
          quarterWaveBoundaryAssumption: "one-end-closed-one-end-open",
          halfWaveBoundaryAssumption: "both-ends-open",
          provenance: {
            classification: "calculated-adaptation",
            evidenceRefs: ["calculated-t3-study-acoustics"],
          },
        },
      },
      mountValidation: {
        positionToleranceM: 1e-7,
        sectionToleranceM: 1e-9,
        angleToleranceDeg: 0.01,
        azimuthToleranceRad: 1e-7,
        minimumDriverClearanceM: 0.005,
      },
      package: {
        packageLimitM: { depthM: 2, widthM: 2, heightM: 2 },
        globalMarginM: 0,
        componentClearanceM: 0,
        additionalComponents: [],
      },
      render: {
        renderIntents: {
          throatInterfaces: [{
            interfaceId: "if-high",
            transform: matrix(0, 0, 0),
            primitive: {
              kind: "plane",
              parameters: { dimensionsM: [0.04, 0.04] },
            },
          }],
          stationMarkers: [
            {
              stationId: "station-mid",
              transform: matrix(midStationM, 0, 0),
              primitive: {
                kind: "plane",
                parameters: { dimensionsM: [0.08, 0.04] },
              },
            },
            {
              stationId: "station-low",
              transform: matrix(lowStationM, 0, 0),
              primitive: {
                kind: "plane",
                parameters: { dimensionsM: [0.1, 0.05] },
              },
            },
          ],
          sectionPlane: {
            id: "axial-center",
            transform: matrix(controls.depthM / 2, 0, 0),
            primitive: {
              kind: "plane",
              parameters: {
                dimensionsM: [
                  controls.depthM,
                  Math.max(controls.mouthWidthM, controls.mouthHeightM),
                ],
              },
            },
          },
        },
        azimuthSegments: 24,
      },
    };
    return deepFreeze({
      state,
      analysisInput,
      controls,
      metadata: {
        id: DEFAULT_ID,
        label: QUICK_STARTS[0].label,
        topology: "T3",
        classification: "calculated-adaptation",
        analysisOnly: true,
        preview: true,
        exactSolid: false,
        manufacturing: false,
        stl: false,
        limitations: clone(QUICK_STARTS[0].limitations),
      },
    });
  }

  function listQuickStarts() {
    return QUICK_STARTS;
  }

  function getQuickStart(id) {
    const selected = String(id || DEFAULT_ID);
    return QUICK_STARTS.find(item => item.id === selected) || null;
  }

  function buildQuickStart(id, controls) {
    const selected = getQuickStart(id);
    if (!selected) throw new RangeError(`Unknown three-way quick start: ${id}`);
    if (selected.id === DEFAULT_ID) return buildCalculatedT3(controls);
    throw new RangeError(`Unsupported three-way quick start: ${selected.id}`);
  }

  return deepFreeze({
    API_VERSION,
    DEFAULT_ID,
    DEFAULT_CONTROLS,
    PROFILE_FAMILIES,
    SECTION_FAMILIES,
    listQuickStarts,
    getQuickStart,
    buildQuickStart,
  });
}));
