#!/usr/bin/env node
/*
 * Current release live product-surface contract.
 *
 * This checks observable family/driver controls and the rendered three-way
 * assembly. It deliberately does not assert manufacturing admission by
 * default. Set MEH_BUILD655_REQUIRE_MANUFACTURING=1 only after the root
 * release owner confirms that an exact Boolean result, deep audit, and STL
 * bytes are genuinely part of the delivered runtime.
 */
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import { PNG } from "pngjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const assembled = await readFile(path.join(appRoot, "meh5.html"), "utf8");
const artifactDir = process.env.MEH_BUILD655_ARTIFACT_DIR
  ? path.resolve(process.env.MEH_BUILD655_ARTIFACT_DIR)
  : null;
const requireManufacturing =
  process.env.MEH_BUILD655_REQUIRE_MANUFACTURING === "1";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  /window\.MEH_BUILD=657;/.test(assembled),
  "STALE_ASSEMBLY: meh5.html is not Build 657",
);
for (const globalName of [
  "MEH3FamilyCatalog",
  "MEH3SolidGeometry",
  "MEH3SolidIntent",
  "MEH3UI",
]) {
  assert(
    new RegExp(globalName).test(assembled),
      `Release browser bundle is missing ${globalName}`,
  );
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
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

function imageMetrics(buffer) {
  const png = PNG.sync.read(buffer);
  const samples = [
    [0, 0],
    [png.width - 1, 0],
    [0, png.height - 1],
    [png.width - 1, png.height - 1],
  ].map(([x, y]) => {
    const offset = (y * png.width + x) * 4;
    return [
      png.data[offset],
      png.data[offset + 1],
      png.data[offset + 2],
    ];
  });
  const background = [0, 1, 2].map(channel =>
    samples.reduce((sum, sample) => sum + sample[channel], 0) /
      samples.length,
  );
  let pixels = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      if (png.data[offset + 3] < 160) continue;
      const distance = Math.hypot(
        png.data[offset] - background[0],
        png.data[offset + 1] - background[1],
        png.data[offset + 2] - background[2],
      );
      if (distance < 18) continue;
      pixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const found = pixels > 0;
  return {
    width: png.width,
    height: png.height,
    changedPixelRatio: pixels / (png.width * png.height),
    bboxWidthRatio: found ? (maxX - minX + 1) / png.width : 0,
    bboxHeightRatio: found ? (maxY - minY + 1) / png.height : 0,
    touchesEdge: found && (
      minX <= 1 || minY <= 1 ||
      maxX >= png.width - 2 || maxY >= png.height - 2
    ),
  };
}

async function captureView(page, viewId) {
  await page.selectOption("#viewSel", viewId);
  await page.waitForFunction(expected => {
    const group = V3D.scene?.children?.find(child =>
      child?.userData?.meh3?.kind === "threeway-render-group");
    return group?.userData?.meh3?.viewId === expected;
  }, viewId, { timeout: 30_000 });
  await page.waitForTimeout(120);
  const scene = await page.evaluate(() => {
    const group = V3D.scene.children.find(child =>
      child?.userData?.meh3?.kind === "threeway-render-group");
    const categories = {};
    for (const child of group?.children || []) {
      const category = child?.userData?.meh3?.category || "unknown";
      categories[category] = (categories[category] || 0) + 1;
    }
    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.isEmpty()
      ? null : box.getBoundingSphere(new THREE.Sphere());
    const projected = box.isEmpty() ? [] : [
      [box.min.x, box.min.y, box.min.z],
      [box.min.x, box.min.y, box.max.z],
      [box.min.x, box.max.y, box.min.z],
      [box.min.x, box.max.y, box.max.z],
      [box.max.x, box.min.y, box.min.z],
      [box.max.x, box.min.y, box.max.z],
      [box.max.x, box.max.y, box.min.z],
      [box.max.x, box.max.y, box.max.z],
    ].map(point => new THREE.Vector3(...point).project(V3D.camera));
    return {
      viewId: group?.userData?.meh3?.viewId || null,
      renderHash: group?.userData?.meh3?.renderHash || null,
      categories,
      children: group?.children?.length || 0,
      radiusM: sphere?.radius ?? null,
      centerM: sphere
        ? [sphere.center.x, sphere.center.y, sphere.center.z] : null,
      cameraDistanceM: V3D.camera && V3D.tgt
        ? V3D.camera.position.distanceTo(V3D.tgt) : null,
      projectedMaxAbs: projected.length
        ? Math.max(...projected.flatMap(point => [
          Math.abs(point.x), Math.abs(point.y),
        ])) : null,
    };
  });
  const screenshot = await page.locator("#v3d canvas").screenshot();
  const pixels = imageMetrics(screenshot);
  if (artifactDir) {
    await mkdir(artifactDir, { recursive: true });
    await writeFile(
      path.join(artifactDir, `build655-threeway-${viewId}.png`),
      screenshot,
    );
  }
  assert(scene.viewId === viewId, `${viewId}: wrong scene view`);
  assert(scene.children >= 1, `${viewId}: empty render group`);
  assert(
    Number.isFinite(scene.radiusM) && scene.radiusM > 0.05,
    `${viewId}: invalid assembly bounds`,
  );
  assert(
    Number.isFinite(scene.cameraDistanceM) &&
      scene.cameraDistanceM > scene.radiusM * 0.5 &&
      scene.cameraDistanceM < scene.radiusM * 12,
    `${viewId}: camera was not fitted to the assembly`,
  );
  assert(
    pixels.changedPixelRatio >= 0.006,
    `${viewId}: rendered pixels occupy too little of the viewport`,
  );
  assert(
    pixels.bboxWidthRatio >= 0.2 && pixels.bboxHeightRatio >= 0.2,
    `${viewId}: visible assembly is still a tiny scaffold`,
  );
  assert(
    Number.isFinite(scene.projectedMaxAbs) && scene.projectedMaxAbs <= 1.02,
    `${viewId}: assembly is clipped by the camera frustum `
      + `(${scene.projectedMaxAbs})`,
  );
  return { scene, pixels };
}

const browser = await chromium.launch({ headless: true });
const summary = { build: 657, families: null, drivers: null, views: {} };
try {
  const refusedContext = await browser.newContext();
  await refusedContext.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const removeItem = Storage.prototype.removeItem;
    window.__build655StorageQA = { reads: 0, removes: 0 };
    Storage.prototype.getItem = function qaGetItem(key) {
      if (key === "meh5_state" || key === "meh5_threeway_state_v2") {
        window.__build655StorageQA.reads += 1;
      }
      return getItem.call(this, key);
    };
    Storage.prototype.removeItem = function qaRemoveItem(key) {
      if (key === "meh5_state" || key === "meh5_threeway_state_v2") {
        window.__build655StorageQA.removes += 1;
      }
      return removeItem.call(this, key);
    };
  });
  const refusedPage = await refusedContext.newPage();
  const refusedErrors = [];
  refusedPage.on("pageerror", error => refusedErrors.push(String(error)));
  await refusedPage.goto(
    `${base}?build=654&reset=1&view=full-assembly`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await refusedPage.waitForSelector(
    "#runtimeSentinel.runtime-refused",
    { timeout: 30_000 },
  );
  const refused = await refusedPage.evaluate(() => ({
    sentinel: window.MEH_RUNTIME_SENTINEL,
    storage: window.__build655StorageQA,
    canvasCount: document.querySelectorAll("#v3d canvas").length,
  }));
  assert(refusedErrors.length === 0, refusedErrors.join(" | "));
  assert(refused.sentinel?.status === "refused", "stale build did not refuse");
  assert(refused.sentinel?.build === 657, "refusal reports the wrong build");
  assert(refused.storage.reads === 0, "refused boot read saved state");
  assert(refused.storage.removes === 0, "refused boot erased saved state");
  assert(refused.canvasCount === 0, "refused boot initialized WebGL");
  await refusedContext.close();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("meh5_threeway_state_v2", JSON.stringify({
      schemaVersion: 2,
      stale: true,
    }));
    const removeItem = Storage.prototype.removeItem;
    window.__build655StorageQA = { schema2Removes: 0 };
    Storage.prototype.removeItem = function qaRemoveItem(key) {
      if (key === "meh5_threeway_state_v2") {
        window.__build655StorageQA.schema2Removes += 1;
      }
      return removeItem.call(this, key);
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(
    `${base}?build=657&reset=1&view=full-assembly&rev=delivery-contract`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await page.waitForFunction(() => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready" && window.__solved
  ), null, { timeout: 30_000 });
  assert(
    await page.evaluate(() => window.__build655StorageQA.schema2Removes >= 1),
    "reset=1 did not remove saved schema-2 state",
  );

  await page.click('#segTopo button[data-v="3way"]');
  await page.waitForFunction(() => (
    document.body.classList.contains("threeway-v2-mode") &&
    document.getElementById("threewayV2Status")?.dataset.tier === "validated" &&
    /SOLVED/.test(
      document.getElementById("threewayV2Status")?.textContent || "",
    )
  ), null, { timeout: 30_000 });
  await page.waitForFunction(() => V3D.scene?.children?.some(child =>
    child?.userData?.meh3?.kind === "threeway-render-group"),
  null, { timeout: 30_000 });

  summary.families = await page.evaluate(() => {
    const selector = document.getElementById("threewayQuickStartSel");
    const options = [...(selector?.options || [])].map(option => ({
      value: option.value,
      label: option.textContent?.trim() || "",
    }));
    const catalogFamilies = MEH3FamilyCatalog.listSelectableFamilies()
      .map(family => ({
        id: family.id,
        topology: family.topology,
        label: family.label || family.title || family.id,
      }));
    return {
      visible: !!selector && getComputedStyle(selector).display !== "none",
      selected: selector?.value || null,
      options,
      catalogFamilies,
    };
  });
  assert(summary.families.visible, "three-way family selector is hidden");
  assert(
    summary.families.options.length >= 4,
    "family selector does not expose calculated and known-family starts",
  );
  assert(
    new Set(summary.families.options.map(option => option.value)).size ===
      summary.families.options.length,
    "family selector has duplicate option identities",
  );
  assert(
    JSON.stringify(
      summary.families.catalogFamilies.map(item => item.topology).sort(),
    ) === JSON.stringify(["CX3", "H3", "T3"]),
    "the browser catalog does not expose T3, CX3, and H3",
  );

  summary.drivers = await page.evaluate(() => (
    ["Low", "Mid", "High"].map(band => {
      const selector = document.getElementById(`threewayDriver${band}`);
      const status =
        document.getElementById(`threewayDriver${band}Status`);
      return {
        band: band.toLowerCase(),
        visible: !!selector && getComputedStyle(selector).display !== "none",
        value: selector?.value || null,
        optionCount: selector?.options?.length || 0,
        status: status?.textContent?.trim() || "",
        statusClass: status?.className || "",
      };
    })
  ));
  for (const driver of summary.drivers) {
    assert(driver.visible, `${driver.band} driver selector is hidden`);
    assert(driver.optionCount >= 1, `${driver.band} driver list is empty`);
    assert(driver.value, `${driver.band} driver has no selected record`);
    assert(
      /COMPATIBLE|FAMILY-BOUND/.test(driver.status),
      `${driver.band} driver is not visibly family-compatible`,
    );
  }

  for (const viewId of [
    "full-assembly",
    "no-drivers-mount-assembly",
    "lumen-inspection",
    "section-cutaway",
  ]) {
    summary.views[viewId] = await captureView(page, viewId);
  }

  const full = summary.views["full-assembly"].scene.categories;
  assert((full["horn-surface"] || 0) >= 1, "full view has no horn");
  assert(
    (full.driver || 0) + (full["throat-interface"] || 0) >= 3,
    `full view has fewer than three LF/MF/HF interfaces: `
      + `${JSON.stringify(full)}`,
  );
  assert(
    (full["mount-host"] || 0) >= 2,
    "full view has fewer than two wall-driver mounting hosts",
  );
  assert((full.aperture || 0) >= 2, "full view has fewer than two tap openings");

  const noDrivers =
    summary.views["no-drivers-mount-assembly"].scene.categories;
  assert((noDrivers.driver || 0) === 0, "no-driver view still contains drivers");
  assert(
    (noDrivers["mount-host"] || 0) >= 2,
    "no-driver view does not show both wall-driver mounts",
  );
  assert(
    (noDrivers.aperture || 0) >= 2,
    "no-driver view does not show both tap openings",
  );

  const lumen = summary.views["lumen-inspection"].scene.categories;
  assert(
    (lumen["lumen-inspection"] || 0) >= 2,
    "flow-path view does not show both canonical wall-entry lumens",
  );

  const exportState = await page.evaluate(() => ({
    exactDisabled: document.getElementById("bExact")?.disabled,
    stlDisabled: document.getElementById("bStl")?.disabled,
    exactLabel: document.getElementById("bExact")?.textContent || "",
    stlLabel: document.getElementById("bStl")?.textContent || "",
    badge: document.getElementById("fabBadge")?.textContent || "",
    runtimeManufacturing:
      typeof THREEWAY_UI_RUNTIME !== "undefined" &&
      THREEWAY_UI_RUNTIME?.getState
        ? THREEWAY_UI_RUNTIME.getState().manufacturing : null,
  }));
  if (requireManufacturing) {
    assert(!exportState.exactDisabled, "admitted release exact mesh is disabled");
    assert(!exportState.stlDisabled, "admitted release STL export is disabled");
    assert(
      exportState.runtimeManufacturing === true,
      "manufacturing controls were enabled without a runtime authorization",
    );
  } else if (!exportState.exactDisabled || !exportState.stlDisabled) {
    assert(
      exportState.runtimeManufacturing === true,
      "export controls were enabled without a current manufacturing token",
    );
  }

  assert(errors.length === 0, `accepted boot errors: ${errors.join(" | ")}`);
  if (artifactDir) {
    await writeFile(
      path.join(artifactDir, "manifest.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
  }
  console.log(
    "BUILD-657 DELIVERY CONTRACT PASS — family/driver controls, "
      + "framed assembly, mounts, lumens, and section views verified",
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
