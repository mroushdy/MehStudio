# TAP LAWS — the sourced tap size & placement corpus (v5, M2)

Every constant traces to a source. Nothing invented; tensions are stated.
Corpus in `reference/`: Hinson MEH paper, US 6,411,718 (Danley Unity),
US 8,284,976 (entry size), US 5,526,456 (Heinz), Waslo Synergy Calc v5
(sheet cells mined in `synergy_calc_extraction.md`), Solana / SAWMOD / JMOD
guides, Hornresp manual, Makarski dissertation.

## Position

1. **λ/4 reflection null** (US 6,411,718; Hinson pp. "at 1/4 wavelength it
   will create a deep cancellation notch"): sound entering a tap runs to the
   throat, reflects, and cancels at f = c/(4·path), path = tap→CD-diaphragm.
   **v5 builds the margin into the derived crossover**: XO = (1/1.2)·c/(4·path),
   so the null sits 1.2× above the XO (v4's grade threshold). v5 previously
   derived the XO exactly ON the null — fixed with M2.
2. **Entry size** (US 8,284,976): enter where the horn is ≤ 1 wavelength
   around at the section's band top. Row: circle-equivalent circumference
   √(4πA)/λ ≤ 1.0 (warn to 1.3).
3. **Any-pair tap spacing** (Waslo "radiate as one driver"; Hinson "taps…
   within ¼ wavelength of each other"): strict λ/4 for MID sections
   (ok ≤ 1.0, warn ≤ 1.2) — v4 canon applied it to mids only. Woofer
   sections tolerate more spread (SH96's own woofer taps measure ≈1.5×λ/4
   at its crossover): ok ≤ 1.5, warn ≤ 2.0.
4. **Corner placement practice** (Hinson): mid taps live in corners so they
   don't ripple the CD response — measured "almost no difference" taped vs
   open. (Drives the M7 corner dialect; not yet a law row.)

## Size

5. **Velocity first, area second** (PROVENANCE CORRECTED b530 — study _4):
   v = CR·2π·f_low·xm ≤ 17 m/s at the band's LOW edge. NOT Waslo (Synergy
   Calc V5 contains zero occurrences of "velocity" — grep, study _4); the
   community origin is diyAudio user nc535's worst-case check at maximum
   anticipated SPL, and Hinson's 17 m/s (MEH.pdf p.19, the figure's ONLY
   occurrence) is "onset of audible chuffing" — a BASTA! max-SPL prediction
   input for his REFLEX ports, which he knowingly shipped past it (port-
   limited below 70 Hz, pp.19-21). Danley's own patents legislate AREA
   (US6411718 area-matching; US8284976 "relatively small"), never velocity.
   Ap still derives FROM the limit for the DIY slot dialect (a conservative
   heuristic, stated as such), clamped to the CR bands (mids 4–8:1, woofers
   2.5–6:1). THE DANLEY DIALECT (corner boards, b530) instead rides the
   tape-measured record: 2.5in woofer taps / 3/4in mid taps (SH-50, van
   Ommen, diyaudio 292379 #4957246; chrisbln thing:6886663 concurs) with
   the velocity number stated, not graded. SH-96's own vents: UNMEASURED —
   his tape measure wanted.
6. **Taps vs station area**: mids ≤ 20% of the local horn area protects the
   HF wavefront (patent ideal is full area match — the tension is the
   design); woofers ≤ 50% (CoSyne measured clean at 43%).
7. **Cone dia vs λ/2**: path spread across one cone cancels above
   c/(2·D_eff), D_eff from Sd. Keep above the band top.
8. **Slot shape** (Hinson): "long racetrack style shapes… more area for air
   velocity without intruding into the horn" — v5's 3:1 stadium slots,
   area exactly Ap per driver.

## Chamber

9. **Helmholtz low-pass** from REAL geometry: Lpt_eff = print wall +
   0.85·√(Ap/π) end correction (Waslo; a 45° entry frustum would halve the
   wall term — future part detail). Must clear the crossover by 1.2×.
   Same Lpt is used in the response network's branch masses.

## Where enforced

`engine.js acoustics()` — law rows (also for the 1-way coax tap ring);
`engine.js layout()` — XO derivation with the 1.2× margin;
`gate.js` — 14k-check lattice asserts the null margin and row sanity on
every state, every push.

## Provenance note (2026-07-23, US6411718 read in full)
The λ/4 family's root: Danley's patent places taps AT λ/4 with a 90°-shift
crossover (air path supplies the missing quarter turn). v5 sums LR4
(in-phase), so the v4-inherited rule - derive the XO 1.2× BELOW the λ/4
null - is the matching discipline. The entry-circumference ≤ 1λ boundary
(transformation vs waveguide zones) is also stated in this patent.

## Measured tap-station records (the reference canon)

R1. **SH-50 (van Ommen tape measure, diyaudio 292379 #4957246)**: mid taps
    3/4in Ø @ 3.5in from CD; woofer taps 2.5in Ø @ 10.5in; reflex ports
    2.5in Ø @ 14.5in. The Danley-dialect anchor (b530).
R2. **aragorus 2×10 3-way (diyaudio 309213, b534 mining)**: mid taps at
    3 cm station (33.1 cm² local area, spread 8.2 cm); woofer taps at
    16.5 cm (501 cm², spread 32.1 cm), ports 3.2 cm Ø → re-cut as
    10×3.2 cm slots after 60 Hz chuffing (a real chuff-limit datum);
    CD path 5.5 cm. Coverage unsourceable (dead image hosting) — the
    record is STATIONS, not a preset.
