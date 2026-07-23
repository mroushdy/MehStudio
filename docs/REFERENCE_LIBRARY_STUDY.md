# MEH Reference Library Study
For MEH Studio v5 parametric design tool. Analyzed 2026-07-23.
All archives extracted under `refs/<slug>/`. STL bounding boxes computed from raw vertex data
(binary + ASCII parsers); full machine-readable inventory in `refs/_stl_inventory.txt`.
PDF text dumps: `_jmod3.txt`, `_solana.txt`, `_300hz.txt`, `_k402_instr.txt`.

Legend for confidence: **HIGH** = numbers read directly from text/geometry. **MEDIUM** = inferred
from bounding boxes / file names / renders. **LOW** = identification only.

---

## 1. JMOD Multiple Entry Horn (3).pdf — and (1).pdf [identical, md5 7df4b04b...]
**What it is:** Full DIY manual (24 pages, Rev 2.02, released by John White / JW Sound, 2026-02-05)
for the JMOD, a PA-oriented 3-way MEH point-source top adapted from Scott Hinson's MEH design.
CNC plywood cabinet + 3D-printed throat adapter. License CC BY-NC-ND 4.0 (DIY only,
third-party fabrication for personal use allowed).

**Key numbers (all verified from text — HIGH confidence):**
- Cabinet: 75 cm W x 47 cm H x 42 cm D (29.5" x 18.5" x 16.5"), 34 kg. 12 mm + 18 mm birch ply.
- Coverage: 90x60 constant directivity; horizontal pattern control to 320 Hz, vertical to 500 Hz.
- Operating range 80–18,500 Hz. Fb = 70 Hz, F3 = 55 Hz, F10 = 45 Hz.
- Drivers: 2x 12" midbass (recommended B&C 12NDL88; alternates 18Sound 12NTLW3500,
  B&C 12NDL76, Ciare PWA12.75, Beyma 12MCS500, B&C 12CL76) + 1x coaxial compression driver
  (B&C DCX464 standard; BMS 4594HE requires cabinet-depth mod).
- DSP preset (tri-amp): LF 80 Hz LR4 HP / 195 Hz LR2 LP, delay 0.4 ms, 0 dB.
  MF 370 Hz LR4 HP / 3600 Hz BU3 LP, -4 dB, PEQs 920 Hz -4.5 dB Q2.5; 1970 Hz -6.5 dB Q1.8;
  540 Hz +3 dB Q3.8. HF 3600 Hz BU2 HP, inverted polarity, delay 0.22 ms, -5 dB,
  PEQs 3450 Hz -7.5 dB Q1.3; 6000 Hz +2.5 dB. Bi-amp option via B&C FB464 passive network.
- Port topology (v2.0): bass-reflex ports with **tapered profile keeping constant cross-sectional
  area entrance-to-exit**, positioned to minimize interruption of the CD wavefront; woofer
  bandpass ports get a 1/4" (6.35 mm) roundover on the inside edge (trim router).
- Throat adapter: BEM-optimized (AKABAK + Ath4) transition into conical flare; 3D printed;
  **rear indexing geometry for assembly repeatability**; min printer volume 170x110x90 mm;
  material tiers: BEST PC blends/PPS-CF/PA6-CF; GOOD PETG-CF/GF, PCTG, HT-PLA-GF; AVOID PLA/TPU.
- Woodwork: 13-part index (12 mm panels + 18 mm flares); 22.5 deg table-saw bevels on L/R outer
  flares only (v2.0 removed other bevels for easier assembly); M6/M5 tee-nut hardware schedule;
  pole mount at 245 mm from front lip (center of mass with 12NDL88).
- Kickbin guidance: cross to kicks no higher than 200 Hz (or bassbins to ~160 Hz).

