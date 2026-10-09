import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CASES as HISTORICAL,BUDGETS as OLD_BUDGETS} from '../../full-campaign-gate/scope.mjs';
import {CASE_LIMITS,PROFILE_MS} from '../browser/scope.mjs';
const titles=JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)));
const additions=Object.entries(CASE_LIMITS).map(([id,ms])=>[id,titles[id],ms]);
export const CASES=Object.freeze({...HISTORICAL,'stage-b-chromium':additions,'stage-b-webkit-phone':additions});
export const ORDER=Object.freeze(Object.keys(CASES));
export const BUDGETS=Object.freeze({...OLD_BUDGETS,'stage-b-chromium':PROFILE_MS,'stage-b-webkit-phone':PROFILE_MS});
export const LIMITS=Object.freeze({jobSeconds:6480,setupSeconds:300,preflightSeconds:600,cleanupSeconds:15,reserveSeconds:180,artifactBytes:124*1024*1024,legacyArtifactBytes:60*1024*1024,newArtifactBytes:64*1024*1024,regularPngs:57,failurePngs:1,traces:1,workers:1,retries:0,maxFailures:1,runStarts:1});
export const CONFIG='stage-b-evidence/execution/playwright.config.mjs';
export const ROOT='full-browser-results/stage-b-execution';
export const TARGET={repository:'BlindAnatomist/moticos-for-cynthia',ref:'refs/heads/verify/full-campaign-240-20261009'};
export function invocation(args){assert(Array.isArray(args));const listing=JSON.stringify(args)===JSON.stringify(['test',`--config=${CONFIG}`,'--list','--reporter=json']);const profile=ORDER.find(p=>JSON.stringify(args)===JSON.stringify(['test',`--config=${CONFIG}`,`--project=${p}`]));assert(listing||profile,'Only exact collection or one bounded profile is permitted');return{listing,profile};}
export function remaining(profile){const n=ORDER.indexOf(profile);assert(n>=0);return ORDER.slice(n).reduce((sum,p)=>sum+BUDGETS[p]/1000+LIMITS.cleanupSeconds,LIMITS.reserveSeconds);}
export function admit(profile,elapsed){assert(Number.isSafeInteger(elapsed)&&elapsed>=0);assert(LIMITS.jobSeconds-elapsed>=remaining(profile),'Insufficient complete remaining scope and reserve');return BUDGETS[profile];}
export function approval(a,identity,env){assert.equal(a.status,'explicit-owner-approved');assert.equal(a.scope,'moticos-240-58-cases');assert.deepEqual(a.limits,LIMITS);assert.deepEqual(a.profiles,ORDER);for(const k of ['sourceFingerprint','buildFingerprint','probeFingerprint','commit'])assert.equal(a[k],identity[k],k);assert.match(a.authorizationReference??'',/\S/);assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.MOTICOS_240_PUBLIC_REPO,'true');assert.equal(env.GITHUB_REPOSITORY,TARGET.repository);assert.equal(env.GITHUB_REF,TARGET.ref);assert.equal(env.GITHUB_SHA,identity.commit);assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_EVENT_NAME,'push');assert.match(env.GITHUB_RUN_ID??'',/^\d+$/);assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(env.RUNNER_OS,'Linux');return true;}
