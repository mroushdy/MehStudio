# MEH Studio manufacturing and visual QA

This directory is an isolated QA harness for the two-way MEH engine. It does not modify or duplicate the geometry engine. The dependency-free gates run against `../engine.js` with the Node runtime already used by the project.

The first usable tier separates three questions that must never be conflated:

1. Does the solver produce a complete, deterministic plan or a stable named refusal?
2. Does the implicit geometry retain every raw component and produce the declared printable parts?
3. Does the resulting mesh pass independent topology, assembly-connectivity, and binary-STL checks?

The staged edit loop, measured headless-sweep timing, exact CPU boundary, GPU
opportunities, and final browser role are documented in
[`../DEVELOPMENT-WORKFLOW.md`](../DEVELOPMENT-WORKFLOW.md).

## Run now

From `application/v5/qa`:

```bash
npm run qa
```

The default QA command is resource-safe: it runs mount-interface, plan, policy,
adaptation, and pairwise checks without allocating an exact manufacturing
lattice. No package installation is required for that tier.

Focused commands:

```bash
# Fast browser-independent worker runner. Run from application/v5 rather than
# this qa directory; field is the preferred geometry-development tier.
cd ..
node qa/perf/parametric-runner.mjs
node qa/perf/benchmark.mjs --stage field --limit 12 --workers auto
node --test qa/perf/parametric-runner.test.mjs
cd qa

# Browser-free development sweep: solver, placement, driver/count/tap choices,
# array/reach/manifold controls, form/coverage, mouth, crossover and Sd/Ap;
# emits JSON and creates no WebGL context. It is a broad CPU-bound batch, not
# an every-keystroke smoke test; use focused Node contracts first, then select
# survivors for exact/browser QA.
npm run qa:headless-sweep

node --test mount-interface-universal.test.js
node --test node/exact-mesh-diagnostics.test.mjs
node --test node/packed-mesh-compatibility.test.mjs
node --test node/twoway-mesh-budget.test.mjs
node --test node/ui-regression-contracts.test.mjs
# Historical Build 650 geometry witnesses retained across the identity bump:
node --test node/build650-six-woofer-exact.test.mjs
node --test node/build650-osse-panel-connectivity.test.mjs

# Current geometry contracts:
node --test node/corner-driver-plate-regression.test.mjs
node --test node/generalized-array-placement-regression.test.mjs
node --test node/driver-manifold-regression.test.mjs
node --test node/angular-square-endpoint-regression.test.mjs
node --test node/saved-mount-persistence.test.mjs
node --test node/mount-envelope-regression.test.mjs
node --test node/section-family-control.test.mjs
node --test node/oneway-coax-apex-regression.test.mjs
node --test node/throat-morph-regression.test.mjs
node node/radial-adaptation-regression.mjs

# Complete tap-shape/planner matrix without allocating exact child meshes:
node node/tap-shape-regression.mjs --analytic-only

node node/plan-sweep.mjs
node node/plan-sweep.mjs --canonical-only
node node/plan-sweep.mjs --case P01

# Explicit QA-only sub-UI mesher/resource witness:
node node/bounded-exact-witness.mjs

# Fresh-process production admission matrix and pinned integrated/retained certificates:
npm run qa:production-certificate

node node/run.mjs --tier quick
node node/run.mjs --tier plan
node node/run.mjs --tier geometry
node node/run.mjs --tier certificate
node node/run.mjs --tier release

# Current Build 652 browser contracts:
npm run qa:build652-delivery
npm run qa:build652-six-ui
npm run qa:mount-persistence
npm run qa:rosse-controls

# With v5 served at http://127.0.0.1:8520/meh5.html
node browser/run-visual-qa.mjs

# Self-hosted five-view contact sheet and scene-semantic inspection:
node browser/render-inspection.mjs --case R03

# Deterministic shell-only close-up of the P01 round-to-panel throat:
node browser/render-inspection.mjs --throat-morph

# Deterministic open-lumen section/TAPS/no-driver inspection:
node browser/render-inspection.mjs --tap-lumen

# Comparable side-section matrix for the three UI-selectable laws. The
# exact-key regressionEasedConical oracle remains node/core-only:
node browser/render-inspection.mjs --profile-laws

# Historical broad browser admission (its pinned production-admission
# metadata is Build 649 and is not part of the Build 652 release tier):
node browser/run-release-admission.mjs
```

