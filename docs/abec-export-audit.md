# ABEC export audit — 2026-09-29

The exported files are import candidates for AKABAK's **Tools → Import ABEC Project** workflow. Proprietary AKABAK/ABEC interpretation, import and solving have **not** been run. No AKABAK executable was found in the available macOS applications or existing CrossOver bottles. The available research runtime runs Gmsh and open-source numerical tools; those tools do not interpret ABEC scripts.

## Primary documentation reviewed

The [R&D Team manual](https://www.randteam.de/AKABAK3/AKABAK-Help-Instructions.html), whose local reference archive contains a help file dated 2026-02-13, was reviewed in these sections:

| Section | Export behavior checked |
| --- | --- |
| Mesh-File-GMSH; Mesh-File-Tags | Gmsh 2.2 ASCII surface triangles, meter scaling, and numeric elementary selectors; semantic physical IDs remain separately available. |
| Form – Import ABEC Projects | Relative companion files in one folder; a single `Driving_Values` section; each distinct facet-projection weight has its own `Elements`/`Driving` component. The importer does not preserve per-item driving assignments inside one component. |
| Form – Fixed Driving | Prescribed velocity has no acoustic feedback to a motor. Unit velocity is not voltage sensitivity. |
| Form – Acoustic Parameters | Solver defaults are 343.32 m/s and 1.205 kg/m³. They must not silently replace the saved design's medium. |
| Form – Interface; Normals and Volumes – Interface Elements | Interface normals point into the first named subdomain. A shared interface couples pressure and normal velocity; it is not a rigid cap or independent simulation. |
| Form – Radiation Impedance | Source observations include self and mutual loading. Normalized impedance is not directly a dimensional acoustic impedance matrix; effective-area and velocity-distribution conventions matter. |

The independent project's INI structure and script grammar were also cross-checked against static output templates in the author's [official ATH 2025-06 distribution](https://at-horns.eu/release/ath-2025-06.zip). The executable was read as data, not executed. This checks documented/template syntax, not acceptance by an actual proprietary parser.

Reference archive hashes match the prior release provenance:

| Archive | SHA-256 |
| --- | --- |
| `Help-Akabak3.zip` | `77b2ae59f8d4aa583e4ae48571a06e0aa3b90b9df7c049dca24ad50aa8019302` |
| `ath-2025-06.zip` | `99fe76af3faab6595aee497f090ad5f54e4a7aa5a9dbd0f4db62aaa290a15041` |

No manual archive, extracted manual, proprietary executable or manufacturer reference file is distributed in the source tree. R&D Team's [known issues](https://www.randteam.de/AKABAK3/AKABAK-KnownIssues.html) also documents Gmsh 2.2 interchange and potential non-uniqueness-compensation trouble with very close opposing surfaces. Choosing solver settings and demonstrating convergence remain required for narrow insert gaps.

## Source contract and corrections

The writer now rejects missing source faces, duplicate source metadata tags, and a driver/vent role mismatch. It does not silently omit a declared source. Sources retain independent driving groups and each source's surface area, projected area, motion direction, facet projections and elementary selectors in `source-map.json`.

Driver definitions remain in `manifest.drivers` with `source_tag` and `motion_into_front_air`. Optional vent inlet definitions use `manifest.vent_sources` with `id`, `source_tag`, unit vector `motion_into_air`, and `projected_mesh_area_m2`. Their boundary-group kind is `independent-vent-source`; an optional `abec_driving_group` overrides the otherwise unique `1000 + source_tag`. Vent sources do not use driver nominal `Sd`.

A vent source prescribes axial velocity at the internal duct termination. The exported duct and exterior form a radiation transfer problem. Rear chamber, driver motor and vent-flow coupling are not solved by prescribing that velocity. Each vent is muted in the default `Driving_Values` table; set the desired source to weight 1 and the other sources to 0 for its unit-velocity basis. The full self/mutual source-pair observations remain present. In the coupled front-subdomain adapter, these vent sources remain driven in exterior subdomain 1, while driver sources remain in their finite front-air domains.

The source mapping and generated instructions work for all offered counts (2, 4 and 6). Domain selection uses source metadata rather than assuming a numeric driver-tag range. The default lower frequency is `min(100, maximum_frequency/2)`, so a 100 Hz upper limit now produces a valid 50–100 Hz range; invalid explicit frequency ranges still fail.

New geometry jobs declare `manifest.observation_frame` with `origin_m`, `forward`, `horizontal` and `vertical`. All adapters use that mouth origin. The older file bridge used the final rolled-lip station while direct and coupled adapters used the geometric mouth; those stations can differ substantially. Explicit caller overrides still take precedence. Only legacy manifests without a frame retain the bridge's final-station fallback.

Sound speed and density remain explicit **manual import settings**. The generated instructions show the saved SI values and the **Global → Acoustic Parameters** location. The exported scripts do not set these values, and validation metadata records that manual entry is required. An ABEC medium-setting statement was not added without verified primary syntax. Proprietary parser testing is still outstanding.

## Reproduction and limits

Run the independent analytic writer fixtures:

```sh
node --test tests/abec-project.cjs tests/abec-subdomains.cjs
```

The 27 focused tests cover SI round trips, source projection and analytic areas, independent selectors and all mutual pairs for 2/4/6 drivers, source completeness, mixed vent/driver bases, transparent interface orientation, per-domain closure and partition volumes, generic source tags, consistent observer origins and medium instructions, and invalid inputs. They do not establish absence of geometric intersections in arbitrary designs or qualify an acoustic response.

With a Gmsh-enabled Python interpreter, audit an actual generated bundle:

```sh
python tests/abec-native-audit.py path/to/bundle/abec
python mesh-export/test_build_mesh.py
python mesh-export/test_vent_domains.py
```

This independently imports the written mesh, reconstructs domain boundaries from elementary selections, and checks physical-tag counts, source mappings, projection weights, source-domain membership and interface incidence. It also cross-checks the single unit-velocity table, muted vent defaults, complete self/mutual source pairs, the canonical 1 m observer, and required medium instructions. Its report explicitly states that proprietary import/execution is not run. Exterior domains can have multiple disjoint solid boundary components; each finite front-air domain must have a single connected boundary. Arithmetic matrix sizes are not measured AKABAK RAM usage. Mesh refinement, source-file consistency and native Gmsh import do not establish field convergence, passivity, correct port sizing or a validated voltage-driven loudspeaker response.

Fresh exports of the prior saved shared-sealed design (`design_sha256=d41b131d158d497456e91aa497440a8942c5d737b4851684b15e98af3b08cbc1`) passed that audit in Gmsh 4.15.2: 69,338 nodes / 138,672 triangles for the single exterior, and 64,734 / 129,968 for coupled subdomains. Independent analytic recessed-box fixtures with 2, 4 and 6 branches plus an exterior inlet source also passed native reimport and all domain/source checks (32/60, 64/120 and 96/180 nodes/triangles). Those fixtures check mapping and serialization, not the physical geometry of an actual reflex enclosure.

Completed individually sealed native cases also passed independent Gmsh/domain/source audits: two drivers at 37,817/75,630 nodes/triangles (single exterior) and 35,515/71,278 (coupled); four drivers at 64,802/129,600 (single) and 60,198/120,896 (coupled). These are topology/source audits of those specific generated cases, not a promise that every arbitrary saved layout is geometrically valid.

The final matrix includes these additional audited configurations with the new explicit observation frame and medium instructions. Counts below are stored input triangles, not predicted solver memory or accuracy:

| Regression case | Single exterior triangles | Coupled triangles | Coupled domains | Driver / vent sources | Self/mutual pairs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Individual sealed, 6 mids, no insert, 55 mm entry | 98,588 | 96,668 | 7 | 6 / 0 | 36 |
| Individual reflex, 4 mids, 20 mm round vents | 149,602 | 147,042 | 5 | 4 / 4 | 64 |
| Individual reflex, 4 mids, 45 × 15 mm rectangular vents, no insert, 32 mm entry | 70,124 | 68,844 | 5 | 4 / 4 | 64 |
| Shared reflex, 4 mids, 80 × 40 mm rectangular vent | 73,472 | 70,912 | 5 | 4 / 1 | 25 |

All eight exported bundles passed actual Gmsh 4.15.2 import and independent domain/source checks. Within each case, the single and coupled adapters produced byte-identical observation scripts. Their observer uses the declared geometric mouth at `z=0.35870424280375335 m`; requested medium settings are `343 m/s` and `1.204 kg/m³`, explicitly requiring manual entry. Every vent source remains in exterior domain 1 and defaults to zero weight. These are independent radiation-basis exports; no rear-cavity/motor solution or acoustic port-tuning qualification is implied.

The separate native vent tests build a closed cylindrical scatterer with an open duct and prescribed inlet. Four cases combine round/rectangular ducts, outer rings of 64/80 vertices, and translated/tilted coordinates. They preserve every canonical opening/inlet vertex exactly, including all four slot corners; source projected-area error is at most `4.45e-16` relative. Closure, normals, intersection checks and Gmsh coordinate/connectivity/tag reimport pass. This confirms the canonical duct footprint survives a different exterior ring count; it does not establish acoustic convergence.
