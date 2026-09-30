# Driver mounting parts

Open **Export / CAD / solvers → Driver mounting** to make separate cone-driver
support plates and a compression-driver flange. Select the parts to include,
review their dimensions and preview, then download the mounting ZIP or include
them in the complete CAD handoff. Old designs have no mounting parts selected.

The parts contain actual central cutouts and bolt through-holes. Each driver kind
has a reusable local STL and faceted STEP solid. The manifest gives the required
quantity and each installed position. `installed_mounts.obj` is an assembly
placement reference; it is not a print-bed layout. Import all geometry as mm.

## Dimensions and construction choices

Catalogue mode uses the exact selected driver variant and its sourced cutout,
bolt pattern, orientation and mounting datum. Plate thickness, bolt clearance,
edge margin and gasket land are editable construction choices. Optional bolt-head counterbores have separate diameter and depth controls. They are not
manufacturer strength or tolerance recommendations. An M6 thread identifies a
fastener, not a 6 mm clearance drill or a known thread-engagement depth.

The source outline is retained where supported, with expansion for the selected
land and hole-edge allowances. The preview comes from the same generated
geometry as the exports. Invalid hole placement, intersecting cutouts or
insufficient material prevent export; invalid values are not silently corrected.

Unavailable or conflicting catalogue dimensions require explicit measured
values, a confirmation and a note. Overrides and choices are saved with designs
and named studies. They are bound to the selected driver, so changing drivers
cannot silently carry a measured hole pattern into another model.

The DMA80 drawing and CAD retain their different hole dimensions, and the
installed mounting seat remains unresolved. Its rounded bolt-circle difference
alone is not treated as a separate defect. Enter a verified seat and chosen
mounting dimensions before generating its parts.

## Placement and remaining engineering

Cone-driver plates start at the rear underside of the selected flange and extend
toward the magnet. The compression flange extends toward the horn from the
editor's driver face, which is assumed to be 12 mm behind the throat. These
placements do not add new acoustic lengths or change the existing model.

The generated parts remain separate from the horn, collector and cabinet.
Attachment, sealing, thread engagement, bolt length, hardware/tool access,
complete-assembly interference, strength, materials, print segmentation and
physical fit still require engineering. Optional counterbores are cut into the local +Z face (rear side for mids, horn-facing side for the compression flange). Their diameter and depth must leave valid shoulders and clearances. Threaded inserts are not generated. Gasket land describes radial support; it does not model gasket
compression or automatically choose a gasket material.

The CAD horn blank still lacks entry cuts. Mounting solids do not turn the full
reference assembly into a joined printable speaker, and do not validate its
acoustic performance.

## Verification

Geometry checks cover source eligibility, explicit overrides, hole clearance,
oriented closed surfaces, positive volume and installed transforms. Export
checks exercise the actual ZIP and STL/STEP files. The independent
`tests/verify-mounts-native.py` imports STEP through OpenCascade and checks that
the central opening and every bolt hole are open through the solid. It compares
the independently parsed STL volume and manifold edge topology.

Rendered browser QA remains unavailable under the existing browser restriction.
Source/DOM checks are not represented as rendered browser or physical-fit tests.

Release checks: **262 JavaScript tests passed**. All automatically eligible catalogue parts (6 cone and 12 compression records) pass the mesh geometry checks. Independent OpenCascade import of the 6NDL38 and DCX464 fixture finds one valid solid per local part, checks 10 through openings and 8 counterbores, and agrees with independently parsed STL volume. The final embedded editor exports exactly the same geometry files. See [recorded evidence](mounting-validation.json).
