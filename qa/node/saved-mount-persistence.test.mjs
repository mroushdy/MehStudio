import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { engine } from "./case-loader.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const mountFields = ["frameW", "boltNW", "bcdW", "boltDW", "gasketW"];

function documentedState(key) {
  const record = engine.BUILDS["2way"].find((entry) => entry.key === key);
  assert.ok(record, `${key} record is missing`);
  return { ...record.s, _smart2waySchema: 3 };
}

function calculatedW5(overrides = {}) {
  const state = {
    ...engine.TWO_ARCH.panel.defaults,
    _smart2waySchema: 3,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    style: "smooth",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    covH: 90,
    covV: 60,
    mouthW: 32,
    requestedMouthW: 32,
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
    nW: 6,
    npW: 2,
    tapBasis: "model",
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    ...overrides,
  };
  for (const field of mountFields) {
    if (!Object.hasOwn(overrides, field)) delete state[field];
  }
  return state;
}

test("saved optional mount records preserve source ownership across reload", {
  timeout: 120_000,
}, async () => {
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
    .replace("/*__CAD__*/", "/* saved mount persistence contract */");

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/shell.html") {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.end(runtime);
        return;
      }
      if (url.pathname === "/pins") {
        request.resume();
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
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
      const extension = path.extname(file);
      response.writeHead(200, {
        "Content-Type": extension === ".js"
          ? "text/javascript; charset=utf-8"
          : "application/octet-stream",
        "Cache-Control": "no-store",
      });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string", "QA server did not bind");
  const browser = await chromium.launch({ headless: true });

  async function load(saved) {
    const context = await browser.newContext();
    await context.addInitScript((state) => {
      localStorage.setItem("meh5_state", JSON.stringify(state));
    }, saved);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error.stack || error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/shell.html?build=652&view=cell`,
      { waitUntil: "domcontentloaded", timeout: 30_000 },
    );
    await page.waitForFunction(() => (
      window.__solved?.ev?.plan?.frame
      && window.MEH_RUNTIME_SENTINEL?.status === "ready"
    ), null, { timeout: 30_000 });
    const result = await page.evaluate((fields) => {
      const beforeSave = Object.fromEntries(fields.map((field) => [
        field,
        {
          own: Object.prototype.hasOwnProperty.call(S, field),
          value: S[field] ?? null,
        },
      ]));
      save();
      const persisted = JSON.parse(localStorage.getItem("meh5_state") || "{}");
      return {
        beforeSave,
        persisted: Object.fromEntries(fields.map((field) => [
          field,
          {
            own: Object.prototype.hasOwnProperty.call(persisted, field),
            value: persisted[field] ?? null,
          },
        ])),
        state: {
          twoDesign: S.twoDesign,
          wPre: S.wPre,
          nW: S.nW,
        },
        frame: {
          frame: window.__solved.ev.plan.frame.frame,
          boltN: window.__solved.ev.plan.frame.boltN,
          bcdMm: window.__solved.ev.plan.frame.bcd * 1000,
          boltDMm: window.__solved.ev.plan.frame.boltD * 1000,
          gasketMm: window.__solved.ev.plan.frame.gasketT * 1000,
          explicitBcd: window.__solved.ev.plan.frame.explicitBcd,
          generatedPanelBcd: window.__solved.ev.plan.frame.generatedPanelBcd,
        },
      };
    }, mountFields);
    await context.close();
    assert.deepEqual(errors, []);
    return result;
  }

  try {
    for (const [key, expected] of [
      ["hinson10", { boltN: 8, bcdMm: 244, boltDMm: 6.5, gasketMm: 1.6 }],
      ["jmod88", { boltN: 8, bcdMm: 298, boltDMm: 7, gasketMm: 1.6 }],
    ]) {
      const loaded = await load(documentedState(key));
      assert.equal(loaded.state.twoDesign, key);
      assert.equal(loaded.frame.explicitBcd, true);
      assert.equal(loaded.frame.generatedPanelBcd, false);
      for (const field of mountFields) {
        assert.equal(loaded.beforeSave[field].own, true, `${key} lost ${field}`);
        assert.equal(loaded.persisted[field].own, true, `${key} did not resave ${field}`);
      }
      assert.equal(loaded.frame.boltN, expected.boltN);
      assert.equal(loaded.frame.bcdMm, expected.bcdMm);
      assert.equal(loaded.frame.boltDMm, expected.boltDMm);
      assert.equal(loaded.frame.gasketMm, expected.gasketMm);
    }

    const generated = await load(calculatedW5());
    assert.equal(generated.state.wPre, "w5");
    assert.equal(generated.state.nW, 6);
    for (const field of mountFields) {
      assert.equal(generated.beforeSave[field].own, false,
        `calculated W5 resurrected startup ${field}`);
      assert.equal(generated.persisted[field].own, false,
        `calculated W5 serialized derived ${field} as user intent`);
    }
    assert.equal(generated.frame.frame, "round");
    assert.equal(generated.frame.boltN, 4);
    assert.equal(generated.frame.explicitBcd, false);
    assert.equal(generated.frame.generatedPanelBcd, true);
    assert.notEqual(generated.frame.bcdMm, 244);

    const explicit = await load(calculatedW5({
      frameW: "round",
      boltNW: 6,
      bcdW: 125,
      boltDW: 5,
      gasketW: 2.4,
    }));
    for (const field of mountFields) {
      assert.equal(explicit.beforeSave[field].own, true,
        `explicit mount lost ${field}`);
      assert.equal(explicit.persisted[field].own, true,
        `explicit mount did not resave ${field}`);
    }
    assert.equal(explicit.frame.boltN, 6);
    assert.equal(explicit.frame.bcdMm, 125);
    assert.equal(explicit.frame.boltDMm, 5);
    assert.equal(explicit.frame.gasketMm, 2.4);
    assert.equal(explicit.frame.explicitBcd, true);
    assert.equal(explicit.frame.generatedPanelBcd, false);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
