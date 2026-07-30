import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { engine, loadCases } from "./node/case-loader.mjs";

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const shellPath = path.resolve(qaDir, "..", "shell.html");
const shell = fs.readFileSync(shellPath, "utf8");

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing from shell.html`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === "*" && n === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === "/" && n === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") depth += 1;
    if (c === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

const specSource = extractNamedFunction(shell, "mountInterfaceSpec");
const context = {};
vm.runInNewContext(`${specSource}\nthis.mountInterfaceSpec = mountInterfaceSpec;`, context);
const mountInterfaceSpec = context.mountInterfaceSpec;

function finiteVector(value, label) {
  assert.ok(Array.isArray(value), `${label} is not an array`);
  assert.equal(value.length, 3, `${label} is not a 3-vector`);
  value.forEach((component, index) => {
    assert.ok(Number.isFinite(component), `${label}[${index}] is not finite`);
  });
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function distance(a, b) {
  return Math.hypot(...sub(a, b));
}

function solvedFixture(id) {
  const fixture = loadCases().find((candidate) => candidate.id === id);
  assert.ok(fixture, `fixture ${id} is missing`);
  const solved = engine.solve(fixture.state);
  assert.equal(solved.infeasible, false, `${id} is unexpectedly infeasible`);
  return solved;
}

function assertInterface(plan, state, id) {
  const visualTools = engine.twoWaySolidField(
    plan,
    state.driverCellConstruction === "cartridge"
  );
  const specs = plan.drivers.map((driver) =>
    mountInterfaceSpec(plan, driver, state, visualTools)
  );
  assert.equal(specs.length, plan.drivers.length, `${id} lost a mount`);

  for (const [index, spec] of specs.entries()) {
    for (const key of [
      "wallContact",
      "panelPlateRoot",
      "adapterStart",
      "bearingFace",
      "driverOrigin"
    ]) {
      finiteVector(spec[key], `${id} driver ${index} ${key}`);
    }
    for (const key of [
      "wall",
      "gasketT",
      "frameR",
      "activeR",
      "bearingReach",
      "driverReach",
      "plateT",
      "landOuterR",
      "openingR",
      "gasketOuterR",
      "gasketInnerR"
    ]) {
      assert.ok(
        Number.isFinite(spec[key]) && spec[key] > 0,
        `${id} driver ${index} has invalid ${key}: ${spec[key]}`
      );
    }
    assert.equal(spec.sealed, true, `${id} driver ${index} has an open mount joint`);
    assert.equal(
      spec.driverBehindWall,
      true,
      `${id} driver ${index} starts inside the acoustic wall`
    );
    assert.ok(
      spec.bearingReach >= spec.wall - 1e-6,
      `${id} driver ${index} bearing plate floats before the rear wall`
    );
    assert.ok(
      spec.driverReach >= spec.bearingReach + spec.gasketT - 1e-6,
      `${id} driver ${index} gasket does not separate frame and plate`
    );
    assert.ok(
      spec.landOuterR > spec.openingR &&
        spec.openingR > 0,
      `${id} driver ${index} has no printable bearing annulus`
    );
    assert.ok(
      spec.gasketOuterR > spec.gasketInnerR &&
        spec.gasketInnerR > spec.activeR,
      `${id} driver ${index} gasket misses the frame/cone boundary`
    );

    if (spec.family === "panel") {
      assert.equal(
        spec.clearanceSolved,
        true,
        `${id} panel package cannot separate complete driver frames`
      );
      assert.ok(
        !Number.isFinite(spec.clearanceLift) || Math.abs(spec.clearanceLift) <= 1e-12,
        `${id} driver ${index} received a renderer-only clearance lift`
      );
      assert.ok(
        distance(spec.bearingFace, plan.drivers[index].driverFace) <= 1e-10,
        `${id} driver ${index} renderer datum diverges from the solved datum`
      );
      const rootOffset = dot(
        sub(spec.panelPlateRoot, plan.drivers[index].surface),
        spec.n
      );
      assert.ok(
        rootOffset <= 0 && rootOffset >= -0.0021,
        `${id} panel bearing boss does not begin in the rear wall`
      );
    } else if (spec.mode === "detachable") {
      assert.ok(
        Number.isFinite(spec.jointT) && spec.jointT > 0,
        `${id} driver ${index} has invalid detachable joint thickness`
      );
      assert.ok(
        Array.isArray(plan.drivers[index].cartridgeStart) &&
          distance(
            spec.radialTaperRoot,
            plan.drivers[index].cartridgeStart
          ) <= 1e-10,
        `${id} detachable module does not begin at the solved cartridge root`
      );
      assert.ok(
        Math.abs(
          spec.jointT -
            Math.max(0.0004, +plan.drivers[index].gasketGap || 0.0008)
        ) <= 1e-12,
        `${id} conformal gasket does not use the solved cartridge gap`
      );
    } else {
      assert.equal(spec.jointT, 0, `${id} integrated mount has a detachable joint`);
      const rootOverlap = dot(sub(spec.adapterStart, plan.drivers[index].surface), spec.n);
      assert.ok(
        rootOverlap < -spec.wall * 0.9,
        `${id} integrated adapter does not overlap the horn wall`
      );
    }
  }

  /* The solver evaluates complete circular frames as oriented discs. A
     center-distance-minus-diameters test treats those thin tilted frames as
     spheres and was the source of the former renderer-only lift. */
  assert.ok(
    Number.isFinite(plan.minDriverGap) && plan.minDriverGap >= 0.004 - 1e-6,
    `${id} solved oriented driver gap is ${plan.minDriverGap}`
  );
  return specs;
}

test("production rear-interface contract covers panel 2/4 and radial 2-8", () => {
  const fixtureIds = ["P01", "P04", "R02", "R03", "R04-I", "R04-D", "R06", "R08"];
  for (const id of fixtureIds) {
    const solved = solvedFixture(id);
    const specs = assertInterface(solved.ev.plan, solved.S, id);
    assert.equal(
      specs[0].mode,
      solved.S.mountRing === "ring" ? "detachable" : "integrated",
      `${id} renderer mount mode diverges from solved state`
    );
  }
});

test("tap shape and one/two-entry changes cannot remove mounts or passage interfaces", () => {
  const base = solvedFixture("R04-I").S;
  for (const shape of ["slot", "oval", "round"]) {
    for (const tapsPerWoofer of [1, 2]) {
      let state = engine.smartAdapt2way(
        { ...base, npW: tapsPerWoofer },
        "npW",
        {}
      ).S2;
      state = engine.smartAdapt2way({ ...state, shW: shape }, "shW", {}).S2;
      const solved = engine.solve(state);
      assert.equal(
        solved.infeasible,
        false,
        `${shape}/${tapsPerWoofer} was unexpectedly refused`
      );
      assertInterface(
        solved.ev.plan,
        solved.S,
        `radial-${shape}-${tapsPerWoofer}`
      );
      assert.equal(
        solved.ev.plan.allPorts.length,
        solved.ev.plan.drivers.length * tapsPerWoofer,
        `${shape}/${tapsPerWoofer} lost canonical tap descriptors`
      );
      for (const driver of solved.ev.plan.drivers) {
        assert.equal(driver.ports.length, tapsPerWoofer);
        driver.ports.forEach((port) => assert.equal(port.shape, shape));
      }
    }
  }
});

test("FULL ASSEMBLY source contract is worker-independent and camera-stable", () => {
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  const driverSource = extractNamedFunction(shell, "driverBody");
  const gasketSource = extractNamedFunction(shell, "conformalJointGasketVisual");
  assert.match(renderSource, /const mountSpecs=P\.drivers\.map/);
  assert.match(renderSource, /\['full','nodrv','mount','cell','ghost','section'\]/);
  assert.match(renderSource, /tapPassageVisual\(q/);
  assert.match(renderSource, /panelMountQA\.tapInterfaceCount\+\+/);
  assert.match(renderSource, /moduleMat:shellMat/);
  assert.match(renderSource, /conformalJointGasketVisual/);
  assert.match(gasketSource, /mount-joint-gasket/);
  assert.match(renderSource, /driverPocketVisualGroup\(pockets,d,spec,apertureMat\)/);
  assert.match(
    renderSource,
    /retentionFeatureVisual\(tool,moduleMat,apertureMat/,
  );
  assert.match(
    renderSource,
    /retention\.active===true&&\s*retention\.pass===true&&retention\.ok===true/,
  );
  assert.doesNotMatch(
    renderSource,
    /mount-fastener/,
    "renderer still invents a decorative fastener ring outside exact ownership",
  );
  assert.match(renderSource, /window\.__mountInterfaceQA=panelMountQA/);
  assert.doesNotMatch(
    renderSource,
    /if\s*\(\s*exact\s*&&[^)]*(?:mount|driver|gasket|tap)/i,
    "exact worker readiness gates assembly interface geometry"
  );

  for (const component of [
    "frame",
    "frame-gasket",
    "surround",
    "cone",
    "dustcap",
    "magnet"
  ]) {
    assert.match(
      driverSource,
      new RegExp(`driverComponent=['"]${component}['"]`),
      `driverBody does not identify ${component}`
    );
  }

  assert.match(shell, /const heldViewer=V3D\.cameraFitted/);
  assert.match(shell, /V3D\.view=heldViewer\.view/);
  assert.match(shell, /V3D\.tgt\.copy\(heldViewer\.target\)/);
  assert.match(shell, /V3D\.dist=heldViewer\.orbit\/V3D\.bnd/);
});

test("all inline shell scripts remain syntactically valid", () => {
  const scripts = [...shell.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length >= 2, "expected bootstrap and application scripts");
  scripts.forEach((match, index) => {
    assert.doesNotThrow(
      () => new Function(match[1]),
      `inline shell script ${index} has a syntax error`
    );
  });
});
