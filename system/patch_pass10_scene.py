#!/usr/bin/env python3
# BUILD 54b - scene tagging for the full-3D audit (Marwan: 'foolproof... inspect the whole
# element in full 3D'). Tags: shell surfaces / port slots / driver groups (+mount height).
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("  const rg=new THREE.BufferGeometry(); rg.setAttribute('position',new THREE.Float32BufferAttribute(rings,3));",
    "  grp.traverse(function(o){ if(o.isMesh && !o.userData.tag) o.userData.tag='shell'; });   // everything built so far is horn shell\n"
    "  const rg=new THREE.BufferGeometry(); rg.setAttribute('position',new THREE.Float32BufferAttribute(rings,3));")

rep("      grp.add(slot);",
    "      slot.userData.tag='port'; slot.userData.kind=d.kind;\n      grp.add(slot);")

rep("    orientAlong(sub,[d.normal[0],d.normal[2],d.normal[1]]);\n    sub.position.set(d.center[0]*sc,d.center[2]*sc,d.center[1]*sc);\n    grp.add(sub);",
    "    orientAlong(sub,[d.normal[0],d.normal[2],d.normal[1]]);\n"
    "    sub.position.set(d.center[0]*sc,d.center[2]*sc,d.center[1]*sc);\n"
    "    sub.userData.tag='driver'; sub.userData.kind=d.kind;\n"
    "    sub.userData.mountH=(d.mount? d.mount.h : (d.knPod?0.0:(d.remote?0.03:((d.stand||0.012)))));\n"
    "    grp.add(sub);")

io.open(F,'w',encoding='utf-8').write(src)
print('scene tagged: %d -> %d'%(n0,len(src)))
