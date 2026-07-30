import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

test("one canonical array placement UI replaces the panel/radial aliases", () => {
  for (const id of [
    "driverArrayCtl",
    "driverArrayMode",
    "driverArrayRotationDegRange",
    "driverArrayRotationDeg",
    "driverArrayTwoPresets",
    "driverArrayPresetLR",
    "driverArrayPresetDiag",
    "driverArrayPresetTB",
    "driverArrayPlacementNote",
  ]) assert.match(shell, new RegExp(`id="${id}"`), id);
  assert.doesNotMatch(shell, /id="panelAxis"/);
  assert.doesNotMatch(shell, /id="radialRotation"/);
  assert.doesNotMatch(shell, /normalizeTwoWayPanelAxis/);
  assert.doesNotMatch(shell, /S\.panelAxis|S\.radialRotation/);
});

test("rotation controls expose only the half-open unique interval", () => {
  assert.match(
    shell,
    /id="driverArrayRotationDegRange" type="range"\s*min="0" max="179\.9" step="0\.1"/,
  );
  assert.match(
    shell,
    /halfOpenMax=Math\.max\(0,period-controlStep\)/,
  );
  assert.match(
    shell,
    /normalizeTwoWayDriverArrayRotation\(\s*degrees,S\.nW\)/,
  );
  assert.match(shell, /wirePairedNumeric\('driverArrayRotationDeg'/);
});

test("auto fit is the default and manual state is canonical", () => {
  assert.match(
    shell,
    /nW:2,npW:2,driverArrayMode:'auto',driverArrayRotationDeg:0/,
  );
  assert.match(shell, /option value="auto">auto fit/);
  assert.match(shell, /MEH2\.twoWayDriverArrayModes\.includes/);
  assert.match(shell, /MEH2\.twoWayDriverArraySchemaVersion/);
  assert.match(shell, /P\.arrayPlacement/);
  assert.match(shell, /classifications:classifications\.map/);
});

test("two-driver presets expose face-centered and diagonal/seam orientations", () => {
  assert.match(shell, /if\(presets\)presets\.style\.display=count===2\?'grid':'none'/);
  assert.match(shell, /leftRight\.onclick=applyPreset\(0\)/);
  assert.match(
    shell,
    /seamPresetDeg=record&&Number\.isFinite\(\s*\+record\.seamPresetRotationDeg\)/,
  );
  assert.match(
    shell,
    /diagonal\.onclick=seamPresetDeg===null\s*\?null:applyPreset\(seamPresetDeg\)/,
  );
  assert.match(shell, /DIAGONAL \/ SEAM · UNAVAILABLE/);
  assert.match(shell, /topBottom\.onclick=applyPreset\(90\)/);
  assert.match(
    shell,
    /S\.driverArrayMode='manual';\s*S\.driverArrayRotationDeg=\s*MEH2\.normalizeTwoWayDriverArrayRotation\(degrees,2\)/,
  );
});

test("solver handoff identifies the previous viewport geometry", () => {
  assert.match(
    shell,
    /VIEWPORT SHOWS THE PREVIOUS SOLUTION UNTIL COMPLETE/,
  );
  assert.match(shell, /placementLabel=.*seam-corner/s);
  assert.match(shell, /'FACE-CENTERED'/);
});

test("advanced diagnostics and design report use the solved placement record", () => {
  assert.match(shell, /\['LF ARRAY'[\s\S]*P\.arrayPlacement\.solvedRotationDeg/);
  assert.match(shell, /arrayPlacement:\{\s*schemaVersion:P\.arrayPlacement\.schemaVersion/);
  assert.match(shell, /kind:item\.kind/);
});
