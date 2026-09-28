# Three-way MEH / Unity / Synergy research manifest

Verified: 2026-07-29
Scope: primary sources and author-origin build documents that can inform MEH Studio. This is a traceable research map, not a claim that every historical prototype or commercial product has been found.

## Evidence rules

- **Documented** means stated or drawn in the linked patent, manufacturer sheet, or author document.
- **Calculated adaptation** means MEH Studio may derive a new design from published laws and user-selected drivers. It must not be presented as an exact commercial product.
- **Envelope study** means only public driver count, coverage, dimensions, and performance may be represented. Port locations, chambers, passages, and crossover values remain proprietary unless independently published.
- **Adjacent** means useful history or subsystem research, but not a complete three-way MEH topology.

## Classification matrix

| Reference | Is it genuinely three-way? | Documented topology and geometry | Documented design principles | Safe MEH Studio treatment |
|---|---|---|---|---|
| **Unity Summation Aperture patent, US 6,411,718 / continuation US 2002/0106097** | **Yes; the patent includes explicit three-way embodiments.** | A high-frequency driver feeds the throat. Pairs of mid- and low-frequency drivers enter one horn through ports at progressively larger cross-sections. Conical/straight-sided examples are shown; the text also explains choosing driver stations from the horn's changing local expansion rate. The summed port area at a station is matched to the horn area there for impedance transformation. | Driver station is jointly constrained by local flare/cutoff, crossover phase, physical path length, and aperture spacing. The patent describes a typical quarter-wavelength relationship for a 90° crossover, then recommends finding the actual acoustic crossover by polarity inversion and the deepest measured notch. Short, corner-adjacent passages reduce acoustic reactance. | **Highest-priority generic three-way solver basis.** Name it descriptively, e.g. `shared-horn three-band / stepped summation`, not as a product clone. Store every equation with patent paragraph/figure provenance. |
| **Danley SH50** | **Yes.** | Official sheet: all three bands are mounted within one 50° × 50° horn; two 12-inch LF drivers, a group of small MF drivers, and one 1-inch HF driver. It uses acoustic low-pass filters on LF and MF and a phase-aligned crossover. Published enclosure: 28 × 28 × 25.5 in. | Common horn, acoustic low-pass behavior, and crossover alignment are documented. Exact port, chamber, and passage geometry is not public in the spec sheet. | **Envelope/validation card only**, unless independently derived. Do not ship an “exact SH50” geometry. Note the current official web page says 4 × 4-inch MF while the 2022 PDF says 4 × 5-inch MF; preserve source revision rather than silently choosing one. |
| **Danley SH60** | **Yes.** | Official product data: 60° × 60°, two 12-inch LF, six 4-inch MF, one 1-inch HF; 28 × 28 × 22 in. | Same public common-horn / acoustic-filter family information as other SH systems; internal dimensions are not disclosed. | **Envelope study** for a wider conical three-way target. |
| **Danley SH46** | **Yes.** | Official sheet: 40° × 60°, two 12-inch LF, four 4-inch MF, one 1.4-inch HF; 29 × 22.3 × 22.7 in. All three bands are described as sharing a single horn. | Acoustic low-pass filters on LF/MF and crossover alignment are documented; internal geometry is not. | **Envelope study** for an asymmetric rectangular-coverage package. |
| **Danley SH96 / SH96HO** | **Yes.** | Official data: 90° × 60°, four 15-inch LF, six 4-inch MF, one 1.4-inch HF; SH96HO is a large-format three-way common-horn system, 26.5 × 45 × 25 in. | Shows the topology scaling to more/larger LF devices and broad rectangular coverage. Internal ports and chambers remain undisclosed. | **Envelope study** and stress-test case for count/package growth; not an exact preset. |
| **Danley J1-94 Jericho** | **Yes, but it is not a simple conventional MEH.** | Official sheet: quad-amplified three-way, 90° × 40°, six 18-inch LF drivers in a tapped-horn configuration, six 6-inch MF drivers, and three 1.4-inch HF drivers through a patented layered HF combiner; 60 × 45 × 30 in. | Combines Synergy building blocks with additional low-frequency loading and mid/HF combining. | **Advanced adjacent architecture**, not a normal three-way preset. It requires separate tapped-LF and layered-combiner models. |
| **Scott Hinson, “Multiple Entry Horns / The Ultimate Loudspeaker … MEH” (2022)** | **Electrically yes, mechanically a hybrid.** | Two 10-inch cone woofers enter a conical horn through slots; a B&C DCX464 dual-diaphragm coaxial compression driver at the throat supplies separate MF and HF bands. The document describes a roughly 45 L reflex chamber and two 3-in × 7.25-in vents, along with drawings and example crossover settings. There are no separate cone midrange drivers. | Describes local conical/quadratic flare checks, tap-to-apex reflection notch, a quarter-wavelength station bound, corner-biased slots, racetrack aperture benefits, and the acoustic low-pass formed by front/rear chamber plus passage mass. It warns that undersized apertures can create unsafe cone pressure. | **High-priority documented hybrid topology.** Label it `dual-diaphragm throat + tapped LF`, not a conventional three-cone-band layout. Recalculate around selected drivers; do not redistribute the author's exact drawings without permission. |
| **Bill Waslo Synergy Calc V5 / CoSyne** | **Yes.** | The author guide documents a nine-driver DIY system: one HF compression driver, four small MF drivers, and four LF drivers on a nominal 90° × 60°, 24-in-wide horn. It provides the spreadsheet/Hornresp workflow and construction examples. Original MF/LF drivers were discontinued buyouts. | Port station, compression chamber, passage, and quarter-wavelength limits are part of the calculation workflow. The author explicitly states that substitute drivers require redesigned ports/crossover and further prototypes. | **Best documented conventional DIY three-way reference.** Offer `CoSyne archived topology` and a separate `calculated current-driver adaptation`; never imply an untested replacement is acoustically equivalent. |
| **Yorkville Unity U15** | **The loudspeaker is three-way, but the horn is only a two-band Unity device.** | One 15-inch direct radiator covers LF; three 5-inch MF drivers enter a 60° × 60° horn through wall slots; a 1-inch-throat HF driver feeds its throat. Published crossover points are 300 Hz and 1.25 kHz. | Useful evidence for a hybrid direct-LF + common MF/HF cabinet, not for a full three-band single-horn MEH. | **Adjacent hybrid reference only.** Do not list it under “three-way MEH” presets. |
| **Renkus-Heinz CoEntrant patent, US 5,526,456** | **No; two-way common-horn predecessor.** | LF and HF sources are brought to a common throat through compound passages with substantially equal acoustic lengths. | Equalized paths and a shared throat are useful historical concepts, but this is not stepped three-band wall injection. | Historical math/reference only. |
| **Dual-range horn with acoustic crossover, US 7,392,880** | **No; two-way mid/HF combiner.** | Two sources are merged before the horn entrance; a perforated acoustic low-pass and matched effective delay are described. | Useful for a possible composite MF/HF throat module. | Adjacent subsystem research only. |
| **Danley layered/parallel-path horn patents, US 2009/0323997 and US 2012/0328140** | **Not a complete three-way MEH by themselves.** | Multiple driver outputs are combined through plenums and parallel passages to create a curved or approximately spherical-segment wavefront. | Relevant to multi-HF combiners such as Jericho-class systems. | Separate experimental combiner module; do not mix it into the ordinary tap solver. |

