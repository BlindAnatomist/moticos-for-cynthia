export const CASES=Object.freeze({
 'full-chromium':Object.freeze([
 ['D01','make and send the foundation opening through visible controls',45000],
 ['D02','render all original sixteen chapter entries and endings with original art',150000],
 ['D03','choose Fine Print separate Folds and protect exact quantities',60000],
 ['D04','play the final two letters through visible controls and reach Written',150000],
 ['D05','migrate schemas one through four under native locks and protect against an old writer',75000],
 ['D06','serialize held entry and delivery races without resurrecting promises',75000],
 ['D07','preserve delayed modal ownership keyboard focus replay and muted audio state',75000],
 ['D08','preserve saved bytes under denial quota and oversized writes',60000],
 ['D09','navigate original160 collection and inspect legacy and Written postcards',75000],
 ['D10','compare legacy and Written cache output with the original renderer',45000],
 ['D11','preserve old saves and explicitly open Stage A from the original finale',75000],
 ['D12','send three Second Look letters across its one-letter camera gate with retained stock',90000],
 ['D13','enter both Loose Ends sources and choose between exact-quantity requests',90000],
 ['D14','navigate the completed200 collection and export a new-family postcard',60000],
 ]),
 'full-webkit-phone':Object.freeze([
 ['M01','keep an optional chosen goal and Send beside a separate chapter action',60000],
 ['M02','enter later chapters and switch sources without changing retained stock',60000],
 ['M03','retain the core board at all four phone sizes',90000],
 ['M04','scroll enlarged text sources and Wayfinder without clipping',60000],
 ['M05','resume switch return and reload held letters using touch',60000],
 ['M06','navigate directly to Written and replay without career rewards',90000],
 ['M07','reject duplicate touch delivery and preserve newer modal ownership',60000],
 ['M08','show quota failures as temporary and retain free board recovery',60000],
 ])});
export const ORIGIN='http://127.0.0.1:4198';
export const RESULTS='full-browser-results';
// PROPOSED ONLY: these larger ceilings require explicit review and fresh user
// run approval. They do not alter the old harness or establish measured fit.
export const BUDGETS=Object.freeze({'full-chromium':600000,'full-webkit-phone':420000});
export const JOB_SECONDS=1800,RESERVE_SECONDS=120,PREFLIGHT_SECONDS=300,SETUP_SECONDS=300,GROUP_CLEANUP_SECONDS=15;
export const MAX_SCREENSHOTS=23,MAX_POSTCARDS=2,MAX_PNG_FILES=26,MAX_TRACE_FILES=1,MAX_ARTIFACT_BYTES=60*1024*1024;
export const REQUIRED_SCREENSHOTS=Object.freeze({
 'full-chromium':['D01-opening','D11-entry','D12-camera','D13-competition','D14-new-family','D03-folds','D04-written','D06-held-return','D09-gallery','D09-legacy','D09-written'],
 'full-webkit-phone':['M01-optional-goal','M02-entry','M03-320x568','M03-390x664','M03-390x844','M03-430x932','M04-wayfinder','M04-sources','M05-held-return','M06-replay-return','M07-delayed-modal','M08-temporary'],
});
export const REQUIRED_POSTCARDS=Object.freeze(['full-chromium/postcards/D09-b1.png','full-chromium/postcards/D14-cm5.png']);
export const expectedOriginals=()=>Object.entries(REQUIRED_SCREENSHOTS).flatMap(([profile,names])=>names.map(name=>`${profile}/screenshots/${name}.png`)).concat(REQUIRED_POSTCARDS);
export function validateInvocation(args,approved=false){
 const config='--config=playwright.full-campaign.config.mjs';if(!Array.isArray(args)||new Set(args).size!==args.length)throw Error('Invalid exact invocation');
 const listing=JSON.stringify(args)===JSON.stringify(['test',config,'--list','--reporter=json']);const profile=Object.keys(CASES).find(p=>JSON.stringify(args)===JSON.stringify(['test',config,`--project=${p}`]));
 if(!listing&&(!profile||!approved))throw Error('Only exact read-only collection or a separately approved bounded group is permitted');return{listing,profile};
}
export function remainingRunSeconds(profile){const profiles=Object.keys(CASES),index=profiles.indexOf(profile);if(index<0)throw Error('Unknown profile');return profiles.slice(index).reduce((n,p)=>n+BUDGETS[p]/1000+GROUP_CLEANUP_SECONDS,RESERVE_SECONDS);}
export function eligibleBudget(profile,elapsed){if(!Object.hasOwn(BUDGETS,profile)||!Number.isSafeInteger(elapsed)||elapsed<0||JOB_SECONDS-elapsed<remainingRunSeconds(profile))throw Error('Insufficient remaining complete-run budget and reserve');return BUDGETS[profile];}
