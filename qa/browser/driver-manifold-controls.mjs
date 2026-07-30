#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const TARGET = process.env.MEH_DRIVER_MANIFOLD_QA_URL
  || "http://127.0.0.1:8520/shell.html?qa=driver-manifold-controls";
const OUTPUT = process.env.MEH_DRIVER_MANIFOLD_QA_OUTPUT || "";
const SOURCE_ROOT = new URL("../../", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function distance(a, b) {
  return Math.hypot(...a.map((value, index) => value - b[index]));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(String(error.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

try {
  if (OUTPUT) await mkdir(OUTPUT, { recursive: true });
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
    .replace("/*__CAD__*/", "/* driver manifold browser QA runtime */");
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
    && typeof S !== "undefined"
    && typeof MEH2 !== "undefined"
  ), null, { timeout: 30_000 });

  await page.evaluate(() => {
    const next = MEH2.migrateTwoWayState({
      ...S,
      ...MEH2.TWO_ARCH.panel.defaults,
      topo: "2way",
      _smart2waySchema: 3,
      twoArch: "panel",
      twoFamily: "panel",
      twoDesign: "arch:panel",
      tapBasis: "model",
      style: "angular",
      profileLaw: "conical",
      sectionFamily: "superellipse",
      sectionLameN: 12,
      seN: 12,
      covH: 90,
      covV: 60,
      mouthW: 32,
      requestedMouthW: 32,
      mouthCap: 64,
      wallT: 0.018,
      td: 1.4,
      throat: 1.4,
      cdSel: "dcx464",
      cdFloor: 300,
      cdDepth: 2.4,
      wPre: "w5",
      odW: 13.76,
      dpW: 6.95,
      sdW: 91.6,
      vtcW: 35,
      xmW: 2.5,
      nW: 2,
      npW: 2,
      shW: "slot",
      tapShapeW: "slot",
      twoXO: 430,
      tapCRW: 9,
      driverCellConstruction: "integrated",
      coneProfileMode: "flat",
      coneDepthMm: 0,
      coneDepthKnown: false,
      coneAxialClearanceMm: 0,
      coneRadialClearanceMm: 0,
      frameW: "round",
      boltNW: 4,
      boltDW: 5,
      gasketW: 1.6,
      driverMountMode: "shortest",
      driverMountExtraMm: 0,
      driverAxisBlend: 0,
      driverArrayMode: "manual",
      driverArrayRotationDeg: 0,
    });
    for (const key of Object.keys(S)) delete S[key];
    Object.assign(S, next, { _smart2waySchema: 3 });
    V3D.view = "nodrv";
    const view = document.getElementById("viewSel");
    if (view) view.value = "nodrv";
    rebuild();
  });
  await page.waitForFunction(() => (
    window.__driverManifoldUIQA?.mode === "shortest"
    && window.__driverManifoldUIQA?.exactAvailable === true
    && window.__driverManifoldUIQA?.pass === true
    && window.__solved?.infeasible === false
  ), null, { timeout: 30_000 }).catch(async (error) => {
    const diagnostic = await page.evaluate(() => ({
      ui: window.__driverManifoldUIQA || null,
      infeasible: window.__solved?.infeasible ?? null,
      reason: window.__solved?.reason || null,
      status: document.getElementById("status")?.textContent || null,
    }));
    throw new Error(
      `${error.message}\nshortest-path diagnostic: ${JSON.stringify(diagnostic)}`,
    );
  });

  const shortest = await page.evaluate(() => ({
    state: {
      mode: S.driverMountMode,
      extraMm: S.driverMountExtraMm,
      axisBlend: S.driverAxisBlend,
    },
    faces: window.__solved.ev.plan.drivers.map((driver) =>
      driver.driverFace.slice()),
    axes: window.__solved.ev.plan.drivers.map((driver) =>
      driver.mountN.slice()),
    exact: structuredClone(window.__driverManifoldUIQA.exact),
    summary: document.getElementById("driverManifoldSummary").textContent,
    extendedDisplay: getComputedStyle(
      document.getElementById("driverManifoldExtendedCtl"),
    ).display,
  }));
  assert(shortest.state.mode === "shortest"
      && shortest.state.extraMm === 0,
    "shortest-path baseline did not load");
  assert(shortest.extendedDisplay === "none",
    "shortest mode exposes extension-only controls");
  assert(shortest.exact.pass === true && /EXACT PASS/.test(shortest.summary),
    "shortest exact audit is not shown");

  await page.locator("#driverMountMode").selectOption("extended-manifold");
  await page.waitForFunction(() => (
    S.driverMountMode === "extended-manifold"
    && window.__driverManifoldUIQA?.mode === "extended-manifold"
    && window.__driverManifoldUIQA?.exactAvailable === true
  ), null, { timeout: 30_000 });
  await page.locator("#driverMountExtraMm").evaluate((element) => {
    element.value = "25";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Math.abs(S.driverMountExtraMm - 25) < 1e-9
    && Math.abs(
      window.__driverManifoldUIQA?.exact?.extraReachM - 0.025
    ) < 1e-9
  ), null, { timeout: 30_000 });
  await page.locator("#driverAxisBlend").evaluate((element) => {
    element.value = "0.5";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Math.abs(S.driverAxisBlend - 0.5) < 1e-9
    && window.__driverManifoldUIQA?.exactAvailable === true
    && window.__driverManifoldUIQA?.pass === true
    && window.__solved?.infeasible === false
  ), null, { timeout: 30_000 }).catch(async (error) => {
    const diagnostic = await page.evaluate(() => ({
      ui: window.__driverManifoldUIQA || null,
      infeasible: window.__solved?.infeasible ?? null,
      reason: window.__solved?.reason || null,
    }));
    throw new Error(
      `${error.message}\nextended-manifold diagnostic: ${JSON.stringify(diagnostic)}`,
    );
  });

  const extended = await page.evaluate(() => ({
    state: {
      mode: S.driverMountMode,
      extraMm: S.driverMountExtraMm,
      axisBlend: S.driverAxisBlend,
    },
    faces: window.__solved.ev.plan.drivers.map((driver) =>
      driver.driverFace.slice()),
    axes: window.__solved.ev.plan.drivers.map((driver) =>
      driver.mountN.slice()),
    exact: structuredClone(window.__driverManifoldUIQA.exact),
    plan: structuredClone(window.__solved.ev.plan.driverManifold),
    summary: {
      text: document.getElementById("driverManifoldSummary").textContent,
      className: document.getElementById("driverManifoldSummary").className,
      tier: document.getElementById("driverManifoldSummary")
        .getAttribute("data-tier"),
    },
    details: document.getElementById("driverManifoldDiagnostics").textContent,
    controls: {
      extraRange: Number(
        document.getElementById("driverMountExtraMmRange").value,
      ),
      extraNumber: Number(
        document.getElementById("driverMountExtraMm").value,
      ),
      blendRange: Number(
        document.getElementById("driverAxisBlendRange").value,
      ),
      blendNumber: Number(
        document.getElementById("driverAxisBlend").value,
      ),
      extendedDisplay: getComputedStyle(
        document.getElementById("driverManifoldExtendedCtl"),
      ).display,
    },
    mount: structuredClone(window.__panelMountQA),
    plate: structuredClone(window.__integratedPlatePreviewQA),
  }));
  assert(extended.controls.extendedDisplay === "grid",
    "extended controls remain hidden");
  assert(extended.controls.extraRange === 25
      && extended.controls.extraNumber === 25,
    "paired manifold-reach controls diverged");
  assert(extended.controls.blendRange === 0.5
      && extended.controls.blendNumber === 0.5,
    "paired axis-blend controls diverged");
  assert(extended.plan.extensionHonored === true
      && Math.abs(extended.plan.extraReachM - 0.025) < 1e-9,
    "canonical plan did not honor the 25 mm extension");
  assert(extended.exact.pass === true
      && extended.exact.extensionHonored === true,
    "exact swept manifold did not pass");
  assert(extended.exact.drivers.length === 2,
    "exact per-driver manifold records are missing");
  assert(extended.exact.drivers.every((driver) => (
    Number.isFinite(driver.centerlineLengthM)
    && Number.isFinite(driver.effectiveLengthM)
    && Number.isFinite(driver.phaseAtCrossoverDeg)
    && Number.isFinite(driver.quarterWaveHz)
    && Number.isFinite(driver.lowPassHz)
    && Number.isFinite(driver.localPathMismatchM)
    && Number.isFinite(driver.tapMach)
    && Number.isFinite(driver.lossProxy)
  )), "exact acoustic/manufacturing metrics are incomplete");
  assert(extended.exact.drivers.every((driver) =>
    driver.axisToCdDeg > shortest.exact.drivers[driver.index].axisToCdDeg + 20),
  "axis blend did not move the physical driver axis");
  assert(extended.exact.drivers.every((driver) =>
    driver.centerlineLengthM
      > shortest.exact.drivers[driver.index].centerlineLengthM + 0.02),
  "extension did not lengthen the canonical swept path");
  assert(extended.faces.every((face, index) =>
    distance(face, shortest.faces[index]) > 0.02),
  "extension did not move the solved driver bearing datum");
  assert(extended.mount?.canonicalVisualToolsComplete === true
      && extended.mount?.visibleMountLandCount === 2,
    "extended no-driver mount preview is incomplete");
  assert(extended.plate?.complete === true
      && extended.plate?.toolCount === 2,
    "extended structural plate manifest is incomplete");
  assert(/EXACT PASS/.test(extended.summary.text)
      && extended.summary.tier === "derived"
      && !extended.summary.className.includes("exact-refused"),
    "passing exact manifold is mislabeled");
  for (const witness of [
    "actual axis↔CD",
    "centerline",
    "effective",
    "path mismatch",
    "phase @ XO",
    "λ/4",
    "chamber LP",
    "Mach",
    "loss proxy",
  ]) assert(extended.details.includes(witness),
    `exact details omit ${witness}`);

  await page.locator("#viewSel").selectOption("cell");
  await page.waitForFunction(() => (
    V3D.view === "cell"
    && window.__panelMountQA?.completeCellInspection === true
    && window.__panelMountQA?.focusedDriverIndex === 0
    && window.__panelMountQA?.invariants?.completeCellHasNoDriver === true
    && window.__panelMountQA?.invariants?.completeCellHasMount === true
    && window.__panelMountQA?.invariants?.completeCellHasBearingFace === true
    && window.__panelMountQA?.invariants?.completeCellHasGasket === true
    && window.__panelMountQA?.invariants?.completeCellHasTapPaths === true
    && window.__panelMountQA?.invariants?.completeCellHasBoltDetails === true
  ), null, { timeout: 30_000 });
  const cellScene = await page.evaluate(() => {
    const root = V3D.group;
    const visible = (object) => {
      for (let node = object; node; node = node.parent) {
        if (node.visible === false) return false;
        if (node === root) return true;
      }
      return false;
    };
    const roots = {};
    root.traverse((object) => {
      if (!visible(object)) return;
      const tag = object.userData?.tag;
      if (!tag || object.parent?.userData?.tag === tag) return;
      roots[tag] = (roots[tag] || 0) + 1;
    });
    return {
      roots,
      expectedTaps: window.__panelMountQA.focusedExpectedTapCount,
      bearingOwners: window.__panelMountQA.mountRoots.find(
        (item) => item.driverIndex
          === window.__panelMountQA.focusedDriverIndex,
      )?.bearingFaceOwnerCount || 0,
    };
  });
  assert((cellScene.roots.driver || 0) === 0
      && (cellScene.roots.shell || 0) === 0,
    "focused empty cell leaks a driver or duplicate horn layer");
  assert((cellScene.roots["driver-cell-bearing-face"] || 0) === 1
      && cellScene.bearingOwners === 1,
    "focused cell has duplicate or missing bearing-face ownership");
  assert(
    (cellScene.roots["driver-cell-tap-interface"] || 0)
      === cellScene.expectedTaps,
    "focused cell has missing or duplicate canonical tap-path layers",
  );
  if (OUTPUT) {
    await page.locator("#v3d canvas").screenshot({
      path: path.join(OUTPUT, "extended-manifold-cell-pass.png"),
    });
  }

  await page.locator("#driverMountExtraMm").evaluate((element) => {
    element.value = "150";
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Math.abs(S.driverMountExtraMm - 150) < 1e-9
    && window.__driverManifoldUIQA?.exactAvailable === true
    && window.__driverManifoldUIQA?.pass === false
    && getComputedStyle(document.getElementById("refuseBanner")).display
      !== "none"
  ), null, { timeout: 30_000 });
  const refused = await page.evaluate(() => ({
    summaryClass: document.getElementById("driverManifoldSummary").className,
    summaryTier: document.getElementById("driverManifoldSummary")
      .getAttribute("data-tier"),
    summaryText: document.getElementById("driverManifoldSummary").textContent,
    detailsClass:
      document.getElementById("driverManifoldDiagnostics").className,
    detailsText:
      document.getElementById("driverManifoldDiagnostics").textContent,
    rows: document.getElementById("rows").textContent,
    banner: document.getElementById("refuseBanner").textContent,
  }));
  assert(refused.summaryClass.includes("exact-refused")
      && refused.detailsClass.includes("exact-refused")
      && refused.summaryTier === null,
    "exact failure is not presented as a visible red refusal");
  assert(/EXACT REFUSED/.test(refused.summaryText)
      && /EXACT PRINTED MANIFOLD/.test(refused.detailsText)
      && /EXACT PRINTED MANIFOLD/.test(refused.rows)
      && /EXACT PRINTED MANIFOLD/.test(refused.banner),
    "exact failure did not propagate through summary, diagnostics and HUD");

  assert(browserErrors.length === 0,
    `browser errors:\n${browserErrors.join("\n")}`);
  console.log(
    "DRIVER MANIFOLD CONTROLS BROWSER PASS"
      + " · exact path moved · render complete · red refusal visible",
  );
} finally {
  await browser.close();
}
