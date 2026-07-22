#!/usr/bin/env python3
# BUILD 79 - BUG PINS (Marwan's idea): right-click anywhere on the 3-D model to drop
# a numbered pin + note. Each pin stores: the exact 3-D point (model coords), his
# note, the FULL state snapshot, the camera pose, and the build number - persisted
# in localStorage and readable by the agent (window.BUGPINS). The agent flies to a
# pin with BUGPINS.fly(id). This is the human->agent channel of the Autopilot loop.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

BUGPINS = r"""
window.BUGPINS=(function(){
  const KEY='mehstudio_bugpins';
  let pins=[]; try{ pins=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){}
  const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(pins)); }catch(e){} };
  let grp=null;
  const redraw=()=>{ if(!window.V3D||!V3D.scene) return;
    if(grp){ V3D.scene.remove(grp); grp.traverse(o=>{if(o.geometry)o.geometry.dispose();}); }
    grp=new THREE.Group(); grp.userData.tag='bugpin';
    const sc=window.__sc||1;
    for(const p of pins){ if(p.done) continue;
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.012*sc,12,10),
        new THREE.MeshBasicMaterial({color:0xFF2D00}));
      m.position.set(p.p[0]*sc,p.p[2]*sc,p.p[1]*sc); m.userData.tag='bugpin'; grp.add(m);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.022*sc,0.003*sc,8,24),
        new THREE.MeshBasicMaterial({color:0xFF2D00}));
      ring.position.copy(m.position); ring.userData.tag='bugpin'; grp.add(ring);
    }
    V3D.scene.add(grp); if(window.render3d)render3d(); };
  const add=(pt,note)=>{ const id=(pins.reduce((a,b)=>Math.max(a,b.id),0)|0)+1;
    let st={}; try{ st=JSON.parse(JSON.stringify(S)); delete st.__flip; }catch(e){}
    pins.push({id, p:pt, note, island:window.curArch, build:window.MEH_BUILD,
      cam:{yaw:V3D.yaw,pitch:V3D.pitch,dist:V3D.dist}, state:st, t:new Date().toISOString(), done:false});
    save(); redraw(); return id; };
  const ui=(x,y,pt)=>{
    const old=document.getElementById('bugpin-ui'); if(old)old.remove();
    const dv=document.createElement('div'); dv.id='bugpin-ui';
    dv.style.cssText='position:fixed;left:'+Math.min(x,innerWidth-320)+'px;top:'+Math.min(y,innerHeight-90)+'px;z-index:9999;background:#1c1b19;border:1px solid #FF2D00;padding:8px;border-radius:4px;box-shadow:0 4px 18px rgba(0,0,0,.5)';
    dv.innerHTML='<div style="color:#FF2D00;font:600 11px monospace;margin-bottom:5px">BUG PIN — what is wrong here?</div>'+
      '<input id="bugpin-txt" style="width:280px;background:#0f0e0d;color:#eee;border:1px solid #555;padding:5px;font:12px monospace" placeholder="e.g. this driver floats off the wall">'+
      '<div style="margin-top:6px;text-align:right"><button id="bugpin-ok" style="background:#FF2D00;color:#fff;border:0;padding:4px 12px;font:600 11px monospace;cursor:pointer">PIN IT</button> '+
      '<button id="bugpin-no" style="background:#333;color:#aaa;border:0;padding:4px 8px;font:11px monospace;cursor:pointer">cancel</button></div>';
    document.body.appendChild(dv);
    const txt=document.getElementById('bugpin-txt'); txt.focus();
    const fin=(ok)=>{ if(ok&&txt.value.trim()){ const id=add(pt,txt.value.trim());
        const note=document.getElementById('v3dnote'); if(note)note.textContent='bug pin #'+id+' saved — the agent can see it';}
      dv.remove(); };
    document.getElementById('bugpin-ok').onclick=()=>fin(true);
    document.getElementById('bugpin-no').onclick=()=>fin(false);
    txt.onkeydown=(e)=>{ if(e.key==='Enter')fin(true); if(e.key==='Escape')fin(false); }; };
  document.addEventListener('contextmenu',(e)=>{
    if(!window.V3D||!V3D.renderer) return;
    const cv=V3D.renderer.domElement; if(e.target!==cv) return;
    e.preventDefault();
    const r=cv.getBoundingClientRect();
    const nd=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(nd,V3D.camera);
    const hits=rc.intersectObjects(V3D.scene.children,true).filter(h=>h.object.isMesh&&h.object.userData.tag!=='bugpin');
    if(!hits.length) return;
    const sc=window.__sc||1, hp=hits[0].point;
    ui(e.clientX,e.clientY,[hp.x/sc,hp.z/sc,hp.y/sc]);
  });
  return { list:()=>pins, open:()=>pins.filter(p=>!p.done), redraw,
    fly:(id)=>{ const p=pins.find(q=>q.id===id); if(!p)return false;
      if(p.cam){ V3D.yaw=p.cam.yaw; V3D.pitch=p.cam.pitch; V3D.dist=Math.min(p.cam.dist,1.0); }
      if(V3D.tgt){ const sc=window.__sc||1; V3D.tgt.set(p.p[0]*sc,p.p[2]*sc,p.p[1]*sc); }
      render3d(); return p; },
    resolve:(id,note)=>{ const p=pins.find(q=>q.id===id); if(p){p.done=true;p.fix=note||'';save();redraw();} },
    clear:()=>{ pins=[]; save(); redraw(); } };
})();
"""

rep("window.MEH_BUILD=78;", BUGPINS+"window.MEH_BUILD=79;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD79 bug pins: %d -> %d chars'%(n0,len(src)))
