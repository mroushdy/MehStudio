# Build 657 source manifest

Build 657 is the current release source identity. Earlier numbered handoffs,
browser witnesses, and exact certificates remain historical regression
evidence and do not certify this build.

## Generated application

`meh5.html` is assembled, in order, from:

1. `shell.html`
2. `profile-laws.js`
3. `engine.js`
4. `twoway-core.js`
5. the ordered schema-2 modules listed by `assemble.js`

The release delivery contract independently reconstructs this sequence and
requires byte-for-byte equality. The retired schema-1 `threeway-core.js` is
kept for historical tests only and is deliberately excluded from the browser
bundle.

## Schema-2 three-way modules

- `threeway-state-contract.js`
- `threeway-reference-cards.js`
- `threeway-driver-db.js`
- `threeway-family-catalog.js`
- `threeway-analysis-presets.js`
- `threeway-quick-starts.js`
- `threeway-acoustics.js`
- `threeway-chamber-solver.js`
- `threeway-coupled-network.js`
- `threeway-horn-surface.js`
- `threeway-aperture-solver.js`
- `threeway-station-solver.js`
- `threeway-interface-planner.js`
- `threeway-lumen-geometry.js`
- `threeway-passage-solver.js`
- `threeway-mount-host.js`
- `threeway-mount-solver.js`
- `threeway-package-input.js`
- `threeway-package-solver.js`
- `threeway-preview-geometry.js`
- `threeway-solid-geometry.js`
- `threeway-solid-intent.js`
- `threeway-render-assembly.js`
- `threeway-render-model.js`
- `threeway-analysis-export.js`
- `threeway-solver.js`
- `threeway-renderer.js`
- `threeway-solid-plan.js`
- `threeway-exact-kernel.js`
- `threeway-fabrication-gate.js`
- `threeway-controller.js`
- `threeway-ui.js`

These modules use explicit schema-2 state and hash parity. Analytic render
geometry cannot become exact-solid evidence. The exact adapter requires an
injected, versioned provider/kernel and explicit tolerance, and the separate
fabrication gate requires a deep current audit before it can emit an
authorization record. No provider, STL bytes, or file writer is bundled.

## Research and provenance

Current research records:

- `docs/threeway-primary-source-ledger.md`
- `docs/threeway-build-visual-ledger.md`
- `docs/threeway-research-manifest.md`
- `docs/threeway-king-2026-math-notes.md`
- `docs/threeway-rebuild-blueprint.md`
- `research/threeway-sources/`
- `reference/known-builds.json`
- `reference/visual-audit.json`
- `reference/images/`

The source ledger separates documented topology, derived engineering math,
visual observations, and unknowns. Reference cards do not silently promote
photographs or remembered dimensions into product geometry.

## QA boundary

- `qa/node/build655-source-contract.test.mjs` checks ordered assembly,
  browser globals, dependency capture, build identity, and schema-1 exclusion.
- `qa/node/threeway-*.test.mjs` covers the canonical state, physics, geometry,
  UI transaction, rendering, solid-plan, exact-adapter, and fabrication gates.
- `qa/browser/build655-delivery-contract.mjs` is the current live isolation,
  storage, export-lock, and topology-restoration contract.
- `qa/release/build655-package-contract.mjs` verifies the frozen archive,
  per-file hashes, exclusions, and credential-free delivery.
- The historical Build 653 browser witnesses remain useful for unchanged
  one/two-way behavior but are not Build 654 admission.

The final archive-wide file hashes are recorded in
`BUILD655-FILES.sha256`. The sibling ZIP hash binds the delivered
archive. Installed dependencies, generated QA artifacts, temporary extraction
files, local pins, credentials, and Git authentication are excluded.

`BUILD655-FILES.sha256` intentionally omits itself from its listed-file
integrity domain. The final private ZIP includes that manifest, while the
sibling ZIP hash binds the whole archive. Thus the two checks are distinct:
the manifest verifies the listed source files; the ZIP hash verifies the
delivered container and its included manifest.

## Truth boundary

- Analysis success is not an exact mesh.
- An exact closed manifold is not a fabrication admission by itself.
- A fabrication authorization record is not an acoustic, structural, or
  hardware validation.
- T3 and CX3 reference cards remain explicitly incomplete until their missing
  driver-, station-, chamber-, aperture-, mount-, and package-specific
  evidence is supplied.
- H3 can complete the canonical analysis path when explicit compatible driver,
  horn, and package records are supplied; that still does not authorize
  manufacturing.
- Legacy three-way Hornresp export remains quarantined because its ME1/ME2/Nd,
  direction, unit, and chamber/entry mapping disagrees with the audited source
  records.
