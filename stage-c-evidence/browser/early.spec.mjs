import {test,expect} from '@playwright/test';
import {scenarioFor,failureState} from './scope.mjs';
import * as h from './helpers.mjs';
import {C,E,V,fixture} from './fixtures.mjs';
import {reloadStable,waitSaved} from '../../stage-b-evidence/browser/reload.mjs';
import * as E6 from '../../src/career/engine.v6.js';
import {goalAccessibleLabel,storyMilestoneNote} from '../../src/career/feedback.js';

const scenario=scenarioFor(test);
const boundary=V.CONTINUATIONS[2];
const newFamilies=C.FAMILIES.slice(48);
const newChapters=C.CHAPTERS.slice(24);
const zeroMaterial={initial:0,generated:0,delivered:0,recycled:0};
const viewStart=page=>page.evaluate(()=>window.__careerAudit.length);
const writeEvents=(page,start=0)=>page.evaluate(({start,key})=>window.__careerAudit.slice(start).filter(e=>!e.fixture&&e.op==='set'&&e.key===key),{start,key:C.STORAGE_KEY});
const outstanding=s=>[...s.orders,...s.heldOrders,...(s.suspendedStory?[s.suspendedStory]:[])];
const pinnedPromises=s=>outstanding(s).map(({slot,...promise})=>promise).sort((a,b)=>a.id.localeCompare(b.id));
const touchFor=info=>Boolean(info.project.use.hasTouch);
const equalFields=(before,after,keys)=>{for(const key of keys)expect(after[key],`Preserve ${key}`).toEqual(before[key]);};

