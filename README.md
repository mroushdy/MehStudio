# MEH Studio

MEH Studio is a pre-release parametric multiple-entry-horn designer with
interactive 3-D inspection, sourced acoustic/profile laws, driver-cell and tap
solvers, printable-mesh generation, STL export, and deterministic QA.

The current application identity is **Build 652**. Start with
[`BUILD652-HANDOFF.md`](BUILD652-HANDOFF.md) for the delivered geometry
contracts, source hashes, focused verification evidence, and known limits.

## Run locally

MEH Studio must be served over HTTP:

```bash
node serve.js 8520
```

Then open:

```text
http://127.0.0.1:8520/meh5.html?build=652&reset=1&view=nodrv&rev=release-final
```

`meh5.html` is the assembled application. Develop in `shell.html`,
`profile-laws.js`, `engine.js`, and `twoway-core.js`, then regenerate once:

```bash
node assemble.js
```

## QA

Install the browser/geometry test dependencies once:

```bash
cd qa
npm ci
npx playwright install chromium
```

Run the current delivery identity and six-cell visual witness:

```bash
npm run qa:build652-delivery
npm run qa:build652-six-ui
```

Use `npm run qa:release` only as a serialized full gate; exact meshing is
memory intensive and should not run concurrently with another geometry worker.

## Status

Build 652 is a development snapshot, not a fresh full-release certificate.
Focused delivery, topology, tap-lumen, profile-mount, and live six-cell
browser checks pass for the recorded hashes. The remaining exhaustive-gate
items are documented in `BUILD652-HANDOFF.md`.

Geometry and software checks do not establish an acoustic optimum, BEM
directivity result, structural load rating, or substitute for printed
prototypes and measurements.
