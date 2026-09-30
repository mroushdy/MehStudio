# Cone-to-horn front chamber: engineering reference

Research date: 28 September 2026. Scope: MEH Studio's cone-mid branches. This reference distinguishes published evidence, reduced-model deductions, and unresolved physical behavior.

## Design conclusion

Short entry / larger cavity and longer entry / smaller cavity are meaningful alternatives. Compare them at the same driver, horn, entry area, rear net volume, electrical drive, and acoustic boundary assumptions. Neither is universally superior. Matching one nominal cavity/entry resonance does not match the complete transfer function, electrical impedance, cone travel, losses, or distributed modes.

## What the primary sources establish

**Multiple-entry horn.** Danley's US6411718B1 describes short coupling passages to limit their acoustic reactance. Its design procedure considers acoustic impedance, magnitude and phase, with crossover adjustment from measurements. The patent provides an engineering motivation, not a validated optimum for every cavity, insert or passage length. [Detailed description and claims](https://patents.google.com/patent/US6411718B1/en).

**Cone-facing plug.** US4718517A describes a cone-conforming plug with specific slots, central dome clearance and a wedge. The reported measured response differs from simple piston predictions. This supports treating plug channels and diaphragm geometry as part of the acoustic system: merely subtracting solid volume does not reproduce that design. Patent-reported results are specific to its arrangement. [Description, figures and claims](https://patents.google.com/patent/US4718517A/en).

**Distributed cavity behavior.** Oclee-Brown's Southampton PhD (2012), Chapter 4 pp. 99–124 and Appendix XI p. 367, distinguishes lumped compliance from cavity modes. It shows why shaping a cavity may improve its modal response despite increasing volume, and why channel loading matters alongside inlet placement. Its volume/bandwidth relation applies only while the cavity behaves as a compliance. This is compression-driver research; applying it to a larger cone-driven MEH cavity is a modeling caution, not quantitative validation. [Institutional record](https://eprints.soton.ac.uk/348798/), [full thesis](https://eprints.soton.ac.uk/348798/1/Jack_20Oclee-Brown_20PhD_20Thesis.pdf).

**Resonator.** COMSOL's worked Helmholtz example combines tube inertance with cavity compliance. Its end correction depends on the connection geometry; its quoted infinite-flange coefficient is not a universal MEH junction coefficient. The field solution also shows higher modes absent from the lumped model. This benchmark supports the low-frequency circuit concept, not a bandwidth prediction for a horn-loaded moving cone. [Model definition and results](https://doc.comsol.com/6.3/doc/com.comsol.help.models.aco.helmholtz_resonator_solvers/helmholtz_resonator_solvers.html).

**Narrow passages.** COMSOL's equivalent-fluid duct models require appropriate cross-section/wavelength conditions and constant or slowly varying sections. Short ducts with abrupt area changes can have appreciable junction losses outside that approximation. [Narrow Region Acoustics](https://doc.comsol.com/6.3/doc/com.comsol.help.aco/aco_ug_pressure.05.006.html). Its boundary-layer impedance approximation excludes overlapping boundary layers and strongly curved boundaries. [Thermoviscous Boundary Layer Impedance](https://doc.comsol.com/6.3/doc/com.comsol.help.aco/aco_ug_pressure.05.032.html). A field solution of linearized momentum, continuity and energy resolves thermal/viscous behavior; linearity still excludes high-level nonlinear flow. [Thermoviscous interface](https://doc.comsol.com/6.3/doc/com.comsol.help.aco/aco_ug_thermo.09.02.html).

**Drive level.** KLIPPEL identifies motor/suspension nonlinearities and voice-coil heating as reasons measured high-level output departs from a linear T/S prediction. A linear excursion/speed trace is therefore a screening quantity, not a maximum-output rating. [Compression of fundamental components](https://www.klippel.de/know-how/measurements/nonlinear-distortion/compression-of-fundamental-components.html).

## Equations and deductions used here

These are the present circuit's equations and explicitly stated approximations, not a new validated MEH field model. SI units throughout: pressure p [Pa], RMS volume flow U [m³/s], angular frequency ω = 2πf [rad/s], density ρ [kg/m³], speed c [m/s], area S [m²], length L [m], volume V [m³]. Phasor convention is exp(+jωt).

Front compliance and entry inertance:

    C = Vc / (ρc²)                         [m³/Pa]
    M = ρ (Ln + α req) / S                 [kg/m⁴]
    req = √(S/π)                          [m]
    fLC = 1 / (2π√(MC))                    [Hz]

Vc excludes the narrow-tube air under this lumped partition, which neglects tube compressibility. A distributed tube model can represent both inertia and compressibility of the same air. MEH Studio uses the exact polygonal entry area and physical Ln = entered tube length + 3 mm allowance. With a fitted insert, the collector terminates at its actual aperture rather than the driver cutout. Nearby volume targets use the analyzed collector volume per axial length, retain the other modeled air contributions, and are checked by reanalyzing the candidate. Vc is collector + mounting land + conical recess − insert displacement; it is the modeled air volume, not a measurement of an actual cone, dust cap or surround. α is an assumed *total* correction coefficient, not COMSOL's single infinite-flange coefficient.

Let Zh [Pa·s/m³] be shared junction pressure / total flow for N identical coherently driven mids. With Upiston = Sd vcone and I = Vrms/Zelectrical, define:

    Zb = jωM + N Zh
    Uentry / Upiston = 1 / (1 + jωC Zb)
    Zfront = Zb / (1 + jωC Zb)
    Zmechanical = Rms + jωMms + 1/(jωCms) + Sd²(Zfront + Zrear)
    Zelectrical = Re + jωLe + (Bl)²/Zmechanical
    vcone = Bl I / Zmechanical
    xpeak = √2 |vcone| / ω                 [m]
    uentry,peak = √2 |Uentry| / S           [m/s]

This shows why continuity alone (Upiston/S) misses compliance storage. It also shows why changing the cavity can change cone motion even at the same input voltage. For a real constant load R, the flow denominator is 1 − ω²CM + jωCR. Holding CM fixed preserves fLC but changing C changes damping and Zfront. With complex Zh(f), even that simple second-order interpretation is incomplete. The model has no front-passage resistance term: it cannot compare real front losses.

A circuit-only counterexample: S = 15 cm², ρ = 1.204 kg/m³ and c = 343 m/s; compare effective lengths 40/80 mm with cavities 300/150 cm³. Both give fLC = 610.3 Hz. With a fixed total branch resistance of 50,000 Pa·s/m³ and imposed piston flow, |Uentry/Upiston| at that frequency is 2.46 versus 4.92 (6.02 dB apart). These are hypothetical circuit values, not a geometry recommendation or a fixed-voltage loudspeaker prediction.

First-order sensitivity at fixed medium properties:

    d ln fLC = ½(d ln S − d ln Vc − d ln Leff)

When S changes, req and end correction also change; the three variations are not generally independent. At fixed volume flow, less S raises cross-section-averaged acoustic particle velocity. Under voltage drive, volume flow itself changes, so area ratio alone cannot predict the final speed or output.

For a slender, one-dimensional, incompressible-flow passage, integrating Euler's equation gives Mgeom = ρ∫ dx/S(x). The editor can integrate axial collector sections as a **geometry proxy**. Offset creates transverse flow, and the cone-facing cavity supplies distributed flow, so this is not the effective inertance of an offset collector or insert. Do not append this proxy to the current network without re-deriving the partition and end correction: distributed cone inflow and transverse motion violate its constant-flow assumption, and the existing effective-length correction may already represent some nearby moving air.

Reference scales, with D the relevant largest geometric chamber or passage span: kD = 2πfD/c; kD = 1 marks loss of strong compactness, not a certified cutoff. A straight tube's c/(4L) is only a wavelength scale; boundary impedances determine its resonances. The viscous penetration depth δv = √(2μ/(ρω)) [m], with μ [Pa·s]. The ratio 2δv/g compares two boundary layers with an entered clearance g. It is not a loss percentage, and axial rest clearance is not the local normal flowing gap.

## Consequences for geometry choices

| Change | Deduction or diagnostic available | What remains unresolved |
|---|---|---|
| Longer narrow entry at fixed S | More M; smaller fLC at fixed Vc; larger kL | Real junction correction, dissipation and distributed tube modes |
| Smaller front air volume | Lower C; higher fLC at fixed M | Local pressure distribution and diaphragm loading |
| Collector taper | Mesh volume; axial area/inertance proxy | Reflections, transverse flow and separation loss |
| Driver offset | Projection fit, modeled volume, geometric path spread | Equal-path acoustics, asymmetric modes and local cone loading |
| Cone-following insert | Displaced volume, aperture, entered clearance | Gap resistance/inertance, squeeze flow, modes, local speed and transfer |
| Dust-cap relief | Changed displaced volume and surrogate clearance | Real cap shape/motion, trapped subvolumes and resonances |
| Horn connection | Existing frequency-dependent 1D junction impedance | Side-entry scattering, higher modes, measured throat termination |

Reducing cavity volume can move a simple storage-related roll-off upward, but narrowing the remaining flow gap can add loading, dissipation and resonances. It does not establish more usable midrange bandwidth. Useful bandwidth also requires appropriate phase through crossover, acceptable cone and flow behavior, and field/measurement evidence of response and directivity.

## Responsible next validation

Measure the actual cone, dust cap, surround and excursion envelope. Then compare candidate pressure/velocity fields with the same imposed cone motion and with the coupled driver motor, resolving narrow gaps with suitable thermoviscous treatment. Use the real horn junction and throat termination; test mesh convergence and energy balance. Bench impedance, calibrated pressure transfer/phase and excursion at low drive can calibrate the reduced model. Higher-drive distortion/compression and final crossover/directivity measurements are separate checks.

Software regression and source checks establish arithmetic and application behavior. They do not validate acoustics, manufacturing clearance or rendered browser layout.

## Implemented resonance-oriented workflow (30 September 2026)

Open **Chamber / entry resonance** in the Design analysis toolbar, or **Study chamber / entry resonance** beside the Manual front-chamber controls. Both open the same existing study and reveal Advanced analysis. This works in the self-contained offline file.

1. Enter the intended mid passband. It initially takes the design's lower target and probe frequency; those are editable context, not recommended bandwidth. Optionally enter a crossover frequency. These inputs only annotate the sweep. Set frequency range, voltage and boundary assumptions in Acoustic screen.
2. Compare nearby cavity changes, hold the current bare LC reference, or choose **Target bare LC reference**. The target defaults to the current geometry's LC reference, not an inferred crossover or a recommended frequency.
3. A new target computes `Vc = c² S / ((2π fLC)² Leff)` at the current, shorter and longer tube lengths. Here `S` and `Vc` belong to one corresponding mid entry/cavity; coherent driver count remains in the loaded horn circuit. Standoff follows the existing actual collector-volume relation. Every candidate is reanalyzed: the real modeled volume, LC relation, unchanged inputs, mounting bounds, entry projection and enclosure fit must still pass. An impossible target keeps its reason and requested volume.
4. Inspect the existing mouth/entry flow, relative phase, impedance, excursion and speed curves at the same voltage. The new band table reports sampled flow variation and sampled low/high locations. These are descriptive samples, not detected resonances or a performance score. Variation is withheld when the sweep incompletely covers the band, has fewer than two finite samples, or contains any missing near-zero flow sample; the missing count remains visible. The crossover row uses the nearest in-range sweep sample and reports that sample's frequency, flow change and phase change relative to the current design. It does not calculate a crossover filter or HF sum.
5. Apply a mechanically admitted geometry or export the comparison CSV. CSV metadata includes the complete baseline state, acoustic options, target, band, crossover, and sampled context. JSON design export/import and named studies retain the front-study settings. Reset clears that context; importing an older study starts from its design band with no crossover specified. Applying a candidate uses the existing fresh-state check and manual edit path.

Reference targeting is inverse **geometry** sizing. The bare LC reference is not necessarily a loaded peak or dip. Curves and band summaries keep the existing model-admission gates and reference shading. Above those reference scales, a target is an exploratory geometry hypothesis rather than established acoustic tuning. Both contour insert modes remain geometry-only and cannot target LC. No front loss, cone gap, physical diaphragm geometry, full-field coupling, crossover summation or directivity model has been added.

A representative numerical check of the existing B&C 6NDL38 shared-rear starter gives a bare reference of about 583 Hz. Targeting 550 Hz reconstructs three distinct admitted geometries with the same LC reference and different loaded curves; targeting 300 Hz exceeds the 70 mm standoff bound, while 900 Hz leaves no positive transition depth. The starter's lowest model reference is about 78 Hz because of the shared rear enclosure span; its 200–700 Hz band is therefore explicitly exploratory. These checks establish software arithmetic and rejection behavior, not measured acoustic validity.

The targeted regression suite checks actual geometry reconstruction, physical bounds, insert/custom-motor gates, identical-circuit behavior under context changes, incomplete sweep coverage, near-null samples, shared normalization, phase differences and CSV/settings reconstruction. DOM checks are not rendered browser QA; no browser automation was run. The source distinction remains consistent with [COMSOL's primary Helmholtz example](https://doc.comsol.com/6.3/doc/com.comsol.help.models.aco.helmholtz_resonator_solvers/helmholtz_resonator_solvers.html), inspected again on 30 September 2026: end corrections depend on the connection geometry and the field solution contains higher modes absent from the lumped approximation.
