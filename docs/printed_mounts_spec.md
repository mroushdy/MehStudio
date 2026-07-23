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
