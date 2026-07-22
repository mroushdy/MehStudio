#!/usr/bin/env python3
# BUILD 55 suite: pin the new pa3way dialect - the reference builder chamfer mids. Island identity extends
# to pa3way (plM==='chamfer'), and a canon check mirrors the quadrant one: four mid frames
# on four corner facets, kidneys per-kind, mid ring clears the woofer ring by the REAL gap
# (no more riding the -3 mm prim-puck tolerance).
import io
F='meh_suite.js'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("  ck(name+' pin: island identity holds', name!=='knuckle' || (S.plM==='knuckle'&&S.plW==='remote'), S.plM+'/'+S.plW);",
    "  ck(name+' pin: island identity holds', (name!=='knuckle' || (S.plM==='knuckle'&&S.plW==='remote')) && (name!=='pa3way' || S.plM==='chamfer'), S.plM+'/'+S.plW);")

rep("""sec('F - knuckle + remote invariants (pass 1-2 features)');""",
"""{ // pa3way chamfer-mid canon (build 55, his the reference builder square rear photo): 4 mids on 4 corner
  // facets in pockets, bodies outside, and the mid ring clears the woofer ring for real
  if(STATES&&STATES.pa3way){ const ev=MEH.evaluate(STATES.pa3way);
    const mids=ev.layout.filter(d=>d.kind==='mid'), woofs=ev.layout.filter(d=>d.kind==='woof');
    const corners=new Set(mids.map(d=>Math.sign(d.center[1])+','+Math.sign(d.center[2])));
    ck('pa3way canon: 4 mids on 4 corner facets, pocketed', mids.length===4&&corners.size===4&&mids.every(d=>d.chamfer&&d.chamfer.pocket>0), corners.size+' corners');
    let mw=1e9; for(const a of mids)for(const b of woofs)mw=Math.min(mw,MEH.minRimDist(a,b));
    ck('pa3way canon: mid ring clears woofer ring >= 4mm', mw>=0.004, (mw*1000).toFixed(1)+'mm');
    let mm=1e9; for(let i=0;i<mids.length;i++)for(let j=i+1;j<mids.length;j++)mm=Math.min(mm,MEH.minRimDist(mids[i],mids[j]));
    ck('pa3way canon: mid frames clear each other', mm>=0.004, (mm*1000).toFixed(1)+'mm');
  }
}

sec('F - knuckle + remote invariants (pass 1-2 features)');""")

io.open(F,'w',encoding='utf-8').write(src)
print('suite pa3way canon: %d -> %d chars'%(n0,len(src)))
