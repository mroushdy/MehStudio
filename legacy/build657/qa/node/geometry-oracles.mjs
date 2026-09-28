import crypto from "node:crypto";
import { finiteTree } from "./case-loader.mjs";

const DEG = Math.PI / 180;

export function createChecks(label) {
  const errors = [];
  const warnings = [];
  let count = 0;
  return {
    errors,
    warnings,
    get count() {
      return count;
    },
    check(condition, message) {
      count += 1;
      if (!condition) errors.push(`${label}: ${message}`);
    },
    warn(condition, message) {
      count += 1;
      if (!condition) warnings.push(`${label}: ${message}`);
    }
  };
}

function near(actual, expected, tolerance) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function length(vector) {
  return Math.hypot(...vector);
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function multiply(vector, scalar) {
  return vector.map((value) => value * scalar);
}

function angle(a, b) {
  const denominator = Math.max(1e-15, length(a) * length(b));
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / denominator)));
}

function apertureArea(port) {
  if (port.shape === "round") return Math.PI * port.sa * port.sa;
  if (port.shape === "oval") return Math.PI * port.sa * port.sb;
  return 4 * port.sa * port.sb - (4 - Math.PI) * port.sb * port.sb;
}

function expectedComponents(state) {
  return state.mountRing === "ring" ? state.nW + 1 : 1;
}

function meshHash(engine, mesh) {
  const hash = crypto.createHash("sha256");
  const point = [0, 0, 0];
  const triangle = [0, 0, 0];
  const coordinateBuffer = Buffer.allocUnsafe(8);
  const triangleBuffer = Buffer.allocUnsafe(12);
  for (let index = 0; index < engine.meshVertexCount(mesh); index += 1) {
    engine.meshVertex(mesh, index, point);
    for (const coordinate of point) {
      coordinateBuffer.writeDoubleLE(coordinate);
      hash.update(coordinateBuffer);
    }
  }
  for (let index = 0; index < engine.meshTriangleCount(mesh); index += 1) {
    engine.meshTriangle(mesh, index, triangle);
    triangleBuffer.writeUInt32LE(triangle[0], 0);
    triangleBuffer.writeUInt32LE(triangle[1], 4);
    triangleBuffer.writeUInt32LE(triangle[2], 8);
    hash.update(triangleBuffer);
  }
  return hash.digest("hex");
}

function boundingBox(engine, mesh) {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  const point = [0, 0, 0];
  for (let index = 0; index < engine.meshVertexCount(mesh); index += 1) {
    engine.meshVertex(mesh, index, point);
    for (let axis = 0; axis < 3; axis += 1) {
      low[axis] = Math.min(low[axis], point[axis]);
      high[axis] = Math.max(high[axis], point[axis]);
    }
  }
  return { low, high };
}

function meshHasFiniteTopology(engine, mesh) {
  const vertices = engine.meshVertexCount(mesh);
  const triangles = engine.meshTriangleCount(mesh);
  if (!Number.isInteger(vertices) || vertices < 0 ||
      !Number.isInteger(triangles) || triangles < 0) return false;
  const point = [0, 0, 0];
  const triangle = [0, 0, 0];
  for (let index = 0; index < vertices; index += 1) {
    engine.meshVertex(mesh, index, point);
    if (!point.every(Number.isFinite)) return false;
  }
  for (let index = 0; index < triangles; index += 1) {
    engine.meshTriangle(mesh, index, triangle);
    if (!triangle.every((vertex) =>
      Number.isInteger(vertex) && vertex >= 0 && vertex < vertices)) return false;
  }
  return true;
}

