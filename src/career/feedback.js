import { CATALOG, CHAPTERS, FAMILIES, STORY_ORDERS, availableUpgrades, chapterDefinition, chapterStories, coinBalance, levelDefinition, nextLevelDefinition, progressionLevels, contentPack, orderTemplate } from './content.js';
import { campaignComplete, canStartNextChapter, chapterComplete, goalHint, matchingTiles } from './engine.js';

// Presentation is derived from committed state. No animation or cue can award
// rewards, unlock a source, change focus, or write a save.
export const familyName = id => FAMILIES.find(f => f.id === id)?.shortName ?? id;
// Resolve the actual upcoming chapter, rather than assuming the first transition.
export function mobileGoalMode(state) {
  if (state.orders.some(order => order.id === state.focusedOrderId)) return 'order';
  return canStartNextChapter(state) ? 'chapter' : 'empty';
}
export function nextChapterEntryCue(state) {
  const nextId = chapterDefinition(state)?.nextId;
  const next = contentPack(state)?.chapters.find(chapter => chapter.id === nextId);
  const names = next?.entrySources.map(familyName) ?? [];
  if (!names.length) return '';
  return names.length === 1
    ? `Open a free ${names[0]} source. Keep your board.`
    : `Open free ${names.join(' and ')} sources. Keep your board.`;
}
export function orderPresentation(order) {
  if (!order) return { title: 'Choose a request', label: 'YOUR NEXT LETTER', template: null };
  const template = orderTemplate(order.templateId, order.contentVersion, order.origin);
  const chapter = contentPack(order.contentVersion)?.chapters.find(c => c.storyIds.includes(order.storyLetterId));
  const number = chapter?.storyIds.indexOf(order.storyLetterId) + 1;
  return {
    template, title: template?.title ?? 'Another paper exchange',
    label: order.origin === 'practice' ? 'PRACTICE LETTER' : number ? `LETTER ${String(number).padStart(2, '0')} / ${String(chapter.storyIds.length).padStart(2, '0')}` : order.xp ? 'OPTIONAL ORDER' : 'OPTIONAL COIN ORDER',
    shortLabel: order.origin === 'practice' ? 'Practice' : number ? `Letter ${number}/${chapter.storyIds.length}` : 'Optional order',
  };
}
export function goalAccessibleLabel(state, order, status = 'saved') {
  if (!order) return 'No active request. Open your correspondence for details.';
  const targets = order.requirements.map(requirement => {
    const piece = CATALOG.pieceOf(requirement.pieceId);
    const owned = Math.min(requirement.quantity, state.board.filter(tile => tile?.pieceId === piece.id).length);
    return `${requirement.quantity} ${piece.name}, ${familyName(piece.familyId)} level ${piece.tier}, ${owned} of ${requirement.quantity} ready`;
  }).join('; ');
  const rewardKind = state.mode === 'replay' ? 'Practice rewards' : status === 'practice' ? 'Temporary practice rewards' : 'Rewards';
  return `Chosen goal: ${orderPresentation(order).title}. ${targets}. ${rewardKind}: ${order.xp} XP and ${order.coins} coins. ${matchingTiles(state, order) ? 'Ready to Send.' : 'Make the missing pieces.'} Open request details.`;
}
export function postcardChapter(pieceId) {
  const familyId = CATALOG.pieceOf(pieceId)?.familyId;
  return CHAPTERS.find(chapter => STORY_ORDERS.some(letter => letter.chapterId === chapter.id && letter.requirements.some(r => CATALOG.pieceOf(r.pieceId)?.familyId === familyId))) ?? null;
}
export const postcardSubtitle = pieceId => postcardChapter(pieceId)?.title ?? 'A little correspondence';
export function chapterProgress(state) {
  const chapter = chapterDefinition(state), stories = chapterStories(state);
  return { chapter, stories, sent: stories.filter(o => state.milestones.includes(o.id)).length, total: stories.length,
    allTotal: STORY_ORDERS.length, complete: chapterComplete(state), canContinue: canStartNextChapter(state), campaignComplete: campaignComplete(state) };
}
export function progressCue(state, status = 'saved') {
  if (state.mode === 'replay') return { heading: 'Letter practice', cue: 'No career rewards', detail: 'Practice pays 0 XP and 0 coins. Your saved career is unchanged.', shop: false, complete: false };
  if (status === 'practice') return { heading: 'Unsaved practice', cue: 'Nothing is banked', detail: 'This temporary session cannot save. Its XP, coins and upgrades are not banked.', shop: false, complete: false };
  const { chapter, sent, total, complete, canContinue, campaignComplete: allComplete } = chapterProgress(state);
  const level = levelDefinition(state), next = nextLevelDefinition(state);
  const heading = next ? `L${level.level} · ${state.xp - level.xp}/${next.xp - level.xp} XP` : `Level ${level.level} · ${state.xp} XP`;
  if (canContinue) return { heading: `${chapter.title} complete`, cue: 'Open the next chapter', detail: `${chapter.title}: all ${total} letters sent. Open ${chapter.nextTitle} when you are ready. Your board, earned rewards, upgrades and collected art stay with you. A free ${familyName(CHAPTERS.find(c => c.id === chapter.nextId).entrySources[0])} source opens on entry.`, shop: true, complete: true };
  if (allComplete) return { heading: 'Campaign complete', cue: `${state.discoveries.length}/${CATALOG.PIECES.length} pictures collected`, detail: `All ${STORY_ORDERS.length} authored letters are sent. Keep exploring the collection, practice a letter, or make optional coin orders. All sixteen chapters are complete. ${availableUpgrades(state).every(u => state.upgrades[u.id]) ? 'Extra coins have no further use in this campaign.' : 'Extra coins can buy remaining authored upgrades; they do not open unwritten content.'}`, shop: true, complete: true };
  if (level.level === 1) return { heading, cue: `Shop opens at ${next?.xp} XP`, detail: `Make the pictured target, then Send to earn XP and coins. At ${next?.xp} total XP, Level 2 opens two active requests, level-4 targets and the sorter shop. A sorter makes a level-2 piece every third draw; its price is shown in Upgrades.`, shop: false, complete: false };
  const pendingSource = contentPack(state).sourceRules.find(r => r.chapterId === chapter.id && !state.unlockedSources.includes(r.id));
  if (pendingSource) return { heading, cue: `Two letters open ${familyName(pendingSource.id)}`, detail: `Finish both opening letters to open the free ${familyName(pendingSource.id)} source. Choosing a request brings its needed sources to your board; your other pieces stay where you left them.`, shop: true, complete: false };
  const available = availableUpgrades(state).filter(u => !state.upgrades[u.id] && u.level <= level.level);
  const cheapest = Math.min(...available.map(u => u.price));
  const cue = available.length ? coinBalance(state) >= cheapest ? 'Upgrade affordable' : `${cheapest - coinBalance(state)} coins to an upgrade` : `${sent}/${total} letters sent`;
  const detail = level.level === 2 ? `Level 2 opens two active requests, level-4 targets and Bird and Fern sorters. Level 3 arrives at ${progressionLevels(state).find(l => l.level === 3)?.xp} total XP. Upgrade prices are shown before purchase.` : level.level === 3 ? 'Level 3 opens level-5 requests and the 100-coin order desk, which adds a third active request. Reach Level 4 and send this chapter’s remaining story letters to continue.' : next ? `${chapter.title}: ${sent}/${total} letters sent. Reach Level ${next.level} at ${next.xp} total XP. Choose between a quick letter and a longer picture; free supplies can always make either.` : `${chapter.title}: ${sent}/${total} letters sent. Finish the remaining story letters to ${chapter.nextId ? 'open the next chapter' : 'complete the campaign'}. New optional orders award coins; XP already promised on an active order will still be paid.`;
  return { heading, cue, detail, shop: true, complete };
}
export function levelUnlock(previous, next) {
  if (previous.mode === 'replay' || next.mode === 'replay') return null;
  const before = levelDefinition(previous).level, after = levelDefinition(next).level;
  if (after <= before) return null;
  if (after === 2) return { brief: 'Level 2 · requests + sorters', detail: 'Level 2 reached: two active requests, level-4 targets and the 50-coin sorter upgrades are now unlocked.' };
  if (after === 3) return { brief: 'Level 3 · level-5 orders + desk', detail: 'Level 3 reached: level-5 requests and the 100-coin third-order desk are now unlocked.' };
  const unlocked = availableUpgrades(next).filter(u => u.level > before && u.level <= after && !next.upgrades[u.id]);
  return { brief: `Level ${after}${unlocked.length ? ` · ${unlocked[0].name}` : ' · a new milestone'}`, detail: `Level ${after} reached.${unlocked.length ? ` ${unlocked.map(u => `${u.name} (${u.price} coins)`).join(' and ')} ${unlocked.length === 1 ? 'is' : 'are'} now available in Upgrades.` : ' Finish the remaining story letters to complete this chapter.'}` };
}
export function unlockedSourceCue(previous, next) {
  const names = next.unlockedSources.filter(id => !previous.unlockedSources.includes(id)).map(familyName);
  return names.length ? { brief: `${names.join(' + ')} source open · free`, detail: `${names.join(' and ')} ${names.length === 1 ? 'source is' : 'sources are'} now open. Choose its request or use Sources to put it beside your board. Your existing pieces stay on the table.` } : null;
}
export function nextBoardIndex(index, key) {
  const row = Math.floor(index / 5), column = index % 5;
  if (key === 'ArrowLeft') return column > 0 ? index - 1 : index;
  if (key === 'ArrowRight') return column < 4 ? index + 1 : index;
  if (key === 'ArrowUp') return row > 0 ? index - 5 : index;
  if (key === 'ArrowDown') return row < 4 ? index + 5 : index;
  return index;
}
export function passiveGoalMessage(state) {
  const guidance = goalHint(state);
  if (guidance.kind !== 'merge') return guidance.message;
  const name = CATALOG.pieceOf(state.board[guidance.pair?.[0]]?.pieceId)?.shortName;
  const pieces = name ? `two matching ${name} pieces` : 'two matching pieces';
  return state.board.every(Boolean) ? `Merge ${pieces} to free a space.` : `Merge ${pieces} toward your chosen letter.`;
}
export function returnOrientation(state) {
  if (state.mode === 'replay') return { brief: 'Practice · your career is unchanged', detail: `This is isolated letter practice: 0 XP and 0 coins. ${passiveGoalMessage(state)}` };
  if (!state.revision) return { brief: 'Match the birds for your first letter.', detail: 'Start with the coral birds. Tap one, then its matching picture to make the Riverwing requested above. Then Send your first letter.' };
  const selected = state.orders.find(o => o.id === state.focusedOrderId);
  if (canStartNextChapter(state) && !selected) return { brief: `${chapterDefinition(state).title} complete · next chapter ready`, detail: progressCue(state).detail };
  if (campaignComplete(state) && !selected) return { brief: 'Letters complete · explore or practice', detail: progressCue(state).detail };
  const order = state.orders.find(o => o.id === state.focusedOrderId), hint = goalHint(state);
  return { brief: state.mode === 'replay' ? 'Practice · your career is unchanged' : hint.kind === 'send' ? 'Welcome back · your letter is ready' : `Chapter ${chapterDefinition(state).number} · continue your chosen letter`, detail: `Welcome back to ${chapterDefinition(state).title}.${order ? ` You were making “${orderPresentation(order).title}”. ${order.requirements.map(r => `${Math.min(r.quantity, state.board.filter(t => t?.pieceId === r.pieceId).length)} of ${r.quantity} ${CATALOG.pieceOf(r.pieceId).name} ready`).join('; ')}.` : ''} ${passiveGoalMessage(state)}` };
}
export function failureBrief(action, state, result) {
  if (result.stale || result.reason === 'stale' || result.code === 'stale' || /changed|newer|another tab/i.test(result.message ?? '')) return 'Board changed · choose the piece again';
  if (action.type === 'supply' && state.board.every(Boolean)) return 'Board full · merge or Recycle first';
  if (action.type === 'cut' && state.board.every(Boolean)) return 'Cut needs space · Recycle first';
  if (action.type === 'move' && state.board[action.from]?.pieceId === state.board[action.to]?.pieceId && !CATALOG.nextPiece(state.board[action.from]?.pieceId)) return 'Final picture · Send, Cut or Recycle';
  return 'Action stopped · details in More';
}

