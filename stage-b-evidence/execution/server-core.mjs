import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
export function assetPaths(core,probe,repoRoot,probeRoot){
 const paths=new Map;
 for(const r of core.files){if(r.file.startsWith('dist-career/'))paths.set('/'+r.file.slice(12),resolve(repoRoot,r.file));if(r.file.startsWith('dist-full-probe/'))paths.set('/full-probe/'+r.file.slice(16),resolve(repoRoot,r.file));}
 paths.set('/full-probe/index.html',resolve(repoRoot,'dist-full-probe/full-campaign-probe/index.html'));
 for(const r of probe.files){paths.set('/stage-b-probe/'+r.file,resolve(probeRoot,r.file));if(r.file==='stage-b-evidence/browser/probe/index.html')paths.set('/stage-b-probe/index.html',resolve(probeRoot,r.file));}
 assert(paths.has('/career.html'));assert(paths.has('/stage-b-probe/index.html'));return paths;
}
export function createAssetServer(paths){
 const types={html:'text/html',js:'application/javascript',css:'text/css',webp:'image/webp',png:'image/png',json:'application/json'};
 return http.createServer((req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}const p=paths.get(new URL(req.url,'http://127.0.0.1').pathname);if(!p){res.writeHead(404);return res.end();}try{const b=fs.readFileSync(p);res.writeHead(200,{'Content-Type':types[p.split('.').at(-1)]??'application/octet-stream','Cache-Control':'no-store','Content-Length':b.length});res.end(req.method==='HEAD'?undefined:b);}catch{res.writeHead(500);res.end('Verified asset unavailable');}});
}
