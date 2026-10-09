// Newly reconstructed from accepted280; requires independent320 review.
import {CATALOG,STORAGE_KEY,LOCK_NAME} from '../../../../src/career/content.js';import {commandFor,validateCareer} from '../../../../src/career/engine.js';import {createCareerSession} from '../../../../src/career/session.js';import {postcardSubtitle} from '../../../../src/career/feedback.js';import {createCollectionPostcard} from '../../../../src/matching/postcard.js';import {createCampaignPostcard,clearCampaignPostcards,campaignPostcardStats} from '../../../../src/career/postcardCache.js';
let session=null;const locks=new Map(),hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
window.stageDProbe={
 async open(){session=createCareerSession();return session.open();},snapshot(){if(!session)throw Error('Session not open');return session.snapshot();},async command(action){if(!session)throw Error('Session not open');return session.commit(commandFor(session.snapshot().state,action));},async commit(action){if(!session)throw Error('Session not open');return session.commit(action);},read(){const state=JSON.parse(localStorage.getItem(STORAGE_KEY));validateCareer(state);return state;},
 async hold(id='writer'){if(locks.has(id))throw Error('Lock already held');await new Promise(resolve=>{navigator.locks.request(LOCK_NAME,{mode:'exclusive'},async()=>{let release;const blocked=new Promise(r=>release=r);locks.set(id,release);resolve();await blocked;locks.delete(id);});});return true;},release(id='writer'){const release=locks.get(id);if(!release)throw Error('Lock not held');release();return true;},
 async compare(pieceId){const subtitle=postcardSubtitle(pieceId);clearCampaignPostcards();const first=await createCampaignPostcard(pieceId,CATALOG.CATALOG,subtitle),repeat=await createCampaignPostcard(pieceId,CATALOG.CATALOG,subtitle),original=await createCollectionPostcard(pieceId,CATALOG.CATALOG,subtitle);const hashes=await Promise.all([first.blob,repeat.blob,original.blob].map(hash));const bitmap=await createImageBitmap(first.blob);const dimensions=[bitmap.width,bitmap.height];bitmap.close();return{pieceId,subtitle,dimensions,hashes,byteEqual:hashes.every(h=>h===hashes[0]),sameBlob:first.blob===repeat.blob,sameFilename:first.filename===original.filename,filename:first.filename,stats:campaignPostcardStats()};}
};

// Exercise the actual campaign singleton and real canvas renderer. No fake
// delay, renderer replacement, or synthetic Blob is used for this evidence.
window.stageDProbe.cacheStress = async function cacheStress(pieceIds) {
 if (!Array.isArray(pieceIds) || pieceIds.length !== 8 || new Set(pieceIds).size !== 8 || pieceIds.some(id=>!CATALOG.CATALOG[id])) throw Error('Eight distinct catalog pieces required');
 const snapshots=[], snap=()=>{const stats=campaignPostcardStats();snapshots.push(stats);return stats;};
 const render=id=>createCampaignPostcard(id,CATALOG.CATALOG,postcardSubtitle(id));
 clearCampaignPostcards();snap();
 let start=performance.now();const first=await render(pieceIds[0]),firstMs=performance.now()-start;snap();
 start=performance.now();const repeat=await render(pieceIds[0]),repeatMs=performance.now()-start;snap();
 const firstRepeat={pieceId:pieceIds[0],sameBlob:first.blob===repeat.blob,hashes:await Promise.all([hash(first.blob),hash(repeat.blob)]),firstMs,repeatMs};
 clearCampaignPostcards();snap();start=performance.now();
 // All eight are requested synchronously, before any render promise can settle.
 const pending=pieceIds.map(render);const duringBurst=snap();
 const settled=await Promise.allSettled(pending),burstMs=performance.now()-start,afterBurst=snap();
 const fulfilled=settled.filter(row=>row.status==='fulfilled');
 const burst={elapsedMs:burstMs,fulfilled:fulfilled.length,busy:settled.filter(row=>row.status==='rejected'&&row.reason?.name==='PostcardBusyError').length,
  otherErrors:settled.filter(row=>row.status==='rejected'&&row.reason?.name!=='PostcardBusyError').map(row=>String(row.reason)),
  rendered:await Promise.all(settled.map(async(row,i)=>row.status==='fulfilled'?{pieceId:pieceIds[i],bytes:row.value.blob.size,sha256:await hash(row.value.blob)}:null)).then(rows=>rows.filter(Boolean))};
 clearCampaignPostcards();const beforeEviction=snap(),evictionRenders=[];
 for(const id of pieceIds){start=performance.now();const value=await render(id);evictionRenders.push({pieceId:id,elapsedMs:performance.now()-start,bytes:value.blob.size,sha256:await hash(value.blob)});snap();}
 const afterEviction=snap();
 return {firstRepeat,duringBurst,burst,afterBurst,beforeEviction,afterEviction,evictionRenders,snapshots,
  evidenceScope:'Real campaign postcard cache and real canvas PNG rendering; temporary PNGs measured and hashed, not exported as additional evidence files.'};
};
