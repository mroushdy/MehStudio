#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "./case-loader.mjs";

const shell = fs.readFileSync(path.join(projectRoot, "shell.html"), "utf8");

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is unterminated`);
}

test("FULL keeps six-driver roots while its thin preview occludes them from horn-side cameras", () => {
  const render3d = extractNamedFunction(shell, "render3d");
  const renderTwoWay = extractNamedFunction(shell, "renderTwoWay");

  assert.match(render3d, /hornSideDriverOcclusion/);
  assert.match(
    render3d,
    /camera\.position\.clone\(\)\.sub\(face\)\.dot\(normal\)<=0/,
    "camera-side visibility is not derived from the solved mount plane",
  );
  assert.match(render3d, /object\.visible=!hornSide/);

  assert.match(
    renderTwoWay,
    /body\.userData\.hornSideDriverOcclusion=\{[\s\S]*driverFace:P3\(spec\.bearingFace\)\.toArray\(\),[\s\S]*mountNormal:P3\(spec\.n\)\.normalize\(\)\.toArray\(\)/,
    "LF body roots do not carry the solved bearing datum and mount normal",
  );
  assert.match(
    renderTwoWay,
    /panelMountQA\.fullHornSideDriverOcclusionCount\+\+/,
    "configured FULL roots are not counted",
  );
  assert.match(
    renderTwoWay,
    /fullDriversOccludedFromHornSide:view!=='full'\|\|[\s\S]*fullHornSideDriverOcclusionCount===P\.drivers\.length/,
    "the six-driver diagnostic can silently collapse to fewer roots",
  );
});

test("FULL uses canonical fragment cuts while inspection views keep open lumen walls", () => {
  const renderTwoWay = extractNamedFunction(shell, "renderTwoWay");
  assert.match(
    renderTwoWay,
    /\(view==='taps'\|\|view==='full'\)[\s\S]{0,120}\?tapDepthMat:apertureMat/,
  );
  assert.match(
    renderTwoWay,
    /tunnel\.visible=selected&&!focusedMount&&[\s\S]{0,100}\(noDriverPhysicalWall\|\|inspect\|\|view==='taps'\|\|focusedCell\)/,
    "FULL must not composite a helper tunnel over the real driver cone",
  );
  assert.match(
    renderTwoWay,
    /tapPassageVisual\(q,lumenInset,lumenRear,[\s\S]{0,220}null,'tap-interface'\)/,
    "FULL gained a false terminal cap instead of an open passage",
  );
});
