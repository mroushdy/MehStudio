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
const modulePath = path.join(appRoot, "threeway-render-model.js");
const renderModel = require(modulePath);

const VIEW_IDS = [
  "full-assembly",
  "horn-only",
  "no-drivers-mount-assembly",
  "mounts-preview",
  "lumen-inspection",
  "section-cutaway",
  "package-bounds",
];

function visibility(enabled) {
  const result = Object.fromEntries(VIEW_IDS.map(id => [id, false]));
  for (const id of enabled) result[id] = true;
  return result;
}

function ownership(sourceIds = [], bandIds = [], stationIds = []) {
  return {
    topologyId: "T3",
    bandIds,
    sourceIds,
    stationIds,
  };
}

function matrixTransform() {
  return {
    matrix4: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0.012345, -0.02, 0.03, 1,
    ],
  };
}

function trsTransform() {
  return {
    positionM: [0.12345, -0.04, 0.07],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

function material(id) {
  return {
    id,
    category: "analysis-preview",
    color: "#d8dde0",
    opacity: 0.82,
  };
}

function mesh(id, category, owner, enabled) {
  return {
    id,
    category,
    solutionHash: "solution-hash-001",
    ownership: owner,
    material: material(`material-${id}`),
    visibility: visibility(enabled),
    transform: matrixTransform(),
    mesh: {
      positionsM: [
        0, 0, 0,
        0.123456789, 0, 0,
        0, 0.234567891, 0,
      ],
      indices: [0, 1, 2],
      normals: [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
      ],
      topology: "triangles",
    },
    label: `${id} supplied geometry`,
  };
}

function primitive(id, category, owner, enabled, kind = "box") {
  return {
    id,
    category,
    solutionHash: "solution-hash-001",
    ownership: owner,
    material: material(`material-${id}`),
    visibility: visibility(enabled),
    transform: trsTransform(),
    primitive: {
      kind,
      parameters: {
        dimensionsM: [0.123456789, 0.234567891, 0.345678912],
        suppliedBy: "fixture-solver",
      },
    },
    label: `${id} supplied primitive`,
  };
}

function fixture() {
  const stateHash = "state-hash-001";
  const items = [
    mesh(
      "horn-surface",
      "horn-surface",
      ownership(),
      [
        "full-assembly",
        "horn-only",
        "no-drivers-mount-assembly",
        "mounts-preview",
        "lumen-inspection",
        "section-cutaway",
      ],
    ),
    primitive(
      "driver-mid",
      "driver",
      ownership(["source-mid"], ["mid"]),
      ["full-assembly", "section-cutaway"],
      "driver-envelope",
    ),
    primitive(
      "mount-mid",
      "mount-host",
      ownership(["source-mid"], ["mid"], ["station-mid"]),
      [
        "full-assembly",
        "no-drivers-mount-assembly",
        "mounts-preview",
        "lumen-inspection",
        "section-cutaway",
      ],
      "solid-host-intent",
    ),
    primitive(
      "aperture-mid-a",
      "aperture",
      ownership(["source-mid"], ["mid"], ["station-mid"]),
      [
        "full-assembly",
        "horn-only",
        "no-drivers-mount-assembly",
        "mounts-preview",
        "lumen-inspection",
      ],
      "racetrack-aperture",
    ),
    mesh(
      "lumen-mid-a",
      "lumen-inspection",
      ownership(["source-mid"], ["mid"], ["station-mid"]),
      ["lumen-inspection"],
    ),
    primitive(
      "section-plane-x",
      "section-plane",
      ownership(),
      ["section-cutaway"],
      "plane",
    ),
    primitive(
      "package-envelope",
      "package-bounds",
      ownership(),
      ["package-bounds"],
      "bounds",
    ),
  ];
  return {
    stateHash,
    state: {
      schemaVersion: 2,
      designId: "render-contract-design",
      revision: 7,
      topology: { kind: "T3", schemaVersion: 1 },
      sources: [
        { id: "source-low", bandIds: ["low"] },
        { id: "source-mid", bandIds: ["mid"] },
        { id: "source-high", bandIds: ["high"] },
      ],
      entryStations: [
        {
          id: "station-low",
          sourceIds: ["source-low"],
          bandIds: ["low"],
        },
        {
          id: "station-mid",
          sourceIds: ["source-mid"],
          bandIds: ["mid"],
        },
      ],
    },
    solution: {
      schemaVersion: 2,
      ok: true,
      inputHash: stateHash,
      solutionHash: "solution-hash-001",
      readiness: { analysis: true, manufacturing: false },
      diagnostics: [
        {
          code: "FIXTURE_INFORMATION",
          severity: "info",
          message: "Fixture geometry is analysis-only.",
        },
      ],
      renderGeometry: {
        schemaVersion: 1,
        topologyId: "T3",
        inputHash: stateHash,
        solutionHash: "solution-hash-001",
        provider: "fixture-orchestrator",
        providerVersion: 3,
        coordinateSystem: {
          origin: "throat-center",
          axialAxis: "+x",
          horizontalAxis: "+y",
          verticalAxis: "+z",
          units: "m",
        },
        items,
      },
    },
  };
}

function item(input, id) {
  return input.solution.renderGeometry.items.find(entry => entry.id === id);
}

test("successful schema-2 solution emits deterministic immutable render DTOs", () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = renderModel.buildRenderModel(input);

  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.dto.schemaVersion, 1);
  assert.equal(result.dto.topologyId, "T3");
  assert.equal(result.dto.inputHash, input.stateHash);
  assert.equal(result.dto.solutionHash, input.solution.solutionHash);
  assert.equal(result.dto.renderHash, input.solution.solutionHash);
  assert.equal(result.dto.hashParity, true);
  assert.deepEqual(result.dto.views.map(view => view.id), VIEW_IDS);
  assert.equal(result.dto.exactSolid, false);
  assert.equal(result.dto.manufacturing, false);
  assert.equal(result.dto.stl, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.dto));
  assert.ok(Object.isFrozen(result.dto.items));
  assert.ok(Object.isFrozen(result.dto.items[0].material));
});

