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
const modulePath = path.join(appRoot, "threeway-renderer.js");
const rendererModule = require(modulePath);
const renderModel = require(path.join(
  appRoot, "threeway-render-model.js"));
const VIEW_IDS = [
  "full-assembly",
  "horn-only",
  "no-drivers-mount-assembly",
  "mounts-preview",
  "lumen-inspection",
  "section-cutaway",
  "package-bounds",
];

function fakeRuntime() {
  const telemetry = {
    geometries: [],
    materials: [],
    groups: [],
    meshes: [],
    normalComputations: 0,
  };

  class ArrayTarget {
    constructor() {
      this.values = null;
    }
    fromArray(values) {
      this.values = [...values];
      return this;
    }
  }

  class Object3D {
    constructor() {
      this.name = "";
      this.children = [];
      this.parent = null;
      this.userData = {};
    }
    add(...nodes) {
      for (const node of nodes) {
        if (node.parent) node.parent.remove(node);
        node.parent = this;
        this.children.push(node);
      }
      return this;
    }
    remove(...nodes) {
      for (const node of nodes) {
        const index = this.children.indexOf(node);
        if (index >= 0) this.children.splice(index, 1);
        if (node.parent === this) node.parent = null;
      }
      return this;
    }
    clear() {
      for (const child of [...this.children]) this.remove(child);
      return this;
    }
  }

  class Group extends Object3D {
    constructor() {
      super();
      telemetry.groups.push(this);
    }
  }

  class Scene extends Group {}

  class Float32BufferAttribute {
    constructor(values, itemSize) {
      this.array = [...values];
      this.itemSize = itemSize;
      this.count = this.array.length / itemSize;
    }
  }

  class BufferGeometry {
    constructor() {
      this.attributes = {};
      this.index = null;
      this.disposed = false;
      telemetry.geometries.push(this);
    }
    setAttribute(name, attribute) {
      this.attributes[name] = attribute;
      return this;
    }
    setIndex(values) {
      this.index = {
        array: [...values],
        count: values.length,
      };
      return this;
    }
    computeVertexNormals() {
      telemetry.normalComputations++;
    }
    dispose() {
      this.disposed = true;
    }
  }

  class BoxGeometry extends BufferGeometry {
    constructor(width, height, depth) {
      super();
      this.kind = "box";
      this.dimensions = [width, height, depth];
      this.setAttribute(
        "position",
        new Float32BufferAttribute(new Array(24 * 3).fill(0), 3),
      );
      this.setIndex(new Array(36).fill(0));
    }
  }

  class PlaneGeometry extends BufferGeometry {
    constructor(width, height) {
      super();
      this.kind = "plane";
      this.dimensions = [width, height];
      this.setAttribute(
        "position",
        new Float32BufferAttribute(new Array(4 * 3).fill(0), 3),
      );
      this.setIndex(new Array(6).fill(0));
    }
  }

  class Material {
    constructor(parameters) {
      this.parameters = structuredClone(parameters);
      this.userData = {};
      this.disposed = false;
      telemetry.materials.push(this);
    }
    dispose() {
      this.disposed = true;
    }
  }

  class MeshBasicMaterial extends Material {}
  class MeshStandardMaterial extends Material {}
  class MeshPhongMaterial extends Material {}
  class MeshLambertMaterial extends Material {}
  class MeshNormalMaterial extends Material {}

  class Mesh extends Object3D {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.position = new ArrayTarget();
      this.quaternion = new ArrayTarget();
      this.scale = new ArrayTarget();
      this.matrix = new ArrayTarget();
      this.matrixAutoUpdate = true;
      telemetry.meshes.push(this);
    }
  }

  const THREE = {
    BufferGeometry,
    Float32BufferAttribute,
    BoxGeometry,
    PlaneGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    MeshPhongMaterial,
    MeshLambertMaterial,
    MeshNormalMaterial,
    Mesh,
  };
  const scene = new Scene();
  const groupFactory = () => new Group();
  return {
    THREE,
    scene,
    groupFactory,
    telemetry,
    classes: { Group, Scene, Mesh },
  };
}

