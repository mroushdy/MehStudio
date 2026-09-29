# RCF ND950 STEP metadata and analytic-feature inspection

Independent read-only inspection, 2026-09-29. This audit parses the downloaded STEP entities; it does not import, heal, tessellate, or validate the full BREP with a CAD kernel. The existing catalogue's earlier OpenCascade/CadQuery inspection is historical evidence and is not repeated here. No large packages were installed; OCP, pythonOCC, CadQuery, trimesh, and gmsh were unavailable in the current bundled Python environment.

## Provenance and model identity

- Manufacturer product page: `https://www.rcf.it/en/products/product-detail/nd950-1.4`.
- Official downloaded archive: `manufacturer-sources/rcf/ND950-1.4/LINE ART 3D-ND950 1.4.zip`.
- ZIP SHA-256: `7cf3ab2f00bc79fd8ed74c167dbc7992642300c289b20405c99516ebb25f1c8f`.
- Extracted, unchanged member: `manufacturer-sources/rcf/ND950-1.4/cad/nd950.stp`, 7,985,478 bytes.
- STEP SHA-256 independently calculated: `4c137285191eeaf51f951a7b96e6c4149e5cbf1db10f1d1aee09cd1c12aa1242`.
- `FILE_NAME('ND950','2022-04-08T10:36:32',...)`; producer `CREO PARAMETRIC BY PTC INC, 2019352`.
- File schema: `AP242_MANAGED_MODEL_BASED_3D_ENGINEERING_MIM_LF`.
- Entity `#105481=PRODUCT('ND950','ND950','NOT SPECIFIED',...)`; product formation `#105482` identifies version `1` / `LAST_VERSION`. Product shape description is `SHAPE FOR ND950.`.

The official page association and archive filename establish that RCF supplies this file for the ND950 1.4 product. The internal STEP product/header does not independently spell out the 1.4-inch or impedance variant, and the generic version label is not a manufacturing revision. Keep both statements explicit: this is manufacturer-supplied CAD associated with the exact product page, while the file's internal model name is only ND950. The extracted member and ZIP must have separate paths/hashes; a STEP source must not reuse the ZIP hash.

## Native units: inches, not millimetres

The model's global representation context `#105466` assigns length unit `#105460`, which is `CONVERSION_BASED_UNIT('INCH',#105459)`. The conversion measure is `#105459=LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(25.4),#105458)`, and `#105458` is an SI millimetre unit. Thus **raw Cartesian coordinates and radii are inches; multiply by 25.4 to obtain mm**. A conforming CAD importer may already normalize them to mm: do not multiply an imported mm result a second time.

The global angle unit `#105463` is degrees, defined as approximately 0.01745329251994 rad per degree. In particular, raw cone semi-angles such as 45 are degrees in this file, not radians. Solid angle is steradian.

`#105465` assigns closure uncertainty 0.0002175376336829 inch, approximately **0.0055254559 mm**, described as maximum model-space separation at asserted geometric connectivity. It is a CAD representation tolerance, **not a manufacturing or fit tolerance**.

## Shape structure and axes

- `#105467` is an `ADVANCED_BREP_SHAPE_REPRESENTATION` containing `#38779` and `#105431` in the same unit/context.
- These are two `MANIFOLD_SOLID_BREP` entities, each referring to a `CLOSED_SHELL`. The file declares closed manifold topology; entity type alone does not prove imported validity, watertight tessellation, orientation correctness, or absence of self-intersection.
- Entity inventory: 1,856 advanced faces, 5,250 edge curves, 3,254 topological vertices, 1,300 circles, 248 cylindrical surfaces, 116 conical surfaces, 146 toroidal surfaces, 2,074 B-spline curves with knots, and 30 B-spline surfaces with knots.
- No `NEXT_ASSEMBLY_USAGE_OCCURRENCE`, `ITEM_DEFINED_TRANSFORMATION`, `CARTESIAN_TRANSFORMATION_OPERATOR_3D`, or `REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION` entities were found. The two solids are in one shared model frame; no assembly transform was discovered.
- The root placement `#105472` is at (0,0,0), with local z=(0,0,1) and x=(1,0,0). Named datum `PRT_CSYS_DEF` is the same identity frame.
- Datum planes: `RIGHT` has normal +X, `TOP` has normal +Y, and `FRONT` has normal +Z. These are CAD system names, not proof that the physical driver exit points along the plane named FRONT.
- The major coaxial cylinder and circle features are centred on the **Y axis**; X and Z are transverse. To map to a catalogue with +z rearward after confirming that source Y=0 is its mounting face, one possible right-handed mapping is `(catalogue x, y, z) = (source X, source Z, -source Y)` after length normalization. Register the mounting surface before applying this transform.

