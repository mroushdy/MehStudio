# Broadband MEH engineering model

This prototype adds useful continuous-frequency **reduced-model calculations**, not a validated broadband spatial result. It retains the existing coupled motor, multi-entry axial horn and rear-cavity equations. A new explicitly labelled equivalent front passage supplies a reciprocal passive two-port at each requested frequency. The previous spatial-data API continues to reject missing or stale matrices; its no-fallback rule has not been weakened.

The actual saved offset insert remains the default design. Its front cavity is 181.111 cm³, with a further 18.121 cm³ in the physical entry tube; requested opening 87 mm becomes an actual equivalent opening of approximately 91.002 mm in the existing geometry. The nominal 1,650 mm² entry has a polygon section of 1,647.351 mm². Those are distinct quantities, not interchangeable source areas.

## What is solved

The convention is `exp(+jωt)`, with RMS voltage, pressure and volume velocity. Internal dimensions use SI. Displacement and section velocity limits are reported as **peak**, hence the explicit factor of √2. Each driver has its own complex terminal drive, piston flow and entry flow. One shared 108 L rear compliance acts on the sum of piston flows. The existing solver simultaneously resolves motor back-EMF, front loading and horn mutual impedance. A muted driver remains a coupled physical branch.

The horn is a sequence of lossless conical Webster cells derived from the saved forward profile. Separate axial source nodes couple through its impedance matrix. At a common axial position all sources see one pressure. This does not resolve their four azimuthal locations, higher modes, their local junction fields or circumferential interference. Per-source phase and delay are real electrical drive changes, not a substitute for those missing fields. Different entry positions recalculate each local passage and its horn location, but their **joint mixed-station mechanical fit is not established** by the independent station geometry checks.

The horn implementation stops at maximum axial position, approximately 358.704 mm, with retained radius approximately 304.837 mm. The returning lip ending at nominal radius 350 mm is excluded. Mouth loading and radiated pressure both use the retained radius, avoiding an inconsistent 700 mm radiating disk attached to a smaller network termination.

## Equivalent front passage

The front path contains the following terms, in order from piston to horn:

1. A shunt compliance for residual cone-side air: exact editor front-cavity volume minus the collector-loft volume.
2. An optional insert collection series impedance from a kinetic-energy reduction of uniform cone injection into a thin annular gap.
3. A cascade of symmetric series–shunt–series acoustic cells following the actual collector sections, centre offset, section area and axial volume. Volume is preserved under segmentation; an oblique centreline changes inertance without incorrectly multiplying cavity volume.
4. A segmented physical neck of length `neck + 3 mm` and actual polygon section.
5. An optional **additional horn-junction** inertance `ρ × coefficient × sqrt(S/π) / S`.

The insert collection term uses equivalent opening radius `a`, piston radius `R`, axial gap `h`, cone slope `s`, and

```
Mcollection = ∫[a,R] ρ (1+s²) / (2π r h) × [1 − r²/R²]² dr .
```

The squared flow fraction comes from kinetic energy when outer annular piston injection collects toward the opening. It is a concentric equal-area reduction. It does not represent the actual eccentric slot flow, distributed cavity modes, local gap velocity maxima, corner separation or breakup. Actual eccentricity affects the collector centreline, but the annular term does not thereby become a 3D model. No parameters were fitted to the supplied FEM points.

For each segment, acoustic inertance is `ρ L/S`, compliance is `V/(ρ c²)`. Linear resistance uses the greater of a circular Poiseuille estimate and a thin-boundary-layer estimate. A positive thermal conductance is added from the estimated thermal penetration depth. The adjustable `lossScale` multiplies those dissipative estimates. This is a passive engineering loss model, not a full Kirchhoff narrow-gap calculation. The insert gap uses a slit-type low-frequency resistance estimate. Turbulence and amplitude-dependent losses are not solved.

Cascaded transfer matrices obey `[pL, QL] = T [pR, QR]`, where `QR` points out of the domain. Conversion to an impedance matrix with **both flows into the domain** is

```
Z11 = A/C,  Z12 = Z21 = 1/C,  Z22 = D/C .
```

This preserves the reciprocal passive matrix convention expected by `coupled-system.cjs`. Tests independently recover a uniform cylindrical duct and the zero-frequency compliance of the complete front volume.

### End correction is a sensitivity, not a fitted constant

The new model defaults to zero additional junction correction. The collector and full physical tube are already explicit. The saved legacy `acousticScreen.endCorrection = 1.4` belonged to the old lumped model's assumed ends and is therefore **not automatically inherited** as an equivalent junction correction. Saved drive, mouth/throat terminations and rear-loss assumptions are inherited. New `acousticWorkbench.options` or explicit API options can supply a junction coefficient.

