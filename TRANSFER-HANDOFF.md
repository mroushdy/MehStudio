# MEH Studio v5 — transfer handoff

Transfer snapshot: 2026-07-29  
Current application build: 652  
Current pre-release saved-design schema: 3

> Build 652 supersedes the Build 650 runtime identity and the old Build 649
> closure claim. The Build 649 ledger/certificates and named Build 650 exact
> witnesses remain historical regression evidence only; they do not certify
> the current source. See `BUILD652-HANDOFF.md` for current behavior, source
> hashes, explicit limits, and verification commands.

## Current Build 652 verification summary

- Corner-mounted panel drivers now use parametric bearing plates derived from
  their local solved joint faces. The gasket, driver opening, cone relief,
  preview, and exact field consume the same canonical opening radius.
- Every admitted LF passage is swept continuously from horn air through the
  bearing support into the solved front chamber. Physical overlap removes
  intervening layers and detached islands; no cosmetic passage cap or
  disconnected-component filtering is used.
- Compression-driver bolt cutters stop at the physical flange. Opposed panel
  taps share the same symmetry/path equations, and radial manifolds follow
  the solved radial driver axes.
- Mixed face/corner panel arrays now place every passage in one canonical
  swept equalizer. The fresh angular/conical six-W5 browser state owns 12/12
  paths, passes exact manifold admission, and does not ghost the horn.
- The display exact oracle uses a 2.5 mm grid for the legal 5 mm fastener and
  a 3 mm grid for the legal 6.5 mm fastener. Any unrepresentable corner plate,
  chamber, land, or passage fails closed and is reported as an exact refusal.
- Build 652 uses `b652-` state hashes and mesh policy
  `b652-differential-cell-terminal-grid-v3`. The final focused source/geometry lane
  passes 27/27 contracts and the retention lane passes 8/8.
- The final six-woofer exact matrix covers manufacturing and display at 5 mm
  and 6.5 mm fastener diameters; all four meshes have raw component count `1`.
  The final P03 detachable manufacturing witness produces horn plus two
  cartridges with raw component counts `[1, 1, 1]`. All use zero discarded
  components; no component filtering is used.
- The complete elevated, serialized `npm run qa:release` gate passes on the
  frozen identities below, including all Node, exact, and browser lanes, and
  terminates with `QA RELEASE PASS`.
- Its headless sweep covers 210 scenarios with 18 intentional explicit
  refusals and zero failures.

## Frozen Build 652 source identity

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `shell.html` | 390,534 | `5f10652f9bd15a6cdd6a37d02d013ba137d6620e73c4990a51f1772c64a490fa` |
| `profile-laws.js` | 42,773 | `3d838f83a81a1af250c3bde5f59759dc7fbde1baeb14781e50352b8b05b43878` |
| `engine.js` | 294,219 | `61b9b1ef91991b2e1735398bf72889bce956881c48e947a4e0e05d99f4abc30f` |
| `twoway-core.js` | 296,966 | `040a053d3414246326da71fb7ea19b029617e056792a8dae4b37501bb3c71a3e` |
| generated `meh5.html` | 1,024,449 | `65d7338fa9e3f2c1586ee25fb041ac6c5544495598a621dea74493532f615172` |

The final generated application reconstructs from the four source modules
byte-for-byte at 1,024,449 UTF-8 bytes.

## Start the application

Use Terminal from this `v5` folder:

```bash
node serve.js 8520
```

Then open:

```text
http://127.0.0.1:8520/meh5.html?build=652&reset=1&view=cell&rev=release-final
```

Do not open `shell.html` or `meh5.html` with a `file://` URL. The local server is
required for the 3D worker and durable pin store. Three.js r128 is vendored at
`vendor/three-r128/`, so the application itself does not need a CDN connection.
The delivered `meh5.html` already matches its four source modules exactly.
After a future application-source edit, run `node assemble.js` once before
testing or packaging.

## Install QA dependencies on the new computer

Node.js 20 or newer is required.

```bash
cd qa
npm ci
npx playwright install chromium
```

The dependency directory is intentionally excluded from the transfer archive.

## Resource-safe working rules

