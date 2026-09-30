"""Independently import actual fabrication ZIP solids. Requires an existing OCP runtime.

Usage: python verify-fabrication-native.py FABRICATION_ZIP VOID_PROBES_JSON
Checks ZIP integrity, closed STL topology, STEP validity/volume and open air paths.
This is geometry validation, not physical print-fit or acoustic validation.
"""
import json
import math
import struct
import sys
import tempfile
import zipfile
from pathlib import Path
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID, TopAbs_OUT
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.gp import gp_Pnt


def stl_check(raw):
    n = struct.unpack_from('<I', raw, 80)[0]
    assert len(raw) == 84 + 50*n
    volume, edges = 0.0, {}
    for i in range(n):
        row = struct.unpack_from('<12f', raw, 84+50*i)
        assert all(math.isfinite(v) for v in row)
        a,b,c = [tuple(row[j:j+3]) for j in (3,6,9)]
        normal = ((b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
        assert math.hypot(*normal) > 0, 'Degenerate STL triangle'
        volume += (a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
        for u,v in ((a,b),(b,c),(c,a)):
            edges.setdefault(tuple(sorted((u,v))), []).append(1 if u<v else -1)
    assert volume > 0
    assert all(len(signs)==2 and sum(signs)==0 for signs in edges.values()), 'STL is not closed and consistently wound'
    return n,volume


report=[]
probes=json.loads(Path(sys.argv[2]).read_text())['voidPoints']
with tempfile.TemporaryDirectory(prefix='meh-fabrication-native-') as directory:
    with zipfile.ZipFile(sys.argv[1]) as z:
        assert z.testzip() is None
        for name in z.namelist():
            assert not Path(name).is_absolute() and '..' not in Path(name).parts
        z.extractall(directory)
    root=Path(directory)/'MEH-fabrication'
    manifest=json.loads((root/'fabrication.json').read_text())
    for part in manifest['parts']:
        triangles,stl_volume=stl_check((root/part['stl']).read_bytes())
        reader=STEPControl_Reader()
        assert reader.ReadFile(str(root/part['step']))==IFSelect_RetDone
        assert reader.TransferRoots()>0
        shape=reader.OneShape()
        assert BRepCheck_Analyzer(shape).IsValid(), 'Invalid STEP solid: '+part['id']
        explorer=TopExp_Explorer(shape,TopAbs_SOLID)
        count=0
        while explorer.More():
            count+=1
            explorer.Next()
        assert count==1, 'Each print part must import as one solid'
        prop=GProp_GProps();BRepGProp.VolumeProperties_s(shape,prop);volume=prop.Mass()
        assert volume>0
        assert abs(volume-stl_volume)/volume<2e-5
        checked=0
        if part['placement'].get('translationMM'):
            classifier=BRepClass3d_SolidClassifier(shape)
            origin=part['placement']['translationMM']
            for point in probes:
                classifier.Perform(gp_Pnt(*(p-o for p,o in zip(point,origin))),1e-6)
                assert classifier.State()==TopAbs_OUT, 'Air path or source bolt passage is capped: '+part['id']
                checked+=1
        report.append(dict(part=part['id'],valid=True,solid_count=count,triangles=triangles,volume_mm3=volume,stl_step_volume_match=True,open_air_probes=checked))
print(json.dumps({'parts':report,'scope':'Independent STL topology and OpenCascade STEP import; no physical fit or acoustic validation'},indent=2))
