# MEH Studio Build 650 handoff — historical

> Historical checkpoint: Build 651 supersedes this handoff. The Build 650
> URLs, behavior, counts, and hashes below are preserved as recorded evidence;
> they are not current Build 651 identity or certification.

Build 650 reopened and replaced the overstated Build 649 closure. This file
was the current handoff for that checkpoint; `build649-*` ledgers, manifests,
screenshots, and hashes were historical regression evidence only.

## Start from a deterministic state

From this `application/v5` directory:

```bash
node assemble.js
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=650&reset=1&view=cell&rev=release-final
```

The `build` query is an assertion. A stale build number fails closed instead
of silently running different source. `reset=1` clears only the current
pre-release design state after the build assertion succeeds.

## Delivered in Build 650

- Panel construction supports 2, 4, or 6 woofers. Six uses six real solved
  cells, twelve canonical passages at two taps per woofer, and three exactly
  opposed driver pairs. Driver/count fit is recomputed from the current
  driver, mouth, profile, crossover, bolt lands, and complete mount envelope.
- Count intent is preserved. The solver may adapt crossover or grow the mouth;
  an impossible package is visibly refused and is never replaced by another
  count. Count preflight now solves the same 0.5:1 tap-compression grid as the
  committed Smart Adapt pass. In the six-W5 witness it correctly moves from
  6.5:1 (insufficient pair web) to 7.5:1 (5.51 mm web versus 5.40 mm required)
  instead of falsely claiming that even a 64-inch mouth cannot fit.
- The mouth-width slider, solved state, visible value badge, count preflight,
  and every count-option label now share the same live binding. Changing the
  mouth can no longer leave a blank or stale width readout.
- R-OSSE uses the published Batík rev.7 forward-body equations. Throat angle,
  K, apex-radius factor, B, M, and Q are geometry-effective controls shared by
  one-way and two-way outer-profile infrastructure.
- The admitted R-OSSE solid is the monotone forward branch terminated at the
  flat printed baffle before native rollback. It does not claim a free-standing
  rollback surface.
- The Complete Driver Cell inspection view isolates one empty solved cell:
  cone relief, bearing face, gasket/retention and bolt details, plus the same
  open tap passages used by the exact solid. No driver cone is present.
- Parametric nonzero cone relief uses a sampled nonlinear cone-following
  generatrix rather than one straight frustum. Zero depth remains the default
  flat assumption; a scalar measured depth remains a conservative cylinder
  until surface samples exist.
- Driver mounting records expose bolt count, BCD, clearance-hole diameter, and
  gasket thickness as bounded design state. Integrated support thickness is
  still owned by the printable wall/bearing solution.
- Generated mount inputs remain generated after save/reload. A calculated W5
  state no longer resurrects the Hinson startup record; sourced Hinson/JMOD
  dimensions and an explicit user BCD remain explicit and unchanged.
- Driver selection now carries its base preset changes into the same visible
  adaptation ledger as the two-way package solve. The diameter control uses a
  0.01 cm step, so the W5 state, readout, and slider all show 13.76 cm rather
  than retaining or rounding the previous driver's diameter. Calculated BCD
  text is labelled AUTO and the solved mount record reports the actual value.
- Calculated printed panel mounts derive their bolt circle from the generated
  cone-cavity radius, the selected clearance-hole radius, and a 3.2 mm solid
  inner web. A manually entered or sourced BCD is never rewritten; it is
  refused if that web is insufficient. The plate also retains the solved
  structural web outside every fastener.
- Calculated radial cells apply the same rule to their actual heat-set
  installation pocket rather than the smaller panel clearance hole. Their
  generated BCD grows to retain the web; an explicit radial BCD is preserved
  and refused if unsafe.
- The six-woofer W5 manufacturing mesh and its inspection mesh are each one
  connected watertight solid with all twelve tap passages open. Inspection
  uses a 4 mm grid so it resolves the legal fastener webs that a 6 mm grid
  could skip; manufacturing remains the independent 2.5 mm intent. No
  disconnected-component filtering is used.
- Build/runtime/state/revision/view identity is visible in one sentinel, and
  state hashes are namespaced `b650-`.
- Full-view driver proxies are hidden only when the camera is on their horn
  side, preventing review fragments in horn air while preserving all solved
  drivers for rear inspection.

## Explicit limits, not hidden compatibility fallbacks

- Native R-OSSE rollback/overhang is not yet manufactured by the exact engine;
  it needs a parametric surface, surface offsets, tap projection, and meshing
  path that can represent non-single-valued x.
- Mouth bullnose/wrap and arbitrary compound/double-curved photo-derived
  surfaces are not claimed by the current exact solid.
- Coverage/mouth calculations are sizing guidance, not BEM-verified directivity
  or a proof of a unique global acoustic optimum. BEM and physical prototype
  measurements remain required.
- Driver presets and editable mounting records do not certify insert pull-out,
  layer adhesion, gasket compression, fatigue, torque, or cantilever loads.

## Release rule

Run current source, exact geometry, browser-state, and visual checks after the
last source edit, then assemble once and package that exact source state. Do
not pass Build 650 by running the old Build 649 closure ledger.

The Build 650 release command was:

```bash
cd qa
npm run qa:release
```

The old production-certificate tier and `build649-closure-gate.mjs` remain
historical replay tools and are intentionally not part of Build 650 admission.

## Final verification record

The packaged source was assembled once after the last application edit, and
the generated `meh5.html` was checked byte-for-byte against `shell.html`,
`profile-laws.js`, `engine.js`, and `twoway-core.js`.

- The complete Build 650 release runner finished with `QA RELEASE PASS`.
- 195/195 Node regression tests pass, including live Chromium saved-mount
  ownership, exact six-woofer manufacturing/display topology, 4,872 tap-lumen
  assertions, one-way protected geometry, rounded rectangle, profile laws,
  mount controls, and source/assembly equality.
- The broad matrix passes 32,829 checks over 264 states with 0 open pins.
- The two-way gate passes 74 checks; the adaptation gate passes 58 checks.
- The six-woofer browser workflow passes select, solve, save, reload,
  rounded-rectangle, R-OSSE, profile-parameter, and gasket mutations with six
  driver cells, twelve passages, generated BCD ownership, and both structural
  web laws passing.
- Build/reset delivery, all six R-OSSE control mutations, all four mount-record
  mutations, three profile-law renders, and three tap-lumen renders pass.
- Human render inspection confirms distinct complete-cell, isolated
  mounting-plate, no-driver assembly, and horn-only tap views. The horn-only
  view contains cut-through apertures and no mounting-plate arcs.
