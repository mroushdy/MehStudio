# Known-build visual comparison - build 619

The reference system now separates three kinds of truth:

1. Published or measured dimensions control numeric presets.
2. Reference photographs and CAD constrain construction traits, mounting,
   chamber shape, tap appearance, and forbidden visual failures.
3. Geometry and fabrication gates decide whether the generated design is
   connected, sealed, non-overlapping, and printable.

## Audit result

| Generated case | Reference family | Result |
| --- | --- | --- |
| Hinson 2 x 10-inch panel | Hinson documented build | Pass |
| JMOD Rev 2.02 2 x 12-inch panel | Official JMOD DIY guide | Pass |
| Four-woofer radial integrated hub | Perpendicular radial references | Pass |
| Four-woofer radial detachable modules | Faceted radial module references | Pass |
| Four-woofer calculated panel manifold | Unity-style panel construction | Pass |

## Defect caught by the visual system

The first clean capture showed external driver pods as white crescents inside
the opaque horn in Full Assembly. The exact printable mesh was valid, but the
review renderer was misleading. Build 619 corrected the renderer: Full
Assembly now shows only the horn, circular HF throat, and literal tap openings.
Ghost, Mount, and Section remain the explicit views for external hardware.

## Review rules

- Fixed cameras are selected by `?capture=1&view=...`.
- Full view must contain no external driver plates, pods, or floating bodies.
- Tap view must show dark circular, oval, or racetrack apertures - never
  colored cutter solids.
- Mount view must show complete driver frames seated against gasketed lands.
- Section view must expose continuous horn-wall-to-front-chamber cavities.
- Every visual pass is backed by assembly-contact and printable-topology gates.

Open `comparison.html` from the local server for the side-by-side visual board.
