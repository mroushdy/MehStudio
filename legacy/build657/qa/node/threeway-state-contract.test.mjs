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
const contractPath = path.join(appRoot, "threeway-state-contract.js");
const source = fs.readFileSync(contractPath, "utf8");
const contract = require(contractPath);

function baseState(kind) {
  return {
    schemaVersion: 2,
    designId: "design-state-contract",
    revision: 1,
    topology: { kind, schemaVersion: 1 },
    intent: {
      crossoversHz: { lowMid: 320, midHigh: 1250 },
      mouthLimitM: { width: 0.8, height: 0.6 },
    },
    horn: {
      surfaceLaw: { family: "conical", parameters: {} },
      mouth: { widthM: 0.72, heightM: 0.48 },
    },
    sources: [],
    interfaces: [],
    entryStations: [],
    rearSystems: [],
    provenance: { records: [] },
    research: { notes: [], referenceCardIds: [] },
  };
}

function t3State() {
  const state = baseState("T3");
  state.sources = [
    {
      id: "src-low",
      bandIds: ["low"],
      role: "wall-source",
      count: 2,
      provenanceRefs: [],
    },
    {
      id: "src-high",
      bandIds: ["high"],
      role: "throat-source",
      count: 1,
      provenanceRefs: [],
    },
    {
      id: "src-mid",
      bandIds: ["mid"],
      role: "wall-source",
      count: 2,
      provenanceRefs: [],
    },
  ];
  state.interfaces = [
    {
      id: "if-high",
      kind: "throat",
      sourceIds: ["src-high"],
      bandIds: ["high"],
      geometry: { shape: "round", areaM2: 0.00096 },
      provenanceRefs: [],
    },
  ];
  state.entryStations = [
    {
      id: "station-low",
      role: "wall-entry",
      sourceIds: ["src-low"],
      bandIds: ["low"],
      order: 2,
      axial: { mode: "solve", requestedM: null },
      apertures: { countPerSource: 2, summedAreaMode: "solve" },
      provenanceRefs: [],
    },
    {
      id: "station-mid",
      role: "wall-entry",
      sourceIds: ["src-mid"],
      bandIds: ["mid"],
      order: 1,
      axial: { mode: "solve", requestedM: null },
      apertures: { countPerSource: 2, summedAreaMode: "solve" },
      provenanceRefs: [],
    },
  ];
  return state;
}

function cx3State() {
  const state = baseState("coax-throat-three-band");
  state.sources = [
    {
      id: "src-low",
      bandIds: ["low"],
      role: "wall-source",
      count: 4,
      provenanceRefs: [],
    },
    {
      id: "src-coax",
      bandIds: ["high", "mid"],
      role: "throat-module",
      count: 1,
      provenanceRefs: [],
    },
  ];
  state.interfaces = [
    {
      id: "if-coax",
      kind: "coaxial-throat",
      sourceIds: ["src-coax"],
      bandIds: ["high", "mid"],
      provenanceRefs: [],
    },
  ];
  state.entryStations = [
    {
      id: "station-low",
      role: "wall-entry",
      sourceIds: ["src-low"],
      bandIds: ["low"],
      order: 1,
      provenanceRefs: [],
    },
  ];
  return state;
}

function h3State() {
  const state = baseState("H3");
  state.sources = [
    {
      id: "src-low-external",
      bandIds: ["low"],
      role: "external-to-shared-horn",
      count: 2,
      provenanceRefs: [],
    },
    {
      id: "src-mid-high",
      bandIds: ["mid", "high"],
      role: "throat-module",
      count: 1,
      provenanceRefs: [],
    },
  ];
  state.interfaces = [
    {
      id: "if-mid-high",
      kind: "shared-throat",
      sourceIds: ["src-mid-high"],
      bandIds: ["mid", "high"],
      provenanceRefs: [],
    },
  ];
  return state;
}

function compoundState() {
  const state = baseState("COMPOUND_RESEARCH");
  state.sources = [
    {
      id: "src-compound",
      bandIds: ["low", "mid", "high"],
      role: "compound-source",
      count: 3,
      provenanceRefs: [],
    },
  ];
  state.interfaces = [
    {
      id: "if-compound",
      kind: "compound-interface",
      sourceIds: ["src-compound"],
      bandIds: ["low", "mid", "high"],
      provenanceRefs: [],
    },
  ];
  state.entryStations = [
    {
      id: "station-z",
      role: "compound-entry",
      sourceIds: ["src-compound"],
      bandIds: ["low"],
      order: null,
      provenanceRefs: [],
    },
    {
      id: "station-a",
      role: "compound-entry",
      sourceIds: ["src-compound"],
      bandIds: ["mid"],
      order: null,
      provenanceRefs: [],
    },
  ];
  state.topology.graph = {
    nodes: [
      { id: "node-station-z", kind: "station", refId: "station-z" },
      { id: "node-source", kind: "source", refId: "src-compound" },
      { id: "node-interface", kind: "interface", refId: "if-compound" },
      { id: "node-station-a", kind: "station", refId: "station-a" },
    ],
    edges: [
      { id: "edge-2", from: "node-station-a", to: "node-interface" },
      { id: "edge-1", from: "node-source", to: "node-station-z" },
      { id: "edge-1b", from: "node-station-z", to: "node-station-a" },
    ],
  };
  return state;
}

