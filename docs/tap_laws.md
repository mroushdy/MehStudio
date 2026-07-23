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

5. **Velocity first, area second** (Waslo compendium): the real port-area
   criterion is peak air velocity at the band's LOW edge:
   v = CR·2π·f_low·xm ≤ 17 m/s (≈5% of c). Ap derives FROM the limit,
   clamped to the CR bands (mids 4–8:1, woofers 2.5–6:1).
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
