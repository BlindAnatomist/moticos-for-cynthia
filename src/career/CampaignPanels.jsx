import {useEffect,useRef,useState,useReducer} from 'react';
import {CATALOG,CHAPTERS,CHAPTER_COPY,STORY_ORDERS,POSTCARD_POSTSCRIPTS} from './content.js';
import {chapterComplete,originalVolumeComplete} from './engine.js';
import {familyName,completedLetter,correspondenceTitle,postcardChapter} from './feedback.js';
import {VOLUMES,continuationEntered,collectionScope} from './volumes.js';
import {initialCollectionNavigation,navigateCollection,collectionView} from './collectionNavigation.js';

export function CollectionPanel({state,Artwork,openPostcard}) {
  const [selection,navigate]=useReducer(navigateCollection,state,initialCollectionNavigation);
  const view=collectionView(state,selection),{scope,page:current,pageCount:count,visibleIds:ids}=view;
  const heading=useRef(null),mounted=useRef(false);
  useEffect(()=>{if(mounted.current)heading.current?.focus();else mounted.current=true;},[selection]);
  const original=collectionScope(state,VOLUMES[0].id),postscripts=POSTCARD_POSTSCRIPTS.filter(card=>view.pieceIds.includes(card.pieceId)&&chapterComplete(state,postcardChapter(card.pieceId)?.id));
  return <section className="career-volume-collection"><h3 ref={heading} tabIndex={-1}>{view.title} · {view.collected}/{view.pieceIds.length} collected</h3><p>The first correspondence: {original.collected}/160 pictures collected. Discoveries stay after Send, Cut, Recycle or Undo.</p>
    <div className="career-collection-navigation">
      {continuationEntered(state)&&<label>Collection volume <select aria-label="Collection volume" value={scope.id} onChange={event=>navigate({type:'volume',value:event.target.value})}><option value="all">All available pictures · 200</option>{VOLUMES.map(v=><option key={v.id} value={v.id}>{v.title} · {v.pieceIds.length}</option>)}</select></label>}
      <label>Collection chapter <select aria-label="Collection chapter" value={view.chapter} onChange={event=>navigate({type:'chapter',value:event.target.value})}><option value="all">All chapters in this collection</option>{view.chapters.map(c=><option key={c.id} value={c.id}>{c.number}. {c.title}</option>)}</select></label>
      <label>Picture family <select aria-label="Picture family" value={view.family} onChange={event=>navigate({type:'family',value:event.target.value})}><option value="all">All picture families</option>{view.families.map(f=><option key={f.id} value={f.id}>{f.shortName} · 5 pictures</option>)}</select></label>
    </div>
    <nav className="career-page-controls" aria-label="Collection pages"><button disabled={current===0} onClick={()=>navigate({type:'page',value:current-1})}>Previous pictures</button><span aria-live="polite">Page {current+1} of {count}</span><button disabled={current+1===count} onClick={()=>navigate({type:'page',value:current+1})}>Next pictures</button></nav>
    <div className="career-collection-grid">{ids.map(id=>{const p=CATALOG.pieceOf(id),found=state.discoveries.includes(id);return <button key={id} data-collection-piece-id={id} disabled={!found} aria-label={`${p.name}, ${familyName(p.familyId)}, level ${p.tier}${found?', collected':', not discovered'}`} onClick={()=>openPostcard(id)}>{found?<Artwork pieceId={id}/>:<span className="career-undiscovered">?</span>}<strong>{found?p.name:`${familyName(p.familyId)} · level ${p.tier}`}</strong><small>{familyName(p.familyId)} · {found?'collected':state.unlockedSources.includes(p.familyId)?'Ready to discover':'Source not open'}</small></button>;})}</div>
    {postscripts.length>0&&<details className="career-postscript-invitations"><summary>Optional final-picture postscripts · no rewards</summary>{postscripts.map(card=><section key={card.id}><h3>{card.title}</h3><p>{state.discoveries.includes(card.pieceId)?card.caption:card.goal}</p>{state.discoveries.includes(card.pieceId)&&<button onClick={()=>openPostcard(card.pieceId)}>View this postscript</button>}</section>)}</details>}
  </section>;
}

export function LettersPanel({state,RequestDetails,openSent,practice}) {
  const [selected,setSelected]=useState(state.chapterId),heading=useRef(null),mounted=useRef(false);
  const groups=CHAPTERS.filter(c=>state.enteredChapters.includes(c.id)),group=groups.find(c=>c.id===selected)??groups.at(-1);
  const last=state.receipts.findLast(r=>r.type==='delivery'&&r.storyLetterId),recent=groups.find(c=>c.storyIds.includes(last?.storyLetterId));
  useEffect(()=>{if(mounted.current)heading.current?.focus();else mounted.current=true;},[selected]);
  return <section className="career-correspondence-browser">{originalVolumeComplete(state)&&<p>All 113 original letters and the first sixteen chapters remain complete.</p>}
    <nav className="career-page-controls" aria-label="Correspondence navigation"><button onClick={()=>setSelected(state.chapterId)}>Current chapter</button>{recent&&<button onClick={()=>setSelected(recent.id)}>Most recent letter’s chapter</button>}{originalVolumeComplete(state)&&<button onClick={()=>setSelected('sound-advice')}>Original ending</button>}</nav>
    <label>Chapter <select value={group.id} onChange={event=>setSelected(event.target.value)}>{groups.map(c=><option key={c.id} value={c.id}>{c.number}. {c.title}</option>)}</select></label>
    <section className="career-letter-chapter"><h3 ref={heading} tabIndex={-1}>{group.title}</h3><div className="career-letter-list">{STORY_ORDERS.filter(letter=>letter.chapterId===group.id).map((letter,index)=>{const sent=state.milestones.includes(letter.id),completion=state.storyCompletions?.[letter.id],original=completedLetter(state,letter.id),active=state.orders.find(o=>o.storyLetterId===letter.id);return <article key={letter.id}><span className={sent?'is-sent':''}>{String(index+1).padStart(2,'0')}</span><div><h3>{correspondenceTitle(state,letter,index+1)}</h3><p>{sent?original?.letter??'Sent. Original details are unavailable.':active?'On your desk now.':'A letter still to come.'}</p>{!sent&&active&&<RequestDetails order={active}/>} {original&&<button onClick={()=>openSent(original)}>View sent letter</button>}</div>{sent&&<button onClick={()=>practice(letter.id,completion?.contentVersion)}>Practice<small>0 XP · 0 coins</small></button>}</article>;})}</div>{chapterComplete(state,group.id)&&<p className="career-chapter-ending">{CHAPTER_COPY[group.id]?.ending}</p>}</section>
  </section>;
}
