import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {LIMITS,SCREENSHOTS,POSTCARDS} from './policy.mjs';

export function classifyPngNames(paths) {
  const routine=new Set(SCREENSHOTS),postcards=new Set(POSTCARDS.map(r=>r.normalizedEvidenceFilename));
  const counts={routinePngs:0,postcardPngs:0,failurePngs:0,unknownPngs:0};
  for(const path of paths){const name=path.split('/').at(-1);if(name==='failure.png')counts.failurePngs++;else if(routine.has(name))counts.routinePngs++;else if(postcards.has(name))counts.postcardPngs++;else counts.unknownPngs++;}
  return counts;
}
export function enforceImageCounts(usage) {
  for(const key of ['pngs','traces','routinePngs','postcardPngs','failurePngs','unknownPngs'])if(!Number.isSafeInteger(usage[key])||usage[key]<0)throw Error('Incomplete image-count inventory');
  if(usage.pngs!==usage.routinePngs+usage.postcardPngs+usage.failurePngs+usage.unknownPngs)throw Error('PNG class counts disagree');
  if(usage.pngs>LIMITS.routinePngs+LIMITS.postcardPngs+LIMITS.failurePngs)throw Error('PNG ceiling reached');
  if(usage.traces>LIMITS.traces)throw Error('Failure trace ceiling reached');
  if(usage.unknownPngs>0)throw Error('Unknown PNG evidence filename');
  if(usage.failurePngs>LIMITS.failurePngs)throw Error('One explicit failure PNG ceiling reached');
  if(usage.routinePngs>LIMITS.routinePngs)throw Error('Routine PNG ceiling reached');
  if(usage.postcardPngs>LIMITS.postcardPngs)throw Error('Postcard PNG ceiling reached');
}

export function artifactUsage(root) {
  let bytes=0,traces=0;const pngPaths=[];
  function walk(path) {const s=fs.lstatSync(path);if(s.isSymbolicLink())throw Error('Evidence symlink forbidden');if(s.isDirectory())for(const n of fs.readdirSync(path))walk(path+'/'+n);else{if(!s.isFile())throw Error('Nonregular evidence forbidden');bytes+=s.size;if(path.toLowerCase().endsWith('.png'))pngPaths.push(path);if(path.endsWith('trace.zip'))traces++;}}
  if(fs.existsSync(root))walk(resolve(root));return {bytes,pngs:pngPaths.length,traces,...classifyPngNames(pngPaths)};
}
export function enforceUsage(usage) {
  if(usage.bytes>LIMITS.artifactBytes-1024*1024)throw Error('Artifact byte safety ceiling reached; preserve remaining diagnostic allowance');
  enforceImageCounts(usage);
}
// The process group is retired even when its leader exits first. A watchdog
// covers elapsed time and emitted artifacts throughout the whole child tree.
export function boundedProcess(command,args,{timeout,env=process.env,stdio='inherit',cwd=process.cwd(),artifactRoot}={}) {
  if(!Number.isSafeInteger(timeout)||timeout<=0)throw Error('Positive bounded timeout required');
  if(process.platform==='win32')throw Error('POSIX process groups required');
  return new Promise(resolvePromise=>{
    let status=null,signal=null,error=null,timedOut=false,closed=false,settled=false,stopping=false,force,drain;
    const child=spawn(command,args,{env,stdio,cwd,detached:true});
    function alive(){if(!Number.isInteger(child.pid))return false;try{process.kill(-child.pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;error??=e.message;return true;}}
    function send(s){if(Number.isInteger(child.pid))try{process.kill(-child.pid,s);}catch(e){if(e.code!=='ESRCH')error??=e.message;}}
    function finish(groupCleanup){if(settled)return;settled=true;clearTimeout(timer);clearTimeout(force);clearTimeout(drain);clearInterval(poll);for(const s of ['SIGTERM','SIGINT'])process.removeListener(s,parentStop);resolvePromise({status,signal,error,timedOut,groupCleanup});}
    function check(){if(closed&&!alive())finish(stopping?'terminated':'not-required');}
    function stop(reason){error??=reason;if(stopping)return;stopping=true;send('SIGTERM');force=setTimeout(()=>{send('SIGKILL');check();if(!settled)drain=setTimeout(()=>{check();if(!settled){error??='Process-group cleanup unconfirmed';finish('unconfirmed');}},1000);},5000);check();}
    function parentStop(s){stop(`Launcher received ${s}`);}
    for(const s of ['SIGTERM','SIGINT'])process.on(s,parentStop);
    const timer=setTimeout(()=>{timedOut=true;stop('Hard child deadline reached');},timeout);
    const poll=setInterval(()=>{if(stopping){check();return;}if(artifactRoot)try{enforceUsage(artifactUsage(artifactRoot));}catch(e){stop(e.message);}if(closed){if(alive())stop('Unexpected surviving child process after leader exit');else check();}},200);
    child.on('error',e=>{error=e.message;});
    child.on('close',(code,s)=>{closed=true;status=code;signal=s;check();});
  });
}
