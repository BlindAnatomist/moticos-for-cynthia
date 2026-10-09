import assert from 'node:assert/strict';

// Independent expected UI text: preserve letter position and both reward fields.
export function storyRewardText(chapter,order) {
  assert.equal(order.origin,'story');
  const position=chapter.storyIds.indexOf(order.storyLetterId)+1;
  assert(position>0,'Story must belong to the expected chapter');
  for(const value of [order.xp,order.coins])assert(Number.isSafeInteger(value)&&value>=0);
  return `Letter ${position}/${chapter.storyIds.length} · ${order.xp?'+'+order.xp:0} XP · ${order.coins?'+'+order.coins:0} coins`;
}
