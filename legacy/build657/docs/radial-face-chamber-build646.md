# Build 646 radial cartridge and render-inspection contract

Application build: `646`  
Exact mesh policy: `b646-radial-face-chamber-v1`

## Regression cause

The build-645 radial cartridge preview exposed a real planning defect. A radial
driver was positioned from its centreline and nominal reach, but the complete
circular bearing face was not checked against the curved horn-side
`boundedJoint`. On an oblique flare, the centre can clear while an arc of the
flange is still consumed by the horn intersection. The same omission allowed
the generated front-chamber frustum to lose material where it intersected the
outer horn shell.

The broken C-shaped plates were therefore not a camera-only problem. The
preview made an incomplete physical envelope visible.

## Solver contract

For every radial design, the planner now:

1. derives the physical chamber depth from the requested acoustic volume and
   the solved inner/opening radii;
2. samples the complete chamber-frustum boundary against the exact outer horn
   shell;
3. for detachable cartridges, samples the complete horn-side perimeter of
   every circular bearing face against the same conformal `boundedJoint` used
   by the printable field;
4. grows an automatic adapter reach with a bounded binary search until both
   checks pass, retaining a 1 mm search guard; and
5. publishes dense final clearance and coverage metadata.

The search uses a coarse deterministic probe only as an accelerator. Published
metadata uses the dense probe, and a guarded dense fallback remains fail
closed. A manually selected reach is never silently changed. It remains
authoritative and produces one of these named refusals when incomplete:

- `RADIAL_CARTRIDGE_BEARING_FACE_INCOMPLETE`
- `RADIAL_FRONT_CHAMBER_INCOMPLETE`

The chamber datum is anchored from the driver bearing face, so increasing the
reach does not stretch or inflate the requested acoustic volume.

For canonical R03, automatic planning now reaches 150 mm and reports:

- 100% sampled bearing-face coverage;
- 30.80 mm minimum conformal-joint clearance;
- 100% sampled front-chamber coverage;
- 2.21 mm minimum outer-shell clearance; and
- 512.87 cm³ generated chamber volume for a 512.87 cm³ target.

These are deterministic geometry checks, not acoustic, structural, or physical
prototype validation.

## Inspection views

`VIEW: MOUNT ASSEMBLY — NO DRIVERS` is the complete horn-and-mount witness. It
uses a rear three-quarter camera and retains the solver-owned bearing
lands/modules, joint and driver gaskets, BCD pocket roots, and admitted
cartridge-retention features while creating no LF or compression-driver
bodies.

`INSPECT: MOUNTING PLATES + GASKETS — NO DRIVERS` is the separate face-on,
isolated bearing-plate inspector. The secondary selector can choose any solved
woofer plate or the complete no-driver assembly overview. The focused view
uses the solver-owned bearing plane and shows only the selected interface;
horn, driver bodies, module lofts, loose gaskets, and helper walls are hidden.

The URL-addressable forms are:

```text
?view=nodrv
?view=mount&mountFocus=0
?view=mount&mountFocus=assembly
```

The normal full view no longer displays opaque cutter/helper tubes. Literal
tap apertures remain shader-discarded openings in the horn and cartridge
materials. Tap-depth context is confined to the dedicated inspection modes and
starts behind the acoustic surface.

## Deterministic visual witness

Run:

```bash
cd qa
npm run qa:render-inspection -- --case R03
```

The self-hosted Chromium witness captures the production WebGL canvas at
1600 × 1000 for:

1. the legacy no-driver route as a complete rear mounting assembly;
2. isolated mounting plate 1;
3. the mounting inspector's assembly overview;
4. full assembly; and
5. literal tap openings.

It records solver/build metadata, radial face/chamber coverage, scene-layer
visibility, foreground occupancy, image bounds, and SHA-256 values. Empty,
tiny, cropped, refused, incomplete, or semantically incorrect views fail before
the contact sheet is written. Artifacts are disposable and remain excluded
from the transfer archive.

The final release run passed all five inspection views and all 20 canonical
browser captures. The resource-safe tier passed 93 cases, 1,747 pairwise
combinations, and 2,540 checks with no exceptions, warnings, or errors.

## Exact-production boundary

The build-646 policy change intentionally re-pins the production admission
matrix. Integrated P03 and retained `P03-CARTRIDGE` remain the only admitted
exact fixtures and retain their previously certified topology and STL hashes.
R03 remains held before sampling: its corrected four-part fixed-grid request is
18,116,771 samples, above the 10,000,000 aggregate manufacturing limit. The
radial preview fix is therefore not presented as an R03 production
certificate.

Mechanical validation remains mandatory for printed cartridges, inserts,
fastener preload, gasket compression, layer orientation, fatigue, and the
cantilever load of the selected driver.
