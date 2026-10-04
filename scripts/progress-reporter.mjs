import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// Flush each terminal test result immediately so a job timeout cannot erase
// completed/failed/interrupted distinctions before the final HTML report exists.
export default class ProgressReporter {
  constructor(options = {}) {
    this.directory = options.directory ?? 'test-results/progress';
    this.file = join(this.directory, 'browser-events.jsonl');
  }
  record(event) {
    mkdirSync(this.directory, { recursive: true });
    appendFileSync(this.file, `${JSON.stringify({ recordedAt: new Date().toISOString(), ...event })}\n`);
  }
  identify(test) {
    return { id: test.id, project: test.parent.project()?.name, title: test.titlePath(), file: test.location.file, line: test.location.line };
  }
  onBegin(config, suite) {
    this.record({ event: 'begin', tests: suite.allTests().length, workers: config.workers });
  }
  onTestBegin(test, result) {
    this.record({ event: 'test-begin', ...this.identify(test), retry: result.retry, startedAt: result.startTime.toISOString() });
  }
  onTestEnd(test, result) {
    this.record({ event: 'test-end', ...this.identify(test), status: result.status, expectedStatus: test.expectedStatus,
      retry: result.retry, durationMs: result.duration, errors: result.errors.map(error => error.message ?? error.value ?? String(error)) });
  }
  onEnd(result) {
    this.record({ event: 'end', status: result.status, durationMs: result.duration });
  }
}
