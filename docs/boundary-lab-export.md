# Boundary Lab project adapter

`mesh-export/boundary-lab-project.cjs` converts the completed, validated MEH
exterior surface into a portable Boundary Lab project. It does not mesh geometry,
assemble an acoustic operator, solve, or consume any previous solver result.
Browser controls, runner packaging and bundle integration are separate work.

## Integration API

```js
const {buildBoundaryLabProject} = require('./mesh-export/boundary-lab-project.cjs');
const bundle = buildBoundaryLabProject({manifest, mesh}, {
  normalConvention: 'air-outward', // native MEH boundary convention
});
// bundle.files is {relativeFilename: UTF8Text}; create parent directories,
// including requests/, before writing each file into the chosen target folder.
// Also returns validation, sources and observation_frame.
```

The mesh/manifest contract and explicit orientation options match
`buildAbecProject`. The adapter reuses that module's surface/source validation;
package `abec-project.cjs` alongside this module. No change to that module is
required. Both mesh forms are supported: `vertices_m/faces/face_tags` and
`nodes/triangles[{nodes,physicalTag}]`. The input is not mutated.

Require `manifest.units.length = "m"`, `design_sha256`, declared acoustic medium,
independent source metadata and the authoritative observation frame. Both
`air-outward` and `into-air` are accepted only when explicitly declared. Defaults
are whole-Hz `f1 = max(1, floor(min(100, f2/2)))`, `f2` from the mesh request (or
1000), and 24 frequencies. Schema 9 stores whole-Hz frequency bounds, so explicit
fractional bounds fail instead of silently truncating. Existing `f1`, `f2`,
`numFrequencies`, source/group overrides and observation-frame options work.

Files returned:

- `project.blab.json`: project schema 9, physical model 1, explicit medium.
- `boundary.msh`: ASCII Gmsh 2.2 triangles, SI coordinates, normals into air.
- `source-map.json`: original source tags/face indices, exact facet projections,
  emitted group tags, component/port/channel identities and coordinate transform.
- `boundary-manifest.json`, `adapter-validation.json`: provenance and writer checks.
- `requests/all-sources.json`, `requests/source-<original-tag>.json`: native
  headless request overlays, including a 1 m mouth-axis probe.
- `README.txt`: import, validation, basis interpretation and current limitations.

All references are relative. The writer does not assert that native preparation
has occurred; the separate native audit establishes that fact for tested files.

## Geometry and observation coordinates

Boundary Lab's standard polars use the global origin, +Z forward, XZ horizontal
and YZ vertical. Its GUI rounds imported translation settings to integer mm.
The adapter therefore bakes the following rigid frame change into the companion
MSH, with `scale_to_m = scale_factor = 1` and both translations zero:

```text
p_BLab = [horizontal; vertical; forward] * (p_MEH - mouth_origin_m)
```

The orthonormal, right-handed input frame is validated and recorded. Vertex
indices, triangle connectivity, cavities, ports, source selection and topology
are preserved; only this coordinate transform, the required orientation reversal
and physical-group retagging are applied. Transformed binary64 coordinates are
written with round-tripping decimal strings. Source projections are recomputed
against the actual emitted coordinates to account for transformation roundoff.
The original axes/projected areas remain available in the source map.

The source and cleaned mesh paths both point to `boundary.msh`. This tells the
current GUI to retain the already completed surface rather than automatically
cleaning/merging it. The single exterior mesh is not stitched or mirrored.
The mouth remains open, internal diagnostic/FEM caps are excluded, and the
HF throat is rigidly closed for the mid-only model.

## Independent prescribed-velocity sources

Every physical driver and vent remains one `ideal_velocity_source` component,
one `normal_velocity` excitation port and one separately named channel. A unit
port represents 1 m/s **axial** velocity. On face `i` the prescribed normal
velocity is `u * dot(normal_into_air[i], motion_into_air)`.

The current exterior backend supports a uniform profile within each physical
boundary plus positive `boundary_motion_weights`. Facets are therefore grouped
only when their binary64 projection values are exactly equal. There is no
rounding, dB conversion, average-normal approximation, uniform cone-normal
velocity substitution, or source merging. The original physical tag identifies
the first subgroup; other subgroups receive noncolliding physical tags. The
component owns the complete original source, and the source map preserves every
facet's original and emitted tag. Exact grouping can produce thousands of
boundaries on oblique sources; this is intentional and affects preparation cost.

