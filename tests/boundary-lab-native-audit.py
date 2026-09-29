#!/usr/bin/env python3
"""Audit written Boundary Lab bundles with its real Python loader/preparation.

Usage: python -B tests/boundary-lab-native-audit.py BUNDLE_DIRECTORY [...]
       [--native-root ORIGINAL_NATIVE_DIRECTORY]
Requires Boundary Lab and its pinned BEAT contract, meshio and NumPy. Select the
installation with the Python environment/PYTHONPATH. This script is read-only:
it does not launch Julia, assemble operators, solve, or claim acoustic validity.
"""

import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import sys

import meshio
import numpy as np

import blab
from blab.config import MeshConfig
from blab.headless import (
    HeadlessSolveSpec,
    load_headless_project,
    load_headless_solve_spec,
    prepare_headless_solve,
)
from blab.mesh_topology import analyze_exterior_mesh_topology
from blab.physical_model import PhysicalSolveKind
from blab.project.io import PROJECT_SCHEMA_VERSION


def require(condition, message):
    if not condition:
        raise ValueError(message)


def close(actual, expected, message, *, absolute=2e-13):
    require(np.allclose(actual, expected, rtol=2e-12, atol=absolute), message)


def unique_by(items, key, label):
    result = {item[key]: item for item in items}
    require(len(result) == len(items), f"Duplicate {label}")
    return result


def indices(values, count, label):
    array = np.asarray(values)
    require(array.ndim == 1 and array.size > 0 and array.dtype.kind in "iu", f"Invalid {label}")
    require(np.all((array >= 0) & (array < count)), f"Out-of-range {label}")
    require(len(np.unique(array)) == len(array), f"Duplicate {label}")
    return array.astype(np.int64)


