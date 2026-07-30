# Horn Studio radial-profile audit: JMLC and OS families

Date: 2026-07-27  
Audited source: `research-sources/Horn Studio.html` in the transfer root (7,462 lines)  
Companion source: `research-sources/R-OSSE Waveguide rev7.pdf` in the transfer root  
Scope: radial MEH waveguides only; no MEH project files were changed.

## Executive decision

The radial-profile UI must not present “JMLC versus OS” as two interchangeable curve presets with a common collection of shaping sliders. It should expose four separate mathematical implementations:

1. **JMLC isophase** — a wavefront-marching construction driven by `fc`, `T0`, throat radius, and an end-wall/truncation angle.
2. **Classic OS (Geddes/Freehafer)** — an infinite axisymmetric hyperbola driven by throat radius and nominal coverage half-angle; it requires an explicit termination strategy.
3. **OS-SE (Batík 2020)** — a generalized OS hyperbola plus an analytic superellipse termination intended for a flat baffle.
4. **R-OSSE (Batík 2022)** — a separate parametric curve with a built-in rollback for a complete free-standing waveguide.

These are not valid blends:

- JMLC `fc`, `T0`, isophase wavefront marching, and end-wall angle do not belong to OS.
- OS nominal coverage angle, `k`, `s`, `n`, and R-OSSE `R/a/a0/k/r/b/m/q` do not belong to JMLC.
- The Lamé exponent used for a mouth cross-section is not the OS-SE superellipse termination exponent. They happen to use related mathematical vocabulary but act on different dimensions.
- A generic mouth-roundover radius must not be added after OS-SE or R-OSSE and called part of those equations.
- Horn Studio’s `aspect`/Lamé station remap is not the published JMLC construction, classic OS solution, OS-SE azimuthal parameterization, or R-OSSE equation.

Recommended production choices:

- Default radial MEH family: **R-OSSE** for a self-contained 3D-printed/free-standing mouth.
- Alternate: **OS-SE** when the waveguide terminates into a genuinely large or infinite baffle.
- Alternate: **JMLC isophase** when its native curved-wavefront construction and loading behavior are the design intent.
- Keep **Classic OS** as an expert/reference family unless a validated baffle or rollback termination is selected.

## Sources and provenance

Primary sources used:

- Horn Studio implementation: `research-sources/Horn Studio.html` in the transfer root
- Marcel Batík, **OS-SE Waveguide** (2020): <https://at-horns.eu/release/OS-SE%20Waveguide.pdf>
- Marcel Batík, **R-OSSE Acoustic Waveguide** (2022): <https://www.at-horns.eu/release/R-OSSE%20Waveguide.pdf>
- Local expanded revision: `research-sources/R-OSSE Waveguide rev7.pdf` in the transfer root
- Marcel Batík’s official OS-SE overview: <https://at-horns.eu/osse.html>
- Earl Geddes, **The Oblate Spheroidal Waveguide**, *Audio Transducers*, chapter 6: <https://www.gedlee.com/downloads/AT/Chapter_6.pdf>
- Earl Geddes, **Acoustic Waveguide Theory**, JAES 37(7/8), 1989: <https://secure.aes.org/forum/pubs/journal/?elib=6078>

JMLC cross-checks:

- Horn Studio’s source comments state that the natural-entry result was validated against Le Cléac’h’s axial sheet (`jmlcWall`, lines 124–138).
- The surviving JMLC spreadsheets are indexed by JHS Audio: <https://jhsaudio.com/JMLC_elliptical/>
- A useful implementation discussion, explicitly described as “JMLC inspired” rather than an exact copy, is archived at <https://sphericalhorns.net/2020/12/21/jmlc-inspired-horn-calculator/>.

The report treats Horn Studio’s JMLC march as the implementation source of truth, while preserving the distinction between that implementation and any later “inspired” calculator.

## Complete profile-family inventory in Horn Studio

The family selector is generated from `FAMILY_NAMES` at lines 5361 and 6141–6145.

