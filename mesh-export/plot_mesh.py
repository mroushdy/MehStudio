"""Generate inspectable scientific sections directly from exported triangles."""
import argparse,json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

COLORS={10:'#008a78',11:'#274f83',12:'#728b9d',13:'#728b9d',301:'#cb8a25',302:'#8f64a8',101:'#cf4e52',102:'#cf4e52',103:'#cf4e52',104:'#cf4e52'}

def sections(data,axis=1,value=0):
 v=np.array(data['vertices_m']);faces=np.array(data['faces']);tags=np.array(data['face_tags']);out=[];col=[]
 for f,t in zip(faces,tags):
  p=v[f];d=p[:,axis]-value
  if min(d)>1e-11 or max(d)<-1e-11:continue
  hits=[]
  for i,j in [(0,1),(1,2),(2,0)]:
   if abs(d[i])<1e-11:hits.append(p[i])
   if d[i]*d[j]<-1e-24:hits.append(p[i]+(p[j]-p[i])*d[i]/(d[i]-d[j]))
  unique=[]
  for h in hits:
   if not any(np.linalg.norm(h-q)<1e-10 for q in unique):unique.append(h)
  if len(unique)==2:out.append([[q[2]*1000,q[0]*1000] for q in unique]);col.append(COLORS.get(int(t),'#777'))
 return out,col

p=argparse.ArgumentParser();p.add_argument('bundle');p.add_argument('target');args=p.parse_args();root=Path(args.bundle)
data=json.loads((root/'bem-air-outward.json').read_text());manifest=json.loads((root/'manifest.json').read_text());segments,colors=sections(data)
fig=plt.figure(figsize=(14,8),facecolor='#f9faf8');gs=fig.add_gridspec(2,2,width_ratios=[1.2,1])
a=fig.add_subplot(gs[:,0]);b=fig.add_subplot(gs[0,1]);c=fig.add_subplot(gs[1,1])
for ax in [a,b]:
 ax.add_collection(LineCollection(segments,colors=colors,linewidths=1.1));ax.autoscale();ax.set_aspect('equal');ax.set_xlabel('Z forward (mm)');ax.set_ylabel('X radial (mm)');ax.grid(alpha=.15);ax.set_facecolor('white')
a.set_title('Connected exterior acoustic boundary • Y = 0 section',loc='left',fontweight='bold',fontsize=11);a.annotate('+Z / forward',(355,-20),(230,-20),arrowprops={'arrowstyle':'->','color':'#333'},fontsize=10)
plane=manifest['mesh_export']['checks']['horn']['mouth_z_m']*1000
rad=manifest['mesh_export']['checks']['horn']['mouth_radius_m']*1000
a.plot([plane,plane],[-rad,rad],'--',color=COLORS[301],lw=1,label='FEM interface only');a.legend(loc='upper left',frameon=False,fontsize=9)
b.set_xlim(90,200);b.set_ylim(50,180);b.set_title('One driver: cone → gap → collector → horn',loc='left',fontweight='bold')
b.text(.02,.02,'Red: active cone surrogate\nGreen: canonical passage / insert\nBlue: horn with a true opening',transform=b.transAxes,fontsize=9,va='bottom')
front=json.loads((root/'front-boundary.json').read_text());vf=np.array(front['vertices_m']);ff=np.array(front['faces']);tt=np.array(front['face_tags']);select=(tt==301);tris=vf[ff[select]]
c.add_collection(LineCollection(np.concatenate([tris[:,[0,1],:2],tris[:,[1,2],:2],tris[:,[2,0],:2]])*1000,colors=COLORS[301],linewidths=.22));c.autoscale();c.set_aspect('equal');c.set_title('FEM coupling disk • no such cap in exterior BEM',loc='left',fontweight='bold',fontsize=11);c.set_xlabel('X (mm)');c.set_ylabel('Y (mm)');c.grid(alpha=.15)
checks=manifest['mesh_export']['checks'];fig.suptitle('MEH exact saved design | Acoustic mesh inspection',fontsize=17,fontweight='bold',ha='left',x=.02)
fig.subplots_adjust(left=.07,right=.98,bottom=.11,top=.9,hspace=.36,wspace=.26)
fig.text(.02,.025,f"SI mesh • +Z forward • {checks['bem']['triangles']:,} canonical exterior triangles • four independent mids • source motion projected onto cone normals",fontsize=9,color='#555')
fig.savefig(args.target,dpi=180);plt.close(fig)
