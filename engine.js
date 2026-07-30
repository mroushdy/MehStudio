/* MEH STUDIO v5 — PRINT-ONLY ENGINE (ground-up rebuild, Marwan's mandate 2026-07-23)
   Exact smooth cross-sections are either an ellipse or a Lamé
   superellipse(n), swept along the selected meridional profile. n=2 is the
   ellipse identity; larger n values make the Lamé section squarer. Sourced
   physics carried from v4:
   λ/4 tap law, compression/chamber checks, Keele mouth sizing, XO from geometry.
   IMPORTANT: 17 m/s is retained only as a rear-reflex / maximum-SPL diagnostic.
   It is not a universal MEH tap-area law.
   TOPOLOGY: 1way (coax synergy-exit) · 2way (CD+woofers) · 3way (CD+mids+woofers).
   All mounting is PRINTED: apex insert (tap ring around throat bore), facet seats
   (driver over its slot, always), chamber housings for bandpass. No wood anywhere. */
"use strict";
/* profile-laws.js is inlined before this engine in the browser build and
   required directly in Node. One canonical record therefore drives preview,
   layout, exact two-way geometry, export diagnostics, and reports. */
const MEH_PROFILE_LAWS=(
  typeof globalThis!=='undefined'&&globalThis.MEHProfileLaws
    ?globalThis.MEHProfileLaws
    :(typeof require==='function'?require('./profile-laws.js'):null)
);
if(!MEH_PROFILE_LAWS)
  throw new Error('MEH profile-law module must load before engine.js');
