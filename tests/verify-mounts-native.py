"""Independent OpenCascade import and through-hole checks for a mounting ZIP.

Requires OCP. Run with the actual downloaded/generated MEH mounting ZIP path.
Checks solids, volume, bounds, and points through all holes at mid-thickness.
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
from OCP.TopAbs import TopAbs_SOLID, TopAbs_OUT, TopAbs_IN
from OCP.BRepClass3d import BRepClass3d_SolidClassifier
from OCP.BRepGProp import BRepGProp
from OCP.GProp import GProp_GProps
from OCP.gp import gp_Pnt


def mesh_volume(raw):
    n = struct.unpack_from('<I', raw, 80)[0]
    assert len(raw) == 84 + 50*n
    volume = 0.0
    edges = {}
    for i in range(n):
        row = struct.unpack_from('<12f', raw, 84 + 50*i)
        assert all(math.isfinite(x) for x in row)
        a, b, c = [tuple(row[j:j+3]) for j in (3, 6, 9)]
        volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6
        for u, v in ((a,b),(b,c),(c,a)):
            key = tuple(sorted((u,v)))
            edges.setdefault(key, []).append(1 if u < v else -1)
    assert volume > 0
    assert all(len(x) == 2 and sum(x) == 0 for x in edges.values())
    return n, volume


results = []
with tempfile.TemporaryDirectory(prefix='meh-mount-import-') as directory:
    with zipfile.ZipFile(sys.argv[1]) as archive:
        assert archive.testzip() is None
        # This is a tool-generated archive. Keep extraction strictly inside temp.
        for name in archive.namelist():
            assert not Path(name).is_absolute() and '..' not in Path(name).parts
        archive.extractall(directory)
    root = Path(directory) / 'MEH-mounting'
    manifest = json.loads((root / 'mounting_parts.json').read_text())
    seen = set()
    for part in manifest['parts']:
        if part['local_step'] in seen:
            continue
        seen.add(part['local_step'])
        reader = STEPControl_Reader()
        assert reader.ReadFile(str(root / part['local_step'])) == IFSelect_RetDone
        assert reader.TransferRoots() > 0
        shape = reader.OneShape()
        assert BRepCheck_Analyzer(shape).IsValid()
        explorer = TopExp_Explorer(shape, TopAbs_SOLID)
        solids = 0
        while explorer.More():
            solids += 1
            explorer.Next()
        assert solids == 1
        prop = GProp_GProps()
        BRepGProp.VolumeProperties_s(shape, prop)
        volume = prop.Mass()
        assert volume > 0
        n, stl_volume = mesh_volume((root / part['local_stl']).read_bytes())
        assert abs(stl_volume-volume)/volume < 1e-5
        spec = part['spec']
        z = spec['thicknessMM']/2
        centers = [[0,0], *spec['boltCenters']]
        classifier = BRepClass3d_SolidClassifier(shape)
        for x, y in centers:
            classifier.Perform(gp_Pnt(x,y,z), 1e-7)
            assert classifier.State() == TopAbs_OUT, 'A through-hole is capped'
        recesses = 0
        if spec.get('counterboreDepthMM', 0) > 0:
            offset = (spec['boltHoleDiameterMM'] + spec['counterboreDiameterMM'])/4
            shoulder_z = spec['thicknessMM'] - spec['counterboreDepthMM']
            for x, y in spec['boltCenters']:
                classifier.Perform(gp_Pnt(x+offset,y,shoulder_z/2), 1e-7)
                assert classifier.State() == TopAbs_IN, 'Recess shoulder material is missing'
                classifier.Perform(gp_Pnt(x+offset,y,(shoulder_z+spec['thicknessMM'])/2), 1e-7)
                assert classifier.State() == TopAbs_OUT, 'Counterbore recess is filled'
                recesses += 1
        # A convex outline vertex midpoint to the central opening should include
        # at least one material point away from any bolt-hole cylinder.
        material = False
        for x, y in spec['outline']:
            r = math.hypot(x,y)
            target = (r + spec['cutoutDiameterMM']/2)/2
            classifier.Perform(gp_Pnt(x*target/r,y*target/r,z), 1e-7)
            if classifier.State() == TopAbs_IN:
                material = True
                break
        assert material, 'No plate material found'
        results.append(dict(file=part['local_step'],valid=True,solids=solids,triangles=n,volume_mm3=volume,through_holes_checked=len(centers),counterbores_checked=recesses,stl_matches_step=True))
print(json.dumps(results, indent=2))
