{
  "name": "synchronous-gen-simulator-tests",
  "version": "1.0.0",
  "description": "Interaction tests for Synchronous Generator Simulator",
  "private": true,
  "scripts": {
    "test": "node tools/puppeteer-test-runner.js",
    "test:console": "echo 'Copy tools/console-test-runner.js content to browser console'",
    "test:model": "node tools/model.test.js",
    "test:ui": "node tools/ui.test.js",
    "test:all": "node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js && node tools/puppeteer-test-runner.js"
  },
  "devDependencies": {
    "puppeteer": "^23.0.0"
  }
}