async function invite(page,touch){
  if(await h.compact(page))await h.panel(page,'progress',touch);
  await h.press(page.getByRole('button',{name:boundary.entryButton,exact:true}),touch);
  await expect(page.getByRole('dialog')).toContainText(boundary.entryCopy);
  await expect(page.getByRole('dialog').locator('.career-chapter-ending')).toHaveText(C.CHAPTER_COPY[boundary.fromChapterId].ending);
}
async function enter(page,touch){
  await invite(page,touch);
  const before=await h.read(page);
  const after=await h.changed(page,before,()=>h.press(page.getByRole('dialog').getByRole('button',{name:`Begin ${newChapters[0].title}`,exact:true}),touch));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return after;
}
async function forceFocus(page,id,touch){
  const before=await h.read(page);
  if(await h.compact(page)){
    await h.panel(page,'orders',touch);
    const choice=page.getByRole('dialog').locator('.career-order-choices>section').filter({has:page.locator(`[data-order-id="${id}"]`)});
    await h.changed(page,before,()=>h.press(choice.locator('.career-focus-order'),touch));
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }else await h.changed(page,before,()=>h.press(page.locator(`.career-order[data-order-id="${id}"] .career-order-title`),touch));
  const state=await h.read(page);expect(state.focusedOrderId).toBe(id);return state;
}
async function exactSend(page,order,touch){
  await h.focusOrder(page,order.id,touch);
  const before=await h.readyUI(page,order,touch),tileIds=E.matchingTiles(before,order);
  expect(tileIds).toHaveLength(order.requirements.reduce((n,r)=>n+r.quantity,0));
  const command=E.commandFor(before,{type:'complete',orderId:order.id,tileIds}),expected=E.reduceCareer(before,command);
  expect(expected.ok).toBe(true);
  const writeStart=await viewStart(page);
  await expect(h.sendControl(page,order.id)).toBeEnabled();
  const after=await h.changed(page,before,()=>h.press(h.sendControl(page,order.id),touch));
  await waitSaved(page,after);
  expect(after).toEqual(expected.state);
  const writes=await writeEvents(page,writeStart);expect(writes).toHaveLength(1);
  expect(after.board.filter(Boolean)).toEqual(before.board.filter(t=>t&&!tileIds.includes(t.id)));
  expect(after.xp-before.xp).toBe(order.xp);expect(after.coinsEarned-before.coinsEarned).toBe(order.coins);
  expect(after.coinsSpent).toBe(before.coinsSpent);expect(after.purchases).toEqual(before.purchases);
  expect(after.milestones.filter(id=>id===order.storyLetterId)).toHaveLength(1);
  expect(after.storyCompletions[order.storyLetterId]).toEqual({contentVersion:order.contentVersion});
  expect(after.receipts.at(-1)).toEqual({id:order.id,type:'delivery',storyLetterId:order.storyLetterId,templateId:order.templateId,xp:order.xp,coins:order.coins,contentVersion:order.contentVersion,revision:after.revision});
  await expect(page.locator('.career-producer')).toHaveCount(2);
  return{before,after,tileIds,writes};
}
async function sourcePair(page,state,pair=state.activeSourceIds){
  expect(state.activeSourceIds).toEqual(pair);await expect(page.locator('.career-producer')).toHaveCount(2);
  for(const [index,id]of pair.entries()){
    const family=C.FAMILIES.find(f=>f.id===id),output=E.nextOutput(state,id),control=page.locator('.career-producer').nth(index);
    await expect(control).toHaveClass(new RegExp(`(?:^| )${id}(?: |$)`));
    await expect(control.locator('.career-supply')).toHaveAttribute('aria-label',`Add free ${family.shortName} supply: next ${output.name}, level ${output.tier}`);
    await expect(control.locator('.career-supply')).toBeVisible();
  }
}
async function sourceLocked(page,familyId,touch,remaining){
  const state=await h.read(page);expect(state.unlockedSources).not.toContain(familyId);
  expect(state.material[familyId]).toEqual(zeroMaterial);
  const family=C.FAMILIES.find(f=>f.id===familyId),start=await viewStart(page),saved=await h.bytes(page);
  await h.panel(page,'sources',touch);
  await expect(page.getByRole('dialog').getByRole('button',{name:new RegExp(`^${family.shortName}, (left|right) source`)})).toHaveCount(0);
  await expect(page.getByRole('dialog')).toContainText(`The ${family.shortName} source opens after ${remaining} remaining opening ${remaining===1?'letter':'letters'}.`);
  await h.close(page,touch);expect(await h.bytes(page)).toBe(saved);await h.noViewWrites(page,start);
}
async function nativeProbe(context){
  const page=await context.newPage();await page.goto('/stage-c-probe/index.html');
  const result=await page.evaluate(()=>window.stageCProbe.open());expect(result.status).toBe('saved');return{page,opened:result};
}
async function rejectCompletion(context,ui,command){
  const probe=await nativeProbe(context);
  try{
    const before=await h.read(ui),saved=await h.bytes(ui),start=await viewStart(probe.page);
    expect(probe.opened.state).toEqual(before);
    const result=await probe.page.evaluate(command=>window.stageCProbe.commit(command),command);
    expect(result.ok).toBe(false);expect(result.code).toBe('invalid-action');expect(result.status).toBe('saved');
    expect(result.state).toEqual(before);expect(await h.bytes(ui)).toBe(saved);expect(await h.read(ui)).toEqual(before);
    await h.noViewWrites(probe.page,start);
    return{command,result,writes:await writeEvents(probe.page,start)};
  }finally{await probe.page.close();}
}

test.beforeEach(async({page,context},info)=>{if(info.title.startsWith('C01 '))return;await h.instrumentation(context);await h.open(page);});
test.afterEach(async({page},info)=>{try{if(!info.title.startsWith('C01 '))await h.audit(page);}catch(error){await failureState(page,info,error,{phase:'afterEach-audit'});throw error;}finally{if(info.status!==info.expectedStatus)await failureState(page,info,info.error??Error('Setup or test failed'),{phase:'afterEach'});}});

