"""Independent Gmsh import audit of a written ABEC bundle (no ABEC solver).

Usage: complex-research-python tests/abec-native-audit.py BUNDLE_DIRECTORY
Writes gmsh-import-validation.json beside the bundle. No runtime installation.
"""
import collections
import json
import pathlib
import re
import sys

import gmsh
import numpy as np


def require(ok, message):
    if not ok:
        raise ValueError(message)


def domain_geometry(xyz, faces, interior):
    edges = collections.defaultdict(list)
    neighbors = [[] for _ in faces]
    incident = collections.defaultdict(set)
    for i, face in enumerate(faces):
        for j, a in enumerate(face):
            b = face[(j + 1) % 3]
            edges[tuple(sorted((int(a), int(b))))].append((i, 1 if a < b else -1))
            incident[int(a)].add(i)
    for key, uses in edges.items():
        require(len(uses) == 2, f"Open/nonmanifold domain edge {key}")
        require(uses[0][1] == -uses[1][1], f"Inconsistent domain winding at {key}")
        a, b = uses[0][0], uses[1][0]
        neighbors[a].append(b)
        neighbors[b].append(a)
    for vertex, around in incident.items():
        remaining = set(around)
        queue = [remaining.pop()]
        for i in queue:
            for j in neighbors[i]:
                if j in remaining:
                    remaining.remove(j)
                    queue.append(j)
        require(not remaining, f"Pinched domain vertex {vertex}")
    remaining = set(range(len(faces)))
    volumes = []
    while remaining:
        queue = [remaining.pop()]
        for i in queue:
            for j in neighbors[i]:
                if j in remaining:
                    remaining.remove(j)
                    queue.append(j)
        tri = xyz[faces[queue]]
        tri = tri - tri[0, 0]
        volume = float(np.einsum("ij,ij->i", tri[:, 0], np.cross(tri[:, 1], tri[:, 2])).sum() / 6)
        require(volume < -1e-18 if interior else volume > 1e-18, "Incorrect domain normal orientation")
        volumes.append(volume)
    if interior:
        require(len(volumes) == 1, "Finite front-air domain must have one connected boundary")
    return {"triangles": len(faces), "closed_two_manifold": True, "consistent_winding": True,
            "manifold_vertices": True, "boundary_components": len(volumes), "solver_signed_volume_m3": sum(volumes)}


