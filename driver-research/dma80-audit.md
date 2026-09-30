# Dayton DMA80 exact-variant audit — 2026-09-30

Both 3-inch variants are selectable in Manual. DMA80-4 has a reviewed motor set for the existing reduced-model acoustic screen and Assisted generation; DMA80-8 is geometry-only. The 3-inch Assisted filter lists eligible DMA80-4 combinations and explains the DMA80-8 restriction. No new crossover recommendation is supplied.

## Primary manufacturer sources

- [DMA80-4 product](https://www.daytonaudio.com/product/1618/dma80-4-3-dual-magnet-aluminum-cone-full-range-driver-4-ohm) and [specification/drawing PDF](https://www.daytonaudio.com/images/resources/295-586--dayton-audio-dma80-4-specification-sheet.pdf).
- [DMA80-8 product](https://www.daytonaudio.com/product/1619/dma80-8-3-dual-magnet-aluminum-cone-full-range-driver-8-ohm) and [specification/drawing PDF](https://www.daytonaudio.com/images/resources/295-587--dayton-audio-dma80-8-specification-sheet.pdf).
- [Official shared DMA80-8 and -4 CAD archive](https://www.daytonaudio.com/images/resources/3D-Scans/DMA80-8_and_-4_3D_Files.zip), linked by both product pages; includes STEP, STL and DWG, dated July 13, 2026 in the ZIP.

Exact downloaded document and STEP hashes are retained in `records/daytondma80_4.json` and `records/daytondma80_8.json`. The source files remain task-local inspection references and are not redistributed in the app or repository. Source records retain the PDF facts separately from CAD facts.

## Motor eligibility

| Parameter | DMA80-4 | DMA80-8 |
| --- | ---: | ---: |
| Nominal impedance / ohm | 4 | 8 |
| Re / ohm | 4.0 | 7.5 |
| Le at 1 kHz / mH | 0.2 | 0.5 |
| Fs / Hz | 93.5 | 97.6 |
| Qms | 1.97 | 2.06 |
| Qes | 0.51 | 0.61 |
| Qts | 0.41 | 0.47 |
| Mms / g | 3.02 | 2.70 |
| Cms / mm/N | 0.96 | 0.98 |
| BL / T m | 3.7 | 5.1 |
| Sd / cm² | 31.2 | 31.2 |
| Vas / L | 1.31 | 1.34 |
| Xmax / mm | 2.5 | 2.5 |
| RMS rated power / W | 25 | 25 |

The low-frequency motor identity `Qes = 2π Fs Mms Re / BL²` with Mms in kg gives 0.5184 for DMA80-4 (about 1.7% from the rounded published 0.51), but 0.4774 for DMA80-8 (about 21.7% below the published 0.61). The latter is too large to treat as rounding. The authentic -8 set is retained in the mechanical record's `acousticSource`, with an explicit conflict, and is absent from the eligible acoustic motor catalogue. No value is corrected, borrowed from -4, or inferred to make -8 pass. Manual selection/import retains exact variant identity and suppresses Qtc, response, impedance and excursion screening.

DMA80-4 PDF sensitivity is 88.1 dB at 2.83 V/1 m; its current product page says 88.9 dB. DMA80-8 PDF says 85.3 dB at 2.83 V/1 m. These values are not imported as response calibration or relabelled as 1 W sensitivity. Rated excursion displacement Vd (7.8 cm³) is not occupied driver volume.

## Mechanical handoff and conflicts

The drawing's Ø95.5 circle passes through the four bolt centers. It is **not** the frame diameter. The frame measures 80.5 × 80.5 mm. The app retains a conservative circular clearance envelope of `sqrt(2) × 80.5 = 113.844191771 mm`, encompassing even sharp square corners. It does not quietly pack the square chassis in a 95.5 mm circle.

Native OpenCascade parsing of the downloaded STEP succeeds, produces two valid solids, and gives optimal complete bounds `[-40.25,-40.25,-38.1]` to `[40.25,40.25,7.0]` mm. The supplied binary STL has 45,400 triangles and independently matches the 80.5 mm square width/height and approximately 45.1 mm axial extent. Gmsh's default OCC bounding box is loose for this model; the audit uses OpenCascade's optimal bounds, cross-checked against actual STL vertices.

The source PDF shows a 74.5 mm basket width, 3 mm flange callout, 39.1 mm side-depth callout, and four Ø3.8 holes on a 95.5 mm pitch circle. The native STEP instead has Ø4 mm hole edges at x/y = ±33.75 mm, and a Ø75 mm circular feature. These disagreements are stored as distinct `drawing…` and `cad…` reference fields. Canonical hole diameter and pitch-circle fields stay unresolved, so neither the mounting land nor CAD handoff generates drill guides.

The full 45.1 mm CAD axial span is used as the conservative packaging depth. A frontmost-envelope-plane datum with offset zero is explicitly **assumed**, not a verified flange/gasket seat. The nominal 75 mm circular collector passage is an envelope surrogate, not a tolerance-qualified baffle cutout. No exact mounting-seat transform or ready-to-print driver seat is claimed. The export handoff includes these notes, units, source links, hashes and conflicting dimensions for CAD review.

No cone, dustcap or basket interior is reconstructed. The cone-recess control remains a user-entered surrogate (the existing Assisted seed is 20 mm); inserts and actual front-cavity volume still need measured diaphragm geometry. Occupied driver volume is the labelled conservative envelope allowance, not manufacturer displacement. Terminal, lead bend, gasket and fastener clearances remain to be measured.

## Small-size assumptions and verification

Existing supported ranges already preserve the exact frame, cutout, depth, Sd, Fs, Qts and Vas. The 300 mm minimum horn mouth, 20 mm minimum entry, 0.5 L minimum individual rear volume and 5 L minimum shared volume remain model/workflow bounds; adding a 3-inch driver does not imply arbitrarily small horns or chambers are validated. No new range or fabricated acoustic-performance score was introduced.

Targeted tests cover both impedance identities, ambiguous unnamed shared-chassis imports, source preservation through normalization/import, withheld drill guides, 2/4/6-driver mechanical placement, oversized entry projection, oversized rear duct rejection, finite response/impedance/excursion, numerical power conservation, eligible 3-inch browsing, -8 geometry-only behavior and generation with the existing validity warnings. DOM tests are source/interaction checks with stubbed canvas, not rendered browser QA.

A representative generated numerical test uses two DMA80-4s, a DE1090TN, a 375 mm mouth, a user test band of 200–1000 Hz, 1 V RMS per mid and 0.5 L individual rear volumes. It passes the existing sampled mechanical and reduced-model safety checks, with a conservative assembly envelope around 437 × 250 mm. Its approximately 463 Hz compactness reference is exceeded and reported. This is a regression case, **not** a recommended driver pairing, crossover, verified response or fabrication design. Native source parsing and circuit checks do not establish physical fit, acoustic convergence or measurement validation.
