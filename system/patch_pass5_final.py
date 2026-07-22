#!/usr/bin/env python3
# PASS 5 (build 49): Hornresp ME2 guidance (from the manual, verified field mapping),
# buildstamp -> build 49, advanced-mode binding labels stay honest.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) ME2 mapping guidance appended to the Hornresp card note (manual pp.44/56/65/77:
#    config ME1/ME2, taps at segment nodes, chamber-type tool, front-volume caveat)
rep("In Hornresp use the Multiple Entry Horn wizard (Help → Input Wizard); conical segments Con12/Con23/Con34 join S1→S2→S3→S4.</p>",
    "In Hornresp use the Multiple Entry Horn wizard (Help → Input Wizard); conical segments Con12/Con23/Con34 join S1→S2→S3→S4. "
    "<b>ME2 mapping</b> (manual): select config <b>ME1/ME2</b> via the Loudspeaker Configuration tool; each tap enters at a segment NODE with throat chamber <b>Vtc/Atc</b> and wall gate <b>Ap1/Lp</b> (throat-adapter mode — double-click the Ap1 label); sealed backs are <b>Vrc/Lrc</b>. "
    "<b>Add the driver's cone front volume to Vtc yourself</b> (Driver Front Volume tool — Hornresp does not add it). The Wizard is disabled in ME1/ME2 — use combined response.</p>")

# 2) the export text carries the same mapping so the .txt stands alone
rep("  HRtext=Object.entries(hr).map(([k,v])=>k+' = '+(typeof v==='number'?v.toFixed(3):v)).join('\\n');",
"""  HRtext='MEH STUDIO -> Hornresp ME2 record (the Waslo calc sheet conventions: areas/volumes are sums; lengths per driver)\\n'
    +'Config: ME1 (2-way) / ME2 (3-way) via the Loudspeaker Configuration tool. Taps enter at segment nodes.\\n'
    +'Per tap: throat chamber Vtc/Atc + wall gate Ap1/Lp (throat-adapter mode); sealed rear = Vrc/Lrc.\\n'
    +'NOTE: add each driver cone front volume to Vtc manually (Driver Front Volume tool).\\n\\n'
    +Object.entries(hr).map(([k,v])=>k+' = '+(typeof v==='number'?v.toFixed(3):v)).join('\\n');""")

# 3) buildstamp -> build 49
rep("build 25 · B&C driver library modeled from the mechanical drawings (frames · profiles · real bolt patterns) · first-flare cap on every family · printable pads with datasheet fastener schedules",
    "build 49 · knuckle island LIVE (SAWMOD S2 passages + remote bandpass woofers, corpus-grounded) · drivers-first designer · numeric suite v2 (72 checks, blessed settled-states) · Hornresp ME2 mapping · B&C library from the mechanical drawings")

# 4) honest tap-binding label in advanced mode (applyAutos is off there by design)
rep("   (MEH.HAS_M(S)?`mid taps at <b>${f2(S.L12)}\"</b> — set by <b>${S.bindM||'λ/4'}</b><br>`:'')+",
    "   (MEH.HAS_M(S)?`mid taps at <b>${f2(S.L12)}\"</b> — set by <b>${S.adv?'manual (advanced)':(S.bindM||'λ/4')}</b><br>`:'')+")
rep("   (MEH.HAS_W(S)?`woofer taps at <b>${f2(S.Lw)}\"</b> — set by <b>${S.bindW||'λ/4'}</b><br>`:'')+",
    "   (MEH.HAS_W(S)?`woofer taps at <b>${f2(S.Lw)}\"</b> — set by <b>${S.adv?'manual (advanced)':(S.bindW||'λ/4')}</b><br>`:'')+")

io.open(F,'w',encoding='utf-8').write(src)
print('PASS5 PATCHED: %d -> %d bytes'%(n0,len(src)))
