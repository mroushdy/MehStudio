#!/usr/bin/env node
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const qaRoot = path.resolve(here, "..");
const appRoot = path.resolve(qaRoot, "..");
const assembledPath = path.join(appRoot, "meh5.html");
const output = path.resolve(
  process.env.MEH_RENDER_STRESS_OUTPUT
    || path.join(qaRoot, "artifacts/build652-renderer-stress"),
);
const requestedCycles = Number.parseInt(
  process.env.MEH_RENDER_STRESS_CYCLES || "10",
  10,
);
const cycles = Number.isInteger(requestedCycles) && requestedCycles > 0
  ? requestedCycles
  : 10;

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
        request.on("end", () => json(response, 200, {
          ok: true,
          pins: [],
        }));
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
const target = `http://127.0.0.1:${address.port}/meh5.html`
  + "?build=652&reset=1&view=nodrv&mountFocus=0"
  + "&qa=build652-renderer-stress";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-precise-memory-info",
    "--js-flags=--expose-gc",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const browserErrors = [];
let crashed = false;

page.on("crash", () => {
  crashed = true;
  browserErrors.push("renderer process crashed");
});
page.on("pageerror", (error) => {
  browserErrors.push(`pageerror: ${error.message}`);
});
page.on("console", (message) => {
  if (message.type() === "error") {
    browserErrors.push(`console.error: ${message.text()}`);
  }
});
page.on("requestfailed", (request) => {
  const kind = request.resourceType();
  if (["document", "script", "worker"].includes(kind)) {
    browserErrors.push(
      `requestfailed/${kind}: ${request.url()}`
        + ` · ${request.failure()?.errorText || "unknown"}`,
    );
  }
});

async function waitReady() {
  await page.waitForFunction(() => (
    window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__solved
    && window.__twoWayGeometry?.plan
    && window.__stateIdentity?.hash
    && window.__twoMeshRuntime?.active !== true
    && typeof V3D !== "undefined"
    && V3D.renderer
  ), null, { timeout: 60_000 });
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
}

async function resourceSnapshot(label, cycle = null, step = null) {
  return page.evaluate(({ label: sampleLabel, cycle: sampleCycle, step: sampleStep }) => {
    const renderer = V3D.renderer;
    const info = renderer.info;
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const textureKeys = [
      "map", "alphaMap", "aoMap", "bumpMap", "normalMap",
      "displacementMap", "emissiveMap", "envMap", "lightMap",
      "metalnessMap", "roughnessMap", "specularMap", "gradientMap",
      "matcap", "clearcoatMap", "clearcoatNormalMap",
      "clearcoatRoughnessMap", "iridescenceMap",
      "iridescenceThicknessMap", "sheenColorMap", "sheenRoughnessMap",
      "transmissionMap", "thicknessMap",
    ];
    let objects = 0;
    let meshes = 0;
    let lines = 0;
    if (V3D.group) {
      V3D.group.traverse((object) => {
        objects += 1;
        if (object.isMesh) meshes += 1;
        if (object.isLine || object.isLineSegments) lines += 1;
        if (object.geometry) geometries.add(object.geometry);
        const list = Array.isArray(object.material)
          ? object.material
          : object.material ? [object.material] : [];
        for (const material of list) {
          if (!material) continue;
          materials.add(material);
          for (const key of textureKeys) {
            const texture = material[key];
            if (texture?.isTexture) textures.add(texture);
          }
        }
      });
    }
    const gl = renderer.getContext();
    const heap = performance.memory || null;
    return {
      label: sampleLabel,
      cycle: sampleCycle,
      step: sampleStep,
      stateHash: window.__stateIdentity?.hash || null,
      view: V3D.view,
      xray: Boolean(V3D.xray),
      profileLaw: S.profileLaw,
      mouthW: S.mouthW,
      wallMm: S.wallT * 1000,
      solved: {
        infeasible: Boolean(window.__solved?.infeasible),
        driverCount: window.__twoWayGeometry?.plan?.drivers?.length || 0,
        failCount: Number(window.__solved?.ev?.fails || 0),
      },
      renderer: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: Array.isArray(info.programs) ? info.programs.length : null,
        calls: info.render.calls,
        triangles: info.render.triangles,
        lines: info.render.lines,
        points: info.render.points,
      },
      liveGroup: {
        objects,
        meshes,
        lines,
        geometries: geometries.size,
        materials: materials.size,
        textures: textures.size,
      },
      disposal: window.__webglResourceQA
        ? JSON.parse(JSON.stringify(window.__webglResourceQA))
        : null,
      context: {
        diagnostics: window.__webglContextQA
          ? JSON.parse(JSON.stringify(window.__webglContextQA))
          : null,
        isLost: gl.isContextLost(),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      },
      heap: heap ? {
        used: heap.usedJSHeapSize,
        total: heap.totalJSHeapSize,
        limit: heap.jsHeapSizeLimit,
      } : null,
    };
  }, { label, cycle, step });
}

