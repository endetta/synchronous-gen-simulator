#!/usr/bin/env node
/** Screenshot kontrol resize pane — bukti visual. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const URL = 'file:///' + HTML.replace(/\\/g, '/').replace(/ /g, '%20');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof timeCharts !== 'undefined' && Object.keys(timeCharts).length === 4, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const shot = async (name, el) => {
    const f = path.join(OUT, name + '.png');
    if (el) await (await page.$(el)).screenshot({ path: f });
    else await page.screenshot({ path: f });
    console.log('  ' + name.padEnd(26) + (fs.statSync(f).size / 1024).toFixed(1) + ' KB');
  };

  await shot('resize-default', '#pane3');

  // Perbesar pane3 lewat tombol + (5x)
  for (let i = 0; i < 5; i++) { await page.click('[data-pane-resize="pane3"] button:nth-of-type(2)'); await page.waitForTimeout(100); }
  await page.waitForTimeout(800);
  await shot('resize-enlarged', '#pane3');

  // Maksimalkan
  await page.click('[data-pane-resize="pane3"] button:nth-of-type(3)');
  await page.waitForTimeout(900);
  await shot('resize-maximized', '#vizArea');

  await browser.close();
  console.log('\nScreenshot selesai → tools/shots/');
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