function codes(result) {
  return result.diagnostics.map(item => item.code);
}

test("schema-2 T3 normalization is immutable and keeps explicit station order", () => {
  const input = t3State();
  const before = structuredClone(input);
  const result = contract.normalizeThreeWayState(input);

  assert.deepEqual(input, before, "normalization mutated caller state");
  assert.equal(result.valid, true);
  assert.equal(result.state.schemaVersion, 2);
  assert.equal(result.state.topology.kind, "T3");
  assert.deepEqual(
    result.state.entryStations.map(station => station.id),
    ["station-mid", "station-low"],
  );
  assert.deepEqual(
    result.state.sources.map(item => item.id),
    ["src-high", "src-low", "src-mid"],
  );
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.state));
  assert.ok(Object.isFrozen(result.state.entryStations));
  assert.ok(Object.isFrozen(result.state.entryStations[0].apertures));
  assert.match(result.hashInput, /^meh3-state-v2\.topology-v1\n\{/);
});

test("CX3 carries mid/high at one coax throat and never creates an MF wall station", () => {
  const valid = contract.normalizeThreeWayState(cx3State());
  assert.equal(valid.valid, true);
  assert.equal(valid.state.topology.kind, "CX3");
  assert.deepEqual(
    valid.state.entryStations.map(item => item.bandIds),
    [["low"]],
  );

  const invalidInput = cx3State();
  invalidInput.entryStations.push({
    id: "station-invented-mid",
    role: "wall-entry",
    sourceIds: ["src-coax"],
    bandIds: ["mid"],
    order: 0,
    provenanceRefs: [],
  });
  const invalid = contract.normalizeThreeWayState(invalidInput);
  assert.equal(invalid.valid, false);
  assert.ok(codes(invalid).includes("THREEWAY_TOPOLOGY_GRAPH_INVALID"));
  assert.equal(
    invalid.state.entryStations.filter(item => item.bandIds.includes("mid"))
      .length,
    1,
    "the invalid explicit station should be preserved, not silently removed",
  );
});

test("H3 keeps LF external and rejects any LF shared-horn entry", () => {
  const valid = contract.normalizeThreeWayState(h3State());
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.state.entryStations, []);
  assert.equal(
    valid.state.sources.find(item => item.bandIds.includes("low")).role,
    "external-to-shared-horn",
  );

  const invalidInput = h3State();
  invalidInput.entryStations.push({
    id: "station-low",
    role: "wall-entry",
    sourceIds: ["src-low-external"],
    bandIds: ["low"],
    order: 1,
    provenanceRefs: [],
  });
  const invalid = contract.normalizeThreeWayState(invalidInput);
  assert.equal(invalid.valid, false);
  assert.ok(codes(invalid).includes("THREEWAY_TOPOLOGY_GRAPH_INVALID"));
});

test("COMPOUND_RESEARCH uses its directed graph and receives no conventional order", () => {
  const result = contract.normalizeThreeWayState(compoundState());
  assert.equal(result.valid, true);
  assert.deepEqual(
    result.state.entryStations.map(item => [item.id, item.order]),
    [
      ["station-a", null],
      ["station-z", null],
    ],
  );
  assert.deepEqual(
    result.state.topology.graph.nodes.map(item => item.id),
    ["node-interface", "node-source", "node-station-a", "node-station-z"],
  );
  assert.ok(
    result.state.topology.graph.edges.every(edge => edge.directed === true),
  );
  assert.ok(
    !codes(result).includes("THREEWAY_ENTRY_STATION_ORDER_INVALID"),
  );

  const broken = compoundState();
  broken.topology.graph.edges[0].to = "missing-node";
  const invalid = contract.normalizeThreeWayState(broken);
  assert.equal(invalid.valid, false);
  assert.ok(codes(invalid).includes("THREEWAY_TOPOLOGY_GRAPH_INVALID"));
});

test("mouth changes never infer count, interfaces, stations, or placement", () => {
  const first = t3State();
  const second = structuredClone(first);
  second.horn.mouth = { widthM: 1.4, heightM: 0.9 };
  second.intent.mouthLimitM = { width: 1.5, height: 1.0 };

  const normalizedFirst = contract.normalizeThreeWayState(first);
  const normalizedSecond = contract.normalizeThreeWayState(second);
  assert.deepEqual(
    normalizedSecond.state.sources,
    normalizedFirst.state.sources,
  );
  assert.deepEqual(
    normalizedSecond.state.interfaces,
    normalizedFirst.state.interfaces,
  );
  assert.deepEqual(
    normalizedSecond.state.entryStations,
    normalizedFirst.state.entryStations,
  );
  assert.notEqual(normalizedFirst.hashInput, normalizedSecond.hashInput);

  const missingCount = t3State();
  delete missingCount.sources[0].count;
  const refused = contract.normalizeThreeWayState(missingCount);
  assert.equal(refused.state.sources.find(item => item.id === "src-low").count, null);
  assert.equal(refused.valid, false);
  assert.ok(codes(refused).includes("THREEWAY_TOPOLOGY_GRAPH_INVALID"));
});