function assertHealthy(sample, label) {
  assert(!crashed, `${label}: renderer process crashed`);
  assert(sample.solved.driverCount === 6,
    `${label}: ${sample.solved.driverCount}/6 stress drivers`);
  assert(sample.solved.infeasible === false,
    `${label}: stress fixture became infeasible`);
  assert(sample.solved.failCount === 0,
    `${label}: ${sample.solved.failCount} design laws failed`);
  assert(Number.isFinite(sample.renderer.geometries),
    `${label}: renderer geometry count is unavailable`);
  assert(Number.isFinite(sample.renderer.textures),
    `${label}: renderer texture count is unavailable`);
  assert(Number.isFinite(sample.renderer.programs),
    `${label}: renderer program count is unavailable`);
  assert(sample.context.isLost === false,
    `${label}: WebGL context reports lost`);
  assert(sample.context.diagnostics?.lost === false,
    `${label}: context-loss diagnostics report lost`);
  assert(sample.context.diagnostics?.lossCount === 0,
    `${label}: context loss count is `
      + `${sample.context.diagnostics?.lossCount ?? "missing"}`);
}

async function waitForRebuild(previousCycles, label) {
  await page.waitForFunction((before) => (
    (window.__webglResourceQA?.cycles || 0) > before
    && window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__solved
    && window.__twoWayGeometry?.plan
    && window.__twoMeshRuntime?.active !== true
  ), previousCycles, { timeout: 60_000 });
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
  const sample = await resourceSnapshot(label);
  assertHealthy(sample, label);
  return sample;
}

async function uiRebuild(label, mutate, argument = null) {
  const before = await page.evaluate(
    () => window.__webglResourceQA?.cycles || 0,
  );
  await page.evaluate(mutate, argument);
  return waitForRebuild(before, label);
}

async function installStressFixture() {
  const before = await page.evaluate(
    () => window.__webglResourceQA?.cycles || 0,
  );
  await page.evaluate(() => {
    const next = MEH2.migrateTwoWayState({
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
      sectionCornerRatio: 0.25,
      seN: 12,
      covH: 90,
      covV: 60,
      mouthW: 55,
      requestedMouthW: 55,
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
      frameW: "round",
      boltNW: 4,
      boltDW: 5,
      gasketW: 1.6,
      nW: 6,
      npW: 2,
      driverArrayMode: "auto",
      driverArrayRotationDeg: 0,
      shW: "slot",
      tapShapeW: "slot",
      tapPairMode: "auto",
      twoXO: 500,
      tapCRW: 6,
      driverMountMode: "shortest",
      driverMountExtraMm: 0,
      driverAxisBlend: 0,
      driverCellConstruction: "integrated",
      coneProfileMode: "flat",
      coneDepthMm: 0,
      coneDepthKnown: false,
      coneAxialClearanceMm: 0,
      coneRadialClearanceMm: 0,
    });
    for (const key of Object.keys(S)) delete S[key];
    Object.assign(S, next, { _smart2waySchema: 3 });
    V3D.view = "nodrv";
    V3D.xray = false;
    V3D.mountFocus = "0";
    V3D.nodrvCameraDirty = true;
    rebuild();
  });
  await waitForRebuild(before, "install six-driver stress fixture");
}

