# MEH Studio Build 656 — revised three-driver handoff

The initial Build 656 candidate was substantially behind the visual completion
level of the two-way assembly and was incorrectly described as finished. Its
original packaged handoff is superseded and must not be used.

This revised source is release-accepted as an interactive three-way
analysis/inspection preview after direct browser comparison with the two-way
benchmark. It visibly includes LF, MF, and HF driver bodies. It remains
explicitly non-manufacturing and does not authorize STL.

## Post-retraction rebuild status

- The schema-2 three-way workspace now reuses the proven two-way
  `driverBody()` visual builder for frame, gasket, surround, cone, dust cap,
  motor, and terminal presentation.
- No-driver and mount inspection reuse the two-way `annularPlate()` bearing
  primitive at the schema-2 solver's exact face and normal.
- LF and MF placement plans now have explicit, solver-validated azimuth
  offsets instead of stacking both physical sources at azimuth zero.
- Full assembly includes translucent canonical three-way lumen negatives and
  adapter context; opaque full-face construction hosts remain limited to
  inspection DTOs.
- Package bounds now contains the horn, shared driver visuals, throat, and
  lumen context instead of displaying an empty wire box.
- The complete source suite passes **371/371** after these changes.

The withdrawn Build 656 archive remains superseded. The replacement archive
containing this handoff is the accepted analysis-preview deliverable.

## What changed

- The solver now passes its hash-owned closed solid-intent result into the
  render assembly.
- Full assembly uses the audited closed horn shell and throat collar instead
  of the intentionally open inner analysis surface.
- Every LF/MF physical driver has a closed full-face plate and a solid adapter
  joining that plate to the horn.
- The four canonical tap lumens use the continuous closed negative meshes.
- Full assembly hides lumen negatives; lumen inspection uses a translucent
  horn; section inspection uses a separate translucent section material.
- Deterministic front three-quarter, mount, lumen, section, and package camera
  presets replace the rear-disk framing.
- Shaded supplied horn normals make the inner profile legible.
- Release tests now reject an open-only horn, missing mount adapters, missing
  physical driver instances, incomplete continuous lumens, or driver/lumen
  leakage into the wrong views.

## Launch

From this directory:

```bash
node serve.js 8520
```

Open:

```text
http://127.0.0.1:8520/meh5.html?build=656&reset=1&view=full-assembly&rev=release-final
```

Select `3-WAY`.

## Current verification

- Source/schema-2 suite: **371 passed, 0 failed**.
- Revised full, horn, no-driver mount, lumen, section, and package views:
  **manually inspected**.
- Visible physical sources: **LF + MF wall drivers + HF compression driver**.
- Original release package: **withdrawn/superseded**.
- Replacement package: **accepted analysis-preview handoff**.
- Runtime identity: **Build 656**.

## Truth boundary

Build 656 remains a development candidate for the interactive calculated T3
analysis/inspection assembly. It is not a completed visual release and is not
a fabrication-authorized Boolean solid. Exact mesh, STL, manufacturing, and
Hornresp export remain locked until their independent kernel, continuity, and
fabrication audits pass.

The runnable calculated study uses one HF throat source, one MF wall source,
and one LF wall source. The two visible rear driver bodies are the MF and LF
physical drivers; the HF source is represented by the throat collar/interface.
Documented CX3 and H3 records remain reference/candidate workflows unless
their required physical evidence is supplied.

## Principal changed files

- `threeway-solver.js`
- `threeway-render-assembly.js`
- `threeway-render-model.js`
- `shell.html`
- `qa/node/threeway-quick-starts.test.mjs`
- `qa/node/threeway-render-assembly.test.mjs`
- `qa/node/threeway-ui-integration.test.mjs`
- `qa/node/build655-source-contract.test.mjs`
- `qa/browser/build655-delivery-contract.mjs`

The Build 655-named QA entry points are retained for compatibility, but their
runtime assertions now validate Build 656.
