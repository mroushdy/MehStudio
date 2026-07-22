#!/usr/bin/env python3
# PASS 1 v2 (build 49): plM='knuckle' - SAWMOD S2 knuckle passages, CORRECT topology.
# The knuckle is a FOLDED PASSAGE: the driver stays seated on its wall (conformity applies);
# only a small port channel (pod) reaches inward, its injection face aimed at the throat.
# This is exactly Hornresp's Vtc/Ap1 tap model, and how SAWMOD gets ~49 mm port c-c from
# ~94 mm (whitepaper section 3) without giant hardware near the axis.
# Adds: pod solids in the collision model, HF-passage + S2-displacement checks, ports-row
# exemption (ports live in the pod face), ladder rungs knuckle->diagonal (FIT-row blindness
# fixed), knA param, pod rendering, storage key v39.
import io, re, sys
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read()
b0=len(src.encode('utf-8')); nrep=0
def rep(a,b,cnt=1,rx=False):
    global src,nrep
    if rx:
        src2,n=re.subn(a,b,src)
    else:
        n=src.count(a); src2=src.replace(a,b)
    assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src2; nrep+=1

# R1: DEF gains knA (pod reach along the aim line, inches)
rep("L12:1.5,cdDepth:1.4,nM:4,npM:1,plM:'diagonal',",
    "L12:1.5,cdDepth:1.4,knA:0.9,nM:4,npM:1,plM:'diagonal',")

# R2: pl normalization - knuckle degrades to edge on round families
rep("const pl0=(kind==='mid'?S.plM:S.plW)||'center'; const pl=(pl0==='cross')?'straddle':pl0;",
    "const pl0=(kind==='mid'?S.plM:S.plW)||'center'; let pl=(pl0==='cross')?'straddle':pl0; if(pl==='knuckle'&&st.form==='round')pl='edge';")

# R3: the knuckle placement branch - driver ON the wall, small pod channel inward
KN = """    if(pl==='knuckle' && st.form!=='round'){   // SAWMOD S2 knuckle: folded passage - driver on the wall, port channel aimed at the throat
      const apX=(kind==='mid'?S.apM:S.apW), npX=Math.max(1,((kind==='mid'?S.npM:S.npW)|0)||1);
      const rPod=Math.max(0.016, Math.sqrt((apX*1e-4/npX)/Math.PI)+0.011);
      const podLen=Math.max(0.012,(S.knA||0.9)*IN);
      const perFace=Math.ceil(n/2), dPk=dimsAt(st,xPort);
      for(let k=0;k<n;k++){
        const face=k%2?-1:1, idx=Math.floor(k/2);
        const span=dPk.w*0.72;
        let y= perFace===1?0:(idx/(perFace-1)-0.5)*span;
        if(perFace>1) y=Math.sign(y||1)*Math.max(Math.abs(y),(od+0.006)/2);
        let cW,nOut;
        if(st.form==='sup'){ const phi=azForLateral(st,xPort,y,face); cW=surfPt(st,xPort,phi); nOut=surfNormal(st,xPort,phi); }
        else { const e2=Math.max(1e-4,st.depth*2e-3);
          const dh2=(dimsAt(st,Math.min(xPort+e2,st.depth)).h-dPk.h)/(2*e2);
          cW=[xPort,y,face*dPk.h/2]; nOut=vnorm([-dh2,0,face]); }
        const target=[Math.max(0.004,xPort*0.15), y*0.45, 0];   // aim toward the throat, keeping lateral spread
        const dir=vnorm(vsub(target,cW));
        let Lp=podLen;                                          // reach self-limits at the HF-passage floor
        const minLat=(S.td||1)*IN/2 + rPod + 0.007;
        for(let t=0;t<40 && Lp>0.012;t++){ const f2=vadd(cW,vscale(dir,Lp));
          if(Math.hypot(f2[1],f2[2])>=minLat) break; Lp-=0.002; }
        const cF=vadd(cW,vscale(dir,Lp));                       // injection face near the axis
        place(kind,cW,nOut,od,dp);                              // the DRIVER seats on its wall (SAWMOD flange)
        const d=list[list.length-1];
        d.portC=cF.slice();
        d.knPod={base:cW.slice(),face:cF.slice(),r:rPod,len:Lp,n:dir.slice()};
        d.prims.push({c:vadd(cW,vscale(dir,Lp/2)), a:dir.slice(), h2:Lp/2, r:rPod});
        for(let j=0;j<10;j++){const a2=j/10*2*Math.PI;          // face ring joins the body cloud
          const u2=vnorm(vcross(dir,[1,0,0])), v2=vnorm(vcross(dir,u2));
          d.body.push(vadd(cF,vadd(vscale(u2,rPod*Math.cos(a2)),vscale(v2,rPod*Math.sin(a2)))));}
      }
      return;
    }
"""
rep("    // edge placement: the port hugs the throat at the cone's near edge; the DRIVER CENTER",
    KN+"    // edge placement: the port hugs the throat at the cone's near edge; the DRIVER CENTER")

