# FIX LIST — reference record vs the tool (ranked, 2026-07-24)

Cross-checked against the LIVE repo this session (read-only): engine.js is
at b530 and already carries a partial vent-fork fix (nc535/Hinson
attribution in the why-texts, woofer-only DANLEY DIALECT at 31.67 cm²,
SH96 preset still commented out). Ranked by impact; each item cites the
study finding and the tool law/geometry it contradicts.

## 1. tap_laws.md law 5 provenance is WRONG and lags engine b530
- Evidence: SynergyCalc V5 full text contains ZERO occurrences of
  "velocity" (Study 4 §4, documented grep); the traceable sources are
  nc535 (diyAudio 88237 post-5153920, 339799 post-5842646 — at-max-SPL
  heuristic, "scales with SPL") and Scott Hinson MEH.pdf p.19 (reflex-port
  chuffing onset, knowingly shipped in violation).
- Tool: docs/tap_laws.md law 5 still says "(Waslo compendium)"; engine.js
  lines 741-743 already state the correction — the LAW DOC contradicts
  the LAW CODE.
- Fix: rewrite law 5's provenance + scope (velocity check is
  SPL-conditional; exceedance = SPL ceiling, per Hinson pp.19-21, not
  invalidity). Also note author = SCOTT Hinson wherever cited (no "Bill"
  exists in the repo — keep it that way).

## 2. THE VENT FORK — ruling (a) is now fully sourced at SH-50 scale; SH-96 number still missing
- Evidence: SH-50 measured record now has a PRIMARY URL (van Ommen,
  diyaudio 292379 post-4957246): reflex ports 2.5 in @ 14.5 in, woofer
  taps 2.5 in @ 10.5 in, mid taps 3/4 in @ 3.5 in; independently
  transcribed in chrisbln thing:6886663 (.scad lines 45-61, 97-104);
  Danley's own patents legislate AREA, never velocity (US6411718
  area-matching; US8284976 "relatively small"). Study 4 §V.
- Tool: engine.js ~line 1675: SH96-class preset PARKED; DANLEY DIALECT
  comment says "his tape measure wanted before this number hardens".
- Fix: the dialect's 31.67 cm² woofer number is as hard as the record
  gets — keep it. What the new evidence CANNOT supply is the SH-96 vent
  dia/count (photo proportion ~half a 12in frame is inferred only).
  Present him the ruling: unpark sh96 under the dialect with an explicit
  "SH-50-scale numbers, SH-96 unsourced" why-text, or keep parked. Do
  NOT scale-invent an SH-96 port.

## 3. Reflex vents INTO the horn are a missing element (M9 sealed-vs-reflex)
- Evidence: SH-50 runs reflex vents at 14.5 in from the CD (measured);
  chrisbln models 4× 63.5 mm at 368.3 mm (documented); JMOD runs 4
  tapered CONSTANT-AREA teardrop seam vents tight around the throat,
  Fb 70 / F3 55 / F10 45 Hz (documented); SB-Horn V3 vented LF Fb
  34.65 Hz (measured); K-402 build is the sealed pole (measured). Study 4
  §§6,7,9,11, V.2.
- Tool: v5 has driver TAPS only — no reflex-vent element; queue M9
  "sealed-vs-reflex alignment (needs M10 T/S)" open.
- Fix: add the vent as a placed element (station + area + count) with the
  sourced geometry above; alignment math waits on M10 T/S. Include the
  sourced mitigation pattern: HPF AT Fb (SB-Horn 34.6 Hz at Fb 34.65;
  Hinson 2× 30 Hz) as a stated practice row, and Hinson's accounting for
  undersized vents ("port-limited below f") as the graded consequence.

## 4. Extend the Danley dialect to MID taps
- Evidence: SH-50 mid taps 3/4 in dia (2.85 cm² computed) @ 3.5 in from
  CD, 8.5 cm apart (measured + chrisbln documented); chrisbln's own mids
  19 mm dia (= 3/4 in); CoSyne 5/8 in @ 2 in; SH-96 mid tap spacings
  13.3 cm L-R / 10.5 cm T-B (documented, secondhand). Study 4 §§2,6.
- Tool: engine.js acoustics() `danley` flag is `kind==='woof' &&
  drs[0].board` — mids always ride the velocity-derived area; build-50
  canon was 2.2 cm²/mid at CR 6:1 vs the record's 2.85 cm².
- Fix: mirror the woofer dialect for mids (2.85 cm² sourced round tap) on
  Danley-class presets; grade, don't force, the velocity number. The
  SH-96 spacings give the 3way mid-ring placement a sourced cross-check.

## 5. Gate goldens: assert sh50 preset against the tape-measured distances
- Evidence: 3.5 / 10.5 / 14.5 in from CD along the wall (measured, with
  the along-wall caveat); mid pair spacing 8.5 cm. Study 4 §2.
- Tool: gate.js asserts invariants but no external measured target for
  the sh50 bundle's station placement / derived XO.
- Fix: golden rows comparing the sh50-class preset's tap stations +
  spacing to the record within a stated tolerance (the record's own
  "not super-accurate" caveat = the tolerance rationale).

