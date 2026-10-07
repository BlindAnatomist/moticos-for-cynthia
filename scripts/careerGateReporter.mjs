import ProgressReporter from './progress-reporter.mjs';
export default class CareerGateReporter extends ProgressReporter{
 constructor(){super({directory:`career-results/${process.env.MOTICOS_CAREER_PROFILE}/progress`});}
 onBegin(config,suite){const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});}
 onError(error){this.record({event:'error',message:error.message??error.value??String(error)});}
}