- Run one development or QA process at a time.
- Keep exact manufacturing meshing opt-in while editing.
- Do not run browser visual QA, the release matrix, and exact STL generation in
  parallel.
- Cancel an existing geometry worker before starting another.
- Use the smooth analytic preview for normal design work.
- Historical Build 649 admitted exactly three policy-bound production
  fixtures: integrated
  P03, retained `P03-CARTRIDGE`, and integrated radial R02. All are pinned
  under `b648-mount-envelope-v2` and run in independent fresh child
  processes. These pins and their `b648-...` policy identifier are retained
  replay evidence, not current Build 652 certification.
- The named Build 650 OS-SE connectivity and six-woofer exact tests remain in
  the current runner as historical geometry witnesses, not runtime identity.
- Run `npm run qa:geometry` only as the documented QA-only sub-UI resource
  witness; it is not a product design.
- `npm run qa:release` is the current Build 652 gate. It includes the
  six-woofer W5 display/manufacturing topology regression and current browser
  admission. `npm run qa:build652-delivery` and
  `npm run qa:build652-six-ui` are the focused live identity workflows. The
  bounded witness, Build 649 closure ledger, Build 650 screenshots/hashes, and
  three old pinned production certificates remain historical replay tools.

## Historical Build 649 closure result — superseded, not current certification

- Release scope is controlled by the 32-row
  `docs/build649-closure-ledger.md`. Every row is `PASS` and has source,
  numeric/topology, and inspected browser evidence registered in
  `qa/build649-evidence.json`. The packaging gate refuses a missing row,
  non-`PASS` status, empty evidence class, or missing render artifact.
- The 32-inch, 90 x 60 degree, two-woofer `nw10` panel state is pinned in both
  integrated and M4-retained-cartridge construction. Fixed boards cover full,
  no-driver, mount, literal-tap, close section, x-ray, profile, throat, and
  wall-topology views. “No drivers” retains the solved cells/plates and
  gaskets while creating no LF or compression-driver bodies.
- Integrated bearing supports are clipped to the production profile and have
  one bearing-face owner. The retained cartridge is a registered, gasketed
  printable cell with an enclosed front chamber except for its canonical tap
  lumens, and the horn/cartridge retention features have explicit ownership.
  The canonical cutter connects the front chamber, driver cell or plate, horn
  wall, and horn air without a cosmetic cap or a second helper passage.
- Cartridge M4 geometry had passed the then-current geometric and exact-mesh
  audits, but insert pull-out, layer adhesion, preload, fatigue, gasket
  compression, screw torque, and cantilever loads remain unvalidated. This is
  printable geometry, not a structural certification.
- Smooth and curved-facet two-way forms consume the selected conical, Classic
  OS, or monotone OS-SE meridional law. One-way coax uses the same post-handoff
  laws while protecting its established apex, tap ring, cone fit, and circular
  handoff. Invalid joins refuse rather than modifying that protected core.
- Advanced controls make the applicable throat/coverage/pattern-target and
  OS-SE K/S/N/Q variables geometry-effective within their admitted ranges.
  Native rollback R-OSSE B/M/Q, an independent second aspect owner, and generic
  mouth rollover remain explicit refusals until their missing surface and
  exact-export contracts exist. The UI does not imply BEM- or
  measurement-verified coverage.
- Cross-section selection has one exact end-to-end contract for ellipse, Lamé
  superellipse, and straight-side/circular-corner rounded rectangle. The
  rounded-rectangle corner control feeds the shared perimeter, normals,
  offsets, preview, exact field, and export rather than approximating the
  shape with a high Lamé exponent.
- **CURVED FACETS** is a separate four-face topology: it keeps an exact
  rectangular boundary and four sharp shared diagonal seams while the
  selected meridional law curves each face axially. Nonlinear faces are
  developable but require single-axis forming, laminating/kerfing, or printing;
  they are not represented as ordinary flat CNC panels. A photograph cannot
  establish the source horn's exact profile equation, and the product does not
  label the photographed form OS, OS-SE, or R-OSSE without evidence.
