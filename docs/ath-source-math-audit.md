# ATH source math audit

Status: source extraction, focused library, provenance retention, and
regression coverage complete.

## Audit boundary

This audit covers the exact five-file set supplied for the work:

1. `research-sources/ATH/OS-SE Waveguide.pdf`
2. `research-sources/ATH/Ath-AP1.pdf`
3. `research-sources/R-OSSE Waveguide rev7.pdf`
4. `research-sources/ATH/ATH - Advanced-Transition Horns.html`
5. `research-sources/ATH/ATH - Segmentizing a horn.html`

All 11 OS-SE pages, all 10 AP1 pages, and all 28 R-OSSE pages were rendered
and visually inspected. PDF text extraction was used only as a searchable
aid; equations and plot/script labels were checked against the rendered
pages. Both HTML files were read in full from their preserved source.

Exact file bytes and SHA-256 identities are recorded in
`research-sources/ATH/MANIFEST.md`. The supplied R-OSSE PDF was already in the
transfer tree with the same SHA-256 and was not duplicated.

## Implementation outcome

The focused, browser/CommonJS-safe source layer is:

```text
application/v5/ath-source-math.js
```

It exposes:

- immutable `SOURCE_PROVENANCE`, with SHA-256 and page/section locators;
- immutable `PARAMETER_CATALOG`, separating source-stated domains from
  library guards;
- immutable `PUBLISHED_FIXTURES`, including plot values, scripts, comparison
  cases, and the preserved Segmentizing conflict;
- immutable `EQUATION_CATALOG`, classifying each item as a published equation,
  analytic derivation, standard derived construction, statement-only item, or
  observational source;
- pure equation evaluators with no DOM, mesh, driver, baffle, or application
  state dependency;
- fail-closed input domains: invalid inputs throw an `ATHMathDomainError`
  carrying a stable `code`; no input is clamped and no family is substituted.

Angles are radians. Every length-bearing call uses one consistent unit; MEH
Studio callers use metres. Published millimetre fixtures are converted only
at test call sites.

The focused regression is:

```text
application/v5/qa/node/ath-source-math.test.mjs
```

It is part of quick, plan, and release test tiers, and has the dedicated npm
script `qa:ath-source-math`.

## Source-to-library coverage matrix

`PASS` means an exact published coordinate equation or invariant has a public
symbol and regression. `DERIVED` means the source states the construction but
does not print that exact helper equation; it is labelled as derived rather
than published. `CATALOG` means the source does not contain enough mathematics
to claim a solver.

| Source equation or statement | Library symbol | Regression | Status |
| --- | --- | --- | --- |
| OS-SE p.2 notation `[x,y,z]=[r,phi]|z`, `r(z,phi)` | `PARAMETER_CATALOG.osse` | provenance/catalog immutability | CATALOG - coordinate convention |
| OS-SE Eq. (1), pure OS | `pureOSRadius` | “published OS equations…” | PASS |
| OS-SE Eq. (2), shifted OS | `shiftedOSRadius` | “published OS equations…” | PASS |
| OS-SE Eq. (3), generalized OS | `generalizedOSRadius` | “published OS equations…” | PASS |
| OS-SE published `k=0` conical limit | `generalizedOSRadius` | exact conical invariant | PASS |
| OS-SE p.5 additive `r=rGOS+rTERM`, `0<=z<=L` | `osseRadius` | throat/endpoint and production parity | PASS |
| OS-SE p.6 implicit superellipse | `superellipseQuadrantOffset` | translated implicit invariant | PASS |
| OS-SE p.6 translated solved quadrant | `superellipseQuadrantOffset` | launch/full-quadrant endpoints | PASS |
| OS-SE p.6 `a=L`, `b=sL` specialization | `superellipseQuadrantOffset` | Figure-5 fixture | PASS |
| OS-SE Eq. (4), truncated termination | `osseTerminationOffset` | Figure-5 and `q=1` endpoints | PASS |
| OS-SE Eq. (5), combined profile | `osseRadius` | Figure-5 fixture and profile-law parity | PASS |
| OS-SE p.10 fixed branch of morph | `morphRadius` | fixed-region/start continuity | PASS |
| OS-SE p.10 active morph branch | `morphRadius` | target-mouth endpoint | PASS |
| OS-SE p.10 `rm(0)=r0`, `rm(L)=rM` | `morphRadius` | endpoint invariants | PASS |
| R-OSSE p.4 `c1,c2,c3,L` | `rosseConstants` | ST260 constants and `L` | PASS |
| R-OSSE p.4 `x(t)`, `0<=t<=1` | `rossePoint` | ST260 five-point fixture | PASS |
| R-OSSE p.4 `y(t)`, `0<=t<=1` | `rossePoint` | ST260 endpoints/five points | PASS |
| R-OSSE native rollback (`max(x)` differs from `x(1)`) | `rossePoint` | ST260 apex/depth rollback invariant | PASS |
| R-OSSE throat `dx/dt`, `dy/dt`, `dy/dx` | `rosseThroatInvariants` | ST260 analytic throat fixture | PASS - analytic derivation |
| AP1 p.6 `M(x)=AM sin(pi*x^Sk)^Sh` | `meanderValue` | endpoints and analytic peak | PASS |
| AP1 pp.5-6 cubic-Bézier centerlines | `EQUATION_CATALOG.espEqualLength` | source catalog | CATALOG - no Bézier solve equation printed |
| AP1 pp.6-7 iterative equal-length amplitude | `EQUATION_CATALOG.espEqualLength` | limitation catalog | CATALOG - iteration not published |
| AP1 p.7 exponential channel-area growth | `exponentialAreaAt` | endpoints/geometric midpoint | DERIVED - source states exponential growth but prints no interpolation equation |
| Segmentizing Eq. (1), straight chord target | `segmentChordRadius` | both edges and midpoint | PASS |
| Segmentizing Eq. (2), windowed weighting | `segmentWeight` | window endpoints/outside/peak | PASS |
| Segmentizing published peak `tm` | `segmentWeightPeak` | `t0=0,t1=.8,zeta=.75` | PASS |
| Segmentizing Eq. (3), transformed radius | `segmentizedRadius` | exact target and zero-weight invariants | PASS |
| Segmentizing `rS=r(tm)` option | `segmentReferenceRadius("edge-preserving")` | reference-mode regression | PASS |
| Segmentizing `rS=r(tm)/cos(thetaS/2)` | `segmentReferenceRadius("center-preserving")` | preserved midpoint regression | PASS |
| Segmentizing geometric-mean `rS` | `segmentReferenceRadius("geometric-mean")` | squared-product invariant | PASS |
| Segmentizing Eq. (4), alternative target | `segmentAlternativeTarget` | Fig.7 midpoint/end behavior | PASS |
| Extended-throat observations | `EQUATION_CATALOG.extendedThroat` | provenance/catalog immutability | CATALOG - no general equation published |

