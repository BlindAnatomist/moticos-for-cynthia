export const CASES = Object.freeze({
 'campaign-chromium': Object.freeze([
 ['C01','play all Garden letters and purchases through visible controls',65000],
 ['C02','play all Moon letters and upgrades then retain the honest ending',75000],
 ['C03','save a nonfirst chosen goal and switch sources without changing stock',30000],
 ['C04','restore sorter cursor and recover a full final-tier board',30000],
 ['C05','serialize native move and supply races and reject stale drag',25000],
 ['C06','bank one delivery across native duplicate and double-click sends',25000],
 ['C07','buy once across native purchase and delivery races',25000],
 ['C08','serialize native chapter entry and compatible-save conversion',30000],
 ['C09','protect bytes and truthful feedback under unknown storage and quota faults',35000],
 ['C10','retain original promises through legacy and same-schema browser conversion',25000],
 ['C11','support keyboard focus reduced motion and optional sound state',30000],
 ['C12','retain equal desktop rows actual art and usable core controls',35000],
 ['C13','keep paired-letter provenance and original postcard downloads across reopen',35000],
 ['C14','compare bounded cache-empty and warm postcard bytes against the renderer',30000],
 ]),
 'campaign-webkit-phone': Object.freeze([
 ['P01','touch the opening letter and resume its saved board',25000],
 ['P02','resume a chosen Moon goal and retain stock through touch source selection',30000],
 ['P03','fit all core controls and equal rows across four phone viewports',65000],
 ['P04','show complete larger-text purchase action and error feedback',45000],
 ['P05','finish isolated practice without saved rewards or a false campaign ending',35000],
 ['P06','guide ready and protected goals and recover full-board touch errors',30000],
 ['P07','make failed delivery and purchase visibly temporary without changing bytes',35000],
 ]),
});
export const ORIGIN='http://127.0.0.1:4198';
export const BUDGETS=Object.freeze({'campaign-chromium':360000,'campaign-webkit-phone':240000});
export const JOB_SECONDS=1080,RESERVE_SECONDS=90,MAX_SCREENSHOTS=23,MAX_POSTCARDS=2,MAX_PNG_FILES=26,MAX_TRACE_FILES=1,MAX_ARTIFACT_BYTES=60*1024*1024;
export const titleFor=(id,title)=>`${id} ${title}`;
export function validateInvocation(args,approved=false){
 const config='--config=playwright.campaign.config.mjs';
 if(!Array.isArray(args)||args[0]!=='test'||new Set(args).size!==args.length)throw Error('Invalid exact campaign invocation');
 const listing=JSON.stringify(args)===JSON.stringify(['test',config,'--list','--reporter=json']);
 const profile=Object.keys(CASES).find(p=>JSON.stringify(args)===JSON.stringify(['test',config,`--project=${p}`]));
 if(!listing&&(!profile||!approved))throw Error('Only read-only collection or the exact separately authorized group is admitted. An operator flag is not user approval.');
 return {listing,profile};
}
export function eligibleBudget(profile,elapsedSeconds){if(!Object.hasOwn(BUDGETS,profile)||!Number.isSafeInteger(elapsedSeconds)||elapsedSeconds<0||JOB_SECONDS-elapsedSeconds<BUDGETS[profile]/1000+RESERVE_SECONDS)throw Error('Insufficient full group budget plus evidence reserve');return BUDGETS[profile];}
// Successful evidence is an exact required set, not just a maximum byte count.
export const REQUIRED_SCREENSHOTS=Object.freeze({
 'campaign-chromium':['C01-garden-complete','C02-authored-finale','C08-chapter-entry-return','C11-large-text','C12-1366-moon','C12-1440-moon','C12-all-collected-art','C13-moon-postcard','C13-garden-postcard'],
 'campaign-webkit-phone':['P01-first-return','P02-chapter-entry-return','P03-320x568-moon','P03-390x664-moon','P03-390x844-moon','P03-430x932-moon','P04-large-error-feedback','P04-large-source-panel','P05-returned-from-practice','P06-ready-hint','P07-unsaved-purchase'],
});
export const REQUIRED_POSTCARDS=Object.freeze(['campaign-results/campaign-chromium/postcards/C13-moon.png','campaign-results/campaign-chromium/postcards/C13-garden.png']);
export const REQUIRED_RECORDS=Object.freeze({
 'campaign-chromium':['C01-garden-ui-route','C02-moon-ui-route','C03-chosen-source-return','C03-late-goal-preserves-newer-panel','C04-sorter-final-errors','C05-native-board-races','C06-native-delivery-once','C07-native-purchase-races','C08-native-entry-conversion','C09-protected-faults','C10-compatible-browser-saves','C11-keyboard-large-text','C11-optional-audio-setting','C12-desktop-art-layout','C13-paired-labels-original-exports','C13-postcard-download-journal','C14-bounded-cache-byte-comparison'],
 'campaign-webkit-phone':['P01-opening-return','P02-touch-goal-return','P03-phone-core-geometry','P04-larger-text-geometry','P04-larger-text-source-panel','P05-isolated-replay','P06-protected-goal-hints','P07-temporary-feedback'],
});