## Primary-source manifest

The redistributed local subset is integrity-pinned in
`research/threeway-sources/SOURCE-HASHES.sha256`. Manufacturer sheets and
other copyrighted documents listed below remain URL-cited rather than bundled
unless their redistribution rights are separately established.

### Foundational patents

1. **Unity Summation Aperture — US 6,411,718 B1**
   - Patent page: <https://patents.google.com/patent/US6411718B1/en>
   - Searchable continuation: <https://patents.google.com/patent/US20020106097A1/en>
   - Public PDF: <https://patentimages.storage.googleapis.com/06/b9/cd/d18e4dfa58d94e/US20020106097A1.pdf>
   - Use: three-band station, aperture-area, path/crossover, and passage-placement provenance.

2. **Sound reproduction with improved performance characteristics — WO 2006/133245**
   - Patent-family page: <https://patents.google.com/patent/WO2006133245A2/en>
   - Use: later-generation lower-driver placement limits tied to local horn expansion and wavelength. Treat claims and jurisdiction/status carefully; a patent publication is technical evidence, not legal clearance.

3. **CoEntrant common horn — US 5,526,456 A**
   - Patent page: <https://patents.google.com/patent/US5526456A/en>
   - Use: two-way historical equal-path/common-throat architecture.

4. **Dual range horn with acoustic crossover — US 7,392,880 B2**
   - Patent page: <https://patents.google.com/patent/US7392880B2/en>
   - Use: two-way acoustic-filtered combiner background.

