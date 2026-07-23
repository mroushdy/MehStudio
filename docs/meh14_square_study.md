# MEH STUDIO v1.4 SQUARE-FAMILY STUDY (2026-07-23)

Marwan dropped `meh_studio_14.html` (a view-source dump of the v1.4-era app)
saying "the design of the square families here is much better." The file is
not runnable, but the code reads. What v1.4 has that v5 does not:

1. **Independent mouth WIDTH × HEIGHT** for rect/superellipse families
   (`mouthW × mouthH` explicit; v5 derives height from the coverage aspect).
2. **Woofer PORT placement dialects** (per-port, not per-driver):
   `corner` ("Corner / quadrant square", cross), `diagonal` ("On the diagonal
   seam — radial slit"), `straddle` (center-straddling pair, the v5 default
   since build 502), `center`, `edge` ("hug the throat"), and `remote`
   (bandpass injection, SAWMOD/Solana — still open as M7's remote item).
3. **Quadrant-square canon note** (line ~985): "the classic quadrant-square
   photo is 2 woofers × 2 ports, not 4×1" — v5's Danley-line + X-pair agrees.
4. **Wall-projected placement walk**: "walk inward until every frame stays on
   its panel; on the superellipse pull the pair toward the flatter centerline
   first (SAWMOD practice) so the walk doesn't trade a wall fail for a CD
   collision." v5's measured-clearance walk covers part of this; the
   pull-toward-centerline preference is not implemented.
5. **Fixed n=3 superellipse** ("molded/print") with an exact area factor
   (SUP_AREA=0.8828) — v5 sweeps n=2..12 instead.
6. Driver preset schema carries frame shape/bolt data (`fshape:'square'`,
   bolt circle, p3 profile polylines) — richer than v5's silhouettes.

## RESOLVED (Marwan: "The look") — LANDED build 512
The 14 square-family LOOK ported to v5 angular: paper-white palette
(0xE7E7E3/0xF5F5F2), crease lines 0xC9C9C6, the 100 mm MOUTH BAFFLE plate,
throat-end closure, the ghosted CABINET box + edges, CD snout taper.
Items (1),(2),(4) from the list below stay queued as functional ports.

## the original question
"Much better" needs one specific: is it (1) the independent W×H mouths,
(2) the port-placement dialect list, (4) the centerline-first walk, or the
overall drawn look? Pin it in the app or reply, and that lands next.
