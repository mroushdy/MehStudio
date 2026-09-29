# MEH acoustic mesh exporter

The offline editor's **Export → Acoustic solver export** disclosure downloads a canonical geometry job for the current design and a matching local runner ZIP, both available offline. The native runner turns that job into a connected acoustic boundary and an ABEC project. It does not concatenate display meshes or export a manufacturing STL.

## Local runner for an editor download

Click **Download geometry job** and **Download local runner**. Extract the ZIP and
follow [START_HERE.md](START_HERE.md): install Python 3.10–3.13 and Node.js 22+,
then run `python3 run.py --setup` once. Setup installs pinned Gmsh, NumPy and SciPy
into the runner's own `.venv`; it does not modify system packages. On Windows,
use `py -3.12` in place of `python3`.

Put the geometry job beside `run.py`, then run:

```sh
python3 run.py MEH_acoustic_geometry.json
```

The runner writes a new dated output folder beside the job. It preserves the
input, logs native output, checks completion of native geometry and ABEC adapter
gates, and records actual runtime versions, source hashes, triangle count and a
dense-matrix memory estimate. Existing output folders are never overwritten.
Only `EXPORT_COMPLETE.txt` marks a completed geometry export; `INCOMPLETE.txt`
marks a failed/interrupted run whose partial files must not be imported. No
AKABAK import or solve is performed by this runner. The complete bundle still
needs proprietary inspection and acoustic convergence work.

For an existing native environment, `--python /path/to/python` uses it without
installing packages. `--check` tests runtime loading without meshing. Surface
meshing is the default; the browser's optional volume request is honored and a
failed volume gate withholds completion. Intersection validation cannot be
bypassed through the packaged runner.

`node mesh-export/runner-package.cjs OUTPUT.zip` creates the same deterministic
ZIP embedded in the offline editor. `node mesh-export/embed.cjs` refreshes both
browser modules and the runner after native source changes. No runtime binary,
manual, reference document or credential is included.

## Reproduce from the source checkout

Use Python with Gmsh 4.15.2, NumPy and SciPy. VTK is used only for optional certified surface simplification; complex DOLFINx/PETSc is used only for native numerical smoke checks. No packages are installed by these scripts.

```sh
node mesh-export/extract.cjs examples/acoustic-mesh-study.json work/acoustic-geometry.json
python mesh-export/build_mesh.py work/acoustic-geometry.json --out work/solver-bundle --no-volume
```

The browser job carries the FEM checkbox, which is off by default because the exact whole-horn tetrahedral mesh has not passed quality checks. For command-line extraction, request a volume explicitly with `--volume`. Gap size defaults to half the entered axial clearance. The `--size-mm` option overrides the global edge target; `--gap-divisions` controls local volume refinement. Such settings are initial density requests, not a validated upper frequency.

```sh
python mesh-export/build_mesh.py work/acoustic-geometry.json --out work/solver-bundle --volume
python mesh-export/native_smoke.py work/solver-bundle/front-air.msh \
  --manifest work/solver-bundle/manifest.json --out work/solver-bundle/native-smoke.json
python mesh-export/plot_mesh.py work/solver-bundle work/mesh-sections.png
```

The research runtime already present on the author's machine can be used read-only. Its path is recorded in the delivery report, not hardcoded in the implementation.

## Output contract

- `bem-air-outward.json` and `.msh`: full connected exterior-air boundary, including cone fronts, insert/collector/tube walls, true horn openings, complete rolled horn, exposed individual pods or smooth shared enclosure, rear panels, and explicitly requested vent ducts/inlet sources. There is **no mouth cap** and no diagnostic branch cap.
- `front-boundary.json` and `.msh`: bounded front-air boundary for FEM. Its artificial interface is before the tangent rollover. A coupled exterior model must retain the downstream horn and roll.
- `front-air.msh`: optional tagged tetrahedral front-air mesh. Only written after positive element quality checks.
- `manifest.json`: versioned SI geometry, independent source groups, saved electrical drive, geometric vs physical tube dimensions, geometric volumes, interface conventions and native mesh checks.
- `abec/`: relative-path `project.abec`, Gmsh 2.2 ASCII boundary, solving/observation scripts and independent source mapping. The adapter reverses air-outward winding exactly once to AKABAK's normal-into-air convention.
- `validation.json`: checks completed on this exact output. `INCOMPLETE.txt` means a build did not finish all requested gates; that directory is not a validated bundle.

Physical tags: branch wall 10, horn 11, enclosure exterior 12, rear panels 13; independent cones 101–106; optional vent inlet sources 151–156; diagnostic entry caps 201–206 (removed in complete boundaries); artificial FEM interface 301; closed mid-only HF throat 302; connected FEM volume 401. Coordinate frame is right handed with +Z forward, meters throughout.

