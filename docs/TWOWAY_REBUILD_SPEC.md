# Two-way MEH source of truth

This document is the design contract for the rebuilt two-way section. The
application, preview, export, reports, presets, and QA must all consume the same
normalized plan. A visually plausible assembly is not accepted unless the same
state also produces a connected, sealed, dimensionally faithful export.

## Evidence classes

Every design state is one of:

1. **Documented** — published dimensions are locked and named.
2. **Measured** — user-entered dimensions are preserved exactly and labelled.
3. **Calculated** — geometry is synthesized from declared equations and is not
   described as a proven commercial design.

Photographs constrain construction traits and impossible arrangements. They do
not silently become numeric dimensions.

## Supported construction systems

### Panel horn

- A true planar angular horn assembled from panels.
- Two or four woofers only.
- Each driver clamps directly to a short relieved plate behind a horn wall.
- Driver axes follow the applicable wall normal and point into a sealed front
  chamber.
- The front chamber follows the cone and surround envelope and includes Xmech
  plus manufacturing clearance.
- Entries are literal circular, oval, or racetrack cuts through the wall/plate.
- Paired entries may be biased toward adjacent panel intersections when the
  entire opening remains under the active cone.
- No decorative tap solids, floating drivers, long exposed tubes, mounting
  plates in the horn air path, or hidden chambers are permitted.

Documented panel presets initially include Hinson, JMOD, and SynTripP where the
source publishes enough information. Unknown dimensions remain calculated and
are labelled accordingly.

### Radial printed manifold

- Two through eight equal modules around the HF axis, subject to physical
  packing.
- Woofer axes are perpendicular to the HF axis and point inward toward the
  common hub.
- Each woofer seals to a cone-following front chamber and a short equal-path
  passage.
- The solver chooses the shortest module that clears complete frames, magnets,
  fasteners, and gaskets.
- Integrated mode is one printable solid. Detachable mode is one horn plus one
  sealed adapter per woofer.
- Driver count, size, and adapter reach may not create overlap. Impossible
  combinations must be refused without silently changing user intent.

## Horn and throat geometry

- The compression-driver exit is circular and uses the selected 1.0, 1.4, or
  2.0 inch throat diameter.
- A round-to-target transition starts at the driver throat and ends without a
  position or tangent discontinuity.
- The transition may extend beyond the removable throat adapter. Its end
  section must exactly equal the receiving horn section.
- Angular means planar panels, not a rounded superellipse with faceted shading.
- Smooth designs use one continuous mathematical profile from throat to mouth.
- The throat adapter, horn, mounting lands, and chambers may be separate
  manufactured parts only at explicit gasketed joints.

## Acoustic sizing

The following equations are design constraints, not claims that a lumped model
replaces measurement or finite-element verification.

### Entry area

For one woofer:

```text
Ap,total = Sd / CR
Ap,entry = Ap,total / Nentry
```

`CR` is an explicit design target. There is no universal tap diameter.

### Front-chamber low-pass estimate

The entry mass and front-chamber compliance form an acoustic low-pass:

```text
Map ≈ rho * Leff / Ap,total
Cap = Vtc / (rho * c²)
flp ≈ 1 / (2*pi*sqrt(Map*Cap))
```

`Leff` includes the actual passage length and declared end correction. The
calculated `flp` must remain above the intended LF/HF crossover by the selected
margin. Prototype impedance and acoustic measurements remain required.

### Tap station and path spread

The station is bounded by the shortest acoustic wavelength that the woofer path
must reproduce:

```text
Lstation <= c / (4 * margin * fxo)
```

This is an upper bound, not a preferred parking coordinate. The solver first
finds the nearest physically legal station after the HF throat transition.
Driver-to-driver acoustic path spread must be less than the stricter of
0.5 mm or 0.25 percent of the nominal path.

For a real crossover, the application must report that electrical filter phase,
driver acoustic centers, and measured transfer functions still determine final
delay. Physical depth alone is not phase alignment.

### Entry placement

- Every complete entry envelope stays under the active cone/front chamber with
  at least 2 mm margin.
- The printable web between entries is at least 3.2 mm.
- Total entry area is at most 50 percent of the local HF horn section for a
  pass, 50–55 percent is a warning, and above 55 percent is refused.
- Maximum entry width remains below the shortest wavelength the passage is
  expected to carry.
- Centered, edge-biased, and intersection-straddling layouts are distinct
  construction choices and must render differently.

## Known numeric records

### Hinson two-woofer panel record

- Two 101.6 × 19.1 mm racetrack entries per woofer.
- Total entry area 37.24 cm² per woofer.
- Station 143.3 mm.
- Synergy Calc Vtc is 1400 cm³ total across Nd=2 ported woofers.
- The UI and solver normalize that source value to 700 cm³ per woofer.
- Direct relieved plate and passage depth 18.0 mm.
- Entries are biased toward the panel intersections.

### Synergy Calc geometry record

The spreadsheet supplies station and panel-cut geometry, not an automatic
acoustic validity certificate. Its horn stations are calculated from coverage,
throat, target pattern-control frequency, and the selected first-tap distance.
All workbook inputs and recovered formulas must be regression tested before
they are used by a preset.

### SynTripP construction record

- Two B&C 10CL51 woofers and a Celestion CDX14-3050 HF driver.
- Woofer entries and frames are packed as close to the throat plate as physical
  clearance allows.
- The woofer mounting ring nearly touches the HF mounting plate.
- Cone fillers and tapered front chambers reduce Vtc while preserving excursion.
- The original large bass-reflex ducts are not a recommended default: later
  measurements showed strong pipe resonances and cancellation. The supported
  preset is sealed unless the user explicitly models a separately verified
  rear alignment.

## Manufacturing invariants

- Raw integrated geometry has exactly one connected component.
- Raw detachable geometry has exactly one component per named part.
- No component may be discarded to make an audit pass.
- Zero boundary edges, non-manifold edges, duplicate faces, degenerate faces,
  reversed edge pairs, orientation conflicts, non-finite values, or
  self-intersections.
- Positive signed volume.
- No undeclared closed cavity larger than 1 mm³.
- Throat diameter, bolt-circle diameter, bolt holes, gasket grooves, and
  published entries are within 0.25 mm of the design plan; locked Hinson values
  use 0.10 mm tolerances.
- STL-to-plan surface deviation is p95 ≤0.30 mm and maximum ≤0.75 mm.
- Export resolution must derive from the smallest declared feature; a fixed
  coarse lattice is not sufficient.

## Visual invariants

- Full view shows the acoustic horn surface and literal openings, with no
  external driver or mounting geometry leaking through opaque walls.
- Mount view shows every complete driver seated against its gasketed land.
- Tap view shows holes, not colored cutter objects.
- Section view exposes each cone chamber and a continuous path through exactly
  the declared entries.
- The application preview and a second QA view of the generated export mesh are
  both captured.
- Changing a design control preserves the selected view, orbit, target, and
  zoom. Reload restores them unless a URL capture override is present.

## Refusal policy

Smart Adapt may change dependent geometry such as mouth size, station, chamber,
entry aspect ratio, and automatic adapter reach. It may not silently replace
the selected woofer, compression driver, count, construction family, mount
system, or manual measurements. If those choices cannot satisfy the invariants,
the design is refused with a named failing law.
