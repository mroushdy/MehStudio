#!/usr/bin/env python3
# BUILD 56c - THE REAL REFERENCE CHAMFER BOARDS (the F3 'aspirational' item, forced by the eyes:
# frames visibly poked through the walls into the horn air, and ridge taps had no honest
# surface). His square rear photo shows actual 45-deg chamfer boards running the depth of
# the box; the printed-plate photo shows kidneys opening through that board.
#  - ring(): facet line rF at the tap station (room for the kidney, clear of the throat);
#    the flat board is the plane through (xPort, rF*e) with the flare-riding normal nOut
#    (c0 stored). Taps sit ON the board; dF law gains 'frame FULLY behind the board'.
#  - mkPorts: kidneys stack along the board's axis - the board is FLAT, so straight
#    offsets stay exactly on it (the ridge-kink problem dies with the ridge).
#  - fitCheck: chord-covers-kidney row + frame-behind-board row (red on poke-through).
#  - sweep: tap must lie ON its board (|p.n - c0| <= 4mm).
#  - mesh3d: the boards are DRAWN (ribbon between the two wall intersections per station,
#    shell material) - they occlude the pocket works from the front, like the real box.
# Acoustic cross-section stays rect: the corner cut is ~1-2% area at the tap stations -
# a labeled allowance, consistent with how the pocket was already treated.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) ring() pre-loop: rF before dF; dF gains the behind-the-board term; radial-stack params die
rep("""      const cdR=(S.cdBodyD||10)*CM/2;
      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5-  (0),                // CD law: frame inner edge clears the CD radius
                         0.12 );
      const rPl=Math.min(cornerDist-0.004, dF);           // the plate rides the corner (or the frame line if inboard)
      const npc=Math.max(1,((kind==='mid'?S.npM:S.npW)|0)||1);
      const stack=((npc>1)?(rP2+0.004):0)+rP2+0.006;      // radial kidney stack must finish inside the corner
      const rPo=Math.max( (S.td||1)*IN*0.5+rP2+0.010,     // throat clearance
                          (2*rP2+0.010)/1.4142+((npc>1)?(rP2+0.004):0),   // ring law at the INNERMOST kidney
                          Math.min(rPl-rP2-0.008, cornerDist-stack-0.004) );   // inside the plate AND the corner run""",
"""      const cdR=(S.cdBodyD||10)*CM/2;
      const rF=Math.max((S.td||1)*IN*0.5+0.008,           // facet line: clear of the throat...
                        cornerDist-(rP2+0.010));          // ...with chord room for the kidney (reference board width law)
      const dF=Math.max( (od+0.010)*0.7072,               // pair law: four frames 90 deg apart clear each other
                         cdR+od*0.5,                      // CD law: frame inner edge clears the CD radius
                         rF+od*0.3536+0.006,              // frame FULLY behind the chamfer board - never in the horn air
                         0.12 );
      const rPl=Math.min(cornerDist-0.004, dF);           // the plate rides the corner (or the frame line if inboard)""")

# 2) ring() loop body: tap ON the board; board basis; c0/rF stored; pocket = frame->board
rep("""        place(kind,cW,nOut,od,dp);
        const d=list[list.length-1];
        const pA2=surfPt(st,Math.max(0,xPort-0.004),phi), pB2=surfPt(st,Math.min(st.depth,xPort+0.004),phi);
        const uSeam=vnorm(vsub(pB2,pA2));                  // along the corner ridge, toward the mouth
        d.v=vnorm(vcross(nOut,uSeam)); d.u=vnorm(vcross(d.v,nOut));
        d.rim.length=0; for(let j=0;j<24;j++){const a2=j/24*2*Math.PI;
          d.rim.push(vadd(d.center,vadd(vscale(d.u,od/2*Math.cos(a2)),vscale(d.v,od/2*Math.sin(a2)))));}
        const magTip2=vadd(d.center,vscale(nOut,dp)); d.magRim.length=0;
        for(let j=0;j<12;j++){const a2=j/12*2*Math.PI;
          d.magRim.push(vadd(magTip2,vadd(vscale(d.u,od*0.28*Math.cos(a2)),vscale(d.v,od*0.28*Math.sin(a2)))));}
        d.portC=surfPt(st,xPort,phi);                      // tap ON the seam (probe: rPo-ray points float in air)
        d.chamfer={dF:dF, plate:rPl, portR:Math.hypot(d.portC[1],d.portC[2]), phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rPl), nOut:nOut.slice()};""",
"""        place(kind,cW,nOut,od,dp);
        const d=list[list.length-1];
        const tap0=[xPort, rF*e[1], rF*e[2]];               // ON the chamfer board
        const c0=tap0[0]*nOut[0]+tap0[1]*nOut[1]+tap0[2]*nOut[2];
        d.v=[0,-e[2],e[1]]; d.u=vnorm(vcross(d.v,nOut));    // chord + board-axial basis
        d.rim.length=0; for(let j=0;j<24;j++){const a2=j/24*2*Math.PI;
          d.rim.push(vadd(d.center,vadd(vscale(d.u,od/2*Math.cos(a2)),vscale(d.v,od/2*Math.sin(a2)))));}
        const magTip2=vadd(d.center,vscale(nOut,dp)); d.magRim.length=0;
        for(let j=0;j<12;j++){const a2=j/12*2*Math.PI;
          d.magRim.push(vadd(magTip2,vadd(vscale(d.u,od*0.28*Math.cos(a2)),vscale(d.v,od*0.28*Math.sin(a2)))));}
        d.portC=tap0;
        d.chamfer={dF:dF, plate:rPl, portR:rF, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rF), nOut:nOut.slice(), rF:rF, c0:c0};""")

