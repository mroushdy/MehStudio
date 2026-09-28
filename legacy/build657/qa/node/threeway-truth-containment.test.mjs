import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");
const engineSource = fs.readFileSync(path.join(appRoot, "engine.js"), "utf8");
const engine = require(path.join(appRoot, "engine.js"));

function functionSource(name, nextName) {
  const start = shell.indexOf(`function ${name}(`);
  const end = shell.indexOf(`\nfunction ${nextName}(`, start);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} is not bounded by ${nextName}`);
  return shell.slice(start, end);
}

test("three-way is visibly contained as analysis preview geometry", () => {
  assert.match(
    shell,
    /const THREE_WAY_ANALYSIS_LABEL='ANALYSIS PREVIEW — NOT MANUFACTURING GEOMETRY';/,
  );
  assert.match(
    shell,
    /fb\.textContent=THREE_WAY_ANALYSIS_LABEL\+' · STL DISABLED'/,
  );
  assert.match(
    shell,
    /<b>'\+THREE_WAY_ANALYSIS_LABEL\+'<\/b><br>'/,
  );
  assert.match(
    shell,
    /the current three-way preview is not '\s*\+'Boolean-integrated manufacturing geometry/,
  );
  assert.match(shell, /window\.__threeWayContainment=snapshot/);
  assert.match(
    shell,
    /document\.documentElement\.dataset\.threeWayContainment='analysis-preview'/,
  );
});

test("three-way STL refusal runs before every download primitive", () => {
  const start = shell.indexOf(
    "document.getElementById('bStl').onclick=async()=>",
  );
  const end = shell.indexOf(
    "{ const reportButton=document.getElementById('bHrn');",
    start,
  );
  assert.ok(start >= 0 && end > start, "STL handler is missing");
  const handler = shell.slice(start, end);
  const refusal = handler.indexOf("if(S.topo==='3way'){");
  const blob = handler.indexOf("new Blob");
  const anchor = handler.indexOf("document.createElement('a')");
  const shellMesh = handler.indexOf("MEH2.shellMesh");

  assert.ok(refusal >= 0, "three-way refusal branch is missing");
  assert.match(
    handler,
    /STL EXPORT REFUSED — '\s*\+THREE_WAY_ANALYSIS_LABEL/,
  );
  assert.match(handler, /no STL or cutter file was downloaded/);
  assert.ok(refusal < blob, "a Blob can be created before three-way refusal");
  assert.ok(refusal < anchor, "a download anchor can be created before refusal");
  assert.ok(
    refusal < shellMesh,
    "legacy three-way shell generation is reachable before refusal",
  );
});

test("Hornresp availability is governed by the source-audited exporter preflight", () => {
  const source = functionSource(
    "threeWayHornrespPreflight",
    "paintThreeWayContainment",
  );
  const tsMarker = Object.freeze({ marker: "canonical T/S table" });
  const calls = [];
  const context = {
    MEH2: {
      hornrespME(state, ts) {
        calls.push({ state, ts });
        return context.nextOutput;
      },
    },
    TS: tsMarker,
    userFacingDiagnosticText(value) {
      return String(value ?? "");
    },
    nextOutput: null,
  };
  vm.createContext(context);
  vm.runInContext(
    `${source}\nthis.preflight=threeWayHornrespPreflight;`,
    context,
  );

  const state = { topo: "3way" };
  context.nextOutput = { error: "REFUSED (no invented T/S): mid missing BL" };
  const unavailable = context.preflight(state);
  assert.equal(unavailable.available, false);
  assert.match(unavailable.reason, /missing BL/);
  assert.equal(unavailable.output, null);

  context.nextOutput = { ME1: "woofer", ME2: "mid", Nd: "horn" };
  const available = context.preflight(state);
  assert.equal(available.available, true);
  assert.equal(available.output.ME2, "mid");
  assert.equal(calls.at(-1).state, state);
  assert.equal(calls.at(-1).ts, tsMarker);

  const irrelevant = context.preflight({ topo: "2way" });
  assert.equal(irrelevant.applicable, false);
  assert.equal(calls.length, 2, "non-three-way state called Hornresp ME");
});

test("Hornresp control disables itself until preflight succeeds", () => {
  const source = functionSource(
    "paintThreeWayContainment",
    "paintRuntimeSentinel",
  );
  const button = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
  };
  const context = {
    S: { topo: "3way" },
    THREE_WAY_ANALYSIS_LABEL:
      "ANALYSIS PREVIEW — NOT MANUFACTURING GEOMETRY",
    threeWayHornrespPreflight() {
      throw new Error("unexpected fallback preflight");
    },
    document: {
      documentElement: { dataset: {} },
      getElementById(id) {
        return id === "bHrn" ? button : null;
      },
    },
    window: {},
  };
  vm.createContext(context);
  vm.runInContext(
    `${source}\nthis.paint=paintThreeWayContainment;`,
    context,
  );

  const unavailable = context.paint({
    applicable: true,
    available: false,
    reason: "mid has no T/S row",
  });
  assert.equal(unavailable.stlAvailable, false);
  assert.equal(unavailable.hornrespAvailable, false);
  assert.equal(button.disabled, true);
  assert.equal(button.attributes["aria-disabled"], "true");
  assert.match(button.textContent, /HORNRESP UNAVAILABLE/);
  assert.match(button.title, /mid has no T\/S row/);

  const available = context.paint({
    applicable: true,
    available: true,
    reason: "",
  });
  assert.equal(available.hornrespAvailable, true);
  assert.equal(button.disabled, false);
  assert.equal(button.attributes["aria-disabled"], "false");
  assert.equal(button.textContent, "HORNRESP EXPORT");

  context.S.topo = "2way";
  context.paint();
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "DESIGN REPORT");
  assert.equal(context.window.__threeWayContainment.active, false);
});

test("the legacy exporter refuses every state until its source mapping is rebuilt", () => {
  for (const record of engine.BUILDS["3way"]) {
    const output = engine.hornrespME(structuredClone(record.s), {});
    assert.match(
      output.error || "",
      /THREEWAY_HORNRESP_MAPPING_UNVERIFIED/,
      `${record.key} did not refuse the unverified legacy record mapping`,
    );
  }

  const state = structuredClone(engine.BUILDS["3way"][0].s);
  const output = engine.hornrespME(state, {
    hpl10: { Fs: 61, Qes: 0.33, Qms: 4.5, Re: 5.4, BL: 15 },
    m4: { Fs: 120, Qes: 0.5, Qms: 4, Re: 6, BL: 8 },
  });
  assert.match(output.error, /record ownership, horn direction, units/i);
  assert.equal(output.ME1, undefined);
  assert.equal(output.ME2, undefined);
  assert.equal(output.Nd, undefined);
  assert.match(engineSource, /LEGACY HORNRESP ME EXPORT — QUARANTINED IN BUILD 653/);
});

test("unsupported commercial-canon language is absent from visible sources", () => {
  const visibleSources = `${shell}\n${engineSource}`;
  assert.doesNotMatch(
    visibleSources,
    /SH-?96\s+canon|Danley\s+(?:dialect|canon)|DANLEY[- ]DIALECT/i,
  );
  assert.match(shell, /calculated 45° chamfer placement/);
  assert.match(shell, /symmetric calculated cone coverage/);
  assert.match(engineSource, /ARCHIVED REFERENCE AREA/);
  assert.match(engineSource, /not verified geometry for another commercial model/);
});
