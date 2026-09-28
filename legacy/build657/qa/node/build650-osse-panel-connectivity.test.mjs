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

const add = (a, b, scale = 1) => (
  a.map((value, index) => value + b[index] * scale)
);
const sub = (a, b) => a.map((value, index) => value - b[index]);
const mix = (a, b, amount) => add(a, sub(b, a), amount);
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const length = (a) => Math.hypot(...a);
const distance = (a, b) => length(sub(a, b));
const unit = (a) => {
  const magnitude = Math.max(1e-15, length(a));
  return a.map((value) => value / magnitude);
};
const reflectOpposed = ([x, y, z]) => [x, -y, -z];

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

const mountContext = {};
vm.runInNewContext(
  `${namedFunction(shell, "mountInterfaceSpec")}
   this.mountInterfaceSpec = mountInterfaceSpec;`,
  mountContext,
);

function releasedState(overrides = {}) {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "smooth",
    profileLaw: "osse",
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
    panelAxis: "horizontal",
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
    adapterReachMode: "auto",
    osseThroatAngle: 7.5,
    osseK: 1.8,
    osseS: 0.7,
    osseTerminationN: 4,
    osseQ: 0.995,
    ...overrides,
  };
}

function daytonSixState(overrides = {}) {
  return releasedState({
    nW: 6,
    wPre: "w5",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    frameW: "round",
    boltNW: 4,
    bcdW: undefined,
    boltDW: 5,
    ...overrides,
  });
}

function pointSegmentDistance(point, a, b) {
  const ab = sub(b, a);
  const denominator = Math.max(1e-18, dot(ab, ab));
  const amount = Math.max(
    0,
    Math.min(1, dot(sub(point, a), ab) / denominator),
  );
  return distance(point, add(a, ab, amount));
}

function toolSections(tool) {
  return tool?.kind === "swept-aperture" ? tool.sections : tool ? [tool] : [];
}

function apertureInteriorOffsets(port) {
  return [
    [0, 0],
    ...engine.twoWayApertureOutline(port, 32)
      .filter((_, index) => index % 8 === 0)
      .map(([u, v]) => [u * 0.55, v * 0.55]),
  ];
}

function hasContinuousPlateToHornWitness(plan, field, driver) {
  const rootRadius = Math.min(
    driver.outerR - plan.shellT * 0.5,
    Math.max(
      driver.innerR + plan.panelRootWeb,
      driver.outerR * 0.72,
    ),
  );
  for (let angleIndex = 0; angleIndex < 360; angleIndex += 1) {
    const angle = angleIndex / 360 * Math.PI * 2;
    for (const fraction of [0.2, 0.35, 0.5, 0.65, 0.8, 0.9]) {
      let continuous = true;
      for (let index = 0; index <= 40; index += 1) {
        const amount = index / 40;
        const center = mix(driver.surface, driver.driverFace, amount);
        const outerAt = rootRadius
          + (driver.outerR - rootRadius) * amount;
        const radius = outerAt * fraction;
        const point = add(
          add(center, driver.flow, Math.cos(angle) * radius),
          driver.cross,
          Math.sin(angle) * radius,
        );
        if (field(point) > 1e-7) {
          continuous = false;
          break;
        }
      }
      if (continuous) return true;
    }
  }
  return false;
}

function compressionFastenerContains(plan, point, tolerance = 1e-6) {
  const state = plan.S;
  const boltCount = (state.cdBoltN | 0) || 4;
  const boltCircle = +state.cdBCD > 0
    ? +state.cdBCD / 1000
    : (+state.td || 1.4) >= 2 ? 0.127 : 0.102;
  const boltRadius = (
    +state.cdBoltD > 0 ? +state.cdBoltD / 1000 : 0.0065
  ) / 2;
  for (let index = 0; index < boltCount; index += 1) {
    const angle = index / boltCount * Math.PI * 2;
    const y = Math.cos(angle) * boltCircle / 2;
    const z = Math.sin(angle) * boltCircle / 2;
    if (
      pointSegmentDistance(
        point,
        [-0.022, y, z],
        [0.014, y, z],
      ) <= boltRadius + tolerance
    ) return true;
  }
  return false;
}

