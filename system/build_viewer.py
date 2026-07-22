#!/usr/bin/env python3
# build_viewer.py - packages the orbit frames into meh_viewer.html: a self-contained
# gallery (island tabs, 10 views each, click any frame to zoom). This is the evidence
# artifact - the operator reviews it before deploy, and Marwan gets the same file.
import base64, os, json
VIEWS=['front','fq_left','fq_right','side','rq_high','rear34','rear','rq_other','top','rear_low']
LBL={'front':'Front','fq_left':'Front-quarter L','fq_right':'Front-quarter R','side':'Side',
     'rq_high':'Rear-quarter high','rear34':'Rear 3/4','rear':'Rear','rq_other':'Rear-quarter other',
     'top':'Top','rear_low':'Rear low'}
ISLANDS=[('unity','Unity 60x40'),('coax2','Coax 2-way'),('quadrant','Big square 4x12 (reference chamfer)'),
         ('knuckle','Molded knuckle (SAWMOD)'),('wide','Wide-format'),('roundprint','Round printed'),
         ('pa3way','Big-format 3-way PA')]
data={}
for isl,_ in ISLANDS:
    data[isl]={v:base64.b64encode(open(f'/tmp/orbit/{isl}__{v}.png','rb').read()).decode() for v in VIEWS}
html=f"""<!doctype html><html><head><meta charset="utf-8"><title>MEH Studio - Orbit Viewer (build 57)</title>
<style>
body{{margin:0;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;background:#191919;color:#ddd}}
header{{padding:10px 16px;background:#111;border-bottom:1px solid #333}}
header b{{color:#fff}} header span{{color:#888;margin-left:10px}}
nav{{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;background:#161616;border-bottom:1px solid #2a2a2a;position:sticky;top:0}}
nav button{{background:#242424;color:#ccc;border:1px solid #3a3a3a;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px}}
nav button.on{{background:#e8e4da;color:#111;border-color:#e8e4da;font-weight:600}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;padding:14px 16px}}
.cell{{background:#101010;border:1px solid #2c2c2c;border-radius:8px;overflow:hidden;cursor:zoom-in}}
.cell img{{width:100%;display:block}}
.cell div{{padding:5px 9px;color:#9a9a9a;font-size:11.5px;border-top:1px solid #242424}}
#zoom{{position:fixed;inset:0;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;cursor:zoom-out;flex-direction:column}}
#zoom img{{max-width:96vw;max-height:90vh}} #zoom p{{color:#bbb;margin:8px 0 0}}
</style></head><body>
<header><b>MEH Studio — Orbit Viewer</b><span>build 57 · 7 islands × 10 views · every frame reviewed before deploy</span></header>
<nav id="tabs"></nav><div class="grid" id="grid"></div>
<div id="zoom" onclick="this.style.display='none'"><img id="zimg"><p id="zcap"></p></div>
<script>
const DATA={json.dumps(data)};
const VIEWS={json.dumps(VIEWS)}; const LBL={json.dumps(LBL)};
const ISLANDS={json.dumps(ISLANDS)};
let cur='quadrant';
function draw(){{
  document.getElementById('tabs').innerHTML=ISLANDS.map(function(t){{return '<button class="'+(t[0]===cur?'on':'')+'" onclick="cur=\\''+t[0]+'\\';draw()">'+t[1]+'</button>';}}).join('');
  document.getElementById('grid').innerHTML=VIEWS.map(function(v){{
    return '<div class="cell" onclick="zoom(\\''+v+'\\')"><img src="data:image/png;base64,'+DATA[cur][v]+'"><div>'+LBL[v]+'</div></div>';}}).join('');
}}
function zoom(v){{
  document.getElementById('zimg').src='data:image/png;base64,'+DATA[cur][v];
  document.getElementById('zcap').textContent=ISLANDS.find(function(t){{return t[0]===cur;}})[1]+' — '+LBL[v];
  document.getElementById('zoom').style.display='flex';
}}
draw();
</script></body></html>"""
open('meh_viewer.html','w').write(html)
print('meh_viewer.html: %.1f MB'%(os.path.getsize('meh_viewer.html')/1e6))
