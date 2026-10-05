import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {verifyRecheckContracts,verifyCrossRunProvenance} from '../scripts/verifyExpansion120Recheck.mjs';
const read=name=>JSON.parse(readFileSync(`tests/verification/${name}.json`));
const policy=read('expansion120-large-recheck-contract'),prior=read('expansion120-prior-coverage-contract'),current=read('expansion120-coverage-contract');
const priorBytes=readFileSync('tests/verification/expansion120-prior-coverage-contract.json');
const base={sourceFingerprint:policy.runtimeFingerprint,cases:18,actualExports:24,buildFilesFingerprint:policy.priorBuildFilesFingerprint};
const original=()=>policy.retainedProfiles.map(profile=>({...base,profile,runCommit:policy.priorRunCommit,harnessFingerprint:policy.priorHarnessFingerprint}));
const fresh=()=>({...base,runId:'99999999999',contractSha256:'e'.repeat(64),profile:policy.recheckedProfile,runCommit:'b'.repeat(40),harnessFingerprint:'c'.repeat(64),collectionProgress:{envelopes:12,decodedImages:120,captures:12,savedBytesUnchanged:true}});
it('freezes both contracts with exactly the same 54 identities, source and art requirements',()=>verifyRecheckContracts(policy,prior,current,priorBytes));
it.each(['sourceFingerprint','cases','pieceIds','postcardIds','envelopeIds'])('refuses drift in %s',key=>{
 const changed=structuredClone(current);changed[key]=key==='sourceFingerprint'?'a'.repeat(64):changed[key].slice(1);
 expect(()=>verifyRecheckContracts(policy,prior,changed,priorBytes)).toThrow();
});
it('carries old profile provenance explicitly instead of claiming one new all-profile run',()=>{
 const proof=verifyCrossRunProvenance(policy,original(),fresh());expect(proof.cases).toBe(54);expect(proof.actualExports).toBe(72);
 expect(proof.profiles.slice(0,2).map(p=>p.runId)).toEqual([policy.priorRunId,policy.priorRunId]);expect(new Set(proof.profiles.map(p=>p.runCommit)).size).toBe(2);
});
it.each(['runCommit','harnessFingerprint','buildFilesFingerprint','sourceFingerprint','cases','actualExports'])('rejects invalid old %s',key=>{
 const proofs=original();proofs[0][key]=typeof proofs[0][key]==='number'?0:'d'.repeat(64);expect(()=>verifyCrossRunProvenance(policy,proofs,fresh())).toThrow();
});
it('rejects substituted profiles or incomplete new collection evidence',()=>{
 expect(()=>verifyCrossRunProvenance(policy,original().slice(1),fresh())).toThrow();const proof=fresh();proof.collectionProgress.decodedImages=119;
 expect(()=>verifyCrossRunProvenance(policy,original(),proof)).toThrow();
});
