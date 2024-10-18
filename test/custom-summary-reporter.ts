import { MochaOptions, Runner, Test } from 'mocha';
const { EVENT_RUN_END, EVENT_TEST_PASS, EVENT_TEST_FAIL } = Runner.constants;

class CustomSummaryReporter {
  private passes: { title: string; duration: number }[] = [];
  private failures: { title: string; error: string; duration: number }[] = [];

  constructor(runner: Runner, options?: MochaOptions) {
    // Listen for passed tests
    runner.on(EVENT_TEST_PASS, (test: Test) => {
      this.passes.push({
        title: test.title,
        duration: test.duration || 0
      });
    });

    // Listen for failed tests
    runner.on(EVENT_TEST_FAIL, (test: Test, err: Error) => {
      this.failures.push({
        title: test.title,
        error: err.message,
        duration: test.duration || 0
      });
    });

    // When all tests have finished running
    runner.once(EVENT_RUN_END, () => {
      this.printSummary();
    });
  }

  // Print the summary of passed and failed tests
  private printSummary(): void {
    console.log('\nTest Summary:\n');

    // Print passed tests
    console.log('Passing Tests:\n');
    this.passes.forEach((test) => {
      console.log(`    ✔ ${test.title} (${test.duration}ms)`);
    });

    // Print failed tests
    if (this.failures.length > 0) {
      console.log('\nFailing Tests:\n');
      this.failures.forEach((test) => {
        console.log(`    ✘ ${test.title} (${test.duration}ms)`);
        console.log(`      Error: ${test.error}\n`);
      });
    }
  }
}

export = CustomSummaryReporter;
