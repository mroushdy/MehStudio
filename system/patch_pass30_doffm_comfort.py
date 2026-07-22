#!/usr/bin/env python3
# BUILD 78 - CORPUS #1 root cause fix (his wide-64 amber screenshot, diagnosed LIVE
# in his browser): all six drivers sat SNUG (0..-3mm prim-tolerance contact) at a
# 64-inch horn because (a) mids have NO slide lever (doffW exists, doffM never did)
# and (b) the slide walk only fires on true overlap, never the snug band.
#   1) doffM: mid frames slide off their taps (same Waslo law - taps hold).
#   2) COMFORT FINISHER: both walks now chase +1mm REAL clearance, not just <-0.5mm.
#   3) INSPECT F3 - MARKER BIJECTION (Autopilot P0): every drawn red/amber gasket
#      must trace to a collide/snug flag AND a fail/warn row; counts must match.
import io
F='meh_studio_v4.html'
src=io.open(F,encoding='utf-8').read(); n0=len(src)
def rep(a,b,cnt=1):
    global src
    n=src.count(a); assert n==cnt, 'anchor FAILED (%d found, want %d): %r'%(n,cnt,a[:70])
    src=src.replace(a,b)

# 1) placement: mids get the same slide (frame slides; tap holds)
rep("        const yD=(kind==='woof'&&S.doffW)? y+(face>0?1:-1)*(S.__flip?-1:1)*S.doffW*IN : y;   // frame slides; tap holds (Waslo)",
    "        const yD=(kind==='woof'&&S.doffW)? y+(face>0?1:-1)*(S.__flip?-1:1)*S.doffW*IN\n"
    "               : (kind==='mid'&&S.doffM)? y+(face>0?1:-1)*(S.__flip?-1:1)*S.doffM*IN : y;   // frame slides; tap holds (Waslo)")

# 2) DEF + params row + persistence keys
rep("doffW:0","doffW:0, doffM:0")
rep(' ["doffW","Driver offset from tap","in",0,3,0.05],\n ["sdW","Sd per driver","cm²",30,600,1],',
    ' ["doffW","Driver offset from tap","in",0,3,0.05],\n ["sdW","Sd per driver","cm²",30,600,1],')
rep('["doffW","Driver offset from tap","in",0,3,0.05],',
    '["doffW","Driver offset from tap","in",0,3,0.05],["doffM","Mid offset from tap","in",0,2,0.05],', 1)
rep('"crW","doffW"','"crW","doffW","doffM"')

# 3) the walk: comfort band (chase +1mm) + a mid pass after the woofer pass
rep("""    S.doffW=0;
    let best=worstW(MEH.evaluate(S)), bestS=0;
    if(best<-0.0005 && S.plW!=='remote' && S.shape!=='cone' && S.shape!=='os'){""",
"""    S.doffW=0;
    let best=worstW(MEH.evaluate(S)), bestS=0;
    if(best<0.001 && S.plW!=='remote' && S.shape!=='cone' && S.shape!=='os'){   // comfort: snug (amber) is also worth relieving""")
rep("""      S.doffW=bestS;
      if(bestS>0) S.bindW=(S.bindW||'')+' \\u00b7 drivers slid \\u00b1'+bestS.toFixed(1)+'\\u2033 off their taps (clearance - taps hold)';
    }""",
"""      S.doffW=bestS;
      if(bestS>0) S.bindW=(S.bindW||'')+' \\u00b7 drivers slid \\u00b1'+bestS.toFixed(1)+'\\u2033 off their taps (clearance - taps hold)';
    }
    { // mids: same law, their own lever (corpus #1 - six snug drivers at a 64-inch horn)
      const worstM=(ev)=>{ let w=1e9; const L=ev.layout;
        for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
          if(L[i].kind!=='mid'&&L[j].kind!=='mid') continue;
          const g=MEH.minRimDist(L[i],L[j]); if(g<w)w=g; }
        return w; };
      S.doffM=0;
      let bestM=worstM(MEH.evaluate(S)), bestMS=0;
      if(bestM<0.001 && MEH.HAS_M(S) && S.plM!=='knuckle' && S.plM!=='chamfer' && S.shape!=='cone' && S.shape!=='os'){
        const capM=Math.min(2.0, 0.4*(S.coneM||5)/2.54);
        for(let s2=0.1;s2<=capM+1e-9;s2+=0.1){
          S.doffM=+s2.toFixed(2);
          const ev2=MEH.evaluate(S);
          const bad=ev2.fit.some(r=>r.sec==='MID'&&r.st==='fail');
          const w2=worstM(ev2);
          if(!bad && w2>bestM){ bestM=w2; bestMS=S.doffM; }
          if(!bad && w2>=0.003){ bestMS=S.doffM; bestM=w2; break; }
        }
        S.doffM=bestMS;
        if(bestMS>0) S.bindM=(S.bindM||'')+' \\u00b7 mids slid \\u00b1'+bestMS.toFixed(1)+'\\u2033 off their taps (clearance - taps hold)';
      }
    }""")

# 4) INSPECT F3: marker bijection (drawn gaskets <-> model flags <-> table rows)
rep("    { // ---- F2: mounts/fixtures stay OUT of the horn (mouth plane + cavity) ----",
"""    { // ---- F3: MARKER BIJECTION (Autopilot P0) - drawn red/amber must trace to flags AND rows ----
      let drawnRed=0, drawnAmber=0;
      V3D.group.traverse(o=>{ if(o.isMesh&&o.material&&o.material.color){ const h=o.material.color.getHexString();
        if(h==='c8331d')drawnRed++; else if(h==='a8842c')drawnAmber++; }});
      const flagRed=L.filter(d=>d.collide).length, flagSnug=L.filter(d=>d.snug&&!d.collide).length;
      const rowFail=document.querySelectorAll('tr .bad,td.bad,tr.bad').length,
            rowWarn=document.querySelectorAll('tr .warn,td.warn,tr.warn').length;
      if(drawnRed>0 && flagRed===0)
        push('F3','fail',drawnRed+' RED marker(s) drawn but no driver carries a collide flag',[0,0,0],0.3);
      if(flagRed>0 && rowFail===0)
        push('F3','fail',flagRed+' collide flag(s) but the fit table shows no failing row',[0,0,0],0.3);
      if(drawnAmber>0 && flagSnug===0 && flagRed===0)
        push('F3','fail',drawnAmber+' AMBER marker(s) drawn but no driver carries a snug flag',[0,0,0],0.3);
      if(flagSnug>0 && rowWarn===0)
        push('F3','fail',flagSnug+' snug flag(s) but the fit table shows no warn row',[0,0,0],0.3);
    }
    { // ---- F2: mounts/fixtures stay OUT of the horn (mouth plane + cavity) ----""")

rep("window.MEH_BUILD=77;","window.MEH_BUILD=78;")

io.open(F,'w',encoding='utf-8').write(src)
print('BUILD78 doffM comfort + F3 bijection: %d -> %d chars'%(n0,len(src)))
