import {mkdirSync,copyFileSync,chmodSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {trackedInventory} from './currentCandidate200Postcards.mjs';
for(const record of trackedInventory()) {
 const target=join('preflight-results/source',record.file);mkdirSync(dirname(target),{recursive:true});copyFileSync(record.file,target);chmodSync(target,record.mode==='100755'?0o755:0o644);
}
