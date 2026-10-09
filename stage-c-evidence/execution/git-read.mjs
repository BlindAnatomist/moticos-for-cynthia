// GitHub checks out the owned workspace using a temporary HOME. Container
// reads may use another HOME. Trust only this exact checkout for each read;
// never write persistent Git configuration or accept other owned/unowned repos.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve,parse} from 'node:path';
import {REPO_ROOT,requireRepoCwd} from './paths.mjs';
export function scopedReadArgs(root,args) {
  const exact=resolve(root);assert(exact!==parse(exact).root&&!exact.includes('*'),'Exact checkout path required');
  assert(Array.isArray(args));
  const allowed=(args.length===2&&args[0]==='rev-parse'&&(args[1]==='HEAD'||/^[a-f0-9]{40}\^\{tree\}$/.test(args[1])))||
    (args.length===4&&args[0]==='merge-base'&&args[1]==='--is-ancestor'&&/^[a-f0-9]{40}$/.test(args[2])&&args[3]==='HEAD')||
    JSON.stringify(args)===JSON.stringify(['show','-s','--format=%B','HEAD']);
  assert(allowed,'Only fixed commit, ancestor, tree and trailer reads are permitted');
  return ['-c','safe.directory=','-c',`safe.directory=${exact}`,...args];
}
export function gitRead(...args) {
  requireRepoCwd();
  return execFileSync('git',scopedReadArgs(REPO_ROOT,args),{cwd:REPO_ROOT,encoding:'utf8'});
}
