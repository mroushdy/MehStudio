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
const modulePath = path.join(appRoot, "threeway-render-assembly.js");
const previewPath = path.join(appRoot, "threeway-preview-geometry.js");
const renderModelPath = path.join(appRoot, "threeway-render-model.js");
const assembly = require(modulePath);
const previewGeometry = require(previewPath);
const renderModel = require(renderModelPath);

const INPUT_HASH = "state-input-hash-render-assembly-001";
const SOLUTION_HASH = "solution-hash-render-assembly-001";

function clone(value) {
  return structuredClone(value);
}

function matrix(x = 0, y = 0, z = 0) {
  return {
    matrix4: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1,
    ],
  };
}

function cubeMesh(offset = [0, 0, 0]) {
  const [x, y, z] = offset;
  return {
    role: "canonical-closed-inspection-mesh",
    verticesM: [
      [x - 0.01, y - 0.01, z - 0.01],
      [x + 0.01, y - 0.01, z - 0.01],
      [x + 0.01, y + 0.01, z - 0.01],
      [x - 0.01, y + 0.01, z - 0.01],
      [x - 0.01, y - 0.01, z + 0.01],
      [x + 0.01, y - 0.01, z + 0.01],
      [x + 0.01, y + 0.01, z + 0.01],
      [x - 0.01, y + 0.01, z + 0.01],
    ],
    triangles: [
      [0, 2, 1], [0, 3, 2],
      [4, 5, 6], [4, 6, 7],
      [0, 1, 5], [0, 5, 4],
      [1, 2, 6], [1, 6, 5],
      [2, 3, 7], [2, 7, 6],
      [3, 0, 4], [3, 4, 7],
    ],
    audit: {
      vertexCount: 8,
      triangleCount: 12,
      openEdges: 0,
      nonManifoldEdges: 0,
      degenerateTriangles: 0,
      closed: true,
      twoManifold: true,
      outwardOrientation: true,
    },
    manufacturingAuthority: false,
  };
}

