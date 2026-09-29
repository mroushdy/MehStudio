"""Regression mutations for nonlocal and adjacent triangle intersection tests."""
import unittest
import numpy as np
from validate_mesh import intersection_check,segment_triangle


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

    def test_separated_nearly_coplanar_pod_cap_triangles(self):
        # Exact saved 25 mm density regression, original faces181984/181989.
        # Separate radial strips on one planar cap differ from coplanarity
        # by <4e-17 m after rotation. A ~7e-22 determinant formerly invented
        # an intersection. Exact original-float barycentrics are outside:
        # u=.0116377121, v=1.0000116135, t=1.0125633012.
        vertices=[[-0.01923298686250076,-0.27012416193895067,0.08527859857621078],[-0.017507649604160958,-0.27060067487089784,0.08600688138254582],[-0.008753824802080494,-0.2607198910016626,0.0709054968814554],[-0.01744424781195557,-0.2706171295925973,0.08603203010379407],[-0.007806742020247882,-0.2609502778662321,0.07125761070885094],[-0.0087221239059778,-0.2607281183625123,0.07091807124207951]]
        for first in ([0,1,2],[2,1,0]):
            for second in ([3,4,5],[5,4,3]):
                with self.subTest(first=first,second=second):
                    self.assertTrue(intersection_check(mesh(vertices,[first,second]))['passed'])

    def test_exact_filter_preserves_true_nearly_parallel_crossing(self):
        a=np.array([[0.,0.,0.]]);b=np.array([[1.,0.,0.]]);c=np.array([[0.,1.,0.]])
        p=np.array([[.2,.2,-1e-13]]);q=np.array([[.8,.2,1e-13]])
        # The normalized determinant is ~3e-13, exercising exact fallback.
        # Its intersection (.5,.2,0) is truly inside the target triangle.
        self.assertTrue(segment_triangle(p,q,a,b,c)[0])
        vertices=[a[0].tolist(),b[0].tolist(),c[0].tolist(),p[0].tolist(),q[0].tolist(),[.2,.8,1e-13]]
        with self.assertRaisesRegex(ValueError,'intersecting_nonlocal_pairs.*1'):
            intersection_check(mesh(vertices,[[0,1,2],[3,4,5]]))

    def test_exact_filter_preserves_noncoplanar_and_coplanar_overlap(self):
        for z in (0.,1e-13):
            with self.subTest(height=z):
                vertices=[[0,0,0],[1,0,0],[0,1,0],[.2,.2,-z],[.8,.2,z],[.2,.8,z]]
                with self.assertRaisesRegex(ValueError,'intersecting_nonlocal_pairs.*1'):
                    intersection_check(mesh(vertices,[[0,1,2],[3,4,5]]))


if __name__=='__main__':
    unittest.main()
