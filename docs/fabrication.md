# Browser fabrication package

`Export → Printable assembly` builds closed material solids in the offline browser. It performs actual Boolean cuts and joins; the export does not depend on external CAD, a Python installation, AKABAK, or a network request. STL and faceted STEP use millimetres. Users still use their printer's usual slicer/printing workflow.

## A complete supported example

Open `examples/fabrication-prototype-study.json`, then generate the printable assembly. This is a regression/prototype fixture, **not an acoustically validated loudspeaker recommendation**. It uses two source-documented B&C 6NDL38 drivers, a DCX464 throat interface, an offset front insert, individual rear chambers, and a 360 × 360 × 250 mm build volume with a 5 mm bed margin.

The checked example produces 18 material sections and 12 separate alignment dowels. It contains a joined horn/front-collector body, two **removable** rear driver clamp plates and two **removable** rear enclosure modules. The source frame can pass through each full-frame collar opening; the rear clamp plate goes over the basket afterward. Four external M4 ear attachments connect each clamp plate to the horn collar independently of the manufacturer's driver bolt pattern. The rear enclosure modules use matching accessible external ears. Removing the modules and clamp plates releases the drivers without breaking a bonded horn.

The clamp plates retain the source driver bolt holes. The external ear bolts provide the defined retention method. Optional additional driver bolts need an actual head/access check; the package does not silently assume that a bolt head can occupy the front-chamber material. Use gaskets at driver seats and detachable rear joints, and choose bolt/nut/washer lengths to suit the physical stack. Clamp pressure, print creep, heat and strength are prototype questions.

The build also supports a smooth shared rear shell with a flat gasketed, bolted service lid. It refuses shared designs whose service opening cannot pass the largest removable driver support, including its external ears. For example, the source fixture's larger 6NDL38 supports are too large for its shared teardrop hatch. A checked two-driver 5NDL38 shared example fits. The tool does not advise trapping a driver inside a glued shell.

## Geometry and interfaces

- The canonical inner/outer horn profile and `frontAdapterGeometry()` rings remain the acoustic/geometry source. The canonical acoustic model and provenance are not changed.
- Closed material lofts are unioned with the horn. Extended canonical air solids then cut **through** the horn wall. The inlet diagnostic caps never become printed material.
- Offset/annular inserts are material integrated into the collectors. The canonical inner rings include the opening wall and cone-facing insert surface; subtracting that air leaves the specified insert attached to the shell. They are not omitted decorative meshes.
- The collector/collar interface has 0.5 mm of real overlap to avoid numerically fragile, independently tessellated butt faces. Sourced mounting-seat offsets remain unchanged.
- Full-frame collar clearance and separate clamp plates allow insertion and service. Plate cutouts, source bolt holes, optional source counterbores, external connection ears and through holes are real material geometry.
- The compression-driver adapter is an open tube from the editor's existing −12 mm mounting datum to the horn throat. Unsupported throat projections or mismatched sourced openings block fabrication.
- Individual rear modules contain real sealed caps or round/slot reflex passages and ducts. Shared rear shells have a real access opening and detachable lid. Revised construction parts displace rear air, so the original nominated net rear volume is not automatically a verified final cabinet volume.

## Segmentation and alignment

The selected axis-aligned build volume minus bed margin defines an XYZ grid. Every material part is cut into closed solids and disconnected islands are separated into their own files. The manifest maps local print coordinates back to installed coordinates. Alignment dowels are generated only where a full clearance-plus-wall cylinder fits inside the uncut material on both sides of the seam. Later seam candidates cannot cross existing holes.

A flat seam with insufficient thickness or curvature for a checked dowel remains a valid closed print section and explicitly says **manual alignment while bonding**. This is shown in the tool and the manifest; it is not silently described as a pinned joint. All segmented seams require bonding and airtight sealing. Dowels align parts and carry no structural rating. Detachable driver and rear-service interfaces must remain detachable after the individual parts' print sections are bonded.

