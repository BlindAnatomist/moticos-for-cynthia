import { CATALOG, LEVELS, UPGRADES, coinBalance, levelDefinition } from './content.js';
import { chapterComplete } from './engine.js';

// Presentation only: derive cues from the authoritative saved career.
// No new timers, rewards, persistence fields or transaction behavior.
export function progressCue(state, status = 'saved') {
  if (state.mode === 'replay') return { heading: 'Letter practice', cue: 'No career rewards', detail: 'Practice pays 0 XP and 0 coins. Your saved career is unchanged.', shop: false, complete: false };
  if (status === 'practice') return { heading: 'Unsaved practice', cue: 'Nothing is banked', detail: 'This temporary session cannot save. Its XP, coins and upgrades are not banked.', shop: false, complete: false };
  const level = levelDefinition(state), next = LEVELS.find(l => l.level === level.level + 1);
  const heading = next ? `L${level.level} · ${state.xp - level.xp}/${next.xp - level.xp} XP` : `Level 4 · ${state.xp} XP`;
  if (chapterComplete(state)) return { heading: 'Garden complete', cue: 'Optional coin orders', detail: 'All nine story letters are complete. Keep your collection, replay a letter for no rewards, or make optional coin orders. The next chapter is not released yet.', shop: true, complete: true };
  if (level.level === 1) return { heading, cue: 'Shop opens at 80 XP', detail: 'At 80 total XP, Level 2 opens two active requests, level-4 targets and the sorter shop. Each sorter costs 50 coins and gives a level-2 piece every third draw.', shop: false, complete: false };
  const available = UPGRADES.filter(u => !state.upgrades[u.id] && u.level <= level.level);
  const cheapest = Math.min(...available.map(u => u.price));
  const cue = available.length ? coinBalance(state) >= cheapest ? 'Upgrade affordable' : `${cheapest - coinBalance(state)} coins to an upgrade` : 'Finish the story letters';
  const detail = level.level === 2 ? 'Level 2 opens two active requests, level-4 targets and 50-coin Bird and Fern sorters. Level 3 arrives at 250 total XP.' : level.level === 3 ? 'Level 3 opens level-5 requests and the 100-coin order desk, which adds a third active request. Reach Level 4 and send all nine story letters to complete this chapter.' : 'Level 4 is reached. Send the remaining story letters to complete this chapter. New optional orders award coins; any XP already promised on an active order will still be paid.';
  return { heading, cue, detail, shop: true, complete: false };
}

export function levelUnlock(previous, next) {
  if (previous.mode === 'replay' || next.mode === 'replay') return null;
  const before = levelDefinition(previous).level, after = levelDefinition(next).level;
  if (after <= before) return null;
  if (after === 2) return { brief: 'Level 2 · two requests + sorters', detail: 'Level 2 reached: two active requests, level-4 targets and the 50-coin sorter upgrades are now unlocked.' };
  if (after === 3) return { brief: 'Level 3 · level-5 orders + desk', detail: 'Level 3 reached: level-5 requests and the 100-coin third-order desk are now unlocked.' };
  return { brief: 'Level 4 · finish your story letters', detail: 'Level 4 reached. Complete all nine story letters to finish the chapter; new optional orders award coins.' };
}

export function failureBrief(action, state, result) {
  if (result.stale || result.reason === 'stale' || /changed|newer|another tab/i.test(result.message ?? '')) return 'Board changed · choose the piece again';
  if (action.type === 'supply' && state.board.every(Boolean)) return 'Board full · merge or Recycle first';
  if (action.type === 'cut' && state.board.every(Boolean)) return 'Cut needs space · Recycle first';
  if (action.type === 'move' && state.board[action.from]?.pieceId === state.board[action.to]?.pieceId && !CATALOG.nextPiece(state.board[action.from]?.pieceId)) return 'Final picture · Send, Cut or Recycle';
  return 'Action stopped · details in More';
}
