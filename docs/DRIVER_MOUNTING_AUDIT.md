# DRIVER MOUNTING AUDIT — how drivers are ACTUALLY mounted in real MEH builds

Synthesis of 6 corpus reports (repo/tool canon; JMOD manual Rev 2.02; 300Hz MEH + chrisbln;
Hinson/K-402/SH-96/diyaudio wood corpus; printed-STL probe DH350/nov24/SB-V3/Pavdan/DIYAudio-adapter;
Waslo CoSyne/Danley/patents/photo corpus). Doctrine: every number carries its source and a grade —
**measured** (probed from STL/CAD/photo/live code), **documented** (stated in a manual/patent/thread/drawing),
**inferred** (reasoned, flagged). Nothing here is styled.

---

## 0. The invariant chain (holds in every build in every corpus)

driver frame → **flat land** (the "mounting disk", provided by wall, machined recess, raised boss, or separate ring)
→ **tap opening(s) through that land**, inside the cone footprint, smaller than the cone (US6411718, documented)
→ **machine fasteners into captured metal threads** on the far side (T-nuts in wood, heat-set inserts/captive bolts in print;
wood screws only in light DIY and for handles) → **seal = driver's own front gasket clamped on the flat land**
(supplemental gasket stock/sealant/hot-glue at part joints, almost never at the driver flange)
→ the recess/land volume under the cone IS the front chamber (Hinson V2), and the land thickness IS the tap length
(US8284976: "port length corresponds to the local thickness of the sound barrier", documented).

The driver NEVER enters the horn; the print/wood NEVER runs through the driver (b523 triple, documented ruling).

---

## 1. The matrix — (driver class) × (horn material)

### 1.1 BIG WOOFER (10–15 in) × WOOD — the richest cell

