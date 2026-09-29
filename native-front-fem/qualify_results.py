"""Explicit row-by-row numerical qualification; no interpolation or extrapolation."""
from pathlib import Path
import argparse,copy,json
import numpy as np

THRESHOLDS={'matrixRelativeChange':.005,'loadedTransferRelativeChange':.005,
    'loadedInputImpedanceRelativeChange':.005,
    'loadedPhaseChangeDegrees':.5,'reciprocityRelativeError':1e-7,
    'minimumNormalizedHermitianEigenvalue':-1e-8,'linearRelativeResidual':1e-7,
    'powerResidualNormalized':1e-7,'minimumClosedModeRelativeDistance':.05,
    'meshVolumeRelativeError':1e-8}


def array(row):
    return np.array([[v['r']+1j*v['i'] for v in line] for line in row['impedance']])


def qualify(coarse,medium,fine,target):
    a,b,c=[json.loads(Path(p).read_text()) for p in [coarse,medium,fine]]
    for p in [a,b]:
        assert p['airSurfaceSha256']==c['airSurfaceSha256'],'Geometry changed during refinement'
        assert p['inputState']==c['inputState']
        assert p['medium']==c['medium'] and p['conventions']==c['conventions'],'Medium/conventions changed'
        assert p['ports']['sourceBasis']==c['ports']['sourceBasis'] and p['ports']['outletBasis']==c['ports']['outletBasis'],'Port basis changed'
        assert np.isclose(p['ports']['coneProjectedAreaM2'],c['ports']['coneProjectedAreaM2'],rtol=1e-10,atol=0)
    assert len({p['meshSha256'] for p in [a,b,c]})==3,'Three distinct meshes are required'
    assert a['fem']['dofs']<b['fem']['dofs']<c['fem']['dofs'],'Mesh DOFs must increase'
    ma={r['frequencyHz']:r for r in a['rows']};mb={r['frequencyHz']:r for r in b['rows']}
    out=copy.deepcopy(c)
    out['convergence']={'method':'Three independent tetrahedral meshes; pointwise complex matrix and reference-loaded response comparison',
        'thresholds':THRESHOLDS,'meshDofs':[a['fem']['dofs'],b['fem']['dofs'],c['fem']['dofs']],
        'meshSha256':[a['meshSha256'],b['meshSha256'],c['meshSha256']],
        'boundary':'Same frozen piecewise-planar air boundary on all meshes; geometric and material-model uncertainty excluded'}
    modes=c.get('closedDomainModeFrequencyHz',[])
    for r in out['rows']:
        f=r['frequencyHz'];checks={};measures={}
        checks['threeMeshFrequencyMatch']=f in ma and f in mb
        if checks['threeMeshFrequencyMatch']:
            za,zb,zc=array(ma[f]),array(mb[f]),array(r)
            assert all(np.isfinite(z).all() for z in [za,zb,zc]),'Nonfinite impedance'
            loads=[p['referenceLoad']['resistancePaSM3'] for p in [ma[f],mb[f],r]]
            assert np.allclose(loads,loads[-1],rtol=1e-10,atol=0),'Reference load changed'
            ab=np.linalg.norm(zb-za)/np.linalg.norm(zb)
            bc=np.linalg.norm(zc-zb)/np.linalg.norm(zc)
            tr=lambda x:complex(x['referenceLoad']['outflowOverConeFlow']['r'],x['referenceLoad']['outflowOverConeFlow']['i'])
            tb,tc=tr(mb[f]),tr(r)
            transfer=abs(tc-tb)/max(abs(tc),1e-12)
            phase=abs(np.angle(tc/tb,deg=True))
            zi=lambda x:complex(x['referenceLoad']['inputImpedance']['r'],x['referenceLoad']['inputImpedance']['i'])
            zib,zic=zi(mb[f]),zi(r)
            zin_change=abs(zic-zib)/max(abs(zic),1e-6*loads[-1],1e-12)
            measures={'coarseToMediumMatrixChange':float(ab),'mediumToFineMatrixChange':float(bc),
                'mediumToFineLoadedTransferChange':float(transfer),'loadedPhaseChangeDegrees':float(phase),
                'mediumToFineLoadedInputImpedanceChange':float(zin_change)}
            checks.update({'matrixChange':bc<THRESHOLDS['matrixRelativeChange'],
                'decreasingMatrixChange':bc<=ab*1.1+1e-9,
                'loadedTransferChange':transfer<THRESHOLDS['loadedTransferRelativeChange'],
                'loadedInputImpedanceChange':zin_change<THRESHOLDS['loadedInputImpedanceRelativeChange'],
                'loadedPhaseChange':phase<THRESHOLDS['loadedPhaseChangeDegrees']})
        d=r['diagnostics']
        checks.update({'reciprocity':d['reciprocity_error']<THRESHOLDS['reciprocityRelativeError'],
            'passivity':d['passivity_min_normalized']>=THRESHOLDS['minimumNormalizedHermitianEigenvalue'],
            'linearResidual':d['relative_residual']<THRESHOLDS['linearRelativeResidual'],
            'powerBalance':d['reference_load_power_residual_normalized']<THRESHOLDS['powerResidualNormalized'],
            'meshVolume':all(abs(p['airGeometry']['volumeM3']/p['airGeometry']['surfaceVolumeM3']-1)<THRESHOLDS['meshVolumeRelativeError'] for p in [a,b,c])})
        if modes:
            distance=min(abs(f-n)/n for n in modes)
            measures['nearestClosedModeRelativeDistance']=float(distance)
            checks['awayFromClosedMode']=distance>THRESHOLDS['minimumClosedModeRelativeDistance']
            checks['closedModeRangeCovered']=max(modes)>=f/(1-THRESHOLDS['minimumClosedModeRelativeDistance'])
        else:
            checks['closedModeCheckPresent']=False
        checks={key:bool(v) for key,v in checks.items()}
        r['available']=all(checks.values())
        r['qualification']={'qualified':r['available'],'checks':checks,'convergence':measures,
            'scope':'Numerical qualification of stated lossless surrogate and port basis; not physical measurement validation'}
    out['available']=any(r['available'] for r in out['rows'])
    out['qualification']='Row-specific numerical qualification; unqualified frequencies are unavailable'
    out['qualifiedFrequencyHz']=[r['frequencyHz'] for r in out['rows'] if r['available']]
    Path(target).write_text(json.dumps(out,indent=2))
    print(json.dumps({'output':str(target),'qualified':out['qualifiedFrequencyHz'],
        'unqualified':[r['frequencyHz'] for r in out['rows'] if not r['available']]}))
    return out


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('coarse');p.add_argument('medium');p.add_argument('fine');p.add_argument('target')
    a=p.parse_args();qualify(a.coarse,a.medium,a.fine,a.target)
