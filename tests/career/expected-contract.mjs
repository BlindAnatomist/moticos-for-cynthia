// Independent oracle transcribed from the reviewed 7 October 2026 brief.
export const thresholds = [0, 80, 250, 500];
export const rewards = {2: [10, 5], 3: [25, 10], 4: [60, 25], 5: [140, 60]};
export const story = [
  [['bird', 2]], [['fern', 2]], [['bird', 3]],
  [['bird', 2], ['fern', 3]], [['bird', 4]],
  [['bird', 3], ['fern', 3]], [['fern', 4]],
  [['bird', 4], ['fern', 4]], [['bird', 5]],
];
export const xpRoute = [10, 20, 45, 80, 140, 190, 250, 370, 510];
export const coinsRoute = [5, 10, 20, 35, 60, 80, 105, 155, 215];
export const ordinary = [
  [['bird',2],['fern',2]], [['bird',3]], [['fern',3]],
  [['bird',3],['fern',3]], [['bird',4]], [['fern',4]],
  [['bird',5]], [['fern',5]],
];
export const level = xp => thresholds.reduce((n, cutoff) => n + +(xp >= cutoff), 0);
export const ceiling = xp => [3, 4, 5, 5][level(xp) - 1];
export const recipeKey = reqs => reqs.map(([family,tier,quantity=1]) => `${family}:${tier}:${quantity}`).sort().join('|');
