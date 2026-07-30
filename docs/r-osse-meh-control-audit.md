# R-OSSE controls and MEH integration audit

> **Pre-Build-647 baseline.** The four forward-monotone Stage-1 profile laws
> described as future work here are now implemented. Native rollback R-OSSE
> remains deferred. See `build647-parametric-geometry.md` and
> `profile-law-stage1.md` for the current contract.

Status: read-only design audit. This document does not authorize production
geometry changes. It complements `horn-profile-contract.md`.

## Executive result

The current two-way `SMOOTH` horn is intentionally almost conical. It is not an
R-OSSE, OS-SE, or JMLC contour:

```text
t = x / depth
g(t) = 0.72 t + 0.28 (3 t^2 - 2 t^3)
r(x) = r_throat + (r_mouth-r_throat) g(t)
depth = (r_mouth-r_throat) / tan(targetHalfAngle)
```

This is implemented in `engine.js:852-868`. Its slope multiplier is

```text
g'(t) = 0.72 + 1.68 t(1-t)
```

so the profile has 72% of the straight conical slope at both ends and 114% at
mid-length. The linear term dominates, which is why the silhouette reads as a
slightly eased cone.

The two-way round-to-selected-section throat insert is a different piece of
math. `twoway-core.js:438-475` uses a monotone quintic Bezier over a solved
38-80 mm transition (`twoway-core.js:715-725`). That insert can make the throat
handoff C2-smooth without changing the mostly conical wall downstream.

The latest close-up is visually consistent with that short
round-to-superellipse insert feeding the cone-biased outer wall. Its bright
four-way bloom does not identify an R-OSSE contour and cannot, by itself,
distinguish geometry from material lighting, exposure, or vertex-normal
shading. A section/profile plot and the deterministic throat-morph audit are
the appropriate evidence.

There is already real R-OSSE code in v5:

- the exact revision-7 formula is in `engine.js:259-340`;
- a bounded public solver and schema are in `engine.js:342-562`;
- source fixtures exist in
  `qa/node/radial-profile-foundation.test.mjs:103-124`;
- one-way coax geometry uses a specially fitted, forward-only R-OSSE adapter
  in `engine.js:739-807`.

The general two-way `profile(S)` does not dispatch to that foundation. The
comment at `engine.js:342-346` explicitly keeps the profile families dormant,
and the golden test at
`qa/node/radial-profile-foundation.test.mjs:205-229` preserves the eased cone
as the unselected default.

## Source and licensing notes

The supplied `/Users/marwan/Downloads/Horn Studio.html` identifies R-OSSE as
Marcel Batik's December-2022 published parametric formula and describes it as a
complete free-standing waveguide with rollback (`Horn Studio.html:1702-1735`).
Its own method note says geometry alone is not a BEM substitute
(`Horn Studio.html:7038-7049`). The file is marked CC BY-NC 4.0
(`Horn Studio.html:1-8`); any copied implementation needs compatible use and
attribution.

The HTML is primary evidence for what this particular control panel computes.
Its comment that the author BEM-validated R-OSSE is a source claim, not an
independent validation of an MEH after wall taps, non-round stretching, driver
cells, or a different termination are added.

## The R-OSSE law

Horn Studio's `rosseWall` (`Horn Studio.html:1702-1735`) and v5's `rosse`
(`engine.js:275-292`) implement the same parametric curve:

```text
c1 = (k r0)^2
c2 = 2 k r0 tan(a0)
c3 = tan^2(a)

L = [sqrt(c2^2 - 4 c3 {c1 - (R + r0(k-1))^2}) - c2] / (2 c3)

x(t) =
  L [sqrt(rho^2+m^2) - sqrt(rho^2+(t-m)^2)]
  + b L [sqrt(rho^2+(1-m)^2) - sqrt(rho^2+m^2)] t^2

y(t) =
  (1-t^q)
    [sqrt(c1+c2 L t+c3 L^2 t^2) + r0(1-k)]
  + t^q
    [R + L {1-sqrt(1+c3(t-1)^2)}]
```

Here `t` is the native parameter, `x` is axial position, and `y` is radial
position. `t` is monotonic; `x` generally is not, because native rollback is a
feature of the law.

### Control meanings

