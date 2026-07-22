#!/usr/bin/env python3
# BUILD 55d - the pa3way growth cap (44", a solver allowance) left both curated 12" woofers
# honestly-failing at -8.1mm. Probe (probe_w12cap.js): at 46" they land CLEAN (+5mm ring,
# 0 fails, 0 reds, Lw 9.45 legal). Raise the allowance to what the probe proved.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)
rep("const CAPS={unity:30,coax2:36,knuckle:36,roundprint:24,pa3way:44,quadrant:64,wide:64};",
    "const CAPS={unity:30,coax2:36,knuckle:36,roundprint:24,pa3way:46,quadrant:64,wide:64};")
io.open(F,'w',encoding='utf-8').write(src)
print('BUILD55d cap 46: %d -> %d chars'%(n0,len(src)))