| Build | Land | Recess/relief | Taps | Fasteners | Seal | Grade |
|---|---|---|---|---|---|---|
| **Hinson** (10NW76) | 18 mm woofer-flare board, driver bolts to BACK | stepped surround relief CNC'd INTO the board: 10.0 mm max, steps 6.9/4.5 mm, annulus ~d174–d233 (Figs 31–32) | 2 splayed racetrack slots 101.6×19.1 mm each, through the board | machine bolts into T-nuts (count unstated; "the two interior-most bolts" ⇒ ≥4); rear panel 1/4-20 + T-nuts | driver's own gasket on the relieved land; no woofer gasket in text | documented |
| **JMOD** (12NDL88) | 18 mm inner flare; land spans wood + printed adapter side wing | "cone recess contour", 1/4 in ball end mill — **depth/Ø undimensioned in PDF** (lives in .f3d/.STEP only) | 2 teardrop slots per woofer INSIDE the recess circle, **offset toward the throat**, exiting at the diagonal seams around the printed adapter; 1/4 in roundover chamber-side | 4× M5×30 socket cap into M5 tee nuts pressed from the horn side | driver gasket on a land that "needs to be flat for the woofer to seal properly" — filler bridges the wood/print junction (step 9) | documented |
| **K-402** (Beyma SM115/N, frame Ø379–388) | **SEPARATE 15 mm ply ring**: Ø388 OD / Ø370 bolt circle / Ø355 ID — dimensioned exactly to the driver's 8×Ø6-on-Ø370 pattern | ring laid CONCENTRIC over a separate d300 wedge filler puck (50 mm max, 32° ramp) that fills the under-cone volume | 2 racetrack slots through the filler: R28.1 ends (56.2 wide) × ~110 overall | 8× M5×30 + washers per woofer into pre-inserted M5 nuts / TNM5.0 T-nuts; ring fixed by 8× d2.4 countersunk self-tappers; Ø8×25 locating pins + Ø12 bushings | sealant at EVERY joint (0.9 L/horn) **except the drivers** — driver seals on its own gasket, stays removable | documented (dimensioned KOMPAS drawings) |
| **chrisbln** (WAN123.01 12 in) | 19 mm ply wall is the plate | annular surround relief Ø242–285, floor at **"Xmax + 5 mm"** from horn face (documented formula; shipped default 15 mm vs WAN123.01's 6.6+5=11.6 — unresolved, do NOT canonize 15) | dual 2.5 in-class ports (SH-50 derived spacing: LF taps 10.5 in/266.7 mm from CD) | 6× M6 (Ø6.5 holes) on Ø298 BC (306 for WAF123.01), 6 of 8 positions at 45°; **nut type unspecified** | not specified beyond flange-on-wood | documented (.scad) |
| **Danley SH-96** (4× 12 in) | each woofer flange-flat on its OWN plywood board at 45°, spanning cabinet corners OUTSIDE the flare, in X-braced triangular corner chambers | recessed corner chambers (board + measured recess = vent duct) | openings through the walls AT the seams (SH-50 tape-measure: woofer taps 2.5 in dia @ 10.5 in from CD; Danley dialect 31.67 cm²/woofer) | steel **L-brackets** screw board top edges to horn walls; production SH-50: countersunk Allen through-bolts from the horn INTERIOR into tee nuts, pre-stressing the box (forum extract — re-verify before quoting) | caulk/silicone at service panels; driver gasket on board | measured (photo) + documented |
| **Danley mother shell** | curved shell, woofers FLUSH in shallow **milled oval lands** (recessed dishes), slot tap cut inside the dish | milled recess (depth unmeasured) | slot inside the dish | bolted directly from behind, backs exposed | — | documented (photo) |
| **CoSyne** (NS6) | flat outer wall face, surface mount, NO recess ("only straight holes") | NS6 surround self-recessed — no relief needed | racetrack woofer slots, ~45° frustum bevels driver-side stopping short of the seal land | **#6 wood screws** (DIY-light exception) | flange-on-wood trued with wood filler | documented |

### 1.2 BIG WOOFER × PRINTED — **thin cell, flag**

- **Solana** (the printed gold standard, documented): 4 woofers mount ON the printed waveguide with front chambers
  integral to it; **12× M5 heat-set inserts per waveguide** (insert spec 7.1 mm OD × 9.5 mm deep, ~350 °C install);
  M5×20 button-caps + rubber washers close the outer holes from the far side; gasket DXF (4 interlocking quarters,
  ~1.6 mm stock) under the baffle recess. Source: STUDY.md §2.
- **Reference A** (measured probe, prior study): one thin sculpted plate per driver GROUP — seats + kidney ports +
  ribs + CD boss in one printed part, drivers mount from behind onto shallow seats.
- **Tool canon** (v5 b530, measured): every wall seat gets a **measured land boss** — landRaise() rim-marches 24
  azimuths of the frame rim out of the wall solid, worst exit + 2 mm margin = drv.landH; tap port lengthened through
  it (Lpt = wallT + max(9 mm, landH)). The print **raises** a land where wood would **rout** one — same intent, opposite sign.
- **No probed big-woofer-on-printed-horn STL exists in the corpus** (300Hz/nov24/SB-V3/DH350 all carry ≤4 in drivers).
  Big-woofer print practice rests on Solana's documentation alone. UNKNOWN: whether large frames get locating steps.

### 1.3 SMALL WOOFER / OPEN-BACK MID (3–6 in, fired through taps) × WOOD

- **chrisbln mids** (WSN041.00): driver straddles a PAIR of Ø19 round taps, 93 mm outside-to-outside; each tap gets a
  Ø38 driver-side counterbore ("fulcrum", exactly 2× tap dia) leaving a 10 mm Ø19 channel in the 19 mm ply; driver
  position only SCRIBED (104 mm basket square / Ø93.5 membrane circle, 0.5 mm scribe) — **no modeled mid fasteners**.
  Documented (.scad).
- **CoSyne mids**: #4 wood screws; only "recess" is a **shallow 2 in Forstner surround relief** (depth unquantified);
  taps 45°-frustum-beveled, bevel must stop short of the flange seal annulus. Documented (Synergy Calc V5, Step 8/11).
- **Small Syns** (plastic SEOS horn, the hybrid): a 4.35×4.35 in × 1/8 in plate GLUED + epoxy-puttied to the horn
  exterior; gasket land = annulus d3.5–4.0 in (1/4 in wide) kept free of putty-grip holes; 2 taps 7/16 in drilled
  1.25 in from the CD plate, ±0.90 in off center, **tipped to aim at the throat**; wood/sheet-metal screws into the
  plate. Documented (bwaslo posts).
- **SH-50** (production): mid taps 3/4 in dia @ 3.5 in from CD, 8.5 cm apart (van Ommen tape measure). Measured-by-tape.
- Tap placement law (Hinson, documented): mid taps in the horn corners so they don't ripple the tweeter response;
  mid HF-corner pushing can TEAR CONES (pp.13–14) — commercial answer is more mids (up to 6, cf. SH-96's six cups).

### 1.4 SMALL WOOFER / MID × PRINTED — the fully-measured cell

- **300Hz MEH** (B&C 4NDF34, the best-measured single mount in the corpus, all mm, STL-probed):
  - Surface-mount on a flat pad **integral to the horn wall**, tilted 20.5° off the horn axis; no flange recess
    (the 3 mm gasketed flange sits proud).
  - **Locating step**: Ø102.0–102.4 × **2.50 deep**, mirroring the driver's documented 103 mm baffle cutout; step floor
    is an integral aperture disk with Ø72.3 opening — the "mounting disk" IS local horn wall.
  - **Taps**: TWO rectangles ~22.7 × ~38.7 (oblique section), centers ±25 mm off the driver axis, 27 mm bridge under
    the dust cap, running obliquely through the 15.0 mm wall. NOT a concentric ring — an off-axis symmetric pair.
  - **Fasteners**: 4× M4 bolts through the driver's own flange holes into short heat-set inserts (bores Ø5.3–6.0)
    on a measured Ø114.9 circle vs the datasheet's 115 — **the bolt circle is literally the driver's** (pin 3, realized).
  - **Seal**: driver's own 3 mm gasket; rear = 5-segment printed chamber, terminal tab cut off, hot-glue (documented verbatim).
- **nov 24 synergy horn** (measured): 65 mm-square-frame minis (TC9 class) on 66.5–67.4 mm square glue rims only
  ~3.6 mm wide, faces tilted 39.6°; **zero screw holes — glue mount**; tap ~Ø25→32 in a 23–25 mm pocket.
- **White waveguide** (manual p.10, documented + renders): oval recessed pocket per mid with concentric raised sealing
  ridge; tap = **kidney slot hugging one side of the oval, offset toward the throat**; brass heat-set inserts arrayed
  around each recess (FDM: blunt soldering iron ~350 °C/650 °F; SLA: interference fit + CA glue, tap flush).
  NOTE: the "M5×12 captive, 350 °C" spec is from THIS manual — it is definitively NOT in the JMOD PDF (full-text searched).
- **4-funnel snout** (photo, measured read): one monolithic print; **the funnel mouth IS the mid mounting flange** —
  cone and surround sit directly in the funnel opening. This is the "funnel base = flange" photo canon behind pin 11.
- **Reference B** (prior probe): production apex insert — flange + facet seats + stadium slots + CD boss in one part,
  drivers over stadium slots cut straight through the seat floor.

### 1.5 SEALED MID REAR (the cup) × both materials

The mid is always SEALED at the mount, and the cup is an acoustic element (Hinson: rear chamber deliberately tiny; V1 shapes the LF corner):

| Cup | Geometry | Attach/seal | Grade |
|---|---|---|---|
| chrisbln printed cups | WSN041.00: ID 91.5→71.5 × 16.5 mm, 3 mm wall, terminal notch 27×12; 4FE35: 89→75.5 × 18 | slip-over friction fit, no fasteners | documented |
| CoSyne | 2 in dia mailing tube × 3 in, stuffed, capped | GLUED to driver back BEFORE mounting, flange holes kept clear; wire hole caulked | documented |
| Parts Express | 2.5 in PVC lengths | glued to GRS 4FR-8 backs | documented |
| 300Hz MEH | 5 printed segments per 4NDF34 (caps ~1.2 mm walls, cable conduits) | terminal tab CUT OFF, hot-glue seal ("can be a bit awkward! be warned") | documented |
| SB-Horn V3 | 90³ printed cup, internal grooves gripping the 65.0 mm square frame | press/glue, no fasteners | measured |
| SH-96 factory | six sealed silver cups ringing the CD flange (2 top, 2 bottom, 1 each side) | bolted around the square throat plate | measured (photo) |

### 1.6 COAX-CD (6FHX51 / DCX464 class) × PRINTED — the tool's 1way cell

All documented/measured in the repo (b504 CAD study + b523 ruling):
- **Dish derives FROM the driver**: frame Ø 1.00od, gasket .97od, surround .95od, cone rim .72od, cone depth .14od,
  HF mouth .60od PROUD of the cone. Dish rim = flange + 12 mm (rDish = rCone + 0.012); tap ring clamped to the
  exposed cone annulus [.60,.72]od (past .72 holes land on surround/frame; center to .60R belongs to the HF horn).
- **DRIVER-MOUNT TRIPLE** (his ruling, documented): exitAtCone Ø (.60od fixed-horn proud mouth / true exit for
  removable), rim .72od, baffle depth .14od + xmax + 2 mm. Print NEVER runs through the driver: fixed metal horn →
  printed **collar seats OVER the proud mouth ring**; removable (BMS bolt-on) → print owns the path from the true exit.
- **Clearance law** (Martin US10506331, documented): static-to-moving 0.3–5 cm, preferred **0.5–3 cm, held at maximal
  displacement**; dish = tangent continuation of the cone (β ≥ α) reaching to the surround. Engine grades gap =
  xmax + 2 mm in [5,30] ok / [3,50] warn. The 38° rim constant is slated for replacement by the tangent rule (FIX_LIST #8).
- Frame: square with CORNER bolts (CAD + BMS photo canon, measured). Mouth ≥ 1.25× dish (warn 1.05×).

### 1.7 COAX-CD × WOOD — answered by hybridizing

- **JMOD DCX464**: the coax CD mounts to the **integral round flange of the one-piece printed throat adapter**
  (4 holes ~90°, central throat bore), and the adapter is GLUED with construction adhesive into the wood horn,
  indexed by CNC-milled mounting flanges in the U/L inner flares + rear indexing geometry. 4× M6×16 flange bolts
  (BOM lists 4 for two cabinets vs 8 required — documented discrepancy). What the M6 bolts thread INTO on the print
  is **undocumented** (no nuts/inserts in BOM) — open. The wood cell's answer is: *don't mount a coax to wood; grow
  a printed adapter and glue it in.* Documented.

### 1.8 PLAIN CD (1 in / 1.4 in) × WOOD

- **K-402** (fully dimensioned, documented): driver FIRST screwed to a dedicated 12 mm ply plate (Крепление ВЧ):
  throat hole **d50.8 (2.00 in)**, 4× d5.2 holes at 72.1×72.1 spacing (≈d102 BC); loaded plate then screwed to the
  horn apex with countersunk self-tappers OVER sealant, throat masked with tape so no sealant reaches the driver.
- **CoSyne**: separate tweeter plate GLUED to the apex back; throat opened afterward with a Forstner bit "the same
  diameter as your tweeter's throat" (1 in for CDX1-1445). Wrench access to CD bolts and to mid screws hiding under
  the CD is an explicit layout constraint. Documented.
- **chrisbln**: undersize the throat cut and hand-file round ("1 in dia for a 1.4 in driver"). Documented.
- **Hinson**: 18 mm birch throat adapter (STL supplied); printed with heavy fill acceptable if not repeatedly shipped. Documented.

### 1.9 PLAIN CD × PRINTED — measured five ways

| Build | Pattern | Numbers (measured) |
|---|---|---|
| nov 24 | **one-piece boss**: raised disk integral with horn | boss Ø88.0 × 6.0 proud; throat Ø22.5; 4× Ø6.0 on BCD 78.0 @ 90° — driver identity unverified |
| 300Hz | **one-piece land** | Ø~114 land × 5.0 proud; throat Ø25.59 expanding conically; 2× Ø6.49 on BCD 76.0 (US 2-bolt 1 in) with Ø8.49 insert pockets behind; 2 rect pockets at the 90° positions (purpose unknown) |
| DIYAudio adapter | **separate adapter to wood horn** | Ø94.5 pedestal, Ø25.6 throat, 2× Ø6.6 on BCD 76.0; 196-sq flange + 4 feathered rabbeted petals nest inside the pinwheel wood horn; no flange screw holes (glue) |
| DH350 | **separate adapter captured in the glue seam** | entry Ø25.40 (=1.000 in), plate 75×35×3.0, 2× Ø5.5 @ 53.0 spacing, boss morphs to 27.9×32.4 rect = the halves' 28.0 seam channel; CD fires into the seam |
| SB-Horn V3 | **seam-mount**: bore is two matched semicircles across the split plane | half-annulus land outer Ø~106, bore Ø~50 (inferred from areas), 5 mm step |
| White manual / Solana | **captive studs**: 2× M5×12 hex bolts placed BEFORE gluing the adapter — permanent studs | documented (350 °C insert temp for the rest) |

CD tap is **exactly concentric** with land + bolt circle in every measured case (fit centers agree within 0.02 mm).

---

## 2. Cross-cutting evidence

### 2.1 Recess / relief depth — every sourced number

| Rule / instance | Value | Grade | Source |
|---|---|---|---|
| chrisbln surround relief formula | **relief floor = Xmax + 5 mm** from horn face | documented | 12-24-MEH.scad lines 109–112 ("use driver's Xmax +5mm"); shipped default 15 vs computed 11.6 — unresolved |
| Martin clearance band | static-to-moving **0.5–3 cm preferred (0.3–5 hard), at max displacement** | documented | US10506331 |
| Hinson woofer relief | stepped 10.0 max / 6.9 / 4.5 mm | documented | MEH.pdf Figs 31–32 |
| 300Hz locating step | 2.50 mm deep (cutout mirror, NOT excursion relief — flange proud) | measured | horn-base.stl |
| Printed land proudness cluster | 5.0–6.0 mm (300Hz 5.0, nov24 6.0, SB-V3 5.0, Pavdan 5.9–6.0; DH350 plate 3.0) | measured | STL probes |
| Waslo relief | "shallow", 2 in Forstner | documented, unquantified | Synergy Calc V5 Step 8 |
| JMOD recess | undimensioned in PDF (in .f3d only) | documented gap | JMOD Rev 2.02 |
| Engine (v5) | Martin gap graded as xmax + 2 mm in [5,30] ok | measured (code) | engine.js 962–974 |

**Reconciliation** (see PLAN §A2): chrisbln's xmax+5 and Martin's 0.5–3 cm are NOT competing rules — they govern
different interfaces. xmax+5 is the machined-relief depth under a flange-clamped cone in a flat wall (wood dialect,
"will the surround hit the board"). Martin's band is the gap between a static waveguide/dish SURFACE and the moving
cone at full excursion (coax dish / any printed surface facing the cone). Both are sourced; both belong in the tool,
each at its own interface.

### 2.2 Mounting disk/ring geometry — OD vs frame OD

- v5 seat annulus: seatR = frame OD/2 + **11 mm** (measured, code). Coax dish rim = flange + **12 mm** (measured, code).
- K-402 ring: Ø388 OD on a Ø379–388 frame — the wood ring matches the frame OD almost exactly, bore Ø355 just clears
  the basket, BC Ø370 = the driver's (documented drawing).
- 300Hz: land ring 10–12 mm wide under the frame (tap Ø77–82 under a ~Ø102-cutout 4 in driver) (measured).
- nov24 pods: rim only ~3.6 mm wide (glue-only minis) (measured).
- The horn GROWS to host the disk, never the reverse (declared-mouth vs dish-flange law, growth-fixable; measured, code).

### 2.3 Bolt counts / circles / systems — measured & documented table

| Driver | Pattern | Grade/source |
|---|---|---|
| LaVoce 12 in | 6× M6 on Ø298 BC, basket 315 | measured (.scad) |
| Beyma SM115/N 15 in | 8× Ø6 on Ø370, frame Ø379–388 | documented (K-402 BOM/drawing) |
| B&C 4NDF34 4 in | 4× on Ø115 BC (measured 114.9), cutout 103, OD 127, flange+gasket 3 | documented + measured |
| B&C 6FHX51 coax | square frame, CORNER bolts | measured (CAD + photo) |
| JMOD 12NDL88 | 4× M5×30 into tee nuts | documented |
| K-402 HF plate | 4× d5.2 @ 72.1 sq (≈d102 BC), d50.8 throat | documented |
| 1 in CDs | 2-bolt Ø6.5-class on BCD 76.0–76.2 (300Hz, DIYAudio adapter) or 4-bolt BCD 78 (nov24, unidentified) | measured |
| liam056 CD | 4× M6 studs + nuts | documented |

Fastener systems: **wood** = T-nuts/tee nuts (JMOD M5/M6, PM90 M6, Hinson 1/4-20), pre-inserted M5 nuts + locating
pins Ø8×25 (K-402), hurricane nuts hold in 1/2 in baffles but FAILED in 3/4 in hardwood ply → threaded inserts
(forum, documented); wood screws only DIY-light (#4/#6 CoSyne) and handles. **Print** = heat-set inserts
(M4 short: measured bores Ø5.3–6.0; M5: 7.1 OD × 9.5 deep, ~350 °C — Solana/White), captive bolts placed before
gluing (M5×12), screws into the CD's own threaded flange. **No T-nut appears in any printed corpus; no heat-set
insert appears in the JMOD wood manual** — the dialects don't mix (the JMOD printed adapter's M6 capture is the one
undocumented crossover).

### 2.4 Gaskets / sealing

- Driver flange: its OWN gasket on a FLAT land, everywhere. JMOD makes flatness a build step (filler across the
  wood/print junction). K-402 explicitly EXCLUDES drivers from the sealant-every-joint rule (removability).
- Dedicated gasket parts: only Solana (DXF quarters, ~1.6 mm stock) + rubber washers under through-bolts; foam gasket
  at CoSyne tweeter + horn-to-frame joints. NO gasket groove or O-ring channel is modeled in ANY probed STL.
  **AMENDED (his photo drop, 2026-07-24 — MARWAN_MOUNT_PHOTOS_NOTES.md #16a):** one COUNTER-EXAMPLE
  exists in the photographed record: a purple printed CD mount shows a BLACK O-RING SEATED IN A PRINTED
  GROOVE around the throat, next to brass heat-set inserts. So the honest statement is: no PROBED STL
  models a groove, but at least one real printed build ships one at the CD throat — the o-ring groove is
  a real, photographed option for the CD cell specifically. Confidence: inferred (photo).
- Part joints: sealant/caulk (K-402 0.9 L/horn; Danley service), silicone + tape (liam056), hot glue (300Hz rear),
  glue-bond-as-seal (all printed half-joins).
- Print orientation serves the seal: CD/mounting face prints as the BED face ("best flatness where the gasket seals").

### 2.5 Tap ↔ mount relationship — the observed taxonomy

1. **Concentric bore** (CD, always): throat bore = tap, dead-centered on land + BC (measured ≤0.02 mm).
2. **Concentric ring on the exposed annulus** (coax): tap ring clamped to [.60,.72]od (measured/code).
3. **Symmetric off-axis pair under the cone** (mids/woofers, dominant): 300Hz ±25 mm rect pair; chrisbln Ø19 pair;
   Hinson/K-402 racetrack pairs; JMOD teardrops offset TOWARD the throat. Center bridge stays under the dust cap.
4. **Kidney-at-oval-edge** (printed White waveguide, printed-base photo): single slot hugging the throat side of the recess.
5. **Seam/corner opening** (Danley corner boards, JMOD): tap = the opening through the wall AT the seam on the
   driver's fire axis; "under the driver" = on its fire axis, only lateral cross-offset is graded (engine).
6. **Aimed taps**: Small Syns drills tipped toward the throat; Heinz US5526456 passages open at the horn's own angle
   (the 45° frustum canon; a frustum halves the effective wall term — Waslo).
Entry is ALWAYS smaller than the cone and inside its footprint (US6411718).

### 2.6 Magnet support / bracing — thin, mostly negative evidence

- NO magnet brace exists in any probed printed STL; small mids/CDs hang on flanges alone (measured, corpus-wide).
- Heinz US5526456 explicitly permits "a mounting bracket or brace (not shown)… because of the mass" (documented).
- SH-96: X-braced plywood corner chambers + wedge blocks; L-brackets fix BOARDS, not magnets (measured, photo).
- celilo v2: single central bracket clamping both woofer magnets — inferred from a render PNG only.
- The recurring REAL problem is bolt ACCESS, not magnet sag: Hinson's bent tool + "install handles after woofers" +
  ~1 in access holes suggestion; JMOD's 90° spade-connector clearance; CoSyne's wrench-access layout constraint.

### 2.7 What the SH-96 interior photo shows (measured read) and what remains unknown

Shows: 4 cast-frame 12 in woofers, each flange-flat on its own plywood board at 45°, cones firing through the boards
into the horn, basket backs open to the rear chamber; steel **L-brackets** screwing free board edges to horn walls;
trapezoid wedge boards bridging upper/lower boards into a chamfered corner; six sealed silver mid cups clustered on
green-painted angled boards around the apex; CD's round 4-screw flange on a light square apex plate; rear panel on a
perimeter screw row; side-wall circles = recessed HANDLE cups with T-nuts (earlier "vent" reading RETRACTED).
Unknown: woofer flange fastener count/type (unresolvable at photo resolution); the two dark oval side openings;
SH-96 vent dims (front-view pixel read ~2.5–3.2 in on a 58 in mouth, ±15–20%, no anchor); SH-50 vent count per box.

---

## 3. Honest gaps (do not paper over)

1. **Big-woofer × printed** has no probed STL — Solana documentation only.
2. **Recess depths in wood** rest on ONE formula (chrisbln xmax+5) whose own shipped default contradicts it, plus one
   dimensioned drawing (Hinson 10/6.9/4.5). JMOD's recess is undimensioned (in .f3d, downloadable, unprobed).
3. **Locating-step depth** has ONE measured instance (300Hz, 2.50 mm).
4. Gasket canon: one stock thickness (Solana ~1.6 mm), no material/durometer/compression anywhere.
5. Magnet OD is not a datasheet field in the tool; magnet clearance stays ungraded (M9).
6. Live pins 3/9/12 text unretrieved this session (his tab's meh5_bugpins is in another Chrome profile; BUGPINS.list()
   returned [] on the reachable origin) — task-brief quotes + queue.md echoes are the record.
7. JMOD CD-bolt capture (what M6×16 threads into on the print) undocumented; JMOD BOM short 4 bolts (typo class).
8. liam056 part 2 (Mid_Driver_Mount / Bass_Driver_Mount / Hf_Throat STLs — the only STLs NAMED driver mounts) missing
   from Downloads, unprobed.
9. Danley through-bolt/tee-nut description came via search extracts (diyaudio 403s WebFetch) — re-verify in-browser
   before quoting in a pin.
10. 300Hz woofer-fastening ambiguity resolved for the mids (inserts measured) but SB-V3 / nov24 woofer lands have
    ZERO fastener holes — glue/press only, or drilled later; the cited diyaudio thread post (7871737) was 403'd.

---

## APPENDIX: his 17-image photo drop (2026-07-24) — merged evidence
Full per-image records in MARWAN_MOUNT_PHOTOS_NOTES.md (same directory / repo docs).
Highlights the miners could not see (conversation-only images):
- PURPLE BUILD (#16a): o-ring IN A PRINTED GROOVE at the CD throat + brass heat-set
  inserts — the one groove counter-example (amended into §seal above).
- GREEN POD (#12): drivers bolted straight onto integral round printed faces (land +
  center tap + screw bosses one piece) — the cleanest one-piece exemplar for pin 9.
- UNITY-ERA CUTAWAY (#17): the historic wedge-riser mount under a big woofer on a flat
  wood wall — the axial spot-face land (pin #5) in the founding record.
- SH-96 INTERIOR (#5, InfoComm 08): corner boards attach with L-BRACKETS at the board
  tops; 6 sealed mid cups ring the CD block; taps at the woofer EDGE not center per the
  diyaudio Droco photo-analysis of the official render.
- FUSION CAD DISKS (#2/#13/#14, his own CAD): the separate-round-disk language (plate +
  center tap + screw circle) — the pin-3/9 'mounting disk' vocabulary his tab pins used.
