#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const TARGET = process.env.MEH_DRIVER_ARRAY_QA_URL
  || "http://127.0.0.1:8520/shell.html?qa=driver-array-controls";
const SOURCE_ROOT = new URL("../../", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(String(error.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

try {
  const [shellSource, profileLawsSource, engineSource, twoWaySource] =
    await Promise.all([
      readFile(new URL("shell.html", SOURCE_ROOT), "utf8"),
      readFile(new URL("profile-laws.js", SOURCE_ROOT), "utf8"),
      readFile(new URL("engine.js", SOURCE_ROOT), "utf8"),
      readFile(new URL("twoway-core.js", SOURCE_ROOT), "utf8"),
    ]);
  const runtimeSource = shellSource
    .replace("/*__PROFILE_LAWS__*/", profileLawsSource)
    .replace("/*__ENGINE__*/", engineSource)
    .replace("/*__TWOWAY__*/", twoWaySource)
    .replace("/*__CAD__*/", "/* driver array UI QA runtime */");
  await page.route("**/shell.html?*", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: runtimeSource,
  }));
  await page.goto(TARGET, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForFunction(() => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__driverArrayUIQA?.canonicalAvailable
  ), null, { timeout: 30_000 });

  await page.evaluate(() => {
    const next = MEH2.migrateTwoWayState({
      ...S,
      ...MEH2.TWO_ARCH.panel.defaults,
      topo: "2way",
      twoArch: "panel",
      twoFamily: "panel",
      twoDesign: "arch:panel",
      tapBasis: "model",
      style: "angular",
      nW: 2,
      driverArrayMode: "auto",
      driverArrayRotationDeg: 0,
      mouthW: 32,
      requestedMouthW: 32,
      mouthCap: 64,
      wPre: "w5",
      odW: 13.76,
      dpW: 6.95,
      sdW: 91.6,
      vtcW: 35,
      xmW: 2.5,
    });
    for (const key of Object.keys(S)) delete S[key];
    Object.assign(S, next, { _smart2waySchema: 3 });
    rebuild();
  });
  await page.waitForFunction(() => (
    window.__driverArrayUIQA?.canonicalAvailable
    && window.__driverArrayUIQA.count === 2
    && window.__driverArrayUIQA.mode === "auto"
  ), null, { timeout: 30_000 });

  const twoAuto = await page.evaluate(() => ({
    qa: structuredClone(window.__driverArrayUIQA),
    mode: document.getElementById("driverArrayMode").value,
    rangeMax: Number(
      document.getElementById("driverArrayRotationDegRange").max,
    ),
    numberMax: Number(document.getElementById("driverArrayRotationDeg").max),
    presetDisplay: getComputedStyle(
      document.getElementById("driverArrayTwoPresets"),
    ).display,
    diagonalLabel:
      document.getElementById("driverArrayPresetDiag").textContent,
    note: document.getElementById("driverArrayPlacementNote").textContent,
    oldControls: [
      document.getElementById("panelAxis"),
      document.getElementById("radialRotation"),
    ],
  }));
  assert(twoAuto.mode === "auto", "Auto fit is not the default");
  assert(twoAuto.qa.periodDeg === 180, "two-driver period is not 180°");
  assert(twoAuto.rangeMax === 179.9 && twoAuto.numberMax === 179.9,
    "duplicate 180° endpoint is exposed");
  assert(twoAuto.presetDisplay === "grid", "two-driver presets are hidden");
  assert(twoAuto.qa.classifications.length === 2,
    "two-driver classifications are missing");
  assert(twoAuto.qa.presetAnglesDeg[0] === 0
      && Math.abs(twoAuto.qa.presetAnglesDeg[1] - 30) < 1e-9
      && twoAuto.qa.presetAnglesDeg[2] === 90,
    "face/seam preset angles are not canonical: "
      + twoAuto.qa.presetAnglesDeg.join(","));
  assert(Math.abs(twoAuto.qa.seamPresetDeg - 30) < 1e-9,
    "the rectangular panel seam was not derived at 30°");
  assert(twoAuto.qa.seamPresetMinimumGapM > 0,
    "the derived seam preset is not package-legal");
  assert(twoAuto.diagonalLabel.trim() === "DIAGONAL / SEAM · 30°",
    "the diagonal button does not show its solved seam angle");
  assert(twoAuto.oldControls.every((control) => control === null),
    "legacy placement control remains in the DOM");

  await page.locator("#driverArrayPresetDiag").click();
  await page.waitForFunction(() => (
    S.driverArrayMode === "manual"
    && Math.abs(S.driverArrayRotationDeg - 30) < 1e-9
    && window.__solved?.ev?.plan?.arrayPlacement?.mode === "manual"
    && Math.abs(
      window.__solved.ev.plan.arrayPlacement.solvedRotationDeg - 30,
    ) < 1e-9
    && window.__driverArrayUIQA?.classifications?.every(
      (item) => item.kind === "seam-corner",
    )
  ), null, { timeout: 30_000 });
  const diagonalState = await page.evaluate(() => ({
    stateMode: S.driverArrayMode,
    stateRotationDeg: S.driverArrayRotationDeg,
    solvedMode: window.__solved.ev.plan.arrayPlacement.mode,
    solvedRotationDeg:
      window.__solved.ev.plan.arrayPlacement.solvedRotationDeg,
    placementLabel: window.__driverArrayUIQA.placementLabel,
    classifications: window.__driverArrayUIQA.classifications.map(
      (item) => item.kind,
    ),
    note: document.getElementById("driverArrayPlacementNote").textContent,
  }));
  assert(
    diagonalState.stateRotationDeg === twoAuto.qa.seamPresetDeg
      && diagonalState.solvedRotationDeg === twoAuto.qa.seamPresetDeg,
    "the clicked seam preset diverged from the solver-owned angle",
  );
  assert(diagonalState.placementLabel === "SEAM / CORNER"
      && diagonalState.classifications.join(",")
        === "seam-corner,seam-corner",
    "the derived seam preset did not retain two corner-owned drivers");
  await page.locator("#driverArrayPresetTB").click();
  await page.waitForFunction(() => (
    S.driverArrayMode === "manual"
    && S.driverArrayRotationDeg === 90
    && window.__solved?.ev?.plan?.arrayPlacement?.mode === "manual"
    && window.__solved.ev.plan.arrayPlacement.solvedRotationDeg === 90
  ), null, { timeout: 30_000 });
  await page.locator("#driverArrayPresetLR").click();
  await page.waitForFunction(() => (
    S.driverArrayMode === "manual"
    && S.driverArrayRotationDeg === 0
    && window.__solved?.ev?.plan?.arrayPlacement?.solvedRotationDeg === 0
  ), null, { timeout: 30_000 });

  await page.evaluate(() => {
    S.nW = 6;
    applyAdaptiveState("nW");
    rebuild();
  });
  await page.waitForFunction(() => (
    window.__driverArrayUIQA?.count === 6
    && window.__driverArrayUIQA?.periodDeg === 60
  ), null, { timeout: 30_000 });
  const six = await page.evaluate(() => ({
    qa: structuredClone(window.__driverArrayUIQA),
    rangeMax: Number(
      document.getElementById("driverArrayRotationDegRange").max,
    ),
    presetDisplay: getComputedStyle(
      document.getElementById("driverArrayTwoPresets"),
    ).display,
  }));
  assert(six.rangeMax === 59.9, "six-driver half-open interval is wrong");
  assert(six.presetDisplay === "none",
    "binary presets leaked into the six-driver array");
  assert(six.qa.classifications.length === 6,
    "six-driver classifications are missing");

  await page.locator("#driverArrayMode").selectOption("auto");
  await page.waitForFunction(() => (
    S.driverArrayMode === "auto"
    && window.__solved?.ev?.plan?.arrayPlacement?.mode === "auto"
  ), null, { timeout: 30_000 });
  await page.locator("#driverArrayMode").selectOption("manual");
  await page.waitForFunction(() => (
    S.driverArrayMode === "manual"
    && window.__solved?.ev?.plan?.arrayPlacement?.mode === "manual"
  ), null, { timeout: 30_000 });
  await page.locator("#driverArrayRotationDeg").evaluate((element) => {
    element.value = "17.4";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Math.abs(S.driverArrayRotationDeg - 17.4) < 1e-9
    && Math.abs(
      window.__solved?.ev?.plan?.arrayPlacement?.solvedRotationDeg - 17.4,
    ) < 1e-9
  ), null, { timeout: 30_000 });

  const final = await page.evaluate(() => ({
    qa: structuredClone(window.__driverArrayUIQA),
    note: document.getElementById("driverArrayPlacementNote").textContent,
    range: Number(document.getElementById("driverArrayRotationDegRange").value),
    number: Number(document.getElementById("driverArrayRotationDeg").value),
  }));
  assert(final.range === 17.4 && final.number === 17.4,
    "paired rotation fields did not synchronize");
  assert(/MANUAL MIXED \/ INTERMEDIATE SYMMETRIC ARRAY/.test(final.note)
      && /solved 17\.4°/.test(final.note),
    "live solved placement note is stale: " + final.note);
  assert(final.qa.classifications.every((item) => [
    "face-center",
    "seam-corner",
    "intermediate",
    "smooth-surface",
  ].includes(item.kind)), "unsupported placement classification");
  assert(browserErrors.length === 0,
    `browser errors:\n${browserErrors.join("\n")}`);
  console.log(
    "DRIVER ARRAY CONTROLS BROWSER PASS"
      + " · AUTO/manual · LR/derived seam/TB"
      + " · 6-driver periodic rotation",
  );
} finally {
  await browser.close();
}
