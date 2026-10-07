export const CASES = Object.freeze({
 'career-chromium': Object.freeze([
  ['C01','complete nine letters and three purchases through the UI',180000],
  ['C02','restore supply cursor and recover a full final board',60000],
  ['C03','serialize native two-tab move and supply commands',45000],
  ['C04','pay one order once across two tabs and reload',45000],
  ['C05','commit one purchase across native two-tab races',45000],
  ['C06','protect saved bytes across four storage failure modes',60000],
  ['C07','support keyboard dialogs and persistent larger text',45000],
  ['C08','render accepted art desktop layout and postcard output',45000],
 ]),
 'career-webkit-phone': Object.freeze([
  ['P01','complete the first request with touch and resume',60000],
  ['P02','target sorter supply with touch and survive interruption',60000],
  ['P03','fit three narrow viewports with usable touch targets',75000],
  ['P04','keep larger text and modal return usable on a phone',60000],
 ]),
});
export const BUDGETS = Object.freeze({'career-chromium':480000,'career-webkit-phone':240000});
export const ORIGIN='http://127.0.0.1:4199';
export const JOB_SECONDS=1200,RESERVE_SECONDS=135,MAX_SCREENSHOTS=20,MAX_ARTIFACT_BYTES=60*1024*1024;
export const titleFor=(id,title)=>`${id} ${title}`;
export function validateInvocation(args, approved=false) {
 const config='--config=playwright.career.config.js';
 if(!Array.isArray(args)||args[0]!=='test'||new Set(args).size!==args.length)throw Error('Invalid exact career invocation');
 const listing=JSON.stringify(args)===JSON.stringify(['test',config,'--list','--reporter=json']);
 const profile=Object.keys(CASES).find(p=>JSON.stringify(args)===JSON.stringify(['test',config,`--project=${p}`]));
 if(!listing&&(!profile||!approved))throw Error('Only exact approved group execution or read-only JSON collection is admitted. Flags are not user approval.');
 return {listing,profile};
}
export function eligibleBudget(profile,elapsedSeconds){if(!Object.hasOwn(BUDGETS,profile)||!Number.isSafeInteger(elapsedSeconds)||elapsedSeconds<0||JOB_SECONDS-elapsedSeconds<(BUDGETS[profile]/1000)+RESERVE_SECONDS)throw Error('Insufficient complete browser budget plus cleanup reserve; do not start group');return BUDGETS[profile];}
