import ProgressReporter from '../../gate/progress-base.mjs';
import {identity} from './binding.mjs';
import {ROOT} from './policy.mjs';
export default class Reporter extends ProgressReporter{constructor(){super({directory:`${ROOT}/${process.env.MOTICOS_240_PROFILE}/progress`});this.binding=identity();}record(event){super.record({...this.binding,...event});}onBegin(config,suite){const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});}onError(error){this.record({event:'error',message:error.message??String(error)});}}
