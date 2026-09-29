"""Standalone publication-style figures from reproducible JSON/CSV studies."""
import argparse,json,csv
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import ScalarFormatter
p=argparse.ArgumentParser();p.add_argument('data');p.add_argument('output');args=p.parse_args()
src=Path(args.data);out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
load=lambda name:json.loads((src/name).read_text())
base=load('baseline.json');native=load('qualified-front-reference.json')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#354c49','text.color':'#263d3a','axes.titleweight':'bold','figure.facecolor':'#fcfdfb','axes.facecolor':'#fcfdfb','savefig.facecolor':'#fcfdfb','grid.color':'#dce3df'})
colors=['#22665e','#bd6334','#5577aa','#9470a8','#b69c34']
fields=[('splDb','On-axis pressure','dB re 20 μPa RMS'),('electricalImpedanceOhm','Electrical impedance / mid','Ω'),('acousticImpedanceMagnitudePaSM3','Entry acoustic impedance','MPa·s/m³'),('phaseDeg','On-axis phase incl. propagation','degrees'),('excursionPeakMM','Cone travel / mid','mm peak'),('portVelocityPeakMS','Entry speed / mid','m/s peak')]
def curves(ax,r,key,label=None,color=colors[0],points=False):
    rows=r.get('rows',[]);f=np.array([v['frequencyHz'] for v in rows]);y=np.array([v.get(key,np.nan) if v.get('available') else np.nan for v in rows],float)
    if key=='acousticImpedanceMagnitudePaSM3':y/=1e6
    if key=='phaseDeg' and not points:
        jumps=np.flatnonzero(abs(np.diff(y))>180)+1;y[jumps]=np.nan
    ax.plot(f,y,'o' if points else '-',color=color,ms=3.7,lw=1.7,mfc='white' if points else color,label=label)
def decorate(ax,field,band=True):
    if getattr(ax,'_meh_decorated',False):return
    ax._meh_decorated=True
    ax.set_xscale('log');ax.set_xlim(80,1500);ax.set_xticks([100,200,300,500,700,1000,1500]);ax.xaxis.set_major_formatter(ScalarFormatter());ax.tick_params(axis='x',labelsize=8)
    ax.set_title(field[1],loc='left',fontsize=11);ax.set_ylabel(field[2]);ax.grid(True,alpha=.6);ax.set_xlabel('Frequency · Hz')
    if band:ax.axvspan(200,700,color='#49766b',alpha=.045)
    ax.axvline(base['geometry']['transverseReferenceHz'],color='#9e927a',lw=.9,ls=':')
def save(fig,name):
    fig.savefig(out/(name+'.png'),dpi=180);fig.savefig(out/(name+'.svg'));plt.close(fig)
fig,axes=plt.subplots(3,2,figsize=(12,10),constrained_layout=True)
for ax,field in zip(axes.flat,fields):
    curves(ax,base,field[0],'Segmented front + 1D horn');curves(ax,native,field[0],'Qualified local FEM + 1D horn','#294b70',True);decorate(ax,field)
axes[0,0].legend(loc='lower right',fontsize=8)
fig.suptitle('Saved four-mid MEH · 1 V RMS per mid · 3 m from retained mouth plane\nLines: reduced-model samples. Dots: independently qualified local FEM frequencies.',fontsize=13)
fig.supxlabel('Shaded band: 200–700 Hz. Dotted line: first transverse-mode reference (~330 Hz). Rolled lip, azimuthal modes and HF source omitted.',fontsize=9)
save(fig,'MEH_Baseline_Curves')
fig,axes=plt.subplots(2,2,figsize=(12,8),constrained_layout=True)
area=load('sweep-area.json')
for i,c in enumerate(area['candidates']):
    if not c['available']:continue
    label=f"{c['value']:.0f} mm² · Ø{(4*c['value']/np.pi)**.5:.1f} mm"
    for ax,field in zip(axes.flat,[fields[0],fields[4],fields[5],fields[1]]):curves(ax,c['result'],field[0],label,colors[i%len(colors)]);decorate(ax,field)
axes[0,0].legend(fontsize=8,loc='lower right')
fig.suptitle('Entry area comparison · identical 1 V RMS drive · same 87 mm requested insert opening\nReduced-model screening only; each candidate recalculates chamber geometry.',fontsize=13)
fig.supxlabel('Larger area lowers entry speed; the small in-band flatness change does not establish an acoustic optimum.',fontsize=10)
save(fig,'MEH_Port_Sizing_Comparison')
fig,axes=plt.subplots(1,3,figsize=(15,5),constrained_layout=True)
for ax,name,title,unit in zip(axes,['length','volume','position'],['Tube setting (+3 mm physical)','Front cavity volume','Axial entry position'],['mm','cm³','mm']):
    data=load('sweep-'+name+'.json')
    for i,c in enumerate(data['candidates']):
        if c['available']:curves(ax,c['result'],'splDb',f"{c['value']:g} {unit}",colors[i%len(colors)])
    decorate(ax,fields[0]);ax.set_title(title,loc='left');ax.legend(fontsize=8,loc='lower right')
