#!/usr/bin/env python3
# BUILD 52b - chamfer v2: REFERENCE POCKET GEOMETRY (his printed-plate photo, literally):
# the frame sits in a recessed pocket OUTSIDE the nominal corner; only the port kidneys
# open inside the horn. Seat distance dF is CLEARANCE-DRIVEN (pair law + CD law), the
# plate rides the corner, ports open just inside it. F3 must clear by construction.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# v2 branch: clearance-driven seats, plate at the corner, ports inside it
rep("""    if(pl==='chamfer' && st.form!=='round'){   // reference 45-deg corner plates: one frame per facet (his reference photos)
      const dPc=dimsAt(st,xPort);
      const padR=mountSpec(S,kind).padD/2000;
      const cornerDist=Math.hypot(dPc.w/2,dPc.h/2);
      const ell=Math.max(padR+0.006, od/2*0.62);           // facet half-length hosts the pad
      const dF=Math.max(od*0.35, cornerDist-ell);          // seat's diagonal distance (floor keeps the throat open)
      for(let k=0;k<n;k++){
        const phi=Math.PI/4+k*Math.PI/2;
        const e=[0,Math.cos(phi),Math.sin(phi)];
        const eP=Math.max(1e-4,st.depth*2e-3);
        const dd=(Math.hypot(dimsAt(st,Math.min(xPort+eP,st.depth)).w/2,dimsAt(st,Math.min(xPort+eP,st.depth)).h/2)-cornerDist)/(2*eP);
        const nOut=vnorm([-dd, e[1], e[2]]);               // facet normal rides the corner flare slope
        const cW=[xPort, dF*e[1], dF*e[2]];
        place(kind,cW,nOut,od,dp);
        const d=list[list.length-1];
        d.portC=cW.slice();
        d.chamfer={dF:dF, ell:ell, phi:phi, corner:cornerDist};
      }
      return;
    }""",
"""    if(pl==='chamfer' && st.form!=='round'){   // reference corner plates v2: frames in POCKETS outside the corner (his printed-plate photo)
      const dPc=dimsAt(st,xPort);
      const rP2=Math.sqrt(((kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,(kind==='mid'?S.npM:S.npW)|0||1))/Math.PI);
      const cornerDist=Math.hypot(dPc.w/2,dPc.h/2);
      const cdR=(S.cdBodyD||10)*CM/2;
      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5-  (0),                // CD law: frame inner edge clears the CD radius
                         0.12 );
      const rPl=Math.min(cornerDist-0.004, dF);           // the plate rides the corner (or the frame line if inboard)
      const rPo=Math.max((S.td||1)*IN*0.5+rP2+0.010, rPl-rP2-0.008);   // ports open just inside the plate
      for(let k=0;k<n;k++){
        const phi=Math.PI/4+k*Math.PI/2;
        const e=[0,Math.cos(phi),Math.sin(phi)];
        const eP=Math.max(1e-4,st.depth*2e-3);
        const dd=(Math.hypot(dimsAt(st,Math.min(xPort+eP,st.depth)).w/2,dimsAt(st,Math.min(xPort+eP,st.depth)).h/2)-cornerDist)/(2*eP);
        const nOut=vnorm([-dd, e[1], e[2]]);               // plate normal rides the corner flare slope
        const cW=[xPort, dF*e[1], dF*e[2]];
        place(kind,cW,nOut,od,dp);
        const d=list[list.length-1];
        d.portC=[xPort, rPo*e[1], rPo*e[2]];
        d.chamfer={dF:dF, plate:rPl, portR:rPo, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rPl)};
      }
      return;
    }""")

# rows v2: pocket depth + port-inside-corner (replace the brittle facet/cut rows)
rep("""  { // reference chamfer checks: each facet must host its pad; the cut must not eat the walls
    const chs=layout.filter(d=>d.chamfer);
    if(chs.length){
      const padR2=mountSpec(S,'woof').padD/2000;
      let worstF=1e9, worstT=-1e9, xs2=chs[0].chamfer? chs[0].portC[0]:0, areaCut=0;
      for(const d of chs){
        worstF=Math.min(worstF, d.chamfer.ell-padR2);
        const t=(d.chamfer.corner-d.chamfer.dF)*1.4142;
        worstT=Math.max(worstT, t);
        areaCut+=0.5*Math.pow(d.chamfer.corner-d.chamfer.dF,2)*2;
      }
      rows.push({sec:'WOOF',name:'Chamfer facet hosts the pad (reference plate)',val:(worstF*1000).toFixed(0)+' mm',
        st: worstF>=0.004?'ok':worstF>=0?'warn':'fail',
        why: worstF<0?'facet too short for the mounting pad - bigger horn or smaller woofers':'facet half-length beyond the pad radius (his corner-plate reference)'});
      if(worstF<0) for(const d of chs) d.collide=true;
      const dmc=dimsAt(st,xs2);
      const tFrac=worstT/Math.max(1e-6,Math.min(dmc.w,dmc.h)/2);
      rows.push({sec:'WOOF',name:'Chamfer cut vs wall',val:(tFrac*100).toFixed(0)+' %',
        st: tFrac<0.75?'ok':tFrac<0.95?'warn':'fail',
        why:'corner cut along each wall vs the half-panel - past ~75% the flat walls vanish (go bigger)'});
      const frac2=areaCut/Math.max(1e-6,dmc.w*dmc.h);
      rows.push({sec:'WOOF',name:'Chamfer corner-area displacement',val:(frac2*100).toFixed(0)+' %',
        st: frac2<0.30?'ok':frac2<0.45?'warn':'fail',
        why:'the throat region runs octagonal (reference); the shell keeps the square mouth - keep the cut modest'});
    }
  }""",
"""  { // reference chamfer checks v2: ports must open INSIDE the horn corner; pocket depth reported
    const chs=layout.filter(d=>d.chamfer);
    if(chs.length){
      let worstIn=1e9, pocket=0;
      for(const d of chs){
        worstIn=Math.min(worstIn, d.chamfer.corner - d.chamfer.portR);
        pocket=Math.max(pocket, d.chamfer.pocket);
      }
      rows.push({sec:'WOOF',name:'Chamfer ports open inside the corner',val:(worstIn*1000).toFixed(0)+' mm',
        st: worstIn>=0.004?'ok':worstIn>=0?'warn':'fail',
        why: worstIn<0?'port kidney lands outside the horn cross-section - bigger horn or fewer/smaller ports':'port cluster clearance inside the corner line (reference kidneys)'});
      if(worstIn<0) for(const d of chs) d.collide=true;
      rows.push({sec:'WOOF',name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',
        st:'ok', why:'the frame recesses in a printed/boxed pocket OUTSIDE the corner (his reference plate photo); the port kidneys are the horn opening'});
    }
  }""")

# ports: chamfer clusters are tight kidneys (like remote), and skip the rect crease-cap
rep("if(d.kind==='woof' && S.plW==='remote'){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);\n        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); }",
    "if(d.kind==='woof' && (S.plW==='remote'||S.plW==='chamfer')){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);\n        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); }")
rep("if(np>1 && st.form!=='round' && !d.knPod){                 // ports must clear the creases; cross clusters must clear the corner",
    "if(np>1 && st.form!=='round' && !d.knPod && !d.chamfer){   // ports must clear the creases; cross clusters must clear the corner")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD52b pockets: %d -> %d chars'%(n0,len(src)))
