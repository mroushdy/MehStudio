/*
 * MEH Studio v5 — provider-neutral three-way solid operand plan.
 *
 * This module validates and orders caller-owned positive and negative mesh
 * intents from one successful schema-2 physics solution. It does not create
 * geometry, run Boolean operations, choose tolerances or providers, inspect
 * render data, authorize manufacturing, or export artifacts.
 */
(function attachThreeWaySolidPlan(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEH3SolidPlan = api;
}(typeof globalThis !== "undefined" ? globalThis : this,
function createThreeWaySolidPlan() {
  "use strict";

  const VERSION = 1;
  const INPUT_SCHEMA_VERSION = 2;
  const PLAN_SCHEMA_VERSION = 1;
  const HASH_VERSION = "meh3-solid-plan-v1";
  const SUPPORTED_TOPOLOGIES = Object.freeze(["T3", "CX3", "H3"]);
  const POSITIVE_ROLES = Object.freeze([
    "horn-shell",
    "throat-interface",
    "mount-host",
    "mount-adapter",
    "rear-system",
    "enclosure"
  ]);
  const AUXILIARY_NEGATIVE_ROLES = Object.freeze([
    "fastener-negative",
    "gasket-negative",
    "clearance-negative"
  ]);
  const CONTACT_KINDS = Object.freeze([
    "positive-union",
    "acoustic-through",
    "auxiliary-through"
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const FAILURE_CODES = deepFreeze({
    INPUT_INVALID: "THREEWAY_SOLID_PLAN_INPUT_INVALID",
    SCHEMA_UNSUPPORTED: "THREEWAY_SOLID_PLAN_SCHEMA_UNSUPPORTED",
    PHYSICS_INVALID: "THREEWAY_SOLID_PLAN_PHYSICS_INVALID",
    UNAVAILABLE: "THREEWAY_SOLID_PLAN_UNAVAILABLE",
    HASH_MISMATCH: "THREEWAY_SOLID_PLAN_HASH_MISMATCH",
    INTENT_INVALID: "THREEWAY_SOLID_PLAN_INTENT_INVALID",
    DUPLICATE_ID: "THREEWAY_SOLID_PLAN_DUPLICATE_ID",
    OWNERSHIP_INVALID: "THREEWAY_SOLID_PLAN_OWNERSHIP_INVALID",
    DANGLING_OWNER: "THREEWAY_SOLID_PLAN_DANGLING_OWNER",
    MESH_INVALID: "THREEWAY_SOLID_PLAN_MESH_INVALID",
    MESH_NOT_CLOSED:
      "THREEWAY_SOLID_PLAN_MESH_NOT_CLOSED",
    PASSAGE_MESH_MISSING:
      "THREEWAY_SOLID_PLAN_PASSAGE_MESH_MISSING",
    APERTURE_COVERAGE_INVALID:
      "THREEWAY_SOLID_PLAN_APERTURE_COVERAGE_INVALID",
    MOUNT_HOST_INVALID: "THREEWAY_SOLID_PLAN_MOUNT_HOST_INVALID",
    POLARITY_AMBIGUOUS: "THREEWAY_SOLID_PLAN_POLARITY_AMBIGUOUS",
    CENTRAL_HOLE_REFUSED:
      "THREEWAY_SOLID_PLAN_CENTRAL_HOLE_REFUSED",
    CONTACT_INVALID: "THREEWAY_SOLID_PLAN_CONTACT_INVALID",
    INFERENCE_REFUSED:
      "THREEWAY_SOLID_PLAN_INFERENCE_REFUSED"
  });

  const CAPABILITIES = deepFreeze({
    status: "provider-neutral-boolean-operand-plan-only",
    solidPlan: true,
    deterministicOperandDag: true,
    positiveUnionOrdering: true,
    canonicalAcousticSubtractionOrdering: true,
    auxiliaryNegativeSeparation: true,
    continuityContactValidation: true,
    meshValidation: true,
    meshGeneration: false,
    toleranceInference: false,
    geometryInference: false,
    booleanExecution: false,
    booleanUnion: false,
    booleanSubtraction: false,
    providerSelected: false,
    kernelSelected: false,
    exactSolid: false,
    fabricationAudit: false,
    manufacturingPlan: false,
    manufacturing: false,
    export: false,
    stl: false,
    reason:
      "A deterministic operand DAG is not an executed, audited, or manufacturing-authorized solid."
  });

  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cleanString(value) {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isRecord(value)) {
      const copy = {};
      for (const key of Object.keys(value).sort()) {
        if (value[key] !== undefined) copy[key] = cloneValue(value[key]);
      }
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
      return Number.isFinite(value)
        ? (Object.is(value, -0) ? 0 : value)
        : null;
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

  function collectDataIssues(value, path, issues, ancestors) {
    if (value === null ||
        typeof value === "string" ||
        typeof value === "boolean") {
      return;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) issues.push(path);
      return;
    }
    if (typeof value !== "object") {
      issues.push(path);
      return;
    }
    if (ancestors.has(value)) {
      issues.push(path);
      return;
    }
    ancestors.add(value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          issues.push(`${path}[${index}]`);
        } else {
          collectDataIssues(
            value[index],
            `${path}[${index}]`,
            issues,
            ancestors
          );
        }
      }
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        issues.push(path);
      } else {
        for (const key of Reflect.ownKeys(value)) {
          if (typeof key !== "string") {
            issues.push(path);
          } else {
            collectDataIssues(
              value[key],
              `${path}.${key}`,
              issues,
              ancestors
            );
          }
        }
      }
    }
    ancestors.delete(value);
  }

  function uniqueStrings(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(cleanString).filter(Boolean))].sort();
  }

  function diagnostic(code, paths, message, details) {
    return {
      code,
      severity: "error",
      phase: "solid-plan",
      paths: uniqueStrings(paths),
      message,
      details: isRecord(details) ? cloneValue(details) : {},
      evidenceRefs: [],
      blocksCapabilities: [
        "solidPlan",
        "booleanExecution",
        "exactSolid",
        "manufacturing",
        "export",
        "stl"
      ]
    };
  }

  function sortDiagnostics(diagnostics) {
    return diagnostics.slice().sort((left, right) => [
      left.code,
      left.paths.join("\u0000"),
      left.message
    ].join("\u0001").localeCompare([
      right.code,
      right.paths.join("\u0000"),
      right.message
    ].join("\u0001")));
  }

  function failure(diagnostics) {
    const ordered = sortDiagnostics(diagnostics);
    return deepFreeze({
      ok: false,
      code: ordered.length
        ? ordered[0].code
        : FAILURE_CODES.INPUT_INVALID,
      result: null,
      diagnostics: ordered,
      inputHash: null,
      solutionHash: null,
      planHash: null,
      hashInput: null,
      booleanExecuted: false,
      exactSolid: false,
      manufacturing: false,
      export: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function parity(
    record,
    path,
    inputHash,
    solutionHash,
    diagnostics
  ) {
    const recordInputHash = cleanString(record && record.inputHash);
    const recordSolutionHash = cleanString(record && record.solutionHash);
    if (recordInputHash !== inputHash ||
        recordSolutionHash !== solutionHash) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.HASH_MISMATCH,
        [`${path}.inputHash`, `${path}.solutionHash`],
        "Every canonical solid-plan source record must retain exact physics-solution hash parity.",
        {
          expectedInputHash: inputHash,
          actualInputHash: recordInputHash,
          expectedSolutionHash: solutionHash,
          actualSolutionHash: recordSolutionHash
        }
      ));
      return false;
    }
    return true;
  }

  function validateMesh(raw, path, diagnostics, missingCode) {
    if (!isRecord(raw)) {
      diagnostics.push(diagnostic(
        missingCode || FAILURE_CODES.MESH_INVALID,
        [path],
        "A caller-owned indexed triangle mesh record is required."
      ));
      return null;
    }
    const vertices = raw.verticesM;
    const triangles = raw.triangles;
    let valid = Array.isArray(vertices) &&
      vertices.length >= 3 &&
      Array.isArray(triangles) &&
      triangles.length >= 1;
    if (valid) {
      valid = vertices.every(vertex =>
        Array.isArray(vertex) &&
        vertex.length === 3 &&
        vertex.every(finite)
      );
    }
    if (valid) {
      valid = triangles.every(triangle =>
        Array.isArray(triangle) &&
        triangle.length === 3 &&
        triangle.every(index =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < vertices.length
        ) &&
        new Set(triangle).size === 3
      );
    }
    if (!valid) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_INVALID,
        [`${path}.verticesM`, `${path}.triangles`],
        "Mesh records must contain finite three-coordinate vertices and in-range nondegenerate indexed triangles."
      ));
      return null;
    }
    if (raw.manufacturingAuthority === true ||
        raw.exactSolid === true ||
        raw.manufacturing === true) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.POLARITY_AMBIGUOUS,
        [path],
        "An inspection operand mesh cannot claim exact-solid or manufacturing authority."
      ));
    }
    return cloneValue(raw);
  }

  function closedMeshAudit(mesh) {
    if (!mesh) return null;
    const edges = new Map();
    const faceKeys = new Set();
    let degenerateTriangles = 0;
    let duplicateTriangles = 0;
    let signedVolumeM3 = 0;
    for (const triangle of mesh.triangles) {
      const key = triangle.slice().sort((a, b) => a - b).join(":");
      if (faceKeys.has(key)) duplicateTriangles++;
      else faceKeys.add(key);
      for (let index = 0; index < 3; index++) {
        const left = triangle[index];
        const right = triangle[(index + 1) % 3];
        const edgeKey = left < right
          ? `${left}:${right}` : `${right}:${left}`;
        const direction = left < right ? 1 : -1;
        if (!edges.has(edgeKey)) edges.set(edgeKey, []);
        edges.get(edgeKey).push(direction);
      }
      const a = mesh.verticesM[triangle[0]];
      const b = mesh.verticesM[triangle[1]];
      const c = mesh.verticesM[triangle[2]];
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const normal = [
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0]
      ];
      if (Math.hypot(...normal) <= 1e-12) degenerateTriangles++;
      signedVolumeM3 += (
        a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])
      ) / 6;
    }
    const entries = [...edges.values()];
    const openEdges = entries.filter(value => value.length === 1).length;
    const nonManifoldEdges = entries.filter(value =>
      value.length !== 2
    ).length;
    const sameDirectionEdges = entries.filter(value =>
      value.length === 2 && value[0] === value[1]
    ).length;
    return {
      openEdges,
      nonManifoldEdges,
      sameDirectionEdges,
      degenerateTriangles,
      duplicateTriangles,
      signedVolumeM3,
      pass: openEdges === 0 &&
        nonManifoldEdges === 0 &&
        sameDirectionEdges === 0 &&
        degenerateTriangles === 0 &&
        duplicateTriangles === 0 &&
        signedVolumeM3 > 1e-12
    };
  }

  function requireClosedMesh(mesh, path, diagnostics) {
    const audit = closedMeshAudit(mesh);
    if (!audit || audit.pass !== true) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.MESH_NOT_CLOSED,
        [path],
        "Closed calculated construction operands must be finite, consistently oriented, positive-volume two-manifold meshes.",
        { audit }
      ));
    }
    return audit;
  }

  function meshesEqual(left, right) {
    return !!left && !!right &&
      stableStringify(left) === stableStringify(right);
  }

  function ambiguousPolarity(record, expected) {
    const polarity = cleanString(record && record.polarity);
    const operation = cleanString(record && record.operation);
    if (polarity && polarity !== expected) return true;
    if (expected === "positive") {
      return record.negative === true ||
        record.subtract === true ||
        operation === "subtract";
    }
    return record.positive === true ||
      record.union === true ||
      operation === "union";
  }

  const INFERENCE_KEYS = new Set([
    "autogeometry",
    "autotolerance",
    "geometryinferred",
    "infergeometry",
    "inferred",
    "inferredgeometry",
    "inferredtolerance",
    "toleranceinferred",
    "usetolerancedefault",
    "usedefaulttolerance"
  ]);

  function findInference(value, path, found, seen) {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        findInference(value[index], `${path}[${index}]`, found, seen);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
      if (INFERENCE_KEYS.has(normalized) &&
          child !== false &&
          child !== null &&
          child !== undefined) {
        found.push(`${path}.${key}`);
      }
      if ((normalized.includes("geometry") ||
          normalized.includes("tolerance")) &&
          typeof child === "string" &&
          /^(auto|default|infer|inferred)$/i.test(child.trim())) {
        found.push(`${path}.${key}`);
      }
      findInference(child, `${path}.${key}`, found, seen);
    }
  }

  function validateNoInference(intent, diagnostics) {
    const paths = [];
    findInference(intent, "physicsSolution.solidIntent", paths, new Set());
    if (paths.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INFERENCE_REFUSED,
        paths,
        "The solid plan refuses inferred geometry or tolerance defaults; every operand mesh must already be solution-owned."
      ));
    }
  }

  function canonicalId(value) {
    return encodeURIComponent(String(value));
  }

  function pairKey(left, right) {
    return [left, right].sort().join("\u0000");
  }

  function canonicalPair(left, right) {
    return left.localeCompare(right) <= 0
      ? { a: left, b: right }
      : { a: right, b: left };
  }

  function addUnique(
    map,
    id,
    value,
    path,
    diagnostics,
    namespace
  ) {
    if (!id) return false;
    if (map.has(id)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.DUPLICATE_ID,
        [path, map.get(id).path],
        `${namespace} IDs must be unique: ${id}.`,
        { id, namespace }
      ));
      return false;
    }
    map.set(id, { value, path });
    return true;
  }

  function normalizeCanonicalSolution(solution, identity, diagnostics) {
    const stationMap = new Map();
    const stations = Array.isArray(solution.entryStations)
      ? solution.entryStations
      : [];
    if (!stations.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PHYSICS_INVALID,
        ["physicsSolution.entryStations"],
        "Direct canonical entryStations are required; nested phase outputs are not consumed."
      ));
    }
    for (let index = 0; index < stations.length; index++) {
      const station = isRecord(stations[index]) ? stations[index] : {};
      const path = `physicsSolution.entryStations[${index}]`;
      const id = cleanString(station.stationId);
      const sourceIds = uniqueStrings(station.sourceIds);
      parity(
        station,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      if (!id || !cleanString(station.role) || !sourceIds.length) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PHYSICS_INVALID,
          [`${path}.stationId`, `${path}.role`, `${path}.sourceIds`],
          "Each direct entry station requires a stationId, explicit role, and explicit source ownership."
        ));
      }
      addUnique(
        stationMap,
        id,
        station,
        `${path}.stationId`,
        diagnostics,
        "entry-station"
      );
    }

    const chamberMap = new Map();
    const chambers = Array.isArray(solution.chambers)
      ? solution.chambers
      : [];
    if (!Array.isArray(solution.chambers)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PHYSICS_INVALID,
        ["physicsSolution.chambers"],
        "Direct canonical chambers must be supplied as an array."
      ));
    }
    for (let index = 0; index < chambers.length; index++) {
      const chamber = isRecord(chambers[index]) ? chambers[index] : {};
      const path = `physicsSolution.chambers[${index}]`;
      const id = cleanString(chamber.id);
      const sourceId = cleanString(chamber.sourceId);
      const stationId = cleanString(chamber.stationId);
      parity(
        chamber,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const stationEnvelope = stationMap.get(stationId);
      if (!id ||
          !sourceId ||
          !stationEnvelope ||
          !uniqueStrings(stationEnvelope.value.sourceIds)
            .includes(sourceId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [`${path}.id`, `${path}.sourceId`, `${path}.stationId`],
          "Every canonical chamber requires a stable ID and a direct station-owned source."
        ));
      }
      addUnique(
        chamberMap,
        id,
        chamber,
        `${path}.id`,
        diagnostics,
        "chamber"
      );
    }

    const apertureMap = new Map();
    const layoutMap = new Map();
    const layouts = Array.isArray(solution.apertureLayouts)
      ? solution.apertureLayouts
      : [];
    if (!layouts.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PHYSICS_INVALID,
        ["physicsSolution.apertureLayouts"],
        "Direct canonical aperture layouts are required."
      ));
    }
    for (let index = 0; index < layouts.length; index++) {
      const layout = isRecord(layouts[index]) ? layouts[index] : {};
      const path = `physicsSolution.apertureLayouts[${index}]`;
      const id = cleanString(layout.id);
      const sourceId = cleanString(layout.sourceId);
      const stationId = cleanString(layout.stationId);
      parity(
        layout,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const stationEnvelope = stationMap.get(stationId);
      if (!id ||
          !sourceId ||
          !stationId ||
          !stationEnvelope ||
          !uniqueStrings(stationEnvelope.value.sourceIds)
            .includes(sourceId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [`${path}.id`, `${path}.sourceId`, `${path}.stationId`],
          "Every aperture layout must own a stable source/station pair from the direct solution."
        ));
      }
      addUnique(
        layoutMap,
        id,
        layout,
        `${path}.id`,
        diagnostics,
        "aperture-layout"
      );
      const apertures = Array.isArray(layout.apertures)
        ? layout.apertures
        : [];
      if (!apertures.length) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PHYSICS_INVALID,
          [`${path}.apertures`],
          "Each canonical aperture layout must contain explicit selected apertures."
        ));
      }
      for (let apertureIndex = 0;
        apertureIndex < apertures.length;
        apertureIndex++) {
        const aperture = isRecord(apertures[apertureIndex])
          ? apertures[apertureIndex]
          : {};
        const aperturePath =
          `${path}.apertures[${apertureIndex}]`;
        const apertureId = cleanString(aperture.id);
        parity(
          aperture,
          aperturePath,
          identity.inputHash,
          identity.solutionHash,
          diagnostics
        );
        if (!apertureId ||
            cleanString(aperture.sourceId) !== sourceId ||
            cleanString(aperture.stationId) !== stationId) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [
              `${aperturePath}.id`,
              `${aperturePath}.sourceId`,
              `${aperturePath}.stationId`
            ],
            "Selected apertures must retain their layout source/station ownership."
          ));
        }
        addUnique(
          apertureMap,
          apertureId,
          {
            aperture,
            layoutId: id,
            sourceId,
            stationId
          },
          `${aperturePath}.id`,
          diagnostics,
          "aperture"
        );
      }
    }

    const passageMap = new Map();
    const passageByAperture = new Map();
    const passages = Array.isArray(solution.passages)
      ? solution.passages
      : [];
    if (!passages.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PHYSICS_INVALID,
        ["physicsSolution.passages"],
        "Direct canonical passages with negativeInspectionMesh records are required."
      ));
    }
    for (let index = 0; index < passages.length; index++) {
      const passage = isRecord(passages[index]) ? passages[index] : {};
      const path = `physicsSolution.passages[${index}]`;
      const id = cleanString(passage.id);
      const apertureId = cleanString(passage.apertureId);
      const sourceId = cleanString(passage.sourceId);
      const stationId = cleanString(passage.stationId);
      const chamberId = cleanString(passage.chamberId);
      parity(
        passage,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const solidMesh = passage.solidNegativeInspectionMesh;
      const mesh = validateMesh(
        solidMesh || passage.negativeInspectionMesh,
        solidMesh
          ? `${path}.solidNegativeInspectionMesh`
          : `${path}.negativeInspectionMesh`,
        diagnostics,
        FAILURE_CODES.PASSAGE_MESH_MISSING
      );
      if (passage.canonicalNegative !== true) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PHYSICS_INVALID,
          [`${path}.canonicalNegative`],
          "Every direct passage must remain the canonical acoustic negative."
        ));
      }
      const apertureEnvelope = apertureMap.get(apertureId);
      if (!id ||
          !apertureEnvelope ||
          apertureEnvelope.value.sourceId !== sourceId ||
          apertureEnvelope.value.stationId !== stationId ||
          !stationMap.has(stationId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [
            `${path}.id`,
            `${path}.apertureId`,
            `${path}.sourceId`,
            `${path}.stationId`
          ],
          "Each passage must own exactly one direct aperture with matching source/station identity."
        ));
      }
      const chamberEnvelope = chamberMap.get(chamberId);
      if (!chamberId ||
          !chamberEnvelope ||
          cleanString(chamberEnvelope.value.sourceId) !== sourceId ||
          cleanString(chamberEnvelope.value.stationId) !== stationId) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.DANGLING_OWNER,
          [`${path}.chamberId`],
          "A passage chamberId must resolve to one direct canonical chamber with matching source/station ownership.",
          { chamberId }
        ));
      }
      addUnique(
        passageMap,
        id,
        { passage, mesh },
        `${path}.id`,
        diagnostics,
        "passage"
      );
      if (apertureId) {
        if (passageByAperture.has(apertureId)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_COVERAGE_INVALID,
            [
              `${path}.apertureId`,
              passageByAperture.get(apertureId).path
            ],
            "An aperture may own exactly one canonical passage.",
            { apertureId }
          ));
        } else {
          passageByAperture.set(apertureId, {
            passageId: id,
            path: `${path}.apertureId`
          });
        }
      }
    }
    for (const [apertureId, envelope] of apertureMap.entries()) {
      if (!passageByAperture.has(apertureId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_COVERAGE_INVALID,
          [envelope.path, "physicsSolution.passages"],
          "Every direct selected aperture requires one canonical passage.",
          { apertureId }
        ));
      }
    }

    const mountMap = new Map();
    const passageMountMap = new Map();
    const mounts = Array.isArray(solution.mounts)
      ? solution.mounts
      : [];
    if (!mounts.length) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PHYSICS_INVALID,
        ["physicsSolution.mounts"],
        "Direct canonical full-face source-instance mounts are required."
      ));
    }
    for (let index = 0; index < mounts.length; index++) {
      const mount = isRecord(mounts[index]) ? mounts[index] : {};
      const path = `physicsSolution.mounts[${index}]`;
      const id = cleanString(mount.id);
      const sourceId = cleanString(mount.sourceId);
      const stationId = cleanString(mount.stationId);
      parity(
        mount,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const positiveHost = isRecord(mount.mountHost) &&
          isRecord(mount.mountHost.positiveHost)
        ? mount.mountHost.positiveHost
        : null;
      const fullFace = positiveHost &&
        positiveHost.fullFace === true &&
        positiveHost.centerOpen === false;
      const solidMesh = mount.solidPositiveInspectionMesh;
      const mesh = validateMesh(
        solidMesh || mount.inspectionMesh,
        solidMesh
          ? `${path}.solidPositiveInspectionMesh`
          : `${path}.inspectionMesh`,
        diagnostics
      );
      const stationEnvelope = stationMap.get(stationId);
      if (!id ||
          !sourceId ||
          !stationId ||
          !stationEnvelope ||
          !uniqueStrings(stationEnvelope.value.sourceIds)
            .includes(sourceId) ||
          !fullFace) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_HOST_INVALID,
          [
            `${path}.id`,
            `${path}.sourceId`,
            `${path}.stationId`,
            `${path}.mountHost.positiveHost`
          ],
          "Every direct mount must be an explicit complete full-face positive host; rings and skins are refused."
        ));
      }
      addUnique(
        mountMap,
        id,
        { mount, mesh },
        `${path}.id`,
        diagnostics,
        "mount"
      );
      const bindings = Array.isArray(mount.apertureBindings)
        ? mount.apertureBindings
        : [];
      if (!bindings.length) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [`${path}.apertureBindings`],
          "Every source-instance mount must explicitly bind its canonical passages."
        ));
      }
      for (let bindingIndex = 0;
        bindingIndex < bindings.length;
        bindingIndex++) {
        const binding = isRecord(bindings[bindingIndex])
          ? bindings[bindingIndex]
          : {};
        const bindingPath =
          `${path}.apertureBindings[${bindingIndex}]`;
        const passageId = cleanString(binding.passageId);
        const apertureId = cleanString(binding.apertureId);
        const passageEnvelope = passageMap.get(passageId);
        if (!passageEnvelope ||
            cleanString(passageEnvelope.value.passage.apertureId) !==
              apertureId ||
            cleanString(passageEnvelope.value.passage.sourceId) !==
              sourceId ||
            cleanString(passageEnvelope.value.passage.stationId) !==
              stationId) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [
              `${bindingPath}.passageId`,
              `${bindingPath}.apertureId`
            ],
            "Mount bindings must resolve one canonical passage/aperture owned by the same source and station."
          ));
        }
        if (passageId) {
          if (passageMountMap.has(passageId)) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.OWNERSHIP_INVALID,
              [
                `${bindingPath}.passageId`,
                passageMountMap.get(passageId).path
              ],
              "A canonical passage may traverse exactly one physical mount host.",
              { passageId }
            ));
          } else {
            passageMountMap.set(passageId, {
              mountId: id,
              path: `${bindingPath}.passageId`
            });
          }
        }
      }
    }
    for (const [passageId, envelope] of passageMap.entries()) {
      if (!passageMountMap.has(passageId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [envelope.path, "physicsSolution.mounts"],
          "Every canonical passage must be bound through exactly one direct mount host.",
          { passageId }
        ));
      }
    }

    return {
      stationMap,
      chamberMap,
      apertureMap,
      passageMap,
      passageByAperture,
      mountMap,
      passageMountMap
    };
  }

  function normalizePositiveBodies(
    rawBodies,
    canonical,
    identity,
    diagnostics
  ) {
    const supplied = Array.isArray(rawBodies) ? rawBodies : [];
    const byId = new Map();
    const bodies = [];
    let hornCount = 0;
    let throatCount = 0;
    const mountBodyByMount = new Map();
    const adapterBodyByMount = new Map();
    for (let index = 0; index < supplied.length; index++) {
      const record = isRecord(supplied[index]) ? supplied[index] : {};
      const path =
        `physicsSolution.solidIntent.positiveBodies[${index}]`;
      const id = cleanString(record.id);
      const role = cleanString(record.role);
      const ownerId = cleanString(record.ownerId);
      const sourceId = cleanString(record.sourceId);
      const stationId = cleanString(record.stationId);
      parity(
        record,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const mesh = validateMesh(record.mesh, `${path}.mesh`, diagnostics);
      if (!id || !POSITIVE_ROLES.includes(role) || !ownerId) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.INTENT_INVALID,
          [`${path}.id`, `${path}.role`, `${path}.ownerId`],
          "Every positive body requires a stable ID, supported positive role, and explicit canonical owner."
        ));
      }
      if (ambiguousPolarity(record, "positive")) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.POLARITY_AMBIGUOUS,
          [path],
          "A positive-body record contains negative/subtractive polarity."
        ));
      }
      if (role === "horn-shell") {
        hornCount++;
        if (ownerId !== identity.solutionHash) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [`${path}.ownerId`],
            "The one canonical horn shell must be owned by this physics solution.",
            { ownerId, expectedOwnerId: identity.solutionHash }
          ));
        }
      } else if (role === "throat-interface") {
        throatCount++;
        const stationEnvelope = canonical.stationMap.get(stationId);
        const stationRole = stationEnvelope &&
          cleanString(stationEnvelope.value.role);
        const directStationOwned = !!stationEnvelope &&
          ownerId === stationId &&
          ["throat", "throat-interface"].includes(stationRole);
        const solutionOwnedCanonical =
          ownerId === identity.solutionHash &&
          !stationId &&
          [
            "solution-owned-canonical-throat-inspection",
            "solution-owned-closed-throat-collar"
          ].includes(cleanString(record.bodyKind));
        if (!directStationOwned && !solutionOwnedCanonical) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.DANGLING_OWNER,
            [
              `${path}.ownerId`,
              `${path}.stationId`,
              `${path}.bodyKind`
            ],
            "A throat-interface positive must be owned by a direct throat station or be the explicitly typed solution-owned canonical throat inspection operand."
          ));
        }
      } else if (role === "mount-host") {
        const mountEnvelope = canonical.mountMap.get(ownerId);
        if (cleanString(record.bodyKind) !== "full-face-solid-host" ||
            !mountEnvelope ||
            cleanString(mountEnvelope.value.mount.sourceId) !== sourceId ||
            cleanString(mountEnvelope.value.mount.stationId) !== stationId ||
            !meshesEqual(mesh, mountEnvelope && mountEnvelope.value.mesh)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.MOUNT_HOST_INVALID,
            [
              `${path}.bodyKind`,
              `${path}.ownerId`,
              `${path}.sourceId`,
              `${path}.stationId`,
              `${path}.mesh`
            ],
            "A mount-host operand must map one-to-one to the direct mount, preserve its mesh, and explicitly declare full-face-solid-host."
          ));
        }
        if (ownerId) {
          if (mountBodyByMount.has(ownerId)) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.OWNERSHIP_INVALID,
              [
                `${path}.ownerId`,
                mountBodyByMount.get(ownerId).path
              ],
              "Each direct mount may own exactly one positive mount-host operand.",
              { ownerId }
            ));
          } else {
            mountBodyByMount.set(ownerId, {
              bodyId: id,
              path: `${path}.ownerId`
            });
          }
        }
      } else if (role === "mount-adapter") {
        const mountEnvelope = canonical.mountMap.get(ownerId);
        if (cleanString(record.bodyKind) !==
              "solid-driver-cell-adapter" ||
            !mountEnvelope ||
            cleanString(mountEnvelope.value.mount.sourceId) !== sourceId ||
            cleanString(mountEnvelope.value.mount.stationId) !== stationId) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.MOUNT_HOST_INVALID,
            [
              `${path}.bodyKind`,
              `${path}.ownerId`,
              `${path}.sourceId`,
              `${path}.stationId`
            ],
            "A mount-adapter must be the explicit solid bridge owned by one matching direct full-frame mount."
          ));
        }
        if (ownerId) {
          if (adapterBodyByMount.has(ownerId)) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.OWNERSHIP_INVALID,
              [
                `${path}.ownerId`,
                adapterBodyByMount.get(ownerId).path
              ],
              "Each direct mount may own exactly one solid driver-cell adapter.",
              { ownerId }
            ));
          } else {
            adapterBodyByMount.set(ownerId, {
              bodyId: id,
              path: `${path}.ownerId`
            });
          }
        }
      } else if (role === "rear-system" || role === "enclosure") {
        if (ownerId !== identity.solutionHash) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.DANGLING_OWNER,
            [`${path}.ownerId`],
            "Optional enclosure and rear-system bodies must be explicitly owned by this solution."
          ));
        }
      }
      const envelope = {
        id,
        role,
        ownerId,
        sourceId,
        stationId,
        bodyKind: cleanString(record.bodyKind),
        mesh,
        inputHash: identity.inputHash,
        solutionHash: identity.solutionHash
      };
      if (addUnique(
        byId,
        id,
        envelope,
        `${path}.id`,
        diagnostics,
        "positive operand"
      )) {
        bodies.push(envelope);
      }
    }
    if (hornCount !== 1) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INTENT_INVALID,
        ["physicsSolution.solidIntent.positiveBodies"],
        "Exactly one canonical solution-owned horn-shell positive is required.",
        { hornShellCount: hornCount }
      ));
    }
    if (throatCount < 1) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INTENT_INVALID,
        ["physicsSolution.solidIntent.positiveBodies"],
        "At least one canonical throat-interface positive is required."
      ));
    }
    const requiresAdapters = bodies.some(body =>
      body.role === "mount-adapter"
    ) || bodies.some(body =>
      body.role === "horn-shell" &&
      body.bodyKind === "closed-canonical-horn-material-shell"
    );
    for (const [mountId, envelope] of canonical.mountMap.entries()) {
      if (!mountBodyByMount.has(mountId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_HOST_INVALID,
          [envelope.path, "physicsSolution.solidIntent.positiveBodies"],
          "Every direct source-instance mount requires one full-face positive operand.",
          { mountId }
        ));
      }
      if (requiresAdapters && !adapterBodyByMount.has(mountId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.MOUNT_HOST_INVALID,
          [envelope.path, "physicsSolution.solidIntent.positiveBodies"],
          "Every direct source-instance mount requires one closed solid adapter connecting its full-frame plate to the horn.",
          { mountId }
        ));
      }
    }
    return {
      bodies,
      byId,
      mountBodyByMount,
      adapterBodyByMount
    };
  }

  function normalizeAcousticNegatives(
    rawNegatives,
    canonical,
    positive,
    identity,
    diagnostics,
    globalOperandIds
  ) {
    const supplied = Array.isArray(rawNegatives) ? rawNegatives : [];
    const byId = new Map();
    const negatives = [];
    const byAperture = new Map();
    const byPassage = new Map();
    for (let index = 0; index < supplied.length; index++) {
      const record = isRecord(supplied[index]) ? supplied[index] : {};
      const path =
        `physicsSolution.solidIntent.acousticLumenNegatives[${index}]`;
      const id = cleanString(record.id);
      const role = cleanString(record.role);
      const passageId = cleanString(record.passageId);
      const apertureId = cleanString(record.apertureId);
      const sourceId = cleanString(record.sourceId);
      const stationId = cleanString(record.stationId);
      const ownerId = cleanString(record.ownerId);
      parity(
        record,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const mesh = validateMesh(
        record.mesh,
        `${path}.mesh`,
        diagnostics,
        FAILURE_CODES.PASSAGE_MESH_MISSING
      );
      const passageEnvelope = canonical.passageMap.get(passageId);
      const passage = passageEnvelope && passageEnvelope.value.passage;
      if (!id ||
          role !== "acoustic-lumen" ||
          !passage ||
          ownerId !== passageId ||
          cleanString(passage.apertureId) !== apertureId ||
          cleanString(passage.sourceId) !== sourceId ||
          cleanString(passage.stationId) !== stationId) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [
            `${path}.id`,
            `${path}.role`,
            `${path}.ownerId`,
            `${path}.passageId`,
            `${path}.apertureId`,
            `${path}.sourceId`,
            `${path}.stationId`
          ],
          "Each acoustic operand must be owned by exactly one matching direct passage/aperture/source/station record."
        ));
      }
      if (!passageEnvelope ||
          !meshesEqual(mesh, passageEnvelope.value.mesh)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.PASSAGE_MESH_MISSING,
          [`${path}.mesh`, "physicsSolution.passages"],
          "The acoustic operand mesh must exactly preserve its canonical passage negativeInspectionMesh.",
          { passageId }
        ));
      }
      if (ambiguousPolarity(record, "negative") ||
          record.acoustic === false) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.POLARITY_AMBIGUOUS,
          [path],
          "An acoustic-lumen operand must be unambiguously acoustic and subtractive."
        ));
      }
      if (apertureId) {
        if (byAperture.has(apertureId)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.APERTURE_COVERAGE_INVALID,
            [
              `${path}.apertureId`,
              byAperture.get(apertureId).path
            ],
            "Each aperture may be subtracted by exactly one acoustic lumen.",
            { apertureId }
          ));
        } else {
          byAperture.set(apertureId, {
            negativeId: id,
            path: `${path}.apertureId`
          });
        }
      }
      if (passageId) {
        if (byPassage.has(passageId)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [
              `${path}.passageId`,
              byPassage.get(passageId).path
            ],
            "Each canonical passage may own exactly one acoustic negative."
          ));
        } else {
          byPassage.set(passageId, {
            negativeId: id,
            path: `${path}.passageId`
          });
        }
      }
      const envelope = {
        id,
        role,
        passageId,
        apertureId,
        sourceId,
        stationId,
        ownerId,
        mesh,
        acoustic: true,
        inputHash: identity.inputHash,
        solutionHash: identity.solutionHash
      };
      if (addUnique(
        byId,
        id,
        envelope,
        `${path}.id`,
        diagnostics,
        "acoustic-negative operand"
      )) {
        if (globalOperandIds.has(id)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.POLARITY_AMBIGUOUS,
            [`${path}.id`, globalOperandIds.get(id)],
            "An operand ID cannot be both positive and negative.",
            { id }
          ));
        } else if (id) {
          globalOperandIds.set(id, `${path}.id`);
        }
        negatives.push(envelope);
      }
    }
    for (const [apertureId, apertureEnvelope] of
      canonical.apertureMap.entries()) {
      if (!byAperture.has(apertureId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.APERTURE_COVERAGE_INVALID,
          [
            apertureEnvelope.path,
            "physicsSolution.solidIntent.acousticLumenNegatives"
          ],
          "Every canonical aperture must be represented by exactly one acoustic negative.",
          { apertureId }
        ));
      }
    }
    for (const [passageId, passageEnvelope] of
      canonical.passageMap.entries()) {
      if (!byPassage.has(passageId)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.OWNERSHIP_INVALID,
          [
            passageEnvelope.path,
            "physicsSolution.solidIntent.acousticLumenNegatives"
          ],
          "Every canonical passage must own exactly one acoustic negative.",
          { passageId }
        ));
      }
    }
    return { negatives, byId, byAperture, byPassage };
  }

  function normalizeAuxiliaryNegatives(
    rawNegatives,
    positive,
    identity,
    diagnostics,
    globalOperandIds
  ) {
    const supplied = Array.isArray(rawNegatives) ? rawNegatives : [];
    const byId = new Map();
    const negatives = [];
    for (let index = 0; index < supplied.length; index++) {
      const record = isRecord(supplied[index]) ? supplied[index] : {};
      const path =
        `physicsSolution.solidIntent.auxiliaryNegatives[${index}]`;
      const id = cleanString(record.id);
      const role = cleanString(record.role);
      const ownerId = cleanString(record.ownerId);
      parity(
        record,
        path,
        identity.inputHash,
        identity.solutionHash,
        diagnostics
      );
      const mesh = validateMesh(record.mesh, `${path}.mesh`, diagnostics);
      const central = record.central === true ||
        record.centerOpen === true ||
        record.throughCenter === true ||
        /central|center[-_ ]?hole|bore/.test(String(role || ""));
      if (central) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CENTRAL_HOLE_REFUSED,
          [path],
          "Central non-lumen holes are not admitted as auxiliary negatives."
        ));
      }
      if (!id ||
          !AUXILIARY_NEGATIVE_ROLES.includes(role) ||
          record.acoustic !== false) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.INTENT_INVALID,
          [`${path}.id`, `${path}.role`, `${path}.acoustic`],
          "Auxiliary negatives require an admitted explicit role and acoustic:false."
        ));
      }
      const ownerEnvelope = positive.byId.get(ownerId);
      if (!ownerEnvelope) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.DANGLING_OWNER,
          [`${path}.ownerId`],
          "Every auxiliary negative must name one existing positive-body ID.",
          { ownerId }
        ));
      } else {
        const owner = ownerEnvelope.value;
        const sourceId = cleanString(record.sourceId);
        const stationId = cleanString(record.stationId);
        if ((sourceId && sourceId !== owner.sourceId) ||
            (stationId && stationId !== owner.stationId)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [`${path}.sourceId`, `${path}.stationId`, `${path}.ownerId`],
            "Auxiliary source/station ownership must match its positive body."
          ));
        }
      }
      if (ambiguousPolarity(record, "negative")) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.POLARITY_AMBIGUOUS,
          [path],
          "An auxiliary negative contains positive/union polarity."
        ));
      }
      const envelope = {
        id,
        role,
        ownerId,
        sourceId: cleanString(record.sourceId),
        stationId: cleanString(record.stationId),
        mesh,
        acoustic: false,
        inputHash: identity.inputHash,
        solutionHash: identity.solutionHash
      };
      if (addUnique(
        byId,
        id,
        envelope,
        `${path}.id`,
        diagnostics,
        "auxiliary-negative operand"
      )) {
        if (globalOperandIds.has(id)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.POLARITY_AMBIGUOUS,
            [`${path}.id`, globalOperandIds.get(id)],
            "An operand ID cannot have positive, acoustic-negative, and auxiliary-negative meanings.",
            { id }
          ));
        } else if (id) {
          globalOperandIds.set(id, `${path}.id`);
        }
        negatives.push(envelope);
      }
    }
    return { negatives, byId };
  }

  function normalizeContacts(
    rawContacts,
    positive,
    acoustic,
    auxiliary,
    canonical,
    identity,
    diagnostics
  ) {
    const supplied = Array.isArray(rawContacts) ? rawContacts : [];
    const contacts = [];
    const ids = new Map();
    const signatures = new Map();
    const all = new Map();
    for (const [id, envelope] of positive.byId.entries()) {
      all.set(id, { kind: "positive", value: envelope.value });
    }
    for (const [id, envelope] of acoustic.byId.entries()) {
      all.set(id, { kind: "acoustic", value: envelope.value });
    }
    for (const [id, envelope] of auxiliary.byId.entries()) {
      all.set(id, { kind: "auxiliary", value: envelope.value });
    }
    for (let index = 0; index < supplied.length; index++) {
      const record = isRecord(supplied[index]) ? supplied[index] : {};
      const path =
        `physicsSolution.solidIntent.expectedContacts[${index}]`;
      const id = cleanString(record.id);
      const a = cleanString(record.a);
      const b = cleanString(record.b);
      const kind = cleanString(record.kind);
      if ((record.inputHash !== undefined ||
          record.solutionHash !== undefined) &&
          (cleanString(record.inputHash) !== identity.inputHash ||
          cleanString(record.solutionHash) !== identity.solutionHash)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HASH_MISMATCH,
          [`${path}.inputHash`, `${path}.solutionHash`],
          "Contact hash fields, when supplied, must match the solution."
        ));
      }
      const aEnvelope = all.get(a);
      const bEnvelope = all.get(b);
      if (!id ||
          !a ||
          !b ||
          a === b ||
          !CONTACT_KINDS.includes(kind) ||
          !aEnvelope ||
          !bEnvelope) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          [`${path}.id`, `${path}.a`, `${path}.b`, `${path}.kind`],
          "Expected contacts require a stable ID, distinct existing operand endpoints, and a supported explicit kind."
        ));
      }
      const endpointKinds = [aEnvelope && aEnvelope.kind,
        bEnvelope && bEnvelope.kind].sort().join("+");
      if ((kind === "positive-union" &&
            endpointKinds !== "positive+positive") ||
          (kind === "acoustic-through" &&
            endpointKinds !== "acoustic+positive") ||
          (kind === "auxiliary-through" &&
            endpointKinds !== "auxiliary+positive")) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          [`${path}.a`, `${path}.b`, `${path}.kind`],
          "Contact kind must agree with the explicit polarity/class of both operands."
        ));
      }
      if (kind === "auxiliary-through" &&
          aEnvelope &&
          bEnvelope) {
        const auxiliaryValue = aEnvelope.kind === "auxiliary"
          ? aEnvelope.value
          : bEnvelope.value;
        const positiveId = aEnvelope.kind === "positive" ? a : b;
        if (auxiliaryValue.ownerId !== positiveId) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.OWNERSHIP_INVALID,
            [`${path}.a`, `${path}.b`],
            "An auxiliary-through contact must terminate on its declared positive owner."
          ));
        }
      }
      addUnique(
        ids,
        id,
        record,
        `${path}.id`,
        diagnostics,
        "contact"
      );
      if (a && b && kind) {
        const signature = `${kind}\u0000${pairKey(a, b)}`;
        if (signatures.has(signature)) {
          diagnostics.push(diagnostic(
            FAILURE_CODES.CONTACT_INVALID,
            [path, signatures.get(signature)],
            "Expected contact endpoint/kind pairs must be unique."
          ));
        } else {
          signatures.set(signature, path);
        }
      }
      if (id && a && b && kind) {
        const pair = canonicalPair(a, b);
        contacts.push({
          id,
          a: pair.a,
          b: pair.b,
          kind,
          inputHash: identity.inputHash,
          solutionHash: identity.solutionHash
        });
      }
    }

    const horn = positive.bodies.find(body => body.role === "horn-shell");
    if (horn) {
      for (const negative of acoustic.negatives) {
        const passageMount = canonical.passageMountMap.get(
          negative.passageId
        );
        const mountBody = passageMount &&
          positive.mountBodyByMount.get(passageMount.mountId);
        const adapterBody = passageMount &&
          positive.adapterBodyByMount.get(passageMount.mountId);
        const required = [
          pairKey(negative.id, horn.id),
          mountBody ? pairKey(negative.id, mountBody.bodyId) : null,
          adapterBody
            ? pairKey(negative.id, adapterBody.bodyId) : null
        ].filter(Boolean);
        for (const pair of required) {
          const signature = `acoustic-through\u0000${pair}`;
          if (!signatures.has(signature)) {
            diagnostics.push(diagnostic(
              FAILURE_CODES.CONTACT_INVALID,
              ["physicsSolution.solidIntent.expectedContacts"],
              "Every acoustic lumen requires explicit through-contacts with its full-frame plate, solid adapter, and canonical horn shell.",
              {
                passageId: negative.passageId,
                apertureId: negative.apertureId,
                missingPair: pair.split("\u0000")
              }
            ));
          }
        }
      }
    }
    for (const negative of auxiliary.negatives) {
      const signature =
        `auxiliary-through\u0000${pairKey(negative.id, negative.ownerId)}`;
      if (!signatures.has(signature)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          ["physicsSolution.solidIntent.expectedContacts"],
          "Every auxiliary negative requires one explicit contact to its positive owner.",
          { auxiliaryNegativeId: negative.id, ownerId: negative.ownerId }
        ));
      }
    }

    const positiveIds = positive.bodies.map(body => body.id);
    if (positiveIds.length) {
      const adjacency = new Map(
        positiveIds.map(id => [id, new Set()])
      );
      for (const contact of contacts.filter(item =>
        item.kind === "positive-union"
      )) {
        if (adjacency.has(contact.a) && adjacency.has(contact.b)) {
          adjacency.get(contact.a).add(contact.b);
          adjacency.get(contact.b).add(contact.a);
        }
      }
      const visited = new Set();
      const queue = [positiveIds[0]];
      while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        for (const next of adjacency.get(id) || []) queue.push(next);
      }
      if (visited.size !== positiveIds.length) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          ["physicsSolution.solidIntent.expectedContacts"],
          "Positive-union expected contacts must explicitly connect every positive body.",
          {
            disconnectedBodyIds: positiveIds
              .filter(id => !visited.has(id))
              .sort()
          }
        ));
      }
    }
    contacts.sort((left, right) => left.id.localeCompare(right.id));
    return { contacts, signatures };
  }

  function normalizeOverlapPairs(
    rawPairs,
    positive,
    contacts,
    identity,
    diagnostics
  ) {
    const supplied = Array.isArray(rawPairs) ? rawPairs : [];
    const pairs = [];
    const seen = new Map();
    for (let index = 0; index < supplied.length; index++) {
      const raw = supplied[index];
      const path =
        `physicsSolution.solidIntent.allowedOverlapPairs[${index}]`;
      const a = Array.isArray(raw)
        ? cleanString(raw[0])
        : cleanString(raw && raw.a);
      const b = Array.isArray(raw)
        ? cleanString(raw[1])
        : cleanString(raw && raw.b);
      if (isRecord(raw) &&
          (raw.inputHash !== undefined ||
          raw.solutionHash !== undefined) &&
          (cleanString(raw.inputHash) !== identity.inputHash ||
          cleanString(raw.solutionHash) !== identity.solutionHash)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.HASH_MISMATCH,
          [`${path}.inputHash`, `${path}.solutionHash`],
          "Overlap-pair hash fields, when supplied, must match the solution."
        ));
      }
      if (!a ||
          !b ||
          a === b ||
          !positive.byId.has(a) ||
          !positive.byId.has(b)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          [path],
          "Allowed overlap pairs must name two distinct existing positive bodies."
        ));
        continue;
      }
      const key = pairKey(a, b);
      if (seen.has(key)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          [path, seen.get(key)],
          "Allowed positive overlap pairs must be unique."
        ));
        continue;
      }
      seen.set(key, path);
      const pair = canonicalPair(a, b);
      pairs.push({
        a: pair.a,
        b: pair.b,
        inputHash: identity.inputHash,
        solutionHash: identity.solutionHash
      });
    }
    const positiveContactKeys = new Set(
      contacts.contacts
        .filter(contact => contact.kind === "positive-union")
        .map(contact => pairKey(contact.a, contact.b))
    );
    for (const key of positiveContactKeys) {
      if (!seen.has(key)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          [
            "physicsSolution.solidIntent.expectedContacts",
            "physicsSolution.solidIntent.allowedOverlapPairs"
          ],
          "Every positive-union contact requires a matching explicit allowed-overlap pair.",
          { pair: key.split("\u0000") }
        ));
      }
    }
    for (const [key, path] of seen.entries()) {
      if (!positiveContactKeys.has(key)) {
        diagnostics.push(diagnostic(
          FAILURE_CODES.CONTACT_INVALID,
          [
            path,
            "physicsSolution.solidIntent.expectedContacts"
          ],
          "Every allowed-overlap pair requires a matching positive-union expected contact.",
          { pair: key.split("\u0000") }
        ));
      }
    }
    pairs.sort((left, right) =>
      pairKey(left.a, left.b).localeCompare(pairKey(right.a, right.b))
    );
    return pairs;
  }

  function nodeOwnership(record, identity) {
    return {
      ownerId: record.ownerId,
      sourceId: record.sourceId || null,
      stationId: record.stationId || null,
      inputHash: identity.inputHash,
      solutionHash: identity.solutionHash
    };
  }

  function operandNode(record, classification, identity) {
    return {
      id: `operand:${classification}:${canonicalId(record.id)}`,
      kind: "operand",
      phase: classification === "positive"
        ? "positive-union"
        : classification === "acoustic-lumen"
          ? "acoustic-lumen-subtraction"
          : "auxiliary-negative-subtraction",
      classification,
      semanticRole: record.role,
      polarity: classification === "positive" ? "positive" : "negative",
      acoustic: classification === "acoustic-lumen",
      sourceRecordId: record.id,
      inputs: [],
      mesh: record.mesh,
      ownership: nodeOwnership(record, identity),
      inputHash: identity.inputHash,
      solutionHash: identity.solutionHash,
      booleanExecuted: false,
      exactSolid: false,
      manufacturing: false
    };
  }

  function operationNode(
    id,
    phase,
    operation,
    inputs,
    owner,
    identity
  ) {
    return {
      id,
      kind: "operation",
      phase,
      classification: "derived-plan-node",
      semanticRole: operation === "union"
        ? "positive-union-result"
        : "subtraction-result",
      polarity: "derived",
      acoustic: phase === "acoustic-lumen-subtraction",
      sourceRecordId: null,
      operation,
      inputs: inputs.slice(),
      ownership: {
        ownerId: owner.ownerId,
        sourceId: owner.sourceId || null,
        stationId: owner.stationId || null,
        inputHash: identity.inputHash,
        solutionHash: identity.solutionHash
      },
      inputHash: identity.inputHash,
      solutionHash: identity.solutionHash,
      booleanExecuted: false,
      exactSolid: false,
      manufacturing: false
    };
  }

  function buildDag(positive, acoustic, auxiliary, identity) {
    const nodes = [];
    const positiveNodes = positive.bodies
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(record => operandNode(record, "positive", identity));
    nodes.push(...positiveNodes);
    const unionId = "operation:union:all-positive-bodies";
    const unionNode = operationNode(
      unionId,
      "positive-union",
      "union",
      positiveNodes.map(node => node.id),
      {
        ownerId: identity.solutionHash,
        sourceId: null,
        stationId: null
      },
      identity
    );
    nodes.push(unionNode);
    let current = unionId;
    const acousticNodeIds = [];
    const acousticOperationIds = [];
    const orderedAcoustic = acoustic.negatives
      .slice()
      .sort((left, right) => [
        left.apertureId,
        left.passageId,
        left.id
      ].join("\u0000").localeCompare([
        right.apertureId,
        right.passageId,
        right.id
      ].join("\u0000")));
    for (const record of orderedAcoustic) {
      const negativeNode = operandNode(
        record,
        "acoustic-lumen",
        identity
      );
      nodes.push(negativeNode);
      acousticNodeIds.push(negativeNode.id);
      const operationId =
        `operation:subtract:acoustic:${canonicalId(record.apertureId)}`;
      nodes.push(operationNode(
        operationId,
        "acoustic-lumen-subtraction",
        "subtract",
        [current, negativeNode.id],
        record,
        identity
      ));
      acousticOperationIds.push(operationId);
      current = operationId;
    }
    const auxiliaryNodeIds = [];
    const auxiliaryOperationIds = [];
    const orderedAuxiliary = auxiliary.negatives
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id));
    for (const record of orderedAuxiliary) {
      const negativeNode = operandNode(
        record,
        "auxiliary-negative",
        identity
      );
      nodes.push(negativeNode);
      auxiliaryNodeIds.push(negativeNode.id);
      const operationId =
        `operation:subtract:auxiliary:${canonicalId(record.id)}`;
      nodes.push(operationNode(
        operationId,
        "auxiliary-negative-subtraction",
        "subtract",
        [current, negativeNode.id],
        record,
        identity
      ));
      auxiliaryOperationIds.push(operationId);
      current = operationId;
    }
    const edges = [];
    for (const node of nodes) {
      for (const inputId of node.inputs) {
        edges.push({
          id: `edge:${canonicalId(inputId)}:to:${canonicalId(node.id)}`,
          from: inputId,
          to: node.id,
          inputHash: identity.inputHash,
          solutionHash: identity.solutionHash
        });
      }
    }
    return {
      nodes,
      edges,
      rootNodeId: current,
      stages: [
        {
          id: "stage:positive-union",
          order: 0,
          operandNodeIds: positiveNodes.map(node => node.id),
          operationNodeIds: [unionId],
          inputHash: identity.inputHash,
          solutionHash: identity.solutionHash
        },
        {
          id: "stage:acoustic-lumen-subtraction",
          order: 1,
          operandNodeIds: acousticNodeIds,
          operationNodeIds: acousticOperationIds,
          inputHash: identity.inputHash,
          solutionHash: identity.solutionHash
        },
        {
          id: "stage:auxiliary-negative-subtraction",
          order: 2,
          operandNodeIds: auxiliaryNodeIds,
          operationNodeIds: auxiliaryOperationIds,
          inputHash: identity.inputHash,
          solutionHash: identity.solutionHash
        }
      ]
    };
  }

  function decoratedContacts(contacts, positive, acoustic, auxiliary) {
    const nodeIds = new Map();
    for (const body of positive.bodies) {
      nodeIds.set(body.id, `operand:positive:${canonicalId(body.id)}`);
    }
    for (const negative of acoustic.negatives) {
      nodeIds.set(
        negative.id,
        `operand:acoustic-lumen:${canonicalId(negative.id)}`
      );
    }
    for (const negative of auxiliary.negatives) {
      nodeIds.set(
        negative.id,
        `operand:auxiliary-negative:${canonicalId(negative.id)}`
      );
    }
    return contacts.contacts.map(contact => ({
      ...contact,
      aNodeId: nodeIds.get(contact.a),
      bNodeId: nodeIds.get(contact.b)
    }));
  }

  function buildSolidPlan(input) {
    const diagnostics = [];
    if (!isRecord(input) ||
        !isRecord(input.physicsSolution)) {
      return failure([diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        ["physicsSolution"],
        "buildSolidPlan requires exactly one explicit physicsSolution envelope."
      )]);
    }
    const solution = input.physicsSolution;
    const dataIssues = [];
    collectDataIssues(
      solution,
      "physicsSolution",
      dataIssues,
      new Set()
    );
    if (dataIssues.length) {
      return failure([diagnostic(
        FAILURE_CODES.INPUT_INVALID,
        dataIssues,
        "The physics solution must be finite, acyclic plain data; executable, undefined, class-instance, sparse, and nonfinite values are refused."
      )]);
    }
    if (solution.schemaVersion !== INPUT_SCHEMA_VERSION) {
      return failure([diagnostic(
        FAILURE_CODES.SCHEMA_UNSUPPORTED,
        ["physicsSolution.schemaVersion"],
        "Legacy or non-schema-2 physics input is refused.",
        {
          expected: INPUT_SCHEMA_VERSION,
          actual: solution.schemaVersion
        }
      )]);
    }
    const inputHash = cleanString(solution.inputHash);
    const solutionHash = cleanString(solution.solutionHash);
    const topologyKind = cleanString(
      isRecord(solution.topology) && solution.topology.kind
    );
    if (solution.ok !== true ||
        !inputHash ||
        !solutionHash ||
        !isRecord(solution.readiness) ||
        solution.readiness.analysis !== true ||
        !SUPPORTED_TOPOLOGIES.includes(topologyKind)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.PHYSICS_INVALID,
        [
          "physicsSolution.ok",
          "physicsSolution.inputHash",
          "physicsSolution.solutionHash",
          "physicsSolution.topology.kind",
          "physicsSolution.readiness.analysis"
        ],
        "A successful analyzed schema-2 T3, CX3, or H3 physics solution is required."
      ));
    }
    const intent = isRecord(solution.solidIntent)
      ? solution.solidIntent
      : null;
    if (!intent) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.UNAVAILABLE,
        ["physicsSolution.solidIntent"],
        "The physics solution has no canonical solidIntent; render geometry and legacy state are never used as fallback."
      ));
      return failure(diagnostics);
    }
    const identity = { inputHash, solutionHash };
    if (intent.schemaVersion !== PLAN_SCHEMA_VERSION ||
        cleanString(intent.units) !== "m" ||
        !cleanString(intent.constructionId) ||
        !cleanString(intent.topologyImplementationRevision)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INTENT_INVALID,
        [
          "physicsSolution.solidIntent.schemaVersion",
          "physicsSolution.solidIntent.units",
          "physicsSolution.solidIntent.constructionId",
          "physicsSolution.solidIntent.topologyImplementationRevision"
        ],
        "solidIntent requires schemaVersion 1, SI metre units, constructionId, and a stable topologyImplementationRevision."
      ));
    }
    parity(
      intent,
      "physicsSolution.solidIntent",
      inputHash,
      solutionHash,
      diagnostics
    );
    validateNoInference(intent, diagnostics);
    if (cleanString(intent.geometryAuthority) ===
          "closed-canonical-construction-operands" &&
        (!finite(intent.requestedBooleanToleranceM) ||
          intent.requestedBooleanToleranceM <= 0)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INTENT_INVALID,
        ["physicsSolution.solidIntent.requestedBooleanToleranceM"],
        "Closed calculated construction requires one explicit positive Boolean tolerance; tolerance inference is refused."
      ));
    }
    if (!Array.isArray(intent.positiveBodies) ||
        !Array.isArray(intent.acousticLumenNegatives) ||
        !Array.isArray(intent.auxiliaryNegatives) ||
        !Array.isArray(intent.expectedContacts) ||
        !Array.isArray(intent.allowedOverlapPairs)) {
      diagnostics.push(diagnostic(
        FAILURE_CODES.INTENT_INVALID,
        [
          "physicsSolution.solidIntent.positiveBodies",
          "physicsSolution.solidIntent.acousticLumenNegatives",
          "physicsSolution.solidIntent.auxiliaryNegatives",
          "physicsSolution.solidIntent.expectedContacts",
          "physicsSolution.solidIntent.allowedOverlapPairs"
        ],
        "All solidIntent operand/contact collections must be explicit arrays, including empty auxiliary collections."
      ));
    }
    if (diagnostics.length) return failure(diagnostics);

    const canonical = normalizeCanonicalSolution(
      solution,
      identity,
      diagnostics
    );
    const positive = normalizePositiveBodies(
      intent.positiveBodies,
      canonical,
      identity,
      diagnostics
    );
    const globalOperandIds = new Map();
    for (const body of positive.bodies) {
      globalOperandIds.set(
        body.id,
        `physicsSolution.solidIntent.positiveBodies[${body.id}]`
      );
    }
    const acoustic = normalizeAcousticNegatives(
      intent.acousticLumenNegatives,
      canonical,
      positive,
      identity,
      diagnostics,
      globalOperandIds
    );
    const auxiliary = normalizeAuxiliaryNegatives(
      intent.auxiliaryNegatives,
      positive,
      identity,
      diagnostics,
      globalOperandIds
    );
    const closedConstruction =
      cleanString(intent.geometryAuthority) ===
        "closed-canonical-construction-operands";
    if (closedConstruction) {
      for (const body of positive.bodies) requireClosedMesh(
        body.mesh,
        `physicsSolution.solidIntent.positiveBodies[${body.id}].mesh`,
        diagnostics
      );
      for (const negative of acoustic.negatives) requireClosedMesh(
        negative.mesh,
        `physicsSolution.solidIntent.acousticLumenNegatives[${negative.id}].mesh`,
        diagnostics
      );
      for (const negative of auxiliary.negatives) requireClosedMesh(
        negative.mesh,
        `physicsSolution.solidIntent.auxiliaryNegatives[${negative.id}].mesh`,
        diagnostics
      );
    }
    const contacts = normalizeContacts(
      intent.expectedContacts,
      positive,
      acoustic,
      auxiliary,
      canonical,
      identity,
      diagnostics
    );
    const allowedOverlapPairs = normalizeOverlapPairs(
      intent.allowedOverlapPairs,
      positive,
      contacts,
      identity,
      diagnostics
    );
    if (diagnostics.length) return failure(diagnostics);

    const dag = buildDag(positive, acoustic, auxiliary, identity);
    const resultBase = {
      schemaVersion: PLAN_SCHEMA_VERSION,
      kind: "threeway-provider-neutral-solid-plan",
      inputHash,
      solutionHash,
      topology: {
        kind: topologyKind
      },
      topologyId: topologyKind,
      constructionId: cleanString(intent.constructionId),
      topologyImplementationRevision:
        cleanString(intent.topologyImplementationRevision),
      geometryAuthority:
        cleanString(intent.geometryAuthority),
      geometryHash: cleanString(intent.geometryHash),
      integratedFieldContract:
        isRecord(intent.integratedFieldContract)
          ? cloneValue(intent.integratedFieldContract) : null,
      requestedBooleanToleranceM:
        finite(intent.requestedBooleanToleranceM) &&
        intent.requestedBooleanToleranceM > 0
          ? intent.requestedBooleanToleranceM : null,
      units: "m",
      componentIds: positive.bodies
        .map(body => body.id)
        .sort(),
      lumenIds: acoustic.negatives
        .map(negative => negative.id)
        .sort(),
      mountHostIds: positive.bodies
        .filter(body => body.role === "mount-host")
        .map(body => body.id)
        .sort(),
      mountAdapterIds: positive.bodies
        .filter(body => body.role === "mount-adapter")
        .map(body => body.id)
        .sort(),
      provider: {
        selected: false,
        id: null,
        version: null,
        kernelId: null,
        kernelVersion: null
      },
      dag,
      expectedContacts: decoratedContacts(
        contacts,
        positive,
        acoustic,
        auxiliary
      ),
      allowedOverlapPairs,
      counts: {
        positiveBodies: positive.bodies.length,
        hornShells: positive.bodies.filter(body =>
          body.role === "horn-shell"
        ).length,
        throatInterfaces: positive.bodies.filter(body =>
          body.role === "throat-interface"
        ).length,
        mountHosts: positive.bodies.filter(body =>
          body.role === "mount-host"
        ).length,
        mountAdapters: positive.bodies.filter(body =>
          body.role === "mount-adapter"
        ).length,
        optionalRearAndEnclosureBodies: positive.bodies.filter(body =>
          body.role === "rear-system" || body.role === "enclosure"
        ).length,
        acousticLumenNegatives: acoustic.negatives.length,
        auxiliaryNegatives: auxiliary.negatives.length,
        expectedContacts: contacts.contacts.length
      },
      invariants: {
        physicsSolutionOnly: true,
        renderGeometryConsumed: false,
        legacyInputConsumed: false,
        allNodeHashesMatchSolution: true,
        positiveBodiesUnionFirst: true,
        oneAcousticNegativePerAperture: true,
        eachAcousticNegativeSubtractedOnce: true,
        passageInspectionMeshesPreserved: true,
        passageSolidMeshesPreserved: closedConstruction,
        mountInspectionMeshesPreserved: true,
        fullFaceMountHostsOnly: true,
        oneSolidAdapterPerMount: closedConstruction,
        closedOperandAuditsPassed: closedConstruction,
        auxiliaryNegativesNonAcoustic: true,
        expectedContinuityContactsExplicit: true,
        geometryInferred: false,
        toleranceInferred: false,
        meshesGenerated: false,
        booleansExecuted: false
      },
      execution: {
        providerSelected: false,
        kernelSelected: false,
        toleranceApplied: false,
        booleanUnionExecuted: false,
        booleanSubtractionExecuted: false,
        exactSolid: false,
        fabricationAudited: false,
        manufacturing: false,
        export: false,
        stl: false
      }
    };
    const hashInput = `${HASH_VERSION}\n${stableStringify(resultBase)}`;
    const planHash = hashInput;
    const result = deepFreeze({
      ...resultBase,
      planHash
    });
    return deepFreeze({
      ok: true,
      code: null,
      result,
      diagnostics: [],
      inputHash,
      solutionHash,
      planHash,
      hashInput,
      booleanExecuted: false,
      exactSolid: false,
      manufacturing: false,
      export: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  function manufacturingPreflight(operation) {
    return deepFreeze({
      ok: false,
      available: false,
      operation: cleanString(operation) || "solid-plan-execution-or-export",
      code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
      reason: CAPABILITIES.reason,
      booleanExecuted: false,
      exactSolid: false,
      fabricationAudited: false,
      manufacturing: false,
      export: false,
      stl: false,
      capabilities: CAPABILITIES
    });
  }

  return deepFreeze({
    version: VERSION,
    inputSchemaVersion: INPUT_SCHEMA_VERSION,
    planSchemaVersion: PLAN_SCHEMA_VERSION,
    supportedTopologies: SUPPORTED_TOPOLOGIES,
    positiveRoles: POSITIVE_ROLES,
    auxiliaryNegativeRoles: AUXILIARY_NEGATIVE_ROLES,
    contactKinds: CONTACT_KINDS,
    failureCodes: FAILURE_CODES,
    capabilities: CAPABILITIES,
    stableStringify,
    buildSolidPlan,
    manufacturingPreflight
  });
}));
