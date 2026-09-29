"""Closed-mesh validation and exact coupling-boundary regression cases."""
import sys
import subprocess
import json
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'mesh-export'))
import coarse_exterior as coarse


def tetra():
    return {'vertices_m':[[0.,0.,0.],[1.,0.,0.],[0.,1.,0.],[0.,0.,1.]],
            'faces':[[0,2,1],[0,1,3],[1,2,3],[2,0,3]],'face_tags':[302,11,12,13]}


class CoarseExteriorChecks(unittest.TestCase):
    def test_invalid_spacing_is_rejected_before_native_meshing(self):
        for value in (0.,-1.,float('nan'),float('inf')):
            for option in ('root_band_size_m','profile_tolerance_m','maximum_edge_m'):
                with self.subTest(option=option,value=value):
                    with self.assertRaisesRegex(ValueError,'positive finite'):
                        coarse.build_structured({},**{option:value})

    def test_saved_design_root_seams_density_and_long_chord_regression(self):
        root=Path(__file__).resolve().parents[1]
        script="const G=require('./mesh-export/geometry.cjs'),{context}=require('./tests/load-editor.cjs')();process.stdout.write(JSON.stringify(G.buildGeometry(context.MEH,require('./examples/offset-insert-study.json'))))"
        job=json.loads(subprocess.run(['node','-e',script],cwd=root,check=True,capture_output=True,text=True).stdout)
        open_mesh,capped,report=coarse.build_structured(job)
        self.assertLess(len(capped['faces']),8000)
        self.assertEqual(len(capped['faces'])-len(open_mesh['faces']),512)
        self.assertEqual(report['canonical_boundary_check']['open_edges'],512)
        self.assertLessEqual(report['closure_with_diagnostic_canonical_caps']['maximum_edge_m'],.06)
        self.assertTrue(report['closure_with_diagnostic_canonical_caps']['manifold_vertices']['passed'])
        self.assertTrue(report['intersections_with_diagnostic_canonical_caps']['passed'])
        # A two-node chart seam across the root band left a5.5mm chord error;
        # canonical intermediate seam nodes bring these actual samples below1.2mm.
        for patch in report['approximation']['final_surface_samples']['patches']:
            self.assertLess(patch['maximum_sample_distance_m'],.0012)
        # The balanced comparison independently refines profile and root chart,
        # with the same canonical seams and fewer than5000 capped BEM nodes.
        _,balanced,check=coarse.build_structured(job,segments=64,profile_tolerance_m=.00025,root_band_size_m=.045,maximum_edge_m=.045)
        self.assertLessEqual(len(balanced['vertices_m']),5000)
        self.assertEqual(check['root_band_size_m'],.045)
        self.assertEqual(check['canonical_boundary_check']['open_edges'],512)
        self.assertLessEqual(check['closure_with_diagnostic_canonical_caps']['maximum_edge_m'],.045)
        self.assertTrue(check['intersections_with_diagnostic_canonical_caps']['passed'])
        for patch in check['approximation']['final_surface_samples']['patches']:
            self.assertLess(patch['maximum_sample_distance_m'],.0007)

    def test_structured_import_does_not_load_decimator(self):
        script="import coarse_exterior,sys;assert 'simplify_mesh' not in sys.modules;assert 'vtkmodules.vtkFiltersCore' not in sys.modules"
        subprocess.run([sys.executable,'-c',script],cwd=Path(coarse.__file__).parent,check=True,capture_output=True)

    def test_wall_samples_detect_azimuth_chord_error(self):
        data={'vertices_m':[[1.,0.,0.],[0.,1.,0.],[1.,0.,1.]],'faces':[[0,1,2]],'face_tags':[11]}
        profile=[{'r':1.,'z':0.},{'r':1.,'z':1.}]
        job={'horn':{'inner_profile_m':profile},'enclosure':{'outer_profile_m':profile}}
        report=coarse.sampled_revolution_deviation(data,job)
        self.assertFalse(report['global_bound'])
        self.assertAlmostEqual(report['patches'][0]['maximum_sample_distance_m'],1.-2.**-.5)

    def test_boundary_signature_rejects_motion_and_extra_holes(self):
        data=tetra();data['faces']=data['faces'][1:];data['face_tags']=data['face_tags'][1:]
        job={'parts':{'branches':[{'root_ring_m':[data['vertices_m'][i] for i in (0,2,1)]}]}}
        self.assertTrue(coarse.canonical_boundary_check(data,job)['passed'])
        data['vertices_m'][1]=[1.+1e-12,0.,0.]
        with self.assertRaisesRegex(ValueError,'canonical root seams'):
            coarse.canonical_boundary_check(data,job)
        data=tetra();data['faces']=data['faces'][2:];data['face_tags']=data['face_tags'][2:]
        with self.assertRaisesRegex(ValueError,'canonical root seams'):
            coarse.canonical_boundary_check(data,job)

    def test_vertex_link_rejects_point_touching_closed_shells(self):
        data=tetra()
        self.assertTrue(coarse.vertex_manifold_check(data)['passed'])
        data['vertices_m'] += [[-1.,0.,0.],[0.,-1.,0.],[0.,0.,-1.]]
        data['faces'] += [[0,5,4],[0,4,6],[4,5,6],[5,0,6]]
        data['face_tags'] += [11]*4
        with self.assertRaisesRegex(ValueError,'Disconnected vertex link'):
            coarse.vertex_manifold_check(data)

    def test_native_import_preserves_si_coordinates_and_all_tags(self):
        data=tetra()
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'surface.msh';coarse.write_msh(data,path)
            check=coarse.import_check(data,path)
        self.assertTrue(check['passed']);self.assertEqual(check['physical_tags'],[11,12,13,302])

    def test_closed_orientation_rejects_reversed_single_facet(self):
        data=tetra();self.assertEqual(coarse.topology(data)['euler_characteristic'],2)
        data['faces'][0].reverse()
        with self.assertRaisesRegex(ValueError,'consistently oriented'):
            coarse.topology(data)


if __name__=='__main__':unittest.main()