test("item permutation cannot change keyed output or view ordering", () => {
  const leftInput = fixture();
  const rightInput = fixture();
  rightInput.solution.renderGeometry.items.reverse();

  const left = renderModel.buildRenderModel(leftInput);
  const right = renderModel.buildRenderModel(rightInput);

  assert.equal(left.ok, true);
  assert.equal(right.ok, true);
  assert.deepEqual(left.dto, right.dto);
  assert.deepEqual(
    left.dto.items.map(entry => entry.id),
    [...left.dto.items.map(entry => entry.id)].sort(),
  );
});

test("supplied geometry, transforms, materials, and visibility are not rescaled or invented", () => {
  const input = fixture();
  const result = renderModel.buildRenderModel(input);
  assert.equal(result.ok, true);

  for (const id of ["horn-surface", "driver-mid"]) {
    const supplied = item(input, id);
    const projected = result.dto.byItem[id];
    assert.deepEqual(projected.material, supplied.material);
    assert.deepEqual(projected.visibility, supplied.visibility);
    assert.deepEqual(projected.transform, supplied.transform);
    if (supplied.mesh) assert.deepEqual(projected.mesh, supplied.mesh);
    if (supplied.primitive) {
      assert.deepEqual(projected.primitive, supplied.primitive);
    }
  }
  assert.equal(
    result.dto.byItem["driver-mid"].primitive.parameters.dimensionsM[0],
    0.123456789,
  );
  assert.equal(
    result.dto.byItem["horn-surface"].mesh.positionsM[3],
    0.123456789,
  );
  assert.equal(result.dto.geometrySource.geometryAltered, false);
  assert.equal(result.dto.geometrySource.transformsAltered, false);
});

test("all seven deterministic visibility contracts select only supplied items", () => {
  const result = renderModel.buildRenderModel(fixture());
  assert.equal(result.ok, true);

  const expected = {
    "full-assembly": [
      "aperture-mid-a", "driver-mid", "horn-surface", "mount-mid",
    ],
    "horn-only": ["aperture-mid-a", "horn-surface"],
    "no-drivers-mount-assembly": [
      "aperture-mid-a", "horn-surface", "mount-mid",
    ],
    "mounts-preview": [
      "aperture-mid-a", "horn-surface", "mount-mid",
    ],
    "lumen-inspection": [
      "aperture-mid-a", "horn-surface", "lumen-mid-a", "mount-mid",
    ],
    "section-cutaway": [
      "driver-mid", "horn-surface", "mount-mid", "section-plane-x",
    ],
    "package-bounds": ["package-envelope"],
  };
  for (const viewId of VIEW_IDS) {
    assert.deepEqual(result.dto.byView[viewId].itemIds, expected[viewId]);
    const selected = renderModel.selectView(result, viewId);
    assert.equal(selected.ok, true);
    assert.equal(selected.solutionHash, result.solutionHash);
    assert.equal(selected.renderHash, result.solutionHash);
    assert.deepEqual(
      selected.items.map(entry => entry.id),
      expected[viewId],
    );
    assert.ok(selected.items.every(entry =>
      result.dto.byItem[entry.id] === entry));
  }
});

