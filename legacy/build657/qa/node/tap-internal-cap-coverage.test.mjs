import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const engine = require(path.join(appRoot, "engine.js"));

const add = (a, b) => a.map((value, index) => value + b[index]);
const subtract = (a, b) => a.map(
  (value, index) => value - b[index],
);
const multiply = (a, scalar) => a.map((value) => value * scalar);
const dot = (a, b) => a.reduce(
  (sum, value, index) => sum + value * b[index],
  0,
);
const length = (a) => Math.hypot(...a);
const unit = (a) => {
  const magnitude = length(a) || 1;
  return multiply(a, 1 / magnitude);
};
const clamp = (value, low, high) => Math.max(
  low,
  Math.min(high, value),
);

function sixW5AngularState() {
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
    cdSel: "dcx464",
    cdFloor: 300,
    cdDepth: 2.4,
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
    nW: 6,
    npW: 2,
    driverArrayMode: "auto",
    driverArrayRotationDeg: 0,
    shW: "slot",
    tapShapeW: "slot",
    tapPairMode: "auto",
    twoXO: 500,
    tapCRW: 6,
    driverMountMode: "shortest",
    driverMountExtraMm: 0,
    driverAxisBlend: 0,
    driverCellConstruction: "integrated",
    coneProfileMode: "flat",
    coneDepthMm: 0,
    coneDepthKnown: false,
    coneAxialClearanceMm: 0,
    coneRadialClearanceMm: 0,
  };
}

function apertureDistance(x, y, section) {
  if (section.shape === "round") return Math.hypot(x, y) - section.sb;
  if (section.shape === "oval") {
    return (
      Math.hypot(
        x / Math.max(section.sa, 1e-12),
        y / Math.max(section.sb, 1e-12),
      ) - 1
    ) * Math.min(section.sa, section.sb);
  }
  const core = Math.max(0, section.sa - section.sb);
  const dx = Math.max(Math.abs(x) - core, 0);
  return Math.hypot(dx, y) - section.sb;
}

function finiteSectionDistance(point, section) {
  const span = subtract(section.b, section.a);
  const sectionLength = length(span);
  const axis = unit(span);
  const relative = subtract(point, section.a);
  const axial = dot(relative, axis);
  return Math.max(
    apertureDistance(
      dot(relative, section.u),
      dot(relative, section.v),
      section,
    ),
    -axial,
    axial - sectionLength,
  );
}

function capPoint(center, section, outlinePoint, radialFraction) {
  return add(
    add(
      center,
      multiply(section.u, outlinePoint[0] * radialFraction),
    ),
    multiply(section.v, outlinePoint[1] * radialFraction),
  );
}

