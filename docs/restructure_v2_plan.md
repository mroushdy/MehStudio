# MEH STUDIO v2 RESTRUCTURE — TOPOLOGY × FORM × CONSTRUCTION (Marwan, 2026-07-22)

Confirmed direction (his call, twice): the island list stops being the front door.
Three orthogonal axes, everything else derived. Reference: additaudio "Mother"
(3-way, 4x15 + 6x4 + 1.4" CD, ATH-style flare) + References A/B/C in
printed_mounts_spec.md.

## Axis 1 — TOPOLOGY (the main choice)
- 1-way coax: one coax driver, synergy-style exit (cone taps ring the CD throat).
  Reference C is the canonical build.
- 2-way: CD + woofers (wall, corner, or radial-flower placements).
- 3-way: CD + mids + woofers (pa3way/SH96/Mother class).

## Axis 2 — FORM (ATH principles)
- rect: two-flare panel construction (current rect2f).
- superellipse / round: SMOOTH TRANSITION profiles - curvature-continuous flare
  (ATH/R-OSSE-style), and the Mother-style MOUTH ROLL-BACK termination (the donut
  lip) to kill edge diffraction. Our superformula math generates the unique mouth
  shapes he asked for.
- Mouth shape and coverage stay the inputs; the profile law is per-form.

## Axis 3 — CONSTRUCTION
- wood: panels + printed apex/corner units (References A/B).
- printed: the whole flare is the part (Reference C / Mother).

## Migration
- The 7 islands become curated PRESETS inside this space (each = topology x form x
  construction + driver bundle + placement). The solver, tap laws, slot canon,
  INSPECT laws, sweep and gates are UNCHANGED underneath - this is a front-end and
  derivation-order restructure, not a physics rewrite.
- Slot canon already matches Mother (slim, long axis along flow, mids tight to
  throat). Add stadium ends + optional foam (his tap close-up).
- Sequencing: printed-mount rebuild (queue item 1) lands first - its parts become
  the construction axis; then the topology/form front door; then flower + SH96
  presets fill the space.

## Open defect logged 2026-07-22 (his corner close-up)
The rect form's mouth-end SECOND FLARE draws notched arrow facets at the corners -
"looks very different than any synergy horn" (correct: reference square horns read
as ONE clean pyramid; the JMOD second flare exists but its corner transition is a
plain diagonal). Fix in the form axis: rect defaults to the clean single-pyramid
look (plain diagonal corner facets); the two-flare panel stays as an explicit
construction option whose corners are simple diagonals, never the arrow notch.

## Diagnosis update (build 69)
The corner-facet taper landed (helps big-mouth states where the board plane dies
early), but the arrow READ on canon islands is the SHADING of four flat regions
meeting at each corner (wall pre/post-knee x 2 walls) plus the chamfer band - a
two-flare artifact. The real fix is the form-axis 'clean pyramid' rect option
(single flare, st.knee=st.depth, honest Keele waistbanding note) - do it WITH the
topology/form front door, not as a render hack.
