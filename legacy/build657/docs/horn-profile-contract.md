# Horn profile contract

> **Pre-Build-647 architecture baseline.** Stage-1 forward-monotone profile
> dispatch now admits an explicitly named exact-native-body/flat-baffle
> R-OSSE truncation; full native rollback still requires the surface-native
> rewrite specified here. See `build647-parametric-geometry.md`,
> `profile-law-stage1.md`, and `ath-source-math-audit.md` for current behavior
> and the source-versus-construction boundary.

Status: implementation contract for the next radial/curved-horn rewrite. This
document is normative for geometry generation. It does not authorize changes to
tap sizing, driver placement, mounting systems, or production code.

Normative words `MUST`, `MUST NOT`, `SHOULD`, and `MAY` have their usual
engineering meanings.

## 1. Sources and scope

This contract is based on:

- Marcel Batík, *R-OSSE Waveguide*, revision 7, December 2022:
  `research-sources/R-OSSE Waveguide rev7.pdf` in the transfer root.
  The governing formula is on PDF page 4, the ST260 worked example is on page
  7, and the throat-interface warning and remedy are on pages 21–23.
- The local Horn Studio implementation:
  `research-sources/Horn Studio.html` in the transfer root. Relevant identifiers are
  `makeTfun`, `jmlcWall`, `osseWall`, `osWall`, `rosseWall`,
  `computeFamily`, `jmlcEllWall`, `planeProfiles`, `planeProfilesWN`,
  `wnProfile`, `osVirtualEntry`, `hornParams`, `profOf`, and `profOfBase`.
- The current MEH Studio implementation:
  `application/v5/engine.js`, `application/v5/twoway-core.js`,
  `application/v5/shell.html`, and
  `application/v5/qa/node/radial-profile-foundation.test.mjs`.

The first implementation target is five explicit laws:

1. straight/conical, only when intentionally selected;
2. classic oblate spheroidal (OS);
3. OS-SE;
4. R-OSSE;
5. JMLC axisymmetric, once the real isophase wavefront march is available.

No generic “curved” law is permitted. No undocumented family may be synthesized
by blending these laws.

## 2. Required separation of concerns

The implementation MUST have four independent layers.

### 2.1 Acoustic profile law

The acoustic law defines a meridian in its native domain. It MUST return one
canonical sampled curve used by preview, manufacturing mesh, export, analysis,
and reports:

```ts
type MeridianStation = {
  u: number;          // monotonic native parameter
  x: number;          // axial coordinate, metres
  r: number;          // native radial coordinate, metres
  dxdu: number;
  drdu: number;
  d2xdu2: number;
  d2rdu2: number;
};

type AcousticProfile = {
  family: "conical" | "classicOS" | "osse" | "rosse" | "jmlcAxisymmetric";
  exactness: "exact-axisymmetric" | "constructed-axisymmetric";
  stations: MeridianStation[];
  nativeTermination: string;
  nominalAngle?: number;
  coverageClaim: false;
  source: string;
};
```

The profile-law layer MUST NOT know about a square mouth, squircle exponent,
panel construction, driver count, mounting plate, front chamber, or tap.

### 2.2 Mouth topology

The mouth-topology layer maps the solved meridian or solved wavefront family
into a 3-D cross-section:

```ts
type MouthTopology =
  | { kind: "round"; exactness: "exact" }
  | { kind: "ellipse"; exactness: "engineering-approximation"; aspect: number }
  | { kind: "superellipse"; exactness: "engineering-approximation"; exponent: number }
  | { kind: "panel-facets"; exactness: "separate-planar-construction" };
```

Changing topology MUST NOT change the native meridian samples. The UI and
report MUST disclose whether the result is exact or an approximation.

### 2.3 Termination and mouth treatment

Termination is part of the selected law unless the law explicitly requires a
separate termination. A generic lip, torus, rollback, or smoothstep MUST NOT be
appended to every family.

### 2.4 Mounting and tap geometry

Mounts, adapters, front chambers, and taps consume the finished acoustic wall.
They MAY intersect or subtract from a manufacturing shell, but MUST NOT mutate
the acoustic profile or its termination. A mount/tap-only state change MUST
leave a hash of the canonical acoustic stations unchanged.

