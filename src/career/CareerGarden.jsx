import {focusBoardCell} from './boardFocus.js';
import BoardViewport from './BoardViewport.jsx';
import {distinctEndingNote} from './endingPresentation.js';
import {CollectionPanel,LettersPanel} from './CampaignPanels.jsx';
import {VOLUMES,volumeOf,collectionScope,boundaryAt,boundaryById} from './volumes.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Coins, HelpCircle, Lightbulb, Mail, Scissors, ShoppingBag, Menu, SlidersHorizontal, Image as ImageIcon, Trash2, Undo2, Volume2, VolumeX, X } from 'lucide-react';
import useCampaignAudio from './useCampaignAudio.js';
import { wrapDialogFocus } from '../collection/dialogFocus.js';
import { createCampaignPostcard } from './postcardCache.js';
import { downloadPostcard, sharePostcard } from '../exportPostcard.js';
import { BOARD_ART_BOUNDS, COMPACT_BOARD_LABELS } from './boardArt.js';
import { CATALOG, CHAPTERS, CHAPTER_COPY, DISCOVERY_CAPTIONS, POSTCARD_POSTSCRIPTS, FAMILIES, STORY_ORDERS, UPGRADES, STORAGE_KEY, availableUpgrades, chapterDefinition, levelDefinition, nextLevelDefinition, coinBalance, orderCapacity, orderTemplate, contentPack } from './content.js';
import { chapterComplete, canStartNextChapter, canEnterContinuation, originalVolumeComplete, commandFor, goalHint, createReplay, matchingTiles, nextOutput, reduceCareer } from './engine.js';
import { createCareerSession } from './session.js';
import { zeroXPRewardPrefix, storyMilestoneNote, progressCue, nextChapterEntryCue, mobileGoalMode, chapterProgress, orderPresentation, familyName, postcardChapter, postcardSubtitle, returnOrientation, levelUnlock, unlockedSourceCue, completedLetter, correspondenceTitle, failureDetail, failureBrief, nextBoardIndex, passiveGoalMessage, goalAccessibleLabel } from './feedback.js';
import './career.css';