fig.suptitle('Geometry sweeps · on-axis SPL at 3 m · 1 V RMS per mid\nFront cavity excludes the tube; volume changes are realized through standoff.',fontsize=13)
fig.supxlabel('Rejected: 3 mm tube (editor bound) and 120 mm entry position (frame-envelope overlap). All displayed curves are reduced-model samples.',fontsize=10)
save(fig,'MEH_Geometry_Sweeps')
comparison=load('surrogate-vs-fem.json');sensitivity=load('sensitivity.json')
fig,axes=plt.subplots(1,2,figsize=(12,4.7),constrained_layout=True)
for label,r,col in [('Default: extra end = 0',base,colors[0]),('Extra end = 0.61 radius',sensitivity['unflanged_end_0_61'],colors[1]),('Legacy extra end = 1.4 radius',sensitivity['legacy_end_1_4'],colors[2])]:curves(axes[0],r,'splDb',label,col)
curves(axes[0],native,'splDb','Qualified local FEM','#294b70',True);decorate(axes[0],fields[0]);axes[0].legend(fontsize=8,loc='lower right');axes[0].set_title('Junction assumption sensitivity',loc='left')
r=comparison['rows'];axes[1].plot([v['frequencyHz'] for v in r],[v['splDeltaDb'] for v in r],'o-',color=colors[1]);axes[1].axhline(0,color='#777',lw=.8);axes[1].set_xlabel('Frequency · Hz');axes[1].set_ylabel('Reduced − local FEM · dB');axes[1].grid(True,alpha=.6);axes[1].set_title('Same lossless front assumptions, extra end = 0',loc='left')
fig.suptitle('Separate model-form uncertainty from mesh convergence\nNative dots resolve the local front passage; the complete horn remains a 1D approximation.',fontsize=13)
save(fig,'MEH_Model_Uncertainty')
bench=Path(__file__).resolve().parents[1]/'benchmarks/results'
if (bench/'summary.json').exists():
    fig,axes=plt.subplots(2,2,figsize=(12,7.5),constrained_layout=True)
    for j,case in enumerate(['kolbrek-exponential','kolbrek-conical-exponential']):
        def read(path):
            with path.open() as f:return list(csv.DictReader(f))
        a=read(bench/(case+'-candidate.csv'));b=read(bench/(case+'-native-normalized.csv'))
        # Native and candidate tables retain exact native frequency samples.
        f=np.array([float(v['frequency_hz']) for v in a]);native_y=np.array([float(v['spl_db']) for v in b]);candidate_y=np.array([float(v['spl_db']) for v in a])
        mask=(f>=20)&(f<=1000);f=f[mask];native_y=native_y[mask];candidate_y=candidate_y[mask]
        axes[0,j].semilogx(f,native_y,color='#294b70',lw=2,label='Authentic Hornresp export');axes[0,j].semilogx(f,candidate_y,color='#c36b3b',lw=1.1,ls='--',label='MEH network');axes[0,j].set_title(case.replace('kolbrek-','').replace('-',' + '),loc='left');axes[0,j].set_ylabel('Power-equivalent SPL · dB');axes[0,j].legend(fontsize=8)
        axes[1,j].semilogx(f,candidate_y-native_y,color='#c36b3b');axes[1,j].set_ylabel('MEH − Hornresp · dB');axes[1,j].set_xlabel('Frequency · Hz')
        for ax in axes[:,j]:
            ax.grid(True,alpha=.6);ax.set_xlim(20,1000);ax.set_xticks([20,50,100,200,500,1000]);ax.xaxis.set_major_formatter(ScalarFormatter());ax.tick_params(axis='x',which='minor',labelbottom=False)
    fig.suptitle('Real Hornresp references · classical horn benchmark\nPublished Kolbrek input/output pairs; 128 cells per segment; exact frequency comparison.',fontsize=13)
    fig.supxlabel('Agreement tests these matched idealized horn/motor cases. New multi-entry native capture and physical MEH validation remain pending.',fontsize=10)
    save(fig,'Hornresp_Benchmark_Comparison')
print('Figures written to',out)