const MEH2=(()=>{
const C=344, IN=0.0254, CM=0.01;
const d2r=d=>d*Math.PI/180;
const KEELE_PATTERN_CONSTANT=25306;
function patternControlSizing(input){
  const coverageH=+input.coverageH,coverageV=+input.coverageV,
    targetHz=+input.targetHz,mouthCapIn=+input.mouthCapIn,
    stepIn=Number.isFinite(+input.stepIn)?+input.stepIn:1;
  if(!Number.isFinite(coverageH)||coverageH<=0||coverageH>=180||
      !Number.isFinite(coverageV)||coverageV<=0||coverageV>=180||
      !Number.isFinite(targetHz)||targetHz<=0||
      !Number.isFinite(mouthCapIn)||mouthCapIn<=0||
      !Number.isFinite(stepIn)||stepIn<=0)
    return {ok:false,code:'PATTERN_TARGET_INPUT_INVALID',
      coverageClaim:false,sizingOnly:true,
      reason:'Coverage angles, target frequency, mouth cap and sizing step must be finite positive values.'};
  const aspect=Math.tan(d2r(coverageV/2))/Math.tan(d2r(coverageH/2)),
    horizontalWidthMRaw=KEELE_PATTERN_CONSTANT/(coverageH*targetHz),
    requiredHeightMRaw=KEELE_PATTERN_CONSTANT/(coverageV*targetHz),
    horizontalWidthInRaw=horizontalWidthMRaw/IN,
    requiredHeightInRaw=requiredHeightMRaw/IN,
    verticalWidthInRaw=requiredHeightInRaw/Math.max(1e-12,aspect),
    requiredWidthInRaw=Math.max(horizontalWidthInRaw,verticalWidthInRaw),
    requiredWidthIn=Math.ceil((requiredWidthInRaw-1e-12)/stepIn)*stepIn,
    limitingPlane=Math.abs(horizontalWidthInRaw-verticalWidthInRaw)<1e-9
      ?'H+V':(horizontalWidthInRaw>verticalWidthInRaw?'H':'V'),
    result={coverageH,coverageV,targetHz,aspect,aspectSource:'coverage-derived',horizontalWidthMRaw,
      requiredHeightMRaw,horizontalWidthInRaw,requiredHeightInRaw,
      verticalWidthInRaw,requiredWidthInRaw,requiredWidthIn,limitingPlane,
      mouthCapIn,coverageClaim:false,sizingOnly:true,
      equation:'mouth = 25306 / (included angle × target frequency)'};
  if(requiredWidthIn>mouthCapIn+1e-9)
    return {...result,ok:false,code:'PATTERN_TARGET_EXCEEDS_MOUTH_CAP',
      reason:'The requested per-plane pattern-control sizing requires a mouth wider than the declared mouth cap.'};
  return {...result,ok:true,code:null,
    reason:'Sizing target is geometrically available; directivity still requires BEM or measurement.'};
}

/* ---- BUILD 576: THE TWO-WAY COAX IS AN ARCHITECTURE, NOT A DRIVER RING ----
   These records separate what the supplied/published builds actually establish
   from what still needs a Hornresp/BEM/prototype loop. Geometry copied from a
   reference is never silently called "proven": JMOD's manual is CC BY-NC-ND
   and does not publish its port dimensions; the Hinson paper does publish its
   complete woofer plate, chamber and rear-alignment dimensions. */
const TWO_ARCH={
  opposed:{
    name:'opposed-wall — 2 woofers + central coax CD',
    tier:'published',
    placement:'opposed',
    summary:'Two opposed low-mid drivers feed equal-path racetrack entries around a coaxial compression driver.',
    source:'Scott Hinson, Multiple Entry Horns (2022): conical flare, trapped front volume, two splayed racetrack taps, taps within λ/4.',
    defaults:{nW:2,npW:2,shW:'slot',placeW:'auto',tapBasis:'model',twoXO:500,tapCRW:6,rearAlign:'reflex',rearV:45,rearFb:65}
  },
  jmod:{
    name:'split-flare — JMOD architecture study',
    tier:'published',
    placement:'opposed',
    summary:'Two 12-inch drivers flank a smooth printed coax-CD transition; paired tapered entries and rear vents meet at diagonal seams.',
    source:'JMOD Rev 2.02 (2026): 90×60, 2×12NDL88 + DCX464, Fb 70 Hz. Port profile is documented but numeric CAD dimensions are not published; this tool does not clone the licensed adapter.',
    defaults:{nW:2,npW:2,shW:'teardrop',placeW:'auto',tapBasis:'model',twoXO:300,tapCRW:4,rearAlign:'reflex',rearFb:70}
  },
  distributed:{
    name:'derived equal-path manifold — 4 small woofers',
    tier:'derived',
    placement:'ring',
    summary:'Four small drivers surround the throat and inject through compact equal-path passages; useful when a shallow enclosure matters.',
    source:'Parametric synthesis: all entries share one acoustic station; area derives from Sd/Ap; chamber mass/compliance and λ/4 limits are solved. Reference photos inform packaging only.',
    defaults:{style:'smooth',sectionFamily:'superellipse',sectionLameN:6,seN:6,covH:90,covV:60,mouthW:36,mouthCap:64,
      cdSel:'dcx464',td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4,
      wPre:'w5',odW:13.76,dpW:6.95,sdW:91.6,vtcW:35,xmW:2.5,
      nW:4,npW:1,shW:'slot',placeW:'auto',mount:'flush',
      tapBasis:'model',twoXO:500,tapCRW:6,rearAlign:'reflex',rearFb:75}
  },
  radial4:{
    name:'derived radial four-corner — 4×12 class',
    tier:'derived',
    placement:'diag',
    summary:'Four large drivers occupy the four quadrants around a central coaxial compression driver.',
    source:'Parametric synthesis: four equal-path quadrant stations, calculated total tap area and chamber low-pass. The H2 image is packaging inspiration only, not a dimensional source.',
    defaults:{style:'smooth',sectionFamily:'superellipse',sectionLameN:6,seN:6,covH:90,covV:60,mouthW:44,mouthCap:64,
      cdSel:'dcx464',td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4,
      wPre:'ndl88',odW:31.5,dpW:14,sdW:522,vtcW:180,xmW:8,
      nW:4,npW:2,shW:'slot',placeW:'auto',mount:'flush',
      tapBasis:'model',twoXO:300,tapCRW:5,rearAlign:'external'}
  },
  dualcell:{
    name:'derived compact dual-cavity — 2 opposed drivers',
    tier:'derived',
    placement:'opposed',
    summary:'Two opposed cone pockets and their front chambers are sculpted into one central throat block.',
    source:'Parametric synthesis: two equal-path cone pockets with calculated tap area, front volume and passage length. The CNC photograph establishes construction style only.',
    defaults:{style:'smooth',sectionFamily:'superellipse',sectionLameN:6,seN:6,covH:90,covV:60,mouthW:24,mouthCap:64,
      cdSel:'dcx464',td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4,
      wPre:'w8',odW:22.5,dpW:9,sdW:220,vtcW:80,xmW:7,
      nW:2,npW:2,shW:'slot',placeW:'auto',mount:'flush',
      tapBasis:'model',twoXO:500,tapCRW:5,rearAlign:'sealed'}
  },
  custom:{
    name:'custom adaptive design',
    tier:'derived',
    placement:'opposed',
    summary:'A calculated two-driver starting point that follows the selected drivers; measured geometry overrides become manual automatically.',
    source:'Parametric synthesis: driver envelope, Sd/Ap, chamber low-pass and λ/4 station are solved first. Any entered station/area/passage/chamber dimensions are labeled user measurements.',
    defaults:{style:'smooth',sectionFamily:'superellipse',sectionLameN:6,seN:6,covH:90,covV:60,mouthW:24,mouthCap:64,
      cdSel:'dcx464',td:1.4,throat:1.4,cdFloor:300,cdDepth:2.4,
      wPre:'w8',odW:22.5,dpW:9,sdW:220,vtcW:80,xmW:7,
      nW:2,npW:2,shW:'slot',placeW:'auto',mount:'flush',
      tapBasis:'model',twoXO:500,tapCRW:5,rearAlign:'sealed'}
  }
};
function twoArch(S){ return TWO_ARCH[S.twoArch]||TWO_ARCH.opposed; }

/* Cross-section topology is independent of the horn's meridional profile law.
   Every admitted family owns one boundary definition which is shared by
   stations, normals, placement, preview and export.  In particular, a
   filleted rectangle is NOT a high-exponent Lamé curve: it has exact straight
   sides joined to exact circular corner arcs, and a normal offset increments
   its two half-extents and its corner radius by the same amount. */
const SECTION_FAMILY_SCHEMAS=Object.freeze({
  ellipse:Object.freeze({
    family:'ellipse',
    label:'Ellipse',
    supported:true,
    parameter:null,
    description:'Elliptical section; a circle only when both half-axes are equal.'
  }),
  superellipse:Object.freeze({
    family:'superellipse',
    label:'Lamé superellipse',
    supported:true,
    parameter:'seN',
    description:'|y/a|^n + |z/b|^n = 1 with n from 2 to 12.'
  }),
  roundedRectangle:Object.freeze({
    family:'roundedRectangle',
    label:'Filleted rectangle',
    supported:true,
    parameter:'sectionCornerRatio',
    parameterLabel:'Corner roundness R / min(a,b)',
    parameterBounds:Object.freeze([0.05,1]),
    description:'Exact straight sides and circular corner arcs; R/min(a,b) morphs monotonically from the circular throat to the selected mouth value.'
  })
});
/* Four sharp rectangular seams with one-axis curvature on each face.  This is
   a wall/construction topology, not another smooth cross-section family.  The
   selected admitted meridian still owns a(x), b(x) and the profile hash. */
const CURVED_FACET_SCHEMA=Object.freeze({
  style:'curvedFacets',
  label:'Developable curved facets',
  seamCount:4,
  developable:true,
  gaussianCurvature:'zero away from seams',
  manufacture:'single-axis forming or printing',
  acousticClaim:false
});
function sectionFamilySchema(family){
  return SECTION_FAMILY_SCHEMAS[family]||null;
}
function effectiveSectionExponent(S){
  const raw=Math.max(2,Math.min(12,
    Number.isFinite(+S.seN)?+S.seN:6));
  /* Classic angular and curved-facet construction are both four-face
     rectangular topologies.  Lamé exponent belongs only to a smooth
     superellipse; allowing it to leak into an angular state used to create
     four extra diagonal corner boards (or an 8–18 face barrel) behind a
     control that looked like harmless curvature. */
  if(S.style==='angular')return 12;
  if(S.style==='curvedFacets')return 12;
  const family=sectionFamilySchema(S.sectionFamily||'superellipse');
  if(!family||!family.supported)return raw;
  return family.family==='ellipse'?2:raw;
}

const CARDINAL_TRIG_EPS=1e-12;
function snappedTrig(phi){
  let c=Math.cos(phi),s=Math.sin(phi);
  if(Math.abs(c)<CARDINAL_TRIG_EPS)c=0;
  else if(Math.abs(Math.abs(c)-1)<CARDINAL_TRIG_EPS)c=Math.sign(c);
  if(Math.abs(s)<CARDINAL_TRIG_EPS)s=0;
  else if(Math.abs(Math.abs(s)-1)<CARDINAL_TRIG_EPS)s=Math.sign(s);
  return [c,s];
}
function normalizedPhi(phi){
  const t=phi%(2*Math.PI);
  return t<0?t+2*Math.PI:t;
}

/* ---- superellipse cross-section: |y/a|^n + |z/b|^n = 1 ---- */
function sePoint(a,b,n,phi){
  const [c,s]=snappedTrig(phi);
  const y=a*Math.sign(c)*Math.pow(Math.abs(c),2/n);
  const z=b*Math.sign(s)*Math.pow(Math.abs(s),2/n);
  return [y,z];
}

/* Exact sharp rectangle used only by CURVED FACETS.  Parameter zero is the
   midpoint of the right face; the four corners are fixed at odd multiples of
   pi/4.  Fixed corner parameters make every axial ring share the same four
   seam indices, independent of aspect ratio. */
function curvedRectPoint(a,b,parameter){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  const t=normalizedPhi(parameter),q=Math.PI/4;
  let p;
  if(t<=q)p=[a,b*t/q];
  else if(t<=3*q)p=[a*(1-(t-q)/q),b];
  else if(t<=5*q)p=[-a,b*(1-(t-3*q)/q)];
  else if(t<=7*q)p=[a*((t-5*q)/q-1),-b];
  else p=[a,b*((t-7*q)/q-1)];
  p.param=t;
  return p;
}
function curvedRectParamFor(a,b,y,z){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  const q=Math.PI/4,
    sideGap=Math.abs(Math.abs(y)-a),
    capGap=Math.abs(Math.abs(z)-b);
  if(sideGap<=capGap){
    if(y>=0)return normalizedPhi((z/b)*q);
    return normalizedPhi(Math.PI-(z/b)*q);
  }
  if(z>=0)return normalizedPhi(Math.PI/2-(y/a)*q);
  return normalizedPhi(3*Math.PI/2+(y/a)*q);
}
function curvedRectPolarPoint(a,b,phi){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  const [c,s]=snappedTrig(phi),
    sy=Math.abs(c)>1e-15?a/Math.abs(c):Infinity,
    sz=Math.abs(s)>1e-15?b/Math.abs(s):Infinity,
    scale=Math.min(sy,sz),
    p=[c*scale,s*scale];
  p.param=curvedRectParamFor(a,b,p[0],p[1]);
  return p;
}
function curvedRectRing(a,b,M){
  M=Math.max(8,Math.ceil(M/8)*8);
  const out=[];
  for(let i=0;i<M;i++)out.push(curvedRectPoint(a,b,i/M*2*Math.PI));
  return out;
}
function curvedRectLevel(a,b,y,z){
  return Math.max(Math.abs(y)-Math.abs(a),Math.abs(z)-Math.abs(b));
}

/* ---- exact filleted rectangle: straight sides + circular corner arcs ---- */
function legalCornerRadius(a,b,r){
  const limit=Math.max(1e-12,Math.min(Math.abs(a),Math.abs(b)));
  return Math.max(1e-12,Math.min(limit,
    Number.isFinite(+r)?Math.abs(+r):limit));
}
function roundedRectPoint(a,b,r,phi){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  r=legalCornerRadius(a,b,r);
  const [c,s]=snappedTrig(phi),dx=Math.abs(c),dy=Math.abs(s),
    sx=Math.sign(c),sy=Math.sign(s),cx=a-r,cy=b-r;
  if(dx===0){const p=[0,sy*b];p.param=normalizedPhi(phi);return p;}
  if(dy===0){const p=[sx*a,0];p.param=normalizedPhi(phi);return p;}
  let t;
  if(a*dy/dx<=cy+1e-14)t=a/dx;
  else if(b*dx/dy<=cx+1e-14)t=b/dy;
  else{
    const dc=dx*cx+dy*cy,
      disc=Math.max(0,dc*dc-(cx*cx+cy*cy-r*r));
    t=dc+Math.sqrt(disc);
  }
  const p=[sx*dx*t,sy*dy*t];p.param=normalizedPhi(phi);return p;
}
function roundedRectSdf(a,b,r,y,z){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  r=legalCornerRadius(a,b,r);
  const qx=Math.abs(y)-(a-r),qy=Math.abs(z)-(b-r),
    ox=Math.max(qx,0),oy=Math.max(qy,0);
  return Math.hypot(ox,oy)+Math.min(Math.max(qx,qy),0)-r;
}
function roundedRectPerimeter(a,b,r){
  r=legalCornerRadius(a,b,r);
  return 4*(Math.abs(a)+Math.abs(b)-2*r)+2*Math.PI*r;
}
function roundedRectPerimeterPoint(a,b,r,distance){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  r=legalCornerRadius(a,b,r);
  const arc=Math.PI*r/2,segments=[
    {L:b-r,at:t=>[a,t]},
    {L:arc,at:t=>[a-r+r*Math.cos(t/r),b-r+r*Math.sin(t/r)]},
    {L:2*(a-r),at:t=>[a-r-t,b]},
    {L:arc,at:t=>[-a+r+r*Math.cos(Math.PI/2+t/r),b-r+r*Math.sin(Math.PI/2+t/r)]},
    {L:2*(b-r),at:t=>[-a,b-r-t]},
    {L:arc,at:t=>[-a+r+r*Math.cos(Math.PI+t/r),-b+r+r*Math.sin(Math.PI+t/r)]},
    {L:2*(a-r),at:t=>[-a+r+t,-b]},
    {L:arc,at:t=>[a-r+r*Math.cos(3*Math.PI/2+t/r),-b+r+r*Math.sin(3*Math.PI/2+t/r)]},
    {L:b-r,at:t=>[a,-b+r+t]}
  ];
  const perimeter=roundedRectPerimeter(a,b,r);
  let d=((distance%perimeter)+perimeter)%perimeter;
  for(const segment of segments){
    if(segment.L<=1e-15)continue;
    if(d<=segment.L+1e-15)return segment.at(Math.min(segment.L,d));
    d-=segment.L;
  }
  return [a,0];
}
function roundedRectRing(a,b,r,M){
  const perimeter=roundedRectPerimeter(a,b,r),out=[];
  for(let i=0;i<M;i++){
    const p=roundedRectPerimeterPoint(a,b,r,i/M*perimeter);
    p.param=normalizedPhi(Math.atan2(p[1],p[0]));
    p.arcParam=i/M*2*Math.PI;
    out.push(p);
  }
  return out;
}
/* One exact rectangle owns every CLASSIC ANGULAR consumer.  Its four
   continuous faces meet at four clean seams; there is no implicit chamfer
   board and no Lamé-driven facet count. */
function panelVerts(a,b,_n){
  return [[a,-b],[a,b],[-a,b],[-a,-b]];
}
/* Intersection of a polar ray with the true convex panel perimeter.  Keeping
   phi as a ray parameter lets existing station/equal-path math remain intact
   while the returned point lies on an actual flat panel. */
function panelPoint(a,b,n,phi){
  const d=[Math.cos(phi),Math.sin(phi)],V=panelVerts(a,b,n);
  let best=Infinity;
  for(let i=0;i<V.length;i++){
    const p=V[i],q=V[(i+1)%V.length],e=[q[0]-p[0],q[1]-p[1]];
    const den=d[0]*e[1]-d[1]*e[0];
    if(Math.abs(den)<1e-12)continue;
    const t=(p[0]*e[1]-p[1]*e[0])/den;
    const u=(p[0]*d[1]-p[1]*d[0])/den;
    if(t>=0&&u>=-1e-9&&u<=1+1e-9&&t<best)best=t;
  }
  if(!Number.isFinite(best))return sePoint(a,b,Math.max(2,n),phi);
  const out=[d[0]*best,d[1]*best];out.param=phi;return out;
}
/* Arc-uniform samples of the exact four-face rectangular perimeter. */
function panelRing(a,b,_n,M){
  const V=panelVerts(a,b,12),segs=[],out=[];
  let L=0;
  for(let i=0;i<V.length;i++){
    const p=V[i],q=V[(i+1)%V.length],
      l=Math.hypot(q[0]-p[0],q[1]-p[1]);
    segs.push(l);L+=l;
  }
  let i=0,used=0;
  for(let k=0;k<M;k++){
    const t=k/M*L;
    while(i<segs.length-1&&used+segs[i]<t){used+=segs[i];i++;}
    const f=(t-used)/(segs[i]||1e-9),p=V[i],q=V[(i+1)%V.length],
      point=[p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f];
    point.param=normalizedPhi(Math.atan2(point[1],point[0]));
    out.push(point);
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
function sectionPoint2D(family,a,b,n,cornerR,phi,style){
  if(style==='angular')return panelPoint(a,b,n,phi);
  if(style==='curvedFacets'||family==='curvedFacets')
    return curvedRectPoint(a,b,phi);
  return family==='roundedRectangle'
    ?roundedRectPoint(a,b,cornerR,phi):sePoint(a,b,n,phi);
}
function sectionPolarPoint2D(family,a,b,n,cornerR,phi,style){
  if(style==='angular')return panelPoint(a,b,n,phi);
  if(style==='curvedFacets'||family==='curvedFacets')
    return curvedRectPolarPoint(a,b,phi);
  if(family==='roundedRectangle')return roundedRectPoint(a,b,cornerR,phi);
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  const [ct,sn]=snappedTrig(phi),
    den=Math.pow(Math.abs(ct)/a,n)+Math.pow(Math.abs(sn)/b,n),
    radius=Math.pow(Math.max(1e-30,den),-1/n),
    p=[radius*ct,radius*sn];
  p.param=normalizedPhi(phi);
  return p;
}
function sectionRing2D(family,a,b,n,cornerR,M,style){
  if(style==='angular')return panelRing(a,b,n,M);
  if(style==='curvedFacets'||family==='curvedFacets')
    return curvedRectRing(a,b,M);
  return family==='roundedRectangle'
    ?roundedRectRing(a,b,cornerR,M):seRing(a,b,n,M,'smooth');
}
function sectionParamFor2D(family,a,b,n,cornerR,y,z,style){
  if(style==='curvedFacets'||family==='curvedFacets')
    return curvedRectParamFor(a,b,y,z);
  if(style==='angular'||family!=='roundedRectangle')
    return paramFor(a,b,n,y,z);
  return normalizedPhi(Math.atan2(z,y));
}
function sectionLevel2D(family,a,b,n,cornerR,y,z){
  if(family==='curvedFacets')return curvedRectLevel(a,b,y,z);
  if(family==='roundedRectangle')
    return roundedRectSdf(a,b,cornerR,y,z);
  return Math.pow(Math.abs(y/Math.max(1e-12,a)),n)
    +Math.pow(Math.abs(z/Math.max(1e-12,b)),n)-1;
}
function sectionArea2D(family,a,b,n,cornerR){
  a=Math.max(1e-12,Math.abs(a));b=Math.max(1e-12,Math.abs(b));
  if(family==='curvedFacets')return 4*a*b;
  if(family==='roundedRectangle'){
    const r=legalCornerRadius(a,b,cornerR);
    return 4*a*b-(4-Math.PI)*r*r;
  }
  if(Math.abs(n-2)<1e-12)return Math.PI*a*b;
  const ring=seRing(a,b,n,96,'smooth');
  let area=0;
  for(let i=0;i<ring.length;i++){
    const q=ring[(i+1)%ring.length];
    area+=ring[i][0]*q[1]-q[0]*ring[i][1];
  }
  return Math.abs(area)/2;
}
function sectionPerimeter2D(family,a,b,n,cornerR){
  if(family==='curvedFacets')return 4*(Math.abs(a)+Math.abs(b));
  if(family==='roundedRectangle')
    return roundedRectPerimeter(a,b,cornerR);
  const ring=seRing(a,b,n,2048,'smooth');
  let length=0;
  for(let i=0;i<ring.length;i++){
    const q=ring[(i+1)%ring.length];
    length+=Math.hypot(q[0]-ring[i][0],q[1]-ring[i][1]);
  }
  return length;
}
function sectionAxisPoint2D(family,a,b,n,cornerR,value,vertical,sign){
  const s=sign<0?-1:1;
  if(family==='curvedFacets'){
    const p=vertical
      ?[s*a,Math.max(-b,Math.min(b,value))]
      :[Math.max(-a,Math.min(a,value)),s*b];
    p.param=curvedRectParamFor(a,b,p[0],p[1]);return p;
  }
  if(family==='roundedRectangle'){
    const r=legalCornerRadius(a,b,cornerR);
    if(vertical){
      const z=Math.max(-b,Math.min(b,value)),az=Math.abs(z),
        x=az<=b-r?a:a-r+Math.sqrt(Math.max(0,r*r-(az-(b-r))**2));
      const p=[s*x,z];p.param=normalizedPhi(Math.atan2(p[1],p[0]));return p;
    }
    const y=Math.max(-a,Math.min(a,value)),ay=Math.abs(y),
      z=ay<=a-r?b:b-r+Math.sqrt(Math.max(0,r*r-(ay-(a-r))**2));
    const p=[y,s*z];p.param=normalizedPhi(Math.atan2(p[1],p[0]));return p;
  }
  let y,z;
  if(vertical){
    z=Math.max(-b,Math.min(b,value));
    y=s*a*Math.pow(Math.max(0,1-Math.pow(Math.abs(z/b),n)),1/n);
  }else{
    y=Math.max(-a,Math.min(a,value));
    z=s*b*Math.pow(Math.max(0,1-Math.pow(Math.abs(y/a),n)),1/n);
  }
  const p=[y,z];p.param=paramFor(a,b,n,y,z);return p;
}

/* ---- ATH-style flare profile (curvature-continuous):
   half-width h(x) = ht + (hm-ht) * s(t)^p  with s = smoothstep blend of conical
   core and tanh-like termination, plus ROLL-BACK past the mouth plane.
   Sources: Keele mouth law for hm; the roll radius is the printable termination
   (Mother donut). This is a solver allowance shaped to be curvature-continuous;
   exact R-OSSE coefficients can be swapped in later without touching callers. ---- */
/* ---- THE COAX INTERFACE (b541) — ONE derivation for every coax consumer ----
   HIS RULING (2026-07-25, on his annotated ghost render): "the green line is where
   our horn should start, which is on the same surface as the driver cone. The hole
   in the driver cone the width of the green line should be the size of the throat
   of our horn... the depth of the driver cone, the diameter of the cone, and the
   diameter of the mouth of the CD in the coax cone should be the values you take
   to create the waveguide in the big horn that should then continue to create the
   horn for the woofer."

   WHY THE OLD NUMBER DIED: the print used to start at .60od (a funnel base
   docs/DRIVER_MOUNTING_PLAN.md itself calls an "od-relative guess"), leaving a
   Ø114 mm crater in the middle of the horn and an 11 mm-wide cone annulus. The
   SAME file's own measured record contradicts it: the 6FHX51 CAD silhouette
   (.3dm layer boxes, already carried in the shell's driver drawing) puts the cone
   between R·0.80 (rim, surround torus at .845R) and R·0.42 (the hole the HF horn
   passes through) — Ø150 and Ø78.5 on that driver. That hole is what his green
   line marks, so THAT is the throat.

   Sd is NOT inverted for the hole: B&C quote the coax's Sd as the full-piston
   equivalent (6FHX51 132 cm² vs the plain 6NDL38's 137 cm²), so π(rCone²−rHole²)
   is expected to run UNDER Sd; it is graded as a sanity row, not a solver.
   Every consumer (profile, layout, dishMesh, laws, viewer) reads this one place. */
function coneGeom(S){
  const od=(S.odW||22)*CM, rFrame=od/2;
  /* Exact 6FHX51 axial section from the supplied B&C Rhino/STEP B-rep:
       CD acoustic exit ID             20.066 mm
       acoustic ID at LF-cone plane    43.871 mm
       removable horn OD at that plane 49.084 mm
       stock horn front mouth ID        91.880 mm
       throat -> cone plane             88.949 mm
       throat -> stock mouth           105.346 mm
     The old 100.3 mm "cone-plane mouth" was not present in the B-rep. It made
     the replacement a shallow dish instead of the long axial waveguide visible
     in B&C's cutaway. Acoustic ID and physical clearance OD remain separate. */
  const cadFrame=0.893*od;                                    // 6FHX51 CAD frame 167.1 / overall 187
  const rCone=(S.coneD? S.coneD/2000 : 0.72*cadFrame/2);       // explicit preset/caliper; otherwise declared class fallback
  const rWG=(S.coneMouthD? S.coneMouthD/2000 : 0.27*cadFrame/2);
  /* Printable interface ownership is ID + RADIAL COLLAR THICKNESS.  The old
     absolute clearance diameter coupled those two controls: changing the
     throat silently changed its wall.  Measured CAD records that still carry
     both diameters are converted to the same radial thickness at read time. */
  const throatCollarT=(Number.isFinite(+S.throatCollarT)&&+S.throatCollarT>0)
    ?+S.throatCollarT/1000
    :(S.coneClearanceD&&S.coneMouthD
      ?Math.max(0.0005,(S.coneClearanceD-S.coneMouthD)/2000)
      :0.0016);
  const rHole=rWG+throatCollarT;
  const rStock=(S.stockHornMouthD? S.stockHornMouthD/2000 : 0.55*cadFrame/2);
  const rHF=(S.hfExit? S.hfExit/2000 : (S.td||1)*IN/2);       // actual/declared standard CD throat
  const rCD=rHole;                                             // physical land/port boundary, not acoustic ID
  const dep=(S.coneDepth!==undefined && S.coneDepth!=='' && S.coneDepth!==null)
    ? (+S.coneDepth)/1000 : 0.14*cadFrame;                     // declared 6FHX51 CAD class fallback
  const coneX=(S.bdepD? S.bdepD/1000 : 0.53*cadFrame);
  const stockX=(S.stockHornDepth? S.stockHornDepth/1000 : coneX+0.10*cadFrame);
  const sd=Math.max(0,(S.sdC||S.sdW||0))*1e-4;                // datasheet Sd, m²
  const ann=Math.PI*Math.max(0,rCone*rCone-rHole*rHole);      // the cone the taps actually see
  const meas=!!(S.coneD&&S.coneMouthD&&
    (S.throatCollarT||S.coneClearanceD)&&S.coneDepth&&S.hfExit);
  const src=S.coneGeomSrc||'6FHX51 CAD class fallback - measure this driver';
  const bad=!(rHF>0) || !(rWG>rHF) || !(rHole>rWG) || rHole>=rCone ||
    rCone>rFrame || !(rStock>rHole) || !(stockX>coneX);
  return {od, rFrame, rCone, rWG, rHole, throatCollarT,
          rCD, rStock, rHF, dep, coneX, stockX,
          sd, ann, meas, src, bad};
}
/* ---- R-OSSE (Marcel Batík, at-horns.eu, "R-OSSE Acoustic Waveguide" rev7 p.4,
   Dec 2022) — the published parametric set, verbatim. His ruling (2026-07-25):
   "the waveguide out of the co-ax driver needs to be smooth and following a known
   curve", with the paper handed over as the source; cross-checked term for term
   against rosseWall() in the Horn Studio build he sent the same day.

     c1 = (k·r0)²                c2 = 2·k·r0·tan(a0)          c3 = tan²(a)
     L  = 1/(2c3) · [ √(c2² − 4c3(c1 − (R + r0(k−1))²)) − c2 ]
     x(t) = L[√(r²+m²) − √(r²+(t−m)²)] + b·L[√(r²+(1−m)²) − √(r²+m²)]·t²
     y(t) = (1−t^q)[√(c1 + c2·L·t + c3·L²·t²) + r0(1−k)] + t^q[R + L(1 − √(1+c3(t−1)²))]

   Parameters: R outer radius, a nominal coverage half-angle, r0 throat radius,
   a0 throat opening half-angle, k throat expansion, r apex radius, m apex shift,
   b bending, q throat shape. a0=0 and b=0 are valid published values, so every
   default here tests for undefined, never falsiness. */
const ROSSE_REF={k:1.8, rr:0.3, b:0.3, m:0.8, q:3.7};      // the paper's own reference set
function rosse(P){
  const r0=P.r0, R=P.R, a=P.a, a0=(P.a0===undefined?d2r(7.5):P.a0);
  const k=(P.k===undefined?ROSSE_REF.k:P.k), rr=(P.rr===undefined?ROSSE_REF.rr:P.rr);
  const b=(P.b===undefined?ROSSE_REF.b:P.b), m=(P.m===undefined?ROSSE_REF.m:P.m);
  const q=(P.q===undefined?ROSSE_REF.q:P.q), n=P.n||160;
  const c1=(k*r0)*(k*r0), c2=2*k*r0*Math.tan(a0), c3=Math.pow(Math.tan(a),2);
  const disc=c2*c2-4*c3*(c1-Math.pow(R+r0*(k-1),2));
  if(!(disc>0)||!(R>r0)||!(c3>0)) return {ok:false, pts:[], L:0, depth:0};
  const L=(Math.sqrt(disc)-c2)/(2*c3);
  const A1=Math.sqrt(rr*rr+m*m), A2=Math.sqrt(rr*rr+(1-m)*(1-m));
  const pts=[];
  for(let i=0;i<n;i++){ const t=i/(n-1);
    const x=L*(A1-Math.sqrt(rr*rr+(t-m)*(t-m))) + b*L*(A2-A1)*t*t;
    const y=(1-Math.pow(t,q))*(Math.sqrt(c1+c2*L*t+c3*L*L*t*t)+r0*(1-k))
           + Math.pow(t,q)*(R+L*(1-Math.sqrt(1+c3*(t-1)*(t-1))));
    pts.push({x,y}); }
  return {ok:true, pts, L, depth:pts[pts.length-1].x};
}
/* r -> x on a monotone R-OSSE wall (the printed face is drawn radius-first) */
function rosseXat(W,r){
  const p=W.pts; if(!p.length) return 0;
  if(r<=p[0].y) return p[0].x;
  /* y is monotone over the acoustic wall. Binary search matters here:
     dishMesh asks for x(r) thousands of times per state, and the old linear
     scan made the 480-state gate exceed two minutes after adding clean patches. */
  let lo=1,hi=p.length-1;
  while(lo<hi){ const mid=(lo+hi)>>1; if(p[mid].y<r) lo=mid+1; else hi=mid; }
  if(lo<p.length){ const a=p[lo-1],b2=p[lo];
    const f=(r-a.y)/Math.max(1e-12,(b2.y-a.y)); return a.x+(b2.x-a.x)*f; }
  return p[p.length-1].x;
}
/* Monotone axial R-OSSE segment fitted to a measured station spacing.
   rev7's m=.8 reference intentionally bends back near the mouth; that is useful
   as an external termination but cannot be used inside a coax driver. m=1,b=0
   keeps x(t) strictly forward. Coverage angle is solved, not guessed. */
function rosseDepthFit(P,targetD){
  let lo=d2r(0.25), hi=d2r(89), W=null;
  for(let i=0;i<64;i++){ const a=(lo+hi)/2;
    W=rosse({...P,a,m:1,b:0,n:P.n||128});
    if(!W.ok) break;
    if(W.depth>targetD) lo=a; else hi=a; }
  W=rosse({...P,a:(lo+hi)/2,m:1,b:0,n:P.n||128});
  return W;
}
const ROSSE_EXIT_CACHE=new Map();
function rosseExitFit(P,targetSlope){
  const key=[P.r0,P.R,P.a,P.a0,targetSlope].map(v=>Math.round(v*1e6)).join(':');
  let b0=ROSSE_EXIT_CACHE.get(key), best=null;
  const test=b=>{ const W=rosse({...P,m:0.96,b,rr:0.205,n:P.n||128});
    if(!W.ok) return null;
    const p=W.pts,n=p.length;
    for(let i=1;i<n;i++) if(p[i].x<=p[i-1].x||p[i].y<p[i-1].y) return null;
    const slope=(p[n-1].y-p[n-2].y)/Math.max(1e-12,p[n-1].x-p[n-2].x);
    return {W,b,err:Math.abs(slope-targetSlope)}; };
  if(b0!==undefined) best=test(b0);
  if(!best){ for(let i=0;i<=44;i++){ const z=test(-0.35+i*0.01);
      if(z&&(!best||z.err<best.err)) best=z; } }
  if(!best) return rosse({...P,m:1,b:0,n:P.n||128});
  let step=0.005;
  for(let k=0;k<6;k++){ let nb=best;
    for(const b of [best.b-step,best.b-step/2,best.b+step/2,best.b+step]){
      const z=test(b); if(z&&z.err<nb.err) nb=z; }
    best=nb; step*=0.35; }
  ROSSE_EXIT_CACHE.set(key,best.b);
  return best.W;
}

/* ---- BOUNDED RADIAL-PROFILE FOUNDATION -----------------------------------
   These are four separate mathematical families. They intentionally do not
   share a generic "shape" control and are not wired into profile(S): the v5
   production default therefore remains byte-for-byte behaviorally unchanged
   until a caller explicitly requests a family through radialProfile().

   Lengths are metres and angles are radians at this engine boundary.  The
   schemas record the source/UI units and bounds so a future UI adapter can
   convert without quietly changing the equations.

   JMLC is validation-only here. A JMLC contour is a sampled isophase
   wavefront march satisfying an area law; substituting an OS curve, an
   eased cone, or a claimed coverage angle would be false. */
const freezeSchema=o=>{
  for(const v of Object.values(o)) if(v&&typeof v==='object'&&!Object.isFrozen(v)) freezeSchema(v);
  return Object.freeze(o);
};
const RADIAL_PROFILE_SCHEMAS=freezeSchema({
  classicOS:{
    family:'classicOS', label:'Classic oblate spheroidal (OS)',
    synthesis:'analytic', geometryMode:'exact_round',
    directivityInput:'nominalIncludedAngle', coverageClaim:false,
    termination:'requires large baffle or a separately validated blend',
    parameters:{
      throatRadius:{unit:'m',min:0.002,max:0.060},
      nominalHalfAngle:{unit:'rad',min:d2r(15),max:d2r(70)},
      axialLength:{unit:'m',exclusiveMin:0},
      mouthRadius:{unit:'m',exclusiveMin:'throatRadius'}
    }
  },
  osse:{
    family:'osse', label:'OS-SE (Batík 2020)',
    synthesis:'analytic', geometryMode:'exact_round',
    directivityInput:'nominalIncludedAngle', coverageClaim:false,
    termination:'native flat/large-baffle termination',
    parameters:{
      throatRadius:{unit:'m',min:0.002,max:0.060},
      nominalHalfAngle:{unit:'rad',min:d2r(20),max:d2r(70)},
      throatHalfAngle:{unit:'rad',min:0,max:d2r(25)},
      k:{min:0.5,max:4}, s:{min:0,max:2},
      terminationExponent:{min:2,max:8}, q:{min:0.99,max:1},
      axialLength:{unit:'m',exclusiveMin:0},
      mouthRadius:{unit:'m',exclusiveMin:'throatRadius'}
    }
  },
  rosse:{
    family:'rosse', label:'R-OSSE (Batík 2022, rev.7)',
    synthesis:'analytic_parametric', geometryMode:'exact_round',
    directivityInput:'nominalIncludedAngle', coverageClaim:false,
    termination:'native free-standing rollback',
    parameters:{
      throatRadius:{unit:'m',min:0.002,max:0.060},
      outerRadius:{unit:'m',min:0.060,max:0.400},
      nominalHalfAngle:{unit:'rad',min:d2r(20),max:d2r(60)},
      throatHalfAngle:{unit:'rad',min:0,max:d2r(20)},
      k:{min:0.5,max:4}, apexRadiusFactor:{min:0.05,max:1},
      bending:{min:0,max:1}, apexShift:{min:0.4,max:0.98},
      throatShape:{min:1,max:8}
    }
  },
  jmlc:{
    family:'jmlc', label:'JMLC isophase',
    synthesis:'validation_only', geometryMode:'exact_round',
    directivityInput:null, coverageClaim:false,
    termination:'native local-wall-angle stop',
    unsupportedReason:'Exact synthesis requires an isophase wavefront march; coverage is an analysis output, not an input.',
    parameters:{
      throatRadius:{unit:'m',min:0.002,max:0.060},
      cutoffFrequency:{unit:'Hz',min:80,max:10000},
      T0:{min:0.4,max:1.2},
      entryMode:{enum:['natural','manual']},
      manualEntryHalfAngle:{unit:'rad',min:0,max:d2r(30)},
      endWallAngle:{unit:'rad',min:d2r(60),max:d2r(230)},
      additionalNativeSweep:{unit:'rad',min:0,max:d2r(38)}
    }
  }
});
const RADIAL_FAMILY_ALIASES=Object.freeze({
  classic:'classicOS','classic-os':'classicOS',classicOS:'classicOS',
  osse:'osse','os-se':'osse',
  rosse:'rosse','r-osse':'rosse',
  jmlc:'jmlc'
});
const radialFinite=v=>Number.isFinite(v);
const radialSamples=P=>Math.max(2,Math.min(4096,Math.round(P.samples===undefined?161:P.samples)));
const radialIn=(v,lo,hi)=>radialFinite(v)&&v>=lo&&v<=hi;
function radialFamilyName(name){ return RADIAL_FAMILY_ALIASES[name]||null; }
function radialProfileSchema(name){
  const family=radialFamilyName(name);
  return family?RADIAL_PROFILE_SCHEMAS[family]:null;
}
function radialFailure(family,errors,extra={}){
  return {ok:false,family,errors:[...errors],...extra};
}
function radialExtent(P,radiusAt){
  const hasL=radialFinite(P.axialLength), hasR=radialFinite(P.mouthRadius);
  if(!hasL&&!hasR) return {ok:false,error:'select axialLength or mouthRadius as the finite extent'};
  if(hasL&&!(P.axialLength>0)) return {ok:false,error:'axialLength must be greater than zero'};
  if(hasR&&!(P.mouthRadius>P.throatRadius))
    return {ok:false,error:'mouthRadius must be greater than throatRadius'};
  if(hasL){
    const mouth=radiusAt(P.axialLength,P.axialLength);
    if(!radialFinite(mouth)) return {ok:false,error:'profile endpoint is not finite'};
    if(hasR&&Math.abs(mouth-P.mouthRadius)>Math.max(1e-7,1e-5*P.mouthRadius))
      return {ok:false,error:'axialLength and mouthRadius specify inconsistent extents'};
    return {ok:true,L:P.axialLength,R:mouth,mode:'axialLength'};
  }
  let lo=0, hi=Math.max(0.01,4*P.throatRadius), fHi=radiusAt(hi,hi)-P.mouthRadius;
  for(let i=0;i<64&&(!(fHi>=0)||!radialFinite(fHi));i++){
    hi*=2; fHi=radiusAt(hi,hi)-P.mouthRadius;
    if(hi>20) break;
  }
  if(!radialFinite(fHi)||fHi<0)
    return {ok:false,error:'mouthRadius could not be reached inside the bounded 20 m solve'};
  for(let i=0;i<80;i++){
    const mid=(lo+hi)/2, f=radiusAt(mid,mid)-P.mouthRadius;
    if(!radialFinite(f)) return {ok:false,error:'extent solve produced a non-finite radius'};
    if(f<0) lo=mid; else hi=mid;
  }
  const L=(lo+hi)/2;
  return {ok:true,L,R:radiusAt(L,L),mode:'mouthRadius'};
}
function radialResult(family,P,L,radiusAt,extra={}){
  const samples=radialSamples(P), pts=[];
  for(let i=0;i<samples;i++){
    const x=L*i/(samples-1), y=radiusAt(x,L);
    if(!radialFinite(x)||!radialFinite(y)||!(y>0))
      return radialFailure(family,['profile produced a non-finite or non-positive point']);
    pts.push({x,y});
  }
  return {ok:true,family,pts,L,depth:L,throatRadius:pts[0].y,
    mouthRadius:pts[pts.length-1].y,geometryMode:'exact_round',
    coverageClaim:false,...extra};
}

/* Classic OS: r(z)=sqrt(r0²+z² tan²(a)). */
function classicOSRadiusAt(P,z){
  return Math.sqrt(P.throatRadius*P.throatRadius+
    z*z*Math.pow(Math.tan(P.nominalHalfAngle),2));
}
function classicOSProfile(P={}){
  const errors=[];
  if(!radialIn(P.throatRadius,0.002,0.060)) errors.push('throatRadius must be 0.002–0.060 m');
  if(!radialIn(P.nominalHalfAngle,d2r(15),d2r(70)))
    errors.push('nominalHalfAngle must be 15–70 degrees');
  if(errors.length) return radialFailure('classicOS',errors);
  const extent=radialExtent(P,(z)=>classicOSRadiusAt(P,z));
  if(!extent.ok) return radialFailure('classicOS',[extent.error]);
  return radialResult('classicOS',P,extent.L,(z)=>classicOSRadiusAt(P,z),{
    nominalIncludedAngle:2*P.nominalHalfAngle,
    launchSlope:0,extentMode:extent.mode,
    termination:'requires large baffle or a separately validated blend'
  });
}

/* OS-SE formula (5), Batík 2020. The superellipse exponent below shapes the
   meridional termination term; it is not a mouth cross-section Lamé exponent. */
function osseRadiusAt(P,z,L=P.axialLength){
  if(!(L>0)||z<0||z>L) return NaN;
  const r0=P.throatRadius, a=P.nominalHalfAngle, a0=P.throatHalfAngle;
  const k=P.k, s=P.s, n=P.terminationExponent, q=P.q;
  const gos=Math.sqrt(k*k*r0*r0+2*k*r0*z*Math.tan(a0)+z*z*Math.pow(Math.tan(a),2))
    +r0*(1-k);
  const u=Math.max(0,1-Math.pow(q*z/L,n));
  const term=(s*L/q)*(1-Math.pow(u,1/n));
  return gos+term;
}
function osseProfile(P={}){
  const errors=[];
  if(!radialIn(P.throatRadius,0.002,0.060)) errors.push('throatRadius must be 0.002–0.060 m');
  if(!radialIn(P.nominalHalfAngle,d2r(20),d2r(70)))
    errors.push('nominalHalfAngle must be 20–70 degrees');
  if(!radialIn(P.throatHalfAngle,0,d2r(25))) errors.push('throatHalfAngle must be 0–25 degrees');
  if(!radialIn(P.k,0.5,4)) errors.push('k must be 0.5–4');
  if(!radialIn(P.s,0,2)) errors.push('s must be 0–2');
  if(!radialIn(P.terminationExponent,2,8)) errors.push('terminationExponent must be 2–8');
  if(!radialIn(P.q,0.99,1)) errors.push('q must be 0.99–1.00');
  if(errors.length) return radialFailure('osse',errors);
  const extent=radialExtent(P,(z,L)=>osseRadiusAt(P,z,L));
  if(!extent.ok) return radialFailure('osse',[extent.error]);
  return radialResult('osse',P,extent.L,(z,L)=>osseRadiusAt(P,z,L),{
    nominalIncludedAngle:2*P.nominalHalfAngle,
    launchSlope:Math.tan(P.throatHalfAngle),extentMode:extent.mode,
    termination:'native flat/large-baffle termination'
  });
}

/* Bounded public wrapper around the existing rev.7 R-OSSE implementation.
   "r" in the paper is named apexRadiusFactor here to avoid confusing it with
   a physical radius. The returned x(t),y(t) remains parametric so rollback is
   never flattened into a fake monotone axial horn. */
function rosseProfile(P={}){
  const errors=[];
  if(!radialIn(P.throatRadius,0.002,0.060)) errors.push('throatRadius must be 0.002–0.060 m');
  if(!radialIn(P.outerRadius,0.060,0.400)) errors.push('outerRadius must be 0.060–0.400 m');
  if(radialFinite(P.throatRadius)&&radialFinite(P.outerRadius)&&!(P.outerRadius>P.throatRadius))
    errors.push('outerRadius must be greater than throatRadius');
  if(!radialIn(P.nominalHalfAngle,d2r(20),d2r(60)))
    errors.push('nominalHalfAngle must be 20–60 degrees');
  if(!radialIn(P.throatHalfAngle,0,d2r(20))) errors.push('throatHalfAngle must be 0–20 degrees');
  if(!radialIn(P.k,0.5,4)) errors.push('k must be 0.5–4');
  if(!radialIn(P.apexRadiusFactor,0.05,1)) errors.push('apexRadiusFactor must be 0.05–1');
  if(!radialIn(P.bending,0,1)) errors.push('bending must be 0–1');
  if(!radialIn(P.apexShift,0.4,0.98)) errors.push('apexShift must be 0.4–0.98');
  if(!radialIn(P.throatShape,1,8)) errors.push('throatShape must be 1–8');
  if(errors.length) return radialFailure('rosse',errors);
  const W=rosse({r0:P.throatRadius,R:P.outerRadius,a:P.nominalHalfAngle,
    a0:P.throatHalfAngle,k:P.k,rr:P.apexRadiusFactor,b:P.bending,
    m:P.apexShift,q:P.throatShape,n:radialSamples(P)});
  if(!W.ok) return radialFailure('rosse',['R-OSSE discriminant or axial scale is invalid']);
  for(const p of W.pts) if(!radialFinite(p.x)||!radialFinite(p.y)||!(p.y>0))
    return radialFailure('rosse',['R-OSSE produced a non-finite or non-positive point']);
  const maxDepth=Math.max(...W.pts.map(p=>p.x));
  const foldBack=W.pts.some((p,i)=>i>0&&p.x<W.pts[i-1].x-1e-12);
  return {...W,family:'rosse',throatRadius:W.pts[0].y,
    mouthRadius:W.pts[W.pts.length-1].y,maxDepth,foldBack,
    geometryMode:'exact_round',coverageClaim:false,
    nominalIncludedAngle:2*P.nominalHalfAngle,
    launchSlope:Math.tan(P.throatHalfAngle)*
      Math.sqrt(P.apexRadiusFactor*P.apexRadiusFactor+P.apexShift*P.apexShift)/P.apexShift,
    termination:'native free-standing rollback'};
}

/* JMLC foundation: validate the real inputs and expose the Hypex area law and
   natural seed, but refuse geometry synthesis until the isophase wavefront
   marcher and its residual/termination audit are implemented. */
const JMLC_COVERAGE_KEYS=Object.freeze([
  'coverage','coverageAngle','nominalIncludedAngle','nominalHalfAngle','covH','covV'
]);
function validateJMLCProfile(P={}){
  const errors=[];
  for(const key of JMLC_COVERAGE_KEYS)
    if(P[key]!==undefined) errors.push(`${key} is not a JMLC input; coverage requires analysis`);
  if(!radialIn(P.throatRadius,0.002,0.060)) errors.push('throatRadius must be 0.002–0.060 m');
  if(!radialIn(P.cutoffFrequency,80,10000)) errors.push('cutoffFrequency must be 80–10000 Hz');
  if(!radialIn(P.T0,0.4,1.2)) errors.push('T0 must be 0.4–1.2');
  const entryMode=P.entryMode===undefined?'natural':P.entryMode;
  if(entryMode!=='natural'&&entryMode!=='manual') errors.push('entryMode must be natural or manual');
  if(entryMode==='manual'&&!radialIn(P.manualEntryHalfAngle,0,d2r(30)))
    errors.push('manualEntryHalfAngle must be 0–30 degrees in manual mode');
  if(!radialIn(P.endWallAngle,d2r(60),d2r(230)))
    errors.push('endWallAngle must be 60–230 degrees and is not coverage');
  const sweep=P.additionalNativeSweep===undefined?0:P.additionalNativeSweep;
  if(!radialIn(sweep,0,d2r(38))) errors.push('additionalNativeSweep must be 0–38 degrees');
  if(radialFinite(P.endWallAngle)&&radialFinite(sweep)&&P.endWallAngle+sweep>d2r(268)+1e-12)
    errors.push('endWallAngle plus additionalNativeSweep must not exceed 268 degrees');
  let m=NaN,naturalEntryHalfAngle=NaN,seedArea=NaN;
  if(radialFinite(P.cutoffFrequency)&&radialFinite(P.throatRadius)&&radialFinite(P.T0)){
    m=4*Math.PI*P.cutoffFrequency/C;
    const sinEntry=P.throatRadius*m*P.T0/2;
    if(!(sinEntry>=0&&sinEntry<=1)) errors.push('natural JMLC throat relation has no real entry angle');
    else{
      naturalEntryHalfAngle=Math.asin(sinEntry);
      seedArea=2*Math.PI*P.throatRadius*P.throatRadius/(1+Math.cos(naturalEntryHalfAngle));
    }
  }
  const entryHalfAngle=entryMode==='manual'?P.manualEntryHalfAngle:naturalEntryHalfAngle;
  return {ok:errors.length===0,family:'jmlc',errors,entryMode,m,
    naturalEntryHalfAngle,entryHalfAngle,seedArea,
    targetEndWallAngle:radialFinite(P.endWallAngle)?P.endWallAngle+sweep:NaN,
    coverageClaim:false,synthesisSupported:false};
}
function jmlcAreaAt(P,s){
  const v=validateJMLCProfile(P);
  if(!v.ok||!radialFinite(s)||s<0) return NaN;
  const h=v.m*s/2;
  return v.seedArea*Math.pow(Math.cosh(h)+P.T0*Math.sinh(h),2);
}
function jmlcProfile(P={}){
  const v=validateJMLCProfile(P);
  if(!v.ok) return radialFailure('jmlc',v.errors,{validation:v,
    synthesisSupported:false,coverageClaim:false});
  return radialFailure('jmlc',[
    'Exact JMLC synthesis is unsupported until the isophase wavefront march, area residual, and local-wall-angle stop are implemented'
  ],{code:'JMLC_WAVEFRONT_MARCH_NOT_IMPLEMENTED',validation:v,
    synthesisSupported:false,coverageClaim:false});
}
function radialProfile(P={}){
  const family=radialFamilyName(P.family);
  if(!family) return radialFailure(null,['family must explicitly select classicOS, osse, rosse, or jmlc']);
  if(family==='classicOS') return classicOSProfile(P);
  if(family==='osse') return osseProfile(P);
  if(family==='rosse') return rosseProfile(P);
  return jmlcProfile(P);
}
/* Circular coax-MEH entry design.
   There is no defensible universal "tap diameter = cone diameter × k" rule.
   The bore area is first set by a declared compression ratio:
       Atotal = Sd / CR,  Aport = Atotal / N
   The chamber volume required for the requested acoustic low-pass is then:
       Vtc = N·Aport / ((2πf/c)²·Leff), Leff=Lwall+0.85r
   This exposes the real two-variable design problem instead of silently
   choosing a tiny bore from an arbitrary chamber estimate.  Manual chamber
   mode is retained for measured prototypes and is graded against the target.
   Fit, circumferential packing and λ/4 edge coherence remain independent
   constraints; a state that cannot satisfy them is refused, never squeezed. */
function coaxTapDesign(S,cg){
  const N=Math.max(2,(S.coaxTaps|0)||4);
  const fx=Math.max(200,+(S.coaxXO||S.recXO||1200));
  const fLP=Math.max(fx,+(S.tapLPFactor||1.15)*fx);
  const L0=Math.max(0.004,(S.tapLen||S.wallT||0.012));
  const sd=Math.max(1e-5,cg.sd||cg.ann);
  /* The diameter is underdetermined until either compression ratio or a
     measured chamber volume is declared. 16:1 is the tool's conservative
     MEH reference anchor (not a universal patent law); the UI exposes it and
     the chamber/tap low-pass is solved from the selected value. */
  const cr=Math.max(1.5,Math.min(32,+(S.tapCR||16)));
  const totalArea=sd/cr, area=totalArea/N;
  const r=Math.sqrt(area/Math.PI);
  const Leff=L0+0.85*r;
  const omegaTerm=Math.pow(2*Math.PI*fLP/C,2);
  const Vreq=totalArea/(omegaTerm*Leff), VreqCc=Vreq*1e6;
  const autoV=S.tapVtcMode!=='manual';
  const Vcc=autoV?VreqCc:Math.max(0.5,+(S.tapVtc||VreqCc));
  const V=Vcc*1e-6;
  const fActual=C/(2*Math.PI)*Math.sqrt(totalArea/(V*Leff));
  const lpRatio=fActual/fLP;
  const minWeb=Math.max(0.0032,0.35*(S.wallT||0.012));
  const land=minWeb, center=cg.rHole+land+r;
  /* Equal-radius ports are equal-path on axis. At the coverage edge, the
     worst path difference is ring diameter × sin(half-angle), not the full
     diameter as the earlier 90° observation assumption claimed. */
  const edgeAngle=d2r(Math.max(S.covH||70,S.covV||70)/2);
  const projectedSpread=2*center*Math.sin(edgeAngle);
  const spatialMax=C/(4*fx);
  /* The OEM waveguide is removed. Ports only need to remain on the exposed
     LF cone; the replacement horn is free to expand through the baffle beyond
     the old Ø91.88 mm OEM-mouth envelope. */
  const fit=center+r+land<=cg.rCone;
  const strictCoherent=projectedSpread<=spatialMax;
  /* λ/4 is a conservative edge-of-pattern heuristic rather than a patent
     diameter law. Keep 1.30× as the tool's explicit warning ceiling; the
     report still distinguishes the strict result. */
  const coherent=projectedSpread<=2.0*spatialMax;
  const circumference=N*(2*r+0.004)<=2*Math.PI*center;
  const radialInner=center-r-cg.rHole;
  const radialOuter=cg.rCone-center-r;
  const circumWeb=2*center*Math.sin(Math.PI/N)-2*r;
  const structural=Math.min(radialInner,radialOuter,circumWeb)>=minWeb-1e-6;
  const wavelengthWidth=2*r<C/fx;
  const chamberOK=lpRatio>=0.90&&lpRatio<=1.10;
  return {N,fx,fLP,fActual,lpRatio,V,Vcc,Vreq,VreqCc,autoV,L0,Leff,r,center,
    edgeAngle,projectedSpread,spatialMax,fit,strictCoherent,coherent,circumference,
    cr,sd,totalArea,area,wavelengthWidth,chamberOK,minWeb,radialInner,radialOuter,circumWeb,structural,
    ok:fit&&coherent&&circumference&&wavelengthWidth&&chamberOK&&structural};
}
const PROFILE_LAW_DEFAULTS=Object.freeze({
  /* Pre-release policy: new designs start from an acoustically explicit
     profile law, not from a separate preview-only shape. The historical
     equation remains in profile-laws.js only as an
     internal regression oracle; it is not a product default. */
  profileLaw:'conical',
  osseThroatAngle:7.5,
  osseK:1.8,
  osseS:0.7,
  osseTerminationN:4,
  osseQ:0.995,
  /* R-OSSE revision 7 reference set. `mouthW`, `covH`, and the selected
     throat already own native R, a, and r0. These state fields own a0, k,
     apex-radius factor r, B, M, and Q on the retained exact forward body. */
  rosseThroatAngle:7.5,
  rosseK:1.8,
  rosseApexRadiusFactor:0.3,
  rosseB:0.3,
  rosseM:0.8,
  rosseQ:3.7
});
function monotoneProfileRecord(S,throatRadius,mouthRadius,nominalHalfAngle){
  const result=MEH_PROFILE_LAWS.solveProfileLaw({
    family:S.profileLaw||PROFILE_LAW_DEFAULTS.profileLaw,
    throatRadius,mouthRadius,nominalHalfAngle,
    throatHalfAngle:d2r(Number.isFinite(+S.osseThroatAngle)
      ?+S.osseThroatAngle:PROFILE_LAW_DEFAULTS.osseThroatAngle),
    k:Number.isFinite(+S.osseK)?+S.osseK:PROFILE_LAW_DEFAULTS.osseK,
    s:Number.isFinite(+S.osseS)?+S.osseS:PROFILE_LAW_DEFAULTS.osseS,
    terminationExponent:Number.isFinite(+S.osseTerminationN)
      ?+S.osseTerminationN:PROFILE_LAW_DEFAULTS.osseTerminationN,
    q:Number.isFinite(+S.osseQ)?+S.osseQ:PROFILE_LAW_DEFAULTS.osseQ,
    /* R-OSSE controls are separate from similarly named OS-SE controls.
       Passing both sets is safe because profile-laws.js consumes only the
       explicitly selected family's schema. */
    ...(S.profileLaw==='rosse'||S.profileLaw==='r-osse'||S.profileLaw==='r_osse'
      ?{
        throatHalfAngle:d2r(Number.isFinite(+S.rosseThroatAngle)
          ?+S.rosseThroatAngle:PROFILE_LAW_DEFAULTS.rosseThroatAngle),
        k:Number.isFinite(+S.rosseK)?+S.rosseK:PROFILE_LAW_DEFAULTS.rosseK,
        apexRadiusFactor:Number.isFinite(+S.rosseApexRadiusFactor)
          ?+S.rosseApexRadiusFactor:PROFILE_LAW_DEFAULTS.rosseApexRadiusFactor,
        bending:Number.isFinite(+S.rosseB)?+S.rosseB:PROFILE_LAW_DEFAULTS.rosseB,
        apexShift:Number.isFinite(+S.rosseM)?+S.rosseM:PROFILE_LAW_DEFAULTS.rosseM,
        throatShape:Number.isFinite(+S.rosseQ)?+S.rosseQ:PROFILE_LAW_DEFAULTS.rosseQ
      }:{ }),
    samples:49
  });
  if(result.ok)return result;
  const error=new RangeError('PROFILE LAW REFUSED — '+result.errors.join('; '));
  error.name='ProfileLawRefusalError';
  error.code=result.code;
  error.profileLaw=result;
  throw error;
}
function profileCompositeHash(parts){
  const text=parts.map(value=>typeof value==='number'?value.toPrecision(17):String(value)).join('|');
  let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){ hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193); }
  return 'cpl1-'+(hash>>>0).toString(16).padStart(8,'0');
}
function profileSecond(endpoint){
  return endpoint.curvature*Math.pow(1+endpoint.slope*endpoint.slope,1.5);
}
/* A Classic OS can only leave its native throat with zero slope.  The protected
   coax handoff does not: its registered final construction segment is already
   travelling at the nominal wall angle.  Joining the native OS throat would
   therefore create a hard kink, and a monotone C2 bridge into that zero-slope,
   positive-curvature origin is mathematically impossible.  Use an exact
   TRUNCATED TAIL of the same OS meridian instead.  `startSlope` fixes the
   truncation station; the virtual native throat remains recorded for audit. */
function classicOSTailRecord(S,startRadius,mouthRadius,nominalHalfAngle,startSlope){
  const tangent=Math.tan(nominalHalfAngle);
  if(!(startSlope>0&&startSlope<tangent)){
    const error=new RangeError('PROFILE INTERFACE REFUSED — Classic OS tail requires 0 < start slope < nominal slope');
    error.name='ProfileLawInterfaceRefusalError';error.code='PROFILE_OS_TAIL_INVALID';
    throw error;
  }
  const ratio=startSlope/tangent;
  const virtualThroat=startRadius*Math.sqrt(Math.max(0,1-ratio*ratio));
  const originOffset=startSlope*startRadius/(tangent*tangent);
  const full=MEH_PROFILE_LAWS.solveProfileLaw({
    family:'classicOS',throatRadius:virtualThroat,mouthRadius,
    nominalHalfAngle,samples:257
  });
  if(!full.ok){
    const error=new RangeError('PROFILE LAW REFUSED — '+full.errors.join('; '));
    error.name='ProfileLawRefusalError';error.code=full.code;error.profileLaw=full;
    throw error;
  }
  const tailLength=full.extent.axialLength-originOffset,N=49;
  if(!(tailLength>0)){
    const error=new RangeError('PROFILE INTERFACE REFUSED — Classic OS truncation lies beyond the requested mouth');
    error.name='ProfileLawInterfaceRefusalError';error.code='PROFILE_OS_TAIL_EMPTY';
    throw error;
  }
  const stations=[];let arcLength=0,prior=null;
  for(let i=0;i<N;i++){
    const u=i/(N-1),x=tailLength*u,
      globalU=(originOffset+x)/full.extent.axialLength,
      raw=MEH_PROFILE_LAWS.evaluateProfileAt(full,globalU),
      second=profileSecond(raw);
    if(prior)arcLength+=Math.hypot(x-prior.x,raw.r-prior.r);
    const station={u,x,r:raw.r,dxdu:tailLength,drdu:raw.slope*tailLength,
      d2xdu2:0,d2rdu2:second*tailLength*tailLength,slope:raw.slope,
      tangentAngle:raw.tangentAngle,curvature:raw.curvature,arcLength};
    stations.push(station);prior=station;
  }
  const first=stations[0],last=stations[stations.length-1],
    profileHash=profileCompositeHash(['classicOS-tail-v1',full.profileHash,
      startRadius,mouthRadius,nominalHalfAngle,startSlope,originOffset]);
  return {
    ok:true,version:full.version,family:'classicOS',lawId:'classicOS',
    label:'Classic oblate spheroidal (OS) · exact truncated tail',
    exactness:'exact-axisymmetric-truncated-tail',synthesis:'analytic',
    nativeDomain:'monotone-axial',nativeTermination:full.nativeTermination,
    terminationPolicy:full.terminationPolicy,coverageClaim:false,
    source:'Exact finite tail of the Classic OS meridian',
    inputs:{throatRadius:startRadius,mouthRadius,nominalHalfAngle,startSlope,
      virtualNativeThroatRadius:virtualThroat,nativeOriginOffset:originOffset},
    extent:{mode:'mouthRadius',axialLength:tailLength,
      throatRadius:startRadius,mouthRadius},
    sampleCount:N,profileHash,
    sampleHash:profileCompositeHash([profileHash,N]),
    stations,
    diagnostics:{finite:true,radiusPositive:true,axialMonotone:true,
      radialMonotone:true,c2Finite:true,minSlope:first.slope,
      maxSlope:last.slope,throatSlope:first.slope,mouthSlope:last.slope,
      throatCurvature:first.curvature,mouthCurvature:last.curvature,
      arcLength:last.arcLength},
    endpoints:{throat:{x:0,r:first.r,slope:first.slope,
      tangentAngle:first.tangentAngle,curvature:first.curvature},
      mouth:{x:tailLength,r:last.r,slope:last.slope,
        tangentAngle:last.tangentAngle,curvature:last.curvature}},
    monotonic:{axial:true,radial:true},
    compatibility:{compatible:true,monotoneAxialConsumer:true,
      requiresParametricDomain:false,crossSectionLayer:'orthogonal-not-applied',
      additionalMouthTreatment:'orthogonal-not-applied',reason:null},
    truncation:{active:true,virtualNativeThroatRadius:virtualThroat,
      nativeOriginOffset:originOffset,startSlope}
  };
}
function c2BridgePoint(coefficients,length,u){
  const [a0,a1,a2,a3,a4,a5]=coefficients,t=Math.max(0,Math.min(1,u)),
    r=a0+a1*t+a2*t*t+a3*t*t*t+a4*t*t*t*t+a5*t*t*t*t*t,
    drdt=a1+2*a2*t+3*a3*t*t+4*a4*t*t*t+5*a5*t*t*t*t,
    d2rdt2=2*a2+6*a3*t+12*a4*t*t+20*a5*t*t*t,
    slope=drdt/length,second=d2rdt2/(length*length);
  return {u:t,x:length*t,r,dxdu:length,drdu:drdt,d2xdu2:0,d2rdu2:d2rdt2,
    slope,tangentAngle:Math.atan(slope),
    curvature:second/Math.pow(1+slope*slope,1.5),second};
}
function boundedC2ProfileBridge(startRadius,endRadius,startSlope,startSecond,
  endSlope,endSecond,wallThickness){
  const rise=endRadius-startRadius,
    length=2*rise/Math.max(1e-9,startSlope+endSlope);
  if(!(rise>0&&Number.isFinite(length)&&length>=Math.max(0.008,0.5*(wallThickness||0.012)))){
    return {ok:false,code:'PROFILE_BRIDGE_TOO_SHORT',
      reason:'requested mouth leaves less than one bounded printable handoff bridge'};
  }
  const a0=startRadius,a1=startSlope*length,
    a2=0.5*startSecond*length*length,
    B0=endRadius-a0-a1-a2,
    B1=endSlope*length-a1-2*a2,
    B2=endSecond*length*length-2*a2,
    coefficients=[a0,a1,a2,
      10*B0-4*B1+0.5*B2,
      -15*B0+7*B1-B2,
      6*B0-3*B1+0.5*B2];
  const stations=[];let minSlope=Infinity,maxSlope=-Infinity,
    maxAbsCurvature=0,minRadius=Infinity,maxRadius=-Infinity,arcLength=0,prior=null;
  for(let i=0;i<=16;i++){
    const point=c2BridgePoint(coefficients,length,i/16);
    if(prior)arcLength+=Math.hypot(point.x-prior.x,point.r-prior.r);
    point.arcLength=arcLength;stations.push(point);prior=point;
  }
  /* Audit on a denser grid than the emitted bridge so a coarse station count
     cannot hide a radial reversal or an unprintably sharp curvature spike. */
  for(let i=0;i<=256;i++){
    const point=c2BridgePoint(coefficients,length,i/256);
    minSlope=Math.min(minSlope,point.slope);maxSlope=Math.max(maxSlope,point.slope);
    maxAbsCurvature=Math.max(maxAbsCurvature,Math.abs(point.curvature));
    minRadius=Math.min(minRadius,point.r);maxRadius=Math.max(maxRadius,point.r);
  }
  const start=c2BridgePoint(coefficients,length,0),
    end=c2BridgePoint(coefficients,length,1),
    tolerance=1e-8,
    monotone=minSlope>=-tolerance&&minRadius>=startRadius-tolerance&&
      maxRadius<=endRadius+tolerance,
    bounded=maxAbsCurvature<=250;
  if(!monotone||!bounded)return {ok:false,
    code:!monotone?'PROFILE_BRIDGE_NON_MONOTONE':'PROFILE_BRIDGE_CURVATURE_EXCEEDED',
    reason:!monotone?'C2 bridge reverses radius before the selected native law':
      'C2 bridge curvature exceeds the bounded 4 mm minimum radius',
    length,rise,minSlope,maxSlope,maxAbsCurvature};
  return {ok:true,version:1,mode:'bounded-c2-quintic',label:'bounded C2 coax-handoff bridge',
    length,rise,coefficients,stations,minSlope,maxSlope,maxAbsCurvature,
    derivation:'rise = 20% of available post-handoff radial span; length = 2·rise/(m0+m1); construction rule, not an acoustic optimum',
    endpoints:{start,end},limits:{minimumLength:Math.max(0.008,0.5*(wallThickness||0.012)),
      maximumAbsCurvature:250}};
}
function profileInterfaceError(code,reason,details){
  const error=new RangeError('PROFILE INTERFACE REFUSED — '+reason);
  error.name='ProfileLawInterfaceRefusalError';error.code=code;
  error.profileInterface={ok:false,code,reason,...(details||{})};
  return error;
}
function retainedNativeProfileTail(native,startU){
  const u0=Math.max(0,Math.min(1,startU)),
    start=MEH_PROFILE_LAWS.evaluateProfileAt(native,u0),
    scale=1-u0,
    tailLength=native.extent.axialLength-start.x,
    count=Math.max(33,native.sampleCount|0||49),
    stations=[];
  let arcLength=0,prior=null;
  for(let index=0;index<count;index++){
    const u=index/(count-1),globalU=u0+scale*u,
      raw=MEH_PROFILE_LAWS.evaluateProfileAt(native,globalU),
      point={...raw,u,x:raw.x-start.x,
        dxdu:raw.dxdu*scale,drdu:raw.drdu*scale,
        d2xdu2:raw.d2xdu2*scale*scale,
        d2rdu2:raw.d2rdu2*scale*scale};
    if(prior)arcLength+=Math.hypot(point.x-prior.x,point.r-prior.r);
    point.arcLength=arcLength;stations.push(point);prior=point;
  }
  const first=stations[0],last=stations[stations.length-1],
    profileHash=profileCompositeHash(['retained-native-tail-v1',
      native.profileHash,u0,first.r,last.r,tailLength]);
  return {...native,
    label:'retained tangent-compatible tail of '+native.label,
    source:'Retained native tail of '+native.source,
    exactness:'exact-retained-tail-of-'+native.exactness,
    extent:{...native.extent,axialLength:tailLength,
      throatRadius:first.r,mouthRadius:last.r},
    sampleCount:stations.length,profileHash,
    sampleHash:profileCompositeHash([profileHash,stations.length]),
    stations,
    endpoints:{throat:{x:0,r:first.r,slope:first.slope,
      tangentAngle:first.tangentAngle,curvature:first.curvature},
      mouth:{x:tailLength,r:last.r,slope:last.slope,
        tangentAngle:last.tangentAngle,curvature:last.curvature}},
    monotonic:{axial:true,radial:true},
    retainedTail:{active:true,nativeStartU:u0,
      nativeStartX:start.x,nativePrefixLength:start.x,
      nativeProfileHash:native.profileHash,
      reason:'driver-owned handoff tangent excludes the low-slope native prefix'}};
}
function tangentMatchedNativeTail(S,native,startRadius,sourceSlope,sourceSecond){
  const sampleCount=2048,
    probes=Array.from({length:sampleCount+1},(_,index)=>
      MEH_PROFILE_LAWS.evaluateProfileAt(native,index/sampleCount)),
    slopeTolerance=Math.max(1e-7,Math.abs(sourceSlope)*1e-4),
    suffixMonotone=new Array(sampleCount+1).fill(true);
  for(let index=sampleCount-1;index>=0;index--)
    suffixMonotone[index]=suffixMonotone[index+1]&&
      probes[index+1].slope>=probes[index].slope-slopeTolerance;
  let closestSlope=Infinity,maximumNativeSlope=-Infinity;
  for(const point of probes){
    closestSlope=Math.min(closestSlope,Math.abs(point.slope-sourceSlope));
    maximumNativeSlope=Math.max(maximumNativeSlope,point.slope);
  }
  for(let index=1;index<=sampleCount;index++){
    const target=probes[index];
    if(!(target.r>startRadius)||target.slope<sourceSlope-slopeTolerance||
        !suffixMonotone[index])continue;
    const targetSecond=profileSecond(target),
      bridge=boundedC2ProfileBridge(startRadius,target.r,
        sourceSlope,sourceSecond,target.slope,targetSecond,S.wallT||0.012);
    if(!bridge.ok)continue;
    const tangentRun=(target.r-startRadius)/
        Math.max(1e-9,Math.abs(sourceSlope)),
      compactness=bridge.length/Math.max(1e-9,tangentRun),
      noReversal=bridge.minSlope>=sourceSlope-slopeTolerance,
      noOvershoot=bridge.maxSlope<=target.slope+slopeTolerance;
    if(!noReversal||!noOvershoot||compactness>1.25)continue;
    const startU=index/sampleCount,
      tail=retainedNativeProfileTail(native,startU);
    return {ok:true,tail,bridge,target,startU,
      slopeTolerance,compactness,noReversal,noOvershoot,
      tailSlopeMonotone:true,
      minimumBridgeSlope:bridge.minSlope,
      maximumBridgeSlope:bridge.maxSlope,
      maximumNativeSlope};
  }
  return {ok:false,code:'PROFILE_HANDOFF_TANGENT_UNMATCHED',
    reason:'the selected native profile never provides a compact tangent-compatible tail after the driver-owned coax handoff',
    sourceSlope,maximumNativeSlope,closestSlope,slopeTolerance,
    compactnessLimit:1.25,
    requirement:'native tail slope ≥ handoff slope; bridge slope may neither reverse nor overshoot'};
}
function oneWayOuterProfileRecord(S,startRadius,mouthRadius,nominalHalfAngle,waveguide){
  const family=S.profileLaw||PROFILE_LAW_DEFAULTS.profileLaw,
    sourcePoints=waveguide&&waveguide.pts||[],
    last=sourcePoints[sourcePoints.length-1],
    prior=sourcePoints[sourcePoints.length-2],
    sourceSlope=last&&prior
      ?(last.y-prior.y)/Math.max(1e-12,last.x-prior.x)
      :Math.tan(nominalHalfAngle),
    sourceSecond=0, /* registered final triangulated R-OSSE segment is linear */
    delta=mouthRadius-startRadius;
  if(!(delta>0))throw profileInterfaceError('PROFILE_MOUTH_BELOW_HANDOFF',
    'mouth radius must be larger than the protected coax handoff',
    {startRadius,mouthRadius});
  if(family==='conical'){
    const native=monotoneProfileRecord(S,startRadius,mouthRadius,nominalHalfAngle),
      start=native.endpoints.throat,
      slopeError=start.slope-sourceSlope,
      c0Error=start.r-startRadius,
      c1Pass=Math.abs(slopeError)<=0.001;
    if(Math.abs(c0Error)>1e-10||!c1Pass)
      throw profileInterfaceError('PROFILE_DIRECT_JOIN_FAILED',
        'straight conical continuation did not meet the registered coax tangent',
        {c0Error,slopeError});
    const join={ok:true,mode:'direct-c1',label:'direct C1 coax handoff',
      bridgeLength:0,bridgeRise:0,c0Error,c1Error:slopeError,
      c2Error:profileSecond(start)-sourceSecond,
      source:{radius:startRadius,slope:sourceSlope,second:sourceSecond,
        curvatureBasis:'registered final triangulated R-OSSE construction segment'},
      target:{radius:start.r,slope:start.slope,second:profileSecond(start)},
      c0Pass:true,c1Pass:true,c2Pass:Math.abs(profileSecond(start)-sourceSecond)<=1e-8};
    return {...native,interfaceScope:'post-coax-handoff',join};
  }
  if(family!=='classicOS'&&family!=='osse'&&
      family!=='rosse'&&family!=='r-osse'&&family!=='r_osse')
    throw profileInterfaceError('PROFILE_LAW_UNSUPPORTED',
      'one-way outer profile must explicitly select conical, Classic OS, OS-SE or monotone R-OSSE',
      {family});
  /* The protected coax body already exits at its registered tangent. A native
     OS/OS-SE/R-OSSE throat normally launches much more slowly. Bridging
     directly to that virtual throat made a mathematically radial-monotone but
     physically pinched S wall: flare rate fell sharply, then rose again.
     Retain the native law only from its first downstream datum that admits a
     compact C2 bridge with no slope reversal or overshoot. If no such datum
     exists (Classic OS commonly cannot catch an already nominal-angle coax
     exit before its finite mouth), refuse instead of inventing a synthetic S. */
  const native=monotoneProfileRecord(S,startRadius,mouthRadius,
      nominalHalfAngle),
    matched=tangentMatchedNativeTail(S,native,startRadius,
      sourceSlope,sourceSecond);
  if(!matched.ok)throw profileInterfaceError(matched.code,matched.reason,
    {family,startRadius,mouthRadius,nativeProfileHash:native.profileHash,
      tangentFit:matched});
  const tail=matched.tail,target=tail.endpoints.throat,
    targetSecond=profileSecond(target),
    bridge=matched.bridge,
    totalLength=bridge.length+tail.extent.axialLength,
    bridgeArc=bridge.stations[bridge.stations.length-1].arcLength,
    stations=[];
  for(const point of bridge.stations)stations.push({...point,
    u:point.x/totalLength,dxdu:totalLength,
    drdu:point.slope*totalLength,d2rdu2:point.second*totalLength*totalLength});
  for(const point of tail.stations.slice(1)){
    const second=profileSecond(point),x=bridge.length+point.x;
    stations.push({...point,x,u:x/totalLength,dxdu:totalLength,
      drdu:point.slope*totalLength,d2xdu2:0,
      d2rdu2:second*totalLength*totalLength,
      arcLength:bridgeArc+point.arcLength});
  }
  const first=stations[0],end=stations[stations.length-1],
    c0Start=bridge.endpoints.start.r-startRadius,
    c1Start=bridge.endpoints.start.slope-sourceSlope,
    c2Start=bridge.endpoints.start.second-sourceSecond,
    c0End=bridge.endpoints.end.r-target.r,
    c1End=bridge.endpoints.end.slope-target.slope,
    c2End=bridge.endpoints.end.second-targetSecond,
    join={ok:[c0Start,c1Start,c2Start,c0End,c1End,c2End]
      .every(value=>Math.abs(value)<=1e-8),
      mode:'bounded-c2-bridge',label:bridge.label,
      bridgeLength:bridge.length,bridgeRise:bridge.rise,
      maxAbsCurvature:bridge.maxAbsCurvature,
      c0Error:c0Start,c1Error:c1Start,c2Error:c2Start,
      nativeC0Error:c0End,nativeC1Error:c1End,nativeC2Error:c2End,
      c0Pass:Math.abs(c0Start)<=1e-8&&Math.abs(c0End)<=1e-8,
      c1Pass:Math.abs(c1Start)<=1e-8&&Math.abs(c1End)<=1e-8,
      c2Pass:Math.abs(c2Start)<=1e-8&&Math.abs(c2End)<=1e-8,
      source:{radius:startRadius,slope:sourceSlope,second:sourceSecond,
        curvatureBasis:'registered final triangulated R-OSSE construction segment'},
      target:{radius:target.r,slope:target.slope,second:targetSecond},
      limits:{...bridge.limits,compactness:1.25},
      derivation:'first compatible retained native datum; compact C2 bridge may neither reverse nor overshoot flare rate',
      fitMode:'first-compatible-native-datum',
      nativeStartU:matched.startU,
      nativePrefixOmitted:tail.retainedTail.nativePrefixLength,
      requestedNativeThroatSlope:native.endpoints.throat.slope,
      minimumBridgeSlope:matched.minimumBridgeSlope,
      maximumBridgeSlope:matched.maximumBridgeSlope,
      tailSlopeMonotone:matched.tailSlopeMonotone,
      slopeReversal:false,slopeOvershoot:false,
      compactness:matched.compactness,
      compactnessLimit:1.25,
      diagnostic:'TANGENT-MATCHED · low-slope native prefix omitted · flare rate monotone'};
  if(!join.ok)throw profileInterfaceError('PROFILE_BRIDGE_JOIN_FAILED',
    'bounded bridge failed its C0/C1/C2 endpoint contract',{join});
  const profileHash=profileCompositeHash(['oneway-composite-v1',family,
    native.profileHash,tail.profileHash,startRadius,mouthRadius,
    nominalHalfAngle,bridge.length,bridge.rise,bridge.maxAbsCurvature]);
  return {...tail,
    label:bridge.label+' → '+tail.label,
    exactness:'composite-interface-plus-'+tail.exactness,
    source:bridge.label+' followed by '+tail.source,
    extent:{...tail.extent,axialLength:totalLength,throatRadius:startRadius},
    sampleCount:stations.length,profileHash,
    sampleHash:profileCompositeHash([profileHash,stations.length]),
    stations,
    endpoints:{throat:{x:0,r:first.r,slope:first.slope,
      tangentAngle:first.tangentAngle,curvature:first.curvature},
      mouth:{x:totalLength,r:end.r,slope:end.slope,
        tangentAngle:end.tangentAngle,curvature:end.curvature}},
    monotonic:{axial:true,radial:true},
    interfaceScope:'post-coax-handoff',join,nativeProfile:native,
    nativeTailProfile:tail,
    nativeProfileHash:native.profileHash,bridge};
}
function profile(S){
  const th=d2r(S.covH/2);                       // wall angle target (coverage)
  const ht=S.throat*IN/2;
  const hm=S.mouthW*IN/2;
  const sectionN=effectiveSectionExponent(S);
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
    const cgP=coneGeom(S);
    /* The coax retains its short silver center guide. Our removable horn does
       not begin at the recessed compression diaphragm; it begins at that
       guide's exposed mouth in the LF-cone apex. */
    const rHF=cgP.rWG;
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
    const Lh=cgP.coneX;
    /* funnel base per CONSTRUCTION: FIXED horn -> the proud mouth (.60od,
       CAD); REMOVABLE -> the print funnel only wraps the true exit (narrow
       funnel, WIDE saucer - his white print) */
    /* b538 HIS RULING: the print starts ON THE CONE SURFACE and its throat IS the
       hole in the cone - the same plane and the same diameter for BOTH
       constructions (a fixed metal HF horn ends at that hole too; it just gets a
       collar seat instead of a wrap). The .60od funnel base is gone. */
    const rSM=cgP.rCD;
    const rimC=cgP.rCone;
    /* ring pinned MID-ANNULUS [.60,.72]od for BOTH constructions - the funnel
       (internal horn) owns the center either way; his reference holes sit just
       outside the funnel base, which IS this band (correction after the cx5
       render tore holes through the funnel wall) */
    const tapDesign=coaxTapDesign(S,cgP);
    const rP=tapDesign.center;
    /* OWN REPLACEMENT HORN: the OEM flare is removed, so its 43.871/91.880 mm
       acoustic stations must NOT shape the new horn. One forward-only R-OSSE
       solution runs from the true CD exit to the driver-sized baffle handoff.
       The B&C section remains collision/mounting truth only (cone, clearance,
       frame and motor). This eliminates the inherited long narrow tube and
       guarantees a single analytic wall and tangent at the larger-horn throat. */
    const W0=rosseExitFit({r0:rHF,R:rDish,a:th,a0:0,n:256},Math.tan(th));
    const WG={ok:W0.ok,pts:W0.ok?W0.pts.map(p=>({x:p.x,y:p.y})):[],
      L:W0.L||0,depth:W0.depth||0,inner:W0,transition:null,outer:W0,
      coneX:cgP.coneX,stockX:cgP.stockX,cdThroat:cgP.rHF,
      silverMouth:cgP.rWG,ownHorn:true};
    const La=WG.ok? WG.depth : cgP.stockX+Math.max(0.008,cgP.dep);
    const htC=rHF;
    const x0F=0;
    const spanF=Math.max(0.008,La);
    const tanT=Math.sqrt(Math.max(1e-9,rDish*rDish-rHF*rHF))/spanF;
    const osR=x=>Math.sqrt(rHF*rHF+Math.pow(x*tanT,2));
    const faceR=x=>{ if(!WG.ok) return osR(x);
      const u=x, p=WG.pts;
      if(u<=p[0].x) return p[0].y;
      for(let i=1;i<p.length;i++){ if(u<=p[i].x){ const a=p[i-1], b2=p[i];
          return a.y+(b2.y-a.y)*(u-a.x)/Math.max(1e-12,(b2.x-a.x)); } }
      return p[p.length-1].y; };
    const xTap=WG.ok? rosseXat(WG,rP) : Math.sqrt(Math.max(0,rP*rP-rHF*rHF))/tanT;
    const rAt=x=>faceR(x);
    /* The driver-matched R-OSSE, cone taps and circular seam above are a fixed
       interface.  Profile selection owns only the OUTER carrier after `La`.
       Conical joins directly at C1. Classic OS, OS-SE and monotone-truncated
       R-OSSE receive the separately named bounded C2 bridge returned by
       oneWayOuterProfileRecord(); no native law is attached with a hidden
       tangent kink and no rollback surface is implied. */
    const outer=oneWayOuterProfileRecord(S,rDish,hm,th,WG),
      depth=La+outer.extent.axialLength,pts=[],
      vm=Math.max(hm*Math.tan(d2r(S.covV/2))/Math.tan(th),rDish*1.05),
      radialSpan=Math.max(1e-12,hm-rDish);
    /* The complete protected interface remains circular through its registered
       seam. Cross-section morph begins strictly downstream with zero launch
       derivative, independently from the selected meridional profile. */
    for(let i=0;i<=40;i++){ const x=La*i/40,r=rAt(x);
      pts.push({x,h:r,v:r,nOv:2}); }
    for(const point of outer.stations.slice(1)){
      const u=Math.max(0,Math.min(1,point.x/Math.max(1e-12,outer.extent.axialLength))),
        sm=u*u*(3-2*u),
        radialProgress=Math.max(0,Math.min(1,(point.r-rDish)/radialSpan));
      pts.push({x:La+point.x,h:point.r,
        v:rDish+(vm-rDish)*radialProgress,
        nOv:2+(sectionN-2)*sm});
    }
    /* Round/equal-axis is the native radial construction. A square or stretched
       section consumes the same stations as an explicitly labelled engineering
       topology; it is not a verified coverage transformation. */
    const exactRound=S.style!=='angular'&&Math.abs((S.covH||0)-(S.covV||0))<1e-9&&sectionN===2,
      topologyClass=exactRound?'exact axisymmetric round':
        'engineering approximation — non-round section mapping';
    return {pts,depth,rollR:0,mouthH:hm,xAdapter:La,xTap,rBore:htC,
      wgFace:WG,wgX0:0,xPrint:(S.hornType==='removable')?0:Lh,
      profileLaw:outer,profileLawId:outer.lawId,profileLawLabel:outer.label,
      profileHash:outer.profileHash,profileEndpoints:outer.endpoints,
      profileMonotonic:outer.monotonic,nativeTermination:outer.nativeTermination,
      terminationPolicy:outer.terminationPolicy,
      profileJoin:outer.join,profileOriginX:La,profileScope:'post-coax-handoff',
      profileTopologyClass:topologyClass,
      mouthTermination:'flat printed baffle; no additional rollback'};
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
    if(S.twoDesign==='hinson10'){
      /* The documented Hinson plywood horn is four single, straight bearing
         panels meeting at the throat block.  It has no Waslo/JMOD second-
         expansion break: adding one makes every panel kink and produces the
         curved/pinched outer frame seen in the failed preview.  Keep the
         horizontal and vertical coverage slopes independent so the section
         remains a true rectangular truncated pyramid. */
      const depth=Math.max(0.06,(hm-ht)/Math.tan(th)),pts=[],N=40;
      for(let i=0;i<=N;i++){
        const x=depth*i/N;
        pts.push({x,h:ht+Math.tan(th)*x,v:vt+Math.tan(thV)*x});
      }
      return {pts,depth,rollR:0,mouthH:hm,xBreak:depth,
        slopeCos:Math.cos(th),panelProfile:'single-plane'};
    }
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
  /* Smooth non-coax horns now consume the canonical monotone-law record.
     Forty-nine samples preserve each selected acoustic body exactly.
     The old ten-point display-only torus is intentionally gone: two-way
     manufacturing already stopped at `depth`, so the honest construction is
     a flat printed/baffle termination until a separately validated mouth
     topology exists. R-OSSE retains its published forward body and stops
     before the native axial reversal; native rollback is not approximated. */
  const law=monotoneProfileRecord(S,ht,hm,th);
  const pts=law.stations.map(point=>({x:point.x,h:point.r}));
  return {pts,depth:law.extent.axialLength,rollR:0,mouthH:hm,
    profileLaw:law,profileLawId:law.lawId,profileLawLabel:law.label,
    profileHash:law.profileHash,profileEndpoints:law.endpoints,
    profileMonotonic:law.monotonic,nativeTermination:law.nativeTermination,
    terminationPolicy:law.terminationPolicy,
    mouthTermination:'flat printed baffle; no additional rollback'};
}

/* Stations share one meridian while the selected exact cross-section tracks
   its two half-axes.  Rounded rectangles carry a dimensionless corner
   roundness so the legal radius is re-derived at every station; smoothstep
   gives a monotone C1 transition from a fully rounded throat-side section to
   the selected mouth roundness. */
function stations(S){
  const pr=profile(S);
  const curvedFacets=S.style==='curvedFacets',
    sectionN=effectiveSectionExponent(S),
    sectionSchema=sectionFamilySchema(S.sectionFamily||'superellipse'),
    sectionFamily=curvedFacets?'curvedFacets':
      (sectionSchema&&sectionSchema.supported
        ?sectionSchema.family:'superellipse'),
    cornerTarget=Math.max(0.05,Math.min(1,
      Number.isFinite(+S.sectionCornerRatio)?+S.sectionCornerRatio:0.25));
  const ar=Math.tan(d2r(S.covV/2))/Math.tan(d2r(S.covH/2));   // vertical/horizontal
  const morphAmount=(x)=>{
    const t=Math.min(1, x/(0.45*pr.depth)), s=t*t*(3-2*t);
    return s;
  };
  const morph=(x)=>{ if(S.style==='angular'||curvedFacets) return sectionN;
    return 2+(sectionN-2)*morphAmount(x); };             // M5/pin #20: ROUND at the CD exit -> the chosen exact section
  const nSt=(S.placeW==='chamfer')? Math.min(sectionN,11.5) : sectionN;   // corner boards live on chamfers - keep them
  return { form:'section', n:nSt, style:S.style,sectionFamily,
           wallTopology:curvedFacets?'curvedFacets':
             (S.style==='angular'?'classicAngular':'smooth'),
           sectionCornerRatio:cornerTarget,
           pts:pr.pts.map(p=>{ const a=p.h,b=(p.v!==undefined)?p.v:p.h*ar,
             cornerRatio=1+(cornerTarget-1)*morphAmount(p.x);
             return {x:p.x,a,b,roll:p.roll,cornerRatio,
               cornerR:Math.min(a,b)*cornerRatio,
               n:(p.nOv!==undefined)?p.nOv:morph(p.x)}; }),   // Reference D: the dish stays ROUND inside an angular horn
           depth:pr.depth, rollR:pr.rollR, throat:(pr.rBore!==undefined)?pr.rBore:S.throat*IN/2, ar, xBreak:pr.xBreak, slopeCos:pr.slopeCos, xAdapter:pr.xAdapter, xTap:pr.xTap, xPrint:pr.xPrint,
           profileLaw:pr.profileLaw,profileLawId:pr.profileLawId,
           profileLawLabel:pr.profileLawLabel,profileHash:pr.profileHash,
           profileEndpoints:pr.profileEndpoints,profileMonotonic:pr.profileMonotonic,
           nativeTermination:pr.nativeTermination,terminationPolicy:pr.terminationPolicy,
           mouthTermination:pr.mouthTermination,profileJoin:pr.profileJoin,
           profileOriginX:pr.profileOriginX,profileScope:pr.profileScope,
           profileTopologyClass:pr.profileTopologyClass,
           wgFace:pr.wgFace, wgX0:pr.wgX0 };   // b539: the printed R-OSSE wall travels with the stations - one curve, every consumer
}
function dimsAt(st,x){
  const P=st.pts;
  if(x<=P[0].x) return {a:P[0].a,b:P[0].b,n:P[0].n,
    cornerR:P[0].cornerR,cornerRatio:P[0].cornerRatio};   // keep the per-station shape (the round dish start was evaluating square)
  for(let i=1;i<P.length;i++){ if(P[i].x>=x){ const f=(x-P[i-1].x)/((P[i].x-P[i-1].x)||1e-9),
      a=P[i-1].a+(P[i].a-P[i-1].a)*f,
      b=P[i-1].b+(P[i].b-P[i-1].b)*f,
      cornerRatio=(P[i-1].cornerRatio!==undefined)
        ?P[i-1].cornerRatio+(P[i].cornerRatio-P[i-1].cornerRatio)*f:undefined;
    return {a,b,
            n:(P[i-1].n!==undefined)? P[i-1].n+(P[i].n-P[i-1].n)*f : undefined,
            cornerR:cornerRatio!==undefined?Math.min(a,b)*cornerRatio:undefined,
            cornerRatio}; } }
  const q=P[P.length-1]; return {a:q.a,b:q.b,n:q.n,
    cornerR:q.cornerR,cornerRatio:q.cornerRatio};
}
function stationDerivative(st,x,key){
  const e=Math.max(1e-6,st.depth/4096),
    x0=Math.max(0,x-e),x1=Math.min(st.depth,x+e),
    den=Math.max(1e-12,x1-x0);
  return (dimsAt(st,x1)[key]-dimsAt(st,x0)[key])/den;
}
function curvedFacetPoint(st,x,face,u){
  x=Math.max(0,Math.min(st.depth,x));
  u=Math.max(-1,Math.min(1,+u||0));
  const d=dimsAt(st,x);
  if(face==='top')return [x,u*d.a,d.b];
  if(face==='bottom')return [x,u*d.a,-d.b];
  if(face==='right')return [x,d.a,u*d.b];
  if(face==='left')return [x,-d.a,u*d.b];
  throw new RangeError('unknown curved facet '+face);
}
function curvedFacetNormal(st,x,face,u){
  void u;
  const da=stationDerivative(st,x,'a'),db=stationDerivative(st,x,'b');
  let n;
  if(face==='top')n=[-db,0,1];
  else if(face==='bottom')n=[-db,0,-1];
  else if(face==='right')n=[-da,1,0];
  else if(face==='left')n=[-da,-1,0];
  else throw new RangeError('unknown curved facet '+face);
  const L=Math.hypot(...n)||1;
  return n.map(value=>value/L);
}
function curvedFacetFlatPattern(st,face){
  const horizontal=face==='top'||face==='bottom',
    vertical=face==='right'||face==='left';
  if(!horizontal&&!vertical)throw new RangeError('unknown curved facet '+face);
  const edgeKey=horizontal?'a':'b',curveKey=horizontal?'b':'a',
    upper=[],lower=[];
  let arc=0,previous=null,maxChordDeviation=0;
  const first=st.pts[0],last=st.pts[st.pts.length-1],
    chordAt=x=>first[curveKey]+
      (last[curveKey]-first[curveKey])*
      ((x-first.x)/Math.max(1e-12,last.x-first.x));
  for(const station of st.pts){
    if(previous)arc+=Math.hypot(station.x-previous.x,
      station[curveKey]-previous[curveKey]);
    const edge=station[edgeKey];
    upper.push([arc,edge]);lower.push([arc,-edge]);
    maxChordDeviation=Math.max(maxChordDeviation,
      Math.abs(station[curveKey]-chordAt(station.x)));
    previous=station;
  }
  return {face,developable:true,requiresForming:maxChordDeviation>0.00025,
    maxChordDeviation,arcLength:arc,
    points:upper.concat(lower.reverse())};
}
function curvedFacetDiagnostics(st){
  if(!st||st.style!=='curvedFacets')return null;
  const faces=['top','right','bottom','left'].map(face=>
    curvedFacetFlatPattern(st,face));
  return {style:'curvedFacets',seamCount:4,developable:true,
    doubleCurved:false,
    requiresForming:faces.some(face=>face.requiresForming),
    maxChordDeviation:Math.max(...faces.map(face=>face.maxChordDeviation)),
    faces};
}
/* Compact fixed-physical-scale witness for the profile drawer.  It is fed by
   the solved station ladder, not by a second UI approximation.  Both the
   selected meridian and the endpoint-matched conical chord use the same
   metre-to-pixel scales, so switching laws cannot be hidden by auto-framing. */
function profileMeridianWitness(st,options){
  options=options||{};
  const width=Math.max(120,+options.width||240),
    height=Math.max(56,+options.height||96),
    pad=Math.max(4,+options.pad||8),
    maxDepthM=Math.max(0.25,+options.maxDepthM||1.25),
    maxRadiusM=Math.max(0.10,+options.maxRadiusM||0.85),
    xPx=x=>pad+Math.max(0,Math.min(maxDepthM,x))/maxDepthM*(width-2*pad),
    yPx=(r,sign)=>height/2-sign*Math.max(0,Math.min(maxRadiusM,r))
      /maxRadiusM*(height/2-pad),
    points=st&&Array.isArray(st.pts)
      ?st.pts.filter(point=>!point.roll&&point.x<=st.depth+1e-9):[];
  if(points.length<2)return {ok:false,code:'PROFILE_STATIONS_UNAVAILABLE',
    width,height,maxDepthM,maxRadiusM};
  const path=(list,sign)=>list.map((point,index)=>
      (index?'L':'M')+xPx(point.x).toFixed(3)+' '+yPx(point.a,sign).toFixed(3))
    .join(' '),
    first=points[0],last=points[points.length-1],
    reference=[first,last];
  return {ok:true,width,height,maxDepthM,maxRadiusM,
    selectedPath:path(points,1)+' '+path(points.slice().reverse(),-1),
    selectedUpperPath:path(points,1),selectedLowerPath:path(points,-1),
    referencePath:path(reference,1)+' '+path(reference.slice().reverse(),-1),
    referenceUpperPath:path(reference,1),referenceLowerPath:path(reference,-1),
    profileHash:st.profileHash||'unhashed',
    profileLawId:st.profileLawId||'unknown',
    depthM:st.depth,mouthRadiusM:last.a,
    clipped:st.depth>maxDepthM||last.a>maxRadiusM,
    scaleLabel:'fixed 0–'+maxDepthM.toFixed(2)+' m axial / ±'
      +maxRadiusM.toFixed(2)+' m radial'};
}
/* surface point + outward normal at station x, azimuth phi */
function surfPt(st,x,phi){
  const d=dimsAt(st,x),nn=(d.n!==undefined)?d.n:st.n;
  const [y,z]=sectionPoint2D(st.sectionFamily||'superellipse',
    d.a,d.b,nn,d.cornerR,phi,st.style);
  return [x,y,z];
}
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
  const d=dimsAt(st,x), ring=sectionRing2D(st.sectionFamily||'superellipse',
    d.a,d.b,(d.n!==undefined)?d.n:st.n,d.cornerR,64,st.style);
  let L=0; for(let i=0;i<ring.length;i++){ const j=(i+1)%ring.length;
    L+=Math.hypot(ring[j][0]-ring[i][0],ring[j][1]-ring[i][1]); }
  return L;
}
/* smallest station whose PLACED ring truly clears: equal-arc seats, measured chords.
   No heuristic factors - construct the candidate and measure it (v5 discipline). */
function ringSeats(st,x,n,K,off){
  const d=dimsAt(st,x), ring=sectionRing2D(st.sectionFamily||'superellipse',
    d.a,d.b,(d.n!==undefined)?d.n:st.n,d.cornerR,K,st.style);
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
      const value=t*(vertical?d.b:d.a)*0.60,
        p=sectionAxisPoint2D(st.sectionFamily||'superellipse',
          d.a,d.b,nn,d.cornerR,value,vertical,sgn);   // proven normals via surfN
      out.push(p);
    } };
  put(nT,1); put(nB,-1);
  return out;
}
/* PIN #9: the flat-panel model for CLASSIC ANGULAR. Vertices mirror panelRing. */
function facetsAt(st,x){
  const d=dimsAt(st,x),V=panelVerts(d.a,d.b,12);
  const out=[];
  for(let i=0;i<V.length;i++){ const p=V[i], q=V[(i+1)%V.length];
    const len=Math.hypot(q[0]-p[0],q[1]-p[1])||1e-9;
    const dir=[(q[0]-p[0])/len,(q[1]-p[1])/len];
    const mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    let n2=[dir[1],-dir[0]];
    if(n2[0]*mid[0]+n2[1]*mid[1]<0) n2=[-n2[0],-n2[1]];   // outward
    out.push({p,q,mid,dir,len,n2,ch:false});
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
  if(st.style!=='angular'){ const d=dimsAt(st,x),nn=(d.n!==undefined)?d.n:st.n,
      family=st.sectionFamily||'superellipse',
      curved=st.style==='curvedFacets',
      offA=curved?wt*Math.hypot(1,stationDerivative(st,x,'a')):wt,
      offB=curved?wt*Math.hypot(1,stationDerivative(st,x,'b')):wt,
      cornerR=family==='roundedRectangle'?d.cornerR+wt:d.cornerR;
    return sectionRing2D(family,d.a+offA,d.b+offB,nn,cornerR,M,st.style); }
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
  const A2=S.topo==='2way'?twoArch(S):null;
  const archMode=A2&&A2.placement==='opposed'?(ratio>=1?'pairsV':'pairsH')
                :A2&&A2.placement==='ring'?'ring'
                :A2&&A2.placement==='diag'?'diag'
                :auto;
  const modeW=(S.placeW&&S.placeW!=='auto')? S.placeW : archMode; // architecture owns AUTO; explicit placement remains an advanced override
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
  /* A two-way driver mount and its acoustic entry are different stations.
     The old engine welded them together, which forced large frames deep into
     the horn and made high crossover designs impossible. Hinson's sculpted
     plate is the physical counterexample: the cone seals on a broad relieved
     land while the paired slots reach throatward under that same cone.
     Manual/published station wins; otherwise λ/4 + the selected margin derives
     the entry. It is then clamped only to the horn, never to the mount. */
  let xTapW=xW;
  if(S.topo==='2way'&&xW!=null){
    if(Number.isFinite(+S.tapStationW)&&+S.tapStationW>0) xTapW=(+S.tapStationW)/1000;
    else if(Number.isFinite(+S.twoXO)&&+S.twoXO>0)
      /* λ/4 gives the FARTHEST legal tap. A closer entry only increases the
         null margin, so a calculated design never pushes its tap downstream
         past the cone's own mount station merely to consume the full budget. */
      xTapW=Math.min(xW,C/(4*1.2*(+S.twoXO)));
    xTapW=Math.max(0.006,Math.min(st.depth-0.006,xTapW));
  }
  /* v4 LAW: the tap->diaphragm path makes a lambda/4 reflection NULL at C/(4*path);
     cross 1.2x BELOW it so the notch stays clear of the LR4 corner. */
  const XOK=1/1.2;
  S.fxDerived={ hi: xM!=null? Math.round(XOK*C/(4*((S.topo==='3way'?xM:xW||st.depth)+S.cdDepth*IN))) : null,
                lo: xW!=null? Math.round(S.topo==='2way'&&S.twoXO?+S.twoXO:XOK*C/(4*(S.topo==='2way'?xTapW:(xW+S.cdDepth*IN)))) : null };
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
    const d=dimsAt(st,x), n=(d.n!==undefined)?d.n:st.n,
      family=st.sectionFamily||'superellipse',
      cornerR=family==='roundedRectangle'?d.cornerR+wt:d.cornerR;
    return sectionLevel2D(family,d.a+wt,d.b+wt,n,cornerR,y,z)<0;
  };
  /* Geometry-derived finite search domain for landRaise. The former 160 mm
     ceiling was not a physical boundary: an axial frame could reach that
     number with one rim azimuth still buried, then be emitted as a fictional
     162 mm "clear" land. A ray must leave the SIDE wall before reaching the
     horn's real envelope; crossing the throat or mouth plane is not accepted
     as a fake clearance event. */
  const landBounds=(()=>{
    const wt=S.wallT||0.012, b={lo:[1e-4,0,0],hi:[st.depth-1e-4,0,0]};
    let ym=0,zm=0;
    for(const sp of st.pts){
      const x=Math.max(1e-4,Math.min(st.depth-1e-4,sp.x));
      if(S.style==='angular'){
        for(const p of offsetVerts(st,x,wt)){
          ym=Math.max(ym,Math.abs(p[0])); zm=Math.max(zm,Math.abs(p[1]));
        }
      }else{
        const d=dimsAt(st,x);
        ym=Math.max(ym,d.a+wt); zm=Math.max(zm,d.b+wt);
      }
    }
    b.lo[1]=-ym;b.hi[1]=ym;b.lo[2]=-zm;b.hi[2]=zm;
    return b;
  })();
  const rayDomainExit=(p,A)=>{
    let t=Infinity;
    for(let k=0;k<3;k++){
      if(A[k]>1e-10)t=Math.min(t,(landBounds.hi[k]-p[k])/A[k]);
      else if(A[k]<-1e-10)t=Math.min(t,(landBounds.lo[k]-p[k])/A[k]);
    }
    return t;
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
      const exit=rayDomainExit(p0,A), end=exit-1e-5;
      if(!(end>0)&&Number.isFinite(end)) return Infinity;
      let lo=0, hi=Math.min(0.004,end);
      while(hi<end && outerHas(p0[0]+A[0]*hi,p0[1]+A[1]*hi,p0[2]+A[2]*hi)){
        lo=hi; hi=Math.min(end,hi+0.004);
      }
      /* Still solid immediately before the actual envelope boundary: there
         is no side-wall exit on this ray, so the mount is infeasible. */
      if(!(hi>0)||outerHas(p0[0]+A[0]*hi,p0[1]+A[1]*hi,p0[2]+A[2]*hi)) return Infinity;
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
      if(S.topo!=='2way'&&S.mount==='axial') drv.mountN=[-1,0,0]; // axial is not a valid two-way cone-to-chamber orientation
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
      const p=[xW,q[0],q[1]], ph=(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]);
      const nMount=(q.facet!==undefined)? facetN(st,xW,q.facet)
              : surfN(st,xW,(q.param!==undefined)?q.param:Math.atan2(q[1],q[0]));   // PROVEN normal per style
      const xt=S.topo==='2way'?xTapW:xW;
      const tp=S.topo==='2way'?surfPt(st,xt,ph):p;
      const nTap=S.topo==='2way'?surfN(st,xt,ph):nMount;
      const dv=[tp[0]-p[0],tp[1]-p[1],tp[2]-p[2]];
      const axial=dv[0]*nMount[0]+dv[1]*nMount[1]+dv[2]*nMount[2];
      const lateral=[dv[0]-axial*nMount[0],dv[1]-axial*nMount[1],dv[2]-axial*nMount[2]];
      const drv={kind:'woof', x:xt, mountX:xW, phi:Math.atan2(tp[2],tp[1]), center:p,
        mountNormal:nMount, normal:nTap, od:S.odW*CM, dp:S.dpW*CM, tap:tp,
        feedOffset:Math.hypot(...lateral), feedLength:Math.hypot(...dv),
        seatR:S.odW*CM/2+0.011, facet:q.facet};
      if(S.topo!=='2way'&&S.mount==='axial') drv.mountN=[-1,0,0]; // two-way cones always follow their local horn normals
      { const lh=landRaise(p,drv.mountN||nMount,S.odW*CM/2); if(lh) drv.landH=lh; }   // pin #23: measured along the MOUNT axis
      const fc=flowCross(nTap); drv.flowU=fc.u; drv.crossV=fc.v;
      out.push(drv);
    }
  }
  if(S.topo==='3way' && xM!=null) placeRing('mid', xM, (S.nM|0)||4, S.odM*CM, S.dpM*CM, offM, modeM);
  if(S.topo!=='1way' && xW==null && modeW!=='chamfer') out.missing=true;   // v3 boards: the chamfer block judges its own landing
  if(S.topo==='3way' && xM==null) out.missing=true;
  if(S.topo==='1way'){
    /* PIN #8 (his spec): ONE coax driver - the horn IS the CD's waveguide; the cone
       section fires through a tap-slot ring in the printed apex plate. */
    const cgL=coneGeom(S);
    const tapDesign=coaxTapDesign(S,cgL);
    const nT=tapDesign.N;
    const xT=(st.xTap!==undefined)? st.xTap : (st.xAdapter||0.02)*0.85;   // the ring station derives from the DRIVER (photo canon)
    const taps=[]; let rMax=0;
    for(let k=0;k<nT;k++){ const a2=(k+0.5)/nT*2*Math.PI;
      const p=surfPt(st,xT,a2); taps.push([a2,p]); rMax=Math.max(rMax,Math.hypot(p[1],p[2])); }
    const fxCo=Math.round(tapDesign.fx);
    S.fxDerived={hi: fxCo, lo: fxCo};
    const apC=tapDesign.area*1e4;
    /* The circular diameter is the acoustic solution. Never cap or squeeze it
       to make an invalid state look printable. */
    const holeR=tapDesign.r;
    let sbC=holeR, saC=holeR;
    { const rDishL=cgL.rFrame+0.012;
      const rBL=cgL.rCD+0.0005;
      const rPL=rMax;
      const w0=Math.min(Math.max(sbC*1.6,0.010),(rDishL-rBL)/2*0.9);
      const rInL=Math.max(rBL+0.0005,rPL-w0), rOutL=Math.min(rDishL-0.001,rPL+w0);
      var bandC={w0,rIn:rInL,rOut:rOutL};
    }
    const apEmC=(4*saC*sbC-(4-Math.PI)*sbC*sbC)*1e4;   // cm^2 EMITTED per slot
    for(const [a2,p] of taps){ const nrm=surfN(st,xT,a2);
      out.push({kind:'coaxtap', x:xT, phi:a2, center:p, normal:nrm, od:0.02, dp:0,
        tap:p, seatR:sbC+0.004, slot:{sa:saC, sb:sbC, ap:apC, apEm:apEmC,
          band:bandC, radial:true, design:tapDesign}}); }
    /* The complete driver mounts BEHIND the horn. Its front/frame plane is the
       measured LF-cone datum; only the replacement waveguide and tap bores run
       forward. Never place the driver at xAdapter (inside the MEH flare). */
    /* The exposed silver coax mouth is the horn datum x=0. The LF cone rises
       around it to the frame/mounting plane at +cone depth. This is the
       relationship visible in the real front and cutaway photographs. */
    out.coax={od:(S.odW? S.odW*CM : (S.odC||0.22)),
      dp:(S.dpW? S.dpW*CM : (S.dpC||0.11)), mountX:cgL.dep,
      rearX:cgL.dep-(S.dpW? S.dpW*CM : (S.dpC||0.11))};        // PIN #21: the coax IS the chosen woofer
  }
  return out;
}

