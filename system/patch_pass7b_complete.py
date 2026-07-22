#!/usr/bin/env python3
# BUILD 51b - completion batch + Marwan's tap-dialect ask:
#  1) mkPorts ORDER fix: the remote block reassigned p AFTER the sup re-projection, so
#     remote bandpass ports stayed 18 mm off the shell (sweep-caught). Re-projection now
#     runs LAST (never for knuckle pod faces). Cross corner margin 6->10 mm (sweep: -2 mm).
#  2) TAP DIALECTS (his wood-horn photo: long slits; reference: square-ish): port shape gains
#     'sq' (square, area-true) alongside round/racetrack; per-driver port count npM joins
#     the island tune lists everywhere mids exist ("one or two - make these options").
#  3) sweep_gate also walks coverage angle (+20 deg) - his 109-degree pa3way find came
#     from the thW slider, a dimension the sweep never covered.
import io, re
FILES={}
def load(f): FILES[f]=io.open(f,encoding='utf-8').read()
def save():
    for f,s in FILES.items(): io.open(f,'w',encoding='utf-8').write(s)
def rep(f,a,b,cnt=1):
    s=FILES[f]; n=s.count(a)
    assert n==cnt, '%s anchor FAILED (%d found, want %d): %r'%(f,n,cnt,a[:70])
    FILES[f]=s.replace(a,b)
load('meh_studio_v4.html'); load('sweep_gate.js'); load('deploy.sh')
H='meh_studio_v4.html'

# 1a: remote sets off only; sup re-projection moves AFTER remote+knuckle; cross margin 10mm
rep(H, """      let p=vadd(d.portC,vscale(d.u,off)), u2=d.u, v2=d.v, n2=d.normal;
      if(st.form==='sup' && Math.abs(off)>1e-9 && !d.knPod){     // tangent offsets leave the superellipse - re-project (his floating-kidney screenshot)
        const dm=dimsAt(st,Math.min(d.portC[0],st.depth));
        const phi2=Math.atan2(p[2],p[1]);
        const q2=outlinePt('sup',dm.w,dm.h,phi2);
        p=[d.portC[0], q2[0], q2[1]];
        n2=surfNormal(st,d.portC[0],phi2);
        u2=(vlen(vcross(n2,[1,0,0]))<1e-6)?[0,1,0]:vnorm(vcross(n2,[1,0,0])); v2=vnorm(vcross(n2,u2));
      }
      if(d.kind==='woof' && S.plW==='remote'){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);
        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); p=vadd(d.portC,vscale(d.u,off)); }
      if(d.knPod){ n2=vscale(d.knPod.n,-1);""",
"""      if(d.kind==='woof' && S.plW==='remote'){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);
        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); }
      let p=vadd(d.portC,vscale(d.u,off)), u2=d.u, v2=d.v, n2=d.normal;
      if(d.knPod){ n2=vscale(d.knPod.n,-1);""")
rep(H, """        off=np===1?0:(q/(np-1)-0.5)*d.knPod.r*1.1;
        p=vadd(d.portC,vscale(u2,off)); }
      if(st.form==='round' && Math.abs(off)>1e-9){   // tangent offsets leave a curved wall - stay ON it""",
"""        off=np===1?0:(q/(np-1)-0.5)*d.knPod.r*1.1;
        p=vadd(d.portC,vscale(u2,off)); }
      if(st.form==='sup' && Math.abs(off)>1e-9 && !d.knPod){     // tangent offsets leave the superellipse - re-project LAST (his floating-kidney screenshot)
        const dm=dimsAt(st,Math.min(d.portC[0],st.depth));
        const phi2=Math.atan2(p[2],p[1]);
        const q2=outlinePt('sup',dm.w,dm.h,phi2);
        p=[d.portC[0], q2[0], q2[1]];
        n2=surfNormal(st,d.portC[0],phi2);
        u2=(vlen(vcross(n2,[1,0,0]))<1e-6)?[0,1,0]:vnorm(vcross(n2,[1,0,0])); v2=vnorm(vcross(n2,u2));
      }
      if(st.form==='round' && Math.abs(off)>1e-9){   // tangent offsets leave a curved wall - stay ON it""")
rep(H, "if(d.kind==='woof'&&S.plW==='cross') cap=Math.min(cap, hLat-1.42*rP-0.006);",
       "if(d.kind==='woof'&&S.plW==='cross') cap=Math.min(cap, hLat-1.42*rP-0.010);")

# 2a: square shape option (area-true) - selects, renderer, dims text
rep(H, ' ["shM","Mid port shape","sel",[["round","Round (drilled)"],["rt","Racetrack slot"]]],',
       ' ["shM","Mid port shape","sel",[["round","Round (drilled)"],["rt","Racetrack slot"],["sq","Square (reference-style)"]]],')
rep(H, ' ["shW","Woofer port shape","sel",[["round","Round (drilled)"],["rt","Racetrack slot"]]],',
       ' ["shW","Woofer port shape","sel",[["round","Round (drilled)"],["rt","Racetrack slot"],["sq","Square (reference-style)"]]],')
