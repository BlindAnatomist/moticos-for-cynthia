import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const profiles = ['webkit-iphone-13', 'webkit-iphone-large', 'chromium-desktop'];
const sort = values => values.map(value => JSON.stringify(value)).sort();
export function collect(report) {
  assert.equal(report.errors?.length ?? 0, 0);
  const cases = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      assert.equal(spec.tests.length, 1); const test = spec.tests[0];
      assert.equal(test.expectedStatus, 'passed');
      cases.push({id: test.id ?? spec.id, project: test.projectName, file: spec.file, title: spec.title});
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  return cases;
}
export function verify(contract, report, events = null) {
  assert.equal(contract.schemaVersion, 1); assert.equal(contract.expectedTotal, 3);
  assert.equal(contract.cases.length, 3); assert.equal(new Set(contract.cases.map(test=>test.id)).size, 3);
  assert.deepEqual(contract.cases.map(test=>test.project).sort(), [...profiles].sort());
  assert.deepEqual(sort(collect(report)),sort(contract.cases));
  if (!events) return { collected: 3 };
  const begins=events.filter(event=>event.event==='begin'), ends=events.filter(event=>event.event==='end');
  const starts=events.filter(event=>event.event==='test-begin'), results=events.filter(event=>event.event==='test-end');
  assert.equal(begins.length,1);assert.equal(ends.length,1);
  assert.equal(events[0].event,'begin');assert.equal(events.at(-1).event,'end');
  assert.equal(begins[0].tests,3);assert.equal(begins[0].workers,1);assert.equal(begins[0].maxFailures,1);
  assert.deepEqual(begins[0].retries,[0]);assert.deepEqual([...begins[0].projects].sort(),[...profiles].sort());
  assert.equal(ends[0].status,'passed');
  const identity=e=>({id:e.id,project:e.project,file:basename(e.file),title:e.title.at(-1)});
  assert.deepEqual(sort(starts.map(identity)),sort(contract.cases));assert.deepEqual(sort(results.map(identity)),sort(contract.cases));
  const pending=new Set();
  for(const event of events){
    assert(['begin','end','test-begin','test-end'].includes(event.event));
    if(event.event==='test-begin'){assert.equal(event.retry,0);assert.equal(pending.size,0);pending.add(event.id);}
    if(event.event==='test-end'){assert(pending.delete(event.id));assert.equal(event.retry,0);assert.equal(event.status,'passed');assert.equal(event.expectedStatus,'passed');assert.equal(event.errors.length,0);}
  }
  assert.equal(pending.size,0);
  assert.equal(report.stats.expected,3);for(const field of ['unexpected','skipped','flaky'])assert.equal(report.stats[field],0);
  function terminal(suite){for(const spec of suite.specs??[])for(const test of spec.tests??[]){assert.equal(test.status,'expected');assert.equal(test.results.length,1);assert.equal(test.results[0].status,'passed');assert.equal(test.results[0].retry,0);assert.equal(test.results[0].errors?.length??0,0);}for(const child of suite.suites??[])terminal(child);}
  for(const suite of report.suites??[])terminal(suite);
  return {status:'passed',uniqueCases:3,retries:0,skipped:0,failed:0,results};
}
function main(){
  const [mode,input,journal,output]=process.argv.slice(2);
  const contract=read('tests/verification/collage-live-coverage.json');
  for(const file of contract.pinnedFiles)assert.equal(sha(readFileSync(file.path)),file.sha256);
  if(mode==='collected'){console.log(JSON.stringify(verify(contract,read(input))));return;}
  assert.equal(mode,'completed');
  const expected=read('tests/verification/collage-live-contract.json');assert.equal(expected.status,'release-candidate-accepted');
  const proof=verify(contract,read(input),readFileSync(journal,'utf8').trim().split('\n').map(line=>JSON.parse(line)));
  const exports=profiles.map(profile=>`${profile}-live-wr3-export.png`);
  assert.deepEqual(readdirSync('batch-test-results/review').filter(file=>file.endsWith('-export.png')).sort(),[...exports].sort());
  const exported=exports.map(file=>{const bytes=readFileSync(`batch-test-results/review/${file}`);assert(bytes.length>10000);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1536);assert.equal(bytes.readUInt32BE(20),1120);return {file,sha256:sha(bytes),bytes:bytes.length};});
  Object.assign(proof,{releaseCommit:expected.releaseCommit,sourceFingerprint:expected.sourceFingerprint,liveUrl:expected.liveUrl,actualExports:exported,visualReview:'Required separately before live verification is announced'});
  writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log('All three hosted profiles passed once with three actual postcard exports.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main();
