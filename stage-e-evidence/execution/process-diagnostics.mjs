import fs from 'node:fs';
import {performance} from 'node:perf_hooks';

// Diagnostic only: kernel signal checks remain the cleanup authority. Reading
// stat excludes arguments, environment variables and credentials.
export function parseProcessStat(text) {
  const left=text.indexOf('('),right=text.lastIndexOf(')');
  if(left<1||right<=left)throw Error('Malformed process stat');
  const pid=Number(text.slice(0,left).trim()),fields=text.slice(right+1).trim().split(/\s+/);
  const [state,ppid,pgid]=[fields[0],Number(fields[1]),Number(fields[2])];
  if(![pid,ppid,pgid].every(Number.isSafeInteger)||pid<=0||ppid<0||pgid<=0||!state?.match(/^[A-Za-z]$/))throw Error('Malformed process identity');
  return{pid,ppid,pgid,state};
}
export function processGroupSnapshot(pgid,{operations=fs,now=()=>performance.now()}={}) {
  const started=now(),out={pgid,status:'complete',examined:0,vanished:0,errors:0,members:[]};
  if(!Number.isSafeInteger(pgid)||pgid<=0)return{...out,status:'unavailable',reason:'No process group ID'};
  try{
    const pids=operations.readdirSync('/proc').filter(p=>/^\d+$/.test(p)).sort((a,b)=>Number(a)-Number(b));
    for(const pid of pids){
      if(out.examined>=2048||out.members.length>=32||now()-started>=100){out.status='truncated';break;}
      out.examined++;
      try{const row=parseProcessStat(operations.readFileSync(`/proc/${pid}/stat`,'utf8'));if(row.pgid===pgid)out.members.push(row);}
      catch(error){if(error.code==='ENOENT'||error.code==='ESRCH')out.vanished++;else{out.errors++;out.status='partial';}}
    }
  }catch(error){out.status='unavailable';out.reason=String(error.code??error.name).slice(0,80);}
  out.elapsedMs=Math.max(0,Math.ceil(now()-started));return out;
}
