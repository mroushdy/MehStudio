# PORT TRUTH AUDIT — b532 (his ask: "the real cutout, not the illusion")

Method: 5 probe batteries (measured against the engine: 216 cutter prisms /
54 states; 60 dish states; 14 presets family-match; ~480 settings states;
viewer-vs-layout-vs-export triple compare). Verification: the subagent fleet
died on account credits mid-run — every landed fix below was RE-VERIFIED
INLINE this session with direct engine probes before editing; claims not
re-verified stayed out of the code and sit in DEFERRED with their probe
numbers. Raw probe outputs: session scratchpad ports/ + the workflow journal.

## FIXED IN b532 (each re-measured before and after)

1. BROKEN — corner-board cutters could never pierce their own duct: z-span
   was hard-coded wallT+12mm while the real stack = wall + 18mm board +
   recess (measured shortfall 6.0mm on sh96; the acoustics lengthened the
   port through a duct no export cut). NOW: the prism reaches
   wall + duct/landH + 12mm; the battery (inspect 4.5) re-measures every
   cutter against its stack forever.
2. BROKEN — board cutter axis was rotated 90° from the law, the viewer, and
   the record (b529 onCh swap; long axis rode crossV, pair offsets sat
   "behind each other" along flow — half of each pair cut air). NOW: long
   axis rides flowU for every driver; law/viewer/cutter agree.
3. BROKEN — round cutters were non-manifold (duplicate-vertex seam, 6 bad +
   4 degenerate edges per prism). NOW: deduped outlines; battery asserts
   manifold on the whole cutters mesh.
4. WRONG — np2 X-slots on curved walls left ≥20mm uncut membranes (9/26
   outline rays still inside wall at z0=-12mm). NOW: inner reach is MEASURED
   (outline marched into the channel, up to 76mm).
5. WRONG — the "45° frustum" was a 9.5–12.8° full-length taper and the lawed
   area existed only 12mm OUTSIDE the print. NOW: true 45° flare across the
   inner half-wall; NOMINAL area from mid-wall through the whole stack.
6. WRONG — every slot was SIZED on a rect 4·sa·sb model but CUT as a stadium:
   −7.15% area on every 3:1 slot, systematically. NOW: exact stadium sizing
   ((8+π)·sb²=A) and exact inversion on clamps.
7. BROKEN — the 1way dish cut real holes 25–52% under the lawed area with
   every row green: (a) the ray-through-center hole mapping bunched vertices
   mid-slot and cut the caps into a pinched kite; (b) two clamps (patch
   0.75·πrP/N, radial 0.75·halfBand) bit silently inside dishMesh AFTER the
   laws read the un-clamped demand. NOW: uniform-perimeter stadium polygon
   with discrete-area correction; the clamps live in layout(); sa/sb arrive
   FINAL; slot.apEm (the EMITTED area) is what every physical row and the
   response network ride. Battery 4.6 asserts dish watertightness + apEm
   consistency.
8. WRONG — two port-length laws disagreed by 17mm on the same axial port
   (acoustics 0.7·seatR·tan heuristic vs response wallT+landH). NOW: the
   MEASURED landH supersedes the heuristic in both when present.
9. BROKEN — the smooth-family viewer drew every off-axis tap 33–88mm from
   the real cut (atan2 POLAR angle fed into sePoint's superellipse
   PARAMETER). NOW: paramFor solves the true parameter (exported from the
   engine).
10. BROKEN — board ports were drawn on the recessed BOARD face, 28.5mm off
   the actual wall cut. NOW: drawn at the tap (the seam).
11. BROKEN — the export shipped refused states (driver-less, port-less horns
   from infeasible states, no gate) and the hole-less-shell note was one
   quiet line AFTER download. NOW: export REFUSES failed states loudly; the
   uncut-shell warning is explicit (⚠ MUST boolean-subtract the cutters).
12. COSMETIC — the Danley-dialect row said "round tap" while shipping a
   stadium. NOW: the row states the area-matched stand-in shape.
13. jmod preset name now declares its port scheme is v5's wall slots, not
   the JMOD's seam teardrops (family-match honesty).

## POSTURE RECORDS (measured, stated, not "fixed" — they are design deltas)

- sh50 stations vs the van Ommen record: derived woofer tap at 14.42in
  (record 10.5), mid at 5.86in (record 3.5); areas 3.41× the record per
  woofer (velocity-derived vs Danley record — the b530 dialect applies only
  to corner-board states). Queued: tap-station goldens + a Danley-record
  station option for the sh50 preset.
- fhx6 ring edge grazes the √(Sd/π) circle by −0.2mm (physically 2.2mm
  inside the true cone; the annulus law is the binding truth).

## DEFERRED (probe numbers on file; not yet landed)

- TRUE PRE-CUT SHELL: the shell STL still has zero openings (2 wall
  crossings at all 40 ports / 7 presets measured); the dish's no-CSG patch
  technique is the prior art. THE top queued exporter slice.
- Boss/wedge/board solids in export: landH bosses & axial wedges exist in
  law+viewer only (B5-5: 148mm wedge in viewer, absent from STL); ports now
  CUT through the stack but the stack itself isn't shipped.
- Wall barrel vs wallT (B5-9): true barrel along tilted normals measured
  7.9–10.9mm vs wallT 12 — every port-length law overstates by 1.1–4.1mm;
  needs a measured-barrel lpt (re-bakes many rows — own build).
- JMOD seam-teardrop port dialect (the real JMOD scheme).
- B5-10/11 cosmetics: apex-plate decal geometry; residual drawn-axis
  distortion ≤14.6° on smooth (outline bending through conform).
- Axial wedge cutter dogleg (port crosses wall along n, wedge along mountN —
  single prism cannot represent both; wall leg cuts today).
