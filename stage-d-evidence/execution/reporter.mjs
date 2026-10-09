import ProgressReporter from '../../gate/progress-base.mjs';
import {identity} from './binding.mjs';
import {StepJournal} from './step-journal.mjs';
import {executionPaths,requireRepoCwd} from './paths.mjs';
import {join} from 'node:path';
export default class Reporter extends ProgressReporter {
  constructor(){super({directory:executionPaths(process.env.MOTICOS_320_PROFILE).progress});requireRepoCwd();this.binding=identity();this.profile=process.env.MOTICOS_320_PROFILE;}
  record(event){try{super.record({...this.binding,...event});}catch(error){this.diagnosticError??=error;}}
  journalError(error){if(this.diagnosticError)return;this.diagnosticError=error;this.record({event:'error',phase:'step-journal',message:String(error?.message??error).slice(0,8192)});}
  journalCall(method,...args){try{if(!this.journal)throw Error('Step journal was not initialized');const result=this.journal[method](...args);if(this.journal.error)throw this.journal.error;return result;}catch(error){this.journalError(error);return null;}}
  onBegin(config,suite){
    const tests=suite.allTests();this.record({event:'begin',tests:tests.length,workers:config.workers,maxFailures:config.maxFailures,retries:[...new Set(tests.map(t=>t.retries))],projects:[...new Set(tests.map(t=>t.parent.project()?.name))]});
    try{this.journal=new StepJournal({file:join(this.directory,'action-assertion-journal.jsonl'),profile:this.profile,binding:this.binding,tests:tests.map(({id,title})=>({id,title}))});if(this.journal.error)throw this.journal.error;}catch(error){this.journalError(error);}
  }
  onTestBegin(test,result){super.onTestBegin(test,result);this.journalCall('testBegin',test,result);}
  onStepBegin(test,result,step){this.journalCall('stepBegin',test,result,step);}
  onStepEnd(test,result,step){this.journalCall('stepEnd',test,result,step);}
  onTestEnd(test,result){super.onTestEnd(test,result);this.journalCall('testEnd',test,result);}
  onEnd(result){
    const journal=this.journalCall('finish',result);if(journal)this.record({event:'step-journal',journal});
    const final=this.diagnosticError?{...result,status:'failed'}:result;super.onEnd(final);
    // Playwright swallows reporter callback exceptions. Explicitly override the
    // result and require the validated terminal journal in artifact acceptance.
    if(this.diagnosticError)return{status:'failed'};
  }
  onError(error){this.record({event:'error',message:error.message??String(error)});}
}
