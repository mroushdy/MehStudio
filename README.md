# MEH Studio

A browser-based multiple-entry-horn study tool. The current editor is one self-contained HTML file with no installation, build step, or external JavaScript dependencies.

## Open the editor

Download [`index.html`](index.html) using **Download raw file**, then open it in a modern browser. Keep that one file to use the editor offline.

Or clone this repository and serve it locally:

```sh
python3 -m http.server 8520 --bind 127.0.0.1
```

Open **http://127.0.0.1:8520/**.

## What it does

- Manual and Assisted design with R-OSSE rev7 horn profiles.
- Round, capsule and teardrop entries; two, four or six cone mids.
- Individual pods or a shared rear enclosure, with sealed or ported loading and a cylindrical or curved shared shell.
- Driver selection grouped by nominal size in inches. Manufacturer-referenced dimensions distinguish sourced geometry from representative appearance and clearance envelopes.
- 3D assembly, section and entry-footprint views, point measurements, and saved comparisons.
- Reduced linear acoustic screening using supported driver motor data and a one-dimensional Webster horn network.
- A measured-response crossover workbench, plus JSON, CSV and section-image exports.

Assisted starts from its own goals, rather than carrying over Manual dimensions. Failed calculations preserve the current design. An invalid manual entry, driver offset or rear-chamber edit stays pending, with the affected controls highlighted and the last valid geometry still visible. Correct it or choose **Discard edits**.

The straight collector model requires the entire entry projection to lie inside the equivalent active piston disk and requires positive collector depth. Invalid coupling cannot run the acoustic screen or pass rear-port fitting. This conservative geometric policy does not establish an acoustic alignment or rule out separately engineered side-entry arrangements.

## Engineering limits

This is a design-study tool, not a validated loudspeaker design or manufacturing CAD system. It does not predict full-field directivity, replace BEM/FEM, or provide tolerance-checked production STEP geometry. Rear-port and horn radiation are not summed. Driver appearance, cone recess and some displacement/clearance assumptions remain approximate; read the in-app **Methods** and manufacturer links.

Candidate rankings apply only within the reduced model. Verify physical fit, construction, acoustic response, crossover, excursion and thermal behavior through detailed engineering and measurements. Imported crossover traces must share microphone position, timing reference and calibrated level.

## Development and checks

Edit `index.html` directly. It includes the catalogue, geometry, renderer, acoustic model and interface. Node.js 22 or newer runs the source-level regression checks without installing packages:

```sh
node --test tests/editor-regression.cjs
```

The tests cover large-driver placement, individual/shared sealed and ported chambers, collector coupling, finite mesh coordinates, driver grouping and Manual edit transactions. They do not replace visual browser testing or acoustic measurements.

## Previous application

The earlier modular Build 657 application, documentation, tests and third-party notices are preserved in [`legacy/build657/`](legacy/build657/). That is a separate historical implementation; its assembly scripts and test claims do not apply to the current editor. Git history is retained.

No project-wide open-source license has been added. Existing third-party license notices remain with the legacy dependencies.
