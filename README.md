# MEH STUDIO — SESSION HANDOFF (build 78, verified deploy)
Companion to Horn Studio · Silence Please · NYC

## WHAT THIS IS
`meh_studio.html` — self-contained multiple-entry-horn (MEH-class) design tool.
Island-first: **SEVEN live islands** (unity, coax2, quadrant, knuckle, wide, roundprint,
pa3way) — the knuckle island went LIVE in build 49 (SAWMOD S2 passages + remote bandpass
woofers, corpus-grounded). Value-level enforcement, drivers↔horn-size coupling,
geometry-derived crossovers, seam-tap law, knuckle passage law, drivers-first designer,
Hornresp ME2 mapping. Verified against reference fixtures + blessed settled states.

## THE DEV LOOP (build 60 — the process fix)
After EVERY patch, BEFORE any gate: `node meh_inspect.js` — the in-tool INSPECT engine
audits tap-scale invariants on all islands and saves camera-framed evidence crops to
/tmp/inspect for anything wrong. In the tool itself, the Inspect button runs the same
audit live; clicking a finding flies the camera to it. The contract is project-agnostic.

## THE HARD RULE (Marwan's mandate, 2026-07-20)
**Nothing ships without a full VERIFY PASS.** Every change: patch → `node verify.js`
→ `python3 verify_visual.py` (21 goldens; `--bless` ONLY after side-by-side review)
→ `node meh_suite.js` (75 numeric checks, browser-free) → `system/deploy.sh` runs all
four + livetest, then copies. Never bypass it. Blessed artifacts: `golden/*.png` (21)
AND `golden/settled_states.json` (regenerate DELIBERATELY with capture_states.js).

## CREDENTIALS (never commit)
GitHub push token lives at `.secrets/gh_token` on the working machine — chmod 600,
gitignored. NEVER paste it into any file that ships (repo, zip, docs): pushed tokens
are auto-revoked by secret scanning. Rotate it if this machine is ever shared.

## ENVIRONMENT SETUP (fresh sandbox)
```
mkdir -p ~/hs && cd ~/hs && cp <zip>/meh_studio.html meh_studio_v4.html
cp -r <zip>/system/* . && cp -r <zip>/golden .
npm i puppeteer-core@22 three@0.128.0
# no @sparticuz/chromium binary needed if a system Chromium exists: drop-in shim at
# node_modules/@sparticuz/chromium/index.js pointing at it WITH SwiftShader WebGL flags
# (--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader) — three.js r128
# renders real pixels headless; goldens reproduce at mad=0.0.
node meh_livetest3.js     # expect 13/13
node verify.js && python3 verify_visual.py    # expect PASS, 21/21 goldens
node meh_suite.js         # expect 83/83
```
Patches: ALWAYS via written .py scripts (create_file), never inline heredocs. Never pipe
test output through `tail` in a gating chain. `typeof` does NOT guard const TDZ — route
late tables via window. \u escapes are illegal in python regex replacement templates (lambda).
Storage key = mehstudio_v42 (INTENT-ONLY payload: {__b, arch, adv, tune, full?}); bump on ANY state-schema change.