The compiler's weighted source area is `sum(face_area * projection)`, equal to
the axial projected area. Surface area and nominal driver Sd are separate fields.
Full-surface winding/manifold checks, source orientation and manifest-area checks
fail closed. They do not replace the native geometry self-intersection gate.

All channels have neutral gain, delay and polarity. Channel correction is
disabled. The schema has **no exact channel mute**: vent channels are not silently
assigned a small nonzero gain or an invented mute flag. Combined GUI plots sum
the selected channel responses and are arbitrary unit-velocity superpositions.
Use a one-source request to prepare/solve one independent basis. `voltage_v` does
not drive normal-velocity ports; saved driver voltages remain provenance only.
There is no motor, crossover, rear-chamber network or solved reflex response.

## Native preparation and checks

With Boundary Lab installed, from a written bundle directory:

```sh
blab project validate project.blab.json --backend beat_cpu --json
blab project validate project.blab.json --backend beat_cpu --request requests/source-101.json --json
```

From this repository:

```sh
node --test tests/boundary-lab-project.cjs
python -B tests/boundary-lab-native-audit.py /path/to/boundary-lab-bundle
# Optional: compare to original native-root/<bundle-basename>/ artifacts too.
python -B tests/boundary-lab-native-audit.py --native-root /path/to/native-root /path/to/boundary-lab-bundle
```

The Python audit requires the actual Boundary Lab installation and its pinned
BEAT Python contract, NumPy and meshio. It calls the real loader/migration,
compiler and `prepare_headless_solve(..., backend_id="beat_cpu")`, checks mesh
topology/winding, full boundary coverage, exact group weights, independently
reconstructed normal projections, weighted source areas, channels and all
single-source request overlays. It neither starts Julia nor assembles/solves an
operator. No acoustic accuracy or prior Boundary Lab acoustic result is implied.

The focused JavaScript tests also cover 2/4/6 drivers, vent independence,
near-equal weights that must remain distinct, transformed observation frames,
orientation reversal, SI settings, provenance and rejected invalid inputs.

Validation on 2026-09-29 passed all 202 repository JavaScript tests (including
seven focused adapter tests). The actual reference loader/compiler/preparation
passed twelve completed native meshes, from 57,510 to 247,346 triangles, covering
2/4/6 mids, individual/shared sealed geometry, offset/open-entry cases, and
individual/shared round/rectangular vent layouts. All 62 single-source requests
prepared successfully. The actual `blab project validate` CLI also accepted the
shared-round-vent one-source request.

Original-native parity passed across the same twelve meshes: zero coordinate
error relative to the declared transform, exact indexed winding reversal, all
original source memberships retained, maximum facet-projection change
`3.09e-14`, and maximum projected-source-area relative change `4.67e-15` from
floating-point rebasing. Emitted facet weights themselves are unrounded.
No Julia/native-engine import or acoustic solve was run. These checks establish
the project/mesh/preparation contract, not acoustic correctness or convergence.

## Schema provenance

Inspected the read-only Boundary Lab reference at commit
`bb9030c4ae0b5906569b3b3932e221a0c97670ac` (package `0.5.0.dev0`), primarily:

- `src/blab/project/io.py`, `model.py`, `migration.py`: schema 9 and path handling.
- `src/blab/physical_model.py`, `physical_compiler.py`, `component_symmetry.py`:
  physical model 1, boundary weights and projected-area normalization.
- `src/blab/solvers/coupled_backend.py`: supported exterior capabilities.
- `src/blab/headless.py`, `system_solve.py`: preparation, unit ports and polars.
- `src/blab/ui/main_window/project_workflow.py`, `ui/mesh_assembly.py`:
  GUI transform serialization and mesh-cleaning behavior.
- `src/blab/channel_synthesis.py`, `ui/source_channel_config.py`: channel behavior.

These are format/contract references. No Boundary Lab implementation or acoustic
operator is copied into MEH; the adapter is original project-writing code.
