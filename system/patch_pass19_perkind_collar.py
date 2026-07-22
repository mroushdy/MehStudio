#!/usr/bin/env python3
# BUILD 66 - "I havent seen 2 way systems where the woofers are covered" (Marwan).
# He is right about the LOOK: a 2-way corner woofer bolts to the board and shares the
# cabinet air - only the mounting flange is clamped. The duct cone STAYS (on a 45-deg
# corner board the frame sits outboard of the corner line; inboard is horn air, so a
# sealed channel to the taps is physically required). Per-kind collar:
#   woof: flange ring only (~16% of can depth) - basket and magnet fully exposed
#   mid:  deep pocket (50%) - the sealed-back 3-way treatment he expects
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("      const rBig=dch.od*0.5+0.008, cupC=dch.dp*0.50+0.006;",
    "      const rBig=dch.od*0.5+0.008,\n"
    "            cupC=(dch.kind==='woof')? dch.dp*0.16+0.004      // 2-way woofer: bolted flange ring, back exposed (his call)\n"
    "                                    : dch.dp*0.50+0.006;     // 3-way mid: sealed pocket")
rep("window.MEH_BUILD=65;","window.MEH_BUILD=66;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD66 per-kind collar: %d -> %d chars'%(n0,len(src)))