**Ideas for MEH Studio v5:** constant-area tapered reflex port profile as a port primitive;
flare parts left joined on shared CNC stock and flipped for second-side ops (two-sided
machining convention); throat adapter indexing bosses; validated-driver tier table pattern;
DSP preset export format (per-channel HPF/LPF type+slope, PEQs, delay, polarity).
**Missing:** exact port cross-section dims, chamber volumes, throat entry angles (live in the
Fusion .f3d/.STEP download, not the PDF).

## 2. Solana DIY Guide (1).pdf
**What it is:** 13-page DIY manual (Rev 1.03, John White, 2025-06-01) for the Solana waveguide
module: a drop-in 3D-printed MEH "coaxial" module (1 CD + 4 woofers on the waveguide) that
the builder mates to their own rear enclosure — i.e. the mid/woofer front chambers are built
into the printed module and the builder supplies the remote rear (bandpass) volume.

**Key numbers (HIGH):**
- Drivers per module: 1x B&C DH450 (16 ohm preferred; its **extended phase plug is what makes
  the compact driver spacing physically possible**) + 4x B&C 6NDL38 8 ohm. Design optimized
  for exactly these drivers.
- Module displacement: **waveguide + drivers occupy 9.75 L** of enclosure volume.
- Rear-chamber alignments (this is the remote-bandpass data):
  - **Sealed: Vb = 30 L, min HPF 200 Hz 2nd order, max SPL 123 dB.**
  - **Vented Low-Tuned: Vb = 30 L, 1 round flared port, Fb = 50 Hz, port 100 mm dia x 240 mm
    long, min HPF 43 Hz 4th order, max SPL 110 dB.**
  - **Vented High-Tuned: Vb = 25 L, 1 round flared port, Fb = 83 Hz, port 100 mm dia x 63 mm
    long, min HPF 100 Hz 4th order, max SPL 122 dB.**
  - WinISD project supplied; rule: **front chamber parameters stay fixed, only rear chamber
    may be modified; rear tuning changes front-port air velocity because cone excursion is
    minimized near Fb — watch front-chamber air-velocity while simulating.**
- Klippel NFS test box: 412x412x342 mm with 6.35 mm edge roundovers ("Vented Low Tuned").
  Vertical axis = the axis with the *narrower* woofer bandpass ports (ports are asymmetric H vs V).
- DSP starting point: Ch1 woofers LPF 260 Hz 1st order, PEQ 550 Hz -12 dB q2, 3500 Hz -12 dB q3.
  Ch2 CD -10 dB, HPF 1000 Hz 2nd order, PEQ 1200 Hz -5 dB q5; 2500 Hz -4 dB q1;
  10600 Hz +5 dB q2. (Effective acoustic XO region ~1 kHz with overlapping 1st-order woofer LP.)
- Printing: SLA min volume 298x164x300 (4-piece) or 376x376x150 (1-piece);
  FDM min 250x210x220 (4-piece) or 376x376x150 (1-piece). Parts: 2x quarterA + 2x quarterB +
  throatadapter (100% infill) + 12x locatingpin (100% infill). Waveguide 25% cubic/gyroid infill.
- Assembly: quarters joined with 12 locating pins + glue; **2 captive M5x12 hex bolts must be
  placed in the throat adapter before gluing** (CD mounting); 12x M5 heat-set inserts
  (must be 7.1 mm OD x 9.5 mm deep) per waveguide for woofers; 16x M4 inserts for
  baffle mounting; M5x20 button-caps + rubber washers seal the outer woofer holes from the far side.
- Baffle integration: baffle.step for CNC recess; gasketquarter.dxf cut 4x in ~1.6 mm gasket
  stock, fitted interlocking; 2–3 mm 45-degree bevel on baffle cutout inside edge may be needed;
  waveguide drops in at 45-degree rotation, then secured with 16x M4.

**Ideas for v5:** the remote-bandpass model (fixed front chamber + user-tunable rear chamber
with the three alignments above as presets); quarter-split print strategy with locating pins;
gasket DXF export as a standard output; captive-bolt convention; heat-set-insert hole specs.
**Missing:** front chamber volume/port dims themselves (baked into the model, not stated as text);
waveguide mouth size/coverage angle (not stated numerically in the PDF).

