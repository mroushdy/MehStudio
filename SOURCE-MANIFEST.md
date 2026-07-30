# Build 652 source manifest

Build 652 is the current source. Files whose names begin with `build649-` or
`build650-`, plus `BUILD650-HANDOFF.md`, are retained regression/history
records; their ledgers, exact witnesses, screenshots, and hashes are not
current Build 652 certification. The current contract is
`BUILD652-HANDOFF.md`.

The transfer source tree contains the current application plus the source
material that is most useful for continuing geometry and acoustic work. A
future transfer archive should preserve this same set. The
reference basenames listed below live under the archive's `research-sources/`
directory.
The application runtime also vendors Three.js r128 and its MIT license under
`application/v5/vendor/three-r128/`; `qa/node_modules` is not required at
runtime.

## Current application geometry source

- `application/v5/shell.html` — UI and analytic Three.js inspection renderer
- `application/v5/profile-laws.js` — canonical monotone axial profile laws
- `application/v5/ath-source-math.js` — standalone, immutable ATH/OS-SE/R-OSSE
  equation and provenance library; it is regression-linked to the production
  profile laws but is not part of the generated browser bundle
- `application/v5/engine.js` — acoustic/geometry solver
- `application/v5/twoway-core.js` — manufacturing plan, fields, and exact mesh
- `application/v5/meh5.html` — generated Build 652 application; regenerate it
  from the four sources above with `node assemble.js`
- `application/v5/BUILD652-HANDOFF.md` — current delivered behavior, limits,
  source hashes, and verification workflow
- `application/v5/qa/perf/` — browser-independent bounded worker runner,
  benchmark, cache/preview contract, tests, and WebGPU roadmap
- `application/v5/BUILD650-HANDOFF.md` — historical predecessor retained to
  explain the six-woofer, mounting-record, and profile-law checkpoint
- `application/v5/docs/build649-closure-ledger.md` and
  `application/v5/qa/build649-evidence.json` — superseded historical ledger
  and inspected-render evidence; do not use them to certify Build 652
- `application/v5/docs/build649-closure-evidence-map.md` — human review map for
  every Build 649 closure row
- `application/v5/docs/build649-curved-facets.md` — distinct four-seam curved
  facet topology and its manufacturing limits
- `application/v5/docs/build649-rosse-control-parity.md` — admitted
  profile/section controls and explicit R-OSSE/rollover refusals
- `application/v5/docs/build649-source-family-contract.md` — shared
  one-way/two-way infrastructure and topology-specific boundaries
- `application/v5/qa/cases/exact-production-admission.json` — superseded
  Build 649 exact-admission certificates and intentional held cases; the
  pinned policy and hashes are retained for history, not Build 652 admission
- `application/v5/docs/build648-mount-containment-and-sections.md` — retained
  Build 648 predecessor for the historical `b648-mount-envelope-v2`
  containment-policy record
- `application/v5/docs/build647-parametric-geometry.md` — retained predecessor
  for lumen, spacing, throat, profile, mouth/count, LF-reference, and
  historical Build 647 certification details
- `application/v5/docs/ath-source-math-audit.md` — five-source equation,
  parameter, worked-example, limitation, discrepancy, and test coverage map

## Current source identity

The source-frozen Build 652 identities are:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `shell.html` | 390,534 | `5f10652f9bd15a6cdd6a37d02d013ba137d6620e73c4990a51f1772c64a490fa` |
| `profile-laws.js` | 42,773 | `3d838f83a81a1af250c3bde5f59759dc7fbde1baeb14781e50352b8b05b43878` |
| `engine.js` | 294,219 | `61b9b1ef91991b2e1735398bf72889bce956881c48e947a4e0e05d99f4abc30f` |
| `twoway-core.js` | 296,966 | `040a053d3414246326da71fb7ea19b029617e056792a8dae4b37501bb3c71a3e` |
| generated `meh5.html` | 1,024,449 | `65d7338fa9e3f2c1586ee25fb041ac6c5544495598a621dea74493532f615172` |

`qa/node/build652-delivery-contract.test.mjs` reconstructs the generated file
from the four source modules and requires exact equality. A read-only
reconstruction of this frozen source set matches the delivered `meh5.html`
byte-for-byte at 1,024,449 UTF-8 bytes.

The supplementary source-backed math layer added by the ATH audit is not a
fifth assembled application input:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `ath-source-math.js` | 44,969 | `2c374a3d57648d3a370480b2aea461b01b2ed0466f3c9f86d7e274526c10d2b4` |
| `qa/node/ath-source-math.test.mjs` | 16,248 | `3e28c34c9b69d0a8a785ce25ad8eb424dc3c74db8d78343c0e025531f779c86d` |

## Final verification boundary

- The final focused source/geometry lane passes 27/27 contracts.
- The retention lane passes 8/8. Its P03 detachable exact witness produces
  horn plus two cartridge parts with raw component counts `[1, 1, 1]`.
- The six-woofer exact matrix covers manufacturing and display at both 5 mm
  and 6.5 mm woofer-fastener diameters; every mesh has raw component count
  `1`.
- The fresh angular/conical six-W5 browser state owns and equalizes all 12
  exact manifold paths, passes exact admission, and leaves the refusal overlay
  hidden.
- Exact acceptance uses the raw component counts with zero discarded
  components. No component filtering is used.
- The complete elevated, serialized `npm run qa:release` gate passes on these
  identities, including all Node, exact, and browser lanes, and terminates
  with `QA RELEASE PASS`.
- The release headless sweep covers 210 scenarios with 18 intentional
  explicit refusals and zero failures.

## Primary acoustic and horn references

- `Horn Studio.html`
- `horn_studio_6.html`
- `R-OSSE Waveguide rev7.pdf`
- `ATH/OS-SE Waveguide.pdf`
- `ATH/Ath-AP1.pdf`
- `ATH/ATH - Advanced-Transition Horns.html`
- `ATH/ATH - Segmentizing a horn.html`
- `ATH/MANIFEST.md` — exact SHA-256 identities and the intentional
  deduplication reference to the existing R-OSSE PDF
- `Synergy Calc v5.xls`
- `Synergy Calc V5.pdf`
- `Scott Hinson MEH reference.pdf`
- `JMOD Multiple Entry Horn.pdf`
- `MEH.pdf`
- `Solana DIY Guide.pdf`

## Driver and tap references

- `B&C_6FHX51-GC-STEP.stp`
- `B&C_6FHX51_02_Final-2k.png`
- `B&C_6FHX51_03_Final-2k.png`
- `driver-tap-placement-76deg.png`

## Extracted model library

`engineering/reference-mount-audit/` contains the already-extracted reference
models used to study mounting lands, chambers, throats, and tap passages. This
includes the Synergy Parametric, Optimiert, SB Horn, Celilo, 300 Hz MEH, K-402
wood, and related STL/SKP/reference material.

## Engineering notes

`engineering/docs/` and `engineering/HANDOFF.md` contain the accumulated audits,
equations, architecture decisions, known-build studies, and mounting/tap plans
that live above the v5 application folder in the original workspace.

## Deliberately omitted

- Duplicate copies of the same Scott Hinson PDF
- Installed `node_modules` and the local CAD Python environment
- Old/disposable render sweeps and caches; the pinned Build 649 closure
  artifacts referenced by `qa/build649-evidence.json` are historical release
  evidence, not current Build 652 certification
- Credentials, access tokens, browser state, and Git authentication
- Redundant original ZIP archives whose extracted contents are already present
  in the reference-mount audit
