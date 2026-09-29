"""Geometry certificates, seam retention and fail-closed simplifier regressions."""
import importlib.util, pathlib, unittest, tempfile
from unittest.mock import patch
import numpy as np

FILE=pathlib.Path(__file__).resolve().parents[1]/'mesh-export'/'simplify_mesh.py'
spec=importlib.util.spec_from_file_location('simplify_mesh',FILE);s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)


def cylinder(n=12,levels=2,refinements=1):
    v=[[.02*np.cos(t),.02*np.sin(t),.04*k/levels] for k in range(levels+1) for t in np.arange(n)*2*np.pi/n];f=[];tags=[]
    for k in range(levels):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;c=(k+1)*n+(j+1)%n;d=(k+1)*n+j
            f.extend([[a,b,c],[a,c,d]]);tags.extend([10,10])
    for k,tag in [(0,302),(levels,101)]:
        center=len(v);v.append([0,0,.04*k/levels])
        for j in range(n):f.append([center,k*n+j,k*n+(j+1)%n] if k else [center,(j+1)%n,j]);tags.append(tag)
    for _ in range(refinements):
        mids={};nf=[];nt=[]
        def mid(a,b):
            key=tuple(sorted((a,b)))
            if key not in mids:mids[key]=len(v);v.append(((np.asarray(v[a])+v[b])/2).tolist())
            return mids[key]
        for (a,b,c),tag in zip(f,tags):
            d=mid(a,b);e=mid(b,c);g=mid(c,a);nf.extend([[a,d,g],[d,b,e],[g,e,c],[d,e,g]]);nt.extend([tag]*4)
        f,tags=nf,nt
    return {'vertices_m':v,'faces':f,'face_tags':tags}


class SimplificationTests(unittest.TestCase):
    def test_complete_triangle_certificate_not_just_vertices(self):
        source=np.array([[0.,0,0],[1.,0,0],[0,1.,0]])
        # All source vertices lie on target triangles, but its interior has a hole.
        targets=np.array([[[0,0,0],[.1,0,0],[0,.1,0]],[[1,0,0],[.9,0,0],[.9,.1,0]],[[0,1,0],[0,.9,0],[.1,.9,0]]],float)
        self.assertLess(s.triangle_distances(source,targets).min(axis=1).max(),1e-12)
        self.assertFalse(s.cover_triangle(source,targets,.001)[0])
        target=np.array([[[0,0,0],[1,0,0],[.5,.5,0]],[[0,0,0],[.5,.5,0],[0,1,0]]],float)
        self.assertTrue(s.cover_triangle(source,target,1e-6)[0])

    def test_opposite_normals_and_displacements_are_rejected(self):
        mesh=cylinder();flipped={**mesh,'faces':[f[::-1] for f in mesh['faces']]}
        with self.assertRaisesRegex(ValueError,'oriented'):s.directed_certificate(mesh,flipped,.00005)
        moved={**mesh,'vertices_m':(np.asarray(mesh['vertices_m'])+[.001,0,0]).tolist()}
        with self.assertRaises(ValueError):s.directed_certificate(mesh,moved,.00005)

    def test_coarsening_preserves_tags_seams_orientation_and_entire_surface(self):
        mesh=cylinder(refinements=2);result,report=s.simplify(mesh,.00005,500,check_intersections=False)
        self.assertLessEqual(len(result['faces']),len(mesh['faces']))
        self.assertLess(sum(p['after'] for p in report['patches']),len(mesh['faces']))
        self.assertTrue(report['tag_seams_preserved_exactly'])
        self.assertEqual(set(mesh['face_tags']),set(result['face_tags']))
        self.assertEqual(report['before']['euler_characteristic'],report['after']['euler_characteristic'])
        self.assertGreater(report['before']['signed_volume_m3']*report['after']['signed_volume_m3'],0)
        self.assertTrue(report['original_to_coarse']['passed']);self.assertTrue(report['coarse_to_original']['passed'])
        self.assertLessEqual(report['after']['maximum_edge_m'],report['before']['maximum_edge_m']*(1+1e-12))
        self.assertFalse(report['qualified_geometry'])
        for tag,area in report['before']['tag_areas_m2'].items():self.assertAlmostEqual(area,report['after']['tag_areas_m2'][tag],places=12)

    def test_open_input_and_excessive_tolerance_fail_closed(self):
        mesh=cylinder();mesh['faces'].pop();mesh['face_tags'].pop()
        with self.assertRaisesRegex(ValueError,'open or nonmanifold'):s.simplify(mesh)
        with self.assertRaisesRegex(ValueError,'0.001'):s.simplify(cylinder(),.001)
        with self.assertRaisesRegex(ValueError,'Tag 10'):s.simplify(cylinder(),tag_tolerances={10:.0001})

    def test_uncertifiable_patch_retains_exact_original_and_records_reason(self):
        original=cylinder(refinements=1)
        with patch.object(s,'directed_certificate',side_effect=ValueError('Deliberate certificate failure')),patch.object(s,'planar_certificate',return_value=None),patch.object(s,'piecewise_planar_certificate',return_value=None):
            result,report=s.simplify(original,target_faces=30,check_intersections=False)
        self.assertEqual(len(result['faces']),len(original['faces']))
        self.assertTrue(all(p['status']=='original-preserved' for p in report['patch_certificates']))
        self.assertTrue(all('Deliberate' in p['reason'] for p in report['patch_certificates']))
        self.assertTrue(all(v==0 for v in report['original_to_coarse']['per_tag_bounds_m'].values()))

    def test_export_round_trips_through_gmsh_with_si_coordinates_and_tags(self):
        mesh=cylinder()
        with tempfile.TemporaryDirectory() as folder:
            path=pathlib.Path(folder)/'surface.msh';s.write_msh(mesh,path);result=s.import_check(mesh,path)
        self.assertTrue(result['passed']);self.assertEqual(result['units'],'m');self.assertEqual(result['physical_tags'],[10,101,302])

    def test_planar_boundary_certificate_rejects_holes_and_reverse_winding(self):
        a={'vertices_m':[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],'faces':[[0,1,2],[0,2,3]],'face_tags':[13,13]}
        b={**a,'faces':[[0,1,3],[1,2,3]]}
        self.assertTrue(s.planar_certificate(a,b)['passed'])
        self.assertIsNone(s.planar_certificate(a,{**b,'faces':[[3,1,0],[3,2,1]]}))
        self.assertIsNone(s.planar_certificate(a,{**b,'faces':[[0,1,3]],'face_tags':[13]}))

    def test_piecewise_planar_certificate_accepts_retriangulation_but_not_retagging(self):
        original=cylinder(refinements=2);result,_=s.candidate(original,.00005,500)
        proof=s.piecewise_planar_certificate(original,result)
        self.assertTrue(proof['passed']);self.assertGreater(proof['patches_certified'],3);self.assertLess(proof['certified_upper_bound_m'],1e-9)
        changed={**result,'face_tags':[77]*len(result['faces'])}
        self.assertIsNone(s.piecewise_planar_certificate(original,changed))


if __name__=='__main__':unittest.main()
