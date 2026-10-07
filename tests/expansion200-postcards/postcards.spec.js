import {test,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ENVELOPES,getMatchingEngine} from '../../src/matching/expansion200/registry.js';
import {NEW_ENVELOPE_IDS} from '../../scripts/expansion200PostcardScope.mjs';
import {runIdentity} from '../../scripts/currentCandidate200Postcards.mjs';
import {fullDiscoveryDenseSave} from '../expansion200-browser/fullDiscoveryFixture.js';
import {activate,boardIds,imagesReady,idle,readyScreenshot} from '../expansion200-browser/shared-helpers.js';
import {capturePostcardViews} from './postcard-evidence.js';
import {preserveFailureDiagnosis} from '../expansion200-browser/collection-evidence.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
const selected=ENVELOPES.filter(e=>NEW_ENVELOPE_IDS.includes(e.id));
const keys=ENVELOPES.map(e=>e.storageKey),snapshot=page=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),keys);
const errors=new WeakMap();
test.beforeEach(async({page})=>{errors.set(page,[]);page.on('pageerror',error=>errors.get(page).push(error.message));});
test.afterEach(async({page},info)=>{try{expect(errors.get(page)).toEqual([]);}finally{await preserveFailureDiagnosis(page,info,errors.get(page).length>0);}});
test.beforeAll(async({browser},info)=>{
 const manifest=JSON.parse(await readFile('dist-expansion200/expansion200-manifest.json','utf8'));expect(manifest.identity).toEqual(runIdentity());
 await mkdir('expansion200-test-results/environment',{recursive:true});
 await writeFile(`expansion200-test-results/environment/${info.project.name}-postcards.json`,JSON.stringify({identity:runIdentity(),profile:info.project.name,browserVersion:browser.version(),nodeVersion:process.version,sourceFingerprint:manifest.sourceFingerprint,buildManifestSha256:digest(await readFile('dist-expansion200/expansion200-manifest.json')),contractSha256:digest(await readFile('tests/verification/expansion200-postcards-contract.json')),scope:'fixture-driven postcard presentation, not fresh gameplay journeys',viewport:info.project.use.viewport,deviceScaleFactor:info.project.use.deviceScaleFactor,browserBudgetMs:Number(process.env.MOTICOS_200_POSTCARDS_BROWSER_BUDGET_MS),guardedArguments:['test','--config=playwright.expansion200-postcards.config.js',`--project=${info.project.name}`]},null,2));
});
for(const envelope of selected)test(`${envelope.title}: six earned postcards, complete headers and protected saves`,async({page},info)=>{
 test.setTimeout(120000);
 const engine=getMatchingEngine(envelope.id),fixture=fullDiscoveryDenseSave(engine,17);fixture.sound=true;expect(engine.validSave(fixture)).toBe(true);
 const raw=engine.serializeStoredSave(fixture);
 await page.addInitScript(({key,raw,keys})=>{if(!sessionStorage.getItem('moticos-postcard-fixture')){for(const name of keys)if(name!==key)localStorage.setItem(name,'protected-non-active-save');localStorage.setItem(key,raw);sessionStorage.setItem('moticos-postcard-fixture','1');}}, {key:envelope.storageKey,raw,keys});
 await page.goto(`/?envelope=${envelope.id}`);await idle(page);await imagesReady(page.locator('.cg-board img'));
 const original=await snapshot(page),board=await boardIds(page);expect(original[envelope.storageKey]).toBe(raw);
 const records=[];
 async function open(piece){const opener=page.getByRole('button',{name:'Collection',exact:true});await opener.focus();await activate(opener,info);const article=page.locator('.cg-collection-piece').filter({has:page.getByRole('heading',{name:piece.name,exact:true})});await expect(article).toHaveCount(1);await activate(article.getByRole('button',{name:'Open postcard',exact:true}),info);await expect(page.locator('.cg-postcard figcaption')).toContainText(piece.name);await expect(page.getByRole('button',{name:'Download postcard',exact:true})).toBeEnabled();}
 async function retained(){expect(await snapshot(page)).toEqual(original);expect(await boardIds(page)).toEqual(board);}
 async function closed(){await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Collection',exact:true})).toBeFocused();await retained();}
 for(const piece of envelope.catalog.PIECES.filter(piece=>piece.tier>=3)){
  await open(piece);await capturePostcardViews(page,info,piece);await retained();
  const pending=page.waitForEvent('download');await activate(page.getByRole('button',{name:'Download postcard',exact:true}),info);const download=await pending;
  expect(download.suggestedFilename()).toBe(`moticos-${piece.name.toLowerCase().replaceAll(' ','-')}.png`);await mkdir('expansion200-test-results/review',{recursive:true});const path=`expansion200-test-results/review/${info.project.name}-${piece.id}-export.png`;await download.saveAs(path);expect(await download.failure()).toBeNull();const bytes=await readFile(path);expect(bytes.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([1536,1120]);
  await activate(page.getByRole('button',{name:'Back to board',exact:true}),info);await closed();await open(piece);await page.keyboard.press('Escape');await closed();await open(piece);await activate(page.getByRole('button',{name:'Back to board',exact:true}),info);await closed();
  records.push({id:piece.id,sha256:digest(bytes),bytes:bytes.length,viewports:[320,390,430],views:['art','actions'],back:true,escape:true,reopen:true,focusRestored:true,savesRetained:true,boardRetained:true});
 }
 await page.reload();await idle(page);await retained();
 await mkdir('expansion200-test-results/fixture-checks',{recursive:true});await writeFile(`expansion200-test-results/fixture-checks/${info.project.name}-${envelope.id}.json`,JSON.stringify({scope:'legal full-discovery fixture, not fresh UI progression',profile:info.project.name,envelope:envelope.id,identity:runIdentity(),initialAllSavesSha256:digest(JSON.stringify(original)),finalAllSavesSha256:digest(JSON.stringify(await snapshot(page))),initialBoard:board,finalBoard:await boardIds(page),reloadRetained:true,records},null,2));
});
