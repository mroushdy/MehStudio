# Acoustic boundary export: formulation and limits

This prototype exports the canonical MEH front passages and surrounding enclosure as an acoustic boundary model. It is a geometry and solver-interface prototype. Passing topology or import checks is not evidence that a loudspeaker response, directivity, or port size is physically accurate.

## Four different geometric objects

| Object | What it represents | What belongs in it |
| --- | --- | --- |
| Manufacturing solid | Material to print or machine | Material thickness, mating faces, structural details and tolerances |
| Interior air volume | Air occupied by the acoustic field | Front chambers, insert gaps, collectors, tubes and horn, with connected cells and no buried internal caps |
| Acoustic boundary | Boundary conditions on that air | Rigid walls, moving cone surfaces, impedance surfaces and deliberately declared coupling interfaces |
| Exterior radiation | The unbounded field around the horn/enclosure | The actual scattering surface and an outgoing radiation condition; no finite air-box wall unless its approximation is specified |

A watertight manufacturing STL can still be the wrong acoustic geometry. Conversely, an acoustic source surface is a mathematical moving boundary, not a printable membrane. Shader-clipped display holes are not holes in exported triangles. Diagnostic closing disks must be removed for a single connected air domain. A coupled-domain model instead retains each intended interface once and explicitly declares both connected domains.

## Why this does not require two independent simulations

The connected front air and exterior can be one exterior BEM domain. Its boundary follows the front cone surfaces, chamber/insert walls, collectors, actual horn openings, horn flare and exposed enclosure. A path through the mouth reaches infinity without crossing a boundary. There is **no mouth cap** in this BEM model. The outer enclosure closes the excluded solid; closing that solid does not close the horn's air passage.

An alternative is domain decomposition: put a virtual interface across the mouth or another suitable section, solve local operators, then solve their coupled interface system. With outward normals defined independently for the two air volumes, the conditions are

\[
p_1=p_2,\qquad v_{n,1}+v_{n,2}=0.
\]

For the same medium this is pressure continuity and conservation of normal flow. The interface is not a rigid wall, prescribed pressure, or a new independent source. Its acoustic load must feed back into the horn and all drivers. A one-way interior solve followed by exterior postprocessing generally loses that feedback.

R&D Team documents transparent interfaces and a two-stage subdomain solve; it also describes fully coupled BEM/LEM. The documented interface ordering follows the direction of its normal into the first referenced subdomain. These rules were checked in the official manual's *Form – Interface*, *Normals and Volumes – Interface Elements*, and *Subdomain Modeling*. [AKABAK official manual download](https://www.randteam.de/AKABAK3/AKABAK-Help-Instructions.html), [AKABAK introduction](https://www.randteam.de/AKABAK3/AKABAK-Introduction.html).

A sealed rear chamber is a separate air domain because the cone separates front and rear. The driver motor/mechanics couples them. For this prototype the 108 L shared rear chamber is retained as shared-compliance metadata; a spatial rear-air volume with motors and back-cone boundaries is not exported. The exterior cabinet mesh affects radiation but does not create a solved rear chamber.

## Implemented model

The supplied exact design is read from saved JSON, including its four B&C 6NDL38 sources, 87 mm insert opening, 2.75 mm clearance, offset and entry geometry, and 1 V RMS per driver. Values are never reconstructed from a prose summary. Each driver keeps a stable source id and physical tag. The compression-driver throat is a rigid closure in the mid-only export, not a calibrated HF source.

The stable single-exterior ABEC writer accepts a complete, consistently wound closed obstacle boundary. It rejects mouth/interface tags, unknown boundary roles, missing source motion, open/nonmanifold edges, duplicate indexed triangles and inconsistent winding. It does not repair such defects by adding arbitrary caps. It permits multiple closed solid exclusions but each must have the correct signed orientation. Global geometric self-intersections are tested by the separate native geometry validator; the writer's topology check alone cannot detect all overlaps.

The separate coupled-domain writer uses four finite front-air interiors and one common horn/exterior. The four root surfaces become transparent interfaces 201–204; the horn mouth still has no cap. Each source drives its interior and receives the coupled horn/exterior load through its interface. This is a complete proposed coupled BEM problem, not four independent radiation models. Its scripts have not yet been interpreted or solved by proprietary AKABAK/ABEC.

