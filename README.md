# MEH Studio

A browser-based multiple-entry-horn study tool. The current editor is one self-contained HTML file with no installation, build step, or external JavaScript dependencies.

## Open the editor

Use the [live editor](https://mroushdy.github.io/MehStudio/), or download [`index.html`](index.html) using **Download raw file**, then open it in a modern browser. Keep that one file to use the editor offline.

Or clone this repository and serve it locally:

```sh
python3 -m http.server 8520 --bind 127.0.0.1
```

Open **http://127.0.0.1:8520/**.

## What it does

- Manual and Assisted design with R-OSSE rev7 horn profiles. Assisted accepts a 40–120° nominal coverage angle, carries it into generated profiles and saved briefs, and offers tap-to-open field help. This axisymmetric angle is not a predicted frequency-dependent beamwidth.
- Round, capsule and teardrop entries; two, four or six cone mids.
- Continuous front adapters with smooth neck-to-chamber transitions. Entry tube length is adjustable separately from driver standoff; the acoustic model adds a fixed 3 mm passage allowance.
- Individual pods or a shared rear enclosure, with sealed or ported loading and a cylindrical or curved shared shell.
- Driver selection grouped by nominal size in inches. Manufacturer-referenced dimensions distinguish sourced geometry from representative appearance and clearance envelopes.
- 3D assembly, section and entry-footprint views, point measurements, and saved comparisons.
- Optional annular or offset-outlet cone inserts with opening, clearance and center-relief controls, section inspection and mesh-based displaced-air-volume accounting.
- Reduced linear acoustic screening using supported driver motor data and a one-dimensional Webster horn network.
- Front chamber tradeoffs: nearby actual tube/cavity geometries, common-reference response and phase comparisons, impedance, excursion, entry speed and geometry-only insert diagnostics.
- A measured-response crossover workbench, plus JSON, CSV and section-image exports.

Manual edits update the design immediately. Design checks highlight affected controls and collect warnings without freezing the preview or blocking saved comparisons and exports. Driver selection loads dimensions directly; **Fit driver placement** and **Size chamber & port to fit** are explicit actions. Sliders batch geometry updates and briefly defer acoustic screening.

Assisted starts from its own goals, rather than carrying over Manual dimensions. Failed fitting calculations preserve the current design. Acoustic screening and Assisted candidate acceptance still require geometry supported by their models.

The direct collector model requires the entire entry projection to lie inside the equivalent active piston disk and requires positive collector depth. Invalid coupling cannot run the acoustic screen or pass rear-port fitting. This conservative geometric policy does not establish an acoustic alignment or rule out separately engineered side-entry arrangements.

The optional **Annular insert** occupies part of the collector and assumed cone recess, leaving a central opening around the full projected entry. Its clearance is measured axially from an assumed conical diaphragm; the central keepout is a provisional fraction of piston radius, not measured dust-cap geometry. The reported displaced volume comes from the same closed mesh used in the assembly. It is a volume study, not a path-equalizing phase plug or production part. Acoustic screening is unavailable while the insert is enabled because the current model does not include narrow-gap loading. Choose **Open collector** to return to the existing acoustic screen.

The **Offset-outlet insert** follows the projected horn entry, including its shape, rotation and driver offset. Opening size sets a minimum equivalent diameter; the aperture retains the entry outline with a 2 mm edge allowance. **Center relief depth** lowers the assumed cone apex to leave a flat dust-cap recess. **Inspect insert** zooms into a section cut from the same closed mesh used for rendering and volume. The mesh conservatively maintains at least the entered axial clearance to the assumed cone, but actual diaphragm and dust-cap fit still require measurements. Narrow-gap acoustics remain outside the model.

## Front chamber tradeoffs

Open **Manual → Front chamber → Compare entry / cavity**, or expand **Front chamber tradeoffs** below the design workspace. Compare the current geometry with shorter/larger-cavity and longer/smaller-cavity choices. Set the tube step and cavity change, or match the bare LC reference to inspect why equal nominal resonance does not mean equal response. Standoff is solved from the actual curved volume, and Apply changes only tube length and standoff.

The sweep uses the design’s low target and probe frequency, with voltage, end correction and horn assumptions from Acoustic screen. All curves use the current design’s peak flow reference; no candidate is ranked as a universal winner. Frequency shading, fit failures and model limits remain visible. Inserts retain geometry, area and clearance diagnostics without acoustic predictions. CSV records the baseline design, study settings, matched acoustic conditions, actual geometry, results and unavailable cases.

Read the concise [engineering reference](docs/front-chamber-reference.md) for primary evidence, equations, units, limitations and next validation steps. The offline editor embeds its essential methods and source links.

## Engineering limits

This is a design-study tool, not a validated loudspeaker design or manufacturing CAD system. It does not predict full-field directivity, replace BEM/FEM, or provide tolerance-checked production STEP geometry. Rear-port and horn radiation are not summed. Driver appearance, cone recess and some displacement/clearance assumptions remain approximate; read the in-app **Methods** and manufacturer links.

Candidate rankings apply only within the reduced model. Verify physical fit, construction, acoustic response, crossover, excursion and thermal behavior through detailed engineering and measurements. Imported crossover traces must share microphone position, timing reference and calibrated level.

## Development and checks

Edit `index.html` directly. It includes the catalogue, geometry, renderer, acoustic model and interface. Node.js 22 or newer runs the source-level regression checks without installing packages:

```sh
node --test tests/editor-regression.cjs tests/front-study-regression.cjs tests/front-study-ui.cjs
```

The tests cover large-driver placement, individual/shared sealed and ported chambers, collector coupling, finite mesh coordinates, driver grouping, live Manual edits, export setting preservation, and insert mesh closure, volume, clearance and acoustic-model boundaries. Additional comparison tests cover actual volume targets, fixed conditions, matched-LC non-equivalence, shared normalization, voltage scaling, insert gating, inertance quadrature and interface state invalidation. They do not replace visual browser testing or acoustic measurements.

## Previous application

The earlier modular Build 657 application, documentation, tests and third-party notices are preserved in [`legacy/build657/`](legacy/build657/). That is a separate historical implementation; its assembly scripts and test claims do not apply to the current editor. Git history is retained.

No project-wide open-source license has been added. Existing third-party license notices remain with the legacy dependencies.
