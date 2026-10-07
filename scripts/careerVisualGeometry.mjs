// Measured browser rectangles, never inferred acceptance from CSS declarations.
const finiteBox=b=>b&&['x','y','width','height','right','bottom'].every(k=>Number.isFinite(b[k]))&&b.width>0&&b.height>0;
const inside=(a,b,t=1.5)=>finiteBox(a)&&finiteBox(b)&&a.x>=b.x-t&&a.y>=b.y-t&&a.right<=b.right+t&&a.bottom<=b.bottom+t;
const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>.5;
export function gridViolations(cells,board){
 const errors=[];if(cells.length!==25)return['Board must have exactly 25 measured cells'];
 if(cells.some(c=>!finiteBox(c)))return['Invalid cell geometry'];
 if(cells.some(c=>!inside(c,board)))errors.push('Cell outside board');
 for(const key of ['width','height'])if(Math.max(...cells.map(c=>c[key]))-Math.min(...cells.map(c=>c[key]))>1.1)errors.push(`Unequal cell ${key}`);
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){const i=row*5+col,c=cells[i];if(Math.abs(c.y-cells[row*5].y)>1.1)errors.push('Row misalignment');if(Math.abs(c.x-cells[col].x)>1.1)errors.push('Column misalignment');if(col<4&&c.right>cells[i+1].x+1)errors.push('Columns overlap');if(row<4&&c.bottom>cells[i+5].y+1)errors.push('Rows overlap');}
 return[...new Set(errors)];
}
export function gridMovement(before,after){
 if(before.length!==25||after.length!==25)return['Missing grid stability samples'];
 return before.flatMap((c,i)=>['x','y','width','height'].filter(k=>Math.abs(c[k]-after[i][k])>1.1).map(k=>`Cell ${i} changed ${k}`));
}
export function countViolations(labels,expectedCount){
 const errors=[];if(labels.length!==expectedCount)errors.push('Missing visible target quantities');
 for(const label of labels){
  if(label.text!==label.expected)errors.push(`Incorrect quantity: ${label.pieceId}`);
  if(!label.glyphs.length||!finiteBox(label.box))errors.push(`Invisible quantity: ${label.pieceId}`);
  if(label.glyphs.length&&Math.max(...label.glyphs.map(g=>g.y))-Math.min(...label.glyphs.map(g=>g.y))>1.5)errors.push(`Quantity wraps: ${label.pieceId}`);
  for(const g of label.glyphs){if(!inside(g,label.box)||!inside(g,label.target)||!inside(g,label.button))errors.push(`Quantity clipped: ${label.pieceId}`);if(label.art.some(a=>finiteBox(a)&&overlap(g,a)))errors.push(`Quantity overlaps artwork: ${label.pieceId}`);}
 }
 return[...new Set(errors)];
}
