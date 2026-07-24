/* MEH STUDIO v5 — PRINT-ONLY ENGINE (ground-up rebuild, Marwan's mandate 2026-07-23)
   ONE surface family: superellipse(n) cross-section swept along an ATH-style
   curvature-continuous flare with mouth roll-back. n=2 round · n=6 squircle ·
   n=12 "square" (printable corners). Sourced physics carried from v4 verbatim:
   λ/4 tap law, CR bands, 17 m/s port velocity, Keele mouth sizing, XO from geometry.
   TOPOLOGY: 1way (coax synergy-exit) · 2way (CD+woofers) · 3way (CD+mids+woofers).
   All mounting is PRINTED: apex insert (tap ring around throat bore), facet seats
   (driver over its slot, always), chamber housings for bandpass. No wood anywhere. */
"use strict";
const MEH2=(()=>{
const C=344, IN=0.0254, CM=0.01;
const d2r=d=>d*Math.PI/180;

/* ---- superellipse cross-section: |y/a|^n + |z/b|^n = 1 ---- */
function sePoint(a,b,n,phi){
  const c=Math.cos(phi), s=Math.sin(phi);
  const y=a*Math.sign(c)*Math.pow(Math.abs(c),2/n);
  const z=b*Math.sign(s)*Math.pow(Math.abs(s),2/n);
  return [y,z];
}
/* TRUE PANEL ring for CLASSIC ANGULAR: rectangle + 45-deg corner chamfers - eight
   FLAT segments (his call: straight panels, not a smoothed superellipse). The shape
   slider maps to chamfer size: square end = small chamfer, round end = wide (octagon). */
function panelRing(a,b,n,M){
  /* pin #7: the shape slider works in ANGULAR too - square end = rect + 45deg
     chamfers; round end = a 16-facet barrel (a 'circle' built from straight panels). */
  if(n<=7){
    const NF=Math.max(8, Math.round(22-2*n));       // n=2 -> 18 facets, n=7 -> 8
    const V=[]; for(let i=0;i<NF;i++){ const t=(i+0.5)/NF*2*Math.PI; V.push(sePoint(a,b,Math.max(n,2),t)); }
    const segs=[]; let L=0;
    for(let i=0;i<NF;i++){ const p=V[i], q=V[(i+1)%NF];
      const l=Math.hypot(q[0]-p[0],q[1]-p[1]); segs.push(l); L+=l; }
    const out=[]; let used=0, i=0;
    for(let k=0;k<M;k++){ const t=k/M*L;
      while(used+segs[i]<t){ used+=segs[i]; i=(i+1)%NF; }
      const f=(t-used)/(segs[i]||1e-9), p=V[i], q=V[(i+1)%NF];
      const pt=[p[0]+(q[0]-p[0])*f, p[1]+(q[1]-p[1])*f]; pt.param=Math.atan2(pt[1],pt[0]); out.push(pt); }
    return out;
  }
  const ch=(n>=11.75)? 0 : Math.max(0.06, Math.min(0.42, (12-n)/12*0.42+0.06));   // pin #17: TRUE square at the top of the slider - the .06 slivers were his 'weird corner angles'
  const ca=a*ch, cb=b*ch;
  const V=[ [a,-b+cb],[a,b-cb],[a-ca,b],[-a+ca,b],[-a,b-cb],[-a,-b+cb],[-a+ca,-b],[a-ca,-b] ];
  const segs=[]; let L=0;
  for(let i=0;i<8;i++){ const p=V[i], q=V[(i+1)%8];
    const l=Math.hypot(q[0]-p[0],q[1]-p[1]); segs.push(l); L+=l; }
  const out=[]; let acc=0, i=0, used=0;
  for(let k=0;k<M;k++){ const t=k/M*L;
    while(used+segs[i]<t){ used+=segs[i]; i=(i+1)%8; }
    const f=(t-used)/(segs[i]||1e-9), p=V[i], q=V[(i+1)%8];
    out.push([p[0]+(q[0]-p[0])*f, p[1]+(q[1]-p[1])*f]);
  }
  return out;
}
/* perimeter-parameterized ring (uniform arc spacing matters for clean meshes) */
function seRing(a,b,n,M,style){
  const ang = style!==undefined ? style==='angular'
            : (typeof S!=='undefined'&&S&&S.style==='angular');   // browser fallback
  if(ang) return panelRing(a,b,n,M);
  const raw=[], rawT=[]; let L=0;
  for(let i=0;i<=M*4;i++){ const t=i/(M*4)*2*Math.PI; raw.push(sePoint(a,b,n,t)); rawT.push(t); }
  const seg=[0]; for(let i=1;i<raw.length;i++){ L+=Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]); seg.push(L); }
  const out=[]; let j=0;
  for(let i=0;i<M;i++){ const t=i/M*L;
    while(seg[j+1]<t && j<seg.length-2) j++;
    const f=(t-seg[j])/((seg[j+1]-seg[j])||1e-9);
    const p=[raw[j][0]+(raw[j+1][0]-raw[j][0])*f, raw[j][1]+(raw[j+1][1]-raw[j][1])*f];
    p.param=rawT[j]+(rawT[j+1]-rawT[j])*f;      // TRUE surface parameter rides along (normals via surfN)
    out.push(p);
  }
  return out;
}
/* param for an arbitrary (y,z) target on the superellipse: nearest on a fine sweep */
function paramFor(aH,bH,n,y,z){
  let best=0,bd=1e9;
  for(let i=0;i<720;i++){ const t=i/720*2*Math.PI, p=sePoint(aH,bH,n,t);
    const d=Math.hypot(p[0]-y,p[1]-z); if(d<bd){bd=d;best=t;} }
  return best;
}

/* ---- ATH-style flare profile (curvature-continuous):
   half-width h(x) = ht + (hm-ht) * s(t)^p  with s = smoothstep blend of conical
   core and tanh-like termination, plus ROLL-BACK past the mouth plane.
   Sources: Keele mouth law for hm; the roll radius is the printable termination
   (Mother donut). This is a solver allowance shaped to be curvature-continuous;
   exact R-OSSE coefficients can be swapped in later without touching callers. ---- */
function profile(S){
  const th=d2r(S.covH/2);                       // wall angle target (coverage)
  const ht=S.throat*IN/2;
  const hm=S.mouthW*IN/2;
  if(S.topo==='1way'){
    /* PIN #21: the horn STARTS at the CD exit, expands fast to the coax cone's
       tap radius (the snout adapter, ~38 deg half-angle), then flares normally */
    /* THE DISH DERIVES FROM THE DRIVER (his photo note, 2026-07-23): the dish
       rim is the driver's mounting flange (the plate follows the cone OUT to
       the frame), the tap ring sits over the cone by construction, and the
       horn grows to host whatever coax is chosen - never the reverse. */
    /* ONE HORN (his correction #2, 2026-07-23): the driver's stock plastic
       horn is REMOVED - the print replaces it. Segment 1 copies the stock
       geometry (conical, TRUE HF exit from the datasheet to the 0.60R mouth
       at the cone plane, length ~ the driver depth); segment 2 is the dish
       face carrying the cone taps; segment 3 is the MEH flare. The response
       ladder, max-SPL and every path law now start at the REAL throat. */
    const rCone=(S.odW||22)*CM/2;
    const rDish=rCone+0.012;
    const rHF=((S.hfExit||20.1)/1000)/2;
    /* 6FHX51 CAD (build-504 study, od-relative): HF horn mouth Ø.60od PROUD of
       the cone, throat at depth .53od; cone rim Ø.72od. The print copies the
       stock horn's length, and the tap ring must land on the EXPOSED CONE
       ANNULUS [.60,.72]od - his pin #8: the old .70-.80 clamp parked the ring
       1 mm PAST the true rim on the 6FHX51. */
    const odm=(S.odW||22)*CM;
    /* PRINT DEPTH per construction (his ruling: 'the snoot starts at where
       the woofer paper cone is'): the print NEVER enters the driver. FIXED
       metal horn: the .53od is the DRIVER's own path (Lint, laws only) and
       the print sits at the proud mouth; REMOVABLE: funnel depth = baffle
       depth (.14od CAD) + xmax + 2mm standoff. */
    const Lh=(S.hornLen!==undefined)? S.hornLen :
      (S.hornType==='removable'? 0.14*odm+((S.xmC||S.xmW||4)/1000)+0.002 : 0.53*odm);
    /* funnel base per CONSTRUCTION: FIXED horn -> the proud mouth (.60od,
       CAD); REMOVABLE -> the print funnel only wraps the true exit (narrow
       funnel, WIDE saucer - his white print) */
    const rSM=(S.hornType==='removable')? rHF+0.008 : 0.60*rCone;
    const rimC=0.72*rCone;
    /* ring pinned MID-ANNULUS [.60,.72]od for BOTH constructions - the funnel
       (internal horn) owns the center either way; his reference holes sit just
       outside the funnel base, which IS this band (correction after the cx5
       render tore holes through the funnel wall) */
    const rP=(rSM+rimC)/2;
    const thA=d2r(38);
    const La=Lh+Math.max(0.008,(rDish-rSM)/Math.tan(thA));     // adapter depth kept (standoff + 38deg rim datum)
    const htC=rHF;                                             // the horn STARTS at the true exit
    /* ATH-STYLE FACE (his call): the printed face is a TRUE OBLATE-SPHEROID
       section (Geddes OS - the family ATH builds on): r=sqrt(r0^2+(x tanT)^2),
       throat-orthogonal at the exit (the trumpet neck), one continuous
       curvature to the rim - no funnel/saucer crease to print or hear.
       tanT solved so the curve lands exactly on (La|face span, rDish). */
    const r0F=(S.hornType==='removable')? rHF : rSM;           // print throat: exit wrap vs collar over the proud mouth
    const x0F=(S.hornType==='removable')? 0 : Lh;              // where the PRINT face begins
    const spanF=Math.max(0.008, La-x0F);
    const tanT=Math.sqrt(Math.max(1e-9,rDish*rDish-r0F*r0F))/spanF;
    const osR=x=> Math.sqrt(r0F*r0F + Math.pow((x-x0F)*tanT,2));
    const xTap=x0F+Math.sqrt(Math.max(0,rP*rP-r0F*r0F))/tanT;
    const rAt=x=> x<=x0F? (x0F>0? rHF+(rSM-rHF)*x/x0F : r0F) : osR(x);
    if(S.style==='angular'){
      /* REFERENCE D (Marwan's build photos, 2026-07-23): the ROUND printed dish
         (nOv:2) drops into a SQUARE straight-walled classic flare - single
         expansion at the coverage angle, flat printed mouth, corner wings
         bridge the dish rim to the square section. */
      const Da=Math.max(0.05,(hm-rDish)/Math.tan(th));
      const depth=La+Da, pts=[];
      const vm=Math.max(hm*Math.tan(d2r(S.covV/2))/Math.tan(th), rDish*1.05);
      for(let i=0;i<=16;i++){ const x=La*i/16;
        const r=rAt(x); pts.push({x, h:r, v:r, nOv:2}); }                     // replaced horn + ROUND dish
      for(let j=1;j<=32;j++){ const x=La+Da*j/32, t=j/32;
        pts.push({x, h:rDish+Math.tan(th)*(x-La), v:rDish+(vm-rDish)*t}); }   // V flares per-plane from the round rim
      /* xPrint: where the PRINTED part begins (his triple + US10506331).
         fixed metal horn -> the proud-mouth plane (Lh); removable -> the
         true exit. The stations BEFORE xPrint stay - they are the driver's
         own real acoustic path (response/XO laws ride the full ladder). */
      return {pts, depth, rollR:0, mouthH:hm, xAdapter:La, xTap, rBore:htC,
              xPrint:(S.hornType==='removable')?0:Lh};
    }
    const D2=Math.max(0.05,(hm-rDish)/Math.tan(th));
    const depth=La+D2, pts=[];
    const vmS=Math.max(hm*Math.tan(d2r(S.covV/2))/Math.tan(th), rDish*1.05);
    for(let i=0;i<=16;i++){ const x=La*i/16;
      const r=rAt(x); pts.push({x, h:r, v:r, nOv:2}); }                       // replaced horn + ROUND dish
    for(let j=1;j<=40;j++){ const t=j/40, x=La+D2*t, s2=t*t*(3-2*t);
      pts.push({x, h:rDish+(hm-rDish)*(0.72*t+0.28*s2), v:rDish+(vmS-rDish)*(0.72*t+0.28*s2)}); }
    const rollR=S.rollR*IN, M2=10;
    const hEnd=pts[pts.length-1].h, sl=(pts[pts.length-1].h-pts[pts.length-2].h)/(pts[pts.length-1].x-pts[pts.length-2].x);
    const a0=Math.atan(sl);
    for(let i=1;i<=M2;i++){ const a=a0+(Math.PI/2-a0)*(i/M2)*0.9;
      pts.push({x:depth+rollR*(Math.sin(a)-Math.sin(a0)), h:hEnd+rollR*((1-Math.cos(a))-(1-Math.cos(a0))), roll:true}); }
    return {pts, depth, rollR, mouthH:hm, xAdapter:La, xTap, rBore:htC,
            xPrint:(S.hornType==='removable')?0:Lh};
  }
  if(S.style==='angular'){
    /* PIN #12 - THE CLASSIC SHAPE (Waslo Synergy Calc v5, Main Panels sheet):
       flare 1 AT the coverage angle; flare 2 = the SECOND EXPANSION
       Theta2 = 90 + Theta/2, PER PLANE; flat mouth (no roll) - the printed
       front closes as the classic baffle face. Mouth height DERIVES from the
       V plane's own two slopes (D34 relations), not a constant aspect. */
    const thV=d2r(S.covV/2);
    const th2=d2r(45+S.covH/4), th2V=d2r(45+S.covV/4);
    const ar0=Math.tan(thV)/Math.tan(th);
    const vt=ht*ar0;
    /* the break sits just past the WOOFER station (Waslo: S3 -> S4 IS the second
       expansion) - layout feeds it back as _breakHint; first pass uses 72% growth.
       The first flare below the break is break-INDEPENDENT, so the fixed point
       lands in one iteration. */
    const xCone=(hm-ht)/Math.tan(th);
    let x0=(S._breakHint!==undefined)? S._breakHint : 0.72*xCone;
    x0=Math.max(0.04, Math.min(0.95*xCone, x0));
    const hb=ht+Math.tan(th)*x0;
    const depth=x0+(hm-hb)/Math.tan(th2);
    const pts=[];
    const N1=Math.max(8,Math.round(30*x0/depth)), N2=Math.max(6,40-N1);
    for(let i=0;i<=N1;i++){ const x=x0*i/N1;
      pts.push({x, h:ht+Math.tan(th)*x, v:vt+Math.tan(thV)*x}); }
    const vb=vt+Math.tan(thV)*x0;
    for(let j=1;j<=N2;j++){ const x=x0+(depth-x0)*j/N2;
      pts.push({x, h:hb+Math.tan(th2)*(x-x0), v:vb+Math.tan(th2V)*(x-x0)}); }
    return {pts, depth, rollR:0, mouthH:hm, xBreak:x0, slopeCos:Math.cos(th)};
  }
  const depth=Math.max(0.06,(hm-ht)/Math.tan(th));
  const rollR=S.rollR*IN;
  const N=48, pts=[];
  for(let i=0;i<=N;i++){ const t=i/N, x=t*depth;
    const s=t*t*(3-2*t);                        // smoothstep: zero slope at throat, eases to mouth
    const eased=ht+(hm-ht)*(0.72*t+0.28*s);     // smooth: mostly conical (pattern control) + eased ends
    pts.push({x, h:eased});
  }
  /* roll-back: quarter-torus past the mouth plane, tangent to the last segment */
  const M=10;
  const hEnd=pts[N].h, slope=(pts[N].h-pts[N-1].h)/(pts[N].x-pts[N-1].x);
  const a0=Math.atan(slope);
  for(let i=1;i<=M;i++){ const a=a0+(Math.PI/2-a0)*(i/M)*0.9;
    pts.push({x:depth+rollR*(Math.sin(a)-Math.sin(a0)),
              h:hEnd+rollR*((1-Math.cos(a))-(1-Math.cos(a0))), roll:true});
  }
  return {pts, depth, rollR, mouthH:hm};
}

/* stations: superellipse half-axes track the profile; aspect from covV/covH */
function stations(S){
  const pr=profile(S);
  const ar=Math.tan(d2r(S.covV/2))/Math.tan(d2r(S.covH/2));   // vertical/horizontal
  const morph=(x)=>{ if(S.style==='angular') return S.seN;
    const t=Math.min(1, x/(0.45*pr.depth)), s=t*t*(3-2*t);
    return 2+(S.seN-2)*s; };                             // M5/pin #20: ROUND at the CD exit -> the chosen shape (ATH canon)
  const nSt=(S.placeW==='chamfer')? Math.min(S.seN,11.5) : S.seN;   // corner boards live on chamfers - keep them
  return { form:'se', n:nSt, style:S.style,
           pts:pr.pts.map(p=>({x:p.x, a:p.h, b:(p.v!==undefined)?p.v:p.h*ar, roll:p.roll,
             n:(p.nOv!==undefined)?p.nOv:morph(p.x)})),   // Reference D: the dish stays ROUND inside an angular horn
           depth:pr.depth, rollR:pr.rollR, throat:(pr.rBore!==undefined)?pr.rBore:S.throat*IN/2, ar, xBreak:pr.xBreak, slopeCos:pr.slopeCos, xAdapter:pr.xAdapter, xTap:pr.xTap, xPrint:pr.xPrint };
}
function dimsAt(st,x){
  const P=st.pts;
  if(x<=P[0].x) return {a:P[0].a,b:P[0].b,n:P[0].n};   // keep the per-station shape (the round dish start was evaluating square)
  for(let i=1;i<P.length;i++){ if(P[i].x>=x){ const f=(x-P[i-1].x)/((P[i].x-P[i-1].x)||1e-9);
    return {a:P[i-1].a+(P[i].a-P[i-1].a)*f, b:P[i-1].b+(P[i].b-P[i-1].b)*f,
            n:(P[i-1].n!==undefined)? P[i-1].n+(P[i].n-P[i-1].n)*f : undefined}; } }
  const q=P[P.length-1]; return {a:q.a,b:q.b,n:q.n};
}
/* surface point + outward normal at station x, azimuth phi */
function surfPt(st,x,phi){ const d=dimsAt(st,x); const [y,z]=sePoint(d.a,d.b,(d.n!==undefined)?d.n:st.n,phi); return [x,y,z]; }
function surfN(st,x,phi){
  const e=Math.max(1e-4,st.depth*2e-3);
  const p0=surfPt(st,Math.max(0,x-e),phi), p1=surfPt(st,Math.min(st.depth,x+e),phi);
  const u=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]];
  const q0=surfPt(st,x,phi-0.02), q1=surfPt(st,x,phi+0.02);
  const v=[q1[0]-q0[0],q1[1]-q0[1],q1[2]-q0[2]];
  let n=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  const L=Math.hypot(...n)||1e-9; n=n.map(c=>c/L);
  /* orient outward (away from axis) */
  const p=surfPt(st,x,phi);
  if(n[1]*p[1]+n[2]*p[2]<0) n=n.map(c=>-c);
  return n;
}

/* ---- TOPOLOGY LAYOUTS (all printed; taps UNDER drivers always) ----
   1way: coax at apex - cone taps ring the CD bore in the printed apex insert.
   2way: CD at apex + nW woofers on facet seats at the λ/4 station, slot under each.
   3way: CD + nM mids ringing the apex insert + nW woofers further out.        */
function perimeterAt(st,x){
  const d=dimsAt(st,x), ring=seRing(d.a,d.b,(d.n!==undefined)?d.n:st.n,64,st.style);
  let L=0; for(let i=0;i<ring.length;i++){ const j=(i+1)%ring.length;
    L+=Math.hypot(ring[j][0]-ring[i][0],ring[j][1]-ring[i][1]); }
  return L;
}
/* smallest station whose PLACED ring truly clears: equal-arc seats, measured chords.
   No heuristic factors - construct the candidate and measure it (v5 discipline). */
function ringSeats(st,x,n,K,off){
  const d=dimsAt(st,x), ring=seRing(d.a,d.b,(d.n!==undefined)?d.n:st.n,K,st.style);
  const o=Math.round((off||0)*K);
  const out=[]; for(let k=0;k<n;k++) out.push(ring[(Math.round(k*K/n)+o)%K]);
  return out;
}
/* WALL-PAIR seats (his pin #1: 'like how danley does it'): wide-format horns put
   woofers in rows on the TOP/BOTTOM walls; tall formats use the sides. */
function pairSeats(st,x,n,vertical){
  const d=dimsAt(st,x), nn=(d.n!==undefined)?d.n:st.n;
  const nT=Math.ceil(n/2), nB=n-nT, out=[];
  const put=(count,sgn)=>{
    for(let i=0;i<count;i++){
      const t=count===1?0:((i/(count-1))-0.5)*2;
      let y,z;
      if(vertical){ z=t*d.b*0.60;
        y=sgn*d.a*Math.pow(Math.max(0,1-Math.pow(Math.abs(z/d.b),nn)),1/nn); }
      else{ y=t*d.a*0.60;
        z=sgn*d.b*Math.pow(Math.max(0,1-Math.pow(Math.abs(y/d.a),nn)),1/nn); }
      const p=[y,z]; p.param=paramFor(d.a,d.b,nn,y,z);   // proven normals via surfN
      out.push(p);
    } };
  put(nT,1); put(nB,-1);
  return out;
}
/* PIN #9: the flat-panel model for CLASSIC ANGULAR. Vertices mirror panelRing. */
function facetsAt(st,x){
  const d=dimsAt(st,x), a=d.a, b=d.b, V=[], ch=[];
  if(st.n<=7){
    const NF=Math.max(8, Math.round(22-2*st.n));
    for(let i=0;i<NF;i++){ const t=(i+0.5)/NF*2*Math.PI; V.push(sePoint(a,b,Math.max(st.n,2),t)); ch.push(false); }
  } else {
    const cf=(st.n>=11.75)? 0 : Math.max(0.06, Math.min(0.42, (12-st.n)/12*0.42+0.06));
    const ca=a*cf, cb=b*cf;
    V.push([a,-b+cb],[a,b-cb],[a-ca,b],[-a+ca,b],[-a,b-cb],[-a,-b+cb],[-a+ca,-b],[a-ca,-b]);
    for(let i=0;i<8;i++) ch.push(i%2===1);          // odd segments are the 45-deg chamfers
  }
  const out=[];
  for(let i=0;i<V.length;i++){ const p=V[i], q=V[(i+1)%V.length];
    const len=Math.hypot(q[0]-p[0],q[1]-p[1])||1e-9;
    const dir=[(q[0]-p[0])/len,(q[1]-p[1])/len];
    const mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    let n2=[dir[1],-dir[0]];
    if(n2[0]*mid[0]+n2[1]*mid[1]<0) n2=[-n2[0],-n2[1]];   // outward
    out.push({p,q,mid,dir,len,n2,ch:ch[i]});
  }
  return out.filter(f=>f.len>1e-6);   // pin #17: zero-width chamfers drop out - a true square is 4 plates
}
/* clamp-project a 2D point onto facet fi */
function projFacet(F,fi,pt,seatR){
  const f=F[fi];
  let t=(pt[0]-f.p[0])*f.dir[0]+(pt[1]-f.p[1])*f.dir[1];
  const m=Math.min(f.len/2, (seatR||0.02)*0.8);
  t=Math.max(m, Math.min(f.len-m, t));
  const q=[f.p[0]+f.dir[0]*t, f.p[1]+f.dir[1]*t];
  q.facet=fi; q.param=Math.atan2(q[1],q[0]);
  return q;
}
/* pairs rows snap by clamp-projection onto their panel. The dialect KNOWS which
   walls it means (pairsH = top/bottom, pairsV = sides) - filter facets by their
   outward normal so a wide horn can't pull a top-row seat onto a side wall. */
