import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const ui = require(path.join(appRoot, "threeway-ui.js"));
const controller = require(path.join(appRoot, "threeway-controller.js"));
const solver = require(path.join(appRoot, "threeway-solver.js"));

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  add(value) {
    this.values.add(value);
  }
  remove(value) {
    this.values.delete(value);
  }
  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(documentRef, tagName, id = null) {
    this.ownerDocument = documentRef;
    this.tagName = String(tagName || "div").toUpperCase();
    this.id = id;
    this.parentNode = null;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.className = "";
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.title = "";
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
    if (id) documentRef.register(this);
  }
  get options() {
    return this.children.filter(child => child.tagName === "OPTION");
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    return index >= 0 ? this.parentNode.children[index + 1] || null : null;
  }
  get textContent() {
    return this._textContent;
  }
  set textContent(value) {
    this._textContent = String(value == null ? "" : value);
  }
  get innerHTML() {
    if (this.tagName === "SELECT" && this.children.length) {
      return this.options.map(option =>
        `<option value="${option.value}">${option.textContent}</option>`
      ).join("");
    }
    return this._innerHTML;
  }
  set innerHTML(value) {
    this._innerHTML = String(value || "");
    this.children = [];
    if (this.tagName === "SELECT") {
      const optionPattern =
        /<option(?:\s+value="([^"]*)")?[^>]*>([^<]*)<\/option>/g;
      let optionMatch;
      while ((optionMatch = optionPattern.exec(this._innerHTML))) {
        const option = this.ownerDocument.createElement("option");
        option.value = optionMatch[1] || "";
        option.textContent = optionMatch[2] || "";
        this.appendChild(option);
      }
      if (this.options.length) this.value = this.options[0].value;
      return;
    }
    const elementPattern =
      /<(select|textarea|button|div|details|input|span)\b([^>]*)\bid="([^"]+)"([^>]*)>/g;
    let match;
    while ((match = elementPattern.exec(this._innerHTML))) {
      const node = new FakeElement(
        this.ownerDocument,
        match[1],
        match[3],
      );
      const attributes = `${match[2]} ${match[4]}`;
      node.disabled = /\bdisabled\b/.test(attributes);
      const valueMatch = /\bvalue="([^"]*)"/.exec(attributes);
      if (valueMatch) node.value = valueMatch[1];
      const typeMatch = /\btype="([^"]*)"/.exec(attributes);
      if (typeMatch) node.type = typeMatch[1];
      this.appendChild(node);
      if (node.id === "threewayInputMode") {
        node.innerHTML = [
          '<option value="quick-start">quick</option>',
          '<option value="preset-evidence">preset</option>',
          '<option value="canonical-analysis">direct</option>',
        ].join("");
      } else if (node.id === "threewayProfileFamily") {
        node.innerHTML = [
          '<option value="conical">conical</option>',
          '<option value="classicOS">classicOS</option>',
          '<option value="osse">osse</option>',
        ].join("");
      } else if (node.id === "threewaySectionFamily") {
        node.innerHTML = [
          '<option value="ellipse">ellipse</option>',
          '<option value="superellipse">superellipse</option>',
        ].join("");
      }
    }
  }
  appendChild(child) {
    if (child.parentNode) child.remove();
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  insertBefore(child, reference) {
    if (child.parentNode) child.remove();
    child.parentNode = this;
    const index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }
  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    for (const child of children) this.appendChild(child);
  }
  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatchEvent(event) {
    const value = event || {};
    value.target = value.target || this;
    for (const listener of this.listeners.get(value.type) || []) {
      listener.call(this, value);
    }
    const property = this[`on${value.type}`];
    if (typeof property === "function") property.call(this, value);
    return true;
  }
  click() {
    if (!this.disabled) this.dispatchEvent({ type: "click", target: this });
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    this.body = new FakeElement(this, "body", "body");
    this.defaultView = null;
  }
  register(node) {
    this.nodes.set(node.id, node);
  }
  createElement(tagName) {
    return new FakeElement(this, tagName);
  }
  getElementById(id) {
    return this.nodes.get(id) || null;
  }
  make(tagName, id, parent = this.body) {
    const node = new FakeElement(this, tagName, id);
    if (parent) parent.appendChild(node);
    return node;
  }
}

