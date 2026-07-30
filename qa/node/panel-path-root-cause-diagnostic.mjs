import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const engine = require("../../engine.js");

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map(
  (value, index) => value - b[index],
);
const multiply = (a, scalar) => a.map((value) => value * scalar);
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const magnitude = (a) => Math.hypot(...a);
const unit = (a) => {
  const size = magnitude(a) || 1;
  return multiply(a, 1 / size);
};
const clamp = (value, low, high) => Math.max(
  low,
  Math.min(high, value),
);
const degrees = (radians) => radians * 180 / Math.PI;

function fixture() {
  return {
    ...engine.TWO_ARCH.panel.defaults,
    topo: "2way",
    _smart2waySchema: 3,
    twoArch: "panel",
    twoFamily: "panel",
    twoDesign: "arch:panel",
    tapBasis: "model",
    style: "angular",
    profileLaw: "conical",
    sectionFamily: "superellipse",
    sectionLameN: 12,
    sectionCornerRatio: 0.25,
    seN: 12,
    covH: 90,
    covV: 60,
    mouthW: 26,
    requestedMouthW: 26,
    mouthCap: 64,
    wallT: 0.018,
    td: 1.4,
    throat: 1.4,
    cdFloor: 300,
    cdDepth: 2.4,
    cdSel: "dcx464",
    nW: 6,
    npW: 2,
    wPre: "w5",
    odW: 13.76,
    dpW: 6.95,
    sdW: 91.6,
    vtcW: 35,
    xmW: 2.5,
    frameW: "round",
    boltNW: 4,
    boltDW: 5,
    gasketW: 1.6,
    twoXO: 500,
    tapCRW: 6,
    driverCellConstruction: "integrated",
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    driverMountMode: "shortest",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
  };
}

function bezier3(a, b, c, d, t) {
  const s = 1 - t;
  return add(
    add(
      multiply(a, s ** 3),
      multiply(b, 3 * s * s * t),
    ),
    add(
      multiply(c, 3 * s * t * t),
      multiply(d, t ** 3),
    ),
  );
}

function pathLength(points) {
  return points.slice(1).reduce(
    (sum, point, index) => sum + magnitude(subtract(point, points[index])),
    0,
  );
}

function pathGeometry(tool, mode, intervals, retreat = 0) {
  const datum = tool.equalizer;
  const chamberPoint = add(
    datum.chamberPoint,
    multiply(datum.mountN, -retreat),
  );
  const span = magnitude(subtract(chamberPoint, datum.curveStart));
  const terminalLength = Math.max(0.006, Math.min(0.016, span * 0.16));
  const curveEnd = add(
    chamberPoint,
    multiply(datum.mountN, -terminalLength),
  );
  const direct = subtract(curveEnd, datum.curveStart);
  const c1 = mode === "direct"
    ? add(datum.curveStart, multiply(direct, 1 / 3))
    : add(
      datum.curveStart,
      multiply(datum.n, Math.max(0.008, Math.min(0.035, span * 0.38))),
    );
  const c2 = mode === "direct"
    ? add(datum.curveStart, multiply(direct, 2 / 3))
    : add(
      curveEnd,
      multiply(
        datum.mountN,
        -Math.max(0.006, Math.min(0.024, span * 0.24)),
      ),
    );
  const curvePoints = Array.from(
    { length: intervals + 1 },
    (_, index) => bezier3(
      datum.curveStart,
      c1,
      c2,
      curveEnd,
      index / intervals,
    ),
  );
  return {
    points: [
      datum.wallPt,
      datum.curveStart,
      ...curvePoints.slice(1),
      chamberPoint,
    ],
    chamberPoint,
    curveEnd,
    terminalLength,
  };
}

function jointAngles(points) {
  const axes = points.slice(1).map(
    (point, index) => unit(subtract(point, points[index])),
  );
  return axes.slice(1).map((axis, index) => degrees(Math.acos(clamp(
    dot(axes[index], axis),
    -1,
    1,
  ))));
}

function percentile(values, fraction) {
  const ordered = [...values].sort((a, b) => a - b);
  if (!ordered.length) return NaN;
  const position = (ordered.length - 1) * fraction;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return ordered[low] + (ordered[high] - ordered[low]) * (position - low);
}

function flattenTools(field) {
  return field.tapTools.flatMap((driverTools) => driverTools);
}

