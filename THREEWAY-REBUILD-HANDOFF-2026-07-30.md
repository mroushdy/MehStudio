# MEH Studio three-way rebuild handoff — 2026-07-30

## Read this first

Build 655 is the latest published build, but its browser-visible three-way
assembly is **not finished**. It has a substantial schema-2 solver, catalog,
closed-operand, and validation foundation, but the full-assembly view still
looks like a schematic: an open/flat horn surface, two floating cylindrical
driver envelopes, separate passage meshes, and a small HF marker.

Do not describe Build 655 as a finished or ready-to-print three-way product.
Do not unlock three-way exact mesh or STL merely to make the UI look complete.

The immediate objective is:

> Make the three-way browser view reach the visual and interaction quality of
> the two-way system: a recognizable complete horn, correct LF/MF/HF source
> layout, solid full-frame driver mounts, adapters connected to the horn,
> continuous tap passages, useful no-driver/cutaway views, and honest named
> family/driver choices. Preserve the existing exact-solid/manufacturing truth
> boundary until Boolean and fabrication gates actually pass.

## Project locations

- Active source:
  `/Users/marwan/Documents/Codex/2026-07-27/a/work/MEH-Studio-build639-complete/application/v5`
- Generated application:
  `/Users/marwan/Documents/Codex/2026-07-27/a/work/MEH-Studio-build639-complete/application/v5/meh5.html`
- Latest archive:
  `/Users/marwan/Documents/Codex/2026-07-27/a/work/MEH-Studio-build639-complete/application/MEH-Studio-build655-private.zip`
- Latest archive checksum:
  `/Users/marwan/Documents/Codex/2026-07-27/a/work/MEH-Studio-build639-complete/application/MEH-Studio-build655-private.zip.sha256`
- Temporary Git publishing clone:
  `/private/tmp/mehstudio-publish-655`
- GitHub repository:
  `https://github.com/mroushdy/MehStudio`
- Published branch:
  `agent/build-655-release`
- Published commit:
  `2cae1ac`
- Open draft pull request:
  `https://github.com/mroushdy/MehStudio/pull/1`

The repository is public. GitHub CLI device authentication succeeded as
`mroushdy`. A personal access token was pasted in the prior conversation; do
not reuse or record it. The user should revoke that exposed token.

## Launch

From the active source directory:

```bash
node serve.js 8520
```

Open a clean state:

```text
http://127.0.0.1:8520/meh5.html?build=655&reset=1&view=full&rev=threeway-rebuild
```

Select `3-WAY`.

The user's most recent bad-render witnesses are:

- `/var/folders/sb/q8y8vydj5_bgxqh434jm6tt00000gn/T/TemporaryItems/NSIRD_screencaptureui_RDXnzm/Screenshot 2026-07-30 at 2.30.41 PM.png`
- `/var/folders/sb/q8y8vydj5_bgxqh434jm6tt00000gn/T/TemporaryItems/NSIRD_screencaptureui_mSG5Ok/Screenshot 2026-07-30 at 2.31.35 PM.png`

## What Build 655 genuinely contains

The following work is real and should be preserved:

- Slider-driven calculated T3 schema-2 input.
- Deterministic LF/MF/HF station, aperture, chamber, passage, mount, package,
  and analysis pipeline.
- A truthful family catalog separating runnable calculated studies from
  reference-only architectures.
- Full-face positive mount-host records and canonical passage ownership.
- `threeway-solid-geometry.js`, which constructs:
  - a closed horn shell;
  - throat collar;
  - full-frame solid mount plates;
  - solid driver-cell adapters;
  - continuous canonical lumen negatives;
  - locally audited mesh-backed constructive operands.
- `threeway-solid-intent.js`, which carries these provider-neutral closed
  operands into a solid-intent contract.
- Exact-kernel and fabrication gates that fail closed instead of falsely
  authorizing output.
- Build 655 source and delivery tests. They validate data contracts and scene
  existence, but they are not sufficient visual product QA.

The previous reported QA result was 371 passing tests, with the Build 655 live
delivery and package contracts passing. This did **not** prove that the
three-way design looked finished.

## Root cause of the visible failure

The closed solid work is computed but is not the geometry used by the visible
renderer.

Relevant pipeline:

1. `threeway-solver.js` builds physics and calls
   `threeway-solid-intent.js`.
2. The solver stores `solution.solidIntent` and marks
   `readiness.solidPlanInput`.
3. It then calls `threeway-render-assembly.js` without passing the closed
   geometry/solid intent.
4. `threeway-render-assembly.js` calls
   `threeway-preview-geometry.js::buildHornInnerSurface()` and renders that
   intentionally open inner surface as the horn.
5. Mounts are rendered from `mount.inspectionMesh`, driver bodies from
   conservative cylinder envelopes, and lumen negatives as independent
   inspection meshes.
6. No preview Boolean/composite evaluation is applied, so the viewer shows
   floating pieces rather than one credible assembly.

