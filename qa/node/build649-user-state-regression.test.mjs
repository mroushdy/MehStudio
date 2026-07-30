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

function userState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "classicOS",
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
    nW: 2,
    npW: 2,
    driverArrayMode: "manual",
    driverArrayRotationDeg: 0,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    wPre: "nw10",
    odW: 26.1,
    dpW: 11.9,
    sdW: 320,
    vtcW: 1400,
    xmW: 6.8,
    frameW: "round",
    boltNW: 8,
    bcdW: 244,
    boltDW: 6.5,
    gasketW: 1.6,
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    adapterReach: 35,
    ...overrides,
  };
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function wrappedAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

test("the exact reported panel state is a pinned, clean calculated plan", () => {
  const result = engine.solve(userState());
  assert.equal(result.infeasible, false);
  assert.equal(result.ev.fails, 0);
  assert.equal(result.S.mouthW, 32);
  assert.equal(result.S.wPre, "nw10");
  assert.equal(result.S.nW, 2);
  assert.equal(result.S.npW, 2);
  assert.equal(result.S.driverArrayMode, "manual");
  assert.equal(result.S.driverArrayRotationDeg, 0);
  assert.equal(result.ev.plan.arrayPlacement.mode, "manual");
  assert.equal(result.ev.plan.arrayPlacement.solvedRotationDeg, 0);
  assert.equal(result.ev.plan.st.profileHash, "pl1-eec0f709");
  assert.equal(result.ev.plan.drivers.length, 2);
  assert.ok(result.ev.plan.mountEnvelopeComplete);
  assert.equal(result.ev.plan.mountEnvelopeCoverage, 1);
});

test("reported-state profile choices reach distinct production station records", () => {
  const records = ["conical", "classicOS", "osse"].map((profileLaw) => {
    const plan = engine.twoWayPlan(userState({ profileLaw }));
    return {
      profileLaw,
      hash: plan.st.profileHash,
      depth: plan.st.depth,
      stations: plan.st.pts.map((point) => [point.x, point.a, point.b]),
    };
  });
  assert.equal(new Set(records.map((record) => record.hash)).size, records.length);
  assert.equal(new Set(records.map((record) => record.depth)).size, records.length);
  for (let index = 1; index < records.length; index += 1) {
    assert.notDeepEqual(records[index].stations, records[0].stations);
  }
});

test("reported-state panel tap pairs and opposed drivers are symmetric", () => {
  const plan = engine.twoWayPlan(userState());
  const [left, right] = plan.drivers;
  assert.ok(Math.abs(left.pairSpread - right.pairSpread) < 5e-7);
  for (const driver of plan.drivers) {
    assert.equal(driver.ports.length, 2);
    assert.ok(Math.abs(driver.ports[0].center[0] - driver.ports[1].center[0]) < 1e-12);
    assert.ok(
      Math.abs(wrappedAngle(
        driver.ports[0].phi + driver.ports[1].phi - 2 * driver.phi,
      )) < 2e-6,
    );
  }
  for (const port of left.ports) {
    const opposite = [port.center[0], -port.center[1], -port.center[2]];
    assert.ok(
      Math.min(...right.ports.map((candidate) => distance(opposite, candidate.center)))
        < 5e-7,
      "opposed driver tap lacks a 180-degree partner",
    );
  }
});

test("six compact panel woofers remain six cells and twelve connected passages", () => {
  const result = engine.solve(userState({
    profileLaw: "conical",
    mouthW: 24,
    requestedMouthW: 24,
    nW: 6,
    wPre: "w5",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    boltNW: 4,
    bcdW: undefined,
    boltDW: undefined,
  }));
  assert.equal(result.infeasible, false);
  assert.equal(result.ev.fails, 0);
  assert.equal(result.S.nW, 6);
  assert.equal(result.ev.plan.drivers.length, 6);
  assert.equal(result.ev.plan.allPorts.length, 12);
  assert.equal(result.ev.plan.driverCells.length, 6);
  assert.ok(result.ev.plan.minDriverGap >= 0.004);
  assert.equal(result.ev.plan.mountEnvelopeComplete, true);

  for (let index = 0; index < 3; index += 1) {
    const driver = result.ev.plan.drivers[index];
    const opposite = result.ev.plan.drivers[index + 3];
    assert.ok(Math.abs(wrappedAngle(opposite.phi - driver.phi - Math.PI)) < 1e-12);
    for (const port of driver.ports) {
      const reflected = [port.center[0], -port.center[1], -port.center[2]];
      assert.ok(
        Math.min(...opposite.ports.map((candidate) =>
          distance(reflected, candidate.center))) < 5e-7,
        "six-woofer tap lacks an exact opposed partner",
      );
    }
  }

  const field = engine.twoWaySolidField(result.ev.plan);
  const assembly = engine.assemblyAudit(result.ev.plan, field);
  assert.equal(assembly.pass, true);
  assert.equal(
    assembly.rows.find((row) =>
      row.name === "tap cutters connect horn air to front chambers")?.pass,
    true,
  );
  assert.equal(engine.twoWayMeshPreflight(result.S, "preview").ok, true);
});

test("count availability changes with the selected driver, not a stale mouth label", () => {
  const preflightSource = namedFunction(shell, "twoWayCountPreflight");
  const mountSource = namedFunction(shell, "twoWayPlanMountContainment");
  const context = { MEH2: engine };
  vm.runInNewContext(
    `${mountSource}\n${preflightSource}\n`
      + "this.twoWayCountPreflight = twoWayCountPreflight;",
    context,
  );
  const architecture = engine.TWO_ARCH.panel;
  const nw10 = context.twoWayCountPreflight(architecture, userState());
  assert.equal(nw10.requested, 32);
  assert.equal(nw10.items.find((item) => item.n === 2)?.impossible, false);
  assert.equal(nw10.items.find((item) => item.n === 4)?.impossible, false);
  assert.equal(nw10.items.find((item) => item.n === 6)?.impossible, true);

  const w5 = context.twoWayCountPreflight(
    architecture,
    userState({
      wPre: "w5",
      odW: 13.76,
      dpW: 6.95,
      sdW: 91.6,
      vtcW: 35,
      xmW: 2.5,
      boltNW: 4,
      bcdW: undefined,
      boltDW: undefined,
    }),
  );
  assert.equal(w5.items.find((item) => item.n === 2)?.impossible, false);
  assert.equal(w5.items.find((item) => item.n === 4)?.impossible, false);
  assert.equal(w5.items.find((item) => item.n === 6)?.impossible, false);
  assert.match(w5.items.find((item) => item.n === 4)?.reason || "", /32\.0″ mouth/);
  assert.match(w5.items.find((item) => item.n === 6)?.reason || "", /32\.0″ mouth/);

  const wider = context.twoWayCountPreflight(
    architecture,
    userState({ mouthW: 40, requestedMouthW: 40 }),
  );
  assert.equal(wider.requested, 40);
  assert.match(wider.items.find((item) => item.n === 2)?.reason || "", /40\.0″ mouth/);
  assert.doesNotMatch(wider.items.find((item) => item.n === 2)?.reason || "", /32\.0″/);
});
