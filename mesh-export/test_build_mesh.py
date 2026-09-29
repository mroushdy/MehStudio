import unittest
from build_mesh import Boundary,oriented_check,refine

class BoundaryTests(unittest.TestCase):
 def tetra(self):
  b=Boundary();b.vertices=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]];b.faces=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];b.tags=[10,10,101,11];return b
 def test_volume_and_orientation(self):
  b=self.tetra();r=oriented_check(b,1);self.assertAlmostEqual(r['signed_volume_m3'],1/6);self.assertEqual(r['connected_components'],1)
  r=oriented_check(b,-1);self.assertAlmostEqual(r['signed_volume_m3'],-1/6)
 def test_open_surface_rejected(self):
  b=self.tetra();b.faces.pop();b.tags.pop()
  with self.assertRaisesRegex(ValueError,'not closed'):oriented_check(b)
 def test_disconnected_components_rejected(self):
  b=self.tetra();v=list(b.vertices);b.vertices += [[x+3,y,z] for x,y,z in v];b.faces += [[i+4 for i in f] for f in list(b.faces)];b.tags*=2
  with self.assertRaisesRegex(ValueError,'Disconnected'):oriented_check(b)
 def test_refinement_preserves_volume_tags_closure(self):
  b=self.tetra();r=oriented_check(b);refine(b,.3);q=oriented_check(b)
  self.assertAlmostEqual(q['signed_volume_m3'],r['signed_volume_m3']);self.assertLessEqual(q['maximum_edge_m'],.3*(1+1e-9));self.assertEqual(set(b.tags),{10,11,101})
if __name__=='__main__':unittest.main()
