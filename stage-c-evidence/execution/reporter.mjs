import ProgressReporter from '../../gate/progress-base.mjs';
import {identity} from './binding.mjs';
import {cleanupPassedTraces} from './passed-traces.mjs';
import {executionPaths,requireRepoCwd} from './paths.mjs';
export default class Reporter extends ProgressReporter {
  constructor(){super({directory:executionPaths(process.env.MOTICOS_280_PROFILE).progress});requireRepoCwd();this.binding=identity();}
  record(event){super.record({...this.binding,...event});}
  onBegin(config,suite){const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});}
  onTestEnd(test,result){
    super.onTestEnd(test,result);
    if(result.status!=='passed'||test.expectedStatus!=='passed'||result.retry!==0||result.errors.length)return;
    const profile=test.parent.project()?.name;
    try{const cleanup=cleanupPassedTraces({rawRoot:executionPaths(profile).raw,testId:test.id,title:test.title,profile,status:result.status,expectedStatus:test.expectedStatus,retry:result.retry,errors:result.errors});this.record({event:'passed-trace-cleanup',id:test.id,project:profile,...cleanup});}
    catch(error){this.record({event:'error',phase:'passed-trace-cleanup',id:test.id,project:profile,message:String(error.message),cleanup:error.cleanup??null});}
  }
  onError(error){this.record({event:'error',message:error.message??String(error)});}
}
