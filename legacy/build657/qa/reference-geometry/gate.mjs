#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  engine,
  fixtureMatchesScope,
  solveFixture
} from "./planner-adapter.mjs";
import {
  evaluatePlannerContract,
  summarizeMetric
} from "./metrics.mjs";
import { evaluateRenderDescriptor } from "./render-descriptor.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, "manifest.json");

function parseArguments(argv) {
  const options = {
    json: false,
    renderDescriptorPath: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") options.json = true;
    else if (value === "--render-descriptor") {
      options.renderDescriptorPath = argv[index + 1];
      index += 1;
    } else if (value === "--help" || value === "-h") {
      console.log("Usage: node gate.mjs [--json] [--render-descriptor descriptor.json]");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${value}`);
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function provenanceIndex(manifest) {
  return new Map(manifest.provenance.map((item) => [item.id, item]));
}

function verifyProvenanceFiles(manifest) {
  return manifest.provenance.flatMap((source) =>
    source.files
      .filter((filePath) => !fs.existsSync(filePath))
      .map((filePath) => ({
        source: source.id,
        label: source.label,
        filePath
      }))
  );
}

function plannerResults(manifest, sourceIndex) {
  const contracts = manifest.contracts.filter((contract) => !contract.scope?.descriptor);
  const results = [];
  for (const fixture of manifest.fixtures) {
    const solved = solveFixture(fixture);
    if (solved.infeasible || !solved.plan) {
      results.push({
        fixture: fixture.id,
        contract: "solver-validity",
        pass: false,
        provenance: ["manufacturing-invariants"],
        provenanceLabels: ["derived-engineering-invariant"],
        failures: solved.failures,
        metrics: {}
      });
      continue;
    }
    for (const contract of contracts) {
      if (!fixtureMatchesScope(fixture, contract.scope)) continue;
      const evaluation = evaluatePlannerContract(engine, solved, contract);
      results.push({
        fixture: fixture.id,
        contract: contract.id,
        pass: evaluation.pass,
        provenance: contract.provenance,
        provenanceLabels: contract.provenance.map((id) => sourceIndex.get(id)?.label || "unknown"),
        assertions: evaluation.assertions,
        metrics: summarizeMetric(evaluation.metrics)
      });
    }
  }
  return results;
}

function renderResults(manifest, sourceIndex, descriptorPath) {
  const contracts = manifest.contracts.filter((contract) => contract.scope?.descriptor);
  if (!descriptorPath) {
    return contracts.map((contract) => ({
      fixture: "render-descriptor",
      contract: contract.id,
      pass: null,
      skipped: true,
      reason: "no --render-descriptor JSON was supplied",
      provenance: contract.provenance,
      provenanceLabels: contract.provenance.map((id) => sourceIndex.get(id)?.label || "unknown")
    }));
  }
  const absolutePath = path.resolve(descriptorPath);
  const descriptor = readJson(absolutePath);
  return contracts.map((contract) => {
    const evaluation = evaluateRenderDescriptor(descriptor, contract);
    return {
      fixture: path.basename(absolutePath),
      contract: contract.id,
      pass: evaluation.pass,
      provenance: contract.provenance,
      provenanceLabels: contract.provenance.map((id) => sourceIndex.get(id)?.label || "unknown"),
      assertions: evaluation.assertions,
      metrics: summarizeMetric(evaluation.metrics)
    };
  });
}

function printHuman(report) {
  console.log(`REFERENCE GEOMETRY GATE · ${report.manifest}`);
  for (const item of report.results) {
    const status = item.skipped ? "SKIP" : item.pass ? "PASS" : "FAIL";
    const labels = [...new Set(item.provenanceLabels || [])].join(", ");
    console.log(`${status} ${item.fixture} :: ${item.contract} [${labels}]`);
    if (item.pass === false) {
      for (const check of item.assertions || []) {
        if (!check.pass) {
          console.log(
            `  ${check.name}: ${check.value} ${check.operator} ${check.limit} (${check.units})`
          );
        }
      }
      for (const failure of item.failures || []) {
        console.log(`  solver: ${failure.section}/${failure.name} = ${failure.value}`);
      }
    }
  }
  for (const warning of report.warnings) {
    console.warn(`WARN provenance file unavailable: ${warning.filePath} (${warning.source})`);
  }
  console.log(
    `SUMMARY ${report.summary.passed} passed · ${report.summary.failed} failed · ` +
    `${report.summary.skipped} skipped · ${report.summary.provenanceWarnings} provenance warnings`
  );
}

const options = parseArguments(process.argv.slice(2));
const manifest = readJson(manifestPath);
const sources = provenanceIndex(manifest);
const warnings = verifyProvenanceFiles(manifest);
const results = [
  ...plannerResults(manifest, sources),
  ...renderResults(manifest, sources, options.renderDescriptorPath)
];
const report = {
  schemaVersion: 1,
  manifest: path.relative(path.resolve(here, "../.."), manifestPath),
  method: manifest.method.kind,
  results,
  warnings,
  summary: {
    passed: results.filter((item) => item.pass === true).length,
    failed: results.filter((item) => item.pass === false).length,
    skipped: results.filter((item) => item.skipped).length,
    provenanceWarnings: warnings.length
  }
};

if (options.json) console.log(JSON.stringify(report, null, 2));
else printHuman(report);

if (report.summary.failed) process.exitCode = 1;
