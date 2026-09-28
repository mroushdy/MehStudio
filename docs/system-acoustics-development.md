# Whole-system acoustics development

This branch extends the earlier front-cavity comparison toward a coupled system analysis. It does not yet claim a complete spatial loudspeaker prediction.

## Working numerical components

`acoustics/multiport-network.cjs` splits the existing conical Webster network at every distinct source station. It keeps independent complex source flows and passive source admittances, solves them simultaneously, and returns self/mutual impedances, source pressure/flow, mouth flow and a power audit. Colocated sources share pressure under the axial approximation. Muting a source retains its passive termination.

`acoustics/coupled-system.cjs` solves the motor, front acoustic two-port, horn and rear chamber together. Individual RMS voltages may differ in magnitude and phase. A shared rear chamber has one pressure node. The results include per-driver current, excursion, entry velocity and pressure, and total electrical/acoustic power balance. A throat source may be specified with an explicitly calibrated or normalized acoustic flow and passive source admittance; electrical impedance is not substituted for an acoustic source model.

A front spatial result supplies a 2 × 2 complex impedance matrix at each exact frequency. Both flows point into the local air domain, so its second coordinate is minus the neck flow toward the horn. Pressures are the power-conjugate interface averages. Units are Pa and m³/s, with RMS phasors exp(+jωt). The interface rejects unavailable, stale-frequency, nonreciprocal or nonpassive matrices. An enabled insert cannot fall back to a cavity-volume circuit. Resolved neck geometry must not receive another lumped neck or end correction.

## Geometry correction

The insert's inner wall and cone-facing surface are part of one canonical adapter boundary. There is no duplicate adapter/insert contact face and no separate overlapping rendered insert solid. The exact conservative cone-clearance triangles are retained. Extra angular stations retain the entry corners and are deduplicated before Float32 rendering. The user's 87 mm opening setting / 2.75 mm clearance case is covered, along with offset slot and teardrop cases that exposed folded contact faces.

This does not silently change a large insert opening to equal the smaller horn entry. The taper remains part of the selected geometry.

## Required before full-system claims

The local insert-aware finite-element prototype is being developed separately. Its matrix needs tagged air-domain boundaries, mesh convergence, source normalization, geometry hashes, passivity and reciprocity checks before integration. Lossless pressure acoustics does not calculate thermoviscous loss in the gap.

The axial horn network still omits circumferential coupling, transverse fields, lip diffraction and observer-dependent directivity. Those require a spatial horn/exterior solve. Catalog moving mass includes free-air loading; coupling an explicit air field requires an audited Mms/Mmd convention. All catalog compression drivers lack calibrated complex acoustic source data. Measured handoff requires common-position, common-timing, level-calibrated complex responses tied to the same geometry.

## Checks

Run `node --test tests/*.cjs`. Numerical checks cover exact reduction to the existing single-junction and equal-drive models, reciprocity, coherent summation, independent axial locations, passive muted-driver loading, normalized throat excitation, and electrical/acoustic energy balance. Geometry checks cover a closed joined boundary and preservation of the cone-clearance surface. These checks are not physical measurement validation or browser-rendered QA.
