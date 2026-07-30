#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, "parametric-runner.mjs");

function parseArgs(argv) {
  const options = {
    limit: 12,
    stage: "field",
    workers: "auto",
    output: path.join(here, "benchmark-output"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") options.limit = Number(argv[++index]);
    else if (arg === "--stage") options.stage = argv[++index];
    else if (arg === "--workers") options.workers = argv[++index];
    else if (arg === "--output") options.output = path.resolve(argv[++index]);
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  if (!["solve", "field", "preflight"].includes(options.stage)) {
    throw new Error("--stage must be solve, field, or preflight");
  }
  return options;
}

function usage() {
  return `Usage:
  node qa/perf/benchmark.mjs [--limit N] [--stage NAME]
    [--workers N|auto] [--output DIR]

Measures cold serial, cold worker-pool, and warm persistent-cache runs. Exact
meshing is deliberately excluded.
`;
}

function run(label, options, workers, cacheName, outputName) {
  const output = path.join(options.output, outputName);
  const cache = path.join(options.output, cacheName);
  const args = [
    runner,
    "--stage", options.stage,
    "--limit", String(options.limit),
    "--workers", String(workers),
    "--no-preview",
    "--output", output,
    "--cache", cache,
    "--quiet",
  ];
  const started = process.hrtime.bigint();
  const child = spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const wallMs = Number(process.hrtime.bigint() - started) / 1e6;
  if (child.status !== 0) {
    throw new Error(
      `${label} failed (${child.status})\n${child.stdout}\n${child.stderr}`,
    );
  }
  const manifest = JSON.parse(
    fs.readFileSync(path.join(output, "manifest.json"), "utf8"),
  );
  return {
    label,
    wallMs,
    runnerElapsedMs: manifest.summary.elapsedMs,
    aggregateWorkerComputeMs: manifest.summary.aggregateWorkerComputeMs,
    computedStates: manifest.summary.computedStates,
    cacheHitScenarios: manifest.summary.cacheHitScenarios,
    statusCounts: manifest.summary.statusCounts,
    manifest: path.join(output, "manifest.json"),
  };
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  process.stdout.write(usage());
  process.exit(0);
}
fs.mkdirSync(options.output, { recursive: true });
const serial = run("cold-serial", options, 1, "serial-cache", "serial");
const parallel = run(
  "cold-worker-pool",
  options,
  options.workers,
  "parallel-cache",
  "parallel",
);
const warm = run(
  "warm-cache",
  options,
  options.workers,
  "parallel-cache",
  "warm",
);
const report = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  logicalCpuCount: typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length,
  totalMemoryBytes: os.totalmem(),
  stage: options.stage,
  scenarios: options.limit,
  exactMeshCreated: false,
  runs: { serial, parallel, warm },
  ratios: {
    coldParallelSpeedup: ratio(serial.wallMs, parallel.wallMs),
    warmVsColdParallelSpeedup: ratio(parallel.wallMs, warm.wallMs),
  },
  interpretation: [
    "Cold serial versus cold worker-pool isolates analytic parallelism.",
    "Warm cache includes process startup, source hashing, cache reads, and manifest output.",
    "These timings do not predict exact meshing, deep topology audit, STL output, or browser rendering.",
  ],
};
const reportFile = path.join(options.output, "benchmark.json");
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