A coefficient of 0.61 is the familiar unflanged open-pipe scale, but this side entry terminates inside a horn. It is not a validated value for this junction. Sweeps of 0, 0.61 and the legacy 1.4 show model sensitivity; they cannot establish which is correct. The qualified native local-domain matrix contains its entire physical tube and receives no extra local neck or end term in `sparseReference`.

## Driver moving mass audit

The B&C catalog Mms is 17 g and includes its measurement air loading. Cms and Rms are derived using that catalog mass and the catalog Fs/Qms. Coupling a resolved front domain to an unchanged Mms may count some free-air inertance twice. Conversely, subtracting a guessed air mass as though measured Mmd were known would also be unjustified.

The default correction is zero, explicitly labelled. `movingMassCorrectionG` is an optional sensitivity: the solver subtracts that mass from mechanical inertia while **preserving Cms and Rms**. Algebraically it subtracts `jω Δm/Sd²` from the piston diagonal of the supplied acoustic matrix. This is a lossless mechanical compensation, not a change in acoustic loss. Reported physical front pressure adds the compensation back. A test compares this implementation against a direct mechanical mass change and obtains the same mouth flow and physical piston pressure.

The low-frequency baffled-piston estimate for two faces is approximately 1.749 g for this Sd. It is an assumption to test, not measured Mmd. Dense spatial solving or refined segmentation does not eliminate this convention uncertainty.

For native front results, projected cone source area differs slightly from catalog Sd. The congruence transform `Zcatalog = diag(Sprojected/Sd, 1) Znative diag(Sprojected/Sd, 1)` preserves power and the physical velocity convention. Entry velocity is reported with the polygon cross-section area. The native interface has a slightly larger actual nonplanar surface area, so this is section-average velocity rather than its uniform normal FEM boundary velocity.

## Radiation and curves

The solved mouth volume velocity and the existing baffled-piston radiation impedance represent one coupled interior/exterior boundary. On-axis pressure is the exact Rayleigh integral for a uniform baffled disk at distance `d` from that mouth plane:

```
p(d) = ρ c Qmouth / (π a²) × [exp(−jkd) − exp(−jk sqrt(d²+a²))] .
```

This includes propagation phase and a finite-distance aperture correction. It remains an assumed uniform disk, not a full exterior horn-field result. The same `a` is used in the load and the pressure integral. With a matched mouth termination, this physical pressure field is not defined and `splDb`/`phaseDeg` are null.

A separate `powerSplDb` converts solved mouth radiation power into hemisphere-equivalent pressure using `p² = W ρc / (2π d²)`. It is labelled separately from on-axis SPL. These curves can differ substantially once the aperture becomes directional. An authentic Hornresp comparison must select its intended power/solid-angle or directional output and align reference distance and phase, rather than comparing different quantities under the same SPL label.

The model also returns per-driver complex electrical impedance, entry and piston acoustic impedances, phase, peak excursion, entry section velocity, mouth flow and acoustic power, and electrical/acoustic power balance. There is no HF response or crossover: a saved compression-driver name alone supplies neither a calibrated source nor its passive loading.

## Tuning and constraints

Sweeps accept explicit values for port area, physical neck length, front-cavity volume excluding tube, standoff or axial entry position. Every candidate runs the existing geometry analysis. A front-volume request changes actual standoff and verifies the resulting volume; it never only rescales a compliance. Clamped dimensions, invalid collector depth, failed insert clearance, overlapping driver envelopes, negative frame clearance and insufficient entry spacing are rejected.

Default target band is the saved `lowTarget = 200 Hz` to the explicit provisional study upper edge of 700 Hz. The full imported file may also retain a wizard 100–700 Hz brief. Neither constitutes a measured crossover. Both band edges are user-adjustable; they are sampled explicitly when inside the frequency range. Default peak excursion is the smaller of catalog Xmax and insert clearance minus a provisional 1 mm margin: 1.75 mm for the saved insert. The 17 m/s section-velocity target is an editable engineering threshold, not a universal turbulence boundary.

The ranking uses sampled in-band on-axis SPL ripple plus excursion/velocity over-limit penalties. It selects among feasible sampled candidates only. It does not claim a global optimum, flatten response through a missing crossover, or incorporate physical-model uncertainty. There is no assumed listening-level target because the saved continuous and peak SPL fields are zero/unset.