# R4: mkPorts - knuckle ports live in the pod face, oriented along the passage
rep("      const off=np===1?0:(q/(np-1)-0.5)*d.od*0.56;\n      let p=vadd(d.portC,vscale(d.u,off)), u2=d.u, v2=d.v, n2=d.normal;",
    "      let off=np===1?0:(q/(np-1)-0.5)*d.od*0.56;\n"
    "      let p=vadd(d.portC,vscale(d.u,off)), u2=d.u, v2=d.v, n2=d.normal;\n"
    "      if(d.knPod){ n2=vscale(d.knPod.n,-1);\n"
    "        u2=(vlen(vcross(n2,[1,0,0]))<1e-6)?[0,1,0]:vnorm(vcross(n2,[1,0,0])); v2=vnorm(vcross(n2,u2));\n"
    "        off=np===1?0:(q/(np-1)-0.5)*d.knPod.r*1.1;\n"
    "        p=vadd(d.portC,vscale(u2,off)); }")

# R5: ports-row exemption only (the pads/frames row still applies - the driver IS on the wall)
rep("if((kind==='mid'?S.plM:S.plW)==='diagonal') continue;   // seam ports live ON the crease (Waslo corner passages)",
    "if(['diagonal','knuckle'].includes(kind==='mid'?S.plM:S.plW)) continue;   // seam/pod ports live off the panel (Waslo passages / SAWMOD knuckles)")

# R6: knuckle checks - HF passage clearance + S2 area displacement
KNROWS = """  { // SAWMOD knuckle checks: passages must leave the HF jet a throat-width channel; S2 displacement stays modest
    const pods=layout.filter(d=>d.knPod);
    if(pods.length){
      const tdR=(S.td||1)*IN/2;
      let worst=1e9;
      for(const d of pods){ const f=d.knPod.face;
        worst=Math.min(worst, Math.hypot(f[1],f[2])-d.knPod.r-tdR); }
      for(let i=0;i<pods.length;i++) for(let j=i+1;j<pods.length;j++){
        const a=pods[i].knPod.face,b=pods[j].knPod.face;
        worst=Math.min(worst, Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])-pods[i].knPod.r-pods[j].knPod.r); }
      rows.push({sec:'MID',name:'Knuckle passages clear the HF jet',val:(worst*1000).toFixed(0)+' mm',
        st: worst>=0.006?'ok':worst>=0?'warn':'fail',
        why: worst<0?'passage faces pinch the HF path below the throat - shorten the reach (knA) or fewer/smaller ports':'each injection face keeps the axis jet a throat radius; faces keep 6 mm apart'});
      if(worst<0) for(const d of pods) d.collide=true;
      let blocked=0; const xs=pods[0].knPod.base[0];
      for(const d of pods){ const n2=d.knPod.n, lat=Math.hypot(n2[1],n2[2]);
        blocked+=2*d.knPod.r*d.knPod.len*lat; }
      const frac=blocked/Math.max(1e-6,areaAt(st,xs));
      rows.push({sec:'MID',name:'Knuckle S2 area displacement',val:(frac*100).toFixed(0)+' %',
        st: frac<0.25?'ok':frac<0.40?'warn':'fail',
        why:'SAWMOD preserves S2 area by re-shaping the shell outward - keep passage displacement modest (compensate in the print)'});
    }
  }
"""
rep("  // GEOMETRIC PANEL FLOOR: every port must land on its wall between the creases",
    KNROWS+"  // GEOMETRIC PANEL FLOOR: every port must land on its wall between the creases")

