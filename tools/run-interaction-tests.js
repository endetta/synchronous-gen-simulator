/**
 * Run Interaction Tests via Playwright MCP
 *
 * Script ini menjalankan automated testing menggunakan Playwright MCP tools.
 * Setiap scenario akan dijalankan step-by-step dengan screenshot capture.
 *
 * Usage via Claude Code:
 *   node tools/run-interaction-tests.js
 *
 * Output:
 *   - tools/test-results/report-YYYY-MM-DD.json
 *   - tools/test-results/screenshots/*.png
 */

const fs = require('fs');
const path = require('path');

// ================================================================
// TEST CONFIGURATION
// ================================================================
const HTML_FILE = path.resolve(__dirname, '../LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const OUTPUT_DIR = path.resolve(__dirname, 'test-results');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// ================================================================
// TEST SCENARIOS
// ================================================================
const SCENARIOS = [
  {
    name: '01-load-response-toggle',
    description: 'Test Load Response button toggle',
    steps: [
      { action: 'snapshot', name: 'initial-state' },
      { action: 'click', target: 'hbtn-rlr' },
      { action: 'wait', time: 2 },
      { action: 'snapshot', name: 'after-rlr-click' },
      { action: 'click', target: 'hbtn-rlr' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'after-rlr-toggle-off' },
    ],
  },
  {
    name: '02-animation-mode-fasor',
    description: 'Test Fasor animation mode',
    steps: [
      { action: 'click', target: 'amode-phasor' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'fasor-mode' },
    ],
  },
  {
    name: '03-animation-mode-realistis',
    description: 'Test Realistis animation mode',
    steps: [
      { action: 'click', target: 'amode-realistic' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'realistis-mode' },
    ],
  },
  {
    name: '04-parameter-h-change',
    description: 'Test H (Inertia) parameter change via slider',
    steps: [
      { action: 'evaluate', code: '() => { document.getElementById("sH").value = "5.5"; document.getElementById("sH").dispatchEvent(new Event("input", {bubbles:true})); }' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'h-changed-to-5-5' },
    ],
  },
  {
    name: '05-parameter-pm-change',
    description: 'Test Pm (Mechanical Power) parameter change via input',
    steps: [
      { action: 'fill', target: 'nPm', value: '1.200' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'pm-changed-to-1-2' },
    ],
  },
  {
    name: '06-mode-island',
    description: 'Test Island mode switching',
    steps: [
      { action: 'click', target: 'bIsland' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'island-mode' },
    ],
  },
  {
    name: '07-mode-grid',
    description: 'Test Grid mode switching',
    steps: [
      { action: 'click', target: 'bGrid' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'grid-mode' },
    ],
  },
  {
    name: '08-rlr-simulation',
    description: 'Test full RLR simulation start/stop',
    steps: [
      { action: 'click', target: 'btn-rlr-s' },
      { action: 'wait', time: 3 },
      { action: 'snapshot', name: 'rlr-running' },
      { action: 'click', target: 'btn-rlr-x' },
      { action: 'wait', time: 1 },
      { action: 'snapshot', name: 'rlr-stopped' },
    ],
  },
  {
    name: '09-pane-toggle',
    description: 'Test pane visibility toggle',
    steps: [
      { action: 'click', target: 'pt1' },
      { action: 'wait', time: 0.5 },
      { action: 'snapshot', name: 'pane1-hidden' },
      { action: 'click', target: 'pt1' },
      { action: 'wait', time: 0.5 },
      { action: 'snapshot', name: 'pane1-visible' },
    ],
  },
  {
    name: '10-multiple-params',
    description: 'Test multiple parameter changes simultaneously',
    steps: [
      {
        action: 'evaluate',
        code: '() => {' +
          'const set = (id,v) => { document.getElementById(id).value=v; document.getElementById(id).dispatchEvent(new Event("input",{bubbles:true})); };' +
          'set("sH","6.0"); set("sD","3.0"); set("sXs","0.8"); set("sPm","0.9"); set("sEf","1.8");' +
          '}'
      },
      { action: 'wait', time: 2 },
      { action: 'snapshot', name: 'all-params-changed' },
    ],
  },
];

// ================================================================
// PLAYWRIGHT MCP INSTRUCTIONS
// ================================================================
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  INTERACTION TEST RUNNER — Playwright MCP                        ║
╚══════════════════════════════════════════════════════════════════╝

HTML File: ${HTML_FILE}
Output Dir: ${OUTPUT_DIR}
Screenshots: ${SCREENSHOT_DIR}

Total Scenarios: ${SCENARIOS.length}

INSTRUCTIONS FOR CLAUDE CODE:
=============================

1. NAVIGATE to the HTML file:
   mcp_plugin_playwright_playwright_browser_navigate({ url: "file:///${HTML_FILE.replace(/\\/g, '/')}" })

2. For each scenario, execute the steps using Playwright MCP tools:
   - snapshot → mcp_plugin_playwright_playwright_browser_snapshot()
   - click → mcp_plugin_playwright_playwright_browser_click({ target: "<element-id>" })
   - fill → mcp_plugin_playwright_playwright_browser_type({ target: "<id>", text: "<value>" })
   - wait → mcp_plugin_playwright_playwright_browser_wait_for({ time: <seconds> })
   - evaluate → mcp_plugin_playwright_playwright_browser_evaluate({ function: "<code>" })

3. Take screenshots after each step:
   mcp_plugin_playwright_playwright_browser_take_screenshot({
     filename: "screenshots/<scenario>-<step>.png",
     scale: "css"
   })

4. Check console for errors:
   mcp_plugin_playwright_playwright_browser_console_messages({ level: "error" })

SCENARIOS TO RUN:
=================
${SCENARIOS.map((s, i) => `${(i + 1).toString().padStart(2)}. ${s.name}`).join('\n')}

TO EXECUTE:
===========
Ask Claude Code to run the tests using Playwright MCP tools.
Example prompt: "Run the interaction tests using Playwright MCP"
`);
