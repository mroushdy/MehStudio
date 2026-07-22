# MEH AUTOPILOT — THE LIVE SELF-TESTING & SELF-FIXING SYSTEM (comprehensive plan)

Commissioned by Marwan 2026-07-22 after his review: "still a lot of stuff is wrong and
red... you need a live system that is able to see the 3D model and change the variables
to a bunch of variables for every family and test that everything works and makes code
adjustments on the fly." He is right. This document is the plan of record.

## 0. WHY THE CURRENT SYSTEM MISSES THINGS (honest failure analysis)

The session's evidence, defect by defect, shows FIVE structural gaps:

1. **Model-vs-drawn gap.** INSPECT/suite/sweep audit the MODEL (tap positions, clearances,
   areas). The DRAWN scene is audited only where we remembered to add a law (taps: yes;
   fixtures: only after F2; round-port aspect: only after the sliver bug shipped). His
   red-marker screenshot passes every gate because the gates never ask "does any drawn
   red exist?" or "is every visible object accounted for?"
2. **State-space gap.** The sweep visits islands x placements x one mouth cap. His
   screenshots consistently come from states the sweep never visits: size extremes,
   driver-selection extremes, family x shape combinations. 64" rect with those drivers
   is reachable in the UI and untested.
3. **Oracle blindness is invisible.** An oracle that never fires looks identical to an
   oracle that works. T3 passed for weeks while round ports drew 5:1 squeezed — the law
   had a 7:1 escape hatch nobody ever exercised deliberately.
4. **Fixed camera angles.** 10 orbit views catch more than 2 hand-picked ones (build 57
   lesson) but still miss occlusion-dependent defects (collars visible only through the
   mouth at near-axis angles).
5. **The human bottleneck.** Every render review passes through my judgment of
   "plausible", which repeatedly under-rejects. The bar must be encoded, not felt.

## 1. ARCHITECTURE OVERVIEW

Five layers, each independently useful, composing into a closed loop:

    [A] LIVE HARNESS  — one warm browser, real-UI state control, settle hooks
    [B] STATE LATTICE — the variable space per family + coverage strategy
    [C] ORACLE BATTERY— layered machine checks: model / scene / screen / reference
    [D] AGENT LOOP    — triage -> repro -> patch -> verify -> commit/revert
    [E] CORPUS        — every past defect as a permanent replayed state

The loop: A drives B through C; failures feed D; everything D fixes lands in E so it
can never silently return.

## 2. [A] THE LIVE HARNESS (replaces one-shot puppeteer scripts)

- **Warm daemon**: a single long-lived headless Chromium with the tool loaded once.
  Today every probe pays ~8s of boot + reload; the daemon answers in ~200ms per state.
  `harness.js` exposes: `set(vars) -> settled state report`, `snap(view) -> pixels`,
  `census() -> scene inventory`, `oracle(name) -> verdict`, `reload()` (after a patch).
- **Real-UI state path only.** All variable changes go through the actual DOM controls
  (select/dispatch, slider events) — never raw `S.x=` mutation. The session proved raw
  mutation lies (governor stomps it, applyAutos ordering differs). If a variable cannot
  be reached through the UI, that is itself a finding (dead control).
- **Deterministic settle detection.** Hook the end of `update()`/`applyAutos` chains
  (a monotone generation counter on window) instead of sleep timers. A state is
  "settled" when two consecutive generations produce byte-identical model summaries.
- **Hot patch cycle.** After an on-the-fly code adjustment, the daemon reloads the file
  and replays ONLY the states relevant to the change (from provenance, see [D]) before
  re-running the full battery.

## 3. [B] THE STATE LATTICE (the "bunch of variables for every family")

Per family/island, enumerate the axes that exist in the UI:

| axis           | values tested                                              |
|----------------|------------------------------------------------------------|
| mouth size     | island min, bundle default, midpoint, cap-1, cap           |
| shape family   | rect2f, rect1f, sup, cone, os (where offered)              |
| topology       | island canon + threeWay/topo variants where live           |
| driver selects | every curated option + custom at small/large extremes      |
| counts nM/nW   | every offered count                                        |
| placements     | every ENABLED plM/plW option                               |
| port shape     | round, rt, sq; npM/npW 1..offered max                      |
| advanced       | key levers at min/mid/max (L12, Lw, apM, apW, td, ratw)    |

- **Coverage strategy**: full cartesian is ~10^6+ states — intractable. Use
  **pairwise (2-way) covering arrays** per island (~hundreds of states), plus
  **all boundary values** (every axis at min and max with everything else canon),
  plus the **canon states**, plus the **corpus** [E]. Estimated: ~1,500 states/island
  -> ~10k states total; at 250ms/state ≈ 45 min for the full lattice. Nightly full
  run; per-patch runs use the affected-axes subset (~1-3 min).
- **Every state gets the FULL oracle battery** — not just the solve.

## 4. [C] THE ORACLE BATTERY (what "wrong" means, encoded)

Layer 1 — MODEL (exists, extend):
- All current laws (T1-T6, F1-F2, fit rows, XO pins, growth caps).
- **Red-bijection law**: count of drawn red-flagged objects == count of failing rows,
  and every red names its row. His screenshot (drawn reds, zero reported) becomes
  impossible to ship. This is the first new oracle to build.
- Dialect continuity: crossing a dialect boundary (flush/pocket) may change geometry
  but never produce a state where NEITHER dialect's laws apply.

Layer 2 — SCENE (new: the census):
- **Provenance tags**: every `grp.add()` site gets a stable id (`prov:'chamfer-cup'`).
  A mesh without provenance fails the census. (One-time sweep of ~40 draw sites.)
