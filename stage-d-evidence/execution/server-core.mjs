import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {digest} from '../../full-campaign-gate/evidence.mjs';
export function assetPaths(core,probe,repoRoot,probeRoot) {
  const paths=new Map;
  for(const r of core.files){assert(r.file.startsWith('dist-stage-d/'));paths.set('/'+r.file.slice('dist-stage-d/'.length),{...r,path:resolve(repoRoot,r.file)});}
  for(const r of probe.files)paths.set('/stage-d-probe/'+r.file,{...r,path:resolve(probeRoot,r.file)});
  for(const [prefix,file]of [['/stage-d-probe/','stage-d-evidence/browser/probe/current/index.html'],['/stage-d-v7-probe/','stage-d-evidence/browser/probe/v7/index.html']]){
    const r=probe.files.find(r=>r.file===file);assert(r,`Missing probe entry: ${file}`);
    paths.set(prefix+'index.html',{...r,path:resolve(probeRoot,file)});paths.set(prefix,{...r,path:resolve(probeRoot,file)});
  }
  assert(paths.has('/career.html'));return paths;
}
export function createAssetServer(paths) {
  const types={html:'text/html',js:'application/javascript',css:'text/css',webp:'image/webp',png:'image/png',json:'application/json',svg:'image/svg+xml',ttf:'font/ttf'};
  return http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    let row;try{row=paths.get(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);return res.end();}
    if(!row){res.writeHead(404);return res.end();}
    try{const b=fs.readFileSync(row.path);assert.equal(b.length,row.bytes);assert.equal(digest(b),row.sha256,'Served build bytes changed');res.writeHead(200,{'Content-Type':types[row.path.split('.').at(-1)]??'application/octet-stream','Cache-Control':'no-store','Content-Length':b.length});res.end(req.method==='HEAD'?undefined:b);}catch{res.writeHead(500);res.end('Verified asset unavailable');}
  });
}
