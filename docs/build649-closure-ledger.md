# Build 649 closure ledger

Build 648 is a checkpoint, not a completed release. Build 649 may not be
packaged or described as complete until every row below has reproducible
evidence in all three columns:

1. source/contract test;
2. numeric geometry or topology test;
3. browser render inspected at the pinned user state.

`PASS` means all three exist. `IN PROGRESS` and `OPEN` are not releaseable.
The machine gate also requires each `PASS` row to name source/contract,
numeric, and existing render evidence in `qa/build649-evidence.json`; changing
only this table cannot admit a release.

## Pinned user state

The screenshots reported on 2026-07-28 are reproduced from this state unless a
row names a different fixture:

| Control | Value |
|---|---|
| topology | 2-way coax |
| construction family | `arch:panel` |
| woofer preset | `nw10` |
| woofer count | 2 |
| passages per woofer | 2 |
| panel driver axis | horizontal |
| driver cell | integrated and M4 retained cartridge variants |
| tap shape | slot |
| profile law | Classic OS, plus conical and OS-SE comparisons |
| section | superellipse, exponent 6 |
| mouth | 32 in |
| coverage | 90 x 60 degrees |
| wall | 18 mm |
| compression driver | `dcx464` |
| internal LF-to-CD crossover | 430 Hz |
| tap compression ratio | 9 |
| tap station | 143.3 mm |
| slot | 101.6 x 19.1 mm |
| adapter reach | 35 mm |
| primary view | no drivers, with fixed interior and rear inspection cameras |

The fixture must be encoded in a test rather than recovered from browser
storage.

## Geometry and rendering defects

| ID | Requirement / reported defect | Required closure evidence | Status |
|---|---|---|---|
| B649-G01 | Integrated driver-bearing arc intrudes visibly into horn air. | Profile-clipped preview uses the production solid boundary; maximum forbidden intrusion <= 0.005 mm; fixed-camera render has no arc. | PASS |
| B649-G02 | Jagged triangular/z-fighting artifacts on the mounting plate. | Exactly one bearing-face owner; no coplanar duplicate annulus; render has no striping. | PASS |
| B649-G03 | Horn layers are visible inside a tap. | One canonical cutter/lumen owns horn, chamber and plate subtraction; connected-component and sectional render checks show a single unobstructed passage. | PASS |
| B649-G04 | Tap appears not connected to the woofer/front chamber. | Numeric lumen path reaches both chamber and horn-air endpoints with positive clearance; x-ray and section views show both openings. | PASS |
| B649-G05 | M4 cartridge appears detached, floating and completely hollow. | Registered gasketed joint, sealed front chamber except canonical tap lumens, visible/owned retention features, zero unsupported gap, and cartridge/no-driver renders. | PASS |
| B649-G06 | Mirrored taps appear on inconsistent sides of facet intersection lines. | Signed station, seam offset, aim and mirror residuals are asserted numerically; fixed orthographic render demonstrates symmetry. | PASS |
| B649-G07 | Taps/tubes stick outside the horn or leave a gap between layers. | Cutter is bounded by both connected solids; no helper mesh extends into horn air; union/contact tolerance asserted for every admitted profile. | PASS |
| B649-G08 | Curved profiles can make driver mounts protrude through the mouth envelope. | Packaging solver grows the mouth or refuses at cap; no admitted mount point lies outside shell containment. | PASS |
| B649-G09 | Round-to-square throat adapter is abrupt/faceted. | Tangent-continuous, monotone transition with bounded area derivative and fixed interior render. | PASS |
| B649-G10 | Throat adapter and inner horn show lighting/geometry artifacts. | Common-indexed watertight mesh, valid normals, no degenerate faces, and fixed close-up render. | PASS |
| B649-G11 | No-driver view must show mounting cells/plates but no driver models. | Scene ownership assertion plus browser render for integrated and cartridge construction. | PASS |
| B649-G12 | Preview must be inspected by Codex rather than inferred from tests. | Automated fixed-camera render board for front, interior, rear, section and x-ray; all images inspected before packaging. | PASS |

## Profile, acoustics and parametric behavior