/* Farthest actual cutter point projected into the driver/cone plane. This is
   the physical “does the entry still open under the moving cone?” test. It
   deliberately does not add unrelated lengths as scalars: slot angle, pair
   offset and mount tilt are sampled in their real vectors. */
function projectedSlotReach(d,slot){
  if(!d||!slot) return d&&d.feedOffset||0;
  const A=d.mountN||d.mountNormal||d.normal, n=d.normal;
  const outline=slotOutline(slot,48), np=slot.np||1;
  let far=0;
  for(let kp=0;kp<np;kp++){
    const sg=kp===0?-1:1;
    let u=d.flowU, v=d.crossV;
    if(np>=2&&!slot.round){ const c=Math.SQRT1_2;
      u=[(u[0]+sg*v[0])*c,(u[1]+sg*v[1])*c,(u[2]+sg*v[2])*c];
      v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]]; }
    const off=np>=2?sg*(slot.offm||0):0;
    for(const o of outline){
      const p=[d.tap[0]+off*d.crossV[0]+o[0]*u[0]+o[1]*v[0],
               d.tap[1]+off*d.crossV[1]+o[0]*u[1]+o[1]*v[1],
               d.tap[2]+off*d.crossV[2]+o[0]*u[2]+o[1]*v[2]];
      const q=[p[0]-d.center[0],p[1]-d.center[1],p[2]-d.center[2]];
      const ax=q[0]*A[0]+q[1]*A[1]+q[2]*A[2];
      far=Math.max(far,Math.hypot(q[0]-ax*A[0],q[1]-ax*A[1],q[2]-ax*A[2]));
    }
  }
  return far;
}

