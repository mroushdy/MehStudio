#!/usr/bin/env python3
# BUILD 55c - the joint pass stops at the -3 mm WARN tolerance (prim-puck allowance), but
# the drawn pucks then still kiss on screen - the exact thing Marwan keeps flagging.
# For chamfer mids (bodies outside the shell, tap decoupled from frame) there is no reason
# to ride the tolerance: a warn-band finisher keeps walking Lw (woofers deeper on their
# diverging walls, plenty of wall/CD margin) until the rings clear by the real 4 mm GAP
# or the honest rollLimit/fxLo cap. Gated to plM==='chamfer' so no other island's
# blessed settle moves.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("""    if(!/INFEASIBLE/.test(S.bindM)) S.bindM=(S.bindM||'')+' · INFEASIBLE: mid ring cannot clear CD and woofers - smaller drivers, lower fxHi, or 2-way';
    break;
  }""",
"""    if(!/INFEASIBLE/.test(S.bindM)) S.bindM=(S.bindM||'')+' · INFEASIBLE: mid ring cannot clear CD and woofers - smaller drivers, lower fxHi, or 2-way';
    break;
  }
  // chamfer finisher: pocketed mids decouple frame from tap, so don't ride the -3 mm
  // prim-puck tolerance - walk the woofers out until the rings clear by the real GAP
  if(MEH.HAS_M(S)&&MEH.HAS_W(S)&&S.plM==='chamfer') for(let i=0;i<12;i++){
    const evj=MEH.evaluate(S);
    const row=evj.fit.find(r=>/Mid ring vs woofer ring/.test(r.name));
    if(!row) break;
    if(parseFloat(row.val)>=4) break;
    const cap=MEH.rollLimitX(S,MEH.stations(S),'woof')/MEH.IN;
    if(S.Lw>=cap-0.05) break;
    S.Lw=+(S.Lw+0.15).toFixed(2);
    if(!/clear of the mid ring/.test(S.bindW)) S.bindW+=' · pushed out clear of the mid ring';
  }""")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD55c ring finisher: %d -> %d chars'%(n0,len(src)))