test("state, solution, render geometry, and item hash mismatches fail closed", () => {
  const mutations = [
    input => { input.solution.inputHash = "wrong-state"; },
    input => { input.solution.renderGeometry.inputHash = "wrong-state"; },
    input => { input.solution.renderGeometry.solutionHash = "wrong-solution"; },
    input => { item(input, "mount-mid").solutionHash = "stale-solution"; },
    input => { input.state.inputHash = "conflicting-state-alias"; },
    input => {
      input.solution.stateHashInput = "conflicting-solution-alias";
    },
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, "THREEWAY_RENDER_HASH_MISMATCH");
    assert.equal(result.dto, null);
    assert.equal(result.manufacturing, false);
  }
});

test("legacy, non-schema-2, unsuccessful, and unready solutions are refused", () => {
  const cases = [
    [input => { input.legacyState = {}; }, "THREEWAY_RENDER_STATE_INVALID"],
    [input => { input.state.schemaVersion = 1; },
      "THREEWAY_RENDER_STATE_INVALID"],
    [input => { input.state.topology.kind = "2way"; },
      "THREEWAY_RENDER_STATE_INVALID"],
    [input => { input.solution.schemaVersion = 1; },
      "THREEWAY_RENDER_SOLUTION_INVALID"],
    [input => { input.solution.ok = false; },
      "THREEWAY_RENDER_SOLUTION_INVALID"],
    [input => { input.solution.readiness.analysis = false; },
      "THREEWAY_RENDER_SOLUTION_INVALID"],
  ];
  for (const [mutate, code] of cases) {
    const input = fixture();
    mutate(input);
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, code);
    assert.equal(result.dto, null);
  }
});

test("missing, ambiguous, or structurally invalid geometry fails closed", () => {
  const cases = [
    input => { delete item(input, "horn-surface").mesh; },
    input => {
      item(input, "horn-surface").primitive = {
        kind: "box", parameters: {},
      };
    },
    input => { item(input, "horn-surface").mesh.indices = [0, 1, 9]; },
    input => { item(input, "driver-mid").primitive.parameters = null; },
    input => { input.solution.renderGeometry.items = []; },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, false);
    assert.ok([
      "THREEWAY_RENDER_GEOMETRY_MISSING",
      "THREEWAY_RENDER_MODEL_UNAVAILABLE",
    ].includes(result.code));
    assert.equal(result.dto, null);
  }
});

test("topology, band, source, and station ownership cannot dangle or cross", () => {
  const cases = [
    input => {
      item(input, "lumen-mid-a").ownership.topologyId = "CX3";
    },
    input => { item(input, "lumen-mid-a").ownership.bandIds = ["ultra"]; },
    input => {
      item(input, "lumen-mid-a").ownership.sourceIds = ["missing-source"];
    },
    input => {
      item(input, "lumen-mid-a").ownership.stationIds = ["missing-station"];
    },
    input => {
      item(input, "lumen-mid-a").ownership.bandIds = ["low"];
    },
    input => {
      item(input, "lumen-mid-a").ownership.sourceIds = ["source-low"];
    },
    input => {
      item(input, "lumen-mid-a").ownership.sourceIds = [];
    },
    input => {
      item(input, "lumen-mid-a").ownership.stationIds = [];
    },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, "THREEWAY_RENDER_OWNERSHIP_INVALID");
  }
});

test("duplicate item IDs and invalid item categories are refused", () => {
  const duplicate = fixture();
  duplicate.solution.renderGeometry.items.push(
    structuredClone(item(duplicate, "horn-surface")),
  );
  assert.equal(
    renderModel.buildRenderModel(duplicate).code,
    "THREEWAY_RENDER_ITEM_DUPLICATE",
  );

  const unknown = fixture();
  item(unknown, "horn-surface").category = "cosmetic-solid";
  assert.equal(
    renderModel.buildRenderModel(unknown).code,
    "THREEWAY_RENDER_GEOMETRY_INVALID",
  );
});

test("materials, view maps, and transforms are explicit fail-closed records", () => {
  const cases = [
    [
      input => { delete item(input, "mount-mid").material; },
      "THREEWAY_RENDER_MATERIAL_INVALID",
    ],
    [
      input => {
        delete item(input, "mount-mid").visibility["section-cutaway"];
      },
      "THREEWAY_RENDER_VISIBILITY_INVALID",
    ],
    [
      input => {
        item(input, "mount-mid").visibility["unknown-view"] = true;
      },
      "THREEWAY_RENDER_VISIBILITY_INVALID",
    ],
    [
      input => { delete item(input, "mount-mid").transform.scale; },
      "THREEWAY_RENDER_TRANSFORM_INVALID",
    ],
    [
      input => {
        item(input, "mount-mid").transform.matrix4 =
          matrixTransform().matrix4;
      },
      "THREEWAY_RENDER_TRANSFORM_INVALID",
    ],
  ];
  for (const [mutate, code] of cases) {
    const input = fixture();
    mutate(input);
    assert.equal(renderModel.buildRenderModel(input).code, code);
  }
});

