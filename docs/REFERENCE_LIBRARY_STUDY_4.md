# REFERENCE LIBRARY STUDY 4 — synthesis batch (2026-07-24)

Synthesis of: distill passes over REFERENCE_LIBRARY_STUDY.md / _2 / _3 +
tap_laws.md + synergy_calc_extraction.md, and 7 fresh mining agents
(chrisbln .scad, Scott Hinson MEH.pdf full 44-page read, JMOD manual Rev
2.02 full 24-page read, web/patent/spec-sheet crawl, STL probing of 15
parts across 8 archives, the Archive-4 photo corpus incl. a Danley SH-96
interior shot, and the K-402 wood RAR full extraction).

DOCTRINE: measured canon only. Every number below carries its source and a
confidence tag — `documented` (stated in a source), `measured` (extracted
from geometry/plots by tooling), `inferred`/`computed` (derived; the
derivation is stated). Units are the source's units.

Tool-state cross-check done against the live repo (read-only):
- `v5/engine.js` is at b530: it ALREADY carries the nc535/Hinson
  attribution correction and a woofer-only DANLEY DIALECT (31.67 cm² per
  corner tap, "his tape measure wanted before this number hardens").
- `docs/tap_laws.md` law 5 still says "Waslo compendium" — the doc lags
  the engine's b530 correction (see FIX_LIST #1).
- engine.js line 520: `XOK=1/1.2` — the BUILD-46 "0.95·c/(4d)" record is
  historical; the discrepancy watch from study _3 is CLOSED (measured, this
  session's grep).
- No file in the repo says "Bill Hinson" (grep, this session). The wrong
  first name lives only in task briefs; the paper's author is SCOTT Hinson
  (MEH.pdf p.1, Copyright 2022 — documented). Do not propagate "Bill".

---

## 1. Scott Hinson — "Multiple Entry Horns" (MEH.pdf, ©2022, 44 pages)

Identity: author is Scott Hinson; 44 pages (not 28) (p.1 + PDFKit page
count — documented). Build: B&C DCX464 + 2× B&C 10NW76, 12/18 mm baltic
birch (documented).

THE 17 m/s, exact context (documented, p.19 — the figure appears ONCE in
the whole paper): "If you limit the port airspeed to 17 m/s (onset of
audible chuffing) and the input power to the AES limits of the woofer you
can determine the approximate maximum output for each enclosure" — a
BASTA! *prediction criterion for max chuff-free SPL* applied to
rear-chamber BASS-REFLEX ports (2× 3in/75 mm dia × 7.25 in long, ~45 L),
not a design law, not a tap law, not a corner-vent law.

Hinson then SHIPS a violation (documented, pp.19-21, Fig 12): the 2×3in
ports "are clearly overpowered by the woofers. Maximum output level is
limited by the port from 70 Hz on down. The catch is....nothing bigger
would fit" (4in port needs ~13 in length, 6in port 31 in; right-angle
elbow costs 3-6 dB; flares/passive radiators didn't fit). Consequence is
booked as an SPL ceiling below ~70 Hz, mitigated by 2× 30 Hz 2nd-order
Q0.707 HPFs (p.25 fn.9 — documented). Port physics framing (p.19): at Fb
cone motion is minimal, so it's a power problem; modern woofers overpower
"almost any port you can design."

Tap-chamber canon (documented, pp.10-14): V1 rear cup / V2 under-cone /
V3 tap hole through the 12-18 mm wall; throat-reflection λ/4 notch sets
the mid HF limit; taps within λ/4 of each other; mid taps in CORNERS
(measured: taped-over vs open ≈ no tweeter-response change); woofer taps
as racetrack slots "more area for air velocity without intruding into the
horn"; too-small taps CAN TEAR CONES — commercial fix is more mids (6)
(documented, pp.13-14). DCX464: MF usable from 300 Hz, ~111 dB/2.83 V;
6R series / 1R shunt per coil ≈ 18 dB pad; 1-2 Ω shunt stabilizes the
acoustically-coupled diaphragms (measured, Figs 23/24).

GAP: the exact Hornresp tap/chamber numerics live in screenshot Figs
14-15 (pp.23-24) — not text-extractable; needs poppler or a visual read
(open question). Woofer LP extracted as "63" Hz vs mid HP 310 — possibly
a mangled "630"; verify before canonizing.