function snapSeats(st,x,pts,seatR,prefer){
  const F=facetsAt(st,x);
  let big=[]; for(let i=0;i<F.length;i++) if(!F[i].ch) big.push(i);
  if(prefer==='h'){ const fl=big.filter(i=>Math.abs(F[i].n2[1])>=Math.abs(F[i].n2[0])); if(fl.length) big=fl; }
  if(prefer==='v'){ const fl=big.filter(i=>Math.abs(F[i].n2[0])>Math.abs(F[i].n2[1])); if(fl.length) big=fl; }
  return pts.map(pt=>{ let bi=-1, bs=-2;
    const pl=Math.hypot(pt[0],pt[1])||1e-9;
    for(const i of big){ const f=F[i], ml=Math.hypot(f.mid[0],f.mid[1])||1e-9;
      const s=(pt[0]*f.mid[0]+pt[1]*f.mid[1])/(pl*ml); if(s>bs){ bs=s; bi=i; } }
    return projFacet(F,bi,pt,seatR); });
}
/* ANGULAR ring: seats distributed arc-uniformly over the BIG-panel perimeter
   itself (chamfers excluded from the domain). Monotonic walk - order-preserving,
   no bunching, panels share seats proportional to their length (SH96 wall rows). */
function ringSeatsAngular(st,x,n,off,seatR,diag){
  const F=facetsAt(st,x);
  /* PIN #15 - DIAG on the rect IS the 45-deg chamfer boards (SH50/v4 canon) */
  if(diag && st.n>7){
    const chs=[]; for(let i=0;i<F.length;i++) if(F[i].ch) chs.push(i);
    if(chs.length>=n){
      const out=[];
      for(let k=0;k<n;k++){ const fi=chs[Math.round(k*chs.length/n)%chs.length], f=F[fi];
        const q=[f.mid[0],f.mid[1]];
        q.facet=fi; q.param=Math.atan2(q[1],q[0]); out.push(q); }
      return out;
    }
  }
  /* PIN #13 - rect walls get a SYMMETRIC PARTITION, not a blind perimeter walk */
  if(!diag && st.n>7){
    const wall={};
    for(let i=0;i<F.length;i++){ const f=F[i]; if(f.ch) continue;
      if(Math.abs(f.n2[0])>Math.abs(f.n2[1])) wall[f.n2[0]>0?'R':'L']=i;
      else wall[f.n2[1]>0?'T':'B']=i; }
    if(wall.T!==undefined&&wall.B!==undefined&&wall.R!==undefined&&wall.L!==undefined){
      const base=(n/4)|0, rem=n%4;
      const cnt={T:base,B:base,R:base,L:base};
      const wide=F[wall.T].len>=F[wall.R].len;
      if(rem===1) cnt.B++;
      else if(rem===2){ if(wide){cnt.T++;cnt.B++;} else {cnt.R++;cnt.L++;} }
      else if(rem===3){ cnt.R++; cnt.L++; cnt.B++; }
      const out=[];
      for(const w of ['T','R','B','L']){ const fi=wall[w], f=F[fi], k=cnt[w];
        for(let i2=0;i2<k;i2++){
          let t=(i2+0.5)/k*f.len;
          const m=Math.min(f.len/2,(seatR||0.02)*0.8);
          t=Math.max(m,Math.min(f.len-m,t));
          const q=[f.p[0]+f.dir[0]*t, f.p[1]+f.dir[1]*t];
          q.facet=fi; q.param=Math.atan2(q[1],q[0]); out.push(q);
        } }
      return out;
    }
  }
  const big=[]; let LB=0;
  for(let i=0;i<F.length;i++) if(!F[i].ch){ big.push({i,start:LB}); LB+=F[i].len; }
  const o=(((off||0)%1)+1)%1;
  const out=[];
  for(let k=0;k<n;k++){
    const s=(((k+0.5)/n + o)*LB) % LB;
    let fi=big[big.length-1].i, t0=s-big[big.length-1].start;
    for(const g of big){ if(s>=g.start && s<g.start+F[g.i].len){ fi=g.i; t0=s-g.start; break; } }
    const f=F[fi];
    const m=Math.min(f.len/2, (seatR||0.02)*0.8);
    const t=Math.max(m, Math.min(f.len-m, t0));
    const q=[f.p[0]+f.dir[0]*t, f.p[1]+f.dir[1]*t];
    q.facet=fi; q.param=Math.atan2(q[1],q[0]);
    out.push(q);
  }
  return out;
}
/* facet PLANE normal in 3D: axial drift of the panel x its cross-direction */
function facetN(st,x,fi){
  const e=Math.max(1e-4,st.depth*2e-3);
  const A=facetsAt(st,Math.max(0,x-e))[fi], B=facetsAt(st,Math.min(st.depth,x+e))[fi];
  const u=[2*e, B.mid[0]-A.mid[0], B.mid[1]-A.mid[1]];
  const v=[0, A.dir[0], A.dir[1]];
  let n=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  const L=Math.hypot(n[0],n[1],n[2])||1e-9; n=[n[0]/L,n[1]/L,n[2]/L];
  if(n[1]*A.mid[0]+n[2]*A.mid[1]<0) n=[-n[0],-n[1],-n[2]];
  return n;
}
/* PIN #18: the OUTER wall of a printed shell is each panel pushed out by the
   wall thickness along its own normal (offset polygon), NOT a scaled copy -
   scaling widened the chamfers and misaligned the outer creases. */
/* exact outer-corner vertices (pin #18 offset polygon; pin #26 exposes them so
   the shell can build TRUE plates instead of resampling through the creases) */
function offsetVerts(st,x,wt){
  const F=facetsAt(st,x), NV=F.length, OV=[];
  for(let i=0;i<NV;i++){
    const A=F[(i-1+NV)%NV], B=F[i];
    const p1=[A.p[0]+wt*A.n2[0],A.p[1]+wt*A.n2[1]], d1=A.dir;
    const p2=[B.p[0]+wt*B.n2[0],B.p[1]+wt*B.n2[1]], d2=B.dir;
    const det=d1[0]*(-d2[1])-d1[1]*(-d2[0]);
    if(Math.abs(det)<1e-9){ OV.push(p2); continue; }
    const t=((p2[0]-p1[0])*(-d2[1])-(p2[1]-p1[1])*(-d2[0]))/det;
    OV.push([p1[0]+d1[0]*t, p1[1]+d1[1]*t]);
  }
  return OV;
}
function offsetRing(st,x,wt,M){
  if(st.style!=='angular'){ const d=dimsAt(st,x); return seRing(d.a+wt,d.b+wt,st.n,M,st.style); }
  const F=facetsAt(st,x), NV=F.length;
  const OV=offsetVerts(st,x,wt);
  const segs=[]; let L=0;
  for(let i=0;i<NV;i++){ const p=OV[i], q=OV[(i+1)%NV];
    const l=Math.hypot(q[0]-p[0],q[1]-p[1]); segs.push(l); L+=l; }
  const out=[]; let used=0, i=0;
  for(let k=0;k<M;k++){ const t=k/M*L;
    while(used+segs[i]<t){ used+=segs[i]; i=(i+1)%NV; }
    const f2=(t-used)/(segs[i]||1e-9), p=OV[i], q=OV[(i+1)%NV];
    out.push([p[0]+(q[0]-p[0])*f2, p[1]+(q[1]-p[1])*f2]); }
  return out;
}
function seatsFor(st,x,n,mode,off,seatR){
  const diag=(mode==='diag');
  if(diag){ off=0.5/n; mode='ring'; }                           // corner diamond = ring rotated half a pitch
  if(st.style==='angular' && mode!=='pairsH' && mode!=='pairsV')
    return ringSeatsAngular(st,x,n,off,seatR,diag);             // pin #9: panel-perimeter ring / #15: chamfer boards
  const seats = mode==='pairsH'? pairSeats(st,x,n,false)
       : mode==='pairsV'? pairSeats(st,x,n,true)
       : ringSeats(st,x,n,n*48,off||0);
  if(st.style==='angular') return snapSeats(st,x,seats,seatR, mode==='pairsH'?'h':'v');   // pin #9: rows clamp onto their OWN walls
  return seats;
}
function xForSeats(st,n,seatR,xMin,mode,off,obs){
  const xMax=st.depth*0.84;
  for(let x=xMin;x<=xMax;x+=st.depth/128){
    if(st.xBreak!==undefined && Math.abs(x-st.xBreak)<seatR*(st.slopeCos||1)+0.008) continue;   // a seat's AXIAL footprint is seatR*cos(wall slope) - don't straddle the crease
    const seats=seatsFor(st,x,n,mode,off,seatR);
    let ok=true;
    for(let i=0;i<n&&ok;i++) for(let j=i+1;j<n;j++){
      if(Math.hypot(seats[i][0]-seats[j][0],seats[i][1]-seats[j][1]) < 2*seatR+0.008){ ok=false; break; } }
    /* MEASURED clearance vs already-placed seats (no radii-sum heuristics -
       construct the candidate and measure it in 3D; v5 discipline) */
    if(ok&&obs) for(const q of seats){ const p3=[x,q[0],q[1]];
      for(const o of obs){ if(Math.hypot(p3[0]-o.p[0],p3[1]-o.p[1],p3[2]-o.p[2]) < seatR+o.r+0.008){ ok=false; break; } }
      if(!ok) break; }
    if(ok) return x;
  }
  return null;
}
function xForRing(st,n,seatR,xMin,off){ return xForSeats(st,n,seatR,xMin,'ring',off); }
function layout(S,st){
  const out=[];
  /* GEOMETRY FIRST, XO DERIVED (v4 coax2 canon, now universal):
     drivers sit at the smallest station whose ring fits them; the crossover
     falls out of the path length. fxHi/fxLo become CEILINGS to respect. */
  const seatW=S.odW*CM/2+0.011+(S._slotPad||0), seatM=S.odM*CM/2+0.011+(S._slotPad||0);   // _slotPad: the tap-footprint fixed point (his 'better system')
  const offW=0;
  /* DIALECT BY COVERAGE (pin #1): wide format -> woofer PAIRS on top/bottom walls
     (Danley canon); tall -> side pairs; near-square/round -> ring. */
  const ratio=Math.tan(d2r(S.covH/2))/Math.tan(d2r(S.covV/2));
  const nWn=((S.nW|0)||2);
  /* THE PLACEMENT MATRIX (docs/placement_matrix.md - pin #15):
     2 woofers -> ends of the LONG axis (pin #14, the Danley line);
     3+        -> coverage rows (wide: top/bottom, tall: sides) or the ring. */
  const auto=(S.topo==='1way')? 'ring'
           : nWn<=2 ? (ratio>=1? 'pairsV' : 'pairsH')            // pairsV(n=2) = one seat each side ON the horizontal line
           : ratio>=1.25? 'pairsH' : ratio<=0.8? 'pairsV' : 'ring';
  const modeW=(S.placeW&&S.placeW!=='auto')? S.placeW : auto;    // pin #10: explicit options + smart default
  S.dialectW=modeW+(S.placeW&&S.placeW!=='auto'?'':' (auto)');
  /* M7 - SH96 CANON (batch-2 photo correction): big multi-ways run the WOOFERS
     on the CORNER BOARDS (the 45° chamfer shelves, tight to the throat) and the
     mids in a TIGHT RING around the apex plate. 'chamfer' rides the proven
     diag/chamfer machinery; mids then ALWAYS apex-ring (corners are taken). */
  const modeWX = modeW==='chamfer' ? 'diag' : modeW;
  /* mids position RELATIVE to the woofers (the matrix, pin #15):
     2 mids -> the axis PERPENDICULAR to the woofer line; 4 mids beside axis or
     row woofers -> DIAG corner diamond (Hinson: "you see them in the corners";
     on CLASSIC ANGULAR the 45-deg chamfer boards ARE those corners - v4 canon);
     otherwise the coverage rows (Waslo widened-#2-panel canon). */
  const nMn=((S.nM|0)||4);
  const modeM = modeW==='chamfer' ? 'ring'                                // M7/SH96: corners carry WOOFERS - mids ring the apex
              : nMn<=2 ? (modeW==='pairsV'?'pairsH':'pairsV')
              : (ratio>=1.25)? 'pairsH' : (ratio<=0.8)? 'pairsV'          // wide/tall: rows (the diamond's vertical pairs collapse on non-square throats)
              : (nMn===4 && modeW!=='ring')? 'diag' : 'ring';             // SQUARE-regime 4-mid diamond (SH50 canon; chamfer boards on angular)
  S.dialectM=modeM;
  const xM0=xForSeats(st,(S.nM|0)||4,seatM,0.012,modeM,0);
  /* SH-96 construction (his interior shot): the mids ring the snout BETWEEN
     the corner chambers - rotate the ring to the offset that MEASURES the
     most clearance off the two 45deg diagonals. Deterministic argmax. */
  let offM=0;
  if(modeW==='chamfer'&&S.topo==='3way'&&xM0!=null){
    let best=-1;
    for(let k=0;k<24;k++){ const off=k/24; let mn=1e9;
      for(const q of seatsFor(st,xM0,(S.nM|0)||4,modeM,off,seatM))
        mn=Math.min(mn, Math.min(Math.abs(q[0]-q[1]),Math.abs(q[0]+q[1]))/Math.SQRT2);
      if(mn>best+1e-9){ best=mn; offM=off; } }
  }
  /* woofers start just past the mids and clear them by MEASUREMENT, not by a
     radii-sum heuristic (2x12in horns were being pushed to the mouth - pin #14 era) */
  const obsM=(S.topo==='3way'&&xM0!=null)?
    seatsFor(st,xM0,(S.nM|0)||4,modeM,offM,seatM).map(q=>({p:[xM0,q[0],q[1]], r:seatM})) : null;
  const xW0=xForSeats(st,(S.nW|0)||2,seatW,(S.topo==='3way'&&xM0!=null)?(xM0+0.01):0.02,modeWX,offW,obsM);
  const xM=xM0, xW=xW0;
  /* v4 LAW: the tap->diaphragm path makes a lambda/4 reflection NULL at C/(4*path);
     cross 1.2x BELOW it so the notch stays clear of the LR4 corner. */
  const XOK=1/1.2;
  S.fxDerived={ hi: xM!=null? Math.round(XOK*C/(4*((S.topo==='3way'?xM:xW||st.depth)+S.cdDepth*IN))) : null,
                lo: xW!=null? Math.round(XOK*C/(4*(xW+S.cdDepth*IN))) : null };
  const place=(kind,x,phi,od,dp)=>{
    const p=surfPt(st,x,phi), n=surfN(st,x,phi);
    out.push({kind, x, phi, center:p, normal:n, od, dp,
      tap:p,                                    // PRINTED LAW: the tap IS under the driver
      seatR:od/2+0.011});
  };
  /* pins #1/#23/#25 - flow direction u and cross direction v IN the wall plane
     at each seat. A straddling pair rides v (both ports on the SAME orthogonal
     disc = equal throat paths, Danley corner canon), never u ("behind each
     other" was the v4-era mistake the pins caught). */
  const flowCross=(nrm)=>{
    const fx=[1-nrm[0]*nrm[0], -nrm[0]*nrm[1], -nrm[0]*nrm[2]];
    const l=Math.hypot(fx[0],fx[1],fx[2])||1e-9, u=[fx[0]/l,fx[1]/l,fx[2]/l];
    return {u, v:[nrm[1]*u[2]-nrm[2]*u[1], nrm[2]*u[0]-nrm[0]*u[2], nrm[0]*u[1]-nrm[1]*u[0]]};
  };
  /* pin #23 (the print never lies): a driver frame is a FLAT ring, but smooth
     walls curve and small-facet polygons kink under it - the rim dips into the
     channel or stays buried in the wall solid. Every real build puts a FLAT
     LAND under the frame (the JW spot-face canon; wood builds router a pad).
     MEASURE the land: march each rim sample OUT of the wall solid along the
     mount axis; the raise is the worst exit distance + 2 mm print margin.
     Big flat facets measure 0 - no styling, no invented heights. */
  const outerHas=(x,y,z)=>{
    if(x<1e-4||x>st.depth-1e-4) return false;
    const wt=S.wallT||0.012;
    if(S.style==='angular'){
      const P=offsetVerts(st,x,wt);
      let inC=false;
      for(let i=0,j=P.length-1;i<P.length;j=i++)
        if(((P[i][1]>z)!==(P[j][1]>z)) && (y<(P[j][0]-P[i][0])*(z-P[i][1])/(P[j][1]-P[i][1])+P[i][0])) inC=!inC;
      return inC;
    }
    const d=dimsAt(st,x), n=(d.n!==undefined)?d.n:st.n;
    return Math.pow(Math.abs(y/(d.a+wt)),n)+Math.pow(Math.abs(z/(d.b+wt)),n)<1;
  };
  const landRaise=(c,A,rB)=>{
    const wt=S.wallT||0.012;
    let u=Math.abs(A[1])>0.9? [0,0,1]:[0,1,0];
    { const dd=u[0]*A[0]+u[1]*A[1]+u[2]*A[2];
      const w=[u[0]-dd*A[0],u[1]-dd*A[1],u[2]-dd*A[2]], l=Math.hypot(w[0],w[1],w[2])||1; u=[w[0]/l,w[1]/l,w[2]/l]; }
    const v=[A[1]*u[2]-A[2]*u[1], A[2]*u[0]-A[0]*u[2], A[0]*u[1]-A[1]*u[0]];
    let need=0;
    for(let q=0;q<24;q++){ const a2=q/24*2*Math.PI, cu=Math.cos(a2)*(rB-0.002), sv=Math.sin(a2)*(rB-0.002);   // 24 = superset of the battery's 8-point ring - no azimuth escapes the measure
      const p0=[c[0]+A[0]*wt+u[0]*cu+v[0]*sv, c[1]+A[1]*wt+u[1]*cu+v[1]*sv, c[2]+A[2]*wt+u[2]*cu+v[2]*sv];
      if(!outerHas(p0[0],p0[1],p0[2])) continue;
      let lo=0, hi=0.004;
      while(hi<0.16 && outerHas(p0[0]+A[0]*hi,p0[1]+A[1]*hi,p0[2]+A[2]*hi)){ lo=hi; hi+=0.004; }
      if(hi>=0.16){ need=Math.max(need,0.16); continue; }     // wall swallows the frame - the battery will say so
      for(let it=0;it<4;it++){ const mid=(lo+hi)/2;
        if(outerHas(p0[0]+A[0]*mid,p0[1]+A[1]*mid,p0[2]+A[2]*mid)) lo=mid; else hi=mid; }
      need=Math.max(need,hi);
    }
    return need>0? need+0.002 : 0;
  };
  /* seats at uniform ARC positions (uniform azimuth bunches on flattened superellipses) */
  const placeRing=(kind,x,nSeats,od,dp,arcOffset,mode)=>{
    for(const q of seatsFor(st,x,nSeats,mode||'ring',arcOffset||0,od/2+0.011)){
      const p=[x,q[0],q[1]];
      const nrm=(q.facet!==undefined)? facetN(st,x,q.facet)
              : surfN(st,x,(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]));   // ONE proven normal path per style
      const drv={kind, x, phi:Math.atan2(q[1],q[0]), center:p, normal:nrm, od, dp, tap:p, seatR:od/2+0.011, facet:q.facet};
      if(S.mount==='axial') drv.mountN=[-1,0,0];               // pin #5: spot-face land - body axis parallel to the horn axis
      { const lh=landRaise(p,drv.mountN||nrm,od/2); if(lh) drv.landH=lh; }   // pin #23: measured land/wedge-top clearance along the MOUNT axis
      const fc=flowCross(nrm); drv.flowU=fc.u; drv.crossV=fc.v;
      out.push(drv);
    }
  };
  if(S.topo!=='1way' && modeW==='chamfer'){
    /* CORNER BOARDS v3 (his pin #23: "how can you allow drivers to go through
       the horn like that" - v2 parked the woofers INSIDE the flare, bodies in
       the airway and through the walls). THE REAL SH96 CONSTRUCTION: the
       boards span the CABINET corners OUTSIDE the flare (batch-2 interior
       photo), the woofers fire INWARD through slots cut in the horn's corner
       (chamfer) facets, and they sit TIGHT TO THE THROAT - in a rectangular
       box the corner pocket is biggest where the horn is smallest. Box
       cross-section = the horn's outer mouth extremes (M9 boxDims governs
       identically). Pocket law: a 45° right-corner pocket holds the frame-OD
       cylinder iff board-to-corner depth >= rB + body depth + clearance. */
    const nB=Math.min(4,(S.nW|0)||4);
    const rB=S.odW*CM/2, dpB=S.dpW*CM, CLR=0.006;          // 6 mm = the repo print-clearance convention
    let hyB=0,hzB=0;
    for(const p of st.pts){ const x2=Math.max(1e-4,Math.min(st.depth-1e-4,p.x));
      for(const v2 of offsetVerts(st,x2,S.wallT||0.012)){
        if(Math.abs(v2[0])>hyB) hyB=Math.abs(v2[0]);
        if(Math.abs(v2[1])>hzB) hzB=Math.abs(v2[1]); } }
    /* DANLEY-DIALECT VENT (the b529 canon fork - ruling (a), SOURCED b530):
       the record's corner taps are SMALL and cut THROUGH THE WALLS AT THE
       SEAM - not bounded by the chamfer chord. SH-50 tape measure: 2.5in
       round taps at 10.5in from the throat (van Ommen, diyaudio 292379
       #4957246); chrisbln thing:6886663 ships the same 2.5in as canon; JMOD
       runs tapered teardrop vents ALONG the diagonal seams; HIS SH-96
       interior shot shows round SIDE-WALL openings at the corner chambers.
       The 17 m/s velocity-derived area (an nc535 worst-case heuristic;
       Hinson p.19's 17 m/s is reflex-port chuffing onset) demanded ~8x the
       record and made the family unbuildable - the b529 diagnosis. */
    const apW=31.67/((S.npW|0)||1);                       // cm^2: 2.5in round per woofer tap (measured SH-50 record)
    const portCross=(S.shW==='round')? Math.sqrt(apW*1e-4/Math.PI) : Math.sqrt(apW*1e-4/3)/2;
    const off0=(S.wallT||0.012)+0.018;                    // horn wall + 18 mm board
    let xB=null, raiseB=0;
    for(let x=0.02;x<=st.depth*0.95;x+=st.depth/256){
      const F=facetsAt(st,x);
      const fi=F.findIndex(f=>f.ch && f.mid[0]>0 && f.mid[1]>0);
      if(fi<0) break;                                     // no chamfer facets - no seam locus
      const f=F[fi], fmy=f.mid[0], fmz=f.mid[1];
      /* the frame spans its own radius ALONG the horn - a face parallel to
         the axis is overtaken by the flare within its own footprint. The
         chamber front PITCHES WITH THE WALL (the corner analog of flush
         mounting: facetN carries the flare tilt), and the face stands off
         only by the MEASURED rim-march recess (curvature scale). */
      const fNc=facetN(st,x,fi);
      const raise=landRaise([x,fmy,fmz],fNc,rB);
      if(raise>=0.15) continue;                           // wall swallows the frame at any stand-off - not a station
      const off0E=off0+raise;
      const capY=hyB-(fmy+(off0E+dpB)*Math.SQRT1_2)-(Math.SQRT1_2*rB+CLR);
      const capZ=hzB-(fmz+(off0E+dpB)*Math.SQRT1_2)-(Math.SQRT1_2*rB+CLR);
      if(capY<0||capZ<0) break;                           // pocket closed: deeper only worse
      if(x+rB>st.depth-0.002) break;                      // frame would cross the mouth plane (M9 law)
      if(nB>2){
        /* adjacent corners must clear - MEASURED in the x=xB cut: both axes
           lie in the yz-plane, so each body's widest cut is a RECTANGLE
           (axis segment fattened rB laterally). The capsule (segment+radius)
           model's round caps over-fatten a FLAT frame by (2-sqrt2)*rB and
           refused real SH96-class spacings. Exact 2D rect-rect distance. */
        const rect=(sy,sz)=>{ const ux=sy*Math.SQRT1_2, uz=sz*Math.SQRT1_2, py2=-sz*Math.SQRT1_2, pz2=sy*Math.SQRT1_2;
          const c0=[sy*fmy+ux*off0E, sz*fmz+uz*off0E], c1=[c0[0]+ux*dpB, c0[1]+uz*dpB];
          return [[c0[0]+rB*py2,c0[1]+rB*pz2],[c0[0]-rB*py2,c0[1]-rB*pz2],
                  [c1[0]-rB*py2,c1[1]-rB*pz2],[c1[0]+rB*py2,c1[1]+rB*pz2]]; };
        const p2s=(p,a,b)=>{ const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1e-12;
          const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2));
          return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t); };
        const xsect=(a,b,c,d2)=>{ const o=(p,q,r)=>Math.sign((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]));
          return o(a,b,c)!==o(a,b,d2)&&o(c,d2,a)!==o(c,d2,b); };
        const s2s=(a,b,c,d2)=> xsect(a,b,c,d2)? 0 : Math.min(p2s(a,c,d2),p2s(b,c,d2),p2s(c,a,b),p2s(d2,a,b));
        const rDist=(Ra,Rb)=>{ let m=1e9;
          for(let i=0;i<4;i++)for(let j=0;j<4;j++) m=Math.min(m, s2s(Ra[i],Ra[(i+1)%4],Rb[j],Rb[(j+1)%4]));
          return m; };
        const RA=rect(1,1);
        if(Math.min(rDist(RA,rect(1,-1)), rDist(RA,rect(-1,1)))<CLR) continue;
      }
      if(Math.min(fmy,fmz)<portCross+0.012) continue;     // the opening stays on the corner half of its panels
      if(obsM){
        /* WALL CUTOUTS must not merge: the mid seats and the corner tap
           openings are both holes in the same walls. MEASURED: same-quadrant
           tap point vs each mid seat disk (the record's slim-slot half-length
           bounds the opening; chambers and mid pods interlock in the flesh -
           the SH-96 exists - so bodies are NOT gated here, cutouts are). */
        const portA=Math.sqrt(31.67e-4*3)/2+0.012; let hit=false;
        for(const o of obsM){ const sy2=o.p[1]>=0?1:-1, sz2=o.p[2]>=0?1:-1;
          if(Math.hypot(x-o.p[0], sy2*fmy-o.p[1], sz2*fmz-o.p[2])<o.r+portA+CLR){ hit=true; break; } }
        if(hit) continue;
      }
      xB=x; raiseB=raise; break;
    }
    if(xB==null){ out.missing=true; }
    else{ const F=facetsAt(st,xB);
      for(let c2=0;c2<nB;c2++){
        const ph=Math.PI/4+c2*Math.PI/2, sy=Math.sign(Math.cos(ph)), sz=Math.sign(Math.sin(ph));
        const fi=F.findIndex(f=>f.ch && Math.sign(f.mid[0])===sy && Math.sign(f.mid[1])===sz);
        const f=F[fi];
        const fN=facetN(st,xB,fi);                        // v3.1: the chamber front PITCHES WITH THE WALL - mount normal = facet normal
        const off0E=off0+raiseB;                          // face stands off by board + MEASURED recess
        const p=[xB+fN[0]*off0E, f.mid[0]+fN[1]*off0E, f.mid[1]+fN[2]*off0E];
        const drv={kind:'woof', x:xB, phi:ph, center:p, normal:fN,
          od:S.odW*CM, dp:S.dpW*CM, tap:[xB, f.mid[0], f.mid[1]], seatR:seatW,
          board:{half:rB+0.015, len:2*seatW+0.04, gap:0, flen:f.len,
            duct:off0E-(S.wallT||0.012)}, onCh:true, facet:fi};   // duct = board + recess: the vent's REAL extra length past the wall
        const fc=flowCross(fN);
        drv.flowU=fc.u; drv.crossV=fc.v;
        out.push(drv);
      } }
    /* the derived XO must ride the BOARD station */
    if(xB!=null){ const XOK2=1/1.2;
      S.fxDerived={ hi: (S.topo==='3way'&&xM!=null)? Math.round(XOK2*C/(4*(xM+S.cdDepth*IN))) : Math.round(XOK2*C/(4*(xB+S.cdDepth*IN))),
                    lo: Math.round(XOK2*C/(4*(xB+S.cdDepth*IN))) }; }
  }
  else if(S.topo!=='1way' && xW!=null){
    const seats=seatsFor(st,xW,(S.nW|0)||2,modeWX,offW,seatW);
    for(const q of seats){
      const p=[xW,q[0],q[1]];
      const nrm=(q.facet!==undefined)? facetN(st,xW,q.facet)
              : surfN(st,xW,(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]));   // PROVEN normal per style
      const drv={kind:'woof', x:xW, phi:Math.atan2(q[1],q[0]), center:p, normal:nrm,
        od:S.odW*CM, dp:S.dpW*CM, tap:p, seatR:S.odW*CM/2+0.011, facet:q.facet};
      if(S.mount==='axial') drv.mountN=[-1,0,0];               // pin #5: spot-face land
      { const lh=landRaise(p,drv.mountN||nrm,S.odW*CM/2); if(lh) drv.landH=lh; }   // pin #23: measured along the MOUNT axis
      const fc=flowCross(nrm); drv.flowU=fc.u; drv.crossV=fc.v;
      out.push(drv);
    }
  }
  if(S.topo==='3way' && xM!=null) placeRing('mid', xM, (S.nM|0)||4, S.odM*CM, S.dpM*CM, offM, modeM);
  if(S.topo!=='1way' && xW==null && modeW!=='chamfer') out.missing=true;   // v3 boards: the chamfer block judges its own landing
  if(S.topo==='3way' && xM==null) out.missing=true;
  if(S.topo==='1way'){
    /* PIN #8 (his spec): ONE coax driver - the horn IS the CD's waveguide; the cone
       section fires through a tap-slot ring in the printed apex plate. */
    const nT=(S.coaxTaps|0)||6;
    const xT=(st.xTap!==undefined)? st.xTap : (st.xAdapter||0.02)*0.85;   // the ring station derives from the DRIVER (photo canon)
    const taps=[]; let rMax=0;
    for(let k=0;k<nT;k++){ const a2=(k+0.5)/nT*2*Math.PI;
      const p=surfPt(st,xT,a2); taps.push([a2,p]); rMax=Math.max(rMax,Math.hypot(p[1],p[2])); }
    const Ls=Math.hypot(xT, rMax-(st.throat||S.throat*IN/2)); // WORST tap's slant along the dish face
    /* the XO respects BOTH laws by construction: 1.2x under the tap-path null
       AND the tap-ring diameter within lambda/4 (big cones bind on the ring) */
    const fxCo=Math.round(Math.min((1/1.2)*C/(4*(Ls+S.cdDepth*IN)), 0.98*C/(8*rMax)));
    S.fxDerived={hi: fxCo, lo: fxCo};
    const sdC=S.sdC|| (S.sdW||150);
    /* compendium law (same as the 2way woofer section): port velocity is
       evaluated at the BAND'S LOW EDGE - the cone runs from the sub XO up,
       so the 17 m/s cap sets CR at subXO, not at the crossover. Deriving at
       fxCo forced CR onto the 4:1 floor and DOUBLED the slot area demand
       (the very overflow the ring row was failing on). */
    const apC=sdC/Math.max(1.5,Math.min(8, 17/(2*Math.PI*(S.subXO||80)*((S.xmC||S.xmW||4)/1000)) ))/nT;   // cm^2 per slot, velocity-clamped CR
    /* ARC SLOTS along the ring (his print photo + Metlako kidneys): the exposed
       cone annulus (6FHX51 CAD: [.60,.72]od) is only ~0.06od wide radially -
       ROUND holes cannot carry the velocity-derived area there. A stadium bent
       along the ring carries it in length; when the demand is small it
       degenerates to a circle (sa==sb), which IS the Reference D round hole. */
    const rConeL=(S.odW||22)*CM/2;
    const smL=(S.hornType==='removable')? ((S.hfExit||20.1)/1000)/2+0.012 : 0.60*rConeL;
    let sbC=Math.max(0.003, Math.min(Math.sqrt(apC*1e-4/Math.PI), (0.72*rConeL-smL)/2-0.003));
    let saC=Math.max(sbC, (apC*1e-4+(4-Math.PI)*sbC*sbC)/(4*sbC));   // exact stadium area: 4·sa·sb-(4-π)·sb²
    /* b532 PORT TRUTH: the DISH's own patch clamps used to bite silently
       INSIDE dishMesh while every law row rode the un-clamped demand (real
       holes measured 25-52% under). The clamps now live HERE, the FINAL
       dims + band ride the slot record (dishMesh consumes them verbatim),
       and apEm carries the EMITTED area for every law that grades physics. */
    { const rDishL=rConeL+0.012;
      const rHFm2=((S.hfExit||20.1)/1000)/2;
      const rBL=(S.hornType!=='removable')? 0.60*rConeL+0.001 : rHFm2;
      const rPL=rMax;
      const w0=Math.min(Math.max(sbC*1.6,0.012),(rDishL-rBL)/2*0.6);
      const rInL=Math.max(rBL+0.0005,rPL-w0), rOutL=Math.min(rDishL-0.004,rPL+w0);
      const halfArc=Math.PI*rPL/nT, halfBand=Math.min(rPL-rInL, rOutL-rPL);
      sbC=Math.min(sbC, halfBand*0.75);
      saC=Math.max(sbC, Math.min(saC, halfArc*0.75));
      var bandC={w0,rIn:rInL,rOut:rOutL};
    }
    const apEmC=(4*saC*sbC-(4-Math.PI)*sbC*sbC)*1e4;   // cm^2 EMITTED per slot
    for(const [a2,p] of taps){ const nrm=surfN(st,xT,a2);
      out.push({kind:'coaxtap', x:xT, phi:a2, center:p, normal:nrm, od:0.02, dp:0,
        tap:p, seatR:sbC+0.004, slot:{sa:saC, sb:sbC, ap:apC, apEm:apEmC, band:bandC, radial:true}}); }
    out.coax={od:(S.odW? S.odW*CM : (S.odC||0.22)), dp:(S.dpW? S.dpW*CM : (S.dpC||0.11))};   // PIN #21: the coax IS the chosen woofer
  }
  return out;
}

