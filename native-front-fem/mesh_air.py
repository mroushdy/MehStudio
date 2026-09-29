"""Mesh a tagged, outward-oriented air PLC without smoothing its boundary."""
from pathlib import Path
import argparse,json,time,hashlib
import numpy as np
import gmsh


def mesh_surface(source, target, max_size=.003, method='triangles'):
    started=time.perf_counter()
    data=json.loads(Path(source).read_text())
    pts=np.asarray(data['vertices_m'],float)
    faces=np.asarray(data['faces'],int)
    tags=np.asarray(data['face_tags'],int)
    gmsh.initialize()
    gmsh.option.setNumber('General.Terminal',0)
    gmsh.logger.start()
    gmsh.model.add('front_air')
    try:
        geo=gmsh.model.geo
        if method=='triangles':
            # One planar CAD face per input triangle preserves the frozen PLC
            # exactly, including all tag boundaries and nonplanar quad diagonals.
            for i,p in enumerate(pts): geo.addPoint(*p,max_size,i+1)
            edges={}
            surfaces=[]
            for face in faces:
                chain=[]
                for a,b in zip(face,np.roll(face,-1)):
                    key=(min(a,b),max(a,b))
                    if key not in edges: edges[key]=geo.addLine(int(key[0])+1,int(key[1])+1)
                    chain.append(edges[key] if a<b else -edges[key])
                surfaces.append(geo.addPlaneSurface([geo.addCurveLoop(chain)]))
            shell=geo.addSurfaceLoop(surfaces)
            volume=geo.addVolume([shell])
            geo.synchronize()
            for tag in sorted(set(tags)):
                gmsh.model.addPhysicalGroup(2,[surfaces[i] for i in np.flatnonzero(tags==tag)],int(tag))
        else:
            raise ValueError('Only exact triangle PLC supported')
        gmsh.model.addPhysicalGroup(3,[volume],10)
        gmsh.option.setNumber('Mesh.MeshSizeMax',max_size)
        gmsh.option.setNumber('Mesh.MeshSizeMin',max_size*.15)
        gmsh.option.setNumber('Mesh.MeshSizeFromPoints',0)
        gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary',0)
        gmsh.option.setNumber('Mesh.Algorithm3D',1)
        gmsh.option.setNumber('Mesh.Optimize',1)
        gmsh.option.setNumber('Mesh.MshFileVersion',4.1)
        gmsh.model.mesh.generate(3)
        types,element_tags,_=gmsh.model.mesh.getElements(3)
        ntets=sum(len(a) for a in element_tags)
        alltags=np.concatenate(element_tags)
        quality=np.asarray(gmsh.model.mesh.getElementQualities(alltags,'minSICN'))
        assert np.all(quality>0), 'Nonpositive tetrahedral quality/Jacobian'
        gmsh.write(str(target))
        meta={'source':str(source),'sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),
          'meshSha256':hashlib.sha256(Path(target).read_bytes()).hexdigest(),'maxSizeM':max_size,
          'method':method,'meshRuntimeS':time.perf_counter()-started,'tetrahedra':ntets,
          'nodes':len(gmsh.model.mesh.getNodes()[0]),'minSICN':float(quality.min()),
          'meanSICN':float(quality.mean()),'inputVertices':len(pts),'inputFaces':len(faces)}
        Path(str(target)+'.json').write_text(json.dumps(meta,indent=2))
        print(json.dumps(meta),flush=True)
        return meta
    except Exception:
        print('\n'.join(gmsh.logger.get()[-30:]),flush=True)
        raise
    finally:
        gmsh.finalize()


if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('source');p.add_argument('target');p.add_argument('--size',type=float,default=.003)
    args=p.parse_args()
    mesh_surface(args.source,args.target,args.size)
