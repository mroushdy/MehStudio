import assert from "node:assert/strict";
import test from "node:test";
import { engine, loadCases } from "./case-loader.mjs";

const fixture = loadCases().find((candidate) =>
  candidate.documentName === "canonical" && candidate.id === "P01"
);

function calculatedPanelState(covH) {
  assert.ok(fixture, "canonical Hinson P01 fixture is missing");
  return {
    ...fixture.state,
    covH,
    twoDesign: "arch:panel",
    tapBasis: "model"
  };
}

function failedLawNames(solved) {
  return (solved.ev?.rows || [])
    .filter((row) => row.st === "fail")
    .map((row) => row.name);
}

test("P01 calculated panel plan remains feasible from 40 through 120 degrees", () => {
  for (let covH = 40; covH <= 120; covH += 5) {
    const solved = engine.solve(calculatedPanelState(covH));
    const plan = solved.ev.plan;
    const quarterWaveHz = engine.C / (4 * Math.max(0.001, plan.station));
    const requiredPhaseHz = plan.phaseMargin * plan.xo;

    assert.equal(
      solved.infeasible,
      false,
      `${covH}-degree calculated panel state was refused: ${failedLawNames(solved).join(", ")}`
    );
    assert.equal(solved.S.twoArch, "panel", `${covH}° changed construction family`);
    assert.equal(solved.S.twoDesign, "arch:panel", `${covH}° changed calculated design identity`);
    assert.equal(solved.S.tapBasis, "model", `${covH}° changed tap sizing basis`);
    assert.equal(solved.S.covH, covH, `${covH}° coverage was silently adapted`);

    for (const [name, value] of Object.entries({
      station: plan.station,
      phaseMargin: plan.phaseMargin,
      phaseBound: plan.phaseBound,
      crossover: plan.xo,
      quarterWaveHz,
      requiredPhaseHz,
      panelBoltClearance: plan.panelBoltClearance,
      panelBoltRequired: plan.panelBoltRequired
    })) {
      assert.ok(Number.isFinite(value), `${covH}° ${name} is not finite: ${value}`);
    }

    assert.ok(
      quarterWaveHz >= requiredPhaseHz,
      `${covH}° quarter-wave bound failed: ${quarterWaveHz} Hz < ${requiredPhaseHz} Hz`
    );
    assert.ok(
      plan.panelBoltClearance >= plan.panelBoltRequired,
      `${covH}° panel bolt clearance failed: ${plan.panelBoltClearance} m < ${plan.panelBoltRequired} m`
    );
  }
});

test("P01 calculated panel horn is safely refused before exact allocation at 80 degrees", () => {
  const solved = engine.solve(calculatedPanelState(80));
  const failedLaws = (solved.ev?.rows || [])
    .filter((row) => row.st === "fail")
    .map((row) => row.name);

  assert.equal(
    solved.infeasible,
    false,
    `80-degree Hinson calculated state was refused: ${failedLaws.join(", ")}`
  );
  assert.equal(solved.S.twoArch, "panel");
  assert.equal(solved.S.twoDesign, "arch:panel");
  assert.equal(solved.S.tapBasis, "model");
  assert.equal(solved.S.covH, 80);

  assert.throws(
    () => engine.twoWayMeshPreflight(solved.S, "export"),
    (error) => {
      assert.match(
        String(error?.code || ""),
        /^MESH_(?:AXIS|PART_GRID|JOB_GRID|MEMORY)_LIMIT$/,
        "P01 exact refusal did not use a stable pre-allocation budget code"
      );
      assert.ok(
        error?.details?.budget,
        "P01 exact refusal omitted its evaluated mesh budget"
      );
      return true;
    }
  );
});
