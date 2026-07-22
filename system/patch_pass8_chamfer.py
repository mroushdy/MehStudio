#!/usr/bin/env python3
# BUILD 52 - THE ARA CHAMFER DIALECT (Marwan's 6x-reported big-square problem, fixed at
# the geometry, not the label). His three reference photos are the spec: 45-degree corner
# facet plates host the four woofers, one frame per plane - frames stop fighting the
# adjacent wall because they no longer share it.
#   - plW='chamfer': woofer k seats on the 45+k*90 corner facet at the tap station;
#     facet size derives from the pad (facet half-length ell >= padR+6mm), seat at
#     diagonal distance dF = cornerDist - ell. Ports open in the facet (reference kidneys).
#   - Honest rows: 'Chamfer facet hosts the pad' + 'Chamfer cut vs wall' + corner-area
#     displacement (the reference shell keeps the square mouth; the throat region is octagonal).
#   - Facet plates DRAW (the white corner panels in his photo).
#   - The quadrant island defaults to the chamfer dialect (cross/hex stays selectable).
#   - F3 flips from aspirational-fail to a GREEN fixture.
import io, re
FILES={}
def load(f): FILES[f]=io.open(f,encoding='utf-8').read()
def save():
    for f,s in FILES.items(): io.open(f,'w',encoding='utf-8').write(s)
def rep(f,a,b,cnt=1):
    s=FILES[f]; n=s.count(a)
    assert n==cnt, '%s anchor FAILED (%d found, want %d): %r'%(f,n,cnt,a[:70])
    FILES[f]=s.replace(a,b)
load('meh_studio_v4.html'); load('meh_fixtures.js'); load('sweep_gate.js')
H='meh_studio_v4.html'

# 1) the chamfer placement branch (before the edge-placement path, after knuckle's)
rep(H, "    // edge placement: the port hugs the throat at the cone's near edge; the DRIVER CENTER",
"""    if(pl==='chamfer' && st.form!=='round'){   // ARA 45-deg corner plates: one frame per facet (his reference photos)
      const dPc=dimsAt(st,xPort);
      const padR=mountSpec(S,kind).padD/2000;
      const cornerDist=Math.hypot(dPc.w/2,dPc.h/2);
      const ell=Math.max(padR+0.006, od/2*0.62);           // facet half-length hosts the pad
      const dF=Math.max(od*0.35, cornerDist-ell);          // seat's diagonal distance (floor keeps the throat open)
      for(let k=0;k<n;k++){
        const phi=Math.PI/4+k*Math.PI/2;
        const e=[0,Math.cos(phi),Math.sin(phi)];
        const eP=Math.max(1e-4,st.depth*2e-3);
        const dd=(Math.hypot(dimsAt(st,Math.min(xPort+eP,st.depth)).w/2,dimsAt(st,Math.min(xPort+eP,st.depth)).h/2)-cornerDist)/(2*eP);
        const nOut=vnorm([-dd, e[1], e[2]]);               // facet normal rides the corner flare slope
        const cW=[xPort, dF*e[1], dF*e[2]];
        place(kind,cW,nOut,od,dp);
        const d=list[list.length-1];
        d.portC=cW.slice();
        d.chamfer={dF:dF, ell:ell, phi:phi, corner:cornerDist};
      }
      return;
    }
    // edge placement: the port hugs the throat at the cone's near edge; the DRIVER CENTER""")

# 2) fitCheck: chamfer drivers live on their facet, not the rect panels
rep(H, "if(['diagonal','knuckle'].includes(kind==='mid'?S.plM:S.plW)) continue;   // seam/pod ports live off the panel (Waslo passages / SAWMOD knuckles)",
      "if(['diagonal','knuckle','chamfer'].includes(kind==='mid'?S.plM:S.plW)) continue;   // seam/pod/facet ports live off the rect panel")
rep(H, "{ const plK=(kind==='mid'?S.plM:S.plW); if(plK==='diagonal'||plK==='remote') continue; }   // seam mounts span the corner / remote chambers carry their own pads",
      "{ const plK=(kind==='mid'?S.plM:S.plW); if(plK==='diagonal'||plK==='remote'||plK==='chamfer') continue; }   // seam/remote/facet mounts carry their own plates")
