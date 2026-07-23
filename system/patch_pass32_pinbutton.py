#!/usr/bin/env python3
# BUILD 81 - PIN BUG button (right-click unreliable on his machine): a third viewport
# button arms pin mode; the next LEFT click on the model drops the pin (crosshair
# cursor while armed; Esc or second press disarms). Right-click path stays as a bonus.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

rep('<button id="v3dinspect" class="act" style="position:absolute;left:8px;top:44px;z-index:2;">Inspect</button>',
    '<button id="v3dinspect" class="act" style="position:absolute;left:8px;top:44px;z-index:2;">Inspect</button>'
    '<button id="v3dpin" class="act" style="position:absolute;left:8px;top:80px;z-index:2;">Pin a bug</button>')

# arm/disarm + left-click capture path inside the BUGPINS module
rep("""  document.addEventListener('contextmenu',(e)=>{""",
"""  window.__pinMode=false;
  const arm=(on)=>{ window.__pinMode=on;
    const b=document.getElementById('v3dpin');
    if(b){ b.textContent=on?'Click the model\\u2026':'Pin a bug'; b.style.background=on?'#FF2D00':''; b.style.color=on?'#fff':''; }
    if(window.V3D&&V3D.renderer) V3D.renderer.domElement.style.cursor=on?'crosshair':''; };
  document.addEventListener('DOMContentLoaded',()=>{ const b=document.getElementById('v3dpin');
    if(b) b.onclick=()=>arm(!window.__pinMode); });
  { const b=document.getElementById('v3dpin'); if(b) b.onclick=()=>arm(!window.__pinMode); }
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&window.__pinMode) arm(false); });
  const dropAt=(e)=>{
    const cv=V3D.renderer.domElement;
    const r=cv.getBoundingClientRect();
    const nd=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(nd,V3D.camera);
    const hits=rc.intersectObjects(V3D.scene.children,true).filter(h=>h.object.isMesh&&h.object.userData.tag!=='bugpin'&&!(h.object.material&&h.object.material.transparent));
    if(!hits.length) return false;
    const sc=window.__sc||1, hp=hits[0].point;
    ui(e.clientX,e.clientY,[hp.x/sc,hp.z/sc,hp.y/sc]); return true; };
  document.addEventListener('click',(e)=>{
    if(!window.__pinMode||!window.V3D||!V3D.renderer) return;
    if(e.target!==V3D.renderer.domElement) return;
    e.preventDefault(); e.stopPropagation();
    if(dropAt(e)) arm(false);
  },true);
  document.addEventListener('contextmenu',(e)=>{""")

rep("window.MEH_BUILD=80;","window.MEH_BUILD=81;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD81 pin button: %d -> %d chars'%(n0,len(src)))
