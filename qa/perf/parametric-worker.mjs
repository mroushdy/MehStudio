import { parentPort } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import {
  analyticPreview,
  engine,
  runnerVersion,
  sourceDigest,
} from "./runner-lib.mjs";

if (!parentPort) throw new Error("parametric worker requires worker_threads");
const workerSourceHash = sourceDigest();

function failedRows(rows) {
  return (rows || [])
    .filter((row) => row.st === "fail")
    .map((row) => ({
      section: row.sec,
      name: row.name,
      value: row.val,
      reason: row.why || null,
    }));
}

function summarizePlan(plan) {
  return {
    family: plan.family,
    style: plan.S.style,
    profileLaw: plan.S.profileLaw,
    sectionFamily: plan.S.sectionFamily,
    mouthWidthIn: plan.S.mouthW,
    depthM: plan.st.depth,
    coverageDeg: [plan.S.covH, plan.S.covV],
    wooferCount: plan.drivers.length,
    tapsPerWoofer: plan.np,
    tapCount: plan.allPorts.length,
    stationM: plan.station,
    chamberVolumeM3: plan.chamberV,
    totalTapAreaM2: plan.totalArea,
    arrayRotationDeg: plan.arrayPlacement?.solvedRotationDeg ?? null,
    cornerDriverCount: plan.drivers.filter(
      (driver) => driver.cornerPlate?.active,
    ).length,
  };
}

function manifoldSummary(diagnostics) {
  if (!diagnostics) return null;
  return {
    pass: diagnostics.pass === true,
    equalPath: diagnostics.equalPath === true,
    pathCount: diagnostics.pathCount
      ?? diagnostics.drivers?.flatMap((driver) => driver.paths || []).length
      ?? null,
    pathMismatchMm: Number.isFinite(diagnostics.pathMismatchM)
      ? diagnostics.pathMismatchM * 1000
      : null,
    minimumQuarterWaveHz: diagnostics.minimumQuarterWaveHz ?? null,
    maximumTapMach: diagnostics.drivers?.length
      ? Math.max(...diagnostics.drivers.map((driver) => driver.tapMach || 0))
      : null,
  };
}

function assemblySummary(audit) {
  if (!audit) return null;
  return {
    pass: audit.pass === true,
    cutterContinuous: audit.cutterContinuous === true,
    wallBesideCut: audit.wallBesideCut === true,
    integratedPlateConnected: audit.integratedPlateConnected !== false,
    integratedGasketSupported: audit.integratedGasketSupported !== false,
    failedRows: (audit.rows || [])
      .filter((row) => row.pass === false)
      .map((row) => row.name),
  };
}

function preflightSummary(preflight) {
  if (!preflight) return null;
  return {
    ok: preflight.ok === true,
    policyVersion: preflight.policyVersion,
    quality: preflight.quality,
    intent: preflight.intent,
    partCount: preflight.partCount,
    stepM: preflight.step,
    gridPoints: preflight.totals?.gridPoints ?? null,
    cells: preflight.totals?.cells ?? null,
    estimatedPeakBytes: preflight.totals?.estimatedPeakBytes ?? null,
    parts: (preflight.parts || []).map((part) => ({
      dims: part.dims,
      gridPoints: part.gridPoints,
      cells: part.cells,
    })),
  };
}

async function evaluateJob(job) {
  if (job.sourceHash !== workerSourceHash) {
    const error = new Error(
      "MEH engine sources changed after the runner created this batch",
    );
    error.code = "SOURCE_CHANGED_DURING_RUN";
    error.details = {
      coordinator: job.sourceHash,
      worker: workerSourceHash,
    };
    throw error;
  }
  const started = performance.now();
  const solved = engine.solve(job.state);
  const failures = failedRows(solved.ev?.rows);
  const solverValid = !solved.infeasible && failures.length === 0;
  const plan = solved.ev?.plan || null;
  let field = null;
  let assembly = null;
  let preflight = null;
  let stageError = null;
  if (solverValid && plan && ["field", "preflight"].includes(job.stage)) {
    try {
      field = engine.twoWaySolidField(plan);
      assembly = engine.assemblyAudit(plan, field);
      if (job.stage === "preflight" && assembly.pass === true) {
        preflight = engine.twoWayMeshPreflight(
          solved.S,
          "manufacturing-preview",
        );
      }
    } catch (error) {
      stageError = {
        name: error?.name || "Error",
        code: error?.code || null,
        message: error?.message || String(error),
        details: error?.details || null,
      };
    }
  }
  let preview = null;
  if (plan && job.preview) {
    preview = analyticPreview(plan, {
      axial: job.previewAxial,
      radial: job.previewRadial,
    });
  }
  const fieldPass = assembly ? assembly.pass === true : null;
  const status = !solverValid
    ? "solver-refused"
    : stageError
      ? job.stage === "preflight" && String(stageError.code || "")
        .startsWith("MESH_")
        ? "preflight-refused"
        : "stage-error"
      : fieldPass === false
        ? "field-refused"
        : "valid";
  const result = {
    runnerVersion,
    sourceHash: workerSourceHash,
    id: job.id,
    label: job.label,
    status,
    solver: {
      valid: solverValid,
      infeasible: Boolean(solved.infeasible),
      failures,
      adaptationLedger: solved.ledger || [],
    },
    solvedState: solved.S,
    solvedStateHash: engine.twoWayStateHash(solved.S),
    plan: plan ? summarizePlan(plan) : null,
    manifold: manifoldSummary(
      assembly?.driverManifoldDiagnostics
      || field?.driverManifoldDiagnostics,
    ),
    assembly: assemblySummary(assembly),
    preflight: preflightSummary(preflight),
    stageError,
    preview: preview?.descriptor || null,
    computeMs: performance.now() - started,
  };
  return { result, preview };
}

parentPort.on("message", async (job) => {
  try {
    const { result, preview } = await evaluateJob(job);
    const transfer = preview
      ? [preview.positions.buffer, preview.indices.buffer]
      : [];
    parentPort.postMessage({
      type: "result",
      token: job.token,
      result,
      positions: preview?.positions || null,
      indices: preview?.indices || null,
    }, transfer);
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      token: job.token,
      error: {
        name: error?.name || "Error",
        code: error?.code || null,
        message: error?.message || String(error),
        stack: error?.stack || null,
        details: error?.details || null,
      },
    });
  }
});

parentPort.postMessage({ type: "ready" });
