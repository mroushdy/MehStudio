import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  engine,
  finiteTree,
  loadCases,
} from "./case-loader.mjs";
import { componentMetrics } from "./exact-mesh-diagnostics.mjs";

const canonicalCases = new Map(
  loadCases()
    .filter((candidate) => candidate.expected?.status === "valid")
    .map((candidate) => [candidate.id, candidate]),
);

const RETENTION_DIMENSIONS = Object.freeze({
  clearanceD: 0.0046,
  insertBodyEnvelopeD: 0.00638,
  insertHoleD: 0.00561,
  insertLength: 0.00470,
  insertPocketDepth: 0.00490,
  counterboreD: 0.0084,
  counterboreDepth: 0.0032,
  blindAcousticCap: 0.0024,
  minWeb: 0.0032,
  bossR: 0.0074,
  bossDepth: 0.0060,
});

function fixtureState(id, construction) {
  const fixture = canonicalCases.get(id);
  assert.ok(fixture, `${id} fixture is missing`);
  return {
    ...fixture.state,
    driverCellConstruction: construction,
  };
}

function solvedPlan(id, construction) {
  const solved = engine.solve(fixtureState(id, construction));
  assert.equal(
    solved.infeasible,
    false,
    `${id}/${construction} is infeasible: ${
      (solved.ev?.rows || [])
        .filter((row) => row.st === "fail")
        .map((row) => row.name)
        .join(", ")
    }`,
  );
  return solved.ev.plan;
}

