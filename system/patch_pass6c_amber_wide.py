#!/usr/bin/env python3
# BUILD 50c - final batch for this session's live reports:
# (#4/#7) AMBER TIER: drivers inside the warn band (0..-3 mm prim tolerance / <6 mm assembly
#         gap) tint amber - dense throat clusters announce 'tight but tolerated' instead of
#         looking silently broken. Red stays true collision.
# (#8)    wide island: the mid levers were never in its tune list (F2 woofer-canon
#         heritage) - midSel/nM/crM/shM now tunable, curated mid menu added.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# amber tagging: same-kind ring pairs in the warn band
rep("if(worst<-0.003){R[wa].collide=R[wb].collide=true;}",
    "if(worst<-0.003){R[wa].collide=R[wb].collide=true;}\n      else if(worst<GAP){R[wa].snug=R[wb].snug=true;}")
# amber tagging: mid-vs-woofer pairs in the warn band
rep("if(m<-0.003){for(const a of rings.mid)for(const b of rings.woof)if(minRimDist(a,b)<-0.003){a.collide=b.collide=true;}}",
    "if(m<-0.003){for(const a of rings.mid)for(const b of rings.woof)if(minRimDist(a,b)<-0.003){a.collide=b.collide=true;}}\n"
    "    else if(m<GAP){for(const a of rings.mid)for(const b of rings.woof)if(minRimDist(a,b)<GAP){a.snug=b.snug=true;}}")
# renderer: three tiers - red collide / amber snug / grey clear
rep("const col=d.collide?0xC8331D:0x9c9a95;",
    "const col=d.collide?0xC8331D:(d.snug?0xA8842C:0x9c9a95);")
# header teaches the tier
rep("drivers turn red when they collide</h2>",
    "drivers turn red when they collide · amber = inside build tolerance (tight)</h2>")

# wide island: mids are tunable like everywhere mids exist
rep("wide:['mouthW','thW','wfSel','cdSel','crW','shW'],",
    "wide:['mouthW','thW','midSel','nM','wfSel','cdSel','crM','crW','shM','shW'],")
rep("wide:      {woof:['w8','bc8pe','bc8nw','w10'], cd:['cd075','cd1','cd14','de980']},",
    "wide:      {mid:['m2','m3','bc5ndl','bc5nsm'], woof:['w8','bc8pe','bc8nw','w10'], cd:['cd075','cd1','cd14','de980']},")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD50c PATCHED: %d -> %d chars'%(n0,len(src)))
