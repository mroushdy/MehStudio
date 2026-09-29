# Insert-aware acoustic prototype — verified first release

29 September 2026

The native prototype now solves the actual three-dimensional front-air passage for the saved design, including the insert’s cone-facing gap and horn-entry tube. Five frequency samples pass explicit mesh-refinement and physical-matrix checks. The exported matrices are ready for a separate motor/horn coupling model.

## Delivered result

- `MEH_Insert_FEM_TwoPort.json`: qualified two-port matrices, exact input state, source/geometry/mesh fingerprints, conventions and per-frequency checks.
- `MEH_Insert_FEM_PressureSlice_700Hz.json`: complex pressure samples on the local centre plane under a declared reference outlet load.
- `MEH_Insert_FEM_PressureBasisSlice_700Hz.json`: both complex unit-flow fields on the same plane, for reconstruction with the system model’s actual solved port flows.
- `MEH_Open_FEM_TwoPort.json` and `MEH_Insert_FEM_Comparison.png`: a separately qualified open-front baseline and discrete comparison under the declared reference outlet resistances.
- `MEH_Insert_FEM_Pressure_700Hz.png`, `MEH_Insert_FEM_Diagnostics.png` and `MEH_Insert_FEM_Benchmarks.png`: inspected figures.
- `MEH_Front_FEM_Prototype.zip`: portable source, dependency specification, frozen input fixtures and numerical records; native environment binaries and generated volume meshes are excluded.

## Numerical evidence

Independent analytic checks cover duct impedance and phase, several loads and power balance, closed-cavity modes, and a distributed FEM neck attached to an ideal cavity compliance. The reference code passes 44 checks. All 10 numerical acceptance checks pass, as do five qualification checks (one valid-record check and four fault injections). Finest benchmark errors: 0.00146% for the complex duct matrix and 0.01021% for the first six cavity-mode frequencies. These are benchmark results, not an error bound for the loudspeaker.

The design was solved on the same frozen air boundary using three independently sized tetrahedral meshes:

| Maximum element size | Tetrahedra | Pressure unknowns |
|---|---:|---:|
| 3.0 mm | 83,269 | 22,695 |
| 2.0 mm | 195,141 | 47,628 |
| 1.4 mm | 442,332 | 98,721 |

Every released sample passes the 0.5% final mesh-change threshold for the complex matrix, reference-loaded flow transfer and loaded input impedance, plus a 0.5° phase-change threshold. Changes decrease with refinement. Additional gates cover reciprocity, passivity, algebraic residual, energy balance, geometry volume and closed-mode proximity.

| Frequency | Final matrix change | Final outlet-flow change | Phase change |
|---:|---:|---:|---:|
| 100 Hz | 0.00101% | 0.00212% | 0.00020° |
| 300 Hz | 0.00938% | 0.01719% | 0.00441° |
| 500 Hz | 0.02764% | 0.04089% | 0.01476° |
| 700 Hz | 0.05877% | 0.06825% | 0.02867° |
| 1000 Hz | 0.13725% | 0.11359% | 0.05208° |

The largest final loaded-input-impedance change is 0.10763%. The worst fine-mesh algebraic residual is 1.33×10⁻¹⁰; reciprocal-symmetry error is below 2.88×10⁻¹⁴. The first closed-domain modes are near 2049 and 2050 Hz. The release contains only the five listed samples; it does not resolve or certify features between them.

The completed fine run took 218.34 seconds, including its modal check, five two-source solves and 700 Hz slice, as recorded by its final wall-clock measurement. The original JSON timing of 217.52 seconds was recorded before the slice; the release preserves that field and also records the full time. Meshing took 7.32 seconds. These timings exclude earlier trial runs and do not imply interactive performance. The original fine run was interrupted after the overnight pause without a completed result; the released run saved a checkpoint after each frequency.

The open-front baseline also qualifies at all five frequencies, using 19,309 / 44,293 / 104,976 pressure unknowns on 3.0 / 2.0 / 1.4 mm meshes. Its largest final changes are 0.16429% for the matrix, 0.09395% for outlet flow, 0.02299% for loaded input impedance and 0.05383° for phase. The fine run took 325.44 seconds. An earlier 4.0 / 3.0 / 2.0 mm sequence failed the decreasing-change gate; that record is retained. No acceptance threshold was relaxed.

