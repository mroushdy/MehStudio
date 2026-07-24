# ADAPTIVE SETTINGS — the anti-trash layer (his ask, 2026-07-24)

His words: "audit the sanity of the settings and... develop an adaptive system
that adjusts wrong settings atomically once you adjust certain settings — that
way it's harder for the user to achieve trash MEH results."

DOCTRINE FIT: v5 already refuses nonsense loudly (REFUSED banner, law rows,
solve() mouth growth, atCap honesty). The adaptive layer extends this: when the
user moves a knob, the tool CO-MOVES the knobs a designer would co-move — as
ONE atomic state transition, every adjustment ANNOUNCED in a ledger. It never
silently papers over a problem and it NEVER edits user intent.

## 1. THE INTENT BOUNDARY (the core rule)

Two knob classes. The adaptive layer may only touch DERIVED-class knobs:

- INTENT (never auto-changed): topo, style, covH/covV, nW/nM, wPre/mPre/cdSel,
  mouthW*, npW/npM, shW/shM, mount, placeW, subXO, seN**, fxLo.
- DERIVED (co-moved, with ledger entries): dpW/dpM, sdW/sdM, vtcW/vtcM,
  xmW/xmM (on custom od), td/throat/cdFloor/cdDepth (from cdSel),
  hfExit/recXO/hornType (1way unit), fxDerived (already), dialect selections
  ('auto' placements), 1way seN (style implies it), 1way mouthW (driver-sized
  2.35×od rule — the established b518 behavior, now ledgered).

*mouthW is intent, but solve() already grows it on growth-fixable fails and
refuses at cap — existing behavior, becomes a ledger entry instead of a silent
jump. **seN is intent except on 1way (ROUND|SQUARE is the whole form space).

## 2. SETTINGS SANITY AUDIT (sweep results — see §5 status)

Method: enumerate the UI-reachable space (slider ranges from shell.html),
solve every state, classify crash / refused / clean / warn, then hunt SILENT
TRASH: 0-fail states that are physically absurd. Heuristic detectors:
squeezed mid band (<1/3 octave), big cones crossed absurdly high, roll
consuming the mouth, depth-vs-mouth fiction, non-finite response points,
pattern fiction (mouth < λ/2 at the low XO).

FINDING #1 (confirmed by code inspection before the sweep): the odW/odM
sliders derive dp (od·0.5 / od·0.6) and flip to 'custom' — but FREEZE
sd/vtc/xm at the last preset's values. Dragging a 6.5in preset to a 46cm
frame keeps Sd=132cm² — every tap law then sizes ports for the wrong cone.
FIX: class curves FIT FROM THE PRESET TABLES themselves (power-law through
the 12 WPRE + 4 MPRE entries — data-derived, no invented constants); ledger
announces "custom 15in: Sd 132→~820 cm² (class curve)".

## 3. adapt(S, changedKey) — the atomic transition

Engine-side pure function; shell calls it on EVERY control change:

    const {S2, ledger} = MEH2.adapt(S, key);
    // ledger: [{knob, from, to, why}] — rendered as the ADAPTED strip

Properties (gate-asserted, new section 2.10):
- DETERMINISTIC: same (S, key) → same result.
- IDEMPOTENT: adapt(adapt(S,k).S2, k) is a fixpoint (no oscillation).
- ATOMIC: one commit; undo restores the pre-adapt state in one step.
- HONEST: ledger entry for every changed knob; REFUSED banner logic
  untouched — genuinely infeasible intent still refuses loudly.
- BOUNDED: only DERIVED-class knobs may differ between S and S2.

Policy pipeline (in order):
1. DERIVE: dependents of changedKey (cdSel→CD fields; wPre/mPre→driver
   fields (+1way extras + mouth resize); custom od→dp + class-curve
   sd/vtc/xm; 1way style→seN).
2. CLAMP-ILLEGAL: range clamps that make states meaningless rather than
   wrong (mouthW≤cap; ordering constraints the sweep confirms, e.g. roll
   vs mouth — each clamp needs its sweep evidence, no taste clamps).
3. REPAIR-BY-DERIVED: run solve()'s growth loop (existing) — its mouth
   growth becomes a ledger entry ("mouth 24→27: ring fit").
4. EVALUATE + REFUSE: unchanged. Trash detectors that survive adaptation
   surface as law rows (informational until sourced thresholds exist).

## 4. UI: the ADAPTED strip

A slim strip above the law rows listing the last transition's ledger
("ADAPTED — Sd 132→818 cm² (class curve, custom 15in) · mouth 24→27
(ring fit)"). Disappears when a change adapts nothing. No modal, no
flicker: rebuild() renders S2 directly.

## 5. STATUS

- Sweep: RUNNING at write time (19k states) — trash-class counts land here.
- adapt() v1 scope: policies 1+3 + ledger + gate 2.10. Policy-2 clamps wait
  for sweep evidence. Trash-detector law rows: only the classes the sweep
  actually finds, informational first.
- Open his-ruling items: none expected — the layer only moves derived knobs
  and announces everything; intent stays his.