scenario('C01 Migrate existing saves without entering Stage C',async({browser},info)=>{
  const rows=[],touch=touchFor(info);
  // Each migration has independent temporary storage and this profile's actual
  // engine/device settings. No earlier migration is reused as its starting point.
  const keys=['baseURL','viewport','screen','userAgent','deviceScaleFactor','isMobile','hasTouch','locale','timezoneId','colorScheme','reducedMotion','forcedColors','acceptDownloads','ignoreHTTPSErrors','javaScriptEnabled','serviceWorkers'];
  const options=Object.fromEntries(keys.filter(key=>info.project.use[key]!==undefined).map(key=>[key,info.project.use[key]]));
  for(const name of ['v5-endpoint','v6-conservative','v6-purchased']){
    const context=await browser.newContext(options);let page=null;
    try{
      await h.instrumentation(context);page=await context.newPage();await h.open(page);
      const old=fixture(name),raw=JSON.stringify(old);await h.seedRaw(page,raw);
      let oldWriter=null,oldOpened=null;
      if(name==='v6-purchased'){
        oldWriter=await context.newPage();await oldWriter.goto('/stage-c-v6-probe/index.html');
        oldOpened=await oldWriter.evaluate(()=>window.stageCV6Probe.open());expect(oldOpened.status).toBe('saved');expect(oldOpened.state).toEqual(old);
      }
      await page.reload();await waitSaved(page,E.upgradeCareer(old));
      const after=await h.read(page),expected=E.upgradeCareer(old);
      expect(after).toEqual(expected);expect(after.schemaVersion).toBe(7);expect(after.contentVersion).toBe(7);
      equalFields(old,after,['board','chapterId','enteredChapters','chapterEntryVersions','activeSourceIds','unlockedSources','xp','coinsEarned','coinsSpent','purchases','orders','heldOrders','suspendedStory','resumedOptionalId','milestones','storyCompletions','receipts','continuationEntries','revision','nextTileSeq','nextOrderSeq']);
      for(const [id,level]of Object.entries(old.upgrades))expect(after.upgrades[id]).toBe(level);
      for(const id of Object.keys(after.upgrades).filter(id=>!Object.hasOwn(old.upgrades,id)))expect(after.upgrades[id]).toBe(0);
      for(const [id,source]of Object.entries(old.sources))expect(after.sources[id]).toEqual(source);
      for(const [id,material]of Object.entries(old.material))expect(after.material[id]).toEqual(material);
      for(const [id,cursor]of Object.entries(old.ordinaryChapterCursors))expect(after.ordinaryChapterCursors[id]).toBe(cursor);
      for(const family of newFamilies){expect(after.sources[family.id]).toEqual({sorter:0,cursor:0});expect(after.material[family.id]).toEqual(zeroMaterial);expect(after.unlockedSources).not.toContain(family.id);}
      expect(after.continuationEntries[boundary.id]).toBeUndefined();expect(after.enteredChapters).not.toContain(boundary.toChapterId);
      const migrationWrites=await writeEvents(page);expect(migrationWrites).toHaveLength(1);
      const saved=await h.bytes(page),reloads=[];
      for(let n=0;n<2;n++){await reloadStable(page);expect(await h.bytes(page)).toBe(saved);await h.noViewWrites(page,0);reloads.push({revision:(await h.read(page)).revision,writes:await writeEvents(page)});}
      const scope=V.collectionScope(after,'all');expect(scope.total).toBe(name==='v5-endpoint'?200:240);
      const start=await viewStart(page);await h.panel(page,'collection',touch);
      await expect(page.getByRole('heading',{name:`All available pictures · ${scope.collected}/${scope.total} collected`,exact:true})).toBeVisible();
      await expect(page.getByRole('navigation',{name:'Collection pages'})).toContainText(`Page 1 of ${scope.total/20}`);
      const volumes=await page.getByRole('combobox',{name:'Collection volume',exact:true}).locator('option').evaluateAll(nodes=>nodes.map(n=>({id:n.value,text:n.textContent})));
      expect(volumes.map(v=>v.id)).toEqual(['all',...V.availableVolumes(after).map(v=>v.id)]);
      expect(volumes.slice(1).map(v=>Number(v.text.split(' · ').at(-1)))).toEqual(name==='v5-endpoint'?[160,40]:[160,40,40]);
      await h.close(page,touch);await h.panel(page,'letters',touch);
      const earlierEndings=[];
      for(const id of ['sound-advice','short-measure',...(name==='v5-endpoint'?[]:['paper-duet'])]){
        await page.getByRole('combobox',{name:'Chapter',exact:true}).selectOption(id);
        await expect(page.getByRole('dialog').locator('.career-chapter-ending')).toHaveText(C.CHAPTER_COPY[id].ending);
        earlierEndings.push({id,text:await page.getByRole('dialog').locator('.career-chapter-ending').textContent()});
      }
      await h.close(page,touch);expect(await h.bytes(page)).toBe(saved);await h.noViewWrites(page,start);
      let oldAttempt=null,oldPractice=null;
      if(oldWriter){const oldStart=await viewStart(oldWriter);oldAttempt=await oldWriter.evaluate(()=>window.stageCV6Probe.supply());expect(oldAttempt.ok).toBe(false);expect(oldAttempt.status).toBe('practice');expect(oldAttempt.code).toBe('storage-unavailable');expect(oldAttempt.warning).toContain('unsaved practice');expect(oldAttempt.state).toEqual(old);expect(await h.bytes(page)).toBe(saved);
        oldPractice=await oldWriter.evaluate(()=>window.stageCV6Probe.supply());
        expect(oldPractice.ok).toBe(true);expect(oldPractice.status).toBe('practice');expect(oldPractice.code).toBe('practice-applied');
        expect(oldPractice.state).toEqual(E6.reduceCareer(old,E6.commandFor(old,{type:'supply',familyId:old.activeSourceIds[0]})).state);
        expect(oldPractice.state.revision).toBe(old.revision+1);expect(oldPractice.state.board.filter(Boolean)).toHaveLength(old.board.filter(Boolean).length+1);
        expect(await h.bytes(page)).toBe(saved);expect(await h.read(page)).toEqual(after);await h.noViewWrites(oldWriter,oldStart);await oldWriter.close();}
      await h.audit(page);rows.push({fixture:name,old,after,migrationWrites,reloads,scope,volumes,earlierEndings,oldOpened,oldAttempt,oldPractice});
    }catch(error){await failureState(page,info,error,{phase:'migration',fixture:name});throw error;}finally{await context.close();}
  }
  await h.record(info,{rows});
});