/* ---- ACOUSTIC LAWS (ported from v4's sourced corpus) ----
   CR bands (Waslo calc sheet): mids 4..8:1, woofers 2.5..6:1 - Ap auto-derived
   from Sd at the band center. Port velocity cap 17 m/s (corpus). Front chamber
   Vtc + tap = Helmholtz low-pass; must clear the derived XO by 1.2x. Slot canon:
   slim 3:1 stadium, area exactly Ap/driver. */
function acoustics(S,L,st){
  const out={rows:[]};
  const add=(sec,name,val,ok,warn,why,grow)=>out.rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why,grow:!!grow});
  const kinds=[];
  /* v4 SOURCED LAW (compendium): peak port velocity = CR * 2pi * fLOW * xm at the
     BAND'S LOW EDGE (woofers run to the sub XO ~80 Hz; mids to their lower XO).
     Ap derives FROM the 17 m/s limit, clamped into the CR band (w 2.5-6, m 4-8). */
  if(S.topo!=='1way') kinds.push(['woof', S.sdW||300, S.vtcW||150, S.xmW||7, [2.5,6.0], S.subXO||80, S.fxDerived&&S.fxDerived.lo, (S.npW|0)||1]);
  if(S.topo==='3way') kinds.push(['mid', S.sdM||50, S.vtcM||40, S.xmM||3, [4.0,8.0], S.fxDerived&&S.fxDerived.lo, S.fxDerived&&S.fxDerived.hi, (S.npM|0)||1]);
  for(const [kind,sd,vtc,xm,band,fLow,fx,np] of kinds){
    const drs=L.filter(d=>d.kind===kind); if(!drs.length||!fx||!fLow) continue;
    /* THE DANLEY DIALECT (b529 canon fork - ruling (a), SOURCED b530): corner-
       board woofers ride the RECORD's tap, not the velocity-derived one; the
       apex-ring mids of the same dialect ride the record's 3/4in mid tap. */
    const danley=(kind==='woof' && !!drs[0].board) || (kind==='mid' && L.some(d=>d.board));
    const apRec=kind==='mid'? 2.85 : 31.67;              // cm^2: 3/4in mid tap / 2.5in woofer tap (SH-50 tape measure)
    /* VELOCITY FIRST (nc535's diyaudio worst-case heuristic - b530 attribution
       correction: NOT Waslo compendium canon, and Hinson's 17 m/s (MEH.pdf
       p.19) is reflex-port chuffing onset in a max-SPL model, not a tap law):
       the 17 m/s cap SETS the CR; the compression band only grades it (v4:
       mids warn down to 2.5:1). Forcing CR back into the band made the tool
       fail its own velocity check. */
    const crVel=17/(2*Math.PI*fLow*(xm/1000));           // CR the velocity limit allows
    const cr=danley? sd/apRec : Math.max(1.5, Math.min(band[1], crVel));    // below 1.5:1 it stops being a compression tap
    const ap=danley? apRec : sd/cr;                      // cm^2 per driver (Danley record port areas, SH-50 tape measure)
    const shp=(kind==='mid'? S.shM : S.shW)||'slot';       // his call: ROUND is classic for many horns
    for(const d of drs){ const apP=ap/(np||1), A=apP*1e-4;  // pin #19: area split across the ports
      let saM,sbM;
      if(shp==='round'){ saM=sbM=Math.sqrt(A/Math.PI); }
      else{ sbM=Math.sqrt(A/(8+Math.PI)); saM=3*sbM; }      // b532: EXACT 3:1 stadium ((8+π)·sb² = A) - the rect model under-cut every slot 7.15%
      if(d.board&&shp!=='round'){
        /* v3.1 corner boards: the opening cuts THROUGH the walls at the seam
           (SH-96 side-wall openings, JMOD seam teardrops) - the board CHAMBER
           must still cover it; elongate along the wall at constant area if
           the chamber coverage binds (cone-fit law grades the consequence) */
        const sbMax=Math.max(0.008, d.board.half-0.012);
        if(sbM>sbMax){ sbM=sbMax; saM=(A+(4-Math.PI)*sbM*sbM)/(4*sbM); } }   // exact stadium inversion
      const apEm=(shp==='round'? Math.PI*saM*saM : 4*saM*sbM-(4-Math.PI)*sbM*sbM)*1e4*(np||1);   // cm^2 per driver, EMITTED
      d.slot={sa:saM, sb:sbM, ap:ap, apEm, np:np||1, round:shp==='round',
        offm:(np||1)>=2? 0.24*d.od : 0};                    // pins #1/#25: pair straddles CROSS-wise (same station)
    }
    /* b532 PORT TRUTH: the graded rows ride the EMITTED area (what the print
       actually cuts) - identical to the demand unless a clamp bit */
    const apEmD=drs[0].slot.apEm, crEm=sd/apEmD;
    add(kind.toUpperCase(),'Compression ratio Sd/Ap',crEm.toFixed(1)+':1',
      danley? true : crEm>=band[0], danley? true : crEm>=band[0]*0.6,
      danley? 'DANLEY DIALECT: '+(kind==='mid'?'one 3/4in round tap per mid':'one 2.5in round corner tap per woofer')+' = the SH-50 tape-measured record (van Ommen, diyaudio 292379 #4957246; chrisbln thing:6886663 ships the same 2.5in as canon), shipped as an area-matched '+(drs[0].slot.round?'round hole':'stadium (shape follows the tap-shape knob)')+'. His SH-96 interior shot confirms the CONSTRUCTION but shows no vent (side-wall circles = handle cups, b531). An SH-96 vent measurement would harden this number'
            : (crEm<band[0]?'below the classic band - big ports, mild loading (JMOD territory); excursion-limited duty':'derived from the 17 m/s limit, graded against the band; rides the EMITTED cut area (b532)'));
    const vel=crEm*2*Math.PI*fLow*(xm/1000);
    add(kind.toUpperCase(),'Port velocity at band low edge ('+fLow+' Hz)',vel.toFixed(1)+' m/s',
      danley? true : vel<=17.2, danley? true : vel<=20,
      danley? 'DANLEY DIALECT: the worst-case formula (CR*2pi*f*xm, nc535 heuristic) reads this number, yet Danley ships exactly these taps - horn loading keeps real excursion far under xm at the band edge. Stated, not graded'
            : 'nc535 worst-case heuristic (17 m/s ~ reflex chuffing onset, Hinson MEH.pdf p.19), evaluated at the band bottom on the EMITTED cut area');
    /* his pins #20/#21: the tap must OPEN INTO THE CONE, not the frame. Sd
       sets the emissive radius (sqrt(Sd/pi)); the farthest lit point of the
       opening (pair offset + half-length) must stay inside it. Hinson canon:
       the tap works the volume trapped UNDER the cone - a hole past the cone
       rim connects nothing. */
    { const s0=drs[0].slot, rSd=Math.sqrt(sd*1e-4/Math.PI);
      const need=((s0.np||1)>=2? (s0.offm||0):0)+s0.sa;
      add(kind.toUpperCase(),'Tap opening fits the cone',
        (need*1000).toFixed(0)+' vs '+(rSd*1000).toFixed(0)+' mm (Sd radius)',
        need<=rSd, need<=1.1*rSd,
        'the port must land on the cone that drives it; a straddling pair or a second tap shrinks each opening'); }
    /* REAL port length: print wall + 0.85r end correction (matches the response
       network); b532: rides the EMITTED area like every physical row */
    const lpt=(S.wallT||0.012)+0.85*Math.sqrt(apEmD*1e-4/Math.PI);
    /* pin #5: the axial land is printed SOLID - the tap port runs THROUGH it, so
       the port LENGTHENS by the land's local thickness (~0.7*seatR*tan(tilt));
       the front chamber volume stays the driver's own Vtc */
    let lptEff=lpt, landed=false, bossH=0, duct=false;
    for(const d of drs){
      if(d.board&&d.board.duct){ if(d.board.duct>bossH){ bossH=d.board.duct; duct=true; } }
      else if(d.landH&&!d.mountN) bossH=Math.max(bossH,d.landH); }   // axial wedges carry their own sourced lengthening below
    if(bossH>0){ lptEff=lpt+bossH;
      /* pin #23: the flush land boss / the corner-chamber vent duct - both
         MEASURED (rim march until the frame clears the wall solid) */
      add(kind.toUpperCase(), duct?'Vent duct through the corner chamber':'Seat land boss (wall curvature)',(bossH*1000).toFixed(0)+' mm',
        true,true,
        duct?'the frame spans its own radius ALONG the horn - the face recesses off the flaring wall until the rim clears (measured march, pin #23; the real SH-96 woofers sit deep in triangular chambers); the vent runs the full duct, so the port lengthens by it'
            :'a frame is FLAT - the printed seat rises off the curved wall until the rim clears the outer face (measured rim march, pin #23); the tap runs THROUGH the land, so the port lengthens by it');
    }
    if(S.mount==='axial'){
      let mx=0;
      for(const d of drs){ if(!d.mountN) continue;
        const ct=Math.abs(d.normal[0]*d.mountN[0]+d.normal[1]*d.mountN[1]+d.normal[2]*d.mountN[2]);
        mx=Math.max(mx, Math.tan(Math.acos(Math.min(1,ct)))); }
      if(mx>0){ const wlMeas=drs.reduce((m,d)=>Math.max(m,(d.landH||0)),0);
        /* b532 ONE length truth: the MEASURED wedge clearance (landH, the b530
           rim march along the mount axis) supersedes the ~0.7·seatR·tan
           heuristic when present - acoustics and the response network now
           agree on the same port (the probe caught a 17mm skew) */
        lptEff=lpt + (wlMeas>0? wlMeas : 0.7*(((drs[0].seatR)||0.05))*mx); landed=true;
        /* pin #24: on a steeply tilted wall the printed land becomes a monster
           wedge - say so. Danley uses spot-faces where walls run near-parallel
           to the axis (Waslo flare 2); past ~30 deg flush is the honest mount. */
        const wedge=(((drs[0].seatR)||0.05))*mx, tilt=Math.atan(mx)*180/Math.PI;
        add(kind.toUpperCase(),'Axial land wedge (wall tilt '+tilt.toFixed(0)+'°)',(wedge*1000).toFixed(0)+' mm tall',
          tilt<=30, tilt<=45,
          'the spot-face land grows with wall tilt (seatR·tan); past ~30° the print is a wedge monster - use FLUSH on steep walls (Danley lands live on near-axial walls)');
      }
    }
    const fLP=C/(2*Math.PI)*Math.sqrt((apEmD*1e-4)/((vtc*1e-6)*lptEff));
    add(kind.toUpperCase(),'Chamber acoustic low-pass',Math.round(fLP)+' Hz',fLP>=1.2*fx,fLP>=fx,
      (landed?'tap runs THROUGH the solid axial land (measured landH when available) - ':bossH>0?'tap runs THROUGH the printed land boss (port lengthened by it) - ':'')+'Vtc+tap Helmholtz (real wall + end-corrected EMITTED port) must clear the crossover ('+fx+' Hz)');
    /* ---- M2: the tap placement/size laws (US 8,284,976 / Waslo / Hinson) ---- */
    if(st && drs[0] && drs[0].x!==undefined){
      const K=kind.toUpperCase(), xT=drs[0].x, Astn=areaAt(st,xT), lam=C/fx;
      const fNull=C/(4*(xT+S.cdDepth*IN));
      add(K,'\u03bb/4 reflection null vs crossover',Math.round(fNull)+' vs '+fx+' Hz',
        fNull>=1.19*fx, fNull>=fx,
        'sound entering the tap reflects off the throat; the null must stay \u22651.2\u00d7 above the XO (Hinson/v4 law) - the derived XO builds this in');
      const eLam=Math.sqrt(4*Math.PI*Astn)/lam;
      add(K,'Entry size - local circumference vs \u03bb (US 8,284,976)',eLam.toFixed(2)+' \u03bb',
        eLam<=1.0, eLam<=1.3,
        'patent: enter where the horn is \u22641 wavelength around at the band top ('+fx+' Hz)',
        true);   // smooth family: a longer horn eases the flare near the throat - growth can fix this
      const tf=(drs.length*ap*1e-4)/Astn, tfOK=kind==='mid'?0.20:0.50, tfWarn=kind==='mid'?0.30:0.70;
      add(K,'Taps vs horn area at station',(tf*100).toFixed(0)+'%',
        tf<=tfOK, tf<=tfWarn,
        kind==='mid'?'practice: \u226420% protects the HF wavefront (patent ideal is full area match - the tension is the design)':'far from the throat the wavefront tolerates more; CoSyne measured clean at 43%',
        true);   // a bigger mouth grows the station area - growth CAN fix this one
      /* TRUE port positions: a straddling pair adds two cross-offset ports per
         driver - the spacing law must see them, not just the seat centers */
      const ports=[];
      for(const d of drs){ const o=(d.slot&&d.slot.offm)||0;
        if(o>0&&d.crossV) for(const sg of [-1,1])
          ports.push([d.tap[0]+sg*o*d.crossV[0], d.tap[1]+sg*o*d.crossV[1], d.tap[2]+sg*o*d.crossV[2]]);
        else ports.push(d.tap); }
      let spread=0;
      for(let i=0;i<ports.length;i++)for(let j=i+1;j<ports.length;j++){
        const a2=ports[i],b2=ports[j];
        spread=Math.max(spread,Math.hypot(a2[0]-b2[0],a2[1]-b2[1],a2[2]-b2[2])); }
      if(ports.length>1){ const sLam=spread/(lam/4);
        /* MARWAN'S RULING (2026-07-23, "lets do B"): on the corner-board/apex-
           ring dialect the mid ring tolerates ~1.5x lambda/4 - the real SH96
           measures 1.3-1.5x there and ships. Everywhere else the strict Waslo
           DIY tier stands. */
        const apexRing=(kind==='mid'&&S.placeW==='chamfer');
        const okS=kind==='mid'?(apexRing?1.5:1.0):1.5, wnS=kind==='mid'?(apexRing?1.75:1.2):2.0;
        add(K,'Any-pair tap spacing (radiate as one driver)',(spread*1000).toFixed(0)+' mm = '+sLam.toFixed(2)+'\u00d7\u03bb/4',
          sLam<=okS, sLam<=wnS,
          kind==='mid'?(apexRing?'apex-ring ruling B (2026-07-23): ~1.5\u00d7\u03bb/4 tolerated on the corner-board dialect - the real SH96 measures the same; strict Waslo tier applies elsewhere'
                                :'Waslo/Hinson: every mid tap within \u03bb/4 of every other at '+fx+' Hz, or they stop summing as one source')
                      :'woofer sections tolerate more spread (SH96 canon ~1.5\u00d7\u03bb/4 at its XO); past 2\u00d7 the section combs'); }
      const coneD=2*Math.sqrt(sd*1e-4/Math.PI)/((np||1)>=2?2:1), fCone=C/(2*coneD);
      add(K,'Cone dia vs \u03bb/2 at band top',Math.round(fCone)+' Hz max',
        fCone>=fx, fCone>=0.85*fx,
        (np>=2?'TWO ports at ONE station straddle the cone toward the corners (Danley canon): equal throat paths, worst cone path halved; ':'')+'path spread across the cone cancels above c/(2\u00b7D); a second straddling port would buy an octave');
    }
  }
  /* ---- M2 for the 1-way coax cone section (same laws on the plate tap ring) ---- */
  if(S.topo==='1way' && st){
    const taps=L.filter(d=>d.kind==='coaxtap');
    const fx=S.fxDerived&&S.fxDerived.lo;
    if(taps.length&&fx){
      const lam=C/fx, rT=Math.hypot(taps[0].tap[1],taps[0].tap[2]);
      const spread=2*rT, sLam=spread/(lam/4);
      add('COAX','Tap-ring diameter vs \u03bb/4',(spread*1000).toFixed(0)+' mm = '+sLam.toFixed(2)+'\u00d7\u03bb/4',
        sLam<=1.0, sLam<=1.2,'the cone slots across the plate must stay within \u03bb/4 at '+fx+' Hz');
      const Ls9=Math.hypot(taps[0].x, rT-st.throat)+S.cdDepth*IN;   // SAME slant path the derived XO used
      const fNull=C/(4*Ls9);
      add('COAX','\u03bb/4 reflection null vs crossover',Math.round(fNull)+' vs '+fx+' Hz',
        fNull>=1.19*fx, fNull>=fx,'derived XO builds the 1.2\u00d7 margin in');
      const ap=taps[0].slot?(taps[0].slot.apEm||taps[0].slot.ap):0, vtc=(S.vtcC||60);   // b532: EMITTED area (post-clamp) - the dish holes were 25-52% under the demand with rows green
      if(ap>0){ const rC9=(S.odW||22)*CM/2, od9=(S.odW||22)*CM;
        /* local dish thickness at the ring: front(38 deg face) minus the
           cone-following back (his correction) - the REAL Lpt, not wallT */
        const rB9=Math.max(S.throat*IN/2,0.60*rC9);
        const xF9=(rT-rB9)/Math.tan(d2r(38));
        const cy9=od9*(0.03+0.07*Math.max(0,Math.min(1,(0.72*rC9-rT)/(0.12*rC9))));   // 6FHX51 CAD: cone rim .72od
        const gap9=((S.xmC||S.xmW||4)/1000)+0.002;
        const xB9=-0.004-(cy9-od9*0.03)+Math.min(gap9,cy9-od9*0.03);
        const lpt=Math.max(S.wallT||0.012, xF9-xB9)+0.85*Math.sqrt(ap*1e-4/Math.PI);
        const fLP=C/(2*Math.PI)*Math.sqrt((taps.length*ap*1e-4)/((vtc*1e-6)*lpt));
        add('COAX','Chamber acoustic low-pass',Math.round(fLP)+' Hz',fLP>=1.2*fx,fLP>=fx,'coax front chamber + plate slots must clear the crossover'); }
      /* pin #22: honesty about the coax UNIT itself. The tap ring must sit OVER
         the cone (or the slots feed nothing), and a unit fatter than the mouth
         is a picture, not a speaker. */
      const rCone=(S.odW? S.odW*CM : (S.odC||0.22))/2;
      const sa=(taps[0].slot&&taps[0].slot.sa)||0;
      /* 6FHX51 CAD (build-504 study): the HF horn owns the center out to
         Ø.60od; the cone rim is Ø.72od. The ring must ride the EXPOSED CONE
         ANNULUS between them - his pin #8 (holes low enough to meet the cone). */
      const smA=(S.hornType==='removable')? ((S.hfExit||20.1)/1000)/2+0.012 : 0.60*rCone;
      const rimA=0.72*rCone;
      add('COAX','Tap ring rides the exposed cone annulus',
        (rT*1000).toFixed(0)+' mm in ['+(smA*1000).toFixed(0)+'..'+(rimA*1000).toFixed(0)+'] (CAD)',
        rT>=smA-0.001&&rT<=rimA+0.001, rT>=smA-0.004&&rT<=rimA+0.004,
        'the holes must open onto the CONE: inside .60od the metal HF horn blocks them, past .72od they land on surround and frame');
      /* his pin #18 (2026-07-23): taps must sit ENTIRELY on the exposed cone
         annulus AND clear each other around the ring. Radially the slot width
         is clamped to the annulus at derivation; what can still run out is ARC
         ROOM: n slots of arc length 2·sa plus 4 mm lands between them. */
      { const N18=taps.length, s18=taps[0].slot;
        const need=N18*(2*s18.sa+0.004), cap=2*Math.PI*rT;
        add('COAX','Tap slots fit around the ring',
          (need*1000).toFixed(0)+' vs '+(cap*1000).toFixed(0)+' mm of ring',
          need<=cap, need<=1.1*cap,
          'velocity-derived area as arc slots on the CAD annulus: length is the free axis; fewer/narrower slots or a bigger unit if this fails');
        const wA=(rimA-smA)/2;
        add('COAX','Slot width vs the cone annulus',
          (2*s18.sb*1000).toFixed(0)+' vs '+(2*wA*1000).toFixed(0)+' mm wide',
          s18.sb<=wA-0.0005, s18.sb<=wA,
          'the radial half-width is clamped to the CAD annulus at derivation - this row states the margin'); }
      /* US10506331 (Martin Audio, his patent drop): the static waveguide must
         clear the MOVING cone by 0.5-3 cm preferred (0.3-5 hard), held at max
         excursion - his "match the depth of the baffle with an x-max". */
      { const gapM=((S.xmC||S.xmW||4)/1000)+0.002;
        add('COAX','Print-to-cone clearance (Martin band)',
          (gapM*1000).toFixed(1)+' mm incl. xmax',
          gapM>=0.005&&gapM<=0.030, gapM>=0.003&&gapM<=0.050,
          'US10506331: 0.5-3 cm between static and moving waveguides at maximal displacement');
        const alpha=Math.atan(0.14/0.19)*180/Math.PI;
        add('COAX','Dish face continues the cone (β ≥ α)',
          '38° face vs '+alpha.toFixed(0)+'° cone slope (CAD)',
          38>=alpha-0.5, 38>=alpha-5,
          'US10506331: the static waveguide continues the cone curvature outward; β ≥ α opens the pattern'); }
      const rDish2=rCone+0.012, hmD=(S.mouthW||24)*IN/2;
      add('COAX','Coax unit vs the horn body','Ø '+(2*rCone/IN).toFixed(1)+'″ unit · '+(2*rDish2/IN).toFixed(1)+'″ dish on a '+(S.mouthW||24)+'″ mouth',
        hmD>=1.25*rDish2, hmD>=1.05*rDish2,
        'the dish rim IS the driver flange (photo canon) - the DECLARED mouth must clear it; the horn grows to host the driver, never the reverse',
        true);   // a bigger mouth genuinely fixes this one
    }
  }
  /* ---- M3: PATH-LENGTH BALANCE (Heinz US5526456, the founding canon) ----
     Every driver of a section shares ONE station (structural in v5 - the pins
     22-27 rework made even straddling pairs equal-path), and adjacent sections
     should share an acoustic center: the offset between a section's station and
     the section above it reads as PHASE at the crossover. The λ/4 null law
     bounds the CD offset at ~76°; the 3-way woof-vs-mid spacing has no other
     guard - THIS row is it. */
  if(S.fxDerived&&st){
    const secs=[];
    if(S.topo!=='1way'){ const dW=L.filter(d=>d.kind==='woof');
      if(dW.length&&S.fxDerived.lo) secs.push(['WOOF',dW,S.fxDerived.lo]); }
    if(S.topo==='3way'){ const dM=L.filter(d=>d.kind==='mid');
      if(dM.length&&S.fxDerived.hi) secs.push(['MID',dM,S.fxDerived.hi]); }
    for(const [K,drs,fx] of secs){
      let mn=1e9,mx=-1e9;
      for(const d of drs){ mn=Math.min(mn,d.x); mx=Math.max(mx,d.x); }
      const lam=C/fx;
      add('PATH','Equal section paths ('+K.toLowerCase()+'s, US5526456)',((mx-mn)*1000).toFixed(1)+' mm spread',
        (mx-mn)<=lam/20, (mx-mn)<=lam/10,
        'Heinz: every driver of a section rides ONE station, so all its taps share the throat path - structural in v5');
      const upper=(K==='WOOF'&&S.topo==='3way')? {x:(L.find(d=>d.kind==='mid')||{x:0}).x, name:'the mids'}
                                               : {x:-S.cdDepth*IN, name:'the CD'};
      const off=drs[0].x-upper.x, deg=off/lam*360;
      add('PATH','Common acoustic center vs '+upper.name,(off*1000).toFixed(0)+' mm = '+Math.round(deg)+'° at '+fx+' Hz',
        Math.abs(deg)<=76, Math.abs(deg)<=105,
        'Heinz US5526456: sections should share an acoustic center; the derived-XO null margin bounds the CD offset, and LR4 absorbs ≤~76° at the corner');
    }
    if(S.topo==='1way'&&S.fxDerived.lo){
      const tp=L.find(d=>d.kind==='coaxtap');
      if(tp){ const rT2=Math.hypot(tp.tap[1],tp.tap[2]);
        const Ls=Math.hypot(tp.x, rT2-st.throat)+S.cdDepth*IN;
        const lam=C/S.fxDerived.lo, deg=Ls/lam*360;
        add('PATH','Common acoustic center (cone vs CD)',(Ls*1000).toFixed(0)+' mm = '+Math.round(deg)+'° at '+S.fxDerived.lo+' Hz',
          Math.abs(deg)<=76, Math.abs(deg)<=105,
          'the coax cone enters on the dish face a slant-path behind the CD diaphragm; the derived XO keeps this inside the LR4 corner'); }
    }
  }
  /* ---- M6: BAND ARCHITECTURE - the sub crossover as a REAL choice. The
     woofers own everything above subXO; their displacement sets the ceiling
     there (rho*(2pi f)^2*Vd/(2pi r) half-space, Vd = nW*Sd*xmax). The port
     velocity law already evaluates at this same edge - one knob, two truths. */
  if(S.topo!=='1way'&&S.sdW&&S.xmW){
    const f0=S.subXO||80, Vd=((S.nW|0)||2)*(S.sdW*1e-4)*(S.xmW*1e-3);
    const pk=1.205*2*Math.PI*f0*f0*Vd;                      // 1 m, half-space, peak
    const spl=20*Math.log10(pk/Math.SQRT2/2e-5);
    add('BAND','Displacement ceiling at the sub XO ('+f0+' Hz)',spl.toFixed(0)+' dB / 1 m half-space',
      true,true,
      'M6: below this the subs take over; above it the horn woofers are excursion-bound to this SPL - raise the sub XO (or add cone) if the program needs more');
  }
  /* PIN #16 (M4 down payment): Keele pattern-control floors per plane -
     wnom = kk/(theta*Fc), kk = 25306 Hz*deg*m (Synergy Calc sheet). Below these
     frequencies the wall angle stops steering and the pattern widens toward omni. */
  if(st){ const KK=25306, mo=st.pts[st.pts.length-1];
    const FcH=Math.round(KK/(S.covH*Math.max(0.05,2*mo.a)));
    const FcV=Math.round(KK/(S.covV*Math.max(0.05,2*mo.b)));
    add('PATTERN','Coverage control holds down to (H / V)',FcH+' / '+FcV+' Hz',true,true,
      'Keele: mouth = 25306/(angle*Fc). Wider angle OR bigger mouth -> control lower. The classic shapes (90x60, 110x70...) are this trade struck at equal H/V floors');
    /* M4 (informational for now - thresholds need canon before they can grade):
       where the pattern floor sits relative to the LOWEST horn crossover. In a
       MEH the horn keeps loading below Fc, but directivity walks toward omni. */
    if(S.fxDerived&&S.fxDerived.lo){
      const fx=S.fxDerived.lo, worst=Math.max(FcH,FcV);
      add('PATTERN','Pattern floor vs the low crossover',worst+' vs '+fx+' Hz'+(worst>fx?' — widens below '+worst+' Hz':''),
        true,true,
        'below the floor the wall angle stops steering (the sections still sum - a MEH keeps loading); grow the mouth to push the floor down');
    }
    /* US8284976 read in full (his patent drop): two more Danley sizing truths,
       INFORMATIONAL - MEHs hand off to subs, so grading them would red-flag
       every proven build; the numbers still belong in front of the designer. */
    { const fLo=S.subXO||80, lam=C/fLo;
      const per=2*Math.PI*Math.sqrt((mo.a*mo.a+(mo.b||mo.a)*(mo.b||mo.a))/2);
      add('PATTERN','Mouth circumference vs λ at '+fLo+' Hz (US8284976)',
        (per/lam).toFixed(2)+'λ'+(per<lam?' — full loading wants ~1λ ('+Math.round(lam/Math.PI/IN)+'″ mouth)':''),
        true,true,
        'Danley: minimum mouth ≈ 1λ circumference at the horn’s own low cutoff; fractions trade loading for size (fine with a sub below)');
      const path=st.depth+((S.cdDepth||0)*IN);
      add('PATTERN','Horn path vs λ/4 at '+fLo+' Hz (US8284976)',
        (path/(lam/4)).toFixed(2)+'×λ/4',
        true,true,
        'Danley: loading begins near λ/4 path, substantial by λ/2 - below that the box (not the horn) carries the bottom');
    }
  }
  /* ---- C. MAX SPL TILE - ported from Horn Studio hornMaxSPL (entry 215):
     Makarski 2006 Ch.7 harmonic source terms reduced under 1-D area-law
     transfer; per-slice second-harmonic law Thuras/Jenkins/O'Neil 1935;
     Horn Studio benched the reduction at 0.008% vs the Thuras closed form.
     K2_horn = (g+1)/(2*sqrt2*rho*c^2) * k * pt * sqrt(St) * INT dz/sqrt(S),
     plus the post-mouth spreading tail ln(d/rm) at d = 4 m (Makarski's
     convention). Q here = geometric Q from the coverage solid angle.
     HONEST LIMITS (Horn Studio's words): ideal driver (a good 1.4in costs
     ~3 dB up top); no directivity-at-2f interaction; invalid below cutoff. */
  if(st){
    const GAM=1.402;
    let SmaxV=0, stopX=st.depth;
    for(let i=0;i<=48;i++){ const x=st.depth*i/48, A=areaAt(st,x); if(A>SmaxV){SmaxV=A; stopX=x;} }
    let I9=0, aP=areaAt(st,1e-5);
    for(let i=1;i<=48;i++){ const x=stopX*i/48, A=areaAt(st,x);
      I9+=(stopX/48)*0.5*(1/Math.sqrt(aP)+1/Math.sqrt(A)); aP=A; }
    const St=areaAt(st,1e-5), rm=Math.sqrt(SmaxV/Math.PI);
    const OM=4*Math.asin(Math.min(1,Math.sin(d2r(S.covH)/2)*Math.sin(d2r(S.covV)/2)));
    const Q=4*Math.PI/Math.max(0.1,OM), G=Math.sqrt(St*Q/(4*Math.PI));
    const coef=(GAM+1)/(2*Math.SQRT2*1.205*C*C);
    const ceil=f=>{ const k=2*Math.PI*f/C;
      const x2=coef*k*Math.sqrt(St)*I9 + coef*k*G*Math.log(Math.max(1.02,4/rm));
      return 20*Math.log10(G*0.10/x2/2e-5)-10.46; };
    add('SPL','Air-distortion ceiling K2 3% (1k / 10k)',ceil(1000).toFixed(0)+' / '+ceil(10000).toFixed(0)+' dB @ 1 m',
      true,true,
      'the AIR itself distorts in the narrow throat (Makarski/Thuras, Horn Studio port): the geometry’s hard ceiling falls ~6 dB/octave; ideal driver assumed, invalid below cutoff');
  }
  /* XO ceilings: CD reach (by exit size) and mid reach */
  if(S.fxDerived){
    const top=(S.topo==='3way'?S.fxDerived.hi:S.fxDerived.lo);
    if(S.topo==='1way'&&!S.cdFloor){
      /* one-unit coax: the datasheet 'Recommended Crossover' assumes the STOCK
         horn in free air. With the stock horn REPLACED by the deep MEH horn,
         loading extends reach - the DCX464/SH50 canon measures ~an octave.
         Graded warn-only (ok at rec/2), never a refusal: verify by measurement. */
      if(top&&S.recXO) add('XO','HF reach vs datasheet recommendation',top+' vs '+S.recXO+' Hz stock-horn rec.',
        top>=S.recXO/2, true,
        'the octave canon: replaced-horn MEH loading buys ~1 octave under the stock-horn recommendation (DCX464/SH50 precedent) - verify by measurement');
      else if(top) add('XO','Coax HF floor vs derived crossover',top+' Hz \u2014 floor unverified',
        false, true, 'check the unit datasheet: its minimum crossover must sit at or under the derived XO; v5 refuses to guess');
    } else {
      const cdReach=S.cdFloor||(S.td>=1.35?550:S.td>=0.95?900:1200);   // coax CDs (DCX464) reach ~300
      if(top) add('XO','CD reaches the derived crossover',top+' vs '+cdReach+' Hz floor',top>=cdReach*0.9,top>=cdReach*0.75,'a '+S.td+'\u2033 exit CD wants to cross at or above its floor');
    }
  }
  return out;
}
/* ---- M9 (build 528): THE TRUE BOX ----
   Sources: Pavdan halves (batch-3 study §1, MEASURED): printed enclosure,
   6 mm walls, ONE mid-plane split, full-face butt joints, printed on the big
   flat face. Hinson MEH.pdf (§4): the wood build is 12/18 mm baltic birch -
   which ply is box vs horn is NOT stated, so the wood wall is flagged as his
   ruling in the row. The box is the MINIMAL rectangle containing the printed
   horn (true offset outer), every driver body (frame OD × depth cylinder on
   its mount axis - both measured preset fields) and the CD depth behind the
   throat. The CD's radial body has no datasheet field and is NOT modeled -
   the row says so instead of guessing. */
