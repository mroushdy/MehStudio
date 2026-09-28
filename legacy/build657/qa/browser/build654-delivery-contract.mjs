#!/usr/bin/env node
// Build 654 live boot and schema-2 three-way isolation contract.
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const assembled = await readFile(path.join(appRoot, "meh5.html"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  /window\.MEH_BUILD=654;/.test(assembled),
  "STALE_ASSEMBLY: meh5.html is not Build 654",
);
assert(
  /MEH3UI/.test(assembled) && /MEH3ExactKernel/.test(assembled),
  "Build 654 schema-2 UI or exact-kernel boundary is missing",
);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/pins") {
      if (request.method === "POST") request.resume();
      response.writeHead(200, {
        "Content-Type": mime[".json"],
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({ ok: true, pins: [] }));
      return;
    }
    const file = path.resolve(appRoot, `.${decodeURIComponent(url.pathname)}`);
    if (file !== appRoot && !file.startsWith(`${appRoot}${path.sep}`)) {
      response.writeHead(403);
      response.end("forbidden");
      return;
    }
    const metadata = await stat(file);
    if (!metadata.isFile()) throw new Error("not a file");
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert(address && typeof address !== "string", "QA server did not bind");
const base = `http://127.0.0.1:${address.port}/meh5.html`;

const browser = await chromium.launch({ headless: true });
try {
  const refusedContext = await browser.newContext();
  await refusedContext.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const removeItem = Storage.prototype.removeItem;
    window.__build654StorageQA = { reads: 0, removes: 0 };
    Storage.prototype.getItem = function qaGetItem(key) {
      if (key === "meh5_state" || key === "meh5_threeway_state_v2") {
        window.__build654StorageQA.reads += 1;
      }
      return getItem.call(this, key);
    };
    Storage.prototype.removeItem = function qaRemoveItem(key) {
      if (key === "meh5_state" || key === "meh5_threeway_state_v2") {
        window.__build654StorageQA.removes += 1;
      }
      return removeItem.call(this, key);
    };
  });
  const refusedPage = await refusedContext.newPage();
  const refusedErrors = [];
  refusedPage.on("pageerror", error => refusedErrors.push(String(error)));
  await refusedPage.goto(
    `${base}?build=653&reset=1&view=nodrv`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await refusedPage.waitForSelector(
    "#runtimeSentinel.runtime-refused",
    { timeout: 30_000 },
  );
  const refused = await refusedPage.evaluate(() => ({
    sentinel: window.MEH_RUNTIME_SENTINEL,
    storage: window.__build654StorageQA,
    canvasCount: document.querySelectorAll("#v3d canvas").length,
  }));
  assert(refusedErrors.length === 0, refusedErrors.join(" | "));
  assert(refused.sentinel?.status === "refused", "stale build did not refuse");
  assert(refused.sentinel?.build === 654, "refusal reports the wrong build");
  assert(refused.storage.reads === 0, "refused boot read saved state");
  assert(refused.storage.removes === 0, "refused boot erased saved state");
  assert(refused.canvasCount === 0, "refused boot initialized WebGL");
  await refusedContext.close();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    window.__build654Writes = { legacy: 0, schema2: 0 };
    Storage.prototype.setItem = function qaSetItem(key, value) {
      if (key === "meh5_state") window.__build654Writes.legacy += 1;
      if (key === "meh5_threeway_state_v2") {
        window.__build654Writes.schema2 += 1;
      }
      return setItem.call(this, key, value);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(
    `${base}?build=654&reset=1&view=nodrv&rev=browser-contract`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await page.waitForFunction(() => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready" && window.__solved
  ), null, { timeout: 30_000 });
  const before = await page.evaluate(() => ({
    build: window.MEH_RUNTIME_SENTINEL?.build,
    canvasCount: document.querySelectorAll("#v3d canvas").length,
    writes: { ...window.__build654Writes },
  }));
  assert(before.build === 654, "accepted runtime reports the wrong build");
  assert(before.canvasCount === 1, "accepted runtime has the wrong canvas count");

  await page.click('#segTopo button[data-v="3way"]');
  await page.waitForFunction(() => (
    document.body.classList.contains("threeway-v2-mode")
      && !document.getElementById("threewayV2Ctl")?.hidden
  ), null, { timeout: 30_000 });
  await page.waitForFunction(() => (
    document.getElementById("threewayV2Status")?.dataset.tier === "validated"
      && /SOLVED/.test(
        document.getElementById("threewayV2Status")?.textContent || "",
      )
  ), null, { timeout: 30_000 });
  const threeWay = await page.evaluate(() => ({
    topology: S.topo,
    ui: typeof MEH3UI === "object",
    exactBoundary: typeof MEH3ExactKernel === "object",
    legacyCore: typeof MEH3,
    bodyMode: document.body.classList.contains("threeway-v2-mode"),
    panelHidden: document.getElementById("threewayV2Ctl")?.hidden,
    midDisplay: getComputedStyle(document.getElementById("midCtl")).display,
    exactDisabled: document.getElementById("bExact")?.disabled,
    stlDisabled: document.getElementById("bStl")?.disabled,
    hornrespDisabled: document.getElementById("bHrn")?.disabled,
    viewIds: [...document.getElementById("viewSel").options].map(
      option => option.value,
    ),
    guidedControls: [
      "threewayMouthWidthRange",
      "threewayMouthHeightRange",
      "threewayDepthRange",
      "threewayCoverageHRange",
      "threewayCoverageVRange",
      "threewayLowMidRange",
      "threewayMidHighRange",
    ].every(id => {
      const control = document.getElementById(id);
      return control && getComputedStyle(control).display !== "none";
    }),
    solveVisible: (() => {
      const control = document.getElementById("threewaySolve");
      return control && getComputedStyle(control).display !== "none";
    })(),
    statusTier: document.getElementById("threewayV2Status")?.dataset.tier,
    statusText: document.getElementById("threewayV2Status")?.textContent,
    solved: window.__solved,
    writes: { ...window.__build654Writes },
  }));
  assert(threeWay.topology === "3way", "topology did not switch");
  assert(threeWay.ui && threeWay.exactBoundary, "schema-2 globals are missing");
  assert(threeWay.legacyCore === "undefined", "retired schema-1 core is present");
  assert(threeWay.bodyMode && threeWay.panelHidden === false, "workspace is hidden");
  assert(threeWay.midDisplay === "none", "legacy three-way controls are visible");
  assert(
    threeWay.exactDisabled
      && threeWay.stlDisabled
      && threeWay.hornrespDisabled,
    "unadmitted export controls are enabled",
  );
  assert(
    threeWay.viewIds.includes("no-drivers-mount-assembly")
      && !threeWay.viewIds.includes("nodrv"),
    "schema-2 view selector was not installed",
  );
  assert(threeWay.guidedControls, "guided three-way sliders are not visible");
  assert(threeWay.solveVisible, "guided three-way solve action is not visible");
  assert(
    threeWay.statusTier === "validated"
      && /CANONICAL THREE-WAY ANALYSIS SOLVED/.test(threeWay.statusText),
    "guided three-way study did not auto-solve",
  );
  assert(threeWay.solved === null, "legacy solve survived schema-2 activation");

  await page.locator("#threewayResearchDetails").evaluate(details => {
    details.open = true;
  });
  await page.click("#threewaySave");
  const saved = await page.evaluate(() => ({
    writes: { ...window.__build654Writes },
    schema2: localStorage.getItem("meh5_threeway_state_v2"),
  }));
  assert(saved.writes.schema2 >= 1, "schema-2 save did not use its own key");
  assert(saved.schema2, "schema-2 state was not persisted");
  assert(
    saved.writes.legacy === before.writes.legacy,
    "three-way activation/save wrote the legacy state key",
  );

  await page.click('#segTopo button[data-v="2way"]');
  await page.waitForFunction(() => (
    !document.body.classList.contains("threeway-v2-mode")
      && document.getElementById("threewayV2Ctl")?.hidden
      && window.__solved
  ), null, { timeout: 30_000 });
  const restored = await page.evaluate(() => ({
    topology: S.topo,
    viewIds: [...document.getElementById("viewSel").options].map(
      option => option.value,
    ),
  }));
  assert(restored.topology === "2way", "two-way topology was not restored");
  assert(restored.viewIds.includes("nodrv"), "legacy view selector was not restored");
  assert(errors.length === 0, `accepted boot errors: ${errors.join(" | ")}`);
  await context.close();

  console.log(
    "BUILD-654 DELIVERY CONTRACT PASS — schema-2 isolation, storage, "
      + "export locks, and two-way restoration verified",
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
