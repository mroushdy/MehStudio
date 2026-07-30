# MEH Studio Build 651 handoff

Build 651 is the current pre-release application identity. It carries forward
the Build 650 driver-count, mounting-record, section-family, and profile-law
work, then closes the corner-bearing and tap-continuity defects found during
visual inspection. Build 649 certificates and Build 650 named regression
witnesses remain useful history; neither is current Build 651 certification.

## Start from a deterministic state

From this `application/v5` directory:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=651&reset=1&view=cell&rev=release-final
```

The `build` query is an assertion. A stale build fails closed before saved
geometry is read or the 3D runtime starts. `reset=1` clears the current
pre-release saved design only after the build assertion succeeds.

`meh5.html` is already assembled from the source set recorded below. During
development, edit the source modules rather than the generated file and run
`node assemble.js` exactly once after the final application edit.

## Delivered in Build 651

- Panel driver-bearing geometry is derived from one canonical joint frame.
  Corner-mounted drivers receive a parametric corner plate that follows the
  local faces beneath it instead of floating as an unrelated round cartridge.
  Unsupported or under-contained corners refuse rather than clipping a plate.
- The driver-face opening radius is a canonical solved value shared by the
  plate plan, analytic preview, exact field, gasket, cone relief, and tap
  passage. Preview code no longer substitutes a second inferred inner radius.
- Each LF passage is one physical swept path from the horn acoustic surface,
  through its bearing support, and into the solved front chamber. Per-joint
  overlap removes internal horn layers and detached passage islands without
  adding a cosmetic cap or a second helper tube.
- Smooth-panel and curved-facet paths use the same canonical wall-to-chamber
  handoff. Opposed placements share the same symmetry and path-length
  equations; radial manifolds use their solved radial driver axes.
- Mixed face/corner panel arrays now route every selected passage through the
  same swept equalizer. The fresh angular/conical six-W5 state owns all 12
  paths, admits the exact manifold with sub-picometre reported mismatch, and
  no longer triggers the refusal overlay that made opaque mounts look detached
  from a ghosted horn.
- Compression-driver bolt cutters are bounded by the physical flange depth.
  They no longer continue through unrelated downstream horn material.
- The exact path fails closed when a corner plate, bolt land, chamber,
  passage, or required overlap cannot be represented as one printable
  manifold. Exact refusal is visibly distinguished from a successful preview.
- The pre-release inspection oracle uses a 2.5 mm display grid for the legal
  5 mm fastener and a 3 mm display grid for the legal 6.5 mm fastener. Both
  remain represented without component filtering. Manufacturing remains an
  independent exact intent; preview success is not an STL certificate.
- Build/runtime/state/revision/view identity remains visible in the runtime
  sentinel. Build 651 state hashes use the `b651-` namespace, and exact mesh
  keys use policy `b651-differential-cell-terminal-grid-v3`.
- Manufacturing retains the fixed 2.5 mm grid and unchanged memory, axis,
  triangle, STL, and audit limits. The bounded 10,040,000-point part/job
  ceiling admits the released six-W5 `159 × 302 × 209` lattice (10,035,762
  points) while the next `159 × 303 × 209` tier still refuses.
- The Build 650 six-woofer and OS-SE exact tests are intentionally retained by
  name as historical geometry witnesses. Current boot, saved-state, browser,
  and mesh-identity admission is owned by the Build 651 contracts.

## Source identity

These are SHA-256 hashes of the source-frozen Build 651 application:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `shell.html` | 390,534 | `5f10652f9bd15a6cdd6a37d02d013ba137d6620e73c4990a51f1772c64a490fa` |
| `profile-laws.js` | 42,773 | `3d838f83a81a1af250c3bde5f59759dc7fbde1baeb14781e50352b8b05b43878` |
| `engine.js` | 294,219 | `61b9b1ef91991b2e1735398bf72889bce956881c48e947a4e0e05d99f4abc30f` |
| `twoway-core.js` | 296,966 | `040a053d3414246326da71fb7ea19b029617e056792a8dae4b37501bb3c71a3e` |
| generated `meh5.html` | 1,024,449 | `65d7338fa9e3f2c1586ee25fb041ac6c5544495598a621dea74493532f615172` |

The Build 651 delivery contract reconstructs `meh5.html` in memory from the
four source modules and requires byte-for-byte equality with the generated
file. A read-only reconstruction of the final identities above equals the
delivered file exactly at 1,024,449 UTF-8 bytes.

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

Current Build 651 delivery and live six-woofer browser contracts:

```bash
cd qa
npm run qa:build651-delivery
npm run qa:build651-six-ui
```

The browser contracts self-host the frozen source on a temporary no-store
loopback server and launch headless Chromium. They verify fail-closed build
mismatch, reset ordering, visible runtime identity, `b651-` state/mesh keys,
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

## Focused verification record

- The final focused source/geometry lane passes 27/27 contracts.
- The cartridge-retention lane passes 8/8. Its final 2.5 mm P03 detachable
  manufacturing witness produces the horn and two cartridges as three named
  parts with raw component counts `[1, 1, 1]`; the retention ownership and
  post-cutter ligament checks pass.
- The final six-woofer exact matrix covers both manufacturing and display
  intents at 5 mm and 6.5 mm woofer-fastener diameters. Every one of those four
  meshes has raw component count `1`.
- The live six-woofer browser workflow additionally requires exact manifold
  admission, 12/12 equalizer ownership, two paths for each of six drivers,
  effectively zero path mismatch, and no refusal overlay.
- These exact witnesses inspect raw topology. The engine reports zero
  discarded components; no disconnected-component filtering is used to make
  an exact result pass.
- The complete elevated, serialized `npm run qa:release` gate passes against
  the final source identities above, including every Node, exact, and browser
  lane, and terminates with `QA RELEASE PASS`.
- Its headless sweep covers 210 scenarios with 18 intentional explicit
  refusals and zero failures.

These are software, geometry, topology, and renderer checks. They are not BEM
directivity validation, an acoustic optimum, a structural load certificate,
or a substitute for printed prototypes and measurements.

## Explicit limits

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
Build 651 release gate and verify source equality before packaging that exact
source state. Do not claim Build 651 by replaying the Build 649 certificate
tier, the Build 649 closure ledger, or Build 650 screenshots and hashes.
