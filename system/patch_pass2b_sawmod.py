#!/usr/bin/env python3
# PASS 2b: SAWMOD wall assignment for the knuckle island (corpus-grounded):
#  - knuckle mids seat on the WIDE wall pair (SAWMOD: midrange flanges left/right of the CD),
#    chosen automatically by comparing local w vs h at the tap station;
#  - remote woofer ports cluster TIGHT (bandpass slots are port-sized, not driver-width
#    straddles - Solana: 'narrower woofer bandpass ports');
#  - the island runs dwall='topbot' so woofer ports take the other (narrow) pair.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) knuckle branch: wide-wall auto-seating (side pair when w dominates)
rep("""        let cW,nOut;
        if(st.form==='sup'){ const phi=azForLateral(st,xPort,y,face); cW=surfPt(st,xPort,phi); nOut=surfNormal(st,xPort,phi); }
        else { const e2=Math.max(1e-4,st.depth*2e-3);
          const dh2=(dimsAt(st,Math.min(xPort+e2,st.depth)).h-dPk.h)/(2*e2);
          cW=[xPort,y,face*dPk.h/2]; nOut=vnorm([-dh2,0,face]); }
        const target=[Math.max(0.004,xPort*0.15), y*0.45, 0];   // aim toward the throat, keeping lateral spread""",
"""        const SIDE = dPk.w > dPk.h*1.05;                     // SAWMOD: pods live on the WIDE pair (left/right of the CD)
        let cW,nOut;
        if(st.form==='sup'){
          if(SIDE){ let lo=-Math.PI/3, hi=Math.PI/3, phi=0;     // find phi on the y+ side where z==lat
            for(let t=0;t<20;t++){ phi=(lo+hi)/2; const q=outlinePt('sup',dPk.w,dPk.h,phi); (q[1]<y?lo=phi:hi=phi); }
            if(face<0) phi=Math.PI-phi;
            cW=surfPt(st,xPort,phi); nOut=surfNormal(st,xPort,phi);
          } else { const phi=azForLateral(st,xPort,y,face); cW=surfPt(st,xPort,phi); nOut=surfNormal(st,xPort,phi); }
        }
        else { const e2=Math.max(1e-4,st.depth*2e-3);
          if(SIDE){ const dw2=(dimsAt(st,Math.min(xPort+e2,st.depth)).w-dPk.w)/(2*e2);
            cW=[xPort, face*dPk.w/2, y]; nOut=vnorm([-dw2,face,0]); }
          else { const dh2=(dimsAt(st,Math.min(xPort+e2,st.depth)).h-dPk.h)/(2*e2);
            cW=[xPort,y,face*dPk.h/2]; nOut=vnorm([-dh2,0,face]); }
        }
        const target=SIDE? [Math.max(0.004,xPort*0.15), 0, y*0.45]
                         : [Math.max(0.004,xPort*0.15), y*0.45, 0];   // aim toward the throat, keeping lateral spread""")

# 2) mkPorts: remote woofer ports cluster tight (bandpass slots, not driver-width straddles)
rep("""      if(d.knPod){ n2=vscale(d.knPod.n,-1);""",
"""      if(d.kind==='woof' && S.plW==='remote'){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);
        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); p=vadd(d.portC,vscale(d.u,off)); }
      if(d.knPod){ n2=vscale(d.knPod.n,-1);""")

# 3) knuckle island: woofer ports take the narrow pair (dwall topbot)
rep("knuckle:  {shape:'sup', cdSel:'de980', midSel:'bc5nsm', nM:2, wfSel:'bc8pe', nW:2, mouthW:32, plM:'knuckle', plW:'remote'},",
    "knuckle:  {shape:'sup', cdSel:'de980', midSel:'bc5nsm', nM:2, wfSel:'bc8pe', nW:2, mouthW:32, plM:'knuckle', plW:'remote', dwall:'topbot'},")

io.open(F,'w',encoding='utf-8').write(src)
print('PASS2b PATCHED: %d -> %d bytes'%(n0,len(src)))
