import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const shell = fs.readFileSync(path.join(appRoot, "shell.html"), "utf8");
const engine = require(path.join(appRoot, "engine.js"));

function namedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is unterminated`);
}

test("JMOD startup count paint reuses its solved plan and never scans alternatives", (t) => {
  const record = engine.BUILDS["2way"].find((item) => item.key === "jmod88");
  assert.ok(record, "JMOD record is missing");
  const solved = engine.solve(
    engine.migrateTwoWayState(JSON.parse(JSON.stringify(record.s))),
  );
  const state = solved.S;
  const plan = solved.ev.plan;
  const before = JSON.parse(JSON.stringify(state));
  const count = {
    dataset: {},
    options: [],
    replaceChildren() { this.options = []; },
    appendChild(option) { this.options.push(option); },
    removeAttribute(name) {
      if (name === "data-preflight-mouth") delete this.dataset.preflightMouth;
    },
  };
  const note = {};
  let alternativePlanCalls = 0;
  const context = {
    S: state,
    document: {
      getElementById(id) {
        if (id === "nW") return count;
        if (id === "twoCountNote") return note;
        return null;
      },
      createElement() {
        return { dataset: {} };
      },
    },
    MEH2: {
      TWO_ARCH: engine.TWO_ARCH,
      twoWayPlan(...args) {
        alternativePlanCalls += 1;
        return engine.twoWayPlan(...args);
      },
    },
  };
  vm.runInNewContext(
    `${namedFunction(shell, "twoWayPlanMountContainment")}\n`
      + `${namedFunction(shell, "twoWayCountPreflight")}\n`
      + `${namedFunction(shell, "refreshTwoWayCountOptions")}\n`
      + "this.refreshTwoWayCountOptions = refreshTwoWayCountOptions;",
    context,
  );

  const started = performance.now();
  const availability = context.refreshTwoWayCountOptions(state, plan);
  const elapsedMs = performance.now() - started;
  t.diagnostic(`JMOD solved-plan count paint ${elapsedMs.toFixed(3)} ms`);

  assert.equal(alternativePlanCalls, 0,
    "startup count paint launched alternative geometry solves");
  assert.ok(elapsedMs < 250,
    `startup count paint took ${elapsedMs.toFixed(1)} ms (limit 250 ms)`);
  assert.equal(availability.deferred, true);
  assert.equal(count.options.length, plan.arch.counts.length);
  assert.ok(
    count.options
      .filter((option) => +option.value !== state.nW)
      .every((option) => option.dataset.countStatus === "pending"
        && /SOLVE ON SELECT/.test(option.textContent)),
    "unverified alternatives were presented as already solved",
  );
  assert.deepEqual(state, before, "count paint mutated the saved design");
  assert.match(note.textContent, /mouth\/fit repair never substitutes/);

  const wireSource = namedFunction(shell, "wireTwoWay");
  assert.match(
    wireSource,
    /refreshTwoWayCountOptions\(S,null,\{deferAlternatives:true\}\)/,
    "boot wiring regressed to exhaustive alternative preflight",
  );
  const mainWireSource = namedFunction(shell, "wire");
  assert.match(
    mainWireSource,
    /onlyCount:next,publishedCountChange:true/,
    "an explicit count choice no longer runs its exact calculated preflight",
  );
  assert.match(
    mainWireSource,
    /S\[key\]=previous/,
    "a refused count choice no longer restores the prior user intent",
  );
});
