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
const cardsPath = path.join(appRoot, "threeway-reference-cards.js");
const contractPath = path.join(appRoot, "threeway-state-contract.js");
const source = fs.readFileSync(cardsPath, "utf8");
const cards = require(cardsPath);
const contract = require(contractPath);

const expectedIds = [
  "patent-t3-generic",
  "cosyne-t3-documented-topology",
  "hinson-cx3-documented-topology",
  "u15-h3-documented-topology",
  "compound-research-generic",
];

function jsonRealm(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, label = "value") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${label} is not frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeepFrozen(child, `${label}.${key}`);
  }
}

function visit(value, callback, pathParts = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      visit(child, callback, [...pathParts, String(index)]),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    callback(key, child, [...pathParts, key]);
    visit(child, callback, [...pathParts, key]);
  }
}

function countFor(state, sourceId) {
  return state.sources.find(item => item.id === sourceId)?.count;
}

test("pure UMD/CommonJS catalog exposes stable deterministic card IDs", () => {
  assert.equal(cards.catalogVersion, 1);
  assert.equal(cards.serializationVersion, "meh3-reference-cards-v1");
  assert.deepEqual([...cards.cardIds], expectedIds);
  assert.deepEqual(
    cards.listReferenceCards().map(card => card.id),
    expectedIds,
  );

  const context = vm.createContext({ globalThis: {} });
  vm.runInContext(source, context, { filename: cardsPath });
  const browserApi = context.globalThis.MEH3ReferenceCards;
  assert.ok(browserApi, "browser UMD global was not installed");
  assert.deepEqual(jsonRealm(browserApi.cardIds), expectedIds);

  for (const id of expectedIds) {
    assert.equal(
      browserApi.serializeReferenceCard(id),
      cards.serializeReferenceCard(id),
      `${id} serialized differently across UMD/CommonJS`,
    );
    assert.equal(
      cards.serializeReferenceCard(id),
      cards.serializeReferenceCard(id),
      `${id} serialization is not deterministic`,
    );
    assert.equal(
      browserApi.serializeStateIntent(id),
      cards.serializeStateIntent(id),
      `${id} state intent serialized differently across runtimes`,
    );
  }
});

