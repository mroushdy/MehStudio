/* MEH Studio v5 — pure schema-2 three-way physical interface planner.

   This module is the explicit bridge between solved station/aperture/driver
   intent and the canonical passage + mount solvers. Aperture-solver candidates
   are immutable per-driver templates. Every physical driver instance receives
   unique physical candidate, layout, aperture, chamber-interface, passage, and
   mount-binding identities while preserving the template geometry verbatim.

   The planner performs no acoustic optimization, count inference, mesh work,
   Boolean operation, rendering, manufacturing validation, or file export. */
(function attachThreeWayInterfacePlanner(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3InterfacePlanner = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createApi() {
  "use strict";

  const VERSION = 1;
  const SCHEMA_VERSION = 2;
  const HASH_VERSION = "meh3-interface-plan-v1";
  const TAU = 2 * Math.PI;
  const EPS = 1e-12;
  const DISTRIBUTIONS = Object.freeze(["rotational", "panel-pairs"]);
  const AXIS_POLICIES = Object.freeze(["wall-normal", "explicit-blend"]);
  const PATH_FAMILIES = Object.freeze(["straight", "cubic-hermite"]);

  const FAILURE_CODES = Object.freeze({
    INPUT_INVALID: "THREEWAY_INTERFACE_INPUT_INVALID",
    STATE_INVALID: "THREEWAY_INTERFACE_STATE_INVALID",
    HORN_INVALID: "THREEWAY_INTERFACE_HORN_INVALID",
    STATION_INVALID: "THREEWAY_INTERFACE_STATION_INVALID",
    APERTURE_INVALID: "THREEWAY_INTERFACE_APERTURE_INVALID",
    DRIVER_INVALID: "THREEWAY_INTERFACE_DRIVER_INVALID",
    PLACEMENT_INVALID: "THREEWAY_INTERFACE_PLACEMENT_INVALID",
    OWNERSHIP_INVALID: "THREEWAY_INTERFACE_OWNERSHIP_INVALID",
    COUNT_MISMATCH: "THREEWAY_INTERFACE_COUNT_MISMATCH",
    HASH_CONFLICT: "THREEWAY_INTERFACE_HASH_CONFLICT",
    SURFACE_INTERPOLATION_FAILED:
      "THREEWAY_INTERFACE_SURFACE_INTERPOLATION_FAILED",
    FRAME_INVALID: "THREEWAY_INTERFACE_FRAME_INVALID",
    SETBACK_INVALID: "THREEWAY_INTERFACE_SETBACK_INVALID",
    ACTIVE_CONE_CONFLICT: "THREEWAY_INTERFACE_ACTIVE_CONE_CONFLICT",
    OUTPUT_CONFLICT: "THREEWAY_INTERFACE_OUTPUT_CONFLICT",
    PANEL_INVALID: "THREEWAY_INTERFACE_PANEL_INVALID",
    DRIVER_COLLISION: "THREEWAY_INTERFACE_DRIVER_COLLISION",
    HOST_SPAN_INVALID: "THREEWAY_INTERFACE_HOST_SPAN_INVALID",
    PATH_INVALID: "THREEWAY_INTERFACE_PATH_INVALID",
    CURVED_PATH_UNREPRESENTED:
      "THREEWAY_INTERFACE_CURVED_PATH_UNREPRESENTED",
    INSTANCE_APERTURE_CONTRACT_UNSUPPORTED:
      "THREEWAY_INSTANCE_APERTURE_CONTRACT_UNSUPPORTED"
  });

  const CAPABILITIES = deepFreeze({
    schema2Only: true,
    canonicalPhysicalApertureIdentity: true,
    hornSurfaceInterpolation: true,
    rotationalCovariance: true,
    panelGrouping: true,
    straightPaths: true,
    explicitRepresentedCurvedPaths: true,
    productInference: false,
    mouthInference: false,
    crossoverInference: false,
    sourceCountInference: false,
    apertureMotion: false,
    apertureRotation: false,
    apertureRescaling: false,
    meshGeneration: false,
    booleanUnion: false,
    booleanSubtraction: false,
    exactSolid: false,
    manufacturing: false,
    stl: false,
    hardwareValidated: false,
    acousticValidated: false,
    reason:
      "This pure planner emits analysis geometry and downstream intent only. " +
      "Exact solids, fabrication, hardware, and acoustic validation remain " +
      "separate evidence-gated operations."
  });

  const MODEL_METADATA = deepFreeze({
    id: "meh3-physical-interface-planner",
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    hashVersion: HASH_VERSION,
    coordinateSystem: {
      origin: "horn-throat-center",
      axialAxis: "+x",
      azimuthRotationAxis: "+x",
      distanceUnit: "m",
      angleUnit: "rad"
    },
    apertureIdentity:
      "A solved aperture candidate is a per-driver template. Physical " +
      "apertures are instance-qualified copies with unchanged center, angle, " +
      "shape, and area plus templateApertureId provenance.",
    downstreamBoundary:
      "Passage/mount solver v1 cannot jointly represent more than one " +
      "physical instance of one source template. The planner keeps correct " +
      "physical identities and emits a typed compatibility diagnostic instead " +
      "of reusing an aperture or passage ID.",
    hardwareValidated: false,
    acousticValidated: false,
    exactSolid: false,
    manufacturing: false
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function isRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function positive(value) {
    return finite(value) && value > 0 ? value : null;
  }

  function nonnegative(value) {
    return finite(value) && value >= 0 ? value : null;
  }

  function positiveInteger(value) {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
  }

  function uniqueStrings(value) {
    return Array.isArray(value)
      ? [...new Set(value.map(cleanString).filter(Boolean))].sort()
      : [];
  }

  function cloneData(value, stack) {
    const seen = stack || new Set();
    if (value === null || typeof value === "string" ||
        typeof value === "boolean") return value;
    if (finite(value)) return Object.is(value, -0) ? 0 : value;
    if (typeof value === "number" || typeof value === "undefined" ||
        typeof value === "function" || typeof value === "symbol" ||
        typeof value === "bigint") {
      throw new TypeError("Input must contain finite JSON data only.");
    }
    if (typeof value !== "object" || !value) {
      throw new TypeError("Input must contain JSON data only.");
    }
    if (seen.has(value)) throw new TypeError("Cyclic input is not supported.");
    seen.add(value);
    let copy;
    if (Array.isArray(value)) {
      copy = value.map(item => cloneData(item, seen));
    } else {
      if (!isRecord(value)) {
        throw new TypeError("Class instances are not accepted as evidence.");
      }
      copy = {};
      for (const key of Object.keys(value)) {
        copy[key] = cloneData(value[key], seen);
      }
    }
    seen.delete(value);
    return copy;
  }

  function stableClone(value) {
    if (Array.isArray(value)) return value.map(stableClone);
    if (isRecord(value)) {
      const result = {};
      for (const key of Object.keys(value).sort()) {
        result[key] = stableClone(value[key]);
      }
      return result;
    }
    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(stableClone(value));
  }

  function diagnostic(code, severity, paths, message, details) {
    return deepFreeze({
      code,
      severity,
      phase: "physical-interface-planning",
      paths: uniqueStrings(paths),
      message,
      details: isRecord(details) ? stableClone(details) : {},
      blocksCapabilities: severity === "error"
        ? [
          "passageIntent", "mountIntent", "preview", "exactSolid",
          "manufacturing", "stl"
        ]
        : []
    });
  }

  function sortedDiagnostics(items) {
    return items.slice().sort((left, right) => [
      left.severity, left.code, left.paths.join("\u0000"), left.message
    ].join("\u0001").localeCompare([
      right.severity, right.code, right.paths.join("\u0000"), right.message
    ].join("\u0001")));
  }

  function failure(diagnostics, preservedHashes) {
    const ordered = sortedDiagnostics(diagnostics);
    return deepFreeze({
      ok: false,
      code: ordered.length
        ? ordered[0].code
        : FAILURE_CODES.INPUT_INVALID,
      result: null,
      diagnostics: ordered,
      preservedHashes: stableClone(preservedHashes || {}),
      exactSolid: false,
      manufacturing: false,
      stl: false,
      model: MODEL_METADATA,
      capabilities: CAPABILITIES
    });
  }

  function vec3(value) {
    return Array.isArray(value) && value.length === 3 &&
      value.every(finite)
      ? value.slice()
      : null;
  }

  function vectorRecord(value) {
    if (Array.isArray(value)) return vec3(value);
    if (!isRecord(value)) return null;
    return [value.x, value.y, value.z].every(finite)
      ? [value.x, value.y, value.z]
      : null;
  }

  function pointRecord(value) {
    if (Array.isArray(value)) return vec3(value);
    if (!isRecord(value)) return null;
    return [value.xM, value.yM, value.zM].every(finite)
      ? [value.xM, value.yM, value.zM]
      : null;
  }

  function add(left, right) {
    return [
      left[0] + right[0],
      left[1] + right[1],
      left[2] + right[2]
    ];
  }

  function subtract(left, right) {
    return [
      left[0] - right[0],
      left[1] - right[1],
      left[2] - right[2]
    ];
  }

  function scale(vector, amount) {
    return vector.map(value => value * amount);
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

  function length(vector) {
    return Math.hypot(...vector);
  }

  function normalize(vector) {
    const magnitude = vector ? length(vector) : 0;
    return finite(magnitude) && magnitude > EPS
      ? scale(vector, 1 / magnitude)
      : null;
  }

  function distance(left, right) {
    return length(subtract(left, right));
  }

  function lerp(left, right, fraction) {
    return left + (right - left) * fraction;
  }

  function lerpVector(left, right, fraction) {
    return left.map((value, index) =>
      lerp(value, right[index], fraction)
    );
  }

  function rotateAboutX(vector, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [
      vector[0],
      cosine * vector[1] - sine * vector[2],
      sine * vector[1] + cosine * vector[2]
    ];
  }

  function normalizeAngle(value) {
    if (!finite(value)) return null;
    let result = value % TAU;
    if (result < 0) result += TAU;
    return Math.abs(result - TAU) <= EPS ? 0 : result;
  }

  function angleDistance(left, right) {
    const delta = Math.abs(left - right) % TAU;
    return Math.min(delta, TAU - delta);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function angleDeg(left, right) {
    return Math.acos(clamp(dot(left, right), -1, 1)) * 180 / Math.PI;
  }

  function lineAngleDeg(left, right) {
    const angle = angleDeg(left, right);
    return Math.min(angle, 180 - angle);
  }

  function projectOntoPlane(vector, normal) {
    return subtract(vector, scale(normal, dot(vector, normal)));
  }

  function frameValid(normal, axial, crossAxis, toleranceDeg) {
    if (!normal || !axial || !crossAxis) return false;
    const tolerance = Math.sin(toleranceDeg * Math.PI / 180);
    return Math.max(
      Math.abs(dot(normal, axial)),
      Math.abs(dot(normal, crossAxis)),
      Math.abs(dot(axial, crossAxis))
    ) <= tolerance &&
      dot(cross(crossAxis, axial), normal) >=
        Math.cos(toleranceDeg * Math.PI / 180);
  }

  function parseValidation(raw, diagnostics) {
    const value = isRecord(raw) ? raw : {};
    const result = {
      positionToleranceM: positive(value.positionToleranceM),
      sectionToleranceM: positive(value.sectionToleranceM),
      angleToleranceDeg: positive(value.angleToleranceDeg),
      azimuthToleranceRad: positive(value.azimuthToleranceRad),
      minimumDriverClearanceM:
        nonnegative(value.minimumDriverClearanceM)
    };
    if (Object.values(result).some(value => value === null) ||
        result.angleToleranceDeg > 5) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        "error",
        ["validation"],
        "Explicit positive position/section/azimuth tolerances, an angle " +
          "tolerance no greater than five degrees, and a nonnegative minimum " +
          "driver clearance are required."
      ));
    }
    return result;
  }

  function stateContext(raw, diagnostics) {
    if (!isRecord(raw) ||
        raw.schemaVersion !== SCHEMA_VERSION ||
        !isRecord(raw.topology) ||
        !cleanString(raw.topology.kind) ||
        !Array.isArray(raw.sources) ||
        !Array.isArray(raw.entryStations)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATE_INVALID,
        "error",
        ["state"],
        "A normalized schema-2 state with explicit sources and entry " +
          "stations is required."
      ));
      return { state: null, sources: new Map(), stations: new Map() };
    }
    const sources = new Map();
    for (const item of raw.sources) {
      const id = cleanString(item && item.id);
      const count = positiveInteger(item && item.count);
      const bands = uniqueStrings(item && item.bandIds);
      if (!id || sources.has(id) || count === null || !bands.length) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATE_INVALID,
          "error",
          ["state.sources"],
          "State sources require unique IDs, explicit positive counts, and " +
            "one or more bands."
        ));
      }
      if (id) sources.set(id, {
        id,
        count,
        bandIds: bands,
        driverRef: cleanString(item.driverRef),
        record: item
      });
    }
    const stations = new Map();
    for (const item of raw.entryStations) {
      const id = cleanString(item && item.id);
      const sourceIds = uniqueStrings(item && item.sourceIds);
      const bands = uniqueStrings(item && item.bandIds);
      if (!id || stations.has(id) || !sourceIds.length || !bands.length) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATE_INVALID,
          "error",
          ["state.entryStations"],
          "State entry stations require unique IDs and explicit source/band " +
            "ownership."
        ));
      }
      if (id) stations.set(id, {
        id,
        sourceIds,
        bandIds: bands,
        record: item
      });
    }
    return { state: raw, sources, stations };
  }

  function normalizeHornFrame(station, path, validation, diagnostics) {
    const originM = pointRecord(station && station.wallPointM);
    const frame = isRecord(station && station.localFrame)
      ? station.localFrame
      : {};
    const normal = normalize(vectorRecord(frame.normal));
    const axialTangent = normalize(vectorRecord(frame.axialTangent));
    const crossTangent = normalize(vectorRecord(frame.crossTangent));
    if (!originM ||
        !frameValid(
          normal,
          axialTangent,
          crossTangent,
          validation.angleToleranceDeg
        )) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.FRAME_INVALID,
        "error",
        [path],
        "Every horn sample requires a finite wall point and an explicit " +
          "right-handed frame satisfying crossTangent × axialTangent = " +
          "outward normal."
      ));
      return null;
    }
    return { originM, normal, axialTangent, crossTangent };
  }

  function hornContext(raw, validation, diagnostics) {
    if (!isRecord(raw) ||
        raw.ok !== true ||
        raw.kind !== "threeway-horn-surface" ||
        !cleanString(raw.surfaceHash) ||
        !Array.isArray(raw.stations) ||
        raw.stations.length < 2 ||
        !isRecord(raw.azimuth) ||
        normalizeAngle(raw.azimuth.canonicalRad) === null) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.HORN_INVALID,
        "error",
        ["hornSurface"],
        "A successful canonical horn surface with hash, declared base " +
          "azimuth, and at least two stations is required."
      ));
      return { horn: null, samples: [], baseAzimuthRad: null };
    }
    const samples = raw.stations.map((station, index) => {
      const axialM = finite(station && station.axialM)
        ? station.axialM
        : null;
      const section = isRecord(station && station.section)
        ? station.section
        : {};
      const frame = normalizeHornFrame(
        station,
        `hornSurface.stations[${index}]`,
        validation,
        diagnostics
      );
      if (axialM === null ||
          !cleanString(section.family) ||
          positive(section.widthM) === null ||
          positive(section.heightM) === null ||
          positive(section.exponent) === null ||
          !frame) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HORN_INVALID,
          "error",
          [`hornSurface.stations[${index}]`],
          "Horn stations require finite axial coordinate, section, wall " +
            "point, and local frame."
        ));
      }
      return {
        index,
        axialM,
        section: {
          family: cleanString(section.family),
          exponent: positive(section.exponent),
          widthM: positive(section.widthM),
          heightM: positive(section.heightM),
          semiWidthM: positive(section.semiWidthM),
          semiHeightM: positive(section.semiHeightM),
          aspectRatio: positive(section.aspectRatio)
        },
        frame
      };
    }).sort((left, right) => left.axialM - right.axialM);
    for (let index = 1; index < samples.length; index++) {
      if (!(samples[index].axialM > samples[index - 1].axialM)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HORN_INVALID,
          "error",
          ["hornSurface.stations"],
          "Horn surface station axial coordinates must be finite, unique, " +
            "and strictly increasing."
        ));
      }
    }
    return {
      horn: raw,
      samples,
      baseAzimuthRad: normalizeAngle(raw.azimuth.canonicalRad)
    };
  }

  function interpolateHorn(context, axialM, diagnostics) {
    const samples = context.samples;
    if (!samples.length ||
        axialM < samples[0].axialM - EPS ||
        axialM > samples[samples.length - 1].axialM + EPS) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SURFACE_INTERPOLATION_FAILED,
        "error",
        ["stationResult", "hornSurface.stations"],
        "The solved station axial coordinate lies outside the canonical horn " +
          "surface."
      ));
      return null;
    }
    let left = samples[0];
    let right = samples[0];
    for (let index = 1; index < samples.length; index++) {
      right = samples[index];
      left = samples[index - 1];
      if (axialM <= right.axialM + EPS) break;
    }
    const span = right.axialM - left.axialM;
    const fraction = span > EPS
      ? clamp((axialM - left.axialM) / span, 0, 1)
      : 0;
    const originM = lerpVector(
      left.frame.originM,
      right.frame.originM,
      fraction
    );
    const axialTangent = normalize(lerpVector(
      left.frame.axialTangent,
      right.frame.axialTangent,
      fraction
    ));
    let crossTangent = normalize(lerpVector(
      left.frame.crossTangent,
      right.frame.crossTangent,
      fraction
    ));
    let normal = axialTangent && crossTangent
      ? normalize(cross(crossTangent, axialTangent))
      : null;
    if (normal && dot(normal, [0, originM[1], originM[2]]) < 0) {
      normal = scale(normal, -1);
      crossTangent = scale(crossTangent, -1);
    }
    crossTangent = axialTangent && normal
      ? normalize(cross(axialTangent, normal))
      : null;
    if (!frameValid(
      normal,
      axialTangent,
      crossTangent,
      0.001
    )) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SURFACE_INTERPOLATION_FAILED,
        "error",
        ["hornSurface.stations[].localFrame"],
        "Interpolated horn axes could not be orthonormalized without " +
          "changing the solved station."
      ));
      return null;
    }
    return {
      axialM,
      sourceStationIndices: [left.index, right.index],
      interpolationFraction: fraction,
      originM,
      normal,
      axialTangent,
      crossTangent,
      section: {
        family: left.section.family,
        exponent: lerp(
          left.section.exponent,
          right.section.exponent,
          fraction
        ),
        widthM: lerp(
          left.section.widthM,
          right.section.widthM,
          fraction
        ),
        heightM: lerp(
          left.section.heightM,
          right.section.heightM,
          fraction
        ),
        semiWidthM: left.section.semiWidthM !== null &&
            right.section.semiWidthM !== null
          ? lerp(
            left.section.semiWidthM,
            right.section.semiWidthM,
            fraction
          )
          : null,
        semiHeightM: left.section.semiHeightM !== null &&
            right.section.semiHeightM !== null
          ? lerp(
            left.section.semiHeightM,
            right.section.semiHeightM,
            fraction
          )
          : null,
        aspectRatio: left.section.aspectRatio !== null &&
            right.section.aspectRatio !== null
          ? lerp(
            left.section.aspectRatio,
            right.section.aspectRatio,
            fraction
          )
          : null
      }
    };
  }

  function rotateHornQuery(query, baseAzimuthRad, azimuthRad) {
    const delta = azimuthRad - baseAzimuthRad;
    return {
      axialM: query.axialM,
      azimuthRad,
      baseAzimuthRad,
      rotationAboutXAxisRad: delta,
      sourceStationIndices: query.sourceStationIndices.slice(),
      interpolationFraction: query.interpolationFraction,
      originM: rotateAboutX(query.originM, delta),
      normal: rotateAboutX(query.normal, delta),
      axialTangent: rotateAboutX(query.axialTangent, delta),
      crossTangent: rotateAboutX(query.crossTangent, delta),
      section: stableClone(query.section)
    };
  }

  function stationContext(raw, state, horn, diagnostics) {
    const payload = isRecord(raw) && isRecord(raw.result)
      ? raw.result
      : null;
    if (!isRecord(raw) ||
        raw.ok !== true ||
        !payload ||
        payload.schemaVersion !== SCHEMA_VERSION ||
        !Array.isArray(payload.selectedEntryStations) ||
        cleanString(payload.hornSurfaceHash) !==
          cleanString(horn.horn && horn.horn.surfaceHash)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_INVALID,
        "error",
        ["stationResult"],
        "A successful schema-2 station result tied to the exact horn surface " +
          "hash is required."
      ));
      return new Map();
    }
    const topology = isRecord(payload.topology)
      ? cleanString(payload.topology.kind)
      : cleanString(payload.topology);
    if (topology !== state.state.topology.kind) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        "error",
        ["state.topology.kind", "stationResult.result.topology"],
        "State and station-result topology must match exactly."
      ));
    }
    const result = new Map();
    for (const item of payload.selectedEntryStations) {
      const id = cleanString(item && item.stationId);
      const sourceIds = uniqueStrings(item && item.sourceIds);
      const bandIds = uniqueStrings(item && item.bandIds);
      const count = positiveInteger(item && item.sourceCount);
      const distribution = cleanString(item && item.distribution);
      const axialM = finite(item && item.axialM) ? item.axialM : null;
      const requiredAxialSpanM = positive(
        item && item.requiredAxialSpanM
      );
      const azimuths = item && item.circumferential &&
          Array.isArray(item.circumferential.sourceAzimuthsRad)
        ? item.circumferential.sourceAzimuthsRad.map(normalizeAngle)
        : [];
      const stateStation = state.stations.get(id);
      if (!id ||
          result.has(id) ||
          !stateStation ||
          !sourceIds.length ||
          !bandIds.length ||
          count === null ||
          !DISTRIBUTIONS.includes(distribution) ||
          axialM === null ||
          requiredAxialSpanM === null ||
          azimuths.length !== count ||
          azimuths.some(value => value === null)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_INVALID,
          "error",
          [`stationResult.result.selectedEntryStations[${id || "?"}]`],
          "Each solved station needs exact state ownership, source count, " +
            "distribution, axial span, and one finite solved azimuth per " +
            "physical instance."
        ));
      }
      if (stateStation &&
          (stableStringify(sourceIds) !==
            stableStringify(stateStation.sourceIds) ||
           bandIds.some(band => !stateStation.bandIds.includes(band)))) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          "error",
          [`stationResult.result.selectedEntryStations[${id}]`],
          "Solved station source/band ownership conflicts with schema-2 state."
        ));
      }
      if (item && item.hornQuery &&
          (cleanString(item.hornQuery.surfaceRevision) !==
             horn.horn.surfaceHash ||
           finite(item.hornQuery.axialCoordinateM) &&
             Math.abs(item.hornQuery.axialCoordinateM - axialM) > EPS)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HASH_CONFLICT,
          "error",
          [`stationResult.result.selectedEntryStations[${id}].hornQuery`],
          "The solved station horn query must preserve the exact horn surface " +
            "hash and axial coordinate."
        ));
      }
      if (id) result.set(id, {
        id,
        sourceIds,
        bandIds,
        sourceCount: count,
        distribution,
        axialM,
        requiredAxialSpanM,
        sourceAzimuthsRad: azimuths,
        record: item
      });
    }
    return result;
  }

  function apertureContext(raw, diagnostics) {
    if (!isRecord(raw) || raw.ok !== true || !Array.isArray(raw.sources)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_INVALID,
        "error",
        ["apertureResult"],
        "A successful explicit aperture-candidate result is required."
      ));
      return new Map();
    }
    const sources = new Map();
    for (const item of raw.sources) {
      const sourceId = cleanString(item && item.sourceId);
      if (!sourceId ||
          sources.has(sourceId) ||
          item.ok !== true ||
          !Array.isArray(item.feasibleCandidates)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_INVALID,
          "error",
          [`apertureResult.sources[${sourceId || "?"}]`],
          "Every aperture source must be successful, uniquely keyed, and " +
            "contain explicit feasible template candidates."
        ));
      }
      if (sourceId) sources.set(sourceId, item);
    }
    return sources;
  }

  function driverContext(raw, diagnostics) {
    if (!isRecord(raw) || raw.ok !== true || !Array.isArray(raw.sources)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.DRIVER_INVALID,
        "error",
        ["resolvedDrivers"],
        "A successful resolved-driver result is required."
      ));
      return new Map();
    }
    const sources = new Map();
    for (const item of raw.sources) {
      const sourceId = cleanString(item && item.sourceId);
      const count = positiveInteger(item && item.count);
      const driver = isRecord(item && item.driver) ? item.driver : null;
      if (!sourceId ||
          sources.has(sourceId) ||
          count === null ||
          !driver ||
          !cleanString(driver.id) ||
          !isRecord(driver.frame) ||
          positive(driver.frame.depthM) === null ||
          nonnegative(driver.frame.frontProjectionM) === null ||
          !isRecord(driver.diaphragm) ||
          positive(driver.diaphragm.effectiveAreaM2) === null ||
          !Array.isArray(driver.outputs)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.DRIVER_INVALID,
          "error",
          [`resolvedDrivers.sources[${sourceId || "?"}]`],
          "Resolved drivers require exact identity, count, full body envelope, " +
            "diaphragm, and acoustic outputs."
        ));
      }
      if (sourceId) sources.set(sourceId, {
        sourceId,
        count,
        bandIds: uniqueStrings(item.bandIds),
        driverRef: cleanString(item.driverRef),
        driver,
        record: item
      });
    }
    return sources;
  }

  function findCandidate(source, id) {
    const candidateId = cleanString(id);
    return candidateId && source &&
      Array.isArray(source.feasibleCandidates)
      ? source.feasibleCandidates.find(candidate =>
        candidate &&
        candidate.ok === true &&
        candidate.id === candidateId
      ) || null
      : null;
  }

  function driverFaceRadius(driver) {
    const frame = driver && driver.frame;
    if (!frame) return null;
    if (frame.shape === "round" && positive(frame.diameterM) !== null) {
      return frame.diameterM / 2;
    }
    if (["rectangle", "square", "rounded-rectangle"].includes(frame.shape) &&
        positive(frame.widthM) !== null &&
        positive(frame.heightM) !== null) {
      return Math.hypot(frame.widthM, frame.heightM) / 2;
    }
    return null;
  }

  function activeConeMatches(candidate, driver, construction) {
    const host = candidate && candidate.host;
    const active = construction && construction.activeConeEnvelope;
    const diaphragm = driver && driver.diaphragm;
    const geometry = diaphragm && isRecord(diaphragm.geometry)
      ? diaphragm.geometry
      : {};
    if (!isRecord(host) ||
        host.role !== "active-cone" ||
        !isRecord(active) ||
        !diaphragm) return false;
    if (host.shape === "circle") {
      const diameter = positive(diaphragm.activeDiameterM);
      return diameter !== null &&
        active.shape === "round" &&
        positive(active.diameterM) !== null &&
        positive(host.radiusM) !== null &&
        Math.abs(active.diameterM - diameter) <= 1e-9 &&
        Math.abs(2 * host.radiusM - diameter) <= 1e-9 &&
        geometry.shape === "round";
    }
    if (host.shape === "rectangle") {
      return active.shape === "rounded-rectangle" &&
        positive(host.widthM) !== null &&
        positive(host.heightM) !== null &&
        positive(active.widthM) !== null &&
        positive(active.heightM) !== null &&
        Math.abs(host.widthM - active.widthM) <= 1e-9 &&
        Math.abs(host.heightM - active.heightM) <= 1e-9 &&
        geometry.shape === "rounded-rectangle";
    }
    return false;
  }

  function parseAxisPolicy(raw, path, diagnostics) {
    const value = isRecord(raw) ? raw : {};
    const kind = cleanString(value.kind);
    if (!AXIS_POLICIES.includes(kind) || value.normalSign !== -1) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLACEMENT_INVALID,
        "error",
        [path],
        "Driver-to-horn flow axis policy must explicitly be wall-normal or " +
          "explicit-blend with normalSign -1 (toward the horn)."
      ));
    }
    if (kind === "wall-normal") {
      if (Object.prototype.hasOwnProperty.call(value, "blendFraction") ||
          Object.prototype.hasOwnProperty.call(value, "targetAxis")) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PLACEMENT_INVALID,
          "error",
          [path],
          "wall-normal may not hide a blend target or fraction."
        ));
      }
      return {
        kind,
        normalSign: -1
      };
    }
    const blendFraction = positive(value.blendFraction);
    const targetAxis = normalize(vec3(value.targetAxis));
    if (blendFraction === null ||
        blendFraction > 1 ||
        !targetAxis) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLACEMENT_INVALID,
        "error",
        [`${path}.blendFraction`, `${path}.targetAxis`],
        "explicit-blend requires an explicit fraction in (0,1] and a finite " +
          "nonzero world-space target axis."
      ));
    }
    return {
      kind,
      normalSign: -1,
      blendFraction,
      targetAxis
    };
  }

  function solveDriverAxis(wallFrame, policy, diagnostics, path) {
    const inward = scale(wallFrame.normal, -1);
    const axis = policy.kind === "explicit-blend"
      ? normalize(add(
        scale(inward, 1 - policy.blendFraction),
        scale(policy.targetAxis, policy.blendFraction)
      ))
      : inward;
    if (!axis || dot(axis, wallFrame.normal) >= -EPS) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SETBACK_INVALID,
        "error",
        [path],
        "The declared driver-to-horn axis must have a strictly inward " +
          "component so positive setback places the face outside the horn."
      ));
      return null;
    }
    return axis;
  }

  function solveDriverFrame(faceOriginM, wallFrame, driverAxis, diagnostics, path) {
    const uAxis = normalize(projectOntoPlane(
      wallFrame.axialTangent,
      driverAxis
    ));
    const vAxis = uAxis ? normalize(cross(driverAxis, uAxis)) : null;
    if (!uAxis ||
        !vAxis ||
        dot(cross(driverAxis, uAxis), vAxis) < 1 - 1e-9) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.FRAME_INVALID,
        "error",
        [path],
        "The declared driver axis and horn axial tangent cannot form an " +
          "explicit right-handed driver-face frame."
      ));
      return null;
    }
    return {
      originM: faceOriginM,
      normal: driverAxis,
      uAxis,
      vAxis
    };
  }

  function parsePathSettings(raw, path, diagnostics) {
    const value = isRecord(raw) ? raw : {};
    const family = cleanString(value.family);
    const representation = cleanString(value.representation);
    const curvedAllowed = value.curvedAllowed === true;
    const samples = positiveInteger(value.samples);
    const driverTangentScaleM = positive(value.driverTangentScaleM);
    const hornTangentScaleM = positive(value.hornTangentScaleM);
    const upHintPolicy = cleanString(value.upHintPolicy);
    const sectionPolicy = cleanString(value.sectionPolicy);
    const effectiveAreaPolicy = cleanString(value.effectiveAreaPolicy);
    const areaProgression = cleanString(value.areaProgression);
    const areaProgressionTolerance =
      positive(value.areaProgressionTolerance);
    const sectionSegments = positiveInteger(value.sectionSegments);
    const driverAxisToleranceDeg =
      positive(value.driverAxisToleranceDeg);
    const hornCrossingMinimumDeg =
      positive(value.hornCrossingMinimumDeg);
    const hornFlowDirectionLocal = vec3(value.hornFlowDirectionLocal);
    if (!PATH_FAMILIES.includes(family) ||
        !representation ||
        samples === null ||
        samples < 3 ||
        samples > 257 ||
        driverTangentScaleM === null ||
        hornTangentScaleM === null ||
        upHintPolicy !== "driver-face-u" ||
        sectionPolicy !== "selected-aperture-exact-constant" ||
        effectiveAreaPolicy !== "selected-aperture-area" ||
        areaProgression !== "constant" ||
        areaProgressionTolerance === null ||
        sectionSegments === null ||
        sectionSegments < 8 ||
        sectionSegments > 256 ||
        driverAxisToleranceDeg === null ||
        hornCrossingMinimumDeg === null) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PATH_INVALID,
        "error",
        [path],
        "Passage path, endpoint-tangent representation, sample/tangent " +
          "settings, exact selected-aperture section/area policies, and " +
          "explicit geometry tolerances are required."
      ));
    }
    if (family === "straight" &&
        (curvedAllowed ||
         representation !== "collinear-endpoint-tangents" ||
         hornFlowDirectionLocal !== null)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PATH_INVALID,
        "error",
        [path],
        "A straight path must explicitly use collinear endpoint tangents and " +
          "must not carry hidden curved-path data."
      ));
    }
    if (family === "cubic-hermite" &&
        (!curvedAllowed ||
         representation !== "cubic-hermite-endpoint-tangents" ||
         !hornFlowDirectionLocal)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.CURVED_PATH_UNREPRESENTED,
        "error",
        [path],
        "A curved/bent path is refused unless curvedAllowed is true and an " +
          "explicit cubic-Hermite endpoint-tangent representation includes " +
          "hornFlowDirectionLocal."
      ));
    }
    return {
      family,
      representation,
      curvedAllowed,
      samples,
      driverTangentScaleM,
      hornTangentScaleM,
      upHintPolicy,
      sectionPolicy,
      effectiveAreaPolicy,
      areaProgression,
      areaProgressionTolerance,
      sectionSegments,
      driverAxisToleranceDeg,
      hornCrossingMinimumDeg,
      hornFlowDirectionLocal,
      provenanceRefs: uniqueStrings(value.provenanceRefs)
    };
  }

  function apertureSection(aperture, diagnostics, path) {
    const shape = isRecord(aperture && aperture.shape)
      ? aperture.shape
      : {};
    if (shape.kind === "round") {
      const diameterM = positive(shape.diameterM) ||
        positive(shape.longAxisM) ||
        (positive(shape.radiusM) !== null ? 2 * shape.radiusM : null);
      if (diameterM === null || positive(shape.areaM2) === null) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_INVALID,
          "error",
          [path],
          "Round template aperture requires exact diameter and area."
        ));
      }
      return {
        family: "round",
        diameterM,
        rotationRad: aperture.angleRad
      };
    }
    if (shape.kind === "racetrack") {
      const widthM = positive(shape.lengthM);
      const heightM = positive(shape.widthM);
      if (widthM === null ||
          heightM === null ||
          positive(shape.areaM2) === null) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_INVALID,
          "error",
          [path],
          "Racetrack template aperture requires exact length, width, and area."
        ));
      }
      return {
        family: "racetrack",
        widthM,
        heightM,
        rotationRad: aperture.angleRad
      };
    }
    diagnostics.push(diagnostic(
      FAILURE_CODES.APERTURE_INVALID,
      "error",
      [path],
      "Only explicit round and racetrack aperture templates are admitted."
    ));
    return null;
  }

  function rayPlaneIntersection(start, direction, planeOrigin, planeNormal) {
    const denominator = dot(direction, planeNormal);
    if (Math.abs(denominator) <= EPS) return null;
    const distanceM = dot(
      subtract(planeOrigin, start),
      planeNormal
    ) / denominator;
    return distanceM > EPS
      ? { pointM: add(start, scale(direction, distanceM)), distanceM }
      : null;
  }

  function endpointFrame(originM, axial, preferredU) {
    const u = normalize(projectOntoPlane(preferredU, axial));
    const v = u ? normalize(cross(axial, u)) : null;
    return u && v ? { originM, axial, u, v } : null;
  }

  function mapLocalHornFlow(local, wall) {
    if (!local) return null;
    const inward = scale(wall.normal, -1);
    return normalize(add(
      add(
        scale(inward, local[0]),
        scale(wall.axialTangent, local[1])
      ),
      scale(wall.crossTangent, local[2])
    ));
  }

  function physicalId(prefix, sourceId, stationId, instanceId, templateId) {
    return [
      prefix, sourceId, stationId, instanceId, templateId
    ].join(":");
  }

  function buildPhysicalCandidate(
    candidate,
    sourceId,
    stationId,
    instanceId,
    diagnostics
  ) {
    const candidateId = physicalId(
      "candidate",
      sourceId,
      stationId,
      instanceId,
      candidate.id
    );
    const apertures = [];
    const physicalApertureIds = new Map();
    for (const template of candidate.apertures.slice().sort((left, right) =>
      String(left && left.id || "").localeCompare(
        String(right && right.id || "")
      )
    )) {
      const templateId = cleanString(template && template.id);
      const center = isRecord(template && template.centerM)
        ? { x: template.centerM.x, y: template.centerM.y }
        : null;
      if (!templateId ||
          !center ||
          !finite(center.x) ||
          !finite(center.y) ||
          !finite(template.angleRad) ||
          !isRecord(template.shape) ||
          positive(template.shape.areaM2) === null) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_INVALID,
          "error",
          [`apertureCandidate[${candidate.id}]`],
          "Every aperture template needs identity, exact local center, " +
            "orientation, shape, and positive area."
        ));
        continue;
      }
      const physicalApertureId = physicalId(
        "aperture",
        sourceId,
        stationId,
        instanceId,
        templateId
      );
      physicalApertureIds.set(templateId, physicalApertureId);
      apertures.push({
        ...stableClone(template),
        id: physicalApertureId,
        sourceId,
        physicalDriverInstanceId: instanceId,
        physicalCandidateId: candidateId,
        templateApertureId: templateId,
        templateCandidateId: candidate.id,
        centerM: center,
        angleRad: template.angleRad,
        shape: stableClone(template.shape)
      });
    }
    const pairSpacing = Array.isArray(candidate.pairSpacing)
      ? candidate.pairSpacing.map((pair, index) => {
        const templatePairId = cleanString(pair && pair.id);
        const templateFirstId = cleanString(
          pair && pair.firstApertureId
        );
        const templateSecondId = cleanString(
          pair && pair.secondApertureId
        );
        const firstApertureId =
          physicalApertureIds.get(templateFirstId);
        const secondApertureId =
          physicalApertureIds.get(templateSecondId);
        if (!templatePairId ||
            !firstApertureId ||
            !secondApertureId) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_INVALID,
            "error",
            [`apertureCandidate[${candidate.id}].pairSpacing[${index}]`],
            "Every physical pair-spacing record must reference two " +
              "apertures owned by its selected template."
          ));
        }
        return {
          ...stableClone(pair),
          id: physicalId(
            "aperture-pair",
            sourceId,
            stationId,
            instanceId,
            templatePairId || `pair-${index + 1}`
          ),
          firstApertureId,
          secondApertureId,
          templatePairSpacingId: templatePairId,
          templateFirstApertureId: templateFirstId,
          templateSecondApertureId: templateSecondId
        };
      }).sort((left, right) => left.id.localeCompare(right.id))
      : [];
    return {
      ...stableClone(candidate),
      id: candidateId,
      sourceId,
      count: apertures.length,
      apertures,
      pairSpacing,
      physicalDriverInstanceId: instanceId,
      templateCandidateId: candidate.id,
      templateGeometryChanged: false,
      manufacturing: false
    };
  }

  function driverCapsule(instance, driver) {
    const radiusM = driverFaceRadius(driver);
    const depthM = positive(driver.frame.depthM);
    const frontProjectionM = nonnegative(driver.frame.frontProjectionM);
    if (radiusM === null || depthM === null ||
        frontProjectionM === null || !instance.driverAxis) return null;
    return {
      instanceId: instance.id,
      radiusM,
      rearPointM: add(
        instance.faceOriginM,
        scale(instance.driverAxis, -depthM)
      ),
      frontPointM: add(
        instance.faceOriginM,
        scale(instance.driverAxis, frontProjectionM)
      )
    };
  }

  function segmentDistance(a0, a1, b0, b1) {
    const u = subtract(a1, a0);
    const v = subtract(b1, b0);
    const w = subtract(a0, b0);
    const a = dot(u, u);
    const b = dot(u, v);
    const c = dot(v, v);
    const d = dot(u, w);
    const e = dot(v, w);
    const denominator = a * c - b * b;
    let sN = denominator;
    let sD = denominator;
    let tN = denominator;
    let tD = denominator;
    if (denominator < EPS) {
      sN = 0;
      sD = 1;
      tN = e;
      tD = c;
    } else {
      sN = b * e - c * d;
      tN = a * e - b * d;
      if (sN < 0) {
        sN = 0;
        tN = e;
        tD = c;
      } else if (sN > sD) {
        sN = sD;
        tN = e + b;
        tD = c;
      }
    }
    if (tN < 0) {
      tN = 0;
      if (-d < 0) sN = 0;
      else if (-d > a) sN = sD;
      else {
        sN = -d;
        sD = a;
      }
    } else if (tN > tD) {
      tN = tD;
      if (-d + b < 0) sN = 0;
      else if (-d + b > a) sN = sD;
      else {
        sN = -d + b;
        sD = a;
      }
    }
    const sc = Math.abs(sN) < EPS ? 0 : sN / sD;
    const tc = Math.abs(tN) < EPS ? 0 : tN / tD;
    return length(subtract(add(w, scale(u, sc)), scale(v, tc)));
  }

  function validateCollisions(instances, validation, diagnostics) {
    const capsules = instances
      .map(item => driverCapsule(item.instance, item.driver))
      .filter(Boolean);
    for (let left = 0; left < capsules.length; left++) {
      for (let right = left + 1; right < capsules.length; right++) {
        const first = capsules[left];
        const second = capsules[right];
        const clearanceM = segmentDistance(
          first.rearPointM,
          first.frontPointM,
          second.rearPointM,
          second.frontPointM
        ) - first.radiusM - second.radiusM;
        if (clearanceM + validation.positionToleranceM <
            validation.minimumDriverClearanceM) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.DRIVER_COLLISION,
            "error",
            [
              `instances[${first.instanceId}]`,
              `instances[${second.instanceId}]`
            ],
            "Documented driver-body conservative capsules violate the " +
              "explicit minimum inter-driver clearance.",
            {
              leftInstanceId: first.instanceId,
              rightInstanceId: second.instanceId,
              clearanceM,
              minimumDriverClearanceM:
                validation.minimumDriverClearanceM
            }
          ));
        }
      }
    }
  }

  function validatePanels(plan, instances, candidate, validation, diagnostics) {
    const supplied = Array.isArray(plan.panels) ? plan.panels : [];
    if (plan.distributionFamily === "rotational") {
      if (supplied.length) diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_INVALID,
        "error",
        [`placementPlans[${plan.sourceId}].panels`],
        "Rotational distribution does not accept hidden panel grouping."
      ));
      return [];
    }
    if (instances.length % 2 !== 0 || supplied.length * 2 !== instances.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_INVALID,
        "error",
        [`placementPlans[${plan.sourceId}].panels`],
        "panel-pairs requires an even instance count and exactly one explicit " +
          "panel record per physical pair."
      ));
    }
    if (!candidate.orientationPolicy ||
        candidate.orientationPolicy.mode !== "panel-parallel" ||
        !finite(candidate.orientationPolicy.panelAngleRad) ||
        !finite(candidate.orientationPolicy.driverLocalToPanelAngleRad)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_INVALID,
        "error",
        [`placementPlans[${plan.sourceId}].apertureCandidateId`],
        "Panel-pair placement requires a panel-parallel aperture template."
      ));
    }
    const byId = new Map(instances.map(item => [item.id, item]));
    const consumed = new Set();
    const panels = [];
    for (const raw of supplied.slice().sort((left, right) =>
      String(left && left.id || "").localeCompare(
        String(right && right.id || "")
      )
    )) {
      const id = cleanString(raw && raw.id);
      const azimuthRad = normalizeAngle(raw && raw.azimuthRad);
      const ids = uniqueStrings(raw && raw.instanceIds);
      const pair = ids.map(instanceId => byId.get(instanceId));
      if (!id ||
          azimuthRad === null ||
          ids.length !== 2 ||
          pair.some(item => !item) ||
          ids.some(instanceId => consumed.has(instanceId)) ||
          pair.some(item => item.panelId !== id)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PANEL_INVALID,
          "error",
          [`placementPlans[${plan.sourceId}].panels[${id || "?"}]`],
          "Every panel must explicitly own exactly two otherwise-unclaimed " +
            "instances with matching panelId."
        ));
        continue;
      }
      ids.forEach(instanceId => consumed.add(instanceId));
      const [first, second] = pair;
      if (angleDistance(first.azimuthRad, azimuthRad) >
            validation.azimuthToleranceRad ||
          angleDistance(second.azimuthRad, azimuthRad) >
            validation.azimuthToleranceRad ||
          angleDeg(first.driverAxis, second.driverAxis) >
            validation.angleToleranceDeg ||
          lineAngleDeg(
            first.driverFaceFrame.u,
            second.driverFaceFrame.u
          ) > validation.angleToleranceDeg) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PANEL_INVALID,
          "error",
          [`placementPlans[${plan.sourceId}].panels[${id}]`],
          "Both panel instances must share the declared azimuth and parallel " +
            "driver-face frames."
        ));
      }
      const originM = scale(add(
        first.faceOriginM,
        second.faceOriginM
      ), 0.5);
      const normal = normalize(add(first.driverAxis, second.driverAxis));
      const angle = candidate.orientationPolicy
        .driverLocalToPanelAngleRad;
      const driverU = first.driverFaceFrame.u;
      const driverV = first.driverFaceFrame.v;
      const uAxis = normalize(add(
        scale(driverU, Math.cos(angle)),
        scale(driverV, -Math.sin(angle))
      ));
      const vAxis = normalize(add(
        scale(driverU, Math.sin(angle)),
        scale(driverV, Math.cos(angle))
      ));
      if (!frameValid(normal, vAxis, uAxis, validation.angleToleranceDeg)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PANEL_INVALID,
          "error",
          [`placementPlans[${plan.sourceId}].panels[${id}]`],
          "Derived panel axes are not a finite right-handed frame."
        ));
      }
      panels.push({
        id,
        originM,
        normal,
        uAxis,
        vAxis,
        azimuthRad,
        instanceIds: ids,
        provenanceRefs: uniqueStrings(raw.provenanceRefs),
        derivedFromExplicitInstancePair: true
      });
    }
    if (consumed.size !== instances.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_INVALID,
        "error",
        [`placementPlans[${plan.sourceId}].panels`],
        "Every panel-pair instance must be consumed exactly once."
      ));
    }
    return panels;
  }

  function parsePlacement(
    raw,
    contexts,
    validation,
    diagnostics
  ) {
    const plan = isRecord(raw) ? raw : {};
    const sourceId = cleanString(plan.sourceId);
    const stationId = cleanString(plan.stationId);
    const bandId = cleanString(plan.bandId);
    const apertureCandidateId = cleanString(plan.apertureCandidateId);
    const driverOutputId = cleanString(plan.driverOutputId);
    const mountSetbackM = positive(plan.mountSetbackM);
    const distributionFamily = cleanString(plan.distributionFamily);
    const source = contexts.state.sources.get(sourceId);
    const stateStation = contexts.state.stations.get(stationId);
    const station = contexts.stations.get(stationId);
    const driverSource = contexts.drivers.get(sourceId);
    const apertureSource = contexts.apertures.get(sourceId);
    const candidate = findCandidate(apertureSource, apertureCandidateId);
    const path = `placementPlans[${sourceId || "?"}]`;
    if (!sourceId ||
        !stationId ||
        !bandId ||
        !apertureCandidateId ||
        !driverOutputId ||
        mountSetbackM === null ||
        !DISTRIBUTIONS.includes(distributionFamily) ||
        !source ||
        !stateStation ||
        !station ||
        !driverSource ||
        !apertureSource ||
        !candidate) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLACEMENT_INVALID,
        "error",
        [path],
        "Every plan must explicitly select an existing source, station, band, " +
          "driver output, aperture template, positive setback, and supported " +
          "distribution."
      ));
      return null;
    }
    if (!station.sourceIds.includes(sourceId) ||
        !stateStation.sourceIds.includes(sourceId) ||
        !station.bandIds.includes(bandId) ||
        !stateStation.bandIds.includes(bandId) ||
        !source.bandIds.includes(bandId) ||
        distributionFamily !== station.distribution ||
        source.count !== station.sourceCount ||
        source.count !== driverSource.count ||
        driverSource.driverRef !== source.driverRef ||
        candidate.sourceId !== sourceId) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        "error",
        [path],
        "State, solved station, resolved driver, distribution, and selected " +
          "aperture template ownership/counts must agree exactly."
      ));
    }
    const output = driverSource.driver.outputs.find(item =>
      item.id === driverOutputId
    );
    if (!output ||
        !Array.isArray(output.bandIds) ||
        !output.bandIds.includes(bandId) ||
        !driverSource.driver.bandIds.includes(bandId)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.OUTPUT_CONFLICT,
        "error",
        [`${path}.driverOutputId`, `${path}.bandId`],
        "The explicitly selected driver output must own the plan band."
      ));
    }
    if (!isRecord(plan.construction) ||
        !activeConeMatches(
          candidate,
          driverSource.driver,
          plan.construction
        )) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.ACTIVE_CONE_CONFLICT,
        "error",
        [`${path}.construction.activeConeEnvelope`,
          `${path}.apertureCandidateId`],
        "Selected template host, construction active-cone envelope, and " +
          "documented driver diaphragm must match exactly."
      ));
    }
    const axisPolicy = parseAxisPolicy(
      plan.axisPolicy,
      `${path}.axisPolicy`,
      diagnostics
    );
    const pathSettings = parsePathSettings(
      plan.pathSettings,
      `${path}.pathSettings`,
      diagnostics
    );
    const diagnosticFrequencyHz = positive(plan.diagnosticFrequencyHz);
    const maximumAllowedSpreadM =
      nonnegative(plan.maximumAllowedSpreadM);
    const referencePathToDatumM =
      nonnegative(plan.referencePathToDatumM);
    const pathDatumId = cleanString(plan.pathDatumId);
    if (diagnosticFrequencyHz === null ||
        maximumAllowedSpreadM === null ||
        referencePathToDatumM === null ||
        !pathDatumId) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PATH_INVALID,
        "error",
        [
          `${path}.diagnosticFrequencyHz`,
          `${path}.maximumAllowedSpreadM`,
          `${path}.referencePathToDatumM`,
          `${path}.pathDatumId`
        ],
        "Diagnostic frequency, maximum spread, reference path, and common " +
          "path datum must be explicit."
      ));
    }
    const instancesRaw = Array.isArray(plan.instances)
      ? plan.instances
      : [];
    if (instancesRaw.length !== source.count) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.COUNT_MISMATCH,
        "error",
        [`${path}.instances`],
        "Placement instances must exactly equal the explicit state, station, " +
          "and resolved-driver count.",
        { expected: source.count, actual: instancesRaw.length }
      ));
    }
    const instanceIds = new Set();
    const azimuths = [];
    const baseQuery = interpolateHorn(
      contexts.horn,
      station.axialM,
      diagnostics
    );
    const faceRadiusM = driverFaceRadius(driverSource.driver);
    if (faceRadiusM === null) diagnostics.push(diagnostic(
      FAILURE_CODES.DRIVER_INVALID,
      "error",
      [`${path}.driver`],
      "Documented driver face dimensions are required for host-span and " +
        "clearance validation."
    ));
    const physicalLayouts = [];
    const interfaces = [];
    const instances = [];
    const physicalCandidates = [];
    for (const item of instancesRaw.slice().sort((left, right) =>
      String(left && left.id || "").localeCompare(
        String(right && right.id || "")
      )
    )) {
      const id = cleanString(item && item.id);
      const azimuthRad = normalizeAngle(item && item.azimuthRad);
      const axialOffsetM = finite(item && item.axialOffsetM)
        ? item.axialOffsetM
        : null;
      const panelId = cleanString(item && item.panelId);
      const chamber = isRecord(item && item.chamber)
        ? item.chamber
        : {};
      const chamberId = cleanString(chamber.id);
      const chamberVolumeM3 = positive(chamber.volumeM3);
      const upstreamPathToDriverEndpointM =
        nonnegative(item && item.upstreamPathToDriverEndpointM);
      const downstreamPathFromHornEndpointToDatumM =
        nonnegative(item && item.downstreamPathFromHornEndpointToDatumM);
      const instancePath = `${path}.instances[${id || "?"}]`;
      if (!id ||
          instanceIds.has(id) ||
          azimuthRad === null ||
          axialOffsetM === null ||
          !chamberId ||
          chamberVolumeM3 === null ||
          upstreamPathToDriverEndpointM === null ||
          downstreamPathFromHornEndpointToDatumM === null ||
          !Array.isArray(item.auxiliaryNegatives)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PLACEMENT_INVALID,
          "error",
          [instancePath],
          "Each physical instance needs unique identity, solved azimuth, " +
            "explicit axial offset, chamber ID/volume, both path components, " +
            "and an explicit auxiliary-negative list."
        ));
        continue;
      }
      instanceIds.add(id);
      azimuths.push(azimuthRad);
      if (distributionFamily === "rotational" && panelId) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PANEL_INVALID,
          "error",
          [`${instancePath}.panelId`],
          "Rotational instances may not carry panel IDs."
        ));
      }
      if (distributionFamily === "panel-pairs" && !panelId) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PANEL_INVALID,
          "error",
          [`${instancePath}.panelId`],
          "Every panel-pair instance requires an explicit panel ID."
        ));
      }
      if (faceRadiusM !== null &&
          Math.abs(axialOffsetM) + faceRadiusM >
            station.requiredAxialSpanM / 2 +
              validation.positionToleranceM) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HOST_SPAN_INVALID,
          "error",
          [`${instancePath}.axialOffsetM`,
            `stationResult[${stationId}].requiredAxialSpanM`],
          "The complete driver face envelope does not fit the solved station " +
            "host axial span.",
          {
            axialOffsetM,
            faceRadiusM,
            requiredAxialSpanM: station.requiredAxialSpanM
          }
        ));
      }
      if (!baseQuery) continue;
      const rotated = rotateHornQuery(
        baseQuery,
        contexts.horn.baseAzimuthRad,
        azimuthRad
      );
      const wallOriginM = add(
        rotated.originM,
        scale(rotated.axialTangent, axialOffsetM)
      );
      const wallFrame = {
        originM: wallOriginM,
        normal: rotated.normal,
        axialTangent: rotated.axialTangent,
        crossTangent: rotated.crossTangent
      };
      const driverAxis = solveDriverAxis(
        wallFrame,
        axisPolicy,
        diagnostics,
        `${instancePath}.axisPolicy`
      );
      if (!driverAxis) continue;
      const faceOriginM = add(
        wallOriginM,
        scale(driverAxis, -mountSetbackM)
      );
      if (dot(
        subtract(faceOriginM, wallOriginM),
        wallFrame.normal
      ) <= validation.positionToleranceM) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SETBACK_INVALID,
          "error",
          [`${instancePath}.mountSetbackM`],
          "Positive setback did not place the driver face outside the horn."
        ));
      }
      const datum = solveDriverFrame(
        faceOriginM,
        wallFrame,
        driverAxis,
        diagnostics,
        `${instancePath}.driverFaceFrame`
      );
      if (!datum) continue;
      const driverFaceFrame = {
        originM: faceOriginM,
        axial: datum.normal,
        u: datum.uAxis,
        v: datum.vAxis
      };
      const physicalCandidate = buildPhysicalCandidate(
        candidate,
        sourceId,
        stationId,
        id,
        diagnostics
      );
      const layoutId = physicalId(
        "layout",
        sourceId,
        stationId,
        id,
        physicalCandidate.id
      );
      const interfaceId = physicalId(
        "interface",
        sourceId,
        stationId,
        id,
        chamberId
      );
      const apertureSpecs = [];
      const bindings = [];
      for (const aperture of physicalCandidate.apertures) {
        const center = aperture.centerM;
        const localOffset = add(
          scale(datum.uAxis, center.x),
          scale(datum.vAxis, center.y)
        );
        const driverPointM = add(faceOriginM, localOffset);
        let hornPointM;
        let hornFlowDirection;
        if (pathSettings.family === "straight") {
          const crossing = rayPlaneIntersection(
            driverPointM,
            driverAxis,
            wallOriginM,
            wallFrame.normal
          );
          if (!crossing) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.PATH_INVALID,
              "error",
              [`${instancePath}.apertures[${aperture.id}]`],
              "The declared straight driver-normal path does not cross the " +
                "local horn tangent plane in the forward direction."
            ));
            continue;
          }
          hornPointM = crossing.pointM;
          hornFlowDirection = driverAxis;
        } else {
          hornPointM = add(
            wallOriginM,
            add(
              scale(wallFrame.axialTangent, center.x),
              scale(wallFrame.crossTangent, center.y)
            )
          );
          hornFlowDirection = mapLocalHornFlow(
            pathSettings.hornFlowDirectionLocal,
            wallFrame
          );
          if (!hornFlowDirection) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.CURVED_PATH_UNREPRESENTED,
              "error",
              [`${instancePath}.apertures[${aperture.id}]`],
              "Explicit curved horn tangent could not be mapped into the " +
                "canonical local horn frame."
            ));
            continue;
          }
        }
        const driverEndpointFrame = endpointFrame(
          driverPointM,
          driverAxis,
          datum.uAxis
        );
        const hornEndpointFrame = endpointFrame(
          hornPointM,
          hornFlowDirection,
          wallFrame.axialTangent
        );
        const section = apertureSection(
          aperture,
          diagnostics,
          `${instancePath}.apertures[${aperture.id}]`
        );
        if (!driverEndpointFrame || !hornEndpointFrame || !section) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.FRAME_INVALID,
            "error",
            [`${instancePath}.apertures[${aperture.id}]`],
            "Passage endpoint frames could not be made right-handed."
          ));
          continue;
        }
        const passageId = `passage:${aperture.id}`;
        apertureSpecs.push({
          apertureId: aperture.id,
          templateApertureId: aperture.templateApertureId,
          physicalCandidateId: physicalCandidate.id,
          templateCandidateId: candidate.id,
          passageId,
          driverEndpoint: {
            pointM: driverPointM,
            flowDirection: driverAxis,
            surfaceNormal: driverAxis,
            datum: "front-chamber-boundary",
            localFrame: driverEndpointFrame,
            provenanceRefs: uniqueStrings([
              ...pathSettings.provenanceRefs,
              ...uniqueStrings(item.provenanceRefs)
            ])
          },
          hornEndpoint: {
            pointM: hornPointM,
            flowDirection: hornFlowDirection,
            surfaceNormal: wallFrame.normal,
            datum: "inner-horn-surface",
            stationId,
            axialCoordinateM: station.axialM,
            localFrame: hornEndpointFrame,
            provenanceRefs: uniqueStrings([
              ...pathSettings.provenanceRefs,
              ...uniqueStrings(station.record.provenanceRefs)
            ])
          },
          startSection: stableClone(section),
          endSection: stableClone(section),
          areaProgression: pathSettings.areaProgression,
          areaProgressionTolerance:
            pathSettings.areaProgressionTolerance,
          path: {
            family: pathSettings.family,
            representation: pathSettings.representation,
            curvedAllowed: pathSettings.curvedAllowed,
            samples: pathSettings.samples,
            driverTangentScaleM:
              pathSettings.driverTangentScaleM,
            hornTangentScaleM:
              pathSettings.hornTangentScaleM,
            upHint: datum.uAxis
          },
          sectionSegments: pathSettings.sectionSegments,
          driverAxisToleranceDeg:
            pathSettings.driverAxisToleranceDeg,
          hornCrossingMinimumDeg:
            pathSettings.hornCrossingMinimumDeg,
          effectiveAreaM2: aperture.shape.areaM2,
          upstreamPathToDriverEndpointM,
          downstreamPathFromHornEndpointToDatumM,
          pathDatumId,
          provenanceRefs: uniqueStrings([
            ...pathSettings.provenanceRefs,
            ...uniqueStrings(item.provenanceRefs),
            ...uniqueStrings(plan.provenanceRefs)
          ])
        });
        bindings.push({
          apertureId: aperture.id,
          templateApertureId: aperture.templateApertureId,
          physicalCandidateId: physicalCandidate.id,
          templateCandidateId: candidate.id,
          passageId
        });
      }
      physicalLayouts.push({
        id: layoutId,
        driverInstanceId: id,
        stationId,
        sourceId,
        bandId,
        selectedCandidateId: physicalCandidate.id,
        templateCandidateId: candidate.id,
        candidate: physicalCandidate,
        diagnosticFrequencyHz,
        maximumAllowedSpreadM,
        referencePathToDatumM,
        pathDatumId,
        stationAxialM: station.axialM,
        stationWallFrame: stableClone(wallFrame),
        hornSection: stableClone(rotated.section),
        provenanceRefs: uniqueStrings([
          ...uniqueStrings(plan.provenanceRefs),
          ...uniqueStrings(item.provenanceRefs),
          ...uniqueStrings(station.record.provenanceRefs)
        ])
      });
      interfaces.push({
        id: interfaceId,
        stationId,
        sourceId,
        bandId,
        driverInstanceId: id,
        driverRecordId: driverSource.driver.id,
        driverOutputId,
        chamber: {
          id: chamberId,
          volumeM3: chamberVolumeM3,
          provenanceRefs: uniqueStrings(chamber.provenanceRefs)
        },
        driverFaceFrame,
        apertures: apertureSpecs,
        provenanceRefs: uniqueStrings([
          ...uniqueStrings(plan.provenanceRefs),
          ...uniqueStrings(item.provenanceRefs),
          ...uniqueStrings(chamber.provenanceRefs)
        ])
      });
      instances.push({
        id,
        sourceId,
        stationId,
        azimuthRad,
        axialOffsetM,
        panelId,
        faceOriginM,
        wallFrame,
        driverFaceFrame,
        driverAxis,
        physicalApertureCandidateId: physicalCandidate.id,
        templateApertureCandidateId: candidate.id,
        apertureBindings: bindings,
        auxiliaryNegatives: stableClone(item.auxiliaryNegatives),
        chamberId,
        mountSetbackM,
        hornSurfaceQuery: {
          solvedStationAxialM: station.axialM,
          axialOffsetM,
          baseWallPointM: rotated.originM,
          localTangentPlanePointM: wallOriginM,
          section: stableClone(rotated.section),
          sourceStationIndices:
            rotated.sourceStationIndices.slice(),
          interpolationFraction: rotated.interpolationFraction,
          surfaceHash: contexts.horn.horn.surfaceHash
        },
        provenanceRefs: uniqueStrings([
          ...uniqueStrings(plan.provenanceRefs),
          ...uniqueStrings(item.provenanceRefs)
        ])
      });
      physicalCandidates.push(physicalCandidate);
    }
    const expectedAzimuths = station.sourceAzimuthsRad
      .slice().sort((left, right) => left - right);
    const actualAzimuths = azimuths.slice().sort((left, right) => left - right);
    if (expectedAzimuths.length !== actualAzimuths.length ||
        expectedAzimuths.some((value, index) =>
          angleDistance(value, actualAzimuths[index]) >
            validation.azimuthToleranceRad)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        "error",
        [`${path}.instances[].azimuthRad`, "stationResult"],
        "Physical instances must consume the solved station azimuth multiset " +
          "exactly."
      ));
    }
    if (candidate.orientationPolicy &&
        distributionFamily === "rotational" &&
        candidate.orientationPolicy.mode !== "driver-local-parallel") {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_INVALID,
        "error",
        [`${path}.apertureCandidateId`],
        "Rotational distribution requires driver-local-parallel template " +
          "aperture orientation."
      ));
    }
    const panels = validatePanels(
      {
        ...plan,
        sourceId,
        distributionFamily
      },
      instances,
      candidate,
      validation,
      diagnostics
    );
    const mountPlan = {
      sourceId,
      stationId,
      bandId,
      driverOutputId,
      distributionFamily,
      templateApertureCandidateId: candidate.id,
      apertureCandidateId: instances.length === 1 &&
          physicalCandidates.length === 1
        ? physicalCandidates[0].id
        : null,
      instanceApertureCandidates: true,
      axisPolicy,
      mountSetbackM,
      construction: stableClone(plan.construction),
      instances,
      panels,
      provenanceRefs: uniqueStrings(plan.provenanceRefs)
    };
    return {
      sourceId,
      stationId,
      source,
      driver: driverSource.driver,
      physicalLayouts,
      interfaces,
      mountPlan,
      physicalCandidates,
      instanceCount: instances.length
    };
  }

  function mountApertureResult(original, placements) {
    const bySource = Object.create(null);
    const sources = [];
    for (const placement of placements.slice().sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId)
    )) {
      const originalSource = original.sources.find(
        item => item.sourceId === placement.sourceId
      );
      const source = {
        ...stableClone(originalSource),
        feasibleCandidates: placement.physicalCandidates
          .slice().sort((left, right) => left.id.localeCompare(right.id)),
        selectedCandidateId: null,
        automaticCountSelection: false,
        physicalInstanceCandidates: true,
        templateCandidateIds: [
          ...new Set(placement.physicalCandidates.map(
            item => item.templateCandidateId
          ))
        ].sort()
      };
      sources.push(source);
      bySource[source.sourceId] = source;
    }
    return {
      ok: true,
      code: null,
      sourceOrder: sources.map(item => item.sourceId),
      sources,
      bySource,
      diagnostics: [],
      automaticCountSelection: false,
      inferredValues: [],
      physicalInstanceCandidates: true,
      hardwareValidated: false,
      manufacturing: false,
      model: original.model ? stableClone(original.model) : null,
      capabilities: original.capabilities
        ? stableClone(original.capabilities)
        : null
    };
  }

  function preservedHashes(input) {
    const stateAliases = [
      cleanString(input.stateHash),
      cleanString(input.stateHashInput),
      cleanString(input.state && input.state.inputHash),
      cleanString(input.state && input.state.stateHashInput),
      cleanString(input.state && input.state.hashInput)
    ].filter(Boolean);
    return {
      stateHash: stateAliases.length ? stateAliases[0] : null,
      stateHashAliases: [...new Set(stateAliases)].sort(),
      hornSurfaceHash:
        cleanString(input.hornSurface && input.hornSurface.surfaceHash),
      stationHashInput:
        cleanString(input.stationResult && input.stationResult.hashInput),
      stationInputHash: cleanString(
        input.stationResult &&
        input.stationResult.result &&
        input.stationResult.result.inputHash
      ),
      apertureHashInput:
        cleanString(input.apertureResult && input.apertureResult.hashInput),
      resolvedDriversHashInput:
        cleanString(
          input.resolvedDrivers && input.resolvedDrivers.hashInput
        )
    };
  }

  function validateHashes(hashes, diagnostics) {
    if (hashes.stateHashAliases.length > 1 ||
        hashes.stateHash &&
          hashes.stationInputHash &&
          hashes.stateHash !== hashes.stationInputHash) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.HASH_CONFLICT,
        "error",
        [
          "stateHash", "stateHashInput", "state.inputHash",
          "state.stateHashInput", "state.hashInput",
          "stationResult.result.inputHash"
        ],
        "Every supplied state-hash alias and station input hash must match " +
          "exactly; hashes are preserved, never rewritten."
      ));
    }
  }

  function planInterfaces(rawInput) {
    let input;
    try {
      input = cloneData(rawInput);
    } catch (error) {
      return failure([diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        "error",
        ["input"],
        error && error.message
          ? error.message
          : "Input must be finite inert JSON data."
      )]);
    }
    if (!isRecord(input) || input.schemaVersion !== SCHEMA_VERSION) {
      return failure([diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        "error",
        ["schemaVersion"],
        "planInterfaces requires one explicit schema-2 input object."
      )]);
    }
    const diagnostics = [];
    const hashes = preservedHashes(input);
    validateHashes(hashes, diagnostics);
    const validation = parseValidation(input.validation, diagnostics);
    const state = stateContext(input.state, diagnostics);
    const horn = hornContext(
      input.hornSurface,
      validation,
      diagnostics
    );
    const stations = stationContext(
      input.stationResult,
      state,
      horn,
      diagnostics
    );
    const apertures = apertureContext(
      input.apertureResult,
      diagnostics
    );
    const drivers = driverContext(
      input.resolvedDrivers,
      diagnostics
    );
    if (!Array.isArray(input.placementPlans) ||
        !input.placementPlans.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PLACEMENT_INVALID,
        "error",
        ["placementPlans"],
        "One explicit placement plan is required for every selected " +
          "wall-entry source."
      ));
    }
    if (diagnostics.some(item => item.severity === "error")) {
      return failure(diagnostics, hashes);
    }
    const contexts = { state, horn, stations, apertures, drivers };
    const placements = [];
    const usedSources = new Set();
    for (const rawPlan of input.placementPlans.slice().sort((left, right) =>
      String(left && left.sourceId || "").localeCompare(
        String(right && right.sourceId || "")
      )
    )) {
      const sourceId = cleanString(rawPlan && rawPlan.sourceId);
      if (!sourceId || usedSources.has(sourceId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          "error",
          ["placementPlans"],
          "Each selected wall-entry source requires exactly one placement plan."
        ));
        continue;
      }
      usedSources.add(sourceId);
      const placement = parsePlacement(
        rawPlan,
        contexts,
        validation,
        diagnostics
      );
      if (placement) placements.push(placement);
    }
    const expectedSources = [...stations.values()]
      .flatMap(item => item.sourceIds)
      .sort();
    const actualSources = [...usedSources].sort();
    if (stableStringify(expectedSources) !== stableStringify(actualSources)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        "error",
        ["placementPlans", "stationResult"],
        "Placement plans must consume every solved wall-entry source exactly once.",
        { expectedSources, actualSources }
      ));
    }
    const collisionInputs = [];
    for (const placement of placements) {
      for (const instance of placement.mountPlan.instances) {
        collisionInputs.push({
          instance,
          driver: placement.driver
        });
      }
    }
    validateCollisions(collisionInputs, validation, diagnostics);
    if (diagnostics.some(item => item.severity === "error")) {
      return failure(diagnostics, hashes);
    }
    const apertureLayouts = placements.flatMap(
      item => item.physicalLayouts
    ).sort((left, right) => left.id.localeCompare(right.id));
    const driverChamberInterfaces = placements.flatMap(
      item => item.interfaces
    ).sort((left, right) => left.id.localeCompare(right.id));
    const mountPlans = placements.map(
      item => item.mountPlan
    ).sort((left, right) => left.sourceId.localeCompare(right.sourceId));
    const adaptedApertureResult = mountApertureResult(
      input.apertureResult,
      placements
    );
    const compatibility = {
      physicalIdentityCanonical: true,
      passageSolverV1: true,
      mountSolverV1: true,
      code: null,
      note: "Physical instance-qualified candidates and physical/template " +
        "aperture bindings are directly consumable by sibling solvers."
    };
    const base = {
      schemaVersion: SCHEMA_VERSION,
      kind: "threeway-physical-interface-plan",
      topology: stableClone(state.state.topology),
      preservedHashes: hashes,
      apertureLayouts,
      driverChamberInterfaces,
      mountPlans,
      mountApertureResult: adaptedApertureResult,
      downstreamCompatibility: compatibility,
      counts: {
        placementPlans: placements.length,
        physicalDrivers: mountPlans.reduce(
          (sum, item) => sum + item.instances.length,
          0
        ),
        physicalLayouts: apertureLayouts.length,
        physicalApertures: apertureLayouts.reduce(
          (sum, item) => sum + item.candidate.apertures.length,
          0
        ),
        driverChamberInterfaces: driverChamberInterfaces.length
      },
      invariants: {
        onePhysicalLayoutPerDriver: true,
        oneChamberInterfacePerDriver: true,
        everyPhysicalApertureInstanceQualified: true,
        templateApertureGeometryChanged: false,
        everyDriverFaceOutsideHorn: true,
        driverEntryPerpendicularToFace: true,
        framesRightHanded: true,
        sourceCountInferred: false,
        mouthInferred: false,
        crossoverInferred: false,
        productInferred: false,
        meshesGenerated: false,
        booleansPerformed: false
      },
      hardwareValidated: false,
      acousticValidated: false,
      exactSolid: false,
      manufacturing: false,
      stl: false
    };
    const hashInput = `${HASH_VERSION}\n${stableStringify(base)}`;
    return deepFreeze({
      ok: true,
      code: null,
      result: {
        ...base,
        hashInput
      },
      diagnostics: sortedDiagnostics(diagnostics),
      hashInput,
      preservedHashes: hashes,
      exactSolid: false,
      manufacturing: false,
      stl: false,
      model: MODEL_METADATA,
      capabilities: CAPABILITIES
    });
  }

  function manufacturingPreflight(operation) {
    return deepFreeze({
      ok: false,
      available: false,
      operation: cleanString(operation) || "interface-manufacturing",
      code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
      reason: CAPABILITIES.reason,
      exactSolid: false,
      manufacturing: false,
      stl: false,
      model: MODEL_METADATA,
      capabilities: CAPABILITIES
    });
  }

  return deepFreeze({
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    hashVersion: HASH_VERSION,
    failureCodes: FAILURE_CODES,
    distributions: DISTRIBUTIONS,
    axisPolicies: AXIS_POLICIES,
    pathFamilies: PATH_FAMILIES,
    modelMetadata: MODEL_METADATA,
    capabilities: CAPABILITIES,
    stableStringify,
    planInterfaces,
    planPhysicalInterfaces: planInterfaces,
    manufacturingPreflight
  });
}));