function isCanonicalFastenerVoid(plan, field, point) {
  if (compressionFastenerContains(plan, point)) return true;
  return field.boltTools.flat().some((bolt) => (
    pointSegmentDistance(point, bolt.a, bolt.b) <= bolt.r + 1e-6
  ));
}

function assertSupportedGasketAnnulus(plan, field, driver, spec) {
  let solidSamples = 0;
  let fastenerSamples = 0;
  const center = add(spec.bearingFace, spec.n, -0.0005);
  for (let radialIndex = 0; radialIndex < 8; radialIndex += 1) {
    const radius = spec.gasketInnerR
      + (spec.gasketOuterR - spec.gasketInnerR)
      * (radialIndex + 0.5) / 8;
    for (let angleIndex = 0; angleIndex < 144; angleIndex += 1) {
      const angle = angleIndex / 144 * Math.PI * 2;
      const point = add(
        add(center, driver.flow, Math.cos(angle) * radius),
        driver.cross,
        Math.sin(angle) * radius,
      );
      if (field(point) <= 1e-7) {
        solidSamples += 1;
      } else {
        assert.ok(
          isCanonicalFastenerVoid(plan, field, point),
          `driver ${driver.index} gasket lacks support outside a declared fastener`,
        );
        fastenerSamples += 1;
      }
    }
  }
  assert.ok(solidSamples > 1000, "gasket support sampling became vacuous");
  assert.ok(
    fastenerSamples > 0,
    "fixture no longer exercises canonical fastener interruptions",
  );
}

function assertTapConnectivity(plan, field, driver, port) {
  const tool = field.tapTools?.[driver.index]?.[port.index];
  assert.ok(tool, `driver ${driver.index}/tap ${port.index}: cutter missing`);
  const sections = toolSections(tool);
  assert.ok(sections.length > 0);
  let crossesHornWall = false;
  let crossesPlateSpan = false;
  let reachesChamber = false;
  const sampledAxial = [];
  for (const section of sections) {
    assert.equal(section.shape, port.shape);
    assert.ok(Math.abs(section.sa - port.sa) < 1e-12);
    assert.ok(Math.abs(section.sb - port.sb) < 1e-12);
    const crossA = engine.twoWaySdCross(plan, ...section.a, 0);
    const crossB = engine.twoWaySdCross(plan, ...section.b, 0);
    if (crossA <= 1e-7 && crossB >= -1e-7) crossesHornWall = true;
    for (const amount of [0.08, 0.25, 0.5, 0.75, 0.92]) {
      const center = mix(section.a, section.b, amount);
      const axial = dot(sub(center, driver.surface), driver.mountN);
      sampledAxial.push(axial);
      if (axial >= -0.002 && axial <= driver.adapterReach + 0.002) {
        crossesPlateSpan = true;
      }
      const chamberStart = dot(
        sub(driver.cavInner, driver.surface),
        driver.mountN,
      );
      if (axial >= chamberStart - 0.002) reachesChamber = true;
      for (const [u, v] of apertureInteriorOffsets(port)) {
        const point = add(add(center, section.u, u), section.v, v);
        assert.ok(
          field(point) > -1e-8,
          `driver ${driver.index}/tap ${port.index}: blocked lumen`,
        );
      }
    }
  }
  assert.ok(crossesHornWall, "tap cutter no longer crosses its canonical horn cut");
  assert.ok(
    crossesPlateSpan,
    `tap cutter no longer traverses the plate span; sampled axial range `
      + `${(Math.min(...sampledAxial) * 1000).toFixed(2)}..`
      + `${(Math.max(...sampledAxial) * 1000).toFixed(2)} mm vs `
      + `-2.00..${((driver.adapterReach + 0.002) * 1000).toFixed(2)} mm`,
  );
  assert.ok(reachesChamber, "tap cutter no longer reaches its canonical chamber");
}