function metricForTools(tools, mode, intervals, solved = false) {
  const equalization = equalizationForTools(tools, mode, intervals);
  const records = tools.map((tool, index) => {
    const retreat = solved && equalization.feasible
      ? equalization.retreats[index]
      : 0;
    const geometry = pathGeometry(tool, mode, intervals, retreat);
    const angles = jointAngles(geometry.points);
    return {
      lengthM: pathLength(geometry.points),
      angles,
      entryAngleDeg: angles[0],
      terminalAngleDeg: angles.at(-1),
      internalAnglesDeg: angles.slice(1, -1),
      retreatM: retreat,
      chamberPoint: geometry.chamberPoint,
    };
  });
  const allAngles = records.flatMap((record) => record.angles);
  const internal = records.flatMap((record) => record.internalAnglesDeg);
  const lengths = records.map((record) => record.lengthM);
  return {
    mode,
    intervals,
    sectionsPerPath: intervals + 2,
    cutterCount: tools.length * (intervals + 2),
    jointCount: allAngles.length,
    maxJointDeg: Math.max(...allAngles),
    p95JointDeg: percentile(allAngles, 0.95),
    maxEntryDeg: Math.max(...records.map((record) => record.entryAngleDeg)),
    maxInternalDeg: Math.max(...internal),
    maxTerminalDeg: Math.max(
      ...records.map((record) => record.terminalAngleDeg),
    ),
    minimumLengthM: Math.min(...lengths),
    maximumLengthM: Math.max(...lengths),
    pathMismatchM: Math.max(...lengths) - Math.min(...lengths),
    equalization,
    records,
  };
}