function fixture() {
  const negativeInspectionMesh = cubeMesh([0.08, 0.04, 0]);
  const hostInspectionMesh = cubeMesh([0.06, 0.04, 0]);
  return {
    stateHash: INPUT_HASH,
    state: {
      schemaVersion: 2,
      designId: "render-assembly-fixture",
      revision: 11,
      topology: { schemaVersion: 1, kind: "T3" },
      sources: [
        {
          id: "source-high",
          role: "throat-source",
          bandIds: ["high"],
          count: 1,
        },
        {
          id: "source-low",
          role: "wall-source",
          bandIds: ["low"],
          count: 1,
        },
        {
          id: "source-mid",
          role: "wall-source",
          bandIds: ["mid"],
          count: 1,
        },
      ],
      interfaces: [
        {
          id: "interface-high",
          kind: "throat",
          sourceIds: ["source-high"],
          bandIds: ["high"],
          geometry: {
            shape: "round",
            diameterM: 0.03556,
          },
        },
      ],
      entryStations: [
        {
          id: "station-low",
          role: "wall-entry",
          sourceIds: ["source-low"],
          bandIds: ["low"],
          order: 1,
        },
      ],
    },
    solutionCore: {
      schemaVersion: 2,
      ok: true,
      topologyId: "T3",
      inputHash: INPUT_HASH,
      solutionHash: SOLUTION_HASH,
      readiness: {
        analysis: true,
        manufacturing: false,
      },
      diagnostics: [],
      exactSolid: false,
      manufacturing: false,
      stl: false,
    },
    hornSurface: {
      ok: true,
      kind: "threeway-horn-surface",
      surfaceHash: "horn-surface-hash-001",
      coordinateSystem: {
        origin: "throat-center",
        axialAxis: "+x",
        horizontalAxis: "+y",
        verticalAxis: "+z",
      },
      stations: [
        {
          axialM: 0,
          section: {
            family: "ellipse",
            widthM: 0.03556,
            heightM: 0.03556,
            exponent: 2,
          },
        },
        {
          axialM: 0.4,
          section: {
            family: "superellipse",
            widthM: 0.7,
            heightM: 0.5,
            exponent: 3.2,
          },
        },
      ],
      exactSolid: false,
      manufacturing: false,
    },
    resolvedDrivers: {
      ok: true,
      sources: [
        {
          sourceId: "source-low",
          driverRef: "driver-low",
          count: 1,
          bandIds: ["low"],
          driver: {
            id: "driver-low",
            frame: {
              shape: "round",
              diameterM: 0.17,
              depthM: 0.08,
              frontProjectionM: 0.005,
            },
          },
        },
      ],
      manufacturing: false,
    },
    passageResult: {
      ok: true,
      result: {
        schemaVersion: 2,
        passages: [
          {
            schemaVersion: 1,
            id: "passage-low-01-a",
            apertureId: "aperture-low-01-a",
            layoutId: "layout-low",
            stationId: "station-low",
            sourceId: "source-low",
            bandId: "low",
            driverInstanceId: "source-low/driver-01",
            driverRecordId: "driver-low",
            canonicalNegative: true,
            subtractedFromPositiveHosts: false,
            negativeInspectionMesh,
            exactSolid: false,
            manufacturing: false,
            stl: false,
          },
        ],
      },
      manufacturing: false,
    },
    mountResult: {
      ok: true,
      result: {
        schemaVersion: 2,
        mounts: [
          {
            id: "mount-host:source-low/driver-01",
            instanceId: "source-low/driver-01",
            sourceId: "source-low",
            stationId: "station-low",
            driverRecordId: "driver-low",
            mountDatum: {
              originM: [0.06, 0.04, 0],
              normal: [0, -1, 0],
              uAxis: [1, 0, 0],
              vAxis: [0, 0, 1],
            },
            driverEnvelope: {
              role: "documented-driver-body-conservative-capsule",
              sourceId: "source-low",
              stationId: "station-low",
              instanceId: "source-low/driver-01",
              driverRecordId: "driver-low",
              radiusM: 0.085,
              rearPointM: [0.06, 0.12, 0],
              frontPointM: [0.06, 0.035, 0],
              depthM: 0.08,
              frontProjectionM: 0.005,
              inferredDimensions: false,
              hardwareValidated: false,
              manufacturing: false,
            },
            mountHost: {
              id: "mount-host:source-low/driver-01",
              positiveHost: {
                fullFace: true,
                centerOpen: false,
                booleanUnionPerformed: false,
              },
              negativeIntents: {
                booleanSubtractionPerformed: false,
              },
            },
            inspectionMesh: hostInspectionMesh,
            apertureBindings: [
              {
                apertureId: "aperture-low-01-a",
                passageId: "passage-low-01-a",
                negativeInspectionMesh: clone(negativeInspectionMesh),
                canonicalLumenThroughHostIntent: true,
                booleanSubtractionPerformed: false,
              },
            ],
            hardwareValidated: false,
            manufacturing: false,
          },
        ],
      },
      manufacturing: false,
    },
    packageResult: {
      ok: true,
      result: {
        schemaVersion: 1,
        horn: {
          id: "horn-surface-hash-001",
          boundsM: {
            minM: [0, -0.35, -0.25],
            maxM: [0.4, 0.35, 0.25],
          },
        },
        package: {
          boundsM: {
            minM: [-0.05, -0.35, -0.25],
            maxM: [0.4, 0.35, 0.25],
          },
          dimensionsM: {
            depth: 0.45,
            width: 0.7,
            height: 0.5,
          },
          withinLimit: true,
        },
        driverEnvelopeCount: 1,
        mountHostCount: 1,
        collisions: [],
        automaticHornGrowth: false,
        automaticComponentMotion: false,
        manufacturing: false,
      },
      manufacturing: false,
    },
    renderIntents: {
      throatInterfaces: [
        {
          interfaceId: "interface-high",
          transform: matrix(0, 0, 0),
          primitive: {
            kind: "plane",
            parameters: { dimensionsM: [0.03556, 0.03556] },
          },
        },
      ],
      stationMarkers: [
        {
          stationId: "station-low",
          transform: matrix(0.08, 0, 0),
          primitive: {
            kind: "plane",
            parameters: { dimensionsM: [0.12, 0.08] },
          },
        },
      ],
      sectionPlane: {
        id: "axial-center",
        transform: matrix(0, 0, 0),
        primitive: {
          kind: "plane",
          parameters: { dimensionsM: [0.45, 0.7] },
        },
      },
    },
    azimuthSegments: 16,
  };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) {
    assertDeepFrozen(child, seen);
  }
}

function assemble(input = fixture()) {
  return assembly.assembleRenderGeometry(input);
}

