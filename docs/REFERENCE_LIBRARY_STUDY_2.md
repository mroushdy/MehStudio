# MEH Reference Library Study — Batch 2 (pre-sliced archives)

Date: 2026-07-23
Sources: 8 zip archives from /Users/marwanroushdy/Downloads/, extracted under
`scratchpad/refs2/`. Analysis: custom struct-based binary STL reader
(`stl_stats.py` — triangle count + bbox; `stl_shells.py` — union-find connected-shell
detection + z=0 flat-cut-face area; ad-hoc cross-section and occupancy-grid probes).
All dimensions in mm. All STLs in this batch are binary, readable, and single-shell
per file (i.e., "sliced" = pre-cut into printable segments, not plated multiples).

---

## 1. `apr 11 waveguide - sliced.zip` — large one-piece square waveguide

Contents: single STL, `apr 11 waveguide - sliced.stl`, binary, 279,580 tris, 1 shell.

Verified dims:
- Overall bbox: 298.9 x 299.0 x 261.7 (fits a 300x300 bed exactly — clearly targeted).
- Sits flat on z=0 with a 21,620 mm2 planar face (mouth flange printed face-down).
- Width-vs-height profile (20 mm z bins): ~240 sq at z=0, swelling to a max of
  ~281 sq at z=60–80 (roundover/lip bulge wrapping back behind the mouth plane),
  holding ~255–275 through the body, then necking to a ~156 x 156 flat square top
  face at z=262 (throat-side back plate / driver mount region).

Split convention: NOT split — one piece, printed mouth-down, roundover integrated
into the same print. The filename "sliced" here means "print-ready orientation",
not segmented. This is the large-format-printer branch of the workflow (>=300 bed).

Port/tap geometry: none visible from names; single-shell so internal taps (if any)
are embedded in the one mesh.

MEH Studio v5 takeaway: support a "monolithic mouth-down" export mode gated on bed
size — if mouth+roundover diagonal fits the configured bed, emit one STL oriented
mouth-face-down (bed face becomes the cosmetic mouth surface, flare walls
self-support at <45 deg).

---

## 2. `synergy horn nov 24.zip` — small synergy horn body, one piece, throat-down

Contents: single STL, binary, 180,698 tris, 1 shell.

Verified dims:
- Bbox: 188.5 x 188.5 x 99.0 — square mouth 188.5 x 188.5, depth 99.
- z=0 face: circular boss ~88 mm across, planar area 5,512 mm2, with a central
  throat opening and internal features visible in the occupancy map (ring +
  central hole pattern) — this is the round compression-driver mount face.
- Flares from the ~88 round throat plate at z=0 to the full 188.5 square mouth at
  z=99. Wall angle ~27 deg from vertical — prints support-free.

Split convention: one piece, printed THROAT-DOWN / mouth-up. The driver-mount face
is the bed face (dimensionally accurate, flat for gasketing); the flare is its own
support. 188.5 footprint fits a 200x200 bed.

MEH Studio v5 takeaway: for small horns, the canonical orientation is throat-plate
down; the CD mounting face should be a single planar bed-contact face (best flatness
where the gasket seals). Keep mouth <= bed minus margin to stay one-piece.

---

## 3. `home unity horn mar 11 sliced part 1/2/3 of 3.zip` — xrk971-style shallow home MEH, 3-way split

Contents: three STLs, one shell each, all binary:

| Part | Tris | Bbox (mm) | Position (assembly coords) |
|---|---|---|---|
| part 1 of 3 | 60,648 | 195.8 x 179.5 x 104.6 | y [-23.2, +156.3] |
| part 2 of 3 | 53,784 | 195.7 x 180.0 x 105.1 | y [-336.2, -156.2] |
| part 3 of 3 | 85,758 | 195.7 x 133.0 x 169.3 | y [-156.2, -23.2] |

