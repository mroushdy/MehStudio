# MEH Studio Build 652 handoff

Build 652 is the current pre-release application identity. It carries forward
the Build 650 driver-count, mounting-record, section-family, and profile-law
work, then closes the corner-bearing and tap-continuity defects found during
visual inspection. Build 649 certificates and Build 650 named regression
witnesses remain useful history; neither is current Build 652 certification.

## Start from a deterministic state

From this `application/v5` directory:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=652&reset=1&view=cell&rev=release-final
```

The `build` query is an assertion. A stale build fails closed before saved
geometry is read or the 3D runtime starts. `reset=1` clears the current
pre-release saved design only after the build assertion succeeds.

`meh5.html` is already assembled from the source set recorded below. During
development, edit the source modules rather than the generated file and run
`node assemble.js` exactly once after the final application edit.

## Delivered in Build 652

- Panel driver-bearing geometry is derived from one canonical joint frame.
  Corner-mounted drivers receive a parametric corner plate that follows the
  local faces beneath it instead of floating as an unrelated round cartridge.
  Unsupported or under-contained corners refuse rather than clipping a plate.
- The driver-face opening radius is a canonical solved value shared by the
  plate plan, analytic preview, exact field, gasket, cone relief, and tap
  passage. Preview code no longer substitutes a second inferred inner radius.
- In shortest panel mode, each LF passage is one finite aperture prism parallel
  to the solved driver/cone normal. There are no internal bend vertices,
  overlapping section caps, fillet folds, or hidden path-length ballast.
  Automatic paired entries are constrained to the chamber-overlap interval,
  and the differential-setback/equalizer solve changes physical endpoints
  rather than inserting a serpentine path.
- The manufacturing cutter deliberately retains two Boolean safety tails: an
  exterior backoff that covers the complete oblique acoustic outline and a
  finite overlap into the cone chamber. The exact field and analytic horn
  fragment clip consume that complete canonical section.
- The shortest-path renderer uses the same section `u/v` frame and
  round/oval/racetrack cross-section, but it does not present those two safety
  tails as printed wall. It draws one open-ended prism side wall with the
  caller's shared material, no end caps, and no custom owner/Boolean shader.
  Its metadata records the distinct cutter and render endpoints. This is the
  final contract that removes the visible onion-ring layers without hiding
  production geometry.
- Explicit extended-manifold and radial paths retain the bounded
  multi-section swept-tool path and its exact owner-fragment union renderer;
  the shader-free single-section fast path applies only when the canonical
  tool really has one section.
- Compression-driver bolt cutters are bounded by the physical flange depth.
  They no longer continue through unrelated downstream horn material.
- The no-driver compression-throat depth cue is an uncapped sleeve recessed
  exactly within the finite CD flange. It retains an open bore without the
  former 8 mm black protrusion behind the driver plate.
- Integrated cell previews now distinguish the printable exterior from the
  finite acoustic chamber boundary. The outer support and horn-side root
  closure remain visible from a lower/rear inspection camera, while the
  correctly wound chamber wall and floor remain single-sided to prevent
  buried petal/facet artifacts.
- Streamed range and custom-driver input now updates state/readouts
  immediately but coalesces a burst into one trailing geometry replacement.
  Boot, select, and committed change paths remain synchronous. This prevents
  rapid slider events from queuing multiple roughly half-second six-driver
  solves on Chromium's renderer thread.
- A real page close or navigation cancels the exact worker, releases any
  accepted exact-preview buffers, disposes the complete scene subtree and
  render lists, disposes the renderer, loses the WebGL context, and removes
  the canvas. BFCache pagehide remains resumable and is deliberately exempt.
- Ghost/detail view material variants are reused per source material.
  Originals that no live mesh still references are explicitly disposed
  instead of becoming unreachable before the next scene-subtree cleanup.
- The exact path fails closed when a corner plate, bolt land, chamber,
  passage, or required overlap cannot be represented as one printable
  manifold. Exact refusal is visibly distinguished from a successful preview.
- The pre-release inspection oracle uses a 2.5 mm display grid for the legal
  5 mm fastener and a 3 mm display grid for the legal 6.5 mm fastener. Both
  remain represented without component filtering. Manufacturing remains an
  independent exact intent; preview success is not an STL certificate.
- Build/runtime/state/revision/view identity remains visible in the runtime
  sentinel. Build 652 state hashes use the `b652-` namespace, and exact mesh
  keys use policy `b652-differential-cell-terminal-grid-v3`.
- Manufacturing retains the fixed 2.5 mm grid and unchanged memory, axis,
  triangle, STL, and audit limits. The bounded 10,040,000-point part/job
  ceiling admits the released six-W5 `159 × 302 × 209` lattice (10,035,762
  points) while the next `159 × 303 × 209` tier still refuses.
- The Build 650 six-woofer and OS-SE exact tests are intentionally retained by
  name as historical geometry witnesses. Current boot, saved-state, browser,
  and mesh-identity admission is owned by the Build 652 contracts.

## Source identity

These are SHA-256 hashes of the source-frozen Build 652 application:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `shell.html` | 440,008 | `b743bbc45a39980069de28f94f16908b302bfd0d7acdc97be87ad52accd386e3` |
| `profile-laws.js` | 42,773 | `3d838f83a81a1af250c3bde5f59759dc7fbde1baeb14781e50352b8b05b43878` |
| `engine.js` | 292,791 | `272681221ee3752fb578884a0468f0dcf9f437ea6d290f08f0423f6665b02b5f` |
| `twoway-core.js` | 357,877 | `802676d51ccbe3079b9d240ad6be9c2995883bd9ea4ec4dbc8705bad31fb4a6c` |
| generated `meh5.html` | 1,133,406 | `6206b3d064fb5069840cedfb996852c33cab34e2a27be7c97ef29ec95d43b0b9` |

The Build 652 delivery contract reconstructs `meh5.html` in memory from the
four source modules and requires byte-for-byte equality with the generated
file. A read-only reconstruction of the final identities above equals the
delivered file exactly at 1,133,406 UTF-8 bytes.

## Headless and browser workflow

Install QA dependencies once on a new machine:

```bash
cd qa
npm ci
npx playwright install chromium
```

Resource-safe source and geometry checks:

```bash
cd qa
npm run qa
npm run qa:corner-plates
npm run qa:driver-manifold
npm run qa:build650-osse-connectivity
npm run qa:build650-six-exact
```

The two `build650-*` commands above deliberately replay named historical
geometry witnesses. They do not load or assert a Build 650 runtime.

Current Build 652 delivery and live six-woofer browser contracts:

```bash
cd qa
npm run qa:build652-delivery
npm run qa:build652-six-ui
npm run qa:build652-renderer-stress
```

The browser contracts self-host the frozen source on a temporary no-store
loopback server and launch headless Chromium. They verify fail-closed build
mismatch, reset ordering, visible runtime identity, `b652-` state/mesh keys,
six selected and persisted drivers, twelve canonical ports, rounded-rectangle
section mutation, R-OSSE mutation, and mount-record persistence.

The complete release gate is:

```bash
cd qa
npm run qa:release
```

Run one QA or exact-mesh process at a time. Exact manufacturing remains
explicitly opt-in; do not run it concurrently with browser visual QA or
another geometry worker.

## Verification status for the current hashes

The evidence presently recorded against the source identities above is
focused, not a fresh full-release certificate:

- In-memory assembly from the four source modules equals the delivered
  `meh5.html` byte for byte.
- The tap-lumen render contract passes 64/64 source-and-assembled assertions.
- The renderer stress contract passes ten measured six-W5 edit cycles after
  warm-up: 80 scene replacements, 99→99 live renderer geometries, 0→0
  textures, 22→22 programs, zero WebGL context losses, zero renderer crashes,
  and zero browser errors. Its 24-event streamed wall-thickness burst executes
  exactly one rebuild and records 23 coalesced requests.
- The analytic-preview topology regression passes 5/5 tests, including the
  one-section shared-material path, exact section frame, two global open
  boundaries, zero internal caps, distinct cutter/render endpoints, and the
  sole-section horn Boolean.
- The swept-frame continuity regression passes 2/2 tests on an explicit
  extended-manifold fixture, preserving the existing multi-section renderer.
- The final six-W5 angular browser witness passes with four corner cells, two
  face cells, six complete roots/bearings, twelve physical passage walls, and
  no exposed pre-Boolean wing/root-spine helper surfaces. The isolated CELL
  image shows one continuous bearing/cell body with two clean tap lumens. A
  dedicated lower/rear NODRV image verifies that both structural exterior
  roles remain visible from below; the same live witness verifies that the
  open CD throat sleeve's axial bounds are contained within the flange.

Earlier Build 652 checkpoints recorded broader source/geometry, retention,
six-woofer exact, browser, headless-sweep, and serialized release results.
Those results remain useful history, but they preceded the final
straight-cone-normal topology and the hashes above. They must not be presented
as a fresh `QA RELEASE PASS` for this identity. Run the complete serialized
release command before making that claim.

These are software, geometry, topology, and renderer checks. They are not BEM
directivity validation, an acoustic optimum, a structural load certificate,
or a substitute for printed prototypes and measurements.

## Explicit limits

- Wrap status on 2026-07-29: the exhaustive release sweep was stopped at the
  owner's request to conserve compute/credits. The final delivery-identity
  contract passes 6/6, the tap-lumen renderer contract passes 64/64, and the
  sub-crossover semantics regression passes; this transfer is not a fresh
  full-release certificate.
- Remaining exhaustive-gate work is localized: two samples in the six-Dayton
  smooth OS-SE integrated gasket-support audit remain uncovered
  (`1684/1696`, coverage `0.9929245283`); rounded-rectangle analytic assembly
  passes but its current 3 mm exact implicit mesh separates into seven raw
  components and uses an excessive `165 × 331 × 202` regression lattice; two
  one-way coax pinned tap-ring radius fixtures disagree with current emitted
  radii; and saved-mount browser persistence last timed out during navigation.
- Native R-OSSE rollback/overhang still lacks a non-single-valued parametric
  surface, offset, tap-projection, and exact-meshing contract.
- Arbitrary compound photo-derived surfaces and generic mouth wrap are not
  inferred or certified.
- Driver and insert records do not validate pull-out, layer adhesion, gasket
  compression, fatigue, torque, or cantilever loads.
- Coverage and mouth calculations remain sizing guidance until BEM and
  physical measurements validate a chosen design.

## Release rule

After the final application edit, assemble exactly once, then run the current
Build 652 release gate and verify source equality before packaging that exact
source state. Do not claim Build 652 by replaying the Build 649 certificate
tier, the Build 649 closure ledger, or Build 650 screenshots and hashes.
