import { defaultReporter } from '@web/test-runner';
import { junitReporter } from '@web/test-runner-junit-reporter';

export default {
  files: ['src/tests/unit-tests/**/*.test.js'],
  nodeResolve: true,
  // Mirror webpack.config.js resolve.alias for the paths tests reach.
  alias: {
    components: '/src/app/components',
    traits: '/src/app/traits',
    utils: '/src/app/utils',
    channels: '/src/app/channels',
  },

  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 2000,
    },
  },
  reporters: [
    defaultReporter({
      // Turn on test result reporting in the console
      reportTestResults: true,
      reportTestProgress: true,
    }),
    junitReporter({
      outputPath: './src/tests/results/unit-test-results.xml',
      reportLogs: true,
    }),
  ],

  // Any other options...
};