function equalizationForTools(tools, mode, intervals) {
  const records = tools.map((tool) => {
    const length0M = pathLength(pathGeometry(
      tool,
      mode,
      intervals,
      0,
    ).points);
    const lengthCapM = pathLength(pathGeometry(
      tool,
      mode,
      intervals,
      tool.equalizer.maxRetreatM,
    ).points);
    return {
      tool,
      length0M,
      lengthCapM,
      minimumLengthM: Math.min(length0M, lengthCapM),
      maximumLengthM: Math.max(length0M, lengthCapM),
    };
  });
  const intervalMinM = Math.max(
    ...records.map((record) => record.minimumLengthM),
  );
  const intervalMaxM = Math.min(
    ...records.map((record) => record.maximumLengthM),
  );
  const feasible = intervalMinM <= intervalMaxM + 0.00002;
  const targetLengthM = intervalMaxM;
  const retreats = records.map((record) => {
    if (!feasible) return 0;
    let low = 0;
    let high = record.tool.equalizer.maxRetreatM;
    for (let iteration = 0; iteration < 56; iteration += 1) {
      const middle = (low + high) / 2;
      const value = pathLength(pathGeometry(
        record.tool,
        mode,
        intervals,
        middle,
      ).points);
      if (record.lengthCapM >= record.length0M) {
        if (value < targetLengthM) low = middle;
        else high = middle;
      } else if (value > targetLengthM) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return (low + high) / 2;
  });
  return {
    feasible,
    intervalMinM,
    intervalMaxM,
    intervalGapM: Math.max(0, intervalMinM - intervalMaxM),
    targetLengthM,
    retreats,
  };
}

function cornerDatumRecords(plan, targetMode) {
  const records = [];
  for (const driver of plan.drivers) {
    const plate = driver.cornerPlate;
    if (!plate?.active) continue;
    const cornerV = unit(cross(
      plate.bisectorNormal,
      plate.seamDirection,
    ));
    for (const port of driver.ports) {
      const datum = plate.tapDatums.find(
        (item) => item.tapIndex === port.index,
      );
      const relative = subtract(port.center, driver.surface);
      const rawU = dot(relative, plate.seamDirection);
      const rawV = dot(relative, cornerV);
      const rawRadius = Math.hypot(rawU, rawV);
      const radialDirection = rawRadius > 1e-12
        ? unit(add(
          multiply(plate.seamDirection, rawU),
          multiply(cornerV, rawV),
        ))
        : plate.seamDirection;
      const supportDu = dot(radialDirection, port.flow);
      const supportDv = dot(radialDirection, port.cross);
      const directionalProjection = Math.hypot(supportDu, supportDv);
      const directionalSupport = engine.twoWayApertureSupport(
        port,
        supportDu,
        supportDv,
      ) * directionalProjection;
      const boundingLimit = Math.max(
        0,
        driver.innerR - port.boundR - plan.minWeb,
      );
      const directionalLimit = Math.max(
        0,
        driver.innerR - directionalSupport - plan.minWeb,
      );
      const boundingScale = rawRadius > boundingLimit && rawRadius > 1e-12
        ? boundingLimit / rawRadius
        : 1;
      const directionalScale =
        rawRadius > directionalLimit && rawRadius > 1e-12
          ? directionalLimit / rawRadius
          : 1;
      const generatedOffset = magnitude(subtract(
        datum.chamberTarget,
        driver.cavInner,
      ));
      const legacyTarget = add(
        driver.cavInner,
        add(
          multiply(plate.seamDirection, rawU * boundingScale),
          multiply(cornerV, rawV * boundingScale),
        ),
      );
      const correctedTarget = add(
        driver.cavInner,
        add(
          multiply(plate.seamDirection, rawU * directionalScale),
          multiply(cornerV, rawV * directionalScale),
        ),
      );
      datum.chamberTarget = targetMode === "legacy-bound"
        ? legacyTarget
        : correctedTarget;
      records.push({
        driverIndex: driver.index,
        tapIndex: port.index,
        rawRadiusM: rawRadius,
        boundRadiusM: port.boundR,
        directionalSupportM: directionalSupport,
        directionalProjection,
        boundingLimitM: boundingLimit,
        directionalLimitM: directionalLimit,
        boundingScale,
        directionalScale,
        generatedOffsetM: generatedOffset,
        appliedTargetM: datum.chamberTarget.slice(),
        correctedOffsetM: magnitude(subtract(
          correctedTarget,
          driver.cavInner,
        )),
        correctedOuterWebM:
          driver.innerR -
          rawRadius * directionalScale -
          directionalSupport,
        requiredWebM: plan.minWeb,
      });
    }
  }
  return records;
}

function summarizeMetric(metric, placementKinds) {
  const recordKinds = metric.records.map(
    (_, index) => placementKinds[Math.floor(index / 2)],
  );
  const worstJointIndex = metric.records.reduce(
    (best, record, index) =>
      Math.max(...record.angles) > Math.max(...metric.records[best].angles)
        ? index
        : best,
    0,
  );
  const groupMaximum = (kind) => Math.max(
    ...metric.records.flatMap((record, index) =>
      recordKinds[index] === kind ? record.angles : []),
  );
  return {
    mode: metric.mode,
    intervals: metric.intervals,
    sectionsPerPath: metric.sectionsPerPath,
    cutterCount: metric.cutterCount,
    maxJointDeg: metric.maxJointDeg,
    p95JointDeg: metric.p95JointDeg,
    maxEntryDeg: metric.maxEntryDeg,
    maxInternalDeg: metric.maxInternalDeg,
    maxTerminalDeg: metric.maxTerminalDeg,
    pathMismatchMm: metric.pathMismatchM * 1000,
    equalizationFeasible: metric.equalization.feasible,
    equalizationGapMm: metric.equalization.intervalGapM * 1000,
    equalizedMismatchMm: metric.equalization.feasible
      ? metric.pathMismatchM * 1000
      : null,
    worstJointPath: worstJointIndex,
    worstJointDriver: Math.floor(worstJointIndex / 2),
    worstJointTap: worstJointIndex % 2,
    worstJointPlacement: recordKinds[worstJointIndex],
    maxCornerJointDeg: groupMaximum("corner"),
    maxFaceJointDeg: groupMaximum("face"),
  };
}

function orthogonalFrame(axis, preferredU, preferredV) {
  const w = unit(axis);
  let u = subtract(preferredU, multiply(w, dot(preferredU, w)));
  if (magnitude(u) < 1e-9) {
    u = subtract(preferredV, multiply(w, dot(preferredV, w)));
  }
  if (magnitude(u) < 1e-9) {
    const fallback = Math.abs(w[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    u = cross(w, fallback);
  }
  u = unit(u);
  let v = unit(cross(w, u));
  if (dot(v, preferredV) < 0) {
    u = multiply(u, -1);
    v = multiply(v, -1);
  }
  return { u, v };
}

function modelSections(tool, mode, intervals, retreat = 0) {
  const points = pathGeometry(tool, mode, intervals, retreat).points;
  return points.slice(1).map((point, index) => {
    const a = points[index];
    const axis = subtract(point, a);
    const frame = orthogonalFrame(
      axis,
      tool.equalizer.preferredU,
      tool.equalizer.preferredV,
    );
    return {
      a,
      b: point,
      u: frame.u,
      v: frame.v,
      sa: tool.sa,
      sb: tool.sb,
      shape: tool.shape,
    };
  });
}

function sectionSdf(point, section) {
  const axis = subtract(section.b, section.a);
  const size = magnitude(axis) || 1e-9;
  const w = multiply(axis, 1 / size);
  const relative = subtract(point, section.a);
  const axial = dot(relative, w);
  const radial = subtract(relative, multiply(w, axial));
  const x = dot(radial, section.u);
  const y = dot(radial, section.v);
  let aperture;
  if (section.shape === "round") {
    aperture = Math.hypot(x, y) - section.sb;
  } else if (section.shape === "oval") {
    aperture = (
      Math.hypot(
        x / Math.max(section.sa, 1e-6),
        y / Math.max(section.sb, 1e-6),
      ) - 1
    ) * Math.min(section.sa, section.sb);
  } else {
    const core = Math.max(0, section.sa - section.sb);
    aperture = Math.hypot(
      Math.max(Math.abs(x) - core, 0),
      y,
    ) - section.sb;
  }
  return Math.max(aperture, -axial, axial - size);
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

function benchmark(tools, configurations) {
  const samples = Array.from({ length: 2400 }, (_, index) => {
    const tool = tools[index % tools.length];
    const points = pathGeometry(
      tool,
      "tangent",
      8,
      0,
    ).points;
    const point = points[(index * 7) % points.length];
    const phase = index * 0.7548776662466927;
    return add(point, [
      Math.sin(phase) * 0.013,
      Math.cos(phase * 1.17) * 0.011,
      Math.sin(phase * 0.73) * 0.009,
    ]);
  });
  return configurations.map(({ mode, intervals }) => {
    const sectionSets = tools.map(
      (tool) => modelSections(tool, mode, intervals),
    );
    let checksum = 0;
    const trials = [];
    for (let trial = 0; trial < 7; trial += 1) {
      const start = process.hrtime.bigint();
      for (const point of samples) {
        let distance = Infinity;
        for (const sections of sectionSets) {
          for (const section of sections) {
            distance = Math.min(distance, sectionSdf(point, section));
          }
        }
        checksum += distance;
      }
      trials.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    return {
      mode,
      intervals,
      sectionsPerPath: intervals + 2,
      cutterCount: tools.length * (intervals + 2),
      medianMs: median(trials),
      checksum,
    };
  });
}

function scenario(label, targetMode) {
  const plan = engine.twoWayPlan(fixture());
  const datumRecords = cornerDatumRecords(plan, targetMode);
  const field = engine.twoWaySolidField(plan, false);
  const tools = flattenTools(field);
  const placementKinds = plan.drivers.map(
    (driver) => driver.panelPlacement.kind,
  );
  const configurations = [
    { mode: "direct", intervals: 4 },
    { mode: "tangent", intervals: 6 },
    { mode: "tangent", intervals: 8 },
    { mode: "tangent", intervals: 16 },
  ];
  const rawMetrics = configurations.map(({ mode, intervals }) =>
    metricForTools(tools, mode, intervals, false));
  const solvedMetrics = configurations.map(({ mode, intervals }) =>
    metricForTools(tools, mode, intervals, true));
  const endpointMargins = field.tapEndpointAudit.map(
    (item) => item.terminalCutterClearanceM,
  );
  return {
    label,
    targetMode,
    placementKinds,
    datumRecords,
    field: {
      actualSectionsPerPath: tools.map((tool) => tool.sections.length),
      equalization: field.tapPathEqualization,
      endpointPass: field.tapEndpointAudit.every((item) => item.pass),
      minimumTerminalCutterClearanceMm:
        Math.min(...endpointMargins) * 1000,
      manifold: field.driverManifoldDiagnostics,
      equalizerDatums: tools.map((tool) => ({
        curveStart: tool.equalizer.curveStart,
        chamberPoint: tool.equalizer.chamberPoint,
      })),
    },
    rawMetrics: rawMetrics.map(
      (metric) => summarizeMetric(metric, placementKinds),
    ),
    solvedMetrics: solvedMetrics.map(
      (metric) => summarizeMetric(metric, placementKinds),
    ),
    benchmark: benchmark(tools, configurations),
  };
}

const baseline = scenario("bounding-circle corner datum", "legacy-bound");
const corrected = scenario(
  "orientation-aware corner datum",
  "orientation-support",
);

console.log(JSON.stringify({
  baseline,
  corrected,
}, null, 2));
