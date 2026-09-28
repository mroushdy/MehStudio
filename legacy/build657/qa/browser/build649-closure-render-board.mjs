#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { readJson, resolveCase } from "../node/case-loader.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const qaRoot = path.resolve(here, "..");
const sourceRoot = path.resolve(qaRoot, "..");
const renderInspection = path.resolve(here, "render-inspection.mjs");
const defaultOutput = path.resolve(qaRoot, "artifacts", "build649-closure");
const engine = require(path.resolve(sourceRoot, "engine.js"));
const viewport = Object.freeze({ width: 1600, height: 1100 });

const rowRenderMap = Object.freeze({
  "B649-G01": ["user-integrated/no-driver-assembly.png"],
  "B649-G02": [
    "user-integrated/mount-plate-1.png",
    "user-integrated/no-driver-assembly.png",
  ],
  "B649-G03": ["tap-lumen/contact-sheet.png"],
  "B649-G04": ["tap-lumen/contact-sheet.png"],
  "B649-G05": [
    "user-cartridge/mount-assembly.png",
    "user-cartridge/no-driver-assembly.png",
  ],
  "B649-G06": [
    "user-integrated/literal-taps.png",
    "ui/tap-station-diagnostics.png",
  ],
  "B649-G07": ["tap-lumen/contact-sheet.png"],
  "B649-G08": [
    "user-integrated/no-driver-assembly.png",
    "ui/mouth-package-summary.png",
  ],
  "B649-G09": ["throat-morph/contact-sheet.png"],
  "B649-G10": ["throat-morph/contact-sheet.png"],
  "B649-G11": [
    "user-integrated/no-driver-assembly.png",
    "user-cartridge/no-driver-assembly.png",
  ],
  "B649-G12": [
    "user-integrated/contact-sheet.png",
    "user-cartridge/contact-sheet.png",
    "tap-lumen/contact-sheet.png",
    "profile-laws/contact-sheet.png",
    "throat-morph/contact-sheet.png",
    "wall-topologies/contact-sheet.png",
  ],
  "B649-P01": ["profile-laws/contact-sheet.png"],
  "B649-P02": [
    "ui/oneway-profile-control.png",
    "ui/oneway-profile-conical.png",
    "ui/oneway-profile-classic-os.png",
    "ui/oneway-profile-osse.png",
  ],
  "B649-P03": [
    "ui/profile-advanced.png",
    "profile-laws/contact-sheet.png",
  ],
  "B649-P04": [
    "ui/rounded-rectangle-control.png",
    "ui/rounded-rectangle-corner.png",
    "ui/rounded-rectangle-section.png",
  ],
  "B649-P05": [
    "ui/count-nw10-32.png",
    "ui/count-w5-32.png",
  ],
  "B649-P06": [
    "ui/count-nw10-32.png",
    "ui/count-nw10-40.png",
  ],
  "B649-P07": [
    "ui/tap-station-diagnostics.png",
    "user-integrated/literal-taps.png",
  ],
  "B649-P08": [
    "ui/tap-station-diagnostics.png",
    "user-integrated/literal-taps.png",
  ],
  "B649-P09": [
    "ui/profile-advanced.png",
    "ui/mouth-package-summary.png",
  ],
  "B649-P10": ["ui/lf-system-reference.png"],
  "B649-P11": [
    "ui/driver-cell-collapsed.png",
    "ui/driver-cell-measured.png",
  ],
  "B649-P12": ["ui/current-schema-refusal.png"],
  "B649-P13": [
    "ui/oneway-profile-control.png",
    "profile-laws/contact-sheet.png",
  ],
  "B649-P14": [
    "user-integrated/front-full.png",
    "user-cartridge/front-full.png",
  ],
  "B649-P15": ["wall-topologies/contact-sheet.png"],
  "B649-U01": ["ui/diagnostics-below-render.png"],
  "B649-U02": ["ui/driver-cell-collapsed.png"],
  "B649-U03": [
    "ui/release-state-identity.png",
    "user-integrated/front-full.png",
  ],
  "B649-R01": [
    "user-integrated/contact-sheet.png",
    "ui/diagnostics-below-render.png",
  ],
  "B649-R02": ["ui/release-state-identity.png"],
});

