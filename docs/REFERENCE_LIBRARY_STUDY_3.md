# MEH Reference Library Study — Batch 3 (Marwan's drop, 2026-07-23 evening)

Sources: 6 files from /Users/marwanroushdy/Downloads/ ("more models to look at to
help you get it right" — sent while the auto-split exporter was being specced).
Analysis: fresh struct-based binary STL prober (tris, bbox, union-find shells,
edge-manifold check, planar-face areas, z-profiles); pypdf for the PDF; libredwg
dwg2dxf + raw tag extraction for the DWG. All mm. All five STLs are binary,
single-shell, and fully edge-manifold (0 non-manifold edges — this batch is
clean, unlike none of them needing repair says something about the builders).

---

## 1. `Boite Pavdan A.stl` + `Boite Pavdan B.stl` — printed enclosure in two halves

- A: 129,642 tris, 252.4 x 180.9 x 200.6, spans y[-180.9, 0].
- B: 130,722 tris, same bbox size, spans y[0, +180.9].
- ONE cut plane at y=0; parts keep ASSEMBLY coordinates (tile exactly, like the
  batch-2 home-unity 3-way split). Mating faces on y=0 are area-identical:
  15,352 mm² on both sides — full-face butt joint.
- NOT mirror copies: an A-vertex y-flip lookup hits only ~10% in B — the box
  interior is asymmetric (different internal shelves per half), so both halves
  ship as their own STL. Walls ~6 mm (z-profile shows 6 mm slivers mid-body).
- Both halves print flat on the big z=-84 face (43k/39k mm² planar contact).
- 252 x 181 footprint = 300-bed class part.

Takeaway: enclosures (M9 territory) split at ONE mid plane into two
assembly-coordinate halves with full-face glued butt joints, printed on the
large flat face. Mirror-dedup must be VERIFIED, never assumed — asymmetric
internals silently break it (test: flipped-vertex containment, not bbox).

## 2. `Bornier AR m.stl` — rear terminal plate

79.5 x 79.5 x 6 mm flat plate, 1,542 tris. The batch's Speakon_Plate analog
(liam056 batch 2): accessory plates are their own tiny flat parts, printed
as-is. The exporter's BOM should carry a "plates" role with zero orientation
logic (any face down works; 6 mm typical).

## 3. `dh350meh (1).zip` — DH350 MEH: the SYMMETRY-HALF convention + DSP project

Contents: `DH350 MEH Half.stl`, `Throat Adapter.stl`, `CoentrantMEH
ADAU1701.dspproj` (SigmaStudio DSP crossover shipped WITH the geometry).

- Half: 38,238 tris, 180.0 x 160.0 x 159.8 — HALF of a full horn, cut on a
  plane through the horn axis. The mate face at y=29.8 carries the full
  profile ring cross-section (2,067 mm² of wall material, verts from z=10 to
  z=160): the cut bisects EVERYTHING, throat included. Print two (second one
  mirrored in the slicer), glue on the plane. 180 x 160 footprint = 200-bed.
- Throat Adapter: separate 10 mm-thick annular part, bore r=12.7 mm (exactly
  1", the DH350 exit), OD ~77 mm. The driver interface — the one feature that
  cannot be halved — is EXTRACTED into its own small part that bolts whole
  across the assembled halves.

Takeaway — refines batch-2 finding #1: "never cut through driver features"
has one canonical exception: a SYMMETRY plane through the horn axis is a legal
cut (halves the whole horn, throat and all) PROVIDED the driver mounting
interface is extracted as a separate un-split adapter (batch-2's roundover
logic applied to the throat). This is how a 180 mm-deep 160 mm-tall horn fits
a 200 bed at all. The DSP project alongside says exports should eventually
bundle the electrical side (M10 kinship).

## 4. `MEH.pdf` — Scott Hinson, "MEH" (2022, 44 pp) — the DCX464 build writeup

The written canon behind the CDX-class 2-way coax family (DCX464 + 2x10NW76,
12/18 mm baltic birch). Laws and numbers worth holding v5 against:

- TAP CHAMBER MODEL (matches v5's M2 exactly, good): V1 rear chamber (tiny,
  shapes the mid's LF), V2 under-cone volume, V3 the tap hole through 12-18 mm
  wall, L12 = distance down the horn. V2/V3 set the HF corner, V1 the LF.
- Small-tap hazard (new to our laws): shrinking the tap hole to push the HF
  corner up raises LF pressure under the cone — CAN TEAR CONES. More mids =
  the fix (why commercial units run 6). v5's velocity/area laws bound this
  indirectly; a future explicit "tap pressure vs cone strength" row would
  state it directly.
- Mid taps live in the CORNERS (measured: taping them over changes the CD
  response almost not at all); woofer taps are racetracks for area without
  intrusion — both already v5 canon, now with a measurement behind them.
- DCX464: mid coil usable from 300 Hz, ~111 dB/2.83V both coils; his passive
  pad is 6R series / 1R shunt PER COIL (~18 dB) — and the 1R shunt also
  stabilizes the response because the two diaphragms are acoustically coupled
  (unterminated coil = response shift; measured in Fig 23/24).
- Port problem: modern woofers overpower any physically-fitting port; his
  build accepts 2x75 mm x 7.25" ports at 17 m/s chuffing onset as the limit
  (BASTA modeled). v5's M6/port-velocity row uses the same physics — 17 m/s
  is a source-backed constant for the sub-XO row.
- Hornresp MEH wizard was the tap model (Fig 13 agreement is close) — M10's
  ME2 export remains the right target format.
- HIS throat adapter is an STL (he suggests printed with heavy infill as a
  wood substitute) — same extraction convention as the DH350 half kit.
- Full active EQ tables (Hypex FA253) and woodworking sled walkthroughs:
  reference for a future reports/DSP panel, not geometry.

## 5. `pm90_current.dwg` — Peter Maxwell Warasila's PM90 (2017, rev 0.7, 4 sheets, 1:2)

AutoCAD 2013-2017 binary; libredwg converts (one malformed embedded note), raw
tag extraction recovered the structure. It is a WOOD construction drawing:
block library = box_top/bottom_section, box_back_front, baf_12in_section (12"
woofer baffle), baf_horn_90_section (90° horn baffle), brace_horn_top/bottom,
grille_section, and a full fastener set: M6 flat-head hex (16/20/22), M6
flanged nuts, M6 T-NUTS, M3.5x13/19 wood screws, M1557M20 hardware.
Sheet notes: "HATCH INDICATES SECTION CUT"; plot note: "toolpaths from .dxf
not from plot" — the drawing doubles as the CNC source.

Takeaway: the wood-canon angular family is BOLTED with T-nuts through braces
(matches liam056's bolted grid from batch 2, in plywood); pin #17's "make it
as if it's from wood" look = these flat sections + braces. Per-sheet dims not
yet pulled (needs entity-level walk of the fixed DXF — parked; the block
names and hardware BOM were the actionable part).

## 6. Cross-batch synthesis for the AUTO-SPLIT EXPORTER (supersedes nothing, adds tiers)

The full split decision tree observed across batches 2+3:

1. Fits the bed mouth-down (with roundover integrated or detached) -> ONE
   piece (apr-11, 300 bed).
2. Small horn, CD face is the precision surface -> one piece THROAT-DOWN
   (nov-24 synergy).
3. Doesn't fit -> SYMMETRY-HALF through the axis, throat bisected, driver
   interface extracted as an adapter part, print 2 with slicer mirror
   (dh350meh, 200 bed) — cheapest cut count.
4. Long shallow horn -> cross-axis station cuts, all driver features kept
   inside ONE segment, assembly coordinates, mouth-down (mar-11 home unity).
5. Enclosure boxes -> one mid-plane, two halves, butt-glued, big-face-down;
   verify mirror-dedup, don't assume it (Pavdan).
6. Accessory plates (terminals, Speakon, adapters) -> flat loose parts.
7. Joints: glued full-face butt (thin walls, home scale) OR bolted flanges +
   backer braces + T-nut/M6 hardware BOM (pro/wood scale). Both are canon;
   exporter should name its joint mode in the manifest.

---

## 7. PATENT CANON — the coax throat side (Marwan's drop, 2026-07-23 ~9pm)

### US 10,506,331 B2 — Martin Audio, "Coaxial Loudspeaker" (Baird/Anthony, 2019)
THE law source for the driver-mount triple. Their model of a horn-loaded coax
is THREE waveguides acting "as though a single waveguide were present":
1. FIXED waveguide - from the HF exit (pole/phase-plug region);
2. MOVING waveguide - ON THE CONE: the cone's front face is a waveguide
   segment that "moves in unison" with the cone;
3. STATIC outer waveguide - continues from the cone rim outward, "shaped to
   continue the curvature of the cone, thereby enlarging the cone".
Junction rules: substantially CONTINUOUS at both handoffs - tangent angle
alpha at fixed->moving, beta at moving->static, with beta > alpha in their
example (opens coverage). CLEARANCE between static and moving waveguides:
0.3-5 cm, "more preferably 0.5-3 cm", and it must hold AT MAXIMAL DOWNSTREAM
DISPLACEMENT (i.e. >= xmax by construction). The static waveguide reaches
down to the surround.
v5 mapping: small circle = fixed->moving junction; large circle =
moving->static junction (the dish takes over); dish inner slope = TANGENT
MATCH to the cone at the rim (not a fixed 38 deg), then blend to coverage;
print-to-cone gap law gets the sourced band [5,30] mm AND >= xmax; the cone
path between the circles is legitimately part of the horn (their claim 1) -
v5's slant-path XO math across the dish face is the same doctrine.

### US 2013/0064414 A1 — PHL Audio, "Coaxial speaker system having a compression chamber"
Frontal-HF coax (compression driver mounted IN FRONT of the woofer - no bore
through the main magnet; kills the saturated-pole compromise and the axial
time offset). Geometry content is transducer-level (voice-coil clearances,
motor architecture), not horn law - keep as background for a future
frontal-coax dialect, not for the current build.
