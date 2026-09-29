# Existing cone motor audit

Reviewed 2026-09-29. Scope: the 20 cone-driver records present before the new 8/10-inch additions. The original generated motor map had 2 entries (8NDL51 and 10NDL64); the acoustic engine separately held 5NDL38 and 6NDL38. This change supplies 18 exact-variant datasets to the generated map: 16 newly usable existing cones and the 2 legacy B&C datasets with fresh PDF provenance. The two existing 8/10-inch datasets remain unchanged.

All 18 added records use the exact manufacturer 8-ohm sheet. All required motor fields are explicit manufacturer values; none are copied between models. The PDFs were actually downloaded, hashed, rendered, and the relevant parameter tables inspected. `outputs/manufacturer-sources/manifest-motors.json` identifies each saved document, original URL, access date, SHA-256, inspected page, and rendered preview. The source folder is a local research archive; no redistribution permission is asserted and PDFs should not be added to the public site/repository.

## Integration

- Merge `motor-additions.json` into `motors.json` by ID, then regenerate the catalogue. These exact-variant datasets replace the engine-only 5NDL38/6NDL38 copies without changing their numeric values.
- Keep the reviewed variant gate: record ID and `review.variant` must match the selected motor ID and `8 ohm` record; required root fields must be finite/positive (Le may be zero).
- Retain source dimensions separately from motor identity. Complete motor data does not make a approximate basket, cone profile, mounting datum, or collision envelope exact.
- Do not copy missing physical driver displacement from recommended box volume or Sd*Xmax. `driverVol` is supplied only for ten additions whose sheets explicitly state occupied/displaced body volume. Existing approximation labels must remain visible for the others.

## Coverage and transcription

Units: Sd cm2, Fs Hz, Vas L, Re ohm, Le mH, Mms g, Bl T m, Xmax one-way mm, power W nominal/AES. Q values are dimensionless. `publishedMechanical` retains additional published compliance/loss/moving-mass values; it does not override the existing engine derivation.

| Exact model (all 8 ohm) | Sd | Fs | Qts | Vas | Re | Le | Mms | Bl | Qms | Xmax | W | Sheet page |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B&C 5NDL38 | 95 | 80 | 0.36 | 4.3 | 5.5 | 0.64 | 11 | 9.2 | 9.2 | 3.5 | 90 | 2 |
| B&C 6NDL38 | 132 | 72 | 0.42 | 7 | 5.2 | 0.6 | 17 | 9.5 | 11.5 | 6 | 150 | 2 |
| B&C 6MDN44 | 132 | 140 | 0.4 | 2.7 | 5.4 | 0.47 | 11 | 11 | 2.8 | 2.5 | 200 | 2 |
| FaitalPRO 5FE120 | 84 | 65 | 0.48 | 5.4 | 5.4 | 0.41 | 11 | 6.9 | 7.4 | 5.25 | 80 | 1 |
| FaitalPRO 5PR160 | 85.2 | 90 | 0.31 | 3.7 | 6.1 | 0.3 | 8.5 | 9.6 | 4.4 | 5.1 | 120 | 1 |
| FaitalPRO 6FE200 | 131 | 120 | 0.67 | 3.6 | 5.9 | 0.4 | 11.5 | 8.2 | 6.2 | 4.67 | 130 | 1 |
| FaitalPRO 6PR150 | 137 | 100 | 0.34 | 4.9 | 5.5 | 0.28 | 13.5 | 11.6 | 8.8 | 2.65 | 150 | 1 |
| FaitalPRO 6PR160 | 130 | 90 | 0.33 | 5.9 | 5.9 | 0.28 | 12.5 | 11 | 6.6 | 5 | 120 | 1 |
| Beyma 5P200Fe | 95 | 72 | 0.33 | 5.7 | 5.2 | 0.6 | 10 | 8.5 | 7.5 | 5.7 | 150 | 1 |
| Beyma 5P200Nd/N | 95 | 77 | 0.23 | 4.8 | 5.3 | 0.28 | 11 | 10.5 | 7.31 | 5.7 | 150 | 1 |
| Beyma 6P200Fe | 135 | 58 | 0.26 | 11.1 | 4.9 | 0.3 | 17 | 10.5 | 4.6 | 5 | 200 | 1 |
| Beyma 6P200Nd | 135 | 56 | 0.29 | 11.9 | 5.3 | 0.6 | 17 | 10.5 | 3.7 | 5.5 | 200 | 1 |
| 18Sound 6ND410 | 143 | 120 | 0.24 | 6.2 | 5.9 | 0.67 | 8.2 | 11.6 | 2.2 | 2 | 180 | 2 |
| 18Sound 6NMB420 | 130 | 110 | 0.33 | 6.1 | 5.3 | 0.1 | 8.5 | 9 | 2.7 | 3 | 200 | 3 |
| 18Sound 6NMB900 | 130 | 95 | 0.32 | 10.3 | 5.2 | 0.1 | 7.4 | 8.5 | 2.87 | 3 | 200 | 2 |
| Sica 6 N 2.5 PL | 122.7 | 80 | 0.27 | 4.9 | 6.2 | 0.62 | 17.1 | 13.5 | 3.05 | 4.5 | 300 | 1 |
| Celestion TF0615 | 153.94 | 104.7 | 0.608 | 6.41 | 7.08 | 0.47 | 12.09 | 8.85 | 3.949 | 1.75 | 100 | 1 |
| Celestion TF0512HE | 78.54 | 84.7 | 0.536 | 3.46 | 5.42 | 0.28 | 8.89 | 6.71 | 9.225 | 4.75 | 75 | 1 |