test("canonical state and hash input are stable under keyed-array permutation", () => {
  const first = t3State();
  first.provenance.records = [
    {
      id: "prov-z",
      classification: "calculated-adaptation",
      sourceUrl: "https://example.test/z",
      valuePaths: ["horn.mouth.widthM"],
    },
    {
      id: "prov-a",
      classification: "documented",
      sourceUrl: "https://example.test/a",
      valuePaths: ["sources[src-high].driverRef"],
    },
  ];
  const second = structuredClone(first);
  second.sources.reverse();
  second.interfaces.reverse();
  second.entryStations.reverse();
  second.provenance.records.reverse();

  const normalizedFirst = contract.normalizeThreeWayState(first);
  const normalizedSecond = contract.normalizeThreeWayState(second);
  assert.equal(normalizedFirst.valid, true);
  assert.equal(normalizedSecond.valid, true);
  assert.deepEqual(normalizedFirst.state, normalizedSecond.state);
  assert.equal(normalizedFirst.hashInput, normalizedSecond.hashInput);
  assert.equal(
    contract.stateHashInput(normalizedFirst),
    normalizedFirst.hashInput,
  );
});

test("provenance conflicts remain visible and envelope evidence cannot lock geometry", () => {
  const state = t3State();
  state.entryStations[0].axial.mode = "documented-lock";
  state.entryStations[0].provenanceRefs = ["prov-photo-a", "prov-photo-b"];
  state.provenance.records = [
    {
      id: "prov-photo-b",
      classification: "adjacent",
      sourceUrl: "https://example.test/photo-b",
      publicationRevision: "b",
      sha256: "bbb",
      valuePaths: ["entryStations[station-low].axial.requestedM"],
    },
    {
      id: "prov-photo-a",
      classification: "envelope-study",
      sourceUrl: "https://example.test/photo-a",
      publicationRevision: "a",
      sha256: "aaa",
      valuePaths: ["entryStations[station-low].axial.requestedM"],
    },
  ];

  const result = contract.normalizeThreeWayState(state);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("THREEWAY_PROVENANCE_CONFLICT"));
  assert.ok(codes(result).includes("THREEWAY_ENVELOPE_PROMOTION_REFUSED"));
  assert.deepEqual(
    result.state.provenance.records.map(item => item.id),
    ["prov-photo-a", "prov-photo-b"],
  );
  assert.equal(
    result.diagnostics.find(
      item => item.code === "THREEWAY_PROVENANCE_CONFLICT",
    ).severity,
    "warning",
  );
});

test("topology failures use stable codes and never silently fall back", () => {
  const missing = baseState(null);
  const missingResult = contract.normalizeThreeWayState(missing);
  assert.ok(codes(missingResult).includes("THREEWAY_TOPOLOGY_REQUIRED"));
  assert.equal(missingResult.state.topology.kind, null);

  const unknown = baseState("commercial-photo-name");
  const unknownResult = contract.normalizeThreeWayState(unknown);
  assert.ok(codes(unknownResult).includes("THREEWAY_TOPOLOGY_UNSUPPORTED"));
  assert.equal(unknownResult.state.topology.kind, null);
  assert.equal(unknownResult.valid, false);
});

test("manufacturing flags and preflight remain false for every topology", () => {
  for (const state of [t3State(), cx3State(), h3State(), compoundState()]) {
    const result = contract.normalizeThreeWayState(state);
    assert.equal(result.readiness.manufacturingPlan, false);
    assert.equal(result.readiness.exactSolid, false);
    assert.equal(result.readiness.manufacturing, false);
    assert.equal(result.readiness.stl, false);
  }
  assert.equal(contract.capabilities.manufacturingPlan, false);
  assert.equal(contract.capabilities.manufacturingSolids, false);
  assert.equal(contract.capabilities.manufacturingExport, false);
  assert.equal(contract.capabilities.stlExport, false);

  const refusal = contract.manufacturingPreflight("stl");
  assert.deepEqual(
    {
      ok: refusal.ok,
      available: refusal.available,
      code: refusal.code,
      operation: refusal.operation,
      manufacturing: refusal.manufacturing,
    },
    {
      ok: false,
      available: false,
      code: "THREEWAY_MANUFACTURING_UNAVAILABLE",
      operation: "stl",
      manufacturing: false,
    },
  );
  assert.ok(Object.isFrozen(refusal));
});

test("the contract loads without DOM, renderer, engine, or two-way globals", () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(context.MEH3StateContract.schemaVersion, 2);
  assert.equal(
    context.MEH3StateContract.capabilities.manufacturingExport,
    false,
  );
  assert.doesNotMatch(source, /require\(['"].*(?:engine|twoway)/);
  assert.doesNotMatch(source, /\bTHREE\.|document\.|window\./);
});