The source drives are unit axial-velocity bases, with face-normal projection. Saved1V RMS remains metadata. A voltage-driven prediction must solve the full driver/motor system with self/mutual front loading and the saved individual or shared rear loading. Fixed-velocity radiation curves are not that electrical prediction.

## Supported cases and limits

The connected surface exporter supports **2, 4 and 6 mids**, individually sealed cylindrical pods and smooth shared sealed enclosures, round/slot/teardrop horn entries, fitting offset or annular inserts, and insert-off. Every design must pass fit and native geometry checks. Individual adapters must stay in disjoint driver sectors: cylinder-envelope clearance alone does not establish that their flared walls fit. Overlapping flares fail with a spacing error; the exporter does not silently change the design or union overlapping parts. Non-smooth shared enclosures remain gated.

For a ported design, explicitly enable **Rear-vent velocity bases** (CLI extraction: `--rear-vent-basis`). Round or rectangular openings, physical duct walls and inlet-plane source caps connect to the same exterior air as all front passages. Each inlet is independently tagged and muted in the default ABEC driving table. Its velocity basis can supply radiation/load transfer data for a later coupled model; it is not a solved rear cavity, a tuned port prediction or the saved voltage response. The physical duct length is included exactly once; acoustic end correction is not added to the mesh. See [the formulation](../docs/acoustic-mesh-formulation.md).

HF is rigid-closed for a mid-only study. The individual layout includes the canonical horn shell, front-adapter exteriors and pods; its outer throat is closed at the canonical shell ring. External compression-driver hardware, fasteners and mounting details are not scattering surfaces in this acoustic surrogate. It is not measured hardware or complete manufacturing CAD.

Every branch retains canonical conservative insert facets. Horn triangulation is a constrained meridian/azimuth chart with the actual root polygons cut out, shared node identities and measured chord error. Meshes retain the editor's assumed cone and enclosure geometry; they are not measured hardware or manufacturing CAD.

The exact canonical boundary can be far too large for dense BEM. Inspect the triangle count and memory estimate before loading a proprietary solver. Optional certified simplification preserves physical groups and seams and reports its own geometric tolerance. No solver performance guarantee follows from file compatibility.

Surface gates check closure, connectedness, oriented normals, duplicate faces, positive areas, complete source tags, projected Sd, all nonlocal and adjacent triangle intersections, Gmsh import and mesh statistics. FEM additionally requires positive tetrahedral quality; the optional numerical check tests native boundary coverage, connectivity, residuals, reciprocity and power. A local Robin condition in that smoke check is deliberately an artificial test load. It does not replace coupled exterior radiation.

No proprietary AKABAK import/solve, full-field acoustic convergence, measured response, thermo-viscous insert losses or calibrated HF source is claimed. See `docs/acoustic-mesh-formulation.md` for primary references and formulation.

## Tests and source parity

```sh
node --test tests/*.cjs
python -m unittest discover -s mesh-export -p 'test_*.py'
node mesh-export/embed.cjs
```

The embed step preserves the existing fourteen script positions and the pinned geometry kernel. New source UI/canonical tests exercise the real saved design and changed opening, offset, entry shapes and insert-off. The public regression definitions preserve the saved design hash and explicit patches. Reproduce the native surface matrix and its independent serialized ABEC-mesh audit:

```sh
node mesh-export/regression-suite.cjs work/regression-jobs
python mesh-export/native_regression.py work/regression-jobs --out work/native-regression --workers 2
```

The matrix includes both layouts and all offered counts, offset/insert-off cases, varied front entry sizes, round/rectangular vent ducts, and a 35 → 25 mm density pair. It records actual native process peak memory separately from arithmetic BEM matrix estimates. The 0.2 mm profile setting is a meridian approximation request; the constrained-root chart and angular approximation have separate deviations, not a global 3D error bound. These are geometry/refinement checks, not acoustic convergence.

Use a **new output directory** for each build. Direct diagnostic `--skip-intersections` runs retain `INCOMPLETE.txt`; the packaged runner never bypasses that gate. Individual and vented surfaces are not accepted by the older structured shared-exterior reducer. The experimental hybrid CLI remains explicitly gated to four shared-sealed branches.

## Four-branch hybrid FEM/BEM export

For the historical four-mid shared-sealed research case, a separate native path retains each narrow front chamber in FEM and puts the
complete common horn, roll and enclosure exterior in BEM. It uses all four
actual driver poses. No mirrors or manual source placement are needed.

