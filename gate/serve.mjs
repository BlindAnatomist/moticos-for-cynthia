import http from 'node:http';
import {readFileSync} from 'node:fs';
import {verifyBuild} from './binding.mjs';
const proof=verifyBuild(true),paths=new Map();
for(const row of proof.files){if(row.file.startsWith('dist-career/'))paths.set('/'+row.file.slice(12),row.file);else if(row.file.startsWith('dist-probe/'))paths.set('/probe/'+row.file.slice(11),row.file);}
paths.set('/probe/index.html','dist-probe/probe/index.html');
const types={html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',webp:'image/webp',png:'image/png',json:'application/json'};
const server=http.createServer((req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}let path;try{path=new URL(req.url,'http://127.0.0.1:4198').pathname;}catch{res.writeHead(400);return res.end();}const file=paths.get(path);if(!file){res.writeHead(404);return res.end('Not in reviewed build');}const body=readFileSync(file);res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]??'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);});
server.listen(4198,'127.0.0.1');for(const signal of['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
