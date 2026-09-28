# Stage-1 monotone profile-law module

Status: implemented and regression-tested. This is an integration contract,
not a claim that a selected profile has verified acoustic coverage.

Production module:

```text
application/v5/profile-laws.js
```

The module itself is intentionally independent of `shell.html`, `engine.js`,
`twoway-core.js`, Three.js, and the DOM. It loads as CommonJS in Node and as
the browser global `MEHProfileLaws`.

## Production integration

`assemble.js` inlines `profile-laws.js` before `engine.js`. CommonJS engine
loads require the same module directly.

For non-coax smooth horns, `engine.js:profile()` requests exactly 49 canonical
stations. The legacy selection therefore preserves all 49 former acoustic-body
coordinates and its 60 mm minimum-depth rule. The old ten-point preview-only
torus after the mouth plane has been removed. `twoway-core.js` already ended
the exact solid at `st.depth`, so preview and exact manufacturing geometry now
share the truthful flat/baffle stop.

The state/UI fields are:

```text
profileLaw:
  conical | classicOS | osse | rosse

OS-SE only:
  osseThroatAngle     degrees
  osseK
  osseS
  osseTerminationN
  osseQ

R-OSSE retained-body construction only:
  rosseThroatAngle
  rosseK
  rosseApexRadiusFactor
  rosseB
  rosseM
  rosseQ
```

`rosse`/`r-osse` retain the exact published native body only while x remains
safely monotone, solve the native outer `R` so that retained endpoint reaches
the requested flat-baffle radius, and report that construction explicitly.
The full native rollback request `rollback-rosse` remains refused because it
requires a parametric surface consumer. An unknown smooth state also refuses;
no law is substituted. Documented angular panel profiles branch before this
selector and remain coordinate-independent of it.

`stations()` copies the canonical law id, label, hash, endpoint
slope/curvature, monotonicity and termination metadata onto the station record.
The two-way solved summary and design report display those same fields.

## Scope

The module solves only an acoustic meridian in the monotone axial domain
`0 <= u <= 1`. All lengths are metres and angles are radians.

It does not read or apply:

- mouth cross-section, Lamé exponent, or aspect;
- lip, bullnose, torus, rollback, or other additional mouth treatment;
- tap, chamber, driver, mounting-plate, shell, or mesh settings.

Those settings can be present on a caller's state object without changing the
profile hash. Native termination that belongs to a profile equation is
reported, but no additional termination geometry is synthesized here.

## Public API

```js
const {
  API_VERSION,
  PROFILE_LAW_SCHEMAS,
  profileLawSchema,
  solveProfileLaw,
  evaluateProfileAt
} = MEHProfileLaws;
```

`PROFILE_LAW_SCHEMAS` and returned records are deeply frozen.

### Supported law ids

| Canonical id | Aliases | Equation/behavior |
|---|---|---|
| `regressionEasedConical` | exact key only | Internal pinned `0.72u + 0.28 smoothstep(u)` regression oracle; not a product law or migration alias |
| `conical` | `cone` | Straight cone |
| `classicOS` | `classic-os`, `os` | Classic oblate-spheroidal meridian |
| `osse` | `os-se` | Batík 2020 OS-SE with its native flat/large-baffle steepening |
| `rosse` | `r-osse`, `r_osse` | Exact Batík 2022 native body retained only to a construction-defined monotone flat-baffle stop |

The OS-SE endpoint factor is bounded to `0.990 <= q <= 0.999`. A value of one
would make endpoint derivatives singular, so it is rejected by this
finite-C2 Stage-1 contract.

### R-OSSE retained-body construction and native-rollback refusal

`rosse` and `r-osse` return a successful monotone record with:

```js
{
  ok: true,
  family: "rosse",
  truncation: {
    mode: "monotone-forward-branch-flat-baffle",
    nativeParameterEnd: Number,
    nativeOuterRadius: Number,
    nativeRollbackIncluded: false,
    axialDerivativeFloorRatio: 0.04
  }
}
```

The retained points are the exact page-4 R-OSSE equation in native t order.
The construction does not sort, flatten, reflect, or substitute another
profile. It stops before the first axial rollback and uses the existing flat
baffle. `rollback-rosse` explicitly returns
`PROFILE_NATIVE_ROLLBACK_UNSUPPORTED`; full R-OSSE still needs a parametric
`P(t,phi)` surface path.

## Solver input

Every call must name a family. Unknown or missing families refuse rather than
falling back.