## Safe analytic observations, and what is not a bounding box

The following numeric observations follow directly from explicit analytic STEP primitives after the native inch-to-mm conversion. They are identified features, not newly asserted manufacturing dimensions:

| STEP evidence | Converted observation | Interpretation limit |
|---|---:|---|
| Coaxial cylinders `#20712/#20727`, matching circles at source Y=-21.3 and -9.3 mm | Radius 73 mm, diameter 146 mm | Agrees with the published nominal body diameter; by itself not proof that all terminals or other features stay inside this radius. |
| Coaxial cylinder/circle set at source Y=+2 and -1 mm (`#20968/#20990`, `#2488/#2493`, `#2470/#2475`) | Radius 30 mm | Source contains a 60 mm diameter locating/front feature over these station values; positive-Y feature is consistent with a front projection, but needs physical registration. |
| Coaxial cylinder/circle set at source Y=+2 and -1 mm (`#21033/#21073`, `#2498/#2503`, `#2512/#2517`) | Radius 18.5 mm, diameter 37 mm | Do not substitute for the product's published 36 mm acoustic exit diameter without identifying the relevant opening, recess, and acoustic reference plane. |
| Topological vertices reachable from solid `#38779` | X spans -73 to +73 mm; Y spans approximately -38.175 to +2 mm; Z spans approximately -57.4155 to +57.4155 mm | Vertex-only extrema are incomplete for arcs, analytic surfaces, and spline bulges. |
| Topological vertices reachable from solid `#105431` | X spans about -69.3792 to +69.3792 mm; Y spans about -59.8727 to -26.925 mm; Z spans about -69.8027 to +69.8027 mm | Same limitation; not a conservative collision envelope. |

The combined sampled-vertex Y span is about **61.8727 mm**. This is a **lower bound on the model's true axial extent**, not a usable upper clearance bound. Curved-surface extrema can occur between vertices. This audit does not replace the earlier recorded full-kernel extent of approximately 62.6754 mm, nor certify that historical result. No confident unit-scale error was found in the catalogue's existing millimetre dimensions: the 146 mm primitive diameter and +2 mm source feature are consistent with already normalized values.

Validation-property metadata repeats a surface area of 196.5355450996 in2 (126,796.8723 mm2), a volume of 28.85673456697 in3 (472,877.1562 mm3), and a centroid near source Y=-0.8066212218202 in (-20.4882 mm). The same values appear at solid-associated and product-associated property levels. They must not be added together or treated as the driver's occupied rear-chamber displacement. This audit does not recompute these properties or determine their completeness for the two-solid representation.

## Catalogue status and remaining work

It is accurate to call the archived file **manufacturer-supplied STEP CAD, associated by RCF with ND950 1.4**. It is not accurate to label the current procedural viewport envelope an exact imported CAD model. Retain its envelope/approximation status.

An exact registered catalogue representation still requires a documented CAD-kernel import with native-unit conversion, validation of both solids, full surface extrema or a conservatively bounded tessellation, physical mounting/exit datum registration, and explicit verification of which front opening corresponds to the nominal acoustic exit. Threads, connector access, wire-bend clearance, and production tolerances need their own evidence; the STEP closure tolerance supplies none of these.

Recommended metadata correction: describe historical kernel measurements as normalized to mm, describe this STEP's native representation as inch/degree, and separate `cad` ZIP evidence from `step` extracted-member evidence. No record or runtime file was edited by this inspection.