/* ---- ACOUSTIC LAWS (ported from v4's sourced corpus) ----
   CR bands (Waslo calc sheet): mids 4..8:1, woofers 2.5..6:1. In the rebuilt
   TWO-WAY path Ap is either a published/measured value or Sd / declared CR;
   17 m/s is diagnostic only. Front chamber Vtc + tap mass form the acoustic
   low-pass and must clear the selected XO. Slot area is emitted exactly. */
function acoustics(S,L,st){
  const out={rows:[]};
  const add=(sec,name,val,ok,warn,why,grow)=>out.rows.push({sec,name,val,st:ok?'ok':(warn?'warn':'fail'),why,grow:!!grow});
  const kinds=[];
  /* v4 SOURCED LAW (compendium): peak port velocity = CR * 2pi * fLOW * xm at the
     BAND'S LOW EDGE (woofers run to the external LF handoff / excursion
     reference, often ~80 Hz; mids run to their lower crossover).
     Ap derives FROM the 17 m/s limit, clamped into the CR band (w 2.5-6, m 4-8). */
  if(S.topo!=='1way') kinds.push(['woof', S.sdW||300,
    (S.topo==='2way'&&S.tapVtcW?+S.tapVtcW:(S.vtcW||150)), S.xmW||7,
    S.topo==='2way'?[2.5,10.0]:[2.5,6.0], S.subXO||80,
    S.fxDerived&&S.fxDerived.lo, (S.npW|0)||1]);
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
    const two=(kind==='woof'&&S.topo==='2way');
    const explicit=two&&(S.tapBasis==='published'||S.tapBasis==='manual')&&(+S.tapAreaW)>0;
    const crVel=17/(2*Math.PI*fLow*(xm/1000));           // diagnostic only on the rebuilt two-way
    const crTarget=Math.max(1.5,Math.min(20,+S.tapCRW||4.5));
    const cr=danley? sd/apRec : two?(explicit?sd/(+S.tapAreaW):crTarget)
                                 :Math.max(1.5, Math.min(band[1], crVel));
    const ap=danley? apRec : two?(explicit?(+S.tapAreaW):sd/crTarget)
                                 :sd/cr;                 // total open area per driver
    const shp=(kind==='mid'? S.shM : S.shW)||'slot';       // his call: ROUND is classic for many horns
    for(const d of drs){ const apP=ap/(np||1), A=apP*1e-4;  // pin #19: area split across the ports
      let saM,sbM;
      const exact=two&&(+S.tapSlotL)>0&&(+S.tapSlotW)>0;
      if(exact){ saM=(+S.tapSlotL)/2000; sbM=(+S.tapSlotW)/2000; }
      else if(shp==='round'){ saM=sbM=Math.sqrt(A/Math.PI); }
      else{ sbM=Math.sqrt(A/(8+Math.PI)); saM=3*sbM; }      // b532: EXACT 3:1 stadium ((8+π)·sb² = A) - the rect model under-cut every slot 7.15%
      if(d.board&&shp!=='round'){
        /* v3.1 corner boards: the opening cuts THROUGH the walls at the seam
           (SH-96 side-wall openings, JMOD seam teardrops) - the board CHAMBER
           must still cover it; elongate along the wall at constant area if
           the chamber coverage binds (cone-fit law grades the consequence) */
        const sbMax=Math.max(0.008, d.board.half-0.012);
        if(sbM>sbMax){ sbM=sbMax; saM=(A+(4-Math.PI)*sbM*sbM)/(4*sbM); } }   // exact stadium inversion
      const apEm=(shp==='round'? Math.PI*saM*saM : 4*saM*sbM-(4-Math.PI)*sbM*sbM)*1e4*(np||1);   // cm^2 per driver, EMITTED
      const rSd=Math.sqrt(sd*1e-4/Math.PI);
      /* Every paired entry is a real straddling pair, including the
         three-way path. Restricting this offset to `two` collapsed 3-way
         pairs onto one another: the UI still drew two cutters, but both
         occupied the same acoustic opening. */
      const modelPairOff=!exact&&((np||1)>=2)
        ?Math.max(0.008,Math.min(0.18*d.od,0.5*Math.max(0.016,rSd-saM-(d.feedOffset||0))))
        :null;
      d.slot={sa:saM, sb:sbM, ap:ap, apEm, np:np||1, round:shp==='round',
        teardrop:shp==='teardrop', exact,
        offm:(np||1)>=2? (exact?Math.min(0.22*d.od,saM*0.72):modelPairOff) : 0}; // calculated pair offset spends only the active-cone radius available after the slot
    }
    /* b532 PORT TRUTH: the graded rows ride the EMITTED area (what the print
       actually cuts) - identical to the demand unless a clamp bit */
    const apEmD=drs[0].slot.apEm, crEm=sd/apEmD;
    add(kind.toUpperCase(),'Compression ratio Sd/Ap',crEm.toFixed(1)+':1',
      danley||two? crEm>=1.5&&crEm<=12 : crEm>=band[0],
      danley||two? crEm>=1.2&&crEm<=15 : crEm>=band[0]*0.6,
      danley? 'DANLEY DIALECT: '+(kind==='mid'?'one 3/4in round tap per mid':'one 2.5in round corner tap per woofer')+' = the SH-50 tape-measured record (van Ommen, diyaudio 292379 #4957246; chrisbln thing:6886663 ships the same 2.5in as canon), shipped as an area-matched '+(drs[0].slot.round?'round hole':'stadium (shape follows the tap-shape knob)')+'. His SH-96 interior shot confirms the CONSTRUCTION but shows no vent (side-wall circles = handle cups, b531). An SH-96 vent measurement would harden this number'
            : two? ((explicit?'published/manual total open area':'calculated from the declared target Sd/Ap')+'; Hinson warns that excessive compression can damage cones, so the two-way gate refuses >12:1 before prototype evidence')
            : (crEm<band[0]?'below the classic band - big ports, mild loading (JMOD territory); excursion-limited duty':'derived from the 17 m/s limit, graded against the band; rides the EMITTED cut area (b532)'));
    const vel=crEm*2*Math.PI*fLow*(xm/1000);
    add(kind.toUpperCase(),'Port velocity at band low edge ('+fLow+' Hz)',vel.toFixed(1)+' m/s',
      danley||two? true : vel<=17.2, danley||two? true : vel<=20,
      danley? 'DANLEY DIALECT: the worst-case formula (CR*2pi*f*xm, nc535 heuristic) reads this number, yet Danley ships exactly these taps - horn loading keeps real excursion far under xm at the band edge. Stated, not graded'
            : two? 'diagnostic only: 17 m/s is Hinson’s rear bass-reflex chuffing criterion, not a MEH tap-sizing law. Size the entry from Hornresp/BEM, chamber mass and measured SPL/excursion'
            : 'nc535 worst-case heuristic (17 m/s ~ reflex chuffing onset, Hinson MEH.pdf p.19), evaluated at the band bottom on the EMITTED cut area');
    /* his pins #20/#21: the tap must OPEN INTO THE CONE, not the frame. Sd
       sets the emissive radius (sqrt(Sd/pi)); the farthest lit point of the
       opening (pair offset + half-length) must stay inside it. Hinson canon:
       the tap works the volume trapped UNDER the cone - a hole past the cone
       rim connects nothing. */
    { const s0=drs[0].slot, rSd=Math.sqrt(sd*1e-4/Math.PI);
      const need=projectedSlotReach(drs[0],s0);
      add(kind.toUpperCase(),'Tap opening fits the cone',
        (need*1000).toFixed(0)+' vs '+(rSd*1000).toFixed(0)+' mm (Sd radius)',
        need<=rSd, need<=1.1*rSd,
        'the port must land on the cone that drives it; a straddling pair or a second tap shrinks each opening'); }
    /* REAL port length: print wall + 0.85r end correction (matches the response
       network); b532: rides the EMITTED area like every physical row */
    const lpt=two&&(+S.tapLptW)>0?(+S.tapLptW)/1000
      :(S.wallT||0.012)+0.85*Math.sqrt(apEmD*1e-4/Math.PI);
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
    let vtcEff=vtc;
    if(two&&S.tapBasis==='model'&&!(+S.tapVtcW>0)){
      const fTarget=1.35*fx;
      vtcEff=(apEmD*1e-4)/(Math.pow(2*Math.PI*fTarget/C,2)*lptEff)*1e6;
      S.tapVtcDerivedW=vtcEff;
    } else if(two) delete S.tapVtcDerivedW;
    const fLP=C/(2*Math.PI)*Math.sqrt((apEmD*1e-4)/((vtcEff*1e-6)*lptEff));
    add(kind.toUpperCase(),'Chamber acoustic low-pass',Math.round(fLP)+' Hz',fLP>=1.2*fx,fLP>=fx,
      (landed?'tap runs THROUGH the solid axial land (measured landH when available) - ':bossH>0?'tap runs THROUGH the printed land boss (port lengthened by it) - ':'')
      +(two&&S.tapVtcDerivedW?'front chamber solved to '+vtcEff.toFixed(0)+' cm³ at a 1.35×XO target; ':'')
      +'Vtc+tap Helmholtz (real passage + end-corrected EMITTED port) must clear the crossover ('+fx+' Hz)');
    /* ---- M2: the tap placement/size laws (US 8,284,976 / Waslo / Hinson) ---- */
    if(st && drs[0] && drs[0].x!==undefined){
      const K=kind.toUpperCase(), xT=drs[0].x, Astn=areaAt(st,xT), lam=C/fx;
      const fNull=C/(4*(xT+(S.topo==='2way'?0:S.cdDepth*IN)));
      add(K,'\u03bb/4 reflection null vs crossover',Math.round(fNull)+' vs '+fx+' Hz',
        fNull>=1.19*fx, fNull>=fx,
        'sound entering the tap reflects off the throat; the null must stay \u22651.2\u00d7 above the XO (Hinson/v4 law) - the derived XO builds this in');
      const eLam=Math.sqrt(4*Math.PI*Astn)/lam;
      add(K,'Entry size - local circumference vs \u03bb (US 8,284,976)',eLam.toFixed(2)+' \u03bb',
        eLam<=1.0, eLam<=1.3,
        'patent: enter where the horn is \u22641 wavelength around at the band top ('+fx+' Hz)',
        true);   // smooth family: a longer horn eases the flare near the throat - growth can fix this
      const tf=(drs.length*apEmD*1e-4)/Astn, tfOK=kind==='mid'?0.20:0.50, tfWarn=kind==='mid'?0.30:0.70;
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
      const td9=taps[0].slot&&taps[0].slot.design;
      const spread=td9?td9.projectedSpread:2*rT, sLam=spread/(lam/4);
      add('COAX','Projected tap spread at coverage edge vs \u03bb/4',
        (spread*1000).toFixed(1)+' mm = '+sLam.toFixed(2)+'\u00d7\u03bb/4',
        sLam<=1.30, sLam<=2.0,
        'equal-radius taps are equal-path on axis; this conservative edge-of-pattern spacing diagnostic is a warning tier, while passage width vs wavelength remains the patent-backed hard limit');
      const Ls9=Math.hypot(taps[0].x, rT-st.throat)+S.cdDepth*IN;   // SAME slant path the derived XO used
      const fNull=C/(4*Ls9);
      add('COAX','\u03bb/4 reflection null vs crossover',Math.round(fNull)+' vs '+fx+' Hz',
        fNull>=1.19*fx, true,
        'diagnostic only for this coax topology: the LF cone and recessed HF diaphragm are not both located at the central throat; verify their relative phase from impedance/transfer measurements');
      const ap=taps[0].slot?(taps[0].slot.apEm||taps[0].slot.ap):0;
      const vtc=td9?td9.Vcc:(S.tapVtc||4.5);
      if(ap>0){
        const fLP=td9?td9.fActual:0, target=td9?td9.fLP:1.15*fx, ratio=fLP/target;
        add('COAX','Tap/chamber acoustic low-pass',
          Math.round(fLP)+' Hz vs '+Math.round(target)+' Hz target · '+vtc.toFixed(1)+' cm³ chamber',
          ratio>=0.95&&ratio<=1.05, ratio>=0.90&&ratio<=1.10,
          (td9&&td9.autoV?'AUTO chamber volume is solved after port area; ':'MANUAL measured chamber; ')
            +'lumped front-chamber compliance + end-corrected passage mass. Final crossover still requires impedance/transfer measurement'); }
      if(td9){
        add('COAX','Declared cone compression ratio',
          td9.cr.toFixed(1)+':1 · total open area '+(td9.totalArea*1e4).toFixed(1)+' cm²',
          td9.cr>=12&&td9.cr<=20, td9.cr>=8&&td9.cr<=24,
          'MEH reference anchor used by this tool; explicit and editable, not a universal patent constant. Validate distortion and impedance on the prototype');
        add('COAX','Front chamber required by tap mass',
          td9.VreqCc.toFixed(1)+' cm³ for '+Math.round(td9.fLP)+' Hz',
          td9.autoV||Math.abs(td9.Vcc/td9.VreqCc-1)<=0.05,
          td9.autoV||Math.abs(td9.Vcc/td9.VreqCc-1)<=0.10,
          'Atotal / [(2πf/c)²·(Lwall+0.85r)]; AUTO recomputes for every driver size, MANUAL grades a measured chamber'); }
      /* pin #22: honesty about the coax UNIT itself. The tap ring must sit OVER
         the cone (or the slots feed nothing), and a unit fatter than the mouth
         is a picture, not a speaker. */
      const rCone=(S.odW? S.odW*CM : (S.odC||0.22))/2;
      const sa=(taps[0].slot&&taps[0].slot.sa)||0;
      /* b538 THE CONE TRIPLE: the ring must ride the EXPOSED CONE - from the hole
         in the cone (his green line = our throat) out to the cone rim. The old
         [.60,.72]od pair was an admitted od-relative guess that left only 45 cm²
         of cone against a published Sd of 132 cm². */
      const cgA=coneGeom(S);
      const smA=cgA.rCD+0.00075, rimA=cgA.rCone;
      add('COAX','Tap ring rides the exposed cone annulus',
        (rT*1000).toFixed(0)+' mm in ['+(smA*1000).toFixed(0)+'..'+(rimA*1000).toFixed(0)+'] ('+cgA.src+')',
        rT>=smA-0.001&&rT<=rimA+0.001, rT>=smA-0.004&&rT<=rimA+0.004,
        'the holes must open onto the CONE: inside the cone hole the driver’s own HF horn blocks them, past the rim they land on surround and frame');
      /* the triple itself, stated with its provenance - and REFUSED when the
         sheet contradicts itself (Sd wider than the stated cone can hold). */
      add('COAX','Actual CD throat → cone-plane waveguide mouth',
        (2*cgA.rHF*1000).toFixed(1)+' → '+(2*cgA.rWG*1000).toFixed(1)+' mm acoustic ID'
          +' · body clearance '+(2*cgA.rHole*1000).toFixed(1)+' mm — '+cgA.src,
        !cgA.bad, !cgA.bad,
        'CD throat is the standardized 1/1.4/2-inch exit; acoustic ID and printable body clearance at the cone are separate stations');
      { const pct=cgA.sd>0? cgA.ann/cgA.sd : 1;
        add('COAX','Exposed cone vs datasheet Sd',
          (cgA.ann*1e4).toFixed(0)+' vs '+((S.sdC||S.sdW||0)).toFixed(0)+' cm² ('+(pct*100).toFixed(0)+'%)',
          cgA.meas || (pct>=0.60&&pct<=1.10), pct>=0.45&&pct<=1.25,
          'makers quote a coax Sd as the full-piston equivalent, so the annulus runs under it; far under means the CAD class ratios do not fit THIS driver — calipers (cone Ø + hole Ø) close the row'); }
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
      if(td9){
        add('COAX','Crossover-derived lateral bores fit the exposed cone',
          taps.length+' × Ø'+(2*td9.r*1000).toFixed(1)+' mm at r='+(td9.center*1000).toFixed(1)+' mm',
          td9.fit&&td9.circumference, td9.fit&&td9.circumference,
          'area comes from Sd/(declared compression ratio × tap count); it must fit between the measured cone-plane body and cone rim');
        add('COAX','Minimum printable material between tap cuts',
          (Math.min(td9.radialInner,td9.radialOuter,td9.circumWeb)*1000).toFixed(1)
            +' mm vs '+(td9.minWeb*1000).toFixed(1)+' mm required',
          td9.structural,td9.structural,
          'checks inner radial web, outer radial web, and hole-to-hole chord web; a watertight mesh with blade-like remnants is refused');
        add('COAX','Tap width below shortest wavelength',
          (2*td9.r*1000).toFixed(1)+' mm vs '+(C/td9.fx*1000).toFixed(1)+' mm at crossover',
          td9.wavelengthWidth, td9.wavelengthWidth,
          'US 5,526,456: coupling-passage maximum width remains below the shortest wavelength carried by the passage'); }
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
      const rDish2=cgA.rFrame+0.012, hmD=(S.mouthW||24)*IN/2;
      add('COAX','Coax unit vs the horn body','Ø '+(2*rCone/IN).toFixed(1)+'″ unit · '+(2*rDish2/IN).toFixed(1)+'″ dish on a '+(S.mouthW||24)+'″ mouth',
        hmD>=1.25*rDish2, hmD>=1.05*rDish2,
        'the dish rim IS the driver flange (photo canon) - the DECLARED mouth must clear it; the horn grows to host the driver, never the reverse',
        true);   // a bigger mouth genuinely fixes this one
      { const mx=L.coax&&L.coax.mountX!==undefined?L.coax.mountX:cgA.coneX;
        const hx=st.xAdapter!==undefined?st.xAdapter:mx;
        add('COAX','Driver remains behind the MEH horn',
          'frame plane '+(mx*1000).toFixed(1)+' mm · flare begins '+(hx*1000).toFixed(1)+' mm',
          mx<hx-0.003, mx<=hx,
          'the motor, basket and cone stay behind the rear horn plane; only the replacement HF waveguide and circular tap bores penetrate forward'); }
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
                 :S.topo==='2way'? {x:0,name:'the coax throat datum'}
                 : {x:-S.cdDepth*IN, name:'the CD'};
      const off=drs[0].x-upper.x, deg=off/lam*360;
      add('PATH','Common acoustic center vs '+upper.name,(off*1000).toFixed(0)+' mm = '+Math.round(deg)+'° at '+fx+' Hz',
        Math.abs(deg)<=76, Math.abs(deg)<=105,
        'Heinz US5526456: sections should share an acoustic center; the derived-XO null margin bounds the CD offset, and LR4 absorbs ≤~76° at the corner');
    }
    if(S.topo==='2way'&&S.cdDepth){
      const mm=S.cdDepth*IN*1000, us=S.cdDepth*IN/C*1e6;
      add('PATH','Coax diaphragm depth compensation',
        mm.toFixed(0)+' mm · '+us.toFixed(0)+' µs',
        true,true,
        'the tap station is referenced to the physical throat plane; compensate the selected compression driver diaphragm depth with measured DSP delay/phase rather than moving the woofer taps and destroying the λ/4 margin');
    }
    if(S.topo==='1way'&&S.fxDerived.lo){
      const tp=L.find(d=>d.kind==='coaxtap');
      if(tp){ const rT2=Math.hypot(tp.tap[1],tp.tap[2]);
        const Ls=Math.hypot(tp.x, rT2-st.throat)+S.cdDepth*IN;
        const lam=C/S.fxDerived.lo, deg=Ls/lam*360;
        add('PATH','Common acoustic center (cone vs CD)',(Ls*1000).toFixed(0)+' mm = '+Math.round(deg)+'° at '+S.fxDerived.lo+' Hz',
          Math.abs(deg)<=76, true,
          'geometric diagnostic only: final phase requires the coax HF diaphragm offset and measured transfer functions; apply crossover delay/EQ before fabrication'); }
    }
  }
  /* ---- M6: BAND ARCHITECTURE - external handoff / LF-protection reference.
     This is not the internal woofer-to-CD crossover. The woofers own
     everything above this system edge; their displacement sets the ceiling
     there (rho*(2pi f)^2*Vd/(2pi r) half-space, Vd = nW*Sd*xmax). The port
     velocity law already evaluates at this same edge - one knob, two truths. */
  if(S.topo!=='1way'&&S.sdW&&S.xmW){
    const f0=S.subXO||80, Vd=((S.nW|0)||2)*(S.sdW*1e-4)*(S.xmW*1e-3);
    const pk=1.205*2*Math.PI*f0*f0*Vd;                      // 1 m, half-space, peak
    const spl=20*Math.log10(pk/Math.SQRT2/2e-5);
    add('BAND','Displacement ceiling at LF handoff / Xmax reference ('+f0+' Hz)',spl.toFixed(0)+' dB / 1 m half-space',
      true,true,
      'System integration: an external sub may take over here, or a self-contained design may use this as its protection/Xmax reference. It does not set the internal woofer-to-CD crossover.');
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
      add('PATTERN','Mouth circumference vs λ at LF system reference '+fLo+' Hz (US8284976)',
        (per/lam).toFixed(2)+'λ'+(per<lam?' — full loading wants ~1λ ('+Math.round(lam/Math.PI/IN)+'″ mouth)':''),
        true,true,
        'Danley: minimum mouth ≈ 1λ circumference at the horn’s own low cutoff; fractions trade loading for size (fine with a sub below)');
      const path=st.depth+((S.cdDepth||0)*IN);
      add('PATTERN','Horn path vs λ/4 at LF system reference '+fLo+' Hz (US8284976)',
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
    const A=d.mountN||d.mountNormal||d.normal, rB=d.od/2;
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
    const xU=(L.coax.mountX!==undefined)?L.coax.mountX:0, rU=L.coax.od/2;
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
  if(S.topo==='2way'){
    const A2=twoArch(S);
    const basis=S.tapBasis||'model';
    const exact=basis!=='model'&&(+S.tapAreaW)>0&&(+S.tapLptW)>0&&(+S.tapVtcW)>0;
    const modeled=basis==='model'&&(+S.tapCRW||4.5)>0&&((+S.twoXO)>0||(S.fxDerived&&S.fxDerived.lo>0));
    add('EVIDENCE','2-way architecture evidence',
      A2.tier.toUpperCase()+' · '+A2.name,
      true,true,A2.source);
    add('EVIDENCE','Tap geometry basis',
      basis==='model'
        ? 'DERIVED · Sd/Ap '+(+S.tapCRW||4.5).toFixed(1)+':1 · λ/4 station'
        : (exact?'LOCKED INPUTS':'INCOMPLETE '+basis.toUpperCase()+' INPUT'),
      modeled||exact, basis==='model'?modeled:false,
      basis==='model'
        ? 'the tool calculates total area from Sd/Ap, derives the station from c/(4·1.2·XO), and grades chamber mass/compliance; this is a mathematical architecture, not a copied build'
        : 'published/manual mode requires total area, passage length and front-chamber volume; exact slot length/width should also be entered when the source provides them');
    const ra=S.rearAlign||'external';
    add('EVIDENCE','Rear loading record',
      ra==='reflex'
        ? ((+S.rearV||0).toFixed(1)+' L · Fb '+(+S.rearFb||0).toFixed(0)+' Hz'
          +((+S.rearPortArea)>0?' · vent '+(+S.rearPortArea).toFixed(1)+' cm² × '+(+S.rearPortLen||0).toFixed(0)+' mm':''))
        : ra,
      true,true,
      'rear loading is reported separately from the MEH tap. A 17 m/s air-speed check belongs here at the declared maximum SPL, never in the tap-area solver');
  }
  /* pin #4/#11 acceptance: every driver's tap under its frame; ring even.
     Corner boards (v3): the tap sits ON the horn wall radially IN from the
     board - "under the driver" means ON ITS FIRE AXIS, so only the lateral
     component counts (the along-axis gap IS the pocket, by construction). */
  let tapOff=0, tapFeedOK=true;
  for(const d of L){ if(!d.tap) continue;
    const dv=[d.tap[0]-d.center[0],d.tap[1]-d.center[1],d.tap[2]-d.center[2]];
    if(S.topo==='2way'&&d.kind==='woof'&&d.mountX!==undefined){
      const rSd=Math.sqrt((S.sdW||0)*1e-4/Math.PI);
      const edge=(d.slot?Math.max(d.slot.sa||0,d.slot.sb||0):0)+((d.slot&&d.slot.np>=2)?(d.slot.offm||0):0);
      const f=Math.hypot(...dv)+edge;
      tapOff=Math.max(tapOff,f);
      if(f>rSd+0.002) tapFeedOK=false;
      continue;
    }
    if(d.board){ const al=dv[0]*d.normal[0]+dv[1]*d.normal[1]+dv[2]*d.normal[2];
      tapOff=Math.max(tapOff, Math.hypot(dv[0]-al*d.normal[0],dv[1]-al*d.normal[1],dv[2]-al*d.normal[2]));
    } else tapOff=Math.max(tapOff, Math.hypot(dv[0],dv[1],dv[2])); }
  if(S.topo==='2way') add('LAW','Tap passages remain under the active cones',
    (tapOff*1000).toFixed(1)+' mm reach vs '+(Math.sqrt((S.sdW||0)*1e-4/Math.PI)*1000).toFixed(0)+' mm Sd radius',
    tapFeedOK,tapFeedOK,
    'the mounting land may sit downstream of the acoustic entry, but the complete slot and its passage must remain inside the projected active cone');
  else add('LAW','Taps under their drivers',(tapOff*1000).toFixed(1)+' mm', tapOff<=0.001,false,'printed facets make this structural');
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
  /* b534 SWEEP-EVIDENCE ROWS (settings sweep v2, 82-state acceptance study):
     the trash classes that 0-fail states could reach - graded warn-tier or
     informational per the evidence density, never invented thresholds */
  if(S.topo!=='1way'&&S.fxDerived&&S.fxDerived.lo){
    const fLow2=(S.topo==='3way'? (S.fxLo||250) : S.fxDerived.lo);
    const lamH=C/(2*fLow2), mw=S.mouthW*IN;
    add('LAW','Mouth holds pattern to the low XO',(mw*100).toFixed(0)+' vs '+(lamH*100).toFixed(0)+' cm (λ/2)',
      mw>=lamH, true,
      'sweep evidence: 21% of accepted states were pattern fiction - a mouth under λ/2 at the low crossover walks toward omni regardless of the printed angles (warn-tier; grow the mouth or lower expectations)', true);
  }
  if(S.topo==='3way'&&S.fxDerived&&S.fxDerived.hi&&S.fxDerived.lo){
    const ratio9=S.fxDerived.hi/Math.max(1,S.fxDerived.lo);
    if(ratio9<1.3) add('XO','Mid band squeezed',(S.fxDerived.lo+'-'+S.fxDerived.hi+' Hz'),
      false, true, 'under 1/3 octave of mid band - the 3way is a 2way wearing extra drivers (sweep-detected class)');
  }
  if(S.topo==='3way'&&(S.odM||0)>=(S.odW||1)*0.999)
    add('LAW','Mid larger than its woofer',(S.odM+' vs '+S.odW+' cm'),
      false, true, 'reachable via overlapping od sliders (sweep-detected); no real MEH runs mids at woofer size');
  if(st&&st.depth>0){
    const dm9=st.depth/(S.mouthW*IN);
    add('LAW','Depth vs mouth',(dm9).toFixed(2)+'×',
      dm9>=0.3&&dm9<=2.5, true, 'INFORMATIONAL band [0.3..2.5] from the sweep - outside it the coverage claim decouples from the flare');
  }
  if(S.style==='angular'&&S.topo!=='1way'){
    const rT8=(S.td||1.4)*IN/2, d08=dimsAt(st,1e-4);
    const need8=Math.min(d08.a,d08.b)-rT8;
    if(need8>0.008){ const La8=Math.min(need8/0.43, (st.xBreak!==undefined? st.xBreak*0.9:1e9), st.depth*0.45);
      add('LAW','Round→square throat adapter',(La8*1000).toFixed(0)+' mm insert',
        true,true,
        'pin #10 (his ruling b535): a printed insert lofts the CD\u2019s round exit to the square throat at the MEASURED Diyaudio-adapter rate (0.43 half-slope; completes within the 42-54% datum class). The acoustic model still sees the abrupt Waslo throat - the unified angular station morph is the queued slice'); }
  }
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
  const d=dimsAt(st,x),nn=(d.n!==undefined)?d.n:st.n,
    family=st.sectionFamily||'superellipse';
  if(st.style!=='angular')
    return sectionArea2D(family,d.a,d.b,nn,d.cornerR);
  const ring=panelRing(d.a,d.b,nn,48);
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
  /* Passage mass includes the print wall plus a measured duct/land. Where no
     measurement exists, 9 mm is the explicit minimum printable seat-pad
     assumption; it is reported as a model assumption, not inherited geometry. */
  const lptM=(d)=>(S.wallT||0.012)+((d&&d.board&&d.board.duct)? d.board.duct : Math.max(0.009,(d&&d.landH)||0));
  const mkBr=(ap,vtc,n,d)=>{ const Ap=n*ap*1e-4, V=n*vtc*1e-6, r=Math.sqrt(ap*1e-4/Math.PI);
    return {M:RHO*(lptM(d)+0.85*r)/Ap, Cc:V/(RHO*C*C)}; };
  /* b532: the network breathes through the EMITTED cut, like the law rows */
  const brW=hasW&&dW&&dW.slot? mkBr(dW.slot.apEm||dW.slot.ap,S.vtcW||150,(S.nW|0)||2,dW) : null;
  const brM=hasM&&dM&&dM.slot? mkBr(dM.slot.apEm||dM.slot.ap,S.vtcM||40,(S.nM|0)||4,dM) : null;
  const dC=L.find(d2=>d2.kind==='coaxtap');
  const ctd=dC&&dC.slot&&dC.slot.design;
  const cN=(S.coaxTaps|0)||6;
  const brC=hasC&&dC&&dC.slot? mkBr(dC.slot.apEm||dC.slot.ap,
    (ctd?ctd.Vcc:(S.tapVtc||4.5))/cN,cN,dC) : null;
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
  const drop=(k,why)=>{ if(S[k]===undefined) return;
    const from=S[k]; delete S[k]; ledger.push({knob:k,from,to:undefined,why}); };
  T=T||{};
  /* 1. DERIVE dependents of the touched knob */
  if(key==='cdSel'&&S.topo!=='1way'&&T.CDP&&T.CDP[S.cdSel]){ const P=T.CDP[S.cdSel];
    set('td',P.td,'CD choice'); set('throat',P.td,'CD choice');
    set('cdFloor',P.floor,'CD choice'); set('cdDepth',P.dep,'CD choice'); }
  if(key==='wPre'){ const tbl=(S.topo==='1way'?T.CXPRE:T.WPRE)||{}; const P=tbl[S.wPre];
    if(P){ set('odW',P.od,'driver preset'); set('dpW',P.dp,'driver preset');
      set('sdW',P.sd,'driver preset'); set('vtcW',P.vtc,'driver preset'); set('xmW',P.xm,'driver preset');
      if(S.topo==='1way'){ set('sdC',P.sd,'coax unit'); set('vtcC',P.vtc,'coax unit'); set('xmC',P.xm,'coax unit');
        for(const k of ['hfExit','coneD','coneDepth','coneMouthD','coneClearanceD',
                        'stockHornMouthD','bdepD','stockHornDepth','coneGeomSrc'])
          P[k]!==undefined? set(k,P[k],'coax geometry preset') : drop(k,'coax geometry unavailable for this preset');
        set('throatCollarT',
          P.throatCollarT!==undefined?P.throatCollarT:
            (P.coneClearanceD&&P.coneMouthD
              ?(P.coneClearanceD-P.coneMouthD)/2:1.6),
          'printable horn throat radial collar');
        drop('coneClearanceD','throat ID + radial collar own the printable interface');
        set('recXO',P.recXO!==undefined?P.recXO:0,'coax unit');
        set('coaxXO',P.coaxXO||P.recXO||S.coaxXO||1200,'coax LF/HF crossover');
        set('coaxTaps',P.coaxTaps||S.coaxTaps||4,'coax tap count');
        set('tapCR',P.tapCR||S.tapCR||16,'coax tap compression ratio');
        set('tapVtcMode',P.tapVtcMode||S.tapVtcMode||'auto','coax chamber sizing');
        if(P.tapVtc!==undefined) set('tapVtc',P.tapVtc,'measured coax front chamber');
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
  /* 2. CLAMPS (evidence-backed; sweep v2 2026-07-25) */
  if(S.mouthW>(S.mouthCap||64)) set('mouthW',S.mouthCap||64,'mouth cap');
  if(['mouthW','covH','covV','rollR'].includes(key)){
    const ar9=Math.tan((S.covV||60)*Math.PI/360)/Math.tan((S.covH||90)*Math.PI/360);
    const cap9=+(S.mouthW*Math.min(1,ar9)/8).toFixed(2);
    if(S.rollR>cap9) set('rollR',cap9,'roll cap: ≤25% of the minor mouth dimension (sweep evidence: worst case ate 47%)');
  }
  if(S.topo!=='1way'&&S.style==='smooth'&&S.sectionFamily==='ellipse')
    set('seN',2,'ellipse is the exact n=2 section identity');
  if(S.topo!=='1way'&&S.style==='smooth'&&S.sectionFamily==='roundedRectangle'){
    const ratio=Math.max(0.05,Math.min(1,
      Number.isFinite(+S.sectionCornerRatio)?+S.sectionCornerRatio:0.25));
    set('sectionCornerRatio',ratio,
      'exact fillet radius ratio must remain in 0.05–1.00');
  }
  return {S2:S, ledger};
}
/* BUILD 576: smart adaptation for the complete 2-way decision graph.
   A dropdown is not allowed to leave stale fields from another architecture.
   The selected driver/CD remains the user's intent; packaging, count,
   placement, local-normal aim, crossover, compression and mouth are derived
   together. The fitting loop uses the same release solver and therefore
   cannot "greenwash" a state with a second set of rules. */
function smartAdapt2way(S0,key,T){
  const a0=adapt(S0,key,T), S={...a0.S2}, ledger=a0.ledger.slice();
  if(S.topo!=='2way') return a0;
  const set=(k,to,why)=>{ const from=S[k];
    if(to===undefined||from===to) return;
    S[k]=to; ledger.push({knob:k,from,to,why}); };
  const drop=(k,why)=>{ if(S[k]===undefined) return;
    const from=S[k]; delete S[k]; ledger.push({knob:k,from,to:undefined,why}); };
  const exact=['tapStationW','tapAreaW','tapLptW','tapSlotL','tapSlotW','tapVtcW','tapVtcDerivedW'];
  const documented=S.twoDesign==='hinson10'||S.twoDesign==='jmod88';
  const changesGeometry=['wPre','odW','nW','npW','shW','placeW','cdSel','twoXO','tapCRW',
    'style','profileLaw','osseThroatAngle','osseK','osseS','osseTerminationN','osseQ',
    'rosseThroatAngle','rosseK','rosseApexRadiusFactor','rosseB','rosseM','rosseQ',
    'sectionFamily','sectionCornerRatio','seN','covH','covV','rollR','mouthW'];

  /* Two-way cones fire into their local front chambers. The former axial
     option pointed every motor forward and visually/acoustically detached it
     from the tap. It remains available to other topologies only. */
  set('mount','flush','2-way drivers aim along the local horn normal into their tap chambers');
  set('placeW','auto','the selected 2-way architecture owns the wall assignment');

  if(documented&&changesGeometry.includes(key)){
    set('twoDesign','arch:custom','editing a documented build creates a calculated custom design');
    if(S.tapBasis==='published') set('tapBasis','model','published dimensions no longer describe the edited driver geometry');
    if(S.tapBasis==='model') for(const k of exact) drop(k,'recalculate after leaving the documented geometry');
  }

  /* A driver change selects the architecture class that can physically carry
     its frame. These thresholds are packaging boundaries from the named
     preset dimensions, not acoustic folklore. */
  if(key==='wPre'){
    const od=+S.odW||0;
    const ak=od<=16.5?'distributed':od<=26?'dualcell':'radial4';
    const D=TWO_ARCH[ak].defaults;
    set('twoArch',ak,'driver frame class selects a compatible 2-way package');
    set('twoDesign','arch:'+ak,'driver choice selects a compatible calculated architecture');
    for(const k of ['style','seN','covH','covV','mouthCap','nW','npW','shW','placeW','mount',
      'twoXO','tapCRW','rearAlign','rearFb','mouthW'])
      if(D[k]!==undefined) set(k,D[k],'compatible '+ak+' package');
    set('tapBasis','model','new driver geometry is calculated');
    for(const k of exact) drop(k,'recalculate for the selected driver');
    /* The named-library sweep establishes these impossible overlap edges.
       Reject them before the iterative package search: otherwise a large LF
       selection can spend seconds proving that a high-floor CD cannot reach
       it, leaving the browser control visually changed before state catches
       up. The broad-overlap DCX464 is the deterministic overlap fallback for
       a driver-first change. */
    const impossible=S.cdSel==='de250'
      ||(S.cdSel==='de500'&&od>25.7)
      ||(S.cdSel==='n314x'&&od>32.2);
    if(impossible&&T.CDP&&T.CDP.dcx464){
      const P=T.CDP.dcx464;
      set('cdSel','dcx464','selected LF driver is outside the validated overlap of the previous CD');
      set('td',P.td,'automatic compatible CD'); set('throat',P.td,'automatic compatible CD');
      set('cdFloor',P.floor,'automatic compatible CD'); set('cdDepth',P.dep,'automatic compatible CD');
    }
  }

  if(!TWO_ARCH[S.twoArch]) set('twoArch','custom','unknown architecture normalized to the adaptive model');
  if(!['published','model','manual'].includes(S.tapBasis)) set('tapBasis','model','automatic provenance mode');
  if(S.tapBasis==='model') for(const k of exact) drop(k,'model-derived tap geometry');

  /* Keep the crossover inside the overlap between the CD floor and the cone's
     λ/2 ceiling. The later fitting loop may lower it further to pull the tap
     station back under the active cone, but never below the CD floor. */
  const floor=Math.max(150,+S.cdFloor||300);
  const activeD=2*Math.sqrt(Math.max(1,(+S.sdW||100))*1e-4/Math.PI);
  const coneCeil=C/(2*Math.max(0.03,activeD));
  if(S.tapBasis==='model'){
    let xo=Math.max(floor,+S.twoXO||floor);
    xo=Math.min(xo,Math.max(floor,Math.floor(coneCeil/5)*5));
    set('twoXO',xo,'fit the CD floor inside the LF cone λ/2 ceiling');
  }

  /* Search only DERIVED quantities. First reduce slot area through a legal
     compression ratio, then move the station throatward only as far as the CD
     permits; ordinary fit failures may grow the mouth through solve().
     A driver/CD dropdown change is also allowed to repack the cones between
     the derived 4-entry and 2-opposed families. This is the missing half of
     "adaptive": a 12-inch cone with a 400-900 Hz CD often cannot reach from a
     four-corner mount to the λ/4 station, while the same selected components
     fit cleanly as two opposed cone pockets. */
  if(S.tapBasis==='model'){
    const packageKeys=['style','profileLaw','osseThroatAngle','osseK','osseS','osseTerminationN','osseQ',
      'rosseThroatAngle','rosseK','rosseApexRadiusFactor','rosseB','rosseM','rosseQ',
      'sectionFamily','sectionCornerRatio','seN','covH','covV','rollR','mouthW','mouthCap','nW','npW','shW','placeW','mount',
      'twoXO','tapCRW','rearAlign','rearFb'];
    const repack=(base,ak,preserve=[])=>{
      const q={...base}, D=TWO_ARCH[ak]&&TWO_ARCH[ak].defaults;
      if(!D) return q;
      const held=Object.fromEntries(preserve.filter(k=>base[k]!==undefined).map(k=>[k,base[k]]));
      for(const k of packageKeys) if(D[k]!==undefined) q[k]=D[k];
      Object.assign(q,held);
      q.twoArch=ak; q.twoDesign='arch:'+ak; q.tapBasis='model';
      for(const k of exact) delete q[k];
      return q;
    };
    const fit=seed=>{
      const f0=Math.max(150,+seed.cdFloor||floor);
      const dia=2*Math.sqrt(Math.max(1,(+seed.sdW||100))*1e-4/Math.PI);
      const ceil=C/(2*Math.max(0.03,dia));
      /* The cone-size row owns its own transition margin. Do not pre-reject at
         the bare λ/2 number here: that duplicated the law with a stricter
         threshold and incorrectly rejected configurations the release solver
         accepts (for example 10CL51 + a 900 Hz CD). */
      const start=Math.max(f0,Math.min(+seed.twoXO||f0,Math.max(f0,Math.floor(ceil/5)*5)));
      const xoList=[];
      for(let x=start;x>=f0-1e-9;x-=25) xoList.push(Math.max(f0,Math.round(x/5)*5));
      if(!xoList.includes(f0)) xoList.push(f0);
      const crList=[Math.max(2.5,Math.min(12,+seed.tapCRW||5)),4,5,6,8,10,12]
        .filter((v,i,a)=>a.indexOf(v)===i);
      for(const xo of xoList) for(const cr of crList){
        const q={...seed,twoXO:xo,tapCRW:cr};
        for(const k of exact) delete q[k];
        const r=solve(q);
        if(!r.infeasible&&r.ev.fails===0) return {...q,mouthW:r.S.mouthW};
      }
      return null;
    };
    const tries=[{...S}], order=[S.twoArch,'dualcell','distributed','radial4','custom'];
    const intentKeys=['style','profileLaw','osseThroatAngle','osseK','osseS','osseTerminationN','osseQ',
      'rosseThroatAngle','rosseK','rosseApexRadiusFactor','rosseB','rosseM','rosseQ',
      'sectionFamily','sectionCornerRatio','sectionLameN','seN','covH','covV','mouthW','rollR','npW','shW'];
    const preserve=intentKeys.includes(key)?[key]:[];
    /* Every exposed 2-way geometry control gets the same package search as a
       driver/CD change. First preserve the requested value while changing the
       cone package. If no package can carry that exact value, try the validated
       package defaults; the UI visibly reports the rebound in the smart ledger
       instead of rendering a refused horn. */
    for(const ak of order) if(ak&&TWO_ARCH[ak])
      tries.push(repack(S,ak,preserve));
    if(preserve.length) for(const ak of order) if(ak&&TWO_ARCH[ak])
      tries.push(repack(S,ak));
    let bestState=null;
    for(const q of tries){ bestState=fit(q); if(bestState) break; }
    if(bestState){
      for(const k of Object.keys(S)) if(!(k in bestState)) drop(k,'smart package removes stale geometry');
      for(const k of Object.keys(bestState)) set(k,bestState[k],
        k==='twoArch'||k==='twoDesign'?'selected components require a compatible 2-way package':
        k==='twoXO'?'smart fit: legal tap station under the active cone':
        k==='tapCRW'?'smart fit: tap area fits the cone and local horn section':
        k==='mouthW'?'smart fit: minimum solved mouth':'compatible 2-way package');
      drop('_selectionUnsupported','a compatible package was found');
    } else if(key==='wPre'&&S.cdSel!=='dcx464'&&T.CDP&&T.CDP.dcx464){
      /* The newly selected LF driver is the latest user intent. If it makes
         the previous CD impossible, move to the broad-overlap DCX464 instead
         of leaving a red state behind. Direct CD choices are never silently
         changed; the UI disables those before selection. */
      const P=T.CDP.dcx464;
      set('cdSel','dcx464','selected LF driver requires the broad-overlap 300 Hz coax CD');
      set('td',P.td,'automatic compatible CD'); set('throat',P.td,'automatic compatible CD');
      set('cdFloor',P.floor,'automatic compatible CD'); set('cdDepth',P.dep,'automatic compatible CD');
      drop('_selectionUnsupported','retry with compatible CD');
      const retry=smartAdapt2way(S,'cdSel',T);
      return {S2:retry.S2,ledger:ledger.concat(retry.ledger)};
    } else set('_selectionUnsupported',key||'state','no supported package satisfies the selected driver/CD overlap');
  } else {
    const r=solve({...S});
    if(!r.infeasible&&r.ev.fails===0) set('mouthW',r.S.mouthW,'minimum solved mouth for the measured geometry');
  }
  if(S.style==='smooth'&&S.sectionFamily==='ellipse')
    set('seN',2,'ellipse is the exact n=2 section identity');
  return {S2:S,ledger};
}
function solve(S0){
  const S={...S0};
  if(S.topo!=='1way'&&S.style==='smooth'&&S.sectionFamily==='ellipse')S.seN=2;
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
  shellMesh._attemptMesh=m1;                 // retained for the fabrication gate / cut topology diagnostics
  const attempted=(shellMeshCore._cutReport||[]).map(p=>({...p}));
  /* Judge the attempted cut with the same 1e-8 m coordinate weld used by
     fabrication/export.  A former 1e-6 m weld merged distinct marching
     vertices and silently replaced valid cut shells with hole-less fallbacks. */
  const attemptAudit=meshAudit(m1);
  shellMesh._attemptBadEdges=attemptAudit.badEdges;
  if(attemptAudit.badEdges){
    const m2=shellMeshCore(S,false);
    shellMesh._attemptReport=attempted;
    shellMesh._cutReport=(shellMeshCore._cutReport||[]).map(p=>({kind:p.kind,cut:false}));
    return orientSolid(m2); }
  shellMesh._attemptReport=attempted;
  shellMesh._cutReport=shellMeshCore._cutReport||[];
  return orientSolid(m1);
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
    /* The tap normal and the driver mount normal are intentionally separate.
       A local-normal/spot-faced driver still needs a real opening through the
       horn wall; mountN only describes the seat/body axis.  The former
       d.mountN exclusion silently made every smart two-way shell hole-less. */
    if(d.board) continue;                                  // seam-board ports still use the cutter path
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
    const rings=SPs.map(p=>sectionRing2D(st.sectionFamily||'superellipse',
      p.a,p.b,(p.n!==undefined)?p.n:st.n,p.cornerR,M,'smooth'));
    const pre=SPs.filter(p=>!p.roll);
    const ringsO=pre.map(p=>offsetRing(st,p.x,wt,M));
    const iIn=SPs.map((p,j)=>rings[j].map(q=>P(p.x,q)));
    const iOut=pre.map((p,j)=>ringsO[j].map(q=>P(p.x,q)));
    /* ---- smooth-family cuts: project outlines onto the true surfaces ---- */
    const skip=new Set(), patches=[];
    const NSs=SPs.length, NPre=pre.length;
    const memb=(q,off)=>{ const x=q[0];
      if(x<1e-4||x>st.depth-1e-4) return 1e9;
      const dd=dimsAt(st,x), nn=(dd.n!==undefined)?dd.n:st.n,
        family=st.sectionFamily||'superellipse',
        cornerR=family==='roundedRectangle'?dd.cornerR+off:dd.cornerR;
      return sectionLevel2D(family,dd.a+off,dd.b+off,nn,cornerR,q[1],q[2]); };
    const projSurf=(p,o,off)=>{           // bisect along the port normal to land ON the surface
      let lo=-0.06, hi=0.08;
      const f=t=>memb(p.at3(o,t),off);
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
        prm.push(sectionParamFor2D(st.sectionFamily||'superellipse',
          dd.a,dd.b,(dd.n!==undefined)?dd.n:st.n,dd.cornerR,q[1],q[2],st.style)); }
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
        const t=sectionParamFor2D(st.sectionFamily||'superellipse',
          dd.a,dd.b,(dd.n!==undefined)?dd.n:st.n,dd.cornerR,q[1],q[2],st.style);
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
/* ---- b535 M10/D: HORNRESP ME EXPORT (his three wizard exports, 2026-07-25,
   archived in docs/hornresp_samples/ - the format is MEASURED canon now, not
   inference). An ME system = THREE chained records: ME1 entry driver, ME2
   entry driver, Nd horn carrier (dummy driver Sd 0.01). Horn runs MOUTH ->
   THROAT: S1..S5 areas (cm2) with per-segment Con lengths (cm); entries tap
   at S2 (woofers) and S3 (mids); tap chambers ride Vtc(L)/Atc(cm2); rear
   chamber Vrc(L)/Lrc(mm) on the ME1 record (per the sample). REFUSES when a
   driver lacks published T/S (doctrine: no invented Bl/Cms/Mmd). ---- */
function hornrespME(S,TS){
  if(S.topo!=='3way') return {error:'Hornresp ME wizard is the THREE-way form - 2way/1way export is the next slice'};
  const r=solve({...S});
  if(r.infeasible) return {error:'state refuses - fix it before exporting'};
  const ev=r.ev, st=ev.st, L=ev.layout;
  const dW=L.find(d=>d.kind==='woof'), dM=L.find(d=>d.kind==='mid');
  if(!dW||!dM) return {error:'no landed woofer/mid stations'};
  const tsW=TS&&TS[r.S.wPre], tsM=TS&&TS[r.S.mPre];
  const needK=['Fs','Qes','Qms','Re','BL'];
  const miss=(ts,who)=> !ts? who+' has no T/S row' : (needK.filter(k=>ts[k]===undefined).length? who+' missing '+needK.filter(k=>ts[k]===undefined).join('/') : null);
  const m1=miss(tsW,'woofer '+r.S.wPre), m2=miss(tsM,'mid '+r.S.mPre);
  if(m1||m2) return {error:'REFUSED (no invented T/S): '+[m1,m2].filter(Boolean).join('; ')};
  /* derive Cms/Mmd/Rms from published T/S: Mms=BL^2*Qes/(2pi*Fs*Re);
     Cms=1/(Mms*(2pi*Fs)^2); Rms=2pi*Fs*Mms/Qms - standard identities */
  const der=(ts)=>{ const w0=2*Math.PI*ts.Fs;
    const Mms=ts.BL*ts.BL*ts.Qes/(w0*ts.Re);
    return { Mmd:Mms*1000, Cms:1/(Mms*w0*w0), Rms:w0*Mms/ts.Qms }; };
  const dw=der(tsW), dm=der(tsM);
  const A=x=>areaAt(st,Math.max(1e-4,Math.min(st.depth-1e-4,x)))*1e4;   // cm2
  const xW=dW.x, xM=dM.x, x4=xM/2;
  const S1=A(st.depth), S2=A(xW), S3=A(xM), S4=A(x4), S5=A(1e-4);
  const L12=(st.depth-xW)*100, L23=(xW-xM)*100, L34=(xM-x4)*100, L45=x4*100;
  const BX=boxDims(r.S);
  const f2=v=>v.toFixed(2);
  const filt=(tail)=>['~'.repeat(84),'FILTER',
    '      0   0.01    0.0     -1      0   0.01    0.0     -1      0   0.01    0.0     -1',
    '      0   0.01    0.0     -1      0   0.01    0.0     -1      0   0.01    0.0     -1',
    '  100   25    0    0','  4  30.50.5','  00.50.50.5','SSSS','0111','1011','0022','1111',tail,'000','~'.repeat(84),''].join('\n');
  const drvRec=(flag,ts,dd,sd,xm,vtc,atc,vrc,lrc,n2)=>[
    'ID=48.20','Ang=0.0 x Pi','Eg=2.83','Rg=0.00','Cir=0.00','Ap1=0.00','Ap2=0.00','Lp =0.00','F12=0.00',
    'S2=0.00','S3=0.00','L23=0.00','F23=0.00','S3=0.00','S4=0.00','L34=0.00','F34=0.00','S4=0.00','S5=0.00','L45=0.00','F45=0.00',
    'Sd='+f2(sd),'Bl='+f2(ts.BL),'Cms='+dd.Cms.toExponential(2).toUpperCase(),'Rms='+f2(dd.Rms),'Mmd='+f2(dd.Mmd),
    'Le='+f2(ts.Le!==undefined?ts.Le:0),'Re='+f2(ts.Re),flag+'=1',
    'Vrc='+f2(vrc),'Lrc='+f2(lrc),'Fr=0.00','Tal=0.00','Vtc='+f2(vtc),'Atc='+f2(atc),
    'Pmax=100','Xmax='+xm.toFixed(1),'Path=0.0','Mass=0.00',"Re'=0.00",'Leb=0.00','Le=0.00','Ke=0.00','Rss=0.00','Rms=0.00','Ams=0.00',
    'Fr1=0.00','Fr2=0.00','Fr3=0.00','Fr4=0.00','Tal1=100','Tal2=100','Tal3=100','Tal4=100',
    'Comment=MEH Studio v5 export  -  '+n2].join('\n');
  const hornRec=[
    'ID=48.20','Ang=2.0 x Pi','Eg=0.10','Rg=0.00','Fta=-2.37',
    'S1='+f2(S1),'S2='+f2(S2),'Con='+f2(L12),'F12=0.00',
    'S2='+f2(S2),'S3='+f2(S3),'Con='+f2(L23),'F23=0.00',
    'S3='+f2(S3),'S4='+f2(S4),'Con='+f2(L34),'F34=0.00',
    'S4='+f2(S4),'S5='+f2(S5),'Con='+f2(L45),'F45=0.00',
    'Sd=0.01','Bl=8.00','Cms=1.60E-04','Rms=3.00','Mmd=2.00','Le=0.05','Re=6.00','Nd=1',
    'Vrc=0.01','Lrc=0.10','Fr=0.00','Tal=0.00','Vtc=0.00','Atc=0.00',
    'Pmax=100','Xmax=5.0','Path=0.0','Mass=0.00',"Re'=0.00",'Leb=0.00','Le=0.00','Ke=0.00','Rss=0.00','Rms=0.00','Ams=0.00',
    'Fr1=0.00','Fr2=0.00','Fr3=0.00','Fr4=0.00','Tal1=100','Tal2=100','Tal3=100','Tal4=100',
    'Comment=MEH Studio v5 export  -  3 of 3'].join('\n');
  const vtcW9=(r.S.vtcW||0)/1000, atcW9=(dW.slot&&(dW.slot.apEm||dW.slot.ap))||0;
  const vtcM9=(r.S.vtcM||0)/1000, atcM9=(dM.slot&&(dM.slot.apEm||dM.slot.ap))||0;
  const crlf=t=>t.split('\n').join('\r\n');   // Hornresp is a Windows app - his samples are CRLF
  return {
    ME1: crlf(drvRec('ME1',tsW,dw,r.S.sdW,r.S.xmW||5,vtcW9,atcW9,(BX.Vnet||0.3)*1000/2,Math.round((BX.D||0.5)*1000),'1 of 3')+'\n'+filt('111 ')),
    ME2: crlf(drvRec('ME2',tsM,dm,r.S.sdM,r.S.xmM||3,vtcM9,atcM9,0,0,'2 of 3')+'\n'+filt('111 ')),
    Nd: crlf(hornRec+'\n'+filt('1117')),
    summary:'S1..S5 = '+[S1,S2,S3,S4,S5].map(v=>v.toFixed(0)).join('/')+' cm2; L='+[L12,L23,L34,L45].map(v=>v.toFixed(0)).join('+')+' cm'
  };
}
/* ---- b535 PIN #10: THE ROUND-TO-SQUARE THROAT ADAPTER (his ruling: "as
   long as you develop round to square transition it should be fine - we made
   this happen in horn studio before"). A PRINTED INSERT for the angular
   families: outer face rides the horn's own inner throat walls, inner channel
   lofts the CD's round exit (td, n=2) to the square section. Expansion rate
   anchored to the MEASURED record (Diyaudio Synergy adapter: (150.8-29.8)/2
   over 140mm = 0.43 half-slope; transition completes inside its own length -
   the 42-54% datum class). v1 scope stated honestly: the ACOUSTIC model still
   sees the abrupt Waslo throat - the unified station morph for angular is the
   queued slice; this part is the PRINTABLE transition. ---- */
function adapterMesh(S){
  if(S.style!=='angular'||S.topo==='1way') return null;
  const st=stations(S);
  const rT=(S.td||1.4)*IN/2;                     // round CD exit radius
  const RATE=0.43;                               // measured half-slope (Diyaudio adapter)
  /* La: the length the record rate needs to reach the horn's minor half-dim */
  const d0=dimsAt(st,1e-4);
  const need=Math.max(0.008, Math.min(d0.a,d0.b)-rT);
  let La=need/RATE;
  if(st.xBreak!==undefined) La=Math.min(La, st.xBreak*0.9);
  La=Math.min(La, st.depth*0.45);                // stays in the smooth-morph datum band
  if(La<0.015) return null;                      // throat already round-sized: nothing to transition
  const NS=16, M2=48, t=Math.max(0.004,(S.wallT||0.012)*0.5);
  const pos=[], tri=[];
  const P=(x,y,z)=>{ pos.push([x,y,z]); return pos.length-1; };
  const quad=(a,b,c,d)=>{ tri.push([a,c,b],[b,c,d]); };
  const ringAt=(x,inner)=>{
    const f=Math.max(0,Math.min(1,x/La)), sm=f*f*(3-2*f);
    const dd=dimsAt(st,Math.max(1e-4,Math.min(st.depth-1e-4,x)));
    const n=inner? 2+((st.n)-2)*sm : st.n;
    /* inner channel: round rT at x=0 -> (horn dims - lip) at La; outer: the horn wall */
    const a=inner? rT+(dd.a-0.0015-rT)*sm : dd.a;
    const b=inner? rT+(dd.b-0.0015-rT)*sm : dd.b;
    const out=[];
    for(let i=0;i<M2;i++){ const p=sePoint(a,b,n,i/M2*2*Math.PI); out.push([x,p[0],p[1]]); }
    return out;
  };
  const rings=[], ringsO=[];
  for(let j=0;j<=NS;j++){ const x=La*j/NS; rings.push(ringAt(x,true)); ringsO.push(ringAt(x,false)); }
  const idxI=rings.map(r=>r.map(p=>P(p[0],p[1],p[2])));
  const idxO=ringsO.map(r=>r.map(p=>P(p[0],p[1],p[2])));
  for(let j=0;j<NS;j++) for(let i=0;i<M2;i++){ const i2=(i+1)%M2;
    quad(idxI[j][i],idxI[j][i2],idxI[j+1][i],idxI[j+1][i2]);          // channel (faces in)
    quad(idxO[j][i2],idxO[j][i],idxO[j+1][i2],idxO[j+1][i]); }        // outer (faces out)
  for(let i=0;i<M2;i++){ const i2=(i+1)%M2;
    quad(idxI[0][i],idxI[0][i2],idxO[0][i],idxO[0][i2]);              // front annulus (x=0)
    quad(idxI[NS][i2],idxI[NS][i],idxO[NS][i2],idxO[NS][i]); }        // back lip annulus (x=La)
  adapterMesh._La=La;
  return {pos, tri};
}
/* ---- A. EXPORT slice 2: the REFERENCE D DISH INSERT as its own printable
   part - the 38° conical face with the REAL round tap holes and the CD bore,
   uniform print thickness (axial offset t/sin38 = normal thickness t). Built
   as structured triangulation (annuli + one rect-to-circle patch per hole),
   never CSG, so watertightness is constructive and gate-assertable.
   v1 scope (stated honestly): face + holes + bore wall + rim edge; the snout
   tube, flange step and wings are the next slice. ---- */
function dishMesh(S,openOuter){
  if(S.topo!=='1way') return null;
  const st=stations(S), L=layout(S,st);
  const tp=L.filter(d=>d.kind==='coaxtap');
  if(!tp.length) return null;
  const cg=coneGeom(S);
  /* The OEM horn is removed, so its Ø91.88 mm mouth is only an internal datum,
     not a packaging limit. The replacement expands through the baffle to a
     driver-sized mathematical handoff; the main shell begins at the identical
     radius, axial station and tangent. This also restores the flat rear
     mounting land between the cone rim and driver frame. */
  const rCone=cg.rFrame, rDish=rCone+0.012;
  const od=cg.od;
  const rHFm=cg.rWG;
  /* Driver mounting plane is the measured LF-cone datum. The old removable
     branch used 0.14·OD (~32 mm) here while profile/viewer used ~89 mm; that
     mismatch produced the huge cylindrical slab that appeared to swallow half
     the driver. Every consumer now shares coneX. */
  const Lhm=cg.dep;                                           // LF frame/mount plane; silver mouth remains x=0
  /* b538 HIS RULING: the part starts on the cone surface and its bore IS the hole
     in the cone, for BOTH constructions - a fixed metal HF horn ends at that same
     hole, it only changes the BACK (a collar seat instead of a wrap). */
  const rSMm=cg.rCD;
  const fixedH=(S.hornType!=='removable');
  /* The acoustic center is not a hole. Mesh the complete replacement from the
     true CD exit radius outward; keep the cone-clearance radius only as the
     inner boundary for the LF tap land. This closes the transparent/flat center
     and makes the exported dish a real coax waveguide. */
  const rB=rHFm;
  const rLand=rSMm+0.0005;
  const rP=Math.hypot(tp[0].tap[1],tp[0].tap[2]);
  /* b532 PORT TRUTH: sa/sb arrive FINAL from layout (all clamps applied
     there; the law rows ride the same emitted dims) - no re-clamping here */
  const sa=Math.max(0.0015,(tp[0].slot&&tp[0].slot.sa)||0.008);  // solved circular radius; no hidden mesh clamp
  const sb=Math.max(0.0015,(tp[0].slot&&tp[0].slot.sb)||sa);
  const N=tp.length, t=S.wallT||0.012;
  /* OS face (matches profile): x(r) inverts r=sqrt(r0^2+((x-x0) tanT)^2) */
  /* The acoustic face begins at the TRUE CD throat. Starting x(r) at the
     49.084 mm physical clearance held the entire center at x=0 and produced
     the false straight tube Marwan identified. */
  const r0F=rHFm, x0F=(st.wgX0!==undefined? st.wgX0 : Lhm);
  /* the face span comes STRAIGHT from stations (profile's own La) - the b532
     lesson: two places computing the same station is how the mesh and the laws
     drift apart. b539: and the FACE ITSELF is profile's R-OSSE wall, sampled
     radius-first; the printed part cannot be a different curve from the horn. */
  const LaD=(st.xAdapter!==undefined)? st.xAdapter : Lhm+Math.max(0.008, cg.dep+((S.xmC||S.xmW||4)/1000)+0.002);
  const spanF=Math.max(0.008, LaD-x0F);
  const tanT=Math.sqrt(Math.max(1e-9,rDish*rDish-r0F*r0F))/spanF;
  const WGm=st.wgFace;
  const xOf=r=> r<=r0F? x0F
    : (WGm&&WGm.ok? x0F+rosseXat(WGm,r) : x0F+Math.sqrt(r*r-r0F*r0F)/tanT);
  /* The print's REAR face forms the LF front chamber. It follows the entered
     cone depth from the central aperture to the cone rim, then becomes a flat
     driver mounting land out to the frame. This is the shallow annular chamber
     in Marwan's rear/cutaway references; it is not a parallel tube around the
     HF horn. */
  const gap=((S.xmC||S.xmW||4)/1000)+0.002;
  const coneRear=r=>cg.dep*Math.max(0,Math.min(1,
    (r-cg.rHole)/Math.max(1e-6,cg.rCone-cg.rHole)));
  const dishBack=r=>{
    if(r<rSMm) return 0;                                      // seats directly on the exposed silver coax mouth
    if(r>=cg.rFrame){ const u=Math.max(0,Math.min(1,(r-cg.rFrame)/Math.max(1e-6,rDish-cg.rFrame))),s=u*u*(3-2*u);
      return cg.dep*(1-s)+(xOf(r)-t)*s; }                     // continuous structural blend from frame/mount to outer shell
    if(r>=cg.rCone) return cg.dep;                            // broad flat annular/square driver mounting land
    return coneRear(r); };                                    // cone-following front-chamber roof
  /* band geometry rides the slot record (computed once in layout - the
     dishMesh/law divergence is structurally gone, b532) */
  const band=(tp[0].slot&&tp[0].slot.band)||null;
  const w0=band? band.w0 : Math.min(Math.max(sb*1.6,0.012),(rDish-rLand)/2*0.6);
  const rIn=band? band.rIn : Math.max(rLand+0.0005,rP-w0), rOut=band? band.rOut : Math.min(rDish-0.004,rP+w0);
  const COLS=Math.max(18, Math.ceil(72/N)), NA=N*COLS, NRi=8, NRo=8;   // ring resolution holds even at 2 taps; finer patches (his mesh-quality zoom)
  const pos=[], tri=[], faceNormals=[];
  const V=(x,y,z)=>{ pos.push([x,y,z]); return pos.length-1; };
  /* The apex insert is not a circular puck inside a square horn. Its section
     exponent is sampled from the SAME station ladder as the outer shell, so
     round at the CD evolves continuously into the selected mouth shape before
     the printable seam. */
  const FC=(r,ph,back)=>{ const xf=xOf(r), dd=dimsAt(st,xf);
    const q=sePoint(r,r*(dd.b/Math.max(1e-9,dd.a)),dd.n,ph);
    return [back?Math.min(dishBack(r),xf-t*0.35):xf,q[0],q[1]]; };
  const F=(r,ph,back)=>{ const p=FC(r,ph,back), i=V(p[0],p[1],p[2]);
    const dr=Math.max(2e-5,r*8e-4), da=0.002;
    const a=FC(Math.max(rB,r-dr),ph,back), b=FC(Math.min(rDish,r+dr),ph,back);
    const c=FC(r,ph-da,back), d=FC(r,ph+da,back);
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[d[0]-c[0],d[1]-c[1],d[2]-c[2]];
    let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const nl=Math.hypot(...n)||1; n=n.map(x=>x/nl);
    if(back) n=n.map(x=>-x);
    faceNormals[i]=n; return i; };
  const quad=(a,b,c,d,flip)=>{ if(flip) tri.push([a,b,c],[b,d,c]); else tri.push([a,c,b],[b,c,d]); };
  const ring=(rr,back)=>{ const out=[]; for(let j=0;j<NA;j++) out.push(F(rr,j/NA*2*Math.PI,back)); return out; };
  for(const back of [false,true]){
    /* inner + outer annuli (plain polar grids) */
    let bandIn=null, bandOut=null;
    const outerBands=rOut<cg.rFrame&&cg.rFrame<rDish
      ? [[rOut,cg.rFrame,Math.max(4,Math.floor(NRo/2))],[cg.rFrame,rDish,Math.max(4,Math.ceil(NRo/2))]]
      : [[rOut,rDish,NRo]];
    for(const [r0,r1,NR] of [[rB,rIn,NRi],...outerBands]){
      const rows=[]; for(let i=0;i<=NR;i++) rows.push(ring(r0+(r1-r0)*i/NR,back));
      for(let i=0;i<NR;i++) for(let j=0;j<NA;j++)
        quad(rows[i][j],rows[i][(j+1)%NA],rows[i+1][j],rows[i+1][(j+1)%NA],back);
      if(Math.abs(r1-rIn)<1e-9) bandIn=rows[NR];
      if(Math.abs(r0-rOut)<1e-9) bandOut=rows[0];
    }
    /* the hole band: one rect-to-STADIUM patch per tap (arc slots - his print
       photo; sa==sb degenerates to the Reference D round hole) */
    for(let k=0;k<N;k++){
      const phC=tp[k].phi, j0=k*COLS;
      const loop=[], outerUV=[];
      const halfSector=Math.PI*rP/N;
      for(let j=0;j<=COLS;j++){                                               // bottom, left->right
        loop.push(bandIn[(j0+j)%NA]);
        outerUV.push([-halfSector+2*halfSector*j/COLS,rIn-rP]); }
      const SIDE=Math.max(6,Math.floor(COLS/2));
      for(let j=1;j<SIDE;j++){                                                // right, bottom->top
        const v=(rIn-rP)+(rOut-rIn)*j/SIDE;
        loop.push(F(rP+v,phC+halfSector/rP,back));
        outerUV.push([halfSector,v]); }
      for(let j=COLS;j>=0;j--){                                               // top, right->left
        loop.push(bandOut[(j0+j)%NA]);
        outerUV.push([-halfSector+2*halfSector*j/COLS,rOut-rP]); }
      for(let j=SIDE-1;j>=1;j--){                                             // left, top->bottom
        const v=(rIn-rP)+(rOut-rIn)*j/SIDE;
        loop.push(F(rP+v,phC-halfSector/rP,back));
        outerUV.push([-halfSector,v]); }
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
      /* For a circle, pair each cutter vertex to the sector boundary on the
         same radial ray. This star-shaped map has a positive Jacobian all the
         way from bore to sector and cannot fold through itself. Uniform
         perimeter sampling paired to a rectangular boundary was topologically
         closed but geometrically crossed (the build-568 blade artifact). */
      const uv=[];
      if(Lst<1e-10){ for(const o of outerUV){ const d=Math.hypot(o[0],o[1])||1;
          uv.push([sb*o[0]/d,sb*o[1]/d]); } }
      else for(let i=0;i<Mloop;i++) uv.push(stadPt(i/Mloop*per));
      let Apoly=0; for(let i=0;i<Mloop;i++){ const a=uv[i], b2=uv[(i+1)%Mloop];
        Apoly+=a[0]*b2[1]-b2[0]*a[1]; } Apoly=Math.abs(Apoly)/2;
      const Atrue=4*sa*sb-(4-Math.PI)*sb*sb;
      const fsc=Math.sqrt(Math.max(0.5,Atrue/Math.max(1e-12,Apoly)));         // discrete-polygon correction (~1%)
      const holeUV=uv.map(q2=>[q2[0]*fsc,q2[1]*fsc]);
      const patchLoop=loop,patchUV=outerUV;
      /* The LF bores enter sideways through the sloped dome. Their rear
         openings move outward along the local surface normal; connecting the
         front and rear loops therefore makes a lateral barrel, not an axial
         hole through a flat plate. */
      /* The opening lives on the sloped SIDE of the dome, as in the reference
         build. Keep its front/rear polar footprint coincident: offsetting only
         the rear loop made the barrel cross the chamber roof. The two loops
         still lie on different shaped surfaces, so this is a true through-bore
         into the front chamber, not a black decal or a blind vertical pocket. */
      const rPc=rP;
      for(const q2 of holeUV)
        circ.push(F(rPc+q2[1], phC+q2[0]/Math.max(1e-6,rPc), back));
      /* b540: do not stretch one triangle fan from the hole to the full 90°
         sector. That was the four-bladed "pinwheel" in Marwan's screenshot:
         mathematically open, visually and mechanically terrible. March through
         six nested, surface-conforming loops instead. Every loop has identical
         winding and vertex correspondence, so the bore is clean and the face
         remains a sampled R-OSSE surface right up to the cutter. */
      const PATCH=6, rows=[circ];
      for(let q=1;q<PATCH;q++){ const f=q/PATCH, sm=f*f*(3-2*f), row=[];
        for(let i=0;i<Mloop;i++){
          const u=holeUV[i][0]+(patchUV[i][0]-holeUV[i][0])*sm;
          const v=holeUV[i][1]+(patchUV[i][1]-holeUV[i][1])*sm;
          row.push(F(rP+v,phC+u/rP,back)); }
        rows.push(row); }
      rows.push(patchLoop);
      for(let q=0;q<PATCH;q++) for(let i=0;i<Mloop;i++){ const i2=(i+1)%Mloop;
        quad(rows[q][i],rows[q][i2],rows[q+1][i],rows[q+1][i2],back); }
      if(!back){ tp[k]._loopF=circ; } else { tp[k]._loopB=circ; }
    }
  }
  /* hole tubes, bore wall, rim edge - front ring <-> back ring */
  const faceVertexCount=pos.length;                            // viewport may weld only the smooth acoustic faces
  const join=(A,B,flip)=>{ for(let i=0;i<A.length;i++){ const i2=(i+1)%A.length;
    quad(A[i],A[i2],B[i],B[i2],flip); } };
  const boreTriStart=tri.length;
  for(const d of tp){
    /* Duplicate the bore-wall lip vertices. Sharing them with the R-OSSE face
       made computeVertexNormals average the face and tube normals, visually
       melting each drilled edge even though the STL was technically open.
       Coincident duplicate coordinates keep the solid closed while preserving
       the sharp machined rim visible in Marwan's physical reference. */
    const wallF=d._loopF.map(i=>V(pos[i][0],pos[i][1],pos[i][2]));
    const wallB=d._loopB.map(i=>V(pos[i][0],pos[i][1],pos[i][2]));
    join(wallF,wallB,true); delete d._loopF; delete d._loopB;
  }
  const boreTriEnd=tri.length;
  join(ring(rB,false),ring(rB,true),true);
  const seamFront=ring(rDish,false), seamBack=ring(rDish,true);
  if(!openOuter) join(seamFront,seamBack,false);
  return {pos, tri, faceVertexCount, faceNormals,boreTri:[boreTriStart,boreTriEnd],
    seam:openOuter?{front:seamFront,back:seamBack}:null};
}
/* One-piece printable coax horn.
   dishMesh owns the CD-to-cone region and the real lateral tap bores.  The
   extension below continues from its open outer loops to the mouth and closes
   the material on the OUTSIDE.  It deliberately has no internal partition or
   coincident throat cap: the only air boundaries are the horn channel, the CD
   throat, the mouth and the LF tap barrels. */
function coaxHornMesh(S){
  if(S.topo!=='1way') return shellMesh(S);
  const dm=dishMesh(S,true);
  if(!dm||!dm.seam) return null;
  const st=stations(S), wt=S.wallT||0.012;
  const SP=st.pts.filter(p=>p.x>=st.xAdapter-1e-9);
  const pre=SP.filter(p=>!p.roll);
  if(SP.length<2||pre.length<2) return null;
  const M=dm.seam.front.length, pos=dm.pos.slice(), tri=dm.tri.slice();
  const P=(x,q)=>{pos.push([x,q[0],q[1]]);return pos.length-1;};
  const quad=(a,b,c,d)=>tri.push([a,c,b],[b,c,d]);
  const iIn=[dm.seam.front];
  for(let j=1;j<SP.length;j++){
    /* The coax body uses one angle-parameterized superellipse family from its
       circular handoff through the optional square morph. Switching to the
       classic panel-perimeter parameterization after the seam rotated the
       rings relative to the dish and crossed the outer bridge. Non-coax
       classic horns retain their exact flat-plate generator. */
    const p=SP[j],q=seRing(p.a,p.b,(p.n!==undefined)?p.n:st.n,M,'smooth');
    iIn.push(q.map(v=>P(p.x,v))); }
  const iOut=pre.map(p=>{
    const d=dimsAt(st,p.x),q=seRing(d.a+wt,d.b+wt,(d.n!==undefined)?d.n:st.n,M,'smooth');
    return q.map(v=>P(p.x,v)); });
  for(let j=0;j<iIn.length-1;j++)for(let i=0;i<M;i++){
    const k=(i+1)%M; quad(iIn[j][i],iIn[j][k],iIn[j+1][i],iIn[j+1][k]); }
  for(let j=0;j<iOut.length-1;j++)for(let i=0;i<M;i++){
    const k=(i+1)%M; quad(iOut[j][k],iOut[j][i],iOut[j+1][k],iOut[j+1][i]); }
  const jm=iIn.length-1,jo=iOut.length-1;
  for(let i=0;i<M;i++){ const k=(i+1)%M;
    quad(iIn[jm][k],iIn[jm][i],iOut[jo][k],iOut[jo][i]);       // mouth material
    quad(dm.seam.back[i],dm.seam.back[k],iOut[0][i],iOut[0][k]); } // continuous rear/outer wall
  return orientSolid({pos,tri,boreTri:dm.boreTri});
}
/* Coordinate-welded fabrication audit/orientation.
   STL has no shared vertex table, so topology must be judged by geometric
   edge identity rather than raw array indices. A watertight edge count alone
   is insufficient: build 567 had 576 same-direction edge pairs, which made
   valid wall patches back-face-cull and exposed the interior like loose
   blades. This propagates one consistent winding over the connected boundary
   and flips the complete shell only when its signed volume is negative. */
const PACKED_INDEX_BITS=21;
const PACKED_INDEX_LIMIT=2**PACKED_INDEX_BITS;
const PACKED_INDEX_MASK=(1n<<BigInt(PACKED_INDEX_BITS))-1n;
const PACKED_EDGE_PAYLOAD_BITS=BigInt(PACKED_INDEX_BITS+1);
const PACKED_EDGE_PAYLOAD_MASK=(1n<<PACKED_EDGE_PAYLOAD_BITS)-1n;

function packedTripleView(data){
  const count=data.length/3;
  const triple=index=>{
    index=Number(index);
    if(!Number.isInteger(index)||index<0||index>=count)return undefined;
    const at=index*3;
    return [data[at],data[at+1],data[at+2]];
  };
  const view={
    length:count,
    at:triple,
    forEach(callback,thisArg){
      for(let i=0;i<count;i++)callback.call(thisArg,triple(i),i,this);
    },
    map(callback,thisArg){
      const out=new Array(count);
      for(let i=0;i<count;i++)out[i]=callback.call(thisArg,triple(i),i,this);
      return out;
    },
    slice(begin,end){
      const from=Math.max(0,begin===undefined?0:(begin<0?count+begin:begin)|0);
      const to=Math.max(from,Math.min(count,end===undefined?count:(end<0?count+end:end)|0));
      const out=new Array(to-from);
      for(let i=from;i<to;i++)out[i-from]=triple(i);
      return out;
    },
    *[Symbol.iterator](){for(let i=0;i<count;i++)yield triple(i);}
  };
  return new Proxy(view,{get(target,property,receiver){
    if(typeof property==='string'&&/^(?:0|[1-9]\d*)$/.test(property))
      return triple(Number(property));
    return Reflect.get(target,property,receiver);
  }});
}
function packedMesh(positions,indices,extra){
  if(!(positions instanceof Float32Array||positions instanceof Float64Array)||
      !(indices instanceof Uint32Array)||
      positions.length%3||indices.length%3)
    throw new TypeError('packedMesh requires xyz positions and triangle indices');
  const mesh={...(extra||{}),packed:true,positions,indices};
  mesh.pos=packedTripleView(positions);
  mesh.tri=packedTripleView(indices);
  return mesh;
}
function clonePackedMesh(mesh,positions,indices,extra){
  const meta={};
  for(const [key,value] of Object.entries(mesh||{}))
    if(!['packed','positions','indices','pos','tri'].includes(key))meta[key]=value;
  return packedMesh(positions||mesh.positions,indices||mesh.indices,{...meta,...(extra||{})});
}
function meshVertexCount(mesh){
  return mesh&&mesh.packed?mesh.positions.length/3:((mesh&&mesh.pos&&mesh.pos.length)||0);
}
function meshTriangleCount(mesh){
  return mesh&&mesh.packed?mesh.indices.length/3:((mesh&&mesh.tri&&mesh.tri.length)||0);
}
function meshVertex(mesh,index,out){
  if(mesh&&mesh.packed){
    const at=index*3,target=out||[0,0,0];
    target[0]=mesh.positions[at];target[1]=mesh.positions[at+1];target[2]=mesh.positions[at+2];
    return target;
  }
  const source=mesh.pos[index];
  if(!out)return source;
  out[0]=source[0];out[1]=source[1];out[2]=source[2];return out;
}
function meshTriangle(mesh,index,out){
  if(mesh&&mesh.packed){
    const at=index*3,target=out||[0,0,0];
    target[0]=mesh.indices[at];target[1]=mesh.indices[at+1];target[2]=mesh.indices[at+2];
    return target;
  }
  const source=mesh.tri[index];
  if(!out)return source;
  out[0]=source[0];out[1]=source[1];out[2]=source[2];return out;
}
function packedMeshError(code,message,details){
  const error=new Error(message);error.name='MeshBudgetError';error.code=code;
  if(details)error.details=details;
  return error;
}

function meshAuditUnpacked(mesh){
  const q=p=>Math.round(p[0]*1e8)+','+Math.round(p[1]*1e8)+','+Math.round(p[2]*1e8);
  const edges=new Map(), faces=new Set(), areaEps=1e-14;
  let degenerate=0,duplicateFaces=0,nonFinite=0,volume=0,minArea=Infinity,maxArea=0;
  mesh.tri.forEach((t,ti)=>{
    const a=mesh.pos[t[0]],b=mesh.pos[t[1]],c=mesh.pos[t[2]];
    if(!a||!b||!c||![...a,...b,...c].every(Number.isFinite)){ nonFinite++; return; }
    const fk=[q(a),q(b),q(c)].sort().join('|');
    if(faces.has(fk)) duplicateFaces++; else faces.add(fk);
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const area=Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)/2;
    minArea=Math.min(minArea,area); maxArea=Math.max(maxArea,area);
    if(area*2<areaEps) degenerate++;
    volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(const [i,j] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
      const A=q(mesh.pos[i]),B=q(mesh.pos[j]),key=A<B?A+'|'+B:B+'|'+A,dir=A<B?1:-1;
      if(!edges.has(key)) edges.set(key,[]);
      edges.get(key).push({ti,dir}); } });
  let badEdges=0,badOrientation=0;
  const adj=Array.from({length:mesh.tri.length},()=>[]);
  for(const e of edges.values()){
    if(e.length!==2){badEdges++;continue;}
    if(e[0].dir===e[1].dir) badOrientation++;
    const parity=e[0].dir===e[1].dir?1:0;
    adj[e[0].ti].push([e[1].ti,parity]); adj[e[1].ti].push([e[0].ti,parity]); }
  const seen=new Uint8Array(mesh.tri.length),flip=new Uint8Array(mesh.tri.length);
  let components=0,orientationConflict=0;
  for(let s=0;s<mesh.tri.length;s++) if(!seen[s]){
    components++; seen[s]=1; const stack=[s];
    while(stack.length){ const i=stack.pop();
      for(const [j,p] of adj[i]){ const f=flip[i]^p;
        if(!seen[j]){seen[j]=1;flip[j]=f;stack.push(j);}
        else if(flip[j]!==f) orientationConflict++; } } }
  return {badEdges,badOrientation,degenerate,duplicateFaces,nonFinite,components,
    orientationConflict,volume,minArea:Number.isFinite(minArea)?minArea:0,maxArea,flips:flip};
}
function orientSolidUnpacked(mesh){
  let a=meshAuditUnpacked(mesh),tri=mesh.tri.map(t=>t.slice());
  if(!a.badEdges&&!a.orientationConflict){
    for(let i=0;i<tri.length;i++) if(a.flips[i]){const x=tri[i][1];tri[i][1]=tri[i][2];tri[i][2]=x;}
    let out={...mesh,tri}; a=meshAuditUnpacked(out);
    if(a.volume<0){ for(const t of tri){const x=t[1];t[1]=t[2];t[2]=x;} out={...mesh,tri}; a=meshAuditUnpacked(out); }
    out.audit=a; return out; }
  return {...mesh,tri,audit:a};
}
/* Deep triangle-intersection audit for fabrication release.
   Edge manifoldness does not catch a surface folded through itself.  A small
   spatial hash narrows the candidate pairs, then segment/triangle tests catch
   non-coplanar crossings and a dominant-axis 2-D test catches coplanar overlap.
   Coordinate-adjacent faces are intentionally skipped: they meet at a legal
   printed edge even when the STL stores duplicate lip vertices. */
function meshSelfIntersectionsUnpacked(mesh,limit){
  limit=Math.max(1,limit||1);
  const Q=p=>Math.round(p[0]*1e8)+','+Math.round(p[1]*1e8)+','+Math.round(p[2]*1e8);
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const eps=1e-9;
  const segTri=(p0,p1,a,b,c)=>{
    const d=sub(p1,p0),e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);
    if(Math.abs(det)<eps) return false;
    const inv=1/det,s=sub(p0,a),u=inv*dot(s,h); if(u<=eps||u>=1-eps) return false;
    const q=cross(s,e1),v=inv*dot(d,q); if(v<=eps||u+v>=1-eps) return false;
    const t=inv*dot(e2,q); return t>eps&&t<1-eps;
  };
  const orient2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const onSeg=(a,b,p)=>Math.abs(orient2(a,b,p))<eps&&
    p[0]>=Math.min(a[0],b[0])-eps&&p[0]<=Math.max(a[0],b[0])+eps&&
    p[1]>=Math.min(a[1],b[1])-eps&&p[1]<=Math.max(a[1],b[1])+eps;
  const seg2=(a,b,c,d)=>{
    const o1=orient2(a,b,c),o2=orient2(a,b,d),o3=orient2(c,d,a),o4=orient2(c,d,b);
    return ((o1>eps&&o2<-eps)||(o1<-eps&&o2>eps))&&((o3>eps&&o4<-eps)||(o3<-eps&&o4>eps));
  };
  const inTri2=(p,a,b,c)=>{
    const x=orient2(a,b,p),y=orient2(b,c,p),z=orient2(c,a,p);
    return (x>eps&&y>eps&&z>eps)||(x<-eps&&y<-eps&&z<-eps);
  };
  const intersects=(A,B)=>{
    for(let i=0;i<3;i++) if(segTri(A[i],A[(i+1)%3],B[0],B[1],B[2])) return true;
    for(let i=0;i<3;i++) if(segTri(B[i],B[(i+1)%3],A[0],A[1],A[2])) return true;
    const n=cross(sub(A[1],A[0]),sub(A[2],A[0])),nl=Math.hypot(...n);
    if(nl<eps) return false;
    const cop=B.every(p=>Math.abs(dot(n,sub(p,A[0])))/nl<2e-8);
    if(!cop) return false;
    const ax=Math.abs(n[0])>=Math.abs(n[1])&&Math.abs(n[0])>=Math.abs(n[2])?0:
      (Math.abs(n[1])>=Math.abs(n[2])?1:2);
    const pr=p=>ax===0?[p[1],p[2]]:ax===1?[p[0],p[2]]:[p[0],p[1]];
    const a=A.map(pr),b=B.map(pr);
    for(let i=0;i<3;i++)for(let j=0;j<3;j++) if(seg2(a[i],a[(i+1)%3],b[j],b[(j+1)%3])) return true;
    return inTri2(a[0],b[0],b[1],b[2])||inTri2(b[0],a[0],a[1],a[2]);
  };
  const tris=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<mesh.tri.length;i++){ const p=mesh.tri[i].map(k=>mesh.pos[k]);
    if(!p.every(v=>v&&v.every(Number.isFinite))) continue;
    const mn=[0,1,2].map(k=>Math.min(p[0][k],p[1][k],p[2][k]));
    const mx=[0,1,2].map(k=>Math.max(p[0][k],p[1][k],p[2][k]));
    for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],mn[k]);hi[k]=Math.max(hi[k],mx[k]);}
    tris.push({i,p,mn,mx,keys:new Set(p.map(Q))}); }
  const diag=Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]);
  const cell=Math.max(0.004,diag/42),bins=new Map();
  for(const t of tris){ const a=t.mn.map((v,k)=>Math.floor((v-lo[k])/cell));
    const b=t.mx.map((v,k)=>Math.floor((v-lo[k])/cell));
    t.cellLo=a;t.cellHi=b;
    for(let x=a[0];x<=b[0];x++)for(let y=a[1];y<=b[1];y++)for(let z=a[2];z<=b[2];z++){
      const k=x+','+y+','+z;
      if(!bins.has(k))bins.set(k,{coord:[x,y,z],items:[]});
      bins.get(k).items.push(t); } }
  let hits=0,tested=0,firstPair=null;
  /* A triangle pair can share several spatial cells.  Test it only in the
     lexicographically first cell common to both AABBs instead of retaining an
     unbounded global Set of every candidate pair.  Dense export meshes can
     otherwise exceed V8's Set limit before the geometric test even runs. */
  for(const bucket of bins.values()){const bin=bucket.items,coord=bucket.coord;
    for(let i=0;i<bin.length;i++)for(let j=i+1;j<bin.length;j++){
    const A=bin[i],B=bin[j];
    if(coord[0]!==Math.max(A.cellLo[0],B.cellLo[0])||
       coord[1]!==Math.max(A.cellLo[1],B.cellLo[1])||
       coord[2]!==Math.max(A.cellLo[2],B.cellLo[2])) continue;
    if([...A.keys].some(k=>B.keys.has(k))) continue;
    if(A.mx.some((v,k)=>v<B.mn[k]-eps||B.mx[k]<A.mn[k]-eps)) continue;
    tested++; if(intersects(A.p,B.p)){ if(!firstPair) firstPair=[A.i,B.i];
      if(++hits>=limit) return {count:hits,tested,limited:true,firstPair}; } }
  }
  return {count:hits,tested,limited:false,firstPair};
}
function meshAuditPacked(mesh){
  const positions=mesh.positions,indices=mesh.indices,
    vertices=positions.length/3,triangles=indices.length/3;
  if(vertices>=PACKED_INDEX_LIMIT||triangles>=PACKED_INDEX_LIMIT)
    throw packedMeshError('MESH_PACKED_INDEX_LIMIT',
      'Packed topology exceeds the exact 21-bit audit index envelope',
      {vertices,triangles,limit:PACKED_INDEX_LIMIT-1});
  const edgeRecords=new BigUint64Array(triangles*3),
    faceKeys=new BigUint64Array(triangles),
    adjacency=new Int32Array(triangles*3),
    parity=new Uint8Array(triangles*3),
    degree=new Uint8Array(triangles);
  adjacency.fill(-1);
  let edgeCount=0,faceCount=0,degenerate=0,duplicateFaces=0,nonFinite=0,
    volume=0,minArea=Infinity,maxArea=0;
  const faceKey=(a,b,c)=>{
    if(a>b){const q=a;a=b;b=q;}if(b>c){const q=b;b=c;c=q;}if(a>b){const q=a;a=b;b=q;}
    return (BigInt(a)<<42n)|(BigInt(b)<<21n)|BigInt(c);
  };
  const edgeRecord=(a,b,triangle)=>{
    const lo=Math.min(a,b),hi=Math.max(a,b),dir=a<b?1:0,
      edge=(BigInt(lo)<<21n)|BigInt(hi);
    return (edge<<PACKED_EDGE_PAYLOAD_BITS)|(BigInt(triangle)<<1n)|BigInt(dir);
  };
  for(let ti=0;ti<triangles;ti++){
    const it=ti*3,a=indices[it],b=indices[it+1],c=indices[it+2];
    if(a>=vertices||b>=vertices||c>=vertices){nonFinite++;continue;}
    const ia=a*3,ib=b*3,ic=c*3,
      ax=positions[ia],ay=positions[ia+1],az=positions[ia+2],
      bx=positions[ib],by=positions[ib+1],bz=positions[ib+2],
      cx=positions[ic],cy=positions[ic+1],cz=positions[ic+2];
    if(![ax,ay,az,bx,by,bz,cx,cy,cz].every(Number.isFinite)){nonFinite++;continue;}
    const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az,
      nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,
      area=Math.hypot(nx,ny,nz)/2;
    minArea=Math.min(minArea,area);maxArea=Math.max(maxArea,area);
    if(area*2<1e-14)degenerate++;
    volume+=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
    faceKeys[faceCount++]=faceKey(a,b,c);
    edgeRecords[edgeCount++]=edgeRecord(a,b,ti);
    edgeRecords[edgeCount++]=edgeRecord(b,c,ti);
    edgeRecords[edgeCount++]=edgeRecord(c,a,ti);
  }
  const sortedFaces=faceKeys.subarray(0,faceCount);sortedFaces.sort();
  for(let i=1;i<sortedFaces.length;i++)if(sortedFaces[i]===sortedFaces[i-1])duplicateFaces++;
  const sortedEdges=edgeRecords.subarray(0,edgeCount);sortedEdges.sort();
  let badEdges=0,badOrientation=0;
  const connect=(a,b,p)=>{
    if(degree[a]>=3||degree[b]>=3){badEdges++;return;}
    const aa=a*3+degree[a]++,bb=b*3+degree[b]++;
    adjacency[aa]=b;parity[aa]=p;adjacency[bb]=a;parity[bb]=p;
  };
  for(let begin=0;begin<sortedEdges.length;){
    const edge=sortedEdges[begin]>>PACKED_EDGE_PAYLOAD_BITS;
    let end=begin+1;
    while(end<sortedEdges.length&&
      (sortedEdges[end]>>PACKED_EDGE_PAYLOAD_BITS)===edge)end++;
    if(end-begin!==2)badEdges++;
    else{
      const left=sortedEdges[begin]&PACKED_EDGE_PAYLOAD_MASK,
        right=sortedEdges[begin+1]&PACKED_EDGE_PAYLOAD_MASK,
        ta=Number(left>>1n),tb=Number(right>>1n),
        da=Number(left&1n),db=Number(right&1n),
        p=da===db?1:0;
      if(p)badOrientation++;
      connect(ta,tb,p);
    }
    begin=end;
  }
  const seen=new Uint8Array(triangles),flip=new Uint8Array(triangles),
    stack=new Uint32Array(Math.max(1,triangles));
  let components=0,orientationConflict=0;
  for(let start=0;start<triangles;start++)if(!seen[start]){
    components++;seen[start]=1;let size=0;stack[size++]=start;
    while(size){
      const current=stack[--size],base=current*3;
      for(let slot=0;slot<degree[current];slot++){
        const next=adjacency[base+slot],wanted=flip[current]^parity[base+slot];
        if(!seen[next]){seen[next]=1;flip[next]=wanted;stack[size++]=next;}
        else if(flip[next]!==wanted)orientationConflict++;
      }
    }
  }
  return {badEdges,badOrientation,degenerate,duplicateFaces,nonFinite,components,
    orientationConflict,volume,minArea:Number.isFinite(minArea)?minArea:0,maxArea,
    flips:flip,auditStorage:'packed-sorted-edges'};
}
function meshSignedVolumePacked(positions,indices){
  let volume=0;
  for(let ti=0;ti<indices.length;ti+=3){
    const ia=indices[ti]*3,ib=indices[ti+1]*3,ic=indices[ti+2]*3,
      ax=positions[ia],ay=positions[ia+1],az=positions[ia+2],
      bx=positions[ib],by=positions[ib+1],bz=positions[ib+2],
      cx=positions[ic],cy=positions[ic+1],cz=positions[ic+2];
    volume+=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
  }
  return volume;
}
function meshAudit(mesh){
  return mesh&&mesh.packed?meshAuditPacked(mesh):meshAuditUnpacked(mesh);
}
function orientSolid(mesh){
  if(!mesh||!mesh.packed)return orientSolidUnpacked(mesh);
  const audit=meshAuditPacked(mesh);
  if(audit.badEdges||audit.orientationConflict)
    return clonePackedMesh(mesh,null,null,{audit});
  const indices=mesh.indices.slice(),triangles=indices.length/3;
  for(let ti=0;ti<triangles;ti++)if(audit.flips[ti]){
    const at=ti*3,q=indices[at+1];indices[at+1]=indices[at+2];indices[at+2]=q;
  }
  let volume=meshSignedVolumePacked(mesh.positions,indices);
  if(volume<0){
    for(let ti=0;ti<triangles;ti++){
      const at=ti*3,q=indices[at+1];indices[at+1]=indices[at+2];indices[at+2]=q;
    }
    volume=-volume;
  }
  return clonePackedMesh(mesh,null,indices,{audit:{...audit,badOrientation:0,volume,
    flips:new Uint8Array(triangles)}});
}

