#!/usr/bin/env python3
# BUILD 83 - BUGPINS module replaced wholesale with the PROVEN v3 implementation
# (the hot version verified working in his browser): red dot appears at the click
# instantly, text box beside it, cancel removes the dot. The old module's click
# path silently found no raycast hits despite identical manual code succeeding -
# archaeology on the closure cost more than replacing it with known-good code.
import io, re
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)

i0=src.index('window.BUGPINS=(function(){')
i1=src.index('window.MEH_BUILD=82;')
assert 0<i1-i0<9000, 'module bounds look wrong'

NEW = r"""window.BUGPINS=(function(){
  const KEY='mehstudio_bugpins';
  let pins=[]; try{ pins=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){}
  const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(pins)); }catch(e){} };
  let grp=null, provisional=null;
  const redraw=()=>{ if(!window.V3D||!V3D.scene||!window.THREE) return;
    if(grp){ V3D.scene.remove(grp); }
    grp=new THREE.Group(); grp.userData.tag='bugpin';
    const sc=window.__sc||1;
    for(const p of pins){ if(p.done) continue;
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.014*sc,12,10),
        new THREE.MeshBasicMaterial({color:0xFF2D00,depthTest:false}));
      m.renderOrder=999;
      m.position.set(p.p[0]*sc,p.p[2]*sc,p.p[1]*sc); m.userData.tag='bugpin'; grp.add(m); }
    V3D.scene.add(grp); if(window.render3d)render3d(); };
  const clearProv=()=>{ if(provisional){ V3D.scene.remove(provisional); provisional=null; if(window.render3d)render3d(); } };
  const drop=(e)=>{
    const cv=V3D.renderer.domElement, r=cv.getBoundingClientRect();
    const nd=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(nd,V3D.camera);
    const hits=rc.intersectObjects(V3D.scene.children,true).filter(h=>h.object.isMesh&&h.object.userData.tag!=='bugpin'&&!(h.object.material&&h.object.material.transparent));
    if(!hits.length) return false;
    const sc=window.__sc||1, hp=hits[0].point, pt=[hp.x/sc,hp.z/sc,hp.y/sc];
    clearProv();
    provisional=new THREE.Mesh(new THREE.SphereGeometry(0.014*sc,12,10),
      new THREE.MeshBasicMaterial({color:0xFF2D00,depthTest:false}));
    provisional.renderOrder=999; provisional.userData.tag='bugpin';
    provisional.position.copy(hp); V3D.scene.add(provisional); render3d();
    const old=document.getElementById('bugpin-ui'); if(old)old.remove();
    const dv=document.createElement('div'); dv.id='bugpin-ui';
    dv.style.cssText='position:fixed;left:'+Math.min(e.clientX+14,innerWidth-330)+'px;top:'+Math.min(e.clientY-10,innerHeight-100)+'px;z-index:9999;background:#1c1b19;border:2px solid #FF2D00;padding:9px;border-radius:5px;box-shadow:0 6px 24px rgba(0,0,0,.55)';
    dv.innerHTML='<div style="color:#FF2D00;font:700 11px monospace;margin-bottom:6px">● BUG PIN — describe what is wrong</div><input id="bugpin-txt" style="width:290px;background:#0f0e0d;color:#eee;border:1px solid #666;padding:6px;font:12px monospace" placeholder="e.g. this driver is floating"><div style="margin-top:7px;text-align:right"><button id="bugpin-ok" style="background:#FF2D00;color:#fff;border:0;padding:5px 14px;font:700 11px monospace;cursor:pointer">SAVE PIN</button> <button id="bugpin-no" style="background:#333;color:#aaa;border:0;padding:5px 9px;font:11px monospace;cursor:pointer">cancel</button></div>';
    document.body.appendChild(dv);
    const txt=document.getElementById('bugpin-txt'); txt.focus();
    const fin=(ok)=>{ if(ok&&txt.value.trim()){
        const id=(pins.reduce((a,b2)=>Math.max(a,b2.id),0)|0)+1;
        let st={}; try{ st=JSON.parse(JSON.stringify(S)); }catch(_e){}
        pins.push({id,p:pt,note:txt.value.trim(),island:window.curArch,build:window.MEH_BUILD,cam:{yaw:V3D.yaw,pitch:V3D.pitch,dist:V3D.dist},state:st,t:new Date().toISOString(),done:false});
        save(); clearProv(); redraw();
        const n2=document.getElementById('v3dnote'); if(n2)n2.textContent='bug pin #'+id+' saved — the agent can see it';
      } else clearProv();
      dv.remove(); };
    document.getElementById('bugpin-ok').onclick=()=>fin(true);
    document.getElementById('bugpin-no').onclick=()=>fin(false);
    txt.onkeydown=(ev2)=>{ if(ev2.key==='Enter')fin(true); if(ev2.key==='Escape')fin(false); };
    return true; };
  const arm=(on)=>{ window.__pinMode=on;
    const b=document.getElementById('v3dpin');
    if(b){ b.textContent=on?'CLICK THE MODEL…':'Pin a bug'; b.style.background=on?'#FF2D00':''; b.style.color=on?'#fff':''; }
    if(window.V3D&&V3D.renderer) V3D.renderer.domElement.style.cursor=on?'crosshair':''; };
  const hook=()=>{ const b=document.getElementById('v3dpin'); if(b) b.onclick=()=>arm(!window.__pinMode); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hook); else hook();
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&window.__pinMode) arm(false); });
  document.addEventListener('click',(e)=>{
    if(!window.__pinMode||!window.V3D||!V3D.renderer) return;
    if(e.target!==V3D.renderer.domElement) return;
    e.preventDefault(); e.stopPropagation();
    if(drop(e)) arm(false); },true);
  document.addEventListener('contextmenu',(e)=>{
    if(!window.V3D||!V3D.renderer) return;
    if(e.target!==V3D.renderer.domElement) return;
    e.preventDefault(); e.stopPropagation();
    drop(e); },true);
  return { list:()=>pins, open:()=>pins.filter(p=>!p.done), redraw, arm,
    fly:(id)=>{ const p=pins.find(q=>q.id===id); if(!p)return false;
      if(p.cam){ V3D.yaw=p.cam.yaw; V3D.pitch=p.cam.pitch; V3D.dist=Math.min(p.cam.dist,1.0); }
      if(V3D.tgt){ const sc=window.__sc||1; V3D.tgt.set(p.p[0]*sc,p.p[2]*sc,p.p[1]*sc); }
      render3d(); return p; },
    resolve:(id,note)=>{ const p=pins.find(q=>q.id===id); if(p){p.done=true;p.fix=note||'';save();redraw();} },
    clear:()=>{ pins=[]; save(); redraw(); } };
})();
"""
src=src[:i0]+NEW+src[i1:]
src=src.replace('window.MEH_BUILD=82;','window.MEH_BUILD=83;')
io.open(F,'w',encoding='utf-8').write(src)
print('BUILD83 bugpins v3 baked: %d -> %d chars'%(n0,len(src)))