| Source key | Display family | Radial-profile disposition |
|---|---|---|
| `jmlc` | JMLC isophase | Include as its own family. |
| `jmlcell` | JMLC quasi-elliptical (2007) | Separate non-radial JMLC-derived construction; do not use its flattening controls in radial JMLC. |
| `iwata` | Iwata (JMLC 2007) | Separate decoded fixed-proportion family; do not mix into radial JMLC. |
| `swh` | Kugelwellen (SWH) | Exclude from JMLC/OS UI. |
| `tractrix` | Tractrix | Exclude. |
| `hypex` | Hypex (plane wave) | Exclude as a selectable radial contour; its area law is used inside the JMLC march, not as the same geometry. |
| `conical` | Conical | Exclude except as a reference curve. |
| `cd` | CD horn (Keele 1975) | Exclude. Keele mouth sizing may be offered only as an optional sizing helper, not an OS equation. |
| `biradial` | Yuichi biradial (after Arai) | Exclude. |
| `os` | OS-SE waveguide (Batík 2020) | Include as **OS-SE / baffle-mounted**. |
| `osc` | Classic OS (Geddes 1989) | Include as **Classic OS / expert**. |
| `wn` | William Neile biradial | Exclude. |
| `rosse` | R-OSSE (Batík 2022) | Include as **R-OSSE / free-standing**. |

## Complete control inventory and disposition

Horn Studio defines numeric controls in `PARAMS`, lines 5976–6034, and selectors in `build()`, lines 6141–6217.

### Core controls

| Source control(s) | Existing meaning | Radial-family rule |
|---|---|---|
| `fc` | Cutoff used by loading-law families | JMLC only. It is not an OS contour parameter. |
| `throatD` | Round throat diameter | Valid for all four families. |
| `throatSel`, `ribW`, `ribH`, `ribL` | Rectangular throat and round-to-rectangle morph | Do not expose in exact radial mode. A rectangular throat adapter is a separate pre-profile component and must preserve area and slope. |
| `entryDeg` | JMLC entry/cone half-angle | JMLC expert override only; `0` means natural entry. |
| `T0` | Hypex area-law coefficient | JMLC only. |
| `trunc` | Local wall-direction stop angle | JMLC only in this scope. It is not coverage. |
| `covH`, `covV` | Included nominal coverage values | Classic OS and OS-SE. Round exact mode uses one included angle. `covV` creates an engineering per-plane approximation in current Horn Studio, not an exact classic OS surface. |
| `f0` | Keele-derived mouth sizing helper | Optional Classic OS/OS-SE sizing helper only. It is not in either governing OS equation. |
| `osK`, `osS`, `osN` | OS-SE throat expansion, termination amount, termination exponent | OS-SE only. |
| `rosR`, `rosA`, `rosA0`, `rosK`, `rosRr`, `rosB`, `rosM`, `rosQ` | Published R-OSSE parameters | R-OSSE only. |
| `aplat`, `ellMu`, `ellSigma` | JMLC quasi-elliptical flattening | `jmlcell` only; reject in radial JMLC. |
| `decoupeN`, `decoupeP`, `iwExitD` | Iwata reconstruction/cut controls | `iwata` only; reject. |
| `f0V` | Keele vertical intercept | `cd` only; reject. |
| `wn*`, `finT`, `adaptL`, `finsSel`, `wnVoiceSel` | WN/Yuichi construction controls | Reject. |

### PETF/directivity controls

`petfSel`, `Tadd`, `fmult`, `sOff`, `TaddV`, and `fmultV` are enabled for `jmlc`, `swh`, and `hypex` by `PETF_FAMILIES` at line 5363.

- Keep PETF out of the simple radial-profile UI.
- If retained for JMLC, label it **experimental azimuthal loading-law variation; BEM required**.
- Never expose PETF for Classic OS, OS-SE, or R-OSSE.
- Do not call PETF an OS directivity control.

### Section, flare, and shell controls

