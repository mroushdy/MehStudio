#!/usr/bin/env python3
# BUILD 50 - TAPS FIRST-CLASS (Marwan's screenshot escalation, 2026-07-20):
# (1) BUG: nM=2 diagonal mids landed on ADJACENT top seams (45/135) - a pair must OPPOSE
#     (45/225). phi step is now 2pi/n-aware for n<=2 while n=4 keeps the four seams.
# (2) Tap SIZE: crM/crW compression-ratio levers (the Waslo calc sheet canon defaults 6 / 4.5,
#     still velocity-capped at 17 m/s) - apM/apW derive from them; on-island tunable.
# (3) Tap SHAPE: applyAutos no longer stomps shM/shW to round; pa3way ships the reference 3-way
#     racetrack canon (shM:'rt'). Diagonal seams keep their slit law.
# (4) Tap VISIBILITY: per-port dimensions in INCHES on the acoustic-network lines and
#     the AUTO-DERIVED box. The 3-D slots were already drawn area-true.
# Storage v39 -> v40 (schema change). Defaults keep every settled number identical
# (crM=6 == /6, crW=4.5 == /4.5) - regression-safe by construction.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# R1: the seam-pair bug - a mid PAIR must oppose across the throat
rep("        const phi=Math.PI/4+k*Math.PI/2 + (n>4?(k>=4?Math.PI/8:0):0);",
    "        const step=(n<=2?Math.PI:Math.PI/2);               // a PAIR opposes (45/225); 4 fills the seams\n"
    "        const phi=Math.PI/4+k*step + (n>4?(k>=4?Math.PI/8:0):0);")

# R2: respect the chosen port shape (like plM/plW); keep sane defaults via DEF
rep("if(S.plW!=='diagonal'&&S.plW!=='cross'&&S.plW!=='remote'){ S.plW='straddle'; S.npW=2; } S.shM='round'; S.shW='round';",
    "if(S.plW!=='diagonal'&&S.plW!=='cross'&&S.plW!=='remote'){ S.plW='straddle'; S.npW=2; }   // shapes are the user's/island's call (build 50)")

# R3: crM/crW levers in DEF
rep("L12:1.5,cdDepth:1.4,knA:0.9,nM:4,npM:1,plM:'diagonal',",
    "L12:1.5,cdDepth:1.4,knA:0.9,crM:6,crW:4.5,nM:4,npM:1,plM:'diagonal',")

# R4: applyAutos derives port areas from the levers (velocity cap unchanged)
rep("  S.apM=+ (S.sdM/6).toFixed(2);                     // CR 6:1 mids (the Waslo calc sheet default)...",
    "  S.crM=Math.max(2,Math.min(12,S.crM||6)); S.crW=Math.max(2,Math.min(10,S.crW||4.5));\n"
    "  S.apM=+ (S.sdM/S.crM).toFixed(2);                 // CR lever, mids (the Waslo calc sheet default 6)...")
rep("  S.apW=+ (S.sdW/4.5).toFixed(1);                   // CR 4.5:1 woofers",
    "  S.apW=+ (S.sdW/S.crW).toFixed(1);                 // CR lever, woofers (default 4.5)")

# R5: PARAMS rows for the levers (advanced sections, near the port params)
rep(' ["knA","Knuckle reach","in",0.4,3.0,0.05],',
    ' ["knA","Knuckle reach","in",0.4,3.0,0.05],\n ["crM","Mid port compression Sd:Ap","",2,12,0.5],')
rep(' ["shW","Woofer port shape","sel",[["round","Round (drilled)"],["rt","Racetrack slot"]]],',
    ' ["shW","Woofer port shape","sel",[["round","Round (drilled)"],["rt","Racetrack slot"]]],\n ["crW","Woofer port compression Sd:Ap","",2,10,0.5],')

# R6: advanced visibility + key-group membership
rep('"L12","cdDepth","plM","knA","plW"', '"L12","cdDepth","plM","knA","crM","crW","plW"')
rep("new Set(['L12','plM','knA','npM',", "new Set(['L12','plM','knA','crM','npM',")
rep('const WOOF_KEYS=new Set(["wfSel","nW","plW","npW",', 'const WOOF_KEYS=new Set(["wfSel","nW","plW","npW","crW",')

# R7: on-island tuning - taps are a primary lever everywhere they exist
rep("unity:['mouthW','thW','cdSel','midSel','wfSel','nM'],",
    "unity:['mouthW','thW','cdSel','midSel','wfSel','nM','crM','crW','shM','shW'],")
rep("coax2:['mouthW','thW','cdSel','wfSel'],",
    "coax2:['mouthW','thW','cdSel','wfSel','crW','shW'],")
rep("quadrant:['mouthW','wfSel','cdSel'],",
    "quadrant:['mouthW','wfSel','cdSel','crW','shW'],")
rep("knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA'],",
    "knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA','crM','crW'],")
