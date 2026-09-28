#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const assembledPath = path.join(appRoot, "meh5.html");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const assembled = await readFile(assembledPath, "utf8");
assert(
  /window\.MEH_BUILD=652;/.test(assembled),
  "STALE_ASSEMBLY: meh5.html is not Build 652; run `node assemble.js` first",
);
assert(
  !/\/\*__(?:PROFILE_LAWS|ENGINE|TWOWAY|CAD)__\*\//.test(assembled),
  "STALE_ASSEMBLY: meh5.html contains an unfulfilled source placeholder",
);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function json(response, status, value) {
  response.writeHead(status, {
    "Content-Type": mime[".json"],
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/pins") {
      if (request.method === "GET") {
        json(response, 200, { pins: [] });
        return;
      }
      if (request.method === "POST") {
        request.resume();
        request.on("end", () => json(response, 200, { ok: true, pins: [] }));
        return;
      }
      json(response, 405, { ok: false, error: "method" });
      return;
    }
    if (!["GET", "HEAD"].includes(request.method || "")) {
      response.writeHead(405);
      response.end("method not allowed");
      return;
    }
    const relative = decodeURIComponent(
      url.pathname === "/" ? "/meh5.html" : url.pathname,
    );
    const file = path.resolve(appRoot, `.${relative}`);
    if (file !== appRoot && !file.startsWith(`${appRoot}${path.sep}`)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file).toLowerCase()]
        || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert(address && typeof address !== "string", "QA server did not bind");
const baseUrl = `http://127.0.0.1:${address.port}/meh5.html`;

async function settle(page) {
  await page.waitForFunction(() => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__solved
    && window.__twoWayGeometry?.plan
    && window.__stateIdentity?.hash
    && window.__twoMeshRuntime?.active !== true
  ), null, { timeout: 60_000 });
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
}

async function snapshot(page) {
  return page.evaluate(() => {
    const solved = window.__solved;
    const plan = window.__twoWayGeometry?.plan || solved?.ev?.plan;
    const optionSix = document.querySelector('#nW option[value="6"]');
    const saved = JSON.parse(localStorage.getItem("meh5_state") || "{}");
    const portCount = plan?.drivers?.reduce(
      (sum, driver) => sum + (driver.ports?.length || 0),
      0,
    ) || 0;
    let meshKey = null;
    try {
      meshKey = MEH2.twoWayMeshKey(
        solved?.S || S,
        "manufacturing-preview",
      );
    } catch {
      // Missing key is asserted by the caller.
    }
    return {
      build: window.MEH_BUILD,
      sentinel: window.MEH_RUNTIME_SENTINEL,
      stateHash: window.__stateIdentity?.hash || null,
      meshKey,
      view: V3D?.view || null,
      state: {
        twoDesign: S?.twoDesign,
        twoArch: S?.twoArch,
        wPre: S?.wPre,
        odW: S?.odW,
        mouthW: S?.mouthW,
        nW: S?.nW,
        npW: S?.npW,
        style: S?.style,
        sectionFamily: S?.sectionFamily,
        profileLaw: S?.profileLaw,
        rosseK: S?.rosseK,
        gasketW: S?.gasketW,
      },
      saved: {
        twoDesign: saved.twoDesign,
        wPre: saved.wPre,
        nW: saved.nW,
        sectionFamily: saved.sectionFamily,
        profileLaw: saved.profileLaw,
        rosseK: saved.rosseK,
        gasketW: saved.gasketW,
      },
      optionSix: optionSix ? {
        disabled: optionSix.disabled,
        text: optionSix.textContent?.trim() || "",
      } : null,
      controls: {
        odW: Number(document.querySelector("#odW")?.value),
        odWLabel: document.querySelector("#vOdW")?.textContent?.trim() || "",
        mouthW: Number(document.querySelector("#mouthW")?.value),
        mouthWLabel: document.querySelector("#vMouthW")?.textContent?.trim() || "",
      },
      plan: plan ? {
        family: plan.family,
        driverCount: plan.drivers?.length || 0,
        portCount,
        allPortCount: plan.allPorts?.length || 0,
        sectionFamily: plan.st?.sectionFamily || null,
        profileFamily: plan.st?.profileLaw?.family || null,
        profileHash: plan.st?.profileHash || null,
        gasketMm: plan.frame?.gasketT * 1000,
        boltN: plan.frame?.boltN,
        generatedPanelBcd: plan.frame?.generatedPanelBcd,
        explicitBcd: plan.frame?.explicitBcd,
        boltInnerWebMm: plan.boltInnerWeb * 1000,
        boltInnerWebRequiredMm: plan.boltInnerWebRequired * 1000,
        boltInnerWebPass: plan.boltInnerWebPass,
        boltOuterWebMm: plan.boltOuterWeb * 1000,
        boltOuterWebRequiredMm: plan.boltOuterWebRequired * 1000,
        boltOuterWebPass: plan.boltOuterWebPass,
        mountEnvelopeComplete: plan.mountEnvelopeComplete,
      } : null,
      infeasible: Boolean(solved?.infeasible),
      failCount: Number(solved?.ev?.fails || 0),
      mount: window.__panelMountQA ? {
        driverCount: window.__panelMountQA.driverCount,
        completeCellInspection: window.__panelMountQA.completeCellInspection,
        completeCellHasNoDriver:
          window.__panelMountQA.invariants?.completeCellHasNoDriver,
      } : null,
      manifold: window.__driverManifoldUIQA ? {
        exactAvailable: window.__driverManifoldUIQA.exactAvailable,
        pass: window.__driverManifoldUIQA.pass,
        pathMismatchM:
          window.__driverManifoldUIQA.exact?.pathMismatchM ?? null,
        pathCount:
          window.__driverManifoldUIQA.exact?.pathEqualization?.pathCount
          ?? null,
        driverPathCounts:
          window.__driverManifoldUIQA.exact?.drivers?.map(
            (driver) => driver.paths?.length || 0,
          ) || [],
      } : null,
      refusal: (() => {
        const banner = document.getElementById("refuseBanner");
        return banner ? {
          visible: getComputedStyle(banner).display !== "none",
          text: banner.textContent?.trim() || "",
        } : null;
      })(),
    };
  });
}

