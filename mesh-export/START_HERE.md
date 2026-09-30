# Start here: your acoustic export kit

If this folder contains `OPEN_FIRST.html`, open it for the shorter setup guide. The current design and geometry job are already beside the runner; no files need to be moved.

A completed run creates **both** `abec/project.abec` (AKABAK import) and `boundary-lab/project.blab.json` (Boundary Lab). Keep each project beside its meshes and read its README. The kit builds geometry; it does not include either solver or calculate a response. Boundary Lab channels are prescribed unit velocities, including optional vents, not solved driver voltages; use its source request files for independent bases.

This acoustic mesh has real horn-entry openings and connected air boundaries. It is different from the separate **CAD / 3D-printing handoff**, whose uncut horn blank and assembly reference surfaces need cuts, mounting features, joins and fabrication checks in CAD. Neither download is a ready-to-build loudspeaker. Prescribed rear-vent velocity bases do not model resistive shared-chamber slots or establish cardioid behavior.

# Make solver files from your MEH design

The browser downloads a **geometry job**, not a mesh. This runner builds and checks
the mesh on your computer, then writes a project for inspection/import in AKABAK.
It does not run AKABAK, calculate a response, or establish acoustic accuracy.

## First use

1. In MEH Studio, open **Export → ABEC / AKABAK & Boundary Lab meshes**. Choose
   your solver and **Download local kit**. Extract the entire ZIP into a normal
   writable folder, such as Documents. The current design and geometry job are
   already included. Keep its files together.
2. Install [Python 3.12](https://www.python.org/downloads/) and
   [Node.js 22 or newer](https://nodejs.org/). On Windows, enable Python's
   **Add python.exe to PATH** option. Reopen your terminal after installation.
3. Open a terminal in the extracted runner folder. On Windows, right-click the
   folder and choose **Open in Terminal**. On macOS, open Terminal, type `cd `,
   drag the extracted folder into the window, and press Return.

Run setup once (it downloads about 100 MB of dependencies into this runner's own
`.venv` folder; internet access is required):

Windows:
```powershell
py -3.12 run.py --setup
```
macOS/Linux (use `python3.12` if `python3` selects a different version):
```sh
python3 run.py --setup
```

The pinned packages support Python 3.10–3.13 on macOS Intel/Apple Silicon, Windows
x64 and Linux x64. Other platforms may have no Gmsh wheel. Setup leaves system
Python packages unchanged. Node writes the ABEC project; you do not need npm,
Git, an activated environment or a separate Gmsh application install.

## Each export

Put the downloaded `MEH_acoustic_geometry.json` in the runner folder. Run:

Windows:
```powershell
py -3.12 run.py MEH_acoustic_geometry.json
```
macOS/Linux:
```sh
python3 run.py MEH_acoustic_geometry.json
```

A new, dated `MEH_solver_bundle_…` folder appears beside the job. A path with
spaces is fine; enclose it in quotes. To choose the folder name, append
`--out "My solver bundle"`. Existing folders are never overwritten. No internet
is needed after setup. Keep the exact input job; it is copied into the output.

Meshing and exhaustive intersection checks can take several minutes. The terminal
prints a progress reminder every 30 seconds; `build.log` contains native details.
Only a folder containing `EXPORT_COMPLETE.txt` has passed the runner's geometry
and adapter gates. `INCOMPLETE.txt` means the build failed or was interrupted:
do not import its partial files. Read its log and retry with a new output folder.

Open the completed folder's `abec/project.abec` in AKABAK using its ABEC import
workflow. Read `abec/README.txt` and inspect normal directions, source assignments,
units and the observation frame. The runner records **AKABAK import/solve: not
run**. A valid Gmsh file and a generated ABEC script do not verify proprietary
interpretation. The export uses independent fixed-velocity source bases; saved
voltage settings require motor and rear-load coupling before voltage predictions.

## If something fails

- **Wrong JSON:** use **Download geometry job**, not the editor's saved-design file.
- **Python/Node not found:** install the versions above and reopen the terminal.
  `python3 --version` / `py -3.12 --version` and `node --version` show what it finds.
- **Setup failed:** check your connection, Python version and platform, then retry.
  On Debian/Ubuntu, a missing `venv` module needs `python3-venv`; a missing
  `libGLU.so.1` needs `libglu1-mesa`, installed by your system administrator.
- **Runtime failed to load:** run `python3 run.py --check` (Windows: replace
  `python3` with `py -3.12`), then retry setup if instructed.
- **Geometry rejected:** the reason is in `build.log`. Fix the design in the editor
  and download a fresh job. The runner does not replace unsupported enclosures or
  vents with sealed approximations or skip intersection checks.
- **FEM failed:** whole-front tetrahedra are experimental. Leave the browser's FEM
  checkbox off for the surface/ABEC workflow. Failed volume gates withhold bundle
  completion even if some surface files have already been written.
- **Out of memory:** exact insert gaps can produce large meshes. The report gives
  triangle count and the arithmetic size of one dense complex128 matrix, not an
  AKABAK memory requirement. A surface mesh can be impractical for a dense solve.
  The optional `--size-mm 30` changes the global edge request, preserving canonical
  branch facets; it may have little effect on narrow-gap cost. Do not treat coarse
  density or successful import as acoustic convergence. For advanced comparison,
  `--profile-tolerance-mm 0.2` permits up to 0.2 mm meridian-profile coarsening;
  default is the exact retained profile. Canonical branch facets and root seams
  remain fixed. Read achieved geometry errors in the manifest and compare results.

## Existing native environment

Advanced users can skip setup and use an existing Gmsh 4.15.2 / NumPy / SciPy
interpreter: `python3 run.py JOB.json --python /path/to/python --out NEW_FOLDER`.
The runner records actual library versions. Node 22+ must still be on PATH. No
packages are installed unless `--setup` is explicitly used.

The ZIP contains original MEH exporter source, a source-file hash manifest and
instructions. No runtime binaries, credentials or third-party manuals are bundled.
Read the [formulation and limits](https://github.com/mroushdy/MehStudio/blob/main/docs/acoustic-mesh-formulation.md)
for source motion, rear loading and interior/exterior coupling.
Primary package references: [Gmsh 4.15.2](https://pypi.org/project/gmsh/4.15.2/),
[NumPy 2.2.6](https://pypi.org/project/numpy/2.2.6/) and
[SciPy 1.15.3](https://pypi.org/project/scipy/1.15.3/).
