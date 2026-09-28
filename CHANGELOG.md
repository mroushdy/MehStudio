# Changes

## Build 10 — 2026-09-28

- Replace stacked entry-cartridge, socket and collector surfaces with one continuous front-adapter mesh, without intermediate caps.
- Use a smooth transition for collector cross-section and offset, with flat endpoint slopes into the straight neck and mounting land. Share shading normals across axial joins.
- Calculate front volume, shared-enclosure displacement and enclosure bounds from the same curved transition; update section view to match.
- Rename Local neck length to Entry tube length. The model retains its fixed 3 mm passage allowance.

- Add a 40–120° nominal coverage goal to Assisted; use it throughout the profile, candidate search, export and import. Keep 60° as the default for older briefs.
- Add accessible tap-to-open information buttons to Assisted fields, including drive voltage and coverage.

Validation: 28 regression checks passed, including exact opening preservation, endpoint slopes and independent closed-mesh volume integration. Source geometry section was inspected; browser visual QA remains unavailable under the browser policy restriction.

## Build 9 — 2026-09-28

- Add an offset-outlet cone insert that follows the entry shape, rotation and driver offset, with adjustable opening, axial clearance and center relief.
- Use a closed mesh for displaced volume and exact section contours. Conservatively maintain the requested axial clearance to the assumed cone.
- Add an Inspect insert action and show the opening in footprint view. Preserve settings in JSON and include relief and outlet offset in metrics CSV.
- Reject impossible insert openings without freezing Manual editing. Acoustic screening remains unavailable with an insert enabled.

Validation: 25 regression checks passed; an additional 144-case geometry sweep found no folded surfaces, nonpositive front volumes or incomplete section contours among fitting inserts. Rendered browser verification remains blocked by the browser security-policy check.

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
