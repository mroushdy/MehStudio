import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ui = require("../../threeway-ui.js");

test("schema-2 UI API is immutable and refuses manufacturing authority", () => {
  assert.equal(ui.version, 1);
  assert.equal(Object.isFrozen(ui), true);
  assert.deepEqual(ui.viewIds, [
    "full-assembly",
    "horn-only",
    "no-drivers-mount-assembly",
    "mounts-preview",
    "lumen-inspection",
    "section-cutaway",
    "package-bounds"
  ]);
  assert.equal(ui.capabilities.legacyThreeWayStateRead, false);
  assert.equal(ui.capabilities.legacyThreeWayRenderer, false);
  assert.equal(ui.capabilities.hornresp, false);
  assert.equal(ui.capabilities.exactSolid, false);
  assert.equal(ui.capabilities.manufacturing, false);
  assert.equal(ui.capabilities.stl, false);
});

test("explicit input parser accepts only JSON objects", () => {
  const valid = ui.parseJsonObject('{"driverRecords":[],"value":1}');
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value, { driverRecords: [], value: 1 });
  assert.equal(Object.isFrozen(valid), true);

  const array = ui.parseJsonObject("[]");
  assert.equal(array.ok, false);
  assert.equal(array.code, "THREEWAY_UI_INPUT_JSON_INVALID");

  const invalid = ui.parseJsonObject("{");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, "THREEWAY_UI_INPUT_JSON_INVALID");
});

test("preset summaries distinguish missing evidence from solver readiness", () => {
  const missing = ui.summarizePresetResult({
    ok: true,
    available: false,
    topology: "T3",
    analysisInput: null,
    missingInputs: [
      {
        path: "horn",
        reason: "An explicit horn solution is required."
      },
      {
        path: "driverRecords",
        reason: "Explicit driver records are required."
      }
    ]
  });
  assert.equal(missing.ready, false);
  assert.equal(missing.tier, "reference");
  assert.match(missing.headline, /2 INPUTS REQUIRED/);
  assert.match(missing.lines[0], /^horn —/);

  const ready = ui.summarizePresetResult({
    ok: true,
    available: true,
    topology: "H3",
    analysisInput: { driverRecords: [] },
    missingInputs: []
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.tier, "validated");
  assert.match(ready.headline, /READY/);
});

test("runtime creation fails closed without an injected DOM", () => {
  const runtime = ui.createRuntime({});
  assert.equal(runtime.ok, false);
  assert.equal(runtime.code, "THREEWAY_UI_DOM_UNAVAILABLE");
  assert.equal(runtime.manufacturing, false);
  assert.equal(runtime.stl, false);
});