def audit_native_parity(directory, source_map, points, faces, tags, native_root):
    """Compare a bundle to native artifacts without recompiling/preparing it.

    The native directory is selected by bundle basename. Original mesh winding
    is explicitly air-outward, as declared in its native export manifest.
    """
    native_directory = Path(native_root) / Path(directory).name
    manifest_path = native_directory / "manifest.json"
    native_mesh_path = native_directory / "bem-air-outward.json"
    manifest = json.loads(manifest_path.read_text())
    native = json.loads(native_mesh_path.read_text())
    require(manifest["units"]["length"] == "m", "Original native mesh is not in SI meters")
    require(manifest["mesh_export"]["normals"] == "outward from acoustic air; BEM negative solid volume",
            "Original native manifest must explicitly declare air-outward winding")
    require(source_map["normal_convention"] == "into-air", "Export must explicitly declare into-air winding")
    require(source_map["design_sha256"] == manifest["design_sha256"], "Bundle belongs to a different design")
    original_points = np.asarray(native["vertices_m"], dtype=float)
    original_faces = np.asarray(native["faces"], dtype=np.int64)
    original_tags = np.asarray(native["face_tags"], dtype=np.int64)
    require(original_points.shape == points.shape and original_faces.shape == faces.shape
            and original_tags.shape == tags.shape, "Native mesh vertex/face counts changed")
    require(np.array_equal(original_faces[:, [0, 2, 1]], faces),
            "Emitted faces do not preserve original indices with exactly one winding reversal")
    require(np.array_equal(original_tags, source_map["original_face_tags"]),
            "Original native face tags were not preserved in provenance")

    transform = source_map["coordinate_transform"]
    rotation = np.asarray(transform["rotation_rows"], dtype=float)
    origin = np.asarray(transform["origin_m"], dtype=float)
    require(rotation.shape == (3, 3) and origin.shape == (3,)
            and np.isfinite(rotation).all() and np.isfinite(origin).all(), "Invalid rigid coordinate transform")
    close(rotation @ rotation.T, np.eye(3), "Coordinate transform is not orthogonal", absolute=1e-12)
    close(np.linalg.det(rotation), 1, "Coordinate transform is not right handed", absolute=1e-12)
    frame = manifest["observation_frame"]
    expected_rotation = np.asarray([frame[name] for name in ("horizontal", "vertical", "forward")], dtype=float)
    expected_rotation /= np.linalg.norm(expected_rotation, axis=1)[:, None]
    close(rotation, expected_rotation, "Export uses a different native observation frame", absolute=2e-14)
    require(np.array_equal(origin, frame["origin_m"]), "Export uses a different native mouth origin")
    require(transform["scale_to_m"] == 1 and transform["mesh_translation_m"] == [0, 0, 0],
            "Rebased mesh transform contains an additional scale or translation")
    expected_points = (original_points - origin) @ rotation.T
    maximum_coordinate_error = float(np.max(np.abs(points - expected_points)))
    coordinate_tolerance = 64 * np.finfo(float).eps * max(
        1.0, float(np.max(np.abs(original_points))), float(np.max(np.abs(origin))))
    require(maximum_coordinate_error <= coordinate_tolerance,
            "Emitted vertices do not preserve the native mesh under the declared rigid transform")

    original_triangles = original_points[original_faces]
    original_cross = np.cross(original_triangles[:, 1] - original_triangles[:, 0],
                              original_triangles[:, 2] - original_triangles[:, 0])
    original_double_area = np.linalg.norm(original_cross, axis=1)
    require(np.all(original_double_area > 0), "Original native mesh contains degenerate facets")
    original_normals = original_cross / original_double_area[:, None]
    original_areas = original_double_area / 2
    shifted = original_triangles - original_points[0]
    original_volume = float(np.einsum("ij,ij->i", shifted[:, 0],
                                    np.cross(shifted[:, 1], shifted[:, 2])).sum() / 6)
    require(original_volume < 0, "Original native mesh is not air-outward")
    native_checks = manifest["mesh_export"]["checks"]["bem"]
    require(native_checks["vertices"] == len(points) and native_checks["triangles"] == len(faces),
            "Native manifest counts differ from original mesh")
    unique_tags, counts = np.unique(original_tags, return_counts=True)
    require({str(int(tag)): int(count) for tag, count in zip(unique_tags, counts, strict=True)}
            == native_checks["tag_faces"], "Native manifest tag counts differ from original mesh")

    definitions = unique_by(manifest["drivers"] + manifest.get("vent_sources", []), "id", "native source IDs")
    require(set(definitions) == {source["id"] for source in source_map["sources"]},
            "Original native sources were added, removed or merged")
    native_source_tags = {int(source.get("source_tag", source.get("tag"))) for source in definitions.values()}
    rigid_indices = ~np.isin(original_tags, list(native_source_tags))
    require(np.array_equal(tags[rigid_indices], original_tags[rigid_indices]), "A rigid physical tag changed")
    projected_deltas = []
    projection_deltas = []
    for source in source_map["sources"]:
        label = source["id"]
        definition = definitions[label]
        original_tag = definition.get("source_tag", definition.get("tag"))
        require(source["physical_tag"] == original_tag, f"{label} original source tag changed")
        selected = indices(source["face_indices"], len(faces), f"{label} native parity source faces")
        require(np.array_equal(np.flatnonzero(original_tags == original_tag), np.sort(selected)),
                f"{label} original source membership changed")
        original_axis = np.asarray(definition.get("motion_into_air", definition.get(
            "motion_into_front_air", definition.get("direction"))), dtype=float)
        require(original_axis.shape == (3,) and np.isfinite(original_axis).all()
                and np.linalg.norm(original_axis) > 0, f"{label} native motion axis is invalid")
        original_axis /= np.linalg.norm(original_axis)
        close(source["original_motion_into_air"], original_axis, f"{label} original motion axis changed")
        expected_axis = rotation @ original_axis
        expected_axis /= np.linalg.norm(expected_axis)
        close(source["motion_into_air"], expected_axis, f"{label} source axis did not follow the rigid transform")
        # Original normals leave the air, hence their negative projects into it.
        original_projection = -(original_normals[selected] @ original_axis)
        require(np.all(original_projection > 0), f"{label} native source points away from the acoustic air")
        emitted_projection = np.asarray(source["normal_velocity_multipliers"], dtype=float)
        close(emitted_projection, original_projection, f"{label} normal projections changed beyond roundoff")
        original_projected_area = float(original_areas[selected] @ original_projection)
        close(source["original_projected_area_m2"], original_projected_area,
              f"{label} original projected-area provenance changed", absolute=0)
        close(source["projected_area_m2"], original_projected_area,
              f"{label} emitted projected area changed beyond roundoff", absolute=0)
        close(source["surface_area_m2"], original_areas[selected].sum(),
              f"{label} emitted physical area changed beyond roundoff", absolute=0)
        projected_deltas.append(abs(source["projected_area_m2"] / original_projected_area - 1))
        projection_deltas.append(float(np.max(np.abs(emitted_projection - original_projection))))

    return {"valid": True, "native_directory": str(native_directory.resolve()),
            "native_mesh_sha256": hashlib.sha256(native_mesh_path.read_bytes()).hexdigest(),
            "native_manifest_sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
            "native_normal_convention": "air-outward", "emitted_normal_convention": "into-air",
            "vertex_and_face_counts_unchanged": True, "single_winding_reversal": True,
            "original_face_tags_preserved": True, "rigid_right_handed_transform": True,
            "maximum_coordinate_absolute_error_m": maximum_coordinate_error,
            "coordinate_absolute_tolerance_m": coordinate_tolerance,
            "maximum_source_projection_absolute_delta": max(projection_deltas, default=0),
            "maximum_projected_source_area_relative_delta": max(projected_deltas, default=0),
            "assembly_or_solve_executed": False}