function ownership(sourceIds = [], bandIds = [], stationIds = []) {
  return {
    topologyId: "T3",
    bandIds,
    sourceIds,
    stationIds,
  };
}

function material(id, kind = "mesh-basic") {
  return {
    id,
    category: "analysis-preview",
    kind,
    parameters: {
      color: "#cad2d6",
      opacity: 0.75,
      transparent: true,
    },
  };
}

function meshItem(id, viewId = "full-assembly") {
  return {
    id,
    category: "horn-surface",
    solutionHash: "solution-hash-a",
    ownership: ownership(),
    material: material(`material-${id}`),
    visibility: { [viewId]: true },
    transform: {
      matrix4: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0.123456789, -0.2, 0.3, 1,
      ],
    },
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
  };
}

function primitiveItem(id, viewId = "full-assembly", kind = "box") {
  return {
    id,
    category: "mount-host",
    solutionHash: "solution-hash-a",
    ownership: ownership(
      ["source-mid"], ["mid"], ["station-mid"],
    ),
    material: material(`material-${id}`, "mesh-standard"),
    visibility: { [viewId]: true },
    transform: {
      positionM: [0.0123456789, -0.04, 0.07],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    primitive: {
      kind,
      parameters: {
        dimensionsM: kind === "plane"
          ? [0.222222222, 0.333333333]
          : [0.111111111, 0.222222222, 0.333333333],
      },
    },
  };
}

function selection(viewId = "full-assembly") {
  const items = viewId === "full-assembly"
    ? [
      meshItem("a-horn", viewId),
      primitiveItem("b-mount", viewId),
    ]
    : [meshItem("a-horn", viewId)];
  return {
    ok: true,
    viewId,
    inputHash: "state-hash-a",
    solutionHash: "solution-hash-a",
    renderHash: "solution-hash-a",
    items,
    exactSolid: false,
    manufacturing: false,
    stl: false,
  };
}

function allVisibility(...enabled) {
  return Object.fromEntries(VIEW_IDS.map(id => [
    id, enabled.includes(id),
  ]));
}

function renderModelInput() {
  const horn = meshItem("a-horn");
  horn.visibility = allVisibility(
    "full-assembly",
    "horn-only",
    "no-drivers-mount-assembly",
    "mounts-preview",
  );

  const driver = primitiveItem("b-driver");
  driver.category = "driver";
  driver.ownership = ownership(["source-mid"], ["mid"]);
  driver.visibility = allVisibility("full-assembly");

  const mount = primitiveItem("c-mount");
  mount.visibility = allVisibility(
    "full-assembly",
    "no-drivers-mount-assembly",
    "mounts-preview",
  );

  const lumen = meshItem("d-lumen");
  lumen.category = "lumen-inspection";
  lumen.ownership = ownership(
    ["source-mid"], ["mid"], ["station-mid"],
  );
  lumen.visibility = allVisibility("lumen-inspection");

  const section = primitiveItem(
    "e-section", "section-cutaway", "plane");
  section.category = "section-plane";
  section.ownership = ownership();
  section.visibility = allVisibility("section-cutaway");

  const bounds = primitiveItem(
    "f-bounds", "package-bounds", "bounds");
  bounds.category = "package-bounds";
  bounds.ownership = ownership();
  bounds.visibility = allVisibility("package-bounds");

  return {
    stateHash: "state-hash-a",
    state: {
      schemaVersion: 2,
      designId: "renderer-integration",
      revision: 1,
      topology: { kind: "T3", schemaVersion: 1 },
      sources: [
        { id: "source-mid", bandIds: ["mid"] },
      ],
      entryStations: [
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
      inputHash: "state-hash-a",
      solutionHash: "solution-hash-a",
      readiness: { analysis: true },
      diagnostics: [],
      renderGeometry: {
        schemaVersion: 1,
        topologyId: "T3",
        inputHash: "state-hash-a",
        solutionHash: "solution-hash-a",
        provider: "renderer-test",
        items: [horn, driver, mount, lumen, section, bounds],
      },
    },
  };
}

function create(runtime = fakeRuntime(), limits) {
  const adapter = rendererModule.createRenderer({
    THREE: runtime.THREE,
    scene: runtime.scene,
    groupFactory: runtime.groupFactory,
    ...(limits ? { limits } : {}),
  });
  assert.equal(adapter.ok, true);
  return { runtime, adapter };
}

function resources(group) {
  return group.children.map(node => ({
    geometry: node.geometry,
    material: node.material,
  }));
}

test("factory requires only injected THREE, scene, and detached group factory", () => {
  const runtime = fakeRuntime();
  assert.equal(
    rendererModule.createRenderer({}).code,
    "THREEWAY_RENDERER_OPTIONS_INVALID",
  );
  assert.equal(
    rendererModule.createRenderer({
      THREE: {},
      scene: runtime.scene,
      groupFactory: runtime.groupFactory,
    }).code,
    "THREEWAY_RENDERER_THREE_UNAVAILABLE",
  );
  assert.equal(
    rendererModule.createRenderer({
      THREE: runtime.THREE,
      groupFactory: runtime.groupFactory,
    }).code,
    "THREEWAY_RENDERER_OPTIONS_INVALID",
  );

  const viaFactory = rendererModule.createRenderer({
    THREE: runtime.THREE,
    sceneFactory: () => runtime.scene,
    groupFactory: runtime.groupFactory,
  });
  assert.equal(viaFactory.ok, true);
});

test("validated view creates one dedicated hash-keyed group and exact supplied nodes", () => {
  const { runtime, adapter } = create();
  const input = selection();
  const before = structuredClone(input);
  const result = adapter.renderView(input, input.renderHash);

  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.nodeCount, 2);
  assert.equal(runtime.scene.children.length, 1);
  assert.equal(result.group, runtime.scene.children[0]);
  assert.equal(
    result.group.name,
    "MEH3_RENDER_solution-hash-a_full-assembly",
  );
  assert.equal(result.group.userData.renderHash, "solution-hash-a");
  assert.equal(result.group.userData.meh3.exactSolid, false);
  assert.deepEqual(
    result.group.children.map(node => node.name),
    ["MEH3_ITEM_a-horn", "MEH3_ITEM_b-mount"],
  );

  const horn = result.group.children[0];
  assert.deepEqual(
    horn.geometry.attributes.position.array,
    input.items[0].mesh.positionsM,
  );
  assert.deepEqual(
    horn.geometry.attributes.normal.array,
    input.items[0].mesh.normals,
  );
  assert.deepEqual(horn.geometry.index.array, input.items[0].mesh.indices);
  assert.deepEqual(
    horn.matrix.values,
    input.items[0].transform.matrix4,
  );
  assert.equal(horn.matrixAutoUpdate, false);
  assert.deepEqual(
    horn.material.parameters,
    input.items[0].material.parameters,
  );
  assert.deepEqual(
    horn.userData.meh3.ownership,
    input.items[0].ownership,
  );
  assert.equal(horn.userData.meh3.solutionHash, "solution-hash-a");

  const mount = result.group.children[1];
  assert.deepEqual(
    mount.geometry.dimensions,
    input.items[1].primitive.parameters.dimensionsM,
  );
  assert.deepEqual(
    mount.position.values,
    input.items[1].transform.positionM,
  );
  assert.deepEqual(
    mount.quaternion.values,
    input.items[1].transform.quaternion,
  );
  assert.deepEqual(mount.scale.values, input.items[1].transform.scale);
  assert.equal(runtime.telemetry.normalComputations, 0);
});

test("adapter consumes the render-model view selection without state or geometry fallback", () => {
  const modeled = renderModel.buildRenderModel(renderModelInput());
  assert.equal(modeled.ok, true);
  const selected = renderModel.selectView(modeled, "full-assembly");
  assert.equal(selected.ok, true);

  const { runtime, adapter } = create();
  const rendered = adapter.renderView(
    selected, selected.renderHash);
  assert.equal(rendered.ok, true);
  assert.deepEqual(
    rendered.group.children.map(node => node.userData.meh3.id),
    selected.items.map(item => item.id),
  );
  assert.equal(runtime.scene.children.length, 1);
});

test("mesh without supplied normals stays without normals; none are generated", () => {
  const { runtime, adapter } = create();
  const input = selection("horn-only");
  delete input.items[0].mesh.normals;
  const result = adapter.renderView(input, input.renderHash);
  assert.equal(result.ok, true);
  assert.equal(
    result.group.children[0].geometry.attributes.normal,
    undefined,
  );
  assert.equal(runtime.telemetry.normalComputations, 0);
});

test("same-hash view switch removes and disposes every stale resource", () => {
  const { runtime, adapter } = create();
  const first = adapter.renderView(selection(), "solution-hash-a");
  const oldGroup = first.group;
  const oldResources = resources(oldGroup);

  const next = selection("horn-only");
  const second = adapter.switchView(next, "solution-hash-a");
  assert.equal(second.ok, true);
  assert.notEqual(second.group, oldGroup);
  assert.equal(runtime.scene.children.length, 1);
  assert.equal(runtime.scene.children[0], second.group);
  assert.equal(oldGroup.parent, null);
  assert.equal(oldGroup.children.length, 0);
  assert.ok(oldResources.every(record =>
    record.geometry.disposed && record.material.disposed));
  assert.deepEqual(second.replaced, {
    renderHash: "solution-hash-a",
    viewId: "full-assembly",
    nodeCount: 2,
  });
  assert.deepEqual(adapter.getState().active, {
    renderHash: "solution-hash-a",
    solutionHash: "solution-hash-a",
    viewId: "horn-only",
    nodeCount: 1,
  });
});

test("a new solved hash replaces rather than mixes groups or nodes", () => {
  const { runtime, adapter } = create();
  const first = adapter.renderView(selection(), "solution-hash-a");
  const previous = resources(first.group);
  const next = selection("horn-only");
  next.inputHash = "state-hash-b";
  next.solutionHash = "solution-hash-b";
  next.renderHash = "solution-hash-b";
  for (const entry of next.items) entry.solutionHash = "solution-hash-b";

  const result = adapter.renderView(next, "solution-hash-b");
  assert.equal(result.ok, true);
  assert.equal(result.renderHash, "solution-hash-b");
  assert.equal(runtime.scene.children.length, 1);
  assert.equal(
    runtime.scene.children[0].userData.renderHash,
    "solution-hash-b",
  );
  assert.ok(previous.every(record =>
    record.geometry.disposed && record.material.disposed));
});

test("caller-expected, solution, render, and item hash mismatches are transactional refusals", () => {
  const { runtime, adapter } = create();
  const active = adapter.renderView(selection(), "solution-hash-a");
  const group = active.group;
  const liveResources = resources(group);
  const cases = [
    [selection("horn-only"), "stale-expected"],
    [
      (() => {
        const value = selection("horn-only");
        value.renderHash = "stale-render";
        return value;
      })(),
      "solution-hash-a",
    ],
    [
      (() => {
        const value = selection("horn-only");
        value.items[0].solutionHash = "stale-item";
        return value;
      })(),
      "solution-hash-a",
    ],
  ];
  for (const [value, expected] of cases) {
    const result = adapter.renderView(value, expected);
    assert.equal(result.ok, false);
    assert.ok([
      "THREEWAY_RENDERER_HASH_MISMATCH",
      "THREEWAY_RENDERER_SELECTION_INVALID",
    ].includes(result.code));
    assert.equal(runtime.scene.children.length, 1);
    assert.equal(runtime.scene.children[0], group);
    assert.ok(liveResources.every(record =>
      !record.geometry.disposed && !record.material.disposed));
  }
});

test("unsupported primitives, materials, and ambiguous geometry fail before replacement", () => {
  const { runtime, adapter } = create();
  const active = adapter.renderView(selection(), "solution-hash-a");
  const group = active.group;
  const cases = [
    [
      value => {
        value.items[0].mesh = undefined;
        value.items[0].primitive = {
          kind: "sphere",
          parameters: { radiusM: 1 },
        };
      },
      "THREEWAY_RENDERER_UNSUPPORTED_GEOMETRY",
    ],
    [
      value => {
        value.items[0].material.kind = "invented-material";
      },
      "THREEWAY_RENDERER_UNSUPPORTED_MATERIAL",
    ],
    [
      value => {
        value.items[0].primitive = {
          kind: "box",
          parameters: { dimensionsM: [1, 1, 1] },
        };
      },
      "THREEWAY_RENDERER_UNSUPPORTED_GEOMETRY",
    ],
    [
      value => {
        value.items[0].mesh.normalsM =
          [...value.items[0].mesh.normals];
      },
      "THREEWAY_RENDERER_UNSUPPORTED_GEOMETRY",
    ],
  ];
  for (const [mutate, code] of cases) {
    const value = selection("horn-only");
    mutate(value);
    const result = adapter.renderView(value, "solution-hash-a");
    assert.equal(result.code, code);
    assert.equal(runtime.scene.children[0], group);
  }
});

test("resource ceilings refuse node, vertex, index, byte, and metadata excess", () => {
  const cases = [
    [{ maxNodes: 1 }, "maxNodes"],
    [{ maxVertices: 2 }, "maxVertices"],
    [{ maxIndices: 2 }, "maxIndices"],
    [{ maxUploadBytes: 4 }, "maxUploadBytes"],
    [{ maxMetadataBytes: 4 }, "maxMetadataBytes"],
  ];
  for (const [limits, exceeded] of cases) {
    const runtime = fakeRuntime();
    const { adapter } = create(runtime, limits);
    const groupsBefore = runtime.telemetry.groups.length;
    const result = adapter.renderView(
      selection("horn-only"), "solution-hash-a",
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "THREEWAY_RENDERER_RESOURCE_LIMIT");
    assert.ok(result.details.exceeded.includes(exceeded));
    assert.equal(runtime.scene.children.length, 0);
    assert.equal(runtime.telemetry.groups.length, groupsBefore);
  }
});

test("invalid transforms, ownership, visibility, order, and duplicates fail closed", () => {
  const mutations = [
    value => {
      value.items[0].transform.positionM = [0, 0, 0];
    },
    value => {
      value.items[0].ownership.sourceIds = ["duplicate", "duplicate"];
    },
    value => {
      value.items[0].visibility["full-assembly"] = false;
    },
    value => {
      value.items.reverse();
    },
    value => {
      value.items[1].id = value.items[0].id;
    },
  ];
  for (const mutate of mutations) {
    const { adapter } = create();
    const value = selection();
    mutate(value);
    const result = adapter.renderView(value, "solution-hash-a");
    assert.equal(result.ok, false);
    assert.ok([
      "THREEWAY_RENDERER_TRANSFORM_INVALID",
      "THREEWAY_RENDERER_OWNERSHIP_INVALID",
      "THREEWAY_RENDERER_SELECTION_INVALID",
    ].includes(result.code));
  }
});

test("invalid or failing factories never leave partial groups or resources", () => {
  const invalid = fakeRuntime();
  invalid.groupFactory = () => {
    const group = new invalid.classes.Group();
    group.add(new invalid.classes.Group());
    return group;
  };
  const invalidAdapter = rendererModule.createRenderer({
    THREE: invalid.THREE,
    scene: invalid.scene,
    groupFactory: invalid.groupFactory,
  });
  assert.equal(
    invalidAdapter.renderView(
      selection("horn-only"), "solution-hash-a",
    ).code,
    "THREEWAY_RENDERER_GROUP_INVALID",
  );
  assert.equal(invalid.scene.children.length, 0);

  const throwing = fakeRuntime();
  throwing.THREE.MeshBasicMaterial = class {
    constructor() {
      throw new Error("fixture material failure");
    }
  };
  const throwingAdapter = rendererModule.createRenderer({
    THREE: throwing.THREE,
    scene: throwing.scene,
    groupFactory: throwing.groupFactory,
  });
  const failed = throwingAdapter.renderView(
    selection("horn-only"), "solution-hash-a",
  );
  assert.equal(failed.code, "THREEWAY_RENDERER_BUILD_FAILED");
  assert.equal(throwing.scene.children.length, 0);
  assert.ok(throwing.telemetry.geometries.every(entry => entry.disposed));
});

test("dispose is complete, idempotent, and permanently closes the adapter", () => {
  const { runtime, adapter } = create();
  const rendered = adapter.renderView(selection(), "solution-hash-a");
  const allocated = resources(rendered.group);
  const first = adapter.dispose();

  assert.equal(first.ok, true);
  assert.equal(first.disposed, true);
  assert.equal(first.alreadyDisposed, false);
  assert.equal(first.resources.geometriesDisposed, 2);
  assert.equal(first.resources.materialsDisposed, 2);
  assert.equal(runtime.scene.children.length, 0);
  assert.ok(allocated.every(record =>
    record.geometry.disposed && record.material.disposed));
  assert.equal(adapter.getActiveGroup(), null);
  assert.equal(adapter.getState().disposed, true);

  const second = adapter.dispose();
  assert.equal(second.alreadyDisposed, true);
  assert.equal(second.resources.geometriesDisposed, 0);
  assert.equal(
    adapter.renderView(selection(), "solution-hash-a").code,
    "THREEWAY_RENDERER_DISPOSED",
  );
});

test("plane and bounds primitives use only their exact supplied dimensions", () => {
  const { adapter } = create();
  const input = selection();
  input.items = [
    primitiveItem("a-bounds", "full-assembly", "bounds"),
    primitiveItem("b-plane", "full-assembly", "plane"),
  ];
  const result = adapter.renderView(input, "solution-hash-a");
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.group.children[0].geometry.dimensions,
    input.items[0].primitive.parameters.dimensionsM,
  );
  assert.deepEqual(
    result.group.children[1].geometry.dimensions,
    input.items[1].primitive.parameters.dimensionsM,
  );
});