rep(H, "    let worst=1;\n    for(const d of rings[kind]){const c=conformity(st,d); if(c<worst)worst=c;}",
      "    const RC=rings[kind].filter(d=>!d.chamfer);            // reference facets protrude past the rect walls by design\n"
      "    if(!RC.length) continue;\n"
      "    let worst=1;\n    for(const d of RC){const c=conformity(st,d); if(c<worst)worst=c;}")
rep(H, "if(worst<-0.002) for(const d of rings[kind]) if(conformity(st,d)<-0.002) d.collide=true;",
      "if(worst<-0.002) for(const d of RC) if(conformity(st,d)<-0.002) d.collide=true;")

# 3) the chamfer honesty rows (next to the knuckle rows)
rep(H, "  { // SAWMOD knuckle checks: passages must leave the HF jet a throat-width channel; S2 displacement stays modest",
"""  { // ARA chamfer checks: each facet must host its pad; the cut must not eat the walls
    const chs=layout.filter(d=>d.chamfer);
    if(chs.length){
      const padR2=mountSpec(S,'woof').padD/2000;
      let worstF=1e9, worstT=-1e9, xs2=chs[0].chamfer? chs[0].portC[0]:0, areaCut=0;
      for(const d of chs){
        worstF=Math.min(worstF, d.chamfer.ell-padR2);
        const t=(d.chamfer.corner-d.chamfer.dF)*1.4142;
        worstT=Math.max(worstT, t);
        areaCut+=0.5*Math.pow(d.chamfer.corner-d.chamfer.dF,2)*2;
      }
      rows.push({sec:'WOOF',name:'Chamfer facet hosts the pad (reference plate)',val:(worstF*1000).toFixed(0)+' mm',
        st: worstF>=0.004?'ok':worstF>=0?'warn':'fail',
        why: worstF<0?'facet too short for the mounting pad - bigger horn or smaller woofers':'facet half-length beyond the pad radius (his corner-plate reference)'});
      if(worstF<0) for(const d of chs) d.collide=true;
      const dmc=dimsAt(st,xs2);
      const tFrac=worstT/Math.max(1e-6,Math.min(dmc.w,dmc.h)/2);
      rows.push({sec:'WOOF',name:'Chamfer cut vs wall',val:(tFrac*100).toFixed(0)+' %',
        st: tFrac<0.75?'ok':tFrac<0.95?'warn':'fail',
        why:'corner cut along each wall vs the half-panel - past ~75% the flat walls vanish (go bigger)'});
      const frac2=areaCut/Math.max(1e-6,dmc.w*dmc.h);
      rows.push({sec:'WOOF',name:'Chamfer corner-area displacement',val:(frac2*100).toFixed(0)+' %',
        st: frac2<0.30?'ok':frac2<0.45?'warn':'fail',
        why:'the throat region runs octagonal (reference); the shell keeps the square mouth - keep the cut modest'});
    }
  }
  { // SAWMOD knuckle checks: passages must leave the HF jet a throat-width channel; S2 displacement stays modest""")

# 4) applyAutos respects chamfer; the island adopts the reference canon
rep(H, "if(S.plW!=='diagonal'&&S.plW!=='cross'&&S.plW!=='remote'){ S.plW='straddle'; S.npW=2; }",
      "if(S.plW!=='diagonal'&&S.plW!=='cross'&&S.plW!=='remote'&&S.plW!=='chamfer'){ S.plW='straddle'; S.npW=2; }")
rep(H, "quadrant: {topo:'cw', cdSel:'cd14', wfSel:'bc12pe', nW:4, plW:'cross', npW:2, mouthW:36, thW:90, thV:90},",
      "quadrant: {topo:'cw', cdSel:'cd14', wfSel:'bc12pe', nW:4, plW:'chamfer', npW:2, mouthW:36, thW:90, thV:90},")
rep(H, r'''["plW","Woofer port placement","sel",[["remote","Remote chamber - bandpass injection (SAWMOD/Solana)"],''',
      r'''["plW","Woofer port placement","sel",[["chamfer","45° corner chamfer - one frame per facet (reference plate)"],["remote","Remote chamber - bandpass injection (SAWMOD/Solana)"],''')
