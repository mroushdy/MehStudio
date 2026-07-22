#!/usr/bin/env python3
# BUILD 50b - Marwan's live-testing reports, probe-grounded (probe_live_reports.js):
# (#3) coax2@120: INFEASIBLE is correct physics (probe: crW 4.5-8 all fail) BUT the angle
#      governor never engaged (predicate blind to the ports row) and failed ports drew
#      as if fine. Fix: governor sees within-the-wall/pads/INFEASIBLE; failed ports draw RED.
# (#4) quadrant 'drivers still touching': TRUE - probe shows worst pair -2.2 mm,
#      MOUTH-INVARIANT (36/40/44 identical), hiding inside the -3 mm prim tolerance.
#      Fix: the cross sub-pair auto-STAGGERS axially (+<=40 mm, 5 mm steps) until the
#      corner pair clears 6 mm - real builds stagger opposing entries; ~20 mm is 0.03
#      wavelength at 495 Hz. Reported in bindW.
# (#5) knuckle 'drivers are flying': remote woofers now SEAT on the shell exterior
#      (bandpass-on-baffle look) instead of hovering at dp+30mm; ghost box contains them.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 5a: remote woofers seat flush on the exterior (frame gasket on the shell)
rep("      const off=vscale(d.normal, d.dp+0.030+ (st.form==='rect'?S.T*IN:0.012));",
    "      const off=vscale(d.normal, 0.008+ (st.form==='rect'?S.T*IN:0.012));   // seated on the shell exterior (bandpass-on-baffle)")

# 4a: swapIn split so a candidate list can be transformed and MEASURED before committing
rep("""  const swapIn=(extra)=>{ const sw2=v=>{const t=v[1];v[1]=v[2];v[2]=t;};
    for(const d of extra){ sw2(d.center); sw2(d.normal); sw2(d.u); sw2(d.v); sw2(d.portC);
      for(const p of d.rim) sw2(p); for(const p of d.magRim) sw2(p); for(const p of d.body) sw2(p);
      for(const P of d.prims){ sw2(P.c); sw2(P.a); }
      for(const pr of (d.ports||[])){ sw2(pr.p); if(pr.u)sw2(pr.u); if(pr.v)sw2(pr.v); if(pr.n)sw2(pr.n); }
      list.push(d); } };""",
"""  const swapOne=(d)=>{ const sw2=v=>{const t=v[1];v[1]=v[2];v[2]=t;};
    sw2(d.center); sw2(d.normal); sw2(d.u); sw2(d.v); sw2(d.portC);
    for(const p of d.rim) sw2(p); for(const p of d.magRim) sw2(p); for(const p of d.body) sw2(p);
    for(const P of d.prims){ sw2(P.c); sw2(P.a); }
    for(const pr of (d.ports||[])){ sw2(pr.p); if(pr.u)sw2(pr.u); if(pr.v)sw2(pr.v); if(pr.n)sw2(pr.n); }
    if(d.knPod){ sw2(d.knPod.base); sw2(d.knPod.face); sw2(d.knPod.n); }
    return d; };
  const swapIn=(extra)=>{ for(const d of extra) list.push(swapOne(d)); };""")

# 4b: the cross sub-pair staggers axially until the corner pair clears (probe-grounded fix)
rep("""  if(CROSS){
    swapIn(driverLayout({...S, plW:'straddle', nW:Math.floor((S.nW|0)/2), nM:0, dwall:'topbot'}, stSwap()).filter(d=>d.kind==='woof'));
  }""",
"""  if(CROSS){
    const base=list.filter(d=>d.kind==='woof');
    for(let sMM=0;sMM<=40;sMM+=5){                       // corner pair is mouth-invariant (-2.2 mm probed): stagger the swapped pair out
      const sub=driverLayout({...S, plW:'straddle', nW:Math.floor((S.nW|0)/2), nM:0, dwall:'topbot', Lw:S.Lw+sMM*0.001/IN}, stSwap())
        .filter(d=>d.kind==='woof').map(swapOne);
      let worst=1e9;
      for(const a of sub) for(const b of base){ const g=minRimDist(a,b); if(g<worst)worst=g; }
      if(worst>=0.006 || sMM>=40){
        for(const d of sub){ if(sMM>0) d.stag=sMM*0.001; list.push(d); }
        break;
      }
    }
  }""")

# 4c: the stagger is reported where every other auto move is
rep("  // fit-aware nudge: if the mid ring collides, slide it outward within the λ/4 budget.",
"""  { const evS=MEH.evaluate(S);
    const sg=Math.max(0,...evS.layout.map(d=>d.stag||0));
    if(sg>0 && !/staggered/.test(S.bindW||'')) S.bindW=(S.bindW||'')+' \\u00b7 cross pair staggered +'+Math.round(sg*1000)+' mm (corner clearance)';
  }
  // fit-aware nudge: if the mid ring collides, slide it outward within the λ/4 budget.""")

# 3a: the governor sees the ports/pads rows and the INFEASIBLE bind (was blind - probed)
rep("      if(!evg.fit.some(r=>r.st==='fail'&&/ring spacing|CD body|apex|woofer ring/.test(r.name))) break;",
    "      const gBad=evg.fit.some(r=>r.st==='fail'&&/ring spacing|CD body|apex|woofer ring|within the wall|pads on the wall/.test(r.name)) || /INFEASIBLE/.test((S.bindW||'')+(S.bindM||''));\n"
    "      if(!gBad) break;")

# 3b: ports whose row failed draw RED (the 'cut taps' now announce themselves)
rep("    for(const pr of (d.ports||[{p:d.portC,n:d.normal}])){\n      const nIn=new THREE.Vector3(-pr.n[0],-pr.n[2],-pr.n[1]);   // inward, three-space\n      const slot=new THREE.Mesh(new THREE.CircleGeometry(1,26),\n        new THREE.MeshBasicMaterial({color:0x232321,side:THREE.DoubleSide}));",
"""    const pFail=ev.fit.some(r=>r.sec===(d.kind==='mid'?'MID':'WOOF')&&/ports within|Seam taps|HF jet/.test(r.name)&&r.st==='fail');
    for(const pr of (d.ports||[{p:d.portC,n:d.normal}])){
      const nIn=new THREE.Vector3(-pr.n[0],-pr.n[2],-pr.n[1]);   // inward, three-space
      const slot=new THREE.Mesh(new THREE.CircleGeometry(1,26),
        new THREE.MeshBasicMaterial({color:(pFail||d.collide)?0xC8331D:0x232321,side:THREE.DoubleSide}));""")

# 5b: the ghost enclosure box contains remote bodies
rep("    const bw=(st.mouthW+2*wallT+2*mB)*sc, bh=(st.mouthH+2*wallT+2*mB)*sc, bd=(maxX-minX)*sc;",
"""    let mY=0,mZ=0;
    for(const d of ev.layout) if(d.remote) for(const p of d.body){ mY=Math.max(mY,Math.abs(p[1])); mZ=Math.max(mZ,Math.abs(p[2])); }
    const bw=Math.max((st.mouthW+2*wallT+2*mB),(2*mY+0.05))*sc, bh=Math.max((st.mouthH+2*wallT+2*mB),(2*mZ+0.05))*sc, bd=(maxX-minX)*sc;""")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD50b PATCHED: %d -> %d chars'%(n0,len(src)))
