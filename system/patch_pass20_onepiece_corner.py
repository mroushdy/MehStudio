#!/usr/bin/env python3
# BUILD 67 - printed-mount rebuild, increment 1 (render): the corner mount becomes
# ONE continuous part (Reference B, docs/printed_mounts_spec.md): base flange at the
# board -> smooth duct cone -> frame seat -> per-kind cover (woofer: flange ring,
# back exposed; mid: sealed pocket) in a single lathe profile with a perimeter
# flange. Replaces the separate adapter lathe (the corner BLOCK box stays for now -
# it is the structural pocket; slimming it is increment 2).
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep("""      const prof=[[rSmall,0],[rBig*0.985,dBF*0.96],[rBig,dBF],[rBig,dBF+cupC*0.985],[rBig*0.94,dBF+cupC],[dch.od*0.5*0.42,dBF+cupC]]
        .map(p=>new THREE.Vector2(p[0],p[1]));""",
"""      const rFl=rSmall+0.016;                                    // Reference-B perimeter base flange on the board
      const prof=[[rFl,0],[rFl,0.004],[rSmall+0.004,0.006],[rSmall,0.010],
                  [rBig*0.985,dBF*0.96],[rBig,dBF],[rBig,dBF+cupC*0.985],[rBig*0.94,dBF+cupC],[dch.od*0.5*0.42,dBF+cupC]]
        .map(p=>new THREE.Vector2(p[0],p[1]));""")
rep("window.MEH_BUILD=66;","window.MEH_BUILD=67;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD67 one-piece corner mount (flange): %d -> %d chars'%(n0,len(src)))