def audit(directory):
    directory = pathlib.Path(directory)
    manifest = json.loads((directory / "boundary-manifest.json").read_text())
    source_map = json.loads((directory / "source-map.json").read_text())
    script = (directory / "solving.txt").read_text()
    observation = (directory / "observation.txt").read_text()
    require(len(re.findall(r"^Driving_Values\s*$", observation, re.M)) == 1, "Exactly one fixed-driving table is required")
    values = re.search(r"^Driving_Values\n((?:[ \t]+.*\n)+)", observation, re.M)
    require(values is not None and "DrvType=Velocity; Value=1.0" in values[1], "Expected a unit-velocity basis")
    rows = re.findall(r"DrvGroup=(\d+) Weight=([^\s]+) Delay=([^\s]+)", values[1])
    weights = {int(group): (float(weight), float(delay)) for group, weight, delay in rows}
    expected_weights = {s["driving_group"]: (s.get("default_observation_weight", 1), 0.) for s in source_map["sources"]}
    require(len(rows) == len(weights) and weights == expected_weights, "Fixed-driving groups or default weights differ from source map")
    for source in source_map["sources"]:
        if source.get("source_type") == "vent":
            require(weights[source["driving_group"]] == (0., 0.), "Vent basis must default to muted")
    pair_rows = re.findall(r"^  \d+ (\d+) (\d+) ID=\d+$", observation, re.M)
    expected_pairs = {(a, b) for a in expected_weights for b in expected_weights}
    require(len(pair_rows) == len(expected_pairs) and {(int(a), int(b)) for a, b in pair_rows} == expected_pairs, "Self/mutual source-pair coverage is incomplete")
    frame = manifest.get("observation_frame")
    if frame:
        point = re.search(r"^  1000 ([^\s]+) ([^\s]+) ([^\s]+)$", observation, re.M)
        require(point is not None, "On-axis observation point is absent")
        expected_point = np.asarray(frame["origin_m"]) + np.asarray(frame["forward"])
        require(np.allclose([float(x) for x in point.groups()], expected_point, rtol=0, atol=1e-13), "Observer does not use the canonical 1 m mouth origin")
    if "requested_medium" in manifest["abec_export"]:
        medium = manifest["abec_export"]["requested_medium"]
        if medium:
            require(medium == {key: manifest["medium"][key] for key in ("sound_speed_m_s", "density_kg_m3")}, "Requested solver medium differs from manifest")
        require(manifest["abec_export"]["acoustic_medium_transfer"] == "manual entry required; not configured by scripts", "Medium transfer status is ambiguous")
        require(manifest["abec_export"]["required_solver_medium_setup"] in (directory / "README.txt").read_text(), "Required medium setup is absent from import instructions")
    declarations = {}
    for match in re.finditer(r'SubDomain_Properties "([^"]+)"\n((?:[ \t]+.*\n)+)', script):
        body = match[2]
        sid = int(re.search(r"SubDomain=(\d+)", body)[1])
        require(sid not in declarations, "Duplicate subdomain declaration")
        declarations[sid] = {"name": match[1], "type": re.search(r"ElType=(Interior|Exterior)", body)[1]}
    selections = {}
    for match in re.finditer(r'Elements "([^"]+)"\n((?:[ \t]+.*\n)+)', script):
        body = match[2]
        owners = [int(x) for x in re.search(r"SubDomain=([\d,]+)", body)[1].split(",")]
        includes = [int(x) for x in re.findall(r"Mesh Include (\d+)", body)]
        require(len(includes) == 1 and includes[0] not in selections, "Ambiguous elementary selector")
        require(1 <= len(owners) <= 2 and all(s in declarations for s in owners), "Invalid component domain reference")
        selections[includes[0]] = {"name": match[1], "owners": owners}
    driving = {}
    for match in re.finditer(r'Driving "([^"]+)"\n((?:[ \t]+.*\n)+)', script):
        body = match[2]
        name = re.search(r'RefElements="([^"]+)"', body)[1]
        driving[name] = (int(re.search(r"DrvGroup=(\d+)", body)[1]), float(re.search(r"DrvWeight=([^\s]+)", body)[1]))

    gmsh.initialize()
    gmsh.option.setNumber("General.Terminal", 0)
    try:
        gmsh.open(str(directory / "boundary.msh"))
        node_tags, xyz, _ = gmsh.model.mesh.getNodes()
        xyz = np.asarray(xyz).reshape(-1, 3)
        index = {int(tag): i for i, tag in enumerate(node_tags)}
        require(np.isfinite(xyz).all(), "Nonfinite imported coordinates")
        entities = {}
        element_ids = set()
        for _, tag in gmsh.model.getEntities(2):
            types, tags, nodes = gmsh.model.mesh.getElements(2, tag)
            require(list(types) == [2], "Expected only linear triangles")
            require(not (set(map(int, tags[0])) & element_ids), "Duplicate imported element ID")
            element_ids.update(map(int, tags[0]))
            entities[int(tag)] = np.asarray([index[int(n)] for n in nodes[0]], dtype=np.int64).reshape(-1, 3)
        require(set(entities) == set(selections), "Saved mesh and script elementary selectors differ")
        groups = {}
        for dim, tag in gmsh.model.getPhysicalGroups():
            require(dim == 2, "Unexpected non-surface physical group")
            tags = list(map(int, gmsh.model.getEntitiesForPhysicalGroup(dim, tag)))
            groups[int(tag)] = {"name": gmsh.model.getPhysicalName(dim, tag), "elementary_entities": tags,
                                "triangles": sum(len(entities[t]) for t in tags)}
        actual_tags = set(groups)
        allowed_tags = {g["tag"] for g in manifest["boundary_groups"]}
        require(actual_tags <= allowed_tags, "Unknown physical ID after native import")
        memberships = collections.Counter(t for group in groups.values() for t in group["elementary_entities"])
        require(set(memberships) == set(entities) and all(n == 1 for n in memberships.values()), "Every elementary entity needs exactly one physical ID")
        require(sum(g["triangles"] for g in groups.values()) == len(element_ids), "Physical groups must partition all triangles")
        require(301 not in groups, "BEM must not have a mouth cap")
        expected_interfaces = {i["physical_tag"]: i for i in manifest.get("abec_interfaces", [])}
        require({tag for tag in actual_tags if 201 <= tag < 300} == set(expected_interfaces), "Wrong transparent interface IDs")
        expected_counts = manifest["abec_export"].get("physical_tag_triangle_counts") or manifest["abec_export"].get("checks", {}).get("physical_tag_triangle_counts")
        if expected_counts is not None:
            require({tag: g["triangles"] for tag, g in groups.items()} == {int(tag): count for tag, count in expected_counts.items()}, "Physical ID counts differ after native import")
        else:
            # Earlier release manifests predate general per-tag count records.
            required = {10, 11, 12, 13, 302} | {s["physical_tag"] for s in source_map["sources"]} | set(expected_interfaces)
            require(actual_tags == required, "Legacy release physical ID coverage mismatch")
        declared_sources = manifest.get("drivers", []) + manifest.get("vent_sources", [])
        require({s.get("source_tag", s.get("tag")) for s in declared_sources} == {s["physical_tag"] for s in source_map["sources"]}, "A declared source is absent from the source map")

        reports = {}
        for sid, declaration in declarations.items():
            blocks = []
            for elementary, selection in selections.items():
                if sid in selection["owners"]:
                    faces = entities[elementary]
                    if selection["owners"].index(sid) == 1:
                        faces = faces[:, [0, 2, 1]]
                    blocks.append(faces)
            require(blocks, "Empty domain")
            reports[sid] = {**declaration, **domain_geometry(xyz, np.vstack(blocks), declaration["type"] == "Interior")}
        for d in manifest.get("abec_domains", []):
            report = reports[d["id"]]
            require(report["triangles"] == d["triangles"], "Domain triangle count differs from manifest")
            require(abs(report["solver_signed_volume_m3"] / d["solver_signed_volume_m3"] - 1) < 1e-10, "Domain volume differs after native import")

        interfaces = []
        for physical, expected in expected_interfaces.items():
            elementary = expected["elementary_tag"]
            require(groups[physical]["elementary_entities"] == [elementary], "Interface must be stored in exactly one entity")
            selection = selections[elementary]
            require(selection["owners"] == expected["subdomains"], "Paired interface ordering differs from manifest")
            require(declarations[selection["owners"][0]]["type"] == "Interior" and declarations[selection["owners"][1]]["type"] == "Exterior", "Interface ordering must be interior, exterior")
            faces = entities[elementary]
            tri = xyz[faces]
            normal = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
            opposite = np.cross(tri[:, 2] - tri[:, 0], tri[:, 1] - tri[:, 0])
            require(np.array_equal(normal, -opposite), "Interface normal pairing is not exactly opposite")
            require(len(faces) == expected["triangle_count"], "Interface subdivision differs from manifest")
            interfaces.append({"physical_tag": physical, "subdomains": selection["owners"], "triangles_stored_once": len(faces), "identical_nodes_opposite_normals": True})

        sources = []
        for source in source_map["sources"]:
            physical = source["physical_tag"]
            projected = area = max_error = 0.
            require(set(groups[physical]["elementary_entities"]) == {g["elementary_tag"] for g in source["projection_groups"]}, "Source tag/entity mapping differs")
            for group in source["projection_groups"]:
                elementary = group["elementary_tag"]
                require(selections[elementary]["owners"] == [source.get("domain", 1)], "Source was assigned to the wrong acoustic domain")
                require(driving[selections[elementary]["name"]] == (source["driving_group"], group["normal_velocity_multiplier"]), "Source driving assignment differs")
                tri = xyz[entities[elementary]]
                cross = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
                twice = np.linalg.norm(cross, axis=1)
                projection = cross @ np.asarray(source["motion_into_air"])
                require(np.all(projection > 0), "Source normals point away from piston motion")
                area += float(twice.sum() / 2)
                projected += float(projection.sum() / 2)
                max_error = max(max_error, float(np.abs(projection / twice - group["normal_velocity_multiplier"]).max()))
            require(abs(projected / source["projected_area_m2"] - 1) < 1e-10, "Source projected area changed")
            require(abs(area / source["surface_area_m2"] - 1) < 1e-10 and max_error < 5.1e-13, "Source area/projection changed")
            sources.append({"physical_tag": physical, "source_type": source.get("source_type", "driver"), "domain": source.get("domain", 1), "driving_group": source["driving_group"], "triangles": groups[physical]["triangles"], "projected_area_m2": projected, "maximum_velocity_projection_error": max_error})
        result = {"parser": "Gmsh " + gmsh.__version__, "design_sha256": manifest["design_sha256"],
                  "physical_groups": groups, "node_count": len(xyz), "triangle_count": len(element_ids),
                  "domains": reports, "interfaces": interfaces, "sources": sources, "passed": True,
                  "observation_checks": {"unit_velocity": True, "default_source_weights_preserved": True,
                                         "complete_self_mutual_pairs": len(expected_pairs), "canonical_observer_origin_checked": bool(frame),
                                         "requested_medium": manifest["abec_export"].get("requested_medium"),
                                         "acoustic_medium_transfer": manifest["abec_export"].get("acoustic_medium_transfer", "legacy manifest; unspecified")},
                  "scope": "Native Gmsh import and independently reconstructed domain/source geometry; limited script field cross-check, not ABEC interpretation.",
                  "proprietary_solver_import_or_execution": "not run", "geometric_self_intersections": "Not checked by this audit", "physical_acoustic_accuracy": "not established"}
    finally:
        gmsh.finalize()
    (directory / "gmsh-import-validation.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


if __name__ == "__main__":
    report = audit(sys.argv[1])
    print(json.dumps({k: report[k] for k in ["parser", "node_count", "triangle_count", "passed", "proprietary_solver_import_or_execution"]}, indent=2))
