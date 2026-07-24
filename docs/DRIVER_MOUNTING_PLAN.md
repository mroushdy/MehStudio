# DRIVER MOUNTING PLAN — the bulletproof mount model for MEH Studio

Companion to DRIVER_MOUNTING_AUDIT.md (same directory — every claim here cites a source there or directly).
Doctrine: measured canon only; geometry DERIVES from the driver's own datasheet fields, never styled.
Read-only on /Users/marwanroushdy/Claude/MEH Studio/repo — this plan proposes edits for the assemble.js→gate.js
ritual; nothing is applied here.

---

## (a) THE MOUNT MODEL

### A0. The one parametric object: MountSpec

Every driver gets a MountSpec computed from ONLY these datasheet fields (new preset fields where missing —
graded rows go informational until the field is filled; the tool NEVER invents a value):

| Field | Used for | Already in tool? |
|---|---|---|
| frame OD (or frame square + corner style) | land OD, seatR, adjacency | yes (od) |
| baffle cutout Ø | locating-step bore, land ID upper bound | NO — add |
| bolt circle Ø + bolt count + hole Ø/thread | insert bosses / T-nut positions | NO — add |
| flange (+gasket) thickness | how proud the frame sits; collar depth | NO — add |
| xmax | relief depth (wood), Martin gap (print), funnel depth | yes |
| cone depth / surround OD·ID | relief annulus span, dish tangent (β ≥ α) | partial (od-relative) |
| magnet OD + depth | magnet clearance grading (M9) | NO — add |
| CD: exit Ø + bolt pattern (2-bolt@76.2 / 4-bolt@BCD) | CD boss | partial (b515 datasheets) |

Sourced seed values so the known drivers work day one: LaVoce 12in 6×M6@298/basket 315; Beyma SM115/N 8×Ø6@370,
frame 379–388; B&C 4NDF34 OD127/BC115/cutout103/flange 3/xmax 3.8; K-402 HF plate d50.8 + 4@72.1sq; 1in CD 2-bolt
@76.2. (Audit §2.3 — all measured/documented.)

### A1. Per-cell generated geometry

**BIG/SMALL WOOFER × PRINTED** (integral land — the shipping pattern, Audit §1.2/1.4):
- Keep b530 landRaise() as-is (measured 24-azimuth land boss, +2 mm, feeds Lpt). It is the print-dialect answer to
  "the land must be flat" and is already battery-verified.
- ADD on top of the raised land, derived not styled:
  - land annulus: OD = frame OD + 22 mm (existing seatR = od/2 + 11 mm canon, code-measured); ID = tap requirement,
    never wider than baffle cutout Ø.
  - locating step: Ø = baffle cutout (datasheet), depth 2.5 mm — **single measured precedent (300Hz); ship as the
    default with a THIN-EVIDENCE flag in the why-text**, overridable per driver.
  - insert bosses: bolt count × on the datasheet BC exactly; bore from the insert table (M4 short: Ø5.6–6.0;
    M5: 7.1 OD × 9.5 deep — Solana spec); boss OD/depth from the measured 300Hz bosses (Ø8.2 × up to 17.7).
  - taps: unchanged tap laws; tap runs through the land ⇒ Lpt = wallT + max(9 mm, landH) already handles it.
- Face-to-cone check: any printed surface facing the cone holds the Martin band at max displacement (already graded).

**BIG WOOFER × WOOD (corner boards / flat boards)** (Audit §1.1):
- Corner-board model v3.1 unchanged (measured).
- ADD the wood relief spec to the export drawing: annular surround relief spanning [surround ID, surround OD] from
  datasheet, **depth = xmax + 5 mm** (chrisbln, documented — see A2), stepped profile allowed (Hinson 10/6.9/4.5
  precedent); relief must stop short of the flange seal annulus (Waslo rule, graded — A2/law 4).
- T-nut positions = datasheet BC/count, marked on the board DXF; through-bolt option (Danley) noted informationally.

**MID (sealed) × both**: seat as above at small scale + a REAR CUP part (chrisbln measured cups: 3 mm wall,
slip-over taper; 300Hz segment stack as the alternative) — the cup is the V1 chamber, so its interior volume must be
reported to the acoustics (M9 rear-chamber partitions, currently open). Cup geometry derives from basket rear dims
when fields exist; until then export chrisbln-style parametric cup with the numbers labeled as that source.