## 3. Coordinate and derivative conventions

- All engine-boundary lengths MUST be metres and angles radians.
- Axisymmetric laws use `(x,r)`, with `x=0` at the acoustic throat and positive
  `x` toward the mouth.
- Parametric laws use `u` or `t` as the canonical ordering variable. The
  implementation MUST NOT assume that `x` is globally monotonic.
- Tangent angle is
  `atan2(dr/du, dx/du)`. Meridian curvature is
  `(dx/du*d2r/du2 - dr/du*d2x/du2) /
  (dx/du^2 + dr/du^2)^(3/2)`.
- Derivatives MUST come from the analytic law when available. Finite
  differences are allowed only as a verified fallback and MUST use
  resolution-convergence tests.

## 4. Supported acoustic laws

### 4.1 Intentional straight/conical

For throat radius `r0`, axial distance `x`, and geometric half-angle `a`:

```text
r(x) = r0 + x tan(a)
r'(x) = tan(a)
r''(x) = 0
```

Required parameters are `throatRadius` and exactly one finite extent:
`axialLength` or `mouthRadius`. The other extent is derived.

This family is valid for an intentionally straight cone or a documented
straight panel wall. It MUST NOT be the fallback for “smooth,” “radial,”
“round,” OS, R-OSSE, or JMLC. Its angle is a geometric wall angle, not a
guaranteed acoustic coverage angle.

For a documented panel horn, horizontal and vertical planes MAY have independent
straight slopes. That is a separate `panel-facets` topology, not a radial law
warped into a rectangle.

### 4.2 Classic oblate spheroidal (OS)

The exact axisymmetric meridian is:

```text
r(x) = sqrt(r0^2 + (x tan(a))^2)
r'(x) = x tan^2(a) / r(x)
r''(x) = r0^2 tan^2(a) / r(x)^3
```

Consequently `r(0)=r0` and `r'(0)=0`; its throat is regular but is not tangent
to a non-zero-angle conical driver exit. Required parameters are
`throatRadius`, `nominalHalfAngle`, and one finite extent.

This law is implemented in Horn Studio as `osWall` (lines 1669–1692), and in
the bounded MEH foundation as `classicOSProfile`. The current local validator
labels it exact round and does not claim coverage:
`engine.js:RADIAL_PROFILE_SCHEMAS.classicOS`.

Classic OS is asymptotic. A finite implementation MUST declare one of:

- a large/flat baffle termination;
- a separately defined and validated blend;
- a documented physical truncation with an explicit discontinuity report.

The generic quarter-torus currently added by `engine.js:profile` is not a
classic-OS rule and MUST NOT be silently attached.

### 4.3 OS-SE

Horn Studio's `osseWall` (lines 329–369) implements the Batík 2020 OS-SE form:

```text
g(x) =
  sqrt(k^2 r0^2 + 2 k r0 x tan(a0) + x^2 tan^2(a))
  + r0(1-k)

e(x) =
  (s L / q) [1 - {1 - (q x/L)^n}^(1/n)]

r(x) = g(x) + e(x),          0 <= x <= L
```

Parameters:

- `r0`: throat radius;
- `a`: nominal half-angle;
- `a0`: throat-opening half-angle;
- `k`: throat expansion factor;
- `s`: termination strength;
- `n`: termination exponent;
- `q`: endpoint factor;
- `L`: finite axial length, or a length solved from an explicit mouth radius.

For `n>1`, the termination branch has zero launch slope, so
`r(0)=r0` and `r'(0)=tan(a0)`. The implementation MUST verify this analytic
condition. The OS-SE exponent `n` is a meridian-termination parameter and MUST
NOT be reused as a superellipse/squircle cross-section exponent.

OS-SE is a half-space/large-flat-baffle construction. The R-OSSE paper
explicitly contrasts the self-contained R-OSSE with OS-SE's flat-panel
installation on PDF page 2. OS-SE therefore uses its native steep termination;
it MUST NOT receive an additional generic rollback.

