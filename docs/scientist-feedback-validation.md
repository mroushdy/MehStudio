# Scientist feedback implementation: verification and limits

Verified 30 September 2026 in an isolated clone of main `9010138579de20db40f801c31eb57c153756ed6a`. The deployed app and private Sites editor were not changed. [Machine-readable results](scientist-feedback-validation.json) retain geometry hashes, native runtime/source versions and parser results.

## Delivered workflows

| Request | Implemented result | Boundary |
| --- | --- | --- |
| ABEC/AKABAK meshes | Direct export navigation and a self-contained local kit with applied design, geometry job, setup guide and native builder. Boundary Lab remains available. | The local builder produces checked meshes/projects; downloading is not meshing or solving. |
| CAD/printing | One CAD handoff ZIP: closed uncut blank STL, uniquely named OBJ reference parts, entry/profile CSV, exact-variant source dimensions, placement metadata, saved design and instructions. Removed decorative ghost profile from geometry exports. | Separate reference surfaces; actual cuts, mounting solids, joins, tolerances, interference and print segmentation remain CAD work. |
| Chamber/entry resonance | Real geometry candidates targeting an optional bare Helmholtz/LC value; intended passband and optional crossover context; common-reference loaded flow, phase, impedance, excursion and speed. Settings persist in design JSON and named studies. | No fitted loaded resonance, performance score, crossover optimizer or mid/HF summation. Unachievable geometry targets retain reasons. |
| Small mids | Exact DMA80-4 and DMA80-8 identities, source records, 3-inch Assisted filter, small-size fit and export regression. | DMA80-4 supports reduced-model screening; DMA80-8 is geometry-only because of inconsistent published motor data. Both use conservative and explicitly assumed mechanical details. |
| Passive shared slots | Visible distinction between bass-reflex slots and resistive cardioid slots, with a concrete [future coupling contract](passive-cardioid-contract.md). | Existing independent rear-vent velocity bases do not predict passive cardioid performance. |

## Completed verification

- `npm run build` embeds 56 mechanical records and 29 reviewed motor entries; existing source/embed parity checks pass.
- `npm test`: **238 passed, 0 failed**. This includes numerical LC inverse targets and infeasible targets, incomplete/missing response samples, loaded-response differences at the same bare reference, mode/import/undo and study settings, exact driver identity/gating, conservative packing for 2/4/6 small mids, oversize entry/rear-duct rejection, power residuals, and actual downloadable ZIP contents. DOM checks use stubbed canvas; they are not rendered browser QA.
- Native mesher Python unit tests: **40 passed**. No native mesher/operator equations changed.
- CAD handoff ZIP: independent Python ZIP CRC/extraction check and `meshio 5.3.5` import of actual STL and OBJ. The fixture's horn blank has **34,944 triangles**, paired edges, consistent winding and positive enclosed volume. The OBJ has **30 unique named parts / 257,408 triangles**, finite nondegenerate coordinates and counts matching the part manifest. A closed assembly or fabrication topology is not asserted.
- OpenCascade imported the actual faceted horn blank as **one valid solid**, the corresponding uncut reference surface as **zero solids**, and the NURBS horn surfaces as **two valid faces / zero solids**, preserving millimetre bounds. The reference STEP check uses the uncut horn surface, not a Boolean assembly. DMA80 manufacturer CAD was separately inspected; see [the source audit](../driver-research/dma80-audit.md).
- The actual four-mid starter produced **159,210 exterior triangles / 4 sources**; the compact DMA80-4 fixture produced **82,664 exterior triangles / 2 sources**. Both passed connected-surface, paired-edge, winding, duplicate-face, full intersection and native Gmsh coordinate/connectivity/tag round trips. The ABEC bundles were independently reimported with Gmsh. Real Boundary Lab schema-9 loading, source compilation and solve preparation passed for both; no acoustic assembly or solve ran.
- The compact case was also exported through the embedded panel as a real ZIP, extracted, and built using **only the downloaded runner** plus the existing native runtime. The packaged native source hashes match final repository source. No installation into the shared runtime was performed.
- Exact disclaimer wording, Got it acknowledgment, native close acknowledgment, reload behavior and storage-failure tolerance pass. `meh-experimental-notice-seen` remains independent of saved designs and mode preferences.

## Reproduction

Run the JavaScript suite from the repository. For native checks, use an independently prepared Python environment with the versions recorded in the JSON report; do not install into another task's environment.

```sh
npm ci
npm run build
npm test
python -B -m unittest discover -s mesh-export -p 'test_*.py'
node scripts/export-cad-review.cjs work/cad-review
python -B tests/verify-step-native.py work/cad-review
node mesh-export/extract.cjs examples/dma80-4-regression-study.json work/dma-job.json 1000 8
python -B mesh-export/run.py work/dma-job.json --python /path/to/prepared/python --out work/dma-bundle --size-mm 25
python -B tests/abec-native-audit.py work/dma-bundle/abec
python -B tests/boundary-lab-native-audit.py work/dma-bundle/boundary-lab
```

The STEP check additionally requires OCP; the Boundary Lab check requires its real Python loader and dependencies. The compact example is a **regression fixture, not a recommended pairing, crossover or fabrication design**. The 25 mm surface target and these topology checks do not establish acoustic mesh convergence. Dense-matrix estimates remain large (about 102 GiB for the compact fixture and 378 GiB for the starter for one complex128 matrix alone); the runner reports these before any separate solver use.

## Remaining validation

Rendered browser QA was not attempted because of the existing browser-policy restriction. Layout review remains before release. Proprietary AKABAK import/solve remains unverified. No failed Boundary Lab acoustic operator was reused. Native project loading and source checks are not physical validation or acoustic convergence.

Actual diaphragm geometry and motion, mounting datum, front losses, real end corrections, distributed chamber/junction modes, compression-driver coupling, crossover summation and full-field directivity require further engineering and measurements. The DMA80-8 motor discrepancy and PDF/CAD mounting conflicts remain explicit. No deploy or merge is included; review the implementation and these limits before integration.
