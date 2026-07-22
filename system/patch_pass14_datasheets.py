#!/usr/bin/env python3
# BUILD 59 - DATASHEETS EXTRACTED (his ask) + THE DCX464 LANDS ON cd14.
# Web-extracted from bcspeakers.com / eighteensound.it official product pages:
#   10HPL64: Sd 320, Xmax 4,  VC 64,  BC 245  -> hpl10 (pa3way canon woofer, real numbers)
#   12NDL76: Sd 522, Xmax 7,  VC 76,  BC 298  -> ndl12
#   12LW1400:Sd 531, Xmax 8.25,VC 100, BC 296 -> es12lw (18Sound: "bandpass/horn loaded")
#   18PZB100:Sd 1134,Xmax 8,  VC 100, BC 440  -> pzb18 (sub island seed; free mode for now)
#   DE900TN: 1.4" exit, rec XO 1.2 kHz        -> de900 recXO 650->1200 (datasheet truth)
#   DE610:   1.4" exit, rec XO 1.2 kHz, D156x65 -> de610
#   DE500:   1.0" exit, rec XO 1.5 kHz, D102x51 -> de500
#   DCX464 (his STEP): TRUE body D152 x 78 mm - the cd14 class guess (170x130) was fat and
#   long by 18/52 mm; cd14 takes the CAD dims + the true body. recXO 600 stays (geometry-
#   derived JMOD-window canon, not a datasheet floor).
# w10/w12 return to honest generics (no mesh, no model name - their T/S are class values).
import io, json
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) woofers: generics reverted; four REAL presets added
rep("  w10:{name:'10\" woofer \\u2014 B&C 10HPL64 CAD body', od:26.0, dp:12,   sd:330, cone:21,   vtc:130, xm:8, mesh:'BC_10HPL64'},",
    "  w10:{name:'10\" woofer', od:26.0, dp:12,   sd:330, cone:21,   vtc:130, xm:8},")
rep("  w12:{name:'12\" woofer \\u2014 B&C 12NDL76 CAD body', od:31.5, dp:14,   sd:480, cone:25,   vtc:190, xm:9, mesh:'BC_12NDL76'},",
    "  w12:{name:'12\" woofer', od:31.5, dp:14,   sd:480, cone:25,   vtc:190, xm:9},\n"
    "  hpl10:{name:'B&C 10HPL64 (Ø261 · BC245 · true CAD)', od:26.1, dp:12.2, sd:320, cone:21, vtc:120, xm:4, bc:24.5, mesh:'BC_10HPL64'},\n"
    "  ndl12:{name:'B&C 12NDL76 neo (Ø315 · BC298 · true CAD)', od:31.5, dp:14.1, sd:522, cone:25, vtc:180, xm:7, bc:29.8, mesh:'BC_12NDL76'},\n"
    "  es12lw:{name:'18Sound 12LW1400 (Ø315 · BC296 · true CAD)', od:31.5, dp:14.1, sd:531, cone:25, vtc:180, xm:8.3, bc:29.6, mesh:'ES_12LW1400'},\n"
    "  pzb18:{name:'B&C 18PZB100 (Ø460 · BC440 · true CAD - sub island pending)', od:46.0, dp:20.2, sd:1134, cone:40, vtc:420, xm:8, bc:44.0, mesh:'BC_18PZB100'},")

# 2) CDs: cd14 takes the DCX464 truth; de900 datasheet XO; de610/de500 added
rep("  cd14: {name:'1.4\" coax CD (DCX464-class)', throat:1.4, depth:1.7, bodyD:17, bodyL:13, recXO:600},",
    "  cd14: {name:'B&C DCX464 1.4\" coax (true CAD body)', throat:1.4, depth:1.7, bodyD:15.2, bodyL:7.8, recXO:600, mesh:'BC_DCX464'},")
