# Changes

## Build 8 — 2026-09-28

- Remove repeated sidebar explanations, field captions and workspace descriptions.
- Shorten driver, editing and calculation status text while retaining actionable warnings.
- Keep detailed conventions and assumptions in Methods or closed disclosures.

Validation: all 23 existing regression checks passed. Visual browser checks remain unavailable because of the browser security-policy check.

## Manual / contour build 7 — 2026-09-28

- Make Manual edits live even when design checks report invalid dimensions. Keep warnings beside affected fields and in an expandable summary; allow study saving and exports.
- Load selected driver dimensions immediately and offer fitting as an explicit action. Switching to ported loading no longer starts fitting implicitly.
- Batch slider redraws, briefly defer acoustic screening, and flush pending geometry before saving, exporting or fitting. Preserve acoustic settings in exports while results are pending or unavailable.
- Add an optional annular cone-contour insert study, with adjustable axial clearance and central opening, 3D and section geometry, and displaced volume measured from its closed mesh.
- Keep the entire entry projection within the insert opening. Report impossible openings and provisional travel-clearance concerns without freezing editing.
- Disable acoustic screening for the insert: its narrow-gap loading and actual diaphragm geometry are outside the current model. Open-collector screening remains available for supported geometry.

Validation: 23 source-level regression checks passed. Independent insert review also swept 1,350 configurations for mesh closure and entry-opening clearance. Browser visual verification remains unavailable because the browser security policy check failed. These are software geometry checks, not physical or acoustic validation.

## Coupling / ported build 6 — 2026-09-28

- Continue the recovered single-file MEH editor with size-grouped driver selectors, fitted larger drivers and curved shared rear chambers.
- Keep invalid Manual entry/placement and rear-chamber changes pending, with the last valid geometry visible until corrected or discarded.
- Close a validation gap where an out-of-projection entry could still run acoustic screening or be accepted by rear-port fitting.
- Apply the Manual validation path to entry-size studies, nearby-entry selection, shape changes and area locking.
- Preserve the previous Build 657 application under `legacy/build657` and make the current editor the repository root page.

Validation: source-level regression tests. Browser visual verification was unavailable in the recovery environment because the browser policy check failed. Physical and acoustic validation remains outside these software checks.