**COAX-CD × PRINTED**: b523 triple unchanged (his ruling). Two amendments, both already specced:
- replace the 38° La rim constant with the Martin tangent continuation β ≥ α from datasheet cone dims (FIX_LIST #8);
- tap ring stays clamped to [.60,.72]od; dish rim = flange + 12 mm (code canon) until pins 3/9 ruling says otherwise.

**PLAIN CD × PRINTED**: one-piece boss, concentric: throat bore = datasheet exit Ø, land Ø88–114 class, proud
5–6 mm (measured cluster — use 5 mm, flag as cluster-derived not law), bolt pattern = datasheet (2-bolt@76.2 default
for 1 in). Captive-bolt option (M5×12 placed before gluing — White/Solana) emitted as an assembly note on split parts.

**PLAIN CD × WOOD**: K-402 pattern — a separate driver-first plate (12 mm class, throat = exit Ø exactly, datasheet
bolt pattern), plate-to-horn with sealant + screws; throat masked during sealant (assembly note). Documented, dimensioned.

### A2. The recess-depth LAW — chrisbln vs Martin, reconciled

They are different interfaces, not competing rules (Audit §2.1):
- **Wood-dialect surround relief** (flange clamped to a flat board; question: "will the surround/cone hit the wood"):
  relief floor ≥ **xmax + 5 mm** below the mounting face. Source: chrisbln 12-24-MEH.scad (documented). Grade: WARN
  below xmax+5, OK at/above. Caveat printed in the why-text: chrisbln's own shipped default (15) exceeds his formula
  (11.6 for WAN123.01) — the formula is the law, the 15 is not.
- **Print/coax dish gap** (a static SURFACE faces the moving cone; question: "will the cone strike the print at xmax"):
  static-to-moving clearance in **[5,30] mm preferred ([3,50] hard) AT max displacement**. Source: Martin US10506331
  (documented). Already graded in v5 (gap = xmax + 2 mm generator default). Keep.
- Do NOT unify them without his ruling; they answer different failure modes (surround interference vs cone strike).

### A3. Pins 3 / 9 — what the record supports

Pin 3 "mounting plate should match driver" — **unambiguous, fully evidenced, no ruling needed on the principle**:
in every measured build the plate mirrors the driver's own interface numbers (300Hz step Ø102 vs cutout 103, BC
114.9 vs 115; K-402 ring 388/370/355 vs frame 379–388 + 8×Ø6@370; JMOD lands sized to 12NDL88/DCX464). LAW: mount
geometry = datasheet fields verbatim; missing field ⇒ the row goes informational and the geometry is NOT generated
(refuse loudly, never style).

