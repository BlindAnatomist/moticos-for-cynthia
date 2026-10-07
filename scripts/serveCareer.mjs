import {spawn} from 'node:child_process';
import {verifyBuild} from './verifyCareerBuild.mjs';
verifyBuild();
// Serves the one existing build. No install/build, fallback port or external host.
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','career.vite.config.js','--outDir','dist-career','--host','127.0.0.1','--port','4199','--strictPort'],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error);process.exitCode=1;});child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