scenario('C02 Explicit third-boundary entry and concurrent-tab protection',async({page,context},info)=>{
  const touch=touchFor(info);await h.seedStable(page,fixture('v7-retained-before-entry'));
  const before=await h.read(page),saved=await h.bytes(page);
  expect(before.upgrades['order-desk']).toBe(1);expect(before.orders.some(o=>o.slot===2&&o.origin==='ordinary')).toBe(true);
  expect(before.board.some(t=>t&&C.CATALOG.pieceOf(t.pieceId).familyId!=='paper-crab')).toBe(true);
  expect(Object.values(before.sources).some(source=>source.sorter===1&&source.cursor>0)).toBe(true);
  const cancelStart=await viewStart(page);
  for(let n=0;n<2;n++){await invite(page,touch);await h.press(page.getByRole('dialog').getByRole('button',{name:boundary.deferButton,exact:true}),touch);await expect(page.getByRole('dialog')).toHaveCount(0);expect(await h.bytes(page)).toBe(saved);}
  await h.noViewWrites(page,cancelStart);await reloadStable(page);expect(await h.bytes(page)).toBe(saved);
  const uiStart=await viewStart(page),a=await nativeProbe(context),b=await nativeProbe(context);const command=E.commandFor(before,{type:'enter-continuation',boundaryId:boundary.id});
  let raceResults,entryWrites,rejected;
  try{
    expect(a.opened.state).toEqual(before);expect(b.opened.state).toEqual(before);
    const starts=await Promise.all([viewStart(a.page),viewStart(b.page)]);
    await h.holdLock(page);
    let first,second;
    try{
      first=a.page.evaluate(command=>window.stageCProbe.commit(command),command);
      second=b.page.evaluate(command=>window.stageCProbe.commit(command),command);
      await expect.poll(()=>page.evaluate(async name=>(await navigator.locks.query()).pending.filter(lock=>lock.name===name).length,C.LOCK_NAME)).toBe(2);
    }finally{await h.releaseLock(page);}
    raceResults=await Promise.all([first,second]);
    expect(raceResults.filter(r=>r.ok)).toHaveLength(1);expect(raceResults.filter(r=>!r.ok&&r.code==='stale')).toHaveLength(1);
    expect(raceResults.every(r=>r.status==='saved')).toBe(true);
    const after=await h.read(page);await waitSaved(page,after);expect(after.revision).toBe(before.revision+1);
    expect(after).toEqual(E.reduceCareer(before,command).state);
    entryWrites=await Promise.all([writeEvents(a.page,starts[0]),writeEvents(b.page,starts[1]),writeEvents(page,uiStart)]);expect(entryWrites.flat()).toHaveLength(1);expect(entryWrites[2]).toEqual([]);
    equalFields(before,after,['board','material','sources','xp','coinsEarned','coinsSpent','purchases','upgrades','discoveries','milestones','storyCompletions','receipts','nextTileSeq']);
    for(const promise of outstanding(before))expect(pinnedPromises(after)).toContainEqual((({slot,...p})=>p)(promise));
    expect(after.orders.find(o=>o.slot===2)).toEqual(before.orders.find(o=>o.slot===2));
    expect(after.chapterId).toBe(boundary.toChapterId);await expect(page.locator('.career-shell')).toHaveAttribute('data-chapter-id',boundary.toChapterId);expect(after.chapterEntryVersions[boundary.toChapterId]).toBe(7);
    expect(after.continuationEntries).toEqual({...before.continuationEntries,[boundary.id]:{revision:after.revision,contentVersion:7}});
    expect(after.unlockedSources.filter(id=>!before.unlockedSources.includes(id))).toEqual(['paper-crab']);
    expect(after.activeSourceIds).toHaveLength(2);expect(new Set(after.activeSourceIds).size).toBe(2);expect(after.activeSourceIds).toContain('paper-crab');
    expect(after.material['paper-snail']).toEqual(zeroMaterial);expect(after.board.filter(t=>t?.pieceId.startsWith('c280-sn'))).toHaveLength(0);
    expect(after.history).toEqual([]);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();await sourcePair(page,after);
    const committed=await h.bytes(page),rejectStart=await viewStart(a.page);
    const stale=await a.page.evaluate(command=>window.stageCProbe.commit(command),command);
    const repeated=await a.page.evaluate(action=>window.stageCProbe.command(action),{type:'enter-continuation',boundaryId:boundary.id});
    expect(stale.ok).toBe(false);expect(stale.code).toBe('stale');expect(repeated.ok).toBe(false);expect(repeated.code).toBe('invalid-action');
    expect(await h.bytes(page)).toBe(committed);await h.noViewWrites(a.page,rejectStart);rejected={stale,repeated};
    await reloadStable(page);expect(await h.bytes(page)).toBe(committed);await expect(page.getByRole('button',{name:boundary.entryButton,exact:true})).toHaveCount(0);
    await h.record(info,{before,after,entryPath:'Two same-origin browser tabs submit the same source-bound command through native career sessions and the real exclusive Web Lock; invitation cancellation is exercised through visible UI.',command,raceResults,entryWrites,rejected});
  }finally{await a.page.close();await b.page.close();}
});