test("shortest cone-normal taps contain one open prism and no internal cap", () => {
  const solved = engine.solve(
    engine.migrateTwoWayState(sixW5AngularState()),
  );
  assert.equal(solved.infeasible, false);
  const plan = solved.ev.plan;
  const field = engine.twoWaySolidField(plan);
  const coverageToleranceM = 1e-8;
  const radialFractions = [0, 0.25, 0.5, 0.75, 0.9, 0.98];
  const exposed = [];
  const joints = [];
  let sampleCount = 0;
  let openLumenSampleCount = 0;

  for (const driver of plan.drivers) {
    for (const port of driver.ports) {
      const tool = field.tapTools[driver.index][port.index];
      assert.equal(tool.kind, "swept-aperture");
      assert.equal(tool.geometryMode, "straight-cone-normal");
      assert.equal(tool.sections.length, 1);
      assert.equal(tool.centerlinePoints.length, 2);
      assert.equal(
        tool.sections.length,
        tool.centerlinePoints.length - 1,
      );
      const section = tool.sections[0];
      const sectionAxis = unit(subtract(section.b, section.a));
      assert.ok(dot(sectionAxis, driver.mountN) >= 1 - 1e-12);
      assert.ok(
        dot(
          subtract(tool.centerlinePoints[0], section.a),
          driver.mountN,
        ) > 0,
        "Boolean cutter tail must remain outside the acoustic path",
      );
      assert.equal(tool.equalizer.chamberDiscContained, true);
      assert.equal(tool.equalizer.endpointContained, true);

      const outline = engine.twoWayApertureOutline(section, 32);
      for (const axialFraction of [0.08, 0.5, 0.92]) {
        const center = add(
          tool.centerlinePoints[0],
          multiply(
            subtract(
              tool.centerlinePoints[1],
              tool.centerlinePoints[0],
            ),
            axialFraction,
          ),
        );
        for (const radialFraction of [0, 0.45, 0.85]) {
          const stride = radialFraction === 0 ? outline.length : 4;
          for (let outlineIndex = 0;
            outlineIndex < outline.length;
            outlineIndex += stride) {
            const point = capPoint(
              center,
              section,
              outline[outlineIndex],
              radialFraction,
            );
            openLumenSampleCount += 1;
            assert.ok(
              field(point) >= -1e-8,
              `blocked straight lumen at driver ${driver.index}, `
                + `tap ${port.index}, axial ${axialFraction}, `
                + `radial ${radialFraction}`,
            );
          }
        }
      }

      for (let jointIndex = 0;
        jointIndex < tool.sections.length - 1;
        jointIndex += 1) {
        const upstream = tool.sections[jointIndex];
        const downstream = tool.sections[jointIndex + 1];
        const vertex = tool.centerlinePoints[jointIndex + 1];
        const upstreamAxis = unit(subtract(
          tool.centerlinePoints[jointIndex + 1],
          tool.centerlinePoints[jointIndex],
        ));
        const downstreamAxis = unit(subtract(
          tool.centerlinePoints[jointIndex + 2],
          tool.centerlinePoints[jointIndex + 1],
        ));
        const turn = Math.acos(clamp(
          dot(upstreamAxis, downstreamAxis),
          -1,
          1,
        ));
        const bend = unit(subtract(upstreamAxis, downstreamAxis));
        const supportM = Math.max(
          engine.twoWayApertureSupport(
            port,
            dot(bend, upstream.u),
            dot(bend, upstream.v),
          ),
          engine.twoWayApertureSupport(
            port,
            dot(bend, downstream.u),
            dot(bend, downstream.v),
          ),
        );
        const requiredSymmetricOverlapM = supportM * Math.tan(turn / 2);
        const upstreamOverlapM = dot(
          subtract(upstream.b, vertex),
          upstreamAxis,
        );
        const downstreamOverlapM = dot(
          subtract(vertex, downstream.a),
          downstreamAxis,
        );
        const joint = {
          driverIndex: driver.index,
          tapIndex: port.index,
          jointIndex,
          turnDeg: turn * 180 / Math.PI,
          supportMm: supportM * 1000,
          requiredSymmetricOverlapMm:
            requiredSymmetricOverlapM * 1000,
          upstreamOverlapMm: upstreamOverlapM * 1000,
          downstreamOverlapMm: downstreamOverlapM * 1000,
          exposedSampleCount: 0,
          maximumExposureMm: 0,
        };
        joints.push(joint);

        for (const cap of [
          {
            side: "upstream-end",
            owner: upstream,
            center: upstream.b,
            adjacent: downstream,
          },
          {
            side: "downstream-start",
            owner: downstream,
            center: downstream.a,
            adjacent: upstream,
          },
        ]) {
          const outline = engine.twoWayApertureOutline(cap.owner, 64);
          for (const radialFraction of radialFractions) {
            const stride = radialFraction === 0 ? outline.length : 2;
            for (let outlineIndex = 0;
              outlineIndex < outline.length;
              outlineIndex += stride) {
              const point = capPoint(
                cap.center,
                cap.owner,
                outline[outlineIndex],
                radialFraction,
              );
              const adjacentDistanceM = finiteSectionDistance(
                point,
                cap.adjacent,
              );
              sampleCount += 1;
              if (adjacentDistanceM <= coverageToleranceM) continue;
              joint.exposedSampleCount += 1;
              joint.maximumExposureMm = Math.max(
                joint.maximumExposureMm,
                adjacentDistanceM * 1000,
              );
              exposed.push({
                driverIndex: driver.index,
                tapIndex: port.index,
                jointIndex,
                side: cap.side,
                radialFraction,
                outlineIndex,
                point,
                adjacentDistanceMm: adjacentDistanceM * 1000,
                turnDeg: joint.turnDeg,
                supportMm: joint.supportMm,
                requiredSymmetricOverlapMm:
                  joint.requiredSymmetricOverlapMm,
                upstreamOverlapMm: joint.upstreamOverlapMm,
                downstreamOverlapMm: joint.downstreamOverlapMm,
              });
            }
          }
        }
      }
    }
  }

  exposed.sort(
    (a, b) => b.adjacentDistanceMm - a.adjacentDistanceMm,
  );
  const activeJoints = joints.filter((joint) => joint.turnDeg > 1e-5);
  const summary = {
    pathCount: field.tapTools.flat().length,
    jointCount: joints.length,
    activeJointCount: activeJoints.length,
    sampleCount,
    coverageToleranceMm: coverageToleranceM * 1000,
    exposedSampleCount: exposed.length,
    maximumExposureMm: exposed[0]?.adjacentDistanceMm || 0,
    requiredSymmetricOverlapRangeMm: activeJoints.length
      ? [
        Math.min(...activeJoints.map(
          (joint) => joint.requiredSymmetricOverlapMm,
        )),
        Math.max(...activeJoints.map(
          (joint) => joint.requiredSymmetricOverlapMm,
        )),
      ]
      : [0, 0],
    worstWitnesses: exposed.slice(0, 8),
    failingJoints: joints
      .filter((joint) => joint.exposedSampleCount > 0)
      .sort((a, b) => b.maximumExposureMm - a.maximumExposureMm)
      .slice(0, 12),
  };

  assert.equal(joints.length, 0);
  assert.equal(sampleCount, 0);
  assert.ok(openLumenSampleCount > 0);
  assert.equal(
    exposed.length,
    0,
    "internal finite-prism caps remain on the production cutter boundary\n"
      + JSON.stringify(summary, null, 2),
  );
});
