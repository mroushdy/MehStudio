import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");

test("one-way raw datasheet geometry is collapsed under one advanced drawer", () => {
  const start = shell.indexOf('<details class="advanced" id="oneDriverGeometryCtl"');
  const end = shell.indexOf('<div id="coaxCtl"', start);
  assert.ok(start >= 0 && end > start);
  const drawer = shell.slice(start, end);
  assert.doesNotMatch(
    shell.slice(start, shell.indexOf(">", start) + 1),
    /\bopen\b/,
  );
  assert.match(drawer, /ADVANCED DRIVER GEOMETRY \/ DATASHEET/);
  assert.match(drawer, /id="coneDims"/);
  assert.match(drawer, /id="calipers"/);
  for (const id of [
    "dimFrameD",
    "dimConeD",
    "dimConeDep",
    "dimCdT",
    "dimWgD",
    "dimThroatT",
    "dimBodyDep",
    "dimSd",
    "dimXmax",
    "coneDimsSrc",
    "coneSrc",
  ]) {
    assert.match(drawer, new RegExp(`id="${id}"`));
  }
  assert.match(shell.slice(0, start), /id="oneDriverSummary"/);
});

test("preset geometry is locked and Custom explicitly enables override", () => {
  assert.match(shell, /custom=S\.wPre===['"]custom['"]/);
  assert.match(shell, /el\.disabled=!custom/);
  assert.match(shell, /DATASHEET LOCKED/);
  assert.match(shell, /CUSTOM GEOMETRY/);
  assert.match(shell, /S\.wPre!==['"]custom['"]/);
});

test("cone-port controls stay in the main flow and two-way raw metadata is already nested", () => {
  const drawerEnd = shell.indexOf("</details>",
    shell.indexOf('id="oneDriverGeometryCtl"'));
  const ports = shell.indexOf('id="coaxCtl"');
  assert.ok(ports > drawerEnd);
  assert.match(shell.slice(0, ports), /id="oneInternalCdCtl"/);
  assert.match(shell.slice(0, ports), /PRINTED HORN THROAT ID Ø/);
  assert.match(shell.slice(0, ports), /THROAT COLLAR T/);
  assert.match(shell.slice(ports, ports + 1600), /id="coaxTaps"/);
  assert.match(shell.slice(ports, ports + 1600), /id="coaxXO"/);
  assert.match(
    shell,
    /<details class="advanced" id="twoDriverCellCtl"/,
  );
});
