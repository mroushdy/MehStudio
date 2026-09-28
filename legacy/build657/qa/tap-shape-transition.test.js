import assert from "node:assert/strict";
import test from "node:test";
import { engine, loadCases } from "./node/case-loader.mjs";

const fixture = loadCases().find((candidate) =>
  candidate.documentName === "canonical" && candidate.id === "P01"
);

const SHAPE_SEQUENCE = ["oval", "slot", "round"];

function finiteVector(value, label) {
  assert.ok(Array.isArray(value), `${label} is not an array`);
  assert.equal(value.length, 3, `${label} is not a 3D vector`);
  value.forEach((component, index) => {
    assert.ok(
      Number.isFinite(component),
      `${label}[${index}] is not finite: ${component}`
    );
  });
}

function renderContract(solved) {
  const plan = solved.ev.plan;
  const detachable = plan.family === "radial" && solved.S.mountRing === "ring";
  const field = engine.twoWaySolidField(plan, detachable);

  return {
    plan,
    mounts: plan.drivers,
    taps: plan.allPorts,
    tapTools: field.tapTools,
    meshKey: engine.twoWayMeshKey(solved.S, "display")
  };
}

test("oval -> slot -> round keeps woofer mounts and taps in render data", () => {
  assert.ok(fixture, "canonical Hinson P01 fixture is missing");

  let state = { ...fixture.state };
  const meshKeys = new Set();

  for (const shape of SHAPE_SEQUENCE) {
    const requested = { ...state, shW: shape };
    const adapted = engine.smartAdapt2way(requested, "shW", {});
    const solved = engine.solve(adapted.S2);
    const render = renderContract(solved);

    assert.equal(
      solved.infeasible,
      false,
      `${shape} transition was refused: ${(solved.ev.rows || [])
        .filter((row) => row.st === "fail")
        .map((row) => row.name)
        .join(", ")}`
    );
    assert.equal(solved.S.shW, shape, `${shape} transition changed tap shape`);

    assert.ok(render.mounts.length > 0, `${shape} has no mount descriptors`);
    assert.equal(
      render.mounts.length,
      render.plan.drivers.length,
      `${shape} lost a mount descriptor`
    );

    for (const [driverIndex, mount] of render.mounts.entries()) {
      finiteVector(mount.surface, `${shape} mount ${driverIndex} surface`);
      finiteVector(mount.mountN, `${shape} mount ${driverIndex} normal`);
      finiteVector(mount.driverFace, `${shape} mount ${driverIndex} driver face`);
      assert.ok(
        Number.isFinite(mount.outerR) && mount.outerR > 0,
        `${shape} mount ${driverIndex} has no outer mounting radius`
      );
      assert.ok(
        Number.isFinite(mount.flangeT) && mount.flangeT > 0,
        `${shape} mount ${driverIndex} has no flange thickness`
      );
      assert.equal(
        typeof mount.mountKind,
        "string",
        `${shape} mount ${driverIndex} has no renderable mount kind`
      );
      assert.equal(
        mount.ports.length,
        render.plan.np,
        `${shape} mount ${driverIndex} lost tap descriptors`
      );
    }

    assert.equal(
      render.taps.length,
      render.mounts.length * render.plan.np,
      `${shape} render plan lost taps`
    );
    assert.equal(
      render.tapTools.length,
      render.mounts.length,
      `${shape} exact field lost a mount's tap cutters`
    );

    for (const [driverIndex, tools] of render.tapTools.entries()) {
      assert.equal(
        tools.length,
        render.plan.np,
        `${shape} mount ${driverIndex} lost an exact tap cutter`
      );
      for (const [tapIndex, tool] of tools.entries()) {
        const tap = render.mounts[driverIndex].ports[tapIndex];
        assert.equal(tap.shape, shape, `${shape} plan tap has the wrong shape`);
        assert.equal(tool.shape, shape, `${shape} exact tap cutter has the wrong shape`);
        assert.ok(
          Number.isFinite(tap.area) && tap.area > 0,
          `${shape} tap ${driverIndex}:${tapIndex} has no aperture area`
        );
        finiteVector(tap.center, `${shape} tap ${driverIndex}:${tapIndex} center`);
        finiteVector(tap.normal, `${shape} tap ${driverIndex}:${tapIndex} normal`);
        finiteVector(tap.flow, `${shape} tap ${driverIndex}:${tapIndex} flow axis`);
        finiteVector(tap.cross, `${shape} tap ${driverIndex}:${tapIndex} cross axis`);
      }
    }

    assert.ok(render.meshKey.includes(`"${shape}"`), `${shape} is absent from mesh key`);
    meshKeys.add(render.meshKey);
    state = solved.S;
  }

  assert.equal(meshKeys.size, SHAPE_SEQUENCE.length, "tap shapes reused a stale render key");
});