function checkDocumentedPanelTapLayout(plan, testCase, checks) {
  const isDocumentedPanelPair = (
    testCase.source?.type === "build"
    && testCase.expected?.construction?.paradigm === "angular-integrated-driver-bearing-panels"
    && plan.family === "panel"
    && plan.drivers.length === 2
    && plan.np === 2
  );
  if (!isDocumentedPanelPair) return;

  const ports = plan.drivers.flatMap((driver) => driver.ports);
  const tolerance = 1e-6;
  const quadrants = new Set(
    ports
      .filter((port) => Math.abs(port.center[1]) > tolerance && Math.abs(port.center[2]) > tolerance)
      .map((port) => `${Math.sign(port.center[1])},${Math.sign(port.center[2])}`)
  );
  checks.check(
    quadrants.size === 4,
    `documented paired taps occupy ${quadrants.size}/4 front-face quadrants instead of an X/quadrant layout`
  );
  if (plan.pairLimitCode === "TAP_PAIR_SPREAD_WAVELENGTH") {
    checks.check(
      plan.pairWavelengthRatio <= 0.25 + 1e-9,
      `documented paired taps exceed the quarter-wavelength limit (${plan.pairWavelengthRatio.toFixed(4)} λ)`
    );
  } else {
    checks.check(
      plan.tapEdgeBias >= 0.7 - 1e-9,
      `documented paired taps lost seam bias (${plan.tapEdgeBias.toFixed(3)} < 0.700)`
    );
  }

  const faceGroups = new Map();
  for (const port of ports) {
    const faceId = port.faceGroupId || port.mountFaceId || "unowned";
    if (!faceGroups.has(faceId)) faceGroups.set(faceId, []);
    faceGroups.get(faceId).push(port);
  }
  for (const [faceId, facePorts] of faceGroups) {
    const reference = facePorts[0]?.cross;
    checks.check(
      Array.isArray(reference) && length(reference) > tolerance,
      `documented tap group ${faceId} has no aperture long-axis vector`
    );
    if (!Array.isArray(reference) || length(reference) <= tolerance) continue;
    for (const port of facePorts) {
      const parallel = Math.abs(dot(reference, port.cross))
        / Math.max(1e-15, length(reference) * length(port.cross));
      checks.check(
        parallel >= 1 - 1e-9,
        `documented taps on ${faceId} do not share a parallel slot axis`
      );
    }
  }

  const reflect = (vector) => [vector[0], -vector[1], -vector[2]];
  for (const port of ports) {
    const reflectedCenter = reflect(port.center);
    const partner = ports.find((candidate) =>
      candidate !== port
      && length(subtract(candidate.center, reflectedCenter)) <= tolerance
    );
    checks.check(
      Boolean(partner),
      `documented paired tap at y/z ${(port.center[1] * 1000).toFixed(1)}/${(port.center[2] * 1000).toFixed(1)} mm has no exactly opposed partner`
    );
    if (!partner) continue;

    const reflectedCross = reflect(port.cross);
    const crossParallel = Math.abs(dot(reflectedCross, partner.cross))
      / Math.max(1e-15, length(reflectedCross) * length(partner.cross));
    checks.check(
      crossParallel >= 1 - 1e-9,
      "opposed documented tap does not preserve the reflected slot axis"
    );
    checks.check(
      length(subtract(reflect(port.flow), partner.flow)) <= tolerance,
      "opposed documented tap does not preserve reflected passage flow"
    );
    checks.check(
      length(subtract(reflect(port.normal), partner.normal)) <= tolerance,
      "opposed documented tap does not preserve reflected wall normal"
    );
    checks.check(
      port.shape === partner.shape
        && near(port.sa, partner.sa, tolerance)
        && near(port.sb, partner.sb, tolerance),
      "opposed documented taps do not share the same aperture"
    );
  }
}