# 3) mkPorts: straight offsets along the FLAT board stay exactly on it
rep("""      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);
        const offS=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.006);      // kidneys stack ALONG the corner seam (his plate + slit photos)
        const phi3=d.chamfer.phi;
        const e4=Math.max(1e-4,st.depth*1e-3), aD=dimsAt(st,Math.max(0,d.portC[0]-e4)), bD=dimsAt(st,Math.min(st.depth,d.portC[0]+e4));
        const ds4=Math.hypot(2*e4,(bD.w-aD.w)/2,(bD.h-aD.h)/2)||1e-9, fx4=2*e4/ds4;
        const xq=Math.max(0.002, Math.min(st.depth*0.98, d.portC[0]+offS*fx4));   // arc-length step -> station
        const pq=surfPt(st,xq,phi3);                            // EXACT projection: on the ridge at every station (knees included)
        const ee2=1e-3, nq=vnorm(vadd(surfNormal(st,xq,phi3-ee2),surfNormal(st,xq,phi3+ee2)));
        const pqA=surfPt(st,Math.max(0,xq-0.004),phi3), pqB=surfPt(st,Math.min(st.depth,xq+0.004),phi3);
        const uq=vnorm(vsub(pqB,pqA)), vq=vnorm(vcross(nq,uq));
        d.ports.push({p:pq, u:uq, v:vq, n:nq});
        continue; }""",
"""      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);
        const offS=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.006);      // kidneys stack along the chamfer board (his slit photo)
        d.ports.push({p:vadd(d.portC,vscale(d.u,offS)), u:d.u.slice(), v:d.v.slice(), n:vscale(vnorm(d.chamfer.nOut),1)});
        continue; }""")

# 4) fitCheck: chord-covers-kidney + frame-behind-board (the poke-through killer)
rep("""      rows.push({sec:SEC,name:'Chamfer taps ride the corner seam',val:(worstS*1000).toFixed(1)+' mm off',
        st: worstS<=0.004?'ok':worstS<=0.007?'warn':'fail',
        why: worstS>0.004?'a kidney has drifted off the corner ridge - the tap must sit ON the horn boundary':'kidneys open through the corner seam surface (his plate + slit photos); 0 = exactly on the ridge'});
      if(worstS>0.007) for(const d of chs) d.collide=true;""",
"""      rows.push({sec:SEC,name:'Chamfer taps ride the corner seam',val:(worstS*1000).toFixed(1)+' mm',
        st: worstS>=0.004?'ok':worstS>=0?'warn':'fail',
        why: worstS<0?'the chamfer board is too narrow for the kidney at its station - tap further out or smaller ports':'chord margin: the board is wide enough for every kidney (reference board width law)'});
      if(worstS<0) for(const d of chs) d.collide=true;
      { let worstF=1e9;
        for(const d of chs){ const nO=d.chamfer.nOut;
          for(const p of d.rim){ const m2=p[0]*nO[0]+p[1]*nO[1]+p[2]*nO[2]-d.chamfer.c0; if(m2<worstF)worstF=m2; } }
        rows.push({sec:SEC,name:'Chamfer frame behind the board',val:(worstF*1000).toFixed(0)+' mm',
          st: worstF>=0.002?'ok':worstF>=-0.001?'warn':'fail',
          why: worstF<-0.001?'the frame rim pokes through the chamfer board into the horn air - deepen the pocket (bigger dF)':'the whole frame sits behind the board, inside the printed block (his plate photo)'});
        if(worstF<-0.001) for(const d of chs) d.collide=true;
      }""")