- Woofer-count choices are regenerated from the selected driver envelope,
  complete cell clearance, symmetry, and current mouth. Labels react when
  driver or mouth changes and report `FITS`, `GROW MOUTH`, or `UNAVAILABLE`;
  Smart Adapt grows within the configured cap or refuses rather than clipping
  a mount or substituting a count. Requested mouth, acoustic recommendation,
  and hard package minimum remain separate quantities.
- Cone depth remains optional and defaults to `0 mm / unknown`. Unknown state
  uses a conservative moving-envelope clearance; marking depth as measured
  makes the entered depth and clearances alter chamber and printable-package
  geometry with visible provenance.
- Pre-release saved-design state is schema `3`. There is no released project
  format to preserve: stale schemas reset to current defaults, and unknown
  current-schema profile, section, family, source, construction, cone, or tap
  values refuse visibly instead of being renamed or migrated. “Legacy”
  compatibility is not a selectable design objective.
- UI, solved plan, analytic preview, report, exact request, and exact result
  carry one deterministic `b649-...` state identity and revision. A stale
  worker result is rejected rather than mutating a newer state.
- The Build 649 broad acceptance gate passed 32,829 checks over 264 states. The
  Build 649 closure gate reports 32 tracked reports and 32 closed. These are
  geometry/software checks, not an acoustic optimization or a structural
  qualification.
- `qa/cases/exact-production-admission.json` is the historical Build 649
  exact-mesh replay record. Its file format is schema `2` (independent of
  saved-design schema `3`), expects Build 649, and retains policy
  `b648-mount-envelope-v2`. It admits:
  - P03 integrated: 589,900 vertices, 1,179,824 triangles, one connected
    printable part, zero recorded topology faults/self-intersections, STL
    SHA-256
    `84e3a0ba97905893a175b0363c52a17a4dafa401c4f721ddb8f6c6ccc4a0732d`;
  - `P03-CARTRIDGE`: 679,086 vertices, 1,358,252 triangles, three named
    connected printable parts, four represented M4 retention locations, zero
    recorded topology faults/self-intersections, aggregate STL SHA-256
    `7c6935e870e0d0a1840a8a0d30798563520b327c07c5ecfa9e36ed3be706c5cb`;
  - R02 integrated radial: 650,326 vertices, 1,300,684 triangles, one
    connected printable part, zero recorded topology
    faults/self-intersections, STL SHA-256
    `3e5f4bfed127ccec4b708d439f4e241abbaf96f242e6c52b9e27e3487425e9e1`.
  P01, R03, P04, R04-D, and R08 remain intentionally held by their pinned
  resource-limit refusals.
- The final cache-busted inspection URL is
  `http://127.0.0.1:8520/meh5.html?build=649&view=nodrv&rev=release-final`.
  The complete closure record is in `docs/build649-closure-ledger.md`,
  `docs/build649-closure-evidence-map.md`, `qa/build649-evidence.json`, and
  `qa/artifacts/build649-closure/manifest.json`.

## Build 648 mount containment and section-family result (historical checkpoint)

- Pre-release smooth two-way designs now default to straight conical and expose
  only conical, Classic OS, and monotone OS-SE as product profile laws. The
  historical eased-conical equation remains available only as the exact-key
  `regressionEasedConical` internal QA oracle, not a selector choice, saved
  state, default, fallback, acoustic optimum, alias, or migration target.
- Every full driver-bearing annulus and every bolt pocket-plus-web land is
  sampled against the finite horn-air boundary. For panel families, Smart
  Adapt preserves driver identity and count and may repair containment only by
  growing to the smallest legal mouth through the configured cap. It refuses
  with `DRIVER_BEARING_ENVELOPE_INCOMPLETE` when that cap cannot contain the
  complete interface; hidden local plate or boss extension is not legal.
- Radial automatic mode may extend local module reach only within the radial
  family's legal geometry domain. Manual reach remains authoritative. A radial
  design that cannot contain the complete bearing interface within those
  bounds also refuses rather than clipping material.
- The canonical smooth OS-SE two-driver panel request grows from 32 to the
  first legal 41-inch mouth. A 40-inch cap remains a refusal rather than
  clipping the bearing plate.