function packedTrianglesIntersect(positions,indices,left,right,scratch){
  for(let vertex=0;vertex<3;vertex++){
    let source=indices[left*3+vertex]*3,target=vertex*3;
    scratch[target]=positions[source];scratch[target+1]=positions[source+1];
    scratch[target+2]=positions[source+2];
    source=indices[right*3+vertex]*3;target=9+vertex*3;
    scratch[target]=positions[source];scratch[target+1]=positions[source+1];
    scratch[target+2]=positions[source+2];
  }
  const eps=1e-9;
  const segTri=(p0,p1,a,b,c)=>{
    const dx=scratch[p1]-scratch[p0],dy=scratch[p1+1]-scratch[p0+1],
      dz=scratch[p1+2]-scratch[p0+2],
      e1x=scratch[b]-scratch[a],e1y=scratch[b+1]-scratch[a+1],
      e1z=scratch[b+2]-scratch[a+2],
      e2x=scratch[c]-scratch[a],e2y=scratch[c+1]-scratch[a+1],
      e2z=scratch[c+2]-scratch[a+2],
      hx=dy*e2z-dz*e2y,hy=dz*e2x-dx*e2z,hz=dx*e2y-dy*e2x,
      det=e1x*hx+e1y*hy+e1z*hz;
    if(Math.abs(det)<eps)return false;
    const inv=1/det,sx=scratch[p0]-scratch[a],sy=scratch[p0+1]-scratch[a+1],
      sz=scratch[p0+2]-scratch[a+2],
      u=inv*(sx*hx+sy*hy+sz*hz);
    if(u<=eps||u>=1-eps)return false;
    const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,
      v=inv*(dx*qx+dy*qy+dz*qz);
    if(v<=eps||u+v>=1-eps)return false;
    const t=inv*(e2x*qx+e2y*qy+e2z*qz);
    return t>eps&&t<1-eps;
  };
  for(let edge=0;edge<3;edge++)
    if(segTri(edge*3,((edge+1)%3)*3,9,12,15))return true;
  for(let edge=0;edge<3;edge++)
    if(segTri(9+edge*3,9+((edge+1)%3)*3,0,3,6))return true;
  const e1x=scratch[3]-scratch[0],e1y=scratch[4]-scratch[1],e1z=scratch[5]-scratch[2],
    e2x=scratch[6]-scratch[0],e2y=scratch[7]-scratch[1],e2z=scratch[8]-scratch[2],
    nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x,
    nl=Math.hypot(nx,ny,nz);
  if(nl<eps)return false;
  for(const point of [9,12,15]){
    const distance=Math.abs(nx*(scratch[point]-scratch[0])+
      ny*(scratch[point+1]-scratch[1])+nz*(scratch[point+2]-scratch[2]))/nl;
    if(distance>=2e-8)return false;
  }
  const axis=Math.abs(nx)>=Math.abs(ny)&&Math.abs(nx)>=Math.abs(nz)?0:
    (Math.abs(ny)>=Math.abs(nz)?1:2);
  const px=offset=>axis===0?scratch[offset+1]:scratch[offset],
    py=offset=>axis===2?scratch[offset+1]:scratch[offset+2],
    orient=(a,b,c)=>(px(b)-px(a))*(py(c)-py(a))-(py(b)-py(a))*(px(c)-px(a)),
    segment=(a,b,c,d)=>{
      const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
      return ((o1>eps&&o2<-eps)||(o1<-eps&&o2>eps))&&
        ((o3>eps&&o4<-eps)||(o3<-eps&&o4>eps));
    },
    inside=(p,a,b,c)=>{
      const x=orient(a,b,p),y=orient(b,c,p),z=orient(c,a,p);
      return (x>eps&&y>eps&&z>eps)||(x<-eps&&y<-eps&&z<-eps);
    };
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)
    if(segment(a*3,((a+1)%3)*3,9+b*3,9+((b+1)%3)*3))return true;
  return inside(0,9,12,15)||inside(9,0,3,6);
}
function meshSelfIntersectionsPacked(mesh,limit){
  limit=Math.max(1,limit||1);
  const positions=mesh.positions,indices=mesh.indices,triangles=indices.length/3;
  if(!triangles)return {count:0,tested:0,limited:false,firstPair:null,
    binReferences:0,pairVisits:0,peakBinOccupancy:0,binsPerAxis:0,
    auditStorage:'packed-csr-bins'};
  const binsPerAxis=triangles>=750000?128:(triangles>=300000?64:42),
    binTotal=binsPerAxis**3,
    aabb=new Float32Array(triangles*6),cells=new Uint8Array(triangles*6),
    counts=new Uint32Array(binTotal),valid=new Uint8Array(triangles),
    lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let ti=0;ti<triangles;ti++){
    const at=ti*3,a=indices[at]*3,b=indices[at+1]*3,c=indices[at+2]*3;
    if(a>=positions.length||b>=positions.length||c>=positions.length)continue;
    const values=[positions[a],positions[a+1],positions[a+2],
      positions[b],positions[b+1],positions[b+2],
      positions[c],positions[c+1],positions[c+2]];
    if(!values.every(Number.isFinite))continue;
    const box=ti*6;
    for(let axis=0;axis<3;axis++){
      const mn=Math.min(values[axis],values[axis+3],values[axis+6]),
        mx=Math.max(values[axis],values[axis+3],values[axis+6]);
      aabb[box+axis]=mn;aabb[box+3+axis]=mx;
      lo[axis]=Math.min(lo[axis],mn);hi[axis]=Math.max(hi[axis],mx);
    }
    valid[ti]=1;
  }
  const diag=Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]),
    cellSize=Math.max(0.004,diag/binsPerAxis),
    cellIndex=(value,axis)=>Math.max(0,Math.min(binsPerAxis-1,
      Math.floor((value-lo[axis])/cellSize)));
  let references=0,peakBinOccupancy=0;
  const maxReferences=Math.max(1,+(mesh.auditLimits&&mesh.auditLimits.maxAuditBinRefs)||12000000),
    maxOccupancy=Math.max(1,+(mesh.auditLimits&&mesh.auditLimits.maxAuditBinOccupancy)||8192);
  for(let ti=0;ti<triangles;ti++)if(valid[ti]){
    const box=ti*6,cell=ti*6;
    for(let axis=0;axis<3;axis++){
      cells[cell+axis]=cellIndex(aabb[box+axis],axis);
      cells[cell+3+axis]=cellIndex(aabb[box+3+axis],axis);
    }
    const refs=(cells[cell+3]-cells[cell]+1)*(cells[cell+4]-cells[cell+1]+1)*
      (cells[cell+5]-cells[cell+2]+1);
    references+=refs;
    if(references>maxReferences)
      throw packedMeshError('MESH_AUDIT_BIN_LIMIT',
        'Deep audit exceeded its bounded spatial-bin reference budget',
        {required:references,limit:maxReferences,triangles});
    for(let x=cells[cell];x<=cells[cell+3];x++)
      for(let y=cells[cell+1];y<=cells[cell+4];y++)
        for(let z=cells[cell+2];z<=cells[cell+5];z++){
          const bin=(x*binsPerAxis+y)*binsPerAxis+z,
            occupancy=++counts[bin];
          peakBinOccupancy=Math.max(peakBinOccupancy,occupancy);
          if(occupancy>maxOccupancy)
            throw packedMeshError('MESH_AUDIT_OCCUPANCY_LIMIT',
              'Deep audit exceeded its bounded spatial-bin occupancy budget',
              {required:occupancy,limit:maxOccupancy,bin,triangles});
        }
  }
  const offsets=new Uint32Array(binTotal+1);
  for(let bin=0;bin<binTotal;bin++)offsets[bin+1]=offsets[bin]+counts[bin];
  const cursor=new Uint32Array(binTotal);cursor.set(offsets.subarray(0,binTotal));
  const items=new Uint32Array(references);
  for(let ti=0;ti<triangles;ti++)if(valid[ti]){
    const cell=ti*6;
    for(let x=cells[cell];x<=cells[cell+3];x++)
      for(let y=cells[cell+1];y<=cells[cell+4];y++)
        for(let z=cells[cell+2];z<=cells[cell+5];z++){
          const bin=(x*binsPerAxis+y)*binsPerAxis+z;
          items[cursor[bin]++]=ti;
        }
  }
  const scratch=new Float64Array(18),aabbEps=2e-7,
    maxPairVisits=Math.max(1,+(mesh.auditLimits&&mesh.auditLimits.maxAuditPairVisits)||100000000),
    maxPairs=Math.max(1,+(mesh.auditLimits&&mesh.auditLimits.maxIntersectionPairs)||50000000);
  let hits=0,tested=0,pairVisits=0,firstPair=null;
  for(let bin=0;bin<binTotal;bin++){
    const start=offsets[bin],end=offsets[bin+1];
    if(end-start<2)continue;
    const x=Math.floor(bin/(binsPerAxis*binsPerAxis)),
      rem=bin-x*binsPerAxis*binsPerAxis,y=Math.floor(rem/binsPerAxis),z=rem-y*binsPerAxis;
    for(let left=start;left<end;left++)for(let right=left+1;right<end;right++){
      pairVisits++;
      if(pairVisits>maxPairVisits)
        throw packedMeshError('MESH_AUDIT_PAIR_VISIT_LIMIT',
          'Deep audit exceeded its bounded raw pair-visit budget',
          {required:pairVisits,limit:maxPairVisits,triangles,tested,
            binReferences:references,peakBinOccupancy,binsPerAxis});
      const a=items[left],b=items[right],ca=a*6,cb=b*6;
      if(x!==Math.max(cells[ca],cells[cb])||
          y!==Math.max(cells[ca+1],cells[cb+1])||
          z!==Math.max(cells[ca+2],cells[cb+2]))continue;
      const ia=a*3,ib=b*3,a0=indices[ia],a1=indices[ia+1],a2=indices[ia+2],
        b0=indices[ib],b1=indices[ib+1],b2=indices[ib+2];
      if(a0===b0||a0===b1||a0===b2||a1===b0||a1===b1||a1===b2||
          a2===b0||a2===b1||a2===b2)continue;
      if(aabb[ca+3]<aabb[cb]-aabbEps||aabb[cb+3]<aabb[ca]-aabbEps||
          aabb[ca+4]<aabb[cb+1]-aabbEps||aabb[cb+4]<aabb[ca+1]-aabbEps||
          aabb[ca+5]<aabb[cb+2]-aabbEps||aabb[cb+5]<aabb[ca+2]-aabbEps)continue;
      tested++;
      if(tested>maxPairs)
        throw packedMeshError('MESH_AUDIT_PAIR_TEST_LIMIT',
          'Deep audit exceeded its bounded triangle-pair test budget',
          {required:tested,limit:maxPairs,triangles});
      if(packedTrianglesIntersect(positions,indices,a,b,scratch)){
        if(!firstPair)firstPair=[a,b];
        if(++hits>=limit)return {count:hits,tested,limited:true,firstPair,
          binReferences:references,pairVisits,peakBinOccupancy,binsPerAxis,
          auditStorage:'packed-csr-bins'};
      }
    }
  }
  return {count:hits,tested,limited:false,firstPair,binReferences:references,
    pairVisits,peakBinOccupancy,binsPerAxis,auditStorage:'packed-csr-bins'};
}
function meshSelfIntersections(mesh,limit){
  return mesh&&mesh.packed
    ?meshSelfIntersectionsPacked(mesh,limit)
    :meshSelfIntersectionsUnpacked(mesh,limit);
}
function fabricationAudit(S,mesh,deep){
  const a=mesh&&mesh.audit?mesh.audit:meshAudit(mesh);
  const td=S&&S.topo==='1way'?coaxTapDesign(S,coneGeom(S)):null;
  const si=deep?meshSelfIntersections(mesh,1):{count:null,tested:0,limited:false};
  const pass=!a.badEdges&&!a.badOrientation&&!a.degenerate&&!a.duplicateFaces&&!a.nonFinite&&
    a.components===1&&!a.orientationConflict&&a.volume>0&&
    (!td||td.structural)&&(!deep||si.count===0);
  return {...a,selfIntersections:si.count,intersectionPairs:si.tested,
    minWeb:td?Math.min(td.radialInner,td.radialOuter,td.circumWeb):null,pass};
}
/* Clean design-review surface for the viewport. The printable dishMesh above
   retains constructive hole topology; this regular grid samples the identical
   front/back equations without patch-sector triangulation, and returns the
   true port mouths as separate dark discs. */
