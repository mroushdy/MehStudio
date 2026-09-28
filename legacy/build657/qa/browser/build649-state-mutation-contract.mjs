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

function sameIdentity(left, right) {
  return Number.isSafeInteger(left?.revision)
    && left.revision > 0
    && typeof left.hash === "string"
    && left.hash.length >= 8
    && right
    && left.revision === right.revision
    && left.hash === right.hash;
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
  .replace("/*__CAD__*/", "/* Build 649 state mutation contract */");

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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(String(error.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

try {
  await page.goto(
    `http://127.0.0.1:${address.port}/shell.html?qa=build649-state-mutation`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await page.waitForFunction(() => (
    typeof S !== "undefined"
    && typeof MEH2 !== "undefined"
    && typeof rebuild === "function"
    && window.__twoWayGeometry
  ), null, { timeout: 30_000 });

  /*
   * Consumer identity is intentionally read through a small compatibility
   * adapter. Product code may expose `revision/hash` directly or nest them in
   * `stateIdentity`; the contract is the values, not one spelling choice.
   */
  const first = await page.evaluate(async () => {
    const identityOf = (record) => {
      const nested = record?.stateIdentity || record?.identity || record?.state;
      return {
        revision: record?.stateRevision ?? record?.revision
          ?? nested?.stateRevision ?? nested?.revision ?? null,
        hash: record?.stateHash ?? record?.hash
          ?? nested?.stateHash ?? nested?.hash ?? null,
      };
    };
    const globalRecord = window.__stateIdentity
      || window.__designStateIdentity
      || window.__stateContract
      || null;
    const globalIdentity = identityOf(globalRecord);
    const uiIdentity = {
      revision: Number(document.documentElement.dataset.stateRevision) || null,
      hash: document.documentElement.dataset.stateHash || null,
    };

    const captures = [];
    const NativeBlob = window.Blob;
    window.Blob = function QaBlob(parts, options) {
      captures.push({ parts: [...parts], type: options?.type || "" });
      return new NativeBlob(parts, options);
    };
    window.Blob.prototype = NativeBlob.prototype;
    const nativeClick = HTMLAnchorElement.prototype.click;
    const nativeCreate = URL.createObjectURL;
    const nativeRevoke = URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = function qaNoDownload() {};
    URL.createObjectURL = () => "blob:build649-qa";
    URL.revokeObjectURL = () => {};
    document.getElementById("bHrn").click();
    await Promise.resolve();
    HTMLAnchorElement.prototype.click = nativeClick;
    URL.createObjectURL = nativeCreate;
    URL.revokeObjectURL = nativeRevoke;
    window.Blob = NativeBlob;
    const reportCapture = [...captures].reverse().find(
      (capture) => capture.type === "application/json",
    );
    let report = null;
    if (reportCapture) {
      try {
        report = JSON.parse(reportCapture.parts.join(""));
      } catch {}
    }

    return {
      globalIdentity,
      uiIdentity,
      solvedIdentity: identityOf(window.__solved),
      previewIdentity: identityOf(window.__twoWayGeometry),
      reportIdentity: identityOf(report),
      report,
      exactKey: MEH2.twoWayMeshKey(window.__solved.S, "export"),
    };
  });

  const issues = [];
  const validIdentity = (identity, label) => {
    if (!Number.isSafeInteger(identity?.revision) || identity.revision < 1) {
      issues.push(`${label} has no positive state revision`);
    }
    if (typeof identity?.hash !== "string" || identity.hash.length < 8) {
      issues.push(`${label} has no canonical state hash`);
    }
  };
  for (const [label, identity] of [
    ["authority", first.globalIdentity],
    ["UI", first.uiIdentity],
    ["solved preview", first.solvedIdentity],
    ["rendered preview", first.previewIdentity],
    ["design report", first.reportIdentity],
  ]) validIdentity(identity, label);
  for (const [label, identity] of [
    ["UI", first.uiIdentity],
    ["solved preview", first.solvedIdentity],
    ["rendered preview", first.previewIdentity],
    ["design report", first.reportIdentity],
  ]) {
    if (!sameIdentity(first.globalIdentity, identity)) {
      issues.push(`${label} does not share the authority revision/hash`);
    }
  }
  if (first.globalIdentity.hash
      && !first.exactKey.includes(first.globalIdentity.hash)) {
    issues.push("exact fingerprint does not embed the shared state hash");
  }

  const committedMutation = await page.evaluate(() => {
    const identityOf = (record) => {
      const nested = record?.stateIdentity || record?.identity || record?.state;
      return {
        revision: record?.stateRevision ?? record?.revision
          ?? nested?.stateRevision ?? nested?.revision ?? null,
        hash: record?.stateHash ?? record?.hash
          ?? nested?.stateHash ?? nested?.hash ?? null,
      };
    };
    S.coneProfileMode = "measured";
    S.coneDepthMm = 30;
    S.coneDepthKnown = true;
    rebuild();
    const authority = window.__stateIdentity
      || window.__designStateIdentity
      || window.__stateContract
      || null;
    return {
      authority: identityOf(authority),
      solved: identityOf(window.__solved),
      preview: identityOf(window.__twoWayGeometry),
    };
  });
  if (!(committedMutation.authority.revision > first.globalIdentity.revision)) {
    issues.push("committed UI state mutation did not advance the revision");
  }
  if (!committedMutation.authority.hash
      || committedMutation.authority.hash === first.globalIdentity.hash) {
    issues.push("committed geometry mutation did not change the state hash");
  }
  if (!sameIdentity(committedMutation.authority, committedMutation.solved)
      || !sameIdentity(committedMutation.authority, committedMutation.preview)) {
    issues.push("post-mutation solve/preview did not receive the new authority identity");
  }

  /*
   * Deliver an old worker result after mutating live state but before rebuild.
   * This is the narrow race from B649-U03: the stale result must be rejected
   * before it can become preview-ready or reach a download.
   */
  const stale = await page.evaluate(() => {
    cancelTwoWayMesh("QA reset", true);
    twoPreviewReady = null;
    class FakeWorker {
      constructor() {
        window.__build649FakeWorker = this;
      }
      postMessage(payload) {
        this.payload = payload;
      }
      terminate() {
        this.terminated = true;
      }
    }
    window.Worker = FakeWorker;
    const solved = window.__solved || MEH2.solve(S);
    startTwoWayPreview(
      solved,
      MEH2.twoWayMeshKey(solved.S, "manufacturing-preview"),
    );
    const job = twoMeshJob;
    const worker = window.__build649FakeWorker;
    S.wallT += 0.001;
    worker.onmessage({
      data: {
        id: job.id,
        kernel: job.kernel,
        policyVersion: job.policyVersion,
        stateDigest: job.stateDigest,
        phase: "done",
        audit: { pass: true, components: 1, expectedComponents: 1 },
        triangles: 1,
        pos: new Float32Array(0),
        nrm: new Float32Array(0),
        idx: new Uint32Array(0),
      },
    });
    return {
      exactReady: Boolean(twoPreviewReady),
      active: Boolean(twoMeshJob),
      note: document.getElementById("note")?.textContent || "",
    };
  });
  assert(!stale.exactReady, "stale exact worker result became preview-ready");
  assert(!stale.active, "stale exact worker job remained active");
  assert(
    /MESH_STALE_RESULT|stale|design changed/i.test(stale.note),
    `stale result lacked a user-visible rejection diagnostic: ${stale.note}`,
  );
  console.log("B649-U03 stale-worker control PASS — old exact result was rejected");
  assert(browserErrors.length === 0, `browser errors:\n${browserErrors.join("\n")}`);
  assert(issues.length === 0, `B649-U03 identity failures:\n- ${issues.join("\n- ")}`);
  console.log(
    `B649-U03 PASS — revision ${first.globalIdentity.revision} → `
      + `${committedMutation.authority.revision}; stale exact mutation rejected`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