function segSegDist(p0,p1,q0,q1){
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const d1=sub(p1,p0), d2=sub(q1,q0), rr=sub(p0,q0);
  const a=dot(d1,d1), e=dot(d2,d2), f=dot(d2,rr);
  let s,t;
  if(a<=1e-12&&e<=1e-12){ s=0;t=0; }
  else if(a<=1e-12){ s=0; t=Math.max(0,Math.min(1,f/e)); }
  else{ const c=dot(d1,rr);
    if(e<=1e-12){ t=0; s=Math.max(0,Math.min(1,-c/a)); }
    else{ const b=dot(d1,d2), den=a*e-b*b;
      s=den>1e-12? Math.max(0,Math.min(1,(b*f-c*e)/den)) : 0;
      t=(b*s+f)/e;
      if(t<0){ t=0; s=Math.max(0,Math.min(1,-c/a)); }
      else if(t>1){ t=1; s=Math.max(0,Math.min(1,(b-c)/a)); } } }
  const cp=[p0[0]+d1[0]*s,p0[1]+d1[1]*s,p0[2]+d1[2]*s], cq=[q0[0]+d2[0]*t,q0[1]+d2[1]*t,q0[2]+d2[2]*t];
  return Math.hypot(cp[0]-cq[0],cp[1]-cq[1],cp[2]-cq[2]);
}
function boxCalc(S,st,L){
  const wt=S.wallT||0.012;
  const boxT=(S.style==='angular')?0.018:0.006;   // Pavdan 6 mm print (measured) / Hinson 12-or-18 birch (heavier ply ASSUMED - his ruling pending)
  let hy=0,hz=0; let gy='the horn mouth', gz='the horn mouth';
  /* exact per-station extremes: ANGULAR = the true offset panel corners
     (resampled rings miss them); SMOOTH = a+wt / b+wt (superellipse |y|max=a),
     roll points read directly so the lip counts */
  if(S.style==='angular'){
    for(const p of st.pts){ const x=Math.max(1e-4,Math.min(st.depth-1e-4,p.x));
      for(const v of offsetVerts(st,x,wt)){
        if(Math.abs(v[0])>hy) hy=Math.abs(v[0]);
        if(Math.abs(v[1])>hz) hz=Math.abs(v[1]); } }
  } else {
    for(const p of st.pts){
      if(p.a+wt>hy) hy=p.a+wt;
      if(p.b+wt>hz) hz=p.b+wt; } }
  let x0=0, gx='the throat plate';
  if(S.topo!=='1way'&&S.cdDepth){ x0=-S.cdDepth*IN; gx='the CD'; }
  let xMax=-1e9, minGap=1e9; const bodies=[];
  const kindName={woof:'the woofer bodies', mid:'the mid bodies'};
  for(const d of L){ if(d.kind!=='woof'&&d.kind!=='mid') continue;
    const A=d.mountN||d.normal, rB=d.od/2;
    const c1=[d.center[0]+A[0]*d.dp, d.center[1]+A[1]*d.dp, d.center[2]+A[2]*d.dp];
    bodies.push({c0:d.center,c1,r:rB});
    const ext=(i)=>{ const w=Math.sqrt(Math.max(0,1-A[i]*A[i]))*rB;
      return [Math.min(d.center[i],c1[i])-w, Math.max(d.center[i],c1[i])+w]; };
    const ex=ext(0), ey=ext(1), ez=ext(2);
    if(ex[0]<x0){ x0=ex[0]; gx=kindName[d.kind]; }
    xMax=Math.max(xMax,ex[1]);
    const my=Math.max(-ey[0],ey[1]), mz=Math.max(-ez[0],ez[1]);
    if(my>hy){ hy=my; gy=kindName[d.kind]; }
    if(mz>hz){ hz=mz; gz=kindName[d.kind]; }
  }
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++)
    minGap=Math.min(minGap, segSegDist(bodies[i].c0,bodies[i].c1,bodies[j].c0,bodies[j].c1)-(bodies[i].r+bodies[j].r));
  if(S.topo==='1way'&&L.coax){
    const xU=(st.xAdapter!==undefined)?st.xAdapter:0, rU=L.coax.od/2;
    if(xU-L.coax.dp<x0){ x0=xU-L.coax.dp; gx='the coax unit'; }
    if(rU>hy){ hy=rU; gy='the coax unit'; }
    if(rU>hz){ hz=rU; gz='the coax unit'; } }
  const x1=st.depth, overshoot=Math.max(0, xMax-x1);
  /* volumes: box interior minus the horn (channel + walls, sliced true) minus
     the driver cylinders; CD body volume not modeled (no datasheet field) */
  const ringArea=(x)=>{ const R2=offsetRing(st,x,wt,24);
    let s2=0; for(let i=0;i<R2.length;i++){ const p=R2[i], q=R2[(i+1)%R2.length];
      s2+=p[0]*q[1]-q[0]*p[1]; } return Math.abs(s2)/2; };
  let Vhorn=0, aPrev=null; const NSl=32;
  for(let i=0;i<=NSl;i++){ const x=Math.max(1e-4,Math.min(st.depth-1e-4,st.depth*i/NSl));
    const A2=ringArea(x);
    if(aPrev!==null) Vhorn+=(st.depth/NSl)*(A2+aPrev)/2;
    aPrev=A2; }
  let Vdrv=0;
  for(const b of bodies) Vdrv+=Math.PI*b.r*b.r*Math.hypot(b.c1[0]-b.c0[0],b.c1[1]-b.c0[1],b.c1[2]-b.c0[2]);
  if(S.topo==='1way'&&L.coax) Vdrv+=Math.PI*(L.coax.od/2)*(L.coax.od/2)*L.coax.dp;
  const Vinner=(x1-x0)*(2*hy)*(2*hz);
  return {x0,x1,hy,hz,boxT, W:2*(hy+boxT), H:2*(hz+boxT), D:(x1-x0)+boxT,
    Vinner, Vhorn, Vdrv, Vnet:Vinner-Vhorn-Vdrv, gov:{y:gy,z:gz,x:gx}, overshoot,
    minGap:(bodies.length>1?minGap:null)};
}
function boxDims(S){ const st=stations(S); return boxCalc(S,st,layout(S,st)); }
/* ---- fit & physics checks (carried laws; expanded per rebuild) ---- */
function evaluate(S){
  let st=stations(S), L=layout(S,st);
  /* CLASSIC ANGULAR: converge the flare break onto the landed woofer station
     (Waslo S3->S4). Internally converged so evaluate stays deterministic. */
  if(S.style==='angular'){
    for(let it=0;it<3;it++){
      const dW=L.filter(d=>d.kind==='woof'&&!d.board);   // v3 corner boards live OUTSIDE the horn - the Waslo break only chases WALL woofers
      if(!dW.length) break;
      const hint=Math.max(...dW.map(d=>d.x))+dW[0].seatR+0.02;
      if(Math.abs(hint-(st.xBreak||0))<=0.02) break;
      S._breakHint=hint; st=stations(S); L=layout(S,st);
    }
  }
  const rows=[];
  const add=(sec,name,val,ok,warn,why,grow)=>rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why,grow:!!grow});
  /* pin #4/#11 acceptance: every driver's tap under its frame; ring even.
     Corner boards (v3): the tap sits ON the horn wall radially IN from the
     board - "under the driver" means ON ITS FIRE AXIS, so only the lateral
     component counts (the along-axis gap IS the pocket, by construction). */
  let tapOff=0;
  for(const d of L){ if(!d.tap) continue;
    const dv=[d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]];
    if(d.board){ const al=dv[0]*d.normal[0]+dv[1]*d.normal[1]+dv[2]*d.normal[2];
      tapOff=Math.max(tapOff, Math.hypot(dv[0]-al*d.normal[0],dv[1]-al*d.normal[1],dv[2]-al*d.normal[2]));
    } else tapOff=Math.max(tapOff, Math.hypot(dv[0],dv[1],dv[2])); }
  add('LAW','Taps under their drivers',(tapOff*1000).toFixed(1)+' mm', tapOff<=0.001,false,'printed facets make this structural');
  /* neighbor clearance (frame + seat). Corner-board drivers are EXCLUDED:
     their printed seat lives on the BOARD outside the flare, not on a shared
     wall - board-vs-board and chamber-vs-mid clearance are MEASURED inside
     the corner walk itself (v3.1: rect cut + seam-strip vs mid seats). */
  let worst=1e9;
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const a=L[i], b=L[j];
    if(a.board||b.board) continue;
    const g=Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1],a.center[2]-b.center[2])-(a.seatR+b.seatR);
    if(g<worst)worst=g; }
  add('LAW','Seats clear each other',(worst*1000).toFixed(0)+' mm', worst>=0.006, worst>=0,'printed seats must not merge', S.topo!=='1way');   // the coax tap ring is driver-fixed - growth can't help
  add('LAW','Every ring fits inside the horn', L.missing?'NO':'yes', !L.missing, false,'drivers sit at the smallest station whose ring hosts them; if none exists the horn grows', true);
  if(S.fxDerived&&S.fxDerived.lo)
    add('XO','Derived crossover (from landed geometry)', (S.topo==='3way'? S.fxDerived.hi+' / ':'')+S.fxDerived.lo+' Hz',
      (S.fxDerived.lo<= (S.topo==='3way'?S.fxLo:S.fxHi)*1.35), true, 'XO falls out of the path length; ceiling from the driver choice');
  let ac=acoustics(S,L,st); rows.push(...ac.rows);
  /* ---- M9 (build 528): THE BOX IS TRUE - the viewer draws THIS box ---- */
  { const BX=boxCalc(S,st,L);
    add('BOX','Minimum true box W × H × D (outer)',
      Math.round(BX.W*1000)+' × '+Math.round(BX.H*1000)+' × '+Math.round(BX.D*1000)+' mm, '+Math.round(BX.boxT*1000)+' mm walls',
      true,true,
      'assembly-exact envelope: printed horn + every driver body on its mount axis + the CD depth. Width set by '+BX.gov.y+', height by '+BX.gov.z+', rear by '+BX.gov.x+'. Pavdan canon (measured): ONE mid-plane split, full-face butt joint, big-face-down print; add bracing/damping room to taste. '+(S.style==='angular'?'Wood wall 18 mm ASSUMED of Hinson’s 12/18 birch stock - his ruling wanted.':'6 mm walls = the measured Pavdan print.')+' CD radial body: no datasheet field, not modeled.');
    add('BOX','Rear air volume net of horn + drivers',(BX.Vnet*1000).toFixed(1)+' L',true,true,
      'M9: sealed-vs-reflex grading needs full T/S (M10) - v5 refuses to grade without it. Hinson canon: the MID rear chamber is deliberately tiny (V1 shapes its LF corner) - partition the mids off this shared volume in the build');
    if(S.topo!=='1way'){
      add('BOX','Drivers stay behind the mouth plane',(BX.overshoot*1000).toFixed(1)+' mm past',
        BX.overshoot<=0.0005, BX.overshoot<=0.003,
        'a magnet past the mouth plane would poke through the front baffle - deepen the horn (grow the mouth) or choose a shallower driver', true);
      if(BX.minGap!==null)
        add('BOX','Driver body envelope gap at angle',(BX.minGap*1000).toFixed(0)+' mm'+(BX.minGap<0?' (envelopes overlap)':''),
          true,true,
          'INFORMATIONAL: full frame-OD cylinders along each mount axis - real baskets TAPER to the magnet, so a negative gap here is not yet a refusal (the SH96-class canon build overlaps on envelopes and exists in the flesh). Grading needs magnet OD per preset - a datasheet field to add, not a guess');
    }
  }
  /* HIS 'BETTER SYSTEM' (2026-07-23): the TAP FOOTPRINT itself - every outline
     point of every port (pair offsets, X rotation, round or stadium) - must lie
     ON its host facet, clear of creases and the flare break. Measured, and if
     violated the placement re-walks with a pad until the slots truly fit. */
  const overhang=()=>{
    let worst=0;
    for(const d of L){ if((d.kind!=='woof'&&d.kind!=='mid')||!d.slot||!d.flowU||!d.crossV) continue;
      const np=d.slot.np||1;
      for(let kp=0;kp<np;kp++){
        const sgn=(kp===0?-1:1);
        let ua=d.flowU, va=d.crossV;
        if(np>=2){ const c=Math.SQRT1_2;
          ua=[(d.flowU[0]+sgn*d.crossV[0])*c,(d.flowU[1]+sgn*d.crossV[1])*c,(d.flowU[2]+sgn*d.crossV[2])*c];
          va=[d.normal[1]*ua[2]-d.normal[2]*ua[1], d.normal[2]*ua[0]-d.normal[0]*ua[2], d.normal[0]*ua[1]-d.normal[1]*ua[0]]; }
        const off=np>=2? sgn*(d.slot.offm||0) : 0;
        for(let q=0;q<12;q++){ const a2=q/12*2*Math.PI;
          const pu=Math.cos(a2)*d.slot.sa, pv=Math.sin(a2)*d.slot.sb;
          const px=d.tap[0]+ua[0]*pu+va[0]*pv+d.crossV[0]*off;
          const py=d.tap[1]+ua[1]*pu+va[1]*pv+d.crossV[1]*off;
          const pz=d.tap[2]+ua[2]*pu+va[2]*pv+d.crossV[2]*off;
          if(st.xBreak!==undefined){ const m=Math.abs(px-st.xBreak);
            const need=0.004; if(m<need) worst=Math.max(worst, need-m); }
          if(d.board){ const tv=(py-d.tap[1])*d.crossV[1]+(pz-d.tap[2])*d.crossV[2];
            const m3=d.board.half-0.003;
            if(Math.abs(tv)>m3) worst=Math.max(worst,Math.abs(tv)-m3);
            if(px<0.004) worst=Math.max(worst,0.004-px);
            if(px>st.depth-0.004) worst=Math.max(worst,px-(st.depth-0.004)); }
          /* v3.1: board ports skip the single-facet bounds - the real opening
             cuts THROUGH the walls ACROSS the corner seam (SH-96 side-wall
             openings, JMOD seam teardrops); chamber coverage + depth bounds
             above are their true limits */
          if(S.style==='angular'&&d.facet!==undefined&&!d.board){
            const F=facetsAt(st,Math.max(0.001,Math.min(st.depth-0.001,px)));
            const f=F[d.facet]; if(!f) continue;
            const t=(py-f.p[0])*f.dir[0]+(pz-f.p[1])*f.dir[1];
            const m2=0.003;
            if(t<m2) worst=Math.max(worst,m2-t);
            if(t>f.len-m2) worst=Math.max(worst,t-(f.len-m2));
            const perp=Math.abs((py-f.p[0])*f.n2[0]+(pz-f.p[1])*f.n2[1]);
            if(perp>0.004) worst=Math.max(worst,perp-0.004);
          }
        }
      }
    }
    return worst;
  };
  const ov=overhang();
  if(ov>0.0005&&((S._padIters|0)<8)){
    /* bump the pad ONCE; solve() re-walks the placement on the same mouth */
    S._slotPad=(S._slotPad||0)+ov+0.002;
    S._padIters=(S._padIters|0)+1;
    S._padBumped=true;
  } else delete S._padBumped;
  rows.push({sec:'LAW',name:'Tap footprints on their panels',val:(ov*1000).toFixed(1)+' mm over',
    st: ov<=0.0005?'ok':(ov<=0.003?'warn':'fail'), grow:false,
    why:'every port outline point measured against its host facet, the creases and the flare break; the placement re-walks (pad '+(((S._slotPad||0))*1000).toFixed(0)+' mm) until the taps truly fit'});
  return {st, layout:L, rows, fails:rows.filter(r=>r.st==='fail').length};
}