`summary.maxVoltageAllowed` protects the whole simulated spectrum, since no crossover is assumed. `maxVoltageInTargetBandAllowed` is a separate band-only linear extrapolation requiring an actual out-of-band filter to be useful. These are linear excursion/velocity limits, not thermal, amplifier, power-compression or real-world safe-drive ratings. Peaks between frequency samples may still be missed.

## Native reference and evidence

`sparseReference` accepts only qualified, matching native matrices, checks geometry, medium, conventions and hashes, applies the source-area transformation and solves exactly those supplied frequencies. It supplies **no interpolation** and never presents a spline through five values as a broadband spatial calculation. All the native front results still use a reduced axial horn/rear network; they are not whole-system 3D validation.

At the original five native frequencies, the lossless zero-extra-end surrogate minus native coupled on-axis SPL is approximately:

| Frequency | 100 Hz | 300 Hz | 500 Hz | 700 Hz | 1,000 Hz |
|---|---:|---:|---:|---:|---:|
| Difference | +0.126 dB | +0.351 dB | +0.155 dB | −0.280 dB | −2.813 dB |

These are sample-specific **model discrepancy** values, not a calibrated accuracy envelope between points. In particular, the worsening 1 kHz error matters for sizing beyond the study band. The front matrix is not fitted to these values.

Changing front segmentation from 48 to 96 collector cells alters the 1 kHz SPL by approximately 0.00030 dB in this reduced model. The analytic uniform-duct test shows approximately second-order convergence. Neither result proves physical correctness. Two authentic published classical Hornresp input/output benchmarks are provided in `benchmarks/`; actual four-side-entry MEH validation remains pending. See `docs/hornresp-benchmark.md` for the model and frequency scope.

The network power-balance denominator now includes the sum of individual apparent source powers as well as net real power. This handles valid destructive cancellation without dividing roundoff by nearly zero net power. The actual residual, passive losses and tolerance gates remain in place, and a direct opposing-source test with a passive third port verifies the cancellation case.

## Reproduction and API

Run the relevant numerical tests from the prototype root:

```sh
node --test tests/broadband-engine.cjs tests/coupled-system.cjs tests/multiport-network.cjs
```

The tested factory is dependency-injected and browser-compatible:

```js
const E = createBroadbandEngine(M, A, N, S);
const baseline = E.baseline(savedDesign, {
  minHz: 80, maxHz: 1800, points: 121,
  voltageRms: 1, distanceM: 3,
  endCorrection: 0, lossScale: 1,
  targets: {lowHz: 200, highHz: 700,
            maxExcursionMM: 1.75, maxPortVelocityMS: 17}
});
const areaStudy = E.sweep(savedDesign, {
  parameter: 'portAreaMM2', values: [1320, 1650, 1980]
}, baseline.options);
const spatial = E.sparseReference(savedDesign, qualifiedNativeData,
                                  baseline.options);
```

Other sweep parameter names are `neckMM`, `frontVolumeCM3`, `entryZMM` and `gapMM`. `E.solve(input, frequencyHz, options)` gives one sample. `E.geometry` exposes the actual segment model; baseline results omit its large internal editor mesh. `E.frontTwoPort` is exposed for independent analytic tests. `E.csv(result)` includes conventions and options before its data rows. `sourcePhasesDeg`, `sourceDelaysMs`, `sourceEntryZMM` and `sourceVoltageScales` are arrays with up to the installed driver count; missing trailing values use coherent equal-drive defaults.

## Geometry handshake and full spatial backend contract

The collector equivalent line follows each actual polygon area centroid plus its canonical frame offset. Offsetting an insert also translates its UV opening; using only the section frame origin would count that offset twice. The saved offset-zero study is unchanged by this distinction.

`acoustics/geometry-manifest.cjs` validates the sibling `meh-acoustic-geometry/v1` SI manifest against the current horn stations, driver positions/motions, nominal/projected areas and shared rear convention. The frozen manifest hash and source transformations are recorded in `acoustics/geometry/handshake-report.json`. Its FEM cap301 at station239 differs from the reduced horn's maximum-Z termination at station251; the downstream horn, returning lip and exterior must remain in the native coupled radiation operator.

`acoustics/spatial-motor-network.cjs` implements the motor/rear coupling contract for a future frequency-exact full front+horn+exterior n-port matrix. An observer pressure-transfer row must come from that same solved operator and exterior domain. Callers provide trusted design, geometry and boundary-manifest hashes; stale geometry, incorrect conventions, missing row qualification, nonreciprocal/nonpassive matrices and disconnected observer metadata are rejected. Projected flow/pressure transformations preserve source power. No extra horn, front compliance or radiation factor is appended. The included tests use synthetic analytic operators only. **No authentic full-system spatial operator is included.**
