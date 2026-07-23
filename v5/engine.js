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
  const ch=Math.max(0.06, Math.min(0.42, (12-n)/12*0.42+0.06));   // chamfer fraction of the half-width
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
    const Lh=(S.hornLen!==undefined)? S.hornLen : 0.85*((S.dpW||10)*CM);
    const rSM=0.60*rCone;                                      // stock mouth at the cone plane ("same geometry first")
    const rP=Math.min(Math.max((S.coaxRing||4.5)*CM, rSM+0.012, 0.70*rCone), rCone*0.8); // tap ring on the EXPOSED cone annulus
    const thA=d2r(38);
    const La=Lh+Math.max(0.008,(rDish-rSM)/Math.tan(thA));     // adapter = replaced horn + dish face
    const xTap=Lh+Math.max(0.004,(rP-rSM)/Math.tan(thA));
    const htC=rHF;                                             // the horn STARTS at the true exit
    const rAt=x=> x<=Lh? rHF+(rSM-rHF)*x/Lh : rSM+Math.tan(thA)*(x-Lh);
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
      return {pts, depth, rollR:0, mouthH:hm, xAdapter:La, xTap, rBore:htC};
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
    return {pts, depth, rollR, mouthH:hm, xAdapter:La, xTap, rBore:htC};
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
  return { form:'se', n:S.seN, style:S.style,
           pts:pr.pts.map(p=>({x:p.x, a:p.h, b:(p.v!==undefined)?p.v:p.h*ar, roll:p.roll,
             n:(p.nOv!==undefined)?p.nOv:morph(p.x)})),   // Reference D: the dish stays ROUND inside an angular horn
           depth:pr.depth, rollR:pr.rollR, throat:(pr.rBore!==undefined)?pr.rBore:S.throat*IN/2, ar, xBreak:pr.xBreak, slopeCos:pr.slopeCos, xAdapter:pr.xAdapter, xTap:pr.xTap };
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
    const cf=Math.max(0.06, Math.min(0.42, (12-st.n)/12*0.42+0.06));
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
  return out;
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
  /* woofers start just past the mids and clear them by MEASUREMENT, not by a
     radii-sum heuristic (2x12in horns were being pushed to the mouth - pin #14 era) */
  const obsM=(S.topo==='3way'&&xM0!=null)?
    seatsFor(st,xM0,(S.nM|0)||4,modeM,0,seatM).map(q=>({p:[xM0,q[0],q[1]], r:seatM})) : null;
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
  /* seats at uniform ARC positions (uniform azimuth bunches on flattened superellipses) */
  const placeRing=(kind,x,nSeats,od,dp,arcOffset,mode)=>{
    for(const q of seatsFor(st,x,nSeats,mode||'ring',arcOffset||0,od/2+0.011)){
      const p=[x,q[0],q[1]];
      const nrm=(q.facet!==undefined)? facetN(st,x,q.facet)
              : surfN(st,x,(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]));   // ONE proven normal path per style
      const drv={kind, x, phi:Math.atan2(q[1],q[0]), center:p, normal:nrm, od, dp, tap:p, seatR:od/2+0.011, facet:q.facet};
      if(S.mount==='axial') drv.mountN=[-1,0,0];               // pin #5: spot-face land - body axis parallel to the horn axis
      const fc=flowCross(nrm); drv.flowU=fc.u; drv.crossV=fc.v;
      out.push(drv);
    }
  };
  if(S.topo!=='1way' && modeW==='chamfer'){
    /* CORNER BOARDS v2 (his teardrop catch + the SH96 interior photo): the
       boards are SEPARATE 45° shelves SPANNING each corner, sized to the
       woofer - never the horn's own chamfer sliver. Board plane holds the
       axis; slots run ALONG the board; the walk finds the smallest station
       whose corner pocket hosts the chord. */
    const nB=Math.min(4,(S.nW|0)||4);
    const need=seatW+0.008;
    let xB=null, chH=0;
    for(let x=0.03;x<=st.depth*0.9;x+=st.depth/128){
      const dm=dimsAt(st,x), k=dm.a+dm.b-Math.SQRT2*need;
      if(k<Math.max(dm.a,dm.b)+0.005) continue;
      const ch2=(dm.a+dm.b-k)/Math.SQRT2;                    // = need
      const mid=[k/2,k/2];
      let ok=true;
      if(obsM) for(const o of obsM){
        for(let c2=0;c2<nB;c2++){ const ph=Math.PI/4+c2*Math.PI/2;
          const p3=[x, Math.abs(mid[0])*Math.cos(ph)/Math.cos(Math.PI/4)*Math.SQRT2/2*0+ (k/Math.SQRT2)*Math.cos(ph), (k/Math.SQRT2)*Math.sin(ph)];
          if(Math.hypot(p3[0]-o.p[0],p3[1]-o.p[1],p3[2]-o.p[2])<seatW+o.r+0.008){ ok=false; break; } }
        if(!ok) break; }
      if(ok){ xB=x; chH=ch2; break; }
    }
    if(xB==null){ out.missing=true; }
    else for(let c2=0;c2<nB;c2++){
      const ph=Math.PI/4+c2*Math.PI/2, rC=(dimsAt(st,xB).a+dimsAt(st,xB).b-Math.SQRT2*need)/Math.SQRT2;
      const p=[xB, rC*Math.cos(ph), rC*Math.sin(ph)];
      const nrm=[0, Math.cos(ph), Math.sin(ph)];
      const drv={kind:'woof', x:xB, phi:ph, center:p, normal:nrm,
        od:S.odW*CM, dp:S.dpW*CM, tap:p, seatR:seatW-0.000,
        board:{half:need, len:2*seatW+0.04}, onCh:true};
      drv.flowU=[1,0,0]; drv.crossV=[0, -Math.sin(ph), Math.cos(ph)];
      if(S.mount==='axial') drv.mountN=[-1,0,0];
      out.push(drv);
    }
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
      const fc=flowCross(nrm); drv.flowU=fc.u; drv.crossV=fc.v;
      out.push(drv);
    }
  }
  if(S.topo==='3way' && xM!=null) placeRing('mid', xM, (S.nM|0)||4, S.odM*CM, S.dpM*CM, 0, modeM);
  if(S.topo!=='1way' && xW==null) out.missing=true;
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
    const apC=sdC/Math.max(4,Math.min(8, 17/(2*Math.PI*fxCo*((S.xmC||S.xmW||4)/1000)) ))/nT;   // cm^2 per slot, velocity-clamped CR
    const rC=Math.sqrt(apC*1e-4/Math.PI); const saC=rC, sbC=rC;   // Reference D: ROUND holes through the dish face
    for(const [a2,p] of taps){ const nrm=surfN(st,xT,a2);
      out.push({kind:'coaxtap', x:xT, phi:a2, center:p, normal:nrm, od:0.02, dp:0,
        tap:p, seatR:sbC+0.004, slot:{sa:saC, sb:sbC, ap:apC, radial:true}}); }
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
    /* VELOCITY FIRST (the compendium law): the 17 m/s cap SETS the CR; the
       compression band only grades it (v4: mids warn down to 2.5:1). Forcing
       CR back into the band made the tool fail its own velocity check. */
    const crVel=17/(2*Math.PI*fLow*(xm/1000));           // CR the velocity limit allows
    const cr=Math.max(1.5, Math.min(band[1], crVel));    // below 1.5:1 it stops being a compression tap
    const ap=sd/cr;                                      // cm^2 per driver
    const shp=(kind==='mid'? S.shM : S.shW)||'slot';       // his call: ROUND is classic for many horns
    for(const d of drs){ const apP=ap/(np||1);              // pin #19: area split across the ports
      const saM=shp==='round'? Math.sqrt(apP*1e-4/Math.PI) : Math.sqrt(apP*1e-4*3)/2;
      const sbM=shp==='round'? saM : Math.sqrt(apP*1e-4/3)/2;
      d.slot={sa:saM, sb:sbM, ap:ap, np:np||1, round:shp==='round',
        offm:(np||1)>=2? 0.24*d.od : 0};                    // pins #1/#25: pair straddles CROSS-wise (same station)
    }
    add(kind.toUpperCase(),'Compression ratio Sd/Ap',cr.toFixed(1)+':1',
      cr>=band[0], cr>=band[0]*0.6,
      cr<band[0]?'below the classic band - big ports, mild loading (JMOD territory); excursion-limited duty':'derived from the 17 m/s limit, graded against the band');
    const vel=cr*2*Math.PI*fLow*(xm/1000);
    add(kind.toUpperCase(),'Port velocity at band low edge ('+fLow+' Hz)',vel.toFixed(1)+' m/s',vel<=17.2,vel<=20,'compendium: the real port-area criterion, evaluated at the band bottom');
    /* REAL port length: print wall + 0.85r end correction (matches the response network) */
    const lpt=(S.wallT||0.012)+0.85*Math.sqrt(ap*1e-4/Math.PI);
    /* pin #5: the axial land is printed SOLID - the tap port runs THROUGH it, so
       the port LENGTHENS by the land's local thickness (~0.7*seatR*tan(tilt));
       the front chamber volume stays the driver's own Vtc */
    let lptEff=lpt, landed=false;
    if(S.mount==='axial'){
      let mx=0;
      for(const d of drs){ if(!d.mountN) continue;
        const ct=Math.abs(d.normal[0]*d.mountN[0]+d.normal[1]*d.mountN[1]+d.normal[2]*d.mountN[2]);
        mx=Math.max(mx, Math.tan(Math.acos(Math.min(1,ct)))); }
      if(mx>0){ lptEff=lpt + 0.7*(((drs[0].seatR)||0.05))*mx; landed=true;
        /* pin #24: on a steeply tilted wall the printed land becomes a monster
           wedge - say so. Danley uses spot-faces where walls run near-parallel
           to the axis (Waslo flare 2); past ~30 deg flush is the honest mount. */
        const wedge=(((drs[0].seatR)||0.05))*mx, tilt=Math.atan(mx)*180/Math.PI;
        add(kind.toUpperCase(),'Axial land wedge (wall tilt '+tilt.toFixed(0)+'°)',(wedge*1000).toFixed(0)+' mm tall',
          tilt<=30, tilt<=45,
          'the spot-face land grows with wall tilt (seatR·tan); past ~30° the print is a wedge monster - use FLUSH on steep walls (Danley lands live on near-axial walls)');
      }
    }
    const fLP=C/(2*Math.PI)*Math.sqrt((ap*1e-4)/((vtc*1e-6)*lptEff));
    add(kind.toUpperCase(),'Chamber acoustic low-pass',Math.round(fLP)+' Hz',fLP>=1.2*fx,fLP>=fx,
      (landed?'tap runs THROUGH the solid axial land (port lengthened ~0.7*seatR*tan(tilt)) - ':'')+'Vtc+tap Helmholtz (real wall + end-corrected port) must clear the crossover ('+fx+' Hz)');
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
      const ap=taps[0].slot?taps[0].slot.ap:0, vtc=(S.vtcC||60);
      if(ap>0){ const rC9=(S.odW||22)*CM/2, od9=(S.odW||22)*CM;
        /* local dish thickness at the ring: front(38 deg face) minus the
           cone-following back (his correction) - the REAL Lpt, not wallT */
        const rB9=Math.max(S.throat*IN/2,0.60*rC9);
        const xF9=(rT-rB9)/Math.tan(d2r(38));
        const cy9=od9*(0.03+0.07*Math.max(0,Math.min(1,(0.80*rC9-rT)/(0.20*rC9))));
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
      add('COAX','Tap ring sits over the coax cone',(rT*1000).toFixed(0)+' vs '+(rCone*1000).toFixed(0)+' mm',
        rT+sa<=rCone*0.95, rT+sa<=rCone*1.05,
        'the plate slots must land on the cone that feeds them');
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
/* ---- fit & physics checks (carried laws; expanded per rebuild) ---- */
function evaluate(S){
  let st=stations(S), L=layout(S,st);
  /* CLASSIC ANGULAR: converge the flare break onto the landed woofer station
     (Waslo S3->S4). Internally converged so evaluate stays deterministic. */
  if(S.style==='angular'){
    for(let it=0;it<3;it++){
      const dW=L.filter(d=>d.kind==='woof');
      if(!dW.length) break;
      const hint=Math.max(...dW.map(d=>d.x))+dW[0].seatR+0.02;
      if(Math.abs(hint-(st.xBreak||0))<=0.02) break;
      S._breakHint=hint; st=stations(S); L=layout(S,st);
    }
  }
  const rows=[];
  const add=(sec,name,val,ok,warn,why,grow)=>rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why,grow:!!grow});
  /* pin #4/#11 acceptance: every driver's tap under its frame; ring even */
  let tapOff=0;
  for(const d of L){ if(!d.tap) continue;
    tapOff=Math.max(tapOff, Math.hypot(d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2])); }
  add('LAW','Taps under their drivers',(tapOff*1000).toFixed(1)+' mm', tapOff<=0.001,false,'printed facets make this structural');
  /* neighbor clearance (frame + seat) */
  let worst=1e9;
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
    const a=L[i], b=L[j];
    const g=Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1],a.center[2]-b.center[2])-(a.seatR+b.seatR);
    if(g<worst)worst=g; }
  add('LAW','Seats clear each other',(worst*1000).toFixed(0)+' mm', worst>=0.006, worst>=0,'printed seats must not merge', S.topo!=='1way');   // the coax tap ring is driver-fixed - growth can't help
  add('LAW','Every ring fits inside the horn', L.missing?'NO':'yes', !L.missing, false,'drivers sit at the smallest station whose ring hosts them; if none exists the horn grows', true);
  if(S.fxDerived&&S.fxDerived.lo)
    add('XO','Derived crossover (from landed geometry)', (S.topo==='3way'? S.fxDerived.hi+' / ':'')+S.fxDerived.lo+' Hz',
      (S.fxDerived.lo<= (S.topo==='3way'?S.fxLo:S.fxHi)*1.35), true, 'XO falls out of the path length; ceiling from the driver choice');
  let ac=acoustics(S,L,st); rows.push(...ac.rows);
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
            if(Math.abs(tv)>m3) worst=Math.max(worst,Math.abs(tv)-m3); }
          if(S.style==='angular'&&d.facet!==undefined){
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
  const LPT_CM=((S.wallT||0.012)+0.009)*100;           // REAL port length: print wall + seat pad (B-stage: geometry-true)
  const mkBr=(ap,vtc,n)=>{ const Ap=n*ap*1e-4, V=n*vtc*1e-6, r=Math.sqrt(ap*1e-4/Math.PI);
    return {M:RHO*(LPT_CM*1e-2+0.85*r)/Ap, Cc:V/(RHO*C*C)}; };
  const brW=hasW&&dW&&dW.slot? mkBr(dW.slot.ap,S.vtcW||150,(S.nW|0)||2) : null;
  const brM=hasM&&dM&&dM.slot? mkBr(dM.slot.ap,S.vtcM||40,(S.nM|0)||4) : null;
  const dC=L.find(d2=>d2.kind==='coaxtap');
  const brC=hasC&&dC&&dC.slot? mkBr(dC.slot.ap,(S.vtcC||60)/((S.coaxTaps|0)||6),(S.coaxTaps|0)||6) : null;
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
function shellMesh(S){
  const st=stations(S);
  const wt=S.wallT||0.012, M=64;
  const pos=[], tri=[];
  const P=(x,q)=>{ pos.push([x,q[0],q[1]]); return pos.length-1; };
  const quad=(a,b,c,d)=>{ tri.push([a,c,b],[b,c,d]); };
  if(S.style==='angular'){
    const SPx=(S.topo==='1way'&&st.xAdapter)? st.pts.filter(p=>p.x>=st.xAdapter-1e-9) : st.pts;
    const FS=SPx.map(p=>facetsAt(st,p.x));
    const OS=SPx.map(p=>offsetVerts(st,p.x,wt));
    const NV=FS[0].length, NS=SPx.length;
    const iIn=[], iOut=[];
    for(let j=0;j<NS;j++){ iIn.push(FS[j].map(f=>P(SPx[j].x,f.p))); iOut.push(OS[j].map(v=>P(SPx[j].x,v))); }
    for(let j=0;j<NS-1;j++) for(let i=0;i<NV;i++){
      quad(iIn[j][i],iIn[j][(i+1)%NV],iIn[j+1][i],iIn[j+1][(i+1)%NV]);
      quad(iOut[j][(i+1)%NV],iOut[j][i],iOut[j+1][(i+1)%NV],iOut[j+1][i]); }
    for(let i=0;i<NV;i++){ const jm=NS-1;
      quad(iIn[jm][(i+1)%NV],iIn[jm][i],iOut[jm][(i+1)%NV],iOut[jm][i]);     // mouth face
      quad(iIn[0][i],iIn[0][(i+1)%NV],iOut[0][i],iOut[0][(i+1)%NV]); }      // throat annulus
  } else {
    const rings=st.pts.map(p=>seRing(p.a,p.b,(p.n!==undefined)?p.n:st.n,M,'smooth'));
    const pre=st.pts.filter(p=>!p.roll);
    const ringsO=pre.map(p=>offsetRing(st,p.x,wt,M));
    const iIn=st.pts.map((p,j)=>rings[j].map(q=>P(p.x,q)));
    const iOut=pre.map((p,j)=>ringsO[j].map(q=>P(p.x,q)));
    for(let j=0;j<st.pts.length-1;j++) for(let i=0;i<M;i++)
      quad(iIn[j][i],iIn[j][(i+1)%M],iIn[j+1][i],iIn[j+1][(i+1)%M]);
    for(let j=0;j<pre.length-1;j++) for(let i=0;i<M;i++)
      quad(iOut[j][(i+1)%M],iOut[j][i],iOut[j+1][(i+1)%M],iOut[j+1][i]);
    const jt=st.pts.length-1, jp=pre.length-1;
    for(let i=0;i<M;i++){
      quad(iIn[jt][(i+1)%M],iIn[jt][i],iOut[jp][(i+1)%M],iOut[jp][i]);      // lip: roll tip -> outer edge
      quad(iIn[0][i],iIn[0][(i+1)%M],iOut[0][i],iOut[0][(i+1)%M]); }        // throat annulus
  }
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
  const Lhm=(S.hornLen!==undefined)? S.hornLen : 0.85*((S.dpW||10)*CM);
  const rSMm=0.60*rCone;
  const rB=rHFm;                                             // ONE HORN: the part starts at the TRUE HF exit
  const rP=Math.hypot(tp[0].tap[1],tp[0].tap[2]);
  let rh=Math.max(0.004,(tp[0].slot&&tp[0].slot.sa)||0.008);
  const N=tp.length, t=S.wallT||0.012;
  const xOf=r=> r<=rSMm? (r-rHFm)/((rSMm-rHFm)/Lhm) : Lhm+(r-rSMm)/Math.tan(th38);   // replaced horn, then the dish face
  /* HIS CORRECTION: the print's BACK takes the SHAPE OF THE DRIVER CONE with an
     x-max gap - it nests directly on the driver, no tube, no floating plate.
     Cone depths from the 6FHX51 CAD: 0.03od at the cone rim, 0.10od at the
     HF-horn mouth ring. Beyond the cone rim the back is the flat flange seat. */
  const gap=((S.xmC||S.xmW||4)/1000)+0.002;
  const coneY=r=>{ const r0=0.60*rCone, r1=0.80*rCone;
    const tq=Math.max(0,Math.min(1,(r1-r)/(r1-r0)));
    return od*(0.03+0.07*tq); };
  const dishBack=r=>{
    if(r<rSMm) return xOf(r)-t*1.25;                         // the internal-horn shell wall
    if(r>=0.80*rCone) return Lhm-0.004;                      // flange seat on the frame
    return Lhm-0.004 - (coneY(r)-od*0.03) + Math.min(gap, coneY(r)-od*0.03); };
  const w0=Math.min(Math.max(rh*1.6,0.012),(rDish-rB)/2*0.6);
  const rIn=Math.max(rB+0.004,rP-w0), rOut=Math.min(rDish-0.004,rP+w0);
  const COLS=12, NA=N*COLS, NRi=5, NRo=5;
  /* the hole must sit strictly inside its patch (else the strip folds);
     the LAW rows carry the true velocity-derived area - if this clamp ever
     bites, the geometry was infeasible and the rows already said so */
  const halfArc=Math.PI*rP/N, halfBand=Math.min(rP-rIn, rOut-rP);
  rh=Math.min(rh, halfBand*0.75, halfArc*0.6);
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
    /* the hole band: one rect-to-circle patch per tap */
    const bandIn=ring(rIn,back), bandOut=ring(rOut,back);
    for(let k=0;k<N;k++){
      const phC=tp[k].phi, j0=k*COLS;
      const loop=[];
      for(let j=0;j<=COLS;j++) loop.push(bandIn[(j0+j)%NA]);                  // bottom, left->right
      for(let j=COLS;j>=0;j--) loop.push(bandOut[(j0+j)%NA]);                 // top, right->left
      const Mloop=loop.length;
      const circ=[];
      for(const li of loop){ const p=pos[li];
        const rr=Math.hypot(p[1],p[2]), ph=Math.atan2(p[2],p[1]);
        const u=(((ph-phC+Math.PI*3)%(2*Math.PI))-Math.PI)*rP, v=rr-rP;       // local coords on the face
        const dl=Math.hypot(u,v)||1e-9;
        const cu=u/dl*rh, cv=v/dl*rh;                                          // RADIAL projection onto the hole circle
        circ.push(F(rP+cv, phC+cu/rP, back));
      }
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
  const ev=evaluate(S);
  const pos=[], tri=[];
  const P=(p)=>{ pos.push(p); return pos.length-1; };
  for(const d of ev.layout){
    if(d.kind!=='woof'&&d.kind!=='mid') continue;
    if(!d.slot||!d.flowU||!d.crossV) continue;
    const n=d.normal, u=d.onCh?d.crossV:d.flowU, v=d.onCh?d.flowU:d.crossV;   // corner boards: long axis ALONG the board
    const np=d.slot.np||1;
    for(let kp=0;kp<np;kp++){
      const sgn=(kp===0?-1:1);
      let ua=u, va=v;
      if(np>=2){ const c=Math.SQRT1_2;
        ua=[ (u[0]+sgn*v[0])*c, (u[1]+sgn*v[1])*c, (u[2]+sgn*v[2])*c ];
        va=[ n[1]*ua[2]-n[2]*ua[1], n[2]*ua[0]-n[0]*ua[2], n[0]*ua[1]-n[1]*ua[0] ]; }
      const off=np>=2? sgn*(d.slot.offm||d.od*0.24) : 0;
      const c0=[ d.tap[0]+v[0]*off, d.tap[1]+v[1]*off, d.tap[2]+v[2]*off ];
      const sa=d.slot.sa, sb=d.slot.sb, K=24;
      /* stadium outline in (ua,va): straights at ±sb, semicircle ends r=sb */
      const outline=[];
      const cx=Math.max(0,sa-sb);
      for(let i=0;i<=K/2;i++){ const a=-Math.PI/2+Math.PI*i/(K/2); outline.push([cx+sb*Math.cos(a), sb*Math.sin(a)]); }
      for(let i=0;i<=K/2;i++){ const a=Math.PI/2+Math.PI*i/(K/2); outline.push([-cx+sb*Math.cos(a), sb*Math.sin(a)]); }
      const z0=-0.012, z1=(S.wallT||0.012)+0.012;   // past both faces
      const at=(o,z)=>[ c0[0]+ua[0]*o[0]+va[0]*o[1]+n[0]*z,
                        c0[1]+ua[1]*o[0]+va[1]*o[1]+n[1]*z,
                        c0[2]+ua[2]*o[0]+va[2]*o[1]+n[2]*z ];
      const NB=outline.length;
      /* 45-deg FRUSTUM on the horn side (v1.4 + Waslo canon: kills chuffing,
         halves effective Lpt) - the cutter widens by wallT/2 toward the horn */
      const fr=(S.wallT||0.012)/2;
      const grow=o=>{ const l=Math.hypot(o[0],o[1])||1e-9; return [o[0]*(1+fr/l), o[1]*(1+fr/l)]; };
      const bot=outline.map(o=>P(at(grow(o),z0))), top=outline.map(o=>P(at(o,z1)));
      for(let i=0;i<NB;i++){ const j=(i+1)%NB;
        tri.push([bot[i],top[i],bot[j]],[bot[j],top[i],top[j]]); }
      const cB=P(at([0,0],z0)), cT=P(at([0,0],z1));
      for(let i=0;i<NB;i++){ const j=(i+1)%NB;
        tri.push([cB,bot[j],bot[i]],[cT,top[i],top[j]]); }
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
  const W5 ={wPre:'w5',   odW:13.2,dpW:7,   sdW:85, vtcW:35, xmW:4.5};
  const W65={wPre:'w65',  odW:16.7,dpW:8.5, sdW:132,vtcW:45, xmW:5};
  const W8 ={wPre:'w8',   odW:21.0,dpW:10,  sdW:220,vtcW:80, xmW:6.5};
  const W10={wPre:'hpl10',odW:26.1,dpW:12.2,sdW:330,vtcW:130,xmW:8};
  const W12={wPre:'ndl12',odW:31.5,dpW:14,  sdW:522,vtcW:180,xmW:9};
  const C5 ={wPre:'cn5',  odW:14.8,dpW:8,   sdW:75, vtcW:30, xmW:3.5};
  const C65={wPre:'fhx65',odW:16.7,dpW:12,  sdW:137,vtcW:40, xmW:4};
  const M4 ={mPre:'m4',   odM:10.3,dpM:6.5, sdM:50, vtcM:40, xmM:3};
  const CXU={sdC:150,vtcC:60,xmC:4,coaxTaps:6,odC:0.22,dpC:0.11};
  return {
   '1way':[
    {key:'fhx6',   name:'B&C 6FHX51 — one-horn square classic · 70°×70°', expectWarns:1,
     s:{...B,...M4, topo:'1way',style:'angular',seN:12,covH:70,covV:70,mouthW:17,nW:2,nM:4,coaxTaps:4,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:20.1,recXO:2500,odC:0.187,dpC:0.122,
        wPre:'fhx6',odW:18.7,dpW:12.2,sdW:132,vtcW:35,xmW:3.5, sdC:132,vtcC:35,xmC:3.5}},
    {key:'refd',   name:'Reference D mini — 5″ coax unit · 70°×70° (floors unverified)', expectWarns:1,
     s:{...B,...M4, topo:'1way',style:'angular',seN:12,covH:70,covV:70,mouthW:14,nW:2,nM:4,coaxTaps:4,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:20.1,recXO:0,odC:0.148,dpC:0.08,
        wPre:'cx5',odW:14.8,dpW:8,sdW:75,vtcW:30,xmW:3.5, sdC:75,vtcC:30,xmC:3.5}},
    {key:'fhx12',  name:'B&C 12FHX76 — one-horn point source · 90°×60°', expectWarns:1,
     s:{...B,...M4, topo:'1way',seN:6, covH:90,covV:60,mouthW:30,nW:2,nM:4,coaxTaps:6,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:33,recXO:1200,odC:0.315,dpC:0.169,
        wPre:'fhx12',odW:31.5,dpW:16.9,sdW:522,vtcW:150,xmW:4.25, sdC:522,vtcC:150,xmC:4.25}},
    {key:'fhx15',  name:'B&C 15FHX76 — one-horn round · 60°×60°', expectWarns:1,
     s:{...B,...M4, topo:'1way',seN:2, covH:60,covV:60,mouthW:34,nW:2,nM:4,coaxTaps:6,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:33,recXO:1200,odC:0.393,dpC:0.199,
        wPre:'fhx15',odW:39.3,dpW:19.9,sdW:855,vtcW:250,xmW:4.25, sdC:855,vtcC:250,xmC:4.25}},
   ],
   '2way':[
    {key:'jmod',      name:'JMOD-class — 90°×60° · 2×12″ on the DCX coax (JW Sound manual)',
     s:{...B,...CDX,...W12,...M4, topo:'2way',seN:6, covH:90,covV:60,mouthW:30,nW:2,nM:4}},
    {key:'canon9060', name:'house canon — 90°×60° · 4×6.5″ on the DCX coax',
     s:{...B,...CDX,...W65,...M4, topo:'2way',seN:6, covH:90,covV:60,mouthW:24,nW:4,nM:4}},
    {key:'compact',   name:'compact synergy — 90°×60° · 4×5.25″',
     s:{...B,...CDX,...W5,...M4,  topo:'2way',seN:6, covH:90,covV:60,mouthW:24,nW:4,nM:4}},
    {key:'square',    name:'square-format — 90°×60° · 4×8″',
     s:{...B,...CDX,...W8,...M4,  topo:'2way',seN:12,covH:90,covV:60,mouthW:24,nW:4,nM:4}},
    {key:'tall',      name:'tall — 60°×90° · 4×5.25″',
     s:{...B,...CDX,...W5,...M4,  topo:'2way',seN:6, covH:60,covV:90,mouthW:24,nW:4,nM:4}},
    {key:'angular',   name:'classic angular (Waslo) — 90°×60° · 4×5.25″',
     s:{...B,...CDX,...W5,...M4,  topo:'2way',style:'angular',seN:12,covH:90,covV:60,mouthW:24,nW:4,nM:4}},
   ],
   '3way':[
    {key:'sh96',      name:'SH96-class — corner boards · 4×15″ + 6 mids (ruling B)',
     expectWarns:1,   // the one canon compromise left: entry ~1.0λ (corner boards fixed the spread)
     s:{...B,...CDX, topo:'3way',style:'angular',seN:12,covH:90,covV:60,mouthW:58,nW:4,nM:6,fxLo:250,placeW:'chamfer',
        wPre:'w15',odW:39,dpW:17,sdW:855,vtcW:320,xmW:10, mPre:'m3',odM:9.3,dpM:6.2,sdM:31,vtcM:25,xmM:2.5}},
    {key:'sh50',      name:'SH50-class — 70°×70° square · 4×10″ + 4 mids',
     s:{...B,...CDX,...W10,...M4, topo:'3way',seN:12,covH:70,covV:70,mouthW:24,nW:4,nM:4,fxLo:250}},
    {key:'classic',   name:'classic — 90°×60° · 4×10″ + 4 mids',
     s:{...B,...CDX,...W10,...M4, topo:'3way',seN:6, covH:90,covV:60,mouthW:27,nW:4,nM:4,fxLo:250}},
    {key:'angular',   name:'classic angular — 70°×70° · 4×10″ + 4 mids',
     s:{...B,...CDX,...W10,...M4, topo:'3way',style:'angular',seN:12,covH:70,covV:70,mouthW:33,nW:4,nM:4,fxLo:250}},
   ],
  };
})();

return {C,IN,CM, sePoint,seRing, profile, stations, dimsAt, surfPt, surfN, layout, evaluate, solve, response, areaAt, facetsAt, facetN, offsetRing, offsetVerts, BUILDS, shellMesh, dishMesh, tapCutters, panelLayout, stlBytes};
})();
if(typeof module!=='undefined') module.exports=MEH2;
