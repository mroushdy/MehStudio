#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import {
  atomicWrite,
  builtInScenarios,
  cacheKey,
  float32FromBuffer,
  packedPreviewToObj,
  qaRoot,
  readScenarioFile,
  runnerVersion,
  safeFileStem,
  sourceDigest,
  uint32FromBuffer,
} from "./runner-lib.mjs";

function usage() {
  return `MEH Studio browser-independent parametric runner

Usage:
  node qa/perf/parametric-runner.mjs [options]

Options:
  --input FILE           JSON array/{scenarios:[...]} or JSONL input
  --stage NAME           solve | field | preflight (default: field)
  --workers N|auto       analytic worker count (default: auto)
  --limit N              limit built-in or input scenarios
  --output DIR           manifests and preview artifacts
  --cache DIR            persistent content-addressed cache
  --no-cache             bypass persistent cache
  --no-preview           skip browser-free OBJ preview generation
  --preview-axial N      uniform axial subdivisions (default: 24)
  --preview-radial N     circumferential subdivisions (default: 48)
  --json                 print complete manifest to stdout
  --quiet                suppress progress lines
  --help                 show this help

Stages:
  solve       coupled analytic solver only
  field       solve + exact implicit-field/assembly diagnostics
  preflight   field diagnostics + bounded manufacturing preflight; no mesh

This runner never creates a DOM, browser, WebGL context, or exact mesh. OBJ
files are analytic review surfaces and are never manufacturing evidence.
`;
}

function smartWorkerCount() {
  const cores = typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length;
  const memoryBound = Math.max(
    1,
    Math.floor(os.totalmem() / (768 * 1024 * 1024)),
  );
  return Math.max(1, Math.min(8, Math.max(1, cores - 1), memoryBound));
}

function parseArgs(argv) {
  const options = {
    stage: "field",
    workers: "auto",
    limit: Infinity,
    output: path.join(qaRoot, "perf", "out"),
    cache: path.join(qaRoot, "perf", ".cache"),
    useCache: true,
    preview: true,
    previewAxial: 24,
    previewRadial: 48,
    json: false,
    quiet: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") options.input = argv[++index];
    else if (arg === "--stage") options.stage = argv[++index];
    else if (arg === "--workers") options.workers = argv[++index];
    else if (arg === "--limit") options.limit = Number(argv[++index]);
    else if (arg === "--output") options.output = argv[++index];
    else if (arg === "--cache") options.cache = argv[++index];
    else if (arg === "--no-cache") options.useCache = false;
    else if (arg === "--no-preview") options.preview = false;
    else if (arg === "--preview-axial") {
      options.previewAxial = Number(argv[++index]);
    } else if (arg === "--preview-radial") {
      options.previewRadial = Number(argv[++index]);
    } else if (arg === "--json") options.json = true;
    else if (arg === "--quiet") options.quiet = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!["solve", "field", "preflight"].includes(options.stage)) {
    throw new Error(`invalid stage: ${options.stage}`);
  }
  if (!Number.isFinite(options.limit) && options.limit !== Infinity) {
    throw new Error("--limit must be a non-negative integer");
  }
  if (
    options.limit !== Infinity
    && (options.limit < 0 || !Number.isInteger(options.limit))
  ) {
    throw new Error("--limit must be a non-negative integer");
  }
  for (const field of ["previewAxial", "previewRadial"]) {
    if (!Number.isInteger(options[field]) || options[field] < 1) {
      throw new Error(`--${field === "previewAxial"
        ? "preview-axial"
        : "preview-radial"} must be a positive integer`);
    }
  }
  if (options.workers !== "auto") {
    options.workers = Number(options.workers);
    if (!Number.isInteger(options.workers) || options.workers < 1) {
      throw new Error("--workers must be auto or a positive integer");
    }
  }
  options.workers = options.workers === "auto"
    ? smartWorkerCount()
    : Math.min(32, options.workers);
  options.output = path.resolve(options.output);
  options.cache = path.resolve(options.cache);
  if (options.input) options.input = path.resolve(options.input);
  return options;
}

function cachePaths(root, key) {
  return {
    json: path.join(root, `${key}.json`),
    positions: path.join(root, `${key}.positions.f32`),
    indices: path.join(root, `${key}.indices.u32`),
  };
}