function dishVisualMesh(S,back){
  if(S.topo!=='1way') return null;
  const st=stations(S), L=layout(S,st), tp=L.filter(d=>d.kind==='coaxtap');
  if(!tp.length) return null;
  const cg=coneGeom(S), rB=cg.rWG, rDish=cg.rFrame+0.012, t=S.wallT||0.012;
  const WG=st.wgFace, xOf=r=>WG&&WG.ok?rosseXat(WG,r):st.xAdapter*(r-rB)/(rDish-rB);
  const gap=((S.xmC||S.xmW||4)/1000)+0.002;
  const coneRear=r=>cg.dep*Math.max(0,Math.min(1,
    (r-cg.rHole)/Math.max(1e-6,cg.rCone-cg.rHole)));
  const backX=r=>{
    if(r<cg.rHole) return 0;
    if(r<cg.rCone) return coneRear(r);
    if(r<cg.rFrame) return cg.dep;
    const u=Math.max(0,Math.min(1,(r-cg.rFrame)/Math.max(1e-6,rDish-cg.rFrame))),s=u*u*(3-2*u);
    return cg.dep*(1-s)+(xOf(r)-t)*s; };
  const coord=(r,ph,isBack)=>{ const xf=xOf(r),dd=dimsAt(st,xf);
    const q=sePoint(r,r*(dd.b/Math.max(1e-9,dd.a)),dd.n,ph);
    return [isBack?Math.min(backX(r),xf-t*0.35):xf,q[0],q[1]]; };
  const NR=56,NA=128,pos=[],tri=[],rings=[];
  for(let i=0;i<=NR;i++){ const r=rB+(rDish-rB)*i/NR,row=[];
    for(let j=0;j<NA;j++){ row.push(pos.length); pos.push(coord(r,j/NA*2*Math.PI,!!back)); }
    rings.push(row); }
  for(let i=0;i<NR;i++)for(let j=0;j<NA;j++){ const k=(j+1)%NA;
    if(back) tri.push([rings[i][j],rings[i+1][j],rings[i][k]],[rings[i][k],rings[i+1][j],rings[i+1][k]]);
    else tri.push([rings[i][j],rings[i][k],rings[i+1][j]],[rings[i][k],rings[i+1][k],rings[i+1][j]]); }
  const ports=tp.map(d=>{ const r=Math.hypot(d.tap[1],d.tap[2]),ph=d.phi;
    const n=surfN(st,d.x,ph), shift=back?Math.min(rDish-r-(d.slot.sb||0)-0.001,
      t*Math.hypot(n[1],n[2])):0, rr=r+Math.max(0,shift);
    const p=coord(rr,ph,!!back), dr=5e-5,da=0.003;
    const a=coord(Math.max(rB,rr-dr),ph,!!back),b=coord(Math.min(rDish,rr+dr),ph,!!back);
    const c=coord(rr,ph-da,!!back),e=coord(rr,ph+da,!!back);
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[e[0]-c[0],e[1]-c[1],e[2]-c[2]];
    let nn=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const z=Math.hypot(...nn)||1; nn=nn.map(x=>x/z); if(back)nn=nn.map(x=>-x);
    return {p,n:nn,r:d.slot.sb||0.004}; });
  return {pos,tri,ports};
}
/* One uninterrupted acoustic skin for the dedicated HORN INTERIOR camera.
   The printable assembly remains shellMesh + dishMesh, but drawing those two
   watertight solids together necessarily exposes their coincident construction
   edge. This samples the same station law from the CD throat to the mouth in
   one indexed grid, so a tangent-continuous join also reads continuous. */
