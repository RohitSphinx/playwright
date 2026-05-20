import fs from 'fs';
import path from 'path';

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

class CustomJsonReporter implements Reporter {

  private results: any[] = [];

  private startTime = new Date();

  onBegin(config: FullConfig, suite: Suite) {

    console.log('Test execution started');
  }

  onTestEnd(test: TestCase, result: TestResult) {

    this.results.push({

      title: test.title,

      file: test.location.file,

      project:
        test.parent.project()?.name || 'unknown',

      status: result.status,

      duration: result.duration,

      errors: result.errors,

      annotations: test.annotations,

      startedAt:
        this.startTime.toISOString(),

      completedAt:
        new Date().toISOString(),
    });
  }

  onEnd(result: FullResult) {

    const report = {

      metadata: {

        projectName:
          process.env.PROJECT_NAME ||
          'HMEL Plus Security Automation',

        environment:
          process.env.TEST_ENV || 'UAT',

        baseURL:
          process.env.BASE_URL,

        executedAt:
          new Date().toISOString(),

        browser:
          process.env.BROWSER || 'chromium',

        overallStatus:
          result.status,
      },

      summary: {

        total:
          this.results.length,

        passed:
          this.results.filter(r =>
            r.status === 'passed'
          ).length,

        failed:
          this.results.filter(r =>
            r.status === 'failed'
          ).length,

        skipped:
          this.results.filter(r =>
            r.status === 'skipped'
          ).length,
      },

      results: this.results,
    };

    const outputDir = path.join(
      process.cwd(),
      'test-results'
    );

    if (!fs.existsSync(outputDir)) {

      fs.mkdirSync(
        outputDir,
        { recursive: true }
      );
    }

    fs.writeFileSync(

      path.join(
        outputDir,
        'custom-results.json'
      ),

      JSON.stringify(
        report,
        null,
        2
      )
    );

    console.log(
      'Custom JSON report generated'
    );
  }
}

export default CustomJsonReporter;