# Build 649 source-family and shared-kernel contract

This document closes the source/provenance part of the Build 649 review. It
does not claim that unlike multiple-entry horns are interchangeable, and it
does not turn a photographed or documented package into recovered CAD.

## What is shared

The one-way coax and two-way families share infrastructure only where the
mathematics is actually common:

- `profile-laws.js` is the one canonical implementation of the admitted
  conical, classic-OS, and OS-SE meridional laws.
- The section-family schema and section evaluators distinguish ellipse,
  Lamé superellipse, and exact filleted rectangle.
- Current-schema state admission is fail-closed: an unknown family, named
  design, section family, profile law, construction, cone profile, tap shape,
  or tap provenance is refused instead of silently renamed.
- Preview/export selection, mesh audit, evidence reports, and source labels use
  the same solved state.

Sharing those contracts does **not** authorize either topology to inherit the
other topology's driver-fit dimensions.

## What remains deliberately topology-specific

The one-way coax kernel is `coaxTapDesign` plus the protected
`coneGeom`/dish/round-handoff path. It sizes a circular ring of entries from the
coax cone datum, compression ratio, chamber low-pass, printable radial web, and
edge-of-pattern coherence. Its verified B&C 6FHX51 (`fhx6`) and explicitly
unmeasured reference (`refd`) fixtures pin the apex, clearance, entry ring, and
circular handoff.

The two-way kernel is `twoWayPlan`. It creates complete panel or radial driver
cells, one or two apertures per woofer, front chambers, passages, retention,
package clearance, station bounds, and pair-spacing diagnostics. A
`tapCRW`/`twoXO` panel calculation is not a `tapCR`/`coaxXO` coax calculation.
The two input namespaces are intentionally independent.

Therefore a shared profile/section refactor may change only geometry downstream
of the protected one-way circular handoff. The fixed one-way cone evidence,
coax entry calculation, waveguide face, entry station/ring, and handoff must
remain identical. Changing those datums requires a separately reviewed one-way
design revision, not an incidental two-way improvement.

## Named source records

### Hinson

The `hinson10` record is a published numeric lock. It owns two
101.6 × 19.1 mm racetrack entries per woofer, a 143.3 mm station, 18.0 mm
passage/bearing panel, and 700 cm³ front chamber per woofer (1400 cm³ total for
two ported woofers). Its `tapBasis` is `published`.

### JMOD

The `jmod88` record is a documented package with a calculated front geometry.
The supplied Rev 2.02 guide establishes the 90° × 60° package, two B&C 12NDL88
woofers, B&C DCX464, 70 Hz rear tuning, tapered constant-area reflex-port
topology, and a printed indexed throat adapter. It does not publish the numeric
tap CAD or front-chamber dimensions. Consequently its `tapBasis` remains
`model`, its Sd/Ap passage solution is deterministic, and the UI/report must
call it a calculated panel approximation—not an exact JMOD replica.

These records are separate even though both can use the panel construction
family. Editing either record creates a calculated design; values are never
borrowed between them.

### SynTripP

The supplied Art Welter construction drawings establish a 27 × 15 inch
plywood enclosure, 0.453 inch inner-horn stock, an angular two-part horn, and
a 6 × 4 inch throat-adapter plate. The project driver record identifies two
B&C 10CL51 woofers and a Celestion CDX14-3050. The drawings do not publish the
entry area, passage length, front-chamber volume, or an acoustic coverage
target.

The selectable `syntripp` record is therefore a **calculated radial-mount
adaptation** of that source complement and envelope. Its two-driver cell is
solved by the ordinary radial kernel. It is not the original SynTripP CAD and
does not claim source-validated acoustic performance.

### Solana

The supplied *Solana DIY Guide* describes a different source topology:

- one B&C DH450 and four B&C 6NDL38 drivers;
- a four-quarter 3D-printed waveguide/module with built-in, driver-specific
  front cells and entries;
- a builder-supplied remote rear volume, with documented sealed and vented
  rear alignments;
- fixed front-chamber parameters whose numeric volume and entry dimensions are
  not published in the guide.

Solana remains a **remote-bandpass / integrated printed-cell reference**, not
Hinson panel CAD, not JMOD panel CAD, and not a generic four-woofer panel
preset. Useful transferable construction ideas include quarter splitting,
locating pins, heat-set inserts, captive throat-adapter bolts, gasket export,
and rear-alignment records. They do not recover the source cell as parametric
construction evidence.

The selectable `solana` record preserves the documented B&C DH450 plus four
B&C 6NDL38 complement and the 376 × 376 × 150 mm one-piece print envelope, but
explicitly solves a **generic radial-cell adaptation**. The supplied STEP/STL
files are retained as source evidence; the current kernel does not import or
reverse-engineer those solids. Thus the adaptation is neither an exact Solana
replica nor a source-validated acoustic model. `twoDesign: "solana"` is
admitted, while `twoArch: "solana"` and `twoFamily: "solana"` remain refused:
Solana is a named source adaptation, not a third generic construction family.

### Local DH350 material

`DH350 MEH Half.stl`, `Throat Adapter.stl`, and the associated ADAU1701 project
are indexed only as a local geometry/provenance reference. The available files
do not establish a woofer complement, chamber dimensions, crossover, or
validated acoustic result, so they do not create a runnable design preset.

## Calculated family limits

The calculated panel family admits two or four woofers. The calculated radial
family admits two through eight. Those lists describe topology capability, not
an acoustic guarantee. A requested state is valid only after the selected
driver envelope, complete mount, path, chamber, entry area/velocity, phase,
structural-web, and mouth/package gates pass. Build 649 keeps both a compact
two-woofer calculated panel witness and a larger four-woofer calculated panel
witness; unsupported source topology names still refuse.

## Evidence

- Runtime contract:
  `qa/node/build649-source-family-contract.test.mjs`
- Protected one-way fixture tests:
  `qa/node/oneway-coax-apex-regression.test.mjs` and
  `qa/node/oneway-profile-law-integration.test.mjs`
- Published/hybrid numeric locks:
  `qa/node/twoway-audio-golden-rules.mjs`
- Source study:
  `engineering/docs/REFERENCE_LIBRARY_STUDY.md`
- Source records:
  `reference/known-builds.json` and `qa/cases/canonical.json`
