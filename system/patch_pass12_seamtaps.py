#!/usr/bin/env python3
# BUILD 56 - THE FLOATING-KIDNEY FIX (Marwan: "a bunch of them still do not look right").
# probe_tapsurface.js: chamfer kidneys sat at radial rPo ON THE DIAGONAL RAY - i.e. in open
# air INSIDE the horn (quadrant cavityMargin -76.5/-23.8 mm, pa3way -23.7 mm). The pocket
# disc was scenery pasted over a modeling hole; sweep's chamfer branch only checked
# rad<=corner so the class survived every gate.
# THE FIX (his plate photo + the wood-horn radial-slit photo agree): chamfer taps are
# CORNER-SEAM openings - on the surface by construction (the pyramid corner is a straight
# ridge), stacked ALONG the seam outward from the throat; the driver stays pocketed outside
# the corner (that machinery is verified). The disc dies. The sweep gains the on-surface
# invariant for chamfer taps so this class can never ship again.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) ring() chamfer: tap ON the seam at the law-driven station (same convention as the
#    diagonal dialect - the L12/Lw laws use the axial measure, so XO pins hold); seam
#    basis for port stacking; rim rebuilt in the plate frame (u must be exactly _|_ normal)
rep("""        place(kind,cW,nOut,od,dp);
        const d=list[list.length-1];
        d.portC=[xPort, rPo*e[1], rPo*e[2]];
        d.chamfer={dF:dF, plate:rPl, portR:rPo, phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rPl), nOut:nOut.slice()};""",
"""        place(kind,cW,nOut,od,dp);
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
        d.chamfer={dF:dF, plate:rPl, portR:Math.hypot(d.portC[1],d.portC[2]), phi:phi, corner:cornerDist, pocket:Math.max(0,dF-rPl), nOut:nOut.slice()};""")

# 2) mkPorts: kidneys stack ALONG the seam (straight ridge => exactly on-surface)
rep("""      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);
        const e3=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
        const offR=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.004);      // reference pockets: kidneys run RADIALLY
        const nP=vscale(vnorm(d.chamfer.nOut||d.normal),-1);   // kidneys open in the PLATE face (front-visible)
        const uP=vnorm(vcross(nP,[1,0,0]));
        d.ports.push({p:vadd(d.portC,vscale(e3,offR)), u:[1,0,0], v:uP, n:nP});
        continue; }""",
"""      if(d.chamfer){ const rPt=Math.sqrt(((d.kind==='mid'?S.apM:S.apW)*1e-4/Math.max(1,np))/Math.PI);
        const offS=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.006);      // kidneys stack ALONG the corner seam (his plate + slit photos)
        d.ports.push({p:vadd(d.portC,vscale(d.u,offS)), u:d.u.slice(), v:d.v.slice(), n:(d.chamfer.nOut||d.normal).slice()});
        continue; }""")

