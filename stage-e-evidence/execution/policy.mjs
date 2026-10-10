import assert from 'node:assert/strict';
import {CASES as DECLARATIONS,SCREENSHOTS as BY_PROFILE} from '../browser/scope.mjs';
export const ORDER=Object.freeze(['touch-drag-chromium','touch-drag-webkit']);
export const CASES=Object.freeze(Object.fromEntries(ORDER.map(p=>[p,DECLARATIONS])));
export const PROFILE_SCREENSHOTS=Object.freeze(BY_PROFILE);
export const SCREENSHOTS=Object.freeze(ORDER.flatMap(p=>BY_PROFILE[p]));
export const POSTCARDS=Object.freeze([]);
export const BUDGETS=Object.freeze(Object.fromEntries(ORDER.map(p=>[p,900000])));
export const LIMITS=Object.freeze({jobSeconds:2160,setupSeconds:180,cleanupSeconds:60,reserveSeconds:120,artifactBytes:134217728,routinePngs:5,postcardPngs:0,failurePngs:1,traces:0,workers:1,retries:0,repeatEach:1,maxFailures:1,runStarts:1});
export const ROOT='stage-e-browser-results',CONFIG='stage-e-evidence/execution/playwright.config.mjs';
export const TARGET=Object.freeze({repository:'BlindAnatomist/moticos-for-cynthia',ref:'refs/heads/verify/touch-drag-20261010'});
export const AUTHORIZATION_REFERENCE='Sentinel_d05c533f7b60819181fcf058979ad214';
export function invocation(args){const listing=JSON.stringify(args)===JSON.stringify(['test',`--config=${CONFIG}`,'--list','--reporter=json']);const profile=ORDER.find(p=>JSON.stringify(args)===JSON.stringify(['test',`--config=${CONFIG}`,`--project=${p}`]));assert(listing||profile,'Only exact 16-instance collection or one complete authorized touch-drag profile is permitted');return{listing,profile};}
export function admit(profile,elapsed){assert(ORDER.includes(profile));assert(Number.isSafeInteger(elapsed)&&elapsed>=0);const available=LIMITS.jobSeconds-elapsed-LIMITS.cleanupSeconds-LIMITS.reserveSeconds;assert(available>0,'No time remains before cleanup/reserve');return Math.min(BUDGETS[profile],available*1000);}
export function environment(env,commit){assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.MOTICOS_STAGE_E_PUBLIC_REPO,'true');assert.equal(env.GITHUB_REPOSITORY,TARGET.repository);assert.equal(env.GITHUB_REF,TARGET.ref);assert.equal(env.GITHUB_SHA,commit);assert.match(commit,/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_EVENT_NAME,'push');assert.match(env.GITHUB_RUN_ID??'',/^\d+$/);assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(env.RUNNER_OS,'Linux');}
export function approval(a,id,env){environment(env,id.commit);assert.equal(a.scope,'moticos-stage-e-touch-drag');assert.equal(a.authorized,true);assert.equal(a.baselineAccepted,true);assert.equal(a.ref,TARGET.ref);assert.equal(a.ownerMessageId,AUTHORIZATION_REFERENCE);assert.deepEqual(a.identity,id);assert.deepEqual(a.limits,LIMITS);assert.deepEqual(a.profiles,ORDER);assert.equal(a.includedAllowanceWithAutomaticZeroDollarStop,true);assert.equal(a.paidOverages,false);return true;}
export const EVIDENCE_SCOPES=Object.freeze({
 'touch-drag-chromium':'Chromium CDP trusted touch, native mouse and keyboard; emulation is not a physical iPhone.',
 'touch-drag-webkit':'WebKit native mouse/tap/keyboard plus explicitly synthetic PointerEvent handlers with capture shim; no native WebKit continuous touch gesture claim.',
});
export const ACCEPTANCE_MEANING='Focused browser checks passed; Chromium trusted CDP touch and native mouse/keyboard, WebKit native tap/mouse/keyboard plus labeled synthetic handler checks. Original-pixel review and publication remain separate.';
export const SCREENSHOT_DIMENSIONS=Object.freeze({
 'E01-drag-feedback.png':[390,664],
 'E01-move-result.png':[390,664],
 'E01-merge-result.png':[390,664],
 'E06-large-text-edge.png':[320,664],
 'E08-keyboard-result.png':[1170,1992],
});
