import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const db = require(path.join(appRoot, "threeway-driver-db.js"));

function coneRecord(id = "driver-cone") {
  return {
    schemaVersion: 1,
    id,
    revision: 1,
    manufacturer: "documented-example",
    model: "explicit-cone",
    kind: "cone",
    bandIds: ["low"],
    frame: {
      shape: "round",
      diameterM: 0.26,
      depthM: 0.12,
      frontProjectionM: 0.004,
    },
    diaphragm: {
      effectiveAreaM2: 0.033,
      activeDiameterM: 0.22,
      maxLinearExcursionM: 0.005,
      provenanceRefs: ["prov-sheet"],
    },
    outputs: [
      {
        id: "cone-front",
        bandIds: ["low"],
        kind: "front-diaphragm",
        geometry: {
          shape: "round",
          diameterM: 0.22,
          areaM2: 0.033,
        },
        acousticDatum: { kind: "diaphragm", offsetM: 0.025 },
        provenanceRefs: ["prov-sheet"],
      },
    ],
    mounting: {
      datum: "front-frame-plane",
      provenanceRefs: ["prov-cad"],
    },
    ts: {
      fsHz: 50,
      vasM3: 0.03,
      qts: 0.33,
      reOhm: 5.5,
      blTm: 12,
      mmsKg: 0.035,
      cmsMPerN: 0.0003,
      rmsNsPerM: 1.2,
      sdM2: 0.033,
      xmaxM: 0.005,
      provenanceRefs: ["prov-sheet"],
    },
    provenanceRefs: ["prov-sheet", "prov-cad"],
  };
}

function coaxRecord() {
  return {
    schemaVersion: 1,
    id: "driver-coax-throat",
    revision: 2,
    kind: "dual-diaphragm",
    bandIds: ["mid", "high"],
    frame: {
      shape: "round",
      diameterM: 0.19,
      depthM: 0.16,
    },
    diaphragm: {
      effectiveAreaM2: 0.012,
      activeDiameterM: 0.125,
      provenanceRefs: ["prov-coax"],
    },
    outputs: [
      {
        id: "shared-throat",
        bandIds: ["mid", "high"],
        kind: "coaxial-throat",
        geometry: {
          shape: "round",
          diameterM: 0.035,
          areaM2: 0.00096,
        },
        acousticDatum: { kind: "manufacturer-reference-plane", offsetM: 0.08 },
        provenanceRefs: ["prov-coax"],
      },
    ],
    provenanceRefs: ["prov-coax"],
  };
}

test("explicit driver record is immutable and exposes independent readiness", () => {
  const input = coneRecord();
  const before = structuredClone(input);
  const result = db.validateDriverRecord(input);

  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.readiness.packing, true);
  assert.equal(result.readiness.lumpedDriverTerms, true);
  assert.equal(result.readiness.thieleSmall, true);
  assert.equal(result.readiness.mountSolid, false);
  assert.equal(result.readiness.manufacturing, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.record.frame));
});

test("area, diameter, depth, and acoustic datum are never inferred", () => {
  const record = coneRecord();
  delete record.frame.depthM;
  delete record.diaphragm.effectiveAreaM2;
  delete record.outputs[0].geometry.diameterM;
  delete record.outputs[0].acousticDatum.offsetM;
  const result = db.validateDriverRecord(record);

  assert.equal(result.ok, false);
  assert.equal(result.record.frame.depthM, null);
  assert.equal(result.record.diaphragm.effectiveAreaM2, null);
  assert.equal(result.record.outputs[0].geometry.diameterM, null);
  assert.equal(result.record.outputs[0].acousticDatum.offsetM, null);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_ENVELOPE_INCOMPLETE"));
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_RECORD_INCOMPLETE"));
});

test("multi-band coax record owns one explicit shared output without a fake MF station", () => {
  const result = db.validateDriverRecord(coaxRecord());
  assert.equal(result.ok, true);
  assert.deepEqual(result.record.bandIds, ["mid", "high"]);
  assert.equal(result.record.outputs.length, 1);
  assert.deepEqual(result.record.outputs[0].bandIds, ["mid", "high"]);
});

test("output bands outside the driver declaration fail closed", () => {
  const record = coneRecord();
  record.outputs[0].bandIds.push("mid");
  const result = db.validateDriverRecord(record);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_BAND_UNSUPPORTED"));
});

test("registry ordering is deterministic and duplicate IDs are refused", () => {
  const a = coneRecord("driver-z");
  const b = coaxRecord();
  const first = db.createDriverRegistry([a, b]);
  const second = db.createDriverRegistry([b, a]);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.ids, ["driver-coax-throat", "driver-z"]);
  assert.equal(first.canonical, second.canonical);
  assert.equal(first.get("driver-z").id, "driver-z");

  const duplicate = db.createDriverRegistry([a, coneRecord("driver-z")]);
  assert.equal(duplicate.ok, false);
  assert.ok(duplicate.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_RECORD_DUPLICATE"));
});

test("source resolution is keyed, band-safe, and never substitutes a missing driver", () => {
  const registry = db.createDriverRegistry([coneRecord(), coaxRecord()]);
  const state = {
    sources: [
      {
        id: "src-low",
        driverRef: "driver-cone",
        count: 2,
        bandIds: ["low"],
      },
      {
        id: "src-coax",
        driverRef: "driver-coax-throat",
        count: 1,
        bandIds: ["mid", "high"],
      },
    ],
  };
  const before = structuredClone(state);
  const result = db.resolveSourceDrivers(state, registry);
  assert.deepEqual(state, before);
  assert.equal(result.ok, true);
  assert.equal(result.sources[0].sourceId, "src-coax");
  assert.equal(result.sources[1].totalEffectiveAreaM2, 0.066);

  const absent = structuredClone(state);
  absent.sources[0].driverRef = "not-present";
  const missing = db.resolveSourceDrivers(absent, registry);
  assert.equal(missing.ok, false);
  assert.equal(missing.sources.find(item =>
    item.sourceId === "src-low").driver, null);
  assert.ok(missing.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_RECORD_NOT_FOUND"));

  const wrongBand = structuredClone(state);
  wrongBand.sources[0].bandIds = ["mid"];
  const unsupported = db.resolveSourceDrivers(wrongBand, registry);
  assert.equal(unsupported.ok, false);
  assert.ok(unsupported.diagnostics.some(item =>
    item.code === "THREEWAY_DRIVER_BAND_UNSUPPORTED"));
});

test("manufacturing remains unavailable regardless of record completeness", () => {
  const preflight = db.manufacturingPreflight("mount-solid");
  assert.equal(preflight.ok, false);
  assert.equal(preflight.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(preflight.manufacturing, false);
  assert.equal(preflight.stl, false);
});

test("UMD browser path exposes the same API", async () => {
  const fs = await import("node:fs");
  const vm = await import("node:vm");
  const source = fs.readFileSync(
    path.join(appRoot, "threeway-driver-db.js"), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  assert.equal(typeof context.globalThis.MEH3DriverDB.validateDriverRecord,
    "function");
  assert.equal(context.globalThis.MEH3DriverDB.schemaVersion, 1);
});
