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
 * fault aktif, dan setelah drag-resize tinggi panel. Kontrol yang tidak
 * ditemukan = GAGAL (bukan skip senyap) — lima state wajib terukur semua.
 *
 * Done criteria #3 (tidak ada label terpotong) dijaga dua lapis:
 * 1. Lebar Y terpakai >= kebutuhan tick well-formed terpanjang (STRICT fail).
 * 2. Tick X freq ("30" dsb) muat di dalam canvas (STRICT fail).
 * Label scientific-notation dust (mis. "5.51E-19" dari data Δω island yang
 * float-dust, PRE-EXISTING di baseline 2dbd8d2 — di luar scope plan 002 yang
 * mengecualikan perubahan physics) dicatat sebagai KNOWN DEFECT berteriak,
 * bukan gagal dan bukan senyap: lihat ledger ruling.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let pass = 0, fail = 0;
const assertTrue = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ ${m}`); } };

// Selisih maksimum plot origin keempat chart. Plan 002: satu CSS pixel.
const ORIGIN_TOL_PX = 1;

const KEYS = ['delta', 'omega', 'power', 'freq'];

// Pola label tick scientific-notation (hasil format angka dust ~1e-19).
const SCIENTIFIC_RE = /^-?[\d.]+E[-+]\d+$/i;

const readOrigins = (page) => page.evaluate((keys) => {
  const out = {};
  for (const k of keys) {
    const a = timeCharts[k].chartArea;
    out[k] = { left: a.left, right: a.right, width: a.right - a.left };
  }
  return out;
}, KEYS);

const settle = (page, ms = 350) => new Promise(r => setTimeout(r, ms));

function checkState(page, label, origins) {
  const lefts = KEYS.map(k => origins[k].left);
  const spread = Math.max(...lefts) - Math.min(...lefts);
  const detail = KEYS.map(k => `${k}=${origins[k].left.toFixed(1)}`).join(' ');
  console.log(`\n  [${label}] plot origin (x): ${detail}  → spread ${spread.toFixed(2)}px`);
  assertTrue(
    spread <= ORIGIN_TOL_PX,
    `[${label}] keempat plot origin sejajar (spread ${spread.toFixed(2)}px ≤ ${ORIGIN_TOL_PX}px)`
  );
}

// Jalankan aksi state; kontrol hilang = GAGAL, bukan skip.
async function runState(page, label, expr, action) {
  const ok = await page.evaluate(expr);
  assertTrue(ok, `[${label}] kontrol aksi ditemukan dan dieksekusi`);
  if (!ok) return false;
  await settle(page, action);
  checkState(page, label, await readOrigins(page));
  return true;
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

  // ---- State 2-5 (control missing = FAIL, bukan skip) ------------------------
  await runState(page, 'setelah reset (doReset)',
    'typeof doReset === "function" ? (doReset(), true) : false', 350);
  await runState(page, 'mode Island (f/ω berubah rentang)',
    'typeof runSc === "function" ? (runSc("grid_island"), true) : false', 700);
  await runState(page, 'fault aktif (SC gagal clear)',
    'typeof runSc === "function" ? (runSc("sc_fail"), true) : false', 900);
  await runState(page, 'tinggi pane3 +40px (drag-resize)', `(() => {
    const pane = document.getElementById('pane3');
    if (!pane) return false;
    pane.style.height = (pane.getBoundingClientRect().height + 40) + 'px';
    if (typeof resizeTimeCharts === 'function') resizeTimeCharts();
    return true;
  })()`, 350);

  // ---- Clipping: lebar Y cukup + tick X muat di canvas -----------------------
  const clip = await page.evaluate((keys) => {
    const SCIENTIFIC = /^-?[\d.]+E[-+]\d+$/i;
    const measure = (ctx, fontCfg, text) => {
      const prev = ctx.font;
      const f = fontCfg || {};
      ctx.font = (f.weight ? f.weight + ' ' : '') + (f.size || 12) + 'px ' +
                 (f.family || "'Helvetica Neue', Helvetica, Arial, sans-serif");
      const w = ctx.measureText(String(text)).width;
      ctx.font = prev;
      return w;
    };
    const out = {};
    for (const k of keys) {
      const c = timeCharts[k];
      const area = c.chartArea;
      const y = c.scales.y;
      const x = c.scales.x;
      const yFont = ((y.options.ticks || {}).font) || {};
      const xFont = ((x.options.ticks || {}).font) || {};

      const yTicks = (y.ticks || []).map(t => String(t.label == null ? '' : t.label));
      const wellFormed = yTicks.filter(l => !SCIENTIFIC.test(l));
      const dust = yTicks.filter(l => SCIENTIFIC.test(l));
      const neededW = Math.max(0, ...wellFormed.map(l => measure(c.ctx, yFont, l)))
                    + ((y.options.ticks || {}).padding || 0) + 4;

      // Tick X hanya dirender bila sumbu X display:true (chart freq).
      const xVisible = !!(x.options && x.options.display);
      const xClipped = [];
      if (xVisible) {
        for (const t of (x.ticks || [])) {
          const lbl = String(t.label == null ? '' : t.label);
          if (!lbl) continue;
          const w = measure(c.ctx, xFont, lbl);
          const px = x.getPixelForValue(t.value);
          if (px - w / 2 < -0.5 || px + w / 2 > c.width + 0.5) {
            xClipped.push({ lbl, px: Math.round(px * 10) / 10, w: Math.round(w * 10) / 10 });
          }
        }
      }

      out[k] = {
        yLeft: y.left,
        yRight: y.right,
        areaLeft: area.left,
        actualWidth: y.width,
        neededWidth: neededW,
        dustLabels: dust,
        wellFormedMax: wellFormed.length
          ? Math.round(Math.max(...wellFormed.map(l => measure(c.ctx, yFont, l))) * 10) / 10
          : 0,
        xClipped,
        canvasW: c.width,
      };
    }
    return out;
  }, KEYS);

  console.log('\n  clipping check:');
  let dustSeen = 0;
  for (const k of KEYS) {
    const c = clip[k];
    assertTrue(c.yLeft >= 0, `[${k}] sumbu Y tidak terpotong tepi kiri canvas (y.left=${c.yLeft.toFixed(1)})`);
    assertTrue(
      Math.abs(c.areaLeft - c.yRight) < 2,
      `[${k}] area plot mulai tepat di sumbu Y (area.left=${c.areaLeft.toFixed(1)}, y.right=${c.yRight.toFixed(1)})`
    );
    // Done criteria #3 (lapis 1): tick well-formed muat di lebar sumbu Y.
    assertTrue(
      c.actualWidth >= c.neededWidth,
      `[${k}] lebar Y (${c.actualWidth.toFixed(1)}px) ≥ tick terpanjang (${c.wellFormedMax}px + pad = ${c.neededWidth.toFixed(1)}px)`
    );
    // Done criteria #3 (lapis 2): tick X terlihat muat di dalam canvas.
    assertTrue(
      c.xClipped.length === 0,
      `[${k}] tick X tidak keluar canvas (canvas ${c.canvasW}px)` +
      (c.xClipped.length ? ` — terpotong: ${JSON.stringify(c.xClipped)}` : '')
    );
    // KNOWN DEFECT pre-existing: label scientific-notation dari data Δω dust
    // (island mode). Teriak jelas — JANGAN senyap, JANGAN menggagalkan plan
    // 002 yang scope-nya mengecualikan physics (ledger: Ruling).
    if (c.dustLabels.length) {
      dustSeen += c.dustLabels.length;
      console.log(`  ⚠ [${k}] KNOWN DEFECT pre-existing (bukan regresi plan 002): ` +
        `${c.dustLabels.length} label tick scientific-notation ` +
        `mis. "${c.dustLabels[0]}" — data Δω float-dust saat range nyaris nol; ` +
        `dipercik dari baseline 2dbd8d2; fix terpisah (physics/data).`);
    }
  }
  if (dustSeen === 0) {
    console.log('  ℹ tidak ada label scientific-notation (defect pre-existing tidak muncul di state ini)');
  }

  assertTrue(pageErrors.length === 0, `tidak ada page error (${pageErrors.length})`);

  await browser.close();
  console.log(`\n=== Summary ===\nPassed: ${pass}  Failed: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
