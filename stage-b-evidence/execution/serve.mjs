import fs from 'node:fs';
import {requireApproval} from './binding.mjs';
import {REPO_ROOT,EXECUTION_ROOT,requireRepoCwd} from './paths.mjs';
import {assetPaths,createAssetServer} from './server-core.mjs';
requireRepoCwd();requireApproval();
const core=JSON.parse(fs.readFileSync('full-campaign-build.json')),probe=JSON.parse(fs.readFileSync(`${EXECUTION_ROOT}/probe-build.json`));
const server=createAssetServer(assetPaths(core,probe,REPO_ROOT,process.env.MOTICOS_STAGE_B_PROBE_OUTPUT));
server.listen(4198,'127.0.0.1');for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