```sh
python mesh-export/mesh_branches.py work/acoustic-geometry.json \
  --out work/branches --sizes-mm 2,1.4 --copies-all-levels --fixed-cap \
  --solve-frequencies 700
python mesh-export/build_hybrid.py work/solver-bundle/bem-air-outward.json \
  --branches work/branches --size-mm 2 \
  --manifest work/solver-bundle/manifest.json --out work/hybrid
```

`build_hybrid.py` accepts either a full boundary or an exterior-only boundary.
It retains physical groups11,12,13,302, joins the **actual serialized FEM trace**
on201–204, verifies every node and facet against the FEM files, and writes
`exterior-into-air.msh`, four branch meshes and `coupling.json`. All meshes are
Gmsh2.2 ASCII. Branch volume tags are411–414; cone tags101–104; local rigid wall10.

The BEM normal points into acoustic air. Its cap normal equals the outward
branch-FEM normal, so their geometric normal map is+1. Domain-outward fluxes
remain opposite in the transmission equations. This convention is different
from the `bem-air-outward.msh` reference export and is named explicitly.

The fixed-cap option keeps the original nonplanar128-facet aperture support,
with129nodes. On the saved case, changing from the freely refined cap to this
cap at the1.4mm volume target changes the700Hz two-port matrix by0.00172%; the
2→1.4mm volume refinement changes it by0.05736%. These are uniform two-port
sensitivity checks, not distributed interface-mode or fullhorn convergence.
All tetrahedra have positive quality, but low-quality slivers remain near the
fixed cap. The mesh and sensitivity reports state their values.

The hybrid exporter supplies a geometric contract, not an executed BEAT
simulation. Pressure continuity, flux conservation, the fullfront impedance
matrix and independent observation transfers still require a coupled solver.
Then all four motors couple through that front matrix and the **one shared108L
rear compliance**. Saved1V RMS becomes a prediction only after that system is
solved. This task supplies no spatial rear cavity or rear-cone mesh.

For a smaller common exterior, use the structured mesher before the hybrid join:

```sh
python mesh-export/coarse_exterior.py work/solver-bundle/bem-air-outward.json \
  work/acoustic-geometry.json --structured --segments 48 --max-edge-mm 60 \
  --tolerance-mm 0.5 --out work/coarse-exterior
python mesh-export/build_hybrid.py work/coarse-exterior/exterior-open.json \
  --branches work/branches --size-mm 2 \
  --manifest work/solver-bundle/manifest.json --out work/hybrid
```

The compact route retains every canonical root edge exactly and uses structured
bands away from the openings. Its report distinguishes meridian profile chord
error, angular sagitta and sampled three-dimensional deviations. Samples are not
a global Hausdorff bound. Edge length is only an initial wavelength target;
independent refinement of the exterior, FEM volume and interface trace remains
necessary. The diagnostic capped file is for topology checks. The hybrid join
always takes its caps from the actual FEM files.

For a balanced finer comparison, increase the angular count and independently
tighten the meridian approximation and root-band chart spacing:

```sh
python mesh-export/coarse_exterior.py work/solver-bundle/bem-air-outward.json \
  work/acoustic-geometry.json --structured --segments 64 --tolerance-mm 0.25 \
  --max-edge-mm 45 --root-band-mm 45 --out work/coarse-exterior-balanced
python mesh-export/build_hybrid.py work/coarse-exterior-balanced/exterior-open.json \
  --branches work/branches --size-mm 2 \
  --manifest work/solver-bundle/manifest.json --out work/hybrid-balanced
```

On the saved design, these settings produce9,402 exterior triangles and4,955
vertices; including the512 canonical diagnostic cap facets gives9,914 triangles
and4,959 vertices. The maximum edge is44.886mm. Final vertex, edge-midpoint and
centroid distances to canonical wall support sample at most0.6083mm on the horn
and0.5129mm on the enclosure. The0.25mm retained-profile tolerance excludes the
constrained root chart; angular sagitta is0.4216mm. These samples are not a
global geometric bound or an acoustic convergence result. All512 root edges
remain exact; closure, oriented edges, vertex links, exhaustive intersections
and native Gmsh coordinate/tag import pass. The existing48/64-segment pair with
60mm edges remains a separate comparison.

## BEAT coupled-loader format distinction

The distributed BEM and branch FEM files are Gmsh 2.2 ASCII interchange meshes.
Pinned BEAT 0.2.0 uses different file loaders for its coupled path: BEM requires
2.2 ASCII, but `BeatEngineCoupled.load_gmsh41_volume` requires **4.1 ASCII** for
FEM volumes. Convert copies of the FEMs for that adapter, preserve their geometry,
connectivity and physical groups, and rebuild the interface maps from the final
serialized files. Conversion can change node/element numbering and file hashes.
The separate Boundary Lab integration task owns that conversion and verification;
a successful in-memory branch solve does not validate this coupled file loader.