## Physical derivations and consistency checks

The engine uses `Cms = 1 / ((2*pi*Fs)^2*Mms)` and `Rms = 2*pi*Fs*Mms/Qms`, with Mms in kg. The derived values and exact formulas are recorded per motor. The audit also checks `Qes = 2*pi*Fs*Mms*Re/Bl^2`, `Qts = Qes*Qms/(Qes+Qms)`, and `Vas = Cms*rho*c^2*Sd^2`; the last audit uses rho=1.2041 kg/m3 and c=343 m/s. It is a comparison at a stated reference air condition, not a correction to the manufacturer sheet.

Published rounding and measurement conventions mean these independently printed parameters need not close exactly. The original numbers are retained. The following differences are sufficiently large to call out:

| Model | Derived Qes vs published | Derived Qts vs published | Derived Vas vs published |
|---|---:|---:|---:|
| B&C 5NDL38 (8 ohm) | -2.9% | -3.9% | +7.0% |
| B&C 6MDN44 (8 ohm) | -6.1% | -6.5% | +7.4% |
| Beyma 5P200Fe (8 ohm) | -7.0% | -5.4% | +9.6% |
| Beyma 5P200Nd/N (8 ohm) | +6.6% | +7.5% | +3.4% |
| Beyma 6P200Nd (8 ohm) | -10.1% | -8.0% | +3.1% |
| 18Sound 6NMB900 (8 ohm) | -11.7% | -10.6% | -11.8% |

18Sound 6NMB900 has the largest differences in this set (Qes -11.7%, Vas -11.8%). Beyma 6P200Nd has Qes -10.1%. These are source inconsistencies, not swapped-model data. They are suitable for a clearly qualified preliminary circuit model, but close-margin optimization should use manufacturer clarification or measurements of the exact production sample. No tolerance was invented.

Other important source distinctions:

- Beyma mass in kg was converted to g, Sd in m2 to cm2, and compliance in micrometre/N to mm/N. Sica code Z004080 explicitly identifies the 8-ohm 6 N 2.5 PL; 231 micrometre/N equals 0.231 mm/N.
- FaitalPRO Mmd is kept separate from Mms. The current engine consumes Mms; replacing it with Mmd silently would change the air-loading convention.
- Xmax definitions differ by maker. Faital uses winding/gap plus one-third gap, Beyma uses plus gap/3.5, Celestion plus one-quarter gap, and Sica specifies a 10% THD criterion. These values must not be presented as interchangeable measured distortion limits.
- Beyma 5P200Fe publishes Vd=49 cm3 although its listed Sd*Xmax gives 54.15 cm3. Vd is not used; Xmax is retained at the published 5.7 mm.
- Beyma 6P200Fe shows sensitivity 94 dB in its feature list and 93 dB in the technical table. Neither sensitivity figure is used to predict horn output.
- 18Sound printed continuous-power values are inconsistent with their +3 dB definition (240 W vs 180 W nominal for 6ND410; 260 W vs 200 W for 6NMB420/900). Only explicit nominal ratings are loaded.
- Celestion TF0512HE is marked OEM Only on the official product page. Dataset completeness does not establish retail availability.

## Eligibility and remaining limitations

No wrong-model numeric fallback was found in the inspected identity check: an explicit selected ID is compared before numeric Sd/Fs/Qts/Vas matching. The material integration issue was the split between legacy inline motors and the generated motor map; these additions remove that evidence gap. The parent task is strengthening the generated map gate to require matching reviewed ID/impedance and valid required fields.

A complete T/S dataset enables the existing preliminary impedance/excursion/chamber circuit only. It does not establish an appropriate low-frequency goal or upper crossover, measured response in an MEH collector, distortion, power compression, native simulation equivalence, or qualified acoustic performance. Mechanical eligibility still depends on each record's envelope, flange, mounting holes, terminals, and orientation review. Cone and dustcap profiles remain approximate or unresolved unless the geometry record provides independent source evidence.

## Verification

All 18 additions pass exact ID/variant, finite required values, positive motor values, exact archived PDF SHA-256, and derived Cms/Rms/formula consistency checks. All 18 relevant manufacturer PDF parameter pages were rendered and inspected. This focused subtask does not modify the runtime or mechanical records; the parent runs the integrated catalogue and geometry tests.
