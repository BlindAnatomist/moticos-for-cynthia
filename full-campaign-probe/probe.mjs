import {CATALOG} from '../src/career/content.js';
import {postcardSubtitle} from '../src/career/feedback.js';
import {createCollectionPostcard} from '../src/matching/postcard.js';
import {createCampaignPostcard,clearCampaignPostcards,campaignPostcardStats} from '../src/career/postcardCache.js';
import {createCareerSession as oldSession} from './old-session.v3.js';
let old=null;const hash=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
window.fullCampaignProbe={
 async openOld(){old=oldSession();const r=await old.open();return{status:r.status,state:r.state};},
 async oldCommit(action){if(!old)throw Error('Old session not opened');const r=await old.commit(action);return{ok:r.ok,status:r.status,code:r.code,warning:r.warning};},
 async compare(pieceId){const subtitle=postcardSubtitle(pieceId);clearCampaignPostcards();const start=performance.now();const first=await createCampaignPostcard(pieceId,CATALOG.CATALOG,subtitle),firstMs=performance.now()-start;const repeat=await createCampaignPostcard(pieceId,CATALOG.CATALOG,subtitle);const original=await createCollectionPostcard(pieceId,CATALOG.CATALOG,subtitle);const hashes=await Promise.all([first.blob,repeat.blob,original.blob].map(hash));const bitmap=await createImageBitmap(first.blob);const dimensions=[bitmap.width,bitmap.height];bitmap.close();return{pieceId,subtitle,dimensions,firstMs,hashes,byteEqual:hashes.every(h=>h===hashes[0]),sameBlob:first.blob===repeat.blob,sameFilename:first.filename===original.filename,stats:campaignPostcardStats(),caveat:'Isolated cache-empty/warm comparison, not physical-device timing or cold network proof.'};}
};
