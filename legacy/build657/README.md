# MEH Studio

MEH Studio is a pre-release parametric multiple-entry-horn design tool.
Build 657 keeps the stabilized one-way coax and two-way families and adds a
guided schema-2 three-way analysis and inspection system.

Start with [`BUILD657-HANDOFF.md`](BUILD657-HANDOFF.md). It records the current
capability boundary, QA status, source identity, and remaining physical
validation work.

## Run locally

From this directory:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=657&reset=1&view=full-assembly&rev=release-final
```

`build=657` is an assertion: a mismatched URL fails closed before saved state
is read or WebGL starts. `reset=1` clears the current local design after that
assertion succeeds.

`meh5.html` is generated. Edit the standalone source modules and run:

```bash
node assemble.js
```

## Three-way status

Build 657 opens with a calculated 1 HF + 4 MF + 4 LF T3 family, guided practical controls,
band-specific driver selection, full/no-driver/lumen/cutaway views, and
closed constructive mount, adapter, and passage operands. Documented CX3 and
H3 families remain honest reference starts until their missing physical input
is supplied.

The three-way UI is analysis/preview only. It never enters the retired legacy
three-way solver or renderer, and it writes only
`meh5_threeway_state_v2`. Hornresp, exact mesh, STL, and manufacturing remain
locked unless their separate evidence gates pass. No exact Boolean provider is
bundled in this release.

## QA

Browser-independent current-source gate:

```bash
cd qa
npm run qa
```

Focused release source contract:

```bash
npm run qa:build655-source
```

When browser automation is available:

```bash
npm run qa:build655-delivery
npm run qa:release
```

Run only one exact/browser release process at a time.

## Engineering boundary

Software geometry and topology checks do not establish an acoustic optimum,
BEM directivity result, structural rating, material suitability, leakage
performance, or safe finished loudspeaker. Printed prototypes and acoustic,
thermal, structural, and sealing measurements are still required.
