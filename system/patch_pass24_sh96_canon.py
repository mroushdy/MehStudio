#!/usr/bin/env python3
# BUILD 72 - THE SH96 CANON CORRECTION (his real interior photo): the big 3-way was
# INVERTED. Corners carry the WOOFERS (4, on the debugged chamfer boards); the MIDS
# sit near the throat (diagonal seam ring) - m4-class, round ports; woofer taps are
# slim slots, one per woofer (probe series sh96 a-e: rt+npW1 kills T6/T3; the last 4
# T4 front-overlaps die with the new cross-kind ring law below).
# NEW LAW: a non-mid chamfer ring must clear the mid tap ring in FRONT PROJECTION -
# rF floor = outermost mid port radial + woofer slot flow-half + 12 mm.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) cross-kind ring separation law (mids are placed first - list carries their ports)
rep("""      const rF=Math.max((S.td||1)*IN*0.5+saK+0.008,       // the kidney's flow-length clears the throat
                        ringR,
                        cornerDist-(sbK+0.014));           // FILL THE CORNERS: taps sit under their drivers (his call)""",
"""      let midClear=0;                                     // SH96 law: woofer ring clears the mid tap ring in front view
      if(kind!=='mid'){ const rPtM=Math.sqrt((S.apM*1e-4/Math.max(1,(S.npM|0)||1))/Math.PI);
        for(const dm of list){ if(dm.kind!=='mid') continue;
          for(const pm of (dm.ports&&dm.ports.length?dm.ports:(dm.portC?[{p:dm.portC}]:[])))
            midClear=Math.max(midClear, Math.hypot(pm.p[1],pm.p[2])+rPtM); } }
      const rF=Math.max((S.td||1)*IN*0.5+saK+0.008,       // the kidney's flow-length clears the throat
                        ringR,
                        midClear? midClear+saK+0.012 : 0,  // front-projection clear of the mid ring (SH96 photo)
                        cornerDist-(sbK+0.014));           // FILL THE CORNERS: taps sit under their drivers (his call)""")

# 2) the corrected island bundle
rep("  pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'hpl10', nW:2, cdSel:'cd14', shM:'rt', plM:'chamfer'}",
    "  pa3way:   {mouthW:30, thW:90, thV:90, midSel:'m4', nM:4, wfSel:'w15', nW:4, cdSel:'cd14', shM:'round', shW:'rt', npW:1, plM:'diagonal', plW:'chamfer'}")

# 3) honest placement menus follow the canon
rep("  pa3way:    {plM:['chamfer','edge','corner'], plW:['straddle','cross','remote','edge']}",
    "  pa3way:    {plM:['diagonal','chamfer','edge','corner'], plW:['chamfer','straddle','cross','remote','edge']}")

# 4) counts + curated drivers
rep("pa3way:{nM:[4],nW:[2]}","pa3way:{nM:[4],nW:[2,4]}")
rep("  pa3way:    {mid:['m4','bc5nsm','bc5ndl'], woof:['hpl10','bc10mbx','ndl12','es12lw','bc12pe'], cd:['cd14','dcm420']}",
    "  pa3way:    {mid:['m4','bc5nsm','bc5ndl'], woof:['w15','hpl10','bc10mbx','ndl12','es12lw','bc12pe'], cd:['cd14','dcm420']}")

# 5) island label: the geometry story changed
rep('<option value="pa3way">Big-format 3-way PA (big-format 3-way class) — square · reference chamfer mids</option>',
    '<option value="pa3way">Big-format 3-way PA (big-format 3-way class) — square · corner woofers + throat mids (SH96 canon)</option>')

rep("window.MEH_BUILD=71;","window.MEH_BUILD=72;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD72 SH96 canon: %d -> %d chars'%(n0,len(src)))