## Published examples and fixtures retained

### OS-SE

- Fig.1: `r0=12.7 mm`, `a=45 deg`.
- Fig.2: `r0=12.7 mm`, `a=45 deg`, `a0=15 deg` (30-degree
  included throat angle).
- Fig.3: `r0=12.7 mm`, `a=45 deg`, `a0=0`, and
  `k={0.1,1,2,4,8}`.
- Fig.4: `L=120 mm`; the caption does not print the remaining parameters.
- Fig.5: `a=45 deg`, `a0=0`, `k=1`, `L=120 mm`, `q=.998`,
  `s=.8`, `n=5`. The title does not repeat `r0`; the retained fixture marks
  `12.7 mm` as an inference from the preceding sequence and plotted throat
  intercept.
- Fig.6 uses `s={.25,.5,.75,1,1.5}`.
- Fig.7 uses `n={2,3,5,10}`.

### ATH AP1

The complete page-3 ESP script values are retained in
`PUBLISHED_FIXTURES.espDemo`: the 64 mm OS-SE waveguide, its
`k/L/s/n/q` values, rollback settings, the `Dt/At/Ae/L` ESP values, two input
vane positions, `Sk=.65`, control-point arrays, tip angle, wall thickness, and
mesh values.

The source does not give the solved meander amplitudes, the omitted/default
`Sh` value for this script, the iterative equal-path algorithm, or a complete
non-overlap boundary solve. The library therefore does not claim to reproduce
the complete illustrated ESP from the script alone.

### R-OSSE revision 7

The page-7 and page-28 ST260 approximation is retained once:

```text
R=130 mm, r0=12.7 mm, a=39 deg, a0=7.5 deg,
k=1.8, r=.3, b=.3, m=.8, q=3.7
```

The equation regression obtains:

```text
L        = 166.23768892241927 mm
x(1)     = 57.46698478091665 mm
max x    ~= 77.700916 mm at t ~= .73323
y(1)     = 130 mm
```

This agrees with the source’s 260 mm overall diameter and “slightly less than
80 mm” maximum depth, while also proving why `x(1)` and `max(x)` cannot be
conflated.

The source comparison cases are retained: `a0={0,7.5,15 deg}`, doubled
`R=260 mm`, `k={.5,1,2,4}`, `r0={12.7,18,25 mm}` with `R=260 mm`,
conical driver ducts `{0,10,20,40 mm}`, and the qualitative ring-insert case.
No BEM response is turned into a geometry or acoustic promise.

### Segmentizing

The base R-OSSE example, 60-degree sector, approximately 64 mm reference
radius, Fig.3 `zeta/kappa` sweeps, the three `rS` choices, and Fig.7
`mu=nu=1, delta=-20 mm` are retained.

### Extended throat

The retained observational fixture names the ATHEX 460-36, 6-degree entry,
Peerless DFM-2535R00-08, and roughly 100 mm 1-inch-to-1.4-inch adapter. It is
explicitly marked observational and does not create a sizing law.

## Existing profile-law comparison