scenario('C03 Play all nineteen new letters and four two-letter gates',async({page},info)=>{
  const touch=touchFor(info),reverse=info.project.name==='stage-c-webkit-phone';
  const endpoint=E.upgradeCareer(fixture('v6-conservative'));await h.seedStable(page,endpoint);
  const start=await h.read(page);expect(start.xp).toBe(8980);expect(start.coinsSpent).toBe(0);expect(start.purchases).toEqual({});
  for(const family of newFamilies)expect(start.material[family.id]).toEqual(zeroMaterial);
  await enter(page,touch);const letters=[],gates=[],zeroCards=[];
  const screenshotNames=['C03-crab-zero.png','C03-can-zero.png','C03-iron-zero.png','C03-knight-zero.png'];
  for(const [index,chapter]of newChapters.entries()){
    if(index)await h.startChapter(page,touch);
    const entry=await h.read(page),rule=C.contentPack(entry).sourceRules.find(r=>r.chapterId===chapter.id&&r.milestones.length===2);
    expect(rule.milestones).toEqual(chapter.storyIds.slice(0,2));expect(entry.chapterId).toBe(chapter.id);expect(entry.chapterEntryVersions[chapter.id]).toBe(7);
    await sourceLocked(page,rule.id,touch,2);
    const zero=entry.orders.find(o=>o.origin==='story'&&o.xp===0&&o.coins===0);
    expect(zero.storyLetterId).toBe(chapter.storyIds[index===3?1:0]);
    await h.focusOrder(page,zero.id,touch);
    const normalViewport=page.viewportSize();await page.setViewportSize({width:390,height:664});
    const zeroState=await h.read(page),view=await viewStart(page),saved=await h.bytes(page);
    await expect(page.locator('.career-mobile-order-strip')).toHaveAttribute('data-order-id',zero.id);
    await expect(page.locator('.career-mobile-order-reward')).toContainText('0 XP · 0 coins');await expect(page.locator('.career-mobile-order-reward')).toBeInViewport({ratio:1});
    await expect(page.locator('.career-mobile-order-details')).toHaveAttribute('aria-label',goalAccessibleLabel(zeroState,zero));
    expect(await page.locator('.career-mobile-order-details').getAttribute('aria-label')).toContain('0 XP and 0 coins');
    await h.panel(page,'orders',touch);const card=page.getByRole('dialog').locator(`.career-order[data-order-id="${zero.id}"]`);
    await card.scrollIntoViewIfNeeded();await expect(card.locator('.career-rewards')).toHaveText('0 XP · 0 coins');
    await expect(card.locator('.career-rewards')).toBeInViewport({ratio:1});
    await expect(card.locator('.career-request-goal')).toHaveText(storyMilestoneNote(zero,zeroState));
    await expect(card.locator('.career-request-goal')).toContainText('Send both opening story letters');await expect(card.locator('.career-request-goal')).toContainText('2 remaining.');
    await expect(card.locator('.career-request-goal')).toBeInViewport({ratio:1});
    zeroCards.push({storyId:zero.storyLetterId,viewport:page.viewportSize(),reward:await card.locator('.career-rewards').textContent(),accessibleLabel:goalAccessibleLabel(zeroState,zero),notice:await card.locator('.career-request-goal').textContent(),screenshot:screenshotNames[index]});
    await h.shot(page,info,screenshotNames[index]);await h.close(page,touch);expect(await h.bytes(page)).toBe(saved);await h.noViewWrites(page,view);await page.setViewportSize(normalViewport);
    const ids=reverse?[...chapter.storyIds.slice(0,2).reverse(),...(index===0?chapter.storyIds.slice(2).reverse():index===2?[...chapter.storyIds.slice(2,4).reverse(),chapter.storyIds[4]]:chapter.storyIds.slice(2))]:chapter.storyIds;
    for(const [at,id]of ids.entries()){
      const state=await h.read(page),order=state.orders.find(o=>o.storyLetterId===id);expect(order,`Reach ${id} in ${reverse?'reversed':'authored'} legal order`).toBeTruthy();
      if(at===1)await sourceLocked(page,rule.id,touch,1);
      const sent=await exactSend(page,order,touch);letters.push({storyId:id,order,revisionBefore:sent.before.revision,revisionAfter:sent.after.revision,tileIds:sent.tileIds,reward:{xp:order.xp,coins:order.coins},writes:sent.writes});
      const both=rule.milestones.every(id=>sent.after.milestones.includes(id));expect(sent.after.unlockedSources.includes(rule.id)).toBe(both);
      if(at===0){expect(sent.after.unlockedSources).not.toContain(rule.id);expect(sent.after.material[rule.id]).toEqual(zeroMaterial);}
      if(at===1){expect(sent.after.material[rule.id]).toEqual(zeroMaterial);expect(sent.after.sources[rule.id]).toEqual({sorter:0,cursor:0});expect(sent.after.board.some(t=>t&&C.CATALOG.pieceOf(t.pieceId).familyId===rule.id)).toBe(false);expect(sent.after.activeSourceIds).toHaveLength(2);await sourcePair(page,sent.after);gates.push({chapter:chapter.id,required:rule.milestones,unlocked:rule.id,revision:sent.after.revision,material:sent.after.material[rule.id],sources:sent.after.activeSourceIds});}
    }
    expect(E.chapterComplete(await h.read(page))).toBe(true);
  }
  const after=await h.read(page),newIds=newChapters.flatMap(chapter=>chapter.storyIds);
  expect(letters).toHaveLength(19);expect(new Set(letters.map(l=>l.storyId)).size).toBe(19);
  expect(after.milestones.filter(id=>!start.milestones.includes(id)).sort()).toEqual([...newIds].sort());
  expect(after.xp-start.xp).toBe(395);expect(after.coinsEarned-start.coinsEarned).toBe(175);expect(after.coinsSpent).toBe(0);expect(after.purchases).toEqual({});expect(after.xp).toBe(9375);expect(C.levelDefinition(after).level).toBe(54);
  const delivered=after.receipts.filter(receipt=>receipt.revision>start.revision);expect(delivered).toHaveLength(19);expect(delivered.every(r=>r.type==='delivery'&&newIds.includes(r.storyLetterId))).toBe(true);
  for(const id of start.milestones)expect(after.storyCompletions[id]).toEqual(start.storyCompletions[id]);
  for(const [id,version]of Object.entries(start.chapterEntryVersions))expect(after.chapterEntryVersions[id]).toBe(version);
  for(const [id,receipt]of Object.entries(start.continuationEntries))expect(after.continuationEntries[id]).toEqual(receipt);
  for(const volume of V.VOLUMES)expect(E.volumeComplete(after,volume.id)).toBe(true);
  expect(after.chapterId).toBe('next-move');expect(V.collectionScope(after,'all').total).toBe(280);expect(E.allAuthoredContentComplete(after)).toBe(true);expect(E.canStartNextChapter(after)).toBe(false);expect(E.canEnterContinuation(after)).toBe(false);
  await expect(page.locator('.career-finished .career-chapter-ending')).toHaveText(C.CHAPTER_COPY['next-move'].ending);await expect(page.locator('.career-finished')).toContainText('280-picture checkpoint on the way to 320');
  await h.record(info,{route:reverse?'Every legal opener and fork reversed':'Authored order',start,after,letters,gates,zeroCards});
});

