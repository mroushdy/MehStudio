import unittest
from build_hybrid import assemble,verify_serialized_maps,verify_provenance
import numpy as np

class HybridContract(unittest.TestCase):
    def fixture(self):
        v=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[.5,.5,1]]
        e={'vertices_m':v,'faces':[[0,1,4],[1,2,4],[2,3,4],[3,0,4]],'face_tags':[11,12,13,302]}
        t={'vertices_m':v[:4],'faces':[[0,2,1],[0,3,2]],'physical_tag':201,'branch_id':'mid_1',
           'gmsh_node_tags':[11,12,13,14],'gmsh_triangle_element_tags':[31,32]}
        return e,[t]
    def test_exact_cap_and_into_air_normal(self):
        e,t=self.fixture();b,m,r=assemble(e,t)
        self.assertAlmostEqual(r['signed_volume_m3'],1/3)
        self.assertEqual(m[0]['maximum_coordinate_error_m'],0)
        self.assertTrue(m[0]['one_to_one_nodes_and_facets'])
        self.assertEqual(m[0]['normal_sign_fem_outward_to_bem_into_air'],1)
    def test_wrong_cap_normal_is_rejected(self):
        e,t=self.fixture();t[0]['faces']=[f[::-1] for f in t[0]['faces']]
        with self.assertRaisesRegex(ValueError,'normals differ'):assemble(e,t)
    def test_moved_seam_is_rejected(self):
        e,t=self.fixture();t[0]['vertices_m']=[list(p) for p in t[0]['vertices_m']];t[0]['vertices_m'][0][0]=.001
        with self.assertRaisesRegex(ValueError,'not closed'):assemble(e,t)
    def test_missing_rigid_group_is_rejected(self):
        e,t=self.fixture();e['face_tags'][-1]=11
        with self.assertRaisesRegex(ValueError,'Missing'):assemble(e,t)
    def test_native_array_reordering_uses_stable_ids(self):
        e,t=self.fixture();b,m,_=assemble(e,t)
        tags=np.arange(1,len(b.vertices)+1)[::-1];et=np.arange(1,len(b.faces)+1)[::-1]
        points=np.array(b.vertices)[tags-1];faces=np.array(b.faces)[et-1]+1;physical={i+1:v for i,v in enumerate(b.tags)}
        verify_serialized_maps(tags,points,et,faces,physical,t,m)
        self.assertEqual(m[0]['bem_gmsh_triangle_element_tags'],[5,6])
        self.assertEqual(m[0]['bem_triangle_indices_zero_based_native_getElements2'],[1,0])
        self.assertEqual(m[0]['bem_triangle_indices_zero_based'],[4,5])
        faces[0]=faces[0][::-1]
        with self.assertRaisesRegex(ValueError,'connectivity or orientation'):verify_serialized_maps(tags,points,et,faces,physical,t,m)
    def test_provenance_mismatch_fails_closed(self):
        manifest={'design_sha256':'a'*64,'units':{'length':'m'},'axes':dict(zip('xyz',np.eye(3).tolist()))}
        report={'design_sha256':'a'*64,'passed':True}
        self.assertEqual(verify_provenance(manifest,report),'a'*64)
        with self.assertRaisesRegex(ValueError,'Branch validation design'):verify_provenance(manifest,{**report,'design_sha256':'b'*64})
        with self.assertRaisesRegex(ValueError,'did not pass'):verify_provenance(manifest,{**report,'passed':False})
        with self.assertRaisesRegex(ValueError,'Exterior design'):verify_provenance(manifest,report,[{'design_sha256':'b'*64}])
if __name__=='__main__':unittest.main()
