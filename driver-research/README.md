# Driver catalogue source and integration

This is the reproducible source for the offline editor's 56 mechanical records and 29 exact-variant cone motor datasets. It extends Build 12 (`acd1173f34d0d3b2d42719db489d8975344f6b32`). Manufacturer documents are private local references outside this repository; the code retains factual dimensions, provenance, hashes, uncertainty, and source URLs.

## Build and verify

```sh
npm ci
npm run build
npm test
```

`build-catalog.cjs` reads `records/*.json`, then combines `motors.json`, `motor-additions.json`, `new-motors.json`, and `small-motors.json`. It embeds only the catalogue, primitive runtime and their explicit integration regions. It preserves the Assisted workflow, standalone optimizer and mesh exporter. `npm run build` then runs the existing acoustic and mesh embedding tools. A repeated build must leave `index.html` byte-identical.

The records carry units and exact impedance identity. Motors are eligible only when all required fields and the reviewed variant match. No missing motor parameter is filled from another model. Manufacturer-published driver displacement is separate from a conservative cylinder allowance. New models with undimensioned cone/dustcap profiles do not acquire invented profiles; existing illustrative profiles remain labelled approximate.

For exact DMA80 variant availability, manufacturer CAD conflicts and small-driver checks, see `dma80-audit.md`. DMA80-4 supports reduced-model screening; DMA80-8 remains geometry-only pending consistent manufacturer motor data.

For historical context and full model tables, see `new-driver-audit.md`, `motor-audit.md`, `existing-audit.md` and `rcf-cad-inspection.md`. The following integration instructions supersede their subtask-era suggestions to merge motor files manually.

## Integration from another checkout

The delivery is a single commit based on Build 12. Cherry-pick it if that base is still current. If newer workflow edits conflict in the large single-file editor, retain the newer `index.html`, apply the source files and guard changes, then run `npm run build` to re-embed the narrow catalogue regions. Do not replace the newer whole editor with an older output file.

Review these deliberate behavior changes:

- Mechanical source records own dimensions. Legacy inline records no longer override corrected source envelopes or force unavailable models to be available.
- A published rounded frame size is a specific compatibility alias: old 6NDL38 studies using 187 mm retain their exact identity while newly selected source geometry may use 186.5 mm. Unknown explicit model IDs and ambiguous unnamed chassis matches cannot borrow a motor.
- Conflicting same-model total depths use an explicit conservative packaging envelope; the original drawing depth and rear datum remain unchanged. The mounting land matches this packaging value without losing the source frame outline.
- Input ranges expand only when needed to retain sourced catalogue parameters; a selected driver's Vas, Fs, size or depth must not be silently clamped into custom data.
- Missing occupied driver volume remains a labelled conservative allowance. It is never overwritten with `undefined` or labelled published merely because a complete motor exists.
- Primitive poles are welded, zero-area triangles removed, and closed frame normals corrected. Necessary body envelopes remain visible; only explicitly redundant `clearance-only` envelopes are hidden with appearance.
- Compression rear extent uses `rearDepth`/`mountingDepth` before total front-to-back `depth`. Dimension guides are not physical material.
- BMS 4593HE, 4594HE and 4595HE front noses remain excluded from supported coupling. Build 12's DCX464 default and 4594HE Assisted restriction remain intact. An imported unsupported driver can show its corrected geometry without becoming eligible.

## Exact native geometry and source-hash migration

`geometry-source-migration.json` records old/new current-code geometry-script hashes and independent native extraction evidence. Only the current-code guards in `acoustics/embed.cjs` and `tests/spatial-study.cjs` were migrated. All original `native-front-fem` frozen snapshots, air surfaces, solver results and provenance are unchanged.

`tests/driver-catalog-native.cjs` runs the existing native extractor on the current editor and compares the actual vertices/faces/tags hashes to the preserved original surfaces, not merely to a claimed hash field. Both the inserted and open reference cases match exactly. `verify-baseline.cjs` additionally compares normalized states, the full front adapter, horn, source poses, insert and front volume against a supplied Build 12 editor snapshot.

```sh
node driver-research/verify-baseline.cjs /path/to/build12-index.html index.html /path/to/parity-report.json
```

This equivalence is limited to those stored front-air surrogates. It does not certify BMS nose clearance, full-system physical geometry, new-driver FEM results, or acoustic calibration. Future geometric edits still fail the exact source guard and require fresh review; do not blanket-rewrite source hashes in original results.

## Local reference archive and previews

The separate output folder contains `manufacturer-sources/manifest.json`, original manufacturer/model folders, per-source manifests, `file-inventory.json`, rendered drawing pages and contact sheets. `localArchivePath` is relative to that output folder. It is an offline research reference, not a deployed asset path.

Archive contents include 53 actual PDFs, 29 original images, 5 ZIPs, one extracted STEP, and 49 original page/text responses across 137 unique reference files. Five original Celestion page requests failed; exact cone PDFs were separately downloaded successfully. Each attempted source and failure is retained in the manifest. The RCF STEP's native unit is inch, with explicit 25.4 mm conversion; its ZIP and member hashes are separate. The procedural viewport remains an envelope, not exact imported CAD.

Source documents and source-page preview sheets must not be committed or publicly deployed without permission. No public redistribution license was established. Local inspection and retention do not imply redistribution rights.

`export-preview-data.cjs` plus `render-previews.py` render the exact catalogue primitive meshes into contact sheets. These are inspection views, not manufacturing drawings. The Python renderer requires Pillow and the Arial font path configured near its top.

## Known unresolved scope

BMS 4590P also remains fit-ineligible until its passive-crossover-specific envelope is verified. 6NMB900 has complete motor values but an official sheet containing another model's drawing, so it remains mechanically unavailable. ND3ST lacks verified mounting pattern; two Celestion CDX records lack a verified maximum radial envelope. DCM420 needs separate MF/HF architecture and has conflicting 50/52 mm exit sources. Compression source transfer functions and crossover calibration remain absent. Terminals, wire bends, manufacturing tolerances and real cone/dustcap sections still prevent fabrication-grade fit or acoustic certification where unmeasured.