Verified geometry (the gold of this batch):
- The three parts TILE PERFECTLY along Y: cut planes at y = -156.2 and y = -23.2.
  Parts were cut in place and keep assembly coordinates — reassembly is exact
  translation-free registration. Assembled: 195.7 x 492.5 footprint.
- All three sit flat on z=0 (flat areas 11,568 / 12,943 / 5,401 mm2): the horn is
  printed MOUTH-FACE-DOWN; the mouth plane is the bed plane, so the visible mouth
  surface is bed-smooth on every segment.
- Mouth lip: thin 5.6 mm edge at both Y extremes (y=+156.3 and y=-336.2 sections
  are 191 wide x 5.6 tall slivers) — wall thickness convention ~5–6 mm.
- Cut faces are FULL flat cross-sections (~196 wide x up to 105/110 tall at the
  two cut planes; 6,011 and 3,111/3,072 verts on the mating planes) — plain butt
  joints for gluing; no interlock features evident.
- Part 3 (the MIDDLE segment, y[-156,-23]) is the special one: it rises to z=169
  (vs 105 for the outer two) with a flat-topped rectangular pod, top face
  47 x 91 mm at z=169.3 — the driver/throat pod (CD + mid chamber) lives entirely
  in the center segment, so ports/taps are never bisected by a cut plane.
- Each segment footprint <= 196 x 180 — a 200x200 (or 220x220) bed constraint.

Split convention summary: shallow rectangular-mouth MEH (~492 x 196 mouth, ~105
horn depth) cut by two vertical planes perpendicular to the long mouth axis into
end / middle / end, positioned so ALL driver geometry stays inside the middle
segment; all segments print mouth-down with the cut faces vertical.

MEH Studio v5 takeaway: when auto-splitting, (a) place cut planes so no port/tap/
driver-mount feature is intersected, (b) keep segments in assembly coordinates in
the exported STLs, (c) orient all segments identically (mouth-down) so seams share
layer direction and the mouth face is uniformly bed-finished.

---

## 4. `roundover may21.zip` — bolt-on mouth roundover corner segment

Contents: single STL, binary, 6,618 tris, 1 shell.

Verified dims:
- Bbox: 164.5 x 167.5 x 38.1; flat mounting face down at z=0 (14,660 mm2).
- Occupancy map shows an L-shaped corner piece: one leg ~40 mm wide x 167 long,
  the other ~164 long x ~75 wide, joined at a corner — one quarter/corner of a
  rectangular mouth roundover frame. Roundover radius/depth ~38 mm (the z height).

Split convention: roundover printed as a SEPARATE add-on frame, split at/around
corners into L-segments, printed flat-face-down (mating face on bed). Four corner
pieces suit a mouth on the order of ~250–300 mm per side — plausibly the companion
of the apr-11 waveguide family (same build lineage, apr 11 -> may 21).

MEH Studio v5 takeaway: model the roundover as a detachable frame with its own
splitter (corner L-segments, mate-face-down), rather than forcing it into the horn
body print. Lets a small-bed user add a large-mouth roundover, and lets users
iterate roundover radius without reprinting the horn.

---

## 5. `Metlako III 123D model.zip` — Fusion/123D source model (no mesh)

Contents: `Metlako III 123D model.123dx` — an Autodesk 123D/Fusion archive (zip
container): `Manifest.dat`, `Fusion[Active]/Design1/{BulkStream,MetaStream}.dat`,
`Breps.BlobParts/BREP0.smt` (10.1 MB ShapeManager BREP), previews small/big.png.
Dated 2023-05-18 internally.

- NO STLs and no readable parametric text: MetaStream contains only GUIDs
  (Design/Component/Body/Geometry/EntityTracking records); the geometry is a
  binary .smt BREP that open tooling cannot parse. No dimensions extractable.
