# PLACEMENT MATRIX — settings → expected layout (pin #15; this table is LAW)

The auto dialects, as implemented in `layout()` and asserted by `gate.js`.
ratio = tan(covH/2)/tan(covV/2). "wide" ≥ 1.25, "tall" ≤ 0.8, else square.

## Woofers (2way & 3way)

| nW  | wide            | square          | tall            |
|-----|-----------------|-----------------|-----------------|
| 2   | HORIZONTAL line (3 & 9 o'clock — the Danley line, pin #14) | horizontal line | VERTICAL line |
| 3+  | rows top+bottom | ring            | rows on sides   |

Explicit `placeW` (auto/ring/pairsH/pairsV) overrides (pin #10).
CLASSIC ANGULAR: rows clamp onto their OWN walls (facet-normal filtered);
ring becomes the symmetric wall partition — n = 4·base + rem, rem → top+bottom
when wide (sides when tall, odd seat bottom-center), rows centered per wall
(pin #13); barrel forms distribute arc-uniformly over the big facets (pin #9).

## Mids (3way)

| nM  | wide          | square                       | tall          |
|-----|---------------|------------------------------|---------------|
| 2   | PERPENDICULAR to the woofer line | perpendicular | perpendicular |
| 4   | rows top+bottom (Waslo #2-panel canon) | DIAG corner diamond when woofers are on a line (SH50 canon; on CLASSIC ANGULAR the 45° chamfer boards) — else ring | rows on sides |
| 6+  | rows top+bottom | ring                        | rows on sides |

Why the diamond is square-only: on a non-square throat the aspect collapses the
diamond's vertical pairs; they can never satisfy the λ/4 any-pair law and the
solver grows to the cap for nothing. Wide horns row up instead — measured, the
same 3-way that capped at 65″ solves at 42″.

## Placement discipline (all dialects)

- Drivers sit at the SMALLEST station whose constructed, measured layout clears:
  mutual seat distance ≥ 2·seatR + 8 mm, and measured 3-D clearance against
  already-placed sections (no radii-sum heuristics).
- CLASSIC ANGULAR: no seat's axial footprint (seatR·cos wall-slope) may straddle
  the flare-break crease; the break itself converges onto the woofer station
  (Waslo S3→S4).
- The crossover then DERIVES from the landed path (1.2× under the λ/4 null);
  every dialect is judged by the same law rows (docs/tap_laws.md).

## Honest refusals to expect

- Mid frames too big for their derived top (e.g. 5″ mids asked to reach ~360 Hz
  ceiling): [MID] any-pair spacing fails at every mouth — use smaller/fewer mids.
- Big woofer complements on high-floor CDs: derived XO under the CD floor —
  change drivers or count (the DCX464 floor is 300 Hz).
