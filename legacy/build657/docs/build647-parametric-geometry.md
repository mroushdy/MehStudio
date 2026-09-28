# Build 647 parametric geometry contract

Build 647 unifies the horn wall, driver-bearing cell, chamber, tap placement,
throat transition, and axial profile around solver-owned geometry. Analytic
views are inspection aids; the exact subtractive field remains manufacturing
authority.

## Continuous tap lumen

Each LF tap has one canonical racetrack or round aperture and one swept
centerline. The exact cutter begins outside the acoustic face, crosses the horn
wall and integrated or detachable driver cell, and ends inside the solved front
chamber. Every intervening solid is negated by that same cutter. There is no
terminal cap, plate-only hole, or separately placed decorative slot.

The analytic renderer consumes the exact cutter sections and builds one indexed
open wall mesh with shared rings and shared normals. Its first visible ring is
slightly behind the acoustic face, and its rear remains open. The no-driver
inspection view uses a translucent sidewall cue so the passage depth can be
seen without turning air into an apparent solid part.

Continuity QA samples every canonical cutter through horn, joint, cell, and
chamber. The current suite makes 4,872 exact assertions and separately checks
the renderer contract.

## Paired tap spacing

Two taps per woofer use a solved center-to-center spread.

- **Auto** targets 92% of the legal offset toward the useful panel
  corner/seam, then clamps it by the complete cone/chamber envelope, printable
  web, acoustic-face boundary, three-dimensional quarter-wavelength spacing at
  the actual LF-to-HF crossover, and the coverage-edge phase limit.
- **Custom** treats the requested spacing as a hard design input. It is not
  silently changed; an impossible request fails closed with the limiting
  reason.
- Increasing driver diameter does not automatically increase spacing. A
  larger cone may make a wider pair geometrically possible, but wavelength,
  crossover, directivity, chamber, and minimum-web limits still own the result.

The report exposes requested and solved spacing, limiting constraint, minimum
web, spacing-to-wavelength ratio, and horizontal/vertical phase estimates.

## Driver-bearing geometry

Integrated mode prints the bearing cell as part of the horn. Cartridge mode
prints registered retained cells separately. Both use the same solved driver
datum, gasket, BCD pockets, cone-following relief, front chamber, and tap
lumen. Cone depth remains an explicit input and defaults to `0 mm / unknown`.

`MOUNT ASSEMBLY — NO DRIVERS` shows the complete horn and mounting geometry
without LF or compression-driver bodies. The focused mounting-plate inspector
isolates a selected bearing face and its real holes, gasket, and retention
features.

Automatic radial reach uses the compact diameter-scaled target for frame
separation, but a complete volume-derived chamber may continue to the existing
300 mm hard packaging boundary. The solver retains the first exact passing
reach. Manual reach remains authoritative and is refused, not moved, when it
clips the bearing face or chamber.

## Throat transition

The round compression-driver exit now morphs to the target section with a
monotone quintic Bézier blend sampled at 16 stations plus a shared handoff
ring. The polar boundary is preserved at the round end and reaches the
superellipse/Lamé section without a pinched diamond, reversal, overshoot, or
abrupt tangent break.

## Axial profile laws

Smooth non-coaxial horns expose four forward-monotone axial laws:

1. legacy eased conical, retained exactly for saved-build compatibility;
2. straight conical;
3. Classic OS;
4. monotone OS-SE.

Every law produces a canonical 49-station record with a stable hash,
monotonicity result, endpoint slope and curvature, and explicit native/build
termination. Preview and exact consumers use this same record and stop at the
flat/baffle mouth plane.

Native rollback R-OSSE remains visible but disabled. Its radius-parametric
surface can fold backward in axial `x`; flattening or sorting it into the
current forward-only `(x, φ)` engine would create a different horn while
mislabeling it R-OSSE. Supporting it correctly requires a surface-native
mesher, normals, tap intersection, mounting, and export path.

The profile-law selector controls axial flare. Lamé/superellipse section shape,
horizontal/vertical aspect, mouth outline, and angular/faceted topology remain
orthogonal controls. These laws are geometry candidates, not claims that one
profile is universally acoustically optimal.

## Mouth, driver count, and LF reference semantics

Requested mouth width is stored separately from solver-grown width. The UI and
report distinguish:

- requested packaging width;
- solved width;
- hard packaging floor;
- horizontal and vertical acoustic recommendations; and
- pattern-control floor.

Driver-count choices are preflighted with the selected driver, family, mouth,
chamber, and printable-web constraints. Each choice reports `FITS`,
`GROW MOUTH`, or `UNAVAILABLE`; count is not inferred from nominal driver size
alone.

For an externally crossed system, the low-band handoff input is an excursion,
port-velocity, and Mach reference. It does not move the horn's internal
LF-to-HF crossover, tap station, or mouth. In self-contained protection mode it
also participates in the declared low-frequency protection target. Adaptive
Mach repair may enlarge tap area or reduce compression, which can secondarily
repack apertures; the report states that dependency.

## Exact manufacturing admission

Three production fixtures now have independent fresh-process certificates:
integrated P03, retained `P03-CARTRIDGE`, and integrated radial R02. Each pins
its state fingerprint, 2.5 mm preflight lattice, topology/deep audit, STL
hashes, elapsed-time ceiling, and RSS ceiling. Other configured cases continue
to fail closed at preflight.

## Validation boundary

The geometry and manufacturing checks do not prove frequency response,
distortion, polar smoothness, structural life, or print-material strength.
Profile, spacing, chamber, and mouth candidates still require acoustic
simulation followed by impedance, near-field, on-axis, and polar measurements
of a physical prototype.
