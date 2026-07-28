// .mocharc.js
export default {
  // Where to look for test files
  spec: 'src/tests/unit-tests/**/*.test.js',

  // Test interface; "bdd" = describe/it style
  ui: 'bdd',

  // Scan subdirectories (if you have nested test folders)
  recursive: true,

  // How long to wait before considering a test as timed out (ms)
  timeout: 5000,
};
