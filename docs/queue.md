# MEH STUDIO — STANDING QUEUE (versioned; update on every landed item)
## BUILD 530 (2026-07-24): PIN #23 CLOSED + THE VENT FORK RESOLVED (sourced) + SH96 UNPARKED AT 58
HIS ASK ("research everything you can find about MEH and just fix the tool",
finished-horn STLs attached): an 11-agent research pass over every attached
reference + the three studies + web/patents -> docs/REFERENCE_LIBRARY_STUDY_4.md
+ docs/FIX_LIST_STUDY_4.md (ranked, cited). LANDED THIS BUILD:
- PIN #23 CLOSED (the b529 fails): every flush/axial wall seat now carries a
  MEASURED LAND (rim-march of the frame out of the wall solid, 24 azimuths;
  landH on the driver record). Battery re-verifies the land top with its own
  membership code; viewer draws the boss; Helmholtz law AND response network
  lengthen the port through it. The 6 pin-#23-class lattice fails are gone.
- THE VENT FORK -> RULING (a), SOURCED (study _4 verdict): 17 m/s is NOT
  Danley and NOT a law in its own source (nc535 worst-case heuristic; Hinson
  p.19 chuffing-onset for HIS reflex ports, shipped past it; Waslo Calc has
  zero "velocity" occurrences). Measured record: SH-50 tape measure (van
  Ommen, diyaudio 292379 #4957246) = 2.5in woofer taps @10.5in, 3/4in mid
  taps @3.5in, reflex 2.5in @14.5in; chrisbln thing:6886663 ships the same.
  DANLEY DIALECT (corner-board states): woofer taps 31.67 cm2, mid taps
  2.85 cm2, velocity/CR rows stated-not-graded with the record cited.
- CORNER BOARDS v3.1: the opening cuts THROUGH the walls AT THE SEAM (HIS
  SH-96 interior shot = round side-wall openings; JMOD teardrops along the
  diagonal seams) - the chamfer-chord bound was fiction. Adjacency = exact
  2D rect cut (capsule model over-fattened flat frames by (2-sqrt2)r).
  Wall-cutout law: mid seats vs corner openings, measured. Mid ring rotates
  to the measured argmax off the diagonals (his photo: mids BETWEEN chambers).
- SH96-CLASS UNPARKED at mouth 58 (his tab state LANDS: 0 fails, 1 declared
  warn, XO 359/276). Matrix case green again. Gate + battery ALL PASS.
OPEN ASKS FOR HIM (new, from study _4): (1) SH-96 vent TAPE MEASURE (dia +
count; his interior shot reads ~half the 12in-frame dia - bigger than SH-50
scale; the dialect rides SH-50 numbers till then); (2) reflex-vents-into-horn
(SH-50 @14.5in, JMOD Fb 70 Hz seam teardrops, SB-Horn Fb 34.65 Hz) is a
MISSING ELEMENT class - M9 sealed-vs-reflex needs it; (3) FIX_LIST items:
sh50-preset goldens vs the 3.5/10.5/14.5in record, pin #10 datum (transition
completes 42-54% of length - Diyaudio adapter measured; engine's 0.45 morph
sits INSIDE the band, note only), pin #12 sourced silhouette dims, saucer
depth = Martin tangent + 0.5-3cm-at-xmax (replaces the 38deg rim formula),
tap-pressure-vs-cone-strength info row (Hinson pp.13-14).
## (prev) BUILD 528 (2026-07-23 late): M9 DOWN PAYMENT + THE ASSEMBLY INSPECTOR
HIS MID-BUILD CALL: "build a new way to evaluate how things work and do it
while programming... you are messing a lot of how these MEH speakers should
work together" -> v5/inspect5.js: the ASSEMBLY battery (cross-part truths
re-derived independently: counts landed, seats ON their wall/board, bodies
OUT of the air channel (corner-pocket aware), taps under drivers, 1way
nest/ring-band/bore-vs-HF-exit, box containment, NaN sweep, refusal honesty).
Run `node inspect5.js '{...state}'` WHILE CODING; gate section 2.9 runs the
battery on every preset + a lattice sample each push. THE TRUE BOX (M9):
MEH2.boxDims = minimal enclosure over printed horn + driver bodies at mount
angle + CD depth; viewer ghost box now draws IT (14-era cosmetic margins
retired); BOX rows: outer dims + governor (Pavdan 6 mm print walls MEASURED /
18 mm of Hinson's 12-18 birch ASSUMED - his ruling), net rear-air liters
(informational until M10 T/S), 'Drivers stay behind the mouth plane' (graded,
grow-fixable - a body past the mouth cannot be enclosed), body envelope gap
(informational until magnet OD fields exist - frame-OD cylinders falsely
collide on the real SH96). CONSEQUENCE: the law re-baked 3way/sh96 58->60
(v5's corner boards live INSIDE the flare; the real SH96's rectangular cabinet
has pocket room OUTSIDE it - modeling that would let 58 stand, HIS RULING
WANTED) and 3way/classic 27->31 (10in frames were 51 mm past the mouth).
Gate 50,712 checks / 480 states ALL PASS. STILL OPEN M9: rear-chamber
partitions (mid V1 cups), sealed-vs-reflex alignment (needs M10 T/S),
magnet-clearance-at-angle grading (needs magnet OD datasheet fields).
## NEXT: AUTO-SPLIT STL EXPORTER (spec = study _2 findings + study _3 §6 tiers)
1way family CLOSED at build 526 per his call ("we gotta finish with this
family... lets move on"). Landed 518-526: triple, collar/funnel per
construction, OS (Geddes/ATH-style) face curve, arc/round taps on the true
annulus, Martin clearance + tangent rows, CROSSOVER report section, pins
2/4-8/13/14/15/16/18-22 resolved. STILL OPEN on this family (pin again from
the live tab when it matters): #3/#9 one-piece question, #10 transition,
#12 silhouette detail, #17 square-max chamfer-zero (needs facet refactor +
gate matrix), removable saucer DEPTH datum (La still rides the 38deg rim
formula - shallow-saucer ruling wanted), and HIS 3 MEASUREMENTS for the BMS
unit (exit Ø at cone / rim Ø / baffle depth) to replace od-relative guesses.

## SUPERSEDED (landed) — THE DRIVER-MOUNT TRIPLE (his ruling, 2026-07-23 ~8:45pm, ghost-view session)
"The horn needs to go from the small green circle to the large green circle
and match the depth of the baffle with an x-max... estimate these 3 numbers
for every driver." And: the print must NEVER run through the driver.
PER-DRIVER MOUNT DATASET (CXPRE fields + od-relative defaults from the 6FHX51
CAD): (1) exitAtCone Ø - where the print takes over: the TRUE exit for
REMOVABLE-horn units (BMS bolt-on style; print reaches the exit, which sits
AT the cone plane on those), the PROUD MOUTH (.60od) for FIXED-metal-horn
units (FHX family - the print stops there and seats OVER the proud ring with
a collar, the recessed ring in his white print's bore); (2) rim Ø = .72od
(CAD); (3) baffle depth = .14od (CAD cone depth) + xmax clearance - now SOURCED:
US10506331 (Martin Audio, his 9pm drop) sets the static-to-moving clearance
at 0.3-5cm (prefer 0.5-3cm) held at max displacement; same patent: dish inner
slope = TANGENT CONTINUATION of the cone at the rim (beta >= alpha), the
static waveguide reaches to the surround - see study _3 section 7.
IMPLEMENTATION: profile keeps the full acoustic ladder (true exit onward -
the driver's own horn is real path, Lint ≈ .53od as cdDepth-analog for the
XO/null laws) but the PRINTED part starts at exitAtCone: dishMesh loses the
internal snout and gains the collar seat; coaxBody restores the METAL proud
horn (the removed-plastic cavity stays only for removable-horn presets);
shellMesh 1way smooth must slice at the print boundary like angular does
(SPx filter is angular-only today - the smooth funnel still prints from the
deep exit, only correct for removable-horn units). Builds 520-522 landed the
annulus ring + arc slots + nesting; this closes the throat side.
Last updated: 2026-07-23 late (build 518): TOPOLOGY-SWITCH CRASH fixed (leaving
1way with cdSel='unit' died in coax1way at CDP[...].td — button lit, nothing
rebuilt, KNOWN BUILD list stayed stale; guard restores dcx464). RENDER TRUTH:
the smooth-shell viewer now draws MEH2.shellMesh itself (one watertight
FrontSide solid - the triple-skin draw showed the inner BACKFACE through the
outer wall = his "semi translucence layer", pins 6/14 local store) and the 1way
apex draws MEH2.dishMesh itself (REAL tap holes through the face, real bore -
kills the hole-less dish + fake bore "plug" disc + tap decals; pins 2/5/13).
NEW COAX LAW ROW 'Tap holes land whole on the dish' (his pin #18: same clamp
math as dishMesh; if the printable hole is smaller than the law-derived hole
the row fails instead of the STL lying) - gate 41,111 checks ALL PASS. 1WAY UX
(his calls, mid-session): KNOWN BUILD hidden on 1way (driver IS the build),
FORM = ROUND | SQUARE (seN 2/12, the retired bundle values), driver select
auto-sizes the mouth (mouth = 2.35 x unit OD - the mean of the four retired
gate-asserted 1way bundles' ratios 2.20-2.42). REFERENCE BATCH 3 studied in
docs/REFERENCE_LIBRARY_STUDY_3.md (Pavdan box halves, DH350 symmetry-half +
throat-adapter extraction, Hinson's 44-page MEH writeup incl. tap-chamber
canon + 17 m/s port limit, PM90 wood/T-nut construction DWG). HIS TAB IS NOW
LOCAL: localhost:8517/meh5.html - pins live in THAT origin's localStorage
'meh5_bugpins' (ids 2-18; 2/5/6/13/14/18 resolved b518, echo the rest).
OPEN LOCAL PINS (the 1way/2way geometry rework, next batch): #3/#9 dish rim =
driver mounting flange as ONE piece (his photos: the funnel base IS the flange,
entry much wider - #11), #4 throat must match the coax CD's own loading, #7
adapter reaches the driver, #8 holes low enough to meet the cone, #10
round-to-square transition, #12 cone silhouette from datasheet dims, #15 2way
angular throat should read circular (Waslo round bore in the square plate),
#16 taps-per choice 1|2 with straddle tied to tap type + placement (refines
pin-22 X canon), #17 square-max angular should drop the chamfer slivers and
read as the wooden classic (PM90/liam056 look).
(build 515: ONE-HORN coax model - the print REPLACES
the stock horn from the TRUE HF exit (5 B&C datasheets landed: floors, exits,
dims), corner boards v2 = real diagonal shelves (his teardrop catch), the
TAP FOOTPRINT system (measured containment + placement re-walk), round taps,
view modes, relevance UI. Builds 506-514: exports (STL shell/dish/cutters/
panel SVG), M3/M4/M6/M7/M8, ruling B, reference-library studies, the 14 look.
Older: build 505: M3 path-length balance LANDED + true-CAD
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
M6. BAND ARCHITECTURE [LANDED build 509: SUB CROSSOVER slider (60-120 Hz) - the
    port-velocity law evaluates at it AND the new BAND row states the woofers'
    displacement ceiling there (rho*(2pi f)^2*Vd/(2pi r) half-space, Vd =
    nW*Sd*xmax) - one knob, two truths. Informational (no target-SPL input yet).
    4-way question still parked explicitly.]
M7. LAYOUT DIALECTS [CORNER BOARDS LANDED build 507: placeW='chamfer' puts the
    WOOFERS on the 45° chamfer boards (batch-2 SH96 canon correction) and
    forces mids to the apex ring; gate lattice sweeps it (408 states), matrix
    row asserted. RULING B landed build 511; CORNER BOARDS v2 (build 515) =
    real diagonal shelves sized to the woofer, slots along the board] [PLACEMENT
    MATRIX LANDED - docs/placement_matrix.md is
    LAW, gate-asserted: 2 woofers -> the long-axis Danley line (pin #14); mids
    perpendicular (2) / square DIAG diamond (4; chamfer boards on angular =
    SH50+v4 canon) / coverage rows (pin #9 era); measured 3D obstacle
    clearance replaced the radii-sum heuristic (2x12in states: 65in-cap ->
    42in clean); crease exclusion by true axial footprint; velocity-first CR
    grading]. Still open: SH96 corner boards as a WOOFER dialect, knuckle
    passages, remote bandpass (Solana).
M8. PROVEN-BUILD PRESETS [JMOD-CLASS LANDED build 513 from the JW Sound manual
    (2×12 on the DCX coax, 90×60, 30in, exemplary); SH96-class landed 511 under
    ruling B; reference library study in docs/REFERENCE_LIBRARY_STUDY.md]
    [LANDED build 501 - his call: "default settings drop
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
A. EXPORTS [SPLIT/ORIENT CANON captured in REFERENCE_LIBRARY_STUDY_2.md
   (batch 2, build 517): segments stay in ASSEMBLY coordinates, cut planes never
   through driver features; per-role auto-orientation (mouth-down bodies,
   throat-plate-down small horns, mate-face-down roundovers); bed-size-driven
   split strategy (200 vs 300 beds); mirrored-part dedup + BOM manifest;
   glued vs bolted joint systems - the auto-split exporter's spec.]
   [STL SLICE LANDED build 506: MEH2.shellMesh(S) builds the shell
   SOLID (inner + true-offset outer + mouth face/lip + throat annulus; angular
   = exact panel verts, 1way starts at the dish seat), MEH2.stlBytes -> binary
   STL (mm); EXPORT STL button in the HUD; gate 2.8 asserts WATERTIGHT
   (every edge shared by exactly 2 triangles, keyed by position) over all 12
   presets. Note: Horn Studio's writers were NOT available in this handoff -
   written fresh, gate-proven]. [DISH INSERT LANDED build 507: dishMesh - the
   Reference D dish as its own watertight part, REAL round tap holes
   (rect-to-circle patches, no CSG) + bore wall + rim; snout/flange/wings next.]
   [TAP CUTTERS LANDED build 508: tapCutters - one closed stadium prism per
   port (X-pairs carry the ±45° rotation + cross offsets), import as NEGATIVE
   volumes in the slicer to cut the real slots; watertight + count gate-asserted
   incl. the np2 variant.] Still open: true pre-cut shell (boolean); STEP;
   panel-layout export; AKABAK bridge.
B. TRUE PRINTED-PART GEOMETRY [shell wall DONE - real thickness, outer-face mounts, Lpt geometry-true in the Helmholtz law; ONE proven normal path via carried surface params]: seat+slot as one
   solid insert; CD apex insert (Reference B/C: bore + tap ring + bolt circle);
   bandpass chamber housings; 1way coax full part.
C. MAX SPL TILE [LANDED build 510 - Marwan dropped Horn Studio.html: ported
   hornMaxSPL (entry 215, Makarski Ch.7 / Thuras 1935, benched 0.008% vs the
   closed form) onto v5's areaAt: SPL row 'Air-distortion ceiling K2 3%
   (1k/10k)' with geometric Q from the coverage solid angle, d=4m convention,
   Horn Studio's honest-limits text carried over]. Still open: cutoff/loading
   estimate tiles; v1.4 square-family study in docs/meh14_square_study.md
   awaits Marwan's pick.
D. REPORTS PANEL [LANDED build 509: collapsible REPORTS under the chart - path
   table (per-section station + throat path incl. CD depth, the M3 view), front
   chamber Vtc totals, ANGULAR panel cut list (per-panel widths at throat/break/
   mouth + slant lengths, chamfers included, "verify before cutting" Waslo rule),
   smooth print hints (ring segments vs 250mm height, 300mm-bed quarter-split
   note)]. Still open: Hornresp ME2 export text (needs the real format spec -
   not inventing it).
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