Only the complete full geometry is currently emitted. Quarter symmetry is not inferred from four nominally spaced drivers: a changed insert offset, port outline or excitation can invalidate it.

## Units, axes, normals and source motion

All boundary coordinates use meters. The shared manifest uses a right-handed frame: +Z forwards along the horn, +X and +Y transverse, with the throat at z = 0. The physical mouth-rim station supplies the observation origin. The on-axis microphone is one meter further along the same explicit forward vector. Horizontal and vertical polar base planes use that same frame. No later axis rotation occurs.

The native closed front-air boundary uses normals outward from air. AKABAK expects normals into its analyzed air domain, so the ABEC writer reverses that winding exactly once. Right-hand triangle winding determines the normal. This convention was checked in *Normals and Volumes* and *Normals and Volumes – 3D Elements* of the [official AKABAK manual](https://www.randteam.de/AKABAK3/AKABAK-Help-Instructions.html).

Let d be a driver's unit motion vector into its front chamber and n the cone-facet normal into air. For rigid translation at axial velocity u, the boundary velocity is

\[
v_n=u\,(n\cdot d),\qquad Q=u\sum_e A_e(n_e\cdot d).
\]

The sloping cone area is not Sd. The projected mesh area is recorded separately from the nominal catalog Sd. The writer groups facets with equal cosine projection (rounded to 12 decimal places, at most 5e-13 absolute multiplier error). Each subset receives a separate elementary tag and `DrvWeight`; all subsets of one cone share the same `DrvGroup`. The geometry is not merged or simplified. On the supplied conical surrogate all facets of a driver have the same projection, so four compact source components suffice.

Fixed source driving is a **unit axial velocity transfer calculation**, not the saved 1 V electrical response. `source-map.json` preserves the voltage, source axis, projected area, all facet weights, and stable tag/group mapping. To predict voltage-driven response, solve the motor/mechanical system with the full complex self/mutual front load matrix and shared rear pressure. Do not simply multiply four uncoupled responses. The observation script includes all source-pair normalized radiation impedances; their solver normalization must be reconciled with area and motor conventions before dimensional coupling.

## Files and interface contract

`mesh-export/abec-project.cjs` exports `buildAbecProject(input, options)`. The result is `{files, validation, sources, observation_frame}`; `files` maps basenames to UTF-8 strings. The input has:

- `manifest`: versioned geometry manifest, SI units, `design_sha256`, `boundary_groups`, `drivers`, axes and mesh request.
- `mesh`: `{vertices_m: [[x,y,z],...], faces: [[i,j,k],...], face_tags: [tag,...]}` with zero-based indices. The generic `{nodes, triangles:[{nodes,physicalTag}]}` form is also accepted.
- Explicit normal convention, either `mesh.normal_convention` or `options.normalConvention`: `air-outward` or `into-air`.
- Explicit `options.mouthCenterM`, `input.horn.mouth_center_m`, or `manifest.observation_frame.origin_m`. Direction vectors can be supplied in options; otherwise manifest axes apply.

Every source definition has `id`, `source_tag`, and unit vector `motion_into_front_air`. Groups have a positive `tag` and `kind`; supported physical roles are rigid wall and independent driver source. The compression-throat port is accepted only with its explicit rigid-closed mid-only default.

`node mesh-export/write_bundle.cjs OUTPUT_DIRECTORY` reads that directory's `manifest.json` and `bem-air-outward.json`, writes `abec/`, and performs the adapter checks. Files include `project.abec`, `boundary.msh`, `solving.txt`, `observation.txt`, source mapping, manifest, validation and instructions. The project links all files by relative names and the M1 alias. No undocumented binary project format is invented.

`mesh-export/abec-subdomains.cjs` exports `buildAbecSubdomains(job, bem, options)`. The canonical `job` supplies `manifest`, `horn`, and closed outward-air `parts.branches`; `bem` supplies the assembled outward-air single-exterior mesh in the same SI frame. The CLI is `node mesh-export/abec-subdomains.cjs JOB_JSON BEM_JSON --out DIRECTORY`. Exterior geometry can be coarsened independently only when its original branch-root seams remain conforming. Canonical branch walls, sources and caps are retained. Welding is bounded to 1 nm or less (default 0.1 nm); the release bundles require zero displacement.

Subdomains 11–14 are Interior; subdomain 1 is Exterior. An interface component uses, for example, `SubDomain=11,1` and `Mesh Include 201`. The shared triangles are stored once, point into domain 11, and contribute opposite normals to domain 1. The writer verifies closure, vertex manifoldness, winding and volume separately for each reconstructed domain, source projection again from the final exported coordinates, and the partition identity `V_exterior_exclusion = V_original_solid + sum(V_front_air)`. Three surface incidences at a shared interface rim are expected in the aggregate; it is not a manufacturing shell.

## Syntax and reference provenance

Gmsh 2.2 ASCII linear triangles are used because AKABAK explicitly supports that format. The writer stores semantic physical tags and numeric elementary tags separately; ABEC selectors reference elementary tags. The official help's *Mesh-File-GMSH*, *Mesh-File-Tags*, *Form – Import ABEC Projects*, and *Scripting* were inspected. [AKABAK manual](https://www.randteam.de/AKABAK3/AKABAK-Help-Instructions.html), [Gmsh MSH 2 specification](https://gmsh.info/doc/texinfo/#MSH-file-format-version-2).

The real `.abec` project is an INI-style text file. Its section/field grammar and the ABEC mesh, source, spectrum and normalized-impedance syntax were cross-checked against the static output templates in the author's [official ATH 2025-06 distribution](https://at-horns.eu/release/ath-2025-06.zip). Those templates also supply `SubDomain_Properties`, Interior/Exterior element types, and paired `SubDomain` selections. The executable was inspected as data, not run. Functional syntax was reimplemented independently; no ATH source, executable, AKABAK manual archive or extracted manual mirror is distributed with this prototype.

Research artifacts, downloaded 2026-09-29:

| Official artifact | SHA-256 |
| --- | --- |
| `Help-Akabak3.zip`, containing `Akabak.chm` dated 2026-02-13 | `77b2ae59f8d4aa583e4ae48571a06e0aa3b90b9df7c049dca24ad50aa8019302` |
| `ath-2025-06.zip` | `99fe76af3faab6595aee497f090ad5f54e4a7aa5a9dbd0f4db62aaa290a15041` |

Hornstudio at commit `eb5d4255ef5a7147c017bfe9b685bd7c1e1dc5c4` was inspected as a reference. Its `buildBEMProject`, `abecProject` and `bemToMsh` establish useful user-flow precedent but do not validate physical correctness. In that snapshot the mesh is along Z whereas its ABEC comments and observation/baffle placements assume X. This implementation derives mesh and observer frames from one manifest. No Hornstudio implementation or prose was copied. Hornstudio's repository is licensed CC BY-NC 4.0; reusing its code later would require preserving the applicable attribution and license. [Hornstudio source](https://github.com/mroushdy/Hornstudio), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

## What has and has not been verified

The adapter tests check exact coordinate round trips, independent physical/elementary source mapping, analytic piston projected area and volume scaling, transformed observation axes, source isolation, normal conversion, and rejection of invalid boundaries. The exact-design boundary was reimported through real Gmsh 4.15.2 with source-tag counts preserved. These are software/format/geometry checks.

The optional native smoke program can import `front-air.msh` into complex DOLFINx/PETSc. It checks tetrahedral connectivity and complete boundary tagging, then assembles a P1 Helmholtz problem. Four independent inward cone-flow bases allow true linear residual, reciprocity, passivity and power-balance checks. The front truncation plane receives a local plane-wave Robin termination solely for this numerical test. It is not an exterior radiation solve. **No whole-horn tetrahedral mesh passed the quality gate in this release:** attempts either failed in the mesher or retained nonpositive tetrahedral quality. Those volumes are withheld; no actual whole-horn FEM solve or qualified full-horn dataset is claimed.

No proprietary AKABAK/ABEC import, interpretation or solve has been performed. Native import success does not verify ABEC parsing. The documented manual import workflow and normals/source inspection remain necessary. No acoustic field or load convergence, physical diaphragm fit, losses, measured response or HF handoff is established here.

The native formulation has a separate reproducible analytic test: a 0.1 m square, 0.1 m long rigid duct with an anechoic plane termination. Its exact input impedance is `rho*c/S = 41297.2 Pa s/m3`. The independently refined P1 runs gave:

| Target edge | Pressure unknowns | Complex impedance error at 100 Hz | Error at 700 Hz |
| --- | ---: | ---: | ---: |
| 20 mm | 240 | 0.002370% | 0.6110% |
| 10 mm | 1,198 | 0.000677% | 0.1745% |
| 5 mm | 7,415 | 0.000185% | 0.04738% |

All passed true-residual, power and passivity checks. This checks the solver's signs, source units and refinement behavior for a straight duct, not the MEH horn. Reproduce with `python mesh-export/native_smoke.py --analytic-duct OUTPUT --benchmark-size-mm 10 --frequencies 100,700`, using the complex DOLFINx/PETSc research interpreter; repeat with 20 and 5 mm. The native program writes its compiler cache inside the selected output directory and does not modify the shared runtime.

Mesh density begins with wavelength and minimum-passage constraints, but only changes in complex load, fields and directivity under independent refinement establish a usable band. A gap can require far smaller elements than wavelength alone suggests. Gmsh positive element quality and topology cannot replace a convergence study.

The initial exact boundary has 138,672 triangles. One dense complex128 N-by-N matrix would occupy about 286.6 GiB before factorization and other workspaces; this is arithmetic, not a measured AKABAK memory requirement. A faithful coarse mesh, validated simplification, or coupled domain partition is needed to make such a case economical. The official manual's roughly 5,000-element remark describes interactive tag-selection responsiveness, not a universal solver ceiling. AKABAK also documents NUC trouble with very close opposing boundaries, relevant to the narrow insert gap. [AKABAK known issues](https://www.randteam.de/AKABAK3/AKABAK-KnownIssues.html).

## Historical Build 11 release audit: 2026-09-29

The exact saved design hash is `d41b131d158d497456e91aa497440a8942c5d737b4851684b15e98af3b08cbc1`. The saved 1 V drive and shared 108 L rear volume remain metadata in both ABEC options.

| Bundle | Native Gmsh 4.15.2 import | Domain layout |
| --- | --- | --- |
| Exact single exterior | 69,338 nodes; 138,672 triangles; 9 physical groups | One connected exterior boundary, no root or mouth caps |
| Exact coupled subdomains | 64,734 nodes; 129,968 stored triangles; 13 physical groups | Exterior 76,208; four interiors of 13,568 triangles each |
| Profile-coarsened coupled subdomains | 45,005 nodes; 90,510 stored triangles; 13 physical groups | Exterior 36,750; four unchanged canonical interiors of 13,568 triangles each |

For the profile-coarsened coupled bundle, a separate audit reads the written mesh through Gmsh, reconstructs all five domains from the saved script's elementary selections, and checks every domain's closed edges, manifold vertices, winding and signed volume. All 13 physical IDs are preserved: rigid groups 10–13, independent sources 101–104, interfaces 201–204 and rigid mid-only HF closure 302. Each source and each interface has 128 triangles. Interface normals pair exactly; final source projections agree with their driving weights within 4.41e-13. Partition-volume relative error is 2.05e-14 or less. The companion `gmsh-import-validation.json` records these checks. Reproduce with the Gmsh-enabled research interpreter and `python tests/abec-native-audit.py BUNDLE_DIRECTORY`.

The largest local input-face matrix in that profile-coarsened partition is `16 × 36750²` bytes, about 20.1 GiB for one complex128 matrix. The sum of one such matrix per domain is about 31.1 GiB. Neither number includes solver refinement, the coupled interface system, factorization or workspaces; neither is measured peak memory or a performance promise. The coarsened exterior and fixed 128-triangle interface also need acoustic refinement studies.

Separate branch FEM volumes passed positive Jacobian and serialized-import checks at target sizes 2 mm and 1.4 mm: 189,869 and 433,664 tetrahedra respectively. Their coupling trace is held at 129 nodes/128 triangles. At 700 Hz, changing from a freely refined cap to that fixed trace changed the local two-port complex matrix by 0.000477% and 0.001721% respectively in relative Frobenius norm. This limited sensitivity comparison includes the changed volume triangulation; it does not qualify nonuniform FEM/BEM interface transfer or a frequency band. Small positive tetrahedral qualities remain, and the branch solve omits viscothermal losses and uses a uniform interface basis. Conforming hybrid assembly and any horn/exterior solve require their own records.

Seventeen focused ABEC adapter tests pass. Native mesh import and field cross-checks do not exercise proprietary ABEC interpretation. AKABAK/ABEC execution, browser/application QA, BEAT acceptance of these new assets, and a complete coupled acoustic response remain unverified. The release contains original adapters, manifests and validation records, with links to primary references; it does not redistribute manuals or third-party solver implementations.


## Individual pods and explicit rear-vent bases

The surface exporter now accepts valid 2-, 4- and 6-driver designs in both individual and smooth shared layouts. It retains the same canonical inner branch triangles and source conventions. For individual pods, it cuts the actual adapter roots from the outer horn, follows the exposed adapter rings into each cylindrical pod, and closes the real rear panels. The editor buries adapter roots by 0.5 mm for rendering; export instead intersects those same axial generators with the canonical piecewise-linear outer-horn meridian. Every correction and support residual is recorded. Other canonical adapter rings remain unchanged. The complete outer and inner horn lips share an annular join; no display-only clipping or buried return becomes an air boundary.

The individual-pod preflight checks every adapter vertex against the two planes bounding its driver sector. Convex triangles whose vertices stay inside disjoint sectors cannot cross adjacent adapters. This conservative gate can reject designs that would require a material union of intersecting flares. The final native gate still tests all adjacent and nonlocal triangle intersections, including pods against the horn and front boundaries. The compression-driver body and small hardware are omitted from this acoustic surrogate; the exterior throat terminates at the canonical shell ring.

In a reflex export, an explicit opt-in creates a **radiation basis model**. Rear panels contain real round or rectangular openings. The canonical bore follows the physical duct length inward and ends at a separately tagged velocity-source plane. That finite source plane replaces the omitted rear cavity side; it is not a rigid closure or an independently solved exterior. The horn, front cavities, vent bores and infinity belong to one connected air domain. Front-cone and vent-inlet bases therefore share all mutual exterior loading in a solve of this geometry. Tags 151–156 denote vent bases, separate from cone sources 101–106.

For an inlet axis velocity $u_v$ directed along the bore toward the exterior, $Q_v=u_v A_v$. Round area is the exact canonical 128-sided polygon area; rectangular corners are retained exactly. Prescribed inlet velocity does not enforce a motor/chamber/port continuity equation. A voltage-driven reflex prediction still needs the driver mechanical/electrical system and appropriate rear cavity pressure/compliance relations coupled to the full complex front/vent loading matrix. The meshed duct already contributes its acoustic mass and lossless wave propagation; a later network must not add that duct again. No acoustic end correction is geometrically added, and no validated vent sizing, losses or tuning accuracy follows from this export.

The ABEC default table drives front sources coherently at unit axial velocity and leaves vent bases muted. Select sources individually for a transfer basis. The source map records this policy and all self/mutual observations. Neither the default coherent combination nor a unit basis represents saved electrical voltage.

All adapters now share the manifest observation origin at the frontmost geometric mouth station, before the rolled return. Older single-exterior exports used the final rolled-lip station while the subdomain path used the mouth; this discrepancy is corrected for new jobs. The manifest medium must be entered in AKABAK's Global → Acoustic Parameters dialog and checked after import; the exporter does not invent unsupported ABEC medium syntax. See [the primary-document audit](abec-export-audit.md).

The self-contained editor includes the matching local runner. Only a completed, checked geometry export receives its completion marker. Native Gmsh reimport now compares node identities, SI coordinates, triangle connectivity, winding and physical tags. Actual proprietary AKABAK/ABEC import and solving remain **not run**: no authorized executable was available. The separate Boundary Lab operators failed full-system energy qualification and are not used as qualified data by this exporter.
