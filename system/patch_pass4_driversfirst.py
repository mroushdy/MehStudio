#!/usr/bin/env python3
# PASS 4 (build 49): DRIVERS-FIRST DESIGNER - "which island do these drivers live on?"
# (Marwan's committed feature, handoff build 35: an outer loop over the existing evaluate.)
# A sidebar card: pick CD / mid / woofer -> every island is test-driven with them through the
# REAL pipeline (applyAutos: growth, walks, ladders), then scored honestly: lives-here /
# off-canon note / named infeasibility. State is saved and fully restored around the sweep.
# Also: the knuckle picker label reflects that the island is LIVE.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1,rx=False):
    global src
    if rx:
        src2,n=re.subn(a,b,src,flags=re.S)
    else:
        n=src.count(a); src2=src.replace(a,b)
    assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src2

# 1) DF card template (defined next to ARCH_CARD; uses SEL_OPTS)
rep("const WOOF_KEYS=new Set(",
"""const DF_CARD=`<div class="card" style="border-left:3px solid #1a6b3a;">
  <h2>Drivers-first - which island do these live on?</h2>
  <p class="note" style="margin:4px 0 6px 0;">Pick the drivers you have; every island is test-driven with them through the full solver.</p>
  <select id="df_cd" style="width:100%;margin:2px 0;"><option value="">(any CD)</option>${SEL_OPTS.cdSel.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
  <select id="df_mid" style="width:100%;margin:2px 0;"><option value="">(any mid)</option>${SEL_OPTS.midSel.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
  <select id="df_wf" style="width:100%;margin:2px 0;"><option value="">(any woofer)</option>${SEL_OPTS.wfSel.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
  <button id="df_go" style="width:100%;margin:6px 0 2px 0;">Test the islands</button>
  <div id="df_out" class="note"></div>
</div>`;
const WOOF_KEYS=new Set(""")

# 2) card appended to the sidebar + button wiring
rep("  el.innerHTML=h;",
"""  h+=DF_CARD;
  el.innerHTML=h;
  { const g=document.getElementById('df_go'); if(g) g.addEventListener('click',()=>window.driversFirst&&window.driversFirst()); }""")

# 3) the sweep itself (page-level, after ARCH exists at click time)
rep("window.curArch='unity';",
"""window.driversFirst=function(){
  const cd=(document.getElementById('df_cd')||{}).value||'';
  const md=(document.getElementById('df_mid')||{}).value||'';
  const wf=(document.getElementById('df_wf')||{}).value||'';
  const S0=JSON.parse(JSON.stringify(S)), a0=window.curArch, f0=window._fitIter||0, g0=window._grew0||0;
  const rows=[];
  for(const isl of Object.keys(window.ARCH)){ if(isl==='free') continue;
    window.curArch=isl; window._fitIter=0; window._grew0=0;
    S={...DEF, ...window.ARCH[isl]};
    if(cd) S.cdSel=cd; if(md) S.midSel=md; if(wf) S.wfSel=wf;
    let err='';
    try{ applyAutos(); }catch(e){ err=String(e).slice(0,40); }
    let fails=0, reds=0;
    try{ const ev=MEH.evaluate(S);
      fails=ev.fit.filter(r=>r.st==='fail').length; reds=ev.layout.filter(d=>d.collide).length;
    }catch(e){ err=err||String(e).slice(0,40); }
    const hasM=MEH.HAS_M(S);
    const D=(window.ARCH_DRV&&window.ARCH_DRV[isl])||{};
    const off=[cd&&D.cd&&!D.cd.includes(cd)?'CD':null, md&&hasM&&D.mid&&!D.mid.includes(md)?'mid':null, wf&&D.woof&&!D.woof.includes(wf)?'woofer':null].filter(Boolean);
    const infeas=/INFEASIBLE/.test((S.bindM||'')+(S.bindW||''));
    const green=!err && !fails && !reds && !infeas;
    rows.push({isl, green, off, fails, reds, infeas, err,
      mouth:(S.shape==='cone'||S.shape==='os')?S.mouthD+'\\u2033\\u00d8':S.mouthW+'\\u2033',
      XO:S.fxLo+'/'+S.fxHi,
      note: err? 'engine error' : green? (off.length? 'fits (off-canon: '+off.join(', ')+')':'lives here') : (infeas?'infeasible pairing':'fails '+fails+' \\u00b7 reds '+reds),
      midNA: !!md&&!hasM });
  }
  S=S0; window.curArch=a0; window._fitIter=f0; window._grew0=g0;
  buildSidebar(); update();
  const put=(id,v)=>{const e=document.getElementById(id); if(e)e.value=v;};
  put('df_cd',cd); put('df_mid',md); put('df_wf',wf);
  rows.sort((p,q)=>((q.green?1:0)-(p.green?1:0))||(p.off.length-q.off.length)||((p.fails+p.reds)-(q.fails+q.reds)));
  const el=document.getElementById('df_out');
  if(el) el.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:4px;">'+
    rows.map(r=>'<tr style="border-top:1px solid #ddd;"><td style="padding:2px 4px;font-weight:600;white-space:nowrap;">'+(r.green?'\\u2713 ':'\\u2717 ')+r.isl+'</td><td style="padding:2px 4px;">'+r.mouth+'</td><td style="padding:2px 4px;">'+r.XO+'</td><td style="padding:2px 4px;color:#666;">'+r.note+(r.midNA?' (2-way: mid unused)':'')+'</td></tr>').join('')+'</table>';
};
window.curArch='unity';""")

# 4) knuckle picker label reflects the live island
# (build-43 trap: \u escapes are illegal in python regex replacement templates - use a lambda)
LBL='<option value="knuckle">Molded / printed knuckle (SAWMOD/Solana) — knuckle passages + remote bandpass woofers</option>'
pat=re.compile(r'<option value="knuckle">[^<]*</option>')
n=len(pat.findall(src)); assert n==1, 'knuckle option anchor: %d'%n
src=pat.sub(lambda m: LBL, src)

io.open(F,'w',encoding='utf-8').write(src)
print('PASS4 PATCHED: %d -> %d bytes'%(n0,len(src)))
