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
function seRing(a,b,n,M){
  if(typeof S!=='undefined'&&S&&S.style==='angular') return panelRing(a,b,n,M);
  const raw=[]; let L=0;
  for(let i=0;i<=M*4;i++){ raw.push(sePoint(a,b,n,i/(M*4)*2*Math.PI)); }
  const seg=[0]; for(let i=1;i<raw.length;i++){ L+=Math.hypot(raw[i][0]-raw[i-1][0],raw[i][1]-raw[i-1][1]); seg.push(L); }
  const out=[]; let j=0;
  for(let i=0;i<M;i++){ const t=i/M*L;
    while(seg[j+1]<t && j<seg.length-2) j++;
    const f=(t-seg[j])/((seg[j+1]-seg[j])||1e-9);
    out.push([raw[j][0]+(raw[j+1][0]-raw[j][0])*f, raw[j][1]+(raw[j+1][1]-raw[j][1])*f]);
  }
  return out;
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
  const depth=Math.max(0.06,(hm-ht)/Math.tan(th));
  const rollR=(S.style==='angular'? Math.min(S.rollR,0.75) : S.rollR)*IN;   // angular keeps a printable bevel, not a donut
  const N=48, pts=[];
  for(let i=0;i<=N;i++){ const t=i/N, x=t*depth;
    const s=t*t*(3-2*t);                        // smoothstep: zero slope at throat, eases to mouth
    const lin=ht+(hm-ht)*t;
    const eased=(S.style==='angular')? lin                    // CLASSIC ANGULAR: pure straight cone (his call - the classic look, printed)
               : ht+(hm-ht)*(0.72*t+0.28*s);     // smooth: mostly conical (pattern control) + eased ends
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
  return { form:'se', n:S.seN, pts:pr.pts.map(p=>({x:p.x, a:p.h, b:p.h*ar, roll:p.roll})),
           depth:pr.depth, rollR:pr.rollR, throat:S.throat*IN/2, ar };
}
function dimsAt(st,x){
  const P=st.pts;
  if(x<=P[0].x) return {a:P[0].a,b:P[0].b};
  for(let i=1;i<P.length;i++){ if(P[i].x>=x){ const f=(x-P[i-1].x)/((P[i].x-P[i-1].x)||1e-9);
    return {a:P[i-1].a+(P[i].a-P[i-1].a)*f, b:P[i-1].b+(P[i].b-P[i-1].b)*f}; } }
  return {a:P[P.length-1].a,b:P[P.length-1].b};
}
/* surface point + outward normal at station x, azimuth phi */
function surfPt(st,x,phi){ const d=dimsAt(st,x); const [y,z]=sePoint(d.a,d.b,st.n,phi); return [x,y,z]; }
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
  const d=dimsAt(st,x), ring=seRing(d.a,d.b,st.n,64);
  let L=0; for(let i=0;i<ring.length;i++){ const j=(i+1)%ring.length;
    L+=Math.hypot(ring[j][0]-ring[i][0],ring[j][1]-ring[i][1]); }
  return L;
}
/* smallest station whose PLACED ring truly clears: equal-arc seats, measured chords.
   No heuristic factors - construct the candidate and measure it (v5 discipline). */