test("every card is immutable, provenance-bearing, and explicitly unsolved", () => {
  assertDeepFrozen(cards);
  assert.equal(cards.capabilities.manufacturingValidated, false);
  assert.equal(cards.capabilities.manufacturingGeometry, false);
  assert.equal(cards.capabilities.productClone, false);

  for (const card of cards.listReferenceCards()) {
    assert.equal(card.intentStatus, "unsolved-reference-intent");
    assert.equal(card.manufacturingValidated, false);
    assert.ok(card.topologyFamily);
    assert.ok(card.knownFacts.length > 0);
    assert.ok(card.unknowns.length > 0);
    assert.ok(card.provenance.length > 0);

    for (const record of card.provenance) {
      assert.match(record.sourceUrl, /^https:\/\//);
      assert.ok(
        record.localLedgerRefs.length > 0,
        `${card.id}/${record.id} lacks a local ledger reference`,
      );
      assert.ok(record.supports.length > 0);
      assert.ok(record.doesNotSupport.length > 0);
    }

    visit(card, (key, value, itemPath) => {
      if (key === "manufacturingValidated") {
        assert.equal(
          value,
          false,
          `${card.id} promoted manufacturing at ${itemPath.join(".")}`,
        );
      }
    });
  }
});

test("state seeds contain source-backed topology only and no hidden geometry", () => {
  const forbiddenPhysicalKeys = new Set([
    "driverRef",
    "geometry",
    "axial",
    "apertures",
    "frontChamber",
    "passages",
    "crossoversHz",
    "surfaceLaw",
    "mouth",
    "widthM",
    "heightM",
    "depthM",
    "areaM2",
    "requestedM",
  ]);

  for (const card of cards.listReferenceCards()) {
    visit(card.stateIntentSeed, (key, _value, itemPath) => {
      assert.equal(
        forbiddenPhysicalKeys.has(key),
        false,
        `${card.id} hides physical geometry at ${itemPath.join(".")}`,
      );
    });

    const applied = cards.applyReferenceCard(card.id);
    assert.deepEqual(applied.state.horn, {});
    assert.equal(applied.state.intent.geometryResolved, false);
    assert.equal(applied.state.intent.analysisResolved, false);
    assert.equal(applied.state.intent.manufacturingValidated, false);
    for (const sourceRecord of applied.state.sources) {
      assert.equal(
        Object.hasOwn(sourceRecord, "driverRef"),
        false,
        `${card.id} selected a driver`,
      );
    }
    for (const station of applied.state.entryStations) {
      assert.equal(Object.hasOwn(station, "axial"), false);
      assert.equal(Object.hasOwn(station, "apertures"), false);
      assert.equal(Object.hasOwn(station, "frontChamber"), false);
      assert.equal(Object.hasOwn(station, "passages"), false);
    }
  }
});

test("only explicitly sourced source counts and station graphs are seeded", () => {
  const patent = cards.applyReferenceCard("patent-t3-generic").state;
  assert.deepEqual(
    patent.sources.map(item => [item.id, item.count]),
    [
      ["source-high", null],
      ["source-mid", null],
      ["source-low", null],
    ],
  );
  assert.deepEqual(
    patent.entryStations.map(item => [item.bandIds, item.order]),
    [[["mid"], 1], [["low"], 2]],
  );

  const cosyne = cards.applyReferenceCard(
    "cosyne-t3-documented-topology",
  ).state;
  assert.equal(countFor(cosyne, "source-high"), 1);
  assert.equal(countFor(cosyne, "source-mid"), 4);
  assert.equal(countFor(cosyne, "source-low"), 4);

  const hinson = cards.applyReferenceCard(
    "hinson-cx3-documented-topology",
  ).state;
  assert.equal(countFor(hinson, "source-coax-mid-high"), 1);
  assert.equal(countFor(hinson, "source-low"), 2);
  assert.deepEqual(
    hinson.interfaces[0].bandIds,
    ["mid", "high"],
  );
  assert.deepEqual(hinson.entryStations[0].bandIds, ["low"]);

  const u15 = cards.applyReferenceCard(
    "u15-h3-documented-topology",
  ).state;
  assert.equal(countFor(u15, "source-low-external"), 1);
  assert.equal(countFor(u15, "source-mid"), 3);
  assert.equal(countFor(u15, "source-high"), 1);
  assert.deepEqual(u15.entryStations, []);

  const compound = cards.applyReferenceCard(
    "compound-research-generic",
  ).state;
  assert.deepEqual(compound.sources, []);
  assert.deepEqual(compound.interfaces, []);
  assert.deepEqual(compound.entryStations, []);
  assert.deepEqual(compound.topology.graph, { nodes: [], edges: [] });
});

test("application returns immutable schema-2 state intents without mutating cards", () => {
  for (const id of expectedIds) {
    const before = cards.serializeReferenceCard(id);
    const first = cards.applyReferenceCard(id);
    const second = cards.applyReferenceCard(id);

    assert.equal(first.ok, true);
    assert.equal(first.available, true);
    assert.equal(first.code, "THREEWAY_REFERENCE_CARD_APPLIED");
    assert.equal(first.cardId, id);
    assert.equal(first.state.schemaVersion, 2);
    assert.equal(first.state.revision, 0);
    assert.equal(first.state.designId, null);
    assert.equal(first.state.intent.referenceCardId, id);
    assert.equal(first.state.intent.status, "unsolved-reference-intent");
    assert.equal(first.manufacturingValidated, false);
    assert.ok(first.unresolved.length > 0);
    assert.deepEqual(first.state, second.state);
    assert.notEqual(first.state, second.state);
    assertDeepFrozen(first, `applyReferenceCard(${id})`);
    assert.equal(cards.serializeReferenceCard(id), before);
  }
});

test("applied intents are compatible with the schema-2 state contract", () => {
  const expectedTopologicalValidity = new Map([
    ["patent-t3-generic", false],
    ["cosyne-t3-documented-topology", true],
    ["hinson-cx3-documented-topology", true],
    ["u15-h3-documented-topology", true],
    ["compound-research-generic", false],
  ]);

  for (const id of expectedIds) {
    const applied = cards.applyReferenceCard(id);
    const normalized = contract.normalizeThreeWayState(applied.state);
    assert.equal(normalized.state.schemaVersion, 2);
    assert.equal(
      normalized.state.topology.kind,
      applied.state.topology.kind,
    );
    assert.equal(
      normalized.valid,
      expectedTopologicalValidity.get(id),
      `${id} had unexpected topology validity`,
    );
    assert.equal(normalized.readiness.analysis, false);
    assert.equal(normalized.readiness.preview, false);
    assert.equal(normalized.readiness.manufacturing, false);
    assert.equal(normalized.readiness.stl, false);
    assert.equal(
      normalized.state.intent.manufacturingValidated,
      false,
    );
  }

  const patent = contract.normalizeThreeWayState(
    cards.applyReferenceCard("patent-t3-generic").state,
  );
  assert.ok(
    patent.diagnostics.some(
      item =>
        item.code === "THREEWAY_TOPOLOGY_GRAPH_INVALID" &&
        item.message.includes("count"),
    ),
    "generic patent card silently inferred a source count",
  );

  const compound = contract.normalizeThreeWayState(
    cards.applyReferenceCard("compound-research-generic").state,
  );
  assert.ok(
    compound.diagnostics.some(
      item =>
        item.code === "THREEWAY_TOPOLOGY_GRAPH_INVALID" &&
        item.message.includes("at least one node"),
    ),
    "compound card silently inferred an acoustic graph",
  );
});

test("unknown cards fail closed and never apply a default", () => {
  const result = cards.applyReferenceCard("not-a-card");
  assert.equal(result.ok, false);
  assert.equal(result.available, false);
  assert.equal(result.code, "THREEWAY_REFERENCE_CARD_UNKNOWN");
  assert.equal(result.cardId, "not-a-card");
  assert.equal(result.state, null);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.manufacturingValidated, false);
  assert.deepEqual(result.diagnostics[0].availableCardIds, expectedIds);
  assert.equal(cards.getReferenceCard("not-a-card"), null);
  assert.equal(cards.serializeReferenceCard("not-a-card"), null);
  assert.equal(cards.serializeStateIntent("not-a-card"), null);
  assertDeepFrozen(result, "unknown reference-card result");
});
