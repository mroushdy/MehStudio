# Browser-independent parametric iteration runner

Status: runnable proof of concept. It is isolated under `qa/perf`; it does not
modify Build 652 application sources or the exact manufacturing workers.

## Result

The runner evaluates independent MEH states in a bounded Node worker pool,
uses the same `profile-laws.js`, `engine.js`, and `twoway-core.js` as the
product, persists results in a source-bound content-addressed cache, and can
emit a small canonical OBJ review surface without opening Chromium or creating
a DOM, Three.js scene, WebGL context, camera, or exact mesh.

On the development Mac available during this proof (Apple ARM64, Node
v24.18.0, 15 logical CPUs, 24 GiB RAM), the built-in 12-state `field` matrix
measured:

| Run | Wall time | Outcome |
| --- | ---: | --- |
| Cold, one worker | 2168 ms | 11 valid, 1 exact-field refusal |
| Cold, automatic pool (8 workers) | 598 ms | same ordered results |
| Warm, persistent cache | 43 ms process wall / 2 ms runner wall | same ordered results |

That is a 3.62× cold speedup and a 14.0× warm-versus-cold-pool speedup for this
small matrix. These are development measurements, not release thresholds.
They exclude exact lattice meshing, deep topology audit, STL output, and
browser rendering.

The `field` tier is important: it caught a printed-manifold failure that the
ordinary solver admitted. A fast runner must not optimize only the cheapest
law pass and then assume the 3-D passages are valid.

## Commands

From `application/v5`:

```bash
# Solve + exact implicit-field/assembly diagnostics, previews, smart pool.
node qa/perf/parametric-runner.mjs

# Fastest law/placement pass only.
node qa/perf/parametric-runner.mjs --stage solve --no-preview

# Add bounded exact-mesh preflight, but do not allocate an exact mesh.
node qa/perf/parametric-runner.mjs --stage preflight --no-preview

# Evaluate a JSON array, {"scenarios": [...]}, or JSONL file.
node qa/perf/parametric-runner.mjs \
  --input /absolute/path/states.jsonl \
  --stage field \
  --workers auto \
  --output /absolute/path/results

# Reproduce the serial/pool/cache comparison.
node qa/perf/benchmark.mjs --stage field --limit 12 --workers auto

# Contract test.
node --test qa/perf/parametric-runner.test.mjs
```

Every input row may be a raw state or:

```json
{
  "id": "six-woofer-osse",
  "label": "Six woofer OS-SE trial",
  "state": {
    "topo": "2way",
    "twoArch": "panel"
  }
}
```

The state must still be complete enough for the normal engine migration and
solver. The runner does not invent missing driver evidence.

## Pipeline

```text
JSON / JSONL / built-in matrix
              |
              v
  canonical request + source hash
              |
       cache hit? ---- yes ----> ordered manifest + optional OBJ
              |
              no
              v
     bounded worker-thread pool
              |
       deterministic engine.solve
              |
     optional exact solid field
       + assembly diagnostics
              |
     optional mesh preflight only
              |
     transferable preview buffers
              |
       atomic cache publication
              |
       ordered manifest + OBJ
```

Jobs finish out of order but are reassembled in input order. Identical requests
are deduplicated before dispatch. Preview `Float32Array` and `Uint32Array`
buffers are transferred rather than copied from workers.

## Stages and truth boundaries

### `solve`

Runs the coupled analytic solver. It is appropriate for broad search,
adaptation experiments, and rejection by named laws. It is not proof that tap
lumens, plates, or the final printed manifold are valid.

### `field` (default)

Runs `twoWaySolidField()` and `assemblyAudit()` after a valid solve. This
checks the canonical passages and structural ownership without sampling a
large lattice. It reports manifold path count/mismatch, quarter-wave and Mach
evidence, lumen continuity, wall web, integrated plate connection, and gasket
support.

This is the preferred iteration stage for geometry changes because it remains
browser-free and catches a class of defects that `solve` alone cannot see.

### `preflight`

Adds `twoWayMeshPreflight(..., "manufacturing-preview")` only after the field
audit passes. It resolves bounded grids, part count, allocation limits, and
manufacturing admission without constructing the exact mesh.

### Deliberately absent: batch exact meshing

The current exact mesh/audit/output chain remains serialized and one-shot, as
required by `DEVELOPMENT-WORKFLOW.md`. A successful runner result merely
selects survivors. It must feed the existing packed mesh worker, then the
separate CPU audit worker, then output. An OBJ from this runner is explicitly
marked `manufacturingEvidence: false`.

## Cache and reproducibility

The cache key includes:

