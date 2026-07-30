# Build 649 closure evidence map

This document is the review map for the 32 rows in
`docs/build649-closure-ledger.md`. It does not change a ledger status and is
not a substitute for `qa/build649-evidence.json`. A row may be copied into the
machine-readable evidence file only after its listed commands pass and a
reviewer has inspected every listed image.

The deterministic browser board is:

```sh
cd qa
npm run qa:build649-render-board
```

It writes to `qa/artifacts/build649-closure/`. To inspect an assembled
candidate rather than the live-source composition:

```sh
node browser/build649-closure-render-board.mjs --app-root ..
```

## Geometry and rendering

| Row | Source / contract evidence | Numeric geometry / topology evidence | Browser evidence |
|---|---|---|---|
| B649-G01 | `qa/node/panel-profile-mount-preview.test.mjs` | Same test probes the production field inside the forbidden horn volume; `qa/node/ui-regression-contracts.test.mjs` audits clipped radial roots. | `user-integrated/no-driver-assembly.png` |
| B649-G02 | `qa/node/panel-profile-mount-preview.test.mjs` asserts one bearing owner and no duplicate integrated annulus. | `qa/node/exact-mesh-diagnostics.test.mjs` planar-normal striping diagnostic. | `user-integrated/mount-plate-1.png`, `user-integrated/no-driver-assembly.png` |
| B649-G03 | `qa/node/tap-lumen-render-contract.test.mjs` asserts one continuous surface and canonical tap clipping. | `qa/node/tap-lumen-continuity.test.mjs` samples every representative section through the exact field. | `tap-lumen/contact-sheet.png` |
| B649-G04 | `qa/node/panel-profile-mount-preview.test.mjs` and `qa/node/tap-lumen-render-contract.test.mjs`. | `qa/node/tap-lumen-continuity.test.mjs` probes both horn and chamber endpoints plus chamber air. | `tap-lumen/contact-sheet.png` |
| B649-G05 | `qa/node/panel-profile-mount-preview.test.mjs` asserts a closed registered cartridge and gasket; `qa/node/cartridge-retention-regression.test.mjs` owns retention voids. | Both tests assert gasket gap, chamber material, M4 count/layout, cutter clearance, and refusal. | `user-cartridge/mount-assembly.png`, `user-cartridge/no-driver-assembly.png` |
| B649-G06 | `qa/node/build649-user-state-regression.test.mjs`. | The symmetric-state test asserts port centers, aim, pair spread, and opposed-driver residuals; `qa/node/tap-station-diagnostics.test.mjs` asserts legal station bounds. | `user-integrated/literal-taps.png`, `ui/tap-station-diagnostics.png` |
| B649-G07 | `qa/node/tap-lumen-render-contract.test.mjs` asserts zero acoustic protrusion and hides diagnostic overlays from no-driver view. | `qa/node/tap-lumen-continuity.test.mjs`; user-state field probes in `qa/node/panel-profile-mount-preview.test.mjs`. | `tap-lumen/contact-sheet.png` |
| B649-G08 | `qa/node/mount-envelope-regression.test.mjs`. | Same test covers auto-growth, mouth-cap refusal, every selectable profile, radial dense verification, and exact preflight refusal. | `user-integrated/no-driver-assembly.png`, `ui/mouth-package-summary.png` |
| B649-G09 | `qa/node/throat-morph-regression.test.mjs`. | Same test asserts monotonicity, tangent continuity, bounded area derivatives, and printable wall clearance. | `throat-morph/contact-sheet.png` |
| B649-G10 | `qa/node/throat-morph-regression.test.mjs`. | Same test plus `qa/node/exact-mesh-diagnostics.test.mjs` and `qa/node/packed-mesh-compatibility.test.mjs` cover common indices, normals, degeneracy, topology, audit, and STL parity. | `throat-morph/contact-sheet.png` |
| B649-G11 | Scene-tag contract in `qa/node/ui-regression-contracts.test.mjs`; universal mount contract in `qa/mount-interface-universal.test.js`. | Semantic scene assertions in `qa/browser/render-inspection.mjs` require cells/plates and forbid driver models in both construction modes. | Both `user-integrated/no-driver-assembly.png` and `user-cartridge/no-driver-assembly.png` |
| B649-G12 | Board ownership and row coverage in `qa/browser/build649-closure-render-board.mjs`. | Each sub-board has semantic counts/hashes plus the numeric tests above. | Inspect all six contact sheets: `user-integrated`, `user-cartridge`, `tap-lumen`, `profile-laws`, `throat-morph`, and `wall-topologies`. |

