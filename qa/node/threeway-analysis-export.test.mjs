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
const exporter = require(path.join(
  appRoot, "threeway-analysis-export.js"));

function fixture() {
  const hash = "meh3-state-v2.topology-v1\n{\"designId\":\"d1\"}";
  return {
    build: "654-dev",
    stateHash: hash,
    state: {
      schemaVersion: 2,
      designId: "design/report 1",
      revision: 3,
      topology: { kind: "T3", schemaVersion: 1 },
      provenance: {
        records: [
          {
            id: "prov-source",
            classification: "documented",
            sourceUrl: "https://example.invalid/source",
          },
        ],
      },
      research: { referenceCardIds: ["patent-t3-generic"] },
    },
    solution: {
      schemaVersion: 2,
      inputHash: hash,
      readiness: { analysis: true, manufacturing: false },
      diagnostics: [],
      solvedEntryStations: [],
      manufacturingPlan: null,
    },
    moduleManifest: [
      { id: "threeway-state-contract", version: 2 },
      { id: "threeway-acoustics", version: 1 },
    ],
    limitations: ["not hardware validated"],
  };
}

test("analysis JSON is deterministic, immutable, and keeps provenance", () => {
  const input = fixture();
  const before = structuredClone(input);
  const left = exporter.buildAnalysisReport(input);
  const rightInput = fixture();
  rightInput.moduleManifest.reverse();
  rightInput.moduleManifest.reverse();
  const right = exporter.buildAnalysisReport(rightInput);

  assert.deepEqual(input, before);
  assert.equal(left.ok, true);
  assert.equal(left.text, right.text);
  assert.equal(left.report.design.topology, "T3");
  assert.equal(left.report.design.inputHash, input.stateHash);
  assert.equal(left.report.provenance.records.length, 1);
  assert.equal(left.report.exportCapabilities.jsonAnalysis, true);
  assert.equal(left.report.exportCapabilities.hornresp, false);
  assert.equal(left.report.exportCapabilities.manufacturing, false);
  assert.match(left.filename,
    /^MEH3-T3-design-report-1-analysis\.json$/);
  assert.ok(Object.isFrozen(left));
  assert.ok(Object.isFrozen(left.report.solution));
});

test("state/solution hash mismatch fails closed", () => {
  const input = fixture();
  input.solution.inputHash = "different";
  const result = exporter.buildAnalysisReport(input);
  assert.equal(result.ok, false);
  assert.equal(result.code, "THREEWAY_ANALYSIS_REPORT_HASH_MISMATCH");
});

test("missing schema-2 state or solution is refused", () => {
  const noState = fixture();
  delete noState.state.topology;
  assert.equal(
    exporter.buildAnalysisReport(noState).code,
    "THREEWAY_ANALYSIS_REPORT_STATE_INVALID",
  );
  const noSolution = fixture();
  noSolution.solution.schemaVersion = 1;
  assert.equal(
    exporter.buildAnalysisReport(noSolution).code,
    "THREEWAY_ANALYSIS_REPORT_SOLUTION_INVALID",
  );
});

test("nonfinite and runtime values cannot disappear into a report", () => {
  const infinite = fixture();
  infinite.solution.value = Infinity;
  const badNumber = exporter.buildAnalysisReport(infinite);
  assert.equal(badNumber.ok, false);
  assert.equal(badNumber.code,
    "THREEWAY_ANALYSIS_REPORT_NONFINITE_VALUE");
  assert.ok(badNumber.details.invalidPaths.includes(
    "$.solution.value"));

  const callable = fixture();
  callable.solution.callback = () => 1;
  assert.equal(
    exporter.buildAnalysisReport(callable).code,
    "THREEWAY_ANALYSIS_REPORT_NONFINITE_VALUE",
  );
});

test("all topology-specific Hornresp mappings remain truthfully unavailable", () => {
  for (const topology of ["T3", "CX3", "H3", "COMPOUND_RESEARCH"]) {
    const result = exporter.hornrespPreflight(topology);
    assert.equal(result.ok, false);
    assert.equal(result.code,
      "THREEWAY_HORNRESP_MAPPING_UNAVAILABLE");
    assert.ok(result.details.blockers.length >= 3);
  }
  const incomplete = exporter.hornrespPreflight("T3", {
    missingPaths: ["sources.low.ts", "entryStations.mid.passage"],
  });
  assert.equal(incomplete.code,
    "THREEWAY_HORNRESP_INPUT_INCOMPLETE");
  assert.deepEqual(incomplete.details.missingPaths, [
    "entryStations.mid.passage", "sources.low.ts",
  ]);
});

test("manufacturing export is independently fail-closed", () => {
  const result = exporter.manufacturingPreflight("stl");
  assert.equal(result.ok, false);
  assert.equal(result.code, "THREEWAY_MANUFACTURING_UNAVAILABLE");
  assert.equal(result.manufacturing, false);
});

test("UMD browser path exposes report and preflight APIs", () => {
  const source = fs.readFileSync(
    path.join(appRoot, "threeway-analysis-export.js"), "utf8");
  const context = { globalThis: {} };
  vm.runInNewContext(source, context);
  const api = context.globalThis.MEH3AnalysisExport;
  assert.equal(typeof api.buildAnalysisReport, "function");
  assert.equal(typeof api.hornrespPreflight, "function");
});
