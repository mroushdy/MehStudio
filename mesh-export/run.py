#!/usr/bin/env python3
"""Portable, dependency-free launcher for the MEH acoustic mesh exporter.

Only --setup installs packages, into this runner's own .venv. A normal run uses
that environment (or an explicitly supplied interpreter), preserves the input,
and never overwrites an output directory. It does not run AKABAK.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
SCHEMA = 'meh-acoustic-geometry/v1'


class RunnerError(Exception):
    pass


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise RunnerError(f'Cannot read JSON file {path.name}: {error}') from error


def load_job(path):
    job = read_json(path)
    if not isinstance(job, dict) or job.get('schema') != SCHEMA:
        raise RunnerError('Choose MEH_acoustic_geometry.json from Export > Acoustic solver export > Download geometry job. A saved design JSON is not a geometry job.')
    manifest = job.get('manifest')
    if not isinstance(manifest, dict) or not isinstance(manifest.get('units'), dict) or manifest['units'].get('length') != 'm':
        raise RunnerError('The job must declare metres. Export a fresh geometry job from MEH Studio.')
    if (not isinstance(job.get('parts'), dict) or not isinstance(job['parts'].get('branches'), list)
            or not job['parts']['branches'] or not isinstance(job.get('horn'), dict)
            or not isinstance(job.get('enclosure'), dict) or not isinstance(job.get('options', {}), dict)):
        raise RunnerError('The geometry job is incomplete. Export it again from MEH Studio.')
    return job


def python_path(override=None):
    if override:
        candidate = shutil.which(override) or override
        if not Path(candidate).is_file():
            raise RunnerError(f'Python interpreter was not found: {override}')
        return str(Path(candidate).absolute())
    candidate = ROOT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if not candidate.is_file():
        raise RunnerError('Run setup first: python run.py --setup (macOS/Linux: python3 run.py --setup). See START_HERE.md.')
    return str(candidate)


def node_path():
    node = shutil.which('node')
    if not node:
        raise RunnerError('Install Node.js 22 or newer from https://nodejs.org/, then reopen this terminal. Node is required to write the ABEC project.')
    result = subprocess.run([node, '--version'], capture_output=True, text=True)
    try:
        major = int(result.stdout.strip().lstrip('v').split('.')[0])
    except ValueError:
        major = 0
    if result.returncode or major < 22:
        raise RunnerError('Node.js 22 or newer is required. Install it from https://nodejs.org/ and reopen this terminal.')
    return node, result.stdout.strip()


def runtime_info(python):
    code = ('import json, sys, gmsh, numpy, scipy; '
            'gmsh.initialize(); gmsh.finalize(); '
            'print(json.dumps({"python":sys.version.split()[0],"gmsh":gmsh.__version__,"numpy":numpy.__version__,"scipy":scipy.__version__}))')
    result = subprocess.run([python, '-c', code], capture_output=True, text=True)
    if result.returncode:
        detail = result.stderr.strip().splitlines()[-1:]
        raise RunnerError('The native meshing libraries could not load. Run --setup again. On Linux, a missing libGLU.so.1 needs your system\'s GLU package (Ubuntu/Debian: libglu1-mesa). Details: ' + ' '.join(detail))
    try:
        versions = json.loads(result.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise RunnerError('The native runtime did not return its version information.')
    if versions.get('gmsh') != '4.15.2':
        raise RunnerError('This runner requires Gmsh 4.15.2. Run --setup or select a matching interpreter with --python.')
    return versions


def setup():
    if not (3, 10) <= sys.version_info[:2] <= (3, 13):
        raise RunnerError('Setup requires Python 3.10–3.13. Install Python 3.12 from https://www.python.org/downloads/, then use it to run --setup.')
    node_path()
    target = ROOT / '.venv'
    if target.exists() and not (target / 'pyvenv.cfg').is_file():
        raise RunnerError('A .venv folder already exists but is not a Python environment. Move that folder aside before setup.')
    print('Installing meshing libraries into this runner’s .venv folder. Internet access is required; system Python packages are unchanged.', flush=True)
    result = subprocess.run([sys.executable, '-m', 'venv', str(target)])
    if result.returncode:
        raise RunnerError('Could not create the local Python environment. On Linux, install the python3-venv system package. See START_HERE.md.')
    python = python_path()
    result = subprocess.run([python, '-m', 'pip', 'install', '--no-cache-dir', '--only-binary=:all:', '--requirement', str(ROOT / 'requirements.txt')])
    if result.returncode:
        raise RunnerError('Dependency installation failed. Check your connection and Python version, then retry --setup. This package supports macOS Intel/Apple Silicon, Windows x64 and Linux x64; see START_HERE.md.')
    versions = runtime_info(python)
    print('Setup complete: ' + ', '.join(f'{k} {v}' for k, v in versions.items()))


def validate_completion(out, job):
    if (out / 'INCOMPLETE.txt').exists():
        raise RunnerError('The mesher left an INCOMPLETE marker. This is not a completed solver bundle.')
    required = ('manifest.json', 'validation.json', 'bem-air-outward.json', 'bem-air-outward.msh',
                'abec/project.abec', 'abec/boundary.msh', 'abec/solving.txt', 'abec/observation.txt',
                'abec/source-map.json', 'abec/adapter-validation.json')
    for name in required:
        if not (out / name).is_file() or (out / name).stat().st_size == 0:
            raise RunnerError(f'The mesher did not produce {name}. This is not a completed solver bundle.')
    manifest = read_json(out / 'manifest.json')
    checks = read_json(out / 'validation.json')
    adapter = read_json(out / 'abec/adapter-validation.json')
    if manifest.get('design_sha256') != job['manifest'].get('design_sha256'):
        raise RunnerError('Output provenance does not match the input job.')
    if manifest.get('mesh_export', {}).get('intersection_validation_skipped') is not False:
        raise RunnerError('Full intersection validation was not recorded. This bundle cannot be marked complete.')
    for label in ('bem', 'front'):
        surface = checks.get(label, {})
        if (surface.get('open_or_nonmanifold_edges') != 0 or surface.get('connected_components') != 1
                or surface.get('self_intersection', {}).get('passed') is not True):
            raise RunnerError(f'The {label} surface did not pass all topology and intersection gates.')
    for label in ('bem-air-outward_import', 'front-boundary_import'):
        imported = checks.get(label, {})
        if (imported.get('passed') is not True
                or imported.get('coordinate_connectivity_winding_and_tag_roundtrip') is not True):
            raise RunnerError('Native Gmsh coordinate, connectivity, winding and tag roundtrip was not verified.')
    if job.get('options', {}).get('volumeMesh') is True and checks.get('volume', {}).get('positive_jacobians') is not True:
        raise RunnerError('The requested experimental FEM volume did not pass its quality gate.')
    count = adapter.get('checks', {}).get('triangle_count')
    if not isinstance(count, int) or count < 1:
        raise RunnerError('ABEC adapter validation is missing its triangle count.')
    source_map = read_json(out / 'abec/source-map.json')
    sources = source_map.get('sources', [])
    def definitions(metadata):
        drivers, vents = metadata.get('drivers', []), metadata.get('vent_sources', [])
        if not isinstance(drivers, list) or not isinstance(vents, list):
            raise RunnerError('Driver and vent source definitions must be lists.')
        return drivers + vents

    def mapping(items, tag_field, label):
        if not isinstance(items, list) or not items:
            raise RunnerError(label + ' must contain every driver and vent source.')
        result, ids = {}, set()
        for item in items:
            if not isinstance(item, dict):
                raise RunnerError(label + ' contains an invalid source definition.')
            tag, source_id = item.get(tag_field), item.get('id')
            if (type(tag) is not int or tag < 1 or not isinstance(source_id, str) or not source_id
                    or tag in result or source_id in ids):
                raise RunnerError(label + ' must have unique source ids and positive physical tags.')
            result[tag] = source_id
            ids.add(source_id)
        return result

    expected = mapping(definitions(job['manifest']), 'source_tag', 'Input source definitions')
    exported = mapping(definitions(manifest), 'source_tag', 'Output source definitions')
    actual = mapping(sources, 'physical_tag', 'ABEC source map')
    if exported != expected or actual != expected:
        raise RunnerError('The ABEC source map and output manifest must exactly match all input driver and vent sources.')
    return {'triangles': count, 'sources': len(sources), 'drivers': len(manifest.get('drivers', [])),
            'one_dense_complex128_matrix_gib': 16 * count * count / 1024**3,
            'proprietary_solver_validation': 'not run', 'acoustic_convergence': 'not established'}


def build(job_path, out, python, versions, size_mm=None, profile_tolerance_mm=None):
    job_path = job_path.resolve()
    job = load_job(job_path)
    # mkdir(exist_ok=False) is the guard, including concurrent launches. Never
    # re-use a failed or successful directory, and never delete user files.
    try:
        out.mkdir(parents=True, exist_ok=False)
    except FileExistsError:
        raise RunnerError(f'Output already exists: {out}. Choose a new --out folder; previous files are preserved.')
    marker = out / 'INCOMPLETE.txt'
    marker.write_text('Export is in progress or failed. Do not import this folder.\n', encoding='utf-8')
    started = time.monotonic()
    input_copy = out / 'input-job.json'
    shutil.copyfile(job_path, input_copy)
    native_out = out / '_native_in_progress'
    command = [python, '-u', str(ROOT / 'build_mesh.py'), str(input_copy), '--out', str(native_out)]
    if size_mm is not None:
        command += ['--size-mm', str(size_mm)]
    if profile_tolerance_mm is not None:
        command += ['--profile-tolerance-mm', str(profile_tolerance_mm)]
    # No skip-intersections or shell passthrough: every packaged export retains
    # the release geometry gates and argument boundaries (including spaces).
    log_path = out / 'build.log'
    print(f'Building and checking geometry. This can take several minutes. Progress is saved in {log_path}', flush=True)
    if job.get('options', {}).get('volumeMesh'):
        print('Experimental FEM volume requested. A failed volume gate withholds completion of this run.', flush=True)
    try:
        with log_path.open('w', encoding='utf-8') as log:
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
            try:
                while True:
                    try:
                        code = process.wait(timeout=30)
                        break
                    except subprocess.TimeoutExpired:
                        print(f'Still meshing/checking ({int(time.monotonic() - started)} seconds). See build.log for details.', flush=True)
            except BaseException:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                raise
        if code:
            tail = log_path.read_text(encoding='utf-8', errors='replace').splitlines()[-8:]
            raise RunnerError('Meshing failed; no completed bundle was released.\n' + '\n'.join(tail)[-3000:] + '\nFull details: ' + str(log_path))
        summary = validate_completion(native_out, job)
        # Native files use relative project references. Publish them only after
        # all native gates pass, into this runner's exclusively owned folder.
        for child in native_out.iterdir():
            destination = out / child.name
            if destination.exists():
                raise RunnerError('Unexpected output-name collision: ' + child.name)
            child.rename(destination)
        native_out.rmdir()
        summary.update(schema='meh-mesh-run/v1', input_job_sha256=hashlib.sha256(input_copy.read_bytes()).hexdigest(),
                       design_sha256=job['manifest'].get('design_sha256'), runtime=versions,
                       elapsed_seconds=round(time.monotonic() - started, 2))
        package = ROOT / 'package-manifest.json'
        if package.is_file():
            summary['runner_package'] = read_json(package)
        (out / 'runner-report.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
        (out / 'EXPORT_COMPLETE.txt').write_text(
            'Geometry and adapter checks completed. Open abec/project.abec in AKABAK to inspect/import.\n'
            'AKABAK/ABEC import and solve have NOT been verified by this runner. No acoustic response was calculated.\n'
            'Read abec/README.txt, validation.json and runner-report.json before solving.\n', encoding='utf-8')
        marker.unlink()
        print(f'Geometry export complete: {out}\nProject for AKABAK inspection: {out / "abec/project.abec"}\n'
              f'{summary["triangles"]:,} triangles; {summary["sources"]} independent sources.\n'
              f'One dense complex128 matrix: {summary["one_dense_complex128_matrix_gib"]:.2f} GiB (not measured solver memory).\n'
              'AKABAK import/solve and acoustic convergence remain unverified; no response has been calculated.', flush=True)
        return summary
    except BaseException:
        marker.write_text('Export failed or was interrupted. Do not import this folder. Read build.log and retry with a new output folder.\n', encoding='utf-8')
        (out / 'EXPORT_COMPLETE.txt').unlink(missing_ok=True)
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('job', nargs='?', help='MEH_acoustic_geometry.json downloaded from the editor')
    parser.add_argument('--out', help='New output folder (must not already exist)')
    parser.add_argument('--setup', action='store_true', help='Install pinned dependencies into the runner’s own .venv')
    parser.add_argument('--check', action='store_true', help='Check native libraries and Node without meshing')
    parser.add_argument('--python', help='Use an existing Python interpreter with native dependencies, without installing')
    parser.add_argument('--size-mm', type=float, help='Override the global surface edge target (0.5–60 mm); not a validated frequency band')
    parser.add_argument('--profile-tolerance-mm', type=float, help='Optional meridian-profile coarsening tolerance (0–0.2 mm); default retains the exact profile')
    args = parser.parse_args(argv)
    try:
        if args.setup:
            if args.job or args.python or args.out or args.check:
                raise RunnerError('Run --setup on its own, then run the geometry job separately.')
            setup()
            return 0
        if not args.job and not args.check:
            parser.print_help()
            return 0
        if args.size_mm is not None and not .5 <= args.size_mm <= 60:
            raise RunnerError('--size-mm must be from 0.5 to 60 mm.')
        if args.profile_tolerance_mm is not None and not 0 <= args.profile_tolerance_mm <= .2:
            raise RunnerError('--profile-tolerance-mm must be from 0 to 0.2 mm.')
        if args.job:
            load_job(Path(args.job).expanduser())
        _, node_version = node_path()
        python = python_path(args.python)
        versions = runtime_info(python)
        versions['node'] = node_version
        if args.check:
            print('Runtime ready: ' + ', '.join(f'{k} {v}' for k, v in versions.items()))
            if not args.job:
                return 0
        job_path = Path(args.job).expanduser().resolve()
        suffix = datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
        out = Path(args.out).expanduser().resolve() if args.out else job_path.parent / ('MEH_solver_bundle_' + suffix)
        build(job_path, out, python, versions, args.size_mm, args.profile_tolerance_mm)
        return 0
    except (RunnerError, OSError) as error:
        print('Export unavailable: ' + str(error), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('Export cancelled. An unfinished output folder is marked INCOMPLETE; retry with a new folder.', file=sys.stderr)
        return 130


if __name__ == '__main__':
    sys.exit(main())
