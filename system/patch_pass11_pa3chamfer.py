#!/usr/bin/env python3
# BUILD 55 - "big format still messed up": pa3way mids get the reference chamfer treatment
# (the queued fix). The debugged corner-pocket machinery goes per-kind; pa3way's four
# bc5nsm mids move from the diagonal seams (mid ring vs woofer ring -2 mm, mids vs CD
# 0 mm - a genuine pile-up) onto 45-deg corner plates with kidney taps, bodies OUTSIDE
# the shell corners - exactly his reference square rear photo (four drivers on chamfers + coax).
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) ring() chamfer branch: kidney count per kind (was S.npW even for mids)
rep("      const npc=Math.max(1,(S.npW|0)||1);",
    "      const npc=Math.max(1,((kind==='mid'?S.npM:S.npW)|0)||1);")

# 2) mkPorts kidneys: port area per kind (was S.apW even for mids)
rep("      if(d.chamfer){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);",
    "      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);")

# 3) fitCheck chamfer rows: per-kind loop (sec/ap/np follow the kind; row names unchanged)
rep("""  { // reference chamfer checks v2: ports must open INSIDE the horn corner; pocket depth reported
    const chs=layout.filter(d=>d.chamfer);
    if(chs.length){""",
"""  for(const KK of ['mid','woof']){ // reference chamfer checks v2 (per kind): ports must open INSIDE the horn corner; pocket depth reported
    const chs=layout.filter(d=>d.chamfer&&d.kind===KK);
    const SEC=KK.toUpperCase(), apK=(KK==='mid'?S.apM:S.apW), npK=((KK==='mid'?S.npM:S.npW)|0)||1;
    if(chs.length){""")
rep("""      rows.push({sec:'WOOF',name:'Chamfer ports open inside the corner',val:(worstIn*1000).toFixed(0)+' mm',""",
"""      rows.push({sec:SEC,name:'Chamfer ports open inside the corner',val:(worstIn*1000).toFixed(0)+' mm',""")
rep("""      { const rP3=Math.sqrt((S.apW*1e-4/Math.max(1,S.npW|0||1))/Math.PI);
        let ringWorst=1e9;
        const inR=((S.npW|0||1)>1)?(rP3+0.004):0;""",
"""      { const rP3=Math.sqrt((apK*1e-4/Math.max(1,npK))/Math.PI);
        let ringWorst=1e9;
        const inR=(npK>1)?(rP3+0.004):0;""")
rep("""        rows.push({sec:'WOOF',name:'Chamfer kidney ring fits',val:(ringWorst*1000).toFixed(0)+' mm',""",
"""        rows.push({sec:SEC,name:'Chamfer kidney ring fits',val:(ringWorst*1000).toFixed(0)+' mm',""")
rep("""        const rEdge=Math.min(...chs.map(d=>d.chamfer.corner-(d.chamfer.portR+((S.npW|0||1)>1?(rP3+0.004):0)+rP3)));
        rows.push({sec:'WOOF',name:'Chamfer kidneys within the corner run',val:(rEdge*1000).toFixed(0)+' mm',""",
"""        const rEdge=Math.min(...chs.map(d=>d.chamfer.corner-(d.chamfer.portR+((npK>1)?(rP3+0.004):0)+rP3)));
        rows.push({sec:SEC,name:'Chamfer kidneys within the corner run',val:(rEdge*1000).toFixed(0)+' mm',""")
rep("""      rows.push({sec:'WOOF',name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',""",
"""      rows.push({sec:SEC,name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',""")

# 4) plM gains the chamfer option (mirrors plW's wording)
rep(""" ["plM","Mid port placement","sel",[["knuckle","Knuckle passage - port aimed at the throat (SAWMOD)"],""",
""" ["plM","Mid port placement","sel",[["chamfer","45° corner chamfer - one frame per facet (reference plate)"],["knuckle","Knuckle passage - port aimed at the throat (SAWMOD)"],""")

# 5) pa3way bundle: chamfer mids are the island's canon layout now
rep("  pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'w10', nW:2, cdSel:'cd14', shM:'rt'},",
    "  pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'w10', nW:2, cdSel:'cd14', shM:'rt', plM:'chamfer'},")

# 6) escalation ladder must not stomp an intact chamfer layout
rep("    if(stillBad && S.plM!=='edge' && S.plM!=='diagonal' && S.shape!=='cone' && S.shape!=='os'){ S.plM='edge';",
    "    if(stillBad && S.plM!=='edge' && S.plM!=='diagonal' && S.plM!=='chamfer' && S.shape!=='cone' && S.shape!=='os'){ S.plM='edge';")
rep("        if(!still || S.plM===plNew || S.plM==='diagonal') return;",
    "        if(!still || S.plM===plNew || S.plM==='diagonal' || S.plM==='chamfer') return;")

# 7) island label: geometry is no longer pending
rep('<option value="pa3way">Big-format 3-way PA (big-format 3-way class) — square · BETA: mid/woofer geometry pending</option>',
    '<option value="pa3way">Big-format 3-way PA (big-format 3-way class) — square · reference chamfer mids</option>')

# 8) build bump: intent-only persistence re-derives every saved state through the new bundle
rep("window.MEH_BUILD=53;","window.MEH_BUILD=55;")
rep("build 53 · intent-only saved state (program updates re-derive)",
    "build 55 · pa3way reference chamfer mids (per-kind pockets) · intent-only saved state (program updates re-derive)")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD55 pa3way chamfer mids: %d -> %d chars'%(n0,len(src)))
