// Append-only packs. The independent v2 module remains the historical reader.
import { getEnvelope } from '../matching/cohesion/registry.js';
import * as V2 from './content.v2.js';
import additions from './continuation.v3.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(additions);
export const SCHEMA_VERSION=3, RULES_VERSION=2, CONTENT_VERSION=3;
export const STORAGE_KEY=V2.STORAGE_KEY, LOCK_NAME=V2.LOCK_NAME;
const catalogs=['matching-garden','moonlit-passage',...additions.chapters.map(c=>c.catalogEnvelopeId)].map(id=>getEnvelope(id).catalog);
export const FAMILIES=freeze(catalogs.flatMap(c=>c.FAMILIES));
const pieces=freeze(catalogs.flatMap(c=>c.PIECES)), pieceMap=freeze(Object.fromEntries(pieces.map(p=>[p.id,p])));
const pieceOf=id=>typeof id==='string'&&Object.hasOwn(pieceMap,id)?pieceMap[id]:null;
const neighbor=(id,delta)=>{const p=pieceOf(id),f=FAMILIES.find(f=>f.id===p?.familyId);return pieceOf(f?.pieceIds[p.tier-1+delta]);};
export const CATALOG=freeze({PIECES:pieces,CATALOG:pieceMap,FAMILIES,pieceOf,nextPiece:id=>neighbor(id,1),previousPiece:id=>neighbor(id,-1)});
export const STARTER_FAMILY_IDS=V2.STARTER_FAMILY_IDS, REWARDS=V2.REWARDS, SORTER_CYCLE=V2.SORTER_CYCLE;
export function target(familyId,tier,quantity=1){const f=FAMILIES.find(f=>f.id===familyId),p=pieceOf(f?.pieceIds[tier-1]);if(!p||!REWARDS[tier])throw Error('Unknown authored target');return freeze({pieceId:p.id,quantity});}
export function rewardsFor(requirements){return requirements.reduce((n,r)=>({xp:n.xp+REWARDS[pieceOf(r.pieceId).tier].xp*r.quantity,coins:n.coins+REWARDS[pieceOf(r.pieceId).tier].coins*r.quantity}),{xp:0,coins:0});}
export const LEVELS=freeze([...V2.LEVELS,...additions.levels]);
export const STORY_ORDERS=freeze([...V2.STORY_ORDERS,...additions.story]);
export const CHAPTERS=freeze([...V2.CHAPTERS.map(c=>c.number===2?{...c,nextId:additions.chapters[0].id,nextTitle:additions.chapters[0].title,nextPreview:'The river finds a map; the cup sends steam. Keep your table and open the free Map source. The first two Riverside letters open Teacup.'}:c),...additions.chapters]);
export const CHAPTER=CHAPTERS[0], ORDINARY_ORDERS=V2.ORDINARY_ORDERS;
export const UPGRADES=freeze([...V2.UPGRADES,...additions.upgrades]);
export const CHAPTER_COPY=freeze({...V2.CHAPTER_COPY,...additions.chapterCopy});
export const DISCOVERY_CAPTIONS=freeze({...V2.DISCOVERY_CAPTIONS,...Object.fromEntries(additions.postscripts.map(p=>[p.pieceId,p.caption]))});
export const POSTCARD_POSTSCRIPTS=freeze([...V2.POSTCARD_POSTSCRIPTS,...additions.postscripts]);
export const CONTENT_PACKS=freeze({...V2.CONTENT_PACKS,3:{story:STORY_ORDERS,ordinary:ORDINARY_ORDERS,upgrades:UPGRADES,familyIds:FAMILIES.map(f=>f.id),chapters:CHAPTERS,levels:LEVELS,sourceRules:[...V2.CONTENT_PACKS[2].sourceRules,...additions.sourceRules]}});
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

export function storyEligible(s,template){return eligible(s,template.requirements)&&(template.requiresMilestones??[]).every(id=>s.milestones.includes(id));}
// Fail on authoring errors at load, independently from historic promise validity.
export function validateStoryGates(pack=CONTENT_PACKS[CONTENT_VERSION]){
 const byId=new Map(pack.story.map(t=>[t.id,t]));if(byId.size!==pack.story.length)throw Error('Duplicate story template');
 const visiting=new Set,done=new Set;const visit=t=>{if(visiting.has(t.id))throw Error('Cyclic story gate');if(done.has(t.id))return;visiting.add(t.id);for(const id of t.requiresMilestones??[]){const prerequisite=byId.get(id);if(!prerequisite||prerequisite.chapterId!==t.chapterId)throw Error('Invalid story prerequisite');visit(prerequisite);}visiting.delete(t.id);done.add(t.id);};pack.story.forEach(visit);
 for(const rule of pack.sourceRules)for(const id of rule.milestones){if(byId.get(id)?.chapterId!==rule.chapterId)throw Error('Invalid source prerequisite');}return true;
}
validateStoryGates();