- The manufacturing-policy identifier for this containment revision is
  `b648-mount-envelope-v2`. It identifies the geometry contract; it does not by
  itself certify any fixture or STL.
- At Build 648, pre-release compatibility maps were removed and saved state
  used schema `2`; stale schemas were ignored and then-current defaults were
  used rather than translating retired acoustic or mounting semantics. For
  two-way designs,
  `driverCellConstruction` is the sole saved mount-construction input.
  `mountRing` is derived internal renderer/export data, not separate user
  intent or a migration source.
- Panel preview roots now separate the structural plate and cone relief.
  Radial roots are profile-clipped, detachable joint gaskets conform to both
  solved offset surfaces, driver bodies begin behind the full gasket, and tap
  previews consume the constructive field's open swept tools without caps or
  forward protrusion.
- Form, driver, and advanced prototype controls are grouped by ownership and
  the dense tap/chamber and driver-cell overrides are collapsed by default.
  Woofer-count options are regenerated with `FITS`, `GROW MOUTH`, or
  `UNAVAILABLE` reasons and never silently substitute another count or driver.
- Smooth cross-sections now have an explicit ellipse/Lamé family control.
  Ellipse is exact `n = 2`; Lamé supplies the continuously curved squarer
  family. A true filleted rectangle is visibly disabled until straight sides,
  circular corners, offsets, preview, and export share one exact law.
  User-controlled section-family/corner-radius morphs remain deferred.
- One-way and two-way share selected engine, section, renderer, and audit
  infrastructure, but their driver-interface geometry is not interchangeable.
  The `fhx6` and `refd` one-way coax fixtures protect the existing apex, tap
  ring, circular handoff, and dish seam while two-way mount work evolves.
- The final plan sweep passes 93 cases, 1,747 covered factor pairs, and 2,670
  checks.
- The complete quick tier passes, and the broad gate passes 32,824 checks over
  264 states with all three pins closed.
- The bounded exact witness is one connected, zero-defect,
  zero-self-intersection part with 82,646 vertices, 165,320 triangles, and
  deterministic STL SHA-256
  `b16e14a5903440fca5c87f2e1de068a8ad18fa2185b67daf2d7f9712b9acd772`.
- The production-admission matrix certifies integrated P03, retained
  `P03-CARTRIDGE`, and integrated radial R02 under
  `b648-mount-envelope-v2`, while all five pinned held cases fail closed as
  intended. Their certified STL SHA-256 values are
  `a56d588bb48bd256279ea02909d72391ab6bb77627ba3ffcb59c86890b8d2ad2`,
  `7c6935e870e0d0a1840a8a0d30798563520b327c07c5ecfa9e36ed3be706c5cb`
  for the ordered cartridge aggregate, and
  `3e5f4bfed127ccec4b708d439f4e241abbaf96f242e6c52b9e27e3487425e9e1`.
- Browser release admission passes 20 of 20 checks, and the focused R03
  inspection passes all five views. Tap-lumen and selectable-profile
  inspections each pass all three views, and the phased panel-mount worker
  regression passes slot, oval, and round apertures with complete two-driver
  lands and gaskets.
- The complete Build 648 contract and final validation record are in
  `docs/build648-mount-containment-and-sections.md`.

## Build 647 parametric geometry result

- Each LF tap is one canonical racetrack/round aperture swept continuously
  through the acoustic wall, integrated or detachable driver-bearing cell, and
  solved front chamber. The exact field negates every intervening solid with
  the same cutter. The renderer shows one shared open sidewall mesh with no
  terminal cap or forward protrusion.
- Two-tap layouts now expose **Auto** and hard-request **Custom** spacing.
  Auto targets the useful corner/seam direction and clamps the result by
  three-dimensional quarter-wavelength, coverage-edge phase, chamber/cone
  envelope, acoustic-face boundary, and printable-web limits. Custom requests
  fail closed when impossible. Reports expose solved spacing and the active
  limiter.
- Integrated and retained driver cells use the same solved bearing datum,
  gasket, BCD pockets, cone-following relief, chamber, and lumen. Cone depth
  remains explicit and defaults to `0 mm / unknown`. The no-driver assembly
  and focused mounting-plate views contain no driver bodies.
