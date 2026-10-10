// Browser focus scrolling may leave a partially visible grid cell clipped.
// Keep native focus/page scrolling, then reveal the complete cell horizontally
// within its own board. No game state, styles, or persistent data are changed.
export function planBoardFocusReveal({scrollLeft,scrollWidth,clientWidth,left,targetLeft,targetRight}) {
  if(![scrollLeft,scrollWidth,clientWidth,left,targetLeft,targetRight].every(Number.isFinite)||clientWidth<=0||scrollWidth<clientWidth||targetRight<=targetLeft)return null;
  const maximum=Math.max(0,scrollWidth-clientWidth);
  if(maximum===0)return 0;
  const inset=3,right=left+clientWidth;
  const delta=targetLeft<left+inset?targetLeft-left-inset:targetRight>right-inset?targetRight-right+inset:0;
  return Math.max(0,Math.min(maximum,scrollLeft+delta));
}
export function focusBoardCell(cell) {
  if(!cell)return;
  cell.focus();
  if(cell.ownerDocument.activeElement!==cell)return;
  const board=cell.closest('.career-board');
  if(!board)return;
  const bounds=board.getBoundingClientRect(),target=cell.getBoundingClientRect();
  const next=planBoardFocusReveal({scrollLeft:board.scrollLeft,scrollWidth:board.scrollWidth,clientWidth:board.clientWidth,left:bounds.left+board.clientLeft,targetLeft:target.left,targetRight:target.right});
  if(next!==null&&next!==board.scrollLeft)board.scrollTo({left:next,top:board.scrollTop,behavior:'instant'});
}
