# Canonical two-way visual QA

The canonical screenshot sidecar drives the assembled application at exactly:

`http://127.0.0.1:8520/meh5.html`

That runner never opens `shell.html`, a `file://` URL, a query-string build, or
another document. Same-page scripts, workers, and other resources remain
available so the real renderer is exercised. The matrix also proves that preset
and view changes do not start an exact-preview worker without explicit user
intent. The separate focused panel-mount regression, documented below, fulfills
the current source template into a localhost response and deliberately invokes
the real phased workers.

## Matrix

The preset list is read from `qa/cases/canonical.json`. Every valid canonical
build plan plus each family plan tagged `browser-regression` is rendered in
this fixed order:

1. `front/full`
2. `rear-oblique/no-drivers`
3. `rear/mount`
4. `taps/xray`
5. `side-oblique/full`

Within each view, presets run in canonical case-ID order. That order makes every
preset change double as a camera-preservation test. The sidecar compares the
world-space eye, target, yaw, pitch, orbit, selected view, and x-ray state before
and after the switch. Raw `dist` may change when horn bounds change; preserving
the actual eye/target orbit is the production contract. `rear/mount` explicitly
selects `mountFocus=0`; after each preset switch it intentionally refits to that
preset's plate normal and verifies that exactly one bearing face remains visible
with the horn, modules, helper geometry, and all driver bodies hidden.
`rear-oblique/no-drivers` separately captures the complete horn-and-mount
assembly and requires every solved mounting land, gasket, fastener pocket, and
applicable detachable retention feature while rejecting all LF and
compression-driver bodies.

The matrix contains P01 Hinson, P02 JMOD, the calculated P05 2 × 12-inch
top/bottom renderer regression, and the retained R03 3 × 5.25-inch radial
fixture. Each is captured in front/full, rear-oblique/no-drivers, rear/mount,
taps/xray, and side-oblique/full views, for twenty images.

## Run

Start the existing v5 server on port 8520. Then install the QA dependencies and
Playwright Chromium once:

```sh
cd application/v5/qa
npm install
npx playwright install chromium
```

Run the deterministic headless matrix:

```sh
node browser/run-visual-qa.mjs

# Release form: temporary loopback server, read-only pin endpoint, and the
# pinned local Three.js runtime instead of the CDN.
node browser/run-release-admission.mjs
```

Run the focused source-runtime regression that explicitly generates an audited
phased preview for slot, oval, and round panel entries and proves the rear
mounting assembly survives exact completion:

```sh
node browser/panel-mount-envelope-regression.mjs
```

For direct human review of the production renderer, run the self-hosted
inspection contact sheet:

```sh
node browser/render-inspection.mjs --case R03
```

It captures the isolated face-on mounting plate, the mount inspector's assembly
overview, the production `NO DRIVERS` mounting assembly, the full assembly, and
the literal tap view through the real WebGL renderer. The `NO DRIVERS` capture
must expose complete solver-owned mounts, gaskets, BCD pockets, and retained
cartridges where applicable while containing no LF or compression-driver body.
Each image receives foreground occupancy and crop bounds; an empty, tiny, or
edge-clipped render fails the command. The five PNGs, aspect-preserving contact
sheet, and `manifest.json` are written under
`qa/artifacts/render-inspection/`. Mount focus is URL-addressable
(`view=mount&mountFocus=0` or `assembly`), while the production assembly witness
is `view=nodrv`; the contact sheet and interactive app therefore exercise the
same deterministic cameras and layer paths.

The round-to-panel throat has its own deterministic, shell-only close-up:

```sh
node browser/render-inspection.mjs --throat-morph
```

That mode loads canonical P01, selects the clipped production `SECTION` view,
targets 46% of the solved throat-morph length, and locks the yaw, pitch, orbit,
viewport, and light mode. It hides driver and inspection layers after the real
scene has built, leaving the production shell vertices and material untouched.
The same run adds a square-on clipped-side profile that keeps the round throat,
morph, and early horn flare in one axial witness. The exact artifacts are:

- `qa/artifacts/throat-morph-inspection/throat-morph-closeup.png`
- `qa/artifacts/throat-morph-inspection/throat-profile-side-section.png`
- `qa/artifacts/throat-morph-inspection/contact-sheet.png`
- `qa/artifacts/throat-morph-inspection/manifest.json`

Both PNGs receive full-frame and center-region occupancy assertions plus exact
camera-contract and shell-only DOM assertions. An explicit `--case P02` through
`P05` can be used to inspect another angular panel fixture with the identical
camera contracts.

The canonical tap lumen has a separate three-view close-up:

```sh
node browser/render-inspection.mjs --tap-lumen
```