test("assembles a deterministic renderGeometry DTO accepted by render-model", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const result = assemble(input);

  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
  assert.equal(JSON.stringify(input), before, "assembly mutated its input");
  assert.equal(result.solution.renderGeometry, result.renderGeometry);
  assert.equal(result.renderGeometry.schemaVersion, 1);
  assert.equal(result.renderGeometry.topologyId, "T3");
  assert.equal(result.renderGeometry.inputHash, INPUT_HASH);
  assert.equal(result.renderGeometry.solutionHash, SOLUTION_HASH);
  assert.equal(result.renderGeometry.items.length, 9);
  assert.deepEqual(
    result.renderGeometry.items.map(item => item.id),
    [
      "aperture:aperture-low-01-a",
      "driver-envelope:source-low/driver-01",
      "horn-surface:horn-surface-hash-001",
      "lumen-inspection:passage-low-01-a",
      "mount-host:source-low/driver-01",
      "package-bounds",
      "section-plane:axial-center",
      "station-marker:station-low",
      "throat-interface:interface-high",
    ],
  );
  for (const item of result.renderGeometry.items) {
    assert.equal(item.solutionHash, SOLUTION_HASH);
    assert.equal(item.ownership.topologyId, "T3");
    assert.equal(item.material.category, "analysis-preview-only");
    assert.equal(item.material.materialAuthority, false);
    assert.equal(item.exactSolid, false);
    assert.equal(item.manufacturing, false);
    assert.equal(item.stl, false);
  }
  const model = renderModel.buildRenderModel({
    stateHash: INPUT_HASH,
    state: input.state,
    solution: result.solution,
  });
  assert.equal(model.ok, true, JSON.stringify(model.diagnostics, null, 2));
  assert.equal(model.itemCount, 9);
  assert.equal(model.viewCount, 7);
  for (const viewId of assembly.viewIds) {
    const selection = renderModel.selectView(model, viewId);
    assert.equal(
      selection.ok,
      true,
      `${viewId}: ${JSON.stringify(selection.diagnostics, null, 2)}`,
    );
  }
  assertDeepFrozen(result);
});

test("only injected preview geometry tessellates the horn", () => {
  const calls = [];
  const injected = assembly.createRenderAssembly({
    version: 91,
    buildHornInnerSurface(input) {
      calls.push(clone(input));
      return previewGeometry.buildHornInnerSurface(input);
    },
    copyInspectionMesh() {
      throw new Error("inspection meshes must be flattened directly");
    },
  });
  const input = fixture();
  const result = injected.assembleRenderGeometry(input);

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].hornSurface.surfaceHash, "horn-surface-hash-001");
  assert.equal(calls[0].azimuthSegments, 16);
  const horn = result.renderGeometry.items.find(
    item => item.category === "horn-surface",
  );
  assert.equal(horn.mesh.positionsM.length, 2 * 16 * 3);
  assert.equal(horn.mesh.indices.length, 16 * 2 * 3);
});

test("preserves exact passage arrays in aperture and lumen inspection items", () => {
  const input = fixture();
  const result = assemble(input);
  assert.equal(result.ok, true);

  const expected = input.passageResult.result.passages[0]
    .negativeInspectionMesh;
  for (const category of ["aperture", "lumen-inspection"]) {
    const item = result.renderGeometry.items.find(
      candidate => candidate.category === category,
    );
    assert.deepEqual(
      item.mesh.positionsM,
      expected.verticesM.flat(),
    );
    assert.deepEqual(item.mesh.indices, expected.triangles.flat());
  }
  assert.equal(
    result.renderGeometry.items.find(
      item => item.category === "mount-host",
    ).mesh.positionsM.length,
    input.mountResult.result.mounts[0]
      .inspectionMesh.verticesM.length * 3,
  );
});

