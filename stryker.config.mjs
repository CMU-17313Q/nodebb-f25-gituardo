// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "mocha",
  testRunner_comment:
    "Take a look at https://stryker-mutator.io/docs/stryker-js/mocha-runner for information about the mocha plugin.",
  coverageAnalysis: "perTest",
  mutate: [
    "src/**/*.js",
    "!src/cli/index.js", 
    "!**/*.test.js",
    "!**/*.spec.js", 
    "!**/node_modules/**",
    "!**/test/**"
  ],
  mochaOptions: {
    spec: ["test/**/*.js"] 
  }
};
export default config;