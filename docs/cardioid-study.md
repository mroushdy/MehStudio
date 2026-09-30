# Passive rear-slot study: browser calculation and its boundary

The new **Passive rear-slot study** calculates a separate low-frequency fixture entirely in the browser. It couples one or more electrically driven cone motors, **one** uniform shared rear-air compliance, independent short rectangular slots, frequency-dependent treatment-sheet impedance, and a common complex exterior radiation operator. It can calculate slot flow, cone excursion, current, dissipated/radiated power, and a conditional front/rear pattern. It can compare assumed sheet resistance at 80%, 100% and 120% of the entered value. No installation or native solver is required.

This extends the earlier [passive-cardioid contract](passive-cardioid-contract.md) with an explicitly bounded sensitivity model. It does **not** satisfy that contract's full-geometry qualification requirements. The editor's horn and front chambers, physical cabinet diffraction, internal rear modes, compression driver and crossover do not participate. Copying the current cone copies one catalog motor into this independent fixture; it does not quietly replace the selected MEH's acoustic result. The illustrated default motor is synthetic and is identified as such.

## Common exterior, rather than two independent response curves

The forward direction is +z. Positions are meters in the same coordinate frame; each driver retains its complex voltage, and each slot retains its own outline, width, height, treatment area, normal and position. Every positive driver flow expands the common rear volume while radiating forward. Every positive slot flow leaves the same rear air. Thus the rear pressure is

`P_rear = −(sum Q_driver + sum Q_slot)/(jω C_rear)`

where `C_rear = V_net/(ρc²)` appears once. The rear/slot flow's opposite sign at low frequency follows from solving continuity, rather than being imposed on a magnitude plot.

The bounded exterior source is an explicitly declared uniform spherical **source shell**, with radius `a`. This is a mathematical compact-source regularization, not a rigid breathing-sphere boundary condition, not a baffled piston and not a round replacement for a rectangular slot. Its radius is an editable self-loading assumption. Nonoverlapping source shells share the free-space outgoing Green function. With RMS amplitudes and `exp(+jωt)`, the exact shell integrals are

- Self: `Z_ii = ρc [1 − exp(−2jka_i)]/(8π a_i²)`.
- Mutual: `Z_ij = jρω sinc(ka_i) sinc(ka_j) exp(−jkd_ij)/(4π d_ij)`.
- Matching far-field pressure: `p(n,r) = jρω exp(−jkr)/(4πr) sum [Q_i sinc(ka_i) exp(+jk n·x_i)]`.

The real radiation matrix is the angular Gram matrix of these same pressure transfers. It is reciprocal and positive semidefinite. Shared exterior self/mutual loading, source spacing and propagation phase therefore survive both the electrical solve and the pressure sum; independently normalized responses are never combined.

For each motor the electrical equation is `V = (Re+jωLe) I + Bl v`; the mechanical equation retains suspension, damping and moving mass. For each slot the pressure drop is its treatment-sheet impedance plus the physical duct inertance. A simultaneous complex solve produces all source flows and the shared pressure. A muted voltage remains a passive coupled motor.

The treatment sheet contributes `Z_sheet,specific / A_treatment` in pressure/volume-flow units. Slot duct inertance is `ρ (length + explicit inner correction)/A_slot`. No additional outer correction is permitted: the exterior self operator already owns that reactive load. A measured complete-duct impedance is rejected to avoid adding the physical duct twice. If a future field solver includes the actual duct air, this lumped duct term must be removed.

Catalog Mms is an effective moving mass that includes air loading. Copying a cone provides an explicit *assumed* front-air subtraction `Sd² ρ/(4πa)` while retaining the catalog-derived compliance and mechanical resistance. Actual catalog measurement air loading and Mmd are unverified. Edit this subtraction for sensitivity, or enter a measured dry mass and zero subtraction. This is a material uncertainty, not a calibrated conversion.

## Material data contract

Import CSV with exactly `frequency_hz,real,imag` columns and strictly increasing frequencies. Required metadata are:

- Original units: `Pa*s/m` for pressure/normal velocity, or `Pa*s/m^3` for pressure/volume flow. Volume-flow measurements require the measured sample area; multiplying by that area yields specific sheet impedance before conversion to the actual treatment area.
- Phasor: `exp(+jωt)`; amplitude: RMS; direction: inside-minus-outside pressure divided by outward velocity or flow. Data using another convention must be converted before import.
- Scope: sheet only. Provenance, sample construction, temperature, level range and flow range must be present.