function assertMountRecord(plan, field) {
  for (const driver of plan.drivers) {
    const spec = mountContext.mountInterfaceSpec(plan, driver, plan.S, field);
    const plateTool = field.integratedPlateTools.find(
      (candidate) => candidate.driverIndex === driver.index,
    );
    assert.equal(spec.mountPreviewComplete, true);
    assert.equal(spec.integratedPlateToolComplete, true);
    assert.equal(spec.integratedPlateToolMatches, true);
    assert.equal(spec.integratedPlateTool, plateTool);
    assert.equal(
      spec.plateManifest,
      field.integratedPlateSubtractorManifest,
    );
    assert.equal(spec.cornerPlateDeclared, false);
    assert.equal(spec.cornerPlate, null);
    assert.equal(spec.ordinaryBearingComplete, true);
    assert.equal(spec.sealed, true);
    assert.equal(spec.driverBehindWall, true);
    assert.ok(Math.abs(spec.landOuterR - driver.outerR) < 1e-12);
    assert.ok(
      Math.abs(spec.openingR - plateTool.openingRadius) < 1e-12,
    );
    assert.ok(
      Math.abs(spec.plateRootRadius - plateTool.rootRadius) < 1e-12,
    );
    assert.ok(
      Math.abs(spec.gasketInnerR - plateTool.gasketInnerRadius) < 1e-12,
    );
    assert.ok(
      Math.abs(spec.gasketOuterR - plateTool.gasketOuterRadius) < 1e-12,
    );
    assert.ok(spec.openingR < spec.gasketInnerR);
    assert.ok(spec.gasketInnerR < spec.gasketOuterR);
    assert.ok(spec.gasketOuterR <= spec.landOuterR + 1e-12);
    assert.ok(Math.abs(dot(driver.mountN, driver.flow)) < 1e-10);
    assert.ok(Math.abs(dot(driver.mountN, driver.cross)) < 1e-10);
    assert.ok(Math.abs(dot(driver.flow, driver.cross)) < 1e-10);
    assert.ok(hasContinuousPlateToHornWitness(plan, field, driver));
    assertSupportedGasketAnnulus(plan, field, driver, spec);
    for (const port of driver.ports) {
      assertTapConnectivity(plan, field, driver, port);
    }
  }
}

const EXACT_PLATE_SUBTRACTORS = [
  "front-chamber/cone-relief",
  "canonical-tap-lumens",
  "driver-fastener-holes",
];

function assertExactPlateManifest(plan, field) {
  assert.deepEqual(
    field.integratedPlateSubtractorManifest.allowed,
    EXACT_PLATE_SUBTRACTORS,
  );
  assert.equal(
    field.integratedPlateSubtractorManifest.scope,
    "integrated panel driver plate",
  );
  assert.equal(field.integratedPlateTools.length, plan.drivers.length);
  assert.equal(field.integratedPlateAudit.length, plan.drivers.length);
  for (const driver of plan.drivers) {
    const tool = field.integratedPlateTools.find(
      (candidate) => candidate.driverIndex === driver.index,
    );
    const audit = field.integratedPlateAudit.find(
      (candidate) => candidate.driverIndex === driver.index,
    );
    const manifest = field.integratedPlateSubtractorManifest.drivers.find(
      (candidate) => candidate.driverIndex === driver.index,
    );
    const reliefFace = field.coneReliefs[driver.index]?.cavityStations?.find(
      (station) => Math.abs(station.depthFromFaceM) < 1e-12,
    );
    assert.ok(tool);
    assert.ok(audit);
    assert.ok(manifest);
    assert.ok(reliefFace);
    assert.equal(tool.schemaVersion, 1);
    assert.deepEqual(tool.subtractorWhitelist, EXACT_PLATE_SUBTRACTORS);
    assert.deepEqual(manifest.actual, EXACT_PLATE_SUBTRACTORS);
    assert.ok(distance(tool.end, driver.driverFace) < 1e-12);
    assert.ok(Math.abs(tool.outerRadius - driver.outerR) < 1e-12);
    assert.ok(tool.rootRadius < tool.outerRadius);
    assert.ok(Number.isFinite(tool.openingRadius));
    assert.ok(tool.openingRadius > 0);
    assert.ok(Math.abs(tool.openingRadius - reliefFace.radiusM) < 1e-12);
    assert.ok(tool.gasketInnerRadius > tool.openingRadius);
    assert.ok(tool.gasketOuterRadius <= tool.outerRadius);
    assert.equal(audit.connected, true);
    assert.equal(audit.gasketSupported, true);
    assert.equal(audit.gasketCoverage, 1);
    assert.equal(audit.subtractorWhitelistPass, true);
    assert.deepEqual(audit.unknownSubtractors, []);
  }
}

