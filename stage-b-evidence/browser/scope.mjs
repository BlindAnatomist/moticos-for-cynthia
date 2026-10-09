// Proposed limits only: no execution authorization or launcher.
export const CASE_LIMITS=Object.freeze({B1:120000,B2:120000,B3:60000,B4:180000,B5:90000,B6:100000,B7:100000,B8:100000,B9:100000,B10:100000,B11:100000,B12:100000,B13:100000,B14:90000,B15:120000,B16:180000,B17:180000,B18:180000});
export const PROFILE_MS=Object.values(CASE_LIMITS).reduce((a,b)=>a+b,0);
export const SCREENSHOTS=Object.freeze([320,360,390,430].flatMap(w=>[`B16-${w}-normal.png`,`B16-${w}-large.png`]));
export const PROPOSAL=Object.freeze({approved:false,profiles:2,instances:36,profileMilliseconds:PROFILE_MS,setupSeconds:300,cleanupSeconds:60,reserveSeconds:120,totalSeconds:2*PROFILE_MS/1000+480,artifactBytes:64*1024*1024,postcards:16,routineScreenshots:16,failureScreenshots:2,failureTraces:2,workers:1,retries:0,maxFailures:1});
export function screenshotAllowed(name){if(!SCREENSHOTS.includes(name))throw Error('Unreviewed Stage B screenshot');return true;}
export function scenarioFor(test){return(title,fn)=>{const id=title.split(' ')[0];if(!CASE_LIMITS[id])throw Error('Unreviewed Stage B case: '+id);test.describe(id,()=>{test.describe.configure({timeout:CASE_LIMITS[id]});test(title,fn);});};}
export function verifyFilename(actual,expected){if(typeof expected!=='string'||!expected.endsWith('.png')||actual!==expected)throw Error('Downloaded filename differs from expected renderer filename');return true;}