5. **Horn-loaded acoustic line source — US 2009/0323997 A1**
   - Patent page: <https://patents.google.com/patent/US20090323997A1/en>
   - Public PDF: <https://patentimages.storage.googleapis.com/95/5f/6d/c12aebbcea8d55/US20090323997A1.pdf>
   - Use: parallel-path / curved-wavefront combiner research.

6. **Horn enclosure for combining sound output — US 2012/0328140 A1**
   - Patent page: <https://patents.google.com/patent/US20120328140A1/en>
   - Public PDF: <https://patentimages.storage.googleapis.com/eb/b2/a3/440760889d293e/US20120328140A1.pdf>
   - Use: layered combiner research.

7. **Coaxial centerbody point-source architecture — WO 2017/083708 A1**
   - Patent page: <https://patents.google.com/patent/WO2017083708A1/en>
   - Use: alternate solution to side-injected MF; adjacent rather than a normal MEH preset.

### Manufacturer documents

1. **Danley SH50**
   - Product page: <https://www.danleysoundlabs.com/products/sh50/>
   - Official PDF: <https://www.danleysoundlabs.com/wp-content/uploads/2022/10/SH50-Spec-Sheet-Rev.-202209301629.pdf>

2. **Danley SH60**
   - Product page: <https://www.danleysoundlabs.com/products/sh60/>
   - Official PDF: <https://www.danleysoundlabs.com/wp-content/uploads/2022/02/SH-60-spec-sheet1.pdf>

3. **Danley SH46**
   - Official PDF: <https://www.danleysoundlabs.com/wp-content/uploads/2022/10/SH46-Spec-Sheet-Rev.-202209301458.pdf>

4. **Danley SH96 / SH96HO**
   - Product page: <https://www.danleysoundlabs.com/products/sh96/>
   - SH96HO product page: <https://www.danleysoundlabs.com/products/sh96ho/>
   - Official SH96HO PDF: <https://www.danleysoundlabs.com/wp-content/uploads/2022/03/SH96HO-Spec-Sheet-Rev.-1-220304-1.pdf>

5. **Danley J1-94 Jericho**
   - Product page: <https://www.danleysoundlabs.com/products/j1-94/>
   - Official PDF: <https://www.danleysoundlabs.com/wp-content/uploads/2024/02/J1-94-Spec-Sheet-Rev.-1-220304.pdf>
   - Official owner manual: <https://www.danleysoundlabs.com/wp-content/uploads/2021/11/Jericho_User-Manual.pdf>

6. **Danley technology overview / white paper**
   - Official technology page: <https://www.danleysoundlabs.com/about/danley-technology/>
   - Public mirror of the author/manufacturer white paper: <https://volucres.fr/AudioHighEnd/Forum/Pavillon%20Conique/Synergy%20Horn.pdf>
   - Caveat: the PDF content is manufacturer-origin, but this URL is a third-party mirror, not the current Danley host.

7. **Yorkville Unity U15**
   - Official legacy page: <https://www.yorkville.com/legacy/product/u15>
   - Official spec PDF: <https://www.yorkville.com/images/products/specsheet/ss_u15.pdf>
   - Official service manual: <https://www.yorkville.com/images/products/servicemanual/sm_u15-u215.pdf>

### Author-origin DIY documents and calculators

1. **Scott Hinson MEH guide**
   - Public PDF mirror: <https://device.report/m/303b9e618394104d6a72e34bc18bfe61e7e118d97ecfd6db8b563819530e533b.pdf>
   - Caveat: author-origin content on a third-party mirror; check redistribution rights before bundling the file or its drawings.

2. **Bill Waslo Synergy Calc V5 / CoSyne**
   - Author index: <https://libinst.com/SynergyCalc/>
   - Author guide PDF: <https://www.libinst.com/SynergyCalc/Synergy%20Calc%20V5.pdf>
   - Author spreadsheet: <https://libinst.com/SynergyCalc/Synergy%20Calc%20v5.xls>
   - Caveat: original buyout drivers are obsolete, and the author says replacement drivers require redesign and prototyping.