# 3) fitCheck chamfer rows: on-seam invariant replaces the three radial-stack rows
rep("""    if(chs.length){
      let worstIn=1e9, pocket=0;
      for(const d of chs){
        worstIn=Math.min(worstIn, d.chamfer.corner - d.chamfer.portR);
        pocket=Math.max(pocket, d.chamfer.pocket);
      }
      rows.push({sec:SEC,name:'Chamfer ports open inside the corner',val:(worstIn*1000).toFixed(0)+' mm',
        st: worstIn>=0.004?'ok':worstIn>=0?'warn':'fail',
        why: worstIn<0?'port kidney lands outside the horn cross-section - bigger horn or fewer/smaller ports':'port cluster clearance inside the corner line (reference kidneys)'});
      if(worstIn<0) for(const d of chs) d.collide=true;
      { const rP3=Math.sqrt((apK*1e-4/Math.max(1,npK))/Math.PI);
        let ringWorst=1e9;
        const inR=(npK>1)?(rP3+0.004):0;
        for(const d of chs) ringWorst=Math.min(ringWorst, (d.chamfer.portR-inR)*1.4142-(2*rP3+0.010));
        rows.push({sec:SEC,name:'Chamfer kidney ring fits',val:(ringWorst*1000).toFixed(0)+' mm',
          st: ringWorst>=0.004?'ok':ringWorst>=0?'warn':'fail',
          why: ringWorst<0?'adjacent corner kidneys collide - the tap must sit farther out (bigger corner) or ports smaller':'clearance between adjacent corner kidney clusters (his plate photo)'});
        if(ringWorst<0) for(const d of chs) d.collide=true;
        const rEdge=Math.min(...chs.map(d=>d.chamfer.corner-(d.chamfer.portR+((npK>1)?(rP3+0.004):0)+rP3)));
        rows.push({sec:SEC,name:'Chamfer kidneys within the corner run',val:(rEdge*1000).toFixed(0)+' mm',
          st: rEdge>=0.004?'ok':rEdge>=0?'warn':'fail',
          why:'the radial kidney stack must finish inside the corner line - walk the tap out if tight'});
        if(rEdge<0) for(const d of chs) d.collide=true;
      }
      rows.push({sec:SEC,name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',
        st:'ok', why:'the frame recesses in a printed/boxed pocket OUTSIDE the corner (his reference plate photo); the port kidneys are the horn opening'});
    }
  }""",
"""    if(chs.length){
      let worstS=0, pocket=0, worstAp=1e9;
      const rP3=Math.sqrt((apK*1e-4/Math.max(1,npK))/Math.PI);
      for(const d of chs){
        pocket=Math.max(pocket, d.chamfer.pocket);
        for(const pr of (d.ports||[])){
          const m=Math.abs(cavityMargin(st,pr.p)); if(m>worstS)worstS=m;
          const e2=Math.max(1e-4,st.depth*1e-3), a2=dimsAt(st,Math.max(0,pr.p[0]-e2)), b2=dimsAt(st,Math.min(st.depth,pr.p[0]+e2));
          const ds2=Math.hypot(2*e2,(b2.w-a2.w)/2,(b2.h-a2.h)/2)||1e-9, fx2=2*e2/ds2;
          worstAp=Math.min(worstAp, pr.p[0]-rP3*fx2-0.005);   // innermost kidney end vs the apex
        }
      }
      rows.push({sec:SEC,name:'Chamfer taps ride the corner seam',val:(worstS*1000).toFixed(1)+' mm off',
        st: worstS<=0.004?'ok':worstS<=0.007?'warn':'fail',
        why: worstS>0.004?'a kidney has drifted off the corner ridge - the tap must sit ON the horn boundary':'kidneys open through the corner seam surface (his plate + slit photos); 0 = exactly on the ridge'});
      if(worstS>0.007) for(const d of chs) d.collide=true;
      rows.push({sec:SEC,name:'Chamfer kidneys clear of the apex',val:(worstAp*1000).toFixed(0)+' mm',
        st: worstAp>=0.004?'ok':worstAp>=0?'warn':'fail',
        why: worstAp<0?'the innermost kidney crosses the throat apex - area the acoustics count is not physically there':'axial margin between the innermost kidney and the apex'});
      if(worstAp<0) for(const d of chs) d.collide=true;
      rows.push({sec:SEC,name:'Chamfer pocket depth (frame behind plate)',val:(pocket*1000).toFixed(0)+' mm',
        st:'ok', why:'the frame recesses in a printed/boxed pocket OUTSIDE the corner (his reference plate photo); the seam kidneys are the horn opening'});
    }
  }""")

# 3b) the woofer walk's chamfer-failure predicates follow the new row names
rep("/CD body|conform|ring spacing|within the wall|pads on the wall|kidney ring|inside the corner|corner run/",
    "/CD body|conform|ring spacing|within the wall|pads on the wall|corner seam|clear of the apex/")
rep("/within the wall|ring spacing|CD body|kidney ring|inside the corner|corner run/",
    "/within the wall|ring spacing|CD body|corner seam|clear of the apex/")

# 4) the floating pocket disc dies (the plate photo shows plate + kidney holes, no opening disc)
rep("""    if(d.chamfer){   // ARA pocket opening: recessed disc at the plate line (his printed-plate photo)
      const e=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
      const nO=d.chamfer.nOut||d.normal;
      const pr=(d.od/2)*0.97*sc;                       // the pocket hosts the frame - the opening IS frame-sized (his plate photo)
      const rIn=Math.max(d.chamfer.plate, d.chamfer.dF*0.82);   // centered under the frame, held at the plate line
      const disc=new THREE.Mesh(new THREE.CircleGeometry(pr,40),
        new THREE.MeshPhongMaterial({color:0xCBC5B8, shininess:3, side:THREE.DoubleSide}));
      const nIn3=new THREE.Vector3(-nO[0],-nO[2],-nO[1]).normalize();
      disc.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), nIn3);
      disc.position.set(d.portC[0]*sc, rIn*e[2]*sc, rIn*e[1]*sc);
      disc.userData.tag='fixture';
      grp.add(disc);
    }
""","")

# 5) remote woofers on curved shells get the same conformal skirt as the mids (his
#    "flying drivers need a printed mount" law; k55 rear showed daylight under the cans)
rep("""    } else if(st.form!=='rect' && !d.knPod){   // mounting pad (print families only - wood mounts flush to the board)
      const stH=(Math.max(0.002,(d.stand||0.012)-0.012)+0.003)*sc;""",
"""    } else if(st.form!=='rect' && !d.knPod){   // mounting pad (print families only - wood mounts flush to the board)
      const wedge=Math.min(0.075, MSP.padD/2000*0.55);   // conformal: the skirt buries into the curved shell (no daylight)
      const stH=(Math.max(0.002,(d.stand||0.012)-0.012)+0.003+wedge)*sc;""")

# 6) build bump
rep("window.MEH_BUILD=55;","window.MEH_BUILD=56;")
rep("build 55 · pa3way reference chamfer mids (per-kind pockets)",
    "build 56 · chamfer taps ride the corner seam (on-surface law; floating-kidney class extinct) · pa3way reference chamfer mids (per-kind pockets)")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD56 seam taps: %d -> %d chars'%(n0,len(src)))