- **Nameability law**: raycast from 26 directions (cube corners/faces/edges); every
  hit must resolve to a provenance id. "If we can't name it, it doesn't ship" — as
  code, not discipline.
- **Containment laws**: per provenance class, where may it appear? (fixtures: never
  in horn air, never past mouth plane — F2 generalized to ALL classes incl. driver
  bodies, pads, blocks.)
- **Overlap census**: pairwise bbox/sample intersection between solid classes that
  must never interpenetrate (driver vs driver, fixture vs shell, body vs cabinet).

Layer 3 — SCREEN (new: quantitative pixels, not vibes):
- **Red-pixel detector**: any pixel cluster in the collision-red hue == fail unless
  the model reports reds (ties to red-bijection).
- **Symmetry**: 4-fold islands must render 4-fold-symmetric fronts (rotate 90°, diff,
  threshold). Catches single-corner anomalies instantly.
- **Region census**: connected-component count of dark (tap) regions on the front
  == expected port count from the model. Catches invisible/missing/sliver taps
  (the 52x10 ellipse bug dies here a second way).
- **Occlusion probe**: render twice — full scene vs shell-only. Hardware pixels
  visible in the full render OUTSIDE the mouth aperture region that are absent in
  shell-only = hardware reading through/around the cabinet (the collar-ring bug).

Layer 4 — REFERENCE LIKENESS (new: the structural spec of "looks right"):
- Per family, a small declarative spec derived from his reference photos, e.g.
  pa3way front: {4 slots at 45° azimuths, mid-radius band; 4 small circles near
  apex; solid corner regions ≥ X% coverage; no visible hardware class}. Checked
  against the region census — structural matching, not pixel diffing. The specs
  live next to the reference images in the repo (`reference/specs/*.json`).
- Goldens remain for regression only (mad=0.0 on re-render), not for judgment.

Layer 5 — ORACLE HEALTH (mutation testing — oracles must PROVE they can fire):
- A library of deliberate breakages (scale a port 5x, float a driver, skip a board,
  paint a red) applied in a sandboxed copy; every oracle must catch its assigned
  mutants. An oracle that catches nothing is deleted or fixed. Run weekly and after
  any oracle edit. This is how we avoid T3-style escape hatches.

## 5. [D] THE AGENT LOOP (code adjustments on the fly)

The loop I (or any future session) run — mechanized so it survives context resets:

1. **Sweep** the lattice subset (or full, nightly). Collect violations.
2. **Cluster** by (oracle, provenance id, family, axis values). Rank by frequency
   x severity. Pick the top cluster only.
3. **Repro-first**: emit `corpus/NNN_repro.json` (exact state + oracle + actual vs
   expected) and CONFIRM it fails before touching code. No repro, no patch.
4. **Localize** via provenance: the failing object's draw site + the law's site are
   both ids -> the patch target is known, not guessed.
5. **Patch** via count-asserted .py scripts (unchanged discipline; the session's
   heredoc failures stay banned).
6. **Verify ripple**: re-run the repro (must pass), the cluster (must pass), the
   axis neighborhood (must not regress), then the full battery. Any regression ->
   auto-revert the patch and record the conflict for design attention (some fixes
   are dialect decisions, not bugs — F3 vs SH96 taught this).
7. **Commit + push** with the repro id in the message. The repro joins the corpus
   permanently.
8. Loop until **two consecutive full-lattice runs are clean**, then stop and report
   with the evidence pack (before/after renders per fixed cluster).

Autonomy boundary: patches that change ACOUSTIC laws or island canon (not drawing/
placement bugs) get flagged for Marwan's sign-off instead of auto-committed — the
SH96 canon flip is the class of change that deserves a human look.

## 6. [E] THE CORPUS (defects become permanent tests)

- Every screenshot he has ever sent becomes a state file + expected-oracle entry
  (~20 from this session, reconstructed from the fix history).
- **Corpus entry #1**: his 2026-07-22 screenshot — rect 64", large woofer pair +
  small drivers with RED markers visible while all gates pass. Reproduce by lattice
  search over 64"-cap states; whatever oracle failure explains it becomes the entry.
- The corpus replays in every battery run (it is small and fast).

## 7. BUILD PHASES (each phase ships value alone)

- **P0 (first session, ~1 build)**: save the queue (done, this file's sibling);
  red-bijection oracle; red-pixel detector; corpus entry #1 root-caused and fixed.
- **P1 (~2 builds)**: harness daemon + settle hooks + real-UI state driver;
  provenance tags on all draw sites; nameability census.
- **P2 (~2 builds)**: state lattice runner with pairwise coverage + boundary states;
  containment + overlap + symmetry + region-census oracles; first full-lattice run
  (expect a large finding list — triage into the loop).
- **P3 (~2 builds)**: occlusion probe; reference-likeness specs for all 7 families;
  oracle mutation testing.
- **P4 (ongoing)**: the agent loop runs as the standard dev cycle; deploy.sh gates
  become "battery clean + corpus clean + lattice subset clean"; nightly full lattice.

## 8. WHAT THIS REPLACES / KEEPS

- KEEPS: patch discipline, blessed states, goldens-as-regression, orbit gallery
  (it becomes evidence output, not the primary detector), all existing laws.
- REPLACES: my eyeball as the primary detector (it becomes the last-mile check on
  the evidence pack); one-shot puppeteer scripts (daemon); hand-picked probe states
  (lattice); "plausible" (reference specs).

## 9. THE STANDING QUEUE (saved per his instruction — sibling file queue.md)

See docs/queue.md — the feature queue is versioned in the repo from now on, updated
every time an item lands, so no session or context reset can lose it.