## 3. AMT waveguide october 8th - sliced.zip
Single binary STL `AMT waveguide october 8th - sliced.stl`, 110,706 tris,
bbox 211.0 x 211.0 x 165.0 mm. A one-file "sliced" (print-split, plated) AMT-tweeter waveguide,
apparently ready-to-print on a ~210 mm bed. No text, no author metadata.
**Idea:** naming convention "<part> <date> - sliced" for print-ready plated exports; a ~210 mm
square waveguide is the practical single-plate ceiling for consumer printers.
**Confidence:** MEDIUM (role from name; dims exact). Missing: source CAD, AMT model.

## 4. Woofer Mounts.zip
`Woofer Mount 1.stl` + `Woofer Mount 2.stl` (binary, ~5.2k tris each, both
56.3 x 181.2 x 163.3 mm) plus matching SketchUp .skp sources. Two variants of an angled
woofer mounting bracket/cradle, SketchUp-authored ("SketchUp STL" headers). Paired left/right
or two design iterations — bbox-identical.
**Idea:** external printed woofer mounts as a v5 accessory output (bracket that adapts a round
frame to an angled horn wall). **Confidence:** MEDIUM. Missing: which woofer, mounting-hole specs.

## 5. xrk971-Xbush-3D-Print-Files.zip
xrk971's (diyaudio) "XBush" MEH print set, 7 binary STLs:
- `Xbush-Throat-Adapter-v1/v2/v3.STL` — 119.8 x 119.9 mm face, thicknesses 15.9 / 8.9 / 25.4 mm
  (three iterations of the CD throat adapter plate).
- `Xbush-SB65-Rear-Chamber-1.STL` — 119.9 x 60.3 x 119.9 mm: printed sealed rear chamber for the
  SB Acoustics SB65 2" full-range used as the "CD".
- `Xbush-Woofer-Volume-Filler-v01.STL` — 143.5 x 29.2 x 143.5 mm: volume-reducing filler insert
  behind a woofer (front-chamber volume tuning by displacement).
- `Horn-wall-adpater-v03.STL` — 165.2 x 114.0 x 140.4 mm: adapter joining driver to horn wall.
- `Port-repair-6-holes-drill-template-v1.STL` — 120.6 x 49.8 x 42.6 mm: drill template for
  re-doing 6 port holes on an existing horn.
**Ideas for v5:** printed rear chamber for full-range-as-CD builds; **volume-filler part type**
(tune chamber volume without rebuilding); versioned throat-adapter thickness variants; printable
drill/port templates as a repair/retrofit export.
**Confidence:** HIGH on dims, MEDIUM on roles (names are explicit). Missing: docs, port dims.

## 6. Diyaudio Synergy adapter .zip
`Diyaudio Synergy adapter .STL`, binary, 9,464 tris, bbox 196.3 x 196.3 x 140.0 mm.
STL header: `solid Diyaudio Synergy_Parametric7` — i.e. an export from the same
"Synergy_Parametric7" parametric model as source 7, scaled/extended (196 vs 182 mm square,
140 vs 123.5 mm deep). A square-mouth conical synergy horn/adapter segment.
**Idea:** confirms a community pattern of one parametric master model re-exported at different
sizes; v5's export should stamp the parameter set into the STL header the same way.
**Confidence:** MEDIUM. Missing: the parametric source itself, driver spec.

## 7. Synergy_Parametric7-no overhangs.zip
`Synergy_Parametric7-no overhangs.STL`, binary, 7,456 tris, bbox 182.0 x 182.0 x 123.5 mm.
A square conical synergy horn (throat-to-mouth section) explicitly reworked to print
**without support overhangs** ("no overhangs" in the name). Same family as source 6.
**Idea:** provide a "no-overhang" geometry mode (chamfered/45-degree-max walls) as an export
option in v5 — the community clearly iterates specifically for this.
**Confidence:** MEDIUM. Missing: parameter values, author (diyaudio thread not included).

