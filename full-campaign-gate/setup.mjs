// Future workflow only; preparing this file is not authorization to install.
import {boundedProcess} from './bounded-process.mjs';import {SETUP_SECONDS} from './scope.mjs';import {verifyDispatch} from './dispatch.mjs';verifyDispatch();
const epoch=Number(process.env.MOTICOS_FULL_JOB_EPOCH);if(!Number.isSafeInteger(epoch)||epoch<=0)throw Error('Original job clock required');
for(const [command,args,ceiling]of [['npm',['ci','--no-audit','--no-fund'],120000],[process.execPath,['node_modules/@playwright/test/cli.js','install','--with-deps','chromium','webkit'],180000]]){const remaining=SETUP_SECONDS*1000-(Date.now()-epoch*1000)-5000;if(remaining<=0)throw Error('Aggregate setup budget exhausted');const result=await boundedProcess(command,args,{timeout:Math.min(ceiling,remaining)});if(result.status!==0||result.timedOut||result.error)throw Error('Bounded setup failed: '+JSON.stringify(result));}
if(Date.now()-epoch*1000>SETUP_SECONDS*1000)throw Error('Setup over budget');
