import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");
const parityDoc = fs.readFileSync(
  path.join(appRoot, "docs/build649-rosse-control-parity.md"),
  "utf8",
);

test("pattern-control target is a bounded aperture-sizing solve, not a coverage claim", () => {
  const square = engine.patternControlSizing({
    coverageH: 90,
    coverageV: 90,
    targetHz: 800,
    mouthCapIn: 64,
    stepIn: 1,
  });
  assert.equal(square.ok, true);
  assert.equal(square.coverageClaim, false);
  assert.equal(square.sizingOnly, true);
  assert.equal(square.aspectSource, "coverage-derived");
  assert.ok(Math.abs(square.aspect - 1) < 1e-12);
  assert.equal(square.requiredWidthIn, 14);
  assert.equal(square.limitingPlane, "H+V");

  const wide = engine.patternControlSizing({
    coverageH: 90,
    coverageV: 60,
    targetHz: 800,
    mouthCapIn: 64,
    stepIn: 1,
  });
  assert.equal(wide.ok, true);
  assert.ok(Math.abs(
    wide.aspect - Math.tan(Math.PI / 6) / Math.tan(Math.PI / 4),
  ) < 1e-12);
  assert.equal(wide.requiredWidthIn, 36);
  assert.equal(wide.limitingPlane, "V");
  assert.ok(wide.requiredHeightInRaw > wide.horizontalWidthInRaw);
});

test("pattern target refuses above the mouth cap and validation fails closed", () => {
  const impossible = engine.patternControlSizing({
    coverageH: 40,
    coverageV: 30,
    targetHz: 200,
    mouthCapIn: 64,
    stepIn: 1,
  });
  assert.equal(impossible.ok, false);
  assert.equal(impossible.code, "PATTERN_TARGET_EXCEEDS_MOUTH_CAP");
  assert.ok(impossible.requiredWidthIn > 64);
  assert.match(impossible.reason, /requires.*mouth cap/i);

  for (const input of [
    { coverageH: 0, coverageV: 60, targetHz: 800, mouthCapIn: 64 },
    { coverageH: 90, coverageV: NaN, targetHz: 800, mouthCapIn: 64 },
    { coverageH: 90, coverageV: 60, targetHz: 0, mouthCapIn: 64 },
    { coverageH: 90, coverageV: 60, targetHz: 800, mouthCapIn: -1 },
  ]) {
    const result = engine.patternControlSizing(input);
    assert.equal(result.ok, false);
    assert.equal(result.code, "PATTERN_TARGET_INPUT_INVALID");
  }
});

test("advanced drawer exposes every effective owner and the retained R-OSSE contract", () => {
  for (const id of [
    "profileAdvancedCtl",
    "profileThroatShape",
    "profileThroatLabel",
    "profileThroatDiameter",
    "profileCoverageReadout",
    "profilePatternHz",
    "profileSizeMouth",
    "profileAspect",
    "profileSectionReadout",
    "profileMouthTreatment",
    "rosseProfileCtl",
    "rosseProfileNote",
    "rosseThroatAngle",
    "rosseK",
    "rosseApexRadiusFactor",
    "rosseB",
    "rosseM",
    "rosseQ",
    "profileSizingNote",
    "profileOneWayNote",
  ]) {
    assert.match(shell, new RegExp(`id=["']${id}["']`), `${id} is missing`);
  }
  assert.match(shell, /Qe · ENDPOINT FACTOR/);
  assert.match(shell, /OS-SE Qe IS NOT R-OSSE Q/);
  assert.match(shell, /SIZE MOUTH TO TARGET/);
  assert.match(shell, /RETAINED PUBLISHED FORWARD BODY/);
  assert.match(shell, /FLAT-BAFFLE TRUNCATION BEFORE ROLLBACK/);
  assert.match(shell, /NATIVE ROLLBACK NOT INCLUDED/);
  assert.match(shell, /SHARED OUTER PROFILE.*C0\/C1\/C2 JOIN/i);
  assert.doesNotMatch(shell, /profileRosse[BM Q].*REFUSED/i);

  const treatmentStart = shell.indexOf('<select id="profileMouthTreatment"');
  const treatmentEnd = shell.indexOf("</select>", treatmentStart);
  const treatment = shell.slice(treatmentStart, treatmentEnd);
  assert.match(treatment, /value="flat"/);
  assert.match(treatment, /disabled/);
  assert.doesNotMatch(treatment, /value="roll"[^>]*selected/);
});

test("fixed-scale meridian witness is solved from stations and changes with the selected law", () => {
  const state = {
    ...engine.TWO_ARCH.radial.defaults,
    topo: "2way",
    style: "smooth",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    profileLaw: "conical",
    throat: 1.4,
    td: 1.4,
    covH: 90,
    covV: 60,
    mouthW: 36,
    mouthCap: 64,
  };
  const conical = engine.profileMeridianWitness(engine.stations(state));
  const classic = engine.profileMeridianWitness(engine.stations({
    ...state,
    profileLaw: "classicOS",
  }));
  assert.equal(conical.ok, true);
  assert.equal(classic.ok, true);
  assert.notEqual(conical.profileHash, classic.profileHash);
  assert.notEqual(conical.selectedPath, classic.selectedPath);
  assert.match(conical.scaleLabel, /fixed/i);
  for (const id of [
    "profileMeridianWitness",
    "profileMeridianSketch",
    "profileMeridianReference",
    "profileMeridianSelected",
    "profileMeridianReadout",
  ]) {
    assert.match(shell, new RegExp(`id=["']${id}["']`));
  }
  assert.match(shell, /DASHED = ENDPOINT-MATCHED CONICAL REFERENCE/);
  assert.match(shell, /MEH2\.profileMeridianWitness\(st/);
});

test("parity documentation distinguishes effective, derived, sizing, and refused controls", () => {
  for (const phrase of [
    "Throat shape",
    "Pattern control `f0`",
    "`K` throat expansion",
    "`S` termination flare",
    "`N` termination exponent",
    "H/V aspect",
    "Mouth wrap / rollover radius",
    "R-OSSE `B` bending",
    "R-OSSE `M` apex shift",
    "R-OSSE `Q` throat shape",
    "PATTERN_TARGET_EXCEEDS_MOUTH_CAP",
  ]) {
    assert.match(parityDoc, new RegExp(
      phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    ));
  }
  assert.match(parityDoc, /not a measured directivity claim/i);
  assert.match(parityDoc, /protected driver-fit subsystem/i);
});
