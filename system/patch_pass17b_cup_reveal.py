#!/usr/bin/env python3
# BUILD 64b - the pocket cup was HIDING the real driver: the cylindrical cover ran the
# full can depth (dp*1.08+cap), so the CAD body lived entirely inside its own enclosure
# and the rear view read as featureless white cans (his screenshot). His reference photos:
# the printed pocket seals around the FRAME; the magnet/back half sticks out visibly.
# FIX: the cover ends at half the can depth; the true CAD body protrudes past the collar.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("      const cE=[cC[0]+nrm[0]*(dch.dp*1.08+0.020), cC[1]+nrm[1]*(dch.dp*1.08+0.020), cC[2]+nrm[2]*(dch.dp*1.08+0.020)];",
    "      const cupL=dch.dp*0.50+0.006;                              // seal collar at half-can: the real body shows behind it (his pocket photos)\n"
    "      const cE=[cC[0]+nrm[0]*cupL, cC[1]+nrm[1]*cupL, cC[2]+nrm[2]*cupL];")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD64b cup reveal: %d -> %d chars'%(n0,len(src)))
