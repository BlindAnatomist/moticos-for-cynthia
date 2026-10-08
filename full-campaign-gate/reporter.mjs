import fs from 'node:fs';import {digest} from './evidence.mjs';import ProgressReporter from '../gate/progress-base.mjs';
export default class FullReporter extends ProgressReporter{
 constructor(){super({directory:`full-browser-results/${process.env.MOTICOS_FULL_PROFILE}/progress`});const b=fs.readFileSync('full-campaign-build.json');this.binding={sourceFingerprint:JSON.parse(b).sourceFingerprint,buildFingerprint:digest(b)};}
 record(event){super.record({...this.binding,...event});}
 onBegin(config,suite){const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});}
 onError(error){this.record({event:'error',message:error.message??String(error)});}
}