test("historical Build 650 OS-SE NW10 request smart-adapts to one sealed printable horn assembly", () => {
  const state = releasedState();
  const result = engine.solve(state);
  const plan = result.ev.plan;
  assert.equal(result.infeasible, false);
  assert.equal(result.S.mouthW, 33);
  assert.equal(result.S.twoXO, 410);
  assert.equal(result.S.tapCRW, 9);
  assert.equal(plan.st.profileLaw.family, "osse");
  assert.equal(plan.st.profileHash, "pl1-1fff5103");
  assert.equal(plan.drivers.length, 2);
  assert.equal(plan.allPorts.length, 4);
  assert.equal(plan.mountEnvelopeComplete, true);
  assert.equal(plan.driverCdFlangeComplete, true);
  assert.ok(plan.mountEnvelopeClearance >= plan.mountEnvelopeRequiredClearance);
  assert.ok(plan.driverCdFlangeClearance >= plan.driverCdFlangeRequired);

  const field = engine.twoWaySolidField(plan);
  const audit = engine.assemblyAudit(plan, field);
  assert.equal(audit.pass, true);
  assert.equal(audit.wallBesideCut, true);
  assert.equal(
    audit.rows.find((row) => row.name === "solid web remains beside every tap")
      ?.pass,
    true,
  );
  assert.equal(
    audit.rows.find((row) => (
      row.name === "complete driver bearing and bolt lands are retained"
    ))?.pass,
    true,
  );
  assert.equal(
    audit.rows.find((row) => (
      row.name === "tap cutters connect horn air to front chambers"
    ))?.pass,
    true,
  );
  assertExactPlateManifest(plan, field);
  assertMountRecord(plan, field);
});

test("six Dayton cells retain one plate/horn solid and twelve symmetric lumens", () => {
  const result = engine.solve(daytonSixState());
  const plan = result.ev.plan;
  assert.equal(result.infeasible, false);
  assert.equal(result.S.nW, 6);
  assert.equal(plan.drivers.length, 6);
  assert.equal(plan.driverCells.length, 6);
  assert.equal(plan.allPorts.length, 12);
  assert.equal(plan.mountEnvelopeComplete, true);
  assert.ok(plan.minDriverGap > 0);
  assert.ok(plan.pairWeb > plan.minWeb);
  assert.equal(plan.panelBoltForeignGasketPass, true);
  assert.ok(
    plan.panelBoltForeignGasketClearance
      >= plan.panelBoltForeignGasketRequired,
  );
  assert.ok(plan.panelBoltClearance >= plan.panelBoltRequired);
  assert.ok(
    plan.drivers.every((driver) => (
      Math.abs(driver.boltPhase - plan.panelBoltPhase) < 1e-12
    )),
    "the final gasket-safe bolt phase is not shared by every driver",
  );

  const field = engine.twoWaySolidField(plan);
  assert.ok(field.retentionTools.every((tools) => tools.length === 0));
  assert.equal(field.coneReliefs.length, 6);
  assert.equal(field.tapTools.flat().length, 12);
  assert.equal(field.boltTools.flat().length, 24);
  assert.equal(engine.assemblyAudit(plan, field).pass, true);
  assertExactPlateManifest(plan, field);
  assertMountRecord(plan, field);

  for (const driver of plan.drivers) {
    assert.equal(driver.ports.length, 2);
    assert.ok(
      Math.abs(dot(unit(driver.ports[0].flow), unit(driver.ports[1].flow)))
        > 1 - 2e-5,
      `driver ${driver.index} tap axes are not parallel`,
    );
  }

  for (let index = 0; index < 3; index += 1) {
    const driver = plan.drivers[index];
    const opposed = plan.drivers[index + 3];
    assert.ok(distance(reflectOpposed(driver.surface), opposed.surface) < 1e-9);
    assert.ok(distance(reflectOpposed(driver.mountN), opposed.mountN) < 1e-9);
    assert.ok(distance(reflectOpposed(driver.flow), opposed.flow) < 1e-9);
    for (const port of driver.ports) {
      assert.ok(
        Math.min(...opposed.ports.map((candidate) => (
          distance(reflectOpposed(port.center), candidate.center)
        ))) < 1e-8,
        `driver ${index} tap lacks an opposed partner`,
      );
    }
  }

  for (let index = 0; index < plan.drivers.length; index += 1) {
    const current = plan.drivers[index];
    const next = plan.drivers[(index + 1) % plan.drivers.length];
    assert.ok(
      dot(current.flow, next.flow) > 0.25,
      `driver meridian orientation flips between ${index} and ${next.index}`,
    );
  }
  for (let index = 1; index < plan.st.pts.length; index += 1) {
    const previous = plan.st.pts[index - 1];
    const current = plan.st.pts[index];
    assert.ok(current.x > previous.x);
    assert.ok(current.a >= previous.a - 1e-12);
    assert.ok(current.b >= previous.b - 1e-12);
  }
});

