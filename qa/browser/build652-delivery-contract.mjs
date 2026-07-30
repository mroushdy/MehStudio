#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [shell, profileLaws, engine, twoWay] = await Promise.all([
  readFile(path.join(appRoot, "shell.html"), "utf8"),
  readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
  readFile(path.join(appRoot, "engine.js"), "utf8"),
  readFile(path.join(appRoot, "twoway-core.js"), "utf8"),
]);
const runtime = shell
  .replace("/*__PROFILE_LAWS__*/", profileLaws)
  .replace("/*__ENGINE__*/", engine)
  .replace("/*__TWOWAY__*/", twoWay)
  .replace("/*__CAD__*/", "/* Build 652 delivery contract */");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/shell.html") {
      response.writeHead(200, {
        "Content-Type": mime[".html"],
        "Cache-Control": "no-store",
      });
      response.end(runtime);
      return;
    }
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
const base = `http://127.0.0.1:${address.port}`;

const browser = await chromium.launch({ headless: true });
try {
  const refusedContext = await browser.newContext();
  await refusedContext.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const removeItem = Storage.prototype.removeItem;
    window.__deliveryStorageQA = { reads: 0, removes: 0 };
    Storage.prototype.getItem = function qaGetItem(key) {
      if (key === "meh5_state") window.__deliveryStorageQA.reads += 1;
      return getItem.call(this, key);
    };
    Storage.prototype.removeItem = function qaRemoveItem(key) {
      if (key === "meh5_state") window.__deliveryStorageQA.removes += 1;
      return removeItem.call(this, key);
    };
    localStorage.setItem("meh5_state", JSON.stringify({
      _smart2waySchema: 3,
      topo: "1way",
      style: "smooth",
      mouthW: 52,
    }));
  });
  const refusedPage = await refusedContext.newPage();
  const refusedErrors = [];
  refusedPage.on("pageerror", (error) => refusedErrors.push(String(error)));
  await refusedPage.goto(
    `${base}/shell.html?build=649&view=nodrv&reset=1`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await refusedPage.waitForSelector(
    "#runtimeSentinel.runtime-refused",
    { timeout: 30_000 },
  );
  const refused = await refusedPage.evaluate(() => ({
    sentinel: window.MEH_RUNTIME_SENTINEL,
    storage: window.__deliveryStorageQA,
    dom: { ...document.documentElement.dataset },
    canvasCount: document.querySelectorAll("#v3d canvas").length,
    text: document.getElementById("runtimeSentinel")?.textContent || "",
  }));
  assert(refusedErrors.length === 0, `refused boot errors: ${refusedErrors.join(" | ")}`);
  assert(refused.sentinel?.status === "refused", "stale build did not refuse");
  assert(refused.sentinel?.build === 652, "refusal reports the wrong loaded build");
  assert(refused.sentinel?.requestedBuild === "649", "requested build is missing");
  assert(refused.sentinel?.view === "nodrv", "refusal lost the requested view");
  assert(refused.sentinel?.resetApplied === false, "refused reset was applied");
  assert(refused.storage.reads === 0, "refused boot read saved geometry");
  assert(refused.storage.removes === 0, "refused boot erased saved geometry");
  assert(refused.canvasCount === 0, "refused boot initialized the 3D runtime");
  assert(refused.dom.runtimeStatus === "refused", "DOM refusal sentinel is missing");
  assert(refused.text.includes("LOADED SOURCE IS BUILD 652"), "visible refusal is unclear");
  await refusedContext.close();

  const resetContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await resetContext.addInitScript(() => {
    const removeItem = Storage.prototype.removeItem;
    window.__deliveryStorageQA = { removes: 0 };
    Storage.prototype.removeItem = function qaRemoveItem(key) {
      if (key === "meh5_state") window.__deliveryStorageQA.removes += 1;
      return removeItem.call(this, key);
    };
    localStorage.setItem("meh5_state", JSON.stringify({
      _smart2waySchema: 3,
      topo: "1way",
      style: "smooth",
      mouthW: 52,
      requestedMouthW: 52,
    }));
  });
  const resetPage = await resetContext.newPage();
  const resetErrors = [];
  resetPage.on("pageerror", (error) => resetErrors.push(String(error)));
  resetPage.on("console", (message) => {
    if (message.type() === "error") resetErrors.push(message.text());
  });
  await resetPage.goto(
    `${base}/shell.html?build=652&view=nodrv&reset=1`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await resetPage.waitForFunction(() => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__solved
  ), null, { timeout: 30_000 });
  const reset = await resetPage.evaluate(() => ({
    sentinel: window.MEH_RUNTIME_SENTINEL,
    storage: window.__deliveryStorageQA,
    dom: { ...document.documentElement.dataset },
    topo: S.topo,
    mouthW: S.mouthW,
    view: V3D.view,
    selectorView: document.getElementById("viewSel")?.value,
    buildText: document.getElementById("bno")?.textContent,
    meshPolicyVersion:
      typeof MEH2 !== "undefined" ? MEH2.twoWayMeshPolicyVersion : null,
    canvasCount: document.querySelectorAll("#v3d canvas").length,
  }));
  assert(resetErrors.length === 0, `accepted boot errors: ${resetErrors.join(" | ")}`);
  assert(reset.sentinel?.status === "ready", "Build 652 did not become ready");
  assert(reset.sentinel?.build === 652, "ready sentinel reports the wrong build");
  assert(reset.sentinel?.resetApplied === true, "reset=1 was not applied");
  assert(reset.sentinel?.resetStorageRemoved === true, "saved geometry was not removed");
  assert(reset.storage.removes >= 1, "storage removal was not observable");
  assert(reset.topo === "2way", "saved one-way topology survived reset");
  assert(reset.mouthW !== 52, "saved mouth survived reset");
  assert(reset.view === "nodrv", "boot view did not win after wiring");
  assert(reset.selectorView === "nodrv", "view selector disagrees with runtime");
  assert(reset.sentinel?.view === "nodrv", "sentinel reports the wrong view");
  assert(
    typeof reset.sentinel?.stateHash === "string"
      && reset.sentinel.stateHash.startsWith("b652-"),
    "ready sentinel has no Build 652 state hash",
  );
  assert(reset.sentinel?.revision >= 1, "ready sentinel has no state revision");
  assert(reset.dom.runtimeBuild === "652", "DOM build sentinel is missing");
  assert(reset.dom.runtimeView === "nodrv", "DOM view sentinel is missing");
  assert(reset.dom.runtimeStateHash === reset.sentinel.stateHash, "DOM hash differs");
  assert(reset.dom.runtimeRevision === String(reset.sentinel.revision), "DOM revision differs");
  assert(reset.buildText === "652", "visible header build is wrong");
  assert(
    reset.meshPolicyVersion === "b652-differential-cell-terminal-grid-v3",
    `loaded mesh policy is ${reset.meshPolicyVersion}`,
  );
  assert(reset.canvasCount === 1, "accepted boot did not initialize the viewer");
  await resetContext.close();

  console.log(
    `BUILD-652 DELIVERY CONTRACT PASS — refusal preserved saved state; `
    + `reset boot ${reset.sentinel.stateHash} rev ${reset.sentinel.revision} `
    + `view ${reset.sentinel.view}`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
