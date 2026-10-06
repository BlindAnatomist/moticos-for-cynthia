import { afterEach, describe, expect, it, vi } from 'vitest';
import { wrapDialogFocus } from '../src/collection/dialogFocus.js';

function fixture({ active = 0, shift = false, extra = {} } = {}) {
  const nodes = Array.from({ length: 3 }, () => ({ disabled: false, tabIndex: 0, getClientRects: () => [1], closest: () => null, focus: vi.fn() }));
  const dialog = { querySelectorAll: () => nodes, contains: node => nodes.includes(node), focus: vi.fn() };
  vi.stubGlobal('document', { activeElement: nodes[active] });
  vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
  const event = { key: 'Tab', shiftKey: shift, currentTarget: dialog, preventDefault: vi.fn(), ...extra };
  return { nodes, dialog, event };
}
afterEach(() => vi.unstubAllGlobals());
describe('matching dialog keyboard boundaries', () => {
  it('wraps Shift+Tab from the first available control to the last', () => {
    const { nodes, event } = fixture({ shift: true }); wrapDialogFocus(event);
    expect(event.preventDefault).toHaveBeenCalledOnce(); expect(nodes[2].focus).toHaveBeenCalledOnce();
  });
  it('wraps Tab from the last control back to the first', () => {
    const { nodes, event } = fixture({ active: 2 }); wrapDialogFocus(event);
    expect(event.preventDefault).toHaveBeenCalledOnce(); expect(nodes[0].focus).toHaveBeenCalledOnce();
  });
  it('leaves navigation between interior controls to the browser', () => {
    const { nodes, event } = fixture({ active: 1 }); wrapDialogFocus(event);
    expect(event.preventDefault).not.toHaveBeenCalled(); expect(nodes.every(node => node.focus.mock.calls.length === 0)).toBe(true);
  });
  it('does not intercept browser shortcuts or Escape', () => {
    for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { key: 'Escape' }, { defaultPrevented: true }]) {
      const { event } = fixture({ active: 2, extra }); wrapDialogFocus(event); expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });
  it('skips disabled, hidden and non-tab-stop controls', () => {
    const { nodes, event } = fixture({ shift: true }); nodes[2].disabled = true; nodes[1].getClientRects = () => [];
    wrapDialogFocus(event); expect(nodes[0].focus).toHaveBeenCalledOnce(); expect(nodes[1].focus).not.toHaveBeenCalled(); expect(nodes[2].focus).not.toHaveBeenCalled();
  });
  it('retains a reachable dialog when no child control can receive focus', () => {
    const { nodes, dialog, event } = fixture(); nodes.forEach(node => node.tabIndex = -1);
    wrapDialogFocus(event); expect(event.preventDefault).toHaveBeenCalledOnce(); expect(dialog.focus).toHaveBeenCalledOnce();
  });
});
