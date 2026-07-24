# MEH STUDIO v5 HANDOFF (2026-07-24 late, build 531)
BUILD 531 (his asks: audit known builds vs the online record; audit settings
sanity + build the adaptive anti-trash layer; driver-mounting audit): the
14-agent KNOWN-BUILDS AUDIT (docs/KNOWN_BUILDS_AUDIT.md) re-baked every
driver row to NAMED datasheets in lockstep across shell/engine/gate/matrix
(10HPL64 xm was DOUBLE the datasheet; W5 was fiction -> Dayton DC130A-8;
5CN140 datasheet closes refd; FHX coverage 60x40; SH50-class label moved to
the angular preset at the real 50x50/2x12; SH96 mids m4 + v5-vs-real mouth
DECLARED; archetypes named loudly). MEH2.adapt() adaptive layer landed (gate
2.10 contract; ADAPT strip in UI; class-curve driver packs - od sliders no
longer freeze Sd). SH-96 record complete + addendum-3 vent line retracted
(study _4 addenda 4/5). WATCH: his tab state (58in custom SH96) is HIS state,
untouched - only the preset moved. Mounting-audit workflow + 19k settings
sweep were still running at handoff - fold their reports next. Older header
below.
# (prev) MEH STUDIO v5 HANDOFF (2026-07-24, build 530 = commit 4e187e3)
BUILD 530 (his ask: "research everything about MEH and just fix the tool"):
b529 was left UNPUSHED mid-flight (v3 boards, SH96 parked, 7 gate fails).
This session: 11-agent reference research -> docs/REFERENCE_LIBRARY_STUDY_4.md
+ FIX_LIST_STUDY_4.md; pin #23 CLOSED (measured land bosses under every wall
seat, battery-verified); THE VENT FORK RESOLVED as ruling (a) SOURCED (17 m/s
was nc535's heuristic + Hinson p.19 chuffing-onset, NOT Danley canon; SH-50
tape-measured taps are the record) -> DANLEY DIALECT on corner-board states;
CORNER BOARDS v3.1 (seam openings, exact rect adjacency, cutout law, mid ring
rotated off the diagonals); SH96-class UNPARKED at 58 - HIS TAB STATE LANDS
(0 fails, 1 declared warn). tap_laws.md law 5 provenance corrected. Gate ALL
PASS. NEW ASKS FOR HIM: SH-96 vent tape measure; reflex-vents-into-horn as an
element (M9); FIX_LIST ranked items. Older header below.
# (prev) MEH STUDIO v5 HANDOFF (2026-07-24, build 528)
BUILD 528: his mid-build call ("evaluate how things work TOGETHER while
programming") -> v5/inspect5.js assembly battery (run it while coding; gate
2.9 enforces it) + M9 down payment: MEH2.boxDims TRUE box (viewer draws it),
BOX law rows, mouth-plane enclosure law (re-baked sh96 58->60 + classic
27->31 - see queue.md top block; sh96 needs HIS ruling on the rectangular-
cabinet corner model). Gate now 50,712 checks. Older header below.
# (prev) MEH STUDIO v5 HANDOFF (2026-07-24, build 527 = commit 6c49386)
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
