// A real, engine-produced history for visual review. Each family has 16 units:
// two L1 pieces + one L2 + one L3 + one L4. A final L5 cannot coexist with them.
// This fixture is not evidence that a browser executed those moves.
export function mixedStageFixture(engine) {
  let save=engine.newSave();
  for(const family of engine.FAMILIES){
    let step=0;
    while(!save.round.board.some(tile=>tile?.pieceId===family.finalId)){
      if(++step>21)throw Error('Mixed-stage fixture did not complete a legal family');
      const pair=engine.mergePairs(save.round.board).find(([from])=>engine.CATALOG[save.round.board[from].pieceId].familyId===family.id);
      save=engine.act(save,pair?{type:'merge',from:pair[0],to:pair[1]}:{type:'supply',familyId:family.id});
      if(!save)throw Error('Illegal mixed-stage fixture action');
    }
  }
  const finals=save;
  for(const family of engine.FAMILIES)for(const id of [...family.pieceIds].slice(1).reverse()){
    const index=save.round.board.findIndex(tile=>tile?.pieceId===id);
    save=engine.act(save,{type:'cut',index});if(!save)throw Error('Illegal descending Cut fixture');
  }
  if(!engine.validSave(save))throw Error('Mixed-stage fixture failed save validation');
  return {finals,mixed:save};
}