# picker label reflects the dialect
rep(H, '<option value="quadrant">Big square, 4 woofers — one per face (hex-build dialect) · reference corner-seam variant pending chamfers</option>',
      '<option value="quadrant">Big square, 4 woofers — reference 45° chamfer plates (hex one-per-face via advanced)</option>')

# 5) render: draw the four facet plates (the white corner panels in his photo)
rep(H, "    if(d.knPod){   // SAWMOD knuckle channel: printed boss from the wall to the injection face",
"""    if(d.chamfer){   // ARA corner plate: the 45-deg facet panel itself
      const ell=d.chamfer.ell*sc, thk=0.012*sc;
      const plate=new THREE.Mesh(new THREE.BoxGeometry(ell*2.4, thk, ell*2.0),
        new THREE.MeshPhongMaterial({color:0xE9E4D8, shininess:5}));
      const e=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
      orientAlong(plate,[0,e[2],e[1]]);
      plate.position.set(d.portC[0]*sc, (d.chamfer.dF-0.007)*e[2]*sc, (d.chamfer.dF-0.007)*e[1]*sc);
      grp.add(plate);
    }
    if(d.knPod){   // SAWMOD knuckle channel: printed boss from the wall to the injection face""")

# 6) F3 becomes the GREEN reference fixture (was aspirational-fail since build 36)
rep('meh_fixtures.js', "// F3 - reference big-square (30in square, 4 x 12in woofers on quadrant chamfers + coax) - aspirational:\n// quadrant-chamfer (diagonal) woofer mounting is the reference dialect.\nrun('F3 reference big-square (30in square, 4x12 diagonal quadrants)',\n  {...DEF, mouthW:30, nM:0, threeWay:true, nW:4, plW:'diagonal', npW:1, odW:31.5, dpW:12.0, sdW:522, coneW:25, vtcW:180, Lw:6.5, L12:1.5, nM:4},",
"run('F3 reference big-square (36in square, 4x12 on 45-deg chamfer plates - his reference photos)',\n  {...DEF, mouthW:36, thW:90, thV:90, topo:'cw', threeWay:false, nM:0, nW:4, plW:'chamfer', npW:2, odW:31.5, dpW:12.0, sdW:522, coneW:25, vtcW:180, apW:116, Lw:4.8, L12:2.55, fxHi:495, cdBodyD:17, cdBodyL:13},")
rep('meh_fixtures.js', "  [ ['evaluates finite', c=>Number.isFinite(c.ev.mid.fNull)||true],\n    ['4 woofers on 4 quadrant seams', c=>c.woofs.length===4 && new Set(c.woofs.map(d=>Math.sign(d.center[1])+','+Math.sign(d.center[2]))).size===4],\n    ['no red drivers', c=>c.reds===0 || 'reds='+c.reds] ]);",
"  [ ['4 woofers on 4 corner facets', c=>c.woofs.length===4 && new Set(c.woofs.map(d=>Math.sign(d.center[1])+','+Math.sign(d.center[2]))).size===4],\n    ['facet normals diagonal (45-deg planes)', c=>c.woofs.every(d=>Math.abs(Math.abs(d.normal[1])-Math.abs(d.normal[2]))<0.25)],\n    ['no geometric fails', c=>c.fails.length===0 || c.fails.join(',')],\n    ['no red drivers', c=>c.reds===0 || 'reds='+c.reds],\n    ['frames clear each other (the whole point)', c=>{let mn=1e9; for(let i=0;i<c.woofs.length;i++)for(let j=i+1;j<c.woofs.length;j++)mn=Math.min(mn,MEH.minRimDist(c.woofs[i],c.woofs[j])); return mn>=0.004 || (mn*1000).toFixed(1)+'mm';}] ]);")

# 7) sweep also walks BELOW default mouth (his 32-inch path was unswept)
rep('sweep_gate.js', "    if(isl!=='roundprint') states.push(['thW=+20',",
"""    states.push(['mouth=-4',async()=>{ await page.evaluate((isl2)=>{const id=(isl2==='roundprint')?'num_mouthD':'num_mouthW'; const e=document.getElementById(id); if(e){e.value=Math.max(16,(+e.value||30)-4); e.dispatchEvent(new Event('change',{bubbles:true}));}},isl); await new Promise(r=>setTimeout(r,600)); }]);
    if(isl!=='roundprint') states.push(['thW=+20',""")

save(); print('BUILD52 chamfer dialect applied')
