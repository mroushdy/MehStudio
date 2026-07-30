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
const modulePath = path.join(appRoot, "threeway-solid-intent.js");
const previewPath = path.join(appRoot, "threeway-preview-geometry.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const previewSource = fs.readFileSync(previewPath, "utf8");
const solidIntent = require(modulePath);

test("solid-intent boundary advertises analysis operands without fabrication authority", () => {
  assert.equal(solidIntent.version, 1);
  assert.equal(solidIntent.inputSchemaVersion, 2);
  assert.deepEqual(solidIntent.supportedTopologies, ["T3"]);
  assert.equal(solidIntent.capabilities.canonicalRecordStamping, true);
  assert.equal(solidIntent.capabilities.deterministicContacts, true);
  assert.equal(solidIntent.capabilities.closedHornShell, true);
  assert.equal(solidIntent.capabilities.fullFrameDriverPlates, true);
  assert.equal(
    solidIntent.capabilities.continuousExtendedLumenNegatives,
    true,
  );
  assert.equal(solidIntent.capabilities.hornWallSolid, true);
  assert.equal(solidIntent.capabilities.booleanExecution, false);
  assert.equal(solidIntent.capabilities.exactSolid, false);
  assert.equal(solidIntent.capabilities.manufacturing, false);
  assert.equal(solidIntent.capabilities.stl, false);
  assert.ok(Object.isFrozen(solidIntent));
  assert.doesNotMatch(moduleSource, /\bdocument\b|\bwindow\b|\bTHREE\b/);
  assert.doesNotMatch(moduleSource, /\bCSG\b|\bBSP\b/);
});

test("browser UMD captures canonical preview geometry and malformed input fails closed", () => {
  const browserGlobal = {};
  const context = vm.createContext({ globalThis: browserGlobal });
  vm.runInContext(previewSource, context, { filename: previewPath });
  vm.runInContext(moduleSource, context, { filename: modulePath });
  assert.equal(
    typeof browserGlobal.MEH3SolidIntent.buildSolidIntent,
    "function",
  );
  assert.equal(
    browserGlobal.MEH3SolidIntent.capabilities.exactSolid,
    false,
  );
  const refused = browserGlobal.MEH3SolidIntent.buildSolidIntent({});
  assert.equal(refused.ok, false);
  assert.equal(refused.result, null);
  assert.equal(refused.exactSolid, false);
  assert.equal(refused.manufacturing, false);
  assert.equal(refused.stl, false);
});

test("solid-intent manufacturing preflight remains an explicit refusal", () => {
  const result = solidIntent.manufacturingPreflight(
    "execute-exact-booleans",
  );
  assert.equal(result.ok, false);
  assert.equal(result.available, false);
  assert.equal(result.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(result.booleanExecuted, false);
  assert.equal(result.exactSolid, false);
  assert.equal(result.fabricationAudited, false);
  assert.equal(result.manufacturing, false);
  assert.equal(result.export, false);
  assert.equal(result.stl, false);
});
