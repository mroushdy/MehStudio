"""Fault-injection checks on real study records; no additional field solves."""
from pathlib import Path
import copy,json,tempfile,contextlib,io
from qualify_results import qualify

root=Path(__file__).parent
original=[json.loads((root/'results'/n).read_text()) for n in
 ['inserted-3mm-sample.json','inserted-2mm-sample.json','inserted-1_4mm-sample.json']]

with tempfile.TemporaryDirectory(dir=root/'cache',prefix='qualification-') as tmp:
    tmp=Path(tmp)
    def run(records,duplicate=False):
        paths=[]
        for i,r in enumerate(records):
            p=tmp/f'{i}.json';p.write_text(json.dumps(r));paths.append(p)
        if duplicate: paths=[paths[0]]*3
        with contextlib.redirect_stdout(io.StringIO()):
            return qualify(*paths,tmp/'out.json')
    ok=run(original)
    assert ok['qualifiedFrequencyHz']==[100.,300.,500.,700.,1000.]
    try: run(original,duplicate=True)
    except AssertionError as e: assert 'distinct' in str(e)
    else: raise AssertionError('Duplicate mesh accepted')
    changed=copy.deepcopy(original);changed[1]['conventions']['flow']='outward'
    try:run(changed)
    except AssertionError as e:assert 'conventions' in str(e)
    else:raise AssertionError('Inconsistent conventions accepted')
    changed=copy.deepcopy(original);changed[2]['closedDomainModeFrequencyHz']=[200.]
    result=run(changed)
    assert not next(r for r in result['rows'] if r['frequencyHz']==700.)['available']
    changed=copy.deepcopy(original)
    r=next(r for r in changed[1]['rows'] if r['frequencyHz']==700.)
    r['referenceLoad']['inputImpedance']['r']+=10000
    result=run(changed)
    q=next(r for r in result['rows'] if r['frequencyHz']==700.)
    assert not q['available'] and not q['qualification']['checks']['loadedInputImpedanceChange']
    assert next(r for r in result['rows'] if r['frequencyHz']==100.)['available']
print('PASS: five qualification/fault-injection checks on actual three-mesh data')
