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
const solverPath = path.join(appRoot, "threeway-chamber-solver.js");
const solver = require(solverPath);
const acoustics = require(path.join(appRoot, "threeway-acoustics.js"));

function fixture(id = "chamber-mid") {
  return {
    id,
    sourceId: "source-mid",
    stationId: "station-mid",
    bandIds: ["mid"],
    sourceCount: 2,
    driverEffectiveAreaM2: 0.012,
    summedApertureAreaM2: 0.002,
    air: { densityKgM3: 1.204, speedOfSoundMps: 343 },
    passage: { physicalLengthM: 0.04, endCorrectionM: 0.01 },
    volumePolicy: { mode: "explicit", volumeM3: 0.0005 },
    volumeBoundsM3: { minimum: 0.0002, maximum: 0.001 },
    resonancePolicy: { minimumAllowedHz: 400, action: "warn" },
    provenanceRefs: ["calculated-fixture"],
  };
}

test("explicit chamber evaluates compression, compliance, inertance, and delay without geometry", () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = solver.solveFrontChamber(input);
  assert.deepEqual(input, before);
  assert.equal(result.ok, true);
  assert.equal(result.record.volume.chamberVolumeM3, 0.0005);
  assert.equal(result.record.totalDriverAreaM2, 0.024);
  assert.equal(result.record.compressionRatio, 12);
  assert.ok(result.record.lumpedEstimate.chamberComplianceM5PerN > 0);
  assert.ok(result.record.lumpedEstimate.acousticInertancePaS2M3 > 0);
  assert.equal(result.record.lumpedEstimate.coupledBranchReplacement, false);
  assert.equal(result.record.geometryCreated, false);
  assert.equal(result.manufacturing, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.record.passage));
});

test("target-resonance derives only the explicitly requested ideal volume", () => {
  const input = fixture();
  input.volumePolicy = {
    mode: "target-resonance",
    targetFrequencyHz: 900,
  };
  input.volumeBoundsM3.minimum = 0.0001;
  const result = solver.solveFrontChamber(input);
  assert.equal(result.ok, true);
  assert.ok(Math.abs(
    result.record.lumpedEstimate.estimatedHelmholtzHz - 900
  ) < 1e-9);
  assert.equal(result.record.volume.automaticallySelected, false);
  assert.equal(result.record.volume.targetFrequencyHz, 900);
});

test("longer passage monotonically raises inertance and delay and lowers ideal resonance", () => {
  const short = solver.solveFrontChamber(fixture());
  const longInput = fixture();
  longInput.passage.physicalLengthM = 0.09;
  const long = solver.solveFrontChamber(longInput);
  assert.equal(short.ok, true);
  assert.equal(long.ok, true);
  assert.ok(
    long.record.lumpedEstimate.acousticInertancePaS2M3 >
      short.record.lumpedEstimate.acousticInertancePaS2M3,
  );
  assert.ok(
    long.record.lumpedEstimate.oneWayDelayS >
      short.record.lumpedEstimate.oneWayDelayS,
  );
  assert.ok(
    long.record.lumpedEstimate.estimatedHelmholtzHz <
      short.record.lumpedEstimate.estimatedHelmholtzHz,
  );
});

test("volume bounds and resonance refusal fail closed", () => {
  const outside = fixture();
  outside.volumePolicy.volumeM3 = 0.002;
  assert.equal(
    solver.solveFrontChamber(outside).code,
    solver.failureCodes.VOLUME_OUTSIDE_BOUNDS,
  );

  const resonance = fixture();
  resonance.resonancePolicy = {
    minimumAllowedHz: 2000,
    action: "refuse",
  };
  assert.equal(
    solver.solveFrontChamber(resonance).code,
    solver.failureCodes.RESONANCE_IN_BAND,
  );
});

test("displacement check is explicit and can warn or refuse", () => {
  const warning = fixture();
  warning.displacement = {
    xMaxM: 0.01,
    maximumChamberFraction: 0.1,
    action: "warn",
  };
  const warningResult = solver.solveFrontChamber(warning);
  assert.equal(warningResult.ok, true);
  assert.ok(warningResult.diagnostics.some(item =>
    item.code === solver.failureCodes.DISPLACEMENT_RATIO_EXCEEDED));

  const refusal = structuredClone(warning);
  refusal.displacement.action = "refuse";
  assert.equal(
    solver.solveFrontChamber(refusal).code,
    solver.failureCodes.DISPLACEMENT_RATIO_EXCEEDED,
  );
});

test("network ordering is keyed and duplicate ownership IDs are refused", () => {
  const a = fixture("a");
  const b = fixture("b");
  b.sourceId = "source-low";
  b.stationId = "station-low";
  b.bandIds = ["low"];
  const left = solver.solveFrontChamberNetwork({ chambers: [b, a] });
  const right = solver.solveFrontChamberNetwork({ chambers: [a, b] });
  assert.equal(left.ok, true);
  assert.deepEqual(
    left.chambers.map(item => item.record.id),
    ["a", "b"],
  );
  assert.deepEqual(left, right);
  assert.equal(
    solver.solveFrontChamberNetwork({ chambers: [a, a] }).code,
    solver.failureCodes.ID_DUPLICATE,
  );
});

test("missing values never become product, mouth, or crossover inference", () => {
  const input = fixture();
  delete input.summedApertureAreaM2;
  input.productName = "remembered speaker";
  input.mouthWidthM = 1;
  input.crossoverHz = 800;
  const result = solver.solveFrontChamber(input);
  assert.equal(result.ok, false);
  assert.equal(result.code, solver.failureCodes.INPUT_INVALID);
  assert.equal(result.record, null);
});

test("UMD path uses only the acoustic relation provider and manufacturing always refuses", () => {
  const source = fs.readFileSync(solverPath, "utf8");
  const context = {
    globalThis: { MEH3Acoustics: acoustics },
  };
  vm.runInNewContext(source, context, {
    filename: "threeway-chamber-solver.js",
  });
  const api = context.globalThis.MEH3ChamberSolver;
  assert.equal(typeof api.solveFrontChamber, "function");
  assert.equal(api.capabilities.manufacturing, false);
  assert.equal(api.manufacturingPreflight("stl").ok, false);
  assert.equal(api.manufacturingPreflight("stl").stl, false);
});
