# Build 650 R-OSSE / OS-SE control parity

Status: implementation and refusal contract.

This audit compares the supplied
`/Users/marwan/Downloads/Horn Studio.html` with the controls and geometry that
MEH Studio v5 actually owns. It is deliberately stricter than visual parity:
a dial is counted as implemented only when it changes the canonical geometry
used by the planner and exact mesh, or when it performs one explicitly named
sizing operation. Disabled controls remain visible where that is useful, with
the reason they cannot yet be admitted.

## The three independent layers

The source drawer combines three kinds of parameter that MEH Studio keeps
separate:

1. **meridional profile law** — conical, classic OS, monotone OS-SE, or the
   retained monotone forward body of R-OSSE;
2. **cross-section topology** — ellipse, Lamé superellipse, or an exact
   straight-side / circular-fillet rounded rectangle;
3. **mouth sizing / termination** — driver throat, requested mouth, flat
   baffle, or a future validated rollover.

Changing a cross-section must not silently become a different radial law.
Likewise, a requested pattern-control frequency sizes an aperture; it is not
an extra curvature term and it is not a measured directivity claim.

## Parity and validity matrix

Legend:

- **effective** means the setting reaches the canonical station geometry;
- **sizing** means it intentionally changes the requested mouth before the
  normal packaging solve;
- **derived** means the value is measured from the solved geometry;
- **refused** means MEH Studio does not approximate or silently substitute it.

| Horn Studio control | Horn Studio role | MEH v5 before Build 649 | Build 649 UI / effect | Contract status |
|---|---|---|---|---|
| Profile family | Selects OS-SE, classic OS, R-OSSE, etc. | Conical, classic OS and OS-SE were selectable; R-OSSE was disabled | Conical, classic OS, OS-SE and R-OSSE are geometry-effective. R-OSSE retains the published forward body and terminates at the existing flat baffle before native rollback | Valid for smooth monotone geometry. Native rollback is not included. No coverage claim |
| Throat shape | Round or rectangular source interface | Round compression-driver throat was implicit | Read-only **round / driver-owned** interface is shown. Rectangular throat remains an adapter/topology problem, not a profile-law dial | Round is the only exact axisymmetric source for these laws |
| Throat diameter | `throatD`, or area-equivalent rectangular throat | Selected CD already owned `td` / `throat` and the actual bore | Actual solved diameter is displayed but cannot fight the selected driver record | Geometry-effective and contract-valid as driver-owned input |
| H coverage | Nominal OS / OS-SE angle and Keele-width sizing input | Existing H coverage slider fed `nominalHalfAngle` | Existing control remains effective and is echoed in the advanced drawer | A geometric/nominal angle, **not verified acoustic coverage** |
| V coverage | Per-plane engineering stretch in Horn Studio | Existing V coverage slider set the MEH section aspect | Existing control remains effective and is echoed in the advanced drawer | Engineering topology approximation; not exact axisymmetric OS/OS-SE |
| Pattern control `f0` | Solves Keele aperture width | Only the achieved H/V floors were reported after solve | An explicit target plus **SIZE MOUTH TO TARGET** action computes the minimum requested width, then uses the normal packaging solver. Impossible targets above the mouth cap refuse without changing state | Valid as an aperture-sizing target only; not a curvature or BEM result |
| `a0` throat half-angle | OS-SE or R-OSSE launch tangent | `osseThroatAngle` existed and was effective | Separate `osseThroatAngle` and `rosseThroatAngle` owners are shown only with their selected family | OS-SE: `0–25°`; R-OSSE: `0–20°`; each forces a complete re-solve |
| `K` throat expansion | Redistributes near-throat expansion | `osseK` existed and was effective | Separate `osseK` and `rosseK` owners prevent cross-family aliasing | Valid within `0.5–4`; forces a complete re-solve |
| `S` termination flare | Strength of OS-SE native terminal steepening | `osseS` existed and was effective | Kept | Valid within `0–2`; not an added mouth roll |
| `N` termination exponent | Shapes OS-SE native termination | `osseTerminationN` existed and was effective | Kept | Valid within `2–8`; distinct from Lamé section exponent |
| OS-SE endpoint `q` | Keeps the finite endpoint differentiable | `osseQ` existed as `0.990–0.999`, but the short “Q” label could be confused with R-OSSE `q` | Relabelled **Qe endpoint factor** with an explicit distinction | Effective and finite-C2 within `0.990–0.999` |
| Section family | Ellipse, Lamé superellipse, rounded rectangle | Ellipse and Lamé were effective; rounded rectangle was disabled | All three are now exact end-to-end. Rounded rectangle uses one shared straight-side/circular-corner boundary for stations, normals, offsets, tap conformity, preview, exact SDF and export | Exact geometric section; non-round use of an axisymmetric law is an engineering approximation |
| Lamé exponent | Cross-section squareness | Existing `seN` control was effective | Kept | Valid section parameter; it is not OS-SE `N` |
| Rounded-rectangle corner roundness | Exact corner radius relative to the minor half-axis | Disabled with the family | Exposed as `R / min(a,b)` in `0.05–1.00`; the station radius is always legal and morphs monotonically/C1 from a fully rounded throat-side section to the selected mouth value | Geometry-effective. This is not a high-`n` Lamé approximation |
| H/V aspect | Independent Horn Studio stretch | MEH derived it from `tan(V/2)/tan(H/2)`; there was no independent dial | Solved aspect is displayed as **coverage-derived**. Independent aspect stays refused until an area-preserving morph and packaging contract are canonical | Derived geometry is effective; an independent second owner would over-constrain the current model |
| Mouth wrap / rollover radius | Additional termination surface in Horn Studio | Two-way exact geometry stopped at a flat baffle; the old generic preview torus was removed | Flat/native baffle state is displayed. Generic wrap and arbitrary radius stay disabled | Correct refusal: preview and exact mesh must share one validated termination |
| R-OSSE apex-radius factor `r` | Sets the axial apex-radius term | Not exposed | Numeric `rosseApexRadiusFactor`, default `0.3` | Geometry-effective within `0.05–1` |
| R-OSSE `B` bending | Bends the published parametric body | Not exposed | Numeric `rosseB`, default `0.3` | Geometry-effective within `0–1` on the retained forward branch |
| R-OSSE `M` apex shift | Positions the parametric apex | Not exposed | Numeric `rosseM`, default `0.8` | Geometry-effective within `0.4–0.98` on the retained forward branch |
| R-OSSE `Q` throat shape | Blends the OS and terminal R-OSSE branches | Not exposed | Numeric `rosseQ`, default `3.7`, explicitly distinct from OS-SE `Qe` | Geometry-effective within `2–8`; native rollback remains excluded |
| R-OSSE outer `R` | Sets the final radial scale | Existing mouth width already owned scale | Not added as a second dial | Correctly derived from requested mouth topology |
| Meridian sketch | Visual witness that profile controls affect geometry | Main camera auto-fit could hide profile-law differences | Fixed physical-scale selected meridian plus a faint endpoint-matched conical chord, profile hash and depth; all points come directly from solved stations | Geometry witness only; no acoustic claim |