test("horn-only and no-driver view policies reject leaked assembly items", () => {
  const hornLeak = fixture();
  item(hornLeak, "driver-mid").visibility["horn-only"] = true;
  assert.equal(
    renderModel.buildRenderModel(hornLeak).code,
    "THREEWAY_RENDER_VISIBILITY_INVALID",
  );

  const driverLeak = fixture();
  item(driverLeak, "driver-mid")
    .visibility["no-drivers-mount-assembly"] = true;
  assert.equal(
    renderModel.buildRenderModel(driverLeak).code,
    "THREEWAY_RENDER_VISIBILITY_INVALID",
  );
});

test("every declared view requires its solution-owned anchor geometry", () => {
  const cases = [
    ["driver-mid", "full-assembly"],
    ["horn-surface", "horn-only"],
    ["mount-mid", "no-drivers-mount-assembly"],
    ["lumen-mid-a", "lumen-inspection"],
    ["section-plane-x", "section-cutaway"],
    ["package-envelope", "package-bounds"],
  ];
  for (const [itemId, viewId] of cases) {
    const input = fixture();
    item(input, itemId).visibility[viewId] = false;
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, "THREEWAY_RENDER_VIEW_INCOMPLETE");
    assert.equal(result.details.viewId, viewId);
  }
});

test("nonfinite, undefined, and executable values never disappear into DTOs", () => {
  const cases = [
    input => {
      item(input, "horn-surface").mesh.positionsM[0] = Infinity;
    },
    input => { item(input, "mount-mid").material.callback = () => 1; },
    input => {
      item(input, "mount-mid").primitive.parameters.note = undefined;
    },
    input => {
      input.solution.renderGeometry.coordinateSystem.scale = NaN;
    },
    input => { input.solution.diagnostics[0].callback = () => 1; },
    input => {
      item(input, "mount-mid").material.created = new Date();
    },
    input => {
      item(input, "mount-mid").primitive.parameters.loop =
        item(input, "mount-mid").primitive.parameters;
    },
  ];
  for (const mutate of cases) {
    const input = fixture();
    mutate(input);
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, "THREEWAY_RENDER_NONFINITE_VALUE");
    assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
  }
});

test("the projection is topology-neutral across every explicit three-way family", () => {
  for (const topologyId of ["T3", "CX3", "H3", "COMPOUND_RESEARCH"]) {
    const input = fixture();
    input.state.topology.kind = topologyId;
    input.solution.renderGeometry.topologyId = topologyId;
    for (const entry of input.solution.renderGeometry.items) {
      entry.ownership.topologyId = topologyId;
    }
    const result = renderModel.buildRenderModel(input);
    assert.equal(result.ok, true);
    assert.equal(result.dto.topologyId, topologyId);
  }
});

test("rendering and view selection can never authorize exact solid, manufacturing, or STL", () => {
  const result = renderModel.buildRenderModel(fixture());
  const selected = renderModel.selectView(result.dto, "full-assembly");
  for (const value of [result, result.dto, selected]) {
    assert.equal(value.exactSolid, false);
    assert.equal(value.manufacturing, false);
    assert.equal(value.stl, false);
  }
  const preflight = renderModel.manufacturingPreflight("stl");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.dto, null);
});

test("view selection rechecks DTO and per-item hash parity", () => {
  const result = renderModel.buildRenderModel(fixture());
  assert.equal(result.ok, true);

  const staleDto = structuredClone(result.dto);
  staleDto.renderHash = "stale-render";
  assert.equal(
    renderModel.selectView(staleDto, "full-assembly").code,
    "THREEWAY_RENDER_HASH_MISMATCH",
  );

  const staleItem = structuredClone(result.dto);
  staleItem.byItem["driver-mid"].solutionHash = "stale-item";
  assert.equal(
    renderModel.selectView(staleItem, "full-assembly").code,
    "THREEWAY_RENDER_MODEL_UNAVAILABLE",
  );
});

test("CommonJS and browser UMD expose a dependency-free pure render boundary", () => {
  assert.equal(typeof renderModel.buildRenderModel, "function");
  assert.equal(typeof renderModel.selectView, "function");

  const source = fs.readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /\brequire\s*\(/);
  assert.doesNotMatch(source, /\bTHREE\b|\bdocument\b|\bwindow\b/);
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  const browserApi = context.globalThis.MEH3RenderModel;
  assert.equal(typeof browserApi.buildRenderModel, "function");
  assert.deepEqual([...browserApi.viewIds], VIEW_IDS);

  const browserResult = browserApi.buildRenderModel(fixture());
  assert.equal(browserResult.ok, true);
  assert.equal(browserResult.dto.renderHash, "solution-hash-001");
});