rep("wide:['mouthW','thW','wfSel','cdSel'],",
    "wide:['mouthW','thW','wfSel','cdSel','crW','shW'],")
rep("roundprint:['mouthD','cdSel','midSel','nM','wfSel','nW'],",
    "roundprint:['mouthD','cdSel','midSel','nM','wfSel','nW','crM','crW'],")
rep("pa3way:['mouthW','thW','cdSel','midSel','wfSel']",
    "pa3way:['mouthW','thW','cdSel','midSel','wfSel','crM','crW','shM','shW']")

# R8: pa3way ships the the reference 3-way racetrack canon
rep("pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'w10', nW:2, cdSel:'cd14'},",
    "pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'w10', nW:2, cdSel:'cd14', shM:'rt'},")

# R9: per-port dimensions in inches - helper + network lines + AUTO box
rep("  if(MEH.HAS_M(S)) seg.push(`<b>MID ×${S.nM}</b> — path ${f2(S.L12+S.cdDepth)}\" · Ap Σ ${f1(S.nM*S.apM)} cm² (${S.npM}/drv)",
    "  const portDims=(ap,np,shape,diag)=>{const Ap=ap/Math.max(1,np);   // cm² per port -> human inches\n"
    "    if(diag){const r=Math.sqrt(Ap/Math.PI); return 'slit '+(2*r*2.3/2.54).toFixed(2)+'×'+(2*r*0.435/2.54).toFixed(2)+'″';}\n"
    "    if(shape==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2); return 'slot '+(2*sa/2.54).toFixed(2)+'×'+(2*sa/2.2/2.54).toFixed(2)+'″';}\n"
    "    return 'Ø'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'″';};\n"
    "  if(MEH.HAS_M(S)) seg.push(`<b>MID ×${S.nM}</b> — path ${f2(S.L12+S.cdDepth)}\" · <b>${S.npM}× ${portDims(S.apM,S.npM,S.shM,S.plM==='diagonal')}/drv</b> (CR ${f1(S.sdM/S.apM)}:1) · Ap Σ ${f1(S.nM*S.apM)} cm² (${S.npM}/drv)")
rep("  if(MEH.HAS_W(S)) seg.push(`<b>WOOF ×${S.nW}</b> — path ${f2(S.Lw+S.cdDepth)}\" · Ap Σ ${f1(S.nW*S.apW)} cm² (${S.npW}/drv)",
    "  if(MEH.HAS_W(S)) seg.push(`<b>WOOF ×${S.nW}</b> — path ${f2(S.Lw+S.cdDepth)}\" · <b>${S.npW}× ${portDims(S.apW,S.npW,S.shW,S.plW==='diagonal')}/drv</b> (CR ${f1(S.sdW/S.apW)}:1) · Ap Σ ${f1(S.nW*S.apW)} cm² (${S.npW}/drv)")
rep("   `throat <b>${S.td}\"</b> · pattern to <b>${fHz(MEH.stations(S).pat.fH)} Hz</b><br>`+",
    "   (MEH.HAS_M(S)?`mid ports <b>${S.nM}×${S.npM} · ${(function(ap,np,sh,dg){const Ap=ap/Math.max(1,np); if(dg){const r=Math.sqrt(Ap/Math.PI);return 'slit '+(2*r*2.3/2.54).toFixed(2)+'×'+(2*r*0.435/2.54).toFixed(2)+'″';} if(sh==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2);return 'slot '+(2*sa/2.54).toFixed(2)+'×'+(2*sa/2.2/2.54).toFixed(2)+'″';} return 'Ø'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'″';})(S.apM,S.npM,S.shM,S.plM==='diagonal')}</b> · CR ${f1(S.sdM/S.apM)}:1<br>`:'')+\n"
    "   (MEH.HAS_W(S)?`woofer ports <b>${S.nW}×${S.npW} · ${(function(ap,np,sh,dg){const Ap=ap/Math.max(1,np); if(dg){const r=Math.sqrt(Ap/Math.PI);return 'slit '+(2*r*2.3/2.54).toFixed(2)+'×'+(2*r*0.435/2.54).toFixed(2)+'″';} if(sh==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2);return 'slot '+(2*sa/2.54).toFixed(2)+'×'+(2*sa/2.2/2.54).toFixed(2)+'″';} return 'Ø'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'″';})(S.apW,S.npW,S.shW,S.plW==='diagonal')}</b> · CR ${f1(S.sdW/S.apW)}:1<br>`:'')+\n"
    "   `throat <b>${S.td}\"</b> · pattern to <b>${fHz(MEH.stations(S).pat.fH)} Hz</b><br>`+")

# R10: storage schema changed -> bump; buildstamp -> 50
rep("mehstudio_v39","mehstudio_v40",cnt=3)
rep("build 49 · knuckle island LIVE",
    "build 50 · taps first-class (CR levers · shape canon · true-scale dims · n=2 seam-pair fix) · knuckle island LIVE")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD50 PATCHED: %d -> %d chars'%(n0,len(src)))
