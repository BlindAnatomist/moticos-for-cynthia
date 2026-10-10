const HEADERS=['date','x-github-request-id','retry-after','x-ratelimit-limit','x-ratelimit-remaining','x-ratelimit-reset','x-ratelimit-resource'];
const safe=value=>String(value).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,128);
export function responseMetadata(response){const headers={};for(const key of HEADERS){const value=response.headers?.get?.(key);if(value!==null&&value!==undefined)headers[key]=safe(value);}return{status:response.status,headers};}
export function withinDeadline(promise,signal){return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(Error('Current-job clock request deadline exceeded'));};Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});});}
export async function errorResponseSummary(response,signal){
  if(!response.body?.getReader)return{status:'unavailable',reason:'No readable response stream'};
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await withinDeadline(reader.read(),signal);if(done)break;length+=value.byteLength;if(length>2048){void reader.cancel().catch(()=>{});return{status:'truncated',limitBytes:2048};}chunks.push(Buffer.from(value));}
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8')),message=typeof body.message==='string'?body.message.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,512):null;
    const classification=/api rate limit exceeded|secondary rate limit|temporarily blocked.*rate/i.test(message??'')?'rate-limit-reported':/resource not accessible|requires authentication|bad credentials|permission denied/i.test(message??'')?'access-denial-reported':'unclassified';
    return{status:'parsed',bytes:length,message,classification};
  }catch{return{status:'unavailable',reason:signal.aborted?'Original request deadline reached':'Body unavailable or invalid JSON'};}
  finally{try{reader.releaseLock();}catch{}}
}
