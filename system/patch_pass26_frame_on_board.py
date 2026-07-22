#!/usr/bin/env python3
# BUILD 73b - THE FRAME-ON-BOARD LAW (root cause of the corner rings he called out
# twice). Old law placed chamfer frames radially OUTBOARD of their taps (rF+od*0.3536)
# - a duct cone bridged the gap and its big end read as rings through the mouth.
# The SH96 photo: the frame bolts flush ON the corner board, DIRECTLY OVER its slot;
# what makes that legal is a board whose chord can host the frame. So:
#   1) woofer chamfer: dF = tap radial (frame over slot); the adapter cone degenerates
#      to a flange ring by construction (t0 -> 0).
#   2) NEW fit row 'Corner board hosts the frame' (chord >= frame + 20mm) - RED drives
#      mouth growth; the SH96 class settles where the boards genuinely fit (~48").
#   3) rF gains the frame-footprint floor so the slot stays inside the frame.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) dF per-kind: mids keep the pocketed-outboard law; woofers sit ON the board over the slot
rep("""      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5,                      // CD law: frame inner edge clears the CD radius
                         rF+od*0.3536+0.006,              // frame FULLY behind the chamfer board - never in the horn air
                         0.12 );""",
"""      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5,                      // CD law: frame inner edge clears the CD radius
                         kind==='mid'? rF+od*0.3536+0.006 : rF,   // mid: pocketed outboard; woofer: frame ON the board OVER its slot (SH96 photo)
                         0.12 );
      if(kind!=='mid') rF=Math.max(rF, dF-od*0.25);       // the slot stays under the frame footprint""")

# rF becomes reassignable
rep("      const rF=Math.max((S.td||1)*IN*0.5+saK+0.008,       // the kidney's flow-length clears the throat",
    "      let rF=Math.max((S.td||1)*IN*0.5+saK+0.008,       // the kidney's flow-length clears the throat")

# 2) fit row + growth driver: the corner chord must host the frame
rep("""      rows.push({sec:SEC,name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',""",
"""      { let chWorst=1e9;
        for(const d of chs){ const m2=(d.chamfer.corner-d.chamfer.portR)*1.4142-(d.od/2+0.020);
          chWorst=Math.min(chWorst,m2); }
        rows.push({sec:SEC,name:'Corner board hosts the frame',val:(chWorst*1000).toFixed(0)+' mm',
          st: chWorst>=0?'ok':chWorst>=-0.02?'warn':'fail',
          why: chWorst<0?'the corner board chord cannot host the frame - the horn must grow (SH96 boards are wide)':'frame bolts flush on the corner board over its slot (SH96 interior photo)'});
        if(chWorst<-0.02) for(const d of chs) d.collide=true;
      }
      rows.push({sec:SEC,name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',""")

# 3) the woofer walk recognizes the new failure name (growth chases it)
rep("/CD body|conform|ring spacing|within the wall|pads on the wall|corner seam|clear of the apex/",
    "/CD body|conform|ring spacing|within the wall|pads on the wall|corner seam|clear of the apex|hosts the frame/")
rep("/within the wall|ring spacing|CD body|corner seam|clear of the apex/",
    "/within the wall|ring spacing|CD body|corner seam|clear of the apex|hosts the frame/")

rep("window.MEH_BUILD=73;","window.MEH_BUILD=73.2;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD73b frame-on-board: %d -> %d chars'%(n0,len(src)))