| ID | Requirement / reported defect | Required closure evidence | Status |
|---|---|---|---|
| B649-P01 | Profile-law changes look ineffective in 2-way. | Same-camera comparison board plus changed profile hash/stations/depth for conical, Classic OS and OS-SE. | PASS |
| B649-P02 | Profile-law control is missing and ineffective in 1-way coax. | Control is visible; protected coax apex/tap/handoff remains byte-identical; admitted post-handoff law changes outer stations; invalid tangent joins refuse with reason. | PASS |
| B649-P03 | Curvature drawer lacks validated R-OSSE/OS-SE variables. | Parity audit and geometry-effective controls for applicable throat/coverage/f0/K/S/N/Q/section/aspect/mouth treatment variables; invalid ranges refuse. | PASS |
| B649-P04 | Rounded rectangle works in Horn Studio/R-OSSe but is disabled here; straight/round/square/superellipse choices are also confusing or duplicated. | One section-family control with exact ellipse, Lamé and filleted-rectangle perimeter/normal/offset laws shared by preview and export; legal corner-radius control, explicit acoustic scope and no contradictory round-to-square slider. | PASS |
| B649-P05 | Driver-size-dependent woofer counts do not change. | Count enumeration derives from selected driver OD, cell clearance, symmetry and current mouth; each option reports minimum mouth and grow/refuse behavior. | PASS |
| B649-P06 | Enlarging the mouth leaves count option text at 32 in. | Labels and solver records react to every mouth change without reload. | PASS |
| B649-P07 | Tap spacing/station must scale acoustically, not merely with driver diameter. | Station obeys wavelength/path/coherence bounds; pair spacing obeys cone geometry and seam clearance; overrides report normalized diagnostics. | PASS |
| B649-P08 | Taps are unexpectedly far from the compression driver/diagonal edges. | UI reports why the solved station is legal, its phase/path bound and distance to seam/CD; constrained override is available only within legal bounds. | PASS |
| B649-P09 | Mouth size must account for coverage, pattern-control target and package constraints while remaining user-adjustable. | Solver reports acoustic recommendation, hard package minimum and user request; package growth/refusal is automatic, while an explicit size-to-pattern-target action applies acoustic sizing. Manual undersizing stays visible as a warning and is never silently rewritten. | PASS |
| B649-P10 | “Sub crossover” was misleading for a horn control. | Rename/scope LF system reference separately from internal LF-to-CD crossover; neither silently changes unrelated horn geometry. | PASS |
| B649-P11 | Driver cone depth defaults to zero but must be a real optional measured parameter. | Collapsible driver-cell panel; unknown/known state is explicit; depth and clearances alter chamber/package geometry and report provenance. | PASS |
| B649-P12 | Pre-release “legacy” compatibility must not override the best current solution. | Remove legacy labels/branches from selectable design paths; reset to a new pre-release schema; unknown current values refuse rather than silently migrate. | PASS |
| B649-P13 | One-way improvements must transfer to 2-way without damaging the protected coax fit. | Profile, section, state and review contracts are shared where the mathematics is shared; topology-specific coax and multi-entry tap kernels remain deliberately separate. One-way protected apex/tap fixtures remain unchanged across every shared-law change. | PASS |
| B649-P14 | Larger/smaller valid families and driver arrangements must be possible without pretending unlike sources are interchangeable. | Hinson and JMOD named records remain distinct; Solana is identified as a remote-bandpass/printed-cell reference rather than mislabeled as panel CAD. Calculated family/count/driver bounds admit only configurations passing package, path and topology gates, and unsupported source topologies refuse explicitly. | PASS |
| B649-P15 | A four-seam horn may retain the classic rectangular/faceted topology while each face follows a curved meridional flare. | Add a distinct curved-facets form (not a mislabeled smooth shell or flat angular horn). The selected admitted profile law drives axial face curvature while diagonal seams remain exact; preview/export share stations, panels stay manufacturable or explicitly refuse, and fixed front/section renders distinguish all three form families. | PASS |

## Interface and release discipline

| ID | Requirement / reported defect | Required closure evidence | Status |
|---|---|---|---|
| B649-U01 | Solver/provenance block is too much information at the top. | Move detailed diagnostics below the render/report area and keep a compact status summary near controls. | PASS |
| B649-U02 | Driver-cell controls should be smaller and expandable. | Collapsed summary by default, keyboard-accessible expansion, no lost values. | PASS |
| B649-U03 | Exact controls, report and render must share one state. | Browser mutation test asserts a single state revision/hash across UI, preview, report and exported exact mesh. | PASS |
| B649-R01 | A screenshot/bug may not be silently omitted from release scope. | Every report above maps to a test and render artifact; packaging gate reads this ledger’s machine-readable companion and refuses any non-PASS item. | PASS |
| B649-R02 | Build number/cache state must identify the actual source. | Assemble once after closure, bump to 649, hash source bundle, launch cache-busted Build 649 URL and verify visible build/revision. | PASS |

## Release rule

No archive is a “COMPLETE transfer” while any row is not `PASS`. A test suite
passing outside this ledger is necessary but not sufficient.