function ringSeats(st,x,n,K,off){
  const d=dimsAt(st,x), ring=seRing(d.a,d.b,st.n,K);
  const o=Math.round((off||0)*K);
  const out=[]; for(let k=0;k<n;k++) out.push(ring[(Math.round(k*K/n)+o)%K]);
  return out;
}
function xForRing(st,n,seatR,xMin,off){
  const K=n*48, xMax=st.depth*0.84;   // seats stay OFF the mouth-roll curvature (his v5 rim-clip observation)
  for(let x=xMin;x<=xMax;x+=st.depth/128){
    const seats=ringSeats(st,x,n,K,off);
    let ok=true;
    for(let k=0;k<n;k++){ const a2=seats[k], b2=seats[(k+1)%n];
      if(Math.hypot(a2[0]-b2[0],a2[1]-b2[1]) < 2*seatR+0.008){ ok=false; break; } }
    if(ok) return x;
  }
  return null;                                  // does not fit anywhere - horn must grow
}
function layout(S,st){
  const out=[];
  /* GEOMETRY FIRST, XO DERIVED (v4 coax2 canon, now universal):
     drivers sit at the smallest station whose ring fits them; the crossover
     falls out of the path length. fxHi/fxLo become CEILINGS to respect. */
  const seatW=S.odW*CM/2+0.011, seatM=S.odM*CM/2+0.011;
  const offW=0;   // no stagger by default; a cross-ring law may reintroduce it WITH the verifier knowing
  const xM0=xForRing(st,(S.nM|0)||4,seatM,0.012,0);
  const xW0=xForRing(st,(S.nW|0)||2,seatW,(S.topo==='3way'&&xM0!=null)?(xM0+seatM+seatW+0.008):0.02,offW);
  const xM=xM0, xW=xW0;
  S.fxDerived={ hi: xM!=null? Math.round(C/(4*((S.topo==='3way'?xM:xW||st.depth)+S.cdDepth*IN))) : null,
                lo: xW!=null? Math.round(C/(4*(xW+S.cdDepth*IN))) : null };
  const place=(kind,x,phi,od,dp)=>{
    const p=surfPt(st,x,phi), n=surfN(st,x,phi);
    out.push({kind, x, phi, center:p, normal:n, od, dp,
      tap:p,                                    // PRINTED LAW: the tap IS under the driver
      seatR:od/2+0.011});
  };
  /* seats at uniform ARC positions (uniform azimuth bunches on flattened superellipses) */
  const placeRing=(kind,x,nSeats,od,dp,arcOffset)=>{
    /* EXACT ring points (sePoint's phi is a PARAMETER, not azimuth - round-tripping
       through atan2 re-bunches seats; found by trace). Normals numerically. */
    const K=nSeats*48, d0=dimsAt(st,x);
    const e=Math.max(1e-4,st.depth*2e-3), d1=dimsAt(st,Math.min(st.depth,x+e));
    const ring=ringSeats(st,x,nSeats,K,arcOffset||0);
    const full=seRing(d0.a,d0.b,st.n,K);
    for(let k=0;k<nSeats;k++){
      const q=ring[k], p=[x,q[0],q[1]];
      /* axial tangent: affine per-axis scale to the next station */
      const u=[e, q[0]*(d1.a/d0.a-1), q[1]*(d1.b/d0.b-1)];
      /* tangential: neighbor along the full-resolution ring */
      const ki=(Math.round(k*K/nSeats)+Math.round((arcOffset||0)*K))%K;
      const qn=full[(ki+1)%K], qp=full[(ki-1+K)%K];
      const v=[0, qn[0]-qp[0], qn[1]-qp[1]];
      let nrm=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
      const L2=Math.hypot(nrm[0],nrm[1],nrm[2])||1e-9; nrm=nrm.map(c=>c/L2);
      if(nrm[1]*p[1]+nrm[2]*p[2]<0) nrm=nrm.map(c=>-c);
      out.push({kind, x, phi:Math.atan2(q[1],q[0]), center:p, normal:nrm, od, dp, tap:p, seatR:od/2+0.011});
    }
  };
  if(S.topo!=='1way' && xW!=null) placeRing('woof', xW, (S.nW|0)||2, S.odW*CM, S.dpW*CM, offW);
  if(S.topo==='3way' && xM!=null) placeRing('mid', xM, (S.nM|0)||4, S.odM*CM, S.dpM*CM, 0);
  if(S.topo!=='1way' && xW==null) out.missing=true;
  if(S.topo==='3way' && xM==null) out.missing=true;
  if(S.topo==='1way'){
    /* coax: ring of cone taps in the apex insert around the CD bore */
    const nT=6, rT=Math.max(S.td*IN*0.5+0.012, S.coaxRing*CM);
    for(let k=0;k<nT;k++){ const a=k/nT*2*Math.PI;
      out.push({kind:'coaxtap', x:0.004, phi:a, center:[0.004, rT*Math.cos(a), rT*Math.sin(a)],
        normal:[-1,0,0], od:0.02, dp:0, tap:[0.004, rT*Math.cos(a), rT*Math.sin(a)], seatR:0.011}); }
  }
  return out;
}

/* ---- ACOUSTIC LAWS (ported from v4's sourced corpus) ----
   CR bands (Waslo calc sheet): mids 4..8:1, woofers 2.5..6:1 - Ap auto-derived
   from Sd at the band center. Port velocity cap 17 m/s (corpus). Front chamber
   Vtc + tap = Helmholtz low-pass; must clear the derived XO by 1.2x. Slot canon:
   slim 3:1 stadium, area exactly Ap/driver. */
