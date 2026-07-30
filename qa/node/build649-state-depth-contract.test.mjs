import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

/*
 * Build 649 closure contracts B649-P11, B649-P12, and the core half of
 * B649-U03. These tests intentionally exercise current-schema input. They are
 * not migration tests: there is no released legacy project format to guess at.
 */

function panelState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    _smart2waySchema: 3,
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 6,
    seN: 6,
    covH: 90,
    covV: 60,
    mouthW: 48,
    requestedMouthW: 48,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
    wPre: "custom",
    odW: 26.1,
    dpW: 11.9,
    sdW: 320,
    vtcW: 1400,
    xmW: 6.8,
    nW: 2,
    npW: 2,
    panelAxis: "horizontal",
    shW: "slot",
    tapShapeW: "slot",
    twoXO: 430,
    tapCRW: 9,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
    adapterReach: 35,
    adapterReachMode: "auto",
    ...overrides,
  };
}

function minimumGeneratedSpan(plan) {
  return Math.min(...plan.driverCells.map(
    (cell) => cell.frontChamber.geometricSpanM,
  ));
}

test("B649-P11: unknown flat cone generates its conservative required span", () => {
  const solved = engine.solve(panelState());
  assert.equal(solved.infeasible, false, "the regression fixture must be solvable");
  assert.equal(solved.ev.fails, 0, "the regression fixture must have no other law failures");

  const plan = solved.ev.plan;
  const required = plan.driverCell.frontChamber.requiredAxialDepthM;
  const generated = minimumGeneratedSpan(plan);
  assert.equal(plan.driverCell.coneProfile.mode, "flat");
  assert.equal(plan.driverCell.coneProfile.depthKnown, false);
  assert.match(plan.driverCell.clearance.axialSource, /conservative automatic/);
  assert.ok(
    generated >= required - 1e-6,
    `generated ${(generated * 1000).toFixed(2)} mm, but the same plan requires `
      + `${(required * 1000).toFixed(2)} mm`,
  );
});

test("B649-P11: measured cone depth changes generated chamber/package geometry", () => {
  const flat = engine.solve(panelState());
  const measured = engine.solve(panelState({
    coneProfileMode: "measured",
    coneDepthMm: 30,
    coneDepthKnown: true,
  }));
  assert.equal(flat.infeasible, false);
  assert.equal(measured.infeasible, false);
  assert.equal(measured.ev.fails, 0);

  const flatPlan = flat.ev.plan;
  const measuredPlan = measured.ev.plan;
  assert.ok(
    minimumGeneratedSpan(measuredPlan) >=
      measuredPlan.driverCell.frontChamber.requiredAxialDepthM - 1e-6,
  );
  assert.ok(
    minimumGeneratedSpan(measuredPlan) > minimumGeneratedSpan(flatPlan) + 0.025,
    "30 mm measured depth did not grow the printable driver cell",
  );
  assert.ok(
    measuredPlan.drivers[0].adapterReach > flatPlan.drivers[0].adapterReach + 0.025,
    "30 mm measured depth did not alter the solved package reach",
  );
  assert.notEqual(
    engine.twoWayMeshKey(measured.S, "export"),
    engine.twoWayMeshKey(flat.S, "export"),
    "measured depth did not invalidate exact manufacturing identity",
  );
});

function assertCurrentValueRefused(field, value, overrides = {}) {
  let result;
  let thrown;
  try {
    result = engine.solve(panelState({ [field]: value, ...overrides }));
  } catch (error) {
    thrown = error;
  }
  if (thrown) {
    assert.match(
      `${thrown.code || ""} ${thrown.message || ""}`,
      /unknown|unsupported|invalid|refus/i,
      `${field} threw without an explicit refusal diagnostic`,
    );
    return;
  }
  const failures = (result.ev?.rows || []).filter((row) => row.st === "fail");
  assert.ok(
    result.infeasible === true || failures.length > 0,
    `${field}=${JSON.stringify(value)} was silently admitted as `
      + `${JSON.stringify(result.S?.[field])}`,
  );
  assert.ok(
    failures.some((row) => /unknown|unsupported|invalid|refus/i.test(
      `${row.code || ""} ${row.name || ""} ${row.why || ""}`,
    )),
    `${field} refusal lacks an explicit unknown/unsupported diagnostic`,
  );
}

for (const regression of [
  {
    label: "architecture",
    field: "twoArch",
    value: "future-architecture",
    overrides: { twoFamily: "future-architecture" },
  },
  {
    label: "design",
    field: "twoDesign",
    value: "arch:future-design",
  },
  {
    label: "section family",
    field: "sectionFamily",
    value: "future-section",
  },
]) {
  test(`B649-P12: unknown current ${regression.label} refuses`, () => {
    assertCurrentValueRefused(
      regression.field,
      regression.value,
      regression.overrides,
    );
  });
}

test("B649-U03 core: exact identity embeds the canonical shared state hash", () => {
  assert.equal(
    typeof engine.twoWayStateHash,
    "function",
    "core does not expose the canonical state hash shared by UI/report/preview/exact",
  );
  const solved = engine.solve(panelState());
  const hash = engine.twoWayStateHash(solved.S);
  const reordered = Object.fromEntries(Object.entries(solved.S).reverse());
  assert.match(hash, /^[a-z0-9][a-z0-9._-]*$/i);
  assert.equal(engine.twoWayStateHash(reordered), hash);
  assert.match(
    engine.twoWayMeshKey(solved.S, "export"),
    new RegExp(hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "exact manufacturing fingerprint does not carry the shared state hash",
  );
});