## BUILDS 62–63 — what landed
- **SLIM-SLOT CANON** (Marwan's reference-photo law): rt/sq ports are 3:1 slim rectangles
  with the LONG axis ALONG the horn (flow dir), never around the diameter — sa=√(Ap·3)/2,
  sb=√(Ap/3)/2, drawn as a scaled unit plane so drawn area is EXACT. Chamfer kidneys share
  ONE common ring radius (corner-fill law: ring reaches toward the corner run) with
  projection-aware stagger so front-view pairs never superimpose.
- **INSPECT laws T3–T6** (each validated by FAILING on the then-current geometry first):
  T3 drawn-slot truth (area + aspect ≤3.6), T4 front-projection distinctness, T5 ring
  regularity (radius spread ≤6 mm, azimuth gaps ≤8°), T6 in-chord (chord − (cOff+sb+3 mm)).
  meh_inspect.js: default run = 7 canon islands (deploy gate 8); `--full` = the ~10-min
  reachable-space sweep (islands × placements × mouth cap). Silent fails ≠ F1 honest refusals.
- **ARCH_PL honest placement menus**: every island's placement dropdowns list only options
  that MEAN something there; dead/broken combos are disabled with a reason. The full sweep's
  26 broken off-canon states → 0 silent (65 clean / 3 honest refusals).
- **ALL drivers look real (meshApprox)**: presets without true CAD wear the nearest real
  body rescaled per-axis (kr=od/CAD_D, kz=dp/CAD_depth). 10 true CAD bodies now embedded
  (+18SW115, +8MDN51). Ring finisher reads MEH.minRimDist (not rounded row text); growth
  chases the real 4 mm chamfer-mid ring; pa3way cap 50 (settles 44″ · L12 2.1 · Lw 9.15);
  stale INFEASIBLE notes stripped on clean solves. V3D.tgt orbit target + INSPECT.frame().

## BUILD 57 — what landed
- **THE ORBIT VIEWER (gate #8, Marwan's directive)**: orbit_viewer.js renders every island
  from 10 angles; montages are REVIEWED at full res before any bless; build_viewer.py
  packages meh_viewer.html (self-contained gallery, ships with every deploy). Hand-picked
  angles lie — build 56's slabs passed 2 angles and interpenetrated in orbit.
- **Sector-safe pocket CUPS** replace the slabs: cone (board→frame skirt) + cylinder cover
  + cap, lathed on the driver's own axis; radius ≤ sector width provably at every station.
  Render-only: settled states byte-identical, goldens re-blessed after the 70-frame review.

## BUILD 56 — what landed
- **Floating-kidney class EXTINCT** (probe_tapsurface.js): chamfer taps were in open air
  (cavityMargin −24…−77 mm). Taps now live ON a real 45° chamfer BOARD (flat, flare-riding
  normal, c0 stored); ring law at the innermost kidney reborn (sweep caught 8 silent states
  without it); sweep asserts ON-BOARD (|p·n−c0|≤4 mm); dF law: frame fully behind the board.
- Boards + printed corner BLOCKS drawn (his plate/square/slit photos); chamfer pods no
  longer draw into the horn (the block is the mount). Corner slope was HALVED since build 52
  (forward-diff/2eP) — fixed, the board parallels the ridge.
- Post-bless review caught + reverted a pad-wedge regression on roundprint. Settle drift:
  quadrant Lw 2.85, pa3way doffW 0 — re-blessed.

## BUILD 55 — what landed
- **pa3way = reference chamfer mids** (his "big format still messed up", probe-first): chamfer
  machinery per-kind; bundle plM:'chamfer'; governor respects it; WARN-BAND FINISHER walks
  Lw so rings clear the REAL 4 mm GAP (no more riding the −3 mm prim tolerance on screen);
  growth cap 44→46 (probe: both curated 12″ woofers land clean at 46″). Settled 42″ ·
  L12 1.95 · Lw 8.85 · doffW +1.1″ · XO 300/600. Suite 75 (3 pa3way canon checks + identity pin).
- Quadrant pocket discs frame-sized at the plate line (front = his plate-photo clover);
  knuckle mounts get conformal wedges on curved shells (no more daylight).
- verify_visual --bless adopts sub-threshold drift (goldens = reviewed truth again; all 21 mad=0.0).
- npM=2 on pa3way overflows the near-throat corner run → honest red (fail rows + red drivers);
  a tangential/axial kidney-stack dialect needs a reference before it's modeled.

## BUILD 49 — what landed
1. **Open Case #1 CLOSED by probe** (`probe_pa3way.js`, re-runnable): pa3way corner mids are
   DOUBLY infeasible — Ø157 mid frame ∩ Ø260 side-woofer frame at the shared wall corner is
   **mouth-invariant** (−10 mm flat, 34→40″), AND corner forces L12 floor 4.35″ → XO ceiling
   392 Hz < CD 600. Edge clears only the second. **Diagonal is the correct rect layout, not an
   interim.** Forced corner remains an HONEST refusal (named INFEASIBLE) by design.
2. **plM='knuckle'** — SAWMOD S2 knuckle passages (whitepaper §3): the driver stays seated on
   its wall; a small port channel reaches inward, injection face aimed at the throat (common
   acoustic center; ports move ~94→~49 mm class spacing). Reach self-limits at the HF-jet
   floor. New rows: 'Knuckle passages clear the HF jet' + 'Knuckle S2 area displacement'.
   Pods join the collision model and render. knA (reach) advanced param.
3. **plW='remote'** — SAWMOD/Solana bandpass injection: ports keep every law; driver bodies
   live outside the shell (chamber NOT modeled — honest info row points at Hornresp ME2).
4. **KNUCKLE ISLAND LIVE**: sup 32″, de980 + 2×bc5nsm (knuckle) + 2×bc8pe (remote),
   dwall topbot (mids auto-seat the WIDE pair per SAWMOD; woofer ports take the other).
   Settled: 32×20.6″, L12 3.0, Lw 5.6, XO 300/650, 0 fails/0 reds, no growth needed.
   island_deep exemptions REMOVED — knuckle holds the same bar as everyone.
5. **NUMERIC SUITE REBUILT** (`meh_suite.js`, 72 checks — the debt since build 23): engine
   surface, 4-family geometry, tap/XO laws (coax2 window 485), signed collision metric,
   **island pins from blessed settled states** (`golden/settled_states.json` via
   capture_states.js — browser solves once; suite verifies forever, browser-free),
   knuckle/remote invariants, hornresp/mountSpec, fit-row honesty. Wired into deploy.sh.
6. **DRIVERS-FIRST DESIGNER** (Marwan's committed feature): sidebar card — pick CD/mid/woofer,
   every island test-driven through the REAL solver; ranked honestly (lives-here / off-canon
   noted / infeasibility named); state fully restored. SAWMOD complement → knuckle wins.
7. **Hornresp ME2 mapping** on the hand-off card + export text (config ME1/ME2; taps at
   segment nodes; Vtc/Atc + Ap1/Lp throat-adapter; **add cone front volume to Vtc manually**).
8. Escalation ladder: FIT-row blindness fixed + knuckle/diagonal rungs (fire when a candidate
   cleanly lands); advanced-mode tap labels read 'manual (advanced)' (applyAutos off there).

## PRIORITY QUEUE (next session)
0. **Chamfer plate → printable part export** (quadrant + pa3way pockets share the machinery;
   openscad installs in-sandbox). Then: **S.LwB — solved second-pair tap offset** (quadrant corner pair rides −2.2 mm tolerance;
   stagger-in-driverLayout tried & probe-reverted — solve it like every other walk).
2. **Knuckle passages in shellSCAD** — openscad installs fine in the sandbox (apt-get);
   verify compiles + bore-slice audit like build 23. Pods must be unioned AFTER bore().
3. B&C STEP embeds when Marwan uploads (decimate ≤8k tris, base64 per preset).
4. Drivers-first: per-row 'open this island with these drivers' buttons.
5. the reference calc-sheet xls re-upload (grounds L12 defaults & guidance) — still not in refs.

## KEY CANON (fixture-backed)
Woofers on the COVERAGE-ANGLE (side) walls; wall-type mids take the other pair. 2 woofers
× 2 ports = the classic quadrant photo; one-per-face ('cross') = the hex-build dialect
(quadrant, XO≈495). Coax 2-ways derive XO from landed geometry (coax2≈485 — JMOD range).
Mouth growth is THROAT-INVARIANT (never fixes near-throat crowding) AND cannot fix
corner frame-overlap (mouth-invariant — the probe's finding). KNUCKLE canon (SAWMOD):
folded passage — driver on the wall, port channel to an injection face aimed at the
throat; mids on the WIDE pair; woofers remote-bandpass with ports on the other pair.
Heinz US5526456: common acoustic center (path-length balance); passage width < λ.

## REFERENCE MATERIALS (in reference/)
10 B&C mechanical-drawing PDFs + image corpus. Studied 2026-07-20 (see the deep-dive doc):
US5526456 (Heinz patent — THE arrangement canon), SAWMOD whitepaper+DIY (knuckle S2
contours, ~94→49 mm), Solana DIY (printed, bandpass ports), JMOD (coax 2-way, two-flare
panels = rect2f), Hornresp manual (ME1/ME2 tap mapping). Makarski thesis is NOT MEH
(single-driver horn toolkit; only phase-plug path-length balancing transfers).

## FILES
meh_studio.html · meh_studio_handoff_v2.md (newest-first; top block authoritative) ·
system/: verify.js · verify_visual.py · **meh_suite.js** (72) · **capture_states.js** ·
deploy.sh (9 gates: verify · visual · suite · sweep · controls · scene · livetest · INSPECT · ORBIT VIEWER) · meh_livetest3.js · island_deep.js (knuckle now held to
the bar) · meh_fixtures.js (F3 aspirational-fail by design) · probe_pa3way.js ·
t_knuckle.js · t_ladder.js · t_driversfirst.js · repro_*.js · render_analyze.js ·
golden/: **21 blessed renders** + **settled_states.json**