# renderer: square slots draw as squares (slot mesh geometry swaps per shape)
rep(H, """      const slot=new THREE.Mesh(new THREE.CircleGeometry(1,26),
        new THREE.MeshBasicMaterial({color:(pFail||d.collide)?0xC8331D:0x232321,side:THREE.DoubleSide}));""",
"""      const shq=(d.kind==='mid'?S.shM:S.shW)==='sq';
      const slot=new THREE.Mesh(shq?new THREE.PlaneGeometry(1.772,1.772):new THREE.CircleGeometry(1,26),
        new THREE.MeshBasicMaterial({color:(pFail||d.collide)?0xC8331D:0x232321,side:THREE.DoubleSide}));""")
# portDims helper + AUTO box inline fns gain the square branch
rep(H, "    if(shape==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2); return 'slot '+(2*sa/2.54).toFixed(2)+'\u00d7'+(2*sa/2.2/2.54).toFixed(2)+'\u2033';}",
       "    if(shape==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2); return 'slot '+(2*sa/2.54).toFixed(2)+'\u00d7'+(2*sa/2.2/2.54).toFixed(2)+'\u2033';}\n"
       "    if(shape==='sq'){const s3=Math.sqrt(Ap); return '\u25a1 '+(s3/2.54).toFixed(2)+'\u2033';}")
rep(H, "if(sh==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2);return 'slot '+(2*sa/2.54).toFixed(2)+'\u00d7'+(2*sa/2.2/2.54).toFixed(2)+'\u2033';} return '\u00d8'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'\u2033';})(S.apM",
       "if(sh==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2);return 'slot '+(2*sa/2.54).toFixed(2)+'\u00d7'+(2*sa/2.2/2.54).toFixed(2)+'\u2033';} if(sh==='sq'){const s3=Math.sqrt(Ap);return '\u25a1 '+(s3/2.54).toFixed(2)+'\u2033';} return '\u00d8'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'\u2033';})(S.apM")
rep(H, "if(sh==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2);return 'slot '+(2*sa/2.54).toFixed(2)+'\u00d7'+(2*sa/2.2/2.54).toFixed(2)+'\u2033';} return '\u00d8'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'\u2033';})(S.apW",
       "if(sh==='rt'){const sa=Math.sqrt(Ap/Math.PI*2.2);return 'slot '+(2*sa/2.54).toFixed(2)+'\u00d7'+(2*sa/2.2/2.54).toFixed(2)+'\u2033';} if(sh==='sq'){const s3=Math.sqrt(Ap);return '\u25a1 '+(s3/2.54).toFixed(2)+'\u2033';} return '\u00d8'+(2*Math.sqrt(Ap/Math.PI)/2.54).toFixed(2)+'\u2033';})(S.apW")

# 2b: per-driver port count is an island lever wherever mids exist
rep(H, "unity:['mouthW','thW','cdSel','midSel','wfSel','nM','crM','crW','shM','shW'],",
       "unity:['mouthW','thW','cdSel','midSel','wfSel','nM','npM','crM','crW','shM','shW'],")
rep(H, "knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA','crM','crW'],",
       "knuckle:['mouthW','thW','cdSel','midSel','wfSel','knA','npM','crM','crW'],")
rep(H, "wide:['mouthW','thW','midSel','nM','wfSel','cdSel','crM','crW','shM','shW'],",
       "wide:['mouthW','thW','midSel','nM','npM','wfSel','cdSel','crM','crW','shM','shW'],")
rep(H, "roundprint:['mouthD','cdSel','midSel','nM','wfSel','nW','crM','crW'],",
       "roundprint:['mouthD','cdSel','midSel','nM','npM','wfSel','nW','crM','crW'],")
rep(H, "pa3way:['mouthW','thW','cdSel','midSel','wfSel','crM','crW','shM','shW']",
       "pa3way:['mouthW','thW','cdSel','midSel','wfSel','npM','crM','crW','shM','shW']")

# 3: sweep walks the coverage slider too (his 109-degree find)
rep('sweep_gate.js', "    states.push(['mouth=cap',async()=>{ await setNum(isl==='roundprint'?'num_mouthD':'num_mouthW',CAPS[isl]||44); }]);",
"""    states.push(['mouth=cap',async()=>{ await setNum(isl==='roundprint'?'num_mouthD':'num_mouthW',CAPS[isl]||44); }]);
    if(isl!=='roundprint') states.push(['thW=+20',async()=>{ await page.evaluate(()=>{const e=document.getElementById('num_thW'); if(e){e.value=Math.min(120,(+e.value||90)+20); e.dispatchEvent(new Event('change',{bubbles:true}));}}); await new Promise(r=>setTimeout(r,600)); }]);""")

# deploy: the sweep is a gate
rep('deploy.sh', 'node meh_suite.js > /tmp/suite.log 2>&1 || { echo "SUITE FAIL"; tail -5 /tmp/suite.log; exit 1; }',
'node meh_suite.js > /tmp/suite.log 2>&1 || { echo "SUITE FAIL"; tail -5 /tmp/suite.log; exit 1; }\nnode sweep_gate.js > /tmp/sweep.log 2>&1 || { echo "SWEEP FAIL"; tail -12 /tmp/sweep.log; exit 1; }')

save(); print('BUILD51b applied: mkPorts order + sq shape + npM levers + thW sweep + deploy wiring')