That mode loads canonical P02 and holds driver 0 / port 0 at deterministic
face-on `SECTION` and oblique exterior cameras. It captures the same solved
aperture in production `SECTION`, `TAP INSPECTION`, and
`MOUNT ASSEMBLY — NO DRIVERS` views. The harness records the exact cutter
kind, aperture shape, section endpoints, length, and stable signature from
`twoWaySolidField.tapTools`. It requires the same signature in all three
captures, literal Boolean targeting of both `horn-and-integrated-cell` and
`driver-cell-cartridge`, visible recessed air-path helpers only in `SECTION`
and `TAP INSPECTION`, and one opaque/depth-writing physical passage-wall root
per solved tap in `NO DRIVERS`. That assembly view still contains no driver,
colored-air, or cutter-helper layer. Each PNG also receives full-frame and
center-region pixel-occupancy assertions, and the three hashes must be
distinct. The exact artifacts are:

- `qa/artifacts/tap-lumen-inspection/tap-lumen-section-closeup.png`
- `qa/artifacts/tap-lumen-inspection/tap-lumen-taps-closeup.png`
- `qa/artifacts/tap-lumen-inspection/tap-lumen-no-drivers-closeup.png`
- `qa/artifacts/tap-lumen-inspection/contact-sheet.png`
- `qa/artifacts/tap-lumen-inspection/manifest.json`

The three UI-selectable smooth axial laws have a bounded preview-only
comparison:

```sh
node browser/render-inspection.mjs --profile-laws
```

That mode starts from canonical R02, changes only `profileLaw`, and captures
the production `SECTION` shell from one fixed square-on side camera for:

- straight conical;
- Classic oblate spheroidal (OS);
- monotone OS-SE with the native flat/baffle termination.

The internal 72/28 `regressionEasedConical` oracle is covered by node/core QA
only. It must not enter browser product state, saved state, or selectable UI.

The harness requires three distinct profile hashes and PNG hashes, 49 monotone
stations per law, the selected law in the camera contract, shell-only scene
layers, and an idle/not-ready exact-mesh runtime. It records endpoint
tangents/curvatures and both native and build termination semantics in
`manifest.json`. No exact-mesh button or worker is invoked. The exact artifacts
are:

- `qa/artifacts/profile-laws-inspection/profile-law-conical.png`
- `qa/artifacts/profile-laws-inspection/profile-law-classic-os.png`
- `qa/artifacts/profile-laws-inspection/profile-law-osse.png`
- `qa/artifacts/profile-laws-inspection/contact-sheet.png`
- `qa/artifacts/profile-laws-inspection/manifest.json`

`--app-root /absolute/path/to/private/v5` may serve a privately assembled copy
without modifying the shared `meh5.html`; the canonical case data and harness
still come from this QA tree.

For local debugging only:

```sh
node browser/run-visual-qa.mjs --headed
```

The runner uses a fresh browser context, clears only that context's saved MEH
state, fixes the viewport at 1600×1000 with DPR 1, disables animation, uses
light mode, and captures the production WebGL canvas through the production
`capture-mode` layout.

## Results

Stable PNG names and `manifest.json` are written under:

`qa/artifacts/browser/`

`qa/.gitignore` already ignores everything under `qa/artifacts/` except its
placeholder, so generated screenshots and manifests do not enter source
control.

The manifest records:

- selected canonical state and solved-plan landmarks;
- live scene-graph driver roots, visibility, mesh descendants, and finite world positions;
- camera state before and after each preset switch;
- refusal/banner and failing-law diagnostics;
- fabrication badge and explicit exact-mesh runtime state;
- console messages, uncaught page errors, failed requests, and HTTP errors;
- screenshot size and SHA-256;
- foreground pixel occupancy/bounds and any reviewed semantic baseline result.

The command exits non-zero for:

- a visible red/refused banner, failing law, solver refusal, or infeasible
  canonical solve;
- lost view, x-ray, or world-space camera state during a preset switch;
- a canonical fixture/state mismatch;
- any woofer not located on its solved driver datum, or anything other than
  exactly one compression-driver root in `FULL ASSEMBLY`;
- any LF/compression-driver body in `NO DRIVERS`, or a missing mounting land,
  gasket, fastener pocket, detachable module/joint gasket, or retention feature;
- a missing canonical/Boolean tap cut, any visible tap-helper root, or any
  terminal tap-cap mesh in `FULL ASSEMBLY`;
- a missing recessed passage root, a terminal cap, or more than 0.25 mm of
  forward helper protrusion in `TAP INSPECTION`;
- failure of the P05 side-oblique semantic/pixel baseline;
- an uncaught page error or `console.error`;
- a failed document/script/worker request;
- exact mesh work starting or remaining ready without explicit user intent;
- navigation away from the exact localhost document;
- a missing canonical preset or required view.

The twenty-image canonical matrix intentionally does not request an exact mesh.
The separate panel-mount regression does exercise explicit exact intent through
the real mesh → audit/certificate → preview workers. Pinned topology, deep
audit, STL hash, and resource ceilings remain the responsibility of the bounded
geometry witness and the independent fresh-process integrated/retained P03
production certificates.
