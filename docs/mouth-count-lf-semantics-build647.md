# Build 647 mouth, driver-count, and LF-reference semantics

## Mouth width is user intent, not an acoustic verdict

MEH Studio now keeps three quantities separate:

1. **Requested mouth** — the width the user chose.
2. **Solved mouth** — the width retained after hard driver, frame, gasket,
   fastener, chamber, tap, web, and wall packaging checks.
3. **Acoustic recommendation** — a geometric pattern-control estimate at the
   internal LF-to-compression-driver crossover.

The packaging floor is a hard geometry constraint. The acoustic recommendation
is guidance and never silently grows the horn or changes a driver.

The displayed first-order estimate uses the conventional rectangular-aperture
relation

```text
mouth_dimension_m = 25306 / (included_angle_deg * frequency_Hz)
frequency_Hz = 25306 / (included_angle_deg * mouth_dimension_m)
```

Horizontal width and vertical height are reported independently. A square
32-inch, 90° × 60° mouth therefore has different horizontal and vertical
pattern-control floors; making the UI a single width control does not make the
two acoustic dimensions equivalent.

These numbers are not BEM or measured coverage. The compression-driver
wavefront, profile law, aspect/section morph, taps, mouth termination, baffle,
and nearby boundaries can all change the result.

## Driver count

Each mechanical family continues to declare the counts its construction
algorithm can actually place. For each supported count, the UI runs a bounded
packaging preflight with the currently selected driver and annotates it as:

- **FITS** — fits the current mouth;
- **GROW MOUTH** — fits only after an explicit mouth increase;
- **UNAVAILABLE** — exceeds the declared mouth cap or cannot form valid
  geometry.

Changing driver diameter, count, or mouth never substitutes another driver.
Selecting a documented build or a different mechanical family is an explicit
package selection and may load that package's own supported count.

Exact cartridge retention remains a later fail-closed manufacturing audit; the
fast preflight does not pretend that a coarse package fit proves every insert
and fastener.

## LF handoff / Xmax reference

The old `SUB CROSSOVER` label was misleading. This control is now:

- **EXTERNAL LF HANDOFF / XMAX REFERENCE** when the horn is used above an
  external subwoofer; or
- **LF PROTECTION / XMAX REFERENCE** for a self-contained rear alignment.

It is a system-integration and excursion/velocity reference. It does **not**
set:

- the internal woofer-to-compression-driver crossover;
- the tap station;
- rear-box tuning;
- predicted F3.

At a fixed tap compression target, changing the LF reference leaves the
internal crossover, station, nominal tap area, pair spacing, count, and mouth
unchanged. The reference does change cone/tap velocity and Mach. If the strict
Mach law is exceeded, Smart Adapt may lower compression and enlarge tap area;
that secondary area change can require a new aperture packing solution.

