#!/usr/bin/env python3
# BUILD 74b - DUAL CHAMFER DIALECT (fixture F3 proved the flush law over-reached):
# both corner-mount dialects are real - F3's reference photo (36", 4x12, frames
# pocketed OUTBOARD, kidneys near the throat, duct cone) and SH96 (big horn, frames
# flush OVER their slots). The law now chooses by what the corner chord can host:
#   chord >= od+28mm  -> FLUSH (SH96): dF=tap radial, slot under frame, board patch
#   else              -> OUTBOARD (F3): old pocket law, duct cup, no chord row
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) ring(): dialect chosen by hostable chord
rep("""      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5,                      // CD law: frame inner edge clears the CD radius
                         kind==='mid'? rF+od*0.3536+0.006 : rF,   // mid: pocketed outboard; woofer: frame ON the board OVER its slot (SH96 photo)
                         0.12 );
      if(kind!=='mid') rF=Math.max(rF, dF-od*0.25);       // the slot stays under the frame footprint""",
"""      const chordAt=2*(cornerDist-rF);                    // what the corner board can host at the tap
      const FLUSH=(kind!=='mid') && (chordAt>=od+0.028);  // SH96 dialect only when the board hosts the frame; else F3 pocket dialect
      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5,                      // CD law: frame inner edge clears the CD radius
                         FLUSH? rF : rF+od*0.3536+0.006,  // flush: frame ON the board OVER its slot (SH96); else pocketed outboard (F3 reference)
                         0.12 );
      if(FLUSH) rF=Math.max(rF, dF-od*0.25);              // the slot stays under the frame footprint""")

# 2) mark the dialect on the driver for fitCheck + draw
rep("d.chamfer={dF:dF, plate:rPl, portR:rF, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rF), nOut:nOut.slice(), rF:rF, c0:c0, sa:saK, sb:sbK,",
    "d.chamfer={dF:dF, plate:rPl, portR:rF, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rF), flush:FLUSH?1:0, nOut:nOut.slice(), rF:rF, c0:c0, sa:saK, sb:sbK,")

# 3) chord row applies ONLY to flush drivers
rep("      { let chWorst=1e9;\n        for(const d of chs){ const m2=2*(d.chamfer.corner-d.chamfer.portR)-(d.od+0.028);   // flange ring is od+16; +12 clearance   // true 90-deg corner chord vs frame DIAMETER\n          chWorst=Math.min(chWorst,m2); }",
    "      { let chWorst=1e9;\n        for(const d of chs){ if(!d.chamfer.flush) continue;   // the chord bar is the FLUSH dialect's law; F3 pockets have no such bar\n          const m2=2*(d.chamfer.corner-d.chamfer.portR)-(d.od+0.028);\n          chWorst=Math.min(chWorst,m2); }\n        if(chWorst<1e8)")

# 4) draw path keys off d.chamfer.flush instead of dBF heuristic
rep("      if(dch.kind!=='mid' && dBF<=0.012){                     // FLUSH frame-on-board (SH96): plain flange ring, no cone (inverted cone drew crescents)",
    "      if(dch.chamfer&&dch.chamfer.flush){                     // FLUSH frame-on-board (SH96): plain flange ring + board patch, no cone")

rep("window.MEH_BUILD=74;","window.MEH_BUILD=74.2;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD74b dual dialect: %d -> %d chars'%(n0,len(src)))