The `qa/perf` runner uses the real deterministic engine in a bounded worker
pool, persists source-bound cache entries, and can emit small OBJ/JSON review
artifacts without Chromium. Its `field` stage includes exact implicit-field
and assembly diagnostics, but it deliberately excludes exact lattice meshing
and marks previews as non-manufacturing. See
`perf/PARAMETRIC-RUNNER-DESIGN.md` for the measured 3.62× cold speedup, warm
cache result, truth boundaries, and WebGPU roadmap.

`geometry` runs one explicitly named internal witness through the
fixed-resolution mesher, deep self-intersection audit, and STL serializer. Its
five-inch mouth is outside the 10–64 inch product UI and is not a design or
manufacturing recommendation. The Build 652 `release` tier runs the current
quick gates, the six-woofer W5 display/manufacturing topology regression, and
the focused Build 652 browser contracts. It also retains the named Build 650
six-woofer and OS-SE tests as historical geometry witnesses, but does not
present them as current release identity. It does not replay the old pinned
Build 649 exact certificates.

The separate historical `certificate` tier replays the Build 648
production-admission matrix
under the `b648-mount-envelope-v2` geometry policy.
P03 integrated, the derived P03 retained-cartridge fixture, and integrated
radial R02 execute in independent fresh child processes. The retained fixture
is exactly P03 with
`driverCellConstruction = cartridge`; `mountRing` is derived internal
renderer/export data and is not an independent fixture input. The retained
fixture must expose three named, individually connected printable parts, four
owned M4 retention locations, a deep zero-self-intersection audit, and one
pinned STL hash per part. R02 must expose one connected integrated radial part
with a pinned deep audit and STL hash. P01, R03, P04, R04-D, and R08 retain
pinned preflight refusals. The standalone tier supports historical focused
replays; those certificates are not Build 652 admission.

## Build 648 final validation result

The complete `quick` tier passed. The broad gate also passed 32,824 checks over
264 states with all three pins closed.

The final plan sweep passed 93 cases, covering 1,747 factor pairs through 2,670
checks. The fresh-process production matrix certified all three admitted
fixtures and preserved all five pinned fail-closed cases. Integrated P03 has
STL SHA-256
`a56d588bb48bd256279ea02909d72391ab6bb77627ba3ffcb59c86890b8d2ad2`;
the ordered retained P03 cartridge aggregate has SHA-256
`7c6935e870e0d0a1840a8a0d30798563520b327c07c5ecfa9e36ed3be706c5cb`;
and integrated radial R02 has STL SHA-256
`3e5f4bfed127ccec4b708d439f4e241abbaf96f242e6c52b9e27e3487425e9e1`.

The bounded exact witness passed as one connected component with zero topology
defects and zero self-intersections: 82,646 vertices, 165,320 triangles, and
STL SHA-256
`b16e14a5903440fca5c87f2e1de068a8ad18fa2185b67daf2d7f9712b9acd772`.

The self-hosted browser release admission passed 20 of 20 checks, and the
focused R03 render inspection passed all five views. Tap-lumen inspection
passed three of three views; the fixed-camera profile comparison passed all
three UI-selectable laws; and the phased panel-mount worker regression passed
slot, oval, and round apertures with two complete lands and gaskets each. No
new portable time-or-RSS claim is added here; the numerical resource
observations below are preserved historical Build 647 records and must not be
presented as Build 648 measurements.

## Historical Build 647 exact-kernel and certificate record

