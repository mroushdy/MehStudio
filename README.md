# MEH Studio

A browser-based multiple-entry-horn study tool. The current editor is one self-contained HTML file with no installation, build step, or external JavaScript dependencies.

## Open the editor

Use the [live editor](https://mroushdy.github.io/MehStudio/), or download [`index.html`](index.html) using **Download raw file**, then open it in a modern browser. Keep that one file to use the editor offline.

Or clone this repository and serve it locally:

```sh
python3 -m http.server 8520 --bind 127.0.0.1
```

Open **http://127.0.0.1:8520/**.

## Build 12.2: Assisted design

Assisted follows **Goals → Drivers → Designs → Refine**, with grouped essentials, optional output/budget controls, a selected-driver summary, size filters, and one consistent next action. Preview Apply/Cancel controls appear beside the horn; current-design measurements are hidden during preview. Start with the driver count and enclosure in Goals, then set the operating band, nominal coverage, drive, assembly limits, optional mid-band loudness target and driver budget. New designs default to individually sealed rear chambers; Shared and Ported remain explicit choices. Imported studies retain their saved configuration. Choose a catalogue suggestion or select drivers you own, then generate layouts. Suggestions require complete motor data and a documented compression-driver handoff recommendation. They are a shortlist for further checks, not a universal best-buy ranking. Enter your own driver quotes to check cost; missing prices are never treated as zero.

The starter uses the DCX464. The BMS 4594HE is excluded from Assisted generation pending accommodation of the 26.6 mm forward nose shown in its manufacturer drawing; older studies retain their original geometry for reproducibility and display a drawing-correction notice.

Generated layouts must meet the entered assembly envelope limits and the existing sampled mechanical/acoustic admission checks. Candidate cards show dimensions and modeled tradeoffs. **Preview** changes only the viewer; **Apply design** makes the change. Refinement can prioritize compactness or modeled drive headroom and preserve the horn profile or entry dimensions. **Undo applied change** restores the preceding design. Changing goals does not silently replace geometry. The loudness estimate covers the cone mids using a baffled aperture; actual coverage, compression-driver response, crossover and complete loudspeaker output are not certified.

Research analysis defaults to **Simple**, with practical response, excursion and air-speed summaries. **Advanced** exposes detailed settings, plots and model assumptions. The saved JSON includes Assisted goals, quotes and selected driver identities; older design files remain supported.

**Export → Acoustic solver export** downloads a canonical geometry job and a self-contained local runner ZIP. Extract the runner, follow its `START_HERE.md` setup, then run your job to produce checked solver files. The job is not a mesh. See [the exporter guide](mesh-export/README.md) for surface, ABEC and conforming hybrid FEM/BEM bundles. The browser does not run AKABAK or the native solver. Full-horn tetrahedral meshes that failed quality checks are withheld. Mesh topology checks do not establish acoustic convergence.

## What it does

- Manual and Assisted design with R-OSSE rev7 horn profiles. Assisted accepts a 40–120° nominal coverage angle, carries it into generated profiles and saved briefs, and offers tap-to-open field help. This axisymmetric angle is not a predicted frequency-dependent beamwidth.
- Round, capsule and teardrop entries; two, four or six cone mids.
- Continuous front adapters with closed wall meshes and smooth neck-to-chamber transitions, shared by the 3D and section views. Entry tube length is adjustable separately from driver standoff; the acoustic model adds a fixed 3 mm passage allowance.
- Individual pods or a shared rear enclosure, with sealed or ported loading and a cylindrical or curved shared shell.
- Driver selection grouped by nominal size in inches. Manufacturer-referenced dimensions distinguish sourced geometry from representative appearance and clearance envelopes. The reviewed catalogue contains 54 mechanical records and 28 complete exact-variant cone motor datasets (27 mechanically selectable), including eight new 8-inch/10-inch models. Source records, known exclusions and reproducible generation live in [driver-research](driver-research/README.md). Original manufacturer documents remain in the local research archive and are not deployed.
- 3D assembly, section and entry-footprint views, point measurements, and saved comparisons.
- Optional annular or offset-outlet cone inserts with opening, clearance and center-relief controls, section inspection and mesh-based displaced-air-volume accounting.
- Reduced linear acoustic screening using supported driver motor data and a one-dimensional Webster horn network.
- Front chamber tradeoffs: nearby actual tube/cavity geometries, common-reference response and phase comparisons, impedance, excursion, entry speed and geometry-only insert diagnostics.
- Experimental System acoustics: independently coupled mids, qualified spatial-front result import, pressure/flow and motor results, with exact-geometry invalidation.
- A measured-response crossover workbench, plus JSON, CSV and section-image exports.

Manual edits update the design immediately. Design checks highlight affected controls and collect warnings without freezing the preview or blocking saved comparisons and exports. Driver selection loads dimensions directly; **Fit driver placement** and **Size chamber & port to fit** are explicit actions. Sliders batch geometry updates and briefly defer acoustic screening.

Assisted starts from its own goals. Refinement inherits only dimensions explicitly locked by the user. Failed fitting calculations preserve the current design. Acoustic screening and Assisted candidate acceptance still require geometry supported by their models.

The direct collector model requires the entire entry projection to lie inside the equivalent active piston disk and requires positive collector depth. Invalid coupling cannot run the acoustic screen or pass rear-port fitting. This conservative geometric policy does not establish an acoustic alignment or rule out separately engineered side-entry arrangements.

The optional **Annular insert** occupies part of the collector and assumed cone recess, leaving a central opening around the full projected entry. Its clearance is measured axially from an assumed conical diaphragm; the central keepout is a provisional fraction of piston radius, not measured dust-cap geometry. The reported displaced volume comes from the same closed mesh used in the assembly. It is a volume study, not a path-equalizing phase plug or production part. The legacy Acoustic screen stays unavailable with an insert. **System acoustics** can use a matching, qualified native spatial result; it never substitutes a volume-only response for an insert.

The **Offset-outlet insert** follows the projected horn entry, including its shape, rotation and driver offset. Opening size sets a minimum equivalent diameter; the aperture retains the entry outline with a 2 mm edge allowance. **Center relief depth** lowers the assumed cone apex to leave a flat dust-cap recess. **Inspect insert** zooms into a section cut from the same closed mesh used for rendering and volume. The collector transitions directly into the insert opening; its air volume uses that same passage boundary. The mesh conservatively maintains at least the entered axial clearance to the assumed cone, but actual diaphragm and dust-cap fit still require measurements. The experimental spatial-front model can resolve the lossless air field for a qualified geometry; thermoviscous gap losses and real diaphragm geometry remain outside it.

## Front chamber tradeoffs

Open **Manual → Front chamber → Compare entry / cavity**, or choose **Advanced** and expand **Front chamber tradeoffs** below the design workspace. Compare the current geometry with shorter/larger-cavity and longer/smaller-cavity choices. Set the tube step and cavity change, or match the bare LC reference to inspect why equal nominal resonance does not mean equal response. Standoff is solved from the actual curved volume, including the active insert aperture when fitted, and Apply changes only tube length and standoff.

The sweep uses the design’s low target and probe frequency, with voltage, end correction and horn assumptions from Acoustic screen. All curves use the current design’s peak flow reference; no candidate is ranked as a universal winner. Frequency shading, fit failures and model limits remain visible. Inserts retain geometry, area and clearance diagnostics without acoustic predictions. CSV records the baseline design, study settings, matched acoustic conditions, actual geometry, results and unavailable cases.

Read the concise [engineering reference](docs/front-chamber-reference.md) for primary evidence, equations, units, limitations and next validation steps. The offline editor embeds its essential methods and source links.

## Experimental system acoustics

Choose **Advanced → Spatial passage detail**, or **Manual → Front chamber → Analyze sound path**. View mouth flow, mouth-load power, per-mid impedance, excursion, entry speed, pressure and phase. Read [the model scope and workflow](docs/system-acoustics.md) before using these exploratory results. Changing the front passage invalidates its native result; a fresh mesh/solve is required. The browser does not run the native solver. The supplied case includes qualified insert/open-collector comparisons and a coupled 700 Hz pressure map. Import [`examples/offset-insert-study.json`](examples/offset-insert-study.json) to reproduce it. Native source, frozen inputs and verification records are in [`native-front-fem/`](native-front-fem/README.md). Full spatial horn junctions, directivity and calibrated compression-driver handoff remain unresolved.

## Engineering limits

This is a design-study tool, not a validated loudspeaker design or manufacturing CAD system. It does not predict full-field directivity, replace BEM/FEM, or provide tolerance-checked production STEP geometry. Rear-port and horn radiation are not summed. Driver appearance, cone recess and some displacement/clearance assumptions remain approximate; read the in-app **Methods** and manufacturer links.

Candidate rankings apply only within the reduced model. Verify physical fit, construction, acoustic response, crossover, excursion and thermal behavior through detailed engineering and measurements. Imported crossover traces must share microphone position, timing reference and calibrated level.

## Development and checks

The catalogue, geometry and renderer live in `index.html`. Reusable coupled-system sources live in `acoustics/`; run `npm run build` after editing those modules or mesh-export sources. The single-file editor embeds the complete interface and browser calculations. Node.js 22 or newer runs the source-level regression checks with local development dependencies:

```sh
npm ci
npm test
```

The tests cover large-driver placement, individual/shared sealed and ported chambers, collector coupling, finite mesh coordinates, driver grouping, live Manual edits, export setting preservation, and insert mesh closure, volume, clearance and acoustic-model boundaries. Additional comparison tests cover actual volume targets, fixed conditions, matched-LC non-equivalence, shared normalization, voltage scaling, insert gating, inertance quadrature and interface state invalidation. They do not replace visual browser testing or acoustic measurements.

## Previous application

The earlier modular Build 657 application, documentation, tests and third-party notices are preserved in [`legacy/build657/`](legacy/build657/). That is a separate historical implementation; its assembly scripts and test claims do not apply to the current editor. Git history is retained.

No project-wide open-source license has been added. Existing third-party license notices remain with the legacy dependencies.
