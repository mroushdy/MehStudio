# Build 655 integration and release QA

This checklist is the release-owner handoff for the three-way family, driver,
closed-operand, and product-view work. It does not grant manufacturing
authority. Exact Boolean execution, deep audit, and STL admission remain a
separate opt-in assertion in the live browser contract.

## Required source integration

- Add `threeway-family-catalog.js` immediately after
  `threeway-driver-db.js` in `assemble.js`.
- Keep `threeway-solid-geometry.js` immediately before
  `threeway-solid-intent.js`.
- Reassemble `meh5.html` after the last runtime edit.
- Change both `window.MEH_BUILD` and the `file:` redirect to Build 655.
- Apply `reset=1` to both `meh5_state` and `meh5_threeway_state_v2`, but only
  after the requested build identity has been accepted.
- Update `SOURCE-MANIFEST.md` to the Build 655 module order and QA boundary.
- Preserve the retired schema-1 `threeway-core.js` exclusion.

The independent ordered list lives in
`node/build655-source-contract.test.mjs`; changing the runtime graph requires
an explicit review of that test rather than silently deriving it from
`assemble.js`.

## Required three-way product surface

The live contract requires:

- a visible selector containing the calculated start plus known-family starts;
- browser catalog exposure for selectable T3, CX3, and H3 families;
- visible, nonempty, family-compatible low-, mid-, and high-driver records;
- solved `full-assembly`, `no-drivers-mount-assembly`, `lumen-inspection`, and
  `section-cutaway` views;
- one horn surface, at least three driver envelopes in the full view, at least
  two wall-driver mount hosts, and at least two tap openings;
- no driver geometry in the no-driver view;
- at least two canonical flow-path meshes in the lumen view;
- nonempty scene bounds, camera framing, and a rendered-pixel footprint large
  enough to reject the former tiny scaffold.

Run the optional visual artifact capture with:

```bash
npm run qa:build655-visual
```

The generated `qa/artifacts/build655-threeway/` directory is evidence, not
source, and must not be included in the private archive.

## Manufacturing assertion

The default Build 655 browser contract neither requires nor assumes that exact
mesh and STL controls are enabled. If they are enabled, the runtime must expose
a current manufacturing authorization rather than a UI-only flag.

Only after the release owner confirms a real Boolean result, hash parity, deep
audit, and generated STL bytes may the stricter live check be run:

```bash
MEH_BUILD655_REQUIRE_MANUFACTURING=1 \
  node browser/build655-delivery-contract.mjs
```

Do not set this variable merely because closed positive/negative operand
meshes exist.

## Commands

From `application/v5/qa`:

```bash
npm run qa:build655-source
npm run qa:build655-delivery
npm run qa
```

After source, browser, and broader regression QA pass and the archive has been
frozen:

```bash
npm run qa:build655-package
```

The package gate verifies every source hash, the private ZIP hash, the exact
archive file set, path safety, symlink exclusion, generated-file exclusions,
and common GitHub credential patterns in packaged text.

## Current pre-integration failure map

After the family catalog and closed-solid modules landed, the complete
`node/threeway-*.test.mjs` suite passed. The independent source contract had
two passing and three intentionally failing integration checks:

- PASS: `assemble.js` names the independently audited module order.
- PASS: the independent ordered stack can load the catalog and closed-solid
  modules and exposes their truth-bounded capabilities.
- FAIL: `meh5.html` is stale relative to the edited source modules.
- FAIL: the shell still identifies as Build 654 and does not reset schema-2
  storage.
- FAIL: `SOURCE-MANIFEST.md` still documents Build 654.

`qa:build655-package` also correctly refuses until
`BUILD655-FILES.sha256`, the Build 655 private ZIP, and its sibling ZIP hash
exist.