function checkPanelFastenerBlindness(geometry, checks) {
  const { field, plan } = geometry;
  if (!field || !plan || plan.family !== "panel") return;

  checks.check(Array.isArray(field.boltTools), "panel fastener cutter diagnostics are missing");
  if (!Array.isArray(field.boltTools)) return;
  checks.check(
    field.boltTools.length === plan.drivers.length,
    `panel fastener cutter groups ${field.boltTools.length} != driver count ${plan.drivers.length}`
  );

  const sampleStep = 0.0005;
  const solidThreshold = 0.00005;
  const minimumBlindCap = 0.002;
  for (const [driverIndex, driver] of plan.drivers.entries()) {
    const tools = field.boltTools[driverIndex];
    checks.check(
      Array.isArray(tools) && tools.length === plan.frame.boltN,
      `driver ${driverIndex + 1} exposes ${tools?.length ?? "no"} fastener cutters; expected ${plan.frame.boltN}`
    );
    if (!Array.isArray(tools)) continue;

    for (const [boltIndex, tool] of tools.entries()) {
      const phi = (driver.boltPhase || 0)
        + boltIndex * 2 * Math.PI / plan.frame.boltN;
      const offset = add(
        multiply(driver.flow, Math.cos(phi) * plan.frame.bcd / 2),
        multiply(driver.cross, Math.sin(phi) * plan.frame.bcd / 2)
      );
      const rearFace = add(driver.driverFace, offset);
      const inward = multiply(driver.mountN, -1);
      const toolLength = length(subtract(tool.b, tool.a));
      const maxProbe = Math.max(0.08, driver.panelT * 4, toolLength + 0.03);

      let pocketSeen = false;
      let solidStart = null;
      let solidEnd = null;
      let acousticAirAfterCap = false;
      for (let distance = -0.004; distance <= maxProbe + 1e-12; distance += sampleStep) {
        const value = field(add(rearFace, multiply(inward, distance)));
        if (!pocketSeen) {
          if (value > solidThreshold) pocketSeen = true;
          continue;
        }
        if (solidStart === null) {
          if (value < -solidThreshold) solidStart = distance;
          continue;
        }
        if (value < -solidThreshold) {
          solidEnd = distance;
        } else if (value > solidThreshold) {
          acousticAirAfterCap = true;
          break;
        }
      }

      const capThickness = solidStart === null
        ? 0
        : Math.max(0, (solidEnd ?? solidStart) - solidStart + sampleStep);
      checks.check(
        pocketSeen,
        `driver ${driverIndex + 1} fastener ${boltIndex + 1} has no rear-accessible pocket`
      );
      checks.check(
        capThickness >= minimumBlindCap - sampleStep * 0.25,
        `driver ${driverIndex + 1} fastener ${boltIndex + 1} breaks through the acoustic face; blind cap is ${(capThickness * 1000).toFixed(2)} mm`
      );
      checks.check(
        !acousticAirAfterCap || capThickness >= minimumBlindCap - sampleStep * 0.25,
        `driver ${driverIndex + 1} fastener ${boltIndex + 1} reaches horn air without a printable blind cap`
      );
    }
  }
}