| Source control | Rule |
|---|---|
| `sectSel` | Exact radial mode is `round`. Current `ellipse`, `sellipse`, and `rrect` choices must not imply mathematical membership in JMLC/OS. |
| `aspect` | Hide in exact radial mode. Current use is a geometric station remap. |
| `seN` (“Lamé exponent”) | Hide in exact radial mode. It shapes a cross-section; it is not OS-SE `osN`. |
| `cornerR` | Hide for these families; it belongs to rounded-rectangle sections. |
| `spSel` | SWH-only stereographic projection; reject. |
| `flareR` | Hide for JMLC, OS-SE, and R-OSSE. For Classic OS it may be part of an explicitly named, noncanonical termination mode. |
| `flareWrap` | For JMLC, rename to **additional native end-wall sweep** and fold it into the target stop angle as the source does at lines 5368–5369. Hide for OS-SE and R-OSSE. |
| `lipSel` | A manufacturing edge treatment may remain, but it must be outside the acoustic profile and must not modify the analytical contour silently. |
| `thick` | Shared manufacturing setting; valid after the inner contour is solved. |
| `exitLen`, `exitDeg` | Driver-interface data, not generic contour extensions. See the throat rules below. |
| `plateT`, `plateD`, `boltRot`, `boltN`, `boltCircleD`, `boltHoleD` | Shared mechanical-interface controls. They must be generated outside the acoustic volume and may not move the throat plane. |

### Export/BEM selectors

`bemTargetSel`, `bemModelSel`, `bemSrcSel`, `bemSymSel`, and `bemFSel` are not profile parameters. They remain valid as analysis/export settings. Recommended automatic mappings:

- JMLC: spherical-cap source matching the solved natural entry when available.
- Classic OS: flat piston for zero-angle throat, or driver-specific cap/adapter when a virtual entry is used.
- OS-SE: source cap or driver exit matching `a0`.
- R-OSSE: source cap matching the actual parametric launch slope, not blindly `a0`.
- OS-SE baffle mode: infinite-baffle BEM.
- R-OSSE: free-standing closed BEM.

## Governing geometry

### 1. JMLC isophase

Horn Studio source: `jmlcWall(P)`, lines 120–245.

The area law is

```text
m = 4π fc / c
S(s) = S0 [cosh(ms/2) + T(s) sinh(ms/2)]²
```

`s` is distance advanced along the curved isophase wavefront construction, not ordinary axial `z`. Horn Studio advances a sampled wavefront along local normals and solves the outer element required to meet the target area increment.

Natural throat entry:

```text
sin(θ0) = rt m T(0) / 2
```

For the natural spherical-cap seed:

```text
Rseed = rt / sin(θ0)
S0 = 2π rt² / [1 + cos(θ0)]
```

For a planar seed:

```text
S0 = π rt²
```

The stop condition is the averaged local wall direction reaching `trunc` (lines 225–237). Horn Studio’s extra JMLC `flareWrap` is implemented by increasing this target angle, capped at 268° (lines 5368–5369); no separate circular mouth arc is constructed.

Implications:

- `fc` and `T0` govern loading and the natural opening angle.
- Coverage is an output requiring BEM; no JMLC “coverage angle” input is legitimate.
- Axial length and mouth diameter are outputs of the march and end-angle target.
- A manual entry angle changes the seed and creates an entry-dominated region until the area law catches up. It is an expert driver-matching override, not the canonical default.

### 2. Classic OS

Horn Studio source: `osWall(P)`, lines 1669–1692.

```text
r(z) = sqrt(rt² + z² tan²(α))
```

where `α` is the nominal coverage half-angle. The pure profile is infinite and has

```text
dr/dz at z=0 = 0.
```

This zero-slope throat is consistent with the original flat-wavefront OS construction but often does not match a real compression-driver exit without a driver-specific transition.

Horn Studio currently sizes the mouth with the Keele helper

```text
Dtarget = 2.54e7 / (coverageIncludedDeg · f0Hz)  [mm]
L = sqrt((Dtarget/2)² - rt²) / tan(α).
```

