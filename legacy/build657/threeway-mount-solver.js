/*
 * MEH Studio v5 — pure three-way source-instance mount solver.
 *
 * Successful schema-2 station placement, explicit aperture candidates,
 * canonical passage/lumen results, and resolved driver records are the only
 * geometry owners accepted here. This module solves immutable driver-face
 * datums and delegates every positive host to threeway-mount-host.js. It does
 * not move drivers, invent counts or cone dimensions, modify lumen paths,
 * perform Booleans, create mesh math, or grant manufacturing authority.
 */
(function attachThreeWayMountSolver(root, factory) {
  "use strict";

  const mountHost = typeof module === "object" && module.exports
    ? require("./threeway-mount-host.js")
    : root && root.MEH3MountHost;
  const api = factory(mountHost);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3MountSolver = api;
}(typeof globalThis !== "undefined" ? globalThis : this,
function createThreeWayMountSolver(defaultMountHost) {
  "use strict";

  const VERSION = 1;
  const SCHEMA_VERSION = 2;
  const TAU = 2 * Math.PI;
  const EPS = 1e-12;
  const DISTRIBUTIONS = Object.freeze(["rotational", "panel-pairs"]);
  const AXIS_POLICIES = Object.freeze(["wall-normal", "explicit-blend"]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const FAILURE_CODES = deepFreeze({
    INPUT_INVALID: "THREEWAY_MOUNT_SOLVER_INPUT_INVALID",
    DEPENDENCY_INVALID: "THREEWAY_MOUNT_SOLVER_DEPENDENCY_INVALID",
    STATION_RESULT_INVALID: "THREEWAY_MOUNT_SOLVER_STATION_RESULT_INVALID",
    APERTURE_RESULT_INVALID: "THREEWAY_MOUNT_SOLVER_APERTURE_RESULT_INVALID",
    PASSAGE_RESULT_INVALID: "THREEWAY_MOUNT_SOLVER_PASSAGE_RESULT_INVALID",
    DRIVER_RESULT_INVALID: "THREEWAY_MOUNT_SOLVER_DRIVER_RESULT_INVALID",
    OWNERSHIP_INVALID: "THREEWAY_MOUNT_SOLVER_OWNERSHIP_INVALID",
    COUNT_MISMATCH: "THREEWAY_MOUNT_SOLVER_COUNT_MISMATCH",
    INSTANCE_INVALID: "THREEWAY_MOUNT_SOLVER_INSTANCE_INVALID",
    AXIS_POLICY_INVALID: "THREEWAY_MOUNT_SOLVER_AXIS_POLICY_INVALID",
    FRAME_INVALID: "THREEWAY_MOUNT_SOLVER_FRAME_INVALID",
    SYMMETRY_INVALID: "THREEWAY_MOUNT_SOLVER_SYMMETRY_INVALID",
    PANEL_ORIENTATION_INVALID:
      "THREEWAY_MOUNT_SOLVER_PANEL_ORIENTATION_INVALID",
    APERTURE_BINDING_INVALID:
      "THREEWAY_MOUNT_SOLVER_APERTURE_BINDING_INVALID",
    LUMEN_MISMATCH: "THREEWAY_MOUNT_SOLVER_LUMEN_MISMATCH",
    HOST_UNSOLVABLE: "THREEWAY_MOUNT_HOST_UNSOLVABLE",
    ACTIVE_CONE_FAILED: "THREEWAY_ACTIVE_CONE_COVERAGE_FAILED",
    DRIVER_COLLISION: "THREEWAY_DRIVER_COLLISION"
  });

  const CAPABILITIES = deepFreeze({
    status: "analysis-only-source-instance-mount-intent",
    explicitSourceInstanceDatums: true,
    wallNormalAxisPolicy: true,
    explicitBlendAxisPolicy: true,
    rotationalSymmetryValidation: true,
    panelPairSymmetryValidation: true,
    sharedPanelTapParallelism: true,
    fullDriverEnvelopeValidation: true,
    canonicalLumenPerAperture: true,
    physicalInstanceQualifiedApertures: true,
    immutableTemplateApertureProvenance: true,
    positiveHostDelegation: true,
    deterministicKeyedOutput: true,
    driverMotion: false,
    driverCountInference: false,
    coneDimensionInference: false,
    lumenPathMutation: false,
    lumenBending: false,
    booleanUnion: false,
    booleanSubtraction: false,
    exactSolid: false,
    hardwareValidated: false,
    manufacturingPlan: false,
    manufacturing: false,
    stl: false,
    reason:
      "Solved mount and positive-host intent is analysis geometry only; " +
      "no Boolean or fabrication audit has occurred."
  });

  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
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

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value)) copy[key] = cloneValue(value[key]);
      return copy;
    }
    if (typeof value === "number" && Object.is(value, -0)) return 0;
    return value;
  }

  function stableClone(value) {
    if (Array.isArray(value)) return value.map(stableClone);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value).sort()) {
        if (value[key] !== undefined) copy[key] = stableClone(value[key]);
      }
      return copy;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
    }
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean") {
      return value;
    }
    return null;
  }

  function stableStringify(value) {
    return JSON.stringify(stableClone(value));
  }

  function uniqueStrings(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(cleanString).filter(Boolean))].sort();
  }

  function diagnostic(code, paths, message, details) {
    return deepFreeze({
      code,
      severity: "error",
      phase: "mount-solve",
      paths: uniqueStrings(paths),
      message,
      details: isRecord(details) || Array.isArray(details)
        ? cloneValue(details)
        : {},
      evidenceRefs: [],
      blocksCapabilities: [
        "analysis",
        "renderPreview",
        "mountIntent",
        "exactSolid",
        "manufacturing",
        "stl"
      ]
    });
  }

  function compareDiagnostics(left, right) {
    return [
      left.code,
      left.paths.join("\u0000"),
      left.message,
      stableStringify(left.details)
    ].join("\u0001").localeCompare([
      right.code,
      right.paths.join("\u0000"),
      right.message,
      stableStringify(right.details)
    ].join("\u0001"));
  }

  function failure(diagnostics) {
    const ordered = diagnostics.slice().sort(compareDiagnostics);
    return deepFreeze({
      ok: false,
      code: ordered.length
        ? ordered[0].code
        : FAILURE_CODES.INPUT_INVALID,
      result: null,
      diagnostics: ordered,
      hashInput: null,
      hardwareValidated: false,
      manufacturing: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function vec3(value) {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(finite)) {
      return null;
    }
    return value.map(item => Object.is(item, -0) ? 0 : item);
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
    return Math.hypot(vector[0], vector[1], vector[2]);
  }

  function normalize(vector) {
    const magnitude = vector ? length(vector) : 0;
    return magnitude > EPS ? scale(vector, 1 / magnitude) : null;
  }

  function distance(left, right) {
    return length(subtract(left, right));
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function angleDeg(left, right) {
    return Math.acos(clamp(dot(left, right), -1, 1)) * 180 / Math.PI;
  }

  function lineAngleDeg(left, right) {
    return Math.min(angleDeg(left, right), angleDeg(left, scale(right, -1)));
  }

  function normalizeAngle(value) {
    if (!finite(value)) return null;
    const normalized = value % TAU;
    return normalized < 0 ? normalized + TAU : normalized;
  }

  function angleDistance(left, right) {
    const delta = Math.abs(normalizeAngle(left) - normalizeAngle(right));
    return Math.min(delta, TAU - delta);
  }

  function axisAngleDistance(left, right) {
    const delta = angleDistance(left, right);
    return Math.min(delta, Math.abs(Math.PI - delta));
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

  function projectionOntoPlane(vector, normal) {
    return subtract(vector, scale(normal, dot(vector, normal)));
  }

  function vectorClose(left, right, toleranceM) {
    return distance(left, right) <= toleranceM;
  }

  function directionClose(left, right, toleranceDeg) {
    return angleDeg(left, right) <= toleranceDeg;
  }

  function lineDirectionClose(left, right, toleranceDeg) {
    return lineAngleDeg(left, right) <= toleranceDeg;
  }

  function normalizeValidation(raw, diagnostics) {
    const value = isRecord(raw) ? raw : {};
    const positionToleranceM = positive(value.positionToleranceM);
    const sectionToleranceM = positive(value.sectionToleranceM);
    const angleToleranceDeg = positive(value.angleToleranceDeg);
    const azimuthToleranceRad = positive(value.azimuthToleranceRad);
    const minimumDriverClearanceM =
      nonnegative(value.minimumDriverClearanceM);
    if (positionToleranceM === null ||
        sectionToleranceM === null ||
        angleToleranceDeg === null ||
        angleToleranceDeg > 5 ||
        azimuthToleranceRad === null ||
        minimumDriverClearanceM === null) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        ["validation"],
        "Explicit positive position/section/azimuth tolerances, an angle " +
          "tolerance no greater than five degrees, and nonnegative driver " +
          "clearance are required."
      ));
    }
    return {
      positionToleranceM,
      sectionToleranceM,
      angleToleranceDeg,
      azimuthToleranceRad,
      minimumDriverClearanceM
    };
  }

  function unwrapStationResult(raw, diagnostics) {
    const result = isRecord(raw) && isRecord(raw.result) ? raw.result : null;
    if (!isRecord(raw) ||
        raw.ok !== true ||
        !result ||
        result.schemaVersion !== SCHEMA_VERSION ||
        !Array.isArray(result.selectedEntryStations)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.STATION_RESULT_INVALID,
        ["stationResult"],
        "A successful schema-2 station-solver result is required."
      ));
      return new Map();
    }
    const stations = new Map();
    for (const item of result.selectedEntryStations) {
      const id = cleanString(item && item.stationId);
      const sourceIds = uniqueStrings(item && item.sourceIds);
      const sourceCount = positiveInteger(item && item.sourceCount);
      const distribution = cleanString(item && item.distribution);
      const axialM = finite(item && item.axialM) ? item.axialM : null;
      const axialSpanM = positive(item && item.requiredAxialSpanM);
      const azimuths = item && item.circumferential &&
          Array.isArray(item.circumferential.sourceAzimuthsRad)
        ? item.circumferential.sourceAzimuthsRad.map(normalizeAngle)
        : [];
      if (!id ||
          stations.has(id) ||
          !sourceIds.length ||
          sourceCount === null ||
          !DISTRIBUTIONS.includes(distribution) ||
          axialM === null ||
          axialSpanM === null ||
          azimuths.length !== sourceCount ||
          azimuths.some(value => value === null)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.STATION_RESULT_INVALID,
          [`stationResult.result.selectedEntryStations[${id || "?"}]`],
          "Every selected station requires stable identity, explicit source " +
            "count/distribution, finite axial span, and one source azimuth " +
            "per physical driver."
        ));
      }
      if (id) {
        stations.set(id, {
          id,
          sourceIds,
          sourceCount,
          distribution,
          axialM,
          requiredAxialSpanM: axialSpanM,
          sourceAzimuthsRad: azimuths,
          hornSurfaceHash: cleanString(result.hornSurfaceHash),
          record: item
        });
      }
    }
    return stations;
  }

  function unwrapApertureResult(raw, diagnostics) {
    if (!isRecord(raw) || raw.ok !== true || !Array.isArray(raw.sources)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_RESULT_INVALID,
        ["apertureResult"],
        "A successful explicit aperture-layout result is required."
      ));
      return new Map();
    }
    const sources = new Map();
    for (const result of raw.sources) {
      const sourceId = cleanString(result && result.sourceId);
      if (!sourceId ||
          sources.has(sourceId) ||
          result.ok !== true ||
          !Array.isArray(result.feasibleCandidates)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_RESULT_INVALID,
          [`apertureResult.sources[${sourceId || "?"}]`],
          "Every aperture source must be successful, uniquely keyed, and " +
            "contain explicit feasible candidates."
        ));
      }
      if (sourceId) sources.set(sourceId, result);
    }
    return sources;
  }

  function unwrapPassageResults(raw, diagnostics) {
    const payload = isRecord(raw) && isRecord(raw.result)
      ? raw.result
      : null;
    const supplied = payload && Array.isArray(payload.passages)
      ? payload.passages
      : [];
    if (!isRecord(raw) ||
        raw.ok !== true ||
        !payload ||
        !isRecord(payload.invariants) ||
        payload.invariants.oneCanonicalLumenPerAperture !== true ||
        !supplied.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PASSAGE_RESULT_INVALID,
        ["passageResult"],
        "A successful canonical passage-solver result with one canonical " +
          "lumen per aperture is required."
      ));
      return new Map();
    }
    const passages = new Map();
    for (const passage of supplied) {
      const record = isRecord(passage) &&
          isRecord(passage.canonicalLumenIntent)
        ? passage.canonicalLumenIntent
        : null;
      const mesh = isRecord(passage) &&
          isRecord(passage.negativeInspectionMesh)
        ? passage.negativeInspectionMesh
        : null;
      const id = cleanString(passage && passage.id);
      if (!id ||
          passages.has(id) ||
          passage.canonicalNegative !== true ||
          !record ||
          record.canonicalNegative !== true ||
          !cleanString(passage.hashInput) ||
          !mesh ||
          !isRecord(mesh.audit) ||
          mesh.audit.closed !== true ||
          mesh.audit.twoManifold !== true ||
          mesh.manufacturingAuthority !== false) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PASSAGE_RESULT_INVALID,
          [`passageResult.result.passages[${id || "?"}]`],
          "Passages must be uniquely keyed canonical lumen intents carrying " +
            "their unchanged closed negative inspection mesh and stable hash."
        ));
      }
      if (id) {
        passages.set(id, {
          passage,
          record,
          negativeInspectionMesh: mesh,
          hostLumenResult: {
            ok: true,
            code: null,
            record,
            hashInput: cleanString(passage.geometryHashInput) ||
              cleanString(passage.hashInput),
            manufacturing: false
          }
        });
      }
    }
    return passages;
  }

  function unwrapResolvedDrivers(raw, diagnostics) {
    if (!isRecord(raw) || raw.ok !== true || !Array.isArray(raw.sources)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.DRIVER_RESULT_INVALID,
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
          !cleanString(driver.id)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.DRIVER_RESULT_INVALID,
          [`resolvedDrivers.sources[${sourceId || "?"}]`],
          "Each mounted source requires a unique source ID, explicit physical " +
            "driver count, and complete resolved driver record."
        ));
      }
      if (sourceId) {
        sources.set(sourceId, {
          sourceId,
          count,
          driver,
          bandIds: uniqueStrings(item.bandIds),
          record: item
        });
      }
    }
    return sources;
  }

  function normalizedUnitAxis(
    value,
    path,
    diagnostics,
    tolerance = 1e-7
  ) {
    const vector = vec3(value);
    if (!vector || Math.abs(length(vector) - 1) > tolerance) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.FRAME_INVALID,
        [path],
        "Frame axes must be explicit unit vectors."
      ));
      return null;
    }
    return normalize(vector);
  }

  function normalizeWallFrame(raw, path, validation, diagnostics) {
    const frame = isRecord(raw) ? raw : {};
    const originM = vec3(frame.originM);
    const normal = normalizedUnitAxis(
      frame.normal,
      `${path}.normal`,
      diagnostics
    );
    const axialTangent = normalizedUnitAxis(
      frame.axialTangent,
      `${path}.axialTangent`,
      diagnostics
    );
    const crossTangent = normalizedUnitAxis(
      frame.crossTangent,
      `${path}.crossTangent`,
      diagnostics
    );
    if (!originM) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.FRAME_INVALID,
        [`${path}.originM`],
        "A finite SI wall-frame origin is required."
      ));
    }
    if (normal && axialTangent && crossTangent) {
      const orthogonality = Math.max(
        Math.abs(dot(normal, axialTangent)),
        Math.abs(dot(normal, crossTangent)),
        Math.abs(dot(axialTangent, crossTangent))
      );
      const handedness = dot(cross(crossTangent, axialTangent), normal);
      if (orthogonality > Math.sin(
          validation.angleToleranceDeg * Math.PI / 180
        ) ||
          handedness < Math.cos(
            validation.angleToleranceDeg * Math.PI / 180
          )) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.FRAME_INVALID,
          [path],
          "Wall frame must be orthonormal with " +
            "crossTangent × axialTangent = outward normal."
        ));
      }
    }
    return { originM, normal, axialTangent, crossTangent };
  }

  function normalizePanelFrame(raw, path, validation, diagnostics) {
    const record = isRecord(raw) ? raw : {};
    const id = cleanString(record.id);
    const originM = vec3(record.originM);
    const normal = normalizedUnitAxis(
      record.normal,
      `${path}.normal`,
      diagnostics
    );
    const uAxis = normalizedUnitAxis(
      record.uAxis,
      `${path}.uAxis`,
      diagnostics
    );
    const vAxis = normalizedUnitAxis(
      record.vAxis,
      `${path}.vAxis`,
      diagnostics
    );
    const azimuthRad = normalizeAngle(record.azimuthRad);
    const instanceIds = uniqueStrings(record.instanceIds);
    if (!id || !originM || azimuthRad === null || instanceIds.length !== 2) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SYMMETRY_INVALID,
        [path],
        "Each panel-pair frame requires an ID, origin, azimuth, and exactly " +
          "two explicit instance IDs."
      ));
    }
    if (normal && uAxis && vAxis) {
      const orthogonality = Math.max(
        Math.abs(dot(normal, uAxis)),
        Math.abs(dot(normal, vAxis)),
        Math.abs(dot(uAxis, vAxis))
      );
      const handedness = dot(cross(uAxis, vAxis), normal);
      if (orthogonality > Math.sin(
          validation.angleToleranceDeg * Math.PI / 180
        ) ||
          handedness < Math.cos(
            validation.angleToleranceDeg * Math.PI / 180
          )) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.FRAME_INVALID,
          [path],
          "Panel axes must be orthonormal and right-handed."
        ));
      }
    }
    return {
      id,
      originM,
      normal,
      uAxis,
      vAxis,
      azimuthRad,
      instanceIds
    };
  }

  function normalizeAxisPolicy(raw, path, diagnostics) {
    const policy = isRecord(raw) ? raw : {};
    const kind = cleanString(policy.kind);
    const normalSign = policy.normalSign === 1 || policy.normalSign === -1
      ? policy.normalSign
      : null;
    if (!AXIS_POLICIES.includes(kind) || normalSign === null) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.AXIS_POLICY_INVALID,
        [path],
        "Axis policy must be wall-normal or explicit-blend and must declare " +
          "normalSign as +1 or -1."
      ));
    }
    if (kind === "wall-normal") {
      if (hasOwn(policy, "blendFraction") || hasOwn(policy, "targetAxis")) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.AXIS_POLICY_INVALID,
          [path],
          "wall-normal does not accept a hidden blend target or fraction."
        ));
      }
      return {
        kind,
        normalSign,
        blendFraction: null,
        targetAxis: null
      };
    }
    const blendFraction = finite(policy.blendFraction) &&
        policy.blendFraction > 0 &&
        policy.blendFraction <= 1
      ? policy.blendFraction
      : null;
    const targetRaw = vec3(policy.targetAxis);
    const targetAxis = targetRaw ? normalize(targetRaw) : null;
    if (blendFraction === null || !targetAxis) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.AXIS_POLICY_INVALID,
        [`${path}.blendFraction`, `${path}.targetAxis`],
        "explicit-blend requires a fraction in (0, 1] and an explicit " +
          "nonzero world-space target axis."
      ));
    }
    return {
      kind,
      normalSign,
      blendFraction,
      targetAxis
    };
  }

  function solveMountDatum(
    faceOriginM,
    wallFrame,
    policy,
    path,
    diagnostics
  ) {
    if (!faceOriginM ||
        !wallFrame.normal ||
        !wallFrame.axialTangent ||
        !policy.normalSign) {
      return null;
    }
    const signedNormal = scale(wallFrame.normal, policy.normalSign);
    let driverAxis = signedNormal;
    if (policy.kind === "explicit-blend" &&
        policy.targetAxis &&
        policy.blendFraction !== null) {
      driverAxis = normalize(add(
        scale(signedNormal, 1 - policy.blendFraction),
        scale(policy.targetAxis, policy.blendFraction)
      ));
    }
    if (!driverAxis) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.AXIS_POLICY_INVALID,
        [path],
        "The explicit axis blend cancels to a zero vector."
      ));
      return null;
    }
    const uAxis = normalize(projectionOntoPlane(
      wallFrame.axialTangent,
      driverAxis
    ));
    const vAxis = uAxis ? normalize(cross(driverAxis, uAxis)) : null;
    if (!uAxis || !vAxis) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.FRAME_INVALID,
        [path],
        "The wall axial tangent cannot define a finite driver-face frame " +
          "under the declared axis policy."
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

  function findCandidate(
    sourceResult,
    candidateId,
    path,
    diagnostics
  ) {
    const id = cleanString(candidateId);
    const candidates = sourceResult && Array.isArray(
      sourceResult.feasibleCandidates
    )
      ? sourceResult.feasibleCandidates
      : [];
    const candidate = id
      ? candidates.find(item => item.ok === true && item.id === id)
      : null;
    if (!candidate) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_RESULT_INVALID,
        [path],
        "Every mount plan must explicitly select one successful aperture " +
          "candidate; count is never selected automatically.",
        { candidateId: id }
      ));
    }
    return candidate;
  }

  function validateCandidateOrientation(
    candidate,
    distribution,
    path,
    diagnostics
  ) {
    if (!candidate) return;
    if (candidate.allLongAxesParallel !== true ||
        !Array.isArray(candidate.apertures) ||
        !candidate.apertures.length ||
        candidate.apertures.some(aperture =>
          !finite(aperture.angleRad))) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_ORIENTATION_INVALID,
        [path],
        "Selected aperture candidate must retain explicit parallel long axes."
      ));
    }
    const mode = candidate.orientationPolicy &&
      candidate.orientationPolicy.mode;
    if (distribution === "rotational" &&
        mode !== "driver-local-parallel") {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_ORIENTATION_INVALID,
        [path],
        "Rotational mounts require driver-local-parallel aperture orientation."
      ));
    }
    if (distribution === "panel-pairs" &&
        mode !== "panel-parallel") {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PANEL_ORIENTATION_INVALID,
        [path],
        "Shared panels require an explicit panel-parallel aperture candidate."
      ));
    }
  }

  function unwrapPassage(envelope) {
    return isRecord(envelope) && isRecord(envelope.record)
      ? envelope.record
      : null;
  }

  function projectedPoint(point, datum) {
    const delta = subtract(point, datum.originM);
    return {
      u: dot(delta, datum.uAxis),
      v: dot(delta, datum.vAxis),
      normal: dot(delta, datum.normal)
    };
  }

  function apertureSectionMatches(
    aperture,
    passage,
    validation
  ) {
    const section = passage.startSection;
    const shape = aperture.shape;
    if (!section || !shape || section.family !== shape.kind) return false;
    if (shape.kind === "round") {
      return Math.abs(section.diameterM - shape.longAxisM) <=
        validation.sectionToleranceM;
    }
    return Math.abs(section.widthM - shape.longAxisM) <=
        validation.sectionToleranceM &&
      Math.abs(section.heightM - shape.shortAxisM) <=
        validation.sectionToleranceM &&
      axisAngleDistance(section.rotationRad, aperture.angleRad) <=
        validation.azimuthToleranceRad;
  }

  function normalizeBindings(
    raw,
    candidate,
    instance,
    sourceId,
    station,
    datum,
    passageMap,
    usedPassages,
    validation,
    diagnostics
  ) {
    const path = `mountPlans[${sourceId}].instances[${instance.id}]`;
    const bindings = Array.isArray(raw) ? raw : [];
    const byAperture = new Map();
    const physicalCandidate =
      !!cleanString(candidate.physicalDriverInstanceId);
    const apertureById = new Map(
      candidate.apertures.map(aperture => [aperture.id, aperture])
    );
    for (const binding of bindings) {
      const apertureId = cleanString(binding && binding.apertureId);
      const templateApertureId = cleanString(
        binding && binding.templateApertureId
      );
      const physicalCandidateId = cleanString(
        binding && binding.physicalCandidateId
      );
      const templateCandidateId = cleanString(
        binding && binding.templateCandidateId
      );
      const passageId = cleanString(binding && binding.passageId);
      if (!apertureId ||
          !passageId ||
          byAperture.has(apertureId) ||
          !apertureById.has(apertureId) ||
          !passageMap.has(passageId) ||
          usedPassages.has(passageId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_BINDING_INVALID,
          [`${path}.apertureBindings`],
          "Every selected aperture requires one unique, previously unused " +
            "canonical passage binding.",
          { apertureId, passageId }
        ));
        continue;
      }
      const envelope = passageMap.get(passageId);
      const passage = unwrapPassage(envelope);
      const passageRecord = envelope && envelope.passage;
      const aperture = apertureById.get(apertureId);
      const expectedTemplateApertureId =
        cleanString(aperture && aperture.templateApertureId) ||
        apertureId;
      if (physicalCandidate &&
          (
            templateApertureId !== expectedTemplateApertureId ||
            physicalCandidateId !== cleanString(candidate.id) ||
            templateCandidateId !==
              cleanString(candidate.templateCandidateId)
          )) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_BINDING_INVALID,
          [`${path}.apertureBindings[${apertureId}]`],
          "Physical aperture bindings must carry matching physical and immutable template candidate/aperture identities.",
          {
            apertureId,
            templateApertureId,
            physicalCandidateId,
            templateCandidateId
          }
        ));
      }
      byAperture.set(apertureId, {
        apertureId,
        templateApertureId: expectedTemplateApertureId,
        physicalCandidateId: cleanString(candidate.id),
        templateCandidateId:
          cleanString(candidate.templateCandidateId) ||
          cleanString(candidate.id),
        passageId,
        aperture,
        passage,
        passageRecord,
        result: envelope && envelope.hostLumenResult,
        negativeInspectionMesh:
          envelope && envelope.negativeInspectionMesh
      });
      usedPassages.add(passageId);
      if (!passage ||
          !passageRecord ||
          cleanString(passageRecord.apertureId) !== apertureId ||
          (physicalCandidate &&
            cleanString(passageRecord.templateApertureId) !==
              expectedTemplateApertureId) ||
          cleanString(passageRecord.driverInstanceId) !== instance.id ||
          cleanString(passageRecord.sourceId) !== sourceId ||
          cleanString(passageRecord.stationId) !== station.id ||
          !isRecord(passageRecord.canonicalOwnership) ||
          passageRecord.canonicalOwnership.ownerCount !== 1 ||
          passageRecord.canonicalOwnership.canonical !== true ||
          cleanString(passage.ownerSourceId) !== sourceId ||
          cleanString(passage.ownerStationId) !== station.id) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [`${path}.apertureBindings[${apertureId}]`],
          "Bound passage source/station ownership must exactly match the " +
            "physical driver instance and selected aperture.",
          {
            apertureId,
            passageId,
            passageDriverInstanceId:
              passageRecord && passageRecord.driverInstanceId
          }
        ));
        continue;
      }
      const driverPoint = vec3(
        passage.driverEndpoint && passage.driverEndpoint.pointM
      );
      const hornPoint = vec3(
        passage.hornEndpoint && passage.hornEndpoint.pointM
      );
      if (!driverPoint || !hornPoint) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.LUMEN_MISMATCH,
          [`${path}.apertureBindings[${apertureId}]`],
          "Canonical passage endpoints must remain explicit and finite."
        ));
        continue;
      }
      const local = projectedPoint(driverPoint, datum);
      const halfSpan = station.requiredAxialSpanM / 2;
      if (Math.abs(local.normal) > validation.positionToleranceM ||
          Math.abs(local.u - aperture.centerM.x) >
            validation.positionToleranceM ||
          Math.abs(local.v - aperture.centerM.y) >
            validation.positionToleranceM ||
          !apertureSectionMatches(aperture, passage, validation) ||
          hornPoint[0] < station.axialM - halfSpan -
            validation.positionToleranceM ||
          hornPoint[0] > station.axialM + halfSpan +
            validation.positionToleranceM) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.LUMEN_MISMATCH,
          [`${path}.apertureBindings[${apertureId}]`],
          "The untouched canonical passage must match aperture center, " +
            "section, orientation, driver datum plane, and station axial span.",
          {
            apertureId,
            passageId,
            projectedCenterM: { x: local.u, y: local.v },
            expectedCenterM: aperture.centerM
          }
        ));
      }
    }
    const expectedIds = [...apertureById.keys()].sort();
    const actualIds = [...byAperture.keys()].sort();
    if (stableStringify(actualIds) !== stableStringify(expectedIds)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_BINDING_INVALID,
        [`${path}.apertureBindings`],
        "Aperture bindings must be one-to-one and complete for the explicitly " +
          "selected candidate.",
        { expectedApertureIds: expectedIds, boundApertureIds: actualIds }
      ));
    }
    return [...byAperture.values()].sort((left, right) =>
      left.apertureId.localeCompare(right.apertureId)
    );
  }

  function normalizeAuxiliary(raw, sourceId, stationId, path, diagnostics) {
    const items = Array.isArray(raw) ? raw : [];
    const ids = new Set();
    const normalized = [];
    for (const item of items) {
      const id = cleanString(item && item.id);
      if (!id ||
          ids.has(id) ||
          cleanString(item && item.ownerSourceId) !== sourceId ||
          cleanString(item && item.ownerStationId) !== stationId) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [path],
          "Auxiliary negative IDs and source/station ownership must be " +
            "explicit and unique."
        ));
      }
      if (id) ids.add(id);
      normalized.push(cloneValue(item));
    }
    return normalized.sort((left, right) =>
      String(left.id || "").localeCompare(String(right.id || ""))
    );
  }

  function worldApertureAxis(aperture, datum) {
    return normalize(add(
      scale(datum.uAxis, Math.cos(aperture.angleRad)),
      scale(datum.vAxis, Math.sin(aperture.angleRad))
    ));
  }

  function normalizePlans(
    rawPlans,
    stationMap,
    apertureMap,
    passageMap,
    driverMap,
    validation,
    diagnostics
  ) {
    if (!Array.isArray(rawPlans)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        ["mountPlans"],
        "mountPlans must explicitly enumerate every wall-entry source."
      ));
      return [];
    }
    const usedSources = new Set();
    const usedInstances = new Set();
    const usedPassages = new Set();
    const prepared = [];
    const plans = rawPlans.slice().sort((left, right) =>
      String(left && left.sourceId || "").localeCompare(
        String(right && right.sourceId || "")
      )
    );
    for (const rawPlan of plans) {
      const sourceId = cleanString(rawPlan && rawPlan.sourceId);
      const stationId = cleanString(rawPlan && rawPlan.stationId);
      const path = `mountPlans[${sourceId || "?"}]`;
      if (!sourceId || usedSources.has(sourceId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [path],
          "Each wall-entry source requires exactly one uniquely keyed mount plan."
        ));
        continue;
      }
      usedSources.add(sourceId);
      const station = stationMap.get(stationId);
      const driverSource = driverMap.get(sourceId);
      const apertureSource = apertureMap.get(sourceId);
      const distribution = cleanString(rawPlan.distributionFamily);
      if (!station ||
          !station.sourceIds.includes(sourceId) ||
          !driverSource ||
          !apertureSource ||
          !DISTRIBUTIONS.includes(distribution) ||
          distribution !== station.distribution) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [path],
          "Mount source, selected station, resolved driver, aperture source, " +
            "and distribution ownership must agree exactly.",
          { sourceId, stationId, distribution }
        ));
        continue;
      }
      const instanceApertureCandidates =
        rawPlan.instanceApertureCandidates === true;
      const candidate = instanceApertureCandidates &&
          !cleanString(rawPlan.apertureCandidateId)
        ? null
        : findCandidate(
          apertureSource,
          rawPlan.apertureCandidateId,
          `${path}.apertureCandidateId`,
          diagnostics
        );
      const axisPolicy = normalizeAxisPolicy(
        rawPlan.axisPolicy,
        `${path}.axisPolicy`,
        diagnostics
      );
      const instancesRaw = Array.isArray(rawPlan.instances)
        ? rawPlan.instances
        : [];
      if (instancesRaw.length !== driverSource.count) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.COUNT_MISMATCH,
          [`${path}.instances`, "resolvedDrivers"],
          "Physical mount instances must exactly equal the explicit resolved " +
            "driver count; no count is inferred or collapsed.",
          { expected: driverSource.count, actual: instancesRaw.length }
        ));
      }
      const panels = new Map();
      for (const panelRaw of Array.isArray(rawPlan.panels)
        ? rawPlan.panels
        : []) {
        const panel = normalizePanelFrame(
          panelRaw,
          `${path}.panels[${cleanString(panelRaw && panelRaw.id) || "?"}]`,
          validation,
          diagnostics
        );
        if (!panel.id || panels.has(panel.id)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.SYMMETRY_INVALID,
            [`${path}.panels`],
            "Panel IDs must be unique within one source mount plan."
          ));
        }
        if (panel.id) panels.set(panel.id, panel);
      }
      if (distribution === "rotational" && panels.size) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.panels`],
          "Rotational mounts do not accept hidden panel-pair grouping."
        ));
      }
      if (distribution === "panel-pairs" &&
          (driverSource.count % 2 !== 0 ||
           panels.size * 2 !== driverSource.count)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.panels`, `${path}.instances`],
          "panel-pairs requires an even driver count and one explicit panel " +
            "record per physical pair."
        ));
      }
      if (!instanceApertureCandidates) validateCandidateOrientation(
        candidate,
        distribution,
        `${path}.apertureCandidateId`,
        diagnostics
      );

      const instances = [];
      for (const rawInstance of instancesRaw.slice().sort((left, right) =>
        String(left && left.id || "").localeCompare(
          String(right && right.id || "")
        )
      )) {
        const instanceId = cleanString(rawInstance && rawInstance.id);
        const instancePath = `${path}.instances[${instanceId || "?"}]`;
        const faceOriginM = vec3(rawInstance && rawInstance.faceOriginM);
        const azimuthRad = normalizeAngle(rawInstance && rawInstance.azimuthRad);
        const panelId = cleanString(rawInstance && rawInstance.panelId);
        if (!instanceId ||
            usedInstances.has(instanceId) ||
            !faceOriginM ||
            azimuthRad === null) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.INSTANCE_INVALID,
            [instancePath],
            "Each physical driver requires a globally unique ID, explicit SI " +
              "face origin, and declared azimuth."
          ));
        }
        if (instanceId) usedInstances.add(instanceId);
        const instanceCandidate = instanceApertureCandidates
          ? findCandidate(
            apertureSource,
            rawInstance &&
              rawInstance.physicalApertureCandidateId,
            `${instancePath}.physicalApertureCandidateId`,
            diagnostics
          )
          : candidate;
        validateCandidateOrientation(
          instanceCandidate,
          distribution,
          instanceApertureCandidates
            ? `${instancePath}.physicalApertureCandidateId`
            : `${path}.apertureCandidateId`,
          diagnostics
        );
        if (instanceApertureCandidates && instanceCandidate &&
            (
              cleanString(instanceCandidate.physicalDriverInstanceId) !==
                instanceId ||
              !cleanString(instanceCandidate.templateCandidateId) ||
              instanceCandidate.templateGeometryChanged !== false ||
              instanceCandidate.apertures.some(aperture =>
                cleanString(aperture.physicalDriverInstanceId) !==
                  instanceId ||
                cleanString(aperture.physicalCandidateId) !==
                  cleanString(instanceCandidate.id) ||
                !cleanString(aperture.templateApertureId) ||
                cleanString(aperture.templateCandidateId) !==
                  cleanString(instanceCandidate.templateCandidateId)
              )
            )) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_RESULT_INVALID,
            [`${instancePath}.physicalApertureCandidateId`],
            "Every physical mount instance requires its own instance-qualified candidate while preserving unchanged template aperture geometry."
          ));
        }
        const wallFrame = normalizeWallFrame(
          rawInstance && rawInstance.wallFrame,
          `${instancePath}.wallFrame`,
          validation,
          diagnostics
        );
        const datum = solveMountDatum(
          faceOriginM,
          wallFrame,
          axisPolicy,
          `${instancePath}.mountDatum`,
          diagnostics
        );
        if (wallFrame.originM) {
          const halfSpan = station.requiredAxialSpanM / 2;
          if (wallFrame.originM[0] < station.axialM - halfSpan -
                validation.positionToleranceM ||
              wallFrame.originM[0] > station.axialM + halfSpan +
                validation.positionToleranceM) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.INSTANCE_INVALID,
              [`${instancePath}.wallFrame.originM`],
              "Wall-frame axial coordinate lies outside the selected station span."
            ));
          }
        }
        let bindings = [];
        if (instanceCandidate && datum) {
          bindings = normalizeBindings(
            rawInstance.apertureBindings,
            instanceCandidate,
            { id: instanceId },
            sourceId,
            station,
            datum,
            passageMap,
            usedPassages,
            validation,
            diagnostics
          );
        }
        const auxiliaryNegatives = normalizeAuxiliary(
          rawInstance && rawInstance.auxiliaryNegatives,
          sourceId,
          stationId,
          `${instancePath}.auxiliaryNegatives`,
          diagnostics
        );
        instances.push({
          id: instanceId,
          sourceId,
          stationId,
          azimuthRad,
          panelId,
          faceOriginM,
          wallFrame,
          mountDatum: datum,
          driverAxis: datum && datum.normal,
          candidate: instanceCandidate,
          apertureBindings: bindings,
          auxiliaryNegatives,
          provenanceRefs: uniqueStrings(
            rawInstance && rawInstance.provenanceRefs
          )
        });
      }
      const referenceCandidate = candidate ||
        (instances.length ? instances[0].candidate : null);
      if (instanceApertureCandidates && referenceCandidate) {
        const templateId =
          cleanString(referenceCandidate.templateCandidateId);
        if (instances.some(instance =>
          !instance.candidate ||
          cleanString(instance.candidate.templateCandidateId) !==
            templateId ||
          stableStringify(
            instance.candidate.apertures.map(aperture => ({
              templateApertureId:
                cleanString(aperture.templateApertureId),
              centerM: aperture.centerM,
              angleRad: aperture.angleRad,
              shape: aperture.shape
            }))
          ) !==
          stableStringify(
            referenceCandidate.apertures.map(aperture => ({
              templateApertureId:
                cleanString(aperture.templateApertureId),
              centerM: aperture.centerM,
              angleRad: aperture.angleRad,
              shape: aperture.shape
            }))
          ))) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_RESULT_INVALID,
            [`${path}.instances`],
            "All physical candidates in one source plan must preserve the identical selected template geometry."
          ));
        }
      }
      prepared.push({
        sourceId,
        stationId,
        station,
        driverSource,
        apertureSource,
        candidate: referenceCandidate,
        instanceApertureCandidates,
        distribution,
        axisPolicy,
        construction: isRecord(rawPlan.construction)
          ? cloneValue(rawPlan.construction)
          : {},
        panels,
        instances,
        provenanceRefs: uniqueStrings(rawPlan.provenanceRefs)
      });
    }

    const expectedSources = [...stationMap.values()]
      .flatMap(station => station.sourceIds)
      .sort();
    const actualSources = [...usedSources].sort();
    if (stableStringify(actualSources) !== stableStringify(expectedSources)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.OWNERSHIP_INVALID,
        ["mountPlans", "stationResult"],
        "Mount plans must be one-to-one with every selected wall-entry " +
          "station source.",
        { expectedSources, actualSources }
      ));
    }
    if (usedPassages.size !== passageMap.size) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.APERTURE_BINDING_INVALID,
        ["passageResult", "mountPlans"],
        "Every supplied passage must be bound exactly once; unused passages " +
          "cannot become hidden openings.",
        {
          suppliedPassageIds: [...passageMap.keys()].sort(),
          usedPassageIds: [...usedPassages].sort()
        }
      ));
    }
    return prepared.sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId)
    );
  }

  function validateStationCounts(plans, stationMap, diagnostics) {
    for (const station of stationMap.values()) {
      const count = plans
        .filter(plan => plan.stationId === station.id)
        .reduce((sum, plan) => sum + plan.instances.length, 0);
      if (count !== station.sourceCount) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.COUNT_MISMATCH,
          [`stationResult.selectedEntryStations[${station.id}]`],
          "Sum of explicit physical driver instances must equal the selected " +
            "station source count.",
          { expected: station.sourceCount, actual: count }
        ));
      }
    }
  }

  function validateRotationalPlan(plan, validation, diagnostics) {
    const path = `mountPlans[${plan.sourceId}]`;
    const instances = plan.instances.slice().sort((left, right) =>
      left.azimuthRad - right.azimuthRad ||
      String(left.id).localeCompare(String(right.id))
    );
    if (!instances.length) return;
    const pitch = TAU / instances.length;
    for (let index = 1; index < instances.length; index++) {
      const expected = normalizeAngle(instances[0].azimuthRad + pitch * index);
      if (angleDistance(instances[index].azimuthRad, expected) >
          validation.azimuthToleranceRad) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.instances`],
          "Rotational instances must retain equal declared azimuth pitch."
        ));
        break;
      }
    }
    const expectedStationAzimuths = plan.station.sourceAzimuthsRad
      .slice()
      .sort((left, right) => left - right);
    const actualAzimuths = instances.map(item => item.azimuthRad);
    if (expectedStationAzimuths.length !== actualAzimuths.length ||
        expectedStationAzimuths.some((value, index) =>
          angleDistance(value, actualAzimuths[index]) >
            validation.azimuthToleranceRad)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SYMMETRY_INVALID,
        [`${path}.instances`, "stationResult"],
        "Rotational mount azimuths must exactly consume the station solution."
      ));
    }
    const reference = instances[0];
    for (let index = 1; index < instances.length; index++) {
      const instance = instances[index];
      const delta = instance.azimuthRad - reference.azimuthRad;
      const pointPairs = [
        [reference.faceOriginM, instance.faceOriginM],
        [reference.wallFrame.originM, instance.wallFrame.originM]
      ];
      const axisPairs = [
        [reference.wallFrame.normal, instance.wallFrame.normal],
        [reference.wallFrame.axialTangent,
          instance.wallFrame.axialTangent],
        [reference.wallFrame.crossTangent,
          instance.wallFrame.crossTangent],
        [reference.driverAxis, instance.driverAxis],
        [reference.mountDatum && reference.mountDatum.uAxis,
          instance.mountDatum && instance.mountDatum.uAxis],
        [reference.mountDatum && reference.mountDatum.vAxis,
          instance.mountDatum && instance.mountDatum.vAxis]
      ];
      if (pointPairs.some(pair =>
          !pair[0] ||
          !pair[1] ||
          !vectorClose(
            rotateAboutX(pair[0], delta),
            pair[1],
            validation.positionToleranceM
          )) ||
          axisPairs.some(pair =>
            !pair[0] ||
            !pair[1] ||
            !directionClose(
              rotateAboutX(pair[0], delta),
              pair[1],
              validation.angleToleranceDeg
            ))) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.instances[${instance.id}]`],
          "Face origins, wall frames, driver axes, and solved local frames " +
            "must be exact rotational transforms of one canonical instance."
        ));
      }
      const actualAzimuth = normalizeAngle(Math.atan2(
        instance.wallFrame.originM[2],
        instance.wallFrame.originM[1]
      ));
      if (angleDistance(actualAzimuth, instance.azimuthRad) >
          validation.azimuthToleranceRad) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.instances[${instance.id}].azimuthRad`],
          "Declared rotational azimuth must match the wall-frame locus."
        ));
      }
    }
  }

  function validatePanelPlan(plan, validation, diagnostics) {
    const path = `mountPlans[${plan.sourceId}]`;
    const instanceById = new Map(
      plan.instances.map(instance => [instance.id, instance])
    );
    const consumed = new Set();
    const panels = [...plan.panels.values()].sort((left, right) =>
      left.azimuthRad - right.azimuthRad ||
      String(left.id).localeCompare(String(right.id))
    );
    for (const panel of panels) {
      const pair = panel.instanceIds.map(id => instanceById.get(id));
      if (pair.some(instance => !instance) ||
          pair.some(instance => instance.panelId !== panel.id) ||
          panel.instanceIds.some(id => consumed.has(id))) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.panels[${panel.id}]`],
          "Each panel must own exactly two otherwise-unclaimed physical instances."
        ));
        continue;
      }
      panel.instanceIds.forEach(id => consumed.add(id));
      const [left, right] = pair;
      const midpoint = scale(add(left.faceOriginM, right.faceOriginM), 0.5);
      if (!vectorClose(
          midpoint,
          panel.originM,
          validation.positionToleranceM
        ) ||
          Math.abs(dot(
            subtract(left.faceOriginM, panel.originM),
            panel.normal
          )) > validation.positionToleranceM ||
          Math.abs(dot(
            subtract(right.faceOriginM, panel.originM),
            panel.normal
          )) > validation.positionToleranceM ||
          distance(left.faceOriginM, right.faceOriginM) <=
            validation.positionToleranceM) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.SYMMETRY_INVALID,
          [`${path}.panels[${panel.id}]`],
          "A shared-panel pair must be noncoincident and point-symmetric " +
            "about its explicit panel-frame origin."
        ));
      }
      const localToPanel = plan.candidate &&
          plan.candidate.orientationPolicy
        ? plan.candidate.orientationPolicy.driverLocalToPanelAngleRad
        : null;
      const panelAngle = plan.candidate &&
          plan.candidate.orientationPolicy
        ? plan.candidate.orientationPolicy.panelAngleRad
        : null;
      const expectedDriverU = finite(localToPanel)
        ? normalize(add(
          scale(panel.uAxis, Math.cos(localToPanel)),
          scale(panel.vAxis, Math.sin(localToPanel))
        ))
        : null;
      const expectedTapAxis = finite(panelAngle)
        ? normalize(add(
          scale(panel.uAxis, Math.cos(panelAngle)),
          scale(panel.vAxis, Math.sin(panelAngle))
        ))
        : null;
      const worldTapAxes = [];
      for (const instance of pair) {
        if (!instance.mountDatum ||
            !directionClose(
              instance.driverAxis,
              panel.normal,
              validation.angleToleranceDeg
            ) ||
            !expectedDriverU ||
            !lineDirectionClose(
              instance.mountDatum.uAxis,
              expectedDriverU,
              validation.angleToleranceDeg
            )) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.PANEL_ORIENTATION_INVALID,
            [`${path}.instances[${instance.id}]`, `${path}.panels[${panel.id}]`],
            "Driver face and local basis must honor the explicit shared-panel frame."
          ));
        }
        for (const binding of instance.apertureBindings) {
          const axis = worldApertureAxis(
            binding.aperture,
            instance.mountDatum
          );
          if (!axis ||
              !expectedTapAxis ||
              !lineDirectionClose(
                axis,
                expectedTapAxis,
                validation.angleToleranceDeg
              )) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.PANEL_ORIENTATION_INVALID,
              [`${path}.instances[${instance.id}].apertureBindings`],
              "Every aperture on one shared panel must retain the explicit " +
                "parallel panel-axis orientation."
            ));
          }
          if (axis) worldTapAxes.push(axis);
        }
      }
      for (let index = 1; index < worldTapAxes.length; index++) {
        if (!lineDirectionClose(
            worldTapAxes[0],
            worldTapAxes[index],
            validation.angleToleranceDeg
          )) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.PANEL_ORIENTATION_INVALID,
            [`${path}.panels[${panel.id}]`],
            "Tap long axes on a shared panel are not parallel."
          ));
          break;
        }
      }
    }
    if (consumed.size !== plan.instances.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.SYMMETRY_INVALID,
        [`${path}.panels`, `${path}.instances`],
        "Every panel-pair instance must be consumed exactly once."
      ));
    }
    if (panels.length) {
      const pitch = TAU / panels.length;
      const reference = panels[0];
      for (let index = 1; index < panels.length; index++) {
        const panel = panels[index];
        const expectedAzimuth = normalizeAngle(
          reference.azimuthRad + pitch * index
        );
        const delta = panel.azimuthRad - reference.azimuthRad;
        if (angleDistance(panel.azimuthRad, expectedAzimuth) >
              validation.azimuthToleranceRad ||
            !vectorClose(
              rotateAboutX(reference.originM, delta),
              panel.originM,
              validation.positionToleranceM
            ) ||
            !directionClose(
              rotateAboutX(reference.normal, delta),
              panel.normal,
              validation.angleToleranceDeg
            ) ||
            !directionClose(
              rotateAboutX(reference.uAxis, delta),
              panel.uAxis,
              validation.angleToleranceDeg
            ) ||
            !directionClose(
              rotateAboutX(reference.vAxis, delta),
              panel.vAxis,
              validation.angleToleranceDeg
            )) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.SYMMETRY_INVALID,
            [`${path}.panels[${panel.id}]`],
            "Panel-pair frames must form one exact rotational orbit about " +
              "the horn axis."
          ));
        }
      }
    }
  }

  function validateSymmetry(plans, validation, diagnostics) {
    for (const plan of plans) {
      if (plan.distribution === "rotational") {
        validateRotationalPlan(plan, validation, diagnostics);
      } else if (plan.distribution === "panel-pairs") {
        validatePanelPlan(plan, validation, diagnostics);
      }
    }
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

  function driverEnvelope(instance, driver) {
    const radiusM = driverFaceRadius(driver);
    const depthM = driver && driver.frame
      ? positive(driver.frame.depthM)
      : null;
    const frontProjectionM = driver && driver.frame
      ? nonnegative(driver.frame.frontProjectionM)
      : null;
    if (radiusM === null ||
        depthM === null ||
        frontProjectionM === null ||
        !instance.mountDatum) {
      return null;
    }
    return {
      role: "documented-driver-body-conservative-capsule",
      sourceId: instance.sourceId,
      stationId: instance.stationId,
      instanceId: instance.id,
      driverRecordId: driver.id,
      radiusM,
      rearPointM: add(
        instance.faceOriginM,
        scale(instance.driverAxis, -depthM)
      ),
      frontPointM: add(
        instance.faceOriginM,
        scale(instance.driverAxis, frontProjectionM)
      ),
      depthM,
      frontProjectionM,
      inferredDimensions: false,
      hardwareValidated: false,
      manufacturing: false
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
    let sNumerator = denominator;
    let sDenominator = denominator;
    let tNumerator = denominator;
    let tDenominator = denominator;
    if (denominator < EPS) {
      sNumerator = 0;
      sDenominator = 1;
      tNumerator = e;
      tDenominator = c;
    } else {
      sNumerator = b * e - c * d;
      tNumerator = a * e - b * d;
      if (sNumerator < 0) {
        sNumerator = 0;
        tNumerator = e;
        tDenominator = c;
      } else if (sNumerator > sDenominator) {
        sNumerator = sDenominator;
        tNumerator = e + b;
        tDenominator = c;
      }
    }
    if (tNumerator < 0) {
      tNumerator = 0;
      if (-d < 0) {
        sNumerator = 0;
      } else if (-d > a) {
        sNumerator = sDenominator;
      } else {
        sNumerator = -d;
        sDenominator = a;
      }
    } else if (tNumerator > tDenominator) {
      tNumerator = tDenominator;
      if (-d + b < 0) {
        sNumerator = 0;
      } else if (-d + b > a) {
        sNumerator = sDenominator;
      } else {
        sNumerator = -d + b;
        sDenominator = a;
      }
    }
    const sc = Math.abs(sNumerator) < EPS ? 0 : sNumerator / sDenominator;
    const tc = Math.abs(tNumerator) < EPS ? 0 : tNumerator / tDenominator;
    return length(subtract(add(w, scale(u, sc)), scale(v, tc)));
  }

  function validateDriverCollisions(
    preparedInstances,
    validation,
    diagnostics
  ) {
    const withEnvelope = preparedInstances.filter(item => item.driverEnvelope);
    for (let left = 0; left < withEnvelope.length; left++) {
      for (let right = left + 1; right < withEnvelope.length; right++) {
        const a = withEnvelope[left].driverEnvelope;
        const b = withEnvelope[right].driverEnvelope;
        const clearanceM = segmentDistance(
          a.rearPointM,
          a.frontPointM,
          b.rearPointM,
          b.frontPointM
        ) - a.radiusM - b.radiusM;
        if (clearanceM + validation.positionToleranceM <
            validation.minimumDriverClearanceM) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.DRIVER_COLLISION,
            [
              `instances[${a.instanceId}]`,
              `instances[${b.instanceId}]`
            ],
            "Complete documented driver body envelopes violate the explicit " +
              "minimum inter-driver clearance.",
            {
              leftInstanceId: a.instanceId,
              rightInstanceId: b.instanceId,
              clearanceM,
              minimumDriverClearanceM:
                validation.minimumDriverClearanceM
            }
          ));
        }
      }
    }
  }

  function hostFailureDiagnostic(prepared, hostResult) {
    const causes = Array.isArray(hostResult && hostResult.diagnostics)
      ? hostResult.diagnostics.map(item => ({
        code: item.code,
        paths: item.paths,
        message: item.message
      }))
      : [];
    const activeCone = causes.some(item =>
      item.code === "THREEWAY_MOUNT_ACTIVE_CONE_INVALID" ||
      item.code === "THREEWAY_MOUNT_LUMEN_START_OUTSIDE_ACTIVE_CONE"
    );
    return diagnostic(
      activeCone
        ? FAILURE_CODES.ACTIVE_CONE_FAILED
        : FAILURE_CODES.HOST_UNSOLVABLE,
      [`instances[${prepared.instance.id}]`],
      activeCone
        ? "The delegated full-face host rejected active-cone coverage."
        : "The delegated full-face positive mount host was unsolvable.",
      {
        mountHostCode: hostResult && hostResult.code || null,
        causes
      }
    );
  }

  function makeSolver(mountHostApi) {
    function solveSourceMounts(input) {
      const diagnostics = [];
      if (!isRecord(mountHostApi) ||
          typeof mountHostApi.buildMountHost !== "function") {
        return failure([diagnostic(
          FAILURE_CODES.DEPENDENCY_INVALID,
          ["threeway-mount-host.js"],
          "A callable threeway-mount-host.js dependency is required."
        )]);
      }
      if (!isRecord(input) || input.schemaVersion !== SCHEMA_VERSION) {
        return failure([diagnostic(
          FAILURE_CODES.INPUT_INVALID,
          ["schemaVersion"],
          "solveSourceMounts requires an explicit schema-2 input object."
        )]);
      }
      const validation = normalizeValidation(input.validation, diagnostics);
      const stationMap = unwrapStationResult(
        input.stationResult,
        diagnostics
      );
      const apertureMap = unwrapApertureResult(
        input.apertureResult,
        diagnostics
      );
      const passageMap = unwrapPassageResults(
        input.passageResult,
        diagnostics
      );
      const driverMap = unwrapResolvedDrivers(
        input.resolvedDrivers,
        diagnostics
      );
      if (diagnostics.length) return failure(diagnostics);
      const plans = normalizePlans(
        input.mountPlans,
        stationMap,
        apertureMap,
        passageMap,
        driverMap,
        validation,
        diagnostics
      );
      validateStationCounts(plans, stationMap, diagnostics);
      validateSymmetry(plans, validation, diagnostics);
      const preparedInstances = [];
      for (const plan of plans) {
        for (const instance of plan.instances) {
          const envelope = driverEnvelope(
            instance,
            plan.driverSource.driver
          );
          if (!envelope) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.HOST_UNSOLVABLE,
              [`instances[${instance.id}]`, "resolvedDrivers"],
              "Full documented driver face, body depth, and front projection " +
                "are required; no envelope dimension is inferred."
            ));
          }
          preparedInstances.push({
            plan,
            instance,
            driverEnvelope: envelope
          });
        }
      }
      validateDriverCollisions(
        preparedInstances,
        validation,
        diagnostics
      );
      if (diagnostics.length) return failure(diagnostics);

      const solvedMounts = [];
      const hostDiagnostics = [];
      for (const prepared of preparedInstances.sort((left, right) =>
        left.instance.id.localeCompare(right.instance.id)
      )) {
        const { plan, instance } = prepared;
        const construction = plan.construction;
        const hostInput = {
          id: `mount-host:${instance.id}`,
          mode: cleanString(construction.mode),
          ownerSourceId: plan.sourceId,
          ownerStationId: plan.stationId,
          driverRecord: plan.driverSource.driver,
          mountDatum: instance.mountDatum,
          driverAxis: instance.driverAxis,
          host: cloneValue(construction.host),
          activeConeEnvelope: cloneValue(
            construction.activeConeEnvelope
          ),
          ...(isRecord(construction.gasketEnvelope)
            ? { gasketEnvelope: cloneValue(construction.gasketEnvelope) }
            : {}),
          lumenNegatives: instance.apertureBindings.map(
            binding => binding.result
          ),
          auxiliaryNegatives: instance.auxiliaryNegatives,
          constraints: cloneValue(construction.constraints),
          inspection: cloneValue(construction.inspection)
        };
        const hostResult = mountHostApi.buildMountHost(hostInput);
        if (!hostResult ||
            hostResult.ok !== true ||
            !hostResult.record ||
            !hostResult.record.positiveHost ||
            hostResult.record.positiveHost.fullFace !== true ||
            hostResult.record.positiveHost.centerOpen !== false ||
            hostResult.record.positiveHost.booleanUnionPerformed !== false ||
            hostResult.record.negativeIntents
              .booleanSubtractionPerformed !== false ||
            hostResult.record.negativeIntents.acousticLumens.length !==
              instance.candidate.apertures.length) {
          hostDiagnostics.push(hostFailureDiagnostic(prepared, hostResult));
          continue;
        }
        const apertureBindings = instance.apertureBindings.map(binding => ({
          apertureId: binding.apertureId,
          templateApertureId: binding.templateApertureId,
          physicalCandidateId: binding.physicalCandidateId,
          templateCandidateId: binding.templateCandidateId,
          passageId: binding.passageId,
          passageHashInput: binding.passageRecord.hashInput,
          canonicalLumenHashInput: binding.result.hashInput,
          negativeInspectionMesh: binding.negativeInspectionMesh,
          canonicalLumenThroughHostIntent: true,
          booleanSubtractionPerformed: false
        }));
        solvedMounts.push({
          id: hostResult.record.id,
          instanceId: instance.id,
          sourceId: plan.sourceId,
          stationId: plan.stationId,
          driverRecordId: plan.driverSource.driver.id,
          distributionFamily: plan.distribution,
          azimuthRad: instance.azimuthRad,
          panelId: instance.panelId,
          wallFrame: instance.wallFrame,
          driverFaceAxisPolicy: plan.axisPolicy,
          mountDatum: instance.mountDatum,
          driverAxis: instance.driverAxis,
          apertureCandidateId: instance.candidate.id,
          physicalApertureCandidateId: instance.candidate.id,
          templateApertureCandidateId:
            cleanString(instance.candidate.templateCandidateId) ||
            instance.candidate.id,
          apertureBindings,
          driverEnvelope: prepared.driverEnvelope,
          mountHost: hostResult.record,
          mountHostHashInput: hostResult.hashInput,
          inspectionMesh: hostResult.inspectionMesh,
          provenanceRefs: uniqueStrings([
            ...plan.provenanceRefs,
            ...instance.provenanceRefs,
            ...(plan.driverSource.driver.provenanceRefs || [])
          ]),
          hardwareValidated: false,
          manufacturing: false
        });
      }
      if (hostDiagnostics.length) return failure(hostDiagnostics);
      solvedMounts.sort((left, right) => left.id.localeCompare(right.id));
      const byInstanceId = {};
      const bySourceId = {};
      for (const mount of solvedMounts) {
        byInstanceId[mount.instanceId] = mount;
        if (!bySourceId[mount.sourceId]) bySourceId[mount.sourceId] = [];
        bySourceId[mount.sourceId].push(mount);
      }
      const resultRecord = {
        schemaVersion: SCHEMA_VERSION,
        kind: "threeway-source-instance-mount-solution",
        stationResultHashInput:
          cleanString(input.stationResult.hashInput) || null,
        mountHostProvider: {
          module: "threeway-mount-host.js",
          version: finite(mountHostApi.version)
            ? mountHostApi.version
            : null,
          meshMathDelegated: true
        },
        mounts: solvedMounts,
        byInstanceId,
        bySourceId,
        validation: cloneValue(validation),
        invariants: {
          sourceStationOwnership: true,
          physicalDriverCountPreserved: true,
          oneFullFaceHostPerPhysicalDriver: true,
          oneCanonicalLumenPerAperture: true,
          panelTapAxesParallel: true,
          symmetryValidated: true,
          driverMoved: false,
          driverCountInferred: false,
          coneDimensionsInferred: false,
          lumenPathMutated: false,
          lumenBent: false,
          booleanUnionPerformed: false,
          booleanSubtractionPerformed: false
        },
        provenance: {
          stationResult: "threeway-station-solver",
          apertureResult: "threeway-aperture-solver",
          passageResults: "threeway-passage-solver",
          driverRecords: "threeway-driver-db",
          positiveHosts: "threeway-mount-host.js",
          hardwareValidated: false,
          manufacturing: false
        },
        hardwareValidated: false,
        manufacturing: false
      };
      const frozenRecord = deepFreeze(resultRecord);
      return deepFreeze({
        ok: true,
        code: null,
        result: frozenRecord,
        diagnostics: [],
        hashInput:
          "meh3-mount-solve-v1\n" + stableStringify(frozenRecord),
        hardwareValidated: false,
        manufacturing: false,
        stl: false,
        capabilities: CAPABILITIES
      });
    }

    function manufacturingPreflight(operation) {
      return deepFreeze({
        ok: false,
        available: false,
        operation: cleanString(operation) || "mount-boolean-or-export",
        code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
        reason: CAPABILITIES.reason,
        booleanUnion: false,
        booleanSubtraction: false,
        exactSolid: false,
        hardwareValidated: false,
        manufacturing: false,
        stl: false,
        capabilities: CAPABILITIES
      });
    }

    return deepFreeze({
      version: VERSION,
      schemaVersion: SCHEMA_VERSION,
      failureCodes: FAILURE_CODES,
      distributions: DISTRIBUTIONS,
      axisPolicies: AXIS_POLICIES,
      capabilities: CAPABILITIES,
      stableStringify,
      solveSourceMounts,
      manufacturingPreflight,
      createMountSolver: makeSolver
    });
  }

  return makeSolver(defaultMountHost);
}));