Print orientation, supports, layer height and material are slicer choices. The exporter does not claim support-free prints, material strength, rigging safety or physical acoustic validation.

## Gates and checks

Before export the generator rejects unresolved source mounting dimensions unless the existing driver-mounting workflow supplies a confirmed measured override. It also rejects invalid canonical geometry, inadequate wall thickness, unresolved inserts, inaccessible rear-service apertures, blocked attachment hardware, unjoined bodies, part interference or material intruding into air/bolt passages.

Checks include:

1. Manifold Boolean status, positive volume and one connected boundary per final material component.
2. No material in extended canonical branch-air cutters; a full central-horn interior probe stays 0.1 mm inside its sampled walls to allow the declared profile faceting tolerance.
3. Clear source bolt passages after all unions; less than 0.1 mm³ allowable numerical material overlap between separate installed parts.
4. Closed, consistently wound indexed meshes in installed and actual Float32 local print coordinates, with nondegenerate triangles and positive volume.
5. Local/installed mesh volumes within 0.001% of the geometry engine, with a 0.01 mm³ floor for small pieces.
6. Real packed binary-STL coordinate edge topology in regression tests, rather than only tests on JavaScript doubles.
7. Build-volume fit including separate dowels.

The horn meridian is simplified to 0.04 mm and the final material mesh uses a 0.005 mm Manifold tolerance. An export cleanup collapses only connected edges shorter than 0.0000001 mm and removes paired opposite zero-thickness faces; all resulting meshes must still pass the topology and volume checks. It never accepts a repaired result merely because a Boolean call returned success.

Independent native validation of actual ZIP output uses OpenCascade, only during development: each material STL is closed and consistently wound; every faceted STEP imports as exactly one valid positive-volume solid; STL/STEP volumes agree; horn/branch air and source bolt-center probes classify outside material. The full unsegmented fixture has five valid parts; the split fixture has 30 valid parts (18 material sections and 12 dowels). This validates geometry/serialization, not print fit, material strength, a solver result, or acoustics. `tests/verify-fabrication-native.py` and `scripts/export-fabrication-review.cjs` reproduce that audit in an existing OCP environment.

## Package and persistence

The ZIP contains local `parts/*.stl` and `parts/*.step`, `installed_assembly.obj`, `fabrication.json`, the reloadable `MEH_design_study.json` and `START_HERE.txt`. The manifest contains source driver records, construction settings, placements, seam IDs, pin centers, attachment hardware descriptions, checks and limitations. No manufacturer CAD is redistributed. Settings live at `design.fabrication`; old designs use explicit defaults. Edits invalidate a generated preview/download, including edits while asynchronous generation or download is pending.

## Vendored engine

The geometry engine is [Manifold](https://github.com/elalish/manifold), pinned to npm `manifold-3d` **3.5.4**, under the included Apache-2.0 license (`exports/vendor/manifold-LICENSE.txt`). The relevant primary API documentation is [Using Manifold](https://manifoldcad.org/docs/jsapi/documents/Using_Manifold.html). Source distribution: `https://registry.npmjs.org/manifold-3d/-/manifold-3d-3.5.4.tgz`.

SHA-256:

- npm tarball: `cf57c91fcd33b6315bff28e424ac8c5f04acb5410e9dd8e9886838303910c568`
- vendored `manifold.wasm`: `73e3b419ad31294f6b1cc478173944e50efc4a34bfdeeff0107bdfc12975f11c`
- adapted `manifold.cjs`: `9397ff5cf3018544f644d57f3b36ac3c18d43d298a17136579a3311f790d5aa4`

The JS adapter changes packaging only: `import.meta.url` becomes a browser/Node-safe location expression and `export default Module` becomes the global/CommonJS entry. The compiled WASM is byte-for-byte from the package. The build embeds both the loader and base64 WASM into the existing offline HTML script; the runtime supplies `wasmBinary`, so it fetches no dependency. Every allocated WASM object is deleted after generation. The engine is a bundled library, not an external software requirement for the user.