That sizing rule is an application heuristic, not part of the classic OS equation. The production UI should instead accept a primary `mouthDiameter` or `axialLength`, with “derive from pattern-control helper” as an optional mode.

Implications:

- `α` is an asymptotic/nominal directivity parameter, not a guarantee of a flat −6 dB beamwidth.
- A finite cut needs a baffle, blend, or rollback. A hard truncation is not a complete design.
- The published coordinate-system solution is axisymmetric. Horn Studio’s independent H/V laws are an engineering approximation.

### 3. OS-SE (Batík 2020)

Horn Studio source: `osseWall(P)`, lines 329–369. Published formula (5):

```text
rGOS(z) =
  sqrt(k²r0² + 2kr0 z tan(a0) + z² tan²(a))
  + r0(1-k)

rTERM(z) =
  (sL/q) [1 - {1 - (qz/L)^n}^(1/n)]

rOSSE(z) = rGOS(z) + rTERM(z),  0 ≤ z ≤ L
```

Parameters:

- `r0`: throat radius.
- `a`: nominal coverage half-angle.
- `a0`: throat opening half-angle.
- `k`: generalized-OS throat expansion factor; `k=1` is pure shifted OS, and the published limit `k=0` is conical.
- `s`: termination amount/aspect ratio.
- `n`: superellipse termination exponent.
- `q`: termination truncation coefficient, typically 0.99–1.00.
- `L`: axial profile length.

Horn Studio fixes `q=0.995`, derives `a0` from half the included driver exit angle, derives a target mouth from the Keele helper, and numerically solves `L`.

Important distinction: the superellipse is added to the **meridional profile** as a termination term. It is unrelated to Horn Studio’s Lamé cross-section exponent.

Implications:

- `a0` gives first-derivative throat matching directly: `dr/dz|0 = tan(a0)`.
- OS-SE naturally approaches a flat-baffle termination. It is not by itself a complete free-space rollback.
- Batík permits parameters to vary with azimuth and separately describes mouth morphing. Horn Studio’s generic `aspect` stretch is not that published algorithm.
- For an exact/simple implementation, use a round axisymmetric surface. An elliptical OS-SE implementation needs a real `r(z,φ)` solve or the published morphing transform, not two unrelated principal-plane curves.

Published optional mouth morph:

```text
for z < zf:
  rm(z,φ) = r(z,φ)

for z ≥ zf:
  rm(z,φ) = r(z,φ)
          + [(z-zf)/(L-zf)]^γ [rM(φ) - r(L,φ)]
```

with `γ ≥ 1`. This should be a separate advanced feature only after continuity and BEM validation. It is not enabled by the current generic Lamé controls.

### 4. R-OSSE (Batík 2022)

Horn Studio source: `rosseWall(P)`, lines 1694–1727. The local rev.7 paper is the preferred equation reference.

Definitions:

```text
c1 = (k r0)²
c2 = 2 k r0 tan(a0)
c3 = tan²(a)

L = [sqrt(c2² - 4c3(c1 - {R + r0(k-1)}²)) - c2] / (2c3)
```

For `0 ≤ t ≤ 1`:

```text
x(t) =
  L[sqrt(r²+m²) - sqrt(r²+(t-m)²)]
  + bL[sqrt(r²+(1-m)²) - sqrt(r²+m²)] t²

y(t) =
  (1-t^q)[sqrt(c1+c2Lt+c3L²t²) + r0(1-k)]
  + t^q[R + L{1-sqrt(1+c3(t-1)²)}]
```

The Horn Studio code at lines 1721–1723 is algebraically equivalent.

Parameters:

- `R`: outer radius.
- `a`: nominal coverage half-angle.
- `r0`: throat radius.
- `a0`: throat opening half-angle.
- `k`: throat expansion factor.
- `r`: apex-radius factor.
- `m`: apex-shift factor.
- `b`: bending/rollback factor.
- `q`: throat-shape blend factor.

R-OSSE uses `[x(t),y(t)]` so the profile can fold back. It is a complete free-standing contour, unlike OS-SE’s flat-baffle termination.

