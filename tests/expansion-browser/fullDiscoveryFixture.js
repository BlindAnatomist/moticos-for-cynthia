import { random } from '../capacity/fixtures.js';
export function fullDiscoveryDenseSave(engine, seed=1) {
  let save=engine.newSave();
  for(const family of engine.FAMILIES) {
    let guard=0;
    while(!save.round.board.some(tile=>tile?.pieceId===family.finalId)) {
      if(++guard>21)throw Error('Fixture family did not finish');
      const pair=engine.mergePairs(save.round.board).find(([from])=>engine.CATALOG[save.round.board[from].pieceId].familyId===family.id);
      save=engine.act(save,pair?{type:'merge',from:pair[0],to:pair[1]}:{type:'supply',familyId:family.id});
      if(!save)throw Error('Illegal fixture route');
    }
  }
  while(save.round.board.filter(Boolean).length<24) {
    const index=save.round.board.findIndex(tile=>tile&&engine.CATALOG[tile.pieceId].tier>1),to=save.round.board.findIndex(tile=>tile===null);
    if(index<0||to<0)throw Error('Cannot make legal dense fixture');
    save=engine.act(save,{type:'cut',index,to});if(!save)throw Error('Illegal fixture cut');
  }
  const pick=random(seed);
  for(let i=0;i<engine.HISTORY_LIMIT+10;i++) {
    const occupied=save.round.board.flatMap((tile,index)=>tile?[index]:[]);
    const from=occupied[Math.floor(pick()*occupied.length)],to=save.round.board.findIndex(tile=>tile===null);
    save=engine.act(save,{type:'move',from,to});if(!save)throw Error('Illegal fixture move');
  }
  if(save.discoveries.length!==10||save.history.length!==100||!engine.validSave(save))throw Error('Incomplete full-discovery fixture');
  return save;
}
