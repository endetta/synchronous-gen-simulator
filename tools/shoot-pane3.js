#!/usr/bin/env node
/**
 * Ambil screenshot Panel III pada beberapa tinggi pane untuk verifikasi visual.
 * Output: tools/shots/pane3-<label>.png
 */
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
  // Biarkan simulasi berjalan agar kurva terisi.
  await page.waitForTimeout(4000);

  const pane = await page.$('#pane3');

  for (const [label, height] of [['default-300', 300], ['tall-620', 620], ['short-276', 276]]) {
    await page.evaluate((h) => {
      const p = document.getElementById('pane3');
      p.style.height = h + 'px';
      scheduleTimeChartResize();
    }, height);
    await page.waitForTimeout(800);
    const file = path.join(OUT, 'pane3-' + label + '.png');
    await pane.screenshot({ path: file });
    const kb = (fs.statSync(file).size / 1024).toFixed(1);
    console.log('  ' + label.padEnd(14) + ' -> ' + file + '  (' + kb + ' KB)');
  }

  // Screenshot seluruh area viz untuk konteks.
  await page.evaluate(() => { document.getElementById('pane3').style.height = '620px'; scheduleTimeChartResize(); });
  await page.waitForTimeout(700);
  const full = path.join(OUT, 'viz-full.png');
  await (await page.$('#vizArea')).screenshot({ path: full });
  console.log('  viz-full       -> ' + full + '  (' + (fs.statSync(full).size / 1024).toFixed(1) + ' KB)');

  await browser.close();
  console.log('\nScreenshot selesai.');
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
