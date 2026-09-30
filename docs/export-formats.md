# Export formats and scopes

Build 13 brings the categories offered by [Hornstudio](https://github.com/mroushdy/Hornstudio) into the MEH export dialog. These are independent MEH implementations; Hornstudio is a workflow/file-format reference. A shape export is not a solver model.

| Download | Content and scope |
| --- | --- |
| Mounting ZIP | Separate support plates / compression flange with real central openings and bolt through-holes. Local STL and faceted STEP solids, installed OBJ, dimensions, quantities, source evidence, measured overrides and saved study. Not a joined cabinet/horn. |
| Design JSON | Applied design, goals, variants and acoustic settings; reloadable in MEH Studio. |
| CAD handoff ZIP | Uncut closed horn STL, named OBJ reference parts, sampled entry/profile CSV, applied design, source/status manifest and a CAD preparation guide. Units, exact driver variants, source URLs, dimensions, unresolved evidence and displayed mounting transforms travel together. Selected mounting solids are included separately; no fused printable assembly. |
| Profile / entry CSV | Current profile or every positioned entry outline, millimetres. Dot/comma decimal formats use comma/semicolon separators respectively. |
| Section PNG | Current section image. |
| STL | Binary triangles, mm. Uncut horn blank is a closed shell with thickness and roll; assembly reference is separate surfaces, not a Boolean union. |
| OBJ | Named assembly parts or the uncut horn blank, mm. |
| Faceted STEP | AP214. Closed uncut horn blank uses FACETED_BREP; reference parts use open surface models rather than falsely declaring solids. |
| NURBS STEP | Two uncut inner/outer horn surfaces. Exact rational circular sections, degree-one meridian reproducing the sampled profile, including the roll. No spline overshoot, entry trimming, end closures, drivers or enclosures; finish in CAD. |
| XYZ / quarter XYZ | Unique sampled coordinates, mm. Quarter is the uncut horn in X ≥ 0, Y ≥ 0 only; no assumption of symmetry for the complete MEH assembly, and no BEM boundary conditions. |
| AKABAK 1D script | Preliminary sealed-mid network, actual catalogue motors and front/rear volumes, common axial entry station, constant-area entry waveguides, segmented axial horn, closed HF throat and mouth radiator. Open collectors only. Native parsing/solve and matching to the editor are unverified. |
| AKABAK / Boundary Lab kit ZIP | Current canonical geometry job, saved design, embedded native builder, setup guide and OPEN_FIRST.html in one folder. Run the builder locally to obtain checked meshes and solver project files. Not a prebuilt mesh or solver application. |

CAD reference assembly exports preserve separate renderer surfaces and driver provenance names. Each OBJ part has a unique ID, including repeated terminal parts; the decorative original-profile comparison overlay is excluded. The viewer's shader-only horn opening cuts are not baked into these surfaces. The horn blank explicitly omits entry cuts. Do not substitute these files for the native acoustic export, which cuts real openings and joins the air boundaries. The physical assembly still needs manufacturing engineering.

Horn blank triangulation reduces the sampled inner/outer meridian jointly with a maximum 0.05 mm four-coordinate polyline deviation and uses 96 angular divisions. Angular chord sag is separate: r × (1 − cos(π/96)); at 350 mm radius it is about 0.187 mm. NURBS retains all original meridian samples and exact circular cross sections. Neither constitutes a manufacturing tolerance specification.

The new starter uses 35 mm driver stand-off to avoid the adapter-shell sector overlap caught by the native exporter. Saved designs are unchanged; unsupported geometries retain explicit errors instead of being modified during export.

## Solver setup

1. Open **Export / CAD / solvers → ABEC / AKABAK / Boundary Lab**, choose a solver and download the local kit ZIP.
2. Extract it and open `MEH-local-runner/OPEN_FIRST.html`.
3. Install Python 3.12 and Node.js 22+, then run `python3 run.py --setup` once inside that folder.
4. Run `python3 run.py MEH_acoustic_geometry.json`.
5. Keep the completed output folder together and open `abec/project.abec` or `boundary-lab/project.blab.json` in the selected solver.

On Windows use `py -3.12` in place of `python3`. Solvers are installed/licensed separately. Dense BEM memory can be much larger than meshing memory; inspect the emitted resource estimate before solving. Proprietary AKABAK import/solve remains unverified. Boundary Lab project loading is distinct from acoustic energy qualification, and the failed experimental full-horn operators are not included.

The 1D script uses the selected motor's Mms-based compliance and loss, with explicit comments about air-mass convention review. Set the saved per-mid drive and medium manually in AKABAK. It is not a promised calibrated match to Hornresp or the browser solver. Ported/insert designs are rejected by that script exporter and can use the separate geometry-based kit within its stated support.

Prescribed rear-vent velocity bases do not model resistive shared-chamber slots or prove cardioid behavior. The required future acoustic and export contract is described in [Passive cardioid capability gap](passive-cardioid-contract.md).

## CAD and 3D-printing preparation

Open **Export / CAD / solvers → CAD & 3D printing → Download CAD handoff**. Extract the ZIP and read `MEH-CAD-handoff/START_HERE.md`. Import `horn_blank_uncut.stl` or `assembly_reference.obj` as millimetres. For editable uncut inner/outer horn surfaces, use **Individual CAD files → STEP · NURBS horn surfaces**.

`CAD_handoff.json` indexes the separate OBJ objects and retains driver dimensions with their original status, source links and exact impedance variant. Each mid has its editor front-rim position and local axes. A matching displayed catalogue model also includes its datum transform and offset status. These transforms reproduce the reference model's placement: they do not turn an assumed datum or conflicting manufacturer drawings into verified mounting geometry. Null catalogue transforms mean custom/edited geometry could not be matched. The local basis may have determinant −1; the manifest states the transform explicitly. Source documents/CAD are linked, not redistributed in the ZIP.

Entry CSV loops follow the sampled inner horn surface and repeat their first point to close each loop. They are positional references, not through-wall cutter solids. Add actual entry cuts, mounting holes, joins, seals, fastener engagement and segmentation in CAD. Verify dimensions, interference, moving clearances, tolerances and materials before manufacturing. The download keeps the original applied design so it can be reloaded to reproduce the reference geometry.

## Verification

JavaScript tests cover STL binary parsing and units, opposite edge pairs/positive volume, unique OBJ parts and indices, exclusion of the decorative profile overlay, STEP references and solid/surface distinction, decimal-comma CSV, quarter-cloud scope, ZIP CRC/extraction with original compressed files, handoff source/datum preservation and entry-loop reconstruction, 1D node/source structure, applied-design downloads and the actual startup geometry job. Generate the actual handoff for independent checks with `node scripts/export-cad-review.cjs DIRECTORY [DESIGN_JSON]`. The optional `python3 tests/verify-step-native.py DIRECTORY` check uses a separately installed OpenCascade OCP package. Native OpenCascade STEP import verifies valid faceted horn solid, the same horn as open reference surfaces, and two rational NURBS faces with preserved mm bounds; it does not assert a valid assembly solid. These checks do not establish acoustic performance or production CAD readiness.


## Driver mounting solids

See [Driver mounting parts](driver-mounting.md) for source eligibility, editable construction choices, measured overrides, plate placement and fabrication limits. With mounting enabled, the CAD ZIP adds a `mounting/` folder. The horn blank and `assembly_reference.obj` retain their original reference scope; real mounting cutouts and through-holes are in the separate mounting solids.
