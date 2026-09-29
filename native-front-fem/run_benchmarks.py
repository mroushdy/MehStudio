from pathlib import Path
import json, time
import numpy as np
from scipy.optimize import brentq
from fem_core import PortFEM, box_mesh, terminate_two_port
from benchmarks_reference import uniform_duct_impedance, impedance_terminated_duct, distributed_neck_compliance_resonance

out=Path(__file__).parent/'results'
out.mkdir(exist_ok=True)
started=time.perf_counter()
frequencies=[80.,150.,250.,400.,700.,1000.]
L,W,H=.30,.02,.03
rho,c=1.204,343.
expected=np.array([uniform_duct_impedance(f,L,W*H) for f in frequencies])
zc=rho*c/(W*H)
results=[]
lastZ=None
for degree,sub in [(1,[12,2,2]),(1,[24,3,3]),(1,[48,4,4]),(2,[24,3,3])]:
    domain,tags=box_mesh(L,W,H,sub)
    model=PortFEM(domain,tags,[{'tag':2,'name':'left'},{'tag':3,'name':'right'}],degree=degree)
    Z,diag,_=model.solve(frequencies)
    errs=np.linalg.norm(Z-expected,axis=(1,2))/np.linalg.norm(expected,axis=(1,2))
    changes=(np.linalg.norm(Z-lastZ,axis=(1,2))/np.linalg.norm(Z,axis=(1,2))).tolist() if lastZ is not None else None
    loads=[]
    for factor in [1.,.5+.3j,2-.4j,0.]:
        zin,tr=terminate_two_port(Z,zc*factor)
        ref=[impedance_terminated_duct(f,L,W*H,zc*factor) for f in frequencies]
        ez=np.array([r['input_impedance'] for r in ref])
        et=np.array([r['flow_out']/r['flow_in'] for r in ref])
        pin=zin.real
        pout=(zc*factor).real*abs(tr)**2
        loads.append({'load_over_zc':str(factor),'max_input_impedance_complex_error':float(np.max(abs(zin-ez)/zc)),
            'max_transfer_complex_error':float(np.max(abs(tr-et)/np.maximum(abs(et),1e-12))),
            'max_power_residual_over_zc':float(np.max(abs(pin-pout)/zc)),
            'minimum_input_resistance_over_zc':float(np.min(pin)/zc)})
    matched=terminate_two_port(Z,zc)[1]
    phase_err=np.angle(matched*np.exp(1j*2*np.pi*np.array(frequencies)*L/c),deg=True)
    item={'type':'uniform_duct','subdivisions':sub,**model.metadata,'matrix_complex_errors':errs.tolist(),
        'change_from_previous':changes,'matched_phase_error_degrees':phase_err.tolist(),
        'loads':loads,'diagnostics':diag}
    results.append(item)
    print(json.dumps({'benchmark':'duct','degree':degree,'dofs':model.metadata['dofs'],
        'max_error':max(errs),'max_phase_deg':max(abs(phase_err)),'time_s':model.metadata['assembly_s']+sum(d['solve_s'] for d in diag)}),flush=True)
    lastZ=Z

# Independent 3D rigid rectangular cavity; analytic separated Neumann eigenmodes.
dims=np.array([.31,.23,.17])
analytic=sorted(c/2*np.linalg.norm(np.array([i,j,k])/dims)
                for i in range(5) for j in range(5) for k in range(5) if i+j+k)[:6]
for n in [4,7,10]:
    domain,tags=box_mesh(*dims,[n,n,n])
    model=PortFEM(domain,tags,[{'tag':2,'name':'left'},{'tag':3,'name':'right'}],degree=2)
    got=model.eigenfrequencies(6)
    errors=abs(got-np.array(analytic))/analytic
    item={'type':'closed_cavity','subdivisions':[n,n,n],**model.metadata,'analytic_hz':analytic,
          'fem_hz':got.tolist(),'frequency_errors':errors.tolist()}
    results.append(item)
    print(json.dumps({'benchmark':'cavity','dofs':model.metadata['dofs'],'max_error':max(errors)}),flush=True)

# A distributed FEM neck terminated by an ideal compliance: an exact,
# controlled Helmholtz resonator benchmark without ambiguous 3D end correction.
area=np.pi*.005**2
neck_length=.04
compliance=.001/(rho*c*c)
def analytic_reactance(f):
    z=uniform_duct_impedance(f,neck_length,area)
    return terminate_two_port(z,1/(1j*2*np.pi*f*compliance))[0].imag
exact_resonance=distributed_neck_compliance_resonance(.001,area,neck_length)
resonator_results=[]
for nx in [6,12,24]:
    domain,tags=box_mesh(neck_length,np.sqrt(area),np.sqrt(area),[nx,2,2])
    model=PortFEM(domain,tags,[{'tag':2,'name':'input'},{'tag':3,'name':'compliance'}],degree=1)
    def reactance(f):
        z,_,_=model.solve([f])
        return terminate_two_port(z[0],1/(1j*2*np.pi*f*compliance))[0].imag
    got=brentq(reactance,65.,90.,xtol=1e-8)
    item={'type':'neck_compliance_resonator','subdivisions':[nx,2,2],**model.metadata,
          'exact_distributed_resonance_hz':exact_resonance,'fem_resonance_hz':float(got),
          'frequency_error':float(abs(got-exact_resonance)/exact_resonance)}
    resonator_results.append(item)
    print(json.dumps({'benchmark':'resonator','dofs':model.metadata['dofs'],
          'frequency_hz':got,'error':item['frequency_error']}),flush=True)

checks={
    'duct_final_complex_error_below_1pct':max(results[3]['matrix_complex_errors'])<.01,
    'duct_p1_error_reduces':max(results[2]['matrix_complex_errors'])<max(results[1]['matrix_complex_errors'])<max(results[0]['matrix_complex_errors']),
    'duct_final_phase_error_below_half_degree':max(abs(np.array(results[3]['matched_phase_error_degrees'])))<.5,
    'all_matrix_reciprocity_below_1e7':all(d['reciprocity_error']<1e-7 for r in results[:4] for d in r['diagnostics']),
    'all_matrix_psd_above_minus1e8':all(d['passivity_min_normalized']>-1e-8 for r in results[:4] for d in r['diagnostics']),
    'all_load_power_residual_below1e6':all(d['max_power_residual_over_zc']<1e-6 for r in results[:4] for d in r['loads']),
    'cavity_final_frequency_error_below_halfpct':max(results[-1]['frequency_errors'])<.005,
    'cavity_error_reduces':max(results[-1]['frequency_errors'])<max(results[-2]['frequency_errors'])<max(results[-3]['frequency_errors']),
    'resonator_final_frequency_error_below_halfpct':resonator_results[-1]['frequency_error']<.005,
    'resonator_error_reduces':resonator_results[-1]['frequency_error']<resonator_results[-2]['frequency_error']<resonator_results[-3]['frequency_error']}
checks={key:bool(value) for key,value in checks.items()}
payload={'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks,'frequency_hz':frequencies,
         'runtime_s':time.perf_counter()-started,'results':results+resonator_results}
(out/'benchmarks.json').write_text(json.dumps(payload,indent=2))
print(json.dumps({'status':payload['status'],'runtime_s':payload['runtime_s'],'checks':checks}),flush=True)
assert all(checks.values()),checks
