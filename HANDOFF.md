# MEH STUDIO v5 HANDOFF (2026-07-23 late, build 517, commit a72d8105b)
Repo: github.com/mroushdy/MehStudio (main). Tool: v5/meh5.html (assembled by
`node v5/assemble.js` = shell.html + engine.js at /*__ENGINE__*/).
RITUAL: `node v5/gate.js` (40,873 checks / 480 states) MUST pass before any
push; push from a scratch clone with GIT_ASKPASS=~/hs/.secrets/askpass.sh and
`git -c credential.helper=` (macOS keychain injects stale creds otherwise);
after push, repin his tab to the commit-pinned rawcdn.githack URL (localStorage
on that origin carries his state); echo+resolve BUGPINS (markers are ephemeral
since 516 - the DATA persists in localStorage 'meh5_bugpins').
Local preview: .claude/launch.json "meh5" serves repo/v5 on :8517.

STATE: builds 500→517 in one day. Landed: KNOWN BUILD presets (all topologies,
gate-asserted; SH96 under ruling B, JMOD, one-horn B&C coax presets); the
ONE-HORN coax model (print REPLACES the stock horn from the true HF exit; 5 B&C
datasheets in CXPRE); corner boards v2 (real diagonal shelves); the TAP
FOOTPRINT system (measured containment + placement pad re-walk); round taps;
X-pair cross-wise straddling (equal throat paths); solver honesty (no
balloon-to-cap); M3 PATH rows (Heinz); M6 sub-XO + displacement; M8; Max-SPL
tile (Makarski/Thuras port from Horn Studio.html); exports slice 1-4 (watertight
shell STL, dish insert with real holes, tap cutters as negative volumes, panel
SVG); reports panel; the meh_studio_14 LOOK; view modes; relevance UI.

READ FIRST: docs/queue.md (the standing queue - every landed item stamped),
docs/placement_matrix.md (LAW), docs/tap_laws.md, docs/printed_mounts_spec.md,
docs/REFERENCE_LIBRARY_STUDY.md + _2.md (18+8 reference builds - the
auto-split exporter spec lives in _2).

NEXT: auto-split STL exporter (spec captured in study _2: assembly-coordinate
segments, cut planes off driver features, per-role orientation, bed matrix,
mirror dedup + BOM, glued/bolted joints); Solana remote-bandpass dialect
(alignments in study 1); Hornresp ME2 (needs a sample file from Marwan);
v4 parity audit (needs the v4 build). Marwan's account hit its monthly spend
limit today - no subagents; single-threaded work only.
