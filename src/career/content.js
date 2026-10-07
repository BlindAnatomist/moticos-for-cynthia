// Campaign content is distinct from artwork catalogs. Existing issued promises
// retain an immutable content version; catalog growth never grants stock/unlocks.
import { getEnvelope } from '../matching/cohesion/registry.js';
import * as V1 from './content.v1.js';
import { LETTER_COPY, CHAPTER_COPY } from './correspondence.js';
export { DISCOVERY_CAPTIONS, CHAPTER_COPY, POSTCARD_POSTSCRIPTS } from './correspondence.js';
export const SCHEMA_VERSION = 2;
export const RULES_VERSION = 2;
export const CONTENT_VERSION = 2;
export const STORAGE_KEY = 'moticos.campaign.private.v2';
export const LOCK_NAME = `${STORAGE_KEY}.writer`;
const catalogs = ['matching-garden', 'moonlit-passage'].map(id => getEnvelope(id).catalog);
export const FAMILIES = Object.freeze(catalogs.flatMap(c => c.FAMILIES));
const pieces = Object.freeze(catalogs.flatMap(c => c.PIECES));
const pieceMap = Object.freeze(Object.fromEntries(pieces.map(p => [p.id, p])));
const pieceOf = id => typeof id === 'string' && Object.hasOwn(pieceMap, id) ? pieceMap[id] : null;
const neighbor = (id, delta) => { const p = pieceOf(id), f = FAMILIES.find(f => f.id === p?.familyId); return pieceOf(f?.pieceIds[p.tier - 1 + delta]); };
export const CATALOG = Object.freeze({ PIECES: pieces, CATALOG: pieceMap, FAMILIES, pieceOf, nextPiece: id => neighbor(id, 1), previousPiece: id => neighbor(id, -1) });
export const STARTER_FAMILY_IDS = Object.freeze(['bird', 'fern']);
export const LEVELS = Object.freeze([
  { level: 1, xp: 0, targetCeiling: 3, slots: 1 },
  { level: 2, xp: 80, targetCeiling: 4, slots: 2 },
  { level: 3, xp: 250, targetCeiling: 5, slots: 2 },
  { level: 4, xp: 500, targetCeiling: 5, slots: 2 },
  { level: 5, xp: 650, targetCeiling: 5, slots: 2 },
  { level: 6, xp: 1000, targetCeiling: 5, slots: 2 },
].map(Object.freeze));
export const REWARDS = Object.freeze({ 2: { xp: 10, coins: 5 }, 3: { xp: 25, coins: 10 }, 4: { xp: 60, coins: 25 }, 5: { xp: 140, coins: 60 } });
export function target(familyId, tier, quantity = 1) { const f = FAMILIES.find(f => f.id === familyId), p = pieceOf(f?.pieceIds[tier - 1]); if (!p || !REWARDS[tier]) throw Error('Unknown authored target'); return Object.freeze({ pieceId: p.id, quantity }); }
export function rewardsFor(requirements) { return requirements.reduce((n, r) => ({ xp: n.xp + REWARDS[pieceOf(r.pieceId).tier].xp * r.quantity, coins: n.coins + REWARDS[pieceOf(r.pieceId).tier].coins * r.quantity }), { xp: 0, coins: 0 }); }
const a=t=>target('bird',t), b=t=>target('fern',t), k=t=>target('key',t), m=t=>target('moon',t);
const gardenRecipes = [[a(2)],[b(2)],[a(3)],[a(2),b(3)],[a(4)],[b(3)],[a(3),b(4)],[a(4),b(4)],[a(5)]];
const copyFor=id=>{const copy=LETTER_COPY[id];if(!copy?.title||!copy?.letter||!copy?.goal)throw Error(`Missing authored correspondence: ${id}`);return copy;};
const garden = gardenRecipes.map((requirements,i) => Object.freeze({ id:`garden-letter-${i+1}`, chapterId:'garden-correspondence', requirements:Object.freeze(requirements), ...rewardsFor(requirements), ...copyFor(`garden-letter-${i+1}`) }));
const nightRecipes = [[k(2),a(2)],[k(3),b(3)],[m(2)],[k(4)],[m(3),k(3)],[m(4),b(4)],[k(5),m(4)]];
const night = nightRecipes.map((requirements,i)=>Object.freeze({id:`moon-letter-${i+1}`,chapterId:'moonlit-correspondence',requirements:Object.freeze(requirements),...rewardsFor(requirements),...copyFor(`moon-letter-${i+1}`)}));
export const STORY_ORDERS=Object.freeze([...garden,...night]);
export const CHAPTERS=Object.freeze([
 Object.freeze({id:'garden-correspondence',number:1,title:'Garden Correspondence',minimumLevel:4,levelCap:4,storyIds:Object.freeze(garden.map(o=>o.id)),entrySources:Object.freeze(['bird','fern']),nextId:'moonlit-correspondence',nextTitle:'Moonlit Correspondence',nextPreview:CHAPTER_COPY['garden-correspondence'].nextPreview}),
 Object.freeze({id:'moonlit-correspondence',number:2,title:'Moonlit Correspondence',minimumLevel:6,levelCap:6,storyIds:Object.freeze(night.map(o=>o.id)),entrySources:Object.freeze(['key']),nextId:null,nextTitle:'The next correspondence',nextPreview:'These two chapters test the foundation. Further full-game chapters are not yet authored.'}),
]);
export const CHAPTER=CHAPTERS[0]; // compatibility alias; presentation uses chapterDefinition(state).
export const ORDINARY_ORDERS=Object.freeze([
 ...V1.ORDINARY_ORDERS.map(o=>Object.freeze({...o,chapterId:CHAPTER.id})),
 ...[[k(2),b(2)],[m(3)],[k(3),m(2)],[m(4)],[k(4),a(3)]].map((requirements,i)=>Object.freeze({id:`moon-repeat-${i+1}`,chapterId:CHAPTERS[1].id,title:'Another paper exchange',requirements:Object.freeze(requirements),...rewardsFor(requirements)})),
]);
export const UPGRADES=Object.freeze([
 ...V1.UPGRADES.map(u=>Object.freeze({...u,chapterId:CHAPTER.id})),
 Object.freeze({id:'key-sorter',familyId:'key',chapterId:CHAPTERS[1].id,name:'Key sorter I',level:4,price:50,description:'Key draws repeat level 1, level 1, level 2. Keep your Key pieces for longer letters with fewer draws.'}),
 Object.freeze({id:'moon-sorter',familyId:'moon',chapterId:CHAPTERS[1].id,name:'Moon sorter I',level:5,price:50,description:'Moon draws repeat level 1, level 1, level 2. Choose a second specialty, or keep saving for your order desk.'}),
]);
export const SORTER_CYCLE=Object.freeze([1,1,2]);
// These packs are append-only. A balance or catalog update adds a pack; it must
// never edit a prior pack or change an existing piece's family/tier/mass identity.
const SOURCE_RULES=Object.freeze([
 Object.freeze({id:'bird',chapterId:CHAPTER.id,milestones:Object.freeze([])}),
 Object.freeze({id:'fern',chapterId:CHAPTER.id,milestones:Object.freeze([])}),
 Object.freeze({id:'key',chapterId:CHAPTERS[1].id,milestones:Object.freeze([])}),
 Object.freeze({id:'moon',chapterId:CHAPTERS[1].id,milestones:Object.freeze(['moon-letter-1','moon-letter-2'])}),
]);
export const CONTENT_PACKS=Object.freeze({
 1:Object.freeze({story:V1.STORY_ORDERS,ordinary:V1.ORDINARY_ORDERS,upgrades:V1.UPGRADES,familyIds:Object.freeze(['bird','fern']),chapters:Object.freeze([Object.freeze({...V1.CHAPTER,number:1,levelCap:4,storyIds:Object.freeze(V1.STORY_ORDERS.map(o=>o.id)),entrySources:Object.freeze(V1.FAMILIES.map(f=>f.id)),nextId:null})]),levels:V1.LEVELS,sourceRules:Object.freeze(V1.FAMILIES.map(f=>Object.freeze({id:f.id,chapterId:V1.CHAPTER.id,milestones:Object.freeze([])})))}),
 2:Object.freeze({story:STORY_ORDERS,ordinary:ORDINARY_ORDERS,upgrades:UPGRADES,familyIds:Object.freeze(FAMILIES.map(f=>f.id)),chapters:CHAPTERS,levels:LEVELS,sourceRules:SOURCE_RULES}),
});
export function contentPack(s){return CONTENT_PACKS[typeof s==='number'?s:s.contentVersion]??null;}
export function orderTemplate(id,version=CONTENT_VERSION,origin='story'){return CONTENT_PACKS[version]?.[origin==='ordinary'?'ordinary':'story'].find(t=>t.id===id)??null;}
export function upgradeDefinition(id,version=CONTENT_VERSION){return CONTENT_PACKS[version]?.upgrades.find(u=>u.id===id)??null;}
export function chapterDefinition(s){return contentPack(s)?.chapters.find(c=>c.id===s.chapterId);}
export function enteredChapterDefinition(s,id=s.chapterId){const pack=contentPack(s.chapterEntryVersions?.[id]??s.contentVersion);return pack?.chapters.find(c=>c.id===id);}
export function chapterStories(s){const ids=enteredChapterDefinition(s)?.storyIds??[];return ids.map(id=>contentPack(s)?.story.find(o=>o.id===id)).filter(Boolean);}
export function progressionLevels(s){return contentPack(s.chapterEntryVersions?.[s.chapterId]??s.contentVersion)?.levels??LEVELS;}
export function nextLevelDefinition(s){return progressionLevels(s).find(l=>l.level>levelDefinition(s).level&&l.level<=enteredChapterDefinition(s).levelCap)??null;}
export function unlockedSourceIds(s){return contentPack(s)?.sourceRules.filter(rule=>s.enteredChapters.includes(rule.chapterId)&&(s.mode==='replay'||rule.milestones.every(id=>s.milestones.includes(id)))).map(rule=>rule.id)??[];}
export function levelDefinition(s){
 // Entered chapter tracks are immutable earned-access contracts. A content
 // update or later chapter can add access, but cannot demote an earned level,
 // order slot, or target ceiling. XP itself is never manufactured or reduced.
 const tracks=(s.enteredChapters??[s.chapterId]).map(id=>{const pack=contentPack(s.chapterEntryVersions?.[id]??s.contentVersion),chapter=pack?.chapters.find(c=>c.id===id);return pack?.levels.findLast(l=>l.level<=(chapter?.levelCap??4)&&(s.mode==='replay'||s.xp>=l.xp));}).filter(Boolean);
 const best=tracks.reduce((best,l)=>!best||l.level>best.level||l.level===best.level&&l.xp<best.xp?l:best,null);
 return best?{...best,targetCeiling:Math.max(...tracks.map(l=>l.targetCeiling)),slots:Math.max(...tracks.map(l=>l.slots))}:null;
}
export function coinBalance(s){return s.coinsEarned-s.coinsSpent;}
export function orderCapacity(s){return levelDefinition(s).slots+(s.upgrades['order-desk']?1:0);}
export function availableUpgrades(s){return contentPack(s).upgrades.filter(u=>s.enteredChapters.includes(u.chapterId??CHAPTER.id)&&(!u.familyId||s.unlockedSources.includes(u.familyId)));}
export function recipeKey(requirements){const counts=new Map;for(const r of requirements){const p=pieceOf(r.pieceId);if(!p)throw Error('Unknown recipe piece');const key=`${p.familyId}:${p.tier}`;counts.set(key,(counts.get(key)??0)+r.quantity);}return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([id,n])=>`${id}:${n}`).join('|');}
export function eligible(s,requirements){return requirements.every(r=>{const p=pieceOf(r.pieceId);return p&&s.unlockedSources.includes(p.familyId)&&p.tier<=levelDefinition(s).targetCeiling;});}
