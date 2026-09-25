/**
 * freq-right-title.test.js — dua cacat Panel III (laporan user 2026-09-25)
 *
 * Cacat 1 (tepi kanan): chart freq "tidak penuh ke kanan". Akar masalah:
 * Chart.js dengan ticks.align default 'center' menyisakan lebarLabelTerakhir/2
 * di tepi kanan (Scale._calculatePadding), sehingga chartArea.right freq
 * BERVARIASI mengikuti lebar label terakhir jendela X (982–986 terukur) sementara
 * tiga chart di atas (sumbu-X display:false) terkunci. Kontrak: right freq == right
 * keempat chart, toleransi 1px, pada rentang xMax luas (0.05 … 1000) — meniru
 * jendela sliding 30s di awal simulasi sampai lewat HWIN.
 *
 * Cacat 2 (judul): tulisan "Time (s)" tumpang tindih dengan tick label / sumbu X.
 * Akar masalah: Scale.fit() meng-CLAMP tinggi sumbu X ke maxHeight =
 * availableHeight/2 (setengah ruang vertikal canvas), sedangkan kebutuhan
 * grid+label+judul lebih besar — drawTitle() tetap menggambar dari tepi bawah
 * sumbu sehingga menimpa baris label. Kontrak: band judul ada di BAWAH band
 * label (titleTop >= labelBottom - 0.5), pada tinggi wrapper 58/66/90px
 * (mencakup lantai MIN_CHART_H=60 dan kondisi default), DAN lantai tinggi
 * wrapper freq dijamin >= FREQ_MIN_WRAPPER_H (>= titik aman clamp).
 *
 * Dipisah dari y-axis-origin-alignment.test.js (kontrak plan 002: left/origin)
 * agar kegagalan satu kontrak tidak mencampur yang lain.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let pass = 0, fail = 0;
const assertTrue = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ ${m}`); } };

const KEYS = ['delta', 'omega', 'power', 'freq'];
const RIGHT_TOL_PX = 1;
const OVERLAP_TOL_PX = 0.5;
// Lantai wrapper freq cukup untuk kebutuhan fit sumbu X (tick-len 8 + label
// tick + judul): canvas >= 94px → maxHeight sumbu-X (canvas/2) >= 47px, ala
// kebutuhan maksimum ~46px (guard anti-clamp). Assertion overlap di tiga tinggi
// wrapper adalah bukti langsung; lantai adalah guard regresi supaya wrapper
// tidak kembali ke 60px yang terbukti mengiris sumbu X (cacat 2026-09-25 #2).
const FREQ_MIN_WRAPPER_H = 96;

const settle = (page, ms = 350) => new Promise(r => setTimeout(r, ms));

const readRights = (page) => page.evaluate((keys) => {
  const out = {};
  for (const k of keys) out[k] = +timeCharts[k].chartArea.right.toFixed(2);
  return out;
}, KEYS);

// Band aktual diukur dari labelItems Chart.js (posisi render nyata), bukan rumus:
// labelBottom = tepi bawah glyph tick terendah, titleTop = tepi atas glyph judul.
const readTitleBands = (page) => page.evaluate(() => {
  const f = timeCharts.freq;
  const x = f.scales.x;
  const items = x.getLabelItems ? x.getLabelItems() : [];
  let labelBottom = x.top + 12 * 1.2; // fallback bila items kosong
  for (const it of items) {
    const lh = (it.font && it.font.lineHeight) || 14.4;
    const ty = (it.options && it.options.translation && it.options.translation[1]) || 0;
    const b = ty + lh / 2; // textBaseline 'middle'
    if (b > labelBottom) labelBottom = b;
  }
  // drawTitle(): titleY = x.bottom - offset, offset = lineHeight/2 + padding.bottom
  const t = x.options.title || {};
  const tSize = ((t.font || {}).size) || 12;
  const tLine = tSize * 1.2;
  const tPad = typeof t.padding === 'number' ? t.padding : 0;
  const titleTop = x.bottom - (tLine / 2 + tPad) - tLine / 2;
  return {
    canvasH: f.height,
    xHeight: +x.height.toFixed(2),
    xMaxHeight: x.maxHeight != null ? +x.maxHeight.toFixed(2) : null,
    titleTop: +titleTop.toFixed(2),
    labelBottom: +labelBottom.toFixed(2),
    overlap: +(labelBottom - titleTop).toFixed(2),
    align: x.options.ticks.align,
    titleDisplay: !!t.display,
    right: +f.chartArea.right.toFixed(2),
    others: ['delta', 'omega', 'power'].map(k => +timeCharts[k].chartArea.right.toFixed(2)),
  };
});

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1100 });

  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(HTML, { waitUntil: 'load' });
  await page.waitForFunction(
    () => typeof timeCharts !== 'undefined' && timeCharts.freq && timeCharts.freq.chartArea,
    { timeout: 8000 }
  );
  await settle(page);

  // ---- Cacat 1: right edge seragam di rentang xMax luas ----------------------
  console.log('\n=== Cacat 1: tepi kanan freq == tiga chart lainnya ===');
  console.log('  kontrak: chartArea.right keempat chart beda ≤ 1px, di 5 lebar jendela X');

  const rightsByXmax = await page.evaluate((keys) => {
    const f = timeCharts.freq;
    const orig = f.update.bind(f);
    f.update = () => {}; // freeze relayout saat menulis opsi
    const out = [];
    for (const xm of [0.05, 9.9, 29.95, 100.5, 1000]) {
      f.options.scales.x.min = 0;
      f.options.scales.x.max = xm;
      orig('none');
      const rights = {};
      for (const k of keys) rights[k] = +timeCharts[k].chartArea.right.toFixed(2);
      out.push({ xm, rights });
    }
    f.options.scales.x.min = 0;
    f.options.scales.x.max = 30;
    f.update = orig;
    orig('none');
    return out;
  }, KEYS);

  for (const { xm, rights } of rightsByXmax) {
    const vals = KEYS.map(k => rights[k]);
    const spread = Math.max(...vals) - Math.min(...vals);
    assertTrue(
      spread <= RIGHT_TOL_PX,
      `xMax=${xm}: right keempat seragam (freq=${rights.freq}, delta=${rights.delta}, omega=${rights.omega}, power=${rights.power}, spread ${spread.toFixed(2)}px ≤ ${RIGHT_TOL_PX}px)`
    );
  }

  // Guard: align harus 'inner' — regresi ke 'center' membuat right bervariasi.
  const align = await page.evaluate(() => timeCharts.freq.options.scales.x.ticks.align);
  assertTrue(align === 'inner', `ticks.align freq = 'inner' (aktual: '${align}')`);

  // ---- Cacat 2: judul tidak menimpa label tick -------------------------------
  console.log('\n=== Cacat 2: band judul "Time (s)" di bawah band label tick ===');
  console.log('  kontrak: titleTop >= labelBottom - 0.5px pada tiga tinggi wrapper');

  // Ukur pada tinggi wrapper di lantai (96), kondisi tengah (110), dan lebar
  // (150) — clamp sumbu X tidak boleh mengiris di seluruh rentang yang
  // diizinkan drag pane.
  const targetWrappers = [96, 110, 150];
  const bands = await page.evaluate(async (targets) => {
    const f = timeCharts.freq;
    const wrapper = f.canvas.parentElement;
    const orig = wrapper.style.minHeight;
    const out = [];
    for (const h of targets) {
      wrapper.style.minHeight = h + 'px';
      if (typeof resizeTimeCharts === 'function') resizeTimeCharts();
      await new Promise(r => setTimeout(r, 250));
      const x = f.scales.x;
      const items = x.getLabelItems ? x.getLabelItems() : [];
      let labelBottom = x.top + 12 * 1.2;
      for (const it of items) {
        const lh = (it.font && it.font.lineHeight) || 14.4;
        const ty = (it.options && it.options.translation && it.options.translation[1]) || 0;
        const b = ty + lh / 2;
        if (b > labelBottom) labelBottom = b;
      }
      const t = x.options.title || {};
      const tSize = ((t.font || {}).size) || 12;
      const tLine = tSize * 1.2;
      const tPad = typeof t.padding === 'number' ? t.padding : 0;
      const titleTop = x.bottom - (tLine / 2 + tPad) - tLine / 2;
      out.push({
        wrapperH: h,
        canvasH: f.height,
        xHeight: +x.height.toFixed(2),
        xMaxHeight: x.maxHeight != null ? +x.maxHeight.toFixed(2) : null,
        titleTop: +titleTop.toFixed(2),
        labelBottom: +labelBottom.toFixed(2),
        overlap: +(labelBottom - titleTop).toFixed(2),
      });
    }
    wrapper.style.minHeight = orig;
    if (typeof resizeTimeCharts === 'function') resizeTimeCharts();
    await new Promise(r => setTimeout(r, 250));
    return out;
  }, targetWrappers);

  for (const b of bands) {
    assertTrue(
      b.overlap <= OVERLAP_TOL_PX,
      `wrapper ${b.wrapperH}px (canvasH=${b.canvasH}): judul tidak menimpa label (overlap ${b.overlap.toFixed(2)}px ≤ ${OVERLAP_TOL_PX}px; xHeight=${b.xHeight}, maxHeight=${b.xMaxHeight})`
    );
  }

  // Lantai wrapper freq: cukup ruang untuk kebutuhan fit sumbu X.
  const floor = await page.evaluate(() => {
    const f = timeCharts.freq;
    const wrapper = f.canvas.parentElement;
    return { minH: wrapper.style.minHeight, canvasH: f.height };
  });
  const floorNum = parseFloat(floor.minH) || 0;
  assertTrue(
    floorNum >= FREQ_MIN_WRAPPER_H,
    `lantai wrapper freq ≥ ${FREQ_MIN_WRAPPER_H}px (aktual min-height '${floor.minH}', canvasH=${floor.canvasH})`
  );

  // Default height: overlap juga nihil (kondisi yang dilihat user).
  const def = await readTitleBands(page);
  assertTrue(
    def.overlap <= OVERLAP_TOL_PX,
    `kondisi default: judul tidak menimpa label (overlap ${def.overlap.toFixed(2)}px; canvasH=${def.canvasH}, xHeight=${def.xHeight}, maxHeight=${def.xMaxHeight})`
  );

  assertTrue(pageErrors.length === 0, `tidak ada page error (${pageErrors.length})`);

  await browser.close();
  console.log(`\n=== Summary ===\nPassed: ${pass}  Failed: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