### Exact matches

- `profile-laws.js::classicOS` matches OS-SE Eq. (1).
- `profile-laws.js::osse` matches OS-SE Eq. (5), including its analytic first
  and second derivatives. The new parity test evaluates both libraries at the
  same coordinates.
- `profile-laws.js::rosse` evaluates the exact R-OSSE page-4 formula on every
  retained native point. The new parity test checks both x and radius.

### Deliberate production constructions

These are not publication domains and must not be cited as such:

- production OS-SE angle, `k`, `s`, `n`, and `q` bounds;
- the production requirement `q<1`, which keeps endpoint derivatives finite;
- production R-OSSE `k/r/b/m/q` bounds;
- the R-OSSE `dx/dt` floor of `.04`;
- solving a native R-OSSE `R` so a pre-rollback point reaches a requested
  flat-baffle mouth radius.

The current production R-OSSE result is accurately described as an exact
retained native body plus a construction-defined flat-baffle truncation. It
is not the source’s complete `t in [0,1]` free-standing rollback.

The focused source library intentionally allows published coordinate cases
that the production finite-C2 consumer refuses, most notably OS-SE `q=1`.
Production refusal remains correct for that consumer; the source coordinate
formula and the stricter consumer domain are represented separately.

### Missing before this audit

The following general source equations did not previously have a focused
public library owner:

- shifted/generalized OS as standalone evaluators;
- translated superellipse quadrant as a standalone evaluator;
- published OS-SE mouth morph;
- AP1 meander;
- Segmentizing equations (1)-(4), its peak, and its `rS` options.

They now live in `ath-source-math.js`. No engine integration was added for
morphing, ESP synthesis, or segmentized manufacturing geometry.

## Stated limitations preserved

- Pure OS is infinite and needs an explicit finite termination.
- OS-SE is a flat/large-baffle construction. A free-standing OS-SE requires a
  separately solved rollback; the paper does not provide a simple analytic
  clothoid continuation.
- OS-SE morph `gamma=1` has an abrupt slope change at `zf`.
- R-OSSE is natively parametric and can fold back; sorting it into `y(x)` is
  forbidden.
- R-OSSE wall-slope matching alone can retain a wavefront/curvature mismatch
  at a conical driver exit. The paper’s ring insert is a concept, not a
  published insert-geometry law.
- AP1 equal-path meander amplitudes and fabricable, non-overlapping channel
  expansion are solved iteratively, but the complete algorithms are not
  published in the note.
- AP1 channel area must be treated in three dimensions; apparent narrowing in
  a 2-D section does not imply decreasing revolved wavefront area.
- The extended-throat article says the driver/extension interaction is not
  clear and reports no cylindrical or narrowing-duct experiments. Its
  statement that those ducts may work is not treated as evidence or a law.
- Segmentizing applies to an axisymmetric source surface one sector at a time.
  This library further restricts the chord helper to `0<thetaS<pi`, the domain
  where Eq. (1) is a finite, single-valued positive radial graph.

## Source discrepancies and decisions

### 1. Segmentizing Fig.4 parameter conflict

The article prints `t0=.8`, `zeta=.75`, and `tm≈.32`. The published equation

```text
tm=t0+(t1-t0)/2^(1/zeta)
```

cannot produce `.32` from `t0=.8` with a valid `t1>t0`. It produces
`tm=0.3174802104` for `t0=0`, `t1=.8`, `zeta=.75`.

Decision applied: preserve the equation as canonical, retain both the printed
and equation-consistent records, and do not guess an undocumented erratum.

### 2. OS-SE `q=1` versus smooth endpoint

The paper lists a typical `q` range of `.99-1.00` and earlier describes a
smoothly blended/differentiable curve. At `q=1`, the translated
superellipse-quadrant coordinate is finite, but its slope at `z=L` is
singular for `n>1`.

Decision applied: the source math accepts `q=1` for coordinate evaluation and
labels the endpoint limitation; the production finite-C2 profile continues
to require `q<1`.

### 3. Full R-OSSE versus monotone production consumer

The paper’s complete free-standing curve uses all `0<=t<=1`. The current
production cross-section consumer requires monotone x, so it retains only a
native prefix and terminates it at an existing flat baffle.

Decision applied: preserve and test the full native equation in the source
library; preserve the production truncation as a separately named
construction. A full rollback surface still requires a parametric surface
consumer and is not authorized by this audit.

### 4. AP1 exponential area helper

AP1 states that each channel’s wavefront area grows exponentially from its
input value to its output value but does not print the interpolation formula.

Decision applied: expose the unique standard endpoint interpolation
`A(u)=A0 exp(u ln(A1/A0))` only as
`standard-construction-derived-from-source-statement`, never as a verbatim
published equation.

### 5. No extended-throat design law

The extended-throat HTML reports experiments and explicitly states unresolved
driver interaction and missing comparison experiments.

Decision applied: retain provenance, parameters, and limitations only. No
acoustic, length, expansion, or resonance law is synthesized.