- Automatic radial chamber fit may continue beyond the compact frame heuristic
  to the existing 300 mm hard reach boundary, stopping at the first exact
  passing reach. This fixes the former 0.9 mm chamber-shell clip without
  weakening the clearance rule or changing manual reach.
- The compression-driver throat uses a 16-station monotone quintic
  round-to-superellipse/Lamé morph plus a shared handoff ring. Regression
  checks reject reversal, overshoot, self-intersection, and tangent breaks.
- Smooth non-coaxial horns expose legacy eased conical, straight conical,
  Classic OS, and monotone OS-SE axial laws. One canonical 49-station record is
  consumed by preview and exact planning. Native rollback R-OSSE remains
  visibly deferred because the current forward-only `(x, φ)` surface cannot
  represent its possible axial fold without changing the horn.
- Requested mouth width is distinct from solver-grown width and from H/V
  acoustic recommendations. Driver-count choices report `FITS`, `GROW MOUTH`,
  or `UNAVAILABLE` for the chosen family, driver, chamber, and web constraints.
- External low-band handoff is an excursion/Mach reference and cannot silently
  move the horn's internal LF/CD crossover, tap station, count, or mouth.
  Self-contained protection mode declares its additional protection role.
- Fresh exact certificates pass for P03, `P03-CARTRIDGE`, and R02. R02 now
  truthfully fits the unchanged per-part limit after removal of obsolete
  preview-only post-mouth geometry: 6,654,912 samples, 1,281,460 triangles,
  zero topology faults/self-intersections, and STL SHA-256
  `b02caaff85f5dc2b7e35c79ea34dad0f70565e2e8f489bd386eac0166df02870`.
- The Build 647 quick tier passes 93 deterministic plan cases, 78 generated
  pairwise rows covering 1,747 factor pairs, and 2,546 plan checks with zero
  exceptions, warnings, or errors. Profile-law visual QA resolves four
  distinct 49-station monotone profiles without starting exact meshing.
- The complete Build 647 contract is in
  `docs/build647-parametric-geometry.md`.

## Build 646 radial cartridge and self-inspection result

- The build-645 broken C-shaped radial plates were a planning regression, not a
  camera illusion. The former reach check proved only a driver centreline. It
  did not prove that the complete circular flange or chamber frustum survived
  the curved horn/cartridge intersection.
- Automatic radial planning now samples the complete bearing-face perimeter
  against the exact conformal `boundedJoint` and the complete volume-derived
  chamber boundary against the exact outer horn shell. A bounded reach solve
  grows until both checks pass. Manual reach remains authoritative and fails
  with `RADIAL_CARTRIDGE_BEARING_FACE_INCOMPLETE` or
  `RADIAL_FRONT_CHAMBER_INCOMPLETE` instead of clipping material.
- Canonical R03 now reports 100% bearing-face and chamber coverage, 30.80 mm
  minimum face clearance, 2.21 mm minimum chamber clearance, and 512.87 cm³
  generated volume for the 512.87 cm³ target at 150 mm automatic reach.
- `VIEW: MOUNT ASSEMBLY — NO DRIVERS` is the complete horn-and-mount witness.
  It uses a rear three-quarter camera and retains every solver-owned bearing
  land/module, joint and driver gasket, BCD pocket root, and admitted cartridge
  retention feature while creating no LF or compression-driver bodies.
- The separate mounting-plate inspector defaults to one isolated face-on
  bearing plate. Each solved plate and its complete assembly overview remain
  selectable there. Focused mode hides the horn, drivers, module lofts, loose
  gaskets, and helper walls so the plate cannot be mistaken for a rounded
  chamber.
- `npm run qa:render-inspection -- --case R03` self-hosts the production
  renderer, captures five deterministic 1600 × 1000 views, verifies solver and
  scene-layer semantics, measures framing, and creates a contact sheet for
  direct review.
- Full assembly no longer displays opaque cutter/helper tubes. Literal tap
  openings remain Boolean material cuts; depth context is restricted to the
  dedicated inspection path and begins behind the horn surface.
