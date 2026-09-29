# Native front-passage FEM prototype

This research prototype solves the **air domain between an assumed cone and the horn-entry interface**, including the actual insert passage. It exports a two-port acoustic impedance matrix for coupling to a separate motor/horn network. It does not solve the complete loudspeaker, exterior radiation, directivity, crossover or thermoviscous loss.

A separate browser integration can display and couple a precomputed exact-geometry dataset. Changing the geometry requires a new native solve. Interpolating an old result or changing only its cavity volume is not a recalculation.

## Minimal source set

- `geometry/extract-air.cjs`, `geometry/load-editor.cjs`: read a fingerprinted editor and saved study; construct and audit tagged air surfaces.
- `mesh_air.py`: preserve the exported triangular air boundary and generate tetrahedra with Gmsh.
- `fem_core.py`: DOLFINx assembly and serial sparse solves; real lossless operator, complex phasor response.
- `solve_front.py`: frequency sweep, two-port extraction, checkpoints, metadata and optional 700 Hz pressure and unit-flow basis slices.
- `qualify_results.py`: compare three meshes at each exact frequency and apply explicit numerical gates.
- `benchmarks_reference.py`, `run_benchmarks.py`: independent analytic references and numerical verification. `test_qualification.py` tests rejection of deliberately invalid study records.
- `plot_results.py`: benchmark, pressure-slice, qualified inserted-sample diagnostics and optional open/insert comparison figures.
- `environment-osx-arm64.explicit.txt`: exact 298-package native macOS ARM64 environment specification used here.

Keep native environment binaries, caches and generated `.msh` files out of application source control. Retain input fixtures, qualified JSON, benchmark/convergence records and source/mesh fingerprints as review artifacts. `solver_performance.py` is an optional diagnostic, not required to reproduce the model.

## Tested runtime and installation

The task-local environment runs Python 3.12.13, DOLFINx 0.11.0, PETSc/petsc4py 3.25.5 with complex128 scalars, Gmsh/python-gmsh 4.15.2, SciPy 1.18.1 and NumPy 2.5.3. It was installed inside this task, without a global package installation.

Node.js is separately required for geometry extraction and is not included in the conda specification. The local Node executable is v24.18.0. No npm packages are required by the extractor. To use the supplied air surfaces directly, Node is unnecessary.

With a micromamba executable available, create a local prefix from the explicit specification:

```sh
MAMBA_ROOT_PREFIX="$PWD/runtime/mamba-root" XDG_CACHE_HOME="$PWD/cache" \
  micromamba create --yes --prefix "$PWD/runtime/env" \
  --file environment-osx-arm64.explicit.txt
```

This exact specification is platform-specific. Other systems need compatible builds and must rerun the benchmarks. Complex PETSc is verified by the code; a real-only PETSc environment is rejected.

For the following commands, run from this prototype directory and set local cache paths. Single-process MPI is intentional; the matrix extraction currently does not support multiple ranks.

```sh
export OMPI_MCA_btl=self OMPI_MCA_pml=ob1
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
export XDG_CACHE_HOME="$PWD/cache"
export MPLCONFIGDIR="$PWD/cache/matplotlib"
PYTHON="$PWD/runtime/env/bin/python"
mkdir -p cache results
```

## Verification before a design solve

```sh
"$PYTHON" benchmarks_reference.py
"$PYTHON" run_benchmarks.py
```

The reference suite contains 44 analytic check groups. Numerical checks cover complex duct impedance/phase, several independent terminal loads, absorbed power, three-dimensional closed-cavity eigenfrequencies, an ideal-compliance Helmholtz resonator with a distributed FEM neck, mesh refinement, reciprocity and passivity. The ideal-compliance resonator is deliberately not a claim that an arbitrary meshed cavity/opening obeys a lumped formula without end effects.

## Frozen geometry

The initial fixture is the user's centered, round-entry offset insert with 87 mm requested opening, 2.75 mm clearance, 28.05 mm standoff and 45.83497844237541 mm entry diameter. The canonical source was explicitly frozen at SHA-256 `418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5`.

The extractor accepts paths and a source fingerprint. It currently asserts this centered round geometry and the canonical ring correspondence. It is not a general CAD importer.

```sh
node geometry/extract-air.cjs geometry/editor-418b696f.html \
  geometry/user-study.json \
  418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5 \
  geometry
```

The local coordinate frame is `[u,v,z]` in meters, with +z toward the magnet. The active conical diaphragm closes the air above; the mounting annulus is rigid. The artificial horn-side port is a nonplanar star fan over the exact curved aperture perimeter. See `geometry/README.md` for volume differences, triangulation and projected-area accounting. No volume scaling is applied.

## Mesh, solve and qualify

Generate three independently sized meshes of the same frozen boundary:

```sh
"$PYTHON" mesh_air.py geometry/inserted-air.json geometry/inserted-3mm.msh --size .003
"$PYTHON" mesh_air.py geometry/inserted-air.json geometry/inserted-2mm.msh --size .002
"$PYTHON" mesh_air.py geometry/inserted-air.json geometry/inserted-1_4mm.msh --size .0014
```

Use identical explicit frequencies for every mesh. The initial review release is sparse: 100, 300, 500, 700 and 1000 Hz. The solver does not interpolate matrices or claim narrow resonances between samples were resolved.

