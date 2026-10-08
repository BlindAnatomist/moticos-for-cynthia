import {boundedProcess} from './bounded-process.mjs';
// Always stage failure evidence even when complete acceptance is impossible.
const packaged=await boundedProcess(process.execPath,['full-campaign-gate/package.mjs'],{timeout:30000});console.log('Acceptance packaging:',JSON.stringify(packaged));const staged=await boundedProcess(process.execPath,['full-campaign-gate/stage.mjs'],{timeout:10000});if(staged.status!==0||staged.timedOut||staged.error)process.exitCode=1;
