"""Optional independent CAD import check. Requires OpenCascade's OCP package.
Run after writing horn.step, reference.step and surfaces.step into DIRECTORY.
"""
import json
import sys
from pathlib import Path
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID

root = Path(sys.argv[1])
results = []
for name in ['horn', 'reference', 'surfaces']:
    reader = STEPControl_Reader()
    assert reader.ReadFile(str(root / (name + '.step'))) == IFSelect_RetDone, name
    assert reader.TransferRoots() > 0, name
    shape = reader.OneShape()
    assert not shape.IsNull() and BRepCheck_Analyzer(shape).IsValid(), name
    box = Bnd_Box()
    BRepBndLib.Add_s(shape, box)
    def count(kind):
        explorer, n = TopExp_Explorer(shape, kind), 0
        while explorer.More():
            n += 1
            explorer.Next()
        return n
    nf, ns = count(TopAbs_FACE), count(TopAbs_SOLID)
    assert nf > 0 and ns == (1 if name == 'horn' else 0), name
    if name == 'surfaces':
        assert nf == 2
    results.append(dict(file=name+'.step', faces=nf, solids=ns, valid=True, bounds_mm=box.Get()))
for item in results[1:]:
    assert max(abs(a-b) for a, b in zip(results[0]['bounds_mm'], item['bounds_mm'])) < 0.0001
print(json.dumps(results, indent=2))