Build 647 retained the bounded packed exact kernel: it streams two `Float32Array`
scalar planes, stores surface coordinates
and triangles as packed `Float64Array`/`Uint32Array` buffers, and audits them
with bounded numeric topology and CSR spatial bins. Packed production topology
has a shared-index contract: adjacent triangles must reuse the same vertex ID
for a shared lattice-edge vertex. Coordinate-identical vertices with different
IDs are malformed packed input, not an instruction to rebuild an unbounded
coordinate-weld map.

Manufacturing admission retains the 8,000,000-sample cap for every active
individual part and admits at most 10,000,000 samples across a sequential
multi-part job. Display admission remains capped at 8,000,000 aggregate
samples. The retained P03 fixture fits only because no individual part exceeds
the unchanged active-part cap; this does not widen admission for oversized
horns.

The exact-job coordinator implements three transferred, terminated
phases: mesh, audit/certificate, then preview/STL output. This prevents the next
phase from depending on garbage collection to release the previous phase's
large allocations. Focused source/VM checks enforce ownership, termination,
provenance, certificate validation, and audit-failure suppression. The focused
Chromium panel regression has completed audited exact preview through the real
workers for slot, oval, and round entries while preserving the rear mounting
assembly. The command-line certificate and focused browser test still do not
substitute for wider cross-browser and cross-platform validation.

The universal rear-interface gate covers panel 2/4 and radial 2–8,
integrated/detachable mounts. In particular, detachable `jointT` must be finite,
positive, returned to every renderer consumer, and equal to the continuous
wall-to-module gasket span; integrated mounts require `jointT = 0`. This guards
the former radial-detachable `undefined` → `NaN` placement failure.

The pinned P03 certificate records a 2.5 mm `117 × 299 × 205` lattice,
7,171,515 samples, 589,864 vertices, 1,179,752 triangles, and a
58,987,684-byte STL with SHA-256
`a56d588bb48bd256279ea02909d72391ab6bb77627ba3ffcb59c86890b8d2ad2`.
Its deep audit passes with one closed component, zero self-intersections,
1,785,579 CSR bin references, peak bin occupancy 210, 80,874,610 raw pair
visits, and 1,844,209 geometric pair tests using 128 bins per axis.

The separately pinned retained P03 certificate records three named lattices:
horn `117 × 299 × 205`, cartridge 1 `99 × 85 × 110`, and cartridge 2
`99 × 85 × 110`. Together they use 9,022,815 fixed-grid samples, 679,086
vertices, 1,358,252 triangles, and 67,912,852 STL bytes. The ordered
three-file SHA-256 is
`7c6935e870e0d0a1840a8a0d30798563520b327c07c5ecfa9e36ed3be706c5cb`;
the individual horn/cartridge hashes are pinned in
`cases/exact-production-admission.json`. All three named parts are individually
connected and pass deep zero-self-intersection audits. The same certificate
requires two cartridges, two M4 retention tools per cartridge, four exact
horn-pocket/module-boss/module-bore/module-counterbore ownership records, and
all retention audit rows passing.

The integrated P03 workstation ceilings are 60 seconds and 512 MiB process
maximum RSS.
The build-647 re-certificate completed in 22,160 ms and observed
324,059,136 bytes (309.05 MiB) maximum RSS. These are regression measurements,
not portable guarantees.
The preflight's 521,816,952-byte value is a conservative allocation envelope,
not an operating-system RSS guarantee.

The retained P03 workstation ceilings are 90 seconds and 768 MiB process
maximum RSS. Its build-647 re-certificate completed in 26,900 ms and observed
428,326,912 bytes (408.48 MiB) maximum RSS. Its
565,762,048-byte preflight value is likewise a deterministic phase-accounting
envelope, not an operating-system RSS guarantee.