rep("  de900:{name:'B&C DE900TN 1.4\" (true CAD body)', throat:1.4, depth:1.7, bodyD:13.1, bodyL:6.5, recXO:650, mesh:'BC_DE900TN'},",
    "  de900:{name:'B&C DE900TN 1.4\" (true CAD body)', throat:1.4, depth:1.7, bodyD:13.1, bodyL:6.5, recXO:1200, mesh:'BC_DE900TN'},\n"
    "  de610:{name:'B&C DE610 1.4\" (true CAD body)', throat:1.4, depth:1.7, bodyD:15.6, bodyL:6.6, recXO:1200, mesh:'BC__DE610'},\n"
    "  de500:{name:'B&C DE500 1\" (true CAD body)', throat:1.0, depth:1.2, bodyD:10.2, bodyL:5.1, recXO:1500, mesh:'BC_DE500'},")

# 3) pa3way's canon woofer becomes the REAL 10HPL64
rep("  pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'w10', nW:2, cdSel:'cd14', shM:'rt', plM:'chamfer'},",
    "  pa3way:   {mouthW:30, thW:90, thV:90, midSel:'bc5nsm', nM:4, wfSel:'hpl10', nW:2, cdSel:'cd14', shM:'rt', plM:'chamfer'},")

# 4) curation: real models join their class menus
rep("  pa3way:    {mid:['m4','bc5nsm','bc5ndl'], woof:['w10','w12','bc10mbx','bc12pe'], cd:['cd14','dcm420']}",
    "  pa3way:    {mid:['m4','bc5nsm','bc5ndl'], woof:['hpl10','bc10mbx','ndl12','es12lw','bc12pe'], cd:['cd14','dcm420']}")
rep("  quadrant:  {woof:['bc12pe','bc12mh','w12','w10'], cd:['cd14','dcm420']},",
    "  quadrant:  {woof:['bc12pe','bc12mh','ndl12','es12lw','w12','w10'], cd:['cd14','dcm420']},")
rep("  unity:     {mid:['m2','m3'], woof:['w65','w8'], cd:['cd075','cd1','de980']},",
    "  unity:     {mid:['m2','m3'], woof:['w65','w8'], cd:['cd075','cd1','de980','de500']},")
rep("  knuckle:   {mid:['bc5nsm','bc5ndl'], woof:['bc8pe','bc8nw'], cd:['de980','de900','cd14']},",
    "  knuckle:   {mid:['bc5nsm','bc5ndl'], woof:['bc8pe','bc8nw'], cd:['de980','de900','de610','cd14']},")
rep("  wide:      {mid:['m2','m3','bc5ndl','bc5nsm'], woof:['w8','bc8pe','bc8nw','w10'], cd:['cd075','cd1','cd14','de980','de900']},",
    "  wide:      {mid:['m2','m3','bc5ndl','bc5nsm'], woof:['w8','bc8pe','bc8nw','w10'], cd:['cd075','cd1','cd14','de980','de900','de610']},")
rep("  roundprint:{mid:['m2','m3'], woof:['w65','w8'], cd:['cd075','cd1','cd14','de980','de900']},",
    "  roundprint:{mid:['m2','m3'], woof:['w65','w8'], cd:['cd075','cd1','cd14','de980','de900','de610','de500']},")

# 5) CADM: all eight bodies
import re
M=json.load(open('/tmp/spk/meshes.json'))
new='window.CADM='+json.dumps(M,separators=(',',':'))+';'
src,n=re.subn(r'window\.CADM=\{.*?\};', lambda m: new, src, count=1, flags=re.S)
assert n==1

rep("window.MEH_BUILD=58;","window.MEH_BUILD=59;")
rep("build 58 · TRUE B&C CAD bodies embedded (10HPL64 · 12NDL76 · DE900TN, from his STEP set)",
    "build 59 · 8 TRUE CAD bodies + datasheet presets (DCX464 on cd14 · 10HPL64 canon on pa3way · 12NDL76/12LW1400/18PZB100 · DE900TN/DE610/DE500, specs web-extracted from B&C/18Sound)")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD59: %d -> %d chars'%(n0,len(src)))
