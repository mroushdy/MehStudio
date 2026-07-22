#!/usr/bin/env python3
# BUILD 52d - reference kidneys done right (probe: settled tap x=65mm, corner=114mm - eight
# azimuthal ports geometrically impossible; his plate photo shows RADIAL pockets):
#  1) chamfer port pairs stack RADIALLY along the corner diagonal (reference pocket ovals);
#  2) new row 'Chamfer kidney ring fits' (adjacent clusters must clear: rPo*sqrt2 >= 2rP+10mm)
#     and the woofer tap WALK responds to the chamfer rows - the tap moves out to where
#     the corner hosts the ring (constraint-driven, like every other law in the tool);
#  3) sweep learns facet ports: ON-PLATE check replaces the rect cavity check for chamfer.
import io
FILES={}
def load(f): FILES[f]=io.open(f,encoding='utf-8').read()
def save():
    for f,s in FILES.items(): io.open(f,'w',encoding='utf-8').write(s)
def rep(f,a,b,cnt=1):
    s=FILES[f]; n=s.count(a)
    assert n==cnt, '%s anchor FAILED (%d found, want %d): %r'%(f,n,cnt,a[:70])
    FILES[f]=s.replace(a,b)
load('meh_studio_v4.html'); load('sweep_gate.js')
H='meh_studio_v4.html'

# 1) radial kidney stacking for chamfer clusters (mkPorts)
rep(H, "if(d.kind==='woof' && (S.plW==='remote'||S.plW==='chamfer')){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);\n        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); }",
"""if(d.kind==='woof' && S.plW==='remote'){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);
        off=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.008); }
      if(d.chamfer){ const rPt=Math.sqrt((S.apW*1e-4/Math.max(1,np))/Math.PI);
        const e3=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
        const offR=np===1?0:(q/(np-1)-0.5)*2*(rPt+0.004);      // reference pockets: kidneys run RADIALLY
        d.ports.push({p:vadd(d.portC,vscale(e3,offR)), u:[1,0,0], v:vnorm(vcross(e3,[1,0,0])), n:vnorm(vcross([1,0,0],vnorm(vcross(e3,[1,0,0]))))});
        continue; }""")

# 2) ring-fit law + the walk responds to the chamfer rows
rep(H, """      rows.push({sec:'WOOF',name:'Chamfer ports open inside the corner',val:(worstIn*1000).toFixed(0)+' mm',
        st: worstIn>=0.004?'ok':worstIn>=0?'warn':'fail',
        why: worstIn<0?'port kidney lands outside the horn cross-section - bigger horn or fewer/smaller ports':'port cluster clearance inside the corner line (reference kidneys)'});
      if(worstIn<0) for(const d of chs) d.collide=true;""",
"""      rows.push({sec:'WOOF',name:'Chamfer ports open inside the corner',val:(worstIn*1000).toFixed(0)+' mm',
        st: worstIn>=0.004?'ok':worstIn>=0?'warn':'fail',
        why: worstIn<0?'port kidney lands outside the horn cross-section - bigger horn or fewer/smaller ports':'port cluster clearance inside the corner line (reference kidneys)'});
      if(worstIn<0) for(const d of chs) d.collide=true;
      { const rP3=Math.sqrt((S.apW*1e-4/Math.max(1,S.npW|0||1))/Math.PI);
        let ringWorst=1e9;
        for(const d of chs) ringWorst=Math.min(ringWorst, d.chamfer.portR*1.4142-(2*rP3+0.010));
        rows.push({sec:'WOOF',name:'Chamfer kidney ring fits',val:(ringWorst*1000).toFixed(0)+' mm',
          st: ringWorst>=0.004?'ok':ringWorst>=0?'warn':'fail',
          why: ringWorst<0?'adjacent corner kidneys collide - the tap must sit farther out (bigger corner) or ports smaller':'clearance between adjacent corner kidney clusters (his plate photo)'});
        if(ringWorst<0) for(const d of chs) d.collide=true;
        const rEdge=Math.min(...chs.map(d=>d.chamfer.corner-(d.chamfer.portR+((S.npW|0||1)>1?(rP3+0.004):0)+rP3)));
        rows.push({sec:'WOOF',name:'Chamfer kidneys within the corner run',val:(rEdge*1000).toFixed(0)+' mm',
          st: rEdge>=0.004?'ok':rEdge>=0?'warn':'fail',
          why:'the radial kidney stack must finish inside the corner line - walk the tap out if tight'});
        if(rEdge<0) for(const d of chs) d.collide=true;
      }""")
# the woofer panel-floor walk sees the chamfer rows (pushes the tap OUT until the ring fits)
rep(H, "          if(!evp.fit.some(r=>r.sec==='WOOF'&&/within the wall|ring spacing|CD body/.test(r.name)&&r.st==='fail') && !evp.fit.some(r=>r.sec==='WOOF'&&/within the wall/.test(r.name)&&r.st!=='ok')) break;",
      "          if(!evp.fit.some(r=>r.sec==='WOOF'&&/within the wall|ring spacing|CD body|kidney ring|inside the corner|corner run/.test(r.name)&&r.st==='fail') && !evp.fit.some(r=>r.sec==='WOOF'&&/within the wall/.test(r.name)&&r.st!=='ok')) break;")
# the badW acceptance predicate too
rep(H, "    const badW=ev=>ev.fit.some(r=>r.sec==='WOOF' && /CD body|conform|ring spacing|within the wall|pads on the wall/.test(r.name) && r.st==='fail');",
      "    const badW=ev=>ev.fit.some(r=>r.sec==='WOOF' && /CD body|conform|ring spacing|within the wall|pads on the wall|kidney ring|inside the corner|corner run/.test(r.name) && r.st==='fail');")

# 3) sweep: facet ports check ON-PLATE, not against the rect cavity
rep('sweep_gate.js', """        } else {
          const m=MEH.cavityMargin(st,pr.p);
          if(Math.abs(m)>0.007) tapBad.push(d.kind+' port off-surface '+(m*1000).toFixed(0)+'mm');
        }""",
"""        } else if(d.chamfer){
          const e3=[0,Math.cos(d.chamfer.phi),Math.sin(d.chamfer.phi)];
          const rad=pr.p[1]*e3[1]+pr.p[2]*e3[2];
          if(rad>d.chamfer.corner+0.004||rad<((S.td||1)*0.0254/2)) tapBad.push('chamfer kidney outside its corner run '+(rad*1000).toFixed(0)+'mm');
        } else {
          const m=MEH.cavityMargin(st,pr.p);
          if(Math.abs(m)>0.007) tapBad.push(d.kind+' port off-surface '+(m*1000).toFixed(0)+'mm');
        }""")

save(); print('BUILD52d kidneys applied')