3. **Martin J. King 2026 coupled three-driver modeling series**
   - Author index: <http://www.quarter-wave.com/Horns/Horn_Theory.html>
   - Three-driver algorithm:
     <http://www.quarter-wave.com/Horns/MEH_Three_Drivers_Algorithm_05_18_26.pdf>
   - Modeling methods:
     <http://www.quarter-wave.com/Horns/MEH_Modeling_Methods.pdf>
   - Hornresp/Mathcad correlation:
     <http://www.quarter-wave.com/Horns/Hornresp_and_MathCad_Correlation.pdf>
   - Crossover methods:
     <http://www.quarter-wave.com/Horns/MEH_Crossover_Design.pdf>
   - Local implementation audit:
     `docs/threeway-king-2026-math-notes.md`.
   - Caveat: this is the strongest open coupled \(3\times3\) author model found
     in this audit, but it is not peer reviewed or validated against a built
     three-way prototype. The four PDFs do not supply the horn/branch ABCD
     coefficient provider or rectangular-mouth radiation reduction. The
     Hornresp record mapping is source-pinned but remains disabled until an
     actual round-trip fixture passes.

## Prioritized UI/reference families

1. **Shared-horn three-band / stepped summation — calculated**
   - Patent-proven topology, user-selected drivers, solver-owned chambers/passages/stations.
   - Default constraints should include local expansion/cutoff, summed aperture area, cone loading, quarter-wavelength spacing, equalized acoustic path, collision, and printability.

2. **CoSyne-style 1 + 4 + 4 — documented topology / calculated adaptation**
   - Keep the archived driver set and every modern-driver adaptation visibly separate.
   - Require a fresh crossover and port/chamber solve for any substitute driver.

3. **Dual-diaphragm throat + tapped LF — Hinson-style hybrid**
   - A genuine three-band signal path with only one family of cone taps.
   - Useful because it preserves the well-working one-way coax throat/handoff geometry and adds LF passages around it.

4. **Commercial envelope studies**
   - `compact square 50 × 50`, `wide square 60 × 60`, `rectangular 40 × 60`, and `large-format 90 × 60`.
   - Show them as target envelopes and validation benchmarks, never as exact SH50/SH60/SH46/SH96 replicas.

5. **Advanced Jericho-class architecture — research mode**
   - Only after separate tapped-LF and layered HF-combiner solvers exist.
   - It should not share the ordinary direct-tap UI because its physical model is materially different.

## Implementation lessons to carry from one- and two-way work

- Keep one canonical surface/normal/frame system for horn wall, driver seat, passage centerline, and subtractive aperture. A tap must be one connected acoustic volume from cone-side chamber through the solid mount and horn wall.
- Build the mount as a solid first; subtract only the declared acoustic passages, driver clearance, fasteners, and gasket features. A cosmetic “tube” or a transparent/open preview is not acceptable export geometry.
- Solve every band against the same acoustic datum. Equal electrical crossover values do not guarantee equal acoustic arrival; passage length, chamber compliance, and acoustic low-pass phase all matter.
- Never scale driver count from mouth diameter alone. Count feasibility depends on frame packing, chamber volume, aperture area, legal station band, path-length spread, structural web, and horn surface curvature.
- Treat tap station and tap-to-tap spacing as acoustic solver outputs with optional bounded overrides, not free decoration.
- Validate each state with connectivity, watertightness, minimum web, collision, aperture-through-all-layers, path-length spread, local area monotonicity, and an explicit source revision.

## IP, naming, and provenance caveats

- `Synergy Horn`, `Unity`, `CoEntrant`, `Danley`, and product model names may be trademarks. Use them in citations/reference cards, not as generic family names or as claims of affiliation.
- Public product sheets disclose performance envelopes and driver complements, not their internal production geometry. Any reconstructed port/chamber geometry must be labeled **calculated**, **inspired**, or **experimental**, never **exact**, **clone**, or **manufacturer design**.
- Patent publication does not establish freedom to operate. Patent term, continuations, claim scope, ownership, and jurisdiction require a professional legal review before commercial distribution.
- Patent law, copyright in drawings/text, trademarks, and contract/license rights are separate. Do not bundle mirrored PDFs, CAD, drawings, or spreadsheets into the app without checking their licenses.
- Preserve citation, publication/revision date, document hash, units, and whether a value is documented, transcribed, calculated, measured, or inferred.
- Forum projects such as Syn9/Syn10 are useful leads, but no consolidated first-party plan was located in this pass. Do not turn them into presets from forum photos or second-hand dimensions.
- SynTripP, JMOD, Solana, CoEntrant, and the Yorkville U15 horn are not full three-band single-horn MEH references; classify them accurately so users are not misled.
