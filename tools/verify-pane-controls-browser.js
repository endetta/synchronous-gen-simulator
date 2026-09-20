#!/usr/bin/env node
/**
 * Verifikasi browser: kontrol resize pane (tombol +/−/⤢) benar-benar bekerja.
 * Jalankan: node tools/verify-pane-controls-browser.js
 */
const path = require('path');
const { chromium } = require('playwright');

const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const URL = 'file:///' + HTML.replace(/\\/g, '/').replace(/ /g, '%20');

let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('  PASS: ' + name + (detail ? '  [' + detail + ']' : '')); }
  else { failed++; console.log('  FAIL: ' + name + (detail ? '  [' + detail + ']' : '')); }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof timeCharts !== 'undefined' && Object.keys(timeCharts).length === 4, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);

  console.log('Verifikasi Browser — Kontrol Resize Panel');
  console.log('-'.repeat(60));

  const h = (id) => page.evaluate((i) => document.getElementById(i).offsetHeight, id);

  // 1. Kontrol terlihat tanpa perlu scroll (ini inti keluhan user)
  console.log('\n1. Kontrol selalu terjangkau tanpa scroll');
  const vis = await page.evaluate(() => {
    const out = {};
    for (const id of ['pane1', 'pane2', 'pane3']) {
      const c = document.querySelector(`[data-pane-resize="${id}"]`);
      if (!c) { out[id] = null; continue; }
      const r = c.getBoundingClientRect();
      out[id] = { top: Math.round(r.top), visible: r.top >= 0 && r.bottom <= window.innerHeight };
    }
    return out;
  });
  check('ketiga klaster kontrol ada', vis.pane1 && vis.pane2 && vis.pane3, JSON.stringify(Object.keys(vis)));
  check('kontrol pane3 (pane terbawah) terlihat tanpa scroll',
    vis.pane3 && vis.pane3.visible, vis.pane3 ? 'top=' + vis.pane3.top + 'px' : 'tidak ada');

  // 2. Tombol + memperbesar pane3 — TANPA drag sama sekali
  console.log('\n2. Tombol + memperbesar pane terbawah (tanpa drag)');
  const before = await h('pane3');
  await page.click('[data-pane-resize="pane3"] button:nth-of-type(2)');
  await page.waitForTimeout(400);
  const after1 = await h('pane3');
  check('klik + menambah tinggi pane3', after1 > before, before + 'px → ' + after1 + 'px');

  // 3. Bisa diklik berulang sampai besar
  console.log('\n3. Klik berulang memperbesar terus');
  for (let i = 0; i < 4; i++) { await page.click('[data-pane-resize="pane3"] button:nth-of-type(2)'); await page.waitForTimeout(120); }
  await page.waitForTimeout(400);
  const after2 = await h('pane3');
  check('5 klik total memperbesar signifikan', after2 > before + 150, before + 'px → ' + after2 + 'px');

  // 4. Tombol − memperkecil dan menghormati lantai
  console.log('\n4. Tombol − memperkecil, menghormati lantai MIN_PANE_H');
  for (let i = 0; i < 30; i++) { await page.click('[data-pane-resize="pane3"] button:nth-of-type(1)'); await page.waitForTimeout(30); }
  await page.waitForTimeout(400);
  const minH = await h('pane3');
  const floor = await page.evaluate(() => (typeof MIN_PANE_H !== 'undefined' ? MIN_PANE_H : null));
  check('tidak menyusut di bawah MIN_PANE_H', minH >= floor, minH + 'px (lantai ' + floor + 'px)');

  // 5. Maksimalkan / pulihkan
  console.log('\n5. Tombol ⤢ maksimalkan & pulihkan');
  const preMax = await h('pane3');
  await page.click('[data-pane-resize="pane3"] button:nth-of-type(3)');
  await page.waitForTimeout(500);
  const maxed = await h('pane3');
  check('maksimalkan memperbesar pane', maxed > preMax, preMax + 'px → ' + maxed + 'px');
  await page.click('[data-pane-resize="pane3"] button:nth-of-type(3)');
  await page.waitForTimeout(500);
  const restored = await h('pane3');
  check('pulihkan mengembalikan tinggi semula', Math.abs(restored - preMax) <= 2, maxed + 'px → ' + restored + 'px (semula ' + preMax + 'px)');

  // 6. Chart tetap tajam setelah resize via tombol (tidak regresi ke bug stretching)
  console.log('\n6. Chart tetap tajam (tidak regresi stretching)');
  const sharp = await page.evaluate(() => {
    const dpr = window.devicePixelRatio || 1;
    let worst = 0;
    for (const k of Object.keys(timeCharts)) {
      const c = timeCharts[k];
      const r = c.canvas.getBoundingClientRect();
      const sx = r.width / c.canvas.width, sy = r.height / c.canvas.height;
      worst = Math.max(worst, Math.abs(sx - sy) / Math.max(sx, sy));
    }
    return { worst, dpr };
  });
  check('tanpa distorsi aspek setelah resize tombol', sharp.worst < 0.05, 'distorsi ' + (sharp.worst * 100).toFixed(1) + '%');

  // 7. Label ukuran ter-update
  console.log('\n7. Label ukuran pane');
  const label = await page.evaluate(() => (document.querySelector('[data-pane-size="pane3"]') || {}).textContent);
  check('label ukuran terisi', /\d+px/.test(label || ''), 'label="' + label + '"');

  console.log('\n8. Tanpa error runtime');
  const real = errors.filter(e => !/favicon|cdn|jsdelivr|fonts\.googleapis/i.test(e));
  check('tidak ada error JS', real.length === 0, real.slice(0, 2).join(' | ') || 'bersih');

  await browser.close();
  console.log('\n' + '='.repeat(60));
  console.log('Total: ' + (passed + failed) + ' | PASS: ' + passed + ' | FAIL: ' + failed);
  console.log('='.repeat(60));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
