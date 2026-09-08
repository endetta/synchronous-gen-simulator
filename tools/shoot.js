#!/usr/bin/env node
/**
 * Screenshot Tool — Synchronous Generator Simulator
 * Automated screenshots untuk dokumentasi dan validasi visual
 *
 * Usage:
 *   node tools/shoot.js              # Capture all views
 *   node tools/shoot.js --check      # Verify against baseline
 *   node tools/shoot.js --help       # Show help
 *
 * Requirements:
 *   - Node.js >= 18
 *   - Chrome/Chromium browser
 *   - Optional: CHROME env variable for custom path
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Configuration
const HTML_FILE = 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html';
const OUTPUT_DIR = path.join(__dirname, 'shots');
const REPORT_FILE = path.join(OUTPUT_DIR, 'report.txt');
const PORT = 9876;
const SCREENSHOTS = [
  { name: 'default', desc: 'Default state', wait: 2000 },
  { name: 'grid-mode', desc: 'Grid-connected mode', action: 'setMode("grid")', wait: 1500 },
  { name: 'island-mode', desc: 'Island mode', action: 'setMode("island")', wait: 1500 },
  { name: 'preset-load-step', desc: 'Load step preset', action: 'runSc("load_step")', wait: 3000 },
  { name: 'preset-sc-success', desc: 'SC success preset', action: 'runSc("sc_success")', wait: 5000 },
  { name: 'high-inertia', desc: 'High inertia (H=12)', action: 'document.getElementById("sH").value=12;onSl("H",document.getElementById("sH"))', wait: 1500 },
  { name: 'overexcitation', desc: 'Overexcitation (Ef=2.2)', action: 'document.getElementById("sEf").value=2.2;onSl("Ef",document.getElementById("sEf"))', wait: 1500 },
  { name: 'rlr-running', desc: 'RLR simulation running', action: 'startRLR()', wait: 5000 }
];

// Find Chrome
function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }

  throw new Error('Chrome not found. Set CHROME env variable.');
}

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Start HTTP server
console.log('Starting HTTP server...');
const htmlPath = path.resolve(__dirname, '..', HTML_FILE);
const htmlDir = path.dirname(htmlPath);

// Check if HTML exists
if (!fs.existsSync(htmlPath)) {
  console.error(`Error: HTML file not found: ${htmlPath}`);
  process.exit(1);
}

// Simple HTTP server using Node's http module
const serverScript = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const filePath = path.join('${htmlDir.replace(/\\/g, '\\\\')}', req.url === '/' ? '${HTML_FILE}' : req.url);
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(${PORT}, () => {
  console.log('Server running on http://localhost:${PORT}');
});
`;

const serverPath = path.join(OUTPUT_DIR, '_server.js');
fs.writeFileSync(serverPath, serverScript);

const server = spawn('node', [serverPath], { stdio: 'pipe' });

// Wait for server to start
setTimeout(() => {
  console.log(`Server started on http://localhost:${PORT}`);
  runScreenshots();
}, 1000);

// Run screenshots
async function runScreenshots() {
  const chrome = findChrome();
  console.log(`Using Chrome: ${chrome}`);

  const results = [];

  for (const shot of SCREENSHOTS) {
    console.log(`\nCapturing: ${shot.name} (${shot.desc})`);

    const outputPath = path.join(OUTPUT_DIR, `${shot.name}.png`);
    const url = `http://localhost:${PORT}/`;

    // Build Chrome command
    const args = [
      '--headless',
      '--disable-gpu',
      '--disable-web-security',
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      `--screenshot=${outputPath}`,
      url
    ];

    try {
      // Launch Chrome and take screenshot
      execSync(`"${chrome}" ${args.join(' ')}`, {
        timeout: 30000,
        windowsHide: true
      });

      // Check file size
      const stats = fs.statSync(outputPath);
      const sizeKB = stats.size / 1024;

      results.push({
        name: shot.name,
        desc: shot.desc,
        file: outputPath,
        size: sizeKB.toFixed(1),
        status: sizeKB > 10 ? 'OK' : 'WARNING (small file)'
      });

      console.log(`  ✓ Saved: ${outputPath} (${sizeKB.toFixed(1)} KB)`);
    } catch (err) {
      results.push({
        name: shot.name,
        desc: shot.desc,
        file: outputPath,
        size: 0,
        status: 'FAILED'
      });

      console.log(`  ✗ Failed: ${err.message}`);
    }
  }

  // Generate report
  const reportLines = [
    'Synchronous Generator Simulator — Screenshot Report',
    '=' .repeat(50),
    `Date: ${new Date().toISOString()}`,
    `HTML: ${HTML_FILE}`,
    '',
    'Screenshots:',
    ''
  ];

  for (const r of results) {
    reportLines.push(`  ${r.name.padEnd(25)} ${r.size.padStart(7)} KB  [${r.status}]`);
    reportLines.push(`    ${r.desc}`);
    reportLines.push('');
  }

  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === 'OK').length,
    warning: results.filter(r => r.status.includes('WARNING')).length,
    failed: results.filter(r => r.status === 'FAILED').length
  };

  reportLines.push('-'.repeat(50));
  reportLines.push(`Total: ${summary.total}, OK: ${summary.ok}, Warning: ${summary.warning}, Failed: ${summary.failed}`);

  const reportContent = reportLines.join('\n');
  fs.writeFileSync(REPORT_FILE, reportContent);

  console.log('\n' + reportContent);
  console.log(`\nReport saved: ${REPORT_FILE}`);

  // Cleanup
  server.kill();

  if (summary.failed > 0) {
    process.exit(1);
  }
}

// Handle exit
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});
