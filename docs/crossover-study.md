# Crossover and compact coax comparison

MEH Studio can now sum supplied complex mid/HF responses, search a bounded set of crossover settings, retain a frozen mid baseline for chamber comparisons, and compare shared-horn versus conventional-coax frequency/polar data. Everything runs locally in the browser. No measurement or HF response is created from a driver name, and none of these calculations qualifies a loudspeaker as validated.

## User workflow

Open **Crossover and speaker comparison** under Design analysis.

1. **Try synthetic example** provides a visibly synthetic 900 Hz mid notch and a hypothetical HF trace with known gain/delay offset. It is a calculation exercise, not data from a driver. It cannot be relabelled measured in the panel.
2. For real work, import mid and HF CSV/JSON traces and complete each source/reference form. CSV columns are `frequency_hz,magnitude_db,phase_deg,angle_deg`; angle is optional and defaults to zero. A metadata comment from this tool's trace export survives CSV round trips. JSON includes source basis, full reference metadata and rows. Download the template to see the schema.
3. Calculate the sum using optional ideal Butterworth 1st order, Linkwitz–Riley 2nd order or Linkwitz–Riley 4th order low/high-pass filters, independent gains, positive delays and polarity. Existing protective filters in measured traces remain present and should not be duplicated unintentionally.
4. Set a band and explicit target level before searching. Search varies HF gain, HF delay, crossover frequency and optionally HF polarity within displayed limits. It previews the best tested settings; **Use tested settings** explicitly applies them. The original settings remain a baseline candidate even if outside the requested search bounds.
5. To study a chamber change, **Capture current mid model**, then **Keep mid as baseline**. Change geometry in the existing chamber study/editor and capture the new mid. Supply a compatible HF trace. Both sums use exactly the same HF data and filters, and the original mid remains frozen with its original geometry and acoustic settings. A failed baseline/reference match is reported instead of silently normalized.
6. In **MEH versus conventional coax**, import A/B complete-system traces and choose the common band and a polar frequency. The tool preserves equal-voltage calibration, reports sampled differences and displays matching polar angles. It does not rank output capability from those curves. Download the measurement protocol before acquiring A/B data.
7. Export result CSV, individual metadata-rich traces, or study JSON. Design exports and named studies can persist the panel snapshot through the editor integration.

## Reference gates

Complex summation requires both source bases to be declared and matching level reference, per-driver voltage and voltage basis, distance and datum, environment, window/smoothing, calibration reference, polar plane, angle, timing reference and `exp(+j omega t)` phasor convention. Original phase/shared timing must be explicitly confirmed. Missing or different metadata blocks calculation.

Measured/simulated mixing requires its explicit checkbox **and** matching references. This is still a mixed model study, never a measured system result. Any normalization of measured data to a model's pressure/distance/timing reference must have been established and documented before import; the checkbox does not establish it. A/B quantitative comparisons require matching source bases and amplitude-related references. Their magnitude-only comparison does not require shared phase timing, although their import schema retains phase for reuse.

These metadata fields are user declarations. The software cannot verify the measurement chain or calibration. Built-in synthetic/model traces retain their known basis/reference fields. The current linked mid capture is invalidated after geometry changes; calculation/search also rechecks fresh broadband options so changed voltage, distance, source phase, passage loss or other acoustic settings cannot silently reuse old traces. A deliberately frozen baseline retains its original input state and options. Imported measurements retain their own provenance and do not become linked to the current geometry.

## Numerical definitions

Frequency interpolation is linear in dB magnitude and unwrapped phase over logarithmic frequency. Unwrapping uses the shortest adjacent phase difference. There is no extrapolation and gaps greater than one octave are rejected. Even a smaller frequency interval can alias rapidly rotating phase from long propagation delay: the user must export sufficiently dense phase samples. This algorithm cannot recover omitted information.

All calculation bands use 101 equally spaced log-frequency samples and must be covered completely by both traces. Ideal filter transfer functions use `s = j f/fc`:

- BW1: `LP = 1/(1+s)` and `HP = s/(1+s)`.
- LR2: square each BW1 transfer function. Opposite HF polarity gives the flat ideal coherent sum for flat input traces; real traces can require different treatment.
- LR4: square each second-order Butterworth function, `LP = [1/(1+sqrt(2)s+s²)]²` and `HP = [s²/(1+sqrt(2)s+s²)]²`.
- Delay `t` multiplies pressure by `exp(-j 2π f t)`, with UI milliseconds converted to seconds. Gain multiplies by `10^(dB/20)` and inversion by `-1`.

The sum is complex pressure addition. The score is RMS dB deviation from the declared level target plus the chosen dB/degree weight times RMS component phase difference. The phase term is weighted at each frequency by `2 min(|M|,|H|)/(|M|+|H|)` so a nearly silent branch has little phase penalty. The search retains the initial result and only replaces it with a lower score. It tests 2–12 samples per continuous variable, up to 3456 candidate settings with both polarities; this is not continuous/global optimization. Deep cancellations use a finite display floor of −300 dB, not a claim of measurable depth.

A/B uses equal log-frequency sampling and reports A−B without arbitrary level normalization. Its normalized polar curves are each relative to that configuration's on-axis level at the chosen frequency; absolute A/B levels are also retained in CSV. Beamwidth is only the connected on-axis −6 dB crossing span, linearly interpolated between supplied angles. Both sides must be bracketed and angular gaps cannot exceed 15°. Missing coverage reports unavailable. No full-sphere directivity index or sound-power estimate is produced.

## Integration

`acoustics/crossover-study.cjs` exports a factory returning parsing, reference-gating, filtering, summation/search, broadband-capture, A/B comparison and export APIs.

`acoustics/crossover-panel.cjs` exports a factory accepting `root` with `MEHCrossoverStudy`. `init(host, callbacks)` accepts `getDesign`, `getBroadband`, `getFrontStudy`, `onChange`, and optional `download`. It returns `snapshot`, `restore(saved)`, `update(analysis)`, `calculate()`, `compare()`, `result`, `search` and `dispose()`.

Snapshots contain the source traces, references/provenance, frozen baseline, options, bounds and comparison settings. Computed results are intentionally refreshed after restore. A linked capture carries a geometry signature and its full normalized model options. User-generated sources and labels are escaped in the UI.

## Verification and scope

Analytical checks cover flat BW1/LR2/LR4 sums, known delay cancellation, polarity inversion, dB/phase interpolation, metadata gates, known gain/polarity recovery and angular coverage. JSDOM checks cover the example, persistence, generated-source protection, geometry/options invalidation, search application and download behavior. These are automated numerical/DOM checks, not rendered browser QA or physical validation.

No driver impedance-dependent passive network, full three-dimensional mid/HF radiation, thermal compression, distortion, safe output level, measured MEH-versus-coax benefit or resonance/crossover validation is asserted. A real speaker still needs calibrated branch/combined measurements and off-axis checks.

Primary references:

- [Siegfried Linkwitz: Active Filters](https://www.linkwitzlab.com/filters.htm) — filter transfer functions and electrical/acoustic crossover distinction.
- [Siegfried Linkwitz: Crossovers](https://www.linkwitzlab.com/crossovers.htm) — sum and phase behavior of first-order and Linkwitz–Riley alignments.
- [REW: Making Measurements](https://www.roomeqwizard.com/help/help_en-GB/html/makingmeasurements.html) — electrical/acoustic timing-reference acquisition.
- [REW: SPL and Phase Graph](https://www.roomeqwizard.com/help/help_en-GB/html/graph_splphase.html) — measured timing/phase changes and minimum-phase substitution caveats.