The local bounded schema is
`engine.js:RADIAL_PROFILE_SCHEMAS.osse`; `osseProfile` is the canonical
analytic solver until a newer cited source replaces it.

### 4.4 R-OSSE

R-OSSE is the default candidate for a free-standing, round, 3-D-printable
radial waveguide because its rollback/foldback is contained in the published
parametric law. The source calls the radial coordinate `y` and the apex-radius
factor `r`; this contract writes the latter as `rho` to avoid ambiguity.

Parameters from PDF page 4:

- `R`: outer radius;
- `a`: nominal coverage half-angle;
- `r0`: throat radius;
- `a0`: throat-opening half-angle;
- `k`: throat expansion factor;
- `rho`: apex-radius factor (`r` in the paper);
- `m`: apex-shift factor;
- `b`: bending factor;
- `q`: throat-shape factor.

Auxiliary constants:

```text
c1 = (k r0)^2
c2 = 2 k r0 tan(a0)
c3 = tan^2(a)

L = [sqrt(c2^2 - 4 c3 {c1 - (R + r0(k-1))^2}) - c2] / (2 c3)
```

For `0 <= t <= 1`:

```text
x(t) =
  L [sqrt(rho^2 + m^2) - sqrt(rho^2 + (t-m)^2)]
  + b L [sqrt(rho^2 + (1-m)^2) - sqrt(rho^2 + m^2)] t^2

y(t) =
  (1-t^q)
    [sqrt(c1 + c2 L t + c3 L^2 t^2) + r0(1-k)]
  + t^q
    [R + L {1 - sqrt(1 + c3(t-1)^2)}]
```

These are the exact equations on R-OSSE revision 7, PDF page 4. The ST260
regression fixture MUST use the page-7 values:

```text
R=130 mm, r0=12.7 mm, a=39°, a0=7.5°,
k=1.8, rho=0.3, b=0.3, m=0.8, q=3.7
```

The paper's ATH script on page 28 is a second source fixture.

The throat conditions are:

```text
x(0)=0
y(0)=r0
dx/dt|0 = L m / sqrt(rho^2+m^2)
dy/dt|0 = L tan(a0)
dy/dx|0 = tan(a0) sqrt(rho^2+m^2) / m
```

Therefore `a0` is not, by itself, the physical wall launch angle. Horn Studio
records the same correction in `rosseWall` lines 1702–1709. Driver-interface
matching MUST use the parametric derivative, not `tan(a0)`.

The solver MUST preserve `t` ordering through the rollback. `x(t)` can cease
to be monotonic near the mouth, so a global `y(x)` inversion is forbidden
unless monotonicity is proved for that parameter set. `max(x)` and `x(1)` MUST
be reported separately.

The discriminant in the `L` equation MUST be positive and `R>r0`. The result
MUST satisfy finite first and second derivatives throughout `(0,1)` and the
endpoint conditions above. No extra roundover or mouth torus is allowed.

The local implementations are `Horn Studio.html:rosseWall` (lines 1694–1727)
and `engine.js:rosseProfile`, dispatched only by an explicit `family:"rosse"`
through `radialProfile`.

### 4.5 JMLC-compatible axisymmetric

JMLC is not an analytic `r(x)` substitute. The governing expansion is an area
law along the propagated wavefront distance `s`:

```text
m = 4 pi fc / c
S(s) = S0 [cosh(m s/2) + T(s) sinh(m s/2)]^2
```

For constant `T`, `T(s)=T0`. Horn Studio's optional progressive forms are
defined by `makeTfun` (lines 112–118); they MAY be supported only as an
explicit, source-labelled option.

The natural spherical-cap seed used by `jmlcWall` is:

```text
sin(theta0) = r0 m T(0) / 2
Rseed = r0 / sin(theta0)
S0 = 2 pi r0^2 / [1 + cos(theta0)]
```

For a planar seed, `S0=pi r0^2`. See `jmlcWall` lines 120–151.

Exact construction MUST:

1. initialize the selected wavefront seed;
2. advance the complete wavefront along its local normals;
3. solve each increment so the revolved strip area reaches the target
   `S(s+ds)-S(s)`;
