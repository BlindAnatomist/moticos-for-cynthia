import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { verifyCollection, verifyCompleted, verifyPinnedFiles, validateContract } from '../scripts/verifyRemainingCoverage.mjs';
const contract = JSON.parse(readFileSync(new URL('./verification/lantern-coverage-contract.json', import.meta.url)));
const event = (item, type) => ({ event: type, ...item, file: `/runner/tests/e2e/${item.file}`, title: ['', item.project, item.file, item.title], retry: 0,
  ...(type === 'test-end' ? { status: 'passed', expectedStatus: 'passed', errors: [] } : {}) });
const events = () => [{ event: 'begin', tests: 76, workers: 2 }, ...contract.remaining.flatMap(item => [event(item, 'test-begin'), event(item, 'test-end')]), { event: 'end', status: 'passed' }];
const report = cases => ({ errors: [], suites: [{ specs: cases.map(item => ({ ...item, tests: [{ projectName: item.project }] })) }] });

describe('unchanged-runtime continuation coverage', () => {
  it('pins all runtime, art, dependencies and browser tests against the 170-pass source', () => verifyPinnedFiles(contract, process.cwd()));
  it('collects exactly 170 prior plus 76 remaining identities', () => expect(verifyCollection(contract, report([...contract.priorPassed, ...contract.remaining]), report(contract.remaining))).toMatchObject({ total: 246, selected: 76 }));
  it('accepts exactly 76 terminal passes and proves the union', () => expect(verifyCompleted(contract, events())).toMatchObject({ complete: true, uniquePassed: 246, retries: 0 }));
  it('rejects overlap between prior and remaining coverage', () => expect(() => validateContract({ ...contract, remaining: [contract.priorPassed[0], ...contract.remaining.slice(1)] })).toThrow());
  it('rejects a collection omission', () => expect(() => verifyCollection(contract, report([...contract.priorPassed, ...contract.remaining]), report(contract.remaining.slice(1)))).toThrow());
  it('rejects a changed title even when the test ID stays the same', () => expect(() => verifyCollection(contract, report([...contract.priorPassed, ...contract.remaining]), report(contract.remaining.map((item, i) => i ? item : { ...item, title: 'changed' })))).toThrow());
  it('rejects collection errors', () => expect(() => verifyCollection(contract, { errors: ['failed'], suites: [] }, report(contract.remaining))).toThrow());
  it('rejects an unfinished test', () => expect(() => verifyCompleted(contract, events().filter((item, i) => i !== 2))).toThrow());
  it.each(['failed', 'timedOut', 'interrupted', 'skipped'])('rejects a %s result', status => { const values = events(); values[2].status = status; expect(() => verifyCompleted(contract, values)).toThrow(); });
  it('rejects a retry', () => { const values = events(); values[2].retry = 1; expect(() => verifyCompleted(contract, values)).toThrow(); });
  it('rejects a duplicate terminal result', () => { const values = events(); values.push(values[2]); expect(() => verifyCompleted(contract, values)).toThrow(); });
  it('rejects a missing terminal run status', () => expect(() => verifyCompleted(contract, events().slice(0, -1))).toThrow());
  it('rejects a globally interrupted run', () => { const values = events(); values.at(-1).status = 'interrupted'; expect(() => verifyCompleted(contract, values)).toThrow(); });
  it('rejects an extra previously passed case', () => expect(() => verifyCompleted(contract, [...events(), event(contract.priorPassed[0], 'test-end')])).toThrow());
  it('rejects a changed pinned digest', () => expect(() => verifyPinnedFiles({ ...contract, pinnedFiles: contract.pinnedFiles.map((item, i) => i ? item : { ...item, sha256: '0'.repeat(64) }) }, process.cwd())).toThrow());
});