| Control | Formula role | Geometric effect | MEH interpretation |
|---|---|---|---|
| `R` outer radius | Enforces `y(1)=R` and participates in `L` | Sets physical outer radius and overall scale/depth | Derive from requested mouth topology; do not expose as a second independent mouth-width control |
| `a` nominal half-angle | `c3=tan^2(a)` | Larger `a` shortens the contour for a fixed `R`; it is a nominal shape parameter | Seed from a target, but label **nominal**, never verified coverage |
| `a0` throat angle | `c2=2kr0 tan(a0)` | Changes the launch and near-throat contour | Match the real driver/adapter tangent; it must not be an unrelated styling dial |
| `k` throat expansion | Changes `c1`, `c2`, and `L` | Redistributes expansion near the throat and through the OS-like branch | Useful advanced control, but it changes impedance and every downstream tap solve |
| `rho` (`r` in the UI) apex-radius factor | Rounds the square-root bend in `x(t)` | Small values make a deeper/sharper axial apex; large values make a broader, shallower turn | Useful only after curvature, wall-offset, and driver-land checks |
| `b` bending | Adds a quadratic axial displacement | In the usual `m>.5` range, increasing positive `b` pulls the outer contour farther backward and slightly advances the apex; the sign reverses below `m=.5` | Native rollback control; unsafe in an `x -> section` surface representation |
| `m` apex shift | Centers the primary axial bend at `t=m` | Smaller `m` moves rollback inward/earlier; larger `m` pushes it toward the outer rim | Native rollback control; strongly affects usable tap-bearing depth |
| `q` throat shape | Blends the OS-like branch into the terminal branch with `t^q` | Low `q` starts terminal shaping early; high `q` preserves the base branch longer | Useful, but `q<3` is not a safe C2 default at the throat |

The physical launch slope is not simply `tan(a0)`:

```text
dy/dx at t=0 = tan(a0) sqrt(rho^2+m^2) / m
```

Both Horn Studio (`Horn Studio.html:1710-1717`) and v5
(`engine.js:559-562`) record this correction. To match a desired driver-exit
wall tangent `theta_exit`, solve:

```text
a0 = atan[tan(theta_exit) m / sqrt(rho^2+m^2)]
```

For `q=1`, the terminal blend also contributes at the throat; it can change the
launch dramatically. For `q>1`, its first derivative vanishes at `t=0`. For a
well-behaved C2 throat default, use `q>=3`.

### Why B and M cannot be wired into current two-way geometry directly

Using the paper's ST260 values
`R=130 mm, r0=12.7 mm, a=39 deg, a0=7.5 deg, k=1.8, rho=0.3, q=3.7`:

| B / M | Maximum axial x | Final x at t=1 | t at maximum x | Result |
|---|---:|---:|---:|---|
| paper reference `b=.30, m=.80` | 77.70 mm | 57.47 mm | .733 | native foldback |
| screenshot `b=.34, m=.53` | 50.56 mm | 5.64 mm | .525 | much earlier/deeper rollback |

Those numbers come directly from the embedded equations. They are not acoustic
rankings. They show that the screenshot's beautiful bowl is not a single-valued
`radius(x)` surface.

Current two-way consumers assume exactly that single-valued form:

- `dimsAt(st,x)` scans stations by axial `x` (`engine.js:885-891`);
- wall points and normals use `(x,phi)` (`engine.js:894-910`);
- the exact solid clamps `x` to `[0,depth]` (`twoway-core.js:1858-1909`);
- taps, cells, and plates are solved from those wall functions.

Flattening, sorting, or inverting the R-OSSE points by `x` would destroy the
published rollback and can select the wrong of two radial points at the same
axial coordinate. Full R-OSSE therefore needs a native `(t,phi)` surface and a
parametric exact mesh/SDF path before `b` or `m` becomes a production MEH dial.

## Section, aspect, and mouth controls in Horn Studio

### Lamé / superellipse section

Horn Studio uses

```text
x = sign(cos phi) a |cos phi|^(2/n)
y = sign(sin phi) b |sin phi|^(2/n)
```

(`Horn Studio.html:2417-2429`). `n=2` is an ellipse; increasing `n` makes a
rounded rectangle/squircle. This `n` is a cross-section exponent. It is not
R-OSSE's `q`, and it is not OS-SE's meridional termination exponent.

Horn Studio morphs `n` from 2 at the throat to the selected value using
arc-length smoothstep and preserves area with

```text
K(n) = 4 Gamma(1+1/n)^2 / Gamma(1+2/n)
K(n) a b = pi r_equivalent^2
```

(`Horn Studio.html:2343-2414`). This is a sound geometric contract. It does
not prove that a non-round R-OSSE retains the round law's wavefronts or
directivity.

