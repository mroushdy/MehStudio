"""Native vent regression for translated, tilted domains and mismatched rings.

Complements the axial analytic volume fixtures in test_build_mesh.py. No
proprietary parser or acoustic solve is exercised. Requires the native runtime.
"""
import math
from pathlib import Path
import tempfile
import unittest

import gmsh
import numpy as np

from build_mesh import Boundary, vent_boundary, extruded_bridge, disk, refine, oriented_check, msh22, import_check
from validate_mesh import intersection_check


class TransformedVentTests(unittest.TestCase):
    def test_tilted_round_and_rectangle_keep_exact_canonical_inlet(self):
        gmsh.initialize()
        gmsh.option.setNumber('General.Terminal', 0)
        try:
            for shape in ('round', 'rectangle'):
                with self.subTest(shape=shape):
                    tilt = .61
                    rotation = np.array([[1, 0, 0], [0, math.cos(tilt), -math.sin(tilt)], [0, math.sin(tilt), math.cos(tilt)]])
                    center = np.array([.03, -.02, .01])
                    u, v, axis = rotation[:, 0], rotation[:, 1], -rotation[:, 2]

                    def ring(points, base):
                        return [(base + x*u + y*v).tolist() for x, y in points]

                    outer = ring([(.15*math.cos(a), .15*math.sin(a)) for a in np.linspace(0, 2*math.pi, 80, endpoint=False)], center)
                    uv = (np.array([[.025*math.cos(a), .025*math.sin(a)] for a in np.linspace(0, 2*math.pi, 128, endpoint=False)])
                          if shape == 'round' else np.array([[-.04, -.012], [.04, -.012], [.04, .012], [-.04, .012]]))
                    opening, inlet = ring(uv, center), ring(uv, center-axis*.1)
                    target = abs((uv[:, 0]*np.roll(uv[:, 1], -1)-uv[:, 1]*np.roll(uv[:, 0], -1)).sum()/2)
                    vent = {'shape': shape, 'mouth_center_m': center.tolist(), 'axis_into_exterior': axis.tolist(),
                            'opening_ring_m': opening, 'inlet_ring_m': inlet, 'source_tag': 151}
                    mesh = Boundary()
                    vent_boundary(mesh, outer, vent, .025)
                    front = (np.asarray(outer)-axis*.4).tolist()
                    extruded_bridge(mesh, outer, front, 12, .025)
                    disk(mesh, front, 12, .025)
                    refine(mesh, .025)
                    oriented_check(mesh, -1)
                    vertices = np.asarray(mesh.vertices)
                    faces = np.asarray(mesh.faces)[np.asarray(mesh.tags) == 151]
                    cross = np.cross(vertices[faces[:, 1]]-vertices[faces[:, 0]], vertices[faces[:, 2]]-vertices[faces[:, 0]])/2
                    projection = -np.einsum('ij,j->i', cross, axis)
                    self.assertTrue(np.all(projection > 0))
                    self.assertLess(abs(float(projection.sum())/target-1), 1e-12)
                    # Every canonical ring point, especially rectangle corners,
                    # survives on this oblique plane despite a different outer count.
                    for point in opening + inlet:
                        self.assertEqual(float(np.min(np.linalg.norm(vertices-point, axis=1))), 0.)
                    self.assertLess(float(np.max(np.abs(np.einsum('ijk,k->ij', vertices[faces]-np.asarray(inlet[0]), axis)))), 1e-13)
                    self.assertTrue(intersection_check(mesh.data())['passed'])
                    with tempfile.TemporaryDirectory() as directory:
                        path = Path(directory)/'tilted-vent.msh'
                        msh22(mesh, path, {12: 'exterior', 13: 'rear_annulus', 151: 'vent_source'})
                        self.assertTrue(import_check(path, len(mesh.faces), mesh)['passed'])
        finally:
            gmsh.finalize()


if __name__ == '__main__':
    unittest.main()