async function loadCache(root, key, expected) {
  const files = cachePaths(root, key);
  let record;
  try {
    record = JSON.parse(await fs.promises.readFile(files.json, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  if (
    record.runnerVersion !== runnerVersion
    || record.sourceHash !== expected.sourceHash
    || record.cacheKey !== key
    || Boolean(record.preview) !== Boolean(expected.preview)
  ) return null;
  let positions = null;
  let indices = null;
  if (expected.preview) {
    try {
      [positions, indices] = await Promise.all([
        fs.promises.readFile(files.positions).then(float32FromBuffer),
        fs.promises.readFile(files.indices).then(uint32FromBuffer),
      ]);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    if (
      positions.length !== record.preview.positions
      || indices.length !== record.preview.indices
    ) return null;
  }
  return { result: record.result, positions, indices };
}

async function saveCache(root, key, sourceHash, payload) {
  const files = cachePaths(root, key);
  if (payload.positions && payload.indices) {
    await Promise.all([
      atomicWrite(
        files.positions,
        Buffer.from(
          payload.positions.buffer,
          payload.positions.byteOffset,
          payload.positions.byteLength,
        ),
      ),
      atomicWrite(
        files.indices,
        Buffer.from(
          payload.indices.buffer,
          payload.indices.byteOffset,
          payload.indices.byteLength,
        ),
      ),
    ]);
  }
  await atomicWrite(files.json, `${JSON.stringify({
    runnerVersion,
    sourceHash,
    cacheKey: key,
    createdAt: new Date().toISOString(),
    preview: payload.positions && payload.indices
      ? {
        positions: payload.positions.length,
        indices: payload.indices.length,
      }
      : null,
    result: payload.result,
  }, null, 2)}\n`);
}

function runPool(jobs, workerCount, onResult) {
  if (!jobs.length) return Promise.resolve();
  const size = Math.min(workerCount, jobs.length);
  const workerUrl = new URL("./parametric-worker.mjs", import.meta.url);
  return new Promise((resolve, reject) => {
    const workers = [];
    let next = 0;
    let complete = 0;
    let finished = false;
    const stop = async (error) => {
      if (finished) return;
      finished = true;
      await Promise.allSettled(workers.map((worker) => worker.terminate()));
      if (error) reject(error);
      else resolve();
    };
    const dispatch = (worker) => {
      if (next >= jobs.length) return;
      const job = jobs[next++];
      worker.__activeToken = job.token;
      worker.postMessage(job);
    };
    for (let index = 0; index < size; index += 1) {
      const worker = new Worker(workerUrl, { type: "module" });
      workers.push(worker);
      worker.on("message", async (message) => {
        if (finished) return;
        if (message.type === "ready") {
          dispatch(worker);
          return;
        }
        if (!["result", "error"].includes(message.type)) return;
        try {
          await onResult(message);
        } catch (error) {
          await stop(error);
          return;
        }
        complete += 1;
        worker.__activeToken = null;
        if (complete === jobs.length) await stop();
        else dispatch(worker);
      });
      worker.on("error", (error) => stop(error));
      worker.on("exit", (code) => {
        if (!finished && code !== 0 && worker.__activeToken) {
          stop(new Error(
            `worker exited ${code} while evaluating ${worker.__activeToken}`,
          ));
        }
      });
    }
  });
}

async function writePreviewArtifacts(
  options,
  scenario,
  key,
  payload,
  sourceHash,
) {
  if (!options.preview || !payload.positions || !payload.indices) return null;
  const stem = `${safeFileStem(scenario.id)}-${key.slice(0, 12)}`;
  const directory = path.join(options.output, "previews");
  const obj = path.join(directory, `${stem}.obj`);
  const descriptor = path.join(directory, `${stem}.json`);
  await Promise.all([
    atomicWrite(
      obj,
      packedPreviewToObj(payload.positions, payload.indices, {
        stateHash: payload.result.solvedStateHash,
        sourceHash,
      }),
    ),
    atomicWrite(descriptor, `${JSON.stringify({
      kind: "MEH analytic review preview",
      manufacturingEvidence: false,
      id: scenario.id,
      label: scenario.label,
      sourceHash,
      solvedStateHash: payload.result.solvedStateHash,
      obj: path.basename(obj),
      ...payload.result.preview,
    }, null, 2)}\n`),
  ]);
  return {
    obj: path.relative(options.output, obj),
    descriptor: path.relative(options.output, descriptor),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const sourceHash = sourceDigest();
  const inputRows = options.input
    ? await readScenarioFile(options.input)
    : builtInScenarios(options.limit);
  const scenarios = options.input
    ? inputRows.slice(0, options.limit)
    : inputRows;
  if (!scenarios.length) throw new Error("no scenarios selected");
  await fs.promises.mkdir(options.output, { recursive: true });
  if (options.useCache) await fs.promises.mkdir(options.cache, { recursive: true });

  const started = performance.now();
  const groups = new Map();
  scenarios.forEach((scenario, index) => {
    const key = cacheKey({
      sourceHash,
      stage: options.stage,
      preview: options.preview,
      previewAxial: options.previewAxial,
      previewRadial: options.previewRadial,
      state: scenario.state,
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...scenario, index, key });
  });
  const payloads = new Map();
  const jobs = [];
  let cacheHits = 0;
  for (const [key, rows] of groups) {
    const cached = options.useCache
      ? await loadCache(options.cache, key, {
        sourceHash,
        preview: options.preview,
      })
      : null;
    if (cached) {
      payloads.set(key, { ...cached, cacheHit: true });
      cacheHits += rows.length;
      continue;
    }
    const first = rows[0];
    jobs.push({
      token: key,
      sourceHash,
      id: first.id,
      label: first.label,
      state: first.state,
      stage: options.stage,
      preview: options.preview,
      previewAxial: options.previewAxial,
      previewRadial: options.previewRadial,
    });
  }

  if (!options.quiet && !options.json) {
    process.stdout.write(
      `MEH runner ${runnerVersion} · ${scenarios.length} scenarios · `
      + `${jobs.length} compute · ${cacheHits} cached · `
      + `${Math.min(options.workers, Math.max(1, jobs.length))} workers\n`,
    );
  }

  await runPool(jobs, options.workers, async (message) => {
    if (message.type === "error") {
      payloads.set(message.token, {
        cacheHit: false,
        positions: null,
        indices: null,
        result: {
          runnerVersion,
          status: "runner-error",
          stageError: message.error,
        },
      });
      return;
    }
    const payload = {
      cacheHit: false,
      result: message.result,
      positions: message.positions,
      indices: message.indices,
    };
    payloads.set(message.token, payload);
    if (options.useCache) {
      await saveCache(options.cache, message.token, sourceHash, payload);
    }
  });

  const results = new Array(scenarios.length);
  for (const [key, rows] of groups) {
    const payload = payloads.get(key);
    if (!payload) throw new Error(`missing result for ${key}`);
    for (const scenario of rows) {
      const artifacts = await writePreviewArtifacts(
        options,
        scenario,
        key,
        payload,
        sourceHash,
      );
      results[scenario.index] = {
        ...payload.result,
        id: scenario.id,
        label: scenario.label,
        cacheKey: key,
        cacheHit: payload.cacheHit,
        artifacts,
      };
    }
  }
  const elapsedMs = performance.now() - started;
  const counts = results.reduce((record, result) => {
    record[result.status] = (record[result.status] || 0) + 1;
    return record;
  }, {});
  const manifest = {
    schemaVersion: 1,
    runnerVersion,
    createdAt: new Date().toISOString(),
    browserCreated: false,
    webglCreated: false,
    exactMeshCreated: false,
    manufacturingEvidence: false,
    sourceHash,
    options: {
      stage: options.stage,
      workers: options.workers,
      preview: options.preview,
      previewAxial: options.previewAxial,
      previewRadial: options.previewRadial,
      cache: options.useCache,
    },
    summary: {
      scenarios: results.length,
      uniqueStates: groups.size,
      computedStates: jobs.length,
      cacheHitScenarios: cacheHits,
      elapsedMs,
      aggregateWorkerComputeMs: results
        .filter((result) => !result.cacheHit)
        .reduce((sum, result) => sum + (result.computeMs || 0), 0),
      statusCounts: counts,
    },
    results,
  };
  const manifestFile = path.join(options.output, "manifest.json");
  await atomicWrite(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  if (options.json) process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  else if (!options.quiet) {
    process.stdout.write(
      `complete ${elapsedMs.toFixed(1)} ms · ${JSON.stringify(counts)} · `
      + `${manifestFile}\n`,
    );
  }
  if (results.some((result) => result.status === "runner-error")) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