test("driver visual mesh and package bounds copy supplied dimensions and datums without scaling", () => {
  const result = assemble();
  assert.equal(result.ok, true);
  const driver = result.renderGeometry.items.find(
    item => item.category === "driver",
  );
  const xs = [], ys = [], zs = [];
  for (let index = 0; index < driver.mesh.positionsM.length; index += 3) {
    xs.push(driver.mesh.positionsM[index]);
    ys.push(driver.mesh.positionsM[index + 1]);
    zs.push(driver.mesh.positionsM[index + 2]);
  }
  assert.deepEqual([
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    Math.max(...zs) - Math.min(...zs),
  ], [0.085, 0.17, 0.17]);
  assert.equal(driver.visualReferenceOnly, true);
  assert.equal(driver.visualShape, "closed-cylindrical-driver-envelope");
  const edgeUses = new Map();
  for (let index = 0; index < driver.mesh.indices.length; index += 3) {
    const triangle = driver.mesh.indices.slice(index, index + 3);
    for (let edge = 0; edge < 3; edge += 1) {
      const pair = [
        triangle[edge],
        triangle[(edge + 1) % 3],
      ].sort((left, right) => left - right).join(":");
      edgeUses.set(pair, (edgeUses.get(pair) || 0) + 1);
    }
  }
  assert.equal(
    [...edgeUses.values()].every(count => count === 2),
    true,
    "driver-envelope visual must be a closed two-manifold preview",
  );
  assert.equal(driver.material.kind, "mesh-basic");
  assert.equal(driver.material.parameters.wireframe, false);
  assert.equal(driver.material.parameters.opacity, 0.96);
  assert.deepEqual(
    driver.transform.matrix4.slice(12, 15),
    [0.06, 0.0775, 0],
  );
  const bounds = result.renderGeometry.items.find(
    item => item.category === "package-bounds",
  );
  assert.deepEqual(
    bounds.primitive.parameters.dimensionsM,
    [0.45, 0.7, 0.5],
  );
  assert.ok(
    Math.abs(bounds.transform.positionM[0] - 0.175) < 1e-15,
  );
  assert.deepEqual(bounds.transform.positionM.slice(1), [0, 0]);
});

test("fails closed when the canonical passage mesh is absent or unaudited", () => {
  const missing = fixture();
  delete missing.passageResult.result.passages[0].negativeInspectionMesh;
  const missingResult = assemble(missing);
  assert.equal(missingResult.ok, false);
  assert.equal(
    missingResult.code,
    assembly.failureCodes.GEOMETRY_MISSING,
  );

  const unaudited = fixture();
  unaudited.passageResult.result.passages[0]
    .negativeInspectionMesh.audit.closed = false;
  unaudited.mountResult.result.mounts[0]
    .apertureBindings[0].negativeInspectionMesh.audit.closed = false;
  const unauditedResult = assemble(unaudited);
  assert.equal(unauditedResult.ok, false);
  assert.equal(
    unauditedResult.code,
    assembly.failureCodes.GEOMETRY_INVALID,
  );
});

test("rejects any mount copy that diverges from the canonical passage mesh", () => {
  const input = fixture();
  input.mountResult.result.mounts[0]
    .apertureBindings[0].negativeInspectionMesh.verticesM[0][0] += 0.001;
  const result = assemble(input);

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    assembly.failureCodes.CANONICAL_MESH_MISMATCH,
  );
});