## 8. V6 stubSTL.zip
`V6 stub.stl`, binary, 47,238 tris, bbox 198.7 x 288.7 x 142.8 mm, Meshmixer-exported
("MESHMIXER-STL-BINARY-FORMAT" header). A "stub" (truncated) horn body, version 6 —
rectangular ~199 x 289 mm mouth, 143 mm deep. Likely a printable stub horn meant to be
extended by a wooden secondary flare.
**Idea:** the stub-horn + wooden-extension split (print the precision throat region, build the
big mouth from flat stock) is exactly the hybrid strategy v5's export should support.
**Confidence:** MEDIUM (role inferred from name/size). Missing: docs, drivers, mouth angles.

## 9. Optimiert.zip
`Optimiert.stl` (binary, 5,026 tris, bbox 340.0 x 360.0 x 21.0 mm) + `Optimiert.skp`
(SketchUp source). German ("optimized"). A flat 21 mm-thick plate 340 x 360 mm — a horn
flare/baffle panel profile, CNC- or saw-cut stock geometry rather than a printed part.
**Idea:** flat-panel export at stock thickness (18/21 mm) with the horn profile cut in —
supports the flat-pack/CNC output path. **Confidence:** LOW-MEDIUM (only bbox + name).
Missing: any documentation; what exactly was optimized.

## 10. SB-Horn_V3.zip
A complete measurement + CAD dossier for "SB-Horn V3", a German DIY MEH (VituixCAD project
path shows user "chris", file "SB Horn V3 Activ Weiche mit Winkelmessungen"). Contents:
- STLs: `SB-Horn V3_12.stl` (horn section, 204 x 307 x 243 mm), `SB-Horn V3_Phase_Plug.stl`
  (114 x 110 x 10.1 mm plate phase plug), `SB-Horn V3 - Back Chamber Peerless - Oval.stl`
  (90 x 90 x 90 mm printed rear chamber for a Peerless driver, oval ports),
  `SB-Horn V3 - Wood Chamber.stl` (360.6 x 486.0 x 306.9 mm wooden rear-chamber box).
- SketchUp sources incl. `PRV-Horn Extension - ALL.skp`, `Ring 8mm.skp`,
  `V4_3_Low_Driver_Plug_3.skp` (V4 iteration), Wood Chamber.skp.
- Mold photos (`Mold 1/2.PNG`, `Waveguide Copy.jpg`) — the printed horn used as a casting mold.
- Measurements: VituixCAD screenshots, HF/LF horizontal+vertical polars at 4.1 ms gate,
  impedance PNGs, DSP26 (t.racks?) HF/LF output screenshots, ground-plane 1 m photos.
- Crossover read from `Vituix CAD - Overview.PNG` (HIGH, read from image): 2-way active;
  MF/LF channel But24 LP 325 Hz + PEQ 336 Hz -3.5 dB Q0.71, 864 Hz -10.5 dB Q2.8;
  HF channel LR24 HP 613 Hz + 6 PEQs (823/-1 Q5.31, 923/-2 Q0.405, 2914/-1.5 Q1.12,
  1449/-2 Q3.35, 900/-2.5 Q4.97, 6300/-10 Q0.8); acoustic crossing ~443 Hz.
**Ideas for v5:** printed-horn-as-mold workflow; oval-port printed rear chamber; separate
wood chamber + printed waveguide split; publishing a measurement dossier (polars, impedance,
XO screenshots) alongside geometry.
**Confidence:** HIGH for the listed dims/XO values; MEDIUM on design intent. Missing: driver
models beyond "Peerless"/"PRV" hints, text documentation.

## 11 & 14. celilo v2 - sliced (.123dx.zip and .stl.zip)
- `celilo v2 - sliced.123dx` — Autodesk Fusion/123D container (zip of Manifest, BulkStream,
  BREP1.smt). The BREP kernel data (.smt) is proprietary — **not parseable here**; however the
  embedded preview PNG shows the design: a compact rounded-rectangle MEH with **two ~5-6" cone
  woofers mounted at compound angles firing through wall taps beside a central small
  driver/phase-plug hub**, print-split ("sliced").
