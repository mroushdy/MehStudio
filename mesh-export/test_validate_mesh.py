"""Regression mutations for nonlocal and adjacent triangle intersection tests."""
import unittest
from validate_mesh import intersection_check


def mesh(vertices,faces):
    return {'vertices_m':vertices,'faces':faces}


class Intersections(unittest.TestCase):
    def test_edge_neighbors_and_fold_mutation(self):
        good=mesh([[0,0,0],[1,0,0],[0,1,0],[.2,-1,0]],[[0,1,2],[1,0,3]])
        self.assertTrue(intersection_check(good)['passed'])
        # Same directed edge incidence remains valid, but the two triangles
        # now overlap away from the edge. Topology alone cannot catch this.
        good['vertices_m'][3]=[.2,.7,0]
        with self.assertRaisesRegex(ValueError,'intersecting_adjacent_pairs.*1'):
            intersection_check(good)

    def test_nonplanar_edge_neighbors_are_allowed(self):
        result=intersection_check(mesh([[0,0,0],[1,0,0],[0,1,0],[.2,.7,.01]],[[0,1,2],[1,0,3]]))
        self.assertTrue(result['passed'])

    def test_coplanar_vertex_neighbors_touch_only_vertex(self):
        self.assertTrue(intersection_check(mesh([[0,0,0],[1,0,0],[0,1,0],[-1,0,0],[0,-1,0]],[[0,1,2],[0,3,4]]))['passed'])

    def test_nearly_collinear_opposite_rays_do_not_cross(self):
        # Saved FEM-cap regression: determinant roundoff must not be divided
        # as though opposite collinear rays intersected away from their root.
        vertices=[[-.18866079,.18866079,.35675186],[-.20581177,.20581177000000006,.35675186],[-.18963287,.20431531,.35675186],[-.17150981,.17150981000000006,.35675186],[-.18598449,.17374912,.35675186]]
        self.assertTrue(intersection_check(mesh(vertices,[[2,1,0],[4,3,0]]))['passed'])

    def test_shared_endpoint_rays_with_ill_conditioned_determinant(self):
        # Opposite rays at the same vertex, with angular noise larger than a
        # floating determinant cutoff; their only intersection is the vertex.
        vertices=[[0,0,0],[.001,.001,0],[.001,-.001,0],[-.001,-.00100000000000005,0],[-.001,.001,0]]
        self.assertTrue(intersection_check(mesh(vertices,[[0,1,2],[0,3,4]]))['passed'])

    def test_collinear_overlap_beyond_shared_vertex_is_rejected(self):
        # Skipping crossing calculations at a common endpoint must not allow
        # a same-ray overlapping edge represented by different vertex IDs.
        vertices=[[0,0,0],[1,0,0],[0,1,0],[.5,0,0],[0,-1,0]]
        with self.assertRaisesRegex(ValueError,'intersecting_adjacent_pairs.*1'):
            intersection_check(mesh(vertices,[[0,1,2],[0,3,4]]))

    def test_coplanar_vertex_neighbors_overlap(self):
        with self.assertRaisesRegex(ValueError,'intersecting_adjacent_pairs.*1'):
            intersection_check(mesh([[0,0,0],[1,0,0],[0,1,0],[.9,.1,0],[.1,.9,0]],[[0,1,2],[0,3,4]]))

    def test_noncoplanar_vertex_neighbors_cross_away_from_vertex(self):
        with self.assertRaisesRegex(ValueError,'intersecting_adjacent_pairs.*1'):
            intersection_check(mesh([[0,0,0],[1,-1,0],[1,1,0],[.8,0,-1],[.8,0,1]],[[0,1,2],[0,3,4]]))

    def test_noncoplanar_vertex_neighbors_opposite_rays(self):
        result=intersection_check(mesh([[0,0,0],[1,-1,0],[1,1,0],[-.8,0,-1],[-.8,0,1]],[[0,1,2],[0,3,4]]))
        self.assertTrue(result['passed'])

    def test_nearly_parallel_planes_use_distance_to_intersection_line(self):
        vertices=[[0,0,0],[.002,0,0],[-3.5e-6,6.6e-6,0],[-.002,0,0],[.0003,.0007,7e-9]]
        self.assertTrue(intersection_check(mesh(vertices,[[0,1,2],[0,3,4]]))['passed'])
        # The same two planes really overlap if both have a positive ray.
        vertices[3]=[.0021,0,0]
        with self.assertRaisesRegex(ValueError,'intersecting_adjacent_pairs.*1'):
            intersection_check(mesh(vertices,[[0,1,2],[0,3,4]]))

    def test_good_closed_tetrahedron(self):
        result=intersection_check(mesh([[0,0,0],[1,0,0],[0,1,0],[0,0,1]],[[0,2,1],[0,1,3],[1,2,3],[2,0,3]]))
        self.assertTrue(result['passed']);self.assertEqual(result['adjacent_candidate_pairs'],6)

    def test_disjoint_vertex_nonlocal_crossing(self):
        with self.assertRaisesRegex(ValueError,'intersecting_nonlocal_pairs.*1'):
            intersection_check(mesh([[0,0,0],[1,0,0],[0,1,0],[.2,.2,-1],[.2,.2,1],[.8,.2,0]],[[0,1,2],[3,4,5]]))

    def test_small_triangles_do_not_evade_nonlocal_check(self):
        vertices=[[0,0,0],[1,0,0],[0,1,0],[.2,.2,-1],[.2,.2,1],[.8,.2,0]]
        vertices=[[x*1e-6 for x in p] for p in vertices]
        with self.assertRaisesRegex(ValueError,'intersecting_nonlocal_pairs.*1'):
            intersection_check(mesh(vertices,[[0,1,2],[3,4,5]]))


if __name__=='__main__':
    unittest.main()
