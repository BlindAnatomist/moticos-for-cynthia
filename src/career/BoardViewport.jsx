import {useLayoutEffect, useRef, useState} from 'react';

// A two-dimensional board keeps its five logical columns at larger text sizes.
// Only this region scrolls; the source controls and tools stay at page width.
export default function BoardViewport({largeText, children}) {
  const frame = useRef(null);
  const [edges, setEdges] = useState({overflow: false, left: false, right: false});
  useLayoutEffect(() => {
    const board = frame.current.querySelector('.career-board');
    const measure = () => {
      const maximum = Math.max(0, board.scrollWidth - board.clientWidth);
      const next = {overflow: largeText && maximum > 1, left: board.scrollLeft > 1, right: board.scrollLeft < maximum - 1};
      setEdges(old => Object.keys(next).every(key => old[key] === next[key]) ? old : next);
    };
    if (!largeText) board.scrollLeft = 0;
    measure();
    board.addEventListener('scroll', measure, {passive: true});
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(board);
    window.addEventListener('resize', measure);
    return () => { board.removeEventListener('scroll', measure); observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [largeText, children]);
  const shift = direction => {
    if (direction < 0 ? !edges.left : !edges.right) return;
    const board = frame.current.querySelector('.career-board');
    board.scrollBy({left: direction * board.clientWidth * .7, behavior: 'auto'});
  };
  return <div className="career-board-frame" ref={frame}>
    {children}
    {/* Keep edge controls focusable: reaching an end must not discard keyboard focus. */}
    {edges.overflow && <div className="career-board-scroll-tools">
      <button type="button" onClick={() => shift(-1)} aria-disabled={!edges.left} aria-label="Scroll board left">←</button>
      <p>Swipe empty spaces or gaps, or use the arrows to see all five columns.</p>
      <button type="button" onClick={() => shift(1)} aria-disabled={!edges.right} aria-label="Scroll board right">→</button>
    </div>}
  </div>;
}