The integrated radial R02 certificate records one `137 × 276 × 176` lattice,
6,654,912 samples, 640,722 vertices, 1,281,460 triangles, and a
64,073,084-byte STL with SHA-256
`b02caaff85f5dc2b7e35c79ea34dad0f70565e2e8f489bd386eac0166df02870`.
Its deep audit passes with one closed component, zero self-intersections,
2,032,681 CSR bin references, peak occupancy 205, 75,404,763 raw pair visits,
and 1,058,101 geometric pair tests. Its 60-second/512-MiB certificate completed
in 28,093 ms and observed 371,703,808 bytes (354.48 MiB) maximum RSS.

## Case data

- `cases/canonical.json` contains documented, calculated, radial, panel, integrated, detachable, and manual-override cases.
- `cases/expected-refusals.json` requires impossible states to fail with named laws.
- `cases/factors.json` defines deterministic pairwise plan-level coverage with seed `619`.
- `cases/known-build-landmarks.json` records numeric and semantic landmarks. Source photographs remain evidence, not pixel baselines.

The pairwise generator covers every pair of values across:

- panel/radial family and all supported counts;
- six LF frame packages;
- three compression-driver throat packages;
- one round, one oval, and two-slot entry layouts;
- integrated and detachable mounting;
- smooth and genuinely angular surfaces;
- five coverage combinations;
- six mouth sizes;
- five crossovers;
- eight Sd/Ap targets;
- four wall thicknesses;
- four radial rotations; and
- five adapter reaches.

Every generated state must either solve or produce a stable named refusal. Exceptions, NaNs, incomplete plans, nondeterminism, idempotence failures, and silent changes to family/count/driver/tap/mount intent fail the sweep.

## Build 648 geometry and manufacturing gate contract

The Build 648 exact gate must check:

- integrated P03 exactly matches its pinned `b648-mount-envelope-v2` preflight, topology, deep-audit,
  binary-STL hash, time ceiling, and process-RSS ceiling;
- retained P03 independently matches its pinned three-part preflight, named-part
  topology/deep audits, per-part binary-STL hashes, detachable topology,
  retention audit/tool ownership, time ceiling, and process-RSS ceiling;
- radial R02 independently matches its pinned integrated-part preflight,
  topology/deep audit, binary-STL hash, time ceiling, and process-RSS ceiling;
- larger held production cases retain their pinned dimensions, sample counts,
  policy version, and stable preflight refusal codes;
- the QA-only sub-UI witness remains within the hard grid, vertex, triangle,
  audit-work, render-transfer, and STL byte counts;
- the preflight working-set value is the maximum of terminated mesh, audit, and
  output phase allocation envelopes, not an operating-system RSS guarantee;
- valid packed fixtures match the bounded nested-array reference oracle's
  topology, orientation, deep-intersection, and STL results without
  materializing full nested vertex/triangle arrays;
- malformed packed fixtures that violate the shared-index contract fail
  visibly;
- documented Hinson/angular mouth-edge straightness and four-panel planarity;
- round-to-panel throat C0/C1 handoff, reported C2 mismatch, nondecreasing
  polar rays/H-V axes/equivalent area, finite normals, no section
  self-intersection, and a non-pinching monotone outer wall;
- one-driver square-coax four-tap pattern scope (never a generic radial default);
- worker lattice step and high-frequency normal-striping diagnostics on known planar panel regions;
- exact woofer and tap counts;
- finite, continuous rear interfaces for panel 2/4 and radial 2–8 mounts,
  including detachable joint thickness and complete frame envelopes;
- complete sampled driver-bearing annuli and bolt pocket-plus-printable-web
  lands against finite horn geometry;
- panel containment repaired only by mouth growth through the configured cap,
  with `DRIVER_BEARING_ENVELOPE_INCOMPLETE` when no capped mouth is legal;
- radial automatic reach extension only within the radial family's legal
  geometry domain, with manual reach remaining authoritative;
