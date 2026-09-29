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

## Portable editor and native calculations

The browser evaluates the coupled network and can use an embedded or imported qualified spatial dataset. It does **not** run the native spatial solver. A changed passage needs a new native mesh/solve/convergence cycle; the browser explicitly withholds the stale curves until a matching result is loaded.

The reusable JavaScript sources are in `acoustics/`. Run `node acoustics/embed.cjs` after editing them to update the single-file editor. This checks the geometry-kernel hash before embedding data. Geometry changes require new spatial results and reviewed provenance. Keep the editor, modules and data in the same commit.

Run the source and numerical regression suite with:

```sh
node --test tests/editor-regression.cjs tests/front-study-regression.cjs tests/front-study-ui.cjs tests/multiport-network.cjs tests/coupled-system.cjs tests/spatial-study.cjs
```

The suite includes equivalence to the existing equal-drive circuit, mutual loading, muted-driver coupling, source superposition, reciprocal impedance, power balance, data invalidation, projected-area normalization, voltage scaling and plot gaps. Source-level UI harnesses do not replace rendered browser checks.
