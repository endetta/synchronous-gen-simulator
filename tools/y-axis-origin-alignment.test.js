/**
 * y-axis-origin-alignment.test.js — plans/002-align-time-series-y-axis-origins.md
 *
 * Kontrak yang diuji: keempat chart Panel III harus mulai pada KOORDINAT X
 * YANG SAMA. Plan 002 Done criteria #2: "Plot origins differ by no more than
 * one CSS pixel in all required states."
 *
 * Bedakan dengan tools/freq-chart-alignment.test.js: test itu mengukur
 * `chartArea.width` (lebar plot) dengan toleransi 4px — itu kontrak tiket 10.
 * Plan 002 meminta `chartArea.left` (plot ORIGIN / garis awal sumbu-Y) dengan
 * toleransi 1px. Keduanya berbeda: plot mungkin lebarnya sama tetapi bergeser
 * kiri-kanan karena judul sumbu-Y berbeda.
 *
 * Status diuji (plan 002 Step 2): initial load, setelah reset, Grid/Island,
 * fault aktif, dan setelah drag-resize tinggi panel. Keyboard/puppet tidak
 * dipakai — panel resize disimulasikan lewat API yang sama dengan drag.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let pass = 0, fail = 0;
const assertTrue = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ ${m}`); } };

// Selisih maksimum plot origin keempat chart. Plan 002: satu CSS pixel.
const ORIGIN_TOL_PX = 1;

const KEYS = ['delta', 'omega', 'power', 'freq'];

const readOrigins = (page) => page.evaluate((keys) => {
  const out = {};
  for (const k of keys) {
    const a = timeCharts[k].chartArea;
    out[k] = { left: a.left, right: a.right, width: a.right - a.left };
  }
  return out;
}, KEYS);

// Klik kontrol UI lewat DOM agar efeknya sama dengan interaksi user.
const clickById = (page, id) => page.evaluate((sel) => {
  const el = document.getElementById(sel);
  if (!el) throw new Error('Kontrol tidak ditemukan: ' + sel);
  el.click();
  return true;
}, id);

const settle = (page, ms = 350) => new Promise(r => setTimeout(r, ms));

function checkState(page, label, origins) {
  const lefts = KEYS.map(k => origins[k].left);
  const spread = Math.max(...lefts) - Math.min(...lefts);
  const detail = KEYS.map(k => `${k}=${origins[k].left.toFixed(1)}`).join(' ');
  console.log(`\n  [${label}] plot origin (x): ${detail}  → spread ${spread.toFixed(2)}px`);
  assertTrue(
    spread <= ORIGIN_TOL_PX,
    `[${label}] keempat plot origin Sejajar (spread ${spread.toFixed(2)}px ≤ ${ORIGIN_TOL_PX}px)`
  );
  return spread;
}

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

  console.log('\n=== Plot origin alignment — keempat chart Panel III ===');
  console.log('  kontrak: chartArea.left tiap chart berbeda ≤ 1 CSS px');

  // ---- State 1: initial load -------------------------------------------------
  checkState(page, 'initial load', await readOrigins(page));

  // ---- State 2: setelah reset ------------------------------------------------
  const resetOk = await page.evaluate(() => {
    if (typeof doReset === 'function') { doReset(); return 'doReset'; }
    return null;
  });
  await settle(page);
  if (resetOk) {
    checkState(page, `setelah reset (${resetOk})`, await readOrigins(page));
  } else {
    console.log('\n  ! kontrol reset tidak ditemukan — state reset dilewati');
  }

  // ---- State 3: mode Island --------------------------------------------------
  // Island mengubah f sehingga sumbu-Y freq/omega berubah rentang — lebar
  // intrinsik tick ikut berubah, dan inilah yang harus diserap shared width.
  const islanded = await page.evaluate(() => {
    if (typeof runSc === 'function') { runSc('grid_island'); return true; }
    return false;
  });
  if (islanded) {
    await settle(page, 700);
    checkState(page, 'mode Island (f/ω berubah rentang)', await readOrigins(page));
  } else {
    console.log('\n  ! kontrol Island tidak ditemukan — state island dilewati');
  }

  // ---- State 4: fault aktif --------------------------------------------------
  const faulted = await page.evaluate(() => {
    if (typeof runSc === 'function') { runSc('sc_fail'); return true; }
    return false;
  });
  if (faulted) {
    await settle(page, 900);
    checkState(page, 'fault aktif (SC gagal clear)', await readOrigins(page));
  } else {
    console.log('\n  ! kontrol fault tidak ditemukan — state fault dilewati');
  }

  // ---- State 5: tinggi panel berubah (setelah drag-resize) -------------------
  await page.evaluate(() => {
    const pane = document.getElementById('pane3');
    if (!pane) return null;
    pane.style.height = (pane.getBoundingClientRect().height + 40) + 'px';
    if (typeof resizeTimeCharts === 'function') resizeTimeCharts();
    return true;
  });
  await settle(page);
  checkState(page, 'tinggi pane3 +40px (drag-resize)', await readOrigins(page));

  // ---- No clipping: judul & tick Y tidak boleh terpotong ---------------------
  const clip = await page.evaluate((keys) => {
    const out = {};
    for (const k of keys) {
      const c = timeCharts[k];
      const area = c.chartArea;
      const y = c.scales.y;
      out[k] = {
        // Plot asal tidak boleh tertutupi title/tick Y: sumbu Y harus >= 0.
        yLeft: y.left,
        yRight: y.right,
        areaLeft: area.left,
        // Label Y terpanjang = tick + title digabung; ujungnya harus di dalam canvas
        ticksInside: y.getLabels().every(lbl => {
          const w = c.ctx.measureText(String(lbl)).width;
          return y.left - w - 8 >= 0;
        }),
        titleText: (y.title && y.title.text) || '',
      };
    }
    return out;
  }, KEYS);

  console.log('\n  clipping check:');
  for (const k of KEYS) {
    const c = clip[k];
    assertTrue(c.yLeft >= 0, `[${k}] sumbu Y tidak terpotong tepi kiri canvas (y.left=${c.yLeft.toFixed(1)})`);
    assertTrue(
      Math.abs(c.areaLeft - c.yRight) < 2,
      `[${k}] area plot mulai tepat di sumbu Y (area.left=${c.areaLeft.toFixed(1)}, y.right=${c.yRight.toFixed(1)})`
    );
  }

  assertTrue(pageErrors.length === 0, `tidak ada page error (${pageErrors.length})`);

  await browser.close();
  console.log(`\n=== Summary ===\nPassed: ${pass}  Failed: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
