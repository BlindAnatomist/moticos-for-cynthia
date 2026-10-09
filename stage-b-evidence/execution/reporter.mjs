import ProgressReporter from '../../gate/progress-base.mjs';
import {identity} from './binding.mjs';
import {executionPaths,requireRepoCwd} from './paths.mjs';
export default class Reporter extends ProgressReporter{constructor(){super({directory:executionPaths(process.env.MOTICOS_240_PROFILE).progress});requireRepoCwd();this.binding=identity();}record(event){super.record({...this.binding,...event});}onBegin(config,suite){const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});}onError(error){this.record({event:'error',message:error.message??String(error)});}}
