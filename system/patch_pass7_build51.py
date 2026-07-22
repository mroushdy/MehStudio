#!/usr/bin/env python3
# BUILD 51 - MARWAN'S BAKED LAW: "always check drivers overlap + taps incorrect" and
# "drivers need not be centered on their taps".
# Sweep-gate findings on build 50 (13 SILENT states) fixed at the root:
#  A) sup tangent-offset ports never re-projected onto the shell (-18 mm off-surface -
#     his 'floating kidneys' screenshot). mkPorts now re-projects on sup like round.
#  B) cross-pass port clusters overlapped at corners (-22 mm, quadrant w12): straddle
#     spread now caps corner-aware (cross) and crease-aware (all rect walls).
#  C) DRIVER-OFF-TAP (doffW): frames slide along the wall - ports HOLD their acoustic
#     positions (Waslo canon / the reference 3-way offset kidneys). applyAutos walks it whenever any
#     woofer-involved pair truly interpenetrates (<0), accepts at >= +3 mm, never moves
#     canon layouts that are merely snug (unity stays centered). Reported in bindW.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# C1: DEF gains doffW
rep("L12:1.5,cdDepth:1.4,knA:0.9,crM:6,crW:4.5,",
    "L12:1.5,cdDepth:1.4,knA:0.9,crM:6,crW:4.5,doffW:0,")

# C2: ring() - the driver seat slides by doffW; the port keeps its tap position
rep("""        if(st.form==='sup'){
          const phi=azForLateral(st,x,y,face), phiP=azForLateral(st,xPort,y,face);
          place(kind, surfPt(st,x,phi), surfNormal(st,x,phi), od, dp);
          list[list.length-1].portC=surfPt(st,xPort,phiP);
        } else {
          const nrm=vnorm([-dh,0,face]);
          place(kind,[x,y,face*d.h/2],nrm,od,dp);
          list[list.length-1].portC=[xPort,y,face*dP.h/2];
        }""",
"""        const yD=(kind==='woof'&&S.doffW)? y+(face>0?1:-1)*(S.__flip?-1:1)*S.doffW*IN : y;   // frame slides; tap holds (Waslo)
        if(st.form==='sup'){
          const phi=azForLateral(st,x,yD,face), phiP=azForLateral(st,xPort,y,face);
          place(kind, surfPt(st,x,phi), surfNormal(st,x,phi), od, dp);
          list[list.length-1].portC=surfPt(st,xPort,phiP);
        } else {
          const nrm=vnorm([-dh,0,face]);
          place(kind,[x,yD,face*d.h/2],nrm,od,dp);
          list[list.length-1].portC=[xPort,y,face*dP.h/2];
        }""")

# C3: sub-passes get the opposing sign so adjacent walls slide APART
rep("swapIn(driverLayout({...S, plW:'straddle', nW:Math.floor((S.nW|0)/2), nM:0, dwall:'topbot'}, stSwap()).filter(d=>d.kind==='woof'));",
    "swapIn(driverLayout({...S, plW:'straddle', nW:Math.floor((S.nW|0)/2), nM:0, dwall:'topbot', __flip:1}, stSwap()).filter(d=>d.kind==='woof'));")
rep("swapIn(driverLayout({...S, nM:0, dwall:'topbot', __sidepass:1}, stSwap()).filter(d=>d.kind==='woof'));",
    "swapIn(driverLayout({...S, nM:0, dwall:'topbot', __sidepass:1, __flip:1}, stSwap()).filter(d=>d.kind==='woof'));")

