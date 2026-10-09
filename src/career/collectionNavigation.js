import {CATALOG,CHAPTERS,FAMILIES,CONTENT_PACKS,CONTENT_VERSION} from './content.js';
import {collectionScope,continuationEntered,VOLUMES} from './volumes.js';
export const COLLECTION_PAGE_SIZE=20;
export const initialCollectionNavigation=state=>({volume:continuationEntered(state)?'all':VOLUMES[0].id,chapter:'all',family:'all',page:0});
// View-only selections never enter the career reducer or persisted save.
export function navigateCollection(selection,action){
  if(action.type==='volume')return{volume:action.value,chapter:'all',family:'all',page:0};
  if(action.type==='chapter')return{...selection,chapter:action.value,family:'all',page:0};
  if(action.type==='family')return{...selection,family:action.value,page:0};
  if(action.type==='page')return{...selection,page:action.value};
  return selection;
}
export function collectionView(state,selection=initialCollectionNavigation(state)){
  const scope=collectionScope(state,selection.volume),allowed=new Set(scope.pieceIds);
  const rules=CONTENT_PACKS[CONTENT_VERSION].sourceRules;
  const chapterForFamily=id=>rules.find(rule=>rule.id===id)?.chapterId;
  const chapters=CHAPTERS.filter(chapter=>FAMILIES.some(f=>chapterForFamily(f.id)===chapter.id&&f.pieceIds.some(id=>allowed.has(id))));
  const chapter=chapters.some(c=>c.id===selection.chapter)?selection.chapter:'all';
  const families=FAMILIES.filter(f=>f.pieceIds.some(id=>allowed.has(id))&&(chapter==='all'||chapterForFamily(f.id)===chapter));
  const family=families.some(f=>f.id===selection.family)?selection.family:'all';
  const pieceIds=scope.pieceIds.filter(id=>{const f=CATALOG.pieceOf(id).familyId;return(family==='all'||family===f)&&(chapter==='all'||chapterForFamily(f)===chapter);});
  const pageCount=Math.max(1,Math.ceil(pieceIds.length/COLLECTION_PAGE_SIZE)),page=Math.max(0,Math.min(Number.isInteger(selection.page)?selection.page:0,pageCount-1));
  const title=family!=='all'?families.find(f=>f.id===family).shortName:chapter!=='all'?chapters.find(c=>c.id===chapter).title:scope.title;
  return{scope,chapters,families,chapter,family,title,pieceIds,page,pageCount,visibleIds:pieceIds.slice(page*COLLECTION_PAGE_SIZE,(page+1)*COLLECTION_PAGE_SIZE),collected:pieceIds.filter(id=>state.discoveries.includes(id)).length};
}