The critical call is in `threeway-solver.js`, near the
`assembleRenderGeometry({...})` invocation. The current input contains the
horn surface, drivers, passages, mounts, package, and render intents, but not
the successful `solidIntentResult` or its closed geometry.

The critical consumer is
`threeway-render-assembly.js::assembleRenderGeometry()`. It currently creates
the horn item from the open preview mesh and separately creates mount/lumen
items.

## Required implementation order

### 1. Integrate closed geometry into the analysis renderer

- Preserve the successful `solidIntentResult` outside its current local block.
- Pass its closed solid geometry or explicit render-safe constructive operands
  into `assembleRenderGeometry()`.
- Extend `threeway-render-assembly.js` to accept the closed geometry only when:
  - the input/state/solution hashes match;
  - ownership is canonical;
  - all local mesh audits pass;
  - no upstream object claims manufacturing, exact-solid, or STL authority.
- For analysis preview, render the closed horn shell, throat collar, full-face
  plates, and adapters from `threeway-solid-geometry.js`.
- Keep `renderGeometry.exactSolid`, `manufacturing`, and `stl` false.

This is a render integration, not authorization of an exportable Boolean.

### 2. Make the assembly look like a real three-way horn

The default full-assembly view must show:

- a mouth-facing horn interior, not a rear/side disk;
- a visible HF throat/interface at the apex;
- all LF and MF physical driver instances required by the selected family;
- a solid driver-bearing plate for every driver;
- a solid adapter joining every plate to the horn shell;
- tap openings on the horn wall and continuous passages reaching the matching
  driver chamber;
- no floating drivers, floating plates, open plate centers, duplicate throat
  discs, or disconnected passage meshes.

The default camera must be front three-quarter and fit the complete assembly.
Add/reset a deterministic camera witness for every three-way view.

Required views:

- Full assembly.
- Horn plus tap openings.
- Mount assembly with no drivers.
- Driver mounts plus tap bindings.
- X-ray lumens.
- Section cutaway.
- Package bounds.

### 3. Treat preview solids and acoustic lumens differently

- Positive bodies should use opaque neutral materials.
- Tap apertures should read as openings/dark bores at the horn wall.
- X-ray mode may show canonical negative lumens transparently.
- Full assembly should not show lumen negatives as cyan blocks protruding
  through the product.
- The no-driver view should clearly expose the solid mounting plates and
  driver seats.

### 4. Fix source/family usability truthfully

Current runnable default:

- `Calculated T3 study - 1 HF + 1 MF + 1 LF`.

Current catalog also contains reference-only CoSyne, Hinson CX3, and external
LF H3 architecture records. Do not silently render them with invented
dimensions.

The final UX should provide:

- at least one visually complete calculated T3 quick start;
- explicit LF, MF, and HF driver selectors;
- family/count constraints derived from the actual source graph;
- named documented families only when their dimensions and driver identities
  are source-pinned;
- a clear calculated/reference/prototype label.

Do not leave the three driver selectors disabled with generic
`driver-low-t3-study`, `driver-mid-t3-study`, and `driver-high-t3-study`
records as the only visible “finished” experience.

## Two-way family classification requested after this handoff

The user correctly identified two important missing two-way references:

- **PSE-144** — classify as a two-way point-source/Synergy architecture.
  Add it to the two-way family browser, but keep it reference-only or a
  clearly labelled calculated adaptation until the horn dimensions, driver
  identities, entry geometry, and construction record are source-pinned.
  Red Spade's project history describes PSE-144 as the refined result of its
  point-source horn work:
  `https://redspade-audio.blogspot.com/2012/06/synergy-horn-flat-pack-kit.html`.
- **SynTripP** — classify as a documented two-way family. The project source
  explicitly calls it a two-way/two-part virtual single-point-source horn:
  `https://www.diyaudio.com/community/threads/syntripp-2-way-2-part-virtual-single-point-source-horn.264485/`.
  The existing project source-of-truth records two B&C 10CL51 cone drivers
  plus the Celestion CDX14-3050 HF driver. Implement it as documented
  complement plus source-pinned construction dimensions; label any missing
  tap/chamber dimensions as calculated. Keep the supported rear alignment
  sealed by default unless a separately verified ported alignment is selected.
- **CoSyne** — do **not** add it as a two-way family. Bill Waslo's guide
  documents CoSyne as a three-way system with one HF compression driver, four
  MF drivers, and four LF drivers. It remains in the three-way catalog:
  `https://libinst.com/SynergyCalc/Synergy%20Calc%20V5.pdf`.

Two-way family UI should therefore expose PSE-144 and SynTripP alongside
Hinson and JMOD, with evidence badges and truthful runnable/reference status.
CoSyne may be cross-linked from the two-way family browser as a related
three-way reference, but it must not instantiate a two-way state or silently
drop its LF/MF source group.

### 5. Add visual admission tests

The existing delivery contract is too permissive. Add a release-blocking
three-way visual/semantic contract that rejects:

- fewer visible mount hosts than non-throat physical drivers;
- a horn consisting only of an intentionally open inner surface in the full
  assembly;
