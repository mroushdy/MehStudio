"""Render engineering contact sheets from the exact dependency-free model meshes."""
import json, math, sys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
items=json.loads(Path(sys.argv[1]).read_text());out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
def font(n):return ImageFont.truetype(FONT,n)
COLORS={'approximate':(207,154,74),'envelope':(112,155,147),'drawing-verified':(97,143,192),'published':(97,143,192),'derived':(116,134,184),'dimensioned':(97,143,192),'dimensioned-reconstruction':(97,143,192)}
BG=(246,248,250);INK=(30,47,58)
def projection(v,kind):
 x,y,z=v
 if kind=='front':return (x,-y,z)
 if kind=='side':return (z,-x,-y)
 return (.82*x+.52*z,.24*x-.85*y+.4*z,.44*x+.23*y+.85*z)
def visible(meshes):
 good=lambda m:m['metadata']['primitive']!='bolt-pattern' and not any(w in m['metadata']['name'].lower() for w in ['guide','axes','baffle cutout'])
 appearance=any(good(m) and m['metadata']['status']!='envelope' for m in meshes)
 return [m for m in meshes if not(appearance and m['metadata'].get('displayRole')=='clearance-only')]
def view(im,meshes,box,kind):
 d=ImageDraw.Draw(im);x,y,w,h=box;data=[]
 for m in meshes:
  vs=[projection(v,kind) for v in m['vertices']];data.append((m,vs))
 vs=[v for _,ps in data for v in ps]
 if not vs:
  d.text((x+20,y+h/2),'Unresolved geometry',fill=(160,71,65),font=font(17));return
 lo=[min(v[i] for v in vs) for i in [0,1]];hi=[max(v[i] for v in vs) for i in [0,1]]
 scale=min((w-16)/max(hi[0]-lo[0],1),(h-16)/max(hi[1]-lo[1],1));cx=x+w/2-(lo[0]+hi[0])*scale/2;cy=y+h/2-(lo[1]+hi[1])*scale/2
 faces=[]
 for m,vs in data:
  base=COLORS.get(m['metadata']['status'],(98,142,188));guide=m['metadata']['primitive']=='bolt-pattern' or 'guide' in m['metadata']['name'].lower()
  if guide:base=(66,81,106)
  for f in m['faces']:
   ps=[vs[i] for i in f];p2=[(cx+p[0]*scale,cy+p[1]*scale) for p in ps]
   if abs((p2[1][0]-p2[0][0])*(p2[2][1]-p2[0][1])-(p2[2][0]-p2[0][0])*(p2[1][1]-p2[0][1]))<.06:continue
   a,b,c=[m['vertices'][i] for i in f];u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)];n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];norm=math.sqrt(sum(z*z for z in n)) or 1;light=.6+.36*abs(sum(n[j]*[-.3,-.4,-.85][j] for j in range(3))/norm)
   color=tuple(int(k*light) for k in base);faces.append((sum(p[2] for p in ps)/3,p2,color))
 for _,poly,color in sorted(faces,key=lambda f:f[0],reverse=True):d.polygon(poly,fill=color)
 if kind=='side':
  xx=cx;d.line([(xx,y+5),(xx,y+h-5)],fill=(187,68,72),width=1);d.text((max(x,min(xx+4,x+w-64)),y+3),'z = 0',fill=(157,57,60),font=font(12))
 d.text((x+5,y+h-3),{'front':'FRONT','side':'SIDE · rear →','iso':'OBLIQUE'}[kind],font=font(12),fill=(95,110,124))
def val(r,k):return r['dimensions'].get(k,{}).get('value')
def card(im,item,xy):
 r=item['record'];m=item['model'];x,y=xy;d=ImageDraw.Draw(im);w=590;h=355
 d.rounded_rectangle([x,y,x+w,y+h],radius=8,fill='white',outline=(219,226,231),width=1)
 d.text((x+18,y+15),r['name'],font=font(23),fill=INK)
 d.text((x+18,y+47),r['variant'].split(';')[0].split(' (')[0]+' · '+r['modelStatus'],font=font(14),fill=(84,104,119))
 meshes=visible(m['meshes'])
 for kind,xx in [('front',0),('side',190),('iso',380)]:view(im,meshes,(x+12+xx,y+73,180,190),kind)
 diameter=next((val(r,k) for k in ['overallDiagonal','overallDiameter','overallWidth'] if val(r,k)),None);total=val(r,'depth');rear=val(r,'rearDepth');exit=val(r,'exitDiameter');cut=val(r,'cutoutDiameter')
 line=f'Max span {diameter or "?"} mm   ·   total depth {total or "?"} mm'
 d.text((x+18,y+282),line,font=font(15),fill=INK)
 line=f'Cutout {cut} mm' if r['category']=='cone' else f'Exit {exit or "?"} mm   ·   rear {rear if rear is not None else "unseparated"}'+(' mm' if rear is not None else '')
 if val(r,'phasePlugProjection'):line+=f"   ·   front projection {val(r,'phasePlugProjection')} mm"
 d.text((x+18,y+305),line,font=font(14),fill=(84,104,119))
 caption='Cone/dustcap not reconstructed; envelopes are not occupied volumes.' if r['category']=='cone' and not any('cone' in p['name'].lower() for p in r['geometry']['parts']) else 'Reference geometry; body envelopes are not occupied volumes.'
 d.text((x+18,y+328),caption,font=font(12),fill=(115,127,137))
new={'bc8ndl64','bc8cl51','bc10cl51','bc10nw64','faitalpro8pr200','faitalpro10pr300','faitalpro8fe200','faitalpro10fe400'}
groups=[('new-8-and-10-inch',[i for i in items if i['record']['id'] in new])]
rest=[i for i in items if i['record']['id'] not in new]
for j in range(0,len(rest),9):groups.append((f'existing-models-{j//9+1}',rest[j:j+9]))
for name,group in groups:
 rows=math.ceil(len(group)/3);im=Image.new('RGB',(1840,155+rows*375),BG);d=ImageDraw.Draw(im)
 d.text((25,22),'MEH Studio · driver geometry audit',font=font(33),fill=INK)
 d.text((25,64),'Blue: source dimensions   |   Green: clearance envelopes   |   Amber: approximate appearance',font=font(18),fill=(70,91,105))
 d.text((25,94),'Mounting face z = 0; positive z points rearward. Front nose projections are shown at negative z.  •  29 September 2026',font=font(17),fill=(94,110,124))
 for j,item in enumerate(group):card(im,item,(25+(j%3)*605,135+(j//3)*375))
 im.save(out/(name+'.png'))
print(f'Wrote {len(groups)} model contact sheets to {out}')