- Corrected R03 remains intentionally held from exact manufacture: its
  four-part 18,116,771-sample request exceeds the unchanged 10,000,000
  aggregate limit. The preview correction is not an R03 production
  certificate.
- Final build-646 admission passed the five-view render inspection, all 20
  canonical browser captures, and the complete resource-safe tier: 93 design
  cases, 1,747 pairwise combinations, 2,540 checks, zero exceptions, zero
  warnings, and zero errors. The production matrix separately passed with two
  certified fixtures and six pinned fail-closed cases.

The full geometry and inspection contract is recorded in
`docs/radial-face-chamber-build646.md`.

## Build 645 cartridge-retention contract

- A separately printed driver cell now has two phase-solved M4 clamp locations.
  These are independent of the woofer bolt circle: the solved BCD pockets hold
  the woofer to its cell, while the two retention screws clamp that cell to the
  horn.
- Retention feature ownership is explicit in the exact solid. The horn owns
  two blind heat-set-insert pockets per cartridge. The cartridge owns the
  matching printed bosses, M4 clearance bores, and head counterbores. Hardware
  is not fused into either exported part.
- Layout checks preserve the acoustic-side blind cap, printable web, finite
  compression-driver flange, tap cutters, driver BCD pockets, radial sector,
  and neighbouring cartridge seam. If no finite phase satisfies every check,
  planning and exact preflight fail closed with
  `CARTRIDGE_RETENTION_NO_LAYOUT`; retention is never silently omitted.
- `INSPECT: MOUNTING PLATES + GASKETS — NO DRIVERS` contains zero LF or
  compression-driver bodies. It shows the real driver-bearing lands, one
  gasket and one driver-pocket root per solved woofer, the exact solved BCD
  pockets, and the cartridge-retention features when cartridge construction
  is selected.
- The analytic radial tap lumen follows the exact solved swept cutter path
  supplied by `field.tapTools`. Its visible path is trimmed at the acoustic
  face and cone-chamber entry, and exposes model-coordinate `pathPoints` and
  `pathSegments` metadata for browser admission. The preview does not copy the
  cutter's intentional Boolean overtravel.
- The retention UI and export path fail closed when the retention plan is
  absent or invalid. Valid geometry is described as **M4-retained printable
  geometry**, not as structurally certified hardware.
- Build identifier: `645`. Exact mesh policy identifier:
  `b645-cartridge-retention-v3`. The retained P03 fixture has passed the pinned
  exact geometry/export certificate described below. That certificate is a
  geometry and fabrication audit, not structural validation.
- Insert pull-out, layer adhesion, preload, fatigue, gasket compression, screw
  torque, and the cantilever load of the chosen woofer remain mechanically
  unvalidated. Calibrate the small bores for the chosen printer/material and
  validate a fully loaded physical prototype before relying on the assembly.

The dimensional and ownership contract is recorded in
`docs/cartridge-retention-build645.md`.

## Build 644 visual hotfix

- Dark analytic tap-lumen walls no longer protrude 4–10 mm into horn air.
  Their visible front edge begins 0.2–0.8 mm behind the canonical acoustic
  surface, while the actual material opening remains flush.
- The visible lumen now stops at the solved cone-chamber entry instead of
  copying the exact cutter's intentional Boolean overtravel past the panel.
  The exact subtractive cutter and certified STL geometry are unchanged.
- `INSPECT: MOUNTING PLATES + GASKETS — NO DRIVERS` is now a true mounts-only
  view. It retains the horn, driver-bearing lands, registration geometry,
  gaskets, and compression-driver interface while hiding every LF and
  compression-driver body.
- Browser admission measures every visible tap vertex against its canonical
  acoustic surface and rejects more than 0.25 mm of forward protrusion. The
  mounts view must contain zero driver roots and one mounting land plus gasket
  per solved woofer.

## Build 643 driver-cell result

- The build-642 visual regression is fixed. The renderer no longer adds a
  second compression driver or applies a sphere-based lift to tilted woofer
  frames. Full assembly now has exactly one CD and one body per solved woofer,
  placed directly on the solver-owned mounting datums.