## Geometry and coupling

The source is the repaired canonical adapter/insert geometry, fingerprinted at `418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5`. The saved state uses the offset insert, 87 mm requested opening, 2.75 mm clearance, zero offset, 28.05 mm standoff and 45.83497844237541 mm entry diameter. The existing cone is an explicitly assumed conical surface. The request’s 8 mm centre relief does not intersect the remaining insert material in this particular large-opening design.

The connected air mesh retains the cone gap. Its volume is 200.391896 cm³. The editor’s scalar volume is 199.231898 cm³; the difference is accounted for by +1.195335 cm³ from the curved entry interface and −0.035336 cm³ from polygonal cone tessellation. No volume-only replacement or volume rescaling was used. The artificial outlet cap follows the exact horn-cut perimeter but uses a declared nonplanar fan interior.

Conventions are RMS phasors with exp(+jωt); both flows point into the local air domain. Matrix units are Pa·s/m³. The cone pressure is weighted by the axial-motion shape; outlet pressure is conjugate to uniform inward normal flow. The cone projected area is 0.01319469958157574 m², versus nominal motor Sd of 0.0132 m². A motor using nominal Sd must apply the power-preserving area transformation recorded in the native README. The entire front passage is included, so its neck inertia and compliance must not be added again.

## Interpretation and remaining work

These are lossless, linear predictions for an unmeasured rigid-cone surrogate. They omit viscous and thermal gap losses, actual dust-cap/surround shape, cone breakup, nonlinear motion and thermal compression. The outlet has one assumed flow shape; actual horn-junction scattering and higher interface modes remain unresolved. The matrix must be recalculated after geometry changes.

The 700 Hz image uses 10⁻⁵ m³/s RMS cone flow and a reference resistance of approximately 249,428 Pa·s/m³. It is not the actual horn load. Its port response passes the numerical gates; pointwise field convergence was not assessed. It does not show calibrated loudspeaker SPL.

The additional 700 Hz basis file exports pressure per unit inward flow at each port. A system model can reconstruct its local field as `p = Q1·basis[0] + Q2·basis[1]`, using complex flows: `Q1=(Sm/Sd)·Qcatalog` and `Q2=−Qentry` when horn-entry flow is defined outward. The basis was recomputed on the same fine mesh in 37.18 seconds and checked against the qualified matrix and existing reference slice. Pointwise field convergence remains unassessed, including for a reconstructed coupled field. The reference-slice reconstruction error was 1.49×10⁻¹⁶ relative, and the recomputed two-port matrix matched the released 700 Hz row exactly.

The current dataset provides the front-domain part needed by the parent’s coupled motor/horn model. Full spatial horn/exterior fields, directivity, calibrated compression-driver sources, measured handoff and narrow-gap loss validation remain separate work. The moving-mass convention must also be audited before claiming calibrated voltage-driven performance.

## Local reproducibility

The isolated Mac ARM64 stack is Python 3.12.13, Gmsh 4.15.2, DOLFINx 0.11.0, complex PETSc 3.25.5, SciPy 1.18.1 and NumPy 2.5.3. DOLFINx/PETSc assembles the matrices; serial SciPy SuperLU with COLAMD performs the factorizations. The archive contains the exact 298-package environment specification and command sequence. No global solver installation, application merge or publication was performed.

The [DOLFINx complex Helmholtz example](https://docs.fenicsproject.org/dolfinx/main/python/demos/demo_helmholtz.html) and [acoustic boundary tutorial](https://jsdokken.com/dolfinx-tutorial/chapter2/helmholtz_code.html) support the formulation. The [coupled-driver example](https://doc.comsol.com/6.3/doc/com.comsol.help.models.aco.lumped_loudspeaker_driver/lumped_loudspeaker_driver.html) documents the force/velocity and moving-mass distinctions relevant to subsequent motor coupling.