test("renderer and module-level manufacturing preflights always refuse", () => {
  const { adapter } = create();
  for (const result of [
    adapter.manufacturingPreflight("stl"),
    rendererModule.manufacturingPreflight("exact-solid"),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
    assert.equal(result.exactSolid, false);
    assert.equal(result.manufacturing, false);
    assert.equal(result.stl, false);
  }
});

test("CommonJS/browser UMD stays free of state, DOM, storage, camera, and animation dependencies", () => {
  const source = fs.readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /\brequire\s*\(/);
  assert.doesNotMatch(source, /\bdocument\s*\.|\bwindow\s*\./);
  assert.doesNotMatch(source, /\blocalStorage\s*[.\[]/);
  assert.doesNotMatch(source, /\brequestAnimationFrame\s*\(/);
  assert.doesNotMatch(source, /\bPerspectiveCamera\b|\bOrthographicCamera\b/);
  assert.doesNotMatch(source, /\bMEH2\b|\bmeh5_threeway_state\b/);

  const context = { globalThis: {}, Float32Array };
  vm.runInNewContext(source, context);
  const browserApi = context.globalThis.MEH3Renderer;
  assert.equal(typeof browserApi.createRenderer, "function");
  assert.deepEqual(
    [...browserApi.allowedPrimitives],
    ["box", "bounds", "plane"],
  );

  const runtime = fakeRuntime();
  const adapter = browserApi.createRenderer({
    THREE: runtime.THREE,
    scene: runtime.scene,
    groupFactory: runtime.groupFactory,
  });
  const result = adapter.renderView(
    selection("horn-only"), "solution-hash-a",
  );
  assert.equal(result.ok, true);
  assert.equal(runtime.scene.children.length, 1);
});
