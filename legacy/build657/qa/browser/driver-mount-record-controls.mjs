#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const engine = require(path.join(appRoot, "engine.js"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [shell, profileLaws, engineSource, twoWay] = await Promise.all([
  readFile(path.join(appRoot, "shell.html"), "utf8"),
  readFile(path.join(appRoot, "profile-laws.js"), "utf8"),
  readFile(path.join(appRoot, "engine.js"), "utf8"),
  readFile(path.join(appRoot, "twoway-core.js"), "utf8"),
]);
const runtime = shell
  .replace("/*__PROFILE_LAWS__*/", profileLaws)
  .replace("/*__ENGINE__*/", engineSource)
  .replace("/*__TWOWAY__*/", twoWay)
  .replace("/*__CAD__*/", "/* driver mount record browser contract */");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

const build = engine.BUILDS["2way"].find(({ key }) => key === "hinson10");
assert(build, "Hinson fixture is missing");
const fixture = { ...build.s, _smart2waySchema: 3 };
const mutations = [
  { field: "boltNW", value: 6, view: "mount", frameKey: "boltN" },
  { field: "bcdW", value: 238, view: "mount", frameKey: "bcdMm" },
  { field: "boltDW", value: 9.5, view: "mount", frameKey: "boltDMm" },
  { field: "gasketW", value: 4, view: "cell", frameKey: "gasketMm" },
];

async function canvasHash(page) {
  const image = await page.locator("#v3d canvas").screenshot();
  return createHash("sha256").update(image).digest("hex");
}

