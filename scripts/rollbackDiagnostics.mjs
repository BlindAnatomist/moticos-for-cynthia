import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const TRACE_POLICY = Object.freeze({ mode: 'retain-on-failure', screenshots: false, snapshots: false, sources: true, attachments: false });
export function journal(path, info) {
  mkdirSync(dirname(path), { recursive: true });
  const started = performance.now();
  return (event, details = {}) => appendFileSync(path, JSON.stringify({ event, profile: info.project.name, title: info.title, elapsedMs: Math.round(performance.now() - started), ...details }) + '\n');
}
export function collectionViolations(state) {
  const problems = [];
  if (state.dialogCount !== 1 || !state.dialog?.open || !state.dialog?.modal) problems.push('missing-native-modal');
  if (!state.dialog?.visible || state.bodyOverflow !== 'hidden') problems.push('modal-not-visible-or-scroll-unlocked');
  if (state.dialog?.hitTests?.length !== 3 || state.dialog.hitTests.some(hit => !hit.insideDialog)) problems.push('modal-occluded');
  if (state.dialog?.images?.length !== 10 || state.dialog.images.some(image => !image.complete || image.width <= 0 || image.height <= 0)) problems.push('collection-image-decode-incomplete');
  return problems;
}
export function captureViolations(before, after) {
  const problems = [];
  if (before.url !== after.url || before.dialogCount !== after.dialogCount || before.scrollX !== after.scrollX || before.scrollY !== after.scrollY) problems.push('navigation-or-page-scroll-drift');
  for (const key of ['open', 'modal', 'visible', 'rect', 'scrollTop', 'images']) {
    if (JSON.stringify(before.dialog?.[key]) !== JSON.stringify(after.dialog?.[key])) problems.push(`modal-${key}-drift`);
  }
  return problems;
}
