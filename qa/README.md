# MEH Studio Build 654 QA

This directory is the isolated QA harness for the private Build 654 source.
Build 654 supersedes Build 653. Historical Build 649–653 tests, certificates,
screenshots, and results remain regression evidence only; they are not current
release admission.

The authoritative current source boundary is
[`../SOURCE-MANIFEST.md`](../SOURCE-MANIFEST.md). It defines the ordered
generated assembly: `shell.html`, `profile-laws.js`, `engine.js`,
`twoway-core.js`, then the schema-2 three-way modules. The retired schema-1
`threeway-core.js` must not be bundled.

## Current gates

From `application/v5/qa`:

```bash
npm run qa:build654-source
```

This is the browser-independent Build 654 source contract. It checks ordered
assembly, Build 654 boot identity, browser-global dependency capture,
schema-1 exclusion, the schema-2 state/analysis/geometry/render/solid-plan
contracts, exact-adapter boundary, and fabrication gate behavior.

When browser automation is available, run:

```bash
npm run qa:build654-delivery
```

This runs the same source gate and the live Build 654 delivery contract. The
browser contract verifies fail-closed stale-build boot, accepted Build 654
boot, schema-2 UI isolation, `meh5_threeway_state_v2` persistence, disabled
exact/STL/Hornresp controls, and restoration of the two-way UI.

The broader serialized command remains:

```bash
npm run qa:release
```

Run one exact/browser release process at a time. Record only actual command
results, counts, browser availability/status, and final archive hash in
[`../BUILD654-HANDOFF.md`](../BUILD654-HANDOFF.md); do not infer them from
historical Build 653 evidence.

## Strict three-way truth boundary

- Schema-2 three-way is analysis/preview only. Analytic or inspection geometry
  is not an exact solid, mesh certificate, STL, or manufacturing result.
- No exact Boolean provider/kernel is bundled. An exact request requires an
  injected versioned provider and explicit tolerance, and still cannot grant
  manufacturing authority.
- Hornresp, exact mesh, STL, and manufacturing remain locked unless their
  separate evidence gates pass. The fabrication gate requires a deep current
  audit and authorization record.
- Legacy three-way Hornresp export is quarantined; its old mapping conflicts
  with audited source records.

## Local setup

Node.js 20 or newer is required. On a new machine:

```bash
npm ci
npx playwright install chromium
```

Dependencies and generated QA artifacts are not part of the private delivery
archive.