- runner schema/version;
- SHA-256 over `profile-laws.js`, `engine.js`, and `twoway-core.js`;
- requested state with sorted keys and type-preserving numeric encoding;
- stage;
- preview on/off and preview resolution.

Workers independently hash those same sources. If the files change between
coordinator startup and worker execution, the job fails with
`SOURCE_CHANGED_DURING_RUN`; it cannot publish a mixed-source cache entry.

Cache files are written through a temporary file and renamed only when
complete. The JSON record is published after optional preview buffers, so a
partially written preview cannot become a hit. Exact meshes and STL bytes are
not cached by this proof.

The current cache is conservative: states that migrate to the same settled
state can occupy separate entries. A later version may add a second alias from
the requested key to `twoWayStateHash(solvedState)`, but only after collision
and intent-preservation tests.

## Preview artifact

`analyticPreview()` samples `engine.twoWaySectionPoint()` at bounded axial and
circumferential stations. It includes the inner surface, wall-offset outer
surface, and throat/mouth closure rings. This is the same canonical section
authority used by the application’s analytic horn surface, at a deliberately
smaller review resolution.

It does not contain:

- Boolean tap cuts;
- front chambers;
- mounting lands, drivers, fasteners, or gaskets;
- exact component ownership;
- sampled-lattice artifacts;
- topology or STL certification.

Its purpose is rapid shape comparison in Blender, CAD viewers, scripts, or a
future lightweight native viewer. Manifests and OBJ headers state that it is
not manufacturing evidence.

## Resource policy

Automatic worker count is:

```text
min(8, logical CPUs - 1, floor(total RAM / 768 MiB)), at least 1
```

The cap avoids saturating a workstation merely because it has many efficiency
cores. Users can override it up to 32 for controlled benchmarks. This pool is
for solve/field/preflight jobs only.

Exact meshes can consume hundreds of megabytes each and must not use this
general pool. A future survivor queue should default to one exact job at a
time and increase concurrency only after measuring aggregate peak RSS against
the existing policy limits.

## Benchmark and admission plan

Performance work must keep correctness comparisons first:

1. Pin Node version, source hash, machine model, logical CPUs, and RAM.
2. Run cold serial, then cold pools of 2, 4, 6, and 8 workers.
3. Run the same matrix warm from cache.
4. Compare ordered status, settled-state hash, named failures, path mismatch,
   plan counts, and preview buffer hashes across every run.
5. Record wall time, aggregate worker CPU time, throughput, p50/p95 job time,
   cache hit rate, process max RSS, and per-worker max RSS.
6. Repeat the 12-state smoke matrix and the existing 210-scenario selection
   sweep. Do not run exact or browser gates concurrently with this benchmark.
7. Select a small set of valid survivors and run the existing serialized
   exact certificate.
8. Finish with current Playwright contracts and manual render inspection.

The proof currently records wall and aggregate worker compute time. Per-worker
RSS and percentile reporting are the next instrumentation increment.

## Future WebGPU path

The first GPU target should be the regular lattice work, not the acoustic
solver or policy logic:

1. CPU migrates and solves the state, builds the canonical field description,
   applies named-law refusal, and fixes bounds and allocation limits.
2. A WebGPU compute pass evaluates field values over the fixed lattice.
3. A second pass classifies active cells and emits bounded counts.
4. Prefix-sum/compaction assigns deterministic output slots.
5. Edge-intersection and triangle passes fill packed position/index buffers.
6. Buffers return with state hash, policy version, grid descriptor, counts,
   and a content hash.
7. The existing CPU topology/connectivity/self-intersection audit remains
   authoritative before STL output.

Required gates before GPU output can be trusted:

- CPU/GPU sign classification agreement at section, tap, chamber, plate, and
  gasket witnesses;
- deterministic handling of zero, NaN, infinities, and near-surface values;
- stable triangle ownership and winding, or a canonical CPU reordering step;
- hard buffer and dispatch limits before allocation;
- stale-job cancellation and provenance checks identical to current workers;
- cross-device golden meshes and independent CPU audit;
- automatic CPU fallback on adapter/limit mismatch.

Smart Adapt, source migration, named refusals, path ownership, component
classification, deep self-intersection audit, and STL provenance should remain
CPU-authoritative. GPU speed is useful only if it feeds, rather than bypasses,
the manufacturing gates.

## Proof files

- `parametric-runner.mjs` — CLI, worker pool, cache, ordering, artifacts.
- `parametric-worker.mjs` — deterministic solve/field/preflight worker.
- `runner-lib.mjs` — source hashing, input parsing, preview mesh, OBJ writer.
- `benchmark.mjs` — cold serial / cold pool / warm cache comparison.
- `parametric-runner.test.mjs` — browser-free, deterministic-cache contract.

