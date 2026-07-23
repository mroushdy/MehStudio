# PRINTED-MOUNT REBUILD — DESIGN SPEC (from Marwan's reference parts, 2026-07-22)

The next major build replaces the pod/collar/puck zoo with ONE-PIECE printed mounts.
Two reference parts define the canon:

## Reference A — flat sculpted baffle plate (dark blue part)
- One thin plate per driver group: driver seats, kidney/slot ports, reinforcement ribs
  and the CD boss all in a single sculpted part. No separate cones/collars/pads.
- Plate conforms to the wood panel; drivers mount from behind onto shallow seats.

## Reference B — printed APEX unit (translucent part; the key insight)
- The printed part IS the horn boundary locally: a base flange screws to the plywood
  wall, and the part rises as a small faceted pyramid whose facets carry the driver
  seats. The taps are STADIUM SLOTS (rounded ends, long axis along flow) cut straight
  through the seat floor — so every driver sits DIRECTLY OVER its taps, because the
  print creates the local geometry that makes that legal (no open-air problem: the
  facet is solid printed surface).
- CD boss at the apex: round flange, real bolt circle, center throat bore.
- Perimeter screw flange onto the wood; sparse/honeycomb infill (light, printable).

## What this changes in the tool
1. Chamfer/corner + curved-shell mounts become one printed part each (wall, corner,
   apex variants). The duct cone, seal collar and conformal puck merge into it.
2. Taps-under-drivers becomes NATIVE where a printed facet exists (the current law
   that keeps frames clear of taps applies to WOOD boards, not printed facets that
   locally replace the horn surface — model the printed facet as horn boundary).
3. Slot canon gains stadium ends + corner radius + optional foam insert (his tap
   close-up photo: radiused printed edge, foam damping in the openings).
4. The drawn part IS the exportable printable part (OpenSCAD/STL export closes the
   long-queued item). Render: translucent print material option.
5. New flower 2-way island (CD + 6 small woofers radial on a printed hub — the
   arda.audio build) is Reference B generalized to a full ring.

## Reference C — coax "synergy-exit" printed flare in a wood cube (BMS coax build)
- The ENTIRE horn is the printed part: axisymmetric flare with the CD throat bore at
  center, a ring of small cone-taps immediately around it (the coax's cone section
  fires through them - few-cm paths, phase-coherent), and the driver seat with its
  bolt circle on the back - one print. The wood box is just the enclosure: square
  cab, printed corner gussets, flare drops in (octagon corner cutouts at the mouth).
- This is our coax2 island acoustics (coax + cone taps at the throat, XO from landed
  geometry) wearing the roundprint island's construction. The printed-mount rebuild
  should make this state expressible: coax2 x round/printed form, flare exported as
  the printable part with tap ring + throat bore + seat integrated.

## Queue confirmed with Marwan
(1) one-piece printed mounts + export · (2) stadium/radiused taps + foam option ·
(3) pa3way nM→6 + 15" woofer preset (SH96HO class) · (4) flower 2-way island.

## Reference batch 2 (2026-07-22, ten photos) — canon corrections & confirmations
1. REAL SH-96 INTERIOR (the key photo): the big 3-way runs 4 WOOFERS ON CORNER
   BOARDS (plywood diagonal shelves + wedge blocks, tight to the throat) and SIX
   MIDS IN A TIGHT RING bolted around a small square throat plate at the CD.
   CANON CORRECTION for our pa3way/SH96 class: mids do NOT belong in the corners -
   corners carry the woofers; mids ring the apex. Needs a new placement 'apexring'
   (mid frames around the throat plate) + plW='chamfer' as the corner-woofer style.
2. MOTHER SHELL MILLING (robot photo): curved-shell woofers sit FLUSH in shallow
   MILLED OVAL LANDS (recessed dishes) with the slot tap cut inside the dish; the
   rear photo shows them bolted directly, backs fully exposed. The 'curved-shell
   foot' work item becomes: oval recessed land + flush driver (kills the pucks).
