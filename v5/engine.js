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
    const rP=(S.coaxRing||4.5)*CM+0.03;
    const thA=d2r(38);
    const La=Math.max(0.01,(rP-ht)/Math.tan(thA));
    const D2=Math.max(0.05,(hm-rP)/Math.tan(th));
    const depth=La+D2, pts=[];
    for(let i=0;i<=8;i++){ const x=La*i/8; pts.push({x, h:ht+Math.tan(thA)*x}); }
    for(let j=1;j<=40;j++){ const t=j/40, x=La+D2*t, s=t*t*(3-2*t);
      pts.push({x, h:rP+(hm-rP)*(0.72*t+0.28*s)}); }
    const rollR=S.rollR*IN, M2=10;
    const hEnd=pts[pts.length-1].h, sl=(pts[pts.length-1].h-pts[pts.length-2].h)/(pts[pts.length-1].x-pts[pts.length-2].x);
    const a0=Math.atan(sl);
    for(let i=1;i<=M2;i++){ const a=a0+(Math.PI/2-a0)*(i/M2)*0.9;
      pts.push({x:depth+rollR*(Math.sin(a)-Math.sin(a0)), h:hEnd+rollR*((1-Math.cos(a))-(1-Math.cos(a0))), roll:true}); }
    return {pts, depth, rollR, mouthH:hm, xAdapter:La};
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
           pts:pr.pts.map(p=>({x:p.x, a:p.h, b:(p.v!==undefined)?p.v:p.h*ar, roll:p.roll, n:morph(p.x)})),
           depth:pr.depth, rollR:pr.rollR, throat:S.throat*IN/2, ar, xBreak:pr.xBreak, slopeCos:pr.slopeCos, xAdapter:pr.xAdapter };
}
function dimsAt(st,x){
  const P=st.pts;
  if(x<=P[0].x) return {a:P[0].a,b:P[0].b};
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
function offsetRing(st,x,wt,M){
  if(st.style!=='angular'){ const d=dimsAt(st,x); return seRing(d.a+wt,d.b+wt,st.n,M,st.style); }
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
  const seatW=S.odW*CM/2+0.011, seatM=S.odM*CM/2+0.011;
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
  /* mids position RELATIVE to the woofers (the matrix, pin #15):
     2 mids -> the axis PERPENDICULAR to the woofer line; 4 mids beside axis or
     row woofers -> DIAG corner diamond (Hinson: "you see them in the corners";
     on CLASSIC ANGULAR the 45-deg chamfer boards ARE those corners - v4 canon);
     otherwise the coverage rows (Waslo widened-#2-panel canon). */
  const nMn=((S.nM|0)||4);
  const modeM = nMn<=2 ? (modeW==='pairsV'?'pairsH':'pairsV')
              : (ratio>=1.25)? 'pairsH' : (ratio<=0.8)? 'pairsV'          // wide/tall: rows (the diamond's vertical pairs collapse on non-square throats)
              : (nMn===4 && modeW!=='ring')? 'diag' : 'ring';             // SQUARE-regime 4-mid diamond (SH50 canon; chamfer boards on angular)
  S.dialectM=modeM;
  const xM0=xForSeats(st,(S.nM|0)||4,seatM,0.012,modeM,0);
  /* woofers start just past the mids and clear them by MEASUREMENT, not by a
     radii-sum heuristic (2x12in horns were being pushed to the mouth - pin #14 era) */
  const obsM=(S.topo==='3way'&&xM0!=null)?
    seatsFor(st,xM0,(S.nM|0)||4,modeM,0,seatM).map(q=>({p:[xM0,q[0],q[1]], r:seatM})) : null;
  const xW0=xForSeats(st,(S.nW|0)||2,seatW,(S.topo==='3way'&&xM0!=null)?(xM0+0.01):0.02,modeW,offW,obsM);
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
  /* seats at uniform ARC positions (uniform azimuth bunches on flattened superellipses) */
  const placeRing=(kind,x,nSeats,od,dp,arcOffset,mode)=>{
    for(const q of seatsFor(st,x,nSeats,mode||'ring',arcOffset||0,od/2+0.011)){
      const p=[x,q[0],q[1]];
      const nrm=(q.facet!==undefined)? facetN(st,x,q.facet)
              : surfN(st,x,(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]));   // ONE proven normal path per style
      const drv={kind, x, phi:Math.atan2(q[1],q[0]), center:p, normal:nrm, od, dp, tap:p, seatR:od/2+0.011, facet:q.facet};
      if(S.mount==='axial') drv.mountN=[-1,0,0];               // pin #5: spot-face land - body axis parallel to the horn axis
      out.push(drv);
    }
  };
  if(S.topo!=='1way' && xW!=null){
    const seats=seatsFor(st,xW,(S.nW|0)||2,modeW,offW,seatW);
    for(const q of seats){
      const p=[xW,q[0],q[1]];
      const nrm=(q.facet!==undefined)? facetN(st,xW,q.facet)
              : surfN(st,xW,(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]));   // PROVEN normal per style
      const drv={kind:'woof', x:xW, phi:Math.atan2(q[1],q[0]), center:p, normal:nrm,
        od:S.odW*CM, dp:S.dpW*CM, tap:p, seatR:S.odW*CM/2+0.011, facet:q.facet};
      if(S.mount==='axial') drv.mountN=[-1,0,0];               // pin #5: spot-face land
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
    const xT=(st.xAdapter||0.02)*0.85;                        // PIN #21: slots ring the ADAPTER wall
    const taps=[]; let rMax=0;
    for(let k=0;k<nT;k++){ const a2=(k+0.5)/nT*2*Math.PI;
      const p=surfPt(st,xT,a2); taps.push([a2,p]); rMax=Math.max(rMax,Math.hypot(p[1],p[2])); }
    const Ls=Math.hypot(xT, rMax-S.throat*IN/2);              // WORST tap's slant along the adapter wall
    const fxCo=Math.round((1/1.2)*C/(4*(Ls+S.cdDepth*IN)));   // coax XO 1.2x below the tap-path null (v4 law)
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
  const add=(sec,name,val,ok,warn,why)=>out.rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why});
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
    for(const d of drs){ const apP=ap/(np||1);              // pin #19: area split across the ports
      const saM=Math.sqrt(apP*1e-4*3)/2, sbM=Math.sqrt(apP*1e-4/3)/2;
      d.slot={sa:saM, sb:sbM, ap:ap, np:np||1}; }
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
      if(mx>0){ lptEff=lpt + 0.7*(((drs[0].seatR)||0.05))*mx; landed=true; }
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
        'patent: enter where the horn is \u22641 wavelength around at the band top ('+fx+' Hz)');
      const tf=(drs.length*ap*1e-4)/Astn, tfOK=kind==='mid'?0.20:0.50, tfWarn=kind==='mid'?0.30:0.70;
      add(K,'Taps vs horn area at station',(tf*100).toFixed(0)+'%',
        tf<=tfOK, tf<=tfWarn,
        kind==='mid'?'practice: \u226420% protects the HF wavefront (patent ideal is full area match - the tension is the design)':'far from the throat the wavefront tolerates more; CoSyne measured clean at 43%');
      let spread=0;
      for(let i=0;i<drs.length;i++)for(let j=i+1;j<drs.length;j++){
        const a2=drs[i].tap,b2=drs[j].tap;
        spread=Math.max(spread,Math.hypot(a2[0]-b2[0],a2[1]-b2[1],a2[2]-b2[2])); }
      if(drs.length>1){ const sLam=spread/(lam/4);
        const okS=kind==='mid'?1.0:1.5, wnS=kind==='mid'?1.2:2.0;   // v4 canon: strict for mids; SH96 woofer taps measure ~1.5x
        add(K,'Any-pair tap spacing (radiate as one driver)',(spread*1000).toFixed(0)+' mm = '+sLam.toFixed(2)+'\u00d7\u03bb/4',
          sLam<=okS, sLam<=wnS,
          kind==='mid'?'Waslo/Hinson: every mid tap within \u03bb/4 of every other at '+fx+' Hz, or they stop summing as one source'
                      :'woofer sections tolerate more spread (SH96 canon ~1.5\u00d7\u03bb/4 at its XO); past 2\u00d7 the section combs'); }
      const coneD=2*Math.sqrt(sd*1e-4/Math.PI)/((np||1)>=2?2:1), fCone=C/(2*coneD);
      add(K,'Cone dia vs \u03bb/2 at band top',Math.round(fCone)+' Hz max',
        fCone>=fx, fCone>=0.85*fx,
        (np>=2?'TWO straddling ports halve the worst cone path (v4 law) - null pushed up an octave; ':'')+'path spread across the cone cancels above c/(2\u00b7D); a second straddling port would buy an octave');
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
      const fNull=C/(4*(rT+S.cdDepth*IN));
      add('COAX','\u03bb/4 reflection null vs crossover',Math.round(fNull)+' vs '+fx+' Hz',
        fNull>=1.19*fx, fNull>=fx,'derived XO builds the 1.2\u00d7 margin in');
      const ap=taps[0].slot?taps[0].slot.ap:0, vtc=(S.vtcC||60);
      if(ap>0){ const lpt=(S.wallT||0.012)+0.85*Math.sqrt(ap*1e-4/Math.PI);
        const fLP=C/(2*Math.PI)*Math.sqrt((taps.length*ap*1e-4)/((vtc*1e-6)*lpt));
        add('COAX','Chamber acoustic low-pass',Math.round(fLP)+' Hz',fLP>=1.2*fx,fLP>=fx,'coax front chamber + plate slots must clear the crossover'); }
    }
  }
  /* PIN #16 (M4 down payment): Keele pattern-control floors per plane -
     wnom = kk/(theta*Fc), kk = 25306 Hz*deg*m (Synergy Calc sheet). Below these
     frequencies the wall angle stops steering and the pattern widens toward omni. */
  if(st){ const KK=25306, mo=st.pts[st.pts.length-1];
    const FcH=Math.round(KK/(S.covH*Math.max(0.05,2*mo.a)));
    const FcV=Math.round(KK/(S.covV*Math.max(0.05,2*mo.b)));
    add('PATTERN','Coverage control holds down to (H / V)',FcH+' / '+FcV+' Hz',true,true,
      'Keele: mouth = 25306/(angle*Fc). Wider angle OR bigger mouth -> control lower. The classic shapes (90x60, 110x70...) are this trade struck at equal H/V floors');
  }
  /* XO ceilings: CD reach (by exit size) and mid reach */
  if(S.fxDerived){
    const cdReach=S.cdFloor||(S.td>=1.35?550:S.td>=0.95?900:1200);   // coax CDs (DCX464) reach ~300
    const top=(S.topo==='3way'?S.fxDerived.hi:S.fxDerived.lo);
    if(top) add('XO','CD reaches the derived crossover',top+' vs '+cdReach+' Hz floor',top>=cdReach*0.9,top>=cdReach*0.75,'a '+S.td+'\u2033 exit CD wants to cross at or above its floor');
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
  const add=(sec,name,val,ok,warn,why)=>rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why});
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
  add('LAW','Seats clear each other',(worst*1000).toFixed(0)+' mm', worst>=0.006, worst>=0,'printed seats must not merge');
  add('LAW','Every ring fits inside the horn', L.missing?'NO':'yes', !L.missing, false,'drivers sit at the smallest station whose ring hosts them; if none exists the horn grows');
  if(S.fxDerived&&S.fxDerived.lo)
    add('XO','Derived crossover (from landed geometry)', (S.topo==='3way'? S.fxDerived.hi+' / ':'')+S.fxDerived.lo+' Hz',
      (S.fxDerived.lo<= (S.topo==='3way'?S.fxLo:S.fxHi)*1.35), true, 'XO falls out of the path length; ceiling from the driver choice');
  const ac=acoustics(S,L,st); rows.push(...ac.rows);
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
    if(!ev.fails) return {S, ev, grown:S.mouthW-S0.mouthW};
    S.mouthW=+(S.mouthW+1).toFixed(2);
    if(S.mouthW>S0.mouthCap) {
      const evC=evaluate(S);
      return {S, ev:evC, grown:S.mouthW-S0.mouthW, infeasible:true};
    }
  }
  return {S, ev:evaluate(S), infeasible:true};
}

return {C,IN,CM, sePoint,seRing, profile, stations, dimsAt, surfPt, surfN, layout, evaluate, solve, response, areaAt, facetsAt, facetN, offsetRing};
})();
if(typeof module!=='undefined') module.exports=MEH2;
