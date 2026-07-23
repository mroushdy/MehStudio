# MEH STUDIO — STANDING QUEUE (versioned; update on every landed item)
Last updated: 2026-07-23 (build 505: M3 path-length balance LANDED + true-CAD
coax silhouette (contiguous basket/motor/horn-tube/tweeter stack per the 6FHX51
measurements - his "still does not look right" fix) + M4 informational row.
Build 504: coax CAD study, driver-derived dish. Build 503: Reference D 1-way;
2-WAY COAX rename. See printed_mounts_spec.md). v4 frozen at build 83.

## BUILD 502 PIN SWEEP (all 7 open pins resolved; sourced from diyaudio 339799
## + Synergy Calc V5 + Danley canon)
- TAP CANON REWRITE (pins 1/23/25): straddling pairs ride the CROSS direction at
  ONE station (taps live on the disc orthogonal to the axis - equal throat
  paths; nc535/bwaslo), drawn as the X toward the wall intersections (corner
  venting: least HF interference - mark100/GM/Danley). Slots rotate ±45°,
  pair offset 0.24·od (slot.offm). TAPS PER WOOFER / TAPS PER MID now separate.
  Spacing law reads TRUE port positions. Gate lattice sweeps np=2 (360 states).
- SOLVER HONESTY (pins 24/27): solve() grows ONLY on growth-fixable fails
  (law rows carry .grow: fit, seat clearance, taps-vs-area, entry size, coax-vs-
  body); driver-ceiling fails refuse AT the user's size (mouth slider no longer
  masked by balloon-to-cap). atCap flag distinguishes the two refusals in the HUD.
- AXIAL LAND LAW (pin 24): wedge height = seatR·tan(tilt) stated per section;
  warn >30°, fail >45° ("use FLUSH on steep walls - Danley lands live on
  near-axial walls").
- 1-WAY = COAX (pin 22): plain CDs disabled on 1way (no cone, no taps); new COAX
  rows: tap ring must sit OVER the cone; coax unit vs horn body (grow-fixable).
- TRUE PLATES (pin 26): classic angular renders as exact facet-vertex quad strips
  (no 64-pt resampling through creases): knife-straight seams drawn as
  construction edges, flat printed mouth face, polygonal apex plate;
  engine exports offsetVerts.

## DONE (v5 core, ~one day old)
1. Form engine: ONE superellipse family, ATH profile, mouth roll-back
2. Geometry-first XO (rings placed where they fit; crossover derived)
3. Topology front door (1way/2way/3way) + live law rows + native bug pins + X-ray
4. Canonical matrix 8/8 clean (incl. v4-impossible square 2way; SH96 4x15+6mid)
5. Seats clamped off the mouth roll
6. Sourced acoustic layer: velocity-derived CR (band low edge), chamber LP,
   CD-reach floors, area-true slots
7. Driver preset library (datasheet dims incl. Sd/Vtc/xm) + custom sliders
8. Parametric driver silhouettes (his call; CAD retired, -850KB)
9. CLASSIC ANGULAR = true flat panels (rect + 45deg chamfers, straight cone)
10. PIN #5: AXIAL SPOT-FACE LANDS (JW print canon) - DRIVER MOUNT select:
    flush (tilts with the wall, Danley) vs axial (printed wedge land keeps
    every body parallel to the horn axis). The land is SOLID: the tap port
    runs through it, so the Helmholtz law lengthens Lpt by ~0.7*seatR*tan(tilt)
    (stated in the row). Gate lattice exercises axial states.
10b. PIN #9: facet-aware ANGULAR placement - facetsAt/facetN panel model; ring
    seats distributed arc-uniformly over the BIG-panel perimeter (chamfers
    excluded, order-preserving); pairs rows filtered to their OWN walls by
    facet normal; slots lie flat on panels. Node-angular blind spot fixed
    (style rides on stations; seRing global-S sniff retired).
11. PINS #12+#13: CLASSIC ANGULAR is now the TRUE Waslo dual expansion -
    flare 1 AT the coverage angle, flare 2 = 90+Theta/2 PER PLANE (mouth
    height derives from the V slopes, D34 relations), FLAT front (no roll;
    the printed lip closes as the classic baffle face). The break converges
    onto the landed woofer station (Waslo S3->S4) via a deterministic
    fixed point inside evaluate. Rect walls place by SYMMETRIC PARTITION
    (n = 4*base + rem; rem -> top+bottom when wide, sides when tall, odd
    seat bottom-center; rows centered per wall); seats excluded from the
    flare-break crease zone.


## MEH COMPLETENESS (his correction 2026-07-23: "a lot missing from making this MEH")
This list OUTRANKS A-I. The physics and layouts that make it a MEH:
M1. [DONE] RESPONSE PREVIEW: ported v4's transmission-line network (horn = two-port ladder,
    taps = Norton sources through chamber compliance + port mass). The flagship gap.
M2. [DONE] FULL TAP LAW (docs/tap_laws.md): lambda/4 null margin BUILT INTO the
    derived XO (1.2x, v4 law - was previously derived ON the null); entry
    circumference <= 1 lambda (US 8,284,976); taps-vs-station-area % (mids 20 /
    woofs 50, CoSyne 43 clean); any-pair spacing lambda/4 strict for MIDS,
    ~1.5x tolerated for woofer sections (SH96 canon); cone dia vs lambda/2;
    Helmholtz with REAL Lpt (print wall + 0.85r end correction) in the law rows
    AND the response network; same laws applied to the 1way coax tap ring.
    Solver loop-bound off-by-one fixed (cap-growth now returns its clean state).
    Default state = verified-clean canon (2way 4x6.5 on the DCX coax).