- Tap passages are one canonical aperture definition. The analytic preview
  clips that same section through the horn and the exact solid subtracts the
  same cutter from the horn and driver cell. Terminal cap meshes were removed.
- The two-way panel driver-bearing surface is again part of the horn in
  integrated mode. Panel and radial families may also generate separate
  registered driver-cell cartridges with one horn plus one cell per woofer.
- The driver-cell controls now include flat, parametric, and measured profile
  modes; cone depth; a known/measured flag; axial clearance; and radial
  clearance. Cone depth defaults to **0 mm / unknown**. Zero clearance inputs
  retain the conservative automatic 6 mm axial and 2 mm radial allowances.
- A non-flat declared cone profile physically grows the printable cell
  envelope. The UI distinguishes the acoustic chamber-depth target from the
  generated geometric relief instead of calling both “cell depth.”
- Build 643 cartridges contain their cone-following chamber, driver mounting
  pockets, registration surface, gasket joint, and continuous tap lumen. At
  that historical build, cartridge-to-horn clamp hardware was not yet modeled
  and the mode was labeled **bonded prototype cartridge**. Build 645
  supersedes that limitation with phase-solved M4 retention geometry and a
  fail-closed refusal gate plus a pinned exact-policy geometry certificate, but
  still requires mechanical prototype validation.
- At Build 643, saved-state migration was versioned independently from the
  display build so that opening that build did not clear a then-valid two-way
  design or silently change its panel axis. This is a historical Build 643
  result, not the later Build 649 pre-release policy: saved-design schema
  `3` resets stale schemas and refuses unknown current values rather than
  mapping retired semantics.
- Browser admission passes 12/12 views. The dedicated former-failure view
  contains two woofer datums with 0.0 mm renderer error, one CD root, two
  mounting lands, two gaskets, four open tap passages, and zero cap meshes.
- The resource-safe plan sweep passes 93 cases, 2,888 checks, and 1,747
  pairwise combinations with zero warnings or errors.

## Build 646 exact manufacturing state (historical certificate)

- Build 646 keeps exact two-way manufacture explicitly opt-in and retains the
  resource-bounded replacement for the former whole-lattice/object-topology
  path. The sampler retains only two
  X-normal `Float32Array` scalar planes; surface coordinates and triangle
  indices remain packed in `Float64Array`/`Uint32Array` buffers. Topology uses
  numeric edge caches and bounded CSR spatial bins.
- One exact request is owned by three one-shot workers: mesh, deep audit and
  certificate, then preview/STL output. The coordinator transfers the packed
  buffers and terminates the current owner before starting the next phase.
  Output is created only after a provenance- and content-bound passing audit
  certificate; an audit failure cannot reach the output worker.
- Manufacturing stays on the fixed 2.5 mm grid. The per-part cap remains
  8,000,000 samples; the aggregate allowance is 10,000,000 because detachable
  parts are generated sequentially. Integrated P03 has been re-certified under
  `b646-radial-face-chamber-v1`:
  7,171,515 samples, 589,564 vertices,
  1,179,152 triangles, and a 58,957,684-byte STL with SHA-256
  `4b9a67fa7c55209ad97f06c74c17e7214a45dae1c8dc4c1417c03595fa66d44d`.
  Its deep audit found one closed component with no topology faults or
  self-intersections and tested 1,844,487 geometric pairs after 80,831,007 raw
  visits, using 1,784,258 bin references, peak occupancy 210, and 128 bins per
  axis.
  The policy-independent state fingerprint remains
  `14c26b26f6b61fe24b78fd6ed7e7ff932f82e52e522960cfc6c22991a2061caa`.
  The historical build-645 fresh-process run took 17,488 ms with 349,519,872
  bytes maximum RSS; the build-646 gate re-probed the same counts and hash.