# R7: applyAutos respects an explicit knuckle choice
rep("if(S.plM!=='corner'&&S.plM!=='edge') S.plM =",
    "if(S.plM!=='corner'&&S.plM!=='edge'&&S.plM!=='knuckle') S.plM =")

# R8: ladder rungs - FIT-row blindness fixed; try knuckle, then diagonal (the verified canon)
LADDER = """    { const tryPl=(plNew,note)=>{   // BUILD 49: corner/edge rungs were blind to the FIT-row mid-vs-woofer clash
        const ev0=MEH.evaluate(S);
        const still=ev0.fit.some(r=>((r.sec==='MID'&&/CD body|ring spacing|within the wall|pads on the wall|clear of the apex/.test(r.name))||/Mid ring vs woofer ring/.test(r.name))&&r.st==='fail')
          || ev0.layout.some(d2=>d2.kind==='mid'&&d2.collide) || /INFEASIBLE/.test(S.bindM||'');
        if(!still || S.plM===plNew || S.plM==='diagonal') return;
        if(plNew==='knuckle' && !(S.shape==='rect2f'||S.shape==='sup')) return;
        for(let x=1.0;x<=3.51;x+=0.15){   // re-solve the tap for the candidate placement (geometry-first)
          const evT=MEH.evaluate({...S,plM:plNew,L12:+x.toFixed(2)});
          const ok=!evT.fit.some(r=>((r.sec==='MID')||/Mid ring vs woofer ring/.test(r.name))&&r.st==='fail') && !evT.layout.some(d2=>d2.kind==='mid'&&d2.collide);
          if(ok){ S.plM=plNew; S.L12=+x.toFixed(2); S.bindM=note; return; }
        }
      };
      tryPl('knuckle','wall mids meet the woofers at the shared corner - moved to knuckle passages (SAWMOD S2)');
      tryPl('diagonal','wall mids meet the woofers at the shared corner (mouth-invariant) - mids snapped to the diagonal seams'); }
"""
rep("    const evm2=MEH.evaluate(S);\n    if(evm2.fit.some(r=>r.sec==='MID' && r.st==='fail'))",
    LADDER+"    const evm2=MEH.evaluate(S);\n    if(evm2.fit.some(r=>r.sec==='MID' && r.st==='fail'))")

# R9: plM select gains the knuckle option (plain-ASCII label, first in the list)
rep(r'(\["plM","Mid port placement","sel",\[)',
    r'\1["knuckle","Knuckle passage - port aimed at the throat (SAWMOD)"],', rx=True)

# R10: knA advanced parameter row + advKeys + MID_KEYS
rep(r'(\["plM","Mid port placement","sel",\[.*\]\]\],\n)',
    r'\1 ["knA","Knuckle reach","in",0.4,3.0,0.05],'+'\n', rx=True)
rep('"L12","cdDepth","plM","plW"', '"L12","cdDepth","plM","knA","plW"')
rep("new Set(['L12','plM','npM',", "new Set(['L12','plM','knA','npM',")

# R11: renderer - draw each pod channel (grp-level, world coords)
rep("    orientAlong(sub,[d.normal[0],d.normal[2],d.normal[1]]);",
    "    if(d.knPod){   // SAWMOD knuckle channel: printed boss from the wall to the injection face\n"
    "      const B=d.knPod.base, Fc=d.knPod.face;\n"
    "      const podM=cyl(d.knPod.r*sc*1.06, d.knPod.r*sc*1.30, d.knPod.len*sc, 0xd9d5cc, true);\n"
    "      orientAlong(podM,[d.knPod.n[0],d.knPod.n[2],d.knPod.n[1]]);\n"
    "      podM.position.set((B[0]+Fc[0])/2*sc,(B[2]+Fc[2])/2*sc,(B[1]+Fc[1])/2*sc);\n"
    "      grp.add(podM);\n"
    "    }\n"
    "    orientAlong(sub,[d.normal[0],d.normal[2],d.normal[1]]);")

# R12: storage schema changed -> bump the key (hard rule)
rep("mehstudio_v38","mehstudio_v39",cnt=3)

io.open(F,'w',encoding='utf-8').write(src)
b1=len(src.encode('utf-8'))
print("PASS1v2 PATCHED: %d replacements, %d -> %d bytes (+%d)"%(nrep,b0,b1,b1-b0))
