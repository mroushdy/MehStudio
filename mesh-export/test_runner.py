"""Packaged launcher contract tests; native geometry has separate regression runs."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import run as runner


def job_fixture():
    return {'schema': runner.SCHEMA, 'manifest': {'units': {'length': 'm'}, 'design_sha256': 'abc',
            'drivers': [{'id': 'mid_01', 'source_tag': 101}, {'id': 'mid_02', 'source_tag': 102}],
            'vent_sources': [{'id': 'rear_vent_01', 'source_tag': 501}]}, 'parts': {'branches': [{}]},
            'horn': {'present': True}, 'enclosure': {'present': True}, 'options': {'volumeMesh': False}}


def completed_fixture(out, job=None):
    job = job or job_fixture()
    (out / 'abec').mkdir(parents=True, exist_ok=True)
    (out / 'boundary-lab').mkdir(parents=True, exist_ok=True)
    manifest = dict(job['manifest'], mesh_export={'intersection_validation_skipped': False})
    surface = {'open_or_nonmanifold_edges': 0, 'connected_components': 1, 'self_intersection': {'passed': True}}
    files = {'manifest.json': manifest, 'validation.json': {'bem': surface, 'front': surface,
             'bem-air-outward_import': {'passed': True, 'coordinate_connectivity_winding_and_tag_roundtrip': True},
             'front-boundary_import': {'passed': True, 'coordinate_connectivity_winding_and_tag_roundtrip': True}},
             'abec/adapter-validation.json': {'checks': {'triangle_count': 42}},
             'abec/source-map.json': {'sources': [dict(id=source['id'], physical_tag=source['source_tag'])
                 for source in job['manifest']['drivers'] + job['manifest'].get('vent_sources', [])]}}
    files['boundary-lab/adapter-validation.json'] = {'checks': {'triangle_count': 42}, 'length_unit': 'm'}
    files['boundary-lab/source-map.json'] = files['abec/source-map.json']
    for name, value in files.items():
        (out / name).write_text(json.dumps(value))
    for name in ('bem-air-outward.json', 'bem-air-outward.msh', 'abec/project.abec',
                 'abec/boundary.msh', 'abec/solving.txt', 'abec/observation.txt',
                 'boundary-lab/project.blab.json', 'boundary-lab/boundary.msh'):
        (out / name).write_text('fixture')


class RunnerTests(unittest.TestCase):
    def test_wrong_saved_design_and_wrong_units_fail_before_native_work(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'job.json'
            path.write_text('{"format":"MEH-Lab-v2","state":{}}')
            with self.assertRaisesRegex(runner.RunnerError, 'saved design JSON is not'):
                runner.load_job(path)
            job = job_fixture()
            job['manifest']['units']['length'] = 'mm'
            path.write_text(json.dumps(job))
            with self.assertRaisesRegex(runner.RunnerError, 'declare metres'):
                runner.load_job(path)

    def test_override_preserves_virtualenv_symlink_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / 'python'
            candidate.symlink_to(sys.executable)
            self.assertEqual(runner.python_path(str(candidate)), str(candidate))

    def test_node_errors_explain_installation(self):
        with patch.object(runner.shutil, 'which', return_value=None):
            with self.assertRaisesRegex(runner.RunnerError, 'Node.js 22'):
                runner.node_path()

    def test_existing_output_preserves_files_without_launching_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            job = root / 'input.json'; job.write_text(json.dumps(job_fixture()))
            out = root / 'already here'; out.mkdir(); saved = out / 'keep.txt'; saved.write_text('keep')
            with patch.object(runner.subprocess, 'Popen') as popen:
                with self.assertRaisesRegex(runner.RunnerError, 'Output already exists'):
                    runner.build(job, out, sys.executable, {})
                popen.assert_not_called()
            self.assertEqual(saved.read_text(), 'keep')

    def test_completion_requires_intersections_native_import_and_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            mutations = [('manifest.json', lambda data: data['mesh_export'].update(intersection_validation_skipped=True)),
                         ('manifest.json', lambda data: data.update(design_sha256='different')),
                         ('validation.json', lambda data: data['bem'].pop('self_intersection')),
                         ('validation.json', lambda data: data['front'].update(connected_components=2)),
                         ('validation.json', lambda data: data['bem-air-outward_import'].update(passed=False)),
                         ('abec/source-map.json', lambda data: data.update(sources=[])),
                         ('boundary-lab/source-map.json', lambda data: data.update(sources=[])),
                         ('boundary-lab/adapter-validation.json', lambda data: data.update(length_unit='mm'))]
            for name, mutate in mutations:
                completed_fixture(out)
                data = json.loads((out / name).read_text()); mutate(data); (out / name).write_text(json.dumps(data))
                with self.subTest(name=name), self.assertRaises(runner.RunnerError):
                    runner.validate_completion(out, job_fixture())
            completed_fixture(out)
            summary = runner.validate_completion(out, job_fixture())
            self.assertEqual(summary['sources'], 3)
            self.assertEqual(summary['drivers'], 2)
            self.assertEqual(summary['proprietary_solver_validation'], 'not run')
            self.assertEqual(summary['one_dense_complex128_matrix_gib'], 16 * 42**2 / 1024**3)
            (out / 'INCOMPLETE.txt').write_text('failed')
            with self.assertRaisesRegex(runner.RunnerError, 'INCOMPLETE'):
                runner.validate_completion(out, job_fixture())

    def test_exact_source_mapping_rejects_missing_extra_duplicate_or_relabelled_vents(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            changes = {
                'missing vent': lambda items: items.pop(),
                'duplicate vent': lambda items: items.append(dict(items[-1])),
                'extra source': lambda items: items.append({'id': 'unexpected', 'physical_tag': 502}),
                'wrong vent tag': lambda items: items[-1].update(physical_tag=502),
                'wrong vent id': lambda items: items[-1].update(id='different_vent'),
                'duplicate physical tag': lambda items: items[-1].update(physical_tag=101),
                'duplicate source id': lambda items: items[-1].update(id='mid_01'),
                'invalid physical tag': lambda items: items[-1].update(physical_tag=True),
            }
            for label, mutate in changes.items():
                completed_fixture(out)
                path = out / 'abec/source-map.json'
                data = json.loads(path.read_text()); mutate(data['sources']); path.write_text(json.dumps(data))
                with self.subTest(label=label), self.assertRaises(runner.RunnerError):
                    runner.validate_completion(out, job_fixture())
            # A stale emitted manifest must not redefine which sources are expected.
            missing = job_fixture(); missing['manifest']['vent_sources'] = []
            completed_fixture(out, missing)
            with self.assertRaisesRegex(runner.RunnerError, 'exactly match'):
                runner.validate_completion(out, job_fixture())
            for label, mutate in [('duplicate tag', lambda item: item.update(source_tag=101)),
                                  ('duplicate id', lambda item: item.update(id='mid_01'))]:
                job = job_fixture(); mutate(job['manifest']['vent_sources'][0]); completed_fixture(out, job)
                with self.subTest(label=label), self.assertRaisesRegex(runner.RunnerError, 'Input source definitions.*unique'):
                    runner.validate_completion(out, job)
            # Sealed inputs remain valid when no vent_sources field is present.
            sealed = job_fixture(); sealed['manifest'].pop('vent_sources'); completed_fixture(out, sealed)
            self.assertEqual(runner.validate_completion(out, sealed)['sources'], 2)

    def test_import_count_alone_cannot_replace_coordinate_connectivity_winding_tag_audit(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            for label in ('bem-air-outward_import', 'front-boundary_import'):
                for value in (False, None):
                    completed_fixture(out)
                    path = out / 'validation.json'; data = json.loads(path.read_text())
                    if value is None:
                        data[label].pop('coordinate_connectivity_winding_and_tag_roundtrip')
                    else:
                        data[label]['coordinate_connectivity_winding_and_tag_roundtrip'] = value
                    path.write_text(json.dumps(data))
                    with self.subTest(label=label, value=value), self.assertRaisesRegex(runner.RunnerError, 'roundtrip'):
                        runner.validate_completion(out, job_fixture())

    def test_requested_volume_needs_its_own_quality_record(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp); job = job_fixture(); job['options']['volumeMesh'] = True
            completed_fixture(out, job)
            with self.assertRaisesRegex(runner.RunnerError, 'FEM volume'):
                runner.validate_completion(out, job)

    def test_failed_native_process_keeps_log_job_and_incomplete_marker(self):
        with tempfile.TemporaryDirectory(prefix='MEH runner spaces ') as tmp:
            root = Path(tmp); job = root / 'my geometry.json'; job.write_text(json.dumps(job_fixture()))
            (root / 'build_mesh.py').write_text('import sys\nprint("Geometry rejected: overlap")\nsys.exit(3)\n')
            out = root / 'new bundle'
            with patch.object(runner, 'ROOT', root):
                with self.assertRaisesRegex(runner.RunnerError, 'Geometry rejected: overlap'):
                    runner.build(job, out, sys.executable, {})
            self.assertTrue((out / 'INCOMPLETE.txt').exists())
            self.assertFalse((out / 'EXPORT_COMPLETE.txt').exists())
            self.assertEqual((out / 'input-job.json').read_bytes(), job.read_bytes())
            self.assertIn('Geometry rejected: overlap', (out / 'build.log').read_text())

    def test_successful_process_with_partial_outputs_is_not_completed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); job = root / 'job.json'; job.write_text(json.dumps(job_fixture()))
            (root / 'build_mesh.py').write_text('from pathlib import Path\nimport sys\nPath(sys.argv[3]).mkdir()\n')
            out = root / 'new bundle'
            with patch.object(runner, 'ROOT', root):
                with self.assertRaisesRegex(runner.RunnerError, 'did not produce manifest.json'):
                    runner.build(job, out, sys.executable, {})
            self.assertTrue((out / 'INCOMPLETE.txt').exists())
            self.assertFalse((out / 'EXPORT_COMPLETE.txt').exists())

    def test_completed_native_process_records_exact_job_and_solver_limitations(self):
        with tempfile.TemporaryDirectory(prefix='MEH complete spaces ') as tmp:
            root = Path(tmp); template = root / 'template'; completed_fixture(template)
            job = root / 'my job.json'; job.write_text(json.dumps(job_fixture()))
            code = ('from pathlib import Path\nimport shutil, sys\n'
                    'out=Path(sys.argv[3])\n'
                    'shutil.copytree(Path(__file__).parent/"template",out,dirs_exist_ok=False)\n')
            (root / 'build_mesh.py').write_text(code)
            out = root / 'bundle'
            with patch.object(runner, 'ROOT', root):
                report = runner.build(job, out, sys.executable, {'gmsh': '4.15.2'})
            self.assertFalse((out / 'INCOMPLETE.txt').exists())
            self.assertTrue((out / 'EXPORT_COMPLETE.txt').exists())
            self.assertEqual(report['input_job_sha256'], hashlib.sha256(job.read_bytes()).hexdigest())
            self.assertEqual(report['runtime'], {'gmsh': '4.15.2'})
            self.assertEqual(report['sources'], 3)
            self.assertEqual(report['proprietary_solver_validation'], 'not run')
            self.assertIn('NOT been verified', (out / 'EXPORT_COMPLETE.txt').read_text())

    def test_archive_is_reproducible_relocatable_and_contains_exact_sources(self):
        node, _ = runner.node_path()
        with tempfile.TemporaryDirectory(prefix='MEH zip spaces ') as tmp:
            archive = Path(tmp) / 'runner.zip'
            command = [node, str(runner.ROOT / 'runner-package.cjs'), str(archive)]
            subprocess.run(command, check=True, capture_output=True)
            first = archive.read_bytes()
            subprocess.run(command, check=True, capture_output=True)
            self.assertEqual(first, archive.read_bytes())
            with zipfile.ZipFile(archive) as package:
                self.assertIsNone(package.testzip())
                self.assertTrue(all(name.startswith('MEH-local-runner/') and '..' not in name for name in package.namelist()))
                package.extractall(tmp)
            relocated = Path(tmp) / 'MEH-local-runner'
            manifest = json.loads((relocated / 'package-manifest.json').read_text())
            for name, record in manifest['files'].items():
                data = (relocated / name).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), record['sha256'])
                self.assertEqual(data, (runner.ROOT / name).read_bytes())
            help_result = subprocess.run([sys.executable, str(relocated / 'run.py'), '--help'], capture_output=True, text=True)
            self.assertEqual(help_result.returncode, 0, help_result.stderr)
            self.assertIn('does not run AKABAK', help_result.stdout)
            invalid = relocated / 'saved design.json'; invalid.write_text('{"state":{}}')
            rejected = subprocess.run([sys.executable, str(relocated / 'run.py'), str(invalid)], capture_output=True, text=True)
            self.assertEqual(rejected.returncode, 1)
            self.assertIn('saved design JSON is not', rejected.stderr)


if __name__ == '__main__':
    unittest.main()
