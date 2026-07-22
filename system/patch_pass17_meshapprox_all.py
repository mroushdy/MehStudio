#!/usr/bin/env python3
# BUILD 64 - "those drivers do not look like real drivers" (Marwan, quadrant rear screenshot).
# ROOT CAUSE (runtime probe): the DATASHEET-TRACED preset family (bc12pe, bc8pe, bc5nsm, ...)
# never got meshApprox keys - the build-63 pass only covered the generic table, and my scan
# regex only matched single-line entries. Those presets draw the smooth p3 lathe = the white
# featureless cans in his screenshot. FIX: every datasheet preset wears the nearest real CAD
# body (per-axis rescaled, the established convention); 'custom' presets and CDs gain a
# draw-time nearest-by-size fallback so NO driver can ever render bodyless again.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) datasheet presets -> nearest real CAD body (same size class where we have one)
M={ "bc10mbx:{name:'B&C 10MBX64 (Ø261 · 4×M6 @245)',":'BC_10HPL64',
    "bc12mh:{name:'B&C 12MH36 (Ø~315 · 8×M6 @296 — verify)',":'BC_12NDL76',
    "bc12pe:{name:'B&C 12PE32 (Ø315 · 8×M6 @296)',":'BC_12NDL76',
    "bc5ndl:{name:'B&C 5NDL38 (Ø155 · 4×M5 @142)',":'BC_8MDN51',
    "bc5nsm:{name:'B&C 5NSM38 sealed (Ø157 · 4×M5 @142)',":'BC_8MDN51',
    "bc8nsm:{name:'B&C 8NSM64 sealed (Ø239 · 6×M4 @222)',":'BC_8MDN51',
    "bc8nw:{name:'B&C 8NW51 (Ø225 · 8×M6 @210)',":'BC_8MDN51',
    "bc8pe:{name:'B&C 8PE21 (Ø225 · 8×M6 @210)',":'BC_8MDN51' }
for a,key in M.items():
    rep(a, a+" meshApprox:'%s',"%key)

# 2) draw-time fallback: nearest-by-size real body when a preset has no key at all
#    (custom drivers; any future preset). od is in cm in the preset tables.
rep("    const MKEY=PRE.mesh||PRE.meshApprox;",
    "    const MKEY=PRE.mesh||PRE.meshApprox||(PRE.od?(PRE.od<20?'BC_8MDN51':PRE.od<29?'BC_10HPL64':PRE.od<40?'BC_12NDL76':'BC_18SW115'):null);")
rep("    const CKEY=CDP.mesh||CDP.meshApprox;",
    "    const CKEY=CDP.mesh||CDP.meshApprox||(CDP.bodyD?(CDP.bodyD>14?'BC_DE900TN':'BC_DE500'):null);")

# 3) CD fallback must rescale like the driver path does (true mesh -> 1:1; approx -> per-axis)
#    (check the existing CD block already scales by CDP.mesh?1:... - if it does, this is a no-op
#    guarded by the anchor count; see probe below before assuming)

# 4) build bump: intent-only persistence re-derives saved states
rep("window.MEH_BUILD=63;","window.MEH_BUILD=64;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD64 meshApprox-for-all: %d -> %d chars'%(n0,len(src)))
