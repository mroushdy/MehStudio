# Build 645 cartridge-retention contract

This contract covers the fasteners that clamp each separately printed driver
cell to the horn. It is independent of the woofer bolt circle: the woofer BCD
holds the driver to its cell, while the retention fasteners hold the cell to
the horn.

Application build: `645`  
Exact mesh policy: `b645-cartridge-retention-v3`

## Selected hardware envelope

The generated pocket targets a short M4 × 0.7 heat-set insert. The model keeps
the insert body and installation hole as different dimensions:

- recommended straight installation hole: 5.61 mm (+0.08 / -0.00 mm);
- short insert over-knurl body envelope: 6.38 mm;
- short insert length: 4.70 mm;
- generated pocket depth: 4.90 mm;
- minimum remaining acoustic-side cap: 2.40 mm;
- module screw clearance: 4.60 mm;
- low-head screw counterbore envelope: 8.40 × 3.20 mm;
- printed retention boss: 14.80 mm diameter × 6.00 mm deep.

The insert dimensions and recommended hole come from SPIROL's
[Series 29 short M4 insert record](https://shop.spirol.com/item/series-29-30-short-heat-ultrasonic-insert-metric/series-29-short-heat-ultrasonic-insert-metric/151034).
SPIROL's
[hole-design guidance](https://www.spirol.com/resources/white-papers/how-to-design-the-proper-hole-for-heat-ultrasonic-inserts/)
recommends surrounding wall or boss diameters of roughly two to three times
the insert diameter. The 14.80 mm generated boss is about 2.32 times the
6.38 mm insert envelope.

These dimensions are not interchangeable. Subtracting a 6.38–6.40 mm hole
would model the outside of the knurl rather than its installation hole and
would produce a loose insert fit.

## Layout and ownership

Each cartridge receives two phase-solved clamp locations on its horn-side root
annulus. The horn part owns the blind insert pockets. The matching cartridge
owns the printed bosses, M4 clearance bores, and head counterbores. Hardware is
not fused into either STL.

The woofer interface remains a separate exact feature family. Its pockets use
the solved driver bolt-circle diameter and bolt count; they are not a visual
four-bolt placeholder and they are not reused as cartridge-retention holes.

The layout search must preserve:

- 3.20 mm minimum printable web;
- 2.40 mm acoustic-side blind cap;
- clearance from every canonical tap cutter;
- clearance from every woofer BCD pocket;
- clearance from the finite compression-driver flange;
- the radial cartridge sector and neighbour seam;
- a bracketed, finite intersection with the real horn wall.

If no phase satisfies every condition, planning and exact preflight fail with
`CARTRIDGE_RETENTION_NO_LAYOUT`. Retention holes must never be silently
omitted.

## Inspection and tap-path contract

The mounts-only inspection view is an interface inspection, not an exploded
driver rendering. It contains zero LF driver bodies and zero compression-driver
bodies. For each solved woofer it retains the driver-bearing land, gasket,
driver-pocket root and exact BCD pockets. Cartridge construction additionally
shows one retention-feature root per solved M4 clamp location.

For radial horns, the analytic tap lumen consumes the same exact swept
`field.tapTools` path used by the solid definition. The renderer retains its
model-coordinate `pathPoints` and `pathSegments` metadata so browser admission
can check continuity and termination. The visible lumen is trimmed to the
acoustic surface and cone-chamber entry; the subtractive cutter may retain
small Boolean overtravel needed for a reliable through-cut.

The UI, report, and export path consume the same retention result. A cartridge
layout that lacks a passing retention result must remain unavailable for exact
export rather than falling back to an unretained module.

## Manufacturing status

A passing geometry and mesh audit establishes that the pockets, bores, bosses,
gasket joint, and tap lumen are represented in the exact solid. It does not
certify insert pull-out strength, printed-layer adhesion, screw preload,
fatigue, dimensional accuracy, or the cantilever load of a particular woofer.
Validate the chosen polymer, orientation, insert-installation temperature,
screw length/torque, gasket compression, and assembled driver load on a
physical prototype.

Build 645 has pinned both integrated P03 and the derived retained
`P03-CARTRIDGE` under `b645-cartridge-retention-v3`. The retained certificate
audits three named, individually connected printable parts; four active
retention tools; exact horn/module feature ownership; zero topology faults; and
zero self-intersections. Its three STL file hashes and resource ceilings are
recorded in `qa/cases/exact-production-admission.json`. This is an exact
geometry/fabrication certificate, not a strength or dimensional-accuracy
certificate.

The current whole-horn manufacturing lattice is 2.5 mm. That is sufficient to
audit feature ownership and topology, but it is not dimensional metrology for
a 4.60 or 5.61 mm bore. Treat the printed insert pocket as a located pilot:
calibrate it for the selected printer/material and drill or ream it to the
chosen insert manufacturer's final recommendation before installation.
