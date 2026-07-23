# MEH STUDIO — STANDING QUEUE (versioned; update on every landed item)
Last updated: 2026-07-23 (M2+gate landed). v4 frozen at build 83. All work is v5.

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
10. PIN #9: facet-aware ANGULAR placement - facetsAt/facetN panel model; ring
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
M3. PATH-LENGTH BALANCE (Heinz US5526456, the founding canon): per-driver path to
    throat, section phase alignment at XO, common acoustic center check.
M4. COVERAGE TRUTH: Keele mouth law per plane, pattern-loss frequency, waistbanding
    warnings; coverage currently only sets wall angle.
M5. THROAT SIDE: CD throat adapter Vtc/Atc, exit-angle match, coax entrance geometry.
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
M8. PROVEN-BUILD PRESETS: SH50-class, SH96-class, arda-class, JMOD-class one-click
    bundles with driver sets.
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
