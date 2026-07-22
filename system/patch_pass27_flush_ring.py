#!/usr/bin/env python3
# BUILD 73c - flush frame-on-board woofers: (1) chord row goes HARD RED below zero
# (the -20mm warn band shipped an 18mm real protrusion - his front view); (2) when the
# frame sits flush (dBF<=12mm) the adapter draws as a plain flange ring - the old cone
# inverts (rSmall>rBig) and drew floating crescents.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("          st: chWorst>=0?'ok':chWorst>=-0.02?'warn':'fail',",
    "          st: chWorst>=0.02?'ok':chWorst>=0?'warn':'fail',")
rep("        if(chWorst<-0.02) for(const d of chs) d.collide=true;",
    "        if(chWorst<0) for(const d of chs) d.collide=true;")

OLD_CUP_HEAD="""      const rBig=dch.od*0.5+0.008,
            cupC=(dch.kind==='woof')? dch.dp*0.16+0.004      // 2-way woofer: bolted flange ring, back exposed (his call)
                                    : dch.dp*0.50+0.006;     // 3-way mid: sealed pocket"""
NEW_CUP_HEAD=OLD_CUP_HEAD+"""
      if(dch.kind!=='mid' && dBF<=0.012){                     // FLUSH frame-on-board (SH96): plain flange ring, no cone (inverted cone drew crescents)
        const fr2=[[dch.od*0.5-0.012,0.000],[rBig,0.003],[rBig,0.014],[dch.od*0.5-0.012,0.017]].map(p=>new THREE.Vector2(p[0],p[1]));
        const ring3=new THREE.Mesh(new THREE.LatheGeometry(fr2,48),
          new THREE.MeshPhongMaterial({color:0xE9E4D8,shininess:8,side:THREE.DoubleSide}));
        orientAlong(ring3,[nrm[0],nrm[2],nrm[1]]);
        ring3.position.set(cB[0]*sc,cB[2]*sc,cB[1]*sc); ring3.scale.setScalar(sc);
        ring3.userData.tag='fixture'; grp.add(ring3);
      } else {"""
rep(OLD_CUP_HEAD, NEW_CUP_HEAD)

OLD_CUP_TAIL="""      const cup=new THREE.Mesh(new THREE.LatheGeometry(prof,48),
        new THREE.MeshPhongMaterial({color:0xE9E4D8,shininess:8,side:THREE.DoubleSide}));
      orientAlong(cup,[nrm[0],nrm[2],nrm[1]]);                     // scene axes are (x,z,y)
      cup.position.set(cB[0]*sc,cB[2]*sc,cB[1]*sc); cup.scale.setScalar(sc);
      cup.userData.tag='fixture'; grp.add(cup);"""
rep(OLD_CUP_TAIL, OLD_CUP_TAIL+"\n      }")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD73c flush ring + hard chord: %d -> %d chars'%(n0,len(src)))