function parseArguments(argv) {
  const options = {
    appRoot: null,
    output: defaultOutput,
    headed: false,
    keepRuntime: false,
    uiOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--app-root") options.appRoot = path.resolve(argv[++index]);
    else if (argument === "--output") options.output = path.resolve(argv[++index]);
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--keep-runtime") options.keepRuntime = true;
    else if (argument === "--ui-only") options.uiOnly = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node browser/build649-closure-render-board.mjs [options]

  --app-root PATH   Test an already assembled v5 directory. Without this flag,
                    the harness composes shell/profile/engine/twoway in a
                    temporary directory without modifying meh5.html.
  --output PATH     Artifact root (default qa/artifacts/build649-closure)
  --headed          Show Chromium while capturing
  --keep-runtime    Keep the temporary live-source runtime for debugging
  --ui-only         Refresh only UI witnesses (requires the other sub-boards
                    to exist already in the output directory)

The command captures the two pinned Build 649 construction states, the
canonical lumen/throat/profile/topology comparison boards, and UI witnesses
for the remaining closure rows. It writes a manifest with a render path for
all 32 ledger IDs. The final in-app localhost launch still needs a separate
human-visible cache-busted URL check after assembly.`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileHash(file) {
  return sha256(await readFile(file));
}

async function makeLiveRuntime() {
  const runtimeRoot = await mkdtemp(path.join(os.tmpdir(), "meh-build649-live-"));
  const [shell, profileLaws, engineSource, twoWay] = await Promise.all([
    readFile(path.resolve(sourceRoot, "shell.html"), "utf8"),
    readFile(path.resolve(sourceRoot, "profile-laws.js"), "utf8"),
    readFile(path.resolve(sourceRoot, "engine.js"), "utf8"),
    readFile(path.resolve(sourceRoot, "twoway-core.js"), "utf8"),
  ]);
  const runtime = shell
    .replace("/*__PROFILE_LAWS__*/", profileLaws)
    .replace("/*__ENGINE__*/", engineSource)
    .replace("/*__TWOWAY__*/", twoWay)
    .replace("/*__CAD__*/", "/* Build 649 live-source QA runtime */");
  for (const marker of [
    "/*__PROFILE_LAWS__*/",
    "/*__ENGINE__*/",
    "/*__TWOWAY__*/",
  ]) {
    if (runtime.includes(marker)) throw new Error(`unreplaced source marker ${marker}`);
  }
  await writeFile(path.resolve(runtimeRoot, "meh5.html"), runtime);
  await mkdir(path.resolve(runtimeRoot, "vendor", "three-r128"), {
    recursive: true,
  });
  await copyFile(
    path.resolve(sourceRoot, "vendor", "three-r128", "three.min.js"),
    path.resolve(runtimeRoot, "vendor", "three-r128", "three.min.js"),
  );
  for (const worker of [
    "twoway-worker.js",
    "twoway-mesh-worker.js",
    "twoway-audit-worker.js",
    "twoway-output-worker.js",
  ]) {
    await copyFile(path.resolve(sourceRoot, worker), path.resolve(runtimeRoot, worker));
  }
  return runtimeRoot;
}

function runInspection(appRoot, outputRoot, label, args, headed) {
  const output = path.resolve(outputRoot, label);
  const commandArgs = [
    renderInspection,
    "--app-root",
    appRoot,
    "--output",
    output,
    ...args,
    ...(headed ? ["--headed"] : []),
  ];
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: qaRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${label} render inspection failed with exit ${result.status}`,
    );
  }
  return {
    label,
    args,
    output: path.relative(outputRoot, output),
    manifest: path.relative(
      outputRoot,
      path.resolve(output, "manifest.json"),
    ),
  };
}

function respondJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function createServer(appRoot) {
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
        respondJson(response, 200, { ok: true, pins: [] });
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
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("closure QA server did not expose an address");
  }
  return {
    server,
    url: `http://127.0.0.1:${address.port}/meh5.html`,
  };
}

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector("#v3d canvas");
    return Boolean(
      canvas
      && window.__solved
      && window.__ev
      && window.__twoWayGeometry
      && typeof rebuild === "function"
      && typeof V3D !== "undefined",
    );
  }, null, { timeout: 45_000 });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(160);
}

async function contextFor(browser, state) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "UTC",
  });
  await context.addInitScript((fixture) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("meh5_state", JSON.stringify(fixture));
    } catch {
      // The init script also runs before the first origin is assigned.
    }
  }, state);
  return context;
}

async function screenshotLocator(page, selector, file) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible", timeout: 15_000 });
  await locator.screenshot({
    path: file,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
}

async function screenshotCanvas(page, file) {
  await page.locator("#v3d canvas").screenshot({
    path: file,
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
}

async function exposeCountOptions(page) {
  return page.evaluate(() => {
    const select = document.querySelector("#nW");
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error("woofer-count select is missing");
    }
    const options = [...select.options].map((option) => ({
      value: option.value,
      text: option.textContent.trim(),
      disabled: option.disabled,
    }));
    document.querySelector("[data-qa-count-witness]")?.remove();
    const witness = document.createElement("pre");
    witness.dataset.qaCountWitness = "true";
    witness.style.cssText = [
      "box-sizing:border-box",
      "position:fixed",
      "left:12px",
      "top:12px",
      "z-index:2147483647",
      "width:1000px",
      "margin:0",
      "padding:14px 16px",
      "border:2px solid #222",
      "background:#fff",
      "color:#222",
      "font:16px/1.55 ui-monospace,monospace",
      "white-space:pre-wrap",
    ].join(";");
    witness.textContent = [
      `ACTUAL #nW OPTION RECORD · DRIVER ${String(S.wPre).toUpperCase()}`
        + ` · MOUTH ${Number(S.mouthW).toFixed(1)}″ · SELECTED ${select.value}`,
      ...options.map((option) => (
        `${option.disabled ? "UNAVAILABLE" : "AVAILABLE  "} · `
        + `${option.value} · ${option.text}`
      )),
    ].join("\n");
    document.body.append(witness);
    return {
      selected: select.value,
      options,
    };
  });
}

async function captureUiBoard(appRoot, outputRoot, headed) {
  const output = path.resolve(outputRoot, "ui");
  await mkdir(output, { recursive: true });
  const canonical = readJson("cases/canonical.json");
  const fixture = canonical.cases.find((entry) => entry.id === "B649-USER-I");
  if (!fixture) throw new Error("B649-USER-I canonical fixture is missing");
  const pinned = {
    ...resolveCase(canonical, fixture),
    _smart2waySchema: 3,
  };
  const { server, url } = await createServer(appRoot);
  const browser = await chromium.launch({ headless: !headed });
  const captures = [];
  const assertions = [];
  const browserErrors = [];
  const record = async (id, selector, action = null) => {
    if (action) await action();
    const file = path.resolve(output, `${id}.png`);
    await screenshotLocator(activePage, selector, file);
    const bytes = await readFile(file);
    captures.push({
      id,
      file: path.basename(file),
      selector,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  };
  let activePage;
  try {
    const context = await contextFor(browser, pinned);
    activePage = await context.newPage();
    activePage.on("pageerror", (error) => browserErrors.push(
      `pageerror: ${error.stack || error.message}`,
    ));
    activePage.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(
        `console: ${message.text()}`,
      );
    });
    await activePage.goto(`${url}?build=649&rev=closure-board`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(activePage);

    await record("profile-control", "#profileLawCtl");
    await record("profile-advanced", "#profileLawCtl", async () => {
      await activePage.locator("#profileAdvancedCtl").evaluate(
        (details) => { details.open = true; },
      );
    });

    await activePage.evaluate(() => {
      S.sectionFamily = "roundedRectangle";
      S.sectionCornerRatio = 0.25;
      rebuild();
    });
    await waitForApp(activePage);
    await record("rounded-rectangle-control", "#sectionFamilyCtl");
    await record("rounded-rectangle-corner", "#sectionCornerCtl");
    await activePage.evaluate(() => {
      V3D.view = "section";
      const selector = document.querySelector("#viewSel");
      selector.value = "section";
      selector.dispatchEvent(new Event("change"));
    });
    await waitForApp(activePage);
    {
      const file = path.resolve(output, "rounded-rectangle-section.png");
      await screenshotCanvas(activePage, file);
      const bytes = await readFile(file);
      captures.push({
        id: "rounded-rectangle-section",
        file: path.basename(file),
        selector: "#v3d canvas",
        bytes: bytes.length,
        sha256: sha256(bytes),
      });
    }

    await activePage.evaluate(() => {
      Object.assign(S, {
        sectionFamily: "superellipse",
        sectionLameN: 6,
        seN: 6,
        wPre: "nw10",
        odW: 26.1,
        dpW: 11.9,
        sdW: 320,
        vtcW: 1400,
        xmW: 6.8,
        mouthW: 32,
        requestedMouthW: 32,
      });
      rebuild();
    });
    await waitForApp(activePage);
    const countNw1032 = await exposeCountOptions(activePage);
    await record("count-nw10-32", "[data-qa-count-witness]");
    await activePage.locator("[data-qa-count-witness]").evaluate(
      (witness) => witness.remove(),
    );
    await record("lf-system-reference", "#wOnlyCtl");
    await activePage.evaluate(() => {
      S.mouthW = 40;
      S.requestedMouthW = 40;
      rebuild();
    });
    await waitForApp(activePage);
    const countNw1040 = await exposeCountOptions(activePage);
    await record("count-nw10-40", "[data-qa-count-witness]");
    await activePage.locator("[data-qa-count-witness]").evaluate(
      (witness) => witness.remove(),
    );
    await activePage.evaluate(() => {
      Object.assign(S, {
        wPre: "w5",
        odW: 13.76,
        dpW: 6.95,
        sdW: 91.6,
        vtcW: 35,
        xmW: 2.5,
        boltNW: 4,
        bcdW: undefined,
        boltDW: undefined,
        mouthW: 32,
        requestedMouthW: 32,
      });
      rebuild();
    });
    await waitForApp(activePage);
    const countW532 = await exposeCountOptions(activePage);
    await record("count-w5-32", "[data-qa-count-witness]");
    await activePage.locator("[data-qa-count-witness]").evaluate(
      (witness) => witness.remove(),
    );
    const optionFor = (snapshot, value) => (
      snapshot.options.find((option) => option.value === String(value))
    );
    const countReactivityPass = optionFor(countNw1032, 2)?.disabled === false
      && optionFor(countNw1032, 4)?.disabled === true
      && optionFor(countW532, 2)?.disabled === false
      && optionFor(countW532, 4)?.disabled === false
      && countNw1040.options.some((option) => (
        /40\.0[″"] mouth/.test(option.text)
      ))
      && countNw1040.options.every((option) => (
        !/32\.0[″"] mouth/.test(option.text)
      ));
    assertions.push({
      id: "woofer-count-reactivity",
      pass: countReactivityPass,
      detail: {
        nw10At32: countNw1032,
        nw10At40: countNw1040,
        w5At32: countW532,
      },
    });
    if (!countReactivityPass) {
      throw new Error(
        `woofer-count availability/labels are stale: ${JSON.stringify({
          countNw1032,
          countNw1040,
          countW532,
        })}`,
      );
    }

    await activePage.evaluate(() => {
      Object.assign(S, {
        wPre: "nw10",
        odW: 26.1,
        dpW: 11.9,
        sdW: 320,
        vtcW: 1400,
        xmW: 6.8,
        boltNW: 8,
        bcdW: 244,
        boltDW: 6.5,
        mouthW: 32,
        requestedMouthW: 32,
        coneProfileMode: "flat",
        coneDepthMm: 0,
        coneDepthKnown: false,
      });
      rebuild();
    });
    await waitForApp(activePage);
    await record("driver-cell-collapsed", "#twoDriverCellCtl", async () => {
      await activePage.locator("#twoDriverCellCtl").evaluate(
        (details) => { details.open = false; },
      );
    });
    await activePage.evaluate(() => {
      Object.assign(S, {
        coneProfileMode: "measured",
        coneDepthMm: 30,
        coneDepthKnown: true,
      });
      rebuild();
      document.querySelector("#twoDriverCellCtl").open = true;
    });
    await waitForApp(activePage);
    await record("driver-cell-measured", "#twoDriverCellCtl");

    await activePage.evaluate(() => {
      document.querySelector("#twoWayAdvanced").open = true;
      document.querySelector("#twoDesignDiagnostics").open = true;
    });
    await record("tap-station-diagnostics", "#twoDesignDiagnostics");
    await record("mouth-package-summary", "#twoMouthNote");
    await activePage.addStyleTag({
      content: "#chartwrap,#reports{display:none!important}",
    });
    await record("diagnostics-below-render", "main.viewcol");
    const diagnosticsPlacement = await activePage.evaluate(() => {
      const render = document.querySelector("#v3dwrap").getBoundingClientRect();
      const diagnostics = document.querySelector(
        "#twoDesignDiagnostics",
      ).getBoundingClientRect();
      return {
        renderBottom: render.bottom,
        diagnosticsTop: diagnostics.top,
        below: diagnostics.top >= render.bottom - 1,
      };
    });
    assertions.push({
      id: "diagnostics-below-render",
      pass: diagnosticsPlacement.below,
      detail: diagnosticsPlacement,
    });
    if (!diagnosticsPlacement.below) {
      throw new Error(
        `design diagnostics overlap the renderer: ${
          JSON.stringify(diagnosticsPlacement)
        }`,
      );
    }

    const identity = await activePage.evaluate(() => {
      const authority = window.__stateIdentity || {};
      return {
        build: window.MEH_BUILD,
        visibleBuild: document.querySelector("#bno")?.textContent?.trim(),
        revision: authority.revision ?? authority.stateRevision ?? null,
        hash: authority.hash ?? authority.stateHash ?? null,
        uiRevision: Number(document.documentElement.dataset.stateRevision) || null,
        uiHash: document.documentElement.dataset.stateHash || null,
        solvedHash: window.__solved?.stateHash
          ?? window.__solved?.stateIdentity?.hash ?? null,
        previewHash: window.__twoWayGeometry?.stateHash
          ?? window.__twoWayGeometry?.stateIdentity?.hash ?? null,
      };
    });
    const identityPass = identity.build === 649
      && identity.visibleBuild === "649"
      && Number.isSafeInteger(identity.revision)
      && identity.revision > 0
      && typeof identity.hash === "string"
      && identity.hash.length >= 8
      && identity.uiRevision === identity.revision
      && identity.uiHash === identity.hash
      && identity.solvedHash === identity.hash
      && identity.previewHash === identity.hash;
    assertions.push({
      id: "release-state-identity",
      pass: identityPass,
      detail: identity,
    });
    if (!identityPass) {
      throw new Error(`shared release identity is incomplete: ${JSON.stringify(identity)}`);
    }
    await record("release-state-identity", "header");
    await context.close();

    const refusedContext = await contextFor(browser, {
      ...pinned,
      sectionFamily: "future-section",
    });
    activePage = await refusedContext.newPage();
    activePage.on("pageerror", (error) => browserErrors.push(
      `refusal pageerror: ${error.stack || error.message}`,
    ));
    await activePage.goto(`${url}?build=649&rev=schema-refusal`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(activePage);
    const refusal = await activePage.locator("#note").textContent();
    if (!/SAVED STATE REFUSED|unknown|unsupported/i.test(refusal || "")) {
      throw new Error(`current-schema refusal is not visible: ${refusal}`);
    }
    await record("current-schema-refusal", "#v3dwrap");
    assertions.push({
      id: "current-schema-refusal",
      pass: true,
      detail: refusal?.trim(),
    });
    await refusedContext.close();

    const oneWayBase = engine.BUILDS["1way"].find(
      (entry) => entry.key === "fhx6",
    );
    if (!oneWayBase) throw new Error("one-way fhx6 fixture is missing");
    const oneWayContext = await contextFor(browser, {
      ...structuredClone(oneWayBase.s),
      _smart2waySchema: 3,
      profileLaw: "conical",
    });
    activePage = await oneWayContext.newPage();
    activePage.on("pageerror", (error) => browserErrors.push(
      `one-way pageerror: ${error.stack || error.message}`,
    ));
    await activePage.goto(`${url}?build=649&rev=oneway-profile`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await activePage.waitForFunction(() => (
      S?.topo === "1way"
      && typeof MEH2?.stations === "function"
      && document.querySelector("#profileLawCtl")
      && document.querySelector("#v3d canvas")
    ), null, { timeout: 45_000 });
    await activePage.waitForTimeout(180);
    await record("oneway-profile-control", "#profileLawCtl");
    const oneWayProfiles = [];
    for (const [law, id] of [
      ["conical", "oneway-profile-conical"],
      ["classicOS", "oneway-profile-classic-os"],
      ["osse", "oneway-profile-osse"],
    ]) {
      const profile = await activePage.evaluate((family) => {
        S.profileLaw = family;
        rebuild();
        const stations = MEH2.stations(S);
        V3D.view = "full";
        V3D.yaw = Math.PI / 2;
        V3D.pitch = 0.035;
        V3D.dist = 1.08;
        V3D.bnd = Math.max(0.12, stations.depth * 0.66);
        V3D.tgt.set(stations.depth * 0.52, 0, 0);
        V3D.group?.traverse((object) => {
          if (object?.userData?.tag === "driver") object.visible = false;
        });
        render3d();
        return {
          family: stations.profileLaw.family,
          hash: stations.profileHash,
          depth: stations.depth,
          join: stations.profileJoin,
        };
      }, law);
      await activePage.waitForTimeout(100);
      const file = path.resolve(output, `${id}.png`);
      await screenshotCanvas(activePage, file);
      const bytes = await readFile(file);
      captures.push({
        id,
        file: path.basename(file),
        selector: "#v3d canvas",
        bytes: bytes.length,
        sha256: sha256(bytes),
      });
      oneWayProfiles.push(profile);
    }
    const oneWayPass = new Set(
      oneWayProfiles.map((profile) => profile.hash),
    ).size === 3 && oneWayProfiles.every(
      (profile) => profile.join?.ok === true,
    );
    assertions.push({
      id: "oneway-profile-distinct",
      pass: oneWayPass,
      detail: oneWayProfiles,
    });
    if (!oneWayPass) {
      throw new Error(
        `one-way profile witnesses are not distinct/admitted: ${
          JSON.stringify(oneWayProfiles)
        }`,
      );
    }
    await oneWayContext.close();

    if (browserErrors.length) {
      throw new Error(`browser errors:\n${browserErrors.join("\n")}`);
    }
    const manifest = {
      schemaVersion: 1,
      kind: "meh-build649-ui-evidence",
      generatedAt: new Date().toISOString(),
      viewport,
      browserVersion: browser.version(),
      fixture: fixture.id,
      captures,
      assertions,
      browserErrors,
    };
    await writeFile(
      path.resolve(output, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    return {
      label: "ui",
      output: path.relative(outputRoot, output),
      manifest: path.relative(outputRoot, path.resolve(output, "manifest.json")),
      captures: captures.length,
      assertions,
    };
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function verifyRowRenderMap(outputRoot) {
  const missing = [];
  for (const [id, artifacts] of Object.entries(rowRenderMap)) {
    for (const artifact of artifacts) {
      const file = path.resolve(outputRoot, artifact);
      try {
        const metadata = await stat(file);
        if (!metadata.isFile() || metadata.size === 0) {
          missing.push(`${id}: ${artifact} is empty`);
        }
      } catch {
        missing.push(`${id}: ${artifact} is missing`);
      }
    }
  }
  if (missing.length) {
    throw new Error(`closure render map is incomplete:\n- ${missing.join("\n- ")}`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  await mkdir(options.output, { recursive: true });
  const temporary = !options.appRoot;
  const appRoot = options.appRoot || await makeLiveRuntime();
  const sourceFiles = [
    "shell.html",
    "profile-laws.js",
    "engine.js",
    "twoway-core.js",
  ];
  try {
    const inspections = [
      ["user-integrated", ["--case", "B649-USER-I"]],
      ["user-cartridge", ["--case", "B649-USER-C"]],
      ["profile-laws", ["--case", "B649-USER-I", "--profile-laws"]],
      ["throat-morph", ["--case", "P01", "--throat-morph"]],
      ["tap-lumen", ["--case", "P02", "--tap-lumen"]],
      [
        "wall-topologies",
        ["--case", "B649-USER-I", "--wall-topologies"],
      ],
    ];
    const jobs = options.uiOnly
      ? inspections.map(([label, args]) => ({
        label,
        args,
        output: label,
        manifest: `${label}/manifest.json`,
        reused: true,
      }))
      : inspections.map(([label, args]) => runInspection(
        appRoot,
        options.output,
        label,
        args,
        options.headed,
      ));
    jobs.push(await captureUiBoard(
      appRoot,
      options.output,
      options.headed,
    ));
    await verifyRowRenderMap(options.output);
    for (const job of jobs.filter((entry) => entry.reused)) {
      const metadata = await stat(path.resolve(options.output, job.manifest));
      if (!metadata.isFile() || metadata.size === 0) {
        throw new Error(`reused render manifest is empty: ${job.manifest}`);
      }
    }
    const sourceHashes = {};
    for (const source of sourceFiles) {
      sourceHashes[source] = await fileHash(path.resolve(sourceRoot, source));
    }
    sourceHashes["runtime/meh5.html"] = await fileHash(
      path.resolve(appRoot, "meh5.html"),
    );
    const manifest = {
      schemaVersion: 1,
      kind: "meh-build649-closure-render-board",
      build: 649,
      generatedAt: new Date().toISOString(),
      runtimeMode: temporary ? "live-source-composed" : "assembled-app-root",
      appRoot,
      sourceHashes,
      jobs,
      rowRenderMap,
      finalManualWitnessStillRequired: {
        row: "B649-R02",
        reason:
          "After the single final assembly, open the cache-busted localhost "
          + "Build 649 URL in the in-app browser and inspect the visible "
          + "build/revision. This harness verifies the rendered build and "
          + "shared state identity but cannot prove the user's final tab URL.",
        expectedUrl:
          "http://127.0.0.1:8520/meh5.html?build=649&view=nodrv&rev=release-final",
      },
    };
    await writeFile(
      path.resolve(options.output, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    console.log(
      `BUILD 649 CLOSURE RENDER BOARD PASS — ${
        Object.keys(rowRenderMap).length
      } rows mapped · ${path.relative(sourceRoot, options.output)}`,
    );
  } finally {
    if (temporary && !options.keepRuntime) {
      await rm(appRoot, { recursive: true, force: true });
    } else if (temporary) {
      console.log(`kept live-source runtime: ${appRoot}`);
    }
  }
}

await main();