function acoustics(S,L){
  const out={rows:[]};
  const add=(sec,name,val,ok,warn,why)=>out.rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why});
  const kinds=[];
  /* v4 SOURCED LAW (compendium): peak port velocity = CR * 2pi * fLOW * xm at the
     BAND'S LOW EDGE (woofers run to the sub XO ~80 Hz; mids to their lower XO).
     Ap derives FROM the 17 m/s limit, clamped into the CR band (w 2.5-6, m 4-8). */
  if(S.topo!=='1way') kinds.push(['woof', S.sdW||300, S.vtcW||150, S.xmW||7, [2.5,6.0], S.subXO||80, S.fxDerived&&S.fxDerived.lo]);
  if(S.topo==='3way') kinds.push(['mid', S.sdM||50, S.vtcM||40, S.xmM||3, [4.0,8.0], S.fxDerived&&S.fxDerived.lo, S.fxDerived&&S.fxDerived.hi]);
  for(const [kind,sd,vtc,xm,band,fLow,fx] of kinds){
    const drs=L.filter(d=>d.kind===kind); if(!drs.length||!fx||!fLow) continue;
    const crVel=17/(2*Math.PI*fLow*(xm/1000));           // CR the velocity limit allows
    const cr=Math.max(band[0], Math.min(band[1], crVel));
    const ap=sd/cr;                                      // cm^2 per driver
    for(const d of drs){ const saM=Math.sqrt(ap*1e-4*3)/2, sbM=Math.sqrt(ap*1e-4/3)/2;
      d.slot={sa:saM, sb:sbM, ap:ap}; }
    add(kind.toUpperCase(),'Compression ratio Sd/Ap',cr.toFixed(1)+':1',
      crVel>=band[0], crVel>=band[0]*0.8,
      crVel<band[0]?'the 17 m/s velocity limit wants CR below the compression band - the driver excursion is too large for this duty':'derived from the 17 m/s limit, clamped to the band');
    const vel=cr*2*Math.PI*fLow*(xm/1000);
    add(kind.toUpperCase(),'Port velocity at band low edge ('+fLow+' Hz)',vel.toFixed(1)+' m/s',vel<=17.2,vel<=20,'compendium: the real port-area criterion, evaluated at the band bottom');
    const lpt=0.02;                                      // effective tap length (print wall + end corr) - refine with wall thickness
    const fLP=C/(2*Math.PI)*Math.sqrt((ap*1e-4)/((vtc*1e-6)*lpt));
    add(kind.toUpperCase(),'Chamber acoustic low-pass',Math.round(fLP)+' Hz',fLP>=1.2*fx,fLP>=fx,'Vtc+tap Helmholtz must clear the crossover ('+fx+' Hz)');
  }
  /* XO ceilings: CD reach (by exit size) and mid reach */
  if(S.fxDerived){
    const cdReach=S.td>=1.35?550:S.td>=0.95?900:1200;
    const top=(S.topo==='3way'?S.fxDerived.hi:S.fxDerived.lo);
    if(top) add('XO','CD reaches the derived crossover',top+' vs '+cdReach+' Hz floor',top>=cdReach*0.9,top>=cdReach*0.75,'a '+S.td+'\u2033 exit CD wants to cross at or above its floor');
  }
  return out;
}
/* ---- fit & physics checks (carried laws; expanded per rebuild) ---- */
function evaluate(S){
  const st=stations(S), L=layout(S,st), rows=[];
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
  const ac=acoustics(S,L); rows.push(...ac.rows);
  return {st, layout:L, rows, fails:rows.filter(r=>r.st==='fail').length};
}

/* ---- RESPONSE PREVIEW (ported from v4: horn = two-port ladder; each tap section a
   Norton source through chamber compliance + port mass; CD behind its stub; LR4 sum
   at the DERIVED crossovers). Levels are per-section normalized like v4. ---- */