4. resample by wavefront arc length without changing endpoints;
5. append the solved wall edge;
6. stop by the averaged local wall direction/end-wall angle, not by a requested
   coverage angle.

Horn Studio implements this march in `jmlcWall` lines 152–245. Coverage is an
analysis result, not a JMLC input. The current MEH bounded foundation correctly
refuses synthesis with `JMLC_WAVEFRONT_MARCH_NOT_IMPLEMENTED` in
`engine.js:jmlcProfile` (lines 610–617). Production MUST continue to refuse
JMLC until the march, area residual, and local-angle stop are implemented and
tested. It MUST NOT substitute OS, an eased cone, or a visual spline.

Native continuation/rollback is achieved by extending the wavefront march to a
larger local wall angle. A generic mouth arc is not JMLC.

## 5. Coverage and finite sizing

The UI MUST distinguish:

- `nominalHalfAngle`: a parameter of a profile equation;
- `geometricWallAngle`: a measured tangent;
- `targetCoverageH/V`: a design objective;
- `verifiedCoverageH/V`: a BEM or measured result.

None of the five laws may set `coverageClaim:true` from geometry alone.

- Conical: the wall angle is geometric, not verified coverage.
- Classic OS, OS-SE, and R-OSSE: their angle parameters are nominal shape
  controls. Verification requires BEM/measurement over a declared band.
- JMLC: coverage is never a synthesis input.

Horn Studio uses the helper
`Dtarget = 2.54e7 / (includedCoverageDeg * f0Hz)` in `osWall` and `osseWall`
to choose a finite mouth. This is a sizing heuristic and MUST be labelled as
such; it MUST NOT be treated as the profile law or a coverage proof.

The current MEH relation
`aspect = tan(covV/2)/tan(covH/2)` in `engine.js:stations` MUST NOT turn H/V
coverage targets directly into an “exact” elliptical or squircle law. It MAY
provide an initial topology estimate only, followed by validity checks and
BEM verification.

## 6. Throat regularity and driver handoff

At every driver/adapter/profile interface, the report MUST evaluate:

- C0 radius/position continuity;
- C1 tangent continuity;
- C2 meridian-curvature continuity;
- minimum wall thickness and absence of a hidden annular step.

R-OSSE revision 7, PDF page 21 (“Throat wavefront mismatch”), explicitly shows
that matching the wall slope of a conical driver duct does not remove the
reflection when curvature is discontinuous. Pages 22–23 show the impedance
effect and a smoothing insert. Accordingly:

- C0 and C1 are hard acceptance requirements;
- C2 mismatch MUST be reported numerically;
- a transition insert MAY be synthesized only as a separately named interface
  component with boundary conditions at both ends;
- a straight tube or cone MUST NOT be silently prepended to “fix” a throat.

The source cap used for analysis MUST match the modeled throat wavefront. The
R-OSSE paper uses a spherical cap corresponding to `a0` on PDF page 8.

## 7. Truncation and mouth treatment

| Family | Native finite-mouth rule | Permitted extra treatment |
|---|---|---|
| Conical | explicit axial or radial truncation | named baffle/roundover only |
| Classic OS | no native finite mouth | large baffle or independently validated blend |
| OS-SE | native steep flat-baffle termination | none by default |
| R-OSSE | `t=1`, including rollback/foldback | none |
| JMLC | local wall-angle stop / additional native sweep | continue the native march |

A mouth treatment MUST declare its own geometry and continuity class. It MUST
not change the law's throat or nominal-angle parameters. A fixed ten-segment
quarter-torus is not a universal termination.

## 8. Rectangular, elliptical, and squircle limits

Classic OS, OS-SE, R-OSSE, and the JMLC construction above are exact only in
their axisymmetric form.

### 8.1 Round

`round` is the only exact topology for these radial laws. A round result may be
revolved directly from the canonical meridian.

### 8.2 Ellipse

An affine section map such as
`(r cos(phi), A r sin(phi))` is an engineering approximation. It changes local
curvature and generally does not preserve the original wavefront or directivity.
It MUST be labelled `engineering-approximation` and verified independently.

