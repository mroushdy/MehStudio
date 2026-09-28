# MEH Studio Build 657 — calculated three-way preview and source-family expansion

Build 657 replaces the incomplete early three-way preview with a complete
interactive calculated T3 assembly. The default design contains one HF throat
source, four MF wall drivers, four LF wall drivers, eight solid full-face
driver cells, and sixteen continuous canonical tap passages.

The assembled application is `meh5.html`.

## Launch

From this directory:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=657&reset=1&topology=3way&view=full-assembly&rev=release-final
```

## Build 657 changes

- Rebuilt the default three-way study as a symmetric 1 HF + 4 MF + 4 LF
  calculated array.
- Added practical mouth, depth, coverage, profile, section, and crossover
  controls directly below the family selector.
- Replaced exposed construction/lumen bars in the normal assembly with opaque
  structural driver cells and shallow aperture indicators.
- Preserved the complete negative tap volumes for the dedicated lumen
  inspection view.
- Added a no-driver inspection view that exposes eight solid driver hosts and
  their paired tap bores.
- Moved long family evidence and assumptions into a collapsed details section.
- Added source-bounded three-way references for:
  - CoSyne 1 HF + 4 MF + 4 LF;
  - Danley SH50 1 HF + 4 MF + 2 LF;
  - Hinson DCX464 + two LF;
  - JW Sound JMOD DCX464 + two B&C 12NDL88;
  - external-LF H3.
- Added source-bounded two-way SynTripP and Solana adaptations.
- Added Celestion CDX14-3050 and B&C DH450 driver identities for those
  two-way references.
- Recorded the local DH350 half-horn, throat-adapter, and DSP project as
  reference-only evidence. Mesh dimensions are recorded, but acoustic
  validation is not claimed.

## Verification

- Release three-way source suite: **372 passed, 0 failed**.
- Focused three-way, two-way-source, renderer, and UI suite:
  **92 passed, 0 failed**.
- Direct browser verification:
  - runtime identity reports **Build 657**;
  - the calculated T3 solves and renders on first load;
  - the selector exposes all six three-way choices;
  - SH50 and JMOD remain visibly reference-only and cannot run a fabricated
    geometry solve;
  - no runtime errors were present during the release check.

## Truth and fabrication boundary

The calculated T3 is an analysis and visual-inspection preview. It is not yet
a fabrication-authorized exact Boolean solid. Exact mesh generation, STL,
Hornresp export, and manufacturing remain locked until the independent exact
kernel, closed-manifold, lumen-continuity, minimum-web, and fabrication gates
all pass.

The SH50, JMOD, Hinson, CoSyne, and external-LF H3 entries preserve only facts
supported by their sources. They do not copy hidden commercial internals or
invent missing driver geometry. A reference family requires explicit verified
driver records and a new coupled solve before it can become a calculated
derivative.

## Principal changed files

- `threeway-quick-starts.js`
- `threeway-family-catalog.js`
- `threeway-reference-cards.js`
- `threeway-render-assembly.js`
- `threeway-ui.js`
- `twoway-core.js`
- `shell.html`
- `reference/known-builds.json`
- `qa/node/threeway-family-catalog.test.mjs`
- `qa/node/threeway-reference-cards.test.mjs`
- `qa/node/threeway-quick-starts.test.mjs`
- `qa/node/threeway-render-assembly.test.mjs`
- `qa/node/threeway-ui-integration.test.mjs`
- `qa/node/twoway-source-adaptations.test.mjs`