The geometric launch slope is not simply `tan(a0)` because `t` is not unit axial distance. Horn Studio correctly records:

```text
dy/dx at t=0 = tan(a0) sqrt(r²+m²) / m.
```

Driver matching therefore must compare the driver exit to this actual slope/curvature. The rev.7 paper also shows that matching only an exit cone angle can leave a curvature discontinuity; a phase-plug/ring insert can be needed for a smooth complete contour.

## JMLC versus OS comparison

| Property | JMLC isophase | Classic OS | OS-SE | R-OSSE |
|---|---|---|---|---|
| Mathematical object | Wavefront march satisfying an area law | Axisymmetric hyperbola | Generalized OS hyperbola plus analytic termination | Parametric free-standing curve |
| Primary acoustic controls | `fc`, `T0`, throat, end-wall angle | Throat, nominal `a` | Throat, `a`, `a0`, `k`, `s`, `n`, `q`, `L` | Throat, `R`, `a`, `a0`, `k`, `r`, `m`, `b`, `q` |
| Direct coverage input | No | Nominal/asymptotic | Nominal/asymptotic | Nominal/asymptotic |
| Throat slope | Natural from `fc/T0/throat`; optional manual seed | Zero | `tan(a0)` | Parametric actual slope above |
| Native finite termination | Stop at selected local wall angle; can continue through native roll | No | Yes, into flat baffle | Yes, rollback into free space |
| Separate roundover | No | Only as explicit noncanonical termination | No | No |
| Round applicability | Exact implementation target | Published exact form | Exact axisymmetric form | Published form |
| Elliptical applicability | Use separate documented JMLC quasi-elliptical family; generic stretch is not standard JMLC | Per-axis stretch is approximate | Valid only through explicit azimuthal parameters/morphing | Not defined by the cited R-OSSE paper; keep round |
| Lamé cross-section | Not a base-law parameter | Not a base-law parameter | Not the termination exponent | Not applicable |
| Preferred environment | Depends on selected end construction | Requires termination/baffle decision | Flat/large baffle | Free-standing |

Directivity warning: OS `a` is a design/nominal half-angle and JMLC has no coverage-angle control. Actual beamwidth, DI, throat modes, mouth diffraction, and MEH tap interaction require BEM. The UI must show predicted coverage as an analysis result, not rewrite the input labels as a promise.

## Implementation-ready UI schema

### Top-level

```text
radialProfile.family:
  jmlc
  os

when family=os:
  os.variant:
    rosse       # recommended, free-standing
    osse        # baffle-mounted
    classic     # expert/reference

radialProfile.geometryMode:
  exact_round   # default and only production-ready mode
```

Do not show one common “advanced shape” panel. Render only the selected family’s schema.

### JMLC schema

| Setting | Unit | Source range | Recommended default | Notes |
|---|---:|---:|---:|---|
| `throatDiameter` | mm | 4–120 | 35.56 | Round exact mode. |
| `cutoffFrequency` | Hz | 80–10,000 | 400 | Source range; the MEH package may impose a narrower adaptive range. |
| `T0` | — | 0.4–1.2 | 0.70 | Constant loading-law value in simple mode. |
| `entryMode` | enum | `natural`, `manual` | `natural` | Natural uses the closed-form relation. |
| `manualEntryHalfAngle` | deg | 0–30 | hidden | Expert only; visible only in manual mode. |
| `endWallAngle` | deg | 60–230 | 175 | Local wall direction, not coverage. |
| `additionalNativeSweep` | deg | 0–38 recommended | 0 | Source permits 135 and caps the total at 268; keep large rollback expert-only. |
| `wallThickness` | mm | 2–12 | 5 | Manufacturing operation after the inner solve. |

Outputs: natural entry angle, axial depth, mouth diameter, final local slope, area-law residual, termination reason.

Do not show: coverage angle, OS parameters, generic roundover radius, Lamé exponent, aspect, corner radius, Keele `f0`.

### Classic OS schema

