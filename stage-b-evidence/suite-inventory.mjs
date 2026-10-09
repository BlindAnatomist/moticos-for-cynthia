import assert from 'node:assert/strict';
export const RUNTIME_SUITES=Object.freeze(['stage-b-evidence/economy.test.mjs','stage-b-evidence/runtime.test.mjs']);
export const BROWSER_CONTRACT_SUITES=Object.freeze(['stage-b-evidence/browser/contracts.test.mjs','stage-b-evidence/browser/interactions.test.mjs']);
export const EXECUTION_CONTRACT_SUITES=Object.freeze(['stage-b-evidence/execution/contracts.test.mjs']);
export function stageBSuites(files){const found=files.map(r=>typeof r==='string'?r:r.file).filter(f=>f.startsWith('stage-b-evidence/')&&f.endsWith('.test.mjs')).sort();assert.deepEqual(found,[...RUNTIME_SUITES,...BROWSER_CONTRACT_SUITES,...EXECUTION_CONTRACT_SUITES].sort(),'Stage B test inventory changed: explicitly register every intended suite');return{runtime:[...RUNTIME_SUITES],browserContracts:[...BROWSER_CONTRACT_SUITES],executionContracts:[...EXECUTION_CONTRACT_SUITES]};}
