#!/usr/bin/env node
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
  .replace("/*__CAD__*/", "/* Build 652 R-OSSE control contract */");

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

const defaults = Object.freeze({
  rosseThroatAngle: 7.5,
  rosseK: 1.8,
  rosseApexRadiusFactor: 0.3,
  rosseB: 0.3,
  rosseM: 0.8,
  rosseQ: 3.7,
});
const mutations = Object.freeze({
  rosseThroatAngle: 9,
  rosseK: 2.1,
  rosseApexRadiusFactor: 0.4,
  rosseB: 0.4,
  rosseM: 0.85,
  rosseQ: 4.2,
});
const fixture = {
  ...engine.TWO_ARCH.radial.defaults,
  _smart2waySchema: 3,
  topo: "2way",
  twoDesign: "arch:radial",
  twoArch: "radial",
  twoFamily: "radial",
  tapBasis: "model",
  style: "smooth",
  sectionFamily: "superellipse",
  sectionLameN: 6,
  seN: 6,
  covH: 90,
  covV: 60,
  mouthW: 36,
  requestedMouthW: 36,
  mouthCap: 64,
  wallT: 0.012,
  td: 1.4,
  throat: 1.4,
  cdSel: "dcx464",
  cdFloor: 300,
  cdDepth: 2.4,
  profileLaw: "rosse",
  ...defaults,
};

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [field, value] of Object.entries(mutations)) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    await context.addInitScript((state) => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("meh5_state", JSON.stringify(state));
      } catch {
        // Also runs once before the page receives its localhost origin.
      }
    }, fixture);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error.stack || error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/shell.html?build=652&view=horn&rev=rosse-${field}`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );
    await page.waitForFunction(() => (
      window.MEH_RUNTIME_SENTINEL?.status === "ready"
      && S.profileLaw === "rosse"
      && window.__twoWayGeometry?.plan?.st?.profileLaw?.family === "rosse"
    ), null, { timeout: 30_000 });

    const before = await page.evaluate((expectedDefaults) => {
      const plan = window.__twoWayGeometry.plan;
      const controls = {};
      for (const [id, value] of Object.entries(expectedDefaults)) {
        const element = document.getElementById(id);
        controls[id] = {
          value: Number(element?.value),
          disabled: element?.disabled,
          type: element?.type,
          expected: value,
        };
      }
      return {
        family: plan.st.profileLaw.family,
        profileHash: plan.st.profileHash,
        stateHash: window.__stateIdentity?.hash,
        meshKey: MEH2.twoWayMeshKey(window.__solved.S, "manufacturing-preview"),
        witness: plan.st.pts.map((point) => [point.x, point.a]),
        selectorDisabled: document.querySelector(
          '#profileLaw option[value="rosse"]',
        )?.disabled,
        rosseDisplay: getComputedStyle(
          document.getElementById("rosseProfileCtl"),
        ).display,
        osseDisplay: getComputedStyle(
          document.getElementById("osseProfileCtl"),
        ).display,
        noteDisplay: getComputedStyle(
          document.getElementById("rosseProfileNote"),
        ).display,
        note: document.getElementById("rosseProfileNote")?.textContent || "",
        controls,
      };
    }, defaults);

    assert(before.family === "rosse", `${field}: R-OSSE did not resolve`);
    assert(before.selectorDisabled === false, `${field}: selector option is disabled`);
    assert(before.rosseDisplay === "grid", `${field}: R-OSSE controls are hidden`);
    assert(before.osseDisplay === "none", `${field}: OS-SE controls leaked into R-OSSE`);
    assert(before.noteDisplay !== "none", `${field}: R-OSSE truncation note is hidden`);
    assert(
      /RETAINED PUBLISHED FORWARD BODY/.test(before.note)
        && /FLAT-BAFFLE TRUNCATION BEFORE ROLLBACK/.test(before.note)
        && /NATIVE ROLLBACK NOT INCLUDED/.test(before.note),
      `${field}: R-OSSE note is not honest`,
    );
    for (const [id, record] of Object.entries(before.controls)) {
      assert(record.type === "number", `${field}: ${id} is not numeric`);
      assert(record.disabled === false, `${field}: ${id} is disabled`);
      assert(record.value === record.expected, `${field}: ${id} default drifted`);
    }

    await page.locator(`#${field}`).evaluate((element, next) => {
      element.value = String(next);
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
    await page.waitForFunction(({ field: key, value: next, profileHash }) => (
      S[key] === next
      && window.__twoWayGeometry?.plan?.st?.profileLaw?.family === "rosse"
      && window.__twoWayGeometry.plan.st.profileHash !== profileHash
    ), { field, value, profileHash: before.profileHash }, { timeout: 30_000 });

    const after = await page.evaluate(({ field: key, value: expected }) => {
      const plan = window.__twoWayGeometry.plan;
      const saved = JSON.parse(localStorage.getItem("meh5_state") || "{}");
      return {
        stateValue: S[key],
        controlValue: Number(document.getElementById(key)?.value),
        savedValue: saved[key],
        family: plan.st.profileLaw.family,
        profileHash: plan.st.profileHash,
        stateHash: window.__stateIdentity?.hash,
        meshKey: MEH2.twoWayMeshKey(window.__solved.S, "manufacturing-preview"),
        witness: plan.st.pts.map((point) => [point.x, point.a]),
        expected,
      };
    }, { field, value });
    assert(after.stateValue === value, `${field}: state did not commit`);
    assert(after.controlValue === value, `${field}: control rebounded`);
    assert(after.savedValue === value, `${field}: persistence omitted the field`);
    assert(after.family === "rosse", `${field}: mutation changed profile family`);
    assert(after.profileHash !== before.profileHash, `${field}: profile hash did not change`);
    assert(after.stateHash !== before.stateHash, `${field}: state hash did not change`);
    assert(after.meshKey !== before.meshKey, `${field}: exact mesh key did not change`);
    assert(
      JSON.stringify(after.witness) !== JSON.stringify(before.witness),
      `${field}: canonical station coordinates did not change`,
    );
    assert(errors.length === 0, `${field}: browser errors:\n${errors.join("\n")}`);
    results.push({
      field,
      from: defaults[field],
      to: value,
      profileHash: `${before.profileHash} → ${after.profileHash}`,
      stateHash: `${before.stateHash} → ${after.stateHash}`,
    });
    await context.close();
  }
  console.log(JSON.stringify({ pass: true, mutations: results }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
