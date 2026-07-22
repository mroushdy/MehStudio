#!/usr/bin/env python3
# BUILD 77 - his "the images still have a lot of mistakes" review, converted to laws:
# 1) ROUND MEANS ROUND: the diagonal-seam distortion (2.3 x 0.435 - the old slit
#    dialect) was applied to round ports too -> pa3way's mid taps drew as 52x10mm
#    sliver ellipses (why the front showed no mid taps). Distortion now applies only
#    to rect shapes; T3 gains a hard 1.3:1 aspect cap for CircleGeometry ports.
# 2) The land foot flare 1.45 read MORE massive than the old puck - back to a slim
#    1.18 taper with the seat lip (the real recessed-dish look waits for the printed-
#    mount rebuild; a fake wide volcano is not it).
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1a) seam distortion only for rect shapes
rep("      const kA=shq? Math.sqrt(4/(window.__stadK||4)) : 1;      // rounding costs area; regain it isotropically\n      if(isSeam){ slot.scale.set(sa*sc*2.3*kA, sb*sc*0.435*kA, 1); } else { slot.scale.set(sa*sc*kA,sb*sc*kA,1); }",
    "      const kA=shq? Math.sqrt(4/(window.__stadK||4)) : 1;      // rounding costs area; regain it isotropically\n      if(isSeam && shq){ slot.scale.set(sa*sc*2.3*kA, sb*sc*0.435*kA, 1); } else { slot.scale.set(sa*sc*kA,sb*sc*kA,1); }   // ROUND MEANS ROUND: the slit distortion is the rect dialect's")

# 1b) T3: circles must draw circular
rep("      const asp=Math.abs(s.scale.x/(s.scale.y||1e-9));\n      const aspLim=(pl==='diagonal')?7:3.6;                          // slim reference slots are 3:1 by canon",
    "      const asp=Math.abs(s.scale.x/(s.scale.y||1e-9));\n      const aspLim=(g.type==='CircleGeometry')?1.3:(pl==='diagonal')?7:3.6;   // ROUND MEANS ROUND; slim slots are 3:1 by canon")

# 2) slim the land taper
rep("      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.45, stH, 0xE9E4D8, true);   // Mother-style oval LAND: wide flared foot buried in the shell, not a puck",
    "      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.18, stH, 0xE9E4D8, true);   // slim conformal foot + seat lip (true recessed dishes = printed-mount rebuild)")
rep("      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.30, stH, 0xdedad2, true);   // shallow flared land (Mother milling photo)",
    "      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.12, stH, 0xdedad2, true);   // slim shallow foot")

rep("window.MEH_BUILD=76;","window.MEH_BUILD=77;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD77 round-is-round: %d -> %d chars'%(n0,len(src)))