- complete-frame clearance of at least 4 mm;
- mount faces outside horn air;
- complete tap apertures under active cones;
- at least the solved 3.2 mm structural web;
- tap area no more than 50% of the local HF section;
- quarter-wave station bound;
- radial/perpendicular and panel/local-normal driver axes;
- radial angular spacing;
- monotonic radial mouth/reach adaptation with a legal-solution witness and fixed-point replay;
- common axial tap-station symmetry (a full acoustic path-length oracle remains future work);
- analytic round/oval/stadium aperture area within 0.5%;
- published Hinson dimensions, including explicit Synergy Calc total-versus-per-woofer front-chamber semantics, and coherent manual override preservation;
- source-grounded panel construction: angular 18 mm driver-bearing panels, integrated one-piece topology, and no detachable pods for Hinson or JMOD;
- source-grounded paired panel taps occupying all four quadrants with seam bias and X-oriented long axes;
- rear-accessible panel fastener pockets retaining at least a 2 mm solid blind cap before horn air;
- JMOD construction evidence remains documented while generated tap dimensions are explicitly calculated/hybrid;
- a radial-ring lower-bound proof for hard packaging refusals such as eight 15-inch frames in a 24-inch capped envelope;
- raw component count is present and exactly correct;
- discarded component count is present and zero;
- every logical printable part contains one connected component;
- boundary/nonmanifold edges, reversed edges, orientation conflicts, degenerate triangles, duplicate faces, non-finite data, connected-component count, and positive signed volume;
- propagation of raw diagnostics through the fabrication audit;
- tap/chamber centerline connectivity and printable wall beside every tap;
- optional self-intersection detection; and
- exact binary STL byte length.

State and pairwise gates additionally enforce pre-release schema `2`: stale
schemas are ignored rather than translated by compatibility maps, and
`driverCellConstruction` is the sole two-way saved mount-construction input.
The UI must expose only conical, Classic OS, and OS-SE as selectable product
profiles, with conical as the product default. `regressionEasedConical` is an
exact-key QA oracle only, never a saved-state value, default, fallback, or
acoustic recommendation.

The browser matrix additionally traverses the live Three.js scene graph. In
`FULL ASSEMBLY`, every solved woofer must sit on its solved datum and exactly
one compression-driver root must exist. Every solved tap must have one open
passage root and zero terminal cap meshes. P05 reproduces the calculated
2 × 12-inch top/bottom panel state that formerly triggered a renderer-only
lift despite a legal oriented-disc gap. It receives a dedicated side-oblique
FULL capture and independent semantic/pixel admission from
`browser/semantic-baselines.json`. Every preset/view transition also asserts
that no exact worker starts and no exact mesh becomes ready without explicit
user intent. No unreviewed screenshot hash is treated as a golden image.

Raw component diagnostics are a hard capability gate. If the core removes fragments before exposing them, omits `rawComponentCount`, or omits `discardedComponents`, the harness fails instead of certifying the cleaned result.

## Still required for full release certification

The following need dedicated implementations and are not faked by the current
harness:

- additional fresh-process production certificates before any currently held
  larger case is admitted;
- cross-runtime and cross-platform resource measurements beyond the current
  setup-machine workstation ceiling;
- broader assembled-application browser coverage for preview and downloaded-STL
  output beyond the focused panel phased-preview regression;
- independent Python/Manifold3D or Trimesh audit of emitted STL files;
- true source-to-aperture acoustic path lengths, including front-chamber and filter delay;
- 0.5 mm or finer flood-fill proof that every declared chamber reaches horn air and no undeclared closed cavity exists;
- STL-to-analytic-surface deviation checks;
- direct throat, BCD, bolt-hole, gasket-groove, and shell-thickness metrology from the STL;
- captured visual baselines of actual worker-exported meshes across supported
  families and mount modes;
- pinned Chromium/SwiftShader screenshots;
- pixel, SSIM, semantic-mask, tap-component, throat-circularity, and reference-landmark comparisons.

`package.json` declares pinned browser/visual dependencies, including the production Three.js r128 version, but the dependency-free Node gates do not assume those packages are installed.

To run the browser/visual tests on a fresh computer:

```bash
npm ci
npx playwright install chromium
```

The pinned lockfile is included in the transfer archive.