export function checkPlan(engine, state, result, testCase, checks, options = {}) {
  const plan = result?.ev?.plan;
  checks.check(Boolean(plan), "solver did not return a two-way plan");
  if (!plan) return;

  checks.check(finiteTree(plan).length === 0, "plan contains NaN or infinite values");
  checks.check(plan.drivers.length === result.S.nW, `driver count ${plan.drivers.length} != ${result.S.nW}`);
  checks.check(
    plan.allPorts.length === result.S.nW * result.S.npW,
    `tap count ${plan.allPorts.length} != ${result.S.nW * result.S.npW}`
  );
  if (options.allowInvalid) return;

  const construction = testCase.expected?.construction;
  if (construction) {
    if (construction.paradigm === "angular-integrated-driver-bearing-panels") {
      checks.check(plan.family === "panel", "source-grounded driver-bearing panel case left the panel family");
      checks.check(result.S.style === "angular", "source-grounded driver-bearing panels are not angular");
      checks.check(result.S.mountRing === "integrated", "source-grounded driver-bearing panels became detachable modules");
    }
    if (construction.assemblyTopology === "integrated-one-piece") {
      checks.check(result.S.mountRing === "integrated", "one-piece construction is not using the integrated mount system");
      checks.check(testCase.expected?.components === 1, "one-piece construction fixture does not require exactly one component");
    }
    if (construction.driverBearingPanelMm !== undefined) {
      checks.check(
        near(plan.panelT * 1000, construction.driverBearingPanelMm, 0.1),
        "driver-bearing panel thickness differs from the source-grounded construction"
      );
    }
    if (construction.detachableDriverModules === 0) {
      checks.check(result.S.mountRing !== "ring", "fixture forbids detachable driver modules but selected a detachable ring");
    }
  }

  const provenance = testCase.expected?.provenance;
  if (provenance?.tapCad === "published") {
    checks.check(result.S.tapBasis === "published", "published tap CAD lost its published evidence basis");
  }
  if (provenance?.tapCad === "calculated") {
    checks.check(result.S.tapBasis === "model", "calculated/hybrid tap CAD is incorrectly presented as published geometry");
    checks.check(provenance.tapDimensionsPublished === false, "calculated/hybrid tap CAD must explicitly state that dimensions are not published");
  }

  checks.check(plan.minDriverGap >= 0.004 - 1e-9, `complete driver clearance ${(plan.minDriverGap * 1000).toFixed(3)} mm < 4 mm`);
  checks.check(
    plan.minMountSide >= Math.max(0.003, result.S.wallT * 0.75) - 1e-9,
    "a driver face or mounting land intrudes into the horn air path"
  );
  checks.check(
    plan.maxPortReach <= plan.frame.activeR - 0.002 + 1e-9,
    "a complete tap aperture leaves the active cone footprint"
  );
  checks.check(plan.np !== 2 || plan.pairWeb >= plan.minWeb - 1e-9, "tap-to-tap printable web is below the solved minimum");
  checks.check(plan.tapFraction <= 0.5 + 1e-9, `tap area occupies ${(plan.tapFraction * 100).toFixed(2)}% of the local HF section`);
  checks.check(
    engine.C / (4 * Math.max(0.001, plan.station)) >= plan.phaseMargin * plan.xo - 1e-9,
    "tap station exceeds its quarter-wave phase bound"
  );

  const axialStations = plan.allPorts.map((port) => port.center[0]);
  const stationSpread = Math.max(...axialStations) - Math.min(...axialStations);
  checks.check(stationSpread <= 0.0005, `common axial tap-station spread is ${(stationSpread * 1000).toFixed(3)} mm`);

  for (const driver of plan.drivers) {
    if (plan.family === "panel") {
      checks.check(angle(driver.mountN, driver.wallN) <= 0.5 * DEG + 1e-9, "panel driver axis is not normal to its local wall");
    } else {
      checks.check(Math.abs(driver.mountN[0]) <= Math.sin(0.5 * DEG) + 1e-9, "radial driver axis is not perpendicular to the HF axis");
      const towardHub = driver.mountN.map((value) => -value);
      const faceToWall = subtract(driver.surface, driver.driverFace);
      checks.check(angle(towardHub, faceToWall) <= 0.5 * DEG + 1e-9, "radial driver does not aim toward its hub");
    }
    for (const port of driver.ports) {
      const calculated = apertureArea(port);
      checks.check(
        Math.abs(calculated - port.area) / Math.max(1e-12, port.area) <= 0.005,
        `analytic ${port.shape} aperture area differs from declared area by more than 0.5%`
      );
    }
  }

  if (plan.family === "radial" && plan.drivers.length > 2) {
    const phis = plan.drivers.map((driver) => {
      const value = driver.phi % (2 * Math.PI);
      return value < 0 ? value + 2 * Math.PI : value;
    }).sort((a, b) => a - b);
    const ideal = 2 * Math.PI / phis.length;
    const errors = phis.map((phi, index) => {
      const next = index === phis.length - 1 ? phis[0] + 2 * Math.PI : phis[index + 1];
      return Math.abs(next - phi - ideal);
    });
    checks.check(Math.max(...errors) <= 0.25 * DEG + 1e-9, "radial angular spacing error exceeds 0.25 degrees");
  }

  checkDocumentedPanelTapLayout(plan, testCase, checks);

  const measurements = testCase.expected?.measurements;
  if (measurements) {
    if (measurements.stationMm !== undefined) {
      checks.check(near(plan.station * 1000, measurements.stationMm, measurements.stationToleranceMm), "locked tap station drifted");
    }
    if (measurements.totalAreaCm2 !== undefined) {
      checks.check(near(plan.totalArea * 1e4, measurements.totalAreaCm2, measurements.areaToleranceCm2), "locked tap area drifted");
    }
    if (measurements.slotLengthMm !== undefined) {
      checks.check(near(plan.port.sa * 2000, measurements.slotLengthMm, measurements.slotToleranceMm), "locked slot length drifted");
      checks.check(near(plan.port.sb * 2000, measurements.slotWidthMm, measurements.slotToleranceMm), "locked slot width drifted");
      if (measurements.totalAreaCm2 !== undefined) {
        const sa = measurements.slotLengthMm / 2000;
        const sb = measurements.slotWidthMm / 2000;
        const expectedAreaFromSlotsCm2 = (4 * sa * sb - (4 - Math.PI) * sb * sb) * result.S.npW * 1e4;
        checks.check(
          near(expectedAreaFromSlotsCm2, measurements.totalAreaCm2, measurements.areaToleranceCm2),
          "fixture total tap area is inconsistent with its slot dimensions and entries-per-woofer count"
        );
      }
    }
    if (measurements.passageMm !== undefined) {
      checks.check(near(plan.passage * 1000, measurements.passageMm, measurements.passageToleranceMm), "manual passage length drifted");
    }
    if (measurements.chamberCm3 !== undefined) {
      checks.check(false, "ambiguous chamberCm3 oracle is forbidden; declare frontChamberPerWooferCm3 and/or frontChamberTotalCm3");
    }
    if (measurements.frontChamberPerWooferCm3 !== undefined) {
      const tolerance = measurements.frontChamberToleranceCm3;
      checks.check(
        near(plan.chamberV * 1e6, measurements.frontChamberPerWooferCm3, tolerance),
        "locked per-woofer front-chamber volume drifted"
      );
      if (result.S.tapVtcW !== undefined) {
        checks.check(
          near(+result.S.tapVtcW, measurements.frontChamberPerWooferCm3, tolerance),
          "UI front-chamber / woofer value drifted"
        );
      }
    }
    if (measurements.frontChamberTotalCm3 !== undefined) {
      const tolerance = measurements.frontChamberToleranceCm3;
      const portedDriverCount = measurements.frontChamberPortedDriverCount ?? result.S.nW;
      checks.check(
        Number.isInteger(portedDriverCount) && portedDriverCount > 0,
        "front-chamber total requires an explicit positive ported-driver count"
      );
      checks.check(
        portedDriverCount === result.S.nW,
        "front-chamber ported-driver count differs from the solved two-way woofer count"
      );
      checks.check(
        near(plan.chamberV * portedDriverCount * 1e6, measurements.frontChamberTotalCm3, tolerance),
        "locked total front-chamber volume across all ported woofers drifted"
      );
      if (measurements.frontChamberPerWooferCm3 !== undefined) {
        checks.check(
          near(
            measurements.frontChamberPerWooferCm3 * portedDriverCount,
            measurements.frontChamberTotalCm3,
            tolerance
          ),
          "front-chamber total is inconsistent with the declared per-woofer value and woofer count"
        );
      }
    }
    if (measurements.panelMm !== undefined) {
      checks.check(near(plan.panelT * 1000, measurements.panelMm, measurements.panelToleranceMm), "locked mounting-panel thickness drifted");
    }
    if (measurements.minimumEdgeBias !== undefined) {
      checks.check(plan.tapEdgeBias >= measurements.minimumEdgeBias - 1e-9, "published edge-biased tap placement drifted");
    }
    if (measurements.maximumPairWavelengthRatio !== undefined) {
      checks.check(
        plan.pairWavelengthRatio <= measurements.maximumPairWavelengthRatio + 1e-9,
        "published tap pair exceeds its declared wavelength-ratio bound"
      );
    }
  }
}

