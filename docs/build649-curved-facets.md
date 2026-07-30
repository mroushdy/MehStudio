# Build 649 P15 — developable curved facets

Status: implementation contract.

The photographed horn is consistent with a rectangular four-face horn whose
faces curve in the axial direction, but a photograph does not identify its
profile equation. MEH Studio therefore does **not** label that object OS,
OS-SE, R-OSSE, or claim to reproduce it. Build 649 admits the construction
class under the product name **CURVED FACETS**.

This form is distinct from both existing forms:

- **SMOOTH** maps a selected meridian onto one continuous ellipse,
  superellipse, or filleted-rectangle surface.
- **CLASSIC ANGULAR** is the sourced flat-panel construction. Its axial face
  laws are affine/piecewise-affine and its profile selector does not invent a
  curved substitute.
- **CURVED FACETS** consumes the selected admitted conical, Classic OS, or
  monotone OS-SE station ladder, but keeps an exact rectangular section and
  four intentionally sharp corner seams.

## Canonical surface

At axial coordinate `x`, the solved station supplies horizontal and vertical
half-extents `a(x)` and `b(x)`. The four inner acoustic faces are:

```text
top(x,u)    = [x, u a(x),  b(x)]
bottom(x,u) = [x, u a(x), -b(x)]
right(x,u)  = [x,  a(x), u b(x)]
left(x,u)   = [x, -a(x), u b(x)]        -1 <= u <= 1
```

The four seam curves are the shared corner loci
`[x, ±a(x), ±b(x)]`. Adjacent faces must return bit-identical seam
coordinates. Normals are deliberately discontinuous across a seam; smoothing
them would turn a construction joint into a cosmetic rounded corner.

The profile-law record and hash are owned upstream. Changing SMOOTH to CURVED
FACETS must not change the admitted meridional stations or their profile hash.
Conical `a(x), b(x)` degenerates to planar faces. Classic OS and OS-SE produce
nonlinear axial face curvature.

## Manufacturability

Each admitted face is a generalized cylinder:

```text
top/bottom: [x, y, ±b(x)]
left/right: [x, ±a(x), z]
```

One principal curvature is zero, so Gaussian curvature is zero away from the
four seams. The faces are developable and have an exact flat pattern:

- top/bottom use meridian arc coordinate
  `s_b(x) = integral sqrt(1 + b'(x)^2) dx`, bounded laterally by
  `±a(x)`;
- left/right use
  `s_a(x) = integral sqrt(1 + a'(x)^2) dx`, bounded laterally by
  `±b(x)`.

Conical faces may be cut from flat sheet directly. Nonlinear faces require
single-axis forming (bent/laminated/kerfed sheet) or printing; they are not
ordinary flat CNC panels. The report must say **DEVELOPABLE — SINGLE-AXIS
FORMING REQUIRED** and provide face flat-pattern bounds. It must refuse a
flat-sheet/no-forming export when face chord deviation exceeds 0.25 mm.

This P15 implementation intentionally does not add across-face bow. A surface
with both axial and transverse curvature would normally be double-curved,
non-developable, and print/mould-only. If later evidence establishes that
construction, it needs a separate topology and Gaussian-curvature gate.

## Wall and seam construction

Wall thickness is measured normal to each face profile. The top/bottom offset
uses the normal offset of `b(x)`; the left/right offset uses the normal offset
of `a(x)`. Adjacent offsets meet at an exact mitered seam. Adding wall
thickness to a radial distance is not an acceptable substitute on a steep
face.

The circular compression-driver exit may retain the existing bounded C2
round-to-section morph. Four facet seams begin only at that morph's registered
rectangular handoff. Taps, mount lands, and cutters consume the finished
curved-facet surface and may not move the profile stations.

## One geometry path

One boundary law must own:

1. station section points and inverse parameters;
2. analytic face normals and normal offsets;
3. tap and mount placement;
4. the quick production preview;
5. exact solid membership and cut projection;
6. STL/export triangulation and flat-pattern reports.

The perimeter parameter places the four corners at fixed quarter-cycle seam
indices. Preview and export may use different axial tessellation densities,
but every vertex must be evaluated by the same canonical boundary function.

## Fixed-camera distinction gate

Browser QA adds a `--wall-topologies` inspection mode. It renders the same
driver, mouth, coverage, wall, and admitted profile in:

1. SMOOTH / Lamé;
2. CLASSIC ANGULAR;
3. CURVED FACETS.

The camera transform, projection, clipping, viewport, lighting, and world
scale are fixed. The manifest records state fingerprints, profile hashes,
image hashes, and pairwise pixel mismatch. The gate requires:

- three non-identical image hashes;
- SMOOTH and CURVED FACETS to share the profile hash;
- CURVED FACETS to report exactly four seam curves;
- a nonlinear Classic-OS fixture to exceed 0.25 mm face chord deviation;
- conical CURVED FACETS to remain planar within 0.01 mm;
- the curved-facet preview and exact/export boundary witnesses to agree within
  0.05 mm.

These tests distinguish construction topology. They are not acoustic
validation; BEM and prototype polar measurements remain necessary.