Horn Studio's `osWall` can generate separate H/V OS curves and
`profOfBase` routes that through `planeProfilesWN` as an elliptical
engineering form. That code path is evidence for an available approximation,
not proof that a single axisymmetric OS solution remains exact after stretching.

### 8.3 Superellipse/squircle

A superellipse section MAY be used as a topology map:

```text
|y/a|^n + |z/b|^n = 1
```

but it MUST be labelled approximate for the radial families in this contract.
Its exponent is a cross-section parameter and is unrelated to the OS-SE
termination exponent.

The map MUST satisfy:

- `n>=2`;
- positive finite half-axes;
- no section self-intersection;
- positive cross-sectional area;
- monotonic or explicitly declared topology morph;
- bounded change in section curvature between adjacent stations;
- round throat unless a separately modeled, area-preserving throat adapter is
  selected.

### 8.4 Panel/box horns

Hinson-style and other plywood/panel horns are `panel-facets` constructions.
Their planes, seams, throat block, and slot placement are structural and
acoustic geometry. They MUST NOT be presented as a radial R-OSSE, OS, or JMLC
law converted to a rectangle.

## 9. Other documented Horn Studio families

The following families exist in the supplied Horn Studio source and therefore
may be researched without inventing names:

| Horn Studio ID | Source identifier | Status in this contract |
|---|---|---|
| `jmlc` | `jmlcWall` | specified above; synthesis pending in MEH |
| `jmlcell` | `jmlcEllWall` | deferred quasi-elliptical construction |
| `iwata` | `iwataWall` | deferred specialized construction |
| `swh` | `swhWall` | deferred spherical-wave family |
| `tractrix` | `tractrixWall` | deferred |
| `hypex` | `hypexWall` | deferred plane-wave family |
| `conical` | `conicalWall` | supported only when explicit |
| `cd` | `cdWall`, `cdWallRound` | deferred Keele CD construction |
| `biradial` | `araiOptWall` / `araiFinBlockage` | deferred specialized fan |
| `osc` | `osWall` | classic OS specified above |
| `os` | `osseWall` | OS-SE specified above |
| `wn` | `wnWall`, `wnProfile` | deferred William Neile equal-path construction |
| `rosse` | `rosseWall` | R-OSSE specified above |

The dispatch is visible in `Horn Studio.html:computeFamily` lines 2153–2169,
and the user-facing names in `FAMILY_NAMES` line 5361. “Present in Horn
Studio” means implemented in the supplied tool; it does not, by itself, mean
validated for MEH production. Deferred families MUST NOT appear in production
until each receives its own source-backed contract and regression fixtures.

## 10. Why the current two-way radial horns are cone-biased

The renderer is not the primary source of the shape. The current two-way
profile is already cone-biased before rendering:

1. `engine.js:profile` lines 852–868 computes depth from the conical relation
   `(mouthRadius-throatRadius)/tan(covH/2)`.
2. It then sets
   `r = r0 + (R-r0) [0.72 t + 0.28 smoothstep(t)]`, explicitly described in
   code as “mostly conical.”
3. It appends a generic ten-segment quarter-torus rollback.
4. `engine.js:stations` lines 871–883 stretches the same scalar curve by
   `tan(covV/2)/tan(covH/2)` and morphs a superellipse exponent. This conflates
   acoustic law and mouth topology.
5. `twoway-core.js:sectionPoint` lines 247–261 consumes those stations through
   `M.dimsAt`, applies either `panelPoint` or `sePoint`, and adds another
   quintic round-throat morph. It does not solve a radial acoustic law.
6. `shell.html:quickTwoWayShell` lines 870–903 samples `twoWaySectionPoint`;
   `renderTwoWay` lines 993–1028 displays that analytic review shell except in
   raw-print view. Rendering can expose tessellation or shading problems, but
   it inherits the already cone-biased stations.

The four bounded radial foundations are present in
`engine.js:RADIAL_PROFILE_SCHEMAS` and `engine.js:radialProfile` lines
619–625, but the comment at lines 342–346 says they are intentionally not
wired into `profile(S)`. The regression
`radial-profile-foundation.test.mjs` lines 205–229 explicitly preserves the
generic smooth profile as the unselected default.