export function checkGeometry(engine, state, geometry, testCase, checks, options = {}) {
  const mesh = geometry?.mesh;
  checks.check(Boolean(mesh), "geometry builder returned no mesh");
  if (!mesh) return null;
  const vertexCount = engine.meshVertexCount(mesh);
  const triangleCount = engine.meshTriangleCount(mesh);

  const expected = testCase.expected?.components ?? expectedComponents(state);
  const rawComponents = geometry.rawComponentCount ?? mesh.rawComponentCount;
  const discarded = geometry.discardedComponents ?? mesh.discardedComponents;
  const diagnostics = geometry.partDiagnostics ?? mesh.partDiagnostics;

  checks.check(Number.isFinite(rawComponents), "raw component diagnostics are missing; QA refuses to self-certify filtered geometry");
  checks.check(Number.isFinite(discarded), "discarded-component diagnostics are missing; QA refuses to self-certify filtered geometry");
  checks.check(rawComponents === expected, `raw mesh has ${rawComponents} components; expected ${expected}`);
  checks.check(discarded === 0, `${discarded} raw mesh components were discarded`);
  checks.check(Array.isArray(diagnostics), "per-part raw component diagnostics are missing");
  if (Array.isArray(diagnostics)) {
    checks.check(diagnostics.length === (state.mountRing === "ring" ? state.nW + 1 : 1), "per-part diagnostic count is wrong");
    for (const diagnostic of diagnostics) {
      checks.check(diagnostic.componentCount === 1, `logical part ${diagnostic.partIndex} contains ${diagnostic.componentCount} disconnected components`);
    }
  }
  checks.check(Array.isArray(geometry.parts) && geometry.parts.length === expected, `export exposes ${geometry.parts?.length ?? "no"} parts; expected ${expected}`);
  checks.check(vertexCount > 0 && triangleCount > 0, "mesh is empty");
  checks.check(meshHasFiniteTopology(engine, mesh), "mesh contains non-finite coordinates or indices");

  const audit = engine.meshAudit(mesh);
  checks.check(audit.badEdges === 0, `${audit.badEdges} nonmanifold or boundary edges`);
  checks.check(audit.badOrientation === 0, `${audit.badOrientation} reversed edge pairs`);
  checks.check(audit.orientationConflict === 0, `${audit.orientationConflict} orientation conflicts`);
  checks.check(audit.degenerate === 0, `${audit.degenerate} degenerate triangles`);
  checks.check(audit.duplicateFaces === 0, `${audit.duplicateFaces} duplicate faces`);
  checks.check(audit.nonFinite === 0, `${audit.nonFinite} non-finite faces`);
  checks.check(audit.components === expected, `welded mesh audit reports ${audit.components} components; expected ${expected}`);
  checks.check(audit.volume > 0, "signed mesh volume is not positive");

  const fabrication = engine.fabricationAudit(state, mesh, Boolean(options.deep));
  checks.check(Number.isFinite(fabrication.rawComponents), "fabrication audit did not propagate raw component count");
  checks.check(Number.isFinite(fabrication.discardedComponents), "fabrication audit did not propagate discarded component count");
  checks.check(fabrication.rawComponents === expected, "fabrication audit raw component count differs from declared assembly");
  checks.check(fabrication.discardedComponents === 0, "fabrication audit reports discarded components");
  checks.check(fabrication.namedPartsConnected !== false, "a named printable part has disconnected fragments");
  checks.check(fabrication.assembly?.pass === true, "tap/chamber assembly connectivity audit failed");
  if (options.deep) {
    checks.check(Number.isFinite(fabrication.selfIntersections), "deep fabrication audit did not run self-intersection detection");
    checks.check(fabrication.selfIntersections === 0, `${fabrication.selfIntersections} self-intersections`);
  }
  checks.check(fabrication.pass === true, "fabrication audit did not certify the complete assembly");

  const stl = engine.stlBytes(mesh);
  checks.check(stl.byteLength === 84 + 50 * triangleCount, "binary STL byte length does not match triangle count");
  const box = boundingBox(engine, mesh);
  checks.check(finiteTree(box).length === 0, "mesh bounding box is non-finite");
  checks.check(box.high.every((value, axis) => value > box.low[axis]), "mesh bounding box has a zero or reversed axis");

  if (geometry.field && geometry.plan) {
    const assembly = engine.assemblyAudit(geometry.plan, geometry.field);
    checks.check(assembly.pass, `implicit tap/chamber checks failed: ${assembly.rows.filter((row) => !row.pass).map((row) => row.name).join(", ")}`);
    checkPanelFastenerBlindness(geometry, checks);
  } else {
    checks.check(false, "implicit field or plan is missing, so tap connectivity cannot be checked");
  }

  return {
    audit,
    fabrication,
    triangles: triangleCount,
    vertices: vertexCount,
    rawComponents,
    discardedComponents: discarded,
    hash: meshHash(engine, mesh),
    stlBytes: stl.byteLength,
    bounds: box
  };
}
