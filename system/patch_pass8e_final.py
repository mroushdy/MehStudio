#!/usr/bin/env python3
# BUILD 52e - closing batch:
#  1) swapOne transforms d.chamfer.phi under the y/z swap (swap maps angle phi -> pi/2-phi;
#     stale labels false-flagged drivers 1/3 in my own checks - geometry was right).
#  2) The woofer WALK's cap frees chamfer from rollLimitX (the plate spans the knee) -
#     the tap can walk to where the kidney ring fits.
#  3) PRINTED MOUNTS (Marwan's directive + his cross-section photo): every flange that
#     stands off the shell (remote standoff, chamfer pocket, tall pod stand) gets a
#     transition-mount solid - drawn, in the collision model, and reported. The existing
#     boss STL exporters are the print path.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) swap transforms the stored facet angle
rep("    if(d.knPod){ sw2(d.knPod.base); sw2(d.knPod.face); sw2(d.knPod.n); }\n    return d; };",
    "    if(d.knPod){ sw2(d.knPod.base); sw2(d.knPod.face); sw2(d.knPod.n); }\n"
    "    if(d.chamfer){ d.chamfer.phi=Math.atan2(Math.cos(d.chamfer.phi), Math.sin(d.chamfer.phi)); }   // y/z swap: phi -> pi/2-phi\n"
    "    return d; };")

# 2) the walk's cap honors the plate
rep("          const cap=MEH.rollLimitX(S,st0,'woof')/MEH.IN;",
    "          const cap=(S.plW==='chamfer'? st0.depth*0.92 : MEH.rollLimitX(S,st0,'woof'))/MEH.IN;")

# 3a) mounts: driverLayout post-pass tags every off-shell flange
rep("  if(S.plW==='remote'){   // SAWMOD/Solana: woofers side-fire a shared chamber OUTSIDE the shell; only their ports pierce the wall",
"""  for(const d of list){                                    // PRINTED MOUNTS (his cross-section): flange off the shell -> transition mount
    let mh=0;
    if(d.chamfer) mh=d.chamfer.pocket;
    else if(d.stand && d.stand>0.016) mh=d.stand-0.012;
    if(S.plW==='remote' && d.kind==='woof') mh=Math.max(mh, 0.008+(st.form==='rect'?S.T*IN:0.012));
    if(mh>0.004){ const mr=mountSpec(S,d.kind).padD/2000;
      d.mount={h:mh, r:mr};
      d.prims.push({c:vadd(d.center,vscale(d.normal,-mh/2)), a:d.normal.slice(), h2:mh/2, r:mr});
    }
  }
  if(S.plW==='remote'){   // SAWMOD/Solana: woofers side-fire a shared chamber OUTSIDE the shell; only their ports pierce the wall""")

# 3b) mounts render: the pad skirt spans the full mount height (any family)
rep("    if(st.form!=='rect'){   // mounting pad (print families only - wood mounts flush to the board)\n      const stH=(Math.max(0.002,(d.stand||0.012)-0.012)+0.003)*sc;\n      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.04, stH, 0xdedad2, true);\n      pod.position.y=-stH/2+0.0008*sc; sub.add(pod);\n    }",
"""    if(d.mount){                        // printed transition mount (his cross-section reference)
      const stH=(d.mount.h+0.004)*sc;
      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.10, stH, 0xE9E4D8, true);
      pod.position.y=-stH/2+0.0008*sc; sub.add(pod);
    } else if(st.form!=='rect' && !d.knPod){   // mounting pad (print families only - wood mounts flush to the board)
      const stH=(Math.max(0.002,(d.stand||0.012)-0.012)+0.003)*sc;
      const pod=cyl(MSP.padD/2*MM, MSP.padD/2*MM*1.04, stH, 0xdedad2, true);
      pod.position.y=-stH/2+0.0008*sc; sub.add(pod);
    }""")

# 3c) mounts report honestly
rep("  if(layout.some(d=>d.remote)){",
"""  { const ms=layout.filter(d=>d.mount);
    if(ms.length){ const mx=Math.max(...ms.map(d=>d.mount.h));
      rows.push({sec:'FIT',name:'Printed driver mounts',val:ms.length+'\\u00d7 \\u2264'+(mx*1000).toFixed(0)+' mm',st:'ok',
        why:'flanges standing off the shell get printed transition mounts (boss STL exports; his cross-section reference)'});
    } }
  if(layout.some(d=>d.remote)){""")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD52e: %d -> %d chars'%(n0,len(src)))