- The 1024x1024 preview render (extracted to
  `metlako3/extracted/Fusion[Active]/Previews/big.png`) shows the known diyaudio
  Metlako-style MEH from the side: a round cone/CD assembly mounted on the horn
  wall with two teardrop/kidney-shaped port scoops flanking the throat, a
  faceted (triangulated) quadrilateral waveguide mouth with a thick built-up
  mouth frame, and an integral angled desk stand with lightening holes.

Value: geometry reference for port SHAPE only (teardrop scoops merging into the
horn wall) via the preview image; the actual solids need Fusion 360 to open.
MEH Studio v5 takeaway: keep CAD-source archives in the library but treat them as
image references unless the user exports STL/STEP from Fusion; consider asking the
user to open this in Fusion and export STEP if Metlako port geometry is wanted
numerically.

---

## 6. `Unity Horn 150hz+ - 4927888 - part 1 of 2.zip` — liam056 Thingiverse thing:4927888 (Unity Horn 150 Hz+)

Contents: README.txt + LICENSE.txt (CC BY-NC, by liam056), 31 STLs in `files/`,
30 render/photo images in `images/`. This is PART 1 OF 2 of the download — part 2
(not present) holds the remaining STLs referenced by README and shown in images:
Hf_Throat, Mid_Driver_Mount_1/2, Bass_Driver_Mount_1/2, Horn_Top_Side_Outer_1/2,
Horn_Top_Side_1/2, Foot, Speakon_Plate.

README facts (read in full):
- "This Horn can in theory play 150hz+"; limiting factor is mid-driver output.
- 97 printed parts total. Drivers: Faital Pro 3FE25 (mids, x4), Faital Pro 6FE200
  (bass, x4), P Audio BM-D740 compression driver (README qty string ambiguous;
  4x M6 stud + 4x M6 nut for the HF flange implies ONE CD).
- Hardware: M3 x10/14/16/20 (68 M3 nuts), M5 x10/16/20/25 (122 M5 nuts),
  M6 studs for the CD; sealing by silicone and Gorilla Tape. Fully BOLTED
  assembly, not glued.
- Every horn-wall part prints in qty 2 (left/right symmetric reuse of one STL) or
  qty 4 (brackets, cases) — the horn is built from mirrored/repeated segments.

Verified STL dims (31 files measured; all in ASSEMBLY coordinates, not print
orientation — full assembly spans x [-327.5, +326.3] = ~654 wide, y +/-201.5,
z up to 348):
- Largest single parts: Bass_Case 245.4 x 165.7 x 226.8 (3,866 tris);
  Base_Case_Lid 245.4 x 81.7 x 195.1; Horn_Lower_Middle 270.1 x 34.9 x 49.2;
  Upper_Middle_Top_1/2 204.2 x 82.0 x 87.7 (mirror pair, identical 4,318 tris at
  mirrored x positions — confirms the left/right mirror-reuse convention).
- Horn wall is decomposed into ~26 distinct shell segments (Lower/Middle/Upper x
  Middle/Side x Top/Bottom naming grid) plus ~10 small bolt brackets
  (11–40 mm pieces: Top_Bracket, Horn_Top_Side_Bracket_1/2 etc.) that clamp
  segment joints from behind.
- Mirror pairs verified by bbox symmetry, e.g. Horn_Top_Left_Top_2* at y
  [-201.5,-116.2] mirror Horn_Top_Left_Top_1* at y [+116.2,+201.5];
  Horn_Upper_Middle_Bottom_1 (x [0,190.5]) mirrors _2 (x [-190.5,0]).
- Photos: faceted conical rectangular horn ~654 x 403 mouth; four large
  racetrack/oblong mid-port openings in the horn walls near the throat (visible
  top pair + bottom pair in front.jpg); dense clusters of small through-bolts
  across the outer walls (the M3/M5 external clamping). Bass injects further out
  via separate driver mounts + printed bass cases (sealed chambers) bolted onto
  the wall. images/Unity.png is a measured response: flat ~300 Hz–8 kHz,
  rolloff below ~200 Hz.