## 6. Pin #10 (round-to-square transition) — answerable with sourced numbers
- Evidence: Diyaudio Synergy adapter measured: throat Ø29.8 round, still
  a TRUE circle at Z=58.8 (Ø58.4), full 71.1 mm square by Z=76.3, mouth
  square 150.8 @ 140 mm — handoff completes between 42% and 54% of
  length. Corroborating: synergy nov 24 (Ø23.1 → 188.5 sq in 99 mm,
  round CD boss Ø88); 300hz base (round eq-Ø26.6 throat). Study 4 §13.
- Tool: pin #10 open (queue top block); 2way/3way throat morph (M5
  pin #20) unresolved.
- Fix: implement the morph with the measured window (blend round → shape
  finishing by ~half the throat-section length), cite the adapter as the
  single measured source (say so in the row).

## 7. Pin #12 (driver silhouette) + seat recess — sourced dims landed
- Evidence: LaVoce 12in: bolt circle 298 mm ×6 M6, basket 315, membrane
  285/242, surround relief depth = Xmax + 5 mm (default 15) — a SOURCED
  FORMULA for recess depth; mid basket 104 sq / membrane 93.5; Beyma
  SM115/N frame Ø379-388, depth 158.2, 8×Ø6 on Ø370; HF204 exit Ø50.8;
  K-402 ring Ø388/Ø370/Ø355×15. Study 4 §§6,9.
- Tool: pin #12 open; silhouettes are parametric od-relative guesses;
  no recess-depth law.
- Fix: feed the measured dims into the silhouette ratios for those driver
  classes and adopt "recess depth = xmax + 5 mm" as the sourced seat
  relief (chrisbln, documented).

## 8. Saucer DEPTH datum — replace the 38° rim formula with the Martin rule
- Evidence: US10506331 (documented): dish inner slope = TANGENT
  CONTINUATION of the cone at the rim (β ≥ α), static waveguide reaches
  the surround, clearance 0.3-5 cm (prefer 0.5-3 cm) held at maximal
  displacement (≥ xmax). Study 4 §3.
- Tool: queue: "removable saucer DEPTH datum (La still rides the 38deg
  rim formula - shallow-saucer ruling wanted)".
- Fix: La from tangent-match to the driver's cone angle (datasheet dims)
  + gap clamped to the sourced [0.5, 3] cm preferred band and ≥ xmax.
  No invention needed; this closes the shallow-saucer question.

## 9. tap_laws.md law 4 needs the topology-class caveat
- Evidence: Hinson (2-way, measured): mid taps in corners, inert to the
  CD. SH-96 interior photo + printed_mounts_spec: at 3-way scale the
  CORNERS carry the WOOFERS and SIX mids ring the snout; "taps tight
  around the snout" confirmed across ≥5 independent designs. Study 4
  §§1,14.
- Tool: law 4 states corner mid taps unqualified; M7 chamfer dialect
  already moves woofers to corners — doc and dialect disagree on paper.
- Fix: law 4 gains the class split (2way: corner mids; 3way
  Danley-class: mids ring the throat, woofers own the corners).

## 10. Missing law row: tap pressure vs cone strength (cone tearing)
- Evidence: Hinson pp.13-14 (documented): shrinking the tap raises
  under-cone LF pressure and CAN TEAR CONES; commercial fix = more mids
  (6); Cask05 CR ≤10:1 rule of thumb + van Ommen's >10:1 "cracking
  noise" anecdote. Study 4 §§1,2.
- Tool: velocity/area laws bound this only indirectly; no explicit row.
- Fix: informational row on mid CR > ~8-10:1 territory citing Hinson +
  the 10:1 heuristic (graded warn only — no measured threshold exists).

## Closed by this session's verification (no action)
- XO factor: engine.js line 520 uses XOK = 1/1.2 — study _3's "0.95 vs
  1/1.2" discrepancy watch is resolved (0.95 was the build-46 record).
- US5526456 attribution: repo already says Heinz — correct.
- "Bill Hinson": absent from the repo; only task briefs carry it.

## Lower-priority sourced adds (unranked)
- Thin-wall Lpt numeric shape (US8284976: 3/4 → 1/16 in, ports 8 → 4,
  dia 3/4 → 5/8 in) for law 9's frustum note.
- Print-wall presets from the measured record (3-7 mm printed shells:
  DH350 3.0-3.7, SB-Horn 5.00, Pavdan 6; wood 15-21) for wallT/Lpt.
- No-tap cone-exposed woofer topology observed in a serious build —
  flag as unrepresentable (note, not a feature request).
- Auto-split exporter spec additions: Pavdan halves NOT mirror copies
  (verify-dedup, never assume); DH350 adapter-extraction tier already in
  study _3 §6.

## Pins the new material can now answer with sourced numbers
- #10 round-to-square: YES — item 6 (measured window 42-54% of length,
  single-source caveat).
- #12 driver silhouette: YES — item 7 (LaVoce/Beyma/Faital measured
  dims + the xmax+5 mm recess formula).
- Saucer depth datum: YES — item 8 (Martin tangent rule + sourced
  clearance band; no 38° constant needed).
