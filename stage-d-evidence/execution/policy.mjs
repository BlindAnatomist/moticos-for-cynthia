import assert from 'node:assert/strict';import fs from 'node:fs';
export const PROPOSAL=JSON.parse(fs.readFileSync(new URL('../browser-proposal.json',import.meta.url)));
export const ORDER=Object.freeze(PROPOSAL.profiles.map(p=>p.id));
export const CASES=Object.freeze(Object.fromEntries(ORDER.map(p=>[p,PROPOSAL.cases.map(c=>[c.id,c.title,c.timeoutSeconds*1000])])));
export const SCREENSHOTS=Object.freeze(PROPOSAL.cases.flatMap(c=>c.routineScreenshotNames));
export const POSTCARDS=Object.freeze(PROPOSAL.postcardOutputsPerProfile);
export const BUDGETS=Object.freeze(Object.fromEntries(ORDER.map(p=>[p,900000])));
export const LIMITS=Object.freeze({jobSeconds:2160,setupSeconds:180,cleanupSeconds:60,reserveSeconds:120,artifactBytes:134217728,routinePngs:64,postcardPngs:24,failurePngs:1,traces:0,workers:1,retries:0,repeatEach:1,maxFailures:1,runStarts:1});
export const ROOT='stage-d-browser-results',CONFIG='stage-d-evidence/execution/playwright.config.mjs';
export function invocation(args){const listing=JSON.stringify(args)===JSON.stringify(['test',`--config=${CONFIG}`,'--list','--reporter=json']);const profile=ORDER.find(p=>JSON.stringify(args)===JSON.stringify(['test',`--config=${CONFIG}`,`--project=${p}`]));assert(listing||profile,'Only exact22-instance collection or one complete authorized profile is permitted');return{listing,profile};}
export function admit(profile,elapsed){assert(ORDER.includes(profile));assert(Number.isSafeInteger(elapsed)&&elapsed>=0);const available=LIMITS.jobSeconds-elapsed-LIMITS.cleanupSeconds-LIMITS.reserveSeconds;assert(available>0,'No time remains before cleanup/reserve');return Math.min(BUDGETS[profile],available*1000);}

export const TARGET=Object.freeze({repository:'BlindAnatomist/moticos-for-cynthia',ref:'refs/heads/verify/full-campaign-320-20261009'});
export const AUTHORIZATION_REFERENCE='Sentinel_4165cfffe5108191a0aba49c8cd8bba0';
export function environment(env,commit){assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.MOTICOS_320_PUBLIC_REPO,'true');assert.equal(env.GITHUB_REPOSITORY,TARGET.repository);assert.equal(env.GITHUB_REF,TARGET.ref);assert.equal(env.GITHUB_SHA,commit);assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_EVENT_NAME,'push');assert.match(env.GITHUB_RUN_ID??'',/^\d+$/);assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(env.RUNNER_OS,'Linux');}
export function approval(a,id,env){environment(env,id.commit);assert.equal(a.scope,'moticos-stage-d-320-native');assert.equal(a.authorized,true);assert.equal(a.baselineAccepted,true);assert.equal(a.ref,TARGET.ref);assert.equal(a.ownerMessageId,AUTHORIZATION_REFERENCE);assert.deepEqual(a.identity,id);assert.deepEqual(a.limits,LIMITS);assert.deepEqual(a.profiles,ORDER);assert.equal(a.includedAllowanceWithAutomaticZeroDollarStop,true);assert.equal(a.paidOverages,false);return true;}
