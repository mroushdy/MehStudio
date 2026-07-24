# MEH STUDIO v5 HANDOFF (2026-07-24, build 527 = commit 6c49386)
Repo: github.com/mroushdy/MehStudio (main). Tool: v5/meh5.html (assembled by
`node v5/assemble.js` — run it FROM v5/, it reads shell.html relative).
RITUAL: `node v5/gate.js` (44,138 checks / 480 states) MUST pass before any
push; push from a scratch clone with GIT_ASKPASS=~/hs/.secrets/askpass.sh and
`git -c credential.helper=` (macOS keychain injects stale creds otherwise).

MARWAN'S TAB MOVED: he now runs http://localhost:8517/meh5.html (another
session's static server on repo/v5 — reuse it, do NOT start a second one; if
it died: .claude/launch.json "meh5"). His state AND his bug pins live on the
localhost:8517 origin — localStorage 'meh5_bugpins' (the old githack-origin
store is history, all 33 pins there are done). Resolve pins via
window.BUGPINS.resolve(id,'<hash>: <what>') in that tab, never by rewriting
the store while he types. After a push, assemble+reload the LOCAL tab; the
githack repin only matters if he asks for it.

BUILDS 518-522 (this session): 518 topology-switch crash fix + render the
real print solids (shellMesh/dishMesh live in the viewer) + 1way UX (no
KNOWN BUILD list, ROUND|SQUARE, driver-sized mouth 2.35xOD). 519 tap-truth:
recessed tap plugs (round reads round), 'Tap opening fits the cone' law
(sqrt(Sd/pi)), REFUSED banner + ghosted shell on any fail/infeasible. 520
CAD-true coax dish: ring on the exposed cone annulus [.60,.72]od, ARC SLOTS
along the ring (stadium; degenerates to round), coax CR at the band low edge
(subXO) - 1way XOs rose (fhx6 541->620). 521 the unit NESTS on the print
(face at the cone plane, cavity to the true throat). 522 GHOST DRIVERS view
mode. All pushed, gate ALL PASS at every step.

READ FIRST: docs/queue.md - top block: 1way family CLOSED at 526 (OS face curve, triple, collar, round/arc taps, crossover section); b527: pin 17 landed (TRUE SQUARE = 4 plates at slider top; chamfer dialect
keeps boards). Marwan SKIPPED the STL exporter for now. Open pins: 3/9
(one-piece dish question - needs his ruling), 10 (round-to-square
transition), 12 (driver silhouette detail pass). Untouched queue: M9
enclosure reality (Pavdan halves are the measured reference), M10/D
Hornresp ME2 (needs a sample file from him), H polish (angular seams as
edges, mobile-width layout - he reviews from his PHONE), C tiles, G
superformula, I v4 parity (needs the v4 build), Solana bandpass dialect.
Old note below:
THE next build (his ~8:45pm ruling: exit circle / rim circle / baffle depth
+xmax per driver; print never runs THROUGH the driver; collar over proud
fixed horns vs deep print for removable horns). Open pins after this session:
3/9 (dish=plate one piece), 10/11/12 (transition, entry width recheck on 520+,
cone silhouette), 15/16/17 (2way angular: round throat bore, tap count/straddle
options, square-max wooden look) — his reference images show
the funnel base IS the driver flange, entry wide, kidney taps tight around
the snout; ground everything in CXPRE datasheet dims + the batch-2/3 measured
refs, invent nothing). docs/REFERENCE_LIBRARY_STUDY_3.md is new (Pavdan
halves, DH350 symmetry-half + adapter extraction = the split canon exception,
Hinson MEH.pdf tap-chamber + 17 m/s port numbers, PM90 wood/T-nut DWG).

NEXT after the pin batch: auto-split STL exporter — spec now spans study _2
findings + study _3 §6 tiers (symmetry-half with adapter extraction is the
new tier 3; verify mirror-dedup, never assume). Then Solana remote-bandpass,
Hornresp ME2 (still needs a sample file), v4 parity audit (needs the v4
build). Marwan's account: monthly spend limit — no subagents, single-threaded.
Scratch tooling this session (scratchpad/refs3/): stl_probe.py, venv with
pypdf+ezdxf, libredwg installed system-wide (dwg2dxf works; pm90.dxf
converted, block/text layer extracted, entity-level dims still unparsed).