async function sixPreflightDiagnostics(page) {
  return page.evaluate(() => {
    const seed = { ...S, nW: 6, requestedMouthW: +S.mouthW };
    delete seed.mountEnvelopeMinMouthW;
    const floor = Math.max(150, +seed.cdFloor || 300);
    const preferred = Math.max(floor, +seed.twoXO || floor);
    const record = (mouthW, twoXO, tapCRW = +seed.tapCRW) => {
      const candidate = { ...seed, mouthW, twoXO, tapCRW };
      const plan = MEH2.twoWayPlan(candidate, {
        deferRetention: true,
        coarseRadialDiagnostics: true,
      });
      return {
        mouthW,
        twoXO,
        tapCRW,
        minMouthIn: plan.minMouthIn,
        minDriverGapMm: plan.minDriverGap * 1000,
        tapFraction: plan.tapFraction,
        activeReachMarginMm:
          (plan.frame.activeR - 0.002 - plan.maxPortReach) * 1000,
        pairWebMm: plan.pairWeb * 1000,
        minWebMm: plan.minWeb * 1000,
        tapMach: plan.tapMach,
        tapMachLimit: plan.tapMachLimit,
        boltInnerWebPass: plan.boltInnerWebPass,
        boltOuterWebPass: plan.boltOuterWebPass,
        mountEnvelopeComplete: plan.mountEnvelopeComplete,
        mountEnvelopeMarginMm:
          (plan.mountEnvelopeClearance
            - plan.mountEnvelopeRequiredClearance) * 1000,
        minMountSideMm: plan.minMountSide * 1000,
      };
    };
    const adapted = MEH2.smartAdapt2way(seed, "nW", {
      WPRE,
      MPRE,
      CXPRE,
      CDP,
    });
    const adaptedPlan = MEH2.twoWayPlan(adapted.S2, {
      deferRetention: true,
      coarseRadialDiagnostics: true,
    });
    return {
      state: {
        mouthW: seed.mouthW,
        mouthCap: seed.mouthCap,
        twoXO: seed.twoXO,
        cdFloor: seed.cdFloor,
        tapCRW: seed.tapCRW,
        panelAxis: seed.panelAxis,
        boltDW: seed.boltDW,
        wallT: seed.wallT,
        npW: seed.npW,
      },
      requestedPreferred: record(seed.mouthW, preferred),
      requestedFloor: record(seed.mouthW, floor),
      capPreferred: record(+seed.mouthCap || 64, preferred),
      capFloor: record(+seed.mouthCap || 64, floor),
      smartAdapt: {
        mouthW: adapted.S2.mouthW,
        twoXO: adapted.S2.twoXO,
        tapCRW: adapted.S2.tapCRW,
        pairWebMm: adaptedPlan.pairWeb * 1000,
        minWebMm: adaptedPlan.minWeb * 1000,
        driverCount: adaptedPlan.drivers.length,
      },
    };
  });
}