## Profile, acoustics, and parametric behavior

| Row | Source / contract evidence | Numeric geometry / topology evidence | Browser evidence |
|---|---|---|---|
| B649-P01 | `qa/node/profile-law-integration.test.mjs`. | Distinct profile hashes, stations, and depths in that test and `qa/node/build649-user-state-regression.test.mjs`. | `profile-laws/contact-sheet.png` |
| B649-P02 | `qa/node/oneway-profile-law-integration.test.mjs`. | That test plus `qa/node/oneway-coax-apex-regression.test.mjs` prove an unchanged protected core and changed post-handoff stations/refusal. | `ui/oneway-profile-control.png` and the three `ui/oneway-profile-*.png` images |
| B649-P03 | `qa/node/profile-control-parity.test.mjs`; `docs/build649-rosse-control-parity.md`. | `qa/node/profile-laws-regression.test.mjs` and `qa/node/profile-law-integration.test.mjs`. | `ui/profile-advanced.png`, `profile-laws/contact-sheet.png` |
| B649-P04 | `qa/node/section-family-control.test.mjs`. | `qa/node/rounded-rectangle-section.test.mjs` covers perimeter, normal, offset, preview, exact field, watertight audit, and export. | `ui/rounded-rectangle-control.png`, `ui/rounded-rectangle-corner.png`, `ui/rounded-rectangle-section.png` |
| B649-P05 | `qa/node/ui-regression-contracts.test.mjs` current-plan count preflight contract. | Driver-dependent count assertions in `qa/node/build649-user-state-regression.test.mjs`. | `ui/count-nw10-32.png`, `ui/count-w5-32.png` |
| B649-P06 | `qa/node/ui-regression-contracts.test.mjs` reactive label contract. | Same test executes refresh at 32 and 40 inches and forbids stale 32-inch text. | `ui/count-nw10-32.png`, `ui/count-nw10-40.png` |
| B649-P07 | `qa/node/tap-station-diagnostics.test.mjs`; `qa/node/tap-pair-spacing-regression.test.mjs`. | Those tests assert wavelength/path/coherence limits, structural web, under-cone bounds, and override refusal. | `ui/tap-station-diagnostics.png`, `user-integrated/literal-taps.png` |
| B649-P08 | Same station and pair contracts as P07. | Legal near/far station, seam objective, CD distance, edge bias, and override bounds are asserted there. | `ui/tap-station-diagnostics.png`, `user-integrated/literal-taps.png` |
| B649-P09 | Mouth/request/package separation in `qa/node/ui-regression-contracts.test.mjs`; bounded sizing action in `qa/node/profile-control-parity.test.mjs`. | Package growth/refusal in `qa/node/mount-envelope-regression.test.mjs`; sizing-only calculation/refusal in profile parity. | `ui/profile-advanced.png`, `ui/mouth-package-summary.png` |
| B649-P10 | LF/internal crossover naming and scope in `qa/node/ui-regression-contracts.test.mjs`. | `qa/node/subxo-semantics-regression.test.mjs` proves the LF reference does not mutate count/mouth/station/spacing/XO. | `ui/lf-system-reference.png` |
| B649-P11 | Driver-cell saved-state and disclosure contracts in `qa/node/ui-regression-contracts.test.mjs`. | `qa/node/build649-state-depth-contract.test.mjs` proves measured depth changes chamber/package geometry and unknown state uses conservative clearance. | `ui/driver-cell-collapsed.png`, `ui/driver-cell-measured.png` |
| B649-P12 | Pre-release schema/no-migration contracts in `qa/node/ui-regression-contracts.test.mjs` and `qa/node/section-family-control.test.mjs`. | Unknown current enum refusal cases in `qa/node/build649-state-depth-contract.test.mjs`. | `ui/current-schema-refusal.png` |
| B649-P13 | `qa/node/build649-source-family-contract.test.mjs`. | That test plus `qa/node/oneway-profile-law-integration.test.mjs` and `qa/node/oneway-coax-apex-regression.test.mjs`. | One-way profile controls and three one-way profile renders; `profile-laws/contact-sheet.png` for the shared two-way law. |
| B649-P14 | `qa/node/build649-source-family-contract.test.mjs`; `docs/build649-source-family-contract.md`. | Named-source provenance, explicit Solana refusal, and compact/large calculated witnesses in that test; `qa/node/twoway-audio-golden-rules.mjs`. | `user-integrated/front-full.png`, `user-cartridge/front-full.png` |
| B649-P15 | `qa/node/curved-facets-contract.test.mjs`; `docs/build649-curved-facets.md`. | Same test asserts exact shared seams, developability, profile-driven curvature, forming refusal, and shared preview/exact boundary. | `wall-topologies/contact-sheet.png` |

