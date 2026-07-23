# MEH STUDIO v5 HANDOFF (2026-07-23 night, build 518)
Repo: github.com/mroushdy/MehStudio (main). Tool: v5/meh5.html (assembled by
`node v5/assemble.js` — run it FROM v5/, it reads shell.html relative).
RITUAL: `node v5/gate.js` (41,111 checks / 480 states) MUST pass before any
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

BUILD 518 (this session): topology-switch crash fixed (cdSel='unit' guard in
coax1way — the "changing topology does nothing / KNOWN BUILD stale" report);
viewer now draws the REAL print solids (shellMesh + dishMesh — translucence
film gone, real tap holes, no fake bore plug; pins 2/5/6/13/14); new COAX law
row 'Tap holes land whole on the dish' (pin 18); 1way UX: no KNOWN BUILD list,
FORM = ROUND|SQUARE, driver select auto-sizes mouth (2.35xOD, from the retired
bundle ratios). Local BUILD counter went 516->518 (517 was pushed from the
scratch clone last session; keep local = remote from now on).

READ FIRST: docs/queue.md (open-pins block at the top = the next batch: the
1way/2way GEOMETRY rework, pins 3/4/7-12/15-17 — his reference images show
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