test("an unknown integrated-plate subtractor fails manufacturing admission", () => {
  const plan = engine.twoWayPlan(releasedState());
  const field = engine.twoWaySolidField(plan);
  const poisoned = Object.assign(
    (point) => field(point),
    field,
    {
      integratedPlateAudit: field.integratedPlateAudit.map(
        (record, index) => index === 0
          ? {
            ...record,
            subtractorWhitelistPass: false,
            unknownSubtractors: ["arbitrary-preview-fallback"],
          }
          : record,
      ),
    },
  );
  const audit = engine.assemblyAudit(plan, poisoned);
  assert.equal(audit.pass, false);
  assert.equal(audit.integratedPlateWhitelist, false);
  assert.equal(
    audit.rows.find((row) => (
      row.name === "integrated plate subtractors match the canonical whitelist"
    ))?.pass,
    false,
  );
});

test("preview consumes canonical radii and has no non-corner fallback plate", () => {
  const specSource = namedFunction(shell, "mountInterfaceSpec");
  const panelSource = namedFunction(shell, "panelRelievedLand");
  assert.match(
    specSource,
    /integratedPlateTools=visualTools&&/,
  );
  assert.match(
    specSource,
    /integratedPlateSubtractorManifest/,
  );
  assert.match(
    specSource,
    /integratedPanel&&integratedPlateToolMatches\s*\?\+integratedPlateTool\.outerRadius/,
  );
  assert.match(
    specSource,
    /integratedPanel&&integratedPlateToolMatches\s*\?\+integratedPlateTool\.openingRadius/,
  );
  assert.match(
    specSource,
    /integratedPanel&&integratedPlateToolMatches\s*\?\+integratedPlateTool\.gasketInnerRadius/,
  );
  assert.doesNotMatch(specSource, /frameR\s*\+\s*0\.006/);
  assert.match(
    panelSource,
    /if\(spec\.cornerPlateDeclared\)\s*return panelCornerRelievedLand/,
  );
  assert.match(
    panelSource,
    /axisAnnularPlate\(bearingCenter,spec\.n,\s*spec\.landOuterR,openingR/,
  );
  assert.doesNotMatch(panelSource, /axisAnnularPlate\([^)]*frameR/);

  const plan = engine.twoWayPlan(releasedState());
  const refused = mountContext.mountInterfaceSpec(
    plan,
    plan.drivers[0],
    plan.S,
    {},
  );
  assert.equal(refused.integratedPanel, true);
  assert.equal(refused.integratedPlateToolComplete, false);
  assert.equal(refused.integratedPlateToolMatches, false);
  assert.equal(refused.mountPreviewComplete, false);
  assert.equal(refused.landOuterR, 0);
  assert.equal(refused.gasketInnerR, 0);
  assert.equal(refused.gasketOuterR, 0);
});