- `celilo v2 - sliced.stl` — binary STL, 254,534 tris, bbox 193.8 x 193.8 x 168.0 mm: one
  print-plate piece of the same design (fits a 200 mm bed).
**Ideas:** two-woofer compact MEH topology (vs 4-woofer symmetric); center-hub woofer clamp
bracket visible in the render (single central bracket holding both woofer magnets).
**Confidence:** MEDIUM (render + bbox; no text/docs). Missing: drivers, XO, author
(name "celilo" suggests a Pacific-NW-named DIY series).

## 12 & 15. MEH Multiple Entry Horn - 6886663.zip and meh-multiple-entry-horn20241229-1-lxw7uz.zip
**Same thing, two downloads** (Thingiverse thing 6886663 by ChrisBLN; the second zip is the
same file set with double-dot names; `12-24-MEH.scad` files are md5-identical).
**What it is:** a **parametric OpenSCAD MEH generator** — the closest existing analog to MEH
Studio v5. Generates 3D preview, exploded view, and flat 2D cutting templates (DXF/SVG via
projection) for table-saw/CNC plywood MEHs. CC BY-NC. "Buggy, educational."
**Key numbers/rules verified from the .scad (HIGH):**
- Default parameters: throat 50x50 deg, mouth 70x70 deg, hornthroatheight 446.6 mm,
  throat opening 25.4 mm (advice: make throat hole smaller than driver dia and file it round,
  e.g. 1" hole for a 1.4" CD); 19 mm stock baseplates.
- Tested drivers: HF Lavoce DN14.40T/DN14.300T; Mid Lavoce WSN041.00 (**must be sealed** —
  printed closed-back cups provided); LF Lavoce WAN123.01/WAF123.01. Tri-amped,
  XO ~400–500 Hz and ~1000 Hz ("1300 Hz, 1000 Hz also fine").
- **Documented Danley tap distances (from comments):** SH-50 mid ports 3.5" (88.9 mm) from CD,
  LF ports 10.5" (266.7 mm), reflex ports 14.5" (368.3 mm); SH-50 mid taps 8.5 cm apart
  L-R and T-B. SH-96 (60x90): mid taps 13.3 cm apart L-R, 10.5 cm T-B.
- Port defaults: mid port dia 19 mm; LF port dia 2.5" (63.5 mm); reflex port dia 2.5";
  LF surround cutout depth = driver Xmax + 5 mm (default 15 mm).
- Compound-miter rule: use jansson.us/jcompound.html, N-sided box with 4 sides at half the
  wall angle (e.g. 25 deg for a 50 deg throat) to read the butted-joint saw angle (-10.3 deg).
- Panel math: LengthC = hornheight / cos(angle/2); a = sqrt(C^2 - h^2) — the exact flat-panel
  developable geometry v5 needs for its flat-pack export.
- `closed-back-wsn041.00.scad` / `closed-back-4FE35.scad`: parametric printed sealed cups for
  mid drivers — truncated cones: WSN041.00 cup 91.5→71.5 mm ID, 16.5 mm tall, 3 mm walls,
  with terminal notch; Faital 4FE35 cup 89→75.5 mm ID, 18 mm tall.
**Ideas for v5:** this file is a direct blueprint — parameter names, tap-distance presets,
2D projection export, mid closed-back cup generator, saw-angle helper. Port fulcrum concept
(oversized secondary bore behind mid ports) is in the code (`Mid-fulcrums`).
**Confidence:** HIGH. Missing: the cabinet() module is flagged buggy; no chamber-volume math.

