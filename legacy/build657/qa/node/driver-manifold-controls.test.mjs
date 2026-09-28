import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

test("extended printed-manifold controls bind the canonical state schema", () => {
  for (const id of [
    "driverManifoldCtl",
    "driverMountMode",
    "driverManifoldExtendedCtl",
    "driverMountExtraMmRange",
    "driverMountExtraMm",
    "driverAxisBlendRange",
    "driverAxisBlend",
    "driverManifoldSummary",
    "driverManifoldDiagnostics",
  ]) assert.match(shell, new RegExp(`id="${id}"`), id);
  assert.match(
    shell,
    /driverMountMode:'shortest',driverMountExtraMm:0,driverAxisBlend:0/,
  );
  assert.match(shell, /MEH2\.twoWayDriverMountModes/);
  assert.match(shell, /MEH2\.twoWayDriverManifoldSchemaVersion/);
});

test("reach and axis are paired bounded controls and shortest hides extension", () => {
  assert.match(
    shell,
    /id="driverMountExtraMmRange" type="range"\s*min="0" max="250" step="0\.5"/,
  );
  assert.match(
    shell,
    /id="driverAxisBlendRange" type="range"\s*min="0" max="1" step="0\.01"/,
  );
  assert.match(shell, /wirePairedNumeric\('driverMountExtraMm'/);
  assert.match(shell, /wirePairedNumeric\('driverAxisBlend'/);
  assert.match(shell, /extended\.style\.display=isExtended\?'grid':'none'/);
  assert.match(shell, /if\(next==='shortest'\)S\.driverMountExtraMm=0/);
});

test("UI consumes the exact solid-field diagnostic, not only plan estimates", () => {
  assert.match(
    shell,
    /driverManifoldDiagnostics=field&&field\.driverManifoldDiagnostics\|\|null/,
  );
  assert.match(
    shell,
    /exact=visualTools&&visualTools\.driverManifoldDiagnostics\|\|\s*plan&&plan\.exact\|\|null/,
  );
  for (const witness of [
    "axis↔CD",
    "centerline",
    "effective",
    "path mismatch",
    "phase @ XO",
    "λ/4",
    "chamber LP",
    "Mach",
    "loss proxy",
  ]) assert.match(shell, new RegExp(witness), witness);
  assert.match(shell, /exact\.pass\?'EXACT PASS':'EXACT REFUSED'/);
  assert.match(
    shell,
    /summary\.className='evidence '\+\(exactCurrent&&!exact\.pass\s*\?\s*'exact-refused':''\)/,
  );
  assert.match(shell, /if\(exactCurrent&&!exact\.pass\)summary\.removeAttribute\('data-tier'\)/);
});

test("design report includes complete plan and exact swept-manifold records", () => {
  assert.match(shell, /driverManifoldReport=\{/);
  assert.match(shell, /exact:reportField\.driverManifoldDiagnostics\|\|null/);
  assert.match(shell, /driverManifold:driverManifoldReport/);
  assert.match(
    shell,
    /!driverManifoldReport\.exact\.pass\s*\?'refused'/,
  );
});