scenario('C04 Reject XP substitutes, wrong tier and wrong quantity',async({page,context},info)=>{
  const touch=touchFor(info);await h.seedStable(page,fixture('high-xp-before-snail'));
  const high=await h.read(page),second=high.orders.find(o=>o.storyLetterId==='sideways-company-letter-2');
  expect(high.xp).toBeGreaterThan(newChapters[1].entryXP);expect(high.receipts.some(r=>r.type==='delivery'&&r.storyLetterId===null&&r.xp>0)).toBe(true);
  expect(high.milestones).toContain('sideways-company-letter-1');expect(high.milestones).not.toContain(second.storyLetterId);
  expect(E.chapterComplete(high)).toBe(false);expect(E.canStartNextChapter(high)).toBe(false);
  await sourceLocked(page,'paper-snail',touch,1);await expect(page.getByRole('button',{name:'Open A Little Tending',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Begin A Little Tending',exact:true})).toHaveCount(0);
  const secondSend=await exactSend(page,second,touch);expect(secondSend.after.unlockedSources).toContain('paper-snail');expect(secondSend.after.material['paper-snail']).toEqual(zeroMaterial);
  await h.seedStable(page,fixture('wrong-tier-crab'));const wrong=await h.read(page),first=wrong.orders.find(o=>o.storyLetterId==='sideways-company-letter-1');await h.focusOrder(page,first.id,touch);
  const focused=await h.read(page),higher=focused.board.find(tile=>tile?.pieceId==='c280-cr2');expect(higher).toBeTruthy();expect(focused.board.some(tile=>tile?.pieceId==='c280-cr1')).toBe(false);expect(E.matchingTiles(focused,first)).toBe(null);
  await expect(h.sendControl(page,first.id)).toBeDisabled();const wrongTier=await rejectCompletion(context,page,E.commandFor(focused,{type:'complete',orderId:first.id,tileIds:[higher.id]}));
  await h.seedStable(page,fixture('two-crab-siblings'));const siblings=await h.read(page),order=siblings.orders.find(o=>o.storyLetterId==='sideways-company-letter-1');await h.focusOrder(page,order.id,touch);
  const pairState=await h.read(page),pair=pairState.board.filter(tile=>tile?.pieceId==='c280-cr1');expect(pair).toHaveLength(2);expect(order.requirements).toEqual([{pieceId:'c280-cr1',quantity:1}]);
  const wrongQuantity=await rejectCompletion(context,page,E.commandFor(pairState,{type:'complete',orderId:order.id,tileIds:pair.map(tile=>tile.id)}));
  const valid=await exactSend(page,order,touch);expect(valid.tileIds).toHaveLength(1);const retained=pair.find(tile=>!valid.tileIds.includes(tile.id));expect(valid.after.board.filter(Boolean)).toContainEqual(retained);expect(valid.after.board.filter(tile=>tile?.pieceId==='c280-cr1')).toEqual([retained]);
  await h.record(info,{high,secondSend,wrongTier,wrongQuantity,valid,retainedSibling:retained});
});

scenario('C05 Preserve held letters, callback sources and resumed work',async({page},info)=>{
  const touch=touchFor(info),rows=[];
  for(const [name,storyId,pair,oldFamily,oldPiece]of [
    ['callback-trowel','a-little-tending-letter-5',['garden-trowel','fern'],'fern','f2'],
    ['callback-cog','next-move-letter-4',['paper-cogwheel','key'],'key','k2'],
  ]){
    await h.seedStable(page,fixture(name));const initial=await h.read(page),callback=initial.orders.find(o=>o.storyLetterId===storyId);expect(callback).toBeTruthy();expect(callback.slot).toBe(0);expect(initial.heldOrders.length).toBeGreaterThanOrEqual(2);
    expect(initial.heldOrders.some(o=>o.contentVersion<7)).toBe(true);expect(initial.sources[oldFamily].sorter).toBe(1);expect(initial.sources[oldFamily].cursor).toBeGreaterThan(0);expect(initial.board.some(tile=>tile?.pieceId===oldPiece)).toBe(true);
    const chosen=await forceFocus(page,callback.id,touch);await sourcePair(page,chosen,pair);
    const pins=pinnedPromises(chosen),first=chosen.heldOrders.find(o=>o.contentVersion<7),second=chosen.heldOrders.find(o=>o.id!==first.id);
    const resumed=await h.chooseHeld(page,first.id,touch);expect(resumed.suspendedStory).toEqual(callback);expect(resumed.resumedOptionalId).toBe(first.id);expect(pinnedPromises(resumed)).toEqual(pins);
    await reloadStable(page);const reloaded=await h.read(page);expect(reloaded).toEqual(resumed);
    const switched=await h.chooseHeld(page,second.id,touch);expect(switched.suspendedStory).toEqual(callback);expect(switched.resumedOptionalId).toBe(second.id);expect(pinnedPromises(switched)).toEqual(pins);
    const returned=await h.returnStory(page,touch);expect(returned.suspendedStory).toBe(null);expect(returned.resumedOptionalId).toBe(null);expect(returned.orders.find(o=>o.id===callback.id)).toEqual(callback);expect(returned.activeSourceIds).toEqual(pair);expect(pinnedPromises(returned)).toEqual(pins);
    for(const state of [resumed,reloaded,switched,returned])equalFields(chosen,state,['board','sources','material','xp','coinsEarned','coinsSpent','purchases','receipts','nextOrderSeq','nextTileSeq','milestones','storyCompletions']);
    await h.selectSource(page,'bird',0,touch);await h.selectSource(page,'moon',1,touch);const manual=await h.read(page);await sourcePair(page,manual,['bird','moon']);expect(manual.focusedOrderId).toBe(callback.id);
    const manualBytes=await h.bytes(page);for(let n=0;n<2;n++){await reloadStable(page);expect(await h.bytes(page)).toBe(manualBytes);expect((await h.read(page)).activeSourceIds).toEqual(['bird','moon']);}
    const refocused=await forceFocus(page,callback.id,touch);await sourcePair(page,refocused,pair);equalFields(chosen,refocused,['board','sources','material','xp','coinsEarned','coinsSpent','purchases','receipts','nextOrderSeq','nextTileSeq','milestones','storyCompletions']);
    const retainedBefore=refocused.board.filter(tile=>tile?.pieceId===oldPiece),sent=await exactSend(page,callback,touch);
    expect(sent.tileIds.some(id=>retainedBefore.some(tile=>tile.id===id))).toBe(true);expect(sent.after.sources[oldFamily]).toEqual(initial.sources[oldFamily]);
    let finalReturn=null;
    if(name==='callback-cog'){
      const final=sent.after.orders.find(o=>o.storyLetterId==='next-move-letter-5');expect(final).toBeTruthy();
      const remainingKey=sent.after.board.filter(tile=>tile&&C.CATALOG.pieceOf(tile.pieceId).familyId==='key');expect(remainingKey.length).toBeGreaterThan(0);
      const beforeFinal=await h.read(page);finalReturn=await forceFocus(page,final.id,touch);await sourcePair(page,finalReturn,['paper-chess-knight','paper-cogwheel']);
      equalFields(beforeFinal,finalReturn,['board','sources','material','xp','coinsEarned','coinsSpent','receipts','nextOrderSeq','nextTileSeq']);
      expect(finalReturn.board.filter(tile=>tile&&C.CATALOG.pieceOf(tile.pieceId).familyId==='key')).toEqual(remainingKey);expect(finalReturn.sources.key).toEqual(initial.sources.key);
      await h.shot(page,info,'C05-callback-return.png');
    }
    rows.push({fixture:name,initial,chosen,resumed,reloaded,switched,returned,manual,refocused,delivery:sent,finalReturn});
  }
  await h.record(info,{rows});
});