| Setting | Unit | Legal/recommended | Default | Notes |
|---|---:|---:|---:|---|
| `throatDiameter` | mm | 4–120 | 25.4 or selected driver | |
| `nominalIncludedAngle` | deg | source clamp 30–140 | 90 | Stored as `2a`. |
| `extentMode` | enum | `mouthDiameter`, `axialLength`, `patternHelper` | `mouthDiameter` | Do not force Keele sizing. |
| `mouthDiameter` | mm | `> throatDiameter` | adaptive | Primary when selected. |
| `axialLength` | mm | `> 0` | derived | Primary when selected. |
| `patternHelperFrequency` | Hz | 200–2,000 | 800 | Optional sizing heuristic only. |
| `throatInterface` | enum | `flat`, `driverAdapter` | `driverAdapter` | Adapter must be slope/area continuous. |
| `terminationMode` | enum | `largeBaffle`, `validatedBlend` | `largeBaffle` | No bare hard-cut “production” mode. |

Do not show: `fc`, `T0`, JMLC truncation, OS-SE `s/n`, R-OSSE parameters, Lamé section.

### OS-SE schema

| Setting | Unit | Published/source range | Default |
|---|---:|---:|---:|
| `throatDiameter` | mm | 4–120 in source UI | selected driver |
| `nominalIncludedAngle` | deg | source 40–140 | 90 |
| `throatOpeningIncludedAngle` | deg | source 0–50 engine; UI driver angle 0–30 | selected driver |
| `k` | — | source UI 0.5–4; equation permits 0 limit | 1.0 |
| `s` | — | source UI 0–2 | 0.7 |
| `n` | — | 2–8 | 4 |
| `q` | — | 0.99–1.00 | 0.995, advanced/locked |
| `extentMode` | enum | `axialLength`, `mouthDiameter`, `patternHelper` | `mouthDiameter` |
| `axialLength` | mm | `>0` | solved |
| `mouthDiameter` | mm | `> throatDiameter` | adaptive |
| `patternHelperFrequency` | Hz | source 200–2,000 | 800, optional |
| `environment` | enum | `largeBaffle` | fixed |
| `wallThickness` | mm | 2–12 | 5 |

Do not show: generic mouth roundover/wrap, JMLC settings, cross-section Lamé exponent, R-OSSE controls.

Future advanced morphing may expose `morphStartFraction`, `morphRateGamma`, and a target mouth outline only after the published `rm(z,φ)` transform is implemented. Do not map the existing `aspect` slider to this feature.

### R-OSSE schema

| Setting | Unit | Horn Studio range | ST260 default |
|---|---:|---:|---:|
| `throatDiameter` | mm | 4–120 | 25.4 |
| `outerRadiusR` | mm | 60–400 | 130 |
| `nominalHalfAngleA` | deg | 20–60 | 39 |
| `throatHalfAngleA0` | deg | 0–20 | 7.5 |
| `throatExpansionK` | — | 0.5–4 | 1.8 |
| `apexRadiusFactorR` | — | 0.05–1 | 0.3 |
| `bendingB` | — | 0–1 | 0.3 |
| `apexShiftM` | — | 0.4–0.98 | 0.8 |
| `throatShapeQ` | — | 1–8 | 3.7 |
| `wallThickness` | mm | 2–12 | 5 |

Hard constraints:

```text
R > r0
c2² - 4c3[c1 - {R+r0(k-1)}²] > 0
all sampled x(t), y(t) finite
y(t) > 0
offset shell has positive local thickness and no self-intersection
```

Do not show: Keele `f0`, generic axial length, generic mouth diameter, generic truncation, generic roundover/wrap, Lamé/aspect, or JMLC settings. `R` and the parametric solve determine the extent.

## Dependency order

Implement every radial family in this order:

1. Resolve the selected driver’s acoustic throat radius and exit geometry.
2. Validate the family-specific input set; reject impossible values without silently borrowing another family’s defaults.
3. Solve the analytical inner meridian or JMLC wavefront march.
4. Compute outputs: actual depth, mouth radius, throat slope/curvature, final slope, and termination state.
5. Build the exact round surface of revolution.
6. Select the MEH tap station and radial driver packaging from the solved surface; do not let packaging rewrite the profile equation.
7. Boolean true tap passages through the shell and into sealed front chambers.
8. Add driver adapters/mounting lands outside the acoustic volume.
9. Offset the wall for thickness and check self-intersection/minimum web.
10. Generate BEM geometry from the same solved surface.
11. Run topology, clearance, and visual-regression gates before enabling manufacturing export.

## Adaptive constraints for 2–8 radial drivers

Driver count is a packaging/tap-system parameter, not a horn-profile coefficient. The profile must solve first.

For `N = 2…8`, place identical driver stations at

```text
φi = φ0 + 2πi/N.
```

At a candidate station, let `ρc` be the radius of the driver/adapter centerline from the horn axis, `Denv` the driver-frame envelope projected into the azimuthal plane, and `c` the required assembly clearance:

```text
2 ρc sin(π/N) ≥ Denv + 2c.
```

For a mounting land of circumferential width `Wland` and minimum solid web `Wweb`:

```text
2π ρc / N ≥ Wland + 2Wweb.
```

For each adapter:

- Its acoustic passage starts at the horn-side tap opening.
- Its body and mounting flange extend outward along the local exterior normal.
- The driver cone/front chamber remains outside the horn acoustic volume.
- The shortest legal adapter is preferred; no “flying” driver and no mounting plate crossing into the horn.
- Neighboring driver baskets, magnets, bolt tools, and removable modules must clear in 3D, not just in a front projection.

Acoustic path gate at crossover `fx`:

```text
Δli =
  |(driver front-chamber path + tap passage path + horn path from tap)
   - HF reference path|

phaseError = 2π fx Δli / c.
```

Recommended initial design gate:

```text
|phaseError| ≤ π/4
equivalently Δli ≤ c/(8fx).
```

This is a geometry gate, not a substitute for BEM/network optimization.

Count adaptation:

- Try moving the tap station toward a larger local circumference while preserving the crossover/path gate.
- Then increase the family’s legitimate size control: JMLC end sweep/loading choice, Classic OS/OS-SE extent, or R-OSSE `R`.
- Never “solve” overlap by stretching the driver model, moving drivers inside the horn, changing throat diameter, or applying an unrelated Lamé/aspect remap.
- For exact round profiles, 2–8 stations are rotationally equivalent.
- If a future non-round OS-SE morph is implemented, 3/5/6/7-driver stations are not generally equivalent; each azimuth requires its own wall normal, passage, and path audit.

## Throat-interface rules

### JMLC

- Default to the natural seed angle.
- If the driver exit does not match, build a short area- and slope-continuous adapter before the JMLC throat.
- A manual JMLC seed is allowed only when the solver reports the resulting entry-dominated length and area residual.

### Classic OS

- The pure throat slope is zero.
- Do not prepend a visible straight tube and call the result classic OS.
- Use a driver-specific internal adapter/phase-plug transition, or choose OS-SE/R-OSSE when a nonzero analytical opening angle is required.

### OS-SE

- Set `a0` from half the measured included exit angle.
- The profile begins at `z=0`; no extra conical run is part of formula (5).
- Match throat area and verify curvature as well as slope.

### R-OSSE

- Compare the driver to the actual parametric launch slope and curvature.
- When the driver exit remains conical, use a designed ring/phase-plug insert if needed to make the complete contour smooth, as discussed in the local rev.7 paper.
- Do not expose a second generic “driver exit angle” that competes with `a0`.

## Reusable Horn Studio source functions