## Interface and release discipline

| Row | Source / contract evidence | Numeric / state evidence | Browser evidence |
|---|---|---|---|
| B649-U01 | `qa/node/ui-regression-contracts.test.mjs` asserts detailed diagnostics follow the viewport and compact status remains in the sidebar. | The closure board compares renderer and diagnostics bounding boxes. | `ui/diagnostics-below-render.png` |
| B649-U02 | Saved controls and default-collapsed accessible details contract in `qa/node/ui-regression-contracts.test.mjs`. | Known/unknown depth assertions in `qa/node/build649-state-depth-contract.test.mjs`. | `ui/driver-cell-collapsed.png` |
| B649-U03 | Canonical hash contract in `qa/node/build649-state-depth-contract.test.mjs`. | `qa/browser/build649-state-mutation-contract.mjs` mutates state and asserts one revision/hash through UI, preview, report, exact result, and stale-worker refusal. | `ui/release-state-identity.png`, `user-integrated/front-full.png` |
| B649-R01 | `qa/node/build649-closure-gate.mjs` and this complete row map. | `node qa/node/run.mjs --tier release` plus row-map/file/hash verification in the closure board. | `manifest.json`, every image named by its `rowRenderMap`. |
| B649-R02 | `gate.js`, `assemble.js`, and `qa/node/build649-closure-gate.mjs`. | Source-bundle hashes and shared state identity in the closure manifest and release gate; final runtime inspection recorded build 649, state `b649-2yhurk7dfwkr7-31q`, revision 1, `nodrv`, and zero visible runtime errors. | `final-in-app/build649-header.png`, `final-in-app/build649-no-driver-render.png`; inspected at `http://127.0.0.1:8520/meh5.html?build=649&view=nodrv&rev=release-final`. |

## Visual-review disposition

- Integrated and retained-cartridge boards: visually inspected; no driver appears
  in the no-driver views, and the retained cell is closed and registered.
- Tap-lumen board: visually inspected; its three views show a continuous open
  passage with no layered helper mesh.
- Profile-law and one-way boards: visually inspected; fixed cameras show
  distinct conical, Classic OS, and OS-SE shapes and the manifest records
  distinct hashes.
- Throat morph: visually inspected; the close-up and side section are smooth.
- Rounded-rectangle controls, diagnostics placement, schema refusal, and shared
  state identity: visually inspected.
- Curved facets: visually inspected after the independent line-overlay removal;
  the regenerated wall-topology board has no out-of-mouth seam/helper lines
  and clearly differs from both smooth and classic angular.
- R02: admitted after the assembled, cache-busted Build 649 header and
  no-driver render were captured and personally inspected at the final URL.
