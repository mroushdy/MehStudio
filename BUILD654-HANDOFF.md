# MEH Studio Build 654 private handoff

Build 654 is the current private pre-release source identity. It supersedes
Build 653. Earlier handoffs, hashes, browser witnesses, exact certificates,
and screenshots are historical regression evidence only and do not certify
Build 654.

This handoff was finalized from the official frozen-source and live-browser
delivery runs recorded below.

## Launch

From `application/v5`:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=654&reset=1&view=nodrv&rev=release-final
```

The build query is enforced before saved-state reads or WebGL initialization.
A mismatch fails closed. The generated `meh5.html` must be rebuilt with
`node assemble.js` after source changes and must equal the ordered source
assembly specified by [`SOURCE-MANIFEST.md`](SOURCE-MANIFEST.md).

## Current capability boundary

- One-way coax and two-way behavior remain the stabilized families.
- Three-way is a browser-bundled schema-2 analysis/preview rebuild. The
  retired schema-1 `threeway-core.js` is excluded from the assembly.
- Three-way opens on a calculated T3 study with paired sliders/numeric inputs
  for mouth, depth, coverage, both crossovers, profile, and section shape. It
  auto-solves and renders the hash-matched analysis preview; JSON and research
  adapters are contained in the advanced drawer.
- Schema-2 three-way uses only `meh5_threeway_state_v2`; it does not write the
  legacy `meh5_state` key.
- Source-backed reference cards, explicit driver binding, horn/station/
  aperture/chamber/passage/mount/package/coupled-network/render/report/
  solid-plan boundaries are present, but analysis output is not fabrication
  evidence.
- No exact Boolean provider/kernel is bundled. Exact operation requires an
  injected versioned provider and explicit tolerance.
- In this delivered runtime, exact mesh, STL, Hornresp, and manufacturing are
  locked. An injected provider can produce exact-solid *evidence* only; it
  cannot grant manufacturing authority through the exact adapter.
- The separate pure fabrication gate can issue an evidence-only authorization
  only when externally supplied, current provider/kernel, hash-parity, deep
  audit, topology, threshold, collision, and format records all pass. It does
  not create mesh bytes or write files, and this archive contains no provider,
  deep-audit record, or manufacturing authorization for a three-way design.
- Legacy three-way Hornresp is quarantined because its ME1/ME2/Nd, direction,
  unit, and chamber/entry mapping conflicts with audited source records.

## Official QA record

Run from `application/v5/qa`:

```bash
npm run qa:build654-source
npm run qa:build654-delivery
```

`qa:build654-source` is the browser-independent source contract.
`qa:build654-delivery` adds the live browser isolation, storage, export-lock,
and topology-restoration contract. Run only one exact/browser release process
at a time. `npm run qa:release` remains the serialized broader release command.

| Required official record | Final value (must be filled in) |
| --- | --- |
| Frozen source command/status | `npm run qa:build654-source` — **PASS** |
| Frozen source counts | `359 tests · 359 passed · 0 failed` |
| Browser delivery command/status | `npm run qa:build654-delivery` — **PASS** |
| Browser environment/status | Playwright/Chromium live-delivery contract passed after granting the local test server permission to bind `127.0.0.1`; schema-2 isolation, storage, export locks, and two-way restoration verified. |
| Broader release command/status | `npm run qa` — **QA QUICK PASS**; canonical plan sweep `17 cases / 615 checks / 0 errors`, pairwise geometry `10/10`, mount interface `4/4`, and two-way mesh budget `19/19`. |
| Final source manifest/archive hash | Per-file hashes: `BUILD654-FILES.sha256`; delivered ZIP hash: sibling `MEH-Studio-build654-private.zip.sha256`. |
| Archive filename and exclusion review | `MEH-Studio-build654-private.zip` — reviewed to exclude installed dependencies, QA artifacts, temporary files, local `pins.json`, prior ZIP/hash artifacts, `.DS_Store`, credentials, browser state, and Git authentication. |

Do not replace a pending browser field with a historical browser witness or
with an environment limitation. A capacity limitation is neither an observed
product failure nor a pass.

## Source and delivery identity

`BUILD654-FILES.sha256` verifies the listed regular source files and
intentionally does not list itself. The private ZIP deliberately includes that
manifest; the sibling `MEH-Studio-build654-private.zip.sha256` binds the ZIP
and therefore its included manifest. Generate neither until after the final
application edit, final `node assemble.js`, byte-for-byte delivery equality,
and official QA recording. Exclude installed dependencies, generated QA
artifacts, temporary extraction files, local pins, prior ZIP/hash artifacts,
credentials, browser state, and Git authentication.

The recorded hashes establish local file/archive integrity only. They do not
prove that no copy exists outside this workspace or establish a publication,
license, IP-clearance, or physical-validation status.

## Truth boundary

- Analysis success is not an exact mesh.
- An exact closed manifold is not fabrication admission by itself.
- A fabrication authorization record is not acoustic, structural, hardware,
  material, thermal, sealing, or safety validation.
- T3 and CX3 reference cards remain incomplete pending their missing
  driver/station/chamber/aperture/mount/package-specific evidence.
- H3 can complete canonical analysis only when compatible explicit driver,
  horn, and package records are supplied; that still does not authorize
  manufacturing.