/* ---- RESPONSE PREVIEW (ported from v4: horn = two-port ladder; each tap section a
   Norton source through chamber compliance + port mass; CD behind its stub; LR4 sum
   at the DERIVED crossovers). Levels are per-section normalized like v4. ---- */
const CX={ add:(x,y)=>[x[0]+y[0],x[1]+y[1]], mul:(x,y)=>[x[0]*y[0]-x[1]*y[1],x[0]*y[1]+x[1]*y[0]],
  div:(x,y)=>{const d=y[0]*y[0]+y[1]*y[1]||1e-30;return [(x[0]*y[0]+x[1]*y[1])/d,(x[1]*y[0]-x[0]*y[1])/d];},
  inv:x=>CX.div([1,0],x), abs:x=>Math.hypot(x[0],x[1]), scale:(x,k)=>[x[0]*k,x[1]*k] };
function areaAt(st,x){
  const d=dimsAt(st,x), ring=seRing(d.a,d.b,(d.n!==undefined)?d.n:st.n,48,st.style);
  let A=0; for(let i=0;i<ring.length;i++){ const j=(i+1)%ring.length;
    A+=ring[i][0]*ring[j][1]-ring[j][0]*ring[i][1]; }
  return Math.abs(A)/2;
}
function response(S,ev){
  const st=ev.st, L=ev.layout;
  const hasW=S.topo!=='1way', hasM=S.topo==='3way', hasC=S.topo==='1way';
  const fxHi=(S.fxDerived&&S.fxDerived.hi)||900, fxLo=(S.fxDerived&&S.fxDerived.lo)||fxHi;
  const RHO=1.205, NSEG=64, F0=100, F1=16000, NF=120;
  const Ss=[]; for(let i=0;i<=NSEG;i++) Ss.push(Math.max(1e-6,areaAt(st, st.depth*i/NSEG)));
  const segL=st.depth/NSEG;
  const dW=L.find(d=>d.kind==='woof'), dM=L.find(d=>d.kind==='mid');
  const nodeW=hasW&&dW? Math.max(1,Math.round(dW.x/st.depth*NSEG)) : -1;
  const nodeM=hasM&&dM? Math.max(1,Math.round(dM.x/st.depth*NSEG)) : -1;
  const stub={L:Math.max(1e-4,S.cdDepth*IN), Sa:Ss[0]};
  const lptM=(d)=>(S.wallT||0.012)+((d&&d.board&&d.board.duct)? d.board.duct : Math.max(0.009,(d&&d.landH)||0));   // REAL port length: print wall + the MEASURED land/duct (pin #23) or the legacy 9 mm seat pad
  const mkBr=(ap,vtc,n,d)=>{ const Ap=n*ap*1e-4, V=n*vtc*1e-6, r=Math.sqrt(ap*1e-4/Math.PI);
    return {M:RHO*(lptM(d)+0.85*r)/Ap, Cc:V/(RHO*C*C)}; };
  /* b532: the network breathes through the EMITTED cut, like the law rows */
  const brW=hasW&&dW&&dW.slot? mkBr(dW.slot.apEm||dW.slot.ap,S.vtcW||150,(S.nW|0)||2,dW) : null;
  const brM=hasM&&dM&&dM.slot? mkBr(dM.slot.apEm||dM.slot.ap,S.vtcM||40,(S.nM|0)||4,dM) : null;
  const dC=L.find(d2=>d2.kind==='coaxtap');
  const brC=hasC&&dC&&dC.slot? mkBr(dC.slot.apEm||dC.slot.ap,(S.vtcC||60)/((S.coaxTaps|0)||6),(S.coaxTaps|0)||6,dC) : null;
  const nodeC=hasC? 1 : -1;
  const f=[],HF=[],MID=[],WOOF=[];
  for(let i=0;i<NF;i++){
    const fq=F0*Math.pow(F1/F0,i/(NF-1)); f.push(fq);
    const w=2*Math.PI*fq, k=w/C;
    const line=(P,U,Ln,Zc)=>{const cs=Math.cos(k*Ln),sn=Math.sin(k*Ln);
      return [CX.add(CX.scale(P,cs),CX.mul([0,-Zc*sn],U)),
              CX.add(CX.scale(U,cs),CX.mul([0,-sn/Zc],P))];};
    const zline=(Z,Ln,Zc)=>{const t=Math.tan(k*Ln);
      const num=CX.add(Z,[0,Zc*t]);
      const den=CX.add([Zc,0],CX.mul([0,t/Zc],CX.mul(Z,[Zc,0])));
      return CX.scale(CX.div(num,den),Zc);};
    const Sm=Ss[NSEG], am=Math.sqrt(Sm/Math.PI), ka=k*am;
    const Zrad=CX.scale(CX.div([ka*ka/2,0.85*ka],[1+ka*ka/2,0.85*ka]), RHO*C/Sm);
    const ZbrOf=br=>[0, w*br.M-1/(w*br.Cc)];
    const YbrOf=br=>CX.inv(ZbrOf(br));
    const Zm=new Array(NSEG+1); Zm[NSEG]=Zrad;
    for(let j=NSEG-1;j>=0;j--){ let Z=zline(Zm[j+1],segL,RHO*C/Ss[j]);
      if(j===nodeM&&brM) Z=CX.inv(CX.add(CX.inv(Z),YbrOf(brM)));
      if(j===nodeW&&brW) Z=CX.inv(CX.add(CX.inv(Z),YbrOf(brW)));
      if(j===nodeC&&brC) Z=CX.inv(CX.add(CX.inv(Z),YbrOf(brC)));
      Zm[j]=Z; }
    const Zt=new Array(NSEG+1);
    { const t=Math.tan(k*stub.L), Zcs=RHO*C/stub.Sa;
      Zt[0]= Math.abs(t)<1e-9? [1e9,0] : [0,-Zcs/t];
      for(let j=1;j<=NSEG;j++){ let Z=zline(Zt[j-1],segL,RHO*C/Ss[j-1]);
        if(j===nodeM&&brM) Z=CX.inv(CX.add(CX.inv(Z),YbrOf(brM)));
        if(j===nodeW&&brW) Z=CX.inv(CX.add(CX.inv(Z),YbrOf(brW)));
        Zt[j]=Z; } }
    const mouthFrom=(node,P,U,skip)=>{
      for(let j=node;j<NSEG;j++){
        if(j===nodeM&&brM&&skip!=='mid'&&j!==node) U=CX.add(U,CX.scale(CX.mul(P,YbrOf(brM)),-1));
        if(j===nodeW&&brW&&skip!=='woof'&&j!==node) U=CX.add(U,CX.scale(CX.mul(P,YbrOf(brW)),-1));
        [P,U]=line(P,U,segL,RHO*C/Ss[j]);
      }
      return U; };
    const drive=(node,br,skip)=>{
      const Ud=[0,-1/w];
      const Znode=CX.inv(CX.add(CX.inv(Zm[node]),CX.inv(Zt[node])));
      const ZC=[0,-1/(w*br.Cc)], ZM=[0,w*br.M];
      const Uin=CX.mul(Ud, CX.div(ZC, CX.add(ZC,CX.add(ZM,Znode))));
      const Pn=CX.mul(Uin,Znode);
      const Um=CX.div(Pn,Zm[node]);
      return CX.abs(CX.scale(mouthFrom(node,Pn,Um,skip),w)); };
    { const Ud=[0,-1/w], Zcs=RHO*C/stub.Sa;
      const Zdia=zline(Zm[0],stub.L,Zcs);
      let P=CX.mul(Ud,Zdia), U=Ud;
      [P,U]=line(P,U,stub.L,Zcs);
      HF.push(CX.abs(CX.scale(mouthFrom(0,P,U,'hf'),w))); }
    MID.push(hasM&&brM?drive(nodeM,brM,'mid'):0);
    WOOF.push(hasW&&brW?drive(nodeW,brW,'woof'): hasC&&brC?drive(nodeC,brC,'woof'):0);   // 1way: the coax CONE takes the low band
  }
  const dB=arr=>{const mx=Math.max(1e-30,...arr); return arr.map(v=>20*Math.log10((v||1e-30)/mx));};
  const hf=dB(HF), mid=hasM?dB(MID):null, woof=(hasW||hasC)?dB(WOOF):null;
  const lr4lp=x=>{const H2=CX.div([1,0],[1-x*x,Math.SQRT2*x]);return CX.mul(H2,H2);};
  const lr4hp=x=>{const ix=1/Math.max(1e-9,x);const H2=CX.div([1,0],[1-ix*ix,Math.SQRT2*ix]);return CX.mul(H2,H2);};
  const sum=f.map((fq,i)=>{
    let acc=[0,0];
    const add2=(curve,H)=>{if(!curve)return;acc=CX.add(acc,CX.scale(H,Math.pow(10,curve[i]/20)));};
    add2(hf,lr4hp(fq/fxHi));
    if(hasM) add2(mid,CX.mul(lr4lp(fq/fxHi),lr4hp(fq/fxLo)));
    if(hasW||hasC) add2(woof,lr4lp(fq/(hasM?fxLo:fxHi)));
    return 20*Math.log10(CX.abs(acc)+1e-12); });
  return {f,hf,mid,woof,sum,fxHi,fxLo};
}
/* ---- SOLVE: grow the horn until every law passes (throat-invariant growth;
   the v4 principle, clean-roomed). Returns the settled state + evaluation. ---- */
