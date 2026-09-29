The broadband sizing extension and authentic Hornresp comparisons are documented in [ACOUSTIC_REVIEW.md](../ACOUSTIC_REVIEW.md). The qualified local-FEM path described below remains separately identified.

# Experimental coupled system analysis

The **System acoustics** panel connects individually represented mid motors, their front passages, the axial horn network and the rear enclosure. It reports complex entry pressure/flow, per-driver electrical impedance, peak cone travel, area-averaged entry speed, total horn-mouth flow and power into the assumed mouth termination. These are small-signal model results, not radiated SPL or validated loudspeaker performance.

The editor currently places identical mids at one axial station and drives them equally. The backend keeps their source and load records separate and supports different axial positions and complex drives. A muted driver remains a passive load. Sources at the same axial station share pressure in this model; circumferential differences are not resolved.

## Insert passage

An insert requires a qualified spatial two-port. No insert response is substituted from front volume alone. The local domain extends from the assumed moving cone to the curved entry cap, including the cone gap, insert opening, collector and tube. The front matrix replaces the entire old front compliance and neck inertance, including the old empirical neck end correction. The outlet's junction with the full horn remains a reduced port boundary, not a spatial junction solution.

Both matrix flows point into the local domain, using RMS phasors with `exp(+j omega t)`. Therefore the entry flow toward the horn is the negative of the local outlet-port flow. Pressure and flow are power-conjugate. If the meshed cone's projected area differs from catalog Sd, the matrix undergoes the congruence transform `diag(s,1) Z diag(s,1)`, with `s = projected area / catalog Sd`. This preserves power and reciprocal cross terms.

Imported data must match the normalized front geometry, air density, sound speed, geometry implementation, convention and exact frequency. Unqualified frequencies break the curves. There is no interpolation across missing results. Voltage and rear-volume changes recalculate the coupled network without remeshing the unchanged front passage; changing a passage dimension invalidates the spatial data.

## What the prototype does not establish

- The cone and dust cap are geometric surrogates. The real diaphragm profile, surround and actual clearances need measurement.
- The local FEM uses lossless pressure acoustics with rigid walls. It does not resolve thermoviscous gap loss, turbulence, nonlinear compression, cone breakup or heating.
- Catalog Mms includes free-air loading. A physically audited Mmd/radiation convention is still needed for absolute motor-to-spatial-air predictions. Results remain exploratory while that convention is unresolved.
- The external horn uses a plane-wave Webster network, with assumed mouth and throat terminations. The shaded transverse-mode reference is a model-limit cue, not a validated usable-band cutoff.
- Full spatial horn/entry junctions, azimuthal driver interactions, exterior diffraction, off-axis coverage and rear/front radiation summation are not solved.
- No calibrated compression-driver acoustic source is present. Normalized throat sources can test coupling but cannot establish real HF SPL or crossover summation. The separate measured-response workbench requires calibrated traces with common timing and microphone position.
- Mesh convergence and power balance verify numerical consistency. They do not validate the modeled loudspeaker. A coarse frequency sweep can miss resonant peaks.

## Included reference case

Import `examples/offset-insert-study.json` to reproduce the supplied offset-insert study. The expanded embedded native insert dataset has 19 independently qualified frequencies, every 50 Hz from 100 to 1,000 Hz. The open-collector reference retains its original five frequencies. The final matrix change between the two finest meshes ranges from 0.00101% to 0.13725%; the meshes have 22,695, 47,628 and 98,721 pressure unknowns. These are numerical refinement results, not a physical error bound.

The saved drive is 1 V RMS per mid. The wizard brief's 2.83 V is not silently substituted. The original detail panel connects sampled points; the new Acoustic sizing panel shows native samples as unconnected dots. resonances between them remain unresolved. Each CSV records the current normalized design, drive, boundary assumptions and spatial provenance.

A qualified open-collector reference, when present for the same dimensions, is overlaid using its own spatial matrix and the same motor/rear/horn assumptions. A missing or failed reference is not replaced by an unqualified curve.

## Local pressure map

The 700 Hz map combines both complex unit-flow pressure fields using the actual coupled cone and entry flows. It is not a recolored or rescaled reference-load image. It rechecks the mesh, geometry, matrix, phasor convention and source-area normalization before display. Drive and rear-loading edits recompute the pressure; passage edits invalidate it. Port-matrix convergence does not establish pointwise field convergence, which remains unassessed.

## Portable editor and native calculations

The browser evaluates the coupled network and can use an embedded or imported qualified spatial dataset. It does **not** run the native spatial solver. A changed passage needs a new native mesh/solve/convergence cycle; the browser explicitly withholds the stale curves until a matching result is loaded.

The reusable JavaScript sources are in `acoustics/`. Run `node acoustics/embed.cjs` after editing them to update the single-file editor. This checks the geometry-kernel hash before embedding data. Geometry changes require new spatial results and reviewed provenance. Keep the editor, modules and data in the same commit.

Run the source and numerical regression suite with:

```sh
node --test tests/editor-regression.cjs tests/front-study-regression.cjs tests/front-study-ui.cjs tests/multiport-network.cjs tests/coupled-system.cjs tests/spatial-study.cjs tests/pressure-field.cjs
```

The suite includes equivalence to the existing equal-drive circuit, mutual loading, muted-driver coupling, source superposition, reciprocal impedance, power balance, data invalidation, projected-area normalization, voltage scaling and plot gaps. Source-level UI harnesses do not replace rendered browser checks.

The full native reproduction package, frozen air boundaries, numerical records and inspected figures are in [native-front-fem](../native-front-fem/README.md). Its manifest retains source and artifact hashes. Read [the native report](../native-front-fem/release/MEH_Insert_FEM_Prototype_Report.md) for benchmark and mesh-refinement results. Convert a qualified native result with `node acoustics/import-native.cjs native-result.json acoustics/data/current-insert.json`, then run the embedding step.
