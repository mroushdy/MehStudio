import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");
const browserInspection = fs.readFileSync(
  path.join(appRoot, "qa/browser/render-inspection.mjs"),
  "utf8",
);

function namedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is unterminated`);
}

test("DOM exposes a distinct complete driver-cell inspection target", () => {
  assert.match(
    shell,
    /<option value=["']cell["']>INSPECT: COMPLETE DRIVER CELL — NO DRIVER<\/option>/,
  );
  assert.match(
    shell,
    /id=["']mountFocusSel["'][^>]+aria-label=["']Mounting plate or driver-cell inspection target["']/,
  );
  assert.match(shell, /BOOT_VIEW===['"]cell['"]/);
  assert.match(shell, /o\.value===['"]cell['"]/);
});

test("complete-cell camera is deterministic and looks into the empty relief", () => {
  const source = namedFunction(shell, "applyDriverCellInspectionCamera");
  assert.match(source, /mountFocusIndex\(P\)/);
  assert.match(source, /P3\(d\.mountN\)\.normalize\(\)/);
  assert.match(source, /P3\(d\.cavInner\|\|d\.surface\)/);
  assert.match(source, /P3\(d\.driverFace\)/);
  assert.match(source, /V3D\.tgt\.copy/);
  assert.match(shell, /V3D\.cellCameraDirty=false/);
});

test("renderer isolates one solved cell with its physical interfaces and no driver", () => {
  const source = namedFunction(shell, "renderTwoWay");
  for (const token of [
    "focusedCell",
    "isolatedDriverInspection",
    "driver-cell-bearing-face",
    "driver-cell-tap-interface",
    "visibleMountLandCount",
    "visibleGasketCount",
    "visibleTapInterfaceCount",
    "visibleDriverPocketRootCount",
    "visibleRetentionFeatureCount",
    "completeCellHasNoDriver",
    "completeCellHasMount",
    "completeCellHasBearingFace",
    "completeCellHasGasket",
    "completeCellHasTapPaths",
    "completeCellHasBoltDetails",
    "completeCellHasOwnedRetention",
  ]) {
    assert.match(source, new RegExp(token), `${token} contract is missing`);
  }
  assert.match(source, /horn\.visible=!isolatedDriverInspection/);
  assert.match(
    source,
    /retentionFeatureVisual\(tool,moduleMat,apertureMat,\s*insertMarkerMat,retentionPass,focusedCell\?['"]module['"]/,
  );
  assert.match(source, /if\(\[['"]full['"],['"]ghost['"],['"]section['"]\]\.includes\(view\)\)/);
  assert.doesNotMatch(
    source,
    /\[['"]full['"],['"]ghost['"],['"]cell['"]/,
    "complete-cell inspection instantiates a driver body",
  );
});

test("browser inspection captures and gates the complete isolated cell", () => {
  assert.match(browserInspection, /id:\s*['"]complete-driver-cell-1['"]/);
  assert.match(browserInspection, /view:\s*['"]cell['"]/);
  assert.match(browserInspection, /mountFocus:\s*['"]0['"]/);
  for (const invariant of [
    "completeCellHasNoDriver",
    "completeCellHasMount",
    "completeCellHasBearingFace",
    "completeCellHasGasket",
    "completeCellHasTapPaths",
    "completeCellHasBoltDetails",
    "completeCellHasOwnedRetention",
  ]) {
    assert.match(
      browserInspection,
      new RegExp(`mount\\.invariants\\?\\.${invariant}`),
      `${invariant} browser gate is missing`,
    );
  }
  assert.match(browserInspection, /scene\.visibleTags\[['"]driver-cell-bearing-face['"]\]/);
  assert.match(browserInspection, /scene\.visibleTagRoots\[['"]driver-cell-tap-interface['"]\]/);
});
