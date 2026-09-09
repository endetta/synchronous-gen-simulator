/**
 * Puppeteer Automated Test Runner
 *
 * Script ini menjalankan automated interaction testing dengan Puppeteer.
 * Screenshot otomatis disimpan di tools/test-results/screenshots/
 *
 * Usage:
 *   npm install puppeteer
 *   node tools/puppeteer-test-runner.js
 *
 * Output:
 *   - tools/test-results/report.json
 *   - tools/test-results/screenshots/*.png
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ================================================================
// CONFIGURATION
// ================================================================
const HTML_FILE = path.resolve(__dirname, '../LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const OUTPUT_DIR = path.resolve(__dirname, 'test-results');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.json');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ================================================================
// TEST SCENARIOS
// ================================================================
const SCENARIOS = [
  {
    name: '01-load-response-toggle',
    description: 'Test Load Response button toggle',
    steps: [
      { action: 'screenshot', name: 'initial-state' },
      { action: 'click', selector: '#hbtn-rlr' },
      { action: 'wait', time: 1000 },
      { action: 'screenshot', name: 'rlr-clicked' },
      { action: 'click', selector: '#hbtn-rlr' },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'rlr-toggle-off' },
    ],
  },
  {
    name: '02-animation-mode-fasor',
    description: 'Test Fasor animation mode',
    steps: [
      { action: 'click', selector: '#amode-phasor' },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'fasor-mode' },
    ],
  },
  {
    name: '03-animation-mode-realistis',
    description: 'Test Realistis animation mode',
    steps: [
      { action: 'click', selector: '#amode-realistic' },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'realistis-mode' },
    ],
  },
  {
    name: '04-parameter-h-slider',
    description: 'Test H (Inertia) slider change',
    steps: [
      {
        action: 'evaluate',
        code: '() => { document.getElementById("sH").value = "5.5"; document.getElementById("sH").dispatchEvent(new Event("input", {bubbles:true})); }',
      },
      { action: 'wait', time: 300 },
      { action: 'screenshot', name: 'h-changed-5-5' },
    ],
  },
  {
    name: '05-parameter-pm-input',
    description: 'Test Pm (Mechanical Power) input change',
    steps: [
      { action: 'type', selector: '#nPm', value: '1.200' },
      { action: 'wait', time: 300 },
      { action: 'screenshot', name: 'pm-changed-1-2' },
    ],
  },
  {
    name: '06-mode-island',
    description: 'Test Island mode switching',
    steps: [
      { action: 'click', selector: '#bIsland' },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'island-mode' },
    ],
  },
  {
    name: '07-mode-grid',
    description: 'Test Grid mode switching',
    steps: [
      { action: 'click', selector: '#bGrid' },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'grid-mode' },
    ],
  },
  {
    name: '08-rlr-simulation',
    description: 'Test full RLR simulation start/stop',
    steps: [
      { action: 'click', selector: '#btn-rlr-s' },
      { action: 'wait', time: 2000 },
      { action: 'screenshot', name: 'rlr-running' },
      { action: 'click', selector: '#btn-rlr-x' },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'rlr-stopped' },
    ],
  },
  {
    name: '09-pane-toggle',
    description: 'Test pane visibility toggle',
    steps: [
      { action: 'click', selector: '#pt1' },
      { action: 'wait', time: 300 },
      { action: 'screenshot', name: 'pane1-hidden' },
      { action: 'click', selector: '#pt1' },
      { action: 'wait', time: 300 },
      { action: 'screenshot', name: 'pane1-visible' },
    ],
  },
  {
    name: '10-multiple-params',
    description: 'Test multiple parameter changes',
    steps: [
      {
        action: 'evaluate',
        code: '() => {' +
          'const set = (id,v) => { document.getElementById(id).value=v; document.getElementById(id).dispatchEvent(new Event("input",{bubbles:true})); };' +
          'set("sH","7.0"); set("sD","5.0"); set("sXs","0.9"); set("sPm","0.85"); set("sEf","1.6");' +
          '}',
      },
      { action: 'wait', time: 500 },
      { action: 'screenshot', name: 'all-params-changed' },
    ],
  },
];

// ================================================================
// TEST RUNNER
// ================================================================
async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  PUPPETEER AUTOMATED TEST RUNNER                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\nHTML File: ${HTML_FILE}`);
  console.log(`Output Dir: ${OUTPUT_DIR}`);
  console.log(`Total Scenarios: ${SCENARIOS.length}\n`);

  const report = {
    timestamp: new Date().toISOString(),
    totalScenarios: SCENARIOS.length,
    passed: 0,
    failed: 0,
    scenarios: [],
    consoleErrors: [],
  };

  let browser;
  let page;

  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        report.consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Navigate to HTML file
    console.log('Navigating to simulator...\n');
    await page.goto(`file:///${HTML_FILE.replace(/\\/g, '/')}`, { waitUntil: 'networkidle2' });

    // Run each scenario
    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Scenario ${i + 1}/${SCENARIOS.length}: ${scenario.name}`);
      console.log(`${scenario.description}`);
      console.log('='.repeat(70));

      const scenarioResult = {
        name: scenario.name,
        description: scenario.description,
        passed: true,
        steps: [],
        screenshots: [],
        errors: [],
      };

      try {
        for (let j = 0; j < scenario.steps.length; j++) {
          const step = scenario.steps[j];
          console.log(`  Step ${j + 1}: ${step.action} ${step.name || step.selector || ''}`);

          try {
            switch (step.action) {
              case 'click':
                await page.click(step.selector);
                break;

              case 'type':
                await page.click(step.selector, { clickCount: 3 }); // Select all
                await page.type(step.selector, step.value);
                await page.keyboard.press('Enter');
                break;

              case 'wait':
                await new Promise(resolve => setTimeout(resolve, step.time));
                break;

              case 'screenshot':
                const filename = `${scenario.name}-${step.name}.png`;
                const filepath = path.join(SCREENSHOT_DIR, filename);
                await page.screenshot({ path: filepath, fullPage: false });
                scenarioResult.screenshots.push(filename);
                break;

              case 'evaluate':
                await page.evaluate(step.code);
                break;

              default:
                console.log(`    Unknown action: ${step.action}`);
            }
            scenarioResult.steps.push({ step: j + 1, action: step.action, status: 'passed' });
          } catch (stepError) {
            scenarioResult.steps.push({ step: j + 1, action: step.action, status: 'failed', error: stepError.message });
            scenarioResult.errors.push(stepError.message);
            console.log(`    ✗ Error: ${stepError.message}`);
          }
        }

        if (scenarioResult.errors.length === 0) {
          report.passed++;
          console.log(`\n  ✓ PASSED`);
        } else {
          report.failed++;
          scenarioResult.passed = false;
          console.log(`\n  ✗ FAILED (${scenarioResult.errors.length} errors)`);
        }
      } catch (error) {
        report.failed++;
        scenarioResult.passed = false;
        scenarioResult.errors.push(error.message);
        console.log(`\n  ✗ FAILED: ${error.message}`);
      }

      report.scenarios.push(scenarioResult);
    }

    // Close browser
    await browser.close();

  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    report.fatalError = error.message;
    if (browser) await browser.close();
  }

  // ================================================================
  // SUMMARY
  // ================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Scenarios: ${report.totalScenarios}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Success Rate: ${((report.passed / report.totalScenarios) * 100).toFixed(1)}%`);
  console.log(`Console Errors: ${report.consoleErrors.length}`);
  console.log('='.repeat(70));

  // Save report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${REPORT_FILE}`);
  console.log(`Screenshots saved: ${SCREENSHOT_DIR}`);

  return report;
}

// ================================================================
// MAIN
// ================================================================
if (require.main === module) {
  runTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runTests, SCENARIOS };
