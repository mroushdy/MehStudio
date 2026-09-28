# Changes

## Coupling / ported build 6 — 2026-09-28

- Continue the recovered single-file MEH editor with size-grouped driver selectors, fitted larger drivers and curved shared rear chambers.
- Keep invalid Manual entry/placement and rear-chamber changes pending, with the last valid geometry visible until corrected or discarded.
- Close a validation gap where an out-of-projection entry could still run acoustic screening or be accepted by rear-port fitting.
- Apply the Manual validation path to entry-size studies, nearby-entry selection, shape changes and area locking.
- Preserve the previous Build 657 application under `legacy/build657` and make the current editor the repository root page.

Validation: source-level regression tests. Browser visual verification was unavailable in the recovery environment because the browser policy check failed. Physical and acoustic validation remains outside these software checks.
