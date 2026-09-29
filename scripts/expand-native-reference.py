"""Expand the frozen insert reference on three existing independent meshes.

Only cache and output directories are written. The supplied environment and
mesh directory are read-only inputs. Meshing instructions are in native-front-fem.
"""
import argparse,os,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--python',required=True);p.add_argument('--mesh-dir',required=True);p.add_argument('--output',required=True);p.add_argument('--frequencies',default=','.join(str(f) for f in range(100,1001,50)));a=p.parse_args()
root=Path(__file__).resolve().parents[1];native=root/'native-front-fem';out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True);mesh=Path(a.mesh_dir).resolve();cache=out/'cache'
env={**os.environ,'OMPI_MCA_btl':'self','OMPI_MCA_pml':'ob1','OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1','XDG_CACHE_HOME':str(cache),'MPLCONFIGDIR':str(cache/'matplotlib'),'PYTHONDONTWRITEBYTECODE':'1'}
for size in ['3mm','2mm','1_4mm']:
    path=mesh/('inserted-'+size+'.msh')
    if not path.exists() or not Path(str(path)+'.json').exists():raise FileNotFoundError(str(path)+' and its .json metadata are required; generate using native-front-fem/mesh_air.py')
    command=[a.python,str(native/'solve_front.py'),str(native/'geometry/inserted-air.json'),str(path),str(out/('inserted-'+size+'-dense.json')),'--frequencies',a.frequencies]
    if size=='1_4mm':command+=['--eigen']
    subprocess.run(command,env=env,check=True)
subprocess.run([a.python,str(native/'qualify_results.py'),*[str(out/('inserted-'+s+'-dense.json')) for s in ['3mm','2mm','1_4mm']],str(out/'inserted-dense-qualified.json')],env=env,check=True)