/* ---- ADAPTIVE SETTINGS (his ask 2026-07-24, docs/adaptive_settings_plan.md):
   ONE atomic transition per knob change - DERIVED knobs co-move with a ledger
   entry each; INTENT knobs (topo/style/coverage/counts/driver+CD choices/
   mouth/subXO/taps-per/shape/mount/dialect) are NEVER auto-changed. Pure,
   deterministic, idempotent - gate-asserted. The class curves are power-law
   fits OF THE PRESET TABLES themselves (data-derived, nothing invented):
   the od sliders used to freeze Sd/Vtc/xm at the last preset's values -
   the first sweep finding, a silent-trash source. */
function fitPow(pts){
  let sx=0,sy=0,sxx=0,sxy=0,n=0;
  for(const p of pts){ const x=p[0],y=p[1]; if(!(x>0&&y>0)) continue;
    const lx=Math.log(x),ly=Math.log(y); sx+=lx; sy+=ly; sxx+=lx*lx; sxy+=lx*ly; n++; }
  if(n<2) return null;
  const b=(n*sxy-sx*sy)/Math.max(1e-9,n*sxx-sx*sx);
  return {a:Math.exp((sy-b*sx)/n), b};
}
function adapt(S0,key,T){
  const S={...S0}, ledger=[];
  const set=(k,to,why)=>{ const from=S[k];
    if(to===undefined||from===to) return;
    S[k]=to; ledger.push({knob:k,from,to,why}); };
  T=T||{};
  /* 1. DERIVE dependents of the touched knob */
  if(key==='cdSel'&&S.topo!=='1way'&&T.CDP&&T.CDP[S.cdSel]){ const P=T.CDP[S.cdSel];
    set('td',P.td,'CD choice'); set('throat',P.td,'CD choice');
    set('cdFloor',P.floor,'CD choice'); set('cdDepth',P.dep,'CD choice'); }
  if(key==='wPre'){ const tbl=(S.topo==='1way'?T.CXPRE:T.WPRE)||{}; const P=tbl[S.wPre];
    if(P){ set('odW',P.od,'driver preset'); set('dpW',P.dp,'driver preset');
      set('sdW',P.sd,'driver preset'); set('vtcW',P.vtc,'driver preset'); set('xmW',P.xm,'driver preset');
      if(S.topo==='1way'){ set('sdC',P.sd,'coax unit'); set('vtcC',P.vtc,'coax unit'); set('xmC',P.xm,'coax unit');
        set('hfExit',P.hfExit!==undefined?P.hfExit:20.1,'coax unit'); set('recXO',P.recXO!==undefined?P.recXO:0,'coax unit');
        set('hornType',P.horn||'fixed','coax unit'); set('cdDepth',0,'coax unit');
        set('mouthW',Math.min(S.mouthCap||64,Math.round(2.35*P.od/2.54)),'driver-sized mouth (2.35×OD, the b518 rule)'); } } }
  if(key==='mPre'&&T.MPRE&&T.MPRE[S.mPre]){ const P=T.MPRE[S.mPre];
    set('odM',P.od,'mid preset'); set('dpM',P.dp,'mid preset'); set('sdM',P.sd,'mid preset');
    set('vtcM',P.vtc,'mid preset'); set('xmM',P.xm,'mid preset'); }
  if(key==='odW'){ set('wPre','custom','sliders detune the preset');
    if(T.WPRE){ const pts=k=>Object.values(T.WPRE).map(P=>[P.od,P[k]]);
      const fD=fitPow(pts('dp')), fS=fitPow(pts('sd')), fV=fitPow(pts('vtc')), fX=fitPow(pts('xm'));
      if(fD) set('dpW',+(fD.a*Math.pow(S.odW,fD.b)).toFixed(2),'depth class curve');
      if(fS) set('sdW',Math.round(fS.a*Math.pow(S.odW,fS.b)),'Sd class curve (fit of the preset table - the od slider used to freeze Sd)');
      if(fV) set('vtcW',Math.round(fV.a*Math.pow(S.odW,fV.b)),'Vtc class curve');
      if(fX) set('xmW',+(fX.a*Math.pow(S.odW,fX.b)).toFixed(1),'xmax class curve'); } }
  if(key==='odM'){ set('mPre','custom','sliders detune the preset');
    if(T.MPRE){ const pts=k=>Object.values(T.MPRE).map(P=>[P.od,P[k]]);
      const fD=fitPow(pts('dp')), fS=fitPow(pts('sd')), fV=fitPow(pts('vtc')), fX=fitPow(pts('xm'));
      if(fD) set('dpM',+(fD.a*Math.pow(S.odM,fD.b)).toFixed(2),'depth class curve');
      if(fS) set('sdM',Math.round(fS.a*Math.pow(S.odM,fS.b)),'Sd class curve');
      if(fV) set('vtcM',Math.round(fV.a*Math.pow(S.odM,fV.b)),'Vtc class curve');
      if(fX) set('xmM',+(fX.a*Math.pow(S.odM,fX.b)).toFixed(1),'xmax class curve'); } }
  if(key==='style'&&S.topo==='1way') set('seN',(S.style==='angular')?12:2,'1way form space is ROUND | SQUARE');
  /* 2. CLAMPS (only evidence-backed ones; more as the sweep report lands) */
  if(S.mouthW>(S.mouthCap||64)) set('mouthW',S.mouthCap||64,'mouth cap');
  return {S2:S, ledger};
}
function solve(S0){
  const S={...S0};
  for(let it=0;it<120;it++){                        // must outlast (cap - start)/step
    const ev=evaluate(S);
    /* the tap-footprint pad re-walk (his 'better system') retries on the SAME
       mouth BEFORE the clean return - a bump means the layout just moved */
    if(S._padBumped){ delete S._padBumped; continue; }
    if(!ev.fails) return {S, ev, grown:S.mouthW-S0.mouthW};
    /* PIN #27: grow ONLY while a failing law is actually growth-fixable (fit and
       station-area laws carry .grow). Driver-ceiling laws (CD reach, chamber LP,
       port velocity...) never improve with a bigger mouth - growing anyway
       ballooned every infeasible state to cap and made the mouth slider look
       dead. Refuse honestly AT the user's size instead. */
    if(!ev.rows.some(q=>q.st==='fail'&&q.grow))
      return {S, ev, grown:S.mouthW-S0.mouthW, infeasible:true};
    S.mouthW=+(S.mouthW+1).toFixed(2);
    if(S.mouthW>S0.mouthCap) {
      const evC=evaluate(S);
      return {S, ev:evC, grown:S.mouthW-S0.mouthW, infeasible:true, atCap:true};
    }
  }
  return {S, ev:evaluate(S), infeasible:true};
}

/* ---- A. EXPORT: the printed shell as a WATERTIGHT triangle soup ----
   (first slice of the export queue: the horn shell solid - inner surface,
   true-offset outer, mouth face/lip, throat annulus. Tap cuts and the dish
   part are the next slices.) The gate asserts edge-manifoldness by position:
   every undirected edge shared by exactly two triangles = printable. */
/* ---- b533 TRUE PRE-CUT SHELL (his ask: the real cutout in the shell itself).
   Constructive, never CSG (the dish precedent): wall cells under each port are
   skipped, the gap re-tessellated as a bridge-and-ear-clip patch from the
   surviving grid boundary to the TRUE hole outline (projected onto each
   surface), and the port barrel connects inner (grown, 45deg chuff flare) to
   outer (nominal) - watertight by construction, gate 2.8 keeps asserting it.
   SCOPE: flush wall ports (smooth: all; angular: ports that live inside ONE
   facet). Corner-board/seam-spanning ports and axial wedges keep the (b532-
   correct) cutter path - stated in the export note and PORT_TRUTH_AUDIT. */