- The separately certified retained `P03-CARTRIDGE` fixture contains three
  individually connected printable parts named `horn`, `cartridge-1`, and
  `cartridge-2`. Preflight used 9,022,815 samples and 8,846,448 cells. The
  combined result has 678,578 vertices, 1,357,236 triangles, 67,862,052 STL
  bytes, and aggregate SHA-256
  `cbea0b636ea9fa66a1e7d5a37d6eaf10ef87982ebcfe9a5276af1365983fb693`.
  The three file hashes are
  `65bf3fd582296ec639c6ea1b0eb4676c7ec4d60f89f0f52b921f5dfa66a920c0`,
  `3a61619b783c89a9aa48b3daa99aa662508b6f04f7ecb5ae048c28a525d6ac5d`,
  and
  `b7a982a1f431c0f937610fb57fae279cd23397ea218d29e11f1412f53f9fbc74`.
  Its deep audit found exactly three expected components, no discarded
  components, no topology faults, and no self-intersections. It also verified
  four active/passing retention tools and exact horn/cartridge ownership. The
  official fresh-process run took 21,124 ms with 484,900,864 bytes maximum
  RSS. These timings and RSS values are setup-machine observations, not
  portable promises.
- The focused Chromium source-runtime regression completed the phased exact
  preview for slot, oval, and round panel entries while preserving the rear
  mounting assembly. Static/VM gates enforce phase termination, transfer
  ownership, provenance, certificate checks, and audit-failure suppression.
- The universal rear-interface helper now returns the detachable `jointT`
  value consumed by the renderer. This closes the radial-detachable
  `undefined` → `NaN` placement path. The focused mount contract covers panel
  2/4 and radial 2–8, integrated and detachable interfaces, finite bearing
  vectors, continuous gaskets, complete frame envelopes, and drivers behind
  the horn wall; all four focused tests pass.
- The report deliberately says **nominal equal-path target**. A common station
  and equal nominal acoustic mass length are solved, but generated cutter
  centerlines, front-chamber contribution, and filter delay have not yet been
  extracted as a measured source-to-aperture oracle. Do not claim 0.0 mm
  physical spread.
- The application, sources, tests, pin store, curated reference library, and
  extracted research pages are included.
- Audio tap “golden rules” and equal-area aperture conversions are in
  `twoway-core.js`.
- Shape-transition regression coverage and focused acoustic checks are in `qa/`.
- The radial/profile architecture findings are documented in
  `docs/horn-profile-contract.md`.
- `meh5.html` is generated from `shell.html`, `profile-laws.js`, `engine.js`,
  and `twoway-core.js`; run `node assemble.js` after source changes.

## Remaining product work

1. Prototype and mechanically validate the current two-screw-per-cartridge M4
   retention system with the intended printer, polymer, layer orientation,
   inserts, torque, gasket compression, and fully loaded woofer. Record
   pull-out, preload-retention, and fatigue limits before making structural or
   production claims.
2. Measure generated tap centerlines, front-chamber contribution, and filter
   delay on physical prototypes before turning the current nominal equal-path
   target into a measured path-equality claim. Auto/custom pair spacing is now
   implemented; its acoustic limits still require polar and distortion data.
3. Implement native rollback R-OSSE only with a surface-native mesher, normals,
   tap intersection, mount intersection, and export path. Do not flatten or
   sort rollback into the current forward-only axial representation.
4. Compare the enabled profile laws, section shapes, mouth sizes, tap spreads,
   and driver counts with BEM/FEM followed by impedance, near-field, on-axis,
   and polar measurements. Geometry validity is not an acoustic ranking.

Larger held exact cases require their own pinned fresh-process certificates
before admission. Final acoustic claims still require impedance/transfer
measurement and prototype or BEM/FEM validation.

## Archive scope

Included:

- All v5 source and generated application files
- Vendored Three.js r128 runtime and MIT license
- QA source, cases, and reference geometry
- The Build 649 closure ledger, machine-readable evidence, fixed render boards,
  final in-app witnesses, and source-hash manifest
- Curated known-build reference images and reports
- Extracted PDF research pages
- Documentation and the durable `pins.json` store

Excluded:

- `qa/node_modules`
- Old/disposable QA render output not referenced by the Build 649 closure
  evidence
- Git history and operating-system metadata
- Redundant source archives and duplicate reference-library copies
- Credentials and access tokens
