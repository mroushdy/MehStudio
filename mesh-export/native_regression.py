"""Reproduce the public surface-export matrix with real Gmsh and full gates.

Generate jobs with regression-suite.cjs first. This checks geometry and native
file import, never proprietary AKABAK interpretation or acoustic convergence.
"""
import argparse, concurrent.futures, hashlib, json, subprocess, sys, time
from pathlib import Path


def run_case(case,jobs,out,size=None):
    case=dict(case);name=case['id']+(f'-{size}mm' if size else '')
    directory=out/name;log=out/(name+'.log');job=jobs/case['job'];started=time.monotonic()
    if hashlib.sha256(job.read_bytes()).hexdigest()!=case['job_file_sha256']:raise ValueError('Job bytes changed: '+name)
    args=list(case['native_arguments'])
    if size:args[args.index('--size-mm')+1]=str(size)
    with log.open('w') as stream:
        result=subprocess.run([sys.executable,str(Path(__file__).with_name('build_mesh.py')),str(job),'--out',str(directory),*args],stdout=stream,stderr=subprocess.STDOUT)
        if result.returncode or (directory/'INCOMPLETE.txt').exists():raise ValueError('Build failed: '+name+'; inspect '+log.name)
        audit=Path(__file__).resolve().parent.parent/'tests/abec-native-audit.py'
        result=subprocess.run([sys.executable,str(audit),str(directory/'abec')],stdout=stream,stderr=subprocess.STDOUT)
        if result.returncode:raise ValueError('ABEC native mesh audit failed: '+name+'; inspect '+log.name)
    manifest=json.loads((directory/'manifest.json').read_text());checks=json.loads((directory/'validation.json').read_text());bem=checks['bem']
    expected=case['expected'];tags=set(map(int,bem['tag_faces']));source_tags={c['source_tag'] for c in bem['source_checks']}
    assert source_tags==set(expected['source_tags']), 'Independent source set changed'
    assert not ({301,*range(201,207)}&tags), 'Artificial interface leaked into connected BEM'
    assert bem['connected_components']==1 and bem['signed_volume_m3']<0
    assert checks['front']['signed_volume_m3']>0
    assert bem['self_intersection']['passed'] and checks['front']['self_intersection']['passed']
    assert checks['bem-air-outward_import']['coordinate_connectivity_winding_and_tag_roundtrip']
    result={'case':name,'design_sha256':manifest['design_sha256'],'job_sha256':case['job_file_sha256'],'enclosure_kind':expected['enclosure_kind'],
        'drivers':expected['driver_count'],'vent_sources':expected['vent_source_count'],'size_mm':size or case['native']['size_mm'],
        'profile_tolerance_mm':case['native']['profile_tolerance_mm'],'vertices':bem['vertices'],'triangles':bem['triangles'],
        'maximum_edge_mm':1000*bem['maximum_edge_m'],'minimum_triangle_quality':bem['minimum_triangle_quality'],
        'boundary_components':1,'intersection_checks_passed':True,'serialized_SI_connectivity_normals_tags_passed':True,
        'sources':bem['source_checks'],'resources':checks['resources'],'elapsed_seconds_with_native_audit':time.monotonic()-started,
        'bem_msh_sha256':hashlib.sha256((directory/'bem-air-outward.msh').read_bytes()).hexdigest(),
        'native_abec_mesh_audit':json.loads((directory/'abec/gmsh-import-validation.json').read_text()),'passed':True}
    print(json.dumps({'case':name,'triangles':bem['triangles'],'passed':True}),flush=True)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('jobs');parser.add_argument('--out',required=True);parser.add_argument('--workers',type=int,choices=(1,2),default=1);parser.add_argument('--case');args=parser.parse_args()
    jobs=Path(args.jobs);out=Path(args.out)
    if out.exists() and any(out.iterdir()):raise ValueError('Use a new regression output directory')
    out.mkdir(parents=True,exist_ok=True);definition=json.loads((jobs/'cases.json').read_text())
    cases=[(c,None) for c in definition['cases'] if not args.case or c['id']==args.case]
    if not cases:raise ValueError('No matching case')
    pair=definition['density_pair']
    if not args.case or args.case==pair['case']:
        original=next(c for c in definition['cases'] if c['id']==pair['case'])
        cases.extend((original,size) for size in pair['size_mm'] if size!=original['native']['size_mm'])
    report={'schema':'meh-native-regression/v1','scope':'Geometry and actual Gmsh file-import checks only. No AKABAK/ABEC parser or solve, acoustic field convergence, energy/passivity qualification or port-sizing validation.',
        'fixture_definitions_sha256':definition['fixture_definitions_sha256'],'python':sys.version.split()[0],'cases':[],'failures':[]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures={executor.submit(run_case,c,jobs,out,size):c['id'] for c,size in cases}
        for future in concurrent.futures.as_completed(futures):
            try:report['cases'].append(future.result())
            except Exception as error:
                report['failures'].append({'case':futures[future],'error':str(error)});print(str(error),flush=True)
            report['cases'].sort(key=lambda c:c['case']);(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    if report['failures']:return 1
    return 0

if __name__=='__main__':sys.exit(main())
