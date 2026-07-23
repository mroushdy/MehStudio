# LEARNINGS FROM HORN STUDIO (his companion tool, build 223 handoff, mined 2026-07-23)

Horn Studio is 223 builds of the SAME discipline this project converged on - and it
has finished machinery MEH v5 still needs. Direct adoptions:

1. ARCHITECTURE VALIDATED: engine.js separate from the shell, rebuild script embeds,
   build stamp from the entry log. v5 accidentally converged on this - keep it.
2. PROJECT_STATE.md numbered entries as the engineering memory ("GREP IT BEFORE
   SOLVING ANYTHING") - adopt for MEH: docs/queue.md gains numbered entries.
3. THE RESUME RULE (entry 220, paid for): containers can silently restore OLDER
   disk snapshots - pushed artifacts survive, working dir lies. On every session
   start: fingerprint recent work (grep one pin per entry), run the suite, compare
   ok-COUNT against the recorded count. Verify edits by COUNT, never tool receipt.
4. EXPORT MACHINERY TO PORT (queue item 11 becomes a port, not a build):
   - exportSTL (horn_studio.html:5844) - proven STL writer
   - stepFromMesh / stepFromNurbsSolidQuad (engine.js:4563/4798) - watertight
     NURBS STEP solid writer, ripple-metric verified by step_eval.py
   - BEM mesh (.msh AKABAK) + .blab.json project export - the simulation bridge
5. artifact_test.js pattern: Chromium presses REAL export buttons, intercepts REAL
   blobs, measures REAL files - adopt as v5's export gate.
6. fuzz_harness.js: full DOM sweep + export NaN/finiteness sweep - the Autopilot
   lattice already proven in his other project; port the harness shape.
7. MAX SPL TILE (Thuras 1935 air-nonlinearity integrated over the area law, Makarski
   2006 method, verified within dB): computable DIRECTLY from v5's profile - the
   physical ceiling of the geometry. Pairs with the 17 m/s port law. HIGH VALUE.
8. Webster loading indicator + estimate tiles (documented in ESTIMATES.md) - the
   honest-1D-estimates philosophy matches MEH's; port cutoff/loading tiles.
9. Ops: users CACHE the app - stamp the build under the title (v5 does); ok-count
   reconciliation as the cheap integrity check.
