import fs from 'node:fs';
import {requireApproval,probeRoot} from './binding.mjs';
import {REPO_ROOT,requireRepoCwd} from './paths.mjs';
import {assetPaths,createAssetServer} from './server-core.mjs';
requireRepoCwd();requireApproval();
const core=JSON.parse(fs.readFileSync('stage-e-build.json')),probe=JSON.parse(fs.readFileSync('stage-e-probe.preparation.json'));
const server=createAssetServer(assetPaths(core,probe,REPO_ROOT,probeRoot()));
server.listen(4198,'127.0.0.1');for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