## Pattern-control sizing equation

The advanced drawer reverses the same Keele aperture diagnostic already used
by the solved report:

```text
d_required = 25306 / (coverage_degrees * f0_hz)      metres
```

The horizontal requirement is a width. The vertical requirement is converted
back to the current horizontal mouth request through the engine's
coverage-derived aspect. The larger requirement wins:

```text
aspect = tan(V/2) / tan(H/2)
W_required = max(
  25306 / (H * f0),
  [25306 / (V * f0)] / aspect
)
```

The result is rounded upward to the mouth slider resolution. It then enters
the normal Smart Adapt / packaging solve; driver, tap, mount and wall
containment are not bypassed. If the target requires more than `mouthCap`, the
operation refuses with `PATTERN_TARGET_EXCEEDS_MOUTH_CAP` and leaves the
current design unchanged.

The achieved floors shown after solve use the actual acoustic mouth:

```text
fH = 25306 / (H * W_actual)
fV = 25306 / (V * H_actual)
```

These are aperture estimates, not BEM or measured beamwidth.

## One-way coax boundary

The one-way coax throat, apex, tap ring and driver-sized circular handoff are a
protected driver-fit subsystem. The advanced drawer must not apply the
two-way law directly through that region.

The Build 649 post-handoff join solver now proves:

- exact C0 radius at the fixed circular handoff;
- bounded C1 tangent mismatch;
- declared C2 curvature mismatch;
- positive axial/radial monotonicity for every downstream station;
- mount, tap and wall containment after the changed outer profile;
- one shared preview/exact profile identity.

Advanced post-handoff sizing is enabled only when those C0/C1/C2 checks pass
for the selected state. If they fail, the state is unchanged and the drawer
shows the refusal. Independent aspect and generic rollover remain disabled.
R-OSSE parameters may shape the downstream retained forward body, but the UI
never flattens or sorts native rollback into the protected axial branch.

## Source mapping

Relevant supplied-Horn-Studio identifiers:

- settings/defaults: `PARAMS`, `FAMILY_DEFAULTS`, `S`;
- OS-SE: `osseWall`;
- classic OS and Keele sizing: `osWall`;
- native rollback: `rosseWall`;
- section/aspect morph: `planeProfiles`;
- rollover: `flareSweepFor`, `flareArc`, `surfaceFrameLip`.

Relevant MEH identifiers:

- monotone laws: `profile-laws.js`;
- profile dispatch and station geometry: `engine.js:profile`,
  `engine.js:stations`;
- UI and solved diagnostics: `shell.html:paintProfileLawUI`,
  `shell.html:paintProfileAdvancedUI`;
- focused contract tests:
  `qa/node/profile-control-parity.test.mjs`;
- rounded-section analytic and production-solid gate:
  `qa/node/rounded-rectangle-section.test.mjs`.
