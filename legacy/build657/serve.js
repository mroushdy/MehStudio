#!/usr/bin/env node
/* v5 local server — static files + the DURABLE PIN STORE.
   His ruling (2026-07-25): "always make it so when there is a new handoff the
   pins should start working." Before this, pins lived only in one browser
   profile's localStorage: a fresh pane profile / new browser / new session lost
   them, and a new agent had to go hunting for the right origin. Now the store
   is a FILE next to the tool — v5/pins.json — written by this server, read by
   any session with `cat`. localStorage stays as an offline mirror in the tool.

   Run: node serve.js [port]        (default 8517; .claude/launch.json "meh5")
   API: GET  /pins            -> {pins:[...]}
        POST /pins            -> merge body pins into the store (never deletes)
        POST /pins?mode=replace -> replace the store outright (BUGPINS.clear)
   Node built-ins only. Serves ONLY files under this directory. */
'use strict';
const http=require('http'), fs=require('fs'), path=require('path'), url=require('url');

const ROOT=__dirname;
const STORE=path.join(ROOT,'pins.json');
const PORT=+(process.argv[2]||process.env.PORT||8517);
const HOST=process.env.MEH_HOST||'127.0.0.1';

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8',
  '.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml',
  '.stl':'model/stl','.zip':'application/zip','.pdf':'application/pdf','.ico':'image/x-icon'};

/* ---- store ---------------------------------------------------------------- */
const readStore=()=>{ try{ const j=JSON.parse(fs.readFileSync(STORE,'utf8'));
    return Array.isArray(j)?j:(Array.isArray(j.pins)?j.pins:[]); }catch(e){ return []; } };
const writeStore=(pins)=>{ const tmp=STORE+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(pins,null,1));
  fs.renameSync(tmp,STORE);                      /* atomic: a torn read can never eat his pins */
  return pins; };

/* identity: uid when BOTH sides carry one (pins minted from b537 on), else the
   human id. The fallback is what keeps a LEGACY pin - anything pinned before the
   uid existed - from duplicating against its own synced copy; without it the first
   sync of an old store doubles every pin he ever placed. */
const samePin=(a,b)=>(a.uid&&b.uid)? a.uid===b.uid : (a.id|0)===(b.id|0);

/* merge law: a RESOLUTION never regresses (done:true wins, and the agent's fix
   text survives a stale tab pushing its pre-resolution copy); otherwise the
   newer timestamp wins; unknown pins are added; nothing is ever dropped. */
function mergePins(base,inc){
  const out=base.slice();
  for(const p of (inc||[])){
    if(!p||typeof p!=='object') continue;
    const at=out.findIndex(q=>samePin(q,p));
    if(at<0){ out.push(p); continue; }
    const cur=out[at];
    const merged={...cur,...p};
    if(cur.uid&&!p.uid) merged.uid=cur.uid;                               /* legacy copy never strips the uid */
    if(cur.done&&!p.done){ merged.done=true; merged.fix=cur.fix; }        /* resolution sticks */
    if(cur.t&&p.t&&new Date(cur.t)>new Date(p.t)&&!p.done) merged.note=cur.note;
    out[at]=merged;
  }
  out.sort((a,b)=>(a.id|0)-(b.id|0));
  return out;
}

/* ---- http ----------------------------------------------------------------- */
const cors=res=>{ res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type'); };
const json=(res,code,obj)=>{ cors(res); res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(obj)); };

const server=http.createServer((req,res)=>{
  const u=url.parse(req.url,true), p=decodeURIComponent(u.pathname);

  if(req.method==='OPTIONS'){ cors(res); res.writeHead(204); return res.end(); }

  if(p==='/pins'){
    if(req.method==='GET') return json(res,200,{pins:readStore()});
    if(req.method==='POST'){
      let body=''; req.on('data',c=>{ body+=c; if(body.length>8e6) req.destroy(); });
      req.on('end',()=>{ let inc;
        try{ const j=JSON.parse(body||'[]'); inc=Array.isArray(j)?j:(j.pins||[]); }
        catch(e){ return json(res,400,{ok:false,err:'bad json'}); }
        const next=(u.query.mode==='replace')?inc:mergePins(readStore(),inc);
        try{ writeStore(next); }catch(e){ return json(res,500,{ok:false,err:String(e.message)}); }
        const open=next.filter(x=>!x.done).length;
        console.log('[pins] '+(u.query.mode==='replace'?'replace':'merge')+' -> '+next.length+' pins, '+open+' open');
        json(res,200,{ok:true,pins:next});
      });
      return;
    }
    return json(res,405,{ok:false,err:'method'});
  }

  /* static, sandboxed to ROOT */
  let rel=p==='/'?'/meh5.html':p;
  const file=path.resolve(ROOT,'.'+rel);
  if(!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){ res.writeHead(404,{'Content-Type':'text/plain'}); return res.end('not found'); }
    cors(res);
    res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream',
      'Cache-Control':'no-store'});          /* never serve him a stale build after an assemble */
    fs.createReadStream(file).pipe(res);
  });
});

/* the merge law is the part that can silently eat his pins, so the gate tests it
   directly (gate 4.7b) - required as a module, this file starts no server. */
module.exports={mergePins,samePin,readStore,STORE};

if(require.main===module) server.listen(PORT,HOST,()=>{
  const n=readStore(), open=n.filter(p=>!p.done).length;
  console.log('meh5 serving '+ROOT+' on http://'+HOST+':'+PORT+'/meh5.html');
  console.log('pin store: '+STORE+' — '+n.length+' pins, '+open+' open');
});