function CroppedArtwork({ piece, bounds }) {
  const box = useRef(null), [fit, setFit] = useState({ width: 0, height: 0 });
  const { source: [w, h], crop: [x, y, cw, ch] } = bounds;
  useLayoutEffect(() => {
    const element = box.current;
    const measure = () => { const scale = Math.max(0, Math.min(element.clientWidth / cw, element.clientHeight / ch)); const next = { width: cw * scale, height: ch * scale }; setFit(old => Math.abs(old.width - next.width) < .01 && Math.abs(old.height - next.height) < .01 ? old : next); };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (observer) observer.observe(element); else window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); if (!observer) window.removeEventListener('resize', measure); };
  }, [cw, ch]);
  return <span className="career-art-crop" ref={box} aria-hidden="true"><span style={fit}><img src={piece.art} alt="" draggable="false" style={{ width: `${w / cw * 100}%`, height: `${h / ch * 100}%`, left: `${-x / cw * 100}%`, top: `${-y / ch * 100}%` }} /></span></span>;
}
function Artwork({ pieceId, cropped = false, descriptive = false }) {
  const piece = CATALOG.pieceOf(pieceId), bounds = BOARD_ART_BOUNDS[pieceId];
  if (!piece) return null;
  return cropped && bounds ? <CroppedArtwork piece={piece} bounds={bounds} /> : <img className="career-art" src={piece.art} alt={descriptive ? piece.description ?? piece.name : ''} draggable="false" width="768" height="768" />;
}
function Dialog({ title, close, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => { const previous = document.activeElement, dialog = ref.current; dialog.showModal(); return () => { dialog.close(); if (previous?.isConnected && !previous.disabled && previous.getClientRects().length) previous.focus(); else [...document.querySelectorAll('.career-mobile-order-details, [data-career-cell="0"]')].find(element => element.getClientRects().length)?.focus(); }; }, []);
  useEffect(() => { if (ref.current?.open) ref.current.querySelector('header button')?.focus(); }, [title]);
  return <dialog className={`career-dialog ${className}`} ref={ref} aria-labelledby="career-dialog-title" onKeyDown={wrapDialogFocus} onCancel={e => { e.preventDefault(); close(); }}>
    <header><h2 id="career-dialog-title">{title}</h2><button autoFocus onClick={close} aria-label="Close and return to board"><X size={20} /></button></header>{children}
  </dialog>;
}
export function Postcard({ pieceId, chapterTitle }) {
  const postscript = POSTCARD_POSTSCRIPTS.find(card => card.pieceId === pieceId);
  const [postcard, setPostcard] = useState(null), [message, setMessage] = useState('Preparing your postcard…'), [retry, setRetry] = useState(0), [failed, setFailed] = useState(false);
  useEffect(() => { let current = true; setPostcard(null); setFailed(false); setMessage('Preparing your postcard…'); createCampaignPostcard(pieceId, CATALOG.CATALOG, chapterTitle).then(p => { if (current) { setPostcard(p); setMessage('A small picture, ready to keep.'); } }).catch(error => { if (current) { setFailed(true); setMessage(error.name === 'PostcardBusyError' ? 'Other postcards are still being prepared. Your picture is safe; try again in a moment.' : 'The export could not be prepared. Your collected picture is still here. Try again when you’re ready.'); } }); return () => { current = false; }; }, [pieceId, chapterTitle, retry]);
  async function share() { try { const result = await sharePostcard(postcard); setMessage(result.shared ? 'Share sheet opened.' : 'Use Download to keep this postcard.'); } catch (error) { setMessage(error.name === 'AbortError' ? 'Sharing canceled.' : 'Sharing is unavailable. Try Download instead.'); } }
  return <><figure className="career-postcard"><Artwork pieceId={pieceId} descriptive /><figcaption>{CATALOG.pieceOf(pieceId).name}<small>MOTICOS · {chapterTitle.toUpperCase()}</small>{DISCOVERY_CAPTIONS[pieceId] && <p className="career-discovery-caption">{DISCOVERY_CAPTIONS[pieceId]}</p>}</figcaption></figure>{postscript && <p className="career-postscript-note">{postscript.reverse}</p>}<p role="status">{message}</p><div className="career-dialog-actions">{failed && <button onClick={() => setRetry(value => value + 1)}>Try preparing again</button>}<button disabled={!postcard} onClick={() => { downloadPostcard(postcard); setMessage('Postcard download started.'); }}>Download postcard</button><button disabled={!postcard} onClick={share}>Share postcard</button></div></>;
}
function OrderCard({ order, state, busy, complete, focus }) {
  const presentation = orderPresentation(order), ready = matchingTiles(state, order), focused = state.focusedOrderId === order.id;
  return <article className={`career-order ${ready ? 'is-ready' : ''} ${focused ? 'is-focused' : ''}`} data-order-id={order.id}>
    <div className="career-order-heading"><span>{presentation.label}</span>{ready && <span className="career-ready"><Check size={12} />Ready</span>}</div>
    <h3>{focus ? <button className="career-order-title" disabled={busy} aria-pressed={focused} onClick={() => focus(order)}>{presentation.title}<small>{focused ? 'Chosen goal' : 'Choose this goal'}</small></button> : presentation.title}</h3>
    <div className="career-targets">{order.requirements.map(r => { const piece = CATALOG.pieceOf(r.pieceId), owned = state.board.filter(t => t?.pieceId === r.pieceId).length; return <div className="career-target" key={r.pieceId}><div className="career-target-art"><Artwork pieceId={r.pieceId} /><span className={owned >= r.quantity ? 'is-owned' : ''}>{Math.min(owned, r.quantity)}/{r.quantity}</span></div><div><strong>{piece.name}</strong><small>{familyName(piece.familyId)} · level {piece.tier}</small></div></div>; })}</div>
    {storyMilestoneNote(order, state) && <p className="career-request-goal">{storyMilestoneNote(order, state)}</p>}
    <div className="career-order-footer"><span className="career-rewards">{order.xp > 0 ? <><b>+{order.xp}</b> XP · </> : zeroXPRewardPrefix(order, state.mode)}<b>{order.coins ? `+${order.coins}` : '0'}</b> coins</span><button className="career-send" disabled={!ready || busy} onClick={() => complete(order)} aria-label={`Complete order: ${presentation.title}`}>{ready ? 'Send' : 'Make pieces'}<ArrowRight size={15} /></button></div>
  </article>;
}
export function RequestDetails({ order }) {
  const [expanded, setExpanded] = useState(false);
  const { template, title } = orderPresentation(order);
  if (!template?.letter) return null;
  const contentId = `request-letter-${order.id}`;
  const goal = template.goal ?? `Make and send ${order.requirements.map(requirement => `${requirement.quantity > 1 ? `${requirement.quantity} × ` : ''}${CATALOG.pieceOf(requirement.pieceId).name}`).join(' and ')}.`;
  return <div className="career-request-letter" data-request-letter-id={order.id}><button type="button" className="career-request-toggle" aria-expanded={expanded} aria-controls={contentId} aria-label={`${expanded ? 'Hide letter text' : 'Read letter'}: ${title}`} onClick={() => setExpanded(value => !value)}><Mail size={16} />{expanded ? 'Close letter text' : 'Read this letter'}</button><div id={contentId} className="career-request-text" hidden={!expanded}><p className="career-request-goal"><strong>{goal}</strong></p><p>{template.letter}</p></div></div>;
}
export function SentLetter({ letter, openPostcard }) {
  return <div className="career-sent-letter"><p className="career-sent-caption">{letter.sentCaption ?? letter.letter ?? 'A small picture, sent and kept.'}</p><div className="career-sent-pictures">{letter.requirements.map(requirement => <button key={requirement.pieceId} onClick={() => openPostcard(requirement.pieceId)}><Artwork pieceId={requirement.pieceId} /><strong>{requirement.quantity > 1 ? `${requirement.quantity} × ` : ''}{CATALOG.pieceOf(requirement.pieceId).name}</strong><small>View this postcard</small></button>)}</div><p>The pieces were delivered inside the game. Their art stays in your collection. Choose one picture to view or keep its postcard.</p></div>;
}
export function SourcePicker({ state, busy = false, notice, requestedFamilyId, chooseSource, close }) {
  const chapter = chapterDefinition(state);
  return <div className="career-source-panel"><p>Keep two free sources beside your board. Changing these controls never removes pieces or resets a sorter. Choosing a request also selects the sources it needs.</p>{requestedFamilyId && <p className="career-panel-complete">Your chosen goal needs the {familyName(requestedFamilyId)} source. Put it in either slot below.</p>}<p className="career-panel-feedback" role="status">{notice}</p>{state.activeSourceIds.map((active, sourceSlot) => <fieldset key={sourceSlot}><legend>{sourceSlot === 0 ? 'Left source' : 'Right source'} · {familyName(active)}</legend><div className="career-source-options">{FAMILIES.filter(f => state.unlockedSources.includes(f.id)).map(family => <button key={family.id} disabled={busy} aria-pressed={active === family.id} aria-label={`${family.shortName}, ${sourceSlot === 0 ? 'left' : 'right'} source${active === family.id ? ', selected' : ''}`} onClick={() => chooseSource(sourceSlot, family.id)}><Artwork pieceId={family.pieceIds[0]} /><strong>{family.shortName}</strong><small>{active === family.id ? 'Selected ✓' : 'Use here'}</small></button>)}</div></fieldset>)}{contentPack(state).sourceRules.filter(r => r.chapterId === chapter.id && !state.unlockedSources.includes(r.id)).map(r => <p key={r.id}>The {familyName(r.id)} source opens after {r.milestones.filter(id => !state.milestones.includes(id)).length} remaining opening {r.milestones.filter(id => !state.milestones.includes(id)).length === 1 ? 'letter' : 'letters'}.</p>)}<div className="career-dialog-actions"><button onClick={close}>Back to my board</button></div></div>;
}
export function HeldLetters({ state, busy, choose, returnToStory }) {
  if (!state.heldOrders.length && !state.resumedOptionalId) return null;
  const displaced = state.suspendedStory;
  return <section className="career-held-letters" aria-label="Kept optional letters"><h3>Kept optional letters</h3><p>These requests keep their original rewards. Choosing one is free and uses the first story slot; its story is kept safely. Return to story at any time. No order desk is needed.</p>{state.resumedOptionalId && <><p>{displaced ? `“${orderPresentation(displaced).title}” is kept while you make your optional letter.` : 'You are making a kept optional letter.'}</p><button disabled={busy} onClick={returnToStory}>Return to story · free</button></>}<div className="career-held-list">{state.heldOrders.map(order => <article key={order.id}><h4>{orderPresentation(order).title}</h4><p>{order.requirements.map(r => `${r.quantity} × ${CATALOG.pieceOf(r.pieceId).name}`).join(' + ')}</p><small>{order.xp} XP · {order.coins} coins</small><button disabled={busy} onClick={() => choose(order.id)} aria-label={`Resume optional letter: ${order.requirements.map(r => `${r.quantity} ${CATALOG.pieceOf(r.pieceId).name}`).join(' and ')}`}>Choose this letter · free</button></article>)}</div></section>;
}
export function CareerGame({ session, initial, replay = false, exitReplay = null }) {
  const [state, setState] = useState(initial.state), stateRef = useRef(initial.state);
  const [saveStatus, setSaveStatus] = useState(initial.status), [warning, setWarning] = useState(initial.warning);
  const [busy, setBusy] = useState(false), busyRef = useRef(false);
  const orientation = returnOrientation(initial.state);
  const [briefNotice, setBriefNotice] = useState(initial.status === 'practice' ? 'Unsaved practice · nothing is banked' : orientation.brief);
  const [selected, setSelected] = useState(null), [hint, setHint] = useState([]), [overlay, setOverlay] = useState(null), [practice, setPractice] = useState(null);
  const [notice, setNotice] = useState(initial.warning ?? orientation.detail);
  const [celebration, setCelebration] = useState(null), [focusIndex, setFocusIndex] = useState(0);
  const [purchaseFeedback, setPurchaseFeedback] = useState(null), [motion, setMotion] = useState(null), [hintAction, setHintAction] = useState(null);
  const focusAfter = useRef(null), restoreControl = useRef(null), supplies = useRef({}), focusedSend = useRef(null);
  const cells = useRef([]), drag = useRef(null), practiceRef = useRef(null), audio = useCampaignAudio(state.sound && !practice);
  const apply = result => { if (result.state) { audio.syncSound(result.state.sound && !practiceRef.current); stateRef.current = result.state; setState(result.state); } setSaveStatus(result.status ?? 'replay'); setWarning(result.warning ?? null); };
  useEffect(() => {
    if (!session) return;
    const unsubscribe = session.subscribe(apply);
    const changed = event => { if (event.key === STORAGE_KEY || event.key === null) { drag.current = null; setSelected(null); setHint([]); setHintAction(null); setMotion(null); setCelebration(null); setPurchaseFeedback(null); session.refresh().then(result => { if (result.ok) { setNotice('The latest saved board from your other tab is now shown.'); setBriefNotice('Updated from your other tab.'); } else if (result.warning) { setNotice(result.warning); setBriefNotice('Saving unavailable · unsaved practice'); } }); } };
    window.addEventListener('storage', changed); return () => { unsubscribe(); window.removeEventListener('storage', changed); };
  }, [session]);
  useEffect(() => { if (!motion) return; const timeout = window.setTimeout(() => setMotion(null), 460); return () => window.clearTimeout(timeout); }, [motion]);
  useEffect(() => { if (!busy && focusAfter.current !== null && !overlay && !practice) { const index = focusAfter.current; focusAfter.current = null; setFocusIndex(index); cells.current[index]?.focus(); } }, [busy, state.revision, overlay, practice]);
  useEffect(() => { if (busy || !restoreControl.current) return; const previous = restoreControl.current; restoreControl.current = null; if (previous.isConnected && !previous.disabled && previous.getClientRects().length && (!overlay || previous.closest('.career-dialog[open]'))) previous.focus(); else if (overlay) document.querySelector('.career-dialog[open] header button')?.focus(); else [...document.querySelectorAll('.career-mobile-order-details, [data-career-cell="0"]')].find(element => element.getClientRects().length)?.focus(); }, [busy, state.revision, overlay]);
  const chapter = chapterDefinition(state), chapterSummary = chapterProgress(state);
  const level = levelDefinition(state), nextLevel = nextLevelDefinition(state);
  const progress = progressCue(state, saveStatus), collection = collectionScope(state), volume = volumeOf(state);
  const endingNote = distinctEndingNote(CHAPTER_COPY[chapter.id]?.ending,chapterSummary.canContinue ? 'Take your paper table into the next chapter. A new free source, familiar pictures, and new letters.' : volume.id === VOLUMES[0].id ? 'You’ve sent every letter in the original sixteen-chapter campaign. Keep exploring your collection or return to a favorite letter.' : volume.completionCopy);
  const selectedTile = state.board[selected], selectedPiece = CATALOG.pieceOf(selectedTile?.pieceId);
  const finished = chapterComplete(state), emptyCount = state.board.filter(t => !t).length;
  const lastDelivery = state.receipts.findLast(r => r.type === 'delivery' || r.type === 'practice');
  const focusedOrder = state.orders.find(o => o.id === state.focusedOrderId) ?? state.orders[0];
  const focusedPresentation = orderPresentation(focusedOrder);
  const focusedReady = matchingTiles(state, focusedOrder);
  const showChapterEntry = mobileGoalMode(state) === 'chapter';
  const goalTileIds = new Set(focusedOrder?.requirements.flatMap(r => state.board.filter(t => t?.pieceId === r.pieceId).slice(0, r.quantity).map(t => t.id)) ?? []);
  const lastDeliveryLetter = lastDelivery && orderTemplate(lastDelivery.templateId, lastDelivery.contentVersion, lastDelivery.storyLetterId ? 'story' : 'ordinary');
  const visibleFamilies = state.activeSourceIds.map(id => FAMILIES.find(f => f.id === id));
  const visibleUpgrades = availableUpgrades(state);
  const goalFamilies = focusedOrder?.requirements.map(r => CATALOG.pieceOf(r.pieceId).familyId) ?? [];
  const openSorters = visibleUpgrades.filter(u => u.familyId && !state.upgrades[u.id] && u.level <= level.level);
  const usefulSorter = openSorters.find(u => goalFamilies.includes(u.familyId)) ?? openSorters[0];
  async function perform(action, success) {
    if (busyRef.current) return null;
    busyRef.current = true; setBusy(true); setHint([]); setHintAction(null);
    const previous = stateRef.current;
    if (previous.sound && action.type !== 'sound') audio.ensureAudio();
    const activeControl = document.activeElement;
    const activeCell = activeControl?.dataset?.careerCell;
    const pendingCopy = !session || saveStatus === 'practice' ? 'Updating your practice board…' : ({ complete: 'Saving this letter…', purchase: 'Saving your upgrade…', 'start-next-chapter': 'Opening the next chapter…', 'enter-continuation': 'Opening four more correspondences…', move: 'Placing your piece…', supply: 'Adding your free piece…', cut: 'Cutting the picture…', undo: 'Restoring your last move…' })[action.type] ?? 'Saving your change…';
    const pendingTimer = window.setTimeout(() => { if (busyRef.current) { setBriefNotice(pendingCopy); setNotice(pendingCopy); } }, 150);
    let result;
    try {
      result = session ? await session.commit(commandFor(previous, action)) : { ...reduceCareer(previous, commandFor(previous, action)), status: 'replay', warning: null };
      apply(result);
    } catch {
      result = { ok: false, message: 'The action could not be confirmed. Reopen this page to check your saved board before repeating a delivery or purchase.' };
    } finally {
      window.clearTimeout(pendingTimer);
      busyRef.current = false; setBusy(false);
    }
    if (activeCell === undefined && activeControl?.tagName === 'BUTTON') restoreControl.current = activeControl;
    if (action.type !== 'purchase') setPurchaseFeedback(null);
    if (!result.ok) {
      const message = failureDetail(action, previous, result);
      setBriefNotice(failureBrief(action, previous, result)); setNotice(message);
      if (action.type === 'purchase') setPurchaseFeedback(message);
      if (activeCell !== undefined) focusAfter.current = Number(activeCell);
      audio.playDenied(); return result;
    }
    setSelected(null);
    if (activeCell !== undefined) focusAfter.current = action.type === 'move' ? action.to : Number(activeCell);
    const changedCells = result.state.board.flatMap((tile, index) => tile?.id && tile.id !== previous.board[index]?.id ? [index] : []);
    if (changedCells.length && ['move', 'cut', 'supply', 'undo'].includes(action.type)) setMotion({ revision: result.state.revision, cells: changedCells, kind: action.type === 'move' && previous.board[action.to] ? 'merge' : action.type });
    setBriefNotice(action.type === 'undo' ? 'Undone · pieces and source restored' : action.type === 'supply' ? `Free ${familyName(action.familyId)} piece added` : action.type === 'recycle' ? 'Recycled · Undo is available' : action.type === 'cut' ? 'Cut into two matching pieces' : action.type === 'move' ? 'Piece ready for your next move' : action.type === 'focus-order' ? 'Goal chosen · its sources are ready' : action.type === 'select-source' ? `${familyName(action.familyId)} source selected` : action.type === 'large-text' ? action.enabled ? 'Larger text enabled' : 'Standard text enabled' : success ?? 'Done.');
    if (action.type === 'complete') {
      const delivery = result.state.receipts.at(-1), durable = result.saved;
      const unlock = durable ? levelUnlock(previous, result.state) : null;
      const source = durable ? unlockedSourceCue(previous, result.state) : null;
      const completeNow = chapterComplete(result.state) && !chapterComplete(previous);
      if (durable || replay) setCelebration(result.state.revision);
      setBriefNotice(replay ? 'Practice complete · 0 XP · 0 coins' : !durable ? 'Practice delivery · not saved' : completeNow ? (canStartNextChapter(result.state) ? `${chapterDefinition(result.state).title} sent · next chapter ready` : 'This correspondence is complete') : source?.brief ?? unlock?.brief ?? `Sent · +${delivery.xp} XP · +${delivery.coins} coins`);
      setNotice(replay ? 'Practice letter complete. 0 XP and 0 coins; your career is unchanged.' : durable ? `Letter sent. +${delivery.xp} XP and +${delivery.coins} coins saved. The art stays in your collection.${unlock ? ` ${unlock.detail}` : ''}${source ? ` ${source.detail}` : ''}${completeNow ? ` ${progressCue(result.state).detail}` : ''}` : `Practice delivery only. ${delivery.xp} XP and ${delivery.coins} coins are temporary, not saved.`);
      if (durable || replay) audio.playReward();
    } else if (action.type === 'purchase') {
      const upgrade = UPGRADES.find(u => u.id === action.upgradeId);
      const message = result.saved ? `${upgrade.name} is yours. ${upgrade.description}` : 'Practice purchase only. This upgrade and its coins are not saved.';
      setBriefNotice(result.saved ? `${upgrade.name} active` : 'Practice upgrade · not saved'); setNotice(message); setPurchaseFeedback(message);
      if (result.saved) audio.playReward();
    } else if (action.type === 'start-next-chapter' || action.type === 'enter-continuation') {
      const next = chapterDefinition(result.state);
      setBriefNotice(result.saved ? `Chapter ${next.number} · ${familyName(next.entrySources[0])} source open` : 'Practice chapter · not saved');
      setNotice(`${next.title} is open${result.saved ? ' and saved' : ' in unsaved practice'}. Your board, upgrades and art are still here. The free ${familyName(next.entrySources[0])} source is beside your board. Read your opening letters for the next source milestone. Any earlier optional letters are kept in Choose a request.`);
      if (result.saved) audio.playReward();
    } else {
      const discovery = result.state.discoveries.find(id => !previous.discoveries.includes(id));
      setNotice(discovery ? `${CATALOG.pieceOf(discovery).name} discovered. It stays in your collection, even after Send or Undo. ${passiveGoalMessage(result.state)}` : success ?? 'Done.');
      if (discovery) setBriefNotice(`New art · ${CATALOG.pieceOf(discovery).shortName} collected`);
      if (action.type === 'move') previous.board[action.to] ? audio.playMerge() : audio.playPickup();
      else if (action.type === 'cut') audio.playCut();
      else if (action.type === 'supply') audio.playPickup();
    }
    return result;
  }
  async function chooseKept(type, orderId) {
    const owner = overlay;
    const result = await perform({ type, ...(orderId ? { orderId } : {}) }, type === 'resume-optional' ? 'Optional letter chosen. Return to story is free in Choose a request.' : 'Your story is back. The optional letter is kept.');
    if (result?.ok) setOverlay(current => current === owner ? null : current);
  }
  async function toggleSound() {
    if (busyRef.current) return;
    const enabled = !stateRef.current.sound;
    // Resume within the trusted click, before the persistence await. Mute
    // immediately, including queued notes; reconcile to the resulting setting.
    if (enabled) audio.ensureAudio(); else audio.muteImmediately();
    const result = await perform({ type: 'sound', enabled }, enabled ? 'Sound on.' : 'Sound off.');
    audio.syncSound((result?.state?.sound ?? stateRef.current.sound) && !practiceRef.current);
    if (result?.ok && enabled && !practiceRef.current) {
      const scheduled = await audio.playEnabledCue();
      if (!scheduled && !practiceRef.current && stateRef.current.sound && stateRef.current.revision === result.state.revision) { setBriefNotice('No sound cue · try sound again'); setNotice('The sound setting is on, but its test cue could not start. The game still works; try the sound control again.'); }
    }
  }
  async function focusOrder(order, close = false) {
    const owner = overlay;
    const result = await perform({ type: 'focus-order', orderId: order.id }, `Chosen: ${orderPresentation(order).title}. Its sources are beside your board; every existing piece stays on the table.`);
    if (result?.ok && close) setOverlay(current => current === owner ? null : current);
  }
  async function startChapter() {
    const owner = overlay;
    const result = await perform({ type: 'start-next-chapter', chapterId: chapter.nextId });
    if (result?.ok) setOverlay(current => current === owner ? null : current);
  }
  async function enterContinuation() {const owner=overlay;const result=await perform({type:'enter-continuation',boundaryId:owner.boundaryId});if(result?.ok)setOverlay(current=>current===owner?null:current);}
  function enterPractice(storyId, contentVersion) {
    const next = { ...createReplay(storyId, undefined, contentVersion), sound: stateRef.current.sound, largeText: stateRef.current.largeText };
    practiceRef.current = next.careerId;
    audio.syncSound(false);
    setOverlay(null); setCelebration(null); setPractice(next);
  }
  function leavePractice() {
    practiceRef.current = null; setPractice(null); audio.syncSound(stateRef.current.sound);
    const returning = returnOrientation(stateRef.current); setNotice(returning.detail); setBriefNotice('Back to your saved career'); focusAfter.current = focusIndex;
  }
  function move(from, to) { const board = stateRef.current.board; return perform({ type: 'move', from, to, tileId: board[from]?.id, targetTileId: board[to]?.id ?? null }, board[to] ? `${CATALOG.nextPiece(board[from]?.pieceId)?.name ?? 'Picture'} made. Art discoveries stay collected, even after Undo.` : 'Piece moved.'); }
  function clickCell(index) {
    if (busyRef.current) return;
    if (stateRef.current.sound) audio.ensureAudio();
    const tile = state.board[index];
    if (selected === index) { setSelected(null); setBriefNotice('Selection cleared · choose a piece'); setNotice('Selection cleared. Choose a piece or a request.'); return; }
    if (selected !== null && selectedTile) { if (tile && tile.pieceId !== selectedTile.pieceId) { setSelected(index); setBriefNotice('Tap its match or an empty space.'); setNotice(`${CATALOG.pieceOf(tile.pieceId).name} selected. Match its identical picture or choose an empty space.`); } else move(selected, index); }
    else { setSelected(index); setBriefNotice(tile ? 'Tap its match or an empty space.' : 'Choose a free supply for this cell.'); setNotice(tile ? `${CATALOG.pieceOf(tile.pieceId).name} selected. Tap its matching picture to merge.` : 'Empty space selected. Choose a free supply to put a piece here.'); }
  }
  function supply(familyId, basic = false) { const piece = nextOutput(state, familyId, basic); perform({ type: 'supply', familyId, basic, to: selected !== null && !selectedTile ? selected : null }, `${piece.name} added for free. ${state.sources[familyId].sorter && !basic ? 'The source now shows its next output.' : 'Supplies never run out.'}`); }
  function complete(order) { const tileIds = matchingTiles(stateRef.current, order); if (tileIds) perform({ type: 'complete', orderId: order.id, tileIds }); }
  function recycle() {
    if (!selectedPiece) { setNotice('Select a piece to Recycle.'); setBriefNotice('Select a piece to Recycle.'); return; }
    if (selectedPiece.tier >= 3) setOverlay({ type: 'recycle', tileId: selectedTile.id, at: selected, pieceId: selectedPiece.id });
    else perform({ type: 'recycle', at: selected, tileId: selectedTile.id }, 'Piece recycled. No XP or coins earned. Undo can bring it back.');
  }
  function showHint() {
    const guidance = goalHint(stateRef.current);
    setSelected(null); setHint(guidance.pair ?? (guidance.at !== undefined ? [guidance.at] : [])); setHintAction(guidance);
    setNotice(guidance.message);
    const brief = { merge: 'Match this pair for your chosen letter.', send: 'Your letter is ready · press Send', supply: `Add free ${familyName(guidance.familyId)} for this goal`, cut: 'Cut the highlighted piece for this goal.', recover: 'Table full · Recycle, then free supply', chapter: 'Next chapter ready · open it above', complete: replay ? 'Practice complete · Return to career' : 'Letters complete · explore or practice', 'practice-complete': 'Practice complete · Return to career', unavailable: 'No request · check correspondence' };
    setBriefNotice(brief[guidance.kind] ?? guidance.message);
    if (guidance.pair) { setFocusIndex(guidance.pair[0]); focusBoardCell(cells.current[guidance.pair[0]]); }
    else if (guidance.at !== undefined) { setSelected(guidance.at); setFocusIndex(guidance.at); focusBoardCell(cells.current[guidance.at]); }
    else if (guidance.kind === 'supply') {
      if (state.activeSourceIds.includes(guidance.familyId)) supplies.current[guidance.familyId]?.focus();
      else setOverlay({ type: 'sources', requestedFamilyId: guidance.familyId });
    } else if (guidance.kind === 'send') {
      const button = focusedSend.current?.getClientRects().length ? focusedSend.current : document.querySelector(`.career-order[data-order-id="${guidance.orderId}"] .career-send`);
      button?.focus();
    } else if (guidance.kind === 'chapter') setOverlay({ type: 'chapter' });
  }
  function boardKey(event, index) {
    const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 };
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const next = event.ctrlKey ? event.key === 'Home' ? 0 : 24 : Math.floor(index / 5) * 5 + (event.key === 'End' ? 4 : 0); setFocusIndex(next); focusBoardCell(cells.current[next]); return; }
    if (event.key === 'Escape') { setSelected(null); setHint([]); drag.current = null; setBriefNotice('Selection cleared · choose a piece'); setNotice('Selection cleared. Choose a piece or a request.'); return; }
    if (shifts[event.key]) { event.preventDefault(); const next = nextBoardIndex(index, event.key); setFocusIndex(next); focusBoardCell(cells.current[next]); }
  }
  function dropOn(event, index) {
    event.preventDefault(); const started = drag.current; drag.current = null;
    if (!started || started.from === index) return;
    const current = stateRef.current;
    if (current.revision !== started.revision || current.board[started.from]?.id !== started.tileId) { setNotice('The board changed during that drag. Select the piece again.'); setBriefNotice('Board changed · choose the piece again'); return; }
    move(started.from, index);
  }
  if (practice) return <CareerGame key={practice.careerId} initial={{ state: practice, status: 'replay', warning: null }} replay exitReplay={leavePractice} />;
  return <main className={`career-shell ${replay ? 'is-practice' : ''} ${state.largeText ? 'is-large-text' : ''}`} data-save-status={saveStatus} data-chapter-id={chapter.id}>
    <header className="career-mobile-hud" aria-label="Compact career controls">
      <button className={`career-mobile-progress-button ${progress.complete ? 'is-complete' : ''}`} onClick={() => setOverlay({ type: chapterSummary.canContinue ? 'chapter' : 'progress' })} aria-label={chapterSummary.canContinue ? `Open ${chapter.nextTitle}. ${progress.heading}. Your chosen request stays available.` : `Career progress: ${progress.heading}. ${progress.cue}. View details.`}><strong>{progress.heading}</strong><span>{progress.cue}</span></button>
      <div className="career-mobile-coins" aria-label={`${coinBalance(state)} ${saveStatus === 'practice' ? 'temporary practice coins' : 'coins'}`}><Coins size={15} /><strong>{coinBalance(state)}</strong><small>{saveStatus === 'practice' ? 'temporary' : 'coins'}</small></div>
      {replay ? <button className="career-mobile-return" onClick={exitReplay}>Return</button> : <button className="career-mobile-orders-button" onClick={() => setOverlay({ type: 'orders' })} aria-label={`Orders: ${state.orders.length} active requests`}><Mail size={17} /><span>Orders {state.orders.length}</span></button>}
      <button className="career-mobile-more-button" onClick={() => setOverlay({ type: 'more' })} aria-label="More controls and settings"><Menu size={18} /><span>More</span></button>
    </header>
    <section className={`career-mobile-order-strip ${focusedReady ? 'is-ready' : ''} ${showChapterEntry ? 'is-chapter-ready' : ''}`} aria-label="Chosen goal" data-order-id={focusedOrder?.id ?? ''}>
      {showChapterEntry ? <><button className="career-mobile-order-details career-chapter-details" onClick={() => setOverlay({ type: 'chapter' })}><span className="career-mobile-order-reward">{saveStatus === 'practice' ? 'Practice · ' : ''}{chapterSummary.total} letters sent · chapter complete</span><strong>{chapter.nextTitle}</strong><small>{nextChapterEntryCue(state)}</small></button><button className="career-mobile-send career-send" disabled={busy} onClick={() => setOverlay({ type: 'chapter' })}>Open<ArrowRight size={14} /></button></> : focusedOrder ? <><button className="career-mobile-order-details" onClick={() => setOverlay({ type: 'orders' })} aria-label={goalAccessibleLabel(state, focusedOrder, saveStatus)}><span className="career-mobile-order-reward">{focusedPresentation.shortLabel} · {focusedOrder.xp ? `+${focusedOrder.xp} XP · ` : replay || focusedOrder.origin === 'story' ? '0 XP · ' : ''}{focusedOrder.coins ? `+${focusedOrder.coins}` : '0'} coins</span><span className="career-mobile-targets">{focusedOrder.requirements.map(r => { const p = CATALOG.pieceOf(r.pieceId), owned = state.board.filter(t => t?.pieceId === r.pieceId).length; return <span className="career-mobile-target" key={p.id} data-target-piece-id={p.id}><Artwork pieceId={p.id} /><span><strong>{p.shortName}</strong><small>L{p.tier} · {Math.min(owned,r.quantity)}/{r.quantity}{owned >= r.quantity ? ' ✓' : ''}</small></span></span>; })}</span></button><button ref={focusedSend} className={`career-mobile-send career-send ${hintAction?.kind === 'send' ? 'is-goal-hint' : ''}`} disabled={busy || !focusedReady} onClick={() => complete(focusedOrder)} aria-label={`Send chosen goal: ${focusedPresentation.title}`}>Send<ArrowRight size={14} /></button></> : <span className="career-mobile-no-order">{replay ? 'Practice complete. Return when you’re ready.' : 'No eligible request is available yet.'}</span>}
    </section>
    <header className="career-header"><div className="career-brand"><span className="career-wordmark">moticos<span>✳</span></span><span className="career-edition">a little correspondence game</span></div><div className="career-header-actions"><button className="career-icon-button" aria-label="How to play" onClick={() => setOverlay({ type: 'help' })}><HelpCircle size={20} /></button><button className="career-icon-button" aria-label={state.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={state.sound} disabled={busy} onClick={toggleSound} >{state.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button><button className="career-collection-button" onClick={() => setOverlay({ type: 'collection' })}><BookOpen size={17} /><span>Collection</span><small>{collection.collected}/{collection.total}</small></button></div></header>
    {replay ? <div className="career-practice-banner"><strong>Isolated letter practice · 0 XP · 0 coins</strong><button onClick={exitReplay}>Return to career</button></div> : saveStatus === 'practice' ? <div className="career-save-warning" role="alert"><strong>Unsaved practice</strong><p>{warning}</p></div> : null}
    <div className="career-chapter-row"><div><span className="career-eyebrow">CHAPTER {String(chapter.number).padStart(2, '0')} · {chapterSummary.sent}/{chapterSummary.total} LETTERS</span><h1>{chapter.title}</h1></div><span className="career-private-label">PRIVATE PLAYTEST</span></div>
    <section className="career-progress" aria-label="Career progress"><div className="career-level"><span>{replay ? 'Practice' : `Level ${level.level}`}</span>{!replay && <strong>{level.level === 1 ? 'A first correspondence' : chapterSummary.canContinue ? 'A new chapter awaits' : chapterSummary.campaignComplete ? 'The authored letters are sent' : `${chapterSummary.sent}/${chapterSummary.total} letters · Chapter ${chapter.number}`}</strong>}</div><div className="career-xp">{replay ? <span>No career rewards</span> : nextLevel ? <><div><span>{state.xp - level.xp} / {nextLevel.xp - level.xp} XP</span><span>Level {nextLevel.level} at {nextLevel.xp} total</span></div><progress max={nextLevel.xp - level.xp} value={state.xp - level.xp} aria-label={`Progress to player level ${nextLevel.level}`} /></> : <div><span>{state.xp} total XP kept</span><span>{finished ? 'Chapter complete' : 'Finish the remaining story letters'}</span></div>}</div><div className="career-wallet"><Coins size={20} /><strong>{coinBalance(state)}</strong><span>{saveStatus === 'practice' ? 'practice coins' : 'coins'}</span></div><button className="career-shop-button" onClick={() => setOverlay({ type: 'shop' })} disabled={replay}><ShoppingBag size={17} /><span>Upgrades</span>{level.level === 1 && <small>Level 2</small>}</button></section>
    <div className="career-workspace" data-order-count={state.orders.length}><section className="career-studio" aria-labelledby="career-board-title"><div className="career-section-heading"><h2 id="career-board-title">Your paper table</h2><span>{emptyCount} free {emptyCount === 1 ? 'space' : 'spaces'}</span></div>
      <BoardViewport largeText={state.largeText}><div className="career-board" role="group" aria-busy={busy} aria-label="Five by five merge board. Arrow keys move focus. Enter or Space selects a piece or its matching destination.">{state.board.map((tile, index) => { const piece = CATALOG.pieceOf(tile?.pieceId), matching = selectedTile && index !== selected && tile?.pieceId === selectedTile.pieceId && CATALOG.nextPiece(tile.pieceId); return <button ref={el => { cells.current[index] = el; }} key={index} className={`career-cell ${piece ? 'has-piece' : ''} ${selected === index ? 'is-selected' : ''} ${matching ? 'is-compatible' : ''} ${hint.includes(index) ? 'is-hint' : ''} ${motion?.cells.includes(index) ? `is-arriving is-${motion.kind}` : ''}`} data-career-cell={index} data-piece-id={tile?.pieceId ?? ''} data-needed-for-goal={goalTileIds.has(tile?.id) || undefined} aria-label={piece ? `${piece.name}, ${familyName(piece.familyId)}, level ${piece.tier}.${goalTileIds.has(tile?.id) ? ' Keep for your chosen letter.' : ''} Row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}` : `Empty space, row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}`} aria-pressed={selected === index} tabIndex={focusIndex === index ? 0 : -1} onFocus={() => setFocusIndex(index)} onKeyDown={e => boardKey(e, index)} onClick={() => clickCell(index)} disabled={busy} draggable={!!tile && !busy} onDragStart={e => { if (stateRef.current.sound) audio.ensureAudio(); drag.current = { from: index, tileId: tile.id, revision: state.revision }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'moticos-piece'); }} onDragEnd={() => { drag.current = null; }} onDragOver={e => { if (drag.current !== null) e.preventDefault(); }} onDrop={e => dropOn(e, index)}>{piece ? <><Artwork key={tile.id} pieceId={piece.id} cropped />{goalTileIds.has(tile.id) && <span className="career-goal-mark" aria-hidden="true">✓</span>}<span className="career-cell-label"><span className="career-cell-name-full">{piece.shortName}</span><span className="career-cell-name-compact">{COMPACT_BOARD_LABELS[piece.id] ?? piece.shortName}</span></span><span className="career-tier" aria-hidden="true">{piece.tier}</span></> : <span className="career-empty-dot" aria-hidden="true">·</span>}</button>; })}</div></BoardViewport>
      <div className="career-producers" aria-label="Free renewable supplies">{visibleFamilies.map(family => { const output = nextOutput(state, family.id), source = state.sources[family.id]; return <div className={`career-producer ${family.id} ${hintAction?.familyId === family.id ? 'is-goal-hint' : ''}`} key={family.id}><button ref={el => { supplies.current[family.id] = el; }} className="career-supply" disabled={busy} onClick={() => supply(family.id)} aria-label={`Add free ${family.shortName} supply: next ${output.name}, level ${output.tier}`}><span className="career-source-art"><Artwork pieceId={output.id} /></span><span><strong>{family.shortName}<span className="career-source-descriptor"> {source.sorter ? 'sorter I' : 'supply'}</span></strong><small>Next: <span className="career-source-level-word">level </span><span className="career-source-level-short">L</span>{output.tier} · free</small>{source.sorter ? <span className="career-cycle" aria-label={`Repeating levels 1, 1, 2. Next is step ${source.cursor + 1}`}>{[1, 1, 2].map((tier, i) => <i key={i} className={i === source.cursor ? 'is-next' : ''}>{tier}</i>)}</span> : <span className="career-source-note">Always available</span>}</span><span className="career-plus" aria-hidden="true">+</span></button>{source.sorter > 0 && <button className="career-basic-supply" aria-label={`Add free ${family.shortName} level-1 scrap without advancing the sorter`} disabled={busy} onClick={() => supply(family.id, true)}><span className="career-basic-long">Need level 1? Add free scrap</span><span className="career-basic-short" aria-hidden="true">L1<br />+</span></button>}</div>; })}</div>
      <nav className="career-tools" aria-label="Board tools"><button disabled={busy || !state.history.length} onClick={() => perform({ type: 'undo' }, 'Undone. Source, pieces and material restored. Discoveries stay collected.')}><Undo2 size={17} /><span>Undo</span></button><button disabled={busy || !selectedPiece || selectedPiece.tier === 1} onClick={() => perform({ type: 'cut', at: selected, tileId: selectedTile.id }, 'Cut into two matching pieces. No material or rewards lost.')}><Scissors size={17} /><span>Cut</span></button><button disabled={busy || !selectedPiece} onClick={recycle}><Trash2 size={17} /><span>Recycle</span></button><button disabled={busy} onClick={showHint}><Lightbulb size={17} /><span>Hint</span></button>{state.unlockedSources.length > 2 ? <button className="career-source-picker" onClick={() => setOverlay({ type: 'sources' })}><SlidersHorizontal size={17} /><span>Sources</span></button> : <button className="career-inspect" disabled={!selectedPiece} onClick={() => { if (selectedPiece) setOverlay({ type: 'postcard', pieceId: selectedPiece.id }); }}><ImageIcon size={17} /><span>View art</span></button>}</nav>
    </section><aside className="career-orders" aria-labelledby="career-orders-title"><div className="career-section-heading"><h2 id="career-orders-title">On the desk</h2><span>{state.orders.length}/{replay ? 1 : orderCapacity(state)} {state.orders.length === 1 ? 'request' : 'requests'}</span></div>
      <p className="career-desk-note">{CHAPTER_COPY[chapter.id]?.opening ?? 'Make the pictured pieces. Send a letter. Keep the art.'}</p>
      <div className="career-order-list">{state.orders.map(order => <OrderCard key={order.id} order={order} state={state} busy={busy} complete={complete} focus={focusOrder} />)}</div>
      {!state.orders.length && <p className="career-empty-orders">{replay ? 'Practice letter complete. Return to your career whenever you’re ready.' : 'No distinct eligible request is available for this slot yet.'}</p>}
      {!replay && level.level === 1 && <div className="career-next-step"><span className="career-eyebrow">YOUR NEXT CHAPTER STEP</span><p>Reach <b>{nextLevel?.xp} XP</b> to choose between two letters and open the sorter shop.</p></div>}
      {!replay && usefulSorter && !finished && <button className="career-upgrade-nudge" onClick={() => setOverlay({ type: 'shop' })}><ShoppingBag size={20} /><span><strong>{coinBalance(state) >= usefulSorter.price ? `${familyName(usefulSorter.familyId)} sorter is within reach` : `Save ${usefulSorter.price} coins for a ${familyName(usefulSorter.familyId)} sorter`}</strong><small>A level-2 piece every third draw.</small></span><ArrowRight size={16} /></button>}
      {lastDelivery && <div className={`career-postmark ${celebration ? 'is-new-delivery' : ''}`} key={celebration ?? 'resume'}><span>✓ {replay ? 'PRACTICED' : saveStatus === 'saved' ? 'SENT & SAVED' : 'PRACTICE ONLY'}</span><p>{lastDeliveryLetter?.title ?? 'Another paper hello'}</p><small>{lastDelivery.xp} XP · {lastDelivery.coins} coins{saveStatus === 'practice' ? ' · temporary' : ''}</small>{lastDeliveryLetter && <button className="career-receipt-postcard" onClick={() => setOverlay({ type: 'sent-letter', letter: lastDeliveryLetter })}>View sent letter</button>}</div>}
      {!replay && <button className="career-correspondence-link" onClick={() => setOverlay({ type: 'letters' })}><Mail size={17} />{volume.storyIds.filter(id=>state.milestones.includes(id)).length}/{volume.storyIds.length} letters in this correspondence sent <ArrowRight size={14} /></button>}
    </aside></div>
    <div className="career-status" role="status" aria-live="polite"><span className={`career-status-dot ${saveStatus === 'practice' ? 'is-warning' : ''}`} /><span className="career-status-long">{notice}</span><span className="career-status-short" aria-hidden="true">{briefNotice}</span></div>
    {finished && <section className="career-finished"><div className="career-finish-stamp">LETTERS<br />SENT</div><div><span className="career-eyebrow">{chapterSummary.total} LETTERS · {chapter.title.toUpperCase()}</span><h2>{chapterSummary.canContinue ? 'A new correspondence is waiting.' : 'The table is still yours.'}</h2><p className="career-chapter-ending">{CHAPTER_COPY[chapter.id]?.ending}</p>{endingNote && <p>{endingNote}</p>}<nav className="career-ending-actions" aria-label="Completed chapter actions"><button onClick={() => setOverlay({ type: chapterSummary.canContinue ? 'chapter' : 'letters' })}>{chapterSummary.canContinue ? `Open ${chapter.nextTitle}` : 'Open your correspondence'}</button>{canEnterContinuation(state) && <button onClick={() => setOverlay({type:'continuation',boundaryId:boundaryAt(state)?.id})}>{boundaryAt(state)?.entryButton}</button>}</nav></div></section>}
    <footer className="career-footer"><span>Inspired by the playful correspondence of mail art.</span><span>{replay ? 'Isolated practice' : saveStatus === 'saved' ? 'Saved on this browser' : 'Temporary session'} · No timers. No energy.</span></footer>
    {overlay && <Dialog title={overlay.type === 'continuation' ? boundaryById(overlay.boundaryId)?.entryButton : overlay.type === 'sent-letter' ? overlay.letter.title : overlay.type === 'chapter' ? chapter.nextTitle : overlay.type === 'sources' ? 'Choose your two sources' : overlay.type === 'progress' ? 'Your career progress' : overlay.type === 'orders' ? 'Choose a request' : overlay.type === 'more' ? 'Your correspondence desk' : overlay.type === 'shop' ? 'A useful little upgrade' : overlay.type === 'collection' ? 'Your collected pictures' : overlay.type === 'letters' ? 'Your correspondence' : overlay.type === 'recycle' ? 'Recycle this picture?' : overlay.type === 'postcard' ? CATALOG.pieceOf(overlay.pieceId).name : 'A few ways to play'} close={() => setOverlay(null)}>
      {overlay.type === 'continuation' && <div className="career-chapter-panel"><p>{boundaryById(overlay.boundaryId)?.entryCopy}</p><p className="career-chapter-ending">{CHAPTER_COPY[boundaryById(overlay.boundaryId)?.fromChapterId]?.ending}</p><p>{CHAPTER_COPY[boundaryById(overlay.boundaryId)?.toChapterId]?.opening}</p><p>Your table, balances, purchases, source positions and optional letters stay with you. Opening begins a new Undo history.</p><p role="status">{notice}</p><div className="career-dialog-actions"><button disabled={busy||!canEnterContinuation(state,overlay.boundaryId)} onClick={enterContinuation}>Begin {CHAPTERS.find(c=>c.id===boundaryById(overlay.boundaryId)?.toChapterId)?.title}</button><button onClick={()=>setOverlay(null)}>{boundaryById(overlay.boundaryId)?.deferButton}</button></div></div>}
      {overlay.type === 'progress' && <div className="career-progress-panel"><strong>{progress.heading}</strong><p>{progress.detail}</p>{!replay && saveStatus === 'saved' && <><p>{state.xp} total XP · {coinBalance(state)} coins available · {volume.storyIds.filter(id=>state.milestones.includes(id)).length}/{volume.storyIds.length} letters in this correspondence sent.</p><p>Your collected pictures remain after sending an order. Choosing a request is free; upgrades spend coins only when you press Buy.</p></>}<div className="career-dialog-actions">{canEnterContinuation(state)&&<button onClick={()=>setOverlay({type:'continuation',boundaryId:boundaryAt(state)?.id})}>{boundaryAt(state)?.entryButton}</button>}{progress.shop && <button onClick={() => setOverlay({ type: 'shop' })}>See upgrades</button>}{progress.complete && <button onClick={() => setOverlay({ type: chapterSummary.canContinue ? 'chapter' : 'letters' })}>{chapterSummary.canContinue ? 'Open the next chapter' : 'View completed letters'}</button>}<button onClick={() => setOverlay(null)}>Back to my board</button></div></div>}
      {overlay.type === 'orders' && <><HeldLetters state={state} busy={busy} choose={id => chooseKept('resume-optional', id)} returnToStory={() => chooseKept('return-to-story')} /><p>Choose your next goal. Its free sources appear beside the board. Your other pieces stay on the table. Sending uses the pictured pieces; the art stays collected.</p><p className="career-panel-feedback" role="status">{notice}</p><div className="career-order-choices">{state.orders.map(order => <section key={order.id}><OrderCard order={order} state={state} busy={busy} complete={complete} focus={focusOrder} /><RequestDetails order={order} /><button className="career-focus-order" aria-pressed={focusedOrder?.id === order.id} disabled={busy} onClick={() => focusOrder(order, true)}>{focusedOrder?.id === order.id ? 'Keep this on my board' : 'Show this on my board'}</button></section>)}</div>{finished && <p className="career-panel-complete">{chapterSummary.canContinue ? 'This chapter is complete. Open the next chapter from your board when you’re ready.' : 'This correspondence is complete. These optional orders earn coins; they do not open unwritten chapters or upgrades.'}</p>}</>}
      {overlay.type === 'more' && <div className="career-more-panel"><p className={saveStatus === 'practice' ? 'career-menu-warning' : ''} role={saveStatus === 'practice' ? 'alert' : 'status'}>{warning ?? notice}</p><nav aria-label="Optional panels">{canEnterContinuation(state)&&<button onClick={()=>setOverlay({type:'continuation',boundaryId:boundaryAt(state)?.id})}>{boundaryAt(state)?.entryButton}</button>}{state.unlockedSources.length > 2 && <button onClick={() => setOverlay({ type: 'sources' })}><SlidersHorizontal size={19} />Choose sources</button>}{selectedPiece && <button onClick={() => setOverlay({ type: 'postcard', pieceId: selectedPiece.id })}><ImageIcon size={19} />View selected art</button>}<button onClick={() => setOverlay({ type: 'progress' })}><Check size={19} />Career progress</button><button disabled={replay} onClick={() => setOverlay({ type: 'shop' })}><ShoppingBag size={19} />Upgrades</button><button onClick={() => setOverlay({ type: 'collection' })}><BookOpen size={19} />Collection · {collection.collected}/{collection.total}</button>{lastDeliveryLetter && <button onClick={() => setOverlay({ type: 'sent-letter', letter: lastDeliveryLetter })}><Mail size={19} />Last letter</button>}<button disabled={replay} onClick={() => setOverlay({ type: 'letters' })}><Mail size={19} />Correspondence · {volume.storyIds.filter(id=>state.milestones.includes(id)).length}/{volume.storyIds.length}</button><button onClick={() => setOverlay({ type: 'help' })}><HelpCircle size={19} />How to play</button></nav><button aria-pressed={state.sound} disabled={busy} onClick={toggleSound}>{state.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}{state.sound ? 'Turn sound off' : 'Turn sound on'}</button><button className="career-text-size" aria-pressed={state.largeText} disabled={busy} onClick={() => perform({ type: 'large-text', enabled: !state.largeText }, state.largeText ? 'Standard text size.' : 'Larger text is on. The page can scroll so nothing is clipped.')}>{state.largeText ? 'Use standard text' : 'Use larger text'}</button><p className="career-large-text-explanation">Standard play keeps the board and its essential controls on one screen. Larger text may scroll so names, artwork and controls stay readable.</p>{replay && <button onClick={exitReplay}>Return to career</button>}</div>}
      {overlay.type === 'help' && <div className="career-help"><p className="career-panel-feedback" role="status">{notice}</p><button className="career-text-size" aria-pressed={state.largeText} disabled={busy} onClick={() => perform({ type: 'large-text', enabled: !state.largeText }, state.largeText ? 'Standard text size.' : 'Larger text is on. The page can scroll so nothing is clipped.')}>{state.largeText ? 'Use standard text' : 'Use larger text'}</button><p>Make collages for the requests on your desk. Two identical pictures become the next picture in that family.</p><ol><li>Tap a piece, then its matching piece. You can also drag with a mouse.</li><li>Use either free source whenever you need material. New chapters open new sources. Choose a request to bring its sources forward, or use Sources to change the two shown. Select an empty space first to put it there.</li><li>When a request is ready, Send consumes those pieces and awards its displayed XP and coins together. Its art remains collected.</li><li>Spend coins on useful sorters or a third order. Supply itself is always free.</li></ol><p>Cut turns a picture into two of its previous level and needs one empty space. Recycle frees any space and pays nothing. Undo reverses either, and also restores a supply’s cursor. Sending a letter, buying an upgrade or entering a chapter clears Undo. Source changes keep every piece and source cursor.</p><p>Hint follows your chosen goal, protects pieces already ready for it, and explains when to Send, supply, Cut or make room. Keyboard: use arrow keys on the board, Enter or Space to select and merge, and Escape to clear selection. Reduced motion follows your device setting. Sound starts off.</p><p>Career progress is local to this browser. No in-game letter sends a real message.</p></div>}
      {overlay.type === 'shop' && <><p className="career-shop-intro">Choose a family to specialize in, or save for more choice on your desk. Every order is possible with free supplies.</p><div className="career-shop-balance"><Coins size={20} />{coinBalance(state)} {saveStatus === 'practice' ? 'temporary practice coins' : 'coins to spend'}</div>{saveStatus === 'practice' && <p className="career-panel-warning" role="alert">Unsaved practice. These coins and upgrades are temporary and are not banked.</p>}{purchaseFeedback && <p className="career-purchase-feedback" role="status">{purchaseFeedback}</p>}<div className="career-upgrades">{visibleUpgrades.map(u => { const owned = state.upgrades[u.id], locked = level.level < u.level, short = coinBalance(state) < u.price; return <article key={u.id}><span className="career-upgrade-symbol">{u.familyId ? <Artwork pieceId={FAMILIES.find(f => f.id === u.familyId).pieceIds[1]} /> : <Mail size={38} />}</span><div><h3>{u.name}</h3><p>{u.description}</p><small>{u.familyId ? 'Free level-1 scraps remain available. Existing pieces stay as they are.' : 'Adds one optional request without replacing the letters you are making.'}</small></div><button disabled={busy || owned || locked || short} onClick={() => perform({ type: 'purchase', upgradeId: u.id, expectedLevel: 0 })}>{owned ? 'Owned ✓' : locked ? `At level ${u.level}` : `Buy · ${u.price} coins`}</button>{!owned && !locked && short && <small className="career-price-gap">{u.price - coinBalance(state)} more coins to go</small>}</article>; })}</div><p className="career-dialog-footnote">Purchases are final for this career and begin a new Undo history.</p></>}
      {overlay.type === 'collection' && <CollectionPanel state={state} Artwork={Artwork} openPostcard={pieceId=>setOverlay({type:'postcard',pieceId})}/>}
      {overlay.type === 'postcard' && <Postcard key={overlay.pieceId} pieceId={overlay.pieceId} chapterTitle={postcardSubtitle(overlay.pieceId)} />}
      {overlay.type === 'sent-letter' && <SentLetter letter={overlay.letter} openPostcard={pieceId => setOverlay({ type: 'postcard', pieceId })} />}
      {overlay.type === 'recycle' && <div className="career-recycle-confirm"><p className="career-panel-feedback" role="status">{notice}</p><Artwork pieceId={overlay.pieceId} /><p>Recycle <b>{CATALOG.pieceOf(overlay.pieceId).name}</b> to free its space? You’ll earn no XP or coins. Its art stays collected, and you can Undo until your next delivery or purchase.</p><div className="career-dialog-actions"><button onClick={() => setOverlay(null)}>Keep picture</button><button className="career-danger" disabled={busy} onClick={async () => { const owner = overlay; const result = await perform({ type: 'recycle', at: overlay.at, tileId: overlay.tileId, confirmed: true }, 'Picture recycled. Its art stays collected. Undo is available.'); if (result?.ok) setOverlay(current => current === owner ? null : current); }}>Recycle picture</button></div></div>}
      {overlay.type === 'chapter' && <div className="career-chapter-panel"><p className="career-panel-feedback" role="status">{notice}</p><span className="career-eyebrow">CHAPTER {chapter.number} COMPLETE · {chapterSummary.total} LETTERS SENT</span><p className="career-chapter-ending">{CHAPTER_COPY[chapter.id]?.ending}</p><p>{chapter.nextPreview}</p><p>{CHAPTER_COPY[chapter.nextId]?.opening}</p><p>Your pieces, XP, coins, discoveries, source cursors and upgrades remain. Earlier optional letters are kept in Choose a request; the paid desk request stays on its desk. Opening the chapter begins a new Undo history. You can also stop here and come back whenever you like.</p><div className="career-chapter-preview-art" aria-hidden="true">{CHAPTERS.find(c => c.id === chapter.nextId)?.entrySources.map(id => <Artwork key={id} pieceId={FAMILIES.find(f => f.id === id).pieceIds[0]} />)}</div><div className="career-dialog-actions"><button disabled={busy || !chapterSummary.canContinue} onClick={startChapter}>{chapterSummary.canContinue ? `Begin ${chapter.nextTitle}` : 'Chapter already changed'}<ArrowRight size={17} /></button><button onClick={() => setOverlay(null)}>Stay at my table</button></div></div>}
      {overlay.type === 'sources' && <SourcePicker state={state} busy={busy} notice={notice} requestedFamilyId={overlay.requestedFamilyId} chooseSource={(sourceSlot, familyId) => perform({ type: 'select-source', sourceSlot, familyId }, `${familyName(familyId)} source is on the ${sourceSlot === 0 ? 'left' : 'right'}. Your pieces and sorter positions are unchanged.`)} close={() => setOverlay(null)} />}
      {overlay.type === 'letters' && <><HeldLetters state={state} busy={busy} choose={id=>chooseKept('resume-optional',id)} returnToStory={()=>chooseKept('return-to-story')}/><LettersPanel state={state} RequestDetails={RequestDetails} openSent={letter=>setOverlay({type:'sent-letter',letter})} practice={enterPractice}/>{chapterSummary.campaignComplete&&<p>{progress.detail}</p>}{canEnterContinuation(state)&&<button className="career-focus-order" onClick={()=>setOverlay({type:'continuation',boundaryId:boundaryAt(state)?.id})}>{boundaryAt(state)?.entryButton}</button>}{chapterSummary.canContinue&&<button className="career-focus-order" onClick={()=>setOverlay({type:'chapter'})}>Open {chapter.nextTitle}</button>}</>}
    </Dialog>}
  </main>;
}
export default function CareerGarden() {
  const [session] = useState(() => createCareerSession()), [initial, setInitial] = useState(null);
  useEffect(() => { let mounted = true; session.open().then(result => { if (mounted) setInitial(result); }); return () => { mounted = false; }; }, [session]);
  return initial ? <CareerGame session={session} initial={initial} /> : <main className="career-opening" role="status">Opening your paper garden…</main>;
}
