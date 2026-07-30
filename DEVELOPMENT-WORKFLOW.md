# MEH Studio development workflow

Use Node for design search and law checking, exact CPU workers only for
surviving designs, and the browser last for UI/render verification. This keeps
normal iteration independent of Chromium, WebGL, cameras, and scene objects
without weakening the manufacturing gates.

## The short version

| Stage | Command | Purpose |
| --- | --- | --- |
| Fast parallel parametric trials | `node qa/perf/parametric-runner.mjs` | Browser-free worker pool, exact-field diagnostics, cache, and non-manufacturing preview artifacts |
| Targeted analytic test | `cd qa && npm run qa:corner-plates` or another focused script | Fastest feedback while editing one subsystem |
| Broad headless selection sweep | `cd qa && npm run qa:headless-sweep` | Exercise the exposed two-way selection matrix without a DOM or GPU |
| Resource-safe regression tier | `cd qa && npm run qa` | Cross-subsystem policy, placement, state, and source contracts |
| Exact survivor check | The focused exact test for the changed fixture | Generate and audit printable topology on CPU |
| Browser contract and inspection | `npm run qa:build652-delivery`, `npm run qa:build652-six-ui`, then render inspection | Verify real UI state, WebGL scene semantics, cameras, and appearance |
| Final serialized gate | `cd qa && npm run qa:release` | Replay the complete current Node, exact, and browser admission sequence |

Do not run the full release tier, an exact export, and browser visual QA in
parallel. Exact meshing is bounded, but it intentionally uses substantial CPU
and memory.

## Why trials start outside the browser

`setting_sweep.js` loads the same `profile-laws.js`, `engine.js`, and
`twoway-core.js` used by the application. It reads the current driver and
source preset tables from `shell.html`, but it does not create a DOM, a
Three.js renderer, a WebGL context, a camera, a scene graph, or a GPU resource.

The sweep currently evaluates 210 two-way scenarios across:

- panel counts 2, 4, and 6;
- radial counts 2 through 8;
- one or two taps, round/oval/slot apertures, and integrated/cartridge intent;
- automatic and manual array rotation;
- radial reach and extended-manifold distance/axis blending;
- every LF driver and compression-driver preset;
- smooth/angular form, section exponent, and coverage combinations;
- exploratory mouth, crossover, and `Sd/Ap` requests; and
- the documented Hinson and JMOD records.

Each scenario runs the coupled analytic solve and requires either a complete
plan with the requested driver/tap counts or a named law refusal. That makes
it useful for eliminating bad candidates before any render or lattice exists.
It does not prove watertightness, STL validity, scene-layer correctness, or
visual quality.

The full sweep is not an every-keystroke smoke test. Smart Adapt performs a
branch-heavy bounded search, so use the smallest relevant Node contract during
an edit and run the 210-scenario sweep after a coherent change.

## Measured headless timing

One pre-final Build 652 development-snapshot run on this ARM64 Mac, macOS
26.5.1, Node v24.18.0:

```text
scenarios  210
refusals    18
failures     0
wall       313.60 s
user CPU   314.88 s
system CPU   1.56 s
```

The command was:

```bash
/usr/bin/time -lp node setting_sweep.js
```

The Node child printed `SETTING SWEEP PASS`. Afterward, the sandbox denied
`/usr/bin/time -l` access to `sysctl kern.clockrate`, so peak RSS was not
captured and the timing wrapper itself returned nonzero. No exact mesh, DOM,
browser, or WebGL context was created.

This benchmark demonstrates isolation and deterministic batch coverage, not
instantaneous search. Independent analytic scenarios could later be sharded
across a small Node worker/process pool. Keep exact jobs serialized unless a
new aggregate memory budget proves parallel execution safe.

That sharded development path now exists as an isolated proof of concept in
`qa/perf/`. On this 15-logical-CPU, 24 GiB ARM64 Mac its built-in 12-state
exact-field matrix measured 2,168 ms with one worker, 598 ms with the bounded
eight-worker pool, and about 43 ms process wall time on a warm
content-addressed cache. The runner deliberately stops before exact lattice
meshing and marks its OBJ previews as non-manufacturing. See
`qa/perf/PARAMETRIC-RUNNER-DESIGN.md` for commands, cache/source identity,
truth boundaries, and the WebGPU roadmap.

## What remains CPU-exact

The manufacturing path is currently a sequential, one-shot CPU pipeline:

1. `twoway-mesh-worker.js` runs exact preflight and `twoWayGeometry()`, samples
   the implicit solid, and creates packed vertex/index buffers.
2. That worker terminates before `twoway-audit-worker.js` reconstructs the
   parts and runs `fabricationAudit()`, including topology/connectivity checks
   and the deeper export audit.
3. The audit worker terminates before `twoway-output-worker.js` builds render
   normals or binary STL output.

The browser coordinates these worker phases, but it does not move them onto
the GPU. Node exact regressions exercise the same CPU geometry contracts.
Typed buffers, one active phase, fixed grid/buffer limits, provenance checks,
and fail-closed results are part of the resource and correctness model.

An analytic preview or successful headless solve is therefore not an exact
manufacturing result. Only the exact mesh plus its passing audit may reach STL
output.

## Where GPU acceleration could help later

Good future compute candidates are the regular, data-parallel portions:

- evaluating the implicit field over a fixed lattice;
- classifying cells and generating edge-intersection candidates;
- prefix-sum/compaction stages for packed mesh output; and
- preview-only normal generation and large inspection rendering.

The branch-heavy Smart Adapt search, named refusal logic, ownership rules,
state migration, and many global topology audits are poor first GPU targets.
Connectivity, duplicate/over-shared-edge detection, deterministic component
ownership, deep self-intersection auditing, and STL provenance should remain
CPU-authoritative until a GPU implementation is independently proven
deterministic.

A future WebGPU mesher must still return content-bound buffers to the existing
CPU audit. GPU speed must not bypass policy versioning, state fingerprints,
grid limits, exact refusal, or source/hash reproducibility.

## The browser's final role

The browser is intentionally the last stage because only it can verify:

- URL build assertion, reset ordering, saved-state persistence, and control
  event wiring;
- the actual Three.js/WebGL scene, materials, layer visibility, cameras,
  clipping, lighting, and driver/no-driver inspection modes;
- correspondence between solved plans and visible plate/tap/manifold objects;
- worker lifecycle and stale-result rejection in the real page; and
- human-visible defects such as gaps, protrusions, internal layers, z-fighting,
  bad framing, or misleading geometry.

Use Playwright contracts for repeatable browser semantics, then inspect the
small set of surviving renders manually. The browser is the product and the
final visual witness; it is not the most efficient parameter-search engine.

## Recommended edit loop

```bash
# 1. Run the focused contract for the subsystem being edited.
cd qa
npm run qa:corner-plates

# 2. After the focused contract passes, sweep all exposed analytic choices.
npm run qa:headless-sweep

# 3. Run the resource-safe cross-subsystem tier.
npm run qa

# 4. Run only the relevant exact witness on surviving states.
# Exact witnesses are fixture-specific; select one from qa/README.md.

# 5. Finish with current browser identity/state contracts and visual review.
npm run qa:build652-delivery
npm run qa:build652-six-ui

# 6. After final source assembly, run the complete serialized release tier.
npm run qa:release
```

If an analytic law refuses, fix the state or the law before rendering. If an
exact test fails, do not treat a smooth preview as evidence that the part is
printable. If the browser looks wrong, capture the exact state/view and add a
focused browser contract before changing geometry.
