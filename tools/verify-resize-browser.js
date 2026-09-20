#!/usr/bin/env node
/**
 * Verifikasi browser untuk perbaikan responsif Panel III (time series).
 *
 * Membuktikan di browser sungguhan bahwa:
 *  1. Sebelum drag  : backing store canvas cocok dengan kotak CSS × devicePixelRatio
 *  2. Setelah drag  : backing store DIPERBARUI (tidak lagi bitmap lama yang di-upscale)
 *  3. Distorsi aspek: |scaleX/scaleY| mendekati 1 (teks tidak lagi melar)
 *  4. Legenda seri  : keempat chart punya overlay legenda
 *  5. Lantai tinggi : pane tidak bisa ditarik di bawah lantai konten
 *
 * Jalankan: node tools/verify-resize-browser.js
 * Butuh Chrome/Chromium (Playwright).
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
  // Tunggu chart siap (initTimeCharts dipanggil pada 'load' + nested RAF).
  // PENTING: timeCharts dideklarasikan dengan `const` di top-level script, jadi
  // ia TIDAK menjadi properti window — harus diakses sebagai identifier telanjang.
  await page.waitForFunction(
    () => typeof timeCharts !== 'undefined' && Object.keys(timeCharts).length === 4,
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(1200);

  console.log('Verifikasi Browser — Panel III Responsif');
  console.log('-'.repeat(60));

  // Snapshot helper: baca backing store vs kotak CSS vs dpr.
  const probe = () => page.evaluate(() => {
    const dpr = window.devicePixelRatio || 1;
    const out = [];
    const tc = (typeof timeCharts !== 'undefined') ? timeCharts : {};
    for (const k of Object.keys(tc)) {
      const c = tc[k];
      if (!c || !c.canvas) continue;
      const r = c.canvas.getBoundingClientRect();
      out.push({
        key: k,
        cssW: Math.round(r.width), cssH: Math.round(r.height),
        attrW: c.canvas.width, attrH: c.canvas.height,
        chartW: c.width, chartH: c.height,
        dpr: dpr,
      });
    }
    const pane = document.getElementById('pane3');
    return { charts: out, dpr, paneH: pane ? pane.offsetHeight : -1 };
  });

  // ----------------------------------------------------------------
  console.log('\n1. Kondisi awal (sebelum drag)');
  const before = await probe();
  // Penjaga anti-vakum: tanpa chart, semua assertion di bawah lolos palsu.
  check('empat chart terinisialisasi', before.charts.length === 4,
    before.charts.length + ' chart: ' + before.charts.map(c => c.key).join(','));
  if (before.charts.length !== 4) {
    console.log('\n  ⚠ Hanya ' + before.charts.length + ' chart terbaca — sisa pemeriksaan tidak bermakna. Dibatalkan.');
    await browser.close();
    process.exit(2);
  }
  let allMatch = true, worst = 0;
  for (const c of before.charts) {
    // Backing store harus ≈ kotak CSS × dpr (Chart.js retinaScale).
    const expectW = c.cssW * c.dpr, expectH = c.cssH * c.dpr;
    const dx = Math.abs(c.attrW - expectW) / Math.max(1, expectW);
    const dy = Math.abs(c.attrH - expectH) / Math.max(1, expectH);
    const dev = Math.max(dx, dy);
    if (dev > worst) worst = dev;
    if (dev > 0.06) allMatch = false;
  }
  check('backing store cocok kotak CSS × dpr', allMatch, 'deviasi maks ' + (worst * 100).toFixed(1) + '%');
  console.log('     pane3 = ' + before.paneH + 'px, dpr = ' + before.dpr);

  // ----------------------------------------------------------------
  console.log('\n2. Setelah pane ditarik lebih tinggi (drag 300px)');
  await page.evaluate(() => {
    // Jalur NYATA seperti user: mousedown di handle → mousemove → mouseup.
    // Tidak memanggil fungsi internal, supaya tes ini menguji perilaku, bukan
    // implementasi, dan tetap bermakna pada versi lama maupun baru.
    const handle = document.querySelector('#pane3 .drag-handle');
    const rect = handle.getBoundingClientRect();
    const y0 = rect.top + 3;
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: y0 }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: y0 + 300 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.waitForTimeout(900);
  const after = await probe();
  if (after.charts.length !== 4) {
    check('empat chart masih terbaca setelah drag', false, after.charts.length + ' chart');
    await browser.close();
    process.exit(2);
  }

  let refreshed = true, aspectWorst = 0, details = [];
  for (let i = 0; i < after.charts.length; i++) {
    const b = before.charts[i], a = after.charts[i];
    // 1) CSS box harus tumbuh
    if (a.cssH <= b.cssH) refreshed = false;
    // 2) Backing store harus IKUT tumbuh (inilah bug lama: tetap sama)
    if (a.attrH <= b.attrH) refreshed = false;
    // 3) Distorsi aspek: scaleX vs scaleY harus ~sama
    const sx = a.cssW / a.attrW, sy = a.cssH / a.attrH;
    const dist = Math.abs(sx - sy) / Math.max(sx, sy);
    if (dist > aspectWorst) aspectWorst = dist;
    details.push(a.key + ' ' + b.attrH + '→' + a.attrH + 'px(bitmap) ' + b.cssH + '→' + a.cssH + 'px(css)');
  }
  check('CSS box tumbuh setelah drag', after.charts.every((a, i) => a.cssH > before.charts[i].cssH));
  check('backing store ikut diperbarui (bug utama)', refreshed, details.join(' | '));
  check('tidak ada distorsi aspek (teks tidak melar)', aspectWorst < 0.05,
    'distorsi maks ' + (aspectWorst * 100).toFixed(1) + '%');
  console.log('     pane3 = ' + before.paneH + 'px → ' + after.paneH + 'px');

  // ----------------------------------------------------------------
  console.log('\n3. Legenda seri tampil');
  const legend = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-series-legend]');
    const texts = Array.from(els).map(e => e.textContent.trim());
    return { count: els.length, texts };
  });
  check('empat overlay legenda ada', legend.count === 4, 'count=' + legend.count);
  const joined = legend.texts.join(' ');
  check('legenda menyebut Pe, Pm, Qe', /Pe/.test(joined) && /Pm/.test(joined) && /Qe/.test(joined), joined);

  // ----------------------------------------------------------------
  console.log('\n4. Lantai tinggi pane menghormati lantai konten');
  const floor = await page.evaluate(() => {
    // Tarik pane jauh ke bawah lewat jalur drag yang sebenarnya.
    const handle = document.querySelector('#pane3 .drag-handle');
    const pane = document.getElementById('pane3');
    const rect = handle.getBoundingClientRect();
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: rect.top + 3 }));
    // Gerakkan kursor 9999px ke atas → harus mentok di lantai, bukan 120px.
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: rect.top + 3 - 9999 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    // const top-level → identifier telanjang, bukan properti window.
    return { paneH: pane.offsetHeight,
             minChartH: (typeof MIN_CHART_H !== 'undefined' ? MIN_CHART_H : null),
             minPaneH: (typeof MIN_PANE_H !== 'undefined' ? MIN_PANE_H : null) };
  });
  check('konstanta lantai terbaca', floor.minPaneH !== null && floor.minChartH !== null,
    'MIN_CHART_H=' + floor.minChartH + ', MIN_PANE_H=' + floor.minPaneH);
  const contentFloor = 24 + 6 + 4 * (floor.minChartH || 60) + 3 * 2;
  check('drag mentok di lantai konten, bukan 120px', floor.paneH >= contentFloor,
    'pane=' + floor.paneH + 'px, lantai=' + contentFloor + 'px (MIN_PANE_H=' + floor.minPaneH + ')');
  check('lantai bukan angka lama 120px', floor.paneH !== 120, 'pane=' + floor.paneH + 'px');

  // ----------------------------------------------------------------
  console.log('\n5. Tanpa error runtime');
  const realErrors = errors.filter(e => !/favicon|net::ERR_FILE_NOT_FOUND|cdn|jsdelivr|fonts\.googleapis/i.test(e));
  check('tidak ada error JS', realErrors.length === 0, realErrors.slice(0, 3).join(' | ') || 'bersih');

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('Total: ' + (passed + failed) + ' | PASS: ' + passed + ' | FAIL: ' + failed);
  console.log('='.repeat(60));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