function earClip(poly){       // simple-polygon ear clipping in 2D; returns index triples
  /* b533: tolerant of bridge-duplicated vertices (hole splicing repeats the
     two bridge points): collinear/zero-area ears are CONSUMED without
     emitting, and containment tests skip points coincident with the ear */
  const n=poly.length, idx=[]; for(let i=0;i<n;i++) idx.push(i);
  const area2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const same=(p,q)=>Math.abs(p[0]-q[0])<1e-12&&Math.abs(p[1]-q[1])<1e-12;
  let A=0; for(let i=0;i<n;i++){ const a=poly[i],b=poly[(i+1)%n]; A+=a[0]*b[1]-b[0]*a[1]; }
  const ccw=A>0, out=[];
  let guard=0;
  while(idx.length>3&&guard++<8000){
    let clipped=false;
    /* pass 1: consume DUPLICATE-neighbor ears only (the bridge points).
       Collinear grid verts must SURVIVE - consuming them leaves chords that
       skip vertices and break position-keyed edge sharing. */
    for(let k=0;k<idx.length;k++){
      const i1=idx[k], i2=idx[(k+1)%idx.length];
      if(same(poly[i1],poly[i2])){ idx.splice(k,1); clipped=true; break; } }
    if(clipped) continue;
    for(let k=0;k<idx.length;k++){
      const i0=idx[(k+idx.length-1)%idx.length], i1=idx[k], i2=idx[(k+1)%idx.length];
      const a=poly[i0], b=poly[i1], c=poly[i2];
      const cross=area2(a,b,c);
      if((ccw? cross:-cross)<=1e-14) continue;
      let ok=true;
      for(const j of idx){ if(j===i0||j===i1||j===i2) continue;
        const p=poly[j];
        if(same(p,a)||same(p,b)||same(p,c)) continue;
        const d0=area2(a,b,p), d1=area2(b,c,p), d2=area2(c,a,p);
        const s=ccw?1:-1;
        if(d0*s>=-1e-14&&d1*s>=-1e-14&&d2*s>=-1e-14){ ok=false; break; } }
      if(!ok) continue;
      out.push([i0,i1,i2]); idx.splice(k,1); clipped=true; break;
    }
    if(!clipped) break;                                   // degenerate - caller falls back
  }
  if(idx.length===3){ const a=poly[idx[0]],b=poly[idx[1]],c=poly[idx[2]];
    if(Math.abs(area2(a,b,c))>1e-14) out.push([idx[0],idx[1],idx[2]]); }
  return out;
}
function bridgeHole(outer,hole){   // splice a hole loop into the outer loop via the closest bridge
  let bi=0,bj=0,bd=1e9;
  for(let i=0;i<outer.length;i++) for(let j=0;j<hole.length;j++){
    const d=Math.hypot(outer[i][0]-hole[j][0],outer[i][1]-hole[j][1]);
    if(d<bd){bd=d;bi=i;bj=j;} }
  const res=[];
  for(let i=0;i<=bi;i++) res.push(outer[i]);
  for(let j=0;j<=hole.length;j++) res.push(hole[(bj+j)%hole.length]);
  for(let i=bi;i<outer.length;i++) res.push(outer[i]);
  return res;
}
function shellMesh(S){
  /* b533 SELF-VALIDATING: build with pre-cut ports; if the patch machinery
     leaves ANY unshared edge, rebuild uncut (ports fall back to the b532
     cutters - correct, just not pre-cut). A leaky shell can never ship;
     _cutReport says which ports are truly open. */
  const m1=shellMeshCore(S,true);
  const key=i=>{const p=m1.pos[i];return Math.round(p[0]*1e6)+','+Math.round(p[1]*1e6)+','+Math.round(p[2]*1e6);};
  const em=new Map();
  for(const t of m1.tri) for(const e of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
    const ka=key(e[0]),kb=key(e[1]); const k=ka<kb?ka+'|'+kb:kb+'|'+ka;
    em.set(k,(em.get(k)||0)+1); }
  for(const v of em.values()) if(v!==2){
    const m2=shellMeshCore(S,false);
    shellMesh._cutReport=(shellMeshCore._cutReport||[]).map(p=>({kind:p.kind,cut:false}));
    return m2; }
  shellMesh._cutReport=shellMeshCore._cutReport||[];
  return m1;
}
function shellMeshCore(S,allowCut){
  const ev=evaluate({...S});
  const st=ev.st;
  const wt=S.wallT||0.012, M=64;
  const pos=[], tri=[];
  const P=(x,q)=>{ pos.push([x,q[0],q[1]]); return pos.length-1; };
  const P3=(p)=>{ pos.push([p[0],p[1],p[2]]); return pos.length-1; };
  const quad=(a,b,c,d)=>{ tri.push([a,c,b],[b,c,d]); };
  const emitOriented=(list,a,b,c,refN,inward)=>{ const A=pos[a],B=pos[b],C2=pos[c];
    const nx=(B[1]-A[1])*(C2[2]-A[2])-(B[2]-A[2])*(C2[1]-A[1]);
    const ny=(B[2]-A[2])*(C2[0]-A[0])-(B[0]-A[0])*(C2[2]-A[2]);
    const nz=(B[0]-A[0])*(C2[1]-A[1])-(B[1]-A[1])*(C2[0]-A[0]);
    const dt=nx*refN[0]+ny*refN[1]+nz*refN[2];
    if((inward&&dt>0)||(!inward&&dt<0)) list.push([a,c,b]); else list.push([a,b,c]); };
  /* ---- cut-eligible ports (frames identical to tapCutters) ---- */
  const K=24;
  const ports=[];
  if(allowCut&&S.topo!=='1way') for(const d of ev.layout){
    if(d.kind!=='woof'&&d.kind!=='mid') continue;
    if(!d.slot||!d.flowU||!d.crossV) continue;
    if(d.board||d.mountN) continue;                        // seam/axial ports keep the cutter path (declared)
    const n=d.normal, u=d.flowU, v=d.crossV, np=d.slot.np||1;
    for(let kp=0;kp<np;kp++){
      const sgn=(kp===0?-1:1);
      let ua=u, va=v;
      if(np>=2 && !(d.slot&&d.slot.round)){ const c45=Math.SQRT1_2;
        ua=[(u[0]+sgn*v[0])*c45,(u[1]+sgn*v[1])*c45,(u[2]+sgn*v[2])*c45];
        va=[n[1]*ua[2]-n[2]*ua[1], n[2]*ua[0]-n[0]*ua[2], n[0]*ua[1]-n[1]*ua[0]]; }
      const off=np>=2? sgn*(d.slot.offm||d.od*0.24) : 0;
      const c0=[d.tap[0]+v[0]*off, d.tap[1]+v[1]*off, d.tap[2]+v[2]*off];
      const sa=d.slot.sa, sb=d.slot.sb, cx=Math.max(0,sa-sb), fr=wt/2;
      const outl=[];
      if(cx<1e-9){ for(let i=0;i<K;i++){ const a=i/K*2*Math.PI; outl.push([sb*Math.cos(a),sb*Math.sin(a)]); } }
      else{ for(let i=0;i<K/2;i++){ const a=-Math.PI/2+Math.PI*i/(K/2); outl.push([cx+sb*Math.cos(a),sb*Math.sin(a)]); }
            for(let i=0;i<K/2;i++){ const a=Math.PI/2+Math.PI*i/(K/2); outl.push([-cx+sb*Math.cos(a),sb*Math.sin(a)]); } }
      const grow=o=>{ const l=Math.hypot(o[0],o[1])||1e-9; return [o[0]*(1+fr/l),o[1]*(1+fr/l)]; };
      const at3=(o,z)=>[c0[0]+ua[0]*o[0]+va[0]*o[1]+n[0]*z,
                        c0[1]+ua[1]*o[0]+va[1]*o[1]+n[1]*z,
                        c0[2]+ua[2]*o[0]+va[2]*o[1]+n[2]*z];
      ports.push({d, c0, ua, va, n, outl, grow, at3, facet:d.facet, cut:false});
    }
  }
  /* patch builder: stitch a boundary loop (EXISTING vertex indices) to hole
     rings via bridge+earClip in the port-frame plane; returns tri list or null */
  const buildPatch=(boundIdx, boundUV, holeRings, holeUVs, refN, inward)=>{
    const out=[];
    let loopUV=boundUV.slice(), loopIdx=boundIdx.slice();
    for(let hi=0;hi<holeRings.length;hi++){
      const ring=holeRings[hi];
      const hUV=holeUVs[hi].slice().reverse();
      const hIdx=ring.slice().reverse();
      let bi=0,bj=0,bd=1e9;
      for(let i=0;i<loopUV.length;i++) for(let j=0;j<hUV.length;j++){
        const d2=Math.hypot(loopUV[i][0]-hUV[j][0],loopUV[i][1]-hUV[j][1]);
        if(d2<bd){bd=d2;bi=i;bj=j;} }
      const nUV=[],nIdx=[];
      for(let i=0;i<=bi;i++){ nUV.push(loopUV[i]); nIdx.push(loopIdx[i]); }
      for(let j=0;j<=hUV.length;j++){ nUV.push(hUV[(bj+j)%hUV.length]); nIdx.push(hIdx[(bj+j)%hUV.length]); }
      for(let i=bi;i<loopUV.length;i++){ nUV.push(loopUV[i]); nIdx.push(loopIdx[i]); }
      loopUV=nUV; loopIdx=nIdx;
    }
    const tris=earClip(loopUV);
    /* bridges duplicate 2 vertices per hole - those ears are consumed without
       emitting, so expect (len-2) minus up to 2 per hole, minus corner dupes */
    if(tris.length<loopUV.length-2-2*holeRings.length-4||!tris.length) return null;
    for(const t of tris) emitOriented(out,loopIdx[t[0]],loopIdx[t[1]],loopIdx[t[2]],refN,inward);
    return out;
  };
  const buildBarrel=(pt,ringsIn,ringsMid,ringsOut)=>{
    const out=[];
    for(let h=0;h<pt.length;h++){
      const NB=ringsIn[h].length, c0=pt[h].c0;
      for(const pair of [[ringsIn[h],ringsMid[h]],[ringsMid[h],ringsOut[h]]]){
        const A=pair[0],B2=pair[1];
        for(let i=0;i<NB;i++){ const j=(i+1)%NB;
          const a=pos[A[i]];
          const rad=[a[0]-c0[0],a[1]-c0[1],a[2]-c0[2]];
          emitOriented(out,A[i],B2[i],A[j],rad,true);
          emitOriented(out,A[j],B2[i],B2[j],rad,true); } }
    }
    return out;
  };
  if(S.style==='angular'){
    const SPx=(S.topo==='1way'&&st.xAdapter)? st.pts.filter(p=>p.x>=st.xAdapter-1e-9) : st.pts;
    const FS=SPx.map(p=>facetsAt(st,p.x));
    const OS=SPx.map(p=>offsetVerts(st,p.x,wt));
    const NV=FS[0].length, NS=SPx.length;
    const iIn=[], iOut=[];
    for(let j=0;j<NS;j++){ iIn.push(FS[j].map(f=>P(SPx[j].x,f.p))); iOut.push(OS[j].map(v=>P(SPx[j].x,v))); }
    /* group single-facet ports into cell rects, dry-build the patches, and
       only commit skips on success (a failed patch falls back to the cutter) */
    const skip=new Set(), patches=[];
    const groups=new Map();
    for(const p of ports){
      if(p.facet===undefined) continue;
      let xMin=1e9,xMax=-1e9;
      for(const o of p.outl){ const g=p.grow(o); const q=p.at3(g,0);
        xMin=Math.min(xMin,q[0]); xMax=Math.max(xMax,q[0]); }
      let j0=-1,j1=-1;
      for(let j=0;j<NS;j++){ if(SPx[j].x<=xMin-0.003) j0=j; if(j1<0&&SPx[j].x>=xMax+0.003) j1=j; }
      if(j0<1||j1<0||j1>=NS-1||j1<=j0) continue;
      let fits=true;
      for(let j=j0;j<=j1&&fits;j++){ const f=FS[j][p.facet]; if(!f){fits=false;break;}
        const t0=(p.c0[1]-f.p[0])*f.dir[0]+(p.c0[2]-f.p[1])*f.dir[1];
        const half=Math.max.apply(null,p.outl.map(o=>{const g=p.grow(o);return Math.abs(g[1]);}))
                  +Math.abs((p.c0[1]-p.d.tap[1])*f.dir[0]+(p.c0[2]-p.d.tap[2])*f.dir[1])*0+0.006;
        if(t0-half<0.003||t0+half>f.len-0.003) fits=false; }
      if(!fits) continue;
      const key=p.facet;
      if(!groups.has(key)) groups.set(key,{facet:p.facet,j0,j1,list:[]});
      const g=groups.get(key); g.j0=Math.min(g.j0,j0); g.j1=Math.max(g.j1,j1); g.list.push(p);
    }
    for(const g of groups.values()){
      const fi=g.facet, pt=g.list, p0=pt[0];
      const projUV=(q)=>[ (q[0]-p0.c0[0])*p0.ua[0]+(q[1]-p0.c0[1])*p0.ua[1]+(q[2]-p0.c0[2])*p0.ua[2],
                          (q[0]-p0.c0[0])*p0.va[0]+(q[1]-p0.c0[1])*p0.va[1]+(q[2]-p0.c0[2])*p0.va[2] ];
      const mkRing=(p,zf,grown)=>p.outl.map(o=>P3(p.at3(grown? p.grow(o):o, zf)));
      const ringsIn=pt.map(p=>mkRing(p,0,true));
      const ringsMid=pt.map(p=>mkRing(p,wt/2,false));
      const ringsOut=pt.map(p=>mkRing(p,wt,false));
      const bIn=[], bOut=[];
      for(let j=g.j0;j<=g.j1;j++) bIn.push(iIn[j][fi]);
      for(let j=g.j1;j>=g.j0;j--) bIn.push(iIn[j][(fi+1)%NV]);
      for(let j=g.j0;j<=g.j1;j++) bOut.push(iOut[j][fi]);
      for(let j=g.j1;j>=g.j0;j--) bOut.push(iOut[j][(fi+1)%NV]);
      const uvOf=idx=>idx.map(i=>projUV(pos[i]));
      const hUVi=ringsIn.map(r2=>uvOf(r2)), hUVo=ringsOut.map(r2=>uvOf(r2));
      const pin=buildPatch(bIn,uvOf(bIn),ringsIn,hUVi,p0.n,true);
      const pout=buildPatch(bOut,uvOf(bOut),ringsOut,hUVo,p0.n,false);
      if(!pin||!pout) continue;
      const bar=buildBarrel(pt,ringsIn,ringsMid,ringsOut);
      for(let j=g.j0;j<g.j1;j++) skip.add(j+':'+fi);
      patches.push(...pin,...pout,...bar);
      for(const p of pt) p.cut=true;
    }
    for(let j=0;j<NS-1;j++) for(let i=0;i<NV;i++){
      if(skip.has(j+':'+i)) continue;
      quad(iIn[j][i],iIn[j][(i+1)%NV],iIn[j+1][i],iIn[j+1][(i+1)%NV]);
      quad(iOut[j][(i+1)%NV],iOut[j][i],iOut[j+1][(i+1)%NV],iOut[j+1][i]); }
    for(let i=0;i<NV;i++){ const jm=NS-1;
      quad(iIn[jm][(i+1)%NV],iIn[jm][i],iOut[jm][(i+1)%NV],iOut[jm][i]);     // mouth face
      quad(iIn[0][i],iIn[0][(i+1)%NV],iOut[0][i],iOut[0][(i+1)%NV]); }      // throat annulus
    tri.push(...patches);
  } else {
    /* 1way: the SHELL part starts at the dish rim - the dish part owns
       [xPrint..xAdapter]; printing the deep interior in the shell was only
       ever right for removable-horn units (his 'never through the driver') */
    const SPs=(S.topo==='1way'&&st.xAdapter)? st.pts.filter(p=>p.x>=st.xAdapter-1e-9) : st.pts;
    const rings=SPs.map(p=>seRing(p.a,p.b,(p.n!==undefined)?p.n:st.n,M,'smooth'));
    const pre=SPs.filter(p=>!p.roll);
    const ringsO=pre.map(p=>offsetRing(st,p.x,wt,M));
    const iIn=SPs.map((p,j)=>rings[j].map(q=>P(p.x,q)));
    const iOut=pre.map((p,j)=>ringsO[j].map(q=>P(p.x,q)));
    /* ---- smooth-family cuts: project outlines onto the true surfaces ---- */
    const skip=new Set(), patches=[];
    const NSs=SPs.length, NPre=pre.length;
    const memb=(q,off)=>{ const x=q[0];
      if(x<1e-4||x>st.depth-1e-4) return 1e9;
      const dd=dimsAt(st,x), nn=(dd.n!==undefined)?dd.n:st.n;
      return Math.pow(Math.abs(q[1]/(dd.a+off)),nn)+Math.pow(Math.abs(q[2]/(dd.b+off)),nn); };
    const projSurf=(p,o,off)=>{           // bisect along the port normal to land ON the surface
      let lo=-0.06, hi=0.08;
      const f=t=>memb(p.at3(o,t),off)-1;
      let flo=f(lo), fhi=f(hi);
      if(flo>0||fhi<0) return null;
      for(let it=0;it<24;it++){ const mid=(lo+hi)/2; if(f(mid)>0) hi=mid; else lo=mid; }
      return p.at3(o,(lo+hi)/2);
    };
    const groups=new Map();
    for(const p of ports){
      /* grid rect: stations from x extent; azimuth from params of outline pts */
      let xMin=1e9,xMax=-1e9;
      const prm=[];
      let ok=true;
      for(const o of p.outl){ const g=p.grow(o);
        const q=projSurf(p,g,0); if(!q){ ok=false; break; }
        xMin=Math.min(xMin,q[0]); xMax=Math.max(xMax,q[0]);
        const dd=dimsAt(st,Math.max(1e-4,Math.min(st.depth-1e-4,q[0])));
        prm.push(paramFor(dd.a,dd.b,(dd.n!==undefined)?dd.n:st.n,q[1],q[2])); }
      if(!ok) continue;
      let j0=-1,j1=-1;
      for(let j=0;j<NPre;j++){ if(pre[j].x<=xMin-0.002) j0=j; if(j1<0&&pre[j].x>=xMax+0.002) j1=j; }
      if(j0<1||j1<0||j1>=NPre-1||j1<=j0) continue;
      const ic=Math.round(prm.reduce((a,b)=>a+b,0)/prm.length/(2*Math.PI)*M);
      let dMin=0,dMax=0;
      for(const t of prm){ let dd=Math.round(t/(2*Math.PI)*M)-ic;
        while(dd>M/2)dd-=M; while(dd<-M/2)dd+=M;
        dMin=Math.min(dMin,dd); dMax=Math.max(dMax,dd); }
      const i0=ic+dMin-1, i1=ic+dMax+1;
      if(i1-i0>=M-2) continue;
      groups.set(groups.size,{j0,j1,i0,i1,list:[p]});
    }
    /* iterative merge until stable: a port can bridge two groups - single-pass
       merging left overlapping rects that double-skipped cells (leak source) */
    { let changed=true;
      while(changed){ changed=false;
        const ks=[...groups.keys()];
        outer: for(let a=0;a<ks.length;a++) for(let b2=a+1;b2<ks.length;b2++){
          const A=groups.get(ks[a]), B3=groups.get(ks[b2]);
          if(!A||!B3) continue;
          if(!(B3.j1<A.j0-1||B3.j0>A.j1+1)&&!(B3.i1<A.i0-1||B3.i0>A.i1+1)){
            A.j0=Math.min(A.j0,B3.j0); A.j1=Math.max(A.j1,B3.j1);
            A.i0=Math.min(A.i0,B3.i0); A.i1=Math.max(A.i1,B3.i1);
            A.list.push(...B3.list); groups.delete(ks[b2]); changed=true; break outer; } } }
    }
    for(const g of groups.values()){
      const pt=g.list, p0=pt[0];
      const projUV=(q)=>[ (q[0]-p0.c0[0])*p0.ua[0]+(q[1]-p0.c0[1])*p0.ua[1]+(q[2]-p0.c0[2])*p0.ua[2],
                          (q[0]-p0.c0[0])*p0.va[0]+(q[1]-p0.c0[1])*p0.va[1]+(q[2]-p0.c0[2])*p0.va[2] ];
      const mkRing=(p,off,grown,mid)=>{
        const out2=[];
        for(const o of p.outl){ const oo=grown? p.grow(o):o;
          let q;
          if(mid){ const qi=projSurf(p,oo,0), qo=projSurf(p,oo,wt);
            if(!qi||!qo) return null;
            q=[(qi[0]+qo[0])/2,(qi[1]+qo[1])/2,(qi[2]+qo[2])/2]; }
          else{ q=projSurf(p,oo,off); if(!q) return null; }
          out2.push(P3(q)); }
        return out2;
      };
      const ringsIn=[], ringsMid=[], ringsOut=[];
      let bad=false;
      for(const p of pt){
        const a=mkRing(p,0,true,false), m=mkRing(p,0,false,true), b=mkRing(p,wt,false,false);
        if(!a||!m||!b){ bad=true; break; }
        ringsIn.push(a); ringsMid.push(m); ringsOut.push(b); }
      if(bad) continue;
      const wrap=i=>((i%M)+M)%M;
      /* index-space UVs (station j, unwrapped azimuth i): intrinsic to the
         surface - the tangent-plane projection FOLDED at n=12 superellipse
         corners and fed earClip self-intersecting polygons (the leak source) */
      const bIn=[], bOut=[], uvIn=[], uvOut=[];
      const pushB=(arr,uvArr,vidx,iu,j)=>{ if(arr.length&&arr[arr.length-1]===vidx) return;
        arr.push(vidx); uvArr.push([iu,j]); };
      for(let j=g.j0;j<=g.j1;j++) pushB(bIn,uvIn,iIn[j][wrap(g.i0)],g.i0,j);
      for(let i=g.i0;i<=g.i1;i++) pushB(bIn,uvIn,iIn[g.j1][wrap(i)],i,g.j1);
      for(let j=g.j1;j>=g.j0;j--) pushB(bIn,uvIn,iIn[j][wrap(g.i1)],g.i1,j);
      for(let i=g.i1;i>=g.i0;i--) pushB(bIn,uvIn,iIn[g.j0][wrap(i)],i,g.j0);
      if(bIn[0]===bIn[bIn.length-1]){ bIn.pop(); uvIn.pop(); }
      for(let j=g.j0;j<=g.j1;j++) pushB(bOut,uvOut,iOut[j][wrap(g.i0)],g.i0,j);
      for(let i=g.i0;i<=g.i1;i++) pushB(bOut,uvOut,iOut[g.j1][wrap(i)],i,g.j1);
      for(let j=g.j1;j>=g.j0;j--) pushB(bOut,uvOut,iOut[j][wrap(g.i1)],g.i1,j);
      for(let i=g.i1;i>=g.i0;i--) pushB(bOut,uvOut,iOut[g.j0][wrap(i)],i,g.j0);
      if(bOut[0]===bOut[bOut.length-1]){ bOut.pop(); uvOut.pop(); }
      const ic2=(g.i0+g.i1)/2;
      const uvRing=(ring)=>ring.map(vi=>{
        const q=pos[vi];
        const x=Math.max(pre[0].x,Math.min(pre[NPre-1].x,q[0]));
        let jF=0; for(let k2=0;k2<NPre-1;k2++){ if(pre[k2+1].x>=x){ jF=k2+(x-pre[k2].x)/Math.max(1e-9,pre[k2+1].x-pre[k2].x); break; } jF=k2+1; }
        const dd=dimsAt(st,Math.max(1e-4,Math.min(st.depth-1e-4,q[0])));
        const t=paramFor(dd.a,dd.b,(dd.n!==undefined)?dd.n:st.n,q[1],q[2]);
        let iF=t/(2*Math.PI)*M;
        while(iF-ic2>M/2) iF-=M; while(iF-ic2<-M/2) iF+=M;
        return [iF,jF]; });
      const hUVi=ringsIn.map(uvRing), hUVo=ringsOut.map(uvRing);
      const pin=buildPatch(bIn,uvIn,ringsIn,hUVi,p0.n,true);
      const pout=buildPatch(bOut,uvOut,ringsOut,hUVo,p0.n,false);
      if(!pin||!pout) continue;
      const bar=buildBarrel(pt,ringsIn,ringsMid,ringsOut);
      for(let j=g.j0;j<g.j1;j++) for(let i=g.i0;i<g.i1;i++) skip.add(j+':'+wrap(i));
      patches.push(...pin,...pout,...bar);
      for(const p of pt) p.cut=true;
    }
    for(let j=0;j<SPs.length-1;j++) for(let i=0;i<M;i++){
      if(!skip.has(j+':'+i)) quad(iIn[j][i],iIn[j][(i+1)%M],iIn[j+1][i],iIn[j+1][(i+1)%M]); }
    for(let j=0;j<pre.length-1;j++) for(let i=0;i<M;i++){
      if(!skip.has(j+':'+i)) quad(iOut[j][(i+1)%M],iOut[j][i],iOut[j+1][(i+1)%M],iOut[j+1][i]); }
    const jt=SPs.length-1, jp=pre.length-1;
    for(let i=0;i<M;i++){
      quad(iIn[jt][(i+1)%M],iIn[jt][i],iOut[jp][(i+1)%M],iOut[jp][i]);      // lip: roll tip -> outer edge
      quad(iIn[0][i],iIn[0][(i+1)%M],iOut[0][i],iOut[0][(i+1)%M]); }        // throat annulus
    tri.push(...patches);
  }
  shellMeshCore._cutReport=ports.map(p=>({kind:p.d.kind, cut:p.cut}));       // battery reads which ports are truly open
  return {pos, tri};
}
/* ---- A. EXPORT slice 2: the REFERENCE D DISH INSERT as its own printable
   part - the 38° conical face with the REAL round tap holes and the CD bore,
   uniform print thickness (axial offset t/sin38 = normal thickness t). Built
   as structured triangulation (annuli + one rect-to-circle patch per hole),
   never CSG, so watertightness is constructive and gate-assertable.
   v1 scope (stated honestly): face + holes + bore wall + rim edge; the snout
   tube, flange step and wings are the next slice. ---- */
function dishMesh(S){
  if(S.topo!=='1way') return null;
  const st=stations(S), L=layout(S,st);
  const tp=L.filter(d=>d.kind==='coaxtap');
  if(!tp.length) return null;
  const th38=d2r(38);
  const rCone=(S.odW||22)*CM/2, rDish=rCone+0.012;
  const od=(S.odW||22)*CM;
  const rHFm=((S.hfExit||20.1)/1000)/2;
  const Lhm=(S.hornLen!==undefined)? S.hornLen :
    (S.hornType==='removable'? 0.14*od+((S.xmC||S.xmW||4)/1000)+0.002 : 0.53*od);   // print depth per construction (matches profile)
  const rSMm=(S.hornType==='removable')? rHFm+0.008 : 0.60*rCone;
  /* the triple (US10506331 + his ruling): FIXED metal horn -> the part starts
     AT the proud-mouth plane and seats a COLLAR over the metal ring (never
     printing into the driver); REMOVABLE bolt-on horn -> the part still owns
     the replaced horn from the TRUE exit (his funnel build). */
  const fixedH=(S.hornType!=='removable');
  const rB=fixedH? rSMm+0.001 : rHFm;
  const rP=Math.hypot(tp[0].tap[1],tp[0].tap[2]);
  /* b532 PORT TRUTH: sa/sb arrive FINAL from layout (all clamps applied
     there; the law rows ride the same emitted dims) - no re-clamping here */
  const sa=Math.max(0.004,(tp[0].slot&&tp[0].slot.sa)||0.008);   // ARC half-length (along the ring)
  const sb=Math.max(0.003,(tp[0].slot&&tp[0].slot.sb)||sa);      // RADIAL half-width
  const N=tp.length, t=S.wallT||0.012;
  /* OS face (matches profile): x(r) inverts r=sqrt(r0^2+((x-x0) tanT)^2) */
  const rem=(S.hornType==='removable');
  const r0F=rem? rHFm : rSMm, x0F=rem? 0 : Lhm;
  const LaD=Lhm+Math.max(0.008,(rDish-rSMm)/Math.tan(th38));
  const spanF=Math.max(0.008, LaD-x0F);
  const tanT=Math.sqrt(Math.max(1e-9,rDish*rDish-r0F*r0F))/spanF;
  const xOf=r=> r<=r0F? x0F : x0F+Math.sqrt(r*r-r0F*r0F)/tanT;
  /* HIS CORRECTION: the print's BACK takes the SHAPE OF THE DRIVER CONE with an
     x-max gap - it nests directly on the driver, no tube, no floating plate.
     Cone depths from the 6FHX51 CAD: 0.03od at the cone rim, 0.10od at the
     HF-horn mouth ring. Beyond the cone rim the back is the flat flange seat. */
  const gap=((S.xmC||S.xmW||4)/1000)+0.002;
  const coneY=r=>{ const r0=0.60*rCone, r1=0.72*rCone;       // CAD: cone rim Ø.72od (was .80 - his pin #8)
    const tq=Math.max(0,Math.min(1,(r1-r)/(r1-r0)));
    return od*(0.03+0.07*tq); };
  const dishBack=r=>{
    if(fixedH && r<rSMm+0.010) return Lhm-0.010;             // collar seat ring - 6mm recess clears the proud metal lip
    if(r<rSMm) return xOf(r)-t*1.25;                         // (removable) the internal-horn shell wall
    if(r>=0.72*rCone) return Lhm-0.004;                      // flange seat past the TRUE cone rim (CAD .72od)
    return Lhm-0.004 - (coneY(r)-od*0.03) + Math.min(gap, coneY(r)-od*0.03); };
  /* band geometry rides the slot record (computed once in layout - the
     dishMesh/law divergence is structurally gone, b532) */
  const band=(tp[0].slot&&tp[0].slot.band)||null;
  const w0=band? band.w0 : Math.min(Math.max(sb*1.6,0.012),(rDish-rB)/2*0.6);
  const rIn=band? band.rIn : Math.max(rB+0.0005,rP-w0), rOut=band? band.rOut : Math.min(rDish-0.004,rP+w0);
  const COLS=Math.max(18, Math.ceil(72/N)), NA=N*COLS, NRi=8, NRo=8;   // ring resolution holds even at 2 taps; finer patches (his mesh-quality zoom)
  const pos=[], tri=[];
  const V=(x,y,z)=>{ pos.push([x,y,z]); return pos.length-1; };
  const F=(r,ph,back)=>V(back? Math.min(dishBack(r), xOf(r)-t*0.35) : xOf(r), r*Math.cos(ph), r*Math.sin(ph));
  const quad=(a,b,c,d,flip)=>{ if(flip) tri.push([a,b,c],[b,d,c]); else tri.push([a,c,b],[b,c,d]); };
  const ring=(rr,back)=>{ const out=[]; for(let j=0;j<NA;j++) out.push(F(rr,j/NA*2*Math.PI,back)); return out; };
  for(const back of [false,true]){
    /* inner + outer annuli (plain polar grids) */
    for(const [r0,r1,NR] of [[rB,rIn,NRi],[rOut,rDish,NRo]]){
      const rows=[]; for(let i=0;i<=NR;i++) rows.push(ring(r0+(r1-r0)*i/NR,back));
      for(let i=0;i<NR;i++) for(let j=0;j<NA;j++)
        quad(rows[i][j],rows[i][(j+1)%NA],rows[i+1][j],rows[i+1][(j+1)%NA],back);
    }
    /* the hole band: one rect-to-STADIUM patch per tap (arc slots - his print
       photo; sa==sb degenerates to the Reference D round hole) */
    const bandIn=ring(rIn,back), bandOut=ring(rOut,back);
    for(let k=0;k<N;k++){
      const phC=tp[k].phi, j0=k*COLS;
      const loop=[];
      for(let j=0;j<=COLS;j++) loop.push(bandIn[(j0+j)%NA]);                  // bottom, left->right
      for(let j=COLS;j>=0;j--) loop.push(bandOut[(j0+j)%NA]);                 // top, right->left
      const Mloop=loop.length;
      const circ=[];
      /* b532 PORT TRUTH: the hole polygon is a UNIFORM-PERIMETER stadium,
         discrete-area-corrected. The old ray-through-center mapping bunched
         vertices mid-slot and cut the caps into a pinched kite - real holes
         measured 25-52% under the lawed area with every row green. */
      const Lst=Math.max(0,sa-sb);
      const per=4*Lst+2*Math.PI*sb;
      const stadPt=(s)=>{ // s in [0,per): bottom straight -> right cap -> top straight -> left cap (CCW, starts bottom-left)
        let q=s%per;
        if(q<2*Lst) return [-Lst+q, -sb];
        q-=2*Lst;
        if(q<Math.PI*sb){ const a=-Math.PI/2+q/sb; return [Lst+sb*Math.cos(a), sb*Math.sin(a)]; }
        q-=Math.PI*sb;
        if(q<2*Lst) return [Lst-q, sb];
        q-=2*Lst;
        const a=Math.PI/2+q/sb; return [-Lst+sb*Math.cos(a), sb*Math.sin(a)];
      };
      const uv=[]; for(let i=0;i<Mloop;i++) uv.push(stadPt(i/Mloop*per));
      let Apoly=0; for(let i=0;i<Mloop;i++){ const a=uv[i], b2=uv[(i+1)%Mloop];
        Apoly+=a[0]*b2[1]-b2[0]*a[1]; } Apoly=Math.abs(Apoly)/2;
      const Atrue=4*sa*sb-(4-Math.PI)*sb*sb;
      const fsc=Math.sqrt(Math.max(0.5,Atrue/Math.max(1e-12,Apoly)));         // discrete-polygon correction (~1%)
      for(const q2 of uv) circ.push(F(rP+q2[1]*fsc, phC+(q2[0]*fsc)/rP, back));
      for(let i=0;i<Mloop;i++){ const i2=(i+1)%Mloop;
        quad(loop[i],loop[i2],circ[i],circ[i2],back); }
      if(!back){ tp[k]._loopF=circ; } else { tp[k]._loopB=circ; }
    }
  }
  /* hole tubes, bore wall, rim edge - front ring <-> back ring */
  const join=(A,B,flip)=>{ for(let i=0;i<A.length;i++){ const i2=(i+1)%A.length;
    quad(A[i],A[i2],B[i],B[i2],flip); } };
  for(const d of tp){ join(d._loopF,d._loopB,true); delete d._loopF; delete d._loopB; }
  join(ring(rB,false),ring(rB,true),true);
  join(ring(rDish,false),ring(rDish,true),false);
  return {pos, tri};
}
/* ---- A. EXPORT slice 3: TAP CUTTERS - one closed stadium prism per port,
   oriented along the wall normal, extending past both faces. Import as
   NEGATIVE VOLUMES in the slicer (or boolean-subtract in CAD) to cut the
   real slots into the shell solid; a true pre-cut shell is the next slice.
   X-pairs carry the ±45° rotation and the cross-wise offsets exactly as
   rendered/lawed. ---- */
