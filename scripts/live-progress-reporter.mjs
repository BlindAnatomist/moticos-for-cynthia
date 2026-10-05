import ProgressReporter from './progress-reporter.mjs';
export default class LiveProgressReporter extends ProgressReporter {
  constructor() { super({ directory: 'batch-test-results/progress' }); }
  onBegin(config, suite) {
    const tests = suite.allTests();
    this.record({ event: 'begin', tests: tests.length, workers: config.workers, maxFailures: config.maxFailures,
      retries: [...new Set(tests.map(test => test.retries))], projects: [...new Set(tests.map(test => test.parent.project()?.name))] });
  }
  onError(error) { this.record({ event: 'error', message: error.message ?? error.value ?? String(error) }); }
}