def audit(directory, native_root=None):
    directory = directory.resolve()
    project_path = directory / "project.blab.json"
    mesh_path = directory / "boundary.msh"
    source_path = directory / "source-map.json"
    raw = json.loads(project_path.read_text())
    source_map = json.loads(source_path.read_text())
    require(source_map["schema"] == "meh-boundary-lab-source-map/v1", "Unexpected source-map schema")
    require(raw["schema_version"] == PROJECT_SCHEMA_VERSION, "Export uses a different Boundary Lab schema")
    require(raw.get("symmetry") == "off", "Full physical geometry must disable symmetry")
    require(raw.get("stitch_exterior_meshes") is False, "Validated connected mesh must not be restitched")
    require(raw["project_preferences"].get("normalized_channel_correction") is False,
            "Channel normalization would alter the unit-velocity display")

    # Use the application entry points, including migration and relative paths.
    project = load_headless_project(project_path)
    prepared = prepare_headless_solve(project, HeadlessSolveSpec(), backend_id="beat_cpu")
    compiled = prepared.request.compiled_system
    require(prepared.solve_kind == PhysicalSolveKind.EXTERIOR_BEM, "Expected a single exterior BEM problem")
    require(project.preferences.normalized_channel_correction is False, "Loaded preferences normalized channels")
    require(len(compiled.meshes) == 1 and len(compiled.regions) == 1 and not compiled.interfaces,
            "Front passages and exterior must remain one connected acoustic domain")
    resource = compiled.meshes[0]
    require(resource.scale_to_m == 1.0, "Mesh must import in SI meters without scaling")
    require(Path(resource.file).resolve() == mesh_path, "Loader did not resolve the portable boundary mesh")
    require(raw["physical_system"]["meshes"][0]["file"] == "boundary.msh", "Mesh path must be relative")
    require(np.asarray(resource.translation_m).shape == (3,) and np.isfinite(resource.translation_m).all(),
            "Invalid project mesh translation")
    require(tuple(resource.translation_m) == (0, 0, 0), "Rebased mesh must have zero resource translation")
    require(len(raw.get("imported_meshes", [])) == 1, "GUI must contain the same single imported mesh")
    imported = raw["imported_meshes"][0]
    require(imported["source_file"] == "boundary.msh" and imported["scale_factor"] == 1.0,
            "GUI mesh path or SI scale differs from the physical system")
    require(imported["cleaned_file"] == "boundary.msh", "GUI must retain the completed mesh without re-cleaning")
    close(np.asarray(imported["translation_mm"]) / 1000, resource.translation_m,
          "GUI and physical-system translations differ")

    mesh = meshio.read(mesh_path)
    require(mesh.cells and all(cell.type == "triangle" for cell in mesh.cells), "Only linear triangles are allowed")
    points = np.asarray(mesh.points, dtype=float)
    faces = np.vstack([cell.data for cell in mesh.cells])
    tags = np.concatenate(mesh.cell_data["gmsh:physical"])
    require(np.isfinite(points).all(), "Nonfinite mesh coordinates")
    triangle = points[faces]
    cross = np.cross(triangle[:, 1] - triangle[:, 0], triangle[:, 2] - triangle[:, 0])
    double_area = np.linalg.norm(cross, axis=1)
    require(np.all(double_area > 0), "Degenerate source/rigid triangle")
    normals, areas = cross / double_area[:, None], double_area / 2
    original_tags = np.asarray(source_map["original_face_tags"], dtype=np.int64)
    require(original_tags.shape == tags.shape, "Original face provenance does not cover the mesh")
    fields = {int(value[0]): (name, int(value[1])) for name, value in mesh.field_data.items()}
    require(len(fields) == len(mesh.field_data) and set(fields) == set(map(int, tags)),
            "Physical names must identify every present physical tag exactly once")
    require(all(dimension == 2 for _, dimension in fields.values()), "Non-surface physical name")

    topology = analyze_exterior_mesh_topology((MeshConfig(
        name=resource.name, file=resource.file, scale_factor=resource.scale_to_m,
        translation_m=resource.translation_m,
    ),), symmetry="off")
    require(not topology.has_warnings, "Boundary Lab detects open/nonmanifold edges")
    edges = np.concatenate((faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]))
    _, edge_index, incidence = np.unique(np.sort(edges, axis=1), axis=0,
                                        return_inverse=True, return_counts=True)
    signs = np.where(edges[:, 0] < edges[:, 1], 1, -1)
    require(np.all(incidence == 2) and np.all(np.bincount(edge_index, weights=signs) == 0),
            "Connected mesh has inconsistent facet winding")
    shifted = triangle - points[0]
    signed_volume = float(np.einsum("ij,ij->i", shifted[:, 0],
                                  np.cross(shifted[:, 1], shifted[:, 2])).sum() / 6)
    require(signed_volume > 0, "Exterior normals do not point out of the enclosed solid into air")

    boundaries = {boundary.id: boundary for boundary in compiled.boundaries}
    require(len(boundaries) == len(compiled.boundaries), "Duplicate compiled boundary IDs")
    boundary_tags = [boundary.group.tag for boundary in compiled.boundaries]
    require(len(set(boundary_tags)) == len(boundary_tags) and set(boundary_tags) == set(map(int, tags)),
            "Every mesh face must be covered by exactly one compiled boundary")
    for boundary in boundaries.values():
        require(boundary.group.mesh_id == resource.id and boundary.group.dimension == 2,
                "Boundary selects a different resource or dimension")
        require(boundary.group.name == fields[boundary.group.tag][0], "Compiled physical name/tag mismatch")

    sources = source_map["sources"]
    unique_by(sources, "id", "source IDs")
    unique_by(sources, "physical_tag", "original source tags")
    expected_components = unique_by(sources, "component_id", "source components")
    expected_ports = unique_by(sources, "excitation_port_id", "source excitation ports")
    unique_by(sources, "channel_name", "source channels")
    components = {component.id: component for component in compiled.components}
    ports = {port.id: port for port in compiled.excitation_ports}
    require(set(components) == set(expected_components) and set(ports) == set(expected_ports),
            "Independent source components/ports were added, dropped or merged")
    require(set(prepared.request.excitation_port_ids) == set(expected_ports), "Preparation dropped a source basis")
    for port_id, channel in zip(prepared.request.excitation_port_ids, prepared.excitation_channel_names, strict=True):
        require(channel == expected_ports[port_id]["channel_name"], "Prepared source channel routing differs")
    require(project.component_channel_by_id == {s["component_id"]: s["channel_name"] for s in sources},
            "Project channel assignments are incomplete")
    require(set(raw["channel_config_by_name"]) == {s["channel_name"] for s in sources},
            "GUI channel configurations are incomplete")

    source_faces = set()
    moving_boundaries = set()
    normalization = compiled.metadata["acoustic_impedance_normalization"]
    reports = []
    for source in sources:
        label = source["id"]
        selected = indices(source["face_indices"], len(faces), f"{label} source face indices")
        require(not source_faces.intersection(selected), f"{label} overlaps another source")
        source_faces.update(map(int, selected))
        require(np.array_equal(np.flatnonzero(original_tags == source["physical_tag"]), np.sort(selected)),
                f"{label} source provenance is incomplete")
        weights = np.asarray(source["normal_velocity_multipliers"], dtype=float)
        require(weights.shape == selected.shape and np.isfinite(weights).all() and np.all(weights > 0),
                f"{label} invalid normal velocity projections")
        axis = np.asarray(source["motion_into_air"], dtype=float)
        close(np.linalg.norm(axis), 1, f"{label} motion axis is not a unit vector")
        close(normals[selected] @ axis, weights, f"{label} projection differs from imported facet normals")
        close(areas[selected].sum(), source["surface_area_m2"], f"{label} physical source area changed")
        projected_area = float(areas[selected] @ weights)
        close(projected_area, source["projected_area_m2"], f"{label} projected source area changed")
        if "physical_tags" in source:
            require(np.array_equal(tags[selected], source["physical_tags"]), f"{label} facet physical tags changed")
        component = components[source["component_id"]]
        port = ports[source["excitation_port_id"]]
        require(component.kind == "ideal_velocity_source" and port.kind == "normal_velocity"
                and port.component_id == component.id, f"{label} is not an independent velocity basis")
        require(component.parameters["motion_profile"] == "uniform", f"{label} unexpected motion profile")
        groups = source["projection_groups"]
        require(set(component.boundary_ids) == {group["boundary_id"] for group in groups},
                f"{label} compiled boundary ownership changed")
        require(set(component.parameters["boundary_motion_weights"]) == set(component.boundary_ids),
                f"{label} omitted a motion weight")
        group_faces = set()
        index_to_weight = dict(zip(map(int, selected), weights, strict=True))
        for group in groups:
            boundary_id = group["boundary_id"]
            moving_boundaries.add(boundary_id)
            boundary = boundaries[boundary_id]
            require(boundary.kind == "moving" and boundary.group.tag == group["physical_tag"],
                    f"{label} moving boundary/tag changed")
            group_indices = indices(group["face_indices"], len(faces), f"{label} projection-group indices")
            require(not group_faces.intersection(group_indices), f"{label} projection groups overlap")
            group_faces.update(map(int, group_indices))
            require(np.array_equal(np.flatnonzero(tags == group["physical_tag"]), np.sort(group_indices)),
                    f"{label} projection group does not match imported facets")
            weight = group["normal_velocity_multiplier"]
            require(component.parameters["boundary_motion_weights"][boundary_id] == weight,
                    f"{label} motion weight lost precision during compilation")
            require(all(index_to_weight.get(int(index)) == weight for index in group_indices),
                    f"{label} unequal facet weights were grouped or rounded")
        require(group_faces == set(map(int, selected)), f"{label} projection groups omit source facets")
        close(normalization[component.id]["effective_area_m2"], projected_area,
              f"{label} Boundary Lab compiler used the wrong source normalization area")
        request_path = directory / "requests" / f"source-{source['physical_tag']}.json"
        request_spec = load_headless_solve_spec(request_path)
        require(request_spec.excitation_port_ids == (source["excitation_port_id"],),
                f"{label} independent-source request selects the wrong basis")
        single = prepare_headless_solve(project, request_spec, backend_id="beat_cpu")
        require(single.request.excitation_port_ids == (source["excitation_port_id"],),
                f"{label} prepared independent-source request selects the wrong basis")
        reports.append({"id": label, "source_type": source["source_type"],
                        "faces": len(selected), "projection_groups": len(groups),
                        "surface_area_m2": float(areas[selected].sum()),
                        "projected_area_m2": projected_area, "channel": source["channel_name"],
                        "independent_source_request_prepared": True})
    require({b.id for b in boundaries.values() if b.kind == "moving"} == moving_boundaries,
            "Unexpected moving boundary outside the independent source map")
    require(all(b.kind == "rigid" for b in boundaries.values() if b.id not in moving_boundaries),
            "Non-source boundary has an unsupported physical condition")

    parity = (audit_native_parity(directory, source_map, points, faces, tags, native_root)
              if native_root is not None else None)
    return {"bundle": str(directory), "valid": True, "project_schema_version": PROJECT_SCHEMA_VERSION,
            "solve_kind": prepared.solve_kind.value, "backend": "beat_cpu",
            "vertices": len(points), "triangles": len(faces), "boundaries": len(boundaries),
            "open_edges": topology.open_edge_count, "nonmanifold_edges": topology.nonmanifold_edge_count,
            "consistent_winding": True, "signed_volume_m3": signed_volume,
            "mesh_translation_m": list(resource.translation_m), "sources": reports,
            "mesh_sha256": hashlib.sha256(mesh_path.read_bytes()).hexdigest(),
            "original_native_mesh_parity": parity,
            "assembly_or_solve_executed": False, "julia_native_loader_executed": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundles", type=Path, nargs="+")
    parser.add_argument("--native-root", type=Path,
                        help="Original native artifacts, in one subdirectory per bundle basename")
    args = parser.parse_args()
    results = []
    for directory in args.bundles:
        try:
            # meshio can print blank/progress lines; stdout remains one JSON document.
            with contextlib.redirect_stdout(io.StringIO()):
                results.append(audit(directory, native_root=args.native_root))
        except Exception as exc:
            results.append({"bundle": str(directory.resolve()), "valid": False,
                            "error_type": type(exc).__name__, "error": str(exc)})
    valid = all(result["valid"] for result in results)
    print(json.dumps({"valid": valid, "boundary_lab_module": blab.__file__,
                      "validation": "actual Boundary Lab Python loader, compiler and solve preparation",
                      "acoustic_solve_executed": False, "bundles": results}, indent=2, allow_nan=False))
    return 0 if valid else 1


if __name__ == "__main__":
    sys.exit(main())