```sh
"$PYTHON" solve_front.py geometry/inserted-air.json geometry/inserted-3mm.msh results/inserted-3mm-sample.json --frequencies 100,300,500,700,1000
"$PYTHON" solve_front.py geometry/inserted-air.json geometry/inserted-2mm.msh results/inserted-2mm-sample.json --frequencies 100,300,500,700,1000
"$PYTHON" solve_front.py geometry/inserted-air.json geometry/inserted-1_4mm.msh results/inserted-1_4mm-sample.json --frequencies 100,300,500,700,1000 --slice --eigen
"$PYTHON" qualify_results.py results/inserted-3mm-sample.json results/inserted-2mm-sample.json results/inserted-1_4mm-sample.json results/inserted-qualified.json
"$PYTHON" test_qualification.py
"$PYTHON" plot_results.py --sample inserted-qualified.json --outputs-dir outputs
```

Checkpoint files are explicitly unqualified. A final file is not available merely because its linear solve converged. Qualification checks matrix, loaded-transfer and loaded-input-impedance changes below 0.5%, phase change below 0.5°, decreasing matrix mesh change, reciprocal symmetry, passive Hermitian part, linear residual, power balance, volume agreement and distance from the computed closed-domain modes with sufficient modal coverage. The export includes exact thresholds and a pass/fail record for every frequency. These are engineering acceptance choices, not universal physical accuracy guarantees.

The optional open-collector reference changes only `frontFiller` to `none`. It must undergo its own mesh qualification. Its canonical angular tessellation differs slightly, so its own projected diaphragm area must be used.

## Coupling contract

Time dependence is `exp(+j omega t)` and amplitudes are RMS. Both port flows point **into** the local domain. `p = Z Q`, with pressure in Pa, flow in m³/s and Z in Pa·s/m³. Positive cone flow is motion toward the horn. The outlet's outward neck flow is `−Q2`.

The cone basis is `beta = (n_air dot +z) / coneProjectedAreaM2`. Its weighted pressure is power-conjugate to the projected-volume flow. Uniform normal flow defines the outlet basis. Both basis integrals are normalized to one and recorded in the port metadata.

If a motor model uses catalog `Sd`, while this matrix uses projected mesh area `Sm`, define `s=Sm/Sd` and transform `Z_motor = diag(s,1) Z_mesh diag(s,1)`. This preserves force/velocity power and reciprocal/passive behavior. Do not substitute curved cone surface area. The exported `ports` record includes both areas.

Do not add another front compliance, neck inertance or end correction over air already resolved by this model. Audit `Mms` versus dry moving mass before treating voltage-coupled output as physically calibrated. The current data do not resolve that manufacturer convention.

### Optional 700 Hz field basis

Export both complex unit inward-flow fields on the same plane, without imposing a particular outlet load:

```sh
"$PYTHON" solve_front.py geometry/inserted-air.json geometry/inserted-1_4mm.msh \
  results/inserted-700hz-basis.json --frequencies 700 --basis-slice
```

This writes `results/inserted-700hz-basis.json.basis-slice.json`. Alternatively, add `--basis-slice` to the fine sweep above to obtain the basis during that solve. The frequency list must include 700 Hz. Both `basis` entries share `xM`, `zM` and `validFlatIndices`; entries outside those indices are outside the sampled air domain. The complex values have units Pa per (m³/s RMS inward flow). Reconstruct the pressure using complex flows at the same frequency and conventions:

```text
p = Q1_in * basis[0] + Q2_in * basis[1]
Q1_in = (Sm / Sd) * Qcatalog
Q2_in = -Qentry
```

Here `Qcatalog` is cone flow defined using catalog `Sd`, `Sm` is the exported projected mesh area, and `Qentry` points out of the front domain into the horn. Do not apply the area transformation twice. These basis fields enable linear reconstruction under a separate coupled load; they do not add a horn, motor or loss model. This single-frequency export is unqualified until matched to the same mesh and geometry in the qualified matrix record. Pointwise field convergence remains unassessed, even when the port response passes its mesh-change checks.

## Practical limits

The field is lossless, linear and based on an unmeasured rigid conical surrogate. No dust-cap/surround profile, cone breakup, viscosity, thermal loss, turbulence, large-signal excursion or motor heating is represented. The port basis does not resolve actual horn-junction scattering or all interface modes. Mesh convergence applies to the frozen piecewise-planar boundary, not to these physical assumptions.

The reference-loaded 700 Hz slice uses an explicitly stated RMS cone volume flow and a reference resistive outlet load `rho*c/outletSurfaceArea`. It is a local field diagnostic, not a horn/motor or far-field SPL prediction. Pointwise field convergence is not assessed. Sparse frequency samples may miss narrow features. Every geometry change invalidates the exact-design matrix until recalculated.

Sparse direct-solve runtime depends strongly on mesh, ordering and concurrent load. Preserve measured timings in the JSON rather than promising interactive recalculation. In one controlled same-matrix ordering probe, real COLAMD was substantially faster than MMD despite larger factor fill; the production prototype retains COLAMD.

Primary formulation references: [DOLFINx complex Helmholtz demo](https://docs.fenicsproject.org/dolfinx/main/python/demos/demo_helmholtz.html), [DOLFINx acoustic boundary tutorial](https://jsdokken.com/dolfinx-tutorial/chapter2/helmholtz_code.html), [Gmsh manual](https://gmsh.info/doc/texinfo/), and [coupled lumped-driver/FEM example](https://doc.comsol.com/6.3/doc/com.comsol.help.models.aco.lumped_loudspeaker_driver/lumped_loudspeaker_driver.html).
