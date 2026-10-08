import {spawn} from 'node:child_process';
const TERM_GRACE_MS=5000,KILL_DRAIN_MS=1000,POLL_MS=25;
export function boundedProcess(command,args,{timeout,env=process.env,stdio='inherit',cwd=process.cwd()}={}){
 if(!Number.isSafeInteger(timeout)||timeout<=0)throw Error('Positive bounded timeout required');
 if(process.platform==='win32')throw Error('This wrapper requires POSIX process groups');
 return new Promise(resolve=>{
  let timedOut=false,spawnError=null,closed=false,settled=false,status=null,exitSignal=null;
  let timeoutTimer,forceTimer,drainTimer,pollTimer;
  const child=spawn(command,args,{env,stdio,cwd,detached:true});
  const signalGroup=signal=>{if(!Number.isInteger(child.pid))return;try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')spawnError??=error.message;}};
  const groupExists=()=>{if(!Number.isInteger(child.pid))return false;try{process.kill(-child.pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;spawnError??=error.message;return true;}};
  const finish=groupCleanup=>{if(settled)return;settled=true;clearTimeout(timeoutTimer);clearTimeout(forceTimer);clearTimeout(drainTimer);clearInterval(pollTimer);resolve({status,signal:exitSignal,timedOut,error:spawnError,groupCleanup});};
  const checkCleanup=()=>{if(timedOut&&closed&&!groupExists())finish('terminated');};
  timeoutTimer=setTimeout(()=>{
   timedOut=true;
   // Closing the leader is not completion: descendants retain its process group.
   // Only verified group disappearance may cancel this escalation timer.
   forceTimer=setTimeout(()=>{
    signalGroup('SIGKILL');checkCleanup();
    if(!settled)drainTimer=setTimeout(()=>{checkCleanup();if(!settled){spawnError??='Process-group termination could not be confirmed after SIGKILL';finish('unconfirmed');}},KILL_DRAIN_MS);
   },TERM_GRACE_MS);
   pollTimer=setInterval(checkCleanup,POLL_MS);
   signalGroup('SIGTERM');checkCleanup();
  },timeout);
  child.on('error',error=>{spawnError=error.message;});
  child.on('close',(code,signal)=>{closed=true;status=code;exitSignal=signal;if(timedOut)checkCleanup();else finish('not-required');});
 });
}
