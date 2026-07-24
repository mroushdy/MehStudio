# KNOWN BUILDS AUDIT — synthesis of 14 preset verdicts

Date: 2026-07-24. Doctrine: measured canon only — a number matches only if a source states it; plausibility is never a match. Every "found" value below carries its URL or doc+page as reported by the per-preset auditors.

Verdict tally: **1 REAL_MATCHED** (fhx6) · **7 REAL_MISMATCHED** (refd, fhx12, fhx15, jmod, angular2, sh96, sh50) · **6 NOT_A_REAL_BUILD** (canon9060, compact, square, tall, classic3, angular3).

---

## 1. Verdict overview

| # | preset | verdict | referent | action |
|---|--------|---------|----------|--------|
| 1 | fhx6 | REAL_MATCHED | B&C 6FHX51 (datasheet in Downloads + bcspeakers.com) | **KEEP** — annotate xm derivation + vtc "estimated" |
| 2 | refd | REAL_MISMATCHED | Reference D mini + BMS 5CN140 (official datasheet found online) | **RE-BAKE** od/dp/sd + add published floors; rename (drop "floors unverified", name 5CN140); remove carried-over hfExit |
| 3 | fhx12 | REAL_MISMATCHED | B&C 12FHX76 | **RE-BAKE** coverage 60×40 (or strip the 90×60 claim from the name, loud warn) |
| 4 | fhx15 | REAL_MISMATCHED | B&C 15FHX76 | **RE-BAKE** covV 40; rename 60°×40° |
| 5 | jmod | REAL_MISMATCHED | JMOD (JW Sound manual) + B&C 12NDL76 | **RE-BAKE** W12 xm 7 / dp 14.1; optional 12NDL88 shell entry (manual's standard driver) |
| 6 | canon9060 | NOT_A_REAL_BUILD | none (honest "house canon" name) | **KEEP name honestly** OR re-anchor to CoSyne (3-way); fix w65 fiction either way |
| 7 | compact | NOT_A_REAL_BUILD | none (closest: Waslo CoSyne, but 3-way, 6″ woofers) | **REPLACE** referent (CoSyne-class) or keep archetype with a real named 5.25″ driver (Dayton DC130A-8); w5 xm 4.5 is fiction |
| 8 | square | NOT_A_REAL_BUILD | none (closest: Thijs666 diyaudio 259174, 2×8FE200) | **REPLACE** with Thijs666 referent OR rename "(archetype — no real build)" + re-anchor W8 to B&C 8NDL51 |
| 9 | tall | NOT_A_REAL_BUILD | none (coverage-mirror of `compact`) | **REPLACE** with SynTripP (diyaudio 264485) OR relabel "(archetype — no known real build)" |
| 10 | angular2 | REAL_MISMATCHED | CoSyne geometry, wrong drivers | **RE-BAKE**: drop "(Waslo)" from the 2way slot; add ONE true CoSyne 3-way preset (see §2.10) |
| 11 | sh96 | REAL_MISMATCHED | Danley SH-96/SH96HO | **RE-BAKE** mids m3→m4; mouth honesty amendment (58 in vs real 45×26.5 front); keep declared stand-ins |
| 12 | sh50 | REAL_MISMATCHED | Danley SH-50 name on a chrisbln-flare hybrid | **RE-BAKE** to true SH50-class (50×50, 2×12) or rename to chrisbln thing:6886663; fix hpl10 row everywhere |
| 13 | classic3 | NOT_A_REAL_BUILD | none (10HPL64 numbers half-wrong) | **FIX W10 row**; replace referent with kipman725 (diyaudio 367253) or aragorus (309213), else rename archetype |
| 14 | angular3 | NOT_A_REAL_BUILD | none (same 70×70 / 4×10 hybrid as sh50) | **FIX W10 row**; migrate the SH50-class label HERE re-baked to 50×50/2×12 (real SH-50 is angular birch), or anchor to chrisbln |

---

## 2. Per-preset detail

Judgment key: ✅ match · ❌ mismatch (source contradicts baked) · ⚠️ unsourced (no source states it) · — design choice (no referent claim).

### 2.1 fhx6 — "B&C 6FHX51 · 70°×70°" — REAL_MATCHED

| field | baked | found | source | judgment |
|---|---|---|---|---|
| odW | 18.7 | 187 mm | 6FHX51 datasheet p.2 (/Users/marwanroushdy/Downloads/6FHX51.pdf; bcspeakers.com) | ✅ |
| dpW | 12.2 | 122 mm | same p.2 | ✅ |
| sdW | 132 | 132 cm² | same p.2 | ✅ |
| hfExit | 20.1 | 20.1 mm | same p.1 | ✅ |
| recXO | 2500 | 2.5 kHz | same p.2 | ✅ |
| covH×covV | 70×70 | 70° nominal conical | same p.1+p.2 | ✅ |
| xmW | 3.5 | not stated; (13−6)/2 = 3.5 derived from stated winding/gap; Xvar 5.7 stated | same p.2; usspeaker.com conflicts (5.0) | ⚠️ derived |
| vtcW | 35 | not published | — | ⚠️ tool estimate |
| mouthW | 17 | rule 2.35×7.36 in = 17.3 | queue.md 1WAY UX | — |

**Action: KEEP.** Bind xm 3.5 to its derivation comment ((winding 13 − gap 6)/2); if the field feeds excursion clearance, the manufacturer-stated figure is Xvar 5.7. Do not adopt usspeaker's 5.0. vtc stays flagged estimated. Optional: mouth 17 → 17.3 or note rounding.

### 2.2 refd — "Reference D mini" — REAL_MISMATCHED

| field | baked | found | source | judgment |
|---|---|---|---|---|
| odW/odC | 14.8 | 13.5 (135×135 mm sq; Ø151 corner, Ø139 BC, 117 cutout) | BMS 5CN140 datasheet (bmsspeakers.com/fileadmin/…/bms_5cn140_2011-04…pdf) | ❌ |
| dpW/dpC | 8 | 8.2 (82 mm) | same | ❌ |
| sdW/sdC | 75 | 74 (0.0074 m²) | same | ❌ |
| xmW | 3.5 | ±3.5 mm stated (= (12−5)/2) | same | ✅ |
| recXO / cdFloor | 0 / 0, name "floors unverified" | Recommended XO 1900 Hz; HF range 1500–30000 Hz — **the floors ARE published** | same, HF table | ❌ |
| hfExit | 20.1 (engine.js:1707) | none published — value is the B&C 6FHX51's, carried over | datasheet absent | ⚠️ contaminated |
| vtcW | 30 | not stated | shell.html:190 "Vtc still estimated" | ⚠️ |
| covH×covV 70×70, mouthW 14, taps 4 | — | Reference D repo canon (printed_mounts_spec.md 68–113) | repo | ✅ |

**Action: RE-BAKE** CXPRE.cx5 + KNOWN BUILD: od 13.5, dp 8.2, sd 74, recXO 1900, HF floor 1500. Rename to name the 5CN140 and drop "floors unverified". Remove hfExit 20.1 (leave to Marwan's queued 3 measurements, queue.md 76–77). Keep 70×70 / 14 in / 4 taps (repo canon); if od re-bakes to 13.5 the auto-mouth law gives 12.5 in — keep the pinned 14 and let the law row report the delta.

### 2.3 fhx12 — "B&C 12FHX76 · 90°×60°" — REAL_MISMATCHED

| field | baked | found | source | judgment |
|---|---|---|---|---|
| odW / dpW / sdW | 31.5 / 16.9 / 522 | 315 mm / 169 mm / 522 cm² | 12FHX76.pdf p.2 (/Users/marwanroushdy/Downloads/) | ✅ |
| hfExit / recXO | 33 / 1200 | 33 mm (1.3″) / 1.2 kHz | same p.1/p.2 | ✅ |
| xmW | 4.25 | (16.5−8)/2 = 4.25 from stated coil rows; stated Xvar 4 | same p.2 | ✅ derived |
| **covH** | **90** | **60** ("60°×40° nominal"; fixed metal flare stays in path per queue.md FHX ruling) | 12FHX76.pdf p.1+p.2; queue.md | ❌ |
| **covV** | **60** | **40** | same | ❌ |
| vtcW | 150 | not stated | — | ⚠️ |
| mouthW | 30 | rule gives 29.1 | queue.md | — |
| sibling hcx12 dpW | 16.9 | **168 mm** (12HCX76; same family, NOT identical: flange 14 vs 13, cutout 283 vs 284, Xvar 6 vs 4) | 12HCX76.pdf p.2+p.7 | ❌ |

**Action: RE-BAKE** covH 60 / covV 40 and rename "…60°×40°", OR strip the numbers from the name and surface 90×60 as an explicit UNSOURCED design target with a loud warn row. Sibling: **hcx12 dp 16.9 → 16.8**. If the tool ever prefers stated Xvar over derived xm, the FHX/HCX twins diverge (4 vs 6 mm).

### 2.4 fhx15 — "B&C 15FHX76 · 60°×60°" — REAL_MISMATCHED

| field | baked | found | source | judgment |
|---|---|---|---|---|
| odW / dpW / sdW | 39.3 / 19.9 / 855 | 393 mm / 199 mm / 855 cm² | 15FHX76.pdf p.2 | ✅ |
| hfExit / recXO / covH | 33 / 1200 / 60 | 33 mm / 1.2 kHz / 60° | same p.1/p.2 | ✅ |
| **covV** | **60** | **40** ("60°×40° nominal coverage") | 15FHX76.pdf p.1 | ❌ |
| xmW | 4.25 | derived (16.5−8)/2; stated Xvar is 7 (different quantity — do NOT substitute) | same p.2 | ⚠️ derived |
| vtcW | 250 | not stated | shell.html:189–190 | ⚠️ |
| mouthW | 34 | rule gives 36.4 (ratio 2.20, low edge of 2.20–2.42 band) | queue.md b518 | — |

**Action: RE-BAKE** covV 40; rename "…60°×40°". Everything else verbatim datasheet — keep.

### 2.5 jmod — "JMOD 90×60 · 2×12 on the DCX coax" — REAL_MISMATCHED

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH×covV / nW / cdSel / topo / name claims | 90×60 / 2 / dcx464 / 2way | all verified (manual's "3-way" is tri-amp electrical; physically CD + 2×12, no discrete mids) | JMOD manual p.1/3/4/9/11/18-19 (local PDF) | ✅ |
| odW / sdW | 31.5 / 522 | 315 mm / 522 cm² (12NDL76; build-58 STEP bbox agrees) | bcspeakers.com 12NDL76; handoff_v2 b58 | ✅ |
| **dpW** | **14** | **14.1** (141 mm; 14.0 is the 12NDL88's depth — driver mix-up signature) | bcspeakers.com 12NDL76 + b58 STEP | ❌ |
| **xmW** | **9** | **7** (repo's own build-59 extraction had 7; shell drifted) | bcspeakers.com 12NDL76; handoff_v2 b59 | ❌ |
| vtcW | 180 | manual has no chamber volumes (CAD-only) | manual + STUDY_4 §7 | ⚠️ |
| mouthW | 30 | no mouth dim in the manual; real cabinet 75 cm/29.5 in total width — baked mouth EXCEEDS the whole cabinet | manual p.3; queue.md M8 (gate-exemplary solve size) | ⚠️ design choice, not a JMOD number |
| nM=4 + M4 fields | vestigial | verified inert on 2way (engine.js:723 gates mids on topo==='3way') | engine.js 505–526, 723, 1345 | — |
| wPre ndl12 | 12NDL76 | in the validated table (Middle tier, "Validated by DSL1"); manual's STANDARD is 12NDL88 (BOM p.9) | manual p.4/8/9 | ✅ alternate |

**Action: RE-BAKE** W12 in shell.html:176 + engine.js:1694 **together** (gate cross-checks; drift = gate fail): xm 9→7, dp 14→14.1. Optional, better fidelity: add a 12NDL88 entry (od 31.5 / dp 14.0 / sd 522 / xm 8, bcspeakers.com) and point jmod at it (meshApprox:'BC_12NDL76' until real CAD). Never present mouthW 30 as a JMOD dimension. Strip or comment the inert nM/M4 fields on 2way bundles.

### 2.6 canon9060 — "house canon 90×60 · 4×6.5″" — NOT_A_REAL_BUILD

No online build pairs a DCX464 coax with 4 small woofers at 90×60/24in. Geometry maps almost exactly onto **Waslo's CoSyne** (90×60, 24 in mouth, 4 woofers — Synergy Calc V5 PDF, libinst.com) but CoSyne is a **3-way** (CDX1-1445 + 4 Gento mids + 4× Aurasound NS6-255-8A 6″).

| field | baked | closest sourced reality | source | judgment |
|---|---|---|---|---|
| covH/covV/mouthW/nW | 90/60/24/4 | CoSyne states exactly these | Synergy Calc V5 PDF p.6/Step 1 | — coincide |
| odW | 16.7 (generic w65) | NS6-255-8A Ø156.4 mm | madisound ns6-255-8a.pdf | ⚠️ |
| sdW | 132 | NS6: 126.0 cm² | same | ⚠️ |
| xmW | 5 | NS6 states NO Xmax (underhung; (12.7−11.3)/2 = 0.7 computed) | same | ⚠️ fiction risk |
| cdSel dcx464 (td 1.4, floor 300) | — | real driver, values stated by B&C | bcspeakers.com DCX464; Hinson MEH.pdf pp.13-14 | ✅ driver only |

**Action:** Either **re-anchor to CoSyne** (topo 3way, full sourced pack in the audit record: NS6 od 15.64/dp 8.2/sd 126, CDX1-1445 recXO 2200, td 0.707 sq, mid taps 5/8″@2″, wallT 0.465 in, sub XO 80 Hz — sources: libinst PDF, madisound, parts-express/celestion, van Ommen diyaudio 292379 post-5694329) — **or keep the honest "house canon" label** and stop implying any class referent. Either way the w65 pack is unsourced; if kept, say so. Side finding: w65 meshApprox 'BC_8MDN51' (8″ mesh on a 6.5″ entry) smells like a paste error.

### 2.7 compact — "compact synergy 90°×60° · 4×5.25″" — NOT_A_REAL_BUILD

No 4×5.25″-on-coax build exists. Maps to CoSyne's horn (mouth actually 23.961×15.274 in, depth 9.211 — Dimensions.png) with the wrong topology and a fictional woofer.

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH/covV | 90/60 | CoSyne 90×60 | Synergy Calc V5 PDF + Dimensions.png | ✅ (as CoSyne) |
| mouthW | 24 | 23.961 in inside | libinst.com/SynergyDIY/Publish/Dimensions.png | ❌ (rounding — flag) |
| topo/cdSel | 2way dcx464 | CoSyne is 3-way, CDX1-1445 + 4 Gento mids | Synergy Calc V5 PDF | ❌ |
| odW / sdW / dpW | 13.2 / 85 / 7 | no real 5.25″ candidate states these (NS6 156.4/126/82.4; Dayton DC130A-8 137.6/91.6/69.5; Visaton W130S-8 146/79/54) | madisound / PE pedocs 295-303 / visaton.de | ⚠️ composite |
| **xmW** | **4.5** | exceeds EVERY real candidate (NS6 3.9 retail-only; DC130A-8 2.5; W130S-8 ±2.3) — **inflates the 17 m/s port-velocity headroom; zero-warn gate result is built on fiction** | same three | ⚠️ fiction |
| subXO | 80 | "crossed to a subwoofer at about 80 Hz" | Synergy Calc V5 PDF | ✅ |

**Action:** Option A — re-anchor as "CoSyne-class — 90°×60° · 4×6″ NS6 (Waslo)" with the sourced NS6 pack (and the honest 3-way caveat). Option B — keep the 2way/DCX shape as an admitted HOUSE ARCHETYPE with a real driver: Dayton DC130A-8 (od 13.76 / dp 6.95 / sd 91.6 / xm 2.5 — PE pedocs), Waslo's own listed substitute. **Either way, re-run the gate: real xmax 2.5–3.9 vs baked 4.5 changes velocity/CR grades.**

### 2.8 square — "square-format 90°×60° · 4×8″" — NOT_A_REAL_BUILD

All four candidate referents eliminated (chrisbln = 50×50 3-way 2×12; Metlako = small 2-way unity, no CD; liam056 = 3″ mids + 6″ bass; PM90 = 12″ pro wood synergy; no Danley 4×8 exists). Closest real online: **Thijs666 "Synergy with DE250 an 8FE200"** (diyaudio 259174) — 90×60 two-way MEH, TWO 8FE200s.

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH/covV | 90×60 | name-only; no 4×8 source exists | — | ⚠️ |
| nW | 4 | only real 8″ 2way MEH uses 2 | diyaudio 259174 (2016 update) | ⚠️ |
| odW | 21.0 | 8FE200 Ø209.2; B&C 8NDL51/64 Ø225 — nobody states 210 | faitalpro.com; bcspeakers.com | ⚠️ composite |
| sdW | 220 | B&C 8″ class states 220 exactly; Faital 209 — but preset names no driver | bcspeakers.com 8NDL51/8NDL64 | ⚠️ |
| xmW | 6.5 | 8NDL51: 7; 8NDL64: 4.5; 8FE200: 4.67 — none states 6.5 | same | ⚠️ composite |
| mouthW 24 / seN 12 | — | tool design choices | engine.js:1725 | — |

**Action:** Replace with the Thijs666 referent (2way, 90×60, nW 2, 8FE200 pack od 20.9/dp 8.9/sd 209/xm 4.7, recXO 1000, mouth ~19 in box-derived — mark approximate; **needs a DE250 cdSel entry, 1″ exit — dcx464 is wrong for this referent**; drop "square-format"), OR keep the 4×8 square slot renamed "(archetype — no real build)" and re-anchor W8 to ONE named driver, **B&C 8NDL51-8: od 22.5 / dp 9.0 / sd 220 / xm 7.0**.

### 2.9 tall — "tall 60°×90° · 4×5.25″" — NOT_A_REAL_BUILD

engine.js:1727 — identical to `compact` with covH/covV swapped. No portrait-format MEH exists anywhere online; diyaudio practice orients the wide axis horizontal. Every driver field shares `compact`'s w5 fiction.

**Action:** Replace with the closest real 2-way MEH, **Art Welter's SynTripP** (diyaudio 264485; CAD already in repo): covH 86 / covV 36, nW 2× B&C 10CL51 (Sd 320, xmax 5.5 — loudspeakerdatabase; OD/depth from the B&C drawing PDF before baking), CD Eminence N314X (1.4″ exit, recXO 800 min), cabinet 26.5×11.25×15 in, F3 82 Hz; mouthW must come from the repo STEP files, not be invented. OR relabel the slot honestly: "tall (archetype — no known real build)".

### 2.10 angular2 — "classic angular (Waslo) 90×60 · 4×5.25″" — REAL_MISMATCHED

Geometry is a clean sourced match to CoSyne; the drivers are not Waslo's.

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH/covV/mouthW/nW/style | 90/60/24/4/angular | CoSyne states all five | Synergy Calc V5 PDF pp.3–6 | ✅ |
| topo | 2way | CoSyne is 3-way | same pp.4–5 | ❌ |
| cdSel | dcx464 | Celestion CDX1-1445 | same p.4 | ❌ |
| td | 1.4 | 0.707 in square throat (green value); CDX1-1445 is 1″ exit | synergy_calc_extraction.md; PDF p.4 | ❌ |
| odW / sdW / xmW | 13.2 / 85 / 4.5 | matches none of NS6 (156.4/126/–), DC130A-8 (134/91.6/2.5), W130S-8 (146/74–79/~2.3) | madisound / daytonaudio / visaton+PE | ❌/⚠️ |
| vtcW | 35 | tool estimate | — | ⚠️ |

**Action:** Option A — keep the 2way house-canon family but **drop "(Waslo)" from the name**; if a real 5.25″ is wanted, W5 → Dayton DC130A-8 (13.4/6.95/91.6/2.5). Option B — add a true **"CoSyne (Waslo)" 3-way preset**: angular, 90×60, mouth 24, wallT 0.465 in, NS6 pack (15.64/8.24/126; xmax unstated — PE legacy 3.9, mark provenance), 4 mids (Gento unsourceable buyout — Waslo's listed subs FaitalPRO 3FE25-8 / Visaton FRS5-8), CDX1-1445 with 1″ exit, td 0.707 sq, H-pattern floor 385 Hz. **Synthesis recommendation: do Option B ONCE (this slot is the natural home — already angular and Waslo-named) and de-Waslo canon9060/compact rather than minting three CoSynes.** Caution: visaton's "±8 mm" is mechanical, not linear.

### 2.11 sh96 — "SH96-class 90×60 (SH-50-scale vents)" — REAL_MISMATCHED

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH/covV / nW / nM | 90/60 / 4 / 6 | 90×60; 4×15″; 6×4″ | SH96HO Spec Sheet Rev.1 220304 p.1; danleysoundlabs.com/products/sh96/; placard photo (b531) | ✅ |
| **mouthW** | **58** | real front face 45.00×26.50 in, 18 mm birch ⇒ max possible mouth ~43.6 in. Baked mouth is **+13.0 in vs the whole cabinet (+29%), physically impossible on the real unit** | spec sheet p.1+p.3 drawing | ❌ |
| **odM/sdM (m3 pack)** | **9.3 / 31** | documented mid is 4″ nominal (launch press said 5″); the tool's own M4 (10.3/50) exists and was not used — 3″ class matches NEITHER | spec sheet p.1; mixonline.com launch PR; engine.js:1697 | ❌ class |
| odW/sdW/xmW | 39 / 855 / 10 | proprietary — only "15″" nominal published; generic w15 proxy | spec sheet p.1 | ⚠️ proxy |
| fxLo | 250 | no public SH-96 XO exists | searched; sheet silent | ⚠️ |
| cdSel dcx464 | 1.4″ exit | "High 1×1.4″" — exit class matches; actual driver proprietary | spec sheet p.1 | — declared stand-in |
| placeW chamfer | ✓ | 45° corner boards photo-documented | STUDY_4 §14 + Addendum b531 | ✅ |
| "(SH-50-scale vents)" name | ✓ | honest: no public SH-96 vent measurement exists; SH-50 van Ommen record declared as stand-in | diyaudio 292379 post-4957246; fresh search empty | ✅ posture |

**Action:** (1) mPre m3 → **m4**, why-text noting the 4″-sheet vs 5″-press conflict (sheet wins). (2) Mouth: re-bake ≤43.5 by modeling pocket room OUTSIDE the flare (the b528 ruling Marwan already wanted — queue.md b528), or keep 58 and declare "v5-geometry mouth; real SH-96 front = 45×26.5 in" in the name/why-text the same way vents are declared. (3) Mark odW/sdW/xmW/fxLo explicitly as unsourced proxies. (4) **Repo consequence:** STUDY_4 Addendum 3 anchored vent pixel proportions on a 58 in mouth ("~2.5–3.2 in — lands on the SH-50 2.5 in class"); re-anchored on ≤43.6 in they give ~1.7–2.2 in round / ~6.5–8.3×1.5–2.0 in slots — **below** the SH-50 class. Retract/re-derive that corroboration line.

### 2.12 sh50 — "SH50-class — 70×70 square, 4×10 + 4 mids" — REAL_MISMATCHED

The name is Danley's; the state is a hybrid of chrisbln's mouth-flare and a driver complement no build has.

| field | baked | found | source | judgment |
|---|---|---|---|---|
| topo | 3way | 3-way, passive single-channel | SH50 Spec Sheet Rev. 202209301629 (text extracted) | ✅ |
| **covH/covV** | **70×70** | **50×50** ("a single 50°×50° horn"); 70×70 is chrisbln thing:6886663's MOUTH-FLARE angle, a different quantity | spec sheet; STUDY.md 197–199 | ❌ |
| **nW** | **4×10″** | **2×12″** | spec sheet | ❌ |
| nM | 4 | 4×5″ | spec sheet | ✅ count / ❌ size class (baked 4″ m4; official 5″; van Ommen CR math assumed 4″ — open question 7) |
| **sdW (hpl10 row)** | **330** | **320** (10HPL64, two sources agree) | bcspeakers.com archive 10HPL64; ManualsLib PDF | ❌ |
| **xmW (hpl10 row)** | **8** | **4** (Xvar 5.5) | same | ❌ |
| odW/dpW (hpl10) | 26.1 / 12.2 | 261 / 122 mm | same | ✅ |
| cd exit | 1.4″ dcx464 | real HF is 1″ exit (proprietary) | spec sheet | ❌ as referent; ok as declared stand-in |
| mouthW | 24 | unpublished; only external 28×28×25.5 in envelope exists | spec sheet | ⚠️ design choice — never present as SH-50 number |
| fxLo | 250 | unpublished (passive box); λ/4@10.5in inference ≈320 — inference only | US6411718 via STUDY_4 §3; diyaudio 292379 | ⚠️ |

**Action:** (A) Re-bake as true SH50-class: 50×50, nW 2 × W12/ndl12 declared stand-in, nM 4 with the 5″-vs-4″ conflict cited loudly, DCX464 declared stand-in (real exit 1″), fxLo labeled UNSOURCED, mouth a design choice; gate goldens then assert derived tap stations against the measured 3.5/10.5/14.5 in record (diyaudio 292379 post-4957246). (B) If the 70×70/4-woofer shape must stay, rename it to chrisbln 12-24-MEH thing:6886663 and change nW to 2×12 to match it. **Independent of A/B: fix the 10HPL64 row (sd 320, xm 4) in engine.js:1693, meh5.html:1854+1939, shell.html:175, gate.js:28, test_matrix.js:6 — then re-run the gate (xmax halves).** See §1.14 for the recommended reconciliation with angular3.

### 2.13 classic3 — "classic 3-way 90×60 · 4×10 + 4 mids" — NOT_A_REAL_BUILD

No 3-way MEH with FOUR horn-loaded 10s exists anywhere (SH-96 = 4×15+6×4; SH-50/46 = 2×12; aragorus = 2×10; njones's 4×10 are in separate sealed boxes; Droco never built).

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH/covV | 90/60 | real 90×60 3-ways exist (SH-96, kipman725) but none with this complement | spec PDFs; diyaudio 367253 | ⚠️ |
| nW / nM / fxLo | 4 / 4 / 250 | no source; kipman725 crosses at 300 | diyaudio 367253 | ⚠️ |
| odW/dpW | 26.1 / 12.2 | 10HPL64: 261 / 122 mm | cdn-docs.av-iq.com 10HPL64.pdf; bcspeakers.com | ✅ |
| **sdW** | **330** | **320.0** | same | ❌ |
| **xmW** | **8** | **4.0** (Xvar 5.5) — 8 looks like a peak-to-peak doubling | same | ❌ |
| mouthW 31 | — | b528 mouth-plane law consequence | engine.js 1753–56; queue.md:63 | — |

**Action:** (1) Fix the W10 bundle regardless of referent (same five file locations as §2.12). (2) Replace referent with **kipman725** (diyaudio 367253: 90×60; N151M-8 1″ CD; 4× B&C 4NDF34 in-horn 300–1500 Hz [od 12.7/dp 6.6/sd 57/xm 3.8]; 2× B&C 10CL51 SIDE-mounted 80–300 Hz [od 25.7/dp 10.8/sd 320/xm 5.5]; fxLo 300; caveat: 10s are side-loaded, not taps) — or **aragorus** (309213: true in-horn 2×10 18Sound 10W500 + 4× TF0410MR + BMS 4550, XO 500/2000; coverage unstated — need thread horn dims before baking cov). Do NOT re-anchor to SH-96 (duplicates the sh96 preset). If neither, rename "(archetype)".

### 2.14 angular3 — "classic wooden angular 3-way (SH-50 mold)" — NOT_A_REAL_BUILD

Same unreal 70×70 / 4×10+4-mid state as sh50, in angular dress. The one style truth: the real SH-50 IS angular 13-ply birch — this preset fits the real SH-50 better than the smooth `sh50` preset does.

| field | baked | found | source | judgment |
|---|---|---|---|---|
| covH/covV | 70×70 | no product has 70×70 coverage; provenance is chrisbln/jansson MOUTH-FLARE angle | Danley sheets; thing:6886663 | ❌ |
| nW | 4×10″ | no sourced wooden 3-way MEH uses it | Danley sheets; STUDY_4 §§5–7 | ❌ |
| nM | 4 | SH-50 4×5″, SH-46 4×4″, chrisbln 4 | spec sheets | ✅ |
| sdW / xmW | 330 / 8 | 320 / 4 (10HPL64) | bcspeakers.com | ❌ (same W10 row) |
| style angular / seN 12 / mouthW 33 / fxLo 250 | — / — / — / ⚠️ | style matches real SH-50 canon; rest tool params; no source states 250 (chrisbln ~400–500, JMOD 370) | spec sheet; STUDY.md | mixed |

**Action (reconciles with §2.12):** Migrate the **SH50-class label to THIS preset**, re-baked to the sourced state — angular, 50×50, 2×12 (ndl12 stand-in), 4 mids, 1″ HF, box scale 28×28×25.5 in / 18 mm birch, port canon = van Ommen 3/4″@3.5″ + 2.5″@10.5″ + 2.5″@14.5″ — and strip "SH50-class" from the smooth preset. The leftover smooth 70×70/4×10 shape gets renamed honest-archetype or anchored to chrisbln thing:6886663 (throat 50×50 → mouth 70×70, ~551.8 mm ≈ 21.7 in mouth, 2× LaVoce 12″ + 4 cups + DN14, XO ~400–500/~1000–1300, taps at the same 3.5/10.5/14.5 stations). Record the 70×70 provenance trap in docs: it entered the corpus as a flare angle, never as coverage.

---

## 3. DELTA SUMMARY — every number that must change

Shared driver-table rows first (one edit fixes several presets; **shell + engine + gate goldens must move together** — queue.md M8: the gate cross-checks BUILDS numerics against the shell tables; drift = gate fail).

### 3.1 Hard datasheet contradictions (change the number)

| # | where | field | baked → sourced | source | presets hit |
|---|---|---|---|---|---|
| 1 | W10/hpl10 row (engine.js:1693, meh5.html:1854+1939, shell.html:175, gate.js:28, test_matrix.js:6) | sd | 330 → **320** | B&C 10HPL64 (bcspeakers.com archive + cdn-docs.av-iq.com 10HPL64.pdf + ManualsLib) | sh50, classic3, angular3 |
| 2 | same W10 row | xm | 8 → **4** (Xvar 5.5 if Marwan rules Xvar canon) | same | sh50, classic3, angular3 |
| 3 | W12/ndl12 row (shell.html:176, engine.js:1694) | xm | 9 → **7** | B&C 12NDL76 page; repo handoff_v2 build 59 | jmod (+ sh50/angular3 option A) |
| 4 | same W12 row | dp | 14 → **14.1** (141 mm; 14.0 belongs to the 12NDL88) | B&C 12NDL76; build-58 STEP bbox | jmod |
| 5 | CXPRE.cx5 (BMS 5CN140) | od | 14.8 → **13.5** | BMS 5CN140 datasheet (bmsspeakers.com fileadmin PDF) | refd |
| 6 | cx5 | dp | 8 → **8.2** | same | refd |
| 7 | cx5 | sd | 75 → **74** | same | refd |
| 8 | cx5 / refd | recXO / HF floor | 0/0 → **1900 / 1500 Hz**; drop "floors unverified" from name | same, HF spec table | refd |
| 9 | refd engine preset (engine.js:1707) | hfExit | 20.1 → **remove** (B&C 6FHX51 contamination; BMS publishes none) | datasheet absent; queue.md 76–77 | refd |
| 10 | fhx12 preset + name | covH×covV | 90×60 → **60×40** (or strip claim + loud warn) | 12FHX76.pdf p.1 "60°×40° nominal" | fhx12 |
| 11 | hcx12 row | dp | 16.9 → **16.8** | 12HCX76.pdf p.2 Depth 168 mm | hcx12 |
| 12 | fhx15 preset + name | covV | 60 → **40** | 15FHX76.pdf p.1 "60°×40° nominal" | fhx15 |
| 13 | sh96 preset | mPre | m3 → **m4** (odM 9.3→10.3, sdM 31→50) | SH96HO sheet p.1 "Mid 6x4″"; engine.js:1697 | sh96 |
| 14 | sh96 preset | mouthW | 58 → **≤43.5** (or keep 58 + declare "v5-geometry; real front 45×26.5 in") | SH96HO sheet p.1+p.3 drawing | sh96 |
| 15 | sh50 preset | covH/covV | 70×70 → **50×50** | SH50 Spec Sheet Rev. 202209301629 | sh50 (option A) |
| 16 | sh50 preset | nW / woofer class | 4×10″ → **2×12″** (ndl12, declared stand-in) | same | sh50 (option A) |
| 17 | compact/tall/angular2 W5 row | xm | 4.5 → **2.5** if W5 becomes Dayton DC130A-8 (od 13.2→13.76, dp 7→6.95, sd 85→91.6) — otherwise the whole row stays fiction and must say so | PE pedocs 295-303 | compact, tall, angular2, square siblings |
| 18 | square W8 row (if archetype kept) | od/xm | 21.0→**22.5**, 6.5→**7.0**, name the driver 8NDL51-8 (sd 220 already matches) | bcspeakers.com 8NDL51-8 | square |

### 3.2 Naming/honesty changes (no source permits the current claim)

- **angular2**: drop "(Waslo)" — no Waslo build is a 2way on a DCX464. If a Waslo preset is wanted, build ONE true CoSyne 3-way (§2.10 Option B) and de-Waslo canon9060/compact too.
- **square / tall / classic3** (if not re-anchored): append "(archetype — no real build)" per the refuse-loudly doctrine; "square-format" must go if the Thijs666 referent (rectangular) is adopted.
- **sh50 vs angular3**: the SH50-class label lives on exactly ONE preset — the angular one, re-baked to 50×50/2×12/4-mid (§2.14).
- **refd**: rename to name the 5CN140; "floors unverified" is falsified by the datasheet.
- **fhx12 / fhx15**: names carry the corrected coverage (60°×40°) or no coverage at all.
- **jmod**: mouthW 30 may stand as the gate-exemplary solve size but must never read as a JMOD dimension (real cabinet 29.5 in total width).

### 3.3 Post-re-bake obligations

1. **Re-run the gate** after any xmax change (W10 8→4 halves excursion headroom; W5 4.5→2.5; the 17 m/s port-velocity and zero-warn grades on compact-family presets were computed on fiction).
2. Shell/engine/meh5/gate.js/test_matrix.js rows move in lockstep (M8 cross-check).
3. Retract/re-derive STUDY_4 Addendum 3's vent-proportion corroboration (anchored on the impossible 58 in SH-96 mouth; on ≤43.6 in the same pixels give ~1.7–2.2 in, below the SH-50 2.5″ class).
4. Check sibling drift flagged in passing: w65 and w5 meshApprox 'BC_8MDN51' (8″ mesh on smaller entries — paste-error smell; render-only).

---

## 4. UNVERIFIABLE — what cannot be sourced, and what the presets should say

**Danley proprietary internals (SH-50, SH-96).** Danley publishes nominal driver sizes/counts, coverage, external dims, weight, and band splits only. NOT published, by anyone, anywhere found: LF/MF frame OD, Sd, xmax; internal crossover points (both boxes are passive/single-channel — fxLo can never be sourced from Danley; λ/4-at-tap-station inference ≈320 Hz for SH-50 is inference only, do not canonize); SH-50 mouth dimension (only the 28×28×25.5 in external envelope exists); any SH-96 vent/port measurement (fresh searches this audit round confirm the repo's open item — the interior-photo "vents" were already retracted as handle cups, b531). The ONLY hard Danley vent record remains van Ommen's SH-50 tape measure (diyaudio 292379 post #4957246: mid 3/4″@3.5″, LF 2.5″@10.5″, reflex 2.5″@14.5″).
→ Presets must use **class naming** ("SH50-class", "SH96-class"), declare every proxy in the why-text ("generic 15″ proxy — Danley LF proprietary"), and declare stand-in substitutions in the NAME the way "(SH-50-scale vents)" already does. That posture is the audited model of honesty; the silent mouthW 58 was the violation.

**Mid-size conflicts inside Danley's own record.** SH-50: current sheet 4×5″ vs av-iq listing 4×4″ vs van Ommen's 4″-cone CR math (open question 7). SH-96: current sheet 6×4″ vs launch press 6×5″. Rule already applied: the manufacturer's current sheet wins; the conflict gets cited in the why-text, not silently resolved.

**Front-chamber volumes (vtcW/vtcM) — all presets.** No manufacturer publishes Vtc; every baked value (35/30/150/250/130/180…) is a tool estimate. Correct posture: flagged "estimated", never "datasheet".

**Xmax where the maker states none.** B&C states no Xmax for the FHX coaxes: fhx6's 3.5 and fhx12/15's 4.25 are (winding−gap)/2 derivations from STATED inputs — keep only with the derivation bound in a comment; the maker-stated excursion figures are Xvar (5.7 / 4 / 7 respectively — a different quantity; substituting it silently is forbidden, and if the tool ever switches to Xvar the FHX/HCX twins diverge). Aurasound NS6-255-8A states no Xmax at all (underhung; retail 3.9 is Parts-Express-only provenance).

**JMOD internals.** The manual states no chamber volumes, port dims, or mouth dimension — they exist only in the CAD downloads. Baked vtc 180 is an estimate; mouth 30 in is the tool's solve, larger than the real 29.5 in cabinet.

**Hand-measurement queue (refd).** BMS publishes no HF exit diameter for the 5CN140 and no Vtc; exit-at-cone Ø, rim Ø, and baffle depth stay on Marwan's queued 3 measurements (queue.md 76–77). The datasheet closes od/dp/sd today; only those three need the physical unit.

**Rate-limited/blocked sources this round.** loudspeakerdatabase.com (HTTP 429, repeatedly), diyaudio direct fetch (403 — content verified via proxy/snippets), old.bcspeakers.com (expired cert). None was load-bearing; nothing above rests on a blocked source. If an older 10HPL64 datasheet revision stating 330/8 ever surfaces, it would overrule delta rows 1–2 per doctrine — none was found.

---

*Synthesized 2026-07-24 from 14 per-preset adversarial audits. File lives in scratchpad by instruction; not written into the repo.*
