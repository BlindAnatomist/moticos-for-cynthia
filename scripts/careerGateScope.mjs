export const CASES = Object.freeze({
 'career-chromium':Object.freeze([
  ['D01','keep equal readable desktop rows across empty fresh dense and mixed boards',90000],
  ['D02','keep desktop tracks stable through placement merge Cut move Undo and larger text',90000],
 ]),
 'career-webkit-phone':Object.freeze([
  ['M01','preserve phone core fit and complete quantity glyphs at two portrait sizes',90000],
  ['M02','keep larger-text phone rows art and quantity labels readable',60000],
 ]),
});
export const BUDGETS=Object.freeze({'career-chromium':150000,'career-webkit-phone':150000});
export const ORIGIN='http://127.0.0.1:4199';
export const JOB_SECONDS=600,RESERVE_SECONDS=135,MAX_PNG_FILES=14,MAX_ARTIFACT_BYTES=60*1024*1024;
export const titleFor=(id,title)=>`${id} ${title}`;
export function validateInvocation(args,approved=false){const config='--config=playwright.career.config.js';if(!Array.isArray(args)||args[0]!=='test'||new Set(args).size!==args.length)throw Error('Invalid exact career invocation');const listing=JSON.stringify(args)===JSON.stringify(['test',config,'--list','--reporter=json']);const profile=Object.keys(CASES).find(p=>JSON.stringify(args)===JSON.stringify(['test',config,`--project=${p}`]));if(!listing&&(!profile||!approved))throw Error('Only exact approved group execution or read-only JSON collection is admitted. Flags are not user approval.');return{listing,profile};}
export function eligibleBudget(profile,elapsedSeconds){if(!Object.hasOwn(BUDGETS,profile)||!Number.isSafeInteger(elapsedSeconds)||elapsedSeconds<0||JOB_SECONDS-elapsedSeconds<(BUDGETS[profile]/1000)+RESERVE_SECONDS)throw Error('Insufficient complete browser budget plus cleanup reserve; do not start group');return BUDGETS[profile];}