function domFixture() {
  const documentRef = new FakeDocument();
  const aside = documentRef.make("aside", "aside");
  documentRef.make("div", "topologySect", aside);
  documentRef.make("div", "segTopo", aside);
  const view = documentRef.make("select", "viewSel");
  view.innerHTML = [
    '<option value="full">VIEW: FULL ASSEMBLY</option>',
    '<option value="horn">VIEW: HORN ONLY</option>',
  ].join("");
  view.value = "full";
  for (const [id, label] of [
    ["bExact", "GENERATE EXACT MESH"],
    ["bStl", "EXPORT STL"],
    ["bHrn", "HORNRESP"],
  ]) {
    const button = documentRef.make("button", id);
    button.textContent = label;
  }
  documentRef.make("div", "fabBadge").textContent = "LEGACY BADGE";
  documentRef.make("div", "rows");
  documentRef.make("div", "note");
  return documentRef;
}

function driverRecord({
  id,
  bandIds,
  kind,
  diameterM,
  areaM2,
  outputKind,
}) {
  return {
    schemaVersion: 1,
    id,
    revision: 1,
    kind,
    bandIds,
    frame: {
      shape: "round",
      diameterM: diameterM + 0.02,
      depthM: 0.08,
      frontProjectionM: 0.002,
    },
    diaphragm: {
      effectiveAreaM2: areaM2,
      activeDiameterM: diameterM,
      provenanceRefs: ["ui-h3-explicit-driver"],
    },
    outputs: [
      {
        id: `${id}-output`,
        bandIds,
        kind: outputKind,
        geometry: {
          shape: "round",
          diameterM,
          areaM2,
        },
        acousticDatum: {
          kind: "manufacturer-reference-plane",
          offsetM: 0.02,
        },
        provenanceRefs: ["ui-h3-explicit-driver"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["ui-h3-explicit-driver"],
    },
    provenanceRefs: ["ui-h3-explicit-driver"],
  };
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

function h3Evidence({ preview = false } = {}) {
  const driverRecords = [
    driverRecord({
      id: "driver-low-ui",
      bandIds: ["low"],
      kind: "cone",
      diameterM: 0.2,
      areaM2: 0.02,
      outputKind: "front-diaphragm",
    }),
    driverRecord({
      id: "driver-mid-ui",
      bandIds: ["mid"],
      kind: "cone",
      diameterM: 0.11,
      areaM2: 0.0095,
      outputKind: "front-diaphragm",
    }),
    driverRecord({
      id: "driver-high-ui",
      bandIds: ["high"],
      kind: "compression",
      diameterM: 0.04,
      areaM2: Math.PI * 0.02 ** 2,
      outputKind: "compression-throat",
    }),
  ];
  const analysisOverrides = {
    horn: {
      schemaVersion: 2,
      throat: { widthM: 0.04, heightM: 0.04 },
      mouth: { widthM: 0.4, heightM: 0.4 },
      depthM: 0.18,
      coverageDeg: { horizontal: 90, vertical: 90 },
      surfaceLaw: {
        family: "conical",
        parameters: { nominalHalfAngle: Math.PI / 4 },
      },
      crossSection: { family: "ellipse", parameters: {} },
      azimuthRad: 0,
      sampling: {
        axialStationCount: 33,
        perimeterSampleCount: 256,
      },
      provenanceRefs: ["ui-h3-explicit-horn"],
    },
    package: {
      packageLimitM: { depthM: 1, widthM: 1, heightM: 1 },
      globalMarginM: 0,
      componentClearanceM: 0,
      additionalComponents: [],
    },
  };
  if (preview) {
    analysisOverrides.render = {
      renderIntents: {
        throatInterfaces: [
          {
            interfaceId: "interface-shared-mid-high",
            transform: matrix(),
            primitive: {
              kind: "plane",
              parameters: { dimensionsM: [0.04, 0.04] },
            },
          },
        ],
        stationMarkers: [],
        sectionPlane: {
          id: "axial-center",
          transform: matrix(0.09, 0, 0),
          primitive: {
            kind: "plane",
            parameters: { dimensionsM: [0.18, 0.4] },
          },
        },
      },
      azimuthSegments: 16,
    };
  }
  return {
    driverRecords,
    sourceDriverRefs: {
      "source-low-external": "driver-low-ui",
      "source-mid": "driver-mid-ui",
      "source-high": "driver-high-ui",
    },
    analysisOverrides,
    requirePreview: preview,
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function fakeSceneRuntime() {
  const telemetry = {
    groups: [],
    geometries: [],
    materials: [],
    renders: [],
  };
  class ArrayTarget {
    fromArray(values) {
      this.values = [...values];
      return this;
    }
  }
  class Object3D {
    constructor() {
      this.children = [];
      this.parent = null;
      this.userData = {};
      this.name = "";
    }
    add(...nodes) {
      for (const node of nodes) {
        if (node.parent) node.parent.remove(node);
        node.parent = this;
        this.children.push(node);
      }
    }
    remove(...nodes) {
      for (const node of nodes) {
        const index = this.children.indexOf(node);
        if (index >= 0) this.children.splice(index, 1);
        if (node.parent === this) node.parent = null;
      }
    }
    clear() {
      this.remove(...this.children);
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
      this.disposed = false;
      telemetry.geometries.push(this);
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
      return this;
    }
    setIndex(values) {
      this.index = { array: [...values], count: values.length };
      return this;
    }
    dispose() {
      this.disposed = true;
    }
  }
  class BoxGeometry extends BufferGeometry {
    constructor(width, height, depth) {
      super();
      this.dimensions = [width, height, depth];
    }
  }
  class PlaneGeometry extends BufferGeometry {
    constructor(width, height) {
      super();
      this.dimensions = [width, height];
    }
  }
  class Material {
    constructor(parameters) {
      this.parameters = structuredClone(parameters);
      this.disposed = false;
      telemetry.materials.push(this);
    }
    dispose() {
      this.disposed = true;
    }
  }
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
    }
  }
  const THREE = {
    BufferGeometry,
    Float32BufferAttribute,
    BoxGeometry,
    PlaneGeometry,
    MeshBasicMaterial: Material,
    MeshStandardMaterial: Material,
    MeshPhongMaterial: Material,
    MeshLambertMaterial: Material,
    MeshNormalMaterial: Material,
    Mesh,
  };
  const scene = new Scene();
  return {
    THREE,
    scene,
    groupFactory: () => new Group(),
    telemetry,
  };
}

test("first activation solves and renders the calculated T3 study without JSON", async () => {
  const documentRef = domFixture();
  const storage = memoryStorage();
  const graphics = fakeSceneRuntime();
  const legacyViewHandler = () => {};
  documentRef.getElementById("viewSel").onchange = legacyViewHandler;
  const runtime = ui.createRuntime(
    {
      document: documentRef,
      storage,
      build: 654,
      THREE: graphics.THREE,
      scene: graphics.scene,
      groupFactory: graphics.groupFactory,
      onRender(rendered, selection) {
        graphics.telemetry.renders.push({
          rendered,
          viewId: selection.viewId,
        });
      },
    },
    { controller: controller.createController({ solver }) },
  );
  assert.equal(runtime.ok, true);
  const activated = runtime.activate();
  assert.equal(activated.ok, true);
  assert.equal(activated.autoSolveScheduled, true);
  assert.equal(
    documentRef.getElementById("threewayInputMode").value,
    "quick-start",
  );
  assert.equal(
    documentRef.getElementById("threewayQuickStartSel").value,
    "t3-calculated-111",
  );
  for (const band of ["Low", "Mid", "High"]) {
    const selector = documentRef.getElementById(`threewayDriver${band}`);
    const status = documentRef.getElementById(
      `threewayDriver${band}Status`,
    );
    assert.equal(selector.disabled, true);
    assert.equal(selector.options.length, 1);
    assert.match(selector.value, new RegExp(`driver-${band.toLowerCase()}-`));
    assert.match(status.textContent, /COMPATIBLE \/ FAMILY-BOUND/);
  }
  assert.equal(
    documentRef.getElementById("threewayInputDetails").open,
    undefined,
  );

  const solved = await runtime.whenIdle();
  assert.equal(
    solved.ok,
    true,
    JSON.stringify(solved.details || solved, null, 2),
  );
  assert.equal(solved.rendered, true);
  assert.equal(solved.result.readiness.preview, true);
  assert.equal(solved.result.solution.topology.kind, "T3");
  assert.equal(solved.result.solution.entryStations.length, 2);
  assert.equal(solved.result.solution.apertureLayouts.length, 8);
  assert.equal(solved.result.solution.passages.length, 16);
  assert.equal(solved.result.solution.mounts.length, 8);
  assert.equal(graphics.scene.children.length, 1);
  assert.equal(
    graphics.scene.children[0].userData.meh3.viewId,
    "full-assembly",
  );
  assert.equal(graphics.telemetry.renders.at(-1).viewId, "full-assembly");
  assert.equal(
    documentRef.getElementById("threewayDownloadReport").disabled,
    false,
  );
  assert.deepEqual([...storage.values.keys()], ["meh5_threeway_state_v2"]);

  const firstGroup = graphics.scene.children[0];
  const firstGeometries = firstGroup.children.map(child => child.geometry);
  const view = documentRef.getElementById("viewSel");
  view.value = "mounts-preview";
  view.dispatchEvent({ type: "change", target: view });
  assert.equal(runtime.getState().selectedViewId, "mounts-preview");
  assert.match(
    documentRef.getElementById("threewayViewNote").textContent,
    /DRIVER MOUNTS \+ TAP BINDINGS/,
  );
  assert.equal(
    graphics.scene.children[0].children.some(child =>
      child.userData.meh3.category === "driver"
    ),
    false,
  );
  assert.equal(
    graphics.scene.children[0].children.some(child =>
      child.userData.meh3.category === "mount-host"
    ),
    true,
  );
  view.value = "package-bounds";
  view.dispatchEvent({ type: "change", target: view });
  assert.equal(runtime.getState().selectedViewId, "package-bounds");
  assert.equal(graphics.scene.children.length, 1);
  assert.notEqual(graphics.scene.children[0], firstGroup);
  assert.equal(firstGroup.parent, null);
  assert.equal(firstGeometries.every(item => item.disposed), true);
  assert.equal(
    graphics.scene.children[0].userData.meh3.viewId,
    "package-bounds",
  );

  const width = documentRef.getElementById("threewayMouthWidthRange");
  width.value = "700";
  width.dispatchEvent({ type: "input", target: width });
  const resized = await runtime.whenIdle();
  assert.equal(resized.ok, true);
  assert.equal(resized.rendered, true);
  assert.equal(
    runtime.getState().controllerState.candidate.state.horn.mouth.widthM,
    0.7,
  );
  assert.equal(graphics.scene.children.length, 1);

  runtime.deactivate();
  assert.equal(graphics.scene.children.length, 0);
  assert.equal(documentRef.getElementById("viewSel").onchange, legacyViewHandler);
});

test("primary family selector keeps documented presets reference-only", async () => {
  const documentRef = domFixture();
  const graphics = fakeSceneRuntime();
  const runtime = ui.createRuntime(
    {
      document: documentRef,
      storage: memoryStorage(),
      build: 654,
      THREE: graphics.THREE,
      scene: graphics.scene,
      groupFactory: graphics.groupFactory,
      onRender(rendered, selection) {
        graphics.telemetry.renders.push({
          rendered,
          viewId: selection.viewId,
        });
      },
    },
    { controller: controller.createController({ solver }) },
  );
  assert.equal(runtime.activate().ok, true);
  assert.equal((await runtime.whenIdle()).ok, true);
  assert.equal(graphics.scene.children.length, 1);
  const renderedCount = graphics.telemetry.renders.length;
  const selector = documentRef.getElementById("threewayQuickStartSel");
  assert.deepEqual(
    selector.options.map(option => option.value),
    [
      "t3-calculated-111",
      "cosyne-t3-archived-144",
      "sh50-official-142",
      "hinson-cx3-documented",
      "jmod-cx3-documented",
      "u15-h3-envelope",
    ],
  );

  selector.value = "cosyne-t3-archived-144";
  selector.dispatchEvent({ type: "change", target: selector });
  let state = runtime.getState();
  assert.equal(state.selectedFamilyPresetId, "cosyne-t3-archived-144");
  assert.equal(state.selectedQuickStartId, null);
  assert.equal(state.selectedCardId, "cosyne-t3-documented-topology");
  assert.equal(
    documentRef.getElementById("threewayInputMode").value,
    "preset-evidence",
  );
  assert.equal(documentRef.getElementById("threewaySolve").disabled, true);
  assert.equal(graphics.scene.children.length, 0);
  assert.equal(graphics.telemetry.renders.length, renderedCount);
  const note = documentRef.getElementById("threewayQuickStartNote");
  assert.match(note.textContent, /TOPOLOGY T3 · 9 physical sources/);
  assert.match(note.textContent, /1× HIGH.*4× MID.*4× LOW/s);
  assert.match(note.textContent, /prov-waslo-cosyne/);
  assert.match(note.textContent, /REFERENCE ONLY/);
  assert.match(note.textContent, /explicit verified driver records/);
  assert.equal(
    documentRef.getElementById("threewayDriverLow").value,
    "aurasound-ns6-255-8a",
  );
  assert.equal(
    documentRef.getElementById("threewayDriverMid").value,
    "gento-sp99023a",
  );
  assert.equal(
    documentRef.getElementById("threewayDriverHigh").value,
    "celestion-cdx1-1445",
  );

  selector.value = "hinson-cx3-documented";
  selector.dispatchEvent({ type: "change", target: selector });
  state = runtime.getState();
  assert.equal(state.selectedCardId, "hinson-cx3-documented-topology");
  assert.match(note.textContent, /TOPOLOGY CX3 · 3 physical sources/);
  assert.equal(
    documentRef.getElementById("threewayDriverMid").value,
    "bc-dcx464",
  );
  assert.equal(
    documentRef.getElementById("threewayDriverHigh").value,
    "bc-dcx464",
  );
  assert.equal(
    documentRef.getElementById("threewayDriverLow").value,
    "bc-10nw76",
  );
  assert.equal(graphics.scene.children.length, 0);

  selector.value = "u15-h3-envelope";
  selector.dispatchEvent({ type: "change", target: selector });
  state = runtime.getState();
  assert.equal(state.selectedCardId, "u15-h3-documented-topology");
  assert.match(note.textContent, /TOPOLOGY H3 · 5 physical sources/);
  assert.match(
    documentRef.getElementById("threewayDriverLowStatus").textContent,
    /supply a complete user-owned driver record/,
  );
  assert.equal(graphics.scene.children.length, 0);

  selector.value = "t3-calculated-111";
  selector.dispatchEvent({ type: "change", target: selector });
  const solvedAgain = await runtime.whenIdle();
  assert.equal(solvedAgain.ok, true);
  assert.equal(runtime.getState().selectedQuickStartId, "calculated-t3-study");
  assert.equal(documentRef.getElementById("threewaySolve").disabled, false);
  assert.equal(graphics.scene.children.length, 1);
  runtime.dispose();
});

test("real H3 preset binds the candidate, solves, persists only schema 2, and restores controls", async () => {
  const documentRef = domFixture();
  const storage = memoryStorage();
  const evidence = h3Evidence();
  const legacyViewHandler = () => {};
  documentRef.getElementById("viewSel").onchange = legacyViewHandler;
  const controllerApi = controller.createController({ solver });
  const runtime = ui.createRuntime(
    {
      document: documentRef,
      storage,
      build: 654,
      autoSolve: false,
    },
    { controller: controllerApi },
  );
  assert.equal(runtime.ok, true);
  const activated = runtime.activate({
    cardId: "u15-h3-documented-topology",
  });
  assert.equal(activated.ok, true);
  assert.equal(documentRef.body.classList.contains("threeway-v2-mode"), true);
  for (const id of ["bExact", "bStl", "bHrn"]) {
    assert.equal(documentRef.getElementById(id).disabled, true);
  }
  assert.match(
    documentRef.getElementById("bHrn").textContent,
    /UNAVAILABLE/,
  );
  assert.equal(documentRef.getElementById("viewSel").onchange, null);

  const editor = documentRef.getElementById("threewayInputJson");
  documentRef.getElementById("threewayInputMode").value = "preset-evidence";
  editor.value = JSON.stringify(evidence);
  const inspection = runtime.inspectInput();
  assert.equal(
    inspection.ok,
    true,
    JSON.stringify(inspection.missingInputs, null, 2),
  );
  assert.equal(inspection.available, true);
  assert.equal(inspection.topology, "H3");

  const solved = await runtime.solve();
  assert.equal(
    solved.ok,
    true,
    JSON.stringify(solved.details || solved, null, 2),
  );
  assert.equal(solved.result.solution.topology.kind, "H3");
  assert.equal(solved.result.solution.resolvedDrivers.length, 3);
  assert.deepEqual(solved.result.solution.entryStations, []);
  assert.deepEqual(solved.result.solution.passages, []);
  assert.deepEqual(solved.result.solution.mounts, []);
  const sourceRefs = Object.fromEntries(
    runtime.getState().controllerState.candidate.state.sources.map(source => [
      source.id,
      source.driverRef,
    ]),
  );
  assert.deepEqual(sourceRefs, evidence.sourceDriverRefs);
  assert.deepEqual([...storage.values.keys()], ["meh5_threeway_state_v2"]);
  assert.equal(storage.values.has("meh5_state"), false);
  assert.equal(solved.manufacturing, false);
  assert.equal(solved.stl, false);
  assert.equal(solved.rendered, false);
  assert.equal(solved.result.readiness.preview, false);
  assert.equal(
    documentRef.getElementById("threewayDownloadReport").disabled,
    false,
  );

  editor.value = JSON.stringify({ changed: true });
  editor.dispatchEvent({ type: "input", target: editor });
  assert.equal(
    documentRef.getElementById("threewayDownloadReport").disabled,
    true,
  );
  assert.equal(runtime.getState().lastSolveResult, null);

  runtime.deactivate();
  assert.equal(documentRef.body.classList.contains("threeway-v2-mode"), false);
  assert.equal(documentRef.getElementById("bExact").disabled, false);
  assert.equal(
    documentRef.getElementById("bExact").textContent,
    "GENERATE EXACT MESH",
  );
  assert.equal(documentRef.getElementById("viewSel").value, "full");
  assert.equal(
    documentRef.getElementById("viewSel").onchange,
    legacyViewHandler,
  );
  assert.equal(documentRef.getElementById("fabBadge").textContent, "LEGACY BADGE");
});

test("direct canonical wrapper replaces state and an inactive result is discarded", async () => {
  const documentRef = domFixture();
  const storage = memoryStorage();
  const runtime = ui.createRuntime(
    { document: documentRef, storage, build: 654, autoSolve: false },
    { controller: controller.createController({ solver }) },
  );
  runtime.activate({ cardId: "u15-h3-documented-topology" });
  documentRef.getElementById("threewayInputMode").value = "preset-evidence";
  documentRef.getElementById("threewayInputJson").value =
    JSON.stringify(h3Evidence());
  const presetInspection = runtime.inspectInput();
  assert.equal(presetInspection.ok, true);

  const mode = documentRef.getElementById("threewayInputMode");
  mode.value = "canonical-analysis";
  documentRef.getElementById("threewayInputJson").value = JSON.stringify({
    state: presetInspection.state,
    analysisInput: presetInspection.analysisInput,
  });
  const directInspection = runtime.inspectInput();
  assert.equal(directInspection.ok, true);
  assert.equal(directInspection.code, "THREEWAY_UI_DIRECT_ANALYSIS_INPUT");
  assert.equal(directInspection.topology, "H3");

  const pending = runtime.solve();
  runtime.deactivate();
  const discarded = await pending;
  assert.equal(discarded.ok, false);
  assert.equal(discarded.code, "THREEWAY_UI_SOLVE_FAILED");
  assert.match(discarded.message, /no longer active/);
  assert.equal(runtime.getState().lastSolveResult, null);
});

test("shell contains hard legacy-export guards for schema-2 three-way", () => {
  const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");
  assert.match(
    shell,
    /EXACT MESH REFUSED — schema-2 three-way is analysis\/preview only/,
  );
  assert.match(
    shell,
    /HORNRESP REFUSED — schema-2 three-way has no source-pinned exporter/,
  );
  assert.match(shell, /if\(S\.topo==='3way'\)\{\s*activateThreeWayV2\(\);\s*return;/);
  assert.match(
    shell,
    /persists only through meh5_threeway_state_v2/,
  );
  assert.match(
    shell,
    /'mounts-preview':\{yaw:2\.58,pitch:\.30,dist:1\.12\}/,
  );
  assert.match(shell, /function reuseTwoWayDriverVisualsForThreeWay/);
  assert.match(shell, /shared=driverBody\(/);
  assert.match(shell, /function reuseTwoWayMountVisualsForThreeWay/);
  assert.match(shell, /plate=annularPlate\(/);
  assert.match(
    shell,
    /function reuseTwoWayCompressionDriverForThreeWay/,
  );
  assert.match(shell, /body=compressionDriverBody\(/);
  assert.match(shell, /box\.expandByObject\(child\)/);
});