function tapCutters(S){
  /* b532 PORT-TRUTH rewrite (docs/PORT_TRUTH_AUDIT findings, all measured):
     - long axis rides flowU for EVERY driver (the b529 onCh swap put board
       slots 90deg across the law/record and pair offsets behind each other)
     - the prism reaches through the REAL print stack: wall + board duct /
       flush land boss (the old wallT+12mm could never pierce the b530 lands)
     - inner reach is MEASURED (outline marched into the channel; curved
       walls left >=20mm membranes at -12mm)
     - true 45deg chuff flare: widened profile below the inner face, 45deg
       taper across the inner half-wall, NOMINAL area from mid-wall out
       (the old full-length taper was ~10deg and the lawed area existed only
       12mm outside the print)
     - manifold outlines (deduped ring; the round degenerate seam made
       non-manifold prisms) */
  const ev=evaluate(S);
  const st=ev.st;
  const wt=S.wallT||0.012;
  const innerHas=(x,y,z)=>{
    if(x<1e-4||x>st.depth-1e-4) return false;
    if(S.style==='angular'){
      const F2=facetsAt(st,x); let inC=false;
      for(let i=0,j=F2.length-1;i<F2.length;j=i++){
        const a=F2[i].p, b=F2[j].p;
        if(((a[1]>z)!==(b[1]>z)) && (y<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])) inC=!inC; }
      return inC; }
    const d2=dimsAt(st,x), nn=(d2.n!==undefined)?d2.n:st.n;
    return Math.pow(Math.abs(y/d2.a),nn)+Math.pow(Math.abs(z/d2.b),nn)<1;
  };
  const pos=[], tri=[];
  const P=(p)=>{ pos.push(p); return pos.length-1; };
  for(const d of ev.layout){
    if(d.kind!=='woof'&&d.kind!=='mid') continue;
    if(!d.slot||!d.flowU||!d.crossV) continue;
    const n=d.normal, u=d.flowU, v=d.crossV;
    const np=d.slot.np||1;
    /* the REAL stack past the inner face: wall + duct (corner boards) or
       wall + measured land boss (flush); axial wedges stay a queued export
       item - their cutter still pierces the wall (see queue b532) */
    const stack=wt+(d.board&&d.board.duct? d.board.duct : (!d.mountN&&d.landH? d.landH : 0));
    for(let kp=0;kp<np;kp++){
      const sgn=(kp===0?-1:1);
      let ua=u, va=v;
      if(np>=2 && !(d.slot&&d.slot.round)){ const c=Math.SQRT1_2;   // pin #16: round pairs offset without the X rotation
        ua=[ (u[0]+sgn*v[0])*c, (u[1]+sgn*v[1])*c, (u[2]+sgn*v[2])*c ];
        va=[ n[1]*ua[2]-n[2]*ua[1], n[2]*ua[0]-n[0]*ua[2], n[0]*ua[1]-n[1]*ua[0] ]; }
      const off=np>=2? sgn*(d.slot.offm||d.od*0.24) : 0;
      const c0=[ d.tap[0]+v[0]*off, d.tap[1]+v[1]*off, d.tap[2]+v[2]*off ];
      const sa=d.slot.sa, sb=d.slot.sb, K=24;
      /* outline: round = clean K-gon circle; stadium = caps + straights,
         built without duplicate seam points (manifold) */
      const outline=[];
      const cx=Math.max(0,sa-sb);
      if(cx<1e-9){ for(let i=0;i<K;i++){ const a=i/K*2*Math.PI; outline.push([sb*Math.cos(a), sb*Math.sin(a)]); } }
      else{
        for(let i=0;i<K/2;i++){ const a=-Math.PI/2+Math.PI*i/(K/2); outline.push([cx+sb*Math.cos(a), sb*Math.sin(a)]); }
        for(let i=0;i<K/2;i++){ const a=Math.PI/2+Math.PI*i/(K/2); outline.push([-cx+sb*Math.cos(a), sb*Math.sin(a)]); }
      }
      /* MEASURED inner reach: march the widened outline into the channel */
      const fr=wt/2;
      const grow=o=>{ const l=Math.hypot(o[0],o[1])||1e-9; return [o[0]*(1+fr/l), o[1]*(1+fr/l)]; };
      let z0=-0.012;
      for(let guard=0;guard<16;guard++){
        let all=true;
        for(const o of outline){ const g=grow(o);
          const p=[c0[0]+ua[0]*g[0]+va[0]*g[1]+n[0]*z0,
                   c0[1]+ua[1]*g[0]+va[1]*g[1]+n[1]*z0,
                   c0[2]+ua[2]*g[0]+va[2]*g[1]+n[2]*z0];
          if(!innerHas(p[0],p[1],p[2])){ all=false; break; } }
        if(all) break;
        z0-=0.004;
      }
      const z1=stack+0.012;
      const at=(o,z)=>[ c0[0]+ua[0]*o[0]+va[0]*o[1]+n[0]*z,
                        c0[1]+ua[1]*o[0]+va[1]*o[1]+n[1]*z,
                        c0[2]+ua[2]*o[0]+va[2]*o[1]+n[2]*z ];
      const NB=outline.length;
      /* rings: z0 wide -> inner face wide -> mid-wall nominal (true 45deg
         flare over wt/2) -> z1 nominal */
      const rings=[ outline.map(o=>P(at(grow(o),z0))),
                    outline.map(o=>P(at(grow(o),0))),
                    outline.map(o=>P(at(o,wt/2))),
                    outline.map(o=>P(at(o,z1))) ];
      for(let s2=0;s2<rings.length-1;s2++){ const A=rings[s2], B2=rings[s2+1];
        for(let i=0;i<NB;i++){ const j=(i+1)%NB;
          tri.push([A[i],B2[i],A[j]],[A[j],B2[i],B2[j]]); } }
      const cB=P(at([0,0],z0)), cT=P(at([0,0],z1));
      for(let i=0;i<NB;i++){ const j=(i+1)%NB;
        tri.push([cB,rings[0][j],rings[0][i]],[cT,rings[3][i],rings[3][j]]); }
    }
  }
  return pos.length? {pos, tri} : null;
}
/* ---- A. EXPORT slice 4: PANEL LAYOUT for CLASSIC ANGULAR - the flat parts.
   Each wall/chamfer unfolds to stacked trapezoids (throat->break->mouth widths
   + true slant lengths); seams carry the included dihedral and the per-edge
   bevel (half of it). Panel normals are constant along x for this family, so
   one angle per seam is exact, not an approximation. ---- */
function panelLayout(S){
  if(S.style!=='angular') return null;
  const st=stations(S);
  const x0=(S.topo==='1way'&&st.xAdapter)? st.xAdapter : 1e-4;
  const stns=[x0]; if(st.xBreak!==undefined) stns.push(st.xBreak); stns.push(st.depth-1e-6);
  const FS=stns.map(x=>facetsAt(st,x));
  const NV=FS[0].length;
  const panels=[], seams=[];
  for(let i=0;i<NV;i++){
    const widths=FS.map(F=>F[i].len);
    const slants=[];
    for(let s=0;s<stns.length-1;s++){
      const A=FS[s][i], B=FS[s+1][i];
      const dr=Math.hypot(B.mid[0]-A.mid[0],B.mid[1]-A.mid[1]);
      slants.push(Math.hypot(stns[s+1]-stns[s], dr));
    }
    panels.push({name:(FS[0][i].ch?'chamfer ':'wall ')+i, ch:!!FS[0][i].ch, widths, slants});
  }
  for(let i=0;i<NV;i++){
    const a=FS[0][i].n2, b=FS[0][(i+1)%NV].n2;
    const inc=180-(Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1])))*180/Math.PI);
    seams.push({a:i, b:(i+1)%NV, deg:inc, bevel:(180-inc)/2});
  }
  return {panels, seams, stations:stns.length===3?['throat','break','mouth']:['throat','mouth']};
}
/* binary STL bytes from shellMesh (mm units for slicers) */
function stlBytes(mesh){
  const n=mesh.tri.length, buf=new ArrayBuffer(84+n*50), dv=new DataView(buf);
  dv.setUint32(80,n,true);
  let o=84;
  for(const t of mesh.tri){
    const A=mesh.pos[t[0]],B=mesh.pos[t[1]],C2=mesh.pos[t[2]];
    const u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]], v=[C2[0]-A[0],C2[1]-A[1],C2[2]-A[2]];
    let nx=u[1]*v[2]-u[2]*v[1], ny=u[2]*v[0]-u[0]*v[2], nz=u[0]*v[1]-u[1]*v[0];
    const L=Math.hypot(nx,ny,nz)||1e-9; nx/=L;ny/=L;nz/=L;
    dv.setFloat32(o,nx,true);dv.setFloat32(o+4,ny,true);dv.setFloat32(o+8,nz,true); o+=12;
    for(const p of [A,B,C2]){ dv.setFloat32(o,p[0]*1000,true);dv.setFloat32(o+4,p[1]*1000,true);dv.setFloat32(o+8,p[2]*1000,true); o+=12; }
    dv.setUint16(o,0,true); o+=2;
  }
  return buf;
}

/* ---- M8: KNOWN-BUILD PRESETS - the per-topology front door. Each bundle is a
   COMPLETE state: it must solve at its stated mouth with ZERO fails and ZERO
   warns (presets land exemplary, not merely legal - gate-asserted). Driver
   numerics mirror the shell's datasheet tables verbatim (gate cross-checks). */
const BUILDS=(()=>{
  const B={style:'smooth',wallT:0.012,rollR:2,mouthCap:64,subXO:80,npW:1,npM:1,
    placeW:'auto',mount:'flush',fxHi:900,fxLo:300,coaxRing:4.5};
  const CDX={cdSel:'dcx464',td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4};
  /* b531 KNOWN-BUILDS AUDIT re-bake (docs/KNOWN_BUILDS_AUDIT.md): every row a
     NAMED purchasable driver or loudly archetype; W10 sd/xm and W12 dp/xm were
     datasheet contradictions (10HPL64 sd 320 xm 4 - the old xm 8 read like a
     peak-to-peak doubling; 12NDL76 dp 141mm xm 7); W5 was fiction (no 5.25in
     driver has xm 4.5) -> Dayton DC130A-8; W8 -> named B&C 8NDL51; C5 -> the
     BMS 5CN140 datasheet (od 135mm dp 82 sd 74 - 'floors unverified' was
     FALSE, recXO 1900 published). vtc all tool-estimated (no maker publishes). */
  const W5 ={wPre:'w5',   odW:13.76,dpW:6.95,sdW:91.6,vtcW:35, xmW:2.5};
  const W65={wPre:'w65',  odW:16.7,dpW:8.5, sdW:132,vtcW:45, xmW:5};
  const W8 ={wPre:'w8',   odW:22.5,dpW:9.0, sdW:220,vtcW:80, xmW:7};
  const W10={wPre:'hpl10',odW:26.1,dpW:12.2,sdW:320,vtcW:130,xmW:4};
  const W12={wPre:'ndl12',odW:31.5,dpW:14.1,sdW:522,vtcW:180,xmW:7};
  const C5 ={wPre:'cn5',  odW:13.5,dpW:8.2, sdW:74, vtcW:30, xmW:3.5};
  const C65={wPre:'fhx65',odW:16.7,dpW:12,  sdW:137,vtcW:40, xmW:4};
  const M4 ={mPre:'m4',   odM:10.3,dpM:6.5, sdM:50, vtcM:40, xmM:3};
  const CXU={sdC:150,vtcC:60,xmC:4,coaxTaps:6,odC:0.22,dpC:0.11};
  return {
   '1way':[
    {key:'fhx6',   name:'B&C 6FHX51 — one-horn square classic · 70°×70°', expectWarns:1,
     s:{...B,...M4, topo:'1way',style:'angular',seN:12,covH:70,covV:70,mouthW:17,nW:2,nM:4,coaxTaps:4,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:20.1,recXO:2500,odC:0.187,dpC:0.122,
        wPre:'fhx6',odW:18.7,dpW:12.2,sdW:132,vtcW:35,xmW:3.5, sdC:132,vtcC:35,xmC:3.5}},
    /* b531 audit: 'floors unverified' was FALSE - the BMS 5CN140 datasheet
       publishes recXO 1900 / HF 1500-30k; od/dp/sd re-baked to it. hfExit
       REMOVED (the old 20.1 was B&C 6FHX51 contamination; BMS publishes no
       exit dia - the class default applies until his 3 measurements). */
    {key:'refd',   name:'Reference D mini — BMS 5CN140 5″ coax · 70°×70°', expectWarns:1,
     s:{...B,...M4, topo:'1way',style:'angular',seN:12,covH:70,covV:70,mouthW:14,nW:2,nM:4,coaxTaps:4,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,recXO:1900,odC:0.135,dpC:0.082,
        wPre:'cx5',odW:13.5,dpW:8.2,sdW:74,vtcW:30,xmW:3.5, sdC:74,vtcC:30,xmC:3.5}},
    /* b531 audit: both FHX datasheets state 60x40 NOMINAL coverage - the old
       90x60 / 60x60 names were unsourced print targets wearing the driver name */
    {key:'fhx12',  name:'B&C 12FHX76 — one-horn point source · 60°×40°', expectWarns:1,
     s:{...B,...M4, topo:'1way',seN:6, covH:60,covV:40,mouthW:30,nW:2,nM:4,coaxTaps:6,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:33,recXO:1200,odC:0.315,dpC:0.169,
        wPre:'fhx12',odW:31.5,dpW:16.9,sdW:522,vtcW:150,xmW:4.25, sdC:522,vtcC:150,xmC:4.25}},
    {key:'fhx15',  name:'B&C 15FHX76 — one-horn round · 60°×40°', expectWarns:1,
     s:{...B,...M4, topo:'1way',seN:2, covH:60,covV:40,mouthW:34,nW:2,nM:4,coaxTaps:6,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:33,recXO:1200,odC:0.393,dpC:0.199,
        wPre:'fhx15',odW:39.3,dpW:19.9,sdW:855,vtcW:250,xmW:4.25, sdC:855,vtcC:250,xmC:4.25}},
   ],
   '2way':[
    /* b532 port-truth audit: the real JMOD runs TWO teardrop vents per 12in
       ALONG the diagonal seams inside milled cone recesses; v5 ships its own
       wall-slot dialect - the name says so (a seam-teardrop dialect is queued) */
    {key:'jmod',      name:'JMOD-class — 90°×60° · 2×12″ on the DCX coax (JW manual · v5 wall slots, not JMOD seam teardrops)',
     s:{...B,...CDX,...W12,...M4, topo:'2way',seN:6, covH:90,covV:60,mouthW:30,nW:2,nM:4}},
    /* b531 audit honesty: no online build pairs a DCX coax with these 4-woofer
       packs - the four slots below are HOUSE ARCHETYPES and say so loudly
       (his rule: known builds are builds found online). Drivers are now NAMED
       purchasable units (DC130A-8, 8NDL51); '(Waslo)' dropped - no Waslo
       build is a 2way on a DCX464 (the true CoSyne 3-way preset is a queued
       item with the full sourced pack in docs/KNOWN_BUILDS_AUDIT.md 2.10). */
    {key:'canon9060', name:'house canon — 90°×60° · 4×6.5″ on the DCX coax (house archetype)',
     s:{...B,...CDX,...W65,...M4, topo:'2way',seN:6, covH:90,covV:60,mouthW:24,nW:4,nM:4}},
    {key:'compact',   name:'compact — 90°×60° · 4× Dayton DC130A-8 (house archetype)',
     s:{...B,...CDX,...W5,...M4,  topo:'2way',seN:6, covH:90,covV:60,mouthW:24,nW:4,nM:4}},
    {key:'square',    name:'square-format — 90°×60° · 4× B&C 8NDL51 (house archetype — no real build)',
     s:{...B,...CDX,...W8,...M4,  topo:'2way',seN:12,covH:90,covV:60,mouthW:25,nW:4,nM:4}},   // b531: settled size (8NDL51 od 22.5 needs 25)
    {key:'tall',      name:'tall — 60°×90° · 4× DC130A-8 (house archetype — no known real build)',
     s:{...B,...CDX,...W5,...M4,  topo:'2way',seN:6, covH:60,covV:90,mouthW:24,nW:4,nM:4}},
    {key:'angular',   name:'classic angular — 90°×60° · 4× DC130A-8 (CoSyne geometry · drivers differ)',
     s:{...B,...CDX,...W5,...M4,  topo:'2way',style:'angular',seN:12,covH:90,covV:60,mouthW:24,nW:4,nM:4}},
   ],
   '3way':[
    /* SH96-class UNPARKED at b530: the b529 canon fork resolved to ruling (a),
       SOURCED. The 17 m/s velocity law was mis-scoped (nc535 diyaudio
       worst-case heuristic; Hinson MEH.pdf p.19's 17 m/s = reflex chuffing
       onset in a max-SPL model, and he shipped ports past it) - Danley's own
       patents legislate AREA, never velocity. The measured record: SH-50 tape
       measure (van Ommen, diyaudio 292379 #4957246; chrisbln thing:6886663
       independently ships the same) = 2.5in woofer taps @ 10.5in, 3/4in mid
       taps @ 3.5in. v3.1 boards: openings cut THROUGH the walls at the corner
       seams (HIS SH-96 interior shot: round side-wall openings; JMOD: seam
       teardrops). SH-96's own vent dia/count stays UNMEASURED - the dialect
       rides SH-50-scale numbers until his tape measure (queue ask). */
    /* b531 audit: mids m3->m4 (SH96HO sheet says 6x4in; 2008 press said 5in -
       sheet wins, conflict cited); mouth 58 was PHYSICALLY IMPOSSIBLE on the
       real unit (front face 45.00 x 26.50 in, 18mm birch => max ~43.6in) ->
       re-baked 43. odW/sdW/xmW stay generic-15 proxies (Danley LF
       proprietary); fxLo unsourced (passive box). */
    {key:'sh96',  name:'SH96-class — corner boards · 4×15″ + 6×4″ mids (stand-ins declared · v5 mouth 51″ vs real 45″ front)',
     expectWarns:1,   // declared: woofer any-pair spacing ~1.5×λ/4 (ruling B tolerates it for the class; the real SH96 measures the same)
     /* v5's corner-board geometry cannot land 4x15 @ 90x60 under 51in - the
        real unit does it inside a 45.00x26.50in front (18mm birch). The gap
        is MODEL HONESTY, stated in the name: Danley's real pocket/vent
        geometry is tighter than v5's measured-clearance model allows. */
     s:{...B,...CDX, topo:'3way',style:'angular',seN:12,covH:90,
        covV:60,mouthW:51,nW:4,nM:6,fxLo:250,placeW:'chamfer', wPre:'w15',
        odW:39,dpW:17,sdW:855,vtcW:320,xmW:10, mPre:'m4',odM:10.3,dpM:6.5,
        sdM:50,vtcM:40,xmM:3}},
    /* b531 audit: this slot wore the SH50 name on a state that is NOT the
       SH-50 (real: 50x50, 2x12 - spec sheet Rev.202209301629; the 70x70 was
       chrisbln thing:6886663's MOUTH-FLARE angle misread as coverage - the
       provenance trap is documented in docs/KNOWN_BUILDS_AUDIT.md 2.12/2.14).
       The SH50-class label moved to the ANGULAR preset below (the real SH-50
       is angular 13-ply birch); this shape stays as a loud archetype. */
    {key:'arch7070',  name:'70°×70° square · 4×10″ + 4 mids (house archetype — no real build)',
     s:{...B,...CDX,...W10,...M4, topo:'3way',seN:12,covH:70,covV:70,mouthW:24,nW:4,nM:4,fxLo:250}},
    {key:'classic',   name:'classic — 90°×60° · 4×10″ + 4 mids (house archetype — no real build)',
     /* b528: 27 -> 31, the mouth-plane enclosure law - at 27 the 10in frames
        reached 51 mm past the mouth plane (nothing to seal a box against).
        b531 audit: no 3way MEH with FOUR horn-loaded 10s exists anywhere -
        loud archetype; kipman725/aragorus re-anchor candidates recorded in
        docs/KNOWN_BUILDS_AUDIT.md 2.13 (need more thread mining first). */
     s:{...B,...CDX,...W10,...M4, topo:'3way',seN:6, covH:90,covV:60,mouthW:31,nW:4,nM:4,fxLo:250}},
    /* b531 audit 2.14: the SH50-class label lives HERE now - the real SH-50
       IS angular 13-ply birch. Sourced: 50x50 coverage, 2x12 LF, 4 mids
       (sheet says 5in, av-iq 4in - conflict cited, M4 pack = declared
       stand-in), 1in-exit HF (DCX464 = declared stand-in), external
       28x28x25.5in. Mouth 26 = design choice inside that envelope (never an
       SH-50 number); fxLo unsourced (passive box). Tap-station goldens vs
       the van Ommen record (3/4in@3.5 / 2.5in@10.5 / reflex@14.5) are the
       queued next step. */
    {key:'sh50',   name:'SH50-class — 50°×50° · 2×12″ + 4 mids (stand-ins declared · v5 mouth 29″ vs real 28″ box)',
     s:{...B,...CDX,...W12,...M4, topo:'3way',style:'angular',seN:12,covH:50,covV:50,mouthW:29,nW:2,nM:4,fxLo:250}},   // b531: settled size; real external 28x28x25.5in - the 1in gap is model honesty, declared
   ],
  };
})();

return {C,IN,CM, sePoint,seRing, paramFor, profile, stations, dimsAt, surfPt, surfN, layout, evaluate, solve, adapt, response, areaAt, facetsAt, facetN, offsetRing, offsetVerts, BUILDS, shellMesh, dishMesh, tapCutters, panelLayout, stlBytes, boxDims};
})();
if(typeof module!=='undefined') module.exports=MEH2;
