"""Re-run independent topology/intersection/format/source gates on saved boundaries."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
import gmsh
from build_mesh import Boundary,oriented_check,import_check
from validate_mesh import intersection_check

def validate(directory,manifest):
    root=Path(directory);result={}
    gmsh.initialize();gmsh.option.setNumber('General.Terminal',0)
    try:
        for name,sign in [('bem-air-outward',-1),('front-boundary',1)]:
            data=json.loads((root/(name+'.json')).read_text());b=Boundary();b.vertices=data['vertices_m'];b.faces=data['faces'];b.tags=data['face_tags']
            report=oriented_check(b,sign)
            if b.faces!=data['faces']:raise ValueError('Saved normals were not already correctly oriented')
            report['self_intersection']=intersection_check(data)
            report['gmsh_import']=import_check(root/(name+'.msh'),len(b.faces))
            report['sha256']=hashlib.sha256((root/(name+'.msh')).read_bytes()).hexdigest()
            v=np.array(b.vertices);f=np.array(b.faces);tt=np.array(b.tags)
            report['sources']=[]
            for d in manifest['drivers']:
                sf=f[tt==d['source_tag']];av=np.cross(v[sf[:,1]]-v[sf[:,0]],v[sf[:,2]]-v[sf[:,0]])/2;flux=av@np.array(d['motion_into_front_air']);area=float(-flux.sum())
                if not len(sf) or not np.all(flux<0) or abs(area/d['nominal_sd_m2']-1)>.002:raise ValueError('Source projection/area failed')
                report['sources'].append({'id':d['id'],'projected_area_m2':area,'relative_Sd_error':float(area/d['nominal_sd_m2']-1),'inward_motion_correct':True})
            result[name]=report
        return result
    finally:gmsh.finalize()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('directory');p.add_argument('--manifest',required=True);p.add_argument('--out',required=True);a=p.parse_args();r=validate(a.directory,json.loads(Path(a.manifest).read_text()));Path(a.out).write_text(json.dumps(r,indent=2));print(json.dumps({k:{'triangles':v['triangles'],'volume_m3':v['signed_volume_m3']} for k,v in r.items()}))
