# Build 648 mount containment and section-family contract

Build 648 closes the gap between a valid horn surface and a mount that only
appears to fit it. The solver now owns the complete driver-bearing and
fastener envelope, while the analytic renderer follows the same solved
interface datums. This is a geometry and inspection contract, not an acoustic,
structural, or physical-production certificate.

## Pre-release profile-law policy

MEH Studio has not shipped a public saved-project format. New and calculated
two-way states therefore use straight conical as their explicit default.

The smooth two-way product UI exposes:

- straight conical;
- Classic oblate spheroidal (OS); and
- monotone OS-SE with its finite native termination controls.

`regressionEasedConical` is an internal QA oracle, callable only by that exact
test key. The retired `legacyEasedConical` spelling and all generic aliases
reject. The oracle does not appear in the selector, is not accepted as saved
product state, and is never selected as a default or fallback. Its sole purpose
is to let pinned regression fixtures compare the 72/28 linear/smoothstep station
coordinates. Unknown laws and native rollback R-OSSE refuse instead of
substituting that oracle. R-OSSE stays visibly disabled until a
surface-parametric path can preserve possible axial rollback without flattening
or sorting it into the forward-only engine.

## Complete bearing and bolt-land containment

The exact solid intersects each mount with the complement of the finite horn
air volume. Checking only the driver centre, nominal frame diameter, or a
tangent-plane projection cannot prove that the resulting Boolean retains the
whole mounting interface on a curved profile.

Build 648 samples the actual horn-side bearing plane for every driver:

- the full annulus from the cone-opening web to the outside bearing edge;
- multiple radial rings around that annulus; and
- a pocket-plus-printable-web ring around every driver bolt location.

Panel mounts use their solved wall normal. Radial mounts use the radial driver
axis. Integrated cells are checked against bounded horn air; detachable cells
are checked against the outer shell and their gasket registration offset. The
plan reports minimum clearance, required clearance, coverage, probe radii,
sample count, and a single `mountEnvelopeComplete` result. Failure is named
`DRIVER_BEARING_ENVELOPE_INCOMPLETE`.

Smart Adapt treats driver identity and count as user intent. It does not clip
the flange or silently reduce the driver count.

For panel families, mouth growth is the only automatic containment repair.
The solver may grow the requested mouth only through the configured mouth cap.
If no mouth at or below that cap contains every sampled bearing-annulus and
bolt-land point, the panel state refuses; a hidden local reach, boss, or plate
extension is not a legal substitute.

Radial families have a different, explicitly bounded repair. Their automatic
mode may extend the local radial module reach while it remains inside the
family's legal geometry domain. A manual reach remains authoritative. If
neither the legal radial reach nor any other declared radial constraint can
contain the complete interface, the state refuses rather than clipping it.

The canonical smooth OS-SE panel regression demonstrates the intended
behavior: a requested 32-inch, 90° × 60° panel using two 12NDL88-class drivers
does not contain the complete bearing and bolt lands. With a 64-inch mouth cap,
the first legal integer mouth is 41 inches, so the solved state records
`mountEnvelopeMinMouthW = 41`. With the cap held at 40 inches, the state remains
infeasible and reports `DRIVER_BEARING_ENVELOPE_INCOMPLETE`; no part is
amputated to make it appear valid.

The exact manufacturing policy identifier for this geometry revision is
`b648-mount-envelope-v2`. That identifier does not by itself certify a fixture
or STL.

## Pre-release state and mount-input policy

There is no released project format to preserve. Build 648 removes the
pre-release compatibility maps that translated retired family, profile, or
mount representations into current geometry.

Current saved state uses schema `2`. A stale schema is ignored and the current
defaults are used; it is not migrated by guessing at old acoustic or mounting
intent. For two-way designs, `driverCellConstruction` is the sole saved
mount-construction input. Any `mountRing` value is derived internal
renderer/export data, not an independent user preference, migration source, or
solver input.

## Conformal analytic renderer

The preview now preserves the solver's interface hierarchy instead of inventing
display-only placement:

- A driver root remains on the exact solved `driverFace`. Physical driver
  geometry starts behind the complete gasket, so the frame, surround, and cone
  cannot leak through the acoustic face.
- A panel support keeps its outer plate root and cone-relief root as separate
  datums. They meet at the bearing land, eliminating the short floating boss
  created by the former fictitious common root.
- A radial module is generated from the exact taper, cavity, flange, and root
  bridge datums, then polygon-clipped against the same solved
  `twoWaySdCross` profile used by the constructive field. A profile change can
  no longer reveal an unbounded root annulus inside horn air.
- A detachable radial joint gasket is sampled between the exact shell and
  module offset surfaces and fills the declared annular registration gap. Its
  preview metadata records whether every projection completed.
- Driver BCD pockets and retention features are drawn from the constructive
  field's real tools and ownership. The renderer does not add decorative
  fasteners.

Tap inspection continues to use `twoWaySolidField().tapTools` as its authority.
The horn and cell materials discard the same canonical aperture sections, and
the visible lumen is one open sidewall following the exact swept path. It
begins behind the acoustic face, ends at the chamber entry, and has no terminal
cap or forward cutter overtravel. Full assembly suppresses review-only helper
surfaces that could otherwise read as additive tubes or unbounded cones.