function close(actual, expected, tolerance, label) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`,
  );
}

function midpoint(a, b) {
  return a.map((value, axis) => (value + b[axis]) / 2);
}

function dot(a, b) {
  return a.reduce((sum, value, axis) => sum + value * b[axis], 0);
}

function subtract(a, b) {
  return a.map((value, axis) => value - b[axis]);
}

function scale(a, scalar) {
  return a.map((value) => value * scalar);
}

function add(a, b) {
  return a.map((value, axis) => value + b[axis]);
}

function length(a) {
  return Math.hypot(...a);
}

function apertureDistance(x, y, port) {
  if (port.shape === "round") return Math.hypot(x, y) - port.sb;
  if (port.shape === "oval") {
    return (
      Math.hypot(x / Math.max(port.sa, 1e-9), y / Math.max(port.sb, 1e-9)) - 1
    ) * Math.min(port.sa, port.sb);
  }
  const core = Math.max(0, port.sa - port.sb);
  const dx = Math.max(Math.abs(x) - core, 0);
  return Math.hypot(dx, y) - port.sb;
}

function cylinderDistance(point, a, b, radius) {
  const ab = subtract(b, a);
  const span = Math.max(length(ab), 1e-12);
  const axis = scale(ab, 1 / span);
  const fromA = subtract(point, a);
  const axial = dot(fromA, axis);
  const radial = length(subtract(fromA, scale(axis, axial))) - radius;
  return Math.max(radial, -axial, axial - span);
}

function minimumToolClearances(plan, driverRetention, tool) {
  const driver = plan.drivers[driverRetention.index];
  const dimensions = plan.retention.dimensions;
  let tap = Infinity;
  for (const port of driver.ports) {
    const delta = subtract(tool.acousticSurfaceCenter, port.center);
    tap = Math.min(
      tap,
      apertureDistance(
        dot(delta, port.flow),
        dot(delta, port.cross),
        port,
      ) - dimensions.insertBodyEnvelopeD / 2,
    );
  }

  const driverPocketRadius = (
    plan.family === "panel"
      ? plan.frame.panelPocketD
      : plan.frame.insertPocketD
  ) / 2;
  let wooferBcd = Infinity;
  for (let index = 0; index < plan.frame.boltN; index += 1) {
    const phase = (
      (driver.boltPhase || 0)
      + index * 2 * Math.PI / plan.frame.boltN
    );
    const boltOffset = add(
      scale(driver.flow, Math.cos(phase) * plan.frame.bcd / 2),
      scale(driver.cross, Math.sin(phase) * plan.frame.bcd / 2),
    );
    const retentionOffset = subtract(
      tool.acousticSurfaceCenter,
      driver.surface,
    );
    const dx = dot(retentionOffset, driver.flow) - dot(boltOffset, driver.flow);
    const dy = dot(retentionOffset, driver.cross) - dot(boltOffset, driver.cross);
    wooferBcd = Math.min(
      wooferBcd,
      Math.hypot(dx, dy) - tool.counterboreR - driverPocketRadius,
    );
  }

  let compressionDriver = Infinity;
  for (let step = 0; step <= 24; step += 1) {
    const point = tool.bossA.map(
      (value, axis) => (
        value + (tool.bossB[axis] - value) * step / 24
      ),
    );
    compressionDriver = Math.min(
      compressionDriver,
      cylinderDistance(
        point,
        [-0.014, 0, 0],
        [0.006, 0, 0],
        plan.cdFlangeR,
      ) - tool.bossR,
    );
  }

  let sector = null;
  if (plan.family === "radial" && plan.drivers.length > 1) {
    const radial = [0, driver.mountN[1], driver.mountN[2]];
    const tangent = [0, -radial[2], radial[1]];
    const radialCoordinate = dot(tool.center, radial);
    const tangentCoordinate = dot(tool.center, tangent);
    const sectorRoom = (
      radialCoordinate * Math.tan(Math.PI / plan.drivers.length)
      - Math.abs(tangentCoordinate)
      - Math.max(plan.gasketGap, 0.0008) / 2
    );
    sector = sectorRoom - tool.bossR;
  }
  return { tap, wooferBcd, compressionDriver, sector };
}

function assertVector(value, label) {
  assert.ok(Array.isArray(value), `${label} is not an array`);
  assert.equal(value.length, 3, `${label} is not a 3-vector`);
  assert.ok(value.every(Number.isFinite), `${label} contains a non-finite coordinate`);
}

function assertRetentionDimensions(retention, label) {
  assert.equal(retention.fastener, "M4 × 0.7", `${label} fastener changed`);
  assert.equal(retention.countPerCartridge, 2, `${label} screw count changed`);
  assert.deepEqual(
    finiteTree(retention.dimensions, `${label}.dimensions`),
    [],
    `${label} has a non-finite retention dimension`,
  );
  for (const [name, expected] of Object.entries(RETENTION_DIMENSIONS)) {
    close(
      retention.dimensions?.[name],
      expected,
      1e-12,
      `${label}.dimensions.${name}`,
    );
  }
  assert.ok(
    retention.dimensions.blindAcousticCap >= 0.0024,
    `${label} acoustic-side blind cap is below 2.4 mm`,
  );
  assert.ok(
    retention.dimensions.insertPocketDepth >=
      retention.dimensions.insertLength,
    `${label} insert pocket does not contain the published insert length`,
  );
  assert.ok(
    retention.dimensions.insertHoleD <
      retention.dimensions.insertBodyEnvelopeD,
    `${label} confuses the installation hole with the over-knurl envelope`,
  );
}

function assertToolContract(plan, driverRetention, tool, toolIndex, label) {
  const toolLabel = `${label}.driver${driverRetention.index}.tool${toolIndex}`;
  for (const name of [
    "center",
    "axis",
    "hornPocketA",
    "hornPocketB",
    "moduleBoreA",
    "moduleBoreB",
    "counterboreA",
    "counterboreB",
    "bossA",
    "bossB",
  ]) {
    assertVector(tool[name], `${toolLabel}.${name}`);
  }
  assert.deepEqual(
    finiteTree(tool, toolLabel),
    [],
    `${toolLabel} contains non-finite numeric metadata`,
  );

  const minimumWeb = plan.retention.dimensions.minWeb;
  assert.ok(
    tool.blindCap + 1e-12 >= plan.retention.dimensions.blindAcousticCap,
    `${toolLabel} blind cap ${tool.blindCap} is below 2.4 mm`,
  );
  const clearances = minimumToolClearances(plan, driverRetention, tool);
  for (const [name, clearance] of Object.entries(clearances)) {
    if (clearance === null) continue;
    assert.ok(
      Number.isFinite(clearance),
      `${toolLabel} ${name} clearance is not finite`,
    );
    assert.ok(
      clearance + 1e-12 >= minimumWeb,
      `${toolLabel} ${name} clearance ${clearance} is below ${minimumWeb}`,
    );
  }

  assert.ok(tool.ownership, `${toolLabel} omits cutter ownership`);
  const ownershipText = JSON.stringify(tool.ownership).toLowerCase();
  assert.match(ownershipText, /horn/, `${toolLabel} omits horn ownership`);
  assert.match(
    ownershipText,
    /module|cartridge/,
    `${toolLabel} omits cartridge/module ownership`,
  );
}

test("integrated panel and radial cells contain no cartridge retention", () => {
  for (const id of ["P01", "R02"]) {
    const plan = solvedPlan(id, "integrated");
    assert.ok(plan.retention, `${id} omits the retention contract`);
    assert.equal(plan.retention.active, false, `${id} activates cartridge screws`);
    assert.equal(plan.retention.ok, true, `${id} integrated retention is not neutral`);
    assert.equal(plan.retention.code, null, `${id} integrated retention has an error`);
    assert.equal(
      (plan.retention.drivers || []).flatMap((driver) => driver.tools || []).length,
      0,
      `${id} integrated construction owns retention tools`,
    );
    const field = engine.twoWaySolidField(plan, false);
    assert.deepEqual(
      (field.retentionTools || []).flat(),
      [],
      `${id} integrated SDF owns retention cutters`,
    );
  }
});

test("panel and radial cartridges solve exactly two finite M4 tools per driver", () => {
  for (const id of ["P01", "R03"]) {
    const plan = solvedPlan(id, "cartridge");
    const retention = plan.retention;
    const label = `${id}/cartridge`;
    assert.equal(retention.active, true, `${label} retention is inactive`);
    assert.equal(retention.ok, true, `${label} retention failed: ${retention.code}`);
    assert.equal(retention.code, null, `${label} retains a refusal code`);
    assertRetentionDimensions(retention, label);
    assert.equal(
      retention.drivers.length,
      plan.drivers.length,
      `${label} has the wrong per-driver layout count`,
    );
    for (const [driverIndex, driverRetention] of retention.drivers.entries()) {
      assert.equal(driverRetention.index, driverIndex);
      assert.ok(Number.isFinite(driverRetention.phase));
      assert.ok(Number.isFinite(driverRetention.rootRadius));
      assert.equal(
        driverRetention.tools.length,
        2,
        `${label} driver ${driverIndex} does not have exactly two tools`,
      );
      driverRetention.tools.forEach((tool, toolIndex) => {
        assertToolContract(plan, driverRetention, tool, toolIndex, label);
      });
    }
  }
});

test("horn and cartridge fields share retention metadata and own their voids", () => {
  for (const id of ["P01", "R03"]) {
    const plan = solvedPlan(id, "cartridge");
    const hornField = engine.twoWaySolidField(plan, true, 0);
    assert.deepEqual(
      hornField.retentionTools,
      plan.retention.drivers.map((driver) => driver.tools),
      `${id} horn field does not mirror the solved retention tools`,
    );
    for (const driverRetention of plan.retention.drivers) {
      const moduleField = engine.twoWaySolidField(
        plan,
        true,
        driverRetention.index + 1,
      );
      assert.deepEqual(
        moduleField.retentionTools,
        hornField.retentionTools,
        `${id} cartridge ${driverRetention.index} changed shared retention tools`,
      );
      for (const [toolIndex, tool] of driverRetention.tools.entries()) {
        const hornProbe = midpoint(tool.hornPocketA, tool.hornPocketB);
        const boreProbe = midpoint(tool.moduleBoreA, tool.moduleBoreB);
        const counterboreProbe = midpoint(tool.counterboreA, tool.counterboreB);
        assert.ok(
          hornField(hornProbe) > 0,
          `${id} horn retention pocket ${driverRetention.index}/${toolIndex} is solid`,
        );
        assert.ok(
          moduleField(boreProbe) > 0,
          `${id} cartridge bore ${driverRetention.index}/${toolIndex} is solid`,
        );
        assert.ok(
          moduleField(counterboreProbe) > 0,
          `${id} cartridge counterbore ${driverRetention.index}/${toolIndex} is solid`,
        );
      }
    }
  }
});

test("the 4.6 mm M4 retention bore remains supported by an exact detachable cartridge mesh", {
  timeout: 180_000,
}, () => {
  engine.clearTwoWayMeshCache();
  const solved = engine.solve(fixtureState("P03", "cartridge"));
  assert.equal(solved.infeasible, false);
  assert.equal(solved.ev.plan.retention.active, true);
  assert.equal(
    solved.ev.plan.retention.dimensions.clearanceD,
    RETENTION_DIMENSIONS.clearanceD,
  );

  const exact = engine.twoWayGeometry(solved.S, "test");
  assert.equal(exact.budget.step, 0.0025);
  assert.equal(exact.mesh.detachable, true);
  assert.equal(exact.parts.length, 3);
  assert.equal(
    exact.plan.drivers.every((driver) => driver.cornerPlate?.active),
    true,
    "P03 no longer exercises the folded corner-shell audit",
  );
  assert.deepEqual(
    exact.field.tapTools.flat().map((tool) => tool.geometryMode),
    ["straight-cone-normal", "straight-cone-normal"],
  );
  assert.equal(
    exact.field.integratedPlateTools.length,
    0,
    "a detachable cartridge unexpectedly received an integrated plate",
  );
  const componentFacts = exact.rawComponentCount === 3
    ? []
    : exact.parts.map((part, partIndex) => ({
      partIndex,
      components: engine.splitMeshComponents(part)
        .map((component) => componentMetrics(component)),
    }));
  assert.equal(exact.rawComponentCount, 3, JSON.stringify({
    rawComponentCount: exact.rawComponentCount,
    partDiagnostics: exact.partDiagnostics,
    componentFacts,
  }));
  assert.deepEqual(
    exact.partDiagnostics.map((diagnostic) => diagnostic.componentCount),
    [1, 1, 1],
  );
  for (const [index, part] of exact.parts.entries()) {
    const audit = engine.meshAudit(part);
    assert.equal(audit.components, 1, `exact cartridge part ${index} is disconnected`);
    assert.equal(audit.badEdges, 0, `exact cartridge part ${index} is open`);
    assert.equal(audit.badOrientation, 0);
    assert.equal(audit.degenerate, 0);
    assert.equal(audit.duplicateFaces, 0);
    assert.equal(audit.nonFinite, 0);
    assert.equal(audit.orientationConflict, 0);
  }
  const assembly = engine.assemblyAudit(exact.plan, exact.field);
  assert.equal(assembly.cutterContinuous, true);
  assert.equal(assembly.wallBesideCut, true);
  assert.equal(
    assembly.rows.find((row) =>
      row.name === "solid web remains beside every tap")?.pass,
    true,
  );
  assert.equal(assembly.driverCellRootPass, true);
  assert.deepEqual(
    assembly.driverCellRootDiagnostics.map((diagnostic) => ({
      active: diagnostic.active,
      pass: diagnostic.pass,
      rootBodyRMm: +(diagnostic.rootRadius * 1000).toFixed(6),
      reliefWebMm: +(diagnostic.reliefWeb * 1000).toFixed(6),
      minimumCounterboreOuterLigamentMm:
        +(diagnostic.minimumCounterboreOuterLigament * 1000).toFixed(6),
    })),
    [
      {
        active: true,
        pass: true,
        rootBodyRMm: 64.007681,
        reliefWebMm: 8.010287,
        minimumCounterboreOuterLigamentMm: 3.2,
      },
      {
        active: true,
        pass: true,
        rootBodyRMm: 64.007681,
        reliefWebMm: 8.010287,
        minimumCounterboreOuterLigamentMm: 3.2,
      },
    ],
  );
  assert.equal(
    assembly.rows.find((row) =>
      row.name === "detachable driver-cell roots retain declared post-cutter ligaments")?.pass,
    true,
  );
  assert.equal(assembly.driverFastenerPocketPass, true);
  assert.deepEqual(
    assembly.driverFastenerPocketDiagnostics.map((diagnostic) => ({
      active: diagnostic.active,
      pass: diagnostic.pass,
      minimumOuterLigamentMm:
        +(diagnostic.minimumOuterLigament * 1000).toFixed(6),
      depthsMm: diagnostic.records.map((record) =>
        +(record.depth * 1000).toFixed(6)),
    })),
    [
      {
        active: true,
        pass: true,
        minimumOuterLigamentMm: 5.4,
        depthsMm: [8, 8, 8, 8],
      },
      {
        active: true,
        pass: true,
        minimumOuterLigamentMm: 5.4,
        depthsMm: [8, 8, 8, 8],
      },
    ],
  );
  assert.equal(
    assembly.rows.find((row) =>
      row.name === "detachable driver-fastener pockets retain taper-side outer web")?.pass,
    true,
  );
  assert.equal(
    assembly.rows.find((row) =>
      row.name === "retention dimensions and ownership are represented in the exact solid")?.pass,
    true,
  );
  engine.clearTwoWayMeshCache();
});

test("manufacturing admission fails closed when a cartridge fastener loses taper-side web", () => {
  const plan = solvedPlan("P03", "cartridge");
  const canonical = engine.twoWaySolidField(plan, true);
  const field = (point) => canonical(point);
  Object.assign(field, canonical);
  field.driverFastenerPocketDiagnostics =
    canonical.driverFastenerPocketDiagnostics.map((diagnostic, index) => {
      if (index !== 0) return diagnostic;
      return {
        ...diagnostic,
        minimumOuterLigament:
          diagnostic.requiredOuterLigament - 0.000001,
        records: diagnostic.records.map((record, recordIndex) =>
          recordIndex === 0 ? { ...record, pass: false } : record),
        pass: false,
      };
    });

  const audit = engine.assemblyAudit(plan, field);
  assert.equal(audit.driverFastenerPocketPass, false);
  assert.equal(
    audit.rows.find((row) =>
      row.name === "detachable driver-fastener pockets retain taper-side outer web")?.pass,
    false,
  );

  const source = readFileSync(
    new URL("../../twoway-core.js", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /if\(!admission\.driverFastenerPocketPass\)\s*throw meshError\('DRIVER_FASTENER_TAPER_WEB_INSUFFICIENT'/,
  );
});

test("radial cartridge driver faces remain complete outside the horn shell", () => {
  const plan = solvedPlan("R03", "cartridge");
  assert.equal(plan.family, "radial");
  assert.ok(
    Number.isFinite(plan.radialFaceClearance),
    "R03 omits the full radial-face clearance diagnostic",
  );
  assert.ok(
    plan.radialFaceClearance >= 0,
    `R03 radial face intersects the horn by ${(-plan.radialFaceClearance * 1000).toFixed(2)} mm`,
  );
  assert.equal(plan.radialFaceCoverage, 1, "R03 dense face diagnostic is incomplete");
  assert.ok(
    plan.radialChamberClearance >= plan.radialChamberRequiredClearance,
    "R03 volume-derived chamber is clipped by the horn shell",
  );
  assert.equal(
    plan.radialChamberCoverage,
    1,
    "R03 dense chamber diagnostic is incomplete",
  );
  close(
    plan.radialPhysicalChamberVolume,
    plan.chamberV,
    1e-12,
    "R03 generated radial chamber volume",
  );

  for (const driver of plan.drivers) {
    const moduleField = engine.twoWaySolidField(
      plan,
      true,
      driver.index + 1,
    );
    const inward = scale(driver.mountN, -Math.max(0.001, driver.flangeT * 0.5));
    const face = add(driver.driverFace, inward);
    const probeRadius = driver.outerR - Math.max(0.001, plan.minWeb * 0.35);
    let solid = 0;
    const samples = 360;
    for (let index = 0; index < samples; index += 1) {
      const angle = index * 2 * Math.PI / samples;
      const point = add(
        face,
        add(
          scale(driver.flow, Math.cos(angle) * probeRadius),
          scale(driver.cross, Math.sin(angle) * probeRadius),
        ),
      );
      if (moduleField(point) < -1e-5) solid += 1;
    }
    assert.ok(
      solid >= samples * 0.98,
      `R03 cartridge ${driver.index + 1} retains only ${solid}/${samples} `
        + "samples around its driver-bearing face",
    );
  }
});

test("manual radial reach remains authoritative and refuses a clipped face", () => {
  const state = {
    ...fixtureState("R03", "cartridge"),
    adapterReachMode: "manual",
    adapterReach: 35,
  };
  const plan = engine.twoWayPlan(state);
  close(plan.adapterReach, 0.035, 1e-12, "manual radial reach");
  assert.ok(
    plan.radialFaceClearance < plan.radialFaceRequiredClearance,
    "35 mm manual witness unexpectedly clears the complete radial face",
  );

  const solved = engine.solve(state);
  assert.equal(
    solved.S.adapterReach,
    35,
    "Smart Adapt changed an authoritative manual radial reach",
  );
  assert.equal(solved.infeasible, true, "clipped manual cartridge was admitted");
  assert.ok(
    solved.ev.rows.some(
      (row) =>
        row.st === "fail"
        && row.code === "RADIAL_CARTRIDGE_BEARING_FACE_INCOMPLETE",
    ),
    "clipped manual cartridge omitted the stable bearing-face refusal code",
  );
});

test("an impossible retention layout refuses before mesh budgeting or allocation", () => {
  const state = {
    /* Moving the Hinson tap station inward consumes the legal clamp annulus.
       Build 649 also correctly refuses that station below its acoustic/path
       interval; retention must still be the pre-allocation mesh refusal. */
    ...fixtureState("P01", "cartridge"),
    mountRing: "ring",
    tapBasis: "manual",
    tapStationW: 45,
    tapAreaW: 25,
    tapSlotL: 0,
    tapSlotW: 0,
    tapCRW: 8,
  };
  const plan = engine.twoWayPlan(state);
  assert.equal(plan.retention.active, true);
  assert.equal(plan.retention.ok, false);
  assert.equal(plan.retention.code, "CARTRIDGE_RETENTION_NO_LAYOUT");
  const evaluated = engine.evaluate2way(state);
  const failures = evaluated.rows.filter((row) => row.st === "fail");
  const failureKeys = failures.map((row) => row.code || row.name);
  assert.ok(
    failureKeys.includes("Tap station quarter-wave margin"),
    "negative witness lost its path refusal",
  );
  assert.ok(
    failureKeys.includes("CARTRIDGE_RETENTION_NO_LAYOUT"),
    "negative witness lost its retention refusal",
  );
  assert.equal(
    failureKeys.at(-1),
    "CARTRIDGE_RETENTION_NO_LAYOUT",
    "retention must remain the terminal pre-allocation refusal",
  );
  assert.throws(
    () => engine.twoWayMeshPreflight(state, "preview"),
    (error) => {
      assert.equal(error?.code, "CARTRIDGE_RETENTION_NO_LAYOUT");
      assert.equal(
        error?.details?.budget,
        undefined,
        "retention refusal happened after mesh budgeting",
      );
      return true;
    },
  );
});