export function completedLetter(state, storyId) {
  const version = state.storyCompletions?.[storyId]?.contentVersion;
  if (version !== undefined) return orderTemplate(storyId, version, 'story');
  const receipt = state.receipts.find(r => r.type === 'delivery' && r.storyLetterId === storyId);
  return receipt ? orderTemplate(receipt.templateId, receipt.contentVersion, 'story') : null;
}
export function failureDetail(action, state, result) {
  const brief = failureBrief(action, state, result);
  if (brief.startsWith('Board changed')) return result.message ?? 'Another action changed the board. Choose the piece again from the latest saved table.';
  if (brief.startsWith('Board full')) return 'Your table is full. Merge a pair, Send a ready request, or Recycle a piece to make room. This failed supply did not advance the source.';
  if (brief.startsWith('Cut needs space')) return 'Cut needs one empty space. Send a ready request or Recycle a piece first. Recycle can be undone until your next delivery, purchase or chapter entry.';
  if (brief.startsWith('Final picture')) return 'Final pictures cannot merge again. Send it if requested, Cut it to the previous level with an empty space, or Recycle it. Its discovered art stays collected.';
  return result.message ?? 'That action could not be completed. Check the shown board and try again.';
}

export function correspondenceTitle(state, letter, number) {
  if (state.milestones.includes(letter.id)) return completedLetter(state, letter.id)?.title ?? `Letter ${number} · sent`;
  const active = state.orders.find(order => order.storyLetterId === letter.id);
  return active ? orderPresentation(active).title : letter.title;
}
