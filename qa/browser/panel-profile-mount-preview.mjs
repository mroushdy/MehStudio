#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const TARGET = process.env.MEH_PANEL_PROFILE_QA_URL
  || "http://127.0.0.1:8520/shell.html?qa=panel-profile-mount-preview";
const OUTPUT = process.env.MEH_PANEL_PROFILE_QA_OUTPUT || "";
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
    .replace("/*__CAD__*/", "/* parametric QA runtime */");
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

  const results = [];
  for (const construction of ["integrated", "cartridge"]) {
    await page.evaluate((nextConstruction) => {
      Object.assign(S, {
        topo: "2way",
        twoArch: "panel",
        twoFamily: "panel",
        twoDesign: "arch:panel",
        style: "smooth",
        profileLaw: "classicOS",
        sectionFamily: "superellipse",
        seN: 6,
        nW: 2,
        npW: 2,
        panelAxis: "horizontal",
        tapBasis: "model",
        shW: "slot",
        tapShapeW: "slot",
        mouthW: 32,
        mouthCap: 64,
        covH: 90,
        covV: 60,
        wallT: 0.018,
        td: 1.4,
        throat: 1.4,
        cdSel: "dcx464",
        wPre: "nw10",
        odW: 26.1,
        dpW: 11.9,
        sdW: 320,
        vtcW: 1400,
        xmW: 6.8,
        twoXO: 430,
        tapCRW: 9,
        tapStationW: 143.3,
        tapSlotL: 101.6,
        tapSlotW: 19.1,
        adapterReach: 35,
        adapterReachMode: "auto",
        driverCellConstruction: nextConstruction,
      });
      V3D.view = "nodrv";
      const selector = document.querySelector("#viewSel");
      if (selector) selector.value = "nodrv";
      rebuild();
    }, construction);
    await page.waitForTimeout(250);
    const snapshot = await page.evaluate(() => {
      const qa = structuredClone(window.__panelMountQA || null);
      const scene = {
        visibleDrivers: 0,
        visibleTapHelpers: 0,
        mountLandRoots: [],
        detachableModuleRoots: [],
        conformalGasketRoots: 0,
      };
      const root = V3D.group;
      const visible = (object) => {
        for (let node = object; node; node = node.parent) {
          if (node.visible === false) return false;
          if (node === root) return true;
        }
        return false;
      };
      root?.traverse?.((object) => {
        const tag = object.userData?.tag;
        if (tag === "driver" && visible(object)) scene.visibleDrivers += 1;
        if (tag === "tap-interface" && visible(object)) scene.visibleTapHelpers += 1;
        if (tag === "mount-joint-gasket"
            && object.parent?.userData?.tag !== "mount-joint-gasket"
            && visible(object)) scene.conformalGasketRoots += 1;
        if (tag === "mount-land"
            && object.parent?.userData?.tag !== "mount-land"
            && visible(object)) {
          let minimumInnerDistance = Infinity;
          const bearingFaces = [];
          object.updateWorldMatrix?.(true, true);
          object.traverse?.((child) => {
            if (child.userData?.tag === "mount-bearing"
                || child.userData?.tag === "corner-mount-bearing") {
              bearingFaces.push({
                structuralPlate: child.userData.structuralPlate === true,
                canonicalOuterRadius: child.userData.canonicalOuterRadius,
                canonicalOpeningRadius: child.userData.canonicalOpeningRadius,
                tapClipProtected: child.userData.tapClipProtected === true,
                clipRole: child.material?.userData?.tapBooleanClip?.role || null,
                tapClipCount: child.material?.userData?.tapBooleanClip?.count || 0,
                driverPocketCount:
                  child.material?.userData?.tapBooleanClip?.driverPocketCount || 0,
              });
              return;
            }
            const positions = child.geometry?.attributes?.position;
            if (!positions) return;
            for (let index = 0; index < positions.count; index += 1) {
              const world = new THREE.Vector3().fromBufferAttribute(
                positions,
                index,
              );
              child.localToWorld(world);
              minimumInnerDistance = Math.min(
                minimumInnerDistance,
                MEH2.twoWaySdCross(
                  window.__solved.ev.plan,
                  world.x,
                  world.z,
                  world.y,
                  0,
                ),
              );
            }
          });
          scene.mountLandRoots.push({
            childCount: object.children.length,
            minimumInnerDistance,
            bearingFaces,
            ...object.userData,
          });
        }
        if (tag === "detachable-module"
            && object.parent?.userData?.tag !== "detachable-module"
            && visible(object)) {
          let clippedMeshes = 0;
          object.traverse?.((child) => {
            if (child.isMesh
                && child.material?.userData?.tapBooleanClip?.role === "driver-cell") {
              clippedMeshes += 1;
            }
          });
          scene.detachableModuleRoots.push({
            childCount: object.children.length,
            clippedMeshes,
            ...object.userData,
          });
        }
      });
      return {
        qa,
        scene,
        planRadii: (window.__integratedPlatePreviewQA?.specs || []).map(
          (spec) => ({
            outerR: spec.outerRadius,
            innerR: spec.openingRadius,
          }),
        ),
        profileLaw: window.__solved?.ev?.plan?.st?.profileLaw?.family || null,
      };
    });
    const qa = snapshot.qa;
    if (process.env.MEH_PANEL_PROFILE_QA_DEBUG) {
      console.log(JSON.stringify({ construction, snapshot }, null, 2));
    }
    assert(qa?.view === "nodrv", `${construction}: no-driver view missing`);
    assert(snapshot.profileLaw === "classicOS", `${construction}: profile law drift`);
    assert(qa.invariants?.noDriverAssemblyHasNoDrivers, `${construction}: drivers visible`);
    assert(qa.invariants?.mountsOutsideForbiddenVolume,
      `${construction}: mount enters acoustic horn air`);
    assert(qa.invariants?.sealsContinuous, `${construction}: seal continuity failed`);
    assert(snapshot.scene.visibleDrivers === 0, `${construction}: visible driver tags`);
    assert(snapshot.scene.visibleTapHelpers === 0,
      `${construction}: diagnostic tap helper leaked into assembly`);
    if (construction === "integrated") {
      assert(qa.invariants?.panelBearingFacesUnique,
        "integrated: duplicate bearing-face owner");
      assert(snapshot.scene.mountLandRoots.length === qa.driverCount,
        "integrated: mount root count mismatch");
      assert(snapshot.scene.mountLandRoots.every((root, index) => (
        root.childCount === 2
        && root.profileConformal === true
        && root.bearingFaceOwnerCount === 1
        && root.structuralPlate === true
        && root.tapClipProtected === true
        && root.emptyCellTechnical === true
        && root.minimumInnerDistance >= 0.0007
        && root.minimumForbiddenDistance >= -0.000005
        && root.bearingFaces.length === 1
        && root.bearingFaces[0].structuralPlate === true
        && root.bearingFaces[0].tapClipProtected === true
        && root.bearingFaces[0].clipRole === "driver-bearing-face"
        && root.bearingFaces[0].tapClipCount > 0
        && root.bearingFaces[0].driverPocketCount === 8
        && Math.abs(
          root.canonicalOuterRadius - snapshot.planRadii[index].outerR,
        ) < 1e-9
        && Math.abs(
          root.canonicalOpeningRadius - snapshot.planRadii[index].innerR,
        ) < 1e-9
      )), "integrated: protected structural plate or exact solved radii missing");
    } else {
      assert(qa.invariants?.panelCartridgesClosed,
        "cartridge: preview remains a hollow ring");
      assert(qa.invariants?.detachableGasketsComplete,
        "cartridge: conformal joint gasket incomplete");
      assert(qa.invariants?.detachableDistinct,
        "cartridge: M4 retention missing or unowned");
      assert(snapshot.scene.detachableModuleRoots.length === qa.driverCount,
        "cartridge: module root count mismatch");
      assert(snapshot.scene.conformalGasketRoots === qa.driverCount,
        "cartridge: gasket root count mismatch");
      assert(snapshot.scene.detachableModuleRoots.every((root) => (
        root.childCount === 3
        && root.clippedMeshes === 3
        && root.profileConformal === true
        && root.frontChamberClosed === true
        && root.rootCapCount === 2
        && root.bearingFaceOwnerCount === 1
        && root.emptyCellTechnical === true
        && root.emptyCellXraySidewall === true
        && root.minimumForbiddenDistance >= -0.000005
      )), "cartridge: closed caps/profile clip/canonical cutters missing");
    }
    if (OUTPUT) {
      /* The previous fixture ends on its rear inspection camera. Reset the
         ordinary orbit explicitly so each construction gets an independent
         horn-side witness before the rear assembly witness. */
      await page.evaluate(() => {
        const plan = window.__solved.ev.plan;
        V3D.yaw = 0.6;
        V3D.pitch = 0.28;
        V3D.dist = 1.08;
        V3D.tgt.set(plan.station, 0, 0);
        render3d();
      });
      await page.locator("#v3d canvas").screenshot({
        path: `${OUTPUT}/panel-classic-os-${construction}-nodrv.png`,
        animations: "disabled",
        caret: "hide",
      });
      await page.evaluate(() => {
        applyNoDriverAssemblyCamera(window.__solved.ev.plan);
        render3d();
      });
      await page.locator("#v3d canvas").screenshot({
        path: `${OUTPUT}/panel-classic-os-${construction}-rear-nodrv.png`,
        animations: "disabled",
        caret: "hide",
      });
    }
    results.push({
      construction,
      driverCount: qa.driverCount,
      mountRoots: construction === "integrated"
        ? snapshot.scene.mountLandRoots.length
        : snapshot.scene.detachableModuleRoots.length,
      gaskets: snapshot.scene.conformalGasketRoots,
      retentionFeatures: qa.retentionFeatureCount,
      minimumInnerDistance: snapshot.scene.mountLandRoots.length
        ? Math.min(...snapshot.scene.mountLandRoots.map(
          (root) => root.minimumInnerDistance,
        ))
        : null,
    });
  }

  assert(browserErrors.length === 0, `browser errors:\n${browserErrors.join("\n")}`);
  console.log("PANEL PROFILE MOUNT BROWSER PASS - integrated + cartridge");
  for (const result of results) {
    console.log(
      `  ${result.construction}: ${result.driverCount} drivers · `
        + `${result.mountRoots} mounts · ${result.gaskets} joint gaskets · `
        + `${result.retentionFeatures} retention features · `
        + `inner clearance ${result.minimumInnerDistance}`,
    );
  }
} finally {
  await browser.close();
}