Every measured sample must have nonnegative real impedance. Linear real/imaginary interpolation between samples preserves this pointwise dissipative condition. There is no extrapolation. Negative imaginary impedance is permitted; a passive sheet may be compliance dominated. Pointwise positive real part does not by itself prove causal broadband behavior. Measurement temperature must be within 2 °C of the entered air temperature. Specified flow and level ranges remain visible provenance; they are not automatically interpreted from free text or treated as a calibrated nonlinear envelope.

A constant resistance plus nonnegative inertance is also available, always labeled an **uncalibrated sensitivity assumption**. It is not presented as a known material. Restored studies and manually edited JSON receive the same metadata/passivity checks as file imports.

## Output gates and checks

The rear-air longest dimension is the largest interior box extent. Net air volume cannot exceed its cube. A cone’s longest physical aperture dimension cannot be smaller than the diameter of an equal-area disk derived from Sd (the isodiametric lower bound). These geometric consistency checks prevent tiny entered dimensions from defeating the regime limits; the compact source-shell radius remains a separate declared loading assumption.

The chosen conservative engineering gates are explicit assumptions, not guarantees of a specific error tolerance:

| Quantity | Admitted range |
| --- | --- |
| Rear-air longest dimension D | `kD ≤ 0.7` |
| Compact source radius a | `ka ≤ 0.3` |
| Longest physical aperture dimension | `kL ≤ 0.7` |
| Duct plus declared inner correction | `kL ≤ 0.3` |
| Source-envelope radius / observer distance | `≤ 0.1` |
| Far-field phase-curvature estimate | `kR²/(2r) ≤ 0.05` |
| Cone and slot peak speed / sound speed | user screen, default 0.03, at most 0.05 |
| Cone excursion | declared peak limit; 2 mm illustrative default, catalog Xmax when copying a motor |

Model-limit violations withhold the frequency result. Excessive slot flow or cone motion withholds the polar plot and front/rear/SPL outputs while retaining the solved network quantities for diagnosis. The plotted pattern is the x–z horizontal plane, normalized to its own maximum. Deep numerical nulls do not receive an unbounded front/rear score. Zero radiated field has no defined directivity and receives no polar plot. Nonfinite solved quantities fail closed. No cardioid pass/fail rating or product-performance qualification is assigned.

Every solved frequency checks electrical input power against coil dissipation, suspension loss, independent sheet losses and radiation, with a maximum relative residual of `1e-7`. This verifies the internal energy bookkeeping; it does not verify the physical approximation.

`MEH-passive-slot-fixture.json` exports the complete independent configuration, material records, frequency results, source interfaces, connected rear/exterior domains and domain ownership. It is not a native project, mesh, AKABAK solve or ready-to-manufacture rear treatment.

## Verification performed in this repository

`tests/cardioid-study.cjs` includes independent sealed-rear circuit and coherent two-motor limits; low-frequency opposite rear flow; reciprocal/passive radiation with arbitrary phases; numerical spherical far-field power integration converging to matrix radiation; phase reversal and geometry reflection; energy conservation; measured-material units and interpolation; rejection of ambiguous/active/out-of-range data and duplicate loading; regime/flow gates; muted passive motors; and source/domain preservation.

`tests/cardioid-panel.cjs` checks interactive calculation, saved independent driver phases, stale-plot invalidation, rejection of tampered material metadata, and withholding out-of-regime plots. These are DOM checks, not rendered-browser visual QA.

Still required for the actual speaker: installed sheet impedance over level, physical cavity/duct and horn/cabinet exterior validation, moving-mass convention validation, and measured complex polar response at several levels. A future common field operator must replace *both* exterior load and matching pressure transfers together, while removing any duplicated physical-duct terms.

## Primary references and derivation

- [Fulcrum Acoustic — Passive Cardioid Technology](https://www.fulcrum-acoustic.com/education/passive-cardioid-technology): identifies coordinated enclosure/driver/port geometry and calibrated resistive treatment as requirements; it supplies no material calibration for this tool.
- [Garrett, Understanding Acoustics, “Radiation and Scattering”](https://link.springer.com/chapter/10.1007/978-3-030-44787-8_12): spherical radiation, compact-monopole transfer impedance and radiated power foundations. The specific shell regularization above is our stated model derivation, not a manufacturer geometry.
- [US10123111B2 technical disclosure](https://patents.google.com/patent/US10123111B2/en): background on coupled passive rear paths, not a validation or clearance determination.

The shell self expression follows by integrating `exp(−jkr)/r` over two uniformly distributed points on the same sphere: their separation density is `r/(2a²)` for `0<r<2a`. The mutual expression is the two nonoverlapping spherical averages of the same outgoing Green function. Their real parts equal the sphere integral of the far-field transfer products, which is also checked numerically in the tests.
