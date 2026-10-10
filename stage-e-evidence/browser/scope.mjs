export const CASES = [
 ['E01','direct move and merge preserve one revision with reload and Undo',120000],
 ['E02','invalid unmatched self and outside drops never save',120000],
 ['E03','tap threshold and post-drag click suppression preserve fresh taps',120000],
 ['E04','pointer cancellation capture loss and second finger never save',120000],
 ['E05','stale revision and replaced source never commit a drag',120000],
 ['E06','larger text preserves empty gap scrolling and bounded edge reveal',120000],
 ['E07','native mouse drag remains durable and undoable',120000],
 ['E08','native keyboard selection movement and activation remain usable',120000],
];
export const SCREENSHOTS = {
 'touch-drag-chromium':['E01-drag-feedback.png','E01-move-result.png','E01-merge-result.png','E06-large-text-edge.png'],
 'touch-drag-webkit':['E08-keyboard-result.png'],
};
