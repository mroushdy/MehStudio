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

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing from shell.html`);
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
  throw new Error(`unterminated ${name}`);
}

function functionCalls(source, name) {
  const calls = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf(`${name}(`, cursor);
    if (start < 0) break;
    const argsStart = start + name.length + 1;
    let depth = 1;
    let quote = "";
    let escaped = false;
    let lineComment = false;
    let blockComment = false;
    let argumentStart = argsStart;
    const args = [];
    let closed = false;
    for (let index = argsStart; index < source.length; index += 1) {
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
      if (character === "(" || character === "[" || character === "{") depth += 1;
      if (character === ")" || character === "]" || character === "}") {
        depth -= 1;
        if (depth === 0) {
          args.push(source.slice(argumentStart, index).trim());
          calls.push(args);
          cursor = index + 1;
          closed = true;
          break;
        }
      }
      if (character === "," && depth === 1) {
        args.push(source.slice(argumentStart, index).trim());
        argumentStart = index + 1;
      }
    }
    if (!closed) throw new Error(`unterminated call to ${name}`);
  }
  return calls;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normalize(vector) {
  const magnitude = Math.hypot(...vector);
  assert.ok(magnitude > 1e-12, "cannot normalize a zero vector");
  return vector.map((value) => value / magnitude);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function discBasis(normal) {
  const n = normalize(normal);
  const seed = Math.abs(n[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
  const projection = dot(seed, n);
  const u = normalize(seed.map((value, index) => value - projection * n[index]));
  return [u, normalize(cross(n, u))];
}

function projectUnitDisc(values, offset) {
  const magnitude = Math.hypot(values[offset], values[offset + 1]);
  if (magnitude > 1) {
    values[offset] /= magnitude;
    values[offset + 1] /= magnitude;
  }
}

/* Independent convex minimization for the distance between two arbitrarily
   oriented filled discs. The renderer regression used center distance as if
   each thin driver frame were a sphere; this oracle deliberately works in
   each disc's own plane. */
function orientedDiscDistance(centerA, normalA, radiusA, centerB, normalB, radiusB) {
  const [uA, vA] = discBasis(normalA);
  const [uB, vB] = discBasis(normalB);
  const columns = [
    uA.map((value) => value * radiusA),
    vA.map((value) => value * radiusA),
    uB.map((value) => -value * radiusB),
    vB.map((value) => -value * radiusB),
  ];
  const origin = centerA.map((value, axis) => value - centerB[axis]);
  const values = [0, 0, 0, 0];
  const step = 1 / Math.max(1e-12, 4 * (radiusA ** 2 + radiusB ** 2));
  for (let iteration = 0; iteration < 20_000; iteration += 1) {
    const delta = origin.slice();
    for (let column = 0; column < columns.length; column += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        delta[axis] += columns[column][axis] * values[column];
      }
    }
    const previous = values.slice();
    for (let column = 0; column < columns.length; column += 1) {
      values[column] -= step * 2 * dot(columns[column], delta);
    }
    projectUnitDisc(values, 0);
    projectUnitDisc(values, 2);
    if (Math.hypot(...values.map((value, index) => value - previous[index])) < 1e-13) {
      break;
    }
  }
  const separation = origin.slice();
  for (let column = 0; column < columns.length; column += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      separation[axis] += columns[column][axis] * values[column];
    }
  }
  return Math.hypot(...separation);
}

function affectedPanelState() {
  const documented = engine.BUILDS["2way"].find((entry) => entry.key === "jmod88");
  assert.ok(documented, "JMOD base state is missing");
  return {
    ...documented.s,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "angular",
    seN: 12,
    nW: 2,
    npW: 2,
    panelAxis: "vertical",
    mountRing: "integrated",
    mouthW: 24,
    mouthCap: 64,
    covH: 90,
    covV: 60,
    wallT: 0.018,
    twoXO: 500,
    tapCRW: 6,
    rearAlign: "external",
    wPre: "ndl88",
    odW: 31.5,
    dpW: 14,
    sdW: 522,
    vtcW: 180,
    xmW: 8,
  };
}

test("a display build bump is not the saved two-way state schema", () => {
  const wireSource = extractNamedFunction(shell, "wireTwoWay");
  const designSource = extractNamedFunction(shell, "applyTwoDesign");
  const schemaSource = `${wireSource}\n${designSource}`;
  assert.doesNotMatch(
    schemaSource,
    /_smart2waySchema\s*(?:!==|===|=)\s*MEH_BUILD\b/,
    "MEH_BUILD still controls two-way state admission",
  );
  const schemaUses = [
    ...schemaSource.matchAll(
      /_smart2waySchema\s*(?:!==|===|=)\s*([A-Za-z_$][\w$]*|\d+)/g,
    ),
  ];
  assert.ok(schemaUses.length >= 2, "two-way state schema is not read and written");
  for (const use of schemaUses) {
    assert.notEqual(use[1], "MEH_BUILD", "state schema aliases the display build");
  }
  assert.match(
    shell,
    /candidate&&candidate\._smart2waySchema===TWO_WAY_STATE_SCHEMA/,
    "stale pre-release state is still admitted",
  );
  assert.doesNotMatch(shell, /function migrateTwoWayPersistedState\s*\(/);
  assert.doesNotMatch(
    shell,
    /const\s+legacy\s*=\s*\{\s*opposed:|arch:\(opposed\|jmod\|distributed\|radial4\|dualcell\|custom\)/,
    "retired two-way architecture aliases remain in the product shell",
  );
  const saveSource = extractNamedFunction(shell, "save");
  assert.match(saveSource, /delete persisted\.mountRing/);
  assert.match(saveSource, /_smart2waySchema=TWO_WAY_STATE_SCHEMA/);
});

test("the renderer preserves solved oriented driver datums without a lift", () => {
  const solved = engine.solve(affectedPanelState());
  assert.equal(solved.infeasible, false, "affected calculated panel case is infeasible");
  assert.equal(solved.ev.fails, 0, "affected calculated panel case has failing laws");
  const plan = solved.ev.plan;
  assert.equal(plan.drivers.length, 2);
  const [driverA, driverB] = plan.drivers;
  const radius = plan.frame.frameR;
  const physicalDiscGap = orientedDiscDistance(
    driverA.driverFace,
    driverA.mountN,
    radius,
    driverB.driverFace,
    driverB.mountN,
    radius,
  );
  assert.ok(
    physicalDiscGap > 0.012,
    `independent oriented-disc gap is ${physicalDiscGap} m`,
  );
  assert.ok(
    Math.abs(plan.minDriverGap - physicalDiscGap) <= 1e-9,
    `plan gap ${plan.minDriverGap} differs from independent ${physicalDiscGap}`,
  );

  const specSource = extractNamedFunction(shell, "mountInterfaceSpec");
  const context = {};
  vm.runInNewContext(`${specSource}\nthis.mountInterfaceSpec = mountInterfaceSpec;`, context);
  const visualTools = engine.twoWaySolidField(plan);
  const specs = plan.drivers.map((driver) =>
    context.mountInterfaceSpec(plan, driver, solved.S, visualTools));
  specs.forEach((spec, index) => {
    assert.ok(
      distance(spec.bearingFace, plan.drivers[index].driverFace) <= 1e-10,
      `driver ${index} received a renderer-only lift`,
    );
    assert.ok(
      !Number.isFinite(spec.clearanceLift) || Math.abs(spec.clearanceLift) <= 1e-12,
      `driver ${index} reports ${spec.clearanceLift} m renderer-only lift`,
    );
  });
});

test("mount preview datums remain identical to panel and radial production roots", () => {
  const specSource = extractNamedFunction(shell, "mountInterfaceSpec");
  const context = {};
  vm.runInNewContext(`${specSource}\nthis.mountInterfaceSpec = mountInterfaceSpec;`,
    context);
  const panelSolved = engine.solve(affectedPanelState());
  assert.equal(panelSolved.infeasible, false);
  const panelVisualTools = engine.twoWaySolidField(panelSolved.ev.plan);
  for (const driver of panelSolved.ev.plan.drivers) {
    const spec = context.mountInterfaceSpec(
      panelSolved.ev.plan, driver, panelSolved.S, panelVisualTools);
    const rootDepth = Math.min(
      0.002,
      (driver.panelT || panelSolved.S.wallT) * 0.20,
    );
    const expectedRoot = driver.surface.map(
      (value, axis) => value - driver.mountN[axis] * rootDepth,
    );
    assert.ok(distance(spec.panelPlateRoot, expectedRoot) <= 1e-10);
    assert.ok(distance(spec.cavityRoot, driver.cavInner) <= 1e-10);
    assert.ok(distance(spec.panelPlateRoot, spec.cavityRoot) > 0.001,
      "panel outer support and cone relief collapsed to one false datum");
  }

  const radialBase = {
    ...engine.TWO_ARCH.radial.defaults,
    topo: "2way",
    twoArch: "radial",
    twoFamily: "radial",
    twoDesign: "arch:radial",
    style: "smooth",
    nW: 2,
    npW: 2,
    mouthW: 28,
    requestedMouthW: 28,
    mouthCap: 64,
  };
  for (const profileLaw of [
    "regressionEasedConical",
    "conical",
    "classicOS",
    "osse",
  ]) {
    for (const detachable of [false, true]) {
      const state = {
        ...radialBase,
        profileLaw,
        driverCellConstruction: detachable ? "cartridge" : "integrated",
        mountRing: detachable ? "ring" : "integrated",
      };
      const plan = engine.twoWayPlan(state, {
        deferRetention: true,
        coarseRadialDiagnostics: true,
      });
      assert.equal(plan.drivers.length, 2);
      for (const driver of plan.drivers) {
        const spec = context.mountInterfaceSpec(
          plan, driver, plan.S, {});
        const expectedWall = driver.surface.map(
          (value, axis) => value + driver.wallN[axis] * spec.wall,
        );
        assert.ok(distance(spec.wallContact, expectedWall) <= 1e-10,
          `${profileLaw}: radial wall contact left wallN`);
        if (detachable) {
          assert.ok(distance(spec.radialTaperRoot, driver.cartridgeStart) <= 1e-10);
          assert.ok(Math.abs(spec.jointT - driver.gasketGap) <= 1e-12);
        } else {
          const depth = Math.max(driver.innerR, spec.wall);
          const expected = driver.surface.map(
            (value, axis) => value - driver.mountN[axis] * depth,
          );
          assert.ok(distance(spec.radialTaperRoot, expected) <= 1e-10,
            `${profileLaw}: integrated taper root drifted`);
        }
        assert.ok(distance(spec.cavityRoot, driver.cavInner) <= 1e-10);
      }
    }
  }
});

test("radial analytic mounts are profile-clipped and geometrically audited", () => {
  const boundarySource = extractNamedFunction(shell, "boundedHornDistance");
  const clippedSource = extractNamedFunction(shell, "clippedPreviewSurface");
  const moduleSource = extractNamedFunction(shell, "radialModuleVisual");
  const gasketProfileSource = extractNamedFunction(shell,
    "conformalJointGasketProfile");
  const gasketSource = extractNamedFunction(shell,
    "conformalJointGasketVisual");
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  assert.match(boundarySource, /twoWaySdCross/);
  assert.match(clippedSource, /minimumForbiddenDistance/);
  assert.match(clippedSource, /boundaryVertexCount/);
  assert.match(moduleSource, /spec\.radialTaperRoot/);
  assert.match(moduleSource, /integratedRootBridge/);
  assert.match(moduleSource, /clippedPreviewSurface/);
  assert.match(gasketProfileSource, /spec\.wall\+spec\.jointT/);
  assert.match(gasketProfileSource, /projectionComplete/);
  assert.match(gasketSource, /conformalJointGasketProfile/);
  assert.match(gasketSource, /projectionComplete/);
  assert.match(renderSource, /mountsOutsideForbiddenVolume/);
  assert.match(renderSource, /integratedRootsConnected/);
  assert.match(renderSource, /detachableGasketsComplete/);
  assert.doesNotMatch(
    renderSource,
    /adapter=hollowFrustum\(spec\.adapterStart/,
    "radial renderer restored the unbounded mount frustum",
  );
});

test("detachable gasket projection reaches both solved profile offsets", () => {
  const specSource = extractNamedFunction(shell, "mountInterfaceSpec");
  const frameSource = extractNamedFunction(shell, "radialPreviewFrame");
  const projectSource = extractNamedFunction(shell, "projectToProfileBoundary");
  const context = { MEH2: engine };
  vm.runInNewContext(
    `${specSource}\n${frameSource}\n${projectSource}\n`
      + `this.mountInterfaceSpec=mountInterfaceSpec;`
      + `this.radialPreviewFrame=radialPreviewFrame;`
      + `this.projectToProfileBoundary=projectToProfileBoundary;`,
    context,
  );
  const base = {
    ...engine.TWO_ARCH.radial.defaults,
    topo: "2way",
    twoArch: "radial",
    twoFamily: "radial",
    twoDesign: "arch:radial",
    style: "smooth",
    nW: 2,
    npW: 2,
    mouthW: 28,
    requestedMouthW: 28,
    mouthCap: 64,
    driverCellConstruction: "cartridge",
    mountRing: "ring",
  };
  for (const profileLaw of [
    "regressionEasedConical",
    "conical",
    "classicOS",
    "osse",
  ]) {
    const plan = engine.twoWayPlan({ ...base, profileLaw }, {
      deferRetention: true,
      coarseRadialDiagnostics: true,
    });
    const driver = plan.drivers[0],
      spec = context.mountInterfaceSpec(plan, driver, plan.S, {}),
      frame = context.radialPreviewFrame(spec.n),
      compactStart = Math.min(
        driver.outerR - spec.wall * 0.5,
        Math.max(
          driver.innerR + plan.adapterRootWeb,
          driver.outerR * 0.42,
        ),
      ),
      outerR = Math.max(driver.innerR + spec.wall + 0.005, compactStart),
      innerR = Math.max(
        driver.innerR + 0.0008,
        outerR - Math.max(0.006, spec.wall * 0.65),
      );
    for (const radius of [innerR, outerR]) {
      for (let index = 0; index < 12; index += 1) {
        const angle = index / 12 * Math.PI * 2,
          basePoint = driver.surface.map((value, axis) =>
            value
              + frame.u[axis] * Math.cos(angle) * radius
              + frame.v[axis] * Math.sin(angle) * radius);
        for (const offset of [spec.wall, spec.wall + spec.jointT]) {
          const point = context.projectToProfileBoundary(
            plan, basePoint, spec.n, offset);
          assert.ok(point, `${profileLaw}: gasket projection missed profile`);
          assert.ok(
            Math.abs(engine.twoWaySdCross(plan, ...point, offset)) < 1e-9,
            `${profileLaw}: projected gasket point left offset surface`,
          );
        }
      }
    }
  }
});

test("two-way compression-driver ownership is singular", () => {
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  const rebuildSource = extractNamedFunction(shell, "rebuild");
  assert.match(
    renderSource,
    /cdBody\.userData\.tag\s*=\s*['"]driver['"]/,
    "two-way renderer no longer owns its compression-driver root",
  );
  assert.match(
    rebuildSource,
    /else\s+if\s*\(\s*S\.topo\s*!==\s*['"]2way['"]\s*\)/,
    "generic apex renderer can still add another compression driver in two-way mode",
  );
});

test("FULL tap passage overlays cannot add terminal caps", () => {
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  const calls = functionCalls(renderSource, "tapPassageVisual");
  assert.ok(calls.length > 0, "two-way analytic review has no tap passage call");
  for (const [index, args] of calls.entries()) {
    assert.ok(args.length >= 6, `tap passage call ${index} has an incomplete signature`);
    assert.match(
      args[4],
      /^(?:null|undefined)$/,
      `tap passage call ${index} supplies a cap material: ${args[4]}`,
    );
  }
});

test("FULL tap passage overlays cannot begin in front of the horn acoustic surface", () => {
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  const calls = functionCalls(renderSource, "tapPassageVisual");
  assert.ok(calls.length > 0, "two-way analytic review has no tap passage call");
  for (const [index, args] of calls.entries()) {
    assert.ok(args.length >= 2, `tap passage call ${index} has no front boundary`);
    assert.doesNotMatch(
      args[1],
      /(?:^|[?:,(])\s*-\s*(?:\d|\.)/,
      `tap passage call ${index} can place additive dark geometry in horn air: ${args[1]}`,
    );
  }
});

test("FULL analytic shell uses canonical tap Boolean clipping", () => {
  const clipSource = extractNamedFunction(shell, "applyTapBooleanClip");
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  assert.match(clipSource, /visualTools\.tapTools/);
  assert.match(clipSource, /tool\.kind===['"]swept-aperture['"]\?tool\.sections/);
  assert.match(clipSource, /section\.stage===['"]wall['"]/);
  assert.match(clipSource, /mehTapSegmentA/);
  assert.match(clipSource, /mehTapSegmentAxis/);
  assert.match(clipSource, /mehTapSegmentU/);
  assert.match(clipSource, /mehTapSegmentV/);
  assert.match(clipSource, /mehTapSegmentLength/);
  assert.match(clipSource, /if\(mehInside\)discard/);
  assert.match(clipSource,
    /productionAuthority:['"]twoway-core solidField\.tapTools['"]/);
  assert.match(
    renderSource,
    /applyTapBooleanClip\(shellMat,P,['"]horn-shell['"]/,
  );
  assert.match(
    renderSource,
    /applyTapBooleanClip\(adapterMat,P,['"]driver-cell['"],visualTools,true,di\)/,
  );
});

test("default two-way driver-cell depth is zero/unknown with conservative clearance", () => {
  const state = affectedPanelState();
  for (const key of [
    "coneProfileMode",
    "coneDepthMm",
    "coneDepthKnown",
    "coneAxialClearanceMm",
    "coneRadialClearanceMm",
    "driverCellConstruction",
  ]) {
    delete state[key];
  }
  const solved = engine.solve(state);
  assert.equal(solved.infeasible, false);
  const cell = solved.ev.plan.driverCell;
  assert.equal(solved.S.coneDepthMm, 0);
  assert.equal(solved.S.coneDepthKnown, false);
  assert.equal(cell.coneProfile.mode, "flat");
  assert.equal(cell.coneProfile.depthMm, 0);
  assert.equal(cell.coneProfile.effectiveDepthMm, 0);
  assert.equal(cell.coneProfile.depthKnown, false);
  assert.equal(cell.coneProfile.complete, true);
  assert.ok(cell.clearance.axialMm >= 6);
  assert.ok(cell.clearance.radialMm >= 2);
  assert.match(cell.clearance.axialSource, /conservative auto/);
  assert.match(cell.clearance.radialSource, /conservative auto/);
  assert.ok(
    cell.frontChamber.designAxialDepthM
      >= cell.frontChamber.requiredAxialDepthM,
    "default chamber does not contain its conservative moving envelope",
  );
  assert.ok(
    cell.movingEnvelope.conservativeAxialDepthM
      >= solved.ev.plan.frame.xmax + 0.006 - 1e-9,
    "unknown flat cone lost Xmax plus automatic axial clearance",
  );
});

test("driver-cell controls are real saved state, not display-only fields", () => {
  for (const id of [
    "twoDriverCellCtl",
    "coneProfileMode",
    "coneDepthMm",
    "coneDepthKnown",
    "coneAxialClearanceMm",
    "coneRadialClearanceMm",
  ]) {
    assert.match(shell, new RegExp(`id=["']${id}["']`), `${id} control is missing`);
  }
  const paintSource = extractNamedFunction(shell, "paintDriverCellUI");
  assert.match(paintSource, /P&&P\.driverCell/);
  assert.match(paintSource, /cone depth defaults to 0 mm and unknown/);
  assert.match(paintSource, /fc\.designAxialDepthMm/);
  assert.match(paintSource, /getElementById\(['"]twoDriverCellSummary['"]\)/);
  assert.match(paintSource, /DEPTH NOT SUPPLIED/);
  assert.match(paintSource, /AUTO CLEARANCE/);
  assert.match(paintSource, /USER CLEARANCE/);
  assert.match(paintSource, /driverCellConstruction===['"]cartridge['"]/);
  assert.match(shell, /driverCellConstruction:['"]integrated['"]/);
  assert.match(shell, /coneDepthMm:0/);
  assert.match(shell, /coneDepthKnown:false/);

  const detailsStart = shell.indexOf('<details class="advanced" id="twoDriverCellCtl"');
  assert.notEqual(detailsStart, -1, "driver-cell controls are not a details disclosure");
  const detailsStartTag = shell.slice(detailsStart, shell.indexOf(">", detailsStart) + 1);
  assert.doesNotMatch(detailsStartTag, /\sopen(?:\s|=|>)/);
  assert.match(shell, /<summary id=["']twoDriverCellSummary["']>/);
});

test("profile selector exposes only core-owned profiles and plain driver-cell wording", () => {
  assert.match(
    shell,
    /<option value=["']conical["'] selected>Straight conical<\/option>/,
  );
  assert.match(shell, /STRAIGHT CONICAL · FLAT PRINTED BAFFLE/);
  assert.match(
    shell,
    /<option value=["']flat["']>flat plane — depth not supplied<\/option>/,
  );
  assert.match(shell, /profileLaw:['"]conical['"]/);
  const profileSelectStart = shell.indexOf('<select id="profileLaw">');
  const profileSelectEnd = shell.indexOf("</select>", profileSelectStart);
  const profileSelect = shell.slice(profileSelectStart, profileSelectEnd);
  assert.doesNotMatch(
    profileSelect,
    /legacyEasedConical|regressionEasedConical|compatibility baseline/i
  );

  const plainTextSource = extractNamedFunction(shell, "userFacingDiagnosticText");
  assert.doesNotMatch(plainTextSource, /legacy|compatib/i);
  assert.match(plainTextSource, /return String\(/);

  const rebuildSource = extractNamedFunction(shell, "rebuild");
  assert.match(rebuildSource, /userFacingDiagnosticText\(x\.val\)/);
  assert.match(rebuildSource, /userFacingDiagnosticText\(st\.profileLaw\.label\)/);
});

test("retained cartridge UI fails closed unless active, plan, and audit all pass", () => {
  const semanticsSource = extractNamedFunction(shell, "twoWayMountSemantics");
  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  const context = {};
  vm.runInNewContext(
    `${semanticsSource}\nthis.twoWayMountSemantics = twoWayMountSemantics;`,
    context,
  );
  const state = {
    topo: "2way",
    twoArch: "radial",
    driverCellConstruction: "cartridge",
    mountRing: "ring",
    nW: 3,
  };
  const basePlan = {
    family: "radial",
    drivers: [{}, {}, {}],
  };
  for (const retention of [
    { active: true, ok: true, pass: false, totalScrews: 6 },
    { active: true, ok: false, pass: true, totalScrews: 6 },
    { active: false, ok: true, pass: true, totalScrews: 6 },
  ]) {
    const semantics = context.twoWayMountSemantics(state, {
      ...basePlan,
      retention,
    });
    assert.equal(semantics.retentionGeometryPass, false);
    assert.match(semantics.label, /refused/i);
    assert.match(semantics.retention, /refused/i);
  }
  const admitted = context.twoWayMountSemantics(state, {
    ...basePlan,
    retention: {
      active: true,
      ok: true,
      pass: true,
      totalScrews: 6,
      fastener: "M4 × 0.7",
    },
  });
  assert.equal(admitted.retentionGeometryPass, true);
  assert.match(admitted.label, /retained/i);
  assert.match(admitted.summary, /6 M4 × 0\.7 retention locations/i);
  assert.match(
    renderSource,
    /retention\.active===true&&\s*retention\.pass===true&&retention\.ok===true/,
    "renderer admits a partially passed retention record",
  );
});

test("mount inspection isolates one unchanged bearing face with deterministic camera and layers", () => {
  assert.match(shell, /id=["']mountFocusSel["']/);
  assert.match(shell, /id=["']mountInspectBadge["']/);
  assert.match(shell, /BOOT_Q\.get\(['"]mountFocus['"]\)/);

  const cameraSource = extractNamedFunction(shell, "applyMountInspectionCamera");
  assert.match(cameraSource, /P3\(d\.mountN\)\.normalize\(\)/);
  assert.match(cameraSource, /V3D\.tgt\.copy\(P3\(d\.driverFace\)\)/);
  assert.match(cameraSource, /Math\.atan2\(direction\.z,direction\.x\)/);
  assert.match(cameraSource, /Math\.asin/);

  const renderSource = extractNamedFunction(shell, "renderTwoWay");
  assert.match(renderSource, /horn\.visible=!isolatedDriverInspection/);
  assert.match(renderSource, /adapter\.visible=selected&&!focusedMount/);
  assert.match(renderSource, /feature\.visible=\(!isolatedDriverInspection/);
  assert.match(renderSource, /tunnel\.visible=selected&&!focusedMount/);
  assert.match(renderSource, /gasket\.visible=selected&&!focusedMount/);
  assert.match(renderSource, /pocketRoot\.visible=selected&&!focusedMount/);
  assert.match(renderSource, /focusedFaceOverlayCount/);
  const uiSource = extractNamedFunction(shell, "paintMountInspectionUI");
  assert.match(uiSource, /assembly position unchanged/i);
  assert.doesNotMatch(
    renderSource,
    /hornFlangeC|moduleFlangeC/,
    "analytic preview invents a second collar absent from the exact cartridge field",
  );
});

test("LF integration reference cannot masquerade as the internal LF/CD crossover", () => {
  for (const id of ["lfRefName", "lfRefNote", "subXO"]) {
    assert.match(shell, new RegExp(`id=["']${id}["']`), `${id} control is missing`);
  }
  assert.match(shell, /EXTERNAL LF HANDOFF \/ XMAX REFERENCE \[Hz\]/);
  assert.match(shell, /LF PROTECTION \/ XMAX REFERENCE \[Hz\]/);
  assert.match(shell, /does not set the woofer↔compression-driver crossover or tap station/);
  assert.match(shell, /setsInternalWooferToCdCrossover:false/);
  assert.match(shell, /setsTapStation:false/);
});

test("mouth sizing keeps request, package floor, and acoustic guidance separate", () => {
  assert.match(shell, /id=["']vMouthW["']/);
  assert.doesNotMatch(shell, /id=["']vMouth["']/);
  for (const id of ["mouthW", "twoMouthNote", "nW", "twoCountNote"]) {
    assert.match(shell, new RegExp(`id=["']${id}["']`), `${id} control is missing`);
  }
  assert.match(shell, /requestedMouthW:26/);
  assert.match(shell, /requestedMouthIn=\+S\.requestedMouthW/);
  assert.match(shell, /hard driver\/package floor/);
  assert.match(shell, /acoustic values are guidance, not fit failures/);
  assert.match(shell, /acousticGuidanceIsHardFailure:false/);

  const preflightSource = extractNamedFunction(shell, "twoWayCountPreflight");
  assert.match(preflightSource, /for\(const n of A\.counts\)/);
  assert.match(preflightSource, /requested=Math\.max\(1,\+state\.mouthW/);
  assert.doesNotMatch(preflightSource, /requested=Math\.max\(1,\+S\.mouthW/);
  assert.match(preflightSource, /minMouthIn/);
  assert.match(preflightSource, /impossible=!firstLegal\|\|minimum>cap/);
  assert.match(shell, /mouth\/fit repair never substitutes the selected count or driver/);
});

test("woofer-count options rebuild from each current solved mouth and plan containment", () => {
  const mountSource = extractNamedFunction(shell, "twoWayPlanMountContainment");
  const preflightSource = extractNamedFunction(shell, "twoWayCountPreflight");
  const refreshSource = extractNamedFunction(shell, "refreshTwoWayCountOptions");
  for (const field of [
    "minDriverGap",
    "minMountSide",
    "panelBoltClearance",
    "panelBoltRequired",
    "radialPackageRequired",
    "radialPackageAvailable",
    "mountEnvelopeComplete",
    "mountEnvelopeCoverage",
    "mountEnvelopeClearance",
    "mountEnvelopeRequiredClearance",
  ]) {
    assert.match(mountSource, new RegExp(`P\\.${field}`), `${field} is not consumed`);
  }

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
  const arch = { counts: [2, 4, 6], defaults: { nW: 2, mouthW: 24, twoXO: 500 } };
  const context = {
    S: { topo: "2way", nW: 2, mouthW: 32, mouthCap: 64, wallT: 0.012 },
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
      TWO_ARCH: { panel: arch },
      twoWayPlan(state) {
        return {
          S: state,
          arch,
          family: "panel",
          minMouthIn: 20,
          minDriverGap: 0.01,
          minMountSide: 0.02,
          tapFraction: 0.2,
          maxPortReach: 0.04,
          frame: { activeR: 0.06 },
          np: 2,
          pairWeb: 0.01,
          minWeb: 0.004,
          tapMach: 0.02,
          tapMachLimit: 0.2,
          panelBoltClearance: 0.01,
          panelBoltRequired: 0.004,
          mountEnvelopeComplete: true,
          mountEnvelopeCoverage: 1,
          mountEnvelopeClearance: 0.003,
          mountEnvelopeRequiredClearance: 0.00064,
          boltInnerWebPass: true,
          boltOuterWebPass: true,
        };
      },
    },
  };
  vm.runInNewContext(
    `${mountSource}\n${preflightSource}\n${refreshSource}\n`
      + "this.refreshTwoWayCountOptions = refreshTwoWayCountOptions;"
      + "this.twoWayPlanMountContainment = twoWayPlanMountContainment;",
    context,
  );

  context.refreshTwoWayCountOptions({ ...context.S, mouthW: 32 });
  assert.ok(count.options.every(option => /current 32\.0″ mouth/.test(option.textContent)));
  assert.equal(count.dataset.preflightMouth, "32.0");

  context.refreshTwoWayCountOptions({ ...context.S, mouthW: 40 });
  assert.ok(count.options.every(option => /current 40\.0″ mouth/.test(option.textContent)));
  assert.ok(count.options.every(option => !/32\.0″/.test(option.textContent)));
  assert.equal(count.dataset.preflightMouth, "40.0");
  assert.match(note.textContent, /COUNT PREFLIGHT @ 40\.0″/);

  const refused = context.twoWayPlanMountContainment({
    family: "panel",
    minDriverGap: 0.01,
    minMountSide: 0.02,
    panelBoltClearance: 0.001,
    panelBoltRequired: 0.004,
    mountEnvelopeComplete: true,
    mountEnvelopeCoverage: 1,
    mountEnvelopeClearance: 0.003,
    mountEnvelopeRequiredClearance: 0.00064,
  }, context.S);
  assert.equal(refused.pass, false);
  assert.match(refused.reason, /woofer fasteners clear HF flange/);

  const rebuildSource = extractNamedFunction(shell, "rebuild");
  const solveIndex = rebuildSource.indexOf("const r=MEH2.solve(S)");
  const refreshIndex = rebuildSource.indexOf("refreshTwoWayCountOptions(r.S,ev.plan)");
  assert.ok(solveIndex >= 0 && refreshIndex > solveIndex,
    "count options are not refreshed from the completed solve");
});

test("six-woofer count preflight solves tap-pair web by compression before refusal", () => {
  const mountSource = extractNamedFunction(shell, "twoWayPlanMountContainment");
  const preflightSource = extractNamedFunction(shell, "twoWayCountPreflight");
  const arch = {
    counts: [6],
    defaults: { nW: 2, mouthW: 24, twoXO: 500 },
  };
  const context = {
    S: {
      topo: "2way",
      tapBasis: "model",
      nW: 2,
      mouthW: 64,
      mouthCap: 64,
      wallT: 0.018,
      tapCRW: 6.5,
      twoXO: 500,
      cdFloor: 300,
    },
    MEH2: {
      twoWayPlan(state) {
        const cr = +state.tapCRW;
        const pairWeb = cr >= 7.5 ? 0.00551 : cr >= 7 ? 0.00357 : 0.00141;
        return {
          S: state,
          arch,
          family: "panel",
          cr,
          maxCrMach: 27,
          minMouthIn: 64,
          minDriverGap: 0.01,
          minMountSide: 0.02,
          tapFraction: 0.24,
          maxPortReach: 0.04,
          frame: { activeR: 0.06 },
          np: 2,
          pairWeb,
          minWeb: 0.0054,
          tapMach: 0.03,
          tapMachLimit: 0.10,
          panelBoltClearance: 0.01,
          panelBoltRequired: 0.0054,
          mountEnvelopeComplete: true,
          mountEnvelopeCoverage: 1,
          mountEnvelopeClearance: 0.01,
          mountEnvelopeRequiredClearance: 0.001,
          boltInnerWebPass: true,
          boltOuterWebPass: true,
        };
      },
    },
  };
  vm.runInNewContext(
    `${mountSource}\n${preflightSource}\n`
      + "this.twoWayCountPreflight = twoWayCountPreflight;",
    context,
  );

  const availability = context.twoWayCountPreflight(arch, context.S);
  const six = availability.items[0];
  assert.equal(six.impossible, false);
  assert.equal(six.dependentTapCR, 7.5);
  assert.match(six.reason, /tap compression adapts to 7\.5:1/);
  assert.doesNotMatch(six.reason, /hard package needs 64\.0/);
});

test("verbose two-way provenance and solver package live below the viewport", () => {
  const asideStart = shell.indexOf("<aside>");
  const asideEnd = shell.indexOf("</aside>", asideStart);
  const asideMarkup = shell.slice(asideStart, asideEnd);
  assert.match(asideMarkup, /id=["']twoStatusSummary["']/);
  assert.match(asideMarkup, /role=["']status["']/);
  assert.match(asideMarkup, /aria-live=["']polite["']/);
  for (const id of ["twoArchNote", "twoBasisNote", "twoSolvedSummary", "twoSolvedGrid"]) {
    assert.doesNotMatch(
      asideMarkup,
      new RegExp(`id=["']${id}["']`),
      `${id} regressed into the setup sidebar`,
    );
  }

  const viewport = shell.indexOf('id="v3dwrap"');
  const diagnostics = shell.indexOf('id="twoDesignDiagnostics"');
  const chart = shell.indexOf('id="chartwrap"');
  assert.ok(viewport >= 0 && diagnostics > viewport, "diagnostics must follow the 3D viewport");
  assert.ok(chart > diagnostics, "diagnostics must precede the lower response/report stack");

  const diagnosticsMarkup = shell.slice(diagnostics, chart);
  assert.match(diagnosticsMarkup, /aria-labelledby=["']twoDesignDiagnosticsLabel["']/);
  assert.match(
    diagnosticsMarkup,
    /role=["']group["'][^>]*aria-label=["']Two-way design provenance and solved package["']/,
  );
  for (const id of ["twoArchNote", "twoBasisNote", "twoSolvedSummary", "twoSolvedGrid"]) {
    assert.match(
      diagnosticsMarkup,
      new RegExp(`id=["']${id}["']`),
      `${id} was not preserved in the lower diagnostics disclosure`,
    );
  }

  const wireSource = extractNamedFunction(shell, "wireTwoWay");
  assert.match(wireSource, /getElementById\(['"]twoDesignDiagnostics['"]\)/);
  assert.match(wireSource, /diagnostics\.style\.display=on\?'':'none'/);

  const rebuildSource = extractNamedFunction(shell, "rebuild");
  assert.match(rebuildSource, /getElementById\(['"]twoStatusSummary['"]\)/);
  assert.match(rebuildSource, /DETAILS BELOW VIEWPORT/);
});