const CX={ add:(x,y)=>[x[0]+y[0],x[1]+y[1]], mul:(x,y)=>[x[0]*y[0]-x[1]*y[1],x[0]*y[1]+x[1]*y[0]],
  div:(x,y)=>{const d=y[0]*y[0]+y[1]*y[1]||1e-30;return [(x[0]*y[0]+x[1]*y[1])/d,(x[1]*y[0]-x[0]*y[1])/d];},
  inv:x=>CX.div([1,0],x), abs:x=>Math.hypot(x[0],x[1]), scale:(x,k)=>[x[0]*k,x[1]*k] };
function areaAt(st,x){
  const d=dimsAt(st,x), ring=seRing(d.a,d.b,st.n,48);
  let A=0; for(let i=0;i<ring.length;i++){ const j=(i+1)%ring.length;
    A+=ring[i][0]*ring[j][1]-ring[j][0]*ring[i][1]; }
  return Math.abs(A)/2;
}
function response(S,ev){
  const st=ev.st, L=ev.layout;
  const hasW=S.topo!=='1way', hasM=S.topo==='3way';
  const fxHi=(S.fxDerived&&S.fxDerived.hi)||900, fxLo=(S.fxDerived&&S.fxDerived.lo)||fxHi;
  const RHO=1.205, NSEG=64, F0=100, F1=16000, NF=120;
  const Ss=[]; for(let i=0;i<=NSEG;i++) Ss.push(Math.max(1e-6,areaAt(st, st.depth*i/NSEG)));
  const segL=st.depth/NSEG;
  const dW=L.find(d=>d.kind==='woof'), dM=L.find(d=>d.kind==='mid');
  const nodeW=hasW&&dW? Math.max(1,Math.round(dW.x/st.depth*NSEG)) : -1;
  const nodeM=hasM&&dM? Math.max(1,Math.round(dM.x/st.depth*NSEG)) : -1;
  const stub={L:Math.max(1e-4,S.cdDepth*IN), Sa:Ss[0]};
  const LPT_CM=1.2;                                    // print wall + seat floor (refined with B-stage geometry)
  const mkBr=(ap,vtc,n)=>{ const Ap=n*ap*1e-4, V=n*vtc*1e-6, r=Math.sqrt(ap*1e-4/Math.PI);
    return {M:RHO*(LPT_CM*1e-2+0.85*r)/Ap, Cc:V/(RHO*C*C)}; };
  const brW=hasW&&dW&&dW.slot? mkBr(dW.slot.ap,S.vtcW||150,(S.nW|0)||2) : null;
  const brM=hasM&&dM&&dM.slot? mkBr(dM.slot.ap,S.vtcM||40,(S.nM|0)||4) : null;
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
    WOOF.push(hasW&&brW?drive(nodeW,brW,'woof'):0);
  }
  const dB=arr=>{const mx=Math.max(1e-30,...arr); return arr.map(v=>20*Math.log10((v||1e-30)/mx));};
  const hf=dB(HF), mid=hasM?dB(MID):null, woof=hasW?dB(WOOF):null;
  const lr4lp=x=>{const H2=CX.div([1,0],[1-x*x,Math.SQRT2*x]);return CX.mul(H2,H2);};
  const lr4hp=x=>{const ix=1/Math.max(1e-9,x);const H2=CX.div([1,0],[1-ix*ix,Math.SQRT2*ix]);return CX.mul(H2,H2);};
  const sum=f.map((fq,i)=>{
    let acc=[0,0];
    const add2=(curve,H)=>{if(!curve)return;acc=CX.add(acc,CX.scale(H,Math.pow(10,curve[i]/20)));};
    add2(hf,lr4hp(fq/fxHi));
    if(hasM) add2(mid,CX.mul(lr4lp(fq/fxHi),lr4hp(fq/fxLo)));
    if(hasW) add2(woof,lr4lp(fq/(hasM?fxLo:fxHi)));
    return 20*Math.log10(CX.abs(acc)+1e-12); });
  return {f,hf,mid,woof,sum,fxHi,fxLo};
}
/* ---- SOLVE: grow the horn until every law passes (throat-invariant growth;
   the v4 principle, clean-roomed). Returns the settled state + evaluation. ---- */
function solve(S0){
  const S={...S0};
  for(let it=0;it<40;it++){
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

return {C,IN,CM, sePoint,seRing, profile, stations, dimsAt, surfPt, surfN, layout, evaluate, solve, response, areaAt};
})();
if(typeof module!=='undefined') module.exports=MEH2;