## 13. 300hz-multi-entry-horn-model_files.zip
Printables package "300hz Multi Entry Horn" by **Cemetery Sounds** (PDF card, updated
2025-03-14, CC BY-SA; links diyaudio thread "another 3d printed MEH", post 7871737).
**Key numbers (HIGH, from PDF + STL scan):**
- Drivers: 2x 4" B&C 4NDF34 mids + Lavoce DF10.172k 1" HF. Plays 300 Hz up.
- DSP: Low ch: LR4 HP 400 Hz, LR4 LP 1600 Hz, PEQ 809 Hz -3.3 dB Q2.074, delay 1.78 ms.
  High ch: LR4 HP 1600 Hz, PEQ 2597 Hz -7.8 dB Q1.001, 4000 Hz -3.0 dB Q3, delay 1.7 ms.
  So **XO = 400 Hz (to subs/mains) and 1600 Hz (mid-HF)**.
- Print splitting (7 horn files): 1x `horn-base` (240 x 161.8 x 140 mm) + 2 each of
  middle-side (245.9 x 141.3 x 150), top-edge (105.1 x 180.2 x 60), top-middle
  (210 x 108.1 x 60) — mirrored halves + z-sliced layers; assembled mouth ~ 420 x 360 mm class.
  Joined with **M4 short threaded inserts + M4 bolts** (insert drawing included).
- Printed rear chambers for the 4NDF34 mids: cap (x6), section-with-cables, inner-section
  (~50.9 mm tall stack, ~22 mm wide); note: **cut the little tab off the driver and hot-glue
  seal** to make the chamber fit.
**Ideas for v5:** bolted (not glued) horn assembly via threaded inserts; z-slice + mirror
splitting scheme; cable-passage feature inside printed rear chamber sections.
**Confidence:** HIGH. Missing: coverage angles, exact mouth dims (not stated).

## 16. SynTripP_CAD.zip
20 STEP files (AP214, SI metres), "Unique parts - *.step": the **SynTripP** — Art Welter's
(diyaudio) dual-driver two-way MEH PA top with a **two-stage horn: primary horn + secondary
horn baffles** that extend the mouth. Parts include: phase plug, throat adapter plate,
primary horn horizontal/vertical baffles + spacers/supports, secondary horn horizontal/vertical
baffles + attachments, top/bottom/side/rear panels, rear battens, grill frames, pole mount
spacer. Crude STEP point-cloud bboxes (m): bottom panel ~0.70 x 0.40; rear panel ~0.7 x 1.0
envelope; secondary horn horizontal baffle envelope ~1.1 m — i.e. a full-size PA cabinet
(roughly 700 mm wide class). Exact per-part dims should be taken from the STEPs in CAD, since
placement transforms inflate raw point extents.
**Ideas for v5:** two-stage (primary + secondary flare) horn parameterization; "unique parts"
naming so mirrored/repeated parts aren't duplicated; pole-mount spacer and grill frames as
standard accessory parts.
**Confidence:** MEDIUM-HIGH on identification and part roles (explicit names); LOW on the quoted
bbox numbers. Missing: drivers/XO docs (CAD only; the SynTripP plans/thread are not included).

