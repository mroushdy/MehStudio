/*
 * MEH Studio v5 — topology-neutral three-way horn surface.
 *
 * This Stage-2 module consumes only explicit schema-2 horn geometry. It does
 * not inspect topology, sources, driver counts, entry stations, UI state,
 * render state, solids, or manufacturing state. The axial meridian is owned
 * exclusively by profile-laws.js; this module maps its equivalent-area radius
 * onto an explicit ellipse or Lamé/superellipse section.
 *
 * Lengths are metres, angles are radians unless a `Deg` suffix is present,
 * and every returned record is deeply immutable.
 */
(function attachThreeWayHornSurface(root, factory) {
  "use strict";

  const profileLaws = typeof module === "object" && module.exports
    ? require("./profile-laws.js")
    : root && root.MEHProfileLaws;
  const api = factory(profileLaws);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3HornSurface = api;
}(typeof globalThis !== "undefined" ? globalThis : this,
function createThreeWayHornSurface(profileLaws) {
  "use strict";

  if (!profileLaws ||
      typeof profileLaws.solveProfileLaw !== "function" ||
      typeof profileLaws.profileLawSchema !== "function") {
    throw new TypeError(
      "threeway-horn-surface.js requires the profile-laws.js API."
    );
  }

  const API_VERSION = 1;
  const SCHEMA_VERSION = 2;
  const DEFAULT_AXIAL_STATION_COUNT = 257;
  const DEFAULT_PERIMETER_SAMPLE_COUNT = 2048;
  const MIN_AXIAL_STATION_COUNT = 33;
  const MAX_AXIAL_STATION_COUNT = 4097;
  const MIN_PERIMETER_SAMPLE_COUNT = 256;
  const MAX_PERIMETER_SAMPLE_COUNT = 16384;
  const MAX_SUPERELLIPSE_EXPONENT = 32;
  const TAU = 2 * Math.PI;
  const FRAME_AZIMUTH_DELTA_RAD = 1e-5;
  const SECTION_MAPPING_ID = "area-preserving-log-axis-stretch-v1";
  const SUPPORTED_PROFILE_FAMILIES = Object.freeze([
    "conical",
    "classicOS",
    "osse",
    "rosse"
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const DIAGNOSTIC_CODES = deepFreeze({
    schemaUnsupported: "THREEWAY_SCHEMA_UNSUPPORTED",
    inputInvalid: "THREEWAY_HORN_INPUT_INVALID",
    profileRefused: "THREEWAY_HORN_PROFILE_REFUSED",
    crossSectionUnsupported: "THREEWAY_HORN_CROSS_SECTION_UNSUPPORTED",
    areaNonmonotonic: "THREEWAY_HORN_AREA_NONMONOTONIC",
    sectionNonmonotonic: "THREEWAY_HORN_SECTION_NONMONOTONIC",
    endpointMismatch: "THREEWAY_HORN_ENDPOINT_MISMATCH",
    frameInvalid: "THREEWAY_HORN_FRAME_INVALID",
    mappingNotCoverage: "THREEWAY_SECTION_MAPPING_NOT_COVERAGE"
  });

  const CROSS_SECTION_SCHEMAS = deepFreeze({
    ellipse: {
      family: "ellipse",
      supported: true,
      exponent: 2,
      equation: "(y/a)^2 + (z/b)^2 = 1",
      areaMethod: "analytic",
      perimeterMethod: "deterministic-polyline-richardson"
    },
    superellipse: {
      family: "superellipse",
      supported: true,
      exponentRange: [2, MAX_SUPERELLIPSE_EXPONENT],
      equation: "|y/a|^n + |z/b|^n = 1",
      areaMethod: "analytic-gamma",
      perimeterMethod: "deterministic-polyline-richardson"
    },
    roundedRectangle: {
      family: "roundedRectangle",
      supported: false,
      reason:
        "No reusable topology-neutral exact rounded-rectangle provider is " +
        "available inside this module's profile-laws-only dependency boundary."
    }
  });

  const CAPABILITIES = deepFreeze({
    status: "analysis-only-canonical-horn-surface",
    hornSurfaceAnalysis: true,
    immutableCanonicalStations: true,
    explicitGeometryOnly: true,
    driverCountInference: false,
    entryStationInference: false,
    coverageClaim: false,
    hardwareValidated: false,
    manufacturing: false,
    manufacturingPlan: false,
    manufacturingSolids: false,
    manufacturingAudit: false,
    manufacturingExport: false,
    stlExport: false
  });

  const REFUSED_CAPABILITIES = deepFreeze({
    ...CAPABILITIES,
    status: "horn-surface-refused",
    hornSurfaceAnalysis: false,
    immutableCanonicalStations: false
  });

  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
  }

  function cloneJsonRecord(value) {
    if (Array.isArray(value)) return value.map(cloneJsonRecord);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value).sort()) {
        copy[key] = cloneJsonRecord(value[key]);
      }
      return copy;
    }
    if (typeof value === "number" && Object.is(value, -0)) return 0;
    return value;
  }

  function uniqueStrings(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
      value
        .map(cleanString)
        .filter(Boolean)
    )].sort();
  }

  function makeDiagnostic(
    code,
    severity,
    phase,
    paths,
    message,
    evidenceRefs,
    blocksCapabilities,
    extra
  ) {
    return deepFreeze({
      code,
      severity,
      phase,
      paths: uniqueStrings(paths),
      message,
      evidenceRefs: uniqueStrings(evidenceRefs),
      blocksCapabilities: uniqueStrings(blocksCapabilities),
      ...(extra || {})
    });
  }

  function errorDiagnostic(code, paths, message, extra) {
    return makeDiagnostic(
      code,
      "error",
      "horn-surface",
      paths,
      message,
      [],
      ["analysis", "preview", "manufacturing"],
      extra
    );
  }

  function failure(diagnostics, evidenceRefs) {
    const normalized = diagnostics.length
      ? diagnostics
      : [errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          [],
          "Horn-surface input was refused."
        )];
    return deepFreeze({
      ok: false,
      apiVersion: API_VERSION,
      schemaVersion: SCHEMA_VERSION,
      kind: "threeway-horn-surface-refusal",
      code: normalized[0].code,
      diagnostics: normalized,
      provenance: {
        evidenceRefs: uniqueStrings(evidenceRefs),
        module: "threeway-horn-surface.js",
        moduleApiVersion: API_VERSION,
        profileProvider: "profile-laws.js",
        profileProviderApiVersion: profileLaws.API_VERSION
      },
      hardwareValidated: false,
      manufacturing: false,
      capabilities: REFUSED_CAPABILITIES
    });
  }

  function addUnknownKeyDiagnostics(
    diagnostics,
    value,
    allowedKeys,
    basePath
  ) {
    if (!isRecord(value)) return;
    const unknown = Object.keys(value)
      .filter(key => !allowedKeys.includes(key))
      .sort();
    if (!unknown.length) return;
    diagnostics.push(errorDiagnostic(
      DIAGNOSTIC_CODES.inputInvalid,
      unknown.map(key => basePath ? `${basePath}.${key}` : key),
      "The horn-surface contract is explicit and does not accept these fields."
    ));
  }

  function positiveDimension(value, path, diagnostics) {
    if (!finite(value) || value <= 0) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        [path],
        `${path} must be an explicit finite SI length greater than zero.`
      ));
      return null;
    }
    return value;
  }

  function normalizeDimensionRecord(value, path, diagnostics) {
    if (!isRecord(value)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        [path],
        `${path} must explicitly provide widthM and heightM.`
      ));
      return { widthM: null, heightM: null };
    }
    addUnknownKeyDiagnostics(
      diagnostics,
      value,
      ["widthM", "heightM"],
      path
    );
    return {
      widthM: positiveDimension(value.widthM, `${path}.widthM`, diagnostics),
      heightM: positiveDimension(value.heightM, `${path}.heightM`, diagnostics)
    };
  }

  function normalizeCoverage(value, diagnostics) {
    if (!isRecord(value)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["coverageDeg"],
        "coverageDeg must explicitly provide horizontal and vertical degrees."
      ));
      return { horizontal: null, vertical: null };
    }
    addUnknownKeyDiagnostics(
      diagnostics,
      value,
      ["horizontal", "vertical"],
      "coverageDeg"
    );
    const result = {};
    for (const axis of ["horizontal", "vertical"]) {
      const angle = value[axis];
      if (!finite(angle) || angle <= 0 || angle > 180) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          [`coverageDeg.${axis}`],
          `coverageDeg.${axis} must be an explicit finite angle in (0, 180].`
        ));
        result[axis] = null;
      } else {
        result[axis] = angle;
      }
    }
    return result;
  }

  function canonicalCrossSectionFamily(value) {
    const name = cleanString(value);
    if (!name) return null;
    if (name === "ellipse") return "ellipse";
    if (name === "superellipse" ||
        name === "lame" ||
        name === "lame-superellipse") {
      return "superellipse";
    }
    if (name === "roundedRectangle" ||
        name === "rounded-rectangle" ||
        name === "roundrect") {
      return "roundedRectangle";
    }
    return null;
  }

  function normalizeCrossSection(value, diagnostics) {
    if (!isRecord(value)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["crossSection"],
        "crossSection must explicitly provide family and parameters."
      ));
      return null;
    }
    addUnknownKeyDiagnostics(
      diagnostics,
      value,
      ["family", "parameters"],
      "crossSection"
    );
    const requestedFamily = cleanString(value.family);
    const family = canonicalCrossSectionFamily(requestedFamily);
    if (!requestedFamily) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["crossSection.family"],
        "crossSection.family is required."
      ));
      return null;
    }
    if (!family) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.crossSectionUnsupported,
        ["crossSection.family"],
        `Unsupported cross-section family: ${requestedFamily}.`
      ));
      return null;
    }
    if (family === "roundedRectangle") {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.crossSectionUnsupported,
        ["crossSection.family"],
        CROSS_SECTION_SCHEMAS.roundedRectangle.reason,
        { requestedFamily }
      ));
      return null;
    }
    const parameters = value.parameters === undefined
      ? {}
      : value.parameters;
    if (!isRecord(parameters)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["crossSection.parameters"],
        "crossSection.parameters must be an object."
      ));
      return null;
    }
    addUnknownKeyDiagnostics(
      diagnostics,
      parameters,
      ["exponent"],
      "crossSection.parameters"
    );

    let exponent;
    if (family === "ellipse") {
      exponent = 2;
      if (hasOwn(parameters, "exponent") && parameters.exponent !== 2) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          ["crossSection.parameters.exponent"],
          "An ellipse has fixed Lamé exponent 2."
        ));
      }
    } else {
      exponent = parameters.exponent;
      if (!finite(exponent) ||
          exponent < 2 ||
          exponent > MAX_SUPERELLIPSE_EXPONENT) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          ["crossSection.parameters.exponent"],
          "A superellipse requires an explicit finite exponent from 2 to 32."
        ));
      }
    }
    return {
      family,
      requestedFamily,
      exponent
    };
  }

  function normalizeSurfaceLaw(value, diagnostics) {
    if (!isRecord(value)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["surfaceLaw"],
        "surfaceLaw must explicitly provide family and parameters."
      ));
      return null;
    }
    addUnknownKeyDiagnostics(
      diagnostics,
      value,
      ["family", "parameters"],
      "surfaceLaw"
    );
    const family = cleanString(value.family);
    if (!family) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["surfaceLaw.family"],
        "surfaceLaw.family is required."
      ));
      return null;
    }
    const parameters = value.parameters === undefined ? {} : value.parameters;
    if (!isRecord(parameters)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["surfaceLaw.parameters"],
        "surfaceLaw.parameters must be an object of explicit numeric values."
      ));
      return null;
    }
    const copiedParameters = {};
    for (const key of Object.keys(parameters).sort()) {
      if (!finite(parameters[key])) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          [`surfaceLaw.parameters.${key}`],
          "Every surface-law parameter must be a finite number."
        ));
      } else {
        copiedParameters[key] = Object.is(parameters[key], -0)
          ? 0
          : parameters[key];
      }
    }
    for (const derivedKey of [
      "throatRadius",
      "mouthRadius",
      "axialLength",
      "samples"
    ]) {
      if (hasOwn(parameters, derivedKey)) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          [`surfaceLaw.parameters.${derivedKey}`],
          `${derivedKey} is owned by explicit throat, mouth, depthM, or sampling input.`
        ));
      }
    }

    const schema = profileLaws.profileLawSchema(family);
    if (schema && !SUPPORTED_PROFILE_FAMILIES.includes(schema.family)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.profileRefused,
        ["surfaceLaw.family"],
        `Profile family ${family} is not admitted by the three-way horn-surface contract.`,
        { causeCode: "PROFILE_LAW_NOT_ADMITTED" }
      ));
    }
    if (schema) {
      const allowed = Object.keys(schema.parameters)
        .filter(key => ![
          "throatRadius",
          "mouthRadius",
          "axialLength"
        ].includes(key));
      const unknown = Object.keys(parameters)
        .filter(key => !allowed.includes(key) && ![
          "throatRadius",
          "mouthRadius",
          "axialLength",
          "samples"
        ].includes(key))
        .sort();
      if (unknown.length) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          unknown.map(key => `surfaceLaw.parameters.${key}`),
          `Unsupported parameter(s) for profile family ${schema.family}.`
        ));
      }
    }
    return {
      family,
      parameters: copiedParameters
    };
  }

  function normalizeSampling(value, diagnostics) {
    if (value !== undefined && !isRecord(value)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["sampling"],
        "sampling must be an object when supplied."
      ));
      return {
        axialStationCount: DEFAULT_AXIAL_STATION_COUNT,
        perimeterSampleCount: DEFAULT_PERIMETER_SAMPLE_COUNT
      };
    }
    const record = value || {};
    addUnknownKeyDiagnostics(
      diagnostics,
      record,
      ["axialStationCount", "perimeterSampleCount"],
      "sampling"
    );
    const axialStationCount = record.axialStationCount === undefined
      ? DEFAULT_AXIAL_STATION_COUNT
      : record.axialStationCount;
    const perimeterSampleCount = record.perimeterSampleCount === undefined
      ? DEFAULT_PERIMETER_SAMPLE_COUNT
      : record.perimeterSampleCount;
    if (!Number.isInteger(axialStationCount) ||
        axialStationCount < MIN_AXIAL_STATION_COUNT ||
        axialStationCount > MAX_AXIAL_STATION_COUNT ||
        axialStationCount % 2 === 0) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["sampling.axialStationCount"],
        "axialStationCount must be an odd integer from 33 through 4097."
      ));
    }
    if (!Number.isInteger(perimeterSampleCount) ||
        perimeterSampleCount < MIN_PERIMETER_SAMPLE_COUNT ||
        perimeterSampleCount > MAX_PERIMETER_SAMPLE_COUNT ||
        perimeterSampleCount % 4 !== 0) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["sampling.perimeterSampleCount"],
        "perimeterSampleCount must be a multiple of four from 256 through 16384."
      ));
    }
    return {
      axialStationCount,
      perimeterSampleCount
    };
  }

  function normalizeInput(raw) {
    const diagnostics = [];
    if (!isRecord(raw)) {
      return {
        ok: false,
        diagnostics: [errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          [],
          "solveHornSurface requires one explicit schema-2 input object."
        )],
        evidenceRefs: []
      };
    }
    addUnknownKeyDiagnostics(
      diagnostics,
      raw,
      [
        "schemaVersion",
        "throat",
        "mouth",
        "depthM",
        "coverageDeg",
        "surfaceLaw",
        "crossSection",
        "azimuthRad",
        "sampling",
        "provenanceRefs"
      ],
      ""
    );
    if (raw.schemaVersion !== SCHEMA_VERSION) {
      diagnostics.unshift(errorDiagnostic(
        DIAGNOSTIC_CODES.schemaUnsupported,
        ["schemaVersion"],
        `Horn-surface schemaVersion must be ${SCHEMA_VERSION}.`
      ));
    }

    const throat = normalizeDimensionRecord(raw.throat, "throat", diagnostics);
    const mouth = normalizeDimensionRecord(raw.mouth, "mouth", diagnostics);
    const depthM = positiveDimension(raw.depthM, "depthM", diagnostics);
    const coverageDeg = normalizeCoverage(raw.coverageDeg, diagnostics);
    const surfaceLaw = normalizeSurfaceLaw(raw.surfaceLaw, diagnostics);
    const crossSection = normalizeCrossSection(raw.crossSection, diagnostics);
    const sampling = normalizeSampling(raw.sampling, diagnostics);
    let azimuthRad = raw.azimuthRad;
    if (!finite(azimuthRad)) {
      diagnostics.push(errorDiagnostic(
        DIAGNOSTIC_CODES.inputInvalid,
        ["azimuthRad"],
        "azimuthRad must be an explicitly declared finite angle."
      ));
      azimuthRad = null;
    }

    let evidenceRefs = [];
    if (raw.provenanceRefs !== undefined) {
      if (!Array.isArray(raw.provenanceRefs) ||
          raw.provenanceRefs.some(value => !cleanString(value))) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          ["provenanceRefs"],
          "provenanceRefs must be an array of non-empty strings."
        ));
      } else {
        evidenceRefs = uniqueStrings(raw.provenanceRefs);
      }
    }

    if (throat.widthM !== null &&
        throat.heightM !== null &&
        mouth.widthM !== null &&
        mouth.heightM !== null) {
      const throatProduct = throat.widthM * throat.heightM;
      const mouthProduct = mouth.widthM * mouth.heightM;
      if (mouth.widthM < throat.widthM ||
          mouth.heightM < throat.heightM) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.sectionNonmonotonic,
          ["throat", "mouth"],
          "Mouth width and height must each be no smaller than the throat dimensions."
        ));
      }
      if (!(mouthProduct > throatProduct)) {
        diagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.areaNonmonotonic,
          ["throat", "mouth"],
          "Mouth section area must be strictly greater than throat section area."
        ));
      }
    }

    if (diagnostics.length) {
      return { ok: false, diagnostics, evidenceRefs };
    }
    return {
      ok: true,
      value: {
        schemaVersion: SCHEMA_VERSION,
        throat,
        mouth,
        depthM,
        coverageDeg,
        surfaceLaw,
        crossSection,
        azimuthRad,
        sampling,
        provenanceRefs: evidenceRefs
      }
    };
  }

  /*
   * Lanczos log-gamma. The section-area domain only evaluates z in
   * [1.03125, 1.5], well inside the stable positive branch.
   */
  function logGamma(value) {
    const coefficients = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    let z = value - 1;
    let sum = 0.99999999999980993;
    for (let index = 0; index < coefficients.length; index++) {
      sum += coefficients[index] / (z + index + 1);
    }
    const t = z + coefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) +
      (z + 0.5) * Math.log(t) -
      t +
      Math.log(sum);
  }

  function lameAreaCoefficient(exponent) {
    if (exponent === 2) return Math.PI;
    return 4 * Math.exp(
      2 * logGamma(1 + 1 / exponent) -
      logGamma(1 + 2 / exponent)
    );
  }

  function canonicalAzimuth(value) {
    const normalized = value % TAU;
    return normalized < 0 ? normalized + TAU : normalized;
  }

  function sectionPoint(semiWidthM, semiHeightM, exponent, azimuthRad) {
    const cosine = Math.cos(azimuthRad);
    const sine = Math.sin(azimuthRad);
    const denominator =
      (Math.abs(cosine) / semiWidthM) ** exponent +
      (Math.abs(sine) / semiHeightM) ** exponent;
    const radiusM = denominator ** (-1 / exponent);
    return {
      yM: radiusM * cosine,
      zM: radiusM * sine
    };
  }

  function pointDistance(left, right) {
    return Math.hypot(left.yM - right.yM, left.zM - right.zM);
  }

  function sampledPerimeter(
    semiWidthM,
    semiHeightM,
    exponent,
    sampleCount
  ) {
    const start = sectionPoint(semiWidthM, semiHeightM, exponent, 0);
    let previousFine = start;
    let previousCoarse = start;
    let fineM = 0;
    let coarseM = 0;
    for (let index = 1; index <= sampleCount; index++) {
      const point = sectionPoint(
        semiWidthM,
        semiHeightM,
        exponent,
        TAU * index / sampleCount
      );
      fineM += pointDistance(previousFine, point);
      previousFine = point;
      if (index % 2 === 0) {
        coarseM += pointDistance(previousCoarse, point);
        previousCoarse = point;
      }
    }
    const richardsonM = fineM + (fineM - coarseM) / 3;
    return {
      valueM: richardsonM,
      finePolylineM: fineM,
      coarsePolylineM: coarseM,
      errorEstimateM: Math.abs(richardsonM - fineM),
      sampleCount,
      method: "closed-polar-polyline-richardson-v1"
    };
  }

  function vectorBetween(left, right) {
    return [
      right.xM - left.xM,
      right.yM - left.yM,
      right.zM - left.zM
    ];
  }

  function vectorLength(vector) {
    return Math.hypot(vector[0], vector[1], vector[2]);
  }

  function normalizedVector(vector) {
    const length = vectorLength(vector);
    if (!finite(length) || length <= 1e-15) return null;
    return vector.map(value => value / length);
  }

  function cross(left, right) {
    return [
      left[1] * right[2] - left[2] * right[1],
      left[2] * right[0] - left[0] * right[2],
      left[0] * right[1] - left[1] * right[0]
    ];
  }

  function dot(left, right) {
    return left[0] * right[0] +
      left[1] * right[1] +
      left[2] * right[2];
  }

  function vectorRecord(vector) {
    return {
      x: vector[0],
      y: vector[1],
      z: vector[2]
    };
  }

  function localFrame(rawStations, index, azimuthRad) {
    const station = rawStations[index];
    const left = index === 0 ? station : rawStations[index - 1];
    const right = index === rawStations.length - 1
      ? station
      : rawStations[index + 1];
    const axialTangent = normalizedVector(
      vectorBetween(left.wallPointM, right.wallPointM)
    );
    const before = sectionPoint(
      station.section.semiWidthM,
      station.section.semiHeightM,
      station.section.exponent,
      azimuthRad - FRAME_AZIMUTH_DELTA_RAD
    );
    const after = sectionPoint(
      station.section.semiWidthM,
      station.section.semiHeightM,
      station.section.exponent,
      azimuthRad + FRAME_AZIMUTH_DELTA_RAD
    );
    const rawCrossTangent = normalizedVector([
      0,
      after.yM - before.yM,
      after.zM - before.zM
    ]);
    if (!axialTangent || !rawCrossTangent) return null;
    let normal = normalizedVector(cross(rawCrossTangent, axialTangent));
    if (!normal) return null;
    let crossTangent = normalizedVector(cross(axialTangent, normal));
    if (!crossTangent) return null;

    const outward = [
      0,
      station.wallPointM.yM,
      station.wallPointM.zM
    ];
    if (dot(normal, outward) < 0) {
      normal = normal.map(value => -value);
      crossTangent = crossTangent.map(value => -value);
    }
    if (![...axialTangent, ...crossTangent, ...normal].every(finite) ||
        Math.abs(dot(axialTangent, crossTangent)) > 1e-9 ||
        Math.abs(dot(axialTangent, normal)) > 1e-9 ||
        Math.abs(dot(crossTangent, normal)) > 1e-9) {
      return null;
    }
    return {
      axialTangent: vectorRecord(axialTangent),
      crossTangent: vectorRecord(crossTangent),
      normal: vectorRecord(normal),
      handedness: "crossTangent-x-axialTangent=normal",
      normalOrientation: "outward"
    };
  }

  function toleranceFor(value) {
    return Math.max(1e-12, 1e-9 * Math.max(1, Math.abs(value)));
  }

  function closeEnough(actual, expected) {
    return finite(actual) &&
      finite(expected) &&
      Math.abs(actual - expected) <= toleranceFor(expected);
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    if (isRecord(value)) {
      return `{${Object.keys(value).sort().map(
        key => `${JSON.stringify(key)}:${stableStringify(value[key])}`
      ).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function fnv1a32(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function surfaceHash(input, profile, stations) {
    return `hs1-${fnv1a32(stableStringify({
      schemaVersion: SCHEMA_VERSION,
      throat: input.throat,
      mouth: input.mouth,
      depthM: input.depthM,
      surfaceLaw: {
        family: profile.family,
        parameters: input.surfaceLaw.parameters
      },
      crossSection: input.crossSection,
      azimuthRad: canonicalAzimuth(input.azimuthRad),
      profileHash: profile.profileHash,
      sampling: input.sampling,
      stations: stations.map(station => [
        station.axialM,
        station.localEquivalentRadiusM,
        station.section.widthM,
        station.section.heightM,
        station.sectionAreaM2,
        station.sectionPerimeterM,
        station.wallPointM.yM,
        station.wallPointM.zM
      ])
    }))}`;
  }

  function profileSummary(profile) {
    return {
      provider: "profile-laws.js",
      providerApiVersion: profileLaws.API_VERSION,
      family: profile.family,
      lawId: profile.lawId,
      label: profile.label,
      source: profile.source,
      exactness: profile.exactness,
      synthesis: profile.synthesis,
      nativeDomain: profile.nativeDomain,
      nativeTermination: profile.nativeTermination,
      terminationPolicy: profile.terminationPolicy,
      coverageClaim: false,
      profileHash: profile.profileHash,
      sampleHash: profile.sampleHash,
      sampleCount: profile.sampleCount,
      extent: cloneJsonRecord(profile.extent),
      monotonic: cloneJsonRecord(profile.monotonic),
      ...(profile.truncation
        ? { truncation: cloneJsonRecord(profile.truncation) }
        : {})
    };
  }

  function solveHornSurface(rawInput) {
    const normalized = normalizeInput(rawInput);
    if (!normalized.ok) {
      return failure(normalized.diagnostics, normalized.evidenceRefs);
    }
    const input = normalized.value;
    const exponent = input.crossSection.exponent;
    const areaCoefficient = lameAreaCoefficient(exponent);
    const throatAreaM2 = areaCoefficient *
      input.throat.widthM *
      input.throat.heightM /
      4;
    const mouthAreaM2 = areaCoefficient *
      input.mouth.widthM *
      input.mouth.heightM /
      4;
    const throatRadiusM = Math.sqrt(throatAreaM2 / Math.PI);
    const mouthRadiusM = Math.sqrt(mouthAreaM2 / Math.PI);
    const profileConfig = {
      family: input.surfaceLaw.family,
      ...input.surfaceLaw.parameters,
      throatRadius: throatRadiusM,
      mouthRadius: mouthRadiusM,
      axialLength: input.depthM,
      samples: input.sampling.axialStationCount
    };
    const profile = profileLaws.solveProfileLaw(profileConfig);
    if (!profile.ok) {
      return failure([errorDiagnostic(
        DIAGNOSTIC_CODES.profileRefused,
        ["surfaceLaw", "throat", "mouth", "depthM"],
        `The canonical profile-law provider refused this horn: ${
          (profile.errors || []).join(" ") || profile.code
        }`,
        {
          causeCode: profile.code || null,
          causeErrors: [...(profile.errors || [])],
          profileFamily: profile.family || input.surfaceLaw.family
        }
      )], input.provenanceRefs);
    }

    if (!closeEnough(profile.endpoints.throat.r, throatRadiusM) ||
        !closeEnough(profile.endpoints.mouth.r, mouthRadiusM) ||
        !closeEnough(profile.endpoints.throat.x, 0) ||
        !closeEnough(profile.endpoints.mouth.x, input.depthM)) {
      return failure([errorDiagnostic(
        DIAGNOSTIC_CODES.endpointMismatch,
        ["throat", "mouth", "depthM", "surfaceLaw"],
        "The canonical axial profile did not preserve the explicit equivalent-area endpoints."
      )], input.provenanceRefs);
    }

    const throatAspect = input.throat.widthM / input.throat.heightM;
    const mouthAspect = input.mouth.widthM / input.mouth.heightM;
    const logThroatAspect = Math.log(throatAspect);
    const logMouthAspect = Math.log(mouthAspect);
    const azimuthRad = canonicalAzimuth(input.azimuthRad);
    const rawStations = [];
    for (let index = 0; index < profile.stations.length; index++) {
      const meridian = profile.stations[index];
      const axialFraction = Math.max(
        0,
        Math.min(1, meridian.x / input.depthM)
      );
      const aspect = Math.exp(
        logThroatAspect +
        (logMouthAspect - logThroatAspect) * axialFraction
      );
      const sectionAreaM2 = Math.PI * meridian.r ** 2;
      const semiWidthM = Math.sqrt(
        sectionAreaM2 * aspect / areaCoefficient
      );
      const semiHeightM = Math.sqrt(
        sectionAreaM2 / (areaCoefficient * aspect)
      );
      const perimeter = sampledPerimeter(
        semiWidthM,
        semiHeightM,
        exponent,
        input.sampling.perimeterSampleCount
      );
      const sectionWallPoint = sectionPoint(
        semiWidthM,
        semiHeightM,
        exponent,
        azimuthRad
      );
      rawStations.push({
        index,
        meridian,
        axialFraction,
        localEquivalentRadiusM: meridian.r,
        sectionAreaM2,
        sectionPerimeterM: perimeter.valueM,
        sectionPerimeterErrorEstimateM: perimeter.errorEstimateM,
        section: {
          family: input.crossSection.family,
          exponent,
          widthM: 2 * semiWidthM,
          heightM: 2 * semiHeightM,
          semiWidthM,
          semiHeightM,
          aspectRatio: aspect,
          areaCoefficient,
          perimeterSampling: perimeter
        },
        wallPointM: {
          xM: meridian.x,
          yM: sectionWallPoint.yM,
          zM: sectionWallPoint.zM
        }
      });
    }

    const stationDiagnostics = [];
    for (let index = 0; index < rawStations.length; index++) {
      const station = rawStations[index];
      if (![station.meridian.x,
        station.localEquivalentRadiusM,
        station.sectionAreaM2,
        station.sectionPerimeterM,
        station.section.widthM,
        station.section.heightM,
        station.wallPointM.xM,
        station.wallPointM.yM,
        station.wallPointM.zM].every(finite)) {
        stationDiagnostics.push(errorDiagnostic(
          DIAGNOSTIC_CODES.inputInvalid,
          [`stations[${index}]`],
          "A horn station contains a non-finite geometric value."
        ));
        break;
      }
      if (index > 0) {
        const previous = rawStations[index - 1];
        if (!(station.meridian.x > previous.meridian.x)) {
          stationDiagnostics.push(errorDiagnostic(
            DIAGNOSTIC_CODES.areaNonmonotonic,
            [`stations[${index - 1}]`, `stations[${index}]`],
            "Axial horn stations must be strictly increasing."
          ));
          break;
        }
        if (station.sectionAreaM2 + toleranceFor(station.sectionAreaM2) <
            previous.sectionAreaM2) {
          stationDiagnostics.push(errorDiagnostic(
            DIAGNOSTIC_CODES.areaNonmonotonic,
            [`stations[${index - 1}]`, `stations[${index}]`],
            "Section area must be monotonically nondecreasing."
          ));
          break;
        }
        if (station.section.widthM + toleranceFor(station.section.widthM) <
              previous.section.widthM ||
            station.section.heightM + toleranceFor(station.section.heightM) <
              previous.section.heightM) {
          stationDiagnostics.push(errorDiagnostic(
            DIAGNOSTIC_CODES.sectionNonmonotonic,
            [`stations[${index - 1}]`, `stations[${index}]`],
            "The declared area/aspect mapping folds one section axis and was refused."
          ));
          break;
        }
      }
    }
    if (stationDiagnostics.length) {
      return failure(stationDiagnostics, input.provenanceRefs);
    }

    const first = rawStations[0];
    const last = rawStations[rawStations.length - 1];
    if (!closeEnough(first.meridian.x, 0) ||
        !closeEnough(last.meridian.x, input.depthM) ||
        !closeEnough(first.section.widthM, input.throat.widthM) ||
        !closeEnough(first.section.heightM, input.throat.heightM) ||
        !closeEnough(last.section.widthM, input.mouth.widthM) ||
        !closeEnough(last.section.heightM, input.mouth.heightM) ||
        !closeEnough(first.sectionAreaM2, throatAreaM2) ||
        !closeEnough(last.sectionAreaM2, mouthAreaM2)) {
      return failure([errorDiagnostic(
        DIAGNOSTIC_CODES.endpointMismatch,
        ["throat", "mouth", "depthM"],
        "Canonical station generation failed to reproduce an explicit horn endpoint."
      )], input.provenanceRefs);
    }

    const stations = [];
    for (let index = 0; index < rawStations.length; index++) {
      const raw = rawStations[index];
      const frame = localFrame(rawStations, index, azimuthRad);
      if (!frame) {
        return failure([errorDiagnostic(
          DIAGNOSTIC_CODES.frameInvalid,
          [`stations[${index}].localFrame`],
          "A finite orthonormal local wall frame could not be constructed."
        )], input.provenanceRefs);
      }
      stations.push({
        index,
        u: raw.meridian.u,
        axialM: raw.meridian.x,
        axialFraction: raw.axialFraction,
        localEquivalentRadiusM: raw.localEquivalentRadiusM,
        sectionAreaM2: raw.sectionAreaM2,
        sectionPerimeterM: raw.sectionPerimeterM,
        sectionPerimeterErrorEstimateM:
          raw.sectionPerimeterErrorEstimateM,
        section: raw.section,
        meridian: {
          xM: raw.meridian.x,
          radiusM: raw.meridian.r,
          slope: raw.meridian.slope,
          tangentAngleRad: raw.meridian.tangentAngle,
          curvaturePerM: raw.meridian.curvature,
          arcLengthM: raw.meridian.arcLength
        },
        wallPointM: raw.wallPointM,
        localFrame: frame
      });
    }

    const canonicalInput = {
      schemaVersion: SCHEMA_VERSION,
      throat: cloneJsonRecord(input.throat),
      mouth: cloneJsonRecord(input.mouth),
      depthM: input.depthM,
      coverageDeg: cloneJsonRecord(input.coverageDeg),
      surfaceLaw: {
        family: profile.family,
        requestedFamily: input.surfaceLaw.family,
        parameters: cloneJsonRecord(input.surfaceLaw.parameters)
      },
      crossSection: {
        family: input.crossSection.family,
        requestedFamily: input.crossSection.requestedFamily,
        parameters: { exponent }
      },
      azimuthRad: input.azimuthRad,
      sampling: cloneJsonRecord(input.sampling),
      provenanceRefs: [...input.provenanceRefs]
    };
    const profileRecord = profileSummary(profile);
    const mappingDiagnostic = makeDiagnostic(
      DIAGNOSTIC_CODES.mappingNotCoverage,
      "info",
      "horn-surface",
      ["crossSection", "coverageDeg"],
      "Area-preserving axis stretch is a section mapping, never a coverage law or coverage claim.",
      input.provenanceRefs,
      []
    );
    const result = {
      ok: true,
      apiVersion: API_VERSION,
      schemaVersion: SCHEMA_VERSION,
      kind: "threeway-horn-surface",
      surfaceHash: surfaceHash(input, profile, stations),
      input: canonicalInput,
      coordinateSystem: {
        origin: "throat-center",
        axialAxis: "+x",
        horizontalAxis: "+y",
        verticalAxis: "+z",
        azimuthOrigin: "+y",
        azimuthDirection: "+y-toward-+z"
      },
      azimuth: {
        declaredRad: input.azimuthRad,
        canonicalRad: azimuthRad
      },
      coverage: {
        declaredDeg: cloneJsonRecord(input.coverageDeg),
        claim: false,
        derivedFromGeometry: false,
        note:
          "Coverage is preserved as declared intent; this surface solver " +
          "does not assert that section stretch realizes it."
      },
      sectionMapping: {
        id: SECTION_MAPPING_ID,
        kind: "cross-section-mapping",
        independentVariable: "normalized-axial-coordinate",
        areaBasis: "canonical-profile-equivalent-radius",
        aspectInterpolation: "log-linear",
        coverageClaim: false,
        note:
          "This mapping changes section axes while preserving equivalent " +
          "area. It is not a rectangular coverage claim."
      },
      crossSection: {
        family: input.crossSection.family,
        exponent,
        equation: CROSS_SECTION_SCHEMAS[input.crossSection.family].equation,
        areaCoefficient,
        areaMethod:
          CROSS_SECTION_SCHEMAS[input.crossSection.family].areaMethod,
        perimeterMethod:
          CROSS_SECTION_SCHEMAS[input.crossSection.family].perimeterMethod,
        perimeterSampleCount: input.sampling.perimeterSampleCount
      },
      profile: profileRecord,
      stations,
      endpoints: {
        throat: stations[0],
        mouth: stations[stations.length - 1]
      },
      diagnostics: [mappingDiagnostic],
      provenance: {
        module: "threeway-horn-surface.js",
        moduleApiVersion: API_VERSION,
        contract: "explicit-schema-2-horn-input",
        evidenceRefs: [...input.provenanceRefs],
        basisRefs: [
          "profile-laws.js@api-1",
          "docs/threeway-rebuild-blueprint.md",
          "docs/threeway-king-2026-math-notes.md"
        ],
        axialProfile: {
          provider: "profile-laws.js",
          providerApiVersion: profileLaws.API_VERSION,
          lawId: profile.lawId,
          profileHash: profile.profileHash,
          source: profile.source,
          exactness: profile.exactness,
          coverageClaim: false
        },
        crossSection: {
          provider: "threeway-horn-surface.js",
          law: CROSS_SECTION_SCHEMAS[input.crossSection.family].equation,
          areaMethod:
            CROSS_SECTION_SCHEMAS[input.crossSection.family].areaMethod,
          perimeterMethod:
            CROSS_SECTION_SCHEMAS[input.crossSection.family].perimeterMethod,
          hardwareValidated: false,
          manufacturing: false
        }
      },
      hardwareValidated: false,
      manufacturing: false,
      capabilities: CAPABILITIES
    };
    return deepFreeze(result);
  }

  return deepFreeze({
    API_VERSION,
    SCHEMA_VERSION,
    DIAGNOSTIC_CODES,
    CROSS_SECTION_SCHEMAS,
    CAPABILITIES,
    solveHornSurface,
    solveThreeWayHornSurface: solveHornSurface
  });
}));