- driver-envelope/plate separation beyond tolerance;
- plate/adapter/horn non-overlap;
- a canonical lumen that does not intersect both its horn wall and owning
  chamber/adapter;
- camera framing that makes the assembly occupy too little of the canvas;
- views with nonfinite or extreme package bounds;
- generic marker geometry being mistaken for an HF throat assembly.

Save screenshots for all views and inspect them manually before changing the
build number.

## High-value source files

- `threeway-solver.js` — orchestration and the missing render handoff.
- `threeway-solid-geometry.js` — closed horn, plates, adapters, and negatives.
- `threeway-solid-intent.js` — canonical closed-operand contract.
- `threeway-render-assembly.js` — converts canonical analysis into render items.
- `threeway-render-model.js` — view selection and render DTO.
- `threeway-renderer.js` — Three.js object creation, materials, scene fitting.
- `threeway-preview-geometry.js` — current open horn inner-surface tessellation.
- `threeway-horn-surface.js` — horn profile and coordinate system.
- `threeway-mount-solver.js` and `threeway-mount-host.js` — mount placement and
  plate records.
- `threeway-lumen-geometry.js` and `threeway-passage-solver.js` — continuous
  passage geometry.
- `threeway-family-catalog.js` and `threeway-driver-db.js` — family and driver
  truth.
- `threeway-ui.js` — guided controls, family/driver selectors, and view notes.
- `assemble.js` — required module assembly order.
- `shell.html` — main application shell and shared renderer host.

## User-supplied three-way research

These new source files may be useful and should be read before finalizing the
acoustic model or named families:

- `/Users/marwan/Library/CloudStorage/Dropbox/Silence Please Master Folder/Speaker Designs/Calculators/Synergy/303b9e618394104d6a72e34bc18bfe61e7e118d97ecfd6db8b563819530e533b.pdf`
- `/Users/marwan/Library/CloudStorage/Dropbox/Silence Please Master Folder/Speaker Designs/Calculators/Synergy/hornresp_manual (1).pdf`
- `/Users/marwan/Library/CloudStorage/Dropbox/Silence Please Master Folder/Speaker Designs/Calculators/Synergy/Synergy Calc V5.pdf`
- `/Users/marwan/Library/CloudStorage/Dropbox/Silence Please Master Folder/Speaker Designs/Calculators/Synergy/Synergy Calc v5.xls`
- `/Users/marwan/Library/CloudStorage/Dropbox/Silence Please Master Folder/Speaker Designs/Calculators/Synergy/US5526456 (4).pdf`
- `/Users/marwan/Library/CloudStorage/Dropbox/Silence Please Master Folder/Speaker Designs/Calculators/Synergy/US6411718.pdf`

Likely value:

- Synergy Calc spreadsheet/PDF: source counts, tap stations, chamber/port
  dimensions, crossover/path constraints, and Hornresp mapping.
- US5526456: coentrant multiple-band horn architecture.
- US6411718: Unity summation/manifold architecture.
- Hornresp manual: segment/chamber/port mapping and model interpretation.
- The hash-named PDF must be identified from its title/metadata before use.

Copies of several related primary sources and extracted notes already exist
under:

- `research/threeway-sources/`
- `tmp/pdfs/threeway-research-text/`
- `docs/threeway-primary-source-ledger.md`
- `docs/threeway-rebuild-blueprint.md`
- `docs/threeway-king-2026-math-notes.md`

Compare hashes before adding duplicates. Store extracted equations and their
provenance in the project math/source ledger rather than burying them in UI
code.

## Build and QA commands

Run from `application/v5`:

```bash
node assemble.js
node gate.js
cd qa
npm run qa:build655-source
npm run qa:build655-delivery
```

Focused three-way tests:

```bash
cd qa
node --test node/threeway-solid-geometry.test.mjs
node --test node/threeway-solid-intent.test.mjs
node --test node/threeway-render-assembly.test.mjs
node --test node/threeway-render-model.test.mjs
node --test node/threeway-renderer.test.mjs
node --test node/threeway-ui-integration.test.mjs
```

After visual completion, create a new build number rather than overwriting the
meaning of Build 655. Update source identity, regenerate `meh5.html`, create a
new source manifest/archive, run the package contract, commit intentionally,
push a new release branch, and update or supersede PR #1.

## Release definition of done

Do not call the three-way work finished until all are true:

1. The default three-way full assembly visibly resembles a complete MEH horn.
2. LF, MF, and HF sources are correctly represented and attached.
3. Every non-throat driver has a solid, full-face bearing plate.
4. Every plate is joined to the horn by a solid adapter.
5. Every canonical tap passage visibly and geometrically reaches its owning
   chamber/driver interface.
6. No-driver, lumen, section, and package views are useful and consistent.
7. Named presets remain source-pinned; calculated presets remain labeled.
8. Automated source/geometry tests pass.
9. Browser visual admission and manual screenshot review pass.
10. Exact/STL remain locked unless the separate Boolean and fabrication gates
    genuinely pass.
