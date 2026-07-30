import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

test("exact two-way export states truthful integrated cavity ownership", () => {
  assert.match(shell, /function twoWayExportCavityOwnership\(state,plan\)/);
  assert.match(
    shell,
    /front-chamber\/cone-relief','canonical-tap-lumens',\s*'driver-fastener-holes'/,
  );
  assert.match(shell, /one-piece integrated horn owns/);
  assert.match(shell, /every cut is already subtracted from the exact/);
});

test("cartridge export declares cutter and retention ownership per part", () => {
  assert.match(shell, /horn and every registered [^']*'\s*\+'cartridge share the same canonical tap-lumen cuts/);
  assert.match(shell, /each cartridge owns [^']*'\s*\+'its cone relief, driver-fastener holes, M4 clearance bores/);
  assert.match(shell, /horn owns the mating heat-set insert pockets/);
  assert.match(shell, /Every cut is already present in its downloaded part/);
});

test("design report serializes exact export ownership and forbids duplicate subtraction", () => {
  assert.match(shell, /const cavityOwnership=detachable\?\{/);
  assert.match(shell, /preCut:true,manualSubtractionRequired:false/);
  assert.match(shell, /cutterFileRequired:false/);
  assert.match(shell, /canonical horn-side tap-lumen cuts/);
  assert.match(shell, /matching canonical tap-lumen cuts/);
  assert.match(shell, /fabrication:\{[\s\S]*integratedStructuralPlate,cavityOwnership\}/);
});

test("two-way success cannot resurrect the obsolete manual subtraction warning", () => {
  assert.match(
    shell,
    /twoWayExportCavityOwnership\(r\.S,r\.ev\.plan\)/,
  );
  assert.match(shell, /no cutter file or hidden subtraction step/);
  assert.doesNotMatch(shell, /THE SHELL STL HAS NO PORT OPENINGS/);
  assert.doesNotMatch(shell, /pre-cut shell is a queued slice/);
});

test("legacy split output labels its separate negative-tool owner explicitly", () => {
  assert.match(shell, /LEGACY SPLIT EXPORT/);
  assert.match(shell, /separate tap-cutters file is the explicitly owned negative tool/);
});