M3. [DONE build 505] PATH-LENGTH BALANCE (Heinz US5526456, the founding canon):
    PATH law rows - (a) equal section paths: every driver of a section rides ONE
    station (structural since the build-502 tap rework; asserted ≤λ/20 spread);
    (b) common acoustic center vs the section above, read as PHASE at that
    crossover (ok ≤76° - the LR4-corner bound the null margin implies; warn
    ≤105°); covers CD-vs-woofs (2way), CD-vs-mids + mids-vs-woofs (3way - the
    woof-vs-mid spacing had NO other guard), and the 1way cone-vs-CD slant.
M4. COVERAGE TRUTH [PARTIAL build 505: 'Pattern floor vs the low crossover' row
    states where directivity walks toward omni relative to the horn's low XO -
    INFORMATIONAL only (no grade) until thresholds have canon; Keele floors per
    plane were pin #16]. Still open: waistbanding warnings, graded tiers.
M5. THROAT SIDE [1WAY ADAPTER LANDED - pin #21: the horn starts AT the CD exit,
    38-deg snout to the coax cone's tap ring (slots ON the adapter wall, XO from
    the worst tap's SLANT path), coax unit drawn at the chosen woofer's size.
    Pin #18 landed the true panel-offset outer shell; pin #19 the taps-per-driver
    option (straddling pair halves the cone path, v4 law). Still open: CD Vtc/Atc,
    exit-angle match, 2way/3way round-throat -> shape morph (pin #20 - smooth
    should blend n=2 at the throat into the chosen shape; angular keeps the
    Waslo square throat with the round bore in the plate)].
M6. BAND ARCHITECTURE: real sub-XO choice with displacement math (80 Hz is an
    assumption today); 4-way question parked explicitly.
M7. LAYOUT DIALECTS [PLACEMENT MATRIX LANDED - docs/placement_matrix.md is
    LAW, gate-asserted: 2 woofers -> the long-axis Danley line (pin #14); mids
    perpendicular (2) / square DIAG diamond (4; chamfer boards on angular =
    SH50+v4 canon) / coverage rows (pin #9 era); measured 3D obstacle
    clearance replaced the radii-sum heuristic (2x12in states: 65in-cap ->
    42in clean); crease exclusion by true axial footprint; velocity-first CR
    grading]. Still open: SH96 corner boards as a WOOFER dialect, knuckle
    passages, remote bandpass (Solana).
M8. PROVEN-BUILD PRESETS [LANDED build 501 - his call: "default settings drop
    downs that match popular MEH styles so users that are not advanced can land
    at well known MEH horns". KNOWN BUILD dropdown under TOPOLOGY, repopulates
    per 1way/2way/3way. Bundles are ENGINE CANON (MEH2.BUILDS): 10 complete
    states, each gate-asserted EXEMPLARY (0 fails, 0 warns, 0 mouth growth at
    its baked size); gate also cross-checks bundle driver/CD numerics against
    the shell's WPRE/MPRE/CDP tables (drift = gate fail). The dropdown is
    TRUTHFUL: selection re-derived from state on every change - touch any
    slider -> "custom"; hand-build a canon -> its name lights up. Fresh default
    state now IS the 2way house canon (odM 10.3/6.5 fix). w5 (5.25") added to
    shell WPRE. v5/assemble.js added (shell+engine -> meh5.html, ran before
    gate). Still open: JMOD-class bundle; SH96-class 4x15+6mid still refuses
    honestly at cap (needs M7 corner-board woofer dialect first).]
M9. ENCLOSURE REALITY: rear chamber volumes, magnet clearance at angle, the box.
M10. FULL T/S per preset (Fs Qts Re Le...) + Hornresp ME2 export.

## REMAINING TOOLING (A-I, under the M-list)
A. EXPORTS (port Horn Studio's proven writers): STL solid with wall thickness;
   watertight NURBS STEP; panel-layout export for ANGULAR (flat parts + angles);
   AKABAK BEM mesh bridge. Export gate = artifact_test pattern (real buttons,
   real blobs, real files).
B. TRUE PRINTED-PART GEOMETRY [shell wall DONE - real thickness, outer-face mounts, Lpt geometry-true in the Helmholtz law; ONE proven normal path via carried surface params]: seat+slot as one
   solid insert; CD apex insert (Reference B/C: bore + tap ring + bolt circle);
   bandpass chamber housings; 1way coax full part.
C. MAX SPL TILE (Thuras/Makarski from Horn Studio): the geometry's distortion
   ceiling, computed from v5's area law. Plus cutoff/loading estimate tiles.
D. REPORTS PANEL: path-length table, Vtc totals, Hornresp ME2 export text,
   panel cut list (angular), print bed split hints (smooth).
E. V5 ORACLE BATTERY [GATE LANDED - v5/gate.js: 14,415 checks over a 216-state
   lattice (topology x form x style x coverage x placement x wall x drivers):
   station/area/ring/layout/normal/tap invariants, XO sanity + null margin,
   law-row wellformedness, response finiteness, solve determinism, canonical
   matrix expectations (v5/test_matrix.js), assembly + branding + monochrome
   checks. Horn Studio's every-push ritual now applies: NO push without
   `node gate.js` ALL PASS. Still to add: INSPECT-on-scene (3D mesh census via
   look5.js), goldens, provenance census]. look5.js = the v5 coding eyes.
F. DEPLOY RITUAL v5: gates + goldens + ok-count reconciliation (Horn Studio
   resume rule) + auto-reload his tab on every push.
G. SUPERFORMULA unique mouths (shape slider extension past square).
H. POLISH: coax 1way tap ring visuals; driver cone/dustcap detail pass;
   angular panel seams drawn as edges; mobile-width layout.
I. PARITY AUDIT vs v4: walk v4's islands, confirm each canonical build is
   expressible and solves in v5; then v4 becomes reference-only.
