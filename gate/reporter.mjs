import ProgressReporter from './progress-base.mjs';
export default class CampaignReporter extends ProgressReporter{
 constructor(){super({directory:`campaign-results/${process.env.MOTICOS_CAMPAIGN_PROFILE}/progress`});}
 onBegin(config,suite){const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});}
 onError(error){this.record({event:'error',message:error.message??String(error)});}
}
