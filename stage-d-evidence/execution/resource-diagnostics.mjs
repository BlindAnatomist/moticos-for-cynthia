import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {parseProcessStat} from './process-diagnostics.mjs';

// Only numeric resource observations and process identity fields. Never read
// arguments, environment, URLs or page contents. A partial scan is not a verdict.
const CGROUP=['memory.current','memory.peak','memory.max','memory.events'];
export function resourceSnapshot({operations=fs,now=()=>performance.now()}={}){
  const start=now(),out={status:'complete',examined:0,vanished:0,errors:0,processes:[],rssKiB:0,cgroup:{}};
  const read=path=>{const fd=operations.openSync(path,'r');try{const b=Buffer.alloc(8192),n=operations.readSync(fd,b,0,b.length,0);if(n===b.length)throw Error('Diagnostic input truncated');return b.subarray(0,n).toString('utf8');}finally{operations.closeSync(fd);}};
  for(const name of CGROUP){try{const raw=read('/sys/fs/cgroup/'+name).trim();if(name==='memory.events'){const values={};for(const line of raw.split('\n')){const [key,value]=line.trim().split(/\s+/);if(['low','high','max','oom','oom_kill','oom_group_kill','sock_throttled'].includes(key)&&/^\d{1,20}$/.test(value))values[key]=value;}out.cgroup[name]={status:'read',values};}else if(raw==='max'||/^\d{1,20}$/.test(raw))out.cgroup[name]={status:'read',value:raw};else throw Error('Malformed numeric cgroup field');}catch{out.cgroup[name]={status:'unavailable'};}}
  try{const pids=operations.readdirSync('/proc').filter(p=>/^\d+$/.test(p)).sort((a,b)=>Number(a)-Number(b));for(const pid of pids){if(out.examined>=256||out.processes.length>=24||now()-start>=50){out.status='truncated';break;}out.examined++;try{const stat=read(`/proc/${pid}/stat`),name=stat.slice(stat.indexOf('(')+1,stat.lastIndexOf(')'));const family=/^(WebKit|WPE|MiniBrowser)/.test(name)?'webkit':/^(chrome|chromium|headless_shell)/.test(name)?'chromium':/^node$/.test(name)?'node':null;if(!family)continue;const identity=parseProcessStat(stat),status=read(`/proc/${pid}/status`),match=status.match(/^VmRSS:\s+(\d+) kB$/m),rss=match?Number(match[1]):null;if(rss!==null&&(!Number.isSafeInteger(rss)||rss>Math.floor(Number.MAX_SAFE_INTEGER/24)))throw Error('Invalid RSS');out.processes.push({...identity,family,rssKiB:rss});out.rssKiB+=rss??0;}catch(e){if(['ENOENT','ESRCH'].includes(e.code))out.vanished++;else{out.errors++;out.status='partial';}}}}catch{out.status='unavailable';}
  out.elapsedMs=Math.max(0,Math.ceil(now()-start));return out;
}
export function resourceDiagnostics({path,binding,profile,snapshot=resourceSnapshot,now=Date.now,write=(p,b)=>fs.writeFileSync(p,b),schedule=setInterval,cancel=clearInterval}={}){
  const samples=[];let count=0,writeErrors=0,stopped=false,maxObservedRssKiB=0;const start=now();
  function sample(phase){if(stopped)return;try{const value=snapshot();maxObservedRssKiB=Math.max(maxObservedRssKiB,value.rssKiB??0);samples.push({phase,at:now(),value});if(samples.length>12)samples.shift();count++;const bytes=JSON.stringify({schema:1,kind:'bounded-resource-diagnostics',binding,profile,startedAt:start,samples,totalSamples:count,maxObservedRssKiB,writeErrors,note:'10-second observations; last 12 retained. Numeric cgroup counters are observations, not causal proof. The 50ms traversal budget is checked between synchronous reads.'})+'\n';if(Buffer.byteLength(bytes)>65536)throw Error('Diagnostic byte ceiling');write(path,bytes);}catch{writeErrors++;}}
  const timer=schedule(()=>sample('interval'),10000);timer?.unref?.();sample('before-profile');
  return{stop(){if(stopped)return;cancel(timer);sample('after-profile');stopped=true;}};
}

// Observation initialization/retirement must never leave an already launched
// process unawaited or replace its original failure and cleanup result.
export async function observeBoundedProcess(launched,options,create=resourceDiagnostics){
  let observer,result;const errors=[];
  try{observer=create(options);}catch{errors.push('initialization-failed');}
  try{result=await launched;}finally{try{observer?.stop();}catch{errors.push('retirement-failed');}}
  return{...result,resourceObserver:{status:errors.length?'unavailable-or-partial':'monitor-completed',errors}};
}
