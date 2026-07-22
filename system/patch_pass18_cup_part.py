#!/usr/bin/env python3
# BUILD 65 - "what are these weird cones under the driver?" (Marwan, quadrant rear).
# The pocket adapter was lathed at 24 segments into the SHELL mesh (unindexed tris ->
# flat facets, shell color) - it read as a mystery cone, not as the printed part it is.
# FIX: the adapter becomes its own smooth 48-segment lathe in printed-part material
# (same family as the pads/pods), slightly slimmer at the frame seat (+8 mm, was +12),
# with an annular cap the real driver back protrudes through. Same acoustic envelope,
# same sector-safe radii (rSmall->rBig linear along the axis) - render-only.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

OLD="""    { // the printed pocket CUP (his CAD cross-section): truncated cone from the board
      // opening up to a skirt at the frame, then a cylindrical cover over the can.
      // Lathe rings along the DRIVER'S OWN axis - stays inside this corner's 90-deg
      // sector at every station (radius and sector width are both linear in s and both
      // ends satisfy radius <= width), so adjacent cups can never interpenetrate.
      const cC=dch.center, nrm=nO;
      const t0=ch.c0-(cC[0]*nrm[0]+cC[1]*nrm[1]+cC[2]*nrm[2]);     // signed distance frame->board plane (negative: inward)
      const cB=[cC[0]+nrm[0]*(t0+0.001), cC[1]+nrm[1]*(t0+0.001), cC[2]+nrm[2]*(t0+0.001)];
      const cupL=dch.dp*0.50+0.006;                              // seal collar at half-can: the real body shows behind it (his pocket photos)
      const cE=[cC[0]+nrm[0]*cupL, cC[1]+nrm[1]*cupL, cC[2]+nrm[2]*cupL];
      const apK2=(dch.kind==='mid'?S.apM:S.apW), npK2=Math.max(1,((dch.kind==='mid'?S.npM:S.npW)|0)||1);
      const rPt2=Math.sqrt((apK2*1e-4/npK2)/Math.PI);
      const rSmall=Math.min(ch.rF*0.92, rPt2*(npK2>1?2.5:1.7)+0.010);
      const rBig=dch.od*0.5+0.012;
      let u2=[ -nrm[2], 0, nrm[0] ];                                // any basis _|_ axis
      const uL=Math.hypot(u2[0],u2[1],u2[2]); u2=uL>1e-6?[u2[0]/uL,u2[1]/uL,u2[2]/uL]:[0,1,0];
      const v2=[ nrm[1]*u2[2]-nrm[2]*u2[1], nrm[2]*u2[0]-nrm[0]*u2[2], nrm[0]*u2[1]-nrm[1]*u2[0] ];
      const ring2=(c,r)=>{const o=[]; for(let j=0;j<=24;j++){const a3=j/24*2*Math.PI, cs=Math.cos(a3), sn=Math.sin(a3);
        o.push([c[0]+(u2[0]*cs+v2[0]*sn)*r, c[1]+(u2[1]*cs+v2[1]*sn)*r, c[2]+(u2[2]*cs+v2[2]*sn)*r]);} return o;};
      const lace=(RA,RB)=>{for(let j=0;j<24;j++){push3(RA[j],RB[j],RA[j+1]); push3(RA[j+1],RB[j],RB[j+1]);}};
      const R1=ring2(cB,rSmall), R2=ring2(cC,rBig), R3=ring2(cE,rBig*0.99);
      lace(R1,R2); lace(R2,R3);
      for(let j=0;j<24;j++) push3(cE,R3[j+1],R3[j]);                // back cap
    }"""
NEW="""    { // the printed pocket ADAPTER (his CAD cross-section): a smooth truncated cone
      // from the board's port opening out to a seat at the frame, then a short collar;
      // the REAL driver back protrudes through the annular cap. Drawn as its OWN part
      // (48-seg lathe, printed-part material) - lacing it into the shell mesh at 24
      // segments made it read as a mystery cone. Same sector-safe radii (linear along
      // the driver's own axis, radius <= sector width at both ends) - render-only.
      const cC=dch.center, nrm=nO;
      const t0=ch.c0-(cC[0]*nrm[0]+cC[1]*nrm[1]+cC[2]*nrm[2]);     // signed distance frame->board plane (negative: inward)
      const cB=[cC[0]+nrm[0]*(t0+0.001), cC[1]+nrm[1]*(t0+0.001), cC[2]+nrm[2]*(t0+0.001)];
      const dBF=Math.max(0.004,-(t0+0.001));                       // board -> frame seat along the axis
      const apK2=(dch.kind==='mid'?S.apM:S.apW), npK2=Math.max(1,((dch.kind==='mid'?S.npM:S.npW)|0)||1);
      const rPt2=Math.sqrt((apK2*1e-4/npK2)/Math.PI);
      const rSmall=Math.min(ch.rF*0.92, rPt2*(npK2>1?2.5:1.7)+0.010);
      const rBig=dch.od*0.5+0.008, cupC=dch.dp*0.50+0.006;
      const prof=[[rSmall,0],[rBig*0.985,dBF*0.96],[rBig,dBF],[rBig,dBF+cupC*0.985],[rBig*0.94,dBF+cupC],[dch.od*0.5*0.42,dBF+cupC]]
        .map(p=>new THREE.Vector2(p[0],p[1]));
      const cup=new THREE.Mesh(new THREE.LatheGeometry(prof,48),
        new THREE.MeshPhongMaterial({color:0xE9E4D8,shininess:8,side:THREE.DoubleSide}));
      orientAlong(cup,[nrm[0],nrm[2],nrm[1]]);                     // scene axes are (x,z,y)
      cup.position.set(cB[0]*sc,cB[2]*sc,cB[1]*sc); cup.scale.setScalar(sc);
      cup.userData.tag='fixture'; grp.add(cup);
    }"""
rep(OLD,NEW)
rep("window.MEH_BUILD=64;","window.MEH_BUILD=65;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD65 printed adapter: %d -> %d chars'%(n0,len(src)))
