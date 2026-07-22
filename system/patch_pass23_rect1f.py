#!/usr/bin/env python3
# BUILD 71 - queue item 1: CLEAN-PYRAMID rect (his corner close-up: "looks very
# different than any synergy horn I've seen"). New family rect1f: same Keele-sized
# mouth, ONE conical slope throat->mouth (knee=depth, no second flare) - the classic
# reference-square read: two shades per corner, no arrow notch. Honesty: without the
# second flare Keele waistbanding is EXPECTED - the pattern note + profile label say
# so (the same honesty the round families already carry).
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) every rect2f equality accepts the new family (6 sites)
rep("S.shape==='rect2f'", "/^rect/.test(S.shape)", 6)

# 2) family dropdown
rep('["rect2f","Rect conical + 2nd flare"],',
    '["rect2f","Rect conical + 2nd flare"],["rect1f","Rect conical — clean pyramid (single flare, honest waistbanding)"],')

# 3) stations(): rect1f = one straight segment throat->mouth; knee=depth
rep("""    seg(0,g.L1,g.ts,g.D23H,g.ts,g.D23V,24);
    seg(g.L1,g.depth,g.D23H,g.D34H,g.D23V,g.D34V,10);
    return {form:S.shape==='sup'?'sup':'rect',pts,depth:g.depth,g,pat:{fH:g.fPatH,fV:g.fPatV,fNarrow:g.fNarrow},
            mouthW:g.D34H,mouthH:g.D34V,throat:g.ts,knee:g.L1};""",
"""    if(S.shape==='rect1f'){ seg(0,g.depth,g.ts,g.D34H,g.ts,g.D34V,34);
      return {form:'rect',pts,depth:g.depth,g,pat:{fH:g.fPatH,fV:g.fPatV,fNarrow:g.fNarrow},
              mouthW:g.D34H,mouthH:g.D34V,throat:g.ts,knee:g.depth}; }
    seg(0,g.L1,g.ts,g.D23H,g.ts,g.D23V,24);
    seg(g.L1,g.depth,g.D23H,g.D34H,g.D23V,g.D34V,10);
    return {form:S.shape==='sup'?'sup':'rect',pts,depth:g.depth,g,pat:{fH:g.fPatH,fV:g.fPatV,fNarrow:g.fNarrow},
            mouthW:g.D34H,mouthH:g.D34V,throat:g.ts,knee:g.L1};""")

# 4) profile label honesty (knee-based, not family-based)
rep("  const kneeLbl=st.form==='rect' ? `second flare ${fin(st.depth-st.knee)}\"` : `roundover R ${f2(S.rollR)}\"`;",
    "  const kneeLbl=st.form==='rect' ? (st.knee<st.depth*0.999? `second flare ${fin(st.depth-st.knee)}\"` : 'single flare — expect Keele waistbanding') : `roundover R ${f2(S.rollR)}\"`;")

rep("window.MEH_BUILD=70;","window.MEH_BUILD=71;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD71 rect1f clean pyramid: %d -> %d chars'%(n0,len(src)))