## Relocated and collapsed controls

The ordinary design path is grouped by ownership:

- meridional profile, cross-section, mouth, and coverage live under **Form**;
- driver selection, count, cone-cell summary, and mount construction live
  under **Drivers**; and
- manual tap/chamber dimensions and rear-loading overrides live in a collapsed
  **Prototype overrides — advanced** disclosure.

Cone profile, depth, and clearance fields are also collapsed by default behind
a live driver-cell summary. This keeps the zero-depth/unknown default visible
without presenting prototype overrides as required inputs.

Woofer count is a family-supported select control. Each option is regenerated
for the current driver, family, mouth, chamber, and mount geometry and is
labelled `FITS`, `GROW MOUTH`, or `UNAVAILABLE` with its reason. A count change
is committed through the select's `change` event, so its visible label and the
solver state cannot diverge. Mouth/fit repair never substitutes a different
count or driver.

## Cross-section families

Cross-section shape is orthogonal to the meridional profile law.

- **Ellipse** is the exact `n = 2` identity. Horizontal and vertical half-axes
  may differ; it is circular only when they are equal.
- **Lamé superellipse** is the exact smooth family
  `|y/a|^n + |z/b|^n = 1`, with `n` from 2 through 12. Increasing `n` produces
  a squarer continuously curved section.
- **Filleted rectangle** is visible but disabled. A true implementation needs
  straight sides, circular corner arcs, a matching perimeter parameterization,
  exact offsets, preview, and export topology. A high Lamé exponent is not
  relabelled as a filleted rectangle.

Classic angular construction remains its own flat-panel/chamfer topology.
User-controlled station-varying section or corner-radius morphs are deferred.
The existing compression-driver round-to-selected-section handoff is not a
general ellipse/Lamé/filleted-rectangle morph control.

## One-way coax protection and shared-kernel boundary

The families share useful infrastructure, but they are not one interchangeable
geometry path.

Common engine and renderer utilities provide section evaluation, station and
surface queries, mesh auditing, saved-state wiring, and inspection conventions.
The smooth two-way meridian records come from `profile-laws.js`, and two-way
mounting, chambers, tap tools, exact fields, and manufacturing admission live
in `twoway-core.js`.

One-way coax retains its driver-specific `coneGeom`, `coaxTapDesign`,
`dishMesh`, and `coaxHornMesh` path. The measured B&C 6FHX51 fixture (`fhx6`)
and the explicitly unmeasured reference fallback (`refd`) pin their apex,
physical clearance, tap ring, emitted tap coordinates, circular driver-sized
handoff, and watertight dish-to-horn seam. A two-way refactor must not move
those hard-won datums as an incidental consequence of changing a shared helper.

The transferable lesson is the contract, not the dimensions: use solver-owned
driver datums, one canonical aperture definition, complete under-cone and mount
containment, a continuous circular driver handoff before any downstream shape
change, and preview geometry derived from manufacturing authority. Applying a
new section family or two-way mount law to one-way coax requires an explicit
one-way design revision and review against the protected fixtures.

## Validation status

The final Build 648 audit confirmed:

- `node qa/node/run.mjs --tier quick` passed the complete resource-safe suite,
  and `node gate.js` passed 32,824 checks over 264 states with all three pins
  closed.
- `node qa/node/plan-sweep.mjs` passed 93 cases, covering 1,747 factor pairs
  through 2,670 checks.
- `node qa/node/bounded-exact-witness.mjs` produced one connected, zero-defect,
  zero-self-intersection witness with 82,646 vertices, 165,320 triangles, and
  deterministic STL SHA-256
  `b16e14a5903440fca5c87f2e1de068a8ad18fa2185b67daf2d7f9712b9acd772`;
  every pinned resource ceiling passed.
- `node qa/node/production-exact-certificate.mjs --timeout-ms 600000`
  certified all three admitted fixtures and preserved all five pinned
  fail-closed cases. The certified STL SHA-256 values are
  `a56d588bb48bd256279ea02909d72391ab6bb77627ba3ffcb59c86890b8d2ad2`
  for integrated P03,
  `7c6935e870e0d0a1840a8a0d30798563520b327c07c5ecfa9e36ed3be706c5cb`
  for the ordered retained P03 cartridge aggregate, and
  `3e5f4bfed127ccec4b708d439f4e241abbaf96f242e6c52b9e27e3487425e9e1`
  for integrated radial R02.
- `node qa/browser/run-release-admission.mjs` passed all 20 browser admission
  checks. The focused `node qa/browser/render-inspection.mjs --case R03`
  inspection also passed all five views. Tap-lumen inspection passed all three
  views, the three selectable profile laws passed their fixed-camera visual
  comparison, and the phased panel-mount worker regression preserved two
  complete lands and gaskets for slot, oval, and round apertures.

Geometry checks do not establish frequency response, distortion, directivity,
gasket compression, fastener preload, fatigue life, or print-material
strength. Those claims still require simulation and physical prototype
measurement.