Split convention summary: big pro-style MEH split into a NAMED GRID of wall
segments (Lower/Middle/Upper + Middle/Side + Top/Bottom), one STL per unique
segment reused 2x/4x by symmetry, bolted (not glued) with printed backer
brackets at every joint, sealed with silicone/tape; driver chambers (Mid_Case,
Bass_Case + Lid) are separate printed boxes bolted over wall cutouts.

MEH Studio v5 takeaways:
- Symmetry-aware export: emit one STL per unique segment + a quantity/mirror
  manifest (cuts print-file count ~4x; this design gets 97 prints from ~40 files).
- Support a bolted-joint mode (bolt-hole patterns on flanges + auto-generated
  backer brackets + BOM of fasteners) as an alternative to glued butt joints.
- Auto-generate a README-style BOM (print quantities per file + hardware + driver
  list) — thing:4927888's README is exactly the artifact MEH Studio should emit.
- LICENSE: CC BY-NC — usable as design reference; do not redistribute or use
  geometry commercially.

---

## TOP-5 ACTIONABLE FINDINGS for MEH Studio v5

1. Keep segments in assembly coordinates and never cut through driver features.
   The mar-11 home unity proves the pattern: cut planes at y=-156.2/-23.2 tile the
   three exported STLs exactly in place, and the entire CD/mid pod lives in the
   middle segment. v5's splitter should (a) export cut segments un-translated for
   trivial registration and (b) constrain cut-plane placement away from ports,
   throats, and mounts.

2. Orientation is a first-class output, chosen per part role: mouth-face-down for
   horn bodies/segments (bed-smooth mouth, 21,620 mm2 flange contact on the apr-11
   waveguide), throat-plate-down for small one-piece horns (flat gasket face for
   the CD, self-supporting <=27 deg flare on nov-24 synergy), mate-face-down for
   roundover segments. v5 should auto-orient by part type, not export "as modeled"
   (the liam056 set shows the anti-pattern: all 31 STLs need manual orienting).

3. Bed-size-driven split strategy with three tiers seen across sources:
   <=200 bed -> segment the horn (196x180 max footprint, 3-way butt-glued split);
   300 bed -> monolithic mouth-down print (299x299x262 one-piece waveguide);
   any bed -> roundover always as a separate 4-corner L-segment frame (~165x168x38
   each). v5 should take bed X/Y/Z as input and pick/mix these automatically.

4. Symmetry-aware part reuse + generated BOM. liam056's 150 Hz Unity builds 97
   printed parts from ~40 unique STLs via mirrored/repeated segments (verified
   mirror-pair bboxes) and documents it in a README with per-file print counts and
   full fastener/driver lists. v5 should deduplicate mirrored segments into one
   STL + quantity manifest and auto-emit the README/BOM (including M3/M5/M6
   hardware when bolted mode is on).

5. Two joint systems, both worth supporting: thin-wall glued butt joints
   (~5.6 mm walls, full-face planar cuts, no interlocks — xrk971 home style) and
   bolted flange joints with printed backer brackets and silicone/tape sealing
   (liam056 pro style, M3/M5 clamp clusters visible in build photos). v5 should
   offer "glued" vs "bolted" as a split-joint option, generating brackets and
   bolt patterns in bolted mode.

---

## Unreadable / partial items

- `Metlako III 123D model.123dx`: geometry locked in Autodesk ShapeManager
  `BREP0.smt` binary — no open parser; only the PNG previews and file manifest
  were extractable. Needs Fusion 360 to export STEP/STL.
- `Unity Horn 150hz+ - part 1 of 2`: part 2 of the Thingiverse download is not in
  Downloads; ~9 STLs listed in the README (HF throat, mid/bass driver mounts,
  outer top-side wall pieces, foot, Speakon plate) are missing, so throat and
  driver-mount port geometry could not be measured — only inferred from photos.