## 2. The measured Danley record (diyAudio, primary trace)

John van Ommen (a.k.a. Patrick Bateman), tape measure on a REAL SH-50
(measured; method caveat: along-wall tape, "not super-accurate",
post-5317653):
- Mid taps 3/4 in dia, 3.5 in from throat.
- Woofer taps 2.5 in dia, 10.5 in from throat.
- Woofer (reflex) ports 2.5 in dia, 14.5 in from throat.
  Source: diyaudio.com/community/threads/small-syns.292379/post-4957246.
- One 2.5 in round = 31.67 cm² (computed) — matches the tool's ~32 cm².
- One 3/4 in round = 2.85 cm² (computed).
- Waslo CoSyne mid taps 5/8 in dia @ 2 in from throat (measured, same
  measurer, post-5694329).
- SH-50 mid CR: 324 cm² Sd / 79 cm² horn section at tap = 4.1:1
  (inferred — his math assumes 4in cones; the official sheet says 4×5in,
  conflict unresolved). Anecdote: an 8NDL51 FLH at >10:1 made "a cracking
  noise" above ~10 W (inferred, post-5315134).
- Cask05 rule of thumb: CR ≤ 10:1 (inferred, post-5117112).

Origin of 17 m/s in the MEH community — diyAudio user nc535 (inferred,
posts 5153920 / 5842646): "check that the peak particle velocity is under
17 m/s... at the maximum anticipated SPL... port size required to meet
these conditions scales with SPL. At home levels you can get by with
significantly smaller ports" (+ companion condition: acoustic-power loss
< 0.5 dB). Explicitly an at-rated-SPL check with an SPL-scaling escape
hatch, NOT a geometric invariant. His vent trick: a vented rear chamber
REDUCES required throat-port area (lowest ~half octave exits the vent).
17/343 = 4.96% of c (computed) — the classic ~5%-of-c chuffing rule,
consistent with Hinson's parenthetical.

Corner practice corroboration: SH-50/46 clone builder from disassembly
photos — taps "placed in the corners of the horn" (inferred,
post-7154602); mark100 on the outer shell existing to give "the rear
volume needed for the bass-reflex ports to work" (inferred, post-6964285).

## 3. Patents

- US 6,411,718 (Danley/Skuran Unity — documented): port sizing is AREA
  MATCHING — holes "the sum of which are equal to the horn area so as to
  match the horn's impedance at the introduction point"; taps AT λ/4 of
  the crossover on purpose (90° electrical + 90° air = in-phase sum);
  HF throat 0.78 in², lower entry at 10 in² (worked example); conic
  doubles area every 2.4 in for a 300 Hz flare. NO velocity criterion.
- US 8,284,976 (Danley — documented): ports "relatively small (in
  cross-sectional area) to avoid acoustic discontinuities"; port length =
  local wall thickness; thin-wall move: Lpt 3/4 in → 1/16 in let mid port
  count drop 8 → 4 and dia 3/4 → 5/8 in; entry ≤ 1λ circumference; mouth
  ≈ 1λ circumference at cutoff; path ≥ λ/4 (λ/2 substantial). NO velocity
  criterion.
- US 5,526,456 is HEINZ / Renkus-Heinz (CoEntrant), not Danley
  (documented) — repo already attributes it correctly ("Heinz") in
  tap_laws.md corpus line; keep it that way. HF passage 3.4 in × ~1 in;
  passage width < shortest λ; passages open at the horn's own angle
  (backs the 45° tap frustum).
- US 10,506,331 (Martin Audio — documented): static-to-moving waveguide
  clearance 0.3-5 cm, "more preferably 0.5-3 cm", held AT MAXIMAL
  displacement (≥ xmax by construction); dish/static waveguide = TANGENT
  CONTINUATION of the cone at the rim (β ≥ α), reaching to the surround.

## 4. Bill Waslo — SynergyCalc V5 (libinst.com PDF, 2014, 19 pp)

grep of the full extracted text: ZERO occurrences of "velocity"
(documented). Port sizing there is empirical Hornresp iteration (Ap1/Lpt);
frustum-beveled ports have effective Lpt "maybe half" the board; mid taps
on corners of an imaginary square within λ/4 (3.4 in @ 1 kHz, 1.7 in @
2 kHz). CONSEQUENCE: tap_laws.md law 5's "(Waslo compendium)" attribution
for the 17 m/s cap is unsupported by the Waslo source itself.