This architecture, not insufficient tessellation, is why every nominally
radial/curved two-way horn converges toward an eased cone.

## 11. Required implementation sequence

1. Add an explicit `profileLaw` selection with no generic fallback.
2. Make `radialProfile` or a source-equivalent solver return the canonical
   derivative-bearing station contract.
3. Implement the real JMLC wavefront march before enabling JMLC.
4. Replace `profile(S)`'s smooth branch with family dispatch. Unknown,
   incomplete, or invalid families MUST return a refusal, not an eased cone.
5. Refactor `stations` so topology consumes, but never rewrites, the acoustic
   profile.
6. Make `twoway-core` consume one canonical station set for wall, sections,
   mounts, taps, chambers, BEM, and export.
7. Make both `quickTwoWayShell` and the manufacturing worker tessellate the same
   solved geometry; quality settings may change sample density, never shape.
8. Add the acceptance tests below before exposing the controls.

## 12. Testable invariants

### 12.1 Common profile invariants

- Explicit family is required; unknown or missing family is rejected.
- All station values and first/second derivatives are finite.
- `r>0` everywhere.
- Native parameter is strictly increasing.
- The first station is exactly the declared throat.
- No adjacent duplicate station exists within numeric tolerance.
- Increasing sample density converges in position, tangent, curvature, arc
  length, and enclosed volume.
- Preview, export, analysis, and report hashes reference the same canonical
  profile.
- Changing topology, mounting, tap shape, tap count, or driver visualization
  does not change the acoustic-profile hash.
- No family silently receives the generic smoothstep or quarter-torus.

### 12.2 Family regressions

- Conical: exact linear radius, constant first derivative, zero second
  derivative.
- Classic OS: analytic throat/mouth/length, `r'(0)=0`, and formula agreement at
  every sampled station.
- OS-SE: `r(0)=r0`, `r'(0)=tan(a0)`, finite endpoint, and native-termination
  convergence.
- R-OSSE: positive discriminant, page-7 ST260 endpoint fixture, page-28 script
  fixture, `x(0)=0`, `y(0)=r0`, `y(1)=R`, analytic launch tangent, preserved
  `t` ordering, and separate `maxDepth`/`finalAxialX`.
- JMLC: seed-area fixture, area-law residual at every march step, natural-entry
  fixture, local-wall-angle stop, and explicit refusal until the exact march is
  available. Coverage input must be rejected.

### 12.3 Interface invariants

- C0 radius/position error is below manufacturing tolerance.
- C1 tangent mismatch is below a declared angular tolerance.
- C2 curvature mismatch is reported in inverse metres.
- No hidden annular void, reverse wall, or zero-thickness web occurs.
- A throat adapter is a named component with independently testable endpoints.

### 12.4 Topology invariants

- Exact-axisymmetric status is allowed only for `round`.
- Ellipse and superellipse results are labelled approximations.
- Cross-sectional area is positive and continuous.
- Section vertices do not self-intersect.
- Round-to-nonround morph is position- and tangent-continuous and reports its
  start/end stations.
- H/V coverage targets do not silently alter the underlying radial meridian.
- Panel horns never pass through the radial-profile registry.

### 12.5 Coverage and manufacturing gates

- Every coverage value is tagged `nominal`, `target`, or `verified`.
- `verified` requires stored analysis conditions and results.
- Tessellation error is bounded independently of the profile law.
- Normal generation and shading cannot move vertices.
- Shell offset preserves minimum wall thickness and does not introduce a
  throat or mouth discontinuity.
- A failed exact/manufacturing mesh cannot replace the solved analytic profile
  with a different shape.

## 13. Acceptance criterion

The rewrite is complete only when a selected family can be reconstructed from
its reported parameters, its preview/export/BEM paths share the same canonical
profile, and the law remains unchanged while the user changes mouth topology,
mounting system, driver package, or tap geometry. Any state that cannot meet
those conditions must be refused with a specific diagnostic; it must never
fall back to the current eased cone.
