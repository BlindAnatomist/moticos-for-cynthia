// Playwright leaves unfinalized recorder working files even for successful cases.
// They are not the canonical final per-case trace.zip, raw result, progress ledger,
// failure context, screenshot, downloaded postcard or runner status metadata.
// Keep originals on the runner; record their bytes and streamed hashes separately.
export function isWorkingTrace(file){return /^(?:campaign-results\/)?campaign-(?:chromium|webkit-phone)\/raw\/\.playwright-artifacts-\d+\/traces\/[^/]+\.(?:trace|network)$/.test(file);}

import {readFileSync} from 'node:fs';
import {join,posix} from 'node:path';
import assert from 'node:assert/strict';
const profiles=['campaign-chromium','campaign-webkit-phone'];
const relativeFile=file=>file.replace(/^campaign-results\//,'');
// Playwright createGuid() uses 16 random bytes encoded as 32 lowercase hex digits.
export function isRecorderPng(file){return /^(?:campaign-results\/)?campaign-(?:chromium|webkit-phone)\/raw\/\.playwright-artifacts-\d+\/[a-f0-9]{32}\.png$/.test(file);}
function attachmentsIn(value,out=[]){
 if(!value||typeof value!=='object')return out;
 if(Object.hasOwn(value,'attachments')){
  assert(Array.isArray(value.attachments),'Malformed attachments');
  for(const a of value.attachments){
   assert(a&&typeof a==='object','Malformed attachment');
   if(Object.hasOwn(a,'path')){assert(typeof a.path==='string'&&a.path.length>0,'Malformed attachment path');out.push(a.path.replaceAll('\\','/'));}
   else assert(typeof a.body==='string','Unresolved attachment');
  }
 }
 for(const [key,child] of Object.entries(value))if(key!=='attachments')attachmentsIn(child,out);
 return out;
}
export function readEvidenceReports(root='campaign-results'){
 return Object.fromEntries(profiles.map(profile=>{try{const report=JSON.parse(readFileSync(join(root,profile,'results.json'),'utf8'));assert(Array.isArray(report.suites));attachmentsIn(report);return[profile,report];}catch{return[profile,null];}}));
}
export function evidenceEligibility(reports){
 const references=new Set();let complete=true;
 for(const profile of profiles){
  try{assert(reports[profile]&&Array.isArray(reports[profile].suites));for(const path of attachmentsIn(reports[profile]))references.add(posix.basename(path));}
  catch{complete=false;}
 }
 return file=>{
  if(isWorkingTrace(file))return false;
  if(!isRecorderPng(file))return true;
  // Any missing/unreadable report leaves cross-profile references unresolved.
  // Any same-basename reference in either report conservatively retains the PNG.
  // Content equality with a planned image never decides eligibility.
  return !complete||references.has(posix.basename(file));
 };
}
export function verifyFailureEvidence(files,reports){
 function visit(value,profile){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value.results))for(const result of value.results){
   if(!['failed','timedOut','interrupted'].includes(result.status))continue;
   const paths=attachmentsIn(result);
   for(const pattern of[/^test-failed-\d+\.png$/,/^trace\.zip$/]){
    const found=paths.some(path=>pattern.test(posix.basename(path))&&files.some(row=>{
     const file=relativeFile(row.file);
     return file.startsWith(profile+'/raw/')&&(path===file||path.endsWith('/'+file)||path===file.slice(profile.length+1)||file.endsWith('/'+path));
    }));
    assert(found,`Missing canonical failure evidence for ${profile}: ${pattern}`);
   }
  }
  for(const [key,child] of Object.entries(value))if(key!=='results')visit(child,profile);
 }
 for(const profile of profiles)if(reports[profile])visit(reports[profile],profile);
}