Current v5 morphs `n` over the first 45% of axial depth
(`engine.js:871-883`) but leaves the half-axes unchanged while `K(n)` grows.
Consequently changing shape also changes cross-sectional area and the 1-D
loading ladder. A source-backed radial-profile mode should use the
area-preserving map instead of silently changing the meridian's area law.

### H/V aspect

Horn Studio morphs aspect from 1 at the throat to `A=a/b` at the mouth with
the same smoothstep and preserves station area (`Horn Studio.html:2350-2403`).

Current v5 immediately sets

```text
b/a = tan(covV/2) / tan(covH/2)
```

in `engine.js:871-883`. The new two-way throat insert hides the resulting
elliptical base near `x=0`, but this relation still treats desired coverage as
if it were an exact geometry law. For a radial profile, aspect should be a
separate topology transform, derived as an initial estimate and labelled an
engineering approximation.

### Roundover radius and wrap

Horn Studio distinguishes three things:

1. the profile law's own termination;
2. an optional meridional mouth roll, controlled by `flareR` and
   `flareWrap`;
3. the structural shell-edge closure, selected by `Mouth lip: rounded` versus
   `straight`.

`flareSweepFor` (`Horn Studio.html:2284-2299`) rolls a forward wall toward
`90 deg + wrap`; if the wall already self-rolls beyond 90 degrees, `wrap`
means additional sweep only. `flareArc` (`Horn Studio.html:2300-2340`) ramps
curvature into a constant-radius turn instead of starting with an immediate
curvature jump. The solid's `rounded (bullnose)` option is a separate C1
inner-to-outer shell closure (`Horn Studio.html:2879-2995`); it is not an
acoustic-profile substitute.

For native full R-OSSE, the correct default is no extra roll: the rollback is
already in the equation. Adding `flareR` or `wrap` changes the family and must
be a separately named, revalidated termination.

The current general v5 profile appends a ten-sample radius roll after its
declared `depth` (`engine.js:860-868`). In the two-way analytic path,
`twoWaySectionPoint` clamps the queried section to `depth` while
`quickTwoWayShell` still emits the later axial coordinates
(`shell.html:1548-1589`); in the exact path, `sdCross` bounds the solid at
`depth`. The two-way mouth roll is therefore not yet one canonical acoustic
surface shared by preview and exact mesh.

## What curvature can change acoustically

The defensible statements are:

- throat slope and curvature continuity can reduce a geometric impedance
  discontinuity, but the driver exit wavefront must also match;
- wall slope and curvature affect local wavefront shape, higher-order modes,
  reflection, and directivity;
- terminal rollback/roundover changes mouth-edge diffraction and rear
  radiation;
- section aspect and corner curvature affect H/V directivity and transverse
  modes;
- in an MEH, wall taps add sources and discontinuities that were not present in
  the axisymmetric R-OSSE validation case.

It is not defensible to claim that a more visibly curved horn necessarily
sounds better, that `a` is verified coverage, or that an affine superellipse
stretch remains an exact R-OSSE. BEM and prototype measurements must arbitrate
the useful range for an MEH.

Conical walls are not inherently a mistake. They give simple predictable
station geometry, planar construction, and a constant geometric opening
angle, which is why documented MEHs often use them. R-OSSE offers a more
gradual throat and an integrated free-standing termination, but it also changes
depth, local normals, loading, tap phase, and manufacturing topology.

## Safe/useful MEH controls versus deferred controls

### Safe to expose after the canonical-profile integration

- explicit `profileLaw`, with the current eased cone preserved as a named
  legacy option;
- `a0`, preferably solved from the actual driver/adapter tangent;
- `k`, with every change triggering a complete acoustic/packaging re-solve;
- `q` in a standard C2 range of `3.0-6.0`, default `3.7`;
- cross-section kind and Lamé `n`, using area preservation;
- target aspect, preferably derived from desired mouth dimensions rather than
  marketed as verified coverage;
- a separate non-native mouth treatment only for profile laws that require it.

### Not safe in the present `(x,phi)` two-way engine

- full R-OSSE `b` and `m`;
- any parameter set with `dx/dt<=0` in the tap-bearing body;
- arbitrary R-OSSE `R` in addition to the existing mouth-width control;
- independent `a` plus claimed H/V coverage;
- native rollback represented by sorting or flattening `x(t)`;
- a generic torus appended to native R-OSSE;
- tap locations retained from the old profile after curvature changes.

### Suggested ranges

These are UI safety tiers, not acoustic optima:

| Parameter | Standard | Advanced/source bound | Default |
|---|---:|---:|---:|
| `a` nominal half-angle | 25-55 deg | 20-60 deg | derived seed; ST260 39 deg |
| `a0` | solved; display result | 0-20 deg | driver-match solve |
| `k` | .8-2.5 | .5-4 | 1.8 |
| `rho` | .15-.60 | .05-1 | .30 |
| `b` | deferred for full-parametric mode | 0-1 | .30 |
| `m` | .65-.90 in full-parametric mode | .4-.98 | .80 |
| `q` | 3-6 | 1-8 with continuity warning | 3.7 |
| Lamé `n` | 2-8 | 2-12 print-only advanced | 6 |
| extra R-OSSE wrap | none | separately named experiment | 0 |

For a separately terminated monotonic law, a useful manufacturing starting
gate is

```text
R_roll >= 4 wallThickness
R_roll <= 0.25 minorMouthDimension
```

followed by local-curvature and collision checks. Native R-OSSE does not use
this extra radius.

## Photo/shape compatibility matrix

Photographs can support only a geometry-family classification. Perspective,
hidden sections, and unknown CAD parameters prevent a photograph from proving
R-OSSE, OS-SE, JMLC, conical, or any unique equation.

| Visual geometry family | Defensible law/topology description | Current v5 | Dormant/local basis | Work still required |
|---|---|---|---|---|
| Smooth rollback bowl | Round parametric meridian with an axial apex and self-contained rollback; visually compatible with R-OSSE but not proof of it | One-way coax uses a monotonic R-OSSE-derived adapter, not the full bowl; general two-way cannot represent foldback | `rosseProfile` preserves native `t`, `maxDepth`, `final x`, and foldback | Native `(t,phi)` surface, parametric taps/offset shell, exact mesh, BEM and prototype validation |
| Rectangular CD/conical horn with corner fillets | Independent H/V wedge or OS/CD-style meridians mapped to a rounded rectangular section and flat/baffled mouth | Angular mode supports real planar/chamfered panels; smooth superellipse is only an approximation | Horn Studio rounded-rectangle and per-plane profile machinery | A named filleted-rectangle topology, area/curvature-preserving throat morph, no unsupported R-OSSE claim, BEM |
| Compound curved superellipse rectangular MEH | Explicit smooth meridian plus area-preserving Lamé/aspect topology; taps cut through the finished curved wall | Visual approximation exists: eased cone + non-area-preserving `seN` stretch | R-OSSE/OS-SE foundations plus Horn Studio's area-preserving `planeProfiles` method | Wire one canonical law, preserve area, re-solve taps and mounts, shared preview/exact mesh, BEM |
| Hard-faceted conical panel MEH | Straight or documented piecewise-conical H/V panels, explicit seams/chamfers, flat mouth | Supported by `angular`, `panelPoint`, panel SDF, Hinson/JMOD construction paths | No radial law is needed or justified | Keep separate from R-OSSE; verify exact openings, plates, seams and sourced dimensions |
| Smooth rounded-rectangle with generous roll | Monotonic smooth meridian, rounded-rectangle sections, perimeter-normal terminal roll/baffle | Smooth superellipse exists, but the two-way roll is not canonical between analytic and exact paths | Horn Studio `planeProfilesWN`, `flareArc`, and perimeter-normal ring roll show a viable construction | Canonical terminal surface, wall-offset curvature gate, driver/tap clearance, exact mesh and BEM |

The practical product architecture should therefore expose three independent
choices:

```text
profile law  x  cross-section topology  x  mouth termination
```

It should reject incompatible combinations rather than letting one generic
`SMOOTH` button silently synthesize all three.

## Staged implementation plan

### Stage 0 - keep production stable and make the truth visible

1. Preserve the current eased cone under the explicit name
   `eased-conical (legacy/current)`.
2. Report measured throat tangent, mouth tangent, maximum meridian curvature,
   and whether the profile is axial-monotonic.
3. Label target H/V coverage separately from geometric wall angles and
   BEM-verified coverage.
4. Fix the two-way terminal path so preview and exact mesh either share the
   same roll or both omit it.

### Stage 1 - canonical profile contract

Return native parameter, position, analytic first/second derivatives, arc
length, curvature, native termination, and a profile hash from one solver.
Preview, response ladder, tap planner, mount planner, BEM, and print mesh must
consume that same record.

Unknown/invalid families must refuse. They must not fall back to the eased
cone.

### Stage 2 - first safe curved production family

Wire a monotonic law first (classic OS or OS-SE with its correct baffle
contract), because current SDF and tap machinery can consume `r(x)`.

Apply an area-preserving round-to-Lamé/aspect map:

```text
A(u) = 1 + (A_mouth-1) smoothstep(u)
n(u) = 2 + (n_mouth-2) smoothstep(u)
a(u)b(u) = pi r(u)^2 / K[n(u)]
a(u)/b(u) = A(u)
```

Keep this topology labelled an engineering approximation for a radial law.

### Stage 3 - full R-OSSE

1. Keep native `t`; never invert globally to `x`.
2. Tessellate the acoustic surface as `P(t,phi)`.
3. Give the terminal rollback an explicit non-tap region.
4. Compute normal-offset shells from principal curvatures, refusing offset
   Jacobian reversal.
5. Locate each tap using actual surface/acoustic path, then rebuild its wall
   cutter, chamber, plate and driver adapter from the new local frame.
6. Keep native R-OSSE termination; do not append the generic roll.

### Stage 4 - profile optimizer, not a beauty slider

Offer a bounded candidate sweep over law parameters. Score only hard geometry
and declared analysis outputs:

- driver/adapter tangent and curvature match;
- packing and minimum wall/web;
- actual tap phase/path limits;
- no transverse area reversal;
- BEM magnitude/directivity smoothness over a declared band;
- manufacturable mesh quality.

Do not publish one universal "best" R-OSSE setting. Retain Pareto candidates
for depth, directivity, loading and printability.

## Required invariants and QA

### Profile and interface

- finite `P`, `dP/dt`, `d2P/dt2`;
- exact throat and endpoint fixtures;
- C0 radius error <= .05 mm;
- C1 tangent mismatch <= .10 deg;
- report C2 curvature mismatch in `1/m`;
- `t` strictly ordered;
- distinguish `max axial x` from `x(1)`;
- convergence of position, tangent, curvature, arc length and volume as sample
  density doubles.

### Cross-section

- area residual <= .1% at every station;
- positive half-axes and no self-intersection;
- exponent/aspect morph C1 at both ends and C2 where it joins the driver
  adapter;
- exact-axisymmetric status only for round topology;
- ellipse/superellipse labelled engineering approximation.

### Taps and mounts

- any profile change invalidates and re-solves tap stations;
- evaluate phase/path spread from actual 3-D centers and coverage boundaries;
- every full aperture remains on one valid host patch with required web;
- terminal rollback begins outside every tap, chamber, fastener and driver
  support envelope;
- each flat bearing face has a measured relief/adapter, with no assumption that
  a strongly curved wall is planar;
- normal variation and tangent-plane sag across each aperture and mount are
  reported;
- shell offset gate `1-wallThickness*kappa_i > 0` for both principal
  curvatures, with a practical margin of at least .5.

### Manufacturing and visual QA

- analytic preview and exact mesh share the profile hash;
- watertight, oriented, positive-volume shell;
- zero non-manifold edges, degenerate triangles and self-intersections;
- all declared tap passages visibly open in section view;
- render captures for round, ellipse, Lamé, rounded rectangle, no-extra-roll,
  and valid extra-termination states;
- compare `FULL`, `NO DRIVERS`, `MOUNT`, `TAPS`, `SECTION`, and raw exact mesh.

### Regression fixtures

1. current eased-cone golden remains unchanged when explicitly selected;
2. R-OSSE ST260 reference;
3. screenshot-sensitive `b=.34,m=.53,q=3.7` preserves foldback and is refused
   by any axial-only consumer;
4. `q=1,2,3,3.7,8` throat derivative/curvature cases;
5. source min/max bounds for `rho,b,m,k,a,a0`;
6. 90x60 and 60x40 area-preserving Lamé morphs at `n=2,2.5,6,8`;
7. two- and four-driver panel plus four-, six-, and eight-driver radial
   packaging cases;
8. minimum and maximum wall thickness versus terminal curvature;
9. same design at two tessellation qualities, with geometry deviation bounded
   independently of triangle density.

## Honest UI wording

Recommended:

- `PROFILE LAW: EASED CONICAL / CLASSIC OS / OS-SE / R-OSSE (EXPERIMENTAL)`
- `NOMINAL PROFILE ANGLE` rather than `verified coverage`
- `CROSS-SECTION: ROUND / ELLIPSE / LAME / ROUNDED RECTANGLE`
- `MOUTH TERMINATION: NATIVE / FLAT BAFFLE / VALIDATED ROLL`
- `TARGET COVERAGE` and, separately, `BEM/MEASURED COVERAGE`

Avoid:

- `best curvature`;
- `mathematically correct sound`;
- presenting a photographed horn as a proven R-OSSE;
- describing a stretched superellipse MEH as exact axisymmetric R-OSSE.