## 5. Danley official spec sheets (documented; no port data anywhere)

- SH50 (Rev 202209301629): 2×12 LF + 4×5 MF + 1×1 HF, 50×50, 50 Hz-18 kHz
  ±3 dB, 100 dB 2.83V/1m, 127/133 dB, 28×28×25.5 in, 133 lbs.
- SH96HO (Rev 1 220304): 4×15 LF + 6×4 MF + 1×1.4-exit HF, 90×60,
  45 Hz-13.5 kHz -3 dB, 105 dB, 133/139 dB, 26.5×45×25 in, 265 lbs,
  LF 2800 W cont. NO interior/vent dims exist in any located public source.

## 6. chrisbln — Thingiverse thing:6886663 (12-24-MEH.scad, CC BY-NC)

Full .scad mined (measured from source text unless noted). 50×50 throat
section 446.6 mm long, throat opening 25.4 mm ("1in hole for a 1.4in
driver, file it round"), 70×70 mouth flare 78.5 mm, 19 mm stock
everywhere; computed envelope: mouth ~551.8 mm sq, depth 525.1 mm
(inferred from the file's own formulas). Compound miter via
jansson.us (-10.3° butted joint for 50° throat).

Ports (measured, lines 91-104): mid taps 19 mm dia (≈ the SH-50's 3/4 in
= 19.05 mm — independent corroboration), pair span 93(+6) mm, at
-3.5×25.4 mm from the HF; "Mid-fulcrum" counterbores 38 mm dia × ~9 mm on
the driver side. LF taps 2.5×25.4 = 63.5 mm dia at -10.5×25.4 = -266.7 mm
(pair span widened by the author to 9.6×25.4 vs "default: 4*25.4").
REFLEX vents into the horn: 63.5 mm dia ×4 (2 per vertical wall) at
-14.5×25.4 = -368.3 mm. The in-file comment block sources the three
distances from a real-SH-50 measurement ("from CD to center of porthole
... see tonefarm A jpg / Patrick Bateman - KUTuliP.png") — i.e. the same
van Ommen record, independently transcribed (documented). Also in
comments: SH-50 mid taps 8.5 cm apart L-R and T-B; "SH96, 60x90degree
horn, midrange taps are 13.3cm apart LEFT to RIGHT, 10.5 cm apart TOP to
BOTTOM" (documented, secondhand).

Drivers: LaVoce DN14.40T/DN14.300T HF, 4× WSN041.00 mids in printed
sealed cups (91.5→71.5 mm ID × 16.5 mm, 3 mm walls, ~0.087 L computed),
2× WAN123.01/WAF123.01 12in. 12in mount dims (measured): bolt circle
298 mm ×6 M6, basket 315, membrane 285/242, surround relief 15 mm deep =
"driver's Xmax +5mm" (documented formula). XO ~400-500 Hz and
~1000-1300 Hz. SH-50-base.dxf at 3.5×: panel 702.5 mm front / 639.8 deep /
152.6 back, 25.0°/side (measured from entities). cabinet50() flagged
"bugs!!!" by the author.

## 7. JMOD (John White / JW Sound, manual Rev 2.02, 2026-02-05, 24 pp)

Cabinet 75×47×42 cm, 34 kg, 90×60, 80-18,500 Hz, pattern control 320 Hz
H / 500 Hz V; Fb 70 / F3 55 / F10 45 Hz (documented). 2×12 (12NDL88
class) + DCX464 coax; full tri-amp DSP + limiter voltages recovered from
the image table (documented; HF PEQ2 Q is a typo in the manual itself).

Vent-fork relevant (see §V): bass-reflex vents = 4 tapered teardrop slots
through the 18 mm flares, CONSTANT cross-sectional area entrance-to-exit,
exiting in an X at the diagonal seams immediately around the throat
(front-view drawing p.3 — inferred interpretation; the taper/constant-area
statement is documented p.2). Woofer bandpass ports: 2 teardrop slots per
12in inside a milled cone recess, 1/4 in inside roundover (documented,
p.12). NEGATIVES (documented, whole-manual search): no numeric port dims,
no rear-chamber volume, no velocity figure anywhere — numbers live only in
the CAD downloads (.f3d/.STEP/.dwg). Deployment: cross to kicks ≤200 Hz,
bassbins ~160 Hz; pole mount 245 mm from front lip.

## 8. Solana (John White, Rev 1.03, 2025-06-01)

Drop-in printed MEH coax module: B&C DH450 + 4× 6NDL38; displaces 9.75 L.
Rear-chamber alignments (documented): Sealed 30 L (HPF ≥200 Hz, 123 dB);
Vented Low 30 L / Fb 50 Hz / port 100 mm dia × 240 mm (HPF 43 Hz 4th,
110 dB); Vented High 25 L / Fb 83 Hz / port 100×63 mm (HPF 100 Hz 4th,
122 dB). Velocity practice (documented): front chamber FIXED; "watch
front-chamber air velocity while simulating" — a monitoring rule, no
numeric ceiling. Assembly canon: quarter-split + 12 pins, captive M5s,
heat-set inserts, gasket DXF.

## 9. K-402-class wood build (Russian KOMPAS package, measured from STEP/STL/drawings)

Horn mouth 872.3 × 547.2 mm, depth 535 (ref) / box 872.3×547.2×593.6 mm,
48 kg (documented, GOST sheets). Drivers: 2× Beyma SM115/N 15in on
opposing 45° rear faces + FaitalPRO HF204 2in-exit at apex (Ø50.8 throat
hole) (documented BOM + web ID). THE PORT NUMBERS (measured): each 15in
fires over a Ø300×49.3 mm cone-fill plug through 2 kidney entries
(86.97 cm² each, STL silhouette) and exits into the horn through 2
stadium slots 99.8 × 46.2 mm (R23.1 ends) = 41.4 cm² each, cut through a
2-mm-milled region of 15 mm ply immediately around the throat. Totals:
82.9 cm²/woofer exit, 165.7 cm²/system; entry (173.9 cm²) > exit, so the
stadium slots are the choke. Rear chamber SEALED — no reflex vents
anywhere (measured, all panels probed). Slot locating dims: pairs
163.8±0.5 / 383.9±0.5 mm apart, verticals 142.4 / 204.7 (documented,
assembly sheet). Wall/joinery canon: 15/18 mm ply, sealant at every
joint, press-fit pins Ø8×25, M5 pre-inserted nuts.

## 10. Cemetery Sounds 300hz MEH (Printables, CC BY-SA, PDF + STL probe)

2× B&C 4NDF34 4in mids + LaVoce DF10.172K; mid band LR4 400-1600 Hz;
delays 1.78/1.7 ms (documented). Probe (measured): horn-base
240.0×161.8×140.0 mm; round throat eq-Ø26.6 (area 554.9 mm²); FOUR mid
tap slots 3.2×6.5 mm (~21 mm² each) centered 4-10 mm downstream of the
throat plane; assembled depth 350 mm, inferred mouth ~630×360. Mid rear
chambers = printed ring segments hot-glue-sealed against the driver
(documented) — sealed, unmeasurable as-printed.

## 11. SB-Horn V3 (German VituixCAD user "chris"; plots measured)

VENTED LF chamber PROOF: DATS impedance saddle cursor 34.65 Hz /
9.939 Ω — bass-reflex tuning at 34.65 Hz (measured). DSP26: LF band
34.6-325 Hz BW24 — the HPF sits AT Fb (the sourced "HPF at tuning"
port-protection pattern); HF HPF 630 Hz 24 dB/oct, ZERO delay, HF
polarity inverted; acoustic XO 443 Hz (VituixCAD annotation); REW
inverted-sum null ~460 Hz confirms alignment (measured). Geometry: 5.00 mm
uniform printed walls; wood LF chamber 486×360.6×306.9, 15.00 mm walls;
sealed Peerless oval mid cup (measured). Mold shows kidney slots at
opposite ENDS of the driver oval — cone-edge injection (inferred).

## 12. Unity Horn 150hz+ (liam056, thing:4927888, CC BY-NC)

97 bolted prints (~40 files, mirror dedup), ~654×403 mm mouth class,
150 Hz+; 4× Faital 3FE25 + 4× 6FE200 + P Audio BM-D740; M3×68 + M5×122
nuts, silicone + tape sealing, backer brackets (documented). Four
racetrack mid ports near the throat (photos only — inferred); the
port-carrying STLs live in the missing part 2 (open).

## 13. Small measured horns (STL probe canon)

- Diyaudio Synergy adapter: round Ø29.8 throat → square 150.8 mm over
  140 mm; circle still exact at Z=58.8 (Ø58.4), full square by Z=76.3 —
  the round-to-square handoff completes between 42% and 54% of the length
  (measured; the % is computed from the measured Z stations). KEY for
  pin #10.
- synergy horn nov 24: round Ø23.1 throat (CD boss ~Ø88) → 188.5 mm
  square mouth in 99 mm, ~27° walls, 2 diagonal ~300 mm² taps at 69%
  depth (measured).
- DH350 MEH: symmetry-half 180×160×159.8, 3.0-3.7 mm walls; driver
  interface EXTRACTED as a 10 mm annular adapter, bore r=12.7 mm =
  exactly 1 in (measured) — the split-canon exception.
- Pavdan box halves: assembled 252.4×361.9×200.6, walls 13.9-19.75
  (p50 19.00), NOT mirror copies (~10% flip-hit), Ø80 terminal recess
  (measured).
- celilo v2: 193.9×193.8×168, 2 diagonal conical taps 88→321 mm², one
  unverified 9.2×95.5 mm slot (~8.8 cm² IF a port — largest DIY
  port-candidate probed, still ~3.6× under one SH-50 vent) (measured).
- Metlako III: teardrop port scoops flanking the throat — shape only;
  numbers locked in unparseable Fusion BREP (inferred).
- Wall-thickness canon across the record: printed shells 3-7 mm, wood
  15-21 mm (measured, many parts).

## 14. Photo corpus (Archive 4) — placement/shape canon

- Danley SH-96 interior (rear cover off, inferred from photo): 4 woofers
  in X-braced triangular CORNER chambers; CD + EIGHT small mids clustered
  tight around it at the apex; each side wall has ONE round opening
  visually ~half the 12in-frame diameter (≈5-6 in class, PROPORTION read
  from image — NOT a measurement). Class caveat confirmed: at SH-96 scale
  the corners carry WOOFERS, mids ring the snout.
- "Taps tight around the snout" confirmed across ≥5 independent designs
  (installed oval MEH with 6 slots around the CD, oak horn 4 wedge slots,
  Cosyne-style CAD petal clusters, molded home horn radial slots, printed
  4-funnel snout) (inferred).
- "Funnel base = driver flange" confirmed (printed 4-funnel snout; Fusion
  Unity CAD circular flange lands) (inferred).
- Tap shape canon: slots/kidney/racetrack/wedge dominate in advanced
  builds, often offset to the throat side or at the cone edge, chamfered
  entries, O-ring lands; round offset ports are the secondary DIY
  pattern (inferred, cross-image synthesis).
- CONTRADICTION on file: one serious build front-mounts 4 JBL woofers
  cones-exposed into the horn — a no-tap topology v5 cannot express
  (inferred).

---

## V. VENT FORK EVIDENCE (the dedicated section)

The fork as posed: v5's 17 m/s port-velocity law (attributed to the
Hinson paper) makes Danley-size corner LF vents impossible at SH96 scale,
yet the measured record says SH-50 LF vents are 2.5 in round (~32 cm²).

### V.1 What the 17 m/s actually is (all sourced)
1. Hinson MEH.pdf p.19 (documented): 17 m/s = "onset of audible
   chuffing", used once, as a BASTA! max-output prediction input for
   rear-chamber BASS-REFLEX ports — and Hinson knowingly shipped ports
   that exceed it, booking the cost as port-limited max SPL below 70 Hz
   (pp.19-21). It is not stated as a design law, and the paper says
   NOTHING about Danley corner vents.
2. nc535, diyAudio (inferred, posts 5153920/5842646): the MEH-community
   origin — peak particle velocity < 17 m/s AT MAXIMUM ANTICIPATED SPL,
   "scales with SPL... at home levels you can get by with significantly
   smaller ports".
3. Waslo SynergyCalc V5 (documented): zero velocity content — the
   "Waslo compendium" attribution in tap_laws.md law 5 is unsupported.
4. 17 m/s = 4.96% of c (computed) — the generic ~5%-of-c reflex chuffing
   heuristic.

### V.2 What Danley actually does (all sourced)
5. MEASURED SH-50 record (van Ommen tape measure, post-4957246): reflex
   ports 2.5 in dia @ 14.5 in; woofer taps 2.5 in @ 10.5 in; mid taps
   3/4 in @ 3.5 in. One 2.5 in = 31.67 cm² (computed). Independently
   transcribed into chrisbln's .scad as the working default (documented).
6. Danley's own documented sizing laws are AREA-based: US6411718 area
   matching at the entry; US8284976 "relatively small... to avoid
   acoustic discontinuities", thin-wall Lpt. NO velocity criterion in
   either patent (documented).
7. SH-96 interior photo: single round side-wall opening per side,
   ~half a 12in frame across (≈5-6 in class — inferred proportion, NOT a
   number to canonize). No public source gives SH-96 vent dims (open).
8. JMOD (documented p.2 + inferred p.3): 4 tapered constant-area teardrop
   reflex vents at the diagonal seams tight around the throat, Fb 70 Hz,
   no velocity figure in 24 pages — a practicing designer running
   throat-adjacent seam vents with no velocity law.
9. K-402 wood build (measured): 165.7 cm² total tap area for 2×15in
   through 4 throat-adjacent stadium slots; SEALED rear chamber (no
   reflex vents at all) — the sealed-chamber pole of the practice.
10. SB-Horn V3 (measured): vented LF chamber Fb 34.65 Hz protected by an
    HPF AT Fb (34.6 Hz BW24) — the DSP-side mitigation pattern; Hinson's
    2× 30 Hz HPF is the same move (documented).

### V.3 What ruling is possible WITHOUT inventing numbers
- The 17 m/s figure survives ONLY as: (a) a reflex-port chuffing-onset
  heuristic evaluated at a stated drive level (nc535: max anticipated
  SPL; Hinson: AES power), with the documented consequence of exceeding
  it being an SPL ceiling in the bottom octaves — NOT geometric
  invalidity; and (b) explicitly NOT a Danley law — Danley's documented
  laws are area-matching and small-discontinuity, and Danley's measured
  hardware runs 2.5 in vents on a 127 dB-cont box.
- A SOURCED Danley-dialect exception EXISTS and has a numeric shape at
  SH-50 scale: LF corner taps AND reflex vents = 2.5 in round
  (31.67 cm² computed each), placed 10.5 in (taps) / 14.5 in (reflex)
  from the CD along the wall; mid taps 3/4 in @ 3.5 in, 8.5 cm apart.
  Confidence: measured (tape, along-wall) + documented (chrisbln
  transcription). Engine b530 already ships the woofer-tap half of this.
- What CANNOT be ruled without inventing: the SH-96 vent diameter/count
  (photo proportion only; no public dims — his tape measure or a
  teardown source required), the SH-50 vent COUNT per box (van Ommen
  gives dia+position, not count; chrisbln's 4 is his modeling choice),
  and any frequency-dependent velocity schedule (no source states one).
- Consistent tool posture the evidence supports: keep the velocity row
  as an INFORMATIONAL/graded check at a stated SPL (with the nc535
  scaling caveat in the why-text), let the Danley dialect carry the
  sourced 31.67 cm² numbers at SH-50 class, book exceedance as
  "port-limited below f" (Hinson's own accounting), and refuse loudly on
  SH-96 numbers until a measured source lands.

---

## Open questions (carried forward, deduped)
1. SH-50 vent/tap COUNT per box; whether reflex vents sit in corners or
   on flats (corner placement is sourced for TAPS, not the reflex vents).
2. SH-96/SH96HO vent dimensions — no public source; needs teardown or
   his tape measure.
3. Hinson Figs 14-15 (pp.23-24) Hornresp numerics — screenshot-only;
   render the pages (poppler) and transcribe. Also verify the "63 vs 630"
   woofer LP.
4. JMOD exact port dims + rear-chamber volume — in the CAD downloads
   only (.f3d/.STEP/.dwg).
5. Metlako III port scoops — open the .123dx in Fusion, export STEP.
6. liam056 part 2 of 2 (the port-carrying STLs) — missing from Downloads.
7. SH-50 mid driver size conflict: official 4×5in vs van Ommen's 4in-cone
   CR math (4.1:1) — adjudicate before canonizing mid CR.
8. tonefarm A jpg / "Patrick Bateman - KUTuliP.png" — the photo sources
   behind chrisbln's transcription; locating them would double-source the
   3.5/10.5/14.5 in distances.
9. Tom Danley's own diyAudio/PSW post history on port sizing — a
   first-party statement was not located this session.
