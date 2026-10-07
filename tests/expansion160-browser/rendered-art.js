import {currentCatalog} from '../../scripts/currentCandidate.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {boundedDiagnosticObservation} from './collection-evidence.js';
import {verifyRenderedArt} from '../../scripts/expansion160RenderedArt.mjs';
let manifest,currentSources;
export async function renderedArt(locator,id){
 manifest??=JSON.parse(await readFile('dist-expansion160/expansion160-manifest.json','utf8'));
 await expect(locator).toHaveCount(1);
 const value=await boundedDiagnosticObservation(()=>locator.evaluate(async image=>{await image.decode();return {source:image.currentSrc||image.src,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight};}),7500);
 verifyRenderedArt(value,id,manifest.catalogAssets);
 const response=await locator.page().request.get(value.source);expect(response.ok()).toBe(true);
 const bytes=await response.body();currentSources??=await currentCatalog();
 const source=currentSources.find(piece=>piece.id===id);expect(source).toBeDefined();
 const sourceBytes=await readFile(source.sourceFile);expect(bytes.equals(sourceBytes)).toBe(true);
 const observedSha256=createHash('sha256').update(bytes).digest('hex');
 const asset=manifest.catalogAssets.find(asset=>asset.id===id);expect(observedSha256).toBe(asset.sha256);expect(bytes.length).toBe(asset.bytes);
 return {...value,pieceId:id,assetSha256:asset.sha256,observedSha256,observedBytes:bytes.length};
}
