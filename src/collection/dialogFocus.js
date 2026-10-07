// Keep ordinary Tab navigation deterministic inside a game dialog. Browser
// shortcuts and Escape retain their native behavior.
export function wrapDialogFocus(event) {
  if (event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  const dialog = event.currentTarget;
  const candidates = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(node =>
    !node.disabled && node.tabIndex >= 0 && node.getClientRects().length > 0 &&
    !node.closest('[hidden], [inert], [aria-hidden="true"]') && getComputedStyle(node).visibility === 'visible'
  );
  if (!candidates.length) { event.preventDefault(); dialog.focus(); return; }
  const first = candidates[0], last = candidates.at(-1), active = document.activeElement;
  const outside = active === dialog || !dialog.contains(active);
  if (event.shiftKey && (active === first || outside)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || outside)) { event.preventDefault(); first.focus(); }
}
