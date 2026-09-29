import json,argparse,math
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('data');p.add_argument('output');a=p.parse_args();src=Path(a.data);out=Path(a.output);repo=Path(__file__).resolve().parents[1]
load=lambda name:json.loads((src/name).read_text())
s=load('study-summary.json');baseline=load('baseline.json');ref=load('qualified-front-reference.json');cmp=load('surrogate-vs-fem.json');bench=json.loads((repo/'benchmarks/results/summary.json').read_text());data=json.loads((repo/'acoustics/data/current-insert.json').read_text())
sm=s['baseline'];g=s['geometry'];points=[r for r in data['rows'] if r.get('qualified')];changes=[r['qualification']['convergence']['mediumToFineMatrixChange'] for r in points]
band=[r for r in cmp['rows'] if 100<=r['frequencyHz']<=700]
maxband=max(abs(r['splDeltaDb']) for r in band)
area=s['candidates']['area'];table='\n'.join(f"| {c['value']:.0f} | {math.sqrt(4*c['value']/math.pi):.2f} | {c['summary']['bandRippleDb']:.3f} | {c['summary']['maximumPortVelocityPeakMS']:.3f} | {c['summary']['maximumExcursionPeakMM']:.4f} |" for c in area if c['available'])
review=f'''# MEH acoustic prototype — Build 11 review

The prototype now calculates the saved four-mid design, compares feasible entry/chamber changes, and has reproducible agreement with two authentic classical Hornresp reference cases. It does **not** yet establish full four-side-port MEH accuracy or measured loudspeaker performance.

## Practical sizing decision

Keep the current **1,650 mm² entry per mid (45.835 mm diameter), 8 mm tube setting, 28.05 mm standoff and 147 mm entry station** as the reference. The model supports investigating **1,900–2,200 mm² (49.2–52.9 mm diameter)** for entry-speed margin. The modeled flatness benefit is too small to justify declaring either a better acoustic design.

At 1 V RMS per mid, 3 m from the retained mouth plane, over 200–700 Hz:

| Entry area mm² | Round diameter mm | Sampled ripple dB | Maximum entry speed m/s peak | Maximum travel mm peak |
|---:|---:|---:|---:|---:|
{table}

Relative to baseline, 1,900 and 2,200 mm² reduce in-band speed about 13% and 24%; ripple improves only about 0.12 and 0.23 dB. Shrinking to 1,200 or 1,450 mm² raises speed without a useful output benefit. The speed is a section average, not the local maximum inside the insert gap.

Moving all entries to 160 mm is a second study candidate: roughly 0.76 dB less ripple but about 0.37 dB less mean output and 1.39 dB less at 700 Hz in the current sweep. Moving to 175 mm removes still more upper-band output; it does not raise the 200 Hz floor. A full horn solution and actual HF handoff are needed before choosing these positions. Changes among the tested tube lengths and front volumes affect in-band ripple by only tenths of a decibel.

The prototype rejects impossible candidates, including the 3 mm tube setting outside the editor bounds and the 120 mm entry station with overlapping frame envelopes. The volume sweep changes physical standoff; it does not simply overwrite cavity compliance. The 8 mm tube setting represents **11 mm of modeled tube including the 3 mm land**. Baseline cavity air excluding the tube is **{g['frontCavityCM3']:.3f} cm³**; total editor front air is **{g['frontTotalCM3']:.3f} cm³**.

![Port sizing comparison](MEH_Port_Sizing_Comparison.png)

## Exact saved design and conventions

The input is the supplied MEH_design_study.json, byte SHA-256 `{s['inputSha256']}`. Four B&C 6NDL38 motors share 108 L of sealed rear air. The saved 1 V RMS drive is used; the wizard's 2.83 V is not substituted. Insert opening, clearance and geometry are read directly from the saved state. The requested 87 mm opening corresponds to an effective geometric opening of {g['effectiveOpeningMM']:.3f} mm in the canonical insert; this is recorded separately.

The brief says 100–700 Hz while the current design says low target 200 Hz. The default ranking uses 200–700 Hz and exposes both edges. A 100–700 Hz sensitivity is included. The stored SPL targets are zero, so no required SPL or global optimum is invented. Ranking minimizes sampled ripple among candidates that satisfy entered excursion and speed limits; all curves retain the same drive and are not normalized to match.

Internal pressure, voltage and volume velocity are RMS phasors with exp(+jωt). Cone excursion and entry speed are peak. Electrical impedance is V/I per mid. Entry acoustic impedance is pressure/volume flow and includes mutual horn loading. SPL is the uniform baffled circular-aperture axial integral at the stated distance, using the **same mouth flow and radiation load** as the interior network. A separate power-equivalent SPL curve uses solved acoustic power over a hemisphere.

The retained 1D horn plane is z={g['mouthZMM']:.3f} mm, diameter {2*g['mouthRadiusM']*1000:.3f} mm. The nominal rolled lip is 700 mm across and returns toward the throat; it is outside the monotonic 1D horn. This omission is explicit. The transverse-mode reference is {g['transverseReferenceHz']:.1f} Hz, not a demonstrated physical validity cutoff. Four source phases/axial locations remain separate in the network, but equal-plane sources share pressure and azimuthal fields are unresolved.

No HF source, HF passive acoustic load or crossover is assumed from the saved BMS catalog name. Those need calibrated source/impedance or common-reference measured response data. Source phase/delay sensitivities are supported; a zero-drive motor remains a passive coupled load.

## What the curves establish

![Current design curves](MEH_Baseline_Curves.png)

The default curve uses a geometry-derived segmented collector/tube, residual cone cavity, explicit equivalent insert collection inertance, and estimated linear viscous/thermal loss. It is a fast sizing approximation, not 2D or 3D FEM. No coefficients were fitted to the FEM samples. Added horn-junction length defaults to zero; the saved older lumped-model correction of 1.4 radii is retained as a separate sensitivity. A generic unflanged-pipe coefficient is not authenticated for this junction.

The native local front-passage reference now has **{len(points)} exact qualified frequencies from {points[0]['frequencyHz']:g} to {points[-1]['frequencyHz']:g} Hz**. These are fresh solves on three distinct meshes with 22,695, 47,628 and 98,721 unknowns, on the same frozen boundary. The medium-to-fine matrix change spans **{100*min(changes):.5f}%–{100*max(changes):.5f}%**. Qualification also checks loaded transfer/impedance, phase, reciprocity, passivity, residuals, volume and proximity to closed-domain modes. Dots are not interpolated FEM results. A 50 Hz spacing can still miss narrow features, and port convergence does not establish pointwise field convergence.

With both front models lossless and no extra junction correction, reduced-model versus local-FEM SPL differs by at most **{maxband:.3f} dB at solved points through 700 Hz**, and **{cmp['metrics']['maxAbsSplDb']:.3f} dB over the full sampled comparison**. This is a model discrepancy, not a physical error bound. Both still share the reduced horn/rear/radiation model. Mesh consistency must not be confused with physical calibration.

Catalog Mms=17 g is retained by default. An illustrative two-face piston air correction of 1.749 g is a sensitivity, not an authenticated Mmd value. Changing it preserves catalog-derived compliance and mechanical resistance. The native projected cone area is about 0.0402% below catalog Sd; the power-conjugate area transformation is applied once. Sloping cone surface area is not substituted for Sd.

The default sampled 80–1500 Hz model gives {sm['maxVoltageAllowed']:.2f} V per mid at the selected linear clearance/speed limits; the limit is dominated by 80 Hz travel. This is **not an operating rating**: absent filters, frequencies below 80 Hz, local gap flow, nonlinear behavior and model uncertainty remain unassessed. The separate band-only headroom must not be used as a full-range limit. The 17 m/s peak entry-speed threshold is editable screening input, not a proven turbulence boundary.

![Model assumptions](MEH_Model_Uncertainty.png)

## Authentic Hornresp evidence

Two published input/output pairs from Bjørn Kolbrek's MIT-licensed HornSimulation package are preserved unchanged with byte hashes, source/license information and the native versions. The candidate uses the existing conical-cell horn network plus a **benchmark-specific synthetic motor adapter with explicit Mmd**. It runs at all 533 exact native frequencies without fitted gain, delay, loss or driver parameters. Over 20–1000 Hz (274 native samples):

| Maximum absolute error | Exponential | Conical + exponential |
|---|---:|---:|
| Power-equivalent SPL | {bench['benchmarks'][0]['maxSplErrorDb']:.6f} dB | {bench['benchmarks'][1]['maxSplErrorDb']:.6f} dB |
| Electrical impedance magnitude | {bench['benchmarks'][0]['maxElectricalImpedanceErrorOhm']:.6f} Ω | {bench['benchmarks'][1]['maxElectricalImpedanceErrorOhm']:.6f} Ω |
| Peak excursion | {bench['benchmarks'][0]['maxExcursionErrorMM']:.8f} mm | {bench['benchmarks'][1]['maxExcursionErrorMM']:.8f} mm |

Raw phase agreement is included as a diagnostic; the export's Delay-tool state is not independently recorded, so phase is outside the acceptance gate. Segmentation at 64/128/256 cells demonstrates convergence. Full-band residuals are retained. These are authentic published exports, **not a fresh Hornresp GUI run**. New native-format conical and Nd/ME1 records, import instructions and comparison harness are supplied; import round-trip and new multi-entry capture remain pending.

Hornresp's main calculation uses area-law/electroacoustic treatments, including plane/isophase distinctions; its separate 2D Wavefront Simulator is not evidence that the frequency-response solver is a 2D field solution. The author's multiple-entry description is axisymmetric, so it cannot silently validate four discrete azimuthal entries. See [Hornresp help](https://pearl-hifi.com/06_Lit_Archive/14_Books_Tech_Papers/Kolbrek_Bjorn/Horn_Response_Manual.pdf), [McBean's MEH statement](https://www.diyaudio.com/community/threads/hornresp.119854/page-807), and [Kolbrek's published model](https://github.com/bkolbrek/HornSimulation). Detailed source-linked research is in the package's docs/hornresp-benchmark.md and docs/acoustic-audit.md.

![Authentic benchmark](Hornresp_Benchmark_Comparison.png)

## Use and reproduce

Open **MEH_Acoustic_Review.html**: the supplied design loads automatically with Acoustic sizing open. Select a curve, open Size entries and chambers, compare candidates, preview a row, then use its geometry if desired. Changing geometry invalidates old FEM overlays. Targets, end correction, loss, mass and source phases live in a disclosure. Curve export saves baseline, native samples and candidate data with conventions. The original qualified passage/700 Hz field panel remains available.

The source package is based exactly on Build 11 commit `52efe6ad23a8aa4de97099b752c34becafc1cc49`; it preserves the frozen geometry kernel and prior geometry regressions. No parent checkout, public main or live Site is modified. Native environment and original mesh files were read-only inputs. Browser-rendered QA remains unavailable under the administrator policy; source/behavior tests and generated scientific figures were checked.

Unzip MEH_Acoustic_Prototype.zip and run from its source directory:

```sh
node acoustics/embed.cjs
node --test --test-concurrency=1 tests/*.cjs benchmarks/benchmark.test.cjs
node benchmarks/run.cjs
node scripts/reproduce-acoustics.cjs examples/user-saved-study.json study-results
python3 scripts/plot-acoustics.py study-results figures
```

Node uses only standard modules. Plotting needs NumPy/Matplotlib. Native FEM needs the separately documented complex DOLFINx/PETSc/Gmsh environment. scripts/expand-native-reference.py accepts that Python path plus the three frozen mesh files; outputs/caches stay in a caller-selected directory. Recreate meshes using native-front-fem/README.md when necessary. Qualification records and raw numerical results are retained in the package.

The sibling mesh-export task supplies a versioned SI geometry/boundary manifest with four actual source positions, projected areas and separate mouth/exterior tags. The acoustic validator checks this handshake without treating geometry as solved pressure data. The full spatial motor adapter requires a separately qualified common front/horn/exterior impedance operator and matching observer transfer data; no authentic full-system operator is supplied yet. A practical next spatial step is coupled 3D interior FEM plus exterior BEM/PML, preserving the rolled lip and discrete sources. Axisymmetric methods remain verification/approximation tools, not replacements for those four entries.
'''
(out/'MEH_Acoustic_Study.md').write_text(review)
print(out/'MEH_Acoustic_Study.md')