# 4b) worstS is now the chord margin, not an off-surface distance
rep("""      let worstS=0, pocket=0, worstAp=1e9;
      const rP3=Math.sqrt((apK*1e-4/Math.max(1,npK))/Math.PI);
      for(const d of chs){
        pocket=Math.max(pocket, d.chamfer.pocket);
        for(const pr of (d.ports||[])){
          const m=Math.abs(cavityMargin(st,pr.p)); if(m>worstS)worstS=m;""",
"""      let worstS=1e9, pocket=0, worstAp=1e9;
      const rP3=Math.sqrt((apK*1e-4/Math.max(1,npK))/Math.PI);
      for(const d of chs){
        pocket=Math.max(pocket, d.chamfer.pocket);
        const nO=d.chamfer.nOut, e1=Math.cos(d.chamfer.phi), e2=Math.sin(d.chamfer.phi);
        const den=nO[1]*e1+nO[2]*e2;
        for(const pr of (d.ports||[])){
          const dd2=dimsAt(st,Math.max(0,Math.min(st.depth,pr.p[0])));
          const rho=(d.chamfer.c0-nO[0]*pr.p[0])/(den||1e-9);
          const chord=Math.hypot(dd2.w/2,dd2.h/2)-rho;           // half-width of the board at this station
          const m=chord-(rP3+0.006); if(m<worstS)worstS=m;""")

# 5) sweep gate: on-board invariant (patched in sweep_gate.js separately)

# 6) mesh3d: DRAW the chamfer boards (ribbon between the wall intersections per station)
rep("""  grp.traverse(function(o){ if(o.isMesh && !o.userData.tag) o.userData.tag='shell'; });   // everything built so far is horn shell""",
"""  for(const dch of ev.layout.filter(d=>d.chamfer&&d.chamfer.c0!==undefined)){   // reference chamfer boards: real 45-deg corner facets (his square rear photo)
    const ch=dch.chamfer, e1=Math.cos(ch.phi), e2=Math.sin(ch.phi), nO=ch.nOut;
    const den=nO[1]*e1+nO[2]*e2; if(Math.abs(den)<1e-6) continue;
    const strip=[]; let prev=null;
    for(const pnt of pts){
      const a=pnt.w/2, b=pnt.h/2, k=ch.c0-nO[0]*pnt.x;
      const sy=Math.sign(e1)||1, sz=Math.sign(e2)||1;
      const z1=(k-nO[1]*sy*a)/(nO[2]||1e-9), y2=(k-nO[2]*sz*b)/(nO[1]||1e-9);
      const ok=(Math.abs(z1)<=b+1e-6)&&(Math.abs(y2)<=a+1e-6)&&(z1*sz>=-1e-6)&&(y2*sy>=-1e-6);
      const cur=ok? [[pnt.x,sy*a,z1],[pnt.x,y2,sz*b]] : null;
      if(prev&&cur){
        strip.push(prev[0][0]*sc,prev[0][2]*sc,prev[0][1]*sc, prev[1][0]*sc,prev[1][2]*sc,prev[1][1]*sc, cur[0][0]*sc,cur[0][2]*sc,cur[0][1]*sc);
        strip.push(prev[1][0]*sc,prev[1][2]*sc,prev[1][1]*sc, cur[1][0]*sc,cur[1][2]*sc,cur[1][1]*sc, cur[0][0]*sc,cur[0][2]*sc,cur[0][1]*sc);
      }
      prev=cur;
    }
    if(strip.length){
      const fg=new THREE.BufferGeometry(); fg.setAttribute('position',new THREE.Float32BufferAttribute(strip,3));
      fg.computeVertexNormals();
      const fb=new THREE.Mesh(fg,new THREE.MeshPhongMaterial({color:0xE3DFD6,shininess:5,side:THREE.DoubleSide}));
      fb.userData.tag='shell'; grp.add(fb);
    }
  }
  grp.traverse(function(o){ if(o.isMesh && !o.userData.tag) o.userData.tag='shell'; });   // everything built so far is horn shell""")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD56c facet boards: %d -> %d chars'%(n0,len(src)))