function assertSix(record, label) {
  assert(record.build === 652, `${label}: runtime build is ${record.build}`);
  assert(record.sentinel?.status === "ready", `${label}: runtime is not ready`);
  assert(record.stateHash?.startsWith("b652-"), `${label}: invalid state hash`);
  assert(record.meshKey?.startsWith("b652-"), `${label}: invalid mesh key`);
  assert(record.state.twoDesign === "arch:panel", `${label}: design is not calculated panel`);
  assert(record.state.twoArch === "panel", `${label}: family is not panel`);
  assert(record.state.wPre === "w5", `${label}: W5 was not retained`);
  assert(Math.abs(record.state.odW - 13.76) < 1e-9, `${label}: W5 diameter state is ${record.state.odW}`);
  assert(Math.abs(record.controls.odW - 13.76) < 1e-9, `${label}: diameter control is stale at ${record.controls.odW}`);
  assert(record.controls.odWLabel === "13.76 cm", `${label}: diameter label is stale: ${record.controls.odWLabel}`);
  assert(Math.abs(record.controls.mouthW - record.state.mouthW) < 1e-9,
    `${label}: mouth control ${record.controls.mouthW} does not match state ${record.state.mouthW}`);
  assert(record.controls.mouthWLabel === `${record.state.mouthW}″`,
    `${label}: mouth label is stale: ${record.controls.mouthWLabel}`);
  assert(record.state.nW === 6, `${label}: selected count is ${record.state.nW}`);
  assert(record.state.npW === 2, `${label}: expected two taps per woofer`);
  assert(record.optionSix && !record.optionSix.disabled, `${label}: option 6 is unavailable`);
  assert(record.plan?.family === "panel", `${label}: solved family is not panel`);
  assert(record.plan?.driverCount === 6, `${label}: ${record.plan?.driverCount}/6 drivers`);
  assert(record.plan?.portCount === 12, `${label}: ${record.plan?.portCount}/12 ports`);
  assert(record.plan?.allPortCount === 12, `${label}: canonical ports ${record.plan?.allPortCount}/12`);
  assert(record.plan?.generatedPanelBcd === true, `${label}: W5 BCD was not generated`);
  assert(record.plan?.explicitBcd === false, `${label}: W5 inherited an explicit BCD`);
  assert(record.plan?.boltN === 4, `${label}: W5 inherited ${record.plan?.boltN} mount bolts`);
  assert(record.plan?.boltInnerWebPass === true, `${label}: inner fastener web failed`);
  assert(record.plan?.boltOuterWebPass === true, `${label}: outer fastener web failed`);
  assert(
    record.plan.boltInnerWebMm + 1e-8 >= record.plan.boltInnerWebRequiredMm,
    `${label}: inner web ${record.plan.boltInnerWebMm} mm is insufficient`,
  );
  assert(
    record.plan.boltOuterWebMm + 1e-8 >= record.plan.boltOuterWebRequiredMm,
    `${label}: outer web ${record.plan.boltOuterWebMm} mm is insufficient`,
  );
  assert(record.plan?.mountEnvelopeComplete === true, `${label}: mount envelope is incomplete`);
  assert(!record.infeasible && record.failCount === 0, `${label}: solved state is refused`);
  assert(record.view === "cell", `${label}: inspection view changed to ${record.view}`);
  assert(record.mount?.driverCount === 6, `${label}: render diagnostics lost drivers`);
  assert(record.mount?.completeCellInspection === true, `${label}: cell inspection is inactive`);
  assert(record.mount?.completeCellHasNoDriver === true, `${label}: cell view contains a driver`);
  assert(record.manifold?.exactAvailable === true,
    `${label}: exact printed-manifold diagnostics are unavailable`);
  assert(record.manifold?.pass === true,
    `${label}: exact printed manifold was refused`);
  assert(record.manifold?.pathCount === 12,
    `${label}: exact equalizer owns ${record.manifold?.pathCount}/12 paths`);
  assert(record.manifold?.driverPathCounts?.length === 6
    && record.manifold.driverPathCounts.every((count) => count === 2),
  `${label}: exact per-driver path ownership is incomplete`);
  assert(record.manifold?.pathMismatchM !== null
    && record.manifold.pathMismatchM < 2e-12,
  `${label}: exact path mismatch is ${record.manifold?.pathMismatchM} m`);
  assert(record.refusal?.visible === false,
    `${label}: refusal overlay remains visible: ${record.refusal?.text}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
  colorScheme: "light",
});
const page = await context.newPage();
const browserErrors = [];
page.on("pageerror", (error) => {
  browserErrors.push(`pageerror: ${error.stack || error.message || error}`);
});
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
});

try {
  await page.goto(
    `${baseUrl}?build=652&reset=1&view=cell&mountFocus=0&rev=six-ui-reset`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  await settle(page);
  const resetBoot = await snapshot(page);
  assert(resetBoot.sentinel?.resetApplied === true, "reset=1 was not applied");
  assert(resetBoot.sentinel?.resetStorageRemoved === true, "saved state was not removed");

  await page.locator("#buildSel").selectOption("arch:panel");
  await page.waitForFunction((hash) => (
    S.twoDesign === "arch:panel"
    && S.twoArch === "panel"
    && window.__twoWayGeometry?.plan?.family === "panel"
    && window.__stateIdentity?.hash !== hash
  ), resetBoot.stateHash, { timeout: 60_000 });
  await settle(page);

  const beforeW5 = await snapshot(page);
  await page.locator("#wPre").selectOption("w5");
  await page.waitForFunction((hash) => (
    S.wPre === "w5"
    && S.twoDesign === "arch:panel"
    && window.__twoWayGeometry?.plan?.S?.wPre === "w5"
    && window.__stateIdentity?.hash !== hash
  ), beforeW5.stateHash, { timeout: 60_000 });
  await settle(page);

  const beforeSix = await snapshot(page);
  const sixDebug = await sixPreflightDiagnostics(page);
  assert(
    beforeSix.optionSix && !beforeSix.optionSix.disabled,
    `W5 option 6 is unavailable: ${JSON.stringify({
      optionSix: beforeSix.optionSix,
      state: beforeSix.state,
      plan: beforeSix.plan,
      infeasible: beforeSix.infeasible,
      failCount: beforeSix.failCount,
      sixDebug,
    }, null, 2)}`,
  );
  await page.locator("#nW").selectOption("6");
  await page.waitForFunction((hash) => {
    const plan = window.__twoWayGeometry?.plan;
    return S.nW === 6
      && plan?.drivers?.length === 6
      && plan.drivers.reduce(
        (sum, driver) => sum + (driver.ports?.length || 0),
        0,
      ) === 12
      && window.__stateIdentity?.hash !== hash;
  }, beforeSix.stateHash, { timeout: 60_000 });
  await settle(page);

  const selectedSix = await snapshot(page);
  assertSix(selectedSix, "selected six-woofer state");
  assert(selectedSix.saved.nW === 6, "six-woofer state was not saved");

  await page.goto(
    `${baseUrl}?build=652&view=cell&mountFocus=0&rev=six-ui-persisted`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  await settle(page);
  const persistedSix = await snapshot(page);
  assert(persistedSix.sentinel?.resetApplied === false, "reload unexpectedly reset");
  assertSix(persistedSix, "persisted six-woofer state");
  assert(persistedSix.saved.nW === 6, "reload lost saved six-woofer count");

  await page.locator('#segStyle button[data-v="smooth"]').click();
  await page.waitForFunction((hash) => (
    S.style === "smooth"
    && window.__twoWayGeometry?.plan?.S?.style === "smooth"
    && window.__stateIdentity?.hash !== hash
  ), persistedSix.stateHash, { timeout: 60_000 });
  await settle(page);

  const beforeSection = await snapshot(page);
  await page.locator("#sectionFamily").selectOption("roundedRectangle");
  await page.waitForFunction((hash) => (
    S.sectionFamily === "roundedRectangle"
    && window.__twoWayGeometry?.plan?.st?.sectionFamily === "roundedRectangle"
    && window.__stateIdentity?.hash !== hash
  ), beforeSection.stateHash, { timeout: 60_000 });
  await settle(page);
  const rounded = await snapshot(page);
  assert(rounded.saved.sectionFamily === "roundedRectangle", "rounded rectangle was not saved");
  assert(rounded.meshKey !== beforeSection.meshKey, "rounded rectangle did not change mesh key");

  await page.locator("#profileLaw").selectOption("rosse");
  await page.waitForFunction((hash) => (
    S.profileLaw === "rosse"
    && window.__twoWayGeometry?.plan?.st?.profileLaw?.family === "rosse"
    && window.__stateIdentity?.hash !== hash
  ), rounded.stateHash, { timeout: 60_000 });
  await settle(page);
  const rosseSelected = await snapshot(page);
  assert(rosseSelected.saved.profileLaw === "rosse", "R-OSSE was not saved");
  assert(rosseSelected.meshKey !== rounded.meshKey, "R-OSSE did not change mesh key");

  const nextRosseK = 2.1;
  await page.locator("#rosseK").evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, nextRosseK);
  await page.waitForFunction(({ hash, profileHash, value }) => (
    S.rosseK === value
    && window.__twoWayGeometry?.plan?.st?.profileLaw?.family === "rosse"
    && window.__twoWayGeometry.plan.st.profileHash !== profileHash
    && window.__stateIdentity?.hash !== hash
  ), {
    hash: rosseSelected.stateHash,
    profileHash: rosseSelected.plan.profileHash,
    value: nextRosseK,
  }, { timeout: 60_000 });
  await settle(page);
  const rosseMutated = await snapshot(page);
  assert(rosseMutated.saved.rosseK === nextRosseK, "R-OSSE K was not saved");
  assert(rosseMutated.meshKey !== rosseSelected.meshKey, "R-OSSE K did not change mesh key");

  const nextGasketMm = 2.4;
  await page.locator("#gasketW").evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, nextGasketMm);
  await page.waitForFunction(({ hash, value }) => (
    S.gasketW === value
    && Math.abs(
      window.__twoWayGeometry?.plan?.frame?.gasketT * 1000 - value,
    ) < 1e-9
    && window.__stateIdentity?.hash !== hash
  ), {
    hash: rosseMutated.stateHash,
    value: nextGasketMm,
  }, { timeout: 60_000 });
  await settle(page);
  const final = await snapshot(page);
  assert(final.saved.gasketW === nextGasketMm, "mount gasket was not saved");
  assert(Math.abs(final.plan.gasketMm - nextGasketMm) < 1e-9, "mount plan did not update");
  assert(final.meshKey !== rosseMutated.meshKey, "mount edit did not change mesh key");
  assertSix(final, "final rounded R-OSSE mount state");
  assert(final.state.sectionFamily === "roundedRectangle");
  assert(final.state.profileLaw === "rosse");
  assert(browserErrors.length === 0, `browser errors:\n${browserErrors.join("\n")}`);

  console.log(JSON.stringify({
    pass: true,
    hashes: {
      selectedSix: selectedSix.stateHash,
      persistedSix: persistedSix.stateHash,
      rounded: rounded.stateHash,
      rosse: rosseMutated.stateHash,
      mount: final.stateHash,
    },
    finalMeshKey: final.meshKey,
    drivers: final.plan.driverCount,
    ports: final.plan.portCount,
    generatedMountWebMm: {
      inner: final.plan.boltInnerWebMm,
      outer: final.plan.boltOuterWebMm,
    },
  }, null, 2));
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