3. Production apex inserts (fabric horn close-up, squircle horn, donut horn): the
   printed apex unit with small mid slots ringing the CD bore is REAL and shipping -
   Reference B confirmed at three scales, incl. the ATH donut roll-back mouth.
4. Two-stage waveguide dialect (squircle photo): a rect inner waveguide with corner
   slots inset within the rounded outer flare - log as a future form option.
5. Printed diamond pods (black cluster + ADDIT close-up): the flower island's
   exterior - drivers in angled printed pods on a hub, CD snout central.

## Reference D — Marwan's printed 1-way coax (build photo, 2026-07-23)
Photo: reference/build_photos (coax dish on the printer bed). Corrections to v5's 1way:
- The HORN is a square straight-walled classic section; the round-to-square
  transition is a SEPARATE printed ADAPTER DISH dropped into it (stepped outer
  flange seats on the horn; corner WINGS bridge dish-to-square and mount it).
- The cone taps are PLAIN ROUND HOLES through the DISH FACE (2-4 of them),
  not slots on the horn wall. The dish face IS the first flare surface.
- Central CD bore is a short cylinder tube through the dish center.
- v5 to-do (queued in M5): 1way part = dish insert (flange + bore tube + round
  tap holes + wings) sitting in a square angular first flare; tap-hole area
  still velocity-derived; XO from the dish-face slant path (unchanged law).

### Reference D photo study (2026-07-23, five-shot carousel) — LANDED build 503
Confirmations from the new photos (render + real BMS-coax part):
1. SQUARE straight-walled single-expansion horn (classic angular), FLAT mouth
   with a bolt-hole flange - no roll, no second Waslo expansion on the 1-way.
2. The dish is a SEPARATE round insert with a stepped flange seat (visible as
   the dark seam ring where it lands on the horn walls).
3. Four corner WINGS (flat vanes) bridge the dish rim to the square corners.
4. Central snout: external funnel behind the dish rising to the CD bore tube.
5. THE COAX STACK: the compression driver bolts coaxially on the BACK of the
   woofer (BMS style) - the whole unit hangs behind the dish on its bolt circle.
v5 build 503 implements all five: engine profile 1way+angular = round dish
(nOv:2) in a square straight flare; shell renders dish insert + seam + wings +
snout tube + stacked CD; 'Reference D' is the flagship 1-way KNOWN BUILD
(70x70 square, gate-asserted exemplary). Topology button renamed 2-WAY COAX
(the only feasible 2-way rides the coax CD - plain-CD states refuse honestly).

### Coax driver CAD study (2026-07-23, B&C 6FHX51-GC .3dm + .stp) — build 504
Measured from the Rhino layer bounding boxes (units inches; od-relative):
frame Ø6.58 (1.00) · gasket .97 · surround .95 · cone Ø.72 x .14 deep ·
HF HORN mouth Ø.60 sitting PROUD of the cone face, flaring back to the 1in
throat at depth .53 (layer Horn_04 - the horn FILLS the cone center) ·
woofer magnet Ø.72 at depth .27-.44 · tweeter stack to .63 · square-frame
corner bolts (BMS photo canon).
Landed in build 504:
- coaxBody(od,dp): parametric coax render calibrated to these proportions
  (square rounded frame + bolts, gasket/surround/cone, METAL HF horn, motor).
- THE DISH DERIVES FROM THE DRIVER: dish rim = flange+12mm, tap ring clamped
  to the EXPOSED cone annulus (0.70-0.80 rCone - the HF horn owns the center
  to 0.60R), adapter length from the 38deg funnel; the horn GROWS to host the
  driver (declared-mouth vs dish-flange law, growth-fixable) - never shrinks
  the driver to fit.
- KNOWN BUILDS: 'Reference D mini' (BMS 5in CN140-class, 14in mouth) and
  'B&C 6FHX51 true-CAD' (16in mouth), both gate-asserted exemplary.
- STEP file archived as the export-pipeline reference (queue A).
