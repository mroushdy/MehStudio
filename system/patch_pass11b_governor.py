#!/usr/bin/env python3
# BUILD 55b - the applyAutos governor (line ~1095) normalizes plM to the seam default and
# didn't know chamfer is island-defining; it stomped the pa3way bundle back to 'diagonal'
# every pass (probe: settled plM still 'diagonal'). Respect chamfer like corner/edge/knuckle.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("  if(S.plM!=='corner'&&S.plM!=='edge'&&S.plM!=='knuckle') S.plM = (S.shape==='cone'||S.shape==='os') ? 'edge' : 'diagonal';   // seam default; island-defining wall placements are respected",
    "  if(S.plM!=='corner'&&S.plM!=='edge'&&S.plM!=='knuckle'&&!(S.plM==='chamfer'&&S.shape!=='cone'&&S.shape!=='os')) S.plM = (S.shape==='cone'||S.shape==='os') ? 'edge' : 'diagonal';   // seam default; island-defining wall placements (incl. chamfer on rect) are respected")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD55b governor: %d -> %d chars'%(n0,len(src)))