```js
const profile = MEHProfileLaws.solveProfileLaw({
  family: "osse",
  throatRadius: 0.01778,
  mouthRadius: 0.3048,
  nominalHalfAngle: Math.PI / 4,
  throatHalfAngle: 7.5 * Math.PI / 180,
  k: 1.8,
  s: 0.7,
  terminationExponent: 4,
  q: 0.995,
  samples: 257
});
```

Conical, classic OS, and OS-SE accept either `mouthRadius` or `axialLength`.
Supplying both turns the second value into a consistency assertion. The
internal regression oracle requires `mouthRadius`. The retained R-OSSE
construction requires `mouthRadius`; an optional `axialLength` is only a
consistency assertion because the retained native endpoint determines it.

Sample count is clamped to an odd value from 33 through 4097. It affects the
returned sampled record, not the canonical `profileHash`.

## Successful record

The important integration fields are:

```ts
type Stage1Profile = {
  ok: true;
  version: 1;
  family: "regressionEasedConical" | "conical" | "classicOS" | "osse" | "rosse";
  lawId: string;
  label: string;
  exactness: string;
  source: string;
  nativeDomain: "monotone-axial";
  nativeTermination: string;
  terminationPolicy: string;
  coverageClaim: false;
  inputs: object;
  extent: {
    mode: "mouthRadius" | "axialLength" | "both";
    throatRadius: number;
    mouthRadius: number;
    axialLength: number;
  };
  profileHash: string;
  sampleHash: string;
  sampleCount: number;
  stations: MeridianStation[];
  endpoints: {
    throat: EndpointDiagnostic;
    mouth: EndpointDiagnostic;
  };
  monotonic: { axial: true; radial: true };
  compatibility: {
    compatible: true;
    monotoneAxialConsumer: true;
    requiresParametricDomain: false;
    crossSectionLayer: "orthogonal-not-applied";
    additionalMouthTreatment:
      | "orthogonal-not-applied"
      | "existing-flat-baffle-at-monotone-truncation";
    reason: string | null;
    nativeRollbackIncluded?: false;
  };
  truncation?: {
    mode: "monotone-forward-branch-flat-baffle";
    nativeParameterEnd: number;
    nativeOuterRadius: number;
    nativeRollbackIncluded: false;
    axialDerivativeFloorRatio: number;
  };
  diagnostics: object;
};
```

Each station contains:

```ts
type MeridianStation = {
  u: number;
  x: number;
  r: number;
  dxdu: number;
  drdu: number;
  d2xdu2: number;
  d2rdu2: number;
  slope: number;          // dr/dx
  tangentAngle: number;   // atan2(dr/du, dx/du)
  curvature: number;      // signed meridian curvature, 1/m
  arcLength: number;      // cumulative metres
};
```

`evaluateProfileAt(profile, u)` evaluates the same analytic law at any
normalized parameter without interpolation. It throws for an unsuccessful
record or for `u` outside `[0,1]`.

## Determinism and downstream integration

`profileHash` is built from a fixed 65-probe analytic geometry fingerprint.
It therefore stays invariant when:

- tessellation/sample density changes;
- cross-section/aspect changes;
- mouth treatment changes;
- taps, mounts, or drivers change;
- equivalent mouth-radius and axial-length declarations solve the same curve.

`sampleHash` identifies the selected sampled station record and intentionally
changes with sample density.

A downstream preview, tap planner, exact mesh, export, and report should all
carry the same `profileHash`. A consumer must refuse a profile when
`ok !== true`, `compatibility.monotoneAxialConsumer !== true`, or either
monotonic flag is false.

Stage-1 integration should pass `stations` or use `evaluateProfileAt`; it
should not independently reconstruct one of these equations.

## Regression coverage

Focused test:

```text
qa/node/profile-laws-regression.test.mjs
```

Run with:

```sh
npm run qa:profile-laws
```

The test covers the exact internal regression oracle, conical and classic-OS analytic
derivatives, OS-SE endpoint/throat constraints, finite C2 diagnostics,
equivalent-extent hashes, orthogonal settings, browser loading, deterministic
repeated solves, validation bounds, exact retained-body R-OSSE, and explicit
native-rollback refusal.

The five-source equation/provenance library, stricter distinction between
published domains and production guards, and source-to-test matrix are in
`ath-source-math.js` and `docs/ath-source-math-audit.md`. Their parity
regression is `qa/node/ath-source-math.test.mjs`.