Pin 9 "ring… one piece with the big horn" — the record shows BOTH poles, but they sort cleanly:
- **One-piece is the printed norm** (measured: 300Hz integral step-land, nov24 boss, White recesses, 4-funnel snout
  where the funnel base IS the flange, Reference A/B/C, Solana, JMOD's printed adapter with integral CD flange).
- **Separate adapter is the wood norm for rings/plates** (K-402 ring, CoSyne tweeter plate, Small Syns plate) and is
  **MANDATORY when the horn is symmetry-split** (DH350: the driver interface is EXTRACTED as an un-split 10 mm
  adapter bolted whole across the glued halves; exporter split canon: cut planes never through driver features).
- PROPOSED RULING TEXT for Marwan: *"One piece with the horn on printed monolithic parts (dish rim = driver flange);
  auto-extracted as a separate un-split adapter iff the exporter must split through the mount; wood exports get the
  machined-in land by default with the K-402 separate-ring drawing as an option."* — This makes pin 9 true wherever
  the record shows it true, and keeps the DH350 escape the split canon requires. **His ruling still gates it** (the
  fork is real — Reference D ships the opposite pattern on his own build 503).

### A4. Fasteners and seals to model

- Printed: heat-set insert bosses per A1 (sizes sourced: M4 Ø5.6–6.0 bores measured; M5 7.1×9.5 @ ~350 °C — Solana
  and White manual p.10; note the 350 °C/M5×12 spec is the WHITE manual, NOT JMOD — corrected attribution).
- Wood: T-nut/pre-inserted-nut positions on the datasheet BC in the DXF; wood screws never for drivers at PA scale
  (corpus rule); hurricane nuts flagged unreliable in ≥3/4 in hardwood ply (forum, documented).
- Seal: FLAT land default — no gasket grooves in any probed STL, with ONE photographed exception:
  the purple printed build's CD throat carries an o-ring in a printed groove (his photo drop #16a).
  Plan: flat land is the law; an OPTIONAL o-ring groove at the CD throat only, dimensioned from a
  named o-ring size, may land later as a his-ruling toggle. Emit an optional gasket OUTLINE
  (flange annulus) as DXF, ~1.6 mm stock noted as the only sourced thickness (Solana); no material/durometer invented.
- Orientation: mounting/gasket faces print bed-down (documented canon); captive bolts placed before glue-up (note).
- Access: grade a bolt-access ray per fastener (clearance to adjacent parts along the tool axis) — informational,
  sourced to Hinson's bent-tool problem + JMOD spade clearance.

---

## (b) LAW ROWS to add

Graded only where sourced; informational otherwise. All new rows carry why-text with the source string.

| # | Row | Grade | Source |
|---|---|---|---|
| L1 | Mount = datasheet mirror (BC Ø, count, hole Ø, cutout Ø present and used verbatim) | FAIL if field-vs-geometry mismatch; INFORMATIONAL (geometry suppressed) if fields missing | pin 3; 300Hz measured 114.9 vs 115; K-402 drawing |
| L2 | Wood surround relief depth ≥ xmax + 5 mm | WARN | chrisbln .scad (documented); caveat on his default-15 discrepancy |
| L3 | Martin gap [5,30] pref / [3,50] hard at max displacement | (exists) keep | US10506331 |
| L4 | Seal-annulus integrity: relief/frustum/putty-relief must not intrude into the flange seal band | WARN | Waslo Synergy Calc V5 Step 8; Small Syns gasket-land rule |
| L5 | Tap entry inside cone footprint and area < cone area | WARN (footprint), INFO (area ratio) | US6411718 |
| L6 | Lpt = local wall/land thickness; 45° entry frustum halves the effective term | (exists partially) extend with frustum factor | US8284976; Waslo V5 p.9 |
| L7 | Peak tap air velocity < 17 m/s | INFO | nc535, diyaudio 317710 (forum — label as such) |
| L8 | Drivers fasten into captured metal threads (T-nut/insert/captive), never wood screws at PA scale | INFO | corpus-wide (JMOD/K-402/PM90/Solana); CoSyne #4/#6 noted as the DIY-light exception |
| L9 | Insert geometry table (M4 Ø5.6–6.0 bore; M5 7.1×9.5, ~350 °C) drives boss dims | INFO (geometry source) | 300Hz measured; Solana; White manual p.10 |
| L10 | Split-extraction: a cut plane through a mount region ⇒ the mount ring is extracted as an un-split adapter | FAIL at export otherwise | DH350 (measured); exporter split canon (STUDY_2 #1) |
| L11 | Bolt-access ray per fastener | INFO | Hinson pp.21–22, 42–43; JMOD p.18 |
| L12 | Mid throat-chamber pressure warning (small tap + small Vtc can tear cones; remedy = more mids) | INFO | Hinson MEH.pdf pp.13–14 |
| L13 | β ≥ α tangent continuation replaces the 38° rim constant | graded (existing row, new datum) | US10506331; FIX_LIST #8 |

NOT added (evidence too thin, stays out): locating-step depth as a law (one measurement); gasket material/compression;
magnet-clearance grading (no magnet OD fields yet); any SH-96 vent number (unanchored pixel read).

## (c) What stays a MARWAN RULING (precisely)

1. **Pins 3/9 final ruling** — adopt A3's proposed one-piece-with-split-exception wording, or the Reference-D
  separate-dish pattern? (Resolve via window.BUGPINS.resolve in HIS tab — his pin store was NOT reachable this
  session; echo the live pin text first, per HANDOFF ritual.)
2. **His 3 BMS measurements** (exit Ø at cone / rim Ø / baffle depth) to replace the .60/.72/.14 od-relative guesses.
3. **Per-dialect vs unified recess law** — keep xmax+5 (wood) and Martin band (print) separate, or unify?
4. **Locating-step depth default** (2.5 mm single-precedent) — accept, change, or omit the step?
5. **Land OD margin** — keep seatR = od/2 + 11 mm and dish = flange + 12 mm as the printed canon (code-measured), or
  adopt K-402's near-exact frame match for wood rings?
6. **Saucer depth datum** (FIX_LIST #8 tangent rule) — shallow-saucer ruling still wanted.
7. **Magnet OD / depth fields** — add to presets so magnet-clearance-at-angle can grade (M9)?
8. **Mid cup as a first-class part** (V1 volume into the acoustics) — geometry source when datasheet rear dims absent.
9. **chrisbln default-15 discrepancy** — confirm the formula (xmax+5), not the 15, is canon.
10. **Wood-dialect fastener default** for the DXF: T-nut (JMOD/PM90) vs pre-inserted nut + pins (K-402)?

## (d) IMPLEMENTATION ORDER (smallest honest step first)

1. **Fields first, no geometry**: add cutoutØ / bcØ / boltCount / boltHoleØ / flangeThk / magnetØ+depth to presets;
  seed only the sourced drivers (Audit §2.3); rows referencing missing fields go informational. Zero rendering risk;
  pin-12 groundwork. (engine presets + a fields table in the UI)
2. **Law rows L2, L4, L5 (footprint), L11** — pure checks on existing geometry, each with source why-text. No mesh
  changes; refusals get louder before anything is drawn.
3. **Viewer pass (pin 12)**: draw the derived mount ring on every seat — land annulus, locating-step circle, bolt
  circle with count ticks, relief annulus (wood) — straight from the fields; silhouettes stop being od-relative
  guesses wherever fields exist.
4. **Mesh: integral land on printed seats** (A1) — step + insert bosses on top of the existing b530 landH boss;
  battery re-verifies membership like b530 did; Lpt unchanged (already wallT + landH).
5. **Exporter**: L10 split-extraction (DH350 pattern) + bed-face orientation for mount faces + captive-bolt and
  sealant assembly notes + wood DXF with relief profile and T-nut positions + optional gasket outline.
6. **After his rulings land**: β≥α datum swap (FIX_LIST #8), magnet clearance grading, mid cup parts, and the
  one-piece/separate commit — echo each resolved pin with its commit hash, per doctrine.

Each step is independently shippable through assemble.js → gate.js and none invents a number.
