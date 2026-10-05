import ProgressReporter from './progress-reporter.mjs';

// Reuse the proven append-only reporter; the batch adds policy and fatal-error
// records and keeps its output inside the profile's complete evidence tree.
export default class BatchProgressReporter extends ProgressReporter {
  constructor() { super({ directory: 'batch-test-results/progress' }); }
  onBegin(config, suite) {
    const tests = suite.allTests();
    this.record({ event: 'begin', tests: tests.length, workers: config.workers,
      maxFailures: config.maxFailures, retries: [...new Set(tests.map(test => test.retries))],
      projects: [...new Set(tests.map(test => test.parent.project()?.name))] });
  }
  onError(error) { this.record({ event: 'error', message: error.message ?? error.value ?? String(error) }); }
}
