# Frozen front-air geometry for local FEM

Input editor SHA-256: `418b696f270e270a909142861b95b40ee6db6017bae6e38da0ae3e55e2a005e5`, explicitly marked READY by parent. `editor-418b696f.html` is the verified frozen copy. `user-study.json` is an unchanged copy of the user's saved study; its hash is included in every export. `extract-air.cjs` reproduces the extraction and rejects a changed parent editor fingerprint.

The mesher inputs are `inserted-air.json` and `open-air.json`. Keys:

- `vertices_m`: local `[u,v,z]` points in meters.
- `faces`: outward-oriented triangle vertex indices.
- `face_tags`: 1 rigid wall, 2 active cone surrogate, 3 artificial horn-side interface.
- `cone_axis`: `[0,0,1]`, mounting plane toward magnet, so the cone's outward-air-normal axial projection is positive. Cone motion toward the horn is negative local z.
- `metadata`: state, source hashes, geometry hash, frame, limits, volumes, areas and construction notes.

`*-rings.json` preserve the exact canonical air-side ring chains in local SI coordinates. `extraction-report.json` contains the checks and areas in readable form. These are geometry artifacts, not acoustic results.

| Check | Inserted | Open collector |
| --- | ---: | ---: |
| Canonical rings × vertices | 52 × 128 | 27 × 64 |
| Closed air surface vertices | 6,786 | 1,794 |
| Triangles | 13,568 | 3,584 |
| Air volume (cm³) | 200.391896078 | 297.028042082 |
| Editor nominal air (cm³) | 199.231897628 | 295.972532428 |
| Driven projected area (m²) | 0.01319469958 | 0.01317880599 |
| Relative error from Sd=0.0132 m² | −0.040155% | −0.160561% |

Both exports pass edge incidence exactly two, opposing face winding, connected shell, positive signed volume and nonzero finite face area. Global surface-intersection certification is not claimed; the mesher must reject any bad PLC/tetrahedra. Canonical wall diagonals are unchanged. The cone and rigid mounting annulus are explicit new **air closures**, not decorative driver meshes. Both use the same analytical cone surrogate; their angular tessellation follows the respective canonical rim and therefore has the small projected-area differences above.

The interface is a nonplanar star fan from the exact horn-cut perimeter to P. Its projected triangles have consistent positive orientation and no projected overlap. This preserves the curved perimeter and whole tube, but the fan interior is a declared interface approximation rather than the exact horn-wall patch. Root axial depth varies by 2.572129592 mm, so this exact local domain is not axisymmetric about the mid axis.

The volume differences are fully accounted for:

- Inserted: curved-root fan contributes +1.195334573 cm³ against a flat nominal root; polygonal cone gives −0.035336123 cm³ versus the analytical cone. Net +1.159998450 cm³.
- Open: curved-root fan contributes +1.196803067 cm³; polygonal cone gives −0.141293413 cm³. Net +1.055509654 cm³.

Flattening only the root to P makes each exported volume agree with the editor volume plus the independently calculated polygonal-cone deficit to about 1e−9 cm³. No volume scaling was applied.

The user's actual insert opening is 91.001607608 mm equivalent diameter; equivalent piston radius is 64.820448144 mm. Tessellation adds at most 0.370236935 mm of conservative axial clearance. For this large opening, changing center relief from 8 mm to 0 produces identical insert vertices: the relief ceiling does not intersect the remaining insert material.

The two cases differ in input state only through `frontFiller='offset'` versus `'none'`. The user study records 1 V RMS in acoustic settings and 2.83 V RMS in the separate wizard brief; likewise state lowTarget=200 Hz versus brief lowHz=100 Hz. The acoustic prototype should declare its chosen drive and sweep band explicitly.