async function snapshot(page) {
  return page.evaluate(() => {
    const plan = window.__twoWayGeometry?.plan;
    const frame = plan?.frame;
    const qa = window.__panelMountQA;
    const boltTools = window.__twoWayGeometry?.visualTools?.boltTools?.[0] || [];
    const gaskets = [];
    V3D.group?.traverse((object) => {
      if (!object.visible || object.userData?.tag !== "gasket" || !object.geometry) {
        return;
      }
      object.geometry.computeBoundingBox();
      const box = object.geometry.boundingBox;
      gaskets.push({
        depth: box ? box.max.z - box.min.z : null,
        vertices: object.geometry.attributes?.position?.count || 0,
      });
    });
    const controls = {};
    for (const id of [
      "mountFrameDiameterMm",
      "mountActiveDiameterMm",
      "boltNW",
      "bcdW",
      "boltDW",
      "gasketW",
    ]) {
      const element = document.getElementById(id);
      controls[id] = {
        value: Number(element?.value),
        readOnly: element?.readOnly,
        min: element?.min,
        max: element?.max,
        step: element?.step,
      };
    }
    return {
      view: V3D.view,
      design: S.twoDesign,
      tapBasis: S.tapBasis,
      stateHash: window.__stateIdentity?.hash,
      meshKey: MEH2.twoWayMeshKey(
        window.__solved.S,
        "manufacturing-preview",
      ),
      frame: {
        diameterMm: frame?.od * 1000,
        activeDiameterMm: frame?.activeR * 2000,
        boltN: frame?.boltN,
        bcdMm: frame?.bcd * 1000,
        boltDMm: frame?.boltD * 1000,
        gasketMm: frame?.gasketT * 1000,
      },
      controls,
      qa: {
        focusedPlateVisible: qa?.focusedPlateVisible,
        completeCellInspection: qa?.completeCellInspection,
        focusedPocketCount: qa?.focusedDriverPocketHoleCount,
        visibleGasketCount: qa?.visibleGasketCount,
        focusedFacePresent: qa?.invariants?.focusedFacePresent,
        completeCellHasGasket: qa?.invariants?.completeCellHasGasket,
        completeCellHasBoltDetails: qa?.invariants?.completeCellHasBoltDetails,
      },
      boltWitness: JSON.stringify(boltTools.map((tool) => ({
        a: tool.a,
        b: tool.b,
        r: tool.r,
        fastenerD: tool.fastenerD,
        pocketD: tool.pocketD,
      }))),
      gaskets,
      saved: JSON.parse(localStorage.getItem("meh5_state") || "{}"),
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const mutation of mutations) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    await context.addInitScript((state) => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("meh5_state", JSON.stringify(state));
      } catch {
        // Also runs before the page receives its loopback origin.
      }
    }, fixture);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error.stack || error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/shell.html?build=653`
        + `&view=${mutation.view}&mountFocus=0&rev=mount-${mutation.field}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );
    await page.waitForFunction((view) => (
      window.MEH_RUNTIME_SENTINEL?.status === "ready"
      && window.__twoWayGeometry?.plan?.frame
      && window.__panelMountQA
      && V3D.view === view
      && window.__panelMountQA.focusedDriverIndex === 0
    ), mutation.view, { timeout: 30_000 });
    await page.evaluate(() => new Promise((resolve) => (
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    )));

    const before = await snapshot(page);
    const beforeImage = await canvasHash(page);
    assert(before.design === "hinson10", `${mutation.field}: fixture is not documented`);
    assert(before.frame.diameterMm === 261, `${mutation.field}: frame context drifted`);
    assert(
      Math.abs(before.frame.activeDiameterMm - 201.85060176161282) < 1e-9,
      `${mutation.field}: active-diameter context drifted`,
    );
    assert(before.controls.mountFrameDiameterMm.readOnly === true);
    assert(before.controls.mountActiveDiameterMm.readOnly === true);
    assert(before.controls.boltNW.min === "4" && before.controls.boltNW.max === "16");
    assert(before.controls.bcdW.min === "20" && before.controls.bcdW.max === "600");
    assert(before.controls.boltDW.min === "2" && before.controls.boltDW.max === "20");
    assert(before.controls.gasketW.min === "0.5" && before.controls.gasketW.max === "12");
    assert(
      mutation.view !== "mount" || before.qa.focusedPlateVisible === true,
      `${mutation.field}: isolated plate view is not active`,
    );
    assert(
      mutation.view !== "cell"
        || (before.qa.completeCellInspection === true
          && before.qa.completeCellHasGasket === true),
      `${mutation.field}: complete-cell view is incomplete`,
    );

    await page.locator(`#${mutation.field}`).evaluate((element, value) => {
      element.value = String(value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, mutation.value);
    await page.waitForFunction(({ field, value, hash, view }) => (
      S[field] === value
      && S.twoDesign === "arch:panel"
      && S.tapBasis === "model"
      && window.__stateIdentity?.hash
      && window.__stateIdentity.hash !== hash
      && V3D.view === view
      && window.__panelMountQA?.focusedDriverIndex === 0
    ), {
      field: mutation.field,
      value: mutation.value,
      hash: before.stateHash,
      view: mutation.view,
    }, { timeout: 30_000 });
    await page.evaluate(() => new Promise((resolve) => (
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    )));

    const after = await snapshot(page);
    const afterImage = await canvasHash(page);
    assert(after.design === "arch:panel", `${mutation.field}: package stayed documented`);
    assert(after.tapBasis === "model", `${mutation.field}: taps stayed published`);
    assert(after.saved[mutation.field] === mutation.value, `${mutation.field}: not persisted`);
    assert(after.saved.twoDesign === "arch:panel", `${mutation.field}: saved design is stale`);
    assert(after.frame[mutation.frameKey] === mutation.value, `${mutation.field}: plan is stale`);
    assert(after.stateHash !== before.stateHash, `${mutation.field}: state hash is stale`);
    assert(after.meshKey !== before.meshKey, `${mutation.field}: mesh key is stale`);
    assert(afterImage !== beforeImage, `${mutation.field}: isolated view did not visibly change`);
    if (mutation.field === "boltNW") {
      assert(after.qa.focusedPocketCount === 6, "bolt count missed the isolated plate");
    } else if (mutation.field !== "gasketW") {
      assert(after.boltWitness !== before.boltWitness, `${mutation.field}: bolt tools are stale`);
    } else {
      assert(after.qa.visibleGasketCount === 1, "complete cell lost its gasket");
      assert(after.qa.completeCellHasBoltDetails === true, "complete cell lost bolt details");
      assert(
        JSON.stringify(after.gaskets) !== JSON.stringify(before.gaskets),
        "gasket thickness did not update complete-cell geometry",
      );
    }
    assert(errors.length === 0, `${mutation.field}: browser errors:\n${errors.join("\n")}`);
    results.push({
      field: mutation.field,
      view: mutation.view,
      stateHash: `${before.stateHash} → ${after.stateHash}`,
      canvasHash: `${beforeImage.slice(0, 12)} → ${afterImage.slice(0, 12)}`,
    });
    await context.close();
  }
  console.log(JSON.stringify({ pass: true, mutations: results }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