test("requires datum, driver envelope, full-face host, and host inspection mesh", () => {
  const mutations = [
    input => { delete input.mountResult.result.mounts[0].mountDatum; },
    input => { delete input.mountResult.result.mounts[0].driverEnvelope; },
    input => {
      input.mountResult.result.mounts[0]
        .mountHost.positiveHost.centerOpen = true;
    },
    input => { delete input.mountResult.result.mounts[0].inspectionMesh; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = assemble(input);
    assert.equal(result.ok, false);
    assert.ok([
      assembly.failureCodes.MOUNT_RESULT_INVALID,
      assembly.failureCodes.GEOMETRY_MISSING,
    ].includes(result.code), result.code);
  }
});

test("fails closed on missing throat, station, or section render intent", () => {
  const mutations = [
    input => { input.renderIntents.throatInterfaces = []; },
    input => { input.renderIntents.stationMarkers = []; },
    input => { delete input.renderIntents.sectionPlane; },
    input => {
      input.renderIntents.throatInterfaces.push(
        clone(input.renderIntents.throatInterfaces[0]),
      );
    },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = assemble(input);
    assert.equal(result.ok, false);
    assert.equal(
      result.code,
      assembly.failureCodes.RENDER_INTENT_INVALID,
    );
  }
});

test("rejects ownership and physical-count drift", () => {
  const wrongOwner = fixture();
  wrongOwner.passageResult.result.passages[0].stationId = "station-unknown";
  const wrongOwnerResult = assemble(wrongOwner);
  assert.equal(wrongOwnerResult.ok, false);
  assert.equal(
    wrongOwnerResult.code,
    assembly.failureCodes.OWNERSHIP_INVALID,
  );

  const wrongCount = fixture();
  wrongCount.state.sources.find(item => item.id === "source-low").count = 2;
  const wrongCountResult = assemble(wrongCount);
  assert.equal(wrongCountResult.ok, false);
  assert.equal(
    wrongCountResult.code,
    assembly.failureCodes.MOUNT_RESULT_INVALID,
  );
});

test("rejects state, solution, topology, and item hash drift", () => {
  const hashDrift = fixture();
  hashDrift.solutionCore.inputHash = "stale-input";
  assert.equal(
    assemble(hashDrift).code,
    assembly.failureCodes.HASH_MISMATCH,
  );

  const topologyDrift = fixture();
  topologyDrift.solutionCore.topologyId = "CX3";
  assert.equal(
    assemble(topologyDrift).code,
    assembly.failureCodes.OWNERSHIP_INVALID,
  );

  const staleGeometry = fixture();
  staleGeometry.solutionCore.renderGeometry = { schemaVersion: 1 };
  assert.equal(
    assemble(staleGeometry).code,
    assembly.failureCodes.SOLUTION_INVALID,
  );
});

test("rejects exact-solid, manufacturing, STL, and material authority", () => {
  const mutations = [
    input => { input.solutionCore.exactSolid = true; },
    input => { input.solutionCore.manufacturing = true; },
    input => { input.passageResult.manufacturing = true; },
    input => { input.mountResult.result.mounts[0].stl = true; },
    input => { input.packageResult.result.materialAuthority = true; },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = assemble(input);
    assert.equal(result.ok, false);
    assert.ok([
      assembly.failureCodes.PHYSICAL_AUTHORITY_FORBIDDEN,
      assembly.failureCodes.PASSAGE_RESULT_INVALID,
      assembly.failureCodes.MOUNT_RESULT_INVALID,
      assembly.failureCodes.PACKAGE_RESULT_INVALID,
    ].includes(result.code), result.code);
  }
});

test("dependency and horn tessellation failures are explicit", () => {
  const missing = assembly.createRenderAssembly(null);
  assert.equal(
    missing.assembleRenderGeometry(fixture()).code,
    assembly.failureCodes.DEPENDENCY_INVALID,
  );

  const failed = assembly.createRenderAssembly({
    buildHornInnerSurface() {
      return {
        ok: false,
        code: "TEST_PREVIEW_FAILURE",
        diagnostics: [],
      };
    },
  });
  assert.equal(
    failed.assembleRenderGeometry(fixture()).code,
    assembly.failureCodes.PREVIEW_FAILED,
  );
});

test("package bounds and package ownership counts cannot be missing or stale", () => {
  const noBounds = fixture();
  delete noBounds.packageResult.result.package.boundsM;
  assert.equal(
    assemble(noBounds).code,
    assembly.failureCodes.PACKAGE_RESULT_INVALID,
  );

  const staleCount = fixture();
  staleCount.packageResult.result.driverEnvelopeCount = 2;
  assert.equal(
    assemble(staleCount).code,
    assembly.failureCodes.PACKAGE_RESULT_INVALID,
  );
});

test("nonfinite supplied geometry and transforms fail closed", () => {
  const mesh = fixture();
  mesh.mountResult.result.mounts[0].inspectionMesh.verticesM[0][0] = NaN;
  assert.equal(
    assemble(mesh).code,
    assembly.failureCodes.GEOMETRY_INVALID,
  );

  const transform = fixture();
  transform.renderIntents.sectionPlane.transform.matrix4[0] = Infinity;
  assert.equal(
    assemble(transform).code,
    assembly.failureCodes.RENDER_INTENT_INVALID,
  );
});

test("browser global build uses the global preview dependency", () => {
  const context = {
    console,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(previewPath, "utf8"), context, {
    filename: previewPath,
  });
  vm.runInContext(fs.readFileSync(modulePath, "utf8"), context, {
    filename: modulePath,
  });

  assert.equal(context.MEH3RenderAssembly.version, 1);
  const result = context.MEH3RenderAssembly.assembleRenderGeometry(
    clone(fixture()),
  );
  assert.equal(
    result.ok,
    true,
    JSON.stringify(result.diagnostics, null, 2),
  );
});

test("manufacturing preflight remains unavailable", () => {
  const result = assembly.manufacturingPreflight("threeway-stl");
  assert.equal(result.ok, false);
  assert.equal(result.available, false);
  assert.equal(result.exactSolid, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.stl, false);
});