# A+B: mkPorts - spread caps (crease-aware; corner-aware under cross) + sup re-projection
rep("""      let off=np===1?0:(q/(np-1)-0.5)*d.od*0.56;
      let p=vadd(d.portC,vscale(d.u,off)), u2=d.u, v2=d.v, n2=d.normal;""",
"""      let off=np===1?0:(q/(np-1)-0.5)*d.od*0.56;
      if(np>1 && st.form!=='round' && !d.knPod){                 // ports must clear the creases; cross clusters must clear the corner
        const rP=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/np)/Math.PI);
        const hLat=dimsAt(st,Math.min(d.portC[0],st.depth)).w/2;
        let cap=hLat-rP-0.008;
        if(d.kind==='woof'&&S.plW==='cross') cap=Math.min(cap, hLat-1.42*rP-0.006);
        const lo=rP+0.003, mag=Math.abs(off);
        off=Math.sign(off)*Math.max(lo, Math.min(mag, Math.max(lo,cap)));
      }
      let p=vadd(d.portC,vscale(d.u,off)), u2=d.u, v2=d.v, n2=d.normal;
      if(st.form==='sup' && Math.abs(off)>1e-9 && !d.knPod){     // tangent offsets leave the superellipse - re-project (his floating-kidney screenshot)
        const dm=dimsAt(st,Math.min(d.portC[0],st.depth));
        const phi2=Math.atan2(p[2],p[1]);
        const q2=outlinePt('sup',dm.w,dm.h,phi2);
        p=[d.portC[0], q2[0], q2[1]];
        n2=surfNormal(st,d.portC[0],phi2);
        u2=(vlen(vcross(n2,[1,0,0]))<1e-6)?[0,1,0]:vnorm(vcross(n2,[1,0,0])); v2=vnorm(vcross(n2,u2));
      }""")

# C4: applyAutos walks doffW whenever a woofer-involved pair truly interpenetrates
rep("  // fit-aware nudge: if the mid ring collides, slide it outward within the λ/4 budget.",
"""  { // BUILD 51 (Marwan's law): frames slide off their taps until nothing interpenetrates
    const worstW=(ev)=>{ let w=1e9; const L=ev.layout;
      for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
        if(L[i].kind!=='woof'&&L[j].kind!=='woof') continue;
        const g=MEH.minRimDist(L[i],L[j]); if(g<w)w=g; }
      return w; };
    S.doffW=0;
    let best=worstW(MEH.evaluate(S)), bestS=0;
    if(best<-0.0005 && S.plW!=='remote' && S.shape!=='cone' && S.shape!=='os'){
      const cap=Math.min(2.5, 0.4*S.coneW/2.54);
      for(let s2=0.1;s2<=cap+1e-9;s2+=0.1){
        S.doffW=+s2.toFixed(2);
        const ev2=MEH.evaluate(S);
        const bad=ev2.fit.some(r=>r.sec==='WOOF'&&r.st==='fail');
        const w2=worstW(ev2);
        if(!bad && w2>best){ best=w2; bestS=S.doffW; }
        if(!bad && w2>=0.003){ bestS=S.doffW; best=w2; break; }
      }
      S.doffW=bestS;
      if(bestS>0) S.bindW=(S.bindW||'')+' \\u00b7 drivers slid \\u00b1'+bestS.toFixed(1)+'\\u2033 off their taps (clearance - taps hold)';
    }
  }
  // fit-aware nudge: if the mid ring collides, slide it outward within the λ/4 budget.""")

# C5: param row + key groups + storage bump
rep(' ["crW","Woofer port compression Sd:Ap","",2,10,0.5],',
    ' ["crW","Woofer port compression Sd:Ap","",2,10,0.5],\n ["doffW","Driver offset from tap","in",0,3,0.05],')
rep('"L12","cdDepth","plM","knA","crM","crW","plW"', '"L12","cdDepth","plM","knA","crM","crW","doffW","plW"')
rep('const WOOF_KEYS=new Set(["wfSel","nW","plW","npW","crW",', 'const WOOF_KEYS=new Set(["wfSel","nW","plW","npW","crW","doffW",')
rep("mehstudio_v40","mehstudio_v41",cnt=3)
rep("build 50 · taps first-class","build 51 · sweep gate (no silent overlap/taps anywhere reachable) · driver-off-tap freedom · taps first-class")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD51 PATCHED: %d -> %d chars'%(n0,len(src)))
