# Acoustic exporter validation — 2026-09-29

Implementation source: `3166fe1fea9bee13cca2a5058d55d5f6b7666522`, based on public main `84f63ac`. **All 12 native runs passed** (11 configuration cases plus one finer density comparison), along with 195 JavaScript tests and 48 Python tests. Native Gmsh import is not proprietary AKABAK import or solving; no AKABAK executable was available.

## What works

- Individually sealed pods and smooth shared sealed enclosures, with 2, 4 or 6 independently tagged mids.
- Exact canonical inner passages, outer-horn cuts, exposed adapter joins, pod sidewalls and rear panels. Display-buried roots are corrected to the canonical outer horn and the change is recorded.
- Opt-in reflex radiation bases with real round/rectangular rear openings and physical ducts. Their independently tagged inlet velocity sources share the exterior-connected air with the horn and front cones. Rear cavity pressure and motor/voltage coupling remain unsolved.
- A self-contained offline editor with separate geometry-job and runner downloads. The packaged runner installs pinned libraries locally, preserves inputs, logs progress and leaves incomplete exports clearly marked. It never bypasses the intersection gate or overwrites an output folder.
- Corrected source completeness and observation-origin consistency across the single and coupled ABEC adapters. Medium values are explicit manual AKABAK settings; no undocumented script syntax is invented.

## Native evidence

Each run checks closure, one connected boundary, consistent outward-air normals, vertex links (ABEC adapter), positive areas, duplicate faces, every independent source and projected area, exhaustive nonlocal/adjacent intersections, and actual Gmsh reimport of SI coordinates, connectivity, winding and physical tags. The independent audit reconstructs emitted ABEC elementary selections and checks sources, pair observations, observer placement and manual medium instructions.

The default matrix uses a 35 mm edge request and 0.2 mm retained-meridian tolerance. The tolerance is not a global 3D error bound; roots remain exact and chart/angular deviations are separate. Source voltages and rear volumes remain metadata. No acoustic field, power, passivity or port-sizing qualification is inferred.

| Case | Mids + vents | Triangles | Max edge mm | Native peak MiB | One dense matrix GiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| individual-sealed-2 | 2 + 0 | 62,044 | 34.938 | 383 | 57.4 |
| individual-sealed-4-offset8-entry32 | 4 + 0 | 158,580 | 34.979 | 578 | 374.7 |
| individual-sealed-4-offset8-entry32-25mm | 4 + 0 | 182,204 | 24.991 | 922 | 494.7 |
| individual-sealed-6-open-entry55 | 6 + 0 | 98,588 | 34.914 | 479 | 144.8 |
| individual-vented-4-rectangle45x15-open-entry32 | 4 + 4 | 70,124 | 34.960 | 406 | 73.3 |
| individual-vented-4-round20 | 4 + 4 | 149,602 | 34.938 | 626 | 333.5 |
| individual-vented-4-round40-offset8-entry55 | 4 + 4 | 247,346 | 34.938 | 929 | 911.7 |
| shared-sealed-2-offset8-entry55 | 2 + 0 | 57,510 | 34.993 | 498 | 49.3 |
| shared-sealed-4-saved-parity | 4 + 0 | 73,224 | 34.999 | 567 | 79.9 |
| shared-sealed-6-entry32 | 6 + 0 | 102,186 | 34.914 | 624 | 155.6 |
| shared-vented-4-rectangle80x40 | 4 + 1 | 73,472 | 34.888 | 552 | 80.4 |
| shared-vented-4-round80 | 4 + 1 | 76,280 | 34.888 | 558 | 86.7 |

Native peak memory covers Python/Gmsh only, excluding the Node adapter and any acoustic solver. The dense-column estimate is `16 × triangles²` bytes for one complex128 face matrix; factorization, solver refinement and other workspaces are excluded. These meshes can still be impractical for dense BEM. No measured AKABAK allocation or performance promise is made.

For the same offset-insert four-pod job, refining 35 → 25 mm gives 158,580 → 182,204 triangles. All source areas/tags and topology gates survive. A false intersection on a rotated planar rear cap was traced to an ill-conditioned floating-point division. Exact rational confirmation of uncertain provisional hits resolves it with the original geometric tolerances unchanged. Regression mutations still reject true near-parallel crossings and coplanar overlaps. This is numerical geometry refinement, not acoustic convergence.

The current single/coupled-domain audit also covers six sealed mids and actual individual round/rectangular and shared rectangular vent layouts. The detailed primary-document audit is [here](abec-export-audit.md).

## Reproduce

```sh
node mesh-export/regression-suite.cjs work/regression-jobs
python mesh-export/native_regression.py work/regression-jobs --out work/native-regression --workers 2
npm ci --ignore-scripts
npm test
python -m unittest discover -s mesh-export -p 'test_*.py'
```

Use a Gmsh 4.15.2 environment. The measured matrix used Python 3.12.13 / NumPy 2.5.3 / SciPy 1.18.1. The portable setup was separately installed and tested with its pinned NumPy 2.2.6 / SciPy 1.15.3; its final rectangular four-vent job completed with eight sources and no runtime warnings. Platform/library triangulation details can change counts; the geometry and validation contracts remain required.

## Remaining limits

Proprietary AKABAK/ABEC parsing, import and solve are **not run**. Full-system acoustic energy/passivity qualification, losses, measured driver geometry, HF radiation and validated tuning are not provided. The separate Boundary Lab operators are not used as qualified data. Whole-front FEM remains experimental and failed volumes remain withheld.

Non-smooth shared shells and overlapping individual adapter flares are rejected. Compression-driver hardware, small collars and fasteners are omitted from individual-layout scattering. The historical hybrid/structured reducer paths retain their explicit narrower gates. A rendered browser preview was blocked by browser URL policy; no workaround was attempted. Offline DOM interactions, download controls, package parity and the unchanged geometry kernel passed automated checks.

No main merge, Site deployment, manufacturer reference archive or local credential is part of this change.
