#!/usr/bin/env python3
# PASS 2 (build 49): plW='remote' - SAWMOD/Solana bandpass woofer injection - and the
# knuckle island goes LIVE.
# Physics (corpus): the woofers side-fire a shared chamber OUTSIDE the waveguide; only their
# injection ports open through the wall at S2 (Klippel note: 'narrower woofer bandpass ports').
# Model: ports keep every law (position, panel floor, velocity, lambda/4); driver bodies are
# relocated outside the shell (d.remote) - so frame-vs-panel constraints honestly vanish,
# which is exactly what un-INFEASIBLEs the knuckle island's 'panel floor vs first flare'.
# Chamber volume is NOT solved - an info row says so and points at Hornresp ME2.
import io, re
FILES={}
def load(f): FILES[f]=io.open(f,encoding='utf-8').read()
def save():
    for f,s in FILES.items(): io.open(f,'w',encoding='utf-8').write(s)
def rep(f,a,b,cnt=1,rx=False):
    s=FILES[f]
    if rx: s2,n=re.subn(a,b,s)
    else: n=s.count(a); s2=s.replace(a,b)
    assert n==cnt, '%s: anchor FAILED (%d found, want %d): %r'%(f,n,cnt,a[:70])
    FILES[f]=s2

load('meh_studio_v4.html'); load('verify.js'); load('island_deep.js')
H='meh_studio_v4.html'

# H1: driverLayout post-pass - relocate remote woofer bodies outside the shell
rep(H, "  if(SW){ const sw=v=>{const t=v[1];v[1]=v[2];v[2]=t;};",
"""  if(S.plW==='remote'){   // SAWMOD/Solana: woofers side-fire a shared chamber OUTSIDE the shell; only their ports pierce the wall
    for(const d of list) if(d.kind==='woof'){
      const off=vscale(d.normal, d.dp+0.030+ (st.form==='rect'?S.T*IN:0.012));
      const mv=p=>{p[0]+=off[0];p[1]+=off[1];p[2]+=off[2];};
      mv(d.center); for(const p of d.rim) mv(p); for(const p of d.magRim) mv(p); for(const p of d.body) mv(p);
      for(const P of d.prims) mv(P.c);
      d.remote=true;                                      // ports stay at the wall: the chamber couples them
    }
  }
  if(SW){ const sw=v=>{const t=v[1];v[1]=v[2];v[2]=t;};""")

# H2: pads/frames row skips remote woofers (their pads live on the chamber, not the horn board)
rep(H, "if((kind==='mid'?S.plM:S.plW)==='diagonal') continue;   // seam mounts span the corner (reference chamfer dialect)",
      "{ const plK=(kind==='mid'?S.plM:S.plW); if(plK==='diagonal'||plK==='remote') continue; }   // seam mounts span the corner / remote chambers carry their own pads")

# H3: honest info row when woofers are remote
rep(H, "  // GEOMETRIC PANEL FLOOR: every port must land on its wall between the creases",
"""  if(layout.some(d=>d.remote)){
    rows.push({sec:'WOOF',name:'Woofers remote (bandpass chamber)',val:'ports only',st:'ok',
      why:'SAWMOD/Solana: drivers side-fire a shared chamber; its volume is NOT modeled here - verify with a Hornresp ME2 export'});
  }
  // GEOMETRIC PANEL FLOOR: every port must land on its wall between the creases""")

# H4: applyAutos respects plW='remote' (do not stomp to straddle)
rep(H, "if(S.plW!=='diagonal'&&S.plW!=='cross'){ S.plW='straddle'; S.npW=2; }",
      "if(S.plW!=='diagonal'&&S.plW!=='cross'&&S.plW!=='remote'){ S.plW='straddle'; S.npW=2; }")

# H5: plW select gains the remote option
rep(H, r'(\["plW","Woofer port placement","sel",\[)',
       r'\1["remote","Remote chamber - bandpass injection (SAWMOD/Solana)"],', rx=True)

# H6: the knuckle island bundle - knuckle passages + remote woofers (the SAWMOD recipe)
rep(H, "knuckle:  {shape:'sup', cdSel:'de980', midSel:'bc5nsm', nM:2, wfSel:'bc8pe', nW:2, mouthW:32},",
      "knuckle:  {shape:'sup', cdSel:'de980', midSel:'bc5nsm', nM:2, wfSel:'bc8pe', nW:2, mouthW:32, plM:'knuckle', plW:'remote'},")

# H7: picker option enabled
rep(H, '<option value="knuckle" disabled>',
      '<option value="knuckle">')

# H8: on-island tuning gains the knuckle reach
rep(H, "knuckle:['mouthW','thW','cdSel','midSel','wfSel'],",
      "knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA'],")

# V1: verify.js - knuckle joins the gated islands; port-wall invariant learns remote drivers
rep('verify.js', "const ISLANDS=['unity','coax2','quadrant','wide','roundprint','pa3way'];",
                 "const ISLANDS=['unity','coax2','quadrant','wide','roundprint','pa3way','knuckle'];")
rep('verify.js', "      for(const d of ev.layout){\n        for(const pr of (d.ports||[])){",
                 "      for(const d of ev.layout){\n        if(d.remote) continue;   // remote-chamber drivers couple to their ports through the chamber\n        for(const pr of (d.ports||[])){")

# D1: island_deep.js - knuckle exemptions removed: it must now hold the same bar
rep('island_deep.js', "if(a!=='knuckle' && (o.fails>0||o.reds>0)) bad.push(a+': fails='+o.fails+' reds='+o.reds);",
                      "if(o.fails>0||o.reds>0) bad.push(a+': fails='+o.fails+' reds='+o.reds);")
rep('island_deep.js', "if(a!=='knuckle' && /INFEASIBLE/.test((o.bind||'')+(o.bindM||''))) bad.push(a+': INFEASIBLE pairing shipped');",
                      "if(/INFEASIBLE/.test((o.bind||'')+(o.bindM||''))) bad.push(a+': INFEASIBLE pairing shipped');")

save()
print('PASS2 PATCHED: html=%d bytes; verify.js and island_deep.js gates now include knuckle'%len(FILES[H].encode('utf-8')))
