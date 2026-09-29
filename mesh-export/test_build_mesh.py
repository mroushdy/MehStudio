import unittest, math, tempfile
from pathlib import Path
import gmsh
import numpy as np
from build_mesh import Boundary,oriented_check,refine,bridge,extruded_bridge,disk,vent_boundary,msh22,import_check
from validate_mesh import intersection_check

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

class VentTests(unittest.TestCase):
 def test_canonical_round_and_rectangle_inlets_open_into_one_domain(self):
  gmsh.initialize();gmsh.option.setNumber('General.Terminal',0)
  try:
   for shape in ('round','rectangle'):
    with self.subTest(shape=shape):
     angles=np.arange(64)*2*math.pi/64;outer=[[.1*math.cos(a),.1*math.sin(a),0] for a in angles]
     back=(np.asarray(outer)+[0,0,-.2]).tolist();mesh=Boundary()
     extruded_bridge(mesh,outer,back,12,.025);disk(mesh,back,12,.025)
     opening=([[.02*math.cos(a),.02*math.sin(a),0] for a in np.arange(128)*2*math.pi/128] if shape=='round' else [[-.03,-.01,0],[.03,-.01,0],[.03,.01,0],[-.03,.01,0]])
     inlet=(np.asarray(opening)+[0,0,-.05]).tolist()
     vent={'shape':shape,'mouth_center_m':[0,0,0],'axis_into_exterior':[0,0,1],'opening_ring_m':opening,'inlet_ring_m':inlet,'source_tag':151}
     vent_boundary(mesh,outer,vent,.025);refine(mesh,.025);result=oriented_check(mesh,-1)
     # Solid cylinder excludes the real duct bore. Independent inlet basis is
     # at z=-50mm; no source or rigid cap hides the exterior mouth at z=0.
     area=(128*.02**2*math.sin(2*math.pi/128)/2 if shape=='round' else .06*.02)
     outer_area=64*.1**2*math.sin(2*math.pi/64)/2
     self.assertAlmostEqual(result['signed_volume_m3'],-outer_area*.2+area*.05,places=12)
     self.assertAlmostEqual(result['tag_areas_m2']['151'],area,places=12)
     self.assertAlmostEqual(result['tag_areas_m2']['13'],outer_area-area,places=12)
     vertices=np.asarray(mesh.vertices);faces=np.asarray(mesh.faces);source=faces[np.asarray(mesh.tags)==151]
     self.assertTrue(np.allclose(vertices[source][:,:,2],-.05,rtol=0,atol=1e-14))
     av=np.cross(vertices[source[:,1]]-vertices[source[:,0]],vertices[source[:,2]]-vertices[source[:,0]])/2
     self.assertTrue(np.all(av[:,2]<0));self.assertTrue(intersection_check(mesh.data())['passed'])
     with tempfile.TemporaryDirectory() as directory:
      path=Path(directory)/'vent.msh';msh22(mesh,path,{12:'wall',13:'rear',151:'vent'})
      self.assertTrue(import_check(path,len(mesh.faces),mesh)['passed'])
  finally:gmsh.finalize()
if __name__=='__main__':unittest.main()