async function verifyStreamedInputCoalescing() {
  const before = await page.evaluate(() => ({
    disposal: window.__webglResourceQA?.cycles || 0,
    requests: window.__geometryRebuildQA?.requests || 0,
    executed: window.__geometryRebuildQA?.executed || 0,
    coalesced: window.__geometryRebuildQA?.coalesced || 0,
  }));
  const burstSize = 24;
  await page.evaluate((count) => {
    const control = document.getElementById("wallmm");
    for (let index = 0; index < count; index += 1) {
      control.value = index === count - 1
        ? "18"
        : index % 2 ? "18" : "19";
      control.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, burstSize);
  await page.waitForFunction((executed) => (
    (window.__geometryRebuildQA?.executed || 0) > executed
    && window.MEH_RUNTIME_SENTINEL?.status === "ready"
    && window.__solved
  ), before.executed, { timeout: 60_000 });
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
  const after = await page.evaluate(() => ({
    disposal: window.__webglResourceQA?.cycles || 0,
    requests: window.__geometryRebuildQA?.requests || 0,
    executed: window.__geometryRebuildQA?.executed || 0,
    coalesced: window.__geometryRebuildQA?.coalesced || 0,
    pending: Boolean(window.__geometryRebuildQA?.pending),
  }));
  const record = {
    burstSize,
    requestDelta: after.requests - before.requests,
    executedDelta: after.executed - before.executed,
    coalescedDelta: after.coalesced - before.coalesced,
    disposalDelta: after.disposal - before.disposal,
    pending: after.pending,
  };
  assert(record.requestDelta === burstSize,
    `streamed burst recorded ${record.requestDelta}/${burstSize} requests`);
  assert(record.executedDelta === 1,
    `streamed burst executed ${record.executedDelta} rebuilds`);
  assert(record.coalescedDelta === burstSize - 1,
    `streamed burst coalesced ${record.coalescedDelta}/${burstSize - 1}`);
  assert(record.disposalDelta === 1,
    `streamed burst replaced the scene ${record.disposalDelta} times`);
  assert(record.pending === false,
    "streamed burst left a rebuild pending");
  const sample = await resourceSnapshot("streamed input burst");
  assertHealthy(sample, sample.label);
  return { record, sample };
}

async function restoreAnchor(cycle, step) {
  const before = await page.evaluate(
    () => window.__webglResourceQA?.cycles || 0,
  );
  await page.evaluate(() => {
    S.profileLaw = "conical";
    S.mouthW = 55;
    S.requestedMouthW = 55;
    S.wallT = 0.018;
    V3D.view = "nodrv";
    V3D.xray = false;
    V3D.mountFocus = "0";
    V3D.nodrvCameraDirty = true;
    rebuild();
  });
  await waitForRebuild(before, `cycle ${cycle} anchor rebuild`);
  if (await page.evaluate(() => typeof gc === "function")) {
    await page.evaluate(() => gc());
  }
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
  const sample = await resourceSnapshot(
    `cycle ${cycle} anchor`,
    cycle,
    step,
  );
  assertHealthy(sample, sample.label);
  return sample;
}

async function runEditCycle(cycle, samples) {
  let step = 0;
  const take = async (label, mutate, argument = null) => {
    step += 1;
    const sample = await uiRebuild(
      `cycle ${cycle}/${label}`,
      mutate,
      argument,
    );
    sample.cycle = cycle;
    sample.step = step;
    samples.push(sample);
  };

  await take("wall thickness", () => {
    const control = document.getElementById("wallmm");
    control.value = S.wallT < 0.0185 ? "19" : "18";
    control.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await take("full assembly view", () => {
    const control = document.getElementById("viewSel");
    control.value = "full";
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await take("xray on", () => {
    document.getElementById("bXray").click();
  });
  await take("xray off", () => {
    document.getElementById("bXray").click();
  });
  await take("classic OS profile", () => {
    const control = document.getElementById("profileLaw");
    control.value = "classicOS";
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await take("conical profile", () => {
    const control = document.getElementById("profileLaw");
    control.value = "conical";
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await take("mouth width", (nextMouth) => {
    const control = document.getElementById("mouthW");
    control.value = String(nextMouth);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }, cycle % 2 ? 56 : 57);
  const anchor = await restoreAnchor(cycle, step + 1);
  samples.push(anchor);
  return anchor;
}

function range(samples, getter) {
  const values = samples.map(getter).filter(Number.isFinite);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    last: values.at(-1),
  };
}

const samples = [];
const anchors = [];
let warmAnchor = null;
let manifest = null;

try {
  await page.goto(target, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitReady();
  await installStressFixture();
  const streamedBurst = await verifyStreamedInputCoalescing();
  samples.push(streamedBurst.sample);

  /* One complete warm-up compiles every material/view variant used below.
     Anchor growth after this point is retained-resource growth, not expected
     first-use shader compilation. */
  warmAnchor = await runEditCycle("warm", samples);
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    anchors.push(await runEditCycle(cycle, samples));
  }

  assert(browserErrors.length === 0,
    `browser errors:\n${browserErrors.join("\n")}`);
  const anchorLimits = {
    geometries: warmAnchor.renderer.geometries + 1,
    textures: warmAnchor.renderer.textures + 1,
    programs: warmAnchor.renderer.programs + 2,
    liveGeometries: warmAnchor.liveGroup.geometries,
    liveMaterials: warmAnchor.liveGroup.materials,
  };
  for (const anchor of anchors) {
    assert(
      anchor.renderer.geometries <= anchorLimits.geometries,
      `${anchor.label}: renderer geometries grew from `
        + `${warmAnchor.renderer.geometries} to `
        + `${anchor.renderer.geometries}`,
    );
    assert(
      anchor.renderer.textures <= anchorLimits.textures,
      `${anchor.label}: renderer textures grew from `
        + `${warmAnchor.renderer.textures} to ${anchor.renderer.textures}`,
    );
    assert(
      anchor.renderer.programs <= anchorLimits.programs,
      `${anchor.label}: renderer programs grew from `
        + `${warmAnchor.renderer.programs} to ${anchor.renderer.programs}`,
    );
    assert(
      anchor.liveGroup.geometries === anchorLimits.liveGeometries,
      `${anchor.label}: live anchor geometries drifted from `
        + `${anchorLimits.liveGeometries} to `
        + `${anchor.liveGroup.geometries}`,
    );
    assert(
      anchor.liveGroup.materials === anchorLimits.liveMaterials,
      `${anchor.label}: live anchor materials drifted from `
        + `${anchorLimits.liveMaterials} to `
        + `${anchor.liveGroup.materials}`,
    );
  }

  const final = anchors.at(-1);
  assert(
    final.disposal.cycles > warmAnchor.disposal.cycles,
    "stress loop did not execute replacement/disposal cycles",
  );
  assert(
    final.disposal.cycles - warmAnchor.disposal.cycles >= cycles * 8,
    "one or more stress edit/anchor rebuilds did not dispose their old group",
  );
  manifest = {
    build: 652,
    pass: true,
    generatedAt: new Date().toISOString(),
    requestedCycles: cycles,
    warmupCycles: 1,
    uiEditRebuildsPerCycle: 7,
    anchorRebuildsPerCycle: 1,
    totalObservedDisposals:
      final.disposal.cycles - warmAnchor.disposal.cycles,
    fixture: "six W5 panel drivers · angular · 55-inch mouth",
    streamedInputCoalescing: streamedBurst.record,
    warmAnchor,
    finalAnchor: final,
    anchorLimits,
    ranges: {
      rendererGeometries: range(
        samples,
        (sample) => sample.renderer.geometries,
      ),
      rendererTextures: range(
        samples,
        (sample) => sample.renderer.textures,
      ),
      rendererPrograms: range(
        samples,
        (sample) => sample.renderer.programs,
      ),
      liveGroupGeometries: range(
        samples,
        (sample) => sample.liveGroup.geometries,
      ),
      liveGroupMaterials: range(
        samples,
        (sample) => sample.liveGroup.materials,
      ),
      usedJsHeapBytes: range(
        samples,
        (sample) => sample.heap?.used,
      ),
    },
    anchors,
  };
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(
    "BUILD 652 RENDERER STRESS PASS"
      + ` · ${cycles} measured cycles after warm-up`
      + ` · ${manifest.totalObservedDisposals} replacement disposals`
      + " · 0 WebGL context losses"
      + " · 0 renderer crashes",
  );
  console.log(
    `  INPUT BURST: ${streamedBurst.record.burstSize} events`
      + ` → ${streamedBurst.record.executedDelta} rebuild`
      + ` · ${streamedBurst.record.coalescedDelta} coalesced`,
  );
  console.log(
    `  ANCHOR GPU: geometries ${warmAnchor.renderer.geometries}`
      + `→${final.renderer.geometries}`
      + ` · textures ${warmAnchor.renderer.textures}`
      + `→${final.renderer.textures}`
      + ` · programs ${warmAnchor.renderer.programs}`
      + `→${final.renderer.programs}`,
  );
  console.log(
    `  PEAK GPU: geometries ${manifest.ranges.rendererGeometries.max}`
      + ` · textures ${manifest.ranges.rendererTextures.max}`
      + ` · programs ${manifest.ranges.rendererPrograms.max}`,
  );
  console.log(`  MANIFEST: ${path.join(output, "manifest.json")}`);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
