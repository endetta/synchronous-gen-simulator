/**
 * freq-chart-alignment.test.js — tiket 10
 *
 * Bug: plot area chart frekuensi lebih sempit ~18px dibanding 3 chart di atasnya
 * (kurva freq menjorok ke kiri). Penyebab: chart freq satu-satunya yang menampilkan
 * sumbu-X; tick label terakhir ("30") menyita lebar di tepi kanan plot, sementara
 * chart 1-3 menyembunyikan sumbu-X sehingga plot-nya melebar penuh.
 *
 * Tes ini mengukur chartArea Chart.js yang SEBENARNYA di browser (Puppeteer) —
 * bukan memindai teks sumber. Perbaikan (layout.padding.right di baseOptsNoX)
 * menyusutkan plot chart 1-3 dari kanan agar keempat plot area sama lebar.
 *
 * Menjalankan Chrome headless; butuh `puppeteer` (sudah devDependency).
 */
const puppeteer = require('puppeteer');
const path = require('path');

const HTML = 'file://' + path.resolve(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let pass = 0, fail = 0;
const assertTrue = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ ${m}`); } };

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1100 });
  await page.goto(HTML, { waitUntil: 'load' });
  // Tunggu chart terinisialisasi (kode memakai `const timeCharts` di top-level
  // classic script — bukan properti window, jadi akses langsung identifier)
  await page.waitForFunction(() => typeof timeCharts !== 'undefined' && timeCharts.freq && timeCharts.freq.chartArea, { timeout: 8000 });
  // Beri satu frame agar pinSharedYWidthOnce sempat mem-pin lebar Y
  await new Promise(r => setTimeout(r, 300));

  const areas = await page.evaluate(() => {
    const out = {};
    for (const k of ['delta', 'omega', 'power', 'freq']) {
      const a = timeCharts[k].chartArea;
      out[k] = { left: Math.round(a.left), right: Math.round(a.right), width: Math.round(a.right - a.left) };
    }
    return out;
  });

  console.log('\n=== Tiket 10: alignment plot area chart frekuensi ===\n');
  console.log('  plot area:', JSON.stringify(areas));

  // Keempat plot area harus sama LEBAR — inilah bug tiket 10 (freq menjorok
  // karena tick label tepi sumbu-X-nya menyita ruang kanan). Toleransi 4px
  // untuk pembulatan pixel + beda lebar Y natural sebelum pinSharedYWidthOnce
  // mem-pin lebar Y (baru terjadi setelah commit chart pertama).
  const ref = areas.delta.width;
  for (const k of ['omega', 'power', 'freq']) {
    const d = Math.abs(areas[k].width - ref);
    assertTrue(d <= 4, `plot area ${k} (${areas[k].width}px) ≈ delta (${ref}px), selisih ${d}px`);
  }

  await browser.close();
  console.log(`\n=== Summary ===\nPassed: ${pass}  Failed: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
