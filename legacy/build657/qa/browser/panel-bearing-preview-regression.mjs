#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const TARGET = process.env.MEH_PANEL_BEARING_QA_URL
  || "http://127.0.0.1:8520/shell.html?qa=panel-bearing-preview";
const OUTPUT = process.env.MEH_PANEL_BEARING_QA_OUTPUT || "";
const SOURCE_ROOT = new URL("../../", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(String(error.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

try {
  if (OUTPUT) await mkdir(OUTPUT, { recursive: true });
  const [shellSource, profileLawsSource, engineSource, twoWaySource] = await Promise.all([
    readFile(new URL("shell.html", SOURCE_ROOT), "utf8"),
    readFile(new URL("profile-laws.js", SOURCE_ROOT), "utf8"),
    readFile(new URL("engine.js", SOURCE_ROOT), "utf8"),
    readFile(new URL("twoway-core.js", SOURCE_ROOT), "utf8"),
  ]);
  const runtimeSource = shellSource
    .replace("/*__PROFILE_LAWS__*/", profileLawsSource)
    .replace("/*__ENGINE__*/", engineSource)
    .replace("/*__TWOWAY__*/", twoWaySource)
    .replace("/*__CAD__*/", "/* parametric bearing QA runtime */");
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
    typeof S !== "undefined"
    && typeof V3D !== "undefined"
    && V3D.group
    && typeof MEH2 !== "undefined"
  ), null, { timeout: 30_000 });

  const cases = [
    {
      key: "nw10-2",
      state: {
        wPre: "nw10",
        odW: 26.1,
        dpW: 11.9,
        sdW: 320,
        vtcW: 1400,
        xmW: 6.8,
        frameW: "round",
        boltNW: 8,
        bcdW: 244,
        boltDW: 6.5,
        gasketW: 1.6,
        nW: 2,
      },
    },
    {
      key: "dayton-6",
      state: {
        wPre: "w5",
        odW: 13.76,
        dpW: 6.95,
        sdW: 91.6,
        vtcW: 35,
        xmW: 2.5,
        frameW: "round",
        boltNW: undefined,
        bcdW: undefined,
        boltDW: undefined,
        gasketW: undefined,
        nW: 6,
      },
    },
  ];
  const results = [];
  for (const fixture of cases) {
    await page.evaluate((next) => {
      const canonical = MEH2.migrateTwoWayState({
        ...MEH2.TWO_ARCH.panel.defaults,
        topo: "2way",
        _smart2waySchema: 3,
        twoArch: "panel",
        twoFamily: "panel",
        twoDesign: "arch:panel",
        tapBasis: "model",
        style: "smooth",
        profileLaw: "osse",
        sectionFamily: "superellipse",
        sectionLameN: 6,
        sectionCornerRatio: 0.25,
        seN: 6,
        npW: 2,
        panelAxis: "horizontal",
        shW: "slot",
        tapShapeW: "slot",
        mouthW: 32,
        requestedMouthW: 32,
        mouthCap: 64,
        covH: 90,
        covV: 60,
        wallT: 0.018,
        td: 1.4,
        throat: 1.4,
        cdSel: "dcx464",
        cdFloor: 300,
        cdDepth: 2.4,
        twoXO: 500,
        tapCRW: 6,
        phaseMargin: 1.2,
        rearAlign: "external",
        adapterReach: 35,
        adapterReachMode: "auto",
        driverArrayMode: "auto",
        driverArrayRotationDeg: 0,
        driverMountMode: "shortest",
        driverMountExtraMm: 0,
        driverAxisBlend: 0,
        driverCellConstruction: "integrated",
        coneProfileMode: "flat",
        coneDepthMm: 0,
        coneDepthKnown: false,
        ...next,
      });
      for (const key of Object.keys(S)) delete S[key];
      Object.assign(S, canonical, { _smart2waySchema: 3 });
      V3D.view = "nodrv";
      const selector = document.querySelector("#viewSel");
      if (selector) selector.value = "nodrv";
      rebuild();
    }, fixture.state);
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      applyNoDriverAssemblyCamera(window.__solved.ev.plan);
      render3d();
    });
    const snapshot = await page.evaluate(() => {
      const root = V3D.group;
      const visible = (object) => {
        for (let node = object; node; node = node.parent) {
          if (node.visible === false) return false;
          if (node === root) return true;
        }
        return false;
      };
      const mounts = [];
      let visibleDrivers = 0;
      let visibleTapHelpers = 0;
      root.traverse((object) => {
        const tag = object.userData?.tag;
        if (tag === "driver" && visible(object)) visibleDrivers += 1;
        if (tag === "tap-interface" && visible(object)) visibleTapHelpers += 1;
        if (tag !== "mount-land"
            || object.parent?.userData?.tag === "mount-land"
            || !visible(object)) return;
        const bearingFaces = [];
        object.traverse((child) => {
          const childTag = child.userData?.tag;
          if (!["mount-bearing", "corner-mount-bearing"].includes(childTag)) {
            return;
          }
          bearingFaces.push({
            tag: childTag,
            structuralPlate: child.userData.structuralPlate === true,
            tapClipProtected: child.userData.tapClipProtected === true,
            canonicalOuterRadius: child.userData.canonicalOuterRadius,
            canonicalOpeningRadius: child.userData.canonicalOpeningRadius,
            canonicalPlateToolSchemaVersion:
              child.userData.canonicalPlateToolSchemaVersion,
            canonicalPlateRootRadius:
              child.userData.canonicalPlateRootRadius,
            canonicalGasketInnerRadius:
              child.userData.canonicalGasketInnerRadius,
            canonicalGasketOuterRadius:
              child.userData.canonicalGasketOuterRadius,
            subtractorWhitelist: child.userData.subtractorWhitelist,
            role: child.material?.userData?.tapBooleanClip?.role || null,
            tapCount: child.material?.userData?.tapBooleanClip?.count || 0,
            pocketCount:
              child.material?.userData?.tapBooleanClip?.driverPocketCount || 0,
          });
        });
        mounts.push({
          driverIndex: object.userData.driverIndex,
          structuralPlate: object.userData.structuralPlate === true,
          tapClipProtected: object.userData.tapClipProtected === true,
          canonicalOuterRadius: object.userData.canonicalOuterRadius,
          canonicalOpeningRadius: object.userData.canonicalOpeningRadius,
          bearingFaces,
        });
      });
      const plan = window.__solved.ev.plan;
      const plateQA = structuredClone(window.__integratedPlatePreviewQA);
      return {
        state: {
          driverMountMode: S.driverMountMode,
          driverMountExtraMm: S.driverMountExtraMm,
          driverAxisBlend: S.driverAxisBlend,
          driverArrayMode: S.driverArrayMode,
          driverArrayRotationDeg: S.driverArrayRotationDeg,
          adapterReach: S.adapterReach,
          adapterReachMode: S.adapterReachMode,
          sectionFamily: S.sectionFamily,
          sectionLameN: S.sectionLameN,
          sectionCornerRatio: S.sectionCornerRatio,
          profileLaw: S.profileLaw,
          rosseK: S.rosseK,
          osseThroatAngle: S.osseThroatAngle,
          osseK: S.osseK,
          osseS: S.osseS,
          osseTerminationN: S.osseTerminationN,
          osseQ: S.osseQ,
          coneProfileMode: S.coneProfileMode,
          coneDepthMm: S.coneDepthMm,
          coneAxialClearanceMm: S.coneAxialClearanceMm,
          coneRadialClearanceMm: S.coneRadialClearanceMm,
        },
        infeasible: window.__solved.infeasible,
        failCount: window.__solved.ev.fails,
        solvedMouthW: window.__solved.S.mouthW,
        driverCount: plan.drivers.length,
        expected: plan.drivers.map((driver) => {
          const spec = plateQA.specs.find((item) =>
            item.driverIndex === driver.index);
          return {
          outerR: spec.outerRadius,
          innerR: spec.openingRadius,
          rootR: spec.rootRadius,
          gasketInnerR: spec.gasketInnerRadius,
          gasketOuterR: spec.gasketOuterRadius,
          boltN: plan.frame.boltN,
        }}),
        plateQA,
        qa: structuredClone(window.__panelMountQA),
        visibleDrivers,
        visibleTapHelpers,
        mounts,
      };
    });
    assert(!snapshot.infeasible && snapshot.failCount === 0,
      `${fixture.key}: solved state refused`);
    assert(snapshot.mounts.length === snapshot.driverCount,
      `${fixture.key}: ${snapshot.mounts.length}/${snapshot.driverCount} mounts · `
        + JSON.stringify({
          solvedMouthW: snapshot.solvedMouthW,
          state: snapshot.state,
          qa: snapshot.qa,
          plateQA: snapshot.plateQA,
        }));
    assert(snapshot.visibleDrivers === 0,
      `${fixture.key}: driver body leaked into NO DRIVERS`);
    assert(snapshot.visibleTapHelpers === 0,
      `${fixture.key}: tap helper leaked into NO DRIVERS`);
    assert(snapshot.qa?.canonicalVisualToolsComplete === true,
      `${fixture.key}: canonical clip tools incomplete`);
    assert(snapshot.qa?.canonicalIntegratedPlateToolsComplete === true,
      `${fixture.key}: exact integrated plate tools incomplete`);
    assert(snapshot.plateQA?.complete === true,
      `${fixture.key}: strict plate manifest refused`);
    assert(snapshot.plateQA?.manifest?.schemaVersion === 1,
      `${fixture.key}: plate manifest schema`);
    assert(JSON.stringify(snapshot.plateQA?.manifest?.allowed) ===
      JSON.stringify([
        "front-chamber/cone-relief",
        "canonical-tap-lumens",
        "driver-fastener-holes",
      ]), `${fixture.key}: subtractor roles drifted`);
    snapshot.mounts.forEach((mount, index) => {
      const expected = snapshot.expected[index];
      assert(mount.structuralPlate && mount.tapClipProtected,
        `${fixture.key}/driver-${index}: structural plate contract missing`);
      assert(mount.bearingFaces.length === 1,
        `${fixture.key}/driver-${index}: bearing owner count`);
      const face = mount.bearingFaces[0];
      assert(face.structuralPlate && face.tapClipProtected,
        `${fixture.key}/driver-${index}: bearing face is not protected`);
      assert(face.role === "driver-bearing-face" && face.tapCount > 0,
        `${fixture.key}/driver-${index}: exact tap lumen role missing`);
      assert(face.pocketCount === expected.boltN,
        `${fixture.key}/driver-${index}: fastener pocket ownership drift`);
      assert(Math.abs(face.canonicalOuterRadius - expected.outerR) < 1e-9,
        `${fixture.key}/driver-${index}: invented outer annulus`);
      assert(Math.abs(face.canonicalOpeningRadius - expected.innerR) < 1e-9,
        `${fixture.key}/driver-${index}: opening radius drift`);
      assert(face.canonicalPlateToolSchemaVersion === 1,
        `${fixture.key}/driver-${index}: plate tool schema`);
      assert(Math.abs(face.canonicalPlateRootRadius - expected.rootR) < 1e-9,
        `${fixture.key}/driver-${index}: plate root radius drift`);
      assert(Math.abs(
        face.canonicalGasketInnerRadius - expected.gasketInnerR,
      ) < 1e-9, `${fixture.key}/driver-${index}: gasket inner radius drift`);
      assert(Math.abs(
        face.canonicalGasketOuterRadius - expected.gasketOuterR,
      ) < 1e-9, `${fixture.key}/driver-${index}: gasket outer radius drift`);
      assert(JSON.stringify(face.subtractorWhitelist) ===
        JSON.stringify(snapshot.plateQA.manifest.allowed),
      `${fixture.key}/driver-${index}: preview subtractor manifest drift`);
    });
    if (OUTPUT) {
      await page.locator("#v3d canvas").screenshot({
        path: `${OUTPUT}/${fixture.key}-osse-nodrv.png`,
        animations: "disabled",
        caret: "hide",
      });
    }
    results.push({
      key: fixture.key,
      driverCount: snapshot.driverCount,
      mouthW: snapshot.solvedMouthW,
      mountCount: snapshot.mounts.length,
    });
  }
  assert(browserErrors.length === 0,
    `browser errors:\n${browserErrors.join("\n")}`);
  console.log("PANEL BEARING PREVIEW BROWSER PASS");
  for (const result of results) {
    console.log(`  ${result.key}: ${result.driverCount} drivers · `
      + `${result.mountCount} structural plates · ${result.mouthW}″ mouth`);
  }
} finally {
  await browser.close();
}
