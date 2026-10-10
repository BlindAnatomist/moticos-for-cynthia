import fs from 'node:fs';
import {dirname} from 'node:path';

// Diagnostic only. No page evaluations, URLs, messages, page text or credentials.
export function lifecycleDiagnostics({context,browser,path,now=Date.now,write=(p,b)=>{fs.mkdirSync(dirname(p),{recursive:true});fs.writeFileSync(p,b);}}) {
  const events=[],pages=new Map(),contexts=new Set(),removers=[];let dropped=0,writeErrors=0,stopped=false;
  function flush(){try{const bytes=JSON.stringify({schema:1,kind:'page-lifecycle-diagnostic',events,dropped,writeErrors})+'\n';if(Buffer.byteLength(bytes)>16384)throw Error('Diagnostic byte ceiling');write(path,bytes);}catch{writeErrors++;}}
  function note(event,pageId=null){if(stopped)return;if(events.length<64)events.push({seq:events.length,at:now(),event,pageId});else dropped++;flush();}
  function listen(emitter,event,fn){emitter.on(event,fn);removers.push(()=>emitter.removeListener(event,fn));}
  function watchPage(page){if(pages.has(page)||pages.size>=8)return;const id=pages.size+1;pages.set(page,id);note('page-observed',id);listen(page,'crash',()=>note('page-crash',id));listen(page,'close',()=>note('page-close',id));}
  function watchContext(value){if(contexts.has(value)||contexts.size>=4)return;contexts.add(value);for(const page of value.pages())watchPage(page);listen(value,'page',watchPage);listen(value,'close',()=>{note('context-close');if(value===context)stop();});}
  function stop(){if(stopped)return;note('observer-stopped');stopped=true;for(const remove of removers)remove();}
  listen(browser,'disconnected',()=>note('browser-disconnected'));watchContext(context);note('scenario-start');
  return{watchContext,note,stop};
}
