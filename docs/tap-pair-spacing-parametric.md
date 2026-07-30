# Parametric tap-pair spacing

Status: implemented in the v5 two-way solver and Advanced UI.

## Decision

Expose tap-pair spacing as an **Advanced** constrained parameter with
**Auto** as the default. Do not expose the two ports as independently
draggable objects.

There are two separate quantities:

1. **Tap station** is the pair's mean position along the horn, measured from
   the throat.
2. **Tap pair spread** is the three-dimensional centre-to-centre distance
   between the two aperture centroids for one driver.

They must not share one control. Moving the mean station changes horn loading,
path length, and the reflection-notch relationship. Changing pair spread
changes the phase difference and directivity of the two coherent openings even
when their mean station and total open area stay fixed.

## Why spacing matters

The two apertures are coherent radiators fed by the same driver. Their
off-axis path difference grows with separation, frequency, and observation
angle:

```text
phase difference = 2π f d |sin θ| / c
```

where `d` is pair spread, `θ` is the observation angle relative to the pair's
broadside direction, and `c` is the temperature-adjusted speed of sound.
Excessive separation therefore creates response ripple, narrowing, or lobing
near the top of the tap band. A conservative first gate is:

```text
d <= c / (4 f_pair_max)
```

where `f_pair_max` is the highest frequency at which that driver's tap pair is
expected to contribute materially. The angular phase calculation should also
be shown for the selected coverage boundary; it is more informative than a
wavelength ratio alone.

Tap station has a different acoustic effect. Moving a pair toward the throat or
mouth changes the intervening horn area, acoustic loading, and the delayed
reflection path that helps set a quarter-wave cancellation/notch. That control
must remain coupled to the crossover/path solver.

Port placement also interrupts the compression-driver wavefront. Separation
must therefore be checked together with aperture aspect ratio, air velocity,
local horn curvature, and the total obstruction seen by the high-frequency
wave—not judged from pair spacing alone.

## Solver contract

For each driver, the Auto solver should:

- preserve the pair's mean tap station;
- keep both aperture centroids mirrored about the driver's local symmetry
  plane;
- preserve total effective open area while pair spread changes;
- preserve the selected aperture shape and aspect ratio unless a separate
  control explicitly changes them;
- maintain equal nominal cutter/acoustic-mass length for both members of a
  pair;
- use the real three-dimensional aperture centroids and cutter paths rather
  than a screen-space distance;
- target the documented corner/seam preference (92% of the legal under-cone
  offset for panel construction), then move the symmetric pair inward only
  when the transverse quarter-wavelength constraint requires it; and
- return one solved value consumed by the preview, exact negative geometry,
  report, and exported design state.

Corner placement is an acoustic/package objective rather than a validity
predicate. Hinson's construction guidance puts the midrange injections near
the corners so their interruption is less exposed to the HF wavefront, while
the quarter-wavelength rule remains a hard limit. Auto therefore uses:

```text
f_pair_max = max(LF↔coax crossover, modeled front-chamber low-pass)
d_max      = c / (4 f_pair_max)
d_solved   = min(actual 3-D corner-target spread, d_max)
```

The `min` is solved on the real horn surface; it is not implemented as
`2 × local offset`. The solver also projects the actual centroid-delta vector
onto the horizontal and vertical coverage-boundary rays and reports the
resulting path and phase.

Custom mode may request a spread in millimetres, but the solver remains the
authority. A requested value must fail closed rather than being silently
clamped when it violates:

- the quarter-wavelength and coverage-boundary phase limits;
- minimum web between apertures;
- tap-to-horn-wall and tap-to-cone-chamber continuity;
- driver BCD pockets and frame envelope;
- cartridge-retention pockets, bosses, bores, and counterbores;
- compression-driver flange clearance;
- radial cartridge sectors and neighbouring seams;
- minimum wall/cap thickness;
- aperture-velocity or chamber-filter limits; or
- the maximum permitted mismatch between the two solved path lengths.

Suggested refusal codes are `TAP_PAIR_SPREAD_WAVELENGTH`,
`TAP_PAIR_SPREAD_GEOMETRY`, and `TAP_PAIR_PATH_MISMATCH`.

## UI

The Advanced panel should contain:

- `Tap pair spread`: **Auto** / **Custom**
- `Requested spread`: millimetres, enabled only in Custom
- `Solved spread`: millimetres
- `Spacing at tap-band limit`: `d / λ`
- `Pair phase at coverage edge`: degrees
- the limiting constraint and remaining margin

The persisted request fields are `tapPairMode` (`auto` or `custom`) and
`tapPairSpreadMm`. The solved state carries `tapPairDerived`; the canonical
plan/report additionally expose the real spread, wavelength ratio, horizontal
and vertical coverage-boundary phase, and a stable limiting code.

The report should separately list mean tap station, pair spread, total open
area, each cutter length, and the frequency used for the wavelength gate.

## Design freedom

Scott Hinson's and JMOD/JW's layouts are well-developed solutions to particular
driver, horn, bandwidth, construction, and optimization constraints; they are
not the only mathematically valid layouts. Other valid solutions exist when
those inputs change. The useful product behavior is therefore constrained
parametric exploration with an evidence-based Auto result—not treating one
published port distance as universal, and not allowing arbitrary geometry.

Final acoustic acceptance still requires BEM/FEM work or prototype impedance,
near-field, and polar measurements. The analytic gates above reject obvious
failures but do not prove a flat response.

## Source basis

- Scott Hinson, *MEH reference*, pp. 8–14: adjacent-source phase versus angle,
  pressure-injector behavior, tap station/loading, path-related notch, and the
  approximately quarter-wavelength spacing rule.
- *JMOD Multiple Entry Horn*, p. 2: BEM-optimized port topology intended to
  reduce high-frequency wavefront interruption while maintaining air velocity.
- *Solana DIY Guide*, pp. 2 and 5: compact driver spacing, driver-specific
  phase-plug geometry, and measured polar behavior.
- [Danley/SPL multiple-driver horn patent](https://patents.google.com/patent/US6411718B1/en):
  entry passages placed at small fractions of wavelength and near the
  higher-frequency driver's acoustic path.
