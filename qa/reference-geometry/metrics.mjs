const TAU = 2 * Math.PI;
const EPSILON = 1e-12;

const subtract = (a, b) => a.map((value, index) => value - b[index]);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const magnitude = (value) => Math.hypot(...value);
const unit = (value) => {
  const length = Math.max(EPSILON, magnitude(value));
  return value.map((component) => component / length);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const normalizedAngle = (value) => ((value % TAU) + TAU) % TAU;

function assertion(name, value, operator, limit, pass, units = "normalized") {
  return { name, value, operator, limit, units, pass: Boolean(pass) };
}

function resultFrom(assertions, metrics = {}) {
  return {
    pass: assertions.every((item) => item.pass),
    assertions,
    metrics
  };
}

function panelPlanarity(engine, plan) {
  const stations = plan.st.pts.filter((station) =>
    station.x >= plan.throatMorphL - EPSILON
  );
  const rings = stations.map((station) => ({
    x: station.x,
    vertices: engine.panelVerts(station.a, station.b, station.n)
  }));
  const vertexCounts = [...new Set(rings.map((ring) => ring.vertices.length))];
  if (!rings.length || vertexCounts.length !== 1 || vertexCounts[0] !== 4) {
    return {
      facetCount: vertexCounts.length === 1 ? vertexCounts[0] : null,
      maximumResidual: Infinity,
      maximumResidualNormalized: Infinity,
      perFacet: []
    };
  }

  const perFacet = Array.from({ length: 4 }, (_, panelIndex) => {
    const next = (panelIndex + 1) % 4;
    const origin = [rings[0].x, ...rings[0].vertices[panelIndex]];
    const across = [rings[0].x, ...rings[0].vertices[next]];
    const axial = [rings.at(-1).x, ...rings.at(-1).vertices[panelIndex]];
    const normal = unit(cross(subtract(across, origin), subtract(axial, origin)));
    let maximum = 0;
    for (const ring of rings) {
      for (const vertexIndex of [panelIndex, next]) {
        const point = [ring.x, ...ring.vertices[vertexIndex]];
        maximum = Math.max(maximum, Math.abs(dot(subtract(point, origin), normal)));
      }
    }
    return maximum;
  });
  const mouth = stations.at(-1);
  const mouthScale = Math.max(EPSILON, 2 * Math.min(mouth.a, mouth.b));
  const maximumResidual = Math.max(...perFacet);
  return {
    facetCount: 4,
    maximumResidual,
    maximumResidualNormalized: maximumResidual / mouthScale,
    perFacet
  };
}

function throatCircularity(engine, plan, samples = 96) {
  const radii = Array.from({ length: samples }, (_, index) => {
    const phi = index * TAU / samples;
    return magnitude(engine.twoWaySectionPoint(plan, 0, phi));
  });
  const mean = radii.reduce((sum, value) => sum + value, 0) / radii.length;
  return {
    minimum: Math.min(...radii),
    maximum: Math.max(...radii),
    mean,
    radialSpreadNormalized: (Math.max(...radii) - Math.min(...radii)) /
      Math.max(EPSILON, mean)
  };
}

function tapLayout(plan) {
  const ports = plan.drivers.flatMap((driver) => driver.ports);
  const quadrants = new Set(
    ports
      .filter((port) => Math.abs(port.center[1]) > 1e-8 && Math.abs(port.center[2]) > 1e-8)
      .map((port) => `${Math.sign(port.center[1])},${Math.sign(port.center[2])}`)
  );
  const orientation = ports.map((port) => {
    const axis = [port.flow[1], port.flow[2]];
    const radial = [port.center[1], port.center[2]];
    const axisLength = magnitude(axis);
    const radialLength = magnitude(radial);
    return {
      diagonalShare: axisLength > EPSILON
        ? Math.min(Math.abs(axis[0]), Math.abs(axis[1])) / axisLength
        : 0,
      radialAlignment: axisLength > EPSILON && radialLength > EPSILON
        ? Math.abs(dot(axis, radial)) / (axisLength * radialLength)
        : 0
    };
  });
  const activeMargin = plan.frame.activeR - 0.002 - plan.maxPortReach;
  return {
    portCount: ports.length,
    portsPerDriver: plan.drivers.length
      ? Math.min(...plan.drivers.map((driver) => driver.ports.length))
      : 0,
    quadrantCoverage: quadrants.size / 4,
    edgeBias: plan.tapEdgeBias,
    minimumDiagonalShare: Math.min(...orientation.map((item) => item.diagonalShare)),
    minimumRadialAlignment: Math.min(...orientation.map((item) => item.radialAlignment)),
    activeConeMarginNormalized: activeMargin / Math.max(EPSILON, plan.frame.activeR),
    pairWebRatio: plan.pairWeb / Math.max(EPSILON, plan.minWeb)
  };
}

function driverPackaging(plan) {
  const wall = Math.max(0.004, plan.S.wallT || plan.panelT || 0);
  const signedOffsets = plan.drivers.map((driver) =>
    dot(subtract(driver.driverFace, driver.surface), driver.mountN)
  );
  const bearingReaches = plan.drivers.map((driver) =>
    dot(subtract(driver.driverFace, driver.surface), driver.mountN)
  );
  const frameDiameter = plan.frame.od;
  const activeDiameter = 2 * plan.frame.activeR;
  return {
    minimumSignedOffset: Math.min(...signedOffsets),
    minimumWallOffsetNormalized: Math.min(...signedOffsets) / wall,
    minimumBearingReachToWallRatio: Math.min(...bearingReaches) / wall,
    frameGapNormalized: plan.minDriverGap / Math.max(EPSILON, frameDiameter),
    mountSideNormalized: plan.minMountSide / wall,
    portWebRatio: plan.np === 2
      ? plan.pairWeb / Math.max(EPSILON, plan.minWeb)
      : Infinity,
    frameDiameter,
    activeDiameter,
    activeToFrameRatio: activeDiameter / Math.max(EPSILON, frameDiameter),
    gasketToFrameRatio: plan.frame.gasketT / Math.max(EPSILON, frameDiameter),
    integrated: plan.S.mountRing !== "ring"
  };
}

function radialSpacing(plan) {
  const angles = plan.drivers
    .map((driver) => normalizedAngle(driver.phi))
    .sort((a, b) => a - b);
  const ideal = TAU / Math.max(1, angles.length);
  const gaps = angles.map((angle, index) => {
    const next = index === angles.length - 1 ? angles[0] + TAU : angles[index + 1];
    return next - angle;
  });
  return {
    count: angles.length,
    ideal,
    gaps,
    maximumSectorErrorNormalized: Math.max(
      ...gaps.map((gap) => Math.abs(gap - ideal) / ideal)
    )
  };
}

export function evaluatePlannerContract(engine, solved, contract) {
  const { plan, state } = solved;
  const limits = contract.limits || {};

  if (contract.evaluator === "fourPlaneAngular") {
    const metrics = panelPlanarity(engine, plan);
    return resultFrom([
      assertion("facet count", metrics.facetCount, "==", limits.facetCount,
        metrics.facetCount === limits.facetCount, "count"),
      assertion("maximum plane residual / mouth minimum",
        metrics.maximumResidualNormalized, "<=", limits.maxPlaneResidualNormalized,
        metrics.maximumResidualNormalized <= limits.maxPlaneResidualNormalized)
    ], metrics);
  }

  if (contract.evaluator === "hinsonTapLayout") {
    const metrics = tapLayout(plan);
    return resultFrom([
      assertion("driver count", plan.drivers.length, "==", limits.driverCount,
        plan.drivers.length === limits.driverCount, "count"),
      assertion("ports per driver", metrics.portsPerDriver, "==", limits.portsPerDriver,
        metrics.portsPerDriver === limits.portsPerDriver, "count"),
      assertion("four-quadrant coverage", metrics.quadrantCoverage, ">=",
        limits.quadrantCoverage, metrics.quadrantCoverage >= limits.quadrantCoverage),
      assertion("wall-intersection edge bias", metrics.edgeBias, ">=",
        limits.minimumEdgeBias, metrics.edgeBias >= limits.minimumEdgeBias),
      assertion("minimum diagonal long-axis share", metrics.minimumDiagonalShare, ">=",
        limits.minimumDiagonalShare,
        metrics.minimumDiagonalShare >= limits.minimumDiagonalShare),
      assertion("minimum radial/seam alignment", metrics.minimumRadialAlignment, ">=",
        limits.minimumRadialAlignment,
        metrics.minimumRadialAlignment >= limits.minimumRadialAlignment),
      assertion("active-cone containment margin", metrics.activeConeMarginNormalized, ">=",
        limits.minimumActiveConeMarginNormalized,
        metrics.activeConeMarginNormalized >= limits.minimumActiveConeMarginNormalized),
      assertion("pair web / minimum web", metrics.pairWebRatio, ">=",
        limits.minimumPairWebRatio, metrics.pairWebRatio >= limits.minimumPairWebRatio)
    ], metrics);
  }

  if (contract.evaluator === "throatCircularity") {
    const metrics = throatCircularity(engine, plan);
    return resultFrom([
      assertion("throat radial spread / mean radius", metrics.radialSpreadNormalized, "<=",
        limits.maximumRadialSpreadNormalized,
        metrics.radialSpreadNormalized <= limits.maximumRadialSpreadNormalized)
    ], metrics);
  }

  if (contract.evaluator === "rearOnlyDrivers") {
    const metrics = driverPackaging(plan);
    return resultFrom([
      assertion("minimum signed rear offset", metrics.minimumSignedOffset, ">=",
        limits.minimumSignedOffset,
        metrics.minimumSignedOffset >= limits.minimumSignedOffset, "m"),
      assertion("minimum rear offset / wall", metrics.minimumWallOffsetNormalized, ">=",
        limits.minimumWallOffsetNormalized,
        metrics.minimumWallOffsetNormalized >= limits.minimumWallOffsetNormalized)
    ], metrics);
  }

  if (contract.evaluator === "plateContinuity") {
    const metrics = driverPackaging(plan);
    const integratedRequired = Boolean(limits.requireIntegratedFixture);
    return resultFrom([
      assertion("bearing reach / wall", metrics.minimumBearingReachToWallRatio, ">=",
        limits.minimumBearingReachToWallRatio,
        metrics.minimumBearingReachToWallRatio >= limits.minimumBearingReachToWallRatio),
      assertion("integrated fixture", metrics.integrated, "==",
        integratedRequired, metrics.integrated === integratedRequired, "boolean")
    ], metrics);
  }

  if (contract.evaluator === "packagingClearance") {
    const metrics = driverPackaging(plan);
    return resultFrom([
      assertion("minimum frame gap / frame diameter", metrics.frameGapNormalized, ">=",
        limits.minimumFrameGapNormalized,
        metrics.frameGapNormalized >= limits.minimumFrameGapNormalized),
      assertion("minimum mount side / wall", metrics.mountSideNormalized, ">=",
        limits.minimumMountSideNormalized,
        metrics.mountSideNormalized >= limits.minimumMountSideNormalized),
      assertion("tap-pair web / minimum web", metrics.portWebRatio, ">=",
        limits.minimumPortWebRatio, metrics.portWebRatio >= limits.minimumPortWebRatio)
    ], metrics);
  }

  if (contract.evaluator === "driverProportions") {
    const metrics = driverPackaging(plan);
    return resultFrom([
      assertion("active diameter / frame diameter", metrics.activeToFrameRatio, ">=",
        limits.minimumActiveToFrameRatio,
        metrics.activeToFrameRatio >= limits.minimumActiveToFrameRatio),
      assertion("active diameter / frame diameter", metrics.activeToFrameRatio, "<=",
        limits.maximumActiveToFrameRatio,
        metrics.activeToFrameRatio <= limits.maximumActiveToFrameRatio),
      assertion("gasket thickness / frame diameter", metrics.gasketToFrameRatio, ">=",
        limits.minimumGasketToFrameRatio,
        metrics.gasketToFrameRatio >= limits.minimumGasketToFrameRatio),
      assertion("gasket thickness / frame diameter", metrics.gasketToFrameRatio, "<=",
        limits.maximumGasketToFrameRatio,
        metrics.gasketToFrameRatio <= limits.maximumGasketToFrameRatio)
    ], metrics);
  }

  if (contract.evaluator === "radialCountSpacing") {
    const metrics = radialSpacing(plan);
    return resultFrom([
      assertion("radial descriptor count", metrics.count, "==", state.nW,
        metrics.count === state.nW, "count"),
      assertion("maximum sector error / ideal sector",
        metrics.maximumSectorErrorNormalized, "<=",
        limits.maximumSectorErrorNormalized,
        metrics.maximumSectorErrorNormalized <= limits.maximumSectorErrorNormalized)
    ], metrics);
  }

  throw new Error(`unknown planner evaluator: ${contract.evaluator}`);
}

export function summarizeMetric(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    return Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.0001)
      ? value.toExponential(3)
      : Number(value.toFixed(6));
  }
  if (Array.isArray(value)) return value.map(summarizeMetric);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, summarizeMetric(item)])
    );
  }
  return value;
}
