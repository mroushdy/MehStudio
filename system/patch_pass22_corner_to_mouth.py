#!/usr/bin/env python3
# BUILD 69 - "do we really need this weird shape?" (his corner close-up). The chamfer
# corner facet was drawn only where the fixed board plane still cuts the growing
# cross-section, so it died mid-horn as an arrow notch. Reference squares run the
# corner chamfer CONTINUOUSLY to the mouth (block over the pocket zone, thin board
# to the mouth - the comment already knew). FIX (render-only): past the plane's last
# valid station the facet continues as a corner cut whose leg tapers linearly to a
# sliver at the mouth - one clean continuous diagonal facet, no notch.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("""      stns.push(ok? {x:pnt.x, P1:[pnt.x,sy*a,z1], P2:[pnt.x,y2,sz*b]} : null);
    }""",
"""      stns.push(ok? {x:pnt.x, P1:[pnt.x,sy*a,z1], P2:[pnt.x,y2,sz*b]} : null);
    }
    { // continuous corner: past the board plane's last valid station the cut tapers
      // to a sliver at the mouth (reference squares: thin board to the mouth, no notch)
      let last=-1; for(let i=0;i<stns.length;i++) if(stns[i]) last=i;
      if(last>=0 && last<stns.length-1){
        const S0=stns[last], sy=Math.sign(e1)||1, sz=Math.sign(e2)||1;
        const p0=pts[last], w0=Math.max(0.004, ((p0.h/2-Math.abs(S0.P1[2]))+(p0.w/2-Math.abs(S0.P2[1])))/2);
        for(let i=last+1;i<stns.length;i++){ const pnt=pts[i], a=pnt.w/2, b=pnt.h/2;
          const t=(i-last)/(stns.length-1-last), w=w0*(1-t)+w0*0.18*t;
          stns[i]={x:pnt.x, P1:[pnt.x,sy*a,sz*(b-w)], P2:[pnt.x,sy*(a-w),sz*b]};
        }
      }
    }""")
rep("window.MEH_BUILD=68;","window.MEH_BUILD=69;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD69 continuous corner facet: %d -> %d chars'%(n0,len(src)))
