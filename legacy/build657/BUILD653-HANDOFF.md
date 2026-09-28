# MEH Studio Build 653 private handoff

Build 653 is the current private pre-release application identity for the
stabilized one-way coax and two-way families. It supersedes Build 652 as the
runtime, saved-state-hash, and exact-mesh-policy identity. Earlier build
handoffs, screenshots, and certificates remain historical regression evidence;
they do not certify this source state.

This handoff is private. It was prepared only in the local project workspace.
It was not published to GitHub, made public, or authenticated with a stored
access token.

## Start from a deterministic state

From this `application/v5` directory:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=653&reset=1&view=nodrv&rev=release-final
```

The `build` query is an assertion. A stale build fails closed before saved
geometry is read or the 3-D runtime starts. `reset=1` clears the current
pre-release saved design only after the build assertion succeeds.

`meh5.html` is generated. Edit `shell.html`, `profile-laws.js`, `engine.js`,
and `twoway-core.js`, then run `node assemble.js` once after the final source
edit. The delivery contract reconstructs the generated file from those four
sources and requires byte-for-byte equality.

## Build 653 stabilization boundary

- Build/runtime/state/revision/view identity remains visible in the runtime
  sentinel. Build 653 state hashes use the `b653-` namespace, and the exact
  mesh policy is `b653-differential-cell-terminal-grid-v3`.
- Panel arrays admit 2, 4, or 6 woofers only when the selected driver,
  mounting cell, passage layout, local wall, and configured mouth envelope fit.
  Smart Adapt may grow the mouth within its configured cap; it refuses rather
  than clipping cells or silently substituting another count.
- Face and corner driver cells, gasket/bearing lands, cone-following relief,
  chambers, and passages consume canonical solved records. Mixed
  face/corner six-driver arrays retain six distinct bearing cells and twelve
  paired passages.
- Shortest panel passages are finite aperture prisms aligned to the solved
  driver/cone normal. Extended and radial manifolds retain their explicit
  swept paths. Render helpers do not replace or certify the manufacturing
  cutter.
- Full assembly hides passage-helper tunnels behind driver bodies. No-driver,
  cell, section, and tap-inspection views retain the geometry needed to inspect
  mounts and lumens without presenting driver bodies in the no-driver view.
- The display renderer coalesces streamed input, reuses material variants, and
  releases scene, worker, buffer, renderer, and WebGL resources on a real page
  close/navigation. BFCache pagehide remains deliberately resumable.
- Rounded rectangle, Lamé superellipse, ellipse, conical, Classic OS, OS-SE,
  curved-facet, angular, and protected one-way coax profile contracts remain
  source-tested. Native rollback R-OSSE and arbitrary photo-derived compound
  surfaces remain outside admitted manufacturing geometry.
- The existing three-way screen remains an analysis preview and is contained
  from manufacturing claims. `threeway-core.js` is the pure Stage-1 foundation
  for the separate three-way rebuild; it is not yet an assembled browser
  input, and three-way STL/manufacturing remains unavailable.
- `threeway-state-contract.js` and `threeway-coupled-network.js` add immutable
  topology/provenance state plus explicit complex and transfer-matrix coupled
  solve primitives. They are pure supplementary modules, not assembled
  product inputs. Their combined core/state/network/containment command passes
  35/35 while manufacturing, renderer, audited-solid, and STL capabilities
  remain false.
- Legacy three-way Hornresp export is explicitly disabled even when complete
  T/S records are present. The audited King 2026 records contradict the old
  exporter's ME1/ME2/Nd ownership, horn direction, units, and chamber/entry
  field mapping. This is a correctness quarantine, separate from the
  unavailable browser-automation capacity. A replacement exporter must be
  topology-specific and must round-trip source-pinned fixtures before it can
  be enabled.

## Verification status for the frozen private package

The frozen package records two independent status lanes:

1. **Source and browser-independent geometry lane — PASS.** On 2026-07-30,
   the post-Hornresp-quarantine `npm run qa` tier terminated with
   `QA QUICK PASS`. Its canonical sweep covered 17 cases and 615 checks:
   14 valid results, 3 deliberate named refusals, and zero exceptions,
   warnings, or errors. The tier also covers generated-source identity, state
   and policy contracts, one-way coax protection, two-way
   placement/count/mount/profile/manifold/tap logic, rounded-section behavior,
   analytic preview topology, resource-lifecycle source contracts,
   packed-mesh compatibility, mesh budgets, and pairwise geometry. The
   post-quarantine Build 653 delivery contract passes 6/6, and the independent
   three-way truth-containment contract passes 6/6.
2. **In-browser admission — pending.** The connected browser-automation
   capacity was unavailable for the frozen Build 653 run. This is an
   execution-environment/tool-capacity limitation, not an observed MEH Studio
   browser failure. It is also not a browser pass. Build 653 remains pending
   until the commands below complete on the frozen hashes.

This PASS is deliberately narrower than `QA RELEASE PASS`. No current
Build 653 claim is based on replaying Build 649 certificates, Build 650 exact
witness names, or Build 652 screenshots.

## QA workflow

Install dependencies once:

```bash
cd qa
npm ci
npx playwright install chromium
```

Run the browser-independent frozen-source gate:

```bash
npm run qa
```

When browser automation is available, run the current focused live contracts:

```bash
npm run qa:build653-delivery
npm run qa:build653-six-ui
npm run qa:build653-six-corner
npm run qa:build653-renderer-stress
npm run qa:mount-persistence
```

The complete serialized gate is:

```bash
npm run qa:release
```

Run one QA or exact-mesh process at a time. Exact manufacturing remains
explicitly opt-in; do not run it concurrently with browser visual QA or
another geometry worker.

## Frozen source identity

| File | UTF-8 bytes | SHA-256 |
| --- | ---: | --- |
| `shell.html` | 453,547 | `6aa4f63d3a404562ce1ed314cd3245bd8a9ed4de3888a64bf3e3b84ed5352daa` |
| `profile-laws.js` | 42,773 | `3d838f83a81a1af250c3bde5f59759dc7fbde1baeb14781e50352b8b05b43878` |
| `engine.js` | 294,190 | `18c1efddcce2d9d9c2c5b892eaa5cabffa48013b8c98ecb95e179c59412ad78e` |
| `twoway-core.js` | 377,004 | `5957006f9760f161b31aedac6c7d94408613ba3a298971609535ea951bfec56e` |
| generated `meh5.html` | 1,167,471 | `f8a60ce6f8fdd500b110e5903b4d071d3928fb896e31f59d3094b14fad120a79` |

An independent read-only reconstruction from the four assembled inputs equals
`meh5.html` byte for byte. The generated file is 1,167,471 UTF-8 bytes
(1,165,568 JavaScript string/code-point units).

Supplementary research/foundation files are not assembled into this runtime.
Their frozen identities are recorded in `SOURCE-MANIFEST.md` and in the
archive-wide `BUILD653-FILES.sha256`.

## Truth boundary

- Analytic preview success is not an exact-mesh certificate.
- A connected/watertight software mesh is not an acoustic optimum, BEM
  directivity result, structural load certificate, or physical validation.
- Driver inserts, gaskets, printed cells, ports, and chambers require material,
  load, leakage, prototype, and measurement validation.
- Coverage, crossover, chamber, tap, and mouth calculations remain engineering
  guidance until measured on the selected drivers and completed assembly.
- Three-way manufacturing and STL export remain unavailable while its coupled
  solver, positive-solid/negative-lumen geometry, audit, and UI integration
  are rebuilt and independently admitted.
- Three-way Hornresp export remains unavailable until a topology-specific
  mapping round-trips source-pinned fixtures; complete T/S data alone is not
  sufficient.

## Packaging rule

Freeze hashes only after the last application edit, one final
`node assemble.js`, byte-for-byte delivery equality, and a successful
browser-independent quick tier. The local private archive excludes installed
dependencies, generated QA screenshots, temporary PDF extraction files,
credentials, access tokens, browser state, and Git authentication. Browser
admission remains a separate pending gate until it is actually run.

From `application/v5`, the intended local-only packaging command is:

```bash
find . -type f \
  ! -path './qa/node_modules/*' ! -path './qa/artifacts/*' \
  ! -path './tmp/*' ! -path './pins.json' \
  ! -name 'BUILD653-FILES.sha256' ! -name '*.zip' \
  ! -name '.DS_Store' -print0 \
  | LC_ALL=C sort -z | xargs -0 shasum -a 256 \
  > BUILD653-FILES.sha256
cd ..
/usr/bin/zip -X -r MEH-Studio-build653-private.zip v5 \
  -x 'v5/qa/node_modules/*' 'v5/qa/artifacts/*' 'v5/tmp/*' \
     'v5/pins.json' 'v5/*.zip' '.DS_Store' '*/.DS_Store'
shasum -a 256 MEH-Studio-build653-private.zip \
  > MEH-Studio-build653-private.zip.sha256
```

The archive-wide manifest lists every included regular file except the manifest
itself. The external `.zip.sha256` binds the archive, including that manifest.
These packaging commands are run only after the frozen source hashes and
successful quick-tier result are written into this handoff and
`SOURCE-MANIFEST.md`.