function interiorVisualMesh(S){
  const st=stations(S), x0=st.pts[0].x, x1=st.depth;
  const NX=144,NA=160,pos=[],tri=[],rings=[];
  for(let i=0;i<=NX;i++){
    const u=i/NX, x=x0+(x1-x0)*u, d=dimsAt(st,x), row=[];
    for(let j=0;j<NA;j++){
      const ph=j/NA*2*Math.PI,
        q=sectionPoint2D(st.sectionFamily||'superellipse',
          d.a,d.b,(d.n!==undefined)?d.n:st.n,d.cornerR,ph,st.style);
      row.push(pos.length); pos.push([x,q[0],q[1]]); }
    rings.push(row); }
  for(let i=0;i<NX;i++)for(let j=0;j<NA;j++){ const k=(j+1)%NA;
    tri.push([rings[i][j],rings[i][k],rings[i+1][j]],
             [rings[i][k],rings[i+1][k],rings[i+1][j]]); }
  return {pos,tri};
}
/* Exact 2-D cutter/preview outline in the local (flow,cross) frame.
   - round: circle
   - slot: true stadium
   - teardrop: a smooth asymmetric constant-area taper. The width function is
     analytic and the sampled polygon is area-normalized to the acoustic Ap,
     so the visual and fabrication cutter cannot silently disagree. */