## 17. K-402-Meh in wood.rar
Extracted with bsdtar (only two Kompas .cdw 2D drawings failed: "Parsing filters is
unsupported" — noted below). A complete **Russian woodworking build of a K-402-style MEH**
(Klipsch K-402 horn geometry class): full CAD in four parallel formats (SolidWorks SLDPRT/SLDASM,
STEP AP214, ASCII STL, Kompas 18.1 m3d/a3d), per-part 2D drawings (PDF + PNG + .cdw), and a
9-page illustrated Russian assembly manual (`Инструкция.pdf`/.docx).
**Key numbers (HIGH, from STL scan):**
- Assembled system (`Рупорноя акустическая система.stl`): **594 x 872.3 x 547.3 mm**;
  horn alone (`Рупор.stl`): 534.3 x 872.3 x 547.3 mm — i.e. an ~87 x 55 cm mouth elliptical-ish
  wooden horn, 53 cm deep.
- Woofer (`Динамик.stl`): 388 mm dia (15" frame), mounted via ring (`Кольцо`, 388 dia x 15 mm)
  and 300 x 300 x 49 mm volume-filler (`Заполнение` = "filling") behind it.
- HF driver (`ВЧ динамик.stl`): 130 mm dia x 92 mm body on a 6 mm mounting plate
  (`Крепление ВЧ`, 91 x 151 mm).
- Cabinet: 18 mm panels (side 315 x 511, half-side 364 x 511, rear 419 x 511,
  main panel 574 x 872 mm); long/short figured horn walls (`Длинная` 183 x 842 x 108,
  `Короткая` 183 x 169 x 517); stand (`Стойка` 258 x 318 x 517).
- Assembly manual method: sealant compound at every joint, M5 nuts pre-inserted into holes,
  press-fit locating pins (`Палец установочный` 8 mm dia x 25 mm) and bushings
  (`Втулка посадочная` 12 mm), self-tappers (TORX M8x60 stud-screws listed in a .txt),
  masking tape over CD opening while applying sealant.
**Ideas for v5:** publishing the same design in 4 CAD formats + per-part 2D PDF drawings is the
gold standard for a generator's output bundle; locating-pin + bushing joinery for wood;
woofer ring + volume filler as separate parts.
**Confidence:** HIGH for dims; MEDIUM for K-402 identification (from archive name).
**Not readable:** 2 of the .cdw Kompas drawings failed extraction (rar filter unsupported);
all .cdw files are Kompas-3D proprietary anyway — but every drawing also exists as PDF/PNG,
so nothing is actually lost.

## 18. Conical Horn Section.3mf
PrusaSlicer 2.7.1 project (created 2024-01-22), title "Conical Horn Section". Contains
**"Woofer Mounting Board.stl" cut into pieces with PrusaSlicer's cut-with-connectors tool**:
3 flat 15 mm-thick plates (332.3 x 74.2 mm; 261.6 x 334.2 mm; 261.6 x 337.3 mm) plus 4 printed
dowel connectors (2.5 mm dia x 6 mm, height tolerance 0.1 mm, radial tolerance 0). Thumbnail
shows flat boards with an oval slot (woofer port/tap slot). Print config: PLA, 0.6 mm nozzle,
0.30 mm layers.
**Ideas for v5:** the PrusaSlicer cut-connector convention is a concrete, proven spec for
print splitting: **2.5 x 6 mm dowels, 0.1 mm height clearance, 0 radial clearance** — v5 can
emit compatible dowel sockets directly. Also: 15 mm flat printed boards with oval tap slots as
woofer mounting plates.
**Confidence:** HIGH (all from parsed XML/metadata). Missing: the parent horn design.

---

# TOP-10 ACTIONABLE FINDINGS (ranked by value to a parametric MEH tool)

1. **ChrisBLN 12-24-MEH.scad is a working parametric MEH generator to mine** (refs/meh-6886663/):
   flat-panel math (a = sqrt((h/cos(angle/2))^2 - h^2)), 2D DXF projection export, compound-miter
   rule (jansson.us 4-sided box at half wall angle), defaults throat 50x50/mouth 70x70,
   throatheight 446.6 mm, 19 mm stock. Direct blueprint for v5's flat-pack/CNC export.
2. **Solana remote bandpass numerics complete:** module displaces 9.75 L; rear-chamber presets
   Sealed 30 L/HPF 200 Hz-2nd; Vented 30 L Fb 50 Hz port 100x240 mm/HPF 43 Hz-4th;
   Vented 25 L Fb 83 Hz port 100x63 mm/HPF 100 Hz-4th; rule: front chamber fixed, monitor
   front-port velocity as rear Fb moves. Drop-in data for the queued remote-bandpass feature.
3. **JMOD preset numerics complete:** 75x47x42 cm, 90x60 CD (H control to 320 Hz, V to 500 Hz),
   2x B&C 12NDL88 + DCX464, Fb 70/F3 55/F10 45 Hz, full tri-amp DSP chain (80/195, 370/3600 LR4-BU3,
   HF inverted +0.22 ms, all PEQs) — a ready "JMOD-class PA top" preset with a validated-driver
   substitution table.
4. **Danley tap-distance reference values** (from ChrisBLN comments): SH-50 mid taps 3.5" from CD,
   LF 10.5", reflex 14.5", mid taps 8.5 cm apart; SH-96 mid taps 13.3 cm (H) / 10.5 cm (V) —
   sanity-check constants for v5's port placement solver.
5. **Print-splitting conventions, three proven flavors:** (a) Solana quarter-split with 12
   locating pins + min-bed matrix (FDM 250x210x220 four-piece vs 376x376x150 one-piece);
   (b) 300hz-MEH mirror + z-slice bolted with M4 threaded inserts; (c) PrusaSlicer cut-connector
   dowels 2.5x6 mm, 0.1 mm h-tolerance (Conical Horn Section.3mf). v5 should emit (a) or (c).
6. **Port shape rules:** JMOD tapered bass-reflex ports with constant cross-sectional area
   entrance-to-exit + 6.35 mm roundover on woofer bandpass port inner edges; Solana asymmetric
   (narrower vertical) bandpass ports; ChrisBLN 19 mm mid ports with oversized "fulcrum"
   counterbores; 2.5" LF/reflex ports; surround cutout depth = Xmax + 5 mm.
7. **Printed sealed mid/CD rear chambers as parametric parts:** ChrisBLN closed-back cups
   (WSN041.00: 91.5→71.5 mm cone, 16.5 mm, 3 mm wall; 4FE35: 89→75.5, 18 mm) with terminal
   notch; 300hz-MEH 3-piece chamber with cable channels; xrk971 SB65 chamber 120x60x120 —
   v5 could generate these from driver basket dia + Vas-target volume.
8. **Material/printability guidance to embed in export UI:** JMOD/Solana tier list (best PC-blend/
   PPS-CF/PA6-CF; good PETG-CF/GF, PCTG; avoid PLA long-term), 25% cubic/gyroid infill for horn
   bodies, 100% for throat adapters and pins, heat-set insert spec M5 7.1 mm OD x 9.5 mm deep,
   soldering iron 350 C; "no overhangs" geometry variant (Synergy_Parametric7) as export option.
9. **Two-stage horn topology (SynTripP) + stub-horn hybrid (V6 stub):** primary printed/precision
   throat horn + secondary wooden mouth flare, with "unique parts" naming and spacer/support/
   attachment part roles — the pattern for v5's hybrid print+plywood export path.
10. **Output-bundle gold standard (K-402 wood build):** ship each generated design as
    SolidWorks-agnostic STEP + STL + per-part 2D PDF drawings + illustrated step-by-step
    assembly doc with hardware list (locating pins 8x25 mm, bushings, sealant-at-every-joint,
    pre-inserted M5 nuts); K-402-class wooden MEH reference dims 594x872x547 mm with 15" woofer
    ring + volume-filler parts.

---

## Files that could not be (fully) read
- **Kompas .cdw drawings** (k402-meh-wood): proprietary Kompas-3D 2D format; 2 of them also
  failed rar extraction ("Parsing filters is unsupported" in bsdtar). Redundant — same drawings
  exist as PDF/PNG.
- **SolidWorks .SLDPRT/.SLDASM and Kompas .m3d/.a3d** (k402-meh-wood): proprietary; equivalent
  STEP + STL copies were parsed instead.
- **`celilo v2 - sliced.123dx`**: Fusion/123D container; BREP1.smt kernel data is proprietary.
  Embedded preview PNG was extracted and described.
- **SketchUp .skp files** (Optimiert, SB-Horn V3 x6, Woofer Mounts x2): proprietary binary; the
  paired STLs were measured instead.
- **JMOD (1).pdf** is byte-identical (md5) to (3).pdf — analyzed once.
- **meh-multiple-entry-horn20241229 zip** is a re-download of Thingiverse 6886663 (md5-identical
  .scad) — analyzed once.
