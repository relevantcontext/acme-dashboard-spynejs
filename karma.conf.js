// karma.conf.js

//const webpackConfigFn = require('./webpack.config.js');
import webpackConfigFn from './webpack.config.js';
const webpackConfig = webpackConfigFn();
webpackConfig.entry = undefined;
webpackConfig.output = undefined;
webpackConfig.stats = 'normal';
webpackConfig.watch = true;

export default function (config) {
  config.set({
    // base path that will be used to resolve all patterns
    basePath: '',

    frameworks: ['webpack', 'mocha'],

    files: [
      { pattern: './node_modules/ramda/dist/ramda.min.js', watched: false },
      {
        pattern: './node_modules/rxjs/**/*.js',
        included: false,
        watched: false,
      },
      {
        pattern: './src/tests/unit-tests/**/*.test.js',
        watched: true,
      },
    ],

    exclude: [],

    preprocessors: {
      './src/tests/unit-tests/**/*.test.js': ['webpack'],
    },

    webpack: webpackConfig,
    webpackMiddleware: {
      noInfo: true,
    },

    reporters: ['progress'],

    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: true,
    concurrency: Infinity,
  });
}