| Function | Lines | Reuse decision |
|---|---:|---|
| `makeTfun(P,m)` | 112–118 | Reuse for JMLC only; keep PETF behind an expert flag. |
| `jmlcWall(P)` | 120–245 | Reuse after extracting into a pure solver with explicit diagnostics and no global UI state. |
| `osseWall(P)` | 329–369 | Reuse formula core; replace forced Keele sizing with selectable extent modes. |
| `osWall(P)` | 1669–1692 | Reuse round meridian only; label H/V branch approximate or remove it from production exact mode. |
| `rosseWall(P)` | 1694–1727 | Reuse formula core; preserve zero-valid parameters and discriminant checks. |
| `osVirtualEntry(...)` | 2628 onward | Do not make this part of the classic OS equation. It may be reused only as a separately named driver-interface/loading model. |
| `hornParams(...)` | 5367–5371 | Do not reuse wholesale; it passes irrelevant global fields across families. Replace with discriminated family schemas. |
| `profOf(...)` | 5407–5422 | Reuse throat adapter concepts only after family-specific gating. |
| `profOfBase(...)` | 5424 onward | Do not reuse its generic section/roundover fallthrough for exact radial profiles. |
| `superellipseAreaFactor(n)` | 1739–1741 | Reuse only for explicit area-preserving section work; not for OS-SE termination. |
| `computeFamily(P)` | 2153 onward | Replace string dispatch with typed/discriminated family dispatch. |

## Required corrections to Horn Studio concepts before reuse

1. `FAMILY_MATH.os` at line 6917 displays a simplified classic OS term plus “superellipse termination”; it omits `k`, `a0`, `s`, `q`, and `n`. Replace it with the full formula (5).
2. The OS-SE method blurb at line 7033 says a Classic-OS selector is “on the roadmap,” although `osc` already exists. Remove the stale statement.
3. `aspect` is currently exposed to JMLC, OS-SE, and R-OSSE at line 6011. Hide it in exact radial mode.
4. `flareWrap` is globally available at line 6022. Restrict it to families where it has a defined construction. Do not apply it to OS-SE/R-OSSE.
5. `flareR` is currently available to OS-SE/R-OSSE through the generic profile path. Hide it; both families already own termination.
6. `ribW/ribH/ribL` are exposed to all OS variants. Move rectangular transition geometry to a separate driver-adapter component.
7. The source permits `ellipse` for OS families at line 6787, but “ellipse” conflates round, per-axis OS, and arbitrary section remapping. Replace it with explicit `exact round` and, later, a separately validated OS-SE azimuthal/morphing mode.
8. The OS-SE engine fixes `q=0.995`; document this hidden constant or expose it only as advanced `0.99–1.00`.
9. Classic OS and OS-SE currently force Keele-derived mouth sizing. Make it a helper, not the only extent definition.
10. R-OSSE source defaults use `R = P.rosR || 130` and `a = P.rosA || 39`; unlike `a0/b`, zero is not legal for those fields, but all family fields should still use explicit validation rather than truthiness defaults.

## Acceptance tests

Each profile family must pass:

1. Formula regression against at least three known parameter sets.
2. Analytic/numeric throat slope check.
3. Curvature-continuity report at every joined interface.
4. Finite positive radius and valid termination.
5. Closed, manifold, consistently oriented manufacturing mesh.
6. Minimum-wall and offset self-intersection checks.
7. 2–8-driver clearance matrix using the actual driver envelopes.
8. Tap booleans proven to connect the front chamber to the horn interior.
9. Fixed camera renders: front, mouth oblique, side, rear, x-ray, and section cut.
10. Family-specific visual references:
    - JMLC native rollback, not a generic circular lip.
    - Classic OS hyperbola with an explicitly visible termination choice.
    - OS-SE flat-baffle termination.
    - R-OSSE free-space rollback.
11. BEM smoke test with the correct source and environment.
12. Cross-family isolation test: switching families must not retain hidden, inapplicable settings.

## Final recommended UI wording

```text
RADIAL PROFILE
  JMLC isophase
    Loading and native isophase rollback

  Oblate spheroidal
    R-OSSE — free-standing rollback (recommended)
    OS-SE — flat/large-baffle termination
    Classic OS — expert; requires termination
```

Show this permanent note:

> Profile equations define the acoustic wall. Driver count, tap passages, front chambers, mounting lands, and bolt patterns are solved afterward and may enlarge the design, but they never replace or silently distort the selected profile family.
