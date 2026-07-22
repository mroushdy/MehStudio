#!/usr/bin/env python3
# BUILD 73 - his call-out: front view showed the corner mount collars as rings around
# the mouth. Probe verdict: geometry legal (collars 94mm BEHIND the mouth plane, zero
# verts in horn air) - the DRAWING lied: the mouth baffle border was a fixed 100mm,
# narrower than the corner hardware, so exterior parts showed around it. Real builds
# size the front baffle to the cabinet. FIX: baffle border derives from the actual
# hardware extents. LAW: new INSPECT F2 - no fixture may cross the mouth plane or
# enter horn air; the review gap that let this ship is now audited every run.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) baffle border covers the hardware (like a real cabinet front)
rep("""  {
    const m=0.10;                                                  // 100 mm border
    rim(last,last.w+2*wallT,last.h+2*wallT,last.w+2*wallT+2*m,last.h+2*wallT+2*m);
  }""",
"""  {
    let hw=0;                                                      // outermost hardware (frame + collar allowance)
    for(const d of (ev.layout||[])){ const r=Math.hypot(d.center[1],d.center[2])+(d.od||0)*0.62+0.035; if(r>hw)hw=r; }
    const m=Math.min(0.40, Math.max(0.10, hw-Math.min(last.w,last.h)/2-wallT));   // cabinet-front border: hides exterior mounts (his front-view call-out)
    rim(last,last.w+2*wallT,last.h+2*wallT,last.w+2*wallT+2*m,last.h+2*wallT+2*m);
  }""")

# 2) INSPECT F2: fixture protrusion law (mouth plane + horn air)
rep("    // ---- T6: kidney fully within its board's chord (walls must not swallow the opening) ----",
"""    { // ---- F2: mounts/fixtures stay OUT of the horn (mouth plane + cavity) ----
      const gp2=new THREE.Vector3();
      V3D.group.traverse(o=>{ if(!o.isMesh||!o.userData||o.userData.tag!=='fixture') return;
        const pos=o.geometry.attributes.position; let worst=-1e9, air=0;
        for(let i=0;i<pos.count;i+=4){ gp2.set(pos.getX(i),pos.getY(i),pos.getZ(i)); o.localToWorld(gp2);
          const mx=gp2.x/sc, my=gp2.z/sc, mz=gp2.y/sc;
          if(mx-st.depth>worst) worst=mx-st.depth;
          if(mx>0.004&&mx<st.depth){ const dm=MEH.dimsAt(st,mx);
            if(Math.abs(my)<dm.w/2-0.004&&Math.abs(mz)<dm.h/2-0.004) air++; } }
        const wp=new THREE.Vector3(); o.getWorldPosition(wp);
        const at2=[wp.x/sc,wp.z/sc,wp.y/sc];
        if(worst>0.002) push('F2','fail','fixture crosses the mouth plane by '+(worst*1000).toFixed(0)+'mm',at2,0.15);
        if(air>0) push('F2','fail','fixture has '+air+' sampled verts inside the horn air',at2,0.15);
      });
    }
    // ---- T6: kidney fully within its board's chord (walls must not swallow the opening) ----""")

rep("window.MEH_BUILD=72;","window.MEH_BUILD=73;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD73 cabinet baffle + F2 law: %d -> %d chars'%(n0,len(src)))