function slotOutline(slot,K){
  K=Math.max(16,(K|0)||24);
  const sa=slot.sa||0.01, sb=slot.sb||sa, out=[];
  if(slot.teardrop){
    for(let i=0;i<K;i++){ const a=i/K*2*Math.PI, c=Math.cos(a), s=Math.sin(a);
      out.push([sa*c, sb*s*(1-0.42*c)]); }
    let A=0;
    for(let i=0;i<K;i++){ const p=out[i],q=out[(i+1)%K]; A+=p[0]*q[1]-q[0]*p[1]; }
    A=Math.abs(A)/2;
    const target=((slot.apEm||slot.ap||0)/(slot.np||1))*1e-4;
    const sy=target>0&&A>0?target/A:1;
    for(const p of out) p[1]*=sy;
    return out;
  }
  const cx=Math.max(0,sa-sb);
  if(cx<1e-9){
    for(let i=0;i<K;i++){ const a=i/K*2*Math.PI; out.push([sb*Math.cos(a),sb*Math.sin(a)]); }
  } else {
    for(let i=0;i<K/2;i++){ const a=-Math.PI/2+Math.PI*i/(K/2); out.push([cx+sb*Math.cos(a),sb*Math.sin(a)]); }
    for(let i=0;i<K/2;i++){ const a=Math.PI/2+Math.PI*i/(K/2); out.push([-cx+sb*Math.cos(a),sb*Math.sin(a)]); }
  }
  return out;
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
      const K=24, outline=slotOutline(d.slot,K);
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
function curvedFacetLayout(S,options){
  if(S.style!=='curvedFacets')return null;
  const st=stations(S),diagnostics=curvedFacetDiagnostics(st);
  if(options&&options.forming===false&&diagnostics.requiresForming){
    const error=new Error(
      'Selected profile produces curved developable faces; flat-sheet export requires single-axis forming');
    error.name='CurvedFacetManufacturingRefusal';
    error.code='CURVED_FACET_FORMING_REQUIRED';
    error.details={
      maxChordDeviation:diagnostics.maxChordDeviation,
      limit:0.00025,
      allowed:['single-axis-forming','lamination','kerf-forming','3d-print']
    };
    throw error;
  }
  return {style:'curvedFacets',profileHash:st.profileHash,seamCount:4,
    developable:true,requiresForming:diagnostics.requiresForming,
    maxChordDeviation:diagnostics.maxChordDeviation,
    faces:diagnostics.faces};
}
/* Binary STL bytes from shellMesh (mm units for slicers). The allocator owns
   its final guard instead of trusting every caller to remember one. */
function stlBytes(mesh,maxBytes){
  const n=meshTriangleCount(mesh),required=84+n*50,
    declared=Number.isFinite(+maxBytes)?+maxBytes:
      (mesh&&mesh.outputLimits&&Number.isFinite(+mesh.outputLimits.maxStlBytes)
        ?+mesh.outputLimits.maxStlBytes:256*1024*1024);
  if(!Number.isSafeInteger(required)||required>declared)
    throw packedMeshError('MESH_STL_LIMIT',
      'Binary STL output exceeds its bounded allocation limit',
      {required,limit:declared,triangles:n});
  const buf=new ArrayBuffer(required),dv=new DataView(buf);
  dv.setUint32(80,n,true);
  let o=84;
  const A=[0,0,0],B=[0,0,0],C2=[0,0,0],t=[0,0,0];
  for(let triangle=0;triangle<n;triangle++){
    meshTriangle(mesh,triangle,t);
    meshVertex(mesh,t[0],A);meshVertex(mesh,t[1],B);meshVertex(mesh,t[2],C2);
    const ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],
      vx=C2[0]-A[0],vy=C2[1]-A[1],vz=C2[2]-A[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
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
  const B={style:'smooth',profileLaw:'conical',wallT:0.012,rollR:2,mouthCap:64,subXO:80,npW:1,npM:1,
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
  const W65={wPre:'w65',  odW:18.7,dpW:8.5, sdW:132,vtcW:45, xmW:6};   // b534: named B&C 6NDL38 (Sd matches exactly; Fs 72 fits subXO 80)
  const CL10={wPre:'cl10',odW:25.7,dpW:10.8,sdW:320,vtcW:130,xmW:5.5};  // B&C 10CL51 (SynTripP record)
  const NS6={wPre:'ns6',  odW:15.64,dpW:8.24,sdW:126,vtcW:40, xmW:3.9}; // Aurasound NS6-255-8A (CoSyne; xm = Parts-Express retail figure, maker states none - provenance-marked)
  const W8 ={wPre:'w8',   odW:22.5,dpW:9.0, sdW:220,vtcW:80, xmW:7};
  const W10={wPre:'hpl10',odW:26.1,dpW:12.2,sdW:320,vtcW:130,xmW:4};
  const W12={wPre:'ndl12',odW:31.5,dpW:14.1,sdW:522,vtcW:180,xmW:7};
  const C5 ={wPre:'cn5',  odW:13.5,dpW:8.2, sdW:74, vtcW:30, xmW:3.5};
  const C65={wPre:'fhx65',odW:16.7,dpW:12,  sdW:137,vtcW:40, xmW:4};
  const M4 ={mPre:'m4',   odM:10.3,dpM:6.5, sdM:50, vtcM:40, xmM:3};
  const CXU={sdC:150,vtcC:60,xmC:4,coaxTaps:6,odC:0.22,dpC:0.11};
  return {
   '1way':[
    {key:'fhx6',   name:'B&C 6FHX51 — one-horn square classic · 70°×70°', expectWarns:3,
     s:{...B,...M4, topo:'1way',style:'angular',seN:12,covH:70,covV:70,mouthW:17,nW:2,nM:4,coaxTaps:4,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:20.066,
        coneD:120.09,coneDepth:24.01,coneMouthD:43.871,coneClearanceD:49.084,
        stockHornMouthD:91.88,bdepD:88.949,stockHornDepth:105.346,
        coneGeomSrc:'B&C 6FHX51 B-rep: exact axial section, inches→mm',
        recXO:2500,coaxXO:2500,tapVtc:4.5,odC:0.187,dpC:0.122,
        wPre:'fhx6',odW:18.7,dpW:12.2,sdW:132,vtcW:35,xmW:3.5, sdC:132,vtcC:35,xmC:3.5}},
    /* b531 audit: 'floors unverified' was FALSE - the BMS 5CN140 datasheet
       publishes recXO 1900 / HF 1500-30k; od/dp/sd re-baked to it. hfExit
       REMOVED (the old 20.1 was B&C 6FHX51 contamination; BMS publishes no
       exit dia - the class default applies until his 3 measurements). */
    {key:'refd',   name:'Reference D mini — BMS 5CN140 5″ coax · 70°×70°', expectWarns:3,
     s:{...B,...M4, topo:'1way',style:'angular',seN:12,covH:70,covV:70,mouthW:14,nW:2,nM:4,coaxTaps:4,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,recXO:1900,coaxXO:1900,tapVtc:3.0,odC:0.135,dpC:0.082,
        wPre:'cx5',odW:13.5,dpW:8.2,sdW:74,vtcW:30,xmW:3.5, sdC:74,vtcC:30,xmC:3.5}},
    /* b531 audit: both FHX datasheets state 60x40 NOMINAL coverage - the old
       90x60 / 60x60 names were unsourced print targets wearing the driver name */
    {key:'fhx12',  name:'B&C 12FHX76 — one-horn point source · 60°×40°', expectWarns:3,
     s:{...B,...M4, topo:'1way',seN:6, covH:60,covV:40,mouthW:30,nW:2,nM:4,coaxTaps:6,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:33,recXO:1200,coaxXO:1200,tapVtc:10,odC:0.315,dpC:0.169,
        wPre:'fhx12',odW:31.5,dpW:16.9,sdW:522,vtcW:150,xmW:4.25, sdC:522,vtcC:150,xmC:4.25}},
    {key:'fhx15',  name:'B&C 15FHX76 — one-horn round · 60°×40°', expectWarns:3,
     s:{...B,...M4, topo:'1way',seN:2, covH:60,covV:40,mouthW:34,nW:2,nM:4,coaxTaps:6,
        cdSel:'unit',td:1.0,throat:1.0,cdFloor:0,cdDepth:0,hfExit:33,recXO:1200,coaxXO:1200,tapVtc:12,odC:0.393,dpC:0.199,
        wPre:'fhx15',odW:39.3,dpW:19.9,sdW:855,vtcW:250,xmW:4.25, sdC:855,vtcC:250,xmC:4.25}},
   ],
   '2way':[
    /* DOCUMENTED PHYSICAL GEOMETRY. Hinson publishes the relieved 18 mm
       plate, two 101.6×19.1 mm racetrack entries per woofer and the shipped
       2×3 in × 7.25 in rear vents. The acoustic station is transparently
       derived from c/(4·1.2·500), not copied from a photograph. */
    {key:'hinson10', name:'Hinson DCX464 + 2×10NW76 — PUBLISHED ANGULAR SLOT/CHAMBER GEOMETRY',
     evidence:'published', source:'Scott Hinson, Multiple Entry Horns (2022)', expectWarns:2,
     s:{...B,...CDX, topo:'2way',twoArch:'opposed',tapBasis:'published',
        style:'angular',seN:12,covH:90,covV:60,mouthW:26,nW:2,npW:2,placeW:'auto',shW:'slot',
        twoXO:500,tapStationW:143.3,tapAreaW:37.24,tapLptW:18,
        tapSlotL:101.6,tapSlotW:19.1,tapVtcW:1400,tapCRW:8.59,
        rearAlign:'reflex',rearV:45,rearFb:65,rearPortArea:91.2,rearPortLen:184,
        wPre:'nw10',odW:26.1,dpW:11.9,sdW:320,vtcW:1400,xmW:6.8}},
    /* DOCUMENTED BUILD + DERIVED FRONT GEOMETRY. The JMOD manual publishes
       complement, coverage, cabinet/alignment and tapered constant-area port
       topology, but no numeric tap dimensions or chamber volume. Those fields
       therefore remain model-derived and are never presented as JMOD CAD. */
    {key:'jmod88', name:'JMOD Rev 2.02 — DOCUMENTED BUILD · DERIVED TAP GEOMETRY',
     evidence:'hybrid', source:'JW Sound JMOD Rev 2.02 (2026)', expectWarns:1,
     s:{...B,...CDX, topo:'2way',twoArch:'jmod',tapBasis:'model',
        style:'smooth',seN:6,covH:90,covV:60,mouthW:29,nW:2,npW:2,placeW:'auto',shW:'teardrop',
        twoXO:370,tapCRW:4,rearAlign:'reflex',rearFb:70,
        wPre:'ndl88',odW:31.5,dpW:14.0,sdW:522,vtcW:180,xmW:8}},
   ],
   '3way':[
    /* SH96 is intentionally not exposed as a reproducible preset. Its real
       pocket/vent geometry is unpublished, and substituting the measured
       SH-50 taps plus generic 15-inch drivers produced a model that failed
       its own compression laws. It remains a refusal/stress case in the test
       matrix until measured SH96 geometry is available. */
    /* b531 audit: this slot wore the SH50 name on a state that is NOT the
       SH-50 (real: 50x50, 2x12 - spec sheet Rev.202209301629; the 70x70 was
       chrisbln thing:6886663's MOUTH-FLARE angle misread as coverage - the
       provenance trap is documented in docs/KNOWN_BUILDS_AUDIT.md 2.12/2.14).
       The SH50-class label moved to the ANGULAR preset below (the real SH-50
       is angular 13-ply birch); this shape stays as a loud archetype. */
    {key:'arch7070',  name:'70°×70° square · 4×10″ + 4 mids (house archetype — no real build)',
     expectWarns:1,   // b534 pattern row: 24in mouth < λ/2 at fxLo 250 (61 vs 69cm) - the archetype IS pattern-thin, said out loud
     s:{...B,...CDX,...W10,...M4, topo:'3way',seN:12,covH:70,covV:70,mouthW:24,nW:4,nM:4,fxLo:250}},
    {key:'classic',   name:'classic — 90°×60° · 4×10″ + 4 mids (house archetype — no real build)',
     expectWarns:2,   // explicit archetype limits: any-pair spacing reaches λ/4 and the axial package crosses the mouth plane by 1.7 mm
     /* b528: 27 -> 31, the mouth-plane enclosure law - at 27 the 10in frames
        reached 51 mm past the mouth plane (nothing to seal a box against).
        b531 audit: no 3way MEH with FOUR horn-loaded 10s exists anywhere -
        loud archetype. b534: kipman725/aragorus MINED AND REJECTED (kipman
        never built + the donor waveguide is retail-specced 90x40; aragorus
        is real+measured but coverage unsourceable, complement 2x10+4x4, and
        Celestion TF0410MR publishes no Sd/Xmax). The aragorus tap-station
        record joined tap_laws.md as the 2nd measured record after van Ommen. */
     s:{...B,...CDX,...W10,...M4, topo:'3way',seN:6, covH:90,covV:60,mouthW:31,nW:4,nM:4,fxLo:250}},
    /* b531 audit 2.14: the SH50-class label lives HERE now - the real SH-50
       IS angular 13-ply birch. Sourced: 50x50 coverage, 2x12 LF, 4 mids
       (sheet says 5in, av-iq 4in - conflict cited, M4 pack = declared
       stand-in), 1in-exit HF (DCX464 = declared stand-in), external
       28x28x25.5in. Mouth 26 = design choice inside that envelope (never an
       SH-50 number); fxLo unsourced (passive box). Tap-station goldens vs
       the van Ommen record (3/4in@3.5 / 2.5in@10.5 / reflex@14.5) are the
       queued next step. */
    /* b534: the TRUE CoSyne (Waslo, libinst.com Synergy Calc V5 + Dimensions.png,
       numbers re-verified from the xls). Gento mids unsourceable (buyout) ->
       M4 pack DECLARED stand-in; NS6 xm 3.9 retail-sourced; fxLo anchored at
       Waslo's 385Hz H-pattern floor; CDX1-1445 floor semantics in CDP. */
    {key:'cosyne', name:'CoSyne (Waslo) — 90°×60° · 4× NS6 + 4 mids (Gento stand-in · CDX1-1445 · v5-smooth at the true 24″)',
     expectWarns:3,   // declared truths: mid CR 3.5:1, any-pair spacing reaches λ/4, and drivers sit 3.0 mm past the mouth plane
     /* the REAL CoSyne is flat-panel; v5's ANGULAR seat rules demand 34in for
        this complement while smooth holds Waslo's documented 24x15.27in
        exactly - the angular re-pack (Waslo packs tighter than the house
        diamond/ring dialect) is a queued item. Every dimension here is the
        record's; mids are the M4 stand-in (Gento buyout, unsourceable). */
     s:{...B,...NS6,...M4, topo:'3way',seN:12,covH:90,covV:60,mouthW:24,nW:4,nM:4,fxLo:385,
        cdSel:'cdx1445',td:1.0,throat:1.0,cdFloor:385,cdDepth:2.1,wallT:0.0118,subXO:80}},
    {key:'sh50',   name:'SH50-class — 50°×50° · 2×12″ + 4 mids (stand-ins declared · v5 mouth 29″ vs real 28″ box)',
     s:{...B,...CDX,...W12,...M4, topo:'3way',style:'angular',seN:12,covH:50,covV:50,mouthW:29,nW:2,nM:4,fxLo:250}},   // b531: settled size; real external 28x28x25.5in - the 1in gap is model honesty, declared
   ],
  };
})();

return {C,IN,CM, TWO_ARCH, sePoint,panelPoint,panelVerts,seRing, paramFor,
  CURVED_FACET_SCHEMA,curvedRectPoint,curvedRectPolarPoint,curvedRectRing,
  curvedRectParamFor,curvedRectLevel,
  curvedFacetPoint,curvedFacetNormal,curvedFacetFlatPattern,
  curvedFacetDiagnostics,
  snappedTrig,roundedRectPoint,roundedRectRing,roundedRectSdf,
  roundedRectPerimeter,legalCornerRadius,
  sectionPoint2D,sectionPolarPoint2D,sectionRing2D,sectionParamFor2D,
  sectionLevel2D,sectionArea2D,sectionPerimeter2D,sectionAxisPoint2D,
  patternControlSizing,profileMeridianWitness,
  profile, stations, dimsAt, surfPt, surfN, layout, projectedSlotReach, evaluate, solve, adapt, smartAdapt2way, response, areaAt, facetsAt, facetN, offsetRing, offsetVerts, BUILDS, shellMesh, dishMesh, coaxHornMesh, packedMesh,meshVertexCount,meshTriangleCount,meshVertex,meshTriangle,meshAudit, orientSolid, meshSelfIntersections, fabricationAudit, dishVisualMesh, interiorVisualMesh, adapterMesh, hornrespME, tapCutters, slotOutline, panelLayout, stlBytes, boxDims, coneGeom, coaxTapDesign, rosse, rosseXat,
  SECTION_FAMILY_SCHEMAS,sectionFamilySchema,effectiveSectionExponent,
  PROFILE_LAW_DEFAULTS,PROFILE_LAW_SCHEMAS:MEH_PROFILE_LAWS.PROFILE_LAW_SCHEMAS,
  profileLawSchema:MEH_PROFILE_LAWS.profileLawSchema,
  solveProfileLaw:MEH_PROFILE_LAWS.solveProfileLaw,
  evaluateProfileAt:MEH_PROFILE_LAWS.evaluateProfileAt,
  classicOSTailRecord,boundedC2ProfileBridge,oneWayOuterProfileRecord,
  curvedFacetLayout,
  RADIAL_PROFILE_SCHEMAS, radialProfileSchema, radialProfile, classicOSRadiusAt,
  classicOSProfile, osseRadiusAt, osseProfile, rosseProfile,
  validateJMLCProfile, jmlcAreaAt, jmlcProfile};
})();
if(typeof module!=='undefined'){
  Object.assign(MEH2,require('./twoway-core.js')(MEH2));
  module.exports=MEH2;
}
