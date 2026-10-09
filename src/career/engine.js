import { CATALOG, FAMILIES, SCHEMA_VERSION, RULES_VERSION, CONTENT_VERSION, CHAPTER, CHAPTERS, STARTER_FAMILY_IDS, STORY_ORDERS, ORDINARY_ORDERS, UPGRADES, SORTER_CYCLE, levelDefinition, coinBalance, orderCapacity, recipeKey, eligible, chapterDefinition, chapterStories, unlockedSourceIds, availableUpgrades, orderTemplate, upgradeDefinition, contentPack, enteredChapterDefinition, storyEligible, ordinaryTemplatesFor } from './content.js';
import { upgradeCareer as upgradeV4 } from './engine.v4.js';
import {CONTINUATION,VOLUMES,volumeOf,continuationEntered} from './volumes.js';
export const HISTORY_LIMIT=32, RECEIPT_LIMIT=40;
const MAX=Number.MAX_SAFE_INTEGER-1000, clone=value=>structuredClone(value);
const integer=(n,min=0,max=MAX)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b), slot=n=>integer(n,0,24);
const exactKeys=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...keys].sort());
const familyOf=id=>FAMILIES.find(f=>f.id===id);
const allocateTile=(s,pieceId)=>({id:`${s.careerId}:tile:${s.nextTileSeq++}`,pieceId});
function initialMaterialFor(s,familyId){if(s.mode==='career')return STARTER_FAMILY_IDS.includes(familyId)?4:0;const letter=orderTemplate(s.replayLetterId,s.replayContentVersion??CONTENT_VERSION,'story');return letter?.requirements.some(r=>CATALOG.pieceOf(r.pieceId).familyId===familyId)?4:0;}
function discover(s){s.discoveries=[...new Set([...s.discoveries,...s.board.filter(Boolean).map(t=>t.pieceId)])];}
export function chapterComplete(s,chapterId=s.chapterId,version=s.chapterEntryVersions?.[chapterId]??s.contentVersion){const pack=contentPack(version),chapter=pack?.chapters.find(c=>c.id===chapterId),threshold=pack?.levels.find(l=>l.level===chapter?.minimumLevel)?.xp;return s.mode==='career'&&!!chapter&&s.xp>=threshold&&chapter.storyIds.every(id=>s.milestones.includes(id));}
export function volumeComplete(s,volumeId){const volume=VOLUMES.find(v=>v.id===volumeId);return s.mode==='career'&&!!volume&&volume.chapterIds.every(id=>s.enteredChapters.includes(id)&&chapterComplete(s,id));}
export const originalVolumeComplete=s=>volumeComplete(s,VOLUMES[0].id);
export const currentVolumeComplete=s=>volumeComplete(s,volumeOf(s).id);
export const allAuthoredContentComplete=s=>VOLUMES.every(v=>volumeComplete(s,v.id));
export const campaignComplete=currentVolumeComplete;
export function canEnterContinuation(s){return s.mode==='career'&&s.chapterId===CONTINUATION.fromChapterId&&!continuationEntered(s)&&!s.suspendedStory&&originalVolumeComplete(s)&&s.xp>=CONTINUATION.minimumXP&&CONTINUATION.requiredOriginalStoryIds.every(id=>s.milestones.includes(id));}
export function canStartNextChapter(s){return s.mode==='career'&&chapterComplete(s)&&!!chapterDefinition(s).nextId;}
export function nextOutput(s,familyId,basic=false){const source=s.sources[familyId],family=familyOf(familyId);if(!source||!family||!s.unlockedSources.includes(familyId))return null;const tier=!basic&&source.sorter?SORTER_CYCLE[source.cursor%3]:1;return CATALOG.pieceOf(family.pieceIds[tier-1]);}
function selectSourcesFor(s,order){if(!order)return;const needed=[...new Set(order.requirements.map(r=>CATALOG.pieceOf(r.pieceId).familyId))];s.activeSourceIds=[...new Set([...needed,...s.activeSourceIds,...s.unlockedSources])].filter(id=>s.unlockedSources.includes(id)).slice(0,2);}
function reconcileFocus(s){if(!s.orders.some(o=>o.id===s.focusedOrderId)){const order=s.orders.find(o=>matchingTiles(s,o))??s.orders.find(o=>o.origin==='story')??s.orders[0];s.focusedOrderId=order?.id??null;selectSourcesFor(s,order);}}
function issue(s,template,index,origin,version=CONTENT_VERSION){const xp=origin==='practice'||origin==='ordinary'&&levelDefinition(s).level>=enteredChapterDefinition(s).levelCap?0:template.xp;s.orders.push({id:`${s.careerId}:order:${s.nextOrderSeq++}`,slot:index,templateId:template.id,origin,storyLetterId:origin==='ordinary'?null:template.id,requirements:clone(template.requirements),xp,coins:origin==='practice'?0:template.coins,rulesVersion:RULES_VERSION,contentVersion:version});}
// Location is mutable; every other issued promise field is retained exactly.
// Only slot 0 can temporarily host a held optional letter. suspendedStory is
// its sole displaced owner, never an ID graph or a second live copy.
export const OPTIONAL_PROMISE_LIMIT=3;
const outstanding=s=>[...s.orders,...s.heldOrders,...(s.suspendedStory?[s.suspendedStory]:[])];
function restoreStory(s){if(s.suspendedStory){s.orders.push(s.suspendedStory);s.suspendedStory=null;}}
export function refill(s){
 if(s.mode==='replay'){reconcileFocus(s);return;}
 s.unlockedSources=unlockedSourceIds(s);
 const capacity=orderCapacity(s),story=chapterStories(s),allStoryComplete=story.every(o=>s.milestones.includes(o.id));
 for(let index=0;index<capacity;index++){
  if(s.orders.some(o=>o.slot===index))continue;
  if(index<2&&!allStoryComplete){const next=story.find(t=>!s.milestones.includes(t.id)&&!outstanding(s).some(o=>o.storyLetterId===t.id)&&storyEligible(s,t));if(next)issue(s,next,index,'story');continue;}
  // A completed chapter offers its real transition, rather than filling the
  // principal slots with optional work which hides the next authored chapter.
  if(index<2&&canStartNextChapter(s))continue;
  if(outstanding(s).filter(o=>o.origin==='ordinary').length>=OPTIONAL_PROMISE_LIMIT)continue;
  const ordinary=ordinaryTemplatesFor(s);
  for(let attempt=0;attempt<ordinary.length;attempt++){
   const template=ordinary[s.ordinaryChapterCursors[s.chapterId]%ordinary.length];s.ordinaryChapterCursors[s.chapterId]=(s.ordinaryChapterCursors[s.chapterId]+1)%ordinary.length;
   if(s.enteredChapters.includes(template.chapterId)&&eligible(s,template.requirements)&&!outstanding(s).some(o=>recipeKey(o.requirements)===recipeKey(template.requirements))){issue(s,template,index,'ordinary');break;}
  }
 }
 s.orders.sort((a,b)=>a.slot-b.slot);reconcileFocus(s);
}
export function newCareerId(){if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();if(typeof globalThis.crypto?.getRandomValues==='function')return [...globalThis.crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16).padStart(8,'0')).join('-');return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}
export function createCareer(careerId=newCareerId()){
 assert(typeof careerId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(careerId),'Invalid career ID');
 const s={schemaVersion:SCHEMA_VERSION,rulesVersion:RULES_VERSION,contentVersion:CONTENT_VERSION,mode:'career',careerId,chapterId:CHAPTER.id,enteredChapters:[CHAPTER.id],chapterEntryVersions:{[CHAPTER.id]:CONTENT_VERSION},continuationEntries:{},unlockedSources:[...STARTER_FAMILY_IDS],activeSourceIds:[...STARTER_FAMILY_IDS],focusedOrderId:null,revision:0,nextTileSeq:1,nextOrderSeq:1,board:Array(25).fill(null),sources:Object.fromEntries(FAMILIES.map(f=>[f.id,{sorter:0,cursor:0}])),upgrades:Object.fromEntries(UPGRADES.map(u=>[u.id,0])),purchases:{},orders:[],heldOrders:[],suspendedStory:null,resumedOptionalId:null,xp:0,coinsEarned:0,coinsSpent:0,milestones:[],storyCompletions:{},ordinaryCursor:0,ordinaryChapterCursors:Object.fromEntries(CHAPTERS.map(c=>[c.id,0])),discoveries:[],material:Object.fromEntries(FAMILIES.map(f=>[f.id,{initial:STARTER_FAMILY_IDS.includes(f.id)?4:0,generated:0,delivered:0,recycled:0}])),receipts:[],history:[],sound:false,largeText:false};
 STARTER_FAMILY_IDS.forEach((id,fi)=>{for(let i=0;i<4;i++)s.board[fi*5+i]=allocateTile(s,familyOf(id).starterId);});refill(s);discover(s);validateCareer(s);return s;
}
export function createReplay(storyLetterId,careerId=newCareerId(),contentVersion=CONTENT_VERSION){
 const template=orderTemplate(storyLetterId,contentVersion,'story'),chapterId=contentPack(contentVersion)?.chapters.find(c=>c.storyIds.includes(storyLetterId))?.id;assert(integer(contentVersion,1,CONTENT_VERSION)&&template&&chapterId,'Unknown letter version');
 const s=createCareer(careerId);s.mode='replay';s.chapterId=chapterId;s.enteredChapters=CHAPTERS.slice(0,CHAPTERS.findIndex(c=>c.id===chapterId)+1).map(c=>c.id);s.chapterEntryVersions=Object.fromEntries(s.enteredChapters.map(id=>[id,contentVersion]));s.unlockedSources=unlockedSourceIds(s);s.orders=[];s.focusedOrderId=null;s.history=[];s.replayLetterId=storyLetterId;s.replayContentVersion=contentVersion;
 // An isolated replay starts with the letter's own families, not unrelated
 // Garden leftovers. These grants never enter the persistent career namespace.
 s.board=Array(25).fill(null);s.discoveries=[];s.nextTileSeq=1;
 for(const f of FAMILIES)s.material[f.id]={initial:initialMaterialFor(s,f.id),generated:0,delivered:0,recycled:0};
 [...new Set(template.requirements.map(r=>CATALOG.pieceOf(r.pieceId).familyId))].forEach((id,fi)=>{for(let i=0;i<4;i++)s.board[fi*5+i]=allocateTile(s,familyOf(id).starterId);});
 issue(s,template,0,'practice',contentVersion);reconcileFocus(s);discover(s);validateCareer(s);return s;
}
// Migration consumes caller-supplied bytes only. It never reads the old gameplay
// namespace. Legacy rewards/recipes/prices remain bound to immutable content v1.
export function upgradeCareer(input){
 // Same-schema packs are validated before append-only extension, too.
 let old;
 if(input?.schemaVersion===SCHEMA_VERSION){old=clone(input);validateCareer(old);if(old.contentVersion===CONTENT_VERSION)return old;}
 else old=upgradeV4(input); // Frozen old-schema reader runs before new fields exist.
 assert(old.mode==='career','Practice cannot become a saved campaign');
 const s=clone(old),oldUnlocked=[...old.unlockedSources];
 s.schemaVersion=SCHEMA_VERSION;s.contentVersion=CONTENT_VERSION;
 if(!Object.hasOwn(s,'continuationEntries'))s.continuationEntries={};
 // Keep the historical global cursor and seed the new current-chapter cycle at
 // its next matching template. All later chapter cursors begin dormant at zero.
 if(!s.ordinaryChapterCursors){s.ordinaryChapterCursors=Object.fromEntries(CHAPTERS.map(c=>[c.id,0]));
  const previous=contentPack(old).ordinary;const local=ordinaryTemplatesFor(old);
  for(let i=0;i<previous.length;i++){const next=previous[(old.ordinaryCursor+i)%previous.length];const at=local.indexOf(next);if(at>=0){s.ordinaryChapterCursors[old.chapterId]=at;break;}}
 }else for(const chapter of CHAPTERS)if(!Object.hasOwn(s.ordinaryChapterCursors,chapter.id))s.ordinaryChapterCursors[chapter.id]=0;
 if(!Object.hasOwn(s,'heldOrders')){s.heldOrders=[];s.suspendedStory=null;s.resumedOptionalId=null;}
 if(input.schemaVersion===1)s.orders=s.orders.map((o,i)=>({...o,rulesVersion:input.orders[i].rulesVersion}));
 for(const u of UPGRADES)if(!(u.id in s.upgrades))s.upgrades[u.id]=0;
 for(const part of [s,...s.history])for(const f of FAMILIES){
  if(!part.sources[f.id])part.sources[f.id]={sorter:0,cursor:0};
  if(!part.material[f.id])part.material[f.id]={initial:0,generated:0,delivered:0,recycled:0};
 }
 s.unlockedSources=unlockedSourceIds(s);assert(same(s.unlockedSources,oldUnlocked),'Migration changed source access');
 validateCareer(s);return s;
}
function issuedOrderEligible(s,order){
 const pack=contentPack(order.contentVersion);
 if(!pack)return false;
 // Eligibility is an issuance promise. A later table must not retrospectively
 // lower the tier ceiling of an already issued order. XP never moves backward.
 const chapter=pack.chapters.find(c=>c.id===s.chapterId)??pack.chapters.at(-1);
 return eligible({...s,contentVersion:order.contentVersion,chapterId:chapter.id,enteredChapters:[chapter.id],chapterEntryVersions:{[chapter.id]:order.contentVersion}},order.requirements);
}
function validateBoard(board,s){assert(Array.isArray(board)&&board.length===25,'Invalid board');const ids=new Set;for(const t of board){if(t===null)continue;const piece=CATALOG.pieceOf(t.pieceId);assert(exactKeys(t,['id','pieceId'])&&piece&&s.unlockedSources.includes(piece.familyId),'Unknown or locked tile');const prefix=`${s.careerId}:tile:`,n=Number(t.id?.slice(prefix.length));assert(typeof t.id==='string'&&t.id===`${prefix}${n}`&&integer(n,1)&&n<s.nextTileSeq&&!ids.has(t.id),'Duplicate or invalid tile sequence');ids.add(t.id);}}
function validateReversible(part,s){validateBoard(part.board,s);assert(exactKeys(part.sources,contentPack(s).familyIds)&&exactKeys(part.material,contentPack(s).familyIds),'Unknown source or material family');for(const f of contentPack(s).familyIds.map(familyOf)){const source=part.sources[f.id],m=part.material[f.id];assert(exactKeys(source,['sorter','cursor'])&&integer(source.sorter,0,1)&&integer(source.cursor,0,2),'Invalid source');assert(source.sorter===(s.upgrades[`${f.id}-sorter`]??0)&&(source.sorter||source.cursor===0),'Invalid sorter cursor');assert(exactKeys(m,['initial','generated','delivered','recycled'])&&Object.values(m).every(n=>integer(n))&&m.initial===initialMaterialFor(s,f.id),'Invalid material');if(!s.unlockedSources.includes(f.id))assert(source.sorter===0&&Object.values(m).every(n=>n===0),'Locked source has material');const live=part.board.reduce((n,t)=>n+(CATALOG.pieceOf(t?.pieceId)?.familyId===f.id?CATALOG.pieceOf(t.pieceId).mass:0),0);assert(Number.isSafeInteger(m.initial+m.generated)&&m.initial+m.generated===live+m.delivered+m.recycled,'Material is not conserved');if(part!==s)assert(m.delivered===s.material[f.id].delivered,'History crosses delivery');}}
export function validateCareer(s){
 assert(s&&typeof s==='object'&&s.schemaVersion===SCHEMA_VERSION&&s.rulesVersion===RULES_VERSION&&integer(s.contentVersion,1,CONTENT_VERSION)&&contentPack(s),'Unsupported campaign version');
 assert(typeof s.careerId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(s.careerId)&&['career','replay'].includes(s.mode)&&chapterDefinition(s),'Invalid career identity');
 for(const key of ['revision','nextTileSeq','nextOrderSeq','xp','coinsEarned','coinsSpent'])assert(integer(s[key],['nextTileSeq','nextOrderSeq'].includes(key)?1:0),`Invalid ${key}`);
 assert(s.coinsSpent<=s.coinsEarned&&typeof s.sound==='boolean'&&typeof s.largeText==='boolean','Invalid balance or setting');
 assert(Array.isArray(s.enteredChapters)&&same(s.enteredChapters,contentPack(s).chapters.slice(0,contentPack(s).chapters.findIndex(c=>c.id===s.chapterId)+1).map(c=>c.id)),'Invalid chapter sequence');
 assert(exactKeys(s.chapterEntryVersions,s.enteredChapters)&&Object.entries(s.chapterEntryVersions).every(([id,v])=>integer(v,1,s.contentVersion)&&contentPack(v)?.chapters.some(c=>c.id===id)),'Invalid chapter entry versions');
 if(s.mode==='career')for(let i=1;i<s.enteredChapters.length;i++)assert(chapterComplete(s,s.enteredChapters[i-1],s.chapterEntryVersions[s.enteredChapters[i-1]]),'Chapter entry prerequisites missing');
 const enteredContinuation=s.mode==='career'&&continuationEntered(s);
 assert(exactKeys(s.continuationEntries,enteredContinuation?[CONTINUATION.id]:[]),'Invalid explicit continuation entries');
 if(enteredContinuation){const entry=s.continuationEntries[CONTINUATION.id];assert(exactKeys(entry,['revision','contentVersion'])&&integer(entry.revision,1,s.revision)&&entry.contentVersion===5&&originalVolumeComplete(s)&&s.xp>=CONTINUATION.minimumXP,'Invalid continuation entry contract');}
 const unlocked=unlockedSourceIds(s);assert(same(s.unlockedSources,unlocked),'Invalid source unlocks');
 assert(Array.isArray(s.activeSourceIds)&&s.activeSourceIds.length===2&&new Set(s.activeSourceIds).size===2&&s.activeSourceIds.every(id=>s.unlockedSources.includes(id)),'Invalid active sources');
 assert(exactKeys(s.upgrades,contentPack(s).upgrades.map(u=>u.id))&&contentPack(s).upgrades.every(u=>integer(s.upgrades[u.id],0,1)),'Unknown upgrades');
 assert(exactKeys(s.purchases,contentPack(s).upgrades.filter(u=>s.upgrades[u.id]).map(u=>u.id)),'Invalid purchase ledger');let paid=0;for(const [id,p] of Object.entries(s.purchases)){const definition=upgradeDefinition(id,p.contentVersion);assert(exactKeys(p,['price','contentVersion'])&&integer(p.contentVersion,1,s.contentVersion)&&definition&&p.price===definition.price&&integer(p.price),'Invalid paid upgrade price');paid+=p.price;}
 assert(s.coinsSpent===paid,'Upgrade spending mismatch');assert(contentPack(s).upgrades.every(u=>!s.upgrades[u.id]||(!u.familyId||s.unlockedSources.includes(u.familyId))),'Owned upgrade source missing'); // Current levels/prices cannot revoke a historical paid purchase.
 validateReversible(s,s);
 assert(Array.isArray(s.discoveries)&&new Set(s.discoveries).size===s.discoveries.length&&s.discoveries.every(id=>CATALOG.pieceOf(id)&&s.unlockedSources.includes(CATALOG.pieceOf(id).familyId))&&s.board.every(t=>!t||s.discoveries.includes(t.pieceId)),'Invalid discoveries');
 assert(Array.isArray(s.milestones)&&new Set(s.milestones).size===s.milestones.length&&s.milestones.every(id=>contentPack(s).story.some(t=>t.id===id&&s.enteredChapters.includes(t.chapterId??CHAPTER.id))),'Invalid story milestones');
 assert(exactKeys(s.storyCompletions,s.milestones)&&Object.entries(s.storyCompletions).every(([id,record])=>exactKeys(record,['contentVersion'])&&integer(record.contentVersion,1,s.contentVersion)&&!!orderTemplate(id,record.contentVersion,'story')),'Invalid completed-letter provenance');
 assert(integer(s.ordinaryCursor,0,contentPack(s).ordinary.length-1),'Invalid ordinary cursor');
 assert(exactKeys(s.ordinaryChapterCursors,contentPack(s).chapters.map(c=>c.id)),'Invalid chapter order cursors');
 for(const c of contentPack(s).chapters){const count=ordinaryTemplatesFor(s,c.id).length;assert(integer(s.ordinaryChapterCursors[c.id],0,Math.max(0,count-1)),'Invalid chapter order cursor');}assert(Array.isArray(s.orders)&&s.orders.length<=orderCapacity(s),'Invalid order capacity');
 assert(Array.isArray(s.heldOrders)&&s.heldOrders.length<=OPTIONAL_PROMISE_LIMIT&&s.heldOrders.every(o=>o?.origin==='ordinary'),'Invalid held letters');
 assert(s.suspendedStory===null||s.suspendedStory?.origin==='story'&&s.suspendedStory.slot===0,'Invalid displaced story');
 assert(s.resumedOptionalId===null||s.orders.some(o=>o.id===s.resumedOptionalId&&o.origin==='ordinary'&&o.slot===0),'Invalid resumed letter');
 assert(!s.suspendedStory||s.resumedOptionalId!==null,'Dangling displaced story');
 if(s.mode==='replay')assert(!s.heldOrders.length&&!s.suspendedStory&&!s.resumedOptionalId,'Practice cannot hold promises');
 assert(outstanding(s).filter(o=>o.origin==='ordinary').length<=OPTIONAL_PROMISE_LIMIT,'Too many optional promises');
 const orderIds=new Set,orderSlots=new Set,storyIds=new Set;
 for(const o of outstanding(s)){const prefix=`${s.careerId}:order:`,n=Number(o?.id?.slice(prefix.length));assert(typeof o?.id==='string'&&o.id===`${prefix}${n}`&&integer(n,1)&&n<s.nextOrderSeq&&!orderIds.has(o.id),'Invalid order identity');orderIds.add(o.id);assert(integer(o.slot,0,orderCapacity(s)-1),'Invalid promise slot');if(s.orders.includes(o)){assert(!orderSlots.has(o.slot),'Invalid order slot');orderSlots.add(o.slot);}assert((o.rulesVersion===RULES_VERSION||o.rulesVersion===1&&o.contentVersion===1)&&integer(o.contentVersion,1,s.contentVersion)&&['story','ordinary','practice'].includes(o.origin),'Invalid order origin');const template=orderTemplate(o.templateId,o.contentVersion,o.origin);assert(template&&same(o.requirements,template.requirements)&&issuedOrderEligible(s,o),'Invalid pinned order recipe');
  if(o.origin==='ordinary')assert(o.storyLetterId===null&&o.coins===template.coins&&(o.xp===template.xp||o.xp===0),'Invalid ordinary reward');else{assert(o.storyLetterId===template.id&&!s.milestones.includes(template.id)&&!storyIds.has(template.id),'Completed or duplicated story');storyIds.add(template.id);assert(o.xp===(o.origin==='practice'?0:template.xp)&&o.coins===(o.origin==='practice'?0:template.coins),'Invalid pinned story reward');}assert((s.mode==='replay')===(o.origin==='practice'),'Practice cannot enter career');if(s.mode==='replay')assert(o.storyLetterId===s.replayLetterId&&o.contentVersion===s.replayContentVersion,'Wrong practice letter version');}
 assert(s.focusedOrderId===null?s.orders.length===0:s.orders.some(o=>o.id===s.focusedOrderId),'Invalid focused order');
 if(s.mode==='replay')assert(s.xp===0&&s.coinsEarned===0&&s.coinsSpent===0&&s.milestones.length===0&&integer(s.replayContentVersion,1,s.contentVersion)&&!!orderTemplate(s.replayLetterId,s.replayContentVersion,'story'),'Replay cannot reward');
 assert(Array.isArray(s.history)&&s.history.length<=HISTORY_LIMIT,'Invalid history');s.history.forEach(h=>{assert(['move','merge','cut','recycle','supply'].includes(h.label),'Invalid history label');validateReversible(h,s);});
 assert(Array.isArray(s.receipts)&&s.receipts.length<=RECEIPT_LIMIT,'Invalid receipts');const receiptIds=new Set;let receiptRevision=0;
 for(const r of s.receipts){assert(r&&['delivery','purchase','practice'].includes(r.type)&&integer(r.revision,1,s.revision)&&r.revision>receiptRevision&&typeof r.id==='string'&&!receiptIds.has(r.id)&&integer(r.xp)&&integer(r.coins)&&integer(r.contentVersion,1,s.contentVersion),'Invalid receipt identity');receiptRevision=r.revision;receiptIds.add(r.id);
  if(r.type==='purchase'){const upgrade=upgradeDefinition(r.id,r.contentVersion);assert(s.mode==='career'&&upgrade&&s.upgrades[r.id]===1&&r.xp===0&&r.coins===s.purchases[r.id].price&&r.contentVersion===s.purchases[r.id].contentVersion,'Invalid purchase receipt');}
  else{const prefix=`${s.careerId}:order:`,n=Number(r.id.slice(prefix.length));assert(r.id===`${prefix}${n}`&&integer(n,1)&&n<s.nextOrderSeq&&!orderIds.has(r.id),'Invalid delivery receipt identity');const isStory=r.storyLetterId!==null,template=orderTemplate(r.templateId,r.contentVersion,isStory?'story':'ordinary');assert(template&&(!isStory||r.storyLetterId===template.id),'Unknown receipt template or letter');if(r.type==='practice')assert(s.mode==='replay'&&isStory&&r.storyLetterId===s.replayLetterId&&r.contentVersion===s.replayContentVersion&&r.xp===0&&r.coins===0,'Invalid practice receipt');else{assert(s.mode==='career'&&r.coins===template.coins&&(r.xp===template.xp||!isStory&&r.xp===0),'Invalid delivery receipt rewards');if(isStory)assert(s.milestones.includes(r.storyLetterId)&&s.storyCompletions[r.storyLetterId].contentVersion===r.contentVersion,'Uncompleted or mismatched story receipt');}}
 }
 return true;
}
function snapshot(s,label){return {label,board:clone(s.board),sources:clone(s.sources),material:clone(s.material)};}
function pushHistory(s,original,label){s.history.push(snapshot(original,label));s.history=s.history.slice(-HISTORY_LIMIT);}
function receipt(s,r){s.receipts.push({...r,revision:s.revision});s.receipts=s.receipts.slice(-RECEIPT_LIMIT);}
export function matchingTiles(s,order){if(!order)return null;const used=new Set,ids=[];for(const requirement of order.requirements){const candidates=s.board.filter(t=>t?.pieceId===requirement.pieceId&&!used.has(t.id));if(candidates.length<requirement.quantity)return null;for(const t of candidates.slice(0,requirement.quantity)){used.add(t.id);ids.push(t.id);}}return ids;}
export function compatiblePairs(s){const pairs=[];s.board.forEach((tile,from)=>{if(!tile||!CATALOG.nextPiece(tile.pieceId))return;s.board.forEach((other,to)=>{if(to>from&&tile.pieceId===other?.pieceId)pairs.push([from,to]);});});return pairs;}
export function goalHint(s,orderId=s.focusedOrderId){
 const order=s.orders.find(o=>o.id===orderId)??s.orders[0];
 if(!order){
  if(s.mode==='replay')return {kind:'practice-complete',message:'This practice letter is complete. Return to your career whenever you are ready; its progress is unchanged.'};
  if(canStartNextChapter(s))return {kind:'chapter',message:`${chapterDefinition(s).title} is complete. Open ${chapterDefinition(s).nextTitle} when you are ready.`};
  if(campaignComplete(s))return {kind:'complete',message:'The campaign is complete. Keep exploring your collection at your own pace.'};
  return {kind:'unavailable',message:'No eligible request is available right now. Your saved progress is intact; check your correspondence for unfinished goals.'};
 }
 if(matchingTiles(s,order))return {kind:'send',orderId:order.id,message:s.mode==='replay'?'Your practice letter is ready. Send it to finish with 0 XP and 0 coins.':'Your chosen request is ready. Send it to earn its displayed rewards.'};
 const reserved=new Set,missing=[];for(const r of order.requirements){const owned=s.board.filter(t=>t?.pieceId===r.pieceId&&!reserved.has(t.id));owned.slice(0,r.quantity).forEach(t=>reserved.add(t.id));if(owned.length<r.quantity)missing.push(CATALOG.pieceOf(r.pieceId));}
 const pairs=compatiblePairs(s).filter(([a,b])=>!reserved.has(s.board[a].id)&&!reserved.has(s.board[b].id));
 for(const target of missing){const pair=pairs.find(([a])=>{const p=CATALOG.pieceOf(s.board[a].pieceId);return p.familyId===target.familyId&&p.tier<target.tier;});if(pair)return {kind:'merge',pair,orderId:order.id,message:`Match the highlighted ${CATALOG.pieceOf(s.board[pair[0]].pieceId).shortName} pair toward ${target.name}.`};}
 if(!s.board.includes(null)){const pair=pairs[0];return pair?{kind:'merge',pair,orderId:order.id,message:'This pair frees a space. Your ready request pieces stay protected.'}:{kind:'recover',orderId:order.id,message:'Your table is full. Recycle a piece to free a space; Undo can restore it.'};}
 for(const target of missing){const at=s.board.findIndex(t=>t&&!reserved.has(t.id)&&CATALOG.pieceOf(t.pieceId).familyId===target.familyId&&CATALOG.pieceOf(t.pieceId).tier>target.tier);if(at>=0)return {kind:'cut',at,orderId:order.id,message:`Cut ${CATALOG.pieceOf(s.board[at].pieceId).name} to work back toward ${target.name}.`};}
 const target=missing[0];return {kind:'supply',familyId:target.familyId,orderId:order.id,message:`Add a free ${familyOf(target.familyId).shortName} piece to work toward ${target.name}. Supplies never run out.`};
}
const fail=(state,code,message)=>({ok:false,state,code,message});
function enterChapter(s,next){
 assert(next&&s.xp>=(next.entryXP??0),'Reach the chapter entry milestone first');assert(!s.enteredChapters.includes(next.id),'This chapter is already open');assert(!s.suspendedStory,'Return to your story before chapter entry');
 s.resumedOptionalId=null;s.heldOrders.push(...s.orders.filter(o=>o.origin==='ordinary'&&o.slot<2));s.orders=s.orders.filter(o=>o.slot>=2);s.focusedOrderId=null;s.chapterId=next.id;s.enteredChapters.push(next.id);s.chapterEntryVersions[next.id]=CONTENT_VERSION;s.unlockedSources=unlockedSourceIds(s);s.activeSourceIds=[...new Set([...next.entrySources,...s.activeSourceIds])].slice(0,2);s.history=[];refill(s);const opening=s.orders.find(o=>o.origin==='story');s.focusedOrderId=opening?.id??s.orders[0]?.id??null;selectSourcesFor(s,opening);
}
export function reduceCareer(state,action){
 try{validateCareer(state);}catch(error){return fail(state,'invalid-state',error.message);}
 if(state.contentVersion!==CONTENT_VERSION)return fail(state,'content-update','Reopen this saved campaign to apply the compatible content update.');
 if(!action||action.expectedRevision!==state.revision||action.careerId!==state.careerId)return fail(state,'stale','The board changed. Review it and try again.');
 const s=clone(state);s.revision++;
 try{switch(action.type){
  case 'supply':{const family=familyOf(action.familyId);assert(family&&s.unlockedSources.includes(family.id),'This source is not unlocked yet');const index=action.to==null?s.board.indexOf(null):action.to;assert(slot(index)&&s.board[index]===null,'The board is full or that space is occupied. Merge or Recycle to make room.');const piece=nextOutput(s,family.id,Boolean(action.basic));s.board[index]=allocateTile(s,piece.id);s.material[family.id].generated+=piece.mass;if(!action.basic&&s.sources[family.id].sorter)s.sources[family.id].cursor=(s.sources[family.id].cursor+1)%3;pushHistory(s,state,'supply');break;}
  case 'move':{const {from,to}=action;assert(slot(from)&&slot(to)&&from!==to&&s.board[from],'Choose a piece and another space');const tile=s.board[from],destination=s.board[to];assert(action.tileId===tile.id&&(action.targetTileId??null)===(destination?.id??null),'The selected pieces changed');if(!destination){s.board[to]=tile;s.board[from]=null;pushHistory(s,state,'move');}else{assert(tile.pieceId===destination.pieceId,'Match two identical pictures from the same family and level.');const next=CATALOG.nextPiece(tile.pieceId);assert(next,'This picture is complete. Send it, keep it, Cut or Recycle it.');s.board[to]=allocateTile(s,next.id);s.board[from]=null;pushHistory(s,state,'merge');}break;}
  case 'cut':{const tile=s.board[action.at];assert(slot(action.at)&&tile?.id===action.tileId,'Select a piece to Cut');const previous=CATALOG.previousPiece(tile.pieceId),empty=s.board.indexOf(null);assert(previous,'Level 1 is already a single scrap');assert(empty!==-1,'Cut needs one empty space. Recycle a piece to make room.');s.board[action.at]=allocateTile(s,previous.id);s.board[empty]=allocateTile(s,previous.id);pushHistory(s,state,'cut');break;}
  case 'recycle':{const tile=s.board[action.at];assert(slot(action.at)&&tile?.id===action.tileId,'Select a piece to Recycle');const piece=CATALOG.pieceOf(tile.pieceId);assert(piece.tier<3||action.confirmed===true,'Confirm recycling this valuable picture');s.material[piece.familyId].recycled+=piece.mass;s.board[action.at]=null;pushHistory(s,state,'recycle');break;}
  case 'undo':{const previous=s.history.pop();assert(previous,'Nothing to Undo. A completed order, purchase or chapter entry begins a new page.');s.board=previous.board;s.sources=previous.sources;s.material=previous.material;break;}
  case 'complete':{const order=s.orders.find(o=>o.id===action.orderId);assert(order,'That order is no longer active');assert(Array.isArray(action.tileIds)&&new Set(action.tileIds).size===action.tileIds.length&&action.tileIds.length===order.requirements.reduce((n,r)=>n+r.quantity,0),'Choose each requested piece exactly once');const tiles=action.tileIds.map(id=>s.board.find(t=>t?.id===id));assert(tiles.every(Boolean),'The requested pieces are no longer here');assert(recipeKey(tiles.map(t=>({pieceId:t.pieceId,quantity:1})))===recipeKey(order.requirements),'These pieces do not match the order');if(order.origin==='story')assert(!s.milestones.includes(order.storyLetterId),'This letter has already been completed');const ids=new Set(action.tileIds);s.board=s.board.map(t=>{if(!t||!ids.has(t.id))return t;const p=CATALOG.pieceOf(t.pieceId);s.material[p.familyId].delivered+=p.mass;return null;});s.xp+=order.xp;s.coinsEarned+=order.coins;if(order.origin==='story'){s.milestones.push(order.storyLetterId);s.storyCompletions[order.storyLetterId]={contentVersion:order.contentVersion};}s.orders=s.orders.filter(o=>o.id!==order.id);if(order.id===s.resumedOptionalId){s.resumedOptionalId=null;restoreStory(s);}s.history=[];receipt(s,{id:order.id,type:order.origin==='practice'?'practice':'delivery',storyLetterId:order.storyLetterId,templateId:order.templateId,xp:order.xp,coins:order.coins,contentVersion:order.contentVersion});refill(s);break;}
  case 'purchase':{const upgrade=UPGRADES.find(u=>u.id===action.upgradeId);assert(upgrade,'Unknown upgrade');assert(s.mode==='career'&&action.expectedLevel===0&&s.upgrades[upgrade.id]===0,'This upgrade is already owned or unavailable');assert(availableUpgrades(s).some(u=>u.id===upgrade.id),'Open this chapter and source first');assert(levelDefinition(s).level>=upgrade.level,`Unlocks at player level ${upgrade.level}`);assert(coinBalance(s)>=upgrade.price,'Complete more orders to earn the coins for this upgrade');s.coinsSpent+=upgrade.price;s.upgrades[upgrade.id]=1;s.purchases[upgrade.id]={price:upgrade.price,contentVersion:CONTENT_VERSION};if(upgrade.familyId)s.sources[upgrade.familyId]={sorter:1,cursor:0};s.history=[];receipt(s,{id:upgrade.id,type:'purchase',xp:0,coins:upgrade.price,contentVersion:CONTENT_VERSION});if(upgrade.id==='order-desk')refill(s);break;}
  case 'resume-optional':{
   assert(s.mode==='career','Practice cannot resume saved letters');
   const chosen=s.heldOrders.find(o=>o.id===action.orderId);assert(chosen,'That optional letter is no longer held');
   s.heldOrders=s.heldOrders.filter(o=>o.id!==chosen.id);
   const displaced=s.orders.find(o=>o.slot===0);
   if(displaced){s.orders=s.orders.filter(o=>o.id!==displaced.id);if(displaced.origin==='ordinary')s.heldOrders.push(displaced);else{assert(!s.suspendedStory,'A story is already preserved');s.suspendedStory=displaced;}}
   s.orders.push({...chosen,slot:0});s.orders.sort((a,b)=>a.slot-b.slot);s.resumedOptionalId=chosen.id;s.focusedOrderId=chosen.id;selectSourcesFor(s,chosen);break;
  }
  case 'return-to-story':{
   assert(s.resumedOptionalId!==null,'You are already at your story');
   const optional=s.orders.find(o=>o.id===s.resumedOptionalId);s.orders=s.orders.filter(o=>o.id!==optional.id);s.heldOrders.push(optional);s.resumedOptionalId=null;
   const restored=s.suspendedStory;restoreStory(s);refill(s);const goal=restored??s.orders.find(o=>o.origin==='story')??s.orders[0];s.focusedOrderId=goal?.id??null;selectSourcesFor(s,goal);break;
  }
  case 'focus-order':{const order=s.orders.find(o=>o.id===action.orderId);assert(order,'Choose an active request');s.focusedOrderId=order.id;selectSourcesFor(s,order);break;}
  case 'select-source':{assert(integer(action.sourceSlot,0,1)&&s.unlockedSources.includes(action.familyId),'Choose an unlocked source');const other=1-action.sourceSlot;if(s.activeSourceIds[other]===action.familyId)[s.activeSourceIds[other],s.activeSourceIds[action.sourceSlot]]=[s.activeSourceIds[action.sourceSlot],s.activeSourceIds[other]];else s.activeSourceIds[action.sourceSlot]=action.familyId;break;}
  case 'enter-continuation':{assert(action.boundaryId===CONTINUATION.id,'The continuation changed');assert(canEnterContinuation(s),'Complete the first correspondence and return to your story before opening this continuation');assert(!s.continuationEntries[CONTINUATION.id],'This continuation is already open');s.continuationEntries[CONTINUATION.id]={revision:s.revision,contentVersion:CONTENT_VERSION};enterChapter(s,CHAPTERS.find(c=>c.id===CONTINUATION.toChapterId));break;}
  case 'start-next-chapter':{assert(canStartNextChapter(s),'Finish this chapter before opening the next');const next=CHAPTERS.find(c=>c.id===chapterDefinition(s).nextId);assert(action.chapterId===next.id,'The next chapter changed');enterChapter(s,next);break;}
  case 'large-text':assert(typeof action.enabled==='boolean','Invalid text-size choice');s.largeText=action.enabled;break;
  case 'sound':assert(typeof action.enabled==='boolean','Invalid sound choice');s.sound=action.enabled;break;
  default:return fail(state,'unknown-action','Unknown action');
 }discover(s);validateCareer(s);return {ok:true,state:s,code:'applied',action:action.type};}catch(error){return fail(state,'invalid-action',error.message);}
}
export function commandFor(state,action){return {...action,careerId:state.careerId,expectedRevision:state.revision};}
