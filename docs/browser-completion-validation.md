# Build 14: browser-native design and fabrication

This release builds on driver-mounting release `80a4e4257cd1e5e36a9077dc92c114cb20205499`. Its new user workflows run in the single offline HTML file. The bundled Manifold geometry engine and WebAssembly binary do not require a separate CAD installation or network request. Normal printer preparation and physical measurements remain outside a browser design tool.

## Delivered scope

| Nick's request | Browser workflow | What remains external |
| --- | --- | --- |
| Printable geometry and mounting | Joined horn/collector material, actual entry openings, sourced removable driver supports, detachable individual rear pods or supported shared shells/removable lids, build-volume sections, safe alignment dowels, local STL/faceted STEP, installed OBJ and assembly manifest. | Test prints, actual driver fit, net rear air volume, seals, strength, fastener access and printer settings. Unsupported geometry is refused. |
| Resonance and crossover | Existing chamber geometry studies plus imported complex mid/HF pressure summation, filters/gain/delay/polarity, bounded searches and a retained baseline for chamber changes. | Compatible HF data and measurements of the finished speaker; a model sum does not validate resonance treatment. |
| Compact MEH versus coax | Matched-reference A/B frequency and angular comparisons, conditional −6 dB beamwidth, calibration/provenance gates, data templates and a measurement protocol. | Real A/B measurements, distortion, compression and maximum output. The tool supplies no invented speaker measurements. |
| Passive cardioid | Independent low-frequency coupled motor/rear-air/slot/exterior fixture, measured sheet impedance import, material sensitivity, polar and front/rear results with regime and energy checks. | Actual horn/cabinet diffraction, installed material behavior and measured directivity. This fixture is not the complete MEH field model. |
| ABEC/AKABAK | Prior solver export workflows retained. | A proprietary AKABAK import and solve remains unverified and is outside this no-external-application release. |

All three studies persist in design JSON and named studies. New designs and older files clear prior study data. Model captures invalidate when their geometry or acoustic settings change. Browser-storage failure produces a visible instruction to download JSON rather than silently losing imported data.

## Verification

- **320 automated tests passed, zero failed.** Coverage includes analytical filter behavior, calibration/reference gates, stale-state handling, independent passive-slot circuit/radiation limits, power conservation, material conventions, geometry/print gates, source access, segmentation and persistence.
- After final embedding, **18 focused checks passed**, including initialization without network access, a complete five-part fabrication build in the browser JavaScript realm, actual binary-STL topology/volume, cross-panel save/reload/import/reset, captured-mid acoustic settings and exact source/embed parity.
- Independent OpenCascade import checked the actual exported ZIPs. The complete unsplit fixture contains **five valid solids / 52,282 triangles**; the split fixture contains **30 valid solids / 60,496 triangles** (18 material sections and 12 dowels). Every STEP part imports as one valid positive-volume solid. Packed STL edges are paired and consistently oriented; STL/STEP volumes agree. Air and source bolt probes classify outside material: **300 checks** for the unsplit package and **1,080** for the split package.
- Both native packages use the same normalized design geometry. The split example contains nine seam records; six thin/curved seams explicitly require manual alignment. Material and driver-service interfaces remain distinct from permanently bonded print seams.
- The portable editor retains 14 script blocks and the unchanged canonical-geometry SHA-256 `c79b805955f8037f3a9e234e80e7b3d6c76e37387223f039f46cec09fd44867e`. Manifold 3.5.4's WASM/loader hashes and actual ZIP results are recorded in the [machine-readable report](browser-completion-validation.json).

Source-level and JSDOM checks are not rendered browser QA; the existing browser-policy restriction remains. Independent STEP checks use an existing development runtime; that runtime is not needed by users of the editor. No physical print, strength, acoustic measurement or proprietary solve is claimed.

## Reproduction

```
npm run build
npm test
node scripts/export-fabrication-review.cjs /path/to/review-output
python -B tests/verify-fabrication-native.py /path/to/review-output/MEH_fabrication.zip /path/to/review-output/void-probes.json
```

The final command requires an independently prepared OCP environment. No native mesher or acoustic solver equation is changed by this release. Canonical geometry implementation and its frozen spatial-result provenance remain unchanged.
